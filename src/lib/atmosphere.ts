/** World atmosphere: procedural Web Audio ambience, fully independent of Shack Radio (own AudioContext). */
export type AtmosEnv = "landing" | "city" | "library" | "walk" | "sanctuary" | "caves" | "silent";

type Mix = { water: number; wind: number; room: number; birds: number; crickets: number; creaks: number; drips: number; steps: number };
const MIX: Record<AtmosEnv, Mix> = {
  landing:   { water: 0,    wind: .5, room: 0,  birds: .3, crickets: 1, creaks: 0,  drips: 0,  steps: 0 },
  city:      { water: 0,    wind: .7, room: 0,  birds: 0,  crickets: .3, creaks: 1, drips: 0,  steps: 0 },
  library:   { water: 0,    wind: 0,  room: 1,  birds: 0,  crickets: 0, creaks: .2, drips: .4, steps: 0 },
  walk:      { water: 0,    wind: .8, room: 0,  birds: .5, crickets: 1, creaks: 0,  drips: 0,  steps: 1 },
  sanctuary: { water: 1,    wind: .4, room: 0,  birds: 1,  crickets: 1, creaks: 0,  drips: 0,  steps: 0 },
  caves:     { water: .15,  wind: 0,  room: .7, birds: 0,  crickets: 0, creaks: 0,  drips: 1,  steps: 0 },
  silent:    { water: 0,    wind: 0,  room: 0,  birds: 0,  crickets: 0, creaks: 0,  drips: 0,  steps: 0 },
};
const MASTER = 0.35;

/** Same 10-minute loop as the Sanctuary sky: 0 = day, 1 = night. */
export function nightLevel(now = Date.now()) {
  const t = (now % 600000) / 600000;
  return t < .4 ? 0 : t < .5 ? (t - .4) / .1 : t < .9 ? 1 : 1 - (t - .9) / .1;
}

let ctx: AudioContext | null = null;
let master: GainNode, echo: GainNode;
const beds: Record<"water" | "wind" | "room", GainNode> = {} as never;
let noise: AudioBuffer;
let env: AtmosEnv = "silent";
let fire = false;
let timer = 0;

function loopNoise(type: BiquadFilterType, freq: number, q = 0.7) {
  const src = ctx!.createBufferSource(); src.buffer = noise; src.loop = true;
  const f = ctx!.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx!.createGain(); g.gain.value = 0;
  src.connect(f).connect(g).connect(master); src.start();
  return { g, f };
}

function blip(t: number, f0: number, f1: number, dur: number, vol: number, type: OscillatorType = "sine", toEcho = false) {
  const o = ctx!.createOscillator(); o.type = type; const g = ctx!.createGain();
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); if (toEcho) g.connect(echo); o.start(t); o.stop(t + dur + 0.05);
}
function burst(t: number, freq: number, dur: number, vol: number, type: BiquadFilterType = "bandpass") {
  const n = ctx!.createBufferSource(); n.buffer = noise;
  const f = ctx!.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx!.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(master); n.start(t, Math.random() * 0.8); n.stop(t + dur + 0.02);
}

let windLfo: BiquadFilter | null = null;
type BiquadFilter = BiquadFilterNode;
let stepPhase = 0;

function tick() {
  if (!ctx || ctx.state !== "running") return;
  const m = MIX[env]; const night = nightLevel(); const day = 1 - night; const t = ctx.currentTime + 0.05;
  const ramp = (g: GainNode, v: number) => g.gain.setTargetAtTime(v, ctx!.currentTime, 0.8);
  ramp(beds.water, m.water * 0.18);
  ramp(beds.wind, m.wind * (0.06 + 0.04 * Math.sin(ctx.currentTime / 4)) * (1 + night * 0.3));
  ramp(beds.room, m.room * 0.05);
  if (windLfo) windLfo.frequency.setTargetAtTime(380 + 220 * Math.sin(ctx.currentTime / 6), ctx.currentTime, 1);
  const r = Math.random;
  // Birds by day (fade with dusk)
  if (r() < 0.035 * m.birds * day) { const base = 2400 + r() * 1800; const n = 2 + Math.floor(r() * 3); for (let i = 0; i < n; i++) blip(t + i * 0.11, base, base * (1.2 + r() * 0.3), 0.08, 0.05); }
  // Crickets & night creatures
  if (r() < 0.25 * m.crickets * night) { const f = 4300 + r() * 500; for (let i = 0; i < 3; i++) blip(t + i * 0.045, f, f, 0.03, 0.018); }
  if (r() < 0.006 * m.crickets * night) { const f = 380 + r() * 120; blip(t, f, f * 0.8, 0.35, 0.03, "triangle"); blip(t + 0.5, f, f * 0.8, 0.35, 0.025, "triangle"); }
  // Old City metal creaks
  if (r() < 0.012 * m.creaks) blip(t, 120 + r() * 80, 70 + r() * 30, 0.9 + r() * 0.6, 0.03, "sawtooth", true);
  // Drips with echo
  if (r() < 0.03 * m.drips) blip(t, 1400 + r() * 900, 500, 0.12, 0.06, "sine", true);
  // Long Walk footsteps
  if (m.steps > 0) { stepPhase += 1; if (stepPhase % 5 === 0) burst(t, 260, 0.09, 0.08 * m.steps, "lowpass"); }
  // Campfire crackle
  if (fire && env === "sanctuary") { if (r() < 0.5) burst(t + r() * 0.08, 3000 + r() * 2500, 0.025, 0.07 + r() * 0.08, "highpass"); if (r() < 0.04) burst(t, 900, 0.12, 0.12); }
}

function boot() {
  if (ctx) { void ctx.resume(); return; }
  const AC: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC(); void ctx.resume();
  const u = ctx.createBufferSource(); u.buffer = ctx.createBuffer(1, 1, 22050); u.connect(ctx.destination); u.start(0);
  noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noise.getChannelData(0); let last = 0;
  for (let i = 0; i < d.length; i++) { last = (last + 0.04 * (Math.random() * 2 - 1)) / 1.04; d[i] = last * 3 + (Math.random() * 2 - 1) * 0.25; }
  master = ctx.createGain(); master.gain.value = MASTER; master.connect(ctx.destination);
  const delay = ctx.createDelay(1); delay.delayTime.value = 0.32; echo = ctx.createGain(); echo.gain.value = 0.35;
  const fb = ctx.createGain(); fb.gain.value = 0.35; echo.connect(delay).connect(fb).connect(delay); delay.connect(master);
  beds.water = loopNoise("lowpass", 700).g;
  const w = loopNoise("bandpass", 400, 0.8); beds.wind = w.g; windLfo = w.f;
  beds.room = loopNoise("lowpass", 180).g;
  timer = window.setInterval(tick, 100);
  document.addEventListener("visibilitychange", () => { if (!ctx) return; if (document.hidden) void ctx.suspend(); else void ctx.resume(); });
}

let armed = false;
/** Start listening for the first user gesture (mobile audio policy). Safe to call repeatedly. */
export function armAtmosphere() {
  if (armed || typeof window === "undefined") return; armed = true;
  const go = () => { boot(); };
  window.addEventListener("pointerdown", go, { passive: true });
  window.addEventListener("keydown", go);
}
export function setAtmosEnv(next: AtmosEnv) { env = next; }
export function setAtmosFire(lit: boolean) { fire = lit; }
export function stopAtmosphere() { if (timer) clearInterval(timer); timer = 0; void ctx?.close(); ctx = null; armed = false; }
