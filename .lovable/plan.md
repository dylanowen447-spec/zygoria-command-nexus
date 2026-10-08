# Crew Hunger Meter

A small hunger meter in the top game bar. It slowly drops on the opening journey as a story hint, then becomes a gentle real system in the Sanctuary, where the cookout fills it back up.

## Before the Sanctuary (just for show)
- Starts at 85% on Three Eggs.
- Drops slowly through Old City, The Library and The Long Walk.
- Never drops below 30%. It never blocks talking, walking or moving on. The story always comes first.

## In the Sanctuary (real, but gentle)
- Drops very slowly, about 1% every 90 seconds, so you can explore and chat for a long time.
- Never drops below 10%. At 10% it stops there and the crew make hungry comments. Nobody dies.
- Cooking at the fire restores it based on the fish Oz catches: small +20%, medium +30%, large +40% (up to 100%).
- The cookout itself stays exactly as it is: who cooks, who refuses and the after-meal fish chat.

## Crew comments
- At about 40%: one Zig says "Getting a bit hungry."
- At about 20%: tummy rumbles and food comments.
- Each comment plays once per drop. It only plays when nobody else is talking and no story scene is running, so it never overlaps other speech bubbles.

## Saving
- Hunger is saved on the device with the rest of your progress, so going back to the Sanctuary doesn't reset it.

## Not changing
Story order, the MP3 and Moxi scenes, crew behaviour, sprites, the cookout steps and the layout.

## Technical details
- New `src/lib/hunger.ts`: localStorage key `zygoria-hunger-v1`, clamp helpers, drain rates, fish restore table.
- New `HungerMeter` component: a slim bar styled with existing HUD tokens in `styles.css`, shown in the prologue header and the Sanctuary HUD.
- Prologue: drain on one interval in `PrologueScene.tsx`, floor at 30.
- Sanctuary: drain on one interval in `src/routes/index.tsx`, floor at 10. Threshold lines go through the existing serialized bubble queue. Add the restore amount where the cookout eat step finishes, using the existing `fishSize`.
