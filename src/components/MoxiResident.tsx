import { useEffect, useRef, useState } from "react";
import moxiWalk from "@/assets/moxi-walk.png.asset.json";

type P = { x: number; y: number };
/** One walkable chain along the visitor-drawn trails: resting grass below the workshop → crossroads V → bridge trail → switchback → lookout (artwork %). */
const CHAIN: P[] = [
  { x: 60, y: 68 }, { x: 57, y: 72.5 }, { x: 52, y: 67 }, { x: 48, y: 63 },
  { x: 42, y: 63 }, { x: 36, y: 64 },
  { x: 42, y: 63 }, { x: 48, y: 63 },
  { x: 50, y: 63.5 }, { x: 53, y: 58.7 },
  { x: 50.5, y: 54 }, { x: 50.7, y: 47 }, { x: 48, y: 43.8 }, { x: 47.5, y: 40.8 },
  { x: 47, y: 38 }, { x: 49, y: 35.5 }, { x: 53.5, y: 32.5 }, { x: 55, y: 30 },
  { x: 51, y: 26 }, { x: 49.5, y: 23.5 }, { x: 52, y: 21.5 }, { x: 56.5, y: 20.2 },
];
const TREE = 0, GRASS = 3, PIER = 5, SUMMIT = CHAIN.length - 1;
const SPEED = 3.2;
export const MOXI_LINES = ["Mm. Fish?", "…Hi.", "Shiny river. I like it here.", "I slept a long time. It's louder now. Nicer.", "Oz smells like smoke.", "Brix's hammer is too loud.", "Lowkey sees me. He always sees me.", "*happy chirp*", "Up top. Wind is quiet.", "I can see everything from here."];

/** Moxi as a permanent Sanctuary resident: hops along her own short trail, sometimes hides under the evergreen. */
export function MoxiResident({ say }: { say: { id: number; text: string } | null }) {
  const el = useRef<HTMLDivElement>(null);
  const pos = useRef<P>({ ...CHAIN[0]! });
  const [walking, setWalking] = useState(false);
  const [left, setLeft] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [bubble, setBubble] = useState<string | null>(null);
  useEffect(() => { if (!say) return; setHidden(false); setBubble(say.text); const t = setTimeout(() => setBubble(null), Math.max(3200, 1600 + say.text.length * 40)); return () => clearTimeout(t); }, [say]);
  useEffect(() => {
    let alive = true, idx = 0, raf = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>(r => timers.push(setTimeout(r, ms)));
    const paint = () => { const e = el.current, p = pos.current; if (!e) return; e.style.left = `${p.x}%`; e.style.top = `${p.y}%`; e.style.zIndex = String(10 + Math.round(p.y * 10)); e.classList.toggle("near-top", p.y < 26); };
    const go = (to: number) => new Promise<void>(resolve => {
      const pts = to > idx ? CHAIN.slice(idx + 1, to + 1) : CHAIN.slice(to, idx).reverse();
      let seg = 0, last = performance.now();
      setWalking(true);
      const step = (t: number) => {
        if (!alive) return;
        let b = Math.min(t - last, 64) / 1000 * SPEED; last = t;
        while (b > 0 && seg < pts.length) {
          const p = pos.current, q = pts[seg]!, d = Math.hypot(q.x - p.x, q.y - p.y);
          setLeft(q.x < p.x);
          if (d <= b) { pos.current = { ...q }; b -= d; seg++; } else { pos.current = { x: p.x + (q.x - p.x) * b / d, y: p.y + (q.y - p.y) * b / d }; b = 0; }
        }
        paint();
        if (seg >= pts.length) { idx = to; setWalking(false); resolve(); } else raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    });
    (async () => {
      paint();
      while (alive) {
        await wait(4000 + Math.random() * 7000); if (!alive) return;
        if (idx === 0 && Math.random() < 0.3) { setHidden(true); await wait(9000); setHidden(false); continue; }
        const choices = [TREE, GRASS, PIER, SUMMIT, SUMMIT].filter(i => i !== idx);
        await go(choices[Math.floor(Math.random() * choices.length)]!);
        if (Math.random() < 0.35) { setBubble(MOXI_LINES[Math.floor(Math.random() * MOXI_LINES.length)]!); timers.push(setTimeout(() => alive && setBubble(null), 3000)); }
      }
    })();
    return () => { alive = false; cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  }, []);
  return <div ref={el} className={`moxi-resident ${walking ? "is-walking" : ""} ${left ? "" : "face-right"} ${hidden ? "is-hidden" : ""}`} aria-label="Moxi">
    {bubble && <span className="idle-bubble">{bubble}</span>}
    <span className="moxi-sprite" style={{ backgroundImage: `url(${moxiWalk.url})` }} />
  </div>;
}
