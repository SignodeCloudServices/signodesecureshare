// ESLint flat config (ESLint 9).
//
// Why this file exists: package.json has had `"lint": "eslint ."` since the
// original scaffold, but eslint was never installed and there was no config,
// so the script could only fail. CI now runs it, so it has to mean something.
//
// Scope is deliberately modest: the recommended JS + TypeScript rules and the
// React hooks rules, which catch real bugs (stale closures, conditional hooks).
// Stylistic rules are left to the editor.
import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist", "**/node_modules"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
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
    // shadcn/ui primitives are generated code (see CLAUDE.md: avoid editing
    // them directly). They routinely export variants alongside components.
    // Same for the shadcn toast hook. The empty-interface and type-only-const
    // patterns below are how shadcn generates these files.
    files: ["src/components/ui/**", "src/hooks/use-toast.ts"],
    rules: {
      "react-refresh/only-export-components": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // The invitation API (api/) runs on Node, not in the browser.
  {
    files: ["api/**/*.ts"],
    languageOptions: { globals: globals.node },
  },
);
