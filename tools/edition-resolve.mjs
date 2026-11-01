// Module resolve hook registered by tools/edition-hook.mjs: after the normal resolution (tsx's), a file under src/
// is swapped for its edition's file when there is one.
import { fileURLToPath, pathToFileURL } from "node:url";
import { editionFromEnv, overlayFile } from "./edition-overlay.mjs";

const edition = editionFromEnv();

export async function resolve(specifier, context, nextResolve) {
  const r = await nextResolve(specifier, context);
  if (!r.url?.startsWith("file:")) return r;
  const [url, query] = r.url.split("?");
  const importer = context.parentURL?.startsWith("file:") ? fileURLToPath(context.parentURL.split("?")[0]) : "";
  const over = overlayFile(fileURLToPath(url), edition, importer);
  return over ? { ...r, url: pathToFileURL(over).href + (query ? "?" + query : "") } : r;
}
