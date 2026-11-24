/** @type {Record<string,string>} */
const icons = {
  dashboard:
    '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  leaf: '<path d="M20 4C9 2 3 8 6 15s16 4 14-11Z"/><path d="m4 21 11-12m-5 5v-4m0 4h5"/>',
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M9 21v-8h6v8M7 9h.01M17 9h.01"/>',
  community:
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m1 3a5 5 0 0 1 3 5v2"/>',
  chart: '<path d="M4 3v18h17M8 16v-4m5 4V8m5 8V4"/>',
  train:
    '<rect x="5" y="3" width="14" height="16" rx="4"/><path d="M5 10h14M9 3v7m6-7v7M8 22l2-3m6 3-2-3M8 15h.01M16 15h.01"/>',
};
/** @param {string} name @returns {string} */
export function icon(name) {
  return (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    (icons[name] || icons.leaf) +
    "</svg>"
  );
}

/** @returns {string} */
export function heroArt() {
  return /* HTML */ `<svg
    class="landscape"
    viewBox="0 0 300 280"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="204" cy="103" r="83" stroke="#cedcc0" />
    <circle cx="204" cy="103" r="66" stroke="#d4e0c8" />
    <circle cx="204" cy="103" r="47" fill="#f1f2cc" />
    <path d="M0 245c65-50 108-35 160-59s97-1 150 24v80H0Z" fill="#c4d6ad" />
    <path d="M76 280v-92h38v-32h22v124m-64 0v-66H44v66" fill="#a2b991" />
    <path d="M152 280V134h39v146" fill="#b0c49e" />
    <path d="M157 134h29v-9h-29m48 155V171h42v109" fill="#91ab80" />
    <path d="M216 171v-12h20v12" fill="#91ab80" />
    <path d="M110 281v-39h42v39" fill="#d9e2c4" />
    <path d="M0 278c52-24 106-15 155-22s110-22 145-1v25H0" fill="#7e9c6f" />
    <path d="M263 264v-68" stroke="#587550" stroke-width="3" />
    <ellipse cx="264" cy="199" rx="25" ry="39" fill="#759965" />
    <path d="M37 267v-64" stroke="#6b895c" stroke-width="3" />
    <ellipse cx="37" cy="201" rx="18" ry="29" fill="#8aa776" />
    <path
      d="M165 151v8m10-8v8m-10 9v8m10-8v8m-10 9v8m10-8v8M86 200v7m12-7v7m-12 9v7m12-7v7M218 186v8m13-8v8m-13 9v8m13-8v8"
      stroke="#e2e9d3"
      stroke-width="4"
    />
    <path
      d="m102 88 6-3 7 3m4-18 7-3 7 3"
      stroke="#9caf8d"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>`;
}
