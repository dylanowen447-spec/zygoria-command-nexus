/** The name the player gave Oz in Three Eggs, shared by every Zig through Dispatch. */
export const PLAYER_NAME_KEY = "zygoria-voice-name";

export function getPlayerName(): string {
  try { return localStorage.getItem(PLAYER_NAME_KEY) || ""; } catch { return ""; }
}

/** Adds the player's name to a scene description so the Zig replying can use it naturally. */
export function sceneWithName(scene: string): string {
  const n = getPlayerName();
  const who = n ? ` They are called ${n}; use their name now and then.` : "";
  return `(You already know the voice that talks to you over Dispatch — it's familiar now. Never react as if it's new, strange or "the sky talking"; just answer it.${who}) ${scene}`;
}
