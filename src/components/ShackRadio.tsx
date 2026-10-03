import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";

/** Oz's shack radio: a procedurally generated lo-fi garage loop (Web Audio, no files). */
type Engine = { ctx: AudioContext; master: GainNode; timer: number };
const KEY = "zygoria-radio-v1";
const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65], [52, 55, 59, 62]];
const hz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

function start(volume: number): Engine {
  const ctx = new AudioContext();
  void ctx.resume(); // some browsers create the context suspended even inside a click
  const master = ctx.createGain();
  master.gain.value = volume;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 2200;
  master.connect(lp).connect(ctx.destination);
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  // vinyl crackle bed
  const crackle = ctx.createBufferSource(); crackle.buffer = noise; crackle.loop = true;
  const cg = ctx.createGain(); cg.gain.value = 0.012; crackle.connect(cg).connect(master); crackle.start();

  const beat = 60 / 78 / 2; // 78 bpm, 8th notes
  let step = 0; let next = ctx.currentTime + 0.1;
  const env = (g: GainNode, t: number, peak: number, dur: number) => {
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  };
  const tick = () => {
    while (next < ctx.currentTime + 0.3) {
      const t = next; const s = step % 16; const bar = Math.floor(step / 16) % 4;
      if (s === 0 || s === 7 || s === 10) { // kick
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.15);
        env(g, t, 0.5, 0.3); o.connect(g).connect(master); o.start(t); o.stop(t + 0.3);
      }
      if (s === 4 || s === 12) { // snare
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 1800;
        const g = ctx.createGain(); env(g, t, 0.18, 0.18); n.connect(f).connect(g).connect(master); n.start(t, Math.random() * 0.5); n.stop(t + 0.2);
      }
      { // hat, swung
        const n = ctx.createBufferSource(); n.buffer = noise; const f = ctx.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 7000;
        const g = ctx.createGain(); const tt = t + (s % 2 ? beat * 0.18 : 0); env(g, tt, s % 2 ? 0.03 : 0.05, 0.05);
        n.connect(f).connect(g).connect(master); n.start(tt, Math.random() * 0.5); n.stop(tt + 0.06);
      }
      if (s === 0) { // chord pad
        for (const m of CHORDS[bar]!) {
          const o = ctx.createOscillator(); o.type = "triangle"; o.frequency.value = hz(m); o.detune.value = Math.random() * 10 - 5;
          const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + 0.4); g.gain.linearRampToValueAtTime(0.0001, t + beat * 16);
          o.connect(g).connect(master); o.start(t); o.stop(t + beat * 16);
        }
        const b = ctx.createOscillator(); b.type = "sine"; b.frequency.value = hz(CHORDS[bar]![0]! - 24);
        const bg = ctx.createGain(); env(bg, t, 0.22, beat * 6); b.connect(bg).connect(master); b.start(t); b.stop(t + beat * 6);
      }
      next += beat; step++;
    }
  };
  const timer = window.setInterval(tick, 50);
  return { ctx, master, timer };
}

export function ShackRadio({ trigger }: { trigger: number }) {
  const [on, setOn] = useState(false);
  const [vol, setVol] = useState(0.5);
  const eng = useRef<Engine | null>(null);
  useEffect(() => { const v = Number(localStorage.getItem(KEY)); if (v > 0 && v <= 1) setVol(v); }, []);
  const stop = () => { if (eng.current) { clearInterval(eng.current.timer); void eng.current.ctx.close(); eng.current = null; } setOn(false); };
  const play = () => {
    if (!eng.current) eng.current = start(vol * 0.6);
    if (eng.current.ctx.state === "suspended") void eng.current.ctx.resume();
    setOn(true);
  };
  useEffect(() => { if (trigger > 0) play(); }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => stop(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { localStorage.setItem(KEY, String(vol)); if (eng.current) eng.current.master.gain.value = vol * 0.6; }, [vol]);
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
