import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  // Don't bundle workspace packages - let them be resolved at runtime
  external: [/@hocbaichua-v0\/.*/, "nanoid", "drizzle-orm", "postgres"],
});
