import { describe, expect, it } from "vitest";

import { checkFreeTalkInput } from "@/lib/free-talk";

describe("Free Talk input rules", () => {
  it("accepts a short message from a crew member and trims it", () => {
    expect(checkFreeTalkInput({ agent: "Brix", said: "  nice shot, eh?  " })).toEqual({ agent: "Brix", said: "nice shot, eh?", scene: "the Sanctuary" });
  });

  it("keeps the scene the caller describes", () => {
    expect(checkFreeTalkInput({ agent: "Brix", said: "hi", scene: "the training grounds" }).scene).toBe("the training grounds");
  });

  it("refuses an unknown speaker", () => {
    expect(() => checkFreeTalkInput({ agent: "Kronk", said: "hello" })).toThrow("Unknown crew member.");
  });

  it("refuses an empty message", () => {
    expect(() => checkFreeTalkInput({ agent: "Brix", said: "   " })).toThrow("Say something first.");
  });

  it("refuses a message over 180 characters", () => {
    expect(() => checkFreeTalkInput({ agent: "Brix", said: "x".repeat(181) })).toThrow("Keep it under 180 characters.");
  });
});
