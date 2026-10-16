import brixBg from "@/assets/brix-workshop.png";
import ozShack from "@/assets/oz-shack-interior.png.asset.json";

export type InteriorId = "brix" | "oz";
type Zig = "Oz" | "Brix" | "Lowkey";

/** Walk-in interiors entered by double-tapping a Sanctuary door. */
export const INTERIORS: Record<InteriorId, {
  img: string; alt: string; label: string; cls: string;
  /** Outside button spot (percent of the scene). */
  exit: { left: string; top: string };
  greeting: Record<Zig, string>;
}> = {
  brix: {
    img: brixBg,
    alt: "Inside Brix's workshop: timber rafters, a blueprint wall, a loft and a big covered machine on a workbench",
    label: "BRIX'S WORKSHOP",
    cls: "workshop-scene",
    exit: { left: "84%", top: "48%" },
    greeting: {
      Brix: "Mind the floor. Everything on it is important.",
      Oz: "Ooh, Brix's workshop. Don't touch anything. Touching one thing.",
      Lowkey: "Quiet in here. Smells like oil and old ideas.",
    },
  },
  oz: {
    img: ozShack.url,
    alt: "Inside Oz's shack: a big yellow sofa, a woven rug, record crates, twin speakers and turntables under a window onto the river",
    label: "OZ'S SHACK",
    cls: "workshop-scene shack-scene",
    exit: { left: "8%", top: "52%" },
    greeting: {
      Oz: "Welcome to the best room in Zygoria. Shoes off. Actually, keep them on.",
      Brix: "Those speakers are wired wrong. Both of them.",
      Lowkey: "Cosy. Loud. Very you, Oz.",
    },
  },
};
