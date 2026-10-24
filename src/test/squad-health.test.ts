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
  it("balance: 1.2s knee, 0.8s bite grace, 3 biters, heal every 3 kills", () => {
    expect(KNEEL_MS).toBe(1200); expect(IFRAME_MS).toBe(800); expect(MAX_BITERS).toBe(3); expect(KILLS_PER_HEAL).toBe(3);
  });
});
