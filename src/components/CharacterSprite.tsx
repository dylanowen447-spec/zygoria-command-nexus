type Character = "Oz" | "Brix" | "Lowkey";

/** Small, deliberately simplified silhouettes of the supplied First Genesis characters. */
export function CharacterSprite({ character }: { character: Character }) {
  return <svg className={`character-sprite sprite-${character.toLowerCase()}`} viewBox="0 0 44 70" role="presentation" aria-hidden="true">
    <ellipse className="sprite-shadow" cx="22" cy="66" rx="14" ry="3" />
    <g className="sprite-body">
      {character === "Oz" && <>
        <g className="sprite-leg leg-back"><path className="oz-fur sprite-line" d="M15 47 21 48 20 60 16 62 12 58Z"/><path className="sprite-boot sprite-line" d="M12 58 18 60 19 64 9 64Z"/></g>
        <g className="sprite-leg leg-front"><path className="oz-fur sprite-line" d="M23 48 29 47 32 59 27 62 23 59Z"/><path className="sprite-boot sprite-line" d="M26 60 32 58 36 64 25 64Z"/></g>
        <g className="sprite-arm arm-back"><path className="oz-fur sprite-line" d="M15 31 11 29 7 34 3 38 7 43 11 40 15 40Z"/><path className="oz-fur" d="M6 36 2 35 4 39 1 41 8 42Z"/></g>
        <path className="oz-suit sprite-line" d="M15 29 29 29 34 45 28 50 16 50 10 44Z"/>
        <path className="oz-chest sprite-line" d="M19 30 25 30 28 44 22 48 16 44Z"/>
        <path className="oz-collar sprite-line" d="M14 28 7 32 15 37 19 32 22 31 25 32 29 37 37 32 30 28 27 26Z"/>
        <path className="oz-belt sprite-line" d="M11 45 21 48 33 45 36 49 25 52 22 58 19 52 8 49Z"/>
        <path className="oz-buckle sprite-line" d="M19 47 25 47 22 55Z"/>
        <g className="sprite-arm arm-front"><path className="oz-fur sprite-line" d="M30 31 35 29 39 35 42 39 38 43 34 40 29 41Z"/><path className="oz-fur" d="M39 36 43 35 41 39 44 41 37 42Z"/></g>
        <path className="oz-face sprite-line" d="M14 16 Q22 10 31 16 L32 24 Q30 32 22 33 Q14 31 12 24Z"/>
        <path className="oz-hair sprite-line" d="M11 21 5 17 12 16 6 11 15 13 12 6 19 10 22 2 25 10 33 5 30 13 38 12 33 17 39 20 31 19 28 13 23 17 18 12Z"/>
        <path className="oz-headband" d="M11 20 Q10 12 16 10 M28 10 Q35 12 34 20"/>
        <circle className="oz-ear sprite-line" cx="11" cy="22" r="3"/><circle className="oz-ear sprite-line" cx="34" cy="22" r="3"/>
        <path className="oz-mic" d="M35 23 Q36 29 29 29"/><circle className="oz-mic-tip" cx="29" cy="29" r="1.5"/>
        <ellipse className="oz-eye" cx="18" cy="22" rx="2.3" ry="3"/><ellipse className="oz-eye" cx="27" cy="22" rx="2.3" ry="3"/>
        <path className="oz-smile sprite-line" d="M16 26 Q22 33 29 26 Q23 28 16 26Z"/>
      </>}
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
        <path className="brix-face sprite-line" d="M14 14 Q22 9 30 14 L31 25 27 31 22 32 17 30 13 25Z"/>
        <path className="brix-hair sprite-line" d="M13 19 12 12 16 8 19 10 20 5 24 8 28 6 29 11 33 13 30 19 28 14 17 15Z"/>
        <path className="brix-hair sprite-line" d="M13 18 11 24 14 28 17 29 16 20Z M30 18 33 24 30 29 27 29 28 20Z"/>
        <path className="brix-brow" d="M16 19 20 18 M24 18 28 19"/><circle className="brix-eye" cx="18" cy="21" r="1.2"/><circle className="brix-eye" cx="26" cy="21" r="1.2"/>
        <path className="brix-stubble" d="M20 26 19 28 M24 26 25 28 M22 25 22 27"/>
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
        <path className="lowkey-hood sprite-line" d="M12 30 8 21 12 12 19 6 22 2 26 8 32 9 37 20 32 30 28 27 29 18 22 13 15 19 16 27Z"/>
        <path className="lowkey-hood-highlight" d="M10 21 19 8 22 5 24 11 33 15 M31 24 35 20"/>
        <path className="lowkey-mask sprite-line" d="M15 21 22 16 29 21 31 26 25 31 19 31 13 26Z"/>
        <path className="lowkey-face" d="M18 26 Q22 28 26 26 L24 29 20 29Z"/>
        <path className="lowkey-eyes" d="M16 23 20 24 M28 23 24 24"/>
      </>}
    </g>
  </svg>;
}