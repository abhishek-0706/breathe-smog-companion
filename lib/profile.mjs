import { isRecord } from "./validation.mjs";
import { CITIES } from "./locations.mjs";
/** @param {unknown} p @returns {import("./types.d.ts").HouseholdProfile} */
export function normalizeProfile(p = {}) {
  const input = isRecord(p) ? p : {};
  const cities = Object.keys(CITIES);
  const distance =
    typeof input.distance === "number" ||
    (typeof input.distance === "string" && input.distance.trim() !== "")
      ? Number(input.distance)
      : NaN;
  return {
    city:
      typeof input.city === "string" && cities.includes(input.city)
        ? input.city
        : "New Delhi",
    sensitive: input.sensitive === true,
    commute:
      input.commute === "Public transit" || input.commute === "Work from home"
        ? input.commute
        : "Car",
    distance: Number.isFinite(distance)
      ? Math.min(100, Math.max(0, distance))
      : 12,
    budget: input.budget === "Flexible" ? "Flexible" : "No-cost first",
    purifier: input.purifier === true,
  };
}
