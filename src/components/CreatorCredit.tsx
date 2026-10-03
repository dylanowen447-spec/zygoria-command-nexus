import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import cover from "@/assets/zygoria-book-one-cover.png.asset.json";

export function CreatorCredit() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  return <>
    <button ref={triggerRef} type="button" className="creator-badge" onClick={() => setOpen(true)} aria-label="Created by Dylan Owen, 2026. View the Book One cover">
      <span className="creator-badge-label">Created by</span>
      <span className="creator-badge-name">Dylan Owen</span>
      <span className="creator-badge-year">2026</span>
      <span className="creator-badge-cta">Book One ›</span>
    </button>
    {open && <div className="cover-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="cover-dialog" role="dialog" aria-modal="true" aria-label="Zygoria: First Genesis, Book One cover">
        <button ref={closeRef} type="button" className="cover-close" onClick={close} aria-label="Close cover"><X size={16} /></button>
        <img className="cover-art" src={cover.url} alt="Zygoria: First Genesis Book One cover by Dylan Owen, showing Oz, Brix and Lowkey" />
        <p className="cover-caption">ZYGORIA · FIRST GENESIS · BOOK ONE <span>Created by Dylan Owen · 2026</span></p>
      </div>
    </div>}
  </>;
}
