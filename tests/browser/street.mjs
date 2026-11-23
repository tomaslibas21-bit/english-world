// Run with a local development server. Optionally set WORLD_TEST_URL, WORLD_STORAGE,
// WORLD_LEARNER, WORLD_VARIETY, WORLD_PLAYWRIGHT_MODULE, WORLD_BROWSER_CHANNEL,
// WORLD_PHONE_WIDTH/HEIGHT or WORLD_SPAWN ("x,z,rot").
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const spanish = storage === "puerto-colibri";
const variety = process.env.WORLD_VARIETY || "default";
const learner = process.env.WORLD_LEARNER || (spanish ? "en" : "lt");
const musician = spanish ? "r_trovador" : "r_musician";
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
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withGame([width, height], settings, check, params = "") {
  const mobile = Math.min(width, height) <= 520;
  const context = await browser.newContext({
    viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile,
  });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(installTestControls, {
      key, varietyKey: spanish ? `${storage}-variety` : null, variety,
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

function authoredMoment(page) {
  return page.evaluate((variety) => {
    const { script, cast } = window.__ew.game.streetLife.active.draw;
    const gender = window.__ew.store.getState().progress.profile.gender;
    const byCast = (value) => value?.byCast?.[cast.id] ?? value;
    const resolve = (text) => text?.replace(/\{(m|nm):([^{}|]*)\|(?:f|nf):([^{}|]*)\}/g,
      (_match, who, male, female) => (who === "m" ? gender : cast.gender) === "m" ? male : female);
    const words = (line) => line && {
      en: resolve(variety === "spain" ? line.spain ?? line.neutral ?? line.en
        : variety === "neutral" ? line.neutral ?? line.en : line.en),
      lt: resolve(line.lt),
    };
    return {
      role: resolve(cast.role),
      scene: resolve(byCast(script.scene)),
      choices: script.choices.map(({ say }) => words(byCast(say))),
      reply: words(byCast(script.choices[0].reply ?? script.reply)?.[0]),
      card: words(byCast(script.card)),
    };
  }, spanish ? variety : "default");
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
    await withGame(viewport, {}, async ({ page, step, state, force, wait, turn, closed, press, card, shot }) => {
      if (index === 0) assert(await force("i_dropped", "a"));
      await wait(() => card.locator(".street-scene").isVisible(), "the street scene is shown");
      const authored = await authoredMoment(page);
      assert.equal(await card.locator(".street-head strong").innerText(), authored.role);
      assert.equal(await card.locator(".street-scene").innerText(), authored.scene);
      await shot("scene");
      await turn();
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
          const clipped = [...element.querySelectorAll(".street-tr, .street-choice small")].filter((line) => {
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
      assert.deepEqual(await card.locator(".street-choice .kit-gloss-compact > span").allTextContents(),
        authored.choices.map(({ en }) => en));
      assert.deepEqual(await card.locator('.street-choice[data-translated="true"] small').allTextContents(),
        authored.choices.map(({ lt }) => lt));
      await shot("choices");

      await press(card.locator(".street-choice").first());
      await wait(async () => (await state()).active?.step === "reply" && await card.locator(".street-line").isVisible(), "townsperson replies");
      await press(card.locator(".street-line"));
      assert(await card.locator(".street-tr").isVisible(), "translation expands beneath the current line");
      assert.equal(await card.locator(".street-tr").getAttribute("lang"), learner);
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
      const { en, lt } = await savedCard();
      assert.deepEqual({ en, lt }, authored.card);
      const toast = page.locator(".town-toasts .toast.success").filter({ hasText: en });
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
      const { reply: callback } = await authoredMoment(page);
      await press(card.locator(".street-choice").first());
      await wait(async () => (await state()).active?.step === "reply" &&
        (await card.locator(".street-line .kit-gloss-compact > span").innerText()) === callback.en, "the authored callback reply plays");
      await closed();

      assert(await force(musician));
      await turn();
      assert.equal(await card.getAttribute("data-script"), "first");
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
      assert(await force(musician));
      await turn();
      assert.equal(await card.getAttribute("data-script"), "second");
      assert.equal(await card.getAttribute("data-cast"), "b");
      const name = await page.evaluate(() => window.__ew.game.streetLife.active.draw.cast.name);
      assert(name && (await card.locator(".street-head strong").innerText()).includes(name));
      await press(card.locator('button[title]').first());
      await closed();

      const pair = await page.evaluate(() => {
        const { game } = window.__ew;
        // Face a real Ambient pair so the test works with the edition's layout and quality.
        const walkers = game.ambient.walkerRoots.map((root) => game.ambient.walkerFor(root));
        const walker = walkers.find((w) => w?.kind === "stand" && w.chat);
        if (!walker) return null;
        const other = walkers.find((w) => w !== walker && w?.chat === walker.chat);
        const center = walker.ch.root.position.clone().lerp(other.ch.root.position, 0.5);
        return { x: center.x, z: center.z };
      });
      assert(pair, "a real Ambient pair is available");
      let inView = false;
      for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
        await page.evaluate(({ x, z, angle }) =>
          window.__ew.game.placeOnFoot(x + 3.5 * Math.sin(angle), z + 3.5 * Math.cos(angle), angle + Math.PI), { ...pair, angle });
        await step(6);
        inView = await page.evaluate(() => window.__ew.game.streetLife.world.pairs(5).length > 0);
        if (inView) break;
      }
      assert(inView, "the pair qualifies for natural chatter");
      assert(await page.evaluate(() => window.__ew.game.streetChatterNow()), "the nearby pair starts chatter");
      const bubble = page.locator(".street-bubble[data-chatter]");
      await wait(() => bubble.isVisible(), "the first speaker's bubble appears");
      const first = await bubble.innerText();
      const id = await bubble.getAttribute("data-chatter");
      await press(bubble);
      assert(await bubble.locator(".street-tr").isVisible());
      assert.equal(await bubble.locator(".street-tr").getAttribute("lang"), learner);
      assert(await bubble.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight;
      }), "translated bubble fits on screen");
      await shot("chatter");
      await wait(async () => await bubble.isVisible() && !(await bubble.locator(".street-tr").isVisible()) && await bubble.innerText() !== first,
        "the second speaker's bubble appears");
      assert.equal(await bubble.getAttribute("data-chatter"), id);
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
      assert.equal(await card.locator(".street-tr").getAttribute("lang"), learner);
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
