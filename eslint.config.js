// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/coverage/**",
      "**/node_modules/**",
      "**/playwright-report/**",
      "**/test-results/**",
      "**/.turbo/**",
      // Static assets, not source. apps/web/public/ort/ is third-party
      // (onnxruntime-web runtime, copied by scripts/copy-ort-assets.mjs;
      // gitignored) and apps/web/public/brand/ will hold generated
      // favicon/OG assets from M5.
      "apps/web/public/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["packages/**/*.ts", "**/*.config.ts", "**/*.config.js", "scripts/**/*.mjs"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  {
    files: ["apps/web/e2e/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    // Playwright-driven harness scripts (screenshots, surface measurement,
    // clipped-control probe). Their `page.evaluate()` callbacks are browser
    // code by construction — serialized and run inside the page — so these
    // files legitimately reference both environments' globals.
    files: [
      "scripts/shots.mjs",
      "scripts/fold.mjs",
      "scripts/shot-section.mjs",
      "scripts/measure-surface.mjs",
      "scripts/probe-clipped.mjs",
      "scripts/probe-overflow.mjs",
    ],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
);
