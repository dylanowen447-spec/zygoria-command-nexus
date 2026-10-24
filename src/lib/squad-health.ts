import type { Agent } from "@/lib/zones";

/** Bites each Zig can take before going down. */
export const MAX_HP: Record<Agent, number> = { Brix: 5, Lowkey: 4, Oz: 4 };
export const REVIVE_HP = 2;
export const REVIVE_MS = 2000;
/** Seconds-on-one-knee before a downed Zig bounces back, and bite grace after each hit. */
export const KNEEL_MS = 1200;
export const IFRAME_MS = 800;
export const MAX_BITERS = 3;
export const KILLS_PER_HEAL = 3;

export type Squad = Record<Agent, number>;
export const fullSquad = (): Squad => ({ ...MAX_HP });
export const damage = (s: Squad, a: Agent, n = 1): Squad => ({ ...s, [a]: Math.max(0, s[a] - n) });
export const heal = (s: Squad, n = 1): Squad => {
  const out = { ...s };
  for (const a of Object.keys(out) as Agent[]) if (out[a] > 0) out[a] = Math.min(MAX_HP[a], out[a] + n);
  return out;
};
export const revive = (s: Squad, a: Agent): Squad => (s[a] > 0 ? s : { ...s, [a]: REVIVE_HP });
export const isDown = (s: Squad, a: Agent) => s[a] <= 0;
export const allDown = (s: Squad) => (Object.keys(s) as Agent[]).every(a => s[a] <= 0);

/** Live squad state shared with the scene so companions/controls skip downed Zigs. */
export const liveSquad: { hp: Squad } = { hp: fullSquad() };
