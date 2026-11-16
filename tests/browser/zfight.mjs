// Surfaces that flicker: runs src/dev/zfightAudit.ts on every room of the town (and the town itself with --town):
// pairs of same-facing faces in the same plane that overlap (a sign and a map hung at the same distance off a wall).
// Starts its own dev server from this checkout, like signs.mjs. docs/SIGNS.md.
//   WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/zfight.mjs [--out=dir] [--min=0.0004]
//   [--only=room,room] [--town] [--strict]
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = resolve(arg("out", resolve(root, "../zfight-out")));
const minArea = +arg("min", "0.0004");
const only = arg("only", "").split(",").filter(Boolean);
mkdirSync(out, { recursive: true });

const { createServer } = await import(resolve(root, "node_modules/vite/dist/node/index.js"));
const server = await createServer({ root, configFile: resolve(root, "vite.config.ts"), server: { port: +arg("port", "5291"), host: "127.0.0.1", strictPort: false }, logLevel: "error" });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, "");
const storage = process.env.WORLD_STORAGE || (await import("node:fs")).readFileSync(resolve(root, "src/state/progress.ts"), "utf8").match(/KEY = [^"]*"([a-z-]+)-progress-v1/)?.[1] || "english-world";

const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true },
};

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chrome", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
let failed = 0;
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("page error:", e.message));
  await page.addInitScript(([k, v]) => { localStorage.setItem(k, v); try { sessionStorage.setItem("ew-play-now", "1"); } catch {} }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 300000 });
  page.on("console", (m) => { if (m.type() === "error") console.log("console error:", m.text().slice(0, 200)); });
  for (let i = 0; ; i++) {
    const st = await page.evaluate(() => ({ screen: window.__ew?.store?.getState().screen, town: !!window.__ew?.game?.town }));
    if (st.screen === "play" && st.town) break;
    if (i % 6 === 0) console.log("waiting for the town…", JSON.stringify(st));
    if (i > 60) { await page.screenshot({ path: resolve(out, "stuck.png") }); throw new Error("the town never appeared: " + JSON.stringify(st) + " (stuck.png)"); }
    await page.waitForTimeout(5000);
  }
  const rooms = await page.evaluate(async ({ only, minArea, town }) => {
    const { zfightAudit } = await import("/src/dev/zfightAudit.ts");
    const { INTERIOR_IDS } = await import("/src/game/world/interiors.ts");
    const g = window.__ew.game, out = {};
    for (const id of INTERIOR_IDS) {
      if (only.length && !only.includes(id)) continue;
      const z = g.getZone(id);
      if (z) out[id] = zfightAudit(z.group, { minArea });
    }
    if (town) out.town = zfightAudit(g.town.group, { minArea });
    return out;
  }, { only, minArea, town: process.argv.includes("--town") });
  writeFileSync(resolve(out, "zfight.json"), JSON.stringify(rooms, null, 1));
  for (const [id, list] of Object.entries(rooms)) {
    if (!list.length) continue;
    console.log(`${id}: ${list.length}`);
    for (const f of list.slice(0, 12)) console.log(`   ${String(f.area).padStart(7)} m²  ${f.a}  ×  ${f.b}  @ ${f.at.join(",")}  facing ${f.normal.join(",")}  [${f.boxA}] [${f.boxB}]`);
  }
  failed = Object.values(rooms).reduce((n, l) => n + l.length, 0);
  console.log(`${Object.keys(rooms).length} places, ${failed} overlapping pairs over ${minArea} m²`);
} finally {
  await browser.close();
  await server.close();
}
if (process.argv.includes("--strict")) assert.equal(failed, 0, `${failed} flickering pairs`);
