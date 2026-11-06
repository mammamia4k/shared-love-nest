import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Heart, ImageIcon, BookOpen, ArrowLeft, ArrowRight, Globe, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buildJourneyItems, pageFlip, type JourneyItem } from "@/lib/journey";
import { validCoordinates, memoryIndexById } from "@/lib/location";
import { WorldSheet } from "@/components/WorldSheet";

const MemoryGlobe = lazy(() => import("@/components/MemoryGlobe"));

/** Tracks a media query without hydration mismatch: starts false, syncs after mount. */
function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}

export function ScrollJourney() {
  const [memories, setMemories] = useState<JourneyItem[]>([]);
  const [page, setPage] = useState(0);
  const [flip, setFlip] = useState<{ from: number; to: number } | null>(null);
  const swipeX = useRef<number | null>(null);
  const [selected, setSelected] = useState<JourneyItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [worldOpen, setWorldOpen] = useState(false);
  const isLargeScreen = useMediaQuery("(min-width: 1024px)");
  const worldSheetOpen = worldOpen && !isLargeScreen;
  const items = buildJourneyItems(memories);
  const lastPage = items.length;
  const shownPage = flip ? flip.to : page;
  const activeIndex = Math.max(0, shownPage - 1);
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

  function turn(to: number) {
    if (flip || to < 0 || to > lastPage || to === page) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPage(to);
    else setFlip({ from: page, to });
  }
  const turnRef = useRef(turn);
  turnRef.current = turn;

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (document.querySelector("[role=dialog]")) return;
      if (event.key === "ArrowRight") turnRef.current(page + 1);
      if (event.key === "ArrowLeft") turnRef.current(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [page]);

  function goToMemory(id: string) {
    const index = memoryIndexById(items, id);
    const memory = items[index];
    if (index < 0 || !memory) return;
    setWorldOpen(false);
    // Wait until the dialog restores scrolling before moving the journey.
    window.setTimeout(() => { turnRef.current(index + 1); window.setTimeout(() => setSelected(memory), 1100); }, 160);
  }

  const located = useMemo(() => memories.filter((memory) => validCoordinates(memory.latitude, memory.longitude)), [memories]);
  const markers = useMemo(() => located.map((memory) => ({ id: memory.id, title: `${memory.title} · ${memory.location_name}`, latitude: Number(memory.latitude), longitude: Number(memory.longitude) })), [located]);
  // Follow the active card; empty or unlocated cards keep the last location seen before them.
  let focusItem: JourneyItem | undefined;
  for (let i = Math.min(activeIndex, items.length - 1); i >= 0; i--) {
    const item = items[i];
    if (item && validCoordinates(item.latitude, item.longitude)) { focusItem = item; break; }
  }
  focusItem ??= located[0];
  const focusLat = focusItem ? Number(focusItem.latitude) : null;
  const focusLng = focusItem ? Number(focusItem.longitude) : null;
  const focus = useMemo(() => focusLat !== null && focusLng !== null ? { latitude: focusLat, longitude: focusLng } : null, [focusLat, focusLng]);

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
      <div className={`journey-stage relative z-10 flex items-center justify-center${worldSheetOpen ? " journey-stage--world" : ""}`}>
          <div className="magazine relative"
            onPointerDown={(event) => { swipeX.current = event.clientX; }}
            onPointerUp={(event) => {
              const start = swipeX.current; swipeX.current = null;
              if (start === null || Math.abs(event.clientX - start) < 50) return;
              turn(event.clientX < start ? page + 1 : page - 1);
            }}>
            {(() => {
              const renderPage = (p: number) => p === 0
                ? <MagazineCover memories={memories} total={lastPage} onOpen={() => turn(1)} />
                : <MagazinePage item={items[p - 1]!} number={p} total={lastPage} onRead={setSelected} />;
              if (!flip) return <div className="magazine-sheet">{renderPage(page)}</div>;
              const { under, sheet, direction } = pageFlip(flip.from, flip.to);
              return <>
                <div className="magazine-sheet">{renderPage(under)}</div>
                <div key={`${flip.from}-${flip.to}`} className={`magazine-sheet magazine-turning magazine-turning--${direction}`}
                  onAnimationEnd={() => { setPage(flip.to); setFlip(null); }}>
                  <div className="magazine-face">{renderPage(sheet)}</div>
                  <div className="magazine-face magazine-face--back" />
                </div>
              </>;
            })()}
          </div>
          {isLargeScreen && (
            <div className="journey-globe absolute right-10 top-1/2 z-[150] -translate-y-1/2 overflow-hidden rounded-full border bg-background/30 shadow-soft backdrop-blur-sm">
              <ClientOnly fallback={null}><Suspense fallback={null}>
                <MemoryGlobe compact markers={markers} focus={focus} activeId={focusItem?.id ?? null} onMarker={goToMemory} />
              </Suspense></ClientOnly>
              {focusItem?.location_name && <p className="pointer-events-none absolute inset-x-0 bottom-[14%] mx-auto w-fit max-w-[80%] truncate rounded-full bg-background/85 px-3 py-1 text-center text-xs text-foreground"><MapPin className="mr-1 inline h-3 w-3 text-primary" />{focusItem.location_name}</p>}
            </div>
          )}
          <div className="absolute bottom-8 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-4 rounded-full bg-background/90 px-3 py-2 backdrop-blur-md">
            <Button variant={worldOpen ? "default" : "outline"} className="h-9 gap-1.5 rounded-full px-3" aria-label="Dünya haritası" aria-expanded={worldOpen} title="Dünya haritası" onClick={() => setWorldOpen((open) => !open)}>
              {worldOpen ? <X className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
              <span className="text-xs">Harita</span>
            </Button>
            <Button variant="outline" size="icon" aria-label="Önceki sayfa" disabled={shownPage === 0} onClick={() => turn(page - 1)}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">{shownPage === 0 ? "Kapak" : `${shownPage} / ${lastPage}`}</span>
            <Button variant="outline" size="icon" aria-label="Sonraki sayfa" disabled={shownPage === lastPage} onClick={() => turn(page + 1)}><ArrowRight className="h-4 w-4" /></Button>
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
      {worldOpen && (isLargeScreen ? (
        <Dialog open onOpenChange={(open) => { if (!open) setWorldOpen(false); }}>
          <DialogContent className="max-h-[95dvh] max-w-5xl overflow-y-auto" aria-describedby={undefined}>
            <DialogTitle>Anıların dünyası</DialogTitle>
            <ClientOnly fallback={<div className="globe-surface" />}><Suspense fallback={<div className="globe-surface" />}>
              <MemoryGlobe markers={markers} onMarker={goToMemory} />
            </Suspense></ClientOnly>
            <div className="flex flex-wrap gap-2">
              {located.map((memory) => <Button key={memory.id} variant="outline" onClick={() => goToMemory(memory.id)}><MapPin className="h-4 w-4" />{memory.title} · {memory.location_name}</Button>)}
              {!located.length && <p className="text-sm text-muted-foreground">Henüz konum eklenmiş bir anı yok.</p>}
            </div>
          </DialogContent>
        </Dialog>
      ) : (
        <WorldSheet onClose={() => setWorldOpen(false)}>
          <div className="min-h-0 flex-1">
            <ClientOnly fallback={<div className="h-full" />}><Suspense fallback={<div className="h-full" />}>
              <MemoryGlobe fit markers={markers} focus={focus} activeId={focusItem?.id ?? null} onMarker={goToMemory} />
            </Suspense></ClientOnly>
          </div>
          <div className="flex shrink-0 gap-2 overflow-x-auto border-t px-3 py-2">
            {located.length
              ? located.map((memory) => <Button key={memory.id} size="sm" variant="outline" className="shrink-0 text-xs" onClick={() => goToMemory(memory.id)}><MapPin className="h-4 w-4" />{memory.location_name}</Button>)
              : <p className="text-xs text-muted-foreground">Henüz konum eklenmiş bir anı yok.</p>}
          </div>
        </WorldSheet>
      ))}
    </>
  );
}
