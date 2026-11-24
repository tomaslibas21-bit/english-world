// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/directions.mjs
import assert from "node:assert/strict";
import { answer, checkGlossStack, checkHud, closeChat, openQuestTown, questBrowser, questSizes, talkTo } from "./quests-harness.mjs";
import { shot } from "./screen-harness.mjs";

const browser = await questBrowser();
try {
  for (const [width, height] of questSizes) {
    const { context, page, press } = await openQuestTown(browser, width, height);
    const label = `directions-${width}x${height}`;
    try {
      const { npc, location, place, lineIds, lines, words, saveWords, title, ask, thank, firstCard } = await page.evaluate(async () => {
        const { ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_LINES, ASK_WAY_HINTS, ASK_WAY_META, ASK_WAY_UI, ASK_WAY_SITUATION } = await import("/src/content/ask-way-lines.ts");
        const { PHRASE_CARD_UI } = await import("/src/content/phrase-card-ui.ts");
        const { LOCATIONS } = await import("/src/content/locations.ts");
        const { location, lines } = ASK_WAY_PLACES[0];
        const unpipe = (source) => source.en.replaceAll(" | ", " ");
        return {
          npc: ASK_WAY_NPC, location, place: LOCATIONS[location].lt, lineIds: lines,
          lines: lines.map((key) => unpipe(ASK_WAY_LINES[key][0])),
          words: { ...ASK_WAY_UI, to: ASK_WAY_UI.to(LOCATIONS[location].lt) },
          saveWords: PHRASE_CARD_UI,
          firstCard: { en: unpipe(ASK_WAY_LINES[lines[0]][0]), lt: ASK_WAY_LINES[lines[0]][0].nat, situationId: ASK_WAY_SITUATION },
          title: ASK_WAY_META.title.en,
          ask: unpipe(ASK_WAY_HINTS.where.items[0].s), thank: unpipe(ASK_WAY_HINTS.thanks.items[0].s),
        };
      });
      const card = page.locator(".directions-card");
      assert.equal(await card.count(), 0);
      await talkTo(page, npc);
      await answer(page, "where", ask);
      assert.equal(await card.count(), 0);
      await answer(page, "thanks", thank);
      await closeChat(page);
      const completion = page.locator(".town-toasts .toast.stamp", { hasText: title });
      await completion.waitFor();
      assert.equal(await card.isVisible(), false);
      await card.getByText(words.to, { exact: true }).waitFor();
      await checkHud(page, ".directions-card");

      const directionLines = card.locator(".direction-lines");
      const saveFor = (key) => directionLines.locator(".phrase-save-row")
        .filter({ has: page.locator(`[data-line="${key}"]`) }).locator("[data-phrase-save]");
      const readCards = () => page.evaluate(async (en) => {
        const { cardKey, STORAGE_KEY } = await import("/src/state/cards.ts");
        const cards = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null")?.cards ?? [];
        return cards.filter((card) => cardKey(card.en) === cardKey(en));
      }, firstCard.en);
      for (const key of lineIds) {
        const line = directionLines.locator(`[data-line="${key}"]`);
        assert.equal(await line.getAttribute("aria-expanded"), "false");
        const save = saveFor(key);
        assert.equal(await save.getAttribute("aria-label"), saveWords.add);
        assert(await save.evaluate((button) => {
          const { left, right, top, bottom, width, height } = button.getBoundingClientRect();
          const text = button.previousElementSibling.getBoundingClientRect();
          return width >= 44 && height >= 44 && text.right <= left
            && left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight;
        }), "each collapsed row has a separate in-frame 44 px save");
      }
      assert.deepEqual(await readCards(), []);
      const firstSave = saveFor(lineIds[0]);
      if (width >= 901) await firstSave.press("Enter");
      else await press(firstSave);
      assert.equal(await firstSave.getAttribute("aria-label"), saveWords.inCards);
      assert.equal(await directionLines.locator('[aria-expanded="true"], [lang="lt"]').count(), 0);
      const saved = await readCards();
      assert.equal(saved.length, 1);
      const [{ en, lt, situationId, sentence }] = saved;
      assert.deepEqual({ en, lt, situationId }, firstCard);
      assert.deepEqual({ en: sentence.en, lt: sentence.lt }, { en, lt });

      for (const [i, key] of lineIds.entries()) {
        const line = directionLines.locator(`[data-line="${key}"]`);
        await line.getByText(lines[i], { exact: true }).waitFor();
        await press(line);
        assert.equal(await line.getAttribute("aria-expanded"), "true");
        await checkGlossStack(line);
      }
      await press(firstSave);
      assert.equal(await directionLines.locator(`[data-line="${lineIds[0]}"]`).getAttribute("aria-expanded"), "true");
      assert.deepEqual(await readCards(), saved);
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
