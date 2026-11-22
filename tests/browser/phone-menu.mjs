// The town's tools fold on phone-sized screens, on foot and at the wheel.
// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/phone-menu.mjs
// WORLD_BROWSER_CHANNEL selects Chromium's channel. WORLD_SHOTS saves the checked views.
import assert from "node:assert/strict";
import { openTown, shot } from "./screen-harness.mjs";

const { chromium, webkit } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const phoneSizes = [[390, 844], [390, 664], [375, 667], [844, 390], [664, 390]];
const menu = (page) => page.locator(".toolbar .ride-menu");
const folded = (page) => page.locator('.toolbar .ride-menu[aria-expanded="false"]');

async function checkFolded(page) {
  await folded(page).waitFor();
  assert.equal(await menu(page).getAttribute("aria-controls"), "town-tools");
  const tools = await page.locator(".toolbar .icon-btn").evaluateAll((buttons) => buttons.map((button) => {
    const r = button.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".icon-btn") === button;
    return { title: button.title, menu: button.classList.contains("ride-menu"), hit, hidden: getComputedStyle(button).visibility === "hidden", inert: !!button.closest("[inert]") };
  }));
  assert.deepEqual(tools.filter((tool) => tool.hit).map((tool) => tool.title), ["Meniu"]);
  assert(tools.length >= 9 && tools.filter((tool) => !tool.menu).every((tool) => tool.hidden && tool.inert), JSON.stringify(tools));
}

async function checkOpen(page, width, height) {
  await page.locator('.toolbar .ride-menu[aria-expanded="true"]').waitFor();
  await menu(page).evaluate((button) => Promise.allSettled(button.getAnimations().map((animation) => animation.finished)));
  const { tools, obstacles } = await page.evaluate(() => {
    const box = (el) => el.getBoundingClientRect().toJSON();
    const tools = [...document.querySelectorAll(".toolbar .icon-btn")].map((el) => {
      // (where the layout puts it: a button just let go is still easing back from its pressed scale)
      const style = el.getAttribute("style");
      el.style.transition = "none"; el.style.transform = "none";
      const r = box(el);
      if (style === null) el.removeAttribute("style"); else el.setAttribute("style", style);
      return { title: el.title, ...r, w: el.offsetWidth, h: el.offsetHeight, hit: document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".icon-btn") === el };
    });
    const obstacles = [...document.querySelectorAll(".joy, .jump-btn, .act-btn, .prompt, .minimap, .objective-card")]
      .map((el) => ({ selector: el.className, ...box(el) }));
    return { tools, obstacles };
  });
  for (const button of tools) {
    assert(button.hit && button.w >= 44 && button.h >= 44 && button.left >= 0 && button.top >= 0 && button.right <= width && button.bottom <= height, JSON.stringify(button));
    for (const obstacle of obstacles) assert(button.right <= obstacle.left || button.left >= obstacle.right || button.bottom <= obstacle.top || button.top >= obstacle.bottom, JSON.stringify({ button, obstacle }));
  }
  const [toggle, ...drawer] = tools;
  assert.equal(toggle.title, "Meniu");
  const stop = Math.min(height, ...obstacles.filter((box) => /^(jump-btn|act-btn|prompt)/.test(box.selector)).map((box) => box.top));
  const portrait = height > width, gap = portrait ? 4 : 6, clearance = portrait ? 12 : 8;
  const firstTop = Math.min(...drawer.map((button) => button.top));
  const rowsThatFit = Math.floor((stop - clearance - firstTop + gap) / (44 + gap));
  const ordered = drawer.toSorted((a, b) => b.left - a.left || a.top - b.top);
  const lefts = [...new Set(ordered.map((button) => button.left))];
  const counts = lefts.map((left) => ordered.filter((button) => button.left === left).length);
  assert.equal(lefts[0], toggle.left, JSON.stringify(tools));
  assert.equal(lefts.length, Math.ceil(drawer.length / rowsThatFit), JSON.stringify({ counts, rowsThatFit, drawer }));
  assert(counts.every((rows, i) => i === 0 || rows <= counts[i - 1]) && counts[0] - counts.at(-1) <= 1, JSON.stringify(counts));
  assert(drawer.every((button) => button.bottom + clearance <= stop), JSON.stringify({ stop, drawer }));
  if (width === 390 && height === 844) assert.equal(lefts.length, 1);
  const help = await page.locator('.toolbar [title="Kaip žaisti?"]').count();
  const radioButton = page.locator(".toolbar .radio-btn");
  const radio = await radioButton.count() ? await radioButton.getAttribute("title") : null;
  const course = await page.locator(".toolbar .course-link").count();
  assert.deepEqual(ordered.map((button) => button.title), [
    "Visos situacijos", "Žemėlapis (M)", "Užduotys (J)", "Telefonas (P)", "Frazių knygelė", "Nustatymai (Esc)",
    ...(help ? ["Kaip žaisti?"] : []), ...(radio ? [radio] : []), "Lengvas režimas", ...(course ? ["Grįžti į kursą"] : []),
  ]);
}

async function getInCar(page) {
  await page.waitForFunction(() => window.__ew.game.ledges?.ready);
  await page.evaluate(() => {
    const game = window.__ew.game, car = game.rides.list.find((ride) => ride.kind === "car"), heading = car.m.heading;
    const x = car.m.x + Math.cos(heading) * 2.2, z = car.m.z - Math.sin(heading) * 2.2;
    game.keys.clear();
    game.enterZone("town", { x, z, rot: heading }, true);
    game.rig.yaw = heading;
    game.rig.snap();
  });
  await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "drive");
  await page.locator(".act-btn").tap();
  await page.waitForFunction(() => {
    const game = window.__ew.game;
    return game.rides.riding?.kind === "car" && game.rides.phase === "on" && window.__ew.store.getState().hud.prompt?.kind === "out";
  });
}

for (const [name, engine] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await engine.launch(name === "webkit" ? { headless: true } : {
    headless: true,
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
  try {
    for (const [width, height] of phoneSizes) {
      const { context, page } = await openTown(browser, width, height, true);
      const label = `phone-menu-${name}-${width}x${height}`;
      try {
        await checkFolded(page);
        await shot(page, `${label}-folded`);
        await menu(page).tap();
        await checkOpen(page, width, height);
        await shot(page, `${label}-open`);

        await page.locator('.toolbar button[title="Žemėlapis (M)"]').tap();
        await page.locator(".sheet .map-wrap").waitFor();
        await shot(page, `${label}-map`);
        await page.locator(".sheet .close-x").tap();
        await checkFolded(page);
        await shot(page, `${label}-map-closed`);

        await menu(page).tap();
        await page.evaluate(() => {
          window.__townTap = false;
          document.querySelector(".stage canvas").addEventListener("pointerdown", () => { window.__townTap = true; }, { once: true });
        });
        await page.touchscreen.tap(width / 2, height / 2);
        await checkFolded(page);
        assert.equal(await page.evaluate(() => window.__townTap), true, "The outside tap reached the 3D view");
        await shot(page, `${label}-outside`);

        await menu(page).tap();
        await page.waitForTimeout(4400);
        assert.equal(await menu(page).getAttribute("aria-expanded"), "true");
        await folded(page).waitFor({ timeout: 2000 });
        await checkFolded(page);
        await shot(page, `${label}-idle`);

        await menu(page).tap();
        await menu(page).tap();
        await checkFolded(page);
        await menu(page).tap();
        await page.keyboard.press("Escape");
        await page.locator(".sheet .close-x").waitFor();
        await page.keyboard.press("Escape");
        await checkFolded(page);

        if (width === 390 && height === 844) {
          if (await page.locator(".toolbar .radio-btn").count()) {
            await menu(page).tap();
            await page.evaluate(() => window.__ew.radio.setOpen(true));
            await page.locator(".radio-set").waitFor();
            await page.waitForTimeout(5200);
            assert.equal(await menu(page).getAttribute("aria-expanded"), "true");
            await shot(page, `${label}-radio`);
            await page.locator(".radio-set .rs-x").tap();
            await menu(page).tap();
            await checkFolded(page);
          }
          await menu(page).tap();
          await page.evaluate(() => window.__ew.game.startScenario("s72-cafe"));
          await page.waitForFunction(() => window.__ew.store.getState().conv.active);
          await menu(page).waitFor({ state: "detached" });
          await page.evaluate(() => window.__ew.game.closeConversation());
          await checkFolded(page);
          await shot(page, `${label}-conversation-closed`);

          await getInCar(page);
          await checkFolded(page);
          await shot(page, `${label}-driving-folded`);
          await menu(page).tap();
          await checkOpen(page, width, height);
          await shot(page, `${label}-driving-open`);
        }
        console.log("ok", label);
      } finally {
        await context.close();
      }
    }
    const { context, page } = await openTown(browser, 1280, 800, false);
    try {
      assert.equal(await menu(page).count(), 0);
      const tools = page.locator(".toolbar .icon-btn");
      const towns = page.locator(".toolbar-tools button.icon-btn");
      assert.equal(await towns.count(), 7);
      assert.equal(await page.locator(".toolbar .icon-btn:visible").count(), await tools.count());
      assert.equal(await page.locator(".toolbar-extra .light-mode-btn:visible").count(), 1);
      const columns = await tools.evaluateAll((buttons) => new Set(buttons.map((button) => button.getBoundingClientRect().left)).size);
      const radio = await page.locator(".toolbar .radio-btn").count();
      const course = await page.locator(".toolbar .course-link").count();
      assert.equal(await tools.count(), 8 + radio + course);
      assert.equal(columns, radio ? 2 : 1);
      await shot(page, `phone-menu-${name}-desktop`);
      console.log("ok", name, "desktop toolbar");
      await page.setViewportSize({ width: 390, height: 844 });
      await checkFolded(page);
      await menu(page).click();
      await checkOpen(page, 390, 844);
      await shot(page, `phone-menu-${name}-narrow-desktop`);
    } finally {
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
