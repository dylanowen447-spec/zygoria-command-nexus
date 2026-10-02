import { useEffect, useMemo, useState } from "react";
import { BookOpen, Lock, X } from "lucide-react";
import type { ZoneId } from "@/lib/zones";

type Entry = { id: string; cat: "Crew" | "Creature" | "Old Earth Tech" | "Zone" | "Encounter"; title: string; note: string; hint: string };
type Log = { text: string; zone: ZoneId; done: boolean; results: string };

/** Spoiler-safe codex entries — only what the crew could know at the current story stage. */
const ENTRIES: Entry[] = [
  { id: "crew", cat: "Crew", title: "Oz, Brix & Lowkey", note: "The original three Zigs. Arrived in egg-shaped pods and built The Sanctuary from salvage.", hint: "" },
  { id: "pods", cat: "Old Earth Tech", title: "The Arrival Pods", note: "Three egg-shaped stasis pods — yellow, blue and red — resting just beyond the camp. Still faintly glowing.", hint: "" },
  { id: "sanctuary", cat: "Zone", title: "The Sanctuary", note: "Home base. Riverside Shack, Brix's Workshop, Lowkey's Lookout and the Crossroads.", hint: "" },
  { id: "waking", cat: "Encounter", title: "The World Stirs", note: "Lights flicker on and blue energy hums as the crew rebuild. Nobody knows why.", hint: "Rebuild or repair something." },
  { id: "salvage", cat: "Old Earth Tech", title: "Salvaged Old Earth Tech", note: "Cables, cells and dead machines pulled from the ruins. Some of it still wants to work.", hint: "Send the crew to salvage tech." },
  { id: "ruins", cat: "Zone", title: "Old Earth Ruins", note: "The dead city around the region. Scavenging ground — and full of questions.", hint: "Explore the ruins." },
  { id: "caves", cat: "Zone", title: "Survivor Caves", note: "Where the people left behind hide. They need food, water and safety.", hint: "Visit the caves." },
  { id: "survivors", cat: "Encounter", title: "The Survivors", note: "Humans hiding in caves, tunnels and ruins. Wary, but starting to trust the trio.", hint: "Help the survivors." },
  { id: "cronk", cat: "Zone", title: "Cronk's Swamp", note: "A crocodilian terror's territory, crawling with mutant rats. Survivors whisper about him.", hint: "Approach the swamp." },
  { id: "shelton", cat: "Zone", title: "Shelton's Camp", note: "A guarded work camp run by a turtle-like boss. Humans labour there under watch.", hint: "Scout the work camp." },
  { id: "moxi", cat: "Creature", title: "Moxi", note: "A small pink dragon with red wings and bright cyan eyes, hiding near The Sanctuary. Very much alive.", hint: "Something small is hiding in The Sanctuary…" },
];

const RULES: Record<string, (l: Log[], z: Set<ZoneId>) => boolean> = {
  waking: l => l.some(m => m.done && /repair|rebuild|fix|build|power|light|generator|wake|woke/i.test(m.text + m.results)),
  salvage: l => l.some(m => m.done && (m.zone === "ruins" || /salvage|tech|scrap|cell|machine/i.test(m.text))),
  ruins: (_, z) => z.has("ruins"),
  caves: (_, z) => z.has("caves"),
  survivors: l => l.some(m => m.done && (m.zone === "caves" || /survivor|human|people/i.test(m.text))),
  cronk: (_, z) => z.has("cronk"),
  shelton: (_, z) => z.has("shelton"),
  moxi: l => l.some(m => m.done && /moxi|dragon/i.test(m.text)),
};
const KEY = "zygoria-codex-v1";

export function FieldCodex({ logs, visited }: { logs: Log[]; visited: ZoneId[] }) {
  const [open, setOpen] = useState(false);
  const [found, setFound] = useState<string[]>(["crew", "pods", "sanctuary"]);
  const [fresh, setFresh] = useState(0);

  useEffect(() => { try { const s = JSON.parse(localStorage.getItem(KEY) ?? "[]"); if (Array.isArray(s)) setFound(f => [...new Set([...f, ...s])]); } catch { /* ignore */ } }, []);
  useEffect(() => {
    const z = new Set(visited);
    const add = Object.keys(RULES).filter(id => !found.includes(id) && RULES[id]!(logs, z));
    if (!add.length) return;
    const next = [...found, ...add];
    setFound(next); setFresh(n => n + add.length);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, [logs, visited, found]);

  const groups = useMemo(() => ["Crew", "Creature", "Old Earth Tech", "Zone", "Encounter"].map(c => ({ c, items: ENTRIES.filter(e => e.cat === c) })), []);

  return <>
    <button type="button" className="codex-toggle" onClick={() => { setOpen(true); setFresh(0); }} aria-label="Open field codex">
      <BookOpen size={14}/> FIELD CODEX <span className="codex-count">{found.length}/{ENTRIES.length}</span>{fresh > 0 && <span className="codex-new">+{fresh} NEW</span>}
    </button>
    {open && <div className="codex-backdrop" onClick={() => setOpen(false)}>
      <aside className="codex-drawer" role="dialog" aria-label="Field codex" onClick={e => e.stopPropagation()}>
        <div className="codex-head"><div><div className="codex-eyebrow">FIELD LOG · FIRST GENESIS</div><h2>Zygoria Codex</h2><p>{found.length} of {ENTRIES.length} catalogued as the crew explore.</p></div><button type="button" className="codex-close" onClick={() => setOpen(false)} aria-label="Close codex"><X size={16}/></button></div>
        <div className="codex-bar"><span style={{ width: `${(found.length / ENTRIES.length) * 100}%` }}/></div>
        {groups.map(g => <section key={g.c} className="codex-group"><h3>{g.c.toUpperCase()}</h3>
          {g.items.map(e => found.includes(e.id)
            ? <div key={e.id} className="codex-entry"><strong>{e.title}</strong><p>{e.note}</p></div>
            : <div key={e.id} className="codex-entry is-locked"><strong><Lock size={11}/> UNCATALOGUED</strong><p>{e.hint}</p></div>)}
        </section>)}
      </aside>
    </div>}
  </>;
}
