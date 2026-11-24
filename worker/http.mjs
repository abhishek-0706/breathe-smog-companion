import { HEADERS } from "./config.mjs";
export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}
const counts = new Map();
export function rateAllowed(key, limit) {
  const now = Date.now(),
    entry = counts.get(key);
  if (counts.size > 10000) {
    for (const [k, v] of counts) if (v.until < now) counts.delete(k);
    if (counts.size > 10000) return false;
  }
  if (!entry || entry.until < now) {
    counts.set(key, { count: 1, until: now + 60000 });
    return true;
  }
  return ++entry.count <= limit;
}

/** Only trust client-address metadata supplied by the active hosting platform. */
export function clientIdentity(request, env = {}) {
  if (env.VERCEL === "1")
    return (
      "vercel:" +
      (
        request.headers.get("x-vercel-forwarded-for") ||
        request.headers.get("x-forwarded-for") ||
        "anonymous"
      )
        .split(",")[0]
        .trim()
        .slice(0, 80)
    );
  if (request.cf)
    return (
      "cloudflare:" +
      (request.headers.get("CF-Connecting-IP") || "anonymous").slice(0, 80)
    );
  return "anonymous";
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
export async function readJsonBody(
  request,
  { maxBytes = 16000, timeoutMs = 10000 } = {},
) {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Invalid JSON.");
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  let timer;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new HttpError(408, "Request body took too long."));
      cancel();
    }, timeoutMs);
  });
  const read = async () => {
    let total = 0,
      text = "";
    const decoder = new TextDecoder();
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        if (!(part.value instanceof Uint8Array))
          throw new HttpError(400, "Invalid request body.");
        total += part.value.byteLength;
        if (total > maxBytes) {
          cancel();
          throw new HttpError(413, "Request is too large.");
        }
        text += decoder.decode(part.value, { stream: true });
      }
      text += decoder.decode();
      try {
        return JSON.parse(text);
      } catch {
        throw new HttpError(400, "Invalid JSON.");
      }
    } finally {
      reader.releaseLock();
    }
  };
  try {
    return await Promise.race([read(), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
