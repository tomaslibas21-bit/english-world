// Run against the ordinary Maple Harbor review game with real local narration.
// WORLD_TEST_URL=http://127.0.0.1:8720 WORLD_SHOTS=... WORLD_PLAYWRIGHT_MODULE=... node tests/browser/book-fm.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
process.env.WORLD_TEST_URL ||= "http://127.0.0.1:8720";
const { openTown, openPhoneMenu, shot } = await import("./screen-harness.mjs");
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const timing = JSON.parse(await readFile(new URL("../fixtures/books/BOOK-CANT-01-timing.json", import.meta.url)));
const firstLine = timing.timeline[0].text;
const browser = await chromium.launch({
  headless: true, channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
});
try {
  for (const [width, height] of [[390, 844], [390, 664], [844, 390], [1280, 800]]) {
    const phone = width < 900;
    const { page, context } = await openTown(browser, width, height, phone);
    try {
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1, volume: 0.65 }));
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const readout = page.locator(".rs-station");
      const picker = page.locator(".book-picker[open]");
      const capture = async (state) => {
        await page.evaluate(() => Promise.all([...document.querySelectorAll(".book-picker img, .book-glass-cover img")].map((img) => img.decode().catch(() => {}))));
        await shot(page, `${width}x${height}-${state}`);
      };
      const openSet = async () => {
        if (phone) {
          await openPhoneMenu(page);
          await page.locator(".radio-btn").tap();
        } else if (await page.locator(".radio-plate").count()) await page.locator(".radio-plate").click();
        else await page.locator(".radio-btn").click();
        await readout.waitFor();
      };
      const detail = async () => {
        const cover = picker.locator('[data-book="BOOK-CANT"]');
        await cover.click();
        const rail = picker.locator(".rail-action");
        if (width > 650) await rail.click();
        await picker.locator("#chapter-BOOK-CANT-01").waitFor();
      };
      await openSet();
      const before = await readout.textContent();
      await page.getByRole("button", { name: "Laidos", exact: true }).click();
      assert.equal(await readout.textContent(), before);
      await page.getByRole("radio", { name: /Book FM/ }).click();
      await picker.locator('[data-book="BOOK-CANT"] img').waitFor();
      assert.equal(await picker.locator(".resume").count(), 0);
      await capture("shelf-new");
      await detail();
      assert.equal(await picker.locator(".primary").textContent(), "Pradėti klausytis");
      await capture("detail");
      await picker.locator("#chapter-BOOK-CANT-01").click();
      const spoken = page.locator(".book-walking .spoken p").first();
      await page.waitForFunction((text) => document.querySelector(".book-walking .spoken p")?.textContent === text, firstLine, { timeout: 30000 });
      assert.equal(await spoken.getAttribute("lang"), "lt");
      await capture("playing-strip");
      await openSet();
      await capture("set-talk");
      await page.getByRole("button", { name: "Pristabdyti", exact: true }).click();
      await page.waitForFunction(() => !window.__ew.radio.store.getState().playing);
      assert.equal(await readout.textContent(), "Book FM");
      await page.locator("[data-book-browse]").click();
      await picker.locator(".resume").waitFor();
      assert.match(await picker.locator(".resume").innerText(), /Klausytis toliau[\s\S]*The Canterville Ghost[\s\S]*A house with a warning/);
      await capture("shelf-continue");
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
      await detail();
      const fits = await picker.locator(".primary").evaluate((el) => {
        const { left, top, bottom, right } = el.getBoundingClientRect();
        return top >= 0 && bottom <= innerHeight && left >= 0 && right <= innerWidth && el.clientHeight >= 44;
      });
      assert.ok(fits);
      await capture("a-plus-plus-detail");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.id === "cover-BOOK-CANT");
      await page.keyboard.press("Escape");
      await picker.waitFor({ state: "detached" });
      assert.ok(await readout.isVisible());
      assert.deepEqual(errors, []);
      console.log(`${width}×${height} Book FM passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
