import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resizeImage } from "@/lib/couple";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { LocationPicker } from "@/components/LocationPicker";
import { validCoordinates, type MemoryLocation } from "@/lib/location";

type Memory = {
  id: string; title: string; body: string; memory_date: string;
  author_email: string; photo_path: string | null; url?: string;
  location_name: string | null; latitude: number | null; longitude: number | null;
};

export function Memories() {
  const [items, setItems] = useState<Memory[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<MemoryLocation | null>(null);

  async function load() {
    const { data, error } = await supabase.from("memories").select("*").order("memory_date", { ascending: false });
    if (error) { toast.error(error.message); return; }
    const rows = (data ?? []) as Memory[];
    const paths = rows.flatMap((r) => r.photo_path ? [r.photo_path] : []);
    if (paths.length) {
      const { data: signed } = await supabase.storage.from("photos").createSignedUrls(paths, 3600);
      const map = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl] as const));
      rows.forEach((r) => r.photo_path && (r.url = map.get(r.photo_path) ?? ""));
    }
    setItems(rows);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      let photo_path: string | null = null;
      if (file) {
        const blob = await resizeImage(file);
        photo_path = `${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("photos").upload(photo_path, blob, { contentType: "image/jpeg" });
        if (error) throw error;
      }
      const { error } = await supabase.from("memories").insert({ title, body, memory_date: date, photo_path, ...(location ?? { location_name: null, latitude: null, longitude: null }) });
      if (error) throw error;
      setTitle(""); setBody(""); setFile(null); setLocation(null);
      toast.success("Anı kaydedildi ♥");
      load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  async function remove(m: Memory) {
    if (!confirm("Bu anıyı silmek istiyor musun?")) return;
    if (m.photo_path) await supabase.storage.from("photos").remove([m.photo_path]);
    await supabase.from("memories").delete().eq("id", m.id);
    load();
  }

  async function updateLocation(id: string, value: MemoryLocation | null) {
    const { error } = await supabase.from("memories").update(value ?? { location_name: null, latitude: null, longitude: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Konum kaydedildi");
    await load();
  }

  return (
    <div className="space-y-8">
      <form onSubmit={add} className="space-y-3 rounded-3xl border bg-card p-5 shadow-soft">
        <Input required placeholder="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Neler oldu?" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        <LocationPicker value={location} onChange={setLocation} />
        <div className="flex flex-wrap items-center gap-3">
          <Input type="date" className="w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <ImagePlus className="h-4 w-4" /> {file ? file.name : "Fotoğraf ekle"}
            <input type="file" accept="image/*" hidden onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <Button className="ml-auto" disabled={busy}>{busy ? "Kaydediliyor..." : "Kaydet"}</Button>
        </div>
      </form>

      <ol className="relative space-y-6 border-l-2 border-accent pl-6">
        {items.map((m) => (
          <li key={m.id} className="relative">
            <span className="absolute -left-[33px] top-2 h-4 w-4 rounded-full border-4 border-background bg-primary" />
            <article className="overflow-hidden rounded-3xl border bg-card shadow-soft">
              {m.url && <img src={m.url} alt={m.title} className="max-h-96 w-full object-cover" />}
              <div className="p-5">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h3 className="text-xl">{m.title}</h3>
                  <Button type="button" variant="ghost" size="icon" onClick={() => remove(m)} className="text-muted-foreground hover:text-destructive" aria-label="Sil">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mb-3 text-xs text-muted-foreground">
                  {new Date(m.memory_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })} · {m.author_email.split("@")[0]}
                </p>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <div className="mt-4"><LocationPicker value={m.location_name && validCoordinates(m.latitude, m.longitude) ? { location_name: m.location_name, latitude: Number(m.latitude), longitude: Number(m.longitude) } : null} onChange={(value) => updateLocation(m.id, value)} /></div>
              </div>
            </article>
          </li>
        ))}
        {!items.length && <p className="text-muted-foreground">İlk anınızı yazın ♥</p>}
      </ol>
    </div>
  );
}
