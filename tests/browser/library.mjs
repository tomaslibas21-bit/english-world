// Claude runs this against a configured local Maple build. Covers come from the read-only course checkout.
// WORLD_SHOTS receives <viewport>-<state>.png. WORLD_LIBRARY_ART_ROOT can select another local /art/s folder.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:8700");
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS;
const artRoot = process.env.WORLD_LIBRARY_ART_ROOT || join(homedir(), "fluent-steps/public/art/s");
const index = await readFile(resolve(artRoot, "../../knygos/index.json"));
const sizes = [[390, 844], [844, 390], [1280, 800]];
const repeats = 10;
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, sounds: 0, scenes: false,
    phoneCalls: false, textMessages: false, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: 45, z: 46.8, rot: 0 },
  coach: { done: true, run: true, view: true, seen: { list: true, walk: true } },
};
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of sizes) {
    const label = `${width}x${height}`, phone = width === 390 || height === 390;
    const context = await browser.newContext({
      viewport: { width, height }, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1,
    });
    try {
      await context.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== base.origin) return route.abort();
        if (url.pathname === "/knygos/index.json")
          return route.fulfill({ status: 200, contentType: "application/json", body: index });
        const cover = /^\/art\/s\/books\/(BOOK-[A-Z]+\.[a-f0-9]{8}\.(?:160|320)\.webp)$/.exec(url.pathname);
        if (cover) {
          try { return await route.fulfill({ contentType: "image/webp", body: await readFile(join(artRoot, "books", cover[1])) }); }
          catch { return route.fulfill({ status: 404, body: "" }); }
        }
        if (/\.mp3$/.test(url.pathname)) return route.fulfill({ status: 204, body: "" });
        return route.continue();
      });
      await context.addInitScript(([key, save]) => {
        localStorage.setItem(key, JSON.stringify(save));
        sessionStorage.setItem("ew-play-now", "1");
        window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
        let seed = 20261126;
        Math.random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
      }, [`${storage}-progress-v1`, progress]);
      const page = await context.newPage(), errors = [], metrics = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base.href, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__ew?.game?.zoneId === "town" && !window.__ew.store.getState().hud.fade,
        null, { timeout: 180_000 });
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const doors = await page.evaluate(() => window.__ew.game.doors.filter((d) => d.loc === "library"));
      assert.equal(doors.length, 1, "Enable the Maple shelf configuration before running the library review");
      const [door] = doors;
      assert.deepEqual([door.x, door.z], [22, 49]);
      await page.evaluate(() => {
        window.__libraryActions = [];
        window.__ew.game.onLibraryAction = (action, chairIndex) => window.__libraryActions.push([action, chairIndex ?? null]);
      });
      const waitZone = (id) => page.waitForFunction((zone) => {
        const { game, store } = window.__ew;
        return game.zoneId === zone && !game.transitioning && !store.getState().hud.fade;
      }, id, { timeout: 30_000 });
      const arrive = async (x, z) => {
        try {
          await page.waitForFunction(([x, z]) => {
            const g = window.__ew.game, p = g.player.root.position;
            // Game completes paths within 0.35 m. Leave a small margin for the next rendered frame.
            return !g.autoPath?.length && Math.hypot(p.x - x, p.z - z) < 0.4;
          }, [x, z], { timeout: 30_000 });
        } catch (error) {
          const state = await page.evaluate(([x, z]) => {
            const g = window.__ew.game, p = g.player.root.position;
            return {
              playerPosition: p.toArray(), remainingAutoPath: g.autoPath, target: { x, z },
              autoTarget: g.autoTarget, distance: Math.hypot(p.x - x, p.z - z), zone: g.zoneId,
            };
          }, [x, z]);
          throw new Error(`${label} arrival failed ${JSON.stringify(state)}`, { cause: error });
        }
      };
      const walk = async (x, z, facing) => {
        await page.evaluate(([x, z, rot]) => window.__ew.game.walkTo(x, z,
          { kind: "point", rot, alignCamera: rot !== undefined }), [x, z, facing]);
        await arrive(x, z);
      };
      const artReady = () => page.waitForFunction(() =>
        window.__ew.game.zone.group.getObjectByName("library-jackets")?.userData.bookIds.length > 0,
      null, { timeout: 15_000 });
      const settle = () => page.waitForTimeout(1200);
      const sample = () => page.evaluate(() => {
        const g = window.__ew.game, info = g.renderer.info;
        return { calls: info.render.calls, triangles: info.render.triangles, ...info.memory };
      });
      const capture = async (state) => {
        await settle();
        const reading = await sample();
        if (["doorstep", "display", "chair"].includes(state)) assert(reading.calls <= 50, `${label} ${state} draw calls ${reading.calls}`);
        metrics.push({ state, ...reading });
        if (shots) await page.screenshot({ path: join(shots, `${label}-${state}.png`) });
      };
      const activate = async (label) => {
        const prompt = page.locator(".prompt").filter({ hasText: label });
        await prompt.waitFor();
        if (phone) await prompt.tap();
        else {
          await page.locator("canvas").first().evaluate((canvas) => canvas.focus());
          await page.keyboard.press("e");
        }
      };
      const enter = async () => {
        await walk(door.outX, door.outZ, 0);
        await activate(door.name);
        await waitZone("library");
        await artReady();
      };
      const exit = async () => {
        await page.evaluate(() => {
          const g = window.__ew.game, ex = g.zone.interior.exit;
          g.walkTo(ex.x, ex.z - 0.6, { kind: "exit" });
        });
        await waitZone("town");
        assert(await page.evaluate(() => {
          const g = window.__ew.game, p = g.player.root.position;
          return g.town.walkableAt(p.x, p.z) && !g.zones.get("library").group.getObjectByName("library-jackets");
        }), "The outside return is walkable and the visit atlas has been detached");
      };

      // All movement after the saved Union Station start uses the ordinary walking path and door actions.
      await walk(22, 44.4, 0);
      await capture("street");
      await enter();
      await capture("doorstep");
      const spots = await page.evaluate(() => window.__ew.game.zone.interior.spots);
      await walk(spots.display.x, spots.display.z);
      await activate("Browse books");
      await capture("display");
      await walk(spots["chair-0"].x, spots["chair-0"].z);
      await activate("Sit and read");
      await capture("chair");
      await walk(spots["chair-1"].x, spots["chair-1"].z);
      await activate("Sit and read");
      assert.deepEqual(await page.evaluate(() => window.__libraryActions), [["browse", null], ["sit", 0], ["sit", 1]]);
      await exit();
      await capture("exit");
      const firstOutside = await sample();
      const allocation = [];
      for (let visit = 1; visit < repeats; visit++) {
        await enter();
        await exit();
        await settle();
        allocation.push(await sample());
      }
      assert(allocation.every((s) => s.textures <= firstOutside.textures && s.geometries <= firstOutside.geometries),
        `${label} visit allocations accumulate ${JSON.stringify({ firstOutside, allocation })}`);
      assert.deepEqual(errors, [], `${label} page errors`);
      console.log(JSON.stringify({ viewport: label, metrics, visits: repeats, settled: allocation.at(-1) }));
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
