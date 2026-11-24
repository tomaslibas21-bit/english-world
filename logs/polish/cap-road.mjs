// Capture the desert road for review: town->desert transition strip, gate approach frames,
// per-step gate label positions (jitter), right/wrong moments, end card.
// env: URL, TOWN=mh|pc, OUT=<dir>, ONLY=phone|phone-664|land|computer, LAND=1 (only sideways),
// WAY=words|phrases (defaults to words), REAL=1 (real clock label log only)
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE
  || "../../../_h-tools/node_modules/playwright-core/index.mjs");
const base = process.env.URL;
const pc = process.env.TOWN === "pc";
const storage = process.env.WORLD_STORAGE || (pc ? "puerto-colibri" : "english-world");
const out = process.env.OUT; await mkdir(out, { recursive: true });
const REAL = !!process.env.REAL;
const way = process.env.WAY || "words";
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
const viewports = [["phone", 390, 844], ["phone-664", 390, 664], ["land", 844, 390], ["computer", 1280, 800]];
try {
  for (const [label, width, height] of viewports) {
    const only = process.env.ONLY || (process.env.LAND ? "land" : undefined);
    if (only && only !== label) continue;
    const phone = label !== "computer";
    const context = await browser.newContext({ viewport: { width, height },
      ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
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
      for (let i = 0; i < attempts; i++) { const value = await pred(); if (value) return value; await step(frames); }
      throw new Error(`${label}: ${desc}: ${JSON.stringify(await read())}`);
    };
    const snap = (name) => page.screenshot({ path: `${out}/${label}-${name}.png` });
    const transition = (index, phase) => `${out}/${label}-trans-${String(index).padStart(2, "0")}-${phase}.jpg`;
    const press = (target) => phone ? target.tap() : target.click();
    for (let i = 0; i < 400; i++) { await page.waitForTimeout(60); if (!REAL) await step(5); if (await page.evaluate(() => window.__ew?.store.getState().screen === "play")) break; }
    const helper = await page.evaluate(() => document.documentElement.lang);
    const ui = (lt, en) => helper === "en" ? en : lt;
    await page.evaluate(() => { window.__ew.audio.play = async () => true; });
    const parked = page.locator(".prompt").getByText(ui("Vairuoti", "Drive"), { exact: true });
    await waitFor(() => parked.isVisible(), "van drivable");
    await press(parked);
    await waitFor(() => page.evaluate(() => window.__ew.game.rides.phase === "on" && !!window.__ew.game.rides.riding), "boards");
    if (pc) { await page.evaluate(() => { const { game } = window.__ew; game.rides.resetPosition(game.rides.riding, { x: -1.65, z: 53, rot: 0 }); }); }
    await step(10);
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1)); else await page.keyboard.down("ArrowUp");
    const townFrames = [];
    let frame = 0, townSerial;
    const crest = await waitFor(async () => {
      const state = await read();
      const presented = state.presented;
      if (!REAL && presented?.scene === "town" && presented.serial !== townSerial && (frame % 4 === 0 || state.exitDistance >= 27)) {
        townSerial = presented.serial;
        townFrames.push(await page.screenshot({ type: "jpeg", quality: 80 }));
        if (townFrames.length > 10) townFrames.shift();
      }
      frame++;
      return state.phase === "briefing" || state.phase === "drive" ? state : undefined;
    }, "reaches the crest", 1600, 1);
    if (crest.phase === "briefing") {
      const choice = page.locator(`.word-gate-start [data-way="${way}"]`);
      await choice.waitFor();
      if (!REAL) await snap("chooser");
      await press(choice);
    }
    await waitFor(async () => (await read()).phase === "drive", "enters the selected mode", 300, 1);
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0)); else await page.keyboard.up("ArrowUp");
    await page.locator(".road-gate").nth(2).waitFor({ state: "attached" });
    const selectLane = (correct) => page.evaluate((right) => {
      const { road } = window.__ew;
      const lane = road.state().right;
      if (lane === undefined) throw new Error("No open gate to steer toward");
      road.steer(right ? lane : (lane + 1) % 3);
    }, correct);
    const track = await page.evaluate((real) => {
      const sample = () => {
        const { road, game } = window.__ew;
        const camera = game.modes.get("road").mode.run.view.camera;
        const state = road.state();
        const gates = [...document.querySelectorAll(".road-gate")].map((gate) => {
          const rect = gate.getBoundingClientRect(), style = getComputedStyle(gate);
          return { rect: [rect.left, rect.top, rect.width], transform: gate.style.transform,
            onScreen: style.visibility === "visible" && Number(style.opacity) > 0
              && rect.left >= 0 && rect.top >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight };
        });
        return { t: performance.now(), cam: camera.position.toArray(), fov: camera.fov, dist: state.gateDistance,
          position: state.roadPosition, secondsToGate: state.gateDistance / state.speed,
          allVisible: gates.length === 3 && gates.every(({ onScreen }) => onScreen),
          gates: gates.map(({ rect, transform }) => [...rect, transform]) };
      };
      window.__capRoadSample = sample;
      if (!real) return [];
      return new Promise((resolve) => {
        const rows = [], end = performance.now() + 3000;
        const capture = () => {
          rows.push(sample());
          if (performance.now() < end) requestAnimationFrame(capture);
          else resolve(rows);
        };
        requestAnimationFrame(capture);
      });
    }, REAL);
    if (!REAL) {
      assert.ok(townFrames.length > 1, `${label}: captures the town approach`);
      for (const [index, buffer] of townFrames.entries()) await writeFile(transition(index, "town"), buffer);
      let approachFrames = 0;
      for (let frame = 0; frame < 180; frame++) {
        const state = await read();
        if (state.totalGates > 0) break;
        const row = await page.evaluate(() => window.__capRoadSample());
        track.push(row);
        if (frame < 30 && frame % 2 === 0) {
          await page.screenshot({ path: transition(townFrames.length + frame / 2, "drive"), type: "jpeg", quality: 80 });
        }
        if (approachFrames < 6 && frame % 2 === 0 && row.allVisible && row.secondsToGate <= 2.2) {
          await snap(`gates-${approachFrames++}`);
          if (approachFrames === 1 && way === "phrases" && width === 390 && row.secondsToGate >= 1.5) {
            const phrase = pc ? "El padre miró el tiempo que quedaba." : "The sun went down as we landed.";
            const options = [phrase, ...state.gates.filter((text) => text !== phrase)].slice(0, 3);
            await page.evaluate((choices) => window.__ew.road.previewOptions(choices), options);
            await page.waitForFunction((first) => document.querySelector(".road-gate")?.getAttribute("aria-label") === first,
              phrase, { polling: 25 });
            await snap("review-phrase");
            await page.evaluate(() => window.__ew.road.previewOptions());
          }
        }
        if (frame === 0) await selectLane(true);
        await step(1);
      }
      assert.ok(track.at(-1).position > track[0].position, `${label}: the road advances after the crest`);
      assert.ok(track.some(({ allVisible, secondsToGate }) => allVisible && secondsToGate >= 1.5 && secondsToGate <= 2.2),
        `${label}: all three labels are visible with time to steer`);
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
    await page.locator('.road-overlay .kit-feedback[data-feedback="right"]').first().waitFor();
    for (let i = 0; i < 4; i++) { await snap(`right-${i}`); await step(2); }
    await waitFor(async () => (await read()).gates?.length === 3, "next gates", 300, 2);
    await selectLane(false);
    const wrong = await waitFor(async () => { const state = await read(); return state.totalGates === 2 && state; }, "wrong gate", 300, 1);
    assert.equal(wrong.rightGates, 1, `${label}: misses the second gate`);
    await page.locator('.road-overlay .kit-feedback[data-feedback="retry"]').first().waitFor();
    for (let i = 0; i < 4; i++) { await snap(`wrong-${i}`); await step(2); }
    if (way === "phrases") {
      await waitFor(async () => (await read()).karaoke?.visible, "shows the correction", 60, 1);
      await page.locator(':is(.road-karaoke-panel, .road-karaoke) .kit-feedback[data-feedback="retry"]:visible').waitFor();
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
    assert.equal(await end.locator(".mode-score-actions button:visible").count(), 2, `${label}: both end-card actions are visible`);
    for (let i = 0; i < 3; i++) { await step(6); await snap(`end-${i}`); }
    report[label].errors = errors;
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/report${REAL ? "-real" : ""}.json`, JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report));
}
