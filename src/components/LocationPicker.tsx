import { lazy, Suspense, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { validCoordinates, type MemoryLocation } from "@/lib/location";

const MemoryGlobe = lazy(() => import("@/components/MemoryGlobe"));
export function LocationPicker({ value, onChange }: { value: MemoryLocation | null; onChange: (value: MemoryLocation | null) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const valid = name.trim().length > 0 && lat !== "" && lng !== "" && validCoordinates(Number(lat), Number(lng));
  return <div className="flex flex-wrap items-center gap-2">
    <Button type="button" variant="outline" onClick={() => { setName(value?.location_name ?? ""); setLat(value ? String(value.latitude) : ""); setLng(value ? String(value.longitude) : ""); setOpen(true); }}><MapPin className="h-4 w-4" />{value?.location_name || "Konum ekle"}</Button>
    {value && <Button type="button" variant="ghost" size="icon" aria-label="Konumu kaldır" onClick={() => onChange(null)}><X className="h-4 w-4" /></Button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[95dvh] max-w-3xl overflow-y-auto" aria-describedby={undefined}>
        <DialogTitle>Konum seç</DialogTitle>
        <ClientOnly fallback={<div className="globe-surface" />}><Suspense fallback={<div className="globe-surface" />}>
          <MemoryGlobe markers={lat !== "" && lng !== "" && validCoordinates(Number(lat), Number(lng)) ? [{ id: "picked", title: name || "Seçilen konum", latitude: Number(lat), longitude: Number(lng) }] : []}
            onPick={(latitude, longitude) => { setLat(latitude.toFixed(5)); setLng(longitude.toFixed(5)); }} />
        </Suspense></ClientOnly>
        <Input aria-label="Konum adı" placeholder="Konum adı" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">Enlem<Input aria-label="Enlem" type="number" min={-90} max={90} step="any" value={lat} onChange={(event) => setLat(event.target.value)} /></label>
          <label className="space-y-1 text-sm">Boylam<Input aria-label="Boylam" type="number" min={-180} max={180} step="any" value={lng} onChange={(event) => setLng(event.target.value)} /></label>
        </div>
        <Button type="button" disabled={!valid} onClick={() => { onChange({ location_name: name.trim(), latitude: Number(lat), longitude: Number(lng) }); setOpen(false); }}>Konumu seç</Button>
      </DialogContent>
    </Dialog>
  </div>;
}