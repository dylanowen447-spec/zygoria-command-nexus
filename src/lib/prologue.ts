import landingImg from "@/assets/zone-landing.jpg";
import cityImg from "@/assets/zone-old-city.jpg";
import libraryImg from "@/assets/zone-library.jpg";
import type { Agent, Point } from "@/lib/zones";

/** Saved once the visitor has lived through (or skipped) the opening. */
export const PROLOGUE_KEY = "zygoria-prologue-v1";

type Lines = Record<Agent, string[]>;
export type Spot = { at: Point; lines: Lines; /** Words a visitor can use to send a Zig here. */ words?: string };
export type Objective = {
  spot: string;
  /** Only this Zig can find it (e.g. their own book); otherwise anyone. */
  owner?: Agent;
  /** Lines the finder says, in order. */
  found: Lines;
  tag: { label: string; x: number; y: number };
};
export type Scene = {
  id: string;
  title: [string, string];
  sub: string;
  chapter: string;
  img: string;
  alt: string;
  label: string;
  bottom: string;
  /** Where each Zig appears, and the first spot they step to. */
  spawn: Record<Agent, { from: Point; out: string }>;
  edges: [string, string][];
  spots: Record<string, Spot>;
  objectives: Objective[];
  /** How long, and how much looking around, before objectives can be noticed. */
  unlock: { seen: number; ms: number; maxMs: number };
  hints: Record<Agent, string>;
  opening: [Agent, string][];
  /** Everyone meets here once every objective is found. */
  gather: { spot: string; at: Record<Agent, Point> };
  finale: [Agent, string][];
  card: { eyebrow: string; title: string; text: string; next: string };
  /** Scene note for live replies: only what the crew can see before finding anything. */
  story: string;
  /** Added to the scene note once each objective spot has been found in play. */
  learned: Record<string, string>;
};

export const ASPECT = 1520 / 1024;
export const ACKS: Lines = { Oz: ["On it!", "Going, going!", "Ooh, yeah."], Brix: ["Fine.", "Right.", "On my way."], Lowkey: ["Going.", "Mm. I'll look.", "Already was."] };
export const SHRUGS: Lines = { Oz: ["Dunno! Still working it out. Point me somewhere?"], Brix: ["Can't say yet. Tell me where to look."], Lowkey: ["Hard to say. Show me where."] };
export const REACTIONS: Lines = { Oz: ["Ha. Fair.", "Weird.", "Told you."], Brix: ["Noted.", "Hm.", "Don't touch it."], Lowkey: ["Mm.", "Agreed.", "Careful."] };

/**
 * Walkable graphs over each artwork (percent of image): nodes only sit on open ground and
 * edges only cross open ground, so nobody walks through walls, pods, rubble or shelves.
 * Objectives are just spots in the world — they are noticed only after the crew looks around.
 */
const LANDING: Scene = {
  id: "landing",
  title: ["Three ", "Eggs"],
  sub: "Day one on Old Earth.",
  chapter: "CHAPTER 01 · THREE EGGS",
  img: landingImg,
  alt: "Old Earth landing site: three cracked egg pods glowing blue, yellow and red in a dusty crater, a broken overpass and a distant ruined city at sunset",
  label: "OLD EARTH / LANDING SITE",
  bottom: "IMPACT CRATER — DAY ONE",
  spawn: { Oz: { from: { x: 55.5, y: 55 }, out: "yellow" }, Brix: { from: { x: 33, y: 56 }, out: "blue" }, Lowkey: { from: { x: 74, y: 57 }, out: "red" } },
  edges: [
    ["blue", "slabs"], ["blue", "centre"], ["blue", "trees"], ["trees", "slabs"],
    ["yellow", "centre"], ["yellow", "floor"], ["floor", "red"], ["floor", "wall"],
    ["wall", "rim"], ["wall", "overpass"], ["red", "rubble"], ["red", "centre"],
    ["centre", "front"], ["front", "rubble"], ["front", "slabs"], ["overpass", "rubble"],
  ],
  spots: {
    blue: { at: { x: 35, y: 63 }, words: "blue|big (egg|pod)|brix'?s (egg|pod)", lines: { Brix: ["Hull's cracked. Frame held.", "Big egg. Built to last."], Oz: ["Brix's egg is bigger than mine. Rude.", "Still glowing in there."], Lowkey: ["Still warm inside.", "Blue light. Like a heartbeat."] } },
    yellow: { at: { x: 57, y: 60.5 }, words: "yellow|small(est)? (egg|pod)|tiny|oz'?s (egg|pod)", lines: { Oz: ["My egg. Tiny. I like it.", "Came out of that? Me? Nice."], Brix: ["Wiring's cooked. Might salvage it later.", "Small, but the welds are clean."], Lowkey: ["Something still hums in there."] } },
    red: { at: { x: 71, y: 64 }, words: "red|lowkey'?s (egg|pod)", lines: { Lowkey: ["Mine. Quiet in there.", "Red glow. Still fading."], Brix: ["Same build as mine. Someone made three.", "Shell's thicker on this one."], Oz: ["Lowkey's egg looks grumpy. Suits him."] } },
    slabs: { at: { x: 31, y: 77 }, words: "slab|concrete|stone", lines: { Brix: ["Poured stone. Old Earth built heavy.", "These were walls once."], Oz: ["Bet this was a wall. Now it's a seat."], Lowkey: ["Broken clean. A long time ago."] } },
    trees: { at: { x: 21, y: 63 }, words: "tree", lines: { Lowkey: ["Nothing's grown here in years."], Oz: ["Even the trees gave up.", "Dead end. Literally."], Brix: ["Dry wood. Burns well, if we need it."] } },
    centre: { at: { x: 57, y: 72 }, words: "middle|centre|center|path|track", lines: { Oz: ["Hello? …Nobody. Great.", "Anyone? No? Cool."], Brix: ["Old track. Something walked here once."], Lowkey: ["Listen. Nothing.", "Too quiet."] } },
    front: { at: { x: 63, y: 83 }, words: "front", lines: { Oz: ["Dust in my headphones already."], Brix: ["Ground's firm. Good."], Lowkey: ["Wind's coming from the north."] } },
    rubble: { at: { x: 85, y: 73 }, words: "rubble|metal|rebar", lines: { Oz: ["Bendy metal! Useful? Probably not."], Brix: ["Rusted through. Not worth carrying."], Lowkey: ["Wind's moved everything here."] } },
    floor: { at: { x: 65, y: 54 }, words: "crater|hole", lines: { Brix: ["Impact crater. We came in hard."], Oz: ["We made this hole? Brilliant."], Lowkey: ["Three landings. One crater. Odd."] } },
    wall: { at: { x: 66, y: 42 }, words: "rim|edge|climb|slope", lines: { Lowkey: ["Ground rises north. Better view up there."], Brix: ["Wall's loose. Mind your feet."], Oz: ["Climbing. My favourite. Not really."] } },
    overpass: { at: { x: 82, y: 50 }, words: "bridge|overpass|road|highway", lines: { Brix: ["A road in the sky. Snapped in half."], Oz: ["Who builds roads up high?"], Lowkey: ["It led somewhere. Once."] } },
    rim: { at: { x: 58, y: 34 }, words: "north|top|up there|view|horizon|city|tower|skyline", lines: { Oz: [], Brix: [], Lowkey: [] } },
  },
  objectives: [{ spot: "rim", tag: { label: "OLD CITY — DISTANT", x: 42, y: 16 }, found: { Lowkey: ["Towers. North, past the road.", "Over here."], Oz: ["Wait — there's a whole city out there!", "Lads! Up here!"], Brix: ["Buildings. Lots of them. Far off.", "Over here."] } }],
  unlock: { seen: 2, ms: 40000, maxMs: 100000 },
  hints: { Lowkey: "Light's different past the north rim.", Brix: "Ground slopes up behind the pods. Could see further.", Oz: "Bet you can see loads from up top." },
  opening: [["Oz", "Ow. Where are we?"], ["Brix", "Somewhere dead. Pods held, though."], ["Lowkey", "No voices. Just wind."], ["Oz", "Right. Let's have a look around."]],
  gather: { spot: "rim", at: { Oz: { x: 49, y: 37 }, Brix: { x: 67, y: 39 }, Lowkey: { x: 58, y: 34 } } },
  finale: [["Oz", "A city! Maybe someone's home."], ["Brix", "Looks dead from here."], ["Lowkey", "Dead things still have answers."], ["Oz", "Then let's go ask them."]],
  card: { eyebrow: "CHAPTER 01 COMPLETE", title: "Old City lies ahead", text: "The crew have spotted the ruined towers on the horizon.", next: "Walk to Old City ›" },
  story: "Day one. You just hatched from egg pods in a dusty crater with the other two. You can see the pods, concrete slabs, dead trees and a broken overpass. Nothing else is known.",
  learned: {"rim": "You have spotted a distant ruined city of towers to the north."},
};

const OLD_CITY: Scene = {
  id: "city",
  title: ["Old ", "City"],
  sub: "Silent towers. Strange markings.",
  chapter: "CHAPTER 02 · OLD CITY",
  img: cityImg,
  alt: "Old City: a cracked plaza with an overturned bus, a toppled statue, a dry fountain, painted symbols and stone library steps down a side lane",
  label: "OLD EARTH / OLD CITY",
  bottom: "OLD CITY — CENTRAL PLAZA",
  spawn: { Oz: { from: { x: 46, y: 99 }, out: "entry" }, Brix: { from: { x: 54, y: 99 }, out: "front" }, Lowkey: { from: { x: 50, y: 99 }, out: "crossing" } },
  edges: [
    ["entry", "front"], ["front", "crossing"], ["front", "bus"], ["bus", "lights"], ["lights", "crossing"],
    ["lights", "markings"], ["markings", "statue"], ["crossing", "statue"], ["statue", "fountain"],
    ["crossing", "fountain"], ["fountain", "tower"], ["front", "tower"], ["tower", "alley"], ["alley", "library"],
  ],
  spots: {
    entry: { at: { x: 50, y: 86 }, words: "back|entrance|way in", lines: { Oz: ["Feet hurt already."], Brix: ["Main road in. Good landmark."], Lowkey: ["Remember the way back."] } },
    front: { at: { x: 56, y: 72 }, words: "plaza|square", lines: { Oz: ["Echoey. HELLO! …hello."], Brix: ["Cracked road. Firm enough."], Lowkey: ["Sound carries far here."] } },
    crossing: { at: { x: 45, y: 58 }, words: "crossing|stripe|zebra", lines: { Oz: ["Stripy road! Fancy."], Brix: ["Road markings. Wide street."], Lowkey: ["Lots of feet crossed here once."] } },
    bus: { at: { x: 29, y: 65 }, words: "bus|vehicle", lines: { Brix: ["Big machine. Lay down and never got up."], Oz: ["A house on wheels? Tipped over."], Lowkey: ["Many seats. Nobody in them."] } },
    lights: { at: { x: 38, y: 54 }, words: "light|signal|traffic", lines: { Oz: ["Three eyes. All dead."], Brix: ["Signal post. No power for years."], Lowkey: ["It used to blink, I think."] } },
    markings: { at: { x: 36, y: 41 }, words: "mark|symbol|paint|graffiti", lines: { Lowkey: ["These marks… I know them, somehow."], Brix: ["Painted symbols. Same one, everywhere."], Oz: ["Someone liked drawing this. A lot."] } },
    statue: { at: { x: 47, y: 41 }, words: "statue", lines: { Oz: ["Big stone person. Fell over. Relatable."], Brix: ["Toppled off the plinth. Heavy job."], Lowkey: ["Someone they remembered."] } },
    fountain: { at: { x: 60, y: 48 }, words: "fountain|water", lines: { Brix: ["Dry fountain. No water here."], Oz: ["No water. Brilliant."], Lowkey: ["Dry for a long time."] } },
    tower: { at: { x: 76, y: 58 }, words: "tower|banner|flag", lines: { Brix: ["That tower's leaning. Don't stand under it."], Oz: ["Another banner. Same symbol."], Lowkey: ["Hangs like a warning."] } },
    alley: { at: { x: 85, y: 50 }, words: "alley|lane|side street", lines: { Lowkey: ["The lane keeps going. Steps, maybe."], Brix: ["Narrow, but passable."], Oz: ["Ooh, a side street."] } },
    library: { at: { x: 86, y: 32 }, words: "library|steps|door|arch|building", lines: { Oz: [], Brix: [], Lowkey: [] } },
  },
  objectives: [{ spot: "library", tag: { label: "THE LIBRARY", x: 68, y: 12 }, found: { Oz: ["Steps! Big doors!", "Lads, over here!"], Brix: ["Stone building. Still standing.", "Over here."], Lowkey: ["An archway. Words carved above it.", "Come."] } }],
  unlock: { seen: 2, ms: 35000, maxMs: 90000 },
  hints: { Lowkey: "There's a lane off to the right. Steps at the end.", Brix: "Building down that side street's still standing.", Oz: "What's down that alley? Only one way to find out." },
  opening: [["Oz", "Whoa. Big."], ["Brix", "Dead. All of it."], ["Lowkey", "Something here wants to be found."]],
  gather: { spot: "library", at: { Oz: { x: 79, y: 41 }, Brix: { x: 91, y: 44 }, Lowkey: { x: 86, y: 32 } } },
  finale: [["Oz", "Doors are open!"], ["Brix", "Roof's holding. Mostly."], ["Lowkey", "Writing over the arch. I can read it."], ["Oz", "Then in we go."]],
  card: { eyebrow: "CHAPTER 02 · DISCOVERY", title: "The Library", text: "A crumbling library, its doors open.", next: "Enter the Library ›" },
  story: "Day one, later. You walked from the landing crater into a dead, silent city: an overturned bus, a fallen statue, a dry fountain, strange painted symbols. You do not know what happened here and have found no water.",
  learned: {"library": "Down a side lane you found an old stone building with open doors and words carved over the arch that you can somehow read."},
};

const LIBRARY: Scene = {
  id: "library",
  title: ["The ", "Library"],
  sub: "Books they somehow know how to read.",
  chapter: "CHAPTER 02 · THE LIBRARY",
  img: libraryImg,
  alt: "Inside a crumbling library: toppled shelves, light through a broken dome, a glowing yellow book by a gramophone, a blue book on a stone pedestal and a red book in a window alcove",
  label: "OLD CITY / THE LIBRARY",
  bottom: "LIBRARY — MAIN HALL",
  spawn: { Oz: { from: { x: 46, y: 99 }, out: "entry" }, Brix: { from: { x: 54, y: 99 }, out: "pages" }, Lowkey: { from: { x: 50, y: 99 }, out: "centre" } },
  edges: [
    ["entry", "centre"], ["entry", "pages"], ["centre", "shelves"], ["shelves", "desk"], ["centre", "pedestal"],
    ["pedestal", "gears"], ["gears", "aisle"], ["centre", "ladder"], ["ladder", "window"], ["pages", "window"],
    ["centre", "pages"], ["ladder", "gears"], ["shelves", "pedestal"],
  ],
  spots: {
    entry: { at: { x: 50, y: 90 }, words: "door|entrance", lines: { Oz: ["Big doors. Creaky."], Brix: ["Frame's sound."], Lowkey: ["Light only gets in from the roof."] } },
    centre: { at: { x: 50, y: 70 }, words: "middle|floor|circle|mosaic", lines: { Oz: ["Patterns on the floor. Dizzy."], Brix: ["Floor's solid. Tiles cracked."], Lowkey: ["A circle. Like a map."] } },
    shelves: { at: { x: 36, y: 73 }, words: "shel", lines: { Brix: ["Shelves gave way. Too much weight."], Oz: ["So many books. Which one's the good one?"], Lowkey: ["Pages everywhere. Forgotten."] } },
    gears: { at: { x: 61, y: 47 }, words: "gear|wheel|machine", lines: { Brix: ["Gears. Big ones. I like these."], Oz: ["A wheel with teeth."], Lowkey: ["It turned once. For something."] } },
    aisle: { at: { x: 66, y: 38 }, words: "aisle|dark|back", lines: { Lowkey: ["The aisles go further than the light."], Oz: ["Dark back there. I'll pass."], Brix: ["Roof's worse back here."] } },
    pages: { at: { x: 60, y: 82 }, words: "page|paper", lines: { Oz: ["Loose pages. Smell old."], Brix: ["Paper. Burns fast. Careful."], Lowkey: ["Words, scattered."] } },
    ladder: { at: { x: 63, y: 59 }, words: "ladder", lines: { Oz: ["A ladder! Can't reach anything, though."], Brix: ["Rungs are rotten."], Lowkey: ["Up there, more books."] } },
    desk: { at: { x: 36, y: 64 }, words: "desk|gramophone|record|yellow", lines: { Oz: [], Brix: [], Lowkey: [] } },
    pedestal: { at: { x: 48, y: 51 }, words: "pedestal|blue|stand", lines: { Oz: [], Brix: [], Lowkey: [] } },
    window: { at: { x: 75, y: 63 }, words: "window|globe|red|star", lines: { Oz: [], Brix: [], Lowkey: [] } },
  },
  objectives: [
    { spot: "desk", owner: "Oz", tag: { label: "OZ'S BOOK", x: 18, y: 50 }, found: { Oz: ["Hang on… I can read this. How can I read this?", "It's all rhythms. Someone wrote songs down."], Brix: [], Lowkey: [] } },
    { spot: "pedestal", owner: "Brix", tag: { label: "BRIX'S BOOK", x: 44, y: 26 }, found: { Brix: ["Plans. How things were built. I can read every line.", "Don't know how. Don't care. It's useful."], Oz: [], Lowkey: [] } },
    { spot: "window", owner: "Lowkey", tag: { label: "LOWKEY'S BOOK", x: 84, y: 40 }, found: { Lowkey: ["Names. Places. Stars I don't recognise.", "We were never taught this. Yet I know it."], Oz: [], Brix: [] } },
  ],
  unlock: { seen: 2, ms: 25000, maxMs: 70000 },
  hints: { Oz: "Something's glowing by that old desk.", Brix: "That pedestal's catching the light.", Lowkey: "Red cover, by the window." },
  opening: [["Oz", "Books! Loads of them."], ["Brix", "Watch the shelves. They're leaning."], ["Lowkey", "Quiet. Like it's waiting."]],
  gather: { spot: "centre", at: { Oz: { x: 41, y: 62 }, Brix: { x: 58, y: 63 }, Lowkey: { x: 50, y: 57 } } },
  finale: [["Oz", "We can read their books. Why can we read their books?"], ["Brix", "No water here. No food either."], ["Lowkey", "What happened to this world?"], ["Oz", "Dunno. But we're not finding out sat here."]],
  card: { eyebrow: "CHAPTER 02 COMPLETE", title: "The Long Walk", text: "No water, no safe home — just a question they can't forget. The Long Walk is the next chapter, coming soon.", next: "Continue to the Sanctuary ›" },
  story: "Inside the old stone building from the city: a crumbling hall full of fallen shelves, loose pages and light through a broken roof. No water here.",
  learned: {"desk": "Oz found a book by an old music machine and can somehow read it: it is full of written-down rhythms.", "pedestal": "Brix found a book on a stone stand and can somehow read it: plans for how things were built.", "window": "Lowkey found a book by the window and can somehow read it: names, places and unfamiliar stars."},
};

export const PROLOGUE_SCENES: Scene[] = [LANDING, OLD_CITY, LIBRARY];

/** Shortest node path over a scene's walkable graph (breadth-first). */
export function routeBetween(scene: Scene, from: string, to: string): string[] {
  const prev: Record<string, string | null> = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    if (n === to) break;
    for (const [a, b] of scene.edges) {
      const m = a === n ? b : b === n ? a : null;
      if (m && !(m in prev)) { prev[m] = n; queue.push(m); }
    }
  }
  const path: string[] = [];
  for (let n: string | null = to; n && n !== from; n = prev[n] ?? null) path.unshift(n);
  return path;
}
