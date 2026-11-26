// Play the outing through the same controls as a learner, on each viewport against one PC layer.
// WORLD_TEST_URL=... WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=... WORLD_BROWSER_CHANNEL=chromium WORLD_LEARNER=en node tests/browser/cenote-tour.mjs --shots=...
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { lines, outing } from "./fixtures/cenote-tour.mjs";

const learner = process.env.WORLD_LEARNER || "en";
assert(["en", "lt"].includes(learner), "WORLD_LEARNER must be en or lt");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.argv.find((arg) => arg.startsWith("--shots="))?.slice(8) || process.env.WORLD_SHOTS;
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const { id, guide } = outing;
const mode = "cenote-tour";
const local = (en, lt) => learner === "en" ? en : lt;
const names = {
  picker: local("All situations", "Visos situacijos"),
  walk: local("Take me there", "Nuvesk mane"),
  talk: local("Talk to Inés Calderón", "Kalbėtis: Inés Calderón"),
  start: local("Start", "Pradėti"),
  end: local("End conversation", "Baigti pokalbį"),
  close: local("Close", "Uždaryti"),
  declined: local("Conversation over", "Pokalbis baigtas"),
  completed: local("Task completed!", "Užduotis įvykdyta!"),
  again: local("Try again.", "Pabandyk dar kartą."),
  leave: local("Leave the outing and return to the hut", "Baigti išvyką ir grįžti prie trobelės"),
  phrasebook: local("Phrasebook", "Frazių knygelė"),
};
const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const units = (value) => value.split(" | ");
const spanish = (key) => units(lines[key][0]).join(" ");
const gloss = (key) => units(lines[key][local(1, 3)]);
const natural = (key) => lines[key][local(2, 4)];
const distance = (pose, [x, z]) => Math.hypot(pose.x - x, pose.z - z);
const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
const requestedStage = (url) => /\/CenoteTour(?:[-.]|$)|\/cenoteTour\/(?:mode|animals|route|store)\.ts/i.test(new URL(url).pathname);
// (the scene file of Inés's pictures, scene-data/x14-cenote.json, is the eager scene list's like every other one: not the chat)
const requestedChat = (url) => { const p = new URL(url).pathname; return !p.includes("/scene-data/") && /\/(?:x14-cenote|cenote-tour-lines)(?:-[^/]+)?\.(?:js|ts|json)$/i.test(p); };
const pendingArt = (url) => /\/x14-cenote(?:[/.\-_]|$).*\.(?:webp|avif|png|jpe?g|svg)$/i.test(new URL(url).pathname);

function seed(play) {
  return {
    version: 1, started: 1, seenIntro: {}, sits: {}, phrases: {},
    profile: {
      name: "Ana", surname: "Tester", gender: "f", lookId: "f1",
      look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d6f", bottom: "#264653" },
    },
    settings: {
      v: 6, play, scenes: play === "light", quality: "low", textSize: 1.3, cameraFollow: true,
      volume: 0, sounds: 0, lt: true, ltNatural: true, sayLt: true, sayIpa: false,
      onDevice: false, phoneCalls: false, textMessages: false,
    },
    place: outing.start,
    coach: { done: true, run: true, view: true, seen: { list: true } },
  };
}

function initPage({ prefix, progress }) {
  const saveKey = prefix + "-progress-v1";
  sessionStorage.setItem("ew-play-now", "1");
  if (sessionStorage.getItem("cenote-seeded") !== "1") {
    localStorage.setItem(saveKey, JSON.stringify(progress));
    localStorage.setItem(prefix + "-variety", "default");
    sessionStorage.setItem("cenote-seeded", "1");
  }

  // surf.mjs's seeded RAF, clock and speech shape. Speech and Session timers still use the real event loop.
  let randomSeed = 20261115;
  Math.random = () => {
    randomSeed = (randomSeed + 0x6d2b79f5) | 0;
    let t = Math.imul(randomSeed ^ (randomSeed >>> 15), 1 | randomSeed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let now = 1000;
  performance.now = () => now;
  const queue = new Map();
  let rafId = 0;
  window.requestAnimationFrame = (cb) => { queue.set(++rafId, cb); return rafId; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };
  window.__step = (n, dt = 1000 / 60) => {
    for (let i = 0; i < n; i++) {
      now += dt;
      for (const id of [...queue.keys()]) {
        const cb = queue.get(id);
        queue.delete(id);
        cb?.(now);
      }
    }
    return now;
  };
  class Recognition {
    start() {
      Recognition.live = this;
      setTimeout(() => { if (Recognition.live === this) this.onstart?.(); }, 5);
    }
    abort() {
      if (Recognition.live === this) Recognition.live = null;
      setTimeout(() => this.onend?.(), 0);
    }
    stop() { this.abort(); }
  }
  delete window.webkitSpeechRecognition;
  window.webkitSpeechRecognition = undefined;
  window.SpeechRecognition = Recognition;
  window.__listening = () => !!Recognition.live;
  window.__speak = (text) => {
    const r = Recognition.live;
    if (!r?.onresult) return false;
    r.onspeechstart?.();
    r.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
    r.onspeechend?.();
    return true;
  };

  // Observe progress-v1's actual writes, including while the live actor is offshore. Retain enough for diagnostics.
  window.__cenoteSaves = [];
  const setItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    const result = setItem.call(this, key, value);
    if (this === localStorage && key === saveKey) {
      const p = window.__ew?.game.player?.root.position;
      window.__cenoteSaves.push({ at: now, actorZ: p?.z, place: JSON.parse(value).place });
      if (window.__cenoteSaves.length > 50) window.__cenoteSaves.shift();
    }
    return result;
  };
}

function readPage({ id, mode, prefix }) {
  const world = window.__ew;
  if (!world) return { screen: "booting", now: performance.now() };
  const { game, store } = world;
  const { screen, conv, hud, progress, settings } = store.getState();
  const pose = game.player?.root.position;
  const tour = window.__cenoteTour?.snapshot();
  const curtain = document.querySelector(".cenote-tour-curtain");
  return {
    now: performance.now(), screen, zone: game.zoneId, scene: game.presentedWorld?.scene, light: game.light, pictures: settings.scenes,
    pose: pose && { x: pose.x, y: pose.y, z: pose.z, heading: game.heading, visible: game.player.root.visible },
    prompt: hud.prompt, panel: hud.panel, hudMode: hud.modeScreen?.id ?? null, hudRide: hud.ride, hudFade: hud.fade,
    curtain: curtain ? Number(getComputedStyle(curtain).opacity) : null,
    objective: progress.objective, stage: !!game.rig?.stage, camera: game.rig?.mode, follow: settings.cameraFollow,
    session: !!game.activeSession, swimming: game.swimming, dive: game.diveK, wading: game.wading?.depth,
    ride: game.rides?.riding?.id ?? null, mode: game.modes?.active?.id ?? null, queued: !!game.modes?.hasQueued,
    undersea: game.undersea?.on ?? false, listening: window.__listening(),
    voice: world.voice?.(), modeBed: world.audio?.playingBed,
    wildlifeAttached: !!game.scene?.getObjectByName("cenote-tour-wildlife"),
    chat: {
      active: conv.active, run: conv.run, sit: conv.sitId, step: conv.stepId, phase: conv.phase, key: conv.lineKey,
      host: conv.hostId, speaker: conv.npcId, completed: conv.completed, intro: conv.introOpen,
    },
    completions: progress.sits[id]?.completions ?? 0,
    starts: progress.play?.games?.[mode] ?? 0,
    saved: JSON.parse(localStorage.getItem(prefix + "-progress-v1") || "null")?.place,
    tour, draw: window.__cenoteDraws,
    ready: !!game.player && !!game.ledges?.ready,
    miss: document.querySelector('.cenote-tour-card [role="status"]')?.textContent,
    choices: [...document.querySelectorAll('.cenote-tour-card [data-action="choose"]')].map((e) => e.dataset.line),
  };
}

function installObservers({ id, meshNames }) {
  const { game, store } = window.__ew;
  const narration = window.__cenoteNarration = [];
  const observe = ({ conv }) => {
    if (!conv.active || conv.sitId !== id || !conv.speaking || !conv.lineKey) return;
    if (narration.at(-1)?.message === conv.speaking && narration.at(-1)?.run === conv.run) return;
    narration.push({
      message: conv.speaking, run: conv.run, key: conv.lineKey, step: conv.stepId,
      npc: conv.npcId, activeMode: game.modes?.active?.id ?? null,
    });
  };
  observe(store.getState());
  store.subscribe(observe);
  if (!game.renderer) return;
  const renderer = game.renderer;
  window.__cenoteDraws = [];
  const render = renderer.render;
  renderer.render = function (...args) {
    window.__cenoteDraws = [];
    return render.apply(this, args);
  };
  const draw = renderer.renderBufferDirect;
  renderer.renderBufferDirect = function (camera, scene, geometry, material, object, group) {
    const result = draw.call(this, camera, scene, geometry, material, object, group);
    if (meshNames.includes(object.name) && camera === game.rig.cam) {
      window.__cenoteDraws.push({ name: object.name, instances: object.count, vertices: geometry.attributes.position.count });
    }
    return result;
  };
}

function watchPage(page) {
  const errors = [], requests = [], runtime = new Set(), pending = new Set();
  const report = (message) => errors.push(message);
  const relevant = (request) => {
    const target = new URL(request.url());
    if (!["http:", "https:"].includes(target.protocol)) return false;
    return ["document", "script", "stylesheet", "image", "font", "media"].includes(request.resourceType())
      || target.origin === new URL(url).origin || pendingArt(request.url());
  };
  page.on("pageerror", (error) => report(error.stack || error.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") report(`console: ${msg.text()} (${msg.location().url})`);
  });
  page.on("request", (request) => {
    if (requestedStage(request.url()) || requestedChat(request.url()) || pendingArt(request.url())) requests.push(request.url());
  });
  page.on("requestfailed", (request) => {
    if (relevant(request)) report(`request failed: ${request.failure()?.errorText} ${request.url()}`);
  });
  page.on("response", (response) => {
    const href = response.url();
    if (response.status() >= 400 && relevant(response.request())) report(`HTTP ${response.status()} ${href}`);
    if (!response.ok() || !/\/assets\/mode-[\w-]+\.js$/.test(new URL(href).pathname)) return;
    // Production's lazy mode chunk has a generic file name. Its wildlife mesh name identifies this runtime.
    const reading = response.text().then((source) => {
      if (source.includes("cenote-tour-wildlife")) runtime.add(href);
    }).catch((error) => report(`could not read mode module ${href}: ${error.message}`));
    pending.add(reading);
    void reading.then(() => pending.delete(reading));
  });
  return { errors, requests, runtime, flush: () => Promise.all([...pending]) };
}

async function visibleText(locator, expected, { settle = false } = {}) {
  if (!settle) await locator.waitFor({ state: "visible" });
  const actual = await locator.evaluate(async (el, { expected, settle }) => {
    const normalize = (value) => value.normalize("NFC").replace(/\s+/gu, " ").trim();
    const expectedText = normalize(expected);
    const measure = () => {
      const bounds = el.getBoundingClientRect().toJSON();
      const viewport = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
      const clip = { ...viewport };
      const fitsX = (box) => bounds.left >= box.left - 1 && bounds.right <= box.right + 1;
      const fitsY = (box) => bounds.top >= box.top - 1 && bounds.bottom <= box.bottom + 1;
      let firstClip = null, firstHidden = null;
      const scroll = [];
      for (let node = el; node; node = node.parentElement) {
        const { visibility, opacity, overflowX, overflowY } = getComputedStyle(node);
        const label = node.tagName.toLowerCase() + [...node.classList].map((name) => "." + name).join("");
        if (!firstHidden && (visibility === "hidden" || Number(opacity) === 0)) {
          firstHidden = { node: label, visibility, opacity };
        }
        if (node === el) continue;
        const clipsX = overflowX !== "visible", clipsY = overflowY !== "visible";
        if (!clipsX && !clipsY) continue;
        const box = node.getBoundingClientRect();
        if (clipsX) { clip.left = Math.max(clip.left, box.left); clip.right = Math.min(clip.right, box.right); }
        if (clipsY) { clip.top = Math.max(clip.top, box.top); clip.bottom = Math.min(clip.bottom, box.bottom); }
        if (!firstClip && ((clipsX && !fitsX(box)) || (clipsY && !fitsY(box)))) {
          firstClip = { node: label, bounds: box.toJSON(), overflowX, overflowY, opacity };
        }
        const maxTop = node.scrollHeight - node.clientHeight, maxLeft = node.scrollWidth - node.clientWidth;
        if (maxTop || maxLeft || overflowY === "auto" || overflowY === "scroll") {
          scroll.push({ node: label, top: node.scrollTop, left: node.scrollLeft, maxTop, maxLeft });
        }
      }
      return {
        visible: !firstHidden && bounds.width > 0 && bounds.height > 0 && fitsX(clip) && fitsY(clip),
        text: normalize(el.innerText), bounds, viewport, clip, firstClip, firstHidden, scroll,
      };
    };

    // CSS and native scrolling use wall time. Keep measuring the original element on this clock.
    const deadline = Date.now() + 1000;
    let sample = measure();
    let consecutive = Number(sample.visible && sample.text === expectedText);
    while (settle && consecutive < 2 && Date.now() + 25 <= deadline) {
      await new Promise((resolve) => setTimeout(resolve, 25));
      if (Date.now() > deadline) break;
      sample = measure();
      consecutive = sample.visible && sample.text === expectedText ? consecutive + 1 : 0;
    }
    return { ...sample, expectedText, consecutive };
  }, { expected, settle }, settle ? { timeout: 1000 } : undefined);
  assert.equal(actual.text, actual.expectedText, `visible text in ${locator}: ${JSON.stringify(actual)}`);
  assert(actual.consecutive >= (settle ? 2 : 1),
    `expected the full text to be visible in ${locator}: ${JSON.stringify(actual)}`);
}

// Tour captions use the kit GlossLine, which leaves out the natural row when the word meanings already read as the same sentence.
const bare = (text) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const glossIsNatural = (key) => bare(gloss(key).join(" ")) === bare(natural(key) ?? "");

async function naturalText(line, key, compact, options) {
  if (compact) await visibleText(line.locator('.kit-gloss-compact > [lang="es"]'), spanish(key));
  if (!compact && options?.glossLine && glossIsNatural(key)) {
    await unitText(line, key);
    assert.equal(await line.locator(`.nat[lang="${learner}"]`).count(), 0, `${key}: no repeated natural row`);
    assert.equal(await line.locator(`[lang="${local("lt", "en")}"]`).count(), 0, `${key} has no other helper language`);
    return;
  }
  await visibleText(line.locator(`${compact ? ".kit-gloss-compact > small" : ".nat"}[lang="${learner}"]`), natural(key), options);
  assert.equal(await line.locator(`[lang="${local("lt", "en")}"]`).count(), 0, `${key} has no other helper language`);
}

async function unitText(line, key, scroll = false) {
  const row = line.locator('.il[lang="es"]');
  // Every word slot: the tour card's lines are not tappable, so their slots carry no data-i (stones-cards).
  const slots = row.locator(":scope > .u");
  const es = units(lines[key][0]), help = gloss(key);
  assert.equal(await slots.count(), es.length, `${key}: Spanish unit count`);
  assert.equal(help.length, es.length, `${key}: fixture aligns`);
  for (const [i, unit] of es.entries()) {
    const slot = slots.nth(i);
    if (scroll) await slot.scrollIntoViewIfNeeded();
    await visibleText(slot.locator(".en"), unit);
    await visibleText(slot.locator(`.lt[lang="${learner}"]`), help[i]);
  }
}

async function target(locator, minimum = 44) {
  const rect = await locator.evaluate((el) => {
    const { left, right, top, bottom, width, height } = el.getBoundingClientRect();
    const hit = el.contains(document.elementFromPoint((left + right) / 2, (top + bottom) / 2));
    return { left, right, top, bottom, width, height, hit, w: innerWidth, h: innerHeight };
  });
  assert(rect.width >= minimum - 0.01 && rect.height >= minimum - 0.01 && rect.left >= 0 && rect.top >= 0
    && rect.right <= rect.w && rect.bottom <= rect.h && rect.hit, `${locator} should be an on-screen, hittable ${minimum}px target: ${JSON.stringify(rect)}`);
  return rect;
}

async function checkPicker(page, kind) {
  const card = page.locator(`.${kind}-card[data-sit="${id}"]`);
  await card.waitFor();
  assert.equal(await card.count(), 1, "one x14 picker card");
  const catalog = await page.evaluate((id) => {
    const sits = window.__ew.game.orderedSituations();
    return { unique: new Set(sits.map((s) => s.id)).size, x14: sits.find((s) => s.id === id) };
  }, id);
  const keys = await page.locator(`.${kind}-card[data-sit]`).evaluateAll((nodes) => [...new Set(nodes.map((el) => el.dataset.sit))]);
  assert.equal(keys.length, catalog.unique);
  assert.equal(keys.length, 52);
  assert.deepEqual({ actor: catalog.x14.npc, place: catalog.x14.location, bonus: catalog.x14.bonus }, { actor: guide, place: mode, bonus: true });
  await card.scrollIntoViewIfNeeded();
  await target(card);
  await visibleText(card.locator('i[lang="es"]'), outing.title.es);
  await visibleText(card.locator(`b[lang="${learner}"]`), outing.title[learner]);
  const layout = await card.evaluate((el, selector) => {
    const box = el.getBoundingClientRect(), body = el.querySelector(selector);
    const measure = (node) => {
      const range = document.createRange();
      range.selectNodeContents(node);
      return [...range.getClientRects()].map(({ top, left, bottom, right }) => ({ top, left, bottom, right }));
    };
    const titles = [...body.querySelectorAll("b,i")].map(measure);
    return {
      width: body.getBoundingClientRect().width,
      lines: titles.map((rects) => new Set(rects.map(({ top }) => Math.round(top))).size),
      outside: titles.flat().some((r) => r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1),
    };
  }, kind === "lh" ? ".lh-txt" : ".txt");
  assert(layout.width >= 150 && layout.lines.every((n) => n > 0 && n <= 3) && !layout.outside, JSON.stringify(layout));
  return card;
}

async function visit(browser, viewport, play, run) {
  const phone = viewport.width === 390;
  const label = `PC-${learner} ${viewport.width}x${viewport.height} ${play}`;
  const prefix = `${viewport.width}x${viewport.height}-${phone ? "t" : "k"}`;
  const context = await browser.newContext({
    viewport, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone,
  });
  let phase = "navigation";
  let page, monitor;
  const read = () => page.evaluate(readPage, { id, mode, prefix: storage });
  try {
    page = await context.newPage();
    page.setDefaultTimeout(12000);
    monitor = watchPage(page);
    await page.addInitScript(initPage, { prefix: storage, progress: seed(play) });
    const step = async (frames) => {
      await page.evaluate((n) => window.__step(n, 1000 / 60), frames);
      await real(8);
    };
    const advance = async (frames, sample) => {
      while (frames > 0) {
        const batch = Math.min(frames, 30);
        await step(batch);
        if (sample) sample(await read());
        frames -= batch;
      }
    };
    const wait = async (description, accept, { frames = 6, maxFrames = 6000, ms = 30000, sample } = {}) => {
      const deadline = Date.now() + ms;
      let actual = await read();
      sample?.(actual);
      for (let n = 0; !accept(actual) && n < maxFrames && Date.now() < deadline; n += frames) {
        assert.deepEqual(monitor.errors, [], `${description}: browser errors`);
        assert.notEqual(actual.tour?.lastExit, "failed", `${description}: lazy stage failed to launch`);
        await step(frames);
        actual = await read();
        sample?.(actual);
      }
      assert(accept(actual), `expected ${description}, got ${JSON.stringify(actual)}`);
      return actual;
    };
    const boot = () => wait(`${play} ready`, (s) => s.screen === "play" && (play === "light" ? s.light : s.ready && !!s.tour),
      { frames: 2, maxFrames: 4800, ms: 120000 });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await boot();
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await step(15);
    await page.evaluate(installObservers, { id, meshNames: Object.keys(outing.meshes) });
    await step(2);
    await monitor.flush();
    assert.deepEqual(monitor.requests.filter(requestedChat), [], "opening either home leaves the tour conversation and table unloaded");
    assert.deepEqual(monitor.requests.filter(requestedStage), [], "opening either home leaves the tour HUD and stage unloaded");
    assert.equal(monitor.runtime.size, 0, "opening either home leaves the production wildlife runtime unloaded");

    const press = (locator) => phone ? locator.tap() : locator.click();
    const shot = (name) => shots && page.screenshot({ path: path.join(shots, `${prefix}-${name}.png`), timeout: 12000 });
    const narration = (run) => page.evaluate((run) => window.__cenoteNarration.filter((line) => line.run === run), run);
    const setPhase = (next) => { phase = next; };
    await run({ page, context, phone, label, setPhase, read, step, advance, wait, press, shot, narration, monitor, boot });
    await monitor.flush();
    assert.deepEqual(monitor.errors, [], "browser errors and failed resources");
    // picture mode fetches both of Inés's stills
    if (play === "light") assert.deepEqual([...new Set(monitor.requests.filter(pendingArt).map((u) => new URL(u).pathname.replace(/^.*\//, "")))].sort(), ["mask.webp", "welcome.webp"], "picture mode fetches Inés's two stills");
    // 3D (pictures off) shows only the corner chip's preview of her welcome still (ViewSwitch), never the mask
    else assert.deepEqual([...new Set(monitor.requests.filter(pendingArt).map((u) => new URL(u).pathname.replace(/^.*\//, "")))]
      .filter((name) => name !== "welcome.webp"), [], "3D mode requests no x14 scene picture beyond the chip's preview");
  } catch (error) {
    const state = page && !page.isClosed() ? await read().catch(() => null) : null;
    let failureShot;
    if (shots && page && !page.isClosed()) {
      failureShot = path.join(shots, `${prefix}-${play}-failure.png`);
      await page.screenshot({ path: failureShot, timeout: 5000 }).catch(() => { failureShot = undefined; });
    }
    console.error(JSON.stringify({
      label, phase, stop: state?.tour?.stopIndex, line: state?.tour?.lineKey ?? state?.chat?.key,
      player: state?.pose, actual: state, browserErrors: monitor?.errors, requests: monitor?.requests,
      runtime: monitor && [...monitor.runtime], failureShot,
    }, null, 2));
    throw new Error(`${label}, ${phase}: ${error.message}`, { cause: error });
  } finally {
    await context.close();
  }
}

async function toolbarButton(h, name) {
  const { page, press, step } = h;
  const menu = page.locator('.toolbar .ride-menu[aria-expanded="false"]');
  if (await menu.isVisible()) {
    await press(menu);
    await step(6);
  }
  await press(page.locator(".toolbar").getByRole("button", { name, exact: typeof name === "string" }));
}

function noLaunch(s, starts, completions) {
  assert.equal(s.starts, starts, "outing starts");
  assert.equal(s.completions, completions, "x14 completions");
  assert.equal(s.mode, null, "no active mode");
  assert.equal(s.queued, false, "no queued outing");
  if (s.tour) {
    assert.equal(s.tour.state, "idle");
    assert.deepEqual(s.tour.animals, []);
    assert.deepEqual(s.draw, []);
    assert.equal(s.wildlifeAttached, false, "idle town has no tour wildlife attached");
  }
}

async function discover(h) {
  const { page, press, read, step, wait, shot, setPhase } = h;
  setPhase("town picker and cold entry");
  const initial = await read();
  noLaunch(initial, 0, 0);
  assert.equal(initial.zone, "town");
  assert(distance(initial.pose, [outing.start.x, outing.start.z]) < 0.35);
  assert.deepEqual(await page.evaluate(() => ({
    frozen: Object.isFrozen(window.__cenoteTour), keys: Object.keys(window.__cenoteTour),
    writable: Object.getOwnPropertyDescriptor(window, "__cenoteTour").writable,
  })), { frozen: true, keys: ["snapshot"], writable: false });
  await toolbarButton(h, names.picker);
  await checkPicker(page, "scn");
  await press(page.locator(".sheet.scenarios .sheet-head").getByRole("button", { name: names.close, exact: true }));
  await step(10);

  setPhase("map, independent pins and the painted guide dot");
  const marker = await page.locator(".minimap canvas[data-cenote-tour]").evaluate((canvas) => {
    const [u, v] = canvas.dataset.cenoteTour.split(",").map(Number);
    const pixels = canvas.getContext("2d").getImageData(Math.round(u * canvas.width) - 7, Math.round(v * canvas.height) - 7, 15, 15).data;
    let painted = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] === 0x13 && pixels[i + 1] === 0x7d && pixels[i + 2] === 0x79 && pixels[i + 3] === 255) painted++;
    }
    return { u, v, painted };
  });
  // The minimap spans 90 metres. The marker is at the actor, a different point from the learner's arrival.
  assert(Math.abs(marker.u - (0.5 + (outing.actor[0] - initial.pose.x) / 90)) < 0.01
    && Math.abs(marker.v - (0.5 + (outing.actor[1] - initial.pose.z) / 90)) < 0.01 && marker.painted > 0, JSON.stringify(marker));
  await press(page.locator(".minimap"));
  const tourPin = page.locator('.map-pin[data-location="cenote-tour"]');
  const cavePin = page.locator('.map-pin[data-location="gruta"]');
  await tourPin.waitFor();
  await step(6);
  assert.equal(await tourPin.getAttribute("aria-label"), outing.title.es);
  assert.equal(await tourPin.getAttribute("aria-description"), local("The hut at Cenote Ka'an", "Trobelė prie cenotės Ka'an"));
  assert.equal(await cavePin.getAttribute("aria-label"), "Gruta de los Aluxes");
  assert(!intersects(await target(tourPin), await target(cavePin, 30)), "map pins have separate hit areas");
  await press(cavePin);
  assert.equal(await cavePin.getAttribute("aria-pressed"), "true");
  await press(tourPin);
  assert.equal(await tourPin.getAttribute("aria-pressed"), "true");
  assert.equal(await cavePin.getAttribute("aria-pressed"), "false");
  const list = page.locator(".sheet .sit-list");
  await list.locator(`[data-sit="${id}"]`).waitFor();
  await shot("01-map");
  await press(list.getByRole("button", { name: names.walk, exact: true }));

  setPhase("map walk to the hut");
  const arrived = await wait("the Inés prompt at the dry hut", (s) => s.prompt?.kind === "talk"
    && s.prompt?.label === names.talk && s.pose && distance(s.pose, outing.hut) <= 0.35,
  { frames: 15, maxFrames: 1800, ms: 90000 });
  assert.equal(arrived.objective, id, "map selected the actual x14 task");
  assert(distance(arrived.pose, [initial.pose.x, initial.pose.z]) >= 18, "the learner walked to the new place");
  assert(!arrived.swimming && arrived.tour.waterY === null && Math.abs(arrived.pose.y - arrived.tour.floorY) <= 0.1);
  noLaunch(arrived, 0, 0);
  const actor = await page.evaluate((guide) => {
    const root = window.__ew.game.npcs.find(({ id }) => id === guide)?.ch.root;
    return root && { x: root.position.x, y: root.position.y, z: root.position.z, yaw: root.rotation.y, visible: root.visible };
  }, guide);
  assert(actor?.visible && distance(actor, outing.actor) <= 0.05 && distance(actor, [arrived.pose.x, arrived.pose.z]) <= 2.1, JSON.stringify(actor));
  assert(Math.abs(actor.y - arrived.tour.floorY) <= 0.1 && Math.abs(actor.yaw - Math.PI / 2) <= 0.35, JSON.stringify(actor));
  await visibleText(page.locator(".prompt .prompt-text"), names.talk);
  assert.equal(await page.locator(".minimap canvas[data-cenote-tour]").count(), 1);
  await shot("02-hut");
}

async function enterChat(h, first, card) {
  const { page, phone, press, wait } = h;
  if (card) await press(card);
  else if (phone) await press(page.locator(".act-btn"));
  else await page.keyboard.press("e");
  const opened = await wait(`the ${id} conversation with Inés`, (s) => s.chat?.active && s.chat.sit === id && s.chat.host === guide);
  const start = page.locator(".scene-intro").getByRole("button", { name: names.start, exact: true });
  if (opened.chat.intro || await start.isVisible()) {
    await visibleText(page.locator(`.scene-intro p[lang="${learner}"]`), outing.intro[learner], { settle: true });
    await press(start);
  } else {
    assert(!first, "a fresh save should show Inés's scene intro");
  }
  const greeting = first ? "greet" : "again";
  const open = await chatTurn(h, "invite", greeting);
  const msg = page.locator(".transcript .msg.npc").last();
  const speaker = msg.locator(".meta span").first();
  await speaker.scrollIntoViewIfNeeded();
  await visibleText(speaker, outing.displayName);
  await unitText(msg, greeting, true);
  await msg.locator(".nat").scrollIntoViewIfNeeded();
  await naturalText(msg, greeting, false);
  return open.chat.run;
}

async function chatTurn(h, step, key) {
  const s = await h.wait(`Inés finishes "${key}" and offers the "${step}" turn`, (s) =>
    s.chat?.active && s.chat.sit === id && s.chat.step === step && s.chat.phase === "you" && s.chat.key === key);
  assert.equal(s.chat.host, guide);
  assert.equal(s.chat.speaker, guide);
  assert(s.session && !s.chat.intro);
  assert.equal(s.mode, null);
  return s;
}

async function typeAnswer(h, key) {
  const convo = h.page.locator(".convo");
  const input = convo.locator('.typebox input[lang="es"]');
  if (!await input.isVisible()) {
    await h.press(convo.getByRole("button", { name: local(/^Type(?: \(T\))?$/, /^Rašyti(?: \(T\))?$/) }));
  }
  await input.fill(spanish(key));
  await h.press(convo.locator(".typebox").getByRole("button", { name: local("Send", "Siųsti"), exact: true }));
}

async function assertChatOrder(h, run, expected) {
  const spoken = await h.narration(run);
  assert.deepEqual(spoken.map(({ key }) => key), expected);
  assert(spoken.every(({ npc, activeMode }) => npc === guide && activeMode === null), JSON.stringify(spoken));
}

async function frameChat(h) {
  await h.advance(90);
  const view = await h.page.evaluate(() => {
    const game = window.__ew.game, actor = game.talkNpc.ch, cam = game.rig.cam;
    const panel = document.querySelector(".convo").getBoundingClientRect();
    const canvas = game.renderer.domElement.getBoundingClientRect();
    const point = (height) => {
      const v = actor.root.position.clone();
      v.y += height * actor.height;
      v.project(cam);
      return { x: canvas.left + (v.x + 1) / 2 * canvas.width, y: canvas.top + (1 - v.y) / 2 * canvas.height, depth: v.z };
    };
    return { actor: game.talkNpc.id, camera: game.rig.mode, points: [point(0.9), point(0.64)],
      panel: panel.toJSON(), width: innerWidth, height: innerHeight };
  });
  assert.equal(view.actor, guide);
  assert.equal(view.camera, "talk");
  for (const { x, y, depth } of view.points) {
    assert(x >= 6 && y >= 6 && x <= view.width - 6 && y <= view.height - 6 && Math.abs(depth) < 1
      && (h.phone ? y <= view.panel.top - 4 : x <= view.panel.left - 8), `Inés's face and chest should clear the cream panel: ${JSON.stringify(view)}`);
  }
}

async function decline(h) {
  h.setPhase("decline the dry invitation");
  const run = await enterChat(h, true);
  await frameChat(h);
  await h.shot("03-chat");
  await typeAnswer(h, "go_no");
  const ended = await h.wait("the polite decline and ordinary end card", (s) => s.chat?.phase === "ended" && s.chat.key === "later");
  assert(!ended.chat.completed);
  await visibleText(h.page.locator(".ended-box .ended-title"), names.declined);
  const farewell = h.page.locator(".transcript .msg.npc").last();
  await naturalText(farewell, "later", false, { settle: true });
  const closing = await farewell.evaluate((msg) => ({
    bottom: msg.querySelector(".nat").getBoundingClientRect().bottom,
    endCardTop: msg.closest(".convo").querySelector(".ended-box").getBoundingClientRect().top,
  }));
  assert(closing.bottom <= closing.endCardTop + 1, `farewell above the end card: ${JSON.stringify(closing)}`);
  await assertChatOrder(h, run, ["greet", "later"]);
  noLaunch(ended, 0, 0);
  await h.press(h.page.locator(".ended-box").getByRole("button", { name: local("Continue", "Tęsti"), exact: true }));
  await h.advance(75);
  noLaunch(await h.read(), 0, 0);
  assert.equal((await h.read()).chat.active, false);
  assert.equal((await h.read()).listening, false);
  await h.monitor.flush();
  assert.deepEqual(h.monitor.requests.filter(requestedStage), [], "no tour overlay or development runtime before boarding");
  assert.deepEqual([...h.monitor.runtime], [], "no production tour runtime before boarding");
}

async function positiveChat(h, branch, run, { first = false, speakInterest = false } = {}) {
  await typeAnswer(h, "go_yes");
  await chatTurn(h, "interest", "ask_interest");
  const question = h.page.locator(".transcript .msg.npc").last();
  await unitText(question, "ask_interest", true);
  await question.locator(".nat").scrollIntoViewIfNeeded();
  await naturalText(question, "ask_interest", false);
  if (speakInterest) {
    // The typed acceptance leaves the mic off. Open it with the ordinary conversation control.
    const control = h.page.locator('.convo[data-phase="you"] .inputbar button.mic');
    await control.waitFor({ state: "visible" });
    await target(control);
    if (!(await h.read()).listening) await h.press(control);
    await h.wait("the ordinary interest turn is listening", (s) => s.listening && s.session && s.chat.active
      && s.chat.run === run && s.chat.step === "interest" && s.chat.phase === "you");
    assert.equal(await control.getAttribute("aria-pressed"), "true");
    await say(h, spanish(branch.interest));
  } else {
    await typeAnswer(h, branch.interest);
  }
  const ready = await chatTurn(h, "ready", "ask_ready");
  assert.equal(ready.chat.run, run);
  if (speakInterest) {
    const spoken = await h.page.evaluate(() => window.__ew.store.getState().conv.transcript
      .filter((line) => line.who === "you" && line.via === "voice")
      .map(({ heard, understood }) => ({ heard, understood })));
    assert.deepEqual(spoken, [{ heard: spanish(branch.interest), understood: true }]);
  }
  const words = h.page.locator(".transcript .msg.npc").last().locator(".bubble-part").first();
  await words.locator(".nat").scrollIntoViewIfNeeded();
  await naturalText(words, branch.plan, false);
  await typeAnswer(h, "go_yes");
  return async () => assertChatOrder(h, run, [first ? "greet" : "again", "ask_interest", branch.plan, "ask_ready", "meet_deck"]);
}

async function board(h, branch, count) {
  h.setPhase(`affirmative chat and boarding ${count}`);
  const run = await enterChat(h, false);
  const order = await positiveChat(h, branch, run, { speakInterest: count === 1 });
  const aboard = await h.wait("the final line closes the chat and boards the tour", (s) =>
    s.tour?.state === "deck" && s.camera === "stage" && s.mode === mode && s.curtain === 0 && s.starts === count);
  assert(!aboard.chat.active && aboard.chat.completed && !aboard.session && !aboard.queued);
  assert.equal(aboard.completions, count, "one chat completion per affirmative handoff");
  assert.equal(aboard.tour.run, count, "one lazy launch for each affirmative handoff");
  await order();
  return aboard;
}

const tourLine = (page, key) => page.locator(`.cenote-tour-card .cenote-tour-line[data-line="${key}"][data-speaker="ines"]`);
const answerLine = (page, key) => page.locator(`.cenote-tour-card .cenote-tour-answer[data-line="${key}"][data-speaker="learner"]`);
const choice = (page, key) => page.locator(`.cenote-tour-card [data-action="choose"][data-line="${key}"]`);
const mic = (page) => page.locator('.cenote-tour-card [data-action="mic"]');
const leave = (page) => page.locator('.mode-hud [data-action="leave"]');

function survey() {
  const seen = new Map();
  const surface = { min: Infinity, max: -Infinity };
  const legs = { approach: 0, crossing: 0, return: 0 };
  const cues = [], stops = [], states = [];
  let previous, held = 0;
  const { bay, meshes, design } = outing;
  return {
    sample(s) {
      const t = s.tour;
      const draws = s.draw ?? [];
      if (t.lineKey && cues.at(-1) !== t.lineKey) cues.push(t.lineKey);
      if (t.stopIndex >= 0 && stops.at(-1) !== t.stopIndex) stops.push(t.stopIndex);
      if (states.at(-1) !== t.state) states.push(t.state);
      if (previous && previous.elapsed === t.elapsed && t.state === "turn") held += (s.now - previous.now) / 1000;
      previous = { elapsed: t.elapsed, now: s.now };
      assert.equal(t.animalCount, t.animals.length);
      assert.equal(new Set(t.animals.map((a) => a.id)).size, t.animalCount, "unique world instance identifiers");
      if (!t.animalCount) {
        assert.deepEqual(draws, [], "there are no tour wildlife draws outside their visible groups");
        return;
      }

      assert.equal(s.zone, "town", "the snorkel is staged in the town's bay");
      assert.equal(s.scene, "town", "the renderer presents the town bay scene");
      assert(t.viewer.submerged && s.undersea, "the scene and camera are both in the water");
      assert.deepEqual(t.design, design, "instanced wildlife design budget");
      const fish = t.animals.filter((a) => a.species === "fish");
      const turtles = t.animals.filter((a) => a.species === "turtle");
      assert(fish.length === 0 || fish.length === 12);
      assert(turtles.length === 0 || turtles.length === 2);
      assert.equal(fish.length + turtles.length, t.animalCount);
      const expected = Object.entries(meshes).filter(([name]) => name.startsWith("cenote-fish") ? fish.length : turtles.length);
      assert.deepEqual(draws.map(({ name, instances }) => [name, instances]).sort(), expected.sort(), "main camera actually submitted the occupied instanced meshes");
      const triangles = draws.reduce((sum, a) => sum + a.vertices * a.instances / 3, 0);
      assert(draws.length <= 5 && triangles > 0 && triangles <= 2500);
      assert(t.drawCalls > draws.length && t.triangles > triangles, JSON.stringify({ draws, triangles, renderer: [t.drawCalls, t.triangles] }));
      if (t.elapsed >= 22 && t.elapsed <= 68) {
        assert(t.viewer.y >= t.viewer.floorY + 0.44 && t.viewer.y <= t.viewer.surfaceY - 0.2, JSON.stringify(t.viewer));
      }
      if (t.elapsed < 32) legs.approach++;
      if (t.elapsed > 42 && t.elapsed < 52) legs.crossing++;
      if (t.elapsed > 62) legs.return++;
      for (const a of t.animals) {
        seen.set(a.id, (seen.get(a.id) ?? 0) + 1);
        assert(a.visible && a.radius > 0 && a.bottom < a.y && a.y < a.top, JSON.stringify(a));
        assert(a.minSurfaceY !== null && a.minSurfaceY <= a.surfaceY && a.maxFloorY >= a.floorY
          && a.top <= a.minSurfaceY - 0.12 && a.bottom >= a.maxFloorY + 1.55, `water and bed margins: ${JSON.stringify(a)}`);
        assert(a.x - a.radius > bay.x0 && a.x + a.radius < bay.x1 && a.z - a.radius > bay.z0 && a.z + a.radius < bay.z1,
          `animal envelope inside the western bay: ${JSON.stringify(a)}`);
        for (const [x, z, r] of bay.rocks) {
          assert(distance(a, [x, z]) > r + a.radius, `animal envelope clears the bay rocks: ${JSON.stringify(a)}`);
        }
        surface.min = Math.min(surface.min, a.surfaceY);
        surface.max = Math.max(surface.max, a.surfaceY);
      }
      if (fish.length) {
        assert.deepEqual(fish.map((a) => a.id), Array.from({ length: 12 }, (_, i) => `fish-${i + 1}`));
        assert(fish.every((a) => fish.every((b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1.2)), "the 12 fish remain a school");
      }
      if (turtles.length) {
        const [a, b] = turtles;
        assert.deepEqual([a.id, b.id], ["turtle-1", "turtle-2"]);
        assert(distance(a, [b.x, b.z]) > a.radius + b.radius, JSON.stringify({ a, b }));
      }
    },
    finish(branch) {
      assert.deepEqual(stops, [0, 1, 2]);
      assert.deepEqual(states, ["deck", "transit", "swim", "turn", "swim", "turn", "returning", "idle"]);
      assert.deepEqual(cues, ["ct_fresh", "ct_walk", "ct_fish", "ct_see", branch.fishReply,
        "ct_turtle", "ct_howmany", branch.turtleReply, "ct_back", "ct_home"]);
      assert(seen.size === 14 && [...seen.values()].every((n) => n >= 10), JSON.stringify([...seen]));
      assert(Object.values(legs).every((n) => n >= 4), JSON.stringify(legs));
      assert(surface.max - surface.min >= 0.3, `multiple wave phases must be sampled: ${JSON.stringify(surface)}`);
      assert(held >= 1, `both wildlife stops should keep moving with the route held: ${held}s`);
      return { held, surface, legs, samples: Object.fromEntries(seen) };
    },
  };
}

async function projectedAnimals(h, expected, stop) {
  const s = await h.read();
  const card = await h.page.locator(".cenote-tour-card").boundingBox();
  const view = await h.page.locator(".stage canvas").boundingBox();
  const exit = await target(leave(h.page));
  const draws = s.draw;
  assert.equal(s.tour.state, "turn");
  assert.equal(s.tour.stopIndex, stop);
  assert.equal(s.tour.animalCount, expected);
  assert.equal(draws.length, 2, "a body draw and an animated appendage draw at the observation");
  const shapes = s.tour.animals.map(({ screen, id }) => {
    const rect = {
      left: view.x + view.width * screen.left, right: view.x + view.width * screen.right,
      top: view.y + view.height * screen.top, bottom: view.y + view.height * screen.bottom,
    };
    assert(screen.depth > -1 && screen.depth < 1 && rect.left >= view.x + 4 && rect.right <= view.x + view.width - 4
      && rect.top >= view.y + 4 && rect.bottom < card.y - 4 && !intersects(rect, exit)
      && rect.right - rect.left > 2 && rect.bottom - rect.top > 2, `${id} clear of caption and controls: ${JSON.stringify({ screen, rect, view, card, exit })}`);
    return rect;
  });
  if (stop === 2) assert(!intersects(...shapes), "both full turtle silhouettes are distinct");
  for (const control of [mic(h.page), ...s.choices.map((key) => choice(h.page, key))]) {
    const box = await target(control);
    assert(shapes.every((shape) => !intersects(shape, box)), `${control} clears the animals`);
  }
  return s;
}

async function appendagePoses(page, stop) {
  return page.evaluate((stop) => {
    const scene = window.__ew.game.scene;
    const body = scene.getObjectByName(stop === 1 ? "cenote-fish" : "cenote-turtles");
    const limbs = scene.getObjectByName(stop === 1 ? "cenote-fish-tails" : "cenote-turtle-flippers");
    const parent = body.matrix.clone(), limb = limbs.matrix.clone();
    return Array.from({ length: limbs.count }, (_, i) => {
      body.getMatrixAt(stop === 1 ? i : Math.floor(i / 2), parent);
      limbs.getMatrixAt(i, limb);
      return parent.invert().multiply(limb).toArray();
    });
  }, stop);
}

function moved(before, after) {
  assert.deepEqual(after.map((a) => a.id), before.map((a) => a.id));
  return Math.max(...after.map((a, i) => {
    const b = before[i];
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
  }));
}

async function watchMotion(h, stop, count, name, sample) {
  await h.step(4);
  const first = await projectedAnimals(h, count, stop);
  const baseline = await appendagePoses(h.page, stop);
  await h.shot(`${name}-a`);
  await h.advance(7, sample);
  const animation = [await appendagePoses(h.page, stop)];
  await h.advance(23, sample);
  const middle = await projectedAnimals(h, count, stop);
  animation.push(await appendagePoses(h.page, stop));
  await h.advance(30, sample);
  const last = await projectedAnimals(h, count, stop);
  animation.push(await appendagePoses(h.page, stop));
  const animate = Math.max(...animation.flatMap((limbs) =>
    limbs.flatMap((matrix, i) => matrix.map((value, j) => Math.abs(value - baseline[i][j])))));
  assert(animate > 0.01, `the actual fins or tails changed pose at stop ${stop}: ${animate}`);
  assert(Math.abs(last.now - first.now - 1000) < 0.01 && Math.abs(middle.now - first.now - 500) < 0.01);
  const half = moved(first.tour.animals, middle.tour.animals);
  const whole = moved(first.tour.animals, last.tour.animals);
  assert(half > 0.01 && whole > 0.025, `actual world movement at stop ${stop}: ${half} m at 30 frames, ${whole} m at 60`);
  await h.shot(`${name}-b`);
  console.log(h.label, name, JSON.stringify({
    routeSeconds: [first.tour.elapsed, last.tour.elapsed],
    renderCalls: [first.tour.drawCalls, last.tour.drawCalls],
    triangles: [first.tour.triangles, last.tour.triangles], half, whole, animate,
  }));
}

async function awaitChoices(h, sample, stop) {
  const keys = stop === 1 ? ["see_yes", "see_where"] : ["see_one", "see_two"];
  const cue = stop === 1 ? "ct_see" : "ct_howmany";
  const s = await h.wait(`stop ${stop} displays both ${cue} answers`, (s) => s.tour?.state === "turn"
    && s.tour.stopIndex === stop && s.tour.lineKey === cue && s.choices.length === 2 && s.listening,
  { frames: 24, maxFrames: 2200, ms: 180000, sample });
  assert.deepEqual(s.choices, keys);
  assert(distance(s.tour.viewer, stop === 1 ? outing.fishStop : outing.turtleStop) <= 0.12, JSON.stringify(s.tour.viewer));
  assert.equal(s.curtain, 0);
  assert.equal(await mic(h.page).getAttribute("data-listening"), "true");
  return { keys, cue };
}

async function checkTurn(h, { keys, cue }) {
  const { page, press } = h;
  const line = tourLine(page, cue);
  await visibleText(page.locator('.cenote-tour-heading [data-speaker="ines"][lang="es"]'), outing.captionName);
  await unitText(line, cue);
  for (const key of keys) await naturalText(choice(page, key), key, true);
  const toggle = page.locator('.cenote-tour-card [data-action="natural"]');
  await press(toggle);
  assert.equal(await toggle.getAttribute("aria-pressed"), "true");
  await naturalText(line, cue, true);
  await press(toggle);
}

async function checkReply(h, cue, answer, reply, sample) {
  await h.wait(`Inés acknowledges ${answer} with ${reply}`, (s) => s.tour?.lineKey === reply, { frames: 6, sample });
  const line = tourLine(h.page, reply);
  const selection = answerLine(h.page, answer);
  await unitText(line, reply);
  await unitText(selection, answer);
  await h.press(h.page.locator('.cenote-tour-card [data-action="natural"]'));
  await naturalText(line, reply, true);
  await naturalText(selection, answer, true);
  await h.press(h.page.locator('.cenote-tour-card [data-action="natural"]'));
  const s = await h.read();
  assert.equal(s.choices.length, 0, `${cue} was answered once`);
  assert.equal(s.listening, false, "the guide has the floor");
}

async function holdAt(h, elapsed, cue, sample) {
  const held = await h.wait(`route clock held at ${elapsed}s on ${cue}`, (s) => s.tour?.elapsed === elapsed && s.tour.lineKey === cue,
    { frames: 24, maxFrames: 700, ms: 120000, sample });
  await h.advance(35, sample);
  const still = await h.read();
  assert.equal(still.tour.elapsed, elapsed);
  assert.equal(still.tour.lineKey, cue);
  assert.deepEqual(still.choices, held.choices);
  assert(moved(held.tour.animals, still.tour.animals) > 0.01);
}

async function say(h, text) {
  assert.equal(await h.page.evaluate((text) => window.__listening() && window.__speak(text), text), true, `recognizer must hear "${text}"`);
}

async function completeTour(h, branch, aboard) {
  const { page, shot, read, wait, advance, setPhase } = h;
  const samples = survey();
  const sample = (s) => samples.sample(s);
  sample(aboard);

  setPhase("freshwater deck at eight seconds");
  const deck = await wait("8s freshwater deck shot", (s) => s.tour?.elapsed >= 8, { frames: 24, maxFrames: 540, ms: 120000, sample });
  assert(deck.tour.elapsed < 8.5 && deck.tour.stopIndex === 0 && deck.tour.state === "deck");
  assert(distance(deck.pose, outing.deck) < 0.05 && Math.abs(deck.pose.y - 0.86) <= 0.1
    && Math.abs(deck.pose.y - deck.tour.floorY) <= 0.1 && !deck.tour.viewer.submerged);
  assert.equal(deck.tour.animalCount, 0);
  assert.equal(deck.tour.lineKey, "ct_fresh");
  await unitText(tourLine(page, "ct_fresh"), "ct_fresh");
  await naturalText(tourLine(page, "ct_fresh"), "ct_fresh", false, { glossLine: true });
  await shot("04-fresh");
  const walk = await wait("the walk-to-bay line while still at the cenote", (s) => s.tour?.lineKey === "ct_walk",
    { frames: 24, maxFrames: 500, ms: 120000, sample });
  assert(walk.tour.state === "transit" && walk.tour.stopIndex === -1 && distance(walk.pose, outing.deck) < 0.05 && walk.tour.animalCount === 0);
  await naturalText(tourLine(page, "ct_walk"), "ct_walk", false, { glossLine: true });

  setPhase("stop 1, fish school and a real choice");
  const fish = await awaitChoices(h, sample, 1);
  await checkTurn(h, fish);
  await watchMotion(h, 1, 12, "05-school", sample);
  await holdAt(h, 42, fish.cue, sample);
  if (h.phone) await choice(page, branch.fish).tap();
  else await page.keyboard.press(String(fish.keys.indexOf(branch.fish) + 1));
  await checkReply(h, fish.cue, branch.fish, branch.fishReply, sample);

  setPhase("stop 2, turtle pair and speech retry");
  const turtles = await awaitChoices(h, sample, 2);
  await checkTurn(h, turtles);
  await watchMotion(h, 2, 2, "06-pair", sample);
  await holdAt(h, 62, turtles.cue, sample);
  if (!(await read()).listening) await h.press(mic(page));
  await wait("the turtle question is listening", (s) => s.listening);
  const wrong = "Mi ventana es cuadrada";
  await say(h, wrong);
  const status = page.locator(`.cenote-tour-card [role="status"][lang="${learner}"]`);
  // The recognizer commits on real timers, and the mode retries on its frame clock.
  await wait("the unrelated utterance leaves the turtle question open", (s) => s.miss !== undefined,
    { frames: 3, maxFrames: 1500, sample });
  await visibleText(status, `${names.again} ${wrong}`);
  await visibleText(status.locator('[lang="es"]'), wrong);
  const same = await read();
  assert.equal(same.tour.lineKey, turtles.cue);
  assert.equal(same.tour.elapsed, 62);
  assert.deepEqual(same.choices, turtles.keys);
  assert.equal(await answerLine(page, branch.turtle).count(), 0);
  await unitText(tourLine(page, turtles.cue), turtles.cue);
  for (const key of turtles.keys) await naturalText(choice(page, key), key, true);
  await target(page.locator('.cenote-tour-card [data-action="natural"]'));
  await projectedAnimals(h, 2, 2);
  await shot("06-pair-retry");
  await wait("the speech stub is listening again", (s) => s.listening, { frames: 6, sample });
  await say(h, branch.speech);
  await checkReply(h, turtles.cue, branch.turtle, branch.turtleReply, sample);

  setPhase("dry return after ct_home");
  const homeLine = await wait("ct_home at the hut before completion", (s) => s.tour?.lineKey === "ct_home",
    { frames: 24, maxFrames: 1200, ms: 120000, sample });
  assert.equal(homeLine.tour.state, "returning");
  assert.equal(homeLine.tour.stopIndex, -1);
  assert.equal(homeLine.tour.animalCount, 0);
  assert(distance(homeLine.pose, outing.hut) <= 0.35);
  await unitText(tourLine(page, "ct_home"), "ct_home");
  await naturalText(tourLine(page, "ct_home"), "ct_home", false, { glossLine: true });
  const home = await wait("normal tour completion", (s) => s.tour?.lastExit === "finished", { frames: 12, sample });
  assert.equal(home.tour.elapsed, outing.elapsed, "authored route seconds");
  const measured = samples.finish(branch);
  const travelSeconds = (home.now - aboard.now) / 1000 - measured.held;
  assert(travelSeconds >= 60 && travelSeconds <= 120, `frame-measured travel after the held turns: ${travelSeconds}s`);
  console.log(h.label, "normal run", JSON.stringify({ elapsed: home.tour.elapsed, travelSeconds, ...measured }));
  await advance(30);
  await assertDry(h, await read(), "finished", 1);
  await shot("07-home");
}

function dryPose(p, ground) {
  assert(Number.isFinite(ground.floorY) && Math.abs(p.y - ground.floorY) <= 0.1, `feet on actual terrain: ${JSON.stringify({ p, ground })}`);
  assert(ground.waterY === null || ground.waterY <= ground.floorY, `dry terrain: ${JSON.stringify(ground)}`);
}

function savedHut(place) {
  assert.equal(place?.zone, "town");
  assert(distance(place, outing.hut) <= 0.35 && Math.abs(place.rot + Math.PI / 2) <= 0.1 && !place.boat, `saved dry hut pose: ${JSON.stringify(place)}`);
}

async function assertDry(h, s, reason, count) {
  noLaunch(s, count, count);
  assert.equal(s.zone, "town");
  assert.equal(s.tour.lastExit, reason);
  assert.equal(s.tour.stopIndex, -1);
  assert.equal(s.tour.lineKey, null);
  assert.equal(s.tour.viewer, null);
  assert.equal(s.tour.animalCount, 0);
  assert(distance(s.pose, outing.hut) <= 0.35 && s.pose.visible, JSON.stringify(s.pose));
  dryPose(s.pose, s.tour);
  assert(!s.swimming && s.dive === 0 && s.wading === 0 && !s.undersea);
  assert(!s.session && !s.ride && !s.listening && !s.chat.active && s.chat.completed);
  assert.equal(s.voice, "idle", "tour speech is stopped on return");
  assert.equal(s.modeBed, null, "the tour leaves no mode audio playing");
  assert(s.follow && s.camera === "follow" && !s.stage);
  assert(s.hudMode === null && s.hudRide === null && !s.hudFade && !s.curtain);
  assert.equal(s.miss, undefined, "no retry status on return");
  assert.equal(await h.page.locator(".mode-hud, .cenote-tour-card, .cenote-tour-curtain, .ride-strip, .surf-toolbar").count(), 0);
  assert(await h.page.locator(".toolbar").isVisible());
  assert(await h.page.locator(".minimap").isVisible());
  assert(await h.page.locator(h.phone ? ".joy" : ".prompt").isVisible());
  savedHut(s.saved);
}

async function walkDry(h) {
  const { context, page, phone, step } = h;
  const start = (await h.read()).pose;
  if (phone) {
    const box = await page.locator(".joy").boundingBox();
    assert(box);
    const touch = await context.newCDPSession(page);
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height * 0.73 }] });
    try {
      await step(42);
    } finally {
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await touch.detach();
    }
  } else {
    await page.keyboard.down("ArrowDown");
    try {
      await step(42);
    } finally {
      await page.keyboard.up("ArrowDown");
    }
  }
  await step(12);
  const after = await h.read();
  assert(distance(after.pose, [start.x, start.z]) >= 0.5, `normal walking moved on dry ground: ${JSON.stringify({ start, after: after.pose })}`);
  dryPose(after.pose, after.tour);
  assert(!after.swimming && after.zone === "town" && after.camera === "follow");
}

async function lookAtCards(h, branch) {
  const { page, press, shot, setPhase } = h;
  setPhase("walk dry and open the actual saved cards");
  await walkDry(h);
  await toolbarButton(h, new RegExp(`^${names.phrasebook}(?: \\(\\d+\\))?$`));
  await press(page.locator(".pb-tabs").getByRole("tab").nth(1));
  const list = page.locator(".my-cards .cd-list");
  const expected = [branch.fish, branch.turtle].map((key) => ({ en: spanish(key), lt: natural(key), situationId: id }));
  const persisted = await page.evaluate((prefix) => JSON.parse(localStorage.getItem(prefix + "-cards-v1"))?.cards, storage);
  assert.deepEqual(persisted.map(({ en, lt, situationId }) => ({ en, lt, situationId })), expected);
  for (const card of expected) {
    const row = list.locator(".cd-row").filter({ has: page.getByText(card.en, { exact: true }) });
    assert.equal(await row.count(), 1, `one saved card row for "${card.en}"`);
    await row.scrollIntoViewIfNeeded();
    await visibleText(row.locator('.cd-en[lang="es"]'), card.en);
    await visibleText(row.locator(`.cd-lt[lang="${learner}"]`), card.lt);
  }
  await shot("09-cards");
  await press(page.locator(".sheet .sheet-head").getByRole("button", { name: names.close, exact: true }));
}

async function liveExit(h, branch) {
  h.setPhase("walk back to Inés through the map controls");
  await h.press(h.page.locator(".minimap"));
  await h.press(h.page.locator('.map-pin[data-location="cenote-tour"]'));
  await h.press(h.page.locator(".sheet .sit-list").getByRole("button", { name: names.walk, exact: true }));
  await h.wait("Inés's prompt still works after the walk", (s) => s.prompt?.kind === "talk" && s.prompt.label === names.talk
    && distance(s.pose, outing.hut) <= 0.35, { frames: 12, maxFrames: 600 });
  await board(h, branch, 2);
  h.setPhase("leave the second outing while the mic is listening");
  const active = await awaitChoices(h, undefined, 1);
  const wet = await h.read();
  assert(wet.tour.viewer.submerged && wet.tour.animalCount === 12 && wet.listening && wet.starts === 2);
  assert.equal(wet.tour.run, 2);
  assert.equal(wet.tour.lastExit, null);
  assert.equal(active.cue, "ct_see");
  assert.equal(await leave(h.page).getAttribute("aria-label"), names.leave);
  await target(leave(h.page));
  if (h.phone) await leave(h.page).tap();
  else await h.page.keyboard.press("Escape");
  await h.wait("early exit completes", (s) => s.tour?.lastExit === "left");
  await h.advance(30);
  const left = await h.read();
  await assertDry(h, left, "left", 2);
  assert(left.tour.elapsed < 42 && left.tour.elapsed < outing.elapsed, JSON.stringify(left.tour));
  assert.equal(await h.page.evaluate(() => window.__speak("Sí, los veo")), false);
  await h.advance(300);
  await assertDry(h, await h.read(), "left", 2);
  await h.shot("08-left");
}

async function reloadWet(h, branch) {
  const { page, wait, advance, read, setPhase } = h;
  await board(h, branch, 3);
  setPhase("five-second autosave and reload from a live wet stage");
  const wet = await wait("wet pose with wildlife", (s) => s.tour?.elapsed >= 25 && s.tour.viewer?.submerged && s.tour.animalCount > 0,
    { frames: 30, maxFrames: 1800, ms: 180000 });
  await advance(6 * 60);
  const live = await read();
  assert.equal(live.mode, mode);
  assert(live.tour.viewer.submerged && live.pose.z < -90 && live.tour.waterY > live.pose.y, JSON.stringify(live));
  const writes = await page.evaluate((since) => window.__cenoteSaves.filter((entry) => entry.at > since && entry.actorZ < -90), wet.now);
  assert(writes.length >= 1, `five-second autosave wrote during the wet pose: ${JSON.stringify(writes)}`);
  for (const { place } of writes) savedHut(place);
  savedHut(live.saved);
  await page.reload({ waitUntil: "domcontentloaded" });
  await h.boot();
  await advance(30);
  const reloaded = await read();
  assert.equal(reloaded.zone, "town");
  assert.equal(reloaded.tour.run, 0, "reload did not start another tour");
  assert.equal(reloaded.tour.lastExit, null);
  assert.equal(reloaded.starts, 3);
  assert.equal(reloaded.completions, 3);
  assert(distance(reloaded.pose, outing.hut) <= 0.35 && reloaded.camera === "follow" && !reloaded.swimming);
  assert(!reloaded.undersea && !reloaded.listening && !reloaded.chat.active && !reloaded.session && reloaded.mode === null);
  assert.deepEqual(reloaded.tour.animals, []);
  assert.equal(reloaded.wildlifeAttached, false);
  assert.equal(reloaded.voice, "idle");
  assert.equal(reloaded.modeBed, null);
  dryPose(reloaded.pose, reloaded.tour);
  savedHut(reloaded.saved);
  assert(await page.locator(".toolbar").isVisible());
  await h.shot("10-reload");
}

async function town(h) {
  const branch = outing.paths[h.phone ? "phone" : "keyboard"];
  await discover(h);
  await decline(h);
  const aboard = await board(h, branch, 1);
  await completeTour(h, branch, aboard);
  await lookAtCards(h, branch);
  await liveExit(h, branch);
  await h.monitor.flush();
  assert.deepEqual(h.monitor.errors, [], "no page, console or resource errors through both exits");
  assert(h.monitor.requests.some(requestedStage) || h.monitor.runtime.size > 0, "a genuine start loads the stage lazily");
  await reloadWet(h, branch);
}

async function light(h) {
  const { page, press, wait, shot, read, monitor, setPhase } = h;
  setPhase("LightHome picker and Inés's pictures");
  const initial = await read();
  assert(initial.light && initial.pictures);
  assert.equal(initial.tour, undefined);
  const card = await checkPicker(page, "lh");
  const run = await enterChat(h, true, card);
  // Inés's stills (review round pictures): picture mode shows her welcome picture behind the chat, both stills loaded
  // ahead for the crossfade (the portrait card stays away while a scene is on)
  await page.waitForFunction(() => {
    const imgs = [...document.querySelectorAll(".scene-backdrop img")];
    return imgs.length === 2 && imgs.every((img) => img.complete && img.naturalWidth > 0);
  }, undefined, { timeout: 30000 });
  const backdrop = await page.locator(".scene-backdrop img.on").evaluate((img) => new URL(img.currentSrc || img.src).pathname);
  assert(/\/scenes-es\/x14-cenote\/welcome\.webp$/.test(backdrop), `the picture mode opens on Inés's welcome still: ${backdrop}`);
  assert.equal(await page.locator(".lc-avatar").count(), 0, "no portrait card over the scene");
  assert.equal(await page.locator(".stage canvas").count(), 0);
  await shot("11-light");

  setPhase("LightHome can finish the affirmative chat");
  const branch = outing.paths[h.phone ? "phone" : "keyboard"];
  const order = await positiveChat(h, branch, run, { first: true });
  const ended = await wait("completed LightHome chat", (s) => s.chat?.active && s.chat.run === run && s.chat.phase === "ended"
    && s.chat.key === "meet_deck" && s.chat.completed);
  await visibleText(page.locator(".ended-box .ended-title"), names.completed);
  assert.equal(ended.starts, 0);
  assert.equal(ended.completions, 1);
  assert.equal(ended.tour, undefined);
  assert.equal(await page.locator(".cenote-tour-cta, .mode-hud, .cenote-tour-card").count(), 0);
  await order();
  await press(page.locator(".convo-head").getByRole("button", { name: names.end, exact: true }));
  await wait("return to the LightHome picker", (s) => !s.chat?.active && !s.session && s.light);
  assert(await card.isVisible());
  await monitor.flush();
  assert.deepEqual(monitor.requests.filter(requestedStage), [], "picture mode never requests stage scripts or CSS");
  assert.deepEqual([...monitor.runtime], [], "picture mode never loads the tour runtime");
}

if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
try {
  const failures = [];
  for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    for (const [play, run] of [["town", town], ["light", light]]) {
      try {
        await visit(browser, viewport, play, run);
        console.log(`ok PC-${learner} ${viewport.width}x${viewport.height} ${play}`);
      } catch (error) {
        failures.push(error);
      }
    }
  }
  if (failures.length) throw new AggregateError(failures, `PC-${learner} cenote-tour failures`);
} finally {
  await browser.close();
}
