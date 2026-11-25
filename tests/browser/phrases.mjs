// Run with WORLD_STORAGE=puerto-colibri and VITE_EDITION=es. Set VITE_LEARNER=lt for the Lithuanian layer.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleBoardRegistration } from "./board-registration.mjs";
import { checkManualSave } from "./fixtures/phrase-saves.mjs";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const edition = process.env.VITE_EDITION || "es";
const learner = process.env.VITE_LEARNER || "en";
assert.equal(storage, "puerto-colibri");
assert.equal(edition, "es");
assert.ok(["en", "lt"].includes(learner), `Unsupported VITE_LEARNER: ${learner}`);
const ui = learner === "lt" ? {
  heading: "Kaip žaisime?",
  words: ["Žodžiai", "Išgirskite ispaniškai, pasirinkite reikšmę"],
  phrases: ["Frazės", "Išgirskite lietuviškai, pasirinkite ispaniškai"],
  comeback: "Šįkart pataikėte!",
  drive: "Vairuoti", hear: "Ką išgirdote?", replay: "Klausyti dar kartą",
  road: "Važiavimas baigtas", sea: "Plaukimas baigtas",
} : {
  heading: "How do you want to play?",
  words: ["Words", "Hear Spanish, pick the meaning"],
  phrases: ["Phrases", "Hear English, pick the Spanish"],
  comeback: "Got it this time!",
  drive: "Drive", hear: "What did you hear?", replay: "Listen again",
  road: "Drive over", sea: "Boat ride over",
};
const mp3 = /\.mp3(?:\?|$)/;
const games = ["road", "sea"];
const sizes = ["390x844", "390x664", "844x390", "1280x800"];
const frameMs = 50;
const { items } = JSON.parse(readFileSync(new URL(`../../src/editions/es/content/phrases/phrase-game.pc-${learner}.json`, import.meta.url), "utf8"));
const phrasesByClip = new Map(items.map((item) => [item.pClip, item]));
const spanishPhrases = new Set(items.map((item) => item.f));

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished }, phrases: {}, seenIntro: {}, started: 1,
  coach: { done: true, run: true, view: true },
};
const places = { road: { x: -88, z: -13.65, rot: 0 }, sea: { x: 42, z: -73.8, rot: Math.PI } };

function installClock([key, save]) {
  if (!localStorage.getItem(key)) localStorage.setItem(key, save);
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

export async function launchBrowser() {
  const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  return chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
}

export async function openGame(browser, game, size) {
  const [width, height] = size.split("x").map(Number);
  const phone = Math.min(width, height) === 390;
  const context = await browser.newContext({
    viewport: { width, height },
    ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(5000);
  const mp3Urls = [];
  page.on("request", (request) => { if (mp3.test(request.url())) mp3Urls.push(request.url()); });
  await page.route(mp3, (route) => route.fulfill({ status: 204, headers: { "Cache-Control": "no-store" }, body: "" }));
  const place = places[game];
  const save = JSON.stringify({ ...progress, place: { zone: "town", ...place } });
  await page.addInitScript(installClock, [`${storage}-progress-v1`, save]);

  const overlay = page.locator(`.${game}-overlay`);
  const choice = overlay.getByRole("dialog", { name: ui.heading, exact: true });
  const press = (target) => phone ? target.tap() : target.click();
  const choose = (way) => press(choice.locator(`[data-way="${way}"]`));
  const cue = overlay.locator(".road-question strong");
  const karaoke = overlay.locator(".road-karaoke");
  const step = (count = 1) => page.evaluate(([n, ms]) => window.__step(n, ms), [count, frameMs]);
  const read = () => page.evaluate((id) => id === "road" ? window.__ew?.road.state() : window.__ew?.sea?.(), game);
  const wait = async (predicate, description, frames = 8) => {
    const deadline = Date.now() + 8000;
    do {
      const value = await predicate();
      if (value) return value;
      await step(frames);
    } while (Date.now() < deadline);
    const state = await read();
    assert.fail(`${description} (phase ${state?.phase}, gate ${state?.totalGates}, distance ${state?.gateDistance})`);
  };
  const waitState = (predicate, description, frames) => wait(async () => {
    const state = await read();
    return state && predicate(state) && state;
  }, description, frames);

  async function withThrottle(run) {
    const joystick = game === "road" && phone;
    if (joystick) await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    else await page.keyboard.down("ArrowUp");
    try { await run(); }
    finally {
      if (joystick) await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
      else await page.keyboard.up("ArrowUp");
    }
  }

  async function reachChoice(reload = false) {
    if (reload) await page.reload({ waitUntil: "domcontentloaded" });
    else await page.goto(base, { waitUntil: "domcontentloaded" });
    await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads");
    assert.equal(await page.evaluate(() => document.documentElement.lang), learner, "the server uses the requested learner layer");
    await page.evaluate(() => {
      const { coach, store } = window.__ew;
      coach?.finish?.();
      store.getState().setHud({ panel: null });
    });

    if (game === "road") {
      // Town reloads on foot. Return to the van's original parking spot without rewriting progress.
      if (reload) await page.evaluate(({ x, z, rot }) => window.__ew.game.placeOnFoot(x, z, rot), place);
      const parked = page.locator(".prompt").getByText(ui.drive, { exact: true });
      await wait(() => parked.isVisible(), "the parked van can be driven");
      await press(parked);
      await wait(() => page.evaluate(() => window.__ew.game.rides.phase === "on"
        && !!window.__ew.game.rides.riding), "boards the parked van");
      // As in road.mjs, start off on Calle Ceiba and drive across the physical exit.
      await page.evaluate(() => {
        const { game } = window.__ew;
        game.rides.resetPosition(game.rides.riding, { x: -1.65, z: 53, rot: 0 });
      });
      await step(24);
      await waitState((state) => state.ready, "the road is ready");
    } else {
      if ((await read()).town?.phase !== "on") {
        await withThrottle(() => wait(() => page.evaluate(() => {
          const { game, store } = window.__ew;
          return game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "lancha-afloat-3";
        }), "swims to the green lancha", 4));
        await page.keyboard.press("e");
        await waitState((state) => state.town?.phase === "on", "boards the anchored boat");
      }
      const { edge, town: { x } } = await waitState((state) => state.ready, "open water is ready");
      assert.equal(await page.evaluate(([x, z]) => window.__ew.seaPlaceBoat(x, z), [x, edge + 34]), true);
    }
    await withThrottle(() => waitState((state) => state.phase === "briefing", "crosses into the word-game choice", 4));
    await choice.waitFor();
  }

  const gate = (passed) => waitState((state) => state.phase === "drive" && state.totalGates === passed
    && state.gates?.length === 3, `opens gate ${passed + 1}`, 4);
  const approach = (passed) => waitState((state) => state.totalGates === passed && state.gates?.length === 3
    && (game === "road" ? state.gateDistance <= state.speed * 2.1 : state.gateDistance <= 28),
    `approaches gate ${passed + 1}`, 2);

  async function answer(correct) {
    const before = await read();
    assert.equal(before.phase, "drive");
    assert.equal(before.gates?.length, 3, "there is a gate to answer");
    assert.equal(await page.evaluate(([id, right]) => id === "road"
      ? window.__ew.road.forceGate(right) : window.__ew.seaForceGate(right), [game, correct]), true);
    await waitState((state) => state.totalGates > before.totalGates || state.gateDistance <= 10, "nears the answer line");
    const after = await waitState((state) => state.totalGates > before.totalGates, "crosses the answer line", 1);
    assert.equal(after.totalGates, before.totalGates + 1);
    assert.equal(after.rightGates, before.rightGates + Number(correct));
  }

  async function waitForClip(file, from) {
    const matches = (url) => new URL(url).pathname.endsWith(`/audio-es/${file}`);
    if (!mp3Urls.slice(from).some(matches)) {
      await page.waitForRequest((request) => matches(request.url()), { timeout: 4000 }).catch((error) => {
        throw new Error(`missing MP3 ${file} from the requests (${mp3Urls.slice(from).join(", ") || "none"})`, { cause: error });
      });
    }
  }

  async function reveal(item, from) {
    await waitState((state) => state.karaoke?.visible, "shows the karaoke overlay", 1);
    await karaoke.waitFor();
    assert.deepEqual(await karaoke.locator("span").allTextContents(), item.words);
    assert.equal(await karaoke.textContent(), item.f);
    await waitForClip(item.fClip, from);
    // Let the silent response reach the media element while the simulated clock is stopped.
    await page.waitForFunction(() => window.__ew.voice() === "idle", undefined, { polling: 25 });
  }

  return { page, context, phone, overlay, choice, choose, cue, karaoke, mp3Urls,
    reachChoice, step, read, gate, approach, answer, wait, waitState, waitForClip, reveal, press };
}

export function phraseFor(state) {
  const item = phrasesByClip.get(state.phrasePrompt?.pClip);
  assert.ok(item, `the active gate uses a Puerto Colibrí ${learner} prompt clip`);
  assert.equal(state.phrasePrompt.p, item.p);
  assert.equal(state.gates[state.right], item.f);
  return item;
}

async function checkChoice(run, way) {
  const options = run.choice.locator("[data-way]");
  const actual = await options.evaluateAll((buttons) => buttons.map((button) => {
    const { left, right, top, bottom, width, height } = button.getBoundingClientRect();
    const target = document.elementFromPoint(left + width / 2, top + height / 2);
    return { way: button.dataset.way, title: button.querySelector("strong")?.textContent,
      line: button.querySelector("small")?.textContent, current: button.getAttribute("aria-current"), left, right, top, bottom, width, height,
      inside: left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight,
      tappable: button.contains(target) && !button.disabled };
  }));
  assert.deepEqual(actual.map((button) => button.way), [way, way === "words" ? "phrases" : "words"]);
  assert.deepEqual(actual.map(({ title, line }) => [title, line]), actual.map((button) => ui[button.way]));
  assert.deepEqual(actual.filter((button) => button.current === "true").map((button) => button.way), [way]);
  const minimum = run.phone ? 44 : 1;
  for (const button of actual) {
    assert.ok(button.inside && button.tappable && button.width >= minimum && button.height >= minimum,
      `${button.way} choice: ${JSON.stringify(button)}`);
  }
  const [a, b] = actual;
  assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, "the options are separated");
}

async function checkPhraseBoards(run, game, state) {
  const { samples } = await sampleBoardRegistration(run.page, game);
  const labels = await run.overlay.locator(".road-gates .road-gate").evaluateAll((boards) => boards.map((board) => ({
    lane: Number(board.dataset.lane), text: board.getAttribute("aria-label"), lang: board.parentElement.lang,
    lines: [...board.querySelectorAll(":scope > span")].map((line) => {
      const range = document.createRange();
      range.selectNodeContents(line);
      const text = range.getBoundingClientRect(), box = line.getBoundingClientRect();
      return { text: line.textContent, left: text.left, right: text.right, top: box.top, bottom: box.bottom,
        inside: text.left >= 0 && text.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
        ellipsized: [board, line].some((node) => getComputedStyle(node).textOverflow.includes("ellipsis")) };
    }),
  })));
  assert.deepEqual(labels.map(({ text }) => text), state.gates);
  assert.equal(new Set(labels.map(({ text }) => text)).size, 3);
  for (const { lane, text, lang, lines } of labels) {
    assert.ok(lang === "es" && spanishPhrases.has(text), `lane ${lane} shows a Puerto Colibrí Spanish phrase`);
    assert.ok(lines.length <= 2, `lane ${lane} uses at most two lines`);
    const key = `${state.registration.gateId}:${lane}:`;
    const corners = samples.filter((sample) => sample.key?.startsWith(key) && sample.name !== "center");
    assert.equal(corners.length, 4, `lane ${lane} has four projected face corners`);
    assert.ok(corners.every(({ visible }) => visible), `lane ${lane} is visible`);
    const xs = corners.map(({ projected }) => projected[0]), ys = corners.map(({ projected }) => projected[1]);
    assert.equal(lines.map((line) => line.text).join(" "), text);
    for (const line of lines) {
      assert.ok(line.inside && !line.ellipsized && line.right > line.left && line.bottom > line.top,
        `lane ${lane} renders the whole line inside the viewport: ${JSON.stringify(line)}`);
      assert.ok(line.left >= Math.min(...xs) - 0.75 && line.right <= Math.max(...xs) + 0.75
        && line.top >= Math.min(...ys) - 0.75 && line.bottom <= Math.max(...ys) + 0.75,
        `lane ${lane} text extends beyond its projected board face: ${JSON.stringify({ line, xs, ys })}`);
    }
  }
}

async function checkKaraokeTiming(run, item, previousGate) {
  const sample = () => run.karaoke.evaluate((line, previousGate) => {
    const box = line.getBoundingClientRect();
    const group = line.parentElement.querySelector(`.road-gates:not([data-gate-id="${previousGate}"])`);
    const nextLabels = [...(group?.querySelectorAll(".road-gate > span") ?? [])].filter((span) => {
      const style = getComputedStyle(span.parentElement);
      return style.visibility === "visible" && Number(style.opacity) > 0;
    });
    return { hidden: line.hidden, fading: line.classList.contains("fading"),
      lit: [...line.querySelectorAll(".lit")].map((span) => span.textContent),
      current: [...line.children].findIndex((span) => span.classList.contains("current")),
      overlap: nextLabels.find((span) => {
        const label = span.getBoundingClientRect();
        return box.left < label.right && label.left < box.right && box.top < label.bottom && label.top < box.bottom;
      })?.textContent };
  }, previousGate);

  const end = item.t.at(-1)[1];
  for (let frame = 0; frame <= Math.ceil((end + 0.8) * 1000 / frameMs); frame++) {
    const { hidden, fading, lit, current, overlap } = await sample();
    // The first RAF after the 204 starts the fallback clock at zero.
    const time = Math.max(0, frame - 1) * frameMs / 1000;
    const expected = item.t.filter(([start]) => start <= time).length;
    if (hidden) {
      assert.ok(time + 1e-6 >= end + 0.6, `overlay hid before the clip and fade finished (${time}s)`);
      await run.approach(1);
      const next = run.overlay.locator(`.road-gates:not([data-gate-id="${previousGate}"]) .road-gate:visible`);
      assert.equal(await next.count(), 3, "the next boards have visible labels");
      assert.equal(await run.karaoke.isVisible(), false);
      return;
    }
    assert.deepEqual(lit, item.words.slice(0, expected), `lit words at ${time}s`);
    const active = item.t.findLastIndex(([start, stop]) => start <= time && time < stop);
    assert.equal(current, active, `current word index at ${time}s`);
    assert.equal(fading, time >= end, `fade at ${time}s`);
    assert.equal(overlap, undefined, `karaoke overlaps a next-board label at ${time}s`);
    await run.step();
  }
  assert.fail("the karaoke overlay did not hide after the clip and fade");
}

async function checkScore(run, game, earned, comeback, firstBoard) {
  const before = await run.read();
  await run.page.evaluate((id) => id === "road" ? window.__ew.road.jumpTimer() : window.__ew.seaTimer(), game);
  const state = await run.waitState((state) => state.phase === "result", "shows the score card", 4);
  assert.equal(state.result.total, before.totalGates);
  assert.equal(state.result.right, before.rightGates);
  const score = run.overlay.getByRole("dialog", { name: ui[game], exact: true });
  await score.waitFor();
  const list = score.locator(".road-practice");
  const select = list.getByRole("combobox");
  assert.deepEqual(await select.locator("option").allTextContents(), [...earned.values()]);
  assert.ok(comeback, "the phrase was answered on its return");
  const pair = `${comeback.f} · ${comeback.p}`;
  await select.selectOption({ label: pair });
  assert.equal(await select.locator("option:checked").textContent(), pair);
  assert.equal(await list.getByText(ui.comeback, { exact: true }).isVisible(), true);
  const review = score.locator(":scope > .phrase-review-row");
  const all = review.getByRole("combobox");
  await all.waitFor({ state: "attached" });
  assert.deepEqual((await all.locator("option").allTextContents()).slice(0, 3), firstBoard);
  const target = firstBoard.filter((phrase) => !earned.has(phrase)).sort((a, b) => b.length - a.length)[0];
  assert.ok(target, "the first board has an unearned alternative");
  await all.selectOption({ label: target });
  const save = review.locator("[data-phrase-save]");
  await save.scrollIntoViewIfNeeded();
  const saved = await checkManualSave(run.page, save, run.phone, target, "", run.read);
  assert.equal(saved.lt, items.find((item) => item.f === target).p);
  const title = await run.page.evaluate(async (mode) => {
    const { L } = await import("/src/ui/i18n.ts");
    const words = mode === "road" ? (await import("/src/content/road.ts")).ROAD_UI : (await import("/src/content/sea.ts")).SEA_UI;
    return L(words.title);
  }, game);
  assert.equal(saved.sourceLabel, title);
  await score.evaluate((el) => { el.style.fontSize = "200%"; });
  try {
    const selected = review.locator(".phrase-review-value");
    assert.equal(await selected.textContent(), target);
    assert(await review.evaluate((el) => {
      const { left, right } = el.getBoundingClientRect();
      return [...el.querySelectorAll(".phrase-review-value, small")].every((child) => {
        const range = document.createRange();
        range.selectNodeContents(child);
        return [...range.getClientRects()].every((r) => r.left >= left - 1 && r.right <= right + 1);
      });
    }), "selected Spanish and helper fit at 200%");
    for (const action of await score.locator(".mode-score-actions button").all()) {
      await action.scrollIntoViewIfNeeded();
      assert(await action.evaluate((el) => {
        const { x, y, width, height } = el.getBoundingClientRect();
        return height >= 44 && el.contains(document.elementFromPoint(x + width / 2, y + height / 2));
      }), "the score action is reachable at 200%");
    }
  } finally {
    await score.evaluate((el) => el.style.removeProperty("font-size"));
  }
}

async function testGame(browser, game, size, budget) {
  const run = await openGame(browser, game, size);
  let closing;
  const close = () => closing ??= run.context.close();
  const onTimeout = () => { void close().catch(() => {}); };
  budget.addEventListener("abort", onTimeout, { once: true });
  const earned = new Map();
  let first, firstBoard, missed, comeback;
  const checks = [
    ["choice defaults to Words and fits", async () => {
      await run.reachChoice();
      await checkChoice(run, "words");
    }],
    ["first phrase shows the learner's prompt and requests its pClip", async () => {
      const from = run.mp3Urls.length;
      await run.choose("phrases");
      const state = await run.gate(0);
      first = phraseFor(state);
      firstBoard = state.gates;
      await run.wait(() => run.cue.isVisible(), "shows the first prompt after departure", 4);
      assert.equal(await run.cue.innerText(), first.p);
      await run.waitForClip(first.pClip, from);
      const replayFrom = run.mp3Urls.length;
      await run.press(run.overlay.getByRole("button", { name: ui.replay, exact: true }));
      await run.waitForClip(first.pClip, replayFrom);
    }],
    ["three distinct Spanish phrases fit their projected boards", async () => {
      await checkPhraseBoards(run, game, await run.approach(0));
      await run.step(4);
      await checkPhraseBoards(run, game, await run.read());
    }],
    ["right answer requests fClip, times and clears karaoke without overlap", async () => {
      const from = run.mp3Urls.length;
      const previousGate = (await run.read()).registration.gateId;
      await run.answer(true);
      earned.set(first.f, `${first.f} · ${first.p}`);
      await run.reveal(first, from);
      await checkKaraokeTiming(run, first, previousGate);
    }],
    ["wrong answer reveals the correct Spanish phrase and requests its fClip", async () => {
      const state = await run.gate(1);
      missed = phraseFor(state);
      const from = run.mp3Urls.length;
      await run.answer(false);
      await run.reveal(missed, from);
    }],
    ["missed phrase returns in two to four gates and is answered correctly", async () => {
      const missGate = 2;
      for (let gap = 1; gap <= 4; gap++) {
        const next = phraseFor(await run.gate(missGate + gap - 1));
        const retried = next.id === missed.id;
        if (retried) assert.equal(await run.cue.innerText(), missed.p);
        await run.answer(true);
        earned.set(next.f, `${next.f} · ${next.p}`);
        if (retried) {
          assert.ok(gap >= 2, `the missed phrase came back after ${gap} gate`);
          comeback = next;
          return;
        }
      }
      assert.fail(`phrase ${missed.id} did not come back within four gates`);
    }],
    ["score lists Spanish with the learner's meanings and marks the comeback", () => checkScore(run, game, earned, comeback, firstBoard)],
    ["reload remembers Phrases and selecting Words restores the word game", async () => {
      await run.reachChoice(true);
      await checkChoice(run, "phrases");
      await run.choose("words");
      await run.gate(0);
      const state = await run.approach(0);
      assert.equal(state.way, "words");
      assert.equal(state.phrasePrompt, undefined);
      assert.equal(state.gap, false);
      assert.ok(state.word && state.word.trim().split(/\s+/).length <= 2, `expected a word prompt, got ${state.word}`);
      assert.equal(await run.cue.innerText(), ui.hear);
      const boards = run.overlay.locator(`.road-gates[lang="${learner}"] .road-gate:visible`);
      assert.deepEqual(await boards.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))), state.gates);
      assert.equal(new Set(state.gates).size, 3);
      assert.equal(await run.karaoke.count(), 0);
    }],
  ];
  try {
    for (const [name, check] of checks) {
      const label = `${game} ${size} ${name}`;
      try {
        budget.throwIfAborted();
        await check();
        console.log(`PASS ${label}`);
      } catch (error) {
        const reason = budget.aborted ? "suite exceeded 225 seconds" : error.message.replace(/\s+/g, " ");
        console.log(`FAIL ${label} (${reason})`);
        process.exitCode = 1;
      }
    }
  } finally {
    budget.removeEventListener("abort", onTimeout);
    await close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const budget = AbortSignal.timeout(225_000);
  const browser = await launchBrowser();
  try {
    for (const game of games) {
      for (const size of sizes) await testGame(browser, game, size, budget);
    }
  } finally {
    await browser.close();
  }
}
