import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronRight, LockKeyhole, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZONES, type ZoneId } from "@/lib/zones";
import ozPortrait from "@/assets/oz.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";

type Category = "Characters" | "Creatures" | "Locations" | "Objects" | "Old Earth discoveries" | "Network-related discoveries" | "Unsolved mysteries";
type Page = { id: string; category: Category; name: string; description: string; location: string | null; recordedBy: string | null; level: "known" | "partial" | "hidden" };
type Log = { text: string; zone: ZoneId; done: boolean; results: string };
const CATEGORIES: Category[] = ["Characters", "Creatures", "Locations", "Objects", "Old Earth discoveries", "Network-related discoveries", "Unsolved mysteries"];
const PORTRAITS: Record<string, string> = { oz: ozPortrait.url, brix: brixPortrait.url, lowkey: lowkeyPortrait.url };
const ZONE_IMAGES: Record<string, ZoneId> = { sanctuary: "sanctuary", ruins: "ruins", caves: "caves", swamp: "cronk", camp: "shelton" };
const KEY = "zygoria-codex-v1";

export function FieldCodex({ pages, logs, visited, currentZone }: { pages: readonly Page[]; logs: Log[]; visited: ZoneId[]; currentZone: ZoneId }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Characters");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) setFound(saved.filter((id): id is string => typeof id === "string"));
    } catch { /* journal still works when storage is unavailable */ }
  }, []);

  // Visits and finished directives bookmark already-known pages; neither can establish new lore.
  useEffect(() => {
    const logged = new Set(found);
    for (const zone of visited) {
      const pageId = zone === "cronk" ? "swamp" : zone === "shelton" ? "camp" : zone;
      logged.add(pageId);
    }
    for (const mission of logs.filter(item => item.done)) {
      if (/salvage|scrap|cable|machine|tech/i.test(mission.text)) logged.add("salvage");
      if (/repair|rebuild|power|light|generator/i.test(mission.text)) logged.add("lights");
    }
    const next = [...logged].filter(id => pages.some(page => page.id === id && page.level !== "hidden"));
    if (next.length !== found.length || next.some(id => !found.includes(id))) {
      setFound(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* optional */ }
    }
  }, [visited, logs, found, pages]);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); triggerRef.current?.focus(); }
      if (event.key === "Tab") {
        const controls = document.querySelectorAll<HTMLButtonElement>(".codex-drawer button");
        const first = controls[0]; const last = controls[controls.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const selected = pages.find(page => page.id === selectedId && page.category === category);
  const list = pages.filter(page => page.category === category);
  const visibleCount = pages.filter(page => page.level !== "hidden").length;
  const imageFor = (id: string) => { const zoneId = ZONE_IMAGES[id]; return PORTRAITS[id] ?? (zoneId ? ZONES[zoneId].img : undefined); };
  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  return <>
    <Button ref={triggerRef} type="button" variant="outline" className="codex-toggle" onClick={() => setOpen(true)} aria-label="Open Zygoria Codex"><BookOpen size={15}/> ZYGORIA CODEX <span className="codex-count">{visibleCount}/{pages.length}</span></Button>
    {open && <div className="codex-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <aside className="codex-drawer" role="dialog" aria-modal="true" aria-label="Zygoria Codex">
        <header className="codex-head"><div><div className="codex-eyebrow">FIELD JOURNAL / {currentZone === "sanctuary" ? "HOME" : ZONES[currentZone].short}</div><h2>Zygoria Codex</h2><p>Notes from a world still being understood.</p></div><Button ref={closeRef} type="button" variant="ghost" size="icon" className="codex-close" onClick={close} aria-label="Close codex"><X size={17}/></Button></header>
        <div className="codex-bookmark"><BookOpen size={15}/><span>{visibleCount} known pages · {pages.length - visibleCount} still unrecorded</span></div>
        <nav className="codex-tabs" aria-label="Codex sections">{CATEGORIES.map(item => <Button key={item} type="button" variant="ghost" className={`codex-tab ${category === item ? "is-active" : ""}`} aria-current={category === item ? "page" : undefined} onClick={() => { setCategory(item); setSelectedId(null); }}>{item}<span>{pages.filter(page => page.category === item).length}</span></Button>)}</nav>
        <div className="codex-body"><div className="codex-section-title"><span>{category}</span><small>{String(list.length).padStart(2, "0")} ENTRIES</small></div>
          <div className="codex-list">{list.map(page => {
            const hidden = page.level === "hidden";
            const image = !hidden ? imageFor(page.id) : undefined;
            return <Button type="button" variant="ghost" key={page.id} className={`codex-row ${selectedId === page.id ? "is-selected" : ""}`} onClick={() => setSelectedId(page.id)} aria-label={`Read ${hidden ? "undiscovered" : page.name} entry`}>
              <span className={`codex-thumb ${hidden ? "is-hidden" : ""}`}>{image ? <img src={image} alt=""/> : hidden ? <LockKeyhole size={17}/> : <BookOpen size={17}/>}</span>
              <span className="codex-row-copy"><strong>{hidden ? "Unrecorded" : page.name}</strong><small>{hidden ? "NOT YET DISCOVERED" : found.includes(page.id) ? "FIELD NOTE · RECORDED" : page.level === "partial" ? "FRAGMENT · INCOMPLETE" : "KNOWN · NOTED"}</small></span><ChevronRight size={15}/>
            </Button>;
          })}</div>
          {selected && <div className="codex-detail" aria-live="polite"><div className="codex-detail-label">{selected.level === "hidden" ? "BLANK PAGE" : selected.level === "partial" ? "INCOMPLETE RECORD" : "FIELD RECORD"}</div>
            <h3>{selected.level === "hidden" ? "Unrecorded" : selected.name}</h3><p>{selected.description}</p>
            {selected.level !== "hidden" && <div className="codex-detail-meta"><span><MapPin size={13}/> {selected.location ? `Known location · ${selected.location}` : "Location not yet recorded"}</span><span><BookOpen size={13}/> {selected.recordedBy ? `Recorded by ${selected.recordedBy}` : "Crew journal"}</span><span>{selected.level === "partial" ? "DISCOVERY STATUS · INCOMPLETE" : "DISCOVERY STATUS · KNOWN"}</span></div>}
          </div>}
          {!selected && <div className="codex-quiet">Choose a page to read the crew's notes.</div>}
        </div>
      </aside>
    </div>}
  </>;
}