import { useEffect, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import walkImg from "@/assets/zone-long-walk.jpg";
import type { Agent } from "@/lib/zones";

/** Short scripted transition: the crew settle by the river and build the first Sanctuary. Client-only, no AI calls. */
const BEATS: { who: Agent | null; text: string; sound?: "hammer" | "saw" | "thud" | "spark" }[] = [
  { who: "Brix", text: "Yeah… this looks like the place. Let's build our home." },
  { who: "Oz", text: "I'll grab the light stuff. And the heavy stuff. Some of it.", sound: "thud" },
  { who: "Lowkey", text: "I'll keep watch. Nothing's moving out there.", },
  { who: "Brix", text: "Wood here. Salvage there. Mind your fingers.", sound: "saw" },
  { who: "Oz", text: "Little Spark for the stubborn bits…", sound: "spark" },
  { who: null, text: "Day by day, plank by plank…", sound: "hammer" },
];

function playSound(ctx: AudioContext, kind: string) {
  const t0 = ctx.currentTime;
  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const burst = (t: number, freq: number, dur: number, vol: number, type: BiquadFilterType = "bandpass") => {
    const n = ctx.createBufferSource(); n.buffer = noise;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    n.connect(f).connect(g).connect(ctx.destination); n.start(t, Math.random() * 0.5); n.stop(t + dur + 0.02);
  };
  const knock = (t: number, freq: number, vol: number) => {
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 0.2);
  };
  if (kind === "hammer") for (let i = 0; i < 8; i++) { const t = t0 + i * 0.42 + (i > 3 ? 0.6 : 0); knock(t, 420, 0.35); burst(t, 2500, 0.05, 0.25); }
  if (kind === "saw") for (let i = 0; i < 6; i++) burst(t0 + i * 0.32, i % 2 ? 1400 : 1900, 0.28, 0.12);
  if (kind === "thud") for (let i = 0; i < 3; i++) { const t = t0 + i * 0.7; knock(t, 110, 0.5); burst(t, 300, 0.25, 0.15, "lowpass"); }
  if (kind === "spark") for (let i = 0; i < 10; i++) burst(t0 + i * 0.06 + Math.random() * 0.05, 5000, 0.04, 0.12, "highpass");
}

export function BuildInterlude({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [fade, setFade] = useState(false);
  useEffect(() => {
    let ctx: AudioContext | null = null;
    try { ctx = new (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)(); void ctx.resume(); } catch { /* silent fallback */ }
    const timers: ReturnType<typeof setTimeout>[] = [];
    BEATS.forEach((b, i) => timers.push(setTimeout(() => { setStep(i); if (b.sound && ctx) playSound(ctx, b.sound); if (i === BEATS.length - 1) setFade(true); }, i * 2800)));
    timers.push(setTimeout(() => { if (ctx) playSound(ctx, "hammer"); }, BEATS.length * 2800 - 1200));
    timers.push(setTimeout(onDone, BEATS.length * 2800 + 2200));
    return () => { timers.forEach(clearTimeout); void ctx?.close(); };
  }, [onDone]);
  const beat = BEATS[step]!;
  return <div className="world-image-wrap prologue-scene build-interlude">
    <img className="world-image" src={walkImg} width={1520} height={1024} alt="The crew settle on flat green ground by the river" />
    <div className="world-vignette"/>
    <div className="map-coordinate top-right">CHAPTER 04 · FINDING HOME</div>
    <div className="build-crew">
      {(["Lowkey", "Brix", "Oz"] as Agent[]).map(a => <div key={a} className={`build-zig build-${a.toLowerCase()} ${beat.who === a ? "is-speaking" : ""} ${a !== "Lowkey" && step > 0 && !fade ? "is-working" : ""}`}>
        {beat.who === a && <span className="idle-bubble">{beat.text}</span>}
        <span className="sprite-stage"><CharacterSprite character={a}/></span>
      </div>)}
    </div>
    <div className={`build-fade ${fade ? "is-on" : ""}`}><span>{fade ? beat.text : ""}</span><em>{fade ? "…until the Sanctuary stood." : ""}</em></div>
    <button type="button" className="prologue-skip" onClick={onDone}>Skip ›</button>
  </div>;
}
