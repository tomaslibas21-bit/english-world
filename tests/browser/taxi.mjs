// A full taxi ride with the game clock stepped by hand. Steering uses the player's joystick input and the real
// car physics and route checks. Run against Puerto Colibrí on port 8311 (or set WORLD_TEST_URL).
// WORLD_VARIETY=neutral or spain selects that Spanish instead of the Mexican default.
// WORLD_SHOTS=<folder> writes the stand, cue, recovery, stop and score screenshots.
// WORLD_SIZES selects viewports, for example 390x664,844x390.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { tsImport } from "tsx/esm/api";
import { assertSavedSentence, cardsFor, checkManualSave, fixtureSentence } from "./fixtures/phrase-saves.mjs";

const { TAXI_ACCEPT, TAXI_LINES } = await tsImport("../../src/editions/es/content/taxi-lines.ts", import.meta.url);
const variety = process.env.WORLD_VARIETY || "default";
assert(["default", "neutral", "spain"].includes(variety), "unknown Spanish variety");
function lineText(key) {
  const row = TAXI_LINES[key][0];
  const source = variety === "spain" ? row.spain ?? row.neutral ?? row : variety === "neutral" ? row.neutral ?? row : row;
  return source.en.replace(/\s*\|\s*/g, " ").trim();
}

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8311";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS || "";
const sizes = process.env.WORLD_SIZES ? process.env.WORLD_SIZES.split(",").map((size) => size.split("x").map(Number))
  : [[1280, 800], ...(process.env.WORLD_PHONE_HEIGHT ? [[390, Number(process.env.WORLD_PHONE_HEIGHT)]] : [[390, 844], [390, 664], [844, 390]])];
if (shots) await mkdir(shots, { recursive: true });

const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 121, z: -2.4, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};

function installTestControls() {
  sessionStorage.setItem("ew-play-now", "1");
  let seed = 20261121;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (n, steer = false) => {
    for (let i = 0; i < n; i++) {
      if (steer) window.__taxiSteer();
      now += 50;
      for (const fn of frames.splice(0)) fn(now);
    }
  };

  class Recognition {
    start() {
      Recognition.live = this;
      this.started = false;
      setTimeout(() => {
        if (Recognition.live !== this) return;
        this.started = true;
        this.onstart?.();
      }, 5);
    }
    abort() { if (Recognition.live === this) Recognition.live = null; setTimeout(() => this.onend?.(), 0); }
    stop() { this.abort(); }
  }
  window.SpeechRecognition = Recognition;
  window.__listening = () => !!Recognition.live?.started;
  window.__speak = (text) => {
    const recognition = Recognition.live;
    if (!recognition?.onresult) return false;
    recognition.onspeechstart?.();
    recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
    recognition.onspeechend?.();
    return true;
  };
}

function installSteering({ wrong = false }) {
  const game = window.__ew.game, { car, route } = game.modes.get("taxi");
  const decisions = route.decisions;
  const routePoints = decisions.flatMap(({ at, via }) => [...(via ?? []), at]);
  const start = { x: car.m.x, z: car.m.z };
  const points = wrong
    ? [start, ...(decisions[0].via ?? []), decisions[0].at, { x: decisions[0].at.x, z: -40 }]
    : [start, ...routePoints];

  const delta = (a, b) => {
    const dx = b.x - a.x, dz = b.z - a.z, length = Math.hypot(dx, dz);
    return { x: dx / length, z: dz / length, length };
  };
  const along = (a, dir) => (car.m.x - a.x) * dir.x + (car.m.z - a.z) * dir.z;
  let segment = 0, coasting = false;
  window.__taxiSteer = () => {
    let a = points[segment], b = points[segment + 1], dir = delta(a, b);
    while (segment < points.length - 2) {
      const next = delta(b, points[segment + 2]);
      const corner = Math.hypot(car.m.x - b.x, car.m.z - b.z);
      if (along(a, dir) < dir.length - 0.6 && (corner > 5 || (corner > 1.8 && along(b, next) < 0.5))) break;
      segment++;
      a = points[segment]; b = points[segment + 1]; dir = delta(a, b);
    }
    if (segment === points.length - 2 && dir.length - along(a, dir) < 1.6) coasting = true;
    if (coasting) { game.setJoystick(0, 0); return; }
    let target = Math.max(0, along(a, dir)) + 4.3;
    for (let j = segment; j < points.length - 2 && target > dir.length; j++) {
      target -= dir.length;
      a = points[j + 1];
      dir = delta(a, points[j + 2]);
    }
    const yaw = Math.atan2(a.x + dir.x * target - car.m.x, a.z + dir.z * target - car.m.z);
    const error = Math.atan2(Math.sin(yaw - car.m.heading), Math.cos(yaw - car.m.heading));
    game.setJoystick(Math.min(1, Math.max(-1, -error * 1.5)), Math.abs(error) > 0.44 ? 0.65 : 1);
  };
}

function atTaxiStand(routeId) {
  const game = window.__ew.game, mode = game.modes.get("taxi");
  const stand = game.town.parkedCars.taxi;
  const spot = routeId ? mode.route?.start : mode.car.home;
  if (!spot) return false;
  const { m, mesh } = mode.car;
  const sameHeading = Math.cos(m.heading - spot.rot) > 0.999;
  return mesh === stand?.root && stand.instance?.parent === mesh && mesh.parent === game.rides.group
    && Math.hypot(m.x - spot.x, m.z - spot.z) < 0.01 && sameHeading
    && Math.hypot(mesh.position.x - spot.x, mesh.position.z - spot.z) < 0.01
    && (routeId ? game.rides.riding === mode.car && mode.route.id === routeId : !game.rides.riding);
}

function taxiStandView() {
  const game = window.__ew.game, camera = game.rig.cam, ray = game.raycaster;
  const taxi = game.modes.get("taxi").car.mesh.position.clone().setY(0.9);
  const point = taxi.clone().project(camera);
  const taxiInFrame = [point.x, point.y, point.z].every((coordinate) => Math.abs(coordinate) < 1);
  const canopy = game.town.group.getObjectByName("gas-canopy-assembly");
  const visibleRoof = canopy.children.filter((o) => !o.material.alphaHash || o.material.opacity > 0);
  const taxiDepth = camera.position.distanceTo(taxi);
  if (visibleRoof.length) {
    const samples = [-0.9, -0.75, -0.5, 0, 0.5, 0.75, 0.9];
    for (const x of samples) {
      for (const y of samples) {
        ray.setFromCamera({ x, y }, camera);
        const hit = ray.intersectObjects(visibleRoof, false)[0];
        if (hit && hit.distance < taxiDepth) return { taxiInFrame, canopyClear: false };
      }
    }
  }
  return { taxiInFrame, canopyClear: true };
}

function taxiSightlines() {
  const { rig } = window.__ew.game;
  const shot = rig.taxiShot;
  if (!shot) return { active: false };
  return {
    active: true, rays: rig.taxiSnapRays,
    points: rig.taxiSightPoints(shot.subject).map((point) => ({
      clear: shot.clear(rig.cam.position, point),
      visible: point.clone().project(rig.cam).toArray().every((n) => Math.abs(n) < 1),
    })),
  };
}

function checkSightlines(view, moment) {
  assert(view.active && view.rays >= 4 && view.rays <= 20 && view.rays % 4 === 0,
    `${moment} uses a taxi shot selected with at most 20 rays: ${JSON.stringify(view)}`);
  assert.equal(view.points.length, 4);
  assert(view.points.every(({ clear, visible }) => clear && visible),
    `${moment}: roof, rear corners and road are visible: ${JSON.stringify(view)}`);
}

function greetingLayout() {
  const { rig } = window.__ew.game;
  const { position, heading, width, length, height } = rig.taxiShot.subject;
  const yaw = heading(), cos = Math.cos(yaw), sin = Math.sin(yaw);
  const points = [-width / 2, width / 2].flatMap((side) =>
    [-length / 2, length / 2].flatMap((fore) => [0, height].map((up) => {
      const p = position.clone().set(position.x + side * cos + fore * sin, position.y + up, position.z - side * sin + fore * cos).project(rig.cam);
      return { x: (1 + p.x) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2 };
    })));
  return {
    taxi: { left: Math.min(...points.map((p) => p.x)), right: Math.max(...points.map((p) => p.x)),
      top: Math.min(...points.map((p) => p.y)), bottom: Math.max(...points.map((p) => p.y)) },
    controls: [...document.querySelectorAll(".joy, .brake-btn")].map((el) => el.getBoundingClientRect().toJSON()),
    cue: document.querySelector(".taxi-line").getBoundingClientRect().toJSON(),
  };
}

function measureGuidance() {
  const { car } = window.__ew.game.modes.get("taxi");
  const { m } = car, { cam } = window.__ew.game.rig;
  const road = car.mesh.position.clone().set(m.x + m.fx * 6, 0.04, m.z + m.fz * 6).project(cam);
  const action = document.querySelector(".taxi-action");
  const { fontSize, fontWeight, transform } = getComputedStyle(action);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    action: action.dataset.action,
    chip: action.getBoundingClientRect().toJSON(),
    icon: action.querySelector(".taxi-action-icon").getBoundingClientRect().toJSON(),
    cue: document.querySelector(".taxi-line").getBoundingClientRect().toJSON(),
    roadY: (1 - road.y) * innerHeight / 2,
    controls: [...document.querySelectorAll(".joy, .brake-btn")].map((el) => el.getBoundingClientRect().toJSON()),
    fontSize: parseFloat(fontSize),
    fontWeight: Number(fontWeight),
    transform,
    label: action.querySelector(".taxi-action-label").textContent.trim(),
    key: action.querySelector("kbd")?.textContent ?? null,
  };
}

function checkGuidance(view, touch, key) {
  const { chip, icon, cue, roadY, controls, viewport } = view;
  const measured = JSON.stringify(view);
  assert(Math.abs(chip.left + chip.width / 2 - viewport.width / 2) < 2, `the chip is centred: ${measured}`);
  assert(chip.top >= cue.bottom && chip.bottom < roadY, `the chip stays between the cue and the road: ${measured}`);
  assert(controls.every((control) => chip.bottom < control.top), `the chip clears the touch controls: ${measured}`);
  const arrowSize = touch ? 40 : 48;
  assert(icon.width >= arrowSize && icon.height >= arrowSize, `the chip has a prominent direction icon: ${measured}`);
  assert(view.fontSize >= 20 && view.fontSize <= 22 && view.fontWeight >= 800, `the chip has large bold text: ${measured}`);
  assert(cue.width <= (viewport.width <= 600 ? Math.min(385, viewport.width - 80) : 620) + 1, `the cue stays within its width limit: ${measured}`);
  assert(view.label && !/[\u2190-\u21ff]/u.test(view.label), `the chip label has no arrow characters: ${measured}`);
  assert.equal(view.key, touch ? null : key, `the chip has the expected key hint: ${measured}`);
}

async function checkNoRideHints(page, where, blockedTitle) {
  const hints = await page.locator(".toast:visible").evaluateAll((toasts, title) => toasts
    .filter((toast) => toast.hasAttribute("data-ride-hint") || toast.querySelector(".t-text b")?.textContent === title)
    .map((toast) => toast.textContent), blockedTitle);
  assert.deepEqual(hints, [], `no ride hint is visible ${where}: ${JSON.stringify(hints)}`);
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

try {
  for (const [width, height] of sizes) {
    const phone = width === 390 || height === 390;
    const label = `${width}x${height}`;
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([prefix, save, spanish]) => {
      localStorage.setItem(`${prefix}-progress-v1`, save);
      localStorage.setItem(`${prefix}-variety`, spanish);
    }, [storage, JSON.stringify(progress), variety]);
    await page.addInitScript(installTestControls);
    await page.goto(base, { waitUntil: "domcontentloaded" });

    const step = (n, steer = false) => page.evaluate(([frames, drive]) => window.__step(frames, drive), [n, steer]);
    const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const waitFor = async (predicate, description, { steer = false, attempts = 150, frames = 5 } = {}) => {
      for (let i = 0; i < attempts; i++) {
        await step(frames, steer);
        if (await predicate()) return;
      }
      const state = await page.evaluate(() => {
        const mode = window.__ew?.game.modes.get("taxi");
        const m = mode?.car.m;
        return { phase: mode?.run?.phase, index: mode?.run?.index, x: m?.x, z: m?.z, heading: m?.heading, pace: m?.pace, crashes: mode?.run?.crashes,
          audio: window.__ew?.voice(), choices: [...document.querySelectorAll(".taxi-choice")].map((el) => el.dataset.line), history: window.__taxiLines };
      });
      assert.fail(`${label}: ${description}: ${JSON.stringify({ ...state, errors })}`);
    };
    const shot = async (name) => { if (shots) { await step(2); await real(320); await page.screenshot({ path: `${shots}/${label}-${name}.png` }); } };
    const heard = async (key) => {
      const line = page.locator(`.taxi-cue [data-line="${key}"]`);
      if (!await line.count()) return false;
      const units = await line.locator(".il .en").evaluateAll((nodes) => nodes.map((node) =>
        [...node.childNodes].filter((child) => child.nodeType === Node.TEXT_NODE).map((child) => child.textContent).join("")));
      if (units.length) assert.equal(units.join(" "), lineText(key));
      return true;
    };
    const choice = (key) => page.locator(`.taxi-choice[data-line="${key}"]`);
    const phase = (value) => page.evaluate((p) => window.__ew.game.modes.get("taxi").run?.phase === p, value);
    const press = (locator) => phone ? locator.tap() : locator.click();
    const speak = async (key, transcript) => {
      assert(transcript, `no authored transcript for ${key}`);
      await page.waitForFunction(() => window.__listening(), undefined, { polling: 25, timeout: 6000 });
      assert.equal(await choice(key).locator('span[lang="es"]').innerText(), lineText(key));
      assert(await page.evaluate((input) => window.__speak(input), transcript), transcript);
      // Recognition commits after real silence. Stepping the world clock does not advance it.
      await page.waitForFunction((line) => !document.querySelector(`.taxi-choice[data-line="${line}"]`), key, { polling: 25, timeout: 6000 });
    };
    await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", { attempts: 500 });
    const lithuanian = await page.evaluate(() => document.documentElement.lang === "lt");
    assert.equal(lithuanian, process.env.WORLD_LEARNER === "lt");
    const STRINGS = lithuanian ? {} : await page.evaluate(async () => (await import("/src/ui/strings.ts")).STRINGS);
    const uiText = (key) => lithuanian ? key : STRINGS[key];
    const standPrompt = page.locator(".prompt").getByText(uiText("Vairuoti taksi"));
    await waitFor(() => standPrompt.isVisible(), "taxi prompt appears");
    assert(await page.evaluate(() => !window.__ew.game.rides.list.some((ride) => ride.id === "taxi")), "the parked taxi is outside the town rides");
    await waitFor(() => page.evaluate(() => {
      const stand = window.__ew.game.town.parkedCars.taxi;
      return stand && stand.instance?.parent === stand.root && !stand.fallback.parent;
    }), "the Kenney model replaces the stand taxi's fallback", { attempts: 300 });
    // Let the standing follow camera finish its swing before checking the framing.
    await step(80);
    assert(await standPrompt.isVisible(), "taxi prompt remains visible after the camera settles");
    assert(await page.evaluate(atTaxiStand), "the taxi is parked at the layout's stand");
    if (!phone) {
      const view = await page.evaluate(taxiStandView);
      assert(view.taxiInFrame && view.canopyClear, `the taxi is in view with a clear foreground: ${JSON.stringify(view)}`);
    }
    await shot("start");

    await page.evaluate(() => {
      window.__taxiLines = [];
      new MutationObserver(() => {
        const key = document.querySelector(".taxi-cue [data-line]")?.dataset.line;
        if (key && window.__taxiLines.at(-1) !== key) window.__taxiLines.push(key);
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-line"] });
    });
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await real(470);
    await waitFor(() => heard("tx_hello"), "Don Rigo greets the learner");
    if (phone) {
      const { taxi, controls, cue } = await page.evaluate(greetingLayout);
      assert(taxi.left >= 0 && taxi.right <= width && taxi.top >= 0 && taxi.bottom <= height
        && controls.length === 2 && [...controls, cue].every(({ left, right, top, bottom }) =>
          taxi.right <= left || taxi.left >= right || taxi.bottom <= top || taxi.top >= bottom),
      `the whole taxi fits between the greeting and touch controls: ${JSON.stringify({ taxi, controls, cue })}`);
    }
    await waitFor(() => choice("tx_a_where").count(), "Don Rigo gets in and asks for the learner's turn");
    assert(await page.evaluate(atTaxiStand, "r1"), "the first ride boards the parked taxi at the stand");
    checkSightlines(await page.evaluate(taxiSightlines), "opening pickup");
    assert(await page.evaluate(() => {
      const mode = window.__ew.game.modes.get("taxi");
      return mode.passenger.root.parent === mode.car.mesh && mode.passenger.root.position.z < 0 && !mode.passenger.root.visible;
    }), "Don Rigo sits in the back of the taxi, out of sight under its roof");
    assert.equal(await page.locator(".mode-exit").count(), 1);
    assert.equal(await page.locator(".mode-exit").isVisible(), false);
    assert.equal(await page.locator(".minimap, .objective-card").count(), 0);
    const taxiMenu = page.getByRole("button", { name: uiText("Meniu"), exact: true });
    assert.equal(await taxiMenu.getAttribute("aria-expanded"), "false");
    assert.equal(await page.locator(".mode-hud .toolbar .icon-btn:visible").count(), 1);
    assert(await page.evaluate(() => !window.__ew.game.npcs.find((n) => n.id === "vinnie").ch.root.visible));
    if (phone) {
      const touchLayout = await page.locator(".taxi-choices").evaluate((panel) => ({
        panel: panel.getBoundingClientRect().toJSON(),
        controls: [...document.querySelectorAll(".joy, .brake-btn")].map((el) => el.getBoundingClientRect().toJSON()),
        width: innerWidth,
      }));
      assert(touchLayout.panel.left >= 0 && touchLayout.panel.right <= touchLayout.width
        && touchLayout.controls.every((control) => touchLayout.panel.bottom < control.top),
        `answers fit above the phone controls: ${JSON.stringify(touchLayout)}`);
      await choice("tx_a_where").tap();
    } else await speak("tx_a_where", TAXI_ACCEPT.tx_a_where[0]);
    await waitFor(() => heard("tx_r1_dest"), "Don Rigo names the destination");
    await waitFor(() => page.evaluate(() => {
      const game = window.__ew.game;
      return game.modes.get("taxi").run?.phase === "drive" && game.rides.phase === "on";
    }), "boarding finishes and the taxi is ready to drive");
    assert(await page.evaluate(() => !window.__ew.game.player.root.visible), "the learner at the taxi's wheel is out of sight under its roof");

    if (phone) {
      const cdp = await context.newCDPSession(page);
      const stick = await page.locator(".joy").boundingBox();
      assert(stick);
      const x = stick.x + stick.width / 2, y = stick.y + stick.height / 2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y - 42 }] });
      await step(16);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert(await page.evaluate(() => window.__ew.game.rides.riding.m.pace > 1), "touch stick drives");
      const brake = await page.getByRole("button", { name: uiText("Stabdyti") }).boundingBox();
      assert(brake);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: brake.x + brake.width / 2, y: brake.y + brake.height / 2 }] });
      await step(10);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert(await page.evaluate(() => window.__ew.game.rides.riding.m.pace < 0.5), "touch brake stops the taxi");
    } else {
      await page.keyboard.down("ArrowUp");
      await step(16);
      await page.keyboard.up("ArrowUp");
      assert(await page.evaluate(() => window.__ew.game.rides.riding.m.pace > 1), "arrow key drives");
    }

    await page.evaluate(installSteering, { wrong: true });
    await waitFor(() => page.locator('.taxi-action[data-action="left"]').count(), "first turn chip", { steer: true, attempts: 240 });
    checkGuidance(await page.evaluate(measureGuidance), phone, "←");
    const directions = page.locator('.taxi-cue [data-line="tx_r1_c1"]');
    const reveal = directions.and(page.locator(".taxi-reveal"));
    if (await reveal.isVisible()) {
      assert.equal(await directions.locator("[data-phrase-save]").count(), 0);
      await press(reveal);
    }
    const snapshot = () => page.evaluate(async () => {
      const { useTaxi } = await import("/src/game/taxi/store.ts");
      const { game, store } = window.__ew;
      const { run, car } = game.modes.get("taxi");
      const { line, action, choices, mic } = useTaxi.getState();
      return { phase: run.phase, index: run.index, crashes: run.crashes, position: [car.m.x, car.m.z, car.m.heading],
        kept: [...run.kept.keys()], line: line?.key, action, choices, mic, plays: store.getState().progress.play };
    });
    const cueLine = await fixtureSentence(page, "s66-taxi", "tx_r1_c1");
    const keptCue = await checkManualSave(page, directions.locator("[data-phrase-save]"), phone, cueLine.en, "s66-taxi", snapshot, "Space");
    assertSavedSentence(keptCue, cueLine, "s66-taxi");
    await shot("cue");
    await waitFor(() => heard("tx_wrong"), "Don Rigo catches the wrong turn", { steer: true, attempts: 150 });
    await shot("wrong-turn");
    await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    await waitFor(async () => {
      if (!await phase("drive")) { await real(15); return false; }
      return true;
    }, "fade brings taxi back to the decision");
    assert(await page.evaluate(() => {
      const { car: { m }, route } = window.__ew.game.modes.get("taxi");
      const { x, z } = route.decisions[0].at;
      return Math.abs(m.x - x - 14) < 0.5 && Math.abs(m.z - z) < 0.5 && Math.abs(m.pace) < 0.5 && Math.abs(m.heading + Math.PI / 2) < 0.01;
    }), "the taxi is reset on its approach, facing west");
    checkSightlines(await page.evaluate(taxiSightlines), "retry snap");
    await waitFor(() => heard("tx_r1_c1"), "the cue repeats");

    await page.evaluate(installSteering, { wrong: false });
    await waitFor(() => page.evaluate(() => {
      const game = window.__ew.game, mode = game.modes.get("taxi");
      const truck = game.town.parkedCars.placements.find(({ model }) => model === "garbage");
      return mode.run.index === 2 && mode.car.m.x < truck.x - 5 && mode.run.crashes === 0;
    }), "the taxi clears the Calle Uxmal garbage truck", { steer: true, attempts: 550, frames: 5 });
    await waitFor(() => heard("tx_r1_c6"), "the stop cue is heard", { steer: true, attempts: 610, frames: 8 });
    await waitFor(() => page.locator('.taxi-action[data-action="stop"]').count(), "stop chip appears", { steer: true, attempts: 90, frames: 4 });
    checkGuidance(await page.evaluate(measureGuidance), phone, uiText("Tarpas"));
    await shot("stop");
    await waitFor(() => choice("tx_a_here").count(), "learner stops in the zone", { steer: true, attempts: 100 });
    assert(await page.evaluate(() => {
      const mode = window.__ew.game.modes.get("taxi");
      const { m } = mode.car, { at } = mode.route.decisions.at(-1);
      return Math.abs(m.x - at.x) <= 4 && Math.abs(m.z - at.z) <= 1.8 && m.pace < 0.5;
    }), "the real car has stopped in the curb zone");
    await checkNoRideHints(page, "at the curb", uiText("Kelias užimtas"));
    if (phone) await choice("tx_a_here").tap(); else await page.keyboard.press("1");
    await waitFor(() => choice("tx_r1_a_fare").count(), "Don Rigo asks what he owes");
    if (phone) await press(choice("tx_r1_a_fare"));
    else await speak("tx_r1_a_fare", TAXI_ACCEPT.tx_r1_a_fare.find((phrase) => /^\d+$/.test(phrase)));
    await waitFor(() => heard("tx_r1_tip_good"), "one wrong turn earns the good tip");
    await waitFor(() => choice("tx_a_bye").count(), "learner gets the last turn");
    await press(choice("tx_a_bye"));
    await waitFor(async () => { await real(10); return page.locator(".mode-score-card").count(); }, "score card opens", { attempts: 150 });
    await checkNoRideHints(page, "on the score card", uiText("Kelias užimtas"));
    await shot("score");

    const card = page.locator(".mode-score-card");
    assert.equal(await card.locator("h2").innerText(), uiText("Kelionė baigta"));
    assert.equal(await card.locator(".mode-score-line").innerText(), "6/7");
    const rows = await card.locator("dl > div").evaluateAll((entries) => entries.map((entry) =>
      [entry.querySelector("dt").textContent, entry.querySelector("dd").textContent]));
    assert.deepEqual(rows, [
      [uiText("Posūkiai iš pirmo karto"), "4/5"],
      [uiText("Sklandus sustojimas prie durų"), "1/1"],
      [uiText("Kelionė be susidūrimų"), "1/1"],
      [uiText("Kaina"), "$120"],
      [uiText("Arbatpinigiai"), "$10"],
      [uiText("Sustojote"), uiText("prie durų")],
      [uiText("Frazių kortelės"), "10"],
    ], `score card rows: ${JSON.stringify(rows)}`);
    const review = card.locator(".phrase-review-row");
    await review.getByRole("combobox").selectOption({ label: keptCue.en });
    assert.equal(await review.locator(`small[lang="${lithuanian ? "lt" : "en"}"]`).textContent(), keptCue.lt);
    assert.equal(await review.locator("[data-phrase-save]").getAttribute("aria-pressed"), "true");
    assert.deepEqual(await cardsFor(page, keptCue.en), [keptCue]);
    const scoreLayout = await card.evaluate((el) => ({
      card: el.getBoundingClientRect().toJSON(), width: innerWidth, height: innerHeight,
    }));
    assert(scoreLayout.card.left >= 0 && scoreLayout.card.right <= scoreLayout.width
      && scoreLayout.card.top >= 0 && scoreLayout.card.bottom <= scoreLayout.height,
      `the score card fits in the window: ${JSON.stringify(scoreLayout)}`);
    assert.deepEqual(await page.evaluate(() => window.__taxiLines), [
      "tx_hello", "tx_r1_dest", "tx_r1_c1", "tx_wrong", "tx_r1_c1", "tx_r1_c2", "tx_r1_c3",
      "tx_r1_c4", "tx_r1_c5", "tx_r1_c6", "tx_owe", "tx_r1_tip_good", "tx_bye",
    ]);
    assert(await page.evaluate(([storageKey, stopLine]) => {
      const game = window.__ew.game, p = game.player.root.position;
      const door = game.doors.find((d) => d.loc === "hotel");

      const cards = JSON.parse(localStorage.getItem(storageKey) ?? "null")?.cards ?? [];
      return !game.rides.riding && game.player.root.visible && Math.hypot(p.x - door.outX, p.z - door.outZ) < 0.5
        && window.__ew.store.getState().progress.taxi.nextRoute === 1
        && cards.some((c) => c.situationId === "s66-taxi" && c.sentence.en === stopLine);
    }, [`${storage}-cards-v1`, lineText("tx_r1_c6")]), "on foot at the destination door, with route rotation and cards saved");
    await press(card.getByRole("button", { name: uiText("Baigti") }));
    await waitFor(() => page.locator(".minimap").count(), "town HUD returns");

    await page.evaluate(() => window.__ew.game.startScenario("s66-taxi"));
    await waitFor(async () => { await real(10); return page.evaluate(() => window.__ew.game.activeSession?.active); }, "s66 opens");
    await press(page.locator(".scene-start"));
    await page.evaluate(() => {
      const { game, store, audio } = window.__ew;
      const { setConv } = store.getState();
      // Cancel the greeting before showing the simulated end card.
      audio.stop();
      game.activeSession.stopListening();
      game.onSessionEvent("taxi-ride", { to: "bank" });
      game.player.root.position.set(0, 0, -8);
      setConv({ phase: "ended", completed: true, speaking: null });
    });
    const cta = page.locator(".ended-box .taxi-cta");
    await waitFor(() => cta.isVisible(), "s66 shows the taxi button");
    const button = await cta.evaluate((el) => {
      const box = el.closest(".ended-box");
      const style = getComputedStyle(box);
      const contentWidth = box.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      return { ...el.getBoundingClientRect().toJSON(), contentWidth, title: el.textContent.trim() };
    });
    assert.equal(button.title, uiText("Vairuoti taksi"), `s66 taxi button: ${JSON.stringify(button)}`);
    assert(button.height >= 44 && Math.abs(button.width - Math.min(450, button.contentWidth)) <= 2,
      `the s66 taxi button is wide and easy to tap: ${JSON.stringify(button)}`);
    await press(cta);
    await real(480);
    await waitFor(() => choice("tx_a_where").count(), "s66 end card starts a taxi mode");
    assert(await page.evaluate(atTaxiStand, "r2"), "the second route boards the same taxi at the stand");
    assert.equal(await review.count(), 0);
    assert.deepEqual(await cardsFor(page, keptCue.en), [keptCue]);
    checkSightlines(await page.evaluate(taxiSightlines), "second pickup");
    if (shots && !phone) {
      await page.keyboard.press("1");
      await waitFor(() => phase("drive"), "route 2 is ready to drive");
      await page.evaluate(installSteering, {});
      await waitFor(() => heard("tx_r2_c1"), "route 2 first cue", { steer: true });
      await waitFor(() => page.locator('.taxi-action[data-action="left"]').count(), "route 2 first turn chip", { steer: true, frames: 8 });
      await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
      await shot("route2-cue");
    }
    await press(taxiMenu);
    assert.equal(await taxiMenu.getAttribute("aria-expanded"), "true");
    await press(page.getByRole("button", { name: uiText("Išlipti"), exact: true }));
    await real(470);
    await waitFor(() => page.locator(".minimap").count(), "the menu exits the ride and restores the HUD");
    assert(await page.evaluate(() => window.__ew.game.player.root.visible), "on foot again after the menu's way out, in sight");
    await checkNoRideHints(page, "after exiting the mode", uiText("Kelias užimtas"));
    assert.deepEqual(errors, []);
    console.log("ok", label);
    await context.close();
  }
} finally {
  await browser.close();
}
