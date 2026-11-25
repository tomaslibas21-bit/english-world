// Run against the Spanish town on port 8311, or set WORLD_TEST_URL.
// WORLD_SHOTS saves the greeting, the country exchange and the start of the game.
import assert from "node:assert/strict";
import { launchPoolBrowser, poolPage, poolViewports } from "./pool-browser.mjs";

const sit = "x09-alberca";
const browser = await launchPoolBrowser();
try {
  for (const viewport of poolViewports) {
    const { page, context, phone, label, errors, open, shot } = await poolPage(browser, viewport);
    await open({ sit });
    await page.waitForFunction(() => !!window.__ew?.store);
    await page.evaluate((sitId) => {
      const { game, store } = window.__ew;
      const lines = window.__poolChatLines = [];
      const recordLine = ({ conv }) => {
        if (!conv.active || conv.sitId !== sitId || !conv.speaking || !conv.lineKey) return;
        if (lines.at(-1)?.id !== conv.speaking) {
          lines.push({ id: conv.speaking, key: conv.lineKey, npc: conv.npcId, poolActive: game.pool?.active });
        }
      };
      recordLine(store.getState());
      store.subscribe(recordLine);
    }, sit);

    const turn = (step) => page.waitForFunction(([sitId, stepId]) => {
      const { conv } = window.__ew.store.getState();
      return conv.active && conv.sitId === sitId && conv.hostId === "vale" && conv.phase === "you" && conv.stepId === stepId;
    }, [sit, step], { timeout: 30000 });
    const submit = (text) => page.evaluate((answer) => {
      void window.__ew.game.activeSession.submit(answer, [], "typed");
    }, text);

    const start = page.locator(".scene-start");
    if (phone) await start.tap(); else await start.click();
    await turn("play");
    await page.locator(".transcript .msg.npc").last().waitFor();
    await shot("chat-greeting");
    await submit("Sí, claro");
    await turn("name");
    await submit("Me llamo Ana");
    await turn("from");
    await submit("Soy de Lituania");
    await turn("ask");
    await shot("chat-country");
    await submit("¿Cuántos años tienes?");

    await page.waitForFunction(() => {
      const { game, store } = window.__ew;
      const { conv, hud } = store.getState();
      return conv.completed && !conv.active && game.modes.active?.id === "pool"
        && game.pool.debug().phase === "opening" && game.rig.mode === "stage" && hud.fade === 0;
    }, null, { timeout: 15000 });
    const result = await page.evaluate((sitId) => {
      const { game, store } = window.__ew;
      return {
        lines: window.__poolChatLines,
        completions: store.getState().progress.sits[sitId].completions,
        learner: game.player.root.position.toArray(),
      };
    }, sit);
    assert.deepEqual(result.lines.map(({ key }) => key), [
      "greet", "yes_play", "name_me", "nice", "family", "family2", "ask_where", "far", "from_us", "my_age", "lets_play",
    ], `${label}: Vale's lines in order`);
    assert(result.lines.every(({ npc, poolActive }) => npc === "vale" && !poolActive),
      `${label}: Vale finishes her lines before the game starts`);
    assert.equal(result.completions, 1, `${label}: chat completes`);
    const [x, y, z] = result.learner;
    assert(Math.hypot(x + 106, y + 1.16, z + 28.75) < 0.05, `${label}: learner joins the pool circle at ${result.learner}`);
    await page.locator('[data-line="pl_rules"]').waitFor();
    await page.waitForFunction(() => {
      const curtain = document.querySelector(".mode-hud .fade");
      return curtain && Number(getComputedStyle(curtain).opacity) === 0;
    });
    await shot("chat-join");
    assert.deepEqual(errors, []);
    console.log(`${label}: Vale's chat completed and the learner joined the ball game.`);
    await context.close();
  }
} finally {
  await browser.close();
}
