// Run against the Puerto Colibrí review adapter with its local voice-clip map.
// WORLD_LEARNER=en uses port 8721; WORLD_LEARNER=lt uses port 8722.
import assert from "node:assert/strict";

const learner = process.env.WORLD_LEARNER || "en";
assert.ok(learner === "en" || learner === "lt", "Use WORLD_LEARNER=en or WORLD_LEARNER=lt");
const lt = learner === "lt";
process.env.WORLD_STORAGE ||= "puerto-colibri";
assert.equal(process.env.WORLD_STORAGE, "puerto-colibri");
process.env.WORLD_TEST_URL ||= `http://127.0.0.1:${lt ? 8722 : 8721}`;
const copy = lt ? { talk: "Laidos", browse: "Rinktis pokalbį", title: "Čia ar išsinešti?" }
  : { talk: "Talk", browse: "Browse conversations", title: "For here or to go?" };
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
      const capture = (state) => shot(page, `${learner}-${width}x${height}-${state}`);
      assert.equal(await page.locator("html").getAttribute("lang"), learner);
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1, volume: 0.65 }));
      if (phone) { await openPhoneMenu(page); await page.locator(".radio-btn").tap(); }
      else await page.locator(".radio-btn").click();
      await page.getByRole("button", { name: copy.talk, exact: true }).click();
      const station = page.getByRole("radio", { name: /Conversaciones FM/ });
      assert.match(await station.locator(".rs-st-count").textContent(), lt ? /^98,5$/ : /^98\.5$/);
      await station.click();
      const picker = page.locator(".scene-picker.radio-skin-colibri[open]");
      await picker.waitFor();
      assert.equal(await picker.getByRole("heading", { name: copy.browse }).count(), 1);
      assert.equal(await picker.locator("[data-scene]").count(), 64);
      const cafe = picker.locator('[data-place="sunny-cup"] [data-scene="s72-cafe"]');
      assert.equal(await cafe.locator('.target-title[lang="es"]').textContent(), "¿Para aquí o para llevar?");
      assert.equal(await cafe.locator(`.translation[lang="${learner}"]`).textContent(), copy.title);
      assert.equal(await cafe.locator('[data-sit-icon="coffee"]').count(), 1);
      await capture("scene-picker");
      await cafe.click();

      const strip = page.locator(".scene-walking");
      await strip.locator(".scene-speaker").waitFor();
      await strip.locator('.spoken > p[lang="es"]').waitFor();
      const toggle = strip.getByRole("button");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      await capture("scene-playing-strip");

      // Open early in a longer spoken turn so the reveal and screenshot belong to the same line.
      await page.waitForFunction(() => {
        const player = window.__ew.radio.talk.player;
        const { cue, status } = player.getSnapshot();
        return status === "playing" && cue && cue.end - cue.start > 1.9 && cue.end - window.__ew.radio.position() > 1.5;
      }, null, { timeout: 90000 });
      await toggle.click();
      await strip.locator(`.walk-translation[lang="${learner}"]`).waitFor();
      assert.equal(await page.evaluate(() =>
        document.querySelector(".scene-walking .walk-translation")?.textContent === window.__ew.radio.talk.player.getSnapshot().cue?.translation), true);
      await capture("scene-translation");
      await page.waitForFunction(() => !document.querySelector(".scene-walking .walk-translation"));
      assert.deepEqual(errors, []);
      console.log(`${learner} ${width}×${height} Conversaciones FM passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
