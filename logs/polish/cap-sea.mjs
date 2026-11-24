// Capture one learner layer from its Vite server. SIZE selects one viewport, otherwise capture all four.
// env: URL, OUT, TOWN=mh|pc, WORLD_LEARNER=en|lt, WORLD_STORAGE, WORLD_PLAYWRIGHT_MODULE, WORLD_BROWSER_CHANNEL,
// SIZE=390x844|390x664|844x390|1280x800, EVERY=steps between strip frames (default 4 = 200 ms).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE
  || "../../../_h-tools/node_modules/playwright-core/index.mjs");
const { URL: base, OUT: out, SIZE: selectedSize } = process.env;
const pc = process.env.TOWN === "pc";
const storage = process.env.WORLD_STORAGE || (pc ? "puerto-colibri" : "english-world");
const sizes = ["390x844", "390x664", "844x390", "1280x800"];
const every = Number(process.env.EVERY || 4);
assert.ok(base && out, "Set URL and OUT for the sea capture");
assert.ok(!selectedSize || sizes.includes(selectedSize), `Unsupported SIZE: ${selectedSize}`);
assert.ok(Number.isInteger(every) && every > 0, "EVERY must be a positive frame count");
await mkdir(`${out}/strip`, { recursive: true });

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
function progress(phone) {
  return {
    version: 1,
    profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
      look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
    settings: { v: 6, play: "town", quality: phone ? "low" : "high", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
    sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished },
    phrases: {}, seenIntro: {}, started: 1,
    place: { zone: "town", ...(pc ? { x: 42, z: -73.8 } : { x: -10, z: -69.5 }), rot: Math.PI },
    coach: { done: true, run: true, view: true },
  };
}

function installClock([key, save]) {
  localStorage.setItem(key, save);
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (count) => { for (let i = 0; i < count; i++) { now += 50; for (const fn of frames.splice(0)) fn(now); } };
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

function readBoards(boards) {
  const header = document.querySelector(".sea-overlay header").getBoundingClientRect();
  const controls = [...document.querySelectorAll(".sea-mode .joy, .sea-overlay .road-controls")]
    .map((node) => node.getBoundingClientRect());
  const inside = (box) => box.width > 0 && box.height > 0 && box.left >= 0 && box.right <= innerWidth
    && box.top >= header.bottom && box.bottom <= innerHeight;
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const boxes = boards.map((board) => board.getBoundingClientRect());
  return boards.map((board, lane) => {
    const box = boxes[lane];
    const lines = [...board.querySelectorAll(":scope > span")];
    const style = getComputedStyle(board);
    return {
      text: lines.map((line) => line.textContent).join(" "),
      label: board.getAttribute("aria-label"),
      visible: !board.disabled && style.visibility === "visible" && Number(style.opacity) >= 0.99
        && inside(box) && lines.every((line) => inside(line.getBoundingClientRect()))
        && controls.every((control) => !overlaps(box, control))
        && (lane === 0 || box.left >= boxes[lane - 1].right),
    };
  });
}

async function capture(browser, size) {
  const [width, height] = size.split("x").map(Number);
  const phone = size !== "1280x800";
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "no-preference",
    ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
  try {
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(installClock, [`${storage}-progress-v1`, JSON.stringify(progress(phone))]);
    await page.goto(base, { waitUntil: "domcontentloaded" });

    const read = () => page.evaluate(() => window.__ew?.sea?.());
    const step = (count = 1) => page.evaluate((n) => window.__step(n), count);
    const waitFor = async (predicate, description, attempts = 200, frames = 1) => {
      let state;
      for (let frame = 0; frame < attempts; frame++) {
        state = await read();
        if (await predicate(state, frame)) return state;
        await step(frames);
      }
      assert.fail(`${description}; phase=${state?.phase}, scene=${state?.presented?.scene}, errors=${JSON.stringify(errors)}`);
    };
    const jpeg = { type: "jpeg", quality: 80 };
    const shot = (name) => page.screenshot({ ...jpeg, path: `${out}/${size}-${name}.jpg` });
    const strip = (name) => page.screenshot({ ...jpeg, path: `${out}/strip/${size}-${name}.jpg` });
    const press = (button) => button[phone ? "tap" : "click"]({ timeout: 5000 });
    const inPlay = () => page.evaluate(() => window.__ew?.store.getState().screen === "play");
    for (let i = 0; i < 500 && !(await inPlay()); i++) { await page.waitForTimeout(40); await step(5); }
    assert.ok(await inPlay(), "the beach loads");
    await page.evaluate(() => {
      window.__ew.coach?.finish?.();
      window.__ew.store.getState().setHud({ panel: null });
      window.__ew.audio.play = async () => true;
    });
    await page.keyboard.down("ArrowUp");
    await waitFor(() => page.evaluate(() => {
      const { game, store } = window.__ew;
      return game.swimming && store.getState().hud.prompt?.kind === "boat";
    }), "swims to a boat", 200, 5);
    await page.keyboard.up("ArrowUp");
    await page.keyboard.press("e");
    const boarded = await waitFor((state) => state.town?.phase === "on", "boards the boat", 200, 5);
    await page.waitForFunction(() => window.__ew?.sea?.().ready, undefined, { polling: 50, timeout: 15000 });
    assert.equal(await page.evaluate(([x, z]) => window.__ew.seaPlaceBoat(x, z), [boarded.town.x, boarded.edge + 40]), true);

    await step(4);
    await page.keyboard.down("ArrowUp");
    const approach = [];
    const briefing = await waitFor(async (state, frame) => {
      if (state.phase === "briefing") return true;
      if (state.presented?.scene === "town" && frame % every === 0) {
        approach.push(await page.screenshot(jpeg));
        if (approach.length > 10) approach.shift();
      }
      return false;
    }, "the boat crosses into the sea briefing", 600);
    await page.keyboard.up("ArrowUp");
    assert.ok(approach.length && briefing.presented.scene === "sea", "captures the town-to-sea handoff");
    for (const [i, buffer] of approach.entries()) {
      await writeFile(`${out}/strip/${size}-out-00-town-${i}.jpg`, buffer);
    }
    const words = page.locator('.sea-overlay [data-way="words"]');
    await words.waitFor({ timeout: 5000 });
    await strip("out-01-briefing");
    await press(words);
    const start = await waitFor((state) => state.phase === "drive", "Words starts the crossing");
    assert.equal(start.way, "words");

    const title = page.locator(".sea-crossing-title");
    const opacity = () => title.evaluate((node) => Number(getComputedStyle(node).opacity));
    await title.waitFor({ state: "attached", timeout: 5000 });
    assert.equal(await opacity(), 0, "title starts transparent");
    const crossingAt = (age) => waitFor((state) => state.crossingAge >= age - 1e-8, `crossing reaches ${age}s`, 40);

    const departure = await crossingAt(0.2);
    const rising = await opacity();
    assert.ok(departure.z < start.z && rising > 0 && rising < 0.95, "boat departs while the title fades in");
    await shot("01-departure");
    const crest = await crossingAt(0.65);
    const peak = await opacity();
    assert.ok(crest.crestCameraLift > 0 && peak >= 0.95, "camera lifts at the title peak");
    await shot("02-title-peak");
    await crossingAt(1.05);
    const fading = await opacity();
    assert.ok(fading > 0 && fading < peak, "title fades before the prompt");
    await shot("03-title-fade");
    await crossingAt(1.25);
    await title.waitFor({ state: "detached", timeout: 5000 });
    await page.locator(".sea-overlay .road-cue").waitFor({ timeout: 5000 });
    await strip("out-02-prompt");

    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    const boards = page.locator(".sea-overlay button.road-gate");
    let labels;
    const decision = await waitFor(async (state) => {
      if (state.gateDistance > 32) return false;
      assert.ok(state.totalGates === 0 && state.gateDistance >= 19,
        `three complete choices must fit before steering; last sample ${JSON.stringify(labels)}`);
      labels = await boards.evaluateAll(readBoards);
      return labels.length === 3 && labels.every(({ text, label, visible }, lane) =>
        visible && text === label && text === state.gates[lane]);
    }, "all three choices fit on screen before steering");
    await shot("04-choices");
    await press(boards.nth(decision.right));
    await waitFor((state) => state.rightGates === 1, "sails through the selected gate");

    await press(page.locator(".sea-overlay .road-dash button").first());
    await waitFor((state) => state.phase === "turn", "starts the turn toward shore", 20);
    await waitFor(async (state, frame) => {
      if (state.phase === "result") return true;
      if (frame % every === 0) await strip(`back-00-turn-${String(frame).padStart(2, "0")}`);
      return false;
    }, "reaches the score card after turning", 60);
    await strip("back-01-result");
    await press(page.locator(".sea-overlay .mode-score-actions button.soft"));
    const seam = await waitFor(async (state, frame) => {
      if (state.returnAge >= 1.2 - 1e-8) return true;
      if (state.returnAge > 0 && frame % every === 0) await strip(`back-02-return-${String(frame).padStart(2, "0")}`);
      return false;
    }, "presents the sea side of the return seam", 40);
    assert.equal(seam.presented.scene, "sea");
    await strip("back-03-last-sea");
    const town = await waitFor((state) => state.phase === "town" && state.presented?.scene === "town", "returns to the bay", 20);
    assert.equal(town.presented.serial, seam.presented.serial + 1, "town follows the last sea presentation");
    assert.ok(town.town?.id === boarded.town.id && town.town.phase === "on"
      && town.town.z >= town.edge, "returns inside the bay aboard the same boat");
    await strip("back-04-first-town");
    await step(12);
    await shot("05-shore");
    assert.deepEqual(errors, [], "no page errors during the crossing");
    console.log(JSON.stringify({ size, learner: process.env.WORLD_LEARNER || (pc ? "en" : "lt"), rising, peak, fading,
      cameraLift: crest.crestCameraLift, choices: labels.map(({ text }) => text), gateDistance: decision.gateDistance,
      returnAge: seam.returnAge, boat: town.town.id }));
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({ channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
try {
  const failures = [];
  for (const size of selectedSize ? [selectedSize] : sizes) {
    try { await capture(browser, size); }
    catch (error) { failures.push(new Error(`${size}: ${error.message}`, { cause: error })); }
  }
  if (failures.length === 1) throw failures[0];
  if (failures.length) throw new AggregateError(failures, "Sea capture failed");
} finally {
  await browser.close();
}
