/** Offline crew: in-character replies used whenever live crew calls are unavailable (e.g. no credits). */
type Agent = "Oz" | "Brix" | "Lowkey" | "Moxi";
type ZoneId = "sanctuary" | "ruins" | "caves" | "cronk" | "shelton";

const pick = <T,>(list: T[], seed: string) => {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length]!;
};

const has = (d: string, words: string[]) => words.some((w) => d.includes(w));

export function offlineRoute(directive: string) {
  const d = directive.toLowerCase();
  const zone: ZoneId = has(d, ["ruin", "salvage", "old earth", "terminal", "bridge"]) ? "ruins"
    : has(d, ["cave", "survivor", "crate", "lantern"]) ? "caves"
    : has(d, ["cronk", "kronk", "swamp", "rat", "flare"]) ? "cronk"
    : has(d, ["shelton", "camp", "guard", "gate"]) ? "shelton" : "sanctuary";
  const group = has(d, ["you lot", "all of you", "crew", "lads", "you all", "everyone", "what do you think", "how are you", "what next", "do you like"])
    || (!/\b(oz|ozzy|brix|lowkey)\b/.test(d) && (/\?\s*$/.test(d) || /^(who|what|where|why|how|tell me|is|are|do|does|can)\b/.test(d)));
  const named: Agent[] = [];
  if (/\boz\b|ozzy/.test(d)) named.push("Oz");
  if (/\bbrix\b/.test(d)) named.push("Brix");
  if (/lowkey/.test(d)) named.push("Lowkey");
  if (/\bmoxi\b/.test(d)) named.push("Moxi");
  let route: Agent[];
  if (group) route = ["Oz", "Brix", "Lowkey"];
  else if (has(d, ["together", "team up", "solve"])) route = ["Oz", "Lowkey", "Brix", "Oz"];
  else if (named.length) route = [named[0]!];
  else if (has(d, ["repair", "fix", "build", "rig", "workshop", "inspect", "modify"])) route = ["Brix"];
  else if (has(d, ["scout", "ridge", "look", "investigate", "lore", "history", "moon", "network"])) route = ["Lowkey"];
  else route = ["Oz"];
  return { route, zone, group, reason: group ? "Crew conversation — everyone's chipping in." : `Best fit: ${route.join(" → ")}.` };
}

const LINES: Record<Agent, { task: string[]; chat: string[]; final: string[]; activity: string }> = {
  Oz: {
    activity: "Cracking on with it",
    task: [
      "Sorted. Gave it a proper go — lights flickered, nothing exploded. That's a win.",
      "On it! Flicked a few switches, hit one twice for luck. Working now. Probably.",
      "Done and done. Come on, that was easy. What's next?",
    ],
    chat: [
      "Honestly? This place keeps surprising me. Every time we fix something, the world feels a bit more awake.",
      "Come on, we've got the shack, the workshop and a mountain Lowkey won't stop staring at. Living the dream.",
      "Next? Let's go poke around the ruins. Something out there's waiting for us, I can feel it.",
    ],
    final: ["Right, that's it wrapped. Nice one, crew — this place looks better already.", "Sorted. Told you we'd figure it out."],
  },
  Brix: {
    activity: "Working on it in the workshop",
    task: [
      "Stripped it down, replaced what was shot, bolted it back. It'll hold. Don't let Oz touch it.",
      "Inspected it properly. Two bad joints, one dodgy wire. Fixed. That's how it's done.",
      "Built it from salvage. Not pretty, but it works, and working beats pretty.",
    ],
    chat: [
      "Oz, half of that wasn't a plan. But fine — the systems here do seem to respond when we rebuild. I want to know why.",
      "Practical answer: we keep the power steady, keep the roof on, then explore. In that order.",
      "Every repair makes something else switch on. That's not luck. That's a system we don't understand yet.",
    ],
    final: ["Done. Solid work.", "Finished. It'll hold."],
  },
  Lowkey: {
    activity: "Watching from the ridge",
    task: [
      "Went up the ridge and watched for a while. There's more out there than we've seen. I've noted it.",
      "Scouted it. Quiet. Too quiet, maybe. I'll keep an eye on it.",
      "Investigated. Found traces of something. Not sure what yet. We haven't discovered enough.",
    ],
    chat: [
      "Hm. The world woke up when we got here. Nobody's asking why that bothers me.",
      "I like the quiet up on the ridge. The moon looks different from up there. Don't tell Oz.",
      "We haven't discovered that yet. There's still a lot of this world we don't understand.",
    ],
    final: ["Checked. It fits with what we know.", "Nothing out of place. For now."],
  },
  Moxi: {
    activity: "Scampering off to help",
    task: [
      "Got it. Carried it over. It's heavy. I did it anyway.",
      "Found a shiny one. It was buried. Now it isn't.",
      "Mm. Done. Can I have a fish now?",
    ],
    chat: [
      "The water tastes different now. Better. Everything's waking up.",
      "Lowkey is quiet. I like quiet. You are less quiet.",
      "I had a dream about flying. Warm wind. Then I woke up here.",
    ],
    final: ["Mm. Done.", "Helped. Fish?"],
  },
};

/** Memories of the first three chapters, used when visitors ask about their past. */
const ORIGIN: Record<Agent, string[]> = {
  Oz: ["We cracked out of three eggs in the ruins. Freezing, dusty, nobody about. Walking out of there was the best call we ever made.", "Old City first, then a proper long walk, then the river. Built the shack right here. Home sweet home."],
  Brix: ["Ruins came first. Hatched there, searched Old City, found nothing to drink. So we walked till we hit the river and built this.", "There was a library in Old City. We could read the books. Still can't explain that one."],
  Lowkey: ["We woke in the ruins. Too quiet. Too many dead towers.", "I spotted the river from a hill on the long walk. Seemed like a place to begin again."],
  Moxi: ["I went to sleep somewhere safe. My parents said it would be okay when I woke up. Then… everything was old and broken.", "I don't remember the in-between. Just darkness. Then cold stone, and being hungry."],
};

export function offlineStep(directive: string, agent: Agent, previous: { agent: Agent; result: string }[], isFinalReview: boolean, group: boolean) {
  const seed = directive + agent + previous.length;
  const set = LINES[agent];
  const origin = /where.*(from|come)|origin|past|egg|hatch|arriv|old city|library|long walk|how.*(find|found|got here|built)|ruins/i.test(directive);
  const result = origin && !isFinalReview ? pick(ORIGIN[agent], seed) : group ? pick(set.chat, seed) : isFinalReview ? pick(set.final, seed) : pick(set.task, seed);
  return { activity: group ? "Chipping in" : set.activity, result, verdict: (agent === "Lowkey" && !isFinalReview && !group ? "pass" : "n/a") as "pass" | "n/a" };
}
