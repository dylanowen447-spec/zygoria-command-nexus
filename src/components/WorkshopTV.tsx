import { useEffect, useRef, useState } from "react";
import tvNormal from "@/assets/tv-normal.png.asset.json";
import tvWalk from "@/assets/tv-walk.png.asset.json";
import { playSfx } from "@/lib/atmosphere";
import { TV_DORMANT, TV_WAKE_INSIDE, type TvLine } from "@/lib/tv-mission";

const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

/** The dormant TV inside Brix's workshop; at night it wakes in front of the player and bolts out the door. */
export function WorkshopTV({ wake, editor, exitX, onEscape }: { wake: boolean; editor: boolean; exitX: number; onEscape: () => void }) {
  const [stage, setStage] = useState<"still" | "waking" | "alive" | "run">("still");
  const [x, setX] = useState(52);
  const [line, setLine] = useState<TvLine | null>(null);
  const alive = useRef(true), started = useRef(false), idle = useRef(0);
  useEffect(() => () => { alive.current = false; }, []);
  useEffect(() => { if (!wake) return; const t = setTimeout(() => void run(), 1800); return () => clearTimeout(t); }, [wake]);

  async function run() {
    if (started.current) return; started.current = true;
    setStage("waking");
    for (const l of TV_WAKE_INSIDE) {
      if (!alive.current) return;
      setLine(l);
      if (l[1].startsWith("BZZ")) { playSfx("zap"); setTimeout(() => playSfx("zap-heavy"), 500); }
      else if (l[1].includes("eyes")) playSfx("zap-hit");
      else if (l[1].startsWith("CLANK")) { setStage("alive"); playSfx("punch-heavy"); setTimeout(() => playSfx("punch"), 300); }
      await wait(Math.max(2200, 1200 + l[1].length * 40));
    }
    if (!alive.current) return;
    setLine(null); setStage("run"); setX(exitX); playSfx("swing");
    await wait(1600);
    if (alive.current) onEscape();
  }

  function tap() {
    if (stage !== "still") return;
    if (editor) { void run(); return; }
    const l = TV_DORMANT[idle.current++ % TV_DORMANT.length]!; setLine(l);
    setTimeout(() => alive.current && setLine(l2 => l2 === l ? null : l2), 3200);
  }

  return <>
    <button type="button" className={`workshop-tv ${stage !== "still" ? `is-${stage}` : ""}`} style={{ left: `${x}%` }} aria-label="Old TV"
      onPointerDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); tap(); }}>
      {stage === "still" || stage === "waking" ? <img className="tv-still" src={tvNormal.url} alt=""/> : <span className={`tv-walk ${stage === "run" ? "is-walking" : ""}`} style={{ backgroundImage: `url(${tvWalk.url})` }}/>}
      {stage === "waking" && <span className="tv-eyes"/>}
    </button>
    {line && <div className={`tv-caption ${line[0] ? `is-${line[0].toLowerCase()}` : "is-narration"}`} role="status">{line[0] && <b>{line[0] === "TV" ? "TV" : line[0].toUpperCase()}</b>}<span>{line[1]}</span></div>}
  </>;
}
