import { describe, expect, it } from "vitest";
import { buildJourneyItems, journeyPosition } from "@/lib/journey";

describe("Empty memory slots", () => {
  it("adds exactly 100 uniquely identified blank cards without inventing dates or photos", () => {
    const items = buildJourneyItems([]);
    expect(items).toHaveLength(100);
    expect(new Set(items.map((item) => item.id)).size).toBe(100);
    expect(items.every((item) => item.title === "" && item.body === "" && item.memory_date === "" && item.url === undefined)).toBe(true);
  });
  it("preserves existing memories alongside the 100 empty cards", () => {
    const memory = { id: "saved", title: "Bir anı", body: "Metin", memory_date: "2026-10-17" };
    expect(buildJourneyItems([memory])).toHaveLength(101);
    expect(buildJourneyItems([memory])[0]).toEqual(memory);
  });
  it("reaches the hundredth card at the end of the scroll", () => {
    expect(journeyPosition(0, 100)).toBe(0);
    expect(journeyPosition(1, 100)).toBe(99);
    expect(journeyPosition(0.5, 100)).toBe(49.5);
  });
});