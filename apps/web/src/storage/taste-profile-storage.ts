const KEY = 'totoro.tasteProfile';

export function getTasteProfileConfirmed(): boolean {
  try {
    return localStorage.getItem(KEY) === 'true';
  } catch {
    return false;
  }
}

export function setTasteProfileConfirmed(): void {
  try {
    localStorage.setItem(KEY, 'true');
  } catch {
    // localStorage unavailable — no-op
  }
}
