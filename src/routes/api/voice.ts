import { createFileRoute } from "@tanstack/react-router";

/** Natural acting direction per speaker so lines sound performed, not read. */
const CAST: Record<string, { voice: string; instructions: string }> = {
  Brix: { voice: "Algenib", instructions: "You are Brix, a big, warm, protective older brother. Deep, grounded, gravelly voice with a light British accent. Speak naturally and conversationally with real emotion, small breaths and natural pauses — never robotic or announcer-like." },
  Oz: { voice: "Puck", instructions: "You are Oz, a small, restless, cheeky young lad with a light British accent. Quick, bright, expressive, a bit sarcastic and bewildered. Natural conversational delivery with genuine reactions, varied pitch and timing — never robotic." },
  Lowkey: { voice: "Enceladus", instructions: "You are Lowkey, a quiet, thoughtful, mysterious brother with a light British accent. Soft, smooth, unhurried, slightly hushed and wondering. Natural pauses and breath, intimate and human — never robotic." },
  Orin: { voice: "Gacrux", instructions: "You are Elder Orin, an old, wise, weathered human elder. Slow, gentle, calm authority, natural and human." },
  Mara: { voice: "Kore", instructions: "You are Mara, a protective, wary woman. Firm, alert, tense but human and natural." },
  Vale: { voice: "Zephyr", instructions: "You are Vale, an excitable, frightened young person. Breathless, quick and natural." },
  Moxi: { voice: "Leda", instructions: "You are Moxi, a wary, sharp young girl. Quiet, guarded, natural and human — never robotic." },
  TV: { voice: "Fenrir", instructions: "You are a possessed, glitching old television creature. Menacing, crackly, sinister and theatrical, with eerie emphasis." },
  Shelton: { voice: "Charon", instructions: "You are Shelton, a huge grumpy armoured beast. Deep, rumbling and gruff, but snappy, impatient and quick — short punchy delivery, no drawn-out words, same brisk pace as the others." },
  Thoth: { voice: "Iapetus", instructions: "You are Thoth, an ancient, mysterious observer. Calm, low, wise and enigmatic, with measured pauses." },
  Narrator: { voice: "Sulafat", instructions: "You are a warm storybook narrator. Gentle, inviting, natural pacing, like reading a bedtime story." },
};

const BUCKET = "voice-cache";

async function sha(s: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/** Cut the dead air the voice model leaves before/after a line (16-bit PCM WAV only), so reactions start the instant they play. */
function trimWav(buf: ArrayBuffer): ArrayBuffer {
  const v = new DataView(buf);
  if (buf.byteLength < 44 || v.getUint32(0) !== 0x52494646 || v.getUint32(8) !== 0x57415645) return buf; // not RIFF/WAVE
  let off = 12, fmt = -1, data = -1, dataLen = 0;
  while (off + 8 <= buf.byteLength) {
    const id = v.getUint32(off), len = v.getUint32(off + 4, true);
    if (id === 0x666d7420) fmt = off + 8;
    if (id === 0x64617461) { data = off + 8; dataLen = Math.min(len, buf.byteLength - data); break; }
    off += 8 + len + (len & 1);
  }
  if (fmt < 0 || data < 0 || v.getUint16(fmt, true) !== 1 || v.getUint16(fmt + 14, true) !== 16) return buf;
  const ch = v.getUint16(fmt + 2, true), rate = v.getUint32(fmt + 4, true), frame = 2 * ch;
  const frames = Math.floor(dataLen / frame), TH = 500;
  const loud = (i: number) => Math.abs(v.getInt16(data + i * frame, true)) > TH;
  let s = 0; while (s < frames && !loud(s)) s++;
  let e = frames - 1; while (e > s && !loud(e)) e--;
  if (s >= e) return buf;
  s = Math.max(0, s - Math.round(rate * 0.03)); e = Math.min(frames - 1, e + Math.round(rate * 0.08));
  const pcm = new Uint8Array(buf, data + s * frame, (e - s + 1) * frame);
  const out = new ArrayBuffer(44 + pcm.byteLength), o = new DataView(out);
  const str = (p: number, t: string) => [...t].forEach((c, i) => o.setUint8(p + i, c.charCodeAt(0)));
  str(0, "RIFF"); o.setUint32(4, 36 + pcm.byteLength, true); str(8, "WAVE");
  str(12, "fmt "); o.setUint32(16, 16, true); o.setUint16(20, 1, true); o.setUint16(22, ch, true);
  o.setUint32(24, rate, true); o.setUint32(28, rate * frame, true); o.setUint16(32, frame, true); o.setUint16(34, 16, true);
  str(36, "data"); o.setUint32(40, pcm.byteLength, true);
  new Uint8Array(out, 44).set(pcm);
  return out;
}

const audio = (body: ArrayBuffer | Blob, type: string) =>
  new Response(body, { status: 200, headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });

export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { return await speakLine(request); }
        // The player left or reloaded mid-request: end quietly instead of a server error.
        catch { return new Response("Voice cancelled", { status: 503 }); }
      },
    },
  },
});

async function speakLine(request: Request): Promise<Response> {
        const body = (await request.json().catch(() => null)) as { who?: string; text?: string } | null;
        const cast = body?.who ? CAST[body.who] : undefined;
        const text = typeof body?.text === "string" ? body.text.trim() : "";
        if (!cast || !text || text.length > 400) return new Response("Bad request", { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) { console.error("voice: LOVABLE_API_KEY missing on server"); return new Response("Voice unavailable", { status: 503 }); }

        // Shared clip store: once any player has heard a line, everyone gets it instantly.
        const path = `v1/${await sha(`${cast.voice}|${cast.instructions}|${text}`)}.wav`;
        let store: Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"] | null = null;
        try {
          store = (await import("@/integrations/supabase/client.server")).supabaseAdmin;
          const { data } = await store.storage.from(BUCKET).download(path);
          if (data) return audio(data, "audio/wav");
        } catch { /* store unavailable: fall through and generate */ }

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({ model: "google/gemini-3.1-flash-tts-preview", contents: [{ role: "user", parts: [{ text: `${cast.instructions}\nPerform this line exactly, in character: ${text}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cast.voice } } } } }),
        });
        if (!upstream.ok) {
          console.error("voice error", upstream.status, await upstream.text().catch(() => ""));
          return new Response("Voice failed", { status: upstream.status });
        }
        const type = upstream.headers.get("Content-Type") ?? "audio/wav";
        const clip = trimWav(await upstream.arrayBuffer());
        if (store) {
          const save = store.storage.from(BUCKET).upload(path, clip, { contentType: "audio/wav", upsert: true }).then(() => {}, () => {});
          await save;
        }
        return audio(clip, type.includes("wav") ? "audio/wav" : type);
}
