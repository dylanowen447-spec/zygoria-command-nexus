import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from "react";
import { RatSprite } from "@/components/RatSprite";
import { farSpawns, makeRat, stepRat, zapRats, type Rat } from "@/lib/rat-ai";
import type { Agent, Point } from "@/lib/zones";

/** Old City ambush: three mutant rats rush the Zigs. One zap from Oz kills each; they never respawn. Self-contained so the scene's own exploration is untouched. */
const KEY = "zygoria-oldcity-rats-v2";
// Far edges of the walkable street; the three farthest from the crew are used.
const SPAWNS: Point[] = [{ x: 4, y: 74 }, { x: 96, y: 70 }, { x: 8, y: 50 }, { x: 92, y: 52 }, { x: 50, y: 97 }];

export function OldCityRats({ stageRef, hitRef, crew, onAlarm }: {
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
    try { if (localStorage.getItem(KEY) === "done") return; } catch { /* play anyway */ }
    let alive = true, raf = 0, last = performance.now(), spawned = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const hurt = (n: number) => { crewHpRef.current = Math.max(15, crewHpRef.current - n); setCrewHp(crewHpRef.current); };

    later(2500, () => {
      spawned = true;
      rats.current = farSpawns(SPAWNS, crew.current, 3).map((p, i) => makeRat(i + 1, p));
      later(300, () => onAlarm("Three huge mutant rats just burst out of the Old City rubble and are charging straight at you!"));
    });

    hitRef.current = (p: Point) => zapRats(rats.current, p, crew.current);

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // Rats scurry at the nearest Zig, nip, then hop back and try again.
      for (const r of rats.current) stepRat(r, dt, crew.current, hurt);
      rats.current = rats.current.filter(r => !r.dead || now - r.dead < 900);
      if (spawned && rats.current.length === 0) {
        try { localStorage.setItem(KEY, "done"); } catch { /* fine */ }
        return; // all dead: stop the loop, the city simply goes quiet
      }
      force(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); hitRef.current = () => false; };
  }, [crew, hitRef, onAlarm]);

  const now = performance.now();
  const ratH = ozH * 0.95 / 0.78, ratW = ratH * 340 / 250;

  return <>
    {crewHp < 100 && <div className="boss-hud" role="status" aria-label="Crew health">
      <div className="boss-hud-row crew"><span className="boss-name">CREW</span><span className="boss-bar crew-bar"><span className="boss-bar-fill" style={{ width: `${crewHp}%` }}/></span></div>
    </div>}
    {rats.current.map(r => <RatSprite key={r.id} r={r} w={ratW} h={ratH} now={now}/>)}
  </>;
}
