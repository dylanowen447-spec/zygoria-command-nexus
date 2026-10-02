import worldImg from "@/assets/zygoria-world-green-trees-v2.png";
import ruinsImg from "@/assets/zone-ruins.jpg";
import cavesImg from "@/assets/zone-caves.jpg";
import swampImg from "@/assets/zone-swamp.jpg";
import campImg from "@/assets/zone-camp.jpg";

export type Agent = "Oz" | "Brix" | "Lowkey";
export type Point = { x: number; y: number };
export type ZoneId = "sanctuary" | "ruins" | "caves" | "cronk" | "shelton";

export type ZoneTag = { label: string; x: number; y: number };

export type Zone = {
  id: ZoneId;
  /** Page heading split as [plain, highlighted]. */
  title: [string, string];
  /** Short chip label for the zone selector. */
  chip: string;
  sub: string;
  indexA: string;
  indexB: string;
  /** Top-left map coordinate label. */
  label: string;
  /** Bottom-left map coordinate label. */
  bottom: string;
  /** Short label for Mission Control. */
  short: string;
  /** Meeting area name used in activity logs. */
  meetName: string;
  img: string;
  alt: string;
  /** Aspect ratio (width/height) of the artwork, so markers stay locked to the image box. */
  aspect: number;
  /** Landmark tags rendered on the scene. */
  tags: ZoneTag[];
  /** Walkable route for each character, from their spot in this zone to the meeting area. */
  paths: Record<Agent, Point[]>;
  /** Work spots reached from the character's own route along open ground. */
  work: Partial<Record<Agent, Point[]>>;
};

/** Aspect of the Sanctuary artwork; zone artwork is generated at the same ratio. */
const SANCTUARY_ASPECT = 1264 / 848;
const ZONE_ASPECT = 1520 / 1024;

export const ZONES: Record<ZoneId, Zone> = {
  sanctuary: {
    id: "sanctuary",
    title: ["The ", "Sanctuary"],
    chip: "SANCTUARY",
    sub: "Built from the crash. Held by three.",
    indexA: "HOME BASE",
    indexB: "SECURE",
    label: "ZYGORIA / THE SANCTUARY",
    bottom: "THE SANCTUARY — EST. ARRIVAL DAY",
    short: "SANCTUARY",
    meetName: "crossroads",
    img: worldImg,
    alt: "The Sanctuary: Oz, Brix and Lowkey's rebuilt home base — a salvaged riverside shack, Brix's scrap workshop, their three landing pods, a lookout tower and reused Old Earth ruins",
    aspect: SANCTUARY_ASPECT,
    tags: [],
    // Open ground right of the shack (clear of the building and its lantern light) → glowing lower trail → crossroads
    paths: {
      Oz: [{ x: 26, y: 63 }, { x: 30.5, y: 60.8 }, { x: 35, y: 60.3 }, { x: 40, y: 60 }, { x: 46, y: 59.6 }],
      // Workshop yard (left of the building, clear of scrap piles) → lower glowing trail → crossroads
      Brix: [{ x: 63, y: 56.4 }, { x: 60, y: 57.1 }, { x: 56.5, y: 58 }, { x: 53, y: 58.7 }],
      // Open plateau track right of the treeline (flat, clear of the pines) → down the open grass east of the lone pine → crossroads
      Lowkey: [{ x: 47.5, y: 41 }, { x: 50, y: 43.5 }, { x: 50.7, y: 47 }, { x: 50.5, y: 54 }, { x: 53, y: 58.7 }],
    },
    // Work spots reached from home along open ground: Brix up the glowing trail to the workshop entrance, Lowkey up the plateau track toward the lookout.
    work: {
      Brix: [{ x: 67.5, y: 54.6 }, { x: 71, y: 52.8 }],
      Lowkey: [{ x: 50.5, y: 39 }, { x: 53.5, y: 38 }],
    },
  },
  ruins: {
    id: "ruins",
    title: ["Old Earth ", "Ruins"],
    sub: "The dead city. Still full of salvage.",
    indexA: "RUINS",
    indexB: "SALVAGE",
    label: "ZYGORIA / OLD EARTH RUINS",
    bottom: "RUINS — CAMBRIDGE REGION",
    short: "OLD EARTH RUINS",
    meetName: "ruin clearing",
    img: ruinsImg,
    alt: "The Old Earth ruins: collapsed towers, rusted pylons and a broken bridge under a dramatic dusk sky, with faint restored blue lights",
    aspect: ZONE_ASPECT,
    tags: [
      { label: "OLD EARTH RUINS", x: 44, y: 40 },
      { label: "BROKEN BRIDGE", x: 71, y: 46 },
    ],
    // Open cracked dirt left of centre → up the old road → the clearing before the bridge
    paths: {
      Oz: [{ x: 30, y: 72 }, { x: 36, y: 69 }, { x: 41, y: 66 }, { x: 45.5, y: 63.8 }],
      // Open dirt right of centre → across the rubble-free yard → the clearing before the bridge
      Brix: [{ x: 68, y: 74 }, { x: 63, y: 70 }, { x: 57.5, y: 66.5 }, { x: 52.5, y: 63.8 }],
      // On the old road before the bridge approach → down the open road → the clearing
      Lowkey: [{ x: 47, y: 53 }, { x: 48, y: 56.5 }, { x: 49, y: 60 }, { x: 50, y: 62.8 }],
    },
    work: {
      // Oz inspects the rubble shelf left of centre
      Oz: [{ x: 34, y: 68.5 }, { x: 36, y: 65.5 }, { x: 36, y: 64 }],
      // Brix works the salvage mound on the right
      Brix: [{ x: 71, y: 69.5 }, { x: 73, y: 66.5 }, { x: 73.5, y: 64 }],
      // Lowkey observes from the road before the bridge span
      Lowkey: [{ x: 45.5, y: 50.5 }, { x: 44.5, y: 48.5 }],
    },
  },
  caves: {
    id: "caves",
    chip: "CAVES",
    title: ["Survivor ", "Caves"],
    sub: "Where the last people hide.",
    indexA: "CAVES",
    indexB: "SHELTER",
    label: "ZYGORIA / SURVIVOR CAVES",
    bottom: "CAVE SETTLEMENT — HIDDEN",
    short: "SURVIVOR CAVES",
    meetName: "cave clearing",
    img: cavesImg,
    alt: "The survivor caves: rocky cave mouths with warm lantern light, a patched tarp shelter, drying fish on a line and a campfire in a hidden valley",
    aspect: ZONE_ASPECT,
    tags: [
      { label: "SURVIVOR CAVES", x: 63, y: 41 },
      { label: "FISH RACKS", x: 16, y: 55 },
    ],
    // Open dirt left of centre → across the clearing → cave clearing
    paths: {
      Oz: [{ x: 36, y: 67 }, { x: 41, y: 64.5 }, { x: 46, y: 63 }, { x: 51, y: 62.2 }],
      // Open dirt right of centre, clear of the campfire → across the clearing → cave clearing
      Brix: [{ x: 66, y: 68 }, { x: 61, y: 65.5 }, { x: 56, y: 63.5 }, { x: 52, y: 62.2 }],
      // Front of the cave slope → down to the clearing
      Lowkey: [{ x: 49, y: 57 }, { x: 50, y: 59 }, { x: 51.5, y: 60.8 }, { x: 52, y: 62 }],
    },
    work: {
      // Oz checks the fish racks by the stream
      Oz: [{ x: 38, y: 63.5 }, { x: 35.5, y: 61 }, { x: 34, y: 58.5 }],
      // Brix works the crates by the cave entrance
      Brix: [{ x: 63, y: 63.5 }, { x: 62, y: 60 }, { x: 61.5, y: 57 }],
      // Lowkey watches the cave mouth threshold
      Lowkey: [{ x: 53, y: 55.5 }, { x: 55.5, y: 54.5 }, { x: 57.5, y: 54.5 }],
    },
  },
  cronk: {
    id: "cronk",
    chip: "SWAMP",
    title: ["Cronk's ", "Territory"],
    sub: "His swamp. His rules. Watch your step.",
    indexA: "SWAMP",
    indexB: "HOSTILE",
    label: "ZYGORIA / CRONK'S TERRITORY",
    bottom: "SWAMPLANDS — DO NOT WANDER",
    short: "CRONK'S TERRITORY",
    meetName: "mud trail",
    img: swampImg,
    alt: "Cronk's swamp territory: murky dead water, twisted trees, sunken machinery and rat silhouettes among the reeds under a heavy dusk sky",
    aspect: ZONE_ASPECT,
    tags: [
      { label: "CRONK'S TERRITORY", x: 72, y: 38 },
      { label: "DEAD MARSH", x: 34, y: 45 },
    ],
    // Lower mud track → winding up the safe trail → the mud trail bend
    paths: {
      Oz: [{ x: 66, y: 79 }, { x: 68.5, y: 72 }, { x: 70.5, y: 65.5 }, { x: 72, y: 60.3 }],
      // Grassy bank on the right → down the bank → the mud trail bend
      Brix: [{ x: 77, y: 71 }, { x: 75, y: 67.5 }, { x: 73.5, y: 63.5 }, { x: 72, y: 60.3 }],
      // Upper bank near the warning sign → down the bank → the mud trail bend
      Lowkey: [{ x: 81, y: 64 }, { x: 78.5, y: 62.5 }, { x: 75.5, y: 61.3 }, { x: 72, y: 60.3 }],
    },
    work: {
      // Oz scopes the rise below the warning sign
      Oz: [{ x: 74, y: 56 }, { x: 76, y: 52.5 }, { x: 77.5, y: 49.5 }],
      // Brix works the debris at the water's edge
      Brix: [{ x: 70.5, y: 63 }, { x: 69.5, y: 60.5 }],
      // Lowkey creeps toward the warning sign
      Lowkey: [{ x: 81, y: 58 }, { x: 82.5, y: 53.5 }, { x: 83, y: 50 }],
    },
  },
  shelton: {
    id: "shelton",
    chip: "CAMP",
    title: ["Shelton's ", "Camp"],
    sub: "A work camp run by a turtle with guards.",
    indexA: "CAMP",
    indexB: "GUARDED",
    label: "ZYGORIA / SHELTON'S CAMP",
    bottom: "WORK CAMP — RESTRICTED",
    short: "SHELTON'S CAMP",
    meetName: "camp yard",
    img: campImg,
    alt: "Shelton's work camp: a fortified yard of scrap fences, a watchtower with a purple spotlight, container barracks and dug trenches under a violet dusk sky",
    aspect: ZONE_ASPECT,
    tags: [
      { label: "SHELTON'S CAMP", x: 37, y: 22 },
      { label: "THE GATE", x: 64, y: 42 },
    ],
    // Open yard left of centre → across the yard → camp yard centre
    paths: {
      Oz: [{ x: 38, y: 72 }, { x: 42, y: 70 }, { x: 46, y: 68 }, { x: 50, y: 66.3 }],
      // Open yard right of centre → across the yard → camp yard centre
      Brix: [{ x: 61, y: 72 }, { x: 57, y: 70 }, { x: 53.5, y: 68 }, { x: 50, y: 66.3 }],
      // Lower right yard → across the yard → camp yard centre
      Lowkey: [{ x: 70, y: 77 }, { x: 63, y: 72.5 }, { x: 56, y: 68.8 }, { x: 50, y: 66.3 }],
    },
    work: {
      // Oz works near the container gate end
      Oz: [{ x: 44, y: 63.5 }, { x: 44.5, y: 60.5 }],
      // Brix works the tool rack end of the yard
      Brix: [{ x: 65, y: 68.5 }, { x: 66.5, y: 65.5 }, { x: 67, y: 63 }],
      // Lowkey observes from the yard below the watchtower light
      Lowkey: [{ x: 63, y: 63 }, { x: 62, y: 58 }],
    },
  },
};

export const ZONE_LIST: Zone[] = [ZONES.sanctuary, ZONES.ruins, ZONES.caves, ZONES.cronk, ZONES.shelton];

export const HOME = (z: Zone, agent: Agent) => z.paths[agent][0]!;
export const toMeet = (z: Zone, agent: Agent) => z.paths[agent].slice(1);
export const toHome = (z: Zone, agent: Agent) => z.paths[agent].slice(0, -1).reverse();
export const trailPoints = (z: Zone, agent: Agent) =>
  [...(z.work[agent] ?? []).slice().reverse(), ...z.paths[agent]].map(p => `${p.x},${p.y}`).join(" ");
