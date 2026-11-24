import { assets } from "./assets.mjs";
import { normalizeProfile, guidedReply } from "../lib/guidance.mjs";
import { CITIES, HEADERS } from "./config.mjs";
import {
  json,
  rateAllowed,
  clientIdentity,
  readJsonBody,
  HttpError,
} from "./http.mjs";
import { aiConfig } from "./providers.mjs";
import { liveAir } from "./air.mjs";
import { generateChat } from "./chat.mjs";

export default {
  async fetch(request, env = {}) {
    const url = new URL(request.url),
      path = url.pathname,
      deadline = Date.now() + 55000;
    try {
      if (path === "/api/status" && request.method === "GET") {
        const ai = aiConfig(env);
        return json({
          aiEnabled: !!ai,
          provider: ai?.provider || null,
          model: ai?.model || null,
        });
      }
      if (path === "/api/air" && request.method === "GET") {
        const city = url.searchParams.get("city");
        if (!Object.hasOwn(CITIES, city))
          return json({ error: "Choose a supported city." }, 400);
        const who = clientIdentity(request, env);
        if (!rateAllowed("air:" + who, 30))
          return json(
            { error: "Too many refreshes. Try in one minute." },
            429,
            { "Retry-After": "60" },
          );
        // Cache only public model data for five minutes, never household data.
        const cacheKey = new Request(
          url.origin + "/api/air?city=" + encodeURIComponent(city),
        );
        const cache = globalThis.caches?.default;
        const hit = cache ? await cache.match(cacheKey) : null;
        if (hit) return hit;
        const data = await liveAir(city, env);
        const response = json(data, 200, {
          "Cache-Control": "public, max-age=300",
        });
        if (cache) await cache.put(cacheKey, response.clone());
        return response;
      }
      if (path === "/api/chat" && request.method === "POST") {
        if (request.headers.get("origin") !== url.origin)
          return json({ error: "Cross-origin requests are not allowed." }, 403);
        if (
          request.headers
            .get("content-type")
            ?.split(";")[0]
            .trim()
            .toLowerCase() !== "application/json"
        )
          return json({ error: "JSON is required." }, 415);
        const identity = clientIdentity(request, env);
        if (!rateAllowed("chat:" + identity, 8))
          return json(
            { error: "Please wait a minute before asking more questions." },
            429,
            { "Retry-After": "60" },
          );
        const input = await readJsonBody(request);
        if (
          !input ||
          typeof input.question !== "string" ||
          !input.question.trim() ||
          input.question.length > 1500
        )
          return json(
            { error: "Enter a question under 1,500 characters." },
            400,
          );
        const profile = normalizeProfile(input.profile);
        let aqi = null,
          airObservation = null;
        if (
          /chest pain|cannot breathe|can.t breathe|struggl.*breath|severe.*breath|blue lips|faint|unusually sleepy|dizz|generator|charcoal|overheat|too hot|very hot|medication|inhaler|dose|asthma attack/i.test(
            input.question,
          )
        )
          return json({
            answer: guidedReply(input.question, profile, aqi),
            mode: "safety-guidance",
          });
        if (
          /\b(asthma|copd|heart disease|lung disease|pregnan\w*)\b/i.test(
            input.question,
          )
        ) {
          let healthAqi = null;
          try {
            const air = await liveAir(profile.city, env);
            if (!air.stale) healthAqi = air.current.us_aqi;
          } catch {}
          const conditions = Number.isFinite(healthAqi)
            ? "The latest city-area modeled US AQI is " +
              Math.round(healthAqi) +
              ". "
            : "Current air conditions are unavailable; check an authoritative local source before outdoor decisions. ";
          const activity =
            !Number.isFinite(healthAqi) || healthAqi > 100
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
        const ai = aiConfig(env);
        if (!ai)
          return json(
            {
              error:
                "Generative AI is not configured. Use the clearly labeled guided mode.",
            },
            503,
          );
        try {
          const current = await liveAir(profile.city, env);
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
        return generateChat(ai, profile, aqi, input, deadline, airObservation);
      }
      if (path.startsWith("/api/"))
        return json({ error: "Endpoint or method not found." }, 404);
      if (!["GET", "HEAD"].includes(request.method))
        return json({ error: "Method not allowed." }, 405);
      const asset = Object.hasOwn(assets, path) ? assets[path] : null;
      if (!asset)
        return new Response("Not found", { status: 404, headers: HEADERS });
      return new Response(request.method === "HEAD" ? null : asset.body, {
        headers: {
          ...HEADERS,
          "Content-Type": asset.type,
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, error.status);
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
