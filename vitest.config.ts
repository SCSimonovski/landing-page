import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Single root config for the whole pnpm workspace. Auto-discovers
// `**/*.test.ts` co-located with sources. Default `node` environment —
// all initial tests are pure functions (no DOM, no React rendering).
// If we add UI tests later, override per-file with
//   /* @vitest-environment jsdom */
// or split into per-package configs.
//
// The @platform/shared alias mirrors how each app's next.config.ts uses
// `transpilePackages: ["@platform/shared"]` to load the package's raw
// .ts source. Without it, vitest tries Node's package-export resolution
// against `packages/shared/package.json` and gets the unresolved-module
// kind of error you'd expect.
export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/dist/**"],
  },
  resolve: {
    alias: {
      "@platform/shared": fileURLToPath(
        new URL("./packages/shared", import.meta.url),
      ),
    },
  },
});
