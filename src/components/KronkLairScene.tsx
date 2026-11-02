import { useEffect, useRef, useState } from "react";
import bg from "@/assets/kronk-lair.png.asset.json";
import kronkIdle from "@/assets/kronk-idle.png.asset.json";
import { CharacterSprite } from "@/components/CharacterSprite";
import { speak, voicesOn } from "@/lib/voice";

/** Kronk's Lair: inside the bunker gate, the crew face Kronk himself. Editor-only — no story road yet; Kronk fires laser eyes at the crew. */
type Zig = "Oz" | "Brix" | "Lowkey";
type Line = { who: Zig | "Kronk"; text: string };

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
];
const SPOTS: { id: string; label: string; x: number; y: number; lines: Line[] }[] = [];

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
  const [laser, setLaser] = useState<{ to: P; z: Zig; id: number } | null>(null);
  const [hit, setHit] = useState<Zig | null>(null);

  useEffect(() => {
    if (step >= INTRO.length) return;
    const line = INTRO[step]!;
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
  // Laser eyes: once Kronk has spoken, he charges and fires twin red beams at a random Zig, who gets knocked back.
  useEffect(() => {
    if (step < 4) return;
    let live = true; const timers: ReturnType<typeof setTimeout>[] = [];
    const fire = () => {
      if (!live) return;
      const zs: Zig[] = ["Brix", "Oz", "Lowkey"], z = zs[Math.floor(Math.random() * 3)]!, p = posRef.current[z];
      setLaser({ to: { x: p.x, y: p.y - 7 }, z, id: Date.now() });
      timers.push(setTimeout(() => {
        setHit(z);
        const away = p.x < 50 ? -6 : 6;
        walkTo(z, clampToGround({ x: p.x + away, y: p.y + 3 }));
      }, 450));
      timers.push(setTimeout(() => { setLaser(null); setHit(null); }, 1000));
      timers.push(setTimeout(fire, 5500 + Math.random() * 4000));
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

  return <div ref={wrapRef} className="world-image-wrap prologue-scene haven-scene kronk-approach kronk-lair" onPointerDown={onGround}>
    <img className="world-image" src={bg.url} alt="Inside Kronk's bunker: red lamps, rat banners and glowing green tanks around a control console above a hazard-striped floor" />
    <div className="haven-layer">
      <div ref={groundRef} className="kronk-ground">
        <span className="kronk-boss" role="img" aria-label="Kronk, the armoured crocodile, breathing at the foot of the stairs" style={{ backgroundImage: `url(${kronkIdle.url})` }}/>
        {laser && <svg key={laser.id} className="kronk-laser" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {[-1.2, 1.2].map(o => <line key={o} x1={50 + o} y1={47} x2={laser.to.x + o * 0.4} y2={laser.to.y} />)}
          <circle cx={50 - 1.2} cy={47} r={0.9}/><circle cx={50 + 1.2} cy={47} r={0.9}/>
          <circle className="kronk-laser-burst" cx={laser.to.x} cy={laser.to.y} r={2.4}/>
        </svg>}
        {(["Brix", "Oz", "Lowkey"] as Zig[]).map(z => { const m = moving[z], p = pos[z]; return <span key={z} className={`haven-zig marker-${z.toLowerCase()} ${m ? `is-walking ${z.toLowerCase()}-facing-${m.dir} facing-${m.dir}` : ""} ${steer === z ? "is-controlled" : ""} ${hit === z ? "is-lasered" : ""}`} style={{ left: `${p.x}%`, ["--fy" as string]: `${100 - p.y}%`, ["--depth" as string]: String(Math.min(1.18, Math.max(0.78, 0.8 + (p.y - 50) * 0.01))), zIndex: 5 + Math.round(p.y), transitionDuration: "0ms" }} onPointerDown={e => { e.stopPropagation(); tapZig(z); }} role="button" aria-label={`${z} — double-tap to steer`}>{steer === z && <span className="ctrl-ring" aria-hidden="true"/>}<span className="sprite-stage"><CharacterSprite character={z}/></span></span>; })}
      </div>
      {step >= INTRO.length && SPOTS.map(s => <button key={s.id} type="button" className="kronk-spot" style={{ left: `${s.x}%`, top: `${s.y}%` }} onPointerDown={e => e.stopPropagation()} onClick={() => void inspect(s.lines)} aria-label={`Inspect ${s.label.toLowerCase()}`}><span>{s.label}</span></button>)}
    </div>
    <div className="map-coordinate top-right">KRONK'S LAIR</div>
    {steer && <div className="combat-hint" aria-hidden="true">Steering {steer} · click the road to walk · double-tap {steer} to let go</div>}
  </div>;
}
