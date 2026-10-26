import { describe, expect, it } from "vitest";
import { EMPTY_STORY, cavesUnlocked } from "@/lib/story";

describe("Caves exit gating", () => {
  it("stays hidden for a brand-new crew", () => {
    expect(cavesUnlocked(EMPTY_STORY)).toBe(false);
  });

  it("stays hidden while Moxi is still being won over", () => {
    expect(cavesUnlocked({ beats: ["spotted", "hiding", "feeding", "naming", "trust"] })).toBe(false);
  });

  it("opens only after Thoth has told Lowkey about the people under the mountains", () => {
    expect(cavesUnlocked({ beats: ["spotted", "hiding", "feeding", "naming", "trust", "thoth"] })).toBe(true);
  });
});
