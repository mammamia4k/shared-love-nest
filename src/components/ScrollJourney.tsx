import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ImageIcon, ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildJourneyItems, journeyPosition, type JourneyItem } from "@/lib/journey";

export function ScrollJourney() {
  const [memories, setMemories] = useState<JourneyItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<JourneyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const items = buildJourneyItems(memories);
  const position = journeyPosition(progress, items.length);
  const activeIndex = Math.round(position);
  const photos = memories.filter((item) => item.url);

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("memories")
          .select("id, title, body, memory_date, photo_path").order("memory_date", { ascending: true });
        if (error) throw error;
        const rows = data ?? [];
        const paths = rows.flatMap((row) => row.photo_path ? [row.photo_path] : []);
        const { data: signed, error: photoError } = paths.length
          ? await supabase.storage.from("photos").createSignedUrls(paths, 3600)
          : { data: [], error: null };
        if (photoError) throw photoError;
        const urls = new Map((signed ?? []).map((photo) => [photo.path, photo.signedUrl]));
        if (!disposed) setMemories(rows.map((row) => ({ ...row, url: row.photo_path ? urls.get(row.photo_path) : undefined })));
      } catch {
        if (!disposed) setFailed(true);
      } finally {
        if (!disposed) setLoading(false);
      }
    })();
    return () => { disposed = true; };
  }, []);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = trackRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        setProgress(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [items.length, loading]);

  function goTo(index: number) {
    const track = trackRef.current;
    if (!track) return;
    const top = track.getBoundingClientRect().top + window.scrollY;
    const fraction = Math.max(0, Math.min(items.length - 1, index)) / (items.length - 1);
    window.scrollTo({ top: top + fraction * (track.offsetHeight - window.innerHeight), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  }

  if (loading) return <p className="py-20 text-center text-muted-foreground">Anılar yükleniyor…</p>;

  return (
    <>
      {photos.length > 0 && (
        <div className="journey-photo-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <div className="journey-photo-mosaic grid h-full grid-cols-2 gap-5 p-5 md:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => {
              const photo = photos[(Math.floor(activeIndex / 3) + i) % photos.length];
              return <img key={`${i}-${photo.id}`} src={photo.url} alt="" className="h-full min-h-0 w-full rounded-lg object-cover" />;
            })}
          </div>
          <div className="absolute inset-0 bg-background/60" />
        </div>
      )}
      {failed && <p role="alert" className="relative py-4 text-center text-destructive">Anılar yüklenemedi. Lütfen tekrar deneyin.</p>}
      <div ref={trackRef} style={{ height: `${(items.length - 1) * 55 + 100}vh` }} className="relative z-10">
        <div className="journey-stage sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {items.map((memory, index) => {
            const distance = index - position;
            const visible = distance >= -0.65 && distance <= 3;
            const opacity = distance < 0 ? Math.max(0, 1 + distance / 0.65) : Math.max(0, 1 - distance / 3.5);
            return (
              <Button key={memory.id} variant="ghost" tabIndex={index === activeIndex ? 0 : -1}
                aria-label={memory.empty ? `Anı ${memory.slot} — aç` : `${memory.title} — aç`}
                onClick={() => setSelected(memory)}
                className="journey-card absolute block h-auto w-[82vw] max-w-lg overflow-hidden whitespace-normal rounded-lg border bg-card p-0 text-left font-normal text-card-foreground shadow-soft hover:bg-card"
                style={{ transform: `translate3d(${distance === 0 ? 0 : (index % 2 === 0 ? -1 : 1) * Math.min(Math.abs(distance) * 18, 28)}%, 0, ${-distance * 850}px) rotateY(${Math.min(Math.abs(distance), 1) * (index % 2 === 0 ? -5 : 5)}deg)`, opacity: visible ? opacity : 0, visibility: visible ? "visible" : "hidden", zIndex: items.length - index, pointerEvents: index === activeIndex ? "auto" : "none" }}>
                {memory.url ? <img src={memory.url} alt={memory.title} className="max-h-[42vh] w-full object-cover" draggable={false} /> : (
                  <div className="flex h-[27vh] min-h-40 items-center justify-center bg-muted/50">
                    <ImageIcon className="h-12 w-12 stroke-1 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-6 md:p-8">
                  <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 text-primary" />
                    {memory.memory_date ? new Date(`${memory.memory_date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : String(memory.slot).padStart(3, "0")}
                  </p>
                  <h3 className="mb-2 text-2xl md:text-3xl">{memory.empty ? `Anı ${memory.slot}` : memory.title}</h3>
                  {memory.body && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{memory.body}</p>}
                </div>
              </Button>
            );
          })}
          <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-4">
            <Button variant="outline" size="icon" aria-label="Önceki anı" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)}><ArrowUp className="h-4 w-4" /></Button>
            <span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">{activeIndex + 1} / {items.length}</span>
            <Button variant="outline" size="icon" aria-label="Sonraki anı" disabled={activeIndex === items.length - 1} onClick={() => goTo(activeIndex + 1)}><ArrowDown className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent aria-describedby={undefined} className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-lg bg-card p-0">
          {selected && <>
            {selected.url && <img src={selected.url} alt={selected.title} className="max-h-[55dvh] w-full object-contain" />}
            <div className="p-6 md:p-8">
              {selected.memory_date && <p className="mb-3 text-sm text-muted-foreground">{new Date(`${selected.memory_date}T12:00:00`).toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>}
              <DialogTitle className="pr-8 text-3xl">{selected.empty ? `Anı ${selected.slot}` : selected.title}</DialogTitle>
              {selected.empty ? <div className="min-h-48" /> : <p className="mt-5 whitespace-pre-wrap leading-relaxed">{selected.body}</p>}
            </div>
          </>}
        </DialogContent>
      </Dialog>
    </>
  );
}
