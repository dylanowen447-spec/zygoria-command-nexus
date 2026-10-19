import * as Atmos from "@/lib/atmosphere";
import { StartCover } from "@/components/StartCover";
import { BuildInterlude } from "@/components/BuildInterlude";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowRight, Check, ChevronRight, CircleDot, Command, Cpu, Crosshair, Hexagon, MapPin, Radio, Send, Signal, Sparkles, Terminal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { ShackRadio } from "@/components/ShackRadio";
import { chooseJobRoute, getCanonState, runCrewStep } from "@/lib/job-planning.functions";
import { ZONES, ZONE_LIST, HOME, toMeet, toHome, type CrewAgent, type Point, type ZoneId } from "@/lib/zones";
import { findGroupPlan, findUserCommand, GROUP_OFFSETS } from "@/lib/group-plans";
import ozPortrait from "@/assets/oz-portrait.webp.asset.json";
import ozCrewIcon from "@/assets/oz-crew-icon.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";
import moxiUnderTree from "@/assets/moxi-under-tree.webp.asset.json";
import moxiPortrait from "@/assets/moxi-sanctuary.webp.asset.json";
import moxiCard from "@/assets/moxi-card.png.asset.json";
import ozWordmark from "@/assets/oz-wordmark.png.asset.json";
import brixWordmark from "@/assets/brix-wordmark.png.asset.json";
import lowkeyWordmark from "@/assets/lowkey-wordmark.png.asset.json";
import moxiWordmark from "@/assets/moxi-wordmark.png.asset.json";
import firePitImg from "@/assets/fire-pit.png";
import { FieldCodex } from "@/components/FieldCodex";
import { SanctuaryTV } from "@/components/SanctuaryTV";
import { TV_CODEX, TV_ESCAPED, TV_KEY, TV_NIGHT_MS } from "@/lib/tv-mission";
import { EMPTY_STORY, MOXI_SCENE, SANCTUARY_SIGNAL, SANCTUARY_TIME_KEY, STORY_KEY, chapterDone, lastBeat, lockedZones, nextBeat, type StoryBeat, type StoryState } from "@/lib/story";
const MP3_AFTER = 120;
const PET_AFTER = 60;
const PET_KEY = "zygoria-boulder-pot-v1";
import { WelcomeGuide } from "@/components/WelcomeGuide";
import { CHRONICLES } from "@/lib/chronicles";
import { CreatorCredit } from "@/components/CreatorCredit";
import { PrologueScene } from "@/components/PrologueScene";
import { PROLOGUE_KEY, PROLOGUE_SCENES, CLEARED_KEY, EDITOR_KEY, RETURN_OPENINGS } from "@/lib/prologue";
import { HavenScene } from "@/components/HavenScene";
import { WorkshopScene } from "@/components/WorkshopScene";
import type { InteriorId } from "@/lib/interiors";
import shackDefinition from "@/assets/sanctuary-shack-definition.png";
import { WORLD_OBJECTS, WORLD_KEY, EMPTY_WORLD, applyAction, chooseVerb, objectFor, objectPoint, type WorldChange, type WorldState } from "@/lib/world-state";
import { HUNGER_START, HUNGER_LINES, FISH_RESTORE, PROLOGUE_FLOOR, SANCTUARY_FLOOR, PROLOGUE_DRAIN_MS, SANCTUARY_DRAIN_MS, clampHunger, loadHunger, saveHunger } from "@/lib/hunger";
import waterTankImg from "@/assets/water-tank.png";
import { BoulderPot } from "@/components/BoulderPot";
import thothImg from "@/assets/thoth.png.asset.json";
import { WATER_FLOOR, WATER_DRAIN_MS, BOTTLE_MAX, DRINK_WORDS, WATER_LINES, clampWater, loadWater, saveWater } from "@/lib/water";
import { REST_START, REST_FLOOR, REST_DRAIN_MS, REST_WORDS, clampRest, loadRest, saveRest, REST_LINES } from "@/lib/sleep";
import * as B from "@/lib/banter";
import rockHatch from "@/assets/rock-hatch.png";

/** In this file "Agent" means the full Sanctuary crew, including Moxi once she joins. */
type Agent = CrewAgent;
const TASK_STAGES = ["TASK RECEIVED", "ASSIGNED", "MOVING TO SITE", "PERFORMING ACTION", "WORLD CHANGED", "PASSING ON", "COMPLETE"];
type Status = "Idle" | "Thinking" | "Working" | "Waiting";
type Stop = "home" | "central";
type Step = { agent: Agent; activity: string; result: string; verdict: "pass" | "conflict" | "n/a"; change?: WorldChange };
type Mission = { id: number; text: string; agent: Agent; reason: string; route: Agent[]; zone: ZoneId; group: boolean; steps: Step[]; done: number; error?: string; state: "Routing" | "Handoff" | "In progress" | "Complete"; time: string };
type Log = { id: number; agent: Agent; text: string; time: string };
const agents: { name: Agent; role: string; place: string; image: string; icon: typeof Sparkles }[] = [
  { name: "Oz", role: "Coordinator / creative lead", place: "Riverside shack", image: ozCrewIcon.url, icon: Sparkles },
  { name: "Brix", role: "Builder / technical", place: "Workshop / garage", image: brixPortrait.url, icon: Wrench },
  { name: "Lowkey", role: "Lore / research", place: "The wilds", image: lowkeyPortrait.url, icon: Crosshair },
];
/** Moxi joins the roster only after the crew earn her trust. */
const MOXI_AGENT = { name: "Moxi" as Agent, role: "Helper / fetcher", place: "The evergreen", image: moxiCard.url, icon: Activity };
const startLogs: Log[] = [
  { id: 1, agent: "Oz", text: "Command link established.", time: "SYSTEM" },
  { id: 2, agent: "Brix", text: "Systems rebooting.", time: "SYSTEM" },
  { id: 3, agent: "Lowkey", text: "Perimeter is clear.", time: "SYSTEM" },
];
/** Crossroads fire pit, just below where the trails meet (artwork %). */
const FIRE_PIT = { x: 42, y: 45 };
/** Brix's water tank on the grass outside his workshop. */
const WATER_TANK = { x: 84, y: 60 };
/** Brix's home → workshop frontage trail → beside the tank; never across the salvage yard. */
const BRIX_TO_TANK: Point[] = [{ x: 67.5, y: 54.6 }, { x: 71, y: 52.8 }, { x: 73.5, y: 53.5 }, { x: 80, y: 57 }, { x: 82, y: 60.8 }];
/** Tank → back up the frontage → west river trail around the scrap pile → riverbank by the falls. */
const RIVER_FILL: Point[] = [{ x: 80, y: 57 }, { x: 73.5, y: 53.5 }, { x: 71, y: 52.8 }, { x: 68, y: 57 }, { x: 63, y: 64 }, { x: 58, y: 73.5 }];
const TANK_KEY = "zygoria-tank-v1";
const TANK_LOW = 25;
/** Bedtime: each crew member's own door, the pace they wake on, and where their Zzz rise from (artwork %). */
const BED: Record<Agent, { door: Point; out: Point; zzz: Point }> = {
  Oz: { door: { x: 18, y: 56.5 }, out: { x: 19.5, y: 58.5 }, zzz: { x: 13, y: 41 } },
  Brix: { door: { x: 74.5, y: 47 }, out: { x: 73, y: 49.5 }, zzz: { x: 76.5, y: 34.5 } },
  Lowkey: { door: { x: 48.5, y: 36.5 }, out: { x: 49, y: 38.4 }, zzz: { x: 48.5, y: 29.5 } },
  Moxi: { door: { x: 46, y: 49 }, out: { x: 46, y: 49.5 }, zzz: { x: 46, y: 42.5 } },
};
/** How long the night lasts before morning arrives (skippable). */
const NAP_MS = 16000;
/** Count of legitimate long waits (night's sleep, crew AI replies) so the stuck-phase safety net leaves them alone. */
let longWaits = 0;
async function holdBusy<T>(p: Promise<T>): Promise<T> {
  longWaits++;
  try { return await p; } finally { longWaits--; }
}
const WALK_SPEED = 5.5; // percent of world width per second
const depthFor = (y: number) => (1 - Math.min(Math.max((64 - y) / 22, 0), 1) * 0.12).toFixed(3);
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / ZONES.sanctuary.aspect);
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Where each sprite's hand sits relative to its feet, in px (facing right). */
const HAND: Record<Agent, { x: number; y: number }> = { Oz: { x: 8, y: -14 }, Lowkey: { x: 9, y: -16 }, Brix: { x: 12, y: -19 }, Moxi: { x: 7, y: -8 } };

/** Short in-character exchanges for idle visits: [visitor line, host reply]. */
const IDLE_CHATS: Record<string, [string, string][]> = {
  "Oz>Brix": [["Got any spare wire? Asking for a speaker. Totally not the one I blew.", "That's the third one, Oz."], ["What's this do?", "Don't touch that."], ["Reckon I could fly with this?", "No. Put it down."]],
  "Brix>Oz": [["Your bass rattled two bolts loose in my bench.", "So the music's working then."], ["Who wired this lamp? It's held on with hope.", "Hope and a bit of string, mate."], ["Just checking the shack's still standing.", "Course it is. Mostly."]],
  "Lowkey>Oz": [["The lights by the river flickered last night. Twice.", "Spooky. Love it."], ["Saw you from the ridge. You were dancing.", "...Training, that was."], ["Quiet up there tonight.", "Quiet's boring. Stay for a tune."]],
  "Lowkey>Brix": [["Something's humming under the ruins.", "Humming how? Electrical or creepy?"], ["Your workshop glows from the ridge.", "That'll be the bad wiring."], ["The moon looked different tonight.", "The moon doesn't change, Lowkey. ...Does it?"]],
  "Oz>Lowkey": [["Made it to the top! Barely. Why's it so high?", "It's a mountain."], ["What are you looking at?", "Everything."], ["Bet I can see my shack from here.", "You can. You left the lamp on."]],
  "Brix>Lowkey": [["Climbed all this way to check the view's still working.", "It is."], ["Anything out there I should worry about?", "Not yet."], ["Wind's strong. You'll want a windbreak up here.", "I like the wind."]],
  "Oz>Moxi": [["Alright, Moxi? What you got there?", "Shiny. Mine now."], ["Race you to the pier!", "…You will lose."]],
  "Brix>Moxi": [["You've been sleeping on my bench again.", "It's warm."], ["Don't eat the bolts, Moxi.", "…They were shiny."]],
  "Lowkey>Moxi": [["Quiet spot, this.", "Mm. Yours is quieter. Up top."], ["You following me, little one?", "…Maybe."]],
  "Moxi>Oz": [["Your music is loud.", "That's the point!"], ["Fish?", "Just ate, Moxi. …Fine, one."]],
  "Moxi>Brix": [["Your hammer is too loud.", "It gets the job done."], ["I watched you fix things. You break them first.", "That's… called repair."]],
  "Moxi>Lowkey": [["You see me. You always see me.", "Hard to miss a dragon."], ["The stars moved. That one should be there.", "…I'll keep an eye on it."]],
};

// ── Moxi 2.0: tap interactions ──────────────────────────
type MoxiMood = "happy" | "sleepy" | "curious" | "excited";
const MOXI_PET: [string, string][] = [
  ["Hey, little one.", "*leans in* Warm hands."],
  ["Who's a good dragon?", "…Me. Obviously."],
  ["Scritches behind the horn?", "*happy rumble*"],
  ["There she is.", "Again. Do it again."],
  ["Easy, Moxi.", "*purrs like a tiny engine*"],
];
const MOXI_ASK_NIGHT: [string, string][] = [
  ["Can't sleep?", "Stars are loud tonight."],
  ["You okay out here?", "Mm. Watching. Like Lowkey."],
  ["Cold?", "Fire went small. You are warm though."],
];
const MOXI_ASK_FED: [string, string][] = [
  ["Full belly, huh?", "Fish was good. More tomorrow?"],
  ["Happy?", "Mm. This place is… good."],
  ["What you thinking about?", "Flying. One day. Maybe."],
];
const MOXI_ASK_HUNGRY: [string, string][] = [
  ["Hungry, Moxi?", "…Little bit. Fish?"],
  ["You alright?", "Belly rumbles. Like Brix's hammer."],
  ["Want a snack?", "Yes. Please. Now."],
];
const MOXI_TALKS: Record<string, [CrewAgent, string][]> = {
  "Oz>Moxi": [
    ["Oz", "Race you to the pier!"], ["Moxi", "…You will lose."], ["Oz", "Big talk for little legs!"],
  ],
  "Brix>Moxi": [
    ["Brix", "Off the bench, Moxi."], ["Moxi", "But it's warm."], ["Brix", "…Five more minutes."],
  ],
  "Lowkey>Moxi": [
    ["Moxi", "The stars moved. That one should be there."], ["Lowkey", "…I'll keep an eye on it."],
  ],
};

function DayNight() {
  const [t, setT] = useState(0);
  useEffect(() => {
    // This sky mounts on Sanctuary arrival, not when the opening begins.
    const arrivedAt = Date.now();
    const tick = () => setT(((Date.now() - arrivedAt) % 600000) / 600000);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  // 10 min loop: 0-4 day, 4-5 dusk, 5-9 night, 9-10 dawn (continuous at wrap)
  const night = t < .4 ? 0 : t < .5 ? (t - .4) / .1 : t < .9 ? 1 : 1 - (t - .9) / .1;
  const warm = Math.max(0, 1 - Math.abs(t - .45) / .05) + Math.max(0, 1 - Math.abs(t - .95) / .05);
  return <div className="day-night" aria-hidden="true" style={{ "--night": night.toFixed(3), "--warm": Math.min(1, warm).toFixed(3) } as CSSProperties}><div className="night-sky"/><span className="moon"/></div>;
}

export const Route = createFileRoute("/")({
  loader: () => getCanonState(),
  head: () => ({ meta: [
    { title: "Zygoria Command Centre" },
    { name: "description", content: "Enter the Zygoria world and dispatch simulated missions to Oz, Brix, and Lowkey." },
    { property: "og:title", content: "Zygoria Command Centre" },
    { property: "og:description", content: "A living mission control world for Oz, Brix, and Lowkey." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: CommandCentre,
});

function CommandCentre() {
  const canon = Route.useLoaderData();
  const [draft, setDraft] = useState("");
  const [missions, setMissions] = useState<Mission[]>([]);
  const [logs, setLogs] = useState<Log[]>(startLogs);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [phase, setPhase] = useState<"idle" | "planning" | "routing" | "handoff" | "working">("idle");
  const [planningError, setPlanningError] = useState("");
  const [positions, setPositions] = useState<Record<Agent, Stop>>({ Oz: "home", Brix: "home", Lowkey: "home", Moxi: "home" });
  const [walking, setWalking] = useState<Agent[]>([]);
  /** Bedtime: off → everyone walks to their own door → asleep at home → waking at sunrise. */
  const [sleepStage, setSleepStage] = useState<"off" | "settling" | "asleep" | "waking">("off");
  const [inBed, setInBed] = useState<Record<Agent, boolean>>({ Oz: false, Brix: false, Lowkey: false, Moxi: false });
  const [curled, setCurled] = useState(false);
  const [hatchOpen, setHatchOpen] = useState(false);
  const [sleepPrompt, setSleepPrompt] = useState(false);
  const sleepRef = useRef(false);
  const petBusy = useRef(false);
  const [petMet, setPetMet] = useState(false);
  const [petHappy, setPetHappy] = useState(false);
  useEffect(() => { try { if (localStorage.getItem(PET_KEY)) setPetMet(true); } catch { /* optional */ } }, []);
  const napSkip = useRef<(() => void) | null>(null);
  const [facing, setFacing] = useState<Record<Agent, "left" | "right">>({ Oz: "right", Brix: "left", Lowkey: "left", Moxi: "left" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frames = useRef<number[]>([]);
  const runId = useRef(0);
  const [zoneId, setZoneId] = useState<ZoneId>("sanctuary");
  const zoneRef = useRef<ZoneId>("sanctuary");
  zoneRef.current = zoneId;
  const zone = ZONES[zoneId];
  const coords = useRef<Record<ZoneId, Record<Agent, Point>>>(Object.fromEntries(ZONE_LIST.map(z => [z.id, { Oz: { ...HOME(z, "Oz") }, Brix: { ...HOME(z, "Brix") }, Lowkey: { ...HOME(z, "Lowkey") }, Moxi: { ...HOME(z, "Moxi") } }])) as Record<ZoneId, Record<Agent, Point>>);
  const markerRefs = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const [current, setCurrent] = useState<Agent | null>(null);
  const [finishedId, setFinishedId] = useState<number | null>(null);
  const [taskStage, setTaskStage] = useState(0);
  const [world, setWorld] = useState<WorldState>(EMPTY_WORLD);
  const worldRef = useRef<WorldState>(EMPTY_WORLD);
  const [acting, setActing] = useState<string | null>(null);
  const [mp3Task, setMp3Task] = useState<null | "broke" | "fixed">(null);
  const [changed, setChanged] = useState<string | null>(null);
  const [prologue, setPrologue] = useState<"off" | "on" | "walk">("off");
  const [prologueStep, setPrologueStep] = useState(0);
  const [prologueCmd, setPrologueCmd] = useState<{ id: number; text: string } | null>(null);
  const [cleared, setCleared] = useState<string[]>([]);
  const clearedRef = useRef<string[]>([]);
  const [editor, setEditor] = useState(false);
  const [tvDone, setTvDone] = useState(false);
  const [tvEscaped, setTvEscaped] = useState(false);
  const [tvNight, setTvNight] = useState(false);
  useEffect(() => { try { const v = localStorage.getItem(TV_KEY); if (v === "done") setTvDone(true); if (v === TV_ESCAPED) setTvEscaped(true); } catch { /* optional */ } }, []);
  // Night falls on the TV: it now wakes the next time someone walks into Brix's workshop.
  useEffect(() => {
    if (prologue !== "off" || tvDone || tvEscaped || tvNight) return;
    const t = setTimeout(() => { setTvNight(true); log("Brix", "Did anyone else hear that? Something's buzzing in my workshop…"); }, TV_NIGHT_MS);
    return () => clearTimeout(t);
  }, [prologue, tvDone, tvEscaped, tvNight]);
  const tvEscape = () => { try { localStorage.setItem(TV_KEY, TV_ESCAPED); } catch { /* optional */ } setWorkshop(false); setTvEscaped(true); };
  const logoTaps = useRef<number[]>([]);
  useEffect(() => {
    try { const c = JSON.parse(localStorage.getItem(CLEARED_KEY) ?? "[]"); if (Array.isArray(c)) { clearedRef.current = c; setCleared(c); } } catch { /* optional */ }
    try { setEditor(localStorage.getItem(EDITOR_KEY) === "1"); } catch { /* optional */ }
  }, []);
  function markCleared(id: string) {
    if (clearedRef.current.includes(id)) return;
    const next = [...clearedRef.current, id]; clearedRef.current = next; setCleared(next);
    try { localStorage.setItem(CLEARED_KEY, JSON.stringify(next)); } catch { /* optional */ }
  }
  /** Secret creator switch: triple-tap the Z logo. */
  function tapLogo() {
    const now = Date.now();
    logoTaps.current = [...logoTaps.current.filter(t => now - t < 900), now];
    if (logoTaps.current.length < 3) return;
    logoTaps.current = [];
    setEditor(on => { const v = !on; try { localStorage.setItem(EDITOR_KEY, v ? "1" : "0"); } catch { /* optional */ } return v; });
  }
  const baseScene = PROLOGUE_SCENES[prologueStep]!;
  const scene = cleared.includes(baseScene.id) && RETURN_OPENINGS[baseScene.id] ? { ...baseScene, opening: RETURN_OPENINGS[baseScene.id]! } : baseScene;
  useEffect(() => {
    
    // Every visit opens at Three Eggs; the skip button still jumps to the Sanctuary.
    try { localStorage.removeItem("zygoria-prologue-step"); } catch { /* optional */ }
    setPrologueStep(0);
    setPrologue("on");
  }, []);
  /** Strict order: Landing → Old City → Library → Long Walk (Chapter 03) → Sanctuary. */
  function nextPrologue() {
    markCleared(PROLOGUE_SCENES[prologueStep]!.id);
    if (prologueStep + 1 < PROLOGUE_SCENES.length) {
      setPrologueStep(prologueStep + 1);
      try { localStorage.setItem("zygoria-prologue-step", String(prologueStep + 1)); } catch { /* optional */ }
    }
    else setBuilding(true);
  }
  const [building, setBuilding] = useState(false);
  const [scenesOpen, setScenesOpen] = useState(false);
  const [haven, setHaven] = useState(false);
  const [workshop, setWorkshop] = useState<false | InteriorId>(false);
  /** Editing shortcut: jump straight to any scene (0-3 prologue, 4 Sanctuary). */
  function jumpScene(i: number) {
    setScenesOpen(false);
    setBuilding(false);
    setHaven(i === PROLOGUE_SCENES.length + 1);
    setWorkshop(i === PROLOGUE_SCENES.length + 2 ? "brix" : false);
    if (i === PROLOGUE_SCENES.length + 2) { setZoneId("sanctuary"); setPrologue("off"); return; }
    if (i === PROLOGUE_SCENES.length + 1) { setPrologue("off"); return; }
    if (i < PROLOGUE_SCENES.length) { setPrologueStep(i); setPrologue("on"); }
    else { setZoneId("sanctuary"); setPrologue("off"); }
  }
  const finishBuild = useCallback(() => { setBuilding(false); endPrologue(); }, []);
  function endPrologue() {
    markCleared("sanctuary");
    try { localStorage.setItem(PROLOGUE_KEY, "done"); } catch { /* optional */ }
    setPrologue("off");
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(WORLD_KEY) ?? "null");
      if (saved && typeof saved.levels === "object" && Array.isArray(saved.discoveries)) { worldRef.current = saved; setWorld(saved); }
    } catch { /* world still works without storage */ }
  }, []);
  const [radioKick, setRadioKick] = useState(0);
  useEffect(() => { if (!changed) return; const t = setTimeout(() => setChanged(null), 4000); return () => clearTimeout(t); }, [changed]);
  function commitWorld(next: WorldState) {
    worldRef.current = next;
    setWorld(next);
    try { localStorage.setItem(WORLD_KEY, JSON.stringify(next)); } catch { /* optional */ }
  }
  const active = missions[0];
  const assigned = active && active.state !== "Complete" ? current : null;
  // Only the task owner is active: walking = Working (travelling), stationary = Thinking pose; everyone else is Idle.
  const statusFor = (a: Agent): Status => phase === "planning" && a === "Oz" ? "Thinking" : current === a && phase !== "idle" ? walking.includes(a) ? "Working" : "Thinking" : "Idle";
  const statuses: Record<Agent, Status> = { Oz: statusFor("Oz"), Brix: statusFor("Brix"), Lowkey: statusFor("Lowkey"), Moxi: statusFor("Moxi") };
  useEffect(() => () => { runId.current++; timers.current.forEach(clearTimeout); frames.current.forEach(cancelAnimationFrame); }, []);
  const markerStyle = (agent: Agent) => ({ left: `${coords.current[zoneId][agent].x}%`, top: `${coords.current[zoneId][agent].y}%`, "--depth": depthFor(coords.current[zoneId][agent].y), zIndex: 10 + Math.round(coords.current[zoneId][agent].y * 10), "--z": 10 + Math.round(coords.current[zoneId][agent].y * 10) }) as CSSProperties;
  const edgeCls = (agent: Agent) => `${coords.current[zoneId][agent].y < (typeof window !== "undefined" && window.innerWidth <= 600 ? 55 : 34) ? "near-top" : ""} ${coords.current[zoneId][agent].x > 62 ? "near-right" : ""} ${coords.current[zoneId][agent].x < 38 ? "near-left" : ""}`;
  function paint(agent: Agent) {
    const el = markerRefs.current[agent];
    if (!el) return;
    const p = coords.current[zoneRef.current][agent];
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;
    el.classList.toggle("near-top", p.y < (typeof window !== "undefined" && window.innerWidth <= 600 ? 55 : 34)); el.classList.toggle("near-right", p.x > 62); el.classList.toggle("near-left", p.x < 38);
    el.style.setProperty("--depth", depthFor(p.y));
    // Whoever stands lower on the ground draws in front, so nobody vanishes behind another Zig.
    el.style.setProperty("--z", String(10 + Math.round(p.y * 10)));
    if (agent === "Lowkey" && zoneRef.current === "sanctuary") el.classList.toggle("on-ridge", p.y < 34);
  }
  const wait = (ms: number) => new Promise<void>(resolve => { timers.current.push(setTimeout(resolve, ms)); });
  const walkTokens = useRef<Partial<Record<Agent, number>>>({});
  const routeTime = (agent: Agent, targets: Point[]) => {
    let from = coords.current[zoneRef.current][agent], total = 0;
    for (const to of targets) { total += distance(from, to); from = to; }
    return total / WALK_SPEED;
  };
  /** Moves a character along walkable path nodes frame by frame; the walk cycle loops only while this runs. */
  function walk(agent: Agent, targets: Point[], end: Stop, run: number) {
    return new Promise<void>(resolve => {
      const face = (target: Point) => {
        const origin = coords.current[zoneRef.current][agent];
        const dx = target.x - origin.x;
        const dy = target.y - origin.y;
        if ((agent === "Oz" || agent === "Brix" || agent === "Lowkey") && (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3)) {
          const direction = Math.abs(dy) > Math.abs(dx) * 0.7 ? (dy < 0 ? "up" : "down") : (dx < 0 ? "left" : "right");
          if (agent === "Oz") setOzDirection(previous => previous === direction ? previous : direction);
          else if (agent === "Brix") setBrixDirection(previous => previous === direction ? previous : direction);
          else setLowkeyDirection(previous => previous === direction ? previous : direction);
        }
        if (Math.abs(dx) < 0.3) return;
        const dir = dx < 0 ? "left" as const : "right" as const;
        setFacing(prev => prev[agent] === dir ? prev : { ...prev, [agent]: dir });
      };
      // Each new walk for this agent supersedes any older one, so two loops never fight over the same sprite.
      const token = (walkTokens.current[agent] = (walkTokens.current[agent] ?? 0) + 1);
      const mine = () => walkTokens.current[agent] === token;
      const finish = () => {
        if (mine()) setWalking(prev => prev.filter(a => a !== agent));
        setPositions(prev => ({ ...prev, [agent]: end }));
        resolve();
      };
      if (!targets.length) { finish(); return; }
      face(targets[0]!);
      setWalking(prev => prev.includes(agent) ? prev : [...prev, agent]);
      let segment = 0;
      let last = performance.now();
      const step = (time: number) => {
        // Cancelled or superseded: stop the leg cycle so nobody is left walking on the spot.
        if (run !== runId.current || !mine()) { if (mine()) setWalking(prev => prev.filter(a => a !== agent)); resolve(); return; }
        void time;
        // Older iPads can hand rAF a timestamp on a different clock; always use performance.now().
        const nowT = performance.now();
        let budget = Math.max(0, Math.min(nowT - last, 64)) / 1000 * WALK_SPEED;
        last = nowT;
        while (budget > 0 && segment < targets.length) {
          const p = coords.current[zoneRef.current][agent], t = targets[segment]!, d = distance(p, t);
          if (d <= budget) {
            coords.current[zoneRef.current][agent] = { ...t };
            budget -= d;
            segment++;
            if (segment < targets.length) face(targets[segment]!);
          } else {
            const k = budget / d;
            coords.current[zoneRef.current][agent] = { x: p.x + (t.x - p.x) * k, y: p.y + (t.y - p.y) * k };
            budget = 0;
          }
        }
        paint(agent);
        if (segment >= targets.length) finish();
        else frames.current.push(requestAnimationFrame(step));
      };
      frames.current.push(requestAnimationFrame(step));
    });
  }
  const setMission = (id: number, patch: (m: Mission) => Partial<Mission>) => setMissions(prev => prev.map(m => m.id === id ? { ...m, ...patch(m) } : m));
  type Spot = "home" | "central" | "work";
  const spots = useRef<Record<ZoneId, Record<Agent, Spot>>>(Object.fromEntries(ZONE_LIST.map(z => [z.id, { Oz: "home", Brix: "home", Lowkey: "home", Moxi: "home" }])) as Record<ZoneId, Record<Agent, Spot>>);
  function pathBetween(agent: Agent, from: Spot, to: Spot): Point[] {
    const z = ZONES[zoneRef.current];
    const work = z.work[agent];
    const f = from === "work" && !work ? "home" : from, t = to === "work" && !work ? "home" : to;
    if (f === t) return [];
    const back = work ? [...work.slice(0, -1).reverse(), HOME(z, agent)] : [];
    if (f === "home" && t === "central") return toMeet(z, agent);
    if (f === "central" && t === "home") return toHome(z, agent);
    if (f === "home" && t === "work") return work!;
    if (f === "work" && t === "home") return back;
    if (f === "central" && t === "work") return [...toHome(z, agent), ...work!];
    return [...back, ...toMeet(z, agent)];
  }
  /** Walks a character between spots in the active zone on its own path nodes. */
  async function goTo(agent: Agent, to: Spot, run: number) {
    const zs = spots.current[zoneRef.current];
    const path = pathBetween(agent, zs[agent], to);
    zs[agent] = to;
    if (path.length) await walk(agent, path, to === "central" ? "central" : "home", run);
  }
  const taskIconRef = useRef<HTMLDivElement | null>(null);
  const facingRef = useRef(facing);
  facingRef.current = facing;
  const [ozDirection, setOzDirection] = useState<"down" | "left" | "right" | "up">("down");
  const [brixDirection, setBrixDirection] = useState<"down" | "left" | "right" | "up">("down");
  const [lowkeyDirection, setLowkeyDirection] = useState<"down" | "left" | "right" | "up">("down");
  /** Pixel offset from an agent's feet to the hand they carry the task in (follows facing). */
  const handOffset = (a: Agent) => {
    const h = HAND[a], dir = facingRef.current[a] === "right" ? 1 : -1;
    return { x: h.x * dir, y: h.y };
  };
  /** Sends the glowing task icon from one owner to the next along the receiver's walkable path nodes. */
  function sendTask(from: Agent, to: Agent, run: number) {
    return new Promise<void>(resolve => {
      const el = taskIconRef.current;
      const zc = coords.current[zoneRef.current], zs = spots.current[zoneRef.current];
      const start = { ...zc[from] }, end = { ...zc[to] };
      const pts: Point[] = [start];
      if (zs[from] === "central") pts.push(...pathBetween(to, "central", zs[to]));
      else pts.push(...pathBetween(from, zs[from], "central"), ...pathBetween(to, "central", zs[to]));
      pts.push(end);
      let total = 0;
      for (let i = 1; i < pts.length; i++) total += distance(pts[i - 1]!, pts[i]!);
      const duration = Math.max(1100, total / 16 * 1000);
      if (!el) { resolve(); return; }
      el.classList.add("is-travelling");
      const t0 = performance.now();
      const step = (time: number) => {
        if (run !== runId.current) { el.classList.remove("is-travelling", "is-held"); return; }
        const k = Math.min((time - t0) / duration, 1);
        let target = k * total, p = pts[0]!;
        for (let i = 1; i < pts.length; i++) {
          const a = pts[i - 1]!, b = pts[i]!, d = distance(a, b);
          if (target <= d || i === pts.length - 1) { const f = d ? Math.min(target / d, 1) : 1; p = { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f }; break; }
          target -= d;
        }
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        const ha = handOffset(from), hb = handOffset(to), lift = Math.sin(Math.PI * k) * -6;
        el.style.transform = `translate(calc(${ha.x + (hb.x - ha.x) * k}px * var(--desktop-sprite-scale, 1)), calc(${ha.y + (hb.y - ha.y) * k}px * var(--desktop-sprite-scale, 1) + ${lift}px))`;
        if (k < 1) frames.current.push(requestAnimationFrame(step));
        else { el.classList.remove("is-travelling"); el.classList.add("is-held"); resolve(); }
      };
      frames.current.push(requestAnimationFrame(step));
    });
  }
  /** While an agent owns the task, keep the glowing icon hovering over them wherever they stand or walk. */
  useEffect(() => {
    const el = taskIconRef.current;
    if (!el) return;
    if (!current) { el.classList.remove("is-held", "is-travelling"); return; }
    el.classList.add("is-held");
    let raf = 0;
    const track = () => {
      if (!el.classList.contains("is-travelling")) {
        const p = coords.current[zoneRef.current][current];
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        const o = handOffset(current);
        el.style.transform = `translate(calc(${o.x}px * var(--desktop-sprite-scale, 1)), calc(${o.y}px * var(--desktop-sprite-scale, 1)))`;
      }
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [current]);
  /** One real handoff: the previous owner stops, the new owner walks to collect and works while its AI call processes all earlier outputs. */
  async function runStep(id: number, directive: string, agent: Agent, previous: Step[], finalReview: boolean, solo: boolean, group: boolean, run: number): Promise<Step | null> {
    const call = runCrewStep({ data: { directive, agent, previous: previous.map(p => ({ agent: p.agent, result: p.result })), finalReview, group, story: (() => { let n = ""; try { n = localStorage.getItem("zygoria-voice-name") || ""; } catch { /* private mode */ } return [n ? `The voice from the sky is called ${n}; occasionally call them by name.` : "", storyNote.current].filter(Boolean).join(" "); })() } });
    call.catch(() => undefined);
    const meetName = ZONES[zoneRef.current].meetName;
    const zoneName = ZONES[zoneRef.current].short.toLowerCase();
    const from: Agent | null = previous.at(-1)?.agent ?? null;
    if (!from) {
      setMission(id, () => ({ state: "Routing", agent: "Oz" }));
      setPhase("routing");
      setCurrent("Oz");
      setTaskStage(1);
      setSelected("Oz");
      if (zoneRef.current !== "sanctuary") {
        log("Oz", `Receiving the directive — heading out to the ${zoneName}.`);
      } else if (solo && agent === "Oz") {
        log("Oz", "Receiving the directive — keeping this one at the shack.");
      } else {
        log("Oz", "Receiving the directive at the crossroads.");
        await goTo("Oz", "central", run);
        if (run !== runId.current) return null;
      }
    }
    const prev = from ?? "Oz";
    if (prev !== agent) {
      if (spots.current[zoneRef.current][prev] !== "central") {
        log(prev, `Bringing the output to the ${meetName} for ${agent}.`);
        await goTo(prev, "central", run);
        if (run !== runId.current) return null;
      }
      log(prev, `Handing off to ${agent} — task energy in transit.`);
      setMission(id, () => ({ state: "Handoff", agent: prev }));
      setPhase("handoff");
      setTaskStage(5);
      await sendTask(prev, agent, run);
      if (run !== runId.current) return null;
      log(agent, "Task received.");
      setTaskStage(1);
      setCurrent(agent);
      setSelected(agent);
      setMission(id, () => ({ state: "In progress", agent }));
      setPhase("working");
      if (agent !== "Oz") {
        log(agent, `Walking to the ${meetName} to collect the handoff.`);
        await goTo(agent, "central", run);
        if (run !== runId.current) return null;
        setFacing(p => ({ ...p, [prev]: "right", [agent]: "left" }));
        await wait(700);
        if (run !== runId.current) return null;
      }
    } else {
      setMission(id, () => ({ state: "In progress", agent }));
      setPhase("working");
    }
    const staysPut = false;
    const target = objectFor(zoneRef.current, agent);
    setTaskStage(staysPut ? 3 : 2);
    log(agent, staysPut ? `Working on the ${target.name.toLowerCase()} right here at the shack.` : `Heading to the ${target.name.toLowerCase()}.`);
    let output: Awaited<typeof call>;
    try {
      [output] = await holdBusy(Promise.all([call, staysPut ? Promise.resolve() : goTo(agent, "work", run)]));
    } catch (error) {
      if (run !== runId.current) return null;
      const message = error instanceof Error ? error.message : "The crew could not finish this step.";
      setMission(id, () => ({ error: message }));
      log(agent, `Step failed: ${message}`);
      return null;
    }
    if (run !== runId.current) return null;
    log(agent, output.activity);
    // Visible role action at the object, then a persistent world change.
    const verb = chooseVerb(agent, directive);
    setTaskStage(3);
    setActing(target.id);
    log(agent, `${verb[0]!.toUpperCase()}${verb.slice(1)} the ${target.name.toLowerCase()}.`);
    // Role-play the job: a muttered line or two while working, different every time.
    const mutters = B.shuffle(B.WORKING[agent]).slice(0, B.chance(0.5) ? 2 : 1);
    for (const m of mutters) { setBubble({ agent, text: m }); log(agent, m); await wait(1700); if (run !== runId.current) return null; }
    setBubble(b => b?.agent === agent ? null : b);
    setActing(null);
    if (run !== runId.current) return null;
    const { next, change } = applyAction(worldRef.current, zoneRef.current, agent, directive);
    commitWorld(next);
    setChanged(target.id);
    if (target.id === "sanc-speakers") setRadioKick(k => k + 1);
    setTaskStage(4);
    log(agent, `World changed: ${change.name} ${change.from} → ${change.to}.${change.discovery ? " New Codex record." : ""}`);
    await wait(400);
    if (run !== runId.current) return null;
    const step: Step = { agent, activity: output.activity, result: output.result, verdict: output.verdict, change };
    setMission(id, m => ({ steps: [...m.steps, step], done: m.steps.length + 1 }));
    log(agent, output.verdict === "conflict" ? "Canon conflict flagged — result posted." : "Step finished — result posted.");
    return step;
  }
  async function runMission(id: number, directive: string, route: Agent[], missionZone: ZoneId, group: boolean, run: number) {
    const done: Step[] = [];
    if (missionZone !== "sanctuary") {
      setZoneId(missionZone);
      setPositions({ Oz: "home", Brix: "home", Lowkey: "home", Moxi: "home" });
      await wait(700);
      if (run !== runId.current) return;
    }
    for (let i = 0; i < route.length; i++) {
      const agent = route[i]!;
      const step = await runStep(id, directive, agent, done, i > 0 && i === route.length - 1 && agent === "Oz", route.length === 1 && !group, group, run);
      if (run !== runId.current) return;
      if (!step) break;
      done.push(step);
      if (step.verdict === "conflict" && route[i + 1] === "Brix") {
        log("Lowkey", "Holding the brief — conflict goes back to Oz.");
        const rest = route.slice(i + 1).filter(a => a !== "Brix");
        route = [...route.slice(0, i + 1), ...(rest.length ? rest : ["Oz" as const])];
        setMission(id, () => ({ route }));
      }
    }
    const beat = pendingBeat.current;
    pendingBeat.current = null; storyNote.current = "";
    // Each Zig speaks their answer in a speech bubble, one after another, like the opening chapters.
    for (const st of done) {
      if (run !== runId.current) return;
      const line = st.result.replace(/\s+/g, " ").trim().slice(0, 220);
      if (!line) continue;
      setBubble({ agent: st.agent, text: line });
      await wait(Math.min(7000, Math.max(3200, 1800 + line.length * 45)));
      if (run !== runId.current) return;
      setBubble(null); await wait(1000);
    }
    if (beat && done.length) await playBeat(beat, run);
    if (run !== runId.current) return;
    setMission(id, () => ({ state: "Complete", done: done.length }));
    setTaskStage(6);
    setCurrent(null);
    setPhase("idle");
    setFinishedId(id);
    const changes = done.filter(s => s.change).length;
    log(done.at(-1)?.agent ?? "Oz", `Directive complete — ${changes} world change${changes === 1 ? "" : "s"} made. ${missionZone === "sanctuary" ? "Standing by." : "Heading back to the Sanctuary."}`);
    await Promise.all((["Oz", "Brix", "Lowkey", "Moxi"] as Agent[]).map(a => goTo(a, "home", run)));
    if (missionZone !== "sanctuary") setZoneId("sanctuary");
    setTimeout(() => setFinishedId(prev => prev === id ? null : prev), 2500);
    if (missionZone === "sanctuary" && run === runId.current) {
      const plan = findGroupPlan(done.map(s => ({ agent: s.agent, text: s.result })), [...new Set(route)]);
      if (plan) await groupOuting(plan, run);
    }
  }
  /** The Zigs follow through on a plan they proposed themselves: walk together on existing trails, spread out, then drift home. */
  const outing = useRef<Agent[]>([]);
  async function groupOuting(plan: NonNullable<ReturnType<typeof findGroupPlan>>, run: number) {
    const z = ZONES.sanctuary, { place } = plan;
    const ownerTail = (): Point[] => place.owner ? (place.spot === "work" ? [...toHome(z, place.owner), ...(z.work[place.owner] ?? [])] : toHome(z, place.owner)) : [];
    const order = [...plan.who].sort((a, b) => (a === place.owner ? -1 : b === place.owner ? 1 : 0));
    const routes = order.map((a, i) => {
      let path: Point[];
      if (a === place.owner) path = place.spot === "work" ? [...(z.work[a] ?? [])] : [];
      else path = [...toMeet(z, a), ...ownerTail()];
      const end = path.at(-1) ?? HOME(z, a);
      const off = GROUP_OFFSETS[place.owner ? i : i + 1] ?? GROUP_OFFSETS[0]!;
      if (off.x || off.y) path.push({ x: end.x + off.x, y: end.y + off.y });
      return { a, path };
    });
    outing.current = order;
    log(plan.proposer, `Following through — heading to ${place.name}${order.length > 1 ? " together" : ""}.`);
    const pickup = place.owner === "Lowkey" && order.includes("Oz") && order.includes("Brix");
    if (pickup) {
      // Oz collects Brix from his yard first, then the pair climb the ridge together.
      const brixHome = HOME(z, "Brix");
      // Oz waits just below the yard's exit line, so Brix can step onto the trail without walking through him.
      await walk("Oz", [...toMeet(z, "Oz"), ...toHome(z, "Brix").slice(0, -1), { x: brixHome.x - 2.5, y: brixHome.y + 3 }], "central", run);
      if (run !== runId.current) return;
      setFacing(p => ({ ...p, Oz: "right", Brix: "left" }));
      setBubble({ agent: "Brix", text: "Right behind you." });
      await wait(900);
      if (run !== runId.current) return;
      setBubble(null);
      const oz = routes.find(r => r.a === "Oz")!, brix = routes.find(r => r.a === "Brix")!;
      const ozEnd = oz.path.at(-1)!;
      // Oz falls in ~1.8s behind Brix on the same trail: enough room at desktop sprite size that they never overlap.
      await Promise.all([
        walk("Brix", brix.path, "central", run),
        wait(2600).then(() => run === runId.current ? walk("Oz", [...brix.path.slice(0, -1), ozEnd], "central", run) : undefined),
      ]);
    } else {
      await Promise.all(routes.map(r => r.path.length ? walk(r.a, r.path, "central", run) : Promise.resolve()));
    }
    if (run !== runId.current) return;
    // Look outward as a small group, then return to their own routines.
    const cx = routes.reduce((t, r) => t + coords.current.sanctuary[r.a].x, 0) / routes.length;
    setFacing(p => ({ ...p, ...Object.fromEntries(routes.map(r => [r.a, coords.current.sanctuary[r.a].x <= cx ? "left" : "right"])) }));
    await wait(3000);
    if (run !== runId.current) return;
    const back = (r: (typeof routes)[number]) => [...r.path.slice(0, -1).reverse(), HOME(z, r.a)];
    if (pickup) {
      // Brix gets well down the first switchback before Oz leaves the summit, so nobody walks through anybody.
      await Promise.all([
        walk("Brix", back(routes.find(r => r.a === "Brix")!), "home", run),
        wait(2600).then(() => run === runId.current ? walk("Oz", back(routes.find(r => r.a === "Oz")!), "home", run) : undefined),
      ]);
    } else {
      await Promise.all(routes.map(r => r.path.length ? walk(r.a, back(r), "home", run) : Promise.resolve()));
    }
    if (run !== runId.current) return;
    outing.current = [];
  }
  /** Cookout: the crew meet at the crossroads fire pit; Brix lays kindling, Lowkey lights it, Oz grills tiny fish, everyone eats. */
  const [fire, setFire] = useState<"out" | "spark" | "lit" | "grilling" | "embers">("out");
  const [fishSize, setFishSize] = useState<"small" | "medium" | "large">("small");
  useEffect(() => { Atmos.armAtmosphere(); }, []);
  useEffect(() => {
    const zoneEnv: Record<ZoneId, Atmos.AtmosEnv> = { sanctuary: "sanctuary", ruins: "city", caves: "caves", cronk: "walk", shelton: "walk" };
    const sceneEnv: Record<string, Atmos.AtmosEnv> = { landing: "landing", city: "city", library: "library", "long-walk": "walk" };
    Atmos.setAtmosEnv(prologue === "on" ? (building ? "walk" : sceneEnv[scene.id] ?? "walk") : prologue === "walk" ? "walk" : zoneEnv[zoneId]);
  }, [prologue, building, scene.id, zoneId]);
  useEffect(() => { Atmos.setAtmosFire(fire === "lit" || fire === "grilling" || fire === "embers"); }, [fire]);
  async function cookout(run: number) {
    const z = ZONES.sanctuary;
    const moxiIn = storyRef.current.beats.includes("trust");
    const all: Agent[] = moxiIn ? ["Oz", "Brix", "Lowkey", "Moxi"] : ["Oz", "Brix", "Lowkey"];
    const seat: Record<Agent, Point> = { Oz: { x: FIRE_PIT.x - 9, y: FIRE_PIT.y + 1.5 }, Brix: { x: FIRE_PIT.x + 9, y: FIRE_PIT.y + 1 }, Lowkey: { x: FIRE_PIT.x, y: FIRE_PIT.y - 4.5 }, Moxi: { x: FIRE_PIT.x + 4, y: FIRE_PIT.y + 4 } };
    // Direct routes: Lowkey comes down the brown hill trail and swings behind the pit; Brix crosses straight from his workshop.
    // (No detour down to the crossroads and back; reversed on the way home.)
    const lk = z.paths.Lowkey;
    const direct: Partial<Record<Agent, Point[]>> = {
      Lowkey: [...lk.slice(1, lk.findIndex(p => p.x === 53 && p.y === 46) + 1), { x: FIRE_PIT.x + 4, y: FIRE_PIT.y - 3.5 }, seat.Lowkey],
      Brix: [{ x: 59, y: 53 }, { x: 55, y: 49 }, seat.Brix],
    };
    const paths = Object.fromEntries(all.map(a => [a, direct[a] ?? [...toMeet(z, a), seat[a]]])) as Record<Agent, Point[]>;
    outing.current = all;
    const say = async (agent: Agent, text: string, ms = 1800) => { setBubble({ agent, text }); log(agent, text); await wait(Math.min(6000, Math.max(ms, 3200, 1800 + text.length * 45))); setBubble(null); await wait(1000); return run === runId.current; };
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
    const r = Math.random();
    const size: "small" | "medium" | "large" = r < 0.5 ? "small" : r < 0.85 ? "medium" : "large";
    setFishSize(size);
    log("Oz", B.pick(B.COOK_OPEN));
    // Oz detours to the end of the pier for the catch, then joins the others at the pit.
    const home = HOME(z, "Oz"), pier: Point[] = [{ x: 29.5, y: 67.5 }, { x: 33, y: 73.5 }];
    const ozRun = (async () => {
      await walk("Oz", pier, "central", run);
      if (run !== runId.current) return;
      if (B.chance(0.35)) { setBubble({ agent: "Oz", text: "Nothing… nothing… wait." }); await wait(1400); if (run !== runId.current) return; }
      const c = B.pick(B.CATCH_CALL); setBubble({ agent: "Oz", text: c }); log("Oz", c);
      await wait(1100);
      if (run !== runId.current) return;
      await walk("Oz", [pier[0]!, home, ...paths.Oz], "central", run);
    })();
    await Promise.all([ozRun, walk("Brix", paths.Brix, "central", run), walk("Lowkey", paths.Lowkey, "central", run)]);
    if (run !== runId.current) return;
    setFacing(p => ({ ...p, Oz: "right", Brix: "left" }));
    if (!await say("Brix", B.pick(B.KINDLING))) return;
    setFire("spark");
    if (!await say("Lowkey", B.pick(B.SPARK), 700)) return;
    setFire("lit");
    if (B.chance(0.6) && !await say("Lowkey", B.pick(B.LIT), 1400)) return;
    setFire("grilling");
    if (!await say("Oz", B.pick(B.CATCH_LINE[size]), 2600)) return;
    for (const [who, text] of B.riff(B.GRILL, all, { max: 3 })) if (!await say(who, text, 1800)) return;
    setFire("embers");
    setHunger(h => { const n = clampHunger(100, SANCTUARY_FLOOR); void FISH_RESTORE[size]; void h; saveHunger(n); return n; });
    // Short post-meal chat before everyone drifts home.
    const afters: [Agent, string][][] = [...B.AFTERS];
    if (moxiIn) afters.push(...B.MOXI_AFTERS);
    if (size === "large") afters.push([["Brix", "Big one, Oz. Well landed."], ["Oz", "Told you. Fishing legend."], ["Lowkey", "I'm full."]]);
    for (const [who, text] of pick(afters)) if (!await say(who, text, 2200)) return;
    setBubble(null);
    await wait(800);
    if (run !== runId.current) return;
    await Promise.all(all.map(a => walk(a, [...paths[a].slice(0, -1).reverse(), HOME(z, a)], "home", run)));
    if (run !== runId.current) return;
    outing.current = [];
    timers.current.push(setTimeout(() => setFire(f => f === "embers" ? "out" : f), 8000));
  }
  /** Story layer: beats advance through conversation and play out as in-world exchanges. */
  const [story, setStory] = useState<StoryState>(EMPTY_STORY);
  const storyRef = useRef<StoryState>(EMPTY_STORY);
  const pendingBeat = useRef<StoryBeat | null>(null);
  const storyNote = useRef("");
  const [scannerEvent, setScannerEvent] = useState(false);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(STORY_KEY) ?? "null"); if (saved && Array.isArray(saved.beats)) { storyRef.current = saved; setStory(saved); } } catch { /* optional */ }
  }, []);
  function commitStory(next: StoryState) {
    storyRef.current = next; setStory(next);
    try { localStorage.setItem(STORY_KEY, JSON.stringify(next)); } catch { /* optional */ }
  }
  async function playBeat(beat: StoryBeat, run: number) {
    if (beat.id === "trust") {
      // Moxi steps out first so she can take part in the conversation.
      commitStory({ beats: [...storyRef.current.beats, beat.id] });
      // She walks right up to Oz before saying a word — the sneeze lands in his face, not from across the camp.
      const spot = beside("Oz");
      outing.current = ["Moxi"];
      await walk("Moxi", [...routeNodes(coords.current.sanctuary.Moxi, spot), spot], "central", run);
      if (run !== runId.current) return;
      const ox = coords.current.sanctuary.Oz.x, mx = coords.current.sanctuary.Moxi.x;
      setFacing(p => ({ ...p, Moxi: ox < mx ? "left" : "right", Oz: ox < mx ? "right" : "left" }));
      for (const [who, text] of MOXI_SCENE) {
        setBubble({ agent: who, text }); log(who, text);
        await wait(Math.min(5000, Math.max(3000, 1600 + text.length * 40))); if (run !== runId.current) return;
      }
      setBubble(null);
      // …then she potters back to her evergreen.
      const home = HOME(ZONES.sanctuary, "Moxi");
      await walk("Moxi", [...routeNodes(coords.current.sanctuary.Moxi, home), home], "home", run);
      spots.current.sanctuary.Moxi = "home";
      outing.current = [];
      return;
    }
    for (const [who, text] of beat.lines) {
      setBubble({ agent: who, text }); log(who, text);
      await wait(3000); if (run !== runId.current) return;
    }
    setBubble(null);
    commitStory({ beats: [...storyRef.current.beats, beat.id] });
    if (beat.id === "fixed") {
      setScannerEvent(true); setActing("sanc-workbench");
      log("Brix", "Workshop lights flicker — the scanner pulses awake.");
      await wait(2600);
      setActing(null); setScannerEvent(false);
      log("Lowkey", "Signal location identified. East of the river.");
      log("Oz", "New route discovered — Survivor Caves. Something is still active beyond the Sanctuary.");
    }
  }
  /** Chapter 5: Oz brings his scavenged MP3 player to Brix, who repairs it; Oz sparks the battery and music plays. */
  async function mp3Scene() {
    const run = ++runId.current;
    setPhase("working");
    commitStory({ beats: [...storyRef.current.beats, "mp3-start"] });
    const say = async (a: Agent, t: string) => { setBubble({ agent: a, text: t }); log(a, t); await wait(Math.min(6000, Math.max(3200, 1800 + t.length * 45))); setBubble(null); await wait(900); return run === runId.current; };
    if (!await say("Oz", "Hang on. Found this in the city rubble. Been carrying it the whole way.")) return;
    const spot = beside("Brix");
    outing.current = ["Oz"];
    await walk("Oz", [...routeNodes(coords.current.sanctuary.Oz, spot), spot], "central", run);
    if (run !== runId.current) return;
    const bx = coords.current.sanctuary.Brix.x, ox = coords.current.sanctuary.Oz.x;
    setFacing(p => ({ ...p, Oz: bx < ox ? "left" : "right", Brix: bx < ox ? "right" : "left" }));
    if (!await say("Oz", "Brix! Think you can wake it up?")) return;
    if (!await say("Brix", "Cracked case. Corroded board. Give it here.")) return;
    setActing("sanc-workbench");
    setMp3Task("broke");
    log("Brix", "Tinkering at the workbench…");
    await wait(2600); if (run !== runId.current) return;
    if (!await say("Brix", "Board's fixed. Battery's stone dead though.")) return;
    setActing(null);
    if (!await say("Oz", "Leave the battery to me. Just a tiny jolt…")) return;
    setScannerEvent(true); await wait(1200); setScannerEvent(false);
    setRadioKick(k => k + 1);
    setMp3Task("fixed");
    if (!await say("Oz", "It works! Actual music!")) return;
    if (!await say("Oz", "Whoa. I feel… more alive. More jolted. Locked in.")) return;
    if (!await say("Oz", "That power feels GOOD.")) return;
    if (!await say("Brix", "Told you. Good as new.")) return;
    if (!await say("Lowkey", "…Better than silence.")) return;
    setMp3Task(null);
    commitStory({ beats: [...storyRef.current.beats, "mp3"] });
    const home = HOME(ZONES.sanctuary, "Oz");
    await walk("Oz", [...routeNodes(coords.current.sanctuary.Oz, home), home], "home", run);
    spots.current.sanctuary.Oz = "home";
    outing.current = [];
    if (run !== runId.current) return;
    await wait(2500);
    // The music draws something out of the trees — straight into Moxi's discovery.
    if (run === runId.current && !storyRef.current.beats.includes("spotted")) await playBeat(SANCTUARY_SIGNAL.beats[0]!, run);
    if (run === runId.current) setPhase("idle");
  }
  // Brix introduces his pet, Boulder Pot, one minute into the Sanctuary (once per device).
  async function petIntro() {
    petBusy.current = true;
    if (visiting.current || choring.current || outing.current.length) cancelVisit();
    const lines: [Agent, string][] = [["Oz", "What's that, Brix?"], ["Brix", "It's my pet."], ["Oz", "What's it called?"], ["Brix", "I call him Boulder Pot."]];
    for (const [a, text] of lines) { setBubble({ agent: a, text }); log(a, text); await wait(Math.max(2800, 1800 + text.length * 45)); setBubble(null); await wait(700); }
    setPetHappy(true); setTimeout(() => setPetHappy(false), 2400);
    try { localStorage.setItem(PET_KEY, "1"); } catch { /* optional */ }
    setPetMet(true); petBusy.current = false;
  }
  /** Thoth: The Forgotten Humans — once, after Moxi joins. Thoth only appears and speaks on Lowkey's hill. */
  const [thoth, setThoth] = useState<{ line: string | null } | null>(null);
  async function thothScene() {
    const run = ++runId.current;
    setPhase("working");
    if (visiting.current || choring.current || outing.current.length) cancelVisit();
    const z = ZONES.sanctuary;
    const hill = HOME(z, "Lowkey");
    outing.current = ["Lowkey"];
    await walk("Lowkey", [...routeNodes(coords.current.sanctuary.Lowkey, hill), hill], "home", run);
    if (run !== runId.current) return;
    setFacing(p => ({ ...p, Lowkey: "right" }));
    await wait(600);
    setThoth({ line: null }); log("Lowkey", "Someone is standing beside him on the hill.");
    await wait(900);
    const scene1: ["Thoth" | Agent, string][] = [
      ["Thoth", "Beneath these mountains, there are those who have forgotten the warmth of the sun."],
      ["Lowkey", "People?"],
      ["Thoth", "The last children of a world that once belonged to them."],
      ["Lowkey", "Why don't they come out?"],
      ["Thoth", "Fear has kept them beneath the earth for generations."],
      ["Lowkey", "Can we help them?"],
      ["Thoth", "That is not for me to decide."],
      ["Thoth", "But know this, little one. They must not be forgotten. They need help."],
    ];
    for (const [who, text] of scene1) {
      const ms = Math.min(6500, Math.max(3200, 1800 + text.length * 50));
      if (who === "Thoth") { setThoth({ line: text }); log("Lowkey", `Thoth: ${text}`); await wait(ms); setThoth({ line: null }); }
      else { setBubble({ agent: who, text }); log(who, text); await wait(ms); setBubble(null); }
      await wait(800); if (run !== runId.current) { setThoth(null); return; }
    }
    setThoth(null);
    await wait(2200); if (run !== runId.current) return;
    const spot = beside("Oz");
    await walk("Lowkey", [...routeNodes(coords.current.sanctuary.Lowkey, spot), spot], "central", run);
    if (run !== runId.current) return;
    const scene2: [Agent, string][] = [
      ["Lowkey", "I think there are people living beneath the mountains."],
      ["Oz", "People? Actual people?"],
      ["Brix", "How do you know?"],
      ["Lowkey", "The bird told me."],
      ["Oz", "A bird told you?! What bloody bird?!"],
      ["Brix", "Well, there's only one way to find out."],
      ["Lowkey", "We should go and look."],
      ["Oz", "Right then. Off to find the underground people. Brilliant."],
    ];
    for (const [a, text] of scene2) { setBubble({ agent: a, text }); log(a, text); await wait(Math.min(6000, Math.max(3000, 1800 + text.length * 45))); setBubble(null); await wait(700); if (run !== runId.current) return; }
    commitStory({ beats: [...storyRef.current.beats, "thoth"] });
    await walk("Lowkey", [...routeNodes(coords.current.sanctuary.Lowkey, hill), hill], "home", run);
    spots.current.sanctuary.Lowkey = "home";
    outing.current = [];
    if (run === runId.current) setPhase("idle");
  }
  useEffect(() => {
    if (prologue !== "off" || zoneId !== "sanctuary" || !story.beats.includes("trust") || story.beats.includes("thoth")) return;
    let idle = 0;
    const id = setInterval(() => {
      if (document.hidden || sleepRef.current || petBusy.current || phaseRef.current !== "idle" || ozAway.current) { idle = 0; return; }
      idle += 5;
      if (idle >= 10) { clearInterval(id); void thothScene(); }
    }, 5000);
    return () => clearInterval(id);
  }, [prologue, zoneId, story]);
  // Real time in the Sanctuary (after the opening) counts toward the Chapter 5 MP3 scene; saved so reloads don't reset it.
  useEffect(() => {
    const b = storyRef.current.beats;
    if (prologue !== "off" || zoneId !== "sanctuary" || b.includes("spotted")) return;
    const id = setInterval(() => {
      const beats = storyRef.current.beats;
      if (document.hidden || beats.includes("spotted") || sleepRef.current) return;
      let t = 0;
      try { t = Number(localStorage.getItem(SANCTUARY_TIME_KEY) ?? 0) + 5; localStorage.setItem(SANCTUARY_TIME_KEY, String(t)); } catch { /* optional */ }
      let met = false; try { met = !!localStorage.getItem(PET_KEY); } catch { /* optional */ }
      if (petBusy.current) return;
      if (t >= PET_AFTER && !met && !beats.includes("mp3") && phaseRef.current === "idle") { void petIntro(); return; }
      if (t >= MP3_AFTER && phaseRef.current === "idle" && !ozAway.current && !petBusy.current) {
        // Story time wins over idle strolls and chores: call everyone back first.
        if (visiting.current || choring.current || outing.current.length) cancelVisit();
        clearInterval(id);
        if (beats.includes("mp3")) void playBeat(SANCTUARY_SIGNAL.beats[0]!, runId.current);
        else void mp3Scene();
      }
    }, 5000);
    return () => clearInterval(id);
  }, [prologue, zoneId, story]);
  function log(agent: Agent, text: string) {
    setLogs(prev => [{ id: Date.now() + Math.random(), agent, text, time: now() }, ...prev].slice(0, 12));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "idle") return;
    void dispatchDirective(text);
  }
  /** Shared directive pipeline — the input form and the field guide's ask buttons both use it. */
  async function dispatchDirective(text: string) {
    if (prologue === "on") { setPrologueCmd({ id: Date.now(), text }); return; }
    await ozHome();
    cancelVisit();
    setPlanningError("");
    const order = zoneRef.current === "sanctuary" ? findUserCommand(text) : null;
    const cookWords = /\b(cook\w*|grill\w*|fish\w*|bbq|barbe?cue|food|hungry|starving|dinner|supper|lunch|breakfast|meal|feed|eat\w*|campfire|fire ?pit|light (a|the) fire|start (a|the) fire)\b/i;
    const sb = storyRef.current.beats;
    // Story first: once Lowkey has spotted something, any non-cooking reply investigates the evergreen.
    if (zoneRef.current === "sanctuary" && sb.includes("spotted") && !sb.includes("hiding") && !cookWords.test(text)) {
      setDraft("");
      setPhase("working");
      const run = runId.current;
      await playBeat(SANCTUARY_SIGNAL.beats.find(b => b.id === "hiding")!, run);
      if (run === runId.current) setPhase("idle");
      return;
    }
    if (zoneRef.current === "sanctuary" && prologue === "off" && DRINK_WORDS.test(text) && !cookWords.test(text)) {
      setDraft("");
      setPhase("working");
      const run = runId.current;
      await drink(run);
      if (run === runId.current) setPhase("idle");
      return;
    }
    if (zoneRef.current === "sanctuary" && prologue === "off" && REST_WORDS.test(text) && !cookWords.test(text)) {
      setDraft("");
      setPhase("working");
      const run = runId.current;
      await bedtime(run);
      if (run === runId.current) setPhase("idle");
      return;
    }
    if (zoneRef.current === "sanctuary" && cookWords.test(text)) {
      setDraft("");
      setPhase("working");
      const run = runId.current;
      await cookout(run);
      // Once something has been spotted, a cookout becomes the trust offering (fail-safe: no need to ask "what?" first).
      const trust = SANCTUARY_SIGNAL.beats.find(b => b.id === "trust")!;
      if (run === runId.current && storyRef.current.beats.includes("spotted") && !storyRef.current.beats.includes("trust")) {
        if (!storyRef.current.beats.includes("hiding")) commitStory({ ...storyRef.current, beats: [...storyRef.current.beats, "hiding"] });
        await playBeat(trust, run);
      }
      if (run === runId.current) setPhase("idle");
      return;
    }
    if (order) {
      // Direct orders skip the job routine: acknowledge and move straight away.
      setDraft("");
      setPhase("working");
      const run = runId.current;
      log(order.proposer, `On it — ${order.who.length > 1 ? "rendezvous at" : "heading to"} ${order.place.name}.`);
      await groupOuting(order, run);
      if (run === runId.current) setPhase("idle");
      return;
    }
    // Conversation (greetings, questions, chat) is answered on the spot in speech bubbles, like the opening chapters.
    const lower = text.toLowerCase().trim();
    const taskWords = /\b(fix|repair|build|make|craft|scan|scout|patrol|check|inspect|clean|gather|collect|upgrade|tune|install|search|explore|investigate|map|survey|guard|plant|dig)\b/;
    const isChat = /\?$/.test(lower) || /^(hi|hello|hey|oi|yo|sup|morning|evening|alright|how|what|who|why|where|when|tell|are|do|did|can you|have you|is|thanks|thank)\b/.test(lower) || !taskWords.test(lower);
    if (isChat && zoneRef.current === "sanctuary") {
      setDraft("");
      setPhase("working");
      const run = runId.current;
      const all: Agent[] = storyRef.current.beats.includes("trust") ? ["Oz", "Brix", "Lowkey", "Moxi"] : ["Oz", "Brix", "Lowkey"];
      const named = all.filter(a => new RegExp(`\\b${a.toLowerCase()}\\b`).test(lower));
      const everyone = /\b(everyone|everybody|all|lads|crew|guys|you lot|team)\b/.test(lower);
      const speakers = named.length ? named : everyone ? all : ["Oz" as Agent];
      let vn = ""; try { vn = localStorage.getItem("zygoria-voice-name") || ""; } catch { /* private mode */ }
      const previous: { agent: Agent; result: string }[] = [];
      for (const z of speakers) {
        if (run !== runId.current) return;
        setBubble({ agent: z, text: "…" });
        let reply: string;
        try {
          const out = await runCrewStep({ data: { directive: text, agent: z, previous, finalReview: false, group: speakers.length > 1, story: (storyRef.current.beats.includes("mp3") ? "UNLOCKED (Chapter 5 happened): Oz found a scratched MP3 player in the ruins, Brix repaired the board, Oz sparked the battery and it now plays music through his headphones. " : "") + (vn ? `The voice from the sky is called ${vn}; occasionally call them by name. ` : "") + "Reply conversationally in one or two short sentences." } });
          reply = out.result.replace(/\s+/g, " ").trim().slice(0, 220);
        } catch { reply = z === "Oz" ? "Lost my train of thought. Again?" : z === "Brix" ? "Didn't catch that." : "Hm."; }
        if (run !== runId.current) return;
        previous.push({ agent: z, result: reply });
        setBubble({ agent: z, text: reply }); log(z, reply);
        await wait(Math.min(7000, Math.max(3200, 1800 + reply.length * 45)));
        if (run !== runId.current) return;
        setBubble(null); await wait(1000);
      }
      if (run === runId.current) setPhase("idle");
      return;
    }
    setFinishedId(null);
    setPhase("planning");
    setSelected("Oz");
    let decision: Awaited<ReturnType<typeof chooseJobRoute>>;
    try {
      decision = await chooseJobRoute({ data: { directive: text } });
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Job planning is unavailable right now.");
      setPhase("idle");
      return;
    }
    const { route, group, reason } = decision;
    const missionZone = lockedZones(storyRef.current).includes(decision.zone) ? "sanctuary" : decision.zone;
    const found = nextBeat(missionZone, storyRef.current, text);
    pendingBeat.current = found?.beat ?? null;
    storyNote.current = found?.beat.note ?? "";
    const agent = route[0]!;
    const id = Date.now();
    setDraft("");
    setSelected("Oz");
    setWalking([]);
    setPhase("routing");
    setMissions(prev => [{ id, text, agent, reason, route, zone: missionZone, group, steps: [], done: 0, state: "Routing" as const, time: now() }, ...prev].slice(0, 8));
    log("Oz", `Route: ${route.join(" → ")}. ${reason}`);
    void runMission(id, text, route, missionZone, group, runId.current);
  }
  /** Ambient idle life: every so often one Zig strolls along the trails to another's resting spot for a quick chat. */
  const [bubble, setBubble] = useState<{ agent: Agent; text: string } | null>(null);
  const visiting = useRef<Agent | null>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  // Safety net: an interrupted scene can exit without resetting the phase, which silently blocks
  // taps (water, food, visits). If the crew stays "busy" with nobody talking or walking, free them up.
  useEffect(() => {
    if (phase === "idle" || bubble || walking.length) return;
    const t = setInterval(() => { if (longWaits === 0 && phaseRef.current !== "idle") setPhase("idle"); }, 12000);
    return () => clearInterval(t);
  }, [phase, bubble, walking]);
  /** Crew hunger: drifts down slowly; cosmetic before the Sanctuary, restored by the cookout. */
  const [hunger, setHunger] = useState(HUNGER_START);
  const hungerSaid = useRef<number[]>([]);
  useEffect(() => { setHunger(loadHunger()); }, []);
  useEffect(() => {
    const inSanc = prologue === "off";
    const floor = inSanc ? SANCTUARY_FLOOR : PROLOGUE_FLOOR;
    const id = setInterval(() => { if (sleepRef.current) return; setHunger(h => { const n = h > floor ? clampHunger(h - 1, floor) : h; if (n !== h) saveHunger(n); return n; }); }, inSanc ? SANCTUARY_DRAIN_MS : PROLOGUE_DRAIN_MS);
    return () => clearInterval(id);
  }, [prologue]);
  useEffect(() => {
    if (prologue !== "off") return;
    hungerSaid.current = hungerSaid.current.filter(t => hunger <= t);
    const t = ([10, 20, 40] as const).find(x => hunger <= x && !hungerSaid.current.includes(x));
    if (!t || bubble || phase !== "idle") return;
    hungerSaid.current.push(t);
    const opts = HUNGER_LINES[t];
    const [who, text] = opts[Math.floor(Math.random() * opts.length)]!;
    setBubble({ agent: who as Agent, text }); log(who as Agent, text);
    const tm = setTimeout(() => setBubble(b => b?.text === text ? null : b), 3600);
    return () => clearTimeout(tm);
  }, [hunger, prologue, bubble, phase]);
  /** Crew water: stays full in the opening; drains in the Sanctuary; drinking uses a bottle charge. */
  const [water, setWater] = useState(100);
  const bottlesRef = useRef(BOTTLE_MAX);
  const waterSaid = useRef<number[]>([]);
  useEffect(() => { const s = loadWater(); setWater(s.water); bottlesRef.current = s.bottles; }, []);
  useEffect(() => {
    if (prologue !== "off") return;
    const id = setInterval(() => { if (sleepRef.current) return; setWater(w => { const n = w > WATER_FLOOR ? clampWater(w - 1) : w; if (n !== w) saveWater(n, bottlesRef.current); return n; }); }, WATER_DRAIN_MS);
    return () => clearInterval(id);
  }, [prologue]);
  /** Crew rest: drifts down slowly in the Sanctuary and is restored by a night's sleep in their own homes. */
  const [rest, setRest] = useState(REST_START);
  const restSaid = useRef<number[]>([]);
  useEffect(() => { setRest(loadRest()); }, []);
  useEffect(() => {
    if (prologue !== "off") return;
    const id = setInterval(() => { if (sleepRef.current) return; setRest(r => { const n = r > REST_FLOOR ? clampRest(r - 1) : r; if (n !== r) saveRest(n); return n; }); }, REST_DRAIN_MS);
    return () => clearInterval(id);
  }, [prologue]);
  useEffect(() => {
    if (prologue !== "off") return;
    restSaid.current = restSaid.current.filter(t => rest <= t);
    const t = ([10, 20, 40] as const).find(x => rest <= x && !restSaid.current.includes(x));
    if (!t || bubble || phase !== "idle") return;
    restSaid.current.push(t);
    const opts = REST_LINES[t];
    const [who, text] = opts[Math.floor(Math.random() * opts.length)]!;
    setBubble({ agent: who as Agent, text }); log(who as Agent, text);
    const tm = setTimeout(() => setBubble(b => b?.text === text ? null : b), 3600);
    return () => clearTimeout(tm);
  }, [rest, prologue, bubble, phase]);
  useEffect(() => {
    if (prologue !== "off") return;
    waterSaid.current = waterSaid.current.filter(t => water <= t);
    const t = ([10, 20, 40] as const).find(x => water <= x && !waterSaid.current.includes(x));
    if (!t || bubble || phase !== "idle") return;
    waterSaid.current.push(t);
    const opts = WATER_LINES[t];
    const [who, text] = opts[Math.floor(Math.random() * opts.length)]!;
    setBubble({ agent: who as Agent, text }); log(who as Agent, text);
    const tm = setTimeout(() => setBubble(b => b?.text === text ? null : b), 3600);
    return () => clearTimeout(tm);
  }, [water, prologue, bubble, phase]);
  async function drink(run: number) {
    // Brix fills the tank outside his workshop, calls everyone over, and they all drink back to full.
    const z = ZONES.sanctuary;
    const all: Agent[] = storyRef.current.beats.includes("trust") ? ["Oz", "Brix", "Lowkey", "Moxi"] : ["Oz", "Brix", "Lowkey"];
    const spot: Record<Agent, Point> = { Brix: { x: WATER_TANK.x + 3, y: WATER_TANK.y + 0.5 }, Oz: { x: WATER_TANK.x - 4, y: WATER_TANK.y + 1 }, Lowkey: { x: WATER_TANK.x - 7, y: WATER_TANK.y - 1 }, Moxi: { x: WATER_TANK.x - 1, y: WATER_TANK.y + 3.5 } };
    const paths = Object.fromEntries(all.map(a => [a, a === "Brix" ? [...BRIX_TO_TANK, spot.Brix] : [...toMeet(z, a), spot[a]]])) as Record<Agent, Point[]>;
    const say = async (agent: Agent, text: string, ms = 2400) => { setBubble({ agent, text }); log(agent, text); await wait(Math.max(ms, 1800 + text.length * 45)); setBubble(null); await wait(600); return run === runId.current; };
    outing.current = all;
    if (tankRef.current < TANK_LOW) { if (!await refillTank(run)) return; }
    else { await walk("Brix", paths.Brix, "central", run); if (run !== runId.current) return; }
    if (distance(coords.current.sanctuary.Brix, spot.Brix) > 1) { await walk("Brix", [spot.Brix], "central", run); if (run !== runId.current) return; }
    if (!await say("Brix", B.pick(B.DRINK_CALL))) return;
    await Promise.all(all.filter(a => a !== "Brix").map(a => walk(a, paths[a], "central", run)));
    if (run !== runId.current) return;
    setFacing(p => ({ ...p, Oz: "right", Lowkey: "right", Brix: "left" }));
    for (const [who, text] of B.riff(B.SIP, all, { skip: 0.2 })) if (!await say(who, `💧 ${text}`, 2000)) return;
    bottlesRef.current = BOTTLE_MAX;
    setWater(() => { saveWater(100, BOTTLE_MAX); return 100; });
    setTankLevelSaved(Math.max(0, tankRef.current - 25 * all.length));
    setTank("idle");
    await Promise.all(all.map(a => walk(a, [...paths[a].slice(0, -1).reverse(), HOME(z, a)], "home", run)));
    if (run !== runId.current) return;
    outing.current = [];
  }
  const [tank, setTank] = useState<"idle" | "filling" | "full">("idle");
  /** How full the tank is (0–100); starts empty so Brix fills it on arrival, and refills it whenever it runs low. */
  const [tankLevel, setTankLevel] = useState(100);
  const tankRef = useRef(100);
  const [carrying, setCarrying] = useState(false);
  const refilling = useRef(false);
  function setTankLevelSaved(n: number) { tankRef.current = n; setTankLevel(n); try { localStorage.setItem(TANK_KEY, String(n)); } catch { /* ignore */ } }
  useEffect(() => { const v = Number(localStorage.getItem(TANK_KEY) ?? 0); const n = Number.isFinite(v) ? Math.min(100, Math.max(0, v)) : 0; tankRef.current = n; setTankLevel(n); }, []);
  /** Brix picks the tank up, carries it to the river, fills it and sets it back down. */
  async function refillTank(run: number) {
    refilling.current = true;
    try {
      const brixSpot = BRIX_TO_TANK.at(-1)!;
      if (distance(coords.current.sanctuary.Brix, brixSpot) > 4) { await walk("Brix", BRIX_TO_TANK, "central", run); if (run !== runId.current) return false; }
      else { await walk("Brix", [brixSpot], "central", run); if (run !== runId.current) return false; }
      setCarrying(true); log("Brix", "Tank's low. Off to the river.");
      await walk("Brix", RIVER_FILL, "central", run); if (run !== runId.current) return false;
      setTank("filling");
      for (let l = tankRef.current; l < 100; l = Math.min(100, l + 20)) { setTankLevel(l); await wait(350); if (run !== runId.current) return false; }
      setTankLevelSaved(100); setTank("full");
      await walk("Brix", [...RIVER_FILL.slice(0, -1).reverse(), brixSpot], "central", run); if (run !== runId.current) return false;
      setCarrying(false);
      return true;
    } finally { refilling.current = false; }
  }
  useEffect(() => {
    if (prologue !== "off" || zoneId !== "sanctuary" || phase !== "idle" || tankLevel >= TANK_LOW || refilling.current || bubble) return;
    const tm = setTimeout(async () => {
      if (refilling.current || tankRef.current >= TANK_LOW) return;
      cancelVisit();
      setPhase("working");
      const run = runId.current;
      outing.current = ["Brix"];
      const ok = await refillTank(run);
      if (ok && run === runId.current) {
        setBubble({ agent: "Brix", text: "Fresh water's in. Help yourselves." }); log("Brix", "Fresh water's in. Help yourselves.");
        await wait(2600); setBubble(null); setTank("idle");
        await walk("Brix", [...BRIX_TO_TANK.slice(0, -1).reverse(), HOME(ZONES.sanctuary, "Brix")], "home", run);
        outing.current = [];
      }
      if (run === runId.current) setPhase("idle");
      setCarrying(false);
    }, 2500);
    return () => clearTimeout(tm);
  }, [tankLevel, prologue, zoneId, phase, bubble]);
  function cancelVisit() {
    const v = visiting.current;
    visiting.current = null;
    setBubble(null);
    const c = choring.current;
    if (c) { choring.current = null; runId.current++; coords.current.sanctuary[c] = { ...HOME(ZONES.sanctuary, c) }; spots.current.sanctuary[c] = "home"; setActing(null); setWalking(w => w.filter(x => x !== c)); setPositions(prev => ({ ...prev, [c]: "home" })); paint(c); }
    if (outing.current.length) {
      const back = outing.current; outing.current = [];
      runId.current++;
      for (const a of back) { coords.current.sanctuary[a] = { ...HOME(ZONES.sanctuary, a) }; spots.current.sanctuary[a] = "home"; paint(a); }
      setWalking([]);
      setPositions({ Oz: "home", Brix: "home", Lowkey: "home", Moxi: "home" });
    }
    if (!v) return;
    runId.current++;
    const z = ZONES.sanctuary;
    coords.current.sanctuary[v] = { ...HOME(z, v) };
    spots.current.sanctuary[v] = "home";
    setPositions(prev => ({ ...prev, [v]: "home" }));
    paint(v);
  }
  // ---- Point-and-click: Oz walks where the visitor clicks, along the Sanctuary's walkable trails ----
  const stageRef = useRef<HTMLDivElement | null>(null);
  const ozAway = useRef(false);
  const [clickMark, setClickMark] = useState<{ id: number; x: number; y: number } | null>(null);
  // Double-click a Zig to steer them by hand; ground clicks then walk that Zig instead of Oz.
  const [steer, setSteer] = useState<Agent | null>(null);
  const steerRef = useRef<Agent | null>(null);
  const lastAgentTap = useRef<{ a: Agent; t: number } | null>(null);
  const walkGraph = useMemo(() => {
    const z = ZONES.sanctuary, nodes: Point[] = [], edges: number[][] = [];
    const add = (p: Point) => { let i = nodes.findIndex(n => distance(n, p) < 1.2); if (i < 0) { i = nodes.length; nodes.push({ ...p }); edges.push([]); } return i; };
    const link = (a: number, b: number) => { if (a !== b && !edges[a]!.includes(b)) { edges[a]!.push(b); edges[b]!.push(a); } };
    const chain = (pts: Point[]) => { let prev = -1; for (const p of pts) { const i = add(p); if (prev >= 0) link(prev, i); prev = i; } };
    (["Oz", "Brix", "Lowkey"] as Agent[]).forEach(a => chain([HOME(z, a), ...z.paths[a]]));
    if (z.work.Brix) chain([HOME(z, "Brix"), ...z.work.Brix]);
    chain([z.paths.Oz.at(-1)!, z.paths.Brix.at(-1)!]);
    // Visitor-drawn extra trails (crossroads V, centre track, workshop frontage); ends join the nearest existing trail.
    const base = nodes.length;
    const snap = (p: Point) => { let b = 0; for (let i = 1; i < base; i++) if (distance(nodes[i]!, p) < distance(nodes[b]!, p)) b = i; return b; };
    const extra: Point[][] = [
      [{ x: 48, y: 62 }, { x: 52, y: 67 }, { x: 57, y: 72.5 }],
      [{ x: 58, y: 62 }, { x: 58, y: 68 }, { x: 58, y: 73.5 }],
      [{ x: 57, y: 72.5 }, { x: 58, y: 73.5 }, { x: 63, y: 64 }, { x: 68, y: 57 }],
      [{ x: 73.5, y: 53.5 }, { x: 80, y: 57 }, { x: 86, y: 60.5 }, { x: 91.5, y: 64 }],
      // Invisible ring around the fire pit (42,45): the crew can circle it 360° but never cross it.
      [{ x: 42, y: 40.2 }, { x: 45.4, y: 41.6 }, { x: 46.8, y: 45 }, { x: 45.4, y: 48.4 }, { x: 42, y: 49.8 }, { x: 38.6, y: 48.4 }, { x: 37.2, y: 45 }, { x: 38.6, y: 41.6 }, { x: 42, y: 40.2 }],
      // Spur joining the ring to Lowkey's switchback trail
      [{ x: 46.8, y: 45 }, { x: 53, y: 46 }],
    ];
    for (const seg of extra) {
      chain(seg);
      const a = add(seg[0]!), b = add(seg[seg.length - 1]!);
      for (const [i, p] of [[a, seg[0]!], [b, seg[seg.length - 1]!]] as const) { const s = snap(p); if (distance(nodes[s]!, p) < 12) link(i, s); }
    }
    return { nodes, edges };
  }, []);
  const nearestNode = (p: Point) => walkGraph.nodes.reduce((best, n, i) => distance(n, p) < distance(walkGraph.nodes[best]!, p) ? i : best, 0);
  /** Bedtime: each crew member walks to their own door, slips inside, and Zzz rise from home. */
  async function bedtime(run: number) {
    if (sleepRef.current) return;
    sleepRef.current = true;
    setSleepPrompt(false);
    setSleepStage("settling");
    const all: Agent[] = storyRef.current.beats.includes("trust") ? ["Oz", "Brix", "Lowkey", "Moxi"] : ["Oz", "Brix", "Lowkey"];
    const say = async (agent: Agent, text: string, ms = 1500) => {
      setBubble({ agent, text }); log(agent, text);
      await wait(Math.min(6000, Math.max(ms, 2600, 1800 + text.length * 45)));
      setBubble(null);
      await wait(500);
      return run === runId.current;
    };
    // A walk never resolves once its run is cancelled, so race it to keep the night moving.
    const abortable = <T,>(p: Promise<T>) => new Promise<Awaited<T> | "bail">(resolve => {
      const poll = setInterval(() => { if (run !== runId.current) { clearInterval(poll); resolve("bail"); } }, 200);
      void p.then(v => { clearInterval(poll); resolve(v as Awaited<T>); });
    });
    for (const [a, line] of B.riff(B.BED, all, { skip: 0.2 })) if (!await say(a, line)) return;
    // Everyone heads for their own door along the trails they already know.
    await abortable(Promise.all(all.map(a => walk(a, [...routeNodes(coords.current.sanctuary[a], BED[a].door), BED[a].door], "central", run))));
    if (run !== runId.current) return;
    setHatchOpen(true);
    await wait(900);
    if (run !== runId.current) return;
    setHatchOpen(false);
    setInBed({ Oz: true, Brix: true, Lowkey: true, Moxi: false });
    setCurled(all.includes("Moxi"));
    setFire("embers");
    setSleepStage("asleep");
    log("Oz", "The camp settles in for the night.");
    await holdBusy(new Promise<void>(resolve => {
      const t = setTimeout(() => { napSkip.current = null; resolve(); }, NAP_MS);
      napSkip.current = () => { clearTimeout(t); napSkip.current = null; resolve(); };
    }));
    if (run !== runId.current) return;
    // Morning: the doors open and everyone stretches back into the day.
    setSleepStage("waking");
    for (const [a, line] of B.riff(B.WAKE, all, { skip: 0.3 })) if (!await say(a, line, 1300)) return;
    setInBed({ Oz: false, Brix: false, Lowkey: false, Moxi: false });
    setCurled(false);
    setFire("lit");
    await abortable(Promise.all(all.map(a => walk(a, [BED[a].out], "central", run))));
    if (run !== runId.current) return;
    for (const a of all) { coords.current.sanctuary[a] = { ...BED[a].out }; spots.current.sanctuary[a] = "home"; paint(a); }
    setPositions({ Oz: "home", Brix: "home", Lowkey: "home", Moxi: "home" });
    setRest(() => { saveRest(100); return 100; });
    setSleepStage("off");
    sleepRef.current = false;
    log("Oz", "Morning. Everyone up and moving.");
  }
  function routeNodes(from: Point, to: Point): Point[] {
    const s = nearestNode(from), t = nearestNode(to), prev = new Map<number, number>([[s, -1]]), queue = [s];
    while (queue.length) { const c = queue.shift()!; if (c === t) break; for (const n of walkGraph.edges[c]!) if (!prev.has(n)) { prev.set(n, c); queue.push(n); } }
    const out: Point[] = []; for (let c = t; c >= 0 && prev.has(c); c = prev.get(c)!) out.unshift(walkGraph.nodes[c]!);
    return out;
  }
  const canClick = () => phaseRef.current === "idle" && prologue === "off" && zoneRef.current === "sanctuary" && !sleepRef.current;
  async function ozTo(p: Point, exact: boolean, arrive?: (run: number) => Promise<void> | void) {
    if (!canClick()) return;
    if (visiting.current || choring.current || outing.current.length) cancelVisit();
    const run = ++runId.current;
    setWalking(w => w.filter(a => a !== "Oz"));
    const pts = routeNodes(coords.current.sanctuary.Oz, p);
    if (exact && pts.length && distance(pts.at(-1)!, p) < 5) pts.push(p);
    ozAway.current = true; spots.current.sanctuary.Oz = "central";
    await walk("Oz", pts.length ? pts : [p], "central", run);
    if (run !== runId.current) return;
    setClickMark(null);
    await arrive?.(run);
    // After a short look around, Oz drifts home so the crew's own wandering resumes.
    await wait(8000);
    if (run === runId.current && ozAway.current) await ozHome();
  }
  /** Before any job or scripted moment, Oz strolls back home along the trails. */
  async function ozHome() {
    if (!ozAway.current) return;
    ozAway.current = false;
    const run = ++runId.current;
    setClickMark(null); setBubble(null);
    const home = HOME(ZONES.sanctuary, "Oz");
    await walk("Oz", [...routeNodes(coords.current.sanctuary.Oz, home), home], "home", run);
    spots.current.sanctuary.Oz = "home";
  }
  async function chatAt(run: number, lines: [Agent, string][]) {
    for (const [a, t] of lines) { if (run !== runId.current) return; setBubble({ agent: a, text: t }); log(a, t); await wait(3400); }
    if (run === runId.current) setBubble(null);
  }
  const GREET: Record<string, [Agent, string][][]> = {
    Brix: [
      [["Oz", "Alright, Brix? What you building?"], ["Brix", "Something that works. Unlike your speakers."], ["Oz", "My speakers are perfect."], ["Brix", "They hum in B flat. Constantly."]],
      [["Oz", "Need a hand?"], ["Brix", "Need you not touching things."], ["Oz", "I touched one thing."], ["Brix", "It was on fire, Oz."]],
      [["Oz", "That workshop's loud today."], ["Brix", "That's the sound of progress."], ["Oz", "Sounds like a bin falling down stairs."]],
    ],
    Lowkey: [
      [["Oz", "Seen anything good?"], ["Lowkey", "A few things. Not telling yet."], ["Oz", "Come on, give us one."], ["Lowkey", "…Clouds."]],
      [["Oz", "You always this quiet?"], ["Lowkey", "Mostly."], ["Oz", "Doesn't it get boring?"], ["Lowkey", "Not when you're around."]],
      [["Oz", "Boo!"], ["Lowkey", "Saw you coming from the bridge."], ["Oz", "…Right. Course you did."]],
    ],
  };
  const beside = (a: Agent) => { const p = coords.current.sanctuary[a]; return { x: p.x + (p.x > 50 ? -6 : 6), y: p.y + 1 }; };
  const visitLines = (a: Agent) => GREET[a]![Math.floor(Math.random() * GREET[a]!.length)]!;
  // The chosen Zig walks the trails to the workshop door before the interior opens.
  const enterWorkshop = (place: InteriorId = "brix") => {
    const pick = steerRef.current ?? selected ?? "Brix";
    const who: Agent = pick === "Moxi" ? "Brix" : pick;
    const door = place === "oz" ? { x: 19, y: 60 } : { x: 71, y: 52.8 };
    const run = ++runId.current;
    const pts = routeNodes(coords.current.sanctuary[who], door);
    if (!pts.length || distance(pts.at(-1)!, door) > 1) pts.push(door);
    setSelected(who);
    setWalking(w => w.filter(a => a !== who));
    // A second tap mid-walk takes over the route; only the latest walk may open the door.
    void walk(who, pts, "central", run).then(() => { if (run === runId.current) setWorkshop(place); });
  };
  function onWorldClick(e: React.MouseEvent<HTMLDivElement>) {
    const tg = e.target as Element | null;
    if (zoneId !== "sanctuary" || !stageRef.current || (tg && typeof tg.closest === "function" && tg.closest("button,a,.welcome-card"))) return;
    if (!canClick()) return;
    const r = stageRef.current.getBoundingClientRect();
    const p = { x: (e.clientX - r.left) / r.width * 100, y: (e.clientY - r.top) / r.height * 100 };
    const steered = steerRef.current;
    if (steered) {
      // Steered Zig walks the trails to the clicked spot; nobody else is pulled along.
      setClickMark({ id: Date.now(), ...p });
      const run = ++runId.current;
      const pts = routeNodes(coords.current.sanctuary[steered], p);
      if (pts.length && distance(pts.at(-1)!, p) < 5) pts.push(p);
      setWalking(w => w.filter(a => a !== steered));
      void walk(steered, pts.length ? pts : [p], "central", run).then(() => { if (run === runId.current) setClickMark(null); });
      return;
    }
    // Clicking the shack offers bedtime; anywhere else clears the offer.
    const atShack = distance(p, { x: 13, y: 53 }) < 8;
    setSleepPrompt(atShack);
    if (atShack) return;
    // The pit artwork sits above its ground point, so the tap area covers the whole visible pit.
    if (Math.abs(p.x - FIRE_PIT.x) < 5 && p.y > FIRE_PIT.y - 9 && p.y < FIRE_PIT.y + 3) { void dispatchDirective("cook me some food"); return; }
    // Clicking the water tank sends Oz over for a drink that tops his water back up.
    if (distance(p, { x: WATER_TANK.x, y: WATER_TANK.y - 3 }) < 5) {
      setClickMark({ id: Date.now(), ...p });
      void ozTo({ x: WATER_TANK.x - 4, y: WATER_TANK.y + 1 }, true, async run => {
        if (run !== runId.current) return;
        const fromTank = tankRef.current > 0;
        const text = fromTank ? "💧 Ahh, fresh. Bottle's full again." : "💧 Tank's dry… scraped a bit off the bottom. Bottle's full though.";
        setFacing(f => ({ ...f, Oz: "right" }));
        setBubble({ agent: "Oz", text }); log("Oz", text);
        bottlesRef.current = BOTTLE_MAX;
        setWater(() => { saveWater(100, BOTTLE_MAX); return 100; });
        if (fromTank) setTankLevelSaved(Math.max(0, tankRef.current - 10));
        await wait(3400);
        if (run === runId.current) setBubble(null);
      });
      return;
    }
    const obj = WORLD_OBJECTS.find(o => o.zone === "sanctuary" && distance(objectPoint(o), p) < 4);
    setClickMark({ id: Date.now(), ...p });
    if (obj) { const lvl = worldRef.current.levels[obj.id] ?? 0; void ozTo(objectPoint(obj), false, run => chatAt(run, [["Oz", `${obj.name}. ${obj.states[lvl]}. Noted.`]])); return; }
    // Clicking near Brix's workshop, Lowkey's lookout or Moxi's grass spot sends Oz over for a visit.
    const hosts: Agent[] = storyRef.current.beats.includes("trust") ? ["Brix", "Lowkey", "Moxi"] : ["Brix", "Lowkey"];
    const host = hosts.find(a => distance(HOME(ZONES.sanctuary, a), p) < 7);
    if (host) { void ozTo(beside(host), true, run => chatAt(run, visitLines(host))); return; }
    void ozTo(p, true);
  }
  function onAgentClick(a: Agent) {
    setSelected(a);
    const last = lastAgentTap.current, now = Date.now();
    if (last && last.a === a && now - last.t < 380) {
      lastAgentTap.current = null;
      const next = steerRef.current === a ? null : a;
      steerRef.current = next; setSteer(next);
      return;
    }
    const tap = { a, t: now };
    lastAgentTap.current = tap;
    if (steerRef.current) return;
    if (a === "Oz") return;
    // Wait out a possible second click so a double-click never also sends Oz on a visit.
    setTimeout(() => {
      if (lastAgentTap.current !== tap || steerRef.current || !canClick()) return;
      const at = coords.current.sanctuary[a];
      setClickMark({ id: Date.now(), ...at });
      void ozTo(beside(a), true, run => a === "Moxi" ? moxiTap(run) : chatAt(run, visitLines(a)));
    }, 380);
  }
  // Ambient crew moments in the outer zones — short scripted exchanges while idle, never during jobs or story scenes.
  useEffect(() => {
    if (prologue !== "off" || phase !== "idle" || zoneId === "sanctuary") return;
    const MOMENTS: Record<string, [Agent, string][][]> = {
      ruins: [
        [["Oz", "What's this? Some kind of shiny hat?"], ["Brix", "It's a hubcap."], ["Oz", "It's a hat now."]],
        [["Brix", "Half these wires still carry something."], ["Lowkey", "Or they remember carrying something."], ["Oz", "Wires don't remember, Lowkey."], ["Lowkey", "You sure?"]],
        [["Oz", "Who builds a city and just leaves?"], ["Lowkey", "Maybe they didn't choose to."]],
      ],
      caves: [
        [["Oz", "HELLO!"], ["Oz", "…It said hello back."], ["Brix", "That's an echo."], ["Oz", "Rude echo. Copied me."], ["Lowkey", "…"]],
        [["Brix", "Air's moving down there. Means there's a way through."], ["Lowkey", "Or something breathing."], ["Oz", "Thanks for that, Lowkey."]],
        [["Lowkey", "Footprints. Old ones."], ["Oz", "Ours?"], ["Lowkey", "No."]],
      ],
      cronk: [
        [["Oz", "This mud's eating my feet."], ["Brix", "Keep moving then."], ["Lowkey", "Something big walked here."]],
        [["Brix", "Scrap in the reeds. Bent, not rusted through."], ["Lowkey", "Bent by what?"], ["Oz", "Let's… not find out today."]],
        [["Oz", "Did that log just move?"], ["Lowkey", "Logs don't blink."]],
      ],
      shelton: [
        [["Lowkey", "Fence lines. Fresh posts."], ["Brix", "Someone's still building out here."], ["Oz", "Nobody invited us."]],
        [["Oz", "Reckon they'd like a visit?"], ["Brix", "Reckon they'd like us gone."], ["Lowkey", "Stay low."]],
      ],
    };
    let alive = true;
    (async () => {
      while (alive) {
        await wait(16000 + Math.random() * 14000);
        if (!alive || phaseRef.current !== "idle") continue;
        const set = MOMENTS[zoneRef.current]; if (!set) continue;
        const run = runId.current;
        for (const [a, t] of set[Math.floor(Math.random() * set.length)]!) {
          if (!alive || run !== runId.current || phaseRef.current !== "idle") break;
          setBubble({ agent: a, text: t }); log(a, t); await wait(3400);
        }
        if (alive && run === runId.current) setBubble(null);
      }
    })();
    return () => { alive = false; };
  }, [phase, zoneId, prologue]);
  useEffect(() => {
    if (prologue !== "off" || phase !== "idle" || zoneId !== "sanctuary") return;
    let alive = true;
    const loop = async () => {
      while (alive) {
        await wait(9000 + Math.random() * 6000);
        if (!alive || phaseRef.current !== "idle" || zoneRef.current !== "sanctuary" || visiting.current || choring.current || outing.current.length || ozAway.current || petBusy.current || bubbleRef.current || Date.now() - quietUntil.current < 0) continue;
        const z = ZONES.sanctuary, all: Agent[] = storyRef.current.beats.includes("trust") ? ["Oz", "Brix", "Lowkey", "Moxi"] : ["Oz", "Brix", "Lowkey"];
        const v = all[Math.floor(Math.random() * all.length)]!;
        const others = all.filter(a => a !== v);
        const h = others[Math.floor(Math.random() * others.length)]!;
        const run = runId.current;
        visiting.current = v;
        const there = [...toMeet(z, v), ...toHome(z, h).slice(0, -2)];
        log(v, `Wandering over to see ${h}.`);
        await walk(v, there, "central", run);
        if (!alive) return; if (run !== runId.current) { visiting.current = null; continue; }
        const hx = HOME(z, h).x, vx = coords.current.sanctuary[v].x;
        setFacing(p => ({ ...p, [v]: hx < vx ? "left" : "right", [h]: hx < vx ? "right" : "left" }));
        let [a, b] = IDLE_CHATS[`${v}>${h}`]![Math.floor(Math.random() * 3)]!;
        const clues = SANCTUARY_SIGNAL.idle[lastBeat(SANCTUARY_SIGNAL, storyRef.current)]?.filter(c => c.pair[0] === v && c.pair[1] === h) ?? [];
        if (clues.length && Math.random() < 0.6) [a, b] = clues[Math.floor(Math.random() * clues.length)]!.lines;
        setBubble({ agent: v, text: a }); log(v, a);
        await wait(3200); if (run !== runId.current) { visiting.current = null; continue; }
        setBubble({ agent: h, text: b }); log(h, b);
        await wait(3200); if (run !== runId.current) { visiting.current = null; continue; }
        setBubble(null);
        await walk(v, [...there.slice(0, -1).reverse(), HOME(z, v)], "home", run);
        if (run !== runId.current) { visiting.current = null; continue; }
        visiting.current = null; quietUntil.current = Date.now() + 15000 + Math.random() * 10000;
      }
    };
    void loop();
    return () => { alive = false; };
  }, [phase, zoneId, prologue]);
  // Living camp: between visits, idle Zigs potter off on little chores or mutter to themselves — never during jobs or scenes.
  const choring = useRef<Agent | null>(null);
  const quietUntil = useRef(0);
  const bubbleRef = useRef(bubble);
  bubbleRef.current = bubble;
  // Moxi 2.0: body-language mood on her marker, and no-repeat line picking.
  const [moxiMood, setMoxiMood] = useState<MoxiMood | null>(null);
  const hungerNow = useRef(hunger); hungerNow.current = hunger;
  const moxiSaid = useRef<string[]>([]);
  const fresh = <T,>(list: T[], key: (x: T) => string): T => {
    const ok = list.filter(x => !moxiSaid.current.includes(key(x)));
    const p = (ok.length ? ok : list)[Math.floor(Math.random() * (ok.length || list.length))]!;
    moxiSaid.current = [key(p), ...moxiSaid.current].slice(0, 8);
    return p;
  };
  const isNightNow = () => Number((document.querySelector(".day-night") as HTMLElement | null)?.style.getPropertyValue("--night") || 0) > 0.5;
  const moxiPetCount = useRef(0);
  async function moxiTap(run: number) {
    const night = isNightNow(), fed = hungerNow.current >= 70;
    const kind = moxiPetCount.current++ % 3;
    const say = async (a: CrewAgent, t: string, ms = 3200) => { if (run !== runId.current) return; setBubble({ agent: a, text: t }); log(a, t); await wait(ms); };
    if (kind === 0) {
      setMoxiMood("happy");
      const [o, m] = fresh(MOXI_PET, x => x[1]);
      await say("Oz", o); await say("Moxi", m);
    } else if (kind === 1) {
      setMoxiMood(night ? "sleepy" : "curious");
      const [o, m] = fresh(night ? MOXI_ASK_NIGHT : fed ? MOXI_ASK_FED : MOXI_ASK_HUNGRY, x => x[1]);
      await say("Oz", o); await say("Moxi", m);
    } else {
      setMoxiMood("excited");
      for (const line of MOXI_TALKS["Oz>Moxi"]!) await say(line[0]!, line[1]!, 2600);
    }
    if (run === runId.current) setBubble(null);
    setMoxiMood(null);
  }
  useEffect(() => {
    if (prologue !== "off" || phase !== "idle" || zoneId !== "sanctuary") return;
    const z = ZONES.sanctuary;
    const CHORES: Record<Agent, { path: Point[]; obj?: string; mood?: MoxiMood; lines: string[] }[]> = {
      Oz: [
        { path: [{ x: 29.5, y: 67.5 }, { x: 33, y: 73.5 }], lines: ["Water's calm. Fish are hiding.", "One day I'll catch a big one.", "Pier's still wobbly. Lovely.", "Plank's loose. I'll tell Brix. Eventually.", "Skimming stones. Four bounces! Five!", "Toes in. Freezing. Worth it."] },
        { path: z.paths.Oz.slice(1, 3), obj: "sanc-speakers", lines: ["Bit more bass…", "Testing, testing… perfect.", "That hum? Character.", "New playlist: Songs For Fish.", "Wire's frayed. Tape fixes everything.", "Oi, speaker. Behave."] },
      ],
      Brix: [{ path: z.work.Brix ?? [], obj: "sanc-workbench", lines: ["Loose bolt. Always a loose bolt.", "Hold still, you.", "That'll hold. Probably.", "Sharpening. Don't distract me.", "Sorting scrap. Good pile, bad pile, Oz pile.", "Oiling the hinge. Squeak's gone.", "Sweeping the bench. Again."] }],
      Lowkey: [{ path: z.paths.Lowkey.slice(1, 4), lines: ["Wind's turning.", "Clouds over the ruins.", "…Something moved. Gone now.", "Birds heading south.", "Counting the trail markers. All there.", "Ridge path's eroding. Noted."] }],
      // Moxi's solo routines: slow, one at a time, each with a body-language mood on her marker.
      Moxi: [
        { path: z.work.Moxi ?? [], mood: "curious", lines: ["Shiny.", "Bug. Mine.", "Digging. Treasure maybe.", "*sniffs the flowers* …Achoo."] },
        { path: [{ x: 57, y: 72.5 }], mood: "curious", lines: ["*watches the river*", "Fish. Swimming. Rude.", "Water talks. Shh.", "*paw in water* COLD."] },
        { path: [{ x: 63, y: 64 }, { x: 66, y: 60 }, { x: 67.5, y: 56 }], mood: "excited", lines: ["*peeks at Brix's bench*", "Clanky thing! …Not touching.", "Brix makes stuff. Good stuff."] },
        { path: [{ x: 57, y: 72.5 }, { x: 52, y: 67 }, { x: 48, y: 63 }, { x: 50.5, y: 54 }], mood: "happy", lines: ["*sits, looks up at the lookout*", "Lowkey up there. Good.", "Quiet spot. Safe spot."] },
        { path: [{ x: 66, y: 66 }, { x: 70, y: 65 }], mood: "curious", lines: ["*watches Boulder Pot… from here*", "Rock. Walking. Hm.", "Not closer. Nope."] },
        { path: [{ x: 61.5, y: 67 }], mood: "excited", lines: ["*chases her tail*", "*stretches wings* Big!", "Tail! Almost! …Again."] },
        { path: [{ x: 61, y: 69.5 }], mood: "sleepy", lines: ["*curls up* Mm.", "*slow blink*", "Warm spot."] },
      ],
    };
    const THOUGHTS: Record<Agent, string[]> = {
      Oz: ["Could murder a hot pasty right now.", "Anyone else hear that? No? Just me.", "I'm basically the heart of this place."],
      Brix: ["Need more scrap.", "Who moved my spanner?", "Roof needs patching before rain."],
      Lowkey: ["Air smells like rain off the river.", "Quiet. Good.", "The ridge sees everything."],
      Moxi: ["Mm.", "Fish later.", "…Sleepy."],
    };
    let alive = true;
    (async () => {
      await wait(4000);
      while (alive) {
        await wait(6000 + Math.random() * 4000);
        if (!alive || phaseRef.current !== "idle" || zoneRef.current !== "sanctuary" || outing.current.length || choring.current || visiting.current || petBusy.current || bubbleRef.current || ozAway.current || Date.now() < quietUntil.current) continue;
        const all: Agent[] = storyRef.current.beats.includes("trust") ? ["Oz", "Brix", "Lowkey", "Moxi"] : ["Oz", "Brix", "Lowkey"];
        const free = all.filter(a => a !== visiting.current && !(a === "Oz" && ozAway.current));
        const a = free[Math.floor(Math.random() * free.length)];
        if (!a) continue;
        const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)]!;
        const run = runId.current;
        if (Math.random() < 0.35) {
          if (bubbleRef.current) continue;
          const t = pick(THOUGHTS[a]); setBubble({ agent: a, text: t }); log(a, t);
          await wait(3200); if (run === runId.current && (bubbleRef.current as { text: string } | null)?.text === t) setBubble(null);
          quietUntil.current = Date.now() + 12000 + Math.random() * 8000;
          continue;
        }
        const chore = pick(CHORES[a]);
        if (!chore.path.length) continue;
        choring.current = a;
        await walk(a, chore.path, "central", run);
        if (!alive || run !== runId.current) { choring.current = null; continue; }
        if (chore.obj) setActing(chore.obj);
        if (chore.mood) setMoxiMood(chore.mood);
        if (!bubbleRef.current) { const t = pick(chore.lines); setBubble({ agent: a, text: t }); log(a, t); }
        await wait(chore.mood ? 4500 + Math.random() * 3000 : 3200);
        if (chore.obj) setActing(o => o === chore.obj ? null : o);
        if (chore.mood) setMoxiMood(m => m === chore.mood ? null : m);
        setBubble(b => b?.agent === a ? null : b);
        if (run !== runId.current) { choring.current = null; continue; }
        await walk(a, [...chore.path.slice(0, -1).reverse(), HOME(z, a)], "home", run);
        choring.current = null; quietUntil.current = Date.now() + 15000 + Math.random() * 10000;
      }
    })();
    return () => { alive = false; };
  }, [phase, zoneId, prologue]);
  const visitedZones = useMemo(() => [...new Set<ZoneId>([zoneId, ...missions.map(m => m.zone)])], [zoneId, missions]);
  const codexPages = useMemo(() => {
    const c = SANCTUARY_SIGNAL.codex, done = chapterDone(SANCTUARY_SIGNAL, story);
    const page = done ? { ...c, category: "Creatures" as const, level: "known" as const } : { id: c.id, category: "Creatures" as const, name: "Unrecorded", description: story.beats.includes("spotted") ? "Something small moving near the trees. Lowkey's sure he saw it." : "Nothing recorded yet.", location: null, recordedBy: null, level: "hidden" as const };
    return [...canon.codexPages.filter(p => p.id !== c.id && p.id !== TV_CODEX.id), page, ...(tvDone ? [TV_CODEX] : [])];
  }, [canon.codexPages, story, tvDone]);
  const codexRecorded = useMemo(() => {
    const ids = chapterDone(SANCTUARY_SIGNAL, story) ? [...world.discoveries, SANCTUARY_SIGNAL.codex.id] : [...world.discoveries];
    if (story.beats.includes("thoth")) ids.push("thoth"); // Lowkey's lookout encounter records Thoth's page
    if (tvDone) ids.push(TV_CODEX.id);
    return ids;
  }, [world.discoveries, story, tvDone]);
  const codexLogs = useMemo(() => missions.map(m => ({ text: m.text, zone: m.zone, done: m.state === "Complete", results: m.steps.map(st => st.result).join(" ") })), [missions]);
  function selectZone(z: ZoneId) {
    if (phase !== "idle" || z === zoneId) return;
    setZoneId(z);
    setPositions({ Oz: "home", Brix: "home", Lowkey: "home", Moxi: "home" });
    setWalking([]);
  }
  const sancChapter = story.beats.includes("trust") ? ["MOXI"] : story.beats.includes("mp3-start") ? ["OZ'S MP3"] : ["FINDING HOME"];
  /** Moxi becomes a full crew agent once the trust scene has played. */
  const moxiJoined = story.beats.includes("trust");
  const crew = moxiJoined ? [...agents, MOXI_AGENT] : agents;
  return <div className="command-app"><StartCover/>
    <header className="command-header">
      <div className="brand-lockup"><div className="brand-mark" onClick={tapLogo}><Hexagon size={25} strokeWidth={1.5}/><span>Z</span></div><div className="brand-copy"><div className="brand-title">ZYGORIA<span className="brand-tm">™</span></div><div className="brand-subtitle"><span className="brand-subtitle-rule"/>FIRST GENESIS<span className="brand-subtitle-rule"/></div></div></div>
      <div className="header-right"><ShackRadio trigger={radioKick}/><div className="live-indicator"><span className="live-dot"/> WORLD ONLINE</div><div className="header-divider"/><div className="header-coordinate"><Signal size={14}/> 47° N / 09° E</div><div className="header-avatar">Z</div></div>
    </header>
    <main className="command-layout">
      <div className="world-column">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> {prologue === "off" ? "LIVE WORLD FEED" : "FIRST GENESIS"} <span className="eyebrow-line"/></div>{prologue === "walk" ? <><h1>The Long <span>Walk</span></h1><p>Dead roads. Broken hills. No water yet.</p></> : prologue === "on" ? <><h1>{scene.title[0]}<span>{scene.title[1]}</span></h1><p>{scene.sub}</p></> : <><h1>{zone.title[0]}<span>{zone.title[1]}</span></h1><p>{zone.sub}</p></>}</div><div className="world-index"><CircleDot size={14}/> {prologue === "on" ? <>{scene.chapter}</> : prologue === "walk" ? <>THE LONG WALK</> : zoneId === "sanctuary" ? <>{sancChapter[0]}</> : <>{zone.indexA} <span> / </span> {zone.indexB}</>}</div></div>
        <div className="zone-selector" role="group" aria-label="Zygoria zones">{(editor || cleared.length > 0) && <span className="scene-jump"><button type="button" className={`zone-chip scene-jump-btn ${editor ? "is-editor" : ""}`} aria-expanded={scenesOpen} onClick={() => setScenesOpen(o => !o)}><span className="zone-dot"/>{editor ? "DEV · SCENES ▾" : "VISITED ▾"}</button>{scenesOpen && <span className="scene-jump-menu" role="menu">{[...PROLOGUE_SCENES.map(s => s.title.join(" ").trim()), "Riverside Sanctuary", "Underground Haven"].map((label, i) => { const sid = i < PROLOGUE_SCENES.length ? PROLOGUE_SCENES[i]!.id : i === PROLOGUE_SCENES.length ? "sanctuary" : i === PROLOGUE_SCENES.length + 2 ? "sanctuary" : "haven"; if (!editor && !cleared.includes(sid)) return null; const here = i === PROLOGUE_SCENES.length + 2 ? workshop : i === PROLOGUE_SCENES.length + 1 ? haven : i < PROLOGUE_SCENES.length ? prologue === "on" && prologueStep === i : !haven && !workshop && prologue === "off" && zoneId === "sanctuary"; return <button key={i} type="button" role="menuitem" className={here ? "is-active" : ""} onClick={() => jumpScene(i)}>{label}</button>; })}</span>}</span>}{prologue === "off" && <button type="button" className="zone-chip" disabled={phase !== "idle"} onClick={() => { setPrologueStep(0); setPrologue("on"); }}><span className="zone-dot"/>PROLOGUE</button>}<span className="stage-chip">{prologue === "on" ? scene.chapter : prologue === "walk" ? "THE LONG WALK" : zoneId === "sanctuary" ? sancChapter[0] : canon.stage}</span><span className={`hunger-meter ${hunger <= 20 ? "is-low" : ""}`} role="meter" aria-label="Crew hunger" aria-valuenow={hunger} aria-valuemin={0} aria-valuemax={100}><span className="hunger-label">FOOD</span><span className="hunger-track"><span className="hunger-fill" style={{ width: `${hunger}%` }}/></span><span className="hunger-num">{hunger}%</span></span><span className={`hunger-meter water-meter ${water <= 20 ? "is-low" : ""}`} role="meter" aria-label="Crew water" aria-valuenow={water} aria-valuemin={0} aria-valuemax={100}><span className="hunger-label">WATER</span><span className="hunger-track"><span className="hunger-fill" style={{ width: `${water}%` }}/></span><span className="hunger-num">{water}%</span></span><span className={`hunger-meter rest-meter ${rest <= 20 ? "is-low" : ""}`} role="meter" aria-label="Crew rest" aria-valuenow={rest} aria-valuemin={0} aria-valuemax={100}><span className="hunger-label">REST</span><span className="hunger-track"><span className="hunger-fill" style={{ width: `${rest}%` }}/></span><span className="hunger-num">{rest}%</span></span>{prologue === "off" && ZONE_LIST.filter(z => canon.unlockedZones.includes(z.id) && !lockedZones(story).includes(z.id)).map(z => <button key={z.id} type="button" className={`zone-chip ${z.id === zoneId ? "is-active" : ""}`} disabled={phase !== "idle"} onClick={() => selectZone(z.id)}><span className="zone-dot"/>{z.chip}</button>)}</div>
        <div className="world-frame">
          {haven ? <HavenScene/> : workshop ? <WorkshopScene place={workshop} key={workshop} character={((s => s === "Moxi" ? "Brix" : s)(steer ?? selected ?? "Brix"))} onExit={() => setWorkshop(false)}/> : prologue === "on" && building ? <BuildInterlude onDone={finishBuild}/> : prologue === "on" ? <PrologueScene key={scene.id} scene={scene} command={prologueCmd} onLog={log} onNext={nextPrologue} onSkip={endPrologue} canSkip={editor || cleared.includes("sanctuary")}/> : prologue === "walk" ? <div className="world-image-wrap prologue-scene long-walk"><img className="world-image" src={CHRONICLES[2]!.img} alt="The Long Walk: the Zigs cross dead roads and broken hills" /><div className="world-vignette"/><div className="map-coordinate top-right">THE LONG WALK</div><div className="prologue-card" role="dialog" aria-label="The Long Walk"><span className="prologue-card-eyebrow">THE LONG WALK</span><strong>Searching for water</strong><p>{CHRONICLES[2]!.text}</p><button type="button" onClick={endPrologue}>Arrive at the river ›</button></div></div> : <div onClick={onWorldClick} className={`world-image-wrap ${scannerEvent ? "scanner-event" : ""} ${zone.id === "sanctuary" ? "is-clickable" : ""}`} style={{ "--zone-aspect": String(zone.aspect) } as CSSProperties}><img key={zoneId} className="world-image" src={zone.img} width={1520} height={1024} loading={zone.id === "sanctuary" ? undefined : "lazy"} alt={zone.alt} />{zone.id === "sanctuary" && <DayNight/>}
            {zone.id === "sanctuary" && <img className="shack-definition" src={shackDefinition} alt="" aria-hidden="true" draggable={false} />}
            <div className="world-vignette"/>
            <div className="map-coordinate top-left">◉ &nbsp; {zone.label}</div>
            <div className="map-coordinate top-right"><span className="live-dot"/> LIVE ENVIRONMENT</div>
            {zone.id === "sanctuary" && <>
              <div className="location-tag shack-tag"><span className="location-line"/> RIVERSIDE SHACK</div>
              <div className="location-tag workshop-tag"><span className="location-line"/> BRIX'S WORKSHOP</div>
              <div className="location-tag lookout-tag"><span className="location-line"/> LOOKOUT</div>
              <div className="scene-atmosphere" aria-hidden="true"><span className="river-light"/><span className="workshop-light"/></div>
              <div className="scene-depth" aria-hidden="true"><span className="depth-haze"/><span className="depth-ridge-shade"/><span className="depth-pool pool-shack"/><span className="depth-pool pool-workshop"/><span className="depth-pool pool-pods"/><span className="depth-pool pool-lookout"/><span className="depth-pool pool-bridge"/><span className="depth-river"/><span className="depth-fore"/></div>
              {story.beats.includes("hiding") && !story.beats.includes("trust") && <img className="moxi-scenery" src={moxiUnderTree.url} alt="Moxi, a tiny dragon peeking over rocks beneath the evergreen near Brix's workshop" draggable={false} />}
              <div className="location-tag central-tag"><span className="location-line"/> CROSSROADS</div>
            </>}
            {zone.id !== "sanctuary" && zone.tags.map(t => <div key={t.label} className="location-tag zone-tag" style={{ left: `${t.x}%`, top: `${t.y}%` }}><span className="location-line"/> {t.label}</div>)}
            <div className="world-stage" ref={stageRef}>
            {clickMark && <span key={clickMark.id} className="click-mark" style={{ left: `${clickMark.x}%`, top: `${clickMark.y}%` }} aria-hidden="true"/>}
            {zone.id === "sanctuary" && prologue === "off" && <button type="button" className="workshop-door-hit" style={{ left: "74.5%", top: "44%" }} aria-label="Enter Brix's workshop" title="Tap to enter" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); enterWorkshop("brix"); }}/>}
            {zone.id === "sanctuary" && prologue === "off" && <button type="button" className="workshop-door-hit" style={{ left: "18%", top: "56%" }} aria-label="Enter Oz's shack" title="Tap to enter" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); enterWorkshop("oz"); }}/>}
            {zone.id === "sanctuary" && prologue === "off" && <BoulderPot happy={petHappy} asleep={sleepStage === "asleep"}/>}
            {zone.id === "sanctuary" && prologue === "off" && <SanctuaryTV ready={phase === "idle" && sleepStage === "off" && !bubble} editor={editor} onLog={(who, text) => log(who as Agent, text)} onDone={() => setTvDone(true)}/>}
            {zone.id === "sanctuary" && thoth && <div className="thoth" style={{ left: `${HOME(zone, "Lowkey").x + 8}%`, top: `${HOME(zone, "Lowkey").y}%` }} role="img" aria-label="Thoth, a robed ibis-headed figure"><img src={thothImg.url} alt="" draggable={false}/>{thoth.line && <span className="thoth-bubble">{thoth.line}</span>}</div>}
            {zone.id === "sanctuary" && !carrying && <div className={`water-tank-spot is-${tank}`} style={{ left: `${WATER_TANK.x}%`, top: `${WATER_TANK.y}%` }}><img className="water-tank" src={waterTankImg} alt="Brix's water tank" width={816} height={816}/><span className={`tank-meter ${tankLevel < TANK_LOW ? "is-low" : ""}`} role="meter" aria-label="Water tank level" aria-valuenow={tankLevel} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${tankLevel}%` }}/></span></div>}
            {zone.id === "sanctuary" && <div className={`fire-pit is-${fire}`} style={{ left: `${FIRE_PIT.x}%`, top: `${FIRE_PIT.y}%`, zIndex: 10 + Math.round(FIRE_PIT.y * 10) }} aria-label={fire === "out" ? "Fire pit, cold" : "Fire pit, burning"}><span className="pit-glow"/><img className="pit-art" src={firePitImg} alt="" width={816} height={816} loading="lazy"/><span className="pit-ring"/><span className="pit-flame"/><span className="pit-fish"><i/><i/><i/></span><span className="pit-spark"/></div>}
            {zone.id === "sanctuary" && <div className={`rock-hatch ${hatchOpen ? "is-open" : ""}`} style={{ left: `${BED.Lowkey.door.x}%`, top: `${BED.Lowkey.door.y}%` }} aria-hidden="true"><img src={rockHatch} alt="" width={816} height={816} loading="lazy"/></div>}
            {zone.id === "sanctuary" && sleepStage !== "off" && <>{(["Oz", "Brix", "Lowkey"] as Agent[]).filter(a => inBed[a]).map(a => <span key={a} className="zeds" style={{ left: `${BED[a].zzz.x}%`, top: `${BED[a].zzz.y}%` }} aria-hidden="true"><i>Z</i><i>Z</i><i>Z</i></span>)}{curled && <span className="zeds" style={{ left: `${BED.Moxi.zzz.x}%`, top: `${BED.Moxi.zzz.y}%` }} aria-hidden="true"><i>Z</i><i>Z</i><i>Z</i></span>}</>}
            {zone.id === "sanctuary" && sleepStage === "waking" && <div className="sunrise-sweep" aria-hidden="true"/>}
            {zone.id === "sanctuary" && sleepPrompt && sleepStage === "off" && <button type="button" className="sleep-prompt" style={{ left: `${BED.Oz.door.x}%`, top: `${BED.Oz.door.y - 9}%` }} onClick={() => { setPhase("working"); const run = runId.current; void bedtime(run).finally(() => { if (run === runId.current) setPhase("idle"); }); }}>GO TO SLEEP</button>}
            {zone.id === "sanctuary" && sleepStage !== "off" && <button type="button" className="nap-skip" onClick={() => napSkip.current?.()}>SKIP TO MORNING ›</button>}
            {WORLD_OBJECTS.filter(o => o.zone === zoneId).map(o => { const p = objectPoint(o), lvl = world.levels[o.id] ?? 0; return <div key={o.id} className={`world-object wo-${o.agent.toLowerCase()} level-${lvl} ${lvl === o.states.length - 1 ? "is-max" : ""} ${acting === o.id ? "is-acting" : ""} ${changed === o.id ? "just-changed" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-label={`${o.name}: ${o.states[lvl]}`}><span className="wo-ring"/><span className="wo-label">{o.name} · {o.states[lvl]}</span></div>; })}
            {mp3Task && zoneId === "sanctuary" && (() => { const p = objectPoint(WORLD_OBJECTS.find(o => o.id === "sanc-workbench")!); return <div className={`world-object wo-brix mp3-task ${mp3Task === "fixed" ? "is-max" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }}><span className="wo-ring"/><span className="wo-label">MP3 PLAYER · {mp3Task === "fixed" ? "FIXED" : "BROKE"}</span></div>; })()}
            <div ref={taskIconRef} className="task-energy" aria-hidden="true"><span/></div>
             {crew.map(agent => <Button key={agent.name} ref={el => { markerRefs.current[agent.name] = el; }} style={markerStyle(agent.name)} type="button" variant="ghost" title={`View ${agent.name}`} aria-label={`View ${agent.name}, ${statuses[agent.name]}${walking.includes(agent.name) ? ", walking" : ""}`} onClick={() => onAgentClick(agent.name)} className={`agent-marker ${edgeCls(agent.name)} marker-${agent.name.toLowerCase()} at-${positions[agent.name]} facing-${facing[agent.name]} ${agent.name === "Oz" ? `oz-facing-${ozDirection}` : ""} ${agent.name === "Brix" ? `brix-facing-${brixDirection}` : ""} ${agent.name === "Lowkey" ? `lowkey-facing-${lowkeyDirection}` : ""} ${selected === agent.name ? "is-selected" : ""} ${inBed[agent.name] ? "is-hidden" : ""} ${agent.name === "Moxi" && curled ? "is-curling" : ""} ${agent.name === "Moxi" && moxiMood && !walking.includes("Moxi") ? `moxi-${moxiMood}` : ""} ${statuses[agent.name] !== "Idle" ? "is-active" : ""} ${walking.includes(agent.name) ? "is-walking" : ""} ${statuses[agent.name] === "Working" || statuses[agent.name] === "Thinking" && !walking.includes(agent.name) ? "is-thinking" : ""}`}>
              {steer === agent.name && <span className="ctrl-ring" aria-hidden="true"/>}<span className="marker-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]}</span>{bubble?.agent === agent.name && <span className="idle-bubble">{bubble.text}</span>}<span className="sprite-stage"><CharacterSprite character={agent.name}/>{agent.name === "Brix" && carrying && <img className="carried-tank" src={waterTankImg} alt="" aria-hidden="true"/>}</span><span className="marker-name">{agent.name === "Oz" ? <img className="oz-wordmark" src={ozWordmark.url} alt="Oz" draggable={false} /> : agent.name === "Brix" ? <img className="brix-wordmark" src={brixWordmark.url} alt="Brix" draggable={false} /> : agent.name === "Moxi" ? <img className="moxi-wordmark" src={moxiWordmark.url} alt="Moxi" draggable={false} /> : <img className="lowkey-wordmark" src={lowkeyWordmark.url} alt="Lowkey" draggable={false} />}</span>
            </Button>)}
            </div>
            {steer && zone.id === "sanctuary" && <div className="combat-hint" aria-hidden="true">Steering {steer} · click ground to walk · double-click {steer} to let go</div>}
            <div className="map-coordinate bottom-left"><MapPin size={12}/> {zone.bottom}</div><div className="map-coordinate bottom-right">ZOOM 01 : 01 <span className="zoom-bars">▮▮▮▯</span></div>
          </div>}
          <WelcomeGuide onAsk={text => { if (phase === "idle") { setDraft(text); void dispatchDirective(text); } }} />
          <div className="world-footer"><span><span className="live-dot"/> ALL SYSTEMS OPERATIONAL</span><span>{crew.length} AGENTS CONNECTED <span className="footer-cross">✦</span> {prologue === "on" ? scene.chapter : prologue === "walk" ? "THE LONG WALK" : "1 SANCTUARY"}</span><span className="creator-credit">Created by <span className="creator-signature">Dylan Owen</span><span className="creator-year">· 2026</span></span></div>
        </div>
        <form className="mission-form" onSubmit={submit}><div className="form-title"><span><Terminal size={16}/> NEW DIRECTIVE</span><span className="form-counter">{phase === "idle" ? "READY FOR INPUT" : phase === "planning" ? "SELECTING CREW" : "MISSION IN PROGRESS"}</span></div><div className="form-row"><span className="prompt-chevron">›</span><input aria-label="Enter a job for the crew" placeholder={prologue === "on" ? "Talk to the crew, or send them somewhere…" : "What needs doing around Zygoria?"} value={draft} onChange={e => setDraft(e.target.value)} maxLength={180} disabled={phase !== "idle"}/><Button className="dispatch-button" type="submit" disabled={!draft.trim() || phase !== "idle"}>{phase === "planning" ? "CHOOSING" : "DISPATCH"} <Send size={14}/></Button></div>{planningError && <p className="planning-error" role="alert">{planningError}</p>}<div className="form-foot"><span>DIRECTIVES ARE ROUTED THROUGH OZ</span><span>↵ TO SEND</span></div></form>
        <div className="roster-heading"><div className="section-label"><span className="section-symbol">✦</span> THE CREW <span className="label-count">/ {String(crew.length).padStart(2, "0")}</span></div><span className="roster-hint">SELECT AN AGENT TO INSPECT <ArrowDownRight size={14}/></span></div>
        <div className="crew-grid">{crew.map(agent => { const Icon = agent.icon; return <Button key={agent.name} variant="ghost" type="button" onClick={() => setSelected(agent.name)} className={`crew-item ${selected === agent.name ? "selected" : ""}`}><span className="crew-portrait"><img src={agent.image} alt="" /></span><span className="crew-info"><span className="crew-name">{agent.name} <Icon size={13}/></span><span className="crew-role">{agent.role}</span><span className="crew-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]} <span>· {prologue === "off" ? agent.place : "Exploring"}</span></span></span><ChevronRight className="crew-arrow" size={16}/></Button> })}</div>
      </div>
      <aside className="intel-panel"><div className="intel-top"><div className="intel-heading"><span><Activity size={17}/> MISSION CONTROL</span><span className="panel-id">PANEL_01</span></div><div className="intel-subhead">REAL-TIME OPERATIONAL OVERVIEW</div><FieldCodex pages={codexPages} logs={codexLogs} visited={visitedZones} currentZone={zoneId} recorded={codexRecorded} stage={prologue === "off" ? 3 : prologue === "walk" ? 2 : Math.max(0, (parseInt(scene.chapter.replace(/\D+/, ""), 10) || 1) - 1)}/></div>
        <section className="intel-section current-section"><div className="panel-section-heading"><span><span className="section-square"/> CURRENT DIRECTIVE</span><span className="section-number">01 / 03</span></div>{active && (active.state !== "Complete" || finishedId === active.id) ? <div className={`current-task ${active.state === "Complete" ? "is-complete" : ""}`}><div className="task-status-line"><span className="task-state">{active.state === "Complete" ? <Check size={12}/> : <span className="live-dot"/>}{active.state.toUpperCase()}</span><span>#{String(active.id).slice(-4)}</span></div><p>{active.text}</p><div className="assigned-row"><span>{active.state === "Complete" ? "COMPLETED BY" : "ASSIGNED TO"}</span><span className="assigned-agent"><img src={crew.find(a => a.name === (assigned ?? active.agent))?.image ?? ozPortrait.url} alt=""/>{assigned ?? active.agent}{active.state === "Complete" ? <Check size={12}/> : <ArrowRight size={12}/>}</span></div><div className="assignment-reason"><strong>ROUTE · {active.route.map((a, i) => i < active.steps.length ? `${a.toUpperCase()} ✓` : i === active.steps.length && active.state !== "Complete" ? `[${a.toUpperCase()}]` : a.toUpperCase()).join(" → ")}</strong><span>{active.reason} · ZONE: {ZONES[active.zone].short}</span></div><div className="task-progress stages-7">{TASK_STAGES.map((s, i) => <span key={s} className={i <= (active.state === "Complete" ? 6 : taskStage) ? "lit" : ""}/>)}</div><div className="progress-labels stage-now"><span>STAGE {(active.state === "Complete" ? 6 : taskStage) + 1}/7</span><span>{TASK_STAGES[active.state === "Complete" ? 6 : taskStage]}</span></div>{active.steps.filter(st => st.change).map((st, i) => <div className="world-change-line" key={i}>✦ {st.change!.name.toUpperCase()} · {st.change!.from} → {st.change!.to}</div>)}</div> : <div className="empty-directive"><div className="empty-orbit"><Command size={25}/></div><strong>{phase === "planning" ? "CHOOSING CREW" : "AWAITING DIRECTIVE"}</strong><span>{phase === "planning" ? "Oz is reviewing the job." : "The crew is standing by."}</span><div className="empty-line"/></div>}</section>
        {prologue === "off" && <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> WORLD STATE · {zone.short}</span><span className="section-number">{WORLD_OBJECTS.filter(o => o.zone === zoneId && (world.levels[o.id] ?? 0) > 0).length}/{WORLD_OBJECTS.filter(o => o.zone === zoneId).length}</span></div><div className="world-state-list">{WORLD_OBJECTS.filter(o => o.zone === zoneId).map(o => { const lvl = world.levels[o.id] ?? 0; return <div key={o.id} className={`world-state-row level-${lvl}`}><span>{o.name}<small>{o.agent.toUpperCase()}</small></span><b>{o.states[lvl]}</b></div>; })}</div></section>}
        <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> TASK HISTORY</span><span className="section-number">{String(missions.length).padStart(2,"0")}</span></div>{missions.length ? <div className="history-list">{missions.map(m => <div className="history-item" key={m.id}><span className={`history-icon ${m.state === "Complete" ? "done" : ""}`}>{m.state === "Complete" ? <Check size={13}/> : <ArrowRight size={13}/>}</span><div><strong>{m.text}</strong><small>{m.route.join(" → ")} · {ZONES[m.zone].short} · {m.time}</small><small>{m.reason}</small>{m.error && <small className="planning-error">{m.error}</small>}{m.steps.slice(0, m.done).map((st, i) => <div className="task-result" key={i}><b>{st.agent.toUpperCase()} · {i > 0 && i === m.steps.length - 1 && st.agent === "Oz" && m.state === "Complete" ? "FINAL REVIEW" : st.verdict === "conflict" ? "CANON CONFLICT" : "RESULT"}</b>{st.change && <small className="world-change-line">✦ {st.change.name} · {st.change.from} → {st.change.to}{st.change.discovery ? " · CODEX UPDATED" : ""}</small>}<p>{st.result}</p></div>)}</div><span className="history-state">{m.state === "Complete" ? "DONE" : m.state === "Routing" ? "ROUTING" : m.state === "Handoff" ? "HANDOFF" : "ACTIVE"}</span></div>)}</div> : <div className="empty-list">NO MISSIONS LOGGED YET <span>— 00</span></div>}</section>
        <section className="intel-section activity-section"><div className="panel-section-heading"><span><span className="section-square"/> ACTIVITY LOG</span><Radio size={13} className="radio-icon"/></div><div className="activity-list">{logs.slice(0, 6).map(entry => <div className="activity-item" key={entry.id}><span className="activity-node"/><div><span className="activity-agent">{entry.agent}</span><span className="activity-text">{entry.text}</span><small>{entry.time}</small></div></div>)}</div></section>
        <div className="intel-bottom"><Cpu size={15}/> ZYGORIA SYSTEMS <span>AI ROUTING LIVE</span></div>
      </aside>
    </main>
    <div className="creator-dock"><CreatorCredit /></div>
    <footer className="app-footer"><span>© ZYGORIA // COMMAND CENTRE</span><span>WORLD STATE: SIMULATED <span className="footer-cross">✦</span> BUILD 0.1.0</span></footer>
  </div>;
}
