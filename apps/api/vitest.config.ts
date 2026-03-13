import path from "node:path";
import { defineConfig } from "vitest/config";

const rootDir = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@velora/config": path.resolve(rootDir, "packages/config/src/index.ts"),
      "@velora/contracts": path.resolve(rootDir, "packages/contracts/src/index.ts"),
      "@velora/domain": path.resolve(rootDir, "packages/domain/src/index.ts"),
      "@velora/test-utils": path.resolve(rootDir, "packages/test-utils/src/index.ts"),
      "@velora/ui": path.resolve(rootDir, "packages/ui/src/index.ts")
    }
  },
  test: {
    environment: "node"
  }
});
