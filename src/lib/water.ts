/** Crew water: full during the opening, drains gently in the Sanctuary (floor 10). Bottles hold limited drinks. Saved on-device. */
export const WATER_KEY = "zygoria-water-v1";
export const WATER_FLOOR = 10;
export const WATER_DRAIN_MS = 30000;
export const DRINK_RESTORE = 30;
export const BOTTLE_MAX = 3;

export const clampWater = (v: number) => Math.max(WATER_FLOOR, Math.min(100, Math.round(v)));

export function loadWater(): { water: number; bottles: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(WATER_KEY) || "null");
    if (raw && Number.isFinite(raw.water) && Number.isFinite(raw.bottles)) return { water: clampWater(raw.water), bottles: Math.max(0, Math.min(BOTTLE_MAX, raw.bottles)) };
  } catch { /* fresh */ }
  return { water: 100, bottles: BOTTLE_MAX };
}
export function saveWater(water: number, bottles: number) {
  try { localStorage.setItem(WATER_KEY, JSON.stringify({ water, bottles })); } catch { /* optional */ }
}

export const DRINK_WORDS = /\b(drink\w*|thirst\w*|water|sip|swig|hydrat\w*|bottle\w*)\b/i;

export const DRINK_LINES: [string, string][] = [["Oz", "Ahh. Better."], ["Brix", "Needed that."], ["Lowkey", "Cold. Good."]];
export const DRY_LINES: [string, string][] = [["Brix", "Bottles are dry."], ["Oz", "Empty. We'll need the river."]];

export const WATER_LINES: Record<40 | 20 | 10, [string, string][]> = {
  40: [["Oz", "Bit thirsty, me."], ["Lowkey", "Throat's dry."]],
  20: [["Brix", "Could murder a drink."], ["Oz", "My mouth's like sand."]],
  10: [["Lowkey", "Need water. Now."], ["Brix", "Running dry here."]],
};
