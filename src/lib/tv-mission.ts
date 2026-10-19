/** "Tie Up the TV" — Sanctuary first-night side mission (script by Dylan Owen). */
export type TvSpeaker = "TV" | "Oz" | "Brix" | "Lowkey" | "";
export type TvLine = [TvSpeaker, string];

export const TV_KEY = "zyg-tv-mission";
/** Night falls 5 minutes after Sanctuary arrival (matches the sky loop). */
export const TV_NIGHT_MS = 300000;
export const TV_HITS = 10;

/** Positions in artwork percentages. */
export const TV_SPOT = {
  workshop: { x: 80, y: 55 },
  cage: { x: 49, y: 64 },
};

export const TV_AWAKEN: TvLine[] = [
  ["", "Sanctuary is quiet. The boys are relaxing by the campfire."],
  ["TV", "BZZZT… KRRRZZZT…"],
  ["", "The screen flickers. Two evil red eyes appear through the static."],
  ["", "CLANK! CLANK! Metal arms and legs burst out of the television."],
];

/** Awakening played inside Brix's workshop, in front of whoever walked in. */
export const TV_WAKE_INSIDE: TvLine[] = [
  ["TV", "BZZZT… KRRRZZZT…"],
  ["", "The screen flickers. Two evil red eyes appear through the static."],
  ["", "CLANK! CLANK! Metal arms and legs burst out of the television."],
  ["TV", "YOU WILL BOW BEFORE ME!"],
];
/** localStorage value once the TV has bolted out of the workshop. */
export const TV_ESCAPED = "escaped";

export const TV_VISITOR: TvLine[] = [
  ["Oz", "Erm… Brix?"],
  ["Brix", "What?"],
  ["Oz", "Your telly's walking."],
  ["Brix", "My what?"],
  ["Brix", "Oh, for goodness' sake."],
  ["TV", "FOOLISH CREATURES. YOU HAVE NO IDEA WHAT YOU'RE DEALING WITH."],
  ["Lowkey", "It's a television."],
  ["TV", "I AM BEYOND YOUR UNDERSTANDING!"],
  ["Oz", "Well, you ain't beyond walking out of Brix's shed, are ya?"],
  ["TV", "YOU WILL BOW BEFORE ME!"],
  ["Brix", "Get away from my equipment!"],
];

export const TV_FIGHT_START: TvLine[] = [
  ["Oz", "WOAH! He's actually having a go!"],
  ["Lowkey", "Then stop talking and move!"],
  ["TV", "YOUR DESTRUCTION IS INEVITABLE!"],
];

/** Oz stays out of the scrap and directs. */
export const TV_FIGHT_CALLS: TvLine[] = [
  ["Oz", "Tie up the TV, lads!"],
  ["Brix", "Hold STILL, you overgrown toaster!"],
  ["Lowkey", "Watch the antennas!"],
];

export const TV_DEFEAT: TvLine[] = [
  ["TV", "THIS… IS NOT… POSSIBLE…"],
  ["Oz", "You alright down there, mate?"],
  ["Brix", "Get some rope."],
];

export const TV_CAGE: TvLine[] = [
  ["", "The boys tie up the television and lock it inside a rusty metal cage."],
  ["TV", "THIS WON'T BE THE LAST YOU SEE OF ME. BE WARNED."],
  ["Oz", "Yeah, alright."],
  ["Lowkey", "Can we go back to bed now?"],
  ["Brix", "I'm keeping an eye on that thing."],
  ["TV", "Pathetic."],
  ["Oz", "Night, telly."],
];

/** Daytime taps on the dormant set in Brix's workshop yard. */
export const TV_DORMANT: TvLine[] = [
  ["Brix", "Old telly. Salvaged it. Might get a picture out of it one day."],
  ["Oz", "Does it play tunes? …No? Useless."],
  ["Lowkey", "That screen feels like it's looking back."],
];

/** Grumpy caged resident: mostly silent, occasionally cocky. */
export const TV_CAGED: TvLine[] = [
  ["TV", "…"],
  ["TV", "*KRZZT* Go away."],
  ["TV", "Pathetic."],
  ["TV", "Enjoy your little campfire. While it lasts."],
  ["TV", "*glares through the static*"],
  ["TV", "…"],
];

export const TV_CODEX = {
  id: "old-tv",
  category: "Network-related discoveries" as const,
  name: "Old TV — Network Manifestation",
  description: "A salvaged television from Brix's workshop that woke on the first night at the Sanctuary, grew metal arms and legs, and picked a fight with the crew. Tied up and locked in a rusty cage at the Crossroads. It promised this won't be the last they see of it.",
  location: "Riverside Sanctuary — Crossroads",
  recordedBy: "Brix",
  level: "known" as const,
};
