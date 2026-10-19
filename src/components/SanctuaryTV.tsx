import { useEffect, useRef, useState } from "react";
import tvNormal from "@/assets/tv-normal.png.asset.json";
import tvWalk from "@/assets/tv-walk.png.asset.json";
import tvCage from "@/assets/tv-cage.png.asset.json";
import tvNetwork from "@/assets/tv-network.webp.asset.json";
import { playSfx } from "@/lib/atmosphere";
import { CREW_HP, TV_ARENA, TV_CAGE, TV_CAGE_SHOUTS, TV_CAGED, TV_DEFEAT, TV_EXIT_PATH, TV_FIGHT_CALLS, TV_FIGHT_START, TV_HITS, TV_KEY, TV_SHOCK, TV_SPOT, TV_VISITOR, type TvLine } from "@/lib/tv-mission";

type Stage = "dormant" | "walk" | "visitor" | "fight" | "stun" | "tie" | "escort" | "cage" | "caged";
type Zig = "Oz" | "Brix" | "Lowkey";
type P = { x: number; y: number };
const ZIGS: Zig[] = ["Oz", "Brix", "Lowkey"];
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));
const clampArena = (p: P): P => ({ x: Math.min(TV_ARENA.maxX, Math.max(TV_ARENA.minX, p.x)), y: Math.min(TV_ARENA.maxY, Math.max(TV_ARENA.minY, p.y)) });

/** Runaway TV boss: walks out on the grass, chases and shocks the Zigs, gets tied up and caged for good. */
export function SanctuaryTV({ escaped, controlled, onLog, onDone, onFightStart }: { escaped: boolean; controlled?: string | null; onLog: (who: string, text: string) => void; onDone: () => void; onFightStart?: () => void }) {
  const [stage, setStage] = useState<Stage>("dormant");
  const [line, setLine] = useState<TvLine | null>(null);
  const [pos, setPos] = useState<P>(TV_EXIT_PATH[0]!);
  const [face, setFace] = useState<"left" | "right">("left");
  const [moving, setMoving] = useState(false);
  const [hp, setHp] = useState(TV_HITS);
  const [crew, setCrew] = useState(CREW_HP);
  const [hit, setHit] = useState<"" | "punch" | "slash" | "zap">("");
  const [shock, setShock] = useState(false);
  const [rattle, setRattle] = useState(false);
  const [art, setArt] = useState(false);
  const [charging, setCharging] = useState(false);
  const alive = useRef(true), started = useRef(false), ending = useRef(false);
  const hits = useRef(0), holdStart = useRef(0), turn = useRef(0);
  const posRef = useRef<P>(TV_EXIT_PATH[0]!);
  const stageRef = useRef<Stage>("dormant"); stageRef.current = stage;
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { alive.current = true; try { if (localStorage.getItem(TV_KEY) === "done") { setStage("caged"); setPos(TV_SPOT.cage); } } catch { /* optional */ } return () => { alive.current = false; }; }, []);
  useEffect(() => { if (escaped && stage === "dormant" && !started.current) void run(); }, [escaped, stage]);

  const place = (p: P) => { posRef.current = p; setPos(p); };
  /** Walks node to node at a steady pace, painted per frame (never a CSS tween). */
  async function walkPath(nodes: P[], speed = 7) {
    setMoving(true);
    for (const to of nodes) {
      const from = posRef.current, d = Math.hypot(to.x - from.x, to.y - from.y);
      if (d < 0.1) continue;
      setFace(to.x < from.x ? "left" : "right");
      const dur = (d / speed) * 1000, t0 = performance.now();
      const ok = await new Promise<boolean>(res => { const f = (now: number) => { if (!alive.current || ending.current && stageRef.current === "fight") return res(false); const k = Math.min(1, (now - t0) / dur); place({ x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }); k < 1 ? requestAnimationFrame(f) : res(true); }; requestAnimationFrame(f); });
      if (!ok) break;
    }
    setMoving(false);
  }

  async function speak(seq: TvLine[], gap = 2600) {
    for (const l of seq) { if (!alive.current) return false; setLine(l); onLog(l[0] || "Sanctuary", l[1]); await wait(Math.max(gap, 1400 + l[1].length * 40)); }
    setLine(null); return alive.current;
  }

  async function run() {
    started.current = true;
    place(TV_EXIT_PATH[0]!);
    setStage("walk");
    await walkPath(TV_EXIT_PATH.slice(1));
    if (!alive.current) return;
    setStage("visitor");
    onFightStart?.();
    if (!await speak(TV_VISITOR, 2200) || ending.current) return;
    if (!await speak(TV_FIGHT_START, 2000) || ending.current) return;
    setStage("fight");
    setLine(["", "ATTACK (or Space) — tap for quick, hold for heavy. Double-tap a Zig to take control!"]);
    setTimeout(() => alive.current && setLine(l => l && !l[0] ? null : l), 3500);
  }

  /** Zig marker centre in artwork % of the stage the TV lives in. */
  function zigPoint(z: Zig): P | null {
    const el = document.querySelector<HTMLElement>(`.agent-marker.marker-${z.toLowerCase()}`);
    const stageEl = btnRef.current?.parentElement;
    if (!el || !stageEl) return null;
    const s = stageEl.getBoundingClientRect(), r = el.getBoundingClientRect();
    if (!s.width || !s.height) return null;
    return { x: ((r.left + r.width / 2 - s.left) / s.width) * 100, y: ((r.bottom - s.top) / s.height) * 100 };
  }

  // Boss brain: roam erratically, chase the nearest Zig, stop to threaten, shock at short range on a cooldown.
  useEffect(() => {
    if (stage !== "fight") return;
    let on = true, lastShock = 0, calls = 0;
    (async () => {
      while (on && alive.current && stageRef.current === "fight") {
        const r = Math.random();
        const near = ZIGS.map(z => ({ z, p: zigPoint(z) })).filter((o): o is { z: Zig; p: P } => !!o.p)
          .sort((a, b) => Math.hypot(a.p.x - posRef.current.x, a.p.y - posRef.current.y) - Math.hypot(b.p.x - posRef.current.x, b.p.y - posRef.current.y))[0];
        if (r < 0.2) {
          // Pause and threaten.
          setMoving(false);
          const call = TV_FIGHT_CALLS[calls++ % TV_FIGHT_CALLS.length]!; setLine(call); onLog(call[0], call[1]);
          await wait(1300);
        } else if (near && r < 0.75) {
          const d = Math.hypot(near.p.x - posRef.current.x, near.p.y - posRef.current.y);
          if (d < 7 && performance.now() - lastShock > 1800) {
            lastShock = performance.now();
            setMoving(false); setFace(near.p.x < posRef.current.x ? "left" : "right");
            setShock(true); playSfx("zap-heavy");
            const el = document.querySelector<HTMLElement>(`.agent-marker.marker-${near.z.toLowerCase()}`);
            el?.classList.add("tv-shocked"); setTimeout(() => el?.classList.remove("tv-shocked"), 450);
            setCrew(c => { const n = c - TV_SHOCK; if (n > 0) return n; setLine(["Oz", "Regroup, lads! Shake it off!"]); return CREW_HP; });
            await wait(450); setShock(false); await wait(500);
          } else {
            const tgt = clampArena({ x: near.p.x + (near.p.x < posRef.current.x ? 3 : -3), y: near.p.y });
            await walkPath([tgt], 9);
          }
        } else {
          const p = posRef.current;
          await walkPath([clampArena({ x: p.x + (Math.random() - 0.5) * 12, y: p.y + (Math.random() - 0.5) * 7 })], 11);
        }
        await wait(250);
      }
    })();
    return () => { on = false; };
  }, [stage]);

  /** Plays the attacker's real move on their Sanctuary marker. */
  function swing(who: Zig, heavy: boolean) {
    const el = document.querySelector<HTMLElement>(`.agent-marker.marker-${who.toLowerCase()}`);
    if (!el) return;
    const cls = who === "Brix" ? "atk-punch" : who === "Lowkey" ? "atk-slash" : heavy ? "atk-heavy" : "atk-quick";
    el.classList.remove("atk-punch", "atk-slash", "atk-quick", "atk-heavy", "is-heavy"); void el.offsetWidth;
    el.classList.add(cls); if (heavy) el.classList.add("is-heavy");
    setTimeout(() => el.classList.remove(cls, "is-heavy"), heavy ? 640 : 480);
  }

  function damage(who: Zig, heavy: boolean) {
    if (stageRef.current !== "fight" && stageRef.current !== "visitor" || ending.current) return;
    swing(who, heavy);
    const kind = who === "Brix" ? "punch" : who === "Lowkey" ? "slash" : "zap";
    playSfx(kind === "punch" ? (heavy ? "punch-heavy" : "punch") : kind === "slash" ? "slash-hit" : (heavy ? "zap-heavy" : "zap-hit"));
    hits.current += heavy ? 2 : 1;
    setHit(kind); setTimeout(() => setHit(""), 260);
    const left = Math.max(0, TV_HITS - hits.current); setHp(left);
    if (left === 0) void capture();
  }

  function strike(heavy = false) {
    const c = controlled as Zig | null | undefined;
    const who: Zig = c && ZIGS.includes(c) ? c : (["Brix", "Lowkey", "Oz"] as Zig[])[turn.current++ % 3]!;
    damage(who, heavy);
  }
  const strikeRef = useRef(strike); strikeRef.current = strike;

  // Companions pitch in on their own.
  useEffect(() => {
    if (stage !== "fight") return;
    let i = 0;
    const t = setInterval(() => { const helpers = ZIGS.filter(z => z !== controlled); damage(helpers[i++ % helpers.length]!, false); }, 1700);
    return () => clearInterval(t);
  }, [stage, controlled]);

  async function capture() {
    if (ending.current) return;
    ending.current = true;
    setMoving(false); setStage("stun");
    if (!await speak(TV_DEFEAT, 2200)) return;
    setStage("tie"); playSfx("swing");
    setLine(["", "Brix and Lowkey wrap the sparking TV in rope."]);
    await wait(2600); if (!alive.current) return;
    setStage("escort"); setLine(null);
    await walkPath([TV_SPOT.cage], 4);
    if (!alive.current) return;
    setStage("cage");
    if (!await speak(TV_CAGE)) return;
    try { localStorage.setItem(TV_KEY, "done"); } catch { /* optional */ }
    setStage("caged");
    onLog("Codex", "MISSION COMPLETE — TIE UP THE TV. Codex art unlocked: Old TV — Network Manifestation.");
    onDone();
    setArt(true);
  }

  // Space: tap = quick, hold ~0.6s = heavy.
  useEffect(() => {
    if (stage !== "fight" && stage !== "visitor") return;
    let down = 0;
    const kd = (e: KeyboardEvent) => { if (e.code !== "Space") return; e.preventDefault(); if (e.repeat || down) return; down = performance.now(); };
    const ku = (e: KeyboardEvent) => { if (e.code !== "Space" || !down) return; e.preventDefault(); const held = performance.now() - down; down = 0; strikeRef.current(held >= 600); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); };
  }, [stage]);

  // Caged: eyes flicker, bars rattle, and the odd shout on a long cooldown.
  useEffect(() => {
    if (stage !== "caged") return;
    let t: ReturnType<typeof setTimeout>;
    const tick = () => { t = setTimeout(() => {
      setRattle(true); setTimeout(() => setRattle(false), 600);
      if (Math.random() < 0.5 && !line) { const l = TV_CAGE_SHOUTS[Math.floor(Math.random() * TV_CAGE_SHOUTS.length)]!; setLine(l); setTimeout(() => alive.current && setLine(x => x === l ? null : x), 3000); }
      tick();
    }, 45000 + Math.random() * 30000); };
    tick();
    return () => clearTimeout(t);
  }, [stage]);

  function tapCage() {
    const pool = [...TV_CAGE_SHOUTS, ...TV_CAGED.filter(l => l[1] !== "…")];
    const l = pool[Math.floor(Math.random() * pool.length)]!; setLine(l); playSfx("zap");
    setRattle(true); setTimeout(() => setRattle(false), 600);
    setTimeout(() => alive.current && setLine(x => x === l ? null : x), 2800);
  }

  if (stage === "dormant") return null;
  const busy = stage !== "caged";
  const fighting = stage === "fight" || stage === "visitor";
  const z = 10 + Math.round(pos.y * 10);
  return <>
    {busy && stage !== "fight" && <div className="tv-block" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()}/>}
    {fighting && <span className="tv-crew-hp" aria-label={`Crew health ${crew} of ${CREW_HP}`}><b>CREW</b><i style={{ width: `${crew}%` }}/></span>}
    {fighting && <button type="button" className={`combat-attack in-fight tv-attack ${charging ? "is-charged" : ""}`} aria-label="Attack the TV — tap for quick, hold for heavy"
      onPointerDown={e => { e.stopPropagation(); holdStart.current = performance.now(); setTimeout(() => holdStart.current && setCharging(true), 600); }}
      onPointerUp={e => { e.stopPropagation(); if (!holdStart.current) return; const held = performance.now() - holdStart.current; holdStart.current = 0; setCharging(false); strike(held >= 600); }}
      onPointerCancel={() => { holdStart.current = 0; setCharging(false); }}
      onClick={e => e.stopPropagation()}>ATTACK<small>hold = heavy</small></button>}
    {stage === "caged" || stage === "cage"
      ? <button ref={btnRef} type="button" className={`tv-actor is-caged ${rattle ? "is-rattle" : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: z }} aria-label="The caged TV" onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); tapCage(); }}><img className="tv-caged-set" src={tvNormal.url} alt=""/><span className="tv-eyes"/><img className="tv-cage" src={tvCage.url} alt=""/></button>
      : <button ref={btnRef} type="button" className={`tv-actor is-alive face-${face} ${stage === "stun" || stage === "tie" || stage === "escort" ? "is-stunned" : ""} ${stage === "tie" || stage === "escort" ? "is-tied" : ""} ${shock ? "is-shocking" : ""} ${hit ? `is-hit-${hit}` : ""}`} style={{ left: `${pos.x}%`, top: `${pos.y}%`, zIndex: 2100 }} aria-label={fighting ? "Hit the TV" : "Old TV"}
          onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); if (fighting) strike(); }}>
        <span className={`tv-walk ${moving ? "is-walking" : ""}`} style={{ backgroundImage: `url(${tvWalk.url})` }}/>
        {(stage === "stun" || stage === "tie") && <span className="tv-sparks" aria-hidden="true"/>}
        {shock && <span className="tv-shock" aria-hidden="true"/>}
        {(stage === "tie" || stage === "escort") && <span className="tv-rope" aria-hidden="true"/>}
        {fighting && <span className="tv-hp" aria-label={`TV health ${hp} of ${TV_HITS}`}><i style={{ width: `${(hp / TV_HITS) * 100}%` }}/></span>}
      </button>}
    {line && <div className={`tv-caption ${line[0] ? `is-${line[0].toLowerCase()}` : "is-narration"}`} role="status">{line[0] && <b>{line[0] === "TV" ? "TV" : line[0].toUpperCase()}</b>}<span>{line[1]}</span></div>}
    {art && <div className="prologue-card tv-art-card" role="dialog" aria-label="Codex art unlocked" onClick={e => e.stopPropagation()}><span className="prologue-card-eyebrow">MISSION COMPLETE — TIE UP THE TV</span><img src={tvNetwork.url} alt="Old TV — Network Manifestation"/><strong>Codex art unlocked: Old TV — Network Manifestation</strong><button type="button" onClick={() => setArt(false)}>Close ›</button></div>}
  </>;
}
