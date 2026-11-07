/** The name the player gave Oz in Three Eggs, shared by every Zig through Dispatch. */
export const PLAYER_NAME_KEY = "zygoria-voice-name";

export function getPlayerName(): string {
  try { return localStorage.getItem(PLAYER_NAME_KEY) || ""; } catch { return ""; }
}

/** Adds the player's name to a scene description so the Zig replying can use it naturally. */
export function sceneWithName(scene: string): string {
  const n = getPlayerName();
  return n ? `(The voice from the sky talking to you is called ${n}; use their name now and then.) ${scene}` : scene;
}
