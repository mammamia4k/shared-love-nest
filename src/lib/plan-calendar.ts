/**
 * Pure helpers for the plans calendar grid. Kept free of React so the month
 * layout rules (Monday-first weeks, 6 rows, day matching) stay testable.
 */

export type CalendarDay = {
  /** ISO date (yyyy-mm-dd) of this cell. */
  iso: string;
  /** Day of month (1-31). */
  day: number;
  /** True when the cell belongs to the displayed month. */
  inMonth: boolean;
  /** True when the cell is today. */
  isToday: boolean;
};

export const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"] as const;

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Builds a 6-week (42-cell) Monday-first grid covering the given month.
 * `today` is injectable so tests are deterministic.
 */
export function buildMonthGrid(year: number, month: number, today: Date = new Date()): CalendarDay[] {
  const todayIso = toISODate(today);
  const first = new Date(year, month, 1);
  // Monday-first offset: getDay() is 0 for Sunday.
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const cell = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    const iso = toISODate(cell);
    days.push({
      iso,
      day: cell.getDate(),
      inMonth: cell.getMonth() === month,
      isToday: iso === todayIso,
    });
  }
  return days;
}

/** "Kasım 2026" style label for the grid header. */
export function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

/** Groups plan ids by their ISO plan_date for quick lookup per cell. */
export function groupByDate<T extends { plan_date: string | null }>(plans: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const plan of plans) {
    if (!plan.plan_date) continue;
    const list = map.get(plan.plan_date) ?? [];
    list.push(plan);
    map.set(plan.plan_date, list);
  }
  return map;
}
