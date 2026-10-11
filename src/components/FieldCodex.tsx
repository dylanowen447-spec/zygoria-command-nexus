import { useEffect, useRef, useState } from "react";
import { BookOpen, ChevronRight, LockKeyhole, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ZONES, type ZoneId } from "@/lib/zones";
import ozPortrait from "@/assets/oz.webp.asset.json";
import brixPortrait from "@/assets/brix.webp.asset.json";
import lowkeyPortrait from "@/assets/lowkey.webp.asset.json";
import kronkCard from "@/assets/kronk-card.png.asset.json";
import thothCard from "@/assets/thoth-card.png.asset.json";
import moxiCard from "@/assets/moxi-card.png.asset.json";
import { CHRONICLES } from "@/lib/chronicles";

type Category = "Characters" | "Creatures" | "Locations" | "Objects" | "Old Earth discoveries" | "Network-related discoveries" | "Unsolved mysteries";
type Page = { id: string; category: Category; name: string; description: string; location: string | null; recordedBy: string | null; level: "known" | "partial" | "hidden" };
type Log = { text: string; zone: ZoneId; done: boolean; results: string };
const CATEGORIES: Category[] = ["Characters", "Creatures", "Locations", "Objects", "Old Earth discoveries", "Network-related discoveries", "Unsolved mysteries"];
const PORTRAITS: Record<string, string> = { oz: ozPortrait.url, brix: brixPortrait.url, lowkey: lowkeyPortrait.url, cronk: kronkCard.url, thoth: thothCard.url, moxi: moxiCard.url };
const ZONE_IMAGES: Record<string, ZoneId> = { sanctuary: "sanctuary", ruins: "ruins", caves: "caves", swamp: "cronk", camp: "shelton" };
const KEY = "zygoria-codex-v1";

const OPENING_NOTE: Record<string, string> = { oz: "Freshly hatched from the yellow pod. Quick, curious, already talking.", brix: "Climbed out of the big blue pod. Strong, steady, likes fixing things.", lowkey: "Came out of the red pod quietly. Watches everything.", pods: "Three egg-shaped pods: yellow, red and blue. We woke up inside them.", ruins: "A dead city of broken towers and empty roads. Someone lived here once." };
const GATED: Record<string, string> = { survivors: "caves", caves: "caves", shelton: "shelton", camp: "shelton", cronk: "cronk", swamp: "cronk" };
export function FieldCodex({ pages: allPages, logs, visited, currentZone, recorded = [], stage = 3 }: { pages: readonly Page[]; logs: Log[]; visited: ZoneId[]; currentZone: ZoneId; recorded?: string[]; stage?: number }) {
  // Only what the crew has actually seen in the world: opening chapters know the Zigs, pods (and ruins from Chapter 2); later places unlock by visiting.
  const pages = allPages.map(page => {
    if (stage < 3) {
      const ok = ["oz", "brix", "lowkey", "pods"].includes(page.id) || (page.id === "ruins" && stage >= 1);
      return ok ? { ...page, description: OPENING_NOTE[page.id] ?? page.description, location: stage === 0 ? "Landing site" : "On the road", level: page.id === "ruins" ? "partial" as const : page.level } : { ...page, level: "hidden" as const };
    }
    const zone = GATED[page.id];
    if (zone && !visited.includes(zone as ZoneId)) return { ...page, level: "hidden" as const };
    // Thoth's page stays blank until Lowkey's lookout encounter has played.
    if (page.id === "thoth" && !recorded.includes("thoth")) return { ...page, level: "hidden" as const };
    return page;
  });
  const maxChapter = Math.min(stage, CHRONICLES.length - 1);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("Characters");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [chronicles, setChronicles] = useState(false);
  const [chapter, setChapter] = useState(maxChapter);
  const [found, setFound] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "[]");
      if (Array.isArray(saved)) setFound(saved.filter((id): id is string => typeof id === "string"));
    } catch { /* journal still works when storage is unavailable */ }
    setRestored(true);
  }, []);

  // Visits and finished directives bookmark already-known pages; neither can establish new lore.
  useEffect(() => {
    if (!restored) return;
    const logged = new Set(found);
    for (const zone of visited) {
      const pageId = zone === "cronk" ? "swamp" : zone === "shelton" ? "camp" : zone;
      logged.add(pageId);
    }
    for (const id of recorded) logged.add(id); // discoveries made by Zig world actions
    for (const mission of logs.filter(item => item.done)) {
      if (/salvage|scrap|cable|machine|tech/i.test(mission.text)) logged.add("salvage");
      if (/repair|rebuild|power|light|generator/i.test(mission.text)) logged.add("lights");
    }
    const next = [...logged].filter(id => pages.some(page => page.id === id && page.level !== "hidden"));
    if (next.length !== found.length || next.some(id => !found.includes(id))) {
      setFound(next);
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* optional */ }
    }
  }, [visited, logs, found, pages, restored, recorded]);

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

  useEffect(() => { setChapter(maxChapter); }, [maxChapter]);
  const selected = pages.find(page => page.id === selectedId && page.category === category);
  const list = pages.filter(page => page.category === category);
  const visibleCount = pages.filter(page => page.level !== "hidden").length;
  const fullyKnown = pages.filter(page => page.level === "known").length;
  const incomplete = pages.filter(page => page.level === "partial").length;
  const imageFor = (id: string) => { const zoneId = ZONE_IMAGES[id]; return PORTRAITS[id] ?? (zoneId ? ZONES[zoneId].img : undefined); };
  const close = () => { setOpen(false); triggerRef.current?.focus(); };

  return <>
    <Button ref={triggerRef} type="button" variant="outline" className="codex-toggle" onClick={() => setOpen(true)} aria-label="Open Zygoria Codex"><BookOpen size={15}/> ZYGORIA CODEX <span className="codex-count">{visibleCount}/{pages.length}</span></Button>
    {open && <div className="codex-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) close(); }}>
      <aside className="codex-drawer" role="dialog" aria-modal="true" aria-label="Zygoria Codex">
        <header className="codex-head"><div><div className="codex-eyebrow">FIELD JOURNAL / {currentZone === "sanctuary" ? "HOME" : ZONES[currentZone].short}</div><h2>Zygoria Codex</h2><p>Notes from a world still being understood.</p></div><Button ref={closeRef} type="button" variant="ghost" size="icon" className="codex-close" onClick={close} aria-label="Close codex"><X size={17}/></Button></header>
        <div className="codex-bookmark"><BookOpen size={15}/><span>{fullyKnown} known · {incomplete} incomplete · {pages.length - visibleCount} unrecorded</span></div>
        <nav className="codex-tabs" aria-label="Codex sections"><Button type="button" variant="ghost" className={`codex-tab ${chronicles ? "is-active" : ""}`} aria-current={chronicles ? "page" : undefined} onClick={() => { setChronicles(true); setSelectedId(null); }}>Chronicles<span>{CHRONICLES.length}</span></Button>{CATEGORIES.map(item => <Button key={item} type="button" variant="ghost" className={`codex-tab ${!chronicles && category === item ? "is-active" : ""}`} aria-current={!chronicles && category === item ? "page" : undefined} onClick={() => { setChronicles(false); setCategory(item); setSelectedId(null); }}>{item}<span>{pages.filter(page => page.category === item).length}</span></Button>)}</nav>
        {chronicles ? <div className="codex-body"><div className="codex-section-title"><span>First Genesis · Chapter {chapter + 1} of {maxChapter + 1}</span><small>{chapter === maxChapter ? "YOU ARE HERE" : "MEMORY"}</small></div>
          <figure className="chronicle-page"><a href={CHRONICLES[chapter]!.img} target="_blank" rel="noreferrer"><img src={CHRONICLES[chapter]!.img} alt={`Chapter ${chapter + 1}: ${CHRONICLES[chapter]!.title}`}/></a><figcaption><h3>{CHRONICLES[chapter]!.title}</h3><p>{CHRONICLES[chapter]!.text}</p></figcaption></figure>
          <div className="chronicle-nav"><Button type="button" variant="outline" disabled={chapter === 0} onClick={() => setChapter(c => c - 1)}>‹ PREV</Button><span>{CHRONICLES.slice(0, maxChapter + 1).map((c, i) => <button key={c.n} type="button" className={`chronicle-dot ${i === chapter ? "is-active" : ""}`} aria-label={`Chapter ${c.n}`} onClick={() => setChapter(i)}/>)}</span><Button type="button" variant="outline" disabled={chapter >= maxChapter} onClick={() => setChapter(c => c + 1)}>NEXT ›</Button></div>
        </div> :
        <div className="codex-body"><div className="codex-section-title"><span>{category}</span><small>{String(list.length).padStart(2, "0")} ENTRIES</small></div>
          <div className="codex-list">{list.map(page => {
            const hidden = page.level === "hidden";
            const image = !hidden ? imageFor(page.id) : undefined;
            return <Button type="button" variant="ghost" key={page.id} className={`codex-row ${selectedId === page.id ? "is-selected" : ""}`} onClick={() => setSelectedId(page.id)} aria-label={`Read ${hidden ? "undiscovered" : page.name} entry`}>
              <span className={`codex-thumb ${hidden ? "is-hidden" : ""}`}>{image ? <img src={image} alt=""/> : hidden ? <LockKeyhole size={17}/> : <BookOpen size={17}/>}</span>
              <span className="codex-row-copy"><strong>{hidden ? "Unrecorded" : page.name}</strong><small>{hidden ? "STILL TO DISCOVER" : page.level === "partial" ? found.includes(page.id) ? "FIELD NOTE · INCOMPLETE" : "FRAGMENT · INCOMPLETE" : found.includes(page.id) ? "FIELD NOTE · RECORDED" : "KNOWN · NOTED"}</small></span><ChevronRight size={15}/>
            </Button>;
          })}</div>
          {selected && <div className="codex-detail" aria-live="polite"><div className="codex-detail-label">{selected.level === "hidden" ? "BLANK PAGE" : selected.level === "partial" ? "INCOMPLETE RECORD" : "FIELD RECORD"}</div>
            {selected.level !== "hidden" && selected.id === "cronk" && <img className="codex-card" src={kronkCard.url} alt="Kronk, Shiny 010: The Boss trading card"/>}{selected.level !== "hidden" && selected.id === "thoth" && <img className="codex-card" src={thothCard.url} alt="Thoth, Shiny 006 trading card"/>}{selected.level !== "hidden" && selected.id === "moxi" && <img className="codex-card" src={moxiCard.url} alt="Moxi, Shiny 004 trading card"/>}<h3>{selected.level === "hidden" ? "Unrecorded" : selected.name}</h3><p>{selected.description}</p>
            {selected.level !== "hidden" && <div className="codex-detail-meta"><span><MapPin size={13}/> {selected.location ? `Known location · ${selected.location}` : "Location not yet recorded"}</span><span><BookOpen size={13}/> {selected.recordedBy ? `Recorded by ${selected.recordedBy}` : "Crew journal"}</span><span>{selected.level === "partial" ? "DISCOVERY STATUS · INCOMPLETE" : "DISCOVERY STATUS · KNOWN"}</span></div>}
          </div>}
          {!selected && <div className="codex-quiet">Choose a page to read the crew's notes.</div>}
        </div>}
      </aside>
    </div>}
  </>;
}