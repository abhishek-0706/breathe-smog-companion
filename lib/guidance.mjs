/** Stable shared API. Domain implementations remain independent and testable. */
export { CITIES } from "./locations.mjs";
export { category, isCurrentAir } from "./air-quality.mjs";
export { normalizeProfile } from "./profile.mjs";
export { routines } from "./routines.mjs";
export { avoidedCarbon, scenarioDistance } from "./impact.mjs";
export { safetyReply } from "./safety.mjs";
export { referenceReply } from "./reference.mjs";
export { guidedReply } from "./guided-reply.mjs";
