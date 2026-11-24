import { AIR_LIMITS } from "./limits.mjs";
/** @param {number | null | undefined} aqi */
export function category(aqi) {
  if (typeof aqi !== "number" || !Number.isFinite(aqi) || aqi < 0) {
    return { label: "Unavailable", tone: "muted" };
  }
  return aqi <= 50
    ? { label: "Good", tone: "good" }
    : aqi <= 100
      ? { label: "Moderate", tone: "moderate" }
      : aqi <= 150
        ? { label: "Unhealthy for sensitive groups", tone: "warning" }
        : aqi <= 200
          ? { label: "Unhealthy", tone: "bad" }
          : aqi <= 300
            ? { label: "Very unhealthy", tone: "bad" }
            : { label: "Hazardous", tone: "bad" };
}

/** @param {import("./types.d.ts").AirSnapshot | null | undefined} air @param {number} [now] @returns {air is import("./types.d.ts").AirSnapshot} */
export function isCurrentAir(air, now = Date.now()) {
  if (
    !air ||
    air.stale ||
    !Number.isFinite(air.current?.us_aqi) ||
    air.current.us_aqi < 0 ||
    air.current.us_aqi > AIR_LIMITS.maxAqi
  ) {
    return false;
  }
  const modeledAt = Date.parse(air.modeledAt);
  return (
    Number.isFinite(modeledAt) &&
    now - modeledAt <= AIR_LIMITS.maxAgeMs &&
    modeledAt - now <= AIR_LIMITS.futureToleranceMs
  );
}
