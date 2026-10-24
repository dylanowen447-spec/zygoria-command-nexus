import { describe, expect, it } from "vitest";
import { IFRAME_MS, KILLS_PER_HEAL, KNEEL_MS, MAX_BITERS, allDown, damage, fullSquad, heal, isDown, revive } from "@/lib/squad-health";

describe("squad health", () => {
  it("Brix takes 5 bites, Lowkey and Oz 4", () => {
    expect(fullSquad()).toEqual({ Brix: 5, Lowkey: 4, Oz: 4 });
    let s = fullSquad();
    for (let i = 0; i < 4; i++) s = damage(s, "Brix");
    expect(isDown(s, "Brix")).toBe(false);
    expect(isDown(damage(s, "Brix"), "Brix")).toBe(true);
  });
  it("revive brings a downed Zig back to 2", () => {
    const s = damage(fullSquad(), "Oz", 4);
    expect(revive(s, "Oz").Oz).toBe(2);
  });
  it("heal skips downed Zigs and caps at max", () => {
    const s = heal(damage(fullSquad(), "Oz", 4));
    expect(s.Oz).toBe(0); expect(s.Brix).toBe(5);
  });
  it("game over only when all three are down", () => {
    let s = damage(damage(fullSquad(), "Oz", 4), "Lowkey", 4);
    expect(allDown(s)).toBe(false);
    s = damage(s, "Brix", 5);
    expect(allDown(s)).toBe(true);
  });
  it("slows the knee bounce-back to 2 seconds", () => {
    expect(KNEEL_MS).toBe(2000);
  });
  it("allows four rats to attack together", () => {
    expect(MAX_BITERS).toBe(4);
  });
  it("keeps 0.8s bite grace and healing every 3 kills", () => {
    expect(IFRAME_MS).toBe(800); expect(KILLS_PER_HEAL).toBe(3);
  });
});

describe("second wind limit", () => {
  it("lets a Zig bounce back once per wave, then stay down", async () => {
    const { mayBounceBack } = await import("@/lib/squad-health");
    expect(mayBounceBack(0)).toBe(true);
    expect(mayBounceBack(1)).toBe(false);
  });
});
