import { voiceLine } from "@/lib/voice";
import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import { INTERIORS, type InteriorId } from "@/lib/interiors";
import { startShackMusic, stopShackMusic } from "@/lib/atmosphere";
import { WorkshopTV } from "@/components/WorkshopTV";
import ozDance from "@/assets/oz-dance-v2.webp.asset.json";

type Zig = "Oz" | "Brix" | "Lowkey";

/** The shack dance strip holds 16 moves; the shack track runs 174 BPM, so Oz changes move on every beat. */
const DANCE_MOVES = 16;
const DANCE_MS = 344.85;

/** A fresh run of moves in random order, so Oz never repeats the same routine twice. */
function shuffledMoves() {
  const moves = Array.from({ length: DANCE_MOVES }, (_, i) => i);
  for (let i = moves.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [moves[i], moves[j]] = [moves[j]!, moves[i]!];
  }
  return moves;
}

/** A walk-in interior (Brix's workshop, Oz's shack) entered from a Sanctuary door. */
export function WorkshopScene({ onExit, character = "Brix", place = "brix", tv }: { onExit: () => void; character?: Zig; place?: InteriorId; tv?: { wake: boolean; editor: boolean; onEscape: () => void } | undefined }) {
  const room = INTERIORS[place];
  const exitX = parseFloat(room.exit.left) < 50 ? 12 : 80;
  const [x, setX] = useState(55);
  const [moving, setMoving] = useState<{ dir: "left" | "right"; ms: number } | null>(null);
  const [bubble, setBubble] = useState<string>(room.greeting[character]);
  const low = character.toLowerCase();
  const posRef = useRef(55);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Oz chooses his own next shack dance move; the queue holds the rest of the current run. */
  const [move, setMove] = useState(0);
  const queueRef = useRef<number[]>([]);
  const dancing = place === "oz" && character === "Oz" && !moving;

  const voiced = useRef("");
  useEffect(() => { if (bubble && voiced.current !== bubble) { voiced.current = bubble; voiceLine(character, bubble); } }, [bubble, character]);
  useEffect(() => { const t = setTimeout(() => setBubble(""), 4200); return () => clearTimeout(t); }, [bubble]);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
  useEffect(() => { if (place !== "oz") return; startShackMusic(); return () => stopShackMusic(); }, [place]);

  useEffect(() => {
    if (!dancing) return;
    const id = setInterval(() => {
      const queue = queueRef.current;
      if (queue.length < 4) queue.push(...shuffledMoves());
      // Keep a favourite going now and then, the way a real dancer holds a move a beat longer.
      if (Math.random() < 0.12) return;
      setMove(queue.shift() ?? 0);
    }, DANCE_MS);
    return () => clearInterval(id);
  }, [dancing]);

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
        <span className="sprite-stage">{dancing
          ? <span className="oz-dance-sheet" style={{ backgroundImage: `url(${ozDance.url})`, backgroundPositionX: `${move * (100 / (DANCE_MOVES - 1))}%` }} aria-label="Oz dancing" />
          : <span className="shack-still"><CharacterSprite character={character}/></span>}</span>
      </span>
      {place === "brix" && tv && <WorkshopTV wake={tv.wake} editor={tv.editor} exitX={exitX} onEscape={tv.onEscape}/>}
      <button type="button" className="workshop-spot workshop-door" style={room.exit} aria-label="Back outside"
        onPointerDown={e => e.stopPropagation()} onClick={() => walkTo(exitX, onExit)}><span>Outside ›</span></button>
      {bubble && <div key={bubble} className="haven-bubble" style={{ left: `${Math.min(80, Math.max(20, x))}%`, bottom: "calc(16% + var(--zig-lift))" }}><b>{character.toUpperCase()}</b>{bubble}</div>}
    </div>
    <div className="map-coordinate top-right">{room.label}</div>
  </div>;
}
