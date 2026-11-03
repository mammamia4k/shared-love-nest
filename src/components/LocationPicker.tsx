import { lazy, Suspense, useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { MapPin, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { validCoordinates, type MemoryLocation } from "@/lib/location";

const MemoryGlobe = lazy(() => import("@/components/MemoryGlobe"));

type Place = { id: number; name: string; country?: string; admin1?: string; latitude: number; longitude: number };

export function LocationPicker({ value, onChange }: { value: MemoryLocation | null; onChange: (value: MemoryLocation | null) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [picked, setPicked] = useState<MemoryLocation | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 2 || query === picked?.location_name) { setResults([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=6&language=tr`, { signal: controller.signal });
        const json = await res.json();
        setResults(json.results ?? []);
      } catch { /* aborted or offline */ } finally { setSearching(false); }
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [query, open, picked]);

  function choose(place: Place) {
    const label = [place.name, place.country].filter(Boolean).join(", ");
    setPicked({ location_name: label, latitude: place.latitude, longitude: place.longitude });
    setQuery(label);
    setResults([]);
  }

  async function pickOnGlobe(latitude: number, longitude: number) {
    setPicked({ location_name: "Seçilen konum", latitude, longitude });
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&accept-language=tr&lat=${latitude}&lon=${longitude}`);
      const json = await res.json();
      const a = json.address ?? {};
      const city = a.city || a.town || a.province || a.state || a.village || a.county;
      const label = [city, a.country].filter(Boolean).join(", ") || "Seçilen konum";
      setPicked({ location_name: label, latitude, longitude });
      setQuery(label);
    } catch { setQuery("Seçilen konum"); }
  }

  const valid = picked !== null && validCoordinates(picked.latitude, picked.longitude) && query.trim().length > 0;
  return <div className="flex flex-wrap items-center gap-2">
    <Button type="button" variant="outline" onClick={() => { setPicked(value); setQuery(value?.location_name ?? ""); setOpen(true); }}><MapPin className="h-4 w-4" />{value?.location_name || "Konum ekle"}</Button>
    {value && <Button type="button" variant="ghost" size="icon" aria-label="Konumu kaldır" onClick={() => onChange(null)}><X className="h-4 w-4" /></Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[95dvh] max-w-3xl overflow-y-auto" aria-describedby={undefined}>
        <DialogTitle>Konum seç</DialogTitle>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Şehir ara" className="pl-9" placeholder="Şehir ara (ör. İstanbul, Paris)" value={query} onChange={(event) => setQuery(event.target.value)} />
          {(results.length > 0 || searching) && <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-soft">
            {searching && !results.length && <p className="p-3 text-sm text-muted-foreground">Aranıyor…</p>}
            {results.map((place) => <button key={place.id} type="button" onClick={() => choose(place)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
              <MapPin className="h-4 w-4 text-primary" /><span>{place.name}{place.country ? `, ${place.country}` : ""}</span>
              {place.admin1 && place.admin1 !== place.name && <span className="ml-auto text-xs text-muted-foreground">{place.admin1}</span>}
            </button>)}
          </div>}
        </div>
        <ClientOnly fallback={<div className="globe-surface" />}><Suspense fallback={<div className="globe-surface" />}>
          <MemoryGlobe markers={picked ? [{ id: "picked", title: picked.location_name, latitude: picked.latitude, longitude: picked.longitude }] : []}
            focus={picked} onPick={pickOnGlobe} />
        </Suspense></ClientOnly>
        <p className="text-xs text-muted-foreground">Şehri arayabilir ya da küre üzerinde bir yere dokunabilirsin.</p>
        <Button type="button" disabled={!valid} onClick={() => { if (picked) onChange({ ...picked, location_name: query.trim() }); setOpen(false); }}>Konumu seç</Button>
      </DialogContent>
    </Dialog>
  </div>;
}
