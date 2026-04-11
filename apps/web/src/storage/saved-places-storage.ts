const KEY = 'totoro.savedCount';

export function getSavedPlaceCount(): number {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
  } catch {
    return 0;
  }
}

export function setSavedPlaceCount(count: number): void {
  try {
    localStorage.setItem(KEY, String(count));
  } catch {
    // localStorage unavailable — no-op
  }
}

export function incrementSavedPlaceCount(): void {
  setSavedPlaceCount(getSavedPlaceCount() + 1);
}
