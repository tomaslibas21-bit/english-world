import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { rmSync } from "node:fs";
import path from "node:path";
import { editionFromEnv, editionOverlay, learnerFromEnv } from "./tools/edition-overlay.mjs";
import { loadingScreen } from "./tools/loading-screen.ts";
import { LOADING_ART as MAPLE_HARBOR } from "./src/ui/loadingArt.ts";
import { LOADING_ART as PUERTO_COLIBRI } from "./src/editions/es/ui/loadingArt.ts";

// Hosting: GAME_BASE=/game/ builds the game for a sub-path of another site (e.g. https://site/game/).
// GitHub Pages builds with GAME_BASE=/<repository>/ (.github/workflows/deploy.yml, docs/HOSTING.md).
// VITE_AUDIO_BASE=https://cdn.example.com/english-world/audio/ loads the voice clips from elsewhere.
// Editions (docs/es/EDITIONS.md): VITE_EDITION=es builds the Spanish edition (Puerto Colibrí); without it, the English
// edition (Maple Harbor). The tests run both: the "en" project with the English edition, "es" with the Spanish one.
const EDITION = process.env.VITEST ? "en" : editionFromEnv();
// The learner layer (docs/es/LEARNER-LT.md): VITE_LEARNER=lt builds Puerto Colibrí for Lithuanians (Spanish Master).
const LEARNER = process.env.VITEST ? "" : learnerFromEnv();
// The loading screen (the town's logo: src/ui/loadingArt.ts, src/editions/es/ui/loadingArt.ts) is put into index.html
// here (tools/loading-screen.ts); `loading` is what a screen reader hears while it shows.
const PAGES: Record<string, { lang: string; title: string; description: string; loading: string }> = {
  es: {
    lang: "en",
    title: "Puerto Colibrí",
    loading: "Loading Puerto Colibrí",
    description: "Speak Spanish in a living town: walk around a small Mexican beach town and talk with its people.",
  },
  "es-lt": {
    lang: "lt",
    title: "Puerto Colibrí",
    loading: "Kraunama: Puerto Colibrí",
    description: "Kalbėk ispaniškai gyvame miestelyje: vaikštinėk po nedidelį Meksikos pajūrio miestelį ir kalbėkis su jo žmonėmis.",
  },
};

// Vite copies all of public/ into a build; each edition ships only its own scene pictures (docs/es/PICTURES.md
// "The wiring plan"): the English build leaves out scenes-es/, the Spanish one scenes/, and neither ships the
// references the pictures were made from (scenes-es/ref/).
function editionPictures(edition: string) {
  let out = "";
  return {
    name: "edition-pictures",
    apply: "build" as const,
    configResolved(c: { root: string; build: { outDir: string } }) { out = path.resolve(c.root, c.build.outDir); },
    closeBundle() {
      for (const d of edition === "es" ? ["scenes", "scenes-es/ref"] : ["scenes-es"]) rmSync(path.join(out, d), { recursive: true, force: true });
    },
  };
}

const PAGE = PAGES[LEARNER ? `${EDITION}-${LEARNER}` : EDITION];

export default defineConfig({
  base: process.env.GAME_BASE || "/",
  plugins: [
    editionOverlay(EDITION, PAGE, LEARNER),
    loadingScreen(PAGE?.loading ?? "Kraunamas „English World“", EDITION === "es" ? PUERTO_COLIBRI : MAPLE_HARBOR),
    react(),
    editionPictures(EDITION),
  ],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5188, host: true },
  build: { target: "es2022", chunkSizeWarningLimit: 4000 },
  test: {
    projects: [
      { extends: true, test: { name: "en", environment: "node", include: ["tests/**/*.test.ts"], exclude: ["tests/es/**", "tests/es-lt/**", "**/node_modules/**"] } },
      { extends: true, plugins: [editionOverlay("es", {}, "")], test: { name: "es", environment: "node", include: ["tests/es/**/*.test.ts"] } },
      { extends: true, plugins: [editionOverlay("es", {}, "lt")], test: { name: "es-lt", environment: "node", include: ["tests/es-lt/**/*.test.ts"] } },
    ],
  },
} as any);
