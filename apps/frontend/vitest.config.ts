import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import path from "node:path";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,

    /*
     * Standing up jsdom takes the better part of thirty seconds here, and
     * files run one at a time, so a whole-monorepo test run can push a
     * single file past the 5s default while the tests themselves take
     * milliseconds. That showed up as a suite that failed roughly one run in
     * three and passed when run on its own -- the worst kind of red, because
     * it trains you to re-run rather than read.
     *
     * The timeouts are generous on purpose: they exist to stop a slow
     * environment being reported as a broken test, not to let a genuinely
     * hanging test sit there, which fileParallelism: false already bounds.
     */
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
