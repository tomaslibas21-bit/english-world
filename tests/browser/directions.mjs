// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/directions.mjs
import assert from "node:assert/strict";
import { answer, checkGlossStack, checkHud, closeChat, openQuestTown, questBrowser, questSizes, talkTo } from "./quests-harness.mjs";
import { shot } from "./screen-harness.mjs";
import { activatePhraseControl, cardsFor, checkManualSave } from "./fixtures/phrase-saves.mjs";

const browser = await questBrowser();
try {
  for (const [width, height] of questSizes) {
    const { context, page, press, languages } = await openQuestTown(browser, width, height);
    const label = `directions-${width}x${height}`;
    try {
      const { npc, situation, destination, location, place, lines, words, title, ask, thank } = await page.evaluate(async () =>
        (await import("/tests/browser/fixtures/quest-content.mjs")).directionsContent());
      const card = page.locator(".directions-card");
      assert.equal(await card.count(), 0);
      await talkTo(page, npc, situation);
      assert.deepEqual(await page.evaluate(() => window.__ew.store.getState().conv.stepProgress), { step: 1, of: 2 });
      await answer(page, "where", ask);
      assert.equal(await card.count(), 0);
      await answer(page, "thanks", thank);
      await closeChat(page);
      assert.equal(await page.evaluate(() => window.__ew.store.getState().conv.stepProgress), null);
      const completion = page.locator(".town-toasts .toast.stamp", { hasText: title });
      await completion.waitFor();
      assert.equal(await card.isVisible(), false);
      await card.getByText(words.to, { exact: true }).waitFor();
      assert.equal(await card.getAttribute("data-destination"), destination);
      await checkHud(page, ".directions-card");
      await page.evaluate(() => {
        const { audio } = window.__ew;
        window.__replayedDirections = [];
        const play = audio.play.bind(audio);
        audio.play = (...args) => {
          window.__replayedDirections.push(args[2]);
          return play(...args);
        };
        window.__ew.store.getState().setSettings({ volume: 1 });
      });
      await press(card.getByRole("button", { name: words.replay, exact: true }));
      await page.waitForFunction((count) => window.__replayedDirections?.length >= count, lines.length);
      assert.deepEqual(await page.evaluate(() => window.__replayedDirections), lines.map(({ say }) => say));
      const first = card.locator(`[data-line="${lines[0].key}"]`);
      const save = first.locator("..").locator("[data-phrase-save]");
      const expanded = () => card.locator(".direction-lines [aria-expanded]").evaluateAll((rows) =>
        rows.map((row) => [row.getAttribute("aria-expanded"), row.querySelector("small")?.textContent ?? null]));
      assert.deepEqual(await expanded(), lines.map(() => ["false", null]));
      const touch = width < 500 || height < 500;
      const saved = await checkManualSave(page, save, touch, lines[0].en, situation, expanded);
      assert.equal(saved.lt, lines[0].nat);
      assert.equal(saved.sentence.say ?? saved.sentence.en, lines[0].say);
      for (const sentence of lines) {
        const line = card.locator(`[data-line="${sentence.key}"]`);
        await line.getByText(sentence.en, { exact: true }).waitFor();
        assert.equal(await line.locator("small").count(), 0);
        await press(line);
        await checkGlossStack(line, sentence, languages);
      }
      const disclosed = await expanded();
      await save.scrollIntoViewIfNeeded();
      await activatePhraseControl(page, save, touch);
      assert.deepEqual(await expanded(), disclosed);
      assert.deepEqual(await cardsFor(page, lines[0].en), [saved]);
      await checkHud(page, ".directions-card");
      if (height <= 520) assert((await card.boundingBox()).width <= 256);
      await shot(page, `${label}-card`);
      const objective = await page.evaluate(() => window.__ew.store.getState().progress.objective);
      await press(card.getByRole("button", { name: words.guide, exact: true }));
      assert.equal(await page.evaluate(([location, objective]) => {
        const { game, store } = window.__ew;
        const door = game.doors.find((door) => door.loc === location);
        const end = game.autoPath?.at(-1);
        return !!end && Math.hypot(end[0] - door.outX, end[1] - door.outZ) <= 1.5
          && store.getState().progress.objective === objective;
      }, [location, objective]), true);

      await page.evaluate((location) => {
        const { game } = window.__ew;
        const door = game.doors.find((door) => door.loc === location);
        game.placeOnFoot(door.outX, door.outZ, door.rot);
      }, location);
      await card.waitFor({ state: "detached" });
      const toast = page.locator(".town-toasts .toast", { hasText: words.arrived });
      await toast.getByText(place, { exact: true }).waitFor({ timeout: 30000 });
      await shot(page, `${label}-arrived`);
      console.log(`${label} passed`);
    } finally { await context.close(); }
  }
} finally { await browser.close(); }
