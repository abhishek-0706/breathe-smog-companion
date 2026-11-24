import { CITIES } from "./config.mjs";
import { parseProviderTime } from "../lib/time.mjs";
export async function liveAir(city, env) {
  const [latitude, longitude] = CITIES[city];
  const url = new URL("https://air-quality-api.open-meteo.com/v1/air-quality");
  url.search = new URLSearchParams({
    latitude,
    longitude,
    current: "us_aqi,pm2_5,pm10,nitrogen_dioxide,ozone",
    hourly: "us_aqi,pm2_5",
    forecast_days: "2",
    timezone: "auto",
  });
  const upstream = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { Accept: "application/json" },
  });
  if (!upstream.ok) throw new Error("provider unavailable");
  const raw = await upstream.json();
  if (
    !raw.current ||
    typeof raw.current.time !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(raw.current.time) ||
    !Number.isFinite(raw.current.us_aqi) ||
    raw.current.us_aqi < 0 ||
    raw.current.us_aqi > 2000 ||
    !Number.isFinite(raw.utc_offset_seconds) ||
    typeof raw.timezone !== "string"
  )
    throw new Error("invalid provider response");
  const modeledAt = parseProviderTime(raw.current.time, raw.utc_offset_seconds);
  if (modeledAt === null) throw new Error("invalid provider timestamp");
  const age = Date.now() - modeledAt;
  const stale = age > 3 * 3600000 || age < -3600000;
  const current = {
    time: raw.current.time,
    us_aqi: Math.round(raw.current.us_aqi),
  };
  for (const key of ["pm2_5", "pm10", "nitrogen_dioxide", "ozone"])
    current[key] =
      Number.isFinite(raw.current[key]) && raw.current[key] >= 0
        ? raw.current[key]
        : null;
  const hourly = { time: [], us_aqi: [] };
  const hourlyValues = new Map();
  if (Array.isArray(raw.hourly?.time) && Array.isArray(raw.hourly?.us_aqi)) {
    raw.hourly.time.slice(0, 72).forEach((time, i) => {
      const v = raw.hourly.us_aqi[i];
      if (
        typeof time === "string" &&
        parseProviderTime(time, raw.utc_offset_seconds) !== null &&
        Number.isFinite(v) &&
        v >= 0 &&
        v <= 2000
      ) {
        if (!hourlyValues.has(time)) hourlyValues.set(time, Math.round(v));
      }
    });
  }
  for (const [time, value] of [...hourlyValues].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    hourly.time.push(time);
    hourly.us_aqi.push(value);
  }
  return {
    current,
    hourly,
    stale,
    modeledAt: new Date(modeledAt).toISOString(),
    fetchedAt: new Date().toISOString(),
    timezone: raw.timezone.slice(0, 80),
    utcOffsetSeconds: raw.utc_offset_seconds,
    place: "city-area estimate",
    source: "Open-Meteo / CAMS atmospheric models",
    latitude,
    longitude,
  };
}
