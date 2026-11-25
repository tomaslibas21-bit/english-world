// Run with a local development server. Optionally set WORLD_TEST_URL, WORLD_STORAGE,
// WORLD_LEARNER, WORLD_VARIETY, WORLD_SHOTS, WORLD_PLAYWRIGHT_MODULE, WORLD_BROWSER_CHANNEL,
// WORLD_PHONE_WIDTH/HEIGHT or WORLD_SPAWN ("x,z,rot").
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";
import { activatePhraseControl, cardsFor, checkManualSave } from "./fixtures/phrase-saves.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const spanish = storage === "puerto-colibri";
const variety = process.env.WORLD_VARIETY || "default";
const learner = process.env.WORLD_LEARNER || (spanish ? "en" : "lt");
const targetLang = spanish ? "es" : "en";
const dropped = "i_dropped";
const { STREET_MOMENTS: moments, STREET_CHATTER: chatters } = await tsImport(spanish ? "../../src/editions/es/content/street.ts"
  : "../../src/content/street.ts", import.meta.url);
const musician = moments.find(({ kind, cast }) => kind === "regular" && cast.some(({ prop }) => prop === "guitar"));
assert(musician, "the edition has a regular with a guitar");
const droppedSource = moments.find(({ id }) => id === dropped);
const lithuanianLayer = spanish && learner === "lt";
const lithuanian = lithuanianLayer ? JSON.parse(await readFile(
  new URL("../../src/editions/es-lt/tables/street.json", import.meta.url), "utf8")).text : null;
const key = `${storage}-progress-v1`;
const cardsKey = process.env.WORLD_CARDS_KEY || `${storage}-cards-v1`;
const shots = process.env.WORLD_SHOTS || process.env.WORLD_SHOT_DIR || "/tmp";
const size = process.env.WORLD_PHONE_WIDTH || process.env.WORLD_PHONE_HEIGHT
  ? [[Number(process.env.WORLD_PHONE_WIDTH || 390), Number(process.env.WORLD_PHONE_HEIGHT || 844)]]
  : [[390, 844], [390, 664], [844, 390], [1280, 800]];
const [x, z, rot] = (process.env.WORLD_SPAWN || `28,-20,${Math.PI}`).split(",").map(Number);
const phone = process.env.WORLD_STREET_CALL || "s76-dentist-call";
const completed = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, phoneCalls: false, sayLt: true, cameraFollow: true },
  sits: Object.fromEntries(["s76-dentist-call", "s80-support-call", "s89-video-call", "s90-running-late", "s63-party", "p26-complaint"].map((id) => [id, completed])),
  phrases: {}, seenIntro: {}, started: 1, objective: "s83-invite-call",
  place: { zone: "town", x, z, rot },
  coach: { done: true, seen: { list: true }, run: true, view: true },
};

function installTestControls({ key, progress, varietyKey, variety }) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress));
  if (varietyKey) localStorage.setItem(varietyKey, variety);
  let now = 1000, next = 0;
  const frames = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (fn) => { frames.set(++next, fn); return next; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__stepStreet = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      const ready = [...frames.values()];
      frames.clear();
      for (const frame of ready) frame(now);
    }
  };
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  if (window.speechSynthesis) speechSynthesis.speak = (utterance) => setTimeout(() => utterance.onend?.(), 0);
}

const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withGame([width, height], settings, check, { params = "", spanishVariety = variety } = {}) {
  const mobile = Math.min(width, height) <= 520;
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(installTestControls, {
      key, varietyKey: spanish ? `${storage}-variety` : null, variety: spanishVariety,
      progress: { ...progress, settings: { ...progress.settings, ...settings } },
    });
    const target = new URL(url);
    for (const [k, v] of new URLSearchParams(params)) target.searchParams.set(k, v);
    await page.goto(target.href, { waitUntil: "domcontentloaded" });
    const step = (count = 1, ms = 50) => page.evaluate(([n, dt]) => window.__stepStreet(n, dt), [count, ms]);
    const wait = async (predicate, description) => {
      for (let i = 0; i < 320; i++) {
        if (await predicate()) return;
        await step(2);
        await real(15);
      }
      const debug = await page.evaluate(() => ({
        screen: window.__ew?.store.getState().screen,
        street: window.__ew?.game.streetState?.(),
      }));
      assert.fail(`${width}x${height} ${learner}/${spanishVariety}: ${description}. ${JSON.stringify(debug)} ${errors.join("; ")}`);
    };
    const state = () => page.evaluate(() => window.__ew.game.streetState());
    const force = (id, cast) => page.evaluate(([id, cast]) => window.__ew.game.streetNow(id, cast), [id, cast]);
    const advance = (seconds) => page.evaluate((seconds) => window.__ew.game.streetAdvance(seconds), seconds);
    const card = page.locator("section.street-card");
    const turn = (exchange = 0) => wait(() => page.locator(
      `.street-card[data-step="choices"][data-exchange="${exchange}"] .street-choice`).first().isVisible(),
    `expected answer chips for exchange ${exchange}`);
    const closed = () => wait(async () => !(await state()).active && !(await card.count()), "street moment closes");
    const press = async (locator) => {
      let done = false;
      const frames = (async () => { while (!done) { await step(1, 0); await real(20); } })();
      try { await (mobile ? locator.tap({ timeout: 4000 }) : locator.click({ timeout: 4000 })); }
      finally { done = true; await frames; }
    };
    const dismiss = () => press(card.locator(".street-head .street-icon-btn").first());
    const shot = async (name) => {
      await real(250);
      await page.screenshot({ path: join(shots, `${spanish ? "pc" : "mh"}-${learner}-${width}x${height}-street-${name}.png`) });
    };
    assert.equal(await page.locator("html").getAttribute("lang"), learner, "WORLD_LEARNER matches the server");
    await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "game is ready");
    if (settings.play !== "light") {
      // Leave the world clock where it is so a dev URL still starts at its scene.
      await page.waitForFunction(() => !window.__ew.store.getState().hud.zoneBanner, undefined, { polling: 50 });
    }
    await step(4);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await check({ page, step, state, force, advance, wait, turn, closed, press, dismiss, card, shot });
    assert.deepEqual(errors, [], "page has no uncaught errors");
  } finally { await context.close(); }
}

async function assertPicture(card) {
  const picture = card.locator(".street-picture");
  assert(await picture.isVisible(), "the picture strip is visible");
  const art = await picture.evaluate((element) => {
    const placeholder = element.querySelector(".street-picture-art");
    return {
      height: element.getBoundingClientRect().height,
      icons: placeholder && [...placeholder.querySelectorAll("svg")].map((icon) => icon.getBoundingClientRect().width),
    };
  });
  if (art.icons) {
    assert(art.height >= 62 && art.height <= 66, "picture placeholder is compact");
    assert.equal(art.icons.length, 2);
    assert(art.icons.every((width) => width >= 27), "the role and prop icons are legible");
  } else assert(art.height <= 161, "real pictures fit the height limit");
}

const byCast = (value, cast) => value?.byCast?.[cast] ?? value;
const resolveGender = (text, learnerGender, castGender) => text?.replace(/\{(m|nm):([^{}|]*)\|(?:f|nf):([^{}|]*)\}/g,
  (_match, who, male, female) => (who === "m" ? learnerGender : castGender) === "m" ? male : female);

async function authoredMoment(page) {
  const { script, cast, learnerGender, selectedVariety } = await page.evaluate((storage) => {
    const { script, cast } = window.__ew.game.streetLife.active.draw;
    return { script, cast, learnerGender: window.__ew.store.getState().progress.profile.gender,
      selectedVariety: localStorage.getItem(`${storage}-variety`) };
  }, storage);
  const resolve = (text) => resolveGender(text, learnerGender, cast.gender);
  const words = (line) => ({
    en: resolve(spanish && selectedVariety === "spain" ? line.spain ?? line.neutral ?? line.en
      : spanish && selectedVariety === "neutral" ? line.neutral ?? line.en : line.en),
    lt: resolve(line.lt),
  });
  return {
    role: resolve(cast.role),
    scene: resolve(byCast(script.scene, cast.id)),
    choices: script.choices.map(({ say }) => words(byCast(say, cast.id))),
    followUpChoices: script.then?.choices.map(({ say }) => words(byCast(say, cast.id))),
    reply: byCast(script.choices[0].reply ?? script.reply, cast.id)?.map(words),
    closing: script.then && byCast(script.then.choices[0].reply ?? script.then.reply, cast.id)?.map(words).at(-1),
    card: script.card && words(byCast(script.card, cast.id)),
  };
}

const lineText = (line) => line.locator(".kit-gloss-compact > span");
const replyButton = (page) => page.locator('.street-card[data-step="reply"] .street-line');
const overheard = learner === "lt" ? "Išgirsta gatvėje" : "Overheard";

function streetSnapshot(page) {
  return page.evaluate(() => {
    const { game, store } = window.__ew;
    const { hud, conv, progress } = store.getState();
    const chatter = game.streetLife?.overheard;
    return { street: game.streetState(), panel: hud.panel, talking: conv.active, memory: progress.street,
      chatter: chatter && [chatter.id, chatter.extended, game.streetLife.bubbleLeft, document.querySelector(".street-bubble")?.style.transform],
      player: game.player?.root.position.toArray(), pointer: game.pointer, air: game.hop?.air, keys: game.keys && [...game.keys] };
  });
}

async function checkStreetSave(page, button, touch, { en, lt }, role) {
  const box = async () => button.evaluate((el) => {
    const rect = el.getBoundingClientRect(), parent = el.parentElement.getBoundingClientRect();
    return [rect.left - parent.left, rect.top - parent.top, rect.width, rect.height];
  });
  const before = await box();
  const card = await checkManualSave(page, button, touch, en, "street", () => streetSnapshot(page));
  assert.deepEqual([card.lt, card.sentence, card.sourceLabel], [lt, { en, lt }, role]);
  assert.deepEqual(await box(), before, "the checked street save keeps its original box");
  return card;
}

async function assertSaveSiblings(container, actionSelector) {
  const geometry = await container.evaluate((row, selector) => {
    const action = row.querySelector(selector);
    const save = row.querySelector("[data-phrase-save]");
    const box = (el) => el.getBoundingClientRect();
    const a = box(action), b = box(save), neighbor = box(save.previousElementSibling);
    const hit = (el, r) => el.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
    return { gap: b.left - neighbor.right, width: b.width, height: b.height,
      actionWidth: a.width, actionHeight: a.height, hit: hit(action, a) && hit(save, b) };
  }, actionSelector);
  assert(geometry.hit && geometry.gap >= 4 && geometry.gap <= 8 &&
    [geometry.width, geometry.height, geometry.actionWidth, geometry.actionHeight].every((size) => size >= 44),
  `distinct 44 px control centres and a 4–8 px gutter: ${JSON.stringify(geometry)}`);
}

async function checkMovingChatter(page, bubble, viewport) {
  const point = await page.evaluate(() => {
    const canvas = document.querySelector(".stage canvas");
    for (const y of [0.7, 0.5, 0.6, 0.4].map((n) => innerHeight * n)) {
      for (const x of [0.5, 0.3, 0.65].map((n) => innerWidth * n)) {
        if (document.elementFromPoint(x, y) === canvas) return { x, y };
      }
    }
    return null;
  });
  assert(point, "the canvas has a clear point for the camera drag");
  const cdp = Math.min(...viewport) <= 520 ? await page.context().newCDPSession(page) : null;
  const finger = (type, at) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: at ? [at] : [] });
  const camera = () => page.evaluate(() => window.__ew.game.rig.cam.position.toArray());
  const start = await camera();
  if (cdp) await finger("touchStart", point);
  else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
  }
  let taggedFrames = 0;
  try {
    for (let i = 1; i <= 6; i++) {
      const at = { x: point.x + 4 * i, y: point.y };
      if (cdp) await finger("touchMove", at);
      else await page.mouse.move(at.x, at.y);
      const sample = await bubble.evaluate((el, refreshTownHud) => {
        const { game } = window.__ew;
        const layer = document.querySelector(".tag-layer");
        const hud = el.parentElement;
        const controls = hud.querySelectorAll(".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, " +
          ".minimap, .toolbar, .toolbar .radio-tool, .joy, .jump-btn, .act-btn, .prompt, .toolbar-drawer, .toolbar-tools");
        const stableBlockers = new Set([...controls].filter((control) => control.checkVisibility({ visibilityProperty: true })));
        const alreadyPlaced = new Set(game.nametagLayout.boxes.map(({ tag }) => tag));
        const nativeRect = Element.prototype.getBoundingClientRect;
        const updateTags = game.updateTags;
        const hudBoxes = game.hudBoxes;
        const offsets = ["offsetWidth", "offsetHeight"].map((key) =>
          [key, Object.getOwnPropertyDescriptor(HTMLElement.prototype, key)]);
        let inTags = false, inTownHud = false;
        let reads = 0, layerRects = 0, groupRects = 0, uiRects = 0, blockerRects = 0, townBlockerRects = 0;
        let frameSizes = 0, tagSizes = 0;
        game.updateTags = function () {
          inTags = true;
          try { return updateTags.call(this); }
          finally { inTags = false; }
        };
        game.hudBoxes = function () {
          inTownHud = true;
          try { return hudBoxes.call(this); }
          finally { inTownHud = false; }
        };
        Element.prototype.getBoundingClientRect = function () {
          if (this.classList.contains("nametag")) reads++;
          if (this === layer) layerRects++;
          if (this === el || this === hud) {
            if (inTags) groupRects++;
            else uiRects++;
          }
          if (stableBlockers.has(this)) {
            if (inTownHud) townBlockerRects++;
            else if (inTags) blockerRects++;
          }
          return nativeRect.call(this);
        };
        for (const [key, descriptor] of offsets) Object.defineProperty(HTMLElement.prototype, key, {
          ...descriptor,
          get() {
            if (this === layer || this === el || this === hud) frameSizes++;
            if (alreadyPlaced.has(this)) tagSizes++;
            return descriptor.get.call(this);
          },
        });
        try {
          // One actual periodic refresh proves the same elements are counted separately.
          if (refreshTownHud) game.hudCheck = 1;
          window.__stepStreet(1, 16);
        }
        finally {
          delete game.updateTags;
          delete game.hudBoxes;
          Element.prototype.getBoundingClientRect = nativeRect;
          for (const [key, descriptor] of offsets) Object.defineProperty(HTMLElement.prototype, key, descriptor);
        }
        // The test's own clearance reads happen after restoring the native accessors.
        const r = el.getBoundingClientRect();
        const tags = [...document.querySelectorAll(".nametag")].filter((tag) => tag.checkVisibility({ visibilityProperty: true }));
        const clears = (control) => {
          const b = control.getBoundingClientRect();
          return !b.width || !b.height || r.left >= b.right || r.right <= b.left || r.top >= b.bottom || r.bottom <= b.top;
        };
        return { reads, layerRects, groupRects, uiRects, frameSizes, tagSizes, blockerRects, townBlockerRects,
          tags: tags.length, clear: tags.every(clears), clearHud: [...stableBlockers].every(clears),
          landmarks: [".objective-card", ".minimap", ".toolbar"].every((selector) => stableBlockers.has(hud.querySelector(selector))),
          visible: getComputedStyle(el).visibility === "visible" };
      }, i === 1);
      assert.equal(sample.reads, 0, "live chatter placement reads no nametag DOMRects");
      assert.deepEqual([sample.layerRects, sample.groupRects, sample.frameSizes, sample.tagSizes], [0, 0, 0, 0],
        "steady chatter reuses the layer transform, group size and already placed tag sizes");
      assert.equal(sample.uiRects, 0, "the former UI loop's group and HUD reads do not recur outside tag placement");
      assert(sample.landmarks, "each sample counts the visible task card, map and toolbar");
      if (i === 1) assert(sample.townBlockerRects > 0, "the town's periodic HUD reads reached the sampled blockers");
      assert.equal(sample.blockerRects, 0, "steady chatter reuses the cached blocker bounds during tag placement");
      assert(sample.visible && sample.clear, "the moving bubble stays visible and clears the tags");
      assert(sample.clearHud, "the moving bubble clears the stable HUD controls");
      await assertSaveSiblings(bubble, ".street-bubble-text");
      if (sample.tags) taggedFrames++;
    }
  } finally {
    if (cdp) { await finger("touchEnd"); await cdp.detach(); }
    else await page.mouse.up();
  }
  assert(Math.hypot(...(await camera()).map((n, i) => n - start[i])) > 0.01, "the camera moves during the cost sample");
  assert(taggedFrames > 1, "multiple frames exercise visible nametags");
}

async function checkResizedTag(bubble, viewport) {
  const sample = await bubble.evaluate(async (el) => {
    const { nametagLayout: layout } = window.__ew.game;
    const tag = layout.boxes.find(({ tag }) => tag.checkVisibility({ visibilityProperty: true }))?.tag;
    if (!tag) return null;
    const role = tag.querySelector("i, span");
    const layer = tag.parentElement;
    const { transform, transformOrigin, right, bottom } = layer.style;
    const { fontSize } = role.style;
    const oldHeight = tag.offsetHeight;
    const oldWidth = layer.offsetWidth, oldLayerHeight = layer.offsetHeight;
    const pool = layout.boxes;
    const oldBox = pool.find((box) => box.tag === tag);
    try {
      role.style.fontSize = "18px";
      layer.style.right = "8px";
      layer.style.bottom = "6px";
      layer.style.transformOrigin = "top left";
      layer.style.transform = "translate(5px, 3px) scale(0.98, 0.97)";
      // The stepped frame replaces native rAF. Give DOM mutations the same microtask checkpoint.
      await Promise.resolve();
      window.__stepStreet(1, 0);
      const r = tag.getBoundingClientRect(), a = el.getBoundingClientRect();
      const box = layout.boxes.find((box) => box.tag === tag);
      if (!box || !layout.rect) return null;
      const { rect, scaleX, scaleY } = layout;
      return { reused: pool === layout.boxes && oldBox === box, grew: tag.offsetHeight > oldHeight,
        resized: layer.offsetWidth < oldWidth && layer.offsetHeight < oldLayerHeight,
        clears: a.left >= r.right || a.right <= r.left || a.top >= r.bottom || a.bottom <= r.top,
        error: Math.max(Math.abs(rect.left + scaleX * box.x0 - r.left), Math.abs(rect.left + scaleX * box.x1 - r.right),
          Math.abs(rect.top + scaleY * box.y0 - r.top), Math.abs(rect.top + scaleY * box.y1 - r.bottom)) };
    } finally {
      role.style.fontSize = fontSize;
      layer.style.right = right;
      layer.style.bottom = bottom;
      layer.style.transform = transform;
      layer.style.transformOrigin = transformOrigin;
      await Promise.resolve();
      window.__stepStreet(1, 0);
    }
  });
  assert(sample?.reused && sample.grew && sample.resized && sample.clears && sample.error <= 0.51,
    `${viewport.join("x")}: the pooled box tracks the resized tag in its offset, scaled layer (${JSON.stringify(sample)})`);
}

async function assertTranslation(line, press, expected) {
  if (await line.getAttribute("aria-expanded") === "false") await press(line);
  const translation = line.locator(".street-tr");
  await translation.waitFor({ state: "visible", timeout: 4000 });
  assert.equal(await line.getAttribute("aria-expanded"), "true");
  assert.equal(await translation.getAttribute("lang"), learner);
  if (expected !== undefined) assert.equal(await translation.textContent(), expected);
}

async function assertChoices(card, expected) {
  const choices = card.locator('.street-choice[data-translated="true"]');
  assert.equal(await card.locator(".street-choice").count(), expected.length);
  assert.deepEqual(await lineText(choices).allTextContents(), expected.map(({ en }) => en));
  assert.deepEqual(await choices.locator(`small[lang="${learner}"]`).allTextContents(), expected.map(({ lt }) => lt));
}

const walletCast = droppedSource.cast.find(({ id }) => id === "a");
const keysCast = droppedSource.cast.find(({ id }) => id === "b");
const walletReplies = byCast(droppedSource.first.choices[0].reply ?? droppedSource.first.reply, walletCast.id);
const tableReply = lithuanian?.[walletReplies[0].lt];
const translatedReply = resolveGender(tableReply, progress.profile.gender, walletCast.gender);
const sharedRole = lithuanian && /^\{nm:([^{}|]+)\|nf:([^{}|]+)\}$/.exec(lithuanian[walletCast.role]);
if (lithuanianLayer) {
  assert(tableReply && tableReply !== walletReplies[0].lt, "the Lithuanian table translates the wallet reply");
  assert.equal(walletCast.role, keysCast.role, "the two cast members share the source role");
  assert(sharedRole && sharedRole[1] !== sharedRole[2], "the Lithuanian table defines both forms of the shared role");
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: process.platform === "darwin" ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
    : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
try {
  await mkdir(shots, { recursive: true });
  await withGame(size[0], {}, async ({ page, step, state, force, advance, wait, card, dismiss, closed }) => {
    const first = await state();
    assert(first.due >= 120 && first.due <= 180);
    await advance(first.due - first.clock - 6);
    assert.equal((await state()).active, null, "too early");
    await page.evaluate((id) => window.__ew.game.startScenario(id), phone);
    await wait(() => page.evaluate(() => window.__ew.store.getState().conv.active), "conversation opens");
    const before = (await state()).clock;
    await advance(500);
    assert.equal((await state()).clock, before);
    assert.equal((await state()).active, null);
    assert.equal(await force(dropped, "a"), false);
    await page.evaluate(() => window.__ew.game.closeConversation());
    await wait(() => page.evaluate(() => !window.__ew.store.getState().conv.active), "conversation closes");
    await step(); // Restore the town camera's viewport offset after the call.
    await advance(29);
    assert.equal((await state()).active, null, "street stays quiet for 30 seconds after talking");
    await advance(1.05);
    await wait(() => card.isVisible(), "street card opens past the deadline");
    await page.evaluate(() => {
      window.__ew.store.getState().setSettings({ phoneCalls: true });
      window.__ew.game.phoneDueNow();
    });
    const phoneCard = () => page.evaluate(() => window.__ew.game.phoneState().card);
    await step(1, 10500);
    assert.equal(await phoneCard(), null, "street has exclusive card priority");
    await dismiss();
    await closed();
    await step(1, 9700);
    assert.equal(await phoneCard(), null, "phone waits ten more seconds");
    await step(1, 350);
    await wait(() => page.locator(".phone-ring").isVisible(), "the due phone card opens after the street cooldown");
  });

  if (spanish) {
    for (const twin of ["spain", "neutral"]) {
      await withGame(size[0], { play: "light" }, async ({ page, force, turn, press, wait, card }) => {
        const source = walletReplies.find((line) => line[twin] && line[twin] !== line.en);
        assert(source, `the wallet scene has a distinct ${twin} reply`);
        const expected = resolveGender(source[twin], progress.profile.gender, walletCast.gender);
        assert(await force(dropped, "a"));
        await turn();
        await press(card.locator(".street-choice").first());
        const reply = lineText(replyButton(page));
        await wait(async () => await reply.isVisible() && await reply.textContent() === expected,
          `the reply displays the authored ${twin} twin`);
        assert.equal(await reply.getAttribute("lang"), targetLang);
      }, { spanishVariety: twin });
    }
  }

  for (const [index, viewport] of size.entries()) {
    console.log(`Street life ${storage}/${learner} ${viewport.join("x")}`);
    await withGame(viewport, {}, async ({ page, step, state, force, wait, turn, closed, press, dismiss, card, shot }) => {
      if (index === 0) assert(await force(dropped, "a"));
      const scene = page.locator('.street-card[data-step="scene"] .street-scene');
      await wait(() => scene.isVisible(), "the street scene is shown");
      const authored = await authoredMoment(page);
      const role = card.locator(".street-head strong");
      assert.equal(await role.textContent(), sharedRole ? sharedRole[1] : authored.role);
      assert.equal(await scene.textContent(), authored.scene);
      await shot("scene");
      await turn();
      assert.equal(await card.getAttribute("data-moment"), dropped);
      assert.equal(await card.getAttribute("data-cast"), "a");
      assert.equal(await card.getAttribute("data-script"), "first");
      assert.equal(await card.locator(".street-picture").count(), 0);
      assert(await card.locator(".street-scene").isVisible(), "the wallet description stays visible with the first choices");
      const assertCardFits = async () => {
        const fit = await card.evaluate((element) => {
          const a = element.getBoundingClientRect();
          const controls = document.querySelectorAll(".joy, .act-btn, .jump-btn, .toolbar button, .minimap, .nametag");
          const overlap = [...controls].some((control) => {
            const b = control.getBoundingClientRect();
            return getComputedStyle(control).visibility === "visible" && b.width > 0 && b.height > 0 &&
              a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          });
          // Playwright considers text visible even when the card's scrollport clips its last line.
          const clipped = [...element.querySelectorAll(".street-scene, .street-tr, .street-choice small")].filter((line) => {
            const box = line.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.top < a.top - 1 || box.bottom > a.bottom + 1 || box.left < a.left - 1 || box.right > a.right + 1);
          }).map((line) => line.textContent);
          return { overlap, clipped, height: a.height, viewport: innerHeight };
        });
        assert.equal(fit.overlap, false, "card clears the walking controls and toolbar");
        assert.deepEqual(fit.clipped, [], "the scene and translations fit inside the card");
        assert(fit.height <= fit.viewport * 0.75 + 1, "the card stays within its height limit");
      };
      await assertCardFits();
      const assertFramed = async () => {
        const bottom = await card.evaluate((element) => element.getBoundingClientRect().bottom / innerHeight);
        const active = (await state()).active;
        for (const [name, point] of [["person", active.person], ["wallet", active.prop]]) {
          assert(point?.onScreen && point.x >= 0 && point.x <= 1 && point.y >= 1 / 3 && point.y <= 1,
            `${name} is in the lower two thirds of the view: ${JSON.stringify(point)}`);
          if (Math.min(...viewport) <= 520 || viewport[0] >= 901) assert(point.y > bottom, `${name} clears the card: ${JSON.stringify({ point, bottom })}`);
        }
      };
      await assertFramed();
      await step(12);
      await assertFramed();
      await assertChoices(card, authored.choices);
      for (const row of await card.locator(".street-choices > .phrase-save-row").all()) await assertSaveSiblings(row, ".street-choice");

      const line = card.locator(".street-line");
      const replyLine = replyButton(page);
      await press(card.locator(".street-choice").first());
      await wait(() => replyLine.isVisible(), "townsperson replies");
      assert.equal(await lineText(replyLine).textContent(), authored.reply[0].en);
      assert.equal(await lineText(replyLine).getAttribute("lang"), targetLang);
      assert.equal(await replyLine.getAttribute("aria-expanded"), "false");
      await assertTranslation(replyLine, press, translatedReply ?? authored.reply[0].lt);
      await shot("reply");
      await turn(1);
      const finalReply = authored.reply.at(-1);
      assert.equal(await lineText(line).textContent(), finalReply.en);
      await assertTranslation(line, press, finalReply.lt);
      await assertChoices(card, authored.followUpChoices);
      await assertCardFits();
      await shot("choices-translated");
      await press(card.locator(".street-choice").first());
      const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).street.moments, key);
      const savedCard = () => page.evaluate((key) =>
        (JSON.parse(localStorage.getItem(key) || "{}").cards || []).find((item) => item.situationId === "street"), cardsKey);
      await wait(async () => !!await savedCard(), "the street card is saved");
      const { en, lt } = await savedCard();
      assert.deepEqual({ en, lt }, authored.card);
      const toast = page.locator(".town-toasts .toast.success").filter({ hasText: en });
      await wait(() => toast.isVisible(), "the new-card toast is visible");
      assert.equal(await toast.locator("[data-phrase-save]").count(), 0, "the automatic award's notice has only its existing action");
      await shot("toast");
      await dismiss();
      await closed();
      assert.equal((await saved())[dropped].seen, 1);
      assert.equal((await saved())[dropped].helped, 1);

      const hasStreetToast = () => page.evaluate(() => {
        const { toasts, townToasts } = window.__ew.store.getState();
        return [...toasts, ...townToasts.map(({ toast }) => toast)].some((toast) => toast.source === "street");
      });
      assert(await hasStreetToast(), "the previous street toast is still queued");
      assert(await force(dropped, "a"));
      await wait(() => scene.isVisible(), "the repeat scene opens");
      assert.equal(await hasStreetToast(), false, "opening a moment clears the previous street toast");
      await turn();
      assert.equal(await card.getAttribute("data-script"), "second");
      const { reply: [callback] } = await authoredMoment(page);
      await press(card.locator(".street-choice").first());
      await wait(() => replyLine.isVisible(), "the callback reply appears");
      assert.equal(await lineText(replyLine).textContent(), callback.en, "the authored callback reply plays");
      await closed();

      assert(await force(musician.id));
      await turn();
      assert.equal(await card.getAttribute("data-moment"), musician.id);
      assert.equal(await card.getAttribute("data-script"), "first");
      assert.equal(await card.getAttribute("data-cast"), musician.cast[0].id);
      await shot("musician");
      await page.evaluate(() => {
        const { game } = window.__ew;
        const actor = game.streetLife.active.actor.person.root;
        window.__streetDeparture = { actor, start: actor.position.clone(), player: game.player.root.position.clone() };
      });
      await dismiss();
      await closed();
      await step(8);
      assert(await page.evaluate(() => {
        const { actor, start, player } = window.__streetDeparture;
        return !actor.parent || actor.position.distanceTo(player) > start.distanceTo(player);
      }), "the musician walks away and clears the view");
      assert(await force(musician.id));
      await turn();
      assert.equal(await card.getAttribute("data-script"), "second");
      assert.equal(await card.getAttribute("data-cast"), musician.cast[1].id);
      const { name } = musician.cast[1];
      assert(name, "the returning musician has an authored name");
      assert.equal(await role.locator(`span[lang="${targetLang}"]`).textContent(), name);
      await dismiss();
      await closed();

      const pairs = await page.evaluate(() => {
        const { game } = window.__ew;
        const chats = new Map();
        for (const root of game.ambient.walkerRoots) {
          const walker = game.ambient.walkerFor(root);
          if (!walker?.chat) continue;
          const members = chats.get(walker.chat) ?? [];
          members.push(root.position);
          chats.set(walker.chat, members);
        }
        return [...chats.values()].filter((members) => members.length === 2).map(([first, second]) => {
          const { x, z } = first.clone().lerp(second, 0.5);
          return { x, z };
        });
      });
      assert(pairs.length > 0, "real Ambient pairs are available");
      let inView = false;
      const checkMoving = viewport[1] === 844 || viewport[0] === 1280;
      for (const pair of pairs) {
        for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
          await page.evaluate(({ x, z, angle }) =>
            window.__ew.game.placeOnFoot(x + 3.5 * Math.sin(angle), z + 3.5 * Math.cos(angle), angle + Math.PI), { ...pair, angle });
          await step(6);
          inView = await page.evaluate((tagsRequired) => window.__ew.game.streetLife.world.pairs(5).length > 0 &&
            (!tagsRequired || [...document.querySelectorAll(".nametag")].some((tag) => tag.checkVisibility({ visibilityProperty: true }))), checkMoving);
          if (inView) break;
        }
        if (inView) break;
      }
      assert(inView, "the pair qualifies for natural chatter");
      assert(await page.evaluate(() => window.__ew.game.streetChatterNow()), "the nearby pair starts chatter");
      const bubble = page.locator(".street-bubble[data-chatter]");
      const toggleTask = page.locator(".objective-card .collapse-btn");
      const taskFolded = async () => await toggleTask.getAttribute("aria-expanded") === "false";
      const initiallyFolded = await taskFolded();
      const assertChatterClear = async (context) => {
        const { onScreen, overlaps } = await bubble.evaluate((el) => {
          const a = el.getBoundingClientRect();
          const onScreen = getComputedStyle(el).visibility === "visible" &&
            a.width > 0 && a.height > 0 && a.left >= 0 && a.right <= innerWidth && a.top >= 0 && a.bottom <= innerHeight;
          const overlaps = [...document.querySelectorAll(".objective-card, .minimap, .toolbar-drawer, .toolbar button, .joy, .jump-btn, .act-btn, .nametag")]
            .filter((control) => {
              const b = control.getBoundingClientRect();
              return getComputedStyle(control).visibility === "visible" && b.width > 0 && b.height > 0 &&
                a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
            }).map((control) => control.className);
          return { onScreen, overlaps };
        });
        assert(onScreen, `${context}: bubble fits on screen`);
        assert.deepEqual(overlaps, [], `${context}: bubble clears the task card, minimap and menu`);
        await assertSaveSiblings(bubble, ".street-bubble-text");
      };
      const checkSpeaker = async (speaker) => {
        for (const translated of [false, true]) {
          if (translated) await assertTranslation(bubble.locator(".street-bubble-text"), press);
          for (const folded of [false, true]) {
            if (await taskFolded() !== folded) await press(toggleTask);
            await step(2, 0);
            const context = `${viewport.join("x")} ${speaker} speaker, ${translated ? "translated" : "original"} line, ${folded ? "folded" : "open"} task`;
            assert.equal(await toggleTask.getAttribute("aria-expanded"), String(!folded));
            assert.equal(await bubble.getAttribute("aria-expanded"), String(translated));
            await assertChatterClear(context);
            if (speaker === "first" && translated && folded === initiallyFolded) await shot("chatter");
          }
        }
      };
      await wait(() => bubble.isVisible(), "the first speaker's bubble appears");
      const first = await lineText(bubble).textContent();
      const id = await bubble.getAttribute("data-chatter");
      await checkSpeaker("first");
      const saveChatter = async (i) => {
        const source = chatters.find((item) => item.id === id).lines[i];
        const en = await lineText(bubble).textContent();
        const lt = await bubble.locator(".street-tr").textContent();
        if (spanish) assert.equal(lt, lithuanian?.[source.lt] ?? source.lt);
        await checkStreetSave(page, bubble.locator("[data-phrase-save]"), Math.min(...viewport) <= 520, { en, lt }, overheard);
      };
      await saveChatter(0);
      if (checkMoving) {
        await checkResizedTag(bubble, viewport);
        await checkMovingChatter(page, bubble, viewport);
      }
      const menu = page.locator(".toolbar .ride-menu");
      if (await menu.isVisible()) {
        const drawer = page.locator(".toolbar-drawer");
        for (const open of [true, false]) {
          if (await menu.getAttribute("aria-expanded") !== String(open)) await press(menu);
          await step(1, 0);
          assert.equal(await menu.getAttribute("aria-expanded"), String(open));
          assert.equal(await drawer.isVisible(), open);
          await assertChatterClear(`${viewport.join("x")} chatter with menu ${open ? "open" : "closed"}`);
        }
      }
      await wait(async () => await bubble.isVisible() && await bubble.getAttribute("aria-expanded") === "false"
        && await lineText(bubble).textContent() !== first,
        "the second speaker's bubble appears");
      assert.equal(await bubble.getAttribute("data-chatter"), id);
      await checkSpeaker("second");
      await saveChatter(1);
      await wait(async () => !(await bubble.count()), "the snippet ends");
      if (await taskFolded() !== initiallyFolded) await press(toggleTask);

      const returnToSpawn = async () => {
        await page.evaluate(([x, z, rot]) => window.__ew.game.placeOnFoot(x, z, rot), [x, z, rot]);
        await step(6);
      };
      await returnToSpawn();
      assert(await force(dropped, "b"));
      await turn();
      if (sharedRole) assert.equal(await role.textContent(), sharedRole[2], "the same role resolves for the female cast member");
      const keys = await authoredMoment(page);
      const keptBeforeLeaving = await checkStreetSave(page, card.locator(".street-choices > div").nth(1).locator("[data-phrase-save]"),
        Math.min(...viewport) <= 520, keys.choices[1], keys.role);
      await page.evaluate(() => {
        const { game } = window.__ew;
        const p = game.player.root.position;
        const actor = game.streetLife.active.actor.person.root.position;
        const a = Math.atan2(p.x - actor.x, p.z - actor.z);
        game.placeOnFoot(p.x + Math.sin(a) * 15, p.z + Math.cos(a) * 15, a);
      });
      await closed();
      assert.deepEqual(await cardsFor(page, keys.card.en), [], "an aborted moment awards no reward");
      assert.deepEqual(await cardsFor(page, keptBeforeLeaving.en), [keptBeforeLeaving], "a deliberate choice save survives walking away");
      assert.equal((await saved())[dropped].seen, 3);
      assert.equal((await saved())[dropped].helped, 2, "walking away added no help");

      await returnToSpawn();
      await page.evaluate(() => window.__ew.store.getState().setSettings({ scenes: true }));
      assert(await force(dropped, "c"));
      await wait(() => scene.isVisible(), "the pictured street scene is shown");
      await assertPicture(card);
      await shot("picture");
    }, { params: index > 0 ? `street=${dropped}&cast=a` : "" });

    await withGame(viewport, { play: "light" }, async ({ page, force, state, advance, wait, turn, press, dismiss, closed, card, shot }) => {
      assert(await force(dropped, "a"));
      await turn();
      const authored = await authoredMoment(page);
      assert(await page.locator(".street-light.street-card").isVisible());
      await assertPicture(card);
      await press(card.locator(".street-choice").first());
      const line = replyButton(page);
      await wait(() => line.isVisible(), "light mode reply");
      await assertTranslation(line, press, translatedReply ?? authored.reply[0].lt);
      await shot("light");
      await turn(1);
      await press(card.locator(".street-choice").first());
      if (spanish) {
        const current = card.locator(".street-current");
        const reward = card.locator("[data-street-reward]");
        await wait(async () => await card.getAttribute("data-step") === "reply" &&
          await lineText(current).textContent() === authored.closing.en, "the Light closing reply and reward are available before award");
        const touch = Math.min(...viewport) <= 520;
        await reward.scrollIntoViewIfNeeded();
        await checkStreetSave(page, reward.locator("[data-phrase-save]"), touch, authored.card, authored.role);
        await current.scrollIntoViewIfNeeded();
        await checkStreetSave(page, current.locator("[data-phrase-save]"), touch, authored.closing, authored.role);
      }
      await closed();

      const { clock, due } = await state();
      await advance(due - clock + 0.2);
      await wait(() => page.locator(".street-light.street-card").isVisible(), "a due moment appears on the light home");
      await dismiss();
      await closed();
      assert(await page.evaluate(() => window.__ew.game.streetChatterNow()));
      const chatter = page.locator(".street-light-chatter");
      await wait(() => chatter.isVisible(), "light chatter appears");
      assert.equal(await chatter.locator(".street-line").count(), 2);
      await assertTranslation(chatter.locator(".street-line").first(), press);
      const controls = chatter.locator(".street-head .street-icon-btn");
      await press(controls.first());
      await press(controls.nth(1));
      await wait(async () => !(await chatter.count()), "the light chatter card closes");
      if (spanish) {
        assert(await page.evaluate(() => window.__ew.game.streetChatterNow("c_calor")));
        await wait(() => chatter.isVisible(), "the authored hot-day snippet appears");
        await assertTranslation(chatter.locator(".street-line").first(), press);
        const { lines } = chatters.find((item) => item.id === "c_calor");
        for (const [i, row] of (await chatter.locator(".phrase-save-row").all()).entries()) {
          await row.scrollIntoViewIfNeeded();
          await assertSaveSiblings(row, ".street-line");
          const source = lines[i];
          const en = variety === "spain" ? source.spain ?? source.neutral ?? source.en
            : variety === "neutral" ? source.neutral ?? source.en : source.en;
          const lt = lithuanian?.[source.lt] ?? source.lt;
          await checkStreetSave(page, row.locator("[data-phrase-save]"), Math.min(...viewport) <= 520, { en, lt }, overheard);
          assert.equal(await row.locator(".street-line").getAttribute("aria-expanded"), String(i === 0));
        }
        await press(controls.nth(1));
      }
    });
  }
  if (spanish) for (const viewport of size.filter(([w, h]) => size.length === 1 || h === 844 || w === 1280)) {
    await withGame(viewport, {}, async ({ page, force, turn, step, state, card, wait, press, closed, shot }) => {
      const touch = Math.min(...viewport) <= 520;
      assert(await force(dropped, "a"));
      await turn();
      const { card: reward, closing, choices, role } = await authoredMoment(page);
      assert.deepEqual(reward, { en: "¡Se le cayó la cartera!", lt: learner === "lt" ? "Jums iškrito piniginė!" : "You dropped your wallet!" });
      assert.deepEqual(closing, { en: "¡Igualmente! ¡Gracias otra vez!", lt: learner === "lt" ? "Ir Jums! Dar kartą ačiū!" : "You too! Thanks again!" });
      const choiceSave = card.locator(".street-choices > div").nth(1).locator("[data-phrase-save]");
      await checkStreetSave(page, choiceSave, touch, choices[1], role);
      if (!touch) {
        const before = (await streetSnapshot(page)).player;
        await choiceSave.focus();
        await page.keyboard.down("w");
        try { await step(6); } finally { await page.keyboard.up("w"); }
        const after = (await streetSnapshot(page)).player;
        assert(Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.02, "a focused save keeps walking input live");
      }
      await press(card.locator(".street-choice").first());
      await turn(1);
      await press(card.locator(".street-choice").first());
      const current = card.locator(".street-current");
      const rewardRow = card.locator("[data-street-reward]");
      await wait(async () => await card.getAttribute("data-step") === "reply" &&
        await lineText(current).textContent() === closing.en, "the distinct closing reply and reward are available before departure");
      assert.equal(await lineText(rewardRow).textContent(), reward.en);
      assert.equal(await rewardRow.locator(`small[lang="${learner}"]`).textContent(), reward.lt);
      assert.equal((await state()).memory[dropped].helped, 0);
      await assertSaveSiblings(current, ".street-line");
      await shot("wallet-before-award");
      const keptReward = await checkStreetSave(page, rewardRow.locator("[data-phrase-save]"), touch, reward, role);
      await assertTranslation(current.locator(".street-line"), press, closing.lt);
      const keptReply = await checkStreetSave(page, current.locator("[data-phrase-save]"), touch, closing, role);
      await page.evaluate(() => {
        const { game } = window.__ew, actor = game.streetLife.active.actor.person.root;
        window.__walletDeparture = { actor, position: actor.position.clone() };
      });
      await wait(() => card.getAttribute("data-step").then((step) => step === "done"), "the same closing reply stays through done");
      assert.equal(await lineText(current).textContent(), closing.en);
      assert.equal(await current.locator(".street-line").getAttribute("aria-expanded"), "true");
      assert.equal(await current.locator("[data-phrase-save]").getAttribute("aria-pressed"), "true");
      await assertSaveSiblings(current, ".street-line");
      await activatePhraseControl(page, current.locator("[data-phrase-save]"), touch);
      assert.deepEqual(await cardsFor(page, closing.en), [keptReply], "the last reply is still actionable at done");
      assert(!(await page.locator(".town-toasts .toast.success").filter({ hasText: reward.en }).count()), "the manual reward save suppresses the duplicate notice");
      await shot("wallet-done");
      await closed();
      assert.deepEqual([(await state()).memory[dropped].seen, (await state()).memory[dropped].helped], [1, 1]);
      assert(await page.evaluate(() => {
        const { actor, position } = window.__walletDeparture;
        return !actor.parent || actor.position.distanceTo(position) > 0.1;
      }), "the completed wallet owner actually walks away");
      await page.reload({ waitUntil: "domcontentloaded" });
      await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "the town returns after reload");
      assert.deepEqual(await cardsFor(page, reward.en), [keptReward]);
      assert.deepEqual(await cardsFor(page, closing.en), [keptReply]);
    }, { spanishVariety: "default" });
  }
  console.log(`Street-life browser checks passed. Screenshots in ${shots}`);
} finally {
  await browser.close();
}
