import { playSfx } from "@/lib/atmosphere";
import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { RatSprite } from "@/components/RatSprite";
import { DEFAULT_BOUNDS, makeRat, stepRat, zapRats, type CombatApi, type Rat } from "@/lib/rat-ai";
import { cityWaveSpawns, CITY_WAVES } from "@/lib/city-waves";
import { startBattleMusic, stopBattleMusic } from "@/lib/atmosphere";
import type { Agent, Point } from "@/lib/zones";

/** Nine finite directional waves, isolated from the scene's story progression. */

export function OldCityRats({ stageRef, hitRef, combatRef, crew, onAlarm }: {
  combatRef?: MutableRefObject<CombatApi>;
  stageRef: RefObject<HTMLDivElement | null>;
  hitRef: MutableRefObject<(p: Point) => boolean>;
  crew: MutableRefObject<Record<Agent, Point>>;
  onAlarm: (situation: string) => void;
}) {
  const [, force] = useState(0);
  const rats = useRef<Rat[]>([]);
  const [ozH, setOzH] = useState(40);
  const [crewHp, setCrewHp] = useState(100);
  const crewHpRef = useRef(100);
  const [wave, setWave] = useState(0);
  const [cleared, setCleared] = useState(false);

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
    combatRef.current = { targets: () => rats.current.filter(r => !r.dead).map(r => ({ x: r.x, y: r.y })), bounds: () => DEFAULT_BOUNDS };
    return () => { combatRef.current = { targets: () => [], bounds: () => DEFAULT_BOUNDS }; };
  }, [combatRef]);

  useEffect(() => {
    let alive = true, raf = 0, last = performance.now(), waveIndex = -1, nextWaveAt = last + 1200, nextId = 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const hurt = (n: number) => { playSfx("hurt"); crewHpRef.current = Math.max(15, crewHpRef.current - n); setCrewHp(crewHpRef.current); };

    rats.current = []; crewHpRef.current = 100; setCrewHp(100); setWave(0); setCleared(false);

    hitRef.current = (p: Point) => zapRats(rats.current, p, crew.current);

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (nextWaveAt && now >= nextWaveAt) {
        waveIndex += 1; nextWaveAt = 0;
        if (waveIndex === 0) startBattleMusic();
        rats.current = cityWaveSpawns(waveIndex).map(p => makeRat(nextId++, p));
        setWave(waveIndex + 1);
        if (waveIndex === 0) later(300, () => onAlarm("Mutant rats are charging down the avenue and rushing in from beside the wrecked bus and the temple steps!"));
      }
      // Rats scurry at the nearest Zig, nip, then hop back and try again.
      for (const r of rats.current) stepRat(r, dt, crew.current, hurt);
      rats.current = rats.current.filter(r => !r.dead || now - r.dead < 900);
      if (waveIndex >= 0 && rats.current.length === 0 && !nextWaveAt) {
        if (waveIndex === CITY_WAVES - 1) {
          stopBattleMusic(); setCleared(true); force(f => f + 1);
          return;
        }
        nextWaveAt = now + 1800;
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
