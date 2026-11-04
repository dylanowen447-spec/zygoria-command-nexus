import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import groundsArt from "@/assets/training-grounds.png.asset.json";
import { attackBox, attackPhase, hurtbox, resolveSwing, type Box, type Facing, type Fighter } from "@/lib/combat-boxes";

/** Editor-only Training Grounds: painted art, one interactive dummy (first prop), depth scaling. No health, no enemies. */
type Swing = { start: number; facing: Facing; struck: Set<number>; heavy: boolean };
/** Dummy aligned to the painted one (artwork % space). Base = feet point; crop = visible art region. */
const DUMMY = { x: 49.3, y: 56.5, crop: { l: 44, t: 37, w: 10.5, h: 21.5 }, solidR: 3.2 };
const GROUND = { top: 57, bottom: 95, left: 4, right: 96 };
const depthAt = (y: number) => 0.72 + 0.45 * ((y - GROUND.top) / (GROUND.bottom - GROUND.top));
const SPEED = 22; // % per second

export function CombatArenaScene() {
  const [zig, setZig] = useState<Fighter>("Brix");
  const [debug, setDebug] = useState(true);
  const [, tick] = useState(0);
  const pos = useRef({ x: 35, y: 75 });
  const target = useRef<{ x: number; y: number } | null>(null);
  const facing = useRef<Facing>("right");
  const walking = useRef(false);
  const swing = useRef<Swing | null>(null);
  const dummy = useRef({ hurt: 0, dir: 1, kind: "" as Fighter | "", hits: 0, heavy: false });
  const pressAt = useRef(0);
  const [log, setLog] = useState("Tap the floor to walk · tap ATTACK to strike, hold for heavy");
  const stage = useRef<HTMLDivElement>(null);

  const attack = (heavy = false) => { if (!swing.current) swing.current = { start: performance.now(), facing: facing.current, struck: new Set(), heavy }; };
  const press = () => { pressAt.current = performance.now(); };
  const release = () => { const held = performance.now() - pressAt.current; if (pressAt.current) attack(held > 350); pressAt.current = 0; };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); }
      const f = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as Record<string, Facing>)[e.key];
      if (f) { facing.current = f; const d = 4; const p = pos.current; target.current = { x: p.x + (f === "left" ? -d : f === "right" ? d : 0), y: p.y + (f === "up" ? -d : f === "down" ? d : 0) }; }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") release(); };
    window.addEventListener("keydown", key); window.addEventListener("keyup", up);
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
      p.x = Math.max(GROUND.left, Math.min(GROUND.right, p.x)); p.y = Math.max(GROUND.top, Math.min(GROUND.bottom, p.y));
      // Solid dummy base: push feet out of a small ellipse (y squashed for depth) so Zigs walk around, never through.
      { const dx = p.x - DUMMY.x, dy = (p.y - DUMMY.y) * 2.2, d = Math.hypot(dx, dy);
        if (d < DUMMY.solidR) { const k = (DUMMY.solidR - d) / (d || 1); p.x += dx * k || DUMMY.solidR; p.y += (dy * k) / 2.2; } }
      const sw = swing.current;
      if (sw) {
        const ph = attackPhase(zig, now - sw.start);
        const dm = dummy.current;
        if (ph === "active") {
          const dep = depthAt(p.y);
          const hits = resolveSwing(attackBox(zig, p, sw.facing, dep), [{ id: 1, box: hurtbox("Brix", DUMMY, 1.3) }], sw.struck);
          if (hits.length) {
            dm.hurt = now; dm.kind = zig; dm.heavy = sw.heavy; dm.hits += 1; dm.dir = p.x < DUMMY.x ? 1 : -1;
            setLog(`${sw.heavy ? "HEAVY " : ""}HIT · ${zig} · ${dm.hits} total`);
          }
        }
        if (ph === "done") { if (!sw.struck.size) setLog("Miss — swing didn't reach the dummy"); swing.current = null; }
      }
      tick(n => n + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("keydown", key); window.removeEventListener("keyup", up); };
  }, [zig]);

  const tap = (e: React.PointerEvent) => {
    const r = stage.current!.getBoundingClientRect();
    target.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
  };

  const p = pos.current, dm = dummy.current, sw = swing.current;
  const since = performance.now() - dm.hurt, reacting = since < 520;
  const c = DUMMY.crop;
  const phase = sw ? attackPhase(zig, performance.now() - sw.start) : null;
  const boxStyle = (b: Box) => ({ left: `${b.x - b.w / 2}%`, top: `${b.y - b.h / 2}%`, width: `${b.w}%`, height: `${b.h}%` });
  const f = facing.current;

  return <div className="arena-wrap">
    <div className="arena-stage" ref={stage} onPointerDown={tap}>
      <img className="arena-bg" src={groundsArt.url} alt="Riverside Sanctuary training grounds" draggable={false}/>
      <span className="arena-label">TRAINING GROUNDS</span>
      <span className={`arena-dummy ${reacting ? `is-hit hit-${dm.kind.toLowerCase()} ${dm.heavy ? "is-heavy" : ""}` : ""}`} aria-label={`Training dummy, ${dm.hits} hits`}
        style={{ left: `${c.l}%`, top: `${c.t}%`, width: `${c.w}%`, height: `${c.h}%`, zIndex: 5 + Math.round(DUMMY.y),
          backgroundImage: `url(${groundsArt.url})`, backgroundSize: `${10000 / c.w}% ${10000 / c.h}%`,
          backgroundPosition: `${(c.l / (100 - c.w)) * 100}% ${(c.t / (100 - c.h)) * 100}%`, ["--dir" as string]: dm.dir }}>
        {reacting && <span key={dm.hits} className="arena-hitmark">{dm.heavy ? "POW!" : "HIT"}</span>}
      </span>
      <span className={`haven-zig marker-${zig.toLowerCase()} ${walking.current ? `is-walking ${zig.toLowerCase()}-facing-${f} facing-${f}` : ""} ${sw ? "is-attacking" : ""} ${sw?.heavy ? "is-heavy" : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, zIndex: 5 + Math.round(p.y), transitionDuration: "0ms" }}><span className="sprite-stage" style={{ transform: `scale(${depthAt(p.y)})`, transformOrigin: "50% 100%" }}><CharacterSprite character={zig}/></span></span>
      {debug && <>
        <span className="arena-box is-hurt-box" style={boxStyle(hurtbox(zig, p, depthAt(p.y)))}/>
        <span className="arena-box is-hurt-box" style={boxStyle(hurtbox("Brix", DUMMY, 1.3))}/>
        <span className={`arena-box is-attack-box ${phase === "active" ? "is-live" : ""}`} style={boxStyle(attackBox(zig, p, sw?.facing ?? f, depthAt(p.y)))}/>
      </>}
    </div>
    <div className="arena-controls" onPointerDown={e => e.stopPropagation()}>
      {(["Brix", "Lowkey", "Oz"] as Fighter[]).map(z => <button key={z} type="button" className={`zone-chip ${z === zig ? "is-active" : ""}`} onClick={() => setZig(z)}>{z}</button>)}
      <button type="button" className={`zone-chip ${debug ? "is-active" : ""}`} onClick={() => setDebug(d => !d)}>BOXES {debug ? "ON" : "OFF"}</button>
      <button type="button" className="zone-chip arena-attack" onPointerDown={press} onPointerUp={release} onPointerLeave={() => { if (pressAt.current) release(); }}>ATTACK {phase ? `· ${phase.toUpperCase()}` : ""}</button>
      <span className="arena-log">{log}</span>
    </div>
  </div>;
}
