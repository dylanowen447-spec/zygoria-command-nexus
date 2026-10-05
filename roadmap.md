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
- [ ] L1 Moxi discovery story in Sanctuary (replaces flash mystery)
- [ ] L2 Moxi resident (waiting on user's Moxi sprite)
- [ ] L3 One small problem per chapter
- [ ] L4 Longer Long Walk
- [ ] L5 Sanctuary return events
