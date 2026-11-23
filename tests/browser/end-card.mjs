// Run against VITE_EDITION=es, with VITE_LEARNER=lt for the Lithuanian run. END_CARD_LAYER can assert the expected layer.
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs END_CARD_SHOTS=/tmp/end-card node tests/browser/end-card.mjs
import assert from "node:assert/strict";
import { openPhoneMenu } from "./screen-harness.mjs";
import { checkEdition, questBrowser, silenceClips, worldStorage } from "./quests-harness.mjs";
import { mkdirSync } from "node:fs";
import path from "node:path";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const expectedLayer = process.env.END_CARD_LAYER;
const shots = process.env.END_CARD_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

assert(!expectedLayer || ["lt", "en"].includes(expectedLayer), "END_CARD_LAYER must be lt or en");

const cafe = "s72-cafe";
const returning = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0, sounds: 0, scenes: false, cameraFollow: true, phoneCalls: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 100, z: 76, rot: -Math.PI / 2 },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};
const iPhone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" };
const sizes = {
  "390x664": { ...iPhone, viewport: { width: 390, height: 664 } },
  "390x844": { ...iPhone, viewport: { width: 390, height: 844 } },
  "1280x800": { viewport: { width: 1280, height: 800 } },
};
const browser = await questBrowser();
try {
  for (const [label, options] of Object.entries(sizes)) {
    const ctx = await browser.newContext(options);
    const shot = (page, name) => shots && page.screenshot({ path: path.join(shots, `${label}-${name}.png`) });
    await silenceClips(ctx);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(([key, progress]) => {
      localStorage.setItem(key, progress);
      sessionStorage.setItem("ew-play-now", "1");
      window.SpeechRecognition = undefined;
      window.webkitSpeechRecognition = undefined;
    }, [`${worldStorage}-progress-v1`, JSON.stringify(returning)]);
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const { TL, HL } = await checkEdition(page);
    if (expectedLayer) assert.equal(HL, expectedLayer);
    await page.waitForFunction(() => window.__ew?.store.getState().screen === "play" && window.__ew.game?.ledges?.ready, null, { timeout: 240000 });
    const { words: t, answers: cafeAnswers, keepsake, voice } = await page.evaluate(async (id) =>
      (await import("/tests/browser/quest-content.mjs")).endCardContent(id, window.__ew.store.getState().progress.profile.gender), cafe);
    await page.evaluate((id) => {
      const { audio, game, store } = window.__ew;
      const play = audio.play.bind(audio);
      window.endCardReplay = null;
      audio.play = (...args) => {
        const pending = play(...args);
        if (store.getState().conv.phase === "ended") window.endCardReplay = args.slice(0, 3);
        // Use the normal continue-reading action with silent course audio.
        queueMicrotask(audio.continueReading);
        return pending;
      };
      game.startScenario(id);
    }, cafe);
    const press = (target) => options.hasTouch ? target.tap() : target.click();
    const card = page.locator(".ended-box");
    const finishCafe = async () => {
      await page.locator(".convo").waitFor({ timeout: 20000 });
      const intro = page.locator(".scene-intro").getByRole("button", { name: t.start, exact: true });
      if (await intro.isVisible()) await press(intro);

      const input = page.locator(".typebox input");
      for (let turn = 0; turn < 10; turn++) {
        await page.waitForFunction(() => ["you", "ended"].includes(window.__ew.store.getState().conv.phase), null, { timeout: 15000 });
        const step = await page.evaluate(() => {
          const { game, store } = window.__ew;
          const conv = game.activeSession.conv;
          return store.getState().conv.phase === "ended" ? null : (conv.pending?.id ?? conv.effectiveStep()?.id);
        });
        if (step === null) break;
        assert(cafeAnswers[step], `${label}: unexpected café step ${step}`);
        await input.fill(cafeAnswers[step]);
        await press(page.locator(".typebox").getByRole("button", { name: t.send }));
      }

      await card.waitFor();
    };
    await finishCafe();
    assert.equal(await card.locator(".ended-title").innerText(), t.complete);
    assert.equal(await card.locator(".stars .ui-icon").count(), 3);
    assert(await card.locator(".stars .on").count() > 0);
    assert.equal(await card.locator(".ended-keepsake").innerText(), t.got);
    const phrase = card.locator(".ended-phrase");
    assert.equal(await phrase.locator(".ended-phrase-label").innerText(), t.phrase);
    const selected = await page.evaluate(() => window.__ew.store.getState().conv.bestPhrase);
    assert(Object.values(cafeAnswers).includes(selected.en), `${label}: features an answer typed in this run`);
    assert.equal(await phrase.locator(`[lang=${TL}]`).innerText(), selected.en);
    assert(selected.nat.trim());
    assert.equal(await phrase.locator(`[lang=${HL}]`).innerText(), selected.nat);
    const replay = phrase.getByRole("button", { name: t.listen });
    assert.equal(await replay.getAttribute("title"), t.listen);
    await press(replay);
    const played = await page.evaluate(() => window.endCardReplay);
    assert.deepEqual(played, [voice, 1, selected.say]);
    await page.evaluate(() => document.fonts.ready.then(() => null));
    await shot(page, "fit-check");
    const bounds = await card.evaluate((el) => ({
      top: el.getBoundingClientRect().top,
      bottom: el.getBoundingClientRect().bottom,
      last: el.querySelector(".copy-link").getBoundingClientRect().bottom,
      viewport: innerHeight,
      scroll: el.scrollHeight - el.clientHeight,
    }));
    assert(bounds.top > 0 && bounds.bottom <= bounds.viewport && bounds.last <= bounds.bottom && bounds.scroll <= 1,
      `${label}: the whole end card fits under the town view: ${JSON.stringify(bounds)}`);
    await shot(page, "end-card");

    const destination = card.locator(".ended-destination");
    const next = await page.evaluate(async (id) =>
      (await import("/tests/browser/quest-content.mjs")).nextDestination(id), cafe);
    assert.equal(await destination.getAttribute("data-sit"), next.id);
    assert.equal(await destination.locator("b").textContent(), next.title);
    if (label === "1280x800") {
      const lines = await destination.locator("b").evaluate((title) => new Set([...title.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top))).size);
      assert(lines > 0 && lines <= 2, `${label}: destination title fits in two lines (${lines})`);
    }
    const splitWords = await destination.locator("b span").evaluateAll((words) =>
      words.flatMap((word) => {
        const range = document.createRange();
        range.selectNodeContents(word);
        return range.getClientRects().length > 1 ? [word.textContent] : [];
      }));
    assert.deepEqual(splitWords, [], `${label}: destination words stay on one line each`);
    assert.equal(await destination.locator("small").innerText(), next.where);
    const secondary = card.locator(".ended-secondary");
    const smallNext = secondary.getByRole("button", { name: t.next, exact: true });
    assert(await smallNext.isVisible());
    assert(await smallNext.evaluate((button, resume) =>
      button.matches(".btn.small") && button.previousElementSibling?.textContent.trim() === resume, t.resume));
    const rows = await secondary.locator(".btn").evaluateAll((buttons) => {
      const counts = new Map();
      for (const button of buttons) {
        const y = Math.round(button.getBoundingClientRect().top);
        counts.set(y, (counts.get(y) ?? 0) + 1);
      }
      return [...counts.values()];
    });
    assert(rows.length === 1 && rows[0] === 4 || rows.length === 2 && rows.every((n) => n === 2),
      `${label}: the secondary buttons fit on one row or wrap in pairs`);
    await press(destination.getByRole("button", { name: t.guide }));
    await card.waitFor({ state: "hidden" });
    await page.waitForFunction((id) => {
      const { game, store } = window.__ew;
      return store.getState().hud.objective?.sitId === id && game.autoTarget?.kind === "exit" && game.autoPath?.length;
    }, next.id);
    assert.equal(await page.evaluate(() => window.__ew.store.getState().hud.objective.where), next.where);
    assert.equal(await page.evaluate(() => window.__ew.game.keepsakeKind()), keepsake);
    if (shots) {
      await page.evaluate(() => {
        const { game } = window.__ew;
        const { rig, player } = game;
        window.endCardPath = game.autoPath;
        game.autoPath = null;
        game.vel.set(0, 0, 0);
        const hand = player.rightHand.getWorldPosition(player.root.position.clone());
        const pos = hand.clone().add(hand.clone().set(0.55, 0.24, 1.05).applyQuaternion(player.root.quaternion));
        rig.stage = { pos, look: hand, rate: 30 };
        rig.mode = "stage";
        rig.stageSnap();
      });
      await page.waitForFunction(() => window.__ew.game.rig.cam.position.distanceTo(window.__ew.game.rig.stage.pos) < 0.05);
      await shot(page, "keepsake");
      await page.evaluate(() => {
        const { game } = window.__ew;
        game.rig.stage = null;
        game.rig.mode = game.zone.interior ? "interior" : "follow";
        game.autoPath = window.endCardPath;
        delete window.endCardPath;
      });
    }

    await openPhoneMenu(page); // (batch 0: on a phone the town's tools fold behind the menu)
    await press(page.getByRole("button", { name: t.journal }));
    const journal = page.locator(".overlay .sheet").filter({ has: page.getByRole("heading", { name: `${t.tasks} ·` }) });
    const icon = journal.locator(`.sit-card[data-sit="${cafe}"]`).getByRole("img", { name: t.cup });
    await icon.waitFor();
    assert.equal(await icon.locator("title").textContent(), t.cup);
    await press(journal.getByRole("button", { name: t.close, exact: true }));
    if (shots) {
      await page.waitForFunction(() => window.__ew.game.zone.id === "town" && !window.__ew.game.transitioning, null, { timeout: 25000 });
      await page.evaluate(() => window.__ew.game.autoWalkToObjective());
      await page.waitForFunction(() => {
        const { game } = window.__ew, target = game.objectiveTarget(), pos = game.player.root.position;
        return target && Math.hypot(target.x - pos.x, target.z - pos.z) < 9;
      }, null, { timeout: 45000 });
      await shot(page, "destination");
    }
    await page.evaluate((id) => window.__ew.game.startScenario(id), cafe);
    await finishCafe();
    await press(smallNext);
    await page.waitForFunction((id) => {
      const { conv } = window.__ew.store.getState();
      return conv.active && conv.sitId === id && conv.phase !== "ended";
    }, next.id, { timeout: 30000 });
    assert.deepEqual(errors, [], `${label}: no page errors`);
    await ctx.close();
    console.log("ok", HL, label);
  }
} finally {
  await browser.close();
}
