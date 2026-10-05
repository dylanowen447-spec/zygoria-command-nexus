import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { LANDING, routeBetween } from "@/lib/prologue";
import type { Agent, Point } from "@/lib/zones";
import ozWordmark from "@/assets/oz-wordmark.png.asset.json";
import brixWordmark from "@/assets/brix-wordmark.png.asset.json";
import lowkeyWordmark from "@/assets/lowkey-wordmark.png.asset.json";

const ALL: Agent[] = ["Oz", "Brix", "Lowkey"];
const SPEED = 4.2; // a little slower than home: they are cautious here
const WORDMARK: Record<Agent, { url: string; cls: string }> = { Oz: { url: ozWordmark.url, cls: "oz-wordmark" }, Brix: { url: brixWordmark.url, cls: "brix-wordmark" }, Lowkey: { url: lowkeyWordmark.url, cls: "lowkey-wordmark" } };
const depthFor = (y: number) => (1 - Math.min(Math.max((64 - y) / 30, 0), 1) * 0.22).toFixed(3);
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / LANDING.aspect);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

type Props = { onLog: (agent: Agent, text: string) => void; onComplete: () => void; onSkip: () => void };

/** Chapter 1: the Zigs hatch, explore the crater on their own, and only find the skyline once they have looked around. */
export function PrologueLanding({ onLog, onComplete, onSkip }: Props) {
  const coords = useRef<Record<Agent, Point>>(Object.fromEntries(ALL.map(a => [a, { ...LANDING.spawn[a].inside }])) as Record<Agent, Point>);
  const markers = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const [hatched, setHatched] = useState(false);
  const [walking, setWalking] = useState<Agent[]>([]);
  const [facing, setFacing] = useState<Record<Agent, "left" | "right">>({ Oz: "right", Brix: "right", Lowkey: "left" });
  const [ozDir, setOzDir] = useState<"down" | "left" | "right" | "up">("down");
  const [bubbles, setBubbles] = useState<Partial<Record<Agent, string>>>({});
  const [found, setFound] = useState(false);
  const [done, setDone] = useState(false);
  const logRef = useRef(onLog);
  logRef.current = onLog;

  useEffect(() => {
    let alive = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const frames: number[] = [];
    const wait = (ms: number) => new Promise<void>(r => { timers.push(setTimeout(r, ms)); });
    const paint = (a: Agent) => {
      const el = markers.current[a], p = coords.current[a];
      if (!el) return;
      el.style.left = `${p.x}%`; el.style.top = `${p.y}%`;
      el.style.setProperty("--depth", depthFor(p.y));
      el.style.setProperty("z-index", String(10 + Math.round(p.y * 10)), "important");
    };
    const say = (a: Agent, text: string | null) => { setBubbles(b => ({ ...b, [a]: text ?? undefined })); if (text) logRef.current(a, text); };
    const walk = (a: Agent, pts: Point[]) => new Promise<void>(resolve => {
      if (!pts.length) return resolve();
      const face = (t: Point) => {
        const o = coords.current[a], dx = t.x - o.x, dy = t.y - o.y;
        if (a === "Oz" && (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3)) setOzDir(Math.abs(dy) > Math.abs(dx) * 0.7 ? (dy < 0 ? "up" : "down") : (dx < 0 ? "left" : "right"));
        if (Math.abs(dx) >= 0.3) setFacing(f => ({ ...f, [a]: dx < 0 ? "left" : "right" }));
      };
      let seg = 0, last = performance.now();
      face(pts[0]!);
      setWalking(w => w.includes(a) ? w : [...w, a]);
      const step = (time: number) => {
        if (!alive) return;
        let budget = Math.min(time - last, 64) / 1000 * SPEED;
        last = time;
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

    const at: Record<Agent, string> = { Oz: LANDING.spawn.Oz.out, Brix: LANDING.spawn.Brix.out, Lowkey: LANDING.spawn.Lowkey.out };
    const heading: Partial<Record<Agent, string>> = {};
    const seen: Record<Agent, Set<string>> = { Oz: new Set(), Brix: new Set(), Lowkey: new Set() };
    const used = new Set<string>();
    let unlockedAt = 0, discovered = false;
    const start = performance.now();
    const line = (a: Agent, spot: string) => {
      const options = LANDING.spots[spot]!.lines[a];
      const fresh = options.filter(l => !used.has(l));
      const l = pick(fresh.length ? fresh : options);
      used.add(l);
      return l;
    };

    async function explore(a: Agent) {
      await wait(800 + Math.random() * 2400);
      while (alive && !discovered) {
        // Objective only becomes worth noticing after everyone has had a proper look around.
        if (!unlockedAt && (ALL.every(z => seen[z].size >= 2) && performance.now() - start > 40000 || performance.now() - start > 100000)) {
          unlockedAt = performance.now();
          const hinter = pick(ALL);
          say(hinter, LANDING.hints[hinter]);
          timers.push(setTimeout(() => alive && say(hinter, null), 3000));
        }
        const taken = new Set(ALL.filter(z => z !== a).flatMap(z => [at[z], heading[z]].filter(Boolean) as string[]));
        let options = Object.keys(LANDING.spots).filter(s => s !== at[a] && !taken.has(s) && s !== LANDING.objective);
        let target: string;
        const drawn = unlockedAt && !taken.has(LANDING.objective) && (Math.random() < 0.4 || performance.now() - unlockedAt > 25000);
        if (drawn) target = LANDING.objective;
        else {
          const unseen = options.filter(s => !seen[a].has(s));
          if (unseen.length && Math.random() < 0.75) options = unseen;
          // Prefer somewhere close: they poke around rather than march across the map.
          options.sort((x, y) => routeBetween(at[a], x).length - routeBetween(at[a], y).length);
          target = pick(options.slice(0, 3));
        }
        heading[a] = target;
        const nodes = routeBetween(at[a], target);
        const jitter = { Oz: { x: -1, y: 0.6 }, Brix: { x: 1.2, y: 0 }, Lowkey: { x: 0, y: -0.6 } }[a];
        await walk(a, nodes.map((n, i) => { const p = LANDING.spots[n]!.at; return i === nodes.length - 1 ? { x: p.x + jitter.x, y: p.y + jitter.y } : p; }));
        at[a] = target; heading[a] = undefined; seen[a].add(target);
        if (!alive || discovered && target !== LANDING.objective) return;
        if (target === LANDING.objective) { discovered = true; await discover(a); return; }
        await wait(500);
        say(a, line(a, target));
        await wait(2600);
        if (!alive || discovered) return;
        say(a, null);
        // Someone nearby sometimes answers back.
        const near = ALL.find(z => z !== a && dist(coords.current[z], coords.current[a]) < 14 && !heading[z]);
        if (near && Math.random() < 0.35) {
          setFacing(f => ({ ...f, [near]: coords.current[a].x < coords.current[near].x ? "left" : "right" }));
          say(near, pick(LANDING.reactions[near]));
          await wait(1800);
          if (!alive) return;
          say(near, null);
        }
        await wait(1200 + Math.random() * 3500);
      }
    }

    async function discover(a: Agent) {
      setFound(true);
      setFacing(f => ({ ...f, [a]: "right" }));
      say(a, LANDING.spots[LANDING.objective]!.lines[a][0]!);
      await wait(2800);
      if (!alive) return;
      say(a, a === "Oz" ? "Lads! Up here!" : "Over here.");
      // Others finish what they're doing, then come up on the walkable trails.
      await Promise.all(ALL.filter(z => z !== a).map(async z => {
        while (alive && heading[z]) await wait(200);
        const nodes = routeBetween(at[z], LANDING.objective).slice(0, -1);
        await walk(z, [...nodes.map(n => LANDING.spots[n]!.at), LANDING.gather[z]]);
        at[z] = LANDING.objective;
      }));
      if (!alive) return;
      say(a, null);
      await walk(a, [LANDING.gather[a]]);
      setFacing({ Oz: "right", Brix: "left", Lowkey: "right" });
      for (const [who, text] of LANDING.finale) {
        say(who, text); await wait(2600); if (!alive) return; say(who, null);
      }
      setDone(true);
    }

    (async () => {
      ALL.forEach(paint);
      await wait(900);
      if (!alive) return;
      setHatched(true);
      await Promise.all(ALL.map((a, i) => wait(i * 500).then(() => walk(a, [LANDING.spots[LANDING.spawn[a].out]!.at]))));
      if (!alive) return;
      for (const [who, text] of LANDING.opening) { say(who, text); await wait(2400); if (!alive) return; say(who, null); }
      ALL.forEach(a => void explore(a));
    })();
    return () => { alive = false; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); };
  }, []);

  return <div className="world-image-wrap prologue-scene" style={{ "--zone-aspect": String(LANDING.aspect) } as CSSProperties}>
    <img className="world-image" src={LANDING.img} width={1520} height={1024} alt="Old Earth landing site: three cracked egg pods glowing blue, yellow and red in a dusty crater, a broken overpass and a distant ruined city at sunset" />
    <div className="world-vignette"/>
    <div className="map-coordinate top-left">◉ &nbsp; {LANDING.label}</div>
    <div className="map-coordinate top-right">CHAPTER 01 · THREE EGGS</div>
    <div className="world-stage">
      {found && <div className="location-tag zone-tag prologue-found" style={{ left: "60%", top: "24%" }}><span className="location-line"/> OLD CITY — DISTANT</div>}
      {ALL.map(a => { const p = coords.current[a]; return <Button key={a} ref={el => { markers.current[a] = el; }} type="button" variant="ghost" aria-label={`${a}${walking.includes(a) ? ", walking" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%`, "--depth": depthFor(p.y), opacity: hatched ? 1 : 0, transition: "opacity .8s ease" } as CSSProperties} className={`agent-marker marker-${a.toLowerCase()} facing-${facing[a]} ${a === "Oz" ? `oz-facing-${ozDir}` : ""} ${walking.includes(a) ? "is-walking" : ""}`}>
        {bubbles[a] && <span className="idle-bubble">{bubbles[a]}</span>}
        <span className="sprite-stage"><CharacterSprite character={a}/></span>
        <span className="marker-name"><img className={WORDMARK[a].cls} src={WORDMARK[a].url} alt={a} draggable={false}/></span>
      </Button>; })}
    </div>
    <div className="map-coordinate bottom-left"><MapPin size={12}/> {LANDING.bottom}</div>
    <button type="button" className="prologue-skip" onClick={onSkip}>Skip to the Sanctuary ›</button>
    {done && <div className="prologue-card" role="dialog" aria-label="Chapter complete">
      <span className="prologue-card-eyebrow">CHAPTER 01 COMPLETE</span>
      <strong>Old City lies ahead</strong>
      <p>The crew have spotted the ruined towers. Their journey into Old City is the next chapter — coming soon.</p>
      <button type="button" onClick={onComplete}>Continue to the Sanctuary ›</button>
    </div>}
  </div>;
}
