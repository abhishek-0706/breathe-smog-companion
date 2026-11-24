import { readFile, mkdir, writeFile } from "node:fs/promises";
import { build, transform } from "esbuild";
// Source remains readable; only shipped browser assets are minified.
const browser = await build({
  entryPoints: ["web/app.js"],
  bundle: true,
  minify: true,
  write: false,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
const guidance = await build({
  entryPoints: ["lib/guidance.mjs"],
  bundle: true,
  minify: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
});
const css = await transform(await readFile("web/style.css", "utf8"), {
  loader: "css",
  minify: true,
});
export const staticAssets = {
  "/favicon.svg": {
    body: await readFile("web/favicon.svg", "utf8"),
    type: "image/svg+xml",
  },
  "/": {
    body: await readFile("web/index.html", "utf8"),
    type: "text/html; charset=utf-8",
  },
  "/app.js": {
    body: browser.outputFiles[0].text,
    type: "text/javascript; charset=utf-8",
  },
  "/style.css": { body: css.code, type: "text/css; charset=utf-8" },
  "/guidance.js": {
    body: guidance.outputFiles[0].text,
    type: "text/javascript; charset=utf-8",
  },
};
await mkdir("dist/server", { recursive: true });
await build({
  entryPoints: ["worker/index.mjs"],
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  outfile: "dist/server/index.js",
  legalComments: "none",
  plugins: [
    {
      name: "embedded-static-assets",
      setup(builder) {
        builder.onResolve({ filter: /^\.\/assets\.mjs$/ }, () => ({
          path: "static-assets",
          namespace: "breathe-assets",
        }));
        builder.onLoad({ filter: /.*/, namespace: "breathe-assets" }, () => ({
          contents:
            "export const assets = " + JSON.stringify(staticAssets) + ";",
          loader: "js",
        }));
      },
    },
  ],
});
const manifest = JSON.parse(await readFile(".openai/hosting.json", "utf8"));
delete manifest.static;
await mkdir("dist/.openai", { recursive: true });
await writeFile(
  "dist/.openai/hosting.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(
  "Built self-contained server and optimized browser assets; no runtime packages.",
);

// Type-check the source contract instead of rechecking generated bundle text.
await writeFile(
  "dist/server/index.d.ts",
  'export { default } from "../../worker/index.mjs";\n',
);
