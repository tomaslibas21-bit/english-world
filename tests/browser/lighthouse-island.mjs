// WORLD_TEST_URL=http://127.0.0.1:5188 node tests/browser/lighthouse-island.mjs [--shots=dir]
// WORLD_BASELINE_URL may point to the pre-island build for a second measurement from the same harbor camera.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { HARBOR_PHONE_VIEW, HARBOR_SPAWN, checkHarborCalls, openHarbor, originalHarborCalls } from "./fixtures/harbor-calls.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const baseline = process.env.WORLD_BASELINE_URL;
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });

const desktopView = { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" };
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true });

try {
  const originalCalls = await originalHarborCalls(browser, baseline, storage);

  const shortPhoneView = { ...HARBOR_PHONE_VIEW, viewport: { width: 390, height: 664 } };
  for (const view of [HARBOR_PHONE_VIEW, shortPhoneView, desktopView]) {
    const phone = !!view.isMobile;
    const context = await browser.newContext(view);
    const page = await openHarbor(context, base, storage);
    const label = `${view.viewport.width}x${view.viewport.height}`;
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.waitForFunction(() => !!window.__ew.game.islandScene);
    const shot = (name) => shots && page.screenshot({ path: join(shots, label + "-" + name + ".png") });
    const wait = (predicate, arg) => page.waitForFunction(predicate, arg, { timeout: 15000 });
    const press = () => phone ? page.locator(".act-btn").tap() : page.keyboard.press("e");
    const state = () => page.evaluate(() => {
      const { game: g, store } = window.__ew;
      const p = g.player.root.position;
      const r = g.rides.riding;
      return { x: p.x, y: p.y, z: p.z, swimming: g.swimming, ride: r?.id, boatX: r?.m.x, prompt: store.getState().hud.prompt?.kind };
    });
    const move = async (key, direction, condition) => {
      if (!phone) {
        await page.keyboard.down(key);
        try { await condition(); } finally { await page.keyboard.up(key); }
      } else {
        const joy = await page.locator(".joy").boundingBox();
        assert(joy, "The phone joystick is available");
        await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2 - 48 * direction);
        await page.mouse.down();
        try { await condition(); } finally { await page.mouse.up(); }
      }
    };

    if (phone) {
      await checkHarborCalls(page, view === HARBOR_PHONE_VIEW ? originalCalls : undefined);
      await page.evaluate((at) => window.__ew.game.enterZone("town", at, true), HARBOR_SPAWN);
    }

    const minimap = page.locator(".minimap");
    await minimap.click();
    const map = page.locator(".map-wrap");
    await map.getByRole("button", { name: "Lighthouse · Švyturys", exact: true }).click();
    await map.getByRole("heading", { name: "Lighthouse", exact: true }).waitFor();
    await map.getByText("Švyturys", { exact: true }).waitFor();
    await map.getByRole("button", { name: "Nuvesk mane" }).click();
    await page.locator(".objective-card").getByRole("heading", { name: "Lighthouse · Švyturys", exact: true }).waitFor();
    assert.equal(await page.evaluate(() => window.__ew.game.objectiveTarget().id), "beach");
    await wait(() => window.__ew.store.getState().hud.prompt?.kind === "boat");
    await press();
    await wait(() => window.__ew.game.rides.riding?.id === "beach" && window.__ew.game.rides.phase === "on");
    assert.deepEqual(await page.evaluate(() => {
      const { x, z } = window.__ew.game.objectiveTarget();
      return [x, z];
    }), [85.9, -83.15]);

    // Put the boarded boat in the west channel. The remaining approach and stop use normal driving and collisions.
    await page.evaluate(() => {
      const { game: g } = window.__ew;
      g.rides.resetPosition(g.rides.riding, { x: 66, z: -83.15, rot: Math.PI / 2 });
      // (and the camera behind it, as after any jump of the boat: on an upright phone the stick points the way on the
      // screen, batch 0's point and go, so "up" is the way the camera looks)
      g.rideCourse = g.rig.yaw = Math.PI / 2;
      g.rig.snap();
    });
    await move("w", 1, () => wait(() => {
      const m = window.__ew.game.rides.riding.m;
      return m.x > 82.5 && m.pace < 1.3;
    }));
    await press();
    await wait(() => !window.__ew.game.rides.riding);
    const dock = await state();
    assert(dock.x >= 85.5 && dock.x <= 87.2 && dock.y > 0.7 && !dock.swimming, JSON.stringify(dock));
    assert(await page.evaluate(() => window.__ew.game.rides.islandBoat()?.id === "beach"), "The boat stays moored");
    const keeperWaypoint = await page.evaluate(() => window.__ew.game.objectiveTarget());
    assert(keeperWaypoint.x > 105 && keeperWaypoint.person, JSON.stringify(keeperWaypoint));

    await page.evaluate(() => {
      const { game: g } = window.__ew;
      g.rig.yaw = Math.PI / 2;
      g.rig.dist = 11;
      g.rig.pitch = 0.48;
      g.rig.snap();
    });
    await page.waitForTimeout(500);
    await shot("jetty");

    await move("w", 1, () => wait(() => window.__ew.game.player.root.position.x > 91));
    const across = await state();
    assert(!across.swimming && across.y > 0.7, JSON.stringify(across));
    await shot("minimap");

    // Project a dry spot ahead and tap it through the canvas, using the game's real camera.
    await page.waitForTimeout(450);
    const tap = await page.evaluate(() => {
      const { game: g } = window.__ew;
      const rect = g.renderer.domElement.getBoundingClientRect();
      const v = g.player.root.position.clone().set(96.2, 0.72, -83.15).project(g.rig.cam);
      const x = rect.left + (v.x + 1) * rect.width / 2, y = rect.top + (1 - v.y) * rect.height / 2;
      return { x, y, onCanvas: document.elementFromPoint(x, y) === g.renderer.domElement };
    });
    assert(tap.onCanvas, JSON.stringify(tap));
    if (phone) await page.touchscreen.tap(tap.x, tap.y); else await page.mouse.click(tap.x, tap.y);
    await wait(() => window.__ew.game.player.root.position.x > 95.35);
    assert((await state()).y > 0.7);

    await page.evaluate(() => window.__ew.game.autoWalkToObjective());
    const first = page.getByText("„Not many visitors make it out here. Enjoy the view!“", { exact: true });
    await first.waitFor({ timeout: 15000 });
    assert(await page.getByText("Nedaug kas atplaukia iki čia. Pasigrožėkite vaizdu!", { exact: true }).isVisible());
    await shot("keeper");
    await wait(() => {
      const { game: g, store } = window.__ew;
      return g.t - g.keeperSpokeAt >= 3.25 && store.getState().hud.prompt?.kind === "talk";
    });
    await press();
    await page.getByText("„Watch your step on the rocks. They get slippery!“", { exact: true }).waitFor({ timeout: 10000 });
    assert(await page.getByText("Atsargiai ant akmenų – jie slidūs!", { exact: true }).isVisible());

    await page.evaluate(() => window.__ew.game.walkTo(86, -83.15, { kind: "point" }));
    await wait(() => {
      const { game: g, store } = window.__ew;
      return g.player.root.position.x < 86.8 && store.getState().hud.prompt?.kind === "boat";
    });
    const moored = await page.evaluate(() => window.__ew.game.rides.islandBoat());
    assert(moored && moored.x <= 82.95 && moored.id === "beach", JSON.stringify(moored));
    await press();
    await wait(() => window.__ew.game.rides.riding?.id === "beach" && window.__ew.game.rides.phase === "on");
    await move("s", -1, () => wait(() => window.__ew.game.rides.riding.m.x < 77.5));
    const away = await state();
    assert.equal(away.ride, "beach");
    assert(!away.swimming && away.boatX < moored.x - 4, JSON.stringify(away));
    assert.deepEqual(errors, []);
    console.log(`Lighthouse island round trip passed at ${label}`);
    await context.close();
  }
} finally {
  await browser.close();
}
