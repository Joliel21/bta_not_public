import { defineConfig } from "vite";
import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: "./",
  build: {
    outDir: "the-words-we-carry/assets",
    emptyOutDir: true,
    manifest: false,
    rollupOptions: {
      input: {
        "the-words-we-carry": path.resolve(
          __dirname,
          "src/main-wp.tsx",
        ),
      },
      output: {
        entryFileNames: "the-words-we-carry.js",
        assetFileNames: (assetInfo) => {
          if (
            assetInfo.name &&
            assetInfo.name.endsWith(".css")
          ) {
            return "the-words-we-carry.css";
          }
          return "[name][extname]";
        },
        chunkFileNames: "[name].js",
      },
    },
  },
});