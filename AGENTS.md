<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history — force pushing, or rebasing/amending/squashing commits that are already pushed — as it rewrites history on Lovable's side and the user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the Zygoria prototype simulation in the index route's client state; it does not require persistent services or credentials.
- Keep visual roles and HUD styling in the global design tokens and stylesheet so the world interface remains consistent.
- Keep character sprites as inline SVG; route movement is painted per animation frame from client state along named map stops, while CSS loops the limb walk cycle only during that movement, so walking is synced and never a position tween.
- Character route walking and the limb step cycle ignore the reduced-motion preference; walking is the core interaction, so ambient effects are the only motion that gets disabled.
- Oz and Lowkey render from single 6-frame sprite-sheet strips (idle, walk 1-4, thinking) via background-position; Brix also renders from its 6-frame sheet.
- Keep static Sanctuary creatures as decorative image overlays outside the agent simulation so discoveries do not alter movement or task state.
