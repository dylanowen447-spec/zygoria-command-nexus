import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

/** Oz's shack radio: a procedurally generated lo-fi garage loop (Web Audio, no files). */
type Engine = { ctx: AudioContext; master: GainNode; timer: number };
const KEY = "zygoria-radio-v1";
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]];
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function start(volume: number): Engine {
  const AC: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  // Unlock audio on iOS/mobile: resume and play a silent buffer synchronously inside the tap.
  void ctx.resume();
  const unlock = ctx.createBufferSource();
  unlock.buffer = ctx.createBuffer(1, 1, 22050);
  unlock.connect(ctx.destination);
  unlock.start(0);

  const master = ctx.createGain();
  master.gain.value = volume;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 9000;
  const comp = ctx.createDynamicsCompressor();
  master.connect(lp).connect(comp).connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const beat = 60 / 88 / 2; // 88 bpm, 8th notes
  let step = 0; let next = 0; let started = false;
  const env = (g: GainNode, t: number, peak: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const tick = () => {
    if (ctx.state !== "running") { void ctx.resume(); return; }
    if (!started) {
      started = true; next = ctx.currentTime + 0.05;
      // vinyl crackle bed + a short confirmation chime
      const crackle = ctx.createBufferSource(); crackle.buffer = noise; crackle.loop = true;
      const cg = ctx.createGain(); cg.gain.value = 0.02; crackle.connect(cg).connect(master); crackle.start();
      const ch = ctx.createOscillator(); ch.type = "sine"; ch.frequency.value = 880;
      const chg = ctx.createGain(); env(chg, ctx.currentTime, 0.25, 0.4); ch.connect(chg).connect(master); ch.start(); ch.stop(ctx.currentTime + 0.45);
    }
    while (next < ctx.currentTime + 0.3) {
      const t = next; const s = step % 16; const bar = Math.floor(step / 16) % 4;
      if (s === 0 || s === 7 || s === 10) { // kick: sub + audible mid punch for phone speakers
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.15);
        env(g, t, 0.9, 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3);
        const p = ctx.createOscillator(); p.type = "triangle"; const pg = ctx.createGain();
        p.frequency.setValueAtTime(320, t); p.frequency.exponentialRampToValueAtTime(180, t + 0.05);
        env(pg, t, 0.35, 0.07); p.connect(pg).connect(master); p.start(t); p.stop(t + 0.08);
      }
      if (s === 4 || s === 12) { // snare
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800;
        const g = ctx.createGain(); env(g, t, 0.45, 0.18); n.connect(f).connect(g).connect(master); n.start(t, Math.random() * 0.5); n.stop(t + 0.2);
        const b = ctx.createOscillator(); b.type = "triangle"; b.frequency.value = 220; const bg = ctx.createGain();
        env(bg, t, 0.2, 0.08); b.connect(bg).connect(master); b.start(t); b.stop(t + 0.1);
      }
      { // hat, swung
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
        const g = ctx.createGain(); const tt = t + (s % 2 ? beat * 0.18 : 0); env(g, tt, s % 2 ? 0.07 : 0.11, 0.05);
        n.connect(f).connect(g).connect(master); n.start(tt, Math.random() * 0.5); n.stop(tt + 0.06);
      }
      if (s === 0) { // chord pad
        for (const m of CHORDS[bar]!) {
          const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(m); o.detune.value = Math.random() * 10 - 5;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + beat * 16);
          o.connect(g).connect(master); o.start(t); o.stop(t + beat * 16);
        }
        const b = ctx.createOscillator(); b.type = "triangle"; b.frequency.value = hz(CHORDS[bar]![0]! - 12);
        const bg = ctx.createGain(); env(bg, t, 0.3, beat * 6); b.connect(bg).connect(master); b.start(t); b.stop(t + beat * 6);
      }
      next += beat; step++;
    }
  };
  const timer = window.setInterval(tick, 50);
  return { ctx, master, timer };
}

export function ShackRadio({ trigger }: { trigger: number }) {
  const [on, setOn] = useState(false);
  const [vol, setVol] = useState(0.7);
  const eng = useRef<Engine | null>(null);
  useEffect(() => { const v = Number(localStorage.getItem(KEY)); if (v > 0 && v <= 1) setVol(v); }, []);
  const stop = () => { if (eng.current) { clearInterval(eng.current.timer); void eng.current.ctx.close(); eng.current = null; } setOn(false); };
  const play = () => {
    if (!eng.current) eng.current = start(vol);
    if (eng.current.ctx.state === "suspended") void eng.current.ctx.resume();
    setOn(true);
  };
  useEffect(() => { if (trigger > 0) play(); }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const h = () => stop(); window.addEventListener("zygoria-music-takeover", h); return () => window.removeEventListener("zygoria-music-takeover", h); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { localStorage.setItem(KEY, String(vol)); if (eng.current) eng.current.master.gain.value = vol; }, [vol]);
  return (
    <div className={`shack-radio ${on ? "is-on" : ""}`}>
      <button type="button" onClick={() => (on ? stop() : play())} aria-label={on ? "Turn off Oz's shack radio" : "Play Oz's shack radio"} aria-pressed={on}>
        {on ? <span className="radio-eq" aria-hidden><i/><i/><i/></span> : <VolumeX size={14}/>}
        <span className="radio-label"><Music size={11}/> {on ? "SHACK RADIO" : "RADIO OFF"}</span>
      </button>
      {on && <input type="range" min={0.05} max={1} step={0.05} value={vol} onChange={e => setVol(Number(e.target.value))} aria-label="Radio volume"/>}
    </div>
  );
}
