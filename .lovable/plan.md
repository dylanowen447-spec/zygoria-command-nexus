# Sanctuary water: refill bottles at the river

Mirrors the existing FOOD meter so it feels familiar, and stays small and separate.

## What you'll see
- A WATER bar next to FOOD in the top strip, with a percentage. Turns red when low.
- Water only drains in the Sanctuary: 1% every 30 seconds, never below 10%. During the opening scenes it stays full.
- Ask for water ("get water", "fill the bottles", "thirsty", "drink"): Oz walks to the riverbank by the pier, kneels, a little splash plays, and he walks back. Water goes back to 100% and a quick line plays, e.g. Oz: "Bottles full. River tastes like pennies." / Brix: "Cheers, mate."
- At 40%, 20% and 10% a crew member mentions being thirsty (only when nobody is talking), same as hunger.
- Water level saves on the device like food.

## What stays the same
Map, paths, characters, cookout, MP3 and Moxi scenes, food meter and everything else.

## Technical details
- New `src/lib/water.ts` (key, floor 10, drain 30s, load/save, threshold lines) modeled on `hunger.ts`.
- `src/routes/index.tsx`: water state + drain effect + threshold comments; a client-scripted refill sequence triggered by water words in the Sanctuary (checked before AI routing, like the cookout), routing Oz to the existing pier/riverbank node; skipped if a story scene or cookout is running.
- `src/styles.css`: reuse hunger meter styles with a blue fill token.
