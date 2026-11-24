import { CHAT_LIMITS } from "../../lib/limits.mjs";
import { isRecord } from "../../lib/validation.mjs";
import {
  normalizeProfile,
  safetyReply,
  referenceReply,
} from "../../lib/guidance.mjs";
import {
  json,
  clientIdentity,
  rateAllowed,
  readJsonBody,
  HttpError,
} from "../http.mjs";
import { aiConfig } from "../ai-config.mjs";
import { liveAir } from "../air.mjs";
import { generateChat } from "../chat.mjs";
/** @param {Request} request @param {URL} url @returns {Response | null} */
function guardHeaders(request, url) {
  if (request.headers.get("origin") !== url.origin) {
    return json({ error: "Cross-origin requests are not allowed." }, 403);
  }
  if (
    request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !==
    "application/json"
  ) {
    return json({ error: "JSON is required." }, 415);
  }
  return null;
}
/** @param {Request} request @returns {Promise<import("../../lib/types.d.ts").ChatInput>} */
async function readInput(request) {
  const input = await readJsonBody(request);
  if (
    !isRecord(input) ||
    typeof input.question !== "string" ||
    !input.question.trim() ||
    input.question.length > CHAT_LIMITS.questionChars
  ) {
    throw new HttpError(400, "Enter a question under 1,500 characters.");
  }
  return {
    question: input.question,
    profile: input.profile,
    history: input.history,
  };
}
/** @param {import("../../lib/types.d.ts").HouseholdProfile} profile @returns {Promise<Response>} */
async function healthResponse(profile) {
  let healthAqi = null;
  try {
    const air = await liveAir(profile.city);
    if (!air.stale) {
      healthAqi = air.current.us_aqi;
    }
  } catch {
    /* Curated health guidance remains available without live data. */
  }
  const conditions =
    healthAqi !== null && Number.isFinite(healthAqi)
      ? "The latest city-area modeled US AQI is " + Math.round(healthAqi) + ". "
      : "Current air conditions are unavailable; check an authoritative local source before outdoor decisions. ";
  const activity =
    healthAqi === null || !Number.isFinite(healthAqi) || healthAqi > 100
      ? "Reduce prolonged or strenuous outdoor activity and choose a cleaner indoor alternative. "
      : "Adapt activity to individual symptoms, local advisories and your clinician-provided plan. ";
  return json({
    answer:
      conditions +
      "Children and people with asthma or heart/lung conditions can be more sensitive to pollution. " +
      activity +
      "Follow the established asthma action plan or other clinician-provided care plan. Do not change medication doses based on this app. If symptoms worsen, seek medical advice; severe breathing difficulty, chest pain, blue lips or fainting need emergency medical help. Source: https://www.airnow.gov/publications/air-quality-index/air-quality-guide-for-particle-pollution/",
    mode: "safety-guidance",
    basis: "curated-public-health",
  });
}
/** @param {import("../../lib/types.d.ts").RouteContext} context @returns {Promise<Response>} */
export async function handleChat({ request, url, env, deadline }) {
  const rejected = guardHeaders(request, url);
  if (rejected) {
    return rejected;
  }
  const identity = clientIdentity(request, env);
  if (!rateAllowed("chat:" + identity, CHAT_LIMITS.requestsPerMinute)) {
    return json(
      { error: "Please wait a minute before asking more questions." },
      429,
      { "Retry-After": "60" },
    );
  }
  const input = await readInput(request);
  const profile = normalizeProfile(input.profile);
  const urgent = safetyReply(input.question);
  if (urgent) {
    return json({
      answer: urgent,
      mode: "safety-guidance",
      basis: "curated-public-health",
    });
  }
  const reference = referenceReply(input.question);
  if (reference) {
    return json({
      answer: reference,
      mode: "reference-guidance",
      basis: "curated-public-health",
    });
  }
  if (
    /\b(asthma|copd|heart disease|lung disease|pregnan\w*)\b/i.test(
      input.question,
    )
  ) {
    return healthResponse(profile);
  }
  let aqi;
  /** @type {import("../../lib/types.d.ts").AirObservation | null} */
  let airObservation = null;
  const ai = aiConfig(env);
  if (!ai) {
    return json(
      {
        error:
          "Generative AI is not configured. Use the clearly labeled guided mode.",
      },
      503,
    );
  }
  try {
    const current = await liveAir(profile.city);
    aqi = current.stale ? null : current.current.us_aqi;
    airObservation = {
      kind: "city-area outdoor model estimate, not an indoor or doorstep sensor",
      source: current.source,
      modeledAt: current.modeledAt,
      timezone: current.timezone,
      stale: current.stale,
    };
  } catch {
    aqi = null;
  }
  return generateChat({ ai, profile, aqi, input, deadline, airObservation });
}
