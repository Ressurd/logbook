import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/firestore.rules.test.ts"],
    hookTimeout: 30_000,
    testTimeout: 20_000,
  },
});
