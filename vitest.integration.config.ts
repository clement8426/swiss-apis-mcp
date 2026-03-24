import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
    testTimeout: 20000,   // real HTTP calls can be slow
    hookTimeout: 10000,
    reporters: ["verbose"],
  },
});
