// Capture the desert road for review: town->desert transition strip, gate approach frames,
// per-step gate label positions (jitter), right/wrong moments, end card.
// Run against each learner's Vite dev server with URL, TOWN=mh|pc, and OUT=<dir>.
// ONLY=phone|phone-664|land|computer, LAND=1 (only sideways), WAY=words|phrases (PC captures both by default),
// REAL=1 (real clock label log only), WORLD_PLAYWRIGHT_MODULE=<path>.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { sampleBoardRegistration } from "../../tests/browser/board-registration.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE
  || "../../../_h-tools/node_modules/playwright-core/index.mjs");
const base = process.env.URL;
const pc = process.env.TOWN === "pc";
const storage = process.env.WORLD_STORAGE || (pc ? "puerto-colibri" : "english-world");
const out = process.env.OUT; await mkdir(out, { recursive: true });
const REAL = !!process.env.REAL;
const ways = process.env.WAY ? [process.env.WAY] : pc && !REAL ? ["words", "phrases"] : ["words"];
const only = process.env.ONLY || (process.env.LAND ? "land" : undefined);
const viewports = [["phone", 390, 844], ["phone-664", 390, 664], ["land", 844, 390], ["computer", 1280, 800]];
const reviewPhrases = ["The sun went down as we landed.", "El padre miró el tiempo que quedaba."];
const van = { x: pc ? -88 : -40, z: -11.8 };
const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = (quality) => ({
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality, scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished }, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: van.x, z: van.z - 1.85, rot: 0 },
  coach: { done: true, run: true, view: true },
});
function installClock() {
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
const browser = await chromium.launch({ channel: "chromium", headless: true, args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const report = {};
try {
  const captures = viewports.filter(([size]) => !only || only === size)
    .flatMap((viewport) => ways.map((way) => [...viewport, way]));
  for (const [size, width, height, way] of captures) {
    const label = way === "phrases" ? `${size}-phrases` : size;
    const phone = size !== "computer";
    const viewport = { width, height };
    const context = await browser.newContext(phone ? { viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/\.mp3(?:\?|$)/, (r) => r.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [`${storage}-progress-v1`, JSON.stringify(progress(phone ? "low" : "high"))]);
    if (!REAL) await page.addInitScript(installClock); else await page.addInitScript(() => sessionStorage.setItem("ew-play-now", "1"));
    await page.goto(base, { waitUntil: "domcontentloaded" });
    const read = () => page.evaluate(() => window.__ew?.road.state());
    const step = (n) => REAL ? page.waitForTimeout(n * 50) : page.evaluate((k) => window.__step(k), n);
    const waitFor = async (pred, desc, attempts = 300, frames = 5) => {
      for (let i = 0; i < attempts; i++) {
        const value = await pred();
        if (value) return value;
        await step(frames);
      }
      throw new Error(`${label}: ${desc}: ${JSON.stringify(await read())}`);
    };
    const snap = (name) => page.screenshot({ path: `${out}/${label}-${name}.png` });
    const press = (button) => phone ? button.tap() : button.click();
    const transition = (i, phase) => `${out}/${label}-trans-${String(i).padStart(2, "0")}-${phase}.jpg`;
    for (let i = 0; i < 400; i++) { await page.waitForTimeout(60); if (!REAL) await step(5); if (await page.evaluate(() => window.__ew?.store.getState().screen === "play")) break; }
    const helper = await page.evaluate(() => document.documentElement.lang);
    if (process.env.WORLD_LEARNER) assert.equal(helper, process.env.WORLD_LEARNER);
    const ui = (lt, en) => helper === "en" ? en : lt;
    await page.evaluate(() => { window.__ew.audio.play = async () => true; });
    const parked = page.locator(".prompt").getByText(ui("Vairuoti", "Drive"), { exact: true });
    await waitFor(() => parked.isVisible(), "van drivable");
    await press(parked);
    await waitFor(() => page.evaluate(() => window.__ew.game.rides.phase === "on" && !!window.__ew.game.rides.riding), "boards");
    if (pc) { await page.evaluate(() => { const { game } = window.__ew; game.rides.resetPosition(game.rides.riding, { x: -1.65, z: 53, rot: 0 }); }); }
    await step(24);
    if (pc) await waitFor(async () => (await read())?.ready, "road ready", 200, 1);
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1)); else await page.keyboard.down("ArrowUp");
    const townFrames = [];
    let townSerial;
    const crest = await waitFor(async () => {
      const state = await read();
      if (!REAL && state.phase === "town" && state.presented?.scene === "town"
        && state.presented.serial !== townSerial && state.exitDistance >= 20) {
        townSerial = state.presented.serial;
        townFrames.push({ distance: state.exitDistance, image: await page.screenshot({ type: "jpeg", quality: 80 }) });
        if (townFrames.length > 10) townFrames.shift();
      }
      return (state.phase === "briefing" || state.phase === "drive") && state;
    }, "reaches the crest", 1600, 1);
    if (crest.phase === "briefing") {
      const choice = page.locator(`.word-gate-start [data-way="${way}"]`);
      await choice.waitFor();
      if (!REAL) await snap("chooser");
      await press(choice);
    }
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0)); else await page.keyboard.up("ArrowUp");
    const boards = page.locator(".road-gate");
    await waitFor(async () => (await read()).phase === "drive" && await boards.count() === 3, "gates appear", 300, 1);
    const steer = (correct) => page.evaluate((right) => {
      const { road } = window.__ew;
      const lane = road.state().right;
      road.steer(right ? lane : (lane + 1) % 3);
    }, correct);
    const sample = await page.evaluateHandle(() => () => {
      const { road, game } = window.__ew;
      const state = road.state();
      const camera = game.modes.get("road").mode.run.view.camera;
      const hud = [...document.querySelectorAll(".road-header, .road-mode .joy, .road-mode .brake-btn, .road-mode .drive-horn, .road-controls")]
        .map((node) => node.getBoundingClientRect());
      const boards = [...document.querySelectorAll(".road-gate")].map((board) => {
        const r = board.getBoundingClientRect(), style = getComputedStyle(board);
        const lines = [...board.querySelectorAll(":scope > span")];
        const fits = lines.map((line) => line.textContent).join(" ") === board.getAttribute("aria-label")
          && lines.every((line) => {
            const range = document.createRange();
            range.selectNodeContents(line);
            const ink = range.getBoundingClientRect(), row = line.getBoundingClientRect();
            return ink.left >= r.left - 0.75 && ink.right <= r.right + 0.75
              && row.top >= r.top - 0.75 && row.bottom <= r.bottom + 0.75
              && hud.every((box) => row.bottom <= box.top || row.top >= box.bottom || ink.right <= box.left || ink.left >= box.right);
          });
        return { rect: [r.left, r.top, r.width, board.style.transform], lines: lines.length,
          visible: fits && style.visibility === "visible" && Number(style.opacity) > 0
            && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight };
      });
      return { t: performance.now(), cam: camera.position.toArray(), fov: camera.fov, dist: state.gateDistance,
        position: state.roadPosition, secondsToGate: state.gateDistance / state.speed,
        allVisible: boards.length === 3 && boards.every((board) => board.visible),
        gates: boards.map((board) => board.rect), lines: boards.map((board) => board.lines) };
    });
    let track = [];
    if (REAL) {
      track = await sample.evaluate((sample) => new Promise((resolve) => {
        const rows = [], end = performance.now() + 3000;
        const capture = () => {
          rows.push(sample());
          if (performance.now() < end) requestAnimationFrame(capture); else resolve(rows);
        };
        requestAnimationFrame(capture);
      }));
    } else {
      assert.ok(townFrames.at(-1)?.distance > townFrames[0]?.distance, `${label}: town moves up to the crest`);
      for (const [i, { image }] of townFrames.entries()) await writeFile(transition(i, "town"), image);
      let approachFrames = 0;
      for (let frame = 0; frame < 180 && (await read()).totalGates === 0; frame++) {
        const row = await sample.evaluate((sample) => sample());
        track.push(row);
        if (frame < 30 && frame % 2 === 0) {
          await page.screenshot({ path: transition(townFrames.length + frame / 2, "drive"), type: "jpeg", quality: 80 });
        }
        if (row.allVisible && row.secondsToGate <= 2.2 && approachFrames < 6) {
          const { samples } = await sampleBoardRegistration(page, "road");
          assert.equal(samples.length, 15, `${label}: three boards have registration probes`);
          assert.ok(samples.every(({ visible, measured, projected }) => visible
            && Math.hypot(measured[0] - projected[0], measured[1] - projected[1]) <= 0.5), `${label}: labels stay on the boards`);
          await snap(`gates-${approachFrames++}`);
          if (approachFrames === 1) {
            assert.ok(row.secondsToGate >= 1.5, `${label}: all three lanes are readable with time to steer`);
            if (way === "phrases" && width === 390) {
              const options = (await read()).gates;
              for (const [i, phrase] of reviewPhrases.entries()) {
                const choices = [phrase, ...options.filter((text) => text !== phrase)].slice(0, 3);
                await page.evaluate(async (choices) => {
                  await document.fonts.load("800 32px Nunito", choices.join(" "));
                  window.__ew.road.previewOptions(choices);
                }, choices);
                await page.waitForFunction((text) => document.querySelector(".road-gate")?.getAttribute("aria-label") === text,
                  phrase, { polling: 25 });
                const review = await sample.evaluate((sample) => sample());
                assert.ok(review.allVisible && review.lines[0] === 3, `${label}: three full lines fit for ${phrase}`);
                await snap(`review-phrase-${i + 1}`);
              }
              await page.evaluate(() => window.__ew.road.previewOptions());
            }
            await steer(true);
          }
        }
        await step(1);
      }
      assert.ok(track.at(-1)?.position > track[0]?.position, `${label}: road moves after the crest`);
      assert.ok(approachFrames > 0, `${label}: all three lane labels are visible`);
    }
    await writeFile(`${out}/${label}-label-track${REAL ? "-real" : ""}.json`, JSON.stringify(track));
    // jitter metric: second difference of label left/top per frame
    const sd = [];
    for (let i = 2; i < track.length; i++) for (let g = 0; g < 3; g++) {
      const a = track[i - 2].gates[g], b = track[i - 1].gates[g], c = track[i].gates[g];
      if (!a || !b || !c) continue;
      sd.push(Math.hypot(c[0] - 2 * b[0] + a[0], c[1] - 2 * b[1] + a[1]));
    }
    sd.sort((x, y) => x - y);
    report[label] = { frames: track.length, sd_median: sd[sd.length >> 1], sd_p90: sd[Math.floor(sd.length * 0.9)], sd_max: sd[sd.length - 1] };
    if (REAL) { await context.close(); continue; }
    assert.equal((await read()).rightGates, 1, `${label}: takes the first gate correctly`);
    const rightBadge = page.locator('.road-feedback [data-feedback="right"]');
    const missedBadge = page.locator('.road-overlay [data-feedback="retry"]:visible');
    const phraseLine = page.locator(".road-karaoke-line > span").first();
    await rightBadge.waitFor();
    if (way === "phrases") await phraseLine.waitFor();
    for (let i = 0; i < 4; i++) { await snap(`right-${i}`); await step(2); }
    await waitFor(async () => (await read()).gates?.length === 3, "next gates", 300, 2);
    await steer(false);
    const wrong = await waitFor(async () => {
      const state = await read();
      return state.totalGates === 2 && state;
    }, "wrong gate", 300, 1);
    assert.equal(wrong.rightGates, 1, `${label}: misses the second gate`);
    await missedBadge.waitFor();
    for (let i = 0; i < 4; i++) { await snap(`wrong-${i}`); await step(2); }
    if (way === "phrases") {
      await waitFor(async () => {
        assert.equal(await missedBadge.count(), 1, `${label}: miss badge stays visible into the correction`);
        return phraseLine.isVisible();
      }, "correction phrase appears", 40, 1);
      await snap("wrong-correction");
    }
    // drive on, answering right, until the end dialog
    const end = page.getByRole("dialog", { name: ui("Važiavimas baigtas", "Drive over") });
    let k = 0, mid = 0;
    while (!(await end.isVisible()) && k < 2500) {
      await page.evaluate(() => { const { road } = window.__ew; const s = road.state(); if (s.gates?.length === 3) road.steer(s.right); });
      await step(4); k++;
      if (k % 150 === 0 && mid < 4) await snap(`mid-${mid++}`);
    }
    assert.ok(await end.isVisible(), `${label}: reaches the end card`);
    assert.equal(await end.locator(".mode-score-actions button:visible").count(), 2, `${label}: both end actions are visible`);
    for (let i = 0; i < 3; i++) { await step(6); await snap(`end-${i}`); }
    report[label].errors = errors;
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/report${REAL ? "-real" : ""}.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report));
}
