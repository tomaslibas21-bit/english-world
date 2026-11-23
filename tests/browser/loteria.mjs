// Run against the Spanish Vite dev server. WORLD_LEARNER=lt selects the Lithuanian UI assertions.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8311";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const lt = process.env.WORLD_LEARNER === "lt";
const shots = process.env.SHOTS_DIR || process.env.WORLD_SHOTS || "/tmp";
const sizes = [
  [1280, 800],
  ...(process.env.WORLD_PHONE_HEIGHT ? [[390, Number(process.env.WORLD_PHONE_HEIGHT)]] : [[390, 844], [390, 664]]),
];
const sit = "x10-loteria";
const progress = {
  version: 1,
  profile: {
    name: "Ana", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d6f", bottom: "#264653" },
  },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 21.28, z: -24.38, rot: 2.41 },
  coach: { done: true, run: true, view: true },
};

function installControls([prefix, save]) {
  localStorage.setItem(`${prefix}-progress-v1`, save);
  localStorage.setItem(`${prefix}-variety`, "default");
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  speechSynthesis.speak = (utterance) => setTimeout(() => utterance.onend?.(), 0);

  let now = 1000;
  const frames = [];
  performance.now = () => now;
  requestAnimationFrame = (callback) => { frames.push(callback); return frames.length; };
  cancelAnimationFrame = () => {};
  window.__stepLoteria = (count) => {
    for (let i = 0; i < count; i++) {
      now += 50;
      for (const frame of frames.splice(0)) frame(now);
    }
  };
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
try {
  for (const [width, height] of sizes) {
    const phone = width === 390;
    const label = `${width}x${height}`;
    const dir = join(shots, label);
    await mkdir(dir, { recursive: true });
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone,
    });
    try {
      await context.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
      await context.addInitScript(installControls, [storage, JSON.stringify(progress)]);
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(base, { waitUntil: "domcontentloaded" });

      const step = (n = 1) => page.evaluate((count) => window.__stepLoteria(count), n);
      const state = () => page.evaluate(() => window.__ew?.loteria?.state());
      const wait = async (predicate, description, frames = 1, attempts = 700) => {
        for (let i = 0; i < attempts; i++) {
          if (await predicate()) return;
          await step(frames);
        }
        const chat = await page.evaluate(() => {
          const { game, store, audio } = window.__ew ?? {};
          const conv = store?.getState().conv;
          return conv && { active: conv.active, sit: conv.sitId, phase: conv.phase, step: conv.stepId,
            line: conv.lineKey, introOpen: conv.introOpen, nearest: game.nearest?.id, audio: audio?.getState() };
        });
        assert.fail(`${label}: ${description}: mode=${JSON.stringify(await state())} chat=${JSON.stringify(chat)}. ${errors.join(", ")}`);
      };
      const shot = (name) => page.screenshot({ path: join(dir, `loteria-${name}.png`) });
      const shown = (selector) => page.locator(selector).first().isVisible();
      const cell = (id) => page.locator(`.loteria-cell[data-card="${id}"]`);
      const press = (target) => phone ? target.tap() : target.click();
      const daylight = () => page.evaluate(() => {
        const { sky, sun, hemi, scene } = window.__ew.game;
        return {
          sky: ["top", "mid", "bottom"].map((name) => sky.material.uniforms?.[name]?.value.getHex()),
          sun: sun.intensity, hemi: hemi.intensity, fog: scene.fog?.color.getHex(),
        };
      });

      async function fits(score = false) {
        await step(2);
        const problems = await page.evaluate(({ score, width, height }) => {
          const errors = [];
          const rect = (selector) => document.querySelector(selector)?.getBoundingClientRect();
          const panel = rect(score ? ".mode-score-card" : ".loteria-board-panel");
          const scene = rect(score ? ".loteria-score-scene" : ".loteria-scene");
          const draw = rect(".loteria-draw");
          const exit = rect(".loteria-exit");
          const inside = (p, r) => r && p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
          const contained = (r) => r && r.width > 0 && r.height > 0 && r.top >= -1 && r.left >= -1 && r.right <= width + 1 && r.bottom <= height + 1;
          if (!contained(panel)) errors.push("panel outside viewport");
          if (document.documentElement.scrollWidth > width || document.documentElement.scrollHeight > height) errors.push("page overflow");
          if (score) {
            const el = document.querySelector(".mode-score-card");
            if (el.scrollHeight > el.clientHeight + 1) errors.push("score overflows");
          } else {
            if (!contained(draw)) errors.push("caller panel outside viewport");
            const board = rect(".loteria-board");
            const cells = [...document.querySelectorAll(".loteria-cell")];
            if (!contained(board) || cells.length !== 16) errors.push("tabla missing or outside viewport");
            for (const cell of cells) {
              const r = cell.getBoundingClientRect();
              const art = cell.querySelector(".loteria-art").getBoundingClientRect();
              if (!contained(r) || r.width < 40 || r.height < 36 || art.height < 12) errors.push(`clipped card ${cell.dataset.card}`);
              for (const label of cell.querySelectorAll(".loteria-tile strong, .loteria-tile small")) {
                const text = document.createRange();
                text.selectNodeContents(label);
                const bounds = text.getBoundingClientRect();
                if (bounds.left < r.left || bounds.right > r.right || bounds.top < r.top || bounds.bottom > r.bottom) {
                  errors.push(`clipped label ${cell.dataset.card}: ${label.textContent}`);
                }
              }
            }
          }
          const { game, loteria } = window.__ew;
          const project = (point) => {
            const { x, y } = point.clone().project(game.rig.cam);
            return { x: (x + 1) * width / 2, y: (1 - y) * height / 2 };
          };
          const [beto, tona] = loteria.state().heads;
          for (const head of [beto, tona]) {
            const p = project(head);
            if (!inside(p, scene) || [panel, draw, exit].some((r) => inside(p, r))) errors.push(`face covered at ${p.x}, ${p.y}`);
          }
          if (!score && width >= 1000) {
            const waist = project(beto.clone().setY(0.87));
            const hat = project(beto.clone().setY(1.88));
            const scale = (waist.y - hat.y) / scene.height;
            if (!inside(waist, scene) || inside(waist, panel) || scale < 0.26 || scale > 0.45) {
              errors.push(`caller framing: ${Math.round(scale * 100)}% of scene height`);
            }
          }
          return errors;
        }, { score, width, height });
        assert.deepEqual(problems, [], label);
      }

      await wait(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", 2);
      assert(await page.evaluate(() => window.__ew.loteria.stage(2, 6)), "stage a seeded game at the zócalo");
      const before = await daylight();
      const talk = async () => {
        await wait(() => page.evaluate(() => {
          const { game, store } = window.__ew;
          return game.nearest?.id === "tona" && store.getState().hud.prompt?.label.includes("Doña Toña");
        }), "Toña's talk prompt");
        if (phone) await press(page.locator(".act-btn"));
        else await page.keyboard.press("e");
        // The intro on each new visit uses a wall-clock timer. Close it through the UI
        // so polling with a stepped animation clock doesn't race the timer.
        const intro = page.locator(".scene-intro .btn");
        await wait(async () => await intro.isVisible() || await page.evaluate((sitId) => {
          const { conv } = window.__ew.store.getState();
          return conv.active && conv.sitId === sitId && !conv.introOpen;
        }, sit), "x10 scene intro");
        if (await intro.isVisible()) await press(intro);
      };
      const turn = (id) => wait(() => page.evaluate(([sitId, stepId]) => {
        const { conv } = window.__ew.store.getState();
        return conv.sitId === sitId && conv.hostId === "tona" && conv.phase === "you" && conv.stepId === stepId;
      }, [sit, id]), `chat turn ${id}`);
      const answer = async (text) => {
        if (!await shown(".typebox input")) await press(page.locator(".type-toggle"));
        await page.locator(".typebox input").fill(text);
        await page.locator(".typebox input").press("Enter");
      };

      await talk();
      await turn("play");
      await shot("chat");
      await answer("Sí, claro");
      await turn("know");
      await answer("No. ¿Me explica?");
      await turn("ask");
      await answer("¿Juega seguido?");
      await wait(() => shown(".loteria-cta"), "x10 end card offers lotería");
      assert.equal(await page.locator(".loteria-cta").innerText(), lt ? "Sužaisti loteriją" : "Play lotería");
      await press(page.locator(".loteria-cta"));
      await wait(async () => (await state())?.phase === "waiting", "first call");
      assert.notDeepEqual(await daylight(), before, "dusk takes effect");

      await wait(async () => {
        const s = await state();
        return s?.phase === "waiting" && s.calls.length === 3 && await shown('.loteria-cell[data-glow="true"]');
      }, "the first matching card glows");
      await fits();
      const calledName = page.locator(".loteria-caller[data-card-name] .il");
      assert(await calledName.evaluate((line) => parseFloat(getComputedStyle(line).fontSize)) >= 26);
      assert(await calledName.locator(".lt").first().isVisible());
      await shot("first-glow");
      let s = await state();
      assert.equal(await cell(s.current).getAttribute("data-glow"), "true");
      if (phone) await press(cell(s.current));
      else await page.keyboard.press("Space");
      assert.equal(await cell(s.current).getAttribute("aria-pressed"), "true");
      const beanRatio = await cell(s.current).evaluate((tile) =>
        tile.querySelector(".loteria-bean").offsetWidth / tile.clientWidth);
      assert(beanRatio >= 0.31 && beanRatio <= 0.38, "bean is about a third of the card");

      await wait(async () => (await state())?.calls.length === 15 && await shown('.loteria-current[data-face-down="true"]'), "listen-first cue");
      await fits();
      assert(await page.locator(".loteria-verse .il").evaluate((line) =>
        parseFloat(getComputedStyle(line).fontSize)) >= 17);
      await shot("listen-first");
      s = await state();
      assert.equal(s.current, "gorrito");
      await press(cell(s.current));
      await wait(async () => (await state())?.phase === "waiting" && !(await state()).faceDown, "the name finishes and the card turns over");

      for (let i = 0; i < 54; i++) {
        s = await state();
        for (const id of s.board.filter((id) => s.calls.includes(id))) {
          const mark = cell(id);
          if (await mark.getAttribute("aria-pressed") === "false") await press(mark);
        }
        if ((await state()).ready) break;
        await wait(async () => {
          const now = await state();
          return now?.phase === "waiting" && now.calls.length > s.calls.length;
        }, "next revealed call", 2);
      }

      assert((await state()).ready, "the shout button can claim a win");
      await fits();
      await shot("shout");
      if (phone) await press(page.locator(".loteria-shout"));
      else await page.keyboard.press("l");
      await wait(() => shown(".loteria-read-chip"), "Don Beto checks four cards", 2);
      assert.equal(await page.locator(".loteria-read-chip").count(), 4);
      await fits();
      await shot("reading");
      for (let left = 4; left > 0; left--) {
        const playable = page.locator(".loteria-read-chip:enabled");
        await wait(async () => await playable.count() === left, `${left} cards left to read`);
        await press(playable.first());
      }
      await wait(() => shown(".mode-score-card"), "score card", 2);
      assert.equal(await page.locator("#mode-score-title").innerText(), lt ? "Loterija baigta" : "Lotería's over");
      assert.equal(await page.locator(".mode-score-line").innerText(), lt ? "Laimėjai!" : "You won!");
      const scoreRows = page.locator(".mode-score-card dd");
      assert.equal((await scoreRows.nth(2).innerText()).trim(), "1", "covered a card before it turned over");
      await step(18);
      await fits(true);
      await shot("score");

      await press(page.getByRole("button", { name: lt ? "Dar kartą" : "Again", exact: true }));
      await wait(async () => (await state())?.kind === "esquinas", "Again starts four corners");
      assert.equal(await page.locator('.loteria-cell[data-corner="true"]').count(), 4);
      await wait(async () => (await state())?.phase === "waiting", "the new board starts without glow");
      assert.equal(await page.locator('.loteria-cell[data-glow="true"]').count(), 0);
      if (phone) await press(page.locator(".loteria-exit"));
      else await page.keyboard.press("Escape");
      await wait(async () => (await state()) === null, "return to the zócalo");
      assert.deepEqual(await daylight(), before);
      assert(await page.evaluate(() => window.__ew.game.player.root.visible), "learner is visible back in town");
      await talk();
      await turn("play");
      const greeting = await page.evaluate(() => {
        const { lineKey, transcript } = window.__ew.store.getState().conv;
        return [lineKey, transcript[0]?.sentence.en];
      });
      assert.deepEqual(greeting, ["again", "¡Ya volvió! ¿Otra tablita?"]);
      await answer("Sí, claro");
      await turn("know");
      await answer("Sí, ya sé");
      await turn("ask");
      await answer("¿Juega seguido?");
      await wait(() => shown(".loteria-cta"), "x10 end card offers another board");
      await press(page.locator(".loteria-cta"));
      await wait(async () => (await state())?.phase === "waiting", "returns to a playable round");
      assert.deepEqual(errors, []);
      console.log(`${label}: chat, line, score, four corners and replay passed.`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
