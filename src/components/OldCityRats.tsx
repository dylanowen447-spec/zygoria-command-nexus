import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import ratSheet from "@/assets/mutant-rat.png.asset.json";
import type { Agent, Point } from "@/lib/zones";

/** Old City ambush: three mutant rats rush the Zigs. One zap from Oz kills each; they never respawn. Self-contained so the scene's own exploration is untouched. */
const KEY = "zygoria-oldcity-rats-v1";
const RAT_FRAMES = 13;
const SPAWNS: Point[] = [{ x: 6, y: 78 }, { x: 92, y: 70 }, { x: 12, y: 40 }];
type Rat = { id: number; x: number; y: number; dead: number; bite: number; flip: boolean };

export function OldCityRats({ stageRef, hitRef, crew, onSay }: {
  stageRef: RefObject<HTMLDivElement | null>;
  hitRef: MutableRefObject<(p: Point) => boolean>;
  crew: MutableRefObject<Record<Agent, Point>>;
  onSay: (who: Agent, text: string) => void;
}) {
  const [, force] = useState(0);
  const rats = useRef<Rat[]>([]);
  const [ozH, setOzH] = useState(40);

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
    let alive = true, raf = 0, last = performance.now();
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const nearestCrew = (p: Point) => (Object.entries(crew.current) as [Agent, Point][]).reduce((b, c) => (Math.hypot(c[1].x - p.x, c[1].y - p.y) < Math.hypot(b[1].x - p.x, b[1].y - p.y) ? c : b));

    later(9000, () => {
      rats.current = SPAWNS.map((p, i) => ({ id: i + 1, x: p.x, y: p.y, dead: 0, bite: 0, flip: false }));
      later(700, () => onSay("Lowkey", "Movement. Something's in the rubble."));
      later(2600, () => onSay("Brix", "Rats. Big ones. Oz — light them up!"));
    });

    hitRef.current = (p: Point) => {
      for (const r of rats.current) {
        if (r.dead || Math.abs(r.x - p.x) > 4.5 || Math.abs(r.y - 2.5 - p.y) > 6) continue;
        r.dead = performance.now();
        return true;
      }
      return false;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // Rats scurry at the nearest Zig, nip, then hop back and try again.
      for (const r of rats.current) {
        if (r.dead) continue;
        const [, c] = nearestCrew(r);
        const dx = c.x - r.x, dy = c.y - r.y, d = Math.hypot(dx, dy);
        if (r.bite > 0) { r.bite -= dt; if (r.bite <= 0) { r.x -= dx / d * 6; r.y -= dy / d * 4; } continue; }
        if (d < 2.6) { r.bite = 0.7; continue; }
        const sp = 7 * dt; r.x += dx / d * sp; r.y += dy / d * sp; r.flip = dx < 0;
      }
      rats.current = rats.current.filter(r => !r.dead || now - r.dead < 900);
      if (rats.current.length === 0) {
        try { localStorage.setItem(KEY, "done"); } catch { /* fine */ }
        return; // all dead: stop the loop, the city simply goes quiet
      }
      force(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); hitRef.current = () => false; };
  }, [crew, hitRef, onSay]);

  const now = performance.now();
  const ratH = ozH * 0.95 / 0.78, ratW = ratH * 340 / 250;
  const bg = (url: string, frames: number, i: number): CSSProperties => ({ backgroundImage: `url(${url})`, backgroundSize: `${frames * 100}% 100%`, backgroundPosition: `${(i / (frames - 1)) * 100}% 0` });

  return <>
    {rats.current.map(r => {
      const f = r.dead ? 12 : r.bite > 0 ? 9 + (r.bite > 0.35 ? 0 : 1) : 4 + Math.floor(now / 90) % 4;
      return <span key={r.id} className={`ambush-rat ${r.dead ? "is-dead" : ""}`} aria-hidden="true"
        style={{ left: `${r.x}%`, top: `${r.y}%`, width: ratW, height: ratH, zIndex: 10 + Math.round(r.y * 10), transform: `translate(-50%,-100%) scaleX(${r.flip ? -1 : 1})`, ...bg(ratSheet.url, RAT_FRAMES, f) }}/>;
    })}
  </>;
}
