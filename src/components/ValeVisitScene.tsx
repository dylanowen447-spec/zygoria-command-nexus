import { useEffect, useState } from "react";
import bg from "@/assets/sanctuary-clear.webp";
import valeImg from "@/assets/haven-vale.webp";
import { CharacterSprite } from "@/components/CharacterSprite";
import { speak, voicesOn } from "@/lib/voice";

type Who = "Vale" | "Oz" | "Brix" | "Lowkey";
type Line = { who: Who; text: string };
const X: Record<Who, number> = { Brix: 22, Oz: 34, Vale: 50, Lowkey: 64 };

/** Vale's first sight of the surface: wonder, hope, and Kronk's smoke on the horizon. */
const LINES: Line[] = [
  { who: "Vale", text: "Is that… the sky? Nobody told me it MOVES!" },
  { who: "Oz", text: "Clouds, mate. They do that. You get used to it." },
  { who: "Vale", text: "The water's clear. I can see the bottom! Underground it's all black." },
  { who: "Brix", text: "We built every plank of this place. Took ages." },
  { who: "Vale", text: "Real houses. A fire that isn't hiding. Wait till Mara sees this." },
  { who: "Lowkey", text: "See that smoke over the ridge? Green at the edges. That's Kronk's refinery." },
  { who: "Vale", text: "Kronk. Elder Orin says that name like a curse." },
  { who: "Brix", text: "He's poisoning the land, bit by bit. One day he'll reach this river." },
  { who: "Vale", text: "So this place is hope… but it isn't safe yet. My people aren't ready." },
  { who: "Lowkey", text: "Then we keep it safe till they are." },
  { who: "Vale", text: "Take me home? I have to tell them everything." },
];

export function ValeVisitScene({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const [bubble, setBubble] = useState<Line | null>(null);
  const done = step >= LINES.length;
  useEffect(() => {
    if (done) return;
    const line = LINES[step]!;
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    void speak(line.who, line.text, () => { if (live) setBubble(line); }).then(() => {
      if (!live) return;
      setBubble(line);
      const rest = voicesOn() ? 450 : Math.max(0, 3600 - (performance.now() - started));
      t = setTimeout(() => setStep(s => s + 1), rest);
    });
    return () => { live = false; if (t) clearTimeout(t); };
  }, [step, done]);

  return <div className="world-image-wrap prologue-scene haven-scene vale-visit">
    <img className="world-image" src={bg} alt="Vale's first look at the Riverside Sanctuary under an open sky" />
    <div className="haven-layer">
      {(["Brix", "Oz", "Lowkey"] as const).map(c => <span key={c} className={`haven-zig marker-${c.toLowerCase()}`} style={{ left: `${X[c]}%`, bottom: "20%" }}><span className="sprite-stage"><CharacterSprite character={c}/></span></span>)}
      <span className="haven-human" style={{ left: `${X.Vale}%`, height: "18%" }}><img src={valeImg} alt="Vale" draggable={false}/><span className="haven-name">VALE</span></span>
      {bubble && <div key={bubble.text} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, X[bubble.who]))}%`, bottom: `calc(20% + ${bubble.who === "Vale" ? "var(--human-lift)" : "var(--zig-lift)"} + ${(step % 2) * 22}px)` }}><b>{bubble.who.toUpperCase()}</b>{bubble.text}</div>}
    </div>
    <div className="map-coordinate top-right">RIVERSIDE SANCTUARY</div>
    <div className="quest-objective">◆ Show Vale the Sanctuary</div>
    {done && <button type="button" className="workshop-spot workshop-door quest-go" onClick={onDone}><span>Take Vale home ›</span></button>}
  </div>;
}
