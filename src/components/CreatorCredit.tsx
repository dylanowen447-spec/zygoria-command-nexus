import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import cover from "@/assets/zygoria-book-one-cover.png.asset.json";
import { CHRONICLES } from "@/lib/chronicles";

/** Book One cover first, then the four chapters in story order — reads like a real book. */
const PAGES = [
  { img: cover.url, label: "BOOK ONE · COVER", alt: "Zygoria: First Genesis Book One cover by Dylan Owen, showing Oz, Brix and Lowkey" },
  ...CHRONICLES.map(c => ({ img: c.img, label: `CHAPTER ${String(c.n).padStart(2, "0")} · ${c.title.toUpperCase()}`, alt: `Chapter ${c.n}: ${c.title}` })),
];

export function CreatorCredit() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") setPage(p => Math.min(p + 1, PAGES.length - 1));
      if (event.key === "ArrowLeft") setPage(p => Math.max(p - 1, 0));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  const current = PAGES[page]!;

  return <>
    <button ref={triggerRef} type="button" className="creator-badge" onClick={() => { setPage(0); setOpen(true); }} aria-label="Created by Dylan Owen, 2026. Read Book One from Chapter 1">
      <span className="creator-badge-label">Created by</span>
      <span className="creator-badge-name">Dylan Owen</span>
      <span className="creator-badge-year">2026</span>
      <span className="creator-badge-cta">Book One ›</span>
    </button>
    {open && createPortal(<div className="cover-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="cover-dialog" role="dialog" aria-modal="true" aria-label="Zygoria: First Genesis, Book One">
        <button ref={closeRef} type="button" className="cover-close" onClick={close} aria-label="Close"><X size={16} /></button>
        <img className="cover-art" src={current.img} alt={current.alt} />
        <p className="cover-caption">{current.label} <span>{page + 1} / {PAGES.length} · Created by Dylan Owen · 2026</span></p>
        <div className="cover-nav">
          <button type="button" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Prev</button>
          <span>{PAGES.map((p, i) => <button key={p.label} type="button" className={`chronicle-dot ${i === page ? "is-active" : ""}`} aria-label={p.label} onClick={() => setPage(i)} />)}</span>
          <button type="button" disabled={page === PAGES.length - 1} onClick={() => setPage(p => p + 1)}>Next ›</button>
        </div>
      </div>
    </div>, document.body)}
  </>;
}
