// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/photowalk.mjs
import assert from "node:assert/strict";
import { answer, checkGlossStack, checkHud, closeChat, openPhone, openQuestTown, questBrowser, questSizes, talkTo } from "./quests-harness.mjs";
import { shot } from "./screen-harness.mjs";

const browser = await questBrowser();
try {
  for (const [width, height] of questSizes) {
    for (const speech of [false, true]) {
      const { context, page, press } = await openQuestTown(browser, width, height, speech);
      const label = `photowalk-${width}x${height}-${speech ? "speech" : "choices"}`;
      try {
        const { npc, words, accept, later } = await page.evaluate(async () => {
          const { PHOTO_WALK_NPC, PHOTO_WALK_UI, PHOTO_WALK_HINTS } = await import("/src/content/photo-walk-lines.ts");
          const items = PHOTO_WALK_HINTS.help.items;
          return { npc: PHOTO_WALK_NPC, words: PHOTO_WALK_UI, accept: items[0].s.en.replaceAll(" | ", " "), later: items[2].s.en.replaceAll(" | ", " ") };
        });
        const chip = page.locator(".photo-chip");
        assert.equal(await chip.count(), 0);
        await talkTo(page, npc, press);
        await answer(page, "help", later);
        await closeChat(page);
        assert.equal(await chip.count(), 0);
        await talkTo(page, npc, press);
        await answer(page, "help", accept);
        await closeChat(page);
        await chip.waitFor();

        await page.evaluate(() => {
          const { game } = window.__ew;
          game.setObjective("s65a-passport");
          const { x, z } = game.town.photoSpots.find(({ id }) => id === "mailbox");
          game.enterZone("town", { x, z: z - 4, rot: 0 }, true);
        });
        await page.locator('.photo-chip[data-near="mailbox"]').waitFor();
        assert.equal(await chip.textContent(), `0/12${words.shoot}`);
        const taskSummary = page.locator(".objective-card.collapsed .objective-summary");
        await taskSummary.waitFor();
        await checkHud(page, ".photo-chip");
        await shot(page, `${label}-chip`);
        await press(taskSummary);
        await page.locator('.objective-card .row button[title="G"]').waitFor();
        await press(page.locator('.objective-card .collapse-btn[aria-expanded="true"]'));
        if (width >= 901) await page.keyboard.press("c");
        else await press(chip);
        const quiz = page.locator('.photo-quiz[data-thing="mailbox"]');
        await quiz.waitFor();
        assert.equal(await quiz.locator(".mic").count(), Number(speech));
        assert.equal(await quiz.locator("[data-choice]").count(), 3);
        const preview = await quiz.locator(".photo-quiz-preview").evaluate(async (img) => {
          await img.decode();
          const sheet = img.closest(".photo-quiz");
          const sheetBounds = sheet.getBoundingClientRect();
          const controls = [img, ...sheet.querySelectorAll("[data-choice]")];
          const fits = controls.every((el) => {
            const { left, top, right, bottom, width, height } = el.getBoundingClientRect();
            return width > 0 && height > 0
              && left >= Math.max(0, sheetBounds.left) && top >= Math.max(0, sheetBounds.top)
              && right <= Math.min(innerWidth, sheetBounds.right) && bottom <= Math.min(innerHeight, sheetBounds.bottom);
          });
          return { src: img.src, fits };
        });
        assert(preview.fits, "the photo and all three answers are visible together");
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
          assert.equal(await page.evaluate(() => window.__questSpeak("It's a mailbox")), true);
        } else await press(quiz.locator('[data-choice="mailbox"]'));
        await quiz.getByText(words.got, { exact: true }).waitFor();
        await shot(page, `${label}-got`);
        await press(quiz.getByRole("button", { name: words.open }));

        const book = page.locator(".photo-book");
        await book.waitFor();
        assert.equal(await book.locator(".photo-page").count(), 12);
        assert.match(await book.locator("header p").textContent(), /1.*12/);
        const foundPage = book.locator('.photo-page[data-thing="mailbox"][data-found="true"]');
        await checkGlossStack(foundPage);
        const picture = foundPage.locator("img");
        assert.equal(await picture.getAttribute("src"), preview.src, "the book saves the photo shown in the quiz");
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
        assert.match(await contact.textContent(), /1\/12/);
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
        await press(book.getByRole("button", { name: words.quitYes, exact: true }));
        await book.waitFor({ state: "detached" });
        assert.equal(await chip.count(), 0);
        assert.deepEqual(await page.evaluate(() => window.__ew.store.getState().progress.photoWalk), { status: "off", found: ["mailbox"] });
        await openPhone(page, press);
        assert.equal(await page.locator(".photo-contact").count(), 0);
        console.log(`${label} passed`);
      } finally { await context.close(); }
    }
  }
} finally { await browser.close(); }
