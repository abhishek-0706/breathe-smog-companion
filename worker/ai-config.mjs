/** @param {import("../lib/types.d.ts").Environment} env @returns {import("../lib/types.d.ts").AiConfig | null} */
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
  if (env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      model: env.OPENAI_MODEL || "gpt-4.1-mini",
      key: env.OPENAI_API_KEY,
    };
  }
  return null;
}
