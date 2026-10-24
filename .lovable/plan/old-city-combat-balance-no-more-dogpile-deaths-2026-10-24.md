# Old City combat balance: no more dogpile deaths

## What changes
1. **Max 2 rats biting at once**: only two rats can attack at a time. The others circle nearby and wait their turn.
2. **Safe moment after a bite**: after a bite, that Zig can't be bitten again for 1.2 seconds, so you have time to punch back.
3. **Fighting back heals you**: every 2 rats you knock out gives everyone still standing +1 health pip (on top of the existing heal for a charged-punch kill and for clearing a wave).
4. **Quick knee drop, no lying flat**: at 0 pips a Zig drops to one knee, stays upright and dims for 1.2 seconds. A shove knocks nearby rats back, then he gets up with 2 pips. You only lose if all three are on their knees at the same moment.
5. **Smaller Game Over buttons, especially on phone**: TRY AGAIN and RESTART/RETURN become small side-by-side buttons near the bottom edge. On phones they get extra-small text and padding, so the death screen art stays clearly visible.

## Technical details
- `rat-ai.ts`: an attack-token check is added before a rat starts its wind-up. A rat without a token holds a ring around its target.
- `OldCityRats.tsx`: per-Zig i-frame timestamps in `hurt()`, a kill counter for healing, a 1.2s knee timer with radial knockback and auto-revive to 2, and the all-down check while anyone is on their knees.
- `styles.css`: `.is-downed` becomes a kneel (scaleY/translate, no rotate), plus compact `.game-over-actions`/`.game-over-btn`.
- `squad-health.ts` and its test: `KNEEL_MS = 1200` and `IFRAME_MS = 1200`, with tests for these values.
- Remove the old 2-second revive-by-standing-near since the knee drop now replaces it.

Files: rat-ai.ts, OldCityRats.tsx, squad-health.ts, squad-health.test.ts, styles.css.
