import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import { INTERIORS, type InteriorId } from "@/lib/interiors";

type Zig = "Oz" | "Brix" | "Lowkey";

/** A walk-in interior (Brix's workshop, Oz's shack) entered from a Sanctuary door. */
export function WorkshopScene({ onExit, character = "Brix", place = "brix" }: { onExit: () => void; character?: Zig; place?: InteriorId }) {
  const room = INTERIORS[place];
  const exitX = parseFloat(room.exit.left) < 50 ? 12 : 80;
  const [x, setX] = useState(55);
  const [moving, setMoving] = useState<{ dir: "left" | "right"; ms: number } | null>(null);
  const [bubble, setBubble] = useState<string>(room.greeting[character]);
  const low = character.toLowerCase();
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

  return <div className={`world-image-wrap prologue-scene haven-scene ${room.cls}`} onPointerDown={e => {
    const r = e.currentTarget.getBoundingClientRect();
    walkTo(((e.clientX - r.left) / r.width) * 100);
  }}>
    <img className="world-image" src={room.img} alt={room.alt} />
    <div className="haven-layer">
      <span className={`haven-zig marker-${low} ${moving ? `is-walking ${low}-facing-${moving.dir} facing-${moving.dir}` : ""}`} style={{ left: `${x}%`, bottom: "16%", transitionDuration: moving ? `${moving.ms}ms` : "0ms" }}>
        <span className="sprite-stage"><CharacterSprite character={character}/></span>
      </span>
      <button type="button" className="workshop-spot workshop-door" style={room.exit} aria-label="Back outside"
        onPointerDown={e => e.stopPropagation()} onClick={() => walkTo(exitX, onExit)}><span>Outside ›</span></button>
      {bubble && <div key={bubble} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, x))}%`, bottom: "calc(16% + var(--zig-lift))" }}><b>{character.toUpperCase()}</b>{bubble}</div>}
    </div>
    <div className="map-coordinate top-right">{room.label}</div>
  </div>;
}
