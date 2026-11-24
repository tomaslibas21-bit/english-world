// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/photowalk.mjs
import assert from "node:assert/strict";
import { answer, approachAndTalk, checkGlossStack, checkHud, closeChat, openPhone, openQuestTown, questBrowser, questSizes, talkTo } from "./quests-harness.mjs";
import { shot } from "./screen-harness.mjs";

const browser = await questBrowser();
try {
  for (const [width, height] of questSizes) {
    for (const speech of [false, true]) {
      const { context, page, press, languages } = await openQuestTown(browser, width, height, speech);
      const label = `photowalk-${width}x${height}-${speech ? "speech" : "choices"}`;
      try {
        const { npc, situation, things, words, accept, later, spokenName, name } = await page.evaluate(async () =>
          (await import("/tests/browser/fixtures/quest-content.mjs")).photoWalkContent());
        const chip = page.locator(".photo-chip");
        assert.equal(await chip.count(), 0);
        await talkTo(page, npc, situation);
        await answer(page, "help", later);
        await closeChat(page);
        assert.equal(await chip.count(), 0);
        await talkTo(page, npc, situation);
        await answer(page, "help", accept);
        await closeChat(page);
        await chip.waitFor();

        await page.evaluate(() => {
          const { game } = window.__ew;
          const { x, z } = game.town.photoSpots.find(({ id }) => id === "mailbox");
          game.enterZone("town", { x, z: z - 4, rot: 0 }, true);
        });
        await page.locator('.photo-chip[data-near="mailbox"]').waitFor();
        assert.equal(await chip.textContent(), `0/${things.length}${words.shoot}`);
        await checkHud(page, ".photo-chip");
        await shot(page, `${label}-chip`);
        if (width >= 901) await page.keyboard.press("c");
        else await press(chip);
        const quiz = page.locator('.photo-quiz[data-thing="mailbox"]');
        await quiz.waitFor();
        assert.equal(await quiz.locator(".mic").count(), Number(speech));
        assert.equal(await quiz.locator("[data-choice]").count(), 3);
        if (process.env.WORLD_SHOTS) {
          await page.locator(".photo-flash").evaluate((flash) => Promise.allSettled(flash.getAnimations().map((animation) => animation.finished)));
          await shot(page, `${label}-sheet`);
        }
        const wrong = quiz.locator('[data-choice]:not([data-choice="mailbox"])').first();
        await press(wrong);
        assert.equal(await wrong.isDisabled(), true);
        await quiz.getByText(words.wrong, { exact: true }).waitFor();
        if (speech) {
          await press(quiz.locator(".mic"));
          await page.waitForFunction(() => !!window.__questReader?.onresult);
          assert.equal(await page.evaluate((text) => window.__questSpeak(text), spokenName), true);
        } else await press(quiz.locator('[data-choice="mailbox"]'));
        await quiz.getByText(words.got, { exact: true }).waitFor();
        await shot(page, `${label}-got`);
        await press(quiz.getByRole("button", { name: words.open }));

        const book = page.locator(".photo-book");
        await book.waitFor();
        assert.deepEqual(await book.locator(".photo-page").evaluateAll((pages) => pages.map((p) => p.dataset.thing)), things);
        assert.equal(await book.locator("header p").textContent(), words.found);
        const foundPage = book.locator('.photo-page[data-thing="mailbox"][data-found="true"]');
        await checkGlossStack(foundPage, name, languages);
        const picture = foundPage.locator("img");
        const photo = await picture.evaluate(async (img) => {
          await img.decode();
          const probe = document.createElement("canvas");
          probe.width = img.naturalWidth;
          probe.height = img.naturalHeight;
          const ctx = probe.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const pixels = ctx.getImageData(0, 0, probe.width, probe.height).data;
          return { width: probe.width, height: probe.height, nonBlack: pixels.some((value, i) => i % 4 !== 3 && value > 20) };
        });
        assert.deepEqual(photo, { width: 160, height: 120, nonBlack: true });
        const pages = book.locator(".photo-pages");
        const layout = await pages.evaluate((el) => {
          const box = el.closest(".photo-book").getBoundingClientRect();
          return { fits: box.top >= 0 && box.bottom <= innerHeight, width: box.width,
            columns: getComputedStyle(el).gridTemplateColumns.split(" ").length, scrolls: el.scrollHeight > el.clientHeight };
        });
        assert(layout.fits);
        if (width >= 901) {
          assert.equal(layout.columns, 4);
          assert(layout.width >= 740 && layout.width <= 760);
        } else assert(layout.scrolls);
        await shot(page, `${label}-book`);
        const clue = book.locator('[data-thing="lighthouse"]');
        await press(clue.getByRole("button", { name: words.where }));
        await clue.locator(".il").waitFor();
        await press(book.getByRole("button", { name: words.pause }));
        await chip.waitFor({ state: "detached" });
        await openPhone(page, press);
        const contact = page.locator(".photo-contact", { hasText: words.phone });
        assert.equal(await contact.locator(".txt span").textContent(), `1/${things.length}`);
        await press(contact);
        await press(book.getByRole("button", { name: words.resume }));
        await book.waitFor({ state: "detached" });
        await chip.waitFor();
        await page.evaluate(() => {
          const { game } = window.__ew;
          game.enterZone("town", { x: 10, z: 80, rot: 0 }, true);
        });
        await page.locator(".photo-chip:not([data-near])").waitFor();
        await press(chip);
        await press(book.getByRole("button", { name: words.quit, exact: true }));
        await book.getByText(words.quitAsk, { exact: true }).waitFor();
        await press(book.getByRole("button", { name: words.quitNo, exact: true }));
        await press(book.getByRole("button", { name: words.quit, exact: true }));
        await press(book.getByRole("button", { name: words.quit, exact: true }));
        await book.waitFor({ state: "detached" });
        assert.equal(await chip.count(), 0);
        assert.deepEqual(await page.evaluate(() => window.__ew.store.getState().progress.photoWalk), { status: "off", found: ["mailbox"] });
        await openPhone(page, press);
        assert.equal(await page.locator(".photo-contact").count(), 0);
        if (width >= 901) {
          // Seed the first eleven pages, then take the last photo and play the whole handoff.
          await page.evaluate((things) => {
            const { game, store } = window.__ew;
            store.getState().setHud({ panel: null });
            store.getState().updateProgress((p) => {
              p.photoWalk = { status: "on", found: things.filter((id) => id !== "mailbox") };
            });
            const { x, z } = game.town.photoSpots.find(({ id }) => id === "mailbox");
            game.enterZone("town", { x, z: z - 4, rot: 0 }, true);
          }, things);
          await page.locator('.photo-chip[data-near="mailbox"]').waitFor();
          await press(chip);
          await press(quiz.locator('[data-choice="mailbox"]'));
          await press(quiz.getByRole("button", { name: words.close, exact: true }));
          await approachAndTalk(page, npc, situation);
          const finale = page.locator(".photo-finale");
          for (const line of ["pw_a_here", "pw_a_welcome"]) await press(finale.locator(`button[data-line="${line}"]`));
          await book.getByRole("heading", { name: words.done, exact: true }).waitFor();
          assert.equal(await page.evaluate(() => window.__ew.store.getState().progress.photoWalk.status), "done");
        }
        console.log(`${label} passed`);
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
