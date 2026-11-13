import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { loadingScreen } from "./tools/loading-screen.ts";
import { LOADING_ART } from "./src/ui/loadingArt.ts";

// Hosting: GAME_BASE=/game/ builds the game for a sub-path of another site (e.g. https://site/game/).
// GitHub Pages builds with GAME_BASE=/<repository>/ (.github/workflows/deploy.yml, docs/HOSTING.md).
// VITE_AUDIO_BASE=https://cdn.example.com/english-world/audio/ loads the voice clips from elsewhere.
// The loading screen (the town's logo, src/ui/loadingArt.ts) is put into index.html here: tools/loading-screen.ts.
export default defineConfig({
  base: process.env.GAME_BASE || "/",
  plugins: [loadingScreen("Kraunamas „English World“", LOADING_ART), react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5188, host: true },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
  test: { environment: "node", include: ["tests/**/*.test.ts"] },
} as any);
