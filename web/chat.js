import { ui, requiredElement } from "./dom.js";
import { guidedReply } from "../lib/guidance.mjs";
import { CHAT_LIMITS } from "../lib/limits.mjs";
import { isChatReply } from "../lib/chat-contract.mjs";
import { isRecord } from "../lib/validation.mjs";

/** Owns one tab's conversation, cancellation and provider connection state. */
export class ChatController {
  #getContext;
  /** @type {import("../lib/types.d.ts").ChatMessage[]} */
  #history = [];
  #conversationId = 0;
  /** @type {AbortController | null} */
  #controller = null;
  #connection = { enabled: false, provider: "" };
  #greeting = requiredElement("#chat-log > .message", HTMLElement).cloneNode(
    true,
  );

  /** @param {()=>{profile:import("../lib/types.d.ts").HouseholdProfile,aqi:number|null}} getContext */
  constructor(getContext) {
    this.#getContext = getContext;
  }
  get connection() {
    return { ...this.#connection };
  }
  #connectionLabel() {
    return this.#connection.enabled
      ? "Generative AI - " + this.#connection.provider
      : "Guided mode - curated guidance";
  }
  /** @param {boolean} busy */
  #setBusy(busy) {
    ui.send.disabled = busy;
    ui.chatLog.setAttribute("aria-busy", String(busy));
  }

  reset() {
    this.#conversationId++;
    this.#controller?.abort();
    this.#controller = null;
    this.#history = [];
    ui.chatLog.replaceChildren(this.#greeting.cloneNode(true));
    this.#setBusy(false);
    ui.question.value = "";
    ui.assistantMode.textContent = this.#connectionLabel();
  }

  async connect() {
    try {
      const response = await fetch("/api/status");
      if (!response.ok) {
        throw new Error("Status unavailable");
      }
      const data = await response.json();
      if (!isRecord(data)) {
        throw new Error("Invalid status response");
      }
      this.#connection = {
        enabled:
          data.aiEnabled === true &&
          (data.provider === "gemini" || data.provider === "openai"),
        provider: data.provider === "gemini" ? "Google Gemini" : "OpenAI",
      };
    } catch {
      this.#connection = { enabled: false, provider: "" };
    }
    ui.assistantMode.textContent = this.#connectionLabel();
  }

  /** @param {string} text @param {AbortController} controller @returns {Promise<import("../lib/types.d.ts").ChatDisplayReply>} */
  async #request(text, controller) {
    const { profile, aqi } = this.#getContext();
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: text,
        profile,
        aqi,
        history: this.#history.slice(-CHAT_LIMITS.historyMessages),
      }),
      signal: AbortSignal.any([
        controller.signal,
        AbortSignal.timeout(CHAT_LIMITS.browserTimeoutMs),
      ]),
    });
    const result = await response.json();
    if (!response.ok || !isChatReply(result)) {
      throw new Error("Invalid assistant response");
    }
    return result;
  }

  /** @param {import("../lib/types.d.ts").ChatDisplayReply} result @param {HTMLElement} bot @param {string} text */
  #showReply(result, bot, text) {
    const answer = result.answer.slice(0, CHAT_LIMITS.answerChars);
    const labels = {
      generative: ["Generative AI - " + this.#connection.provider, ""],
      "reference-guidance": ["Reference guidance", "\n\nReference guidance"],
      "safety-guidance": ["Safety guidance", "\n\nSafety guidance"],
    };
    const [label, suffix] = labels[result.mode];
    ui.assistantMode.textContent = label;
    bot.textContent = answer + suffix;
    this.#history.push(
      { role: "user", content: text },
      { role: "assistant", content: answer },
    );
  }

  /** @param {string} text @returns {Promise<void>} */
  async ask(text) {
    if (ui.send.disabled) {
      return;
    }
    const conversation = this.#conversationId;
    const controller = new AbortController();
    this.#controller = controller;
    ui.question.value = "";
    const user = document.createElement("div");
    user.className = "message user";
    user.textContent = text;
    ui.chatLog.append(user);
    this.#setBusy(true);
    const bot = document.createElement("div");
    bot.className = "message bot";
    bot.textContent = "Thinking through your question\u2026";
    ui.chatLog.append(bot);
    bot.scrollIntoView({ block: "nearest" });
    try {
      if (this.#connection.enabled) {
        const result = await this.#request(text, controller);
        if (conversation !== this.#conversationId) {
          return;
        }
        this.#showReply(result, bot, text);
      } else {
        const { profile, aqi } = this.#getContext();
        bot.textContent =
          guidedReply(text, profile, aqi) +
          "\n\nGuided mode \u00b7 curated guidance";
      }
    } catch {
      if (conversation !== this.#conversationId) {
        return;
      }
      ui.assistantMode.textContent = "Guided fallback - AI unavailable";
      const { profile, aqi } = this.#getContext();
      bot.textContent =
        "The AI service is unavailable. Here is a curated fallback:\n\n" +
        guidedReply(text, profile, aqi);
    } finally {
      if (conversation === this.#conversationId) {
        this.#controller = null;
        this.#setBusy(false);
        ui.chatLog.scrollTop = ui.chatLog.scrollHeight;
      }
    }
  }
}
