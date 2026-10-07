import ozSheet from "@/assets/oz-directions.webp.asset.json";
import brixSheet from "@/assets/brix-sheet.webp.asset.json";
import lowkeySheet from "@/assets/lowkey-sheet.webp.asset.json";
import moxiSheet from "@/assets/moxi-walk.png.asset.json";

const SHEETS = { Oz: ozSheet.url, Brix: brixSheet.url, Lowkey: lowkeySheet.url, Moxi: moxiSheet.url } as const;

type Character = "Oz" | "Brix" | "Lowkey" | "Moxi";

/** Oz uses his four-direction sheet; the other Zigs keep their original strips; Moxi keeps her three-frame hop. */
export function CharacterSprite({ character }: { character: Character }) {
  return <span className={`sheet-sprite sheet-${character.toLowerCase()}`} aria-hidden="true">
    <span className="sheet-shadow" />
    <span className="sheet-frames" style={{ backgroundImage: `url(${SHEETS[character]})` }} />
  </span>;
}
