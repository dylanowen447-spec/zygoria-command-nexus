import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import bg from "@/assets/waterfall-descent.webp.asset.json";

type Zig = "Oz" | "Brix" | "Lowkey";
type Pt = { x: number; y: number };

/** Walkable road down to the caves, in artwork-percentage space (square image). One chain: top terrace → cave mouth. */
export const DESCENT_PATH: Pt[] = [
  { x: 24, y: 26 }, { x: 40, y: 25 }, { x: 54, y: 26 }, { x: 62, y: 31 }, { x: 68, y: 36 },
  { x: 74, y: 41 }, { x: 80, y: 46 }, { x: 85, y: 50 }, { x: 80, y: 56 }, { x: 70, y: 60 },
  { x: 61, y: 64 }, { x: 62, y: 69 }, { x: 65, y: 74 }, { x: 69, y: 79 }, { x: 76, y: 84 }, { x: 84, y: 84 },
];
const CAVE: Pt = { x: 87, y: 79 };
const SPEED = 14; // % per second

/** The waterfall descent between the Sanctuary and the Underground Haven. The Zig only walks the mapped road. */
export function DescentScene({ character = "Brix", onBack, onEnterCave }: { character?: Zig; onBack: () => void; onEnterCave: () => void }) {
  const [pos, setPos] = useState<Pt>(DESCENT_PATH[0]!);
  const [dir, setDir] = useState<"left" | "right" | "up" | "down" | null>(null);
  const [gone, setGone] = useState(false);
  const idx = useRef(0);
  const posRef = useRef<Pt>(DESCENT_PATH[0]!);
  const raf = useRef(0);
  const low = character.toLowerCase();

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const walk = (pts: Pt[], then?: () => void) => {
    cancelAnimationFrame(raf.current);
    let i = 0, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      let budget = SPEED * dt;
      while (budget > 0 && i < pts.length) {
        const t = pts[i]!, p = posRef.current, dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
        if (d > 0.01) setDir(Math.abs(dx) > Math.abs(dy) * 0.9 ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down");
        if (d <= budget) { posRef.current = t; budget -= d; i++; }
        else { posRef.current = { x: p.x + (dx / d) * budget, y: p.y + (dy / d) * budget }; budget = 0; }
      }
      setPos(posRef.current);
      if (i < pts.length) raf.current = requestAnimationFrame(step);
      else { setDir(null); then?.(); }
    };
    raf.current = requestAnimationFrame(step);
  };

  /** Route along the chain from the current node to node `to`. */
  const goTo = (to: number, then?: () => void) => {
    const from = idx.current, pts: Pt[] = [];
    if (to >= from) for (let k = from; k <= to; k++) pts.push(DESCENT_PATH[k]!);
    else for (let k = from; k >= to; k--) pts.push(DESCENT_PATH[k]!);
    idx.current = to;
    walk(pts, then);
  };

  const onGround = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gone) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
    let best = 0, bd = Infinity;
    DESCENT_PATH.forEach((p, k) => { const d = Math.hypot(p.x - x, p.y - y); if (d < bd) { bd = d; best = k; } });
    goTo(best);
  };

  const enterCave = () => { if (gone) return; goTo(DESCENT_PATH.length - 1, () => walk([CAVE], () => { setGone(true); setTimeout(onEnterCave, 350); })); };
  const back = () => { if (gone) return; goTo(0, onBack); };

  return <div className="world-image-wrap prologue-scene descent-scene">
    <div className="descent-box" onPointerDown={onGround}>
      <img className="descent-img" src={bg.url} alt="A stone road winds down past waterfalls from the Sanctuary to a lantern-lit cave entrance" draggable={false}/>
      <div className="haven-layer">
        <span className={`haven-zig marker-${low} ${dir ? `is-walking ${low}-facing-${dir} facing-${dir}` : ""} ${gone ? "is-gone" : ""}`} style={{ left: `${pos.x}%`, bottom: `${100 - pos.y}%`, transitionDuration: "0ms" }}>
          <span className="sprite-stage"><CharacterSprite character={character}/></span>
        </span>
        <button type="button" className="workshop-spot workshop-door descent-cave" style={{ left: `${CAVE.x}%`, top: `${CAVE.y - 5}%` }} aria-label="Enter the caves"
          onPointerDown={e => e.stopPropagation()} onClick={enterCave}><span>Enter caves ›</span></button>
        <button type="button" className="workshop-spot workshop-door descent-back" style={{ left: "22%", top: "21%" }} aria-label="Back to the Sanctuary"
          onPointerDown={e => e.stopPropagation()} onClick={back}><span>‹ Sanctuary</span></button>
      </div>
    </div>
    <div className="map-coordinate top-right">WATERFALL DESCENT</div>
  </div>;
}
