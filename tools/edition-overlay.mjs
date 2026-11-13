// The edition overlay (docs/es/EDITIONS.md). A build, test run or tool for an edition other than the default ("en")
// gets, for every file under src/, the file with the same path under src/editions/<edition>/ when there is one:
// src/content/global.ts → src/editions/es/content/global.ts. Files that only the base has stay shared (the engine,
// the 3D town, the interface). An edition file that imports its own base file gets the base.
// A learner layer sits on top (docs/es/LEARNER-LT.md): with VITE_LEARNER / LEARNER set to a language other than the
// edition's own learner's, src/editions/<edition>-<learner>/<path> comes first (Puerto Colibrí for Lithuanians:
// src/editions/es-lt/), then the edition's file, then the base. A layer's file that imports its own path gets the
// next layer down.
// Used by vite.config.ts (dev server, build, vitest) and by tools/edition-hook.mjs (tsx tools).
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = path.join(ROOT, "src") + path.sep;
const EDITIONS = path.join(ROOT, "src", "editions") + path.sep;

/** The edition asked for in the environment: VITE_EDITION (builds) or EDITION (tools). */
export const editionFromEnv = () => process.env.VITE_EDITION || process.env.EDITION || "en";

/** The learner's language asked for in the environment (VITE_LEARNER for builds, LEARNER for tools), or "" for the
 *  edition's own (the Spanish edition's English). */
export const learnerFromEnv = () => process.env.VITE_LEARNER || process.env.LEARNER || "";
/** The file that replaces `file` in `edition` (and `learner`'s layer), or null (the base file is used). `importer`:
 *  the importing file. */
export function overlayFile(file, edition, importer = "", learner = learnerFromEnv()) {
  if (!edition || edition === "en" || !file.startsWith(SRC) || file.startsWith(EDITIONS)) return null;
  const rel = file.slice(SRC.length);
  const layers = [...(learner ? [path.join(EDITIONS, `${edition}-${learner}`, rel)] : []), path.join(EDITIONS, edition, rel)];
  for (const cand of layers.slice(layers.indexOf(importer) + 1)) if (existsSync(cand)) return cand;
  return null;
}

/** The Vite plugin. The Spanish edition's page also gets its own title, language and loading screen. */
export function editionOverlay(edition = editionFromEnv(), page = {}, learner = learnerFromEnv()) {
  return {
    name: "edition-overlay",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (edition === "en" || source.startsWith("\0")) return null;
      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!r || r.external) return r ?? null;
      const [file, query] = r.id.split("?");
      const over = overlayFile(file, edition, importer?.split("?")[0], learner);
      return over ? { ...r, id: over + (query ? "?" + query : "") } : r;
    },
    transformIndexHtml(html) {
      if (edition === "en") return html;
      let out = html;
      if (page.lang) out = out.replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`);
      if (page.title) out = out.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);
      if (page.description) out = out.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${page.description}" />`);
      if (page.loading) {
        out = out.replace(/<link rel="preload" href="\/brand\/loading-wordmark\.svg"[^>]*>\s*/, "");
        out = out.replace(/<div class="loading ew-loading"[\s\S]*?<\/svg>\s*<\/div>/, page.loading);
      }
      return out;
    },
  };
}
