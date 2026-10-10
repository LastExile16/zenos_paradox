/// <reference types="vitest" />
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  // Relative paths so the build serves correctly from a GitHub Pages project
  // URL (user.github.io/<repo>/) without hardcoding the repo name.
  base: "./",
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    // Mobile-first: keep the initial bundle lean. Stage assets load lazily.
    target: "es2022",
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
