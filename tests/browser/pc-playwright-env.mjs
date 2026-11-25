// Preload on the browser host to normalize the runner before legacy suites import it.
import path from "node:path";
import { fileURLToPath } from "node:url";

const entry = process.argv[1] && path.resolve(process.argv[1]);
const browserDir = fileURLToPath(new URL("./", import.meta.url));
const framingAudit = fileURLToPath(new URL("../../tools/talk-framing-audit.mjs", import.meta.url));
if (process.env.WORLD_STORAGE === "puerto-colibri" && entry
    && (entry.startsWith(browserDir) || entry === framingAudit)) {
  const { localPlaywright } = await import("./talk-natural-framing.mjs");
  const requested = process.env.WORLD_PLAYWRIGHT_MODULE;
  process.env.WORLD_PLAYWRIGHT_REQUESTED_MODULE ??= requested ?? "";
  process.env.WORLD_PLAYWRIGHT_MODULE = await localPlaywright(requested);
  process.env.PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1";
  console.log(`Playwright runner ${JSON.stringify(process.env.WORLD_PLAYWRIGHT_REQUESTED_MODULE)} → ${process.env.WORLD_PLAYWRIGHT_MODULE}`);
}
