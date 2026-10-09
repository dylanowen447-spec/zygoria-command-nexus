# Zygoria Nexus — Task roadmap

## Completed
- [x] First Genesis chapters 1–4: canon order (ruins before Sanctuary), Chapter 04 badge, Codex Chronicles comic reader, offline origin memories.
- [x] Role-specific Zig actions that create persistent world changes (objects, Codex discoveries, 7-stage task tracker).
- [x] Make Oz, Brix and Lowkey moderately larger on desktop only, keeping sprite proportions, animation, feet anchors and mobile sizing unchanged.
- [x] Replace the Sanctuary's wooden lookout with Lowkey's natural mountain overlook and winding walkable route, preserving the rest of the world.
- [x] Expand the Field Codex drawer into a seven-section Zygoria Codex with visitor-safe discoveries, partial records and current-zone continuity.
- [x] Oz voice rule (cheeky, action-first, no corporate language)
- [x] Fish-only / fish-love canon
- [x] Zone expansion: Sanctuary + Old Earth ruins, survivor caves, Cronk's swamp, Shelton's camp (art, paths, work nodes, selector, AI zone routing)
- [x] Central canon/story-state system (`src/lib/ai/canon-state.server.ts`): STORY_STAGE, CANON_TRUTH, CURRENTLY_KNOWN per agent, DISCOVERED, UNLOCKED_ZONES, HIDDEN_FUTURE_CANON; injected into every AI call; safe `getCanonState` feed for the UI (stage chip + unlocked zone chips only)
- [x] Crew conversations: group routing, brief in-character replies that react to each other
- [x] End-to-end verification (zone chips, zone switching, group question, zone job)
- [x] New crew obsession canon: the trio are obsessed with what this world is and what they mean to it; they have noticed the world seems to have woken up since they arrived. Reflect in canon notes + story state, keep spoiler-safe.
- [x] Strengthen the two Sanctuary shack silhouettes with subtle rim light and selective color contrast, without changing the painting or map placement.
- [x] Field codex drawer: spoiler-safe discoveries unlocked by zones visited and completed jobs, saved on device
- [x] Distinct, restrained crew humour in dialogue: Oz impulsive, Brix dry, Lowkey deadpan; serious moments remain serious

- [x] Zigs follow through on group plans they propose (lookout, workshop, shack, crossroads), spread out, then return home
- [x] Replace only Oz's character artwork with the supplied new silhouette and directional walking frames; keep the other Zigs and world untouched.

## Opening progression (First Genesis prologue)
- [x] Chapter 01 Egg Landing: hatch, free exploration, skyline discovery, replay chip, skip
- [x] Old City exploration + Library entrance discovery
- [x] Library: each Zig finds and reads their book
- [x] Strict opening order Landing → Old City → Library → Chapter 03 Long Walk → Sanctuary, with chapter labels
- [x] Dylan Owen reader starts at Chapter 1 art and pages through in order
- [x] Long Walk as a full explorable scene: dead → waking land → distant green valley (no buildings), from Chapter 3 art
- [x] Arrival at the Sanctuary hand-off
- [x] Opening is interactive like the Sanctuary: talk to the crew (memory-free, discovery-gated replies) and direct them
- [x] Long Walk: pathing fits new artwork; Zigs walk staggered 2s+ behind each other when moving together

## Deeper chapters + Moxi return loop
- [x] L1 Moxi discovery story in Sanctuary (replaces flash mystery)
- [x] L2 Moxi resident (uses supplied sprite)
- [ ] L3 One small problem per chapter (Old City locked Library door done)
- [ ] L4 Longer Long Walk
- [x] Shelton boss battle: health bars, fight timer, three stages with retreats
- [ ] L5 Sanctuary return events
- [x] Moxi route: keep on open grass, off trees and river

- [ ] Remove river-bank trees between Oz's shack and Moxi's evergreen in the Sanctuary artwork (user-marked area; no characters baked in)
- [x] Chapter 1 wake-up: amnesia + star lines, then explore (voice event kept)
- [x] Moxi resting spot on marked grass + route along drawn trails
- [x] Restore Zigs' autonomous wandering after click-to-move
- [x] Visiting Zigs stand beside each other, not on top

- [x] Moxi discovery easier: broader word matches + crew hints toward each next step
- [x] Cookout: fire not starting / no speech bubble (phone)

## Moxi as a crew agent
- [x] Moxi joins the crew roster after the trust beat: zone paths, work spots, world objects, task routing, AI voice, crew panel, cookout seat, idle visits
- [x] Moxi agent memory canon note (2026-10-07): child memories only, fragments not lore dumps, parents' fate never established
- [ ] User to test: give Moxi a job ("Moxi, fetch a fish") after she joins
- [x] Water tank at the workshop yard: Brix carries it to the river to fill on arrival and whenever it runs low; tank level meter
- Hide on-screen path lines (keep routes) — done
- Brix walks only on trails, never over the salvage yard — done
- [x] Food fills to 100% on eating; 9-minute Sanctuary day/night cycle
- [x] Moon glow softened at peak night; night sky wash must never fully cover the back mountain or buildings
- [x] Lowkey must render behind the fire pit (depth layering), never in front of the flames

## Sanctuary sleep mechanic (uploaded brief 2026-10-08)
- [ ] Oz: clickable riverside shack with "Go to Sleep" -> walks existing paths, enters door, sprite hidden, Zzz from roof
- [ ] Brix: finishes activity, walks to workshop, enters, Zzz above workshop, rare line "Finally. Some peace and quiet."
- [ ] Lowkey: new handmade rock hatch under his lookout (overlay art, artwork preserved), opens, climbs in, closes, Zzz from rock
- [ ] Moxi: curls up beside the campfire, eyes closed, occasional Zzz
- [ ] Night routine: sprites vanish only at entrances, Zzz at all three spots, fire fades to embers, hunger + thirst drain paused
- [ ] Morning: short skippable sequence, sunrise, Zzz gone, Oz/Brix/Lowkey emerge, Moxi stretches and stands, routines resume
- [ ] Rest restored by sleep; food and water NOT auto-refilled. No duplicate agents, no stuck/invisible agents after waking.

## Shelton boss fight tuning
- [x] Rat bites cost 3% crew health (Old City + Long Walk); crew HP bar in Old City
- [x] Shelton's hits on the crew cost 5%
- [x] Each Oz zap on Shelton takes 10% off his health (10 hits total)
- [ ] Crew loses health more slowly; smaller crew bar that doesn't cover the scene
