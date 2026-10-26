import { voiceLine } from "@/lib/voice";
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

const FLOOR = 20; // shared flat ground line (% from bottom)
const SURVIVORS: { id: Survivor; name: string; img: string; x: number; h: number }[] = [
  { id: "Vale", name: "VALE", img: valeImg, x: 62, h: 18 },
  { id: "Mara", name: "MARA", img: maraImg, x: 74, h: 19 },
  { id: "Orin", name: "ELDER ORIN", img: orinImg, x: 86, h: 19.5 },
];
const CREW: { id: "Oz" | "Brix" | "Lowkey"; x: number }[] = [{ id: "Brix", x: 14 }, { id: "Oz", x: 24 }, { id: "Lowkey", x: 34 }];
const X: Record<Speaker, number> = { Vale: 62, Mara: 74, Orin: 86, Brix: 14, Oz: 24, Lowkey: 34 };

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
  // Double-click a Zig to steer them; clicking the cave floor walks that Zig there.
  type Zig = "Oz" | "Brix" | "Lowkey";
  const [pos, setPos] = useState<Record<Zig, { x: number; b: number }>>({ Brix: { x: 14, b: FLOOR }, Oz: { x: 24, b: FLOOR }, Lowkey: { x: 34, b: FLOOR } });
  const [steer, setSteer] = useState<Zig | null>(null);
  const [moving, setMoving] = useState<{ a: Zig; dir: "left" | "right" | "up" | "down"; ms: number } | null>(null);
  const lastTap = useRef<{ a: Zig; t: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const tapZig = (a: Zig) => {
    const now = performance.now(), l = lastTap.current;
    if (l && l.a === a && now - l.t < 380) { lastTap.current = null; setSteer(s => (s === a ? null : a)); }
    else lastTap.current = { a, t: now };
  };
  const onGround = (e: React.PointerEvent<HTMLDivElement>) => {
    const tg = e.target as Element | null;
    if (!steer || !wrapRef.current || (tg && typeof tg.closest === "function" && tg.closest("button,form,.haven-zig"))) return;
    const r = wrapRef.current.getBoundingClientRect();
    let x = Math.min(92, Math.max(6, ((e.clientX - r.left) / r.width) * 100));
    const b = FLOOR; // walk flat along the cave floor
    // Collisions: stop short of other Zigs and the survivors instead of walking through them.
    const others = [...(Object.keys(pos) as Zig[]).filter(z => z !== steer).map(z => pos[z].x), ...SURVIVORS.map(s => s.x)];
    const from0 = pos[steer].x, goingRight = x > from0;
    let xx = x;
    for (const o of others) { if (goingRight ? o > from0 && o - 6 < xx : o < from0 && o + 6 > xx) xx = goingRight ? o - 6 : o + 6; }
    x = Math.min(92, Math.max(6, xx));
    const from = pos[steer], dx = x - from.x;
    const ms = Math.max(300, Math.abs(dx) * 90);
    const dir = dx < 0 ? "left" : "right";
    const a = steer;
    setMoving({ a, dir, ms });
    setPos(p => ({ ...p, [a]: { x, b } }));
    setTimeout(() => setMoving(m => (m && m.a === a && m.ms === ms ? null : m)), ms);
  };
  useEffect(() => { if (bubble) voiceLine(bubble.who, bubble.text); }, [bubble]);
  const xOf = (w: Speaker) => (w === "Oz" || w === "Brix" || w === "Lowkey" ? pos[w].x : X[w]);

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

  return <div ref={wrapRef} className="world-image-wrap prologue-scene haven-scene" onPointerDown={onGround}>
    <img className="world-image" src={bg} alt="The Underground Haven: a lantern-lit human refuge deep in a cavern" />
    <div className="haven-layer">
      {CREW.map(c => { const m = moving?.a === c.id ? moving : null; return <span key={c.id} className={`haven-zig marker-${c.id.toLowerCase()} ${m ? `is-walking ${c.id.toLowerCase()}-facing-${m.dir} facing-${m.dir}` : ""} ${steer === c.id ? "is-controlled" : ""}`} style={{ left: `${pos[c.id].x}%`, bottom: `${pos[c.id].b}%`, transitionDuration: m ? `${m.ms}ms` : "0ms" }} onPointerDown={e => { e.stopPropagation(); tapZig(c.id); }} role="button" aria-label={`${c.id} — double-tap to steer`}>{steer === c.id && <span className="ctrl-ring" aria-hidden="true"/>}<span className="sprite-stage"><CharacterSprite character={c.id}/></span></span>; })}
      {SURVIVORS.map(s => <button key={s.id} type="button" className={`haven-human ${target === s.id ? "is-target" : ""}`} style={{ left: `${s.x}%`, height: `${s.h}%` }} onClick={() => setTarget(s.id)} aria-label={`Talk to ${s.name}`}>
        <img src={s.img} alt="" draggable={false}/><span className="haven-name">{s.name}</span>
      </button>)}
      {bubble && <div key={bubble.text} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, xOf(bubble.who)))}%`, bottom: `calc(20% + ${bubble.who === "Oz" || bubble.who === "Brix" || bubble.who === "Lowkey" ? "var(--zig-lift)" : "var(--human-lift)"} + ${(step % 2) * 22}px)` }}><b>{bubble.who === "Orin" ? "ELDER ORIN" : bubble.who.toUpperCase()}</b>{bubble.text}</div>}
    </div>
    <div className="map-coordinate top-right">UNDERGROUND HAVEN</div>
    {steer && <div className="combat-hint" aria-hidden="true">Steering {steer} · click the floor to walk · double-tap {steer} to let go</div>}
    {introDone && <form className="haven-talk" onSubmit={send}>
      <span>Talking to {target === "Orin" ? "Elder Orin" : target} — tap someone to switch</span>
      <input value={text} maxLength={180} onChange={e => setText(e.target.value)} placeholder={`Say something to ${target === "Orin" ? "Elder Orin" : target}…`} disabled={busy}/>
      <button type="submit" disabled={busy || !text.trim()}>{busy ? "…" : "Say"}</button>
    </form>}
  </div>;
}
