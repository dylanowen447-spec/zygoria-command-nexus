import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import { attackBox, attackPhase, hurtbox, resolveSwing, type Box, type Facing, type Fighter } from "@/lib/combat-boxes";

/** Editor-only training room: one Zig, one dummy rat, optional hitbox overlay. Touches no story or combat state. */
type Swing = { start: number; facing: Facing; struck: Set<number> };
const SPEED = 22; // % per second

export function CombatArenaScene() {
  const [zig, setZig] = useState<Fighter>("Brix");
  const [debug, setDebug] = useState(true);
  const [, tick] = useState(0);
  const pos = useRef({ x: 35, y: 70 });
  const target = useRef<{ x: number; y: number } | null>(null);
  const facing = useRef<Facing>("right");
  const walking = useRef(false);
  const swing = useRef<Swing | null>(null);
  const rat = useRef({ x: 62, y: 70, hp: 6, hurt: 0 });
  const [log, setLog] = useState("Tap the floor to walk · ATTACK or Space to swing");
  const stage = useRef<HTMLDivElement>(null);

  const attack = () => { if (!swing.current) swing.current = { start: performance.now(), facing: facing.current, struck: new Set() }; };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); attack(); }
      const f = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as Record<string, Facing>)[e.key];
      if (f) { facing.current = f; const d = 4; const p = pos.current; target.current = { x: p.x + (f === "left" ? -d : f === "right" ? d : 0), y: p.y + (f === "up" ? -d : f === "down" ? d : 0) }; }
    };
    window.addEventListener("keydown", key);
    let last = performance.now(), raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = pos.current, t = target.current;
      walking.current = false;
      if (t && !swing.current) {
        const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy);
        if (d < 0.5) target.current = null;
        else {
          const s = Math.min(d, SPEED * dt); p.x += (dx / d) * s; p.y += (dy / d) * s; walking.current = true;
          facing.current = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        }
      }
      p.x = Math.max(5, Math.min(95, p.x)); p.y = Math.max(40, Math.min(95, p.y));
      const sw = swing.current;
      if (sw) {
        const ph = attackPhase(zig, now - sw.start);
        const r = rat.current;
        if (ph === "active" && r.hp > 0) {
          const hits = resolveSwing(attackBox(zig, p, sw.facing), [{ id: 1, box: hurtbox("Rat", r) }], sw.struck);
          if (hits.length) { r.hp -= 1; r.hurt = now; setLog(`HIT at ${Math.round(now - sw.start)}ms · rat HP ${r.hp}`); }
        }
        if (ph === "done") { if (!sw.struck.size) setLog("Miss — swing didn't touch the rat"); swing.current = null; }
      }
      if (rat.current.hp <= 0 && now - rat.current.hurt > 1200) rat.current = { x: 30 + Math.random() * 40, y: 55 + Math.random() * 35, hp: 6, hurt: 0 };
      tick(n => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", key); };
  }, [zig]);

  const tap = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    target.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const p = pos.current, r = rat.current, sw = swing.current;
  const phase = sw ? attackPhase(zig, performance.now() - sw.start) : null;
  const boxStyle = (b: Box) => ({ left: `${b.x - b.w / 2}%`, top: `${b.y - b.h / 2}%`, width: `${b.w}%`, height: `${b.h}%` });
  const f = facing.current;

  return <div className="arena-wrap">
    <div className="arena-stage" ref={stage} onPointerDown={tap}>
      <span className="arena-label">DEV · COMBAT ARENA</span>
      <span className={`arena-rat ${r.hp <= 0 ? "is-dead" : ""} ${performance.now() - r.hurt < 180 ? "is-hurt" : ""}`} style={{ left: `${r.x}%`, top: `${r.y}%` }} aria-label={`Training rat, ${r.hp} HP`}>🐀</span>
      <span className={`haven-zig marker-${zig.toLowerCase()} ${walking.current ? `is-walking ${zig.toLowerCase()}-facing-${f} facing-${f}` : ""} ${sw ? "is-attacking" : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, zIndex: 5 + Math.round(p.y), transitionDuration: "0ms" }}><span className="sprite-stage"><CharacterSprite character={zig}/></span></span>
      {debug && <>
        <span className="arena-box is-hurt-box" style={boxStyle(hurtbox(zig, p))}/>
        <span className="arena-box is-hurt-box" style={boxStyle(hurtbox("Rat", r))}/>
        <span className={`arena-box is-attack-box ${phase === "active" ? "is-live" : ""}`} style={boxStyle(attackBox(zig, p, sw?.facing ?? f))}/>
      </>}
    </div>
    <div className="arena-controls" onPointerDown={e => e.stopPropagation()}>
      {(["Brix", "Lowkey", "Oz"] as Fighter[]).map(z => <button key={z} type="button" className={`zone-chip ${z === zig ? "is-active" : ""}`} onClick={() => setZig(z)}>{z}</button>)}
      <button type="button" className={`zone-chip ${debug ? "is-active" : ""}`} onClick={() => setDebug(d => !d)}>BOXES {debug ? "ON" : "OFF"}</button>
      <button type="button" className="zone-chip arena-attack" onClick={attack}>ATTACK {phase ? `· ${phase.toUpperCase()}` : ""}</button>
      <span className="arena-log">{log}</span>
    </div>
  </div>;
}
