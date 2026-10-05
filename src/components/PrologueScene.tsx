import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { ASPECT, REACTIONS, routeBetween, type Scene } from "@/lib/prologue";
import type { Agent, Point } from "@/lib/zones";
import ozWordmark from "@/assets/oz-wordmark.png.asset.json";
import brixWordmark from "@/assets/brix-wordmark.png.asset.json";
import lowkeyWordmark from "@/assets/lowkey-wordmark.png.asset.json";

const ALL: Agent[] = ["Oz", "Brix", "Lowkey"];
const SPEED = 4.2; // a little slower than home: they are cautious here
const WORDMARK: Record<Agent, { url: string; cls: string }> = { Oz: { url: ozWordmark.url, cls: "oz-wordmark" }, Brix: { url: brixWordmark.url, cls: "brix-wordmark" }, Lowkey: { url: lowkeyWordmark.url, cls: "lowkey-wordmark" } };
const depthFor = (y: number) => (1 - Math.min(Math.max((64 - y) / 30, 0), 1) * 0.22).toFixed(3);
const dist = (a: Point, b: Point) => Math.hypot(b.x - a.x, (b.y - a.y) / ASPECT);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]!;

type Props = { scene: Scene; onLog: (agent: Agent, text: string) => void; onNext: () => void; onSkip: () => void };

/** One prologue area: the Zigs explore its walkable graph on their own and only notice objectives after looking around. */
export function PrologueScene({ scene, onLog, onNext, onSkip }: Props) {
  const coords = useRef<Record<Agent, Point>>(Object.fromEntries(ALL.map(a => [a, { ...scene.spawn[a].from }])) as Record<Agent, Point>);
  const markers = useRef<Partial<Record<Agent, HTMLButtonElement | null>>>({});
  const [shown, setShown] = useState(false);
  const [walking, setWalking] = useState<Agent[]>([]);
  const [facing, setFacing] = useState<Record<Agent, "left" | "right">>({ Oz: "right", Brix: "right", Lowkey: "left" });
  const [ozDir, setOzDir] = useState<"down" | "left" | "right" | "up">("down");
  const [bubbles, setBubbles] = useState<Partial<Record<Agent, string>>>({});
  const [found, setFound] = useState<string[]>([]);
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

    const objectiveSpots = new Set(scene.objectives.map(o => o.spot));
    const at: Record<Agent, string> = { Oz: scene.spawn.Oz.out, Brix: scene.spawn.Brix.out, Lowkey: scene.spawn.Lowkey.out };
    const heading: Partial<Record<Agent, string>> = {};
    const seen: Record<Agent, Set<string>> = { Oz: new Set(), Brix: new Set(), Lowkey: new Set() };
    const used = new Set<string>();
    const claimed = new Set<string>();
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
        const elapsed = performance.now() - start;
        if (!unlockedAt && (ALL.every(z => seen[z].size >= scene.unlock.seen) && elapsed > scene.unlock.ms || elapsed > scene.unlock.maxMs)) {
          unlockedAt = performance.now();
          const hinter = pick(ALL);
          say(hinter, scene.hints[hinter]);
          timers.push(setTimeout(() => alive && say(hinter, null), 3000));
        }
        const taken = new Set(ALL.filter(z => z !== a).flatMap(z => [at[z], heading[z]].filter(Boolean) as string[]));
        const goal = unlockedAt ? scene.objectives.find(o => !claimed.has(o.spot) && (!o.owner || o.owner === a) && !taken.has(o.spot)) : undefined;
        let target: string;
        if (goal && (Math.random() < 0.4 || performance.now() - unlockedAt > 25000)) { target = goal.spot; claimed.add(goal.spot); }
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
        at[a] = target; delete heading[a]; seen[a].add(target);
        if (!alive || finished) return;
        const objective = scene.objectives.find(o => o.spot === target);
        if (objective) {
          setFound(f => [...f, objective.spot]);
          setFacing(f => ({ ...f, [a]: "right" }));
          for (const text of objective.found[a]) { say(a, text); await wait(2800); if (!alive) return; }
          say(a, null);
          if (scene.objectives.every(o => claimed.has(o.spot)) && !finished) {
            // Wait for any other finder to finish reading before the group gathers.
            finished = true;
            await gatherAll(a);
            return;
          }
          await wait(1500);
          continue;
        }
        await wait(500);
        const l = line(a, target);
        if (l) { say(a, l); await wait(2600); if (!alive || finished) return; say(a, null); }
        // Someone nearby sometimes answers back.
        const near = ALL.find(z => z !== a && dist(coords.current[z], coords.current[a]) < 14 && !heading[z]);
        if (near && Math.random() < 0.35) {
          setFacing(f => ({ ...f, [near]: coords.current[a].x < coords.current[near].x ? "left" : "right" }));
          say(near, pick(REACTIONS[near]));
          await wait(1800);
          if (!alive) return;
          say(near, null);
        }
        await wait(1200 + Math.random() * 3500);
      }
    }

    async function gatherAll(finder: Agent) {
      await wait(1500);
      // Others finish their walk, then come over on the walkable trails.
      await Promise.all(ALL.map(async z => {
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
        say(who, text); await wait(2600); if (!alive) return; say(who, null);
      }
      setDone(true);
    }

    (async () => {
      ALL.forEach(paint);
      await wait(900);
      if (!alive) return;
      setShown(true);
      await Promise.all(ALL.map((a, i) => wait(i * 500).then(() => walk(a, [scene.spots[scene.spawn[a].out]!.at]))));
      if (!alive) return;
      for (const [who, text] of scene.opening) { say(who, text); await wait(2400); if (!alive) return; say(who, null); }
      ALL.forEach(a => void explore(a));
    })();
    return () => { alive = false; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); };
  }, [scene]);

  return <div className="world-image-wrap prologue-scene" style={{ "--zone-aspect": String(ASPECT) } as CSSProperties}>
    <img className="world-image" src={scene.img} width={1520} height={1024} alt={scene.alt} />
    <div className="world-vignette"/>
    <div className="map-coordinate top-left">◉ &nbsp; {scene.label}</div>
    <div className="map-coordinate top-right">{scene.chapter}</div>
    <div className="world-stage">
      {scene.objectives.filter(o => found.includes(o.spot)).map(o => <div key={o.spot} className="location-tag zone-tag prologue-found" style={{ left: `${o.tag.x}%`, top: `${o.tag.y}%` }}><span className="location-line"/> {o.tag.label}</div>)}
      {ALL.map(a => { const p = coords.current[a]; return <Button key={a} ref={el => { markers.current[a] = el; }} type="button" variant="ghost" aria-label={`${a}${walking.includes(a) ? ", walking" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%`, "--depth": depthFor(p.y), opacity: shown ? 1 : 0, transition: "opacity .8s ease" } as CSSProperties} className={`agent-marker marker-${a.toLowerCase()} facing-${facing[a]} ${a === "Oz" ? `oz-facing-${ozDir}` : ""} ${walking.includes(a) ? "is-walking" : ""}`}>
        {bubbles[a] && <span className="idle-bubble">{bubbles[a]}</span>}
        <span className="sprite-stage"><CharacterSprite character={a}/></span>
        <span className="marker-name"><img className={WORDMARK[a].cls} src={WORDMARK[a].url} alt={a} draggable={false}/></span>
      </Button>; })}
    </div>
    <div className="map-coordinate bottom-left"><MapPin size={12}/> {scene.bottom}</div>
    <button type="button" className="prologue-skip" onClick={onSkip}>Skip to the Sanctuary ›</button>
    {done && <div className="prologue-card" role="dialog" aria-label={scene.card.eyebrow}>
      <span className="prologue-card-eyebrow">{scene.card.eyebrow}</span>
      <strong>{scene.card.title}</strong>
      <p>{scene.card.text}</p>
      <button type="button" onClick={onNext}>{scene.card.next}</button>
    </div>}
  </div>;
}
