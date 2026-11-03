import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import bg from "@/assets/kronk-lair.png.asset.json";
import kronkIdle from "@/assets/kronk-idle.png.asset.json";
import kronkStomp from "@/assets/kronk-stomp.webp.asset.json";
import { CharacterSprite } from "@/components/CharacterSprite";
import { speak, voicesOn } from "@/lib/voice";
import { startKronkMusic, stopKronkMusic, playSfx } from "@/lib/atmosphere";
import { MAX_HP as SQUAD_HP, allDown, damage, fullSquad, type Squad } from "@/lib/squad-health";

/** Kronk's Lair: inside the bunker gate, the crew face Kronk himself. Editor-only — no story road yet; Kronk fires laser eyes at the crew. */
type Zig = "Oz" | "Brix" | "Lowkey";
type Line = { who: Zig | "Kronk"; text: string; slam?: boolean };

/** Walkable dirt road traced from the creator's ground guide, in artwork % (x from left, y from top). */
const GROUND: [number, number][] = [[4,62],[96,62],[99,92],[1,92]];
type P = { x: number; y: number };
function inside(x: number, y: number) {
  let c = false;
  for (let i = 0, j = GROUND.length - 1; i < GROUND.length; j = i++) {
    const [xi, yi] = GROUND[i]!, [xj, yj] = GROUND[j]!;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
/** Nearest walkable point to a tap (keeps a small margin from the road edge). */
function clampToGround(t: P): P {
  if (inside(t.x, t.y) && inside(t.x, t.y - 1.5) && inside(t.x, t.y + 1.5)) return t;
  let best = t, bd = Infinity;
  for (let x = 2; x <= 96; x += 1) for (let y = 60; y <= 92; y += 0.5) {
    if (!inside(x, y) || !inside(x, y - 1.5) || !inside(x, y + 1.5)) continue;
    const d = (x - t.x) ** 2 + (y - t.y) ** 2;
    if (d < bd) { bd = d; best = { x, y }; }
  }
  return best;
}
function randomGround(): P {
  for (let i = 0; i < 60; i++) { const p = { x: 12 + Math.random() * 76, y: 66 + Math.random() * 22 }; if (inside(p.x, p.y) && inside(p.x, p.y - 1.5) && inside(p.x, p.y + 1.5)) return p; }
  return { x: 40, y: 80 };
}
const INTRO: Line[] = [
  { who: "Brix", text: "Gate's shut behind us. No going back now, lads." },
  { who: "Oz", text: "Oh no. Oh no no no. He's not in the tank anymore." },
  { who: "Lowkey", text: "Kronk. Standing right there at the stairs." },
  { who: "Kronk", text: "Well, well... little things, crawling into my house." },
  { who: "Oz", text: "Who let that overgrown handbag in here?!" },
  { who: "Kronk", text: "Handbag? Ssssay it again, small one. I dare you." },
  { who: "Oz", text: "Nope. Taking it back. Fully taking it back." },
  { who: "Oz", text: "Those tanks... are those RATS in the green stuff?!" },
  { who: "Kronk", text: "My children. Fed on the sludge. Hungry. Always hungry." },
  { who: "Brix", text: "That's where the sludge comes from. He's brewing it." },
  { who: "Lowkey", text: "And that N on the screen. I've seen that mark before. Somewhere I shouldn't remember." },
  { who: "Kronk", text: "The Network sees everything. And now... it sees you." },
  { who: "Oz", text: "Nobody move. Maybe he can't see us if we don't move." },
  { who: "Brix", text: "He can see us, Oz. Stay together. Stay behind me." },
  { who: "Kronk", text: "Run home to your little river. I will drink it dry." },
  { who: "Kronk", text: "I have crushed entire civilizations." },
  { who: "Oz", text: "Yeah? Well, you look like you came free with a sofa." },
  { who: "Brix", text: "Oz... I really think you should stop talking." },
  { who: "Lowkey", text: "Too late. He's angry.", slam: true },
  { who: "Kronk", text: "THEN LET'S SEE HOW FUNNY YOU ARE WITHOUT YOUR HEAD!" },
];
const SPOTS: { id: string; label: string; x: number; y: number; lines: Line[] }[] = [];

const KRONK_HP = 100;
// Kronk's single red eye in ground %: sprite box is 26% wide, feet at 59%, eye sits 73.7% across / 16.3% down the frame.
const EYE = { x: 50 - 13 + 0.737 * 26, y: 59 - 26 * (230 / 380) * (4 / 3) * (1 - 0.163) };

export function KronkLairScene() {
  const [pos, setPos] = useState<Record<Zig, P>>({ Brix: { x: 42, y: 84 }, Oz: { x: 52, y: 87 }, Lowkey: { x: 62, y: 85 } });
  const [moving, setMoving] = useState<Partial<Record<Zig, { dir: "left" | "right"; ms: number }>>>({});
  const [steer, setSteer] = useState<Zig | null>(null);
  const [bubble, setBubble] = useState<Line | null>(null);
  const [step, setStep] = useState(0);
  const lastTap = useRef<{ a: Zig; t: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const groundRef = useRef<HTMLDivElement>(null);
  const walkId = useRef<Partial<Record<Zig, number>>>({});
  const busy = useRef(false);
  // Boss theme plays from the moment the lair opens; every tap/key re-wakes audio in case the browser kept it locked.
  const musicOn = useRef(true);
  useEffect(() => {
    startKronkMusic();
    const go = () => { if (musicOn.current) startKronkMusic(); };
    window.addEventListener("pointerdown", go); window.addEventListener("keydown", go);
    return () => { window.removeEventListener("pointerdown", go); window.removeEventListener("keydown", go); stopKronkMusic(); };
  }, []);
  const [laser, setLaser] = useState<{ to: P; z: Zig; id: number } | null>(null);
  const [hit, setHit] = useState<Zig | null>(null);
  const [squad, setSquad] = useState<Squad>(fullSquad);
  const squadRef = useRef<Squad>(squad);
  const [kronkHp, setKronkHp] = useState(KRONK_HP);
  // Hit feedback: floating numbers over Kronk, combo counts per Zig, and a short screen shake on big hits.
  const [pops, setPops] = useState<{ id: number; text: string; kind: string; big?: boolean; x: number; y: number }[]>([]);
  const [shake, setShake] = useState(0);
  const combo = useRef<Partial<Record<Zig, { n: number; t: number }>>>({});
  const pop = (text: string, kind: string, x = 50, y = 46, big = false) => {
    const id = Date.now() + Math.random();
    setPops(p => [...p, { id, text, kind, big, x: x + (Math.random() * 6 - 3), y }]);
    setTimeout(() => setPops(p => p.filter(q => q.id !== id)), 900);
  };
  const kronkHpRef = useRef(KRONK_HP);
  const [kronkHit, setKronkHit] = useState(0);
  const [fx, setFx] = useState<{ from: P; kind: Zig; id: number }[]>([]);
  const cooldown = useRef<Partial<Record<Zig, number>>>({});
  const fighting = step >= 4 && kronkHp > 0; // fight is on as soon as Kronk first speaks and the lasers start

  useEffect(() => {
    if (step >= INTRO.length) return;
    const line = INTRO[step]!;
    if (line.slam) { playSfx("slam"); musicOn.current = true; startKronkMusic(); }
    let live = true, t: ReturnType<typeof setTimeout> | undefined;
    const started = performance.now();
    let advanced = false;
    const next = () => { if (!live || advanced) return; advanced = true; setStep(s => s + 1); };
    // Safety net: if a voice stalls, show the line anyway and move on instead of freezing the scene.
    const guard = setTimeout(() => { if (live) { setBubble(line); t = setTimeout(next, 3400); } }, 6000);
    void speak(line.who, line.text, () => { if (live) setBubble(line); }, 6000).then(() => {
      if (!live) return;
      clearTimeout(guard);
      t = setTimeout(next, voicesOn() ? 350 : Math.max(0, 3400 - (performance.now() - started)));
    });
    return () => { live = false; clearTimeout(guard); if (t) clearTimeout(t); };
  }, [step]);

  const movingRef = useRef(moving); movingRef.current = moving;
  // Unsteered Zigs mostly stand and stare at the tank, taking an occasional short stroll (~every 30s each).
  const posRef = useRef(pos); posRef.current = pos;
  const steerRef = useRef(steer); steerRef.current = steer;
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wander = (a: Zig, first = false) => {
      timers.push(setTimeout(() => {
        if (steerRef.current !== a) walkTo(a, randomGround());
        wander(a);
      }, first ? 8000 + Math.random() * 22000 : 26000 + Math.random() * 8000));
    };
    (["Brix", "Oz", "Lowkey"] as Zig[]).forEach(a => wander(a, true));
    return () => timers.forEach(clearTimeout);
  }, []);
  const [sludge, setSludge] = useState<{ x: number; y: number; id: number; r: number }[]>([]);
  const [quake, setQuake] = useState(0);
  const [rear, setRear] = useState(false);
  const [guard, setGuard] = useState(false);
  const [stunned, setStunned] = useState(false);
  const guardRef = useRef(false);
  const stunUntil = useRef(0);
  const setGuardState = (g: boolean) => { guardRef.current = g; setGuard(g); };
  // Kronk raises his armoured guard every so often (more often when enraged), then drops it.
  useEffect(() => {
    if (step < 4) return;
    let live = true; let t: ReturnType<typeof setTimeout>;
    const cycle = () => {
      t = setTimeout(() => {
        if (!live || kronkHpRef.current <= 0) return;
        if (performance.now() < stunUntil.current) return cycle();
        setGuardState(true);
        t = setTimeout(() => { if (!live) return; setGuardState(false); cycle(); }, kronkHpRef.current < KRONK_HP / 2 ? 3200 : 2400);
      }, kronkHpRef.current < KRONK_HP / 2 ? 4000 + Math.random() * 2000 : 6000 + Math.random() * 3000);
    };
    cycle();
    return () => { live = false; clearTimeout(t); setGuardState(false); };
  }, [step >= 4]);
  // Kronk's attacks: laser eyes, sludge spit, tail-slam shockwave, and (enraged) sludge rain.
  useEffect(() => {
    if (step < 4) return;
    let live = true; const timers: ReturnType<typeof setTimeout>[] = [];
    // Shared hit: moving Zigs dodge; otherwise lose a pip and get knocked back from Kronk.
    const hurt = (z: Zig, knock = 6) => {
      const p = posRef.current[z];
      if (squadRef.current[z] <= 0) return;
      if (movingRef.current[z]) { pop("DODGE!", "dodge", p.x, p.y - 16); return; }
      setHit(z); timers.push(setTimeout(() => setHit(h => (h === z ? null : h)), 500));
      playSfx("hurt");
      const q = damage(squadRef.current, z, 1); squadRef.current = q; setSquad(q);
      if (allDown(q)) timers.push(setTimeout(() => { if (!live) return; const f = fullSquad(); squadRef.current = f; setSquad(f); fire(); }, 4000));
      walkTo(z, clampToGround({ x: p.x + (p.x < 50 ? -knock : knock), y: p.y + knock / 2 }));
    };
    let last = "";
    const fire = () => {
      if (!live || kronkHpRef.current <= 0) return;
      const zs = (["Brix", "Oz", "Lowkey"] as Zig[]).filter(a => squadRef.current[a] > 0);
      if (!zs.length) return;
      const z = zs[Math.floor(Math.random() * zs.length)]!, p = posRef.current[z];
      const enraged = kronkHpRef.current < KRONK_HP / 2;
      // Pick an attack, never the same twice in a row. Tail slam and sludge rain unlock once he's enraged.
      const pool = ["laser", "spit", ...(enraged ? ["slam", "rain"] : ["slam"])].filter(k => k !== last);
      const kind = pool[Math.floor(Math.random() * pool.length)]!; last = kind;
      if (kind === "laser") {
        setLaser({ to: { x: p.x, y: p.y - 7 }, z, id: Date.now() });
        timers.push(setTimeout(() => hurt(z), 750));
        timers.push(setTimeout(() => setLaser(null), 1100));
      } else if (kind === "spit") {
        // Sludge spit: a green target ring appears under one Zig, then a glob lands there. Walk out of it.
        const at = { x: p.x, y: p.y };
        const id = Date.now(); setSludge(s => [...s, { ...at, id, r: 7 }]);
        timers.push(setTimeout(() => { playSfx("slash-hit"); zs.forEach(a => { const q = posRef.current[a]; if (Math.hypot(q.x - at.x, (q.y - at.y) * 1.6) < 7) hurt(a, 4); }); }, 1300));
        timers.push(setTimeout(() => setSludge(s => s.filter(g => g.id !== id)), 1900));
      } else if (kind === "rain") {
        // Sludge rain: three globs at once.
        zs.forEach((a, i) => { const q = posRef.current[a], at = { x: q.x + (Math.random() * 6 - 3), y: q.y }, id = Date.now() + i;
          setSludge(s => [...s, { ...at, id, r: 6 }]);
          timers.push(setTimeout(() => { zs.forEach(b => { const w = posRef.current[b]; if (Math.hypot(w.x - at.x, (w.y - at.y) * 1.6) < 6) hurt(b, 4); }); }, 1400 + i * 150));
          timers.push(setTimeout(() => setSludge(s => s.filter(g => g.id !== id)), 2000 + i * 150)); });
        void speak("Kronk", "DROWN IN IT!", () => {});
      } else {
        // Tail slam: he rears up, then a shockwave rolls across the floor. Anyone standing still gets hit.
        setRear(true);
        timers.push(setTimeout(() => { playSfx("slam"); setShake(s => s + 1); setQuake(Date.now()); zs.forEach(a => hurt(a, 8)); }, 1100));
        timers.push(setTimeout(() => { setQuake(0); setRear(false); }, 1800));
      }
      if (allDown(squadRef.current)) return;
      timers.push(setTimeout(fire, enraged ? 3000 + Math.random() * 2200 : 4800 + Math.random() * 3200));
    };
    timers.push(setTimeout(fire, 2500));
    return () => { live = false; timers.forEach(clearTimeout); };
  }, [step >= 4]);
  function walkTo(a: Zig, to: P) {
    const from = posRef.current[a], dx = to.x - from.x, ms = Math.max(300, Math.hypot(dx, (to.y - from.y) * 1.4) * 90);
    const id = (walkId.current[a] = (walkId.current[a] ?? 0) + 1), start = performance.now();
    setMoving(m => ({ ...m, [a]: { dir: dx < 0 ? "left" : "right", ms } }));
    // Painted every frame (like the other scenes), so the Zig really walks there instead of jumping.
    const frame = (now: number) => {
      if (walkId.current[a] !== id) return;
      const k = Math.min(1, (now - start) / ms);
      setPos(p => ({ ...p, [a]: { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k } }));
      if (k < 1) requestAnimationFrame(frame);
      else setMoving(m => ({ ...m, [a]: undefined }));
    };
    requestAnimationFrame(frame);
  }

  async function inspect(lines: Line[]) {
    if (busy.current || step < INTRO.length) return;
    busy.current = true;
    for (const l of lines) {
      const started = performance.now();
      await speak(l.who, l.text, () => setBubble(l));
      if (!voicesOn()) await new Promise(r => setTimeout(r, Math.max(0, 3000 - (performance.now() - started))));
    }
    busy.current = false;
  }

  // Zigs strike back: Oz stays back and throws sparks; Brix and Lowkey charge in, hit, then retreat to where they stood.
  const [atk, setAtk] = useState<Partial<Record<Zig, { cls: string; id: number }>>>({});
  const showAtk = (a: Zig, cls: string, ms: number) => { const id = Date.now() + Math.random(); setAtk(s => ({ ...s, [a]: { cls, id } })); setTimeout(() => setAtk(s => (s[a]?.id === id ? { ...s, [a]: undefined } : s)), ms); };
  function attack(a: Zig) {
    if (kronkHpRef.current <= 0 || squadRef.current[a] <= 0) return;
    const now = performance.now();
    if ((cooldown.current[a] ?? 0) > now) return;
    const p = posRef.current[a];
    const melee = a !== "Oz";
    // Melee: charge to Kronk's side, then come back.
    const side = p.x < 50 ? -1 : 1;
    const target = clampToGround({ x: 50 + side * (a === "Lowkey" ? 9 : 7), y: 64 });
    const travel = melee ? Math.max(300, Math.hypot(target.x - p.x, (target.y - p.y) * 1.4) * 90) : 0;
    cooldown.current[a] = now + travel * 2 + (a === "Brix" ? 900 : a === "Lowkey" ? 650 : 750);
    if (melee) walkTo(a, target);
    const c0 = combo.current[a], heavyNext = (c0 && now - c0.t < 1800 + travel * 2 ? c0.n + 1 : 1) % (a === "Brix" ? 3 : 4) === 0;
    setTimeout(() => {
      if (kronkHpRef.current <= 0 || squadRef.current[a] <= 0) return;
      // Strike pose
      setMoving(m => ({ ...m, [a]: undefined }));
      const cls = a === "Brix" ? `atk-punch ${heavyNext ? "is-heavy" : ""}` : a === "Lowkey" ? "atk-slash" : heavyNext ? "atk-heavy" : "atk-quick";
      showAtk(a, `${cls} facing-${side < 0 ? "right" : "left"} ${a.toLowerCase()}-facing-${side < 0 ? "right" : "left"}`, a === "Brix" ? 650 : 520);
      playSfx(a === "Brix" ? "swing" : a === "Oz" ? "zap" : "slash");
      setTimeout(() => land(a, travel), a === "Oz" ? 220 : 260);
      if (melee) setTimeout(() => { if (squadRef.current[a] > 0) walkTo(a, p); }, 620);
    }, travel);
  }
  function land(a: Zig, travel: number) {
      if (kronkHpRef.current <= 0 || squadRef.current[a] <= 0) return;
      const q = posRef.current[a];
      const from = a === "Oz" ? { x: q.x, y: q.y - 7 } : q;
      const fid = Date.now() + Math.random();
      setFx(f => [...f, { from, kind: a, id: fid }]); setTimeout(() => setFx(f => f.filter(x => x.id !== fid)), 400);
      playSfx(a === "Brix" ? "punch-heavy" : a === "Oz" ? "zap-hit" : "slash-hit");
      const c = combo.current[a], t = performance.now();
      const n = c && t - c.t < 1800 + travel * 2 ? c.n + 1 : 1;
      combo.current[a] = { n, t };
      let dmg = a === "Brix" ? 5 : a === "Lowkey" ? 3 : 2, label = "";
      if (a === "Brix" && n % 3 === 0) { dmg = 11; label = "HAYMAKER!"; }
      else if (a === "Oz" && n % 4 === 0) { dmg = 8; label = "CHAIN BOLT!"; }
      else if (a === "Lowkey" && Math.random() < 0.25) { dmg = 7; label = "SHADOW CRIT!"; }
      // Defence: armour soaks 1 damage always (more when enraged); while guarding he blocks almost everything.
      // Only Brix's HAYMAKER smashes the guard, stunning him so all hits deal double for a few seconds.
      if (guardRef.current) {
        if (label === "HAYMAKER!") { setGuardState(false); stunUntil.current = performance.now() + 3500; setStunned(true); setTimeout(() => setStunned(false), 3500); label = "GUARD BROKEN!"; playSfx("slam"); }
        else { dmg = 1; label = ""; pop("BLOCKED", "block", 50, 40); playSfx("miss"); }
      } else if (performance.now() < stunUntil.current) dmg *= 2;
      else dmg = Math.max(1, dmg - (kronkHpRef.current < KRONK_HP / 2 ? 2 : 1));
      pop(`-${dmg}`, a.toLowerCase(), 50, 46, !!label);
      if (label) { pop(label, a.toLowerCase(), 50, 36, true); setShake(s => s + 1); }
      else if (n >= 2 && !guardRef.current) pop(`${n} HIT`, a.toLowerCase(), 50, 40);
      const hp = Math.max(0, kronkHpRef.current - dmg);
      const halfway = kronkHpRef.current >= KRONK_HP / 2 && hp < KRONK_HP / 2;
      kronkHpRef.current = hp; setKronkHp(hp); setKronkHit(h => h + 1);
      if (halfway) void speak("Kronk", "ENOUGH! You will BURN!", () => {});
      if (hp <= 0) { setLaser(null); void speak("Kronk", "This... is not... over...", () => {}).then(() => speak("Oz", "Did we just... beat the handbag?!", () => {})); }
  }
  const attackRef = useRef(attack); attackRef.current = attack;
  // Space attacks with the steered Zig (Brix if nobody is steered); the others fight on their own.
  useEffect(() => {
    if (!fighting) return;
    const key = (e: KeyboardEvent) => { if (e.code === "Space") { e.preventDefault(); attackRef.current(steerRef.current ?? "Brix"); } };
    window.addEventListener("keydown", key);
    const auto = setInterval(() => {
      (["Brix", "Oz", "Lowkey"] as Zig[]).forEach(a => { if (a !== steerRef.current && Math.random() < 0.45) attackRef.current(a); });
    }, 2600);
    return () => { window.removeEventListener("keydown", key); clearInterval(auto); };
  }, [fighting]);

  const tapZig = (a: Zig) => {
    const now = performance.now(), l = lastTap.current;
    if (l && l.a === a && now - l.t < 380) { lastTap.current = null; setSteer(s => (s === a ? null : a)); }
    else lastTap.current = { a, t: now };
  };
  const onGround = (e: React.PointerEvent<HTMLDivElement>) => {
    const tg = e.target as Element | null;
    if (!steer || !groundRef.current || tg?.closest?.("button,.haven-zig")) return;
    const r = groundRef.current.getBoundingClientRect();
    walkTo(steer, clampToGround({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }));
  };

  return <div ref={wrapRef} className={`world-image-wrap prologue-scene haven-scene kronk-approach kronk-lair ${shake ? (shake % 2 ? "lair-shake-a" : "lair-shake-b") : ""}`} onPointerDown={onGround}>
    <div className="lair-haze" aria-hidden="true"/>
    <img className="world-image" src={bg.url} alt="Inside Kronk's bunker: red lamps, rat banners and glowing green tanks around a control console above a hazard-striped floor" />
    <div className="haven-layer">
      <div ref={groundRef} className="kronk-ground">
        <span key={kronkHit} onPointerDown={e => { if (!fighting) return; e.stopPropagation(); attack(steer ?? "Brix"); }} className={`kronk-boss ${kronkHit ? "is-struck" : ""} ${kronkHp <= 0 ? "is-defeated" : ""} ${rear ? "is-stomping" : ""} ${guard ? "is-guarding" : ""} ${stunned ? "is-stunned" : ""}`} role="img" aria-label="Kronk, the armoured crocodile, breathing at the foot of the stairs" style={{ backgroundImage: `url(${kronkIdle.url})` }}/>
        {laser && <svg key={laser.id} className="kronk-laser" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[-0.25, 0.25].map(o => <g key={o}>
            <line className="beam-halo" x1={EYE.x + o} y1={EYE.y} x2={laser.to.x + o * 0.4} y2={laser.to.y} />
            <line className="beam-red" x1={EYE.x + o} y1={EYE.y} x2={laser.to.x + o * 0.4} y2={laser.to.y} />
            <line className="beam-core" x1={EYE.x + o} y1={EYE.y} x2={laser.to.x + o * 0.4} y2={laser.to.y} />
          </g>)}
          <circle className="kronk-eye" cx={EYE.x} cy={EYE.y} r={0.9}/>
          <circle className="kronk-laser-burst" cx={laser.to.x} cy={laser.to.y} r={2.4}/>
        </svg>}
        {fx.map(fx => <svg key={fx.id} className="kronk-laser zig-strike" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {fx.kind === "Oz" && <polyline className="strike-bolt" points={`${fx.from.x},${fx.from.y} ${(fx.from.x + 50) / 2 + 2},${(fx.from.y + 52) / 2 - 3} ${(fx.from.x + 50) / 2 - 2},${(fx.from.y + 52) / 2 + 2} 50,52`} />}
          <circle className={`strike-burst strike-${fx.kind.toLowerCase()}`} cx={50} cy={53} r={fx.kind === "Brix" ? 5 : 3.5}/>
        </svg>)}
        
        {stunned && <span className="kronk-stun" aria-hidden="true">★ ★ ★</span>}
        <span key={rear ? "stomp-on" : "stomp-off"} className={`kronk-stomp ${rear ? "is-on" : ""}`} aria-hidden="true" style={{ backgroundImage: `url(${kronkStomp.url})` }}/>
        <span className="kronk-floor-shadow" aria-hidden="true"/>
        {sludge.map(g => <span key={g.id} className="sludge-mark" style={{ left: `${g.x}%`, top: `${g.y}%`, width: `${g.r * 0.9}%` }} aria-hidden="true"><span className="sludge-glob"/></span>)}
        {quake > 0 && <span key={quake} className="kronk-quake" aria-hidden="true"/>}
        {pops.map(p => <span key={p.id} className={`kronk-pop pop-${p.kind} ${p.big ? "is-big" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%` }} aria-hidden="true">{p.text}</span>)}
        {(["Brix", "Oz", "Lowkey"] as Zig[]).map(z => { const m = moving[z], p = pos[z]; return <span key={z} className={`haven-zig marker-${z.toLowerCase()} ${m ? `is-walking ${z.toLowerCase()}-facing-${m.dir} facing-${m.dir}` : ""} ${steer === z ? "is-controlled" : ""} ${hit === z ? "is-lasered" : ""} ${atk[z]?.cls ?? ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, ["--depth" as string]: String(Math.min(1.18, Math.max(0.78, 0.8 + (p.y - 50) * 0.01))), zIndex: 5 + Math.round(p.y), transitionDuration: "0ms" }} onPointerDown={e => { e.stopPropagation(); tapZig(z); }} role="button" aria-label={`${z} — double-tap to steer`}>{steer === z && <span className="ctrl-ring" aria-hidden="true"/>}<span className="sprite-stage"><CharacterSprite character={z}/></span></span>; })}
      </div>
      {step >= INTRO.length && SPOTS.map(s => <button key={s.id} type="button" className="kronk-spot" style={{ left: `${s.x}%`, top: `${s.y}%` }} onPointerDown={e => e.stopPropagation()} onClick={() => void inspect(s.lines)} aria-label={`Inspect ${s.label.toLowerCase()}`}><span>{s.label}</span></button>)}
    </div>
    <div className="map-coordinate top-right">KRONK'S LAIR</div>
    {fighting && typeof document !== "undefined" && createPortal(<button type="button" className="combat-attack" onPointerDown={e => { e.stopPropagation(); e.preventDefault(); attack(steer ?? "Brix"); }} aria-label="Attack Kronk">ATTACK<small>{(steer ?? "Brix").toUpperCase()}</small></button>, document.body)}
    {kronkHp <= 0 && <div className="map-coordinate kronk-down" role="status">KRONK DOWN</div>}
    {steer && <div className="combat-hint" aria-hidden="true">Steering {steer} · click the road to walk · double-tap {steer} to let go</div>}
    {step >= 4 && <div className="boss-hud" role="status" aria-label="Fight status">
      <div className="boss-hud-row"><span className="boss-name">KRONK <small>WARLORD</small></span></div>
      <div className="boss-bar"><span className="boss-bar-fill" style={{ width: `${(kronkHp / KRONK_HP) * 100}%` }}/></div>
      <div className="boss-hud-row crew squad-row">
        {(["Brix", "Oz", "Lowkey"] as Zig[]).map(a => <span key={a} className={`squad-pips ${squad[a] <= 0 ? "is-down" : ""}`} aria-label={`${a} ${squad[a]} of ${SQUAD_HP[a]}`}>
          <span className="boss-name">{a.toUpperCase()}</span>
          {Array.from({ length: SQUAD_HP[a] }, (_, i) => <span key={i} className={`pip ${i < squad[a] ? "on" : ""}`}/>)}
        </span>)}
      </div>
    </div>}
  </div>;
}
