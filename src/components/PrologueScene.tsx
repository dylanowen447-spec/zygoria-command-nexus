import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { LongWalkAmbush } from "@/components/LongWalkAmbush";
import { OldCityRats } from "@/components/OldCityRats";
import { ACKS, ASPECT, REACTIONS, SHRUGS, routeBetween, type Scene } from "@/lib/prologue";
import { runCrewStep } from "@/lib/job-planning.functions";
import type { Agent, Point } from "@/lib/zones";
import { DEFAULT_BOUNDS, type CombatApi } from "@/lib/rat-ai";
import ozWordmark from "@/assets/oz-wordmark.png.asset.json";
import brixWordmark from "@/assets/brix-wordmark.png.asset.json";
import lowkeyWordmark from "@/assets/lowkey-wordmark.png.asset.json";

const ALL: Agent[] = ["Oz", "Brix", "Lowkey"];
const SPEED = 4.2; // a little slower than home: they are cautious here
const WORDMARK: Record<Agent, { url: string; cls: string }> = { Oz: { url: ozWordmark.url, cls: "oz-wordmark" }, Brix: { url: brixWordmark.url, cls: "brix-wordmark" }, Lowkey: { url: lowkeyWordmark.url, cls: "lowkey-wordmark" } };
const depthFor = (y: number) => (1 - Math.min(Math.max((64 - y) / 30, 0), 1) * 0.22).toFixed(3);
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / ASPECT);
/** On phones the map is short, so bubbles drop below the Zig much sooner. */
const topLine = () => (typeof window !== "undefined" && window.innerWidth <= 600 ? 55 : 34);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;
const cdist = (a: Point, b: Point) => Math.hypot(b.x - a.x, b.y - a.y);
/** Attack reach in artwork %: Oz zaps from range, Brix and Lowkey must get close (Lowkey's heavy dash closes a gap). */
const REACH: Record<Agent, number> = { Oz: 42, Brix: 14, Lowkey: 9 };
/** Brix throws a real punch from his punch sheet; the others keep their swing nudge. */
const swingKind = (a: Agent, heavy: boolean) => a === "Brix" ? (heavy ? "atk-punch is-heavy" : "atk-punch") : heavy ? "atk-heavy" : "atk-quick";
const HOLD_MS = 600;

type Props = { scene: Scene; command: { id: number; text: string } | null; onLog: (agent: Agent, text: string) => void; onNext: () => void; onSkip: () => void };

/** One prologue area: the Zigs explore its walkable graph on their own and only notice objectives after looking around. */
export function PrologueScene({ scene, command, onLog, onNext, onSkip }: Props) {
  const handler = useRef<(text: string) => void>(() => undefined);
  useEffect(() => { if (command) handler.current(command.text); }, [command]);
  const coords = useRef<Record<Agent, Point>>(Object.fromEntries(ALL.map(a => [a, { ...scene.spawn[a].from }])) as Record<Agent, Point>);
  const markers = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const [shown, setShown] = useState(false);
  const [walking, setWalking] = useState<Agent[]>([]);
  const [facing, setFacing] = useState<Record<Agent, "left" | "right">>({ Oz: "right", Brix: "right", Lowkey: "left" });
  const [ozDir, setOzDir] = useState<"down" | "left" | "right" | "up">("down");
  const [brixDir, setBrixDir] = useState<"down" | "left" | "right" | "up">("down");
  const [bubbles, setBubbles] = useState<Partial<Record<Agent, string>>>({});
  const [found, setFound] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const zap = useRef<(p: Point, hit?: boolean) => void>(() => undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const ambushHit = useRef<(p: Point) => boolean>(() => false);
  const sheltonBeaten = useRef(false);
  useEffect(() => { try { sheltonBeaten.current = localStorage.getItem("zygoria-longwalk-ambush-v1") === "done"; } catch { /* fight required */ } }, []);
  const onSheltonDefeat = useCallback(() => { sheltonBeaten.current = true; }, []);
  /** Danger moment: the crew improvise their reaction live through the AI, never a fixed script. */
  const alarm = useRef<(situation: string) => void>(() => undefined);
  const onAlarm = useCallback((s: string) => alarm.current(s), []);
  const ambushSay = useCallback((a: Agent, text: string) => {
    setBubbles(b => ({ ...b, [a]: text }));
    setTimeout(() => setBubbles(b => (b[a] === text ? { ...b, [a]: undefined } : b)), 2600);
  }, []);
  const [bolts, setBolts] = useState<{ id: number; d: string; x: number; y: number; heavy?: boolean }[]>([]);
  const [jolt, setJolt] = useState(0);
  const logRef = useRef(onLog);
  logRef.current = onLog;
  // Direct combat: the ambush exposes live enemy feet points + safe ground; the player steers one Zig.
  const enemies = useRef<CombatApi>({ targets: () => [], bounds: () => DEFAULT_BOUNDS });
  const [combat, setCombat] = useState(false);
  const [ctrl, setCtrl] = useState<Agent>("Oz");
  const ctrlRef = useRef<Agent>("Oz");
  // Outside fights: a double-tapped Zig is steered by the player until double-tapped again.
  const [steered, setSteered] = useState<Agent | null>(null);
  const steerRef = useRef<Agent | null>(null);
  const steerMove = useRef<(a: Agent, p: Point) => void>(() => undefined);
  const moveCtrl = useRef<(p: Point) => void>(() => undefined);
  const attack = useRef<(heavy: boolean) => void>(() => undefined);
  const resetAtk = useRef<() => void>(() => undefined);
  const lastMarkerTap = useRef<{ a: Agent; t: number } | null>(null);
  const [swing, setSwing] = useState<Partial<Record<Agent, string>>>({});
  const [hits, setHits] = useState<{ id: number; x: number; y: number; kind: string }[]>([]);
  const [charging, setCharging] = useState(false);
  const holdStart = useRef(0);
  const aimRef = useRef<Point | null>(null);
  const drawBolt = (from: Point, x: number, y: number, heavy = false) => {
    const sx = from.x, sy = from.y - 5, n = heavy ? 6 : 4, j = heavy ? 2.2 : 0.8;
    const pts: string[] = [`${sx},${sy}`];
    for (let i = 1; i < n; i++) { const t = i / n; pts.push(`${sx + (x - sx) * t + (Math.random() - 0.5) * j},${sy + (y - sy) * t + (Math.random() - 0.5) * j}`); }
    pts.push(`${x},${y}`);
    const id = performance.now() + Math.random();
    setBolts(b => [...b.slice(-5), { id, d: "M" + pts.join(" L"), x, y, heavy }]); setJolt(id);
    setTimeout(() => setBolts(b => b.filter(v => v.id !== id)), heavy ? 650 : 500);
  };
  const boltRef = useRef(drawBolt);
  boltRef.current = drawBolt;

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const frames: number[] = [];
    const wait = (ms: number) => new Promise<void>(r => { timers.push(setTimeout(r, ms)); });
    const paint = (a: Agent) => {
      const el = markers.current[a], p = coords.current[a];
      if (!el) return;
      el.style.left = `${p.x}%`; el.style.top = `${p.y}%`;
      el.classList.toggle("near-top", p.y < topLine()); el.classList.toggle("near-right", p.x > 62); el.classList.toggle("near-left", p.x < 38);
      el.style.setProperty("--depth", depthFor(p.y));
      el.style.setProperty("--z", String(10 + Math.round(p.y * 10)));
    };
    const talking = new Set<Agent>();
    const orders: Partial<Record<Agent, string>> = {};
    const cancel: Partial<Record<Agent, boolean>> = {};
    const tokens: Partial<Record<Agent, number>> = {};
    // While a Zig is answering the visitor, their own exploring chatter stays quiet.
    let voiceBusy = false;
    const say = (a: Agent, text: string | null, force = false) => { if ((voiceBusy || talking.has(a)) && !force && text) return; setBubbles(b => ({ ...b, [a]: text ?? undefined })); if (text) logRef.current(a, text); };
    /** Reading time: short lines at least 3.2s, long lines up to 6s, then a 1s breath. */
    const hold = (text: string) => Math.min(6000, Math.max(3200, 1800 + text.length * 45));
    const GAP = 1000;
    // Only one Zig chatters at a time while exploring.
    let floorUntil = 0;
    const floorFree = () => performance.now() > floorUntil;
    const takeFloor = (text: string) => { floorUntil = performance.now() + hold(text) + GAP; };
    /** A pause that ends early when the visitor gives this Zig an order. */
    const nap = async (a: Agent, ms: number) => { const end = performance.now() + ms; while (alive && performance.now() < end && !orders[a]) await wait(150); };
    const walk = (a: Agent, pts: Point[]) => new Promise<void>(resolve => {
      if (!pts.length) return resolve();
      const face = (t: Point) => {
        const o = coords.current[a], dx = t.x - o.x, dy = t.y - o.y;
        if ((a === "Oz" || a === "Brix") && (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3)) { const d = Math.abs(dy) > Math.abs(dx) * 0.7 ? (dy < 0 ? "up" : "down") : (dx < 0 ? "left" : "right"); if (a === "Oz") setOzDir(d); else setBrixDir(d); }
        if (Math.abs(dx) >= 0.3) setFacing(f => ({ ...f, [a]: dx < 0 ? "left" : "right" }));
      };
      let seg = 0, last = performance.now();
      // A newer walk for this Zig supersedes an older one; a stale cancel flag never freezes the next walk.
      const token = (tokens[a] = (tokens[a] ?? 0) + 1);
      cancel[a] = false;
      face(pts[0]!);
      setWalking(w => w.includes(a) ? w : [...w, a]);
      const step = (time: number) => {
        if (!alive) return;
        if (tokens[a] !== token) { resolve(); return; }
        if (cancel[a]) { cancel[a] = false; setWalking(w => w.filter(x => x !== a)); resolve(); return; }
        // Older iPads can hand rAF a timestamp on a different clock; always use performance.now().
        const nowT = performance.now();
        let budget = Math.max(0, Math.min(nowT - last, 64)) / 1000 * SPEED;
        last = nowT;
        while (budget > 0 && seg < pts.length) {
          const p = coords.current[a], t = pts[seg]!, d = dist(p, t);
          if (d <= budget) { coords.current[a] = { ...t }; budget -= d; seg++; if (seg < pts.length) face(pts[seg]!); }
          else { const k = budget / d; coords.current[a] = { x: p.x + (t.x - p.x) * k, y: p.y + (t.y - p.y) * k }; budget = 0; }
        }
        paint(a);
        if (seg >= pts.length) { setWalking(w => w.filter(x => x !== a)); resolve(); }
        else frames.push(requestAnimationFrame(step));
      };
      frames.push(requestAnimationFrame(step));
    });

    // ---- Direct combat ----
    let lastEnemy = 0;
    const inCombat = () => { if (enemies.current.targets().length) lastEnemy = performance.now(); return lastEnemy > 0 && performance.now() - lastEnemy < 3500; };
    const clampB = (p: Point): Point => { const b = enemies.current.bounds(); return { x: Math.min(b.x1, Math.max(b.x0, p.x)), y: Math.min(b.y1, Math.max(b.y0, p.y)) }; };
    const lastAtk: Record<Agent, number> = { Oz: 0, Brix: 0, Lowkey: 0 };
    const aiNext: Record<Agent, number> = { Oz: 0, Brix: 0, Lowkey: 0 };
    const nearestTo = (p: Point) => enemies.current.targets().sort((u, v) => cdist(u, p) - cdist(v, p))[0];
    const flashSwing = (a: Agent, kind: string, ms: number) => { setSwing(w => ({ ...w, [a]: undefined })); requestAnimationFrame(() => alive && setSwing(w => ({ ...w, [a]: kind }))); timers.push(setTimeout(() => alive && setSwing(w => (w[a] === kind ? { ...w, [a]: undefined } : w)), ms + 30)); };
    const impact = (p: Point, kind: string) => { const id = performance.now() + Math.random(); setHits(h => [...h.slice(-6), { id, x: p.x, y: p.y, kind }]); timers.push(setTimeout(() => alive && setHits(h => h.filter(v => v.id !== id)), 450)); };
    const faceTo = (a: Agent, t: Point) => {
      const o = coords.current[a], dx = t.x - o.x, dy = t.y - o.y;
      setFacing(f => ({ ...f, [a]: dx < 0 ? "left" : "right" }));
      const d = Math.abs(dy) > Math.abs(dx) * 0.7 ? (dy < 0 ? "up" : "down") : (dx < 0 ? "left" : "right");
      if (a === "Oz") setOzDir(d); else if (a === "Brix") setBrixDir(d);
    };
    const dash = (a: Agent, to: Point) => new Promise<void>(res => {
      tokens[a] = (tokens[a] ?? 0) + 1; setWalking(w => w.filter(x => x !== a));
      const from = { ...coords.current[a] }, t0 = performance.now();
      const f = () => { if (!alive) return res(); const k = Math.min(1, (performance.now() - t0) / 170); coords.current[a] = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k }; paint(a); if (k < 1) frames.push(requestAnimationFrame(f)); else res(); };
      frames.push(requestAnimationFrame(f));
    });
    /** One attack in the Zig's own style. Enemy damage goes through the ambush's existing hit logic, unchanged. */
    const strike = async (a: Agent, heavy: boolean, auto = false) => {
      const now = performance.now();
      if (now - lastAtk[a] < (heavy ? 650 : a === "Brix" ? 200 : 260)) return;
      const me = coords.current[a];
      // Player attacks aim at the mouse: lock onto an enemy near the cursor, otherwise strike toward it.
      const aimP = auto ? null : aimRef.current;
      let t = nearestTo(aimP ?? me);
      if (aimP && (!t || cdist(t, aimP) > 10)) {
        lastAtk[a] = now; faceTo(a, aimP);
        flashSwing(a, swingKind(a, heavy), a === "Brix" ? (heavy ? 620 : 260) : heavy ? 420 : 240);
        if (a === "Brix") { const d = cdist(me, aimP) || 1, k = Math.min(1, REACH.Brix * 0.6 / d); impact({ x: me.x + (aimP.x - me.x) * k, y: me.y - 4 + (aimP.y - me.y) * k }, "miss"); }
        if (a === "Oz") {
          const d = cdist(me, aimP) || 1, k = Math.min(1, REACH.Oz / d);
          const end = { x: me.x + (aimP.x - me.x) * k, y: me.y + (aimP.y - me.y) * k };
          boltRef.current(coords.current.Oz, end.x, end.y, heavy);
          const landed = !!ambushHit.current(end); impact(end, landed ? (heavy ? "oz-heavy" : "oz") : "miss");
        }
        return;
      }
      // Nothing to hit: still throw the move straight ahead so every tap shows a punch/swing.
      if (!t) { lastAtk[a] = now; flashSwing(a, a === "Brix" ? swingKind(a, heavy) : "atk-whiff", a === "Brix" ? (heavy ? 620 : 260) : 260); return; }
      lastAtk[a] = now; faceTo(a, t);
      const reach = a === "Lowkey" && heavy ? 32 : REACH[a];
      if (cdist(me, t) > reach) { flashSwing(a, a === "Brix" ? swingKind(a, heavy) : "atk-whiff", a === "Brix" ? 260 : 260); return; }
      const aim = (p: Point) => ({ x: p.x, y: p.y - 4 });
      if (a === "Lowkey" && heavy) { const d = cdist(me, t) || 1; await dash(a, clampB({ x: t.x - (t.x - me.x) / d * 3, y: t.y - (t.y - me.y) / d * 1.5 })); if (!alive) return; }
      flashSwing(a, swingKind(a, heavy), a === "Brix" ? (heavy ? 620 : 260) : heavy ? 420 : 240);
      if (a === "Oz") boltRef.current(coords.current.Oz, t.x, t.y - 4, heavy);
      const landed = !!ambushHit.current(aim(t));
      impact(aim(t), landed ? `${a.toLowerCase()}${heavy ? "-heavy" : ""}` : "miss");
      if (a === "Oz" && !auto) zap.current(aim(t), landed);
      // Heavy blows land a second impact a beat later (Shelton's own hit timing still applies).
      if (heavy && landed) timers.push(setTimeout(() => { if (!alive) return; const t2 = nearestTo(t); if (t2 && cdist(t2, t) < 8) { const ok = ambushHit.current(aim(t2)); impact(aim(t2), ok ? `${a.toLowerCase()}-heavy` : "miss"); } }, 400));
    };
    moveCtrl.current = (p: Point) => { if (!inCombat()) return; void walk(ctrlRef.current, [clampB({ x: p.x, y: p.y })]); };
    steerMove.current = (a: Agent, p: Point) => { if (heading[a]) cancel[a] = true; void walk(a, [{ x: Math.min(96, Math.max(4, p.x)), y: Math.min(95, Math.max(40, p.y)) }]); };
    attack.current = (heavy: boolean) => { void strike(inCombat() ? ctrlRef.current : steerRef.current ?? ctrlRef.current, heavy); };
    resetAtk.current = () => { lastAtk[inCombat() ? ctrlRef.current : steerRef.current ?? ctrlRef.current] = 0; };
    // Companions: each picks a different enemy where possible, keeps its own spacing and style, and stays on safe ground.
    const companionTick = () => {
      const on = inCombat(); setCombat(c => (c === on ? c : on));
      if (!on) return;
      const ts = enemies.current.targets(); if (!ts.length) return;
      const taken: Point[] = [];
      const ctl = ctrlRef.current; const ctlT = nearestTo(coords.current[ctl]); if (ctlT) taken.push(ctlT);
      ALL.filter(z => z !== ctl).forEach((z, i) => {
        const me = coords.current[z];
        const sorted = ts.slice().sort((u, v) => cdist(u, me) - cdist(v, me));
        const t = sorted.find(u => !taken.some(k => k === u)) ?? sorted[0]!;
        taken.push(t);
        const now = performance.now();
        if (cdist(me, t) <= REACH[z] * 0.9) { if (now > aiNext[z]) { aiNext[z] = now + 1300 + Math.random() * 900; void strike(z, false, true); } return; }
        // Move to a stand-off spot: Oz keeps distance, the brawlers flank from opposite sides.
        const side = i === 0 ? -1 : 1;
        let goal = z === "Oz" ? { x: t.x + (me.x < t.x ? -18 : 18), y: t.y + side * 3 } : { x: t.x + side * 5, y: t.y + 1 };
        for (const o of ALL) if (o !== z && cdist(coords.current[o], goal) < 6) goal = { x: goal.x + (goal.x < coords.current[o].x ? -5 : 5), y: goal.y + 2 };
        void walk(z, [clampB(goal)]);
      });
    };
    const combatTimer = setInterval(() => alive && companionTick(), 450);
    timers.push(combatTimer as unknown as ReturnType<typeof setTimeout>);

    const objectiveSpots = new Set(scene.objectives.map(o => o.spot));
    const at: Record<Agent, string> = { Oz: scene.spawn.Oz.out, Brix: scene.spawn.Brix.out, Lowkey: scene.spawn.Lowkey.out };
    const heading: Partial<Record<Agent, string>> = {};
    const seen: Record<Agent, Set<string>> = { Oz: new Set(), Brix: new Set(), Lowkey: new Set() };
    const used = new Set<string>();
    const claimed = new Set<string>();
    const found = new Set<string>();
    let unlockedAt = 0, finished = false;
    const start = performance.now();
    const line = (a: Agent, spot: string) => {
      const options = scene.spots[spot]!.lines[a];
      if (!options.length) return null;
      const fresh = options.filter(l => !used.has(l));
      const l = pick(fresh.length ? fresh : options);
      used.add(l);
      return l;
    };
    const pathTo = (a: Agent, nodes: string[], end?: Point) => {
      const jitter = { Oz: { x: -1, y: 0.6 }, Brix: { x: 1.2, y: 0 }, Lowkey: { x: 0, y: -0.6 } }[a];
      return nodes.map((n, i) => { const p = scene.spots[n]!.at; return i === nodes.length - 1 ? end ?? { x: p.x + jitter.x, y: p.y + jitter.y } : p; });
    };

    async function explore(a: Agent) {
      await wait(800 + Math.random() * 2400);
      while (alive && !finished) {
        // Hold the wander while answering the Voice, then a quiet beat before carrying on.
        while (alive && (talking.has(a) || !floorFree())) await wait(200);
        if (steerRef.current === a && !inCombat()) {
          while (alive && steerRef.current === a && !inCombat()) await wait(300);
          if (!alive) return;
          at[a] = Object.keys(scene.spots).sort((x, y) => dist(scene.spots[x]!.at, coords.current[a]) - dist(scene.spots[y]!.at, coords.current[a]))[0]!;
          continue;
        }
        if (inCombat()) {
          // Fighting takes over; afterwards they carry on from the nearest trail point.
          while (alive && inCombat()) await wait(300);
          if (!alive) return;
          at[a] = Object.keys(scene.spots).sort((x, y) => dist(scene.spots[x]!.at, coords.current[a]) - dist(scene.spots[y]!.at, coords.current[a]))[0]!;
          await walk(a, [scene.spots[at[a]]!.at]);
          continue;
        }
        const elapsed = performance.now() - start;
        if (!unlockedAt && (ALL.every(z => seen[z].size >= scene.unlock.seen) && elapsed > scene.unlock.ms || elapsed > scene.unlock.maxMs)) {
          unlockedAt = performance.now();
          const hinter = pick(ALL);
          takeFloor(scene.hints[hinter]); say(hinter, scene.hints[hinter]);
          timers.push(setTimeout(() => alive && say(hinter, null), hold(scene.hints[hinter])));
        }
        const taken = new Set(ALL.filter(z => z !== a).flatMap(z => [at[z], heading[z]].filter(Boolean) as string[]));
        const ordered = orders[a];
        delete orders[a];
        const goal = ordered ? undefined : unlockedAt ? scene.objectives.find(o => !claimed.has(o.spot) && (!o.owner || o.owner === a) && !taken.has(o.spot) && (o.needs ?? []).every(n => found.has(n))) : undefined;
        let target: string;
        if (ordered) { target = ordered; if (objectiveSpots.has(ordered)) claimed.add(ordered); }
        else if (goal && (Math.random() < 0.4 || performance.now() - unlockedAt > 25000)) { target = goal.spot; claimed.add(goal.spot); }
        else {
          let options = Object.keys(scene.spots).filter(s => s !== at[a] && !taken.has(s) && !objectiveSpots.has(s));
          const unseen = options.filter(s => !seen[a].has(s));
          if (unseen.length && Math.random() < 0.75) options = unseen;
          // Prefer somewhere close: they poke around rather than march across the map.
          options.sort((x, y) => routeBetween(scene, at[a], x).length - routeBetween(scene, at[a], y).length);
          target = pick(options.slice(0, 3));
        }
        heading[a] = target;
        await walk(a, pathTo(a, routeBetween(scene, at[a], target)));
        delete heading[a];
        if (!alive || finished) return;
        if (orders[a]) {
          // Interrupted mid-walk: carry on from the nearest node on the graph.
          at[a] = Object.keys(scene.spots).sort((x, y) => dist(scene.spots[x]!.at, coords.current[a]) - dist(scene.spots[y]!.at, coords.current[a]))[0]!;
          if (objectiveSpots.has(target) && !found.has(target)) claimed.delete(target);
          continue;
        }
        at[a] = target; seen[a].add(target);
        const objective = scene.objectives.find(o => o.spot === target);
        if (objective && objective.owner && objective.owner !== a) {
          say(a, `Not mine. ${objective.owner}, this one's yours.`); claimed.delete(objective.spot);
          orders[objective.owner] = objective.spot; if (heading[objective.owner]) cancel[objective.owner] = true;
          await nap(a, 2400); say(a, null); continue;
        }
        if (objective && scene.id === "long-walk" && !sheltonBeaten.current) {
          // The valley stays out of reach until Shelton has been beaten off the road.
          claimed.delete(objective.spot);
          const warn = { Oz: "Not with that spiky tortoise still on the road!", Brix: "Can't head down yet. Shelton first.", Lowkey: "Road's not safe. Not yet." }[a];
          takeFloor(warn); say(a, warn); await wait(hold(warn)); say(a, null); await wait(2500); continue;
        }
        if (objective && objective.needs && !objective.needs.every(n => found.has(n))) {
          // Still shut: they react, then go back to poking around for the missing pieces.
          claimed.delete(objective.spot);
          setFacing(f => ({ ...f, [a]: "right" }));
          for (const text of objective.locked?.[a] ?? []) { takeFloor(text); say(a, text); await wait(hold(text)); say(a, null); await wait(GAP); if (!alive) return; }
          say(a, null); await wait(1200); continue;
        }
        if (objective) {
          found.add(objective.spot);
          setFound(f => [...f, objective.spot]);
          setFacing(f => ({ ...f, [a]: "right" }));
          for (const text of objective.found[a]) { takeFloor(text); say(a, text); await wait(hold(text)); say(a, null); await wait(GAP); if (!alive) return; }
          say(a, null);
          if (scene.objectives.every(o => found.has(o.spot)) && !finished) {
            // Wait for any other finder to finish reading before the group gathers.
            finished = true;
            await gatherAll(a);
            return;
          }
          await wait(1500);
          continue;
        }
        await nap(a, 500);
        const curio = scene.curios?.[a].filter(c => !used.has(c)) ?? [];
        const l = orders[a] ? null : curio.length && Math.random() < 0.25 ? (() => { const c = pick(curio); used.add(c); return c; })() : line(a, target);
        if (l && floorFree()) { takeFloor(l); say(a, l); await nap(a, hold(l)); if (!alive || finished) return; say(a, null); }
        // Someone nearby sometimes answers back.
        const near = ALL.find(z => z !== a && dist(coords.current[z], coords.current[a]) < 14 && !heading[z]);
        if (near && Math.random() < 0.35 && floorFree()) {
          await wait(GAP); if (!alive) return;
          setFacing(f => ({ ...f, [near]: coords.current[a].x < coords.current[near].x ? "left" : "right" }));
          const r = pick(REACTIONS[near]); takeFloor(r); say(near, r);
          await wait(hold(r));
          if (!alive) return;
          say(near, null);
        }
        await nap(a, 1200 + Math.random() * 3500);
      }
    }

    const hub = scene.spots["centre"] ? "centre" : "front";
    const send = (z: Agent, spot: string) => {
      orders[z] = spot;
      if (heading[z]) cancel[z] = true;
      say(z, pick(ACKS[z]), true);
      timers.push(setTimeout(() => alive && say(z, null, true), 1600));
    };
    /** Real in-character replies, scoped to what the crew know in this scene. */
    async function chat(text: string, speakers: Agent[]) {
      const previous: { agent: Agent; result: string }[] = [];
      floorUntil = Infinity; voiceBusy = true; setBubbles({});
      speakers.forEach(z => talking.add(z));
      try { await chatInner(text, speakers, previous); }
      finally { speakers.forEach(z => talking.delete(z)); voiceBusy = false; floorUntil = performance.now() + 2000; }
    }
    async function chatInner(text: string, speakers: Agent[], previous: { agent: Agent; result: string }[]) {
      for (const z of speakers) {
        talking.add(z);
        setBubbles(b => ({ ...b, [z]: "…" }));
        let reply: string;
        try {
          const out = await runCrewStep({ data: { directive: text, agent: z, previous, finalReview: false, group: speakers.length > 1, story: [scene.story, voiceName() ? `The voice from the sky is called ${voiceName()}; occasionally call them by name.` : "", ...[...found].map(f => scene.learned[f]).filter(Boolean)].join(" "), prologue: true } });
          reply = out.result.replace(/\s+/g, " ").trim().slice(0, 220);
        } catch { reply = pick(SHRUGS[z]); }
        if (!alive) return;
        previous.push({ agent: z, result: reply });
        say(z, reply, true);
        await wait(Math.min(7000, Math.max(3200, 1800 + reply.length * 45)));
        if (!alive) return;
        say(z, null, true); await wait(GAP);
      }
    }
    let heardVoice = false, awaitingName = false;
    const voiceName = () => { try { return localStorage.getItem("zygoria-voice-name") || ""; } catch { return ""; } };
    async function nameReply(raw: string) {
      const cleaned = raw.replace(/^(hi|hello|hey|oi)[,!.\s]*/i, "").replace(/^(my name is|my name's|i am|i'm|im|call me|it's|its|it is|name's)\s+/i, "").replace(/[^\p{L}\p{N}' -]/gu, "").trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 20);
      if (!cleaned) { awaitingName = true; void chat(raw, ["Oz"]); return; }
      const name = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      try { localStorage.setItem("zygoria-voice-name", name); } catch { /* private mode */ }
      const lines: [Agent, string][] = [["Oz", `${name}? Nice. Sky's got a name.`], ["Brix", `Right, ${name}. Point us somewhere useful.`], ["Lowkey", `${name}. I'll remember that.`]];
      ALL.forEach(z => talking.add(z)); voiceBusy = true; floorUntil = Infinity; setBubbles({});
      for (const [who, line] of lines) { say(who, line, true); await wait(hold(line)); if (!alive) return; say(who, null, true); await wait(GAP); }
      ALL.forEach(z => talking.delete(z)); voiceBusy = false; floorUntil = performance.now() + 2000;
    }
    async function firstContact() {
      const lines: [Agent, string][] = [
        ["Oz", "...What was that?"],
        ["Brix", "Wasn't me."],
        ["Lowkey", "Wasn't me either."],
        ["Oz", "Right. Brilliant. We've been awake five minutes and the sky's talking to us."],
        ["Brix", "Can you hear us?"],
        ["Lowkey", "Apparently it can."],
        ["Oz", "Oi, mysterious voice. You got a name?"],
      ];
      ALL.forEach(z => talking.add(z)); voiceBusy = true; floorUntil = Infinity; setBubbles({});
      for (const [who, line] of lines) {
        say(who, line, true);
        await wait(hold(line));
        if (!alive) return;
        say(who, null, true); await wait(GAP);
      }
      ALL.forEach(z => talking.delete(z)); voiceBusy = false; floorUntil = performance.now() + 2000;
      awaitingName = true;
    }
    alarm.current = (situation: string) => {
      if (voiceBusy) return;
      const others = (["Brix", "Lowkey"] as Agent[]).sort(() => Math.random() - 0.5);
      const speakers: Agent[] = Math.random() < 0.5 ? [others[0]!, "Oz"] : [others[0]!, others[1]!, "Oz"];
      void chat(`(Nobody asked anything. React out loud, shocked, in one short line. Oz has lightning.) ${situation}`.slice(0, 180), speakers);
    };
    // Oz's zap: crew reactions are drawn from varied pools by who is closest, with cooldown and random silence.
    let zapQuietUntil = 0; let lastLine = "";
    const ZAP: Record<string, [Agent, string][][]> = {
      Brix: [[["Brix", "Oi! Careful, Oz!"]], [["Brix", "Watch where you point that!"]], [["Brix", "You nearly welded my elbow."], ["Oz", "Nearly."]], [["Brix", "Ground yourself, mate."]], [["Brix", "Keep that away from me."], ["Oz", "Can't help it. I'm electric."]], [["Brix", "That's my good arm, Oz."]],
        [["Brix", "Oi! Watch where you're firing that!"], ["Lowkey", "He's going to get us killed before we even find somewhere to sleep."], ["Oz", "Relax, lads. Just testing something. ⚡"]],
        [["Brix", "Oz, I'm mostly metal. Keep that away."], ["Lowkey", "Don't give him ideas."], ["Oz", "Just checking your grounding, mate."]],
        [["Brix", "My hands are still buzzing."], ["Oz", "Free warm-up. You're welcome."]],
        [["Brix", "Do that again and you're carrying the heavy stuff."], ["Oz", "...Noted."]]],
      Lowkey: [[["Lowkey", "Oz. Watch it."], ["Oz", "Just clearing the air."]], [["Lowkey", "Don't set the grass alight."]], [["Lowkey", "…Static hazard."]], [["Lowkey", "Do that again and I'm walking ahead."]], [["Lowkey", "Felt that in my teeth."], ["Oz", "Sorry. Mostly."]], [["Lowkey", "You're a walking short circuit."], ["Oz", "It's called energy, Lowkey."]],
        [["Lowkey", "That was close."], ["Brix", "Too close. Point it somewhere empty, Oz."], ["Oz", "I was aiming. Sort of."]],
        [["Lowkey", "My hair's standing up."], ["Oz", "Suits you."]],
        [["Lowkey", "If you blow us up, I'm haunting you."], ["Oz", "Fair."]]],
      none: [[["Oz", "Whoa! Still got charge in me."], ["Brix", "Keep it to yourself."]], [["Oz", "Zap!"]], [["Oz", "Did you see that arc?"], ["Lowkey", "Hard not to."]], [["Oz", "Tickles."]], [["Oz", "Antenna surge!"], ["Lowkey", "Point it at the sky next time."]], [["Brix", "Careful, Oz. Things round here are old."]], [["Lowkey", "Something in this air is sparking."], ["Oz", "No, that was definitely me."]], [["Oz", "Where's that coming from?"]],
        [["Brix", "Oi! Watch where you're firing that!"], ["Lowkey", "He's going to get us killed before we even find somewhere to sleep."], ["Oz", "Relax, lads. Just testing something. ⚡"]],
        [["Lowkey", "Did the sky just jolt him, or is he doing that?"], ["Brix", "Either way, stay five paces back."], ["Oz", "My antenna picked something up!"]],
        [["Brix", "Watch the arc, Oz!"], ["Oz", "Had to let the charge out!"], ["Lowkey", "Next time, let it out at a rock."]],
        [["Oz", "Feel that? I'm buzzing."], ["Brix", "We all felt it."]],
        [["Lowkey", "He's going to start a fire."], ["Brix", "Or find one. Could be handy."], ["Oz", "See? Useful."]]],
    };
    // First-lightning discovery: the crew react with shock, then curiosity, then banter, as Oz learns his power.
    const FIRST: [Agent, string][][] = [
      [["Brix", "WOAH! What the hell was that?!"], ["Lowkey", "Oz?! Did that just come out of you?!"], ["Oz", "I… think so?!"], ["Brix", "How are you doing that?!"], ["Oz", "I DON'T KNOW, MATE!"]],
      [["Lowkey", "Did the air just jolt you?"], ["Brix", "There's a scorch mark. Right there."], ["Oz", "...My fingers are fizzing."], ["Brix", "How are you doing that?!"], ["Oz", "I DON'T KNOW, MATE!"]],
    ];
    const LEARN: [Agent, string][][] = [
      [["Lowkey", "You're actually shooting lightning."], ["Oz", "Yeah, starting to get the hang of it!"], ["Brix", "Can you control where it arcs?"], ["Oz", "Watch this!"]],
      [["Brix", "Is it coming from your antenna or your hands?"], ["Oz", "Both! My teeth are vibrating!"], ["Lowkey", "Just don't aim it at us."]],
      [["Oz", "Again! It did it again!"], ["Lowkey", "We noticed."]],
    ];
    const SHOW: [Agent, string][][] = [
      [["Brix", "Nice shot, Oz!"], ["Lowkey", "Careful where you're pointing that."], ["Oz", "Relax, lads. Professional electrician."], ["Brix", "You've been doing it for five minutes."]],
      [["Oz", "Lightning rod, mate!"], ["Lowkey", "Keep walking before you attract the whole city."]],
    ];
    const HIT: [Agent, string][][] = [[["Brix", "Got it!"]], [["Lowkey", "Clean hit."]], [["Oz", "Fried!"]], [["Brix", "Nice one, Oz."]]];
    const STAGE_KEY = "zygoria-oz-zap-stage";
    let zaps = Number(localStorage.getItem(STAGE_KEY) || 0) || 0;
    zap.current = (p: Point, hit = false) => {
      const now = performance.now();
      if ((voiceBusy || talking.size) && zaps === 0) return; // save the first-ever reaction until the crew can see it
      zaps++; try { localStorage.setItem(STAGE_KEY, String(zaps)); } catch { /* ignore */ }
      if (voiceBusy || talking.size) return;
      let set: [Agent, string][];
      const rnd = (l: [Agent, string][][]) => { const f = l.filter(s => s[0]![1] !== lastLine); return f[Math.floor(Math.random() * f.length)]!; };
      if (zaps === 1) set = FIRST[hit ? 0 : Math.floor(Math.random() * 2)]!;
      else if (zaps <= 3 && now >= zapQuietUntil - 22000) set = rnd(LEARN);
      else if (zaps <= 6 && now >= zapQuietUntil) set = rnd(SHOW);
      else if (now < zapQuietUntil || Math.random() < 0.3) return;
      else if (hit) set = rnd(HIT);
      else {
        const near = (["Brix", "Lowkey"] as Agent[]).filter(z => dist(coords.current[z], p) < 9).sort((x, y) => dist(coords.current[x], p) - dist(coords.current[y], p))[0];
        set = rnd(ZAP[near ?? "none"]!);
      }
      lastLine = set[0]![1]; zapQuietUntil = now + 30000;
      set.forEach(([who, line], i) => {
        const start = 300 + set.slice(0, i).reduce((t, [, l]) => t + hold(l) + 300, 0);
        timers.push(setTimeout(() => alive && say(who, line), start));
        timers.push(setTimeout(() => alive && setBubbles(b => b[who] === line ? { ...b, [who]: undefined } : b), start + hold(line)));
      });
    };
    handler.current = (text: string) => {
      if (finished) return;
      if (scene.id === "landing" && !heardVoice) { heardVoice = true; void firstContact(); return; }
      if (awaitingName) { awaitingName = false; void nameReply(text); return; }
      const t = text.toLowerCase();
      const named = ALL.filter(z => new RegExp(`\\b${z.toLowerCase()}\\b`).test(t));
      const everyone = /\b(everyone|everybody|all|lads|crew|guys|you lot|together)\b/.test(t);
      const owned = scene.objectives.filter(o => o.owner && !found.has(o.spot));
      if (/\b(books?|read)\b/.test(t) && owned.length) {
        for (const o of owned) if (!named.length || named.includes(o.owner!)) { claimed.delete(o.spot); send(o.owner!, o.spot); }
        return;
      }
      if (scene.id === "landing" && /\b(eggs?|pods?)\b/.test(t) && !/blue|yellow|red|big|small|tiny/.test(t)) {
        const own: Record<Agent, string> = { Oz: "yellow", Brix: "blue", Lowkey: "red" };
        (named.length ? named : ALL).forEach(z => send(z, own[z]));
        return;
      }
      const spot = Object.keys(scene.spots).find(k => scene.spots[k]!.words && new RegExp(`\\b(${scene.spots[k]!.words})`).test(t));
      const verb = /\b(go|check|look|head|walk|see|explore|investigate|search|find|visit|inspect|try|move|climb)\b/.test(t);
      if (spot && (verb || named.length)) {
        const obj = scene.objectives.find(o => o.spot === spot);
        if (obj && found.has(spot)) { const z = obj.owner ?? named[0] ?? "Oz"; say(z, "Already found that one.", true); timers.push(setTimeout(() => alive && say(z, null, true), 2000)); return; }
        let who: Agent[] = named.length ? named : everyone || (obj && !obj.owner) ? [...ALL] : [ALL.slice().sort((x, y) => dist(coords.current[x], scene.spots[spot]!.at) - dist(coords.current[y], scene.spots[spot]!.at))[0]!];
        if (obj?.owner) who = [who.includes(obj.owner) || !named.length ? obj.owner : who[0]!];
        if (obj) claimed.delete(spot);
        who.forEach((z, i) => timers.push(setTimeout(() => alive && send(z, spot), i * 2000)));
        return;
      }
      if (/\b(regroup|gather|come here|come back|meet up|stick together)\b/.test(t)) { (named.length ? named : ALL).forEach((z, i) => timers.push(setTimeout(() => alive && send(z, hub), i * 2000))); return; }
      void chat(text, named.length ? named : everyone || /\?$/.test(t.trim()) ? [...ALL] : ["Oz"]);
    };

    async function gatherAll(finder: Agent) {
      await wait(1500);
      // Others finish their walk, then come over on the walkable trails.
      await Promise.all(ALL.map(async (z, i) => {
        // They set off one behind another, at least two seconds apart.
        await wait(i * 2000);
        while (alive && heading[z]) await wait(200);
        if (!alive) return;
        const nodes = routeBetween(scene, at[z], scene.gather.spot);
        await walk(z, z === finder && !nodes.length ? [scene.gather.at[z]] : [...pathTo(z, nodes.slice(0, -1)), scene.gather.at[z]]);
        at[z] = scene.gather.spot;
      }));
      if (!alive) return;
      setBubbles({});
      const cx = ALL.reduce((t, z) => t + coords.current[z].x, 0) / 3;
      setFacing(Object.fromEntries(ALL.map(z => [z, coords.current[z].x <= cx ? "right" : "left"])) as Record<Agent, "left" | "right">);
      for (const [who, text] of scene.finale) {
        say(who, text); await wait(hold(text)); if (!alive) return; say(who, null); await wait(GAP);
      }
      setDone(true);
    }

    (async () => {
      ALL.forEach(paint);
      await wait(900);
      if (!alive) return;
      setShown(true);
      await Promise.all(ALL.map((a, i) => wait(i * 2000).then(() => walk(a, [scene.spots[scene.spawn[a].out]!.at]))));
      if (!alive) return;
      for (const [who, text] of scene.opening) { say(who, text); await wait(hold(text)); if (!alive) return; say(who, null); await wait(GAP); }
      ALL.forEach(a => void explore(a));
    })();
    return () => { alive = false; clearInterval(combatTimer); timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); };
  }, [scene]);

  // Space: tap = quick attack, hold ~0.6s then release = heavy. Key auto-repeat is ignored.
  useEffect(() => {
    if (!combat && !steered) return;
    let down = 0, timer: ReturnType<typeof setTimeout> | undefined;
    const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
    const kd = (e: KeyboardEvent) => { if (e.code !== "Space" || typing(e)) return; e.preventDefault(); if (e.repeat || down) return; down = performance.now(); timer = setTimeout(() => setCharging(true), HOLD_MS); };
    const ku = (e: KeyboardEvent) => { if (e.code !== "Space" || typing(e) || !down) return; e.preventDefault(); clearTimeout(timer); setCharging(false); const held = performance.now() - down; down = 0; attack.current(held >= HOLD_MS); };
    window.addEventListener("keydown", kd); window.addEventListener("keyup", ku);
    return () => { window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); clearTimeout(timer); setCharging(false); };
  }, [combat, steered]);
  const chargeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  return <>
  <div className="world-image-wrap prologue-scene" style={{ "--zone-aspect": String(ASPECT) } as CSSProperties} onPointerMove={e => {
      if (e.pointerType !== "mouse" || !stageRef.current) return;
      const r = stageRef.current.getBoundingClientRect();
      aimRef.current = { x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 };
    }} onPointerLeave={() => { aimRef.current = null; }} onPointerDown={e => {
      const tg = e.target as Element | null;
      const btn = tg && typeof tg.closest === "function" ? tg.closest("button") : null; if (btn && !btn.classList.contains("agent-marker")) return;
      if (!stageRef.current) return;
      const r = stageRef.current!.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * 100, y = ((e.clientY - r.top) / r.height) * 100;
      // Double-tap a Zig: in fights it takes control; elsewhere it toggles steering. A single tap on one never moves anyone.
      if (btn) {
        const a = ALL.find(z => markers.current[z] === btn);
        const last = lastMarkerTap.current, now = performance.now();
        if (a && last && last.a === a && now - last.t < 380) {
          lastMarkerTap.current = null;
          ctrlRef.current = a; setCtrl(a);
          if (!combat) { const next = steerRef.current === a ? null : a; steerRef.current = next; setSteered(next); }
        } else if (a) lastMarkerTap.current = { a, t: now };
        return;
      }
      if (combat) { moveCtrl.current({ x, y }); return; }
      if (steerRef.current) { steerMove.current(steerRef.current, { x, y }); return; }
      // Straight, swift beam: only tiny crackle along the line.
      boltRef.current(coords.current.Oz, x, y);
      zap.current({ x, y }, !!ambushHit.current({ x, y }));
    }}>
    <img className="world-image" src={scene.img} width={1520} height={1024} alt={scene.alt} />
    <div className="world-vignette"/>
    <div className="map-coordinate top-left">◉ &nbsp; {scene.label}</div>
    <div className="map-coordinate top-right">{scene.chapter}</div>
    <div className="world-stage" ref={stageRef}>
      <svg className="zap-layer" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {bolts.map(b => <g key={b.id}><path className={`zap-glow ${b.heavy ? "is-heavy" : ""}`} d={b.d}/><path className="zap-core" d={b.d}/><circle className="zap-hit" cx={b.x} cy={b.y} r="1.2"/></g>)}
      </svg>
      {bolts.map(b => <div key={`f${b.id}`} className="zap-flash" style={{ left: `${b.x}%`, top: `${b.y}%` }} />)}
      {hits.map(h => <div key={h.id} className={`combat-hit is-${h.kind}`} style={{ left: `${h.x}%`, top: `${h.y}%` }} aria-hidden="true"/>)}
      {scene.objectives.filter(o => found.includes(o.spot)).map(o => <div key={o.spot} className="location-tag zone-tag prologue-found" style={{ left: `${o.tag.x}%`, top: `${o.tag.y}%` }}><span className="location-line"/> {o.tag.label}</div>)}
      {scene.id === "long-walk" && <LongWalkAmbush stageRef={stageRef} hitRef={ambushHit} combatRef={enemies} crew={coords} onSay={ambushSay} onAlarm={onAlarm} onDefeat={onSheltonDefeat}/>}
      {scene.id === "city" && <OldCityRats stageRef={stageRef} hitRef={ambushHit} combatRef={enemies} crew={coords} onAlarm={onAlarm}/>}
      {ALL.map(a => { const p = coords.current[a]; return <Button key={a} ref={el => { markers.current[a] = el; }} type="button" variant="ghost" aria-label={`${a}${walking.includes(a) ? ", walking" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%`, "--depth": depthFor(p.y), "--z": 10 + Math.round(p.y * 10), opacity: shown ? 1 : 0, transition: "opacity .8s ease" } as CSSProperties} className={`agent-marker ${p.y < topLine() ? "near-top" : ""} ${p.x > 62 ? "near-right" : ""} ${p.x < 38 ? "near-left" : ""} marker-${a.toLowerCase()} facing-${facing[a]} ${a === "Oz" ? `oz-facing-${ozDir}` : ""} ${a === "Brix" ? `brix-facing-${brixDir}` : ""} ${walking.includes(a) ? "is-walking" : ""} ${a === "Oz" && bolts.some(b => b.id === jolt) ? "oz-jolt" : ""} ${(combat ? ctrl === a : steered === a) ? "is-controlled" : ""} ${a === "Brix" && combat ? "in-guard" : ""} ${swing[a] ?? ""}`}>
        {(combat ? ctrl === a : steered === a) && <span className="ctrl-ring" aria-hidden="true"/>}
        {bubbles[a] && <span className="idle-bubble">{bubbles[a]}</span>}
        <span className="sprite-stage"><CharacterSprite character={a}/></span>
        <span className="marker-name"><img className={WORDMARK[a].cls} src={WORDMARK[a].url} alt={a} draggable={false}/></span>
      </Button>; })}
    </div>
    <button type="button" className={`combat-attack ${combat ? "in-fight" : "is-idle"} ${charging ? "is-charged" : ""}`} aria-label={`Attack with ${combat ? ctrl : steered ?? ctrl} — tap for quick, hold for heavy`}
      onPointerDown={e => { e.preventDefault(); e.stopPropagation(); holdStart.current = performance.now(); clearTimeout(chargeTimer.current); chargeTimer.current = setTimeout(() => setCharging(true), HOLD_MS); attack.current(false); }}
      onPointerUp={e => { e.stopPropagation(); if (!holdStart.current) return; clearTimeout(chargeTimer.current); setCharging(false); const held = performance.now() - holdStart.current; holdStart.current = 0; if (held >= HOLD_MS) { resetAtk.current(); attack.current(true); } }}
      onPointerCancel={() => { holdStart.current = 0; clearTimeout(chargeTimer.current); setCharging(false); }}
      onContextMenu={e => e.preventDefault()}>
      <span>ATTACK</span><small>{combat ? ctrl : steered ?? ctrl}</small>
    </button>
    {!combat && steered && <div className="combat-hint" aria-hidden="true">Steering {steered} · click ground to walk · Space to attack (aim with mouse) · double-tap {steered} to let go</div>}
    {combat && <div className="combat-hint" aria-hidden="true">Double-tap a Zig to control · click ground to move · Space attacks where the mouse points (hold = heavy)</div>}
    <div className="map-coordinate bottom-left"><MapPin size={12}/> {scene.bottom}</div>
    {done && <div className="prologue-card" role="dialog" aria-label={scene.card.eyebrow}>
      <span className="prologue-card-eyebrow">{scene.card.eyebrow}</span>
      <strong>{scene.card.title}</strong>
      <p>{scene.card.text}</p>
      <button type="button" onClick={onNext}>{scene.card.next}</button>
    </div>}
  </div>
  {/* Skip control lives outside the game screen so mobile can place it below the map. */}
  <button type="button" className="prologue-skip" onClick={onSkip}>Skip to the Sanctuary ›</button>
  </>;
}
