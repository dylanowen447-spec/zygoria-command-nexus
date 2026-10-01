import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowRight, Check, ChevronRight, CircleDot, Command, Cpu, Crosshair, Hexagon, MapPin, Radio, Send, Signal, Sparkles, Terminal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { chooseJobAgent } from "@/lib/job-planning.functions";
import world from "@/assets/zygoria-world-final.jpg";
import ozPortrait from "@/assets/oz.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";
import moxiUnderTree from "@/assets/moxi-under-tree.webp.asset.json";

type Agent = "Oz" | "Brix" | "Lowkey";
type Status = "Idle" | "Thinking" | "Working" | "Waiting";
type Stop = "shack" | "bridge" | "central" | "workshop" | "ridge" | "lookout";
type Mission = { id: number; text: string; agent: Agent; reason: string; state: "Routing" | "In progress" | "Complete"; time: string };
type Log = { id: number; agent: Agent; text: string; time: string };
const agents: { name: Agent; role: string; place: string; image: string; icon: typeof Sparkles }[] = [
  { name: "Oz", role: "The orchestrator", place: "Riverside shack", image: ozPortrait.url, icon: Sparkles },
  { name: "Brix", role: "The builder", place: "Workshop / garage", image: brixPortrait.url, icon: Wrench },
  { name: "Lowkey", role: "The scout", place: "The wilds", image: lowkeyPortrait.url, icon: Crosshair },
];
const startLogs: Log[] = [
  { id: 1, agent: "Oz", text: "Command link established.", time: "SYSTEM" },
  { id: 2, agent: "Brix", text: "Workshop systems online.", time: "SYSTEM" },
  { id: 3, agent: "Lowkey", text: "Perimeter is clear.", time: "SYSTEM" },
];
type Point = { x: number; y: number };
const STOPS: Record<Stop, Point> = { shack: { x: 20, y: 74 }, bridge: { x: 32, y: 74 }, central: { x: 47, y: 61 }, workshop: { x: 76, y: 58 }, ridge: { x: 57, y: 52 }, lookout: { x: 53, y: 43 } };
const MEET: Record<Agent, Point> = { Oz: { x: 40, y: 64 }, Brix: { x: 55, y: 59 }, Lowkey: { x: 55, y: 59 } };
const WORLD_ASPECT = 1.72;
const WALK_SPEED = 5.5; // percent of world width per second
const pointFor = (agent: Agent, stop: Stop): Point => stop === "central" ? MEET[agent] : STOPS[stop];
const depthFor = (y: number) => (1 - Math.min(Math.max((74 - y) / 31, 0), 1) * 0.12).toFixed(3);
const distance = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / WORLD_ASPECT);
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

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
  const [phase, setPhase] = useState<"idle" | "planning" | "routing" | "working">("idle");
  const [planningError, setPlanningError] = useState("");
  const [positions, setPositions] = useState<Record<Agent, Stop>>({ Oz: "shack", Brix: "workshop", Lowkey: "lookout" });
  const [walking, setWalking] = useState<Agent[]>([]);
  const [facing, setFacing] = useState<Record<Agent, "left" | "right">>({ Oz: "right", Brix: "left", Lowkey: "right" });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frames = useRef<number[]>([]);
  const runId = useRef(0);
  const coords = useRef<Record<Agent, Point>>({ Oz: { ...STOPS.shack }, Brix: { ...STOPS.workshop }, Lowkey: { ...STOPS.lookout } });
  const markerRefs = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const active = missions[0];
  const assigned = active?.state === "Routing" ? "Oz" : active?.state === "In progress" ? active.agent : null;
  const statuses: Record<Agent, Status> = {
    Oz: walking.includes("Oz") ? "Thinking" : phase === "planning" || phase === "routing" ? "Thinking" : phase === "working" ? assigned === "Oz" ? "Working" : "Waiting" : "Idle",
    Brix: walking.includes("Brix") && phase === "routing" ? "Waiting" : assigned === "Brix" ? "Working" : "Idle",
    Lowkey: walking.includes("Lowkey") && phase === "routing" ? "Waiting" : assigned === "Lowkey" ? "Working" : "Idle",
  };
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
  const routeTime = (agent: Agent, route: Stop[]) => {
    let from = coords.current[agent], total = 0;
    for (const stop of route) { const to = pointFor(agent, stop); total += distance(from, to); from = to; }
    return total / WALK_SPEED;
  };
  /** Moves a character along named stops frame by frame; the walk cycle loops only while this runs. */
  function walk(agent: Agent, route: Stop[], run: number) {
    return new Promise<void>(resolve => {
      const targets = route.map(stop => pointFor(agent, stop));
      const face = (target: Point) => {
        const dx = target.x - coords.current[agent].x;
        if (Math.abs(dx) < 0.3) return;
        const dir = dx < 0 ? "left" as const : "right" as const;
        setFacing(prev => prev[agent] === dir ? prev : { ...prev, [agent]: dir });
      };
      const finish = () => {
        setWalking(prev => prev.filter(a => a !== agent));
        setPositions(prev => ({ ...prev, [agent]: route[route.length - 1] }));
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
  async function runMission(id: number, agent: Agent, run: number) {
    if (agent === "Oz") {
      await walk("Oz", ["bridge", "central"], run);
      if (run !== runId.current) return;
      setMissions(prev => prev.map(m => m.id === id ? { ...m, state: "In progress" } : m));
      setPhase("working");
      log("Oz", "Taking the assignment at the crossroads.");
      await walk("Oz", ["bridge", "shack"], run);
      await wait(3500);
      if (run !== runId.current) return;
      setMissions(prev => prev.map(m => m.id === id ? { ...m, state: "Complete" } : m));
      setPhase("idle");
      log("Oz", "Assignment complete. Standing by for the next mission.");
      return;
    }
    const home: Stop = agent === "Brix" ? "workshop" : "lookout";
    await wait(250);
    if (run !== runId.current) return;
    const lead = Math.max(0.4, routeTime("Oz", ["bridge", "central"]) - routeTime(agent, agent === "Lowkey" ? ["ridge", "central"] : ["central"]));
    const agentWalk = wait(lead * 1000).then(() => {
      if (run !== runId.current) return;
      log(agent, "Walking to the crossroads for the handoff.");
      return walk(agent, agent === "Lowkey" ? ["ridge", "central"] : ["central"], run);
    });
    await Promise.all([walk("Oz", ["bridge", "central"], run), agentWalk]);
    if (run !== runId.current) return;
    setFacing(prev => ({ ...prev, Oz: "right", [agent]: "left" }));
    log("Oz", `Briefing ${agent} at the crossroads.`);
    await wait(1500);
    if (run !== runId.current) return;
    setMissions(prev => prev.map(m => m.id === id ? { ...m, state: "In progress" } : m));
    setSelected(agent);
    setPhase("working");
    log("Oz", `Mission transferred to ${agent}.`);
    await Promise.all([
      walk("Oz", ["bridge", "shack"], run),
      walk(agent, agent === "Lowkey" ? ["ridge", home] : [home], run).then(() => { if (run === runId.current) log(agent, agent === "Brix" ? "Working on the assignment at the workshop." : "Investigating the assignment at the lookout."); }),
    ]);
    await wait(3500);
    if (run !== runId.current) return;
    setMissions(prev => prev.map(m => m.id === id ? { ...m, state: "Complete" } : m));
    setPhase("idle");
    log(agent, "Assignment complete. Standing by for the next mission.");
  }
  function log(agent: Agent, text: string) {
    setLogs(prev => [{ id: Date.now() + Math.random(), agent, text, time: now() }, ...prev].slice(0, 12));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "idle") return;
    setPlanningError("");
    setPhase("planning");
    setSelected("Oz");
    let decision: Awaited<ReturnType<typeof chooseJobAgent>>;
    try {
      decision = await chooseJobAgent({ data: { directive: text } });
    } catch (error) {
      setPlanningError(error instanceof Error ? error.message : "Job planning is unavailable right now.");
      setPhase("idle");
      return;
    }
    const { agent, reason } = decision;
    const id = Date.now();
    setDraft("");
    setSelected("Oz");
    setWalking([]);
    setPhase("routing");
    setMissions(prev => [{ id, text, agent, reason, state: "Routing" as const, time: now() }, ...prev].slice(0, 8));
    log("Oz", `${agent} selected: ${reason}`);
    void runMission(id, agent, runId.current);
  }
  return <div className="command-app">
    <header className="command-header">
      <div className="brand-lockup"><div className="brand-mark"><Hexagon size={25} strokeWidth={1.5}/><span>Z</span></div><div className="brand-copy"><div className="brand-title">ZYGORIA</div><div className="brand-subtitle"><span className="brand-subtitle-rule"/>FIRST GENESIS<span className="brand-subtitle-rule"/></div></div></div>
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
             <img className="moxi-scenery" src={moxiUnderTree.url} alt="Moxi, a tiny dragon peeking over rocks beneath the evergreen near Brix's workshop" draggable={false} />
            <svg className="world-trails" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polyline points="20,74 32,74 47,61 76,58"/><polyline points="47,61 57,52 53,43"/><circle cx="47" cy="61" r=".6"/><circle cx="32" cy="74" r=".6"/></svg>
            <div className="location-tag central-tag"><span className="location-line"/> CROSSROADS</div>
            {agents.map(agent => <Button key={agent.name} ref={el => { markerRefs.current[agent.name] = el; }} style={markerStyle(agent.name)} type="button" variant="ghost" title={`View ${agent.name}`} aria-label={`View ${agent.name}, ${statuses[agent.name]}${walking.includes(agent.name) ? ", walking" : ""}`} onClick={() => setSelected(agent.name)} className={`agent-marker marker-${agent.name.toLowerCase()} at-${positions[agent.name]} facing-${facing[agent.name]} ${selected === agent.name ? "is-selected" : ""} ${statuses[agent.name] !== "Idle" ? "is-active" : ""} ${walking.includes(agent.name) ? "is-walking" : ""} ${statuses[agent.name] === "Working" || statuses[agent.name] === "Thinking" && !walking.includes(agent.name) ? "is-thinking" : ""}`}>
              <span className="marker-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]}</span><span className="sprite-stage"><CharacterSprite character={agent.name}/></span><span className="marker-name">{agent.name}</span>
            </Button>)}
            <div className="map-coordinate bottom-left"><MapPin size={12}/> THE SANCTUARY — EST. ARRIVAL DAY</div><div className="map-coordinate bottom-right">ZOOM 01 : 01 <span className="zoom-bars">▮▮▮▯</span></div>
          </div>
          <div className="world-footer"><span><span className="live-dot"/> ALL SYSTEMS OPERATIONAL</span><span>3 AGENTS CONNECTED <span className="footer-cross">✦</span> 1 SANCTUARY</span></div>
        </div>
        <form className="mission-form" onSubmit={submit}><div className="form-title"><span><Terminal size={16}/> NEW DIRECTIVE</span><span className="form-counter">{phase === "idle" ? "READY FOR INPUT" : phase === "planning" ? "SELECTING CREW" : "MISSION IN PROGRESS"}</span></div><div className="form-row"><span className="prompt-chevron">›</span><input aria-label="Enter a job for the crew" placeholder="What needs doing around The Sanctuary?" value={draft} onChange={e => setDraft(e.target.value)} maxLength={180} disabled={phase !== "idle"}/><Button className="dispatch-button" type="submit" disabled={!draft.trim() || phase !== "idle"}>{phase === "planning" ? "CHOOSING" : "DISPATCH"} <Send size={14}/></Button></div>{planningError && <p className="planning-error" role="alert">{planningError}</p>}<div className="form-foot"><span>DIRECTIVES ARE ROUTED THROUGH OZ</span><span>↵ TO SEND</span></div></form>
        <div className="roster-heading"><div className="section-label"><span className="section-symbol">✦</span> THE CREW <span className="label-count">/ 03</span></div><span className="roster-hint">SELECT AN AGENT TO INSPECT <ArrowDownRight size={14}/></span></div>
        <div className="crew-grid">{agents.map(agent => { const Icon = agent.icon; return <Button key={agent.name} variant="ghost" type="button" onClick={() => setSelected(agent.name)} className={`crew-item ${selected === agent.name ? "selected" : ""}`}><span className="crew-portrait"><img src={agent.image} alt="" /></span><span className="crew-info"><span className="crew-name">{agent.name} <Icon size={13}/></span><span className="crew-role">{agent.role}</span><span className="crew-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]} <span>· {agent.place}</span></span></span><ChevronRight className="crew-arrow" size={16}/></Button> })}</div>
      </div>
      <aside className="intel-panel"><div className="intel-top"><div className="intel-heading"><span><Activity size={17}/> MISSION CONTROL</span><span className="panel-id">PANEL_01</span></div><div className="intel-subhead">REAL-TIME OPERATIONAL OVERVIEW</div></div>
        <section className="intel-section current-section"><div className="panel-section-heading"><span><span className="section-square"/> CURRENT DIRECTIVE</span><span className="section-number">01 / 03</span></div>{active && active.state !== "Complete" ? <div className="current-task"><div className="task-status-line"><span className="task-state"><span className="live-dot"/>{active.state.toUpperCase()}</span><span>#{String(active.id).slice(-4)}</span></div><p>{active.text}</p><div className="assigned-row"><span>ASSIGNED TO</span><span className="assigned-agent"><img src={agents.find(a => a.name === assigned)?.image ?? ozPortrait.url} alt=""/>{assigned}<ArrowRight size={12}/></span></div><div className="assignment-reason"><strong>BEST FIT · {active.agent.toUpperCase()}</strong><span>{active.reason}</span></div><div className="task-progress"><span className={phase === "routing" ? "lit" : ""}/><span className={phase === "working" ? "lit" : ""}/><span/></div><div className="progress-labels"><span>RECEIVED</span><span>HANDOFF</span><span>COMPLETE</span></div></div> : <div className="empty-directive"><div className="empty-orbit"><Command size={25}/></div><strong>{phase === "planning" ? "CHOOSING CREW" : "AWAITING DIRECTIVE"}</strong><span>{phase === "planning" ? "Oz is reviewing the job." : "The crew is standing by."}</span><div className="empty-line"/></div>}</section>
        <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> TASK HISTORY</span><span className="section-number">{String(missions.length).padStart(2,"0")}</span></div>{missions.length ? <div className="history-list">{missions.map(m => <div className="history-item" key={m.id}><span className={`history-icon ${m.state === "Complete" ? "done" : ""}`}>{m.state === "Complete" ? <Check size={13}/> : <ArrowRight size={13}/>}</span><div><strong>{m.text}</strong><small>{m.agent} · {m.time}</small><small>{m.reason}</small></div><span className="history-state">{m.state === "Complete" ? "DONE" : m.state === "Routing" ? "ROUTING" : "ACTIVE"}</span></div>)}</div> : <div className="empty-list">NO MISSIONS LOGGED YET <span>— 00</span></div>}</section>
        <section className="intel-section activity-section"><div className="panel-section-heading"><span><span className="section-square"/> ACTIVITY LOG</span><Radio size={13} className="radio-icon"/></div><div className="activity-list">{logs.slice(0, 6).map(entry => <div className="activity-item" key={entry.id}><span className="activity-node"/><div><span className="activity-agent">{entry.agent}</span><span className="activity-text">{entry.text}</span><small>{entry.time}</small></div></div>)}</div></section>
        <div className="intel-bottom"><Cpu size={15}/> ZYGORIA SYSTEMS <span>SIMULATION MODE</span></div>
      </aside>
    </main>
    <footer className="app-footer"><span>© ZYGORIA // COMMAND CENTRE</span><span className="creator-credit"><span className="creator-signature">Dylan Owen</span><span className="creator-year">2026</span></span><span>WORLD STATE: SIMULATED <span className="footer-cross">✦</span> BUILD 0.1.0</span></footer>
  </div>;
}
