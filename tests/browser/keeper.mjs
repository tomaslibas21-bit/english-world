// WORLD_TEST_URL=http://127.0.0.1:5188 node tests/browser/keeper.mjs [--shots=dir]
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { silence } from "./radio-fixtures.mjs";
import { openPhoneMenu } from "./screen-harness.mjs";

const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:5188");
const storage = `${process.env.WORLD_STORAGE || "english-world"}-progress-v1`;
const shots = process.argv.find((arg) => arg.startsWith("--shots="))?.slice(8) ?? process.env.WORLD_SHOTS;
const sit = "x05-lighthouse-keeper";
const keeper = "lighthouse_keeper";
const course = "s73-restaurant";
const title = { en: "A Visit to the Lighthouse", lt: "Viešnagė švyturyje" };
const invite = "Pasikalbėti su prižiūrėtoju";
const welcome = { en: "Hello. Have a seat by the door.", lt: "Sveiki. Prisėskite prie durų." };
const welcomeBack = { en: "Hello again. Have a seat.", lt: "Sveiki dar kartą. Prisėskite." };
const views = [
  { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  { viewport: { width: 1280, height: 800 } },
];
const turns = [
  { step: "life", answers: [
    { id: "k_home", en: "Do you live on the island?", lt: "Ar gyvenate saloje?", reply: "This cottage is my home all year." },
    { id: "k_company", en: "Is it quiet here?", lt: "Ar čia tylu?", reply: "It's quiet until the gulls wake me. They never miss a morning." },
  ] },
  { step: "light", answers: [
    { id: "k_turn", en: "Does the light turn?", lt: "Ar šviesa sukasi?", reply: "The light turns slowly, so people on boats see a flash." },
    { id: "k_boats", en: "How does it help boats?", lt: "Kaip šviesa padeda laivams?", reply: "People on boats see the flash. It shows them where the rocks are.", voice: true },
  ] },
  { step: "routine", answers: [
    { id: "k_morning", en: "What do you do every morning?", lt: "Ką darote kiekvieną rytą?", reply: "I clean the glass every morning. I check the light before dark." },
    { id: "k_night", en: "What do you do before dark?", lt: "Ką darote prieš sutemstant?", reply: "I check the light before dark. I clean the glass every morning." },
  ] },
  { step: "storm", answers: [
    { id: "k_stay", en: "Where did you stay?", lt: "Kur likote per audrą?", reply: "I stayed inside. I checked the light again and again." },
    { id: "k_light_on", en: "Did the light stay on?", lt: "Ar šviesa neužgeso?", reply: "Yes. I could still see the flash through the rain.", voice: true },
  ] },
  { step: "gift", answers: [
    { id: "k_keep", en: "I'll keep it, thanks.", lt: "Pasiliksiu, ačiū.", reply: "Here you go. I hope you like it." },
    { id: "k_draw", en: "Did you draw it yourself? I'll take it, thanks.", lt: "Ar pats nupiešėte? Paimsiu, ačiū.", reply: "I did. Here, it's yours." },
  ] },
];
const ambientKeys = ["6337b7841ed7", "e55021eb2ae8"];
const welcomeKey = "27c1d6d430a7";
const localManifest = JSON.parse(await readFile(new URL("../../public/audio-v2/manifest.json", import.meta.url), "utf8"));
// Use the existing staff clips' manifest entries. All x05 additions stay absent even after recordings ship.
const manifest = Object.fromEntries(ambientKeys.map((key) => {
  assert(localManifest[key] > 0, `Missing local fixture entry ${key}`);
  return [key, localManifest[key]];
}));
const silentClip = silence(0.1);
const normal = 15_000;
const boot = 120_000;
const batch = 5;
const frameMs = 1000 / 60;

function returning(pictures) {
  return {
    version: 1,
    profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1",
      look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
    settings: { v: 6, play: "town", quality: "low", scenes: pictures, volume: 0, sounds: 0, cameraFollow: false,
      lt: true, ltNatural: true, sayLt: true, sayIpa: false, confirmSpeech: true, phoneCalls: false, textMessages: false },
    sits: {}, phrases: {}, seenIntro: {}, started: 1, objective: course,
    place: { zone: "town", x: -6.5, z: -64, rot: Math.PI },
    coach: { done: true, run: true, view: true, seen: { list: true } },
  };
}

function install({ key, progress, speech }) {
  if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(progress));
  sessionStorage.setItem("ew-play-now", "1");

  let now = 1000, nextFrame = 0;
  const frames = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__step = (count, dt = 1000 / 60) => {
    for (let i = 0; i < count; i++) {
      now += dt;
      for (const id of [...frames.keys()]) {
        const callback = frames.get(id);
        frames.delete(id);
        callback?.(now);
      }
    }
    return now;
  };

  // No OS/browser speech synthesis service. A missing recording goes through the game's unavailable path.
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  if (!speech) return;
  class Recognition {
    start() { window.__questReader = this; queueMicrotask(() => this.onstart?.()); }
    abort() {
      if (window.__questReader === this) window.__questReader = null;
      queueMicrotask(() => this.onend?.());
    }
    stop() { this.abort(); }
  }
  window.SpeechRecognition = Recognition;
  window.__questSpeak = (text) => {
    const reader = window.__questReader;
    if (!reader?.onresult) return false;
    reader.onspeechstart?.();
    reader.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
    reader.onspeechend?.();
    return true;
  };
}

function observe(page) {
  const errors = [], pictureRequests = [], requests = new Set(), ambient = new Set();
  page.on("pageerror", (error) => errors.push(`pageerror ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(`console.error ${message.text()} ${message.location().url}`);
  });
  page.on("request", (request) => {
    requests.add(request);
    const path = new URL(request.url()).pathname;
    if (path.includes(sit) && path.endsWith(".webp")) pictureRequests.push(path);
  });
  page.on("requestfinished", (request) => requests.delete(request));
  page.on("requestfailed", (request) => {
    requests.delete(request);
    errors.push(`requestfailed ${request.failure()?.errorText} ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`);
  });
  return { errors, pictureRequests, requests, ambient };
}

async function routeFixtures(context, net) {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (path.endsWith("/audio-v2/manifest.json")) return route.fulfill({ json: manifest });
    if (path.endsWith("/audio-v2/repair-versions.json")) return route.fulfill({ json: {} });
    const recording = path.match(/\/([0-9a-f]{12})\.mp3$/)?.[1];
    if (recording) {
      if (!Object.hasOwn(manifest, recording)) return route.abort("blockedbyclient");
      net.ambient.add(recording);
      return route.fulfill({ contentType: "audio/wav", body: silentClip, headers: { "access-control-allow-origin": "*" } });
    }
    if (path.endsWith("/songs/index.json")) return route.fulfill({ json: { songs: [] }, headers: { "access-control-allow-origin": "*" } });
    if (url.origin === base.origin) return route.continue();
    return route.abort("blockedbyclient");
  });
}

const answerName = (en) => `Atsakyti: ${en}`;
const noOverlap = (a, b) => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top;
const inside = (a, b) => a.width > 0 && a.height > 0 && a.left >= b.left - 1
  && a.right <= b.right + 1 && a.top >= b.top - 1 && a.bottom <= b.bottom + 1;

async function visit(context, view, speech) {
  const phone = !!view.hasTouch;
  const mode = speech ? "speech-and-choices" : "choices-no-recognizer";
  const label = `${view.viewport.width}x${view.viewport.height}-${phone ? "touch" : "keys"}-${mode}`;
  const page = await context.newPage();
  const net = observe(page);
  await routeFixtures(context, net);
  await context.addInitScript(install, { key: storage, progress: returning(speech), speech });
  page.setDefaultTimeout(normal);
  const touch = phone ? await context.newCDPSession(page) : null;
  const convo = page.locator(".convo");
  const card = page.locator(`.scn-card[data-sit="${sit}"]`);
  const answers = convo.locator("[data-keeper-answer]");
  const exampleFor = (en) => convo.locator(".gx", { has: page.getByRole("button", { name: answerName(en), exact: true }) });
  const runAnswers = turns.map(({ answers }) => answers[Number(speech)]);
  const branches = runAnswers.map(({ id, voice }) => [id, voice ? "voice" : "picked"]);
  const route = [];
  let stage = "boot", lastTurn = "none";

  const step = (count = batch) => page.evaluate(([n, dt]) => window.__step?.(n, dt), [count, frameMs]);
  async function until(description, predicate, { ms = normal, frames = 1500 } = {}) {
    const deadline = Date.now() + ms;
    for (let n = 0; n < frames && Date.now() < deadline; n += batch) {
      await step();
      if (await predicate()) return;
      await sleep(16);
    }
    assert.fail(`Timed out waiting for ${description} (${ms} ms / ${frames} frames)`);
  }
  const stateWait = (description, predicate, arg, options) => until(description, () => page.evaluate(predicate, arg), options);
  async function withFrames(action, ms = normal) {
    let done = false;
    let pumpError;
    const pump = (async () => {
      const deadline = Date.now() + ms;
      for (let n = 0; !done && n < 1800 && Date.now() < deadline; n += batch) {
        try { await step(); }
        catch (error) {
          if (!/Execution context was destroyed|Cannot find context with specified id/.test(error.message)) {
            pumpError = error;
            return;
          }
        }
        await sleep(16);
      }
    })();
    try {
      const value = await action();
      if (pumpError) throw pumpError;
      return value;
    } finally {
      done = true;
      await pump;
    }
  }
  const press = (locator) => withFrames(() => phone ? locator.tap() : locator.click());
  const shot = (name) => shots && withFrames(() => page.screenshot({
    path: join(shots, `keeper-${label}-${name}.png`), timeout: normal, animations: "disabled",
  }));
  async function visible(locator, description) {
    await until(description, () => locator.first().isVisible());
    assert.equal(await locator.count(), 1, description);
  }
  async function exact(locator, expected) {
    const text = (await locator.innerText()).replace(/\s+/g, " ").trim();
    assert.equal(text, expected);
  }
  async function tool(title) {
    await withFrames(() => openPhoneMenu(page));
    await press(page.locator(`.toolbar button[title="${title}"]`));
  }
  async function picker() {
    await tool("Visos situacijos");
    await visible(page.locator(".sheet.scenarios"), "the town situation picker");
  }
  const closePanel = () => press(page.locator(".overlay .sheet").getByRole("button", { name: "Uždaryti", exact: true }));
  const counts = () => page.evaluate((id) => {
    const { conv, progress } = window.__ew.store.getState();
    return { plays: progress.play?.games?.keeper ?? 0, completions: progress.sits[id]?.completions ?? 0,
      visits: progress.sits[id]?.visits ?? 0, objective: progress.objective, run: conv.run };
  }, sit);
  async function checkCounts(plays, completions, run = plays) {
    assert.deepEqual(await counts(), { plays, completions, visits: plays, objective: course, run });
  }
  const mooring = () => page.evaluate(() => window.__ew.game.rides.islandBoat());
  const position = () => page.evaluate(() => {
    const g = window.__ew.game, { x, y, z } = g.player.root.position;
    return { x, y, z, swimming: g.swimming, riding: g.rides.riding?.id ?? null };
  });

  async function worldAction(prompt, name) {
    await stateWait(`the ${prompt} action`, (kind) => window.__ew.store.getState().hud.prompt?.kind === kind, prompt);
    if (phone) {
      const action = page.locator(".act-btn");
      await visible(action, `the touch action ${name}`);
      await exact(action, name);
      const b = await action.boundingBox();
      assert(b && b.x >= 0 && b.y >= 0 && b.x + b.width <= view.viewport.width && b.y + b.height <= view.viewport.height, JSON.stringify(b));
      await press(action);
    } else {
      const key = page.locator(".prompt kbd");
      await visible(key, "the keyboard interaction hint");
      await exact(key, "E");
      await withFrames(() => page.keyboard.press("e"));
    }
  }

  async function forward(description, predicate) {
    if (!phone) {
      await page.keyboard.down("w");
      try { await stateWait(description, predicate); }
      finally { await page.keyboard.up("w"); }
      return;
    }
    const joystick = page.locator(".joy");
    await visible(joystick, "the on-screen joystick");
    const box = await joystick.boundingBox();
    assert(box && box.width > 96 && box.height > 96, JSON.stringify(box));
    await touch.send("Input.dispatchTouchEvent", {
      type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 - 48 }],
    });
    try { await stateWait(description, predicate); }
    finally { await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }); }
  }

  async function waitBoot() {
    await stateWait("the saved town and its audio manifest", () => {
      const ew = window.__ew;
      return ew?.store.getState().screen === "play" && ew.game.ledges?.ready && ew.audio.ready
        && document.querySelector(".toolbar") && document.fonts.status === "loaded";
    }, undefined, { ms: boot, frames: 9000 });
  }

  async function assertActor(sameActor = false) {
    const found = await page.evaluate((sameActor) => {
      const { game: g, store } = window.__ew;
      const island = g.islandScene, c = store.getState().conv;
      const root = island.keeper.root;
      let copies = 0;
      g.scene.traverseVisible((object) => { if (object.name === "lighthouse-keeper") copies++; });
      const same = !sameActor || window.__keeperActor === island.keeper;
      window.__keeperActor = island.keeper;
      return { active: c.active, host: c.hostId, session: g.activeSession?.active && g.activeSession.sit.id,
        actor: same && g.talkNpc?.ch === island.keeper && g.talkNpc === island.keeperActor && root.visible,
        copies, townCopies: g.npcs.filter((a) => a.id === c.hostId).length, cast: g.talkCast.map((a) => a.id), camera: g.rig.mode,
        fallback: !g.covered && !document.body.classList.contains("scene-on") && !document.querySelector(".scene-backdrop img"),
        zone: g.zone.id, x: g.player.root.position.x, dialog: document.querySelectorAll(".convo").length };
    }, sameActor);
    assert(found.active && found.session === sit && found.host === keeper && found.actor && found.copies === 1 && found.townCopies === 0
      && found.camera === "talk" && found.fallback && found.zone === "town" && found.x > 105 && found.dialog === 1,
    JSON.stringify(found));
    assert.deepEqual(found.cast, [keeper]);
    await visible(page.locator(".stage canvas"), "the live town canvas behind the keeper");
    await stateWait("the keeper's face in the open part of the talk view", () => {
      const g = window.__ew.game, ch = g.islandScene.keeper;
      const face = ch.root.position.clone();
      face.y += ch.height * 0.9;
      face.project(g.rig.cam);
      const { left, top, width, height } = g.renderer.domElement.getBoundingClientRect();
      const x = left + (face.x + 1) * width / 2, y = top + (1 - face.y) * height / 2;
      const panel = document.querySelector(".convo").getBoundingClientRect();
      return face.z > -1 && face.z < 1 && x > left && x < left + width && y > top && y < top + height
        && (x < panel.left || x > panel.right || y < panel.top || y > panel.bottom);
    });
  }

  async function startTalk(greeting, { sameActor = false, introFrame = false } = {}) {
    // The intro has a normal timeout. Exercise its action as soon as it appears.
    const intro = convo.locator(".scene-intro");
    const start = intro.getByRole("button", { name: "Pradėti", exact: true });
    await visible(start, "the keeper intro's Pradėti button");
    await exact(intro.locator("p"), "Prie namelio durų Jus pasitinka švyturio prižiūrėtojas. Šalia stovi suolas.");
    if (introFrame) await shot("intro");
    await press(start);
    await assertActor(sameActor);
    await stateWait(`the keeper says ${greeting.en}`, ({ en, lt }) => window.__ew.store.getState().conv.transcript
      .some((line) => line.who === "npc" && line.sentence?.en === en && line.sentence.nat === lt), greeting);
  }

  async function you(stepId) {
    lastTurn = stepId;
    await stateWait(`you at ${stepId}`, (id) => {
      const { game, store } = window.__ew;
      const c = store.getState().conv;
      return c.active && c.phase === "you" && c.stepId === id && game.activeSession?.conv.effectiveStep()?.id === id;
    }, stepId);
  }

  async function checkChoices(choices) {
    const expected = choices.map(({ en }) => answerName(en)).sort();
    await until("both named answer actions", async () => (await answers.count()) >= 2);
    assert.deepEqual((await answers.evaluateAll((buttons) => buttons.map((b) => b.getAttribute("aria-label")))).sort(), expected);
    for (const name of expected) {
      const action = convo.getByRole("button", { name, exact: true });
      assert(await action.isVisible() && await action.isEnabled(), name);
    }
  }

  async function modelGloss(example, index, en, lt, measure = false) {
    const unit = example.locator(`.il[lang=en] .u[data-i="${index}"]`);
    const english = unit.locator(".en");
    await visible(english, `the English unit ${en}`);
    assert.equal(await english.evaluate((el) => el.firstChild.textContent), en);
    await visible(unit.locator(".lt[lang=lt]"), `the gloss under ${en}`);
    await exact(unit.locator(".lt[lang=lt]"), lt);
    if (!measure) return;
    await withFrames(() => example.locator("[data-keeper-answer]").scrollIntoViewIfNeeded());
    const layout = await unit.evaluate((u) => {
      const c = u.closest(".convo");
      const rect = (el) => el.getBoundingClientRect().toJSON();
      return { en: rect(u.querySelector(".en")), lt: rect(u.querySelector(".lt")),
        actions: [...c.querySelectorAll("[data-keeper-answer]")].map(rect), footer: rect(c.querySelector(".yt-bottom")),
        mic: rect(c.querySelector(".mic")), scroll: rect(c.querySelector(".yt-scroll")),
        viewport: { left: 0, right: innerWidth, top: 0, bottom: innerHeight } };
    });
    const center = (r) => (r.left + r.right) / 2;
    assert(layout.lt.top >= layout.en.bottom - 1 && Math.abs(center(layout.en) - center(layout.lt)) <= 1.5
      && inside(layout.en, layout.scroll) && inside(layout.lt, layout.scroll), JSON.stringify(layout));
    assert(inside(layout.mic, layout.footer) && inside(layout.mic, layout.viewport), JSON.stringify(layout));
    assert.equal(layout.actions.length, 2);
    for (const b of layout.actions) {
      assert(b.width >= 44 && b.height >= 44 && inside(b, layout.viewport) && inside(b, layout.scroll)
        && noOverlap(b, layout.footer) && noOverlap(b, layout.mic), JSON.stringify(layout));
    }
    assert(noOverlap(...layout.actions), JSON.stringify(layout));
  }

  async function speak(en, frame) {
    const readMic = () => page.evaluate(() => ({
      reader: !!window.__questReader?.onresult,
      status: window.__ew.store.getState().conv.mic.status,
    }));
    const listening = (mic) => mic.reader && mic.status === "listening";
    // Give automatic capture time to open, while continuing to step. Tap only if it still needs a start.
    const deadline = Date.now() + 800;
    let capture = await readMic();
    for (let n = 0; !listening(capture) && n < 150 && Date.now() < deadline; n += batch) {
      await step();
      await sleep(25);
      capture = await readMic();
    }
    const mic = convo.locator(".mic");
    await visible(mic, "the microphone action");
    capture = await readMic();
    if (!capture.reader && !["starting", "listening", "reconnecting"].includes(capture.status)) await press(mic);
    await until("an actual recognition reader", async () => listening(await readMic()));
    assert(await page.evaluate((text) => window.__questSpeak(text), en), `speech event for ${en}`);
    const confirm = convo.locator(".miss-box").getByRole("button", { name: en, exact: true });
    if (await page.evaluate(() => window.__ew.store.getState().settings.confirmSpeech)) {
      await visible(confirm, "the speech confirmation action");
      assert.deepEqual(await page.evaluate(() => window.__ew.store.getState().conv.speechChoices), [en]);
      if (frame) {
        await withFrames(() => confirm.scrollIntoViewIfNeeded());
        await shot(frame);
      }
      await press(confirm);
    }
  }

  async function checkReply(index, answer) {
    await stateWait(`the understood ${answer.id} answer and keeper's reply`, ({ index, en, reply, npc, via }) => {
      const lines = window.__ew.store.getState().conv.transcript;
      const learner = lines.filter((line) => line.who === "you")[index];
      return learner?.text === en && learner.via === via && learner.understood
        && lines.some((line) => line.id > learner.id && line.npc === npc && line.who === "npc" && line.sentence?.en === reply);
    }, { index, en: answer.en, reply: answer.reply, npc: keeper, via: answer.voice ? "voice" : "picked" });
    const earned = await page.evaluate((key) => {
      const p = window.__ew.store.getState().progress.phrases[key];
      return p && { en: p.en, lt: p.lt, sitId: p.sitId, count: p.count };
    }, `${sit}:${answer.id}`);
    assert.deepEqual(earned, { en: answer.en, lt: answer.lt, sitId: sit, count: 1 }, `earned phrase ${answer.id}`);
  }

  async function reviewPhrase(answer) {
    await tool("Frazių knygelė");
    const book = page.locator(".sheet").filter({ has: page.getByRole("heading", { name: "Frazių knygelė", exact: true }) });
    await visible(book, "the phrasebook");
    const chapter = book.locator(".chapter").filter({ has: page.getByRole("heading", { name: title.lt, exact: true }) });
    const row = chapter.locator(".hint-row", { has: page.getByText(answer.en, { exact: true }) });
    await visible(row, `the earned phrase ${answer.id} under the keeper source`);
    await exact(row.locator(".nat"), answer.lt);
    await press(row.getByRole("button", { name: "Į korteles", exact: true }));
    await press(book.getByRole("tab", { name: /^Mano kortelės/ }));
    await press(book.getByRole("button", { name: "Kartoti", exact: true }));
    await exact(book.locator(".rv-lt[lang=lt]"), answer.lt);
    await exact(book.locator(".rv-sit"), `· ${title.lt}`);
    await press(book.getByRole("button", { name: "Rodyti atsakymą", exact: true }));
    await exact(book.locator(".rv-en[lang=en]"), answer.en);
    await press(book.getByRole("button", { name: "Mokėjau", exact: true }));
    await closePanel();
  }

  async function replay({ plays, run, boat, cold = false }) {
    await picker();
    await visible(card, "one completed keeper picker card");
    await exact(card.locator("b[lang=lt]"), title.lt);
    await exact(card.locator("i[lang=en]"), title.en);
    await visible(card.locator('.ico svg[data-sit-icon="flame"]'), "the keeper card icon");
    await withFrames(() => card.scrollIntoViewIfNeeded());
    const bounds = await card.evaluate((el) => {
      const rect = (node) => node.getBoundingClientRect().toJSON();
      return { card: rect(el), title: rect(el.querySelector(".txt")), icon: rect(el.querySelector(".ico")),
        body: rect(el.closest(".sheet-body")), viewport: { left: 0, top: 0, right: innerWidth, bottom: innerHeight } };
    });
    assert(inside(bounds.card, bounds.body) && inside(bounds.card, bounds.viewport)
      && inside(bounds.title, bounds.card) && inside(bounds.icon, bounds.card)
      && noOverlap(bounds.title, bounds.icon), JSON.stringify(bounds));
    await shot(cold ? "cold-picker" : "picker");
    await press(card);
    await startTalk(welcomeBack, { sameActor: !cold });
    await you("life");
    await checkCounts(plays, 1, run);
    if (cold) {
      await speak("Goodbye.");
      await visible(convo.locator(".ended-box"), "the early farewell card");
      await exact(convo.locator(".ended-title"), "Pokalbis baigtas");
      assert.equal(await convo.locator(".ended-keepsake").count(), 0);
      assert(await page.evaluate(() => window.__ew.store.getState().conv.transcript
        .some((line) => line.who === "npc" && line.sentence?.en === "Come back anytime.")));
      await press(convo.getByRole("button", { name: "Tęsti", exact: true }));
    } else {
      assert.deepEqual(await mooring(), boat);
      await press(convo.getByRole("button", { name: "Baigti pokalbį", exact: true }));
    }
    await stateWait("the keeper visit closed", () => !window.__ew.store.getState().conv.active && !window.__ew.game.activeSession);
    await checkCounts(plays, 1, run);
    assert.equal(await page.evaluate(() => window.__ew.game.keepsakeKind()), null);
  }

  async function quietResources() {
    await until("outstanding resources", () => net.requests.size === 0);
    assert.deepEqual(net.pictureRequests, [], "no planned x05 WebPs requested");
    assert.deepEqual(net.errors, [], "page, console and network errors");
  }

  try {
    await withFrames(() => page.goto(base.href, { waitUntil: "domcontentloaded", timeout: boot }), boot);
    await waitBoot();
    await stateWait("the island loaded", () => !!window.__ew.game.islandScene);
    await checkCounts(0, 0);
    const spawn = await page.evaluate(() => {
      const { game: g, store, audio } = window.__ew, { x, z } = g.player.root.position;
      return { x, z, yaw: g.heading, town: g.zone.id, settings: store.getState().settings,
        recognizer: !!(window.SpeechRecognition || window.webkitSpeechRecognition),
        ambient: audio.hasClip("g_amb_m", 1, "Not many visitors make it out here. Enjoy the view!"),
        keys: Object.keys(audio.manifest).sort() };
    });
    assert.deepEqual([spawn.x, spawn.z, spawn.yaw, spawn.town], [-6.5, -64, Math.PI, "town"]);
    assert.equal(spawn.recognizer, speech);
    assert(spawn.ambient && !spawn.keys.includes(welcomeKey));
    assert.deepEqual(spawn.keys, [...ambientKeys].sort());
    assert.equal(spawn.settings.play, "town");
    assert.equal(spawn.settings.quality, "low");
    assert.equal(spawn.settings.scenes, speech);
    assert(spawn.settings.lt && spawn.settings.ltNatural && spawn.settings.sayLt && !spawn.settings.phoneCalls);
    await tool("Nustatymai (Esc)");
    // The switch's aria-checked comes from picturesOn(settings), including settings migration.
    const pictures = page.getByRole("switch", { name: "Iliustruotos scenos", exact: true });
    await visible(pictures, "the saved pictures preference");
    assert.equal(await pictures.getAttribute("aria-checked"), String(speech));
    await closePanel();
    await picker();
    assert.equal(await card.count(), 0);
    await closePanel();
    await checkCounts(0, 0);

    stage = "map and boarding";
    const minimap = page.locator(".minimap");
    await visible(minimap, "the town minimap");
    await press(minimap);
    const map = page.locator(".map-wrap");
    const pin = map.getByRole("button", { name: "Lighthouse · Švyturys", exact: true });
    await visible(pin, "one lighthouse pin");
    await press(pin);
    await visible(map.getByRole("heading", { name: "Lighthouse", exact: true }), "one lighthouse heading");
    await visible(map.getByText("Švyturys", { exact: true }), "the map's Švyturys subtitle");
    await visible(map.getByText(title.lt, { exact: true }), "the keeper title in the lighthouse detail");
    await visible(map.getByText("Prie namelio laukia švyturio prižiūrėtojas.", { exact: true }), "the map's keeper description");
    const guide = map.getByRole("button", { name: "Nuvesk mane", exact: true });
    await visible(guide, "one lighthouse guide button");
    await shot("map");
    await press(guide);
    await visible(page.locator(".objective-card").getByRole("heading", { name: "Lighthouse · Švyturys", exact: true }), "the lighthouse objective card");
    assert.equal(await page.evaluate(() => window.__ew.game.objectiveTarget().id), "beach");
    await stateWait("the mainland boat interaction", () => window.__ew.store.getState().hud.prompt?.kind === "boat");
    await worldAction("boat", "Plaukti");
    await stateWait("the learner aboard beach", () => {
      const rides = window.__ew.game.rides;
      return rides.riding?.id === "beach" && rides.phase === "on";
    });
    assert.deepEqual(await page.evaluate(() => {
      const { x, z } = window.__ew.game.objectiveTarget();
      return [x, z];
    }), [85.9, -83.15]);
    route.push("map", "beach", [85.9, -83.15]);

    stage = "boat approach and jetty";
    // Same west-channel shortcut as lighthouse-island, applied to the boat only after boarding.
    await page.evaluate(() => {
      const { game: g } = window.__ew;
      g.rides.resetPosition(g.rides.riding, { x: 66, z: -83.15, rot: Math.PI / 2 });
      g.rideCourse = g.rig.yaw = Math.PI / 2;
      g.rig.snap();
    });
    await forward("the boat slows at the island jetty", () => {
      const m = window.__ew.game.rides.riding?.m;
      return m && m.x > 82.5 && m.pace < 1.3;
    });
    await worldAction("out", "Išlipti");
    await stateWait("the learner disembarks", () => !window.__ew.game.rides.riding);
    const dock = await position();
    assert(dock.x >= 85.5 && dock.x <= 87.2 && dock.y > 0.7 && !dock.swimming, JSON.stringify(dock));
    const moored = await mooring();
    assert(moored?.id === "beach" && moored.x <= 82.95, JSON.stringify(moored));
    route.push({ mooring: moored });
    const waypoint = await page.evaluate(() => window.__ew.game.objectiveTarget());
    assert.deepEqual([waypoint.x, waypoint.z], [108.4, -83.55]);
    assert(waypoint.person?.x > 105, JSON.stringify(waypoint));
    await page.evaluate(() => {
      const { game: g } = window.__ew;
      g.rig.yaw = Math.PI / 2;
      g.rig.dist = 11;
      g.rig.pitch = 0.48;
      g.rig.snap();
    });
    await step(30);
    await shot("jetty");
    await forward("the learner walks across the jetty", () => window.__ew.game.player.root.position.x > 91);
    const across = await position();
    assert(!across.swimming && across.y > 0.7, JSON.stringify(across));

    await step(27);
    const tap = await page.evaluate(() => {
      const { game: g } = window.__ew;
      const canvas = g.renderer.domElement, rect = canvas.getBoundingClientRect();
      const p = g.player.root.position.clone().set(96.2, 0.72, -83.15).project(g.rig.cam);
      const x = rect.left + (p.x + 1) * rect.width / 2, y = rect.top + (1 - p.y) * rect.height / 2;
      return { x, y, onCanvas: document.elementFromPoint(x, y) === canvas };
    });
    assert(tap.onCanvas, JSON.stringify(tap));
    await withFrames(() => phone ? page.touchscreen.tap(tap.x, tap.y) : page.mouse.click(tap.x, tap.y));
    await stateWait("the learner reaches the dry path", () => window.__ew.game.player.root.position.x > 95.35);
    assert((await position()).y > 0.7);
    await page.evaluate(() => window.__ew.game.autoWalkToObjective());
    route.push([108.4, -83.55]);

    stage = "ambient greetings and invitation";
    const ambient = (en, lt) => visible(page.locator(".toast", { has: page.getByText(en, { exact: true }) })
      .getByText(lt, { exact: true }), en);
    await ambient("„Not many visitors make it out here. Enjoy the view!“", "Nedaug kas atplaukia iki čia. Pasigrožėkite vaizdu!");
    const readyToTalk = (label) => {
      const { game: g, store } = window.__ew;
      const p = store.getState().hud.prompt;
      return g.t - g.keeperSpokeAt >= 3.25 && p?.kind === "talk" && p.label === label;
    };
    await stateWait("the first keeper interaction after the visitor line", readyToTalk, "Pasisveikinti");
    await worldAction("talk", "Kalbėti");
    await ambient("„Watch your step on the rocks. They get slippery!“", "Atsargiai ant akmenų – jie slidūs!");
    const invitation = page.locator(".prompt-text");
    await until("the named keeper invitation", async () => await invitation.isVisible() && await invitation.innerText() === invite);
    await shot("invitation");
    await stateWait("the invitation is ready to open", readyToTalk, invite);
    await checkCounts(0, 0);
    assert.equal(await convo.count(), 0);
    await worldAction("talk", "Kalbėti");
    stage = "keeper intro and first welcome";
    await startTalk(welcome, { introFrame: true });
    await checkCounts(1, 0);
    assert.equal(await page.evaluate(() => window.__ew.game.currentObjective().id), course);
    route.push("keeper");

    for (const [index, { step: id, answers: choices }] of turns.entries()) {
      stage = `${id} answer`;
      const answer = runAnswers[index];
      await you(id);
      await checkCounts(1, 0);
      await checkChoices(choices);
      const action = convo.getByRole("button", { name: answerName(answer.en), exact: true });
      if (id === "life") {
        await modelGloss(exampleFor(choices[0].en), 2, "live", "gyvenate", true);
        await visible(convo.locator(".transcript").getByText("Klauskite apie gyvenimą saloje.", { exact: true }), "the keeper's full Lithuanian opening question");
        if (!speech) {
          const unsupported = convo.getByRole("button", { name: "Balso atpažinimas šioje naršyklėje nepalaikomas", exact: true });
          await visible(unsupported, "the disabled microphone action without recognition");
          assert(await unsupported.isDisabled());
        }
      }
      if (id === "storm") {
        const example = exampleFor(answer.en);
        await modelGloss(example, 3, speech ? "stay on?" : "stay?", speech ? "tebeveikė?" : "likote?");
        const star = example.getByRole("button", { name: "Natūralus vertimas", exact: true });
        await press(star);
        const tip = page.locator(".nat-tipbox:visible");
        await visible(tip, "the storm answer's full Lithuanian translation");
        assert.equal(await tip.evaluate((el) => el.firstChild.textContent.trim()), answer.lt);
        await shot("storm-gloss");
        if (phone) await press(star);
        else await withFrames(() => page.keyboard.press("Escape"));
        await until("the natural translation closes", async () => (await tip.count()) === 0);
      }
      if (id === "gift") {
        for (const en of ["Look at this little yellow note. I drew the lighthouse on it.", "You can keep it to remember your visit."]) {
          assert(await page.evaluate((text) => window.__ew.store.getState().conv.transcript
            .some((line) => line.who === "npc" && line.sentence?.en === text), en));
        }
        await visible(convo.locator(".transcript").getByText("Čia Jums – kad prisimintumėte viešnagę.", { exact: true }), "the keeper's full Lithuanian note offer");
        await withFrames(() => action.scrollIntoViewIfNeeded());
        await shot("note-offer");
      }
      assert.equal(await convo.locator(".ended-box").count(), 0);
      if (answer.voice) await speak(answer.en, id === "light" ? "light-spoken" : undefined);
      else if (phone || speech) {
        if (id === "life") await shot("life-choice");
        await press(action);
      } else {
        await withFrames(() => action.scrollIntoViewIfNeeded());
        await action.focus();
        assert(await action.evaluate((el) => document.activeElement === el));
        if (id === "life") await shot("life-choice");
        await withFrames(() => page.keyboard.press("Enter"));
      }
      await checkReply(index, answer);
    }

    stage = "completion and note";
    const ended = convo.locator(".ended-box");
    await visible(ended, "the keeper completion card");
    const ending = await page.evaluate(() => {
      const { completed, transcript } = window.__ew.store.getState().conv;
      return { completed, answers: transcript.filter((line) => line.who === "you").length, last: transcript.at(-1)?.sentence?.en };
    });
    assert.deepEqual(ending, { completed: true, answers: 5, last: "Have a good trip back!" });
    await exact(ended.locator(".ended-title"), "Užduotis įvykdyta!");
    assert.equal(await ended.locator(".stars .on").count(), 1);
    await exact(ended.locator(".ended-keepsake"), "Gavai raštelį");
    const phrase = ended.locator(".ended-phrase");
    await visible(phrase, "an answer featured on the end card");
    const bestEn = await phrase.locator("[lang=en]").innerText();
    const best = runAnswers.find(({ en }) => en === bestEn);
    assert(best, `end card features a model answer actually given, got ${bestEn}`);
    await exact(phrase.locator("[lang=lt]"), best.lt);
    const bounds = await ended.evaluate((el) => ({
      top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, viewport: innerHeight,
      last: el.querySelector(".copy-link").getBoundingClientRect().bottom, scroll: el.scrollHeight - el.clientHeight,
    }));
    assert(bounds.top > 0 && bounds.bottom <= bounds.viewport && bounds.last <= bounds.bottom && bounds.scroll <= 1, JSON.stringify(bounds));
    await checkCounts(1, 1);
    await shot("ended");
    await press(ended.getByRole("button", { name: "Tęsti", exact: true }));
    await stateWait("on foot holding the note", () => {
      const { game: g, store } = window.__ew;
      return !store.getState().conv.active && !g.rides.riding && !g.swimming && g.keepsakeKind() === "note";
    });
    assert.deepEqual(await mooring(), moored);
    assert.equal(await page.evaluate(() => window.__ew.store.getState().hud.objective?.sitId), course);
    await checkCounts(1, 1);
    await shot("hand-note");

    stage = "phrasebook";
    await reviewPhrase(runAnswers[0]);
    stage = "warm picker replay and early close";
    await replay({ plays: 2, run: 2, boat: moored });
    await quietResources();
    assert.deepEqual([...net.ambient].sort(), [...ambientKeys].sort(), "both existing ambient recordings were requested");

    if (speech) {
      stage = "saved interior and cold picker replay";
      await picker();
      await press(page.locator('.scn-card[data-sit="s72-cafe"]').first());
      await stateWait("a real café picker arrival", () => {
        const { game, store } = window.__ew;
        return game.zone.id === "sunny-cup" && store.getState().conv.active && store.getState().conv.sitId === "s72-cafe";
      });
      await quietResources();
      await press(convo.getByRole("button", { name: "Baigti pokalbį", exact: true }));
      const saved = await page.evaluate((key) => {
        const p = JSON.parse(localStorage.getItem(key));
        return { zone: p.place.zone, count: p.sits["x05-lighthouse-keeper"]?.completions, objective: p.objective };
      }, storage);
      assert.deepEqual(saved, { zone: "sunny-cup", count: 1, objective: course });
      await quietResources();
      await withFrames(() => page.reload({ waitUntil: "domcontentloaded", timeout: boot }), boot);
      await waitBoot();
      assert(await page.evaluate(() => window.__ew.game.zone.id === "sunny-cup" && !window.__ew.game.islandScene));
      await checkCounts(2, 1, 0);
      await replay({ plays: 3, run: 1, cold: true });
      assert.equal((await mooring())?.id, "beach");
      await quietResources();
    }

    const final = await counts();
    console.log(`keeper ${label}: ${JSON.stringify({
      route, pictures: speech, branches,
      discovery: { plays: 1, completions: 1 }, final, coldReplay: speech, pictureRequests: net.pictureRequests.length,
    })}`);
  } catch (error) {
    const snapshot = await page.evaluate(() => {
      const ew = window.__ew;
      const s = ew?.store.getState(), g = ew?.game, p = g?.player?.root.position, r = g?.rides?.riding;
      return { screen: s?.screen, phase: s?.conv.phase, step: s?.conv.stepId, run: s?.conv.run, mic: s?.conv.mic,
        effectiveStep: g?.activeSession?.conv.effectiveStep()?.id,
        reader: !!window.__questReader, confirmation: s?.conv.speechChoices, prompt: s?.hud.prompt, panel: s?.hud.panel,
        transcript: s?.conv.transcript.slice(-4).map((line) => [line.who, line.sentence?.en ?? line.text, line.via]),
        position: p && [p.x, p.y, p.z], time: g?.t, ride: r && [r.id, r.m.x, r.m.z, r.m.pace], ridePhase: g?.rides?.phase,
        mooring: g?.rides?.islandBoat(), objective: g?.objectiveTarget(), camera: g?.rig?.mode, audio: ew?.audio.getState(),
        keeperCount: s?.progress.play?.games?.keeper, keeperProgress: s?.progress.sits["x05-lighthouse-keeper"] };
    }).catch(() => ({}));
    throw new Error(`keeper ${label}, ${stage}, expected step ${lastTurn}: ${error.message}\n${JSON.stringify({
      route, branches, snapshot, errors: net.errors, pictureRequests: net.pictureRequests,
      pending: [...net.requests].map((r) => r.url()).slice(0, 10),
    })}`, { cause: error });
  }
}

if (shots) await mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true });
const failures = [];
try {
  for (const view of views) {
    for (const speech of [false, true]) {
      const context = await browser.newContext({ ...view, reducedMotion: "reduce", serviceWorkers: "block" });
      try { await visit(context, view, speech); }
      catch (error) { failures.push(error); }
      finally { await context.close(); }
    }
  }
} finally {
  await browser.close();
}
if (failures.length) throw new AggregateError(failures, `Keeper failed in ${failures.length} of ${views.length * 2} runs`);
