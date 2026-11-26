// WORLD_TEST_URL=http://127.0.0.1:8880 WORLD_STORAGE=english-world WORLD_BROWSER_CHANNEL=chromium
// WORLD_PLAYWRIGHT_MODULE=/path/to/playwright-core/index.mjs node tests/browser/walk-car.mjs
// "Take me there" and a car in the street (26 Nov 2026): a guided walk held up by a car standing across its way (on a
// crosswalk) waits at its side and walks on to the end once the car has driven off; it is not given up there. And the
// car itself drives on past someone standing at its side (it does not wait for them while they wait for it).
import assert from "node:assert/strict";
import { openTown, shot } from "./screen-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
const sizes = [[390, 844, true], [1280, 800, false]];
try {
  for (const [width, height, phone] of sizes) {
    const label = `walk-car-${width}x${height}`;
    const { context, page } = await openTown(browser, width, height, phone);
    try {
      await page.waitForFunction(() => {
        const g = window.__ew?.game;
        return g?.zone?.id === "town" && g.ledges?.ready && !g.transitioning && g.ambient.traffic.length > 0;
      }, null, { timeout: 120000 });
      await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
      // a car standing across the way (a crash stop: it stands a few seconds, then drives on), the learner on the
      // pavement side of it and sent by the game's own walk to a point straight across the lane
      const setup = await page.evaluate(() => {
        const g = window.__ew.game, car = g.ambient.traffic[0];
        const x = 30, start = car.lane - car.half.z - 2.2, end = car.lane + car.half.z + 2.6;
        for (const o of g.ambient.traffic) if (o !== car) { o.hidden = 30; o.mesh.visible = false; }
        car.x = car.mesh.position.x = x; car.hidden = 0; car.grow = 1; car.whole = true; car.speed = 0; car.crashStop = 4;
        car.mesh.visible = true; car.mesh.scale.setScalar(1); car.mesh.position.z = car.lane;
        g.placeOnFoot(x, start, 0);
        g.walkTo(x, end, { kind: "point" });
        return { x, start, end, lane: car.lane, half: { ...car.half }, dir: car.dir, path: g.autoPath?.length ?? 0 };
      });
      assert(setup.path > 0, `${label}: the walk has a path ${JSON.stringify(setup)}`);
      // held up at the car's side: still on the walk (not given up) for a good while
      await page.waitForTimeout(2500);
      const held = await page.evaluate(() => {
        const g = window.__ew.game, p = g.player.root.position, car = g.ambient.traffic[0];
        return { z: p.z, walking: !!g.autoPath?.length, carX: car.x, carSpeed: car.speed };
      });
      assert(held.z < setup.lane, `${label}: the car held the learner on their side ${JSON.stringify({ held, setup })}`);
      assert(held.walking, `${label}: the walk waits for the car, not given up ${JSON.stringify(held)}`);
      await shot(page, `${label}-waiting`);
      // the car goes on, and the learner walks to the end of the way
      await page.waitForFunction(([x, end]) => {
        const g = window.__ew.game, p = g.player.root.position;
        return Math.hypot(p.x - x, p.z - end) < 0.6 && !g.autoPath?.length;
      }, [setup.x, setup.end], { timeout: 30000 }).catch(async (error) => {
        const at = await page.evaluate(() => {
          const g = window.__ew.game, p = g.player.root.position, car = g.ambient.traffic[0];
          return { x: p.x, z: p.z, path: g.autoPath, carX: car.x, carSpeed: car.speed, check: g.walkCheck };
        });
        throw new Error(`${label}: the walk did not reach its end ${JSON.stringify({ at, setup })}\n${error.message}`);
      });
      const moved = await page.evaluate((x0) => Math.abs(window.__ew.game.ambient.traffic[0].x - x0), setup.x);
      assert(moved > 2, `${label}: the car drove on (${moved.toFixed(2)} m)`);
      await shot(page, `${label}-across`);
      console.log(`${label} passed`);
    } finally { await context.close(); }
  }
  console.log("walk-car: all ok");
} finally { await browser.close(); }
