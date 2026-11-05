import { useEffect, type ReactNode } from "react";
import { Globe, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = { onClose: () => void; children: ReactNode };

/**
 * Docked world panel for small screens. It is deliberately non-modal: it never
 * covers the card controls or the journey navigation, so the memory cards stay
 * usable while the map is open, and it closes with its own button or Escape.
 */
export function WorldSheet({ onClose, children }: Props) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <section
      aria-label="Anıların dünyası"
      className="journey-world-sheet fixed inset-x-3 z-[190] flex flex-col overflow-hidden rounded-3xl border bg-background/92 shadow-soft backdrop-blur-md"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <Globe className="h-4 w-4 text-primary" />
          Anıların dünyası
        </h3>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Dünya haritasını kapat" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
