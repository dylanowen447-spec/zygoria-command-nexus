import { beforeEach, describe, expect, it } from "vitest";
import { advanceQuest, loadQuest, valeMayClimb, DISTRUST_MS } from "@/lib/quest-first-signs";

describe("First Signs of Life quest", () => {
  beforeEach(() => localStorage.clear());
  it("Orin distrusts for at least 2 minutes before the hunger", () => { expect(DISTRUST_MS).toBeGreaterThanOrEqual(120_000); expect(DISTRUST_MS).toBeLessThanOrEqual(180_000); });
  it("Vale cannot climb before fish is brought", () => { expect(valeMayClimb("none")).toBe(false); expect(valeMayClimb("hungry")).toBe(false); expect(valeMayClimb("fish")).toBe(true); });
  it("stages never go backwards", () => { advanceQuest("fish"); expect(advanceQuest("hungry")).toBe("fish"); expect(loadQuest()).toBe("fish"); });
});
