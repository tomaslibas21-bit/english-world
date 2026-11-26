// Run against a build with VITE_RADIO_INDEX=/songs/index.json.
// WORLD_TEST_URL=http://127.0.0.1:5190 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/noticeboard.mjs
import assert from "node:assert/strict";
import { installTown, key, progress } from "./life-harness.mjs";
import { silence } from "./radio-fixtures.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  executablePath: process.env.WORLD_BROWSER_EXECUTABLE,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--mute-audio"],
});
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 664 }, reducedMotion: "reduce" });
  const start = { ...progress, place: { zone: "town", x: 32, z: -17.3, rot: Math.PI },
    settings: { ...progress.settings, textSize: 1.3, phoneCalls: false, textMessages: false } };
  await page.addInitScript(installTown, { key, progress: start });
  // Prior encounter with this sentence, already reviewed. Subsequent Save presses must preserve every field.
  const storage = "english-world-cards-v1";
  const earlier = { id: "ew-earlier", en: "Is it far?", lt: "Ar toli?", sentence: { en: "Is it far?", lt: "Ar toli?" },
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
  page.on("request", request => { if (request.url().includes("phrase-game.mh")) deckRequests.push(request.url()); });
  const clips = [];
  await page.route("**/ph-*.mp3", route => {
    clips.push(new URL(route.request().url()).pathname.split("/").pop());
    return route.fulfill(wav);
  });
  await page.goto(process.env.WORLD_TEST_URL || "http://127.0.0.1:5190", { waitUntil: "domcontentloaded" });
  const until = test => page.waitForFunction(test, null, { timeout: 90000 });
  const press = index => page.evaluate(i => window.pressButton(i), index);
  await until(() => window.__pad?.connected && window.__ew?.store.getState().hud.prompt?.kind === "read");
  const summary = page.locator(".objective-summary");
  await summary.waitFor();
  await summary.click();
  assert.equal(await page.locator(".objective-card [aria-expanded=true]").count(), 1);
  assert.match(await page.locator(".hud .prompt").innerText(), /Skaityti dienos frazę/);
  // Leave with the quest open, then approach again. Each new Read prompt folds it for that visit.
  await page.evaluate(() => window.__ew.game.walkTo(32, -14));
  await until(() => window.__ew.game.player.root.position.z > -14.8 && window.__ew.store.getState().hud.prompt?.kind !== "read");
  await page.locator(".objective-card [aria-expanded=true]").waitFor();
  await page.evaluate(() => window.__ew.game.walkTo(32, -17.3));
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
  assert.equal(await page.locator(".posting-paper footer small").innerText(), "Kortelė išsaugota tik šiam kartui.");
  assert.match(await page.locator("[data-phrase-save]").innerText(), /Tavo kortelėse/);
  await page.keyboard.press("Escape");
  await page.evaluate(() => { Storage.prototype.setItem = window.normalWrite; });
  await page.clock.setFixedTime(new Date("2026-11-26T12:00:00Z"));
  await page.keyboard.press("e");
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("Is it far?"));
  assert.deepEqual(await page.locator(".posting-voice:visible").allTextContents(), ["EN", "LT"]);
  assert.match(await page.locator(".posting-line").first().getAttribute("aria-label"), /\(EN\).*Is it far/);
  assert.match(await page.locator(".posting-line").last().getAttribute("aria-label"), /\(LT\).*Ar toli/);
  await page.keyboard.press("Tab");
  assert.match(await page.locator(":focus").innerText(), /Ar toli/);
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").getAttribute("aria-label"), "Tavo kortelėse");
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Shift+Tab"); await page.keyboard.press("Shift+Tab");
  assert.equal(await page.locator(":focus").getAttribute("aria-label"), "Uždaryti");
  await page.keyboard.press("Enter");
  await until(() => document.activeElement?.matches(".hud .prompt"));
  // The keyboard gesture unlocked media. The controller owns the remaining board actions.
  await page.evaluate(() => window.__ew.radio.setOn(true));
  await until(() => window.__ew.radio.store.getState().playing);
  await press(2); // X from the reading mark
  await page.waitForSelector(".posting-paper[open]");
  assert.equal(clips.length, 0);
  assert.match(await page.locator("[data-phrase-save]").innerText(), /Tavo kortelėse/);
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("Is it far?"));
  await press(0); // A on English
  await until(() => window.__ew.voice() === "playing" && window.__ew.radio.store.getState().held);
  await press(13); // Down to Lithuanian
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("Ar toli?"));
  await press(0);
  await until(() => window.__ew.voice() === "playing");
  assert.deepEqual(clips, ["ph-dec9175eab.mp3", "ph-505d9cd991.mp3"]);
  await press(13);
  await until(() => document.activeElement?.hasAttribute("data-phrase-save"));
  await press(0); await press(0);
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).cards, storage), [earlier]);
  await press(13); // Close is also reachable by directional navigation.
  await until(() => document.activeElement?.hasAttribute("data-pad-back"));
  await press(1); // B returns to the town and releases only the posting's clip.
  await until(() => !document.querySelector(".posting-paper") && window.__ew.voice() === "idle" && window.__ew.radio.store.getState().playing);

  await press(2);
  await until(() => document.activeElement?.matches(".posting-line") && document.activeElement.textContent.includes("Is it far?"));
  await press(0);
  await until(() => window.__ew.voice() === "playing");
  await page.evaluate(() => window.__ew.game.startScenario("s72-cafe", true));
  await until(() => !document.querySelector(".posting-paper") && window.__ew.store.getState().conv.active);
  assert.equal(await page.evaluate(() => {
    const player = window.__ew.audio.clip?.el;
    return !!player && !player.paused && player.src.includes("ph-dec9175eab");
  }), false);
  console.log("Controller, replay, radio, reviewed card, conversation handoff passed (silent media fixtures).");
} finally {
  await browser.close();
}
