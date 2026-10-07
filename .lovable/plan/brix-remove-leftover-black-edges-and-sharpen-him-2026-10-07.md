# Brix: remove leftover black edges and sharpen him

## What's wrong
- **Black edges:** Dark leftovers from the old background are still stuck around his outline: under his arms, beside his fists and boots, and in thin stray lines at the edges of some frames.
- **Blurry:** Oz's picture sheet is much more detailed than Brix's. Each Brix frame is only about 130 pixels wide, so he gets stretched and looks soft, especially on a computer screen.

## What I'll do (Brix's picture only)
1. Cut him out again from your original Brix sheet with a cleaner method. This removes the dark checker background properly and removes the dark rim around his outline. His own black gloves, boots and outlines stay.
2. Make his frames 3 times sharper with a pixel-art enlarger, so they're about as detailed as Oz's. Then tell the game to show the larger picture at his current size.
3. Clean every frame: standing, walking towards you, walking left, walking right and walking away. I'll remove the stray lines and the dark blobs near his feet.
4. Check him over the game background on a phone and a computer in every direction before I tell you it's done.

## What stays the same
- His size, the spot where his feet stand, his walking and the way he turns.
- His restored hand.
- Oz, Lowkey, Moxi, the map and the scenes.

## Honest limit
Your original Brix sheet is small, so enlarging it can only add so much real detail. If you have a bigger version of the Brix sheet, send it and he'll come out as sharp as Oz.

## Technical details
- Build a new 3x sheet (2730x1800) from `/tmp/brix-atlas.png` using the same frame grid as the current sheet. Remove the background by colour-keying the two checker tones and flood-filling from transparent space. Shrink the edge by 1px to remove the dark rim. Keep the hand fix in the standing frame.
- Enlarge with a pixel-art-safe upscaler (xBR/Real-ESRGAN anime model via nix), then apply light sharpening.
- Upload it with lovable-assets in place of the `brix-directions.png` pointer. Change only the `.sheet-brix` background-size in `src/styles.css` so the frame positions still line up. Nothing else changes.
