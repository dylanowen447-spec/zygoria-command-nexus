import { useEffect, useRef, useState } from "react";
import bg from "@/assets/brix-workshop.png";
import { CharacterSprite } from "@/components/CharacterSprite";

/** Brix's workshop interior: a self-contained scene entered from the Sanctuary workshop door. */
const SPOTS = [
  { id: "plans", x: 28, y: 46, label: "Blueprints", line: "Plans for the pod. Version nine. Versions one to eight exploded." },
  { id: "mech", x: 64, y: 52, label: "The big project", line: "Don't touch it. It's not finished. It might never be finished. That's the point." },
  { id: "tools", x: 15, y: 62, label: "Tool chest", line: "Every spanner has a place. Oz keeps moving them. I know it's Oz." },
  { id: "loft", x: 30, y: 26, label: "The loft", line: "Spare parts up there. And a hammock. Don't tell the others about the hammock." },
] as const;

export function WorkshopScene({ onExit }: { onExit: () => void }) {
  const [x, setX] = useState(55);
  const [moving, setMoving] = useState<{ dir: "left" | "right"; ms: number } | null>(null);
  const [bubble, setBubble] = useState<string>("Mind the floor. Everything on it is important.");
  const posRef = useRef(55);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { const t = setTimeout(() => setBubble(""), 4200); return () => clearTimeout(t); }, [bubble]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const walkTo = (tx: number, then?: () => void) => {
    tx = Math.min(80, Math.max(12, tx));
    if (timerRef.current) clearTimeout(timerRef.current);
    const dx = tx - posRef.current, ms = Math.max(300, Math.abs(dx) * 70);
    posRef.current = tx;
    setMoving({ dir: dx < 0 ? "left" : "right", ms });
    setX(tx);
    timerRef.current = setTimeout(() => { setMoving(null); then?.(); }, ms);
  };

  return <div className="world-image-wrap prologue-scene haven-scene workshop-scene" onPointerDown={e => {
    const r = e.currentTarget.getBoundingClientRect();
    walkTo(((e.clientX - r.left) / r.width) * 100);
  }}>
    <img className="world-image" src={bg} alt="Inside Brix's workshop: timber rafters, a blueprint wall, a loft and a big covered machine on a workbench" />
    <div className="haven-layer">
      <span className={`haven-zig marker-brix ${moving ? `is-walking brix-facing-${moving.dir} facing-${moving.dir}` : ""}`} style={{ left: `${x}%`, bottom: "16%", transitionDuration: moving ? `${moving.ms}ms` : "0ms" }}>
        <span className="sprite-stage"><CharacterSprite character="Brix"/></span>
      </span>
      <button type="button" className="workshop-spot workshop-door" style={{ left: "84%", top: "48%" }} aria-label="Back outside"
        onPointerDown={e => e.stopPropagation()} onClick={() => walkTo(80, onExit)}><span>Outside ›</span></button>
      {bubble && <div key={bubble} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, x))}%`, bottom: "calc(16% + var(--zig-lift))" }}><b>BRIX</b>{bubble}</div>}
    </div>
    <div className="map-coordinate top-right">BRIX'S WORKSHOP</div>
  </div>;
}
