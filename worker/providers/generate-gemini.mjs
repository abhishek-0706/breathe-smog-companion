import { requestGemini } from "./gemini.mjs";
import { discoverGeminiFallback } from "./discovery.mjs";
import { pause } from "./transport.mjs";
const TRANSIENT_STATUSES = new Set([500, 502, 503, 504]);
/** @param {import("../../lib/types.d.ts").ProviderAttempt} result @returns {boolean} */
function transient(result) {
  return !result.response || TRANSIENT_STATUSES.has(result.response.status);
}
/** @param {import("../../lib/types.d.ts").ProviderAttempt} result @returns {boolean} */
function needsDiscovery(result) {
  return transient(result) || result.response?.status === 404;
}
/** @param {number} deadline @param {number} reserve @returns {boolean} */
function hasBudget(deadline, reserve) {
  return Date.now() + reserve < deadline;
}
/** @param {import("../../lib/types.d.ts").AiConfig} ai @param {import("../../lib/types.d.ts").ProviderTurn} turn @returns {Promise<import("../../lib/types.d.ts").ProviderResult>} */
export async function generateGemini(ai, turn) {
  /** @type {string[]} */
  const attemptedModels = [];
  /** @param {string} model @param {number} [delay] @returns {Promise<import("../../lib/types.d.ts").ProviderAttempt>} */
  async function attempt(model, delay = 0) {
    if (delay) {
      await pause(delay);
    }
    const result = await requestGemini({ ...ai, model }, turn);
    attemptedModels.push(result.model);
    return result;
  }
  let result = await attempt(ai.model);
  /** @type {import("../../lib/types.d.ts").ModelDiscovery} */
  let discovery = { status: null, model: null };
  if (needsDiscovery(result)) {
    discovery = await discoverGeminiFallback(ai, turn.deadline);
    const model = discovery.model || (transient(result) ? ai.model : null);
    if (model && hasBudget(turn.deadline, 1000)) {
      await result.response?.body?.cancel();
      result = await attempt(model, 300);
      if (
        discovery.model &&
        hasBudget(turn.deadline, 2000) &&
        transient(result)
      ) {
        await result.response?.body?.cancel();
        result = await attempt(model, 1200);
      }
    }
  }
  return {
    ...result,
    attemptedModels,
    modelDiscoveryStatus: discovery.status,
    availableTextModels: discovery.availableTextModels || [],
    configuredModelListed: discovery.configuredModelListed ?? null,
  };
}
