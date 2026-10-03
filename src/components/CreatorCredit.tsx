import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import cover from "@/assets/zygoria-book-one-cover.png.asset.json";

export function CreatorCredit() {
  return <Dialog>
    <DialogTrigger asChild>
      <button type="button" className="creator-badge" aria-label="Created by Dylan Owen, 2026. View the Book One cover">
        <span className="creator-badge-label">Created by</span>
        <span className="creator-badge-name">Dylan Owen</span>
        <span className="creator-badge-year">2026</span>
        <span className="creator-badge-cta">Book One ›</span>
      </button>
    </DialogTrigger>
    <DialogContent className="cover-dialog">
      <DialogTitle className="sr-only">Zygoria: First Genesis, Book One</DialogTitle>
      <DialogDescription className="sr-only">Book One cover by Dylan Owen</DialogDescription>
      <img className="cover-art" src={cover.url} alt="Zygoria: First Genesis Book One cover by Dylan Owen, showing Oz, Brix and Lowkey" />
      <p className="cover-caption">ZYGORIA · FIRST GENESIS · BOOK ONE <span>Created by Dylan Owen · 2026</span></p>
    </DialogContent>
  </Dialog>;
}
