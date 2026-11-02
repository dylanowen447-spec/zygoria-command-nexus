/** Spoken character lines: fetched once per line, cached, played one at a time. Browser-only. */
const cache = new Map<string, Promise<string | null>>();
let current: HTMLAudioElement | null = null;
const KEY = "zyg-voices-off";

export const voicesOn = () => typeof window !== "undefined" && localStorage.getItem(KEY) !== "1";
export function setVoicesOn(on: boolean) { localStorage.setItem(KEY, on ? "0" : "1"); if (!on) stopVoice(); }

/** On-device clip store: lines heard once play instantly on every later visit, no network. */
const DISK = "zyg-voice-v1";
const diskKey = (who: string, text: string) => `/__voice/${encodeURIComponent(who)}/${encodeURIComponent(text)}`;
async function fromDisk(who: string, text: string): Promise<Blob | null> {
  try { const r = await (await caches.open(DISK)).match(diskKey(who, text)); return r ? await r.blob() : null; } catch { return null; }
}
function toDisk(who: string, text: string, blob: Blob) {
  void caches.open(DISK).then(c => c.put(diskKey(who, text), new Response(blob, { headers: { "Content-Type": blob.type || "audio/wav" } }))).catch(() => {});
}

function load(who: string, text: string) {
  const k = `${who}|${text}`;
  let p = cache.get(k);
  if (!p) {
    p = (async () => {
      const saved = await fromDisk(who, text);
      if (saved && saved.size > 44) return URL.createObjectURL(saved);
      const r = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ who, text }) });
      if (!r.ok) return null;
      const blob = await r.blob();
      toDisk(who, text, blob);
      return URL.createObjectURL(blob);
    })().catch(() => null);
    cache.set(k, p);
    p.then(u => { if (!u) cache.delete(k); });
  }
  return p;
}

/** Warm the cache so lines start instantly. */
export function preloadVoices(lines: [string, string][]) { if (voicesOn()) lines.forEach(([w, t]) => void load(w, t)); }

/** Pausing never fires "ended", so finish the line by hand — otherwise the queue waits forever and every later line goes silent. */
export function stopVoice() { if (current) { const a = current; current = null; a.onended?.(new Event("ended")); a.pause(); } }

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

/** Bigger characters speak louder. Browser volume caps at 1, so the crew steps down and the monster fills the room. */
const VOLUME: Record<string, number> = { Kronk: 1 };

async function play(who: string, text: string, maxWaitMs: number, until: number, onStart?: () => void) {
  let url = await Promise.race([load(who, text), new Promise<null>(r => setTimeout(() => r(null), maxWaitMs))]);
  if (!url && maxWaitMs >= 10000) { await new Promise(r => setTimeout(r, 1200)); url = await load(who, text); } // one retry for slow/busy voice server
  if (!url || !voicesOn() || muted() || Date.now() > until + 200) return; // too late: the words would no longer match the bubble
  const a = player(); current = a;
  a.src = url;
  a.volume = VOLUME[who] ?? 0.72;
  a.playbackRate = 1.3; a.preservesPitch = true; // brisker delivery, same voice pitch
  await new Promise<void>(res => { a.onended = () => res(); a.onerror = () => res(); a.onplaying = () => { a.onplaying = null; onStart?.(); }; a.play().catch(() => res()); });
  if (current === a) current = null;
}

/** Every line goes through one queue so lines never cut each other off or get skipped. */
const queue: { who: string; text: string; done: () => void; onStart?: (() => void) | undefined; staleMs: number }[] = [];
let playing = false;
/** Same speaker + same line within this window is an echo (e.g. a scene re-mounting), not a new line. */
const recent = new Map<string, number>();
const ECHO_MS = 2500;
/** First-time lines need generating (~2–3s), so allow at least this long before giving up. */
const MIN_WAIT_MS = 3500;
function enqueue(who: string, text: string, onStart?: () => void, staleMs = 15000) {
  const k = `${who}|${text}`, now = Date.now();
  if (now - (recent.get(k) ?? 0) < ECHO_MS) { onStart?.(); return Promise.resolve(); }
  recent.set(k, now);
  return new Promise<void>(done => {
    queue.push({ who, text, done, onStart, staleMs }); void load(who, text);
    if (playing) return;
    playing = true;
    // The wait window starts when a line reaches the front, so lines waiting behind another speaker are never skipped.
    void (async () => { while (queue.length) { const q = queue.shift()!; let started = false; try { const wait = Math.max(q.staleMs, MIN_WAIT_MS); await play(q.who, q.text, wait, Date.now() + wait, () => { started = true; q.onStart?.(); }); } finally { if (!started) q.onStart?.(); q.done(); } } playing = false; })();
  });
}
const clean = (s: string) => s.replace(/\*[^*]*\*/g, "").trim().slice(0, 400);

/** Speak a line; resolves when it finishes (or immediately if voices are off/unavailable).
 *  onStart fires the moment the voice actually starts (or right away if it can't play), so text can appear in sync. */
export async function speak(who: string, text: string, onStart?: () => void, staleMs?: number): Promise<void> {
  const t = clean(text);
  if (!voicesOn() || muted() || !/[a-z]/i.test(t)) { onStart?.(); return; }
  await enqueue(who, t, onStart, staleMs);
}

/** Fire-and-forget: queue any on-screen line so every bubble is spoken, in order. */
/** The bubble is already on screen, so a line that can't start within ~2s is dropped rather than heard late. */
export function voiceLine(who: string, text: string) { void speak(who, text, undefined, 2200); }

/** Synced bubble: show() fires when the voice starts, hide() after it ends (min holdMs on screen). */
export function sayInSync(who: string, text: string, show: () => void, hide: () => void, holdMs = 1800, staleMs = 2200) {
  let shown = 0;
  void speak(who, text, () => { shown = Date.now(); show(); }, staleMs)
    .then(() => setTimeout(hide, Math.max(300, holdMs - (Date.now() - shown))));
}
