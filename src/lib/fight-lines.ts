import type { Agent } from "@/lib/zones";

/** When a fight line may be said. "any" = whenever that Zig is fighting. */
export type FightCue = "any" | "zap-hit" | "behind-teammate" | "foe-at-feet" | "foe-close" | "crowd";
export type FightLine = { who: Agent; text: string; cue: FightCue };

/** Mid-fight banter for rat ambushes and the Shelton fight, picked every 5–8s. */
export const FIGHT_LINES: FightLine[] = [
  { who: "Oz", text: "Have some of that!", cue: "any" },
  { who: "Oz", text: "Oi! Watch the hair!", cue: "foe-close" },
  { who: "Oz", text: "Zapped ya!", cue: "zap-hit" },
  { who: "Brix", text: "Come here, you!", cue: "any" },
  { who: "Brix", text: "Who wants the next one?", cue: "any" },
  { who: "Brix", text: "Stop biting my boots!", cue: "foe-at-feet" },
  { who: "Lowkey", text: "Get OFF!", cue: "foe-close" },
  { who: "Lowkey", text: "There’s one behind you!", cue: "behind-teammate" },
  { who: "Lowkey", text: "Why are there SO MANY?!", cue: "crowd" },
];

export const FIGHT_GAP_MS: [number, number] = [2500, 3800];

/** Encounter memory: Old City is the first time they meet the rats; the Long Walk remembers them. */
export const RAT_ALARM = {
  city: "Mutant rats — something none of you have EVER seen before — are charging down the avenue and rushing in from beside the wrecked bus and the temple steps!",
  longWalk: "The same ugly mutant rats you fought back in the Old City just burst from the grass on the long walk and are charging you again!",
};
/** Instant scripted reactions the moment wave 1 charges in (spaced so bubbles never overlap). */
export const ARRIVAL_GAP_MS = 2200;
export const CITY_RAT_ARRIVAL: [Agent, string][] = [
  ["Brix", "Hold up—INCOMING! What are those things?!"],
  ["Oz", "Are those... RATS?! Why do they have so many teeth?!"],
  ["Lowkey", "They’re fast! Form up!"],
];
export const LONG_WALK_RAT_RECALL: [Agent, string][] = [
  ["Brix", "Oh, it’s those ugly rats again!"],
  ["Lowkey", "They’re tracking us. Watch the grass!"],
  ["Oz", "Come on then! I’ve got plenty of voltage left!"],
];

/** First sight of Shelton: they know the rats now, but have never seen anything like him. */
export const SHELTON_FIRST_SIGHT: [Agent, string][] = [
  ["Lowkey", "Is that a mutant turtle?!"],
  ["Brix", "What even is that thing?"],
  ["Oz", "I dno lads?"],
  ["Lowkey", "Looks angry."],
];

/** Old City swarm choreography: Brix takes centre stage, then the others rejoin him. */
export const BRIX_SWARM_CALL = "Oi, boys! Stand back. I’ve got this!";
export const SWARM_CLEARED: [Agent, string][] = [
  ["Oz", "Alright, alright… show-off!"],
  ["Lowkey", "Okay. That was actually impressive."],
];
