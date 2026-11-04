import { useEffect, useRef, useState } from "react";
import { CharacterSprite } from "@/components/CharacterSprite";
import groundsArt from "@/assets/training-grounds.png.asset.json";
import { attackBox, attackPhase, hurtbox, resolveSwing, type Box, type Facing, type Fighter } from "@/lib/combat-boxes";

/** Editor-only Training Grounds: painted art, one interactive dummy (first prop), depth scaling. No health, no enemies. */
type Swing = { start: number; facing: Facing; struck: Set<number>; heavy: boolean };
/** Dummy aligned to the painted one (artwork % space). Base = feet point; crop = visible art region. */
const DUMMY = { x: 49.3, y: 56.5, crop: { l: 44, t: 37, w: 10.5, h: 21.5 } };
/** Walkable dirt clearing traced from the painted guide (artwork %): avoids grass, rocks, stumps and props. */
const FLOOR: [number, number][] = [[22.5,52.5],[25,51.5],[32,52.8],[37,51.5],[42,52.5],[46,51.2],[55,51],[67,50.8],[74,50.8],[80,51.5],[88,53.5],[94,56],[100,62.5],[98.5,67],[93,69.5],[87.2,73],[84,77],[81,82],[80.2,85],[85,86.5],[86,90],[78,93],[68,93],[67.5,97],[45,97],[44,93],[40,89],[35,89],[31,94],[28,88],[25.5,85],[23.5,84.5],[18,84],[14,75],[12,68],[16.5,66.5],[19.5,64.5],[17.5,62.5],[22.8,56.5]];
const GROUND = { top: 50.8, bottom: 97 };
/** Solid prop bases from the guide's red outlines (artwork %): feet are pushed out so Zigs walk around, never through. */
const SOLIDS = [
  { x: 16.8, y: 56.5, rx: 4.6, ry: 2.0 },  // crates + punching bag frame
  { x: 28.3, y: 52.5, rx: 2.4, ry: 1.2 },  // boulder under the bag
  { x: 37.5, y: 53.4, rx: 2.8, ry: 1.4 },  // archery target stand
  { x: 49.3, y: 56.5, rx: 3.2, ry: 1.5 },  // scarecrow dummy (interactive)
  { x: 61.5, y: 55.2, rx: 1.9, ry: 1.1 },  // wing chun dummy
  { x: 70.5, y: 55.2, rx: 1.8, ry: 1.1 },  // rope post 1
  { x: 77.3, y: 53.8, rx: 1.6, ry: 1.0 },  // rope post 2
  { x: 85.5, y: 57.5, rx: 4.2, ry: 2.0 },  // tire stack
];
function inside(x: number, y: number) {
  let c = false;
  for (let i = 0, j = FLOOR.length - 1; i < FLOOR.length; j = i++) {
    const [xi, yi] = FLOOR[i]!, [xj, yj] = FLOOR[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** Nearest walkable point (like Kronk's Lair), so taps on grass or a prop walk to the clearing's edge. */
function inSolid(x: number, y: number) {
  return SOLIDS.some(s => ((x - s.x) / s.rx) ** 2 + ((y - s.y) / s.ry) ** 2 < 1);
}
function clampToFloor(t: { x: number; y: number }) {
  if (inside(t.x, t.y) && !inSolid(t.x, t.y)) return t;
  let best = t, bd = Infinity;
  for (let x = 10; x <= 100; x += 0.5) for (let y = 50; y <= 97; y += 0.5) {
    if (!inside(x, y) || inSolid(x, y)) continue;
    const d = (x - t.x) ** 2 + (y - t.y) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
/** 2.5D: far (top of clearing) is small, near (bottom) is big. */
const depthAt = (y: number) => 0.6 + 0.6 * Math.max(0, Math.min(1, (y - GROUND.top) / (GROUND.bottom - GROUND.top)));
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
            if (inside(nx, ny) && !inSolid(nx, ny)) {
              p.x = nx; p.y = ny; moved = true;
              facing.current = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? "right" : "left") : Math.sin(a) > 0 ? "down" : "up";
              break;
            }
          }
          walking.current = moved;
        }
      }
      // Solid prop bases: push feet out of each ellipse so Zigs walk around props, never through them.
      for (const s of SOLIDS) {
        const nx = (p.x - s.x) / s.rx, ny = (p.y - s.y) / s.ry, len = Math.hypot(nx, ny);
        if (len < 1) {
          if (len < 1e-4) { p.x = s.x + s.rx; continue; }
          const k = 1 / len; p.x = s.x + nx * k * s.rx; p.y = s.y + ny * k * s.ry;
        }
      }
      if (!inside(p.x, p.y) || inSolid(p.x, p.y)) { const q = clampToFloor(p); p.x = q.x; p.y = q.y; }
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
      <span className={`haven-zig marker-${zig.toLowerCase()} ${walking.current ? `is-walking ${zig.toLowerCase()}-facing-${f} facing-${f}` : ""} ${sw ? "is-attacking" : ""} ${sw?.heavy ? "is-heavy" : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, zIndex: 5 + Math.round(p.y), transitionDuration: "0ms", ["--depth" as string]: String(depthAt(p.y)) }}><span className="arena-shadow" aria-hidden="true"/><span className="sprite-stage" style={{ transform: `scale(${depthAt(p.y)})`, transformOrigin: "50% 100%" }}><CharacterSprite character={zig}/></span></span>
      {debug && <>
        <svg className="arena-floor" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon points={FLOOR.map(([x, y]) => `${x},${y}`).join(" ")} className="arena-floor-fill"/>
          {SOLIDS.map((s, i) => <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx} ry={s.ry} className="arena-floor-solid"/>)}
        </svg>
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
