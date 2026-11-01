import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { editionFromEnv, editionOverlay } from "./tools/edition-overlay.mjs";

// Hosting: GAME_BASE=/game/ builds the game for a sub-path of another site (e.g. https://site/game/).
// GitHub Pages builds with GAME_BASE=/<repository>/ (.github/workflows/deploy.yml, docs/HOSTING.md).
// VITE_AUDIO_BASE=https://cdn.example.com/english-world/audio/ loads the voice clips from elsewhere.
// Editions (docs/es/EDITIONS.md): VITE_EDITION=es builds the Spanish edition (Puerto Colibrí); without it, the English
// edition (Maple Harbor). The tests run both: the "en" project with the English edition, "es" with the Spanish one.
const EDITION = process.env.VITEST ? "en" : editionFromEnv();
const PAGES: Record<string, { lang: string; title: string; description: string }> = {
  es: {
    lang: "en",
    title: "Spanish World · Puerto Colibrí",
    description: "Speak Spanish in a living town: walk around a small Mexican beach town and talk with its people.",
  },
};

export default defineConfig({
  base: process.env.GAME_BASE || "/",
  plugins: [editionOverlay(EDITION, PAGES[EDITION]), react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5188, host: true },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
  test: {
    projects: [
      { extends: true, test: { name: "en", environment: "node", include: ["tests/**/*.test.ts"], exclude: ["tests/es/**", "**/node_modules/**"] } },
      { extends: true, plugins: [editionOverlay("es")], test: { name: "es", environment: "node", include: ["tests/es/**/*.test.ts"] } },
    ],
  },
} as any);
