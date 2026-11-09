import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_COVER, LEGACY_COVER_KEY, loadSharedCover, readLegacyCover, saveSharedCover, type CoverSettings } from "@/lib/cover-settings";

export function useSharedCover() {
  const [settings, setSettings] = useState<CoverSettings>(DEFAULT_COVER);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  const revision = useRef(0);
  const savePending = useRef(false);

  useEffect(() => {
    let disposed = false;
    let inFlight = false;
    const refresh = async () => {
      if (inFlight || savePending.current) return;
      inFlight = true;
      const version = revision.current;
      try {
        const shared = await loadSharedCover();
        if (disposed || version !== revision.current) return;
        const previous = shared ? null : readLegacyCover();
        setSettings(shared ?? previous ?? DEFAULT_COVER);
        setLegacy(Boolean(previous));
        setError(null);
      } catch {
        if (!disposed && version === revision.current) setError("Ortak kapak yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        inFlight = false;
        if (!disposed) setLoading(false);
      }
    };
    void refresh();
    const onFocus = () => { void refresh(); };
    const timer = window.setInterval(onFocus, 15000);
    window.addEventListener("focus", onFocus);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, []);

  const save = useCallback(async (next: CoverSettings) => {
    if (savePending.current) return false;
    savePending.current = true;
    revision.current += 1;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveSharedCover(next);
      setSettings(saved);
      setLegacy(false);
      try { localStorage.removeItem(LEGACY_COVER_KEY); } catch { /* Shared settings are already saved. */ }
      return true;
    } catch {
      setError("Kapak kaydedilemedi. Ayarlarınız korunuyor; tekrar deneyin.");
      return false;
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  }, []);

  return { settings, loading, saving, error, legacy, save };
}