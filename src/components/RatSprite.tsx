import ratSheet from "@/assets/mutant-rat-clean.png.asset.json";
import { RAT_HP, ratFrame, type Rat } from "@/lib/rat-ai";

const FRAMES = 13;

export function RatSprite({ r, w, h, now }: { r: Rat; w: number; h: number; now: number }) {
  const f = ratFrame(r, now), hurt = now - r.hurt < (r.hitBy === "Oz" ? 500 : 350), kind = r.hitBy === "Brix" ? "is-punched" : r.hitBy === "Oz" ? "is-zapped" : r.hitBy === "Lowkey" ? "is-slashed" : "";
  return <span className={`ambush-rat-wrap ${r.launch ? "is-launched" : ""}`} style={{ ["--launch" as string]: r.launch ?? 1,  ["--depth" as string]: (0.72 + Math.min(Math.max((r.y - 40) / 55, 0), 1) * 0.4).toFixed(3), left: `${r.x}%`, top: `${r.y}%`, zIndex: 10 + Math.round(r.y * 10) }} aria-hidden="true">
    {!r.dead && <span className="rat-hp"><span style={{ width: `${(r.hp / RAT_HP) * 100}%` }}/></span>}
    <span className={`ambush-rat ${r.dead ? "is-dead" : ""} ${hurt ? `is-hurt ${kind}` : ""} ${r.mode === "windup" && !r.dead ? "is-windup" : ""} ${r.mode === "bite" && !r.dead ? "is-biting" : ""}`}
      style={{ width: w, height: h, transform: `scaleX(${r.flip ? -1 : 1})`, backgroundImage: `url(${ratSheet.url})`, backgroundSize: `${FRAMES * 100}% 100%`, backgroundPosition: `${(f / (FRAMES - 1)) * 100}% 0` }}/>
    {hurt && (r.hitBy === "Brix" ? <span className="rat-punch-burst"/> : r.hitBy === "Oz" ? <span className="rat-zap-arcs"/> : r.hitBy === "Lowkey" ? <span className="rat-slash-burst"/> : <span className="ambush-impact rat-impact"/>)}
    {!!r.dead && now - r.dead < 400 && r.hitBy === "Oz" && <span className="rat-zap-arcs"/>}
  </span>;
}
