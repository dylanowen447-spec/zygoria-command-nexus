# Oz: every ATTACK fires a zap, and it hits enemies in range

## What changes for you
- Every tap of ATTACK (or Space) while Oz is your Zig shoots a visible lightning bolt — never a silent "whiff".
- If a rat or Shelton is within Oz's zap range, the bolt locks onto the nearest one and damages it (same damage as now).
- If no enemy is in range, the bolt crackles out to a random spot a short way in front of Oz, so you still see him zap.
- Hold-and-release heavy zap works the same way, just bigger.

Nothing else changes: Brix's punch, Lowkey, damage numbers, health, dialogue and story all stay as they are.

## Technical details
In `src/components/PrologueScene.tsx`, `strike()`:
- Oz branch when there is no target (line ~200) and when the target is out of reach (line ~203): instead of `atk-whiff`, play Oz's swing, pick a random point within ~60% of `REACH.Oz` in his facing direction, call `boltRef.current(...)`, and run `ambushHit.current` at that point (harmless if empty).
- When an enemy is within `REACH.Oz` of Oz but the cursor/aim lock (10% radius) misses it, prefer that enemy over the empty aim point so taps near enemies connect (fixes mobile, where there is no mouse aim).
- No changes to `ambushHit`, rat/Shelton health, or Brix/Lowkey code paths.
- Verify on a phone-sized screen in Old City: tap ATTACK with Oz far from rats (bolt visible), then near a rat (rat takes damage).
