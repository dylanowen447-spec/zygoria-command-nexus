import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CharacterSprite } from "@/components/CharacterSprite";
import groundsArt from "@/assets/training-grounds.png.asset.json";
import { ATTACK, attackBox, attackPhase, hurtbox, resolveSwing, type Box, type Facing, type Fighter } from "@/lib/combat-boxes";

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
/** Same attack poses as Old City / The Long Walk. */
const atkPose = (a: Fighter, heavy: boolean) => a === "Brix" ? (heavy ? "atk-punch is-heavy" : "atk-punch") : a === "Lowkey" ? (heavy ? "atk-slash is-heavy" : "atk-slash") : heavy ? "atk-heavy" : "atk-quick";
/** 2.5D: gentle, continuous perspective (far slightly smaller) so the flat clearing never reads as steps. */
const depthAt = (y: number) => 0.85 + 0.25 * Math.max(0, Math.min(1, (y - GROUND.top) / (GROUND.bottom - GROUND.top)));
const SPEED = 24; // % of stage width per second (screen-equal in every direction)
const ACCEL = 300, DECEL = 220; // very short ease in/out
const ASPECT = 1671 / 941; // stage width / height: converts y% into width-equivalent units

/** Training dummy health; it springs back to full a moment after being knocked down. */
const DUMMY_HP = 30;
export function CombatArenaScene() {
  const [zig, setZig] = useState<Fighter>("Brix");
  const [debug, setDebug] = useState(false);
  const [, tick] = useState(0);
  const crewPos = useRef<Record<Fighter, { x: number; y: number }>>({ Brix: { x: 35, y: 75 }, Lowkey: { x: 25, y: 82 }, Oz: { x: 45, y: 85 } });
  const pos = { get current() { return crewPos.current[zig]; } };
  const target = useRef<{ x: number; y: number } | null>(null);
  const facing = useRef<Facing>("right");
  const walking = useRef(false);
  const vel = useRef({ x: 0, y: 0 });
  const lastTap = useRef<{ z: Fighter; t: number } | null>(null); // double-tap a resting Zig to switch; a single tap walks
  const swing = useRef<Swing | null>(null);
  const dummy = useRef({ hurt: 0, dir: 1, kind: "" as Fighter | "", hits: 0, heavy: false, hp: DUMMY_HP, dmg: 0, total: 0, down: 0 });
  const pressAt = useRef(0);
  const stuck = useRef({ dist: Infinity, at: 0 });
  const [log, setLog] = useState("Tap the floor to walk · tap ATTACK to strike, hold for heavy · DODGE to roll (Space / Shift on keyboard)");
  const stage = useRef<HTMLDivElement>(null);

  const attack = (heavy = false) => { if (!swing.current) swing.current = { start: performance.now(), facing: facing.current, struck: new Set(), heavy }; };
    const [charged, setCharged] = useState(false);
  const chargeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Same hold threshold as every other fight (600ms = heavy).
  const press = () => { pressAt.current = performance.now(); clearTimeout(chargeTimer.current); chargeTimer.current = setTimeout(() => setCharged(true), 600); };
  const release = () => { clearTimeout(chargeTimer.current); setCharged(false); const held = performance.now() - pressAt.current; if (pressAt.current) attack(held >= 600); pressAt.current = 0; };
  // Dodge roll, same as the other fights: a quick burst away from the dummy with a short cooldown.
  const roll = useRef<{ until: number; ux: number; uy: number } | null>(null);
  const lastDodge = useRef(0);
  const dodge = () => {
    const now = performance.now(); if (now - lastDodge.current < 650 || swing.current) return;
    lastDodge.current = now; target.current = null;
    const p = pos.current; let dx = p.x - DUMMY.x, dy = (p.y - DUMMY.y) / ASPECT; const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    roll.current = { until: now + 300, ux: dx, uy: dy }; setLog(`${zig} dodges!`);
  };

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) press(); }
      if (e.key === "Shift" && !e.repeat) dodge();
      const f = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as Record<string, Facing>)[e.key];
      if (f) { facing.current = f; const d = 4; const p = pos.current; target.current = { x: p.x + (f === "left" ? -d : f === "right" ? d : 0), y: p.y + (f === "up" ? -d : f === "down" ? d : 0) }; }
    };
    const up = (e: KeyboardEvent) => { if (e.code === "Space") release(); };
    window.addEventListener("keydown", key); window.addEventListener("keyup", up);
    vel.current = { x: 0, y: 0 };
    let last = performance.now(), raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const p = pos.current, t = target.current, v = vel.current;
      // Smooth walk: work in on-screen units (y scaled by the stage aspect) so speed is equal in every direction,
      // ease up to full speed in ~0.08s and ease down over the last stretch, sliding along props instead of snapping.
      let want = 0, ux = 0, uy = 0;
      if (t && !swing.current) {
        const dx = t.x - p.x, dyS = (t.y - p.y) / ASPECT, d = Math.hypot(dx, dyS);
        if (d < stuck.current.dist - 0.3) { stuck.current.dist = d; stuck.current.at = now; }
        else if (now - stuck.current.at > 1200) { target.current = null; stuck.current.dist = Infinity; }
        if (d < 0.25) target.current = null;
        else { ux = dx / d; uy = dyS / d; want = Math.min(SPEED, d * 7); }
      }
      const sp = Math.hypot(v.x, v.y);
      const nsp = want > sp ? Math.min(want, sp + ACCEL * dt) : Math.max(want, sp - DECEL * dt);
      if (want > 0) { v.x = ux * nsp; v.y = uy * nsp; } else if (sp > 0) { v.x = (v.x / sp) * nsp; v.y = (v.y / sp) * nsp; }
      if (swing.current) { v.x = 0; v.y = 0; } // attacks never move the Zig
      const rl = roll.current;
      if (rl) { if (now > rl.until) { roll.current = null; v.x = 0; v.y = 0; } else { v.x = rl.ux * SPEED * 2.4; v.y = rl.uy * SPEED * 2.4; } }
      const mx = v.x * dt, my = v.y * dt * ASPECT;
      const free = (x: number, y: number) => inWalk(x, y) && !inSolid(x, y);
      if (mx || my) {
        if (free(p.x + mx, p.y + my)) { p.x += mx; p.y += my; }
        else if (free(p.x + mx, p.y)) { p.x += mx; v.y = 0; }
        else if (free(p.x, p.y + my)) { p.y += my; v.x = 0; }
        else { v.x = 0; v.y = 0; }
      }
      const moving = Math.hypot(v.x, v.y) > 1.5 && !roll.current;
      walking.current = moving;
      if (moving) {
        // Facing only flips when the new axis clearly dominates, so diagonals never flicker between frames.
        const ax = Math.abs(v.x), ay = Math.abs(v.y), cur = facing.current, horiz = cur === "left" || cur === "right";
        const useX = horiz ? ax * 1.35 >= ay : ax > ay * 1.35;
        facing.current = useX ? (v.x > 0 ? "right" : "left") : v.y > 0 ? "down" : "up";
      }
      // Only rescue feet that somehow ended up inside a prop (e.g. on spawn); never snap during normal walking.
      if (!free(p.x, p.y)) { const q = clampToFloor(p); p.x = q.x; p.y = q.y; }
      const sw = swing.current;
      if (sw) {
        const ph = attackPhase(zig, now - sw.start);
        const dm = dummy.current;
        if (ph === "active") {
          const dep = depthAt(p.y);
          const hits = resolveSwing(attackBox(zig, p, sw.facing, dep), [{ id: 1, box: hurtbox("Brix", DUMMY, 1.3) }], sw.struck);
          if (hits.length && !dm.down) {
            // Real damage: the same per-Zig values the fight engine uses, doubled for a heavy.
            const amount = ATTACK[zig].dmg * (sw.heavy ? 2 : 1);
            dm.hurt = now; dm.kind = zig; dm.heavy = sw.heavy; dm.hits += 1; dm.dir = p.x < DUMMY.x ? 1 : -1;
            dm.dmg = amount; dm.total += amount; dm.hp = Math.max(0, dm.hp - amount);
            setLog(`${sw.heavy ? "HEAVY " : ""}${zig} · −${amount} HP · ${dm.total} damage total`);
            if (dm.hp === 0) { dm.down = now; setLog(`Dummy knocked down! ${dm.total} damage total`); }
          }
        }
        if (ph === "done") { if (!sw.struck.size) setLog("Miss — swing didn't reach the dummy"); swing.current = null; }
      }
      if (dummy.current.down && now - dummy.current.down > 1400) { dummy.current.down = 0; dummy.current.hp = DUMMY_HP; }
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
  // Old City attack poses; up/down swings turn side-on toward the dummy so the full move is visible.
  const atkSide = sw ? (sw.facing === "left" || sw.facing === "right" ? sw.facing : p.x < DUMMY.x ? "right" : "left") : "right";

  return <div className="arena-wrap">
    <div className="arena-stage" ref={stage} onPointerDown={tap}>
      <img className="arena-bg" src={groundsArt.url} alt="Riverside Sanctuary training grounds" draggable={false}/>
      <span className="arena-label">TRAINING GROUNDS</span>
      <div className="boss-hud arena-hud" role="status" aria-label={`Training dummy health ${dm.hp} of ${DUMMY_HP}`}>
        <div className="boss-hud-row"><span className="boss-name">DUMMY <small>{dm.hp}/{DUMMY_HP} HP · {dm.total} dealt</small></span></div>
        <div className="boss-bar"><span className="boss-bar-fill" style={{ width: `${(dm.hp / DUMMY_HP) * 100}%` }}/></div>
      </div>
      <span className={`arena-dummy ${reacting ? `is-hit hit-${dm.kind.toLowerCase()} ${dm.heavy ? "is-heavy" : ""}` : ""}`} aria-label={`Training dummy, ${dm.hits} hits`}
        style={{ left: `${c.l}%`, top: `${c.t}%`, width: `${c.w}%`, height: `${c.h}%`, zIndex: 5 + Math.round(DUMMY.y),
          backgroundImage: `url(${groundsArt.url})`, backgroundSize: `${10000 / c.w}% ${10000 / c.h}%`,
          backgroundPosition: `${(c.l / (100 - c.w)) * 100}% ${(c.t / (100 - c.h)) * 100}%`, ["--dir" as string]: dm.dir }}>
        <span className="arena-dummy-hp" aria-hidden="true"><span style={{ width: `${(dm.hp / DUMMY_HP) * 100}%` }}/></span>
        {reacting && <span key={dm.hits} className={`arena-hitmark ${dm.heavy ? "is-heavy" : ""}`}>−{dm.dmg}{dm.heavy ? " POW!" : ""}</span>}
      </span>
      {(["Brix", "Lowkey", "Oz"] as Fighter[]).filter(z => z !== zig).map(z => { const q = crewPos.current[z]; return <span key={z} className={`haven-zig marker-${z.toLowerCase()}`} onPointerDown={e => { const l = lastTap.current, now = performance.now(); if (l && l.z === z && now - l.t < 380) { e.stopPropagation(); lastTap.current = null; target.current = null; setZig(z); } else lastTap.current = { z, t: now }; }} style={{ left: `${q.x}%`, ["--fy" as string]: `${100 - q.y}%`, zIndex: 5 + Math.round(q.y), transitionDuration: "0ms", ["--depth" as string]: String(depthAt(q.y)) }}><span className="arena-shadow" aria-hidden="true"/><span className="sprite-stage" style={{ transform: `scale(${depthAt(q.y)})`, transformOrigin: "50% 100%" }}><CharacterSprite character={z}/></span></span>; })}
      <span className={`haven-zig marker-${zig.toLowerCase()} ${walking.current ? `is-walking ${zig.toLowerCase()}-facing-${f} facing-${f}` : ""} ${roll.current ? "is-rolling" : ""} ${sw ? `is-attacking ${atkPose(zig, sw.heavy)} facing-${atkSide} ${zig.toLowerCase()}-facing-${atkSide}` : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, zIndex: 5 + Math.round(p.y), transitionDuration: "0ms", ["--depth" as string]: String(depthAt(p.y)) }}><span className="arena-shadow" aria-hidden="true"/><span className="sprite-stage" style={{ transform: `scale(${depthAt(p.y)})`, transformOrigin: "50% 100%" }}><CharacterSprite character={zig}/></span></span>
      {debug && <>
        <span className="arena-box is-hurt-box" style={boxStyle(hurtbox(zig, p, depthAt(p.y)))}/>
        <span className="arena-box is-hurt-box" style={boxStyle(hurtbox("Brix", DUMMY, 1.3))}/>
        <span className={`arena-box is-attack-box ${phase === "active" ? "is-live" : ""}`} style={boxStyle(attackBox(zig, p, sw?.facing ?? f, depthAt(p.y)))}/>
      </>}
    </div>
    <div className="arena-controls" onPointerDown={e => e.stopPropagation()}>
      {(["Brix", "Lowkey", "Oz"] as Fighter[]).map(z => <button key={z} type="button" className={`zone-chip ${z === zig ? "is-active" : ""}`} onClick={() => setZig(z)}>{z}</button>)}
      <button type="button" className={`zone-chip ${debug ? "is-active" : ""}`} onClick={() => setDebug(d => !d)}>BOXES {debug ? "ON" : "OFF"}</button>
      <span className="arena-log">{log}</span>
    </div>
    {typeof document !== "undefined" && createPortal(<>
      <button type="button" className={`combat-attack ${charged ? "is-charged" : ""}`} aria-label={`Attack with ${zig} — hold for heavy`}
        onPointerDown={e => { e.preventDefault(); e.stopPropagation(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* older Safari */ } press(); }}
        onPointerUp={e => { e.stopPropagation(); release(); }}
        onPointerCancel={() => { clearTimeout(chargeTimer.current); setCharged(false); pressAt.current = 0; }}
        onContextMenu={e => e.preventDefault()}><span>ATTACK</span><small>{zig}</small></button>
      <button type="button" className="combat-dodge" aria-label={`Dodge roll with ${zig}`} onPointerDown={e => { e.preventDefault(); e.stopPropagation(); dodge(); }} onContextMenu={e => e.preventDefault()}><span>DODGE</span></button>
    </>, document.body)}
  </div>;
}
