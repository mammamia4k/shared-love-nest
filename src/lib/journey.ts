export type JourneyItem = {
  id: string;
  title: string;
  body: string;
  memory_date: string;
  url?: string;
  empty?: boolean;
  slot?: number;
};

export function buildJourneyItems(memories: JourneyItem[]): JourneyItem[] {
  return [...memories, ...Array.from({ length: 100 }, (_, i) => ({
    id: `empty-memory-${i + 1}`,
    title: "",
    body: "",
    memory_date: "",
    empty: true,
    slot: i + 1,
  }))];
}

export function journeyPosition(progress: number, count: number) {
  return Math.min(1, Math.max(0, progress)) * Math.max(0, count - 1);
}