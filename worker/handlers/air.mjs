import { AIR_LIMITS } from "../../lib/limits.mjs";
import { CITIES } from "../../lib/locations.mjs";
import { json, clientIdentity, rateAllowed } from "../http.mjs";
import { liveAir } from "../air.mjs";
/** @param {import("../../lib/types.d.ts").RouteContext} context @returns {Promise<Response>} */
export async function handleAir({ request, url, env }) {
  const city = url.searchParams.get("city");
  if (!city || !Object.hasOwn(CITIES, city)) {
    return json({ error: "Choose a supported city." }, 400);
  }
  const who = clientIdentity(request, env);
  if (!rateAllowed("air:" + who, AIR_LIMITS.requestsPerMinute)) {
    return json({ error: "Too many refreshes. Try in one minute." }, 429, {
      "Retry-After": "60",
    });
  }
  // Cache only public model data for five minutes, never household data.
  const cacheKey = new Request(
    url.origin + "/api/air?city=" + encodeURIComponent(city),
  );
  // Cloudflare adds a default cache to the standard CacheStorage surface.
  const storage = /** @type {CacheStorage & {default?:Cache} | undefined} */ (
    globalThis.caches
  );
  const cache = storage?.default;
  let hit = null;
  try {
    hit = cache ? await cache.match(cacheKey) : null;
  } catch {
    /* Caching is optional. */
  }
  if (hit) {
    return hit;
  }
  const data = await liveAir(city);
  const response = json(data, 200, {
    "Cache-Control": "public, max-age=" + AIR_LIMITS.cacheSeconds,
  });
  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      /* Return healthy provider data even if cache storage is unavailable. */
    }
  }
  return response;
}
