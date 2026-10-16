import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "zygoria-welcome-v1";

/** Visitor questions that can be tapped to speak to the crew straight away. */
const ASKS = [
  "Where are we?",
  "What do you remember?",
  "What should we do first?",
  "Can you see anything nearby?",
  "Should we stay here?",
];

/** A first-visit field guide card over the world viewport — dismissible, reopenable. */
export function WelcomeGuide({ onAsk }: { onAsk?: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      if (localStorage.getItem(KEY) !== "seen") setOpen(true);
    } catch { /* guide still shows when storage is unavailable */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); tabRef.current?.focus(); }
    };
    // Tapping the scene outside the card tucks the guide away so the tap still counts (e.g. Oz's zap).
    const onTap = (event: PointerEvent) => {
      const t = event.target as Element | null;
      if (!t || typeof t.closest !== "function" || t.closest(".welcome-card") || !t.closest(".world-image-wrap")) return;
      setOpen(false);
      try { localStorage.setItem(KEY, "seen"); } catch { /* optional */ }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onTap, true);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onTap, true); };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, "seen"); } catch { /* optional */ }
    tabRef.current?.focus();
  };

  const ask = (question: string) => {
    dismiss();
    onAsk?.(question);
  };

  if (!ready) return null;
  return <>
    {open && <div className="welcome-overlay">
      <section className="welcome-card" aria-label="Welcome to Zygoria">
        <header className="welcome-head">
          <div className="welcome-eyebrow"><span className="eyebrow-line"/> FIELD GUIDE <span className="eyebrow-line"/></div>
          <h3>WELCOME TO <span>ZYGORIA</span></h3>
          <Button ref={closeRef} type="button" variant="ghost" size="icon" className="welcome-close" onClick={dismiss} aria-label="Close the field guide"><X size={15}/></Button>
        </header>
        <p className="welcome-lead"><strong>Three eggs have fallen from the sky.</strong></p>
        <p className="welcome-lead">Oz, Brix and Lowkey have just woken in a world they do not recognise.</p>
        <p className="welcome-note">They remember their names. They know how to speak. Some instincts feel strangely familiar.</p>
        <p className="welcome-note">But they do not know where they are, why they were sent here, or what waits beyond the landing site.</p>
        <div className="welcome-col">
          <span className="welcome-label">Your journey starts here</span>
          <ul>
            <li>Explore the area.</li>
            <li>Talk to the Zigs.</li>
            <li>Help them investigate their surroundings.</li>
            <li>Follow what they discover.</li>
          </ul>
        </div>
        <div className="welcome-col">
          <span className="welcome-label">How to play</span>
          <ul>
            <li>Tap the ground to walk.</li>
            <li>Double-tap a Zig to take control — then ATTACK or Space.</li>
            <li>Watch their food, water and rest meters.</li>
            <li>Tap strange objects to uncover Codex clues.</li>
          </ul>
        </div>
        <p className="welcome-note">New places, characters and dangers will reveal themselves as the story unfolds.</p>
        <div className="welcome-col">
          <span className="welcome-label">Try asking</span>
          <ul className="welcome-asks">
            {ASKS.map(q => <li key={q}><button type="button" onClick={() => ask(q)}>“{q}”</button></li>)}
          </ul>
        </div>
        <Button type="button" className="welcome-enter" onClick={dismiss}>BEGIN EXPLORATION <ChevronDown size={13}/></Button>
      </section>
    </div>}
    {!open && <Button ref={tabRef} type="button" variant="outline" className="welcome-tab" onClick={() => setOpen(true)} aria-label="Open the field guide">✦ GUIDE</Button>}
  </>;
}
