import { describe, expect, it } from "vitest";
import { targetsShelton, SHELTON_REACH } from "@/lib/lair-shelton";

describe("Shelton intercepting lair attacks", () => {
  it("uses Old City's character attack ranges", () => {
    expect(SHELTON_REACH).toEqual({ Oz: 42, Brix: 14, Lowkey: 9 });
  });
  it("does not fight before Kronk sends him in", () => {
    expect(targetsShelton({ x: 65, y: 80 }, { x: 65, y: 79 }, false, 15)).toBe(false);
    expect(targetsShelton({ x: 65, y: 80 }, { x: 65, y: 79 }, true, 15)).toBe(true);
  });
  it("leaves a nearer Kronk strike alone", () => {
    expect(targetsShelton({ x: 50, y: 65 }, { x: 70, y: 65 }, true, 45)).toBe(false);
  });
  it("cannot intercept an out-of-range swing", () => {
    expect(targetsShelton({ x: 90, y: 90 }, { x: 90, y: 70 }, true, 15)).toBe(false);
  });
});