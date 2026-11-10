/** Quest: The First Signs of Life — persistent, client-only (localStorage). */
export type QuestStage = "none" | "hungry" | "fish" | "vale-up" | "vale-home" | "done" | "mara-convinced" | "kronk-defeated" | "ascent-ready";
export const QUEST_KEY = "zygoria-quest-first-signs-v1";
const ORDER: QuestStage[] = ["none", "hungry", "fish", "vale-up", "vale-home", "done", "mara-convinced", "kronk-defeated", "ascent-ready"];
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
/** Existing completed Vale saves receive Mara's beat on their next Haven visit. */
export const maraMaySpeak = (s: QuestStage) => s === "done";
/** After Kronk falls, Orin calls the exodus on the next Haven visit. */
export const orinMayCallExodus = (s: QuestStage) => s === "kronk-defeated";
export const QUEST_OBJECTIVE: Partial<Record<QuestStage, string>> = {
  hungry: "Catch fish at the Sanctuary and bring it down to the Haven",
  fish: "Take the fish down to Elder Orin",
  "vale-up": "Show Vale the Sanctuary, then bring him home",
  done: "Hear what Mara needs before the people can move above ground",
  "mara-convinced": "Find Blackwater Refinery — Kronk's threat must be stopped before the humans can move",
  "kronk-defeated": "Kronk is down — go back to the Haven and tell Elder Orin",
  "ascent-ready": "Lead the survivors up the Waterfall Descent to the Sanctuary",
};
