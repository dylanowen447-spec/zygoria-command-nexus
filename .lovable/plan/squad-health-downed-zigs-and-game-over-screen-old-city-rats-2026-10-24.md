# Squad health, downed Zigs and Game Over screen (Old City rats)

## What you'll get
1. **Health for every Zig** (controlled or not): Brix 5 bites, Lowkey 4, Oz 4. Small pip bars above each Zig plus a crew row in the fight HUD. Replaces the current shared "CREW" bar that never reaches zero.
2. **Better fighting companions**: uncontrolled Zigs pick the nearest rat, attack on cooldown, and step back when on 1 pip. Swarm wave still belongs to Brix (others hold their flanks).
3. **Recovery**: Brix's charged punch kill or clearing a wave restores +1 pip to everyone still standing.
4. **Downed sequence**: at 0 pips a Zig flashes, drops lying down, greys out, says a short line. A standing Zig can walk to him and revive him after 2 seconds beside him (back to 2 pips). If you were controlling him, control moves to a standing Zig.
5. **Death / Game Over**: when all three are down, slow-motion fade to red, then your uploaded **GAME OVER** artwork full-screen with two buttons:
   - **TRY AGAIN** - restarts the current wave with full health.
   - **RETURN TO SANCTUARY** - only shown if the Sanctuary is already unlocked; otherwise it reads **RESTART OLD CITY** (restarts the encounter from the swarm).

Scope: Old City rats first. Long Walk / Shelton can reuse it in a later request.

## Technical details
- Upload artwork via lovable-assets -> `src/assets/game-over.png.asset.json`; new `src/components/GameOverScreen.tsx` (buttons overlaid on the image's own button area, real accessible buttons).
- `src/lib/squad-health.ts`: max HP table, damage/heal/revive helpers, `allDown`; unit test in `src/test/squad-health.test.ts` (5/4/4, revive to 2, all-down detection).
- `rat-ai.ts` `stepRat`: bite damages the specific bitten Zig via callback (already identified in `zig-bitten`); downed Zigs are excluded from rat targets.
- `OldCityRats.tsx`: owns squad HP, exposes it via CombatApi, `retryWave()` resets rats for current wave; emits `onDefeat`.
- `PrologueScene.tsx`: downed pose class, revive proximity check, companion attack loop, control hand-off, renders GameOverScreen.
- `src/styles.css`: pip bars, downed pose, red fade.

Files to edit: rat-ai.ts, OldCityRats.tsx, PrologueScene.tsx, styles.css, plus new squad-health.ts, GameOverScreen.tsx, test, asset pointer.
