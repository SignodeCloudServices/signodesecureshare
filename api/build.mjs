// One bundle for the Functions v4 programming model: dist/index.js registers
// every function. Bundling (rather than tsc emit) is what lets the API import
// ../src/lib/*.ts from the portal without a shared package.
import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "dist/index.js",
  sourcemap: true,
  // Provided by the Functions Node worker at runtime, not an npm package.
  external: ["@azure/functions-core"],
  // ESM bundles of CJS deps need a real require().
  banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" },
  logLevel: "info",
});
