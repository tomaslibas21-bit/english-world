// Run against a local Vite server. Set WORLD_PLAYWRIGHT_MODULE to use an existing Playwright installation.
import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.SHOTS_DIR || "/tmp/billiards-shots";
const sizes = process.env.WORLD_SIZES ? process.env.WORLD_SIZES.split(",").map((s) => s.split("x").map(Number)) : [[1280, 800], [390, 844], [390, 664]];
const progress = {
  version: 1,
  profile: {
    name: "Ana", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" },
  },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0.3, sounds: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -14, z: 31.4, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};

function installControls([key, save]) {
  localStorage.setItem(key, save);
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  cancelAnimationFrame = () => {};
  window.__spokenBilliards = [];
  speechSynthesis.speak = (utterance) => {
    window.__spokenBilliards.push(utterance.text);
    requestAnimationFrame(() => utterance.onend?.());
  };
  window.__stepBilliards = (n) => {
    for (let i = 0; i < n; i++) {
      now += 50;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of sizes) {
    const phone = width === 390 || height === 390, label = `${width}x${height}`;
    const dir = join(shots, label);
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
    try {
      await context.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
      await context.addInitScript(installControls, [`${storage}-progress-v1`, JSON.stringify(progress)]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (err) => { errors.push(err.message); console.log("PAGEERROR", err.stack?.slice(0, 900)); });
      await page.goto(base, { waitUntil: "domcontentloaded" });
      const step = (frames = 4) => page.evaluate((n) => window.__stepBilliards(n), frames);
      const state = () => page.evaluate(() => window.__ew?.billiards?.state());
      const wait = async (predicate, description, attempts = 220) => {
        for (let i = 0; i < attempts; i++) {
          await step();
          if (await predicate()) return;
        }
        const current = await state();
        const conv = await page.evaluate(() => { const { game, store } = window.__ew; const st = store.getState(); return { phase: st.conv?.phase, step: game.activeSession?.conv?.effectiveStep?.()?.id, voice: window.__ew.voice(), last: st.conv.transcript.slice(-3).map((line) => line.sentence?.en ?? line.text) }; }).catch((e) => String(e));
        await page.screenshot({ path: join(dir, `fail-wait.png`) });
        console.log("WAITFAIL", JSON.stringify(conv));
        assert.fail(`${label}: ${description}; phase ${current?.phase ?? "outside game"}; ${errors.join(", ")}`);
      };
      const phase = (...phases) => wait(async () => phases.includes((await state())?.phase), phases.join(" or "));
      const press = (locator) => phone ? locator.tap() : locator.click();
      const screenshot = async (name) => {
        await step();
        await page.screenshot({ path: join(dir, `${name}.png`) });
      };
      const ballChip = (id) => page.locator(`.bl-ball-chips [data-ball="${id}"]`);
      const pocketChip = (id) => page.locator(`.bl-pocket-chips [data-pocket="${id}"]`);
      const shoot = (power) => page.evaluate((p) => {
        const debug = window.__ew.billiards;
        debug.shoot(p);
        debug.settle();
      }, power);
      const layout = (balls) => page.evaluate((positions) => window.__ew.billiards.layout(positions), balls);

      async function checkLayout(aiming) {
        await wait(() => page.evaluate(() => !!document.querySelector(".bl-header") && !!document.querySelector(".bl-panel") && !!document.querySelector(".bl-table-pad")), "game screen");
        await step();
        const { table, actors, header, status, exit, panel, stage, power } = await page.evaluate(() => {
          const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect().toJSON();
          const { table, actors } = window.__ew.billiards.state();
          return { table, actors, header: rect(".bl-header"), status: rect(".bl-status"), exit: rect(".bl-exit"),
            panel: rect(".bl-panel"), stage: rect(".bl-table-pad"), power: rect(".bl-power") };
        });
        const intersects = (a, b) => a.top < b.bottom && a.bottom > b.top && a.left < b.right && a.right > b.left;
        const visibleActors = actors.filter((actor) => actor.visible);
        const actorsClear = visibleActors.every((actor) => [table, header, panel, power].filter(Boolean).every((area) => !intersects(actor, area)));
        // A screen wider than tall puts the panel beside the table (billiards.css); else it is under it.
        const beside = panel.left >= table.right - 1;
        const between = beside ? table.right <= panel.left && !intersects(table, status) && !intersects(table, exit)
          : table.top >= header.bottom && table.bottom <= panel.top;
        if (!between || !actorsClear) { await page.screenshot({ path: join(dir, `fail-layout-${aiming}.png`) }); console.log("LAYOUT", JSON.stringify({ table, actors, header, panel, stage, power })); }
        assert(actorsClear, `${label}: visible players clear the table, header and controls`);
        assert(table.left >= stage.left - 1 && table.right <= stage.right + 1, `${label}: rails fit across the stage`);
        assert(between, `${label}: rails fit between header and controls ${JSON.stringify({ table, header, panel, status, exit })}`);
        assert(table.width >= 120 && table.height >= 180, `${label}: table is readable`);
        assert(panel.top > 0 && panel.bottom <= height && panel.height >= 65, `${label}: whole panel is on screen`);
        assert.equal(!!power, aiming);
        if (power) assert(table.right < power.left && (beside ? power.right <= panel.left && !intersects(power, exit) : power.top >= header.bottom && power.bottom <= panel.top), `${label}: power bar clears table and panels`);
      }

      async function listen(correct, capture, beforeShot) {
        await phase("listen");
        await checkLayout(false);
        const { ai, available } = await state();
        const pocket = correct ? ai.pocket : ai.pocket === "fl" ? "nr" : "fl";
        await press(ballChip(available.includes(ai.ball) ? ai.ball : available[0]));
        await press(pocketChip(pocket));
        assert.equal((await state()).correct, correct);
        if (capture) {
          assert.equal(await page.getByText(correct ? "Teisingai!" : "Tina paskelbė:", { exact: true }).count(), 1);
          await screenshot(correct ? "04-listening-right" : "05-listening-wrong");
        }
        if (beforeShot) await beforeShot();
        await phase("rolling");
        await page.evaluate(() => window.__ew.billiards.settle());
      }

      async function learnerAfterTina() {
        for (let turn = 0; turn < 6; turn++) {
          await phase("call", "listen");
          if ((await state()).phase === "call") return;
          await listen(true, false);
        }
        assert.fail(`${label}: Tina should yield the table`);
      }

      await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", 3000);
      const baseline = await page.evaluate(() => window.__ew.game.orderedSituations().length);
      assert.equal(baseline, 50);
      await openPhoneMenu(page); // (batch 0: on a phone the town's tools fold behind Meniu)
      await press(page.getByRole("button", { name: "Visos situacijos", exact: true }).first());
      assert.equal(await page.locator('.scn-card[data-sit="x01-pool-hall"]').count(), 0);
      await press(page.locator(".sheet").getByRole("button", { name: "Uždaryti" }));
      const door = page.locator(".prompt", { hasText: "The Corner Pocket" });
      await wait(() => door.isVisible(), "Corner Pocket entrance");
      await press(door);
      await wait(() => page.evaluate(() => window.__ew.game.zone.id === "pool-hall" && !window.__ew.game.transitioning), "walks through the door");
      await page.waitForFunction(() => {
        const fade = document.querySelector(".fade");
        return fade && Number(getComputedStyle(fade).opacity) === 0;
      }, null, { polling: 30 });
      await screenshot("01-hall");
      await page.evaluate(() => window.__ew.game.walkTo(1.55, 1.28, { kind: "point" }));
      const tina = page.locator(".prompt", { hasText: "Tina" });
      await wait(() => tina.isVisible(), "walks over to Tina");
      await press(tina);
      await wait(() => page.locator(".convo").isVisible(), "Tina's conversation");
      const intro = page.locator(".scene-intro").getByRole("button", { name: "Pradėti" });
      if (await intro.isVisible()) await press(intro);
      const replies = { play: "A little.", name: "I'm Ana.", group: "Solids, please.", ask: "How long have you played?" };
      for (const [expected, answer] of Object.entries(replies)) {
        await wait(async () => {
          const ready = await page.evaluate((name) => {
            const { game, store } = window.__ew;
            return store.getState().conv.phase === "you" && game.activeSession.conv.effectiveStep()?.id === name;
          }, expected);
          if (!ready) await page.waitForTimeout(35);
          return ready;
        }, `chat step ${expected}`);
        if (expected === "group") await screenshot("01b-chat");
        if (expected === "group") {
          assert.equal(await page.evaluate(() => window.__ew.store.getState().conv.checklist.filter((item) => item.done).length), 2);
        }
        await page.locator(".typebox input").fill(answer);
        await press(page.locator(".typebox").getByRole("button", { name: "Siųsti" }));
      }
      const card = page.locator(".ended-box");
      await wait(() => card.isVisible(), "chat completion");
      const play = card.getByRole("button", { name: "Žaisti biliardą" });
      assert.equal(await play.count(), 1);
      await press(play);
      await phase("break");
      assert.equal((await state()).group, "solids");
      assert.equal((await state()).shots, 0);
      await checkLayout(true);
      await screenshot("02-break");
      if (!phone) {
        const displayedPower = () => page.locator(".bl-power-value").textContent().then(parseFloat);
        await page.keyboard.down("Space");
        await step(12);
        const rising = await displayedPower();
        await step(12);
        const peak = await displayedPower();
        await step(15);
        const falling = await displayedPower();
        assert(rising > 0 && peak > rising && falling < peak, `${label}: Space visibly charges and then discharges`);
        await page.evaluate(() => window.dispatchEvent(new Event("blur")));
        await page.keyboard.up("Space");
        assert.equal((await state()).phase, "break");
      }
      await shoot(0.78);
      await phase("call", "listen");
      let heardRight = false;
      if ((await state()).phase === "listen") {
        await listen(true, true);
        heardRight = true;
        await learnerAfterTina();
      }

      // Lay out a straight, physically playable shot so the test can exercise a made call across all input sizes.
      const own = (await state()).available[0];
      const arrange = async (target, scratch = false) => {
        const { layout: balls } = await state();
        await layout(balls.filter((ball) => !ball.pocket).map(({ id }, i) => id === 0
          ? { id, x: scratch ? 0.22 : 0.18, z: 0 }
          : id === target && !scratch ? { id, x: -0.23, z: 0 }
          : { id, x: -0.34 + (i % 5) * 0.15, z: -0.71 - Math.floor(i / 5) * 0.11 }));
      };
      await arrange(own);
      await press(ballChip(own));
      await step();
      const sidePocket = await page.evaluate(() => {
        const camera = window.__ew.game.rig.cam;
        const p = camera.position.clone().set(-0.495, 0.84, 0).project(camera);
        return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
      });
      if (phone) await page.touchscreen.tap(sidePocket.x, sidePocket.y);
      else await page.mouse.click(sidePocket.x, sidePocket.y);
      assert.equal((await state()).selection.ball, own);
      assert.equal((await state()).selection.pocket, "ls");
      await checkLayout(false);
      const pocketLabels = await page.locator(".bl-pocket-chips .kit-gloss-compact > *").allTextContents();
      assert.equal(pocketLabels.length, 12);
      assert(pocketLabels.every((label) => !label.endsWith(".")));
      assert.match(await page.locator(".bl-confirm [lang=en]").innerText(), /left side pocket\.$/);
      await screenshot("03-call");
      await press(page.locator(".bl-confirm"));
      await phase("aim");
      await checkLayout(true);
      await screenshot("03-aim");
      await shoot(0.45);
      const point = () => page.evaluate(() => {
        const table = window.__ew.game.zone.group.getObjectByName("billiards-table");
        const ring = table.getObjectByName("billiards-point-ring");
        const number = table.getObjectByName("billiards-point");
        return { flash: ring.visible, number: number.visible, x: ring.position.x, z: ring.position.z };
      });
      const scored = await point();
      assert.deepEqual(scored, { flash: true, number: true, x: -0.495, z: 0 });
      await screenshot("03-made");
      await step(12);
      assert.deepEqual(await point(), { ...scored, flash: false, number: false });
      await phase("call");
      assert.equal((await state()).layout.find((b) => b.id === own).pocket, "ls");

      const next = (await state()).available[0];
      await arrange(next, true);
      await press(ballChip(next));
      await press(pocketChip("rs"));
      await press(page.locator(".bl-confirm"));
      await phase("aim");
      await page.evaluate(() => window.__ew.billiards.aimAt({ x: 0.495, z: 0 }));
      if (phone) await shoot(0.55);
      else {
        const track = await page.locator(".bl-power-track").boundingBox();
        assert(track);
        const x = track.x + track.width / 2;
        await page.mouse.move(x, track.y + track.height * 0.3);
        await page.mouse.down();
        await page.mouse.move(x, track.y + track.height * 0.55, { steps: 5 });
        assert((await state()).power > 0.45 && (await state()).power < 0.7);
        await page.mouse.up();
        await phase("rolling");
        await page.evaluate(() => window.__ew.billiards.settle());
      }
      await phase("listen");
      assert(await page.evaluate(() => window.__spokenBilliards.includes("Oops, scratch!")));
      const scratch = (await state()).layout.find((ball) => ball.id === 0);
      assert.equal(scratch.pocket, null);
      assert.equal(scratch.x, 0);
      assert(Math.abs(scratch.z - 0.495) < 0.1);
      if (!heardRight) {
        await listen(true, true);
        await phase("call", "listen");
        if ((await state()).phase === "call") {
          const id = (await state()).available[0];
          await page.evaluate((id) => window.__ew.billiards.callShot(id, "fl"), id);
          await phase("aim");
          await shoot(0.06);
        }
      }
      // The saved state of the learner's four balls lets the next call exercise the winning eight.
      await listen(false, true, async () => {
        const { layout: balls } = await state();
        await layout(balls.filter(({ id }) => id > 0 && id < 8).map(({ id, x, z }) => ({ id, x, z, pocket: "ls" })));
      });
      await learnerAfterTina();
      assert.deepEqual((await state()).available, [8]);
      await arrange(8);
      await press(ballChip(8));
      await press(pocketChip("ls"));
      await press(page.locator(".bl-confirm"));
      await phase("aim");
      await page.evaluate(() => window.__ew.billiards.aimAtGhost());
      await shoot(0.45);
      await phase("reply");
      await press(page.locator('.bl-choice[data-line="h_gg"]'));
      await phase("result");
      assert.equal(await page.locator(".mode-score-card h2").innerText(), "Laimėjai!");
      const { result } = await state();
      assert.equal(result.called, 2);
      assert.equal(result.sunk, 4);
      assert(result.understood > 0 && result.understood < result.listens);
      assert.equal(result.cards, 9);
      await step(16);
      // The game frames are stepped, while the score's CSS animations use the browser clock.
      await page.locator(".mode-score-card").evaluate(async (card) => {
        await Promise.allSettled(card.getAnimations({ subtree: true }).map((animation) => animation.finished));
      });
      await screenshot("06-score");

      const rack = (await state()).layout.map(({ id }) => id);
      await press(page.getByRole("button", { name: "Dar vieną partiją", exact: true }));
      await phase("break");
      assert.equal((await state()).group, "solids");
      assert.notDeepEqual((await state()).layout.map(({ id }) => id), rack);
      await press(page.getByRole("button", { name: "Baigti partiją", exact: true }));
      await wait(async () => (await state()) === null, "returns to walking");
      await openPhoneMenu(page);
      await press(page.getByRole("button", { name: "Žemėlapis (M)", exact: true }).first());
      await press(page.getByRole("button", { name: "The Corner Pocket", exact: true }));
      assert.equal(await page.locator(".sheet").getByRole("button", { name: "Nuvesk mane", exact: true }).count(), 1);
      assert.equal(await page.locator(".sheet").getByRole("button", { name: "Pradėti dabar", exact: true }).count(), 1);
      assert.equal(await page.locator(".sheet").getByRole("button", { name: "Nuvykti taksi", exact: true }).count(), 1);
      assert.equal(await page.locator(".sheet").getByRole("button", { name: "Pasirinkti užduotimi", exact: true }).count(), 0);
      await screenshot("07-map");
      assert.deepEqual(errors, []);
      console.log(`${label}: chat, break, called shots, listening, scratch, eight, score, rematch and map passed`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
