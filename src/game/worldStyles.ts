/** The trial world styles (toon, storybook, realistic; see style.ts) can be chosen: in `npm run dev`, or in a
 *  build made with VITE_WORLD_STYLES=1. Published builds show only "blocks" (owner's decision, 28 Sep 2026:
 *  keep them for later). No three.js here, so the settings panel can import it. */
export const STYLES_ENABLED = !!import.meta.env?.DEV || import.meta.env?.VITE_WORLD_STYLES === "1";
