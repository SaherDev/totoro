const KEY = 'totoro.location';

export function getLocation(): { lat: number; lng: number } | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as { lat: number; lng: number };
  } catch {
    return null;
  }
}

export function setLocation(loc: { lat: number; lng: number } | null): void {
  try {
    if (loc === null) {
      localStorage.removeItem(KEY);
    } else {
      localStorage.setItem(KEY, JSON.stringify(loc));
    }
  } catch {
    // localStorage unavailable — no-op
  }
}
