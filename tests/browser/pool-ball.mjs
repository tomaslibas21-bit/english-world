// Run against the Spanish town on port 8311, or set WORLD_TEST_URL.
// WORLD_SHOTS saves the idle rally, stage, hit, splash and score card.
import assert from "node:assert/strict";
import { launchPoolBrowser, poolPage, poolViewports } from "./pool-browser.mjs";
import { assertSavedSentence, cardsFor, checkManualSave, fixtureSentence } from "./fixtures/phrase-saves.mjs";

const browser = await launchPoolBrowser();
try {
  for (const viewport of [...poolViewports, [844, 390]]) {
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

    let frame = 0;
    const step = async (n = 1) => {
      await page.evaluate((frames) => window.__stepPool(frames), n);
      frame += n;
    };
    const learner = process.env.WORLD_LEARNER || "en";
    assert.equal(await page.locator("html").getAttribute("lang"), learner);
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
    await page.waitForFunction(() => window.__ew.game.pool.debug().phase === "opening"
      && window.__ew.store.getState().hud.fade === 0, null, { polling: 50 });
    await step(2);
    const instruction = page.locator(".pool-instruction");
    assert.equal(await instruction.getAttribute("data-help"), "long");
    if (phone && viewport[0] === 390) {
      const speech = await page.locator('[data-line="pl_rules"]').boundingBox();
      const menu = await page.locator(".ride-menu").boundingBox();
      assert(speech && menu && menu.x - (speech.x + speech.width) >= 8, `${label}: opening speech clears the menu`);
    }
    await waitFor((s) => s?.phase === "play" && s.receiver === "learner", "first pass to the learner", 1, 300);
    const fast = phone && viewport[1] === 664;
    if (fast) await page.evaluate(() => Object.assign(window.__ew.game.pool.round.flight, { height: "fast", seconds: 2.1 }));
    const timing = () => page.evaluate(() => {
      const { flight, phaseTime, canHit } = window.__ew.game.pool.round;
      const button = document.querySelector(".pool-hit");
      const outline = button && getComputedStyle(button);
      return { phaseTime, canHit, height: flight.height, seconds: flight.seconds,
        ring: button?.dataset.canHit, gold: outline?.outlineColor === "rgb(255, 209, 102)" && outline.outlineWidth === "3px" };
    });
    const before = await timing();
    const slot = page.locator(".pool-help-slot");
    const startSlot = await slot.boundingBox();
    assert.equal(before.canHit, false);
    if (phone) assert.equal(before.ring, "false");
    assert.equal(await instruction.getAttribute("data-help"), phone ? "short" : "long");
    const openHitWindow = async () => {
      let previous = await timing();
      for (let f = 0; f < 100; f++) {
        await step();
        const now = await timing();
        if (now.canHit) return { previous, now };
        previous = now;
      }
      assert.fail("hit window did not open");
    };
    const { previous, now } = await openHitWindow();
    const opensAt = now.seconds - (fast ? 0.5 : phone ? 0.75 : 0.6);
    assert(previous.phaseTime < opensAt && now.phaseTime >= opensAt && now.phaseTime - opensAt <= 0.051);
    assert.equal(await instruction.getAttribute("data-help"), phone ? "short" : "long", "the first-pass hint stays through the first actionable window");
    if (phone) assert(previous.ring === "false" && now.ring === "true" && now.gold);
    else {
      assert.equal(await slot.locator('[data-help="timing"]').count(), 1);
      assert(Math.abs((await slot.boundingBox()).y - startSlot.y) <= 2, "keyboard timing uses its reserved slot");
    }
    // The round has captured its RNG. Restore the world's randomness so the splash fans out.
    await page.evaluate((random) => { Math.random = random; }, restoreRandom);
    await restoreRandom.dispose();
    const call = page.locator('[data-line="pl_tuya"]');
    assert(await call.isVisible());
    assert.match(await call.textContent(), /Yours!|Tavo!/);
    const yours = page.locator('.pool-cue[data-line="pl_tuya"]');
    const sit = "x09-alberca";
    const saveState = () => page.evaluate(async () => {
      const { usePool } = await import("/src/game/pool/store.ts");
      const { game, store } = window.__ew;
      const { play, pool } = store.getState().progress;
      return { round: game.pool.debug(), result: usePool.getState().result, kept: [...game.pool.kept.keys()], play, pool };
    });
    const keptCue = await checkManualSave(page, yours.locator("[data-phrase-save]"), phone, "¡Tuya!", sit, saveState, "Space");
    assertSavedSentence(keptCue, await fixtureSentence(page, sit, "pl_tuya"), sit);
    await shot(`PC-${learner}-${label}-live-cue-F${frame}`);
    if (!phone) await page.evaluate(() => document.activeElement.blur());
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
    assert.equal(await page.locator(".pool-instruction").count(), 0);
    if (phone) assert.equal(await page.locator(".pool-hit").getAttribute("data-can-hit"), "false");
    await step(4);
    assert(await page.locator('[data-line="pl_n1"]').isVisible());
    await shot("hit");

    await waitFor((s) => s?.phase === "play" && s.canHit, "next hit window", 1, 450);
    assert.equal(await page.locator(".pool-instruction").count(), 0, "the long instructions do not return");
    if (phone) assert.equal(await page.locator(".pool-hit").getAttribute("data-can-hit"), "true");
    await waitFor((s) => s?.flightPhase === "fall", "the next window expires without a hit", 1, 40);
    if (phone) assert.equal(await page.locator(".pool-hit").getAttribute("data-can-hit"), "false");
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
    const displayedBest = await card.getByText(/^(Best run|Geriausia serija)$/).locator("..").locator(".mode-score-number").evaluate((el) => ({
      value: el.textContent,
      opaque: getComputedStyle(el).opacity === "1",
      animated: el.getAnimations({ subtree: true }).length > 0,
    }));
    assert.deepEqual(displayedBest, { value: "2", opaque: true, animated: false }, "best run paints its final value immediately");
    assert.equal((await state()).drops, 3);
    const review = card.locator(".phrase-review-row");
    const rules = "Hay que tener la pelota en el aire.";
    await review.getByRole("combobox").selectOption({ label: rules });
    const keptRule = await checkManualSave(page, review.locator("[data-phrase-save]"), phone, rules, sit, saveState);
    assertSavedSentence(keptRule, await fixtureSentence(page, sit, "pl_rules"), sit);
    await review.getByRole("combobox").selectOption({ label: keptCue.en });
    assert.equal(await review.locator(`small[lang="${learner}"]`).textContent(), keptCue.lt);
    assert.equal(await review.locator("[data-phrase-save]").getAttribute("aria-pressed"), "true");
    assert.deepEqual(await cardsFor(page, keptCue.en), [keptCue]);
    const saved = await page.evaluate(() => window.__ew.store.getState().progress.pool);
    assert.deepEqual(saved, { best: 2, rounds: 1, rulesHeard: true });
    await shot("score");
    await shot(`PC-${learner}-${label}-score-checked-F${frame}`);
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
