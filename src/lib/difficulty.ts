/** Player-chosen fight difficulty, kept on-device. */
export type Difficulty = "easy" | "normal" | "hard";
const KEY = "zygoria-difficulty";
export const DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard"];

export function getDifficulty(): Difficulty {
  try { const v = localStorage.getItem(KEY); if (v === "easy" || v === "normal" || v === "hard") return v; } catch { /* default */ }
  return "normal";
}
export function setDifficulty(d: Difficulty) { try { localStorage.setItem(KEY, d); } catch { /* fine */ } }

/** Shelton tuning per difficulty: pips per charge, pips per slam (0 = no slam damage), and speed/open-window scale. */
export const SHELTON_TUNING: Record<Difficulty, { charge: number; slam: number; speed: number; open: number; extraRats: number }> = {
  easy: { charge: 1, slam: 0, speed: 0.8, open: 1.5, extraRats: -2 },
  normal: { charge: 1, slam: 1, speed: 0.9, open: 1.2, extraRats: -1 },
  hard: { charge: 2, slam: 1, speed: 1, open: 1, extraRats: 0 },
};
