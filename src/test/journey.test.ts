import { describe, expect, it } from "vitest";
import { buildJourneyItems, journeyPosition, journeyCylinderPose } from "@/lib/journey";

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

describe("Cylindrical journey", () => {
  it("moves each card from left to right as scroll position advances", () => {
    expect(journeyCylinderPose(1).x).toBeLessThan(0);
    expect(journeyCylinderPose(0).x).toBeCloseTo(0);
    expect(journeyCylinderPose(-1).x).toBeGreaterThan(0);
  });
  it("covers a full 360 degree cylinder with the focused card at the front", () => {
    expect(journeyCylinderPose(-4).angle - journeyCylinderPose(4).angle).toBe(360);
    expect(journeyCylinderPose(0).depth).toBe(0);
    expect(journeyCylinderPose(4).depth).toBe(-2);
  });
});