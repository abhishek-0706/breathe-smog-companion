import { isRecord } from "./validation.mjs";
export const RESPONSE_MODES = Object.freeze([
  "generative",
  "reference-guidance",
  "safety-guidance",
]);
/** Validate the response fields consumed by the browser. */
/** @param {unknown} value @returns {value is import("./types.d.ts").ChatDisplayReply} */
export function isChatReply(value) {
  return (
    isRecord(value) &&
    typeof value.answer === "string" &&
    value.answer.trim() !== "" &&
    typeof value.mode === "string" &&
    RESPONSE_MODES.includes(value.mode)
  );
}
