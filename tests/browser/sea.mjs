// Use the Vite dev server for the sea debug hooks. SEA_SIZE sets the viewport and SEA_SHOTS saves the handoff and gates.
// Run with VITE_EDITION=es and WORLD_STORAGE=puerto-colibri. Repeat with VITE_LEARNER=lt.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.SEA_SHOTS || process.env.WORLD_SHOTS;
const size = process.env.SEA_SIZE || "1280x800";
assert.ok(["1280x800", "390x844", "390x664"].includes(size), `Unsupported SEA_SIZE: ${size}`);
const [width, height] = size.split("x").map(Number);
const phone = width === 390;
if (shots) await mkdir(shots, { recursive: true });

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished },
  phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: 42, z: -73.8, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};

function installClock([key, save]) {
  if (!localStorage.getItem(key)) localStorage.setItem(key, save);
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (count) => {
    for (let i = 0; i < count; i++) {
      now += 50;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

try {
  const context = await browser.newContext({
    viewport: { width, height },
    ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
  });
  const page = await context.newPage();
  const errors = [], seaRequests = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (/\/src\/(?:game\/sea\/(?!entry\.ts$)|ui\/Sea\.tsx$)/.test(path)) seaRequests.push(path);
  });
  await page.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "" }));
  await page.addInitScript(installClock, [`${storage}-progress-v1`, JSON.stringify(progress)]);
  await page.goto(base, { waitUntil: "domcontentloaded" });

  const read = () => page.evaluate(() => window.__ew?.sea?.());
  const step = (frames) => page.evaluate((n) => window.__step(n), frames);
  const waitFor = async (predicate, description, attempts = 160, frames = 5) => {
    for (let i = 0; i < attempts; i++) {
      await step(frames);
      if (await predicate()) return;
    }
    assert.fail(`${size}: ${description}: ${JSON.stringify(await read())} errors: ${JSON.stringify(errors)}`);
  };
  const shot = (name) => shots && page.screenshot({ path: `${shots}/${size}-sea-${name}.png` });
  const press = (element) => phone ? element.tap() : element.click();
  const loading = page.locator(".ew-loading, .road-loading, .sea-loading");
  const ready = () => page.waitForFunction(() => window.__ew?.sea?.().ready, undefined, { polling: 50 });
  const hasPlayScreen = () => page.evaluate(() => window.__ew?.store.getState().screen === "play");
  await waitFor(hasPlayScreen, "the beach loads", 500);
  const helper = await page.evaluate(() => document.documentElement.lang);
  assert.ok(["en", "lt"].includes(helper));
  const ui = (lt, en) => helper === "en" ? en : lt;
  await page.evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
  assert.equal((await read()).phase, "town");
  assert.deepEqual(seaRequests, [], "the mode chunk stays unloaded before boarding");
  await page.evaluate(() => {
    const { audio } = window.__ew;
    window.__seaAudio = [];
    audio.play = async (_voice, _speed, text) => { window.__seaAudio.push(text); return true; };
  });

  await page.keyboard.down("ArrowUp");
  await waitFor(() => page.evaluate(() => {
    const { game, store } = window.__ew;
    return game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "lancha-afloat-3";
  }), "swims from the shallows within reach of the green lancha");
  await page.keyboard.up("ArrowUp");
  await page.keyboard.press("e");
  await waitFor(async () => (await read()).town?.phase === "on", "boards with the interact key");
  const mooring = (await read()).town;
  assert.equal(mooring.id, "lancha-afloat-3");
  await ready();
  assert.ok(seaRequests.some((path) => path.endsWith("/mode.ts")), "the mode prefetches aboard");

  async function sailOut(screenshots = false) {
    const { edge, town: { x } } = await read();
    assert.equal(await page.evaluate(([x, z]) => window.__ew.seaPlaceBoat(x, z), [x, edge + 34]), true);
    await page.keyboard.down("ArrowUp");
    await waitFor(async () => {
      const state = await read();
      return state.phase === "town" && state.town.bowZ > edge && state.town.bowZ - edge < 0.81;
    }, "sails the last 30 m to the buoy line with the arrow key", 200, 1);
    const last = await read();
    if (screenshots) await shot("last-town");
    assert.equal(await loading.count(), 0);
    let first;
    for (let frame = 0; frame < 4; frame++) {
      await step(1);
      const state = await read();
      assert.equal(await loading.count(), 0);
      if (state.phase === "drive") { first = state; break; }
    }
    assert.ok(first, "the sea scene starts within a few frames of crossing");
    assert.ok(first.town.bowZ <= edge);
    assert.deepEqual(first.camera, first.town.camera, "the first sea camera inherits the town pose and FOV");
    assert.deepEqual(first.hull, first.town.hull, "the first sea frame keeps the hull in place");
    assert.ok(Math.abs(first.hull[2] - last.town.hull[2]) < 0.05 * 4 * 17, `hull moved ${first.hull[2] - last.town.hull[2]} m between the last town frame and the first sea frame`);
    assert.ok(Math.abs(first.camera.fov - last.town.camera.fov) < 1);
    assert.equal(first.elapsed, 0);
    assert.equal(await page.locator(".fade").evaluate((element) => Number(getComputedStyle(element).opacity)), 0);
    assert.ok(first.drawCalls <= 25, `first sea frame uses ${first.drawCalls} draw calls`);
    if (screenshots) await shot("first-sea");
    await page.keyboard.up("ArrowUp");
  }

  function assertBoatFrame(state, moment) {
    const f = state.hullFrame;
    assert.ok(f && Object.values(f).every(Number.isFinite) && f.x >= 0.2 && f.x <= 0.8, `${moment}: hull center is outside the middle 60%: ${JSON.stringify(f)}`);
    assert.ok(f.left >= 0 && f.right <= 1 && f.top >= 0 && f.bottom <= 1,
      `${moment}: hull is clipped: ${JSON.stringify(f)}`);
  }

  async function rearm() {
    await page.keyboard.down("ArrowUp");
    await waitFor(async () => (await read()).armed, "crossing 20 m back into town re-arms the sea entry");
    await page.keyboard.up("ArrowUp");
    await ready();
  }

  await sailOut(true);
  assert.equal(await page.getByRole("heading", { name: ui("Atvira jūra", "Open sea") }).count(), 1);
  assert.equal(await page.locator(".sea-overlay .road-gates").getAttribute("lang"), helper);
  const gates = page.locator(".sea-overlay button.road-gate");
  await page.evaluate(async () => { await document.fonts.ready; });
  const layoutChecks = [];
  await waitFor(async () => {
    const state = await read();
    if (!(state.gateDistance >= 19 && state.gateDistance <= 32)) return false;
    const rows = await gates.evaluateAll((boards, phone) => {
      const headerBottom = (document.querySelector(".sea-overlay header")?.getBoundingClientRect().bottom ?? 0);
      const stickTop = document.querySelector(".sea-mode .joy")?.getBoundingClientRect().top;
      return boards.map((board, i) => {
        const box = board.getBoundingClientRect(), font = parseFloat(getComputedStyle(board).fontSize);
        return {
          text: board.getAttribute("aria-label"), width: box.width, font, left: box.left, right: box.right,
          top: box.top, bottom: box.bottom, headerBottom, stickTop, viewportWidth: innerWidth,
          fullWords: [...board.children].map((line) => line.textContent).join(" ") === board.getAttribute("aria-label"),
          inside: box.left >= 0 && box.right <= innerWidth,
          belowHeader: box.top > headerBottom,
          aboveControls: stickTop === undefined || box.bottom < stickTop,
          separated: i === 0 || box.left >= boards[i - 1].getBoundingClientRect().right,
          readableWidth: box.width >= (phone ? 86 : 100),
          readableFont: font >= (phone ? 15 : 18),
        };
      });
    }, phone);
    layoutChecks.push({ distance: +state.gateDistance.toFixed(2), rows });
    return rows.length === 3 && rows.every((row) => row.fullWords && row.inside && row.belowHeader
      && row.aboveControls && row.separated && row.readableWidth && row.readableFont);
  }, "all three labels fit at a readable size", 125, 1).catch((error) => {
    throw new Error(`${error.message}
Gate layout at 19–32 m: ${JSON.stringify(layoutChecks)}`);
  });
  assert.ok((await read()).drawCalls <= 25);
  assert.equal(await page.locator(".sea-mode .drive-horn, .sea-mode .road-ghost").count(), 0);
  await shot("gates");
  await press(gates.nth((await read()).right));
  await waitFor(async () => (await read()).rightGates === 1, "taps and sails through the correct gate");

  const correct = await read();
  assert.equal(correct.streak, correct.rightGates);
  assert.ok(correct.boost > 0);
  assertBoatFrame(correct, "right gate");
  assert.equal(await page.getByText(ui("Teisingai!", "Right!"), { exact: true }).count(), 1);
  await shot("gate-right");

  await waitFor(async () => (await read()).gates?.length === 3, "the next gate appears");
  const clips = await page.evaluate(() => window.__seaAudio.length);
  const wrongLane = (await read()).right === 0 ? 2 : 0;
  await page.evaluate((lane) => window.__ew.seaSteer(lane), wrongLane);
  await waitFor(async () => (await read()).totalGates === correct.totalGates + 1, "sails through the wrong gate");
  const wrong = await read();
  assert.equal(wrong.lane, wrongLane);
  assert.equal(wrong.rightGates, correct.rightGates);
  assert.equal(wrong.streak, 0);
  assert.ok(wrong.wobble > 0);
  assertBoatFrame(wrong, "wrong gate");
  assert.ok(correct.drawCalls <= 25 && wrong.drawCalls <= 25, "both gate reactions stay within the draw-call budget");
  assert.equal(await page.getByText(ui("Ne visai. Teisingai:", "Not quite. It's:"), { exact: true }).count(), 1);
  assert.ok((await page.locator(".sea-overlay .road-feedback.wrong span[lang=es]").innerText()).length > 0);
  assert.equal(await page.evaluate(() => window.__seaAudio.length), clips + 1, "plays the missed clip again");
  await shot("gate-wrong");

  for (let n = wrong.totalGates; n < 7; n++) {
    await waitFor(async () => (await read()).gates?.length === 3, "the next listening gate appears");
    await page.evaluate(() => window.__ew.seaSteer(window.__ew.sea().right));
    await waitFor(async () => (await read()).totalGates === n + 1, "passes another listening gate");
  }
  await waitFor(async () => (await read()).gates?.length === 3 && await gates.count() === 3, "three Spanish gap options appear");
  assert.equal(await page.getByText(ui("Kurio žodžio trūksta?", "Which word is missing?"), { exact: true }).count(), 1);
  assert.match(await page.locator(".sea-overlay .road-gap").innerText(), /____/);
  assert.equal(await page.locator(".sea-overlay .road-gates").getAttribute("lang"), "es");

  await page.evaluate(() => window.__ew.seaTimer(119.8));
  const result = page.getByRole("dialog", { name: ui("Plaukimas baigtas", "Boat ride over") });
  const guide = result.getByRole("button", { name: ui("Nuvesk mane", "Take me there") });
  await waitFor(() => result.isVisible(), "shows the score at 120 seconds");
  const scored = await read();
  assert.equal(scored.elapsed, 120);
  assert.equal(scored.result.right, 6);
  assert.equal(scored.result.total, 7);
  assertBoatFrame(scored, "timed score card");
  assert.equal(scored.result.missed.length, 1);
  assert.equal(await guide.count(), 1);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem("english-world-sea-v1:puerto-colibri"))?.points), scored.result.points);
  await shot("result");

  await press(result.getByRole("button", { name: ui("Atgal į krantą", "Back to shore") }));
  await waitFor(async () => (await read()).phase === "town", "returns to the bay");
  let returned = await read();
  assert.equal(returned.town.id, mooring.id);
  assert.equal(returned.town.phase, "on");
  assert.ok(Math.abs(returned.town.x - scored.town.x) < 0.1);
  assert.ok(Math.abs(returned.town.z - (returned.edge + 14)) < 1.5);
  assert.ok(Math.cos(returned.town.heading) > 0.99 && returned.town.speed > 0);
  assert.equal(returned.armed, false);
  await step(16);
  await shot("town-return");

  await rearm();
  await sailOut();
  await page.keyboard.down("ArrowDown");
  await waitFor(async () => (await read()).phase === "turn", "holding down at slow speed starts to turn");
  assert.equal((await read()).totalGates, 0);
  await waitFor(async () => (await read()).phase === "town", "turns back without a score card");
  await page.keyboard.up("ArrowDown");
  assert.equal(await result.count(), 0);
  assert.equal((await read()).town.id, mooring.id);

  await step(18);
  await rearm();
  await sailOut();
  await page.evaluate(() => window.__ew.seaSteer(window.__ew.sea().right === 0 ? 2 : 0));
  await waitFor(async () => (await read()).totalGates === 1, "answers one gate before turning for shore");
  await page.keyboard.down("ArrowDown");
  await waitFor(async () => (await read()).phase === "turn", "turns toward shore after one answer");
  await step(12);
  const turning = await read();
  assert.equal(turning.phase, "turn");
  assertBoatFrame(turning, "return turn");
  await waitFor(() => result.isVisible(), "shows the score card after turning with one gate answered");
  await page.keyboard.up("ArrowDown");
  const turned = await read();
  assert.equal(turned.result.total, 1);
  assert.equal(turned.result.right, 0);
  assert.ok(Math.cos(turned.heading) > 0.99, "the boat faces shore behind the score card");
  assertBoatFrame(turned, "score card after turning");
  const destination = await result.locator("[data-sit]").getAttribute("data-sit");
  await press(guide);
  await waitFor(() => page.evaluate((sit) => {
    const { game, store } = window.__ew;
    const state = store.getState();
    return !state.hud.fade && !state.hud.modeScreen && !game.rides.riding
      && state.progress.objective === sit && !!game.autoTarget && game.autoPath?.length > 0;
  }, destination), "Nuvesk mane starts the guide on foot after the fade");
  const guided = await page.evaluate((id) => {
    const { game } = window.__ew;
    const { x, y, z } = game.player.root.position, boat = game.rides.find(id).m;
    return { x, y, z, swimming: game.swimming, boat: { x: boat.x, z: boat.z, heading: boat.heading } };
  }, mooring.id);
  assert.ok(!guided.swimming && guided.y >= -0.12 && guided.z > -72 && guided.z < -60
    && Math.abs(guided.x - mooring.x) <= 10, "the guide starts on the beach near the original boarding point");
  assert.ok(["x", "z", "heading"].every((k) => Math.abs(guided.boat[k] - mooring[k]) < 1e-6), `the boat is back at its mooring: ${JSON.stringify({ boat: guided.boat, mooring })}`);
  await shot("guide");

  const sand = await page.evaluate(() => {
    const { game } = window.__ew;
    game.setJoystick(0.1, 0);
    game.setJoystick(0, 0);
    game.placeOnFoot(64, -68, Math.PI);
    return game.rides.find("lancha-beached-3").home;
  });
  await waitFor(() => page.evaluate(() => {
    const { game, store } = window.__ew;
    return !game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "lancha-beached-3";
  }), "the beached lancha is within reach from dry sand");
  await page.keyboard.press("e");
  await waitFor(async () => (await read()).town?.phase === "launch", "sits aboard and starts pushing off", 30, 1);
  await step(15);
  const sliding = (await read()).town;
  assert.equal(sliding.phase, "launch");
  assert.ok(sliding.z < sand.z && sliding.heading < sand.rot, "the boat turns and slides stern-first off the sand");
  assert.equal(await page.evaluate(() => {
    const { game } = window.__ew;
    const boat = game.rides.riding;
    return boat.beach.circles.some((circle) => game.town.colliders.circles.includes(circle));
  }), false, "boarding removes the sand collider");
  await waitFor(async () => (await read()).town?.phase === "on", "floats and can be driven");
  assert.ok((await read()).town.z < sand.z - 6);
  await shot("push-off");
  await ready();
  await sailOut();
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitFor(hasPlayScreen, "reloads from open water", 500);
  await waitFor(async () => (await read()).town?.phase === "on", "restores the launched lancha inside the bay");
  returned = await read();
  assert.equal(returned.phase, "town");
  assert.equal(returned.town.id, "lancha-beached-3");
  assert.ok(returned.town.z > returned.edge + 10 && Math.cos(returned.town.heading) > 0.99);

  assert.deepEqual(errors, []);
  await context.close();
  console.log(`Sea passed at ${size}`);
} finally {
  await browser.close();
}
