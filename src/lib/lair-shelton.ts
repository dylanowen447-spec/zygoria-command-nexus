export type LairPoint = { x: number; y: number };
export const SHELTON_HP = 20;
export const SHELTON_HOME: LairPoint = { x: 69, y: 59 };
export const SHELTON_REACH = { Oz: 42, Brix: 14, Lowkey: 9 };
export const lairDistance = (a: LairPoint, b: LairPoint) => Math.hypot(a.x - b.x, (a.y - b.y) * 1.4);

/** The active lieutenant can intercept a strike, but never a farther-away boss hit. */
export function targetsShelton(from: LairPoint, shelton: LairPoint, active: boolean, reach: number) {
  return active && lairDistance(from, shelton) <= reach && lairDistance(from, shelton) < lairDistance(from, { x: 50, y: 64 });
}