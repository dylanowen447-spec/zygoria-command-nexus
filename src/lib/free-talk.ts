/** Free Talk rules: an optional, off-script chat that must never change the story. */
export const FREE_TALK_AGENTS = ["Oz", "Brix", "Lowkey", "Moxi"] as const;
export type FreeTalkAgent = (typeof FREE_TALK_AGENTS)[number];
export const FREE_TALK_MAX = 180;

/** Validate a visitor's message before it reaches the AI. Throws with a plain, friendly reason. */
export function checkFreeTalkInput(input: { agent?: unknown; said?: unknown; scene?: unknown }): { agent: FreeTalkAgent; said: string; scene: string } {
  const agent = input?.agent;
  if (typeof agent !== "string" || !(FREE_TALK_AGENTS as readonly string[]).includes(agent)) throw new Error("Unknown crew member.");
  const said = typeof input?.said === "string" ? input.said.trim() : "";
  if (!said) throw new Error("Say something first.");
  if (said.length > FREE_TALK_MAX) throw new Error(`Keep it under ${FREE_TALK_MAX} characters.`);
  const scene = typeof input?.scene === "string" && input.scene.trim() ? input.scene.trim().slice(0, 200) : "the Sanctuary";
  return { agent: agent as FreeTalkAgent, said, scene };
}
