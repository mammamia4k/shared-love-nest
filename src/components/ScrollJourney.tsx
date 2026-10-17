import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Heart, X } from "lucide-react";

type Item = {
  id: string;
  title: string;
  body: string;
  memory_date: string;
  url?: string;
};

const CARD_COUNT_SPACING = 0.55; // scroll progress between cards

export function ScrollJourney() {
  const [items, setItems] = useState<Item[]>([]);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<Item | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("memories")
        .select("id, title, body, memory_date, photo_path")
        .order("memory_date", { ascending: true });
      const rows = (data ?? []) as (Item & { photo_path: string | null })[];
      const paths = rows.filter((r) => r.photo_path).map((r) => r.photo_path!);
      if (paths.length) {
        const { data: signed } = await supabase.storage
          .from("photos")
          .createSignedUrls(paths, 3600);
        const map = new Map((signed ?? []).map((s) => [s.path ?? "", s.signedUrl] as const));
        rows.forEach((r) => r.photo_path && (r.url = map.get(r.photo_path) ?? ""));
      }
      setItems(rows);
    })();
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
        const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
        setProgress(p);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [items.length]);

  if (!items.length)
    return <p className="py-20 text-center text-muted-foreground">İlk anınızı ekleyin, yolculuk burada başlasın ♥</p>;

  const trackHeight = `${(items.length * CARD_COUNT_SPACING + 1.2) * 100}vh`;

  return (
    <div ref={trackRef} style={{ height: trackHeight }} className="relative">
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden" style={{ perspective: "1200px" }}>
        {/* soft glow backdrop */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "var(--gradient-romance)" }} />

        {items.map((m, i) => {
          // each card travels from far away (z negative) towards and past the camera
          const cardProgress = i * CARD_COUNT_SPACING;
          const local = (progress - cardProgress) / CARD_COUNT_SPACING; // 0 = far, 1 = at camera
          const z = (local - 0.55) * 1600; // px along z
          const opacity = z > 350 ? Math.max(0, 1 - (z - 350) / 250) : Math.min(1, (z + 1400) / 900);
          const side = i % 2 === 0 ? -1 : 1;
          const x = side * Math.min(18, 8 + i * 2); // percent offset
          const rot = side * -6;

          return (
            <article
              key={m.id}
              className="absolute w-[86vw] max-w-xl overflow-hidden rounded-3xl border bg-card shadow-soft will-change-transform"
              style={{
                transform: `translate3d(${x}%, 0, ${z}px) rotateY(${rot}deg)`,
                opacity,
                zIndex: Math.round(z + 2000),
                pointerEvents: opacity > 0.5 ? "auto" : "none",
              }}
            >
              {m.url && <img src={m.url} alt={m.title} className="max-h-[42vh] w-full object-cover" draggable={false} />}
              <div className="p-6">
                <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Heart className="h-3 w-3 fill-primary text-primary" />
                  {new Date(m.memory_date).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <h3 className="mb-2 text-2xl md:text-3xl">{m.title}</h3>
                {m.body && <p className="line-clamp-4 whitespace-pre-wrap text-sm text-muted-foreground">{m.body}</p>}
              </div>
            </article>
          );
        })}

        {/* progress hint */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs tracking-widest text-muted-foreground uppercase">
          Kaydırmaya devam et
        </div>
      </div>
    </div>
  );
}
