// Nothing covers a place's name: runs src/dev/signAudit.ts in the town (Maple Harbor on main, Puerto Colibrí on
// spanish-edition), prints every sign with the share of its lettering hidden from the street, and takes a picture of
// each one over the limit (and of any named with SIGNS_SHOW) from where the follow camera stands, at computer and phone
// size. Starts its own dev server from this checkout (no need for one running). docs/SIGNS.md.
//   WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/signs.mjs [--out=dir] [--show=Name,Name]
//   [--limit=0.05] [--all] (print every sign, not only the ones over the limit) [--only=Name,Name] (audit just these)
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const arg = (k, d) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const out = resolve(arg("out", resolve(root, "../signs-out")));
const limit = +arg("limit", "0.05");
const show = arg("show", process.env.SIGNS_SHOW || "").split(",").filter(Boolean);
const all = process.argv.includes("--all");
const only = arg("only", "").split(",").filter(Boolean);
mkdirSync(out, { recursive: true });

const { createServer } = await import(resolve(root, "node_modules/vite/dist/node/index.js"));
const server = await createServer({ root, configFile: resolve(root, "vite.config.ts"), server: { port: +arg("port", "5291"), host: "127.0.0.1", strictPort: false }, logLevel: "error" });
await server.listen();
const base = server.resolvedUrls.local[0].replace(/\/$/, "");
const storage = process.env.WORLD_STORAGE || (await import("node:fs")).readFileSync(resolve(root, "src/state/progress.ts"), "utf8").match(/KEY = [^"]*"([a-z-]+)-progress-v1/)?.[1] || "english-world";

const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
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
    if (i > 60) throw new Error("the town never appeared: " + JSON.stringify(st));
    await page.waitForTimeout(5000);
  }
  await page.waitForTimeout(1500);
  const t0 = Date.now();
  const reports = await page.evaluate(async (only) => {
    const { signAudit } = await import("/src/dev/signAudit.ts");
    return signAudit(window.__ew.game.town, only.length ? { only: (n) => only.some((o) => n.includes(o)) } : {});
  }, only);
  console.log(`${reports.length} signs, audited in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  writeFileSync(resolve(out, "signs.json"), JSON.stringify(reports, null, 1));
  const pct = (v) => `${Math.round(v * 100)}%`.padStart(4);
  const bad = reports.filter((r) => r.front > limit || r.flags.length);
  for (const r of all ? reports : bad) console.log(`${r.front > limit ? "HIDDEN" : r.flags.length ? "FLAG  " : "ok    "} front ${pct(r.front)} worst ${pct(r.worst)} views ${String(r.views.length).padStart(2)}  ${r.name.slice(0, 40).padEnd(40)} @ ${r.center.join(",")}  ${r.flags.join(" ")}  ${r.by.join(" ")}`);
  console.log(`${bad.filter((r) => r.front > limit).length} over ${pct(limit)} from the front; ${bad.filter((r) => r.flags.length).length} flagged`);
  // pictures: from the follow camera's place, computer (16:10) and phone (390×844) lens
  const pics = reports.filter((r) => r.front > limit || r.flags.length || show.some((s) => r.name.includes(s)));
  for (const r of pics) {
    for (const [tag, w, h] of [["computer", 1280, 800], ["phone", 390, 844]]) {
      const url = await page.evaluate(async ({ r, w, h }) => {
        const { signShot } = await import("/src/dev/signAudit.ts");
        const g = window.__ew.game;
        return signShot(g.renderer, g.scene, r, w, h);
      }, { r, w, h });
      const file = `${r.name.replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 40)}-${r.center[0]}_${r.center[2]}-${tag}.jpg`;
      writeFileSync(resolve(out, file), Buffer.from(url.split(",")[1], "base64"));
    }
  }
  console.log(`pictures in ${out}`);
  failed = bad.filter((r) => r.front > limit).length;
} finally {
  await browser.close();
  await server.close();
}
if (process.argv.includes("--strict")) assert.equal(failed, 0, `${failed} signs hidden from the street`);
