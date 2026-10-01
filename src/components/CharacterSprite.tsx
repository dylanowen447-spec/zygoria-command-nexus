import ozSheet from "@/assets/oz-sheet.webp.asset.json";
import brixSheet from "@/assets/brix-sheet.webp.asset.json";
import lowkeySheet from "@/assets/lowkey-sheet.webp.asset.json";

const SHEETS = { Oz: ozSheet.url, Brix: brixSheet.url, Lowkey: lowkeySheet.url } as const;

type Character = "Oz" | "Brix" | "Lowkey";

/** Small, deliberately simplified silhouettes of the supplied First Genesis characters. Oz and Lowkey use their supplied 6-frame sheets. */
export function CharacterSprite({ character }: { character: Character }) {
  if (character) return <span className={`sheet-sprite sheet-${character.toLowerCase()}`} aria-hidden="true">
    <span className="sheet-shadow" />
    <span className="sheet-frames" style={{ backgroundImage: `url(${SHEETS[character]})` }} />
  </span>;
  return <svg className={`character-sprite sprite-${character.toLowerCase()}`} viewBox="0 0 44 70" role="presentation" aria-hidden="true">
    <ellipse className="sprite-shadow" cx="22" cy="66" rx="14" ry="3" />
    <g className="sprite-figure"><g className="sprite-body">
      {character === "Brix" && <>
        <g className="sprite-leg leg-back"><path className="brix-pants sprite-line" d="M13 46 22 47 21 60 16 61 11 58Z"/><path className="sprite-boot sprite-line" d="M12 59 19 59 20 65 8 65Z"/></g>
        <g className="sprite-leg leg-front"><path className="brix-pants sprite-line" d="M22 47 31 46 33 59 28 62 24 60Z"/><path className="sprite-boot sprite-line" d="M26 60 33 59 37 65 25 65Z"/></g>
        <g className="sprite-arm arm-back"><path className="brix-skin sprite-line" d="M13 27 Q7 25 5 30 L2 42 Q3 47 8 47 L12 43 15 34Z"/><path className="brix-glove sprite-line" d="M2 40 Q0 38 1 36 L6 33 11 37 11 43 8 47 3 46Z"/></g>
        <path className="brix-skin sprite-line" d="M12 28 Q15 24 19 26 L25 26 Q30 24 33 28 L34 38 29 46 14 46 10 38Z"/>
        <path className="brix-shoulder sprite-line" d="M13 27 18 29 17 40 12 44 8 35Z M31 27 26 29 27 40 32 44 36 35Z"/>
        <path className="brix-shirt sprite-line" d="M18 29 Q22 32 26 29 L29 43 22 47 15 43Z"/>
        <circle className="brix-record sprite-line" cx="22" cy="38" r="5.5"/><circle className="brix-label" cx="22" cy="38" r="1.7"/>
        <path className="brix-belt sprite-line" d="M12 45 21 48 32 45 37 51 26 49 22 57 18 49 7 51Z"/>
        <path className="brix-buckle sprite-line" d="M20 48 24 48 22 55Z"/>
        <g className="sprite-arm arm-front"><path className="brix-skin sprite-line" d="M31 27 Q37 25 39 30 L42 42 Q41 47 36 47 L32 43 29 34Z"/><path className="brix-glove sprite-line" d="M42 40 Q44 38 43 36 L38 33 33 37 33 43 36 47 41 46Z"/></g>
        <g className="sprite-head">
        <path className="brix-face sprite-line" d="M14 14 Q22 9 30 14 L31 25 27 31 22 32 17 30 13 25Z"/>
        <path className="brix-hair sprite-line" d="M13 19 12 12 16 8 19 10 20 5 24 8 28 6 29 11 33 13 30 19 28 14 17 15Z"/>
        <path className="brix-hair sprite-line" d="M13 18 11 24 14 28 17 29 16 20Z M30 18 33 24 30 29 27 29 28 20Z"/>
        <path className="brix-brow" d="M16 19 20 18 M24 18 28 19"/><circle className="brix-eye" cx="18" cy="21" r="1.2"/><circle className="brix-eye" cx="26" cy="21" r="1.2"/>
        <path className="brix-stubble" d="M20 26 19 28 M24 26 25 28 M22 25 22 27"/>
        </g>
      </>}
    </g></g>
  </svg>;
}