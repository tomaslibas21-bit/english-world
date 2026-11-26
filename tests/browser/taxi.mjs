// A full taxi ride with the game clock stepped by hand. Steering uses the player's joystick input and the real
// car physics and route checks. WORLD_SHOTS=<folder> writes the stand, cue, recovery, stop and score screenshots.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.WORLD_SHOTS || "";
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
      const game = window.__ew?.game;
      if (game?.modes.engaged && (game.rig.standView || game.taxiStandFrame())) {
        throw new Error(`stand framing during ${game.modes.get("taxi")?.run?.phase ?? "pending launch"}`);
      }
    }
  };

  class Recognition {
    start() { Recognition.live = this; setTimeout(() => this.onstart?.(), 5); }
    abort() { if (Recognition.live === this) Recognition.live = null; setTimeout(() => this.onend?.(), 0); }
    stop() { this.abort(); }
  }
  window.SpeechRecognition = Recognition;
  window.__listening = () => !!Recognition.live;
  window.__speak = (text) => {
    const recognition = Recognition.live;
    if (!recognition?.onresult) return false;
    recognition.onspeechstart?.();
    recognition.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
    recognition.onspeechend?.();
    return true;
  };
}

function installSteering({ wrong = false, fromStand = false }) {
  const game = window.__ew.game, { car, route } = game.modes.get("taxi");
  const decisions = route.decisions;
  const routePoints = decisions.flatMap(({ at, via }) => [...via, at]);
  const start = { x: car.m.x, z: car.m.z };
  const points = wrong
    ? [start, ...decisions[0].via, decisions[0].at, { x: decisions[0].at.x, z: -40 }]
    : [start, ...routePoints.slice(fromStand ? 0 : decisions[0].via.length)];

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
  const stand = game.town.parkedCars;
  const spot = stand.placements.find(({ model }) => model === "taxi");
  const { m, mesh } = mode.car;
  const sameHeading = Math.cos(m.heading - spot.rot) > 0.999;
  return mesh === stand.taxi.root && Math.hypot(m.x - spot.x, m.z - spot.z) < 0.01 && sameHeading
    && Math.hypot(mesh.position.x - spot.x, mesh.position.z - spot.z) < 0.01
    && (routeId ? game.rides.riding === mode.car && mode.route?.id === routeId : !game.rides.riding);
}

async function taxiStandView() {
  const game = window.__ew.game, camera = game.rig.cam, ray = game.raycaster;
  const { CUT } = await import("/src/game/cutout.ts");
  const { carModelEntry } = await import("/src/game/world/carModels.ts");
  const { width, length, height } = carModelEntry("taxi").collisionBox;
  camera.updateMatrixWorld();
  const root = game.town.parkedCars.taxi.root;
  const taxiPoint = (x, y, z) => root.localToWorld(root.position.clone().set(x, y, z));
  const inFrame = (p) => p.clone().project(camera).toArray().every((coordinate) => Math.abs(coordinate) < 1);
  const learner = game.player.root.position;
  const vinnie = game.npcs.find(({ id, ch }) => id === "vinnie" && ch.root.visible)?.ch;
  const points = {
    "taxi roof": taxiPoint(0, height, 0),
    "taxi centre": taxiPoint(0, height / 2, 0),
    "taxi front": taxiPoint(0, height / 2, length / 2),
    "taxi rear": taxiPoint(0, height / 2, -length / 2),
    "learner chest": learner.clone().setY(learner.y + 1.35),
  };
  if (vinnie) points.Vinnie = vinnie.root.position.clone().setY(vinnie.root.position.y + 1.65);
  const roof = game.town.group.getObjectByName("gas-canopy-assembly").children;
  const projectedBox = (points) => {
    const projected = points.map((point) => point.clone().project(camera));
    return {
      x0: Math.min(...projected.map(({ x }) => x)), x1: Math.max(...projected.map(({ x }) => x)),
      y0: Math.min(...projected.map(({ y }) => y)), y1: Math.max(...projected.map(({ y }) => y)),
    };
  };
  const personBox = (position, height) => {
    const corners = [];
    for (const x of [-0.45, 0.45]) for (const z of [-0.45, 0.45]) for (const y of [0, height])
      corners.push(position.clone().add(position.clone().set(x, y, z)));
    return projectedBox(corners);
  };
  const clipped = Object.entries(points).filter(([, point]) => !inFrame(point)).map(([name]) => name);
  const taxiCorners = [];
  for (const x of [-width / 2, width / 2]) for (const z of [-length / 2, length / 2]) {
    for (const y of [0, height]) {
      const corner = taxiPoint(x, y, z);
      taxiCorners.push(corner);
      if (!inFrame(corner)) clipped.push("taxi corner");
    }
  }
  const taxiBox = projectedBox(taxiCorners);
  const people = [personBox(learner, Math.max(game.player.height, 1.95))];
  if (vinnie) people.push(personBox(vinnie.root.position, Math.max(vinnie.height, 1.95)));
  const taxiArea = (taxiBox.x1 - taxiBox.x0) * (taxiBox.y1 - taxiBox.y0);
  const overlap = people.map((box) => Math.max(0, Math.min(box.x1, taxiBox.x1) - Math.max(box.x0, taxiBox.x0))
    * Math.max(0, Math.min(box.y1, taxiBox.y1) - Math.max(box.y0, taxiBox.y0)) / taxiArea);
  const taxiWidth = (taxiBox.x1 - taxiBox.x0) / 2;
  const ground = (Math.min(taxiBox.y0, ...people.map(({ y0 }) => y0)) + 1) / 2;
  if (!inFrame(learner) || !inFrame(learner.clone().setY(learner.y + game.player.height))) clipped.push("learner");
  const blocked = [];
  for (const [name, target] of Object.entries(points)) {
    const direction = target.clone().sub(camera.position);
    const depth = direction.length();
    ray.set(camera.position, direction.normalize());
    const hit = ray.intersectObjects(roof, false).find((hit) => hit.distance < depth);
    if (hit) blocked.push({ name, at: hit.point.toArray() });
    if (name.startsWith("taxi")) {
      const townHit = ray.intersectObject(game.town.group, true).find((hit) => {
        let object = hit.object;
        while (object && object !== root) object = object.parent;
        return object !== root && hit.distance < depth - 0.01;
      });
      if (townHit) blocked.push({ name, mesh: townHit.object.name, at: townHit.point.toArray() });
    }
  }
  const tube = points["learner chest"].clone().sub(camera.position);
  const tubeStart = camera.position.clone().addScaledVector(tube, 0.03);
  const tubeLength = tube.length() * 0.87;
  ray.set(tubeStart, tube.normalize());
  const cutout = roof.filter((mesh) => {
    mesh.geometry.computeBoundingBox();
    const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).expandByScalar(CUT.r.value);
    const hit = ray.ray.intersectBox(bounds, tube.clone());
    return hit && hit.distanceTo(tubeStart) < tubeLength;
  }).map((mesh) => mesh.name);
  const direction = camera.getWorldDirection(learner.clone());
  const pitch = Math.asin(-direction.y) * 180 / Math.PI;
  return { clipped, blocked, cutout, taxiWidth, overlap, ground, pitch };
}

async function checkSightlines(page, moment) {
  const view = await page.evaluate(() => {
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
  });
  assert(view.active && view.rays >= 4 && view.rays <= 20 && view.rays % 4 === 0,
    `${moment} uses a taxi shot selected with at most 20 rays: ${JSON.stringify(view)}`);
  assert.equal(view.points.length, 4);
  assert(view.points.every(({ clear, visible }) => clear && visible),
    `${moment}: roof, rear corners and road are visible: ${JSON.stringify(view)}`);
}

async function checkNoRideHints(page, where) {
  const visible = await page.locator(".toast:visible").evaluateAll((toasts) => toasts
    .filter((toast) => toast.hasAttribute("data-ride-hint") || toast.querySelector(".t-text b")?.textContent === "Kelias užimtas")
    .map((toast) => toast.textContent));
  assert.deepEqual(visible, [], `no ride hint is visible ${where}`);
  const queued = await page.evaluate(() => {
    const { toasts, townToasts } = window.__ew.store.getState();
    return [...toasts, ...townToasts.map(({ toast }) => toast)]
      .filter((toast) => toast.rideHint || toast.title === "Kelias užimtas").map(({ title }) => title);
  });
  assert.deepEqual(queued, [], `no ride hint is stored ${where}`);
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

try {
  for (const label of ["phone", "computer", "sideways-phone"]) {
    const phone = label !== "computer", sideways = label === "sideways-phone";
    const context = await browser.newContext(phone
      ? { viewport: sideways ? { width: 844, height: 390 } : { width: 390, height: Number(process.env.WORLD_PHONE_HEIGHT || 844) },
        deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "" }));
    await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [`${storage}-progress-v1`, JSON.stringify(progress)]);
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
        const game = window.__ew?.game, mode = game?.modes.get("taxi");
        const m = mode?.car.m;
        return { phase: mode?.run?.phase, index: mode?.run?.index, x: m?.x, z: m?.z, heading: m?.heading, pace: m?.pace,
          crashes: mode?.run?.crashes, nearTime: mode?.run?.nearTime, help: mode?.run?.help,
          time: game?.t, transitioning: game?.transitioning, boarding: game?.rides.phase,
          framingStand: !!game?.rig.standView, standEligible: !!game?.taxiStandFrame(), history: window.__taxiLines };
      });
      assert.fail(`${label}: ${description}: ${JSON.stringify(state)}`);
    };
    const shot = async (name, frames = 2) => {
      if (!shots) return;
      if (frames) await step(frames);
      await real(320);
      await page.screenshot({ path: `${shots}/${label}-${name}.png` });
    };
    const checkStandView = async (moment, frames = 30) => {
      await step(frames);
      const view = await page.evaluate(taxiStandView);
      assert(!view.clipped.length && !view.blocked.length && !view.cutout.length, `${label} ${moment}: ${JSON.stringify(view)}`);
      assert(view.overlap.every((area) => area < 0.2) && view.ground < 0.28,
        `${label} ${moment} keeps people beside the cab and limits empty ground: ${JSON.stringify(view)}`);
      if (label === "computer") assert(view.taxiWidth >= 0.22 && view.pitch <= 40,
        `taxi fills a three-quarter computer view: ${JSON.stringify(view)}`);
    };
    const checkMapDrop = async () => {
      await waitFor(() => page.evaluate(() => !window.__ew.game.transitioning), "town transition finishes");
      await page.evaluate(() => window.__ew.game.teleportTo("taxi-stand"));
      await waitFor(async () => {
        await real(15);
        return page.evaluate(() => {
          const { player, transitioning } = window.__ew.game;
          const { x, z } = player.root.position;
          return !transitioning && Math.hypot(x - 124, z - 1.2) < 0.2;
        });
      }, "arrives at the map's taxi stand drop-off");
      await checkStandView("at the map drop-off");
      await shot("map-drop");
    };
    const heard = (key) => page.locator(`.taxi-cue [data-line="${key}"]`).count();
    const choice = (key) => page.locator(`.taxi-choice[data-line="${key}"]`);
    const phase = (value) => page.evaluate((p) => window.__ew.game.modes.get("taxi").run?.phase === p, value);
    const press = (locator) => phone ? locator.tap() : locator.click();
    const speak = async (key, text) => {
      await waitFor(() => page.evaluate(() => window.__listening()), "microphone is ready");
      const phrase = text ?? await choice(key).locator("span").innerText();
      assert(await page.evaluate((input) => window.__speak(input), phrase));
      // Recognition commits after real silence. Stepping the world clock does not advance it.
      await choice(key).waitFor({ state: "hidden", timeout: 6000 });
    };
    await waitFor(() => page.evaluate(() => window.__ew?.store.getState().screen === "play"), "town loads", { attempts: 500 });
    const standPrompt = page.locator(".prompt").getByText("Vairuoti taksi");
    await waitFor(() => standPrompt.isVisible(), "taxi prompt appears");
    assert(await page.evaluate(() => !window.__ew.game.rides.list.some((ride) => ride.id === "taxi")), "the parked taxi is outside the town rides");
    await waitFor(() => page.evaluate(() => {
      const game = window.__ew.game, stand = game.town.parkedCars.taxi;
      return stand && stand.instance?.parent === stand.root && !stand.fallback?.parent; // (no fallback when the model is ready first)
    }), "the Kenney model replaces the stand taxi's fallback");
    await checkStandView("at the prompt", 80);
    assert(await standPrompt.isVisible(), "taxi prompt remains visible after the camera settles");
    assert(await page.evaluate(atTaxiStand), "the Kenney taxi is parked at the layout's stand");
    await shot("start");

    if (sideways) {
      await checkMapDrop();
      assert.deepEqual(errors, []);
      console.log("ok", label);
      await context.close();
      continue;
    }

    await page.evaluate(() => {
      window.__taxiLines = [];
      new MutationObserver(() => {
        const key = document.querySelector(".taxi-cue [data-line]")?.dataset.line;
        if (key && window.__taxiLines.at(-1) !== key) window.__taxiLines.push(key);
      }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-line"] });
    });
    if (phone) await page.locator(".act-btn").tap(); else await page.keyboard.press("e");
    await real(470);
    await waitFor(() => choice("tx_a_where").count(), "Vinnie gets in and asks for the learner's turn");
    assert(await page.evaluate(atTaxiStand, "r1"), "the first ride boards the parked taxi at the stand");
    await checkSightlines(page, "opening pickup");
    assert(await page.evaluate(() => {
      const mode = window.__ew.game.modes.get("taxi");
      return mode.passenger.root.parent === mode.car.mesh && mode.passenger.root.position.z < 0 && !mode.passenger.root.visible;
    }), "Vinnie sits in the back of the taxi, out of sight under its roof");
    assert.equal(await page.locator(".toolbar .ride-menu").count(), 1);
    assert.equal(await page.locator(".minimap, .objective-card").count(), 0);
    assert.equal(await page.locator(".toolbar.menu-open").count(), 0);
    assert(await page.evaluate(() => !window.__ew.game.npcs.find((n) => n.id === "vinnie").ch.root.visible));
    if (phone) await choice("tx_a_where").tap();
    else await speak("tx_a_where");
    await waitFor(() => heard("tx_r1_dest"), "Vinnie names the destination");
    await waitFor(() => page.evaluate(() => {
      const game = window.__ew.game;
      return game.modes.get("taxi").run?.phase === "drive" && game.rides.phase === "on";
    }), "boarding finishes and the taxi is ready to drive");
    assert(await page.evaluate(() => !window.__ew.game.player.root.visible), "the learner at the taxi's wheel is out of sight under its roof");

    const cdp = phone ? await context.newCDPSession(page) : null;
    if (cdp) {
      const stick = await page.locator(".joy").boundingBox();
      assert(stick);
      const x = stick.x + stick.width / 2, y = stick.y + stick.height / 2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y - 42 }] });
      await step(16);
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert(await page.evaluate(() => window.__ew.game.rides.riding.m.pace > 1), "touch stick drives");
      const brake = await page.getByRole("button", { name: "Stabdyti" }).boundingBox();
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
    const chip = page.locator('.taxi-action[data-action="left"]');
    await waitFor(() => chip.count(), "first turn chip", { steer: true, attempts: 180 });
    await real(210);
    const guidance = await page.evaluate(() => {
      const game = window.__ew.game, { car } = game.modes.get("taxi"), { m } = car;
      const road = car.mesh.position.clone().set(m.x + m.fx * 6, 0.04, m.z + m.fz * 6).project(game.rig.cam);
      const chip = document.querySelector(".taxi-action").getBoundingClientRect();
      const icon = document.querySelector(".taxi-action-icon").getBoundingClientRect();
      const cue = document.querySelector(".taxi-line").getBoundingClientRect();
      return {
        offset: Math.abs(chip.left + chip.width / 2 - innerWidth / 2),
        aboveRoad: chip.bottom < (1 - road.y) * innerHeight / 2,
        belowCue: chip.top >= cue.bottom,
        clearOfTouch: [...document.querySelectorAll(".joy, .brake-btn")].every((el) => chip.bottom < el.getBoundingClientRect().top),
        icon: icon.width, cue: cue.width, key: document.querySelector(".taxi-action kbd")?.textContent,
      };
    });
    assert(guidance.offset < 2 && guidance.aboveRoad && guidance.belowCue && guidance.clearOfTouch, JSON.stringify(guidance));
    assert(guidance.icon >= (phone ? 40 : 48), "the chip has a prominent direction arrow");
    if (!phone) {
      assert(guidance.cue > 385 && guidance.cue <= 621, "the desktop cue has room to wrap naturally");
      assert.equal(guidance.key, "←");
    }
    await shot("cue");

    const box = await chip.boundingBox();
    assert(box);
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    if (!cdp) await page.mouse.move(point.x, point.y);
    const down = () => cdp ? cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] }) : page.mouse.down();
    const up = () => cdp ? cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }) : page.mouse.up();
    const held = () => page.evaluate(() => Boolean(window.__ew.game.modes.get("taxi").assist));
    const focused = () => chip.evaluate((button) => document.activeElement === button);
    const capture = await chip.evaluateHandle((button) => {
      let pointerId = -1;
      button.addEventListener("pointerdown", (event) => { pointerId = event.pointerId; }, { once: true });
      return () => button.hasPointerCapture(pointerId);
    });
    assert(await page.evaluate(() => !window.__pad?.connected), "the Taxi cue uses physical input alone");
    await chip.focus();
    await down();
    assert(await focused() && await capture.evaluate((captured) => captured()) && await held(),
      "the focused Taxi cue captures the pointer and holds assist");
    await capture.dispose();
    await chip.evaluate((button) => button.blur());
    assert(!await focused() && !await held(), "the cue releases assist on blur while the pointer is still down");
    await up();
    assert(!await held(), "the late pointer-up leaves assist released");

    if (!phone) {
      await chip.focus();
      await page.keyboard.down("Space");
    }
    await down();
    assert(await held(), "a fresh press can hold assist again");
    if (phone) assert(!await focused(), "touch leaves the cue unfocused");
    await up();
    assert.equal(await held(), !phone, "pointer-up releases the pointer hold and leaves any held Space active");
    if (!phone) {
      await page.keyboard.up("Space");
      assert(!await held(), "Space keyup releases the remaining assist hold");
      await chip.evaluate((button) => button.blur());
    }

    await waitFor(() => heard("tx_wrong"), "Vinnie catches the wrong turn", { steer: true, attempts: 150 });
    await shot("wrong-turn");
    await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
    await waitFor(async () => {
      if (!await phase("drive")) { await real(15); return false; }
      return true;
    }, "fade brings taxi back to the decision");
    assert(await page.evaluate(() => {
      const { m } = window.__ew.game.rides.riding;
      return Math.abs(m.x - 14) < 0.5 && Math.abs(m.z + 9) < 0.5 && Math.abs(m.pace) < 0.5 && Math.abs(m.heading + Math.PI / 2) < 0.01;
    }), "the taxi is reset on its approach, facing west");
    await checkSightlines(page, "retry snap");
    await waitFor(() => heard("tx_r1_c1"), "the cue repeats");

    await page.evaluate(installSteering, { wrong: false });
    await waitFor(() => page.evaluate(() => {
      const game = window.__ew.game, mode = game.modes.get("taxi");
      const truck = game.town.parkedCars.placements.find(({ model }) => model === "garbage");
      return mode.run.index === 2 && mode.car.m.x < truck.x - 5;
    }), "the taxi clears the Station Road garbage truck", { steer: true, attempts: 550, frames: 5 });
    await waitFor(() => page.evaluate(() => window.__ew.game.modes.get("taxi").run.index === 4),
      "approach the final left turn", { steer: true, attempts: 610, frames: 8 });
    await waitFor(() => page.locator('.taxi-action[data-action="stop"]').count(), "first stop chip",
      { steer: true, attempts: 600, frames: 1 });
    assert(await heard("tx_r1_c6"), "the stop cue is heard");
    await shot("stop", 0);
    await waitFor(() => choice("tx_a_here").count(), "learner stops in the zone", { steer: true, attempts: 100 });
    assert(await page.evaluate(() => {
      const { m } = window.__ew.game.rides.riding;
      return Math.abs(m.x + 87) <= 4 && Math.abs(m.z + 11.6) <= 1.8 && m.pace < 0.5;
    }), "the real car has stopped in the curb zone");
    await checkNoRideHints(page, "at the curb");
    if (shots) {
      // Look across the stopped cab from the bay. The game clock and its driving lens stay at this tick.
      await page.evaluate(() => {
        const { rig, renderer, scene, doors, rides } = window.__ew.game;
        const door = doors.find((d) => d.loc === "hotel"), { x, z } = rides.riding.m;
        const camera = rig.cam.clone();
        camera.clearViewOffset(); camera.fov = 58; camera.updateProjectionMatrix();
        camera.position.set(x + 1.7, 2.08, z + 1.8);
        camera.lookAt(door.x, 2.95, door.z);
        renderer.render(scene, camera);
      });
      try { await shot("hotel-door", 0); }
      finally {
        await page.evaluate(() => {
          const { renderer, scene, rig } = window.__ew.game;
          renderer.render(scene, rig.cam);
        });
      }
    }
    if (phone) await choice("tx_a_here").tap(); else await page.keyboard.press("1");
    await waitFor(() => choice("tx_r1_a_fare").count(), "Vinnie asks what he owes");
    if (phone) await press(choice("tx_r1_a_fare")); else await speak("tx_r1_a_fare", "$24.50");
    await waitFor(() => heard("tx_r1_tip_good"), "one wrong turn earns the good tip");
    await waitFor(() => choice("tx_a_bye").count(), "learner gets the last turn");
    await press(choice("tx_a_bye"));
    await waitFor(async () => { await real(10); return page.locator(".mode-score-card").count(); }, "score card opens", { attempts: 150 });
    await checkNoRideHints(page, "on the score card");
    await shot("score");

    const card = page.locator(".mode-score-card");
    assert.equal(await card.locator("h2").innerText(), "Kelionė baigta");
    assert.equal(await card.locator(".mode-score-line").innerText(), "6/7");
    assert.deepEqual(await card.locator("dt").allTextContents(), [
      "Posūkiai iš pirmo karto", "Sklandus sustojimas prie durų", "Kelionė be susidūrimų",
      "Kaina", "Arbatpinigiai", "Sustojai", "Frazių kortelės",
    ]);
    assert.deepEqual(await card.locator("dd").allTextContents(), ["4/5", "1/1", "1/1", "$24.50", "$3.50", "prie durų", "10"]);
    assert.deepEqual(await page.evaluate(() => window.__taxiLines), [
      "tx_hello", "tx_r1_dest", "tx_r1_c1", "tx_wrong", "tx_r1_c1", "tx_r1_c2", "tx_r1_c3",
      "tx_r1_c4", "tx_r1_c5", "tx_r1_c6", "tx_owe", "tx_r1_tip_good", "tx_bye",
    ]);
    assert(await page.evaluate((storageKey) => {
      const game = window.__ew.game, p = game.player.root.position;
      const door = game.doors.find((d) => d.loc === "hotel");
      const stopLine = game.modes.get("taxi").run.kept.get("tx_r1_c6")?.sentence.en;
      const cards = JSON.parse(localStorage.getItem(storageKey) ?? "null")?.cards ?? [];
      return !game.rides.riding && game.player.root.visible && Math.hypot(p.x - door.outX, p.z - door.outZ) < 0.5
        && window.__ew.store.getState().progress.taxi.nextRoute === 1
        && cards.some((c) => c.situationId === "s66-taxi" && c.sentence.en === stopLine);
    }, `${storage}-cards-v1`), "on foot at the destination door, with route rotation and cards saved");
    await press(card.getByRole("button", { name: "Baigti" }));
    await waitFor(() => page.locator(".minimap").count(), "town HUD returns");
    await checkNoRideHints(page, "after leaving the score card");

    if (!phone) {
      await page.evaluate(() => window.__ew.game.startScenario("s66-taxi"));
      await waitFor(async () => { await real(10); return page.evaluate(() => window.__ew.game.activeSession?.active); }, "s66 opens");
      await press(page.locator(".scene-start"));
      await page.evaluate(() => {
        const game = window.__ew.game;
        window.__ew.audio.stop();
        game.onSessionEvent("taxi-ride", { to: "bank" });
        game.player.root.position.set(0, 0, -8);
        window.__ew.store.getState().setConv({ phase: "ended", completed: true });
      });
      await page.locator(".ended-box .ended-keepsake").waitFor();
      await page.locator(".ended-box").getByRole("button", { name: "Vairuoti taksi" }).click();
      await real(480);
      await waitFor(() => choice("tx_a_where").count(), "s66 end card starts a taxi mode");
      assert(await page.evaluate(atTaxiStand, "r2"), "the second route boards the same taxi at the stand");
      await checkSightlines(page, "second pickup");
      if (shots) {
        await page.keyboard.press("1");
        await waitFor(() => page.evaluate(() => {
          const game = window.__ew.game;
          return game.modes.get("taxi").run?.phase === "drive" && game.rides.phase === "on" && !game.transitioning;
        }), "route 2 boarding finishes and the taxi is ready to drive");
        await page.evaluate(installSteering, { fromStand: true });
        await waitFor(() => heard("tx_r2_c1"), "route 2 first cue", { steer: true });
        await waitFor(() => page.locator('.taxi-action[data-action="left"]').count(), "route 2 first turn chip", { steer: true, frames: 8 });
        await page.evaluate(() => window.__ew.game.setJoystick(0, 0));
        await shot("route2-cue");
      }
      await page.getByRole("button", { name: "Meniu" }).click();
      await page.getByRole("button", { name: "Išlipti", exact: true }).click();
      await real(470);
      await waitFor(() => page.locator(".minimap").count(), "menu exits the ride and restores the HUD");
      assert(await page.evaluate(() => window.__ew.game.player.root.visible), "on foot again after the menu's way out, in sight");
      await checkNoRideHints(page, "after exiting from the menu");
      // With screenshots enabled, the second taxi has already driven out to its first cue.
      if (!shots) {
        assert(await page.evaluate(atTaxiStand), "the taxi is back at the stand after the menu exit");
        await checkStandView("after getting out of the taxi at the stand");
      }
    }
    await checkMapDrop();
    assert.deepEqual(errors, []);
    console.log("ok", label);
    await context.close();
  }
} finally {
  await browser.close();
}
