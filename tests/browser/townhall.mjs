// Use a local game server and an installed Playwright, like the other town browser checks.
import assert from "node:assert/strict";
import { openTown, shot } from "./screen-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  executablePath: process.env.WORLD_CHROMIUM, args: ["--enable-unsafe-swiftshader"],
});
try {
  const { page } = await openTown(browser, 390, 844, true);
  await page.evaluate(() => {
    const g = window.__ew.game;
    g.enterZone("town", { x: 90, z: 43, rot: 0 }, true);
  });
  await page.waitForFunction(() => !window.__ew.game.transitioning && window.__ew.game.zone.id === "town");
  await page.evaluate(() => window.__ew.game.guideToPlace("town-hall"));
  await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.label.includes("Town Hall"));
  await page.locator(".hud .prompt").tap();
  await page.waitForFunction(() => !window.__ew.game.transitioning && window.__ew.game.zone.id === "town-hall");
  await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "passport");
  await shot(page, "doorway");
  await page.evaluate(() => window.__ew.game.walkTo(0, 0.1, { kind: "point" }));
  await page.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "passport");
  await page.locator(".hud .prompt").tap();
  const index = page.locator(".passport-index");
  for (const [height, scale] of [[844, 1], [664, 1.3]]) {
    await page.setViewportSize({ width: 390, height });
    await page.evaluate(scale => window.__ew.store.getState().setSettings({ textSize: scale }), scale);
    await page.waitForFunction(large => document.querySelector(".passport")?.dataset.large === String(large), scale > 1);
    assert.equal(await page.locator(".passport-proof").count(), 0);
    const firstPairFits = await index.evaluate(el => {
      const picker = document.querySelector(".passport-picker").getBoundingClientRect();
      const bounds = el.getBoundingClientRect();
      return el.scrollTop === 0 && [...el.querySelectorAll(".passport-cell")].slice(0, 2).every(cell => {
        const box = cell.getBoundingClientRect();
        return box.top >= picker.bottom && box.bottom <= bounds.bottom && box.height >= 44;
      }) && el.querySelector(".passport-cell").getBoundingClientRect().top - picker.bottom < 20;
    });
    assert(firstPairFits, "two complete choices immediately follow the picker at " + height);
    await shot(page, height === 844 ? "fresh-save" : "large-index");
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1 }));
  const row = page.locator('[data-stamp="situations:s72-cafe"]');
  const next = page.getByRole("button", { name: "Kitas puslapis", exact: true });
  while (!(await row.count())) {
    assert(await next.isEnabled(), "the café belongs to the situation index");
    await next.tap();
  }
  await row.tap();
  assert.equal(await page.locator(".passport-proof").getAttribute("data-earned"), "false");
  await shot(page, "cafe-outline");
  await page.keyboard.press("Escape");
  assert(await row.evaluate(el => el === document.activeElement));
  await page.keyboard.press("Escape");
  await page.waitForSelector(".passport", { state: "detached" });
  await page.evaluate(() => {
    window.__ew.store.getState().updateProgress(p => {
      p.sits["s72-cafe"] = { completions: 1, visits: 1, used: [], twists: [], memory: {} };
    });
    const pad = { id: "Passport review controller", mapping: "standard", index: 0, connected: true, timestamp: 0,
      axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0, touched: false })) };
    Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad] });
    window.dispatchEvent(Object.assign(new Event("gamepadconnected"), { gamepad: pad }));
    const frames = () => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    window.tapPassportPad = async i => {
      Object.assign(pad.buttons[i], { pressed: true, value: 1, touched: true }); pad.timestamp++;
      await frames();
      Object.assign(pad.buttons[i], { pressed: false, value: 0, touched: false }); pad.timestamp++;
      await frames();
    };
  });
  await page.waitForFunction(() => window.__pad?.connected);
  const tap = i => page.evaluate(i => window.tapPassportPad(i), i);
  await tap(2); // X at the counter
  await page.waitForSelector(".passport[data-detail=true] .printing");
  assert.match(await page.locator(".passport-proof").innerText(), /Conversations completed · 1/);
  await page.waitForSelector("[data-pad-hint][data-pad-positioned]");
  assert(await page.locator(".passport-pad-dock [data-pad-slot]").count(), "controller notice has reserved cover space");
  assert(await page.locator(".passport-proof").evaluate(proof => {
    const toast = document.querySelector("[data-pad-hint]").getBoundingClientRect();
    const receipt = [".passport-mark", ".stars", "li"].map(s => proof.querySelector(s).getBoundingClientRect());
    const paper = document.querySelector(".passport-evidence").getBoundingClientRect();
    return getComputedStyle(document.querySelector(".passport-layer")).animationName === "none"
      && getComputedStyle(proof).backgroundColor.startsWith("rgb(")
      && receipt.every(b => b.height > 0 && b.top >= paper.top && b.bottom <= paper.bottom && b.bottom <= toast.top);
  }), "cup, journal stars and completion count share an opaque leaf clear of the controller notice");
  await shot(page, "cafe-earned");
  await tap(1); // B to the index
  assert(await row.evaluate(el => el === document.activeElement));
  await tap(15); // D-pad right, A to read its evidence
  await tap(0);
  await page.waitForSelector(".passport[data-detail=true]");
  await tap(1);
  await tap(1);
  await page.waitForSelector(".passport", { state: "detached" });
  assert(await page.locator(".hud .prompt").evaluate(el => el === document.activeElement));
  console.log("Town hall touch, pagination, café proof, controller and keyboard return passed.");
} finally { await browser.close(); }
