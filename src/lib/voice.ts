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

async function play(who: string, text: string, maxWaitMs: number) {
  let url = await Promise.race([load(who, text), new Promise<null>(r => setTimeout(() => r(null), maxWaitMs))]);
  if (!url) { await new Promise(r => setTimeout(r, 1200)); url = await load(who, text); } // one retry for slow/busy voice server
  if (!url || !voicesOn()) return;
  const a = new Audio(url); current = a;
  a.playbackRate = 1.3; a.preservesPitch = true; // brisker delivery, same voice pitch
  await new Promise<void>(res => { a.onended = () => res(); a.onerror = () => res(); a.play().catch(() => res()); });
  if (current === a) current = null;
}

/** Every line goes through one queue so lines never cut each other off or get skipped. */
const queue: { who: string; text: string; done: () => void }[] = [];
let playing = false;
function enqueue(who: string, text: string) {
  return new Promise<void>(done => {
    queue.push({ who, text, done }); void load(who, text);
    if (playing) return;
    playing = true;
    void (async () => { while (queue.length) { const q = queue.shift()!; try { await play(q.who, q.text, 15000); } finally { q.done(); } } playing = false; })();
  });
}
const clean = (s: string) => s.replace(/\*[^*]*\*/g, "").trim().slice(0, 400);

/** Speak a line; resolves when it finishes (or immediately if voices are off/unavailable). */
export async function speak(who: string, text: string, _maxWaitMs?: number): Promise<void> {
  const t = clean(text);
  if (!voicesOn() || !/[a-z]/i.test(t)) return;
  await enqueue(who, t);
}

/** Fire-and-forget: queue any on-screen line so every bubble is spoken, in order. */
export function voiceLine(who: string, text: string) { void speak(who, text); }
