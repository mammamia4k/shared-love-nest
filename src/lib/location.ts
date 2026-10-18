export type MemoryLocation = { location_name: string; latitude: number; longitude: number };

export function validCoordinates(latitude: unknown, longitude: unknown): boolean {
  return typeof latitude === "number" && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function locationToPoint(latitude: number, longitude: number, radius = 1): [number, number, number] {
  const lat = latitude * Math.PI / 180;
  const lng = longitude * Math.PI / 180;
  return [radius * Math.cos(lat) * Math.cos(lng), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lng)];
}

export function pointToLocation(x: number, y: number, z: number) {
  const radius = Math.hypot(x, y, z);
  return { latitude: Math.asin(Math.max(-1, Math.min(1, y / radius))) * 180 / Math.PI, longitude: Math.atan2(-z, x) * 180 / Math.PI };
}

export function memoryIndexById(items: { id: string }[], id: string) {
  return items.findIndex((item) => item.id === id);
}