import { CITIES } from "../lib/locations.mjs";
import { AIR_LIMITS } from "../lib/limits.mjs";
import { parseProviderTime } from "../lib/time.mjs";
import { isRecord } from "../lib/validation.mjs";
/** @type {ReadonlyArray<"pm2_5" | "pm10" | "nitrogen_dioxide" | "ozone">} */
const POLLUTANT_FIELDS = ["pm2_5", "pm10", "nitrogen_dioxide", "ozone"];
/** @param {unknown} value @returns {value is number} */
function validAqi(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= AIR_LIMITS.maxAqi
  );
}
/** @param {unknown} raw */
function currentConditions(raw) {
  if (
    !isRecord(raw) ||
    !isRecord(raw.current) ||
    !validAqi(raw.current.us_aqi) ||
    typeof raw.current.time !== "string" ||
    typeof raw.timezone !== "string" ||
    typeof raw.utc_offset_seconds !== "number"
  ) {
    throw new Error("invalid provider response");
  }
  const modeledAt = parseProviderTime(raw.current.time, raw.utc_offset_seconds);
  if (modeledAt === null) {
    throw new Error("invalid provider timestamp");
  }
  /** @type {import("../lib/types.d.ts").AirCurrent} */
  const current = {
    time: raw.current.time,
    us_aqi: Math.round(raw.current.us_aqi),
    pm2_5: null,
    pm10: null,
    nitrogen_dioxide: null,
    ozone: null,
  };
  for (const key of POLLUTANT_FIELDS) {
    const value = raw.current[key];
    current[key] =
      typeof value === "number" && Number.isFinite(value) && value >= 0
        ? value
        : null;
  }
  return {
    current,
    modeledAt,
    timezone: raw.timezone.slice(0, 80),
    utcOffsetSeconds: raw.utc_offset_seconds,
  };
}
/** @param {unknown} raw @param {number} offset @returns {{time:string[],us_aqi:number[]}} */
function forecastValues(raw, offset) {
  /** @type {Map<string,number>} */
  const values = new Map();
  if (isRecord(raw) && Array.isArray(raw.time) && Array.isArray(raw.us_aqi)) {
    const times = raw.time,
      aqiValues = raw.us_aqi;
    times.slice(0, AIR_LIMITS.forecastSamples).forEach((time, index) => {
      const value = aqiValues[index];
      if (
        typeof time === "string" &&
        parseProviderTime(time, offset) !== null &&
        validAqi(value) &&
        !values.has(time)
      ) {
        values.set(time, Math.round(value));
      }
    });
  }
  /** @type {{time:string[],us_aqi:number[]}} */
  const hourly = { time: [], us_aqi: [] };
  for (const [time, value] of [...values].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    hourly.time.push(time);
    hourly.us_aqi.push(value);
  }
  return hourly;
}
/** @param {string} city @returns {Promise<import("../lib/types.d.ts").AirSnapshot>} */
export async function liveAir(city) {
  const [latitude, longitude] = CITIES[city];
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.search = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
    hourly: "us_aqi,pm2_5",
    forecast_days: "2",
    timezone: "auto",
  }).toString();
  const response = await fetch(url, {
    signal: AbortSignal.timeout(AIR_LIMITS.fetchTimeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error("provider unavailable");
  }
  const raw = await response.json();
  const data = currentConditions(raw);
  const age = Date.now() - data.modeledAt;
  return {
    current: data.current,
    hourly: forecastValues(raw.hourly, data.utcOffsetSeconds),
    stale: age > AIR_LIMITS.maxAgeMs || age < -AIR_LIMITS.futureToleranceMs,
    modeledAt: new Date(data.modeledAt).toISOString(),
    fetchedAt: new Date().toISOString(),
    timezone: data.timezone,
    utcOffsetSeconds: data.utcOffsetSeconds,
    place: "city-area estimate",
    source: "Open-Meteo / CAMS atmospheric models",
    latitude,
    longitude,
  };
}
