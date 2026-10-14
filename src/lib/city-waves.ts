import type { Point } from "@/lib/zones";

// Avenue, bus flank and temple steps; later waves mix the three approaches.
const ENTRANCES: Point[][] = [
  [{ x: 46, y: 44 }, { x: 50, y: 46 }, { x: 54, y: 44 }],
  [{ x: 4, y: 62 }, { x: 6, y: 68 }, { x: 4, y: 74 }],
  [{ x: 94, y: 50 }, { x: 96, y: 56 }, { x: 94, y: 62 }],
];
const WAVES = [[0, 1, 2], [0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [0, 1, 0, 2], [1, 2, 1, 2, 0], [0, 0, 1, 2, 0], [1, 2, 0, 1, 2, 0], [0, 1, 2, 0, 1, 2]];
export const CITY_WAVES = WAVES.length;

export function cityWaveSpawns(wave: number): Point[] {
  const used = [0, 0, 0];
  return (WAVES[wave] ?? []).map(entrance => {
    const lane = ENTRANCES[entrance];
    if (!lane) return { x: 50, y: 44 };
    const slot = used[entrance] ?? 0;
    used[entrance] = slot + 1;
    const p = lane[slot % lane.length] ?? { x: 50, y: 44 };
    return { x: p.x + (slot >= lane.length ? 2 : 0), y: p.y + (slot >= lane.length ? 3 : 0) };
  });
}