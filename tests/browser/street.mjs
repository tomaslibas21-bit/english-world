// Run with a local development server. Optionally set WORLD_TEST_URL, WORLD_STORAGE,
// WORLD_PLAYWRIGHT_MODULE, WORLD_BROWSER_CHANNEL, WORLD_SHOTS, WORLD_PHONE_WIDTH/HEIGHT or WORLD_SPAWN ("x,z,rot").
// WORLD_GLOW_B6=1 adds four stationary town-art comparisons before the normal checks, with the HUD visible.
// WORLD_GLOW_B7=1 captures the square bench, bank frontage, Corner Pocket entry and square planter instead.
// WORLD_GLOW_B8=1 captures the street bin/post office and fresh entry views of the practice table/living-room sofa.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
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
  coach: { done: true, seen: { list: true }, view: true },
};

function installTestControls({ key, progress }) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(progress));
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
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withGame([width, height], settings, check, params = "", place = progress.place) {
  const mobile = Math.min(width, height) <= 520;
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(installTestControls, { key, progress: { ...progress, place, settings: { ...progress.settings, ...settings } } });
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
      assert.fail(description);
    };
    const state = () => page.evaluate(() => window.__ew.game.streetState());
    const force = (id, cast) => page.evaluate(([id, cast]) => window.__ew.game.streetNow(id, cast), [id, cast]);
    const advance = (seconds) => page.evaluate((seconds) => window.__ew.game.streetAdvance(seconds), seconds);
    const card = page.locator("section.street-card");
    const turn = (exchange = 0) => wait(async () => await card.locator(".street-choice").first().isVisible()
      && await card.getAttribute("data-exchange") === String(exchange), `expected answer chips for exchange ${exchange}`);
    const closed = () => wait(async () => !(await state()).active && !(await card.count()), "street moment closes");
    const press = async (locator) => {
      let done = false;
      const frames = (async () => { while (!done) { await step(1, 0); await real(20); } })();
      try { await (mobile ? locator.tap({ timeout: 4000 }) : locator.click({ timeout: 4000 })); }
      finally { done = true; await frames; }
    };
    const shot = async (name) => {
      await real(250);
      await page.screenshot({ path: join(shots, `street-${name}-${width}x${height}.png`) });
    };
    await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "game is ready");
    await step(4);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await check({ page, step, state, force, advance, wait, turn, closed, press, card, shot });
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

async function assertBubbleFits(bubble, viewport, label) {
  const fit = await bubble.evaluate((el, mapleHarbor) => {
    const a = el.getBoundingClientRect();
    const hits = [];
    const tags = mapleHarbor && el.getAttribute("aria-expanded") === "true" ? ", .nametag" : "";
    for (const hud of document.querySelectorAll(".objective-card, .phone-ring, .street-card, .directions-card, .photo-chip, " +
      ".minimap, .toolbar, .toolbar-drawer, .toolbar button, .joy, .jump-btn, .act-btn, .prompt" + tags)) {
      const b = hud.getBoundingClientRect();
      if (b.width > 0 && b.height > 0 && getComputedStyle(hud).visibility === "visible" &&
        a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) hits.push(hud.className);
    }
    const text = document.createRange();
    const clipped = [...el.querySelectorAll(".kit-gloss-compact > span, .street-tr")].filter((line) => {
      text.selectNodeContents(line);
      return [...text.getClientRects()].some((b) => b.left < a.left || b.right > a.right || b.top < a.top || b.bottom > a.bottom);
    }).map((line) => line.textContent);
    return { hits, clipped, onScreen: a.width > 0 && a.height > 0 && a.left >= 0 && a.right <= innerWidth &&
      a.top >= 0 && a.bottom <= innerHeight && getComputedStyle(el).visibility === "visible" };
  }, storage === "english-world");
  const context = `${viewport.join("x")} ${label}`;
  assert(fit.onScreen, `${context}: bubble is visible and fits on screen`);
  assert.deepEqual(fit.hits, [], `${context}: bubble clears all visible blockers`);
  assert.deepEqual(fit.clipped, [], `${context}: bubble text fits inside the button`);
}

async function checkMovingChatter(page, bubble, viewport) {
  const [width, height] = viewport;
  const touch = Math.min(width, height) <= 520;
  const point = await page.evaluate(() => {
    const canvas = document.querySelector(".stage canvas");
    for (const y of [0.7, 0.5, 0.6, 0.4].map((n) => innerHeight * n)) {
      for (const x of [0.5, 0.3, 0.65].map((n) => innerWidth * n)) {
        if (document.elementFromPoint(x, y) === canvas) return { x, y };
      }
    }
    return null;
  });
  assert(point, "the town canvas can receive a camera drag");
  const cdp = touch ? await page.context().newCDPSession(page) : null;
  const finger = (type, point) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: point ? [point] : [] });
  const start = await page.evaluate(() => window.__ew.game.rig.cam.position.toArray());
  if (cdp) await finger("touchStart", point);
  else {
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
  }
  let taggedFrames = 0;
  try {
    for (let i = 1; i <= 6; i++) {
      const next = { x: point.x + 4 * i, y: point.y };
      if (cdp) await finger("touchMove", next);
      else await page.mouse.move(next.x, next.y);
      const sample = await bubble.evaluate((el) => {
        const nativeRect = Element.prototype.getBoundingClientRect;
        let reads = 0;
        Element.prototype.getBoundingClientRect = function () {
          if (this.classList.contains("nametag")) reads++;
          return nativeRect.call(this);
        };
        // Sample only the live town RAF callbacks. Geometry assertions run after restoring the native method.
        try { window.__stepStreet(1, 16); }
        finally { Element.prototype.getBoundingClientRect = nativeRect; }
        const a = el.getBoundingClientRect();
        const button = el.querySelector(".street-bubble-text");
        const tags = [...document.querySelectorAll(".nametag")].filter((tag) => tag.checkVisibility({ visibilityProperty: true }));
        return { reads, tags: tags.length, visible: a.width > 0 && a.height > 0 && getComputedStyle(el).visibility === "visible",
          hit: button.contains(document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2)) };
      });
      assert.equal(sample.reads, 0, "live chatter placement reads no nametag DOMRects");
      assert(sample.visible && sample.hit, "the moving bubble stays visible with a centre hit on the translation button");
      if (sample.tags) taggedFrames++;
      await assertBubbleFits(bubble, viewport, "translated line during a camera drag");
    }
  } finally {
    if (cdp) {
      await finger("touchEnd");
      await cdp.detach();
    } else await page.mouse.up();
  }
  const end = await page.evaluate(() => window.__ew.game.rig.cam.position.toArray());
  assert(Math.hypot(...end.map((n, i) => n - start[i])) > 0.01, "the camera moves during the cost sample");
  assert(taggedFrames > 1, "visible nametags exercise the cost check over multiple frames");
}

async function checkNametagGeometry(bubble, viewport) {
  const sample = await bubble.evaluate((el) => {
    const { nametagLayout: layout } = window.__ew.game;
    const tag = layout.boxes.find(({ tag }) => getComputedStyle(tag).visibility === "visible")?.tag;
    if (!tag) return null;
    const role = tag.querySelector("i") || tag.querySelector("span");
    const layer = tag.parentElement;
    const { transform, transformOrigin } = layer.style;
    const { fontSize } = role.style;
    const height = tag.offsetHeight;
    try {
      role.style.fontSize = "18px";
      layer.style.transformOrigin = "top left";
      layer.style.transform = "translate(5px, 3px) scale(0.98, 0.97)";
      window.__stepStreet(1, 0);
      const actual = tag.getBoundingClientRect();
      const chatter = el.getBoundingClientRect();
      const box = layout.boxes.find((box) => box.tag === tag);
      if (!box || !layout.rect) return null;
      const { rect, scaleX, scaleY } = layout;
      const clears = chatter.left >= actual.right || chatter.right <= actual.left ||
        chatter.top >= actual.bottom || chatter.bottom <= actual.top;
      return { grew: tag.offsetHeight > height, clears, error: Math.max(
        Math.abs(rect.left + scaleX * box.x0 - actual.left), Math.abs(rect.left + scaleX * box.x1 - actual.right),
        Math.abs(rect.top + scaleY * box.y0 - actual.top), Math.abs(rect.top + scaleY * box.y1 - actual.bottom),
      ) };
    } finally {
      role.style.fontSize = fontSize;
      layer.style.transform = transform;
      layer.style.transformOrigin = transformOrigin;
      window.__stepStreet(1, 0);
    }
  });
  assert(sample?.grew && sample.clears && sample.error <= 0.51,
    `${viewport.join("x")}: the placed box tracks the resized tag in its offset, scaled layer (${JSON.stringify(sample)})`);
}

try {
  await mkdir(shots, { recursive: true });
  await withGame(size[0], {}, async ({ page, step, state, force, advance, wait, card, press, closed }) => {
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
    assert.equal(await force("i_dropped", "a"), false);
    await page.evaluate(() => window.__ew.game.closeConversation());
    await wait(() => page.evaluate(() => !window.__ew.store.getState().conv.active), "conversation closes");
    await advance(29);
    assert.equal((await state()).active, null, "street stays quiet for 30 seconds after talking");
    await advance(1.05);
    await wait(() => card.isVisible(), "street card opens past the deadline");
    await page.evaluate(() => {
      window.__ew.store.getState().setSettings({ phoneCalls: true });
      window.__ew.game.phoneDueNow();
    });
    await step(1, 10500);
    assert.equal(await page.locator(".phone-ring").count(), 0, "street has exclusive card priority");
    await press(card.locator('button[title]').first());
    await closed();
    await step(1, 9700);
    assert.equal(await page.locator(".phone-ring").count(), 0, "phone waits ten more seconds");
  });

  for (const [index, viewport] of size.entries()) {
    if (["WORLD_GLOW_B6", "WORLD_GLOW_B7", "WORLD_GLOW_B8"].some((key) => process.env[key] === "1")) await withGame(viewport, {}, async ({ page, step, shot }) => {
      const poses = process.env.WORLD_GLOW_B8 === "1" ? [
        ["glow-directions-bin", 5.8, -15.3, Math.PI / 2],
        ["glow-post-front", 27, -1.8, 0],
      ] : process.env.WORLD_GLOW_B7 === "1" ? [
        ["glow-square-bench", 30, -18.4, Math.PI],
        ["glow-bank-front", 13, -2.6, 0],
        ["glow-pocket-entry", -12.5, 31.4, Math.PI],
        ["glow-square-planter", 20.8, -21.4, Math.PI],
      ] : [
        ["glow-market-fruit", 26, -38.5, Math.PI],
        ["glow-market-flowers", 14, -37.5, Math.PI],
        ["glow-lobster-hatch", 15.7, -30.2, -Math.PI / 2],
        ["glow-pier-seaward", -30, -87, 0],
      ];
      for (const [name, x, z, rot] of poses) {
        await page.evaluate(([x, z, rot]) => window.__ew.game.placeOnFoot(x, z, rot), [x, z, rot]);
        await step(30);
        const frame = await page.evaluate(() => {
          const g = window.__ew.game;
          return { player: g.player.root.position.toArray(), camera: g.rig.cam.position.toArray(),
            calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles };
        });
        console.log(JSON.stringify({ glow: name, viewport, ...frame }));
        await shot(name);
      }
    });
    if (process.env.WORLD_GLOW_B8 === "1") for (const [name, place] of [
      ["glow-practice-cover", { zone: "pool-hall", x: 0, z: 3.4, rot: Math.PI }],
      ["glow-living-sofa", { zone: "dans-house", x: 0, z: 4.2, rot: Math.PI }],
    ]) await withGame(viewport, {}, async ({ page, step, shot }) => {
      await step(30);
      const frame = await page.evaluate(() => {
        const g = window.__ew.game;
        return { zone: g.zone.id, player: g.player.root.position.toArray(), camera: g.rig.cam.position.toArray(),
          calls: g.renderer.info.render.calls, triangles: g.renderer.info.render.triangles };
      });
      console.log(JSON.stringify({ glow: name, viewport, ...frame }));
      await shot(name);
    }, "", place);
    await withGame(viewport, {}, async ({ page, step, state, force, wait, turn, closed, press, card, shot }) => {
      if (index === 0) assert(await force("i_dropped", "a"));
      await wait(() => card.locator(".street-scene").isVisible(), "the street scene is shown");
      await shot("scene");
      await turn();
      assert(await card.locator(".street-scene").isVisible(), "the dropped-item scene remains visible through the first choice");
      assert.equal(await card.getAttribute("data-cast"), "a");
      assert.equal(await card.getAttribute("data-script"), "first");
      assert.equal(await card.locator(".street-picture").count(), 0);
      const assertCardFits = async () => {
        const fit = await card.evaluate((element) => {
          const a = element.getBoundingClientRect();
          const controls = document.querySelectorAll(".joy, .act-btn, .jump-btn, .toolbar button");
          const overlap = [...controls].some((control) => {
            const b = control.getBoundingClientRect();
            return getComputedStyle(control).visibility === "visible" && b.width > 0 && b.height > 0 &&
              a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
          });
          // Playwright considers text visible even when the card's scrollport clips its last line.
          const clipped = [...element.querySelectorAll(".street-scene, .street-tr, .street-choice .kit-gloss-compact > *")].filter((line) => {
            const box = line.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && (box.top < a.top - 1 || box.bottom > a.bottom + 1 || box.left < a.left - 1 || box.right > a.right + 1);
          }).map((line) => line.textContent);
          return { overlap, clipped, height: a.height, viewport: innerHeight };
        });
        assert.equal(fit.overlap, false, "card clears the walking controls and toolbar");
        assert.deepEqual(fit.clipped, [], "the whole line and each choice translation fit inside the card");
        assert(fit.height <= fit.viewport * 0.75 + 1, "the card stays within its height limit");
      };
      await assertCardFits();
      const assertFramed = async () => {
        const bottom = await card.evaluate((element) => element.getBoundingClientRect().bottom / innerHeight);
        const active = (await state()).active;
        for (const [name, point] of [["person", active.person], ["wallet", active.prop]]) {
          assert(point?.onScreen && point.x >= 0 && point.x <= 1 && point.y >= 1 / 3 && point.y <= 1,
            `${name} is in the lower two thirds of the view: ${JSON.stringify(point)}`);
          if (Math.min(...viewport) <= 520) assert(point.y > bottom, `${name} clears the phone card: ${JSON.stringify({ point, bottom })}`);
        }
      };
      await assertFramed();
      await step(12);
      await assertFramed();
      assert.equal(await card.locator('.street-choice[data-translated="true"] small').count(), 2);
      await shot("choices");

      await press(card.locator(".street-choice").first());
      await wait(async () => (await state()).active?.step === "reply" && await card.locator(".street-line").isVisible(), "townsperson replies");
      await press(card.locator(".street-line"));
      assert(await card.locator(".street-tr").isVisible(), "translation expands beneath the current line");
      await shot("reply");
      await turn(1);
      await press(card.locator(".street-line"));
      assert(await card.locator(".street-tr").isVisible(), "the reply can be translated with the follow-up chips visible");
      await assertCardFits();
      await shot("choices-translated");
      await press(card.locator(".street-choice").first());
      const saved = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).street.moments, key);
      const savedCard = () => page.evaluate((key) =>
        (JSON.parse(localStorage.getItem(key) || "{}").cards || []).find((item) => item.situationId === "street"), cardsKey);
      await wait(async () => !!await savedCard(), "the street card is saved");
      const toast = page.locator(".town-toasts .toast.success").filter({ hasText: (await savedCard()).en });
      await wait(() => toast.isVisible(), "the new-card toast is visible");
      await shot("toast");
      await closed();
      assert.equal((await saved()).i_dropped.seen, 1);
      assert.equal((await saved()).i_dropped.helped, 1);

      assert(await force("i_dropped", "a"));
      await turn();
      assert.equal(await card.getAttribute("data-script"), "second");
      assert(await page.evaluate(() => {
        const { toasts, townToasts } = window.__ew.store.getState();
        return ![...toasts, ...townToasts.map(({ toast }) => toast)].some((toast) => toast.source === "street");
      }), "opening a moment clears the previous street toast");
      await press(card.locator(".street-choice").first());
      await wait(async () => (await state()).active?.step === "reply" &&
        (storage !== "english-world" || (await card.locator(".street-line").innerText()).includes("My hero, twice now")), "the callback reply plays");
      await closed();

      assert(await force("r_musician"));
      await turn();
      assert.equal(await card.getAttribute("data-script"), "first");
      if (storage === "english-world" && viewport[0] === 844 && viewport[1] === 390) {
        assert.equal(await card.locator('.street-choice[data-translated="true"] small').count(), 3);
        await assertCardFits();
      }
      await shot("musician");
      await page.evaluate(() => {
        const { game } = window.__ew;
        const actor = game.streetLife.active.actor.person.root;
        window.__streetDeparture = { actor, start: actor.position.clone(), player: game.player.root.position.clone() };
      });
      await press(card.locator('button[title]').first());
      await closed();
      await step(8);
      assert(await page.evaluate(() => {
        const { actor, start, player } = window.__streetDeparture;
        return !actor.parent || actor.position.distanceTo(player) > start.distanceTo(player);
      }), "the musician walks away and clears the view");
      assert(await force("r_musician"));
      await turn();
      assert.equal(await card.getAttribute("data-script"), "second");
      assert.equal(await card.getAttribute("data-cast"), "b");
      assert((await card.locator(".street-head strong").innerText()).includes("Eli") || storage !== "english-world");
      await press(card.locator('button[title]').first());
      await closed();

      const started = await page.evaluate(() => {
        const { game } = window.__ew;
        // Face a real Ambient pair so the test works with the edition's layout and quality.
        const walker = game.ambient.walkerRoots.map((root) => game.ambient.walkerFor(root)).find((w) => w.kind === "stand" && w.chat);
        if (!walker) return false;
        const p = walker.ch.root.position;
        game.placeOnFoot(p.x + 3.3, p.z + 1.8, Math.atan2(-3.3, -1.8));
        return true;
      });
      assert(started, "a real Ambient pair is available");
      await step(6);
      assert(await page.evaluate(() => window.__ew.game.streetLife.world.pairs(5).length > 0), "the pair qualifies for natural chatter");
      const task = page.locator(".objective-card");
      const toggleTask = task.locator(".collapse-btn");
      if (await toggleTask.getAttribute("aria-expanded") === "false") await press(toggleTask);
      assert(await page.locator(".objective-card:not(.collapsed)").isVisible(), "the task is open when the pair starts chatter");
      const chatterId = storage === "english-world" ? "c_lights" : undefined;
      assert(await page.evaluate((id) => window.__ew.game.streetChatterNow(id), chatterId), "the nearby pair starts chatter");
      const bubble = page.locator(".street-bubble[data-chatter]");
      await wait(() => bubble.isVisible(), "the first speaker's bubble appears");
      const first = await bubble.innerText();
      const id = await bubble.getAttribute("data-chatter");
      if (chatterId) assert.equal(id, chatterId);
      await assertBubbleFits(bubble, viewport, "first line with expanded task");
      await shot("chatter-expanded");

      // Force a collision even in layouts where the task already clears the bubble's preferred spot.
      await bubble.evaluate((element) => {
        const { left, top, width, height } = element.getBoundingClientRect();
        const chip = document.createElement("div");
        chip.className = "photo-chip";
        chip.dataset.streetTestBlocker = "";
        Object.assign(chip.style, { position: "fixed", left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
        document.body.append(chip);
      });
      await step(2);
      await assertBubbleFits(bubble, viewport, "first line after a quest chip occupies its spot");
      await page.locator("[data-street-test-blocker]").evaluate((chip) => chip.remove());

      await press(toggleTask);
      await wait(() => page.locator(".objective-card.collapsed").isVisible(), "the task folds while chatter is visible");
      await step();
      await assertBubbleFits(bubble, viewport, "first line with folded task");
      await shot("chatter-folded");

      await press(toggleTask);
      await wait(() => page.locator(".objective-card:not(.collapsed)").isVisible(), "the task reopens during the line");
      await step();
      await assertBubbleFits(bubble, viewport, "first line with reopened task");
      await press(bubble);
      assert(await bubble.locator(".street-tr").isVisible());
      await step(2, 0);
      await assertBubbleFits(bubble, viewport, "translated line with expanded task");
      await shot("chatter");
      if (storage === "english-world" && (viewport[1] === 844 || viewport[0] === 1280)) {
        await checkNametagGeometry(bubble, viewport);
        await checkMovingChatter(page, bubble, viewport);
      }
      await wait(async () => await bubble.isVisible() && !(await bubble.locator(".street-tr").isVisible()) && await bubble.innerText() !== first,
        "the second speaker's bubble appears");
      assert.equal(await bubble.getAttribute("data-chatter"), id);
      await assertBubbleFits(bubble, viewport, "second line with expanded task");
      await wait(async () => !(await bubble.count()), "the snippet ends");

      const returnToSpawn = async () => {
        await page.evaluate(([x, z, rot]) => window.__ew.game.placeOnFoot(x, z, rot), [x, z, rot]);
        await step(6);
      };
      await returnToSpawn();
      assert(await force("i_dropped", "b"));
      await turn();
      await page.evaluate(() => {
        const { game } = window.__ew;
        const p = game.player.root.position;
        const actor = game.streetLife.active.actor.person.root.position;
        const a = Math.atan2(p.x - actor.x, p.z - actor.z);
        game.placeOnFoot(p.x + Math.sin(a) * 15, p.z + Math.cos(a) * 15, a);
      });
      await closed();
      assert.equal((await saved()).i_dropped.seen, 3);
      assert.equal((await saved()).i_dropped.helped, 2, "walking away added no help");

      await returnToSpawn();
      await page.evaluate(() => window.__ew.store.getState().setSettings({ scenes: true }));
      assert(await force("i_dropped", "c"));
      await wait(() => card.locator(".street-scene").isVisible(), "the pictured street scene is shown");
      await assertPicture(card);
      await shot("picture");
    }, index > 0 ? "street=i_dropped&cast=a" : "");

    await withGame(viewport, { play: "light" }, async ({ page, force, state, advance, wait, turn, press, closed, card, shot }) => {
      const { clock, due } = await state();
      await advance(due - clock + 0.2);
      await wait(() => page.locator(".street-light.street-card").isVisible(), "a due moment appears on the light home");
      await press(card.locator('button[title]').first());
      await closed();
      assert(await force("i_dropped", "a"));
      await turn();
      await assertPicture(card);
      await press(card.locator(".street-choice").first());
      await wait(async () => (await state()).active?.step === "reply", "light mode reply");
      await press(card.locator(".street-line"));
      assert(await card.locator(".street-tr").isVisible());
      await shot("light");
      if ((await card.getAttribute("data-script")) === "first") {
        await turn(1);
        await press(card.locator(".street-choice").first());
      }
      await closed();
      assert(await page.evaluate(() => window.__ew.game.streetChatterNow()));
      const chatter = page.locator(".street-light-chatter");
      assert.equal(await chatter.locator(".street-line").count(), 2);
      await press(chatter.locator(".street-line").first());
      assert(await chatter.locator(".street-tr").isVisible());
      await press(chatter.locator('button[title]').first());
      await press(chatter.locator('button[title]').nth(1));
      await wait(async () => !(await chatter.count()), "the light chatter card closes");
    });
  }
  console.log(`Street-life browser checks passed. Screenshots in ${shots}`);
} finally {
  await browser.close();
}
