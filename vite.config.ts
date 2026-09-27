import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// Hosting: GAME_BASE=/game/ builds the game for a sub-path of another site (e.g. https://site/game/).
// GitHub Pages builds with GAME_BASE=/<repository>/ (.github/workflows/deploy.yml, docs/HOSTING.md).
// VITE_AUDIO_BASE=https://cdn.example.com/english-world/audio/ loads the voice clips from elsewhere.
export default defineConfig({
  base: process.env.GAME_BASE || "/",
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5188, host: true },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
} as any);
