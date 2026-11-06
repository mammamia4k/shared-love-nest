import { describe, expect, it } from "vitest";
import { buildMonthGrid, groupByDate, monthLabel, toISODate } from "@/lib/plan-calendar";

describe("buildMonthGrid", () => {
  // Fixed "today" so tests are deterministic.
  const today = new Date(2026, 10, 6); // 6 Kasım 2026

  it("always returns a 6-week (42-cell) grid", () => {
    expect(buildMonthGrid(2026, 10, today)).toHaveLength(42);
    expect(buildMonthGrid(2026, 1, today)).toHaveLength(42); // Şubat
  });

  it("starts weeks on Monday", () => {
    const grid = buildMonthGrid(2026, 10, today);
    // Kasım 2026 starts on a Sunday, so the first cell is Monday 26 Ekim.
    expect(grid.at(0)!.iso).toBe("2026-10-26");
    expect(grid.at(0)!.inMonth).toBe(false);
  });

  it("marks only the displayed month's days as inMonth", () => {
    const grid = buildMonthGrid(2026, 10, today);
    const inMonth = grid.filter((d) => d.inMonth);
    expect(inMonth).toHaveLength(30); // Kasım has 30 days
    expect(inMonth.at(0)!.day).toBe(1);
    expect(inMonth.at(29)!.day).toBe(30);
  });

  it("flags today exactly once", () => {
    const grid = buildMonthGrid(2026, 10, today);
    const todays = grid.filter((d) => d.isToday);
    expect(todays).toHaveLength(1);
    expect(todays.at(0)!.iso).toBe("2026-11-06");
  });
});

describe("groupByDate", () => {
  it("groups plans by ISO date and skips undated plans", () => {
    const plans = [
      { id: "a", plan_date: "2026-11-05" },
      { id: "b", plan_date: "2026-11-05" },
      { id: "c", plan_date: "2026-11-07" },
      { id: "d", plan_date: null },
    ];
    const map = groupByDate(plans);
    expect(map.get("2026-11-05")?.map((p) => p.id)).toEqual(["a", "b"]);
    expect(map.get("2026-11-07")?.map((p) => p.id)).toEqual(["c"]);
    expect(map.has("")).toBe(false);
    expect(map.size).toBe(2);
  });
});

describe("labels", () => {
  it("formats the month label in Turkish", () => {
    expect(monthLabel(2026, 10)).toBe("Kasım 2026");
  });

  it("pads ISO dates", () => {
    expect(toISODate(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
