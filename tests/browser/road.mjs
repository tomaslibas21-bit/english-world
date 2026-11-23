// Run against the Vite dev server. WORLD_TEST_PC_URL adds a Puerto Colibrí server to the exit checks.
// WORLD_PHONE_HEIGHT=664 checks the smaller portrait viewport. WORLD_SHOTS=<folder> saves screenshots.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { BoardRegistration, sampleBoardRegistration } from "./board-registration.mjs";
import { assertRoadContinuity, assertWorldFrame } from "./road-handoff.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS;
if (shots) await mkdir(shots, { recursive: true });

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished }, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: -40, z: -13.65, rot: 0 },
  coach: { done: true, run: true, view: true },
};

function installClock() {
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (count, ms = 50) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      for (const fn of frames.splice(0)) fn(now);
    }
  };
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

const pcLongLabels = (key) => key.includes("-lt")
  ? ["kelionės tikslas", "darbo reikalai", "laba diena"] : ["business meeting", "boarding pass", "lost luggage"];

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

async function driveExit(url, scenario, expectedHeading) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  let allowModule, requested = false;
  const released = new Promise((resolve) => { allowModule = resolve; });
  const origin = new URL(url).origin;
  const roadModule = (url) => url.origin === origin && url.pathname.endsWith("/src/game/road/mode.ts");
  try {
    await page.route(roadModule, async (route) => {
      requested = true;
      if (scenario !== "warm") await released;
      await route.continue();
    });
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(installClock);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const read = () => page.evaluate(() => window.__ew?.road.state());
    const step = () => page.evaluate(() => window.__step(1));
    const until = async (condition, message, limit = 250) => {
      for (let frame = 0; frame < limit; frame++) {
        await step();
        const state = await read();
        if (state && await condition(state)) return state;
      }
      assert.fail(`${scenario}: ${message}: ${JSON.stringify(await read())}`);
    };
    const before = await until((state) => state.presented?.scene === "town", "the town presents", 750);
    assert.equal(requested, false);
    assert.ok(Math.abs(before.exit.outward - expectedHeading) < 0.01, "drives through the edition's physical exit");
    await Promise.all([
      page.waitForRequest((request) => roadModule(new URL(request.url()))),
      page.evaluate(({ x, z, outward }) => {
        const { game } = window.__ew;
        // Both towns build the park convertible with procedural geometry during initialization.
        const ride = game.rides.find("park");
        if (ride?.kind !== "car") throw new Error("Could not find the town's park convertible");
        const start = { x: x - Math.sin(outward) * 19, z: z - Math.cos(outward) * 19, rot: outward };
        game.rides.resetPosition(ride, start);
        game.placeOnFoot(start.x - Math.cos(outward) * 2, start.z + Math.sin(outward) * 2, outward);
        if (!game.boardRide(ride)) throw new Error("Could not board the park convertible");
        game.modeHost.snapRide(ride);
      }, before.exit),
    ]);
    const aboard = await until(async (state) => requested && state.requested
      && (scenario !== "warm" || state.ready)
      && await page.evaluate(() => window.__ew.game.rides.phase === "on"), "boards the convertible and requests the road");
    assert.equal(aboard.phase, "town");
    await page.keyboard.down("ArrowUp");
    if (scenario === "warm") {
      let previous = await until((state) => state.exitDistance >= -state.townCar.speed * 0.5 - 2.5,
        "drives towards the trigger plane");
      let crossed = false;
      for (let frame = 0; frame < 180; frame++) {
        await step();
        const state = await read();
        await assertWorldFrame(page, previous, state, 60, "pc-computer", shots);
        if (state.elapsed === 0) crossed = true;
        previous = state;
        if (crossed && state.elapsed >= 3) break;
      }
      assert.ok(crossed && previous.elapsed >= 3);
    } else {
      const approach = await until((state) => state.onStrip && state.exitDistance >= 20, "reaches the start of the holding band");
      const slowed = await until((state) => state.exitDistance >= 30, "approaches the crest with the road module held");
      assert.ok(slowed.townCar.speed > 0 && slowed.townCar.speed < approach.townCar.speed,
        "slows down before reaching the crest");
      const held = await until((state) => state.onStrip && state.exitDistance >= 31.99 && Math.abs(state.townCar.speed) < 0.1,
        "holds at the cold crest with town still running");
      assert.equal(held.ready, false);
      assert.equal(held.presented.scene, "town");
      assert.equal(held.outwardIntent, true);
      await page.keyboard.up("ArrowUp");
      if (scenario === "reverse") {
        await page.keyboard.down("ArrowDown");
        await until((state) => !state.outwardIntent && state.exitDistance < 29, "reverses back down the strip");
        await page.keyboard.up("ArrowDown");
      }
      allowModule();
      if (scenario === "reverse") {
        await until((state) => state.ready, "preparation completes while backing away");
        for (let i = 0; i < 24; i++) {
          await step();
          assert.equal((await read()).phase, "town");
        }
      } else {
        const first = await until((state) => state.phase === "drive", "automatically enters when the module arrives");
        assertRoadContinuity(first);
      }
    }
  } finally {
    allowModule();
    await context.close();
  }
}

try {
  const heights = process.env.WORLD_PHONE_HEIGHT ? [Number(process.env.WORLD_PHONE_HEIGHT)] : [844, 664];
  for (const height of [800, ...heights]) {
    const phone = height !== 800;
    const label = phone ? (height === 844 ? "phone" : `phone-${height}`) : "computer";
    const maxRoadCalls = phone ? 26 : 60;
    const context = await browser.newContext(phone
      ? { viewport: { width: 390, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [], modelRequests = [], roadRequests = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("request", (req) => {
      const path = new URL(req.url()).pathname;
      if (/\/models\/cars\/cone(?:-flat)?\.glb$/.test(path)) modelRequests.push(path);
      // Source modules in Vite dev and the corresponding lazy entries in the production build.
      if (/\/src\/(?:game\/road\/mode\.ts|ui\/Road\.tsx)$/.test(path)
        || /\/assets\/(?:mode|Road)-[\w-]+\.js$/.test(path)) roadRequests.push(path);
    });
    await page.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(installClock);
    await page.goto(base, { waitUntil: "domcontentloaded" });

    const read = () => page.evaluate(() => window.__ew?.road.state());
    let registration;
    let milliseconds = 50;
    const rawStep = (frames = 1) => page.evaluate(([n, ms]) => window.__step(n, ms), [frames, milliseconds]);
    const step = async (frames) => {
      if (!registration) return rawStep(frames);
      for (let i = 0; i < frames; i++) {
        await rawStep();
        registration.record(await sampleBoardRegistration(page, "road"));
      }
    };
    const waitFor = async (predicate, description, attempts = 150, frames = 5) => {
      for (let i = 0; i < attempts; i++) {
        await step(frames);
        if (await predicate()) return;
      }
      assert.fail(`${label}: ${description}: ${JSON.stringify(await read())}`);
    };
    const press = (element) => phone ? element.tap() : element.click();
    const shot = (name) => shots && page.screenshot({ path: `${shots}/${label}-road-${name}.png` });
    await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", 500);
    // Keep the shipped clip manifest and selection logic. Silence recorded clips and speech fallback alike.
    await page.evaluate(() => {
      window.__roadAudio = [];
      window.__roadSfx = [];
      const sfx = window.__ew.audio.sfx.bind(window.__ew.audio);
      window.__ew.audio.sfx = (name) => { window.__roadSfx.push(name); sfx(name); };
      window.__ew.audio.play = async (voice, speed, text) => { window.__roadAudio.push({ voice, speed, text }); return true; };
    });
    const parked = page.locator(".prompt").getByText("Vairuoti", { exact: true });
    await waitFor(() => parked.isVisible(), "the west-facing van can be driven");
    const town = await read();
    assert.equal(town.phase, "town");
    assert.ok(town.drawCalls > 0 && town.fps > 0);
    assert.deepEqual(modelRequests, []);
    assert.deepEqual(roadRequests, [], "the desert chunk stays unloaded in town");
    const keys = await page.evaluate(() => {
      const { game, store } = window.__ew;
      const mesh = game.rides.group.getObjectByName("parked-car-keys");
      const player = game.player.root.position, saved = player.clone();
      const marker = () => {
        const matrix = mesh.instanceMatrix.array;
        for (let i = 0; i < mesh.count; i++) {
          const j = i * 16;
          if (Math.abs(matrix[j + 12] + 40) < 0.15 && Math.abs(matrix[j + 14] + 11.8) < 0.15) {
            return player.clone().set(matrix[j + 12], matrix[j + 13], matrix[j + 14]);
          }
        }
      };
      const aboveVan = marker();
      const screen = aboveVan?.clone().project(game.rig.cam);
      player.set(-40 + 14.8, saved.y, -11.8);
      game.rides.updateParkingKeys(0, true);
      const visibleBy15 = !!marker();
      player.x += 0.5;
      game.rides.updateParkingKeys(0, true);
      const hiddenPast15 = !marker();
      player.copy(saved);
      game.rides.updateParkingKeys(0, true);
      store.getState().setHud({ zoneBanner: null });
      return {
        aboveVan: aboveVan?.y > 1.9,
        onScreen: !!screen && Math.abs(screen.x) < 0.96 && Math.abs(screen.y) < 0.96 && Math.abs(screen.z) < 1,
        visibleBy15, hiddenPast15,
      };
    });
    assert.deepEqual(keys, { aboveVan: true, onScreen: true, visibleBy15: true, hiddenPast15: true });
    await step(2);
    await shot("town-key");

    await press(parked);
    await waitFor(() => page.evaluate(() => window.__ew.game.rides.phase === "on" && !!window.__ew.game.rides.riding), "boards the parked van");
    assert.equal((await read()).requested, true, "the desert chunk is requested on boarding");
    const carId = await page.evaluate(() => window.__ew.game.rides.riding.id);
    assert.ok(carId.startsWith("parked-"));
    assert.equal(await page.evaluate(() => window.__ew.game.rides.group.getObjectByName("parked-car-keys").visible), false);
    await step(24);
    const atRest = await page.evaluate(() => window.__ew.game.rig.cam.fov);
    await page.evaluate(() => {
      const { game } = window.__ew;
      const car = game.ambient.traffic.find((c) => c.dir === -1 && Math.abs(c.lane + 9.5) < 0.5);
      if (!car) throw new Error("Expected a westbound Main Street traffic car");
      const fields = ["x", "speed", "grow", "whole", "hidden"];
      const saved = Object.fromEntries(fields.map((name) => [name, car[name]]));
      const { position, scale, visible } = car.mesh;
      const pos = position.clone(), size = scale.clone();
      Object.assign(car, { x: game.rides.riding.m.x - 8, speed: 0, grow: 1, whole: true, hidden: 0 });
      position.x = car.x;
      scale.setScalar(1);
      car.mesh.visible = true;
      const random = Math.random;
      Math.random = () => 0.1;
      window.__roadRestoreRandom = () => { Math.random = random; };
      window.__roadRestoreTraffic = () => {
        Object.assign(car, saved);
        position.copy(pos);
        scale.copy(size);
        car.mesh.visible = visible;
      };
    });
    if (phone) await press(page.getByRole("button", { name: "Signalas", exact: true }));
    else await page.keyboard.press("h");
    await page.evaluate(() => window.__roadRestoreRandom());
    await waitFor(() => page.evaluate(() => window.__roadSfx.includes("hornReply")), "nearby town traffic replies to the horn");
    await page.evaluate(() => window.__roadRestoreTraffic());
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    else await page.keyboard.down("ArrowUp");
    await waitFor(() => page.evaluate((initialFov) => {
      const { game } = window.__ew;
      const m = game.rides.riding.m;
      return m.pace > m.spec.max * 0.86 && game.rig.cam.fov > initialFov + 1.5;
    }, atRest), "the town camera widens at top speed");
    await waitFor(async () => (await read()).ready, "road meshes and shaders are ready before the warm approach", 150, 1);
    await waitFor(async () => {
      const { exitDistance, townCar, phase } = await read();
      return phase === "town" && exitDistance > -townCar.speed * 0.5 - 2.5;
    }, "approaches the actual signed exit", 240, 1);
    // A boost changes the time remaining, so sample layout and distance from the same draw.
    const measureGates = ({ minFont, minWidth }) => {
      const header = document.querySelector(".road-header")?.getBoundingClientRect();
      if (!header) return [];
      const controls = [...document.querySelectorAll(".road-mode .joy, .road-mode .brake-btn, .road-mode .drive-horn")]
        .map((element) => element.getBoundingClientRect());
      const gates = [...document.querySelectorAll(".road-gate")];
      return gates.map((gate, lane) => {
        const r = gate.getBoundingClientRect();
        const probe = (key) => gate.querySelector(`[data-face-probe="${key}"]`).getBoundingClientRect();
        const mid = probe("center"), em = probe("em"), font = Math.hypot(mid.x - em.x, mid.y - em.y);
        const lines = [...gate.querySelectorAll(":scope > span")];
        const wholeWords = lines.map((line) => line.textContent).join(" ") === gate.getAttribute("aria-label")
          && lines.every((line) => {
            const word = line.getBoundingClientRect();
            return getComputedStyle(line).whiteSpace === "nowrap" && word.left >= r.left - 0.5 && word.right <= r.right + 0.5;
          });
        const separated = lane === 0 || r.left > gates[lane - 1].getBoundingClientRect().right;
        return wholeWords && separated && r.left >= 0 && r.right <= innerWidth && r.top > header.bottom
          && r.width >= minWidth && font >= minFont && r.bottom < innerHeight
          && controls.every((c) => r.bottom < c.top || r.right < c.left || r.left > c.right);
      });
    };
    const fitAtApproach = phone ? { minFont: 15, minWidth: 88 } : { minFont: 18, minWidth: 110 };
    const labels = page.locator(".road-gate");
    await shot("departure");
    let last = await read(), first;
    let layout, lastLayout;
    let cone, coneHit = false;
    const stillFeatures = new Map();
    const sampleHazards = (state) => {
      assert.ok(!state.propBatches.includes("weed"));
      for (const { kind, id, x, z } of state.hazards) {
        assert.ok(["cone", "rock", "cactus", "ramp", "boost"].includes(kind));
        const old = stillFeatures.get(id);
        if (old) assert.ok(Math.hypot(old.x - x, old.z - z) <= 0.001, `${kind} ${id} moved`);
        stillFeatures.set(id, { x, z });
      }
    };
    for (let frame = 0; frame < 180; frame++) {
      await step(1);
      const state = await read();
      if (!first || last.elapsed < 3) await assertWorldFrame(page, last, state, maxRoadCalls, label, shots);
      if (state.phase === "drive") {
        sampleHazards(state);
        if (!first) {
          first = state;
          await shot("first-road");
          if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
          else await page.keyboard.up("ArrowUp");
          await labels.nth(2).waitFor({ state: "attached" });
          await page.evaluate(async () => { await document.fonts.ready; });
          cone = state.hazards.find(({ kind, s }) => kind === "cone" && s === 13);
          assert.ok(cone);
          await page.evaluate((lane) => window.__ew.road.steer(lane), cone.lane);
        } else assert.ok(state.roadPosition > last.roadPosition, "the warm handoff advances on every road frame");
        if (state.gateDistance <= 70) registration ??= new BoardRegistration("road", 50, maxRoadCalls);
        if (!coneHit && state.hazards.find(({ id }) => id === cone.id)?.hit) {
          coneHit = true;
          assert.ok(state.wobble > 0 && state.propBatches.includes("flat"), "hitting a cone flattens it and causes a stumble");
        }
        if (!layout) {
          assert.equal(state.totalGates, 0,
            `${label}: crossed the first gate before measuring readable banners. Last sample: ${JSON.stringify(lastLayout)}`);
          const secondsToGate = state.gateDistance / state.speed;
          if (secondsToGate >= 1.85 && secondsToGate <= 2.2) {
            const rows = await page.evaluate(measureGates, fitAtApproach);
            lastLayout = { elapsed: state.elapsed, gateDistance: state.gateDistance, secondsToGate, rows };
            if (rows.length === 3 && rows.every(Boolean)) {
              layout = rows;
              await shot("gates");
            }
          }
        }
      } else assert.ok(state.exitDistance > last.exitDistance, "the warm approach advances on every town frame");
      last = state;
      if (first && state.elapsed >= 3 && layout) break;
    }
    assert.ok(first && last.elapsed >= 3 && coneHit, "samples the warm crest through its first three seconds");
    assert.deepEqual(layout, [true, true, true],
      `${label}: banner text fits whole words and clears the controls on the first gate approach. Last sample: ${JSON.stringify(lastLayout)}`);
    // Inspect resources and use the controls with the clock stopped on the same approach.
    assert.equal(await labels.count(), 3, "the first gate shows all three labels");
    assert.ok(modelRequests.length >= 2 && roadRequests.length > 0, "the road code and both cone models were requested");
    const road = await read();
    assert.equal(road.car, carId);
    assert.equal(road.model, "van");
    assert.ok(road.drawCalls <= maxRoadCalls && road.fps > 0, `draw calls ${road.drawCalls}, FPS ${road.fps}`);
    assert.equal(road.gates.length, 3);
    assert.equal(road.totalGates, 0, "the first prompt is still available to replay");
    if (phone) {
      const horn = page.getByRole("button", { name: "Signalas", exact: true });
      assert.equal(await horn.count(), 1);
      assert.equal(await page.locator(".road-mode .drive-horn").count(), 1);
      assert.equal(await page.locator(".road-mode .road-header").getByRole("button", { name: "Signalas" }).count(), 0);
      const drift = await page.getByRole("button", { name: "Driftas" }).boundingBox(), honk = await horn.boundingBox();
      assert.ok(drift && honk && honk.x + honk.width < drift.x && Math.abs(honk.y + honk.height / 2 - drift.y - drift.height / 2) < 10);
      const beeps = await page.evaluate(() => window.__roadSfx.filter((sound) => sound === "horn").length);
      await press(horn);
      assert.equal(await page.evaluate(() => window.__roadSfx.filter((sound) => sound === "horn").length), beeps + 1);
    }
    const replay = page.locator(".road-cue").getByRole("button", { name: "Klausyti dar kartą" });
    const beforeReplay = await page.evaluate(() => window.__roadAudio.length);
    await press(replay);
    assert.equal(await page.evaluate(() => window.__roadAudio.length), beforeReplay + 1, "replays the first prompt");
    if (Math.cos((await read()).exit.outward) > 0.9) {
      const words = pcLongLabels(storage);
      const captured = registration;
      registration = undefined;
      try {
        await page.evaluate(async (options) => {
          await document.fonts.load("800 32px Nunito", options.join(" "));
          window.__ew.road.previewOptions(options);
        }, words);
        await waitFor(async () => {
          const rows = await page.evaluate(measureGates, { minFont: 0, minWidth: 0 });
          return rows.length === 3 && rows.every(Boolean);
        },
          "long labels and accents fit the boards", 5, 1);
        assert.deepEqual(await labels.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))), words);
      } finally {
        await page.evaluate(() => window.__ew.road.previewOptions());
      }
      registration = captured;
      registration.previous.clear();
      registration.serial = undefined;
    }

    const steerForGate = (number, wrong = false) => page.evaluate(({ number, wrong }) => {
      const { road } = window.__ew;
      const { totalGates, right, lane } = road.state();
      if (totalGates !== number - 1 || right === undefined) throw new Error(`Gate ${number} is no longer available to steer through`);
      road.steer(wrong ? [0, 1, 2].find((candidate) => candidate !== lane && candidate !== right) : right);
    }, { number, wrong });
    const waitForGate = (number, distance = Infinity) => waitFor(async () => {
      const state = await read();
      assert.ok(state.totalGates < number, `${label}: passed gate ${number} while waiting for its approach`);
      return state.totalGates === number - 1 && state.gates?.length === 3 && state.gateDistance <= distance;
    }, `approaches gate ${number}`, 250, distance === Infinity ? 4 : 1);

    await steerForGate(1);
    await waitFor(async () => (await read()).totalGates >= 1, "passes the first gate", 150, 1);
    assert.equal((await read()).rightGates, 1, "takes the correct lane on the first gate");
    assert.equal((await read()).streak, 1);
    const correctFeedback = page.getByText("Teisingai!", { exact: true });
    await correctFeedback.first().waitFor({ state: "visible" });
    assert.equal(await correctFeedback.count(), 1);
    assert.ok((await read()).boost > 0);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await shot("gate-right");
    await step(8);
    registration.verify();
    registration = undefined;
    await waitForGate(2, 70);
    milliseconds = 1000 / 120;
    registration = new BoardRegistration("road", milliseconds, maxRoadCalls);
    await steerForGate(2, true);
    await waitFor(async () => (await read()).totalGates >= 2, "passes the second gate", 750, 1);
    assert.equal((await read()).rightGates, 1, "takes the wrong lane on the second gate");
    assert.equal((await read()).streak, 0);
    const wrongFeedback = page.getByText("Ne visai. Teisingai:", { exact: true });
    await wrongFeedback.first().waitFor({ state: "visible" });
    assert.equal(await wrongFeedback.count(), 1);
    assert.ok((await read()).wobble > 0);
    assert.ok((await page.locator(".road-feedback.wrong").innerText()).trim().length > "Ne visai. Teisingai:".length);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await step(19);
    await shot("gate-wrong");
    await step(29);
    registration.verify();
    registration = undefined;
    milliseconds = 50;

    await waitFor(async () => (await read()).speed > 12, "recovers from the missed gate");
    await page.evaluate(() => {
      const { game, road } = window.__ew;
      game.setJoystick(road.state().x >= 0 ? -0.82 : 0.82, 0);
      game.hold(true);
    });
    await waitFor(async () => (await read()).drifting, "steers with the drift control held", 35, 3);
    await step(4);
    assert.equal((await read()).drifting, true);
    const inFrame = ({ left, right, top, bottom }) => left > 0.015 && right < 0.985 && top > 0.08 && bottom < 0.98;
    assert.ok(inFrame((await read()).carFrame), "the whole car stays on screen during the drift");
    await shot("drift");
    await page.evaluate(() => {
      const { game, road } = window.__ew;
      game.hold(false);
      game.setJoystick(0, 0);
      road.steer(road.state().nextRamp.lane);
    });
    await waitFor(async () => {
      const state = await read();
      assert.equal(state.totalGates, 2, "tests the ramp before scoring gate three");
      return state.liftHeight > 0.75;
    }, "drives up a ramp and leaves the ground", 200, 3);
    const jump = await read();
    assert.ok(jump.drawCalls <= maxRoadCalls);
    assert.ok(inFrame(jump.carFrame), `the whole car stays on screen during the jump: ${JSON.stringify(jump.carFrame)}`);
    await shot("jump");

    for (let gate = 3; gate <= 7; gate++) {
      await waitForGate(gate);
      await steerForGate(gate);
      await waitFor(async () => (await read()).totalGates >= gate, `passes gate ${gate}`, 120, 8);
      assert.equal((await read()).rightGates, gate - 1, `takes the correct lane on gate ${gate}`);
    }
    await waitFor(async () => {
      const state = await read();
      assert.equal(state.totalGates, 7, "checks the gap prompt before scoring gate eight");
      return state.gates?.length === 3 && state.gateDistance / state.speed < 2.15 && (await labels.count()) === 3;
    }, "the eighth gate's gap prompt and banner labels are visible", 150, 4);
    assert.equal(await page.getByText("Kurio žodžio trūksta?", { exact: true }).count(), 1);
    assert.match(await page.locator(".road-gap").innerText(), /____/);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await shot("gap");

    await page.evaluate(() => window.__ew.road.jumpTimer(149.8));
    const result = page.getByRole("dialog", { name: "Važiavimas baigtas" });
    await waitFor(() => result.isVisible(), "shows the ScoreCard at 150 seconds");
    assert.equal((await read()).elapsed, 150);
    assert.equal((await read()).result.right, 6);
    assert.equal((await read()).result.total, 7);
    assert.equal((await read()).result.missed.length, 1);
    assert.deepEqual(await result.locator(".mode-score-number").evaluate((number) => ({
      value: Number(number.querySelector("span").textContent),
      animated: getComputedStyle(number.querySelector("span")).animationName,
      counter: getComputedStyle(number.querySelector("i")).display,
    })), { value: (await read()).result.points, animated: "none", counter: "none" });
    assert.equal(await result.getByRole("button", { name: "Nuvesk mane" }).count(), 1);
    await shot("result");
    await press(result.getByRole("button", { name: "Dar kartą" }));
    await waitFor(async () => (await read()).phase === "drive", "retries directly on the road");
    await steerForGate(1);
    let ghostSeen = false;
    await waitFor(async () => {
      const state = await read();
      assert.ok(state.drawCalls > 0 && state.drawCalls <= maxRoadCalls, `retry drew ${state.drawCalls} calls`);
      if (state.visibleGhost) ghostSeen = true;
      return state.totalGates === 1 && state.boost <= 0;
    }, "checks replay through the first gate and its boost", 180, 1);
    assert.equal((await read()).rightGates, 1, "answers the first gate on the retry");
    assert.ok(ghostSeen, "the best-run ghost is drawn on the retry");
    if (phone && height === 844) {
      await page.setViewportSize({ width: height, height: 390 });
      await step(2);
      assert.ok(await page.locator(".road-mode .joy, .road-mode .brake-btn, .road-mode .drive-horn")
        .evaluateAll((nodes) => nodes.length === 3 && nodes.every((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.top >= 0 && rect.bottom <= innerHeight;
        })), "road touch controls fit on a sideways phone");
      await shot("sideways");
      await page.setViewportSize({ width: 390, height });
      await step(2);
    }
    await page.evaluate(() => window.__ew.road.jumpTimer(149.95));
    await waitFor(() => result.isVisible(), "finishes the retry");
    await press(result.getByRole("button", { name: "Atgal į miestą" }));
    await waitFor(async () => (await read()).phase === "town", "returns to town");
    assert.equal(await page.evaluate((id) => {
      const ride = window.__ew.game.rides.riding;
      return ride?.id === id && ride.m.x > -110 && ride.m.x < -94 && Math.sin(ride.m.heading) > 0.99;
    }, carId), true, "the same car faces into town");

    await page.evaluate(() => window.__ew.game.interact());
    await waitFor(() => page.evaluate(() => !window.__ew.game.rides.riding), "gets out of the parked car");
    await page.evaluate(() => {
      const { game } = window.__ew;
      game.placeOnFoot(-109.4, -15.6, -Math.PI / 2);
      game.setJoystick(0, 1);
    });
    const yes = page.locator('.road-choice[data-line="rd_a_yes"]');
    // (Vinnie at the wheel under the taxi's roof is out of sight; standing beside it, in sight; beside the learner on
    // the road, under the roof again)
    const vinnie = () => page.evaluate(() => window.__ew.game.modes.get("road").mode?.lift?.driver.root.visible);
    await waitFor(async () => (await read()).phase === "approach", "walking to the boundary calls Vinnie's taxi", 750, 1);
    assert.equal(await vinnie(), false, "Vinnie drives up out of sight under the taxi's roof");
    await waitFor(() => yes.isVisible(), "walking to the boundary summons Vinnie's lift");
    assert.equal(await vinnie(), true, "Vinnie stands beside his taxi, in sight");
    await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    assert.ok(await page.evaluate(() => window.__roadAudio.some(({ text }) => text === "Need a lift? Hop in, you drive!")));
    assert.equal(await page.locator('.road-choice[data-line="rd_a_no"]').count(), 1);
    const frame = (await read()).liftFrame;
    for (const [name, point] of Object.entries(frame ?? {})) {
      assert.ok(point.x > 0.08 && point.x < 0.92 && point.y > 0.07 && point.y < 0.5, `${name} is framed above the lift cards: ${JSON.stringify(point)}`);
    }
    assert.ok(frame?.face && frame?.taxi);
    await shot("lift");
    await press(yes);
    await waitFor(async () => {
      const state = await read();
      return state.phase === "drive" && state.lifted && state.model === "taxi";
    }, "accepts the lift and starts driving Vinnie's taxi");
    assert.equal(await vinnie(), false, "Vinnie rides beside the learner out of sight under the taxi's roof");
    await page.evaluate(() => window.__ew.road.jumpTimer());
    await waitFor(() => result.isVisible(), "shows the taxi run's result");
    await waitFor(() => page.locator('[data-line="rd_end"]').isVisible(), "Vinnie's ending line is shown with the score");
    assert.ok(await page.evaluate(() => window.__roadAudio.some(({ text }) => text === "Nice drive! Let's head back to town.")));
    await press(result.getByRole("button", { name: "Atgal į miestą" }));
    await waitFor(async () => (await read()).phase === "town", "the lift taxi returns to town");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Road passed on ${label}, town/road draw calls ${town.drawCalls}/${road.drawCalls}`);
  }
  await driveExit(base, "release", -Math.PI / 2);
  await driveExit(base, "reverse", -Math.PI / 2);
  if (process.env.WORLD_TEST_PC_URL) {
    await driveExit(process.env.WORLD_TEST_PC_URL, "warm", 0);
    await driveExit(process.env.WORLD_TEST_PC_URL, "release", 0);
    await driveExit(process.env.WORLD_TEST_PC_URL, "reverse", 0);
  }
} finally {
  await browser.close();
}
