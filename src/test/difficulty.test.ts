import { describe, expect, it } from "vitest";
import { SHELTON_TUNING } from "@/lib/difficulty";

describe("Shelton difficulty", () => {
  it("hard charge takes 2 pips, easy and normal take 1", () => {
    expect(SHELTON_TUNING.hard.charge).toBe(2);
    expect(SHELTON_TUNING.normal.charge).toBe(1);
    expect(SHELTON_TUNING.easy.charge).toBe(1);
  });
  it("easy slam does no damage", () => {
    expect(SHELTON_TUNING.easy.slam).toBe(0);
  });
});
