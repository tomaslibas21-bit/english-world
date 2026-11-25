// Run against a local Vite dev server. The chain runs this once per learner layer.
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { audioKey } from "../../src/audio-key.ts";
import { silence } from "./radio-fixtures.mjs";
import { cardCentre, checkCardList, readCardFile } from "./fixtures/phrase-saves.mjs";

const env = process.env;
const base = new URL(env.WORLD_TEST_URL || "http://127.0.0.1:8310");
assert(["http:", "https:"].includes(base.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname));
const storage = env.WORLD_STORAGE || "puerto-colibri";
const pc = storage === "puerto-colibri";
assert(pc || storage === "english-world", "WORLD_STORAGE names the town on the server");
const learner = env.WORLD_LEARNER || (pc ? "en" : "lt");
assert(pc ? ["en", "lt"].includes(learner) : learner === "lt");
if (pc) {
  assert.equal(env.VITE_EDITION || "es", "es");
  assert.equal(env.VITE_LEARNER || "en", learner, "phrases.mjs takes the PC layer from VITE_LEARNER");
}
const town = pc ? "Puerto Colibrí" : "Maple Harbor";
const progressKey = `${storage}-progress-v1`;
const cardsKey = env.WORLD_CARDS_KEY || `${storage}-cards-v1`;
const shots = process.argv.find((arg) => arg.startsWith("--shots="))?.slice(8) || env.WORLD_SHOTS;
const lt = learner === "lt";
const ui = lt ? {
  add: "Į korteles", saved: "Kortelėse", lang: "LT", stone: "Kalbantis akmuo", lit: "Akmuo užsidegė!",
  conversationEnd: "Baigti pokalbį", start: "Pradėti", drive: "Vairuoti", road: "Kelias per dykumą", sea: "Atvira jūra",
  again: "Dar kartą", roadDone: "Atgal į miestą", seaDone: "Atgal į krantą",
} : {
  add: "Add to cards", saved: "In cards", lang: "EN", stone: "A speaking stone", lit: "The stone is lit!",
  conversationEnd: "End conversation", start: "Start", drive: "Drive", road: "Desert road", sea: "Open sea",
  again: "Try again", roadDone: "Back to town", seaDone: "Back to shore",
};
const json = async (file) => JSON.parse(await readFile(new URL(file, import.meta.url), "utf8"));
const phraseItems = pc ? (await json(`../../src/editions/es/content/phrases/phrase-game.pc-${learner}.json`)).items : [];
const phraseByClip = new Map(phraseItems.map((item) => [item.pClip, item]));
const phraseByTarget = new Map(phraseItems.map((item) => [item.f, item]));
const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, phoneCalls: false, cameraFollow: true },
  sits: Object.fromEntries(["s65a-passport", "s65b-baggage", "s66-taxi", "s76-dentist-call", "s80-support-call",
    "s89-video-call", "s90-running-late", "s63-party", "p26-complaint"].map((id) => [id, finished])),
  phrases: {}, seenIntro: {}, started: 1, coach: { done: true, seen: { list: true }, run: true, view: true },
};

function installClock({ key, seed }) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!sessionStorage.getItem("stones-seeded")) {
    localStorage.setItem(key, JSON.stringify(seed));
    sessionStorage.setItem("stones-seeded", "1");
  }
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  let now = 1000, next = 0, random = 20261122;
  const frames = new Map();
  performance.now = () => now;
  Math.random = () => (random = (Math.imul(1664525, random) + 1013904223) >>> 0) / 4294967296;
  window.requestAnimationFrame = (callback) => { frames.set(++next, callback); return next; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__step = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      for (const [id, callback] of [...frames]) if (frames.delete(id)) callback(now);
    }
  };
}

async function withTown(browser, viewport, name, options, check) {
  const phone = viewport.width === 390;
  const label = `${pc ? "PC" : "MH"}-${learner}-${viewport.width}x${viewport.height}-${name}`;
  const context = await browser.newContext({
    viewport, serviceWorkers: "block", reducedMotion: "reduce",
    ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
  });
  let page, frame = 0, phase = "load";
  const errors = [], requests = [];
  const status = () => `${label}-${phase}-F${frame}`;
  const assertQuiet = () => assert.deepEqual(errors, [], "unexpected page, console or local-resource errors");
  const deadline = setTimeout(() => {
    console.error(`TIMEOUT ${status()} (case exceeded 125 seconds)`);
    void context.close().catch(() => {});
  }, 125_000);
  const manifest = options.manifest ?? {};
  const recordings = silence(1.6);
  const missingNotice = "Failed to load resource: the server responded with a status of 404 (Not Found)";
  const mediaDir = pc ? "/audio-es/" : "/audio/";
  try {
    page = await context.newPage();
    page.setDefaultTimeout(5_000);
    page.on("pageerror", (error) => errors.push(`${status()} ${error.stack || error.message}`));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const { url } = message.location();
      if (options.missing && url.split("?")[0] === new URL(options.missing, base).href && message.text() === missingNotice) return;
      errors.push(`${status()} ${message.text()} ${url}`);
    });
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.origin === base.origin && response.status() >= 400 &&
        !(url.pathname === options.missing && response.status() === 404)) {
        errors.push(`${status()} ${response.status()} ${url.pathname}`);
      }
    });
    page.on("requestfailed", (request) => {
      const error = request.failure()?.errorText;
      if (new URL(request.url()).origin === base.origin && error !== "net::ERR_ABORTED") {
        errors.push(`${status()} ${error} ${new URL(request.url()).pathname}`);
      }
    });
    await context.routeWebSocket?.("**/*", (socket) => {
      if (new URL(socket.url()).host === base.host) socket.connectToServer();
      else socket.close();
    });
    await context.route("**/*", (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const file = url.pathname;
      if (url.origin !== base.origin || request.method() !== "GET" || /^\/(api|rest|_game_reports)(\/|$)/.test(file))
        return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" }, body: "" });
      if (file === mediaDir + "manifest.json") return route.fulfill({ json: manifest });
      if (file === mediaDir + "repair-versions.json") return route.fulfill({ json: {} });
      if (/\.mp3$/i.test(file)) {
        requests.push(file);
        if (file === options.missing) return route.fulfill({ status: 404, body: "" });
        const key = file.slice(file.lastIndexOf("/") + 1, -4);
        return Object.hasOwn(manifest, key)
          ? route.fulfill({ contentType: "audio/wav", body: recordings, headers: { "cache-control": "no-store" } })
          : route.fulfill({ status: 204, body: "", headers: { "cache-control": "no-store" } });
      }
      return route.continue();
    });
    await page.addInitScript(installClock, { key: progressKey, seed: {
      ...progress, ...options.seed, settings: { ...progress.settings, ...options.seed?.settings },
      place: { zone: "town", ...(options.spawn ?? { x: 28, z: -20, rot: Math.PI }) },
    } });

    async function step(n = 1, ms = 50) {
      await page.evaluate(([count, delta]) => window.__step(count, delta), [n, ms]);
      if (ms) frame += n;
      await delay(12);
    }
    async function waitFor(predicate, description, { frames = 2, timeout = 10_000 } = {}) {
      const end = performance.now() + timeout;
      do {
        assertQuiet();
        const value = await predicate();
        if (value) return value;
        if (frames) await step(frames);
        else await delay(20);
      } while (performance.now() < end);
      assert.fail(`${status()} timed out waiting for ${description}`);
    }
    async function layout(action) {
      let done = false;
      const refresh = (async () => {
        while (!done) await step(1, 0);
      })();
      try { return await action(); }
      finally { done = true; await refresh; }
    }
    const click = (x, y) => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y);
    const visible = (node, description, frames = 0) => waitFor(() => node.isVisible(), description, { frames });
    async function press(node, minimum = 1) {
      await visible(node, String(node));
      const { x, y } = await cardCentre(node, minimum);
      await click(x, y);
    }
    async function mark(next) {
      phase = next;
      console.log(status());
      if (shots) await layout(() => page.screenshot({ path: join(shots, `stones-cards-${status()}.png`), timeout: 5000 }));
    }
    async function enter(reload = false) {
      phase = reload ? "reload" : "load";
      if (reload) await page.reload({ waitUntil: "domcontentloaded", timeout: 30_000 });
      else await page.goto(base.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
      assert.ok((await page.title()).includes(town), `expected the ${town} server`);
      assert.equal(await page.locator("html").getAttribute("lang"), learner, "server helper layer");
      const served = await page.evaluate(async () => {
        const { EDITION } = await import("/src/edition.ts");
        return [EDITION.storage, EDITION.town, EDITION.target.split("-")[0], EDITION.helper];
      });
      assert.deepEqual(served, [storage, town, pc ? "es" : "en", learner]);
      await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"
        && !!window.__ew.game && !window.__ew.store.getState().hud.zoneBanner), "town play", { timeout: 30_000 });
      await page.evaluate(() => window.__ew.coach?.finish?.());
      await step(4);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
    }
    const run = { page, context, phone, step, waitFor, visible, layout, press, click, mark, enter, requests,
      readCards: () => readCardFile(page, cardsKey) };
    await enter();
    await check(run);
    await delay(30);
    assertQuiet();
    console.log(`PASS ${status()}`);
  } catch (error) {
    const state = await Promise.race([page?.evaluate(() => {
      const { game, store, road, sea, voice } = window.__ew || {};
      const { screen, hud, conv } = store?.getState() ?? {};
      const gate = (s) => s && { phase: s.phase, way: s.way, total: s.totalGates, right: s.rightGates, distance: s.gateDistance };
      return { screen, lang: document.documentElement.lang, title: document.title, t: game?.t, zone: game?.zoneId,
        nearest: game?.nearest?.id, fade: hud?.fade, prompt: hud?.prompt, panel: hud?.panel, glyph: hud?.glyph,
        audio: voice?.(), conv: conv?.active && [conv.sitId, conv.phase, conv.introOpen], street: game?.streetState?.(),
        road: gate(road?.state()), sea: gate(sea?.()) };
    }).catch((reason) => ({ diagnostic: reason.message })), delay(1500, { diagnostic: "renderer did not reply" })]);
    throw new Error(`${status()}: ${error.message}\nstate ${JSON.stringify(state)}\nerrors ${JSON.stringify(errors)}\nrecent media ${requests.slice(-8).join(", ")}`, { cause: error });
  } finally {
    clearTimeout(deadline);
    await context.close();
  }
}

function normalized(text) {
  return text.normalize("NFC").trim().replace(/[’‘]/g, "'").replace(/\s+/g, " ")
    .replace(/^[¡¿]+|[.!?…]+$/g, "").toLowerCase();
}
const matching = async (run, en) => (await run.readCards()).filter((card) => normalized(card.en) === normalized(en));

async function stored(run, expected, original) {
  const found = await matching(run, expected.en);
  assert.equal(found.length, 1, `one stored row for ${expected.en}`);
  const [card] = found;
  assert.deepEqual([card.en, card.lt, card.sentence.en, card.sentence.lt, card.situationId, card.sourceLabel],
    [expected.en, expected.lt, expected.en, expected.lt, expected.situationId, expected.sourceLabel]);
  assert.match(card.id, /^ew-[a-z0-9]+(?:-\d+)?$/);
  assert.equal(card.box, 1);
  assert.ok(Number.isFinite(card.createdAt) && card.createdAt > 0);
  assert.equal(card.due, await run.page.evaluate((time) => new Date(time).setHours(0, 0, 0, 0), card.createdAt));
  if (expected.say && expected.say !== expected.en) assert.equal(card.sentence.say, expected.say);
  if (card.sentence.say !== undefined) assert.ok(card.sentence.say.trim());
  if (pc) {
    const ipa = await run.page.evaluate(async ({ text, say }) =>
      (await import("/src/convo/ipa.ts")).ipaForSentence(text.split(/\s+/), say), { text: expected.en, say: expected.say });
    if (ipa.every((unit) => unit.trim())) assert.equal(card.ipa, ipa.join(" "));
  }
  if (card.ipa !== undefined) assert.ok(card.ipa.trim());
  if (original) assert.deepEqual(card, original, "identity, schedule, reading and source survive");
  return card;
}

async function saveTwice(run, button, expected, { already, invariant, label = "save" } = {}) {
  if (!already) assert.deepEqual(await matching(run, expected.en), [], "the phrase is unearned");
  await run.visible(button, "phrase save action");
  await run.layout(() => button.scrollIntoViewIfNeeded());
  const box = await cardCentre(button, 44);
  const assertButton = async (saved) => {
    const name = saved ? ui.saved : ui.add;
    assert.equal(await button.getAttribute("aria-label"), name);
    assert.equal(await button.getAttribute("title"), name);
    assert.equal(await button.getAttribute("aria-pressed"), String(saved));
    assert.deepEqual(await cardCentre(button, 44), box, "saving leaves the hit box unchanged");
  };
  await assertButton(!!already);
  await run.mark(`${label}-before`);
  await run.click(box.x, box.y);
  await assertButton(true);
  const kept = await stored(run, expected, already);
  await invariant?.();
  await run.mark(`${label}-first`);
  await run.click(box.x, box.y);
  await assertButton(true);
  await stored(run, expected, kept);
  await invariant?.();
  if (!run.phone) {
    assert(await button.evaluate((el) => el === document.activeElement));
    await run.page.keyboard.press("Enter");
    await run.page.keyboard.press("Space");
    await invariant?.();
    await stored(run, expected, kept);
  }
  await run.mark(`${label}-second`);
  return kept;
}

async function checkBook(run, cards) {
  await run.enter(true);
  await checkCardList(run.page, { learner, target: pc ? "es" : "en", cards, press: run.press });
  for (const card of cards) await stored(run, card, card);
  await run.mark("post-reload-cards");
}

async function noHorizontalClip(node) {
  assert(await node.evaluate((el) => el.scrollWidth <= el.clientWidth + 1
    && document.documentElement.scrollWidth <= innerWidth + 1), "review has no horizontal overflow");
}

const authoredUnits = ["El", "agua", "guarda", "la", "memoria."];
const englishGloss = ["The", "water", "keeps", "the", "memory."];
const water = {
  en: authoredUnits.join(" "),
  lt: "The water keeps the memory.",
  gloss: englishGloss, units: authoredUnits, situationId: "x04-yaxche",
};
const starter = { en: "¡Buenos días!", lt: "Good morning!", situationId: "", sourceLabel: ui.stone };
const replayWater = {
  en: "El agua es de todos.", units: ["El", "agua", "es", "de", "todos."],
  gloss: ["The", "water", "is", "of", "everyone."], lt: "The water belongs to everyone.", situationId: "x04-yaxche",
};
if (pc && lt) {
  const { sent } = await json("../../src/editions/es-lt/tables/x04-yaxche.json");
  for (const line of [water, replayWater]) {
    const entry = sent[`${line.units.join(" | ")}␟${line.gloss.join(" | ")}␟${line.lt}`];
    assert.ok(entry, `x04-yaxche fixture for ${line.en}`);
    line.lt = entry.nat;
    line.gloss = entry.gloss.split(" | ");
  }
  assert.deepEqual([water.gloss.join(" | "), water.lt], ["— | Vanduo | saugo | — | atmintį.", "Vanduo saugo atmintį."]);
  const shared = await json("../../src/editions/es-lt/tables/_shared.json");
  starter.lt = shared.sent["¡Buenos días!␟Good morning!␟Good morning!"].nat;
}
const coach = "es_coach_f";
const clipKey = (text) => audioKey(coach, 1, text);
const manifestFor = (...lines) => Object.fromEntries(lines.map((en) => [clipKey(en), 1.6]));
const authoredClips = manifestFor(water.en, "La luz entra por el ojo del cenote.", "La ceiba une el cielo y la tierra.");
const caveSeed = { cave: { passed: ["kin"], lit: [], heard: [], seen: true }, settings: { lt: true, ltNatural: true, ipa: false } };
const treeSeed = { settings: { ...caveSeed.settings, ltNatural: false }, cave: {
  ...caveSeed.cave, tree: true, heart: true, passed: ["kin", "nikte"],
  lit: ["agua", "raices", "rio", "estrellas", "corazon"].flatMap((room) => [1, 2, 3].map((n) => `${room}-${n}`)),
} };

async function checkGlyph(run, mode) {
  const { page, phone, waitFor, press, visible, step, mark } = run;
  const primary = mode === "authored";
  const replayRound = mode === "again";
  const expected = mode === "starter" ? starter : replayRound ? replayWater : water;
  const glyph = () => page.evaluate(() => window.__ew.store.getState().hud.glyph);
  const settings = () => page.evaluate(() => {
    const { lt, ltNatural, ipa } = window.__ew.store.getState().settings;
    return { lt, ltNatural, ipa };
  });
  async function checkSettings(lt, ltNatural, ipa) {
    const want = { lt, ltNatural, ipa };
    assert.deepEqual(await settings(), want);
    const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).settings, progressKey);
    assert.deepEqual({ lt: saved.lt, ltNatural: saved.ltNatural, ipa: saved.ipa }, want);
  }
  const place = (x, z, rot) => page.evaluate(([x, z, rot]) => {
    const { game } = window.__ew;
    game.keys.clear();
    game.setJoystick(0, 0);
    game.enterZone("gruta", { x, z, rot }, true);
    game.rig.yaw = rot;
    game.rig.snap();
  }, [x, z, rot]);
  const interact = () => phone ? press(page.locator(".act-btn")) : page.keyboard.press("e");
  async function talkToKin(ipaBefore, change = false) {
    await place(0.3, -2.5, Math.PI);
    await waitFor(() => page.evaluate(() => {
      const { game, store } = window.__ew;
      return game.nearest?.id === "alux_kin" && store.getState().hud.prompt?.kind === "talk";
    }), "Kin's talk prompt");
    await interact();
    await waitFor(() => page.evaluate(() => {
      const { active, sitId } = window.__ew.store.getState().conv;
      return active && sitId === "x02-alux-kin";
    }), "real Kin conversation");
    const convo = page.locator(".convo");
    await visible(convo, "Kin's conversation panel");
    const intro = convo.locator(".scene-intro").getByRole("button", { name: ui.start, exact: true });
    if (await intro.isVisible()) await press(intro);
    const head = convo.locator(".convo-head");
    const ipa = head.getByRole("button", { name: "IPA", exact: true });
    assert.equal(await ipa.getAttribute("aria-pressed"), String(ipaBefore));
    assert.equal(await head.getByRole("button", { name: ui.lang, exact: true }).getAttribute("aria-pressed"), String((await settings()).lt));
    if (change) {
      await press(ipa);
      assert.equal(await ipa.getAttribute("aria-pressed"), "true");
      await checkSettings(true, true, true);
    }
    await press(head.getByRole("button", { name: ui.conversationEnd, exact: true }));
    await waitFor(() => page.evaluate(() => !window.__ew.store.getState().conv.active), "conversation closes");
  }
  if (primary) await talkToKin(false, true);

  await place(-6.4, -24.5, -Math.PI / 2);
  await waitFor(() => page.evaluate((again) => {
    const { store, game, audio } = window.__ew;
    const { cave, prompt } = store.getState().hud;
    return game.zoneId === "gruta" && audio.ready && game.cave?.pool.has("agua_01")
      && game.cave.replay === again && cave?.n === 1 && (again || cave.open === 1)
      && cave.lit === 0 && prompt?.kind === "listen" && game.nearest?.id === "agua-1";
  }, replayRound), "agua-1's actual listen prompt");

  // Observe the real owners of playback and of the deferred quest completion.
  await page.evaluate((title) => {
    const { audio, store, game } = window.__ew;
    const observations = window.__stoneObservations = { plays: [], completion: [], toasts: [], clicks: 0 };
    const play = audio.play;
    audio.play = function (voice, speed, text, options) {
      const g = store.getState().hud.glyph;
      if (g?.text !== text) return play.call(this, voice, speed, text, options);
      const entry = { voice, speed, text, result: null, settled: null };
      observations.plays.push(entry);
      return play.call(this, voice, speed, text, options).then((result) => {
        Object.assign(entry, { result, settled: Date.now() });
        return result;
      });
    };
    for (const action of ["after", "afterAgain"]) {
      const complete = game.cave[action];
      game.cave[action] = function (...args) {
        observations.completion.push(action);
        return complete.apply(this, args);
      };
    }
    const unwatch = store.subscribe(({ toasts, townToasts }) => {
      for (const t of [...toasts, ...townToasts.map(({ toast }) => toast)]) {
        if (t.title === title && !observations.toasts.includes(t.id)) observations.toasts.push(t.id);
      }
    });
    window.addEventListener("pagehide", unwatch, { once: true });
  }, ui.lit);
  const observe = () => page.evaluate(() => window.__stoneObservations);
  const snapshot = () => page.evaluate(() => {
    const { game, store } = window.__ew;
    const { hud, conv, progress } = store.getState();
    return { zone: game.zoneId, location: game.player.root.position.toArray(), cave: progress.cave, phrases: progress.phrases,
      relit: [...game.cave.relit], panel: hud.panel, talking: conv.active };
  });

  await interact();
  const first = await waitFor(glyph, "glyph opens", { frames: 0 });
  const card = page.locator(".glyph-card");
  const read = card.locator(".glyph-text");
  const save = card.locator(".phrase-save-row > [data-phrase-save]");
  const options = card.locator(".glyph-opt");
  const play = card.locator(".glyph-play");
  const cross = card.locator(".glyph-x");
  const translation = card.getByRole("button", { name: ui.lang, exact: true });
  const ipa = card.getByRole("button", { name: "IPA", exact: true });
  await visible(card, "native glyph dialog");
  assert.equal(await page.locator(".glyph-veil[open]").getAttribute("aria-label"), ui.stone);
  assert.deepEqual([first.id, first.text, first.lt, first.shown, first.solved, first.wrong, first.mic],
    ["agua-1", expected.en, expected.lt, false, false, [], "unsupported"]);
  assert.equal(first.s?.say, expected.units ? expected.en : undefined);
  assert.deepEqual(first.s?.units.map((unit) => unit.en), expected.units);
  assert.equal(await read.count(), 0);
  assert.equal(await save.count(), 0);
  assert.equal(await translation.getAttribute("aria-pressed"), "true");
  assert.equal(await ipa.getAttribute("aria-pressed"), String(primary));
  assert.equal(await options.count(), 3);
  assert.equal(new Set(await options.locator("span").allTextContents()).size, 3);
  assert.equal(await options.nth(first.answer).locator("span").textContent(), expected.lt);
  assert.equal(await options.nth(first.answer).getAttribute("lang"), learner);
  for (const button of [play, cross, ipa, translation, ...await options.all()]) await cardCentre(button, 44);
  await mark("hidden");

  const targetText = () => expected.units ? read.locator(".u > .en").evaluateAll((words) => words.map((word) =>
    [...word.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent).join("")).join(" "))
    : read.locator(".stone-phrase-target").textContent();
  const natural = read.locator(".nat");
  async function checkIpaElements(on) {
    assert.equal(await ipa.getAttribute("aria-pressed"), String(on));
    const sounds = read.locator(".ipa");
    if (!on) {
      assert.equal(await sounds.count(), 0);
      return;
    }
    const soundsExpected = await page.evaluate(async ({ en, units }) => (await import("/src/convo/ipa.ts"))
      .ipaForSentence(units, en), expected);
    assert(soundsExpected.every((sound) => sound.trim()));
    if (!(await glyph()).solved) {
      assert.equal(await sounds.textContent(), soundsExpected.join(" "));
      return;
    }
    const unitSounds = await read.locator(".u").evaluateAll((units) => units.map((unit) => {
      const word = unit.querySelector(".en").getBoundingClientRect();
      const ipa = unit.querySelector(".ipa");
      const box = ipa.getBoundingClientRect();
      return { text: ipa.textContent.trim(),
        below: box.top >= word.bottom - 1 && box.right > word.left && box.left < word.right && box.width > 0 && box.height > 0 };
    }));
    assert.deepEqual(unitSounds, soundsExpected.map((text) => ({ text, below: true })));
  }

  if (primary) {
    await press(card.locator(".glyph-show"), 44);
    const wrong = (first.answer + 1) % 3;
    const count = (await observe()).plays.length;
    async function assertUnsolved() {
      assert.equal(await read.locator(".stone-phrase-target").textContent(), expected.en);
      assert.equal(await read.getAttribute("lang"), "es");
      assert.equal(await read.locator(".lt, .nat").count(), 0, "revealed text leaves the meaning to the quiz");
      assert.deepEqual(await options.locator("span").allTextContents(), first.options);
      assert.equal(await options.nth(first.answer).getAttribute("aria-pressed"), null);
      assert.equal(await options.nth(first.answer).getAttribute("class"), "glyph-opt");
      assert.equal((await glyph()).solved, false);
    }
    await assertUnsolved();
    await checkIpaElements(true);
    await press(options.nth(wrong), 44);
    assert.deepEqual((await glyph()).wrong, [wrong]);
    assert(await options.nth(wrong).isDisabled());
    await assertUnsolved();
    await mark("reveal-and-wrong");
    await waitFor(async () => (await observe()).plays.length === count + 1, "wrong answer replays the same cue", { frames: 0, timeout: 2500 });
    assert.equal((await observe()).plays.at(-1).text, expected.en);
    const toggleIpa = () => phone ? press(ipa, 44) : page.keyboard.press("i");
    const toggleTranslation = () => phone ? press(translation, 44) : page.keyboard.press("l");
    await toggleIpa();
    await checkIpaElements(false);
    await checkSettings(true, true, false);
    await toggleTranslation();
    await checkSettings(false, true, false);
    await toggleTranslation();
    await checkSettings(true, true, false);
    await toggleIpa();
    await checkIpaElements(true);
  }
  const beforeSolve = await snapshot();
  assert.deepEqual(beforeSolve.cave.passed, replayRound ? ["kin", "nikte"] : ["kin"]);
  assert.deepEqual(beforeSolve.cave.lit, replayRound ? treeSeed.cave.lit : []);
  assert.deepEqual(beforeSolve.cave.heard, []);
  const gameTime = () => page.evaluate(() => window.__ew.game.t);
  const startGame = await gameTime();
  await press(options.nth(first.answer), 44);
  const nativeStart = await page.evaluate(() => Date.now());
  const start = performance.now();
  const learned = await snapshot();
  const lineId = replayRound ? "agua_40" : "agua_01";
  assert.deepEqual(learned.cave.lit, replayRound ? treeSeed.cave.lit : ["agua-1"]);
  assert.deepEqual(learned.cave.heard, expected.units ? [lineId] : []);
  if (expected.units) {
    const { en, lt, sitId, count } = learned.phrases[`x04-yaxche:${lineId}`];
    assert.deepEqual([en, lt, sitId, count], [expected.en, expected.lt, expected.situationId, 1]);
  } else assert.deepEqual(learned.phrases, beforeSolve.phrases);
  if (replayRound) assert.deepEqual(learned.relit, ["agua-1"]);
  assert.deepEqual(await matching(run, expected.en), [], "learning and saving use separate stores");
  await visible(read, "solved reading");
  const original = await card.elementHandle();
  const originalReading = await read.elementHandle();
  async function checkSolved() {
    const g = await glyph();
    assert.deepEqual([g?.id, g?.opening, g?.text, g?.lt, g?.shown, g?.solved, g?.mic],
      [first.id, first.opening, expected.en, expected.lt, true, true, first.mic]);
    assert(await original.evaluate((node) => node === document.querySelector(".glyph-card.solved")));
    assert(await originalReading.evaluate((node) => node === document.querySelector(".glyph-card.solved .glyph-text")));
    assert.equal(await options.count(), 0);
    assert.equal(await targetText(), expected.en);
    assert.equal(await read.getAttribute("lang"), "es");
    if (expected.units) {
      const glosses = await read.locator(`.u > .lt[lang="${learner}"]`).allTextContents();
      assert.deepEqual(glosses, (await settings()).lt ? expected.gloss : []);
    }
    if ((await settings()).lt && (await settings()).ltNatural) {
      assert.equal(await natural.textContent(), expected.lt);
      assert.equal(await natural.getAttribute("lang"), learner);
    } else assert.equal(await natural.count(), 0);
    assert.deepEqual((await observe()).completion, [], "reading never resolves the pending follow-up");
    assert.deepEqual((await observe()).toasts, []);
    await noHorizontalClip(card);
    assert(await read.evaluate((el) => {
      const reading = el.getBoundingClientRect();
      const card = el.closest(".glyph-card").getBoundingClientRect();
      return card.left >= 15 && card.right <= innerWidth - 15 && card.top >= 15 && card.bottom <= innerHeight - 15
        && reading.top >= card.top && reading.bottom <= card.bottom;
    }), "the full reading fits inside the inset card");
    return Promise.all([play, cross, save, ipa, translation].map((action) => cardCentre(action, 44)));
  }
  const geometry = await checkSolved();
  await mark("solved");

  let elapsedFrames = 0;
  const advanceTo = async (end) => {
    while (elapsedFrames < end) {
      const batch = Math.min(5, end - elapsedFrames);
      elapsedFrames += batch;
      await delay(Math.max(0, start + elapsedFrames * 50 - performance.now()));
      await step(batch);
    }
  };
  for (const at of primary ? [34, 85, 601] : mode === "starter" || mode === "empty" ? [35] : []) {
    await advanceTo(at);
    if (at >= 600) {
      assert(await page.evaluate(() => Date.now()) - nativeStart >= 30_000, "native timer elapsed at least 30 seconds");
      assert((await gameTime()) - startGame >= 30, "game elapsed at least 30 seconds");
    }
    assert.deepEqual(await checkSolved(), geometry);
    await checkIpaElements(primary);
    await mark(`solved-F${elapsedFrames}`);
  }

  const voice = () => page.evaluate(() => window.__ew.voice());
  async function beginReplay(key = false) {
    const index = (await observe()).plays.length;
    if (key) await page.keyboard.press("r");
    else await press(play, 44);
    const call = await waitFor(async () => (await observe()).plays[index], "audio.play sees replay", { frames: 0 });
    assert.deepEqual([call.voice, call.speed, call.text], [coach, 1, expected.en]);
    return index;
  }
  async function finishReplay(index) {
    return waitFor(async () => {
      const play = (await observe()).plays[index];
      return play.settled !== null && play;
    }, "audio.play settles", { frames: 0 });
  }
  const playable = primary || replayRound || mode === "starter";
  for (const key of primary && !phone ? [false, true] : [false]) {
    const index = await beginReplay(key);
    if (playable) {
      await waitFor(async () => await voice() === "playing", "local fixture is playing", { frames: 0 });
      assert.equal((await observe()).plays[index].settled, null);
      await checkSolved();
      await mark(key ? "playing-R" : "playing-button");
    }
    const played = await finishReplay(index);
    assert.equal(played.result, playable);
    if (mode !== "empty") assert(run.requests.includes(`/audio-es/${clipKey(expected.en)}.mp3`));
    await delay(880);
    assert(await page.evaluate(() => Date.now()) - played.settled > 800);
    await step(2);
    await checkSolved();
    await mark("after-replay");
  }

  if (primary && !phone) {
    await page.keyboard.press("Tab");
    assert(await card.evaluate((el) => el.contains(document.activeElement) && document.activeElement.matches("button")));
    await page.keyboard.press("n");
    await checkSettings(true, false, true);
    await checkSolved();
    await page.keyboard.press("n");
    await press(read.locator(".u > .en").nth(1));
    await visible(page.locator(".glyph-veil .wpop"), "word popover in the dialog");
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".wpop").count(), 0);
    await checkSolved();
  }

  if (replayRound) {
    await checkSettings(true, false, false);
    const star = card.locator(".nat-star");
    await press(star);
    await visible(page.locator(".glyph-veil .nat-tipbox:visible"), "natural translation popover in the dialog");
    assert.equal(await page.locator(".glyph-veil .nat-tipbox:visible").textContent(), expected.lt);
    if (phone) await press(star);
    else await page.keyboard.press("Escape");
    assert.equal(await page.locator(".nat-tipbox:visible").count(), 0);
    await checkSolved();
  }
  const kept = await saveTwice(run, save, expected, { invariant: async () => {
    await checkSolved();
    assert.deepEqual(await snapshot(), learned, "a save leaves cave and input state alone");
  } });

  if (primary) {
    if (phone) await press(ipa, 44); else await page.keyboard.press("i");
    await checkSettings(true, true, false);
    await checkIpaElements(false);
    if (phone) await press(translation, 44); else await page.keyboard.press("l");
    await checkSettings(false, true, false);
    await checkSolved();
    const inside = await cardCentre(card.locator("h2"));
    await run.click(inside.x, inside.y);
    await checkSolved();
    assert.deepEqual(await snapshot(), learned);
    await mark("inside-tap");

    const outside = await page.evaluate(() => {
      const veil = document.querySelector(".glyph-veil");
      for (const control of document.querySelectorAll(".toolbar .ride-menu, .toolbar button, .minimap, .jump-btn")) {
        const rect = control.getBoundingClientRect();
        const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
        if (rect.width && rect.height && getComputedStyle(control).visibility === "visible" && document.elementFromPoint(x, y) === veil) {
          control.addEventListener("click", () => window.__stoneObservations.clicks++);
          return { x, y };
        }
      }
      return null;
    });
    assert.ok(outside, "backdrop intercepts a centre over an actual town control");
    if (phone) {
      const touch = await run.context.newCDPSession(page);
      const send = (type, point) => touch.send("Input.dispatchTouchEvent", { type, touchPoints: point ? [{ ...point, id: 1 }] : [] });
      try {
        await send("touchStart", outside);
        await send("touchCancel");
        await checkSolved();
        await send("touchStart", outside);
        await send("touchMove", inside);
        await send("touchEnd");
      } finally { await touch.detach(); }
    } else {
      await page.mouse.move(outside.x, outside.y);
      await page.mouse.down();
      await page.mouse.move(inside.x, inside.y, { steps: 4 });
      await page.mouse.up();
      await checkSolved();
      await page.mouse.move(inside.x, inside.y);
      await page.mouse.down();
      await page.mouse.move(outside.x, outside.y, { steps: 4 });
      await page.mouse.up();
    }
    await checkSolved();
    await mark("canceled-and-mismatched");

    const word = read.locator(".u > .en").nth(1);
    if (phone) {
      await word.evaluate((el) => getSelection().selectAllChildren(el));
    } else {
      const { x, y, width, height } = await word.evaluate((el) => {
        const range = document.createRange();
        range.selectNodeContents(el);
        return range.getBoundingClientRect().toJSON();
      });
      await page.mouse.move(x + 1, y + height / 2);
      await page.mouse.down();
      await page.mouse.move(x + width - 1, y + height / 2, { steps: 5 });
      await page.mouse.up();
    }
    await checkSolved();
    assert.equal(await page.locator(".wpop").count(), 0, "selecting text leaves the word popover closed");
    await mark("text-selection");
    assert(await word.evaluate((el) => {
      const selection = getSelection();
      return selection?.rangeCount === 1 && !selection.isCollapsed && !!selection.toString().trim()
        && el.contains(selection.anchorNode) && el.contains(selection.focusNode);
    }), "displayed Spanish has a noncollapsed selection immediately before the outside input");
    await run.click(outside.x, outside.y);
    assert.equal(await glyph(), null, "the first outside input dismisses the opening with text selected");
    assert.equal((await observe()).clicks, 0, "dismissal does not click the underlying control");
  } else if (mode === "starter") {
    const index = await beginReplay(!phone);
    await waitFor(async () => await voice() === "playing", "playing before explicit close", { frames: 0 });
    if (phone) await press(cross, 44); else await page.keyboard.press("Escape");
    assert.equal((await finishReplay(index)).result, false, "dismissal stops the active recording");
    assert.equal(await voice(), "idle");
  } else if (replayRound && !phone) await page.keyboard.press("Escape");
  else await press(cross, 44);

  assert.equal(await glyph(), null);
  await waitFor(async () => !await card.count(), "the dialog is removed", { frames: 0 });
  assert.deepEqual((await observe()).completion, [replayRound ? "afterAgain" : "after"]);
  assert.equal((await observe()).toasts.length, 1);
  assert.deepEqual(await snapshot(), learned, "closing does not click through, answer again or advance another gate");
  await delay(900);
  await step(12);
  assert.equal(await glyph(), null);
  assert.deepEqual((await observe()).completion, [replayRound ? "afterAgain" : "after"]);
  assert.equal((await observe()).toasts.length, 1);
  assert(await page.evaluate(() => {
    const { cave } = window.__ew.store.getState().hud;
    return cave?.lit === 1 && (window.__ew.game.cave.replay || cave.open === 1);
  }), "the chamber counts exactly one lit stone");
  await mark("explicit-exit");
  if (primary) {
    await talkToKin(false);
    await checkSettings(false, true, false);
  }
  await checkBook(run, [kept]);
  if (primary) await checkSettings(false, true, false);
}

async function scoreReview(run, score, review, item) {
  const select = review.getByRole("combobox");
  await run.visible(select, "score review selector");
  await select.selectOption({ label: item.f });
  const reader = review.locator(".phrase-review-value");
  const helper = review.locator(`small[lang="${learner}"]`);
  const fit = async () => {
    assert.equal(await select.locator("option:checked").textContent(), item.f);
    assert.equal(await reader.getAttribute("aria-hidden"), "true");
    assert.equal(await reader.textContent(), item.f);
    assert.equal(await reader.getAttribute("lang"), "es");
    assert.equal(await helper.textContent(), item.p);
    const lineCounts = [];
    for (const line of [reader, helper]) {
      await run.layout(() => line.scrollIntoViewIfNeeded());
      const count = await line.evaluate((el) => {
        const card = el.closest(".mode-score-card").getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const limit = {
          left: Math.max(card.left, box.left + parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth), 0),
          right: Math.min(card.right, box.right - parseFloat(style.paddingRight) - parseFloat(style.borderRightWidth), innerWidth),
        };
        const range = document.createRange();
        range.selectNodeContents(el);
        const lines = [...range.getClientRects()];
        return style.visibility === "visible" && Number(style.opacity) > 0
          && lines.every((r) => r.width > 0 && r.left >= limit.left - 1 && r.right <= limit.right + 1) ? lines.length : 0;
      });
      assert.ok(count, `selected target and helper render at full width: ${item.f}`);
      lineCounts.push(count);
    }
    await run.layout(() => select.scrollIntoViewIfNeeded());
    await cardCentre(select, 44);
    await noHorizontalClip(score);
    return lineCounts;
  };
  await fit();
  await score.evaluate((el) => { el.style.fontSize = "200%"; });
  try {
    const lines = await fit();
    if (run.phone) assert(lines.some((count) => count > 1), "the longest selected pair wraps at 200% on the phone");
    const actions = await score.locator(".mode-score-actions button").all();
    assert.equal(actions.length, 2);
    for (const action of actions) {
      await run.layout(() => action.scrollIntoViewIfNeeded());
      await cardCentre(action, 44);
    }
    await run.mark("review-200-percent");
  } finally { await score.evaluate((el) => el.style.removeProperty("font-size")); }
}

async function checkGateScore(run, mode) {
  const road = mode === "road";
  const { page, phone, waitFor, step, press, mark } = run;
  const read = () => page.evaluate((road) => road ? window.__ew.road.state() : window.__ew.sea?.(), road);
  const state = (predicate, description) => waitFor(async () => {
    const value = await read();
    return value && predicate(value) && value;
  }, description, { frames: 4 });
  const overlay = page.locator(`.${mode}-overlay`);
  const score = overlay.locator(".mode-score-card");
  const choice = overlay.locator('[data-way="phrases"]');
  const cue = overlay.locator(".road-question strong");

  async function throttle(action) {
    if (road && phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    else await page.keyboard.down("ArrowUp");
    try { await action(); }
    finally {
      if (road && phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
      else await page.keyboard.up("ArrowUp");
    }
  }

  if (road) {
    const drive = page.locator(".prompt").getByText(ui.drive, { exact: true });
    await run.visible(drive, "parked van drive prompt", 4);
    await press(drive);
    await waitFor(() => page.evaluate(() => window.__ew.game.rides.phase === "on" && !!window.__ew.game.rides.riding), "van boarding");
    await page.evaluate(() => {
      const { game } = window.__ew;
      game.rides.resetPosition(game.rides.riding, { x: -1.65, z: 53, rot: 0 });
    });
    await step(24);
    await state((s) => s.ready, "road ready at Calle Ceiba");
  } else {
    if ((await read())?.town?.phase !== "on") {
      await throttle(() => waitFor(() => page.evaluate(() => {
        const { game, store } = window.__ew;
        return game.swimming && game.nearest?.id === "lancha-afloat-3" && store.getState().hud.prompt?.kind === "boat";
      }), "green lancha boarding prompt", { frames: 4 }));
      if (phone) await press(page.locator(".act-btn"));
      else await page.keyboard.press("e");
      await state((s) => s.town?.phase === "on", "aboard the green lancha");
    }
    const launch = await state((s) => s.ready, "open water ready");
    assert.equal(await page.evaluate(([x, z]) => window.__ew.seaPlaceBoat(x, z), [launch.town.x, launch.edge + 34]), true);
  }
  await throttle(() => state((s) => s.phase === "briefing", "physical crossing enters the gate menu"));
  await run.visible(choice, "phrase choice", 2);
  await mark("briefing");

  async function gate(number) {
    const current = await state((s) => s.phase === "drive" && s.totalGates === number && s.gates?.length === 3, `gate ${number + 1}`);
    const item = phraseByClip.get(current.phrasePrompt?.pClip);
    assert.ok(item, `the gate uses an active-layer ${learner} prompt recording`);
    assert.equal(current.phrasePrompt.p, item.p);
    assert.equal(current.gates[current.right], item.f);
    // Sea can publish the gate while its crossing title still owns the question slot.
    await waitFor(async () => await cue.isVisible() && await cue.textContent() === item.p,
      `gate ${number + 1} gives its cue after the scene title`, { frames: 4 });
    assert.deepEqual(await overlay.locator(".road-gates .road-gate").evaluateAll((els) =>
      els.map((el) => el.getAttribute("aria-label"))), current.gates);
    return { current, item };
  }

  async function cross({ current, item }, correct) {
    const from = run.requests.length;
    assert.equal(await page.evaluate(([road, correct]) => road
      ? window.__ew.road.forceGate(correct) : window.__ew.seaForceGate(correct), [road, correct]), true);
    const after = await state((s) => s.totalGates === current.totalGates + 1, "crosses exactly one answer line");
    assert.equal(after.rightGates, current.rightGates + Number(correct));
    await waitFor(async () => run.requests.slice(from).includes(`/audio-es/${item.fClip}`), "Spanish response recording requested");
    assert.equal(await overlay.locator(".road-karaoke").textContent(), item.f);
  }

  async function result(total, right) {
    await page.evaluate((road) => road ? window.__ew.road.jumpTimer() : window.__ew.seaTimer(), road);
    const stateAtResult = await state((s) => s.phase === "result", "ends through the timer hook");
    assert.deepEqual([stateAtResult.result.total, stateAtResult.result.right], [total, right]);
    await run.visible(score, "real score card");
    await score.evaluate((el) => Promise.allSettled(el.getAnimations().map((animation) => animation.finished)));
    return stateAtResult.result;
  }
  const asCard = (item) => ({ en: item.f, lt: item.p, situationId: "", sourceLabel: ui[mode] });
  const firstClip = run.requests.length;
  await press(choice);
  const first = await gate(0);
  await waitFor(() => run.requests.slice(firstClip).includes(`/audio-es/${first.item.pClip}`), "learner prompt clip", { frames: 0 });
  await mark("first-cue");
  await cross(first, true);
  const miss = await gate(1);
  assert.notEqual(miss.item.id, first.item.id);
  await cross(miss, false);
  const earned = asCard(first.item), missed = asCard(miss.item);
  const stats = await result(2, 1);
  assert.equal(stats.cards, 1, "exactly the independently earned phrase was awarded");
  assert.deepEqual(stats.phrases.map((word) => [word.en, word.lt]), [[earned.en, earned.lt]]);
  assert.deepEqual(stats.missed.map((word) => [word.en, word.lt]), [[missed.en, missed.lt]]);
  const practice = score.locator(".road-practice");
  const misses = score.locator(".road-missed:not(.road-practice)");
  for (const [row, expected] of [[practice, earned], [misses, missed]]) {
    assert.equal(await row.getByRole("combobox").count(), 0, "one item displays without a selector");
    assert.equal(await row.locator('strong[lang="es"]').textContent(), expected.en);
    assert.equal(await row.locator(`span[lang="${learner}"]`).textContent(), `· ${expected.lt}`);
  }
  const review = score.locator(":scope > .phrase-review-row");
  const select = review.getByRole("combobox");
  await run.visible(select, "full set of seen gate options");
  const labels = await select.locator("option").allTextContents();
  assert.deepEqual(labels.slice(0, 3), first.current.gates);
  const alternatives = first.current.gates.filter((en) => ![earned.en, missed.en].includes(en));
  assert(alternatives.length >= 1);
  assert.equal(new Set(first.current.gates.map((en) => phraseByTarget.get(en)?.p)).size, 3);
  for (const option of alternatives) {
    await select.selectOption({ label: option });
    assert.equal(await review.locator(`small[lang="${learner}"]`).textContent(), phraseByTarget.get(option).p);
  }
  const longest = labels.map((label) => phraseByTarget.get(label)).sort((a, b) =>
    b.f.length + b.p.length - a.f.length - a.p.length)[0];
  await scoreReview(run, score, review, longest);
  const selected = await select.inputValue();
  const scoreText = await score.locator("dl").innerText();
  const invariant = async () => {
    const { phase, result } = await read();
    assert.equal(phase, "result");
    assert.deepEqual(result, stats);
    assert.equal(await select.inputValue(), selected);
    assert.equal(await score.locator("dl").innerText(), scoreText);
  };
  const already = await stored(run, earned);
  const keptEarned = await saveTwice(run, practice.locator("[data-phrase-save]"), earned, { already, invariant, label: "earned" });
  const keptMissed = await saveTwice(run, misses.locator("[data-phrase-save]"), missed, { invariant, label: "missed" });
  const alternative = alternatives.sort((a, b) => b.length - a.length)[0];
  await select.selectOption({ label: alternative });
  const optionValue = await select.inputValue();
  const keptAlternative = await saveTwice(run, review.locator("[data-phrase-save]"), asCard(phraseByTarget.get(alternative)), {
    invariant: async () => {
      assert.deepEqual((await read()).result, stats);
      assert.equal(await select.inputValue(), optionValue);
    },
    label: "board-alternative",
  });
  const actions = score.locator(".mode-score-actions");
  const again = actions.getByRole("button", { name: ui.again, exact: true });
  await run.layout(() => again.scrollIntoViewIfNeeded());
  await press(again, 44);
  await state((s) => s.phase === "briefing" && !s.result, "Again clears the previous result");
  await run.visible(choice, "retry phrase choice", 4);
  await press(choice);
  const retry = await gate(0);
  assert.notDeepEqual(retry.current.gates, first.current.gates, "retry sees a fresh board");
  await cross(retry, false);
  const retryResult = await result(1, 0);
  assert.equal(retryResult.cards, 0);
  assert.equal(await practice.count(), 0);
  await waitFor(async () => {
    const listed = await select.locator("option").allTextContents();
    return listed.length && retry.current.gates.every((en, i) => listed[i] === en);
  }, "retry review starts with the retry board", { frames: 0 });
  const done = actions.getByRole("button", { name: road ? ui.roadDone : ui.seaDone, exact: true });
  await run.layout(() => done.scrollIntoViewIfNeeded());
  await press(done, 44);
  await state((s) => s.phase === "town", "Done returns to town");
  await mark("returned-to-town");
  await checkBook(run, [keptEarned, keptMissed, keptAlternative]);
}

const streetTable = pc && lt ? (await json("../../src/editions/es-lt/tables/street.json")).text : null;

async function checkWallet(run) {
  const { page, waitFor, press, mark } = run;
  const { reward, reply } = await page.evaluate(async (table) => {
    const { STREET_MOMENTS } = await import("/src/content/street.ts");
    const moment = STREET_MOMENTS.find(({ id }) => id === "i_dropped");
    const cast = moment.cast.find(({ id }) => id === "a");
    const byCast = (value) => value?.byCast?.a ?? value;
    const text = (source) => (table?.[source] ?? source)
      .replace(/\{(m|nm):([^{}|]*)\|(?:f|nf):([^{}|]*)\}/g,
        (_, who, male, female) => who === "nm" && cast.gender === "m" ? male : female);
    const line = ({ en, lt }) => ({ en, lt: text(lt), situationId: "street", sourceLabel: text(cast.role) });
    const final = moment.first.then;
    return { reward: line(byCast(moment.first.card)), reply: line(byCast(final.choices[0].reply ?? final.reply).at(-1)) };
  }, streetTable);
  if (pc) {
    assert.deepEqual([reward.en, reward.lt, reply.en, reply.lt],
      ["¡Se le cayó la cartera!", lt ? "Jums iškrito piniginė!" : "You dropped your wallet!",
        "¡Igualmente! ¡Gracias otra vez!", lt ? "Ir Jums! Dar kartą ačiū!" : "You too! Thanks again!"]);
  }
  const cardSelector = 'section.street-card[data-moment="i_dropped"][data-cast="a"][data-script="first"]';
  const card = page.locator(cardSelector);
  const current = card.locator(".street-current");
  const rewardRow = card.locator("[data-street-reward]");
  const targetOf = (row) => row.locator(".kit-gloss-compact > span");
  const currentTarget = targetOf(current);
  const street = () => page.evaluate(() => window.__ew.game.streetState());
  assert.equal(await page.evaluate(() => window.__ew.game.streetNow("i_dropped", "a")), true);
  for (const exchange of [0, 1]) {
    const button = page.locator(`${cardSelector}[data-step="choices"][data-exchange="${exchange}"] .street-choice`).first();
    // A missing choice must return immediately so the poll can advance the encounter.
    await run.visible(button, `wallet exchange ${exchange}`, 2);
    await run.layout(() => press(button));
  }
  const closingTarget = currentTarget.and(page.getByText(reply.en, { exact: true }));
  await waitFor(async () => await rewardRow.isVisible() && await closingTarget.isVisible(),
    "closing reply exposes the pre-award reward");
  assert.equal(await card.getAttribute("data-step"), "reply");
  assert.equal(await currentTarget.textContent(), reply.en);
  assert.equal(await targetOf(rewardRow).textContent(), reward.en);
  assert.equal(await rewardRow.locator(`small[lang="${learner}"]`).textContent(), reward.lt);
  const beforeAward = await street();
  assert.equal(beforeAward.memory.i_dropped.helped, 0);
  const keptReward = await saveTwice(run, rewardRow.locator("[data-phrase-save]"), reward, {
    invariant: async () => assert.deepEqual(await street(), beforeAward),
    label: "wallet-reward",
  });
  await page.evaluate(() => {
    const { game } = window.__ew;
    const actor = game.streetLife.active.actor.person.root;
    window.__walletActor = { actor, start: actor.position.clone() };
  });
  await waitFor(() => page.locator(`${cardSelector}[data-step="done"]`).isVisible(), "wallet reaches done");
  assert.deepEqual([(await street()).memory.i_dropped.seen, (await street()).memory.i_dropped.helped], [1, 1]);
  assert.equal(await currentTarget.textContent(), reply.en);
  const replyButton = current.locator(".street-line");
  assert.equal(await replyButton.getAttribute("aria-expanded"), "false", "the closing reply stays untranslated until clicked");
  await press(replyButton);
  assert.equal(await current.locator(`.street-tr[lang="${learner}"]`).textContent(), reply.lt);
  const atEnd = await street();
  const keptReply = await saveTwice(run, current.locator("[data-phrase-save]"), reply, {
    invariant: async () => assert.deepEqual(await street(), atEnd),
    label: "wallet-reply-done",
  });
  await waitFor(async () => !(await street()).active && !await card.count(), "completed encounter departs");
  await waitFor(() => page.evaluate(() => {
    const { actor, start } = window.__walletActor;
    return !actor.parent || actor.position.distanceTo(start) > 0.1;
  }), "the wallet owner moves away");
  assert.deepEqual([(await street()).memory.i_dropped.seen, (await street()).memory.i_dropped.helped], [1, 1]);
  await stored(run, reward, keptReward);
  await stored(run, reply, keptReply);
  await mark("wallet-departed");
  await checkBook(run, [keptReward, keptReply]);
}

async function main() {
  if (shots) await mkdir(shots, { recursive: true });
  const { chromium } = await import(env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({
    channel: env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
    args: process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const cases = [
    ...(pc ? [
      ["glyph", { seed: { ...caveSeed, settings: { ...caveSeed.settings, scenes: true } }, manifest: authoredClips }, (run) => checkGlyph(run, "authored")],
      ["glyph-unplayable", { seed: caveSeed, manifest: authoredClips, missing: `/audio-es/${clipKey(water.en)}.mp3` }, (run) => checkGlyph(run, "missing")],
      ["glyph-starter-only", { seed: caveSeed, manifest: manifestFor(starter.en, "¡Buenas!", "Sí, por favor.") }, (run) => checkGlyph(run, "starter")],
      ["glyph-empty-manifest", { seed: caveSeed }, (run) => checkGlyph(run, "empty")],
      ["glyph-after-again", { seed: treeSeed, manifest: manifestFor(replayWater.en, "Las raíces beben en silencio.") }, (run) => checkGlyph(run, "again")],
      ["road", { spawn: { x: -88, z: -13.65, rot: 0 } }, (run) => checkGateScore(run, "road")],
      ["sea", { spawn: { x: 42, z: -73.8, rot: Math.PI } }, (run) => checkGateScore(run, "sea")],
    ] : []),
    ["wallet", {}, checkWallet],
  ];
  try {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      for (const [name, options, check] of cases) {
        try { await withTown(browser, viewport, name, options, check); }
        catch (error) {
          console.error(error);
          process.exitCode = 1;
        }
      }
    }
  } finally { await browser.close(); }
}

await main();
