// Run on the same local Vite server and Chromium setup as phone-rings.mjs.
import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";
import { contextOptions, helperLang, installTown, key, learnerLabel, lifeContentUrl, lineText, manualFrames, openContentPage, probeEffects, progress, screenshot, stubVoiceClips, targetLang, variety, viewports } from "./life-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const completed = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
const day = [yesterday.getFullYear(), yesterday.getMonth() + 1, yesterday.getDate()].map((n) => String(n).padStart(2, "0")).join("-");
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext(contextOptions(width, height));
    try {
      const page = await context.newPage();
      const errors = [];
      await stubVoiceClips(page);
      const content = lifeContentUrl(url, "texts");
      await openContentPage(page, url);
      const threads = await page.evaluate(async (url) => (await import(url)).TEXT_THREADS, content);
      const dinner = threads.find((t) => t.after === "s85-dinner");
      assert(dinner, "the edition has a dinner thread");
      const second = threads.find((t) => t.after === (targetLang === "es" ? "x11-billar" : "s82-neighbor"));
      assert(second, "the edition has a second thread");
      const seed = { ...progress, sits: { [dinner.after]: completed }, texts: { pending: { [dinner.id]: { day, played: 0 } }, got: {} } };
      await page.addInitScript(installTown, { key, progress: seed, manual: true, variety });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const { step, waitFor, during } = manualFrames(page);
      const ready = async () => {
        await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town opens");
        await waitFor(() => page.evaluate(() => !window.__ew.store.getState().hud.zoneBanner), "zone banner clears");
      };
      const state = () => page.evaluate(() => window.__ew.game.textsState());
      const chip = page.locator(".text-arrival");
      const phone = page.locator(".toolbar .icon-btn[title$='(P)']");
      const panel = page.locator(".phone[role=dialog]");
      const thread = panel.locator(".text-thread");
      const tap = (locator) => during(() => Math.min(width, height) < 600 ? locator.tap() : locator.click());
      const checkArrival = async () => {
        const layout = await chip.evaluate((node) => {
          const box = node.getBoundingClientRect();
          const overlaps = (selector) => [...document.querySelectorAll(selector)].filter((el) => {
            const rect = el.getBoundingClientRect();
            return rect.width && rect.height && getComputedStyle(el).visibility === "visible" &&
              box.left < rect.right && box.right > rect.left && box.top < rect.bottom && box.bottom > rect.top;
          }).map((el) => el.getAttribute("title") || el.className);
          const read = node.querySelector("button"), button = read.getBoundingClientRect();
          return {
            insideScreen: box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight,
            toolbar: overlaps(".toolbar :is(button, a)"),
            cards: overlaps(".objective-card, .minimap, .town-toasts .toast"),
            tappable: read.contains(document.elementFromPoint(button.left + button.width / 2, button.top + button.height / 2)),
          };
        });
        assert.deepEqual(layout, { insideScreen: true, toolbar: [], cards: [], tappable: true }, "the arrival chip and its button are clear of the HUD");
      };
      const checkThreadViewport = async (...selectors) => {
        const checks = await thread.locator(".text-thread-body").evaluate((body, selectors) => {
          const area = body.getBoundingClientRect();
          const bottom = area.top + body.clientHeight;
          return selectors.map((selector) => {
            const elements = [...body.querySelectorAll(selector)];
            return elements.length > 0 && elements.every((el) => {
              const rect = el.getBoundingClientRect();
              return rect.height > 0 && rect.top >= area.top - 1 && rect.bottom <= bottom + 1;
            });
          });
        }, selectors);
        assert(checks.every(Boolean), `inside the thread's scroll area at ${width}×${height}: ${selectors.filter((_, i) => !checks[i]).join(", ")}`);
      };
      const newest = ".text-message:nth-last-child(2) .text-bubble";
      await ready();
      await probeEffects(page);
      assert.equal((await state()).due, dinner.id);

      await page.evaluate(() => {
        const { game } = window.__ew;
        game.call(game.orderedSituations().find((s) => s.mode === "phone" || s.location === "phone").id);
      });
      await waitFor(() => page.evaluate(() => window.__ew.store.getState().conv.active), "conversation opens");
      await page.evaluate(() => window.__ew.game.textsDueNow());
      await step(2, 70000);
      assert.equal((await state()).sessionCount, 0);
      assert.equal(await chip.count(), 0);
      await page.evaluate(() => window.__ew.game.closeConversation());
      await waitFor(() => chip.isVisible(), "the due text arrives when free to walk");
      assert.equal(await chip.getAttribute("data-thread"), dinner.id);
      assert.equal(await chip.locator(`[lang="${targetLang}"]`).innerText(), lineText(dinner.lines[0]));
      assert.deepEqual(await page.evaluate(() => window.__lifeEffects.filter((name) => name === "message")), ["message"]);
      assert(await page.evaluate(() => window.__lifeVibrations.includes(60)));
      assert.equal((await state()).unread, 1);
      const menu = page.locator(".toolbar .ride-menu");
      if (await menu.count()) assert.equal(await menu.getAttribute("aria-expanded"), "false");
      await checkArrival();
      await during(() => openPhoneMenu(page));
      if (await menu.count()) assert.equal(await menu.getAttribute("aria-expanded"), "true");
      await checkArrival();
      assert.equal(await phone.locator(".due-badge").innerText(), "1");
      assert((await phone.getAttribute("aria-label")).includes(learnerLabel("neperskaitytos žinutės", "unread messages")));
      await during(() => screenshot(page, "text-arrival", width, height));
      await tap(chip.getByRole("button"));
      assert.equal(await thread.getAttribute("data-thread"), dinner.id);
      await checkThreadViewport(newest, ".text-replies button");
      assert.equal((await state()).unread, 0);
      assert.equal(await phone.locator(".due-badge").count(), 0);
      const first = thread.locator(".text-bubble").first();
      await tap(first);
      assert.equal(await first.locator(`small[lang="${helperLang}"]`).innerText(), dinner.lines[0].lt);
      await tap(first);
      assert.equal(await first.locator("small").count(), 0);
      await tap(first);
      assert.equal(await thread.locator(".text-hint").count(), 0);
      await during(() => screenshot(page, "text-translation", width, height));

      const reply = dinner.replies[0];
      await tap(thread.locator(".text-replies button").first());
      assert.equal(await thread.locator(".mine .text-bubble").innerText(), lineText(reply));
      assert.equal(await thread.locator(".text-sent").innerText(), learnerLabel("Išsiųsta", "Sent"));
      assert.equal(await thread.locator(".text-typing i").count(), 3);
      await checkThreadViewport(".text-message.mine .text-bubble", ".text-typing");
      await waitFor(async () => await thread.locator(".text-bubble").count() === dinner.lines.length + 1 + reply.answer.length, "answer arrives after typing");
      assert.equal(await thread.locator(".text-bubble").last().innerText(), lineText(reply.answer.at(-1)));
      await checkThreadViewport(".text-message:last-child .text-bubble");
      await during(() => screenshot(page, "text-replied", width, height));
      await tap(panel.locator(".phone-status button"));
      await page.evaluate(({ second, completed, day }) => window.__ew.store.getState().updateProgress((p) => {
        p.sits[second.after] = completed;
        p.texts.pending[second.id] = { day: second.wait === "later" ? "" : day, played: 0 };
      }), { second, completed, day });
      await step(2, 100000);
      assert.equal((await state()).due, second.id);
      assert.equal((await state()).sessionCount, 1, "another due thread stays queued in this session");
      assert.equal(await chip.count(), 0);

      await page.reload({ waitUntil: "domcontentloaded" });
      await ready();
      assert.deepEqual({ read: (await state()).got[dinner.id].read, reply: (await state()).got[dinner.id].reply }, { read: true, reply: 0 });
      await page.keyboard.press("p");
      await waitFor(() => panel.locator(".text-contact").count(), "the message list survives a reload");
      const preview = panel.locator(".text-contact").first();
      assert.equal(await preview.locator(".txt span").innerText(), lineText(reply.answer.at(-1)));
      assert.equal(await preview.locator(".text-unread").count(), 0);
      await tap(preview);
      assert.equal(await thread.locator(".text-typing").count(), 0);
      assert.equal(await thread.locator(".text-replies").count(), 0);
      assert.equal(await thread.locator(".text-hint").count(), 0);
      assert.equal(await thread.locator(".text-bubble").last().innerText(), lineText(reply.answer.at(-1)));
      await checkThreadViewport(".text-message:last-child .text-bubble");
      await tap(thread.locator(".text-thread-head button"));
      assert(await preview.isVisible());
      if (targetLang === "es") {
        const contacts = await page.evaluate(async (url) => (await import(url)).NPCS, lifeContentUrl(url, "npcs"));
        await page.evaluate((threads) => {
          const { store, audio } = window.__ew;
          store.getState().updateProgress((p) => {
            for (const { id } of threads) {
              delete p.texts.pending[id];
              p.texts.got[id] ??= { at: Date.now(), read: true, reply: 0 };
            }
          });
          window.__textVoice = [];
          const play = audio.play.bind(audio);
          audio.play = (voice, speed, text, options) => {
            if (!options?.optional || !options?.fallbackLang) return play(voice, speed, text, options);
            window.__textVoice.push({ voice, text });
            return Promise.resolve(true);
          };
        }, threads);
        for (const { id, from } of threads) {
          const npc = contacts[from];
          await tap(panel.locator(`.text-contact[data-thread="${id}"]`));
          assert.equal(await thread.locator("header strong").innerText(), npc.name);
          assert.equal(await thread.locator(`header small[lang="${helperLang}"]`).innerText(), npc.role.lt);
          const face = await thread.locator("header .text-face").evaluate((node) =>
            node.querySelector("img")?.src.startsWith("data:image/") ? "portrait" : node.textContent);
          assert(["portrait", npc.name[0]].includes(face), `face resolves for ${from}`);
          if (from === "memo") {
            const answer = lineText(second.replies[0].answer.at(-1));
            const bubble = thread.locator(".text-bubble").last();
            assert.equal(await bubble.innerText(), answer);
            await tap(bubble);
            const voice = variety === "spain" ? "esp_memo" : variety === "neutral" ? "esn_memo" : "es_memo";
            assert.deepEqual(await page.evaluate(() => window.__textVoice.at(-1)), { voice, text: answer });
          }
          await tap(thread.locator(".text-thread-head button"));
        }
      }
      assert.deepEqual(errors, []);
      console.log(`ok texts ${width}×${height}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
