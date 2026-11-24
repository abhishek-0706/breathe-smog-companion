/** The build embeds these same-origin static assets into a virtual module. */
declare module "*/assets.mjs" {
  export const assets: Record<string, { body: string; type: string }>;
}
