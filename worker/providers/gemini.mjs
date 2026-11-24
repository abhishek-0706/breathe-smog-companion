import { system } from "../policy.mjs";
import { providerFetch } from "./transport.mjs";
import { isRecord } from "../../lib/validation.mjs";

/** @param {string} context @returns {string} */
function instruction(context) {
  return system + " Keep answers under 180 words. " + context;
}
/** @param {import("../../lib/types.d.ts").AiConfig} ai @param {import("../../lib/types.d.ts").ProviderTurn} turn @returns {RequestInit} */
function contentRequest(ai, { context, previous, question }) {
  return {
    method: "POST",
    headers: { "x-goog-api-key": ai.key, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruction(context) }] },
      contents: [
        ...previous.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        { role: "user", parts: [{ text: question }] },
      ],
      generationConfig: {
        maxOutputTokens: 1200,
        ...(ai.model.startsWith("gemini-2.5-flash")
          ? { thinkingConfig: { thinkingBudget: 0 } }
          : {}),
      },
    }),
  };
}
/** @param {import("../../lib/types.d.ts").AiConfig} ai @param {import("../../lib/types.d.ts").ProviderTurn} turn @returns {RequestInit} */
function interactionsRequest(ai, { context, previous, question }) {
  return {
    method: "POST",
    headers: {
      "x-goog-api-key": ai.key,
      "Content-Type": "application/json",
      "Api-Revision": "2026-05-20",
    },
    body: JSON.stringify({
      model: ai.model,
      system_instruction: instruction(context),
      input: JSON.stringify({ recentConversation: previous, question }),
      generation_config: { max_output_tokens: 1200, thinking_level: "low" },
      store: false,
    }),
  };
}
/** @param {unknown} part @returns {string | null} */
function readText(part) {
  return isRecord(part) && !part.thought && typeof part.text === "string"
    ? part.text
    : null;
}
/** @param {unknown} ratings @returns {boolean} */
function blocked(ratings) {
  return (
    Array.isArray(ratings) &&
    ratings.some((rating) => isRecord(rating) && rating.blocked === true)
  );
}
/** @param {unknown} payload @returns {{answer:string,modelVersion:string|null}} */
function contentAnswer(payload) {
  if (!isRecord(payload)) {
    return { answer: "", modelVersion: null };
  }
  const version = payload.modelVersion;
  const modelVersion =
    typeof version === "string" && /^[A-Za-z0-9._-]{1,100}$/.test(version)
      ? version
      : null;
  const candidate = Array.isArray(payload.candidates)
    ? payload.candidates[0]
    : null;
  const feedback = isRecord(payload.promptFeedback)
    ? payload.promptFeedback
    : null;
  if (
    !isRecord(candidate) ||
    feedback?.blockReason ||
    candidate.finishReason !== "STOP" ||
    blocked(candidate.safetyRatings)
  ) {
    return { answer: "", modelVersion };
  }
  const content = isRecord(candidate.content) ? candidate.content : null;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  return {
    answer: parts
      .map(readText)
      .filter((value) => value !== null)
      .join("\n"),
    modelVersion,
  };
}
/** @param {unknown} payload @returns {string} */
function interactionsAnswer(payload) {
  if (
    !isRecord(payload) ||
    payload.status !== "completed" ||
    !Array.isArray(payload.steps)
  ) {
    return "";
  }
  return payload.steps
    .flatMap((step) =>
      isRecord(step) &&
      step.type === "model_output" &&
      Array.isArray(step.content)
        ? step.content
        : [],
    )
    .flatMap((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("\n");
}
/** @param {unknown} error @returns {"timeout"|"connection"} */
function failureKind(error) {
  if (!isRecord(error) && !(error instanceof Error)) {
    return "connection";
  }
  const cause = isRecord(error.cause) ? error.cause : null;
  return ["TimeoutError", "AbortError"].includes(String(error.name)) ||
    cause?.code === "UND_ERR_CONNECT_TIMEOUT"
    ? "timeout"
    : "connection";
}
/** @param {import("../../lib/types.d.ts").AiConfig} ai @param {import("../../lib/types.d.ts").ProviderTurn} turn @returns {Promise<import("../../lib/types.d.ts").ProviderAttempt>} */
export async function requestGemini(ai, turn) {
  try {
    const interactions = ai.model.startsWith("gemini-4-");
    const endpoint = interactions
      ? "https://generativelanguage.googleapis.com/v1beta/interactions"
      : "https://generativelanguage.googleapis.com/v1beta/models/" +
        encodeURIComponent(ai.model) +
        ":generateContent";
    const response = await providerFetch(
      endpoint,
      interactions ? interactionsRequest(ai, turn) : contentRequest(ai, turn),
      1,
      turn.deadline,
    );
    let answer = "",
      modelVersion = null;
    if (response.ok) {
      const payload = await response.json();
      if (interactions) {
        answer = interactionsAnswer(payload);
      } else {
        ({ answer, modelVersion } = contentAnswer(payload));
      }
    }
    return { response, answer, model: ai.model, modelVersion };
  } catch (error) {
    return {
      response: null,
      answer: "",
      model: ai.model,
      modelVersion: null,
      failure: failureKind(error),
    };
  }
}
