import { useEffect, useRef, useState } from "react";
import tvNormal from "@/assets/tv-normal.png.asset.json";
import tvWalk from "@/assets/tv-walk.png.asset.json";
import tvCage from "@/assets/tv-cage.png.asset.json";
import tvNetwork from "@/assets/tv-network.webp.asset.json";
import { playSfx } from "@/lib/atmosphere";
import { TV_CAGE, TV_CAGED, TV_DEFEAT, TV_FIGHT_CALLS, TV_FIGHT_START, TV_HITS, TV_KEY, TV_SPOT, TV_VISITOR, type TvLine } from "@/lib/tv-mission";

type Stage = "dormant" | "awaken" | "walk" | "visitor" | "fight" | "defeat" | "cage" | "caged";
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** Self-contained first-night TV encounter; never touches crew movement or story state. */
export function SanctuaryTV({ escaped, onLog, onDone, onFightStart }: { escaped: boolean; onLog: (who: string, text: string) => void; onDone: () => void; onFightStart?: () => void }) {
  const [stage, setStage] = useState<Stage>("dormant");
  const [line, setLine] = useState<TvLine | null>(null);
  const [pos, setPos] = useState(TV_SPOT.workshop);
  const [hp, setHp] = useState(TV_HITS);
  const [hit, setHit] = useState<"" | "punch" | "slash">("");
  const [lunge, setLunge] = useState(false);
  const [art, setArt] = useState(false);
  const [charging, setCharging] = useState(false);
  const alive = useRef(true);
  const hits = useRef(0);
  const started = useRef(false);
  const turn = useRef(0);
  const holdStart = useRef(0);
  const ending = useRef(false);

  useEffect(() => { alive.current = true; try { if (localStorage.getItem(TV_KEY) === "done") { setStage("caged"); setPos(TV_SPOT.cage); } } catch { /* optional */ } return () => { alive.current = false; }; }, []);
  // The TV wakes inside Brix's workshop; out here it only appears once it has bolted out the door.
  useEffect(() => { if (escaped && stage === "dormant" && !started.current) void run(); }, [escaped, stage]);

  async function speak(seq: TvLine[], gap = 2600) {
    for (const l of seq) { if (!alive.current) return false; setLine(l); onLog(l[0] || "Sanctuary", l[1]); await wait(Math.max(gap, 1400 + l[1].length * 40)); }
    setLine(null); return alive.current;
  }

  async function run() {
    started.current = true;
    setStage("walk");
    const from = TV_SPOT.workshop, to = TV_SPOT.cage, t0 = performance.now(), dur = 6500;
    await new Promise<void>(res => { const f = (now: number) => { if (!alive.current) return res(); const k = Math.min(1, (now - t0) / dur); setPos({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }); k < 1 ? requestAnimationFrame(f) : res(); }; requestAnimationFrame(f); });
    setStage("visitor");
    onFightStart?.();
    if (!await speak(TV_VISITOR)) return;
    if (ending.current) return;
    if (!await speak(TV_FIGHT_START, 2000)) return;
    if (ending.current) return;
    setStage("fight");
    setLine(["", "ATTACK (or Space) — Brix punches, Lowkey slashes. Hold for a heavy hit!"]);
  }

  // TV lunges at the crew every couple of seconds during the scrap; Oz shouts from the side.
  useEffect(() => {
    if (stage !== "fight") return;
    let i = 0;
    const l = setInterval(() => { setLunge(true); playSfx("swing"); setTimeout(() => setLunge(false), 380); }, 2200);
    const c = setInterval(() => { const call = TV_FIGHT_CALLS[i++ % TV_FIGHT_CALLS.length]!; setLine(call); onLog(call[0], call[1]); }, 3200);
    return () => { clearInterval(l); clearInterval(c); };
  }, [stage]);

  /** Plays the fighter's real attack animation on their Sanctuary marker (Oz only directs). */
  function swing(who: "Brix" | "Lowkey", heavy: boolean) {
    const el = document.querySelector<HTMLElement>(`.agent-marker.marker-${who.toLowerCase()}`);
    if (!el) return;
    const cls = who === "Brix" ? "atk-punch" : "atk-slash";
    el.classList.remove("atk-punch", "atk-slash", "is-heavy"); void el.offsetWidth;
    el.classList.add(cls); if (heavy) el.classList.add("is-heavy");
    setTimeout(() => el.classList.remove(cls, "is-heavy"), heavy ? 640 : 480);
  }

  async function strike(heavy = false) {
    if ((stage !== "fight" && stage !== "visitor") || ending.current) return;
    const who = turn.current++ % 2 ? "Lowkey" : "Brix";
    swing(who, heavy);
    hits.current += heavy ? 2 : 1;
    const kind = who === "Brix" ? "punch" : "slash";
    playSfx(kind === "punch" ? (heavy ? "punch-heavy" : "punch") : "slash-hit");
    setHit(kind); setTimeout(() => setHit(""), 260);
    const left = Math.max(0, TV_HITS - hits.current); setHp(left);
    if (left > 0) return;
    ending.current = true;
    setStage("defeat");
    if (!await speak(TV_DEFEAT)) return;
    setStage("cage");
    if (!await speak(TV_CAGE)) return;
    try { localStorage.setItem(TV_KEY, "done"); } catch { /* optional */ }
    setStage("caged");
    onLog("Codex", "MISSION COMPLETE — TIE UP THE TV. Codex art unlocked: Old TV — Network Manifestation.");
    onDone();
    setArt(true);
  }
  const strikeRef = useRef(strike); strikeRef.current = strike;

  // Space: tap = quick, hold ~0.6s = heavy (same feel as the other fights).
  useEffect(() => {
    if (stage !== "fight" && stage !== "visitor") return;
    let down = 0;
    const kd = (e: KeyboardEvent) => { if (e.code !== "Space") return; e.preventDefault(); if (e.repeat || down) return; down = performance.now(); };
    const ku = (e: KeyboardEvent) => { if (e.code !== "Space" || !down) return; e.preventDefault(); const held = performance.now() - down; down = 0; void strikeRef.current(held >= 600); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [stage]);

  function tapIdle() {
    if (stage === "caged") { const l = TV_CAGED[Math.floor(Math.random() * TV_CAGED.length)]!; setLine(l); playSfx("zap"); setTimeout(() => alive.current && setLine(null), 2600); }
  }

  if (stage === "dormant") return null;
  const busy = stage !== "caged";
  const walking = stage === "walk" || stage === "fight";
  const z = 10 + Math.round(pos.y * 10);
  return <>
    {busy && <div className="tv-block" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}/>}
    {(stage === "fight" || stage === "visitor") && <button type="button" className={`combat-attack in-fight tv-attack ${charging ? "is-charged" : ""}`} aria-label="Attack the TV — tap for quick, hold for heavy"
      onClick={e => e.stopPropagation()}
      onPointerDown={e => { e.stopPropagation(); holdStart.current = performance.now(); setTimeout(() => holdStart.current && setCharging(true), 600); }}
      onPointerUp={e => { e.stopPropagation(); if (!holdStart.current) return; const held = performance.now() - holdStart.current; holdStart.current = 0; setCharging(false); void strike(held >= 600); }}
      onPointerLeave={() => { holdStart.current = 0; setCharging(false); }}>ATTACK<small>hold = heavy</small></button>}
    {stage === "caged" || stage === "cage"
      ? <button type="button" className="tv-actor is-caged" style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: z }} aria-label="The caged TV" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); tapIdle(); }}><img className="tv-caged-set" src={tvNormal.url} alt=""/><span className="tv-eyes"/><img className="tv-cage" src={tvCage.url} alt=""/></button>
      : <button type="button" className={`tv-actor ${walking || stage === "visitor" || stage === "defeat" ? "is-alive" : ""} ${stage === "awaken" ? "is-waking" : ""} ${stage === "defeat" ? "is-down" : ""} ${lunge ? "is-lunge" : ""} ${hit ? `is-hit-${hit}` : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: busy ? 2100 : z }} aria-label={stage === "fight" ? "Hit the TV" : "Old TV"} onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); stage === "fight" ? void strike() : tapIdle(); }}>
        {stage === "awaken" ? <img className="tv-still" src={tvNormal.url} alt=""/> : <span className={`tv-walk ${walking ? "is-walking" : ""}`} style={{ backgroundImage: `url(${tvWalk.url})` }}/>}
        {stage === "awaken" && <span className="tv-eyes"/>}
        {stage === "fight" && <span className="tv-hp" aria-label={`TV health ${hp} of ${TV_HITS}`}><i style={{ width: `${(hp / TV_HITS) * 100}%` }}/></span>}
      </button>}
    {line && <div className={`tv-caption ${line[0] ? `is-${line[0].toLowerCase()}` : "is-narration"}`} role="status">{line[0] && <b>{line[0] === "TV" ? "TV" : line[0].toUpperCase()}</b>}<span>{line[1]}</span></div>}
    {art && <div className="prologue-card tv-art-card" role="dialog" aria-label="Codex art unlocked" onClick={e => e.stopPropagation()}><span className="prologue-card-eyebrow">MISSION COMPLETE — TIE UP THE TV</span><img src={tvNetwork.url} alt="Old TV — Network Manifestation"/><strong>Codex art unlocked: Old TV — Network Manifestation</strong><button type="button" onClick={() => setArt(false)}>Close ›</button></div>}
  </>;
}
