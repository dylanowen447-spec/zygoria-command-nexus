import type { Agent, Point } from "@/lib/zones";

/** Shared mutant-rat behaviour: charge → telegraphed bite → retreat → pause → charge again. 2 HP; each zap flashes + recoils. */
export type RatMode = "charge" | "windup" | "bite" | "retreat" | "pause";
export type Rat = { id: number; x: number; y: number; hp: number; dead: number; flip: boolean; mode: RatMode; t: number; hurt: number; back: Point; hitBy?: Agent; launch?: number; kv?: Point | undefined };
/** Who is landing the current blow, set by the scene just before calling the hit handler, so rats react to a punch vs a zap. */
export const hitCtx: { by: Agent; heavy?: boolean } = { by: "Oz" };
export const RAT_HP = 2;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function makeRat(id: number, p: Point): Rat {
  return { id, x: p.x, y: p.y, hp: RAT_HP, dead: 0, flip: false, mode: "charge", t: 0, hurt: 0, back: p };
}

/** Pick spawn points that are far from every Zig (falls back to the farthest candidates). */
export function farSpawns(cands: Point[], crew: Record<Agent, Point>, n: number): Point[] {
  const dist = (p: Point) => Math.min(...Object.values(crew).map(c => Math.hypot(c.x - p.x, c.y - p.y)));
  return [...cands].sort((a, b) => dist(b) - dist(a)).slice(0, n);
}

export function stepRat(r: Rat, dt: number, crew: Record<Agent, Point>, hurt: (n: number) => void) {
  if (r.dead) return;
  // Knockback slide: a punched rat skids across the street, decaying fast, never past the bounds.
  if (r.kv) {
    r.x = clamp(r.x + r.kv.x * dt, 3, 97); r.y = clamp(r.y + r.kv.y * dt, 42, 97);
    const k = Math.pow(0.02, dt); r.kv = { x: r.kv.x * k, y: r.kv.y * k };
    if (Math.hypot(r.kv.x, r.kv.y) < 3) r.kv = undefined; else return;
  }
  const c = Object.values(crew).reduce((b, v) => (Math.hypot(v.x - r.x, v.y - r.y) < Math.hypot(b.x - r.x, b.y - r.y) ? v : b));
  const dx = c.x - r.x, dy = c.y - r.y, d = Math.hypot(dx, dy) || 0.001;
  r.t += dt;
  const go = (p: Point, sp: number) => { const ex = p.x - r.x, ey = p.y - r.y, e = Math.hypot(ex, ey); if (e < sp * dt) { r.x = p.x; r.y = p.y; return true; } r.x += ex / e * sp * dt; r.y += ey / e * sp * dt; r.flip = ex < 0; return false; };
  if (r.mode === "charge") {
    if (d < 3.2) { r.mode = "windup"; r.t = 0; r.flip = dx < 0; }
    else go(c, 17);
  } else if (r.mode === "windup" && r.t > 0.4) {
    r.mode = "bite"; r.t = 0;
    // Lunge: the rat snaps forward into the Zig as it bites.
    r.x = clamp(r.x + dx / d * Math.min(2, d * 0.6), 3, 97); r.y = clamp(r.y + dy / d * Math.min(1.2, d * 0.4), 42, 97);
    if (d < 5) { hurt(2); const m = (Object.keys(crew) as Agent[]).filter(k => crew[k] === c), who = m.length > 1 && m.includes("Brix" as Agent) ? ("Brix" as Agent) : m[0]; if (who && typeof window !== "undefined") { window.dispatchEvent(new CustomEvent("zig-hurt", { detail: who })); window.dispatchEvent(new CustomEvent("zig-bitten", { detail: { who, dx: dx / d, dy: dy / d } })); } }
  } else if (r.mode === "bite" && r.t > 0.3) {
    r.mode = "retreat"; r.t = 0;
    r.back = { x: clamp(r.x - dx / d * 13, 3, 97), y: clamp(r.y - dy / d * 9, 42, 97) };
  } else if (r.mode === "retreat" && (go(r.back, 22) || r.t > 1.1)) {
    r.mode = "pause"; r.t = 0; r.flip = dx < 0;
  } else if (r.mode === "pause" && r.t > 0.7 + (r.id % 3) * 0.25) {
    r.mode = "charge"; r.t = 0;
  }
}

/** One zap = at most one rat damaged. Returns true when a rat was hit. */
export function zapRats(rats: Rat[], p: Point, crew: Record<Agent, Point>): boolean {
  let best: Rat | null = null, bd = Infinity;
  for (const r of rats) {
    if (r.dead) continue;
    const dx = Math.abs(r.x - p.x), dy = p.y - r.y; // rat art sits above its feet point
    if (dx > 5.5 || dy > 2 || dy < -10) continue;
    const s = dx + Math.abs(dy + 4); if (s < bd) { bd = s; best = r; }
  }
  if (!best) return false;
  const r = best, now = performance.now();
  const by = hitCtx.by, punch = by === "Brix";
  const src = crew[by] ?? crew.Oz, ex = r.x - src.x, ey = r.y - src.y, e = Math.hypot(ex, ey) || 1;
  // Brix's charged punch sends a rat flying clean off the screen.
  if (punch && hitCtx.heavy) { r.hp = 0; r.hurt = now; r.hitBy = by; r.dead = now; r.launch = ex >= 0 ? 1 : -1; return true; }
  r.hp -= 1; r.hurt = now; r.hitBy = by;
  if (r.hp <= 0) { r.dead = now; return true; }
  const kb = punch ? 7 : by === "Oz" ? 1 : 3;
  r.x = clamp(r.x + ex / e * kb, 3, 97); r.y = clamp(r.y + ey / e * kb * 0.6, 42, 97);
  r.flip = ex > 0; // face the attacker while reeling
  r.mode = "pause"; r.t = punch ? -0.5 : by === "Oz" ? -0.6 : 0; // stunned a beat longer
  return true;
}

export function ratFrame(r: Rat, now: number) {
  if (r.dead) return 12;
  if (now - r.hurt < (r.hitBy === "Oz" ? 500 : 350)) return 11;
  if (r.mode === "windup") return 8;
  if (r.mode === "bite") return r.t < 0.15 ? 9 : 10;
  if (r.mode === "pause") return Math.floor(now / 300) % 2;
  return 4 + Math.floor(now / 90) % 4;
}

/** What an ambush shares with the scene for direct combat: live enemy feet points and the safe ground to fight on. */
export type Bounds = { x0: number; x1: number; y0: number; y1: number };
export type CombatApi = { targets: () => Point[]; bounds: () => Bounds; stage?: () => StagePlan };
export const DEFAULT_BOUNDS: Bounds = { x0: 4, x1: 96, y0: 44, y1: 95 };

/** Soft spacing so rats never stack inside each other (cheap O(n²), fine for ~20 rats). */
export function separateRats(rats: Rat[], dt: number, min = 4.5) {
  const live = rats.filter(r => !r.dead);
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i]!, b = live[j]!, dx = a.x - b.x, dy = (a.y - b.y) * 1.6, d = Math.hypot(dx, dy);
    if (d >= min) continue;
    const ux = d < 0.01 ? (a.id % 2 ? 1 : -1) : dx / d, uy = d < 0.01 ? 0 : dy / d / 1.6, k = Math.min(1, (min - d) * 6 * dt);
    a.x = clamp(a.x + ux * k, 3, 97); a.y = clamp(a.y + uy * k, 42, 97);
    b.x = clamp(b.x - ux * k, 3, 97); b.y = clamp(b.y - uy * k, 42, 97);
  }
}

/** Swarm-only extra impact for Brix: every other rat near the blow is flung away from him (1 damage each, his normal value). */
export function brixShockwave(rats: Rat[], p: Point, brix: Point, radius = 9): number {
  let n = 0; const now = performance.now();
  for (const r of rats) {
    if (r.dead || now - r.hurt < 30) continue; // skip the rat the main punch just hit
    if (Math.hypot(r.x - p.x, (r.y - 4 - p.y) * 1.4) > radius) continue;
    const ex = r.x - brix.x, ey = r.y - brix.y, e = Math.hypot(ex, ey) || 1;
    r.hp -= 1; r.hurt = now; r.hitBy = "Brix"; n++;
    if (r.hp <= 0) { r.dead = now; continue; }
    r.kv = { x: ex / e * 70, y: ey / e * 40 }; r.flip = ex > 0; r.mode = "pause"; r.t = -0.6;
  }
  return n;
}

/** Choreography hold-spots a scene can ask the crew to keep (null = normal companion AI). */
export type StagePlan = Partial<Record<Agent, Point>> | null;
