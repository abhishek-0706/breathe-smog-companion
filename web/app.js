import { NAVIGATION, PLEDGE_IDS } from "./content.js";
import { ACTION_IDS } from "../lib/routines.mjs";
import {
  CITIES,
  isCurrentAir,
  normalizeProfile,
  routines,
  avoidedCarbon,
} from "../lib/guidance.mjs";
import { AIR_LIMITS, MINUTE_MS } from "../lib/limits.mjs";
import { localDay } from "../lib/time.mjs";
import {
  readSaved,
  writeSaved,
  clearSaved,
  readSelections,
} from "./storage.js";
import { ui, requiredElement } from "./dom.js";
import { ChatController } from "./chat.js";
import { renderView } from "./views/index.js";
import { renderInfo } from "./views/dialogs.js";
import { icon } from "./views/art.js";

ui.city.replaceChildren(
  ...Object.keys(CITIES).map((city) => {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    return option;
  }),
);
let profile = normalizeProfile(
  readSaved("breathe-profile", { budget: "No-cost first" }),
);
let view = "overview",
  airError = "",
  busy = true,
  requestId = 0;
/** @type {import("../lib/types.d.ts").AirSnapshot | null} */
let air = null;
let today = localDay(profile.city);

let completed = readSelections("breathe-actions-" + today, ACTION_IDS);
let pledges = readSelections("breathe-pledges", PLEDGE_IDS);
const chat = new ChatController(() => ({ profile, aqi: currentAqi() }));

function currentAqi() {
  return isCurrentAir(air) ? air.current.us_aqi : null;
}
/** @param {string} key @param {unknown} value @returns {boolean} */
function save(key, value) {
  const saved = writeSaved(key, value);
  if (!saved) {
    toast("Browser storage is unavailable. Changes last until you leave.");
  }
  return saved;
}
function syncDay() {
  const next = localDay(profile.city);
  if (next === today) {
    return false;
  }
  today = next;
  completed = readSelections("breathe-actions-" + today, ACTION_IDS);
  return true;
}
/** @param {string} text */
function toast(text) {
  ui.toast.textContent = text;
  ui.toast.classList.add("visible");
  setTimeout(() => ui.toast.classList.remove("visible"), 3500);
}

ui.navigation.innerHTML = NAVIGATION.map(
  ([id, art, label]) =>
    `<button class="nav-button ${id === "overview" ? "active" : ""}" data-view="${id}" ${id === "overview" ? 'aria-current="page"' : ""}>${icon(art)}${label}</button>`,
).join("");
/** @param {string} next */
function setView(next) {
  view = next;
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.getAttribute("data-view") === view,
    );
    if (button.getAttribute("data-view") === view) {
      button.setAttribute("aria-current", "page");
    } else {
      button.removeAttribute("aria-current");
    }
  });
  render();
  ui.main.focus({ preventScroll: true });
}
function focusedPageControl() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement) || !active.closest("#page")) {
    return null;
  }
  if (active.id) {
    return "#" + CSS.escape(active.id);
  }
  return active.dataset.done
    ? '[data-done="' + CSS.escape(active.dataset.done) + '"]'
    : null;
}
function render() {
  syncDay();
  const focus = focusedPageControl();
  ui.cityLabel.textContent = profile.city;
  ui.householdCaption.textContent = profile.sensitive
    ? "Extra care at home"
    : profile.commute;
  ui.page.innerHTML = renderView(view, {
    profile,
    air,
    airError,
    busy,
    completed,
    pledges,
  });
  const control = focus ? document.querySelector(focus) : null;
  if (control instanceof HTMLElement) {
    control.focus({ preventScroll: true });
  }
}
function openProfile() {
  ui.city.value = profile.city;
  ui.commute.value = profile.commute;
  ui.distance.value = String(profile.distance);
  ui.budget.value = profile.budget;
  ui.sensitive.checked = profile.sensitive;
  ui.purifier.checked = profile.purifier;
  ui.profileDialog.showModal();
}
function showInfoDialog() {
  const title = ui.infoContent.querySelector("h2");
  if (title) {
    title.id = "info-dialog-title";
    ui.infoDialog.setAttribute("aria-labelledby", title.id);
  }
  ui.infoDialog.showModal();
}
/** @param {string} type */
function info(type) {
  ui.infoContent.innerHTML = renderInfo(type, {
    air,
    aiEnabled: chat.connection.enabled,
  });
  showInfoDialog();
}
/** @param {string} id */
function explainImpact(id) {
  const routine = routines(profile, currentAqi()).find(
    (item) => item.id === id,
  );
  if (!routine) {
    return;
  }
  ui.infoContent.innerHTML =
    '<span class="eyebrow">THE WHY BEHIND YOUR CHOICE</span><h2>' +
    routine.title +
    "</h2><p>" +
    routine.impact +
    '</p><p class="data-note">These are expected directions of impact, not guaranteed personal outcomes.</p><button class="mini-link" data-info="sources">Explore our sources</button>';
  showInfoDialog();
}
async function loadAir() {
  const id = ++requestId;
  busy = true;
  airError = "";
  air = null;
  render();
  try {
    const response = await fetch(
      "/api/air?city=" + encodeURIComponent(profile.city),
      { signal: AbortSignal.timeout(AIR_LIMITS.browserTimeoutMs) },
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "The data provider could not be reached.");
    }
    if (id !== requestId) {
      return;
    }
    air = data;
    if (data.stale) {
      airError =
        "The provider timestamp is stale. Verify current conditions with your local authority.";
    }
  } catch (error) {
    if (id !== requestId) {
      return;
    }
    airError =
      error instanceof Error && error.name === "TimeoutError"
        ? "The air-quality service took too long. Please try Refresh."
        : "Live data could not be loaded. Please try Refresh or check your local authority.";
  } finally {
    if (id === requestId) {
      busy = false;
      render();
    }
  }
}
/** @param {string} id */
function toggleAction(id) {
  syncDay();
  completed = completed.includes(id)
    ? completed.filter((value) => value !== id)
    : [...completed, id];
  const persisted = save("breathe-actions-" + today, completed);
  render();
  toast(
    persisted
      ? "Your daily check-in is saved."
      : "Your check-in applies to this session. Browser storage is unavailable.",
  );
}
function downloadPledge() {
  const blob = new Blob(
    [
      `A little care. Cleaner air.\nA neighbourhood note for ${profile.city}\n\nPlease switch engines off while waiting where safe, avoid burning leaves and waste, and check on neighbours during pollution episodes. Coordinate essential errands and share verified local advisories.\n\nVerify current conditions with local authorities. Health details are personal; share them only with consent.\n\nPrepared with Breathe.\n`,
    ],
    { type: "text/plain" },
  );
  const url = URL.createObjectURL(blob),
    anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "breathe-neighbourhood-note.txt";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function clearLocal() {
  const cleared = clearSaved();
  profile = normalizeProfile({ budget: "No-cost first" });
  completed = [];
  pledges = [];
  chat.reset();
  ui.infoDialog.close();
  void loadAir();
  toast(
    cleared
      ? "All saved Breathe preferences and check-ins cleared."
      : "Storage is unavailable. Preferences reset for this session.",
  );
}
/** @type {Record<string,()=>void>} */
const BUTTON_ACTIONS = {
  "profile-open": openProfile,
  "location-open": openProfile,
  personalize: openProfile,
  "refresh-air": () => void loadAir(),
  "sources-open": () => info("sources"),
  "help-open": () => info("about"),
  "chat-privacy": () => info("privacy"),
  "download-pledge": downloadPledge,
  "clear-local": clearLocal,
};
document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) {
    return;
  }
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  if (button.hasAttribute("data-close")) {
    button.closest("dialog")?.close();
    return;
  }
  const action = BUTTON_ACTIONS[button.id];
  if (action) {
    action();
    return;
  }
  const next = button.dataset.view || button.dataset.viewGo;
  if (next) {
    setView(next);
    return;
  }
  if (button.dataset.info) {
    info(button.dataset.info);
  } else if (button.dataset.impact) {
    explainImpact(button.dataset.impact);
  } else if (button.dataset.done) {
    toggleAction(button.dataset.done);
  } else if (button.dataset.prompt) {
    void chat.ask(button.dataset.prompt);
  }
});
document.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || !target.dataset.pledge) {
    return;
  }
  const id = target.dataset.pledge;
  pledges = target.checked
    ? [...new Set([...pledges, id])]
    : pledges.filter((value) => value !== id);
  save("breathe-pledges", pledges);
});
document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement) || target.id !== "km-range") {
    return;
  }
  const km = Number(target.value);
  requiredElement("#km-label", HTMLElement).textContent = String(km);
  requiredElement("#carbon-number", HTMLElement).textContent =
    avoidedCarbon(km).toFixed(1);
});
ui.profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(ui.profileForm);
  profile = normalizeProfile({
    ...Object.fromEntries(form),
    sensitive: form.has("sensitive"),
    purifier: form.has("purifier"),
  });
  chat.reset();
  const persisted = save("breathe-profile", profile);
  ui.profileDialog.close();
  void loadAir();
  toast(
    persisted
      ? "Your plan is now a little more you."
      : "Preferences updated for this session. Browser storage is unavailable.",
  );
});
ui.chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = ui.question.value.trim();
  if (question) {
    void chat.ask(question);
  }
});
render();
void loadAir();
void chat.connect();
setInterval(() => {
  if (!document.hidden && !busy) {
    void loadAir();
  }
}, AIR_LIMITS.refreshIntervalMs);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && syncDay()) {
    render();
  }
  if (
    !document.hidden &&
    !busy &&
    (!air ||
      Date.now() - Date.parse(air.fetchedAt) > AIR_LIMITS.refreshIntervalMs)
  ) {
    void loadAir();
  }
});
setInterval(() => {
  if (!document.hidden && syncDay()) {
    render();
  }
}, MINUTE_MS);
