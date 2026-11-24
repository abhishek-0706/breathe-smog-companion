/** @template {Element} T @param {string} selector @param {{new(): T}} ElementType @returns {T} */
export function requiredElement(selector, ElementType) {
  const element = document.querySelector(selector);
  if (!(element instanceof ElementType)) {
    throw new Error("Missing or invalid application element: " + selector);
  }
  return element;
}
export const ui = {
  navigation: requiredElement("#navigation", HTMLElement),
  page: requiredElement("#page", HTMLElement),
  main: requiredElement("#main", HTMLElement),
  cityLabel: requiredElement("#city-label", HTMLElement),
  householdCaption: requiredElement("#household-caption", HTMLElement),
  toast: requiredElement("#toast", HTMLElement),
  city: requiredElement("#city", HTMLSelectElement),
  commute: requiredElement("#commute", HTMLSelectElement),
  distance: requiredElement("#distance", HTMLInputElement),
  budget: requiredElement("#budget", HTMLSelectElement),
  sensitive: requiredElement("#sensitive", HTMLInputElement),
  purifier: requiredElement("#purifier", HTMLInputElement),
  profileForm: requiredElement("#profile-form", HTMLFormElement),
  profileDialog: requiredElement("#profile-dialog", HTMLDialogElement),
  infoDialog: requiredElement("#info-dialog", HTMLDialogElement),
  infoContent: requiredElement("#info-content", HTMLElement),
  chatLog: requiredElement("#chat-log", HTMLElement),
  chatForm: requiredElement("#chat-form", HTMLFormElement),
  assistantMode: requiredElement("#assistant-mode", HTMLElement),
  question: requiredElement("#question", HTMLInputElement),
  send: requiredElement("#send", HTMLButtonElement),
};
