const KEY = 'totoro.tasteProfile';

export function getTasteProfileConfirmed(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { confirmed?: boolean };
    return parsed.confirmed === true;
  } catch {
    return false;
  }
}

export function setTasteProfileConfirmed(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ confirmed: true }));
  } catch {
    // localStorage unavailable — no-op
  }
}
