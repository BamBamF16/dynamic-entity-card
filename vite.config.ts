import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "src/dynamic-entity-card.ts",
      formats: ["es"],
      fileName: "dynamic-entity-card",
    },
    rollupOptions: {
      external: [],
    },
  },
});