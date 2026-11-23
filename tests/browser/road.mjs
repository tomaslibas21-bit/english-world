// Run against the town build. Like taxi.mjs, this advances the simulation in 50 ms steps.
// WORLD_PHONE_HEIGHT=664 checks the smaller portrait viewport. WORLD_SHOTS=<folder> saves screenshots.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

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
  for (const phone of [false, true]) {
    const label = phone ? "phone" : "computer";
    const maxRoadCalls = phone ? 26 : 60;
    const context = await browser.newContext(phone
      ? { viewport: { width: 390, height: Number(process.env.WORLD_PHONE_HEIGHT || 844) }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [], modelRequests = [], roadRequests = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("request", (req) => {
      const path = new URL(req.url()).pathname;
      if (/\/models\/cars\/cone(?:-flat)?\.glb$/.test(path)) modelRequests.push(path);
      // Source modules in Vite dev and the corresponding lazy entries in the production build.
      if (/\/src\/(?:game\/road\/(?!entry\.ts$)[^/]+\.ts|ui\/Road\.tsx)$/.test(path)
        || /\/assets\/(?:mode|Road)-[\w-]+\.js$/.test(path)) roadRequests.push(path);
    });
    await page.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [`${storage}-progress-v1`, JSON.stringify(progress)]);
    await page.addInitScript(installClock);
    await page.goto(base, { waitUntil: "domcontentloaded" });

    const read = () => page.evaluate(() => window.__ew?.road.state());
    const step = (frames) => page.evaluate((n) => window.__step(n), frames);
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
    assert.deepEqual(roadRequests, [], "the desert chunk stays unloaded during town driving");
    await waitFor(async () => (await read()).phase === "drive", "drives out the west end of Main Street", 240);
    if (phone) await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    else await page.keyboard.up("ArrowUp");

    const labels = page.locator(".road-gate");
    await waitFor(async () => (await labels.count()) === 3 && modelRequests.length >= 2 && roadRequests.length > 0, "the gates, road code and both cones load");
    const road = await read();
    assert.equal(road.car, carId);
    assert.equal(road.model, "van");
    assert.ok(road.drawCalls <= maxRoadCalls && road.fps > 0, `draw calls ${road.drawCalls}, FPS ${road.fps}`);
    assert.equal(road.gates.length, 3);
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
    await press(replay);
    await page.evaluate(async () => { await document.fonts.ready; });
    // Use a single simulation window for the approach and the layout check. A boost can drop
    // the estimated time to the gate suddenly, including between a frame and its HTML label update.
    let layout, seen = [];
    await waitFor(async () => {
      layout = await page.evaluate(async ({ minFont, minWidth }) => {
        const { gateDistance, speed, totalGates } = window.__ew.road.state();
        if (totalGates !== 0 || !(gateDistance / speed <= 2.2 && gateDistance / speed >= 1.85)) return [];
        // game time is frozen between steps; give the page real time to paint the gate labels first
        await new Promise((resolve) => setTimeout(resolve, 80));
        const header = document.querySelector(".road-header").getBoundingClientRect();
        const controls = [...document.querySelectorAll(".road-mode .joy, .road-mode .brake-btn, .road-mode .drive-horn")]
          .map((element) => element.getBoundingClientRect());
        const gates = [...document.querySelectorAll(".road-gate")];
        return gates.map((gate, lane) => {
          const r = gate.getBoundingClientRect();
          const lines = [...gate.children];
          const wholeWords = lines.map((line) => line.textContent).join(" ") === gate.getAttribute("aria-label")
            && lines.every((line) => getComputedStyle(line).whiteSpace === "nowrap" && line.scrollWidth <= line.clientWidth + 1);
          const separated = lane === 0 || r.left > gates[lane - 1].getBoundingClientRect().right;
          return wholeWords && separated && r.left >= 0 && r.right <= innerWidth && r.top > header.bottom
            && r.width >= minWidth && parseFloat(getComputedStyle(gate).fontSize) >= minFont && r.bottom < innerHeight
            && controls.every((c) => r.bottom < c.top || r.right < c.left || r.left > c.right);
        });
      }, phone ? { minFont: 15, minWidth: 88 } : { minFont: 18, minWidth: 110 });
      if (layout.length) seen = layout;
      return layout.length === 3 && layout.every(Boolean);
    }, "the banner text fits whole words and clears the controls on the first gate approach", 120, 1).catch((error) => {
      throw new Error(`${error.message} — last measured: ${JSON.stringify(seen)}`);
    });
    assert.deepEqual(layout, [true, true, true]);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await shot("gates");

    await page.evaluate(() => window.__ew.road.steer(window.__ew.road.state().right));
    await waitFor(async () => (await read()).rightGates === 1, "passes the correct gate");
    assert.equal((await read()).streak, 1);
    assert.equal(await page.getByText("Teisingai!", { exact: true }).count(), 1);
    assert.ok((await read()).boost > 0);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await shot("gate-right");
    await waitFor(async () => (await read()).gates?.length === 3, "next three choices appear");
    await page.evaluate(() => {
      const { road } = window.__ew;
      road.steer((road.state().right + 1) % 3);
    });
    await waitFor(async () => (await read()).totalGates === 2, "passes the wrong gate");
    assert.equal((await read()).streak, 0);
    assert.equal(await page.getByText("Ne visai. Teisingai:", { exact: true }).count(), 1);
    assert.ok((await read()).wobble > 0);
    assert.ok((await page.locator(".road-feedback.wrong").innerText()).trim().length > "Ne visai. Teisingai:".length);
    assert.ok((await read()).drawCalls <= maxRoadCalls);
    await shot("gate-wrong");

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
    await waitFor(async () => (await read()).liftHeight > 0.75, "drives up a ramp and leaves the ground", 200, 3);
    const jump = await read();
    assert.ok(jump.drawCalls <= maxRoadCalls);
    assert.ok(inFrame(jump.carFrame), `the whole car stays on screen during the jump: ${JSON.stringify(jump.carFrame)}`);
    await shot("jump");

    for (let gate = 3; gate <= 7; gate++) {
      await waitFor(async () => (await read()).gates?.length === 3, `gate ${gate} appears`, 120, 8);
      await page.evaluate(() => window.__ew.road.steer(window.__ew.road.state().right));
      await waitFor(async () => (await read()).totalGates === gate, `passes gate ${gate}`, 120, 8);
    }
    await waitFor(async () => {
      const state = await read();
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
    assert.equal(await result.getByRole("button", { name: "Nuvesk mane" }).count(), 1);
    await shot("result");
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
} finally {
  await browser.close();
}
