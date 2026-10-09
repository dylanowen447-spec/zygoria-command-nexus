import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import ratSheet from "@/assets/mutant-rat.png.asset.json";
import sheltonSheet from "@/assets/shelton.webp.asset.json";
import type { Agent, Point } from "@/lib/zones";

/** Long Walk ambush: three waves of three rats, then Shelton (shell blocks, open after his lunge, retreats alive). Self-contained so the scene's own exploration is untouched. */
const KEY = "zygoria-longwalk-ambush-v1";
const RAT_FRAMES = 13, SHEL_FRAMES = 18;
const WAVES: Point[][] = [
  [{ x: 4, y: 70 }, { x: 8, y: 92 }, { x: 30, y: 98 }],
  [{ x: 40, y: 40 }, { x: 3, y: 55 }, { x: 55, y: 96 }],
  [{ x: 70, y: 96 }, { x: 60, y: 44 }, { x: 2, y: 82 }],
];
type Rat = { id: number; x: number; y: number; dead: number; bite: number; flip: boolean };
type ShelState = "enter" | "taunt" | "windup" | "lunge" | "open" | "hit" | "shell" | "retreat" | "beaten" | "flee" | "gone";
const STAGES = [
  { windup: 0.8, lunge: 34, open: 2.3, taunt: 2.6, rats: 0, name: "SHELL GUARD" },
  { windup: 0.6, lunge: 42, open: 1.8, taunt: 2.0, rats: 2, name: "SPIKE RUSH" },
  { windup: 0.45, lunge: 50, open: 1.4, taunt: 1.4, rats: 3, name: "ENRAGED" },
];
const HITS_PER_STAGE = 3, MAX_HP = 10, CREW_FLOOR = 15; // each zap = 10% of Shelton's health; retreats after hits 3 and 6
type Shel = { x: number; y: number; state: ShelState; t: number; hits: number; flip: boolean; target: Point; blocked: number; stage: number };

const SHEL_LINES = {
  enter: "Well, well. Fresh eggs, wandering my road.",
  block: ["Ha! Shell's too thick, sparky.", "That tickles.", "Try harder."],
  hit: ["OI!", "Lucky shot!", "Argh — my chain!", "Stop THAT!", "My spines!", "Cheap shot!"],
  retreat: ["Ugh — you'll pay for that!", "Right. No more playing nice!"],
  stage: ["Round two, eggs!", "NOW I'm angry!"],
  beaten: "Fine. FINE. Kronk will hear about this!",
};

export function LongWalkAmbush({ stageRef, hitRef, crew, onSay, onAlarm }: {
  stageRef: RefObject<HTMLDivElement | null>;
  hitRef: MutableRefObject<(p: Point) => boolean>;
  crew: MutableRefObject<Record<Agent, Point>>;
  onSay: (who: Agent, text: string) => void;
  onAlarm?: (situation: string) => void;
}) {
  const [, force] = useState(0);
  const rats = useRef<Rat[]>([]);
  const shel = useRef<Shel | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [shelSay, setShelSay] = useState<string | null>(null);
  const [size, setSize] = useState({ lowkey: 50, oz: 40 });
  const wave = useRef(-1);
  const [crewHp, setCrewHp] = useState(100);
  const crewHpRef = useRef(100);
  const fight = useRef<{ start: number; end: number } | null>(null);
  const sparks = useRef<{ id: number; x: number; y: number; kind: "block" | "hit" }[]>([]);

  // Shelton matches Lowkey's on-screen height; rats stand 5% shorter than Oz.
  useEffect(() => {
    const measure = () => {
      const st = stageRef.current; if (!st) return;
      const lk = st.querySelector(".marker-lowkey .sheet-sprite")?.getBoundingClientRect().height;
      const oz = st.querySelector(".marker-oz .sheet-sprite")?.getBoundingClientRect().height;
      if (lk && oz) setSize(s => (Math.abs(s.lowkey - lk) > 0.5 || Math.abs(s.oz - oz) > 0.5 ? { lowkey: lk, oz } : s));
    };
    measure(); const id = setInterval(measure, 1000);
    return () => clearInterval(id);
  }, [stageRef]);

  useEffect(() => {
    try { if (localStorage.getItem(KEY) === "done") return; } catch { /* play anyway */ }
    let alive = true, raf = 0, last = performance.now(), nextId = 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const shelLine = (t: string, ms = 2400) => { setShelSay(t); later(ms, () => setShelSay(s => (s === t ? null : s))); };
    const nearestCrew = (p: Point) => (Object.entries(crew.current) as [Agent, Point][]).reduce((b, c) => (Math.hypot(c[1].x - p.x, c[1].y - p.y) < Math.hypot(b[1].x - p.x, b[1].y - p.y) ? c : b));

    const startWave = (n: number) => {
      wave.current = n;
      setBanner(`RATS · WAVE ${n + 1} OF 3`); later(1800, () => setBanner(null));
      rats.current = WAVES[n]!.map(p => ({ id: nextId++, x: p.x, y: p.y, dead: 0, bite: 0, flip: false }));
      if (n === 0) later(300, () => onAlarm?.("A pack of snarling mutant rats just burst from the grass on the long walk and is charging you!"));
    };
    const hurt = (n: number) => { crewHpRef.current = Math.max(CREW_FLOOR, crewHpRef.current - n); setCrewHp(crewHpRef.current); };
    const spawnRats = (n: number) => { for (let i = 0; i < n; i++) { const p = WAVES[i % 3]![(i + 1) % 3]!; rats.current.push({ id: nextId++, x: p.x, y: p.y, dead: 0, bite: 0, flip: false }); } };
    const startShelton = () => {
      wave.current = 3;
      fight.current = { start: performance.now(), end: 0 };
      shel.current = { x: 104, y: 64, state: "enter", t: 0, hits: 0, flip: true, target: { x: 74, y: 64 }, blocked: 0, stage: 0 };
      later(400, () => onSay("Brix", "Something bigger's coming."));
    };
    later(2500, () => startWave(0));

    hitRef.current = (p: Point) => {
      let hit = false;
      for (const r of rats.current) {
        if (r.dead || Math.abs(r.x - p.x) > 4.5 || Math.abs(r.y - 2.5 - p.y) > 6) continue;
        r.dead = performance.now(); hit = true; break;
      }
      const s = shel.current;
      if (!hit && s && !["beaten", "flee", "gone", "retreat", "enter"].includes(s.state) && Math.abs(s.x - p.x) < 6 && Math.abs(s.y - 5 - p.y) < 9) {
        hit = true;
        const sid = performance.now(); const spot = { id: sid, x: p.x, y: p.y };
        if (s.state === "open") {
          s.hits += 1; s.state = "hit"; s.t = 0;
          sparks.current.push({ ...spot, kind: "hit" });
          if (s.hits >= MAX_HP) { s.state = "beaten"; if (fight.current) fight.current.end = performance.now(); shelLine(SHEL_LINES.beaten, 3200); }
          else if (s.hits % HITS_PER_STAGE === 0) { s.state = "retreat"; s.t = 0; shelLine(SHEL_LINES.retreat[s.stage]!, 1800); setBanner(`SHELTON RETREATS`); later(1600, () => setBanner(null)); }
          else shelLine(SHEL_LINES.hit[(s.hits - 1) % SHEL_LINES.hit.length]!, 1500);
        } else {
          sparks.current.push({ ...spot, kind: "block" });
          if (s.state === "taunt") { s.state = "shell"; s.t = 0; }
          if (performance.now() - s.blocked > 4000) { s.blocked = performance.now(); shelLine(SHEL_LINES.block[Math.floor(Math.random() * 3)]!, 1400); }
        }
        setTimeout(() => { sparks.current = sparks.current.filter(v => v.id !== sid); }, 380);
      }
      return hit;
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
        if (d < 2.6) { r.bite = 0.7; hurt(3); continue; }
        const sp = 19 * dt; r.x += dx / d * sp; r.y += dy / d * sp; r.flip = dx < 0;
      }
      rats.current = rats.current.filter(r => !r.dead || now - r.dead < 900);
      if (wave.current >= 0 && wave.current < 3 && rats.current.length === 0) {
        const n = wave.current; wave.current = 10 + n;
        later(2200, () => (n < 2 ? startWave(n + 1) : startShelton()));
      }
      // Shelton's fight loop.
      const s = shel.current;
      if (s) {
        s.t += dt;
        const oz = crew.current.Oz;
        const st = STAGES[s.stage]!;
        const moveTo = (p: Point, sp: number) => { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy); if (d < sp * dt) { s.x = p.x; s.y = p.y; return true; } s.x += dx / d * sp * dt; s.y += dy / d * sp * dt; s.flip = dx < 0; return false; };
        if (s.state === "enter" && moveTo(s.target, s.stage ? 16 : 9)) { s.state = "taunt"; s.t = 0; if (s.stage) return void (raf = requestAnimationFrame(tick)); shelLine(SHEL_LINES.enter, 3000); later(1200, () => onSay("Oz", "Who's the tortoise with the bling?")); }
        else if (s.state === "taunt" && s.t > st.taunt) { s.state = "windup"; s.t = 0; s.flip = oz.x < s.x; }
        else if (s.state === "windup" && s.t > st.windup) { s.state = "lunge"; s.t = 0; s.target = { x: oz.x + (oz.x < s.x ? 5 : -5), y: oz.y }; }
        else if (s.state === "lunge" && (moveTo(s.target, st.lunge) || s.t > 0.9)) { s.state = "open"; s.t = 0; if (Math.hypot(oz.x - s.x, oz.y - s.y) < 7) hurt(5); if (s.hits === 0) later(200, () => onSay("Brix", "He's open after he charges — NOW, Oz!")); }
        else if (s.state === "open" && s.t > st.open) { s.state = "shell"; s.t = 0; }
        else if (s.state === "hit" && s.t > 0.6) { s.state = "shell"; s.t = 0; }
        else if (s.state === "shell" && s.t > 1.4) { s.state = "taunt"; s.t = 0; }
        else if (s.state === "taunt") moveTo({ x: Math.min(80, Math.max(30, oz.x + (oz.x < 55 ? 18 : -18))), y: Math.min(80, Math.max(50, oz.y)) }, 4);
        else if (s.state === "retreat" && moveTo({ x: 108, y: 58 }, 26)) {
          s.stage += 1; s.state = "enter"; s.t = 0; s.target = { x: 72, y: 62 };
          setBanner(`SHELTON · ${STAGES[s.stage]!.name}`); later(1800, () => setBanner(null));
          spawnRats(STAGES[s.stage]!.rats);
          later(300, () => shelLine(SHEL_LINES.stage[s.stage - 1]!, 2000));
        }
        else if (s.state === "beaten" && s.t > 3.2) { s.state = "flee"; s.t = 0; }
        else if (s.state === "flee" && moveTo({ x: 110, y: 52 }, 22)) {
          s.state = "gone"; shel.current = null; fight.current = null;
          try { localStorage.setItem(KEY, "done"); } catch { /* fine */ }
          later(500, () => onSay("Lowkey", "Kronk. Remember that name."));
        }
      }
      force(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); hitRef.current = () => false; };
  }, [crew, hitRef, onSay]);

  const now = performance.now();
  const ratH = size.oz * 0.95 / 0.78, ratW = ratH * 340 / 250;
  const shelH = size.lowkey / 0.92;
  const s = shel.current;
  const shelFrame = !s ? 0 : s.state === "enter" || s.state === "flee" || s.state === "retreat" ? (s.state !== "enter" ? 17 : 1 + Math.floor(now / 110) % 6)
    : s.state === "taunt" ? (Math.floor(now / 600) % 2 ? 11 : 0) : s.state === "windup" ? 7 : s.state === "lunge" ? 8 : s.state === "open" ? 9
    : s.state === "hit" ? 12 + Math.min(2, Math.floor(s.t / 0.2)) : s.state === "shell" ? 10 : s.state === "beaten" ? 15 : 0;
  const bg = (url: string, frames: number, i: number): CSSProperties => ({ backgroundImage: `url(${url})`, backgroundSize: `${frames * 100}% 100%`, backgroundPosition: `${(i / (frames - 1)) * 100}% 0` });

  return <>
    {rats.current.map(r => {
      const f = r.dead ? 12 : r.bite > 0 ? 9 + (r.bite > 0.35 ? 0 : 1) : 4 + Math.floor(now / 90) % 4;
      return <span key={r.id} className={`ambush-rat ${r.dead ? "is-dead" : ""}`} aria-hidden="true"
        style={{ left: `${r.x}%`, top: `${r.y}%`, width: ratW, height: ratH, zIndex: 10 + Math.round(r.y * 10), transform: `translate(-50%,-100%) scaleX(${r.flip ? -1 : 1})`, ...bg(ratSheet.url, RAT_FRAMES, f) }}/>;
    })}
    {s && <span className="ambush-shelton" aria-label="Shelton" style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: 10 + Math.round(s.y * 10) }}>
      {shelSay && <span className="idle-bubble ambush-bubble">{shelSay}</span>}
      <span className={`ambush-shelton-art ${s.state === "open" ? "is-open" : ""}`} style={{ width: shelH, height: shelH, transform: `scaleX(${s.flip ? -1 : 1})`, ...bg(sheltonSheet.url, SHEL_FRAMES, shelFrame) }}/>
    </span>}
    {sparks.current.map(k => <span key={k.id} className={`ambush-spark is-${k.kind}`} style={{ left: `${k.x}%`, top: `${k.y}%` }} aria-hidden="true">{k.kind === "block" ? "BLOCKED" : "HIT!"}</span>)}
    {s && fight.current && <div className="boss-hud" role="status" aria-label="Boss fight">
      <div className="boss-hud-row"><span className="boss-name">SHELTON <small>{STAGES[s.stage]?.name}</small></span><span className="boss-timer">{(() => { const t = Math.floor(((fight.current.end || now) - fight.current.start) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; })()}</span></div>
      <div className="boss-bar"><span className="boss-bar-fill" style={{ width: `${(1 - s.hits / MAX_HP) * 100}%` }}/>{STAGES.slice(1).map((_, i) => <span key={i} className="boss-bar-notch" style={{ left: `${((i + 1) / STAGES.length) * 100}%` }}/>)}</div>
      <div className="boss-hud-row crew"><span className="boss-name">CREW</span><span className="boss-bar crew-bar"><span className="boss-bar-fill" style={{ width: `${crewHp}%` }}/></span></div>
    </div>}
    {banner && <div className="ambush-banner" role="status">{banner}</div>}
  </>;
}
