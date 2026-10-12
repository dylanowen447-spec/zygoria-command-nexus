import { useEffect, useRef, useState } from "react";
import bg from "@/assets/haven-bg.webp";
import orinImg from "@/assets/haven-orin.webp";
import maraImg from "@/assets/haven-mara.webp";
import valeImg from "@/assets/haven-vale.webp";
import { CharacterSprite } from "@/components/CharacterSprite";
import { talkToSurvivor } from "@/lib/job-planning.functions";

type Survivor = "Orin" | "Mara" | "Vale";
type Speaker = Survivor | "Oz" | "Brix" | "Lowkey";
type Line = { who: Speaker; text: string };

const SURVIVORS: { id: Survivor; name: string; img: string; x: number; h: number }[] = [
  { id: "Vale", name: "VALE", img: valeImg, x: 60, h: 30 },
  { id: "Mara", name: "MARA", img: maraImg, x: 72, h: 31 },
  { id: "Orin", name: "ELDER ORIN", img: orinImg, x: 85, h: 32 },
];
const CREW: { id: "Oz" | "Brix" | "Lowkey"; x: number }[] = [{ id: "Brix", x: 18 }, { id: "Oz", x: 26 }, { id: "Lowkey", x: 33 }];
const X: Record<Speaker, number> = { Vale: 60, Mara: 72, Orin: 85, Brix: 18, Oz: 26, Lowkey: 33 };

/** First contact, one voice at a time: neither side has ever seen anyone else. */
const INTRO: Line[] = [
  { who: "Vale", text: "Mara. Mara! Something just walked out of the dark tunnel." },
  { who: "Oz", text: "…Are those PEOPLE? Actual people? Down here?" },
  { who: "Mara", text: "Stay behind me, Vale. We don't know what they are." },
  { who: "Lowkey", text: "Easy. They're more scared of us than we are of them." },
  { who: "Brix", text: "That waterwheel's hand-built. Somebody here knows what they're doing." },
  { who: "Vale", text: "They came from above. Nothing comes from above. Nothing alive." },
  { who: "Orin", text: "Lower your hands, Mara. If they meant harm, they'd not have stopped to stare." },
  { who: "Orin", text: "Come closer, strangers. Slowly. Tell us what you are." },
];

export function HavenScene() {
  const [step, setStep] = useState(0);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [target, setTarget] = useState<Survivor>("Orin");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<string[]>([]);
  const introDone = step >= INTRO.length;

  useEffect(() => {
    if (introDone) return;
    const line = INTRO[step]!;
    setBubble(line);
    const t = setTimeout(() => setStep(s => s + 1), 3600);
    return () => clearTimeout(t);
  }, [step, introDone]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const said = text.trim();
    if (!said || busy || !introDone) return;
    setBusy(true); setText("");
    try {
      const r = await talkToSurvivor({ data: { survivor: target, said, history: history.current.slice(-6) } });
      history.current.push(`Visitor to ${target}: ${said}`, `${target}: ${r.reply}`);
      setBubble({ who: target, text: r.reply });
    } catch (err) {
      setBubble({ who: target, text: err instanceof Error ? err.message : "…" });
    } finally { setBusy(false); }
  }

  return <div className="world-image-wrap prologue-scene haven-scene">
    <img className="world-image" src={bg} alt="The Underground Haven: a lantern-lit human refuge deep in a cavern" />
    <div className="haven-layer">
      {CREW.map(c => <span key={c.id} className="haven-zig" style={{ left: `${c.x}%` }}><span className="sprite-stage"><CharacterSprite character={c.id}/></span></span>)}
      {SURVIVORS.map(s => <button key={s.id} type="button" className={`haven-human ${target === s.id ? "is-target" : ""}`} style={{ left: `${s.x}%`, height: `${s.h}%` }} onClick={() => setTarget(s.id)} aria-label={`Talk to ${s.name}`}>
        <img src={s.img} alt="" draggable={false}/><span className="haven-name">{s.name}</span>
      </button>)}
      {bubble && <div key={bubble.text} className="haven-bubble" style={{ left: `${X[bubble.who]}%` }}><b>{bubble.who === "Orin" ? "ELDER ORIN" : bubble.who.toUpperCase()}</b>{bubble.text}</div>}
    </div>
    <div className="map-coordinate top-right">UNDERGROUND HAVEN</div>
    {introDone && <form className="haven-talk" onSubmit={send}>
      <span>Talking to {target === "Orin" ? "Elder Orin" : target} — tap someone to switch</span>
      <input value={text} maxLength={180} onChange={e => setText(e.target.value)} placeholder={`Say something to ${target === "Orin" ? "Elder Orin" : target}…`} disabled={busy}/>
      <button type="submit" disabled={busy || !text.trim()}>{busy ? "…" : "Say"}</button>
    </form>}
  </div>;
}
