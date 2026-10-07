# Brix: rebuild his sprite from the new high-quality sheet

## What you gave us
The new landscape sheet (1920×887) is complete and sharp:
- **6 walk frames each** for Down (front), Left, Right, and Up (back)
- A clean **idle standing pose** with both fists visible
- Extra **turn poses** (side/front/back) we can use for standing turns
- Clean white background — no dark edges, no black patches, no cropped frames

## What I'll do (Brix only)
1. **Cut out every frame** from the new sheet. The white background removes cleanly, so there will be no black leftovers between his legs, under his arms, or around his boots.
2. **Rebuild his walking animation with all 6 frames per direction** (he currently uses fewer), so his walk looks smoother and more detailed — closer to Oz's quality.
3. **Use the new idle pose** for when he stands still, and the turn poses for direction changes where they fit.
4. **Keep everything else exactly the same:** his size on phone and computer, the spot his feet stand on, his name tag, his walk speed, and every other character and scene.

## What stays untouched
- Oz, Lowkey, Moxi, the map, the story scenes, and all gameplay.
- His current size (no enlarging — that caused the giant-Brix problem before).

## Technical details
- Source: `/mnt/user-uploads/1331C258-3364-4CCB-997B-F8B951B03B3A.png` (1920×887).
- Cut frames by colour-keying the white background (RGB > 245) with flood fill from the edges, so enclosed gaps are cleaned too.
- Pack a new directional atlas (4 rows × 6 walk frames + idle/turn strip) and upload via lovable-assets, replacing the `brix-directions.png` pointer.
- Update only the `.sheet-brix` rules in `src/styles.css` (frame count, background-size, walk cycle timing for 6 frames). No layout, scale, or path changes.
- Verify in the preview: walk in all four directions plus idle, on desktop and mobile widths, before reporting done.
