// Run against the Spanish town on port 8311, or set WORLD_TEST_URL.
// WORLD_SHOTS saves the idle rally, stage, hit, splash and score card.
import assert from "node:assert/strict";
import { launchPoolBrowser, poolPage, poolViewports } from "./pool-browser.mjs";

const browser = await launchPoolBrowser();
try {
  for (const viewport of poolViewports) {
    const { page, context, phone, label, errors, open, shot } = await poolPage(browser, viewport, { completed: true });
    await page.addInitScript(() => {
      let now = 1000;
      performance.now = () => now;
      const frames = [];
      window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
      window.cancelAnimationFrame = () => {};
      window.__stepPool = (n) => {
        for (let frame = 0; frame < n; frame++) {
          now += 50;
          for (const fn of frames.splice(0)) fn(now);
        }
      };
    });
    await open();
    await page.waitForFunction(() => window.__ew?.game?.zoneId === "town", null, { polling: 50 });

    const step = (n = 1) => page.evaluate((frames) => window.__stepPool(frames), n);
    const state = () => page.evaluate(() => window.__ew.game.pool?.debug());
    const backpack = () => page.evaluate(() => window.__ew.game.player.backpackVisible);
    const waitFor = async (predicate, description, batch = 5, limit = 150) => {
      for (let i = 0; i < limit; i++) {
        if (predicate(await state())) return;
        await step(batch);
      }
      assert.fail(`${label}: ${description}: ${JSON.stringify({ state: await state(), errors })}`);
    };

    assert.equal(await page.evaluate(() => window.__ew.game.poolTeleport()), true);
    await step(4);
    assert.equal(await backpack(), true, `${label}: backpack visible on the deck`);
    const idle = await page.evaluate(() => window.__ew.game.drawStats());
    assert(idle.calls > 0, `${label}: renderer reports draw calls at the pool`);
    const walkingPool = () => page.evaluate(() => {
      const { game, store } = window.__ew;
      const ball = game.scene.getObjectByName("hotel-pool-ball");
      return { view: game.rig.mode, prompt: store.getState().hud.prompt?.kind, ball: ball?.visible && ball.position.toArray() };
    });
    const beforeWalk = await walkingPool();
    await page.keyboard.down("w");
    try {
      for (let frame = 0; frame < 100 && (await walkingPool()).prompt !== "pool"; frame++) await step(2);
    } finally {
      await page.keyboard.up("w");
    }
    await step(8);
    const afterWalk = await walkingPool();
    assert.equal(afterWalk.view, "follow", `${label}: idle rally uses the walking camera`);
    assert.equal(afterWalk.prompt, "pool", `${label}: completed chat unlocks the pool prompt`);
    assert.equal(await backpack(), false, `${label}: backpack hidden while wading`);
    assert(await page.getByRole("button", { name: /Play ball|Žaisti kamuoliu/ }).first().isVisible());
    assert(Array.isArray(afterWalk.ball), `${label}: idle ball visible`);
    assert.notDeepEqual(afterWalk.ball, beforeWalk.ball, `${label}: idle rally advances`);
    await shot("idle");

    const restoreRandom = await page.evaluateHandle(() => Math.random);
    assert.equal(await page.evaluate(() => {
      // The idle rally has its own generator. Keep player-directed serves deterministic.
      Math.random = () => 0.5;
      return window.__ew.game.modes.start("pool");
    }), true);
    await page.waitForTimeout(480);
    await waitFor((s) => s?.phase === "play" && s.canHit, "first hit window", 1, 300);
    // The round has captured its RNG. Restore the world's randomness so the splash fans out.
    await page.evaluate((random) => { Math.random = random; }, restoreRandom);
    await restoreRandom.dispose();
    assert(await page.locator('[data-line="pl_tuya"]').isVisible());
    const { subjects, foreground } = await page.evaluate(() => window.__ew.game.poolFraming());
    assert.deepEqual(subjects.map(({ id }) => id).sort(), ["ball", "diego", "learner", "santi", "vale"]);
    for (const { id, point: [x, y, z], blockers } of subjects) {
      assert(Math.abs(x) < 0.9 && Math.abs(y) < 0.8 && Math.abs(z) < 1, `${label}: ${id} in frame at ${[x, y, z]}`);
      assert.deepEqual(blockers, [], `${label}: clear sightline to ${id}`);
    }
    assert.deepEqual(foreground, [], `${label}: clear foreground across the frame`);
    assert.equal(await backpack(), false, `${label}: backpack hidden during the ball game`);

    await shot("stage");
    if (phone) await page.locator(".pool-hit").dispatchEvent("pointerdown", { pointerType: "touch", bubbles: true });
    else await page.keyboard.press("Space");
    assert.equal((await state()).hits, 1);
    await step(4);
    assert(await page.locator('[data-line="pl_n1"]').isVisible());
    await shot("hit");

    await waitFor((s) => s?.drops >= 1, "missed learner pass", 1, 450);
    await step(4);
    assert.equal((await state()).hits, 1);
    assert.equal((await state()).streak, 0);
    assert(await page.locator('[data-line="pl_cayo"]').isVisible());
    assert(await page.evaluate(() => window.__ew.game.splashes.drops.visible), `${label}: missed ball splashes`);
    await shot("miss");

    await waitFor((s) => s?.phase === "result", "score after three drops", 12);
    const card = page.getByRole("dialog");
    assert(await card.isVisible());
    assert.match(await card.textContent(), /Your hits\s*1|Tavo smūgiai\s*1/);
    assert.match(await card.textContent(), /Best run\s*2|Geriausia serija\s*2/);
    assert.equal((await state()).drops, 3);
    const saved = await page.evaluate(() => window.__ew.store.getState().progress.pool);
    assert.deepEqual(saved, { best: 2, rounds: 1, rulesHeard: true });
    await shot("score");
    await page.keyboard.press("Escape");
    assert.equal((await state()).phase, null, `${label}: the ball game ended`);
    assert.equal(await backpack(), true, `${label}: backpack restored after the ball game`);
    assert.deepEqual(errors, []);
    console.log(`${label}: hit, miss, score. Draw calls at the pool: ${idle.calls}.`);
    await context.close();
  }
} finally {
  await browser.close();
}
