import { isRecord } from "../../lib/validation.mjs";
/** @param {unknown} model @returns {string | null} */
function modelName(model) {
  if (
    !isRecord(model) ||
    !Array.isArray(model.supportedGenerationMethods) ||
    !model.supportedGenerationMethods.includes("generateContent") ||
    typeof model.name !== "string"
  ) {
    return null;
  }
  return model.name.replace(/^models\//, "");
}
/** @param {import("../../lib/types.d.ts").AiConfig} ai @param {number} deadline @returns {Promise<import("../../lib/types.d.ts").ModelDiscovery>} */
export async function discoverGeminiFallback(ai, deadline) {
  try {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) {
      return { status: null, model: null };
    }
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
      {
        headers: { "x-goog-api-key": ai.key, Accept: "application/json" },
        signal: AbortSignal.timeout(Math.min(4000, remaining)),
      },
    );
    if (!response.ok) {
      return { status: response.status, model: null };
    }
    const payload = await response.json();
    /** @type {unknown[]} */
    const models = Array.isArray(payload.models) ? payload.models : [];
    const available = new Set(
      models.map(modelName).filter((name) => name !== null),
    );
    const textModels = [...available].filter(
      (id) =>
        /^gemini-[A-Za-z0-9.-]{1,80}$/.test(id) &&
        /flash/.test(id) &&
        !/(image|audio|tts|live|native)/.test(id),
    );
    const candidates = [
      "gemini-flash-lite-latest",
      "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite-preview",
      "gemini-flash-latest",
      "gemini-3.5-flash-lite",
      "gemini-3.8-flash",
      ...textModels
        .filter((id) => !/2\.0|2\.5/.test(id))
        .sort()
        .reverse(),
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.0-flash",
    ];
    return {
      status: 200,
      model:
        candidates.find((id) => id !== ai.model && available.has(id)) || null,
      availableTextModels: textModels.slice(0, 32),
      configuredModelListed: available.has(ai.model),
    };
  } catch {
    return { status: null, model: null };
  }
}
