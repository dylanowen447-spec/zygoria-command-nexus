import { canonPrompt } from "./zygoria-canon.ts";

/**
 * ZYGORIA STORY STATE — the single central source of truth.
 *
 * Change story progress, discoveries and unlocked zones HERE and every agent
 * call plus the world UI update automatically. Nothing else should duplicate
 * lore: dated notes in ./canon/ hold the detailed record, this file holds the
 * live state the crew reasons from.
 */

export const STORY_STAGE = {
  number: "STAGE 01",
  label: "ARRIVAL & THE SANCTUARY",
  summary:
    "The trio landed in the ruined Cambridge region, built The Sanctuary and have begun restoring the land and meeting the people left behind. Cronk and Shelton's territories are known dangers. The Network lies dormant and nobody in-world knows it will return.",
};

/** What is objectively true in the Zygoria universe right now — including facts the crew have not discovered yet. */
export const CANON_TRUTH: string[] = [
  "Zygoria is Old Earth, long after civilisation collapsed; The Network was not destroyed, only dormant.",
  "Oz, Brix and Lowkey arrived in egg-shaped stasis pods in the ruined Cambridge region.",
  "The Sanctuary is their rebuilt home base: the Riverside Shack, Brix's Workshop, Lowkey's Lookout, the Crossroads, the river and the three arrival pods.",
  "Pod colours: Oz = yellow (smallest), Brix = blue (largest), Lowkey = red.",
  "Moxi is a young ancient dragon who survived the collapse in deep dormancy; she lives hidden near the Sanctuary. Her colours are locked canon.",
  "Human survivors hide in caves, tunnels and ruins; the trio are helping them — food, shelter, water, safety.",
  "Cronk is an evolved crocodilian who controls a swamp territory with mutant rat minions.",
  "Shelton is an intelligent turtle-like boss who controls a work camp with guards and subjugated human workers.",
  "Fish is the only food anyone eats at this stage — the crew are fine with it.",
  "The crew are obsessed with what this world is and what they mean to it — that is what they care about most.",
  "The crew have noticed the world seems to have WOKEN UP since they arrived: restored lights, systems and energy seem to stir in response to their rebuilding. They do not know why.",
  "Boulderpot is an established species (ZYG 005). Cards so far: ZYG 001-003 the trio, ZYG 004 Moxi, ZYG 005 Boulderpot; Shiny 001-003 the trio, Shiny 004 Shelton.",
  "First Genesis is the opening era: arrival, discovery, survival, rebuilding, mystery, hidden threats.",
];

/** What each character has actually discovered so far — shared knowledge plus their own perspective. */
export const CURRENTLY_KNOWN: Record<string, string[]> = {
  Oz: [
    "SHARED: The Sanctuary and its landmarks; the crew's roles; the survivors in the caves; Cronk and Shelton's territories are dangerous; fish is the food there is.",
    "Oz knows the crew and the camp better than anyone — who is good at what, who needs watching, what needs doing next.",
    "He has not yet found the working decks he is destined to find; he senses sound and electricity are his thing.",
    "He does NOT know why the trio were sent, that their memories were sealed, or why the world seems to wake as they rebuild it.",
  ],
  Brix: [
    "SHARED: The Sanctuary and its landmarks; the crew's roles; the survivors in the caves; Cronk and Shelton's territories are dangerous; fish is the food there is.",
    "Brix knows the state of every machine, scrap pile and half-built project in the Workshop, and what salvaged parts the ruins and the camp might yield.",
    "He does NOT know why the trio were sent, that their memories were sealed, or why the world seems to wake as they rebuild it.",
  ],
  Lowkey: [
    "SHARED: The Sanctuary and its landmarks; the crew's roles; the survivors in the caves; Cronk and Shelton's territories are dangerous; fish is the food there is.",
    "Lowkey knows the most Old Earth history: the ruins, what the collapse left behind, and old stories about ancient dragons surviving the collapse in dormancy.",
    "He suspects something is dormant out there — something's out there, but he doesn't know what — and he keeps that suspicion mostly to himself.",
    "He does NOT know why the trio were sent, that their memories were sealed, or why the world seems to wake as they rebuild it.",
    "Lowkey has quietly noticed the world stirring since the trio began rebuilding — lights responding, energy changing — and suspects there is more to it.",
  ],
};

/** Characters and places the crew have discovered so far (shown in the world UI and used by agents). */
export const DISCOVERED = {
  characters: [
    "Oz, Brix and Lowkey — the original three Zigs",
    "Human survivors — hiding in caves, tunnels and ruins",
    "Cronk — known danger; a half-human, half-crocodile terror described by survivors; the trio have not fully met him yet",
    "Shelton — known danger; a turtle-like boss running a guarded work camp; the trio have not fully met him yet",
    "Moxi — hidden somewhere in the Sanctuary; the crew have not found her yet",
  ],
  locations: [
    "The Sanctuary (home base)",
    "Riverside Shack · Brix's Workshop · Lowkey's Lookout · The Crossroads",
    "The arrival pods",
    "Old Earth ruins — the dead city around the region",
    "The survivor caves",
    "Cronk's swamp territory",
    "Shelton's work camp",
  ],
};

/** Zones the crew can currently travel to. Unlock or lock a zone here and the UI and routing update automatically. */
export const UNLOCKED_ZONES = ["sanctuary", "ruins", "caves", "cronk", "shelton"] as const;

/** True information the agents must NOT reveal, reference or hint at yet. */
export const HIDDEN_FUTURE_CANON: string[] = [
  "The Network will eventually return as the crew restore connected technology — and its declaration of being all-powerful, all-knowing and un-undoable.",
  "Why the trio were sent, and that their memories were deliberately wiped or sealed before launch.",
  "The trio's future stronger Stage 2 evolved forms.",
  "The full history and purpose of the ancient dragons, and Moxi's wider importance to the story.",
  "Any future locations, allies, enemies, transformations or story outcomes not yet established in the canon notes.",
  "The full truth about the Network — what it really is remains larger and mysterious.",
];

/** Visitor-safe journal pages. These descriptions are limited to what the crew currently knows.
 * Change an entry here when the story establishes a new discovery; never project CANON_TRUTH or hidden lore to the browser. */
export const CODEX_PAGES = [
  { id: "oz", category: "Characters", name: "Oz", description: "The trio's energetic coordinator. At home by the Riverside Shack.", location: "The Sanctuary", recordedBy: null, level: "known" },
  { id: "brix", category: "Characters", name: "Brix", description: "Builder of the crew. His workshop holds the settlement's repairs and salvaged machinery.", location: "The Sanctuary", recordedBy: null, level: "known" },
  { id: "lowkey", category: "Characters", name: "Lowkey", description: "Quiet observer of Old Earth's ruins, often watching from the lookout.", location: "The Sanctuary", recordedBy: null, level: "known" },
  { id: "survivors", category: "Characters", name: "The Survivors", description: "People shelter in caves, tunnels and ruins. The crew are helping with safety, water and shelter.", location: "Survivor Caves", recordedBy: null, level: "known" },
  { id: "cronk", category: "Characters", name: "Cronk", description: "Survivors warn of a crocodilian danger in the swamp. The crew have not fully met him.", location: "Swamp territory", recordedBy: null, level: "partial" },
  { id: "shelton", category: "Characters", name: "Shelton", description: "A turtle-like boss holds a guarded work camp. The crew have not fully met him.", location: "Work camp", recordedBy: null, level: "partial" },
  { id: "unrecorded-creature-1", category: "Creatures", name: "Unrecorded", description: "We haven’t discovered enough about this yet.", location: null, recordedBy: null, level: "hidden" },
  { id: "unrecorded-creature-2", category: "Creatures", name: "Unrecorded", description: "We’ll have to explore further before we can fill this in.", location: null, recordedBy: null, level: "hidden" },
  { id: "sanctuary", category: "Locations", name: "The Sanctuary", description: "The crew's rebuilt home beside the river: shack, workshop, lookout, crossroads and arrival site.", location: "Ruined Cambridge region", recordedBy: null, level: "known" },
  { id: "ruins", category: "Locations", name: "Old Earth Ruins", description: "The remains of the old city around the Sanctuary. Much of it is still unexplored.", location: "Cambridge region", recordedBy: null, level: "partial" },
  { id: "caves", category: "Locations", name: "Survivor Caves", description: "Shelter for the people left behind. The crew know people are living there.", location: null, recordedBy: null, level: "partial" },
  { id: "swamp", category: "Locations", name: "Swamp Territory", description: "Cronk's territory. The crew know it is dangerous, but have not mapped it all.", location: null, recordedBy: null, level: "partial" },
  { id: "camp", category: "Locations", name: "Work Camp", description: "Shelton's guarded camp. More must be learned about what happens inside.", location: null, recordedBy: null, level: "partial" },
  { id: "pods", category: "Objects", name: "The Arrival Pods", description: "Three egg-shaped stasis pods remain near the Sanctuary: Oz's yellow, Lowkey's red and Brix's blue.", location: "The Sanctuary", recordedBy: null, level: "known" },
  { id: "workshop", category: "Objects", name: "Brix's Workshop", description: "An improvised place of tools, scrap and half-built repairs.", location: "The Sanctuary", recordedBy: "Brix", level: "known" },
  { id: "salvage", category: "Old Earth discoveries", name: "Salvaged machinery", description: "Old cables, machines and recovered parts are being studied and put to use. What else remains is unclear.", location: "Old Earth Ruins", recordedBy: "Brix", level: "partial" },
  { id: "lights", category: "Old Earth discoveries", name: "Restored lights", description: "Repaired lights and systems seem to stir as the crew rebuild. The reason is still unknown.", location: "The Sanctuary", recordedBy: null, level: "partial" },
  { id: "network", category: "Network-related discoveries", name: "No entry yet", description: "This part of Zygoria is still unknown to us.", location: null, recordedBy: null, level: "hidden" },
  { id: "waking", category: "Unsolved mysteries", name: "The waking world", description: "Since the crew arrived, the world seems to respond to their rebuilding. Nobody knows why.", location: "The Sanctuary", recordedBy: null, level: "partial" },
  { id: "purpose", category: "Unsolved mysteries", name: "Why were we sent?", description: "The crew still do not know why they arrived here or what they mean to this world.", location: null, recordedBy: null, level: "partial" },
] as const;

/** The full story-state prompt block injected into every agent call. */
export function canonContext(agent: string) {
  const truth = CANON_TRUTH.map(t => `  - ${t}`).join("\n");
  const known = (CURRENTLY_KNOWN[agent] ?? CURRENTLY_KNOWN["Oz"] ?? []).map(k => `  - ${k}`).join("\n");
  const chars = DISCOVERED.characters.map(c => `  - ${c}`).join("\n");
  const locs = DISCOVERED.locations.map(l => `  - ${l}`).join("\n");
  const hidden = HIDDEN_FUTURE_CANON.map(h => `  - ${h}`).join("\n");
  return `ZYGORIA STORY STATE (live — the single central source of truth, updated as the story advances):
- Story stage: ${STORY_STAGE.number} — ${STORY_STAGE.label}. ${STORY_STAGE.summary}
- CANON TRUTH — objectively true in the world right now (some of this the crew do not personally know yet; do not leak undiscovered facts in conversation):
${truth}
- WHAT ${agent} KNOWS right now:
${known}
- DISCOVERED CHARACTERS:
${chars}
- DISCOVERED LOCATIONS:
${locs}
- HIDDEN FUTURE CANON — true, but strictly secret. Never reveal, reference, hint at or foreshadow any of this:
${hidden}
- If a fact is not in CANON TRUTH and not in your known list, admit in your own voice that you have not discovered it yet rather than inventing an answer. Never speak in system labels or mention canon, a database, or a prompt to the visitor. Ideas can be suggested as possibilities, never stated as discovered facts.`;
}

export { canonPrompt };
