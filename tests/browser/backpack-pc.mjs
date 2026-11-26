// Run against either Puerto Colibrí build. WORLD_LEARNER=lt selects Lithuanian assertions.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { silence } from "./radio-fixtures.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const lt = process.env.WORLD_LEARNER === "lt";
const word = (english, lithuanian) => lt ? lithuanian : english;
const friday = "¿Estás libre el viernes?";
const helper = word("Are you free on Friday?", "Ar esi laisva penktadienį?");
const source = word("Phone conversation", "Pokalbis telefonu");
const shots = process.env.WORLD_SHOTS;
const deck = "puerto-colibri-cards-v1";
const browser = await chromium.launch({ executablePath: process.env.WORLD_BROWSER_PATH, headless: true,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

async function openGame(play, { large = false, denyDeck = false } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, reducedMotion: "reduce" });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript(({ play, friday, helper, deck, ticket, large, denyDeck }) => {
    if (localStorage.getItem(deck)) return;
    const completed = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
    const situationId = "s83-invite-call";
    const unit = { en: "viernes", lt: ticket.friday, sentence: { en: friday, lt: helper } };
    const cards = [
      { id: "friday", en: friday, lt: helper, sentence: { en: friday, lt: helper }, situationId,
        sourceLabel: helper, createdAt: 2, due: 0, box: 2 },
      { ...unit, id: "unit", situationId, createdAt: 1, due: 0, box: 3 },
    ];
    const phrases = { ticket: { en: "Dos boletos, por favor.", lt: ticket.helper, sitId: "s67a-tickets", count: 3, last: 8 },
      friday: { en: friday, lt: helper, sitId: situationId, count: 2, last: 4 } };
    if (large) {
      for (let i = cards.length; i < 500; i++) cards.push({ ...cards[0], id: "c" + i, en: "Tarjeta " + i, createdAt: -i });
      for (let i = 2; i < 1000; i++) phrases["p" + i] = { ...phrases.ticket, en: "Frase " + i, last: -i };
    }
    localStorage.setItem(deck, JSON.stringify({ v: 1, cards }));
    localStorage.setItem("puerto-colibri-progress-v1", JSON.stringify({
      version: 1, profile: { name: "Ana", surname: "Cruz", gender: "f", lookId: "f1",
        look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
      settings: { v: 6, play, quality: "low", textSize: 1.3, volume: 0, phoneCalls: false, cameraFollow: true },
      sits: { "s72-cafe": { ...completed, completions: 3 }, "s67a-tickets": completed, "s70-museum": completed, "x10-loteria": completed },
      phrases,
      seenIntro: {}, started: 1, objective: situationId, place: { zone: "town", x: -47.55, z: -16, rot: Math.PI },
      coach: { done: true, seen: { list: true }, view: true },
    }));
    if (denyDeck) {
      for (const method of ["getItem", "setItem"]) {
        const original = Storage.prototype[method];
        Storage.prototype[method] = function (key, ...args) {
          if (key === deck) throw new DOMException("Storage denied", "SecurityError");
          return original.call(this, key, ...args);
        };
      }
    }
    sessionStorage.setItem("ew-play-now", "1");
  }, { deck, play, friday, helper, large, denyDeck, ticket: { friday: word("Friday", "penktadienis"), helper: word("Two tickets, please.", "Du bilietus, prašau.") } });
  await page.goto(url);
  await page.waitForFunction(() => window.__ew?.store.getState().screen === "play", null, { timeout: 120000 });
  return { context, page, errors };
}

async function shot(page, name) {
  if (!shots) return;
  await mkdir(shots, { recursive: true });
  await page.screenshot({ path: path.join(shots, (lt ? "lt-" : "en-") + name + ".png") });
}

try {
  const { page, context, errors } = await openGame("light");
  const tool = page.locator('[data-pad-tool="phrasebook"]');
  const book = page.getByRole("dialog", { name: word("My notebook", "Mano užrašinė") });
  const button = (name) => book.getByRole("button", { name, exact: true });
  const tab = (leaf) => book.getByRole("tab").nth(leaf);
  const read = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).cards, deck);
  const original = await read();
  const courseCards = () => page.evaluate(() => JSON.parse(localStorage.getItem("fluentsteps.songcards.v1"))?.cards ?? []);
  let denied = true, clipRequests = 0;
  await page.route("**/audio-es/5642f36306d3.mp3*", (route) => {
    clipRequests++;
    return denied ? route.fulfill({ status: 403 }) : route.fulfill({ contentType: "audio/wav", body: silence(2) });
  });
  await tool.click();
  assert.equal(await tab(0).getAttribute("aria-selected"), "true");
  const link = book.getByRole("link", { name: word("Open course cards", "Atverti kurso korteles") });
  if (process.env.WORLD_COURSE === "1") {
    assert.equal(await link.getAttribute("href"), new URL(lt ? "/korteles?mode=mine" : "/flashcards?mode=mine", url).href);
    await context.route(lt ? "**/korteles?mode=mine" : "**/flashcards?mode=mine",
      (route) => route.fulfill({ contentType: "text/html", body: "<title>Collection</title>" }));
    const [collection] = await Promise.all([context.waitForEvent("page"), link.click()]);
    await collection.waitForLoadState();
    assert.equal(await collection.title(), "Collection");
    assert.equal(collection.url(), await link.getAttribute("href"));
    await collection.close();
    await page.bringToFront();
  } else assert.equal(await link.count(), 0);
  await book.locator('[data-entry="friday"]').click();
  assert.equal(await book.locator(".nb-reading .nb-source").innerText(), source);
  assert.equal(await book.locator(".nb-meaning").count(), 0);
  await button(word("Show meaning", "Rodyti reikšmę")).click();
  assert.equal(await book.locator(".nb-meaning").innerText(), helper);
  assert.equal(await book.locator(".nb-meaning").getAttribute("lang"), lt ? "lt" : "en");
  assert.equal(await book.locator("[data-reading-title]").getAttribute("lang"), "es");
  const hear = button(word("Hear phrase", "Klausytis frazės"));
  await hear.focus();
  assert.equal(clipRequests, 0);
  await hear.click();
  const retry = button(word("Try again · Hear phrase", "Bandyti dar kartą · Klausytis frazės"));
  await retry.waitFor();
  denied = false;
  await retry.click();
  await hear.waitFor();
  assert(clipRequests > 0);
  await shot(page, "390x844-friday");
  assert.deepEqual(await read(), original);
  await page.keyboard.press("Escape");
  assert.equal(await page.locator(":focus").getAttribute("data-entry"), "friday");
  await book.locator('[data-entry="unit"]').click();
  await button(word("Hear source sentence", "Klausytis viso sakinio")).waitFor();
  assert.equal(await book.locator(".nb-context mark").textContent(), "viernes");
  await page.keyboard.press("Escape");
  await tab(2).click();
  await book.locator('[data-entry="ticket"]').click();
  assert.equal(await book.locator("[data-source]").count(), 2);
  await book.locator('[data-source="s70-museum"]').click();
  assert.equal(await book.locator(".nb-empty").textContent(), word("Your practiced phrases will appear here.", "Čia rasi pokalbiuose vartotas frazes."));
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 844, height: 390 });
  await book.locator('[data-entry="loteria_card"]').click();
  assert.equal(await book.locator("[data-reading-title]").innerText(), word("Lotería card", "Loterijos korta"));
  await shot(page, "844x390-loteria");
  await tab(1).click();
  assert.deepEqual(await courseCards(), []);
  await button(word("Save all", "Išsaugoti visas")).click();
  assert.equal((await read()).length, 3);
  assert.deepEqual((await read())[0], original[0]);
  const mirrored = await courseCards();
  assert.deepEqual(mirrored.map(({ back, deck }) => [back, deck]), process.env.WORLD_COURSE === "1" ? [["Dos boletos, por favor.", "words"]] : []);
  await tab(0).click();
  await book.locator("[data-review]").click();
  const reveal = () => button(word("Show answer", "Rodyti atsakymą")).press("Enter");
  const gotIt = () => button(word("Got it", "Pažymėti kaip išmoktą")).click();
  await page.setViewportSize({ width: 390, height: 664 });
  await reveal();
  const answer = await book.locator(".rv-en").innerText();
  const grades = await book.locator(".rv-acts button").evaluateAll((actions) => actions.map((a) => a.getBoundingClientRect().toJSON()));
  assert(grades.every((r) => r.height >= 44 && r.top >= 0 && r.bottom <= 664));
  await shot(page, "390x664-grading");
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await book.locator(".rv-en").innerText(), answer);
  await button(word("Again", "Kartoti dar kartą")).click();
  assert.equal(await book.locator(".rv-count").innerText(), word("2/3 · 1 retry", "2/3 · 1 pakartojimas"));
  await shot(page, "844x390-review");
  await reveal(); await gotIt();
  await reveal(); await gotIt();
  assert.equal(await book.locator(".rv-count").innerText(), word("1/3 · Retry 1/1", "1/3 · Pakartojimas 1/1"));
  assert.equal(await book.locator(".nb-round-index [aria-current]").getAttribute("value"), "1");
  await reveal(); await gotIt();
  await book.locator(".rv-done").waitFor();
  assert.deepEqual((await read()).map((c) => c.reviews), [1, 1, 1]);
  await button(word("Back to cards", "Grįžti į korteles")).click();
  await tab(2).click();
  await button(word("Close", "Uždaryti")).click();
  assert.equal(await page.locator(":focus").getAttribute("data-pad-tool"), "phrasebook");
  await tool.press("Enter");
  assert.equal(await tab(2).getAttribute("aria-selected"), "true");
  assert.deepEqual(errors, []);
  await context.close();

  const deniedGame = await openGame("light", { denyDeck: true });
  const local = deniedGame.page;
  const pack = local.locator('[data-pad-tool="phrasebook"]');
  await pack.click();
  await local.getByText(word("Save a word or sentence in a conversation.", "Pokalbyje išsaugok žodį arba sakinį."), { exact: true }).waitFor();
  await local.getByRole("tab").nth(1).click();
  await local.locator('[data-entry="ticket"]').click();
  await local.getByRole("button", { name: word("Save to cards", "Išsaugoti kortelėse"), exact: true }).click();
  assert(await local.getByRole("button", { name: word("In your cards", "Tavo kortelėse"), exact: true }).isDisabled());
  await local.getByRole("button", { name: word("Close", "Uždaryti"), exact: true }).click();
  await pack.click();
  await local.getByRole("tab").first().click();
  assert.equal(await local.locator(".cd-en").innerText(), "Dos boletos, por favor.");
  assert.deepEqual(deniedGame.errors, []);
  await deniedGame.context.close();

  if (!lt) {
    const { page: town, context: townContext, errors: townErrors } = await openGame("town");
    await town.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "bench");
    await town.keyboard.press("e");
    await town.waitForFunction(() => window.__ew.game.player.anim === "sit");
    await town.locator('.ride-menu[aria-expanded="false"]').click();
    await shot(town, "390x844-drawer");
    await town.locator('[data-pad-tool="phrasebook"]').click();
    await town.setViewportSize({ width: 1280, height: 800 });
    const pose = () => town.evaluate(() => window.__ew.game.player.root.position.toArray());
    const seated = await pose();
    await town.keyboard.press("w");
    assert.deepEqual(await pose(), seated);
    await town.getByRole("button", { name: "Show meaning", exact: true }).click();
    await shot(town, "1280x800-notebook");
    await town.getByRole("button", { name: "Close", exact: true }).click();
    assert.deepEqual(await pose(), seated);
    assert.equal(await town.evaluate(() => window.__ew.game.player.anim), "sit");
    await town.keyboard.press("e");
    await town.waitForFunction(() => window.__ew.game.player.anim !== "sit");
    await town.setViewportSize({ width: 390, height: 844 });
    const tool = town.locator('[data-pad-tool="phrasebook"]');
    const book = town.getByRole("dialog", { name: "My notebook" });
    await town.evaluate(() => {
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
    await town.waitForFunction(() => window.__pad.connected);
    const pressPad = (n) => town.evaluate((key) => window.pressPad(key), n);
    await pressPad(9); // Menu
    for (let i = 0; i < 12 && !(await tool.evaluate((el) => el === document.activeElement)); i++) await pressPad(13);
    assert(await tool.evaluate((el) => el === document.activeElement));
    await pressPad(0); await book.waitFor();
    // Reach the index from the tabs, enter a card, back out a level, then return to the tool.
    for (let i = 0; i < 7 && !(await town.locator(":focus").getAttribute("data-entry")); i++) await pressPad(13);
    const originalEntry = await town.locator(":focus").getAttribute("data-entry");
    assert(originalEntry);
    await pressPad(0);
    await town.locator(".nb-spread.reading").waitFor();
    await pressPad(1);
    assert.equal(await town.locator(":focus").getAttribute("data-entry"), originalEntry);
    await pressPad(1); await book.waitFor({ state: "hidden" });
    assert(await tool.evaluate((el) => el === document.activeElement));
    await pressPad(0); await book.waitFor();
    await town.evaluate(() => window.detachPad());
    await town.waitForFunction(() => !window.__pad.connected);
    await town.getByRole("button", { name: "Close", exact: true }).click();
    assert.deepEqual(townErrors, []);
    await townContext.close();

    const batch = await openGame("light", { large: true });
    const many = batch.page;
    const openTimes = [];
    for (let visit = 0; visit < 11; visit++) {
      const elapsed = await many.evaluate(() => new Promise((resolve) => {
        const start = performance.now();
        const watch = new MutationObserver(() => {
          if (!document.querySelector(".nb-entry")) return;
          watch.disconnect(); resolve(performance.now() - start);
        });
        watch.observe(document.body, { childList: true, subtree: true });
        document.querySelector('[data-pad-tool="phrasebook"]').click();
      }));
      if (visit) openTimes.push(Math.round(elapsed));
      assert.equal(await many.locator(".cd-row").count(), 30);
      if (visit < 10) await many.getByRole("button", { name: "Close", exact: true }).click();
    }
    await many.getByRole("button", { name: "Show more", exact: true }).click();
    assert.equal(await many.locator(".cd-row").count(), 60);
    await many.locator("[data-review]").click();
    assert.equal(await many.locator(".rv-count").innerText(), "1/20");
    await many.locator(".rv-reveal").click();
    const current = await many.locator(".rv-en").innerText();
    const other = await batch.context.newPage();
    await other.goto(new URL("/audio-es/repair-versions.json", url).href);
    await other.evaluate(({ deck, current }) => {
      const { cards } = JSON.parse(localStorage.getItem(deck));
      localStorage.setItem(deck, JSON.stringify({ v: 1, cards: cards.filter((c) => c.en !== current) }));
    }, { deck, current });
    await many.waitForFunction(() => document.querySelector(".rv-count")?.textContent === "2/20");
    assert.equal(await many.locator(".rv-en").count(), 0);
    assert.deepEqual(batch.errors, []);
    await batch.context.close();
    console.log("Warm open to first card in milliseconds:", openTimes.join(", "));
  }
  console.log("Backpack checks passed for " + (lt ? "es-lt" : "es"));
} finally { await browser.close(); }
