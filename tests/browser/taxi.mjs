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

function taxiStandView() {
  const game = window.__ew.game, camera = game.rig.cam, ray = game.raycaster;
  const taxi = game.town.parkedCars.taxi.root.position.clone().setY(0.9);
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
  for (const phone of [false, true]) {
    const label = phone ? "phone" : "computer";
    const context = await browser.newContext(phone
      ? { viewport: { width: 390, height: Number(process.env.WORLD_PHONE_HEIGHT || 844) }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
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
        const mode = window.__ew?.game.modes.get("taxi");
        const m = mode?.car.m;
        return { phase: mode?.run?.phase, index: mode?.run?.index, x: m?.x, z: m?.z, heading: m?.heading, pace: m?.pace, crashes: mode?.run?.crashes, history: window.__taxiLines };
      });
      assert.fail(`${label}: ${description}: ${JSON.stringify(state)}`);
    };
    const shot = async (name) => { if (shots) { await step(2); await real(320); await page.screenshot({ path: `${shots}/${label}-${name}.png` }); } };
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
      return stand && stand.instance?.parent === stand.root && !stand.fallback.parent;
    }), "the Kenney model replaces the stand taxi's fallback");
    // Let the standing follow camera finish its swing before checking the framing.
    await step(80);
    assert(await standPrompt.isVisible(), "taxi prompt remains visible after the camera settles");
    assert(await page.evaluate(atTaxiStand), "the Kenney taxi is parked at the layout's stand");
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
    await waitFor(() => choice("tx_a_where").count(), "Vinnie gets in and asks for the learner's turn");
    assert(await page.evaluate(atTaxiStand, "r1"), "the first ride boards the parked taxi at the stand");
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

    if (phone) {
      const cdp = await context.newCDPSession(page);
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
    await waitFor(() => page.locator('.taxi-action[data-action="left"]').count(), "first turn chip", { steer: true, attempts: 180 });
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
    await waitFor(() => heard("tx_r1_c1"), "the cue repeats");

    await page.evaluate(installSteering, { wrong: false });
    await waitFor(() => page.evaluate(() => {
      const game = window.__ew.game, mode = game.modes.get("taxi");
      const truck = game.town.parkedCars.placements.find(({ model }) => model === "garbage");
      return mode.run.index === 2 && mode.car.m.x < truck.x - 5;
    }), "the taxi clears the Station Road garbage truck", { steer: true, attempts: 550, frames: 5 });
    await waitFor(() => heard("tx_r1_c6"), "the stop cue is heard", { steer: true, attempts: 610, frames: 8 });
    await waitFor(() => page.locator('.taxi-action[data-action="stop"]').count(), "stop chip appears", { steer: true, attempts: 90, frames: 4 });
    await shot("stop");
    await waitFor(() => choice("tx_a_here").count(), "learner stops in the zone", { steer: true, attempts: 100 });
    assert(await page.evaluate(() => {
      const { m } = window.__ew.game.rides.riding;
      return Math.abs(m.x + 87) <= 4 && Math.abs(m.z + 11.6) <= 1.8 && m.pace < 0.5;
    }), "the real car has stopped in the curb zone");
    await checkNoRideHints(page, "at the curb");
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
    assert.equal(await card.locator("dt").last().innerText(), "Frazių kortelės");
    assert.deepEqual(await card.locator("dd").allTextContents(), ["$24.50", "$3.50", "4/5", "prie durų", "10"]);
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
      await page.evaluate(() => {
        const game = window.__ew.game;
        game.onSessionEvent("taxi-ride", { to: "bank" });
        game.player.root.position.set(0, 0, -8);
        window.__ew.store.getState().setConv({ phase: "ended", completed: true });
      });
      await page.locator(".ended-box .ended-keepsake").waitFor();
      await page.locator(".ended-box").getByRole("button", { name: "Vairuoti taksi" }).click();
      await real(480);
      await waitFor(() => choice("tx_a_where").count(), "s66 end card starts a taxi mode");
      assert(await page.evaluate(atTaxiStand, "r2"), "the second route boards the same taxi at the stand");
      if (shots) {
        await page.keyboard.press("1");
        await waitFor(() => phase("drive"), "route 2 is ready to drive");
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
    }
    assert.deepEqual(errors, []);
    console.log("ok", label);
    await context.close();
  }
} finally {
  await browser.close();
}
