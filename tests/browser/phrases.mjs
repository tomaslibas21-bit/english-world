// Run against the Maple Harbor Vite dev server for the word-game debug hooks.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sampleBoardRegistration } from "./board-registration.mjs";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const mp3 = /\.mp3(?:\?|$)/;
const games = ["road", "sea"];
const sizes = ["390x844", "390x664", "844x390", "1280x800"];
const frameMs = 50;
const { items } = JSON.parse(readFileSync(new URL("../../src/content/phrases/phrase-game.mh.json", import.meta.url), "utf8"));
const phrasesByClip = new Map(items.map((item) => [item.pClip, item]));
const englishPhrases = new Set(items.map((item) => item.f));
const longestPhrases = items.map(({ f }) => f).toSorted((a, b) => b.length - a.length).slice(0, 3);

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished }, phrases: {}, seenIntro: {}, started: 1,
  coach: { done: true, run: true, view: true },
};
const places = { road: { x: -40, z: -13.65, rot: 0 }, sea: { x: -10, z: -69.5, rot: Math.PI } };

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
  await page.route(mp3, (route) => route.fulfill({ status: 204, body: "" }));
  const place = places[game];
  const save = JSON.stringify({ ...progress, place: { zone: "town", ...place } });
  await page.addInitScript(installClock, [`${storage}-progress-v1`, save]);

  const overlay = page.locator(`.${game}-overlay`);
  const choice = overlay.getByRole("dialog", { name: "Kaip žaisime?" });
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
    await page.evaluate(() => {
      const { coach, store } = window.__ew;
      coach?.finish?.();
      store.getState().setHud({ panel: null });
    });

    if (game === "road") {
      // Town reloads on foot. Return to the van's original parking spot without rewriting progress.
      if (reload) await page.evaluate(({ x, z, rot }) => window.__ew.game.placeOnFoot(x, z, rot), place);
      const parked = page.locator(".prompt").getByText("Vairuoti", { exact: true });
      await wait(() => parked.isVisible(), "the parked van can be driven");
      await press(parked);
      await wait(() => page.evaluate(() => window.__ew.game.rides.phase === "on"
        && !!window.__ew.game.rides.riding), "boards the parked van");
    } else {
      if ((await read()).town?.phase !== "on") {
        await withThrottle(() => wait(() => page.evaluate(() => {
          const { game, store } = window.__ew;
          return game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "anchored-1";
        }), "swims to the first anchored boat", 4));
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
    const matches = (url) => new URL(url).pathname.endsWith(`/${file}`);
    if (!mp3Urls.slice(from).some(matches)) {
      await page.waitForRequest((request) => matches(request.url()), { timeout: 4000 }).catch((error) => {
        throw new Error(`missing MP3 ${file}; requested ${mp3Urls.slice(from).join(", ") || "none"}`, { cause: error });
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
    reachChoice, step, read, wait, gate, approach, answer, waitState, waitForClip, reveal };
}

export function phraseFor(state) {
  const item = phrasesByClip.get(state.phrasePrompt?.pClip);
  assert.ok(item, "the active gate uses a Maple Harbor phrase clip");
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
      current: button.getAttribute("aria-current"), left, right, top, bottom, width, height,
      inside: left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight,
      tappable: button.contains(target) && !button.disabled };
  }));
  assert.deepEqual(actual.map((button) => button.way), ["words", "phrases"]);
  assert.deepEqual(actual.map((button) => button.title), ["Žodžiai", "Frazės"]);
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
    assert.ok(lang === "en" && englishPhrases.has(text), `lane ${lane} shows a Maple Harbor English phrase`);
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

async function checkLongestBoards(run, game, state) {
  const setOptions = async (options) => {
    await run.page.evaluate(async ({ game, options }) => {
      const store = game === "road" ? (await import("/src/game/road/store.ts")).useRoad
        : (await import("/src/game/sea/store.ts")).useSea;
      store.setState({ prompt: { ...store.getState().prompt, options } });
    }, { game, options });
    await run.page.waitForFunction((first) => document.querySelector(".road-gate")?.getAttribute("aria-label") === first,
      options[0], { polling: 25 });
  };
  try {
    await setOptions(longestPhrases);
    await checkPhraseBoards(run, game, { ...state, gates: longestPhrases });
    const lineCounts = await run.overlay.locator(".road-gate").evaluateAll((boards) =>
      boards.map((board) => board.querySelectorAll(":scope > span").length));
    assert.ok(lineCounts.includes(3) && lineCounts.every((count) => count <= 3));
    if (game === "road" && run.page.viewportSize().width === 390) {
      const phrase = "The sun went down as we landed.";
      const options = [phrase, ...longestPhrases.slice(1)];
      assert.ok(state.gateDistance / state.speed >= 1.8, "the learner still has time to steer");
      await setOptions(options);
      await checkPhraseBoards(run, game, { ...state, gates: options });
      const board = run.overlay.locator(".road-gate").first();
      assert.equal(await board.locator(":scope > span").count(), 3);
      assert.ok(await board.evaluate((label) => Number.parseFloat(getComputedStyle(label).fontSize) >= 22),
        "the three-line phrase uses at least 22 px on the local board face");
    }
  } finally {
    await setOptions(state.gates);
  }
}

async function checkKaraokeTiming(run, item, previousGate, passed = 1, correction = false) {
  const sample = () => run.karaoke.evaluate((line, previousGate) => {
    const panel = line.closest(".road-karaoke-panel");
    const box = panel.getBoundingClientRect();
    const group = panel.parentElement.querySelector(`.road-gates:not([data-gate-id="${previousGate}"])`);
    const nextLabels = [...(group?.querySelectorAll(".road-gate > span") ?? [])].filter((span) => {
      const style = getComputedStyle(span.parentElement);
      return style.visibility === "visible" && Number(style.opacity) > 0;
    });
    const badge = panel.querySelector(".kit-feedback[data-feedback=retry]");
    return { hidden: line.hidden, fading: line.classList.contains("fading"),
      badge: badge?.getBoundingClientRect().width > 0,
      lit: [...line.querySelectorAll(".lit")].map((span) => span.textContent),
      current: [...line.children].findIndex((span) => span.classList.contains("current")),
      overlap: nextLabels.find((span) => {
        const label = span.getBoundingClientRect();
        return box.left < label.right && label.left < box.right && box.top < label.bottom && label.top < box.bottom;
      })?.textContent };
  }, previousGate);

  const end = item.t.at(-1)[1];
  for (let frame = 0; frame <= Math.ceil((end + 0.8) * 1000 / frameMs); frame++) {
    const { hidden, fading, badge, lit, current, overlap } = await sample();
    // The first RAF after the 204 starts the fallback clock at zero.
    const time = Math.max(0, frame - 1) * frameMs / 1000;
    const expected = item.t.filter(([start]) => start <= time).length;
    if (hidden) {
      assert.ok(time + 1e-6 >= end + 0.6, `overlay hid before the clip and fade finished (${time}s)`);
      assert.equal(badge, false);
      await run.approach(passed);
      const next = run.overlay.locator(`.road-gates:not([data-gate-id="${previousGate}"]) .road-gate:visible`);
      assert.equal(await next.count(), 3, "the next boards have visible labels");
      assert.equal(await run.karaoke.isVisible(), false);
      return;
    }
    assert.deepEqual(lit, item.words.slice(0, expected), `lit words at ${time}s`);
    const active = item.t.findLastIndex(([start, stop]) => start <= time && time < stop);
    assert.equal(current, active, `current word index at ${time}s`);
    assert.equal(fading, time >= end, `fade at ${time}s`);
    assert.equal(badge, correction, `correction badge at ${time}s`);
    assert.equal(overlap, undefined, `karaoke overlaps a next-board label at ${time}s`);
    await run.step();
  }
  assert.fail("the karaoke overlay did not hide after the clip and fade");
}

async function checkScore(run, game, earned, comeback) {
  const before = await run.read();
  await run.page.evaluate((id) => id === "road" ? window.__ew.road.jumpTimer() : window.__ew.seaTimer(), game);
  const state = await run.waitState((state) => state.phase === "result", "shows the score card", 4);
  assert.equal(state.result.total, before.totalGates);
  assert.equal(state.result.right, before.rightGates);
  const score = run.overlay.getByRole("dialog", { name: game === "road" ? "Važiavimas baigtas" : "Plaukimas baigtas" });
  await score.waitFor();
  const list = score.locator(".road-practice");
  const select = list.getByRole("combobox");
  assert.deepEqual(await select.locator("option").allTextContents(), [...earned.values()]);
  assert.ok(comeback, "the phrase was answered on its return");
  const pair = `${comeback.f} · ${comeback.p}`;
  await select.selectOption({ label: pair });
  assert.equal(await select.locator("option:checked").textContent(), pair);
  assert.equal(await list.getByText("Šįkart pataikei!", { exact: true }).isVisible(), true);
}

async function testGame(browser, game, size, budget) {
  const run = await openGame(browser, game, size);
  let closing;
  const close = () => closing ??= run.context.close();
  const onTimeout = () => { void close().catch(() => {}); };
  budget.addEventListener("abort", onTimeout, { once: true });
  const earned = new Map();
  let first, missed, comeback;
  const checks = [
    ["choice defaults to Words and fits", async () => {
      await run.reachChoice();
      await checkChoice(run, "words");
    }],
    ["first phrase shows Lithuanian and requests its pClip", async () => {
      const from = run.mp3Urls.length;
      await run.choose("phrases");
      first = phraseFor(await run.gate(0));
      // (at sea the first cue and its clip come once the 1.2 s crossing title has gone: the clock is stepped to it)
      await run.wait(() => run.cue.isVisible(), "the first cue shows", 4);
      assert.equal(await run.cue.innerText(), first.p);
      await run.waitForClip(first.pClip, from);
    }],
    ["three distinct English phrases fit their projected boards", async () => {
      const state = await run.approach(0);
      await checkPhraseBoards(run, game, state);
      await checkLongestBoards(run, game, state);
      await run.step(4);
      await checkPhraseBoards(run, game, await run.read());
    }],
    ["right answer requests fClip, times and clears karaoke without overlap", async () => {
      const from = run.mp3Urls.length;
      const previousGate = (await run.read()).registration.gateId;
      await run.answer(true);
      earned.set(first.f, `${first.f} · ${first.p}`);
      await run.reveal(first, from);
      if (game === "road") {
        const right = run.overlay.locator('.road-feedback .kit-feedback[data-feedback="right"]');
        assert.ok(await right.isVisible(), "the right badge is visible when the muted phrase starts");
      }
      await checkKaraokeTiming(run, first, previousGate);
    }],
    ["wrong answer keeps the retry badge beside the phrase throughout playback", async () => {
      const state = await run.gate(1);
      missed = phraseFor(state);
      const from = run.mp3Urls.length;
      await run.answer(false);
      if (game === "road") {
        const retry = run.overlay.locator('.road-feedback .kit-feedback[data-feedback="retry"]');
        await retry.waitFor();
        await run.step(12);
        assert.ok(await retry.isVisible(), "the retry badge remains visible just before the correction");
        assert.equal(await run.karaoke.isVisible(), false);
      }
      await run.reveal(missed, from);
      await checkKaraokeTiming(run, missed, state.registration.gateId, 2, true);
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
    ["score lists the English and Lithuanian phrases and marks the comeback", () => checkScore(run, game, earned, comeback)],
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
      assert.equal(await run.cue.innerText(), "Ką išgirdai?");
      const boards = run.overlay.locator('.road-gates[lang="lt"] .road-gate:visible');
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
