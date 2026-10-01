import ozSheet from "@/assets/oz-sheet.webp.asset.json";

type Character = "Oz" | "Brix" | "Lowkey";

/** Small, deliberately simplified silhouettes of the supplied First Genesis characters. Oz uses his supplied 6-frame sheet. */
export function CharacterSprite({ character }: { character: Character }) {
  if (character === "Oz") return <span className="oz-sprite" aria-hidden="true">
    <span className="oz-shadow" />
    <span className="oz-frames" style={{ backgroundImage: `url(${ozSheet.url})` }} />
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
      {character === "Lowkey" && <>
        <g className="sprite-leg leg-back"><path className="lowkey-suit sprite-line" d="M15 46 22 46 20 59 15 63 12 58Z"/><path className="sprite-boot sprite-line" d="M12 58 18 60 20 64 9 64Z"/></g>
        <g className="sprite-leg leg-front"><path className="lowkey-suit sprite-line" d="M22 46 29 46 32 58 29 63 24 59Z"/><path className="sprite-boot sprite-line" d="M26 60 32 58 36 64 25 64Z"/></g>
        <path className="lowkey-cape sprite-line" d="M15 23 8 31 4 51 12 45 13 57 22 49 31 57 32 45 40 51 36 31 29 23Z"/>
        <g className="sprite-arm arm-back"><path className="lowkey-suit sprite-line" d="M13 30 7 34 9 45 15 45 18 35Z"/></g>
        <path className="lowkey-suit sprite-line" d="M15 28 29 28 34 46 22 50 10 46Z"/>
        <path className="lowkey-lapel sprite-line" d="M13 28 8 33 18 38 22 32 26 38 36 33 31 28 27 26Z"/>
        <path className="lowkey-chest sprite-line" d="M18 34 26 34 28 42 22 46 16 42Z"/><circle className="lowkey-record sprite-line" cx="22" cy="39" r="3.6"/><circle className="lowkey-label" cx="22" cy="39" r="1.2"/>
        <path className="lowkey-belt sprite-line" d="M10 45 21 47 34 45 38 49 25 49 22 54 19 49 6 49Z"/>
        <g className="sprite-arm arm-front"><path className="lowkey-suit sprite-line" d="M31 30 37 34 35 45 29 45 26 35Z"/></g>
        <g className="sprite-head">
        <path className="lowkey-hood sprite-line" d="M12 30 8 21 12 12 19 6 22 2 26 8 32 9 37 20 32 30 28 27 29 18 22 13 15 19 16 27Z"/>
        <path className="lowkey-hood-highlight" d="M10 21 19 8 22 5 24 11 33 15 M31 24 35 20"/>
        <path className="lowkey-mask sprite-line" d="M15 21 22 16 29 21 31 26 25 31 19 31 13 26Z"/>
        <path className="lowkey-face" d="M18 26 Q22 28 26 26 L24 29 20 29Z"/>
        <path className="lowkey-eyes" d="M16 23 20 24 M28 23 24 24"/>
        </g>
      </>}
    </g></g>
  </svg>;
}