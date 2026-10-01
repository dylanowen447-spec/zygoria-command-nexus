import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, ArrowDownRight, ArrowRight, Check, CircleDot, Command, Cpu, Crosshair, Hexagon, MapPin, Radio, Send, Signal, Sparkles, Terminal, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import world from "@/assets/zygoria-world.jpg";
import ozPortrait from "@/assets/oz.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";

type Agent = "Oz" | "Brix" | "Lowkey";
type Status = "Idle" | "Thinking" | "Working" | "Waiting";
type Mission = { id: number; text: string; agent: Agent; state: "Routing" | "In progress" | "Complete"; time: string };
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
const now = () => new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const pickAgent = (text: string): Agent => /build|fix|code|design|make|create|repair|engine|workshop|garage|machine|develop|craft|prototype|tool|app|website/i.test(text) ? "Brix" : "Lowkey";

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
  const [phase, setPhase] = useState<"idle" | "routing" | "working">("idle");
  const [traveler, setTraveler] = useState<Agent | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const active = missions[0];
  const assigned = active?.state === "Routing" ? "Oz" : active?.state === "In progress" ? active.agent : null;
  const statuses: Record<Agent, Status> = {
    Oz: phase === "routing" ? "Thinking" : phase === "working" ? "Waiting" : "Idle",
    Brix: assigned === "Brix" ? "Working" : "Idle",
    Lowkey: assigned === "Lowkey" ? "Working" : "Idle",
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  function log(agent: Agent, text: string) {
    setLogs(prev => [{ id: Date.now() + Math.random(), agent, text, time: now() }, ...prev].slice(0, 12));
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || phase !== "idle") return;
    const agent = pickAgent(text);
    const id = Date.now();
    setDraft("");
    setSelected("Oz");
    setTraveler(null);
    setPhase("routing");
    setMissions(prev => [{ id, text, agent, state: "Routing" as const, time: now() }, ...prev].slice(0, 8));
    log("Oz", `Mission received. Assessing handoff to ${agent}.`);
    timers.current.push(setTimeout(() => {
      setMissions(prev => prev.map(m => m.id === id ? { ...m, state: "In progress" } : m));
      setSelected(agent);
      setTraveler(agent);
      setPhase("working");
      log("Oz", `Mission transferred to ${agent}.`);
      log(agent, agent === "Brix" ? "Working on the assignment at the workshop." : "Investigating the assignment in the field.");
    }, 2200));
    timers.current.push(setTimeout(() => {
      setMissions(prev => prev.map(m => m.id === id ? { ...m, state: "Complete" } : m));
      setPhase("idle");
      setTraveler(null);
      log(agent, "Assignment complete. Standing by for the next mission.");
    }, 8500));
  }
  return <div className="command-app">
    <header className="command-header">
      <div className="brand-lockup"><div className="brand-mark"><Hexagon size={25} strokeWidth={1.5}/><span>Z</span></div><div><div className="brand-title">ZYGORIA <span>COMMAND CENTRE</span></div><div className="brand-subtitle">WORLD OPERATIONS // SECTOR 01</div></div></div>
      <div className="header-right"><div className="live-indicator"><span className="live-dot"/> WORLD ONLINE</div><div className="header-divider"/><div className="header-coordinate"><Signal size={14}/> 47° N / 09° E</div><div className="header-avatar">Z</div></div>
    </header>
    <main className="command-layout">
      <div className="world-column">
        <div className="section-heading"><div><div className="eyebrow"><span className="eyebrow-line"/> LIVE WORLD FEED <span className="eyebrow-line"/></div><h1>Zygoria <span>World</span></h1><p>Three minds. One world. Infinite possibilities.</p></div><div className="world-index"><CircleDot size={14}/> SECTOR 01 <span> / </span> ACTIVE</div></div>
        <div className="world-frame">
          <div className="world-image-wrap"><img className="world-image" src={world} width={1536} height={1024} alt="Zygoria landscape with a wooden riverside shack, Brix's workshop, and mountains" />
            <div className="world-vignette"/>
            <div className="map-coordinate top-left">◉ &nbsp; ZYGORIA / CENTRAL BASIN</div>
            <div className="map-coordinate top-right"><span className="live-dot"/> LIVE ENVIRONMENT</div>
            <div className="location-tag shack-tag"><span className="location-line"/> RIVERSIDE SHACK</div>
            <div className="location-tag workshop-tag"><span className="location-line"/> BRIX'S WORKSHOP</div>
            <div className="scene-atmosphere" aria-hidden="true"><span className="river-light"/><span className="workshop-light"/></div>
            {agents.map(agent => <Button key={agent.name} type="button" variant="ghost" title={`View ${agent.name}`} aria-label={`View ${agent.name}, ${statuses[agent.name]}`} onClick={() => setSelected(agent.name)} className={`agent-marker marker-${agent.name.toLowerCase()} ${selected === agent.name ? "is-selected" : ""} ${statuses[agent.name] !== "Idle" ? "is-active" : ""} ${agent.name === "Oz" && phase === "routing" || traveler === agent.name ? "is-traveling" : ""}`}>
              <span className="marker-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]}</span><span className="marker-portrait"><img src={agent.image} alt="" /></span><span className="marker-name">{agent.name}</span><span className="marker-ground"/>
            </Button>)}
            {phase !== "idle" && <div className={`handoff-path path-${phase} path-${active?.agent.toLowerCase()}`} aria-hidden="true"><span className="handoff-pulse"/></div>}
            <div className="map-coordinate bottom-left"><MapPin size={12}/> THE KNOWN WORLD</div><div className="map-coordinate bottom-right">ZOOM 01 : 01 <span className="zoom-bars">▮▮▮▯</span></div>
          </div>
          <div className="world-footer"><span><span className="live-dot"/> ALL SYSTEMS OPERATIONAL</span><span>3 AGENTS CONNECTED <span className="footer-cross">✦</span> 1 WORLD</span></div>
        </div>
        <form className="mission-form" onSubmit={submit}><div className="form-title"><span><Terminal size={16}/> NEW DIRECTIVE</span><span className="form-counter">{phase === "idle" ? "READY FOR INPUT" : "MISSION IN PROGRESS"}</span></div><div className="form-row"><span className="prompt-chevron">›</span><input aria-label="Enter a job for the crew" placeholder="What needs to be done in Zygoria?" value={draft} onChange={e => setDraft(e.target.value)} maxLength={180} disabled={phase !== "idle"}/><Button className="dispatch-button" type="submit" disabled={!draft.trim() || phase !== "idle"}>DISPATCH <Send size={14}/></Button></div><div className="form-foot"><span>DIRECTIVES ARE ROUTED THROUGH OZ</span><span>↵ TO SEND</span></div></form>
        <div className="roster-heading"><div className="section-label"><span className="section-symbol">✦</span> THE CREW <span className="label-count">/ 03</span></div><span className="roster-hint">SELECT AN AGENT TO INSPECT <ArrowDownRight size={14}/></span></div>
        <div className="crew-grid">{agents.map(agent => { const Icon = agent.icon; return <Button key={agent.name} variant="ghost" type="button" onClick={() => setSelected(agent.name)} className={`crew-item ${selected === agent.name ? "selected" : ""}`}><span className="crew-portrait"><img src={agent.image} alt="" /></span><span className="crew-info"><span className="crew-name">{agent.name} <Icon size={13}/></span><span className="crew-role">{agent.role}</span><span className="crew-status"><i className={`status-dot status-${statuses[agent.name].toLowerCase()}`}/>{statuses[agent.name]} <span>· {agent.place}</span></span></span><ChevronRight className="crew-arrow" size={16}/></Button> })}</div>
      </div>
      <aside className="intel-panel"><div className="intel-top"><div className="intel-heading"><span><Activity size={17}/> MISSION CONTROL</span><span className="panel-id">PANEL_01</span></div><div className="intel-subhead">REAL-TIME OPERATIONAL OVERVIEW</div></div>
        <section className="intel-section current-section"><div className="panel-section-heading"><span><span className="section-square"/> CURRENT DIRECTIVE</span><span className="section-number">01 / 03</span></div>{active && active.state !== "Complete" ? <div className="current-task"><div className="task-status-line"><span className="task-state"><span className="live-dot"/>{active.state.toUpperCase()}</span><span>#{String(active.id).slice(-4)}</span></div><p>{active.text}</p><div className="assigned-row"><span>ASSIGNED TO</span><span className="assigned-agent"><img src={agents.find(a => a.name === assigned)?.image ?? ozPortrait.url} alt=""/>{assigned}<ArrowRight size={12}/></span></div><div className="task-progress"><span className={phase === "routing" ? "lit" : ""}/><span className={phase === "working" ? "lit" : ""}/><span/></div><div className="progress-labels"><span>RECEIVED</span><span>HANDOFF</span><span>COMPLETE</span></div></div> : <div className="empty-directive"><div className="empty-orbit"><Command size={25}/></div><strong>AWAITING DIRECTIVE</strong><span>The crew is standing by.</span><div className="empty-line"/></div>}</section>
        <section className="intel-section"><div className="panel-section-heading"><span><span className="section-square"/> TASK HISTORY</span><span className="section-number">{String(missions.length).padStart(2,"0")}</span></div>{missions.length ? <div className="history-list">{missions.map(m => <div className="history-item" key={m.id}><span className={`history-icon ${m.state === "Complete" ? "done" : ""}`}>{m.state === "Complete" ? <Check size={13}/> : <ArrowRight size={13}/>}</span><div><strong>{m.text}</strong><small>{m.agent} · {m.time}</small></div><span className="history-state">{m.state === "Complete" ? "DONE" : m.state === "Routing" ? "ROUTING" : "ACTIVE"}</span></div>)}</div> : <div className="empty-list">NO MISSIONS LOGGED YET <span>— 00</span></div>}</section>
        <section className="intel-section activity-section"><div className="panel-section-heading"><span><span className="section-square"/> ACTIVITY LOG</span><Radio size={13} className="radio-icon"/></div><div className="activity-list">{logs.slice(0, 6).map(entry => <div className="activity-item" key={entry.id}><span className="activity-node"/><div><span className="activity-agent">{entry.agent}</span><span className="activity-text">{entry.text}</span><small>{entry.time}</small></div></div>)}</div></section>
        <div className="intel-bottom"><Cpu size={15}/> ZYGORIA SYSTEMS <span>SIMULATION MODE</span></div>
      </aside>
    </main>
    <footer className="app-footer"><span>© ZYGORIA // COMMAND CENTRE</span><span>WORLD STATE: SIMULATED <span className="footer-cross">✦</span> BUILD 0.1.0</span></footer>
  </div>;
}
