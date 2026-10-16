import ozSheet from "@/assets/oz-directions.webp.asset.json";
import brixSheet from "@/assets/brix-directions.png.asset.json";
import brixPunch from "@/assets/brix-punch.webp.asset.json";
import lowkeySheet from "@/assets/lowkey-directions.webp.asset.json";
import moxiSheet from "@/assets/moxi-walk.png.asset.json";

const SHEETS = { Oz: ozSheet.url, Brix: brixSheet.url, Lowkey: lowkeySheet.url, Moxi: moxiSheet.url } as const;

type Character = "Oz" | "Brix" | "Lowkey" | "Moxi";

/** Oz, Brix and Lowkey use four-direction sheets; Moxi keeps her three-frame hop. Brix also carries his four-direction punch sheet, shown only while punching. */
export function CharacterSprite({ character }: { character: Character }) {
  return <span className={`sheet-sprite sheet-${character.toLowerCase()}`} aria-hidden="true">
    <span className="sheet-shadow" />
    <span className="sheet-frames" style={{ backgroundImage: `url(${SHEETS[character]})` }} />
    {character === "Brix" && <span className="sheet-punch" style={{ backgroundImage: `url(${brixPunch.url})` }} />}
  </span>;
}
