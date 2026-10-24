import { describe, expect, it } from "vitest";
import { PROLOGUE_SCENES } from "@/lib/prologue";

describe("Old City broken MP3 discovery", () => {
  const city = PROLOGUE_SCENES.find(scene => scene.id === "city");

  it("gives the post-rat discovery to Oz only", () => {
    const mp3 = city?.objectives.find(objective => objective.spot === "crossing");
    expect(mp3?.owner).toBe("Oz");
    expect(mp3?.afterCombat).toBe(true);
  });

  it("requires the discovery before leaving for the Library", () => {
    expect(city?.objectives.find(objective => objective.spot === "library")?.needs).toContain("crossing");
  });
});