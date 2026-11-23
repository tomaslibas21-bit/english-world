// WORLD_TEST_URL=http://127.0.0.1:8096 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/directions.mjs
import assert from "node:assert/strict";
import { answer, checkGlossStack, checkHud, closeChat, openQuestTown, questBrowser, questSizes, talkTo } from "./quests-harness.mjs";
import { shot } from "./screen-harness.mjs";

const browser = await questBrowser();
try {
  for (const [width, height] of questSizes) {
    const { context, page, press } = await openQuestTown(browser, width, height);
    const label = `directions-${width}x${height}`;
    try {
      const { npc, location, place, lineIds, lines, words, title, ask, thank } = await page.evaluate(async () => {
        const { ASK_WAY_NPC, ASK_WAY_PLACES, ASK_WAY_LINES, ASK_WAY_HINTS, ASK_WAY_META, ASK_WAY_UI } = await import("/src/content/ask-way-lines.ts");
        const { L } = await import("/src/ui/i18n.ts");
        const { LOCATIONS } = await import("/src/content/locations.ts");
        const { location, lines } = ASK_WAY_PLACES[0];
        const unpipe = (source) => source.en.replaceAll(" | ", " ");
        return {
          npc: ASK_WAY_NPC, location, place: LOCATIONS[location].lt, lineIds: lines,
          lines: lines.map((key) => unpipe(ASK_WAY_LINES[key][0])),
          words: { ...Object.fromEntries(Object.entries(ASK_WAY_UI).map(([key, value]) => [key, L(value)])),
            to: L(ASK_WAY_UI.to, { place: LOCATIONS[location].lt }) },
          title: ASK_WAY_META.title.en,
          ask: unpipe(ASK_WAY_HINTS.where.items[0].s), thank: unpipe(ASK_WAY_HINTS.thanks.items[0].s),
        };
      });
      const card = page.locator(".directions-card");
      assert.equal(await card.count(), 0);
      await talkTo(page, npc);
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
      await page.waitForFunction(() => window.__replayedDirections?.length >= 2);
      for (const [i, key] of lineIds.entries()) {
        const line = card.locator(`[data-line="${key}"]`);
        await line.getByText(lines[i], { exact: true }).waitFor();
        assert.equal(await line.locator("small").count(), 0);
        await press(line);
        await checkGlossStack(line);
      }
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
