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
/** Call synchronously from the page-turn gesture, before its animation or any timers. */
export function unlockAtmosphere() {
  if (typeof window !== "undefined") boot();
}
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

// ---------- Battle music: Game Boy wild-battle style chiptune (pulse lead, pulse harmony, triangle bass, noise drums) ----------
let battle: { timer: number; step: number; next: number; boss: boolean; bus: GainNode } | null = null;
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// 16th-note patterns, 0 = rest. A minor, two bars per phrase.
const INTRO = [81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 0, 69, 0];
const LEAD = [
  69, 0, 72, 69, 76, 0, 74, 72, 71, 0, 72, 74, 76, 0, 79, 0,
  77, 0, 76, 74, 72, 0, 74, 76, 71, 0, 68, 0, 69, 0, 0, 0,
  69, 0, 72, 69, 76, 0, 74, 72, 77, 0, 76, 77, 79, 0, 81, 0,
  80, 0, 79, 77, 76, 0, 74, 72, 71, 72, 74, 71, 69, 0, 0, 0,
];
const HARM = [0, 64, 0, 64, 0, 64, 0, 64, 0, 62, 0, 62, 0, 64, 0, 64];
const BASS_ROOTS = [45, 45, 41, 40, 45, 45, 41, 40];
function chip(bus: GainNode, t: number, f: number, dur: number, vol: number, type: OscillatorType) {
  const o = ctx!.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t);
  const g = ctx!.createGain(); g.gain.setValueAtTime(vol, t); g.gain.setValueAtTime(vol, t + dur * 0.8); g.gain.linearRampToValueAtTime(0, t + dur);
  o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.02);
}
function hit(bus: GainNode, t: number, freq: number, dur: number, vol: number) {
  const n = ctx!.createBufferSource(); n.buffer = noise;
  const f = ctx!.createBiquadFilter(); f.type = "highpass"; f.frequency.value = freq;
  const g = ctx!.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  n.connect(f).connect(g).connect(bus); n.start(t, Math.random()); n.stop(t + dur + 0.02);
}
function battleTick() {
  if (!ctx || !battle) return;
  const b = battle; const sixteenth = 60 / (b.boss ? 178 : 165) / 4;
  while (b.next < ctx.currentTime + 0.25) {
    const t = b.next, s = b.step;
    if (s < 16) { const m = INTRO[s]!; if (m) chip(b.bus, t, hz(m), sixteenth * 0.9, 0.09, "square"); }
    else {
      const i = s - 16, bar = Math.floor(i / 16) % BASS_ROOTS.length, sub = i % 16;
      const m = LEAD[i % LEAD.length]!; if (m) chip(b.bus, t, hz(m + (b.boss ? 0 : 0)), sixteenth * 0.85, 0.08, "square");
      const h = HARM[sub]!; if (h) chip(b.bus, t, hz(h + (bar % 4 === 2 ? 1 : 0) + (b.boss ? 12 : 0)), sixteenth * 0.5, 0.035, "square");
      const root = BASS_ROOTS[bar]!; chip(b.bus, t, hz(sub % 2 ? root + 12 : root), sixteenth * 0.9, 0.16, "triangle");
      if (sub % 4 === 0) chip(b.bus, t, 110, 0.05, 0.12, "triangle");
      if (sub % 8 === 4) hit(b.bus, t, 1500, 0.09, 0.12);
      if (sub % 2 === 1 || b.boss) hit(b.bus, t, 7000, 0.025, 0.05);
    }
    b.step++; b.next += sixteenth;
  }
}
/** Start (or intensify to boss mode) the battle theme. Needs a prior user gesture; silently no-ops otherwise. */
export function startBattleMusic(boss = false) {
  if (!ctx) boot();
  if (!ctx) return;
  if (battle) { battle.boss = battle.boss || boss; battle.bus.gain.setTargetAtTime(0.9, ctx.currentTime, 0.05); return; }
  const bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(master);
  battle = { timer: window.setInterval(battleTick, 50), step: 0, next: ctx.currentTime + 0.05, boss, bus };
  battleTick();
}
export function stopBattleMusic() {
  if (!battle || !ctx) { battle = null; return; }
  const b = battle; battle = null; clearInterval(b.timer);
  b.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
  setTimeout(() => b.bus.disconnect(), 2500);
}

// ---------- Combat SFX: crunchy 8-bit hits (shares the atmosphere context) ----------
export type Sfx = "swing" | "punch" | "punch-heavy" | "zap" | "zap-heavy" | "zap-hit" | "slash" | "slash-hit" | "hurt" | "miss";
export function playSfx(kind: Sfx) {
  if (!ctx) boot();
  if (!ctx || ctx.state !== "running") return;
  const t = ctx.currentTime + 0.005; const r = Math.random;
  switch (kind) {
    case "swing": burst(t, 1200 + r() * 400, 0.09, 0.08); break;
    case "miss": burst(t, 900, 0.07, 0.05); break;
    case "punch": blip(t, 180, 60, 0.12, 0.35, "square"); burst(t, 700, 0.08, 0.35, "lowpass"); break;
    case "punch-heavy": blip(t, 140, 40, 0.25, 0.45, "square"); burst(t, 500, 0.2, 0.5, "lowpass"); burst(t + 0.03, 2500, 0.08, 0.2); break;
    case "zap": for (let i = 0; i < 5; i++) blip(t + i * 0.02, 1800 + r() * 1400, 400, 0.04, 0.06, "square"); burst(t, 5000, 0.12, 0.12, "highpass"); break;
    case "zap-heavy": for (let i = 0; i < 9; i++) blip(t + i * 0.025, 2200 + r() * 1800, 200, 0.05, 0.07, "sawtooth"); burst(t, 4000, 0.3, 0.2, "highpass"); break;
    case "zap-hit": blip(t, 900, 1600, 0.06, 0.12, "square"); blip(t + 0.06, 1600, 300, 0.1, 0.1, "square"); break;
    case "slash": blip(t, 260, 70, 0.22, 0.12, "sawtooth"); burst(t, 600, 0.22, 0.14, "lowpass"); break;
    case "slash-hit": blip(t, 120, 45, 0.2, 0.3, "sawtooth"); burst(t, 1800, 0.12, 0.18, "bandpass"); break;
    case "hurt": burst(t, 2200, 0.05, 0.22, "bandpass"); blip(t + 0.01, 520, 140, 0.14, 0.2, "square"); burst(t + 0.05, 900, 0.06, 0.18, "lowpass"); break;
  }
}

/** Layered hatch cues have their own compressed mix; ambience and combat levels stay untouched. */
export function playHatch(kind: "heavy" | "pop" | "mist") {
  if (typeof window === "undefined") return;
  if (!ctx) boot();
  if (!ctx || ctx.state !== "running") return;
  const audio = ctx;
  const t = audio.currentTime + 0.02;
  const bus = audio.createGain(); bus.gain.value = 0.72;
  const limiter = audio.createDynamicsCompressor();
  limiter.threshold.value = -12; limiter.knee.value = 6; limiter.ratio.value = 8;
  limiter.attack.value = 0.003; limiter.release.value = 0.18;
  bus.connect(limiter).connect(audio.destination);
  const tone = (offset: number, from: number, to: number, duration: number, level: number, type: OscillatorType = "sine", attack = 0.008) => {
    const o = audio.createOscillator(); o.type = type;
    const g = audio.createGain(); const at = t + offset;
    o.frequency.setValueAtTime(from, at); o.frequency.exponentialRampToValueAtTime(to, at + duration);
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(level, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    o.connect(g).connect(bus); o.start(at); o.stop(at + duration + 0.02);
    o.onended = () => { o.disconnect(); g.disconnect(); };
  };
  const air = (offset: number, frequency: number, duration: number, level: number, attack = 0.015, type: BiquadFilterType = "bandpass") => {
    const n = audio.createBufferSource(); n.buffer = noise;
    const f = audio.createBiquadFilter(); f.type = type; f.frequency.value = frequency; f.Q.value = 0.65;
    const g = audio.createGain(); const at = t + offset;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(level, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    n.connect(f).connect(g).connect(bus); n.start(at, Math.random() * 0.2); n.stop(at + duration + 0.02);
    n.onended = () => { n.disconnect(); f.disconnect(); g.disconnect(); };
  };
  if (kind === "heavy") { // Weighty latch, resonant metal, then pressure releasing.
    tone(0, 160, 48, 0.45, 0.65);
    air(0, 650, 0.12, 0.42);
    for (const f of [310, 487, 731]) tone(0.025, f, f * 0.83, 0.65, 0.1, "triangle");
    tone(0.18, 94, 62, 1.2, 0.14, "triangle", 0.12);
    air(0.14, 1900, 1.65, 0.48, 0.14);
    air(0.3, 4200, 1.3, 0.19, 0.1, "highpass");
    tone(1.08, 125, 58, 0.23, 0.22);
  } else if (kind === "pop") { // Charged whine, sharp pop and uneven electrical arcs.
    tone(0, 620, 2200, 0.18, 0.16, "triangle", 0.025);
    tone(0.16, 360, 70, 0.22, 0.46);
    air(0.16, 2800, 0.12, 0.52);
    for (let i = 0; i < 12; i++) {
      const at = 0.21 + i * 0.055 + Math.random() * 0.025;
      air(at, 3200 + Math.random() * 3400, 0.035, 0.2 + Math.random() * 0.13, 0.002, "highpass");
      tone(at, 1800 + Math.random() * 1600, 450, 0.045, 0.045, "sawtooth", 0.002);
    }
    air(0.24, 1400, 0.8, 0.22, 0.05);
  } else { // A soft seal release, wide breath of mist and an eerie gentle hum.
    air(0, 950, 0.22, 0.2, 0.025);
    air(0.1, 650, 1.85, 0.44, 0.25);
    air(0.25, 2400, 1.65, 0.22, 0.2);
    tone(0.15, 155, 82, 1.8, 0.22, "sine", 0.25);
    tone(0.3, 233, 123, 1.6, 0.08, "triangle", 0.3);
  }
  window.setTimeout(() => { bus.disconnect(); limiter.disconnect(); }, 3000);
}

/** Retro defeat sting (~4s): tumbling minor arpeggio into a long hollow detuned low tone. */
export function playDefeatSting() {
  if (!ctx) boot();
  if (!ctx || ctx.state !== "running") return;
  const t0 = ctx.currentTime + 0.05;
  const notes = [81, 76, 72, 69, 64, 60, 57, 52, 48, 45];
  notes.forEach((m, i) => blip(t0 + i * 0.15, hz(m), hz(m) * 0.97, 0.2, 0.28, "square"));
  const end = t0 + notes.length * 0.15;
  for (const det of [0, 9]) {
    const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(45); o.detune.value = det;
    o.frequency.linearRampToValueAtTime(hz(41), end + 2.2);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, end); g.gain.linearRampToValueAtTime(0.7, end + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, end + 2.6);
    o.connect(g).connect(ctx.destination); o.start(end); o.stop(end + 2.7);
  }
}

// ---------- Oz's shack: procedural drum & bass (174 BPM). Eight deck tunes; the decks button changes them. ----------
let dnb: { timer: number; step: number; next: number; bus: GainNode } | null = null;
type ShackTrack = { name: string; roots: number[]; kick: number[]; snare: number[]; ghost: number[]; pad: number[]; bass: "reese" | "square" | "wobble" | "acid"; hat: "straight" | "swing" | "sparse"; lead?: boolean };
const SHACK_TRACKS: ShackTrack[] = [
  { name: "RIVERSIDE ROLL", roots: [38, 38, 41, 36], kick: [0, 10], snare: [4, 12], ghost: [7, 2], pad: [24, 27, 31], bass: "reese", hat: "straight" },
  { name: "NEON STEP", roots: [36, 36, 39, 34], kick: [0, 11], snare: [4, 14], ghost: [7, 9], pad: [23, 27, 30], bass: "square", hat: "swing" },
  { name: "JUNGLE STOMP", roots: [40, 40, 38, 43], kick: [0, 7, 10], snare: [4, 12], ghost: [5, 9, 14], pad: [24, 28, 31], bass: "reese", hat: "straight" },
  { name: "SUNSET DUB", roots: [38, 41, 36, 38], kick: [0, 8], snare: [8], ghost: [12, 3], pad: [19, 26, 27], bass: "wobble", hat: "sparse" },
  { name: "MIDNIGHT ACID", roots: [36, 36, 34, 41], kick: [0, 4, 10], snare: [4, 12], ghost: [7, 11], pad: [24, 27, 30], bass: "acid", hat: "straight" },
  { name: "COPPER WIRE", roots: [38, 43, 41, 36], kick: [0, 10], snare: [4, 12], ghost: [6, 14], pad: [24, 28, 31], bass: "reese", hat: "swing", lead: true },
  { name: "THUNDER ROLL", roots: [36, 34, 39, 36], kick: [0, 8, 10], snare: [4, 12], ghost: [7, 9, 15], pad: [22, 26, 29], bass: "wobble", hat: "straight" },
  { name: "FIREFLY DANCE", roots: [38, 40, 45, 41], kick: [0, 11], snare: [4, 12], ghost: [6, 9], pad: [24, 28, 32], bass: "square", hat: "swing", lead: true },
];
let shackTrack = 0;
/** The tune currently cued up on Oz's decks. */
export const shackTrackName = () => SHACK_TRACKS[shackTrack]!.name;
/** Deck button: cue the next tune. If the decks are spinning, drop it in with a spinback flick. */
export function cycleShackTrack(): string {
  shackTrack = (shackTrack + 1) % SHACK_TRACKS.length;
  if (dnb && ctx) {
    clearInterval(dnb.timer);
    dnb.step = 0; dnb.next = ctx.currentTime + 0.05;
    dnb.timer = window.setInterval(dnbTick, 50);
    // soft vinyl-stop: a low tone gliding down as the deck drops the new tune
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(340, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.35);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.1, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    o.connect(g).connect(dnb.bus); o.start(); o.stop(ctx.currentTime + 0.4);
    dnbTick();
  }
  return shackTrackName();
}
function dnbTick() {
  if (!ctx || !dnb) return;
  const d = dnb, track = SHACK_TRACKS[shackTrack]!; const s16 = 60 / 174 / 4;
  while (d.next < ctx.currentTime + 0.25) {
    const t = d.next, sub = d.step % 16, bar = Math.floor(d.step / 16) % 4;
    if (track.kick.includes(sub)) { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g).connect(d.bus); o.start(t); o.stop(t + 0.25); }
    if (track.snare.includes(sub)) { hit(d.bus, t, 1200, 0.16, 0.32); chip(d.bus, t, 200, 0.06, 0.12, "triangle"); }
    if (track.ghost.includes(sub)) hit(d.bus, t, 1500, 0.06, 0.1);
    // per-track hats: straight, swung or sparse
    if (track.hat !== "sparse" || sub % 4 === 0) {
      const tt = track.hat === "swing" && sub % 2 ? t + s16 * 0.22 : t;
      hit(d.bus, tt, 8000, 0.025, track.hat === "sparse" ? 0.05 : sub % 2 ? 0.035 : 0.06);
    }
    // per-track bass: rolling reese, squelchy square, wobbling sub or an acid line
    if (sub % 4 === 0 || sub === 14) {
      const root = track.roots[bar]!;
      const isAcid = track.bass === "acid";
      const o = ctx.createOscillator(); o.type = track.bass === "square" ? "square" : "sawtooth"; o.frequency.value = hz(root);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.Q.value = isAcid ? 12 : 1; f.frequency.setValueAtTime(isAcid ? (sub % 4 === 0 ? 1100 : 700) : track.bass === "wobble" ? (sub % 8 === 0 ? 620 : 300) : 500, t); f.frequency.exponentialRampToValueAtTime(isAcid ? 220 : 140, t + s16 * 3);
      const g = ctx.createGain(); g.gain.setValueAtTime(track.bass === "square" ? 0.11 : 0.16, t); g.gain.linearRampToValueAtTime(0, t + s16 * 3.6);
      o.connect(f).connect(g).connect(d.bus); o.start(t); o.stop(t + s16 * 4);
    }
    // sparky lead blip for the electric tunes
    if (track.lead && sub % 4 === 3) chip(d.bus, t, hz(track.roots[bar]! + 36 + [0, 3, 5, 7, 10][(d.step * 3) % 5]!), 0.09, 0.09, "square");
    // airy pad stab each bar, voiced from the track's roots
    if (sub === 0) for (const m of track.pad.map(n => n + track.roots[bar]!)) { const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(m); const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.3); g.gain.linearRampToValueAtTime(0.0001, t + s16 * 16); o.connect(g).connect(d.bus); o.start(t); o.stop(t + s16 * 16); }
    d.step++; d.next += s16;
  }
}
/** Start Oz's shack drum & bass: stops battle music and Shack Radio, ducks outdoor ambience. */
export function startShackMusic() {
  if (typeof window === "undefined") return;
  if (!ctx) boot();
  if (!ctx || dnb) return;
  stopBattleMusic();
  window.dispatchEvent(new Event("zygoria-music-takeover"));
  master.gain.setTargetAtTime(MASTER * 0.12, ctx.currentTime, 0.3);
  const bus = ctx.createGain(); bus.gain.value = 0; bus.connect(ctx.destination);
  bus.gain.setTargetAtTime(0.55, ctx.currentTime, 0.4);
  dnb = { timer: window.setInterval(dnbTick, 50), step: 0, next: ctx.currentTime + 0.05, bus };
  dnbTick();
}
export function stopShackMusic() {
  if (!dnb || !ctx) { dnb = null; return; }
  const d = dnb; dnb = null; clearInterval(d.timer);
  d.bus.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
  master.gain.setTargetAtTime(MASTER, ctx.currentTime, 0.4);
  setTimeout(() => d.bus.disconnect(), 1500);
}
