/** Crew hunger: cosmetic during the opening journey (floor 30), gentle and real in the Sanctuary (floor 10). Saved on-device. */
export const HUNGER_KEY = "zygoria-hunger-v1";
export const HUNGER_START = 85;
export const PROLOGUE_FLOOR = 30;
export const SANCTUARY_FLOOR = 10;
export const PROLOGUE_DRAIN_MS = 8000;
export const SANCTUARY_DRAIN_MS = 15000;
export const FISH_RESTORE = { small: 20, medium: 30, large: 40 } as const;

export const clampHunger = (v: number, floor: number) => Math.max(floor, Math.min(100, Math.round(v)));

export function loadHunger(): number {
  try { const v = Number(localStorage.getItem(HUNGER_KEY)); return Number.isFinite(v) && v > 0 ? clampHunger(v, SANCTUARY_FLOOR) : HUNGER_START; } catch { return HUNGER_START; }
}
export function saveHunger(v: number) {
  try { localStorage.setItem(HUNGER_KEY, String(v)); } catch { /* optional */ }
}

export const HUNGER_LINES: Record<40 | 20 | 10, [string, string][]> = {
  40: [["Oz", "Getting a bit hungry."], ["Brix", "Getting a bit hungry."]],
  20: [["Oz", "My stomach's rumbling louder than the radio."], ["Brix", "Could do with some fish soon."]],
  10: [["Oz", "Seriously. Food. Someone. Please."], ["Brix", "Running on empty here."]],
};
