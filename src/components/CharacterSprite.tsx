import ozSheet from "@/assets/oz-walk-v3.webp.asset.json";
import brixSheet from "@/assets/brix-walk-v5.webp.asset.json";
import brixPunch from "@/assets/brix-punch.webp.asset.json";
import lowkeySheet from "@/assets/lowkey-walk-v6.webp.asset.json";
import lowkeyAttack from "@/assets/lowkey-attack.webp.asset.json";
import ozCombat from "@/assets/oz-combat-v2.webp.asset.json";
import brixCombat from "@/assets/brix-combat.webp.asset.json";
import lowkeyCombat from "@/assets/lowkey-combat.webp.asset.json";
import ozFx from "@/assets/oz-fx.webp.asset.json";
import brixFx from "@/assets/brix-fx.webp.asset.json";
import lowkeyFx from "@/assets/lowkey-fx.webp.asset.json";
import moxiSheet from "@/assets/moxi-walk.png.asset.json";

const SHEETS = { Oz: ozSheet.url, Brix: brixSheet.url, Lowkey: lowkeySheet.url, Moxi: moxiSheet.url } as const;

const COMBAT: Partial<Record<string, string>> = { Oz: ozCombat.url, Brix: brixCombat.url, Lowkey: lowkeyCombat.url };

/** Extra poses sheet: 4 cols × 3 rows (hurt, special, extras: victory/talk/sleep/blink). */
const FX: Partial<Record<string, string>> = { Oz: ozFx.url, Brix: brixFx.url, Lowkey: lowkeyFx.url };

type Character = "Oz" | "Brix" | "Lowkey" | "Moxi";

/** Oz, Brix and Lowkey use four-direction sheets; Moxi keeps her three-frame hop. */
export function CharacterSprite({ character }: { character: Character }) {
  return <span className={`sheet-sprite sheet-${character.toLowerCase()}`} aria-hidden="true">
    <span className="sheet-shadow" />
    <span className="sheet-frames" style={{ backgroundImage: `url(${SHEETS[character]})` }} />
    {COMBAT[character] && <span className="sheet-combat" style={{ backgroundImage: `url(${COMBAT[character]})` }} />}
    {FX[character] && <span className="sheet-fx" style={{ backgroundImage: `url(${FX[character]})` }} />}
    {character === "Lowkey" && <span className="sheet-slash" style={{ backgroundImage: `url(${lowkeyAttack.url})` }} />}
    {character === "Brix" && <span className="sheet-punch" style={{ backgroundImage: `url(${brixPunch.url})` }} />}
  </span>;
}
