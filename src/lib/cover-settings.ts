import { supabase } from "@/integrations/supabase/client";

export type CoverSettings = { photoId: string | null; x: number; y: number; zoom: number };
export const DEFAULT_COVER: CoverSettings = { photoId: null, x: 50, y: 50, zoom: 1 };
export const LEGACY_COVER_KEY = "biz-cover-settings";

export async function loadSharedCover(): Promise<CoverSettings | null> {
  const { data, error } = await supabase.from("magazine_cover")
    .select("photo_id, x, y, zoom").eq("id", "shared").maybeSingle();
  if (error) throw error;
  return data ? { photoId: data.photo_id, x: data.x, y: data.y, zoom: data.zoom } : null;
}

export async function saveSharedCover(settings: CoverSettings): Promise<CoverSettings> {
  const { data, error } = await supabase.from("magazine_cover").upsert({
    id: "shared", photo_id: settings.photoId, x: settings.x, y: settings.y, zoom: settings.zoom,
  }, { onConflict: "id" }).select("photo_id, x, y, zoom").single();
  if (error) throw error;
  return { photoId: data.photo_id, x: data.x, y: data.y, zoom: data.zoom };
}

export function readLegacyCover(): CoverSettings | null {
  try {
    const raw = localStorage.getItem(LEGACY_COVER_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw);
    if (!value || (value.photoId !== null && typeof value.photoId !== "string") ||
      !Number.isFinite(value.x) || value.x < 0 || value.x > 100 ||
      !Number.isFinite(value.y) || value.y < 0 || value.y > 100 ||
      !Number.isFinite(value.zoom) || value.zoom < 1 || value.zoom > 3) return null;
    return { photoId: value.photoId, x: value.x, y: value.y, zoom: value.zoom };
  } catch { return null; }
}