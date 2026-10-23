import ozSheet from "@/assets/oz-directions.webp.asset.json";
import brixSheet from "@/assets/brix-directions.png.asset.json";
import brixPunch from "@/assets/brix-punch.webp.asset.json";
import lowkeySheet from "@/assets/lowkey-directions-v2.webp.asset.json";
import lowkeyAttack from "@/assets/lowkey-attack.webp.asset.json";
import ozCombat from "@/assets/oz-combat.webp.asset.json";
import brixCombat from "@/assets/brix-combat.webp.asset.json";
import lowkeyCombat from "@/assets/lowkey-combat.webp.asset.json";
import moxiSheet from "@/assets/moxi-walk.png.asset.json";

const SHEETS = { Oz: ozSheet.url, Brix: brixSheet.url, Lowkey: lowkeySheet.url, Moxi: moxiSheet.url } as const;

const COMBAT: Partial<Record<string, string>> = { Oz: ozCombat.url, Brix: brixCombat.url, Lowkey: lowkeyCombat.url };

type Character = "Oz" | "Brix" | "Lowkey" | "Moxi";

/** Oz, Brix and Lowkey use four-direction sheets; Moxi keeps her three-frame hop. Brix also carries his four-direction punch sheet, shown only while punching. */
export function CharacterSprite({ character }: { character: Character }) {
  return <span className={`sheet-sprite sheet-${character.toLowerCase()}`} aria-hidden="true">
    <span className="sheet-shadow" />
    <span className="sheet-frames" style={{ backgroundImage: `url(${SHEETS[character]})` }} />
    {COMBAT[character] && <span className="sheet-combat" style={{ backgroundImage: `url(${COMBAT[character]})` }} />}
    {character === "Lowkey" && <span className="sheet-slash" style={{ backgroundImage: `url(${lowkeyAttack.url})` }} />}
    {character === "Brix" && <span className="sheet-punch" style={{ backgroundImage: `url(${brixPunch.url})` }} />}
  </span>;
}
