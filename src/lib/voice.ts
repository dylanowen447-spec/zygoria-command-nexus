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

/** Silence everything now: stop the speaking line, drop queued lines, and mute new lines for `muteMs`. */
let mutedUntil = 0;
export function silenceAllVoices(muteMs = 6000) {
  mutedUntil = Date.now() + muteMs;
  queue.splice(0).forEach(q => { q.onStart?.(); q.done(); });
  if (current) { current.onended?.(new Event("ended")); current.pause(); current = null; }
}
export function unmuteVoices() { mutedUntil = 0; }
const muted = () => Date.now() < mutedUntil;

/** One shared audio element, unlocked on the player's first tap/key anywhere — browsers block
 *  speech started later (after a fetch or timer) unless that same element was unlocked by a gesture. */
const SILENT = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
let el: HTMLAudioElement | null = null;
const player = () => (el ??= new Audio());
if (typeof window !== "undefined") {
  const unlock = () => {
    const a = player(); if (!a.src || a.src === SILENT) { a.src = SILENT; void a.play().catch(() => {}); }
    window.removeEventListener("pointerdown", unlock, true); window.removeEventListener("keydown", unlock, true);
  };
  window.addEventListener("pointerdown", unlock, true); window.addEventListener("keydown", unlock, true);
}

async function play(who: string, text: string, maxWaitMs: number, onStart?: () => void) {
  let url = await Promise.race([load(who, text), new Promise<null>(r => setTimeout(() => r(null), maxWaitMs))]);
  if (!url) { await new Promise(r => setTimeout(r, 1200)); url = await load(who, text); } // one retry for slow/busy voice server
  if (!url || !voicesOn()) return;
  const a = player(); current = a;
  a.src = url;
  a.playbackRate = 1.3; a.preservesPitch = true; // brisker delivery, same voice pitch
  await new Promise<void>(res => { a.onended = () => res(); a.onerror = () => res(); a.onplaying = () => { a.onplaying = null; onStart?.(); }; a.play().catch(() => res()); });
  if (current === a) current = null;
}

/** Every line goes through one queue so lines never cut each other off or get skipped. */
const queue: { who: string; text: string; done: () => void; onStart?: (() => void) | undefined }[] = [];
let playing = false;
/** Same speaker + same line within this window is an echo (e.g. a scene re-mounting), not a new line. */
const recent = new Map<string, number>();
const ECHO_MS = 8000;
function enqueue(who: string, text: string, onStart?: () => void) {
  const k = `${who}|${text}`, now = Date.now();
  if (now - (recent.get(k) ?? 0) < ECHO_MS) { onStart?.(); return Promise.resolve(); }
  recent.set(k, now);
  return new Promise<void>(done => {
    queue.push({ who, text, done, onStart }); void load(who, text);
    if (playing) return;
    playing = true;
    void (async () => { while (queue.length) { const q = queue.shift()!; let started = false; try { await play(q.who, q.text, 15000, () => { started = true; q.onStart?.(); }); } finally { if (!started) q.onStart?.(); q.done(); } } playing = false; })();
  });
}
const clean = (s: string) => s.replace(/\*[^*]*\*/g, "").trim().slice(0, 400);

/** Speak a line; resolves when it finishes (or immediately if voices are off/unavailable).
 *  onStart fires the moment the voice actually starts (or right away if it can't play), so text can appear in sync. */
export async function speak(who: string, text: string, onStart?: () => void): Promise<void> {
  const t = clean(text);
  if (!voicesOn() || !/[a-z]/i.test(t)) { onStart?.(); return; }
  await enqueue(who, t, onStart);
}

/** Fire-and-forget: queue any on-screen line so every bubble is spoken, in order. */
export function voiceLine(who: string, text: string) { void speak(who, text); }
