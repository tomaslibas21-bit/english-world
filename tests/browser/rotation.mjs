// The live animation loop keeps the drawing buffer, camera and HUD in step after a phone turns.
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/rotation.mjs
// WORLD_BROWSER_CHANNEL selects Chromium's channel. WORLD_SHOTS saves the checked views.
import assert from "node:assert/strict";
import { openTown, shot } from "./screen-harness.mjs";

const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const portrait = { width: 390, height: 844 };
const landscape = { width: 844, height: 390 };
const desktop = { width: 1280, height: 800 };
const landscapeFov = 42.38617142258535;
const boxes = [".stage canvas", ".objective-card", ".toolbar", ".toolbar .ride-menu", ".minimap", ".joy", ".jump-btn"];

function sizeMatches({ width, height }) {
  const state = window.__ew.game.screenState();
  const canvas = document.querySelector(".stage canvas");
  const rect = canvas.getBoundingClientRect();
  return state.w === width && state.h === height && rect.width === width && rect.height === height &&
    canvas.style.width === width + "px" && canvas.style.height === height + "px" &&
    state.bufferW === Math.floor(width * state.pixelRatio) && state.bufferH === Math.floor(height * state.pixelRatio) &&
    Math.abs(state.aspect - width / height) < 0.000001;
}

async function resize(page, size, events) {
  await page.evaluate((events) => {
    window.__hold = events === "held";
    if (events === "early") {
      window.dispatchEvent(new Event("resize"));
      window.__hold = true;
    }
  }, events);
  await page.setViewportSize(size);
  await page.waitForFunction(sizeMatches, size, { timeout: events === "normal" ? 2000 : 500 });
}

const state = (page) => page.evaluate((selectors) => {
  const game = window.__ew.game;
  const box = (selector) => {
    const r = document.querySelector(selector)?.getBoundingClientRect();
    return r ? [r.x, r.y, r.width, r.height] : null;
  };
  const root = document.documentElement;
  const imageHeight = getComputedStyle(root).getPropertyValue("--conversation-image-height");
  const sample = document.createElement("div");
  sample.style.cssText = "position:fixed;visibility:hidden;height:var(--conversation-image-height)";
  root.append(sample);
  const imagePixels = sample.getBoundingClientRect().height;
  sample.remove();
  return {
    screen: game.screenState(), view: game.rig.cam.view, imageHeight, imagePixels,
    boxes: Object.fromEntries(selectors.map((selector) => [selector, box(selector)])),
  };
}, boxes);

const waitForFov = (page, target) => page.waitForFunction((fov) => Math.abs(window.__ew.game.screenState().fov - fov) <= 0.05, target, { timeout: 10000 });

function sameAsFresh(fresh, after) {
  const { fov: beforeFov, ...beforeSize } = fresh.screen;
  const { fov: afterFov, ...afterSize } = after.screen;
  assert.deepEqual(afterSize, beforeSize);
  assert(Math.abs(afterFov - beforeFov) <= 0.1, JSON.stringify({ beforeFov, afterFov }));
  assert.deepEqual(after.view, fresh.view);
  assert.equal(after.imageHeight, fresh.imageHeight);
  assert.equal(after.imagePixels, fresh.imagePixels);
  for (const [selector, before] of Object.entries(fresh.boxes)) {
    const current = after.boxes[selector];
    assert(before && current && current.every((v, i) => Math.abs(v - before[i]) <= 1), JSON.stringify({ selector, before, current }));
  }
}

async function checkPlayer(page, width, height) {
  await page.locator(".objective-card.collapsed").waitFor();
  await page.locator('.toolbar .ride-menu[aria-expanded="false"]').waitFor();
  const { player, obstacles } = await page.evaluate(() => {
    const game = window.__ew.game, cam = game.rig.cam, root = game.player.root.position;
    cam.updateMatrixWorld();
    const { w, h } = game.screenState();
    const point = (offset) => {
      const p = root.clone();
      p.y += offset;
      p.project(cam);
      return { x: (p.x + 1) * w / 2, y: (1 - p.y) * h / 2, z: p.z };
    };
    const foot = point(0), head = point(1.8);
    const obstacles = [...document.querySelectorAll(".objective-card, .minimap, .toolbar .icon-btn, .joy, .jump-btn, .act-btn, .prompt")]
      .filter((el) => getComputedStyle(el).visibility === "visible" && el.getClientRects().length)
      .map((el) => ({ label: el.className, box: el.getBoundingClientRect().toJSON() }));
    return {
      player: { left: Math.min(foot.x, head.x), right: Math.max(foot.x, head.x), top: head.y, bottom: foot.y, depth: [head.z, foot.z] },
      obstacles,
    };
  });
  const { left, right, top, bottom, depth } = player;
  assert(left >= 0 && right <= width && top >= 0 && bottom <= height && depth.every((z) => Math.abs(z) <= 1), JSON.stringify(player));
  assert(bottom - top >= height * 0.17, JSON.stringify(player));
  for (const { label, box } of obstacles) {
    assert(right + 8 <= box.left || left - 8 >= box.right || bottom + 8 <= box.top || top - 8 >= box.bottom,
      JSON.stringify({ player, label, box }));
  }
}

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch(name === "webkit" ? { headless: true } : {
    headless: true,
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
  try {
    const { context, page } = await openTown(browser, portrait.width, portrait.height, true);
    try {
      await page.waitForFunction(sizeMatches, portrait);
      await waitForFov(page, 50);
      await page.waitForFunction(() => window.__ew.game.rig.cam.view?.enabled);
      const fresh = await state(page);
      await shot(page, `rotation-${name}-fresh-portrait`);
      for (const events of ["normal", "held", "early"]) {
        await resize(page, landscape, events);
        assert.equal((await state(page)).screen.pixelRatio, fresh.screen.pixelRatio);
        await waitForFov(page, landscapeFov);
        // (the camera comes in for the short screen at once, whatever the browser's media query says by now; back
        // upright it stands where a fresh portrait has it: `follow` is in the state compared below)
        assert((await state(page)).screen.follow < 1, "the sideways camera stands closer");
        await checkPlayer(page, landscape.width, landscape.height);
        await shot(page, `rotation-${name}-${events}-landscape`);
        if (events === "normal") {
          await page.locator(".objective-card .collapse-btn").tap();
          await page.locator(".objective-card:not(.collapsed)").waitFor();
          await page.locator(".toolbar .ride-menu").tap();
          await page.locator('.toolbar .ride-menu[aria-expanded="true"]').waitFor();
        }
        await resize(page, portrait, events);
        await page.waitForTimeout(2000);
        sameAsFresh(fresh, await state(page));
        await shot(page, `rotation-${name}-${events}-portrait`);
        console.log("ok", name, events, "portrait → landscape → portrait");
      }
    } finally {
      await context.close();
    }

    for (const width of [844, 664]) {
      const { context, page } = await openTown(browser, width, 390, true);
      try {
        await page.waitForFunction(sizeMatches, { width, height: 390 });
        await waitForFov(page, width === 844 ? landscapeFov : 55);
        await checkPlayer(page, width, 390);
        await shot(page, `rotation-${name}-fresh-${width}x390`);
        console.log("ok", name, "fresh landscape", width);
      } finally {
        await context.close();
      }
    }

    const computer = await openTown(browser, desktop.width, desktop.height, false);
    try {
      const { page } = computer;
      await page.waitForFunction(sizeMatches, desktop);
      await waitForFov(page, 55);
      const fresh = (await state(page)).screen;
      const tools = page.locator(".toolbar .icon-btn");
      assert.equal(await page.locator(".toolbar .ride-menu").count(), 0);
      assert.equal(await page.locator(".toolbar .icon-btn:visible").count(), await tools.count());
      assert(await tools.count() >= 8);
      await shot(page, `rotation-${name}-desktop-fresh`);
      await resize(page, { width: 900, height: 700 }, "normal");
      await shot(page, `rotation-${name}-desktop-900x700`);
      await resize(page, desktop, "normal");
      await waitForFov(page, 55);
      // (the lens eases to its place: within a tenth of a degree is there)
      const { fov, ...back } = (await state(page)).screen, { fov: fov0, ...before } = fresh;
      assert.deepEqual(back, before);
      assert(Math.abs(fov - fov0) < 0.1, JSON.stringify({ fov, fov0 }));
      await shot(page, `rotation-${name}-desktop-returned`);
      console.log("ok", name, "desktop resize");
    } finally {
      await computer.context.close();
    }
  } finally {
    await browser.close();
  }
}
