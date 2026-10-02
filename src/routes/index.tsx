import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowRight, Check, ChevronRight, CircleDot, Command, Cpu, Crosshair, Hexagon, MapPin, Radio, Send, Signal, Sparkles, Terminal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { chooseJobRoute, runCrewStep } from "@/lib/job-planning.functions";
import world from "@/assets/zygoria-world-shack-speakers2.png";
import ozPortrait from "@/assets/oz.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";
import moxiUnderTree from "@/assets/moxi-under-tree.webp.asset.json";
import ozWordmark from "@/assets/oz-wordmark.png.asset.json";
import brixWordmark from "@/assets/brix-wordmark.png.asset.json";
import lowkeyWordmark from "@/assets/lowkey-wordmark.png.asset.json";

type Agent = "Oz" | "Brix" | "Lowkey";
type Status = "Idle" | "Thinking" | "Working" | "Waiting";
type Stop = "home" | "central";
type Step = { agent: Agent; activity: string; result: string; verdict: "pass" | "conflict" | "n/a" };
type Mission = { id: number; text: string; agent: Agent; reason: string; route: Agent[]; steps: Step[]; done: number; error?: string; state: "Routing" | "Handoff" | "In progress" | "Complete"; time: string };
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
type Point = { x: number; y: number };
/** Aspect ratio of the Sanctuary artwork; markers live in a layer locked to the image, so these coordinates are image percentages. */
const WORLD_ASPECT = 1264 / 848;
const WALK_SPEED = 5.5; // percent of world width per second
/**
 * Walkable route for each character, from their home spot to the crossroads meeting point.
 * Every node sits on a visible track or open ground in the artwork, clear of fences, buildings and props.
 */
const PATHS: Record<Agent, Point[]> = {
  // Open ground right of the shack (clear of the building and its lantern light) → glowing lower trail → crossroads
  Oz: [{ x: 26, y: 63 }, { x: 30.5, y: 60.8 }, { x: 35, y: 60.3 }, { x: 40, y: 60 }, { x: 46, y: 59.6 }],
  // Workshop yard (left of the building, clear of scrap piles) → lower glowing trail → crossroads
  Brix: [{ x: 63, y: 56.4 }, { x: 60, y: 57.1 }, { x: 56.5, y: 58 }, { x: 53, y: 58.7 }],
  // Open plateau track right of the treeline (flat, clear of the pines) → down the open grass east of the lone pine → crossroads
  Lowkey: [{ x: 47.5, y: 41 }, { x: 50, y: 43.5 }, { x: 50.7, y: 47 }, { x: 50.5, y: 54 }, { x: 53, y: 58.7 }],
};
/** Work spots reached from home along open ground: Brix up the glowing trail to the workshop entrance, Lowkey up the plateau track toward the lookout. */
const WORK: Partial<Record<Agent, Point[]>> = {
  Brix: [{ x: 67.5, y: 54.6 }, { x: 71, y: 52.8 }],
  Lowkey: [{ x: 50.5, y: 39 }, { x: 53.5, y: 38 }],
};
const HOME = (agent: Agent) => PATHS[agent][0]!;
const toMeet = (agent: Agent) => PATHS[agent].slice(1);
const toHome = (agent: Agent) => PATHS[agent].slice(0, -1).reverse();
const trailPoints = (agent: Agent) => [...(WORK[agent] ?? []).slice().reverse(), ...PATHS[agent]].map(p => `${p.x},${p.y}`).join(" ");
const depthFor = (y: number) => (1 - Math.min(Math.max((64 - y) / 22, 0), 1) * 0.12).toFixed(3);
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / WORLD_ASPECT);
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

/** Where each sprite's hand sits relative to its feet, in px (facing right). */
const HAND: Record<Agent, { x: number; y: number }> = { Oz: { x: 8, y: -14 }, Lowkey: { x: 9, y: -16 }, Brix: { x: 12, y: -19 } };

export const Route = createFileRoute("/")({
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
  const coords = useRef<Record<Agent, Point>>({ Oz: { ...HOME("Oz") }, Brix: { ...HOME("Brix") }, Lowkey: { ...HOME("Lowkey") } });
  const markerRefs = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const [current, setCurrent] = useState<Agent | null>(null);
  const [finishedId, setFinishedId] = useState<number | null>(null);
  const active = missions[0];
  const assigned = active && active.state !== "Complete" ? current : null;
  // Only the task owner is active: walking = Working (travelling), stationary = Thinking pose; everyone else is Idle.
  const statusFor = (a: Agent): Status => phase === "planning" && a === "Oz" ? "Thinking" : current === a && phase !== "idle" ? walking.includes(a) ? "Working" : "Thinking" : "Idle";
  const statuses: Record<Agent, Status> = { Oz: statusFor("Oz"), Brix: statusFor("Brix"), Lowkey: statusFor("Lowkey") };
  useEffect(() => () => { runId.current++; timers.current.forEach(clearTimeout); frames.current.forEach(cancelAnimationFrame); }, []);
  const markerStyle = (agent: Agent) => ({ left: `${coords.current[agent].x}%`, top: `${coords.current[agent].y}%`, "--depth": depthFor(coords.current[agent].y) }) as CSSProperties;
  function paint(agent: Agent) {
    const el = markerRefs.current[agent];
    if (!el) return;
    const p = coords.current[agent];
    el.style.left = `${p.x}%`;
    el.style.top = `${p.y}%`;
    el.style.setProperty("--depth", depthFor(p.y));
  }
  const wait = (ms: number) => new Promise<void>(resolve => { timers.current.push(setTimeout(resolve, ms)); });
  const routeTime = (agent: Agent, targets: Point[]) => {
    let from = coords.current[agent], total = 0;
    for (const to of targets) { total += distance(from, to); from = to; }
    return total / WALK_SPEED;
  };
  /** Moves a character along walkable path nodes frame by frame; the walk cycle loops only while this runs. */
  function walk(agent: Agent, targets: Point[], end: Stop, run: number) {
    return new Promise<void>(resolve => {
      const face = (target: Point) => {
        const dx = target.x - coords.current[agent].x;
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
          const p = coords.current[agent], t = targets[segment]!, d = distance(p, t);
          if (d <= budget) {
            coords.current[agent] = { ...t };
            budget -= d;
            segment++;
            if (segment < targets.length) face(targets[segment]!);
          } else {
            const k = budget / d;
            coords.current[agent] = { x: p.x + (t.x - p.x) * k, y: p.y + (t.y - p.y) * k };
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
  const spots = useRef<Record<Agent, Spot>>({ Oz: "home", Brix: "home", Lowkey: "home" });
  function pathBetween(agent: Agent, from: Spot, to: Spot): Point[] {
    const work = WORK[agent];
    const f = from === "work" && !work ? "home" : from, t = to === "work" && !work ? "home" : to;
    if (f === t) return [];
    const back = work ? [...work.slice(0, -1).reverse(), HOME(agent)] : [];
    if (f === "home" && t === "central") return toMeet(agent);
    if (f === "central" && t === "home") return toHome(agent);
    if (f === "home" && t === "work") return work!;
    if (f === "work" && t === "home") return back;
    if (f === "central" && t === "work") return [...toHome(agent), ...work!];
    return [...back, ...toMeet(agent)];
  }
  /** Walks a character between Sanctuary spots on its own path nodes. */
  async function goTo(agent: Agent, to: Spot, run: number) {
    const path = pathBetween(agent, spots.current[agent], to);
    spots.current[agent] = to;
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
      const start = { ...coords.current[from] }, end = { ...coords.current[to] };
      const pts: Point[] = [start];
      if (spots.current[from] === "central") pts.push(...pathBetween(to, "central", spots.current[to]));
      else pts.push(...pathBetween(from, spots.current[from], "central"), ...pathBetween(to, "central", spots.current[to]));
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
        el.style.transform = `translate(${ha.x + (hb.x - ha.x) * k}px, ${ha.y + (hb.y - ha.y) * k + lift}px)`;
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
        const p = coords.current[current];
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        const o = handOffset(current);
        el.style.transform = `translate(${o.x}px, ${o.y}px)`;
      }
      raf = requestAnimationFrame(track);
    };
    raf = requestAnimationFrame(track);
    return () => cancelAnimationFrame(raf);
  }, [current]);
  /** One real handoff: the previous owner stops, the new owner walks to collect and works while its AI call processes all earlier outputs. */
  async function runStep(id: number, directive: string, agent: Agent, previous: Step[], finalReview: boolean, solo: boolean, run: number): Promise<Step | null> {
    const call = runCrewStep({ data: { directive, agent, previous: previous.map(p => ({ agent: p.agent, result: p.result })), finalReview } });
    call.catch(() => undefined);
    const from: Agent | null = previous.at(-1)?.agent ?? null;
    if (!from) {
      setMission(id, () => ({ state: "Routing", agent: "Oz" }));
      setPhase("routing");
      setCurrent("Oz");
      setSelected("Oz");
      if (solo && agent === "Oz") {
        log("Oz", "Receiving the directive — keeping this one at the shack.");
      } else {
        log("Oz", "Receiving the directive at the crossroads.");
        await goTo("Oz", "central", run);
        if (run !== runId.current) return null;
      }
    }
    const prev = from ?? "Oz";
    if (prev !== agent) {
      if (spots.current[prev] !== "central") {
        log(prev, `Bringing the output to the crossroads for ${agent}.`);
        await goTo(prev, "central", run);
        if (run !== runId.current) return null;
      }
      log(prev, `Handing off to ${agent} — task energy in transit.`);
      setMission(id, () => ({ state: "Handoff", agent: prev }));
      setPhase("handoff");
      await sendTask(prev, agent, run);
      if (run !== runId.current) return null;
      log(agent, "Task received.");
      setCurrent(agent);
      setSelected(agent);
      setMission(id, () => ({ state: "In progress", agent }));
      setPhase("working");
      if (agent !== "Oz") {
        log(agent, "Walking to the crossroads to collect the handoff.");
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
    const staysPut = agent === "Oz" && solo;
    log(agent, staysPut ? "Working on it right here at the shack." : agent === "Oz" ? (finalReview ? "Taking the combined output home for final review." : "Keeping this one — heading back to work on it.") : "Heading to the work area.");
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
    await wait(1200);
    if (run !== runId.current) return null;
    const step: Step = { agent, activity: output.activity, result: output.result, verdict: output.verdict };
    setMission(id, m => ({ steps: [...m.steps, step], done: m.steps.length + 1 }));
    log(agent, output.verdict === "conflict" ? "Canon conflict flagged — result posted." : "Step finished — result posted.");
    return step;
  }
  async function runMission(id: number, directive: string, route: Agent[], run: number) {
    const done: Step[] = [];
    for (let i = 0; i < route.length; i++) {
      const agent = route[i]!;
      const step = await runStep(id, directive, agent, done, i > 0 && i === route.length - 1 && agent === "Oz", route.length === 1, run);
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
    setMission(id, () => ({ state: "Complete", done: done.length }));
    setCurrent(null);
    setPhase("idle");
    setFinishedId(id);
    log(done.at(-1)?.agent ?? "Oz", "Directive complete. Standing by.");
    await Promise.all((["Oz", "Brix", "Lowkey"] as Agent[]).map(a => goTo(a, "home", run)));
    await wait(2500);
    setFinishedId(prev => prev === id ? null : prev);
  }
  function log(agent: Agent, text: string) {
    setLogs(prev => [{ id: Date.now() + Math.random(), agent, text, time: now() }, ...prev].slice(0, 12));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "idle") return;
    setPlanningError("");
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
    const { route, reason } = decision;
    const agent = route[0]!;
    const id = Date.now();
    setDraft("");
    setSelected("Oz");
    setWalking([]);
    setPhase("routing");
    setMissions(prev => [{ id, text, agent, reason, route, steps: [], done: 0, state: "Routing" as const, time: now() }, ...prev].slice(0, 8));
    log("Oz", `Route: ${route.join(" → ")}. ${reason}`);
    void runMission(id, text, route, runId.current);
  }
  return <div className="command-app">
    <header className="command-header">
      <div className="brand-lockup"><div className="brand-mark"><Hexagon size={25} strokeWidth={1.5}/><span>Z</span></div><div className="brand-copy"><div className="brand-title">ZYGORIA<span className="brand-tm">™</span></div><div className="brand-subtitle"><span className="brand-subtitle-rule"/>FIRST GENESIS<span className="brand-subtitle-rule"/></div></div></div>
      <div className="header-right"><div className="live-indicator"><span className="live-dot"/> WORLD ONLINE</div><div className="header-divider"/><div className="header-coordinate"><Signal size={14}/> 47° N / 09° E</div><div className="header-avatar">Z</div></div>
    </header>
    <main className="command-layout">
      <div className="world-column">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> LIVE WORLD FEED <span className="eyebrow-line"/></div><h1>The <span>Sanctuary</span></h1><p>Built from the crash. Held by three.</p></div><div className="world-index"><CircleDot size={14}/> HOME BASE <span> / </span> SECURE</div></div>
        <div className="world-frame">
          <div className="world-image-wrap"><img className="world-image" src={world} width={1536} height={1024} alt="The Sanctuary: Oz, Brix and Lowkey's rebuilt home base — a salvaged riverside shack, Brix's scrap workshop, their three landing pods, a lookout tower and reused Old Earth ruins" />
            <div className="world-vignette"/>
            <div className="map-coordinate top-left">◉ &nbsp; ZYGORIA / THE SANCTUARY</div>
            <div className="map-coordinate top-right"><span className="live-dot"/> LIVE ENVIRONMENT</div>
            <div className="location-tag shack-tag"><span className="location-line"/> RIVERSIDE SHACK</div>
            <div className="location-tag workshop-tag"><span className="location-line"/> BRIX'S WORKSHOP</div>
            <div className="location-tag lookout-tag"><span className="location-line"/> LOOKOUT</div>
             <div className="scene-atmosphere" aria-hidden="true"><span className="river-light"/><span className="workshop-light"/></div>
             <div className="scene-depth" aria-hidden="true"><span className="depth-haze"/><span className="depth-ridge-shade"/><span className="depth-pool pool-shack"/><span className="depth-pool pool-workshop"/><span className="depth-pool pool-pods"/><span className="depth-pool pool-lookout"/><span className="depth-pool pool-bridge"/><span className="depth-river"/><span className="depth-fore"/></div>
             <img className="moxi-scenery" src={moxiUnderTree.url} alt="Moxi, a tiny dragon peeking over rocks beneath the evergreen near Brix's workshop" draggable={false} />
            <div className="location-tag central-tag"><span className="location-line"/> CROSSROADS</div>
            <div className="world-stage">
            <svg className="world-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points={trailPoints("Oz")}/><polyline points={trailPoints("Brix")}/><polyline points={trailPoints("Lowkey")}/></svg>
            <div ref={taskIconRef} className="task-energy" aria-hidden="true"><span/></div>
            {agents.map(agent => <Button key={agent.name} ref={el => { markerRefs.current[agent.name] = el; }} style={markerStyle(agent.name)} type="button" variant="ghost" title={`View ${agent.name}`} aria-label={`View ${agent.name}, ${statuses[agent.name]}${walking.includes(agent.name) ? ", walking" : ""}`} onClick={() => setSelected(agent.name)} className={`agent-marker marker-${agent.name.toLowerCase()} at-${positions[agent.name]} facing-${facing[agent.name]} ${selected === agent.name ? "is-selected" : ""} ${statuses[agent.name] !== "Idle" ? "is-active" : ""} ${walking.includes(agent.name) ? "is-walking" : ""} ${statuses[agent.name] === "Working" || statuses[agent.name] === "Thinking" && !walking.includes(agent.name) ? "is-thinking" : ""}`}>
              <span className="marker-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]}</span><span className="sprite-stage"><CharacterSprite character={agent.name}/></span><span className="marker-name">{agent.name === "Oz" ? <img className="oz-wordmark" src={ozWordmark.url} alt="Oz" draggable={false} /> : agent.name === "Brix" ? <img className="brix-wordmark" src={brixWordmark.url} alt="Brix" draggable={false} /> : <img className="lowkey-wordmark" src={lowkeyWordmark.url} alt="Lowkey" draggable={false} />}</span>
            </Button>)}
            </div>
            <div className="map-coordinate bottom-left"><MapPin size={12}/> THE SANCTUARY — EST. ARRIVAL DAY</div><div className="map-coordinate bottom-right">ZOOM 01 : 01 <span className="zoom-bars">▮▮▮▯</span></div>
          </div>
          <div className="world-footer"><span><span className="live-dot"/> ALL SYSTEMS OPERATIONAL</span><span>3 AGENTS CONNECTED <span className="footer-cross">✦</span> 1 SANCTUARY</span><span className="creator-credit">Created by <span className="creator-signature">Dylan Owen</span><span className="creator-year">· 2026</span></span></div>
        </div>
        <form className="mission-form" onSubmit={submit}><div className="form-title"><span><Terminal size={16}/> NEW DIRECTIVE</span><span className="form-counter">{phase === "idle" ? "READY FOR INPUT" : phase === "planning" ? "SELECTING CREW" : "MISSION IN PROGRESS"}</span></div><div className="form-row"><span className="prompt-chevron">›</span><input aria-label="Enter a job for the crew" placeholder="What needs doing around The Sanctuary?" value={draft} onChange={e => setDraft(e.target.value)} maxLength={180} disabled={phase !== "idle"}/><Button className="dispatch-button" type="submit" disabled={!draft.trim() || phase !== "idle"}>{phase === "planning" ? "CHOOSING" : "DISPATCH"} <Send size={14}/></Button></div>{planningError && <p className="planning-error" role="alert">{planningError}</p>}<div className="form-foot"><span>DIRECTIVES ARE ROUTED THROUGH OZ</span><span>↵ TO SEND</span></div></form>
        <div className="roster-heading"><div className="section-label"><span className="section-symbol">✦</span> THE CREW <span className="label-count">/ 03</span></div><span className="roster-hint">SELECT AN AGENT TO INSPECT <ArrowDownRight size={14}/></span></div>
        <div className="crew-grid">{agents.map(agent => { const Icon = agent.icon; return <Button key={agent.name} variant="ghost" type="button" onClick={() => setSelected(agent.name)} className={`crew-item ${selected === agent.name ? "selected" : ""}`}><span className="crew-portrait"><img src={agent.image} alt="" /></span><span className="crew-info"><span className="crew-name">{agent.name} <Icon size={13}/></span><span className="crew-role">{agent.role}</span><span className="crew-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]} <span>· {agent.place}</span></span></span><ChevronRight className="crew-arrow" size={16}/></Button> })}</div>
      </div>
      <aside className="intel-panel"><div className="intel-top"><div className="intel-heading"><span><Activity size={17}/> MISSION CONTROL</span><span className="panel-id">PANEL_01</span></div><div className="intel-subhead">REAL-TIME OPERATIONAL OVERVIEW</div></div>
        <section className="intel-section current-section"><div className="panel-section-heading"><span><span className="section-square"/> CURRENT DIRECTIVE</span><span className="section-number">01 / 03</span></div>{active && (active.state !== "Complete" || finishedId === active.id) ? <div className={`current-task ${active.state === "Complete" ? "is-complete" : ""}`}><div className="task-status-line"><span className="task-state">{active.state === "Complete" ? <Check size={12}/> : <span className="live-dot"/>}{active.state.toUpperCase()}</span><span>#{String(active.id).slice(-4)}</span></div><p>{active.text}</p><div className="assigned-row"><span>{active.state === "Complete" ? "COMPLETED BY" : "ASSIGNED TO"}</span><span className="assigned-agent"><img src={agents.find(a => a.name === (assigned ?? active.agent))?.image ?? ozPortrait.url} alt=""/>{assigned ?? active.agent}{active.state === "Complete" ? <Check size={12}/> : <ArrowRight size={12}/>}</span></div><div className="assignment-reason"><strong>ROUTE · {active.route.map((a, i) => i < active.steps.length ? `${a.toUpperCase()} ✓` : i === active.steps.length && active.state !== "Complete" ? `[${a.toUpperCase()}]` : a.toUpperCase()).join(" → ")}</strong><span>{active.reason}</span></div><div className="task-progress"><span className={active.state !== "Complete" && phase === "routing" || active.state === "Complete" ? "lit" : ""}/><span className={active.state !== "Complete" && (phase === "working" || phase === "handoff") || active.state === "Complete" ? "lit" : ""}/><span className={active.state === "Complete" ? "lit" : ""}/></div><div className="progress-labels"><span>RECEIVED</span><span>HANDOFF</span><span>COMPLETE</span></div></div> : <div className="empty-directive"><div className="empty-orbit"><Command size={25}/></div><strong>{phase === "planning" ? "CHOOSING CREW" : "AWAITING DIRECTIVE"}</strong><span>{phase === "planning" ? "Oz is reviewing the job." : "The crew is standing by."}</span><div className="empty-line"/></div>}</section>
        <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> TASK HISTORY</span><span className="section-number">{String(missions.length).padStart(2,"0")}</span></div>{missions.length ? <div className="history-list">{missions.map(m => <div className="history-item" key={m.id}><span className={`history-icon ${m.state === "Complete" ? "done" : ""}`}>{m.state === "Complete" ? <Check size={13}/> : <ArrowRight size={13}/>}</span><div><strong>{m.text}</strong><small>{m.route.join(" → ")} · {m.time}</small><small>{m.reason}</small>{m.error && <small className="planning-error">{m.error}</small>}{m.steps.slice(0, m.done).map((st, i) => <div className="task-result" key={i}><b>{st.agent.toUpperCase()} · {i > 0 && i === m.steps.length - 1 && st.agent === "Oz" && m.state === "Complete" ? "FINAL REVIEW" : st.verdict === "conflict" ? "CANON CONFLICT" : "RESULT"}</b><p>{st.result}</p></div>)}</div><span className="history-state">{m.state === "Complete" ? "DONE" : m.state === "Routing" ? "ROUTING" : m.state === "Handoff" ? "HANDOFF" : "ACTIVE"}</span></div>)}</div> : <div className="empty-list">NO MISSIONS LOGGED YET <span>— 00</span></div>}</section>
        <section className="intel-section activity-section"><div className="panel-section-heading"><span><span className="section-square"/> ACTIVITY LOG</span><Radio size={13} className="radio-icon"/></div><div className="activity-list">{logs.slice(0, 6).map(entry => <div className="activity-item" key={entry.id}><span className="activity-node"/><div><span className="activity-agent">{entry.agent}</span><span className="activity-text">{entry.text}</span><small>{entry.time}</small></div></div>)}</div></section>
        <div className="intel-bottom"><Cpu size={15}/> ZYGORIA SYSTEMS <span>AI ROUTING LIVE</span></div>
      </aside>
    </main>
    <footer className="app-footer"><span>© ZYGORIA // COMMAND CENTRE</span><span>WORLD STATE: SIMULATED <span className="footer-cross">✦</span> BUILD 0.1.0</span></footer>
  </div>;
}
