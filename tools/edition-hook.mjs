// The edition overlay for the tools (tools/edition-overlay.mjs): `EDITION=es npx tsx --import ./tools/edition-hook.mjs
// tools/check-content.ts` runs a tool on the Spanish edition. Without EDITION (or with "en") it changes nothing.
import { register } from "node:module";
import { editionFromEnv } from "./edition-overlay.mjs";

if (editionFromEnv() !== "en") register("./edition-resolve.mjs", import.meta.url);
