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
};

export const Route = createFileRoute("/api/voice")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => null)) as { who?: string; text?: string } | null;
        const cast = body?.who ? CAST[body.who] : undefined;
        const text = typeof body?.text === "string" ? body.text.trim() : "";
        if (!cast || !text || text.length > 400) return new Response("Bad request", { status: 400 });
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Voice unavailable", { status: 500 });
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({ model: "google/gemini-3.1-flash-tts-preview", contents: [{ role: "user", parts: [{ text: `${cast.instructions}\nPerform this line exactly, in character: ${text}` }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: cast.voice } } } } }),
        });
        if (!upstream.ok) {
          console.error("voice error", upstream.status, await upstream.text().catch(() => ""));
          return new Response("Voice failed", { status: upstream.status });
        }
        return new Response(upstream.body, { status: 200, headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "audio/wav", "Cache-Control": "no-cache" } });
      },
    },
  },
});
