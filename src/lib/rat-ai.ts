import type { Agent, Point } from "@/lib/zones";

/** Shared mutant-rat behaviour: charge → telegraphed bite → retreat → pause → charge again. 2 HP; each zap flashes + recoils. */
export type RatMode = "charge" | "windup" | "bite" | "retreat" | "pause";
export type Rat = { id: number; x: number; y: number; hp: number; dead: number; flip: boolean; mode: RatMode; t: number; hurt: number; back: Point; hitBy?: Agent; launch?: number };
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
  const c = Object.values(crew).reduce((b, v) => (Math.hypot(v.x - r.x, v.y - r.y) < Math.hypot(b.x - r.x, b.y - r.y) ? v : b));
  const dx = c.x - r.x, dy = c.y - r.y, d = Math.hypot(dx, dy) || 0.001;
  r.t += dt;
  const go = (p: Point, sp: number) => { const ex = p.x - r.x, ey = p.y - r.y, e = Math.hypot(ex, ey); if (e < sp * dt) { r.x = p.x; r.y = p.y; return true; } r.x += ex / e * sp * dt; r.y += ey / e * sp * dt; r.flip = ex < 0; return false; };
  if (r.mode === "charge") {
    if (d < 3.2) { r.mode = "windup"; r.t = 0; r.flip = dx < 0; }
    else go(c, 17);
  } else if (r.mode === "windup" && r.t > 0.4) {
    r.mode = "bite"; r.t = 0; if (d < 5) hurt(2);
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
export type CombatApi = { targets: () => Point[]; bounds: () => Bounds };
export const DEFAULT_BOUNDS: Bounds = { x0: 4, x1: 96, y0: 44, y1: 95 };
