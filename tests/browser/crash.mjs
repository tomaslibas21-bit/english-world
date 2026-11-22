// VITE_EDITION=es npx vite --port 5188
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=puerto-colibri WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/crash.mjs
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.WORLD_SHOTS_DIR || "/tmp";
const beforeOnly = process.env.WORLD_CRASH_BEFORE === "1";
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, cameraFollow: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: -80, z: -1.8, rot: Math.PI / 2 },
  coach: { done: true, run: true },
};

await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});

try {
  for (const phone of [false, true]) {
    const label = phone ? "phone" : "computer";
    const context = await browser.newContext(phone
      ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
      : { viewport: { width: 1280, height: 800 } });
    try {
      await context.route(/\.mp3(?:\?|$)/, (route) => route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }));
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error" && /shader error|webglprogram/i.test(message.text())) errors.push(message.text());
      });
      await page.addInitScript(([key, save]) => {
        localStorage.setItem(key, save);
        sessionStorage.setItem("ew-play-now", "1");
      }, [`${storage}-progress-v1`, JSON.stringify(progress)]);
      await page.goto(base, { waitUntil: "domcontentloaded" });
      await page.waitForFunction((beforeOnly) => {
        const ew = window.__ew, g = ew?.game;
        return ew?.store.getState().screen === "play" && g?.zone?.id === "town" && g.ledges?.ready
          && !g.transitioning && g.carVisuals?.stats().parkedModels > 0 && g.carVisuals.stats().trafficModels > 0
          && (beforeOnly || g.crashShadersReady);
      }, beforeOnly, { timeout: 120000 });

      const wait = (fn, arg, timeout = 8000) => page.waitForFunction(fn, arg, { timeout }).catch(async (error) => {
        const state = await page.evaluate(() => {
          const g = window.__ew.game, r = window.__crashRide, c = window.__crashTraffic, { crashes } = g.rides;
          return {
            riding: g.rides.riding?.id ?? null, phase: g.rides.phase, ride: r && { x: r.m.x, z: r.m.z, speed: r.m.speed, heading: r.m.heading },
            traffic: c && { x: c.x, lane: c.lane, speed: c.speed, hidden: c.hidden, crashStop: c.crashStop },
            last: crashes?.last(), ride_info: r && crashes?.info(r), traffic_info: c && crashes?.info(c), stats: crashes?.stats(),
          };
        }).catch(() => null);
        console.log("wait failed", JSON.stringify(state));
        console.log("trace", JSON.stringify(await page.evaluate(() => window.__trace ?? null).catch(() => null)));
        throw error;
      });
      const drive = (dir) => phone
        ? page.evaluate((y) => window.__ew.game.setJoystick(0, y), dir)
        : dir ? page.keyboard.down(dir > 0 ? "w" : "s") : Promise.all([page.keyboard.up("w"), page.keyboard.up("s")]);
      const board = () => page.evaluate(() => {
        const g = window.__ew.game;
        return g.boardRide(window.__crashRide);
      });
      const driveReady = () => wait(() => window.__ew.game.rides.riding === window.__crashRide && window.__ew.game.rides.phase === "on");
      const pose = (x, z, rot, speed = 0) => page.evaluate(({ x, z, rot, speed }) => {
        const g = window.__ew.game, r = window.__crashRide;
        g.rides.resetPosition(r, { x, z, rot });
        r.m.speed = speed;
        g.rig.mode = "follow"; g.rig.stage = null; g.rig.yaw = rot; g.rig.snap();
      }, { x, z, rot, speed });
      const stage = (pos, look) => page.evaluate(({ pos, look }) => {
        const g = window.__ew.game, rig = g.rig;
        rig.mode = "stage";
        rig.stage = { pos: rig.cam.position.clone().set(...pos), look: rig.target.clone().set(...look), rate: 50, shiftY: 0 };
        rig.stageSnap();
      }, { pos, look });
      // The staged camera in a car's own frame: [to its right, up, ahead] (m), for the camera and the point it looks at.
      const frame = (who, cam, look) => page.evaluate(({ who, cam, look }) => {
        const g = window.__ew.game, c = who === "traffic" ? window.__crashTraffic : who === "parked" ? window.__crashParked : window.__crashRide;
        const x = who === "traffic" ? c.x : c.m.x, z = who === "traffic" ? c.lane : c.m.z;
        const h = who === "traffic" ? c.dir * Math.PI / 2 : c.m.heading;
        const at = ([r, y, f]) => [x - Math.cos(h) * r + Math.sin(h) * f, y, z + Math.sin(h) * r + Math.cos(h) * f];
        const rig = g.rig;
        rig.mode = "stage";
        rig.stage = { pos: rig.cam.position.clone().set(...at(cam)), look: rig.target.clone().set(...at(look)), rate: 50, shiftY: 0 };
        rig.stageSnap();
        return { car: [x, z, h].map((v) => +v.toFixed(2)), cam: at(cam).map((v) => +v.toFixed(2)), look: at(look).map((v) => +v.toFixed(2)), real: rig.cam.position.toArray().map((v) => +v.toFixed(2)) };
      }, { who, cam, look }).then((r) => { if (process.env.WORLD_CRASH_DEBUG) console.log("frame", who, JSON.stringify(r)); });
      const info = () => page.evaluate(() => {
        const { crashes } = window.__ew.game.rides;
        return { damage: crashes.info(window.__crashRide), hit: crashes.last(), stats: crashes.stats() };
      });
      const brake = (on) => page.evaluate((value) => window.__ew.game.hold(value), on);
      const photo = async (name) => {
        await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
        await page.screenshot({ path: join(shots, `crash-${label}-${name}.png`) });
      };
      const waitForBlink = () => wait(() => {
        const lamp = window.__ew.game.rides.group.getObjectByName("crash-hazards");
        return lamp?.visible && lamp.geometry.getAttribute("blink").getX(0) > 0.75;
      });

      await page.evaluate(() => {
        const ew = window.__ew, g = ew.game;
        ew.coach?.finish?.();
        ew.store.getState().setHud({ panel: null });
        const ride = window.__crashRide = g.rides.find("parked-0");
        window.__cleanGeometry = ride.mesh.children[0].geometry;
        window.__crashSounds = [];
        const host = g.rides.host, sound = host.crashSound;
        host.crashSound = (cue, strength) => { window.__crashSounds.push(cue); sound?.(cue, strength); };
      });
      assert(await board(), `${label}: boarded a parked Kenney sedan`);
      await driveReady();

      // Cross Brotecito's paved forecourt to the west wall at x = 137, between the entrance and the loading door.
      const wallHeading = Math.PI / 2 + 0.45;
      await pose(125, -51.4, wallHeading);
      // (the longest frame from here until a second after the crash: the first dent must not stall a phone)
      await page.evaluate(() => {
        window.__frames = { last: performance.now(), worst: 0, until: Infinity };
        const tick = (now) => {
          const f = window.__frames;
          f.worst = Math.max(f.worst, now - f.last); f.last = now;
          if (now < f.until) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
      await drive(1);
      const collision = await wait(() => {
        const g = window.__ew.game, m = window.__crashRide.m;
        return m.x > 133 && m.x < 136 && m.bump > 0.4 ? g.t : null;
      });
      await drive(0);
      await brake(true);

      let hard;
      if (!beforeOnly) {
        hard = await info();
        assert(hard.hit?.k > 0.3 && hard.hit.target === "town", JSON.stringify(hard));
        assert(hard.damage.sides.includes("front") && hard.damage.scuffs && hard.damage.hazards, JSON.stringify(hard));
        assert(hard.damage.lampCracked && hard.damage.crackedLamps.join() === "front-right", JSON.stringify(hard));
        assert(hard.damage.bumperHanging && hard.stats.puffs > 0 && hard.stats.puffs <= 6, JSON.stringify(hard));
        assert(await page.evaluate(() => window.__crashRide.mesh.children[0].geometry !== window.__cleanGeometry));
        console.log(`${label} first damage geometry ${hard.stats.lastBuildMs.toFixed(2)} ms`);
        await page.evaluate(() => { window.__frames.until = performance.now() + 1000; });
        assert(hard.stats.lastBuildMs > 0);
      }
      await frame("ride", phone ? [3.0, 2.8, -4.4] : [2.4, 2.4, -3.5], [0.3, 0.8, 1.6]);
      await wait((at) => window.__ew.game.t - at >= 0.24, await collision.jsonValue());
      if (!beforeOnly) {
        await waitForBlink();
        assert(await page.evaluate(() => window.__ew.game.rides.group.getObjectByName("crash-puffs").visible));
      }
      await photo("impact");
      if (!beforeOnly) {
        await page.waitForTimeout(1000);
        const longest = await page.evaluate(() => window.__frames.worst);
        console.log(`${label} longest frame around the first crash ${longest.toFixed(1)} ms`);
        assert(longest < 120, `${label}: longest crash frame ${longest.toFixed(1)} ms (120 ms budget)`);
      }
      await brake(false);

      if (!beforeOnly) {
        await page.evaluate(() => {
          const g = window.__ew.game;
          g.rig.mode = "follow"; g.rig.stage = null; g.rig.yaw = window.__crashRide.m.heading; g.rig.snap();
        });
        await drive(-1);
        await wait(() => window.__crashRide.m.speed < -2 && window.__crashRide.m.x < 134);
        await drive(0);
        await drive(1);
        await wait(() => window.__crashRide.m.speed > 1);
        await drive(0);
      }

      // Leave enough room to see the front fascia from the same angle on the old and new builds.
      await pose(129, -53.4, wallHeading);
      assert(await page.evaluate(() => window.__ew.game.rides.leave()), `${label}: got out of the sedan`);
      await wait(() => !window.__ew.game.rides.riding);
      await page.evaluate(() => {
        const g = window.__ew.game, r = window.__crashRide;
        g.player.root.position.set(r.m.x - 2.8, 0, r.m.z - 2);
        g.heading = g.player.root.rotation.y = Math.PI / 2;
        g.rig.yaw = -0.9;
        window.__ew.store.getState().dismissRideToasts?.();
      });
      await frame("ride", phone ? [3.2, 2.3, 6.2] : [2.6, 1.9, 5.0], [0.2, 0.6, 0.9]);
      if (!beforeOnly) await wait(() => !window.__ew.game.rides.group.getObjectByName("crash-hazards").visible);
      await photo("front");
      if (!beforeOnly) await page.evaluate(() => window.__ew.game.rides.crashes.age(100));

      assert(await board());
      await driveReady();
      // Touch the south wall of the same building with a short, low-speed approach.
      await pose(148, -45.45, Math.PI, 3.3);
      await drive(1);
      await wait(() => window.__crashRide.m.bump > 0.35);
      await drive(0);
      if (!beforeOnly) {
        const light = await info();
        assert(light.hit.k > 0 && light.hit.k < 0.35 && light.hit.k < hard.hit.k, JSON.stringify(light));
        assert(light.damage.dentCount === 1 && light.damage.depth < hard.damage.depth, JSON.stringify(light));
      }
      await pose(148, -41, Math.PI);
      await frame("ride", phone ? [-3.0, 2.0, 5.2] : [-2.4, 1.7, 4.2], [0, 0.55, 1.6]);
      await photo("light");

      // Put the westbound Kenney sedan just ahead of the driver's nose on calle Hidalgo. The short run-up keeps
      // the normal driving code in charge of braking and settling while making the timing independent of the spawn.
      await page.evaluate(() => {
        const g = window.__ew.game, r = window.__crashRide;
        const car = window.__crashTraffic = g.ambient.traffic.find((c) => c.lane === 36.8 && c.dir === -1 && c.model === "sedan");
        Object.assign(car, { x: 16, speed: 1, hidden: 0, grow: 1, whole: true, byT: 0, held: 0 });
        car.mesh.position.set(car.x, 0, car.lane);
        car.mesh.scale.setScalar(1);
        car.mesh.visible = true;
        g.rides.resetPosition(r, { x: 16, z: car.lane - car.half.z - r.m.spec.half - 0.04, rot: 0 });
        // (nose all but touching its side: the driven car brakes for traffic ahead, so only a car that turns or
        // crosses in front at the last moment is ever met)
        r.m.speed = 9;
        g.rig.mode = "follow"; g.rig.stage = null; g.rig.yaw = 0; g.rig.snap();
        window.__trace = [];
        const t0 = performance.now();
        const step = () => {
          const m = r.m;
          window.__trace.push([Math.round(performance.now() - t0), +m.x.toFixed(2), +m.z.toFixed(2), +m.speed.toFixed(2), +car.x.toFixed(2), +car.speed.toFixed(2), g.rides.riding?.id ?? null, g.rides.phase]);
          if (window.__trace.length < 40) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
      await drive(1);
      if (beforeOnly) await wait(() => window.__crashRide.m.bump > 0.35);
      else await wait(() => {
        const g = window.__ew.game, car = window.__crashTraffic;
        return g.rides.crashes.info(car)?.hazards && car.speed < 0.05;
      });
      await drive(0);
      if (!beforeOnly) {
        const traffic = await page.evaluate(() => {
          const g = window.__ew.game, c = window.__crashTraffic;
          return { info: g.rides.crashes.info(c), hit: g.rides.crashes.last(), ownBody: !!c.damagedBody };
        });
        assert(traffic.hit.target === "traffic" && traffic.info.scuffs && traffic.ownBody, JSON.stringify(traffic));
        assert(traffic.info.sides.includes("right"), JSON.stringify(traffic));
      }
      await pose(10, 46, Math.PI);
      await frame("traffic", phone ? [5.6, 2.4, 2.2] : [4.5, 2.0, 1.8], [0.9, 0.8, 0]);
      if (!beforeOnly) await waitForBlink();
      await photo("traffic");
      const frames = () => page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(done)))));
      const calls = async () => { await frames(); return page.evaluate(() => ({ calls: window.__ew.game.renderer.info.render.calls, own: window.__ew.game.rides.crashes.stats().ownDraws })); };
      if (!beforeOnly) {
        const damagedCalls = await calls();
        assert(damagedCalls.own <= 4, JSON.stringify(damagedCalls));
        await wait(() => window.__crashTraffic.speed > 1, null, 8000);
        assert(await page.evaluate(() => window.__ew.game.rides.crashes.info(window.__crashTraffic)?.hazards));

        const afterAge = await page.evaluate(() => {
          const { crashes } = window.__ew.game.rides;
          crashes.age(100);
          const aged = { restored: window.__crashRide.mesh.children[0].geometry === window.__cleanGeometry, stats: crashes.stats() };
          crashes.healAll();
          return aged;
        });
        assert(afterAge.restored && afterAge.stats.hazards === 0, JSON.stringify(afterAge));
        const cleanCalls = await calls();
        console.log(`${label} draw calls, same staged view`, { damaged: damagedCalls, healed: cleanCalls });
        assert(damagedCalls.calls - cleanCalls.calls <= 6, JSON.stringify({ damagedCalls, cleanCalls }));
      }

      // The pickup on calle Flamboyán faces south. Its driver's door faces the clear east sidewalk.
      const parkedIndex = 5;
      const parkedPose = await page.evaluate((index) => {
        const g = window.__ew.game, r = window.__crashRide;
        const parked = window.__crashParked = g.rides.find(`parked-${index}`);
        const entry = g.town.parkedCars.fleet.cars[index];
        window.__parkedGeometry = entry.visual.geometry;
        window.__parkedWasBatched = !entry.taken && !entry.visual.visible;
        return { x: parked.m.x + parked.m.spec.wide + r.m.spec.half + 0.4, z: parked.m.z };
      }, parkedIndex);
      await pose(parkedPose.x, parkedPose.z, -Math.PI / 2, 6);
      await drive(1);
      await wait(() => window.__crashRide.m.bump > 0.35);
      await drive(0);
      if (!beforeOnly) {
        const parked = await page.evaluate((index) => {
          const g = window.__ew.game, entry = g.town.parkedCars.fleet.cars[index];
          return {
            hit: g.rides.crashes.last(), damage: g.rides.crashes.info(window.__crashParked), chirped: window.__crashSounds.includes("chirp"),
            solo: window.__parkedWasBatched && entry.taken && !entry.driven && entry.visual.visible && entry.visual.geometry !== window.__parkedGeometry,
          };
        }, parkedIndex);
        assert(parked.hit.target === "parked" && parked.hit.into > 4.5 && parked.hit.into < 7.5, JSON.stringify(parked));
        assert(parked.damage.sides.includes("left") && parked.damage.scuffs && parked.damage.hazards && parked.chirped && parked.solo, JSON.stringify(parked));
      }
      await pose(-60, 26, Math.PI);
      await frame("parked", phone ? [-4.4, 1.7, -2.0] : [-3.4, 1.5, -1.5], [-0.8, 0.75, 0]);
      if (!beforeOnly) await waitForBlink();
      await photo("parked");

      // Enter the painted forecourt from the east, south of the pumps and the parked rental sedan.
      await pose(121.6, 8.4, -Math.PI / 2);
      await drive(1);
      await wait(() => window.__crashRide.m.x < 118.1);
      await brake(true);
      await drive(0);
      await wait(() => window.__crashRide.m.pace < 0.25);
      await stage([phone ? 112.6 : 113.6, 2.5, 4.75], [117, 0.84, 8.2]);
      if (beforeOnly) await page.waitForTimeout(1600);
      else {
        await wait(() => {
          const g = window.__ew.game, r = window.__crashRide;
          return r.mesh.children[0].geometry === window.__cleanGeometry
            && g.rides.crashes.stats().sparkles > 0 && g.rides.group.getObjectByName("crash-puffs").visible;
        });
        assert(await page.evaluate(() => window.__crashSounds.includes("ding")));
      }
      await photo("gas");
      await brake(false);
      if (!beforeOnly) {
        assert(await page.evaluate(() => window.__ew.game.rides.leave()));
        await wait(() => !window.__ew.game.rides.riding);
        await page.evaluate(() => {
          const g = window.__ew.game;
          const r = window.__crashRide = g.rides.list.find((ride) => ride.kind === "car");
          window.__convertibleGeometry = r.mesh.geometry;
        });
        assert(await board());
        await driveReady();
        await pose(147, -45.1, Math.PI, 7);
        await drive(1);
        await wait(() => window.__ew.game.rides.crashes.info(window.__crashRide)?.dentCount > 0);
        await drive(0);
        const convertible = await page.evaluate(() => {
          const g = window.__ew.game, r = window.__crashRide, original = window.__convertibleGeometry;
          const [first, end] = original.userData.crashWheels;
          const clean = original.getAttribute("position").array, dented = r.mesh.geometry.getAttribute("position").array;
          return {
            dented: r.mesh.geometry !== original && g.rides.crashes.info(r)?.sides.includes("front"),
            wheels: clean.slice(first * 3, end * 3).every((value, i) => value === dented[first * 3 + i]),
          };
        });
        assert.deepEqual(convertible, { dented: true, wheels: true });
        assert.deepEqual(await page.evaluate(() => {
          const { crashes } = window.__ew.game.rides;
          crashes.healAll();
          return crashes.stats();
        }), { damaged: 0, hazards: 0, puffs: 0, ownDraws: 0, sparkles: 0, lastBuildMs: 0 });
      }
      assert.deepEqual(errors, []);
      console.log(`${label} crash checks passed`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
