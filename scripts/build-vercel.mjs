import { staticAssets } from "./build.mjs";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("public", { recursive: true });
for (const [route, asset] of Object.entries(staticAssets))
  await writeFile(
    "public/" + (route === "/" ? "index.html" : route.slice(1)),
    asset.body,
  );
console.log(
  "Prepared the same optimized assets for Vercel and Worker hosting.",
);
