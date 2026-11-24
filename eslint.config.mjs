import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "public/**",
      ".sites-runtime/**",
      ".vercel/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["lib/**/*.mjs"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/worker/**", "**/api/**", "**/web/**", "node:*"],
              message:
                "Shared domain code must remain independent of server and browser adapters.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "process",
        "Buffer",
        "__dirname",
        "__filename",
      ],
    },
  },
  {
    files: ["web/**/*.js"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/worker/**", "**/api/**", "node:*"],
              message:
                "Browser code must not import server implementation or Node APIs.",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        "process",
        "Buffer",
        "__dirname",
        "__filename",
      ],
    },
  },
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: globals.nodeBuiltin,
    },
    rules: {
      "no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
  { files: ["web/**/*.js"], languageOptions: { globals: globals.browser } },
  {
    files: ["scripts/browser-*.mjs"],
    languageOptions: {
      globals: { ...globals.nodeBuiltin, ...globals.browser },
    },
  },
  {
    files: ["lib/**/*.mjs", "worker/**/*.mjs", "api/**/*.mjs", "web/**/*.js"],
    rules: {
      complexity: ["error", 15],
      "max-depth": ["error", 4],
      "max-params": ["error", 4],
      curly: ["error", "all"],
      eqeqeq: ["error", "always"],
      "no-implicit-coercion": "error",
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];
