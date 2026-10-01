type Character = "Oz" | "Brix" | "Lowkey";

export function CharacterSprite({ character }: { character: Character }) {
  return <svg className={`character-sprite sprite-${character.toLowerCase()}`} viewBox="0 0 44 70" role="presentation" aria-hidden="true">
    <ellipse className="sprite-shadow" cx="22" cy="66" rx="14" ry="3" />
    <g className="sprite-body">
      <g className="sprite-leg leg-back"><path className="sprite-outline sprite-trousers" d="M17 45 L21 46 L20 60 L17 63 L13 62 L15 53 Z"/><path className="sprite-boot" d="M13 60 L19 61 L20 65 L11 65 Z"/></g>
      <g className="sprite-leg leg-front"><path className="sprite-outline sprite-trousers" d="M23 45 L28 45 L29 61 L26 63 L22 61 L22 54 Z"/><path className="sprite-boot" d="M23 60 L29 60 L32 65 L23 65 Z"/></g>
      <g className="sprite-arm arm-back"><path className="sprite-outline sprite-sleeve" d="M15 29 Q11 30 10 35 L9 47 L13 49 L17 38 Z"/><circle className="sprite-hand" cx="11" cy="49" r="3"/></g>
      {character === "Brix" && <><path className="sprite-shoulder" d="M15 28 Q8 25 5 34 L10 39 L17 36 Z"/><path className="sprite-shoulder shoulder-right" d="M29 28 Q36 25 39 34 L34 39 L27 36 Z"/></>}
      <path className="sprite-outline sprite-torso" d="M16 27 Q22 24 29 28 L32 43 Q27 48 15 45 L13 37 Z"/>
      {character === "Brix" && <><path className="sprite-detail" d="M18 32 L27 32 L29 39 L18 39 Z"/><circle className="sprite-record" cx="23" cy="36" r="3.2"/><circle className="sprite-record-centre" cx="23" cy="36" r="1"/></>}
      {character === "Oz" && <><path className="sprite-detail" d="M19 30 L24 37 L28 30 M18 41 L27 41"/><path className="sprite-jacket" d="M14 32 L18 28 L18 44 L15 45 Z M28 28 L32 33 L30 44 L27 45 Z"/></>}
      {character === "Lowkey" && <path className="sprite-detail" d="M17 32 L26 42 M27 31 L18 43"/>}
      {character === "Lowkey" && <path className="sprite-cape" d="M16 26 Q11 32 8 51 L15 48 L19 31 Z M29 26 Q36 32 38 51 L31 48 L25 31 Z"/>}
      <g className="sprite-arm arm-front"><path className="sprite-outline sprite-sleeve" d="M29 29 Q33 29 34 35 L35 47 L31 49 L27 37 Z"/><circle className="sprite-hand" cx="33" cy="49" r="3"/></g>
      <path className="sprite-outline sprite-head" d="M16 13 Q21 8 28 13 L30 22 Q29 28 22 29 Q15 27 14 21 Z"/>
      {character === "Oz" && <><path className="sprite-hair" d="M14 17 L8 15 L15 11 L13 6 L20 9 L23 3 L26 9 L33 6 L30 14 L33 18 L28 16 L25 12 L20 15 Z"/><path className="sprite-headset" d="M13 17 Q11 9 21 8 Q32 8 32 18 M13 17 L13 23 M32 17 L32 23 M32 23 Q31 28 26 27"/><circle className="sprite-mic" cx="26" cy="27" r="1.5"/></>}
      {character === "Brix" && <><path className="sprite-hair" d="M13 19 L15 11 Q22 5 29 10 L31 17 L27 16 L25 12 L20 15 L16 14 Z"/><path className="sprite-hair" d="M28 11 Q35 12 33 24 L30 27 L29 18 Z"/><path className="sprite-brow" d="M17 18 L21 17 M24 17 L28 18"/></>}
      {character === "Lowkey" && <><path className="sprite-hood" d="M11 25 Q9 15 14 8 Q22 2 30 9 Q35 16 33 26 L29 24 L28 15 Q22 11 16 16 L16 25 Z"/><path className="sprite-mask" d="M15 20 Q22 24 29 20 L28 27 Q22 31 17 27 Z"/><path className="sprite-hood-edge" d="M12 24 L16 27 M32 24 L28 27"/></>}
      <path className="sprite-eyes" d="M18 20 L20 20 M25 20 L27 20"/>
    </g>
  </svg>;
}