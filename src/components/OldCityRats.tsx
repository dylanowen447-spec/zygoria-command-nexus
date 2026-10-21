import { playSfx } from "@/lib/atmosphere";
import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { RatSprite } from "@/components/RatSprite";
import { DEFAULT_BOUNDS, brixShockwave, hitCtx, makeRat, separateRats, stepRat, zapRats, type CombatApi, type Rat, type StagePlan } from "@/lib/rat-ai";
import { cityWaveSpawns, CITY_WAVES } from "@/lib/city-waves";
import { startBattleMusic, stopBattleMusic } from "@/lib/atmosphere";
import type { Agent, Point } from "@/lib/zones";
import { CITY_RAT_ARRIVAL, ARRIVAL_GAP_MS, BRIX_SWARM_CALL, SWARM_CLEARED } from "@/lib/fight-lines";

/** Nine finite directional waves, isolated from the scene's story progression. */

export function OldCityRats({ stageRef, hitRef, combatRef, crew, onAlarm, onSay }: {
  combatRef?: MutableRefObject<CombatApi>;
  stageRef: RefObject<HTMLDivElement | null>;
  hitRef: MutableRefObject<(p: Point) => boolean>;
  crew: MutableRefObject<Record<Agent, Point>>;
  onAlarm: (situation: string) => void;
  onSay: (who: Agent, text: string) => void;
}) {
  const [, force] = useState(0);
  const rats = useRef<Rat[]>([]);
  const [ozH, setOzH] = useState(40);
  const [crewHp, setCrewHp] = useState(100);
  const crewHpRef = useRef(100);
  const [wave, setWave] = useState(0);
  const [cleared, setCleared] = useState(false);
  const stage = useRef<StagePlan>(null);

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

  useEffect(() => {
    let alive = true, raf = 0, last = performance.now(), waveIndex = -1, nextWaveAt = last + 1200, nextId = 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const hurt = (n: number) => { playSfx("hurt"); crewHpRef.current = Math.max(15, crewHpRef.current - n); setCrewHp(crewHpRef.current); };

    rats.current = []; crewHpRef.current = 100; setCrewHp(100); setWave(0); setCleared(false);

    // During Brix's swarm his blows also send a shockwave through the rats around the impact.
    hitRef.current = (p: Point) => {
      const by = hitCtx.by, heavy = hitCtx.heavy;
      const hit = zapRats(rats.current, p, crew.current);
      if (waveIndex === 0 && by === "Brix") { const n = brixShockwave(rats.current, p, crew.current.Brix, heavy ? 13 : 9); if (n) playSfx("punch-heavy"); return hit || n > 0; }
      return hit;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (nextWaveAt && now >= nextWaveAt) {
        waveIndex += 1; nextWaveAt = 0;
        if (waveIndex === 0) startBattleMusic();
        rats.current = cityWaveSpawns(waveIndex).map(p => makeRat(nextId++, p));
        setWave(waveIndex + 1);
        if (waveIndex === 0) {
          // Brix takes centre stage; Oz and Lowkey stand back on opposite sides of the street.
          stage.current = { Brix: { x: 50, y: 66 }, Oz: { x: 16, y: 72 }, Lowkey: { x: 84, y: 72 } };
          rats.current.forEach((r, i) => { r.mode = "pause"; r.t = -(i % 6) * 0.35; }); // staggered charges
          const lines: [Agent, string][] = [CITY_RAT_ARRIVAL[0]!, ["Brix", BRIX_SWARM_CALL], ...CITY_RAT_ARRIVAL.slice(1)];
          lines.forEach(([who, t], i) => later(i * ARRIVAL_GAP_MS, () => onSay(who, t)));
        } else stage.current = null;
      }
      // Rats scurry at the nearest Zig, nip, then hop back and try again.
      for (const r of rats.current) stepRat(r, dt, crew.current, hurt);
      separateRats(rats.current, dt);
      rats.current = rats.current.filter(r => !r.dead || now - r.dead < 900);
      if (waveIndex >= 0 && rats.current.length === 0 && !nextWaveAt) {
        if (waveIndex === CITY_WAVES - 1) {
          stopBattleMusic(); setCleared(true); force(f => f + 1);
          return;
        }
        if (waveIndex === 0) {
          // Swarm beaten: the others rejoin Brix, then normal companion play resumes.
          const b = crew.current.Brix;
          stage.current = { Oz: { x: b.x - 9, y: b.y + 1 }, Lowkey: { x: b.x + 9, y: b.y + 1 } };
          SWARM_CLEARED.forEach(([who, t], i) => later(400 + i * ARRIVAL_GAP_MS, () => onSay(who, t)));
          later(3200, () => { stage.current = null; });
          nextWaveAt = now + 5200;
        } else nextWaveAt = now + 1800;
      }
      force(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; stopBattleMusic(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); hitRef.current = () => false; };
  }, [crew, hitRef, onAlarm]);

  const now = performance.now();
  const ratH = ozH * 0.95 / 0.78, ratW = ratH * 340 / 250;

  return <>
    {wave > 0 && !cleared && <div className="boss-hud" role="status" aria-label={`Rat wave ${wave} of ${CITY_WAVES}`}>
      <div className="boss-hud-row"><span className="boss-name">RATS</span><span>WAVE {wave} / {CITY_WAVES}</span></div>
      {crewHp < 100 && <div className="boss-hud-row crew"><span className="boss-name">CREW</span><span className="boss-bar crew-bar"><span className="boss-bar-fill" style={{ width: `${crewHp}%` }}/></span></div>}
    </div>}
    {rats.current.map(r => <RatSprite key={r.id} r={r} w={ratW} h={ratH} now={now}/>)}
  </>;
}
