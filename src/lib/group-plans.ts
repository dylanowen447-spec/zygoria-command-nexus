import type { Agent } from "@/lib/zones";

/** Sanctuary places the crew can actually walk to together, keyed to whose spot it is. */
export type PlanPlace = { id: "lookout" | "workshop" | "shack" | "crossroads"; name: string; owner: Agent | null; spot: "home" | "work" | "central" };

const PLACES: { place: PlanPlace; match: RegExp }[] = [
  { place: { id: "lookout", name: "the lookout", owner: "Lowkey", spot: "home" }, match: /\b(lookout|overlook|ridge|mountain|summit|up the hill|up top)\b/i },
  { place: { id: "workshop", name: "the workshop", owner: "Brix", spot: "work" }, match: /\b(workshop|garage|workbench|brix'?s (place|rig))\b/i },
  { place: { id: "shack", name: "the shack", owner: "Oz", spot: "home" }, match: /\b(shack|oz'?s place|the radio|speakers?)\b/i },
  { place: { id: "crossroads", name: "the crossroads", owner: null, spot: "central" }, match: /\b(crossroads|the trail|the river|riverbank|the pods?|landing pods?)\b/i },
];

/** A proposal phrase must be close to the place, so a passing mention never triggers a walk. */
const PROPOSAL = /\b(let'?s|lets|we('ll| should| could| go| head)|come on|follow me|i'?ll (go|head|take)|head(ing)? (up|over|down|to)|go(ing)? (up|over|down|to)|walk (up|over|down|to)|meet (at|up))\b/i;
const EVERYONE = /\b(all|everyone|lads|together|us three|the three of us|you lot|both of you)\b/i;

/** Finds the plan the Zigs themselves proposed in their replies, if the Sanctuary can represent it. */
export function findGroupPlan(lines: { agent: Agent; text: string }[], speakers: Agent[]): { place: PlanPlace; who: Agent[]; proposer: Agent } | null {
  for (const { agent, text } of lines) {
    for (const sentence of text.split(/(?<=[.!?])\s+/)) {
      if (!PROPOSAL.test(sentence)) continue;
      const hit = PLACES.find(p => p.match.test(sentence));
      if (!hit) continue;
      const who: Agent[] = EVERYONE.test(sentence) ? ["Oz", "Brix", "Lowkey"] : [...new Set<Agent>([agent, ...speakers])];
      return { place: hit.place, who, proposer: agent };
    }
  }
  return null;
}

/** Spread so nobody stacks: the place's owner takes the spot, others stand either side facing outward. */
export const GROUP_OFFSETS: { x: number; y: number }[] = [{ x: 0, y: 0 }, { x: -4, y: 1.2 }, { x: 4, y: 1.2 }];
