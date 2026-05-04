import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", ".next", "e2e", "reference"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["lib/integrations/**/*.ts", "app/**/actions.ts"],
      exclude: ["**/*.test.ts", "**/*.spec.ts"],
      thresholds: {
        "lib/integrations/cloudflare.ts": {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
        "lib/integrations/postmark.ts": {
          lines: 80,
          functions: 80,
          statements: 80,
          branches: 70,
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only throws on import outside a Next.js server runtime.
      // Vitest runs plain Node, so alias it to an empty stub — the
      // module is purely a build-time boundary guard, no runtime value.
      "server-only": path.resolve(__dirname, "vitest.server-only-stub.ts"),
    },
  },
});
