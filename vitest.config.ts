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
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
