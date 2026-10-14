import type { Point } from "@/lib/zones";

const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Cursor preference never overrides a reachable enemy with an out-of-range one. */
export function meleeTarget(targets: Point[], from: Point, reach: number, cursor: Point | null): Point | undefined {
  const reachable = targets.filter(t => distance(from, t) <= reach);
  if (cursor) {
    const aimed = reachable.filter(t => distance({ x: t.x, y: t.y - 4 }, cursor) <= 10);
    if (aimed.length) return aimed.sort((a, b) => distance(a, cursor) - distance(b, cursor))[0];
  }
  return reachable.sort((a, b) => distance(a, from) - distance(b, from))[0];
}