/** Quest: The First Signs of Life — persistent, client-only (localStorage). */
export type QuestStage = "none" | "hungry" | "fish" | "vale-up" | "vale-home" | "done";
export const QUEST_KEY = "zygoria-quest-first-signs-v1";
const ORDER: QuestStage[] = ["none", "hungry", "fish", "vale-up", "vale-home", "done"];
/** Orin keeps up his distrust this long before the Haven's hunger slips out. */
export const DISTRUST_MS = 150_000;

export function loadQuest(): QuestStage {
  try { const s = localStorage.getItem(QUEST_KEY) as QuestStage | null; return s && ORDER.includes(s) ? s : "none"; } catch { return "none"; }
}
/** Stages only move forward; returns the stage actually stored. */
export function advanceQuest(to: QuestStage): QuestStage {
  const cur = loadQuest();
  if (ORDER.indexOf(to) <= ORDER.indexOf(cur)) return cur;
  try { localStorage.setItem(QUEST_KEY, to); } catch { /* storage blocked */ }
  return to;
}
/** Vale may only climb once fish has reached the Haven. */
export const valeMayClimb = (s: QuestStage) => s === "fish";
export const QUEST_OBJECTIVE: Partial<Record<QuestStage, string>> = {
  hungry: "Catch fish at the Sanctuary and bring it down to the Haven",
  fish: "Take the fish down to Elder Orin",
  "vale-up": "Show Vale the Sanctuary, then bring him home",
};
