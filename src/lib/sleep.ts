/** Crew rest: drifts down slowly in the Sanctuary and is restored by a night's sleep in their own homes. Saved on-device. */
export const REST_KEY = "zygoria-rest-v1";
export const REST_START = 90;
export const REST_FLOOR = 15;
export const REST_DRAIN_MS = 45000;

export const clampRest = (v: number) => Math.max(REST_FLOOR, Math.min(100, Math.round(v)));

export function loadRest(): number {
  try { const v = Number(localStorage.getItem(REST_KEY)); return Number.isFinite(v) && v > 0 ? clampRest(v) : REST_START; } catch { return REST_START; }
}
export function saveRest(v: number) {
  try { localStorage.setItem(REST_KEY, String(v)); } catch { /* optional */ }
}

/** Words that call the crew in for the night. */
export const REST_WORDS = /\b(sleep\w*|bed ?time|go ?to ?bed|hit ?the ?sack|turn ?in|nap\w*|good ?night|nighty ?night|lights? ?out|snooze|tuck ?in|beddy)\b/i;

export const REST_LINES: Record<40 | 20 | 10, [string, string][]> = {
  40: [["Oz", "Getting heavy-eyed."], ["Lowkey", "Eyes are drooping."]],
  20: [["Brix", "Need to sit down, lads."], ["Oz", "Yawning like a fish."]],
  10: [["Lowkey", "Can't stay up much longer."], ["Brix", "Bench's calling me."]],
};

/** Each crew member's line on the way to bed. */
export const BEDTIME_LINES: Record<string, string> = {
  Oz: "Right. Shutting it all down.",
  Brix: "Finally. Some peace and quiet.",
  Lowkey: "Night.",
  Moxi: "…Mm. Fire's warm.",
};

/** Each crew member's line when morning comes. */
export const WAKE_LINES: Record<string, string> = {
  Oz: "Morning! Everyone up?",
  Brix: "Back up. Bench first.",
  Lowkey: "Sun's up.",
  Moxi: "…Five more minutes.",
};
