/** Supported coordinates and timezones share one authoritative registry. */
/** @type {Readonly<Record<string,{readonly coordinates:readonly [number,number],readonly timezone:string}>>} */
export const LOCATIONS = Object.freeze({
  "New Delhi": {
    coordinates: [28.6139, 77.209],
    timezone: "Asia/Kolkata",
  },
  Mumbai: {
    coordinates: [19.076, 72.8777],
    timezone: "Asia/Kolkata",
  },
  Bengaluru: {
    coordinates: [12.9716, 77.5946],
    timezone: "Asia/Kolkata",
  },
  Lucknow: {
    coordinates: [26.8467, 80.9462],
    timezone: "Asia/Kolkata",
  },
  London: {
    coordinates: [51.5074, -0.1278],
    timezone: "Europe/London",
  },
  Beijing: {
    coordinates: [39.9042, 116.4074],
    timezone: "Asia/Shanghai",
  },
  Lahore: {
    coordinates: [31.5204, 74.3587],
    timezone: "Asia/Karachi",
  },
  Kathmandu: {
    coordinates: [27.7172, 85.324],
    timezone: "Asia/Kathmandu",
  },
  "New York": {
    coordinates: [40.7128, -74.006],
    timezone: "America/New_York",
  },
});
export const CITIES = Object.freeze(
  Object.fromEntries(
    Object.entries(LOCATIONS).map(([name, place]) => [name, place.coordinates]),
  ),
);
export const CITY_TIMEZONES = Object.freeze(
  Object.fromEntries(
    Object.entries(LOCATIONS).map(([name, place]) => [name, place.timezone]),
  ),
);
