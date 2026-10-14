import { afterEach, describe, expect, it } from "vitest";
import { cityWaveSpawns, CITY_WAVES } from "@/lib/city-waves";
import { meleeTarget } from "@/lib/combat-targeting";
import { hitCtx, makeRat, zapRats } from "@/lib/rat-ai";

const crew = { Brix: { x: 50, y: 65 }, Oz: { x: 30, y: 65 }, Lowkey: { x: 70, y: 65 } };
afterEach(() => { hitCtx.by = "Oz"; hitCtx.heavy = false; });

describe("Brix rat punches", () => {
  it("hits a nearby rat even when the cursor is on empty ground", () => {
    const rat = makeRat(1, { x: 60, y: 65 });
    const target = meleeTarget([rat], crew.Brix, 14, { x: 10, y: 90 });
    expect(target).toBe(rat);
    if (!target) throw new Error("Missing reachable target");
    hitCtx.by = "Brix";
    expect(zapRats([rat], { x: target.x, y: target.y - 4 }, crew)).toBe(true);
    expect(rat.hp).toBe(1);
    expect(rat.hitBy).toBe("Brix");
  });
  it("does not let a distant aimed rat steal a reachable punch", () => {
    const near = { x: 59, y: 65 }, far = { x: 90, y: 65 };
    expect(meleeTarget([far, near], crew.Brix, 14, far)).toBe(near);
    expect(meleeTarget([far], crew.Brix, 14, far)).toBeUndefined();
  });
  it("keeps cursor preference among reachable rats", () => {
    const left = { x: 40, y: 65 }, right = { x: 60, y: 65 };
    expect(meleeTarget([left, right], crew.Brix, 14, { x: 60, y: 61 })).toBe(right);
  });
  it("charged punch defeats and launches a rat away from Brix", () => {
    const rat = makeRat(1, { x: 60, y: 65 });
    hitCtx.by = "Brix"; hitCtx.heavy = true;
    expect(zapRats([rat], { x: 60, y: 61 }, crew)).toBe(true);
    expect(rat.hp).toBe(0); expect(rat.dead).toBeGreaterThan(0); expect(rat.launch).toBe(1);
  });
});

describe("Old City reinforcements", () => {
  it("adds eight waves after the original three rats", () => {
    expect(CITY_WAVES).toBe(9);
    expect(Array.from({ length: CITY_WAVES }, (_, i) => cityWaveSpawns(i).length)).toEqual([3, 3, 4, 4, 4, 5, 5, 6, 6]);
    expect(cityWaveSpawns(9)).toEqual([]);
  });
  it("uses all three approaches and keeps every spawn on combat ground", () => {
    const spawns = Array.from({ length: CITY_WAVES }, (_, i) => cityWaveSpawns(i)).flat();
    expect(spawns.some(p => p.x < 10)).toBe(true);
    expect(spawns.some(p => p.x > 90)).toBe(true);
    expect(spawns.some(p => p.x > 40 && p.x < 60)).toBe(true);
    for (const p of spawns) { expect(p.x).toBeGreaterThanOrEqual(4); expect(p.x).toBeLessThanOrEqual(96); expect(p.y).toBeGreaterThanOrEqual(44); expect(p.y).toBeLessThanOrEqual(95); }
  });
});