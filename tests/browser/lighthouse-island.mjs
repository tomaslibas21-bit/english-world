// WORLD_TEST_URL=http://127.0.0.1:5188 node tests/browser/lighthouse-island.mjs [--shots=dir]
// WORLD_BASELINE_URL may point to the pre-island build for a second measurement from the same harbor camera.
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const baseline = process.env.WORLD_BASELINE_URL;
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.argv.find((a) => a.startsWith("--shots="))?.slice(8);
if (shots) mkdirSync(shots, { recursive: true });

const spawn = { zone: "town", x: -6.5, z: -64, rot: Math.PI };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 5, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: spawn, coach: { done: true, run: true },
};
const phoneView = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: "reduce" };
const desktopView = { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" };
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true });

async function open(context, url) {
  const page = await context.newPage();
  await page.route("**/*.mp3", (route) => route.fulfill({ status: 204 }));
  await page.addInitScript(([key, data]) => {
    localStorage.setItem(key, data);
    sessionStorage.setItem("ew-play-now", "1");
  }, [storage + "-progress-v1", JSON.stringify(progress)]);
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game?.ledges?.ready,
    null, { timeout: 120000 });
  await page.evaluate(() => {
    window.__ew.coach?.finish?.();
    window.__ew.store.getState().setHud({ panel: null });
  });
  return page;
}

async function harborCalls(page) {
  await page.evaluate(() => window.__ew.game.enterZone("town", { x: 101, z: -65, rot: Math.PI }, true));
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  return page.evaluate(() => {
    const { game: g } = window.__ew;
    const island = g.islandScene?.group;
    const cam = g.rig.cam.clone();
    cam.position.set(102, 8.5, -63);
    cam.lookAt(102, 3.1, -89);
    cam.updateMatrixWorld(true);
    const render = () => {
      g.renderer.render(g.scene, cam);
      return g.renderer.info.render.calls;
    };
    const after = render();
    if (!island) return { after };
    island.visible = false;
    try { return { after, hidden: render() }; }
    finally { island.visible = true; }
  });
}

try {
  let originalCalls;
  if (baseline) {
    const context = await browser.newContext(phoneView);
    originalCalls = (await harborCalls(await open(context, baseline))).after;
    await context.close();
  }

  for (const phone of [true, false]) {
    const context = await browser.newContext(phone ? phoneView : desktopView);
    const page = await open(context, base);
    const label = phone ? "390x844" : "1280x800";
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
      const calls = await harborCalls(page);
      const delta = calls.after - calls.hidden;
      assert(delta > 0 && delta <= 6, JSON.stringify(calls));
      console.log(`390x844 harbor draw calls, island hidden/visible ${calls.hidden}/${calls.after} (+${delta})`);
      if (originalCalls !== undefined) console.log(`390x844 harbor draw calls, original/current ${originalCalls}/${calls.after}`);
      await page.evaluate((at) => window.__ew.game.enterZone("town", at, true), spawn);
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
