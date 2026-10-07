import type { Agent, ZoneId } from "@/lib/zones";

/**
 * Light conversational story progression. Each chapter is a chain of beats; a beat
 * advances when its prerequisites are met and the visitor says something that fits.
 * Later zones add their own chapter to STORY_CHAPTERS using the same shape.
 */
export type StoryBeat = {
  id: string;
  requires: string[];
  /** Visitor words that move the story here (checked against the directive). */
  match: RegExp;
  /** Short scene note given to the crew so live replies weave the beat in naturally. */
  note: string;
  /** In-character exchange shown as speech bubbles once the job finishes (works offline too). */
  lines: [Agent, string][];
};

export type StoryChapter = {
  id: string;
  zone: ZoneId;
  beats: StoryBeat[];
  /** Ambient idle chats per last-reached beat ("" = chapter not started). */
  idle: Record<string, { pair: [Agent, Agent]; lines: [string, string] }[]>;
  /** Zone that opens when the final beat lands. */
  unlocks: ZoneId;
  /** Codex page that becomes a full record when the chapter completes. */
  codex: { id: string; name: string; description: string; location: string; recordedBy: string };
};

/** Chapter 4's Sanctuary mystery: Lowkey spots something, the crew investigate, and Moxi comes out. */
export const SANCTUARY_SIGNAL: StoryChapter = {
  id: "sanctuary-moxi",
  zone: "sanctuary",
  unlocks: "caves",
  codex: {
    id: "moxi",
    name: "Moxi",
    description: "A tiny dragon who was hiding under the evergreen by Brix's workshop. Shy, curious, and very fond of grilled fish. She trusts the crew now.",
    location: "The evergreen by Brix's workshop",
    recordedBy: "Lowkey",
  },
  beats: [
    {
      // Fired automatically by the Sanctuary timer, never by words.
      id: "spotted",
      requires: [],
      match: /(?!)/,
      note: "Lowkey just noticed something move near the trees at the edge of the Sanctuary. He doesn't know what it was.",
      lines: [["Lowkey", "Hang on. Something moved over there."], ["Lowkey", "Near the trees. That wasn't a bird."]],
    },
    {
      // One question from the visitor ("what?") carries the crew straight to the hiding spot.
      id: "hiding",
      requires: ["spotted"],
      match: /./s,
      note: "Lowkey thinks what he saw was small and scaly — almost like a tiny dragon. The crew followed little claw marks and a patch of scorched grass to the evergreen beside Brix's workshop. Something small is peeking out from the rocks underneath, too nervous to come out. It might need a reason to trust them — like food. Nobody knows its name.",
      lines: [["Lowkey", "Small. Scaly. Wings, I think. A tiny dragon."], ["Oz", "A DRAGON? Here? Why didn't you lead with that!"], ["Brix", "Claw marks on the bridge rocks. Scorched grass. Trail ends under my evergreen."], ["Lowkey", "There. Eyes. It's watching us."], ["Oz", "It's scared. We need to give it a reason to trust us. Maybe if we cook something…"]],
    },
    {
      // Fired after a cookout once the hiding place is known.
      id: "trust",
      requires: ["hiding"],
      match: /(?!)/,
      note: "Oz left a grilled fish by the evergreen. The tiny dragon came out, ate it, and told them her name: Moxi. Her first words to the crew were 'You're loud.' She is shy but trusts the crew now.",
      lines: [["Oz", "One grilled fish. Left right here. No sudden moves, lads."], ["Lowkey", "She's coming out."], ["Brix", "…That's a dragon. An actual dragon."], ["Oz", "She said her name's Moxi! Welcome home, Moxi."]],
    },
  ],
  idle: {
    spotted: [{ pair: ["Lowkey", "Oz"], lines: ["Saw something move by the trees.", "Ask him what it was, Voice."] }],
    dragon: [{ pair: ["Lowkey", "Brix"], lines: ["I know what I saw.", "Then tell us, Voice. What did he see?"] }],
    told: [{ pair: ["Oz", "Brix"], lines: ["Do dragons leave tracks?", "Only one way to find out. Say the word and we'll search."] }],
    clues: [{ pair: ["Brix", "Lowkey"], lines: ["Those claw marks are fresh.", "They lead to the trees. We should follow."] }],
    hiding: [{ pair: ["Oz", "Brix"], lines: ["What do dragons eat?", "Fish bones everywhere. Maybe cook it some food."] }],
    trust: [
      { pair: ["Oz", "Lowkey"], lines: ["Moxi stole another fish.", "She's earned it."] },
      { pair: ["Brix", "Oz"], lines: ["She's been sleeping by my bench.", "She likes you!"] },
    ],
  },
};

export const STORY_CHAPTERS: StoryChapter[] = [SANCTUARY_SIGNAL];
export const STORY_KEY = "zygoria-story-v1";
/** Seconds spent in the Sanctuary after the opening; Lowkey spots movement at MOXI_SPOT_AFTER. */
export const SANCTUARY_TIME_KEY = "zygoria-sanctuary-time-v1";
export const MOXI_SPOT_AFTER = 60;
export type StoryState = { beats: string[] };
export const EMPTY_STORY: StoryState = { beats: [] };

export const lastBeat = (c: StoryChapter, s: StoryState) => [...c.beats].reverse().find(b => s.beats.includes(b.id))?.id ?? "";
export const chapterDone = (c: StoryChapter, s: StoryState) => s.beats.includes(c.beats.at(-1)!.id);

/** The next beat this directive unlocks in the active zone's chapter, if any. */
export function nextBeat(zone: ZoneId, s: StoryState, directive: string): { chapter: StoryChapter; beat: StoryBeat } | null {
  const chapter = STORY_CHAPTERS.find(c => c.zone === zone);
  if (!chapter || chapterDone(chapter, s)) return null;
  const beat = chapter.beats.find(b => !s.beats.includes(b.id) && b.requires.every(r => s.beats.includes(r)));
  return beat && beat.match.test(directive) ? { chapter, beat } : null;
}

/** Zones locked behind an unfinished chapter. */
// Players who finished the old signal chapter keep the caves they already unlocked.
export const lockedZones = (s: StoryState) => STORY_CHAPTERS.filter(c => !chapterDone(c, s) && !s.beats.includes("fixed")).map(c => c.unlocks);
