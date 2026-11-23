// Run with a local development server. Optionally set WORLD_TEST_URL, WORLD_STORAGE,
// WORLD_LEARNER, WORLD_VARIETY, WORLD_SHOTS, WORLD_PLAYWRIGHT_MODULE, WORLD_BROWSER_CHANNEL,
// WORLD_PHONE_WIDTH/HEIGHT or WORLD_SPAWN ("x,z,rot").
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const spanish = storage === "puerto-colibri";
const variety = process.env.WORLD_VARIETY || "default";
const learner = process.env.WORLD_LEARNER || (spanish ? "en" : "lt");
const targetLang = spanish ? "es" : "en";
const dropped = "i_dropped";
const { STREET_MOMENTS: moments } = await tsImport(spanish ? "../../src/editions/es/content/street.ts"
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
    const dismiss = () => press(card.locator(".street-head .street-icon-btn"));
    const shot = async (name) => {
      await real(250);
      await page.screenshot({ path: join(shots, `street-${name}-${width}x${height}.png`) });
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
  const { script, cast, learnerGender } = await page.evaluate(() => {
    const { script, cast } = window.__ew.game.streetLife.active.draw;
    return { script, cast, learnerGender: window.__ew.store.getState().progress.profile.gender };
  });
  const resolve = (text) => resolveGender(text, learnerGender, cast.gender);
  const words = (line) => ({
    en: resolve(spanish && variety === "spain" ? line.spain ?? line.neutral ?? line.en
      : spanish && variety === "neutral" ? line.neutral ?? line.en : line.en),
    lt: resolve(line.lt),
  });
  return {
    role: resolve(cast.role),
    scene: resolve(byCast(script.scene, cast.id)),
    choices: script.choices.map(({ say }) => words(byCast(say, cast.id))),
    followUpChoices: script.then?.choices.map(({ say }) => words(byCast(say, cast.id))),
    reply: byCast(script.choices[0].reply ?? script.reply, cast.id)?.map(words),
    card: script.card && words(byCast(script.card, cast.id)),
  };
}

const lineText = (line) => line.locator(".kit-gloss-compact > span");
const replyButton = (page) => page.locator('.street-card[data-step="reply"] .street-line');

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
      await assertChoices(card, authored.choices);

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
      for (const pair of pairs) {
        for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 4) {
          await page.evaluate(({ x, z, angle }) =>
            window.__ew.game.placeOnFoot(x + 3.5 * Math.sin(angle), z + 3.5 * Math.cos(angle), angle + Math.PI), { ...pair, angle });
          await step(6);
          inView = await page.evaluate(() => window.__ew.game.streetLife.world.pairs(5).length > 0);
          if (inView) break;
        }
        if (inView) break;
      }
      assert(inView, "the pair qualifies for natural chatter");
      assert(await page.evaluate(() => window.__ew.game.streetChatterNow()), "the nearby pair starts chatter");
      const bubble = page.locator(".street-bubble[data-chatter]");
      await wait(() => bubble.isVisible(), "the first speaker's bubble appears");
      const first = await lineText(bubble).textContent();
      const id = await bubble.getAttribute("data-chatter");
      await assertTranslation(bubble, press);
      assert(await bubble.evaluate((el) => {
        const bounds = el.getBoundingClientRect();
        return bounds.left >= 0 && bounds.right <= innerWidth && bounds.top >= 0 && bounds.bottom <= innerHeight;
      }), "translated bubble fits on screen");
      await shot("chatter");
      await wait(async () => await bubble.isVisible() && await bubble.getAttribute("aria-expanded") === "false"
        && await lineText(bubble).textContent() !== first,
        "the second speaker's bubble appears");
      assert.equal(await bubble.getAttribute("data-chatter"), id);
      await wait(async () => !(await bubble.count()), "the snippet ends");

      const returnToSpawn = async () => {
        await page.evaluate(([x, z, rot]) => window.__ew.game.placeOnFoot(x, z, rot), [x, z, rot]);
        await step(6);
      };
      await returnToSpawn();
      assert(await force(dropped, "b"));
      await turn();
      if (sharedRole) assert.equal(await role.textContent(), sharedRole[2], "the same role resolves for the female cast member");
      await page.evaluate(() => {
        const { game } = window.__ew;
        const p = game.player.root.position;
        const actor = game.streetLife.active.actor.person.root.position;
        const a = Math.atan2(p.x - actor.x, p.z - actor.z);
        game.placeOnFoot(p.x + Math.sin(a) * 15, p.z + Math.cos(a) * 15, a);
      });
      await closed();
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
    });
  }
  console.log(`Street-life browser checks passed. Screenshots in ${shots}`);
} finally {
  await browser.close();
}
