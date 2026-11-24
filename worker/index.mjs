import { CHAT_LIMITS } from "../lib/limits.mjs";
import { assets } from "./assets.mjs";
import { HEADERS } from "./config.mjs";
import { json, HttpError } from "./http.mjs";
import { aiConfig } from "./ai-config.mjs";
import { handleAir } from "./handlers/air.mjs";
import { handleChat } from "./handlers/chat.mjs";
/** @param {import("../lib/types.d.ts").RouteContext} context @returns {Response} */
function status({ env }) {
  const ai = aiConfig(env);
  return json({
    aiEnabled: Boolean(ai),
    provider: ai?.provider || null,
    model: ai?.model || null,
  });
}
/** @type {Readonly<Record<string,(context:import("../lib/types.d.ts").RouteContext)=>Response|Promise<Response>>>} */
const ROUTES = Object.freeze({
  "GET /api/status": status,
  "GET /api/air": handleAir,
  "POST /api/chat": handleChat,
});
/** @param {Request} request @param {string} path @returns {Response} */
function staticResponse(request, path) {
  if (!["GET", "HEAD"].includes(request.method)) {
    return json({ error: "Method not allowed." }, 405);
  }
  const asset = Object.hasOwn(assets, path) ? assets[path] : null;
  if (!asset) {
    return new Response("Not found", { status: 404, headers: HEADERS });
  }
  return new Response(request.method === "HEAD" ? null : asset.body, {
    headers: {
      ...HEADERS,
      "Content-Type": asset.type,
      "Cache-Control": "no-cache",
    },
  });
}
export default {
  /** @param {import("../lib/types.d.ts").PlatformRequest} request @param {import("../lib/types.d.ts").Environment} [env] @returns {Promise<Response>} */
  async fetch(request, env = {}) {
    const url = new URL(request.url),
      deadline = Date.now() + CHAT_LIMITS.requestTimeoutMs;
    try {
      const route = ROUTES[request.method + " " + url.pathname];
      if (route) {
        return await route({ request, url, env, deadline });
      }
      if (url.pathname.startsWith("/api/")) {
        return json({ error: "Endpoint or method not found." }, 404);
      }
      return staticResponse(request, url.pathname);
    } catch (error) {
      if (error instanceof HttpError) {
        return json({ error: error.message }, error.status);
      }
      return json(
        {
          error:
            "The service could not retrieve reliable data. Try again or check your local authority.",
        },
        502,
      );
    }
  },
};
