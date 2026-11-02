import { useEffect, useRef, useState } from "react";
import bg from "@/assets/kronk-approach.png.asset.json";
import { CharacterSprite } from "@/components/CharacterSprite";
import { speak, voicesOn } from "@/lib/voice";

/** Kronk Approach: the crew's first look at Kronk's toxic works. Editor-only for now — no story road leads here yet. */
type Zig = "Oz" | "Brix" | "Lowkey";
type Line = { who: Zig; text: string };

/** Walkable dirt road traced from the creator's ground guide, in artwork % (x from left, y from top). */
const GROUND: [number, number][] = [[1,66],[17,61],[37,61],[40,57],[80,53],[97,51.5],[97,54],[76,61.5],[88,66],[68,71.5],[36,72.5],[20,81],[1,81]];
type P = { x: number; y: number };
function inside(x: number, y: number) {
  let c = false;
  for (let i = 0, j = GROUND.length - 1; i < GROUND.length; j = i++) {
    const [xi, yi] = GROUND[i]!, [xj, yj] = GROUND[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** Nearest walkable point to a tap (keeps a small margin from the road edge). */
function clampToGround(t: P): P {
  if (inside(t.x, t.y) && inside(t.x, t.y - 1.5) && inside(t.x, t.y + 1.5)) return t;
  let best = t, bd = Infinity;
  for (let x = 2; x <= 96; x += 1) for (let y = 50; y <= 82; y += 0.5) {
    if (!inside(x, y) || !inside(x, y - 1.5) || !inside(x, y + 1.5)) continue;
    const d = (x - t.x) ** 2 + (y - t.y) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
function randomGround(): P {
  for (let i = 0; i < 60; i++) { const p = { x: 12 + Math.random() * 76, y: 54 + Math.random() * 26 }; if (inside(p.x, p.y) && inside(p.x, p.y - 1.5) && inside(p.x, p.y + 1.5)) return p; }
  return { x: 30, y: 68 };
}
const INTRO: Line[] = [
  { who: "Oz", text: "WHOA. Whoa whoa whoa. Guys. GUYS. Look at that tank up there." },
  { who: "Lowkey", text: "That's him, that's the crocodile the humans spoke of. Kronk." },
  { who: "Brix", text: "I hoped he was a story. He's not a story. He's right there." },
  { who: "Oz", text: "He's HUGE. Why is nobody saying how huge he is?!" },
  { who: "Lowkey", text: "Kronk. Now we've seen him, that name feels even worse." },
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
  const [pos, setPos] = useState<Record<Zig, P>>({ Brix: { x: 24, y: 70 }, Oz: { x: 34, y: 67 }, Lowkey: { x: 44, y: 69 } });
  const [moving, setMoving] = useState<Partial<Record<Zig, { dir: "left" | "right"; ms: number }>>>({});
  const [steer, setSteer] = useState<Zig | null>(null);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [step, setStep] = useState(0);
  const lastTap = useRef<{ a: Zig; t: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const walkId = useRef<Partial<Record<Zig, number>>>({});
  const busy = useRef(false);

  useEffect(() => {
    if (step >= INTRO.length) return;
    const line = INTRO[step]!;
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    let advanced = false;
    const next = () => { if (!live || advanced) return; advanced = true; setStep(s => s + 1); };
    // Safety net: if a voice stalls, show the line anyway and move on instead of freezing the scene.
    const guard = setTimeout(() => { if (live) { setBubble(line); t = setTimeout(next, 3400); } }, 6000);
    void speak(line.who, line.text, () => { if (live) setBubble(line); }, 6000).then(() => {
      if (!live) return;
      clearTimeout(guard);
      t = setTimeout(next, voicesOn() ? 350 : Math.max(0, 3400 - (performance.now() - started)));
    });
    return () => { live = false; clearTimeout(guard); if (t) clearTimeout(t); };
  }, [step]);

  // Unsteered Zigs mostly stand and stare at the tank, taking an occasional short stroll (~every 30s each).
  const posRef = useRef(pos); posRef.current = pos;
  const steerRef = useRef(steer); steerRef.current = steer;
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wander = (a: Zig, first = false) => {
      timers.push(setTimeout(() => {
        if (steerRef.current !== a) walkTo(a, randomGround());
        wander(a);
      }, first ? 8000 + Math.random() * 22000 : 26000 + Math.random() * 8000));
    };
    (["Brix", "Oz", "Lowkey"] as Zig[]).forEach(a => wander(a, true));
    return () => timers.forEach(clearTimeout);
  }, []);
  function walkTo(a: Zig, to: P) {
    const from = posRef.current[a], dx = to.x - from.x, ms = Math.max(300, Math.hypot(dx, (to.y - from.y) * 1.4) * 90);
    const id = (walkId.current[a] = (walkId.current[a] ?? 0) + 1), start = performance.now();
    setMoving(m => ({ ...m, [a]: { dir: dx < 0 ? "left" : "right", ms } }));
    // Painted every frame (like the other scenes), so the Zig really walks there instead of jumping.
    const frame = (now: number) => {
      if (walkId.current[a] !== id) return;
      const k = Math.min(1, (now - start) / ms);
      setPos(p => ({ ...p, [a]: { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k } }));
      if (k < 1) requestAnimationFrame(frame);
      else setMoving(m => ({ ...m, [a]: undefined }));
    };
    requestAnimationFrame(frame);
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
    if (!steer || !groundRef.current || tg?.closest?.("button,.haven-zig")) return;
    const r = groundRef.current.getBoundingClientRect();
    walkTo(steer, clampToGround({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }));
  };

  return <div ref={wrapRef} className="world-image-wrap prologue-scene haven-scene kronk-approach" onPointerDown={onGround}>
    <img className="world-image" src={bg.url} alt="Kronk's toxic works: rusted pipes spill green sludge beneath a smoking factory fortress, Kronk's silhouette glowing in a giant tank" />
    <div className="haven-layer">
      <div ref={groundRef} className="kronk-ground">
        {(["Brix", "Oz", "Lowkey"] as Zig[]).map(z => { const m = moving[z], p = pos[z]; return <span key={z} className={`haven-zig marker-${z.toLowerCase()} ${m ? `is-walking ${z.toLowerCase()}-facing-${m.dir} facing-${m.dir}` : ""} ${steer === z ? "is-controlled" : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, ["--depth" as string]: String(Math.min(1.18, Math.max(0.78, 0.8 + (p.y - 50) * 0.01))), zIndex: 5 + Math.round(p.y), transitionDuration: "0ms" }} onPointerDown={e => { e.stopPropagation(); tapZig(z); }} role="button" aria-label={`${z} — double-tap to steer`}>{steer === z && <span className="ctrl-ring" aria-hidden="true"/>}<span className="sprite-stage"><CharacterSprite character={z}/></span></span>; })}
        {bubble && <div key={bubble.text} className="haven-bubble" style={{ left: `${Math.min(78, Math.max(22, pos[bubble.who].x))}%`, top: "auto", bottom: `calc(${100 - pos[bubble.who].y}% + 70px)` }}><b>{bubble.who.toUpperCase()}</b>{bubble.text}</div>}
      </div>
      {step >= INTRO.length && SPOTS.map(s => <button key={s.id} type="button" className="kronk-spot" style={{ left: `${s.x}%`, top: `${s.y}%` }} onPointerDown={e => e.stopPropagation()} onClick={() => void inspect(s.lines)} aria-label={`Inspect ${s.label.toLowerCase()}`}><span>{s.label}</span></button>)}
    </div>
    <div className="map-coordinate top-right">KRONK APPROACH</div>
    {steer && <div className="combat-hint" aria-hidden="true">Steering {steer} · click the road to walk · double-tap {steer} to let go</div>}
  </div>;
}
