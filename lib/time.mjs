export const CITY_TIMEZONES = {
  "New Delhi": "Asia/Kolkata",
  Mumbai: "Asia/Kolkata",
  Bengaluru: "Asia/Kolkata",
  Lucknow: "Asia/Kolkata",
  London: "Europe/London",
  Beijing: "Asia/Shanghai",
  Lahore: "Asia/Karachi",
  Kathmandu: "Asia/Kathmandu",
  "New York": "America/New_York",
};
export function localDay(city, now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: CITY_TIMEZONES[city] || "Asia/Kolkata",
  }).format(new Date(now));
}
/** Reject calendar overflow and impossible civil UTC offsets. */
export function parseProviderTime(time, offset = 0) {
  if (
    typeof time !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(time) ||
    !Number.isInteger(offset) ||
    Math.abs(offset) > 14 * 3600
  )
    return null;
  const value = Date.parse(time + "Z");
  if (
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 16) !== time
  )
    return null;
  return value - offset * 1000;
}
export function forecastPoints(air, now = Date.now()) {
  if (!Array.isArray(air?.hourly?.time) || !Array.isArray(air?.hourly?.us_aqi))
    return [];
  const seen = new Set();
  const points = air.hourly.time
    .map((time, i) => ({
      time,
      value: air.hourly.us_aqi[i],
      at: parseProviderTime(time, air.utcOffsetSeconds || 0),
    }))
    .filter(
      (p) =>
        p.at !== null &&
        p.at >= now &&
        p.at < now + 24 * 3600000 &&
        Number.isFinite(p.value) &&
        p.value >= 0 &&
        p.value <= 2000,
    )
    .sort((a, b) => a.at - b.at)
    .filter((p) => {
      if (seen.has(p.at)) return false;
      seen.add(p.at);
      return true;
    });
  let last = -Infinity;
  return points
    .filter((p) => {
      if (p.at - last < 3 * 3600000) return false;
      last = p.at;
      return true;
    })
    .slice(0, 8);
}
