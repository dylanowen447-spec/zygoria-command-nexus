import type { Point } from "@/lib/zones";

// Avenue, bus flank and temple steps; later waves mix the three approaches.
const ENTRANCES: Point[][] = [
  [{ x: 46, y: 44 }, { x: 50, y: 46 }, { x: 54, y: 44 }],
  [{ x: 4, y: 62 }, { x: 6, y: 68 }, { x: 4, y: 74 }],
  [{ x: 94, y: 50 }, { x: 96, y: 56 }, { x: 94, y: 62 }],
];
const WAVES = [[0, 1, 2], [0, 0, 0], [1, 1, 1, 1], [2, 2, 2, 2], [0, 1, 0, 2], [1, 2, 1, 2, 0], [0, 0, 1, 2, 0], [1, 2, 0, 1, 2, 0], [0, 1, 2, 0, 1, 2]];
export const CITY_WAVES = WAVES.length;

/** Wave 1 is Brix's showcase swarm: 18 rats spread over all three approaches. */
export const SWARM_SIZE = 18;
function swarmSpawns(): Point[] {
  return Array.from({ length: SWARM_SIZE }, (_, i) => {
    const lane = i % 3, row = Math.floor(i / 3);
    if (lane === 0) return { x: 40 + (row % 3) * 10 + (row > 2 ? 5 : 0), y: 44 + (row > 2 ? 2 : 0) };
    if (lane === 1) return { x: 4 + (row % 2) * 3, y: 58 + row * 6 };
    return { x: 96 - (row % 2) * 3, y: 48 + row * 7 };
  });
}

export function cityWaveSpawns(wave: number): Point[] {
  if (wave === 0) return swarmSpawns();
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