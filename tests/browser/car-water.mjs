// Maple Harbor, against the local Vite dev server. Run both devices with the same seeded clock.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_STORAGE=english-world WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/car-water.mjs
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const storage = process.env.WORLD_STORAGE || "english-world";
const townByStorage = { "english-world": "maple-harbor", "puerto-colibri": "puerto-colibri" };
const town = process.env.VITE_EDITION === "es" ? "puerto-colibri" : townByStorage[storage];
const fixtures = {
  "maple-harbor": {
    road: [24, -55, Math.PI],
    east: [76, -55, Math.PI],
    west: [-96, -55, Math.PI],
    depths: [[-72, 0.13], [-73, 0.31], [-75, 0.36], [-77.4, 0.41], [-79, 0.79]],
    dryTurn: [24, -63, Math.PI / 2],
    wetTurn: [24, -76.4, Math.PI / 2],
    reverse: [24, -72.8, Math.PI],
    deck: [-30, -70, 0.42],
    lip: [-30, -90.5, Math.PI],
    offshore: [-96, -81, Math.PI],
    warehouse: [125, -54.6, Math.PI / 2 + 0.45],
    crashCar: "parked-0",
    beach: [-6.5, -71.2, Math.PI - 0.3],
    boat: "beach",
    indoor: "airport",
    oldClamp: -68.65,
    wadingLimit: -77.4,
  },
};
const site = fixtures[town];
assert.ok(site, `No car-water fixtures for ${town ?? "unknown town"} (WORLD_STORAGE=${storage}, VITE_EDITION=${process.env.VITE_EDITION ?? "default"})`);
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname), "use a local Vite DEV server");

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const quantum = 1000 / 60;
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};
const clips = new Map(await Promise.all(["audio", "audio-v2"].map(async (dir) => [
  dir, JSON.parse(await readFile(new URL(`../../public/${dir}/manifest.json`, import.meta.url), "utf8")),
])));
const carChunk = /\/(?:src\/game\/rides\/carWater[^/]*\.ts|assets\/carWater[^/]*\.js)$/i;
const media = /\.(?:mp3|ogg|wav|m4a|png|jpe?g|webp|avif|svg|glb|gltf|webm|mp4|woff2?)$/i;
const recording = /\.(?:mp3|ogg|wav|m4a)$/i;
const range = (xs) => Math.max(...xs) - Math.min(...xs);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const turn = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const close = (a, b, tolerance, label) => assert.ok(Math.abs(a - b) <= tolerance, `${label} (${a} vs ${b}, tolerance ${tolerance})`);

function installClock([key, save]) {
  // Each case gets a new page. Reload within that case must use the game's actual save.
  if (!sessionStorage.getItem("car-water-seeded") || !localStorage.getItem(key)) localStorage.setItem(key, save);
  sessionStorage.setItem("car-water-seeded", "1");
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

// Runs inside DEV, once per document. Nothing here runs from an application animation callback.
async function installReads() {
  const [{ waterY, floorY, sandY, poolAt, SEA_LEVEL, DECKS }, { ROAD_EDITION },
    { BONE }, { controlsFrom, pointAndGo }, { WORLD, TRAFFIC_LANES }] = await Promise.all([
    import("/src/game/water.ts"), import("/src/content/road.ts"), import("/src/game/characters/builders.ts"),
    import("/src/game/rides/drive.ts"), import("/src/game/world/layout.ts"),
  ]);
  const g = window.__ew.game;
  const R = g.rides;
  const v = g.player.root.position.clone();
  const depth = (x, z) => waterY(x, z, g.t) === null ? 0 : Math.max(0, (poolAt(x, z)?.y ?? SEA_LEVEL) - floorY(x, z));
  const point = (p) => ({ x: p.x, y: p.y, z: p.z });
  const pose = (r) => ({ x: r.m.x, z: r.m.z, heading: r.m.heading, half: r.m.spec.half, wide: r.m.spec.wide });
  const local = (r, across, along) => {
    const s = Math.sin(r.heading), c = Math.cos(r.heading);
    return { x: r.x + c * across + s * along, z: r.z - s * across + c * along };
  };
  const cross = (a, b) => a.x * b.x + a.z * b.z;
  const axes = (r) => [local({ ...r, x: 0, z: 0 }, 1, 0), local({ ...r, x: 0, z: 0 }, 0, 1)];
  const overlap = (a, b) => {
    const A = axes(a), B = axes(b), d = { x: b.x - a.x, z: b.z - a.z };
    const project = (r, ax, n) => Math.abs(cross(ax[0], n)) * r.wide + Math.abs(cross(ax[1], n)) * r.half;
    return [...A, ...B].every(n => Math.abs(cross(d, n)) < project(a, A, n) + project(b, B, n) - 0.002);
  };
  const footprintDistance = (r, p) => {
    const [side, forward] = axes(r), d = { x: p.x - r.x, z: p.z - r.z };
    return Math.hypot(Math.max(0, Math.abs(cross(d, side)) - r.wide), Math.max(0, Math.abs(cross(d, forward)) - r.half));
  };
  const box = (b) => ({ x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2,
    wide: (b.maxX - b.minX) / 2, half: (b.maxZ - b.minZ) / 2, heading: 0 });
  const supported = (p) => {
    const water = waterY(p.x, p.z, g.t), high = poolAt(p.x, p.z)?.y ?? SEA_LEVEL + 0.265;
    const floor = floorY(p.x, p.z);
    return p.x > WORLD.minX && p.x < WORLD.maxX && p.z > WORLD.minZ && p.z < WORLD.maxZ && Number.isFinite(floor)
      && (water === null || floor > high && sandY(p.x, p.z) > high)
      && !DECKS.some(d => p.x > d.x0 && p.x < d.x1 && p.z > d.z0 && p.z < d.z1);
  };
  const radius = 0.42;
  const feetSupported = (p) => supported(p) && Array.from({ length: 16 }, (_, i) => i * Math.PI / 8)
    .every(a => supported({ x: p.x + radius * Math.cos(a), z: p.z + radius * Math.sin(a) }));
  const colliders = g.town.colliders;
  const visible = (node) => {
    for (let o = node; o; o = o.parent) if (!o.visible) return false;
    return !!node && node.layers.test(g.rig.cam.layers);
  };
  const project = (p) => {
    v.set(p.x, p.y, p.z).project(g.rig.cam);
    return { x: v.x, y: v.y, visible: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && Math.abs(v.z) < 1 };
  };
  const worldVertex = (obj, attr, i) => point(v.fromBufferAttribute(attr, i).applyMatrix4(obj.matrixWorld));

  function clearance(id, foot, obstacleTag) {
    const r = R.find(id), car = pose(r), p = foot ?? g.player.root.position;
    const pads = colliders.boxes.map(box);
    const circles = [...colliders.circles, ...R.sea.circles];
    for (const q of [...R.list, ...R.modeCars.keys()]) {
      if (q !== r) pads.push(pose(q));
      for (const o of q.owners) if (o.state !== "in") circles.push({ ...point(o.ch.root.position), r: 0.35 });
    }
    for (const c of g.ambient.traffic) if (c.hidden <= 0 && c.mesh.scale.x >= 0.5) {
      pads.push({ x: c.x, z: c.lane, half: c.half.x, wide: c.half.z, heading: Math.PI / 2 });
    }
    for (const ch of [...g.npcs.map(n => n.ch), ...g.ambient.walkers.map(w => w.ch)]) {
      circles.push({ ...point(ch.root.position), r: 0.35 });
    }
    const supportedCar = Array.from({ length: 13 }, (_, i) => 2 * i / 12 - 1)
      .every(f => Array.from({ length: 9 }, (_, i) => 2 * i / 8 - 1).every(s => supported(local(car, s * car.wide, f * car.half))));
    const obstacle = colliders.boxes.find(b => b.tag === obstacleTag);
    return {
      car: supportedCar && R.drivable.has(car.x, car.z),
      foot: feetSupported(p), floor: floorY(p.x, p.z), carFloor: floorY(car.x, car.z),
      carClear: pads.every(b => !overlap(car, b)) && circles.every(c => footprintDistance(car, c) >= c.r - 0.002),
      footClear: pads.every(b => footprintDistance(b, p) >= radius - 0.002)
        && circles.every(c => Math.hypot(c.x - p.x, c.z - p.z) >= c.r + radius - 0.002),
      obstacleClear: obstacleTag ? !!obstacle && !overlap(car, box(obstacle)) && footprintDistance(box(obstacle), p) >= radius : null,
      reach: R.reach(r, p.x, p.z), sameNear: R.near(p.x, p.z) === r,
    };
  }

  function effects(r, car, w) {
    const foam = g.scene.getObjectByName("car-water-foam"), drops = g.scene.getObjectByName("water-drops");
    const result = { bow: [], wake: null, spray: 0, streams: [0, 0] };
    if (foam && visible(foam) && foam.geometry.drawRange.count > 0) {
      const { index, attributes, drawRange } = foam.geometry;
      const vertices = new Set(Array.from({ length: drawRange.count }, (_, i) => index.getX(drawRange.start + i)));
      const front = project(point(r.mesh.localToWorld(v.set(0, 0.12, car.half))));
      const ribbon = [];
      for (const i of vertices) {
        if (attributes.color.getW(i) < 0.025) continue;
        const p = worldVertex(foam, attributes.position, i);
        const dx = p.x - car.x, dz = p.z - car.z, ndc = project(p);
        const along = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const across = dx * Math.cos(car.heading) - dz * Math.sin(car.heading);
        if (i < 9) result.bow.push({ along, across, visible: ndc.visible, above: p.y - waterY(p.x, p.z, g.t),
          nosePixels: Math.hypot((front.x - ndc.x) * innerWidth / 2, (front.y - ndc.y) * innerHeight / 2) });
        else ribbon.push({ along, visible: ndc.visible });
      }
      if (ribbon.length) result.wake = { aft: Math.min(...ribbon.map(p => p.along)), fore: Math.max(...ribbon.map(p => p.along)),
        onScreen: ribbon.filter(p => p.visible).length, vertices: ribbon.length };
    }
    if (drops && visible(drops) && drops.geometry.drawRange.count > 0) {
      const { start, count } = drops.geometry.drawRange;
      const positions = drops.geometry.getAttribute("position");
      for (let i = start; i < start + count; i++) {
        const kind = g.splashes.carKinds?.[i];
        if (!kind || !(g.splashes.life[i] > 0)) continue;
        const p = worldVertex(drops, positions, i);
        if (!project(p).visible) continue;
        if (kind === 1 && w.lastSpray && Math.hypot(p.x - w.lastSpray.x, p.z - w.lastSpray.z) < 1.2
          && p.y > w.lastSpray.y + 0.015) result.spray++;
        const dx = p.x - car.x, dz = p.z - car.z;
        const side = dx * Math.cos(car.heading) - dz * Math.sin(car.heading);
        const along = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        if (kind === 2 && Math.abs(Math.abs(side) - car.wide) < 0.24 && Math.abs(along) < 0.55
          && p.y >= floorY(p.x, p.z) - 0.005 && p.y <= r.mesh.position.y + 0.45 && g.splashes.vel[3 * i + 1] < 0) {
          result.streams[side < 0 ? 0 : 1]++;
        }
      }
    }
    return result;
  }

  function sample(id, before) {
    const p = g.player, c = g.rig.cam, hud = window.__ew.store.getState().hud;
    const { surface: _query, ...water } = window.__carWater?.() ?? {};
    const w = water.episode === undefined ? null : water;
    const eye = p.bones?.[BONE.eyes];
    // The legacy eyes group is centered on the head's axis. Sample the face just below
    // eye level and at the front of its surface, using the posed head even when hidden by a roof.
    const face = point(eye ? eye.localToWorld(v.set(0, -0.04, 0.005))
      : p.head.localToWorld(v.set(0, -0.025, 0.25)));
    const player = { ...point(p.root.position), floor: floorY(p.root.position.x, p.root.position.z),
      surface: waterY(p.root.position.x, p.root.position.z, g.t),
      shown: p.root.visible, inView: visible(p.root) && project(face).visible,
      pose: p.anim, swimPose: p.swim, velocity: g.vel.length(), air: g.hop.air,
    };
    return finishSample(player, face, id, before, w, p, c, hud);
  }

  function finishSample(player, face, id, before, w, p, c, hud) {
    const r = id ? R.find(id) : R.riding;
    const car = r && { ...pose(r), id: r.id, object: r.mesh.uuid, kind: r.kind, speed: r.m.speed, pace: r.m.pace,
      yaw: r.m.yaw, steer: r.m.steer, top: r.m.top, floor: floorY(r.m.x, r.m.z), surface: waterY(r.m.x, r.m.z, g.t),
      depth: depth(r.m.x, r.m.z), onRoad: R.asphalt.has(r.m.x, r.m.z), dryGround: R.drivable.has(r.m.x, r.m.z),
      mesh: point(r.mesh.position), headingDrawn: r.mesh.rotation.y, pitch: r.mesh.rotation.x, roll: r.mesh.rotation.z,
      visible: visible(r.mesh) && project({ ...point(r.mesh.position), y: r.mesh.position.y + 0.55 }).visible };
    if (r && r.kind === "car") {
      car.wheels = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, f]) => {
        const p = local(car, a * 0.88 * car.wide / 0.95, f * 1.36 * car.half / 2.15);
        return { ...p, depth: depth(p.x, p.z), side: a };
      });
      const cornerImmersions = [-1, 1].flatMap(a => [-1, 1].map(f => {
        const q = r.mesh.localToWorld(v.set(a * car.wide, 0, f * car.half));
        return (waterY(q.x, q.z, g.t) ?? q.y) - q.y;
      }));
      car.immersion = Math.max(0, ...cornerImmersions);
      car.owners = r.owners.map(o => ({ ...point(o.ch.root.position), state: o.state, dry: supported(o.ch.root.position) }));
      if (w?.carDrops || w?.foamVisible) car.effects = effects(r, car, w);
    }
    const camera = point(c.position);
    face.surface = waterY(face.x, face.z, g.t);
    camera.surface = waterY(camera.x, camera.z, g.t);
    face.floor = floorY(face.x, face.z);
    camera.floor = floorY(camera.x, camera.z);
    const hit = R.crashes.last();
    return {
      now: performance.now(), time: g.t, before, serial: g.presentedWorld?.serial ?? null, scene: g.presentedWorld?.scene,
      zone: g.zone.id, quality: window.__ew.store.getState().settings.quality, car, water: w, player, face, camera,
      riding: R.riding?.id ?? null, ridePhase: R.riding ? R.phase : null, swim: g.swimming, dive: g.diveK,
      undersea: g.undersea.on, prompt: hud.prompt?.kind ?? null, nearest: g.nearest?.id ?? null, hudRide: hud.ride ?? null,
      hudPanel: hud.panel, brake: g.brake || g.keys.has(" "), stick: { x: g.joy.x, y: g.joy.y }, reservations: g.ambient.waterReservations.length,
      keys: [...g.keys],
      nearSame: !!r && R.near(p.root.position.x, p.root.position.z) === r,
      reach: r ? R.reach(r, p.root.position.x, p.root.position.z) : null,
      hit: hit ?? null, sameImpact: !!hit && hit === window.__carWaterDent?.impact,
      damage: r && R.crashes.info(r), crashDraws: R.crashes.stats().ownDraws, geometry: r?.mesh.children[0]?.geometry?.uuid ?? null,
      traffic: g.ambient.traffic.map(c => ({ id: c.index, uid: c.mesh.uuid, x: c.x, lane: c.lane, from: c.from, to: c.to,
        dir: c.dir, meshX: c.mesh.position.x, meshZ: c.mesh.position.z, visible: c.hidden <= 0,
        depth: depth(c.x, c.lane), onRoad: R.asphalt.has(c.mesh.position.x, c.mesh.position.z),
        configured: TRAFFIC_LANES.some(l => l.z === c.lane && Math.min(l.from, l.to) === c.from && Math.max(l.from, l.to) === c.to && l.dir === c.dir) })),
      boats: R.list.filter(q => q.kind === "boat").map(q => ({ ...pose(q), id: q.id, pace: q.m.pace,
        mesh: point(q.mesh.position), yaw: q.mesh.rotation.y, pitch: q.mesh.rotation.x, roll: q.mesh.rotation.z })),
    };
  }
  window.__carWaterTest = { town: ROAD_EDITION.id, depth, sample, clearance, controlsFrom, pointAndGo,
    support: (x, z) => ({ floor: floorY(x, z), depth: depth(x, z), surface: waterY(x, z, g.t) }) };
}

// All game-time advancement goes through frame(). CDP coordinates bypass Playwright's
// RAF-based actionability while still exercising the actual touch/pointer handlers.
class Run {
  constructor(page, cdp, phone, label) {
    Object.assign(this, { page, cdp, phone, label });
    this.trace = [];
    this.media = [];
    this.errors = [];
    this.chunks = [];
    this.downKeys = new Set();
    page.on("pageerror", e => this.errors.push(e.message));
    page.on("console", m => {
      if (m.type() === "error") this.errors.push(m.text());
    });
    page.on("request", req => {
      const path = new URL(req.url()).pathname;
      if (carChunk.test(path)) this.chunks.push(path);
      if (media.test(path) || req.resourceType() === "media") this.media.push(path);
    });
    page.on("response", res => {
      const path = new URL(res.url()).pathname;
      if (res.status() >= 400 && (media.test(path) || res.request().resourceType() === "media")) {
        this.errors.push(`missing media ${res.status()} ${path}`);
      }
    });
    page.on("requestfailed", req => {
      const path = new URL(req.url()).pathname;
      if (media.test(path) && req.failure()?.errorText !== "net::ERR_ABORTED") this.errors.push(`failed media ${path}: ${req.failure()?.errorText}`);
    });
  }

  async start(reload = false) {
    const chunkCount = this.chunks.length;
    if (reload) {
      delete this.id;
      delete this.safety;
      await this.page.reload({ waitUntil: "domcontentloaded", timeout: 120000 });
    } else {
      await this.page.addInitScript(installClock, [`${storage}-progress-v1`, JSON.stringify(progress)]);
      await this.page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
    }
    const expires = Date.now() + 120000;
    let ready;
    do {
      ready = await this.page.evaluate(ms => {
        window.__step(1, ms);
        const ew = window.__ew, g = ew?.game;
        return ew?.store.getState().screen === "play" && g?.zone?.id === "town" && g.ledges?.ready
          && !g.transitioning && g.carVisuals?.stats().parkedModels > 0 && g.carVisuals.stats().trafficModels > 0
          && g.crashShadersReady && g.presentedWorld?.scene === "town";
      }, quantum);
      if (!ready) await this.page.waitForTimeout(20);
    } while (!ready && Date.now() < expires);
    assert.ok(ready, "the low-quality Vite DEV town presented and finished loading");
    await this.page.evaluate(() => {
      window.__ew.coach?.finish?.();
      window.__ew.store.getState().setHud({ panel: null });
    });
    await this.page.evaluate(installReads);
    assert.equal(await this.page.evaluate(() => window.__carWaterTest.town), town, "server edition matches fixture and storage");
    assert.deepEqual(this.chunks.slice(chunkCount), [], "no startup car-water module requests");
    assert.equal(await this.page.evaluate(() => typeof window.__carWater), "undefined", "lazy hook absent at startup");
    this.traffic = null;
    this.lastTraffic = null;
    this.trafficProgress = 0;
    return this.frame();
  }

  async read() {
    return this.page.evaluate(id => window.__carWaterTest.sample(id), this.id);
  }

  async frame(ms = quantum) {
    const s = await this.page.evaluate(({ ms, id }) => {
      const before = window.__ew.game.renderer.info.render.frame;
      window.__step(1, ms);
      return window.__carWaterTest.sample(id, before);
    }, { ms, id: this.id });
    this.last = s;
    const { car: c, water: w, player: p } = s;
    this.trace.push([s.now.toFixed(1), s.ridePhase, s.riding, w?.band, w?.phase, w?.reason, w?.secondsLeft,
      c && [c.x, c.z, c.pace, c.mesh.y].map(x => +x.toFixed(3)), [p.x, p.y, p.z].map(x => +x.toFixed(3)), s.prompt,
      [s.face, s.camera].map(p => p.surface === null ? null : +(p.y - p.surface).toFixed(3)),
      w && [w.wakeSegments, w.bowVertices, w.carDrops, w.drainLive, w.fallbackReason]]);
    if (this.trace.length > 12) this.trace.shift();
    assert.equal(s.serial, s.before + 1, "one town presentation for each clock step");
    assert.equal(s.scene, "town");
    assert.equal(s.quality, "low");
    this.checkTraffic(s);
    this.moored?.push(s.boats);
    if (this.safety) this.checkSafety(s, ms);
    this.inspectFrame?.(s);
    return s;
  }

  checkTraffic(s) {
    assert.ok(s.traffic.length > 0 && new Set(s.traffic.map(c => c.id)).size === s.traffic.length, "sample every traffic car");
    const keys = s.traffic.map(c => [c.id, c.uid, c.lane, c.from, c.to, c.dir]);
    if (!this.traffic) this.traffic = keys;
    assert.deepEqual(keys, this.traffic, "traffic identities and lanes are stable");
    for (const [i, c] of s.traffic.entries()) {
      assert.ok(c.configured && Number.isFinite(c.x) && c.x >= c.from - 0.6 && c.x <= c.to + 0.6, `logical traffic lane ${JSON.stringify(c)}`);
      assert.equal(c.depth, 0, "traffic stays on dry road at its logical lane");
      if (c.visible) {
        close(c.meshZ, c.lane, 0.002, "visible traffic mesh z at the road lane");
        close(c.meshX, c.x, 0.002, "visible traffic mesh follows logical x");
        assert.ok(c.onRoad, "visible traffic mesh on asphalt");
      }
      const previous = this.lastTraffic?.[i], dx = previous ? (c.x - previous.x) * c.dir : 0;
      if (dx > 0 && dx < 1) this.trafficProgress += dx;
    }
    this.lastTraffic = s.traffic;
  }

  checkSafety(s, ms) {
    const a = this.safety, c = s.car, w = s.water;
    assert.ok(c?.kind === "car" && c.id === this.id, "tracked car still exists");
    assert.equal(c.object, a.object, "the same rendered car survived");
    for (const [name, p] of Object.entries({ feet: s.player, face: s.face, camera: s.camera, chassis: { ...c.mesh, floor: c.floor } })) {
      assert.ok([p.x, p.y, p.z, p.floor].every(Number.isFinite), `finite ${name} and bed`);
      assert.ok(p.y >= p.floor - 0.065, `${name} below bed: ${JSON.stringify(p)}`);
    }
    assert.ok([c.heading, c.headingDrawn, c.yaw, c.pitch, c.roll, c.speed, c.pace, c.steer, c.top].every(Number.isFinite), "finite car motion and rotation");
    close(gap(c, c.mesh), 0, 0.002, "drawn chassis matches accepted horizontal pose");
    close(turn(c.heading, c.headingDrawn), 0, 0.002, "drawn chassis heading matches motion");
    assert.ok(!s.swim && s.dive < 0.001 && !s.undersea && !s.player.air, "car episode keeps ordinary swim, dive and jump out");

    for (const name of ["face", "camera"]) {
      const peak = s[name].surface === null ? 0 : Math.max(0, s[name].surface - s[name].y);
      a.peak[name] = Math.max(a.peak[name], peak);
      if (peak > 0.002) a.under[name] ??= s.now;
      else if (a.under[name] !== undefined) {
        assert.ok(s.now - a.under[name] <= 200 + 0.001, `${name} continuously submerged through the preceding presentation`);
        delete a.under[name];
      }
      if (a.under[name] !== undefined) assert.ok(s.now - a.under[name] <= 200 + 0.001, `${name} continuously submerged`);
    }
    const contact = Math.max(c.depth, ...c.wheels.map(p => p.depth));
    if (contact > 0.0001 && a.released === undefined) {
      a.firstWet ??= s.now;
      assert.ok(w?.active, "geometric tire or body contact is tracked before handback");
    }
    if (w?.active) {
      assert.equal(w.id, this.id);
      assert.equal(w.episode, a.episode);
      const quantumMs = Math.min(50, ms);
      if (a.firstWet !== undefined) close(s.now - 1000 * w.wetAge, a.firstWet, quantumMs + 0.003, "wet clock agrees with first geometric contact");
      assert.ok(Math.abs(c.pitch) <= 0.142 && c.immersion <= 0.425, "chassis pitch and live corner immersion");
      if (s.camera.surface !== null) assert.ok(s.camera.y >= s.camera.surface + 0.345, "camera clearance at its own live surface");
      if (s.riding && s.face.surface !== null) assert.ok(s.face.y >= s.face.surface + 0.145, "seated face clearance");
      close(w.centreDepth, c.depth, 0.002, "reported depth agrees with floor and still surface");
      for (const [i, p] of c.wheels.entries()) close(w.wheelDepths[i], p.depth, 0.003, `displaced wheel ${i} depth`);
      assert.ok(w.carDrops <= 96, "pooled car drop bound");
      assert.ok(!w.ringVisible, "no ordinary wader ring during the car-water episode");
    }
    if (w?.secondsLeft != null) {
      assert.ok(ms <= 50, "a delayed presentation after suspension must already be back on land");
      a.trigger ??= w.reason === "exit" && a.exitInputAt !== undefined ? a.exitInputAt : s.now;
      a.deadline ??= s.now + 1000 * w.secondsLeft;
      close(s.now + 1000 * w.secondsLeft, a.deadline, 0.002, "return expiry does not move across inputs or detachment");
      assert.ok(a.deadline <= a.trigger + 3500.002, "return deadline is at most 3.50 s from its trigger");
      assert.ok(s.now <= a.deadline + 0.002, "an expired return cannot present");
      assert.ok(Math.abs(c.pace) <= 0.02, "propulsion arrested during return");
      if (a.previous?.water?.secondsLeft != null) assert.ok(gap(c, a.previous.car) <= 8 * ms / 1000 + 0.025, "swept tow movement at at most 8 m/s");
    } else if (a.trigger !== undefined && a.released === undefined) {
      a.released = s.now;
      assert.ok(a.firstWet !== undefined, "first contact sampled");
      if (ms <= 50) {
        assert.ok(a.released - a.trigger <= 3500 + ms + 0.002, "release within 3.50 s on the continuous clock");
        assert.ok(a.released - a.firstWet <= 7000 + ms + 0.002, "release within 7.00 s of contact");
      } else {
        assert.ok(a.previous.now < a.deadline && s.now > a.deadline, "the first resumed frame spans the pending deadline");
      }
      assert.ok(c.pace <= 0.02 && s.player.velocity <= 0.02, "car and learner have zero horizontal pace on handback");
    }
    const old = a.previous, limits = { shallow: [4.2, 2.6, 0.85], "body-deep": [2.1, 1.4, 0.45] }[w?.band];
    if (limits && w.phase === "driving") {
      assert.deepEqual([w.forwardCap, w.reverseCap, w.steerGain], limits, "wet drive settings");
      if (old?.water?.band === w.band && old.water.phase === "driving") {
        const cap = limits[c.speed < 0 ? 1 : 0], easing = Math.max(cap, old.car.pace - 18 * ms / 1000);
        assert.ok(c.pace <= easing + 0.025, "wet pace decelerates monotonically to the cap");
        assert.ok(gap(c, old.car) / (ms / 1000) <= easing + 0.045, "measured displacement is within the wet cap");
      }
    }
    a.previous = s;
  }

  async frames(count, ms = quantum) {
    const samples = [];
    for (let i = 0; i < count; i++) samples.push(await this.frame(ms));
    return samples;
  }

  async until(predicate, message, count = 360, ms = quantum) {
    for (let i = 0; i < count; i++) {
      const s = await this.frame(ms);
      if (predicate(s)) return s;
    }
    assert.fail(message);
  }

  async watch() {
    const s = await this.read();
    assert.ok(s.water?.id === this.id && s.water.enabled && !s.water.active, "sample from the admitted dry car before water contact");
    this.safety = { object: s.car.object, episode: s.water.episode, peak: { face: 0, camera: 0 }, under: {}, previous: s };
  }

  async control(selector, side = "right") {
    const target = await this.page.evaluate(({ selector, side }) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      const b = el.getBoundingClientRect(), x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
      const probes = [[x, y], [x - b.width / 4, y], [x + b.width / 4, y], [x, y - b.height / 4], [x, y + b.height / 4]];
      return { x, y, text: el.textContent.trim(), width: b.width, height: b.height,
        fits: b.left >= 0 && b.right <= innerWidth && b.top > innerHeight / 2 && b.bottom <= innerHeight
          && (side === "left" ? b.right < innerWidth / 2 : b.left > innerWidth / 2),
        clear: probes.every(([px, py]) => el.contains(document.elementFromPoint(px, py))) };
    }, { selector, side });
    assert.ok(target?.fits && target.clear && target.width >= 44 && target.height >= 44, `${selector} clear portrait touch bounds: ${JSON.stringify(target)}`);
    return target;
  }

  async act(text) {
    if (text === "Išlipti" && this.safety && this.safety.trigger === undefined) this.safety.exitInputAt = this.last.now;
    if (!this.phone) return this.page.keyboard.press("e");
    const point = await this.control(".act-btn");
    if (text) assert.equal(point.text, text);
    this.lastAction = point;
    await this.page.touchscreen.tap(point.x, point.y);
  }

  async key(key, on) {
    if (this.downKeys.has(key) === on) return;
    await this.page.keyboard[on ? "down" : "up"](key);
    if (on) this.downKeys.add(key);
    else this.downKeys.delete(key);
  }

  async touch(type, p) {
    await this.cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y, id: 1 }] : [] });
  }

  async drive(y = 0, x = 0) {
    if (!this.phone) {
      await this.key("w", y > 0);
      await this.key("s", y < 0);
      await this.key("a", x < 0);
      await this.key("d", x > 0);
    } else if (x || y) {
      if (!this.joy) {
        this.joy = await this.control(".joy", "left");
        await this.touch("touchStart", this.joy);
      }
      await this.touch("touchMove", { x: this.joy.x + 60 * x, y: this.joy.y - 60 * y });
    } else if (this.joy) {
      await this.touch("touchEnd");
      this.joy = null;
    }
  }

  async stop(on) {
    if (!this.phone) return this.key("Space", on);
    if (!on) return this.touch("touchEnd");
    const p = await this.control(".brake-btn");
    assert.equal(p.text, "STOP");
    await this.touch("touchStart", p);
  }

  async jump() {
    if (!this.phone) return this.page.keyboard.press("Space");
    const p = await this.control(".jump-btn");
    await this.page.touchscreen.tap(p.x, p.y);
  }

  async spawn([x, z, rot], zone = "town") {
    await this.page.evaluate(({ zone, x, z, rot }) => {
      const g = window.__ew.game;
      g.enterZone(zone, { x, z, rot }, true);
      g.rig.yaw = rot; g.rig.snap();
    }, { zone, x, z, rot });
  }

  async board(id, roofed = false) {
    this.id = id;
    const door = await this.page.evaluate(id => {
      const g = window.__ew.game, r = g.rides.find(id), h = r.m.heading;
      const d = r.model ? r.m.spec.wide + 0.7 : 2.2;
      return [r.m.x + Math.cos(h) * d, r.m.z - Math.sin(h) * d, h];
    }, id);
    await this.spawn(door);
    const outside = await this.until(s => s.prompt === "drive" && s.nearSame && s.nearest === id, "real car door prompt", 120);
    assert.ok(outside.player.shown && outside.reach > 0.35 && outside.reach <= 1.45);
    await this.act("Vairuoti");
    const entered = await this.until(s => s.riding === id && s.ridePhase === "in" && s.player.shown, "visible entry phase", 30);
    assert.equal(entered.riding, id);
    const board = await this.until(s => s.riding === id && s.ridePhase === "on" && s.water?.enabled && s.prompt === "out", "same car at the wheel with lazy water driver ready");
    assert.equal(board.player.shown, !roofed, "seated roof/convertible visibility");
    assert.ok(this.chunks.some(path => /carWaterRecovery/.test(path)), "boarding requested the lazy recovery module");
    return board;
  }

  async stage([x, z, rot]) {
    await this.page.evaluate(({ id, x, z, rot }) => {
      const g = window.__ew.game, r = g.rides.riding;
      if (r?.id !== id || g.rides.phase !== "on") throw new Error("stage an occupied town car");
      g.rides.resetPosition(r, { x, z, rot });
      g.rig.mode = "follow"; g.rig.stage = null;
      g.rideCourse = g.rig.yaw = rot;
      g.rig.target.set(x, 0, z); g.rig.snap();
    }, { id: this.id, x, z, rot });
  }

  async clearance(foot, obstacleTag) {
    return this.page.evaluate(({ id, foot, obstacleTag }) => window.__carWaterTest.clearance(id, foot, obstacleTag),
      { id: this.id, foot, obstacleTag });
  }

  async drawDelta() {
    const measured = await this.page.evaluate(() => {
      const g = window.__ew.game, { renderer, scene, rig: { cam } } = g;
      const objects = ["car-water-foam", "water-drops"].map(n => scene.getObjectByName(n)).filter(Boolean);
      const shown = objects.map(o => o.visible);
      const otherDrops = g.splashes.life.some((life, i) => life > 0 && !g.splashes.carKinds?.[i]);
      const frozen = () => JSON.stringify([g.t, cam.position.toArray(), cam.quaternion.toArray(), cam.projectionMatrix.elements,
        renderer.shadowMap.enabled, scene.uuid, g.rides.crashes.stats(), g.rides.crashes.last()]);
      const original = frozen();
      const render = () => { renderer.render(scene, cam); return renderer.info.render.calls; };
      const withEffects = render();
      let withoutEffects, restored;
      try {
        for (const obj of objects) obj.visible = false;
        withoutEffects = render();
      } finally {
        objects.forEach((obj, i) => { obj.visible = shown[i]; });
        restored = render();
      }
      return { withEffects, withoutEffects, restored, otherDrops, frozen: original === frozen() };
    });
    assert.ok(measured.frozen && !measured.otherDrops && measured.withEffects > 0, "frozen frame, no unrelated shared points");
    assert.equal(measured.restored, measured.withEffects, "the same presentation after restoring effect visibility");
    return measured.withEffects - measured.withoutEffects;
  }

  log(details) {
    console.log(this.label, JSON.stringify({ ...details, trafficProgress: this.trafficProgress, peakSubmersion: this.safety?.peak }));
  }
}

const convertible = "park";
const recovering = s => s.water?.secondsLeft != null;
const released = s => !s.water?.active && !recovering(s);

async function roadStart(run, road) {
  await run.stage(road);
  const s = await run.frame();
  assert.ok(s.car.onRoad && s.car.dryGround && s.car.depth === 0 && s.water.enabled && s.water.band === "dry");
  close(s.car.x, road[0], 0.002, "start on Harbor Road x");
  close(s.car.z, road[1], 0.002, "start on Harbor Road z");
  await run.watch();
}

async function assertDryPair(run, s, { onFoot = false, obstacleTag } = {}) {
  const pair = s.water?.landingPair;
  assert.ok(pair && pair.foot && pair.pose, "a returned car has a dry candidate and exit");
  assert.ok(s.car.visible && s.car.pace <= 0.02, "visible and stopped at the handback");
  close(gap(s.car, pair.pose), 0, 0.01, "parked mesh at the reported landing");
  const clear = await run.clearance(onFoot ? null : pair.foot, obstacleTag);
  assert.ok(clear.car && clear.foot && clear.carClear && clear.footClear, `dry mainland support and independent clearance ${JSON.stringify(clear)}`);
  assert.ok(clear.reach >= 0.35 && clear.reach <= 1.45, `door reach ${clear.reach}`);
  close(s.car.mesh.y, clear.carFloor, 0.035, "car supported on the mainland");
  if (onFoot) {
    assert.ok(s.riding === null && s.player.shown && s.player.inView && clear.sameNear, "actual visible learner on foot and near the same car");
    close(s.player.y, clear.floor, 0.02, "feet on dry mainland");
    close(gap(s.player, pair.foot), 0, 0.04, "learner arrived at the paired step");
  } else assert.equal(s.riding, run.id, "seated handback stays in the same car");
  if (obstacleTag) assert.ok(clear.obstacleClear, "neither car footprint nor foot circle overlaps the injected obstruction");
}

async function finish(run, options) {
  const landing = await run.until(released, "the return handed back control on the original clock", 225, options?.ms);
  await assertDryPair(run, landing, options);
  const rest = await run.frames(Math.ceil(750 / (options?.ms ?? quantum)), options?.ms);
  for (const s of rest) assert.ok(released(s) && gap(s.car, landing.car) < 0.02, "stable handback for at least 0.75 s");
  const { trigger, firstWet, released: end } = run.safety;
  assert.ok(Number.isFinite(trigger) && Number.isFinite(firstWet) && end === landing.now, "sampled trigger, first contact and release");
  run.log({ returnMs: end - trigger, wetToReleaseMs: end - firstWet, landing: landing.water.landing,
    fallbackReason: landing.water.fallbackReason, release: [landing.car.x, landing.car.z] });
  return landing;
}

async function dryExit(run, roofed) {
  // Retain the safety sampler for the exterior exit and reboarding.
  await run.until(s => s.prompt === "out", "dry Išlipti prompt returned");
  await run.act("Išlipti");
  const door = await run.frame();
  assert.ok(door.ridePhase === "out" && door.player.shown && (!roofed || door.reach > 0),
    "exterior dry exit, with the roofed driver immediately unhidden at the door");
  const foot = await run.until(s => s.riding === null && s.nearSame, "dry exit ends on foot within real reboarding reach");
  const clear = await run.clearance();
  assert.ok(foot.player.shown && clear.foot && clear.footClear && clear.sameNear && clear.reach >= 0.35 && clear.reach <= 1.45);
  close(foot.player.y, clear.floor, 0.02, "ordinary dry exit feet");
  return foot;
}

async function reboardInland(run, roofed) {
  await run.until(s => s.prompt === "drive" && s.nearSame && s.nearest === run.id, "same recovered car offered by the normal prompt");
  await run.act("Vairuoti");
  const placed = await run.until(s => s.riding === run.id && s.ridePhase === "on" && s.water?.enabled, "normal reboarding of the recovered id");
  assert.equal(placed.player.shown, !roofed);
  assert.ok(Math.abs(Math.cos(placed.car.heading)) > 0.5, "car can drive or reverse inland");
  await run.drive(Math.sign(Math.cos(placed.car.heading)));
  const driven = await run.until(s => s.car.z >= placed.car.z + 2 && s.car.pace > 1.5, "at least two real metres inland");
  assert.ok(driven.car.floor >= -0.01 && driven.car.depth === 0 && driven.car.object === placed.car.object);
  await run.drive();
  run.log({ reboarded: placed.car.id, inlandMetres: driven.car.z - placed.car.z });
}

function monitorBoats(frames) {
  const boats = frames[0];
  assert.ok(boats.length >= 2 && new Set(boats.map(b => b.id)).size === boats.length, "all moored boats sampled");
  for (const frame of frames) {
    assert.deepEqual(frame.map(b => b.id), boats.map(b => b.id), "stable moored boat ids");
    for (const [i, b] of frame.entries()) {
      close(gap(b, boats[i]), 0, 0.002, "moored boat did not translate");
      close(gap(b, b.mesh), 0, 0.002, "moored hull is at its logical spot");
      close(turn(b.heading, boats[i].heading), 0, 0.002, "moored boat did not turn");
      close(turn(b.yaw, b.heading), 0, 0.002, "moored hull yaw");
      assert.ok(b.pace === 0 && Math.abs(b.pitch) <= 0.035 && Math.abs(b.roll) <= 0.05);
    }
  }
  const bobs = boats.map((_, i) => range(frames.map(f => f[i].mesh.y)));
  assert.ok(bobs.every(y => y >= 0 && y < 0.65) && bobs.some(y => y > 0.02), "gentle actual bob of the moored hulls");
}

async function boatTrip(run) {
  delete run.safety;
  run.id = site.boat;
  run.inspectFrame = s => assert.ok(!s.water?.active && s.water?.id == null && s.reservations === 0,
    "car-water remains inactive throughout ordinary boating, swimming and diving");
  await run.spawn(site.beach);
  await run.until(s => s.prompt === "boat" && s.nearest === site.boat, "real beach boat prompt");
  await run.act("Plaukti");
  const aboard = await run.until(s => s.riding === site.boat && s.ridePhase === "on" && !s.swim, "boards existing motorboat");
  await run.drive(1);
  const afloat = await run.until(s => s.car.z < site.wadingLimit - 7 && s.car.pace > 2, "boat runs out into the bay under power");
  assert.ok(gap(aboard.car, afloat.car) > 8 && afloat.car.visible, "real moving hull");
  await run.drive();
  await run.until(s => s.prompt === "out", "boat exit prompt");
  await run.act("Išlipti");
  const swimming = await run.until(s => s.riding === null && s.swim && s.hudRide === "swim", "ordinary swim after boat exit");
  assert.ok(swimming.player.shown && swimming.water?.active !== true);
  await run.jump();
  const diving = await run.until(s => s.dive > 0.95 && s.undersea, "ordinary dive after the car episode");
  assert.ok(diving.camera.surface - diving.camera.y > 0.12 && !diving.water?.active && diving.water?.id == null);
  await run.jump();
  await run.until(s => s.dive < 0.001 && !s.undersea && s.swim, "ordinary resurfacing");
  delete run.inspectFrame;
  run.log({ boat: afloat.car.id, boatMetres: gap(aboard.car, afloat.car), dive: diving.dive });
}

async function mainTrip(run) {
  const references = await run.page.evaluate(({ x, depths }) => depths.map(([z]) => window.__carWaterTest.depth(x, z)),
    { x: site.road[0], depths: site.depths });
  site.depths.forEach(([z, expected], i) => close(references[i], expected, 0.008, `independent still depth at z=${z}`));
  const boarded = await run.board(convertible);
  assert.ok(boarded.car.owners.length > 0 && boarded.car.owners.every(o => o.state !== "in" && o.dry), "owners stepped ashore");
  await run.until(s => s.car.owners.every(o => o.state !== "hop-out" && o.state !== "in"), "owners are down on the curb");
  await roadStart(run, site.road);
  run.moored = [run.last.boats];
  run.inspectFrame = s => assert.ok(s.player.shown && s.riding === run.id && s.ridePhase === "on"
    && s.car.owners.every(o => o.state !== "in" && o.dry), "visible convertible driver with owners ashore throughout recovery");
  const samples = [run.last], bands = [], paces = {}, drawDeltas = {};
  let trigger, sprayEvents = 0, wakeAtBow = [], firstBow, firstSpray, wetSteps = 0;
  const splashBaseline = run.last.water.splashEvents;
  await run.drive(1);
  for (let i = 0; i < 480; i++) {
    const s = await run.frame(), c = s.car, w = s.water, previous = samples.at(-1);
    samples.push(s);
    if (run.phone) assert.ok(s.stick.y > 0.96 && Math.abs(s.stick.x) < 0.02, "continuous physical joystick input");
    close(c.x, site.road[0], 0.85, "continuous straight path down the fixture");
    const step = gap(c, previous.car);
    assert.ok(step <= Math.max(c.pace, previous.car.pace) * quantum / 1000 + 0.08 && c.z <= previous.car.z + 0.02, "physical step toward water");
    if (bands.at(-1) !== w.band) bands.push(w.band);
    if (recovering(s)) { trigger = s; break; }
    if (w.band !== "dry") wetSteps++;
    const actual = step * 1000 / quantum;
    const bandPace = paces[w.band] ??= { peak: 0, measured: 0, capped: [] };
    bandPace.peak = Math.max(bandPace.peak, c.pace);
    bandPace.measured = Math.max(bandPace.measured, actual);
    if (w.forwardCap !== null && c.pace <= w.forwardCap + 0.025) bandPace.capped.push(Math.max(c.pace, actual));
    if (w.sprayEvents > sprayEvents) {
      assert.ok(w.lastSpray, "recorded emitter on the presented fan frame");
      const tire = c.wheels.find(p => p.side === w.lastSpray.side && gap(p, w.lastSpray) < 0.014);
      assert.ok(tire && tire.depth >= 0.025 && w.pointsVisible, "fan emitted at the accepted displaced wet tire");
      const surf = await run.page.evaluate(({ x, z }) => window.__carWaterTest.support(x, z).surface, w.lastSpray);
      close(w.lastSpray.y, surf, 0.005, "spray origin at the live surface");
      if (c.effects?.spray > 0 && w.band === "shallow" && firstSpray === undefined) {
        firstSpray = s.now;
        drawDeltas.spray = await run.drawDelta();
        assert.ok(drawDeltas.spray >= 1 && drawDeltas.spray <= 2, "visible spray contributes at most two effect draws");
      }
      sprayEvents = w.sprayEvents;
    }
    const wake = c.effects?.wake;
    if (w.band === "shallow" && wake?.onScreen > 0 && wake.fore < -0.75 && !w.bowVertices) {
      wakeAtBow.push({ segments: w.wakeSegments, length: wake.fore - wake.aft, at: s.now });
    }
    const bow = c.effects?.bow ?? [];
    if (!firstBow && bow.some(p => p.visible && p.above >= 0.065 && Math.abs(p.along - c.half - 0.12) < 0.09 && Math.abs(p.across) < 0.12
      && p.nosePixels < 70) && bow.some(p => p.visible && p.across > c.wide) && bow.some(p => p.visible && p.across < -c.wide)) {
      assert.equal(w.band, "body-deep", "raised bow appears at body depth");
      firstBow = s.now;
      drawDeltas.bow = await run.drawDelta();
      assert.ok(drawDeltas.bow >= 1 && drawDeltas.bow <= 2, "raised crest and spray share the two-draw budget");
    }
  }
  run.log({ bands, approachMs: samples.at(-1).now - samples[0].now, paces: Object.fromEntries(Object.entries(paces)
    .map(([band, p]) => [band, { peak: p.peak, measured: p.measured, settled: p.capped.length ? Math.max(...p.capped) : null }])), drawDeltas });
  assert.ok(trigger, "the car reached a float latch under continuous input");
  assert.deepEqual(bands, ["dry", "shallow", "body-deep", "float"]);
  assert.ok(wetSteps >= 15 && trigger.car.z < site.wadingLimit && trigger.car.z < site.oldClamp - 5, "crossed the old clamp and wading limit by driving");
  assert.equal(trigger.water.reason, "depth");
  assert.equal(trigger.water.phase, "float");
  const wheels = trigger.car.wheels;
  assert.ok(Math.max(trigger.car.depth, Math.min(wheels[0].depth, wheels[1].depth), Math.min(wheels[2].depth, wheels[3].depth)) >= 0.85, "real centre or both axle wheels at float depth");
  assert.ok(paces.dry.peak > 4.4 && paces.dry.measured > 4.4);
  for (const [band, cap] of [["shallow", 4.4], ["body-deep", 2.3]]) {
    assert.ok(paces[band].capped.length >= 5 && Math.max(...paces[band].capped) <= cap
      && Math.max(...paces[band].capped) < paces.dry.measured, `${band} pace under sustained input after deceleration`);
  }
  assert.ok(firstSpray < firstBow && wakeAtBow.length > 2 && wakeAtBow.some((w, i) => i > 0 && w.at < firstBow
    && w.length > wakeAtBow[0].length + 0.12 && w.segments > wakeAtBow[0].segments), "visible trailing wheel ribbons grew before the leading crest");
  const body = samples.filter(s => s.water.band === "body-deep");
  assert.ok(body.some(s => s.water.motorMiss && s.water.motorRevs < 0.12)
    && body.some(s => !s.water.motorMiss && s.water.motorRevs > 0.25) && trigger.water.sputterEvents > 0
    && trigger.water.splashEvents > splashBaseline, "live motor drops and returns under body load, with real splash events");

  await run.drive();
  let drain, settle, tow;
  const floats = [];
  for (let i = 0; i < 220; i++) {
    const s = await run.frame();
    if (!recovering(s)) { assert.fail("release must follow a sampled visible settle and draining doors"); }
    samples.push(s);
    if (s.water.phase === "float") floats.push(s);
    if (s.water.phase === "tow") tow ??= s;
    if (s.water.phase === "settle") settle ??= s;
    if (s.water.phase === "settle" && s.car.effects?.streams.every(n => n >= 1) && s.water.drainLive >= 2) {
      drain = s;
      drawDeltas.drain = await run.drawDelta();
      assert.ok(drawDeltas.drain >= 1 && drawDeltas.drain <= 2, "both falling door streams are in the Points draw");
      break;
    }
  }
  assert.ok(tow && settle && drain && drain.water.drainEmissions >= 4, "sampled an actual tow, dry settle and two door streams");
  assert.ok(gap(trigger.car, settle.car) >= 4 && settle.car.z > trigger.car.z && settle.car.visible);
  assert.ok(floats.length >= 20 && floats.some(s => s.car.pitch < -0.055) && floats.every(s => gap(s.car, trigger.car) < 0.025)
    && range(floats.map(s => s.car.mesh.y - s.car.surface)) > 0.035, "actual nose lift and bob relative to the changing surface");
  assert.ok((await run.clearance(settle.water.landingPair.foot)).car, "the visible drain happens over dry mainland");
  const coughs = await run.until(s => s.water.coughEvents >= 2 && s.water.phase === "settle", "double cough before release", 34);
  assert.ok(coughs.water.motorRevs > 0, "dry cough moved the seated motor");
  const landing = await finish(run);
  assert.equal(landing.water.landing, "trail", "normal approach uses its dry return corridor");
  monitorBoats(run.moored);
  delete run.moored;
  assert.ok(run.last.water.carDrops === 0 && run.last.water.wakeSegments === 0 && run.last.water.drainLive === 0);
  drawDeltas.idle = await run.drawDelta();
  assert.equal(drawDeltas.idle, 0, "zero idle effect draws once the trail and drain expire");
  run.log({ drawDeltas, floatMs: floats.at(-1).now - trigger.now, coastZ: trigger.car.z });
  delete run.inspectFrame;
  await dryExit(run, false);
  await reboardInland(run, false);
  await boatTrip(run);
}

async function steering(run, wet) {
  await run.board(convertible);
  const start = wet ? site.wetTurn : site.dryTurn, band = wet ? "body-deep" : "dry";
  await run.watch();
  await run.stage(start);
  const settled = await run.frames(12);
  assert.ok(settled.every(s => s.water.band === band && !recovering(s) && s.car.pace < 0.02), "shore-parallel setup settles in the matched band");
  if (wet) assert.ok(settled.at(-1).car.depth >= 0.34 && settled.at(-1).car.wheels.every(p => p.depth > 0.3));
  const input = await run.page.evaluate(() => {
    const { game: g } = window.__ew, { controlsFrom, pointAndGo } = window.__carWaterTest;
    const m = g.rides.riding.m;
    m.speed = 1.6; // Matched initial velocity is confined to this trial.
    // Use point-and-go's world heading reference at the wheel, independent of camera drift.
    // The car stick is direct, so invert its production controls map to give each band the same command.
    const target = pointAndGo(m.heading, m.heading - 0.7, 1, m.speed, false);
    const x = target.steer / 1.25, y = target.throttle / 1.15;
    return { x, y, target, command: controlsFrom(x, y), startHeading: m.heading };
  });
  const before = await run.read();
  close(before.car.pace, 1.6, 0.1, "matched start pace");
  close(input.command.throttle, input.target.throttle, 1e-9, "equivalent point-and-go throttle");
  close(input.command.steer, input.target.steer, 1e-9, "equivalent point-and-go steering");
  assert.ok(Math.hypot(input.x, input.y) < 1);
  await run.drive(run.phone ? input.y : 1, run.phone ? input.x : 1);
  const frames = await run.frames(15);
  await run.drive();
  assert.ok(frames.every(s => s.water.band === band && !recovering(s)), "turn stays on the same surface for all 15 frames");
  if (run.phone) for (const s of frames) {
    close(s.stick.x, input.x, 0.015, "same physical stick turn");
    close(s.stick.y, input.y, 0.015, "same physical stick throttle");
  }
  let angle = 0, heading = input.startHeading;
  for (const s of frames) { angle += turn(s.car.heading, heading); heading = s.car.heading; }
  const peakYaw = Math.max(...frames.map(s => Math.abs(s.car.yaw)));
  const result = { angle, peakYaw, startPace: before.car.pace, ms: frames.at(-1).now - before.now,
    controls: run.phone ? input.command : { throttle: 1, steer: 1, brake: false } };
  assert.ok(Math.abs(angle) > 0.005 && peakYaw > 0.02 && gap(frames.at(-1).car, before.car) > 0.25, "nonzero turn, yaw and travel");
  run.log(result);

  if (wet) {
    // Finish this wet episode normally so the sampler includes the entire body-depth trial and handback.
    await run.act("Išlipti");
    await run.until(s => recovering(s) && s.riding === null, "exit the body-depth steering fixture");
    await finish(run, { onFoot: true });
  }
  return result;
}

async function damagedTrip(run) {
  const id = site.crashCar;
  await run.board(id, true);
  await run.page.evaluate(id => {
    const r = window.__ew.game.rides.find(id);
    const original = r.mesh.children[0].geometry;
    window.__carWaterDent = { original, originalPositions: original.attributes.position.array.slice() };
  }, id);
  await run.stage(site.warehouse);
  await run.drive(1);
  const hit = await run.until(s => s.hit?.id === id && s.hit.k > 0.3 && s.car.x > 133 && s.car.x < 136 && s.damage?.scuffs, "hard warehouse dent from crash.mjs");
  await run.drive();
  assert.ok(hit.hit.target === "town" && hit.damage.sides.includes("front") && hit.damage.hazards
    && hit.damage.crackedLamps.includes("front-right") && hit.damage.bumperHanging, "real hard front-corner dent");
  const dents = await run.page.evaluate(id => {
    const R = window.__ew.game.rides, geom = R.find(id).mesh.children[0].geometry;
    const f = window.__carWaterDent;
    f.damaged = geom; f.positions = geom.attributes.position.array.slice(); f.impact = R.crashes.last();
    return { original: f.original.uuid, dented: geom.uuid, changed: f.originalPositions.length !== f.positions.length
      || f.positions.some((x, i) => Math.abs(x - f.originalPositions[i]) > 0.001) };
  }, id);
  assert.ok(dents.original !== dents.dented && dents.changed, "real rendered dent vertices before the drive");
  await roadStart(run, site.east);
  const identity = run.last.car.object;
  const checkDent = s => {
    assert.equal(s.car.object, identity);
    assert.ok(s.sameImpact, "no new impact");
    assert.equal(s.geometry, dents.dented, "same dented body geometry");
    assert.ok(s.crashDraws <= 4, "at most four unbatched damage draws");
    assert.deepEqual(s.damage?.sides, hit.damage.sides);
    assert.equal(s.damage?.dentCount, hit.damage.dentCount);
    if (s.ridePhase === "on") assert.ok(!s.player.shown, "roof conceals the driver while seated");
  };
  run.inspectFrame = checkDent;
  await run.drive(1);
  await run.until(s => s.water.band === "body-deep" && s.car.effects?.bow.length > 0, "dented body and bow effects in the same frame");
  const damagedDrawDelta = await run.drawDelta();
  assert.ok(damagedDrawDelta >= 1 && damagedDrawDelta <= 2, "car-water draw budget with the dent still rendered");
  const trigger = await run.until(recovering, "the damaged car reaches real water recovery");
  assert.equal(trigger.water.reason, "depth");
  await run.drive();
  const landing = await finish(run);
  await dryExit(run, true);
  await reboardInland(run, true);
  assert.ok(await run.page.evaluate(id => {
    const geom = window.__ew.game.rides.find(id).mesh.children[0].geometry;
    const f = window.__carWaterDent, a = geom.attributes.position.array;
    return geom === f.damaged && a.length === f.positions.length && a.every((x, i) => x === f.positions[i]);
  }, id), "the dent's vertex buffer survived real driving and recovery");
  assert.ok(run.last.now - hit.now < 15000, "dent checked inside normal aging time");
  run.log({ impact: hit.hit, damage: landing.damage, dentGeometry: dents.dented, damagedDrawDelta });
}

async function assistedTrip(run, deep) {
  await run.board(convertible);
  await roadStart(run, deep ? site.west : site.east);
  await run.drive(1);
  const want = deep ? s => s.water.phase === "float" && s.water.age >= 0.12
    : s => s.water.band === "shallow" && s.car.depth > 0.11 && s.car.pace > 2.3;
  const before = await run.until(want, deep ? "float before tow" : "shallow motion before exit");
  assert.equal(before.prompt, "out");
  if (deep) assert.equal(before.water.reason, "depth");
  const originalDeadline = deep ? before.now + before.water.secondsLeft * 1000 : null;
  await run.drive();
  if (deep) {
    await run.stop(true);
    const held = await run.frames(5);
    assert.ok(held.every(s => s.brake && s.water.phase === "float" && s.car.pace < 0.02), "real brake held during the float beat");
    await run.stop(false);
  }
  await run.act("Išlipti");
  const exited = await run.frame();
  assert.ok(exited.riding === null && exited.player.shown && exited.player.inView && exited.water.assistedOnFoot && recovering(exited),
    "the first presented frame is visibly on foot and the car's return continues");
  assert.equal(exited.water.id, run.id);
  assert.equal(exited.water.episode, before.water.episode);
  assert.ok(exited.reach >= 0.35 && exited.reach <= 1.45, "the learner is outside the wet sill");
  assert.equal(exited.water.reason, deep ? "depth" : "exit");
  if (deep) {
    close(exited.now + exited.water.secondsLeft * 1000, originalDeadline, 0.002, "mid-float exit keeps the original deadline");
  }
  const footDepth = (exited.player.surface ?? exited.player.floor) - exited.player.floor;
  if (footDepth > 0.59) {
    assert.ok(exited.player.swimPose > 0.8 && exited.player.y < exited.player.surface
      && exited.player.y >= Math.max(exited.player.floor, exited.player.surface - 0.8) - 0.005, "assisted treading at the live surface");
  } else if (footDepth < 0.57) {
    close(exited.player.y, exited.player.floor, 0.03, "feet wading on the bed");
    assert.ok(exited.player.swimPose < 0.2);
  } else {
    assert.ok(exited.player.y >= exited.player.floor - 0.01 && [0, 1].includes(exited.player.swimPose));
  }

  const assertDetached = s => assert.ok(s.riding === null && s.player.shown && s.water.assistedOnFoot && recovering(s)
    && s.water.episode === before.water.episode && !s.player.air, "inputs cannot cancel the assisted return or jump/reboard");
  for (let i = 0; i < 3; i++) {
    if (run.phone) {
      assert.equal(await run.page.locator(".act-btn").count(), 0, "action unavailable during assisted return");
      await run.page.touchscreen.tap(run.lastAction.x, run.lastAction.y);
    } else await run.page.keyboard.press("e");
    assertDetached(await run.frame());
  }
  await run.jump();
  assertDetached(await run.frame());
  await run.drive(0.60, 0.62);
  if (!run.phone) await run.stop(true);
  for (const s of await run.frames(12)) {
    assertDetached(s);
    assert.ok(run.phone ? s.stick.x > 0.5 : s.keys.includes("d"), "steer input really reaches the game while assisted");
  }
  await run.drive();
  if (!run.phone) await run.stop(false);
  const handback = await finish(run, { onFoot: true });
  assert.ok(gap(handback.car, exited.car) >= 3, "assisted exit returned both bodies to land");
  delete run.safety;
  await reboardInland(run, false);
}

async function pierRail(run) {
  await run.board(convertible);
  const support = await run.page.evaluate(([x, z]) => window.__carWaterTest.support(x, z), site.deck);
  assert.equal(support.floor, 0.3);
  assert.equal(support.depth, 0);
  assert.notEqual(support.surface, null, "boards support the car over actual water");
  await run.stage(site.deck);
  await run.watch();
  const at = await run.frame();
  assert.ok(at.water.band === "dry" && at.car.wheels.every(p => p.depth === 0));
  close(at.car.mesh.y, 0.3, 0.02, "real deck supports the chassis");
  const rail = await run.page.evaluate(([x, z]) => {
    const boxes = window.__ew.game.town.colliders.boxes;
    return boxes.find(b => b.tag !== "sea" && b.minX > x && b.minX < x + 3 && z >= b.minZ && z <= b.maxZ);
  }, site.deck);
  assert.ok(rail, "the pier has its real solid side rail");
  await run.drive(1);
  const frames = await run.frames(52);
  await run.drive();
  assert.ok(Math.max(...frames.map(s => s.car.x)) > at.car.x + 0.15, "actually moved toward the solid rail");
  assert.ok(frames.every(s => !s.water.active && s.water.band === "dry" && s.car.mesh.y >= 0.26
    && s.car.z < rail.maxZ && s.car.wheels.every(p => p.x <= rail.minX + 0.03)), "car and tires remain on the solid side of the rail");
  assert.ok(frames.slice(-10).some(s => s.car.pace < 0.6) || Math.abs(frames.at(-1).car.x - frames.at(-10).car.x) < 0.06,
    "rail stops travel through its edge under sustained physical throttle");
  run.log({ deck: support, maxPierX: Math.max(...frames.map(s => s.car.x)), rail: rail.minX });
}

async function abruptLip(run) {
  await run.board(convertible);
  const wall = await run.page.evaluate(([x, z]) => window.__ew.game.town.colliders.boxes
    .find(b => b.tag !== "sea" && x > b.minX && x < b.maxX && b.minZ > z && b.maxZ < z + 3), site.lip);
  assert.ok(wall && wall.maxX - wall.minX >= 10, "real solid back lip");
  await run.watch();
  await run.stage(site.lip);
  await run.drive(-1);
  const first = await run.frame();
  assert.ok(first.car.depth >= 0.85 && first.water.reason === "depth" && first.water.phase === "float", "abrupt drop detected on first frame beyond the real lip");
  assert.ok(first.car.z + first.car.half <= wall.minZ + 0.02, "staged hull is on the water side, clear of the back wall");
  const reversal = await run.frames(24);
  assert.ok(reversal.every(s => s.car.pace <= 0.02 && gap(s.car, first.car) < 0.02), "reverse cannot override a real deep-water latch");
  await run.drive();
  const land = await finish(run);
  assert.ok(land.water.fallback && land.water.fallbackReason === "no-corridor" && gap(land.car, first.car) > 5);
}

async function voluntaryReverse(run) {
  await run.board(convertible);
  await run.watch();
  await run.stage(site.reverse);
  const wet = await run.frame();
  assert.ok(wet.water.active && wet.water.band === "shallow" && wet.car.depth > 0.15, "start in real shallows");
  await run.drive(-1);
  let minSpeed = 0;
  const dry = await run.until(s => {
    assert.ok(!recovering(s), "backing clear of the beach is voluntary");
    if (s.water.active) minSpeed = Math.min(minSpeed, s.car.speed);
    return released(s);
  }, "clear the beach before the wet deadline");
  await run.drive();
  assert.ok(minSpeed < -1.5 && dry.car.z - wet.car.z >= 4 && dry.car.depth === 0 && dry.car.wheels.every(p => p.depth === 0));
  await run.frames(45);
  run.log({ voluntaryReverse: dry.car.z - wet.car.z, wetReverseSpeed: minSpeed, escapeMs: dry.now - wet.now });
}

async function inactivity(run) {
  const ms = 50;
  await run.board(convertible);
  await roadStart(run, site.west);
  await run.drive(1);
  await run.until(s => s.water.band === "shallow" && s.car.depth > 0.09 && s.car.pace >= 2.3, "moving shallow approach", 180, ms);
  await run.drive();
  await run.stop(true);
  const braked = await run.until(s => s.car.pace < 0.05, "real STOP/brake arrests the car in ankle water", 24, ms);
  assert.ok(braked.brake && braked.water.band === "shallow" && braked.water.active && braked.car.depth >= 0.05);
  const held = await run.frames(10, ms);
  assert.ok(held.every(s => s.brake && s.car.pace < 0.05 && gap(s.car, braked.car) < 0.02 && !recovering(s)));
  await run.stop(false);
  if (run.phone) {
    const map = await run.page.locator(".minimap").boundingBox();
    assert.ok(map && map.width >= 44 && map.height >= 44, "real minimap touch target");
    await run.page.touchscreen.tap(map.x + map.width / 2, map.y + map.height / 2);
  } else await run.page.keyboard.press("m");
  const panel = await run.frame(ms);
  assert.ok(panel.hudPanel === "map" && !panel.brake && !panel.stick.x && !panel.stick.y, "map open with controls released");
  const trigger = await run.until(recovering, "continuous-wet deadline fires behind an open panel", 90, ms);
  assert.equal(trigger.water.reason, "wet-limit");
  close(trigger.now - run.safety.firstWet, 3500, ms + 0.003, "wet limit at 3.50 s on the 50 ms clock");
  assert.ok(trigger.hudPanel === "map" && gap(trigger.car, braked.car) < 0.05);
  const landed = await finish(run, { ms });
  assert.equal(landed.hudPanel, "map", "the open panel did not delay the handback");
  await run.page.keyboard.press("Escape");
  assert.equal((await run.frame(ms)).hudPanel, null);
}

async function pausedFallback(run) {
  await run.board(convertible);
  await run.watch();
  await run.stage(site.offshore);
  const first = await run.frame();
  assert.equal(first.water.reason, "depth");
  await run.act("Išlipti");
  const detached = await run.frame();
  assert.ok(detached.riding === null && detached.water.assistedOnFoot && detached.player.swimPose > 0.8);
  const [primary, emergency] = detached.water.spares;
  assert.ok(primary && emergency && gap(primary, emergency) >= 9, "observe distinct cached primary and emergency candidates");
  const tag = "car-water-browser-obstruction";
  await run.page.evaluate(({ primary, tag }) => window.__ew.game.town.colliders.addBox(primary.x, primary.z, 2, 2, tag), { primary, tag });
  try {
    const jumped = await run.frame(3601);
    assert.ok(jumped.now > run.safety.deadline && released(jumped), "elapsed deadline resolved on the first resumed presentation");
    assert.equal(jumped.water.reason, "depth", "original hazard retained");
    assert.equal(jumped.water.landing, "spare");
    assert.equal(jumped.water.fallbackReason, "no-corridor");
    assert.ok(jumped.water.fallback && gap(jumped.car, primary) >= 5 && gap(jumped.car, emergency) < 0.01,
      "obstructed primary was rejected and the emergency spare used");
    await assertDryPair(run, jumped, { onFoot: true, obstacleTag: tag });
    await run.frames(45);
    run.log({ pausedMs: jumped.now - detached.now, firstResumed: jumped.serial, fallbackReason: jumped.water.fallbackReason,
      rejected: [primary.x, primary.z], landed: [jumped.car.x, jumped.car.z] });
  } finally {
    await run.page.evaluate(tag => {
      const boxes = window.__ew.game.town.colliders.boxes;
      const i = boxes.findIndex(b => b.tag === tag);
      if (i >= 0) boxes.splice(i, 1);
    }, tag);
  }
}

async function cleanup(run, reload) {
  await run.board(convertible);
  await run.watch();
  await run.stage(site.offshore);
  const wet = await run.frame();
  assert.ok(recovering(wet) && wet.car.depth >= 0.85 && wet.reservations >= 1);
  if (reload) {
    await run.start(true);
    run.id = convertible;
    const first = await run.frame();
    const clear = await run.clearance();
    assert.ok(first.car.object !== wet.car.object && first.riding === null && first.player.shown && first.zone === "town"
      && !first.water?.active && !first.swim && !first.undersea && first.reservations === 0, "reload starts a fresh dry scene");
    assert.ok(clear.car && clear.foot && clear.carClear && clear.footClear && clear.sameNear
      && clear.reach >= 0.35 && clear.reach <= 1.45, "reloaded actual saved foot spawn is next to the normal fleet car");
    close(first.player.y, clear.floor, 0.02, "reload foot support");
    await run.until(s => s.prompt === "drive" && s.nearSame, "same id available through the normal prompt after reload");
    await run.act("Vairuoti");
    await run.until(s => s.riding === run.id && s.ridePhase === "on" && s.water?.enabled, "real board after reload");
  } else {
    await run.page.evaluate(zone => window.__ew.game.enterZone(zone, undefined, true), site.indoor);
    delete run.safety;
    const moved = await run.frame();
    assert.ok(moved.zone === site.indoor && moved.riding === null && moved.player.shown && !moved.water?.active
      && moved.water?.id == null && moved.reservations === 0 && !moved.water?.foamVisible && !moved.water?.carDrops, "intentional zone change clears the episode");
    assert.ok(gap(moved.car, wet.car) > 5 && (await run.clearance(moved.water.landingPair.foot)).car, "car settled dry before zone ownership changed");
    for (const f of await run.frames(46)) assert.ok(f.zone === site.indoor && f.riding === null && gap(f.player, moved.player) < 0.03
      && !f.swim && !f.dive && !f.undersea && f.reservations === 0, "no old tow or callback takes over the new zone");
  }
  run.log({ cleanup: reload ? "reload" : site.indoor });
}

const cases = [
  ["continuous road to water, dry exit, and boat", mainTrip],
  ["matched-speed steering on dry ground", run => steering(run, false)],
  ["matched-speed steering at body depth", run => steering(run, true)],
  ["roofed car and warehouse dent", damagedTrip],
  ["shallow exit at speed", run => assistedTrip(run, false)],
  ["exit during float", run => assistedTrip(run, true)],
  ["dry deck and solid rail", pierRail],
  ["abrupt drop beyond the harbor lip", abruptLip],
  ["voluntary reverse across the beach", voluntaryReverse],
  ["braking and open-panel wet deadline at 50 ms", inactivity],
  ["obstructed landing and first frame after pause", pausedFallback],
  ["reload during recovery", run => cleanup(run, true)],
  ["intentional zone change during recovery", run => cleanup(run, false)],
];

// Existing scene recordings, including the crash and boat banks. A recording added to
// the scene must appear explicitly here to avoid masking new fetches with a directory rule.
const knownSceneRecordings = new Set(`
  alarm-chirp arrive bean birds bloop boat-turn bow-splash buoy-bell buoy-bonk-1 buoy-bonk-2
  car-bump car-crunch card-flip-1 card-flip-2 card-shuffle card-slap-1 card-slap-2
  card-slide-1 card-slide-2 card-slide-3 chalk crowd-cheer cue-strike-1 cue-strike-2 cue-strike-3 cue-strike-4
  gate-whoosh glass gull-1 gull-2 gull-3 honk market open-sea paint-chips pair-chime paper-burst
  pool-break pool-clack-1 pool-clack-2 pool-clack-3 pool-clack-4 pool-clack-5 pool-cushion pool-drop
  repair-ding room-poolhall-mh sea shutter sparkle steam-hiss win-jingle win-sting book-page
`.trim().split(/\s+/).map(name => `/sfx/${name}.mp3`));
function knownVoice(path) {
  const m = path.match(/\/([^/]+)\/([^/]+)\.mp3$/i);
  return !!m && Object.hasOwn(clips.get(m[1]) ?? {}, m[2]);
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const failures = [];
try {
  for (const phone of [true, false]) {
    const viewport = phone ? { width: 390, height: 844 } : { width: 1280, height: 800 };
    const size = `${viewport.width}x${viewport.height}`;
    const context = await browser.newContext({ viewport, ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) });
    try {
      await context.route(/\.mp3(?:\?|$)/i, route => knownVoice(new URL(route.request().url()).pathname)
        ? route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } }) : route.continue());
      const measured = {};
      for (const [name, scenario] of cases) {
        const page = await context.newPage();
        const run = new Run(page, phone ? await context.newCDPSession(page) : null, phone, `${size} ${name}`);
        try {
          await run.start();
          const environment = await page.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, touches: navigator.maxTouchPoints }));
          assert.equal(environment.w, viewport.width);
          assert.equal(environment.h, viewport.height);
          assert.equal(environment.dpr, phone ? 2 : 1);
          assert.equal(environment.touches > 0, phone);
          measured[name] = await scenario(run);
          assert.ok(run.trafficProgress > 0.2, "traffic made measured forward progress");
          assert.deepEqual(run.media.filter(p => recording.test(p) && (!knownVoice(p) && !knownSceneRecordings.has(p)
            || /car[-_]?water|sputter|wheel[-_]?spray|door[-_]?drain|car[-_]?cough/i.test(p))), [], "no new recording fetched");
          assert.deepEqual(run.errors, [], "no unexpected page, console or media errors");
          console.log("ok", run.label);
        } catch (error) {
          console.error(run.label, JSON.stringify({ trace: run.trace, errors: run.errors, chunks: run.chunks, media: [...new Set(run.media)].slice(-24) }));
          console.error(error);
          failures.push(error);
        } finally {
          await page.close();
        }
      }
      try {
        const dry = measured[cases[1][0]], wet = measured[cases[2][0]];
        assert.ok(dry && wet, `${size}: both matched turns sampled`);
        assert.deepEqual(dry.controls, wet.controls);
        close(dry.ms, 250, 0.002, "dry turn interval");
        close(wet.ms, dry.ms, 0.002, "body turn interval matches dry");
        assert.ok(Math.sign(dry.angle) === Math.sign(wet.angle) && Math.abs(wet.angle) < Math.abs(dry.angle) * 0.75,
          `${size}: actual body turn must be under 75% of dry (${wet.angle} / ${dry.angle})`);
        console.log("ok", size, "matched ground/shore turns", JSON.stringify({ dry, wet }));
      } catch (error) {
        console.error(error);
        failures.push(error);
      }
    } finally {
      await context.close();
    }
  }
  if (failures.length) throw failures[0];
  console.log("car-water: both device runs passed");
} finally {
  await browser.close();
}
