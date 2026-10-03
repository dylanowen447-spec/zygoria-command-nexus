import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowRight, Check, ChevronRight, CircleDot, Command, Cpu, Crosshair, Hexagon, MapPin, Radio, Send, Signal, Sparkles, Terminal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { ShackRadio } from "@/components/ShackRadio";
import { chooseJobRoute, getCanonState, runCrewStep } from "@/lib/job-planning.functions";
import { ZONES, ZONE_LIST, HOME, toMeet, toHome, trailPoints, type Agent, type Point, type ZoneId } from "@/lib/zones";
import { findGroupPlan, findUserCommand, GROUP_OFFSETS } from "@/lib/group-plans";
import ozPortrait from "@/assets/oz.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";
import moxiUnderTree from "@/assets/moxi-under-tree.webp.asset.json";
import ozWordmark from "@/assets/oz-wordmark.png.asset.json";
import brixWordmark from "@/assets/brix-wordmark.png.asset.json";
import lowkeyWordmark from "@/assets/lowkey-wordmark.png.asset.json";
import { FieldCodex } from "@/components/FieldCodex";
import { EMPTY_STORY, SANCTUARY_SIGNAL, STORY_KEY, chapterDone, lastBeat, lockedZones, nextBeat, type StoryBeat, type StoryState } from "@/lib/story";
import { WelcomeGuide } from "@/components/WelcomeGuide";
import { CreatorCredit } from "@/components/CreatorCredit";
import shackDefinition from "@/assets/sanctuary-shack-definition.png";
import { WORLD_OBJECTS, WORLD_KEY, EMPTY_WORLD, applyAction, chooseVerb, objectFor, objectPoint, type WorldChange, type WorldState } from "@/lib/world-state";

const TASK_STAGES = ["TASK RECEIVED", "ASSIGNED", "MOVING TO SITE", "PERFORMING ACTION", "WORLD CHANGED", "PASSING ON", "COMPLETE"];
type Status = "Idle" | "Thinking" | "Working" | "Waiting";
type Stop = "home" | "central";
type Step = { agent: Agent; activity: string; result: string; verdict: "pass" | "conflict" | "n/a"; change?: WorldChange };
type Mission = { id: number; text: string; agent: Agent; reason: string; route: Agent[]; zone: ZoneId; group: boolean; steps: Step[]; done: number; error?: string; state: "Routing" | "Handoff" | "In progress" | "Complete"; time: string };
type Log = { id: number; agent: Agent; text: string; time: string };
const agents: { name: Agent; role: string; place: string; image: string; icon: typeof Sparkles }[] = [
  { name: "Oz", role: "Coordinator / creative lead", place: "Riverside shack", image: ozPortrait.url, icon: Sparkles },
  { name: "Brix", role: "Builder / technical", place: "Workshop / garage", image: brixPortrait.url, icon: Wrench },
  { name: "Lowkey", role: "Lore / research", place: "The wilds", image: lowkeyPortrait.url, icon: Crosshair },
];
const startLogs: Log[] = [
  { id: 1, agent: "Oz", text: "Command link established.", time: "SYSTEM" },
  { id: 2, agent: "Brix", text: "Workshop systems online.", time: "SYSTEM" },
  { id: 3, agent: "Lowkey", text: "Perimeter is clear.", time: "SYSTEM" },
];
const WALK_SPEED = 5.5; // percent of world width per second
const depthFor = (y: number) => (1 - Math.min(Math.max((64 - y) / 22, 0), 1) * 0.12).toFixed(3);
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / ZONES.sanctuary.aspect);
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Where each sprite's hand sits relative to its feet, in px (facing right). */
const HAND: Record<Agent, { x: number; y: number }> = { Oz: { x: 8, y: -14 }, Lowkey: { x: 9, y: -16 }, Brix: { x: 12, y: -19 } };

/** Short in-character exchanges for idle visits: [visitor line, host reply]. */
const IDLE_CHATS: Record<string, [string, string][]> = {
  "Oz>Brix": [["Got any spare wire? Asking for a speaker. Totally not the one I blew.", "That's the third one, Oz."], ["What's this do?", "Don't touch that."], ["Reckon I could fly with this?", "No. Put it down."]],
  "Brix>Oz": [["Your bass rattled two bolts loose in my bench.", "So the music's working then."], ["Who wired this lamp? It's held on with hope.", "Hope and a bit of string, mate."], ["Just checking the shack's still standing.", "Course it is. Mostly."]],
  "Lowkey>Oz": [["The lights by the river flickered last night. Twice.", "Spooky. Love it."], ["Saw you from the ridge. You were dancing.", "...Training, that was."], ["Quiet up there tonight.", "Quiet's boring. Stay for a tune."]],
  "Lowkey>Brix": [["Something's humming under the ruins.", "Humming how? Electrical or creepy?"], ["Your workshop glows from the ridge.", "That'll be the bad wiring."], ["The moon looked different tonight.", "The moon doesn't change, Lowkey. ...Does it?"]],
  "Oz>Lowkey": [["Made it to the top! Barely. Why's it so high?", "It's a mountain."], ["What are you looking at?", "Everything."], ["Bet I can see my shack from here.", "You can. You left the lamp on."]],
  "Brix>Lowkey": [["Climbed all this way to check the view's still working.", "It is."], ["Anything out there I should worry about?", "Not yet."], ["Wind's strong. You'll want a windbreak up here.", "I like the wind."]],
};

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
  const [positions, setPositions] = useState<Record<Agent, Stop>>({ Oz: "home", Brix: "home", Lowkey: "home" });
  const [walking, setWalking] = useState<Agent[]>([]);
  const [facing, setFacing] = useState<Record<Agent, "left" | "right">>({ Oz: "right", Brix: "left", Lowkey: "left" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frames = useRef<number[]>([]);
  const runId = useRef(0);
  const [zoneId, setZoneId] = useState<ZoneId>("sanctuary");
  const zoneRef = useRef<ZoneId>("sanctuary");
  zoneRef.current = zoneId;
  const zone = ZONES[zoneId];
  const coords = useRef<Record<ZoneId, Record<Agent, Point>>>(Object.fromEntries(ZONE_LIST.map(z => [z.id, { Oz: { ...HOME(z, "Oz") }, Brix: { ...HOME(z, "Brix") }, Lowkey: { ...HOME(z, "Lowkey") } }])) as Record<ZoneId, Record<Agent, Point>>);
  const markerRefs = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const [current, setCurrent] = useState<Agent | null>(null);
  const [finishedId, setFinishedId] = useState<number | null>(null);
  const [taskStage, setTaskStage] = useState(0);
  const [world, setWorld] = useState<WorldState>(EMPTY_WORLD);
  const worldRef = useRef<WorldState>(EMPTY_WORLD);
  const [acting, setActing] = useState<string | null>(null);
  const [changed, setChanged] = useState<string | null>(null);
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
  const statuses: Record<Agent, Status> = { Oz: statusFor("Oz"), Brix: statusFor("Brix"), Lowkey: statusFor("Lowkey") };
  useEffect(() => () => { runId.current++; timers.current.forEach(clearTimeout); frames.current.forEach(cancelAnimationFrame); }, []);
  const markerStyle = (agent: Agent) => ({ left: `${coords.current[zoneId][agent].x}%`, top: `${coords.current[zoneId][agent].y}%`, "--depth": depthFor(coords.current[zoneId][agent].y), zIndex: 10 + Math.round(coords.current[zoneId][agent].y * 10) }) as CSSProperties;
  function paint(agent: Agent) {
    const el = markerRefs.current[agent];
    if (!el) return;
    const p = coords.current[zoneRef.current][agent];
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;
    el.style.setProperty("--depth", depthFor(p.y));
    // Whoever stands lower on the ground draws in front, so nobody vanishes behind another Zig.
    el.style.setProperty("z-index", String(10 + Math.round(p.y * 10)), "important");
    if (agent === "Lowkey" && zoneRef.current === "sanctuary") el.classList.toggle("on-ridge", p.y < 34);
  }
  const wait = (ms: number) => new Promise<void>(resolve => { timers.current.push(setTimeout(resolve, ms)); });
  const routeTime = (agent: Agent, targets: Point[]) => {
    let from = coords.current[zoneRef.current][agent], total = 0;
    for (const to of targets) { total += distance(from, to); from = to; }
    return total / WALK_SPEED;
  };
  /** Moves a character along walkable path nodes frame by frame; the walk cycle loops only while this runs. */
  function walk(agent: Agent, targets: Point[], end: Stop, run: number) {
    return new Promise<void>(resolve => {
      const face = (target: Point) => {
        const dx = target.x - coords.current[zoneRef.current][agent].x;
        if (Math.abs(dx) < 0.3) return;
        const dir = dx < 0 ? "left" as const : "right" as const;
        setFacing(prev => prev[agent] === dir ? prev : { ...prev, [agent]: dir });
      };
      const finish = () => {
        setWalking(prev => prev.filter(a => a !== agent));
        setPositions(prev => ({ ...prev, [agent]: end }));
        resolve();
      };
      face(targets[0]!);
      setWalking(prev => prev.includes(agent) ? prev : [...prev, agent]);
      let segment = 0;
      let last = performance.now();
      const step = (time: number) => {
        if (run !== runId.current) return;
        let budget = Math.min(time - last, 64) / 1000 * WALK_SPEED;
        last = time;
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
  const spots = useRef<Record<ZoneId, Record<Agent, Spot>>>(Object.fromEntries(ZONE_LIST.map(z => [z.id, { Oz: "home", Brix: "home", Lowkey: "home" }])) as Record<ZoneId, Record<Agent, Spot>>);
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
    const call = runCrewStep({ data: { directive, agent, previous: previous.map(p => ({ agent: p.agent, result: p.result })), finalReview, group, story: storyNote.current } });
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
      [output] = await Promise.all([call, staysPut ? Promise.resolve() : goTo(agent, "work", run)]);
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
    await wait(800);
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
      setPositions({ Oz: "home", Brix: "home", Lowkey: "home" });
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
    if (beat && done.length) await playBeat(beat, run);
    if (run !== runId.current) return;
    setMission(id, () => ({ state: "Complete", done: done.length }));
    setTaskStage(6);
    setCurrent(null);
    setPhase("idle");
    setFinishedId(id);
    const changes = done.filter(s => s.change).length;
    log(done.at(-1)?.agent ?? "Oz", `Directive complete — ${changes} world change${changes === 1 ? "" : "s"} made. ${missionZone === "sanctuary" ? "Standing by." : "Heading back to the Sanctuary."}`);
    await Promise.all((["Oz", "Brix", "Lowkey"] as Agent[]).map(a => goTo(a, "home", run)));
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
  function log(agent: Agent, text: string) {
    setLogs(prev => [{ id: Date.now() + Math.random(), agent, text, time: now() }, ...prev].slice(0, 12));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "idle") return;
    cancelVisit();
    setPlanningError("");
    const order = zoneRef.current === "sanctuary" ? findUserCommand(text) : null;
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
  function cancelVisit() {
    const v = visiting.current;
    visiting.current = null;
    setBubble(null);
    if (outing.current.length) {
      const back = outing.current; outing.current = [];
      runId.current++;
      for (const a of back) { coords.current.sanctuary[a] = { ...HOME(ZONES.sanctuary, a) }; spots.current.sanctuary[a] = "home"; paint(a); }
      setWalking([]);
      setPositions({ Oz: "home", Brix: "home", Lowkey: "home" });
    }
    if (!v) return;
    runId.current++;
    const z = ZONES.sanctuary;
    coords.current.sanctuary[v] = { ...HOME(z, v) };
    spots.current.sanctuary[v] = "home";
    setPositions(prev => ({ ...prev, [v]: "home" }));
    paint(v);
  }
  useEffect(() => {
    if (phase !== "idle" || zoneId !== "sanctuary") return;
    let alive = true;
    const loop = async () => {
      while (alive) {
        await wait(22000 + Math.random() * 20000);
        if (!alive || phaseRef.current !== "idle" || zoneRef.current !== "sanctuary" || visiting.current || outing.current.length) continue;
        const z = ZONES.sanctuary, all: Agent[] = ["Oz", "Brix", "Lowkey"];
        const v = all[Math.floor(Math.random() * 3)]!;
        const others = all.filter(a => a !== v);
        const h = others[Math.floor(Math.random() * 2)]!;
        const run = runId.current;
        visiting.current = v;
        const there = [...toMeet(z, v), ...toHome(z, h).slice(0, -2)];
        log(v, `Wandering over to see ${h}.`);
        await walk(v, there, "central", run);
        if (run !== runId.current || !alive) return;
        const hx = HOME(z, h).x, vx = coords.current.sanctuary[v].x;
        setFacing(p => ({ ...p, [v]: hx < vx ? "left" : "right", [h]: hx < vx ? "right" : "left" }));
        let [a, b] = IDLE_CHATS[`${v}>${h}`]![Math.floor(Math.random() * 3)]!;
        const clues = SANCTUARY_SIGNAL.idle[lastBeat(SANCTUARY_SIGNAL, storyRef.current)]?.filter(c => c.pair[0] === v && c.pair[1] === h) ?? [];
        if (clues.length && Math.random() < 0.6) [a, b] = clues[Math.floor(Math.random() * clues.length)]!.lines;
        if (v === "Lowkey" && !storyRef.current.beats.length && !clues.length && Math.random() < 0.5) [a, b] = ["Something keeps flashing past the river.", "Probably nothing. …Probably."];
        setBubble({ agent: v, text: a }); log(v, a);
        await wait(3200); if (run !== runId.current) return;
        setBubble({ agent: h, text: b }); log(h, b);
        await wait(3200); if (run !== runId.current) return;
        setBubble(null);
        await walk(v, [...there.slice(0, -1).reverse(), HOME(z, v)], "home", run);
        if (run !== runId.current) return;
        visiting.current = null;
      }
    };
    void loop();
    return () => { alive = false; };
  }, [phase, zoneId]);
  const visitedZones = useMemo(() => [...new Set<ZoneId>([zoneId, ...missions.map(m => m.zone)])], [zoneId, missions]);
  const codexPages = useMemo(() => {
    const c = SANCTUARY_SIGNAL.codex, done = chapterDone(SANCTUARY_SIGNAL, story);
    const page = done ? { ...c, category: "Old Earth discoveries" as const, level: "known" as const } : { id: c.id, category: "Old Earth discoveries" as const, name: "Unrecorded", description: "Something out past the river. We haven't worked out what yet.", location: null, recordedBy: null, level: "hidden" as const };
    return [...canon.codexPages.filter(p => p.id !== c.id), page];
  }, [canon.codexPages, story]);
  const codexRecorded = useMemo(() => chapterDone(SANCTUARY_SIGNAL, story) ? [...world.discoveries, SANCTUARY_SIGNAL.codex.id] : world.discoveries, [world.discoveries, story]);
  const codexLogs = useMemo(() => missions.map(m => ({ text: m.text, zone: m.zone, done: m.state === "Complete", results: m.steps.map(st => st.result).join(" ") })), [missions]);
  function selectZone(z: ZoneId) {
    if (phase !== "idle" || z === zoneId) return;
    setZoneId(z);
    setPositions({ Oz: "home", Brix: "home", Lowkey: "home" });
    setWalking([]);
  }
  return <div className="command-app">
    <header className="command-header">
      <div className="brand-lockup"><div className="brand-mark"><Hexagon size={25} strokeWidth={1.5}/><span>Z</span></div><div className="brand-copy"><div className="brand-title">ZYGORIA<span className="brand-tm">™</span></div><div className="brand-subtitle"><span className="brand-subtitle-rule"/>FIRST GENESIS<span className="brand-subtitle-rule"/></div></div></div>
      <div className="header-right"><ShackRadio trigger={radioKick}/><div className="live-indicator"><span className="live-dot"/> WORLD ONLINE</div><div className="header-divider"/><div className="header-coordinate"><Signal size={14}/> 47° N / 09° E</div><div className="header-avatar">Z</div></div>
    </header>
    <main className="command-layout">
      <div className="world-column">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> LIVE WORLD FEED <span className="eyebrow-line"/></div><h1>{zone.title[0]}<span>{zone.title[1]}</span></h1><p>{zone.sub}</p></div><div className="world-index"><CircleDot size={14}/> {zone.indexA} <span> / </span> {zone.indexB}</div></div>
        <div className="zone-selector" role="group" aria-label="Zygoria zones"><span className="stage-chip" title={canon.stageSummary}>{canon.stage}</span>{ZONE_LIST.filter(z => canon.unlockedZones.includes(z.id) && !lockedZones(story).includes(z.id)).map(z => <button key={z.id} type="button" className={`zone-chip ${z.id === zoneId ? "is-active" : ""}`} disabled={phase !== "idle"} onClick={() => selectZone(z.id)}><span className="zone-dot"/>{z.chip}</button>)}</div>
        <div className="world-frame">
          <div className={`world-image-wrap ${scannerEvent ? "scanner-event" : ""}`} style={{ "--zone-aspect": String(zone.aspect) } as CSSProperties}><img key={zoneId} className="world-image" src={zone.img} width={1520} height={1024} loading={zone.id === "sanctuary" ? undefined : "lazy"} alt={zone.alt} />
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
              <img className="moxi-scenery" src={moxiUnderTree.url} alt="Moxi, a tiny dragon peeking over rocks beneath the evergreen near Brix's workshop" draggable={false} />
              <div className="location-tag central-tag"><span className="location-line"/> CROSSROADS</div>
            </>}
            {zone.id !== "sanctuary" && zone.tags.map(t => <div key={t.label} className="location-tag zone-tag" style={{ left: `${t.x}%`, top: `${t.y}%` }}><span className="location-line"/> {t.label}</div>)}
            <div className="world-stage">
            <svg className="world-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={trailPoints(zone, "Oz")}/><polyline points={trailPoints(zone, "Brix")}/><polyline points={trailPoints(zone, "Lowkey")}/></svg>
            {WORLD_OBJECTS.filter(o => o.zone === zoneId).map(o => { const p = objectPoint(o), lvl = world.levels[o.id] ?? 0; return <div key={o.id} className={`world-object wo-${o.agent.toLowerCase()} level-${lvl} ${lvl === o.states.length - 1 ? "is-max" : ""} ${acting === o.id ? "is-acting" : ""} ${changed === o.id ? "just-changed" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-label={`${o.name}: ${o.states[lvl]}`}><span className="wo-ring"/><span className="wo-label">{o.name} · {o.states[lvl]}</span></div>; })}
            <div ref={taskIconRef} className="task-energy" aria-hidden="true"><span/></div>
            {agents.map(agent => <Button key={agent.name} ref={el => { markerRefs.current[agent.name] = el; }} style={markerStyle(agent.name)} type="button" variant="ghost" title={`View ${agent.name}`} aria-label={`View ${agent.name}, ${statuses[agent.name]}${walking.includes(agent.name) ? ", walking" : ""}`} onClick={() => setSelected(agent.name)} className={`agent-marker marker-${agent.name.toLowerCase()} at-${positions[agent.name]} facing-${facing[agent.name]} ${selected === agent.name ? "is-selected" : ""} ${statuses[agent.name] !== "Idle" ? "is-active" : ""} ${walking.includes(agent.name) ? "is-walking" : ""} ${statuses[agent.name] === "Working" || statuses[agent.name] === "Thinking" && !walking.includes(agent.name) ? "is-thinking" : ""}`}>
              <span className="marker-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]}</span>{bubble?.agent === agent.name && <span className="idle-bubble">{bubble.text}</span>}<span className="sprite-stage"><CharacterSprite character={agent.name}/></span><span className="marker-name">{agent.name === "Oz" ? <img className="oz-wordmark" src={ozWordmark.url} alt="Oz" draggable={false} /> : agent.name === "Brix" ? <img className="brix-wordmark" src={brixWordmark.url} alt="Brix" draggable={false} /> : <img className="lowkey-wordmark" src={lowkeyWordmark.url} alt="Lowkey" draggable={false} />}</span>
            </Button>)}
            </div>
            <div className="map-coordinate bottom-left"><MapPin size={12}/> {zone.bottom}</div><div className="map-coordinate bottom-right">ZOOM 01 : 01 <span className="zoom-bars">▮▮▮▯</span></div>
          </div>
          <WelcomeGuide />
          <div className="world-footer"><span><span className="live-dot"/> ALL SYSTEMS OPERATIONAL</span><span>3 AGENTS CONNECTED <span className="footer-cross">✦</span> 1 SANCTUARY</span><span className="creator-credit">Created by <span className="creator-signature">Dylan Owen</span><span className="creator-year">· 2026</span></span></div>
        </div>
        <form className="mission-form" onSubmit={submit}><div className="form-title"><span><Terminal size={16}/> NEW DIRECTIVE</span><span className="form-counter">{phase === "idle" ? "READY FOR INPUT" : phase === "planning" ? "SELECTING CREW" : "MISSION IN PROGRESS"}</span></div><div className="form-row"><span className="prompt-chevron">›</span><input aria-label="Enter a job for the crew" placeholder="What needs doing around Zygoria?" value={draft} onChange={e => setDraft(e.target.value)} maxLength={180} disabled={phase !== "idle"}/><Button className="dispatch-button" type="submit" disabled={!draft.trim() || phase !== "idle"}>{phase === "planning" ? "CHOOSING" : "DISPATCH"} <Send size={14}/></Button></div>{planningError && <p className="planning-error" role="alert">{planningError}</p>}<div className="form-foot"><span>DIRECTIVES ARE ROUTED THROUGH OZ</span><span>↵ TO SEND</span></div></form>
        <div className="roster-heading"><div className="section-label"><span className="section-symbol">✦</span> THE CREW <span className="label-count">/ 03</span></div><span className="roster-hint">SELECT AN AGENT TO INSPECT <ArrowDownRight size={14}/></span></div>
        <div className="crew-grid">{agents.map(agent => { const Icon = agent.icon; return <Button key={agent.name} variant="ghost" type="button" onClick={() => setSelected(agent.name)} className={`crew-item ${selected === agent.name ? "selected" : ""}`}><span className="crew-portrait"><img src={agent.image} alt="" /></span><span className="crew-info"><span className="crew-name">{agent.name} <Icon size={13}/></span><span className="crew-role">{agent.role}</span><span className="crew-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]} <span>· {agent.place}</span></span></span><ChevronRight className="crew-arrow" size={16}/></Button> })}</div>
      </div>
      <aside className="intel-panel"><div className="intel-top"><div className="intel-heading"><span><Activity size={17}/> MISSION CONTROL</span><span className="panel-id">PANEL_01</span></div><div className="intel-subhead">REAL-TIME OPERATIONAL OVERVIEW</div><FieldCodex pages={codexPages} logs={codexLogs} visited={visitedZones} currentZone={zoneId} recorded={codexRecorded}/></div>
        <section className="intel-section current-section"><div className="panel-section-heading"><span><span className="section-square"/> CURRENT DIRECTIVE</span><span className="section-number">01 / 03</span></div>{active && (active.state !== "Complete" || finishedId === active.id) ? <div className={`current-task ${active.state === "Complete" ? "is-complete" : ""}`}><div className="task-status-line"><span className="task-state">{active.state === "Complete" ? <Check size={12}/> : <span className="live-dot"/>}{active.state.toUpperCase()}</span><span>#{String(active.id).slice(-4)}</span></div><p>{active.text}</p><div className="assigned-row"><span>{active.state === "Complete" ? "COMPLETED BY" : "ASSIGNED TO"}</span><span className="assigned-agent"><img src={agents.find(a => a.name === (assigned ?? active.agent))?.image ?? ozPortrait.url} alt=""/>{assigned ?? active.agent}{active.state === "Complete" ? <Check size={12}/> : <ArrowRight size={12}/>}</span></div><div className="assignment-reason"><strong>ROUTE · {active.route.map((a, i) => i < active.steps.length ? `${a.toUpperCase()} ✓` : i === active.steps.length && active.state !== "Complete" ? `[${a.toUpperCase()}]` : a.toUpperCase()).join(" → ")}</strong><span>{active.reason} · ZONE: {ZONES[active.zone].short}</span></div><div className="task-progress stages-7">{TASK_STAGES.map((s, i) => <span key={s} className={i <= (active.state === "Complete" ? 6 : taskStage) ? "lit" : ""}/>)}</div><div className="progress-labels stage-now"><span>STAGE {(active.state === "Complete" ? 6 : taskStage) + 1}/7</span><span>{TASK_STAGES[active.state === "Complete" ? 6 : taskStage]}</span></div>{active.steps.filter(st => st.change).map((st, i) => <div className="world-change-line" key={i}>✦ {st.change!.name.toUpperCase()} · {st.change!.from} → {st.change!.to}</div>)}</div> : <div className="empty-directive"><div className="empty-orbit"><Command size={25}/></div><strong>{phase === "planning" ? "CHOOSING CREW" : "AWAITING DIRECTIVE"}</strong><span>{phase === "planning" ? "Oz is reviewing the job." : "The crew is standing by."}</span><div className="empty-line"/></div>}</section>
        <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> WORLD STATE · {zone.short}</span><span className="section-number">{WORLD_OBJECTS.filter(o => o.zone === zoneId && (world.levels[o.id] ?? 0) > 0).length}/3</span></div><div className="world-state-list">{WORLD_OBJECTS.filter(o => o.zone === zoneId).map(o => { const lvl = world.levels[o.id] ?? 0; return <div key={o.id} className={`world-state-row level-${lvl}`}><span>{o.name}<small>{o.agent.toUpperCase()}</small></span><b>{o.states[lvl]}</b></div>; })}</div></section>
        <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> TASK HISTORY</span><span className="section-number">{String(missions.length).padStart(2,"0")}</span></div>{missions.length ? <div className="history-list">{missions.map(m => <div className="history-item" key={m.id}><span className={`history-icon ${m.state === "Complete" ? "done" : ""}`}>{m.state === "Complete" ? <Check size={13}/> : <ArrowRight size={13}/>}</span><div><strong>{m.text}</strong><small>{m.route.join(" → ")} · {ZONES[m.zone].short} · {m.time}</small><small>{m.reason}</small>{m.error && <small className="planning-error">{m.error}</small>}{m.steps.slice(0, m.done).map((st, i) => <div className="task-result" key={i}><b>{st.agent.toUpperCase()} · {i > 0 && i === m.steps.length - 1 && st.agent === "Oz" && m.state === "Complete" ? "FINAL REVIEW" : st.verdict === "conflict" ? "CANON CONFLICT" : "RESULT"}</b>{st.change && <small className="world-change-line">✦ {st.change.name} · {st.change.from} → {st.change.to}{st.change.discovery ? " · CODEX UPDATED" : ""}</small>}<p>{st.result}</p></div>)}</div><span className="history-state">{m.state === "Complete" ? "DONE" : m.state === "Routing" ? "ROUTING" : m.state === "Handoff" ? "HANDOFF" : "ACTIVE"}</span></div>)}</div> : <div className="empty-list">NO MISSIONS LOGGED YET <span>— 00</span></div>}</section>
        <section className="intel-section activity-section"><div className="panel-section-heading"><span><span className="section-square"/> ACTIVITY LOG</span><Radio size={13} className="radio-icon"/></div><div className="activity-list">{logs.slice(0, 6).map(entry => <div className="activity-item" key={entry.id}><span className="activity-node"/><div><span className="activity-agent">{entry.agent}</span><span className="activity-text">{entry.text}</span><small>{entry.time}</small></div></div>)}</div></section>
        <div className="intel-bottom"><Cpu size={15}/> ZYGORIA SYSTEMS <span>AI ROUTING LIVE</span></div>
      </aside>
    </main>
    <div className="creator-dock"><CreatorCredit /></div>
    <footer className="app-footer"><span>© ZYGORIA // COMMAND CENTRE</span><span>WORLD STATE: SIMULATED <span className="footer-cross">✦</span> BUILD 0.1.0</span></footer>
  </div>;
}
