import landingImg from "@/assets/zone-landing.jpg";
import cityImg from "@/assets/zone-old-city.jpg";
import libraryImg from "@/assets/zone-library.jpg";
import walkImg from "@/assets/zone-long-walk.jpg";
import type { Agent, Point } from "@/lib/zones";

/** Saved once the visitor has lived through (or skipped) the opening. */
export const PROLOGUE_KEY = "zygoria-prologue-v1";

type Lines = Record<Agent, string[]>;
export type Spot = { at: Point; lines: Lines; /** Words a visitor can use to send a Zig here. */ words?: string };
export type Objective = {
  spot: string;
  /** A discovery that only becomes available once this scene's fight is fully cleared. */
  afterCombat?: boolean;
  /** Only this Zig can find it (e.g. their own book); otherwise anyone. */
  owner?: Agent;
  /** Lines the finder says, in order. */
  found: Lines;
  tag: { label: string; x: number; y: number };
  /** Small puzzle: other objective spots that must be found before this one opens. */
  needs?: string[];
  /** What a Zig says on arriving while it's still shut. */
  locked?: Lines;
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
  /** Crew appear already standing at their spawn, facing the viewer, instead of walking in. */
  startStill?: boolean;
  /** Safe walkable ground outline (artwork %); steering and fights never leave it, so nobody walks off cliffs. */
  ground?: Point[];
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
  /** Small oddities a Zig spots on their own while poking around (flavour only). */
  curios?: Lines;
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
  chapter: "THREE EGGS",
  img: landingImg,
  alt: "Old Earth landing site: three cracked egg pods glowing blue, yellow and red in a dusty crater, a broken overpass and a distant ruined city at sunset",
  label: "OLD EARTH / LANDING SITE",
  bottom: "IMPACT CRATER — DAY ONE",
  spawn: { Oz: { from: { x: 52, y: 70 }, out: "yellow" }, Brix: { from: { x: 30, y: 68 }, out: "blue" }, Lowkey: { from: { x: 72, y: 73 }, out: "red" } },
  edges: [
    ["blue", "slabs"], ["blue", "centre"], ["blue", "trees"], ["trees", "slabs"],
    ["yellow", "centre"], ["yellow", "floor"], ["floor", "red"], ["floor", "wall"],
    ["wall", "rim"], ["wall", "overpass"], ["red", "rubble"], ["red", "centre"],
    ["centre", "front"], ["front", "rubble"], ["front", "slabs"], ["overpass", "rubble"],
  ],
  spots: {
    blue: { at: { x: 34, y: 76 }, words: "blue|big (egg|pod)|brix'?s (egg|pod)", lines: { Brix: ["Hull's cracked. Frame held.", "Big egg. Built to last."], Oz: ["Brix's egg is bigger than mine. Rude.", "Still glowing in there."], Lowkey: ["Still warm inside.", "Blue light. Like a heartbeat."] } },
    yellow: { at: { x: 52, y: 78 }, words: "yellow|small(est)? (egg|pod)|tiny|oz'?s (egg|pod)", lines: { Oz: ["My egg. Tiny. I like it.", "Came out of that? Me? Nice."], Brix: ["Wiring's cooked. Might salvage it later.", "Small, but the welds are clean."], Lowkey: ["Something still hums in there."] } },
    red: { at: { x: 70, y: 82 }, words: "red|lowkey'?s (egg|pod)", lines: { Lowkey: ["Mine. Quiet in there.", "Red glow. Still fading."], Brix: ["Same build as mine. Someone made three.", "Shell's thicker on this one."], Oz: ["Lowkey's egg looks grumpy. Suits him."] } },
    slabs: { at: { x: 31, y: 77 }, words: "slab|concrete|stone", lines: { Brix: ["Poured stone. Old Earth built heavy.", "These were walls once."], Oz: ["Bet this was a wall. Now it's a seat."], Lowkey: ["Broken clean. A long time ago."] } },
    trees: { at: { x: 21, y: 63 }, words: "tree", lines: { Lowkey: ["Nothing's grown here in years."], Oz: ["Even the trees gave up.", "Dead end. Literally."], Brix: ["Dry wood. Burns well, if we need it."] } },
    centre: { at: { x: 57, y: 72 }, words: "middle|centre|center|path|track", lines: { Oz: ["Hello? …Nobody. Great.", "Anyone? No? Cool."], Brix: ["Old track. Something walked here once."], Lowkey: ["Listen. Nothing.", "Too quiet."] } },
    front: { at: { x: 63, y: 83 }, words: "front", lines: { Oz: ["Dust in my headphones already."], Brix: ["Ground's firm. Good."], Lowkey: ["Wind's coming from the north."] } },
    rubble: { at: { x: 85, y: 73 }, words: "rubble|metal|rebar", lines: { Oz: ["Bendy metal! Useful? Probably not."], Brix: ["Rusted through. Not worth carrying."], Lowkey: ["Wind's moved everything here."] } },
    floor: { at: { x: 64, y: 68 }, words: "crater|hole", lines: { Brix: ["Impact crater. We came in hard."], Oz: ["We made this hole? Brilliant."], Lowkey: ["Three landings. One crater. Odd."] } },
    wall: { at: { x: 66, y: 65 }, words: "rim|edge|climb|slope", lines: { Lowkey: ["Ground rises north. Better view up there."], Brix: ["Wall's loose. Mind your feet."], Oz: ["Climbing. My favourite. Not really."] } },
    overpass: { at: { x: 80, y: 67 }, words: "bridge|overpass|road|highway", lines: { Brix: ["A road in the sky. Snapped in half."], Oz: ["Who builds roads up high?"], Lowkey: ["It led somewhere. Once."] } },
    rim: { at: { x: 58, y: 64 }, words: "north|top|up there|view|horizon|city|tower|skyline", lines: { Oz: [], Brix: [], Lowkey: [] } },
  },
  objectives: [{ spot: "rim", tag: { label: "OLD CITY — DISTANT", x: 42, y: 16 }, found: { Lowkey: ["Towers. North, past the road.", "Over here."], Oz: ["Wait — there's a whole city out there!", "Lads! Up here!"], Brix: ["Buildings. Lots of them. Far off.", "Over here."] } }],
  unlock: { seen: 2, ms: 18000, maxMs: 35000 },
  hints: { Lowkey: "Light's different past the north rim.", Brix: "Ground slopes up behind the pods. Could see further.", Oz: "Bet you can see loads from up top." },
  opening: [["Oz", "Ow. My head... What even are we?"], ["Brix", "We must have crash landed here. Pods are scorched... I can't remember a thing."], ["Lowkey", "Neither can I. Look up through the dust... that star up there. Maybe that's where we came from."], ["Oz", "From a star? In three metal eggs? ...Right. Brilliant. Well, we're down here now. Let's have a look around."]],
  gather: { spot: "rim", at: { Oz: { x: 50, y: 66 }, Brix: { x: 66, y: 66 }, Lowkey: { x: 58, y: 64 } } },
  finale: [["Oz", "A city! Maybe someone's home."], ["Brix", "Looks dead from here."], ["Lowkey", "Dead things still have answers."], ["Oz", "Then let's go ask them."]],
  card: { eyebrow: "THREE EGGS · COMPLETE", title: "Old City lies ahead", text: "The crew have spotted the ruined towers on the horizon.", next: "Walk to Old City ›" },
  story: "Day one. You just hatched from egg pods in a dusty crater with the other two. You seem to have crash landed and remember nothing at all — not who you are or where you came from. Lowkey wondered if you came from a faint star visible through the dust; nobody knows. You can see the pods, concrete slabs, dead trees and a broken overpass. Nothing else is known.",
  learned: {"rim": "You have spotted a distant ruined city of towers to the north."},
};

const OLD_CITY: Scene = {
  id: "city",
  title: ["Old ", "City"],
  sub: "Silent towers. Strange markings.",
  chapter: "OLD CITY",
  img: cityImg,
  alt: "Old City: a cracked plaza with an overturned bus, a toppled statue, a dry fountain, painted symbols and stone library steps down a side lane",
  label: "OLD EARTH / OLD CITY",
  bottom: "OLD CITY — CENTRAL PLAZA",
  spawn: { Oz: { from: { x: 46, y: 99 }, out: "entry" }, Brix: { from: { x: 54, y: 99 }, out: "front" }, Lowkey: { from: { x: 50, y: 99 }, out: "crossing" } },
  // Walkable ground traced from the creator's green guide: plaza floor plus the right-hand stairs all the way to the library door.
  // Blocked: overturned bus + traffic light (left), statue mound (centre), banner wall (right), corner rubble.
  ground: [
    { x: 7, y: 100 }, { x: 0, y: 76 }, { x: 8, y: 66 }, { x: 16, y: 49 }, { x: 24, y: 53 }, { x: 26, y: 48 },
    { x: 32, y: 49 }, { x: 47, y: 52 }, { x: 64, y: 52 }, { x: 69, y: 54 }, { x: 75, y: 58 }, { x: 80, y: 53 },
    { x: 86, y: 44 }, { x: 90, y: 34 }, { x: 93, y: 29 }, { x: 98, y: 29 }, { x: 99, y: 47 }, { x: 95, y: 63 },
    { x: 84, y: 75 }, { x: 80, y: 86 }, { x: 79, y: 100 },
  ],
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
  objectives: [
    { spot: "crossing", owner: "Oz", afterCombat: true, tag: { label: "BROKEN MP3 PLAYER", x: 45, y: 58 }, found: { Oz: ["Hang on. Something shiny in the dust.", "An MP3 player? Screen's cracked… and it won't switch on.", "I'm keeping it. Brix might get it working when we're somewhere safe."], Brix: [], Lowkey: [] } },
    { spot: "markings", owner: "Lowkey", tag: { label: "THE SIGN", x: 30, y: 33 }, found: { Lowkey: ["Same symbol as the big doors down the lane.", "It's not decoration. It points the way in — the side bolt."], Oz: [], Brix: [] } },
    { spot: "bus", owner: "Brix", tag: { label: "IRON BAR", x: 22, y: 58 }, found: { Brix: ["Loose bar on this wreck.", "Good lever. Taking it."], Oz: [], Lowkey: [] } },
    { spot: "library", needs: ["markings", "bus", "crossing"], tag: { label: "THE LIBRARY", x: 68, y: 12 },
      locked: { Oz: ["Big doors… chained shut. Rude.", "Need something to open these."], Brix: ["Chained. Rusted solid.", "Need a lever."], Lowkey: ["Locked. There's a mark on the bolt.", "I've seen that mark somewhere."] },
      found: { Oz: ["Bar in the bolt — Brix, heave!", "It's OPEN! Lads, over here!"], Brix: ["Bar in the bolt. Heave.", "Open. Over here."], Lowkey: ["The bolt the sign showed. Bar here.", "It gives. Come."] } },
  ],
  unlock: { seen: 2, ms: 35000, maxMs: 90000 },
  hints: { Lowkey: "Those painted marks keep repeating. And there's a lane off to the right.", Brix: "Building down that side street. Might need tools to get in.", Oz: "What's down that alley? Only one way to find out." },
  opening: [["Oz", "Whoa. Big."], ["Brix", "Dead. All of it."], ["Lowkey", "Something here wants to be found."]],
  gather: { spot: "library", at: { Oz: { x: 79, y: 41 }, Brix: { x: 91, y: 44 }, Lowkey: { x: 86, y: 32 } } },
  finale: [["Oz", "Doors are open!"], ["Brix", "Roof's holding. Mostly."], ["Lowkey", "Writing over the arch. I can read it."], ["Oz", "Then in we go."]],
  card: { eyebrow:  "DISCOVERY", title: "The Library", text: "A crumbling library — chained shut, until you read the sign and found the bar.", next: "Enter the Library ›" },
  curios: { Oz: ["Found a little cog. Pocketing it.", "A tin with a picture of a fish on it. Empty. Tragic."], Brix: ["Copper wire. Keeping that.", "Bolts here were cut, not rusted. Someone salvaged this."], Lowkey: ["Torn scrap of paper. 'River… downstream… others.' The rest is gone.", "Small tracks in the dust. Not ours."] },
  story: "Day one, later. You walked from the landing crater into a dead, silent city: an overturned bus, a fallen statue, a dry fountain, strange painted symbols. You do not know what happened here and have found no water.",
  learned: {
    crossing: "After the last rats were beaten, Oz found a scratched black MP3 player in the street dust. Its screen is cracked and it will not switch on. He pocketed it to show Brix once they find somewhere safe; it has not been repaired or powered yet.",
    markings: "Lowkey worked out the painted symbol matches a bolt on some big doors down a side lane.",
    bus: "Brix pulled a loose iron bar off the overturned bus to use as a lever.",
    library: "Down a side lane you found an old stone library chained shut; with Lowkey's sign and Brix's iron bar you forced the bolt open. Words carved over the arch, you can somehow read them.",
  },
};

const LIBRARY: Scene = {
  id: "library",
  title: ["The ", "Library"],
  sub: "Books they somehow know how to read.",
  chapter: "THE LIBRARY",
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
  card: { eyebrow: "THE LIBRARY · COMPLETE", title: "The Long Walk", text: "No water, no safe home — just a question they can't forget. Time to walk.", next: "Leave the city ›" },
  story: "Inside the old stone building from the city: a crumbling hall full of fallen shelves, loose pages and light through a broken roof. No water here.",
  learned: {"desk": "Oz found a book by an old music machine and can somehow read it: it is full of written-down rhythms.", "pedestal": "Brix found a book on a stone stand and can somehow read it: plans for how things were built.", "window": "Lowkey found a book by the window and can somehow read it: names, places and unfamiliar stars."},
};

const LONG_WALK: Scene = {
  id: "long-walk",
  title: ["The Long ", "Walk"],
  sub: "Dead roads. Broken hills. Something stirring.",
  chapter: "THE LONG WALK",
  img: walkImg,
  alt: "A cracked road winds out of grey ruins through dead hills; grass and a clean stream appear further on, and from a rocky ridge a lush green river valley shines below the mountains",
  label: "OLD EARTH / THE LONG WALK",
  bottom: "BROKEN HILLS — LEAVING OLD CITY",
  spawn: { Oz: { from: { x: 42, y: 84 }, out: "plateau" }, Brix: { from: { x: 50, y: 85 }, out: "plateau" }, Lowkey: { from: { x: 58, y: 84 }, out: "plateau" } },
  startStill: true,
  // Road from the city, the stream flats and the rock plateau; the right-hand ledge drop and far hills are off limits.
  ground: [
    { x: 4, y: 98 }, { x: 8, y: 80 }, { x: 12, y: 66 }, { x: 20, y: 56 }, { x: 25, y: 48 }, { x: 30, y: 41 },
    { x: 46, y: 41 }, { x: 58, y: 42 }, { x: 74, y: 41 }, { x: 76, y: 56 }, { x: 78, y: 68 }, { x: 84, y: 76 },
    { x: 98, y: 80 }, { x: 98, y: 98 },
  ],
  edges: [
    ["road", "bend"], ["road", "sign"], ["bend", "ruins"], ["bend", "deadtree"], ["sign", "sprout"],
    ["bend", "stream"], ["deadtree", "stream"], ["stream", "sprout"], ["stream", "trees"], ["sprout", "plateau"],
    ["plateau", "slope"], ["slope", "ridge"], ["trees", "ridge"],
  ],
  spots: {
    road: { at: { x: 19, y: 80 }, words: "road|back|city", lines: { Oz: ["City's behind us. Good riddance."], Brix: ["Road's cracked but it goes somewhere."], Lowkey: ["Don't look back too long."] } },
    bend: { at: { x: 24, y: 62 }, words: "bend|corner|road up", lines: { Oz: ["Uphill. Course it is."], Brix: ["Road winds. Saves the legs."], Lowkey: ["The hills go on and on."] } },
    ruins: { at: { x: 18, y: 50 }, words: "ruin|tower|wall", lines: { Brix: ["Last of the city. Crumbling."], Oz: ["Nothing in there. Just dust."], Lowkey: ["Even the walls gave up."] } },
    sign: { at: { x: 33, y: 60 }, words: "sign|post", lines: { Oz: ["A sign! It says… rust."], Brix: ["Pointed somewhere once."], Lowkey: ["Words worn off. Like everything."] } },
    deadtree: { at: { x: 40, y: 44 }, words: "dead|tree|branch", lines: { Brix: ["Dead tree. Dry as bone."], Oz: ["Tree's had a rough day. Century."], Lowkey: ["Not even birds."] } },
    stream: { at: { x: 50, y: 50 }, words: "stream|water|drink|river", lines: { Brix: ["Water. Running clear. Not rusty.", "Drinkable, I reckon."], Oz: ["WATER! Actual water!", "I'm drinking all of it."], Lowkey: ["It's moving. Nothing else here moves."] } },
    sprout: { at: { x: 50, y: 62 }, words: "grass|sprout|plant|green", lines: { Oz: ["Wait… is that grass?! Out of the rock!"], Brix: ["Green shoots. Wasn't expecting that."], Lowkey: ["The ground feels different here. Awake."] } },
    trees: { at: { x: 66, y: 49 }, words: "tree|trees|leaf|leaves", lines: { Lowkey: ["Leaves. Alive ones."], Brix: ["Healthy trees. Roots find water."], Oz: ["Trees that aren't dead! Fancy."] } },
    plateau: { at: { x: 60, y: 72 }, words: "rock|plateau|flat", lines: { Brix: ["Solid rock. Good footing."], Oz: ["Big flat bit. Nap spot."], Lowkey: ["Greener the further we go."] } },
    slope: { at: { x: 61, y: 57 }, words: "slope|up|climb", lines: { Oz: ["Up we go."], Brix: ["Steady climb. Watch the loose rock."], Lowkey: ["Higher. The air changes."] } },
    ridge: { at: { x: 70, y: 44 }, words: "ridge|edge|cliff|valley|overlook|view|top", lines: { Oz: [], Brix: [], Lowkey: [] } },
  },
  objectives: [{ spot: "ridge", tag: { label: "THE GREEN VALLEY", x: 80, y: 30 }, found: { Oz: ["Whoa. Look down there!", "Why is it so GREEN over there?!"], Brix: ["A valley. River, trees, flat ground.", "Come see this."], Lowkey: ["Down there. Everything's alive.", "Come. Look."] } }],
  unlock: { seen: 3, ms: 35000, maxMs: 95000 },
  hints: { Oz: "That rock ledge — bet you can see for miles.", Brix: "Ground rises to an edge over there. Worth a look.", Lowkey: "The air past that ridge smells green." },
  opening: [["Oz", "Out of the city. Finally."], ["Brix", "Need water. Soon."], ["Lowkey", "Keep walking. Something's out there."]],
  gather: { spot: "ridge", at: { Oz: { x: 63, y: 47 }, Brix: { x: 72, y: 47 }, Lowkey: { x: 67, y: 43 } } },
  finale: [["Oz", "It's like the whole world forgot to die down there."], ["Brix", "River. Trees. Flat ground. Could build there."], ["Lowkey", "It's been waiting."], ["Oz", "Then let's not keep it waiting."]],
  card: { eyebrow: "THE LONG WALK · COMPLETE", title: "The Green Valley", text: "Beyond the dead hills, a valley full of life — a river bend, tall trees, mountains watching.", next: "Head down to the river ›" },
  curios: { Oz: ["Was that smoke? Way off, past the hills. …Gone now.", "Blue flicker over the mountains. Tell me you saw that."], Brix: ["Old fence post. Someone fenced this land once.", "Big claw marks on this rock. Fresh-ish. Let's not hang about."], Lowkey: ["Footprints. Small. Heading the same way we are.", "Something big dragged itself through here. Towards water."] },
  story: "After the Library you left Old City on foot searching for water. Dead roads, broken hills, dead trees, dust. The further you walk, the more you notice tiny signs of life you did not expect. You have no home and no idea where you are going. You have never seen any valley or river here.",
  learned: { stream: "You found a clean running stream and drank: the first fresh water you've had.", sprout: "Green grass is pushing up through the rock — the land seems to be waking as you pass.", trees: "Living trees with fresh leaves grow further along the route.", ridge: "From a rocky ridge you saw a lush green valley below: a curving river, tall evergreens, mountains behind, and no buildings at all. You have never been there." },
};

export const PROLOGUE_SCENES: Scene[] = [LANDING, OLD_CITY, LIBRARY, LONG_WALK];

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

/** Scenes the visitor has actually finished, in story order (prologue ids + "sanctuary" + "haven"). */
export const CLEARED_KEY = "zygoria-cleared-v1";
/** Device-only creator switch: unlocks the full scene picker and skips. */
export const EDITOR_KEY = "zygoria-editor-mode";

/** Openings used when the crew comes back to a scene they've already lived through. */
export const RETURN_OPENINGS: Record<string, [Agent, string][]> = {
  landing: [["Oz", "Our eggs. Still here. Still cracked. Still mine."], ["Lowkey", "Something's growing by the blue pod. That's new."], ["Brix", "First place we ever stood. Feels smaller now."]],
  city: [["Brix", "Back in the Old City. Eyes open — those rats came from somewhere."], ["Lowkey", "We missed corners last time. Let's check them."], ["Oz", "If a rat so much as squeaks, it's getting zapped."]],
  library: [["Lowkey", "The library. We only read the first shelf last time."], ["Oz", "Our books are still where we left them. Kind of sweet."], ["Brix", "Look for what we didn't see. Not what we did."]],
  "long-walk": [["Brix", "The road where we beat Shelton. Ground still scorched."], ["Oz", "Ha. Remember his face? Classic."], ["Lowkey", "He'll be back. Keep scanning the ridge."]],
};

/** Keep a point on a scene's safe ground: inside stays put, outside snaps just inside the nearest edge. */
export function onGround(scene: Scene, p: Point): Point {
  const g = scene.ground; if (!g || g.length < 3) return p;
  let inside = false;
  for (let i = 0, j = g.length - 1; i < g.length; j = i++) {
    const a = g[i]!, b = g[j]!;
    if ((a.y > p.y) !== (b.y > p.y) && p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x) inside = !inside;
  }
  if (inside) return p;
  let best = p, bd = Infinity;
  for (let i = 0, j = g.length - 1; i < g.length; j = i++) {
    const a = g[j]!, b = g[i]!, dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
    const q = { x: a.x + dx * t, y: a.y + dy * t }, d = Math.hypot(p.x - q.x, p.y - q.y);
    if (d < bd) { bd = d; best = q; }
  }
  const cx = g.reduce((s, v) => s + v.x, 0) / g.length, cy = g.reduce((s, v) => s + v.y, 0) / g.length;
  const k = Math.hypot(cx - best.x, cy - best.y) || 1;
  return { x: best.x + (cx - best.x) / k * 1.5, y: best.y + (cy - best.y) / k * 1.5 };
}
