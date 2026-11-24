export const ROUTINE_IDS = Object.freeze({
  MOVE: "move",
  ROOM: "room",
  COOK: "cook",
});
export const ACTION_IDS = Object.freeze(Object.values(ROUTINE_IDS));
import { normalizeProfile } from "./profile.mjs";
/** @param {import("./types.d.ts").HouseholdProfile} p @param {boolean} high */
function commuteRoutine(p, high) {
  return {
    id: ROUTINE_IDS.MOVE,
    icon: "train",
    time: "YOUR COMMUTE",
    title:
      p.commute === "Work from home"
        ? "Keep today a no-drive day"
        : p.commute === "Public transit"
          ? "Make essential transit trips easier"
          : "Consider an alternative to a solo drive",
    body:
      p.commute === "Work from home"
        ? high
          ? "Keep work remote where possible and choose indoor activity during poor or unknown air quality. Combine only essential errands."
          : "Keep work remote if it fits your day. Combine essential errands; adapt outdoor activity to symptoms and local advisories."
        : high
          ? "For essential trips, shorten outdoor waits and choose enclosed transport where practical. Skip outdoor workouts in severe smog."
          : p.commute === "Public transit"
            ? "Plan a convenient connection and avoid long waits beside busy roads. Follow local service and air-quality advisories."
            : "Consider public transit, a shared ride or combining errands. Walk away from heavy traffic only when conditions and your health allow.",
    impact:
      p.commute === "Public transit"
        ? "Transit can reduce per-passenger emissions compared with solo gasoline driving, depending on vehicle and occupancy. This app does not calculate net transit savings."
        : "Replacing planned gasoline driving with no driving avoids tailpipe emissions. The calculator shows a transparent scenario, not a measured saving.",
    tag: "Lower-emission options",
  };
}
/** @param {import("./types.d.ts").HouseholdProfile} p */
function indoorRoutine(p) {
  return {
    id: ROUTINE_IDS.ROOM,
    icon: "home",
    time: "AT HOME",
    title: p.purifier
      ? "Make one room your clean-air space"
      : "Start with a cleaner-air corner",
    body: p.purifier
      ? "Run a correctly sized, non-ozone-producing HEPA cleaner continuously. Size it for the room, keep airflow clear and follow its instructions. Close windows during high outdoor pollution only if safe."
      : "Skip incense, candles and smoking. Damp-dust surfaces. When outdoor particle pollution is high, close windows if safe; filtering helps further.",
    impact:
      "Reduces indoor particle sources and exposure. Actual improvement depends on room leakage, sources and filtration.",
    tag: p.purifier
      ? "Use your existing cleaner"
      : p.budget === "No-cost first"
        ? "Start without a purchase"
        : "Cleaner indoor air",
  };
}
const COOKING_ROUTINE = {
  id: ROUTINE_IDS.COOK,
  icon: "leaf",
  time: "THIS EVENING",
  title: "Cook a little cleaner tonight",
  body: "Choose steaming or boiling over frying. Use a kitchen exhaust fan that vents outdoors; avoid burning food and solid fuels indoors.",
  impact:
    "Less frying and smoke can reduce the particles generated in your kitchen.",
  tag: "Simple daily swap",
};
/** @param {unknown} profile @param {number | null} aqi @returns {import("./types.d.ts").Routine[]} */
export function routines(profile, aqi) {
  const p = normalizeProfile(profile);
  const high = typeof aqi !== "number" || !Number.isFinite(aqi) || aqi > 100;
  return [commuteRoutine(p, high), indoorRoutine(p), { ...COOKING_ROUTINE }];
}
