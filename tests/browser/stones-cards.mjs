// Use a local Vite dev server. WORLD_STORAGE selects the town; WORLD_LEARNER selects PC's helper.
// WORLD_SHOTS (or --shots=DIR) records the review frames for both viewports.
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as wall } from "node:timers/promises";
import { tsImport } from "tsx/esm/api";

const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:8310");
assert.ok(["http:", "https:"].includes(base.protocol)
  && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "WORLD_TEST_URL must be local");
const storage = process.env.WORLD_STORAGE || "english-world";
assert.ok(["english-world", "puerto-colibri"].includes(storage), `Unknown WORLD_STORAGE: ${storage}`);
const pc = storage === "puerto-colibri";
const learner = process.env.WORLD_LEARNER || (pc ? "en" : "lt");
assert.ok(pc ? ["en", "lt"].includes(learner) : learner === "lt", `Wrong learner for ${storage}: ${learner}`);
assert.ok(!process.env.VITE_EDITION || process.env.VITE_EDITION === (pc ? "es" : "en"), "VITE_EDITION disagrees with WORLD_STORAGE");
if (pc) {
  assert.ok(!process.env.VITE_LEARNER || process.env.VITE_LEARNER === learner, "VITE_LEARNER disagrees with WORLD_LEARNER");
  process.env.VITE_LEARNER = learner;
}
const target = pc ? "es" : "en";
const edition = pc ? "PC" : "MH";
const town = pc ? "Puerto Colibrí" : "Maple Harbor";
const progressKey = `${storage}-progress-v1`;
const cardsKey = process.env.WORLD_CARDS_KEY || `${storage}-cards-v1`;
const shots = process.argv.find((arg) => arg.startsWith("--shots="))?.slice(8)
  || process.env.WORLD_SHOTS || process.env.WORLD_SHOT_DIR;
const frameMs = 50;
const startupTimeout = 30_000;
const mediaHeaders = { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" };
const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

const { cardKey } = await tsImport("../../src/state/cards.ts", import.meta.url);
const { PHRASE_CARD_UI } = await tsImport("../../src/content/phrase-card-ui.ts", import.meta.url);
const { ROAD_UI } = await tsImport("../../src/content/road.ts", import.meta.url);
const { STREET_WORDS } = await tsImport("../../src/game/street/words.ts", import.meta.url);
const lithuanian = {
  ...PHRASE_CARD_UI, choice: "Kaip žaisime?", drive: ROAD_UI.drive, score: ROAD_UI.finish,
  roadSource: ROAD_UI.title, book: pc ? "Frazių knygelė" : "Kuprinė", cards: pc ? "Mano kortelės" : "Išsaugotos kortelės",
  overheard: STREET_WORDS.overheard,
};
const ui = learner === "lt" ? lithuanian : {
  add: "Add to cards", inCards: "In cards", phrases: "Phrases", choice: "How do you want to play?",
  drive: "Drive", score: "Drive over", roadSource: "Desert road", book: "Phrasebook", cards: "My cards",
  overheard: "Overheard", translation: "EN", ipa: "IPA", close: "Close", replay: "Listen again",
};
const phrasesPath = pc
  ? `../../src/editions/es/content/phrases/phrase-game.pc-${learner}.json`
  : "../../src/content/phrases/phrase-game.mh.json";
const { items } = await json(phrasesPath);
const byClip = new Map(items.map((item) => [item.pClip, item]));
const { STREET_MOMENTS, STREET_CHATTER } = await tsImport(pc
  ? "../../src/editions/es/content/street.ts" : "../../src/content/street.ts", import.meta.url);
const streetTable = pc && learner === "lt" ? (await json("../../src/editions/es-lt/tables/street.json")).text : null;

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const intro = ["s65a-passport", "s65b-baggage", "s66-taxi"];
const calls = ["s76-dentist-call", "s80-support-call", "s89-video-call", "s90-running-late", "s63-party", "p26-complaint"];
const streetSpawn = { x: 28, z: -20, rot: Math.PI };
const roadSpawn = { x: pc ? -88 : -40, z: -13.65, rot: 0 };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, phoneCalls: false, sayLt: true, cameraFollow: true },
  sits: Object.fromEntries([...intro, ...calls].map((id) => [id, finished])),
  phrases: {}, seenIntro: {}, started: 1, objective: "s83-invite-call",
  coach: { done: true, seen: { list: true }, run: true, view: true },
};

function installClock({ progressKey, save }) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!localStorage.getItem(progressKey)) localStorage.setItem(progressKey, JSON.stringify(save));
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  // The media fixtures cover playback. Disable browser synthesis, including OS voices that can use a network service.
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  let now = 1000;
  let next = 0;
  const frames = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (fn) => { frames.set(++next, fn); return next; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__step = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      const ready = [...frames.keys()];
      for (const id of ready) {
        const fn = frames.get(id);
        frames.delete(id);
        fn?.(now);
      }
    }
  };
  let seed = 20261122;
  Math.random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
}

async function withGame(browser, viewport, name, options, test) {
  const phone = viewport.width === 390;
  const label = `${edition}-${learner} ${viewport.width}x${viewport.height} ${name}`;
  const context = await browser.newContext({
    viewport, serviceWorkers: "block", reducedMotion: "reduce",
    ...(phone ? { deviceScaleFactor: 2, hasTouch: true, isMobile: true } : {}),
  });
  let page, frame = 0, phase = "startup";
  const errors = [];
  const mp3s = [];
  const status = () => `${label} ${phase} frame=${frame}`;
  const diagnostics = () => page.evaluate(() => {
    const ew = window.__ew;
    if (!ew) return { title: document.title, lang: document.documentElement.lang, url: location.href };
    const { screen, hud, conv } = ew.store.getState();
    const road = ew.road?.state();
    return { screen, t: ew.game?.t, zone: ew.game?.zoneId, nearest: ew.game?.nearest?.id, prompt: hud.prompt,
      panel: hud.panel, conversation: conv.active && [conv.sitId, conv.phase], glyph: hud.glyph?.id && {
        id: hud.glyph.id, shown: hud.glyph.shown, solved: hud.glyph.solved, wrong: hud.glyph.wrong,
      }, street: ew.game?.streetState?.()?.active, road: road && {
        phase: road.phase, gate: road.totalGates, right: road.rightGates, distance: road.gateDistance, prompt: road.phrasePrompt,
      } };
  }).catch((error) => ({ diagnosticError: error.message }));

  try {
    page = await context.newPage();
    page.setDefaultTimeout(5_000);
    page.on("pageerror", (error) => errors.push(`pageerror at ${status()}: ${error.stack || error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const { url } = message.location();
      // Chromium's resource notice for the one recording deliberately answered with a local 404.
      if (options.missingClip && url.split("?")[0] === new URL(options.missingClip, base).href &&
        message.text() === "Failed to load resource: the server responded with a status of 404 (Not Found)") return;
      errors.push(`console.error at ${status()}: ${message.text()} (${url})`);
    });
    await context.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;
      if (/\.mp3$/i.test(path)) {
        mp3s.push(path);
        const wav = options.wav?.(path);
        if (path === options.missingClip) return route.fulfill({ status: 404, headers: mediaHeaders, body: "" });
        if (wav) return route.fulfill({ contentType: "audio/wav", headers: mediaHeaders, body: wav });
        return route.fulfill({ status: 204, headers: mediaHeaders });
      }
      if (options.manifest && /\/audio-es\/manifest\.json$/.test(path)) return route.fulfill({ json: options.manifest });
      if (url.origin === base.origin && request.method() === "GET" && !/\/(?:api|rest\/v1)\//.test(path)) return route.continue();
      return route.fulfill({ status: 204, headers: mediaHeaders });
    });
    await page.addInitScript(installClock, { progressKey, save: {
      ...progress, ...options.save, settings: { ...progress.settings, ...options.save?.settings },
      place: { zone: "town", ...(options.spawn ?? streetSpawn) },
    } });

    const step = async (count = 1, ms = frameMs) => {
      await page.evaluate(([count, ms]) => window.__step(count, ms), [count, ms]);
      if (ms) frame += count;
      await wall(10);
    };
    const wait = async (predicate, description, { frames = 2, timeout = 12_000 } = {}) => {
      const until = performance.now() + timeout;
      do {
        assert.deepEqual(errors, [], "browser errors");
        const result = await predicate();
        if (result) return result;
        if (frames) await step(frames);
        else await wall(20);
      } while (performance.now() < until);
      assert.fail(description);
    };
    const visible = (locator, description, config) => wait(() => locator.isVisible(), description, config);
    // Playwright needs layout frames to check actionability. These frames leave both the game clock
    // and performance.now unchanged so a tap never crosses into the next street exchange.
    async function layout(action) {
      let done = false;
      const frames = (async () => {
        while (!done) {
          await step(2, 0);
          await wall(15);
        }
      })();
      try { return await action(); }
      finally { done = true; await frames; }
    }
    const press = (locator) => layout(() => phone ? locator.tap() : locator.click());
    const point = (x, y) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    const enter = async (reload = false) => {
      const navigation = { waitUntil: "domcontentloaded", timeout: startupTimeout };
      await (reload ? page.reload(navigation) : page.goto(base.href, navigation));
      assert.ok((await page.title()).includes(town), `expected ${town}, got ${await page.title()}`);
      assert.equal(await page.locator("html").getAttribute("lang"), learner, "the dev server must build the requested helper layer");
      await wait(() => page.evaluate(() => window.__ew?.store?.getState().screen === "play"), "game starts", { timeout: startupTimeout });
      await page.evaluate(() => {
        window.__ew.coach?.finish?.();
        window.__ew.store.getState().setHud({ panel: null });
      });
      await step(4);
    };
    const mark = async (name) => {
      phase = name;
      console.log(status());
      if (shots) {
        const path = join(shots, `stones-cards-${label.replaceAll(" ", "-")}-${name}.png`);
        await layout(() => page.screenshot({ path, timeout: 5_000 }));
        console.log(`shot=${path}`);
      }
    };
    const readCards = () => page.evaluate((key) =>
      JSON.parse(localStorage.getItem(key) || "{}").cards || [], cardsKey);
    await enter();
    await test({ page, phone, step, wait, visible, layout, press, point, enter, mark, readCards, mp3s });
    await wall(50);
    assert.deepEqual(errors, [], "browser errors");
    console.log(`PASS ${status()}`);
  } catch (error) {
    throw new Error(`${status()}: ${error.message}\nstate: ${JSON.stringify(await diagnostics())}\nerrors: ${JSON.stringify(errors)}`, { cause: error });
  } finally {
    await context.close();
  }
}

async function hitBox(button, minimum = 1) {
  const box = await button.evaluate((node) => {
    const { x, y, width, height, right, bottom } = node.getBoundingClientRect();
    return { x, y, width, height, inside: x >= 0 && y >= 0 && right <= innerWidth && bottom <= innerHeight,
      hits: node.contains(document.elementFromPoint(x + width / 2, y + height / 2)) && !node.disabled };
  });
  assert.ok(box.inside && box.hits && box.width >= minimum && box.height >= minimum,
    `control fits and receives a centre press: ${JSON.stringify(box)}`);
  return [box.x, box.y, box.width, box.height];
}

async function noOverflow(panel) {
  const overflow = await panel.evaluate((node) => Math.max(
    node.scrollWidth - node.clientWidth, document.documentElement.scrollWidth - innerWidth));
  assert.ok(overflow <= 1, `horizontal overflow: ${overflow}px`);
}

const cardMatches = async (run, text) => (await run.readCards()).filter((card) => cardKey(card.en) === cardKey(text));
async function savedCard(run, expected, previous) {
  const found = await cardMatches(run, expected.en);
  assert.equal(found.length, 1, `exactly one stored card for ${expected.en}`);
  const [card] = found;
  assert.deepEqual([card.en, card.lt, card.sentence.en, card.sentence.lt],
    [expected.en, expected.lt, expected.en, expected.lt]);
  if ("situationId" in expected) {
    assert.deepEqual([card.situationId, card.sourceLabel], [expected.situationId, expected.sourceLabel]);
  }
  assert.ok(card.lt.trim() && card.id && Number.isFinite(card.createdAt) && Number.isFinite(card.due));
  assert.equal(card.box, 1);
  assert.equal(card.due, new Date(card.createdAt).setHours(0, 0, 0, 0));
  if (previous) assert.deepEqual(card, previous, "the saved action, award or reload preserves identity, schedule and source");
  return card;
}

async function namedSave(run, button, saved) {
  const name = saved ? ui.inCards : ui.add;
  await run.visible(button, `visible save action ${name}`, { frames: 0 });
  assert.equal(await button.getAttribute("title"), name);
  assert.equal(await button.getAttribute("aria-label"), name);
  assert.equal(await button.getAttribute("data-phrase-save"), "");
  assert.equal(await button.isEnabled(), true);
}

async function saveTwice(run, button, expected, { already, inspect, keyboard = false } = {}) {
  if (!already) assert.deepEqual(await cardMatches(run, expected.en), [], "the UI has not earned or saved this line yet");
  await namedSave(run, button, !!already);
  await run.layout(() => button.scrollIntoViewIfNeeded());
  const fixedWidth = run.phone || await button.getAttribute("data-icon-only") !== null;
  const box = await hitBox(button, 44);
  const checkBox = async () => {
    const current = await hitBox(button, 44);
    if (fixedWidth) assert.deepEqual(current, box, "checked icon keeps the same hit box");
  };
  await inspect?.("before-save");
  await run.press(button);
  await namedSave(run, button, true);
  const saved = await savedCard(run, expected, already);
  await checkBox();
  await inspect?.("first-save");
  if (keyboard && !run.phone) {
    assert.equal(await button.evaluate((node) => document.activeElement === node), true);
    await run.page.keyboard.press("Enter");
  } else await run.press(button);
  await namedSave(run, button, true);
  await savedCard(run, expected, saved);
  await checkBox();
  await inspect?.("second-save");
  return saved;
}

async function checkBook(run, pairs) {
  await run.enter(true);
  const toolbar = run.page.locator(".toolbar");
  await run.visible(toolbar, "town toolbar returns on reload");
  if (await toolbar.evaluate((node) => node.classList.contains("folds"))) {
    await run.press(toolbar.locator('.ride-menu[aria-expanded="false"]'));
  }
  await run.press(toolbar.locator(`button[title="${ui.book}"]`));
  const tabs = run.page.locator(".pb-tabs");
  const cards = tabs.getByRole("tab").filter({ hasText: ui.cards });
  await run.press(cards);
  assert.equal(await cards.getAttribute("aria-selected"), "true");
  const list = run.page.locator(".cd-list");
  await run.visible(list, "saved-card list opens", { frames: 0 });
  for (const [expected, original] of pairs) {
    const row = list.locator(".cd-row").filter({ has: run.page.locator(".cd-en")
      .and(run.page.getByText(expected.en, { exact: true })) });
    assert.equal(await row.count(), 1, `one list row for ${expected.en}`);
    const en = row.locator(".cd-en"), lt = row.locator(".cd-lt");
    assert.ok(await en.isVisible() && await lt.isVisible(), "both languages display in the saved row");
    assert.equal(await en.textContent(), expected.en);
    assert.equal(await lt.textContent(), expected.lt);
    assert.equal(await en.getAttribute("lang"), target);
    assert.equal(await lt.getAttribute("lang"), learner);
    await savedCard(run, expected, original);
  }
  await noOverflow(list);
  await run.mark("post-reload-cards");
}

async function checkLongScoreReview(run, score, select, alternative) {
  const reader = score.locator(":scope > .phrase-review-row .phrase-review-value");
  await run.visible(reader, "the score shows the selected phrase in full", { frames: 0 });
  assert.equal(await reader.getAttribute("aria-hidden"), "true", "the native select announces the value");

  const checkFit = async () => {
    const phrase = await select.locator("option:checked").textContent();
    assert.equal(await reader.textContent(), phrase);
    await run.layout(() => reader.scrollIntoViewIfNeeded());
    const fit = await reader.evaluate((node) => {
      const box = node.getBoundingClientRect();
      const card = node.closest(".mode-score-card").getBoundingClientRect();
      const style = getComputedStyle(node);
      const range = document.createRange();
      range.selectNodeContents(node);
      const lines = [...range.getClientRects()];
      const textLeft = box.left + parseFloat(style.borderLeftWidth) + parseFloat(style.paddingLeft);
      const textRight = box.right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight);
      const inside = (item, outer) => item.left >= outer.left - 1 && item.right <= outer.right + 1
        && item.top >= outer.top - 1 && item.bottom <= outer.bottom + 1;
      return {
        visible: style.visibility === "visible" && Number(style.opacity) > 0 && inside(box, card)
          && inside(box, { left: 0, right: innerWidth, top: 0, bottom: innerHeight }),
        textFits: lines.length > 0 && lines.every((line) => line.width > 0
          && inside(line, { left: textLeft, right: textRight, top: box.top, bottom: box.bottom })),
      };
    });
    assert.deepEqual(fit, { visible: true, textFits: true }, `complete selected phrase fits: ${phrase}`);
    await hitBox(select, 44);
    await noOverflow(score);
  };

  await checkFit();
  await select.selectOption({ label: alternative });
  assert.equal(await select.inputValue(), cardKey(alternative));
  assert.equal(await select.locator("option:checked").textContent(), alternative);
  await checkFit();
  await score.evaluate((card) => { card.style.fontSize = "200%"; });
  try {
    await checkFit();
    const actions = await score.locator(".mode-score-actions button").all();
    assert.equal(actions.length, 2);
    for (const action of actions) {
      await run.layout(() => action.scrollIntoViewIfNeeded());
      await hitBox(action, 44);
    }
  } finally {
    await score.evaluate((card) => card.style.removeProperty("font-size"));
  }
}

async function checkScore(run, correct) {
  const { page, phone, step, wait, press } = run;
  const read = () => page.evaluate(() => window.__ew.road.state());
  const state = (predicate, description, frames = 2) => wait(async () => {
    const value = await read();
    return value && predicate(value) && value;
  }, description, { frames });

  await press(page.locator(".prompt").getByText(ui.drive, { exact: true }));
  await wait(() => page.evaluate(() => {
    const { rides } = window.__ew.game;
    return rides.phase === "on" && !!rides.riding;
  }), "boards the parked van");
  if (pc) {
    // The PC road fixture crosses the physical Calle Ceiba exit from the town side.
    await page.evaluate(() => {
      const { rides } = window.__ew.game;
      rides.resetPosition(rides.riding, { x: -1.65, z: 53, rot: 0 });
    });
    for (let i = 0; i < 6; i++) await step(4);
    await state((s) => s.ready, "road geometry is ready");
  }
  if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
  else await page.keyboard.down("ArrowUp");
  try { await state((s) => s.phase === "briefing", "real road entry shows the game choice", 4); }
  finally {
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    else await page.keyboard.up("ArrowUp");
  }

  const overlay = page.locator(".road-overlay");
  const choice = overlay.getByRole("dialog", { name: ui.choice, exact: true });
  const phrases = choice.locator('[data-way="phrases"]');
  await run.visible(phrases, "phrase option in the localized road choice", { frames: 0 });
  assert.equal(await phrases.locator("strong").textContent(), ui.phrases);
  await press(phrases);
  const gate = await state((s) => s.phase === "drive" && s.totalGates === 0 && s.gates?.length === 3, "first phrase gate");
  const item = byClip.get(gate.phrasePrompt?.pClip);
  assert.ok(item, `cue clip belongs to ${edition}-${learner}`);
  assert.deepEqual([gate.gates[gate.right], gate.phrasePrompt.p], [item.f, item.p]);
  assert.equal(await overlay.locator(".road-question strong").textContent(), item.p);
  assert.equal(await overlay.locator(".road-gates[lang]").first().getAttribute("lang"), target);
  const expected = { en: item.f, lt: item.p, situationId: "", sourceLabel: ui.roadSource };
  assert.deepEqual(await cardMatches(run, expected.en), []);
  await run.mark("F0-cue");
  assert.equal(await page.evaluate((right) => window.__ew.road.forceGate(right), correct), true);
  const answered = await state((s) => s.totalGates === 1, "crosses the first gate", 1);
  assert.equal(answered.rightGates, Number(correct));
  await page.evaluate(() => window.__ew.road.jumpTimer());
  if (!correct) {
    const feedback = overlay.locator(".road-feedback.wrong");
    await run.visible(feedback, "the wrong gate exposes feedback", { frames: 0 });
    assert.ok((await feedback.innerText()).includes(expected.en));
    await run.mark("wrong-gate");
  }
  const done = await state((s) => s.phase === "result", "road score opens");
  assert.deepEqual([done.result.total, done.result.right], [1, Number(correct)]);
  const score = overlay.getByRole("dialog", { name: ui.score, exact: true });
  const selected = score.locator(":scope > .phrase-review-row").getByRole("combobox");
  await run.visible(selected, "score review shows a real phrase selector", { frames: 0 });
  await selected.selectOption({ label: expected.en });
  const row = score.locator(correct ? ".road-practice article" : ".road-missed:not(.road-practice) article");
  assert.equal(await row.locator(".road-pair strong").textContent(), expected.en);
  assert.ok((await row.locator(".road-pair").textContent()).includes(expected.lt));
  const snapshot = () => Promise.all([
    score.locator("dl").innerText(), selected.inputValue(), selected.locator("option:checked").textContent(),
    row.locator(".road-pair").innerText(), read().then(({ phase, result }) => ({ phase, result })),
  ]);
  const before = await snapshot();
  assert.equal(before[2], expected.en);
  const already = correct ? await savedCard(run, expected) : undefined;
  const saved = await saveTwice(run, row.locator("[data-phrase-save]"), expected, {
    already, keyboard: true, inspect: async (phase) => {
      assert.deepEqual(await snapshot(), before, "score, selected item, missed/practice row and phase stay put");
      await noOverflow(score);
      await run.mark(phase);
    },
  });
  if (correct) {
    const alternative = gate.gates.filter((phrase) => phrase !== expected.en).sort((a, b) => b.length - a.length)[0];
    assert.ok(alternative, "the score has a board alternative with no practiced row");
    await checkLongScoreReview(run, score, selected, alternative);
  }
  await checkBook(run, [[expected, saved]]);
}

function streetText(text, speaker) {
  const helper = streetTable ? streetTable[text] : text;
  assert.ok(helper, `street fixture has helper for ${text}`);
  return helper.replace(/\{(m|nm):([^{}|]*)\|(?:f|nf):([^{}|]*)\}/g,
    (_match, who, male, female) => (who === "m" ? progress.profile.gender : speaker) === "m" ? male : female);
}

const byCast = (value, cast) => value?.byCast?.[cast] ?? value;
const streetPair = (line, gender, sourceLabel) => ({
  en: line.en, lt: streetText(line.lt, gender), situationId: "street", sourceLabel,
});
const lineTarget = (node) => node.locator(".kit-gloss-compact > span");

async function checkStreet(run) {
  const { page, wait, press } = run;
  const script = STREET_MOMENTS.find(({ id }) => id === "i_dropped");
  const cast = script.cast.find(({ id }) => id === "a");
  const first = script.first;
  const role = streetText(cast.role, cast.gender);
  const rewardLine = streetPair(byCast(first.card, cast.id), cast.gender, role);
  const finalChoice = first.then.choices[0];
  const replies = byCast(finalChoice.reply ?? first.then.reply, cast.id);
  assert.equal(replies.length, 1, "wallet fixture has one closing spoken reply");
  const replyLine = streetPair(replies[0], cast.gender, role);
  assert.notEqual(cardKey(rewardLine.en), cardKey(replyLine.en));
  const card = page.locator('section.street-card[data-moment="i_dropped"][data-cast="a"][data-script="first"]');
  const state = () => page.evaluate(() => window.__ew.game.streetState());
  const line = card.locator(".street-line");
  const reward = card.locator("[data-street-reward]");
  assert.equal(await page.evaluate(() => window.__ew.game.streetNow("i_dropped", "a")), true);
  for (const [index, exchange] of [first, first.then].entries()) {
    const choices = page.locator(`.street-card[data-step="choices"][data-exchange="${index}"] .street-choice`);
    await wait(() => choices.first().isVisible(), `wallet choice ${index + 1}`, { frames: 1 });
    assert.equal(await card.locator(".street-head strong").innerText(), role);
    const picked = byCast(exchange.choices[0].say, cast.id);
    assert.equal(await lineTarget(choices.first()).textContent(), picked.en);
    assert.equal(await lineTarget(choices.first()).getAttribute("lang"), target);
    assert.equal(await choices.first().locator("small").textContent(), streetText(picked.lt, cast.gender));
    await press(choices.first());
  }
  await wait(async () => (await state()).active?.step === "reply"
    && await card.getAttribute("data-exchange") === "1" && await line.isVisible()
    && await lineTarget(line).textContent() === replyLine.en, "enters the wallet closing reply", { frames: 1 });
  assert.equal(await line.getAttribute("aria-expanded"), "false");
  assert.equal(await lineTarget(reward).textContent(), rewardLine.en);
  assert.equal(await reward.locator("small").textContent(), rewardLine.lt);
  const atReply = await state();
  await run.mark("closing-reply");
  const rewardCard = await saveTwice(run, reward.locator("[data-phrase-save]"), rewardLine, {
    inspect: async (phase) => {
      assert.deepEqual(await state(), atReply, "saving the reward leaves the same exchange and position");
      assert.equal(await line.getAttribute("aria-expanded"), "false");
      await run.mark(`reward-${phase}`);
    },
  });

  await page.evaluate(() => {
    const { game } = window.__ew;
    const actor = game.streetLife.active.actor.person.root;
    window.__cardDeparture = { actor, start: actor.position.clone(), player: game.player.root.position.clone() };
  });
  await wait(() => card.getAttribute("data-step").then((step) => step === "done"), "wallet reaches its end card", { frames: 1 });
  assert.equal(await lineTarget(line).textContent(), replyLine.en);
  assert.deepEqual(await cardMatches(run, replyLine.en), [], "the final spoken reply still has its own unsaved key");
  await savedCard(run, rewardLine, rewardCard);
  await press(line);
  assert.equal(await line.locator(".street-tr").textContent(), replyLine.lt);
  assert.equal(await line.locator(".street-tr").getAttribute("lang"), learner);
  const atDone = await state();
  assert.equal(atDone.memory.i_dropped.helped, 1);
  assert.equal(atDone.memory.i_dropped.seen, 1);
  await run.mark("done");
  const replyCard = await saveTwice(run, card.locator(".street-current [data-phrase-save]"), replyLine, {
    inspect: async (phase) => {
      assert.deepEqual(await state(), atDone, "saving the spoken line leaves the end card and help count");
      assert.equal(await line.getAttribute("aria-expanded"), "true");
      await run.mark(`reply-${phase}`);
    },
  });
  await wait(async () => !(await state()).active && !(await card.count()), "wallet actor departs and end card closes");
  await wait(() => page.evaluate(() => {
    const { actor, start, player } = window.__cardDeparture;
    return !actor.parent || actor.position.distanceTo(player) > start.distanceTo(player);
  }), "actor walks away from the player");
  await savedCard(run, rewardLine, rewardCard);
  await savedCard(run, replyLine, replyCard);
  await run.mark("departed");
  await checkBook(run, [[rewardLine, rewardCard], [replyLine, replyCard]]);
}

async function checkChatter(run) {
  const { page, press } = run;
  const snippet = STREET_CHATTER.find(({ id }) => id === (pc ? "c_calor" : "c_lights"));
  const pair = streetPair(snippet.lines[0], "m", ui.overheard);
  assert.equal(await page.evaluate((id) => window.__ew.game.streetChatterNow(id), snippet.id), true);
  const card = page.locator(".street-light-chatter");
  const line = card.locator(".street-line").first();
  await run.visible(line, "light chatter shows a real snippet");
  const save = card.locator(".phrase-save-row").first().locator("[data-phrase-save]");
  const snapshot = () => card.locator(".street-line").evaluateAll((lines) => lines.map((line) => ({
    expanded: line.getAttribute("aria-expanded"), text: line.textContent,
  })));
  assert.equal(await lineTarget(line).textContent(), pair.en);
  assert.equal(await line.getAttribute("aria-expanded"), "false");
  const original = await snapshot();
  assert.equal(original.length, 2, "both lines of the real snippet are present");
  const cardId = await saveTwice(run, save, pair, {
    inspect: async () => assert.deepEqual(await snapshot(), original, "save leaves both chatter lines and translation state"),
  });
  await press(line);
  assert.equal(await line.locator(".street-tr").textContent(), pair.lt);
  const translated = await snapshot();
  assert.equal(translated[0].expanded, "true");
  assert.equal(translated[1].expanded, "false");
  await press(save);
  assert.deepEqual(await snapshot(), translated, "a checked save leaves the translated snippet in place");
  await savedCard(run, pair, cardId);
  await run.mark("translated-chatter");
}

// Only the PC branch reads the cave fixtures or exercises the adapter.
async function checkPc(browser, viewport) {
  const authored = { en: "El agua guarda la memoria.", lt: "The water keeps the memory.", situationId: "x04-yaxche" };
  const units = ["El", "agua", "guarda", "la", "memoria."];
  if (learner === "lt") {
    const { sent } = await json("../../src/editions/es-lt/tables/x04-yaxche.json");
    const key = `${units.join(" | ")}␟The | water | keeps | the | memory.␟${authored.lt}`;
    authored.lt = sent[key].nat;
    assert.equal(authored.lt, "Vanduo saugo atmintį.");
  }
  const { audioKey } = await tsImport("../../src/audio-key.ts", import.meta.url);
  const clip = (text) => audioKey("es_coach_f", 1, text);
  const recording = clip(authored.en);
  const pcMediaDir = new URL("audio-es/", base).pathname;
  const caveSave = { cave: { passed: ["kin"], lit: [], heard: [], seen: true },
    settings: { lt: true, ltNatural: true, ipa: false } };
  const starters = ["¡Buenos días!", "¡Buenas!", "Sí, por favor."];
  const completionTitle = learner === "lt" ? "Akmuo užsidegė!" : "The stone is lit!";

  // cave.mjs's silent PCM fixture, long enough to observe playback and a mid-phrase close.
  const silence = Buffer.alloc(44 + 9_600 * 2);
  silence.write("RIFF", 0);
  silence.writeUInt32LE(silence.length - 8, 4);
  silence.write("WAVEfmt ", 8);
  silence.writeUInt32LE(16, 16);
  silence.writeUInt16LE(1, 20);
  silence.writeUInt16LE(1, 22);
  silence.writeUInt32LE(8_000, 24);
  silence.writeUInt32LE(16_000, 28);
  silence.writeUInt16LE(2, 32);
  silence.writeUInt16LE(16, 34);
  silence.write("data", 36);
  silence.writeUInt32LE(silence.length - 44, 40);

  const authoredManifest = Object.fromEntries(
    [authored.en, "La luz entra por el ojo del cenote.", "La ceiba une el cielo y la tierra."].map((text) => [clip(text), 1.2]));
  const scenarios = [
    { name: "glyph", mode: "authored", manifest: authoredManifest },
    { name: "glyph-missing", mode: "missing", manifest: authoredManifest, missingClip: `${pcMediaDir}${recording}.mp3` },
    { name: "glyph-pair", mode: "pair", manifest: Object.fromEntries(starters.map((text) => [clip(text), 1.2])) },
    { name: "glyph-no-recordings", mode: "empty", manifest: {} },
  ];
  for (const { name, mode, manifest, missingClip } of scenarios) {
    await withGame(browser, viewport, name, {
      save: caveSave, manifest, missingClip,
      wav: (path) => path.startsWith(pcMediaDir) && silence,
    }, async (run) => {
      const { page, phone, step, wait, press, point, mark } = run;
      const card = page.locator(".glyph-card");
      const reading = card.locator(".glyph-text");
      const options = card.locator(".glyph-opt");
      const replay = card.locator(".glyph-play");
      const close = card.locator(".glyph-x");
      const save = card.locator("[data-phrase-save]");
      const translation = card.getByRole("button", { name: ui.translation, exact: true });
      const ipa = card.getByRole("button", { name: ui.ipa, exact: true });
      const readGlyph = () => page.evaluate(() => window.__ew.store.getState().hud.glyph);
      const readTime = () => page.evaluate(() => window.__ew.game.t);
      const settings = () => page.evaluate(() => {
        const { ipa, lt } = window.__ew.store.getState().settings;
        return { ipa, lt };
      });
      const place = (x, z, rot) => page.evaluate(({ x, z, rot }) => {
        const game = window.__ew.game;
        game.keys.clear();
        game.setJoystick(0, 0);
        game.enterZone("gruta", { x, z, rot }, true);
        game.rig.yaw = rot;
        game.rig.snap();
      }, { x, z, rot });
      const interact = () => phone ? press(page.locator(".act-btn")) : page.keyboard.press("e");
      async function kinIpa(before, toggle) {
        await place(0.3, -2.5, Math.PI);
        await wait(() => page.evaluate(() => window.__ew.game.zoneId === "gruta"
          && window.__ew.store.getState().hud.prompt?.kind === "talk"), "real talk prompt near Kin");
        await interact();
        await wait(() => page.evaluate(() => window.__ew.store.getState().conv.sitId === "x02-alux-kin"
          && window.__ew.store.getState().conv.active), "Kin conversation opens");
        const convo = page.locator(".convo");
        if (await page.evaluate(() => window.__ew.store.getState().conv.introOpen)) {
          await press(page.locator(".scene-intro .btn"));
        }
        const toggleIpa = convo.locator(".convo-head").getByRole("button", { name: "IPA", exact: true });
        assert.equal(await toggleIpa.getAttribute("aria-pressed"), String(before));
        if (toggle) {
          await press(toggleIpa);
          assert.equal(await toggleIpa.getAttribute("aria-pressed"), String(!before));
          assert.equal((await settings()).ipa, !before);
        }
        const name = learner === "lt" ? "Baigti pokalbį" : "End conversation";
        await press(convo.getByRole("button", { name, exact: true }));
        await wait(() => page.evaluate(() => !window.__ew.store.getState().conv.active), "exits the real conversation");
      }
      if (mode === "authored") await kinIpa(false, true);
      await page.evaluate((title) => {
        const { store, audio } = window.__ew;
        const calls = [];
        const completions = new Set();
        const play = audio.play;
        audio.play = function (voice, speed, text, options) {
          const glyph = store.getState().hud.glyph;
          if (glyph?.text !== text) return play.call(this, voice, speed, text, options);
          const call = { voice, speed, text, started: Date.now(), ended: null, result: null };
          calls.push(call);
          return play.call(this, voice, speed, text, options).then((result) => {
            Object.assign(call, { ended: Date.now(), result });
            return result;
          });
        };
        store.subscribe(({ toasts, townToasts }) => {
          for (const toast of [...toasts, ...townToasts.map(({ toast }) => toast)]) {
            if (toast.title === title) completions.add(toast.id);
          }
        });
        window.__cardStone = { calls, completions };
      }, completionTitle);
      const calls = () => page.evaluate(() => window.__cardStone.calls);
      const completions = () => page.evaluate(() => window.__cardStone.completions.size);

      await place(-6.4, -24.5, -Math.PI / 2);
      await wait(() => page.evaluate(() => {
        const { store, game, audio } = window.__ew;
        const { cave, prompt } = store.getState().hud;
        return game.zoneId === "gruta" && audio.ready && game.cave?.pool?.has("agua_01")
          && cave?.n === 1 && cave.open === 1
          && cave.lit === 0 && prompt?.kind === "listen" && game.nearest?.id === "agua-1";
      }), "agua-1 offers its actual listen prompt with Kin passed and zero lit stones");
      await interact();
      const glyph = await wait(readGlyph, "the real glyph opens", { frames: 0 });
      await run.visible(card, "glyph dialog is visible", { frames: 0 });
      assert.equal(glyph.id, "agua-1");
      assert.equal(await reading.count(), 0, "target words start hidden");
      assert.equal(await save.count(), 0, "no save action for a hidden line");
      assert.deepEqual([glyph.shown, glyph.solved, glyph.wrong], [false, false, []]);
      assert.equal(await ipa.getAttribute("aria-pressed"), String(mode === "authored"));
      assert.equal(await translation.getAttribute("aria-pressed"), "true");
      assert.equal(await options.count(), glyph.options.length);
      assert.equal(await options.nth(glyph.answer).locator("span").textContent(), glyph.lt);
      assert.equal(await options.nth(glyph.answer).getAttribute("lang"), learner);
      for (const control of [replay, close, translation, ipa]) await hitBox(control, 44);
      for (const option of await options.all()) await hitBox(option);
      await mark("F0-hidden");

      // Read the active edition's starter fixtures when the manifest drives the plain-pair branch.
      const fallbackPairs = async () => page.evaluate(async ([globalPath, composePath]) => {
        const { GLOBAL } = await import(globalPath);
        const { compose } = await import(composePath);
        const groups = ["g_greet", "g_social", "g_yesno", "g_howareyou", "g_clarify"];
        return groups.flatMap((id) => (GLOBAL.hints[id]?.items ?? []).flatMap(({ s }) => {
          try {
            const line = compose(s, { name: "Test" }, { look: () => undefined, formal: false });
            return [{ en: line.en, lt: line.nat }];
          } catch { return []; } // some starters need more than a name, as in CaveQuest.starters()
        }));
      }, [new URL("src/content/global.ts", base).href, new URL("src/convo/compose.ts", base).href]);
      let expected = authored;
      if (mode === "pair" || (mode === "empty" && !glyph.s)) {
        const pairs = await fallbackPairs();
        expected = mode === "pair" ? pairs.find(({ en }) => en === starters[0]) : pairs.find(({ en }) => en === glyph.text);
        assert.ok(expected, "plain pair is resolved from the active learner's starting lines");
        assert.equal(glyph.s, undefined, "this fixture exercises the former 1700ms plain-pair path");
      }
      assert.deepEqual([glyph.text, glyph.lt], [expected.en, expected.lt]);
      if (glyph.s) assert.deepEqual(glyph.s.units.map(({ en }) => en), units);
      if (mode === "authored" || mode === "missing") {
        assert.ok(glyph.s, "recorded stone uses the authored, aligned sentence");
        assert.equal(glyph.options.length, 3);
      }

      const targetText = async () => {
        const words = reading.locator(".u > .en");
        return await words.count() ? (await words.allTextContents()).join(" ") : (await reading.locator(".il").innerText()).trim();
      };
      const helper = reading.getByText(expected.lt, { exact: true });
      const assertText = async (solved) => {
        assert.equal(await targetText(), expected.en);
        assert.equal(await reading.locator(`.il[lang="${target}"]`).count(), 1);
        const helperVisible = solved && (await settings()).lt;
        assert.equal(await helper.isVisible(), helperVisible);
        if (helperVisible) assert.equal(await helper.getAttribute("lang"), learner);
        await noOverflow(card);
      };
      async function checkIpa(on) {
        assert.equal(await ipa.getAttribute("aria-pressed"), String(on));
        assert.equal((await settings()).ipa, on);
        if (!on) {
          assert.equal(await reading.locator(".ipa:visible").count(), 0);
          return;
        }
        const words = glyph.s?.units.map(({ en }) => en) ?? expected.en.split(/\s+/);
        const sounds = await page.evaluate(async ([path, words, say]) =>
          (await import(path)).ipaForSentence(words, say),
        [new URL("src/convo/ipa.ts", base).href, words, glyph.s?.say ?? expected.en]);
        const units = await reading.locator(".il .u").evaluateAll((nodes) => nodes.map((unit) => {
          const word = unit.querySelector(".en"), ipa = unit.querySelector(".ipa");
          if (!word || !ipa) return null;
          const a = word.getBoundingClientRect(), b = ipa.getBoundingClientRect();
          const frame = unit.closest(".glyph-card").getBoundingClientRect();
          const style = getComputedStyle(ipa);
          return { word: word.textContent, ipa: ipa.textContent.trim(), visible: b.width > 0 && b.height > 0
            && style.display !== "none" && style.visibility === "visible"
            && b.top >= a.bottom - 1 && b.left < a.right && a.left < b.right
            && b.left >= frame.left && b.right <= frame.right && b.bottom <= frame.bottom };
        }));
        assert.deepEqual(units, words.map((word, i) => ({ word, ipa: sounds[i], visible: true })));
        assert.ok(sounds.every((sound) => sound.trim()), "every target word has a nonempty IPA baseline");
      }

      if (mode === "authored") {
        const reveal = card.locator(".glyph-show");
        await hitBox(reveal, 1);
        await press(reveal);
        await assertText(false);
        await checkIpa(true);
        await mark("first-reveal");
        const wrong = (glyph.answer + 1) % glyph.options.length;
        const beforeWrongReplay = (await calls()).length;
        await press(options.nth(wrong));
        assert.deepEqual(await readGlyph().then((g) => [g.shown, g.solved, g.wrong]), [true, false, [wrong]]);
        assert.equal(await options.nth(wrong).isDisabled(), true);
        assert.ok((await options.nth(wrong).getAttribute("class")).split(" ").includes("wrong"));
        await assertText(false);
        await mark("wrong-feedback");
        await wait(async () => (await calls()).length > beforeWrongReplay, "wrong answer replays its cue", { frames: 0, timeout: 2_500 });
        assert.equal((await calls()).length, beforeWrongReplay + 1, "wrong answer replays the same cue after 500ms");
        assert.equal((await calls()).at(-1).text, expected.en);
        if (!phone) {
          await page.keyboard.press("i");
          assert.equal(await settings().then(({ lt }) => lt), true, "I leaves translation alone");
        } else await press(ipa);
        await checkIpa(false);
        if (!phone) await page.keyboard.press("l"); else await press(translation);
        assert.equal(await translation.getAttribute("aria-pressed"), "false");
        assert.deepEqual(await settings(), { ipa: false, lt: false });
        if (!phone) await page.keyboard.press("l"); else await press(translation);
        assert.equal(await translation.getAttribute("aria-pressed"), "true");
        await checkIpa(false);
        await mark("reveal-controls");
        if (!phone) await page.keyboard.press("i"); else await press(ipa);
        await checkIpa(true);
      }

      const startGame = await readTime();
      await press(options.nth(glyph.answer));
      const startWall = performance.now();
      const solved = card.locator(".glyph-text");
      await run.visible(solved, "solved text stays visible", { frames: 0 });
      assert.equal((await readGlyph()).solved, true);
      assert.equal(await options.count(), 0);
      const solvedNode = await card.elementHandle();
      const solvedText = await reading.elementHandle();
      const checkSolved = async () => {
        assert.deepEqual(await readGlyph().then((g) => g && [g.id, g.solved, g.shown, g.text, g.lt]),
          [glyph.id, true, true, expected.en, expected.lt]);
        assert.equal(await solvedNode.evaluate((node) => node === document.querySelector(".glyph-card.solved")), true);
        assert.equal(await solvedText.evaluate((node) => node === document.querySelector(".glyph-card.solved .glyph-text")), true);
        if (glyph.s) assert.equal(await card.locator(".glyph-line").count(), 1);
        await assertText(true);
        const fits = await card.evaluate((node) => {
          const { left, right, top, bottom } = node.getBoundingClientRect();
          return left >= 15 && top >= 15 && right <= innerWidth - 15 && bottom <= innerHeight - 15;
        });
        assert.ok(fits, "stone card clears the viewport edges");
        assert.equal(await completions(), 0, "quest completion is pending while the stone is open");
        return Promise.all([replay, close, save, translation, ipa].map((button) => hitBox(button, 44)));
      };

      const progressState = () => page.evaluate(() => {
        const { game, store } = window.__ew;
        const { progress, hud, conv } = store.getState();
        const p = game.player.root.position;
        return { position: p.toArray(), cave: progress.cave, phrases: progress.phrases,
          panel: hud.panel, talking: conv.active, zone: game.zoneId };
      });
      const lit = await progressState();
      const learned = "x04-yaxche:agua_01";
      assert.deepEqual(lit.cave.lit, ["agua-1"]);
      if (glyph.s) {
        assert.deepEqual(lit.cave.heard, ["agua_01"]);
        const phrase = lit.phrases[learned];
        assert.deepEqual([phrase.en, phrase.lt, phrase.sitId, phrase.count], [expected.en, expected.lt, "x04-yaxche", 1]);
      }
      assert.deepEqual(await cardMatches(run, expected.en), [], "the learned line is separate from the cards store");
      const geometry = await checkSolved();
      await mark("solved");

      // Advance real setTimeout time as well as RAF at 50ms per frame. Each four-frame batch gives
      // the event loop and React a turn. Keep F34, F85 and F600 on the same, untouched opening.
      let solvedFrames = 0;
      async function advanceTo(frame) {
        while (solvedFrames < frame) {
          const batch = Math.min(4, frame - solvedFrames);
          solvedFrames += batch;
          await wall(Math.max(0, startWall + solvedFrames * frameMs - performance.now()));
          await step(batch);
        }
      }
      if (mode === "authored") {
        for (const frame of [34, 85, 600]) {
          await advanceTo(frame);
          if (frame === 600) {
            for (let i = 0; (await readTime()) - startGame < 30 && i < 25; i++) await advanceTo(solvedFrames + 2);
            assert.ok((await readTime()) - startGame >= 30, "game elapsed time reached 30 seconds");
            assert.ok(performance.now() - startWall >= 30_000, "native setTimeout elapsed time reached 30 seconds");
          }
          assert.deepEqual(await checkSolved(), geometry, "the same controls keep their hit boxes");
          await checkIpa(true);
          await mark(`F${solvedFrames}-solved`);
        }
      } else if (mode === "pair" || mode === "empty") {
        await advanceTo(36);
        assert.deepEqual(await checkSolved(), geometry, "plain fallback survives the former 1.7s timer");
        await mark("F36-solved");
      }

      if (mode === "authored") {
        if (!phone) {
          const word = await reading.locator(".il .en").first().boundingBox();
          await page.mouse.move(word.x + 1, word.y + word.height / 2);
          await page.mouse.down();
          await page.mouse.move(word.x + word.width - 1, word.y + word.height / 2, { steps: 6 });
          await page.mouse.up();
          assert.ok(await page.evaluate(() => getSelection().toString().trim()), "target words can be selected with the mouse");
          await page.keyboard.press("Tab");
          assert.equal(await card.evaluate((node) => node.contains(document.activeElement)
            && document.activeElement.matches("button")), true, "keyboard focus stays on a stone button");
        }
        if (!phone) await page.keyboard.press("i"); else await press(ipa);
        await checkIpa(false);
        assert.equal(await helper.isVisible(), true);
        await mark("solved-without-ipa");
        if (!phone) await page.keyboard.press("l"); else await press(translation);
        assert.equal(await helper.isVisible(), false);
        assert.equal(await targetText(), expected.en);
        await checkIpa(false);
        if (!phone) await page.keyboard.press("l"); else await press(translation);
        assert.equal(await helper.isVisible(), true);
      }
      async function startReplay(key = false) {
        await checkSolved();
        const count = (await calls()).length;
        if (key) await page.keyboard.press("r"); else await press(replay);
        const call = await wait(async () => (await calls())[count], "replay calls actual audio.play", { frames: 0 });
        assert.deepEqual([call.text, call.voice, call.speed], [expected.en, "es_coach_f", 1]);
        await checkSolved();
        return count;
      }
      const endReplay = (index) => wait(async () => {
        const call = (await calls())[index];
        return call.ended !== null && call;
      }, "real playback promise settles", { frames: 0 });
      const healthy = mode === "authored" || mode === "pair";
      const play = await startReplay();
      if (healthy) {
        await wait(() => page.evaluate(() => window.__ew.voice() === "playing"), "the fixture is playing", { frames: 0 });
        assert.equal((await calls())[play].ended, null);
        await checkSolved();
        await mark("during-replay");
      }
      const end = await endReplay(play);
      assert.equal(end.result, healthy);
      if (mode === "authored" || mode === "missing") {
        assert.ok(run.mp3s.includes(`${pcMediaDir}${recording}.mp3`), "the real glyph recording key was requested");
      }
      // In the primary scenario the original solve deadline is already past. The old replay path
      // would schedule a fresh 800ms close here, even if the clip failed.
      await wall(900);
      await step(2);
      await checkSolved();
      await mark("after-replay");
      if (mode === "authored" && !phone) {
        const keyboard = await startReplay(true);
        assert.equal((await endReplay(keyboard)).result, true);
        await wall(900);
        await checkSolved();
      }

      const kept = await saveTwice(run, save, expected, { inspect: async (phase) => {
        await checkSolved();
        await mark(`stone-${phase}`);
      } });

      if (mode === "authored") {
        const position = () => card.evaluate((node) => ({ top: node.scrollTop,
          line: node.querySelector(".glyph-text").getBoundingClientRect().toJSON() }));
        const before = await position();
        const beforeTap = await progressState();
        const heading = card.locator("h2");
        const box = await heading.boundingBox();
        await point(box.x + box.width / 2, box.y + box.height / 2);
        await checkSolved();
        assert.deepEqual(await position(), before, "an inside tap preserves the reading position");
        assert.deepEqual(await progressState(), beforeTap, "inside tap leaves the player and quest untouched");
        const outside = await page.evaluate(() => {
          const veil = document.querySelector(".glyph-veil");
          const card = document.querySelector(".glyph-card");
          const rect = card.getBoundingClientRect();
          const controls = document.querySelectorAll(".toolbar .ride-menu, .toolbar .toolbar-tools button");
          for (const control of controls) {
            const box = control.getBoundingClientRect();
            const x = box.left + box.width / 2, y = box.top + box.height / 2;
            if (!box.width || !box.height || getComputedStyle(control).visibility !== "visible"
              || (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom)
              || document.elementFromPoint(x, y) !== veil) continue;
            window.__cardStone.underClicks = 0;
            control.addEventListener("click", () => window.__cardStone.underClicks++);
            return { x, y };
          }
          return null;
        });
        assert.ok(outside, "the veil covers an actual town control outside the card");
        await point(outside.x, outside.y);
        assert.equal(await page.evaluate(() => window.__cardStone.underClicks), 0);
        assert.deepEqual(await progressState(), beforeTap, "backdrop dismissal has no underlying UI action");
      } else if (mode === "pair") {
        const active = await startReplay(!phone);
        await wait(() => page.evaluate(() => window.__ew.voice() === "playing"), "mid-close replay is playing", { frames: 0 });
        assert.equal((await calls())[active].ended, null);
        if (phone) await press(close); else await page.keyboard.press("Escape");
        assert.equal((await endReplay(active)).result, false, "explicit dismissal interrupts the real playback");
      } else {
        await press(close);
      }

      assert.equal(await readGlyph(), null, "explicit dismissal clears hud.glyph");
      assert.equal(await page.locator(".glyph-veil").count(), 0);
      assert.equal(await completions(), 1, "dismissal resolves the pending quest once");
      for (let i = 0; i < 5; i++) await step(4);
      assert.equal(await page.evaluate(() => window.__ew.store.getState().hud.cave?.lit), 1);
      assert.deepEqual((await progressState()).cave, lit.cave);
      await wall(900);
      assert.equal(await completions(), 1, "playback completion cannot resolve a dismissed opening again");
      assert.equal(await readGlyph(), null);
      await savedCard(run, expected, kept);
      await mark("dismissed");
      if (mode === "authored") {
        // The stone's final IPA setting is off, after the real conversation set it on.
        await kinIpa(false, false);
        await checkBook(run, [[expected, kept]]);
      }
    });
  }
}

if (shots) await mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
try {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    await withGame(browser, viewport, "score-miss", { spawn: roadSpawn }, (run) => checkScore(run, false));
    await withGame(browser, viewport, "score-earned", { spawn: roadSpawn }, (run) => checkScore(run, true));
    await withGame(browser, viewport, "street-wallet", {}, checkStreet);
    await withGame(browser, viewport, "street-chatter", { save: { settings: { play: "light" } } }, checkChatter);
    if (pc) await checkPc(browser, viewport);
  }
  console.log(`stones-cards: ${edition}-${learner} passed both viewports`);
} finally {
  await browser.close();
}
