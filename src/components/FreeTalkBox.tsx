import { useEffect, useRef, useState } from "react";

import { speak } from "@/lib/voice";
import type { Fighter } from "@/lib/combat-boxes";

/**
 * Optional off-script chat with one Zig: the visitor types, the Zig replies in their own voice.
 * Purely conversational — it never touches story, quest or world state, and it cancels itself the moment the scene goes away.
 */
export function FreeTalkBox({ who, scene, disabled = false, onBusy }: { who: Fighter; scene: string; disabled?: boolean; onBusy: (busy: boolean) => void }) {
  const [text, setText] = useState("");
  const [reply, setReply] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const busyCb = useRef(onBusy);
  busyCb.current = onBusy;
  useEffect(() => () => { alive.current = false; busyCb.current(false); }, []);

  const send = async () => {
    const said = text.trim();
    if (!said || busy || disabled) return;
    setBusy(true); busyCb.current(true); setReply(""); setNote(""); setText("");
    try {
      const res = await fetch("/api/public/free-talk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ agent: who, said, scene }) });
      const data = await res.json().catch(() => null) as { reply?: string; error?: string } | null;
      if (!alive.current) return;
      const words = typeof data?.reply === "string" ? data.reply.trim() : "";
      if (!res.ok || !words) { setNote(data?.error || "They didn't catch that — try again."); return; }
      setReply(words);
      // The Zig's existing voice, through the shared queue: nothing else gets cut off, and silence stays text-only.
      void speak(who, words, undefined, 4000);
    } catch {
      if (alive.current) setNote("They didn't catch that — try again.");
    } finally {
      if (alive.current) { setBusy(false); busyCb.current(false); }
    }
  };

  return <form className="free-talk" onPointerDown={e => e.stopPropagation()} onSubmit={e => { e.preventDefault(); void send(); }}>
    <input value={text} onChange={e => setText(e.target.value)} maxLength={180} disabled={busy}
      placeholder={`Say something to ${who}…`} aria-label={`Say something to ${who}`}/>
    <button type="submit" disabled={busy || disabled || !text.trim()}>{busy ? "…" : "SAY IT"}</button>
    {reply && <p className="free-talk-reply"><b>{who}</b> {reply}</p>}
    {note && <p className="free-talk-note">{note}</p>}
  </form>;
}
