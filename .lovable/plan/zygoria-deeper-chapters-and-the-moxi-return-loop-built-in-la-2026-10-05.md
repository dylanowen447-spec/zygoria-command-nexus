# Zygoria — deeper chapters and the Moxi return loop (built in layers)

Each layer is small and self-contained. It gets tested on its own and can be published before the next one starts. The chapter order (Three Eggs → Old City → Library → Long Walk → Sanctuary), sprites, artwork, Sanctuary layout and AI behaviour stay as they are.

## Layer 1 — Moxi story in the Sanctuary (replaces the flashing light)
- Remove the "distant flash" story beats and banter lines. Lowkey's flash mystery is retired.
- Moxi stays hidden at the start: her painted peek under the evergreen only appears once the crew are actually searching.
- A Sanctuary timer counts only real time spent in the Sanctuary after finishing the opening. It pauses when you leave and never runs in Chapters 1–3. It saves on the device, so reloading doesn't reset it.
- After about 3 minutes, Lowkey looks up from the lookout: "Hang on. Something moved over there." No name, no "dragon" yet.
- Ask Lowkey about it → he says it looked small, scaly, maybe dragon-like.
- Tell Oz or Brix ("Lowkey saw a dragon") → they react in character and the three start investigating.
- Investigation: the crew walk the existing paths to 2–3 clue spots (claw marks by the bridge rocks, scorched grass, a half-eaten fish near the trees). Each clue is found by talking or sending them to look.
- Hiding place: the evergreen by Brix's workshop. Trust moment: you ask Oz to grill a fish and leave it there. She comes out and the crew learn her name.
- Each step saves as its own stage: arrived → spotted → told the others → investigating → found → resident. It never repeats once done.
- The crew only know what the current stage allows. Before "found" nobody says "Moxi". The AI receives only the stage notes they've earned, the same way the opening works.

## Layer 2 — Moxi becomes a resident
- Once she's unlocked, Moxi becomes a fourth small walking character, built from her existing Moxi artwork. She's smaller than Oz and uses a gentle hop or bob instead of a walk cycle, so I don't need new sprite sheets.
- She has her own short list of Sanctuary places: the evergreen, the riverbank, the bridge rocks, the fire pit. She wanders between them and sometimes disappears behind the tree for a while.
- Tap her or say her name and she answers: short, shy, curious, ancient but young. Her lines come from canon notes, and she has offline fallbacks if the live AI is unavailable.
- The Zigs sometimes react to her in their idle chatter, and she joins the fish cookout.
- Saved on the device, so she's there on every future visit.

## Layer 3 — One small problem per chapter
Each problem is discovered by talking to the crew and exploring, not from quest markers:
- **Three Eggs:** Brix's pod hatch is jammed. The crew find a bent metal strut on the crater rim that pries it open before they can leave.
- **Old City:** The Library doors are locked. A key sits in a crate down a side street, and the crew have to carry it back to the door.
- **Library:** The three books sit in sections that are dark. The crew find a lantern or skylight lever first, then the books can be found.
- **Long Walk:** The crew are thirsty and won't climb the ridge until they've found the clean stream and drunk from it.

Each problem adds one "item" spot to the existing scene map. The exit only unlocks after it's solved. Hints come only through what the Zigs say.

## Layer 4 — Longer, more travelled Long Walk
- Add more stopping points along the existing road (more side spots, a rest stop, a second branch) so the crew drift through the dead area → sprouts → stream → trees before the ridge can unlock.
- Raise the minimum exploration before the ridge appears (more spots seen, a longer minimum time).
- The artwork stays the same; it already shows the dead-to-alive transition with the distant valley.

## Layer 5 — Light Sanctuary return events (later)
- Occasional small events that show up between visits: a new fish catch, a shack or workshop breakdown, Moxi hiding somewhere new. These use the same saved world state.

## Recommended order
Layer 1 + 2 first, since they are the big reward. Then Layer 3 one chapter at a time, starting with the Old City key. Then 4, then 5.

## Technical notes
- New saved Moxi stage plus Sanctuary timer, kept in a small client module, matching how the story and world progress are already saved.
- Remove the `flash`, `pattern` and related beats in the story file. Update the server canon state so Moxi is hidden or unknown until the visitor's stage passes it. The client sends its stage to the crew AI call, like it already does for prologue notes.
- Moxi as a resident reuses the existing Sanctuary walking and depth painting, with her own spot list. She stays outside the Oz/Brix/Lowkey job and handoff system, so tasks are unaffected.
- Chapter problems: add an optional `requires` item/door step to scene objectives in the prologue data. The existing unlock timer still applies.
