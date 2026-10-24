import gameOver from "@/assets/game-over.png.asset.json";

/** Full-screen defeat artwork; buttons sit over the artwork's own button area. */
export function GameOverScreen({ onRetry, onRestart, onSanctuary }: { onRetry: () => void; onRestart: () => void; onSanctuary?: () => void }) {
  return <div className="game-over" role="dialog" aria-modal="true" aria-label="Game over">
    <img className="game-over-art" src={gameOver.url} alt="Zygoria Game Over — Oz, Brix and Lowkey down in the ruins" />
    <div className="game-over-actions">
      <button type="button" className="game-over-btn is-primary" onClick={onRetry} autoFocus>TRY AGAIN</button>
      {onSanctuary
        ? <button type="button" className="game-over-btn" onClick={onSanctuary}>RETURN TO SANCTUARY</button>
        : <button type="button" className="game-over-btn" onClick={onRestart}>RESTART OLD CITY</button>}
    </div>
  </div>;
}
