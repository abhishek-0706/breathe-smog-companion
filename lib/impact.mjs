/** @param {number} km @param {number} [days] @returns {number} */
export function avoidedCarbon(km, days = 1) {
  if (!Number.isFinite(km) || !Number.isFinite(days) || km < 0 || days < 0) {
    throw new RangeError("Nonnegative finite values required");
  }
  const result = km * days * (0.4 / 1.609344);
  if (!Number.isFinite(result)) {
    throw new RangeError("Carbon scenario exceeds the supported numeric range");
  }
  return result;
}

/** @param {string} question @param {number} fallback @returns {number | null} */
export function scenarioDistance(question, fallback) {
  const match = question.match(
    /(?<![\w.,])([+-]?\s*(?:\d[\d,.]*|\.\d+)(?:e[+-]?\d+)?)\s*(km|kilomet(?:er|re)s?|miles?)\b/i,
  );
  if (!match) {
    return fallback;
  }
  const number = match[1].replace(/\s/g, "");
  if (
    !/^[+-]?(?:(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?|\.\d+)(?:e[+-]?\d+)?$/i.test(
      number,
    )
  ) {
    return null;
  }
  const value =
    Number(number.replaceAll(",", "")) *
    (/^mile/i.test(match[2]) ? 1.609344 : 1);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
