/** Storage is optional: blocked/corrupt browser storage must not stop the app. */
export function readSaved(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
export function writeSaved(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
export function clearSaved() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    );
    for (const key of keys) {
      if (key?.startsWith("breathe-")) localStorage.removeItem(key);
    }
    return true;
  } catch {
    return false;
  }
}
