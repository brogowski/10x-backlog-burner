import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const srcDir = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@/": `${srcDir}/`
    }
  },
  plugins: [],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/unit/**/*.spec.{ts,tsx}"],
    coverage: {
      reporter: ["text", "html"],
      exclude: ["tests/**", "dist", "node_modules"]
    }
  }
})

