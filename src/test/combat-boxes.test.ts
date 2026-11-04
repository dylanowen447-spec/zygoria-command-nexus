import { describe, expect, it } from "vitest";
import { attackBox, attackPhase, hurtbox, resolveSwing } from "@/lib/combat-boxes";

const rat = (x: number, y: number) => ({ id: 1, box: hurtbox("Rat", { x, y }) });

describe("combat boxes", () => {
  it("Brix punching right hits a rat in front", () => {
    expect(resolveSwing(attackBox("Brix", { x: 50, y: 60 }, "right"), [rat(60, 60)], new Set())).toHaveLength(1);
  });
  it("Brix punching right never hits a rat behind him", () => {
    expect(resolveSwing(attackBox("Brix", { x: 50, y: 60 }, "right"), [rat(42, 60)], new Set())).toHaveLength(0);
  });
  it("one swing hits the same rat only once", () => {
    const struck = new Set<number>(), box = attackBox("Lowkey", { x: 50, y: 60 }, "left");
    expect(resolveSwing(box, [rat(43, 60)], struck)).toHaveLength(1);
    expect(resolveSwing(box, [rat(43, 60)], struck)).toHaveLength(0);
  });
  it("Oz's zap reaches far but stays narrow", () => {
    const box = attackBox("Oz", { x: 20, y: 60 }, "right");
    expect(resolveSwing(box, [rat(55, 60)], new Set())).toHaveLength(1);
    expect(resolveSwing(box, [rat(55, 75)], new Set())).toHaveLength(0);
  });
  it("damage only lands in the active window, not on button press", () => {
    expect(attackPhase("Brix", 0)).toBe("startup");
    expect(attackPhase("Brix", 150)).toBe("active");
    expect(attackPhase("Brix", 300)).toBe("recovery");
  });
});
