// See README-life.md for the local Vite server and browser profiles.
import assert from "node:assert/strict";
import { assertSavedSentence, cardsFor, checkCardList, checkManualSave } from "./fixtures/phrase-saves.mjs";
import { openPhoneMenu } from "./screen-harness.mjs";
import { assertTownProfile, contextOptions, helperLang, installTown, key, learnerLabel, lifeContentUrl, lineText, manualFrames, openContentPage, probeEffects, profileName, progress, screenshot, stubVoiceClips, targetLang, variety, viewports } from "./life-harness.mjs";

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
      await assertTownProfile(page, url);
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
      const touch = Math.min(width, height) < 600;
      const tap = (locator) => during(() => touch ? locator.tap() : locator.click());
      const capture = (name) => during(() => screenshot(page, name, width, height, process.env.SHOTS_OUT));
      const targetText = `span[lang="${targetLang}"]`, helperText = `small[lang="${helperLang}"]`;
      const answerButton = ".text-replies button.text-reply";
      const choices = thread.locator(answerButton);
      const saveBeside = (action) => action.locator("..").locator(":scope > [data-phrase-save]");
      const saved = [];
      const probeVoice = () => page.evaluate(() => {
        const { audio } = window.__ew;
        window.__textVoice = [];
        const play = audio.play.bind(audio);
        audio.play = (voice, speed, text, options) => {
          if (!options?.optional || !options?.fallbackLang) return play(voice, speed, text, options);
          window.__textVoice.push({ voice, text });
          return Promise.resolve(true);
        };
      });
      const snapshot = async () => ({
        texts: await state(),
        ...await thread.evaluate((node) => {
          const { screen, hud, progress } = window.__ew.store.getState();
          return {
            route: [screen, hud.panel, hud.textThread, hud.textArrival, progress.objective],
            translated: progress.texts.translated,
            bubbles: [...node.querySelectorAll(".text-bubble")].map((bubble) => bubble.getAttribute("aria-expanded")),
            choices: [...node.querySelectorAll(".text-reply")].map((choice) => choice.textContent),
            sent: node.querySelector(".text-sent")?.textContent,
            typing: node.querySelectorAll(".text-typing i").length,
            voice: window.__textVoice,
          };
        }),
      });
      const saveLine = async (action, line, situationId, activation) => {
        const target = await action.locator(targetText).textContent();
        assert.equal(target, lineText(line));
        const gloss = action.locator(helperText);
        const helper = await gloss.count() ? await gloss.textContent() : line.lt;
        assert.equal(helper, line.lt);
        const control = saveBeside(action);
        await during(() => control.scrollIntoViewIfNeeded());
        const layout = await action.evaluate((button) => {
          const words = button.getBoundingClientRect(), save = button.nextElementSibling.getBoundingClientRect();
          const body = button.closest(".text-thread-body"), area = body.getBoundingClientRect();
          return {
            spacing: Math.max(words.left - save.right, save.left - words.right),
            inside: save.top >= area.top - 1 && save.bottom <= area.top + body.clientHeight + 1
              && save.left >= area.left - 1 && save.right <= area.left + body.clientWidth + 1,
            horizontalOverflow: body.scrollWidth > body.clientWidth + 1,
          };
        });
        assert(layout.spacing >= 5.9 && layout.inside && !layout.horizontalOverflow,
          `the save fits beside its phrase with 6 px of separation: ${JSON.stringify(layout)}`);
        const card = await during(() => checkManualSave(page, control, touch, target, situationId, snapshot, activation));
        assertSavedSentence(card, { en: target, nat: helper, say: target }, situationId);
        saved.push(card);
        return card;
      };
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
          const right = area.left + body.clientWidth;
          const bottom = area.top + body.clientHeight;
          return selectors.map((selector) => {
            const elements = [...body.querySelectorAll(selector)];
            return elements.length > 0 && elements.every((el) => {
              const rect = el.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && rect.left >= area.left - 1 && rect.right <= right + 1 &&
                rect.top >= area.top - 1 && rect.bottom <= bottom + 1;
            });
          });
        }, selectors);
        assert(checks.every(Boolean), `inside the thread's scroll area at ${width}×${height}: ${selectors.filter((_, i) => !checks[i]).join(", ")}`);
      };
      const scrollToReply = async (index) => {
        const selector = `.text-replies > .phrase-save-row:nth-of-type(${index + 1}) > button.text-reply`;
        const choice = thread.locator(selector);
        await choice.evaluate((button) => button.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" }));
        await checkThreadViewport(selector);
        return choice;
      };
      const sendReply = async (index) => {
        const reply = dinner.replies[index];
        await tap(await scrollToReply(index));
        assert.equal((await state()).got[dinner.id].reply, index);
        assert.equal(await thread.locator(".mine .text-bubble").innerText(), lineText(reply));
        assert.equal(await thread.locator(".text-sent").innerText(), learnerLabel("Išsiųsta", "Sent"));
        assert.equal(await thread.locator(".text-typing i").count(), 3);
        await checkThreadViewport(".text-message.mine .text-bubble", ".text-typing");
        await waitFor(async () => await thread.locator(".text-bubble").count() === dinner.lines.length + 1 + reply.answer.length, "answer arrives after typing");
        assert.equal(await thread.locator(".text-bubble").last().innerText(), lineText(reply.answer.at(-1)));
        await checkThreadViewport(".text-message:last-child .text-bubble", ".text-message.mine .text-bubble", ".text-sent");
      };
      const greeting = ".text-message:first-of-type .text-bubble";
      const checkFreshThread = async () => {
        assert.equal(await thread.getAttribute("data-thread"), dinner.id);
        await checkThreadViewport(".text-hint", greeting);
        assert.equal(await thread.locator(`${greeting} span[lang="${targetLang}"]`).innerText(), lineText(dinner.lines[0]));
      };
      const newest = ".text-message:nth-last-child(2) .text-bubble";
      await ready();
      await probeEffects(page);
      await probeVoice();
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
      assert.equal(await chip.locator("[data-phrase-save]").count(), 0);
      assert.deepEqual(await page.evaluate(() => window.__lifeEffects.filter((name) => name === "message")), ["message"]);
      assert(await page.evaluate(() => window.__lifeVibrations.includes(60)));
      assert.equal((await state()).unread, 1);
      const menu = page.locator(".toolbar .ride-menu");
      if (width === 390 && height === 664) assert.equal(await menu.count(), 1);
      if (await menu.count()) assert.equal(await menu.getAttribute("aria-expanded"), "false");
      await checkArrival();
      await capture("text-1-arrival");
      await during(() => openPhoneMenu(page));
      if (await menu.count()) assert.equal(await menu.getAttribute("aria-expanded"), "true");
      await checkArrival();
      assert.equal(await phone.locator(".due-badge").innerText(), "1");
      const unreadLabel = learnerLabel("neperskaitytos žinutės", "unread messages");
      assert((await phone.getAttribute("aria-label")).includes(unreadLabel));
      if (await menu.count()) await tap(menu);
      await step(1, 8100);
      await during(() => chip.waitFor({ state: "detached" }));
      assert.equal(await page.evaluate(() => window.__ew.store.getState().hud.textArrival), null);
      assert.equal((await state()).unread, 1);
      if (await menu.count()) {
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert(await menu.locator(".menu-unread").isVisible());
        assert((await menu.getAttribute("aria-label")).includes(`1 ${unreadLabel}`));
      }
      await during(() => openPhoneMenu(page));
      await tap(phone);
      const inboxText = panel.locator(`.text-contact[data-thread="${dinner.id}"]`);
      assert(await inboxText.locator(".text-unread").isVisible());
      const inboxPhrase = await inboxText.locator(".txt span").textContent();
      assert.equal(inboxPhrase, lineText(dinner.lines.at(-1)));
      assert.equal(await inboxText.locator("[data-phrase-save]").count(), 0);
      await waitFor(() => panel.evaluate((node) => getComputedStyle(node.parentElement).opacity === "1"), "the phone finishes opening");
      await capture("text-2-inbox");
      await tap(inboxText);
      await checkFreshThread();
      await checkThreadViewport(newest);
      assert.equal(await choices.count(), dinner.replies.length);
      assert.deepEqual(await choices.locator(targetText).allTextContents(), dinner.replies.map(lineText));
      assert.deepEqual(await choices.locator(helperText).allTextContents(), dinner.replies.map((reply) => reply.lt));
      for (const index of dinner.replies.keys()) await scrollToReply(index);
      assert.equal(await thread.locator(".text-message [data-phrase-save]").count(), dinner.lines.length);
      assert.equal(await thread.locator(".text-replies [data-phrase-save]").count(), dinner.replies.length);
      assert.equal((await state()).unread, 0);
      assert.equal(await phone.locator(".due-badge").count(), 0);
      const first = thread.locator(greeting);
      const latest = thread.locator(newest);
      assert.equal(await latest.locator(targetText).textContent(), inboxPhrase);
      const incoming = await saveLine(latest, dinner.lines.at(-1), dinner.after, "Enter");
      await saveLine(choices.nth(1), dinner.replies[1], dinner.after, "Space");
      assert.equal((await state()).got[dinner.id].reply, undefined);
      assert.equal(await latest.getAttribute("aria-expanded"), "false");
      assert.equal(await thread.locator(".text-hint").count(), 1);
      await capture("text-3-saved-before-reply");
      await tap(first);
      assert.equal(await first.locator(`small[lang="${helperLang}"]`).innerText(), dinner.lines[0].lt);
      await tap(first);
      assert.equal(await first.locator("small").count(), 0);
      await tap(first);
      assert.equal(await thread.locator(".text-hint").count(), 0);
      await checkThreadViewport(`${greeting} small`);
      await capture("text-3-translation");
      await tap(latest);
      assert.equal(await latest.locator(helperText).textContent(), incoming.lt);
      await tap(latest);
      if (width === 844 && height === 390) {
        const last = latest;
        const before = await last.evaluate((bubble) => {
          const scroller = bubble.closest(".text-thread-body");
          // Put the unopened message at the edge of a short thread viewport.
          scroller.style.maxHeight = `${Math.ceil(bubble.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top)}px`;
          const bottom = scroller.getBoundingClientRect().top + scroller.clientHeight;
          scroller.scrollTop += Math.ceil(bubble.getBoundingClientRect().bottom - bottom);
          return scroller.scrollTop;
        });
        await checkThreadViewport(newest);
        await tap(last);
        assert.equal(await last.locator(`small[lang="${helperLang}"]`).innerText(), dinner.lines.at(-1).lt);
        await waitFor(() => last.evaluate((bubble, before) => {
          const scroller = bubble.closest(".text-thread-body");
          const top = scroller.getBoundingClientRect().top;
          const bounds = bubble.getBoundingClientRect();
          return scroller.scrollTop > before && bounds.top >= top - 1 && bounds.bottom <= top + scroller.clientHeight + 1;
        }, before), "the expanded message scrolls fully into view in landscape");
        await thread.locator(".text-thread-body").evaluate((body) => body.style.removeProperty("max-height"));
      }
      for (const index of dinner.replies.keys()) await scrollToReply(index);

      const reply = dinner.replies[0];
      await sendReply(0);
      await capture("text-4-replied");
      assert.equal(await thread.locator(".text-message [data-phrase-save]").count(), dinner.lines.length + 1 + reply.answer.length);
      await saveLine(thread.locator(".mine .text-bubble"), reply, dinner.after, "Space");
      const followUp = await saveLine(thread.locator(".text-bubble").last(), reply.answer.at(-1), dinner.after, "Enter");
      await tap(panel.locator(".phone-status button"));
      assert.equal(await menu.locator(".menu-unread").count(), 0);
      if (await menu.count()) assert.equal(await menu.getAttribute("aria-label"), await menu.getAttribute("title"));
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
      await probeVoice();
      assert.deepEqual({ read: (await state()).got[dinner.id].read, reply: (await state()).got[dinner.id].reply }, { read: true, reply: 0 });
      await page.keyboard.press("p");
      await waitFor(() => panel.locator(".text-contact").count(), "the message list survives a reload");
      const preview = panel.locator(".text-contact").first();
      assert.equal(await preview.locator(".txt span").innerText(), followUp.en);
      assert.equal(await preview.locator(".text-unread").count(), 0);
      await tap(preview);
      assert.equal(await thread.locator(".text-typing").count(), 0);
      assert.equal(await thread.locator(".text-replies").count(), 0);
      assert.equal(await thread.locator(".text-hint").count(), 0);
      assert.equal(await thread.locator(".text-bubble").last().innerText(), lineText(reply.answer.at(-1)));
      assert.equal(await saveBeside(thread.locator(".text-bubble").last()).getAttribute("aria-pressed"), "true");
      await checkThreadViewport(".text-message:last-child .text-bubble");
      await tap(thread.locator(".text-thread-head button"));
      assert(await preview.isVisible());
      await tap(panel.locator(".phone-status button"));
      await page.evaluate(() => window.__ew.game.textsDueNow());
      await waitFor(() => chip.isVisible(), "the queued thread arrives in the next session");
      assert.equal(await chip.getAttribute("data-thread"), second.id);
      const arrivalPhrase = await chip.locator(`[lang="${targetLang}"]`).textContent();
      assert.equal(arrivalPhrase, lineText(second.lines[0]));
      await tap(chip.getByRole("button"));
      assert.equal(await thread.getAttribute("data-thread"), second.id);
      assert.equal((await state()).unread, 0);
      const arriving = thread.locator(".text-bubble").first();
      assert.equal(await arriving.locator(targetText).textContent(), arrivalPhrase);
      assert.equal(await saveBeside(arriving).getAttribute("aria-pressed"), "false");
      if (second.id === "memo-tournament") {
        await saveLine(arriving, second.lines[0], second.after, "Enter");
        const unused = second.replies[1];
        await saveLine(choices.nth(1), unused, second.after, "Space");
        await capture("text-5-memo-saved-before-reply");
        if (touch) await tap(choices.first());
        else await during(() => choices.first().press("Enter"));
        assert.equal((await state()).got[second.id].reply, 0);
        assert.equal(await thread.locator(".text-sent").innerText(), learnerLabel("Išsiųsta", "Sent"));
        assert.equal(await thread.locator(".text-typing i").count(), 3);
        const memoReply = second.replies[0];
        await waitFor(async () => await thread.locator(".text-bubble").count() === second.lines.length + 1 + memoReply.answer.length, "Don Memo replies after typing");
        const answer = thread.locator(".text-bubble").last();
        await tap(answer);
        await saveLine(answer, memoReply.answer.at(-1), second.after, "Space");
        await capture("text-6-memo-follow-up-saved");
      }
      await tap(thread.locator(".text-thread-head button"));
      assert.deepEqual(await panel.locator(".text-contact").evaluateAll((rows) => rows.map((row) => row.dataset.thread)), [second.id, dinner.id]);
      if (targetLang === "es") {
        const contacts = await page.evaluate(async (url) => (await import(url)).NPCS, lifeContentUrl(url, "npcs"));
        await page.evaluate((threads) => {
          const { store } = window.__ew;
          store.getState().updateProgress((p) => {
            for (const { id } of threads) {
              delete p.texts.pending[id];
              const entry = p.texts.got[id] ??= { at: Date.now(), read: true };
              entry.reply ??= 0;
            }
          });
        }, threads);
        for (const { id, from, replies } of threads) {
          const npc = contacts[from];
          await tap(panel.locator(`.text-contact[data-thread="${id}"]`));
          assert.equal(await thread.locator("header strong").innerText(), npc.name);
          assert.equal(await thread.locator(`header small[lang="${helperLang}"]`).innerText(), npc.role.lt);
          const face = await thread.locator("header .text-face").evaluate((node) =>
            node.querySelector("img")?.src.startsWith("data:image/") ? "portrait" : node.textContent);
          assert(["portrait", npc.name[0]].includes(face), `face resolves for ${from}`);
          if (from === "memo") {
            const answer = replies[0].answer.at(-1);
            const bubble = thread.locator(".text-bubble").last();
            assert.equal(await bubble.locator(`span[lang="${targetLang}"]`).innerText(), lineText(answer));
            await tap(bubble);
            assert.equal(await bubble.locator(`small[lang="${helperLang}"]`).innerText(), answer.lt);
            const voice = variety === "spain" ? "esp_memo" : variety === "neutral" ? "esn_memo" : "es_memo";
            assert.deepEqual(await page.evaluate(() => window.__textVoice.at(-1)), { voice, text: lineText(answer) });
          }
          await tap(thread.locator(".text-thread-head button"));
        }
      }
      for (let index = 1; index < dinner.replies.length; index++) {
        await page.evaluate((id) => window.__ew.store.getState().updateProgress((p) => {
          p.texts.got[id] = { at: Date.now(), read: false };
          delete p.texts.translated;
        }), dinner.id);
        await tap(inboxText);
        await checkFreshThread();
        await sendReply(index);
        await tap(thread.locator(".text-thread-head button"));
      }
      await page.reload({ waitUntil: "domcontentloaded" });
      await ready();
      await checkCardList(page, { learner: helperLang, target: targetLang, cards: saved, press: tap });
      for (const card of saved) assert.deepEqual(await cardsFor(page, card.en), [card], "the exact pair and source survive reload");
      const captions = await page.evaluate(async (ids) => {
        const { SITUATION_BY_ID } = await import("/src/content/situations/catalog.ts");
        return Object.fromEntries(ids.map((id) => [id, SITUATION_BY_ID[id].title.lt]));
      }, [...new Set(saved.map((card) => card.situationId))]);
      await tap(page.locator(".cards-hero button"));
      const review = page.locator(".review");
      const remaining = new Map(saved.map((card) => [card.en, card]));
      for (const _ of saved) {
        await tap(review.locator(".rv-reveal"));
        const target = await review.locator(".rv-en").textContent();
        const card = remaining.get(target);
        assert(card, `review shows a newly saved phrase once: ${target}`);
        assert.equal(await review.locator(".rv-lt").textContent(), card.lt);
        assert.equal((await review.locator(".rv-sit").textContent()).replace(/^\s*·\s*/, ""), captions[card.situationId]);
        remaining.delete(target);
        await tap(review.locator(".rv-acts button").last());
      }
      assert.equal(remaining.size, 0);
      assert.deepEqual(errors, []);
      console.log(`ok ${profileName} texts ${width}×${height}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
