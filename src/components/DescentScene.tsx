import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import bg from "@/assets/waterfall-descent.webp.asset.json";

type Zig = "Oz" | "Brix" | "Lowkey";
type Pt = { x: number; y: number };
type Dir = "left" | "right" | "up" | "down";
type Walker = { x: number; y: number; dir: Dir | null; moving: boolean };

/** Walkable road down to the caves, in artwork-percentage space (square image). One chain: top terrace → cave mouth. */
export const DESCENT_PATH: Pt[] = [
  { x: 18, y: 24 }, { x: 28, y: 24 }, { x: 38, y: 24 }, { x: 48, y: 24 }, { x: 54, y: 25 }, { x: 59, y: 30 },
  { x: 64, y: 35 }, { x: 69, y: 40 }, { x: 75, y: 44 }, { x: 81, y: 47 }, { x: 87, y: 49 }, { x: 82, y: 53 },
  { x: 76, y: 57 }, { x: 70, y: 60 }, { x: 65, y: 63 }, { x: 63, y: 67 }, { x: 65, y: 72 }, { x: 68, y: 77 },
  { x: 73, y: 80 }, { x: 79, y: 81 },
];
const CAVE: Pt = { x: 87, y: 79 };
/** The road the crew walks: the mapped nodes, then the final stride into the arch. */
const ROAD: Pt[] = [...DESCENT_PATH, CAVE];
const CUM: number[] = ROAD.reduce<number[]>((a, _p, i) => { a.push(i ? a[i - 1]! + Math.hypot(ROAD[i]!.x - ROAD[i - 1]!.x, ROAD[i]!.y - ROAD[i - 1]!.y) : 0); return a; }, []);
const TOTAL = CUM[CUM.length - 1]!;
/** The cave terrace: the last mapped node, just short of the arch. */
const ARRIVE = CUM[DESCENT_PATH.length - 1]!;
const SPEED = 14; // % of the artwork per second
const LAGS = [0, 8, 15]; // how far behind the leader each brother walks
const SIDES = [0, 1.8, -1.8]; // small sideways nudge so the crew never stacks on one spot
const REST: Zig[] = ["Brix", "Lowkey", "Oz"];

/** Point on the road at arc length `s`, with the local heading of that stretch. */
function pointAt(s: number): { p: Pt; dx: number; dy: number } {
  const t = Math.max(0, Math.min(TOTAL, s));
  let i = 1;
  while (i < CUM.length - 1 && CUM[i]! < t) i++;
  const a = ROAD[i - 1]!, b = ROAD[i]!, seg = CUM[i]! - CUM[i - 1]! || 1, f = (t - CUM[i - 1]!) / seg;
  return { p: { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }, dx: b.x - a.x, dy: b.y - a.y };
}

/** Which way a Zig is looking: sideways unless the road is steeper than it is wide. */
function facing(dx: number, dy: number, back: boolean): Dir {
  const x = back ? -dx : dx, y = back ? -dy : dy;
  return Math.abs(x) > Math.abs(y) * 0.9 ? (x < 0 ? "left" : "right") : y < 0 ? "up" : "down";
}

/** The waterfall descent between the Sanctuary and the Underground Haven. The whole crew walks the mapped road together. */
export function DescentScene({ character = "Brix", onBack, onEnterCave }: { character?: Zig; onBack: () => void; onEnterCave: () => void }) {
  const crew = useRef<Zig[]>([character, ...REST.filter(c => c !== character)]).current;
  const [walkers, setWalkers] = useState<Walker[]>(() => crew.map(() => ({ ...DESCENT_PATH[0]!, dir: null, moving: false })));
  const [gone, setGone] = useState(false);
  const s = useRef(0), target = useRef(0), then = useRef<(() => void) | null>(null), raf = useRef(0);

  // Arrive from the Sanctuary and walk the painted road down to the cave terrace.
  useEffect(() => { const t = setTimeout(() => { target.current = ARRIVE; }, 300); return () => clearTimeout(t); }, []);

  useEffect(() => {
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const d = target.current - s.current, moving = Math.abs(d) > 0.02;
      if (moving) s.current += Math.sign(d) * Math.min(SPEED * dt, Math.abs(d));
      else if (d !== 0) { s.current = target.current; const f = then.current; then.current = null; f?.(); }
      const back = d < -0.02;
      setWalkers(crew.map((_c, i) => {
        const { p, dx, dy } = pointAt(s.current - LAGS[i]!), n = Math.hypot(dx, dy) || 1, off = SIDES[i]!;
        return { x: p.x + (-dy / n) * off, y: p.y + (dx / n) * off, dir: moving ? facing(dx, dy, back) : null, moving };
      }));
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [crew]);

  const onGround = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gone) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    let best = 0, bd = Infinity;
    DESCENT_PATH.forEach((p, k) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } });
    target.current = CUM[best]!;
  };

  const enterCave = () => { if (gone) return; target.current = TOTAL; then.current = () => { setGone(true); setTimeout(onEnterCave, 350); }; };
  const back = () => { if (gone) return; target.current = 0; then.current = onBack; };

  return <div className="world-image-wrap prologue-scene descent-scene">
    <div className="descent-box" onPointerDown={onGround}>
      <img className="descent-img" src={bg.url} alt="A stone road winds down past waterfalls from the Sanctuary to a lantern-lit cave entrance" draggable={false}/>
      <div className="haven-layer">
        {crew.map((c, i) => { const w = walkers[i]!, low = c.toLowerCase(); return <span key={c} className={`haven-zig marker-${low} ${w.moving && w.dir ? `is-walking ${low}-facing-${w.dir} facing-${w.dir}` : ""} ${gone ? "is-gone" : ""}`}
          style={{ left: `${w.x}%`, ["--feet" as string]: `${100 - w.y}%`, transitionDuration: "0ms" } as CSSProperties}>
          <span className="sprite-stage"><CharacterSprite character={c}/></span>
        </span>; })}
        <button type="button" className="workshop-spot workshop-door descent-cave" style={{ left: `${CAVE.x}%`, top: `${CAVE.y - 5}%` }} aria-label="Enter the caves"
          onPointerDown={e => e.stopPropagation()} onClick={enterCave}><span>Enter caves ›</span></button>
        <button type="button" className="workshop-spot workshop-door descent-back" style={{ left: "22%", top: "21%" }} aria-label="Back to the Sanctuary"
          onPointerDown={e => e.stopPropagation()} onClick={back}><span>‹ Sanctuary</span></button>
      </div>
    </div>
    <div className="map-coordinate top-right">WATERFALL DESCENT</div>
  </div>;
}
