import landingImg from "@/assets/zone-landing.jpg";
import type { Agent, Point } from "@/lib/zones";

/** Saved once the visitor has lived through (or skipped) the opening. */
export const PROLOGUE_KEY = "zygoria-prologue-v1";

export type Spot = {
  at: Point;
  label?: string;
  /** What each Zig says when they stop here to look around. */
  lines: Record<Agent, string[]>;
};

/**
 * Chapter 1 — Egg Landing. A walkable graph over the artwork (percent of image):
 * nodes only sit on open ground, edges only cross open ground, so nobody walks
 * through pods, crater walls or rubble. The skyline view is one spot among many.
 */
export const LANDING = {
  img: landingImg,
  aspect: 1520 / 1024,
  label: "OLD EARTH / LANDING SITE",
  bottom: "IMPACT CRATER — DAY ONE",
  objective: "rim",
  spawn: { Oz: { inside: { x: 55.5, y: 55 }, out: "yellow" }, Brix: { inside: { x: 33, y: 56 }, out: "blue" }, Lowkey: { inside: { x: 74, y: 57 }, out: "red" } } as Record<Agent, { inside: Point; out: string }>,
  edges: [
    ["blue", "slabs"], ["blue", "centre"], ["blue", "trees"], ["trees", "slabs"],
    ["yellow", "centre"], ["yellow", "floor"], ["floor", "red"], ["floor", "wall"],
    ["wall", "rim"], ["wall", "overpass"], ["red", "rubble"], ["red", "centre"],
    ["centre", "front"], ["front", "rubble"], ["front", "slabs"], ["overpass", "rubble"],
  ] as [string, string][],
  spots: {
    blue: { at: { x: 35, y: 63 }, lines: { Brix: ["Hull's cracked. Frame held.", "Big egg. Built to last."], Oz: ["Brix's egg is bigger than mine. Rude.", "Still glowing in there."], Lowkey: ["Still warm inside.", "Blue light. Like a heartbeat."] } },
    yellow: { at: { x: 57, y: 60.5 }, lines: { Oz: ["My egg. Tiny. I like it.", "Came out of that? Me? Nice."], Brix: ["Wiring's cooked. Might salvage it later.", "Small, but the welds are clean."], Lowkey: ["Something still hums in there."] } },
    red: { at: { x: 71, y: 64 }, lines: { Lowkey: ["Mine. Quiet in there.", "Red glow. Still fading."], Brix: ["Same build as mine. Someone made three.", "Shell's thicker on this one."], Oz: ["Lowkey's egg looks grumpy. Suits him."] } },
    slabs: { at: { x: 31, y: 77 }, label: "CONCRETE SLABS", lines: { Brix: ["Poured stone. Old Earth built heavy.", "These were walls once."], Oz: ["Bet this was a wall. Now it's a seat."], Lowkey: ["Broken clean. A long time ago."] } },
    trees: { at: { x: 21, y: 63 }, label: "DEAD TREES", lines: { Lowkey: ["Nothing's grown here in years."], Oz: ["Even the trees gave up.", "Dead end. Literally."], Brix: ["Dry wood. Burns well, if we need it."] } },
    centre: { at: { x: 57, y: 72 }, lines: { Oz: ["Hello? …Nobody. Great.", "Anyone? No? Cool."], Brix: ["Old track. Something walked here once."], Lowkey: ["Listen. Nothing.", "Too quiet."] } },
    front: { at: { x: 63, y: 83 }, lines: { Oz: ["Dust in my headphones already."], Brix: ["Ground's firm. Good."], Lowkey: ["Wind's coming from the north."] } },
    rubble: { at: { x: 85, y: 73 }, label: "RUBBLE", lines: { Oz: ["Bendy metal! Useful? Probably not."], Brix: ["Rusted through. Not worth carrying."], Lowkey: ["Wind's moved everything here."] } },
    floor: { at: { x: 65, y: 54 }, lines: { Brix: ["Impact crater. We came in hard."], Oz: ["We made this hole? Brilliant."], Lowkey: ["Three landings. One crater. Odd."] } },
    wall: { at: { x: 66, y: 42 }, label: "CRATER RIM", lines: { Lowkey: ["Ground rises north. Better view up there."], Brix: ["Wall's loose. Mind your feet."], Oz: ["Climbing. My favourite. Not really."] } },
    overpass: { at: { x: 82, y: 50 }, label: "BROKEN OVERPASS", lines: { Brix: ["A road in the sky. Snapped in half."], Oz: ["Who builds roads up high?"], Lowkey: ["It led somewhere. Once."] } },
    rim: { at: { x: 58, y: 34 }, label: "THE FAR RIM", lines: { Lowkey: ["Towers. North, past the road."], Oz: ["Wait — come look! There's a whole city out there!"], Brix: ["Buildings. Lots of them. Far off."] } },
  } as Record<string, Spot>,
  opening: [["Oz", "Ow. Where are we?"], ["Brix", "Somewhere dead. Pods held, though."], ["Lowkey", "No voices. Just wind."], ["Oz", "Right. Let's have a look around."]] as [Agent, string][],
  reactions: { Oz: ["Ha. Fair.", "Weird.", "Told you."], Brix: ["Noted.", "Hm.", "Don't touch it."], Lowkey: ["Mm.", "Agreed.", "Careful."] } as Record<Agent, string[]>,
  hints: { Lowkey: "Light's different past the north rim.", Brix: "Ground slopes up behind the pods. Could see further.", Oz: "Bet you can see loads from up top." } as Record<Agent, string>,
  gather: { Oz: { x: 49, y: 37 }, Brix: { x: 67, y: 39 }, Lowkey: { x: 58, y: 34 } } as Record<Agent, Point>,
  finale: [["Oz", "A city! Maybe someone's home."], ["Brix", "Looks dead from here."], ["Lowkey", "Dead things still have answers."], ["Oz", "Then let's go ask them."]] as [Agent, string][],
};

/** Shortest node path over the walkable graph (breadth-first). */
export function routeBetween(from: string, to: string): string[] {
  const prev: Record<string, string | null> = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const n = queue.shift()!;
    if (n === to) break;
    for (const [a, b] of LANDING.edges) {
      const m = a === n ? b : b === n ? a : null;
      if (m && !(m in prev)) { prev[m] = n; queue.push(m); }
    }
  }
  const path: string[] = [];
  for (let n: string | null = to; n && n !== from; n = prev[n] ?? null) path.unshift(n);
  return path;
}
