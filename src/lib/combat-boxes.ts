import type { Point } from "@/lib/zones";

/** Axis-aligned box in world-percentage space (x/y = centre). */
export type Box = { x: number; y: number; w: number; h: number };
export type Facing = "left" | "right" | "up" | "down";
export type Fighter = "Oz" | "Brix" | "Lowkey";

/** Body hurtbox sits above the feet point (y is the ground contact). */
export const HURT: Record<Fighter | "Rat", { w: number; h: number }> = {
  Brix: { w: 7, h: 14 }, Lowkey: { w: 5.5, h: 12 }, Oz: { w: 5, h: 10 }, Rat: { w: 6, h: 5 },
};

/** Forward attack reach/width plus lifecycle timings (ms). */
export const ATTACK: Record<Fighter, { reach: number; width: number; startup: number; active: number; recovery: number; dmg: number }> = {
  Brix: { reach: 12, width: 10, startup: 120, active: 100, recovery: 160, dmg: 2 },
  Lowkey: { reach: 9, width: 12, startup: 80, active: 100, recovery: 120, dmg: 1 },
  Oz: { reach: 38, width: 5, startup: 140, active: 120, recovery: 140, dmg: 1 },
};

export function hurtbox(kind: Fighter | "Rat", feet: Point, depth = 1): Box {
  const s = HURT[kind];
  const w = s.w * depth, h = s.h * depth;
  return { x: feet.x, y: feet.y - h / 2, w, h };
}

/** Attack box projecting forward from the body centre in the facing direction — never behind. */
export function attackBox(kind: Fighter, feet: Point, facing: Facing, depth = 1): Box {
  const a = ATTACK[kind], body = hurtbox(kind, feet, depth);
  const reach = a.reach * depth, width = a.width * depth;
  switch (facing) {
    case "right": return { x: body.x + body.w / 2 + reach / 2, y: body.y, w: reach, h: width };
    case "left": return { x: body.x - body.w / 2 - reach / 2, y: body.y, w: reach, h: width };
    case "up": return { x: body.x, y: body.y - body.h / 2 - reach / 2, w: width, h: reach };
    case "down": return { x: body.x, y: body.y + body.h / 2 + reach / 2, w: width, h: reach };
  }
}

export function overlaps(a: Box, b: Box): boolean {
  return Math.abs(a.x - b.x) * 2 < a.w + b.w && Math.abs(a.y - b.y) * 2 < a.h + b.h;
}

/** Phase of a swing at `elapsed` ms after the button press. */
export function attackPhase(kind: Fighter, elapsed: number): "startup" | "active" | "recovery" | "done" {
  const a = ATTACK[kind];
  if (elapsed < a.startup) return "startup";
  if (elapsed < a.startup + a.active) return "active";
  if (elapsed < a.startup + a.active + a.recovery) return "recovery";
  return "done";
}

/** One swing: resolves hits only while active, each target at most once. */
export function resolveSwing<T extends { id: number; box: Box }>(swing: Box, targets: T[], struck: Set<number>): T[] {
  const hits = targets.filter(t => !struck.has(t.id) && overlaps(swing, t.box));
  hits.forEach(t => struck.add(t.id));
  return hits;
}
