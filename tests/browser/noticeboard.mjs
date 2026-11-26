// Serve each PC learner build on its own origin with VITE_RADIO_INDEX=/songs/index.json and VITE_AUDIO_BASE=/game/audio-es/.
// WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en WORLD_TEST_URL=http://127.0.0.1:5190 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/noticeboard.mjs
import assert from "node:assert/strict";
import { installTown, key, progress, helperLang, learnerLabel, screenshot } from "./life-harness.mjs";
import { readFile } from "node:fs/promises";
import { silence, keepRadioLocal } from "./radio-fixtures.mjs";

assert.equal(process.env.WORLD_STORAGE, "puerto-colibri");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5190";
const { items } = JSON.parse(await readFile(new URL(`../../src/editions/es/content/phrases/phrase-game.pc-${helperLang}.json`, import.meta.url)));
const bus = items.find(row => row.id === `pc-${helperLang}-001`);
const savedLabel = learnerLabel("Tavo kortelėse", "In your cards");
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  executablePath: process.env.WORLD_BROWSER_EXECUTABLE,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 664 }, reducedMotion: "reduce" });
  page.setDefaultTimeout(45000);
  await keepRadioLocal(page, base);
  const start = { ...progress, place: { zone: "town", x: 29.5, z: 0, rot: Math.PI },
    settings: { ...progress.settings, textSize: 1.3, phoneCalls: false, textMessages: false } };
  await page.addInitScript(installTown, { key, progress: start, variety: "default" });
  // Prior encounter with this sentence, already reviewed. Subsequent Save presses must preserve every field.
  const storage = "puerto-colibri-cards-v1";
  const earlier = { id: "ew-earlier", en: bus.f, lt: bus.p, sentence: { en: bus.f, lt: bus.p },
    situationId: "s72-cafe", box: 3, createdAt: 1, due: 1800000000000, reviews: 2, lapses: 0, lastReview: 2 };
  await page.addInitScript(([key, card]) => localStorage.setItem(key, JSON.stringify({ v: 1, cards: [card] })), [storage, earlier]);
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00Z"));
  await page.addInitScript(() => {
    const controller = { mapping: "standard", id: "test", connected: true, index: 0, axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, touched: false, value: 0 })) };
    Object.defineProperty(navigator, "getGamepads", { value: () => [controller] });
    window.pressButton = async (index) => {
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
      controller.buttons[index].pressed = true;
      await frame(); await frame();
      controller.buttons[index].pressed = false;
      await frame(); await frame();
    };
  });

  const wav = { contentType: "audio/wav", body: silence(60) };
  const song = { id: "G01", c: "g", n: 1, t: "Test", tl: "Test", tp: "", g: "soul", d: 60, a: "/songs/audio/G01.mp3" };
  await page.route("**/songs/index.json", route => route.fulfill({ json: { lang: "en", songs: [song] } }));
  await page.route("**/songs/data/G01.json", route => route.fulfill({ json: { L: [] } }));
  await page.route("**/songs/audio/G01.mp3", route => route.fulfill(wav));
  const deckRequests = [];
  page.on("request", request => { if (request.url().includes("phrase-game.pc-")) deckRequests.push(request.url()); });
  await page.addInitScript(() => localStorage.setItem("fs-files-token",
    JSON.stringify({ token: "local-course-fixture", exp: Date.UTC(2030, 0, 1) / 1000 })));
  const clips = [];
  await page.route("**/ph-*.mp3*", route => {
    const url = new URL(route.request().url());
    assert.equal(url.searchParams.get("t"), "local-course-fixture");
    clips.push(url.pathname.split("/").pop());
    return route.fulfill(wav);
  });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  const until = async test => {
    try { await page.waitForFunction(test, null, { timeout: 90000 }); }
    catch (error) {
      const state = await page.evaluate(() => ({
        player: window.__ew?.game.player.root.position.toArray(), prompt: window.__ew?.store.getState().hud.prompt,
        panel: window.__ew?.store.getState().hud.panel, focus: document.activeElement?.outerHTML.slice(0, 240),
        voice: window.__ew?.voice(), radio: window.__ew?.radio.store.getState().playing, pad: window.__pad,
      }));
      throw new Error(`${test} · ${JSON.stringify(state)}`, { cause: error });
    }
  };
  const press = index => page.evaluate(i => window.pressButton(i), index);
  await until(() => window.__pad?.connected && window.__ew?.store.getState().screen === "play");
  assert.equal(await page.locator("html").getAttribute("lang"), helperLang);
  assert.equal(deckRequests.length, 0);
  await page.evaluate(() => {
    // The input test counts draw calls and triangles. Review captures below use the normal render resolution.
    window.__ew.game.renderer.setPixelRatio(0.5);
    window.__ew.game.placeOnFoot(28, -14.6, Math.PI);
    window.__ew.game.walkTo(30, -17.3);
  });
  await until(() => window.__ew.store.getState().hud.prompt?.kind === "read" && !window.__ew.store.getState().hud.walking);
  const summary = page.locator(".objective-summary");
  await summary.waitFor();
  await summary.click();
  assert.equal(await page.locator(".objective-card [aria-expanded=true]").count(), 1);
  assert.ok((await page.locator(".hud .prompt").innerText()).includes(learnerLabel("Skaityti dienos frazę", "Read today’s phrase")));
  // Leave with the quest open, then approach again. Each new Read prompt folds it for that visit.
  await page.evaluate(() => window.__ew.game.walkTo(30, -14));
  await until(() => window.__ew.game.player.root.position.z > -14.8 && window.__ew.store.getState().hud.prompt?.kind !== "read");
  await page.locator(".objective-card [aria-expanded=true]").waitFor();
  await page.evaluate(() => window.__ew.game.walkTo(30, -17.3));
  await until(() => window.__ew.store.getState().hud.prompt?.kind === "read");
  await summary.waitFor();
  await until(() => !window.__ew.store.getState().hud.walking);
  // Compare the same camera with just this prop hidden/visible on each pass. Other town activity
  // (pedestrians, streaming) can change the whole-scene totals between visits.
  const measure = () => page.evaluate(() => {
    const { renderer, scene, rig, town } = window.__ew.game;
    const draw = () => {
      renderer.render(scene, rig.cam);
      const { calls, triangles } = renderer.info.render;
      return { calls, triangles, ...renderer.info.memory };
    };
    town.noticeboard.mesh.visible = false;
    const hidden = draw();
    town.noticeboard.mesh.visible = true;
    return { hidden, visible: draw(), voice: window.__ew.voice() };
  });
  const ink = await page.evaluate(phrases => {
    const { noticeboard, town } = window.__ew.game;
    const ctx = town.noticeboard.mesh.material.map.image.getContext("2d");
    const fillText = ctx.fillText;
    const layouts = [];
    let lines;
    ctx.fillText = function (text, x, y) {
      if (text !== "Frase del día") {
        const m = this.measureText(text);
        lines.push({ text, left: x - m.actualBoundingBoxLeft, right: x + m.actualBoundingBoxRight,
          top: y - m.actualBoundingBoxAscent, bottom: y + m.actualBoundingBoxDescent });
      }
      fillText.call(this, text, x, y);
    };
    try {
      for (const phrase of phrases) {
        lines = [];
        town.noticeboard.paint(phrase);
        layouts.push({ phrase, lines });
      }
    } finally {
      ctx.fillText = fillText;
      town.noticeboard.paint(noticeboard.snapshot().row.f);
    }
    return layouts;
  }, [1, 6, 5, 129, 9, 2, 18, 12, 21, 14, 16, 24, 25, 40].map(n => items.find(row => Number(row.id.slice(-3)) === n).f));
  for (const { phrase, lines } of ink) {
    assert.equal(lines.map(line => line.text).join(" "), phrase);
    for (const [i, line] of lines.entries()) {
      assert.ok(line.left >= 12 && line.right <= 244 && line.top >= 47 && line.bottom <= 237);
      if (i) assert.ok(lines[i - 1].bottom < line.top);
    }
  }
  const before = await measure();
  for (let visit = 0; visit < 10; visit++) {
    await press(2);
    await page.waitForSelector(".posting-paper[open]");
    await press(1);
    await until(() => !document.querySelector(".posting-paper") && window.__ew.store.getState().hud.prompt?.kind === "read");
  }
  const after = await measure();
  for (const sample of [before, after]) {
    assert.equal(sample.visible.calls - sample.hidden.calls, 1);
    assert.equal(sample.visible.triangles - sample.hidden.triangles, 36);
    assert.equal(sample.voice, "idle");
  }
  assert.equal(deckRequests.length, 1);
  assert.ok(deckRequests[0].includes(`phrase-game.pc-${helperLang}`));
  assert.equal(clips.length, 0);
  console.log("Ten silent visits", { before, after, decks: deckRequests.length, clips: clips.length });
  // A storage refusal keeps the new card in memory and explains its lifetime once.
  await page.clock.setFixedTime(new Date("2026-11-27T12:00:00Z"));
  await page.evaluate(key => {
    window.normalWrite = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Full", "QuotaExceededError");
      return window.normalWrite.call(this, name, value);
    };
  }, storage);
  await page.keyboard.press("e");
  await page.locator("[data-phrase-save]").click();
  assert.equal(await page.locator(".posting-paper footer small").innerText(), learnerLabel("Kortelė išsaugota tik šiam kartui.", "Card saved for this visit only."));
  assert.equal(await page.locator("[data-phrase-save]").innerText(), savedLabel);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { Storage.prototype.setItem = window.normalWrite; });
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00Z"));
  await page.keyboard.press("e");
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("¿Hay autobús?"));
  assert.deepEqual(await page.locator(".posting-voice:visible").allTextContents(), ["ES", helperLang.toUpperCase()]);
  assert.match(await page.locator(".posting-line").first().getAttribute("aria-label"), /\(ES\).*¿Hay autobús/);
  assert.equal(await page.locator(".posting-line").last().getAttribute("aria-label"),
    `${learnerLabel("Klausytis vertimo", "Hear the translation")} (${helperLang.toUpperCase()}) · ${bus.p}`);
  await page.keyboard.press("Tab");
  assert.ok((await page.locator(":focus").innerText()).includes(bus.p));
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").getAttribute("aria-label"), savedLabel);
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Shift+Tab");
  assert.equal(await page.locator(":focus").getAttribute("aria-label"), learnerLabel("Uždaryti", "Close"));
  await page.keyboard.press("Enter");
  await until(() => document.activeElement?.matches(".hud .prompt"));
  // The keyboard gesture unlocked media. The controller owns the remaining board actions.
  await page.evaluate(() => window.__ew.radio.setOn(true));
  await until(() => window.__ew.radio.store.getState().playing);
  await press(2); // X from the reading mark
  await page.waitForSelector(".posting-paper[open]");
  assert.equal(clips.length, 0);
  assert.equal(await page.locator("[data-phrase-save]").innerText(), savedLabel);
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("¿Hay autobús?"));
  await press(0); // A on Spanish
  await until(() => window.__ew.voice() === "playing" && window.__ew.radio.store.getState().held);
  await press(13); // Down to the course translation
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.querySelector("[lang]:not([lang=es])"));
  await press(0);
  await until(() => window.__ew.voice() === "playing");
  assert.deepEqual(clips, [bus.fClip, bus.pClip]);
  await press(13);
  await until(() => document.activeElement?.hasAttribute("data-phrase-save"));
  await press(0); await press(0);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).cards, storage), [earlier]);
  await press(13); // Close is also reachable by directional navigation.
  await until(() => document.activeElement?.hasAttribute("data-pad-back"));
  await press(1); // B returns to the town and releases only the posting's clip.
  await until(() => !document.querySelector(".posting-paper") && window.__ew.voice() === "idle" && window.__ew.radio.store.getState().playing);

  await press(2);
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("¿Hay autobús?"));
  await press(0);
  await until(() => window.__ew.voice() === "playing");
  await page.evaluate(() => window.__ew.game.startScenario("s72-cafe", true));
  await until(() => !document.querySelector(".posting-paper") && window.__ew.store.getState().conv.active);
  assert.equal(await page.evaluate(() => {
    const player = window.__ew.audio.clip?.el;
    return !!player && !player.paused && player.src.includes("ph-fee94b260b");
  }), false);
  console.log("Controller, replay, radio, reviewed card, conversation handoff passed (silent media fixtures).");
  await page.close();
  await touchSheet(browser);
} finally {
  await browser.close();
}

async function touchSheet(browser) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  page.setDefaultTimeout(45000);
  await keepRadioLocal(page, base);
  await page.route("**/ph-*.mp3*", route => route.fulfill({ status: 404, body: "" }));
  const start = { ...progress, place: { zone: "town", x: 30, z: -17.3, rot: Math.PI },
    settings: { ...progress.settings, textSize: 1.3, phoneCalls: false, textMessages: false } };
  await page.addInitScript(installTown, { key, progress: start, variety: "default" });
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00Z"));
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__ew?.store.getState().hud.prompt?.kind === "read", null, { timeout: 90000 });
  const prompt = page.locator(".hud .prompt");
  const paper = page.locator(".posting-paper");
  const save = paper.locator("[data-phrase-save]");
  const close = paper.locator("[data-pad-back]");
  const shot = (name) => {
    const { width, height } = page.viewportSize();
    return screenshot(page, name, width, height);
  };
  await page.evaluate(() => window.__ew.coach.finish());
  await prompt.tap();
  await paper.locator(".posting-line").last().waitFor();
  await shot("day-one");
  assert.equal(await save.innerText(), learnerLabel("Išsaugoti kortelėse", "Save to cards"));
  assert.equal(await page.evaluate(() => localStorage.getItem("puerto-colibri-cards-v1")), null);

  await page.setViewportSize({ width: 390, height: 664 });
  await paper.locator(".posting-line").last().tap();
  await paper.getByText(learnerLabel("Nepavyko paleisti garso įrašo", "Audio unavailable")).waitFor();
  await shot("audio-failure");
  await save.tap();
  await save.tap();
  assert.equal(await save.innerText(), savedLabel);
  const cards = await page.evaluate(() => JSON.parse(localStorage.getItem("puerto-colibri-cards-v1")).cards);
  assert.equal(cards.length, 1);
  const [card] = cards;
  assert.deepEqual([card.en, card.lt, card.sourceLabel, card.situationId, card.box],
    [bus.f, bus.p, learnerLabel("Dienos frazė", "Phrase of the day") + " · " + bus.src, "", 1]);
  assert.equal(card.due, await page.evaluate(() => new Date().setHours(0, 0, 0, 0)));
  await close.tap();
  await page.evaluate(() => window.__ew.store.getState().setHud({ panel: "phrasebook" }));
  await page.getByRole("tab").last().tap();
  await page.locator(".cd-row").getByText(card.sourceLabel).waitFor();
  await page.locator(".cd-row .del").tap();
  await page.locator(".cd-row .del.sure").tap();
  await page.locator(".sheet-head button").last().tap();
  await prompt.tap();
  assert.equal(await save.getAttribute("aria-pressed"), "false");
  await close.tap();

  await page.setViewportSize({ width: 844, height: 390 });
  await shot("approach");
  await page.context().setOffline(true);
  // Day seven carries the longest target in the strip. It opens from the already loaded deck.
  await page.clock.setFixedTime(new Date("2026-12-02T12:00:00Z"));
  await prompt.tap();
  await paper.getByText("Quería pedir una cita, por favor.", { exact: true }).waitFor();
  for (const control of await paper.getByRole("button").all()) {
    const rect = await control.boundingBox();
    assert.ok(rect && rect.height >= 44 && rect.width >= 44 && rect.y >= 0 && rect.y + rect.height <= 390);
  }
  await shot("long-posting");
  await page.setViewportSize({ width: 1280, height: 800 });
  await shot("desktop");
  await close.tap();
  await page.close();
  console.log("Touch, offline posting, failed recording, save and removal passed.");
}
