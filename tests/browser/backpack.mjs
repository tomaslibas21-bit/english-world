// Run against the local game. WORLD_SHOTS is optional, as in the other town browser checks.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
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

async function openGame(play, width, height, stress = false) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce" });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.addInitScript(({ play, stress, friday, helper, cardKey }) => {
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
    sessionStorage.setItem("ew-play-now", "1");
  }, { play, stress, friday, helper, cardKey });
  await page.goto(base);
  await page.waitForFunction(() => window.__ew?.store.getState().screen === "play");
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
  await button("Išsaugoti kortelėse").click();
  await button("Tavo kortelėse").waitFor();
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
  await page.keyboard.press("Enter");
  const recalled = await book.locator(".rv-en").textContent();
  await page.setViewportSize({ width: 844, height: 390 });
  assert.equal(await book.locator(".rv-en").textContent(), recalled);
  const grades = await book.locator(".rv-acts button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().toJSON()));
  assert(grades.every((r) => r.top >= 0 && r.bottom <= 390 && r.height >= 44));
  await shot(page, "844x390-grading");
  await button("Kartoti dar kartą").click();
  await page.keyboard.press("Escape");
  const graded = await readDeck(page);
  assert.equal(graded.filter((c) => c.reviews).length, 1);
  assert.equal(graded.find((c) => c.reviews).lapses, 1);
  await button("Uždaryti").click();
  assert.deepEqual(errors, []);
  await context.close();
  console.log("Picture mode, single and bulk saves, both ticket sources, empty source, review rotation, early exit and focus passed.");

  const town = await openGame("town", 1280, 800);
  const t = town.page, controls = bookControls(t);
  await t.waitForFunction(() => window.__ew.store.getState().hud.prompt?.kind === "bench");
  await t.keyboard.press("e");
  await t.waitForFunction(() => window.__ew.game.player.anim === "sit");
  const pose = () => t.evaluate(() => {
    const g = window.__ew.game;
    return [g.player.anim, g.player.root.position.x, g.player.root.position.z, g.heading];
  });
  const seated = await pose();
  await shot(t, "1280x800-bench");
  await controls.open();
  await t.keyboard.press("w");
  assert.deepEqual(await pose(), seated);
  await controls.button("Rodyti reikšmę").click();
  await shot(t, "1280x800-notebook");
  await controls.button("Uždaryti").click();
  assert.deepEqual(await pose(), seated);
  await t.keyboard.press("e");
  await t.waitForFunction(() => window.__ew.game.player.anim !== "sit");
  await t.setViewportSize({ width: 390, height: 844 });
  await t.locator('.ride-menu[aria-expanded="false"]').click();
  await shot(t, "390x844-drawer");
  await controls.open();
  await t.locator('[data-entry="friday"]').click();
  await controls.button("Klausytis frazės").waitFor();
  await shot(t, "390x844-friday");
  await controls.button("Uždaryti").click();
  assert.equal(await controls.tool.evaluate((el) => document.activeElement === el), true);
  assert.deepEqual(town.errors, []);
  await town.context.close();
  console.log("Main Street bench, seated and standing return, desktop spread and phone drawer passed.");

  const large = await openGame("light", 390, 844, true);
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
} finally { await browser.close(); }
