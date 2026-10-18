export type JourneyItem = {
  id: string;
  title: string;
  body: string;
  memory_date: string;
  url?: string;
  empty?: boolean;
  slot?: number;
  location_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
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

export function journeyCylinderPose(distance: number) {
  const angle = -distance * 45;
  const radians = angle * Math.PI / 180;
  return {
    angle,
    x: Math.sin(radians),
    depth: Math.cos(radians) - 1,
    rise: distance,
  };
}