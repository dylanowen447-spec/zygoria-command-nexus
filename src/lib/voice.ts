/** Spoken character lines: fetched once per line, cached, played one at a time. Browser-only. */
const cache = new Map<string, Promise<string | null>>();
let current: HTMLAudioElement | null = null;
const KEY = "zyg-voices-off";

export const voicesOn = () => typeof window !== "undefined" && localStorage.getItem(KEY) !== "1";
export function setVoicesOn(on: boolean) { localStorage.setItem(KEY, on ? "0" : "1"); if (!on) stopVoice(); }

function load(who: string, text: string) {
  const k = `${who}|${text}`;
  let p = cache.get(k);
  if (!p) {
    p = fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ who, text }) })
      .then(async r => r.ok ? URL.createObjectURL(await r.blob()) : null).catch(() => null);
    cache.set(k, p);
    p.then(u => { if (!u) cache.delete(k); });
  }
  return p;
}

/** Warm the cache so lines start instantly. */
export function preloadVoices(lines: [string, string][]) { if (voicesOn()) lines.forEach(([w, t]) => void load(w, t)); }

export function stopVoice() { if (current) { current.pause(); current = null; } }

/** Speak a line; resolves when it finishes (or immediately if voices are off/unavailable). */
export async function speak(who: string, text: string, maxWaitMs = 4000): Promise<void> {
  if (!voicesOn()) return;
  const url = await Promise.race([load(who, text), new Promise<null>(r => setTimeout(() => r(null), maxWaitMs))]);
  if (!url || !voicesOn()) return;
  stopVoice();
  const a = new Audio(url); current = a;
  a.playbackRate = 1.3; a.preservesPitch = true; // brisker delivery, same voice pitch
  await new Promise<void>(res => { a.onended = () => res(); a.onerror = () => res(); a.play().catch(() => res()); });
  if (current === a) current = null;
}

/** Fire-and-forget: queue any on-screen line so every bubble is spoken, in order, never overlapping. */
const queue: [string, string][] = [];
let playing = false;
export function voiceLine(who: string, text: string) {
  const t = text.replace(/\*[^*]*\*/g, "").trim();
  if (!voicesOn() || !/[a-z]/i.test(t)) return;
  if (queue.length > 5) queue.shift(); // only drop lines if far behind
  queue.push([who, t]); void load(who, t);
  if (playing) return;
  playing = true;
  void (async () => { while (queue.length) { const [w, x] = queue.shift()!; await speak(w, x, 6000); } playing = false; })();
}
