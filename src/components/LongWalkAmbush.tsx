import { speak, preloadVoices } from "@/lib/voice";
import { RAT_ALARM, LONG_WALK_RAT_RECALL, SHELTON_FIRST_SIGHT, ARRIVAL_GAP_MS, FIGHT_LINES } from "@/lib/fight-lines";
import { playSfx } from "@/lib/atmosphere";
import { useEffect, useRef, useState, type CSSProperties, type MutableRefObject, type RefObject } from "react";
import { RatSprite } from "@/components/RatSprite";
import { DEFAULT_BOUNDS, farSpawns, makeRat, separateRats, stepRat, zapRats, type CombatApi, type Rat } from "@/lib/rat-ai";
import sheltonSheet from "@/assets/shelton.webp.asset.json";
import { startBattleMusic, stopBattleMusic } from "@/lib/atmosphere";
import battleArt from "@/assets/long-walk-battle.webp";
import type { Agent, Point } from "@/lib/zones";

/** Long Walk ambush: three waves of three rats, then Shelton (shell blocks, open after his lunge, retreats alive). Self-contained so the scene's own exploration is untouched. */
const KEY = "zygoria-longwalk-ambush-v1";
const SHEL_FRAMES = 18;
// Far edges of the road; each wave uses the spots farthest from the crew.
const EDGES: Point[] = [{ x: 3, y: 70 }, { x: 6, y: 94 }, { x: 30, y: 98 }, { x: 40, y: 42 }, { x: 3, y: 52 }, { x: 60, y: 97 }, { x: 62, y: 44 }, { x: 96, y: 66 }];
type ShelState = "enter" | "taunt" | "windup" | "lunge" | "open" | "hit" | "shell" | "retreat" | "beaten" | "flee" | "gone";
const STAGES = [
  { windup: 0.8, lunge: 34, open: 2.3, taunt: 2.6, rats: 0, name: "SHELL GUARD" },
  { windup: 0.6, lunge: 42, open: 1.8, taunt: 2.0, rats: 2, name: "SPIKE RUSH" },
  { windup: 0.45, lunge: 50, open: 1.4, taunt: 1.4, rats: 3, name: "ENRAGED" },
];
const RETREAT_AT = [7, 14], MAX_HP = 20, CREW_FLOOR = 15; // each zap = 10% of Shelton's health; retreats after hits 3 and 6
type Shel = { x: number; y: number; state: ShelState; t: number; hits: number; flip: boolean; target: Point; blocked: number; stage: number; hurt: number; path: Point[] };
/** Winding road from the far distance down onto the rocky plateau (artwork %); retreats walk it in reverse. */
const ROAD_IN: Point[] = [{ x: 22, y: 49 }, { x: 25, y: 55 }, { x: 28, y: 61 }, { x: 38, y: 65 }, { x: 50, y: 67 }, { x: 62, y: 68 }];
const ROAD_OUT: Point[] = [...ROAD_IN].reverse().slice(1);
/** Safe ground on the plateau: nobody fights over the cliffs. */
const PLAT = { x0: 36, x1: 80, y0: 58, y1: 86 };
const clampPlat = (p: Point): Point => ({ x: Math.min(PLAT.x1, Math.max(PLAT.x0, p.x)), y: Math.min(PLAT.y1, Math.max(PLAT.y0, p.y)) });
/** Perspective: small on the far road, full size from the plateau down. */
const persp = (y: number) => Math.min(1, Math.max(0.32, 0.32 + (y - 49) / (66 - 49) * 0.68));
/** Escort formation offsets (percent at full size): three rats on each side of Shelton. */
const ESCORT: Point[] = [{ x: -6, y: -1 }, { x: -10, y: 1.5 }, { x: -14, y: -0.5 }, { x: 6, y: -1 }, { x: 10, y: 1.5 }, { x: 14, y: -0.5 }];

const SHEL_LINES = {
  enter: "Well, well. Fresh eggs, wandering my road.",
  block: ["Ha! Shell's too thick, sparky.", "That tickles.", "Try harder."],
  hit: ["OI!", "Lucky shot!", "Argh — my chain!", "Stop THAT!", "My spines!", "Cheap shot!"],
  retreat: ["Ugh — you'll pay for that!", "Right. No more playing nice!"],
  stage: ["Round two, eggs!", "NOW I'm angry!"],
  beaten: "I'll be telling Kronk about this! Those three are definitely up to no good!",
};

export function LongWalkAmbush({ stageRef, hitRef, combatRef, crew, onSay, onAlarm, onDefeat }: {
  combatRef?: MutableRefObject<CombatApi>;
  stageRef: RefObject<HTMLDivElement | null>;
  hitRef: MutableRefObject<(p: Point) => boolean>;
  crew: MutableRefObject<Record<Agent, Point>>;
  onSay: (who: Agent, text: string) => void;
  onAlarm?: (situation: string) => void;
  onDefeat?: () => void;
}) {
  const [, force] = useState(0);
  const rats = useRef<Rat[]>([]);
  const shel = useRef<Shel | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [splash, setSplash] = useState(true);
  const [shelSay, setShelSay] = useState<string | null>(null);
  const [size, setSize] = useState({ lowkey: 50, oz: 40 });
  const wave = useRef(-1);
  const [crewHp, setCrewHp] = useState(100);
  const crewHpRef = useRef(100);
  const fight = useRef<{ start: number; end: number } | null>(null);
  const artRef = useRef<HTMLSpanElement | null>(null);
  const escorts = useRef<{ r: Rat; o: Point }[]>([]);
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

  // Direct combat reads live enemy positions; the plateau is the only safe ground once Shelton arrives.
  useEffect(() => {
    if (!combatRef) return;
    combatRef.current = {
      targets: () => {
        const out = rats.current.filter(r => !r.dead).map(r => ({ x: r.x, y: r.y }));
        const s = shel.current; if (s && !["gone", "flee", "beaten", "retreat", "enter"].includes(s.state)) out.push({ x: s.x, y: s.y });
        return out;
      },
      bounds: () => (wave.current === 3 ? PLAT : DEFAULT_BOUNDS),
    };
    return () => { combatRef.current = { targets: () => [], bounds: () => DEFAULT_BOUNDS }; };
  }, [combatRef]);

  // The splash holds the fight until the player taps through (or it steps aside on its own).
  useEffect(() => { if (!splash) return; const t = setTimeout(() => setSplash(false), 6000); return () => clearTimeout(t); }, [splash]);

  useEffect(() => {
    if (splash) return;
    try { if (localStorage.getItem(KEY) === "done") return; } catch { /* play anyway */ }
    let alive = true, raf = 0, last = performance.now(), nextId = 1;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) => timers.push(setTimeout(() => alive && fn(), ms));
    const shelLine = (t: string, ms = 2400) => { let shown = 0; void speak("Shelton", t, () => { if (!alive) return; shown = Date.now(); setShelSay(t); }, 2500).then(() => later(Math.max(300, ms - (Date.now() - shown)), () => setShelSay(s => (s === t ? null : s)))); };
    preloadVoices([SHEL_LINES.enter, SHEL_LINES.beaten, ...SHEL_LINES.retreat, ...SHEL_LINES.hit, ...SHEL_LINES.block, ...SHEL_LINES.stage].map(t => ["Shelton", t] as [string, string]).concat(SHELTON_FIRST_SIGHT, LONG_WALK_RAT_RECALL, FIGHT_LINES.map(l => [l.who, l.text] as [string, string]), [["Brix", "Something bigger's coming."], ["Oz", "OH HELLLL NAW! Who's this spiky tortoise with the gold chain?!"]]));

    const startWave = (n: number) => {
      wave.current = n; startBattleMusic();
      setBanner(`RATS · WAVE ${n + 1} OF 3`); later(1800, () => setBanner(null));
      rats.current = farSpawns(EDGES, crew.current, 3).map(p => makeRat(nextId++, p));
      if (n === 0) {
        void onAlarm; void RAT_ALARM;
        LONG_WALK_RAT_RECALL.forEach(([who, t], i) => later(i * ARRIVAL_GAP_MS, () => onSay(who, t)));
      }
    };
    const hurt = (n: number) => { playSfx("hurt"); crewHpRef.current = Math.max(CREW_FLOOR, crewHpRef.current - n); setCrewHp(crewHpRef.current); };
    const spawnRats = (n: number) => { for (const p of farSpawns(EDGES, crew.current, n)) rats.current.push(makeRat(nextId++, p)); };
    const startShelton = () => {
      wave.current = 3; startBattleMusic(true);
      fight.current = { start: performance.now(), end: 0 };
      const p0 = ROAD_IN[0]!;
      shel.current = { x: p0.x, y: p0.y, state: "enter", t: 0, hits: 0, flip: false, target: ROAD_IN[ROAD_IN.length - 1]!, blocked: 0, stage: 0, hurt: 0, path: ROAD_IN.slice(1) };
      // Six rats march in with him; they join the fight (existing rat behaviour) once he reaches the plateau.
      escorts.current = ESCORT.map(o => { const r = makeRat(nextId++, { x: p0.x + o.x * persp(p0.y), y: p0.y + o.y * persp(p0.y) }); rats.current.push(r); return { r, o }; });
      later(400, () => onSay("Brix", "Something bigger's coming."));
      SHELTON_FIRST_SIGHT.forEach(([who, t], i) => later(3200 + i * 2800, () => onSay(who, t)));
    };
    later(2500, () => startWave(0));

    // Hit test against Shelton's real on-screen artwork (plus a little leeway), so tall/scaled sprites register.
    const inShel = (s: Shel, p: Point) => {
      const st = stageRef.current, el = artRef.current;
      if (st && el) {
        const r = st.getBoundingClientRect(), a = el.getBoundingClientRect();
        if (r.width && a.width) {
          const l = (a.left - r.left) / r.width * 100, t = (a.top - r.top) / r.height * 100;
          const w = a.width / r.width * 100, h = a.height / r.height * 100, pad = 2.5;
          return p.x > l - pad && p.x < l + w + pad && p.y > t - pad && p.y < t + h + pad;
        }
      }
      return Math.abs(s.x - p.x) < 7 && Math.abs(s.y - 6 - p.y) < 11;
    };
    hitRef.current = (p: Point) => {
      let hit = zapRats(rats.current, p, crew.current);
      const s = shel.current;
      if (!hit && s && !["beaten", "flee", "gone", "retreat", "enter"].includes(s.state) && inShel(s, p)) {
        hit = true;
        const sid = performance.now(); const spot = { id: sid, x: p.x, y: p.y };
        if (s.state !== "shell" && performance.now() - s.hurt > 350) {
          s.hits += 1; s.state = "hit"; s.t = 0; s.hurt = performance.now();
          { const oz = crew.current.Oz; s.x = clampPlat({ x: s.x + (s.x >= oz.x ? 3 : -3), y: s.y }).x; }
          sparks.current.push({ ...spot, kind: "hit" });
          if (s.hits >= MAX_HP) { s.state = "beaten"; if (fight.current) fight.current.end = performance.now(); shelLine(SHEL_LINES.beaten, 3200); }
          else if (RETREAT_AT.includes(s.hits)) { s.state = "retreat"; s.t = 0; s.path = [...ROAD_OUT]; shelLine(SHEL_LINES.retreat[s.stage]!, 1800); setBanner(`SHELTON RETREATS`); later(1600, () => setBanner(null)); }
          else shelLine(SHEL_LINES.hit[(s.hits - 1) % SHEL_LINES.hit.length]!, 1500);
        } else {
          sparks.current.push({ ...spot, kind: "block" });
          
          if (performance.now() - s.blocked > 4000) { s.blocked = performance.now(); shelLine(SHEL_LINES.block[Math.floor(Math.random() * 3)]!, 1400); }
        }
        setTimeout(() => { sparks.current = sparks.current.filter(v => v.id !== sid); }, 520);
      }
      return hit;
    };

    const tick = (now: number) => {
      if (!alive) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      // Rats scurry at the nearest Zig, nip, then hop back and try again.
      const marching = new Set(escorts.current.map(e => e.r));
      for (const r of rats.current) {
        if (marching.has(r)) continue;
        stepRat(r, dt, crew.current, hurt);
        if (wave.current === 3 && !r.dead) { const c = clampPlat(r); r.x = c.x; r.y = c.y; }
      }
      separateRats(rats.current.filter(r => !marching.has(r)), dt);
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
        const follow = (sp: number) => { const p = s.path[0]; if (!p) return true; const k = persp(s.y); if (moveTo(p, sp * k)) s.path.shift(); return s.path.length === 0; };
        const moveTo = (p: Point, sp: number) => { const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy); if (d < sp * dt) { s.x = p.x; s.y = p.y; return true; } s.x += dx / d * sp * dt; s.y += dy / d * sp * dt; s.flip = dx < 0; return false; };
        if (s.state === "enter") {
          const k = persp(s.y);
          for (const e of escorts.current) { if (e.r.dead) continue; e.r.x = s.x + e.o.x * k; e.r.y = s.y + e.o.y * k; e.r.flip = s.flip; e.r.mode = "charge"; }
        }
        if (s.state === "enter" && follow(s.stage ? 16 : 9)) { s.state = "taunt"; s.t = 0; escorts.current = []; if (s.stage) return void (raf = requestAnimationFrame(tick)); shelLine(SHEL_LINES.enter, 3000); later(1200, () => onSay("Oz", "OH HELLLL NAW! Who's this spiky tortoise with the gold chain?!")); }
        else if (s.state === "taunt" && s.t > st.taunt) { s.state = "windup"; s.t = 0; s.flip = oz.x < s.x; }
        else if (s.state === "windup" && s.t > st.windup) { s.state = "lunge"; s.t = 0; s.target = clampPlat({ x: oz.x + (oz.x < s.x ? 5 : -5), y: oz.y }); }
        else if (s.state === "lunge" && (moveTo(s.target, st.lunge) || s.t > 0.9)) { s.state = "open"; s.t = 0; if (Math.hypot(oz.x - s.x, oz.y - s.y) < 7) hurt(3); if (s.hits === 0) later(200, () => onSay("Brix", "He's open after he charges — NOW, Oz!")); }
        else if (s.state === "open" && s.t > st.open) { s.state = "shell"; s.t = 0; }
        else if (s.state === "hit" && s.t > 0.6) { s.state = "taunt"; s.t = 0; }
        else if (s.state === "shell" && s.t > 0.9) { s.state = "taunt"; s.t = 0; }
        else if (s.state === "taunt") moveTo(clampPlat({ x: oz.x + (oz.x < 55 ? 18 : -18), y: oz.y }), 4);
        else if (s.state === "retreat" && follow(26)) {
          s.stage += 1; s.state = "enter"; s.t = 0; s.path = ROAD_IN.slice(1);
          setBanner(`SHELTON · ${STAGES[s.stage]!.name}`); later(1800, () => setBanner(null));
          spawnRats(STAGES[s.stage]!.rats);
          later(300, () => shelLine(SHEL_LINES.stage[s.stage - 1]!, 2000));
        }
        else if (s.state === "beaten" && s.t > 3.2) { stopBattleMusic(); s.state = "flee"; s.t = 0; s.path = [...ROAD_OUT]; }
        else if (s.state === "flee" && follow(22)) {
          s.state = "gone"; shel.current = null; fight.current = null;
          try { localStorage.setItem(KEY, "done"); } catch { /* fine */ }
          onDefeat?.();
          later(500, () => onSay("Lowkey", "Kronk. Remember that name."));
        }
      }
      force(f => (f + 1) % 1e6);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { alive = false; stopBattleMusic(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); hitRef.current = () => false; };
  }, [splash, crew, hitRef, onSay]);

  const now = performance.now();
  const ratH = size.oz * 0.95 / 0.78, ratW = ratH * 340 / 250;
  const shelH = size.lowkey / 0.92 * 1.5; // 50% bigger than Lowkey-matched
  const s = shel.current;
  const shelFrame = !s ? 0 : s.state === "enter" || s.state === "flee" || s.state === "retreat" ? 1 + Math.floor(now / 110) % 6
    : s.state === "taunt" ? (Math.floor(now / 600) % 2 ? 11 : 0) : s.state === "windup" ? 7 : s.state === "lunge" ? 8 : s.state === "open" ? 9
    : s.state === "hit" ? 12 + Math.min(2, Math.floor(s.t / 0.2)) : s.state === "shell" ? 10 : s.state === "beaten" ? 15 : 0;
  const bg = (url: string, frames: number, i: number): CSSProperties => ({ backgroundImage: `url(${url})`, backgroundSize: `${frames * 100}% 100%`, backgroundPosition: `${(i / (frames - 1)) * 100}% 0` });

  return <>
    {splash && <button type="button" className="battle-splash" onClick={() => setSplash(false)} aria-label="The Long Walk ambush — tap to fight">
      <img src={battleArt} alt="Oz, Brix and Lowkey face Shelton and his rats on the broken highway" draggable={false}/>
      <span className="battle-splash-hint">TAP TO FIGHT</span>
    </button>}
    {rats.current.map(r => { const k = escorts.current.some(e => e.r === r) ? persp(r.y) : 1; return <RatSprite key={r.id} r={r} w={ratW * k} h={ratH * k} now={now}/>; })}
    {s && <span className="ambush-shelton" aria-label="Shelton" style={{ left: `${s.x}%`, top: `${s.y}%`, zIndex: 10 + Math.round(s.y * 10) }}>
      {shelSay && <span className="idle-bubble ambush-bubble">{shelSay}</span>}
      {s.state !== "gone" && (() => { const st = stageRef.current, a = artRef.current; const below = !!(st && a && st.clientHeight && (s.y - (a.clientHeight / st.clientHeight) * 100) < 7); return <span className={`shel-overhead${below ? " is-below" : ""}`} aria-label={`Shelton health ${Math.round(Math.max(0, MAX_HP - s.hits) / MAX_HP * 100)}%`}><span className="shel-overhead-name">SHELTON</span><span className="shel-overhead-bar"><span style={{ width: `${Math.max(0, 1 - s.hits / MAX_HP) * 100}%` }}/></span></span>})()}
      <span ref={artRef} className={`ambush-shelton-art ${s.state === "open" ? "is-open" : ""} ${now - s.hurt < 380 ? "is-hurt" : ""}`} style={{ width: shelH * persp(s.y), height: shelH * persp(s.y), transform: `scaleX(${s.flip ? -1 : 1})`, ...bg(sheltonSheet.url, SHEL_FRAMES, shelFrame) }}/>
    </span>}
    {sparks.current.map(k => <span key={k.id} className={`ambush-spark is-${k.kind}`} style={{ left: `${k.x}%`, top: `${k.y}%` }} aria-hidden="true">{k.kind === "hit" && <span className="ambush-impact"/>}<span className="ambush-spark-text">{k.kind === "block" ? "BLOCKED" : "HIT! −5%"}</span></span>)}
    {s && fight.current && <div className="boss-hud" role="status" aria-label="Boss fight">
      <div className="boss-hud-row"><span className="boss-name">SHELTON <small>{STAGES[s.stage]?.name}</small></span><span className="boss-timer">{(() => { const t = Math.floor(((fight.current.end || now) - fight.current.start) / 1000); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`; })()}</span></div>
      <div className="boss-bar"><span className="boss-bar-fill" style={{ width: `${(1 - s.hits / MAX_HP) * 100}%` }}/>{STAGES.slice(1).map((_, i) => <span key={i} className="boss-bar-notch" style={{ left: `${((i + 1) / STAGES.length) * 100}%` }}/>)}</div>
      <div className="boss-hud-row crew"><span className="boss-name">CREW</span><span className="boss-bar crew-bar"><span className="boss-bar-fill" style={{ width: `${crewHp}%` }}/></span></div>
    </div>}
    {banner && <div className="ambush-banner" role="status">{banner}</div>}
  </>;
}
