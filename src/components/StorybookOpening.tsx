import { useEffect, useState } from "react";
import page from "@/assets/chapter-1-page.webp.asset.json";

/** Page 01 of the storybook: shown before the Three Eggs crater scene, turned by tap, Space or Enter. */
export function StorybookOpening({ onTurn }: { onTurn: () => void }) {
  const [turning, setTurning] = useState(false);
  const [ready, setReady] = useState(false);
  const turn = () => { if (turning) return; setTurning(true); setTimeout(onTurn, 900); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); turn(); } };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  return <div className={`storybook ${turning ? "is-turning" : ""} ${ready ? "is-ready" : ""}`} role="dialog" aria-label="Page one: Three Eggs">
    <div className="storybook-book">
      <div className="storybook-spine" aria-hidden="true"/>
      <div className="storybook-page">
        <img src={page.url} alt="Three strange eggs — yellow, blue and red — rest in the ruins of Old Earth beneath a burning sunset" onLoad={() => setReady(true)} draggable={false}/>
      </div>
    </div>
    <div className="storybook-meta">
      <span className="storybook-rule"/><span>CHAPTER I · PAGE 01 · THREE EGGS</span><span className="storybook-rule"/>
    </div>
    <button type="button" className="storybook-turn" onClick={turn}>Turn the page <em>· the shells crack open</em> ›</button>
  </div>;
}
