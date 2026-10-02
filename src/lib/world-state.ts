import { HOME, ZONES, type Agent, type Point, type ZoneId } from "@/lib/zones";

/** One interactive world object a Zig can change. States advance one step per completed action. */
export type WorldObject = { id: string; zone: ZoneId; agent: Agent; name: string; states: string[]; verbs: string[]; discovery?: string };
export type WorldState = { levels: Record<string, number>; discoveries: string[] };
export type WorldChange = { objectId: string; agent: Agent; verb: string; name: string; from: string; to: string; discovery?: string | undefined };

/** Role-specific verbs: Brix builds and repairs, Oz powers and operates, Lowkey scouts and investigates. */
export const ROLE_VERBS: Record<Agent, { verb: string; match: RegExp }[]> = {
  Brix: [
    { verb: "repairing", match: /repair|fix|mend|patch/i },
    { verb: "building", match: /build|make|craft|construct/i },
    { verb: "modifying", match: /modif|upgrade|improve|rig/i },
    { verb: "inspecting", match: /inspect|check|look at|test/i },
  ],
  Oz: [
    { verb: "powering up", match: /power|charge|energ|electric/i },
    { verb: "playing", match: /play|music|sound|speaker|tune/i },
    { verb: "activating", match: /activate|switch|turn on|start/i },
    { verb: "testing", match: /test|try|operate|run/i },
  ],
  Lowkey: [
    { verb: "scouting", match: /scout|explore|search|find/i },
    { verb: "investigating", match: /investigat|study|research|lore|history/i },
    { verb: "observing", match: /watch|observe|look|moon/i },
  ],
};

const DEFAULT_VERB: Record<Agent, string> = { Brix: "repairing", Oz: "powering up", Lowkey: "scouting" };

export const WORLD_OBJECTS: WorldObject[] = [
  { id: "sanc-workbench", zone: "sanctuary", agent: "Brix", name: "Workshop rig", states: ["BROKEN", "REPAIRED", "UPGRADED"], verbs: ["repairing", "building", "modifying", "inspecting"] },
  { id: "sanc-speakers", zone: "sanctuary", agent: "Oz", name: "Shack speakers", states: ["SILENT", "POWERED", "PLAYING"], verbs: ["powering up", "playing", "activating", "testing"] },
  { id: "sanc-ridge", zone: "sanctuary", agent: "Lowkey", name: "Ridge watch", states: ["UNSCOUTED", "SCOUTED", "CHARTED"], verbs: ["scouting", "observing", "investigating"], discovery: "waking" },
  { id: "ruins-salvage", zone: "ruins", agent: "Brix", name: "Salvage heap", states: ["BURIED", "SORTED", "STRIPPED"], verbs: ["repairing", "building", "modifying", "inspecting"], discovery: "salvage" },
  { id: "ruins-terminal", zone: "ruins", agent: "Oz", name: "Old terminal", states: ["DEAD", "FLICKERING", "LIT"], verbs: ["powering up", "playing", "activating", "testing"], discovery: "lights" },
  { id: "ruins-bridge", zone: "ruins", agent: "Lowkey", name: "Bridge approach", states: ["UNSCOUTED", "SCOUTED", "MAPPED"], verbs: ["scouting", "observing", "investigating"], discovery: "ruins" },
  { id: "caves-crates", zone: "caves", agent: "Brix", name: "Supply crates", states: ["SMASHED", "RESTACKED", "REINFORCED"], verbs: ["repairing", "building", "modifying", "inspecting"] },
  { id: "caves-racks", zone: "caves", agent: "Oz", name: "Lantern line", states: ["DARK", "LIT", "GLOWING"], verbs: ["powering up", "playing", "activating", "testing"] },
  { id: "caves-mouth", zone: "caves", agent: "Lowkey", name: "Cave mouth", states: ["UNSCOUTED", "SCOUTED", "MAPPED"], verbs: ["scouting", "observing", "investigating"], discovery: "caves" },
  { id: "cronk-debris", zone: "cronk", agent: "Brix", name: "Sunken machine", states: ["SUNK", "HAULED", "PATCHED"], verbs: ["repairing", "building", "modifying", "inspecting"] },
  { id: "cronk-sign", zone: "cronk", agent: "Lowkey", name: "Warning sign", states: ["UNSCOUTED", "READ", "MARKED"], verbs: ["scouting", "observing", "investigating"], discovery: "swamp" },
  { id: "cronk-rise", zone: "cronk", agent: "Oz", name: "Signal flare", states: ["UNLIT", "ARMED", "BURNING"], verbs: ["powering up", "playing", "activating", "testing"] },
  { id: "camp-rack", zone: "shelton", agent: "Brix", name: "Tool rack", states: ["RUSTED", "SHARPENED", "REFITTED"], verbs: ["repairing", "building", "modifying", "inspecting"] },
  { id: "camp-gate", zone: "shelton", agent: "Oz", name: "Gate panel", states: ["LOCKED", "SPARKING", "OPEN"], verbs: ["powering up", "playing", "activating", "testing"] },
  { id: "camp-tower", zone: "shelton", agent: "Lowkey", name: "Watchtower view", states: ["UNSCOUTED", "WATCHED", "MAPPED"], verbs: ["scouting", "observing", "investigating"], discovery: "camp" },
];

/** Where an object sits: at the end of its Zig's work route, or home when they have none — so the Zig really walks there. */
export function objectPoint(o: WorldObject): Point {
  const z = ZONES[o.zone];
  return z.work[o.agent]?.at(-1) ?? HOME(z, o.agent);
}

export const objectFor = (zone: ZoneId, agent: Agent) => WORLD_OBJECTS.find(o => o.zone === zone && o.agent === agent)!;

export function chooseVerb(agent: Agent, directive: string) {
  return ROLE_VERBS[agent].find(v => v.match.test(directive))?.verb ?? DEFAULT_VERB[agent];
}

/** Advances the object one state (it stays at its final state once fully changed) and records any discovery. */
export function applyAction(state: WorldState, zone: ZoneId, agent: Agent, directive: string): { next: WorldState; change: WorldChange } {
  const o = objectFor(zone, agent);
  const lvl = state.levels[o.id] ?? 0;
  const nextLvl = Math.min(lvl + 1, o.states.length - 1);
  const discoveries = o.discovery && !state.discoveries.includes(o.discovery) ? [...state.discoveries, o.discovery] : state.discoveries;
  return {
    next: { levels: { ...state.levels, [o.id]: nextLvl }, discoveries },
    change: { objectId: o.id, agent, verb: chooseVerb(agent, directive), name: o.name, from: o.states[lvl]!, to: o.states[nextLvl]!, discovery: discoveries !== state.discoveries ? o.discovery : undefined },
  };
}

export const WORLD_KEY = "zygoria-world-v1";
export const EMPTY_WORLD: WorldState = { levels: {}, discoveries: [] };
