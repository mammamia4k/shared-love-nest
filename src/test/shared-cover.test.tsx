import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({ row: null as null | { id: string; photo_id: string | null; x: number; y: number; zoom: number }, fail: false, writes: [] as unknown[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  if (table !== "magazine_cover") throw new Error("Unexpected table");
  return {
    select: () => ({ eq: (_key: string, id: string) => ({ maybeSingle: async () => ({ data: store.row?.id === id ? store.row : null, error: null }) }) }),
    upsert: (row: typeof store.row) => ({ select: () => ({ single: async () => {
      if (store.fail) return { data: null, error: new Error("Offline") };
      store.row = row; store.writes.push(row);
      return { data: row, error: null };
    } }) }),
  };
} } }));

import { useSharedCover } from "@/hooks/use-shared-cover";
import { LEGACY_COVER_KEY, loadSharedCover, saveSharedCover } from "@/lib/cover-settings";

beforeEach(() => { store.row = null; store.fail = false; store.writes = []; localStorage.clear(); });

describe("Shared magazine cover", () => {
  it("saves the selected photo and exact crop in the common row readable by another account", async () => {
    const crop = { photoId: "photo-memory", x: 23, y: 72, zoom: 1.85 };
    await saveSharedCover(crop);
    expect(store.row).toEqual({ id: "shared", photo_id: "photo-memory", x: 23, y: 72, zoom: 1.85 });
    localStorage.clear();
    expect(await loadSharedCover()).toEqual(crop);
  });

  it("keeps old device settings as a draft until explicitly shared, without overwriting an existing shared cover", async () => {
    localStorage.setItem(LEGACY_COVER_KEY, JSON.stringify({ photoId: "old", x: 15, y: 85, zoom: 2 }));
    const first = renderHook(() => useSharedCover());
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    expect(first.result.current.settings).toEqual({ photoId: "old", x: 15, y: 85, zoom: 2 });
    expect(store.writes).toHaveLength(0);
    await act(async () => { await first.result.current.save(first.result.current.settings); });
    expect(localStorage.getItem(LEGACY_COVER_KEY)).toBeNull();
    first.unmount();
    localStorage.setItem(LEGACY_COVER_KEY, JSON.stringify({ photoId: "stale", x: 50, y: 50, zoom: 1 }));
    const second = renderHook(() => useSharedCover());
    await waitFor(() => expect(second.result.current.loading).toBe(false));
    expect(second.result.current.settings.photoId).toBe("old");
    second.unmount();
  });

  it("refreshes the other open account on focus after a shared save", async () => {
    const other = renderHook(() => useSharedCover());
    await waitFor(() => expect(other.result.current.loading).toBe(false));
    await saveSharedCover({ photoId: "new-photo", x: 20, y: 80, zoom: 2.25 });
    act(() => { window.dispatchEvent(new Event("focus")); });
    await waitFor(() => expect(other.result.current.settings).toEqual({ photoId: "new-photo", x: 20, y: 80, zoom: 2.25 }));
    other.unmount();
  });

  it("does not report a failed save as successful or discard the old device settings", async () => {
    localStorage.setItem(LEGACY_COVER_KEY, JSON.stringify({ photoId: "old", x: 50, y: 50, zoom: 1 }));
    const hook = renderHook(() => useSharedCover());
    await waitFor(() => expect(hook.result.current.loading).toBe(false));
    store.fail = true;
    let saved: boolean | undefined;
    await act(async () => { saved = await hook.result.current.save({ photoId: "new", x: 25, y: 75, zoom: 2 }); });
    expect(saved).toBe(false);
    expect(store.row).toBeNull();
    expect(hook.result.current.settings.photoId).toBe("old");
    expect(localStorage.getItem(LEGACY_COVER_KEY)).not.toBeNull();
    hook.unmount();
  });
});