import type { SavedPlaceStub } from '@totoro/shared';

const KEY = 'totoro.savedPlaces';

export function getSavedPlaces(): SavedPlaceStub[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlaceStub[];
  } catch {
    return [];
  }
}

export function getSavedPlaceCount(): number {
  return getSavedPlaces().length;
}

export function setSavedPlaces(places: SavedPlaceStub[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(places));
  } catch {
    // localStorage unavailable — no-op
  }
}

export function appendSavedPlace(place: SavedPlaceStub): void {
  const places = getSavedPlaces();
  places.push(place);
  setSavedPlaces(places);
}
