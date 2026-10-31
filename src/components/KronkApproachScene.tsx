import { useEffect, useRef, useState } from "react";
import bg from "@/assets/kronk-approach.png.asset.json";
import { CharacterSprite } from "@/components/CharacterSprite";
import { speak, voicesOn } from "@/lib/voice";

/** Kronk Approach: the crew's first look at Kronk's toxic works. Editor-only for now — no story road leads here yet. */
type Zig = "Oz" | "Brix" | "Lowkey";
type Line = { who: Zig; text: string };

const FLOOR = 34; // the dirt road between the pipeline and the sludge pool (% from bottom)
const INTRO: Line[] = [
  { who: "Oz", text: "Look at that tank up there… tell me that's just a really ugly shadow." },
  { who: "Lowkey", text: "Kronk. Shelton said that name like it was a curse." },
  { who: "Oz", text: "Okay. I'm scared. I'm saying it out loud. I'm properly scared." },
  { who: "Brix", text: "Me too. But look at the water. He's pumping that green straight into the land." },
  { who: "Lowkey", text: "Everything downstream dies. That's our river next." },
  { who: "Brix", text: "Then we don't run. We learn how he works, and we stop him." },
];
const SPOTS: { id: string; label: string; x: number; y: number; lines: Line[] }[] = [
  { id: "tank", label: "THE TANK", x: 86, y: 20, lines: [{ who: "Oz", text: "It moved. The shadow moved. I'm not imagining that." }, { who: "Lowkey", text: "He's watching the road." }] },
  { id: "banner", label: "RAT BANNER", x: 7, y: 47, lines: [{ who: "Brix", text: "A rat with a crown. Somebody thinks a lot of himself." }] },
  { id: "pipe", label: "DRAIN PIPE", x: 43, y: 50, lines: [{ who: "Lowkey", text: "Don't touch the green. Whatever it is, it's killing the water." }] },
  { id: "gate", label: "BUNKER GATE", x: 88, y: 43, lines: [{ who: "Brix", text: "Reinforced. Not today, lads. We need a plan first." }, { who: "Oz", text: "Agreed. A big, sensible plan. Far away from here." }] },
];

export function KronkApproachScene() {
  const [pos, setPos] = useState<Record<Zig, number>>({ Brix: 22, Oz: 30, Lowkey: 38 });
  const [moving, setMoving] = useState<Partial<Record<Zig, { dir: "left" | "right"; ms: number }>>>({});
  const [steer, setSteer] = useState<Zig | null>(null);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [step, setStep] = useState(0);
  const lastTap = useRef<{ a: Zig; t: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (step >= INTRO.length) return;
    const line = INTRO[step]!;
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    void speak(line.who, line.text, () => { if (live) setBubble(line); }).then(() => {
      if (!live) return;
      t = setTimeout(() => setStep(s => s + 1), voicesOn() ? 350 : Math.max(0, 3400 - (performance.now() - started)));
    });
    return () => { live = false; if (t) clearTimeout(t); };
  }, [step]);

  // Like the Three Eggs scene: unsteered Zigs drift along the road on their own, glancing at the tank.
  const posRef = useRef(pos); posRef.current = pos;
  const steerRef = useRef(steer); steerRef.current = steer;
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wander = (a: Zig) => {
      timers.push(setTimeout(() => {
        if (steerRef.current !== a) walkTo(a, 10 + Math.random() * 75);
        wander(a);
      }, 2500 + Math.random() * 4000));
    };
    (["Brix", "Oz", "Lowkey"] as Zig[]).forEach(wander);
    return () => timers.forEach(clearTimeout);
  }, []);
  function walkTo(a: Zig, x: number) {
    const dx = x - posRef.current[a], ms = Math.max(300, Math.abs(dx) * 90);
    setMoving(m => ({ ...m, [a]: { dir: dx < 0 ? "left" : "right", ms } }));
    setPos(p => ({ ...p, [a]: x }));
    setTimeout(() => setMoving(m => (m[a]?.ms === ms ? { ...m, [a]: undefined } : m)), ms);
  }

  async function inspect(lines: Line[]) {
    if (busy.current || step < INTRO.length) return;
    busy.current = true;
    for (const l of lines) {
      const started = performance.now();
      await speak(l.who, l.text, () => setBubble(l));
      if (!voicesOn()) await new Promise(r => setTimeout(r, Math.max(0, 3000 - (performance.now() - started))));
    }
    busy.current = false;
  }

  const tapZig = (a: Zig) => {
    const now = performance.now(), l = lastTap.current;
    if (l && l.a === a && now - l.t < 380) { lastTap.current = null; setSteer(s => (s === a ? null : a)); }
    else lastTap.current = { a, t: now };
  };
  const onGround = (e: React.PointerEvent<HTMLDivElement>) => {
    const tg = e.target as Element | null;
    if (!steer || !wrapRef.current || tg?.closest?.("button,.haven-zig")) return;
    const r = wrapRef.current.getBoundingClientRect();
    const x = Math.min(92, Math.max(6, ((e.clientX - r.left) / r.width) * 100));
    walkTo(steer, x);
  };

  return <div ref={wrapRef} className="world-image-wrap prologue-scene haven-scene kronk-approach" onPointerDown={onGround}>
    <img className="world-image" src={bg.url} alt="Kronk's toxic works: rusted pipes spill green sludge beneath a smoking factory fortress, Kronk's silhouette glowing in a giant tank" />
    <div className="haven-layer">
      {(["Brix", "Oz", "Lowkey"] as Zig[]).map(z => { const m = moving[z]; return <span key={z} className={`haven-zig marker-${z.toLowerCase()} ${m ? `is-walking ${z.toLowerCase()}-facing-${m.dir} facing-${m.dir}` : ""} ${steer === z ? "is-controlled" : ""}`} style={{ left: `${pos[z]}%`, bottom: `${FLOOR}%`, transitionDuration: m ? `${m.ms}ms` : "0ms" }} onPointerDown={e => { e.stopPropagation(); tapZig(z); }} role="button" aria-label={`${z} — double-tap to steer`}>{steer === z && <span className="ctrl-ring" aria-hidden="true"/>}<span className="sprite-stage"><CharacterSprite character={z}/></span></span>; })}
      {step >= INTRO.length && SPOTS.map(s => <button key={s.id} type="button" className="kronk-spot" style={{ left: `${s.x}%`, top: `${s.y}%` }} onPointerDown={e => e.stopPropagation()} onClick={() => void inspect(s.lines)} aria-label={`Inspect ${s.label.toLowerCase()}`}><span>{s.label}</span></button>)}
      {bubble && <div key={bubble.text} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, pos[bubble.who]))}%`, top: "auto", bottom: `calc(${FLOOR}% + 70px)` }}><b>{bubble.who.toUpperCase()}</b>{bubble.text}</div>}
    </div>
    <div className="map-coordinate top-right">KRONK APPROACH</div>
    {steer && <div className="combat-hint" aria-hidden="true">Steering {steer} · click the road to walk · double-tap {steer} to let go</div>}
  </div>;
}
