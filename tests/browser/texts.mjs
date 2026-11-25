// Run on the same local Vite server and Chromium setup as phone-rings.mjs. WORLD_SHOTS saves the review frames.
import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";
import { contentUrl, contextOptions, installTown, key, manualFrames, openContentPage, probeEffects, progress, screenshot, stubVoiceClips, viewports } from "./life-harness.mjs";

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
      const content = contentUrl(url, "content/texts");
      await openContentPage(page, url);
      const threads = await page.evaluate(async (url) => (await import(url)).TEXT_THREADS, content);
      const dinner = threads.find((t) => t.after === "s85-dinner") ?? threads.find((t) => t.wait === "nextDay");
      const second = threads.find((t) => t.id !== dinner.id);
      const seed = { ...progress, sits: { [dinner.after]: completed }, texts: { pending: { [dinner.id]: { day, played: 0 } }, got: {} } };
      await page.addInitScript(installTown, { key, progress: seed, manual: true });
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(url, { waitUntil: "domcontentloaded" });
      const { step, waitFor, during } = manualFrames(page);
      const ready = async () => {
        await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town opens");
        await waitFor(() => page.evaluate(() => !window.__ew.store.getState().hud.zoneBanner), "zone banner clears");
      };
      const state = () => page.evaluate(() => window.__ew.game.textsState());
      const chip = page.locator(".text-arrival");
      const menu = page.locator(".toolbar .ride-menu");
      const menuUnread = menu.locator(".unread-badge");
      const phone = page.locator(".toolbar .icon-btn[title$='(P)']");
      const panel = page.locator(".phone[role=dialog]");
      const thread = panel.locator(".text-thread");
      const body = thread.locator(".text-thread-body");
      const contact = panel.locator(`.text-contact[data-thread="${dinner.id}"]`);
      const replies = thread.locator(".text-replies button");
      const tap = (locator) => during(() => Math.min(width, height) < 600 ? locator.tap() : locator.click());
      const capture = (name) => during(() => screenshot(page, name, width, height, process.env.SHOTS_OUT));
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
      const checkThreadViewport = async (areaSelector, ...selectors) => {
        const checks = await thread.locator(areaSelector).evaluate((area, selectors) => {
          const bounds = area.getBoundingClientRect();
          const phone = area.closest(".phone");
          const panel = phone.getBoundingClientRect();
          const left = Math.max(0, bounds.left, panel.left + phone.clientLeft);
          const top = Math.max(0, bounds.top, panel.top + phone.clientTop);
          const right = Math.min(innerWidth, bounds.left + area.clientWidth, panel.left + phone.clientLeft + phone.clientWidth);
          const bottom = Math.min(innerHeight, bounds.top + area.clientHeight, panel.top + phone.clientTop + phone.clientHeight);
          return selectors.map((selector) => {
            const elements = [...area.querySelectorAll(selector)];
            return elements.length > 0 && elements.every((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.left >= left - 1 && rect.top >= top - 1 &&
                rect.right <= right + 1 && rect.bottom <= bottom + 1;
            });
          });
        }, selectors);
        assert(checks.every(Boolean), `fully visible in ${areaSelector} at ${width}×${height}: ${selectors.filter((_, i) => !checks[i]).join(", ")}`);
      };
      const checkReplies = () => checkThreadViewport(".text-replies", "button", "button span", "button small");
      const greeting = ".text-message:first-of-type .text-bubble";
      const newest = ".text-message:last-child .text-bubble";
      const checkThreadStart = async () => {
        assert.equal(await body.evaluate((el) => el.scrollTop), 0);
        await checkThreadViewport(".text-thread-body", ".text-hint", greeting);
      };
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
      assert.equal(await chip.locator('[lang="en"]').innerText(), dinner.lines[0].en);
      assert.deepEqual(await page.evaluate(() => window.__lifeEffects.filter((name) => name === "message")), ["message"]);
      assert(await page.evaluate(() => window.__lifeVibrations.includes(60)));
      assert.equal((await state()).unread, 1);
      if (await menu.count()) {
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert(await menuUnread.isVisible());
        assert.match(await menu.getAttribute("aria-label"), /1 neperskaitytos žinutės/);
      }
      await checkArrival();
      await capture("text-01-arrival");
      await during(() => openPhoneMenu(page));
      if (await menu.count()) {
        assert.equal(await menu.getAttribute("aria-expanded"), "true");
        assert.equal(await menuUnread.count(), 0);
      }
      await checkArrival();
      assert.equal(await phone.locator(".due-badge").innerText(), "1");
      assert.match(await phone.getAttribute("aria-label"), /neperskaitytos žinutės/);

      if (width === 390 && height === 664) {
        await tap(menu);
        assert(await chip.isVisible());
        await step(9, 1000);
        await waitFor(async () => (await chip.count()) === 0, "the arrival chip expires");
        assert.equal((await state()).unread, 1);
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert(await menuUnread.isVisible());
        await tap(menu);
        await tap(phone);
        assert(await contact.locator(".text-unread").isVisible());
      } else {
        await tap(chip.getByRole("button"));
        assert.equal(await thread.getAttribute("data-thread"), dinner.id);
        await checkThreadStart();
        await tap(thread.locator(".text-thread-head button"));
      }
      assert(await contact.isVisible());
      await panel.evaluate(async (node) => {
        await Promise.all(node.parentElement.getAnimations().map((animation) => animation.finished));
      });
      await capture("text-02-inbox");
      await tap(contact);
      assert.equal(await thread.getAttribute("data-thread"), dinner.id);
      assert.equal(await replies.count(), dinner.replies.length);
      assert.deepEqual(await replies.locator("span").allTextContents(), dinner.replies.map(({ en }) => en));
      assert.deepEqual(await replies.locator("small").allTextContents(), dinner.replies.map(({ lt }) => lt));
      await checkThreadStart();
      await during(() => body.locator(newest).scrollIntoViewIfNeeded());
      await checkThreadViewport(".text-thread-body", newest);
      await body.evaluate((el) => { el.scrollTop = 0; });
      await checkReplies();
      assert.equal((await state()).unread, 0);
      assert.equal(await phone.locator(".due-badge").count(), 0);
      const first = thread.locator(".text-bubble").first();
      await tap(first);
      assert.equal(await first.locator("small").innerText(), dinner.lines[0].lt);
      await tap(first);
      assert.equal(await first.locator("small").count(), 0);
      await tap(first);
      assert.equal(await first.locator("small").innerText(), dinner.lines[0].lt);
      assert.equal(await thread.locator(".text-hint").count(), 0);
      await checkThreadViewport(".text-thread-body", greeting, `${greeting} small`);
      await checkReplies();
      await capture("text-03-translation");

      if (width === 844 && height === 390) {
        const last = body.locator(newest);
        const before = await last.evaluate((bubble) => {
          const scroller = bubble.closest(".text-thread-body");
          const bottom = scroller.getBoundingClientRect().top + scroller.clientHeight;
          scroller.scrollTop += Math.ceil(bubble.getBoundingClientRect().bottom - bottom);
          return scroller.scrollTop;
        });
        await tap(last);
        assert.equal(await last.locator("small").innerText(), dinner.lines.at(-1).lt);
        await waitFor(() => last.evaluate((bubble, before) => {
          const scroller = bubble.closest(".text-thread-body");
          const top = scroller.getBoundingClientRect().top;
          const bounds = bubble.getBoundingClientRect();
          return scroller.scrollTop > before && bounds.top >= top - 1 && bounds.bottom <= top + scroller.clientHeight + 1;
        }, before), "the expanded message scrolls fully into view in landscape");
      }

      const reply = dinner.replies[0];
      await tap(replies.first());
      assert.equal(await thread.locator(".mine .text-bubble").innerText(), reply.en);
      assert.equal(await thread.locator(".text-sent").innerText(), "Išsiųsta");
      assert.equal(await thread.locator(".text-typing i").count(), 3);
      await checkThreadViewport(".text-thread-body", ".text-message.mine .text-bubble", ".text-typing");
      await waitFor(async () => await thread.locator(".text-bubble").count() === dinner.lines.length + 1 + reply.answer.length, "answer arrives after typing");
      assert.equal(await thread.locator(".text-bubble").last().innerText(), reply.answer.at(-1).en);
      await checkThreadViewport(".text-thread-body", ".text-message.mine .text-bubble", ".text-sent", newest);
      await capture("text-04-replied");
      await tap(panel.locator(".phone-status button"));
      if (await menu.count()) {
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert.equal(await menuUnread.count(), 0);
        assert.equal(await menu.getAttribute("aria-label"), "Meniu");
      }
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
      assert.equal(await preview.locator(".txt span").innerText(), reply.answer.at(-1).en);
      assert.equal(await preview.locator(".text-unread").count(), 0);
      await tap(preview);
      assert.equal(await thread.locator(".text-typing").count(), 0);
      assert.equal(await thread.locator(".text-replies").count(), 0);
      assert.equal(await thread.locator(".text-hint").count(), 0);
      assert.equal(await thread.locator(".text-bubble").last().innerText(), reply.answer.at(-1).en);
      await checkThreadViewport(".text-thread-body", newest);
      await tap(thread.locator(".text-thread-head button"));
      assert(await preview.isVisible());
      assert.deepEqual(errors, []);
      console.log(`ok texts ${width}×${height}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
