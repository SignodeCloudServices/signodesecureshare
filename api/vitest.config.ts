import { defineConfig } from "vitest/config";

export default defineConfig({
  // An inline (empty) PostCSS config stops Vite searching parent directories
  // for one. Without it, Vite finds the portal's postcss.config.js at the repo
  // root and tries to load tailwindcss, which is not installed in the API-only
  // deploy job — Deploy - API #1 failed on exactly that (14 Oct 2026).
  css: { postcss: {} },
  test: { include: ["test/**/*.test.ts"], environment: "node" },
});
