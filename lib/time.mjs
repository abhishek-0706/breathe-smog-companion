import { AIR_LIMITS, HOUR_MS } from "./limits.mjs";
import { CITY_TIMEZONES } from "./locations.mjs";
export { CITY_TIMEZONES } from "./locations.mjs";

/** @param {string} city @param {number} [now] @returns {string} */
export function localDay(city, now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CITY_TIMEZONES[city] || "Asia/Kolkata",
  }).format(new Date(now));
}
/** Reject calendar overflow and impossible civil UTC offsets. */
/** @param {unknown} time @param {unknown} [offset] @returns {number | null} */
export function parseProviderTime(time, offset = 0) {
  if (
    typeof time !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(time) ||
    typeof offset !== "number" ||
    !Number.isInteger(offset) ||
    Math.abs(offset) > 14 * 3600
  ) {
    return null;
  }
  const value = Date.parse(time + "Z");
  if (
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 16) !== time
  ) {
    return null;
  }
  return value - offset * 1000;
}
/** @param {import("./types.d.ts").AirSnapshot | null} air @param {number} [now] @returns {import("./types.d.ts").ForecastPoint[]} */
export function forecastPoints(air, now = Date.now()) {
  if (
    !Array.isArray(air?.hourly?.time) ||
    !Array.isArray(air?.hourly?.us_aqi)
  ) {
    return [];
  }
  const seen = new Set();
  /** @type {import("./types.d.ts").ForecastPoint[]} */
  const candidates = [];
  for (const [index, time] of air.hourly.time.entries()) {
    const at = parseProviderTime(time, air.utcOffsetSeconds || 0);
    const value = air.hourly.us_aqi[index];
    if (at === null) {
      continue;
    }
    if (isUpcomingAqi(at, value, now)) {
      candidates.push({ time, value, at });
    }
  }
  const points = candidates
    .sort((a, b) => a.at - b.at)
    .filter((point) => {
      if (seen.has(point.at)) {
        return false;
      }
      seen.add(point.at);
      return true;
    });
  let last = -Infinity;
  return points
    .filter((point) => {
      if (point.at - last < 3 * HOUR_MS) {
        return false;
      }
      last = point.at;
      return true;
    })
    .slice(0, 8);
}

/** @param {number} at @param {number} value @param {number} now @returns {boolean} */
function isUpcomingAqi(at, value, now) {
  return (
    at >= now &&
    at < now + 24 * HOUR_MS &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= AIR_LIMITS.maxAqi
  );
}
