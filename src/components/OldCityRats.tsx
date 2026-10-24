import { playSfx } from "@/lib/atmosphere";
import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { RatSprite } from "@/components/RatSprite";
import { GameOverScreen } from "@/components/GameOverScreen";
import { DEFAULT_BOUNDS, brixShockwave, hitCtx, makeRat, separateRats, stepRat, zapRats, type CombatApi, type Rat, type StagePlan } from "@/lib/rat-ai";
import { cityWaveSpawns, CITY_WAVES } from "@/lib/city-waves";
import { startBattleMusic, stopBattleMusic } from "@/lib/atmosphere";
import type { Agent, Point } from "@/lib/zones";
import { CITY_RAT_ARRIVAL, ARRIVAL_GAP_MS, BRIX_SWARM_CALL, SWARM_CLEARED } from "@/lib/fight-lines";
import { MAX_HP, REVIVE_MS, allDown, damage, fullSquad, heal, liveSquad, revive, type Squad } from "@/lib/squad-health";

/** Nine finite directional waves, isolated from the scene's story progression. */
const AGENTS: Agent[] = ["Brix", "Oz", "Lowkey"];
const DOWN_LINES: Record<Agent, string> = { Brix: "Ugh… just… need a sec…", Oz: "Ow ow ow — I'm down!", Lowkey: "…Not like this." };
const UP_LINES: Record<Agent, string> = { Brix: "Right. Where were we?", Oz: "Back in it!", Lowkey: "Thanks." };

export function OldCityRats({ stageRef, hitRef, combatRef, crew, onAlarm, onSay, onCleared, onSanctuary }: {
  combatRef?: MutableRefObject<CombatApi>;
  stageRef: RefObject<HTMLDivElement | null>;
  hitRef: MutableRefObject<(p: Point) => boolean>;
  crew: MutableRefObject<Record<Agent, Point>>;
  onAlarm: (situation: string) => void;
  onSay: (who: Agent, text: string) => void;
  onCleared: () => void;
  onSanctuary?: () => void;
}) {
  const [, force] = useState(0);
  const rats = useRef<Rat[]>([]);
  const [ozH, setOzH] = useState(40);
  const [squad, setSquad] = useState<Squad>(fullSquad);
  const squadRef = useRef<Squad>(fullSquad());
  const reviveT = useRef<Record<Agent, number>>({ Brix: 0, Oz: 0, Lowkey: 0 });
  const [wave, setWave] = useState(0);
  const [cleared, setCleared] = useState(false);
  const [defeat, setDefeat] = useState<"" | "falling" | "over">("");
  const [attempt, setAttempt] = useState(0);
  const startWave = useRef(0);
  const curWave = useRef(-1);
  const stage = useRef<StagePlan>(null);
  const clearedCallback = useRef(onCleared);
  clearedCallback.current = onCleared;
  const sayRef = useRef(onSay); sayRef.current = onSay;

  // Rats stand 5% shorter than Oz, matching his on-screen height on any device.
  useEffect(() => {
    const measure = () => {
      const st = stageRef.current; if (!st) return;
      const oz = st.querySelector(".marker-oz .sheet-sprite")?.getBoundingClientRect().height;
      if (oz) setOzH(h => (Math.abs(h - oz) > 0.5 ? oz : h));
    };
    measure(); const id = setInterval(measure, 1000);
    return () => clearInterval(id);
  }, [stageRef]);

  useEffect(() => {
    if (!combatRef) return;
    combatRef.current = { targets: () => rats.current.filter(r => !r.dead).map(r => ({ x: r.x, y: r.y })), bounds: () => DEFAULT_BOUNDS, stage: () => stage.current };
    return () => { combatRef.current = { targets: () => [], bounds: () => DEFAULT_BOUNDS }; };
  }, [combatRef]);

  // Downed Zigs lie on the ground (class on their marker) until revived.
  useEffect(() => {
    const st = stageRef.current; if (!st) return;
    for (const a of AGENTS) st.querySelector(`.marker-${a.toLowerCase()}`)?.classList.toggle("is-downed", squad[a] <= 0);
  }, [squad, stageRef]);
  useEffect(() => () => {
    liveSquad.hp = fullSquad();
    stageRef.current?.querySelectorAll(".is-downed").forEach(el => el.classList.remove("is-downed"));
  }, [stageRef]);

  useEffect(() => {
    let alive = true, raf = 0, last = performance.now(), waveIndex = startWave.current - 1, nextWaveAt = last + (attempt ? 900 : 1200), nextId = 1, over = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const setSq = (s: Squad) => { squadRef.current = s; liveSquad.hp = s; setSquad(s); };
    const hurt = (_n: number, who?: Agent) => {
      if (!who || over || squadRef.current[who] <= 0) return;
      playSfx("hurt");
      const s = damage(squadRef.current, who);
      setSq(s);
      if (s[who] <= 0) {
        reviveT.current[who] = 0;
        sayRef.current(who, DOWN_LINES[who]);
        window.dispatchEvent(new CustomEvent("zig-downed", { detail: who }));
        if (allDown(s)) {
          over = true; setDefeat("falling"); stopBattleMusic();
          later(1800, () => setDefeat("over"));
        }
      }
    };

    rats.current = []; setSq(fullSquad()); setWave(0); setCleared(false); setDefeat("");

    // During Brix's swarm his blows also send a shockwave through the rats around the impact.
    hitRef.current = (p: Point) => {
      if (over) return false;
      const by = hitCtx.by, heavy = hitCtx.heavy;
      if (squadRef.current[by] <= 0) return false;
      const before = rats.current.filter(r => r.dead).length;
      let hit = zapRats(rats.current, p, crew.current);
      if (waveIndex === 0 && by === "Brix") { const n = brixShockwave(rats.current, p, crew.current.Brix, heavy ? 13 : 9); if (n) playSfx("punch-heavy"); hit = hit || n > 0; }
      // Grit: a charged-punch kill restores one pip to everyone standing.
      if (by === "Brix" && heavy && rats.current.filter(r => r.dead).length > before) setSq(heal(squadRef.current));
      return hit;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (over) { force(f => (f + 1) % 1e6); raf = requestAnimationFrame(tick); return; }
      if (nextWaveAt && now >= nextWaveAt) {
        waveIndex += 1; nextWaveAt = 0; curWave.current = waveIndex;
        startBattleMusic();
        rats.current = cityWaveSpawns(waveIndex).map(p => makeRat(nextId++, p));
        setWave(waveIndex + 1);
        if (waveIndex === 0) {
          // Brix takes centre stage; Oz and Lowkey stand back on opposite sides of the street.
          stage.current = { Brix: { x: 50, y: 66 }, Oz: { x: 16, y: 72 }, Lowkey: { x: 84, y: 72 } };
          rats.current.forEach((r, i) => { r.mode = "pause"; r.t = -(i % 6) * 0.35; }); // staggered charges
          if (!attempt) {
            const lines: [Agent, string][] = [CITY_RAT_ARRIVAL[0]!, ["Brix", BRIX_SWARM_CALL], ...CITY_RAT_ARRIVAL.slice(1)];
            lines.forEach(([who, t], i) => later(i * ARRIVAL_GAP_MS, () => sayRef.current(who, t)));
          }
        } else stage.current = null;
      }
      // Revive: a standing Zig beside a downed one for 2s gets him back up.
      const sq = squadRef.current;
      for (const a of AGENTS) {
        if (sq[a] > 0) continue;
        const helper = AGENTS.some(b => b !== a && sq[b] > 0 && Math.hypot(crew.current[b].x - crew.current[a].x, crew.current[b].y - crew.current[a].y) < 8);
        reviveT.current[a] = helper ? reviveT.current[a] + dt * 1000 : Math.max(0, reviveT.current[a] - dt * 500);
        if (reviveT.current[a] >= REVIVE_MS) { reviveT.current[a] = 0; setSq(revive(squadRef.current, a)); sayRef.current(a, UP_LINES[a]); }
      }
      // Rats only chase Zigs still standing; Brix's swarm goes for Brix while he's up.
      const up = AGENTS.filter(a => squadRef.current[a] > 0);
      const pool = Object.fromEntries(up.map(a => [a, crew.current[a]])) as Record<Agent, Point>;
      const b = crew.current.Brix;
      const targets = waveIndex === 0 && squadRef.current.Brix > 0 ? { Brix: b } as Record<Agent, Point> : pool;
      if (up.length) for (const r of rats.current) stepRat(r, dt, targets, hurt);
      separateRats(rats.current, dt);
      rats.current = rats.current.filter(r => !r.dead || now - r.dead < 900);
      if (waveIndex >= 0 && rats.current.length === 0 && !nextWaveAt) {
        setSq(heal(squadRef.current));
        if (waveIndex === CITY_WAVES - 1) {
          stage.current = null;
          // Anyone still down gets back up once the street is clear.
          let s = squadRef.current; for (const a of AGENTS) s = revive(s, a); setSq(s);
          stopBattleMusic(); setCleared(true); force(f => f + 1);
          clearedCallback.current();
          return;
        }
        if (waveIndex === 0) {
          // Swarm beaten: the others rejoin Brix, then normal companion play resumes.
          stage.current = { Oz: { x: b.x - 9, y: b.y + 1 }, Lowkey: { x: b.x + 9, y: b.y + 1 } };
          SWARM_CLEARED.forEach(([who, t], i) => later(400 + i * ARRIVAL_GAP_MS, () => sayRef.current(who, t)));
          later(3200, () => { stage.current = null; });
          nextWaveAt = now + 5200;
        } else nextWaveAt = now + 1800;
      }
      force(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; stopBattleMusic(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); hitRef.current = () => false; };
  }, [crew, hitRef, onAlarm, attempt]);

  const retry = (from: number) => { startWave.current = from; rats.current = []; setAttempt(a => a + 1); };
  const now = performance.now();
  const ratH = ozH * 0.95 / 0.78, ratW = ratH * 340 / 250;

  return <>
    {wave > 0 && !cleared && <div className="boss-hud" role="status" aria-label={`Rat wave ${wave} of ${CITY_WAVES}`}>
      <div className="boss-hud-row"><span className="boss-name">RATS</span><span>WAVE {wave} / {CITY_WAVES}</span></div>
      <div className="boss-hud-row crew squad-row">
        {AGENTS.map(a => <span key={a} className={`squad-pips ${squad[a] <= 0 ? "is-down" : ""}`} aria-label={`${a} ${squad[a]} of ${MAX_HP[a]}`}>
          <span className="boss-name">{a.toUpperCase()}</span>
          {Array.from({ length: MAX_HP[a] }, (_, i) => <span key={i} className={`pip ${i < squad[a] ? "on" : ""}`}/>)}
        </span>)}
      </div>
    </div>}
    {wave > 0 && !cleared && AGENTS.map(a => {
      const p = crew.current[a];
      return <span key={a} className={`zig-pips ${squad[a] <= 0 ? "is-down" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-hidden="true">
        {squad[a] <= 0
          ? <span className="revive-bar"><span style={{ width: `${Math.min(100, reviveT.current[a] / REVIVE_MS * 100)}%` }}/></span>
          : Array.from({ length: MAX_HP[a] }, (_, i) => <span key={i} className={`pip ${i < squad[a] ? "on" : ""}`}/>)}
      </span>;
    })}
    {rats.current.map(r => <RatSprite key={r.id} r={r} w={ratW} h={ratH} now={now}/>)}
    {defeat && <div className={`defeat-fade ${defeat === "over" ? "is-over" : ""}`} aria-hidden="true"/>}
    {defeat === "over" && <GameOverScreen onRetry={() => retry(Math.max(0, curWave.current))} onRestart={() => retry(0)} onSanctuary={onSanctuary}/>}
  </>;
}
