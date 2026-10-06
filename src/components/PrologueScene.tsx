import { useEffect, useRef, useState, type CSSProperties } from "react";
import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CharacterSprite } from "@/components/CharacterSprite";
import { ACKS, ASPECT, REACTIONS, SHRUGS, routeBetween, type Scene } from "@/lib/prologue";
import { runCrewStep } from "@/lib/job-planning.functions";
import type { Agent, Point } from "@/lib/zones";
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
      el.classList.toggle("near-top", p.y < topLine()); el.classList.toggle("near-right", p.x > 62); el.classList.toggle("near-left", p.x < 38);
      el.style.setProperty("--depth", depthFor(p.y));
      el.style.setProperty("--z", String(10 + Math.round(p.y * 10)));
    };
    const talking = new Set<Agent>();
    const orders: Partial<Record<Agent, string>> = {};
    const cancel: Partial<Record<Agent, boolean>> = {};
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
        if (a === "Oz" && (Math.abs(dx) > 0.3 || Math.abs(dy) > 0.3)) setOzDir(Math.abs(dy) > Math.abs(dx) * 0.7 ? (dy < 0 ? "up" : "down") : (dx < 0 ? "left" : "right"));
        if (Math.abs(dx) >= 0.3) setFacing(f => ({ ...f, [a]: dx < 0 ? "left" : "right" }));
      };
      let seg = 0, last = performance.now();
      face(pts[0]!);
      setWalking(w => w.includes(a) ? w : [...w, a]);
      const step = (time: number) => {
        if (!alive) return;
        if (cancel[a]) { cancel[a] = false; setWalking(w => w.filter(x => x !== a)); resolve(); return; }
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
    return () => { alive = false; timers.forEach(clearTimeout); frames.forEach(cancelAnimationFrame); };
  }, [scene]);

  return <>
  <div className="world-image-wrap prologue-scene" style={{ "--zone-aspect": String(ASPECT) } as CSSProperties}>
    <img className="world-image" src={scene.img} width={1520} height={1024} alt={scene.alt} />
    <div className="world-vignette"/>
    <div className="map-coordinate top-left">◉ &nbsp; {scene.label}</div>
    <div className="map-coordinate top-right">{scene.chapter}</div>
    <div className="world-stage">
      {scene.objectives.filter(o => found.includes(o.spot)).map(o => <div key={o.spot} className="location-tag zone-tag prologue-found" style={{ left: `${o.tag.x}%`, top: `${o.tag.y}%` }}><span className="location-line"/> {o.tag.label}</div>)}
      {ALL.map(a => { const p = coords.current[a]; return <Button key={a} ref={el => { markers.current[a] = el; }} type="button" variant="ghost" aria-label={`${a}${walking.includes(a) ? ", walking" : ""}`} style={{ left: `${p.x}%`, top: `${p.y}%`, "--depth": depthFor(p.y), "--z": 10 + Math.round(p.y * 10), opacity: shown ? 1 : 0, transition: "opacity .8s ease" } as CSSProperties} className={`agent-marker ${p.y < topLine() ? "near-top" : ""} ${p.x > 62 ? "near-right" : ""} ${p.x < 38 ? "near-left" : ""} marker-${a.toLowerCase()} facing-${facing[a]} ${a === "Oz" ? `oz-facing-${ozDir}` : ""} ${walking.includes(a) ? "is-walking" : ""}`}>
        {bubbles[a] && <span className="idle-bubble">{bubbles[a]}</span>}
        <span className="sprite-stage"><CharacterSprite character={a}/></span>
        <span className="marker-name"><img className={WORDMARK[a].cls} src={WORDMARK[a].url} alt={a} draggable={false}/></span>
      </Button>; })}
    </div>
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
