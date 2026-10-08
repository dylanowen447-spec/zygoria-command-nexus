/** Variety pools so routines play out differently each time: who speaks, what they say, and in what order. */
export type Who = "Oz" | "Brix" | "Lowkey" | "Moxi";
export type Line = [Who, string];

export const pick = <T,>(l: readonly T[]): T => l[Math.floor(Math.random() * l.length)]!;
export const chance = (p: number) => Math.random() < p;
export function shuffle<T>(l: readonly T[]): T[] { const a = [...l]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j]!, a[i]!]; } return a; }
/** Pick one line per speaker from their pool, keeping only present speakers, in a random order (first speaker optionally fixed). */
export function riff(pools: Partial<Record<Who, string[]>>, present: Who[], opts: { first?: Who; max?: number; skip?: number } = {}): Line[] {
  const who = shuffle(present.filter(a => pools[a]?.length && a !== opts.first));
  const kept = who.filter(() => !chance(opts.skip ?? 0.25));
  const order = [...(opts.first && pools[opts.first]?.length ? [opts.first] : []), ...kept].slice(0, opts.max ?? 4);
  return order.map(a => [a, pick(pools[a]!)]);
}

// ── Cookout ─────────────────────────────────────────────
export const COOK_OPEN: string[] = ["Food? Sorted. I'll grab a fish off the pier.", "Leave it to me. Pier's got dinner.", "Fishing time. Nobody touch my spot.", "Right, the river owes me one."];
export const CATCH_CALL: string[] = ["Got one!", "Hah! Gotcha!", "Slippery— got it!", "Come here, you— yes!", "Bit of a fight, that one."];
export const KINDLING: string[] = ["Kindling's laid. Lowkey, give us the heat.", "Logs stacked. Spark it, Lowkey.", "Dry wood, good draught. Your turn, Lowkey.", "Built it to last. Light her up."];
export const SPARK: string[] = ["Stand back.", "Mind your eyebrows.", "Here.", "Watch."];
export const LIT: string[] = ["Embers will hold.", "Steady flame.", "That'll burn a while.", "Good draw on it."];
export const CATCH_LINE = {
  small: ["Fish on! Tiny ones, but they're ours.", "Small, but they've got heart.", "Snack-sized. Premium snack-sized."],
  medium: ["Fish on! Decent size, this lot.", "Proper fish, this. Respect it.", "Good weight on these."],
  large: ["Fish on! Look at the size of this one!", "Somebody measure this. Nobody'll believe me.", "This one nearly pulled me in!"],
};
export const GRILL: Partial<Record<Who, string[]>> = {
  Brix: ["Turn them, Oz. That one's going black.", "Off the hot spot, you're scorching it.", "Flip on three. One, two—", "Rack's bending. Who built this? Oh. Me."],
  Oz: ["Crispy is a flavour.", "Bit of river herb on top. Chef's touch.", "Smell that? That's talent.", "Don't rush the artist."],
  Lowkey: ["Not bad.", "Smoke's drifting east.", "Wind's right for it.", "…Smells good."],
  Moxi: ["Mm. Fish.", "That one. Mine.", "*sniff sniff*", "Hot. Wait. Still mine."],
};
export const AFTERS: Line[][] = [
  [["Oz", "Stomach's finally stopped rumbling."], ["Brix", "Because I told you when to flip it."], ["Lowkey", "The river gave us enough today."]],
  [["Brix", "Good heat, Lowkey. Even cook."], ["Lowkey", "It held."], ["Oz", "And who got his boots wet? Me."]],
  [["Oz", "Could eat three more."], ["Brix", "You'd be asleep after two."], ["Lowkey", "Full is enough."]],
  [["Lowkey", "Quiet, after a meal."], ["Oz", "Best fish I've ever caught."], ["Brix", "Only fish you've ever caught."]],
  [["Brix", "Grill needs a new leg."], ["Oz", "Grill needs a new chef, you mean."], ["Brix", "Careful."]],
  [["Oz", "We should name the fish."], ["Lowkey", "We ate it."], ["Oz", "In its memory, then."]],
  [["Lowkey", "Stars soon."], ["Brix", "Fire'll keep till then."], ["Oz", "So will I. Barely."]],
  [["Oz", "Who's on dishes?"], ["Brix", "We don't have dishes."], ["Oz", "Then I'm brilliant at them."]],
];
export const MOXI_AFTERS: Line[][] = [
  [["Moxi", "…More tomorrow?"], ["Oz", "Every day if you like."]],
  [["Moxi", "Warm belly."], ["Lowkey", "Same."]],
  [["Brix", "She ate the bones."], ["Moxi", "Crunchy."]],
];

// ── Drinking ────────────────────────────────────────────
export const DRINK_CALL: string[] = ["Getting some more fresh water to drink. Come grab some, lads.", "Tank's cold and clear. Get it while it lasts.", "Water's up. Bottles out, everyone.", "Drink break. That's an order. Friendly order."];
export const SIP: Partial<Record<Who, string[]>> = {
  Oz: ["Ahh. Better.", "Tastes like mountain. In a good way.", "Gulp. Gulp. Okay. One more gulp.", "Splash to the face. Wide awake now."],
  Brix: ["Needed that.", "Seal's holding. Tank's good.", "Cold. Proper cold.", "Back to work in a minute. Maybe two."],
  Lowkey: ["Cold. Good.", "Clean.", "…River's sweet today.", "Mm."],
  Moxi: ["Cold!", "*lap lap lap*", "Bubbles.", "Again."],
};

// ── Bedtime ─────────────────────────────────────────────
export const BED: Partial<Record<Who, string[]>> = {
  Oz: ["Right. Shutting it all down.", "Radio off. Me off. Night, all.", "Dreaming of bigger fish.", "Long day. Good day."],
  Brix: ["Finally. Some peace and quiet.", "Tools away. Bed.", "Back's had enough of today.", "Workshop's locked. Night."],
  Lowkey: ["Night.", "Ridge is clear. Sleep.", "Stars are out. Good.", "…Quiet."],
  Moxi: ["…Mm. Fire's warm.", "Sleepy.", "Curl up. Here.", "Night night."],
};
export const WAKE: Partial<Record<Who, string[]>> = {
  Oz: ["Morning! Everyone up?", "Rise and shine, legends.", "Slept like a log. A fish log.", "New day. Same handsome me."],
  Brix: ["Back up. Bench first.", "Joints creaking. Coffee'd be nice.", "Right. Where was I.", "Up. Work."],
  Lowkey: ["Sun's up.", "Mist on the river.", "Quiet night. Nothing moved.", "Morning."],
  Moxi: ["…Five more minutes.", "Mmf. Bright.", "Fire went small.", "Fish?"],
};

// ── Doing the job: muttered while working at the object ────
export const WORKING: Record<Who, string[]> = {
  Oz: ["Bit of tuning… there.", "Hold it, hold it… lovely.", "Humming helps. Science.", "Signal's fussy today.", "Wiggle the wire. Always wiggle the wire."],
  Brix: ["Tighten… tighten… there.", "Stripped thread. Course it is.", "Pass me the— never mind, got it.", "Measure twice, hit once.", "Come on, you rusty—"],
  Lowkey: ["Wind's shifting. Note it.", "Clear line of sight.", "Listen…", "Blind spot covered.", "Mark that."],
  Moxi: ["*sniff*", "Bug here.", "Warm machine.", "Ooh. Shiny bit."],
};
