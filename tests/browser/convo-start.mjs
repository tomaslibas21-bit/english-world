// Manual scene start and live speech recognition in both game modes and both editions.
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en node tests/browser/convo-start.mjs
import assert from "node:assert/strict";
import { installSpeechRecognition } from "./speech-recognition.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8176";
const storage = process.env.WORLD_STORAGE || "english-world";
const learner = process.env.WORLD_LEARNER || (storage === "puerto-colibri" ? "en" : "lt");
const profile = { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } };
const sizes = [
  { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { viewport: { width: 1280, height: 800 } },
];
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});

try {
  for (const play of ["town", "light"]) for (const options of sizes) {
    const phone = !!options.hasTouch, label = `${play} ${options.viewport.width}×${options.viewport.height}`;
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const progress = {
      version: 1, profile, settings: { v: 6, play, quality: "low", scenes: play === "light", volume: 0, sounds: 0 },
      sits: {}, phrases: {}, seenIntro: {}, started: 1, coach: { done: true, run: true, view: true },
      place: { zone: "airport", x: -14, z: -1, rot: Math.PI },
    };
    await page.addInitScript(installSpeechRecognition);
    await page.addInitScript(([key, value]) => {
      sessionStorage.setItem("ew-play-now", "1");
      localStorage.setItem(key, value);
      window.__frames = 0;
      function frame() { window.__frames++; requestAnimationFrame(frame); }
      requestAnimationFrame(frame);
      // Exercise the game's voice path without relying on protected recordings or OS voices.
      window.__npcAudio = [];
      let end;
      speechSynthesis.speak = (line) => {
        window.__npcAudio.push(line.text);
        end = setTimeout(() => line.onend?.(), 150);
      };
      speechSynthesis.cancel = () => clearTimeout(end);
    }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await context.route(/\/audio[^/]*\/manifest\.json(?:\?|$)/, (route) => route.fulfill({ json: {} }));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__ew?.store.getState().screen === "play", null, { timeout: 240000 });
    const situations = await page.evaluate(() => {
      const { game, store, coach } = window.__ew;
      coach?.finish?.();
      store.getState().setHud({ panel: null });
      const list = game.orderedSituations();
      return {
        withIntro: (list.find((s) => s.intro && s.id.endsWith("-cafe")) ?? list.find((s) => s.intro))?.id,
        withoutIntro: list.find((s) => !s.intro?.trim())?.id,
        light: game.light === true,
      };
    });
    assert.equal(situations.light, play === "light");
    assert(situations.withIntro);
    const start = page.locator(".scene-intro button.btn");
    const state = () => page.evaluate(() => {
      const { game, store } = window.__ew, conv = store.getState().conv;
      return {
        open: conv.introOpen, phase: conv.phase, run: conv.run, transcript: conv.transcript,
        audio: window.__npcAudio.length, frames: window.__frames, townTime: game.t,
      };
    });
    const open = async (id) => {
      await page.evaluate((id) => window.__ew.game.startScenario(id), id);
      await start.waitFor({ state: "visible", timeout: 30000 });
    };
    const waitForFirstLine = async (audio) => {
      await page.waitForFunction((count) => {
        const c = window.__ew.store.getState().conv;
        return !c.introOpen && c.transcript.some((line) => line.who === "npc") && window.__npcAudio.length > count;
      }, audio);
    };

    for (const fallback of [false, true]) {
      const id = fallback ? situations.withoutIntro ?? situations.withIntro : situations.withIntro;
      const simulated = fallback && !situations.withoutIntro;
      await open(id);
      const intro = page.locator(".scene-intro");
      assert.equal(await start.innerText(), learner === "lt" ? "Pradėti" : "Start");
      const bounds = await start.boundingBox();
      assert(bounds && bounds.x >= 0 && bounds.y >= 0 &&
        bounds.x + bounds.width <= options.viewport.width && bounds.y + bounds.height <= options.viewport.height);
      if (fallback) {
        const { title, goal } = await page.evaluate(() => {
          const { title, goal } = window.__ew.game.activeSession.sit;
          return { title, goal };
        });
        assert((await intro.locator(".scene-intro-head b").innerText()).includes(title.lt || title.en));
        if (goal) assert((await intro.locator("p").allInnerTexts()).some((line) => line.length > 0));
      }
      const before = await state();
      await page.waitForTimeout(10_000);
      const after = await state();
      assert(after.frames > before.frames + 10, `${label}: animation frames ran during the wait`);
      if (play === "town") assert(after.townTime > before.townTime + 0.5, `${label}: the town kept stepping`);
      assert.deepEqual(after.transcript, []);
      assert.equal(after.audio, before.audio);
      assert.equal(after.phase, before.phase);
      assert.equal(after.run, before.run);
      assert(after.open && await start.isVisible(), `${label}: the scene still waits after ten seconds`);
      assert(await start.evaluate((button) => button === document.activeElement), `${label}: Start has focus`);
      if (phone) await start.tap();
      else if (fallback) await page.keyboard.press("Enter");
      else await start.click();
      await waitForFirstLine(after.audio);
      console.log(`ok ${label}: ${fallback ? "scene without intro text" : "authored scene"} waits for Start`);

      if (!fallback) {
        await page.waitForFunction(() => window.__ew.store.getState().conv.phase === "you" && window.__listening());
        const initial = await page.evaluate(() => ({ mic: window.__listening(), frames: window.__frames, t: window.__ew.game.t }));
        await page.waitForTimeout(3100);
        const current = await page.evaluate(() => ({
          mic: window.__listening(), status: window.__ew.store.getState().conv.mic.status,
          frames: window.__frames, t: window.__ew.game.t, events: window.__speechEvents,
        }));
        assert(current.frames > initial.frames + 10);
        if (play === "town") assert(current.t > initial.t);
        assert.equal(current.mic, initial.mic);
        assert.equal(current.status, "listening");
        assert(!current.events.some((event) => event.event === "abort" || event.event === "stop"));
        const said = await page.evaluate((es) => {
          const engine = window.__ew.game.activeSession.conv;
          const candidates = es ? ["Un latte, por favor", "Bien, gracias"] : ["A latte, please", "Good, thanks"];
          const expected = engine.expectedIntents();
          const answer = candidates.find((text) => ["complete", "open"].includes(engine.nlu.probe(text, expected)));
          return !!answer && window.__speak(answer);
        }, storage === "puerto-colibri");
        assert(said, `${label}: the recogniser receives a valid spoken answer`);
        await page.waitForFunction(() => window.__ew.store.getState().conv.transcript.some((line) => line.who === "you" && line.via === "voice" && line.understood));
        const events = await page.evaluate(() => window.__speechEvents);
        assert(["interim", "final", "end"].every((name) => events.some((e) => e.id === initial.mic && e.event === name)));
        assert(!events.some((e) => e.id === initial.mic && ["abort", "stop"].includes(e.event)), "native onend is never followed by abort");
        console.log(`ok ${label}: mic stays open during frames and takes a spoken answer`);
      }
      await page.evaluate(({ removeIntro, restoreIntro }) => {
        const { game } = window.__ew;
        const sit = game.activeSession.sit;
        // The current catalogs have intros everywhere. Exercise the fallback on the next opening.
        if (removeIntro) {
          window.__restoreIntro = sit.intro;
          delete sit.intro;
        } else if (restoreIntro) sit.intro = window.__restoreIntro;
        game.closeConversation();
      }, { removeIntro: !fallback && !situations.withoutIntro, restoreIntro: simulated });
      await start.waitFor({ state: "detached" });
    }
    await open(situations.withIntro);
    const before = await state();
    if (phone) await page.locator(".scene-intro .close-x").tap();
    else await page.keyboard.press("Space");
    await waitForFirstLine(before.audio);
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally {
  await browser.close();
}
