import { CHAT_LIMITS } from "../lib/limits.mjs";
import { json } from "./http.mjs";
/** @param {import("../lib/types.d.ts").ProviderResult} result @param {import("../lib/types.d.ts").AiConfig} ai @returns {Promise<Response>} */
export async function providerResponse(result, ai) {
  const {
    response,
    answer,
    model,
    modelVersion,
    failure,
    attemptedModels,
    modelDiscoveryStatus,
    availableTextModels,
    configuredModelListed,
  } = result;
  if (!response) {
    return json(
      {
        error: "The AI connection could not complete. Please try again.",
        code:
          failure === "timeout"
            ? "AI_PROVIDER_TIMEOUT"
            : "AI_PROVIDER_CONNECTION_FAILURE",
        providerStatus: null,
        attemptedModels,
        modelDiscoveryStatus,
      },
      failure === "timeout" ? 504 : 502,
    );
  }
  if (!response.ok) {
    await response.body?.cancel().catch(() => {});
    const code =
      response.status === 401 || response.status === 403
        ? "AI_AUTHENTICATION_OR_ACCESS"
        : response.status === 429
          ? "AI_QUOTA_OR_RATE_LIMIT"
          : response.status === 404
            ? "AI_MODEL_UNAVAILABLE"
            : "AI_PROVIDER_UNAVAILABLE";
    return json(
      {
        error: "The AI provider is unavailable. Please try later.",
        code,
        providerStatus: response.status,
        attemptedModels,
        modelDiscoveryStatus,
        availableTextModels,
        configuredModelListed,
      },
      502,
    );
  }
  if (!answer.trim()) {
    return json(
      {
        error: "The AI provider returned no complete answer.",
        code: "AI_NO_COMPLETE_ANSWER",
      },
      502,
    );
  }
  return json({
    answer: answer.slice(0, CHAT_LIMITS.answerChars),
    mode: "generative",
    provider: ai.provider,
    model: model,
    modelVersion,
    fallbackUsed: model !== ai.model,
  });
}
