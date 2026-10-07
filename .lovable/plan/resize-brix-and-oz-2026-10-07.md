# Resize Brix and Oz

## What you asked
- Brix 35% bigger on desktop
- Brix 60% bigger on mobile
- Oz 20% smaller on desktop

## What I'll change
Only two lines in the stylesheet (`src/styles.css`):

1. **Brix desktop:** scale `.83` → `1.12` (35% bigger). His box stays 51×73, feet stay anchored at the bottom center, so he grows upward from the spot he stands on.
2. **Brix mobile:** box 38×55 → 61×88 (60% bigger), same bottom anchor.
3. **Oz desktop:** scale `.93` → `.74` (20% smaller). Oz's mobile size is unchanged (you only asked for desktop).

## What stays the same
- Walking, facing, animation speed, feet positions, name tags, paths.
- Lowkey and Moxi untouched.
- Oz's mobile size untouched.

## Check
After the change I'll photograph the Sanctuary on desktop and mobile widths so you can see Brix and Oz side by side before you test.
