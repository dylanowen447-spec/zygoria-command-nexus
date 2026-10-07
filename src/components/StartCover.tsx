import { useState } from "react";
import keyArt from "@/assets/zygoria-key-art.jpg.asset.json";

/** Full-screen key art shown on every visit until the visitor taps to start. */
export function StartCover() {
  const [state, setState] = useState<"open" | "leaving" | "gone">("open");
  if (state === "gone") return null;
  return (
    <div className={`start-cover ${state === "leaving" ? "is-leaving" : ""}`} onTransitionEnd={() => state === "leaving" && setState("gone")}>
      <img src={keyArt.url} alt="Zygoria — Oz, Brix, Lowkey and Moxi around the fire" className="start-cover-art" />
      <button type="button" className="start-cover-button" onClick={() => setState("leaving")}>TAP TO START</button>
    </div>
  );
}
