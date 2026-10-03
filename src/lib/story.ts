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

export const SANCTUARY_SIGNAL: StoryChapter = {
  id: "sanctuary-signal",
  zone: "sanctuary",
  unlocks: "caves",
  codex: {
    id: "signal",
    name: "Old Earth Signal",
    description: "Origin: Unknown · Direction: East of the river · Status: Active · Classification: Old Earth Discovery. Something out there is still transmitting. Nobody knows what.",
    location: "East of the river",
    recordedBy: "Lowkey",
  },
  beats: [
    {
      id: "flash",
      requires: [],
      match: /lowkey|ridge|mountain|lookout|see|saw|seen|strange|weird|flash|light|signal|anything new|what.*(up|happen)/i,
      note: "Lowkey has been seeing a distant flash beyond the Sanctuary from his ridge. It flashes, disappears, then comes back. He thought it was sunlight; it isn't. Mention it briefly, mysteriously.",
      lines: [["Lowkey", "I keep seeing something from the ridge."], ["Lowkey", "It flashes, disappears, then comes back. Thought it was sunlight. It isn't."]],
    },
    {
      id: "pattern",
      requires: ["flash"],
      match: /flash|signal|light|pattern|repeat|saw|seen|ridge|lowkey/i,
      note: "Lowkey reveals the flash repeats in a pattern — same place, same rhythm. He doesn't know what it is.",
      lines: [["Lowkey", "Watched it all night. It repeats. Same gaps every time."], ["Oz", "Wait… it repeats?"]],
    },
    {
      id: "oz",
      requires: ["pattern"],
      match: /oz|pattern|repeat|signal|flash|electric|transmit|random/i,
      note: "Oz realises a repeating pattern could be a surviving Old Earth electrical signal. He's excited and wants to find where it comes from.",
      lines: [["Oz", "That doesn't sound random. That sounds electric."], ["Oz", "If something out there is still transmitting, I want to know what."]],
    },
    {
      id: "scanner",
      requires: ["oz"],
      match: /brix|workshop|scanner|where|locate|trace|track|find|direction|source|coming from/i,
      note: "Brix says his workshop scanner could find where the signal comes from, but it's damaged: it needs one salvaged copper coil.",
      lines: [["Brix", "My scanner could find where it's coming from. If it worked."], ["Brix", "Coil's burnt out. I need a copper coil that isn't toast."]],
    },
    {
      id: "coil",
      requires: ["scanner"],
      match: /pod|coil|copper|salvage|part|wire|egg|spare/i,
      note: "Oz remembers his yellow arrival pod had compatible wiring — there's an intact copper coil inside. Brix confirms it can be reused safely.",
      lines: [["Oz", "My pod! There's a coil in the yellow one. Pretty sure. Fairly sure."], ["Brix", "…It's actually intact. Shielded, too. That'll go in safely."]],
    },
    {
      id: "fixed",
      requires: ["coil"],
      match: /repair|fix|install|scanner|brix|fit|try|switch|turn on|activate|run/i,
      note: "Brix fits the coil and repairs the scanner. The workshop lights flicker, the scanner pulses, and it locks on: the signal comes from east of the river, beyond the Sanctuary. Origin unknown. Keep it mysterious.",
      lines: [["Brix", "Coil's in. Stand back."], ["Lowkey", "East of the river. Same place I've been watching."], ["Oz", "Something's still alive out there. Come on, let's go."]],
    },
  ],
  idle: {
    "": [
      { pair: ["Lowkey", "Oz"], lines: ["Saw that flash again.", "What flash?"] },
      { pair: ["Lowkey", "Brix"], lines: ["Something blinks out past the river at night.", "Probably a reflection. Probably."] },
    ],
    flash: [
      { pair: ["Lowkey", "Oz"], lines: ["Saw that flash again.", "Same place?"] },
      { pair: ["Lowkey", "Brix"], lines: ["It came back. Three times.", "Lights don't just come back."] },
    ],
    pattern: [
      { pair: ["Lowkey", "Oz"], lines: ["Saw that flash again.", "Same place?"] },
      { pair: ["Oz", "Lowkey"], lines: ["Still repeating?", "Exactly."] },
    ],
    oz: [
      { pair: ["Oz", "Brix"], lines: ["Can your gear track a signal?", "Ask me something harder. …Actually, it's broken."] },
      { pair: ["Brix", "Oz"], lines: ["If you've borrowed another wire, tell me now.", "Borrowed is a strong word."] },
    ],
    scanner: [
      { pair: ["Brix", "Oz"], lines: ["Still need a copper coil.", "Have you checked… everywhere?"] },
      { pair: ["Lowkey", "Brix"], lines: ["The pods came with a lot of wiring.", "…Huh."] },
    ],
    coil: [
      { pair: ["Brix", "Oz"], lines: ["Coil's on my bench. Scanner's ready to try.", "Then try it!"] },
    ],
    fixed: [
      { pair: ["Lowkey", "Oz"], lines: ["Still pulsing. East of the river.", "Then that's where we're going."] },
      { pair: ["Brix", "Lowkey"], lines: ["Scanner hasn't lost it once.", "Neither have I."] },
    ],
  },
};

export const STORY_CHAPTERS: StoryChapter[] = [SANCTUARY_SIGNAL];
export const STORY_KEY = "zygoria-story-v1";
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
export const lockedZones = (s: StoryState) => STORY_CHAPTERS.filter(c => !chapterDone(c, s)).map(c => c.unlocks);
