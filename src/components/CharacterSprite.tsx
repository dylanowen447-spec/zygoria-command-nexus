import ozSheet from "@/assets/oz-directions.webp.asset.json";
import brixSheet from "@/assets/brix-sheet.webp.asset.json";
import lowkeySheet from "@/assets/lowkey-sheet.webp.asset.json";

const SHEETS = { Oz: ozSheet.url, Brix: brixSheet.url, Lowkey: lowkeySheet.url } as const;

type Character = "Oz" | "Brix" | "Lowkey";

/** Oz uses his four-direction sheet; the other Zigs keep their original strips. */
export function CharacterSprite({ character }: { character: Character }) {
  return <span className={`sheet-sprite sheet-${character.toLowerCase()}`} aria-hidden="true">
    <span className="sheet-shadow" />
    <span className="sheet-frames" style={{ backgroundImage: `url(${SHEETS[character]})` }} />
  </span>;
}
