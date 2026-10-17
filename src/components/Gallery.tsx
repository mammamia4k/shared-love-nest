import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function Gallery() {
  const [photos, setPhotos] = useState<{ url: string; title: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("memories").select("title, photo_path").not("photo_path", "is", null).order("memory_date", { ascending: false });
      const rows = data ?? [];
      if (!rows.length) return;
      const { data: signed } = await supabase.storage.from("photos").createSignedUrls(rows.map((r) => r.photo_path!), 3600);
      setPhotos(rows.map((r, i) => ({ title: r.title, url: signed?.[i]?.signedUrl ?? "" })).filter((p) => p.url));
    })();
  }, []);

  if (!photos.length) return <p className="text-muted-foreground">Anılara fotoğraf ekledikçe burada görünecek.</p>;

  return (
    <div className="columns-2 gap-3 md:columns-3">
      {photos.map((p) => (
        <a key={p.url} href={p.url} target="_blank" rel="noreferrer" className="mb-3 block overflow-hidden rounded-2xl shadow-soft">
          <img src={p.url} alt={p.title} className="w-full" />
        </a>
      ))}
    </div>
  );
}
