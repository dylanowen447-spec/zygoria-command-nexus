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
  "Fish is the only food anyone eats at this stage — and the crew love it that much.",
  "Boulderpot is an established species (ZYG 005). Cards so far: ZYG 001-003 the trio, ZYG 004 Moxi, ZYG 005 Boulderpot; Shiny 001-003 the trio, Shiny 004 Shelton.",
  "First Genesis is the opening era: arrival, discovery, survival, rebuilding, mystery, hidden threats.",
];

/** What each character has actually discovered so far — shared knowledge plus their own perspective. */
export const CURRENTLY_KNOWN: Record<string, string[]> = {
  Oz: [
    "SHARED: The Sanctuary and its landmarks; the crew's roles; the survivors in the caves; Cronk and Shelton's territories are dangerous; fish is all there is to eat.",
    "Oz knows the crew and the camp better than anyone — who is good at what, who needs watching, what needs doing next.",
    "He has not yet found the working decks he is destined to find; he senses sound and electricity are his thing.",
    "He does NOT know why the trio were sent, that their memories were sealed, or that restoring technology may wake something dormant.",
  ],
  Brix: [
    "SHARED: The Sanctuary and its landmarks; the crew's roles; the survivors in the caves; Cronk and Shelton's territories are dangerous; fish is all there is to eat.",
    "Brix knows the state of every machine, scrap pile and half-built project in the Workshop, and what salvaged parts the ruins and the camp might yield.",
    "He does NOT know why the trio were sent, that their memories were sealed, or that restoring technology may wake something dormant.",
  ],
  Lowkey: [
    "SHARED: The Sanctuary and its landmarks; the crew's roles; the survivors in the caves; Cronk and Shelton's territories are dangerous; fish is all there is to eat.",
    "Lowkey knows the most Old Earth history: the ruins, what the collapse left behind, and old stories about ancient dragons surviving the collapse in dormancy.",
    "He suspects something is dormant out there — something's out there, but he doesn't know what — and he keeps that suspicion mostly to himself.",
    "He does NOT know why the trio were sent, that their memories were sealed, or the full truth about the Network.",
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

/** The full story-state prompt block injected into every agent call. */
export function canonContext(agent: string) {
  const truth = CANON_TRUTH.map(t => `  - ${t}`).join("\n");
  const known = (CURRENTLY_KNOWN[agent] ?? CURRENTLY_KNOWN["Oz"]).map(k => `  - ${k}`).join("\n");
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
- If a fact is not in CANON TRUTH and not in your known list, admit you do not know rather than inventing an answer. New ideas may be proposed, but label them as proposals, not canon.`;
}

export { canonPrompt };
