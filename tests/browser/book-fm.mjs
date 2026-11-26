// Run on the normal Puerto Colibrí review game with local narration.
// WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en WORLD_TEST_URL=http://127.0.0.1:8721 WORLD_SHOTS=... node tests/browser/book-fm.mjs
// For SM use WORLD_LEARNER=lt and port 8722.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const learner = process.env.WORLD_LEARNER || "en";
assert.ok(learner === "en" || learner === "lt", "Use WORLD_LEARNER=en or WORLD_LEARNER=lt");
process.env.WORLD_STORAGE ||= "puerto-colibri";
assert.equal(process.env.WORLD_STORAGE, "puerto-colibri");
const lithuanian = learner === "lt";
process.env.WORLD_TEST_URL ||= `http://127.0.0.1:${lithuanian ? 8722 : 8721}`;
const { openTown, openPhoneMenu, shot } = await import("./screen-harness.mjs");
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const fixture = JSON.parse(await readFile(new URL(`../${lithuanian ? "es-lt" : "es"}/fixtures/books/BK01-01.json`, import.meta.url)));
const [firstLine, targetTitle] = fixture.timing.timeline.map(({ text }) => text);
const courseUrl = `**/${lithuanian ? "knygos" : "books"}/audio/BK01-01?mode=english`;
const copy = lithuanian ? {
  library: "Kolibrių uosto biblioteka", talk: "Laidos", start: "Pradėti klausytis", resume: "Klausytis toliau",
  meanings: "Žodžių reikšmės", pause: "Pristabdyti", play: "Leisti", paired: "Lietuviškai, tada ispaniškai",
  targetSpeed: "Ispanų kalbos greitis", helperSpeed: "Lietuvių kalbos greitis", helperOnly: "Tik lietuviškai",
  targetOnly: "Tik ispaniškai", sleep: "Išjungimo laikmatis", showTranslation: "Rodyti vertimą",
  hideTranslation: "Slėpti vertimą", rejoin: "Grįžti prie skaitomos eilutės", line1: "Pereiti į 1 eilutę",
  line2: "Pereiti į 2 eilutę", course: "Atverti kurse", stopped: "Čia sustojai",
  options: "Rodyti klausymo parinktis", settings: "Klausymo nustatymai", browse: "Rinktis knygą", reader: "Atverti skaityklę",
} : {
  library: "Biblioteca de Puerto Colibrí", talk: "Talk", start: "Start listening", resume: "Continue listening",
  meanings: "Word meanings", pause: "Pause", play: "Play", paired: "English, then Spanish",
  targetSpeed: "Spanish speed", helperSpeed: "English speed", helperOnly: "English only",
  targetOnly: "Spanish only", sleep: "Sleep timer", showTranslation: "Show translation",
  hideTranslation: "Hide translation", rejoin: "Back to current line", line1: "Go to line 1",
  line2: "Go to line 2", course: "Open in course", stopped: "You stopped here",
  options: "Show listening options", settings: "Listening settings", browse: "Browse books", reader: "Open reader",
};

const browser = await chromium.launch({
  headless: true, channel: process.env.WORLD_BROWSER_CHANNEL || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--autoplay-policy=document-user-activation-required"],
});
try {
  for (const [width, height] of [[390, 844], [390, 664], [844, 390], [1280, 800]]) {
    const phone = width < 900;
    const { page, context } = await openTown(browser, width, height, phone);
    try {
      assert.equal(await page.locator("html").getAttribute("lang"), learner);
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1, volume: 0.65 }));
      const errors = [], startupMessages = [];
      page.on("console", (message) => {
        if (/Town startup failed|WebGL|context lost/i.test(message.text())) {
          startupMessages.push(message.text());
          if (startupMessages.length > 10) startupMessages.shift();
        }
      });
      page.on("pageerror", (e) => errors.push(e.message));
      const set = page.locator(".radio-set");
      const readout = set.locator(".rs-station");
      const picker = page.locator('.book-picker[open]:is([data-pad-scope="book-shelf"], [data-pad-scope="book-detail"])');
      const reader = page.locator(".book-reader[open]");
      const settings = page.locator(".book-settings[open]");
      const more = reader.getByRole("button", { name: copy.options, exact: true });
      const revealReaderOptions = async () => {
        if (await more.isVisible() && await more.getAttribute("aria-expanded") !== "true") await more.click();
      };
      const openListeningSettings = async () => {
        await revealReaderOptions();
        await reader.locator("[data-book-settings]").click();
      };
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
        await page.evaluate(() => Promise.all([...document.querySelectorAll(".book-picker img, .book-glass-cover img")].map((img) => img.decode().catch(() => {}))));
        await shot(page, `${learner}-${width}x${height}-${state}`);
      };
      const openSet = async () => {
        for (let depth = 0; depth < 4 && await page.locator(".book-picker[open]").count(); depth++) {
          const top = page.locator(".book-picker[open]:not([inert])");
          const scope = await top.getAttribute("data-pad-scope");
          await top.locator(".mast [data-pad-back]").click();
          await page.waitForFunction((previous) =>
            document.querySelector(".book-picker[open]:not([inert])")?.getAttribute("data-pad-scope") !== previous, scope);
        }
        assert.equal(await page.locator(".book-picker[open]").count(), 0);
        if (!(await set.isVisible()) && phone) {
          await openPhoneMenu(page);
          await page.locator(".radio-btn").tap();
        } else if (!(await set.isVisible())) {
          const plate = page.locator(".radio-plate");
          if (!(await plate.isVisible())) await page.locator(".radio-btn").click();
          await page.locator(".radio-set, .radio-plate").first().waitFor();
          if (!(await set.isVisible())) await plate.click();
        }
        await readout.waitFor();
        assert.equal(await set.getAttribute("inert"), null);
      };
      const courseBackSnapshot = async (state) => {
        const diagnostic = await page.evaluate(() => ({
          url: location.href, ready: document.readyState, navigation: performance.getEntriesByType("navigation")[0]?.type,
          screen: window.__ew?.store.getState().screen ?? null, startupError: document.querySelector(".startup-error")?.textContent,
          dialogs: [...document.querySelectorAll(".book-picker[open]")].map((el) => el.getAttribute("data-pad-scope")),
        }));
        console.log(`${learner} ${width}×${height} ${state}`, JSON.stringify({ ...diagnostic, errors, startupMessages }));
        const directory = process.env.WORLD_SHOTS || fileURLToPath(new URL("../../.b8/review/book-fm/", import.meta.url));
        await mkdir(directory, { recursive: true });
        await page.screenshot({ path: join(directory, `${learner}-${width}x${height}-${state}.png`) });
      };
      const detail = async () => {
        const cover = picker.locator('[data-book="BK01"]');
        await cover.click();
        const rail = picker.locator(".rail-action");
        if (await rail.isVisible()) await rail.click();
        await picker.locator("#chapter-BK01-01").waitFor();
      };
      await openSet();
      const before = await readout.textContent();
      await page.getByRole("button", { name: copy.talk, exact: true }).click();
      assert.equal(await readout.textContent(), before);
      await page.locator('[data-station="books"]').click();
      await picker.locator('[data-book="BK01"] img').waitFor();
      assert.equal(await picker.getByRole("heading", { name: copy.library, exact: true }).count(), 1);
      assert.equal(await picker.locator(".resume").count(), 0);
      assert.equal(await picker.locator("[data-cover-expected]").count(), 2);
      if (width >= 1000) {
        assert.equal(await picker.locator(".rail").count(), 0);
        const bounds = await picker.locator(".book-sheet").boundingBox();
        assert.ok(bounds && bounds.width <= 720 && bounds.height <= 560);
        await openSet();
        await capture("set-talk-new");
        await set.locator(".book-actions").getByRole("button", { name: copy.browse, exact: true }).click();
      }
      await capture("shelf-new");
      await detail();
      assert.equal(await picker.locator(".primary").textContent(), copy.start);
      await capture("detail");
      await picker.locator("#chapter-BK01-01").click();
      await reader.locator(".sentence").first().waitFor();
      const meanings = reader.getByRole("button", { name: copy.meanings, exact: true });
      if (await meanings.getAttribute("aria-expanded") === "true") await meanings.click();
      await page.waitForFunction(() => document.querySelector(".book-reader .active [data-book-word]")?.textContent === "tortuga", null, { timeout: 20000 });
      await reader.getByRole("button", { name: copy.pause, exact: true }).click();
      assert.equal((await current()).intent, false);
      assert.equal(await page.locator(".book-picker[open]:not([inert])").count(), 1);
      assert.equal(await picker.locator(".book-sheet").isVisible(), false);
      await capture("reader-paired");
      await meanings.click();
      assert.equal(await meanings.getAttribute("aria-expanded"), "true");
      assert.ok(await reader.locator(".active .u small").count() > 0);
      await capture("reader-meanings");

      if (await more.isVisible()) {
        await revealReaderOptions();
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => document.activeElement?.hasAttribute("data-reader-more"));
        assert.ok(await reader.isVisible());
      }
      await openListeningSettings();
      await settings.waitFor();
      assert.equal(await settings.getByRole("heading", { name: copy.settings, exact: true }).count(), 1);
      assert.equal(await page.locator(".book-picker[open]:not([inert])").count(), 1);
      assert.equal(await reader.locator(".book-sheet").isVisible(), false);
      assert.equal(await settings.getByRole("radio", { name: copy.paired, exact: true }).getAttribute("aria-checked"), "true");
      const targetSpeed = settings.getByRole("combobox", { name: copy.targetSpeed, exact: true });
      const helperSpeed = settings.getByRole("combobox", { name: copy.helperSpeed, exact: true });
      assert.equal(await targetSpeed.inputValue(), "0.75");
      assert.equal(await helperSpeed.inputValue(), "1");
      if (width === 390 && height === 664) await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
      await capture("settings");
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1 }));
      await targetSpeed.selectOption("0.9");
      await helperSpeed.selectOption("1.25");
      const sentenceBefore = (await current()).sentence;
      await settings.getByRole("radio", { name: copy.helperOnly, exact: true }).click();
      assert.equal((await current()).sentence, sentenceBefore);
      assert.equal((await current()).intent, false);
      await page.keyboard.press("Escape");
      await settings.waitFor({ state: "detached" });
      await reader.locator(".helper-primary.audible").waitFor();
      assert.equal(await reader.locator(".target-leg").count(), 0);
      await openListeningSettings();
      await settings.getByRole("radio", { name: copy.targetOnly, exact: true }).click();
      await settings.getByRole("combobox", { name: copy.sleep, exact: true }).selectOption("15");
      await page.keyboard.press("Escape");
      assert.equal((await current()).intent, false);
      const translate = reader.getByRole("button", { name: copy.showTranslation, exact: true });
      await translate.click();
      await reader.locator(".active .natural").waitFor();
      await reader.getByRole("button", { name: copy.hideTranslation, exact: true }).click();

      // A paused sentence click moves the same player. A manual scroll waits for explicit rejoin.
      await reader.locator(".reading").evaluate((el) => { el.scrollTop = el.scrollHeight; });
      await reader.getByRole("button", { name: copy.rejoin, exact: true }).click();
      await reader.getByRole("button", { name: copy.line2, exact: true }).click();
      assert.equal((await current()).sentence, "BK01-01-intro-01");
      assert.equal((await current()).intent, false);

      assert.ok(await page.evaluate(() => window.__bookPlayer === window.__ew.radio.books.player));
      assert.ok(await page.evaluate(() => window.__bookAudios.filter((media) => !media.paused && !media.ended).length <= 1));
      // Intercept the handoff and use Back to check the original chapter and paused place.
      await page.route(courseUrl, async (route) => {
        assert.equal(route.request().headers().referer, undefined);
        await route.fulfill({ contentType: "text/html", body: "<title>Course handoff</title>" });
      });
      await revealReaderOptions();
      await reader.getByRole("link", { name: copy.course, exact: true }).click();
      await page.waitForURL(courseUrl);
      try {
        await page.goBack({ waitUntil: "domcontentloaded" });
        if (width >= 1000) await courseBackSnapshot("course-back");
        const returned = await page.waitForFunction(() => {
          const shown = (selector) => {
            const el = document.querySelector(selector);
            return !!el?.getClientRects().length && getComputedStyle(el).visibility !== "hidden";
          };
          if (shown(".startup-error")) return "startup-error";
          if (shown(".ts-go")) return "title";
          return window.__ew?.store.getState().screen === "play" && shown(".toolbar") ? "play" : null;
        }, null, { timeout: 90_000 });
        const screen = await returned.jsonValue();
        if (screen === "title") await page.locator(".ts-go").click();
        else assert.equal(screen, "play");
        await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && document.querySelector(".toolbar"), null, { timeout: 90_000 });
      } catch (error) {
        await courseBackSnapshot("course-back-failed").catch((cause) => console.error(cause.message));
        throw error;
      }
      // A full reload can end the native dialog. Open reader through the set again when needed.
      if (!(await reader.count())) {
        await openSet();
        await page.locator('[data-station="books"]').click();
        await page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing", null, { timeout: 30000 });
        await page.getByRole("button", { name: copy.pause, exact: true }).click();
        await page.locator("[data-book-reader]").click();
      }
      await reader.waitFor();
      assert.equal((await current()).intent, false);
      await page.unroute(courseUrl);

      await openListeningSettings();
      await settings.getByRole("radio", { name: copy.paired, exact: true }).click();
      await settings.getByRole("combobox", { name: copy.sleep, exact: true }).selectOption("off");
      // Listen at a changed target rate, then open and close settings during that same source.
      await page.keyboard.press("Escape");
      await reader.getByRole("button", { name: copy.play, exact: true }).click();
      await page.waitForFunction(() => {
        const state = window.__ew.radio.books.player.getSnapshot();
        return state.status === "playing" && state.cue?.language === "es" && state.position > state.cue.start + 0.5 && state.position < state.cue.end - 0.2;
      }, null, { timeout: 30000 });
      const midword = await current();
      await openListeningSettings();
      assert.equal((await current()).intent, true);
      assert.ok((await current()).position >= midword.position);
      assert.equal(await settings.getByRole("combobox", { name: copy.targetSpeed, exact: true }).inputValue(), "0.9");
      await page.keyboard.press("Escape");
      await reader.getByRole("button", { name: copy.pause, exact: true }).click();
      await openListeningSettings();
      await settings.getByRole("combobox", { name: copy.targetSpeed, exact: true }).selectOption("0.75");
      await settings.getByRole("combobox", { name: copy.helperSpeed, exact: true }).selectOption("1");
      await page.keyboard.press("Escape");

      // Reopen the shelf through the set if the course Back loaded a new game document.
      await reader.getByRole("button", { name: copy.line1, exact: true }).click();
      await reader.getByRole("button", { name: copy.play, exact: true }).click();
      await page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing");
      await reader.locator("[data-pad-back]").click();
      if (await picker.count()) {
        await page.keyboard.press("Escape");
        if (await picker.count()) await page.keyboard.press("Escape");
      }
      await page.locator(".rs-x").click();
      const spoken = page.locator(".book-walking .spoken p").first();
      await page.waitForFunction((text) => document.querySelector(".book-walking .spoken p")?.textContent === text, firstLine, { timeout: 30000 });
      assert.equal(await spoken.getAttribute("lang"), learner);
      await capture("playing-strip");
      await openSet();
      assert.equal(await set.locator(".book-actions").getByRole("button", { name: copy.browse, exact: true }).count(), 1);
      assert.equal(await set.locator(".book-actions").getByRole("button", { name: copy.reader, exact: true }).count(), 1);
      await capture("set-talk");
      await page.getByRole("button", { name: copy.pause, exact: true }).click();
      await page.waitForFunction(() => !window.__ew.radio.store.getState().playing);
      assert.equal(await readout.textContent(), "Libros FM");
      await page.locator("[data-book-browse]").click();
      await picker.locator(".resume").waitFor();
      const resume = await picker.locator(".resume").innerText();
      assert.ok(resume.includes(copy.resume));
      assert.ok(resume.includes("Cuentos de la selva"));
      assert.ok(resume.includes(targetTitle));
      await capture("shelf-continue");
      await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
      await detail();
      assert.equal(await picker.locator(".chapter.current .status").innerText(), copy.stopped);
      const fits = await picker.locator(".primary").evaluate((el) => {
        const { left, top, bottom, right } = el.getBoundingClientRect();
        return top >= 0 && bottom <= innerHeight && left >= 0 && right <= innerWidth && el.clientHeight >= 44;
      });
      assert.ok(fits);
      await capture("a-plus-plus-detail");
      await picker.locator("#chapter-BK01-01").click();
      await reader.waitFor();
      await page.waitForFunction(() => window.__ew.radio.books.player.getSnapshot().status === "playing");
      await reader.getByRole("button", { name: copy.pause, exact: true }).click();
      if (width === 390 && height === 664) {
        assert.equal(await reader.getAttribute("data-enlarged"), "true");
        assert.ok(await reader.locator(".page-head h1").isVisible());
        await capture("reader-a-plus-plus");
      }
      // A rotation while paused keeps the chapter and place.
      const paused = await current();
      await page.setViewportSize({ width: height, height: width });
      await page.setViewportSize({ width, height });
      assert.equal((await current()).intent, false);
      assert.equal((await current()).sentence, paused.sentence);
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.id === "chapter-BK01-01");
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => document.activeElement?.id === "cover-BK01");
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
        await openListeningSettings();
        await settings.waitFor();
        // Check that a standard gamepad's Back unwinds just the top sheet.
        await page.evaluate(() => {
          const buttons = Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 }));
          const pad = { id: "Book FM test pad", index: 0, mapping: "standard", connected: true, axes: [0, 0, 0, 0], buttons };
          Object.defineProperty(navigator, "getGamepads", { configurable: true, value: () => [pad, null, null, null] });
          const event = new Event("gamepadconnected");
          Object.defineProperty(event, "gamepad", { value: pad });
          window.dispatchEvent(event);
          window.__bookPad = buttons;
        });
        await page.waitForFunction(() => window.__pad?.connected);
        await page.evaluate(async () => {
          const frame = () => new Promise(requestAnimationFrame);
          await frame();
          await frame();
          Object.assign(window.__bookPad[1], { pressed: true, touched: true, value: 1 });
          await frame();
          await frame();
          Object.assign(window.__bookPad[1], { pressed: false, touched: false, value: 0 });
        });
        await settings.waitFor({ state: "detached" });
        assert.ok(await reader.isVisible());
        await page.keyboard.press("Escape");
      }
      const oneSource = await page.evaluate(() => (window.__bookAudios ?? []).filter((media) => !media.paused && !media.ended).length <= 1);
      assert.ok(oneSource);
      assert.deepEqual(errors, []);
      console.log(`${width}×${height} Libros FM passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
