import { describe, expect, it } from "vitest";
import { IFRAME_MS, KILLS_PER_HEAL, KNEEL_MS, MAX_BITERS, RECOVERY_RADIUS, RECOVERY_PUSH_X, RECOVERY_PUSH_Y, RECOVERY_PAUSE_SECONDS, allDown, damage, fullSquad, heal, isDown, revive } from "@/lib/squad-health";

describe("squad health", () => {
  it("Brix takes 5 bites, Lowkey and Oz 4", () => {
    expect(fullSquad()).toEqual({ Brix: 5, Lowkey: 4, Oz: 4 });
    let s = fullSquad();
    for (let i = 0; i < 4; i++) s = damage(s, "Brix");
    expect(isDown(s, "Brix")).toBe(false);
    expect(isDown(damage(s, "Brix"), "Brix")).toBe(true);
  });
  it("weaker bounce-back returns each Zig with only one bite remaining", () => {
    for (const a of ["Brix", "Oz", "Lowkey"] as const) {
      const s = damage(fullSquad(), a, 5);
      const recovered = revive(s, a);
      expect(recovered[a]).toBe(1);
      expect(isDown(damage(recovered, a), a)).toBe(true);
    }
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
    expect(MAX_BITERS).toBe(6);
  });
  it("makes Zigs vulnerable again after 0.6s bite grace", () => {
    expect(IFRAME_MS).toBe(350);
  });
  it("keeps healing every 3 kills", () => {
    expect(KILLS_PER_HEAL).toBe(3);
  });
  it("halves the bounce-back clearance and rat pause", () => {
    expect(RECOVERY_RADIUS).toBe(7);
    expect(RECOVERY_PUSH_X).toBe(30);
    expect(RECOVERY_PUSH_Y).toBe(17.5);
    expect(RECOVERY_PAUSE_SECONDS).toBe(0.2);
  });
});

describe("second wind limit", () => {
  it("lets a Zig bounce back once per wave, then stay down", async () => {
    const { mayBounceBack } = await import("@/lib/squad-health");
    expect(mayBounceBack(0)).toBe(true);
    expect(mayBounceBack(1)).toBe(false);
  });
});
