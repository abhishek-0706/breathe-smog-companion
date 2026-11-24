import { providerFetch } from "./transport.mjs";
import { isRecord } from "../../lib/validation.mjs";
import { system } from "../policy.mjs";
/** @param {import("../../lib/types.d.ts").AiConfig} ai @param {import("../../lib/types.d.ts").ProviderTurn} turn @returns {Promise<import("../../lib/types.d.ts").ProviderResult>} */
export async function requestOpenAI(
  ai,
  { context, previous, question, deadline },
) {
  let answer = "";
  const response = await providerFetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      signal: AbortSignal.timeout(25000),
      headers: {
        Authorization: "Bearer " + ai.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ai.model,
        instructions: system,
        input: [
          { role: "user", content: context },
          ...previous,
          { role: "user", content: question },
        ],
        max_output_tokens: 600,
        store: false,
      }),
    },
    2,
    deadline,
  );
  if (response.ok) {
    answer = readAnswer(await response.json());
  }
  return {
    response,
    answer,
    model: ai.model,
    modelVersion: null,
    attemptedModels: [],
    modelDiscoveryStatus: null,
    availableTextModels: [],
    configuredModelListed: null,
  };
}

/** @param {unknown} payload @returns {string} */
function readAnswer(payload) {
  if (
    !isRecord(payload) ||
    payload.status !== "completed" ||
    !Array.isArray(payload.output)
  ) {
    return "";
  }
  return payload.output
    .flatMap((message) =>
      isRecord(message) &&
      message.type === "message" &&
      Array.isArray(message.content)
        ? message.content
        : [],
    )
    .flatMap((part) =>
      isRecord(part) &&
      part.type === "output_text" &&
      typeof part.text === "string"
        ? [part.text]
        : [],
    )
    .join("\n");
}
