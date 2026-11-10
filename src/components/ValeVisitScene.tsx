import { useEffect, useState } from "react";
import bg from "@/assets/sanctuary-clear.webp";
import valeImg from "@/assets/haven-vale.webp";
import { CharacterSprite } from "@/components/CharacterSprite";
import { speak, voicesOn, stopVoice } from "@/lib/voice";
import { WATERFALL_REVEAL, EXPLORING, KRONK_THREAT, HEADING_BACK, type DLine } from "@/lib/vale-dialogue";

type Who = "Vale" | "Oz" | "Brix" | "Lowkey";
type Line = DLine & { who: Who };
const X: Record<Who, number> = { Brix: 22, Oz: 34, Vale: 50, Lowkey: 64 };

/** Vale's surface visit: the waterfall reveal, exploring the camp, the Kronk warning, then heading home. */
const LINES = [...WATERFALL_REVEAL, ...EXPLORING, ...KRONK_THREAT, ...HEADING_BACK] as Line[];

export function ValeVisitScene({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [night, setNight] = useState(false);
  const done = step >= LINES.length;
  useEffect(() => {
    if (done) return;
    const line = LINES[step]!;
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    void speak(line.who, line.text, () => { if (live) setBubble(line); }).then(() => {
      if (!live) return;
      setBubble(line);
      const rest = (voicesOn() ? 450 : Math.max(0, 3600 - (performance.now() - started))) + (line.pause ?? 0);
      t = setTimeout(() => setStep(s => s + 1), rest);
    });
    return () => { live = false; if (t) clearTimeout(t); };
  }, [step, done]);

  return <div className="world-image-wrap prologue-scene haven-scene vale-visit">
    <img className="world-image" src={bg} alt="Vale's first look at the Riverside Sanctuary under an open sky" />
    <div className="haven-layer">
      {(["Brix", "Oz", "Lowkey"] as const).map(c => <span key={c} className={`haven-zig marker-${c.toLowerCase()}`} style={{ left: `${X[c]}%`, bottom: "20%" }}><span className="sprite-stage"><CharacterSprite character={c}/></span></span>)}
      <span className="haven-human" style={{ left: `${X.Vale}%`, height: "18%" }}><img src={valeImg} alt="Vale" draggable={false}/><span className="haven-name">VALE</span></span>
      {bubble && <div key={bubble.text} className="haven-bubble" role="button" title="Tap to continue" onPointerDown={() => { if (!done) stopVoice(); }} style={{ left: `${Math.min(80, Math.max(20, X[bubble.who]))}%`, bottom: `calc(20% + ${bubble.who === "Vale" ? "var(--human-lift)" : "var(--zig-lift)"} + ${(step % 2) * 22}px)` }}><b>{bubble.who.toUpperCase()}</b>{bubble.text}</div>}
    </div>
    <div className="map-coordinate top-right">RIVERSIDE SANCTUARY</div>
    <div className="quest-objective">◆ Show Vale the Sanctuary</div>
    {done && !night && <button type="button" className="workshop-spot workshop-door quest-go" onClick={() => setNight(true)}><span>Rest for the night ›</span></button>}
    {night && <div className="vale-night" role="dialog" aria-label="The next morning">
      <span className="prologue-card-eyebrow">THE NEXT MORNING</span>
      <strong>Vale slept under the open sky for the first time in his life.</strong>
      <p>At first light he's packed and ready — the Haven needs to hear the news.</p>
      <button type="button" className="workshop-spot workshop-door quest-go" onClick={onDone}><span>Take Vale home to report ›</span></button>
    </div>}
  </div>;
}
