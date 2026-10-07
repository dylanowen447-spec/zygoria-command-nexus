# Use the new Zygoria artwork as the start screen and link preview

## What you'll see
1. **Start screen:** when someone opens zygoria.com, your artwork fills the screen with a **TAP TO START** button. Tapping it fades the artwork out and takes the visitor into the game, right where they would have started anyway: Three Eggs for new visitors, or their saved place. It shows on every visit, and it fits phones and computers without stretching.
2. **Link preview:** when zygoria.com is shared in a message or on social media, this artwork shows as the preview picture.

## What stays the same
All scenes, characters, story progress, sizes and walking stay as they are. The cover is just a layer shown over the game before it begins.

## Note
The link preview only updates after you publish again.

## Technical details
- Upload the image with lovable-assets as `zygoria-key-art.png`, plus a smaller 1200×630 JPG for social sharing.
- New `StartCover` component rendered in `src/routes/index.tsx`, a full-screen fixed overlay with `object-fit: cover`. It sits on a solid background with no backdrop blur, keeping the iOS rule. Styles go in `src/styles.css` using existing tokens.
- In the index route `head()`, add `og:image` and `twitter:image` using the absolute URL `https://zygoria.com/__l5e/assets-v1/<id>/zygoria-share.jpg`, plus `twitter:card` `summary_large_image`.
