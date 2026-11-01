// The edition overlay (docs/es/EDITIONS.md). A build, test run or tool for an edition other than the default ("en")
// gets, for every file under src/, the file with the same path under src/editions/<edition>/ when there is one:
// src/content/global.ts → src/editions/es/content/global.ts. Files that only the base has stay shared (the engine,
// the 3D town, the interface). An edition file that imports its own base file gets the base.
// Used by vite.config.ts (dev server, build, vitest) and by tools/edition-hook.mjs (tsx tools).
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SRC = path.join(ROOT, "src") + path.sep;
const EDITIONS = path.join(ROOT, "src", "editions") + path.sep;

/** The edition asked for in the environment: VITE_EDITION (builds) or EDITION (tools). */
export const editionFromEnv = () => process.env.VITE_EDITION || process.env.EDITION || "en";

/** The file that replaces `file` in `edition`, or null (the base file is used). `importer`: the importing file. */
export function overlayFile(file, edition, importer = "") {
  if (!edition || edition === "en" || !file.startsWith(SRC) || file.startsWith(EDITIONS)) return null;
  const cand = path.join(EDITIONS, edition, file.slice(SRC.length));
  if (cand === importer || !existsSync(cand)) return null;
  return cand;
}

/** The Vite plugin. The Spanish edition's page also gets its own title and language. */
export function editionOverlay(edition = editionFromEnv(), page = {}) {
  return {
    name: "edition-overlay",
    enforce: "pre",
    async resolveId(source, importer, options) {
      if (edition === "en" || source.startsWith("\0")) return null;
      const r = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!r || r.external) return r ?? null;
      const [file, query] = r.id.split("?");
      const over = overlayFile(file, edition, importer?.split("?")[0]);
      return over ? { ...r, id: over + (query ? "?" + query : "") } : r;
    },
    transformIndexHtml(html) {
      if (edition === "en") return html;
      let out = html;
      if (page.lang) out = out.replace(/<html lang="[^"]*">/, `<html lang="${page.lang}">`);
      if (page.title) out = out.replace(/<title>[^<]*<\/title>/, `<title>${page.title}</title>`);
      if (page.description) out = out.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${page.description}" />`);
      return out;
    },
  };
}
