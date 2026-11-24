/** @param {number} milliseconds @returns {Promise<void>} */
export const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
/** @param {string | URL} url @param {RequestInit} options @param {number} [maxAttempts] @param {number} [deadline] @returns {Promise<Response>} */
export async function providerFetch(
  url,
  options,
  maxAttempts = 2,
  deadline = Date.now() + 55000,
) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const remaining = deadline - Date.now();
      if (remaining <= 1000) {
        throw new DOMException("Request deadline reached", "TimeoutError");
      }
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
      if (attempt + 1 === maxAttempts) {
        throw error;
      }
      await new Promise((r) => setTimeout(r, 300));
    }
  }
  throw new Error("Provider request attempts exhausted.");
}
