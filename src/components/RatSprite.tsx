import ratSheet from "@/assets/mutant-rat.png.asset.json";
import { RAT_HP, ratFrame, type Rat } from "@/lib/rat-ai";

const FRAMES = 13;

export function RatSprite({ r, w, h, now }: { r: Rat; w: number; h: number; now: number }) {
  const f = ratFrame(r, now), hurt = now - r.hurt < 300;
  return <span className="ambush-rat-wrap" style={{ left: `${r.x}%`, top: `${r.y}%`, zIndex: 10 + Math.round(r.y * 10) }} aria-hidden="true">
    {!r.dead && <span className="rat-hp"><span style={{ width: `${(r.hp / RAT_HP) * 100}%` }}/></span>}
    <span className={`ambush-rat ${r.dead ? "is-dead" : ""} ${hurt ? "is-hurt" : ""} ${r.mode === "windup" && !r.dead ? "is-windup" : ""}`}
      style={{ width: w, height: h, transform: `scaleX(${r.flip ? -1 : 1})`, backgroundImage: `url(${ratSheet.url})`, backgroundSize: `${FRAMES * 100}% 100%`, backgroundPosition: `${(f / (FRAMES - 1)) * 100}% 0` }}/>
    {hurt && <span className="ambush-impact rat-impact"/>}
  </span>;
}
