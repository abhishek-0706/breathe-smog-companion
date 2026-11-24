import { createTurn } from "./conversation.mjs";
import { generateGemini } from "./providers/generate-gemini.mjs";
import { requestOpenAI } from "./providers/openai.mjs";
import { providerResponse } from "./provider-response.mjs";
/** @param {import("../lib/types.d.ts").ChatContext & {ai:import("../lib/types.d.ts").AiConfig}} options @returns {Promise<Response>} */
export async function generateChat({ ai, ...context }) {
  const turn = createTurn(context);
  const result =
    ai.provider === "gemini"
      ? await generateGemini(ai, turn)
      : await requestOpenAI(ai, turn);
  return providerResponse(result, ai);
}
