/**
 * Zygoria canon — the single source of truth the crew reads on every directive.
 * Add notes as dated entries in order; when a later entry says something changed, it overrides earlier ones.
 */
export const ZYGORIA_CANON_ENTRIES: { date: string; notes: string }[] = [
  // Lore notes from the creator go here, oldest first.
];

export function canonPrompt() {
  const body = ZYGORIA_CANON_ENTRIES.length
    ? ZYGORIA_CANON_ENTRIES.map((e, i) => `[Entry ${i + 1} — ${e.date}]\n${e.notes.trim()}`).join("\n\n")
    : "(No canon notes have been provided yet. Nothing about Zygoria is established.)";
  return `ZYGORIA CANON (source of truth, oldest entry first; a later entry that explicitly changes something overrides earlier entries):
<canon>
${body}
</canon>
Canon rules for every agent: use only the canon above as established Zygoria lore. Never invent canon. If something the directive needs is missing or unclear, say plainly that it is "not established yet". If a new idea conflicts with the canon, flag it starting with "CONFLICT:" and cite what the canon says. New ideas may be proposed, but label them as proposals, not canon. Lowkey uses the canon for continuity, canon checks, character consistency, world rules, naming and story logic. Oz uses it to keep creative decisions consistent with the world. Brix uses it for card briefs, website content and production outputs, marking any unestablished field as "not established yet".`;
}
