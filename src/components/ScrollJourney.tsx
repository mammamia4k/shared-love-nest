import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ImageIcon, ArrowLeft, ArrowRight, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildJourneyItems, journeyPosition, journeyCylinderPose, type JourneyItem } from "@/lib/journey";
import { validCoordinates, memoryIndexById } from "@/lib/location";

const MemoryGlobe = lazy(() => import("@/components/MemoryGlobe"));

export function ScrollJourney() {
  const [memories, setMemories] = useState<JourneyItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<JourneyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const items = buildJourneyItems(memories);
  const position = journeyPosition(progress, items.length);
  const activeIndex = Math.round(position);
  const photos = memories.filter((item) => item.url);
  const backgroundPhoto = items[activeIndex]?.url
    ? items[activeIndex]
    : photos[Math.min(activeIndex, photos.length - 1)];

  useEffect(() => {
    let disposed = false;
    (async () => {
      try {
        const { data, error } = await supabase.from("memories")
          .select("id, title, body, memory_date, photo_path, location_name, latitude, longitude").order("memory_date", { ascending: true }).order("id");
        if (error) throw error;
        const rows = data ?? [];
        const paths = rows.flatMap((row) => row.photo_path ? [row.photo_path] : []);
        const { data: signed, error: photoError } = paths.length
          ? await supabase.storage.from("photos").createSignedUrls(paths, 3600)
          : { data: [], error: null };
        if (photoError) throw photoError;
        const urls = new Map((signed ?? []).map((photo) => [photo.path, photo.signedUrl]));
        if (!disposed) setMemories(rows.map((row) => {
          const url = row.photo_path ? urls.get(row.photo_path) : null;
          return url ? { ...row, url } : { ...row };
        }));
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
    let target = 0;
    let current = 0;
    let lastTime = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animate = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000 || 0.016, 0.05);
      lastTime = time;
      current = reducedMotion ? target : current + (target - current) * (1 - Math.exp(-14 * dt));
      if (Math.abs(target - current) < 0.00001) current = target;
      setProgress(current);
      raf = current !== target ? requestAnimationFrame(animate) : 0;
    };
    const onScroll = () => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      target = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      if (!raf) { lastTime = performance.now(); raf = requestAnimationFrame(animate); }
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

  function goToMemory(id: string) {
    const index = memoryIndexById(items, id);
    const memory = items[index];
    if (index < 0 || !memory) return;
    setWorldOpen(false);
    // Wait until the dialog restores scrolling before moving the journey.
    window.setTimeout(() => { goTo(index); window.setTimeout(() => setSelected(memory), 900); }, 160);
  }

  const located = memories.filter((memory) => validCoordinates(memory.latitude, memory.longitude));

  if (loading) return <p className="py-20 text-center text-muted-foreground">Anılar yükleniyor…</p>;

  return (
    <>
      {backgroundPhoto?.url && (
        <div className="journey-photo-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <img key={backgroundPhoto.id} src={backgroundPhoto.url} alt="" className="journey-background-photo h-full w-full object-cover" />
          <div className="absolute inset-0 bg-background/45" />
        </div>
      )}
      {failed && <p role="alert" className="relative py-4 text-center text-destructive">Anılar yüklenemedi. Lütfen tekrar deneyin.</p>}
      <div ref={trackRef} style={{ height: `${(items.length - 1) * 55 + 100}vh` }} className="relative z-10">
        <div className="journey-stage sticky top-0 flex h-screen items-center justify-center overflow-hidden">
          {items.map((memory, index) => {
            const distance = index - position;
            const visible = Math.abs(distance) <= 10;
            const { angle, x, depth, rise } = journeyCylinderPose(distance);
            const opacity = 0.35 + 0.65 * (1 + depth / 2);
            return (
              <Button key={memory.id} variant="ghost" tabIndex={index === activeIndex ? 0 : -1}
                aria-label={memory.empty ? `Anı ${memory.slot} — aç` : `${memory.title} — aç`}
                onClick={() => setSelected(memory)}
                className="journey-card absolute block h-auto overflow-hidden whitespace-normal rounded-lg border bg-card p-0 text-left font-normal text-card-foreground hover:bg-card"
                style={{ transform: `translate3d(calc(${x} * var(--journey-cylinder-radius)), calc(${rise} * var(--journey-rise)), calc(${depth} * var(--journey-cylinder-radius))) rotateY(${angle}deg)`, opacity: visible ? opacity : 0, visibility: visible ? "visible" : "hidden", zIndex: Math.round(100 + depth * 30), pointerEvents: index === activeIndex ? "auto" : "none" }}>
                {memory.url ? <img src={memory.url} alt={memory.title} className="journey-card-photo w-full object-cover" draggable={false} /> : (
                  <div className="journey-card-photo flex min-h-40 items-center justify-center bg-muted/50">
                    <ImageIcon className="h-12 w-12 stroke-1 text-muted-foreground/40" />
                  </div>
                )}
                <div className="p-6 md:p-8">
                  <p className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <Heart className="h-3 w-3 text-primary" />
                    {memory.memory_date ? new Date(`${memory.memory_date}T12:00:00`).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) : String(memory.slot).padStart(3, "0")}
                  </p>
                  <h3 className="mb-2 text-2xl md:text-3xl">{memory.empty ? `Anı ${memory.slot}` : memory.title}</h3>
                  {memory.location_name && <p className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{memory.location_name}</p>}
                  {memory.body && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{memory.body}</p>}
                </div>
              </Button>
            );
          })}
          <div className="absolute bottom-8 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-4 rounded-full bg-background/90 px-3 py-2 backdrop-blur-md">
            <Button variant="ghost" size="icon" aria-label="Dünya haritasını aç" title="Dünya haritası" onClick={() => setWorldOpen(true)}><Globe className="h-5 w-5" /></Button>
            <Button variant="outline" size="icon" aria-label="Önceki anı" disabled={activeIndex === 0} onClick={() => goTo(activeIndex - 1)}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">{activeIndex + 1} / {items.length}</span>
            <Button variant="outline" size="icon" aria-label="Sonraki anı" disabled={activeIndex === items.length - 1} onClick={() => goTo(activeIndex + 1)}><ArrowRight className="h-4 w-4" /></Button>
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
              {selected.location_name && <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{selected.location_name}</p>}
              {selected.empty ? <div className="min-h-48" /> : <p className="mt-5 whitespace-pre-wrap leading-relaxed">{selected.body}</p>}
            </div>
          </>}
        </DialogContent>
      </Dialog>
      <Dialog open={worldOpen} onOpenChange={setWorldOpen}>
        <DialogContent className="max-h-[95dvh] max-w-5xl overflow-y-auto" aria-describedby={undefined}>
          <DialogTitle>Anıların dünyası</DialogTitle>
          <ClientOnly fallback={<div className="globe-surface" />}><Suspense fallback={<div className="globe-surface" />}>
            <MemoryGlobe markers={located.map((memory) => ({ id: memory.id, title: `${memory.title} · ${memory.location_name}`, latitude: Number(memory.latitude), longitude: Number(memory.longitude) }))} onMarker={goToMemory} />
          </Suspense></ClientOnly>
          <div className="flex flex-wrap gap-2">
            {located.map((memory) => <Button key={memory.id} variant="outline" onClick={() => goToMemory(memory.id)}><MapPin className="h-4 w-4" />{memory.title} · {memory.location_name}</Button>)}
            {!located.length && <p className="text-sm text-muted-foreground">Henüz konum eklenmiş bir anı yok.</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
