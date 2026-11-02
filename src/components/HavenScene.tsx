import { voiceLine, speak, voicesOn } from "@/lib/voice";
import { useEffect, useRef, useState } from "react";
import bg from "@/assets/haven-bg.webp";
import orinImg from "@/assets/haven-orin.webp";
import maraImg from "@/assets/haven-mara.webp";
import valeImg from "@/assets/haven-vale.webp";
import { CharacterSprite } from "@/components/CharacterSprite";
import { talkToSurvivor } from "@/lib/job-planning.functions";
import { DISTRUST_MS, QUEST_OBJECTIVE, advanceQuest, loadQuest, type QuestStage } from "@/lib/quest-first-signs";

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

/** Orin's wall of distrust: spread across the first minutes after contact. */
const DISTRUST: Line[] = [
  { who: "Orin", text: "Three strange creatures walk out of a sealed tunnel talking about sunlight. Do you take me for a fool?" },
  { who: "Lowkey", text: "We don't want anything. We just found you." },
  { who: "Orin", text: "Everything from above wants something. That's how we ended up down here." },
  { who: "Brix", text: "Fair. I wouldn't trust us either." },
  { who: "Orin", text: "Mara, keep the children by the wheel. Don't let them near these… things." },
  { who: "Oz", text: "Things?! I've got a NAME. It's Oz. It's a great name." },
  { who: "Orin", text: "Names are cheap, Oz. Sealed doors are what keep us breathing." },
  { who: "Orin", text: "You say there's clean water up there. Kronk's poison is up there. I've seen it." },
];
const HUNGER: Line[] = [
  { who: "Mara", text: "Orin… the stores. Three days of moss left, if we're careful." },
  { who: "Orin", text: "Not in front of them, Mara." },
  { who: "Vale", text: "I'm hungry, Elder. We're all hungry. Everyone knows it." },
  { who: "Oz", text: "Wait. You're starving? We've got a river FULL of fish up top!" },
  { who: "Orin", text: "Bring us food that isn't poison, and perhaps I'll listen." },
  { who: "Lowkey", text: "Then we fish. We'll be back." },
];
const HANDOVER: Line[] = [
  { who: "Oz", text: "Special delivery! Two fish, fresh from the river." },
  { who: "Mara", text: "They're… clean. No green in the gills. Orin, look." },
  { who: "Vale", text: "It smells like… I don't even know what it smells like!" },
  { who: "Orin", text: "…You fed my people when you had no reason to." },
  { who: "Orin", text: "One journey, Vale. You stay by their side. If this is real… our people have a future." },
  { who: "Vale", text: "I'm going UP? Up-up? Where the sky is?!" },
  { who: "Brix", text: "Not a hair on his head harmed. You've got my word." },
];
const RETURN: Line[] = [
  { who: "Vale", text: "Elder! Mara! There's a SKY! It's enormous and it doesn't drip!" },
  { who: "Mara", text: "You're back. You're whole. Oh, Vale." },
  { who: "Vale", text: "The water's clear all the way down. You can see the stones!" },
  { who: "Vale", text: "But Kronk's smoke is up there too. Green. Right across the hills." },
  { who: "Orin", text: "Then the surface is hope and danger both. We're not ready to leave. Not yet." },
  { who: "Orin", text: "But we are ready to believe. Thank you, Zigs." },
  { who: "Lowkey", text: "Whenever you're ready. We'll be up there." },
];

export function HavenScene({ onAscend }: { onAscend?: () => void } = {}) {
  const [quest, setQuest] = useState<QuestStage>(() => loadQuest());
  const [script, setScript] = useState<Line[]>(() => quest === "fish" ? [...INTRO, ...HANDOVER] : quest === "vale-home" ? RETURN : INTRO);
  const [valeReady, setValeReady] = useState(false);
  const [step, setStep] = useState(0);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [target, setTarget] = useState<Survivor>("Orin");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const history = useRef<string[]>([]);
  const introDone = step >= script.length;
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
  // Intro lines appear when their voice starts and move on when it ends.
  useEffect(() => { if (bubble && introDone) voiceLine(bubble.who, bubble.text); }, [bubble, introDone]);
  const xOf = (w: Speaker) => (w === "Oz" || w === "Brix" || w === "Lowkey" ? pos[w].x : X[w]);

  useEffect(() => {
    if (introDone) return;
    const line = script[step]!;
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    void speak(line.who, line.text, () => { if (live) setBubble(line); }).then(() => {
      if (!live) return;
      const rest = voicesOn() ? 350 : Math.max(0, 3600 - (performance.now() - started));
      t = setTimeout(() => setStep(s => s + 1), rest);
    });
    return () => { live = false; if (t) clearTimeout(t); };
  }, [step, introDone, script]);

  // Quest beats once the current script runs out.
  const distrustStarted = useRef(false);
  useEffect(() => {
    if (!introDone) return;
    if (quest === "fish") setValeReady(true);
    else if (quest === "vale-home") setQuest(advanceQuest("done"));
    else if (quest === "none" && !distrustStarted.current) {
      distrustStarted.current = true;
      const gap = DISTRUST_MS / (DISTRUST.length + 1);
      const ts = DISTRUST.map((l, i) => setTimeout(() => setScript(s => [...s, l]), gap * (i + 1)));
      ts.push(setTimeout(() => { setScript(s => [...s, ...HUNGER]); setQuest(advanceQuest("hungry")); }, DISTRUST_MS));
      return () => { ts.forEach(clearTimeout); distrustStarted.current = false; };
    }
    return undefined;
  }, [introDone, quest]);
  const objective = QUEST_OBJECTIVE[quest];

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
      {SURVIVORS.filter(s => !(s.id === "Vale" && quest === "vale-up")).map(s => <button key={s.id} type="button" className={`haven-human ${target === s.id ? "is-target" : ""}`} style={{ left: `${s.x}%`, height: `${s.h}%` }} onClick={() => setTarget(s.id)} aria-label={`Talk to ${s.name}`}>
        <img src={s.img} alt="" draggable={false}/><span className="haven-name">{s.name}</span>
      </button>)}
      {bubble && <div key={bubble.text} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, xOf(bubble.who)))}%`, bottom: `calc(20% + ${bubble.who === "Oz" || bubble.who === "Brix" || bubble.who === "Lowkey" ? "var(--zig-lift)" : "var(--human-lift)"} + ${(step % 2) * 22}px)` }}><b>{bubble.who === "Orin" ? "ELDER ORIN" : bubble.who.toUpperCase()}</b>{bubble.text}</div>}
    </div>
    <div className="map-coordinate top-right">UNDERGROUND HAVEN</div>
    {objective && quest !== "fish" && introDone && <div className="quest-objective">◆ {quest === "hungry" ? "Catch fish at the Sanctuary and bring it down" : objective}</div>}
    {valeReady && onAscend && <button type="button" className="workshop-spot workshop-door quest-go" onPointerDown={e => e.stopPropagation()} onClick={() => { setQuest(advanceQuest("vale-up")); onAscend(); }}><span>Climb to the Sanctuary with Vale ›</span></button>}
    {steer && <div className="combat-hint" aria-hidden="true">Steering {steer} · click the floor to walk · double-tap {steer} to let go</div>}
    {introDone && <form className="haven-talk" onSubmit={send}>
      <span>Talking to {target === "Orin" ? "Elder Orin" : target} — tap someone to switch</span>
      <input value={text} maxLength={180} onChange={e => setText(e.target.value)} placeholder={`Say something to ${target === "Orin" ? "Elder Orin" : target}…`} disabled={busy}/>
      <button type="submit" disabled={busy || !text.trim()}>{busy ? "…" : "Say"}</button>
    </form>}
  </div>;
}
