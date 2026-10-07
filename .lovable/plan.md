# Fix Brix's sideways and walking-away frames

## What's wrong
Brix's walking-forward frames are fine. In his sideways (left and right) and walking-away (up) frames, the right side of his body is cut off in a straight line. Parts of his back, his hair and a fist go missing. The first frame in each of those rows is cropped the worst. That's why he flickers and looks chopped when he walks sideways or away from the screen.

The cause is in how his frames were cut from your sheet. The sideways and back rows were cut as an evenly spaced grid, but on your sheet his poses sit closer together than that grid, so each cut slices through his body.

## Fix (Brix only)
1. Cut every sideways and walking-away frame again from your white sheet. This time each frame is found by where Brix actually is in the picture, not by an evenly spaced grid. Neighbouring poses won't overlap.
2. Line his feet up on the same baseline and keep him centred in every frame, so he doesn't jump between steps.
3. Use the side-facing standing poses for the rows where he looks left or right. The right-facing row currently starts with a back view.
4. Keep the forward-walking row exactly as it is.
5. Change nothing else: same picture size and layout, same size on phone and computer, same spot for his feet, same walking speed. Oz, Lowkey, Moxi and every scene stay untouched.

## Check before reporting back
- Look at the new frames side by side: no body parts cut off and no black patches.
- Watch him walk left, right, up and down in the preview on desktop and phone widths.

## Technical details
- Source: `/mnt/user-uploads/1331C258-3364-4CCB-997B-F8B951B03B3A.png`. For rows 1–3, find frame boundaries from per-row column projection gaps on the non-white mask, then trim and remove the white background with an edge flood fill.
- Pack into the same 1414×1168 atlas (7×4 cells, 202×292 each), with feet bottom-aligned and centred horizontally. Re-upload it as the `brix-directions.png` asset pointer.
- No CSS changes are expected.
