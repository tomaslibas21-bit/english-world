// Local Vite DEV only. Run with VITE_EDITION=es WORLD_STORAGE=puerto-colibri and repeat on the separate VITE_LEARNER=lt server.
// Each invocation runs the same cases on 390×844 touch and 1280×800 keyboard.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:5188";
const edition = process.env.VITE_EDITION || "en";
const pc = edition === "es";
const storage = process.env.WORLD_STORAGE || (pc ? "puerto-colibri" : "english-world");
const helper = pc ? process.env.VITE_LEARNER || "en" : "lt";
const town = pc ? "puerto-colibri" : "maple-harbor";
const coastShots = pc && process.env.WORLD_SHOTS;
const lithuanian = {
  phone: { convertible: "Vairuoti", parked: "Vairuoti", boat: "Plaukti", out: "Išlipti" },
  desktop: { convertible: "Vairuoti: {name}", parked: "Vairuoti", boat: "Plaukti: {name}", out: "Išlipti" },
};
const fixtures = {
  "maple-harbor": {
    labels: { lt: { ...lithuanian, desktop: { ...lithuanian.desktop, convertible: "Vairuoti: Convertible", boat: "Plaukti: Motorboat" } } },
    storage: "english-world",
    roadExit: { x: -109.7, z: -8, outward: -Math.PI / 2 },
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
  "puerto-colibri": {
    storage: "puerto-colibri",
    roadExit: { x: 0, z: 93.7, outward: 0 },
    labels: {
      en: {
        phone: { convertible: "Drive", parked: "Drive", boat: "Sail", out: "Get out" },
        desktop: { convertible: "Drive: Convertible", parked: "Drive", boat: "Take out: Lancha", out: "Get out" },
      },
      lt: { ...lithuanian, desktop: { ...lithuanian.desktop, convertible: "Vairuoti: Convertible", boat: "Plaukti: Lancha" } },
    },
    road: [128, -55, Math.PI], east: [84, -55, Math.PI], west: [-96, -55, Math.PI],
    depths: [[-72, 0], [-73, 0.152], [-75, 0.335], [-77.4, 0.389], [-79, 0.766]],
    gateDepths: [[-72, 0.164], [-73, 0.314], [-75, 0.359], [-77.4, 0.413], [-79, 0.789]],
    dryTurn: [84, -63, Math.PI / 2], wetTurn: [84, -76.4, Math.PI / 2], reverse: [84, -72.8, Math.PI],
    deck: [-30, -70, 0.42], deckAisle: [-40.025, -77, Math.PI], deckEndZ: -80.1,
    lip: [-30, -90.5, Math.PI], offshore: [-96, -81, Math.PI],
    warehouse: [125, -51.4, Math.PI / 2 + 0.45], crashCar: "parked-0",
    beach: [-11.5, -71.2, Math.PI - 0.25], boat: "muelle", boatPose: [-11.5, -74.3, Math.PI - 0.25],
    boatIds: ["muelle", "playa", ...["afloat", "beached"].flatMap(kind => [1, 2, 3].map(i => `lancha-${kind}-${i}`))],
    indoor: "airport", oldClamp: -68.65, wadingLimit: -77.4,
    cenote: { centre: { x: -136, z: -6 }, road: [-128.726, -14.251, -0.72257], rock: [-128.726, 2.251, -2.41903],
      west: [-109.5, 6, -Math.PI / 2], pads: [{ x: -127, z: -18 }, { x: -119, z: 6 }] },
    hotel: { road: [-104.65, -20, Math.PI], deep: [-106, -34.5, Math.PI],
      depths: [[-27.4, 0.161], [-28, 0.583], [-28.5, 0.935], [-30.4, 0.76], [-34.5, 1.85]] },
  },
};
const site = fixtures[town];
assert.ok(site?.labels[helper] && storage === site.storage && ["en", "es"].includes(edition),
  `No car-water fixture for ${edition}/${helper}/${storage}`);
const labels = site.labels[helper];
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(base).hostname), "use a local Vite DEV server");

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const quantum = 1000 / 60;
const actionTimeout = 20_000, stallTime = 30_000, conditionBudget = 60_000;
const finished = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const progress = {
  version: 1,
  profile: { name: "Test", gender: "m", lookId: "m1", look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0, sounds: 0, cameraFollow: true },
  sits: pc ? { "s65a-passport": finished, "s65b-baggage": finished, "s66-taxi": finished } : {},
  phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", x: 28, z: -14.6, rot: Math.PI },
  coach: { done: true, run: true, view: true },
};
const clips = new Map(await Promise.all((pc ? ["audio-es"] : ["audio", "audio-v2"]).map(async (dir) => [
  dir, JSON.parse(await readFile(new URL(`../../public/${dir}/manifest.json`, import.meta.url), "utf8")),
])));
const carChunk = /\/(?:carWater(?:Plan|Recovery|Effects)?\.ts|assets\/carWater[^/]*\.js)$/i;
const media = /\.(?:mp3|ogg|wav|m4a|png|jpe?g|webp|avif|svg|glb|gltf|webm|mp4|woff2?)$/i;
const recording = /\.(?:mp3|ogg|wav|m4a)$/i;
const range = (xs) => Math.max(...xs) - Math.min(...xs);
const gap = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const turn = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const close = (a, b, tolerance, label) => assert.ok(Math.abs(a - b) <= tolerance, `${label} (${a} vs ${b}, tolerance ${tolerance})`);

async function bounded(operation, action, ms = stallTime) {
  let timer;
  try {
    return await Promise.race([action(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${operation} stalled after ${ms} ms`)), ms);
    })]);
  } finally { clearTimeout(timer); }
}

function installClock([key, save]) {
  const generation = Number(sessionStorage.getItem("car-water-document") ?? 0);
  if (generation === 0) localStorage.setItem(key, save);
  else window.__carWaterReloadSave = localStorage.getItem(key);
  sessionStorage.setItem("car-water-document", String(generation + 1));
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000;
  performance.now = () => now;
  const frames = new Map();
  let raf = 0;
  window.requestAnimationFrame = fn => { frames.set(++raf, fn); return raf; };
  window.cancelAnimationFrame = id => frames.delete(id);
  window.__step = (count, ms = 50) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      for (const id of [...frames.keys()]) {
        const fn = frames.get(id);
        frames.delete(id);
        fn?.(now);
      }
    }
  };
  // Three.js consumes this stream for UUIDs as well as the world using it for deterministic motion.
  let seed = 20261122 + generation;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

// Runs inside DEV, once per document. The pool cases opt into sampling at the NPC update.
async function installReads() {
  const { waterY, floorY, sandY, poolAt, poolBedY, SEA_LEVEL, SHORE, DECKS, FLOORS, POOLS, ROAD_EDITION, BONE,
    CAR, controlsFrom, pointAndGo, WORLD, TRAFFIC_LANES, EDITION, CONVERTIBLE_BUMPER, THEME, caveWays, groundsBounds,
    HOTEL_POOL, POOL_KIDS, predictPoolHeading } = await import("/tests/browser/car-water-observations.mjs");
  const g = window.__ew.game;
  const R = g.rides;
  const controlSelector = ".joy, .act-btn, .jump-btn, canvas";
  const pointerEvents = [];
  for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "gotpointercapture", "lostpointercapture"]) {
    document.addEventListener(type, e => {
      if (e.pointerType !== "touch") return;
      const target = e.target instanceof Element ? e.target.closest(controlSelector) ?? e.target : null;
      pointerEvents.push({ type, id: e.pointerId, x: e.clientX, y: e.clientY,
        target: target?.getAttribute("class") || e.target?.nodeName });
      if (pointerEvents.length > 10) pointerEvents.shift();
    }, true);
  }
  function touchInput(hud, w) {
    const knob = document.querySelector(".joy .knob");
    const offset = knob?.style.transform ? new DOMMatrixReadOnly(knob.style.transform) : null;
    const ids = [...new Set(pointerEvents.map(e => e.id))];
    const captures = [...document.querySelectorAll(controlSelector)].flatMap(el => {
      const held = ids.filter(id => el.hasPointerCapture(id));
      return held.length ? [{ target: el.getAttribute("class") || el.tagName, ids: held }] : [];
    });
    return { rawStick: knob ? { x: (offset?.m41 ?? 0) / 60, y: -(offset?.m42 ?? 0) / 60 } : null,
      capture: captures, events: pointerEvents.slice(), mode: w?.assistedOnFoot ? `assisted ${w.phase}` : hud.ride ?? "walk",
      neutral: g.waterNeutral, brake: g.brake };
  }
  const v = g.player.root.position.clone();
  const depth = (x, z) => waterY(x, z, g.t) === null ? 0 : Math.max(0, (poolAt(x, z)?.y ?? SEA_LEVEL) - floorY(x, z));
  const point = (p) => ({ x: p.x, y: p.y, z: p.z });
  const ground = p => ({ ...point(p), floor: floorY(p.x, p.z), surface: waterY(p.x, p.z, g.t) });
  const west = THEME.cenote?.open && THEME.cenote?.walk ? groundsBounds(THEME.cenote.x, THEME.cenote.z, WORLD.minX) : null;
  const inside = (p, b) => !!b && p.x > b.minX && p.x < b.maxX && p.z > b.minZ && p.z < b.maxZ;
  const within = (x, z, b) => !!b && x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ;
  const inset = CAR.wide + 0.4;
  const mainlandDrive = { minX: WORLD.minX + inset, maxX: WORLD.maxX - inset,
    minZ: SHORE.top + CAR.wide + 0.5, maxZ: WORLD.maxZ - inset };
  // The west driving inset meets the original rectangle across the town seam.
  const westDrive = west && { minX: west.minX + inset, maxX: west.maxX + inset, minZ: west.minZ + inset, maxZ: west.maxZ - inset };
  const ways = caveWays();
  const pose = (r) => ({ x: r.m.x, z: r.m.z, heading: r.m.heading, half: r.m.spec.half, wide: r.m.spec.wide });
  const local = (r, across, along) => {
    const s = Math.sin(r.heading), c = Math.cos(r.heading);
    return { x: r.x + c * across + s * along, z: r.z - s * across + c * along };
  };
  const cross = (a, b) => a.x * b.x + a.z * b.z;
  const axes = (r) => [local({ ...r, x: 0, z: 0 }, 1, 0), local({ ...r, x: 0, z: 0 }, 0, 1)];
  const separationOnAxes = (a, b) => {
    const A = axes(a), B = axes(b), d = { x: b.x - a.x, z: b.z - a.z };
    const project = (r, ax, n) => Math.abs(cross(ax[0], n)) * r.wide + Math.abs(cross(ax[1], n)) * r.half;
    return Math.max(...[...A, ...B].map(n => Math.abs(cross(d, n)) - project(a, A, n) - project(b, B, n)));
  };
  const overlap = (a, b) => separationOnAxes(a, b) < -0.002;
  const footprintDistance = (r, p) => {
    const [side, forward] = axes(r), d = { x: p.x - r.x, z: p.z - r.z };
    return Math.hypot(Math.max(0, Math.abs(cross(d, side)) - r.wide), Math.max(0, Math.abs(cross(d, forward)) - r.half));
  };
  const box = (b) => ({ x: (b.minX + b.maxX) / 2, z: (b.minZ + b.maxZ) / 2,
    wide: (b.maxX - b.minX) / 2, half: (b.maxZ - b.minZ) / 2, heading: 0 });
  const supported = (x, z, height, slope = 0.32) => {
    const bounds = x < WORLD.minX ? west : WORLD;
    if (!within(x, z, bounds) || poolAt(x, z)) return false;
    const floor = floorY(x, z), water = waterY(x, z, g.t);
    return Number.isFinite(floor) && Math.abs(floor - height) <= slope
      && (water === null || Math.min(floor, sandY(x, z)) >= Math.max(water, SEA_LEVEL + 0.265))
      && !DECKS.some(d => x > d.x0 && x < d.x1 && z > d.z0 && z < d.z1);
  };
  const radius = 0.42;
  const feetSupported = ({ x, z }) => {
    const height = floorY(x, z);
    return supported(x, z, height) && Array.from({ length: 16 }, (_, i) => i * Math.PI / 8)
      .every(a => supported(x + radius * Math.cos(a), z + radius * Math.sin(a), height));
  };
  const colliders = g.town.colliders;
  const matrix = g.player.root.matrix.clone();
  const orientation = g.rig.cam.quaternion.clone();
  const visible = (node) => {
    for (let o = node; o; o = o.parent) if (!o.visible) return false;
    return !!node && node.layers.test(g.rig.cam.layers);
  };
  const project = (p) => {
    v.set(p.x, p.y, p.z).project(g.rig.cam);
    return { x: v.x, y: v.y, visible: Math.abs(v.x) < 1 && Math.abs(v.y) < 1 && Math.abs(v.z) < 1 };
  };
  const worldVertex = (obj, attr, i) => point(v.fromBufferAttribute(attr, i).applyMatrix4(obj.matrixWorld));
  const hullOutline = (r, wide, half) => [-1, 1].flatMap(a => [-1, 1].map(f => local(r, a * wide, f * half)));
  const footprint = car => Array.from({ length: 13 }, (_, i) => 2 * i / 12 - 1)
    .flatMap(f => Array.from({ length: 9 }, (_, i) => local(car, (2 * i / 8 - 1) * car.wide, f * car.half)));
  const body = (r, car) => r.model ? car : { ...car, wide: Math.max(car.wide, CONVERTIBLE_BUMPER.width / 2),
    half: Math.max(car.half, CONVERTIBLE_BUMPER.offset + CONVERTIBLE_BUMPER.depth / 2) };
  function pierClearance(r, car) {
    let tightest = null, firstBlocker = null;
    const record = (kind, obstacle, gap) => {
      if (!tightest || gap < tightest.gap) tightest = { kind, obstacle, gap };
      if (gap <= 0 && !firstBlocker) firstBlocker = { kind, obstacle, gap };
      return true;
    };
    const disc = (kind, x, z, radius) =>
      record(kind, { x, z, radius }, footprintDistance(car, { x, z }) - radius);
    for (const b of colliders.boxes) if (b.tag !== "sea") {
      record(b.deckRail ? "rail" : b.tag ?? "box", b, separationOnAxes(car, box(b)));
    }
    for (const c of colliders.circles) disc("circle", c.x, c.z, c.r);
    for (const c of R.sea.circles) disc("fixed hull", c.x, c.z, c.r);
    for (const q of [...R.list, ...R.modeCars.keys()]) {
      if (q !== r) {
        const pad = q.kind === "car" ? body(q, pose(q)) : pose(q);
        record(q.kind, { id: q.id, ...pad }, separationOnAxes(car, pad));
      }
      for (const o of q.owners) if (o.state !== "in") {
        disc("ride owner", o.ch.root.position.x, o.ch.root.position.z, 0.45);
      }
    }
    g.ambient.carWaterTrafficClear((x, z, half, wide) =>
      record("traffic", { x, z, half, wide }, separationOnAxes(car, { x, z, half, wide, heading: Math.PI / 2 })));
    const person = (x, z, r) => disc("person", x, z, r);
    g.carWaterPeopleClear(person, false);
    g.ambient.carWaterPeopleClear(person, false);
    for (const p of R.host.people()) person(p.x, p.z, 0.4);
    return { tightest, firstBlocker };
  }

  function deckSweep(id, [x, z, heading], endZ) {
    const r = R.find(id), start = body(r, { ...pose(r), x, z, heading });
    // The fixed-heading, straight northbound sweep is exactly one rectangle.
    const swept = { ...start, z: (z + endZ) / 2, half: start.half + (z - endZ) / 2 };
    const bounds = { minX: x - start.wide, maxX: x + start.wide, minZ: endZ - start.half, maxZ: z + start.half };
    const deck = DECKS.find(d => d.x0 < bounds.minX && d.x1 > bounds.maxX && d.z0 < bounds.minZ && d.z1 > bounds.maxZ);
    const deckGrid = footprint(swept).map(p => ({ floor: floorY(p.x, p.z), surface: waterY(p.x, p.z, g.t), depth: depth(p.x, p.z) }));
    const motion = { radius: r.m.spec.wide, offset: r.m.spec.half - r.m.spec.wide };
    const old = { ...swept, x: -30 };
    const restaurant = colliders.boxes.find(b => b.tag === "building"
      && old.x > b.minX && old.x < b.maxX && z > b.minZ && z < b.maxZ);
    return { bounds, body: { half: start.half, wide: start.wide }, motion, deck, restaurant,
      oldOverlap: !!restaurant && overlap(old, box(restaurant)), ...pierClearance(r, swept),
      allSupported: deckGrid.every(p => p.floor === 0.3 && p.depth === 0 && p.surface !== null && p.surface < p.floor),
      waterRange: [Math.min(...deckGrid.map(p => p.surface)), Math.max(...deckGrid.map(p => p.surface))] };
  }

  function pierRailSweep(id, path) {
    const r = R.find(id), rails = colliders.boxes.filter(b => b.deckRail);
    let tightest = null;
    for (const [i, to] of path.entries()) {
      if (!Number.isFinite(to.half) || !Number.isFinite(to.wide)) {
        throw new Error(`Pier rail sweep for ${id} at frame ${to.serial} needs finite half-length and half-width (half=${to.half}, wide=${to.wide})`);
      }
      const from = path[i - 1] ?? to, delta = to.heading - from.heading;
      const angle = Math.atan2(Math.sin(delta), Math.cos(delta));
      const car = body(r, to);
      const steps = Math.max(1, Math.ceil((Math.hypot(to.x - from.x, to.z - from.z)
        + Math.abs(angle) * Math.hypot(car.half, car.wide)) / 0.005));
      for (let j = 0; j <= steps; j++) {
        const t = j / steps;
        const p = { ...car, x: from.x + t * (to.x - from.x), z: from.z + t * (to.z - from.z), heading: from.heading + t * angle };
        for (const rail of rails) {
          const clearance = separationOnAxes(p, box(rail));
          if (!tightest || clearance < tightest.clearance) tightest = { clearance, rail, serial: to.serial, at: t };
        }
      }
    }
    return tightest;
  }

  const stockGround = ({ x, z }) => R.drivable.has(x, z);
  const dryCar = (car) => {
    const { x, z, half, wide, heading } = car, height = floorY(x, z);
    if ((!within(x, z, mainlandDrive) && !within(x, z, westDrive)) || !supported(x, z, height, 0.29)) return false;
    const s = Math.sin(heading), c = Math.cos(heading), along = Math.ceil(half / 0.35), across = Math.ceil(wide / 0.35);
    for (let i = -across; i <= across; i++) for (let j = -along; j <= along; j++) {
      const u = i * wide / across, v = j * half / along;
      if (!supported(x + c * u + s * v, z - s * u + c * v, height, 0.29)) return false;
    }
    return POOLS.every(pool => {
      if (!("bounds" in pool)) return footprintDistance(car, pool) >= pool.r;
      const { x0, x1, z0, z1 } = pool.bounds;
      return !overlap(car, box({ minX: x0, maxX: x1, minZ: z0, maxZ: z1 }));
    });
  };
  const poolKids = () => POOL_KIDS.map(id => {
    const n = g.npcs.find(n => n.id === id);
    return n && { id, uid: n.ch.root.uuid, ...point(n.ch.root.position), heading: n.ch.root.rotation.y,
      visible: n.ch.root.visible, approach: n.approach && { ...n.approach }, home: { ...n.home }, companion: g.poolCompanion?.(id),
      talking: !!(g.session?.active && g.talkNpc === n) };
  });

  let readPoolFrame;
  function watchPoolKids(walls, yieldCarId) {
    const original = poolKids();
    let previous = original, poolPose, poolYield;
    if (yieldCarId) {
      const motion = R.find(yieldCarId).m, step = motion.step;
      motion.step = function (dt, controls, gap, ...settings) {
        const { x, z, fx, fz, spec } = this;
        poolYield = { before: g.renderer.info.render.frame, dt, x, z, fx, fz, gap, curve: this.curve(1),
          stopAt: spec.half + CAR.clear, throttle: controls.throttle, brake: controls.brake };
        return step.call(this, dt, controls, gap, ...settings);
      };
    }
    const updateNpcs = g.updateNpcs;
    // The idle ball advances in modes.tick, after updateNpcs. Sample its transform and
    // visibility here, since either can differ when the rendered frame is read back.
    g.updateNpcs = function (dt, talking, mode) {
      const ball = g.scene.getObjectByName("hotel-pool-ball");
      const target = ball && { ...point(ball.getWorldPosition(v)), visible: ball.visible };
      const pool = g.pool;
      poolPose = {
        before: g.renderer.info.render.frame, time: g.t, dt, ball: target ?? null,
        registered: !!pool, poolActive: pool?.active ?? null, mode: mode?.id ?? null,
        outside: !g.zone.interior, talking,
        headings: previous.map(({ id, heading }) =>
          predictPoolHeading(id, g.npcs.find(n => n.id === id).ch.root.position, heading, target, dt)),
      };
      return updateNpcs.call(this, dt, talking, mode);
    };
    readPoolFrame = (r, car) => {
      const kids = poolKids(), hull = body(r, car);
      const poolClearance = { clearWalls: walls.every(w => !overlap(hull, box(w))),
        kids: kids.map(k => ({ id: k.id, gap: footprintDistance(hull, k) })) };
      previous = kids;
      return { kids, poolPose, poolClearance, poolYield };
    };
    return { kids: original, time: g.t, now: performance.now() };
  }

  function clearance(id, foot, obstacleTag, candidate) {
    const r = R.find(id), car = body(r, { ...pose(r), ...candidate }), p = foot ?? g.player.root.position;
    const pads = colliders.boxes.filter(b => b.tag !== "sea").map(box);
    const circles = [...colliders.circles, ...R.sea.circles];
    for (const q of [...R.list, ...R.modeCars.keys()]) {
      if (q !== r) pads.push(pose(q));
      for (const o of q.owners) if (o.state !== "in") circles.push({ ...point(o.ch.root.position), r: 0.35 });
    }
    for (const c of g.ambient.traffic) if (c.hidden <= 0 && c.mesh.scale.x >= 0.5) {
      pads.push({ x: c.x, z: c.lane, half: c.half.x, wide: c.half.z, heading: Math.PI / 2 });
    }
    for (const ch of [...g.npcs.map(n => n.ch), ...g.extras, ...g.ambient.walkers.map(w => w.ch)]) {
      circles.push({ ...point(ch.root.position), r: 0.45 });
    }
    const obstacle = colliders.boxes.find(b => b.tag === obstacleTag);
    return {
      car: dryCar(car),
      foot: feetSupported(p), floor: floorY(p.x, p.z), carFloor: floorY(car.x, car.z),
      carClear: pads.every(b => !overlap(car, b)) && circles.every(c => footprintDistance(car, c) >= c.r - 0.002),
      footClear: footprintDistance(car, p) >= radius - 0.002 && pads.every(b => footprintDistance(b, p) >= radius - 0.002)
        && circles.every(c => Math.hypot(c.x - p.x, c.z - p.z) >= c.r + radius - 0.002),
      obstacleClear: obstacleTag ? !!obstacle && !overlap(car, box(obstacle)) && footprintDistance(box(obstacle), p) >= radius : null,
      reach: R.reach(r, p.x, p.z), sameNear: R.near(p.x, p.z) === r,
      walkable: g.town.walkableAt(p.x, p.z) || inside(p, west) && !colliders.blocked(p.x, p.z, 0.3),
      westCar: inside(car, west), westFoot: inside(p, west),
    };
  }

  function trafficFrames() {
    // The lightweight motion meshes are taken out of the scene after the GLB batches load.
    const slots = new Map(), drawn = new Map();
    for (const { car } of g.carVisuals?.traffic?.entries ?? []) {
      if (!car.mesh.visible || car.damagedBody) continue;
      const batch = car.batchBody, slot = slots.get(batch) ?? 0;
      slots.set(batch, slot + 1);
      if (slot < batch.count) {
        batch.getMatrixAt(slot, matrix);
        drawn.set(car, { object: batch, position: point(v.setFromMatrixPosition(matrix).applyMatrix4(batch.matrixWorld)) });
      }
    }
    return g.ambient.traffic.map(c => {
      const draw = drawn.get(c);
      const object = c.damagedBody ?? draw?.object ?? c.mesh;
      const p = draw?.position ?? point(object.getWorldPosition(v));
      return { id: c.index, uid: c.mesh.uuid, x: c.x, lane: c.lane, from: c.from, to: c.to, dir: c.dir,
        meshX: p.x, meshZ: p.z, visible: c.hidden <= 0 && c.mesh.visible && c.mesh.scale.x > 0,
        registered: !!object.parent && (!c.batchBody || !!c.damagedBody || !!draw),
        depth: depth(c.x, c.lane), meshDepth: depth(p.x, p.z), onRoad: R.asphalt.has(p.x, p.z),
        configured: TRAFFIC_LANES.some(l => l.z === c.lane && Math.min(l.from, l.to) === c.from && Math.max(l.from, l.to) === c.to && l.dir === c.dir) };
    });
  }

  function assistedClearance(car, player) {
    const previous = window.__carWaterTest.previousAssistedFoot ?? player;
    const points = [];
    const steps = Math.max(1, Math.ceil(Math.hypot(previous.x - player.x, previous.z - player.z) / 0.12));
    for (let i = 1; i <= steps; i++) {
      points.push({ x: previous.x + (player.x - previous.x) * i / steps, z: previous.z + (player.z - previous.z) * i / steps });
    }
    const fixed = [...colliders.circles, ...R.sea.circles];
    const people = [...g.npcs.map(n => n.ch), ...g.extras, ...g.ambient.walkers.map(w => w.ch)]
      .filter(ch => ch.root.visible).map(ch => ch.root.position);
    const vehicles = [...R.list, ...R.modeCars.keys()].filter(r => r.id !== car.id).map(pose);
    for (const c of g.ambient.traffic) if (c.hidden <= 0 && c.mesh.scale.x >= 0.5) {
      vehicles.push({ x: c.x, z: c.lane, half: c.half.x, wide: c.half.z, heading: Math.PI / 2 });
    }
    return footprintDistance(car, player) >= radius - 0.002 && points.every(p => {
      return colliders.boxes.every(b => b.tag === "sea" || footprintDistance(box(b), p) >= radius - 0.002)
        && fixed.every(c => Math.hypot(p.x - c.x, p.z - c.z) >= c.r + radius - 0.002)
        && people.every(c => Math.hypot(p.x - c.x, p.z - c.z) >= 0.45 + radius - 0.002)
        && vehicles.every(c => footprintDistance(c, p) >= radius - 0.002);
    });
  }

  function effects(r, car, w) {
    const foam = g.scene.getObjectByName("car-water-foam"), drops = g.scene.getObjectByName("water-drops");
    const bumperHalf = body(r, car).half;
    const result = { bow: [], bumperHalf, wake: null, spray: 0, streams: [0, 0] };
    if (foam && visible(foam) && foam.geometry.drawRange.count > 0) {
      const { index, attributes, drawRange } = foam.geometry;
      const vertices = new Set(Array.from({ length: drawRange.count }, (_, i) => index.getX(drawRange.start + i)));
      const front = project(point(r.mesh.localToWorld(v.set(0, 0.12, bumperHalf))));
      const ribbon = [];
      for (const i of vertices) {
        if (attributes.color.getW(i) < 0.025) continue;
        const p = worldVertex(foam, attributes.position, i);
        const dx = p.x - car.x, dz = p.z - car.z, ndc = project(p);
        const along = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
        const across = dx * Math.cos(car.heading) - dz * Math.sin(car.heading);
        if (i < 9) result.bow.push({ along, across, visible: ndc.visible, above: p.y - waterY(p.x, p.z, g.t),
          nosePixels: Math.hypot((front.x - ndc.x) * innerWidth / 2, (front.y - ndc.y) * innerHeight / 2) });
        else ribbon.push({ along, across, visible: ndc.visible });
      }
      if (ribbon.length) result.wake = { aft: Math.min(...ribbon.map(p => p.along)), fore: Math.max(...ribbon.map(p => p.along)),
        onScreen: ribbon.filter(p => p.visible).length, vertices: ribbon.length,
        sides: [-1, 1].map(side => ribbon.filter(p => p.visible && p.across * side > 0).length) };
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
      heading: p.root.rotation.y, pose: p.anim, swimPose: p.swim, velocity: g.vel.length(), air: g.hop.air,
    };
    return finishSample(player, face, id, before, w, p, c, hud);
  }

  function finishSample(player, face, id, before, w, p, c, hud) {
    const r = id ? R.find(id) : R.riding;
    const car = r && { ...pose(r), id: r.id, object: r.mesh.uuid, reloadMarked: Object.hasOwn(r.mesh, "__carWaterReloadMarker"),
      kind: r.kind, model: r.model ?? null, speed: r.m.speed, pace: r.m.pace,
      yaw: r.m.yaw, steer: r.m.steer, top: r.m.top, floor: floorY(r.m.x, r.m.z), surface: waterY(r.m.x, r.m.z, g.t),
      depth: depth(r.m.x, r.m.z), onRoad: R.asphalt.has(r.m.x, r.m.z), stockGround: stockGround(r.m),
      mesh: ground(r.mesh.getWorldPosition(v)), headingDrawn: r.mesh.rotation.y, pitch: r.mesh.rotation.x, roll: r.mesh.rotation.z,
      visible: visible(r.mesh) && project({ ...point(r.mesh.position), y: r.mesh.position.y + 0.55 }).visible };
    if (r && r.kind === "car") {
      car.dryGround = dryCar(body(r, car));
      car.wheels = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([a, f]) => {
        const p = local(car, a * 0.88 * car.wide / 0.95, f * 1.36 * car.half / 2.15);
        const tire = ground(r.mesh.localToWorld(v.set(a * 0.88 * car.wide / 0.95, 0, f * 1.36 * car.half / 2.15)));
        return { ...p, depth: depth(p.x, p.z), tire, side: a };
      });
      car.corners = [-1, 1].flatMap(a => [-1, 1].map(f => ground(r.mesh.localToWorld(v.set(a * car.wide, 0, f * car.half)))));
      car.immersion = Math.max(0, ...car.corners.map(p => (p.surface ?? p.y) - p.y));
      car.bumpers = !r.model && hullOutline(car, CONVERTIBLE_BUMPER.width / 2, CONVERTIBLE_BUMPER.offset + CONVERTIBLE_BUMPER.depth / 2);
      car.owners = r.owners.map(o => {
        const p = o.ch.root.position;
        return { ...point(p), state: o.state, dry: supported(p.x, p.z, floorY(p.x, p.z)) };
      });
      if (window.__carWaterTest.trackPierDeck) car.pierClearance = pierClearance(r, body(r, pose(r)));
      if (w?.carDrops || w?.foamVisible) car.effects = effects(r, car, w);
    }
    const camera = ground(c.getWorldPosition(v));
    camera.rotation = c.getWorldQuaternion(orientation).toArray();
    face.surface = waterY(face.x, face.z, g.t);
    camera.surface = waterY(camera.x, camera.z, g.t);
    face.floor = floorY(face.x, face.z);
    const hit = R.crashes.last();
    const fade = w?.fallback && !w.active ? document.querySelector(".fade") : null;
    const style = fade && getComputedStyle(fade), bounds = fade?.getBoundingClientRect();
    const opaque = !!style && Number(style.opacity) === 1 && style.visibility === "visible" && !!bounds
      && bounds.left <= 0 && bounds.top <= 0 && bounds.right >= innerWidth && bounds.bottom >= innerHeight;
    const damageState = r && R.crashEffects.damage.get(r);
    // A covered relocation has no intermediate visible walking segment.
    if (!w?.assistedOnFoot || w.fallback) window.__carWaterTest.previousAssistedFoot = undefined;
    const corridorClear = w?.assistedOnFoot && car ? assistedClearance(car, player) : null;
    if (w?.assistedOnFoot) window.__carWaterTest.previousAssistedFoot = player;
    return {
      now: performance.now(), time: g.t, before, serial: g.presentedWorld?.serial ?? null, scene: g.presentedWorld?.scene,
      zone: g.zone.id, quality: window.__ew.store.getState().settings.quality, car, water: w, player, face, camera,
      riding: R.riding?.id ?? null, ridePhase: R.riding ? R.phase : null, swim: g.swimming, dive: g.diveK,
      undersea: g.undersea.on, prompt: hud.prompt?.kind ?? null, nearest: g.nearest?.id ?? null, hudRide: hud.ride ?? null,
      hudPanel: hud.panel, brake: g.brake || g.keys.has(" "), stick: { x: g.joy.x, y: g.joy.y }, reservations: g.ambient.waterReservations?.length ?? 0,
      touchInput: hud.showTouch ? touchInput(hud, w) : null,
      fade: hud.fade, opaque, coveredTarget: opaque ? point(g.rig.target) : null, corridorClear,
      document: Number(sessionStorage.getItem("car-water-document")), poolMode: g.modes.owns("pool"),
      nearbyWays: ways.filter(q => Math.hypot(q.x - player.x, q.z - player.z) <= q.reach + 0.42).map(q => q.id),
      nearWay: g.nearWay, west: inside(player, west), yieldAge: R.yieldT,
      ...(before !== undefined ? readPoolFrame?.(r, car) : undefined),
      keys: [...g.keys],
      nearSame: !!r && R.near(p.root.position.x, p.root.position.z) === r,
      reach: r ? R.reach(r, p.root.position.x, p.root.position.z) : null,
      hit: hit ?? null, sameImpact: !!hit && hit === window.__carWaterDent?.impact,
      damage: r && R.crashes.info(r), crashStats: R.crashes.stats(), damageAge: damageState && R.crashEffects.now - damageState.last,
      geometry: r?.mesh.children[0]?.geometry?.uuid ?? null,
      traffic: trafficFrames(),
      boats: R.list.filter(q => q.kind === "boat").map(q => ({ ...pose(q), id: q.id, uid: q.mesh.uuid, pace: q.m.pace,
        gap: car?.kind === "car" ? separationOnAxes(car, pose(q)) : null,
        damage: R.crashes.info(q), mesh: point(q.mesh.position),
        beach: q.beach && { y: q.beach.y, roll: q.beach.roll, circles: q.beach.circles.map(c => ({ ...c, registered: colliders.circles.includes(c) })) },
        yaw: q.mesh.rotation.y, pitch: q.mesh.rotation.x, roll: q.mesh.rotation.z })),
    };
  }

  function footSupports(landing, current) {
    const nearby = b => [landing, current].some(p =>
      p.x >= b.minX - 0.8 && p.x <= b.maxX + 0.8 && p.z >= b.minZ - 0.8 && p.z <= b.maxZ + 0.8);
    const ledges = g.ledges;
    const dynamic = new Set([...(ledges?.dynamic?.(landing.x, landing.z) ?? []),
      ...(ledges?.dynamic?.(current.x, current.z) ?? [])]);
    return {
      boxes: colliders.boxes.filter(nearby),
      circles: colliders.circles.filter(c => [landing, current].some(p => gap(c, p) <= c.r + 0.8)),
      ledges: ledges?.pieces.filter(nearby),
      dynamic: [...dynamic].filter(nearby).map(piece => ({ ...piece, ride: R.carUnder(piece)?.id })),
      support: ledges?.supportPiece(current.x, current.z, g.hop.y, g.hop.air),
      gait: { on: g.gaitOn, speed: g.gait.speed }, stepOut: g.stepOut, autoPath: g.autoPath,
      velocity: point(g.vel), resolvedVelocity: point(g.moveVel),
    };
  }

  const exitPoint = ({ x, z, outward }) => ({ x, z, outward });
  window.__carWaterTest = { identity: { town: ROAD_EDITION.id, edition: EDITION.id, helper: EDITION.helper, lang: document.documentElement.lang,
    storage: EDITION.storage }, roadExit: exitPoint(ROAD_EDITION.edge), liveRoadExit: exitPoint(window.__ew.road.state().exit),
    world: () => ({ decks: DECKS.length, floors: FLOORS.length, pools: POOLS.length, west, ways: ways.map(w => w.id),
      pier: floorY(-30, -77), hotel: poolAt(HOTEL_POOL.x, HOTEL_POOL.z)?.y ?? null,
      cenote: THEME.cenote && depth(THEME.cenote.x, THEME.cenote.z), fleet: g.carVisuals.stats(), parkedRides: R.modeCars.size }),
    depth, sample, clearance, controlsFrom, pointAndGo, ways, watchPoolKids, footSupports, deckSweep, pierRailSweep,
    footprint: id => {
      const r = R.find(id);
      return footprint(body(r, pose(r))).map(p => ({ ...p, depth: depth(p.x, p.z) }));
    },
    boxOverlap: (car, obstacle) => overlap(car, box(obstacle)), footprintDistance,
    support: (x, z) => {
      const pool = poolAt(x, z);
      const floor = floorY(x, z);
      return { floor, depth: depth(x, z), surface: waterY(x, z, g.t), west: inside({ x, z }, west), dry: supported(x, z, floor),
        bowl: pool && poolBedY(pool, x, z), floorOverride: FLOORS.some(f => x > f.x0 && x < f.x1 && z > f.z0 && z < f.z1) };
    } };
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
    this.coastFrames = new Set();
    this.downKeys = new Set();
    this.touches = new Map();
    this.stageName = "startup";
    page.on("pageerror", e => this.errors.push(e.stack ?? e.message));
    page.on("console", m => {
      const message = m.text();
      const missingClipNotice = /^(?:\[audio\] )?Missing clip: [0-9a-f]{12}$/.test(message);
      if (!missingClipNotice && (m.type() === "error" || m.type() === "warning" && /shader|WebGLProgram|models unavailable/i.test(message))) {
        this.errors.push(`${m.type()} ${message} ${JSON.stringify(m.location())}`);
      }
    });
    page.on("request", req => {
      const path = new URL(req.url()).pathname;
      if (carChunk.test(path)) this.chunks.push(path);
      if (media.test(path) || req.resourceType() === "media") this.media.push(path);
    });
    page.on("response", res => {
      const path = new URL(res.url()).pathname;
      if (res.status() >= 400) this.errors.push(`HTTP ${res.status()} ${res.url()}`);
      if (media.test(path) && /text\/html/i.test(res.headers()["content-type"] ?? "")) {
        this.errors.push(`HTML returned for media ${path}`);
      }
    });
    page.on("requestfailed", req => {
      if (req.failure()?.errorText === "net::ERR_ABORTED" &&
        (this.closing || this.navigating || (req.resourceType() === "media" && knownVoice(new URL(req.url()).pathname)))) return;
      this.errors.push(`request failed ${req.url()}: ${req.failure()?.errorText}`);
    });
  }

  op(name, action, ms) {
    this.operation = name;
    const budget = Math.min(ms ?? stallTime, (this.waitExpires ?? Infinity) - Date.now());
    assert.ok(budget > 0, `${this.condition} exceeded the condition budget during ${name}`);
    return bounded(`${this.label} / ${this.stageName} / ${name}`, action, budget);
  }

  evaluate(fn, arg, name = "read browser state") {
    return this.op(name, () => this.page.evaluate(fn, arg));
  }

  async start(reloadFrom) {
    const chunkCount = this.chunks.length;
    this.chunksAtNavigation = chunkCount;
    this.navigating = true;
    if (reloadFrom) {
      delete this.safety;
      this.stageName = "reload during return";
      await this.op("reload", () => this.page.reload({ waitUntil: "domcontentloaded", timeout: actionTimeout }));
    } else {
      await this.op("seed clock and progress", () => this.page.addInitScript(installClock, [`${storage}-progress-v1`, JSON.stringify(progress)]));
      await this.op("navigate", () => this.page.goto(base, { waitUntil: "domcontentloaded", timeout: actionTimeout }));
    }
    this.navigating = false;
    const expires = this.waitExpires = Date.now() + conditionBudget;
    this.condition = "town ready with the real fleet and crash shaders";
    // __ew.game is installed by Game.init before the first registered animation presentation.
    await this.op("wait for Game.init on the frozen clock", () => this.page.waitForFunction(() => !!window.__ew?.game,
      null, { polling: 20, timeout: actionTimeout }));
    await this.evaluate(installReads, undefined, "install independent observations");
    this.observations = await this.evaluate(() => {
      const { identity, roadExit, liveRoadExit } = window.__carWaterTest;
      return { identity, roadExit, liveRoadExit };
    });
    assert.deepEqual(this.observations.identity, { town, edition, helper, lang: helper, storage },
      "the Vite server's actual road edition, edition id, helper, HTML lang and storage match the invocation");
    assert.deepEqual(this.observations.roadExit, this.observations.liveRoadExit, "resolved road definition agrees with the live exit");
    assert.deepEqual(this.observations.liveRoadExit, site.roadExit, "live road exit matches the invoked town");
    let ready;
    do {
      const startup = await this.evaluate(({ ms, captureId }) => {
        const g = window.__ew.game, before = g.renderer.info.render.frame;
        const lastPresented = g.presentedWorld;
        window.__step(1, ms);
        const ready = window.__ew.store.getState().screen === "play" && g.zone.id === "town" && g.ledges?.ready
          && !g.transitioning && g.carVisuals?.stats().parkedModels > 0 && g.carVisuals.stats().trafficModels > 0
          && g.crashShadersReady && g.presentedWorld?.scene === "town";
        if (!captureId || !g.presentedWorld) return { ready, presented: g.presentedWorld };
        if (lastPresented) throw new Error("a frame was presented before the reload observer");
        const reads = window.__carWaterTest, first = reads.sample(captureId, before);
        return { ready, presented: g.presentedWorld, firstReload: { first, clear: first.car ? reads.clearance(captureId) : null,
          savedPlace: JSON.parse(window.__carWaterReloadSave ?? null)?.place ?? null } };
      }, { ms: quantum, captureId: this.firstReload ? null : reloadFrom?.car.id }, "step startup and sample first presentation");
      ready = startup.ready;
      this.startup = startup.presented;
      if (startup.firstReload) this.firstReload = assertReloadPair(reloadFrom, startup.firstReload, "first reload frame");
      if (!ready) await delay(20);
    } while (!ready && Date.now() < expires);
    this.waitExpires = undefined;
    assert.ok(ready, "the low-quality Vite DEV town presented and finished loading");
    this.condition = undefined;
    await this.evaluate(() => {
      window.__ew.coach?.finish?.();
      window.__ew.store.getState().setHud({ panel: null });
    });
    await this.assertLazy();
    const world = await this.evaluate(() => window.__carWaterTest.world());
    this.observations.world = world;
    assert.ok(world.decks > 0 && world.pier === 0.3, "the observer reads the built pier from the live deck registry");
    assert.ok(world.fleet.parkedModels > 0 && world.fleet.trafficModels > 0 && world.parkedRides > 0, "the town fleet loaded and rides are registered");
    if (pc) {
      assert.ok(world.west && world.floors > 0 && world.pools >= 2, "the observer reads the open grounds and registered floors and pools");
      assert.deepEqual(world.ways, ["boca", "grieta", "ojo"], "the open cenote's three real entrances");
      assert.equal(world.hotel, -0.12, "the actual hotel pool's still surface");
      close(world.cenote, 3.4, 0.001, "the actual cenote depth");
    }
    this.traffic = null;
    this.lastTraffic = null;
    this.trafficProgress = 0;
    this.boatReference = null;
    return this.frame();
  }

  async read() {
    return this.evaluate(id => window.__carWaterTest.sample(id), this.id);
  }

  async assertLazy() {
    assert.deepEqual(this.chunks.slice(this.chunksAtNavigation), [], "no car-water module requests before eligible boarding");
    assert.deepEqual(await this.evaluate(() => [typeof window.__carWater, window.__ew.game.rides.waterFleet === undefined]),
      ["undefined", true], "lazy DEV hook and fleet index absent before eligible boarding");
  }

  async frame(ms = quantum) {
    const s = await this.evaluate(({ ms, id }) => {
      const before = window.__ew.game.renderer.info.render.frame;
      window.__step(1, ms);
      // Sample the DOM in the presentation task, before a deferred cover could commit.
      return window.__carWaterTest.sample(id, before);
    }, { ms, id: this.id }, `step and sample ${ms.toFixed(2)} ms`);
    this.last = s;
    const { car: c, water: w, player: p } = s;
    this.trace.push([s.serial, s.scene, s.zone, s.now.toFixed(1), s.ridePhase, s.riding, w?.band, w?.phase, w?.reason, w?.secondsLeft,
      c && [c.x, c.z, c.pace, c.mesh.y].map(x => +x.toFixed(3)), [p.x, p.y, p.z].map(x => +x.toFixed(3)), s.prompt,
      [s.face, s.camera].map(p => p.surface === null ? null : +(p.y - p.surface).toFixed(3)),
      w && [w.wakeSegments, w.bowVertices, w.carDrops, w.drainLive, w.fallbackReason]]);
    if (this.trace.length > 12) this.trace.shift();
    assert.equal(s.serial, s.before + 1, "one town presentation for each clock step");
    assert.equal(s.scene, "town");
    assert.equal(s.quality, "low");
    this.checkTraffic(s);
    if (s.riding && s.car?.kind === "boat") this.boatUnderTest = s.riding;
    this.checkMooredBoats(s);
    if (this.safety) this.checkSafety(s, ms);
    this.inspectFrame?.(s);
    const phase = w?.active || this.safety?.released === s.now ? `${w.band}/${w.phase}/${w.reason ?? "-"}` : null;
    if (phase && phase !== this.phase) this.log({ phase, serial: s.serial, at: [c.x, c.z], pace: c.pace });
    this.phase = phase;
    return s;
  }

  checkTraffic(s) {
    assert.ok(s.traffic.length > 0 && new Set(s.traffic.map(c => c.id)).size === s.traffic.length, "sample every traffic car");
    const keys = s.traffic.map(c => [c.id, c.uid, c.lane, c.from, c.to, c.dir]);
    if (!this.traffic) {
      this.traffic = keys;
      this.progressByCar = s.traffic.map(() => 0);
    }
    assert.deepEqual(keys, this.traffic, "traffic identities and lanes are stable");
    for (const [i, c] of s.traffic.entries()) {
      assert.ok(c.configured && Number.isFinite(c.x) && c.x >= c.from - 0.6 && c.x <= c.to + 0.6, `logical traffic lane ${JSON.stringify(c)}`);
      assert.equal(c.depth, 0, "traffic stays on dry road at its logical lane");
      if (c.visible) {
        assert.ok(c.registered, "traffic body has its actual rendered mesh or instance slot");
        close(c.meshZ, c.lane, 0.002, "visible traffic mesh z at the road lane");
        close(c.meshX, c.x, 0.002, "visible traffic mesh follows logical x");
        assert.ok(c.onRoad && c.meshDepth === 0, "visible traffic mesh on dry asphalt");
      }
      const previous = this.lastTraffic?.[i], dx = previous ? (c.x - previous.x) * c.dir : 0;
      if (dx > 0 && dx < 1) {
        this.trafficProgress += dx;
        this.progressByCar[i] += dx;
      }
    }
    this.lastTraffic = s.traffic;
  }

  checkMooredBoats(s) {
    if (!this.boatReference) {
      if (site.boatIds) assert.deepEqual(s.boats.map(b => b.id).sort(), [...site.boatIds].sort(), "complete PC runtime boat registry");
      this.boatReference = s.boats;
    }
    const original = this.boatReference.filter(b => b.id !== this.boatUnderTest);
    assertMoored(s.boats.filter(b => b.id !== this.boatUnderTest), original);
    this.bobFrames?.push(s.boats);
  }

  checkSafety(s, ms) {
    const a = this.safety, c = s.car, w = s.water;
    assert.ok(c?.kind === "car" && c.id === this.id, "tracked car still exists");
    assert.equal(c.object, a.object, "the same rendered car survived");
    for (const [name, p] of Object.entries({ feet: s.player, face: s.face, camera: s.camera, chassis: c.mesh,
      ...Object.fromEntries(c.corners.map((p, i) => [`corner ${i}`, p])),
      ...Object.fromEntries(c.wheels.map(({ tire }, i) => [`tire ${i}`, tire])) })) {
      assert.ok([p.x, p.y, p.z, p.floor].every(Number.isFinite), `finite ${name} and bed`);
      assert.ok(p.surface === null || Number.isFinite(p.surface), `finite ${name} water surface`);
      assert.ok(p.y >= p.floor - 0.065, `${name} below bed: ${JSON.stringify(p)}`);
    }
    assert.ok([c.heading, c.headingDrawn, c.yaw, c.pitch, c.roll, c.speed, c.pace, c.steer, c.top].every(Number.isFinite), "finite car motion and rotation");
    assert.ok(s.camera.rotation.every(Number.isFinite));
    close(Math.hypot(...s.camera.rotation), 1, 0.002, "finite normalized camera world rotation");
    close(gap(c, c.mesh), 0, 0.002, "drawn chassis matches accepted horizontal pose");
    close(turn(c.heading, c.headingDrawn), 0, 0.002, "drawn chassis heading matches motion");
    assert.ok(!s.swim && s.dive < 0.001 && !s.undersea && !s.player.air, "car episode keeps ordinary swim, dive and jump out");
    assert.ok(s.zone === "town" && !s.poolMode, "town retains scene ownership");
    if (w?.assistedOnFoot) assert.ok(s.corridorClear, "swept exterior foot clearance against the live world");

    for (const name of ["face", "camera"]) {
      const margin = s[name].surface === null ? Infinity : s[name].y - s[name].surface;
      const peak = Math.max(0, -margin);
      a.margin[name] = Math.min(a.margin[name], margin);
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
      if ((s.riding || w.assistedOnFoot) && s.face.surface !== null) {
        assert.ok(s.face.y >= s.face.surface + 0.145, "seated or exterior face clearance at its own live surface");
      }
      close(w.centreDepth, c.depth, 0.002, "reported depth agrees with floor and still surface");
      for (const [i, p] of c.wheels.entries()) close(w.wheelDepths[i], p.depth, 0.003, `displaced wheel ${i} depth`);
      assert.ok(w.carDrops >= 0 && w.carDrops <= 96 && w.totalDrops >= w.carDrops && w.totalDrops <= 420 && w.capacity === 420,
        "96 car drops within the 420 shared particle slots");
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
      if (w?.landing === "spare") {
        assert.ok(s.opaque, "the real fade covers the viewport on the relocation presentation");
        assert.ok(!w.active && !w.assistedOnFoot && s.reservations === 0, "the dry pair is handed back on that same presentation");
        close(gap(s.coveredTarget, s.player), 0, 0.002, "the snapped camera targets the placed learner under cover");
      }
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

  async frames(count, ms = quantum, observe) {
    const samples = [];
    for (let i = 0; i < count; i++) {
      const sample = await this.frame(ms);
      samples.push(sample);
      if (observe) await observe(sample);
    }
    return samples;
  }

  async until(predicate, message, count = 360, ms = quantum) {
    this.waitExpires = Date.now() + conditionBudget;
    this.condition = message;
    try {
      for (let i = 0; i < count; i++) {
        const s = await this.frame(ms);
        if (predicate(s)) {
          this.condition = undefined;
          return s;
        }
      }
      assert.fail(`${message} after ${count} presentations at ${ms} ms`);
    } finally { this.waitExpires = undefined; }
  }

  async watch() {
    const s = await this.read();
    assert.ok(s.water?.id === this.id && s.water.enabled && !s.water.active, "sample from the admitted dry car before water contact");
    this.safety = { object: s.car.object, episode: s.water.episode, peak: { face: 0, camera: 0 },
      margin: { face: Infinity, camera: Infinity }, under: {}, previous: s };
  }

  async control(selector, side = "right", minSize = 44) {
    const deadline = Date.now() + actionTimeout;
    let target;
    do {
      target = await this.evaluate(({ selector, side }) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const b = el.getBoundingClientRect(), x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
        const probes = [[x, y], [x - b.width / 4, y], [x + b.width / 4, y], [x, y - b.height / 4], [x, y + b.height / 4]];
        return { x, y, text: el.textContent.trim(), width: b.width, height: b.height,
          enabled: !el.matches(":disabled") && !el.closest('[inert], [aria-disabled="true"]'),
          visible: el.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
          fits: b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight
            && (!side || b.top > innerHeight / 2 && (side === "left" ? b.right < innerWidth / 2 : b.left > innerWidth / 2)),
          clear: probes.every(([px, py]) => el.contains(document.elementFromPoint(px, py))) };
      }, { selector, side }, `measure ${selector}`);
      if (target?.fits && target.clear && target.enabled && target.visible && target.width >= minSize && target.height >= minSize) return target;
      await delay(20);
    } while (Date.now() < deadline);
    assert.fail(`${selector} has no clear, enabled target inside the viewport: ${JSON.stringify(target)}`);
  }

  pressKey(key) { return this.op(`press ${key}`, () => this.page.keyboard.press(key), actionTimeout); }
  async tap(p) {
    await this.touch("touchStart", 3, p);
    await this.touch("touchEnd", 3);
  }

  async act(action) {
    const expectedKind = ["convertible", "parked"].includes(action) ? "drive" : action;
    if (action === "out" && this.safety && this.safety.trigger === undefined) this.safety.exitInputAt = this.last.now;
    const prompt = await this.evaluate(() => ({ ...window.__ew.store.getState().hud.prompt, nearest: window.__ew.game.nearest?.id }));
    assert.equal(prompt.kind, expectedKind, "actual HUD action kind");
    assert.equal(prompt.nearest, this.id, "action addresses the tracked ride");
    assert.equal(prompt.label, labels.desktop[action], "localized prompt from the game");
    if (!this.phone) {
      await this.control(".prompt", null, 1);
      const label = await this.evaluate(() => [...document.querySelector(".prompt .prompt-text").childNodes]
        .filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join("").trim());
      assert.equal(label, labels.desktop[action], "localized desktop text as displayed");
      return this.pressKey("e");
    }
    const point = await this.control(".act-btn");
    assert.equal(point.text, labels.phone[action], "localized phone action as displayed");
    this.lastAction = point;
    await this.tap(point);
  }

  async key(key, on) {
    if (this.downKeys.has(key) === on) return;
    await this.op(`${on ? "hold" : "release"} ${key}`, () => this.page.keyboard[on ? "down" : "up"](key), actionTimeout);
    if (on) this.downKeys.add(key);
    else this.downKeys.delete(key);
  }

  async touch(type, id, p) {
    const end = type === "touchEnd";
    const point = end ? this.touches.get(id) : { x: p.x, y: p.y, id };
    // Use one CDP session for every finger. End only this contact when another is still down.
    const touchPoints = end && this.touches.size === 1 ? [] : [point];
    await this.op(`${type} ${id}`, () => this.cdp.send("Input.dispatchTouchEvent", { type, touchPoints }), actionTimeout);
    if (end) this.touches.delete(id);
    else this.touches.set(id, point);
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
        await this.touch("touchStart", 1, this.joy);
      }
      const point = { x: this.joy.x + 60 * x, y: this.joy.y - 60 * y };
      assert.ok(point.x > 0 && point.x < 390 && point.y > 0 && point.y < 844, "captured stick move remains inside phone viewport");
      await this.touch("touchMove", 1, point);
    } else if (this.joy) {
      await this.touch("touchEnd", 1);
      this.joy = null;
    }
  }

  async stop(on) {
    if (!this.phone) return this.key("Space", on);
    if (!on) return this.touch("touchEnd", 2);
    const p = await this.control(".jump-btn.brake-btn");
    assert.equal(p.text, "STOP");
    await this.touch("touchStart", 2, p);
  }

  async jump() {
    if (!this.phone) return this.pressKey("Space");
    const p = await this.control(".jump-btn");
    await this.tap(p);
  }

  async spawn([x, z, rot], zone = "town") {
    await this.evaluate(({ zone, x, z, rot }) => {
      const g = window.__ew.game;
      g.enterZone(zone, { x, z, rot }, true);
      g.rig.yaw = rot; g.rig.snap();
    }, { zone, x, z, rot });
  }

  async board(id, roofed = false) {
    this.id = id;
    const door = await this.evaluate(id => {
      const g = window.__ew.game, r = g.rides.find(id), h = r.m.heading;
      const d = r.model ? r.m.spec.wide + 0.7 : 2.2;
      return [r.m.x + Math.cos(h) * d, r.m.z - Math.sin(h) * d, h];
    }, id);
    await this.spawn(door);
    const outside = await this.until(s => s.prompt === "drive" && s.nearSame && s.nearest === id, "real car door prompt", 120);
    assert.ok(outside.player.shown && outside.reach > 0.35 && outside.reach <= 1.45);
    await this.assertLazy();
    await this.act(roofed ? "parked" : "convertible");
    const entered = await this.until(s => s.riding === id && s.ridePhase === "in" && s.player.shown, "visible entry phase", 30);
    assert.equal(entered.riding, id);
    const board = await this.until(s => s.riding === id && s.ridePhase === "on" && s.water?.enabled && s.prompt === "out", "same car at the wheel with lazy water driver ready");
    assert.equal(board.player.shown, !roofed, "seated roof/convertible visibility");
    assert.ok(this.chunks.some(path => /carWaterRecovery/.test(path)), "boarding requested the lazy recovery module");
    assert.ok(await this.evaluate(() => {
      const r = window.__ew.game.rides;
      return r.waterFleet?.length > 0 && r.waterFleet.length === r.modeCars.size;
    }), "eligible boarding indexed the existing parked fleet");
    return board;
  }

  async stage([x, z, rot]) {
    this.route = [x, z, rot];
    this.stageName = `route (${x}, ${z}, ${rot})`;
    await this.evaluate(({ id, x, z, rot }) => {
      const g = window.__ew.game, r = g.rides.riding;
      if (r?.id !== id || g.rides.phase !== "on") throw new Error("stage an occupied town car");
      g.rides.resetPosition(r, { x, z, rot });
      g.rig.mode = "follow"; g.rig.stage = null;
      g.rideCourse = g.rig.yaw = rot;
      g.rig.target.set(x, 0, z); g.rig.snap();
    }, { id: this.id, x, z, rot });
  }

  async clearance(foot, obstacleTag, candidate) {
    return this.evaluate(({ id, foot, obstacleTag, candidate }) => window.__carWaterTest.clearance(id, foot, obstacleTag, candidate),
      { id: this.id, foot, obstacleTag, candidate });
  }

  async drawDelta() {
    const measured = await this.evaluate(() => {
      const g = window.__ew.game, { renderer, scene, rig: { cam } } = g;
      const objects = ["car-water-foam", "water-drops"].map(n => scene.getObjectByName(n)).filter(Boolean);
      const shown = objects.map(o => o.visible);
      const otherDrops = g.splashes.life.some((life, i) => life > 0 && !g.splashes.carKinds?.[i]);
      const frozen = () => {
        const others = [];
        scene.traverse(o => {
          if (objects.includes(o)) return;
          others.push([o.uuid, o.visible, o.layers.mask, o.position.toArray(), o.quaternion.toArray(), o.scale.toArray(),
            o.geometry?.uuid, o.count, o.intensity, o.color?.getHex?.(), o.material?.uuid]);
        });
        return JSON.stringify([g.t, cam.position.toArray(), cam.quaternion.toArray(), cam.projectionMatrix.elements,
          renderer.shadowMap.enabled, g.rides.crashes.stats(), g.rides.crashes.last(), others]);
      };
      const original = frozen();
      const render = () => { renderer.render(scene, cam); return renderer.info.render.calls; };
      const withEffects = render();
      let withoutEffects, restored, sameView;
      try {
        for (const obj of objects) obj.visible = false;
        withoutEffects = render();
        sameView = original === frozen();
      } finally {
        objects.forEach((obj, i) => { obj.visible = shown[i]; });
        restored = render();
      }
      return { withEffects, withoutEffects, restored, otherDrops, frozen: sameView && original === frozen() };
    });
    assert.ok(measured.frozen && !measured.otherDrops && measured.withEffects > 0, "frozen frame, no unrelated shared points");
    assert.equal(measured.restored, measured.withEffects, "the same presentation after restoring effect visibility");
    return measured.withEffects - measured.withoutEffects;
  }

  async coastShot(name, s) {
    if (!coastShots || this.coastFrames.has(name)) return;
    const { width, height } = this.page.viewportSize();
    const file = `${width}x${height}-coast-${name}.jpg`;
    await this.op(`capture ${file}`, () => this.page.screenshot({ path: join(coastShots, file), type: "jpeg", quality: 88,
      timeout: actionTimeout }), actionTimeout);
    this.coastFrames.add(name);
    this.log({ coastFrame: file, serial: s.serial, simulationSeconds: s.time, clockMs: s.now, car: s.car.id, object: s.car.object,
      x: s.car.x, z: s.car.z, band: s.water?.band, phase: s.water?.phase, riding: s.riding });
    const frozen = await this.evaluate(() => {
      const g = window.__ew.game;
      return { serial: g.presentedWorld.serial, time: g.t, now: performance.now() };
    });
    assert.deepEqual(frozen, { serial: s.serial, time: s.time, now: s.now }, "shore capture kept the sampled presentation frozen");
  }

  log(details) {
    console.log(this.label, JSON.stringify({ route: this.route, ...details, trafficProgress: this.trafficProgress,
      peakSubmersion: this.safety?.peak, worstClearance: this.safety?.margin }));
  }
}

const convertible = "park";
const recovering = s => s.water?.secondsLeft != null;
const released = s => !s.water?.active && !recovering(s);
const forwardProgress = (start, end, direction) => (end.x - start.x) * direction.x + (end.z - start.z) * direction.z;
const inputDetail = s => JSON.stringify({ ...s.touchInput, gameInput: s.stick, keys: s.keys,
  ride: s.hudRide, recovery: s.water?.phase });
const stickPointer = s => s.touchInput?.capture.find(({ target }) => target.split(" ").includes("joy"))?.ids[0];

async function measuredDepths(run, x, depths) {
  const samples = await run.evaluate(({ x, zs }) => zs.map(z => window.__carWaterTest.support(x, z)), { x, zs: depths.map(([z]) => z) });
  depths.forEach(([z, expected], i) => close(samples[i].depth, expected, 0.008, `independent still depth at (${x}, ${z})`));
  return samples;
}

async function roadStart(run, road) {
  await run.stage(road);
  const s = await run.frame();
  assert.ok(s.car.onRoad && s.car.stockGround && s.car.dryGround && s.car.depth === 0 && s.water.enabled && s.water.band === "dry");
  close(s.car.x, road[0], 0.002, "start on the paved approach x");
  close(s.car.z, road[1], 0.002, "start on the paved approach z");
  await run.watch();
}

async function assertDryPair(run, s, { onFoot = false, obstacleTag } = {}) {
  const pair = s.water?.landingPair;
  assert.ok(pair && pair.foot && pair.pose, "a returned car has a dry candidate and exit");
  assert.ok(s.car.visible && s.car.pace <= 0.02, "visible and stopped at the handback");
  close(gap(s.car, pair.pose), 0, 0.01, "parked mesh at the reported landing");
  const clear = await run.clearance(onFoot ? null : pair.foot, obstacleTag);
  assert.ok(clear.car && clear.foot && clear.carClear && clear.footClear && clear.walkable,
    `dry mainland support, walkability and independent live clearance ${JSON.stringify(clear)}`);
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
  const stable = s => released(s) && gap(s.car, landing.car) < 0.02 && gap(s.player, landing.player) < 0.025;
  let violation;
  const rest = await run.frames(Math.ceil(750 / (options?.ms ?? quantum)), options?.ms, async s => {
    if (violation || stable(s)) return;
    const supports = await run.evaluate(([a, b]) => window.__carWaterTest.footSupports(a, b), [landing.player, s.player]);
    const position = ({ x, y, z, heading, floor, surface }) => ({ x, y, z, heading, floor, surface });
    const delta = (a, b) => ({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z, horizontal: gap(a, b) });
    const snapshot = t => ({ serial: t.serial, car: position({ ...t.car, y: t.car.mesh.y }), foot: position(t.player),
      keys: t.keys, stick: t.stick, brake: t.brake, speed: t.player.velocity, air: t.player.air, pose: t.player.pose });
    violation = { landing: snapshot(landing), firstViolation: snapshot(s), savedPair: landing.water.landingPair,
      carDelta: delta(landing.car.mesh, s.car.mesh), footDelta: delta(landing.player, s.player), supports };
    run.log({ stationaryHandback: violation });
  });
  for (const s of rest) assert.ok(stable(s),
    "stable car and learner handback for at least 0.75 s");
  if (options?.stationaryDoor) for (const s of rest) {
    assert.ok(s.riding === null && s.player.surface === null && s.nearSame && s.reach >= 0.35 && s.reach <= 1.45,
      `dry learner can reboard the same car at presentation ${s.serial}`);
    close(s.player.y, s.player.floor, 0.02, `dry supported feet at presentation ${s.serial}`);
  }
  const { trigger, firstWet, released: end } = run.safety;
  assert.ok(Number.isFinite(trigger) && Number.isFinite(firstWet) && end === landing.now, "sampled trigger, first contact and release");
  run.log({ trigger: landing.water.reason, wetMs: trigger - firstWet, returnMs: end - trigger, wetToReleaseMs: end - firstWet, landing: landing.water.landing,
    fallbackReason: landing.water.fallbackReason, release: [landing.car.x, landing.car.z],
    stationary: { first: landing.serial, last: rest.at(-1).serial, foot: landing.player,
      carDrift: Math.max(...rest.map(s => gap(s.car, landing.car))), footDrift: Math.max(...rest.map(s => gap(s.player, landing.player))) } });
  return landing;
}

async function dryExit(run, roofed) {
  // Retain the safety sampler for the exterior exit and reboarding.
  await run.until(s => s.prompt === "out", `dry ${labels.phone.out} prompt returned`);
  await run.act("out");
  const door = await run.frame();
  assert.ok(door.ridePhase === "out" && door.player.shown && (!roofed || door.reach > 0),
    "exterior dry exit, with the roofed driver immediately unhidden at the door");
  const foot = await run.until(s => s.riding === null && s.nearSame, "dry exit ends on foot within real reboarding reach");
  const clear = await run.clearance();
  assert.ok(foot.player.shown && clear.foot && clear.footClear && clear.sameNear && clear.reach >= 0.35 && clear.reach <= 1.45);
  close(foot.player.y, clear.floor, 0.02, "ordinary dry exit feet");
  return foot;
}

async function reboardInland(run, roofed, centre, away = { x: 0, z: 1 }) {
  await run.until(s => s.prompt === "drive" && s.nearSame && s.nearest === run.id, "same recovered car offered by the normal prompt");
  await run.act(roofed ? "parked" : "convertible");
  const placed = await run.until(s => s.riding === run.id && s.ridePhase === "on" && s.water?.enabled, "normal reboarding of the recovered id");
  assert.equal(placed.player.shown, !roofed);
  if (centre) {
    const distance = gap(placed.car, centre);
    away = { x: (placed.car.x - centre.x) / distance, z: (placed.car.z - centre.z) / distance };
  }
  const projection = Math.sin(placed.car.heading) * away.x + Math.cos(placed.car.heading) * away.z;
  assert.ok(Math.abs(projection) > 0.5, "car can drive or reverse along the local dry direction");
  await run.drive(Math.sign(projection));
  const driven = await run.until(s => forwardProgress(placed.car, s.car, away) >= 2 && s.car.pace > 1.5, "at least two real metres inland");
  assert.ok(driven.car.floor >= -0.01 && driven.car.depth === 0 && driven.car.object === placed.car.object);
  await run.drive();
  run.log({ reboarded: placed.car.id, inlandMetres: forwardProgress(placed.car, driven.car, away), away });
  return driven;
}

function assertMoored(frame, original) {
  assert.deepEqual(frame.map(b => [b.id, b.uid]), original.map(b => [b.id, b.uid]), "stable runtime hull ids and meshes");
  for (const [i, b] of frame.entries()) {
    const before = original[i];
    close(gap(b, before), 0, 0.002, `${b.id} did not translate`);
    close(gap(b, b.mesh), 0, 0.002, `${b.id} rendered at logical pose`);
    close(turn(b.heading, before.heading), 0, 0.002, `${b.id} did not turn`);
    close(turn(b.yaw, b.heading), 0, 0.002, `${b.id} rendered yaw`);
    assert.ok(b.pace === 0 && b.damage === null && Math.abs(b.pitch) <= 0.035 && Number.isFinite(b.mesh.y), `${b.id} stopped and undamaged`);
    if (b.beach) {
      assert.deepEqual(b.beach, before.beach);
      assert.ok(b.beach.circles.length === 3 && b.beach.circles.every(c => c.registered), `${b.id} retains all three sand colliders`);
      close(b.beach.roll, 0.09, 0.001, `${b.id} built sand tilt`);
      close(b.roll, b.beach.roll, 0.001, `${b.id} fixed rendered tilt`);
      close(b.mesh.y, b.beach.y, 0.001, `${b.id} fixed rendered sand height`);
    } else {
      assert.ok(!before.beach && Math.abs(b.roll) <= 0.05, `${b.id} gentle afloat roll`);
    }
  }
}

function monitorBoats(frames) {
  const boats = frames[0];
  assert.ok(boats.length >= 2 && new Set(boats.map(b => b.id)).size === boats.length, "all moored boats sampled");
  if (site.boatIds) assert.deepEqual(boats.map(b => b.id).sort(), [...site.boatIds].sort(), "complete PC boat registry");
  const bobs = boats.map((_, i) => range(frames.map(f => f[i].mesh.y)));
  assert.ok(boats.every((b, i) => b.beach ? bobs[i] < 0.002 : bobs[i] > 0.02 && bobs[i] < 0.65),
    `gentle actual bob of every afloat hull and fixed sand height ${JSON.stringify(bobs)}`);
}

async function boatTrip(run) {
  delete run.safety;
  run.id = site.boat;
  run.inspectFrame = s => assert.ok(!s.water?.active && s.water?.id == null && s.reservations === 0,
    "car-water remains inactive throughout ordinary boating, swimming and diving");
  const foot = await run.evaluate(({ id, beach }) => {
    const g = window.__ew.game, r = g.rides.find(id);
    const valid = (x, z) => g.town.walkableAt(x, z) && g.rides.near(x, z) === r;
    if (valid(...beach)) return beach;
    for (let a = 0; a < 6.3; a += 0.2) for (const d of [2.4, 2.9, 3.3]) {
      const x = r.m.x + Math.cos(a) * d, z = r.m.z + Math.sin(a) * d;
      if (valid(x, z)) return [x, z, beach[2]];
    }
    return null;
  }, { id: site.boat, beach: site.beach });
  assert.ok(foot, `walkable spot within reach of ${site.boat}`);
  await run.spawn(foot);
  const at = await run.until(s => s.prompt === "boat" && s.nearest === site.boat, "real beach boat prompt");
  if (site.boatPose) {
    close(at.car.x, site.boatPose[0], 0.002, "muelle mooring x");
    close(at.car.z, site.boatPose[1], 0.002, "muelle mooring z");
    close(turn(at.car.heading, site.boatPose[2]), 0, 0.002, "muelle mooring heading");
  }
  await run.act("boat");
  const aboard = await run.until(s => s.riding === site.boat && s.ridePhase === "on" && !s.swim, "boards existing motorboat");
  await run.drive(1);
  const afloat = await run.until(s => s.car.z < site.wadingLimit - 7 && s.car.pace > 2, "boat runs out into the bay under power");
  assert.ok(gap(aboard.car, afloat.car) > 8 && afloat.car.visible, "real moving hull");
  await run.drive();
  await run.until(s => s.prompt === "out", "boat exit prompt");
  await run.act("out");
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
  await measuredDepths(run, site.road[0], site.depths);
  const boarded = await run.board(convertible);
  assert.ok(boarded.car.owners.length > 0 && boarded.car.owners.every(o => o.state !== "in" && o.dry), "owners stepped ashore");
  await run.until(s => s.car.owners.every(o => o.state !== "hop-out" && o.state !== "in"), "owners are down on the curb");
  await roadStart(run, site.road);
  run.bobFrames = [run.last.boats];
  run.inspectFrame = s => assert.ok(s.player.shown && s.riding === run.id && s.ridePhase === "on"
    && s.car.owners.every(o => o.state !== "in" && o.dry), "visible convertible driver with owners ashore throughout recovery");
  const samples = [run.last], bands = [], paces = {}, drawDeltas = {};
  let trigger, sprayEvents = 0, wakeAtBow = [], firstBow, firstSpray, wetSteps = 0;
  const splashBaseline = run.last.water.splashEvents;
  await run.drive(1);
  for (let i = 0; i < 480; i++) {
    const s = await run.frame(), c = s.car, w = s.water, previous = samples.at(-1);
    samples.push(s);
    if (run.phone) assert.ok(s.stick.y > 0.96 && Math.abs(s.stick.x) < 0.02, `continuous physical joystick input ${inputDetail(s)}`);
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
      const surf = await run.evaluate(({ x, z }) => window.__carWaterTest.support(x, z).surface, w.lastSpray);
      close(w.lastSpray.y, surf, 0.005, "spray origin at the live surface");
      if (c.effects?.spray > 0 && w.band === "shallow" && firstSpray === undefined) {
        firstSpray = s.now;
        await run.coastShot("01-shallow", s);
        drawDeltas.spray = await run.drawDelta();
        assert.ok(drawDeltas.spray >= 1 && drawDeltas.spray <= 2, "visible spray contributes at most two effect draws");
      }
      sprayEvents = w.sprayEvents;
    }
    const wake = c.effects?.wake;
    if (w.band === "shallow" && wake?.sides.every(n => n > 0) && wake.fore < -0.75 && !w.bowVertices) {
      const trail = { segments: w.wakeSegments, length: wake.fore - wake.aft, at: s.now };
      wakeAtBow.push(trail);
      if (s.now > firstSpray && trail.length > wakeAtBow[0].length + 0.12 && trail.segments > wakeAtBow[0].segments) {
        await run.coastShot("02-trail", s);
      }
    }
    const { bow = [], bumperHalf } = c.effects ?? {};
    if (!firstBow && bow.some(p => p.visible && p.above >= 0.065 && Math.abs(p.along - bumperHalf - 0.12) < 0.09 && Math.abs(p.across) < 0.12
      && p.nosePixels < 70) && bow.some(p => p.visible && p.across > c.wide) && bow.some(p => p.visible && p.across < -c.wide)) {
      assert.equal(w.band, "body-deep", "raised bow appears at body depth");
      firstBow = s.now;
      await run.coastShot("03-bow", s);
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
  assert.ok(trigger.now - run.safety.firstWet < 3500, "depth triggered before the continuous-wet timer");
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
  const miss = body.findIndex(s => s.water.motorMiss && s.water.motorRevs < 0.12);
  assert.ok(miss >= 0 && body.slice(miss + 1).some(s => !s.water.motorMiss && s.water.motorRevs > 0.25) && trigger.water.sputterEvents > 0
    && trigger.water.splashEvents > splashBaseline, "live motor drops and returns under body load, with real splash events");

  await run.drive();
  let drain, settle, tow;
  const floats = [];
  for (let i = 0; i < 220; i++) {
    const s = await run.frame();
    if (!recovering(s)) { assert.fail("release must follow a sampled visible settle and draining doors"); }
    samples.push(s);
    if (s.water.phase === "float") {
      floats.push(s);
      if (s.car.visible && s.car.pitch < -0.055) await run.coastShot("04-float", s);
    }
    if (s.water.phase === "tow") {
      tow ??= s;
      if (s.car.visible && gap(s.car, trigger.car) >= 1) await run.coastShot("05-tow", s);
    }
    if (s.water.phase === "settle") settle ??= s;
    if (s.water.phase === "settle" && s.car.effects?.streams.every(n => n >= 1) && s.water.drainLive >= 2) {
      drain = s;
      await run.coastShot("06-drain", s);
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
  assert.equal(landing.water.coughEvents, 2, "two final engine coughs in the settle beat");
  assert.equal(landing.water.landing, "trail", "normal approach uses its dry return corridor");
  monitorBoats(run.bobFrames);
  assert.ok(run.progressByCar.every(metres => metres > 0.2), `each ambient car made forward progress ${JSON.stringify(run.progressByCar)}`);
  delete run.bobFrames;
  assert.ok(run.last.water.carDrops === 0 && run.last.water.wakeSegments === 0 && run.last.water.drainLive === 0);
  drawDeltas.idle = await run.drawDelta();
  assert.equal(drawDeltas.idle, 0, "zero idle effect draws once the trail and drain expire");
  run.log({ drawDeltas, floatMs: floats.at(-1).now - trigger.now, coastZ: trigger.car.z });
  delete run.inspectFrame;
  const exterior = await dryExit(run, false);
  if (exterior.player.inView && exterior.car.visible) await run.coastShot("07-exit", exterior);
  await reboardInland(run, false);
  await run.coastShot("08-dry-reboard", run.last);
  await boatTrip(run);
  if (coastShots) assert.deepEqual([...run.coastFrames], [
    "01-shallow", "02-trail", "03-bow", "04-float", "05-tow", "06-drain", "07-exit", "08-dry-reboard",
  ], "all eight coast captures from the uninterrupted trip");
}

async function steering(run, wet) {
  await run.board(convertible);
  const start = wet ? site.wetTurn : site.dryTurn, band = wet ? "body-deep" : "dry";
  await run.watch();
  await run.stage(start);
  const settled = await run.frames(12);
  assert.ok(settled.every(s => s.water.band === band && !recovering(s) && s.car.pace < 0.02), "shore-parallel setup settles in the matched band");
  if (wet) assert.ok(settled.at(-1).car.depth >= 0.34 && settled.at(-1).car.wheels.every(p => p.depth > 0.3));
  const input = await run.evaluate(() => {
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
    close(s.stick.x, input.x, 0.015, `same physical stick turn ${inputDetail(s)}`);
    close(s.stick.y, input.y, 0.015, `same physical stick throttle ${inputDetail(s)}`);
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
    await run.act("out");
    await run.until(s => recovering(s) && s.riding === null, "exit the body-depth steering fixture");
    await run.drive(0.6, 0.62);
    await finish(run, { onFoot: true });
    assert.ok(run.phone ? run.last.stick.x > 0.5 : run.last.keys.includes("d"),
      `old steering stayed held through the covered handback ${inputDetail(run.last)}`);
    await run.drive();
    await run.until(s => s.prompt === "drive" && s.nearest === run.id, "ordinary drive prompt beside the recovered car");
  }
  return result;
}

async function damagedTrip(run) {
  const id = site.crashCar;
  await run.board(id, true);
  await run.evaluate(id => {
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
  const dents = await run.evaluate(id => {
    const R = window.__ew.game.rides, geom = R.find(id).mesh.children[0].geometry;
    const f = window.__carWaterDent;
    f.damaged = geom; f.positions = geom.attributes.position.array.slice(); f.impact = R.crashes.last();
    return { original: f.original.uuid, dented: geom.uuid, changed: f.originalPositions.length !== f.positions.length
      || f.positions.some((x, i) => Math.abs(x - f.originalPositions[i]) > 0.001) };
  }, id);
  assert.ok(dents.original !== dents.dented && dents.changed, "real rendered dent vertices before the drive");
  await roadStart(run, pc ? site.road : site.east);
  const identity = run.last.car.object;
  const checkDent = s => {
    assert.equal(s.car.object, identity);
    assert.ok(s.sameImpact, "no new impact");
    assert.equal(s.geometry, dents.dented, "same dented body geometry");
    assert.ok(s.crashStats.ownDraws <= 4, "at most four unbatched damage draws");
    assert.deepEqual(s.damage?.sides, hit.damage.sides);
    assert.equal(s.damage?.dentCount, hit.damage.dentCount);
    assert.equal(s.crashStats.damaged, hit.crashStats.damaged, "the damage count did not change during the water return");
    assert.ok(s.damage.scuffs && s.damage.bumperHanging && s.damage.lampCracked);
    assert.deepEqual(s.damage.crackedLamps, hit.damage.crackedLamps);
    close(s.damageAge - hit.damageAge, s.time - hit.time, 0.05, "damage continues to age through the episode");
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
  let damagedDrainDelta;
  if (pc) {
    await run.until(s => s.water.phase === "settle" && s.water.drainLive >= 2, "dented body and active sill drops");
    damagedDrainDelta = await run.drawDelta();
    assert.ok(damagedDrainDelta >= 1 && damagedDrainDelta <= 2, "car-water drain draw budget with the dent still rendered");
  }
  const landing = await finish(run);
  const damagedIdleDelta = await run.drawDelta();
  assert.equal(damagedIdleDelta, 0, "zero idle car-water draws with the dent still rendered");
  await dryExit(run, true);
  await reboardInland(run, true);
  assert.ok(await run.evaluate(id => {
    const geom = window.__ew.game.rides.find(id).mesh.children[0].geometry;
    const f = window.__carWaterDent, a = geom.attributes.position.array;
    return geom === f.damaged && a.length === f.positions.length && a.every((x, i) => x === f.positions[i]);
  }, id), "the dent's vertex buffer survived real driving and recovery");
  assert.ok(run.last.now - hit.now < 15000, "dent checked inside normal aging time");
  run.log({ impact: hit.hit, damage: landing.damage, dentGeometry: dents.dented, damagedDrawDelta, damagedDrainDelta, damagedIdleDelta });
}

async function assistedTrip(run, deep, route = deep ? site.west : site.east, roofed = false) {
  await run.board(roofed ? site.crashCar : convertible, roofed);
  await roadStart(run, route);
  await run.drive(1);
  const want = deep ? s => s.water.phase === "float" && s.water.age >= 0.12
    : s => s.water.band === "shallow" && s.car.depth > 0.11 && s.car.pace > 2.3;
  const before = await run.until(want, deep ? "float before tow" : "shallow motion before exit");
  assert.equal(before.prompt, "out");
  if (deep) assert.equal(before.water.reason, "depth");
  const originalDeadline = deep ? before.now + before.water.secondsLeft * 1000 : null;
  if (deep) {
    await run.drive();
    await run.stop(true);
    const held = await run.frames(5);
    assert.ok(held.every(s => s.brake && s.water.phase === "float" && s.car.pace < 0.02), "real brake held during the float beat");
    assert.ok((await run.read()).brake, "brake still held when requesting exit");
  } else {
    assert.ok(run.phone ? before.stick.y > 0.96 : before.keys.includes("w"),
      `shallow exit requested under physical throttle ${inputDetail(before)}`);
  }
  await run.act("out");
  const exited = await run.frame();
  if (deep && run.phone) assert.ok(!exited.brake, `the touch brake ends on detachment ${inputDetail(exited)}`);
  if (deep) await run.stop(false);
  else await run.drive();
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
    // PC blends the exterior tread pose to 0.6 while normal swim ownership remains off.
    assert.ok(exited.player.swimPose >= (pc ? 0.59 : 0.8) && exited.player.y < exited.player.surface
      && exited.player.y >= Math.max(exited.player.floor, exited.player.surface - 0.8) - 0.005, "assisted treading at the live surface");
  } else if (footDepth < 0.57) {
    close(exited.player.y, exited.player.floor, 0.03, "feet wading on the bed");
    assert.ok(exited.player.swimPose < 0.2);
  } else {
    assert.ok(exited.player.y >= exited.player.floor - 0.01 && [0, pc ? 0.6 : 1].includes(exited.player.swimPose));
  }

  const assertDetached = s => assert.ok(s.riding === null && s.player.shown && s.water.assistedOnFoot && recovering(s)
    && s.water.episode === before.water.episode && !s.player.air, "inputs cannot cancel the assisted return or jump/reboard");
  for (let i = 0; i < 3; i++) {
    if (run.phone) {
      assert.equal(await run.op("check assisted action controls", () => run.page.locator(".act-btn").count()), 0,
        "action unavailable during assisted return");
      await run.tap(run.lastAction);
    } else await run.pressKey("e");
    assertDetached(await run.frame());
  }
  await run.jump();
  assertDetached(await run.frame());
  await run.drive(0.60, 0.62);
  if (!run.phone) await run.stop(true);
  const steeringFrames = await run.frames(12), pointer = stickPointer(steeringFrames[0]);
  for (const s of steeringFrames) {
    assertDetached(s);
    assert.ok(run.phone ? s.stick.x > 0.5 && pointer != null && stickPointer(s) === pointer : s.keys.includes("d"),
      `steer input reaches the game while assisted ${inputDetail(s)}`);
  }
  const heldThroughHandback = deep;
  if (!heldThroughHandback) {
    await run.drive();
    if (!run.phone) await run.stop(false);
  }
  const handback = await finish(run, { onFoot: true });
  if (heldThroughHandback) assert.ok(run.phone ? run.last.stick.x > 0.5 && stickPointer(run.last) === pointer : run.last.keys.includes("d"),
    `held steering remains registered through the handback ${inputDetail(run.last)}`);
  await run.drive();
  if (!run.phone) await run.stop(false);
  assert.ok(gap(handback.car, exited.car) >= 3, "assisted exit returned both bodies to land");
  if (route === site.road) assert.equal(handback.water.landing, "trail", "the clear wide approach admits an exterior swept return");
  if (handback.water.landing === "spare") {
    assert.ok(handback.opaque, "covered landing when a gate narrows the tow corridor");
    if (pc && route === site.west) assert.ok(Math.cos(handback.car.heading) > 0.5, "western coastal spare faces inland");
  }
  delete run.safety;
  if (deep && run.phone) {
    await run.drive(0.60, 0.62);
    const steps = await run.frames(8);
    const walked = steps.at(-1);
    assert.ok(steps.every(s => s.stick.x > 0.5) && gap(handback.player, walked.player) > 0.01,
      `fresh diagonal stick moves the learner after handback ${inputDetail(walked)}`);
    await run.drive();
  }
  await reboardInland(run, roofed);
}

async function pierRail(run) {
  await run.board(convertible);
  const support = await run.evaluate(([x, z]) => window.__carWaterTest.support(x, z), site.deck);
  assert.equal(support.floor, 0.3);
  assert.equal(support.depth, 0);
  assert.notEqual(support.surface, null, "boards support the car over actual water");
  await run.stage(site.deck);
  await run.watch();
  const at = await run.frame();
  assert.ok(at.water.band === "dry" && at.car.wheels.every(p => p.depth === 0));
  close(at.car.mesh.y, 0.3, 0.02, "real deck supports the chassis");
  const rail = await run.evaluate(([x, z]) => {
    const boxes = window.__ew.game.town.colliders.boxes;
    return boxes.find(b => b.deckRail && b.minX > x && b.minX < x + 3 && z >= b.minZ && z <= b.maxZ);
  }, site.deck);
  assert.ok(rail, "the pier has its real solid side rail");
  await run.drive(1);
  const frames = await run.frames(52);
  assert.ok(Math.max(...frames.map(s => s.car.x)) > at.car.x + 0.15, "actually moved toward the solid rail");
  const behindRail = (s) => !s.water.active && s.water.band === "dry" && s.car.mesh.y >= 0.26 && s.car.z < rail.maxZ
    && s.car.floor === 0.3 && s.car.wheels.every(p => p.depth === 0 && p.tire.floor === 0.3 && p.x <= rail.minX + 0.03)
    && s.car.bumpers.every(p => p.x <= rail.minX + 0.002 || p.z <= rail.minZ || p.z >= rail.maxZ);
  assert.ok(frames.every(behindRail), "accepted bumper corners and tires stay outside the real side rail on the boards");
  assert.ok(frames.slice(-10).some(s => s.car.pace < 0.6) || Math.abs(frames.at(-1).car.x - frames.at(-10).car.x) < 0.06,
    "rail stops travel through its edge under sustained physical throttle");
  const sustained = await run.frames(60);
  await run.drive();
  const held = sustained.at(-1), sustainedDrift = gap(held.car, frames.at(-1).car);
  assert.ok(sustained.every(behindRail) && sustainedDrift < 0.06, "no slow creep around a caught bumper corner");
  const backed = [], segments = [];
  if (pc && !run.phone) {
    for (const [steer, count] of [[0, 20], [-1, 8], [0, 7]]) {
      // S stays down while A is pressed and released on the frozen clock.
      await run.drive(-1, steer);
      const leg = await run.frames(count);
      assert.ok(leg.every(s => s.keys.includes("s") && s.keys.includes("a") === !!steer
        && !s.keys.includes("w") && !s.keys.includes("d")), "actual keyboard state for every reverse frame");
      backed.push(...leg);
      const { serial, car: { x, z, heading, speed } } = leg.at(-1);
      segments.push({ keys: steer ? "S+A" : "S", count, serial, x, z, heading, speed });
    }
  } else {
    await run.drive(-1, -0.25);
    backed.push(...await run.frames(35));
  }
  await run.drive();
  const end = backed.at(-1);
  const retreat = held.car.x - end.car.x, yaw = turn(end.car.heading, held.car.heading);
  let approachClearance, reverseClearance;
  if (pc) {
    const path = samples => samples.map(({ serial, car: { x, z, heading, half, wide } }) => ({ serial, x, z, heading, half, wide }));
    [approachClearance, reverseClearance] = await run.evaluate(({ id, approach, reverse }) => {
      const { pierRailSweep } = window.__carWaterTest;
      return [pierRailSweep(id, approach), pierRailSweep(id, reverse)];
    }, { id: run.id, approach: path([at, ...frames, ...sustained]), reverse: path([held, ...backed]) }, "sweep accepted poses against the live pier rails");
  }
  run.log({ deck: support, maxPierX: Math.max(...frames.map(s => s.car.x)), rail: rail.minX, sustainedDrift,
    reverse: { segments, retreat, yaw, endSpeed: end.car.speed, approachClearance, reverseClearance } });
  assert.ok(backed.every(s => !s.water.active), "reverse stays out of a wet episode");
  if (pc) {
    assert.ok(approachClearance.clearance >= -1e-8 && reverseClearance.clearance >= -1e-8,
      "the full accepted bumper sweep stays clear of every live pier rail");
    assert.ok(backed.every(s => behindRail(s) && s.car.depth === 0 && s.car.corners.every(p => p.floor === 0.3)),
      "reverse stays on the dry boards with all chassis corners supported and tires clear");
    if (!run.phone) assert.ok(backed.every((s, i) => {
      const step = gap(s.car, (backed[i - 1] ?? held).car);
      return s.car.speed < 0 && step > 0 && step <= s.car.pace * quantum / 1000 + 0.002;
    }), "continuous physical reverse at the measured pace");
  }
  assert.ok(retreat > 0.15, `physical reverse retreats from the rail by more than 0.15 m, got ${retreat}`);
  assert.ok(Math.abs(yaw) > 0.05, `physical steering changes heading by more than 0.05 rad, got ${yaw}`);
}

async function pierDeck(run) {
  await run.board(convertible);
  await run.stage(site.deckAisle);
  await run.watch();
  await run.evaluate(() => { window.__carWaterTest.trackPierDeck = true; });
  const at = await run.frame();
  const sweep = await run.evaluate(({ id, route, endZ }) => window.__carWaterTest.deckSweep(id, route, endZ),
    { id: run.id, route: site.deckAisle, endZ: site.deckEndZ }, "survey the full main-deck sweep");
  run.log({ sweep, endZ: site.deckEndZ });
  assert.ok(sweep.oldOverlap, "the old route overlaps the live El Muelle building");
  assert.ok(sweep.deck?.x0 < -40 && sweep.deck.y === 0.3 && sweep.allSupported,
    "the entire sweep lies on the same main deck over water");
  assert.ok(sweep.motion.radius <= sweep.body.wide && sweep.motion.radius + sweep.motion.offset <= sweep.body.half,
    "the full sweep also encloses the three motion circles");
  assert.equal(sweep.firstBlocker, null, `blocked main deck sweep ${JSON.stringify(sweep)}`);
  assert.equal(at.car.pierClearance.firstBlocker, null, "the accepted start is clear before throttle");
  const onBoards = s => s.car.surface !== null && s.car.floor === 0.3 && s.car.depth === 0 && s.water.band === "dry"
    && !s.water.active && s.car.mesh.y >= 0.28 && s.car.corners.every(p => p.floor === 0.3)
    && s.car.wheels.every(w => w.depth === 0 && w.tire.floor === 0.3);
  assert.ok(onBoards(at), "the full chassis and tires have dry deck support above the bay");
  assert.ok(!at.car.dryGround && !(await run.clearance()).car, "boards over water are outside dry mainland");
  await run.drive(1);
  let previous = at, maxStep = 0, tightest = at.car.pierClearance.tightest;
  const end = await run.until(s => {
    const step = gap(s.car, previous.car);
    const detail = `serial ${s.serial}, (${s.car.x}, ${s.car.z}), heading ${s.car.heading}, pace ${s.car.pace}, step ${step}`;
    assert.ok(onBoards(s), `clear decking supports the entire moving car at ${detail}`);
    assert.equal(s.car.pierClearance.firstBlocker, null, `${detail}: ${JSON.stringify(s.car.pierClearance.firstBlocker)}`);
    assert.ok(run.phone ? s.stick.y > 0.95 : s.keys.includes("w"), "physical forward control stays held");
    assert.ok(s.car.z < previous.car.z && s.car.speed > 0 && step <= s.car.pace * (s.now - previous.now) / 1000 + 0.002,
      `continuous physical travel under forward throttle, ${detail}`);
    assert.ok(s.car.z >= site.deckEndZ && s.car.bumpers.every(p =>
      p.x >= sweep.bounds.minX - 0.001 && p.x <= sweep.bounds.maxX + 0.001
      && p.z >= sweep.bounds.minZ - 0.001 && p.z <= sweep.bounds.maxZ + 0.001),
      `the accepted pose stays in the surveyed aisle, ${detail}`);
    previous = s;
    maxStep = Math.max(maxStep, step);
    if (s.car.pierClearance.tightest.gap < tightest.gap) tightest = s.car.pierClearance.tightest;
    return at.car.z - s.car.z >= 3 && s.car.pace > 1.5;
  }, "drive three metres along the clear deck", 120);
  await run.drive();
  run.log({ boardHeight: end.car.floor, deckMetres: at.car.z - end.car.z, maxStep, tightest,
    end: { serial: end.serial, x: end.car.x, z: end.car.z, heading: end.car.heading, pace: end.car.pace } });
}

async function abruptLip(run) {
  await run.board(convertible);
  const wall = await run.evaluate(([x, z]) => window.__ew.game.town.colliders.boxes
    .find(b => b.tag !== "sea" && x > b.minX && x < b.maxX && b.minZ > z && b.maxZ < z + 3), site.lip);
  assert.ok(wall && wall.maxX - wall.minX >= 10, "real solid back lip");
  await run.watch();
  await run.stage(site.lip);
  await run.drive(-1);
  const first = await run.frame();
  assert.ok(first.car.depth >= 0.85 && first.water.reason === "depth" && first.water.phase === "float", "abrupt drop detected on first frame beyond the real lip");
  assert.ok(first.car.z + first.car.half <= wall.minZ + 0.02, "the staged collision footprint is on the water side of the back wall");
  const reversal = await run.frames(24);
  assert.ok(reversal.every(s => s.car.pace <= 0.02 && gap(s.car, first.car) < 0.02), "reverse cannot override a real deep-water latch");
  const land = await finish(run);
  assert.ok(land.water.fallback && land.water.fallbackReason === "no-corridor" && gap(land.car, first.car) > 5);
  assert.ok(run.phone ? run.last.stick.y < -0.96 : run.last.keys.includes("s"),
    `old reverse stayed held through the covered handback ${inputDetail(run.last)}`);
  await run.drive();
  await run.drive(1);
  await run.until(s => s.car.speed > 0.25 && !recovering(s), "fresh throttle drives the same car after release", 30);
  await run.drive();
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
    await run.tap(await run.control(".minimap", null));
  } else await run.pressKey("m");
  const panel = await run.frame(ms);
  assert.ok(panel.hudPanel === "map" && !panel.brake && !panel.stick.x && !panel.stick.y, "map open with controls released");
  const trigger = await run.until(recovering, "continuous-wet deadline fires behind an open panel", 90, ms);
  assert.equal(trigger.water.reason, "wet-limit");
  close(trigger.now - run.safety.firstWet, 3500, ms + 0.003, "wet limit at 3.50 s on the 50 ms clock");
  assert.ok(trigger.hudPanel === "map" && gap(trigger.car, braked.car) < 0.05);
  const landed = await finish(run, { ms });
  assert.equal(landed.hudPanel, "map", "the open panel did not delay the handback");
  await run.pressKey("Escape");
  assert.equal((await run.frame(ms)).hudPanel, null);
}

async function pausedFallback(run) {
  await run.board(convertible);
  await run.watch();
  await run.stage(site.offshore);
  const first = await run.frame();
  assert.equal(first.water.reason, "depth");
  await run.act("out");
  const detached = await run.frame();
  assert.ok(detached.riding === null && detached.water.assistedOnFoot && detached.player.swimPose >= (pc ? 0.59 : 0.8));
  const [primary, emergency] = detached.water.spares;
  assert.ok(primary && emergency && gap(primary, emergency) >= 9, "observe distinct cached primary and emergency candidates");
  for (const p of [primary, emergency]) {
    const clear = await run.clearance(p.foot, undefined, p);
    assert.ok(clear.car && clear.foot && clear.carClear && clear.footClear && clear.walkable,
      `candidate is an independently clear car and foot reservation with the actors running ${JSON.stringify(p)}`);
  }
  const tag = "car-water-browser-obstruction";
  await run.evaluate(({ primary, tag }) => window.__ew.game.town.colliders.addBox(primary.x, primary.z, 2, 2, tag), { primary, tag });
  try {
    const jumped = await run.frame(3601);
    assert.ok(jumped.now > run.safety.deadline && released(jumped), "elapsed deadline resolved on the first resumed presentation");
    assert.equal(jumped.water.reason, "depth", "original hazard retained");
    assert.equal(jumped.water.landing, "spare");
    assert.equal(jumped.water.fallbackReason, "no-corridor");
    assert.ok(jumped.water.fallback && gap(jumped.car, primary) >= 5 && gap(jumped.car, emergency) < 0.01,
      "obstructed primary was rejected and the emergency spare used");
    assert.ok(jumped.opaque && jumped.serial === detached.serial + 1, "alternate is dry and covered in the first resumed presentation");
    await assertDryPair(run, jumped, { onFoot: true, obstacleTag: tag });
    await run.frames(45);
    run.log({ pausedMs: jumped.now - detached.now, firstResumed: jumped.serial, fallbackReason: jumped.water.fallbackReason,
      rejected: [primary.x, primary.z], landed: [jumped.car.x, jumped.car.z] });
  } finally {
    await run.evaluate(tag => {
      const boxes = window.__ew.game.town.colliders.boxes;
      const i = boxes.findIndex(b => b.tag === tag);
      if (i >= 0) boxes.splice(i, 1);
    }, tag);
  }
}

function assertReloadPair(wet, { first, clear, savedPlace }, label) {
  const { car, player, water } = first;
  const evidence = {
    serial: first.serial, previousSerial: first.before, scene: first.scene, zone: first.zone, document: first.document,
    originalId: wet.car.id, originalUuid: wet.car.object, id: car?.id, uuid: car?.object, reloadMarked: car?.reloadMarked,
    rider: first.riding, ridePhase: first.ridePhase, shown: player.shown, car: car?.mesh, carSurface: car?.surface,
    player, swim: first.swim, dive: first.dive, undersea: first.undersea, reservations: first.reservations,
    water, prompt: first.prompt, nearest: first.nearest, savedPlace, clear,
  };
  const checks = {
    presentation: first.serial === first.before + 1,
    town: first.scene === "town" && first.zone === "town",
    freshDocument: first.document === wet.document + 1,
    sameRideId: car?.kind === "car" && car.id === wet.car.id,
    freshUuid: typeof car?.object === "string" && car.object !== wet.car.object,
    markerAbsent: car?.reloadMarked === false,
    noRider: first.riding === null && first.ridePhase === null,
    playerShown: player.shown,
    drySurface: player.surface === null && car?.surface === null,
    noSwim: !first.swim && player.swimPose === 0 && first.dive === 0 && !first.undersea,
    noReservations: first.reservations === 0,
    noEpisode: water === null,
    atSavedPlace: savedPlace?.zone === "town" && gap(player, savedPlace) <= 0.02,
    dryCarFootprint: clear?.car,
    dryFootCircle: clear?.foot && clear?.walkable,
    carClear: clear?.carClear,
    footClear: clear?.footClear,
    nearestIsSameCar: clear?.sameNear,
    doorReach: clear?.reach >= 0.35 && clear.reach <= 1.45,
    footSupport: Math.abs(player.y - clear?.floor) <= 0.02,
  };
  assert.deepEqual(Object.keys(checks).filter(key => !checks[key]), [], `${label} ${JSON.stringify(evidence)}`);
  return evidence;
}

async function cleanup(run, reload) {
  await run.board(convertible);
  await run.watch();
  await run.stage(site.offshore);
  const first = await run.frame();
  assert.ok(recovering(first) && first.water.reason === "depth", "the offshore trial latches before the cleanup");
  const wet = (await run.frames(24)).at(-1);
  assert.ok(recovering(wet) && wet.car.depth >= 0.85 && wet.reservations >= 1);
  if (reload) {
    const stored = await run.evaluate(key => {
      const g = window.__ew.game, { id, mesh } = g.rides.riding;
      Object.defineProperty(mesh, "__carWaterReloadMarker", { value: true });
      const place = JSON.parse(localStorage.getItem(key))?.place;
      return { id, uuid: mesh.uuid, marked: Object.hasOwn(mesh, "__carWaterReloadMarker"),
        place, storePlace: window.__ew.store.getState().progress.place,
        support: place && window.__carWaterTest.support(place.x, place.z) };
    }, `${storage}-progress-v1`);
    assert.equal(stored.id, wet.car.id);
    assert.equal(stored.uuid, wet.car.object);
    assert.ok(stored.marked && stored.place.zone === "town" && stored.support.surface === null && gap(stored.place, wet.car) > 5,
      "production already stored a safe dry place while the marked original car is offshore");
    assert.deepEqual(stored.place, stored.storePlace, "saved town place matches the live store before reload");
    const ready = await run.start(wet);
    assert.deepEqual(run.firstReload.savedPlace, stored.place, "init script observed the same stored safe place before startup could write it");
    const evidence = assertReloadPair(wet, { first: ready, clear: await run.clearance(), savedPlace: stored.place }, "ready reload frame");
    run.log({ firstReload: run.firstReload, readyReload: evidence });
    assert.equal(ready.car.object, run.firstReload.uuid, "the fresh rendered car survives startup");
    await run.until(s => s.prompt === "drive" && s.nearSame && s.nearest === wet.car.id,
      "same id available through the normal prompt after reload");
    await run.act("convertible");
    const entered = await run.until(s => s.riding === wet.car.id && s.ridePhase === "in" && s.player.shown, "visible entry after reload", 30);
    const seated = await run.until(s => s.riding === wet.car.id && s.ridePhase === "on" && s.water?.enabled, "real reboarding after reload");
    assert.equal(entered.car.object, ready.car.object);
    assert.equal(seated.car.object, ready.car.object);
    assert.ok(seated.player.shown, "convertible driver stays visible after reload");
    run.log({ reboarded: seated.riding, uuid: seated.car.object, phase: seated.ridePhase });
  } else {
    await run.evaluate(zone => window.__ew.game.enterZone(zone, undefined, true), site.indoor);
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

async function malecon(run, gate) {
  const route = gate ? site.east : [80, site.east[1], site.east[2]];
  const walls = await run.evaluate(() => window.__ew.game.town.colliders.boxes.filter(b =>
    b.carRim && b.minZ < -66.3 && b.maxZ > -66.3 && b.minX < 86 && b.maxX > 79));
  assert.ok(walls.some(b => b.minX < 80 && Math.abs(b.maxX - 82.8) < 0.002)
    && walls.some(b => Math.abs(b.minX - 85.2) < 0.002), "real malecón wall with the 2.4 m gate");
  if (gate) await measuredDepths(run, route[0], site.gateDepths);
  await run.board(convertible);
  await roadStart(run, route);
  const start = run.last, bands = new Set();
  await run.drive(1);
  if (!gate) {
    const frames = await run.frames(210);
    const wall = walls.find(b => b.minX < route[0] && b.maxX > route[0]);
    assert.ok(start.car.z - Math.min(...frames.map(s => s.car.z)) > 5, "the car made physical progress up to the wall");
    assert.ok(frames.every(s => !s.water.active && s.water.band === "dry" && s.car.bumpers.every(p => p.z >= wall.maxZ - 0.01)),
      "solid dry wall keeps every bumper corner on the road side");
    assert.ok(frames.slice(-10).every(s => s.car.pace < 0.6), "sustained dry throttle ends at the intact wall");
    await run.drive();
    run.log({ blockedAt: frames.at(-1).car.z, wall });
    return;
  }
  const trigger = await run.until(s => {
    bands.add(s.water.band);
    close(s.car.x, route[0], 0.24, "real input through the centre of the opening");
    if (s.car.z <= -64 && s.car.z >= -68.7) {
      assert.ok(s.car.bumpers.every(p => p.x > 82.8 && p.x < 85.2), "full bumper width clears the gate");
    }
    return recovering(s);
  }, "continuous motion through the malecón gate to depth", 480);
  assert.deepEqual([...bands], ["dry", "shallow", "body-deep", "float"]);
  assert.ok(start.car.z - trigger.car.z > 20 && trigger.car.z < site.wadingLimit && trigger.car.z < site.oldClamp
    && trigger.water.reason === "depth" && trigger.now - run.safety.firstWet < 3500);
  await run.drive();
  await finish(run);
  await dryExit(run, false);
  await reboardInland(run, false);
}

async function westGrounds(run) {
  await run.board(convertible);
  await run.stage(site.cenote.west);
  await run.watch();
  const start = await run.frame();
  await run.drive(1);
  const west = await run.until(s => s.car.x < -116.3 && s.car.pace > 1.5, "continuous motion across the open western boundary");
  await run.drive();
  assert.ok(start.car.stockGround && start.car.dryGround && !west.car.stockGround && west.car.dryGround
    && start.car.x - west.car.x > 6.8 && Math.abs(west.car.z - 6) < 0.25 && west.water.enabled && !west.water.active);
  await run.stop(true);
  const stopped = await run.until(s => s.car.pace < 0.02, "stop on the west grounds");
  await run.stop(false);
  run.inspectFrame = s => assert.ok(!s.fade && released(s), "western dry exit stays outside recovery and fades");
  const foot = await dryExit(run, false), clear = await run.clearance();
  delete run.inspectFrame;
  assert.ok(foot.west && foot.player.surface === null && clear.westCar && clear.westFoot && clear.car && clear.carClear,
    "local car admission, normal door, and supported foot in the genuine grounds beyond the town boundary");
  assert.ok(foot.car.object === stopped.car.object && gap(foot.car, stopped.car) < 0.01,
    "the normal exit leaves the same car in place");
  const perimeter = await run.evaluate(z => {
    const reads = window.__carWaterTest, { west } = reads.world();
    const point = { x: west.minX - 0.8, z: z + 4 };
    return { clear: reads.clearance("park", point, undefined, { x: point.x, z, heading: -Math.PI / 2 }),
      support: reads.support(point.x, point.z) };
  }, stopped.car.z);
  assert.ok(perimeter.support.surface === null && !perimeter.clear.car && !perimeter.clear.foot
    && !perimeter.clear.carClear && !perimeter.clear.footClear && !perimeter.clear.walkable,
    "the solid far perimeter rejects both the footprint and feet even on a dry floor reading");
  const driven = await reboardInland(run, false, null, { x: -1, z: 0 });
  assert.ok(driven.car.dryGround && !driven.car.stockGround, "the same car drives farther onto the dry western grounds");
}

async function cenoteGeometry(run) {
  const samples = await run.evaluate(() => {
    const reads = window.__carWaterTest, ojo = reads.ways.find(w => w.id === "ojo");
    const r = 5.89, a = 0.27 * Math.PI;
    return { deck: reads.support(-130.25, -6), bench: reads.support(-129.6, -6), centre: reads.support(-136, -6),
      rock: reads.support(-136 + Math.cos(a) * r, -6 + Math.sin(a) * r),
      aboveRock: reads.support(-136 + Math.cos(a) * 6.6, -6 + Math.sin(a) * 6.6),
      salto: reads.support(-142.9, -6), ojo: reads.support(ojo.x, ojo.z), ways: reads.ways };
  });
  close(samples.centre.depth, 3.4, 0.001, "real cenote bowl depth");
  assert.equal(samples.centre.surface, 0.04);
  assert.ok(samples.deck.floorOverride && samples.deck.bowl < -0.4 && samples.deck.depth === 0 && samples.deck.surface === 0.04);
  close(samples.deck.floor, 0.86, 0.001, "east deck overrides underlying water and bowl");
  assert.ok(!samples.deck.dry && !samples.centre.dry, "over-water boards and the cenote bowl cannot be dry mainland");
  close(samples.bench.floor, 0.86, 0.001, "east deck above the rim");
  assert.ok(samples.rock.floorOverride && samples.rock.surface === 0.04 && samples.rock.depth > 0.45
    && samples.aboveRock.floorOverride && samples.aboveRock.surface === null && samples.aboveRock.floor === 0,
    "independent rock-step approach and abrupt water-side floor");
  assert.equal(samples.salto.floor, 4.6);
  assert.equal(samples.ojo.floor, -1.5);
  assert.ok(samples.ojo.west && samples.ojo.surface === null && samples.ojo.floorOverride);
  return samples;
}

async function cenoteTrip(run, approach = site.cenote.road) {
  const geometry = await cenoteGeometry(run);
  await run.board(convertible);
  await run.stage(approach);
  await run.watch();
  const start = await run.frame();
  const clearStart = await run.clearance();
  assert.ok(!start.car.stockGround && start.car.dryGround && start.car.depth === 0 && start.water.band === "dry"
    && clearStart.westCar && clearStart.car && clearStart.carClear, "clear full footprint at the dry cenote start");
  let previous = start;
  await run.drive(1);
  const trigger = await run.until(s => {
    assert.ok(gap(s.car, previous.car) <= Math.max(s.car.pace, previous.car.pace) * quantum / 1000 + 0.09,
      "a continuous physical step from the sandy opening to the cenote");
    if (recovering(s)) return true;
    previous = s;
    return false;
  }, "drive from the open grounds into the cenote's leading-axle latch", 230);
  await run.drive();
  assert.ok(trigger.car.x < -130 && gap(start.car, trigger.car) >= 4 && trigger.water.region === "cenote"
    && trigger.water.phase === "float" && trigger.water.reason === "depth" && trigger.car.depth < 0.34
    && Math.min(...trigger.car.wheels.slice(0, 2).map(p => p.depth)) >= 0.85
    && Math.min(...previous.car.wheels.slice(0, 2).map(p => p.depth)) < 0.85,
    "leading wheels enter actual deep water before the body reaches a body-deep floor");
  await run.act("out");
  const outside = await run.frame();
  assert.ok(outside.riding === null && outside.player.shown && outside.player.inView && outside.water.assistedOnFoot);
  const landing = await finish(run, { onFoot: true, stationaryDoor: true });
  const clear = await run.clearance();
  assert.ok(clear.westCar && clear.westFoot && gap(landing.car, site.cenote.centre) < 28 && landing.player.surface === null,
    "cenote handback is local dry mainland within the genuine western grounds");
  run.log({ centreDepth: geometry.centre.depth, candidateDistances: site.cenote.pads.map(pad => gap(landing.car, pad)),
    firstFloat: { x: trigger.car.x, z: trigger.car.z, depth: trigger.car.depth, wheels: trigger.water.wheelDepths } });
  await reboardInland(run, false, site.cenote.centre);
}

async function caveMouth(run) {
  await run.board(convertible);
  await run.watch();
  const geometry = await cenoteGeometry(run);
  const ojo = geometry.ways.find(w => w.id === "ojo");
  const margins = { faceFloor: Infinity, faceWater: Infinity, cameraWater: Infinity };
  let visibleFrames = 0;
  run.inspectFrame = s => {
    assert.ok(s.zone === "town" && s.nearWay == null && s.prompt !== "enter" && !s.nearbyWays.includes("ojo"),
      "assisted travel stays in town, outside the El Ojo fall zone and without a portal prompt");
    if (!s.water?.active) return;
    const faceFloor = s.face.y - s.face.floor;
    const faceWater = s.face.y - (s.face.surface ?? -Infinity);
    const cameraWater = s.camera.y - (s.camera.surface ?? -Infinity);
    assert.ok(faceFloor >= -1e-6 && faceWater >= 0.15 - 1e-6 && cameraWater >= 0.35 - 1e-6,
      `posed face and presented camera clear their own floor and surface ${JSON.stringify({ face: s.face, camera: s.camera })}`);
    if (!s.water.assistedOnFoot) return;
    assert.ok(s.player.shown && s.player.inView && !s.swim && s.dive < 0.001 && !s.undersea,
      "the assisted learner remains in view without ordinary swim or dive");
    visibleFrames++;
    margins.faceFloor = Math.min(margins.faceFloor, faceFloor);
    margins.faceWater = Math.min(margins.faceWater, faceWater);
    margins.cameraWater = Math.min(margins.cameraWater, cameraWater);
  };
  await run.stage([-139.4, -6, Math.PI]);
  const hazard = await run.frame();
  assert.ok(hazard.water.reason === "depth" && hazard.water.region === "cenote" && hazard.car.depth > 2.5);
  await run.act("out");
  const outside = await run.frame();
  assert.ok(outside.water.assistedOnFoot && outside.water.active && outside.riding === null && outside.player.shown
    && outside.player.inView && outside.nearbyWays.includes("boca") && outside.nearWay == null && outside.prompt !== "enter",
    "the actual exterior learner is close to the mouth and the return keeps cave actions inactive");
  assert.ok(gap(outside.player, ojo) > ojo.reach && gap(outside.player, ojo) < 15, "El Ojo is nearby and outside this assisted corridor");
  run.log({ exitDoor: outside.water.exitDoor, root: outside.player, face: outside.face });
  await finish(run, { onFoot: true });
  run.log({ visibleFrames, margins });
  delete run.inspectFrame;
  delete run.safety;

  // The same initial swimming spot as cave.mjs, with physical input into the live mouth.
  await run.spawn([-137.5, -6, -Math.PI / 2]);
  await run.until(s => s.swim && s.riding === null && !s.water?.active, "ordinary on-foot swimming after recovery");
  await run.drive(1);
  await run.until(s => s.swim && s.prompt === "enter" && s.nearWay === "boca", "normal grotto entrance prompt while swimming");
  await run.until(s => s.zone === "gruta" && !s.water?.active && s.reservations === 0, "deliberate swimming enters the grotto after handback");
  await run.drive();
  run.log({ cave: run.last.zone, mouth: geometry.ways.find(w => w.id === "boca"), ojo });
}

async function hullIsolation(run) {
  const id = "lancha-beached-3";
  await run.board(convertible);
  await run.stage([57.5, -70.2, Math.PI / 2]);
  await run.watch();
  const at = await run.frame();
  const hull = s => s.boats.find(boat => boat.id === id);
  assert.ok(hull(at)?.beach && hull(at).gap > 0.6, "real beach hull ahead of the car with initial clearance");
  await run.drive(1);
  const frames = await run.frames(105);
  await run.drive();
  assert.ok(frames.every(s => s.zone === "town" && !s.water.active && hull(s).gap >= -0.002
    && s.crashStats.damaged === at.crashStats.damaged && s.hit?.id === at.hit?.id),
    "no full hull overlap, car-water latch, or new crash when pushing toward the occupied sand collider");
  const lastTen = frames.slice(-10), nearest = Math.min(...frames.map(s => hull(s).gap));
  assert.ok(Math.max(...frames.map(s => s.car.x)) > at.car.x + 0.4 && nearest < 0.55,
    "the car reaches the real hull's edge");
  assert.ok(lastTen.every(s => s.car.pace < 0.6) || Math.abs(lastTen.at(-1).car.x - lastTen[0].car.x) < 0.08,
    "the car stops or slides tangentially at the hull");
  run.log({ hull: id, hullPose: hull(at), separation: nearest, end: frames.at(-1).car.x });
}

async function hotelGeometry(run) {
  const depths = await measuredDepths(run, site.hotel.road[0], site.hotel.depths);
  assert.ok(depths.every(s => s.surface === -0.12));
  const walls = await run.evaluate(() => window.__ew.game.town.colliders.boxes.filter(b => b.tag === "edge"
    && b.minX >= -111.7 && b.maxX <= -100.3 && b.minZ >= -41.1 && b.maxZ <= -24.3));
  const sides = [-109, -103].map(x => walls.find(b => b.carRim && b.minX < x && b.maxX > x && b.minZ <= -37 && b.maxZ >= -27));
  const back = walls.find(b => b.carRim && b.minZ < -37 && b.maxZ > -37 && b.minX <= -109 && b.maxX >= -103);
  assert.ok(sides.every(Boolean) && back, "both long rim sides and the back wall are intact");
  for (const [z, left, right] of [[-24.5, -105.8, -103.3], [-27, -106.075, -103.525]]) {
    const at = walls.filter(b => b.minZ < z && b.maxZ > z);
    assert.ok(at.some(b => Math.abs(b.maxX - left) < 0.002) && at.some(b => Math.abs(b.minX - right) < 0.002),
      `two intact wall sections with the actual south opening at z=${z}`);
  }
  return walls;
}

async function observePoolKids(run, walls, yieldCarId) {
  const { kids: original, time, now } = await run.evaluate(({ walls, yieldCarId }) =>
    window.__carWaterTest.watchPoolKids(walls, yieldCarId), { walls, yieldCarId });
  assert.deepEqual(original.map(kid => kid?.id), ["vale", "diego", "santi"]);
  assert.equal(new Set(original.map(kid => kid.uid)).size, 3, "three distinct pool roots");
  assert.ok(original.every(kid => kid.visible && !kid.talking && kid.home.x === kid.x && kid.home.z === kid.z));
  assert.ok(original[0].approach && !original[0].companion && original.slice(1).every(kid => kid.companion),
    "Vale has her own conversation approach and the other two keep their companion roles");
  const yawTolerance = 0.001;
  const checkHeading = (kid, heading, serial) =>
    close(turn(kid.heading, heading.expected), 0, yawTolerance,
      `${kid.id} ordinary pool-facing yaw at presentation ${serial} (${JSON.stringify({ ...heading, actual: kid.heading })})`);
  const progression = [{ now, time, yaw: original.map(k => k.heading) }];
  let previousTime = time, previousNow = now;
  let steps = 0, ballTargets = 0, centreTargets = 0, maxYawError = 0, minChildGap = Infinity, negativeControl;
  run.inspectFrame = s => {
    const { poolPose: pose, poolClearance: clearance } = s;
    assert.ok(pose && pose.before === s.before && pose.time === s.time, "sampled the NPC update for this presentation");
    assert.ok(pose.registered && pose.ball && pose.poolActive === false && pose.mode === null && pose.outside && !pose.talking,
      `the registered pool scene uses its ordinary outdoor pose branch ${JSON.stringify(pose)}`);
    close(pose.dt, s.time - previousTime, 1e-9, "NPC pose uses the simulation delta");
    close(pose.dt, Math.min(0.05, (s.now - previousNow) / 1000), 1e-9, "simulation delta follows the stepped clock");
    previousTime = s.time;
    previousNow = s.now;
    assert.deepEqual(s.kids.map(k => [k.id, k.uid, k.visible, k.home, k.approach, k.companion, k.talking]),
      original.map(k => [k.id, k.uid, k.visible, k.home, k.approach, k.companion, false]), "same active pool actors and conversation roles");
    for (const [i, kid] of s.kids.entries()) {
      close(gap(kid, original[i]), 0, 0.015, `${kid.id} stayed at the real pool spot`);
      close(kid.y, original[i].y, 0.025, `${kid.id} kept the existing seat or footing`);
      const heading = pose.headings[i];
      checkHeading(kid, heading, s.serial);
      maxYawError = Math.max(maxYawError, Math.abs(turn(kid.heading, heading.expected)));
      if (heading.target === "ball") ballTargets++;
      else centreTargets++;
      if (!negativeControl && heading.target === "ball" && Math.abs(turn(heading.expected, heading.previous)) > 2 * yawTolerance) {
        // Inject faults into copies of this real moving-ball observation.
        const injected = { fixed: heading.previous, wrongFacing: kid.heading + Math.PI, extraRotated: kid.heading + 0.03 };
        for (const yaw of Object.values(injected)) {
          assert.throws(() => checkHeading({ ...kid, heading: yaw }, heading, s.serial), /ordinary pool-facing yaw/);
        }
        negativeControl = { serial: s.serial, id: kid.id, ...heading, actual: kid.heading, rejected: injected };
      }
    }
    assert.ok(!s.poolMode && !s.swim && s.zone === "town", "the pool mini-game and ordinary swim retain their own activation");
    assert.ok(clearance.clearWalls && clearance.kids.every(k => k.gap >= 0.4 - 0.002),
      `the full car stays clear of pool walls and children at presentation ${s.serial} ${JSON.stringify(clearance)}`);
    minChildGap = Math.min(minChildGap, ...clearance.kids.map(k => k.gap));
    if (++steps <= 7) {
      progression.push({ serial: s.serial, now: s.now, time: pose.time, dt: pose.dt, ball: pose.ball,
        target: pose.headings.map(h => h.target), expected: pose.headings.map(h => h.expected), yaw: s.kids.map(k => k.heading) });
      if (steps === 7) run.log({ poolKidOrder: original.map(k => k.id), poolYawProgression: progression, negativeControl });
    }
  };
  return () => {
    assert.ok(negativeControl, "the pose reference rejected injected faults during a real ball-tracking turn");
    run.log({ poolPoseSteps: steps, ballTargets, centreTargets, maxYawError, yawTolerance, minChildGap, negativeControl });
  };
}

async function hotelApproach(run) {
  const walls = await hotelGeometry(run);
  await run.board(convertible);
  await run.stage(site.hotel.road);
  await run.watch();
  const reportPoolPose = await observePoolKids(run, walls, run.id);
  const start = await run.frame();
  await run.drive(1);
  let fastest = 0, yieldSeconds = 0;
  const stopped = await run.until(s => {
    fastest = Math.max(fastest, s.car.pace);
    if (recovering(s)) return true;
    const probe = s.poolYield, vale = s.kids[0];
    assert.equal(probe?.before, s.before, "sampled the car's driving input for this presentation");
    const dx = vale.x - probe.x, dz = vale.z - probe.z;
    const along = dx * probe.fx + dz * probe.fz;
    const across = dx * probe.fz - dz * probe.fx;
    // The ride-hint timer clears as soon as the front tires touch water. Check the
    // actual braking gap and held input through the same continuous yield interval.
    const yielding = probe.throttle > 0.5 && !probe.brake && Math.abs(probe.curve) < 0.015 && s.car.pace < 0.3
      && along > 0 && along <= probe.stopAt && Math.abs(across) < 1.35 && Math.abs(probe.gap - along) < 0.002;
    yieldSeconds = yielding ? yieldSeconds + probe.dt : 0;
    return yieldSeconds >= 0.3 && s.car.z < -24;
  }, "real forward drive through the south access to Vale's yield", 255);
  await run.drive();
  assert.ok(start.car.z - stopped.car.z > 4 && Math.abs(stopped.car.x - site.hotel.road[0]) < 0.25);
  assert.ok(fastest > 2, "car actually accelerated before the pool");
  const vale = stopped.kids.find(k => k.id === "vale");
  assert.ok(!recovering(stopped) && stopped.water.reason === null && yieldSeconds >= 0.3 && vale.z < stopped.car.z
    && Math.abs(vale.x - stopped.car.x) < 1.35 && stopped.car.z - vale.z < 5.2,
    "the stalled approach is a real people yield with Vale within the braking corridor");
  assert.ok(stopped.car.z > -28, "the car and children never mix in the basin on the straight approach");
  run.log({ poolApproachEnd: [stopped.car.x, stopped.car.z], pace: stopped.car.pace, yieldSeconds,
    brakingGap: stopped.poolYield.gap, rideHintSeconds: stopped.yieldAge, clearance: stopped.poolClearance });
  assert.deepEqual(await hotelGeometry(run), walls, "the access, coping and basin walls are intact after the approach");
  reportPoolPose();
}

async function hotelDeep(run) {
  const walls = await hotelGeometry(run);
  await run.board(convertible);
  await run.watch();
  await run.stage(site.hotel.deep);
  const reportPoolPose = await observePoolKids(run, walls);
  const first = await run.frame();
  const footprint = await run.evaluate(id => window.__carWaterTest.footprint(id), run.id);
  assert.ok(footprint.every(p => p.x > -109 && p.x < -103 && p.z > -37 && p.z < -27 && p.depth >= 0.85),
    "adversarial initial conditions put the entire car in independently measured deep water, within the rim and clear of kids");
  assert.ok(first.water.phase === "float" && first.water.reason === "depth" && first.water.region === "hotel" && first.water.age === 0,
    "the first deep-pool presentation latches with no throttle");
  run.log({ poolFloatSerial: first.serial, footprintMinDepth: Math.min(...footprint.map(p => p.depth)) });
  await run.act("out");
  const exterior = await run.frame();
  assert.ok(exterior.riding === null && exterior.player.shown && exterior.water.assistedOnFoot, "real exit from the pool hazard");
  const landed = await finish(run, { onFoot: true });
  const outside = p => p.x <= -109 || p.x >= -103 || p.z <= -37 || p.z >= -27;
  assert.ok(outside(landed.player) && outside(landed.car) && landed.player.surface === null && landed.car.object === first.car.object,
    "the accessible car and player returned to dry ground outside the basin");
  await reboardInland(run, false);
  await run.stop(true);
  await run.until(s => s.car.pace < 0.02, "stop normally after driving away from the pool");
  await run.stop(false);
  await dryExit(run, false);
  delete run.safety;
  await run.evaluate(() => window.__ew.game.walkTo(-104.8, -26, null), undefined, "take the normal foot path to Vale's approach");
  const vale = await run.until(s => s.prompt === "talk" && s.nearest === "vale" && s.riding === null,
    "Vale still offers her conversation to the learner on foot", 660);
  assert.ok(!vale.poolMode && vale.kids.every(k => !k.talking));
  run.log({ poolPrompt: vale.prompt, npc: vale.nearest, foot: [vale.player.x, vale.player.z] });
  assert.deepEqual(await hotelGeometry(run), walls, "the access, coping and basin walls are intact after the rescue");
  reportPoolPose();
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
  ...(pc ? [
    ["physical approach against the dry malecón wall", run => malecon(run, false)],
    ["physical crossing through the malecón gate", run => malecon(run, true)],
    ["unobstructed driving supported on the main pier deck", pierDeck],
    ["roofed driver exits under brake with the wide coast trail", run => assistedTrip(run, true, site.road, true)],
    ["contact isolation at a real sand hull", hullIsolation],
    ["western boundary, dry exit and accessible door", westGrounds],
    ["continuous northeast cenote entry and local return", cenoteTrip],
    ["southeast rock-step entry and local return", run => cenoteTrip(run, site.cenote.rock)],
    ["assisted return at the grotto mouth, then deliberate swimming entry", caveMouth],
    ["south hotel approach and live people yield", hotelApproach],
    ["first-frame deep hotel pool rescue", hotelDeep],
  ] : []),
];

// Existing scene recordings, including the crash and boat banks. A recording added to
// the scene must appear explicitly here to avoid masking new fetches with a directory rule.
const knownSceneRecordings = new Set(`
  alarm-chirp bean birds bloop boat-turn bow-splash buoy-bell buoy-bonk-1 buoy-bonk-2
  car-bump car-crunch card-flip-1 card-flip-2 card-shuffle card-slap-1 card-slap-2
  card-slide-1 card-slide-2 card-slide-3 chalk crowd-cheer cue-strike-1 cue-strike-2 cue-strike-3 cue-strike-4
  gate-whoosh glass gull-1 gull-2 gull-3 honk market open-sea paint-chips pair-chime paper-burst
  pool-break pool-clack-1 pool-clack-2 pool-clack-3 pool-clack-4 pool-clack-5 pool-cushion pool-drop
  repair-ding sea steam-hiss win-jingle win-sting
`.trim().split(/\s+/).map(name => `/sfx/${name}.mp3`));
for (const name of pc ? ["plaza-night", "room-cantina"] : ["room-poolhall-mh", "arrive", "shutter", "sparkle", "book-page"]) {
  knownSceneRecordings.add(`/sfx/${name}.mp3`);
}
// Vite serves the imported CSS's individual font files from node_modules in DEV.
// Both formats and all subsets come from the CSS references, including latin-ext for Lithuanian.
async function bundledFontPaths() {
  const root = new URL("../../", import.meta.url);
  const entry = await readFile(new URL("src/main.tsx", root), "utf8");
  const imports = [...entry.matchAll(/^import\s+["'](@fontsource\/[\w-]+\/[\w-]+\.css)["']/gm)];
  const paths = await Promise.all(imports.map(async ([, specifier]) => {
    const sheet = `/node_modules/${specifier}`;
    const css = await readFile(new URL(sheet.slice(1), root), "utf8");
    return [...css.matchAll(/url\(\s*["']?\.\/(files\/[\w-]+\.woff2?)["']?\s*\)/g)]
      .map(([, file]) => `${sheet.slice(0, sheet.lastIndexOf("/") + 1)}${file}`);
  }));
  return paths.flat();
}
const knownVisuals = new Set([
  "/brand/loading-wordmark.svg",
  ...await bundledFontPaths(),
  ...["cafe", "hotel", "market", "party", "passport", "taxi"].map(name => `/title/${name}.webp`),
  ...["sedan", "suv", "van", "truck", "delivery", "taxi", "police", "ambulance", "firetruck", "garbage-truck", "cone", "cone-flat"]
    .map(name => `/models/cars/${name}.glb`),
  "/models/cars/Textures/colormap.png",
]);
function knownVoice(path) {
  const m = path.match(/^\/(?:game\/)?(audio-es|audio-v2|audio)\/([0-9a-f]{12})\.mp3$/);
  return !!m && Object.hasOwn(clips.get(m[1]) ?? {}, m[2]);
}

const browser = await bounded("launch Chromium", () => chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"], timeout: actionTimeout,
}));
const failures = [];
try {
  for (const phone of [true, false]) {
    const viewport = phone ? { width: 390, height: 844 } : { width: 1280, height: 800 };
    const size = `${viewport.width}x${viewport.height}`;
    const identity = `${town} ${edition}/${helper} ${size} ${phone ? "touch" : "keyboard"}`;
    const measured = {};
    console.log("car-water run", identity);
    for (const [name, scenario] of cases) {
      const label = `${identity} ${name}`;
      let context, run;
      try {
        context = await bounded("create fresh context", () => browser.newContext({ viewport, serviceWorkers: "block",
          ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}) }));
        context.setDefaultTimeout(actionTimeout);
        const page = await bounded("create page", () => context.newPage());
        run = new Run(page, phone ? await bounded("attach touch CDP", () => context.newCDPSession(page)) : null, phone, label);
        await run.op("install offline voice and media routing", () => context.route("**/*", route => {
          const request = route.request(), url = new URL(request.url()), path = url.pathname;
          if (knownVoice(path)) return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*" } });
          if (url.origin !== new URL(base).origin) {
            run.errors.push(`blocked off-host request ${url.href}`);
            return route.abort();
          }
          if ((media.test(path) || ["media", "image", "font"].includes(request.resourceType()))
            && !knownSceneRecordings.has(path) && !knownVisuals.has(path)) {
            run.errors.push(`unrecognized media ${path}`);
            return route.abort();
          }
          return route.continue();
        }));
        await run.start();
        if (scenario === mainTrip) run.log({ observations: run.observations });
        const environment = await run.evaluate(() => ({ w: innerWidth, h: innerHeight, dpr: devicePixelRatio, touches: navigator.maxTouchPoints }));
        assert.equal(environment.w, viewport.width);
        assert.equal(environment.h, viewport.height);
        assert.equal(environment.dpr, phone ? 2 : 1);
        assert.equal(environment.touches > 0, phone);
        measured[name] = await scenario(run);
        assert.ok(run.trafficProgress > 0.2, "traffic made measured forward progress");
        assert.deepEqual(run.media.filter(p => recording.test(p) && (!knownVoice(p) && !knownSceneRecordings.has(p)
          || /car[-_]?water|sputter|wheel[-_]?spray|door[-_]?drain|car[-_]?cough/i.test(p))), [], "no new recording fetched");
        assert.deepEqual(run.errors, [], "no unexpected page, console or resource errors");
        console.log("ok", label);
      } catch (error) {
        console.error(label, JSON.stringify({ stage: run?.stageName, route: run?.route, operation: run?.operation,
          condition: run?.condition, observations: run?.observations, startup: run?.startup, trace: run?.trace, errors: run?.errors,
          chunks: run?.chunks, media: run && [...new Set(run.media)].slice(-24) }));
        console.error(error);
        failures.push(error);
      } finally {
        if (context) {
          if (run) run.closing = true;
          try { await bounded(`close ${label}`, () => context.close(), actionTimeout); }
          catch (error) { console.error(error); failures.push(error); }
        }
      }
    }
    try {
      const dry = measured[cases[1][0]], wet = measured[cases[2][0]];
      assert.ok(dry && wet, `${identity}: both matched turns sampled`);
      assert.deepEqual(dry.controls, wet.controls);
      close(dry.ms, 250, 0.002, "dry turn interval");
      close(wet.ms, dry.ms, 0.002, "body turn interval matches dry");
      close(dry.startPace, wet.startPace, 0.002, "matching 1.6 m/s steering starts");
      assert.ok(Math.sign(dry.angle) === Math.sign(wet.angle) && Math.abs(wet.angle) < Math.abs(dry.angle) * 0.75,
        `${identity}: actual body turn must be under 75% of dry (${wet.angle} / ${dry.angle})`);
      console.log("ok", identity, "matched ground/shore turns", JSON.stringify({ dry, wet }));
    } catch (error) {
      console.error(error);
      failures.push(error);
    }
  }
  if (failures.length) throw failures[0];
  console.log("car-water: both device runs passed");
} finally {
  await bounded("close browser", () => browser.close(), actionTimeout);
}
