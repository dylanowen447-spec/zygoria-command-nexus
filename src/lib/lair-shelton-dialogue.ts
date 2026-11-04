/** Voice-only supporting exchange, after the existing cinematic has finished. */
export const SHELTON_DISPATCH = [
  { who: "Kronk", text: "Shelton, don't just stand there! Dispose of these three insects!" },
  { who: "Shelton", text: "Of course, sire! A beast of your perfection shouldn't have to lift a claw." },
  { who: "Oz", text: "Oh, brilliant. The tortoise is back." },
  { who: "Brix", text: "Stay together, boys. We know his tricks." },
  { who: "Lowkey", text: "Watch the shell. Wait for his opening." },
  { who: "Shelton", text: "You heard my lord. This time, you're not getting past me!" },
] as const;
export const SHELTON_RETREAT = [
  { who: "Shelton", text: "S-sire! They've cracked my shell!" },
  { who: "Kronk", text: "USELESS! Stay out of my way!" },
] as const;