import { sceneWithName } from "@/lib/player-name";
import { useEffect, useRef, useState } from "react";

import { speak, silenceAllVoices, unmuteVoices } from "@/lib/voice";

type Zig = "Oz" | "Brix" | "Lowkey";

/** Dispatch answers for scenes without their own chat: the named Zig (or Brix) replies aloud with a bubble. Read-only. */
export function DispatchReply({ command, scene, onConsumed }: { command: { id: number; text: string } | null; scene: string; onConsumed?: () => void }) {
  const [bubble, setBubble] = useState<{ who: Zig; text: string } | null>(null);
  const alive = useRef(true);
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    if (!command) return;
    onConsumed?.();
    const t = command.text.toLowerCase();
    const who = (["Brix", "Oz", "Lowkey"] as Zig[]).find(z => new RegExp(`\\b${z.toLowerCase()}\\b`).test(t)) ?? "Brix";
    setBubble({ who, text: "…" });
    void (async () => {
      let reply = "Sorry, didn't catch that.";
      try {
        const r = await fetch("/api/public/free-talk", { method: "POST", signal: AbortSignal.timeout(15000), headers: { "content-type": "application/json" }, body: JSON.stringify({ agent: who, said: command.text.slice(0, 180), scene: sceneWithName(sceneRef.current) }) });
        const j = await r.json(); if (j.reply) reply = String(j.reply);
      } catch { /* keep fallback */ }
      if (!alive.current) return;
      setBubble({ who, text: reply });
      silenceAllVoices(0); unmuteVoices();
      await speak(who, reply, undefined, 20000);
      setTimeout(() => { if (alive.current) setBubble(b => (b?.text === reply ? null : b)); }, 1500 + reply.length * 30);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- scene is read live from sceneRef; only a new command should fire a reply
  }, [command]);
  if (!bubble) return null;
  return <div className="dispatch-reply" role="status"><b>{bubble.who.toUpperCase()}</b>{bubble.text}</div>;
}
