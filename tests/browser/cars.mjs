// VITE_EDITION=es npx vite
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=puerto-colibri WORLD_BROWSER_CHANNEL=chromium
// WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CARS_SHOTS=/tmp/cars-shots node tests/browser/cars.mjs
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const puerto = storage.startsWith("puerto-colibri");
const shots = process.env.CARS_SHOTS || "/tmp/cars-shots";
const assets = /\/models\/cars\//;
mkdirSync(shots, { recursive: true });

const profile = {
  name: "Test", surname: "Tester", gender: "m", lookId: "m1",
  look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" },
};
const parkedSuv = puerto ? { x: 30, z: 34.6 } : { x: 34, z: -4.2 };
const street = { zone: "town", x: parkedSuv.x, z: puerto ? 30.4 : -1.4, rot: puerto ? 0 : Math.PI };
const screens = [
  { width: 1280, height: 800, quality: "high" },
  { width: 390, height: 844, quality: "low" },
  { width: 390, height: 664, quality: "low" },
];

function lineUpTraffic(page) {
  return page.evaluate(({ x }) => {
    const g = window.__ew.game;
    // Begin each sample with a sedan approaching the parked SUV.
    const car = g.ambient.traffic.find(({ model }) => model === "sedan");
    car.x = car.mesh.position.x = x - 4 * car.dir;
    car.hidden = 0;
    car.grow = 1;
    car.speed = 6;
    car.mesh.visible = true;
    car.mesh.scale.setScalar(1);
  }, parkedSuv);
}

function measure(page) {
  return page.evaluate(() => new Promise((resolve) => {
    const info = window.__ew.game.renderer.info.render;
    const start = performance.now();
    let last = info.frame, samples = 0, calls = 0, triangles = 0, peakCalls = 0, frames = 0;
    function tick(now) {
      if (info.frame !== last) {
        frames += info.frame - last;
        last = info.frame;
        const stats = window.__ew.carStats();
        calls += stats.calls;
        triangles += stats.triangles;
        peakCalls = Math.max(peakCalls, stats.calls);
        samples++;
      }
      if (now - start < 3000) requestAnimationFrame(tick);
      else resolve({
        fps: +(frames * 1000 / (now - start)).toFixed(1),
        drawCalls: +(calls / samples).toFixed(1),
        peakDrawCalls: peakCalls,
        triangles: Math.round(triangles / samples),
      });
    }
    requestAnimationFrame(tick);
  }));
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
try {
  for (const { width, height, quality } of screens) {
    const label = `${width}x${height}`;
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: 1, isMobile: width < 500, hasTouch: width < 500,
    });
    let releaseAssets;
    const assetsAllowed = new Promise((resolve) => { releaseAssets = resolve; });
    try {
      await context.route(/\.mp3(\?|$)/, (route) => route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
      await context.route(assets, async (route) => { await assetsAllowed; await route.continue(); });
      const page = await context.newPage();
      const errors = [], downloads = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
      page.on("response", (response) => {
        const path = new URL(response.url()).pathname;
        if (assets.test(path)) {
          downloads.push(response.body().then(
            (body) => ({ path, bytes: body.length, status: response.status() }),
            (error) => ({ path, bytes: 0, status: response.status(), error: String(error) }),
          ));
        }
      });
      const progress = {
        version: 1, profile, settings: { v: 6, play: "town", quality, volume: 0, cameraFollow: true },
        sits: {}, phrases: {}, seenIntro: {}, started: 1, place: street, coach: { done: true, run: true },
      };
      await page.addInitScript(([key, save]) => {
        localStorage.setItem(key, save);
        sessionStorage.setItem("ew-play-now", "1");
      }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => {
        const ew = window.__ew;
        return ew?.store.getState().screen === "play" && ew.game.zone?.id === "town"
          && ew.game.ledges?.ready && !ew.game.transitioning && ew.carStats().calls > 0;
      }, null, { timeout: 120000 });
      await page.evaluate(() => {
        window.__ew.coach?.finish?.();
        window.__ew.store.getState().setHud({ panel: null });
      });
      assert.equal(await page.evaluate(() => window.__ew.carStats().loadedCarModels), 0);
      await lineUpTraffic(page);
      const before = await measure(page);
      releaseAssets();

      await page.waitForFunction((modelCount) => {
        const stats = window.__ew.carStats();
        return stats.loadedCarModels === modelCount && stats.parkedModels === 19 && stats.trafficModels > 0 && stats.taxi;
      }, puerto ? 9 : 10, { timeout: 120000 });
      const stats = await page.evaluate(() => window.__ew.carStats());
      assert.equal(stats.trafficModels, (quality === "high" ? 8 : 4) - (puerto ? 2 : 0));
      assert(stats.taxi, "the taxi is rendered at the stand");
      const batching = await page.evaluate(() => {
        const g = window.__ew.game;
        const parked = g.town.parkedCars.group.children.filter((mesh) => mesh.name === "parked-car-models");
        const traffic = g.ambient.group.children.filter((mesh) => mesh.isInstancedMesh && mesh.name.startsWith("traffic-"));
        return { parked: parked.length, traffic: traffic.length, materials: new Set([...parked, ...traffic].map((mesh) => mesh.material)).size };
      });
      assert.deepEqual(batching, { parked: 2, traffic: puerto && quality === "high" ? 9 : 6, materials: 1 });
      await lineUpTraffic(page);
      const after = await measure(page);
      assert(before.fps > 0 && after.fps > 0 && before.drawCalls > 0 && after.drawCalls > 0);
      const fetched = await Promise.all(downloads);
      assert(fetched.every(({ status, bytes }) => status === 200 && bytes > 0), JSON.stringify(fetched));
      assert.equal(fetched.filter(({ path }) => path.endsWith(".glb")).length, stats.loadedCarModels);
      assert.equal(fetched.filter(({ path }) => path.endsWith("colormap.png")).length, 1);
      const bytes = fetched.reduce((sum, file) => sum + file.bytes, 0);
      console.log(label, quality, { before, after, bytes, ...stats });

      await lineUpTraffic(page);
      await page.waitForFunction(({ x, z }) => {
        const g = window.__ew.game, car = g.ambient.traffic.find(({ model }) => model === "sedan");
        const movingPoint = car.mesh.position.clone().setY(0.8).project(g.rig.cam);
        const parkedPoint = car.mesh.position.clone().set(x, 0.8, z).project(g.rig.cam);
        return [movingPoint, parkedPoint].every((p) => Math.abs(p.x) < 0.9 && Math.abs(p.y) < 0.9 && Math.abs(p.z) < 1);
      }, parkedSuv);
      await page.screenshot({ path: join(shots, `cars-${label}.png`) });

      if (width === 1280) {
        const b = await page.evaluate(() => {
          const g = window.__ew.game, spot = g.town.parkedCars.placements[0];
          const box = g.town.colliders.boxes.find((b) => b.tag === "car" && b.minX < spot.x && b.maxX > spot.x && b.minZ < spot.z && b.maxZ > spot.z);
          g.enterZone("town", { x: box.maxX + 2.5, z: spot.z, rot: -Math.PI / 2 }, true);
          return box;
        });
        await page.keyboard.down("w");
        try {
          await page.waitForFunction((x) => window.__ew.game.player.root.position.x < x + 0.42, b.maxX, { timeout: 8000 });
          await page.waitForTimeout(500);
          const p = await page.evaluate(() => {
            const { x, y, z } = window.__ew.game.player.root.position;
            return { x, y, z };
          });
          assert(p.x >= b.maxX + 0.36 && p.x < b.maxX + 0.42 && p.y < 0.1, `parked car stopped the walker: ${JSON.stringify(p)}`);
        } finally {
          await page.keyboard.up("w");
        }

        await page.evaluate(() => window.__ew.game.startScenario("s66-taxi"));
        await page.waitForFunction(() => {
          const { conv } = window.__ew.store.getState();
          return conv.active && conv.sitId === "s66-taxi";
        }, null, { timeout: 20000 });
      }
      assert.deepEqual(errors, [], `${label}: no console or page errors`);
    } finally {
      releaseAssets();
      await context.close();
    }
  }
  console.log("cars: all ok");
} finally {
  await browser.close();
}
