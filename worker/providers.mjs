import { system } from "./policy.mjs";
export function aiConfig(env) {
  const geminiKey = env.GEMINI_API_KEY || env.Gemini_Api_Key;
  if (geminiKey) {
    const candidate = env.GEMINI_MODEL || "gemini-flash-lite-latest";
    return {
      provider: "gemini",
      model: /^gemini-[A-Za-z0-9.-]{1,80}$/.test(candidate)
        ? candidate
        : "gemini-flash-lite-latest",
      key: geminiKey,
    };
  }
  if (env.OPENAI_API_KEY)
    return {
      provider: "openai",
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      key: env.OPENAI_API_KEY,
    };
  return null;
}
export async function providerFetch(
  url,
  options,
  maxAttempts = 2,
  deadline = Date.now() + 55000,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 1000)
        throw new DOMException("Request deadline reached", "TimeoutError");
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(Math.min(35000, remaining)),
      });
      if (
        attempt + 1 < maxAttempts &&
        [500, 502, 503, 504].includes(response.status)
      ) {
        await response.body?.cancel();
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      return response;
    } catch (error) {
      if (attempt + 1 === maxAttempts) throw error;
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}
export async function requestGemini(ai, context, previous, question, deadline) {
  let response,
    answer = "",
    modelVersion = null;
  try {
    if (ai.model.startsWith("gemini-4-")) {
      response = await providerFetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": ai.key,
            "Content-Type": "application/json",
            "Api-Revision": "2026-05-20",
          },
          body: JSON.stringify({
            model: ai.model,
            system_instruction:
              system + " Keep answers under 180 words. " + context,
            input: JSON.stringify({
              recentConversation: previous,
              question: question,
            }),
            generation_config: {
              max_output_tokens: 1200,
              thinking_level: "low",
            },
            store: false,
          }),
        },
        1,
        deadline,
      );
      if (response.ok) {
        const result = await response.json();
        if (result.status === "completed")
          answer = (result.steps || [])
            .filter((x) => x.type === "model_output")
            .flatMap((x) => x.content || [])
            .filter((x) => x.type === "text" && typeof x.text === "string")
            .map((x) => x.text)
            .join("\n");
      }
    } else {
      response = await providerFetch(
        "https://generativelanguage.googleapis.com/v1beta/models/" +
          encodeURIComponent(ai.model) +
          ":generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": ai.key,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                { text: system + " Keep answers under 180 words. " + context },
              ],
            },
            contents: [
              ...previous.map((x) => ({
                role: x.role === "assistant" ? "model" : "user",
                parts: [{ text: x.content }],
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
        },
        1,
        deadline,
      );
      if (response.ok) {
        const result = await response.json();
        if (
          typeof result.modelVersion === "string" &&
          /^[A-Za-z0-9._-]{1,100}$/.test(result.modelVersion)
        )
          modelVersion = result.modelVersion;
        const candidate = result.candidates?.[0];
        if (
          !result.promptFeedback?.blockReason &&
          candidate?.finishReason === "STOP" &&
          !candidate.safetyRatings?.some?.((rating) => rating?.blocked === true)
        )
          answer = (candidate.content?.parts || [])
            .filter((x) => x && !x.thought && typeof x.text === "string")
            .map((x) => x.text)
            .join("\n");
      }
    }
    return { response, answer, model: ai.model, modelVersion };
  } catch (error) {
    return {
      response: null,
      answer: "",
      model: ai.model,
      modelVersion: null,
      failure:
        ["TimeoutError", "AbortError"].includes(error.name) ||
        error.cause?.code === "UND_ERR_CONNECT_TIMEOUT"
          ? "timeout"
          : "connection",
    };
  }
}
export async function discoverGeminiFallback(ai, deadline) {
  try {
    const remaining = deadline - Date.now();
    if (remaining <= 1000) return { status: null, model: null };
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000",
      {
        headers: { "x-goog-api-key": ai.key, Accept: "application/json" },
        signal: AbortSignal.timeout(Math.min(4000, remaining)),
      },
    );
    if (!response.ok) return { status: response.status, model: null };
    const payload = await response.json();
    const available = new Set(
      (Array.isArray(payload.models) ? payload.models : [])
        .filter(
          (m) =>
            Array.isArray(m.supportedGenerationMethods) &&
            m.supportedGenerationMethods.includes("generateContent") &&
            typeof m.name === "string",
        )
        .map((m) => m.name.replace(/^models\//, "")),
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
