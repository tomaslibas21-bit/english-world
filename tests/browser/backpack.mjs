// Run against the local game. WORLD_SHOTS is optional, as in the other town browser checks.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { silence } from "./radio-fixtures.mjs";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const shots = process.env.WORLD_SHOTS;
if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.WORLD_BROWSER_PATH, headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const friday = "Are you free on Friday?", helper = "Ar turi laiko penktadienį?";
const cardKey = "english-world-cards-v1";
const readDeck = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).cards, cardKey);
const shot = async (page, name) => { if (shots) await page.screenshot({ path: join(shots, name + ".png") }); };

async function openGame(play, width, height, { stress = false, deny = false, url = base, setup } = {}) {
  const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 671, isMobile: width < 671, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await setup?.(page);
  await page.addInitScript(({ play, stress, deny, friday, helper, cardKey }) => {
    const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
    const sitId = "s67a-tickets";
    const phrases = { ticket: { en: "Two tickets, please.", lt: "Du bilietus, prašau.", sitId, count: 3, last: 10 },
      friday: { en: friday, lt: helper, sitId: "s83-invite-call", count: 2, last: 9 },
      tree: { en: "Listen to the waves.", lt: "Klausykis bangų.", sitId: "x08-old-oak", count: 1, last: 4 } };
    const cards = [{ id: "friday", en: friday, lt: helper, situationId: "s83-invite-call", createdAt: 10, due: 0,
      sentence: { en: friday, lt: helper } }, { id: "unit", en: "free", lt: "laisvas", sourceLabel: "Pokalbis telefonu",
      situationId: "legacy", createdAt: 9, due: 0, sentence: { en: friday, lt: helper } }];
    if (stress) {
      for (let i = cards.length; i < 500; i++) cards.push({ id: "c" + i, en: "Word " + i, lt: "Žodis " + i, createdAt: -i, due: 0 });
      for (let i = Object.keys(phrases).length; i < 1000; i++) phrases["p" + i] = { ...phrases.ticket, en: "Practice " + i, last: -i };
    }
    localStorage.setItem(cardKey, JSON.stringify({ v: 1, cards }));
    localStorage.setItem("english-world-progress-v1", JSON.stringify({
      version: 1, profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
        look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
      settings: { v: 6, play, quality: "low", textSize: 1.3, volume: 0, phoneCalls: false, cameraFollow: true },
      sits: { "s72-cafe": { ...finished, completions: 3 }, "s67a-tickets": finished, "s70-museum": finished },
      phrases, seenIntro: {}, started: 1, place: { zone: "town", x: -47.55, z: -16, rot: Math.PI },
      objective: "s83-invite-call", coach: { done: true, seen: { list: true }, view: true },
    }));
    if (deny) {
      for (const name of ["getItem", "setItem"]) {
        const original = Storage.prototype[name];
        Storage.prototype[name] = function (key, ...args) {
          if (key === cardKey) throw new DOMException("Storage denied", "SecurityError");
          return original.call(this, key, ...args);
        };
      }
    }
    sessionStorage.setItem("ew-play-now", "1");
  }, { play, stress, deny, friday, helper, cardKey });
  await page.goto(url);
  await page.waitForFunction(() => window.__ew?.store.getState().screen === "play", null, { timeout: 90000 });
  return { page, context, errors };
}

function bookControls(page) {
  const book = page.getByRole("dialog", { name: "Mano užrašinė" });
  const tool = page.locator('[data-pad-tool="phrasebook"]');
  const button = (name) => book.getByRole("button", { name, exact: typeof name === "string" });
  const tab = (name) => book.getByRole("tab", { name });
  return { book, tool, button, tab, open: async () => {
    const menu = page.locator('.ride-menu[aria-expanded="false"]');
    if (await menu.isVisible()) await menu.click();
    await tool.click(); await book.waitFor();
  } };
}

try {
  const { page, context, errors } = await openGame("light", 390, 664);
  const { book, tool, button, tab, open } = bookControls(page);
  const stored = await readDeck(page);
  await open();
  assert.equal(await tab(/^Išsaugotos kortelės/).getAttribute("aria-selected"), "true");
  assert.equal(await book.getByRole("link").count(), 0);
  await book.locator('[data-entry="friday"]').click();
  assert.equal(await book.locator(".nb-reading .nb-source").innerText(), "Pokalbis telefonu");
  assert(!(await book.innerText()).includes(helper));
  await button("Rodyti reikšmę").click();
  assert.equal(await book.locator(".nb-meaning").textContent(), helper);
  await button("Klausytis frazės").waitFor();
  await shot(page, "390x664-meaning");
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(":focus").getAttribute("data-entry"), "friday");
  assert.deepEqual(await readDeck(page), stored);
  await tab(/^Suvenyrai/).click();
  assert.equal(await book.locator(".nb-pocket-row").count(), 2);
  await book.locator('[data-entry="ticket"]').click();
  assert.equal(await book.locator("[data-source]").count(), 2);
  await shot(page, "390x664-ticket");
  await book.locator('[data-source="s70-museum"]').click();
  await book.getByText("Čia rasi pokalbiuose vartotas frazes.").waitFor();
  await button("Grįžti").click();
  assert.equal(await page.locator(":focus").getAttribute("data-source"), "s70-museum");
  await book.locator('[data-source="s67a-tickets"]').click();
  await book.locator('[data-entry="ticket"]').click();
  await shot(page, "390x664-phrase-before");
  await button("Išsaugoti kortelėse").click();
  await button("Tavo kortelėse").waitFor();
  await shot(page, "390x664-phrase-saved");
  await tab(/^Kartotos frazės/).click();
  await button("Išsaugoti visas").click();
  const all = await readDeck(page);
  assert.equal(all.length, 4);
  assert.equal(all.find((c) => c.id === "friday").due, 0);
  await button("Uždaryti").click();
  assert.equal(await tool.evaluate((el) => document.activeElement === el), true);
  await open();
  assert.equal(await tab(/^Kartotos frazės/).getAttribute("aria-selected"), "true");
  await tab(/^Išsaugotos kortelės/).click();
  await button(/^Kartoti korteles/).click();
  await button("Rodyti atsakymą").focus();
  await shot(page, "390x664-review-front");
  await page.keyboard.press("Enter");
  const recalled = await book.locator(".rv-en").textContent();
  await shot(page, "390x664-review-answer");
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await book.locator(".rv-en").textContent(), recalled);
  const grades = await book.locator(".rv-acts button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  assert(grades.every((r) => r.top >= 0 && r.bottom <= 390 && r.height >= 44));
  const currentRow = book.locator('.nb-round-index [aria-current="step"]');
  assert.equal(await currentRow.locator("span").last().innerText(), await book.locator(".rv-lt").innerText());
  await shot(page, "844x390-grading");
  await button("Kartoti dar kartą").click();
  assert.equal(await book.locator(".rv-count").innerText(), "2/4 · 1 pakartojimas");
  assert.equal(await currentRow.getAttribute("value"), "2");
  assert.equal(await currentRow.locator("span").last().innerText(), await book.locator(".rv-lt").innerText());
  assert.equal(await book.locator(".nb-round-index li").count(), 4);
  await shot(page, "844x390-next-card");
  await page.setViewportSize({ width: 390, height: 664 });
  await shot(page, "390x664-after-grade");
  await page.keyboard.press("Escape");
  const graded = await readDeck(page);
  assert.equal(graded.filter((c) => c.reviews).length, 1);
  assert.equal(graded.find((c) => c.reviews).lapses, 1);
  await button("Uždaryti").click();
  await page.evaluate(async () => {
    const { useCards } = await import("/src/state/cards.ts");
    const en = "I've got two tickets for a jazz concert on Friday.", lt = "Turiu du bilietus į džiazo koncertą penktadienį.";
    useCards.getState().add({ en, lt, sentence: { en, lt }, situationId: "s83-invite-call" });
  });
  await page.setViewportSize({ width: 390, height: 664 });
  await open(); await book.locator(".cd-row").first().click();
  await button("Rodyti reikšmę").click();
  const size = await book.locator("[data-reading-title]").evaluate((el) => ({
    height: el.offsetHeight, line: parseFloat(getComputedStyle(el).lineHeight), overflow: el.scrollWidth > el.clientWidth,
  }));
  assert(size.height >= 3 * size.line - 1 && !size.overflow);
  await shot(page, "390x664-long");
  assert.deepEqual(errors, []);
  await context.close();
  console.log("Picture mode, single and bulk saves, both ticket sources, empty source, review rotation, early exit and focus passed.");

  const town = await openGame("town", 1280, 800);
  const t = town.page, controls = bookControls(t);
  await t.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "bench");
  await shot(t, "1280x800-bench-standing");
  await t.keyboard.press("e");
  await t.waitForFunction(() => window.__ew.game.player.anim === "sit");
  const pose = () => t.evaluate(() => {
    const g = window.__ew.game;
    return [g.player.anim, g.player.root.position.x, g.player.root.position.z, g.heading];
  });
  async function frameTimes() {
    return t.evaluate(async () => {
      const times = [], calls = [];
      for (let i = 0; i < 61; i++) {
        times.push(await new Promise(requestAnimationFrame));
        calls.push(window.__ew.game.renderer.info.render.calls);
      }
      const deltas = times.slice(1).map((time, i) => time - times[i]).sort((a, b) => a - b);
      return { p95ms: deltas[Math.ceil(.95 * deltas.length) - 1], drawCalls: [Math.min(...calls), Math.max(...calls)] };
    });
  }
  const seated = await pose();
  await shot(t, "1280x800-bench");
  await controls.open();
  await t.keyboard.press("w");
  assert.deepEqual(await pose(), seated);
  assert.equal(await controls.book.locator(".nb-reading .nb-source").innerText(), "Pokalbis telefonu");
  assert(!(await controls.book.innerText()).includes(helper));
  await controls.button("Rodyti reikšmę").click();
  await shot(t, "1280x800-notebook");
  await controls.button("Uždaryti").click();
  assert.deepEqual(await pose(), seated);
  await t.keyboard.press("e");
  await t.waitForFunction(() => window.__ew.game.player.anim !== "sit");
  await t.setViewportSize({ width: 390, height: 844 });
  await t.locator('.ride-menu[aria-expanded="false"]').click();
  const bounds = await controls.tool.evaluate((el) => {
    const box = (target) => target.getBoundingClientRect().toJSON();
    return { button: box(el), glyph: box(el.querySelector("svg")), flap: box(el.querySelector(".pack-flap")),
      badge: box(el.querySelector(".due-badge")) };
  });
  assert.equal(bounds.button.width, 44); assert.equal(bounds.button.height, 44);
  assert(bounds.glyph.width >= 34 && bounds.badge.top > bounds.flap.bottom + 2);
  await shot(t, "390x844-drawer");
  const baselineFrames = process.env.WORLD_TIMING && await frameTimes();
  await controls.open();
  await t.locator('[data-entry="friday"]').click();
  await controls.button("Klausytis frazės").waitFor();
  await shot(t, "390x844-friday");
  if (baselineFrames) console.log("Low quality Chromium software renderer, 60 frames at the same standing pose", { drawer: baselineFrames, notebook: await frameTimes() });
  await controls.button("Uždaryti").click();
  assert.equal(await controls.tool.evaluate((el) => document.activeElement === el), true);
  await t.locator('.ride-menu[aria-expanded="true"]').click();
  await t.evaluate(() => {
    const pad = { index: 0, id: "Notebook test pad", connected: true, mapping: "standard",
      buttons: Array.from({ length: 17 }, () => ({ value: 0, pressed: false })), axes: [0, 0, 0, 0] };
    const notify = (type) => window.dispatchEvent(Object.assign(new Event(type), { gamepad: pad }));
    Object.defineProperty(navigator, "getGamepads", { value: () => [pad.connected ? pad : null], configurable: true });
    window.pressPad = async (index) => {
      const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
      for (const value of [1, 0]) {
        pad.buttons[index] = { pressed: !!value, value };
        await frame(); await frame();
      }
    };
    window.detachPad = () => { pad.connected = false; notify("gamepaddisconnected"); };
    notify("gamepadconnected");
  });
  await t.waitForFunction(() => window.__pad.connected);
  const pad = (n) => t.evaluate((key) => window.pressPad(key), n);
  await pad(9); // Menu
  for (let i = 0; i < 9 && !(await controls.tool.evaluate((el) => el === document.activeElement)); i++) await pad(13);
  assert(await controls.tool.evaluate((el) => el === document.activeElement));
  await pad(0); await controls.book.waitFor();
  // Reach the index from the tabs, enter a card, back out a level, then return to the tool.
  for (let i = 0; i < 7 && !(await t.locator(":focus").getAttribute("data-entry")); i++) await pad(13);
  const originalEntry = await t.locator(":focus").getAttribute("data-entry");
  assert(originalEntry);
  await pad(0);
  await t.locator(".nb-spread.reading").waitFor();
  await pad(1);
  assert.equal(await t.locator(":focus").getAttribute("data-entry"), originalEntry);
  await pad(1); await controls.book.waitFor({ state: "hidden" });
  assert(await controls.tool.evaluate((el) => el === document.activeElement));
  await pad(0); await controls.book.waitFor();
  await t.evaluate(() => window.detachPad());
  await t.waitForFunction(() => !window.__pad.connected);
  await controls.button("Uždaryti").click();
  assert.deepEqual(town.errors, []);
  await town.context.close();
  console.log("Main Street bench, seated and standing return, desktop spread and phone drawer passed.");

  const large = await openGame("light", 390, 844, { stress: true });
  const l = large.page, ui = bookControls(l);
  const samples = [];
  for (let i = 0; i < 11; i++) {
    const ms = await l.evaluate(() => new Promise((resolve) => {
      const t = performance.now();
      const watch = new MutationObserver(() => {
        if (!document.querySelector(".nb-index .cd-en")) return;
        watch.disconnect(); resolve(performance.now() - t);
      });
      watch.observe(document.body, { subtree: true, childList: true });
      document.querySelector('[data-pad-tool="phrasebook"]').click();
    }));
    if (i) samples.push(ms);
    assert.equal(await l.locator(".cd-row").count(), 30);
    await ui.button("Uždaryti").click();
  }
  await ui.open();
  await ui.button("Rodyti daugiau").click();
  assert.equal(await l.locator(".cd-row").count(), 60);
  await ui.button(/^Kartoti korteles/).click();
  assert.equal(await l.locator(".rv-count").textContent(), "1/20");
  await ui.button("Rodyti atsakymą").click();
  const removed = await l.locator(".rv-en").textContent();
  // A real second document writes the same-origin deck, causing a browser storage event.
  const other = await large.context.newPage();
  await other.goto(new URL("/audio-v2/repair-versions.json", base).href);
  await other.evaluate(({ key, en }) => {
    const deck = JSON.parse(localStorage.getItem(key));
    deck.cards = deck.cards.filter((c) => c.en !== en);
    localStorage.setItem(key, JSON.stringify(deck));
  }, { key: cardKey, en: removed });
  await l.waitForFunction(() => document.querySelector(".rv-count")?.textContent === "2/20");
  assert.equal(await l.locator(".rv-en").count(), 0);
  await other.close();
  assert.deepEqual(large.errors, []);
  console.log("500 cards / 1,000 phrases, 30-row batches, 20-card round and cross-tab removal passed. Warm click-to-DOM ms:", samples);
  await large.context.close();

  let online = false, denied = true, clipRequests = 0;
  const media = await openGame("light", 844, 390, { setup: async (page) => {
    await page.route("**/audio-v2/manifest.json", (route) => online ? route.continue() : route.fulfill({ status: 503, body: "" }));
    await page.route("**/audio-v2/5fb44353be01.mp3*", (route) => {
      clipRequests++;
      return denied ? route.fulfill({ status: 403, body: "" }) : route.fulfill({ contentType: "audio/wav", body: silence(4) });
    });
    await page.addInitScript(() => {
      window.voiceFallbacks = 0;
      speechSynthesis.speak = () => { window.voiceFallbacks++; };
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function () {
        if (window.blockFile && this.src.includes("5fb44353be01"))
          return Promise.reject(new DOMException("Blocked", "NotAllowedError"));
        return play.call(this);
      };
    });
  } });
  const m = media.page, mb = bookControls(m);
  await mb.open();
  await mb.book.locator('[data-entry="unit"]').click();
  await mb.book.getByText("Garso įrašas nepasiekiamas", { exact: true }).waitFor();
  await shot(m, "844x390-offline");
  online = true;
  await mb.button("Bandyti dar kartą").click();
  const hear = mb.button("Klausytis viso sakinio");
  await hear.focus();
  assert.equal(clipRequests, 0);
  await shot(m, "844x390-source");
  await hear.click();
  const retry = mb.button("Bandyti dar kartą · Klausytis viso sakinio");
  await retry.waitFor();
  assert(clipRequests > 0);
  denied = false;
  await m.evaluate(() => { window.blockFile = true; });
  await retry.click(); await retry.waitFor();
  await m.evaluate(() => { window.blockFile = false; });
  await retry.click();
  const audio = () => m.evaluate(async () => (await import("/src/game/audio.ts")).audio.getState());
  await m.waitForFunction(async () => (await import("/src/game/audio.ts")).audio.getState() === "playing");
  await mb.book.locator('[data-entry="friday"]').click();
  assert.equal(await audio(), "idle");
  await mb.button("Uždaryti").click();
  const cdp = await media.context.newCDPSession(m);
  async function listenerCount(object, type) {
    const { result } = await cdp.send("Runtime.evaluate", { expression: object });
    const { listeners } = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId });
    return listeners.filter((l) => l.type === type).length;
  }
  const count = () => Promise.all([listenerCount("document", "visibilitychange"), listenerCount("window", "pagehide"), listenerCount("window", "focus")]);
  const baseline = await count();
  for (let i = 0; i < 10; i++) {
    await mb.open();
    await mb.button("Klausytis frazės").click();
    await m.waitForFunction(async () => (await import("/src/game/audio.ts")).audio.getState() === "playing");
    if (i === 0) {
      await m.evaluate(() => window.dispatchEvent(new PageTransitionEvent("pagehide")));
      assert.equal(await audio(), "idle");
    }
    await mb.button("Uždaryti").click();
    assert.equal(await audio(), "idle");
  }
  assert.deepEqual(await count(), baseline);
  assert.equal(await m.evaluate(() => window.voiceFallbacks), 0);
  assert.deepEqual(media.errors, []);
  await media.context.close();
  console.log("Offline manifest recovery, exact source fallback, denied and blocked playback, selection cancellation, ten open/play/close cycles and listener cleanup passed (silent media fixture).");

  const memory = await openGame("light", 390, 664, {
    deny: true, setup: (p) => p.clock.install({ time: new Date(2026, 10, 26, 23, 55) }),
  });
  const mem = bookControls(memory.page);
  await mem.open(); await mem.book.getByText("Pokalbyje išsaugok žodį arba sakinį.").waitFor();
  await mem.tab(/^Kartotos frazės/).click();
  await mem.book.locator('[data-entry="friday"]').click();
  await mem.button("Išsaugoti kortelėse").click();
  await mem.tab(/^Išsaugotos kortelės/).click();
  await mem.button(/^Kartoti korteles/).click();
  await mem.button("Rodyti atsakymą").tap();
  await mem.button("Kartoti dar kartą").tap();
  assert.equal(await mem.book.locator(".rv-count").innerText(), "1/1 · Pakartojimas 1/1");
  await mem.button("Rodyti atsakymą").tap();
  await mem.button("Kartoti dar kartą").tap();
  assert.equal(await mem.book.locator(".rv-count").innerText(), "1/1 · Pakartojimas 2/2");
  await mem.button("Rodyti atsakymą").tap();
  await mem.button("Pažymėti kaip išmoktą").tap();
  await mem.book.getByText(/^Kitas kartojimas ·/).last().waitFor();
  assert.deepEqual(await memory.page.evaluate(async () => {
    const { useCards } = await import("/src/state/cards.ts");
    return useCards.getState().cards.map(({ reviews, box, lapses }) => [reviews, box, lapses]);
  }), [[1, 1, 1]]);
  await mem.button("Grįžti į korteles").click();
  await memory.page.clock.fastForward("06:00");
  await mem.button(/^Kartoti korteles/).waitFor();
  await mem.book.locator(".cd-row").click();
  await mem.button("Ištrinti kortelę").click();
  await mem.button("Taip, ištrinti").click();
  await mem.book.getByText("Pokalbyje išsaugok žodį arba sakinį.").waitFor();
  await memory.context.close();
  console.log("Denied storage, one persisted grade on a repeat, next review date and midnight rollover passed.");

  if (process.env.WORLD_COURSE_URL) {
    const course = await openGame("town", 1280, 800, {
      url: process.env.WORLD_COURSE_URL,
      setup: (page) => page.route("**/audio-v2/5fb44353be01.mp3*", (r) => r.fulfill({ contentType: "audio/wav", body: silence(4) })),
    });
    const cb = bookControls(course.page), key = "fluentsteps.songcards.v1";
    await cb.open();
    assert.equal(await course.page.evaluate((key) => localStorage.getItem(key), key), null);
    await cb.button("Klausytis frazės").click();
    await course.page.waitForFunction(() => window.__ew.audio.getState() === "playing");
    const withRadio = await course.page.evaluate(() => window.__ew.radio.store.getState().available);
    if (withRadio) assert(await course.page.evaluate(() => window.__ew.radio.holds.has("voice")));
    await cb.button("Uždaryti").click();
    assert.equal(await course.page.evaluate(() => window.__ew.radio.holds.has("voice")), false);
    await cb.open();
    const link = cb.book.getByRole("link", { name: "Atverti kurso korteles" });
    const url = new URL("/korteles?mode=mine", process.env.WORLD_COURSE_URL).href;
    assert.equal(await link.getAttribute("href"), url);
    await course.context.route(url, (r) => r.fulfill({ status: 200, body: "" }));
    const popup = course.context.waitForEvent("page");
    await link.click();
    const next = await popup; await next.waitForURL(url); await next.close();
    await course.page.bringToFront();
    assert(await link.evaluate((el) => el === document.activeElement));
    await cb.tab(/^Kartotos frazės/).click(); await cb.button("Išsaugoti visas").click();
    assert.equal(await course.page.evaluate((key) => JSON.parse(localStorage.getItem(key)).cards.length, key), 2);
    await course.context.close();
    console.log("Course config, explicit new tab, mine URL, focus return and incremental mirror passed.");
  }
} finally { await browser.close(); }
