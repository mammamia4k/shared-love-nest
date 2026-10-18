import { describe, expect, it } from "vitest";
import { locationToPoint, pointToLocation, validCoordinates, memoryIndexById } from "@/lib/location";
describe("Memory locations", () => {
  it("accepts valid world coordinates and rejects missing or out of bounds coordinates", () => {
    expect(validCoordinates(41.0082, 28.9784)).toBe(true);
    expect(validCoordinates(0, 0)).toBe(true);
    expect(validCoordinates(91, 28)).toBe(false);
    expect(validCoordinates(41, -181)).toBe(false);
    expect(validCoordinates(null, null)).toBe(false);
  });
  it("round trips a memory location through the globe without swapping latitude and longitude", () => {
    const point = locationToPoint(41.0082, 28.9784, 2);
    const location = pointToLocation(...point);
    expect(location.latitude).toBeCloseTo(41.0082, 5);
    expect(location.longitude).toBeCloseTo(28.9784, 5);
  });
  it("finds the exact memory by its saved id rather than title or marker order", () => {
    const items = [{ id: "first" }, { id: "selected" }, { id: "empty-memory-1" }];
    expect(memoryIndexById(items, "selected")).toBe(1);
    expect(memoryIndexById(items, "deleted")).toBe(-1);
  });
});