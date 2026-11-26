// Run against the Maple Harbor review adapter with its local voice-clip map.
import assert from "node:assert/strict";
process.env.WORLD_TEST_URL ||= "http://127.0.0.1:8720";
const { openTown, openPhoneMenu, shot } = await import("./screen-harness.mjs");
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  headless: true, channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
});
try {
  for (const [width, height] of [[390, 844], [390, 664], [844, 390], [1280, 800]]) {
    const phone = width < 900;
    const { page, context } = await openTown(browser, width, height, phone);
    try {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const capture = (state) => shot(page, `${width}x${height}-${state}`);
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1, volume: 0.65 }));
      if (phone) { await openPhoneMenu(page); await page.locator(".radio-btn").tap(); }
      else await page.locator(".radio-btn").click();
      await page.getByRole("button", { name: "Laidos", exact: true }).click();
      await page.getByRole("radio", { name: /Conversation FM/ }).click();
      const picker = page.locator(".scene-picker[open]");
      await picker.waitFor();
      assert.equal(await picker.locator("[data-scene]").count(), 56);
      await capture("scene-picker");
      await picker.locator('[data-scene="s72-cafe"]').click();

      const strip = page.locator(".scene-walking");
      await strip.locator(".scene-speaker").waitFor();
      const toggle = strip.getByRole("button");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await capture("scene-playing-strip");

      // Open early in a longer spoken turn so the reveal and screenshot belong to the same line.
      await page.waitForFunction(() => {
        const player = window.__ew.radio.talk.player;
        const { cue, status } = player.getSnapshot();
        return status === "playing" && cue && cue.end - cue.start > 2.5 && cue.end - window.__ew.radio.position() > 2;
      }, null, { timeout: 90000 });
      await toggle.click();
      await strip.locator('.walk-translation[lang="lt"]').waitFor();
      assert.equal(await page.evaluate(() =>
        document.querySelector(".scene-walking .walk-translation")?.textContent === window.__ew.radio.talk.player.getSnapshot().cue?.translation), true);
      await capture("scene-translation");
      await page.waitForFunction(() => !document.querySelector(".scene-walking .walk-translation"));
      assert.deepEqual(errors, []);
      console.log(`${width}×${height} Conversation FM passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
