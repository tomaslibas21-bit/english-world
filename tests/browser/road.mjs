// Run against the Vite dev server. Simulated frames use 50 ms steps unless a test needs finer sampling.
// WORLD_STORAGE=puerto-colibri selects the Puerto Colibrí route on a VITE_EDITION=es server.
// Run Puerto Colibrí with both the default English learner and VITE_LEARNER=lt.
// WORLD_PHONE_HEIGHT=664 checks the smaller portrait viewport. WORLD_SHOTS=<folder> saves screenshots.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { BoardRegistration, sampleBoardRegistration } from "./board-registration.mjs";
import { assertCameraSettle, assertRoadContinuity, assertWorldFrame } from "./road-handoff.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const puertoColibri = storage === "puerto-colibri";
const van = { x: puertoColibri ? -88 : -40, z: -11.8 };
const ghostKey = `english-world-road-v1:${puertoColibri ? "puerto-colibri" : "maple-harbor"}`;
const shots = process.env.WORLD_SHOTS;
if (shots) await mkdir(shots, { recursive: true });

const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 1, sounds: 0, cameraFollow: true },
  sits: { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished }, phrases: {}, seenIntro: {}, started: 1,
  place: { zone: "town", x: van.x, z: van.z - 1.85, rot: 0 },
  coach: { done: true, run: true, view: true },
};

function installClock() {
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = class {
    start() { queueMicrotask(() => this.onstart?.()); }
    abort() { queueMicrotask(() => this.onend?.()); }
    stop() { this.abort(); }
  };
  let now = 1000;
  performance.now = () => now;
  const frames = [];
  window.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
  window.cancelAnimationFrame = () => {};
  window.__step = (count, ms = 50) => {
    const draws = [];
    for (let i = 0; i < count; i++) {
      now += ms;
      const game = window.__ew?.game, previous = game?.presentedWorld;
      for (const fn of frames.splice(0)) fn(now);
      if (game?.presentedWorld !== previous && game?.presentedWorld?.scene === "road") draws.push(game.renderer.info.render.calls);
    }
    return draws;
  };
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

async function driveExit(url, scenario, expectedHeading, viewport = { width: 1280, height: 800 }) {
  const phone = viewport.width !== 1280;
  const measureApproach = scenario === "sightline" || scenario === "ramp";
  const holdModule = scenario === "release" || scenario === "reverse";
  const context = await browser.newContext(phone
    ? { viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport });
  const page = await context.newPage();
  let allowModule, requested = false;
  const released = new Promise((resolve) => { allowModule = resolve; });
  const origin = new URL(url).origin;
  const roadModule = (url) => url.origin === origin && url.pathname.endsWith("/src/game/road/mode.ts");
  try {
    await page.route(roadModule, async (route) => {
      requested = true;
      if (holdModule) await released;
      await route.continue();
    });
    await page.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(installClock);
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const read = () => page.evaluate(() => window.__ew?.road.state());
    const step = async (ms = 50) => {
      const draws = await page.evaluate((ms) => window.__step(1, ms), ms);
      for (const count of draws) assert.ok(count > 0 && count <= (phone ? 26 : 60), `${scenario}: road frame drew ${count} calls`);
    };
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
    const board = async () => {
      if (measureApproach && !puertoColibri) {
        const van = page.locator(".prompt").getByText(/^(Vairuoti|Drive)$/);
        await until(() => van.isVisible(), "the parked van can be driven", 750);
        await (phone ? van.tap() : van.click());
        return;
      }
      await page.evaluate(({ x, z, outward, van }) => {
        const { game } = window.__ew;
        const { rides } = game;
        const ride = van ? rides.list.find((car) => car.kind === "car" && car.model === "van"
          && Math.hypot(car.m.x - van.x, car.m.z - van.z) < 0.1) : rides.find("park");
        if (ride?.kind !== "car") throw new Error("Could not find the town's test car");
        const start = { x: x - Math.sin(outward) * 19, z: z - Math.cos(outward) * 19, rot: outward };
        game.rides.resetPosition(ride, start);
        game.placeOnFoot(start.x - Math.cos(outward) * 2, start.z + Math.sin(outward) * 2, outward);
        if (!game.boardRide(ride)) throw new Error("Could not board the park convertible");
        game.modeHost.snapRide(ride);
      }, { ...before.exit, van: measureApproach ? van : null });
    };
    await Promise.all([
      page.waitForRequest((request) => roadModule(new URL(request.url()))),
      board(),
    ]);
    const aboard = await until(async (state) => requested && state.requested
      && (holdModule || state.ready)
      && await page.evaluate(() => window.__ew.game.rides.phase === "on"), "boards and requests the road");
    assert.equal(aboard.phase, "town");
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    else await page.keyboard.down("ArrowUp");
    if (measureApproach) {
      await until((state) => state.phase === "drive", "enters the desert");
      await page.evaluate(() => {
        window.__ew.game.setJoystick(0, 0);
        window.__ew.road.steer(2);
      });
      if (!phone) await page.keyboard.up("ArrowUp");
      await page.locator(".road-gate").nth(2).waitFor({ state: "attached" });
      await page.evaluate(async () => { await document.fonts.ready; });
      if (scenario === "sightline") await assertOpeningSightline(page, read, step);
      else await assertRampTakeoff(page, read, step);
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
      if (scenario === "release") {
        for (let i = 0; i < 60; i++) await step();
        const stillHeld = await read();
        assert.equal(stillHeld.presented.scene, "town");
        assert.ok(stillHeld.outwardIntent && Math.abs(stillHeld.exitDistance - held.exitDistance) < 0.05);
      }
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

async function assertOpeningSightline(page, read, step) {
  let first, last, frames = 0;
  for (let i = 0; i < 150; i++) {
    await step(50);
    const state = await read();
    assert.equal(state.totalGates, 0, "checks the right lane on a fresh first-gate approach");
    const remaining = state.gateDistance / state.speed;
    if (remaining > 2.2) continue;
    if (remaining < 0.8) break;
    first ??= remaining;
    last = remaining;
    frames++;
    assert.equal(state.lane, 2);
    const intersections = await page.evaluate(() => {
      const { game, road } = window.__ew;
      const { track, view, gate } = game.modes.get("road").mode.run;
      const ray = new game.raycaster.constructor();
      const pieces = [...track.pieces.values()].filter(({ obstacles }) => obstacles.length);
      const kinds = new Set(pieces.flatMap(({ obstacles }) => obstacles.map(({ kind }) => kind)));
      if (kinds.size !== 3) throw new Error("Expected cactus, pole and wire triangles in the opening pieces");
      const meshes = pieces.map(({ mesh }) => mesh);
      const faceZ = road.state().registration.faceSize[2];
      const targets = [view.roof(view.car), ...gate.faces().map(({ world }) => view.camera.position.clone().set(0, 0, faceZ).applyMatrix4(world))];
      return targets.map((target) => {
        const direction = target.clone().sub(view.camera.position);
        ray.far = direction.length();
        ray.set(view.camera.position, direction.normalize());
        return ray.intersectObjects(meshes, false).flatMap((hit) => {
          const piece = pieces.find(({ mesh }) => mesh === hit.object);
          const vertex = hit.faceIndex * 3;
          return piece.obstacles.filter(({ start, end }) => vertex >= start && vertex < end).map(({ kind }) => kind);
        });
      });
    });
    assert.deepEqual(intersections, [[], [], [], []], `roof and words must be clear at ${remaining.toFixed(3)}s`);
  }
  assert.ok(first >= 2.1 && last <= 0.9 && frames >= 24, `sightline window sampled from ${first} to ${last}s over ${frames} frames`);
}

async function assertRampTakeoff(page, read, step) {
  const ms = 1000 / 120, registration = new BoardRegistration("road", ms, 60);
  const trace = [];
  for (let i = 0; i < 600; i++) {
    await step(ms);
    const state = await read();
    assert.equal(state.totalGates, 0, "measures the opening ramp before gate one");
    if (state.gateDistance > 70) continue;
    const frame = await sampleBoardRegistration(page, "road");
    registration.record(frame);
    if (state.roadPosition >= 38.5) {
      const centers = frame.samples.filter(({ name }) => name === "center").map(({ projected }) => projected);
      assert.equal(centers.length, 3, "all three board centers stay visible at takeoff");
      trace.push({ s: state.roadPosition, lift: state.liftHeight, centers });
    }
    if (state.roadPosition >= 52) break;
  }
  registration.verify();
  assert.ok(trace[0].s < 39.5 && trace.at(-1).s >= 52, "traces the wedge from toe past the airborne peak");
  assert.ok(Math.max(...trace.map(({ lift }) => lift)) > 0.75, "the van launches off the lip");
  for (let i = 1; i < trace.length; i++) {
    const { s, lift, centers } = trace[i], last = trace[i - 1];
    assert.ok(Math.abs(lift - last.lift) < 0.06, `lift stepped from ${last.lift} to ${lift} at ${s}m`);
    if (i < 2) continue;
    for (let lane = 0; lane < 3; lane++) {
      const delta = Math.hypot(...centers[lane].map((n, c) => n - 2 * last.centers[lane][c] + trace[i - 2].centers[lane][c]));
      assert.ok(delta <= 1, `board ${lane} moved ${delta.toFixed(3)} CSS px at ${s}m`);
    }
  }
}

try {
  const heights = process.env.WORLD_PHONE_HEIGHT ? [Number(process.env.WORLD_PHONE_HEIGHT)] : [844, 664];
  for (const [width, height] of [[1280, 800], ...heights.map((h) => [390, h]), [844, 390]]) {
    const phone = width !== 1280, sideways = width > height && phone;
    const label = sideways ? "landscape" : phone ? (height === 844 ? "phone" : `phone-${height}`) : "computer";
    const maxRoadCalls = phone ? 26 : 60;
    const context = await browser.newContext(phone
      ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width, height } });
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
    const rawStep = async (frames = 1) => {
      const draws = await page.evaluate(([n, ms]) => window.__step(n, ms), [frames, milliseconds]);
      for (const count of draws) assert.ok(count > 0 && count <= maxRoadCalls, `${label}: road frame drew ${count} calls`);
    };
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
    const helper = await page.evaluate(() => document.documentElement.lang);
    const ui = (lt, en) => helper === "en" ? en : lt;
    const hornLabel = ui("Signalas", "Horn");
    const sign = puertoColibri ? "Carretera del Desierto" : "Desert Road";
    assert.equal(await page.evaluate((name) => {
      let found = false;
      window.__ew.game.town.group.traverse((node) => { found ||= node.material?.map?.name === name; });
      return found;
    }, sign), true);
    // Keep the shipped clip manifest and selection logic. Silence recorded clips and speech fallback alike.
    await page.evaluate(() => {
      window.__roadAudio = [];
      window.__roadSfx = [];
      const sfx = window.__ew.audio.sfx.bind(window.__ew.audio);
      window.__ew.audio.sfx = (name) => { window.__roadSfx.push(name); sfx(name); };
      window.__ew.audio.play = async (voice, speed, text) => { window.__roadAudio.push({ voice, speed, text }); return true; };
    });
    const parked = page.locator(".prompt").getByText(ui("Vairuoti", "Drive"), { exact: true });
    await waitFor(() => parked.isVisible(), "the west-facing van can be driven");
    const town = await read();
    assert.equal(town.phase, "town");
    assert.ok(town.drawCalls > 0 && town.fps > 0);
    assert.deepEqual(modelRequests, []);
    assert.deepEqual(roadRequests, [], "the desert chunk stays unloaded in town");
    const keys = await page.evaluate((van) => {
      const { game, store } = window.__ew;
      const mesh = game.rides.group.getObjectByName("parked-car-keys");
      const player = game.player.root.position, saved = player.clone();
      const marker = () => {
        const matrix = mesh.instanceMatrix.array;
        for (let i = 0; i < mesh.count; i++) {
          const j = i * 16;
          if (Math.abs(matrix[j + 12] - van.x) < 0.15 && Math.abs(matrix[j + 14] - van.z) < 0.15) {
            return player.clone().set(matrix[j + 12], matrix[j + 13], matrix[j + 14]);
          }
        }
      };
      const aboveVan = marker();
      const screen = aboveVan?.clone().project(game.rig.cam);
      player.set(van.x + 14.8, saved.y, van.z);
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
    }, van);
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
    if (phone) await press(page.getByRole("button", { name: hornLabel, exact: true }));
    else await page.keyboard.press("h");
    await page.evaluate(() => window.__roadRestoreRandom());
    await waitFor(() => page.evaluate(() => window.__roadSfx.includes("hornReply")), "nearby town traffic replies to the horn");
    await page.evaluate(() => window.__roadRestoreTraffic());
    if (puertoColibri) {
      // Stage the boarded van on the inland stretch so the test drives through the exit with normal controls.
      await page.evaluate(() => {
        const { game } = window.__ew;
        game.rides.resetPosition(game.rides.riding, { x: -1.65, z: 53, rot: 0 });
      });
      await step(24);
    }
    await waitFor(async () => (await read()).ready, "road meshes and shaders are ready before the warm approach", 150, 1);
    const atRest = await page.evaluate(() => window.__ew.game.rig.cam.fov);
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 1));
    else await page.keyboard.down("ArrowUp");
    await waitFor(() => page.evaluate((initialFov) => {
      const { game } = window.__ew;
      const m = game.rides.riding.m;
      return m.pace > m.spec.max * 0.86 && game.rig.cam.fov > initialFov + 1.5;
    }, atRest), "the town camera widens at top speed");
    await waitFor(async () => {
      const { exitDistance, townCar, phase } = await read();
      return phase === "town" && exitDistance > -townCar.speed * 0.5 - 2.5;
    }, "approaches the actual signed exit", 240, 1);
    // A boost changes the time remaining, so sample layout and distance from the same draw.
    const measureGates = ({ minFont, minWidth }) => {
      const header = document.querySelector(".road-header")?.getBoundingClientRect();
      if (!header) return [];
      const controls = [...document.querySelectorAll(".road-mode .joy, .road-mode .brake-btn, .road-mode .drive-horn, .road-controls")]
        .map((element) => element.getBoundingClientRect());
      const gates = [...document.querySelectorAll(".road-gate")];
      return gates.map((gate, lane) => {
        const r = gate.getBoundingClientRect();
        const probe = (key) => gate.querySelector(`[data-face-probe="${key}"]`).getBoundingClientRect();
        const mid = probe("center"), em = probe("em"), font = Math.hypot(mid.x - em.x, mid.y - em.y);
        const lines = [...gate.querySelectorAll(":scope > span")];
        const name = gate.getAttribute("aria-label");
        const wholeWords = lines.map((line) => line.textContent).join(" ") === name
          && document.fonts.check("800 32px Nunito", name)
          && lines.every((line) => {
            const range = document.createRange();
            range.selectNodeContents(line);
            const word = range.getBoundingClientRect();
            return getComputedStyle(line).whiteSpace === "nowrap" && word.left >= r.left - 0.5 && word.right <= r.right + 0.5;
          });
        const separated = lane === 0 || r.left > gates[lane - 1].getBoundingClientRect().right;
        const visible = getComputedStyle(gate).visibility === "visible" && Number(getComputedStyle(gate).opacity) > 0;
        return visible && wholeWords && separated && r.left >= 0 && r.right <= innerWidth && r.top > header.bottom
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
    const settle = [];
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
    for (let frame = 0; frame < 360; frame++) {
      await step(1);
      const state = await read();
      if (!first || last.elapsed < 3) await assertWorldFrame(page, last, state, maxRoadCalls, label, shots);
      if (state.phase === "drive") {
        sampleHazards(state);
        if (!first) {
          first = state;
          milliseconds = 1000 / 60;
          await shot("first-road");
          if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
          else await page.keyboard.up("ArrowUp");
          await labels.nth(2).waitFor({ state: "attached" });
          await page.evaluate(async () => { await document.fonts.ready; });
          cone = state.hazards.find(({ kind, s }) => kind === "cone" && s === 13);
          assert.ok(cone);
          await page.evaluate((lane) => window.__ew.road.steer(lane), cone.lane);
        } else assert.ok(state.roadPosition > last.roadPosition, "the warm handoff advances on every road frame");
        if (milliseconds === 1000 / 60) {
          settle.push(state);
          if (state.elapsed >= 1.6 - 1e-8) {
            assertCameraSettle(settle);
            milliseconds = 50;
          }
        }
        if (state.gateDistance <= 70) registration ??= new BoardRegistration("road", "16.7/50", maxRoadCalls);
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
    assert.equal(await page.locator(".road-gates").getAttribute("lang"), helper);
    assert.equal(road.totalGates, 0, "the first prompt is still available to replay");
    if (phone) {
      const horn = page.getByRole("button", { name: hornLabel, exact: true });
      assert.equal(await horn.count(), 1);
      assert.equal(await page.locator(".road-mode .drive-horn").count(), 1);
      assert.equal(await page.locator(".road-mode .road-header").getByRole("button", { name: hornLabel }).count(), 0);
      const drift = await page.getByRole("button", { name: ui("Driftas", "Drift") }).boundingBox(), honk = await horn.boundingBox();
      assert.ok(drift && honk && honk.x + honk.width < drift.x && Math.abs(honk.y + honk.height / 2 - drift.y - drift.height / 2) < 10);
      const beeps = await page.evaluate(() => window.__roadSfx.filter((sound) => sound === "horn").length);
      await press(horn);
      assert.equal(await page.evaluate(() => window.__roadSfx.filter((sound) => sound === "horn").length), beeps + 1);
    }
    const replay = page.locator(".road-cue").getByRole("button", { name: ui("Klausyti dar kartą", "Listen again") });
    const beforeReplay = await page.evaluate(() => window.__roadAudio.length);
    await press(replay);
    await page.evaluate(async () => { await document.fonts.ready; });
    assert.equal(await page.locator(".road-dash h1").count(), 1);
    assert.equal(await page.locator(".road-dash .road-meters > span").count(), 2);

    assert.equal(await page.evaluate(() => window.__roadAudio.length), beforeReplay + 1, "replays the first prompt");
    // Substitute a fresh prompt object so the fixed layout is typeset for the sample words.
    const checkOptions = async (samples) => {
      const captured = registration;
      registration = undefined;
      try {
        await page.evaluate(async (options) => {
          await document.fonts.load("800 32px Nunito", options.join(" "));
          window.__ew.road.previewOptions(options);
        }, samples);
        await waitFor(async () => {
          const rows = await page.evaluate(measureGates, { minFont: 0, minWidth: 0 });
          return rows.length === 3 && rows.every(Boolean);
        }, "long labels and accents fit the boards", 5, 1);
        assert.deepEqual(await labels.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))), samples);
      } finally {
        await page.evaluate(() => window.__ew.road.previewOptions());
        await step(1);
        registration = captured;
        registration?.previous.clear();
        if (registration) registration.serial = undefined;
      }
    };

    if (puertoColibri) await checkOptions(helper === "en"
      ? ["business meeting", "boarding pass", "lost luggage"]
      : ["kelionės tikslas", "darbo reikalai", "laba diena"]);

    const steerForGate = (number) => page.evaluate((number) => {
      const { road } = window.__ew;
      const { totalGates, right } = road.state();
      if (totalGates !== number - 1 || right === undefined) throw new Error(`Gate ${number} is no longer available to steer through`);
      road.steer(right);
    }, number);
    const waitForGate = (number, distance = Infinity) => waitFor(async () => {
      const state = await read();
      assert.ok(state.totalGates < number, `${label}: passed gate ${number} while waiting for its approach`);
      return state.totalGates === number - 1 && state.gates?.length === 3 && state.gateDistance <= distance;
    }, `approaches gate ${number}`, 250, distance === Infinity ? 4 : 1);

    // Keep the usual simulation budget while sampling every frame for the brief pass animation.
    const waitForGatePass = (total, description) =>
      waitFor(async () => (await read()).totalGates === total, description, 150 * 5, 1);
    const checkPassState = async () => {
      const state = await read();
      assert.equal(state.gates, undefined);
      assert.equal(await replay.count(), 0);
      assert.ok(state.drawCalls <= maxRoadCalls);
    };
    const rightLane = (await read()).right;
    assert.deepEqual(await labels.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))), (await read()).gates);
    await page.evaluate((lane) => window.__ew.road.steer(lane), rightLane);
    await waitForGatePass(1, "passes the correct gate");
    const hit = await read();
    assert.equal(hit.lane, rightLane);
    assert.equal(hit.rightGates, 1);
    assert.equal(hit.streak, 1);
    assert.equal(await page.getByText(ui("Teisingai!", "Right!"), { exact: true }).count(), 1);
    const rightBadge = page.locator('.road-feedback .kit-feedback[data-feedback="right"]');
    assert.equal(await rightBadge.locator('svg[width="16"]').count(), 1);
    assert.equal(await rightBadge.evaluate((el) => getComputedStyle(el).backgroundColor), "rgb(229, 243, 232)");
    assert.ok(hit.boost > 0);
    await waitFor(async () => await labels.count() === 2, "the tick replaces the selected label", 4, 1);
    assert.equal(await page.locator(`.road-gate[data-lane="${rightLane}"]`).count(), 0);
    await checkPassState();
    await shot("gate-right");
    await step(8);
    registration.verify();
    registration = undefined;
    await waitForGate(2, 70);
    milliseconds = 1000 / 120;
    registration = new BoardRegistration("road", milliseconds, maxRoadCalls);
    const { right: nextRightLane, gates: options } = await read();
    const wrongLane = (nextRightLane + 1) % 3;
    const wrongWord = options[wrongLane];
    await page.evaluate((lane) => window.__ew.road.steer(lane), wrongLane);
    await waitForGatePass(2, "passes the wrong gate");
    const miss = await read();
    assert.equal(miss.lane, wrongLane);
    assert.equal(miss.rightGates, 1);
    assert.equal(miss.streak, 0);
    const wrongCopy = ui("Ne visai. Teisingai:", "Not quite. It's:");
    assert.equal(await page.getByText(wrongCopy, { exact: true }).count(), 1);
    const retryBadge = page.locator('.road-feedback .kit-feedback[data-feedback="retry"]');
    assert.equal(await retryBadge.locator('svg[width="16"]').count(), 1);
    assert.equal(await retryBadge.evaluate((el) => getComputedStyle(el).color), "rgb(121, 71, 17)");
    assert.equal(await page.locator(".road-feedback.wrong span[lang]").count(), 1);
    assert.ok(miss.wobble > 0);
    assert.ok((await page.locator(".road-feedback.wrong").innerText()).trim().length > wrongCopy.length);
    await waitFor(() => labels.evaluateAll((boards, { lane, word }) => {
      if (boards.length !== 3) return false;
      const chosen = boards.find((board) => Number(board.dataset.lane) === lane);
      if (!chosen || chosen.getAttribute("aria-label") !== word) return false;
      const text = Array.from(chosen.querySelectorAll(":scope > span"), (line) => line.textContent).join(" ");
      const bounds = chosen.getBoundingClientRect();
      const style = getComputedStyle(chosen);
      const opacity = Number(style.opacity);
      const visible = style.visibility === "visible" && bounds.width > 0 && bounds.height > 0
        && bounds.right > 0 && bounds.left < innerWidth && bounds.bottom > 0 && bounds.top < innerHeight;
      const dimmed = opacity > 0 && boards.every((board) => board === chosen || Number(getComputedStyle(board).opacity) > opacity);
      return text === word && visible && dimmed && Math.abs(new DOMMatrixReadOnly(style.transform).b) > 0.001;
    }, { lane: wrongLane, word: wrongWord }), "the chosen word stays visible on the dimmed, tilted board", 4, 1);
    await checkPassState();
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
    assert.equal(await page.getByText(ui("Kurio žodžio trūksta?", "Which word is missing?"), { exact: true }).count(), 1);
    assert.match(await page.locator(".road-gap").innerText(), /____/);
    assert.equal(await page.locator(".road-gates").getAttribute("lang"), puertoColibri ? "es" : "en");
    assert.deepEqual(await labels.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label"))), (await read()).gates);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await shot("gap");
    if (puertoColibri) await checkOptions(["reunión", "mañana", "conferencia"]);

    await page.evaluate(() => window.__ew.road.jumpTimer(149.8));
    const result = page.getByRole("dialog", { name: ui("Važiavimas baigtas", "Drive over") });
    const back = result.getByRole("button", { name: ui("Atgal į miestą", "Back to town") });
    await waitFor(() => result.isVisible(), "shows the ScoreCard at 150 seconds");
    assert.equal((await read()).elapsed, 150);
    assert.equal((await read()).result.right, 6);
    assert.equal((await read()).result.total, 7);
    assert.equal((await read()).result.missed.length, 1);
    assert.deepEqual(await result.locator(".mode-score-number").evaluate((number) => ({
      value: Number(number.textContent),
      animated: getComputedStyle(number).animationName,
    })), { value: (await read()).result.points, animated: "none" });
    assert.equal(await result.getByRole("button", { name: ui("Nuvesk mane", "Take me there") }).count(), 1);
    assert.match(await result.locator("dd").nth(2).innerText(), helper === "en" ? /^\d+\.\d km$/ : /^\d+,\d km$/);
    const best = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), ghostKey);
    assert.equal(best.points, (await read()).result.points);
    assert.ok(best.frames.length > 1);
    await shot("result");
    await press(result.getByRole("button", { name: ui("Dar kartą", "Try again") }));
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
    await press(back);
    await waitFor(async () => (await read()).phase === "town", "returns to town");
    assert.equal(await page.evaluate(({ id, puertoColibri }) => {
      const ride = window.__ew.game.rides.riding;
      return ride?.id === id && (puertoColibri ? ride.m.z >= 78 && ride.m.z < 90 && Math.cos(ride.m.heading) < -0.99
        : ride.m.x > -110 && ride.m.x < -94 && Math.sin(ride.m.heading) > 0.99);
    }, { id: carId, puertoColibri }), true, "the same car faces into town");

    await page.evaluate(() => window.__ew.game.interact());
    await waitFor(() => page.evaluate(() => !window.__ew.game.rides.riding), "gets out of the parked car");
    await page.evaluate((puertoColibri) => {
      const { game } = window.__ew;
      if (puertoColibri) game.placeOnFoot(0, 91.6, 0);
      else game.placeOnFoot(-109.4, -15.6, -Math.PI / 2);
      game.setJoystick(0, 1);
    }, puertoColibri);
    const yes = page.locator('.road-choice[data-line="rd_a_yes"]');
    // (the driver at the wheel under the taxi's roof is out of sight; standing beside it, in sight; beside the learner
    // on the road, under the roof again)
    const liftDriver = () => page.evaluate(() => window.__ew.game.modes.get("road").mode?.lift?.driver.root.visible);
    await waitFor(async () => (await read()).phase === "approach", "walking to the boundary calls the taxi", 750, 1);
    assert.equal(await liftDriver(), false, "the taxi driver drives up out of sight under the taxi's roof");
    await waitFor(() => yes.isVisible(), "walking to the boundary summons the taxi driver's lift");
    assert.equal(await liftDriver(), true, "the taxi driver stands beside the taxi, in sight");
    await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    const liftLine = puertoColibri ? "¿Le doy un aventón? Súbase, ¡hoy maneja usted!" : "Need a lift? Hop in, you drive!";
    assert.ok(await page.evaluate((line) => window.__roadAudio.some(({ text }) => text === line), liftLine));
    assert.equal(await yes.locator("span").innerText(), puertoColibri ? "¡Sí, gracias!" : "Sure, thanks!");
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
    }, "accepts the lift and starts driving the taxi");
    assert.equal(await liftDriver(), false, "the taxi driver rides beside the learner out of sight under the taxi's roof");
    await waitFor(() => page.getByText(ui("Geriausias važiavimas", "Best run"), { exact: true }).isVisible(), "the best run is available as a ghost");
    await page.evaluate(() => window.__ew.road.jumpTimer());
    await waitFor(() => result.isVisible(), "shows the taxi run's result");
    await waitFor(() => page.locator('[data-line="rd_end"]').isVisible(), "the driver's ending line is shown with the score");
    const endLine = puertoColibri ? "¡Muy bien manejado! Ya regresamos al pueblo." : "Nice drive! Let's head back to town.";
    assert.ok(await page.evaluate((line) => window.__roadAudio.some(({ text }) => text === line), endLine));
    await press(back);
    await waitFor(async () => (await read()).phase === "town", "the lift taxi returns to town");
    assert.deepEqual(errors, []);
    await context.close();
    console.log(`Road passed on ${label}, town/road draw calls ${town.drawCalls}/${road.drawCalls}`);
  }
  const outward = puertoColibri ? 0 : -Math.PI / 2;
  await driveExit(base, "release", outward);
  await driveExit(base, "reverse", outward);
  await driveExit(base, "sightline", outward, { width: 390, height: 844 });
  await driveExit(base, "sightline", outward, { width: 844, height: 390 });
  await driveExit(base, "ramp", outward);
} finally {
  await browser.close();
}
