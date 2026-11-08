import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Slider } from "@/components/ui/slider";
import { Heart, ImageIcon, BookOpen, SlidersHorizontal, ArrowLeft, ArrowRight, Globe, MapPin, X } from "lucide-react";
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
  const spread = isLargeScreen && page > 0 && (!flip || (flip.from > 0 && flip.to > 0));
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
      {shownPage > 0 && backgroundPhoto?.url && (
        <div className="journey-photo-backdrop pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
          <img key={backgroundPhoto.id} src={backgroundPhoto.url} alt="" className="journey-background-photo h-full w-full object-cover" />
          <div className="journey-photo-veil absolute inset-0" />
        </div>
      )}
      {failed && <p role="alert" className="relative py-4 text-center text-destructive">Anılar yüklenemedi. Lütfen tekrar deneyin.</p>}
      <div className={`journey-stage relative z-10 flex items-center justify-center${worldSheetOpen ? " journey-stage--world" : ""}`}>
          <div className={`magazine relative${spread ? " magazine--spread" : ""}`}
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
              if (spread) {
                const left = (p: number) => <SpreadPhoto item={items[p - 1]!} />;
                const right = (p: number, globe: boolean) => <SpreadInfo item={items[p - 1]!} number={p} total={lastPage} onRead={setSelected}
                  globe={globe ? <ClientOnly fallback={null}><Suspense fallback={null}><MemoryGlobe compact markers={markers} focus={focus} activeId={focusItem?.id ?? null} onMarker={goToMemory} /></Suspense></ClientOnly> : null} />;
                if (!flip) return <><div className="spread-half spread-half--left">{left(page)}</div><div className="spread-half spread-half--right">{right(page, true)}</div></>;
                const fwd = flip.to > flip.from;
                return <>
                  <div className="spread-half spread-half--left">{left(fwd ? flip.from : flip.to)}</div>
                  <div className="spread-half spread-half--right">{right(fwd ? flip.to : flip.from, false)}</div>
                  <div key={`${flip.from}-${flip.to}`} className={`spread-leaf magazine-turning--${fwd ? "forward" : "back"}`}
                    onAnimationEnd={() => { setPage(flip.to); setFlip(null); }}>
                    <div className="magazine-face spread-face">{right(fwd ? flip.from : flip.to, false)}</div>
                    <div className="magazine-face spread-face spread-face--back">{left(fwd ? flip.to : flip.from)}</div>
                  </div>
                </>;
              }
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
          {isLargeScreen && !spread && page > 0 && (
            <div className="journey-globe absolute right-10 top-1/2 z-[150] -translate-y-1/2 overflow-hidden rounded-full border bg-background/30 shadow-soft backdrop-blur-sm">
              <ClientOnly fallback={null}><Suspense fallback={null}>
                <MemoryGlobe compact markers={markers} focus={focus} activeId={focusItem?.id ?? null} onMarker={goToMemory} />
              </Suspense></ClientOnly>
              {focusItem?.location_name && <p className="pointer-events-none absolute inset-x-0 bottom-[14%] mx-auto w-fit max-w-[80%] truncate rounded-full bg-background/85 px-3 py-1 text-center text-xs text-foreground"><MapPin className="mr-1 inline h-3 w-3 text-primary" />{focusItem.location_name}</p>}
            </div>
          )}
          <div className="absolute bottom-3 left-1/2 z-[200] flex -translate-x-1/2 items-center gap-3 rounded-full bg-background/90 px-2 py-1 backdrop-blur-md">
            <Button variant={worldOpen ? "default" : "outline"} className="h-8 gap-1.5 rounded-full px-2.5" aria-label="Dünya haritası" aria-expanded={worldOpen} title="Dünya haritası" onClick={() => setWorldOpen((open) => !open)}>
              {worldOpen ? <X className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
              <span className="text-xs">Harita</span>
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Önceki sayfa" disabled={shownPage === 0} onClick={() => turn(page - 1)}><ArrowLeft className="h-4 w-4" /></Button>
            <span className="min-w-16 text-center text-xs tabular-nums text-muted-foreground">{shownPage === 0 ? "Kapak" : `${shownPage} / ${lastPage}`}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Sonraki sayfa" disabled={shownPage === lastPage} onClick={() => turn(page + 1)}><ArrowRight className="h-4 w-4" /></Button>
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

const formatDate = (date: string, long = false) => new Date(`${date}T12:00:00`).toLocaleDateString("tr-TR", long ? { day: "numeric", month: "long", year: "numeric" } : { month: "long", year: "numeric" });

type CoverSettings = { photoId: string | null; x: number; y: number; zoom: number };
const COVER_KEY = "biz-cover-settings";
const DEFAULT_COVER: CoverSettings = { photoId: null, x: 50, y: 50, zoom: 1 };

function MagazineCover({ memories, total, onOpen }: { memories: JourneyItem[]; total: number; onOpen: () => void }) {
  const [settings, setSettings] = useState<CoverSettings>(DEFAULT_COVER);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    try { const raw = localStorage.getItem(COVER_KEY); if (raw) setSettings({ ...DEFAULT_COVER, ...JSON.parse(raw) }); } catch { /* ignore */ }
  }, []);
  const update = (next: Partial<CoverSettings>) => setSettings((prev) => {
    const merged = { ...prev, ...next };
    try { localStorage.setItem(COVER_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
    return merged;
  });
  const withPhotos = memories.filter((memory) => memory.url);
  const cover = withPhotos.find((m) => m.id === settings.photoId) ?? withPhotos[0];
  const imgStyle = { objectPosition: `${settings.x}% ${settings.y}%`, transform: `scale(${settings.zoom})`, transformOrigin: `${settings.x}% ${settings.y}%` };
  const today = new Date().toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-secondary">
      {cover?.url && <img src={cover.url} alt={cover.title} style={imgStyle} className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      <div className="magazine-cover-shade absolute inset-0" />
      <div className="relative flex items-start justify-between px-6 pt-5 text-[10px] uppercase tracking-[0.3em] text-background md:px-8">
        <span>Sayı 01</span><span>{today}</span>
      </div>
      <h2 className="magazine-masthead relative px-5 text-background md:px-7">Biz</h2>
      <p className="relative px-6 text-xs uppercase tracking-[0.35em] text-background/90 md:px-8">Anılarımızın dergisi</p>
      <div className="relative mt-auto space-y-3 px-6 pb-6 text-background md:px-8 md:pb-8">
        {memories.slice(0, 3).map((memory, i) => (
          <p key={memory.id} className="magazine-cover-title max-w-[85%] border-l-2 border-primary pl-3 font-serif leading-tight">
            {memory.title}<span className="ml-2 font-sans text-[10px] tracking-widest text-background/80">S. {i + 1}</span>
          </p>
        ))}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onOpen} className="mt-2 rounded-full"><BookOpen className="h-4 w-4" />Okumaya başla · {total} sayfa</Button>
          {withPhotos.length > 0 && (
            <Button variant="secondary" onClick={() => setEditing(true)} className="mt-2 rounded-full"><SlidersHorizontal className="h-4 w-4" />Kapağı düzenle</Button>
          )}
        </div>
      </div>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogTitle>Kapak fotoğrafı</DialogTitle>
          <div className="grid grid-cols-4 gap-2">
            {withPhotos.map((m) => (
              <button key={m.id} type="button" onClick={() => update({ photoId: m.id, x: 50, y: 50, zoom: 1 })} aria-label={m.title}
                className={`aspect-square overflow-hidden rounded-md border-2 ${cover?.id === m.id ? "border-primary" : "border-transparent"}`}>
                <img src={m.url!} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
          {cover?.url && (
            <div className="mx-auto aspect-[0.72] w-40 overflow-hidden rounded-md bg-secondary">
              <img src={cover.url} alt="" style={imgStyle} className="h-full w-full object-cover" />
            </div>
          )}
          <div className="space-y-4">
            <label className="block space-y-2 text-sm">Yatay konum<Slider value={[settings.x]} min={0} max={100} step={1} onValueChange={([v]) => update({ x: v ?? 50 })} /></label>
            <label className="block space-y-2 text-sm">Dikey konum<Slider value={[settings.y]} min={0} max={100} step={1} onValueChange={([v]) => update({ y: v ?? 50 })} /></label>
            <label className="block space-y-2 text-sm">Yakınlaştırma<Slider value={[settings.zoom]} min={1} max={3} step={0.05} onValueChange={([v]) => update({ zoom: v ?? 1 })} /></label>
          </div>
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => update({ x: 50, y: 50, zoom: 1 })}>Sıfırla</Button>
            <Button onClick={() => setEditing(false)}>Tamam</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MagazinePage({ item, number, total, onRead }: { item: JourneyItem; number: number; total: number; onRead: (item: JourneyItem) => void }) {
  const title = item.empty ? `Anı ${item.slot}` : item.title;
  return (
    <article className="flex h-full flex-col bg-card px-5 pb-4 pt-4 text-card-foreground md:px-8 md:pt-6">
      <header className="flex justify-between border-b border-foreground/20 pb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <span>Biz · Anılar</span><span>{item.memory_date ? formatDate(item.memory_date) : "Yakında"}</span>
      </header>
      <div className="mt-4 h-[42%] shrink-0 overflow-hidden rounded-sm bg-muted/60">
        {item.url ? <img src={item.url} alt={item.title} className="h-full w-full object-cover" draggable={false} />
          : <div className="flex h-full items-center justify-center"><ImageIcon className="h-12 w-12 stroke-1 text-muted-foreground/40" /></div>}
      </div>
      <p className="mt-4 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-primary">
        <Heart className="h-3 w-3" />{item.memory_date ? formatDate(item.memory_date, true) : `Anı ${item.slot}`}
        {item.location_name && <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="h-3 w-3" />{item.location_name}</span>}
      </p>
      <h3 className="mt-2 text-3xl leading-none md:text-5xl">{title}</h3>
      <div className="magazine-body mt-4 min-h-0 flex-1 overflow-hidden text-sm leading-relaxed text-muted-foreground">
        {item.body ? <p className={`whitespace-pre-wrap${item.body.length > 120 ? " drop-cap" : ""}`}>{item.body}</p> : <p className="italic">Bu sayfa yeni bir anıyı bekliyor.</p>}
      </div>
      <footer className="mt-3 flex items-center justify-between border-t border-foreground/20 pt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
        <button type="button" className="underline-offset-4 hover:text-primary hover:underline" onClick={() => onRead(item)} aria-label={`${title} — aç`}>Devamını oku</button>
        <span className="tabular-nums">{number} / {total}</span>
      </footer>
    </article>
  );
}

function SpreadPhoto({ item }: { item: JourneyItem }) {
  return <div className="relative h-full overflow-hidden bg-muted">
    {item.url ? <img src={item.url} alt={item.title} className="h-full w-full object-cover" draggable={false} />
      : <div className="flex h-full items-center justify-center"><ImageIcon className="h-16 w-16 stroke-1 text-muted-foreground/40" /></div>}
    <div className="spread-gutter spread-gutter--left" />
  </div>;
}

function SpreadInfo({ item, number, total, onRead, globe }: { item: JourneyItem; number: number; total: number; onRead: (item: JourneyItem) => void; globe: ReactNode }) {
  const title = item.empty ? `Anı ${item.slot}` : item.title;
  return <article className="relative flex h-full flex-col bg-card px-8 pb-4 pt-6 text-card-foreground">
    <div className="spread-gutter spread-gutter--right" />
    <header className="flex justify-between border-b border-foreground/20 pb-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
      <span>Biz · Anılar</span><span>{item.memory_date ? formatDate(item.memory_date) : "Yakında"}</span>
    </header>
    <p className="mt-5 flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-primary"><Heart className="h-3 w-3" />{item.memory_date ? formatDate(item.memory_date, true) : `Anı ${item.slot}`}</p>
    <h3 className="mt-2 text-4xl leading-none">{title}</h3>
    <div className="mt-4 min-h-0 flex-1 overflow-hidden text-sm leading-relaxed text-muted-foreground">
      {item.body ? <p className={`whitespace-pre-wrap${item.body.length > 120 ? " drop-cap" : ""}`}>{item.body}</p> : <p className="italic">Bu sayfa yeni bir anıyı bekliyor.</p>}
    </div>
    <div className="mt-3 flex shrink-0 items-center gap-4">
      <div className="relative aspect-square w-36 shrink-0 overflow-hidden rounded-full border bg-background/40">{globe}</div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3 text-primary" />{item.location_name ?? "Konum eklenmemiş"}</p>
    </div>
    <footer className="mt-3 flex items-center justify-between border-t border-foreground/20 pt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
      <button type="button" className="hover:text-primary hover:underline" onClick={() => onRead(item)} aria-label={`${title} — aç`}>Devamını oku</button>
      <span className="tabular-nums">{number} / {total}</span>
    </footer>
  </article>;
}
