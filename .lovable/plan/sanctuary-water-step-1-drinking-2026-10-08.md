# Sanctuary water — step 1: drinking

Drinking comes first. Refilling bottles at the river is a separate step later, once this works.

## What you'll see
- A WATER bar next to FOOD in the top strip, with a percentage. Turns red when low.
- Water only drops in the Sanctuary: 1% every 30 seconds, never below 10%. During the opening scenes it stays full.
- Each Zig carries a water bottle. Ask them to drink ("drink", "have some water", "thirsty"): the crew stop, take a swig with a small bottle icon over their heads, and say a quick line, e.g. Oz: "Ahh. Better." / Brix: "Needed that." Water goes up 30%.
- At 40%, 20% and 10% a Zig mentions being thirsty (only when nobody is talking), like hunger does.
- Bottles hold 3 drinks for now. When they're empty the crew say so ("Bottles are dry, lads.") — that's where the river refill fits in next step.
- Water level and bottle count save on the device like food.

## What stays the same
Map, paths, characters, cookout, MP3 and Moxi scenes, food meter and everything else.

## Later (not in this step)
- Walk to the river by the pier to refill the bottles.

## Technical details
- New `src/lib/water.ts` (key, floor 10, drain 30s, drink amount, bottle charges, load/save, threshold lines) modeled on `hunger.ts`.
- `src/routes/index.tsx`: water state, drain effect, threshold comments, and a short client-scripted drink sequence triggered by drink words in the Sanctuary before AI routing (like the cookout); skipped during story scenes or the cookout.
- `src/styles.css`: reuse hunger meter styles with a blue fill token; small bottle icon.
