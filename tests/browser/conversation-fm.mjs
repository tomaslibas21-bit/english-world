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
      const portrait = width <= 600 && height > width;
      const taskWasCollapsed = await page.locator(".objective-card.collapsed").count() > 0;
      if (phone) { await openPhoneMenu(page); await page.locator(".radio-btn").tap(); }
      else await page.locator(".radio-btn").click();
      await page.getByRole("button", { name: "Laidos", exact: true }).click();
      await page.getByRole("radio", { name: /Conversation FM/ }).click();
      const picker = page.locator(".scene-picker[open]");
      await picker.waitFor();
      assert.equal(await picker.locator("[data-scene]").count(), 56);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const shuffle = picker.getByRole("button", { name: "Leisti atsitiktinį pokalbį", exact: true });
      assert(await shuffle.isVisible(), "The full accessible shuffle label remains");
      if (portrait) {
        assert.equal(await picker.locator(".scene-shuffle-short").innerText(), "Atsitiktinis");
        assert.equal(await picker.locator(".scene-shuffle-full").isVisible(), false);
        const intro = await picker.locator(".scene-intro").evaluate((el) => {
          const css = getComputedStyle(el);
          return { display: css.display, wrap: css.flexWrap, padding: css.padding, gap: css.gap,
            heading: getComputedStyle(el.querySelector("h1")).fontSize };
        });
        assert.deepEqual(intro, { display: "flex", wrap: "wrap", padding: "8px 12px", gap: "8px", heading: "24px" });
      }
      await capture("scene-picker");
      if (width >= 651) {
        const index = picker.locator(".scene-place-index");
        assert(await index.isVisible(), "Wide pickers have a place index");
        const links = index.locator("a"), headings = picker.locator(".scene-places h2");
        assert.equal(await links.count(), await headings.count());
        for (let i = 0; i < await links.count(); i++) {
          const link = links.nth(i), href = await link.getAttribute("href");
          assert.equal(await picker.locator(href).count(), 1);
          assert((await link.boundingBox()).height >= 44, "Every place has a 44 px link");
        }
        const url = page.url();
        await links.last().click();
        assert.equal(await page.evaluate(() => document.activeElement?.id), (await links.last().getAttribute("href")).slice(1));
        assert.equal(page.url(), url, "The index scrolls within the picker without adding a history entry");
      }
      await picker.locator('[data-scene="s72-cafe"]').click();

      const strip = page.locator(".scene-walking");
      await strip.locator(".scene-speaker").waitFor();
      const toggle = strip.getByRole("button");
      assert.equal(await toggle.getAttribute("aria-expanded"), "false");
      assert(await strip.locator('.scene-title[lang="en"]').isVisible());
      assert(await page.evaluate(() => {
        const title = document.querySelector(".scene-walking .scene-title");
        return title?.textContent === ` · ${window.__ew.radio.talk.player.getSnapshot().item.title.en}`
          && getComputedStyle(title).fontWeight === "600" && getComputedStyle(title.parentElement).fontWeight === "800";
      }), "The speaker line identifies the selected scene");
      if (portrait) {
        const summary = page.locator(".objective-summary");
        await summary.waitFor();
        assert.equal((await summary.boundingBox()).height, 44);
      }
      if (height <= 500 && width > height) {
        assert.equal(await strip.locator(".walk-meta .translate").count(), 1);
        assert.equal(await toggle.count(), 1);
        assert((await toggle.boundingBox()).height >= 44);
        assert.equal(await strip.evaluate((el) => getComputedStyle(el).padding), "6px 16px 8px");
      }
      await capture("scene-playing-strip");
      if (portrait) {
        await page.locator(".objective-summary").click();
        await page.locator(".objective-card:not(.collapsed)").waitFor();
        await page.locator('.objective-card button[aria-label="Suskleisti"]').click();
        await page.locator(".objective-summary").waitFor();
      }

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
      await page.evaluate(() => window.__ew.radio.pause());
      await strip.waitFor({ state: "detached" });
      if (portrait) {
        assert.equal(await page.locator(".objective-card.collapsed").count() > 0, taskWasCollapsed,
          "Playback restores the earlier task-card state");
        // Keep a manually folded task folded even if it is opened during the next playback episode.
        if (!taskWasCollapsed) await page.locator('.objective-card button[aria-label="Suskleisti"]').click();
        await page.evaluate(() => window.__ew.radio.play());
        await strip.waitFor();
        await page.locator(".objective-summary").click();
        await page.locator(".objective-card:not(.collapsed)").waitFor();
        await page.evaluate(() => window.__ew.radio.pause());
        await strip.waitFor({ state: "detached" });
        await page.locator(".objective-summary").waitFor();
      }
      assert.deepEqual(errors, []);
      console.log(`${width}×${height} Conversation FM passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
