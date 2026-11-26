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
      const picker = page.locator('.book-picker[open]:is([data-pad-scope="book-shelf"], [data-pad-scope="book-detail"])');
      const reader = page.locator(".book-reader[open]");
      const settings = page.locator(".book-settings[open]");
      const current = () => page.evaluate(() => {
        const state = window.__ew.radio.books.player.getSnapshot();
        return { mode: state.prefs.mode, sentence: state.cue?.sentenceId, language: state.cue?.language,
          intent: state.playIntent, status: state.status, position: state.position };
      });
      await page.evaluate(() => {
        window.__bookPlayer = window.__ew.radio.books.player;
        window.__bookAudios = [];
        const NativeAudio = window.Audio;
        window.Audio = function (...args) {
          const media = new NativeAudio(...args);
          window.__bookAudios.push(media);
          return media;
        };
      });
      const capture = async (state) => {
        if (state === "set-talk") {
          await page.locator(".radio-set").evaluate((el) => Promise.all(
            el.getAnimations().filter((animation) => animation.animationName === "radio-in").map((animation) => animation.finished.catch(() => {})),
          ));
        }
        if (state.startsWith("shelf-")) {
          const covers = picker.locator(".catalog-card[data-cover-expected]");
          const count = await covers.count();
          if (count <= 2) {
            for (let i = 0; i < count; i++) await covers.nth(i).locator("img").waitFor({ state: "attached" });
          }
        }
        await page.evaluate(() => Promise.all([...document.querySelectorAll(".book-picker img, .book-glass-cover img")].map((img) => img.decode().catch(() => {}))));
        await shot(page, `${width}x${height}-${state}`);
      };
      const openSet = async () => {
        const set = page.locator(".radio-set");
        if (await set.isVisible()) return;
        if (phone) {
          await openPhoneMenu(page);
          await page.locator(".radio-btn").tap();
        } else {
          const plate = page.locator(".radio-plate");
          // On a returning visit, desktop power resumes sound. The station plate opens the cabinet.
          if (!(await plate.isVisible())) await page.locator(".radio-btn").click();
          await page.locator(".radio-set, .radio-plate").first().waitFor();
          if (!(await set.isVisible())) await plate.click();
        }
        await readout.waitFor();
      };
      const revealReaderOptions = async () => {
        const more = reader.locator("[data-reader-more]");
        if (await more.isVisible() && await more.getAttribute("aria-expanded") !== "true") await more.click();
      };
      const openListeningSettings = async () => {
        await revealReaderOptions();
        await reader.locator("[data-book-settings]").click();
      };
      const detail = async () => {
        const cover = picker.locator('[data-book="BOOK-CANT"]');
        await cover.click();
        const rail = picker.locator(".rail-action");
        if (await rail.isVisible()) await rail.click();
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
      await reader.locator(".sentence").first().waitFor();
      const meanings = reader.getByRole("button", { name: "Žodžių reikšmės", exact: true });
      if (await meanings.getAttribute("aria-expanded") === "true") await meanings.click();
      await page.waitForFunction(() => document.querySelector(".book-reader .active [data-book-word]")?.textContent === "house", null, { timeout: 20000 });
      await reader.getByRole("button", { name: "Pristabdyti", exact: true }).click();
      assert.equal((await current()).intent, false);
      await capture("reader-paired");
      await meanings.click();
      assert.equal(await meanings.getAttribute("aria-expanded"), "true");
      assert.ok(await reader.locator(".active .u small").count() > 0);
      await capture("reader-meanings");

      if (await reader.locator("[data-reader-more]").isVisible()) {
        await revealReaderOptions();
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.activeElement?.hasAttribute("data-reader-more"));
        assert.ok(await reader.isVisible());
      }
      await openListeningSettings();
      await settings.waitFor();
      assert.equal(await settings.getByRole("radio", { name: "Lietuviškai, tada angliškai", exact: true }).getAttribute("aria-checked"), "true");
      const targetSpeed = settings.getByRole("combobox", { name: "Anglų kalbos greitis", exact: true });
      const helperSpeed = settings.getByRole("combobox", { name: "Lietuvių kalbos greitis", exact: true });
      assert.equal(await targetSpeed.inputValue(), "0.75");
      assert.equal(await helperSpeed.inputValue(), "1");
      if (width === 390 && height === 664) await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
      await capture("settings");
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1 }));
      await targetSpeed.selectOption("0.9");
      await helperSpeed.selectOption("1.25");
      const sentenceBefore = (await current()).sentence;
      await settings.getByRole("radio", { name: "Tik lietuviškai", exact: true }).click();
      assert.equal((await current()).sentence, sentenceBefore);
      assert.equal((await current()).intent, false);
      await page.keyboard.press("Escape");
      await settings.waitFor({ state: "detached" });
      await reader.locator(".helper-primary.audible").waitFor();
      assert.equal(await reader.locator(".target-leg").count(), 0);
      await openListeningSettings();
      await settings.getByRole("radio", { name: "Tik angliškai", exact: true }).click();
      await settings.getByRole("combobox", { name: "Išjungimo laikmatis", exact: true }).selectOption("15");
      await page.keyboard.press("Escape");
      assert.equal((await current()).intent, false);
      const translate = reader.getByRole("button", { name: "Rodyti vertimą", exact: true });
      await translate.click();
      await reader.locator(".active .natural").waitFor();
      await reader.getByRole("button", { name: "Slėpti vertimą", exact: true }).click();

      // A paused sentence click moves the same player. A manual scroll waits for explicit rejoin.
      await reader.locator(".reading").evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await reader.getByRole("button", { name: "Grįžti prie skaitomos eilutės", exact: true }).click();
      await reader.getByRole("button", { name: "Pereiti į 2 eilutę", exact: true }).click();
      assert.equal((await current()).sentence, "BOOK-CANT-01-S002");
      assert.equal((await current()).intent, false);

      assert.ok(await page.evaluate(() => window.__bookPlayer === window.__ew.radio.books.player));
      assert.ok(await page.evaluate(() => window.__bookAudios.filter((media) => !media.paused && !media.ended).length <= 1));
      // Intercept the handoff and use Back to check the original chapter and paused place.
      await page.route("**/knygos/audio/BOOK-CANT-01?mode=english", async (route) => {
        assert.equal(route.request().headers().referer, undefined);
        await route.fulfill({ contentType: "text/html", body: "<title>Course handoff</title>" });
      });
      await revealReaderOptions();
      await reader.getByRole("link", { name: "Atverti kurse", exact: true }).click();
      await page.waitForURL("**/knygos/audio/BOOK-CANT-01?mode=english");
      await page.goBack();
      await page.waitForFunction(() => window.__ew?.store.getState().screen === "play", null, { timeout: 90000 });
      // A full reload can end the native dialog. Open reader through the set again when needed.
      if (!(await reader.count())) {
        await openSet();
        await page.getByRole("radio", { name: /Book FM/ }).click();
        await page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing", null, { timeout: 30000 });
        await page.getByRole("button", { name: "Pristabdyti", exact: true }).click();
        await page.locator("[data-book-reader]").click();
      }
      await reader.waitFor();
      assert.equal((await current()).intent, false);
      await page.unroute("**/knygos/audio/BOOK-CANT-01?mode=english");

      await openListeningSettings();
      await settings.getByRole("radio", { name: "Lietuviškai, tada angliškai", exact: true }).click();
      await settings.getByRole("combobox", { name: "Išjungimo laikmatis", exact: true }).selectOption("off");
      // Listen at a changed target rate, then open and close settings during that same source.
      await page.keyboard.press("Escape");
      await reader.getByRole("button", { name: "Leisti", exact: true }).click();
      await page.waitForFunction(() => {
        const state = window.__ew.radio.books.player.getSnapshot();
        return state.status === "playing" && state.cue?.language === "en" && state.position > state.cue.start + 0.5 && state.position < state.cue.end - 0.2;
      }, null, { timeout: 30000 });
      const midword = await current();
      await openListeningSettings();
      assert.equal((await current()).intent, true);
      assert.ok((await current()).position >= midword.position);
      assert.equal(await settings.getByRole("combobox", { name: "Anglų kalbos greitis", exact: true }).inputValue(), "0.9");
      await page.keyboard.press("Escape");
      await reader.getByRole("button", { name: "Pristabdyti", exact: true }).click();
      await openListeningSettings();
      await settings.getByRole("combobox", { name: "Anglų kalbos greitis", exact: true }).selectOption("0.75");
      await settings.getByRole("combobox", { name: "Lietuvių kalbos greitis", exact: true }).selectOption("1");
      await page.keyboard.press("Escape");

      // Reopen the shelf through the set if the course Back loaded a new game document.
      await reader.getByRole("button", { name: "Pereiti į 1 eilutę", exact: true }).click();
      await reader.getByRole("button", { name: "Leisti", exact: true }).click();
      await page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing");
      await reader.locator("[data-pad-back]").click();
      if (await picker.count()) {
        await page.keyboard.press("Escape");
        if (await picker.count()) await page.keyboard.press("Escape");
      }
      await page.locator(".rs-x").click();
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
      assert.match(await picker.locator(".chapter.current .status").innerText(), /Čia sustojai/);
      const fits = await picker.locator(".primary").evaluate((el) => {
        const { left, top, bottom, right } = el.getBoundingClientRect();
        return top >= 0 && bottom <= innerHeight && left >= 0 && right <= innerWidth && el.clientHeight >= 44;
      });
      assert.ok(fits);
      await capture("a-plus-plus-detail");
      await picker.locator("#chapter-BOOK-CANT-01").click();
      await reader.waitFor();
      await page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing");
      await reader.getByRole("button", { name: "Pristabdyti", exact: true }).click();
      if (width === 390 && height === 664) await capture("reader-a-plus-plus");
      // A rotation while paused keeps the chapter and place.
      const paused = await current();
      await page.setViewportSize({ width: height, height: width });
      await page.setViewportSize({ width, height });
      assert.equal((await current()).intent, false);
      assert.equal((await current()).sentence, paused.sentence);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.id === "chapter-BOOK-CANT-01");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.id === "cover-BOOK-CANT");
      await page.keyboard.press("Escape");
      await picker.waitFor({ state: "detached" });
      assert.ok(await readout.isVisible());
      if (width === 1280 && height === 800) {
        await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1 }));
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.locator("[data-book-reader]").click();
        await reader.waitFor();
        await capture("reader-reduced-motion");
        assert.equal((await current()).intent, false);
        await page.keyboard.press("Escape");
      }
      const oneSource = await page.evaluate(() => (window.__bookAudios ?? []).filter((media) => !media.paused && !media.ended).length <= 1);
      assert.ok(oneSource);
      assert.deepEqual(errors, []);
      console.log(`${width}×${height} Book FM passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
