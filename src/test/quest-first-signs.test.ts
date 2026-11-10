import { beforeEach, describe, expect, it } from "vitest";
import { advanceQuest, loadQuest, valeMayClimb, maraMaySpeak, DISTRUST_MS } from "@/lib/quest-first-signs";

describe("First Signs of Life quest", () => {
  beforeEach(() => localStorage.clear());
  it("Orin distrusts for at least 2 minutes before the hunger", () => { expect(DISTRUST_MS).toBeGreaterThanOrEqual(120_000); expect(DISTRUST_MS).toBeLessThanOrEqual(180_000); });
  it("Vale cannot climb before fish is brought", () => { expect(valeMayClimb("none")).toBe(false); expect(valeMayClimb("hungry")).toBe(false); expect(valeMayClimb("fish")).toBe(true); });
  it("stages never go backwards", () => { advanceQuest("fish"); expect(advanceQuest("hungry")).toBe("fish"); expect(loadQuest()).toBe("fish"); });
  it("Mara's beat waits for Vale's completed report", () => {
    for (const stage of ["none", "hungry", "fish", "vale-up", "vale-home"] as const) expect(maraMaySpeak(stage)).toBe(false);
    advanceQuest("done"); expect(maraMaySpeak(loadQuest())).toBe(true);
  });
  it("completed Vale saves can progress to Mara without repeating her beat", () => {
    advanceQuest("done"); advanceQuest("mara-convinced");
    expect(loadQuest()).toBe("mara-convinced");
    expect(maraMaySpeak(loadQuest())).toBe(false);
    expect(advanceQuest("vale-home")).toBe("mara-convinced");
    expect(valeMayClimb(loadQuest())).toBe(false);
  });
});
