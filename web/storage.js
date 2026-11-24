/** Storage is optional: blocked/corrupt browser storage must not stop the app. */
/** @param {string} key @param {unknown} fallback @returns {unknown} */
export function readSaved(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : (JSON.parse(stored) ?? fallback);
  } catch {
    return fallback;
  }
}
/** @param {string} key @param {unknown} value @returns {boolean} */
export function writeSaved(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
/** @returns {boolean} */
export function clearSaved() {
  try {
    const keys = Array.from({ length: localStorage.length }, (_, i) =>
      localStorage.key(i),
    );
    for (const key of keys) {
      if (key?.startsWith("breathe-")) {
        localStorage.removeItem(key);
      }
    }
    return true;
  } catch {
    return false;
  }
}

/** Only valid unique selections may contribute to progress or commitment counts. */
/** @param {string} key @param {readonly string[]} allowed @returns {string[]} */
export function readSelections(key, allowed) {
  const values = readSaved(key, []);
  return Array.isArray(values)
    ? [...new Set(values.filter((value) => allowed.includes(value)))]
    : [];
}
