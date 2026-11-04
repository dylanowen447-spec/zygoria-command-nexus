import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import groundsArt from "@/assets/training-grounds.png.asset.json";
import { attackBox, attackPhase, hurtbox, resolveSwing, type Box, type Facing, type Fighter } from "@/lib/combat-boxes";

/** Editor-only Training Grounds: painted art, one interactive dummy (first prop), depth scaling. No health, no enemies. */
type Swing = { start: number; facing: Facing; struck: Set<number>; heavy: boolean };
/** Dummy aligned to the painted one (artwork % space). Base = feet point; crop = visible art region. */
const DUMMY = { x: 49.3, y: 56.5, crop: { l: 44, t: 37, w: 10.5, h: 21.5 } };
/** Flat open ground: the whole clearing is walkable (artwork %); only props, trees and rocks block the feet. */
const GROUND = { top: 50, bottom: 97 };
const WALK = { left: 1, right: 99, top: 48, bottom: 99.5 };
/** Solid bases (artwork %): feet are pushed out so Zigs walk around, never through. */
const SOLIDS: { x: number; y: number; rx: number; ry: number }[] = [
  { x: 16.8, y: 56.5, rx: 4.6, ry: 2.0 },  // crates + punching bag frame
  { x: 22.5, y: 56.5, rx: 1.6, ry: 1.0 },  // bag frame support
  { x: 28.3, y: 52.5, rx: 2.4, ry: 1.2 },  // boulder under the bag
  { x: 37.5, y: 53.4, rx: 2.8, ry: 1.4 },  // archery target stand
  { x: 49.3, y: 56.5, rx: 3.2, ry: 1.5 },  // scarecrow dummy (interactive)
  { x: 61.5, y: 55.2, rx: 1.9, ry: 1.1 },  // wing chun dummy
  { x: 70.5, y: 55.2, rx: 1.8, ry: 1.1 },  // rope post 1
  { x: 77.3, y: 53.8, rx: 1.6, ry: 1.0 },  // rope post 2
  { x: 85.5, y: 57.5, rx: 4.2, ry: 2.0 },  // tire stack
  { x: 94.5, y: 55, rx: 4.0, ry: 1.9 },    // boulder by the right banners
  { x: 9, y: 64, rx: 6.0, ry: 2.7 },       // giant tree trunk, left
  { x: 15, y: 63, rx: 2.5, ry: 1.2 },      // crate by the tree
  { x: 77, y: 84, rx: 3.5, ry: 1.7 },      // stump
  { x: 84.5, y: 81.5, rx: 2.5, ry: 1.2 },  // small stump
  { x: 91, y: 81, rx: 3.5, ry: 1.7 },      // tall stump
  { x: 96.5, y: 74, rx: 2.5, ry: 1.2 },    // cut stump
  { x: 6, y: 88, rx: 5.0, ry: 2.6 },       // boulder, bottom left
];
function inSolid(x: number, y: number) {
  return SOLIDS.some(s => ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 < 1);
}
const inWalk = (x: number, y: number) => x >= WALK.left && x <= WALK.right && y >= WALK.top && y <= WALK.bottom;
/** Keep feet on the ground: inside the clearing and outside every prop, tree and rock. */
function clampToFloor(t: { x: number; y: number }) {
  let x = Math.max(WALK.left, Math.min(WALK.right, t.x));
  let y = Math.max(WALK.top, Math.min(WALK.bottom, t.y));
  for (let i = 0; i < 6; i++) {
    const s = SOLIDS.find(s => ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 < 1);
    if (!s) break;
    const nx = (x - s.x) / s.rx, ny = (y - s.y) / s.ry, len = Math.hypot(nx, ny);
    if (len < 1e-4) { x = s.x + s.rx; y = s.y; continue; }
    const k = 1.02 / len;
    x = Math.max(WALK.left, Math.min(WALK.right, s.x + nx * k * s.rx));
    y = Math.max(WALK.top, Math.min(WALK.bottom, s.y + ny * k * s.ry));
  }
  return { x, y };
}
/** 2.5D: far (top of clearing) is small, near (bottom) is big. */
const depthAt = (y: number) => 0.6 + 0.6 * Math.max(0, Math.min(1, (y - GROUND.top) / (GROUND.bottom - GROUND.top)));
const SPEED = 22; // % per second

export function CombatArenaScene() {
  const [zig, setZig] = useState<Fighter>("Brix");
  const [debug, setDebug] = useState(false);
  const [, tick] = useState(0);
  const crewPos = useRef<Record<Fighter, { x: number; y: number }>>({ Brix: { x: 35, y: 75 }, Lowkey: { x: 25, y: 82 }, Oz: { x: 45, y: 85 } });
  const pos = { get current() { return crewPos.current[zig]; } };
  const target = useRef<{ x: number; y: number } | null>(null);
  const facing = useRef<Facing>("right");
  const walking = useRef(false);
  const swing = useRef<Swing | null>(null);
  const dummy = useRef({ hurt: 0, dir: 1, kind: "" as Fighter | "", hits: 0, heavy: false });
  const pressAt = useRef(0);
  const stuck = useRef({ dist: Infinity, at: 0 });
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
        if (d < stuck.current.dist - 0.3) { stuck.current.dist = d; stuck.current.at = now; }
        else if (now - stuck.current.at > 2500) { target.current = null; stuck.current.dist = Infinity; stuck.current.at = now; }
        if (d < 0.8) target.current = null;
        else {
          // Slide: try the straight line to the tap, then fan out either side until a step lands on open ground.
          const step = Math.min(d, SPEED * dt), base = Math.atan2(dy, dx);
          let moved = false;
          for (const off of [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.8, -1.8, 2.3, -2.3, 2.8, -2.8]) {
            const a = base + off, nx = p.x + Math.cos(a) * step, ny = p.y + Math.sin(a) * step;
            if (inWalk(nx, ny) && !inSolid(nx, ny)) {
              p.x = nx; p.y = ny; moved = true;
              facing.current = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? "right" : "left") : Math.sin(a) > 0 ? "down" : "up";
              break;
            }
          }
          walking.current = moved;
        }
      }
      // Keep feet on the ground: out of every prop, tree and rock, and inside the clearing.
      const q = clampToFloor(p); p.x = q.x; p.y = q.y;
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
    target.current = clampToFloor({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
    stuck.current = { dist: Infinity, at: performance.now() };
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
      {(["Brix", "Lowkey", "Oz"] as Fighter[]).filter(z => z !== zig).map(z => { const q = crewPos.current[z]; return <span key={z} className={`haven-zig marker-${z.toLowerCase()}`} onPointerDown={e => { e.stopPropagation(); target.current = null; setZig(z); }} style={{ left: `${q.x}%`, ["--fy" as string]: `${100 - q.y}%`, zIndex: 5 + Math.round(q.y), transitionDuration: "0ms", ["--depth" as string]: String(depthAt(q.y)) }}><span className="arena-shadow" aria-hidden="true"/><span className="sprite-stage" style={{ transform: `scale(${depthAt(q.y)})`, transformOrigin: "50% 100%" }}><CharacterSprite character={z}/></span></span>; })}
      <span className={`haven-zig marker-${zig.toLowerCase()} ${walking.current ? `is-walking ${zig.toLowerCase()}-facing-${f} facing-${f}` : ""} ${sw ? "is-attacking" : ""} ${sw?.heavy ? "is-heavy" : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, zIndex: 5 + Math.round(p.y), transitionDuration: "0ms", ["--depth" as string]: String(depthAt(p.y)) }}><span className="arena-shadow" aria-hidden="true"/><span className="sprite-stage" style={{ transform: `scale(${depthAt(p.y)})`, transformOrigin: "50% 100%" }}><CharacterSprite character={zig}/></span></span>
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
