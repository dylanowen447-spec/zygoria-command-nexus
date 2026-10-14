<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting published git history — force pushing, or rebasing/amending/squashing commits that are already pushed — as it rewrites history on Lovable's side and the user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep prototype simulation client-side; it requires no persistent services or credentials.
- Keep visual roles and HUD styling in the global design tokens and stylesheet so the world interface remains consistent.
- Keep character sprites as inline SVG; route movement is painted per animation frame from client state along per-character walkable path nodes in artwork-percentage space (a layer locked to the image cover box), so feet land on the same ground at every screen shape, while CSS loops the limb walk cycle only during that movement, so walking is synced and never a position tween.
- Character route walking and the limb step cycle ignore the reduced-motion preference; walking is the core interaction, so ambient effects are the only motion that gets disabled.
- Oz renders from his supplied four-direction sprite atlas, selected by segment heading only while walking; when stationary he faces forward regardless of his last travel direction, while Lowkey and Brix keep their existing 6-frame strips.
- Keep static Sanctuary creatures as decorative image overlays outside the agent simulation so discoveries do not alter movement or task state.
- Crew AI runs as server-only Gateway calls: one routing call, then one call per handoff step that receives all earlier outputs, driven step-by-step by the client — so handoffs are genuine, never simulated.
- Zygoria canon lives in one server-only module injected into every crew AI call; later dated entries override earlier ones — so all agents share one source of truth and never invent lore.
- Live story progress lives in `src/lib/ai/canon-state.server.ts` (stage, canon truth, per-agent knowledge, discoveries, unlocked zones, hidden future canon); the UI reads it only through the safe `getCanonState` server function, never the client bundle — so one edit advances the whole world.
- Keep Codex journal pages in the central server-only story state and expose only visitor-safe records through `getCanonState`, so the journal grows with the story without revealing undiscovered lore.
- Crew group replies are sequential AI calls reacting to previous speakers, never simulated dialogue.
- Keep Sanctuary building emphasis as a transparent artwork-aligned overlay above the original image, so local lighting changes never alter the map geometry or character paths.
- Keep Sanctuary terrain edits localized to the scene artwork and align Lowkey's mountain route nodes to its painted switchback, so other landmarks and paths remain unchanged.
- Scale desktop character artwork around the sprite stage's bottom anchor with a shared world-stage factor, and apply that factor to the carried task icon offsets; this preserves waypoint feet coordinates and untouched mobile proportions.
- Zig task steps end in a role-specific action on a zone world object (src/lib/world-state.ts); object levels and discoveries persist on-device so world changes outlive the task.
- Story chapters live in src/lib/story.ts (client state, localStorage); each zone adds a chapter of conversation-triggered beats that can unlock the next zone — so progression stays modular.
- The crossroads fire pit cookout is a client-only scripted sequence triggered by food/cook words in the Sanctuary, bypassing AI routing — so it always plays reliably.
- The opening prologue (src/lib/prologue.ts + src/components/PrologueScene.tsx) is a sequence of self-contained scenes (landing → Old City → Library) shown instead of the Sanctuary for brand-new visitors only; Zigs explore a walkable node graph independently and the objective spot unlocks only after they've looked around — so the existing Sanctuary systems stay untouched.
- Prologue chat uses a dedicated AI call without the live story state, fed only the scene's starting note plus notes for objectives found so far — so the freshly hatched crew can't know about the Sanctuary or anything they haven't discovered.
- Moxi becomes a full crew agent (CrewAgent = Agent | "Moxi" in src/lib/zones.ts) once the trust beat in src/lib/story.ts completes: she gets her own zone paths, world objects, AI voice and roster entry, and only renders after joining. The prologue and trio-only systems keep the narrower Agent type.
- Keep phone-facing fixed docks on solid backgrounds instead of live backdrop blur, and isolate the map stage's own compositing layer — so iOS Safari momentum scrolling never flashes black.
- The Long Walk ambush (src/components/LongWalkAmbush.tsx) is a self-contained overlay inside PrologueScene that takes Oz's zap first and sizes Shelton/rats from the live Lowkey/Oz sprites — so the scene's exploration and other chapters stay untouched.
- Direct combat (PrologueScene) reads enemies/bounds via CombatApi and damages only through the ambush hitRef; outside fights a double-tapped Zig is player-steered and skipped by exploring — so ambushes own health, damage and story.
- OldCityRats owns wave timing; city-waves defines approaches and counts so Long Walk combat remains independent.
