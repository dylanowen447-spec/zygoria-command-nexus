import { useEffect, useRef, useState } from "react";
import { ChevronDown, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const KEY = "zygoria-welcome-v1";

/** A first-visit field guide card over the world viewport — dismissible, reopenable. */
export function WelcomeGuide() {
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
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, "seen"); } catch { /* optional */ }
    tabRef.current?.focus();
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
        <p className="welcome-lead">Don't just look around — <strong>talk to the Zigs.</strong> They live here, and they answer.</p>
        <div className="welcome-col">
          <span className="welcome-label">Try asking them about</span>
          <ul>
            <li>Zygoria and the Sanctuary</li>
            <li>their roles and personalities</li>
            <li>places they have explored</li>
            <li>things they have repaired or discovered</li>
            <li>what they still don't know about the world</li>
          </ul>
        </div>
        <div className="welcome-col">
          <span className="welcome-label">Or give them a job to do</span>
          <ul className="welcome-jobs">
            <li>"Brix, repair something in the workshop."</li>
            <li>"Oz, activate the shack speakers."</li>
            <li>"Lowkey, scout the ridge."</li>
            <li>"Work together to solve a problem."</li>
          </ul>
        </div>
        <p className="welcome-note">Each Zig works their own way — and some of the things they do leave a lasting mark on the world.</p>
        <div className="welcome-tip"><Sparkles size={13}/> Tip: talk to them as if they really live in Zygoria.</div>
        <Button type="button" className="welcome-enter" onClick={dismiss}>STEP INTO THE NEXUS <ChevronDown size={13}/></Button>
      </section>
    </div>}
    {!open && <Button ref={tabRef} type="button" variant="outline" className="welcome-tab" onClick={() => setOpen(true)} aria-label="Open the field guide">✦ GUIDE</Button>}
  </>;
}
