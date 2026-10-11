import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import sheet from "@/assets/boulder-pot.png";
import art from "@/assets/brix-boulder-pot-art.png.asset.json";

/** Brix's pet: a decorative overlay pottering around the workshop yard, outside the agent simulation.
 * Strip frames: 0-3 front idle, 4-8 walk (facing right), 9 sleep, 10 happy. */
const HOME = { x: 79, y: 63 };
const RANGE = 5;

export function BoulderPot({ happy, asleep }: { happy: boolean; asleep: boolean }) {
  const el = useRef<HTMLDivElement>(null);
  const [frame, setFrame] = useState(0);
  const [left, setLeft] = useState(false);
  const [card, setCard] = useState(false);
  const st = useRef({ x: HOME.x, target: HOME.x, t: 0, rest: 2 });

  useEffect(() => {
    let raf = 0, last = performance.now(), acc = 0, f = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
      const s = st.current;
      let walking = false;
      if (!asleep && !happy) {
        if (s.rest > 0) { s.rest -= dt; if (s.rest <= 0) s.target = HOME.x + (Math.random() * 2 - 1) * RANGE; }
        else {
          const d = s.target - s.x;
          if (Math.abs(d) < 0.1) s.rest = 2 + Math.random() * 4;
          else { s.x += Math.sign(d) * Math.min(Math.abs(d), 1.4 * dt); walking = true; setLeft(d < 0); }
        }
      }
      if (el.current) el.current.style.left = `${s.x}%`;
      if (acc > (walking ? 0.16 : 0.45)) { acc = 0; f++; setFrame(asleep ? 9 : happy ? 10 : walking ? 4 + (f % 5) : f % 4); }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [asleep, happy]);

  const close = (e: React.SyntheticEvent) => { e.stopPropagation(); e.preventDefault(); setCard(false); };
  return (<>
    <div ref={el} className={`boulder-pot ${happy ? "is-happy" : ""}`} style={{ left: `${HOME.x}%`, top: `${HOME.y}%` }} aria-label="Boulder Pot, Brix's pet — tap to view artwork" role="button" tabIndex={0}
      onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setCard(true); }} onKeyDown={e => { if (e.key === "Enter") setCard(true); }}>
      <span className="boulder-pot-art" style={{ backgroundImage: `url(${sheet})`, backgroundPosition: `${(frame / 10) * 100}% 0`, transform: left && frame >= 4 && frame <= 8 ? "scaleX(-1)" : undefined }} />
    </div>
    {card && createPortal(<div className="cover-backdrop" onPointerDown={e => e.stopPropagation()} onClick={e => { if (e.target === e.currentTarget) close(e); else e.stopPropagation(); }}>
      <div className="cover-dialog" role="dialog" aria-modal="true" aria-label="Brix and Boulder Pot">
        <button type="button" className="cover-close" onClick={close} aria-label="Close">✕</button>
        <img className="cover-art" src={art.url} alt="Brix cradling his pet Boulder Pot" />
        <p className="cover-caption">BRIX &amp; BOULDER POT</p>
      </div>
    </div>, document.body)}
  </>);
}
