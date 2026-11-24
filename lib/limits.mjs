export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const CHAT_LIMITS = Object.freeze({
  questionChars: 1500,
  bodyBytes: 16000,
  bodyTimeoutMs: 10000,
  historyMessages: 8,
  historyMessageChars: 1600,
  answerChars: 12000,
  requestTimeoutMs: 55000,
  browserTimeoutMs: 60000,
  requestsPerMinute: 8,
});
export const AIR_LIMITS = Object.freeze({
  maxAqi: 2000,
  maxAgeMs: 3 * HOUR_MS,
  futureToleranceMs: HOUR_MS,
  fetchTimeoutMs: 15000,
  browserTimeoutMs: 22000,
  refreshIntervalMs: 5 * MINUTE_MS,
  cacheSeconds: 300,
  requestsPerMinute: 30,
  forecastSamples: 72,
});
export const RATE_LIMITS = Object.freeze({
  windowMs: MINUTE_MS,
  maxClients: 10000,
});
