// Use the Vite dev server for the sea debug hooks. SEA_SIZE sets the viewport and SEA_SHOTS saves the handoff and gates.
// Run with VITE_EDITION=es and WORLD_STORAGE=puerto-colibri. Repeat with VITE_LEARNER=lt.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { BoardRegistration, sampleBoardRegistration } from "./board-registration.mjs";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const shots = process.env.SEA_SHOTS || process.env.WORLD_SHOTS;
const size = process.env.SEA_SIZE || "1280x800";
assert.ok(["1280x800", "390x844", "390x664"].includes(size), `Unsupported SEA_SIZE: ${size}`);
const [width, height] = size.split("x").map(Number);
const phone = width === 390;
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const dot = (a, b) => a.reduce((n, q, i) => n + q * b[i], 0);
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(dot(a, b)))) * 180 / Math.PI;
const cssPoint = ([x, y]) => [(x + 1) * width / 2, (1 - y) * height / 2];
const timeout = 20_000, stallTime = 30_000, conditionBudget = 60_000;
const startedAt = performance.now();
const errors = [];
let stage, stageStartedAt, operation, operationStartedAt, condition, deadline, lastPresented;
let milliseconds = 50;
let reducedMotion = false;
let pixelTimes = {};

function mark(name) {
  if (Object.keys(pixelTimes).length) trace("pixel timings");
  pixelTimes = {};
  stage = name;
  operation = name;
  stageStartedAt = operationStartedAt = performance.now();
  trace(name);
}

function trace(message, error, log = console.log) {
  const now = performance.now();
  log(`[${new Date().toISOString()}] sea ${size} ${message} ${JSON.stringify({
    stage, operation, condition, elapsedMs: Math.round(now - startedAt), stageMs: Math.round(now - stageStartedAt),
    operationMs: Math.round(now - operationStartedAt), quantumMs: milliseconds,
    boat: lastPresented?.boat ?? null, reducedMotion: lastPresented?.reducedMotion ?? reducedMotion,
    serial: lastPresented?.serial ?? null,
    scene: lastPresented?.scene ?? null, phase: lastPresented?.phase ?? null,
    crossingAge: lastPresented?.crossingAge ?? null, returnAge: lastPresented?.returnAge ?? null,
    blendAge: lastPresented?.blendAge ?? null, pixelTimes, errors, error: error?.message,
  })}`);
}

async function timePixels(name, action) {
  const start = performance.now();
  try {
    return await action();
  } finally {
    const elapsed = Math.round(performance.now() - start);
    const timing = pixelTimes[name] ??= { calls: 0, totalMs: 0, maxMs: 0 };
    timing.calls++;
    timing.totalMs += elapsed;
    timing.maxMs = Math.max(timing.maxMs, elapsed);
  }
}

async function run(name, action, limit = stallTime) {
  operation = name;
  operationStartedAt = performance.now();
  const remaining = (deadline ?? Infinity) - operationStartedAt;
  const budget = Math.min(limit, remaining);
  const timedOut = () => new Error(remaining <= limit
    ? `Wait for "${condition}" exceeded ${conditionBudget / 1000}s during ${name}`
    : `${name} timed out after ${limit / 1000}s`);
  if (budget <= 0) throw timedOut();
  let timer;
  try {
    const stalled = new Promise((_, reject) => { timer = setTimeout(() => reject(timedOut()), budget); });
    return await Promise.race([stalled, action()]);
  } finally { clearTimeout(timer); }
}

function patchClip(points, width, height) {
  assert.ok(points.length > 0, "pixel samples require at least one patch");
  for (const [x, y] of points) {
    assert.ok(Number.isInteger(x) && Number.isInteger(y) && x >= 2 && x + 2 < width && y >= 2 && y + 2 < height,
      `5×5 patch at (${x}, ${y}) must use integer pixels inside ${width}×${height}`);
  }
  const xs = points.map(([x]) => x), ys = points.map(([, y]) => y);
  const x = Math.min(...xs) - 2, y = Math.min(...ys) - 2;
  // The exclusive right and bottom edges are one past the last sampled pixel.
  return { x, y, width: Math.max(...xs) + 3 - x, height: Math.max(...ys) + 3 - y };
}

function slerp(a, b, mix) {
  const cosine = dot(a, b), theta = Math.acos(Math.min(1, Math.abs(cosine)));
  if (theta < 1e-8) return a;
  const from = Math.sin((1 - mix) * theta) / Math.sin(theta), to = Math.sin(mix * theta) / Math.sin(theta);
  return a.map((n, i) => from * n + Math.sign(cosine || 1) * to * b[i]);
}

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
  window.__seaTitles = 0;
  new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) {
      if (node instanceof Element) window.__seaTitles += Number(node.matches(".sea-crossing-title"))
        + node.querySelectorAll(".sea-crossing-title").length;
    }
  }).observe(document, { childList: true, subtree: true });
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
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
}

let browser, context, page, failure;
let failureShot = { name: "failure", scale: "css" };
const screenshot = (name, options) =>
  run(`capture ${name}`, () => page.screenshot({ ...options, timeout }), timeout);
const heartbeat = setInterval(() => trace("progress"), 25_000);
try {
  mark("launch browser");
  const { chromium } = await run("import Playwright", () => import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright"));
  if (shots) await run("create screenshot directory", () => mkdir(shots, { recursive: true }));
  browser = await run("launch Chromium", () => chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"], timeout,
  }));
  context = await run("create context", () => browser.newContext({
    viewport: { width, height },
    ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
  }));
  context.setDefaultTimeout(timeout);
  page = await run("create page", () => context.newPage());
  const seaRequests = [];
  page.on("pageerror", err => errors.push(err.stack ?? err.message));
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (/\/src\/(?:game\/sea\/(?!entry\.ts$)|ui\/Sea\.tsx$)/.test(path)) seaRequests.push(path);
  });
  await run("route existing audio", () => page.route(/\.mp3(?:\?|$)/, request => request.fulfill({ status: 204, body: "" })));
  await run("seed progress and clock", () => page.addInitScript(installClock, [`${storage}-progress-v1`, JSON.stringify(progress)]));
  mark("load play screen");
  await run("navigate to beach", () => page.goto(base, { waitUntil: "domcontentloaded", timeout }));

  const evaluate = (fn, arg, name = "evaluate browser state") => run(name, () => page.evaluate(fn, arg));
  const key = (action, value) => run(`keyboard ${action} ${value}`, () => page.keyboard[action](value), timeout);
  const count = locator => run(`count ${locator}`, () => locator.count());
  const attr = (locator, name) => run(`read ${name} from ${locator}`, () => locator.getAttribute(name), timeout);
  const text = locator => run(`read text from ${locator}`, () => locator.innerText(), timeout);
  const inspect = (locator, fn, arg) => run(`sample ${locator}`, () => locator.evaluateAll(fn, arg));
  const observe = state => {
    if (state) lastPresented = { ...state.presented, phase: state.phase, boat: state.boat ?? state.town?.id,
      reducedMotion: state.reducedMotion,
      crossingAge: state.crossingAge, returnAge: state.returnAge, blendAge: state.townBlend?.age };
    return state;
  };
  const read = async () => observe(await evaluate(() => window.__ew?.sea?.(), undefined, "sample sea state"));
  let registration;
  const rawStep = async (frames = 1) => observe(await evaluate(([n, ms]) => {
    window.__step(n, ms);
    return window.__ew?.sea?.();
  }, [frames, milliseconds], `step ${frames} frame(s) at ${milliseconds} ms`));
  const step = async (frames) => {
    if (!registration) return rawStep(frames);
    let state;
    for (let i = 0; i < frames; i++) {
      state = await rawStep();
      registration.record(await run("sample board registration", () => sampleBoardRegistration(page, "sea")));
    }
    return state;
  };
  const waitFor = async (predicate, description, attempts = 160, frames = 5) => {
    condition = description;
    deadline = performance.now() + conditionBudget;
    try {
      for (let i = 0; i < attempts; i++) {
        const state = await step(frames);
        if (await predicate(state)) { condition = undefined; return; }
      }
      assert.fail(`${description} after ${attempts} attempts (${attempts * frames} simulated frames)`);
    } finally { deadline = undefined; }
  };
  const shot = name => shots && screenshot(`${name} full frame`, { path: `${shots}/${size}-sea-${name}.png` });

  async function press(locator) {
    mark(`press ${locator}`);
    const expires = performance.now() + timeout;
    let previous, target;
    do {
      target = await run(`measure hit target ${locator}`, () => locator.evaluateAll(nodes => {
        if (nodes.length !== 1) return { matches: nodes.length };
        const [node] = nodes;
        const visible = node.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        const enabled = !node.matches(":disabled") && !node.closest('[inert], [aria-disabled="true"]');
        if (!visible || !enabled) return { visible, enabled };
        const measure = () => {
          const { left, top, right, bottom, width, height } = node.getBoundingClientRect();
          const x = (left + right) / 2, y = (top + bottom) / 2;
          return { x, y, bounds: [left, top, right, bottom], clear: width > 0 && height > 0
            && left >= 0 && top >= 0 && right <= innerWidth && bottom <= innerHeight
            && node.contains(document.elementFromPoint(x, y)) };
        };
        const hit = measure();
        if (hit.clear) return hit;
        node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        return measure();
      }), timeout);
      if (target.clear && previous?.clear && target.bounds.every((n, i) => n === previous.bounds[i])) {
        return run(`${phone ? "tap" : "click"} ${locator}`, () => phone
          ? page.touchscreen.tap(target.x, target.y) : page.mouse.click(target.x, target.y), timeout);
      }
      previous = target;
      await delay(32);
    } while (performance.now() < expires);
    assert.fail(`no unique, visible, enabled, unobstructed target with stable bounds ${JSON.stringify(target)}`);
  }

  const chooseWords = () => press(page.locator('.sea-overlay [data-way="words"]'));
  const loading = page.locator(":is(.ew-loading, .road-loading, .sea-loading):visible");
  const presentationHud = (includeTitle = false) => run(
    includeTitle ? "sample loading, fade and crossing cue" : "sample loading and fade",
    () => loading.evaluateAll((loaders, includeTitle) => {
      const fades = document.querySelectorAll(".fade");
      const hud = { loaders: loaders.length, fadeOpacity: fades.length === 1 ? Number(getComputedStyle(fades[0]).opacity) : null };
      if (includeTitle) {
        const node = document.querySelector(".sea-crossing-title");
        hud.cue = { mounts: window.__seaTitles, clips: window.__seaAudio.length, text: node?.textContent,
          opacity: node ? Number(getComputedStyle(node).opacity) : undefined };
      }
      return hud;
    }, includeTitle));
  const ready = async () => {
    // A prefetch can finish on wall time, so yield to it while continuing seeded presentations.
    if ((await read())?.ready) return;
    await waitFor(async () => {
      if ((await read())?.ready) return true;
      await run("yield to sea mode prefetch", () => delay(20));
      return false;
    }, "sea mode prefetch finishes", 500, 1);
  };
  const hasPlayScreen = () => evaluate(() => window.__ew?.store.getState().screen === "play");
  await waitFor(hasPlayScreen, "the beach loads", 500);
  const helper = await evaluate(() => document.documentElement.lang);
  assert.ok(["en", "lt"].includes(helper));
  const ui = (lt, en) => helper === "en" ? en : lt;
  const locationTitle = ui("Atvira jūra", "Open sea");
  await evaluate(() => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
  assert.equal((await read()).phase, "town");
  assert.deepEqual(seaRequests, [], "the mode chunk stays unloaded before boarding");
  await evaluate(() => {
    const { audio } = window.__ew;
    window.__seaAudio = [];
    window.__seaBumps = 0;
    const bump = audio.bump.bind(audio);
    audio.bump = (...args) => { window.__seaBumps++; return bump(...args); };
    audio.play = async (_voice, _speed, text) => { window.__seaAudio.push(text); return true; };
  });

  mark(`swim to lancha-afloat-3 (${helper})`);
  await key("down", "ArrowUp");
  await waitFor(() => evaluate(() => {
    const { game, store } = window.__ew;
    return game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "lancha-afloat-3";
  }), "swims from the shallows within reach of the green lancha");
  await key("up", "ArrowUp");
  await key("press", "e");
  await waitFor(state => state?.town?.phase === "on", "boards with the interact key");
  const mooring = (await read()).town;
  assert.equal(mooring.id, "lancha-afloat-3");
  await ready();
  assert.ok(seaRequests.some((path) => path.endsWith("/mode.ts")), "the mode prefetches aboard");

  const title = page.locator(".sea-crossing-title");
  const titleState = async () => (await presentationHud(true)).cue;

  async function assertPresentation(state, previous, includeTitle) {
    try {
      if (previous) assert.equal(state.presented.serial, previous.presented.serial + 1, "one scene per presentation");
      assert.ok(state.triangles > 0 && state.drawCalls > 0, "the presentation contains geometry");
      if (state.presented.scene === "sea") assert.ok(state.drawCalls <= 25, `sea budget at ${state.crossingAge}s: ${state.drawCalls}`);
      const hud = await presentationHud(includeTitle);
      assert.equal(hud.loaders, 0);
      assert.equal(hud.fadeOpacity, 0);
      return hud.cue;
    } catch (error) {
      failureShot = { name: "presentation-failure" };
      throw error;
    }
  }

  async function frame(previous) {
    const state = await step(1);
    await assertPresentation(state, previous);
    return state;
  }

  async function pixels(points, label) {
    const clip = patchClip(points, width, height);
    const image = await timePixels("capture", () => screenshot(`${label} CSS clip ${clip.width}×${clip.height}`, { clip, scale: "css" }));
    return timePixels("decode", () => evaluate(async ({ data, points, clip }) => {
      const png = Uint8Array.from(atob(data), value => value.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([png], { type: "image/png" }));
      if (bitmap.width !== clip.width || bitmap.height !== clip.height) {
        const dimensions = `${bitmap.width}×${bitmap.height}`;
        bitmap.close();
        throw new Error(`Expected ${clip.width}×${clip.height} CSS pixels, got ${dimensions}`);
      }
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      return points.map(([x, y]) => {
        const patch = ctx.getImageData(x - clip.x - 2, y - clip.y - 2, 5, 5).data;
        const values = [0, 1, 2].map(channel => Array.from({ length: 25 }, (_, i) => patch[4 * i + channel]));
        return { median: values.map(a => a.sort((x, y) => x - y)[12]),
          mean: values.map(a => a.reduce((x, y) => x + y, 0) / a.length) };
      });
    }, { data: image.toString("base64"), points, clip }, `decode and sample ${label}`));
  }

  const raycastPatches = (hullFrame, candidates, label) => timePixels("raycast", () =>
    evaluate(({ hullFrame, candidates }) => {
      const { game } = window.__ew;
      const camera = game.sea.active ? game.sea.mode.view.camera : game.rig.cam;
      const boat = game.rides.riding.mesh, rider = game.player.root;
      const { width: w, height: h } = document.querySelector(".stage canvas").getBoundingClientRect();
      const ray = new game.raycaster.constructor();
      const objects = [boat, rider], hits = [];
      const p = boat.position.clone(), f = boat.position.clone().project(camera);
      const x = (f.x + 1) * w / 2, y = (1 - f.y) * h / 2;
      const hud = [...document.querySelectorAll(".road-header, .road-controls, .joy, .mode-score-card, .hud-top button, .sea-crossing-title")]
        .filter(node => getComputedStyle(node).visibility !== "hidden").map(node => node.getBoundingClientRect());
      const clear = (x, y) => x > 2 && x < w - 2 && y > 2 && y < h - 2
        && !hud.some(box => x + 2 >= box.left && x - 2 <= box.right && y + 2 >= box.top && y - 2 <= box.bottom);
      const sample = (cx, cy) => {
        ray.setFromCamera(p.set(cx / w * 2 - 1, 1 - cy / h * 2, 0), camera);
        const water = (-0.25 - ray.ray.origin.y) / ray.ray.direction.y;
        hits.length = 0;
        const hit = ray.intersectObjects(objects, true, hits)[0];
        if (hit && (water <= 0 || hit.distance < water)) {
          for (let o = hit.object; o; o = o.parent) if (o === boat) return "hull";
          return null;
        }
        return water > 0 && water < 45 ? "water" : null;
      };
      const cornersMatch = (cx, cy, type) => [-2, 2].every(a => [-2, 2].every(b => sample(cx + a, cy + b) === type));
      const types = ["hull", "water"];
      const count = 12;
      // A full set can carry over only after the current HUD, centre and corners all pass.
      if (candidates && types.every(type => candidates[type].length === count)
        && types.every(type => candidates[type].every(([cx, cy]) =>
          clear(cx, cy) && sample(cx, cy) === type && cornersMatch(cx, cy, type)))) {
        return { points: candidates, reused: true };
      }
      const points = { hull: [], water: [] };
      const scan = (left, top, right, bottom, missing) => {
        for (let cy = bottom; cy >= top; cy -= 5) for (let cx = left; cx <= right; cx += 5) {
          if (missing ? points[missing].length === count : points.hull.length === count && points.water.length === count) return;
          if (!clear(cx, cy)) continue;
          const type = sample(cx, cy);
          if (!type || (missing && type !== missing) || points[type].length >= count) continue;
          if (cornersMatch(cx, cy, type)) points[type].push([cx, cy]);
        }
      };
      scan(Math.round(x) - 65, Math.round(y) - 72, Math.round(x) + 65, Math.round(y) + 18);
      // During the crossing the camera can put the fixed grid entirely inside the
      // hull or miss a clear part of it. Search the projected hull and nearby water.
      if (hullFrame && (!points.hull.length || !points.water.length)) {
        const margin = 12;
        const bounds = [
          Math.max(3, Math.floor(hullFrame.left * w) - margin), Math.max(3, Math.floor(hullFrame.top * h) - margin),
          Math.min(w - 3, Math.ceil(hullFrame.right * w) + margin), Math.min(h - 3, Math.ceil(hullFrame.bottom * h) + margin),
        ];
        for (const type of types) {
          if (!points[type].length) scan(...bounds, type);
        }
      }
      return { points, reused: false };
    }, { hullFrame, candidates }, `raycast hull and water for ${label}`));

  let previousPatches;
  async function patches(state, label) {
    const { serial, scene } = state.presented;
    // Keep the original scan's first water coordinate for the return seam.
    const lastSeaFrame = Math.abs(state.returnAge - 1.2) < 1e-7;
    const candidates = !lastSeaFrame && previousPatches?.serial === serial - 1 && previousPatches.scene === scene
      ? previousPatches.points : null;
    const check = async ({ hull, water }) => {
      const { returnAge, crossingAge } = state;
      assert.ok(hull.length && water.length,
        `${label}: unobstructed hull and water patches (hull ${hull.length}, water ${water.length}, age ${returnAge ?? crossingAge ?? "n/a"})`);
      const colors = await pixels([...hull, ...water], `${label} hull and water patches`);
      const hullColors = colors.slice(0, hull.length), waterColors = colors.slice(hull.length);
      const contrast = hullColors.some(a => waterColors.some(b => a.median.some((c, i) => Math.abs(c - b.median[i]) >= 20)));
      return { contrast, mean: waterColors[0].mean, point: water[0] };
    };
    let { points, reused } = await raycastPatches(state.hullFrame, candidates, label);
    let sampled = await check(points);
    // Even a geometrically valid set can have different colours as the composite changes.
    if (reused && !sampled.contrast) {
      ({ points } = await raycastPatches(state.hullFrame, null, `${label} contrast fallback`));
      sampled = await check(points);
    }
    assert.ok(sampled.contrast, `${label}: hull and water have different composited colours at ${state.time ?? state.townFrame.time}`);
    previousPatches = { serial, scene, points };
    return sampled;
  }

  function sampleAt(samples, at, key, values) {
    const next = samples.findIndex(s => s[key] >= at - 1e-8);
    assert.ok(next >= 0, `samples reach ${at} seconds`);
    if (next === 0 || Math.abs(samples[next][key] - at) < 1e-8) return values(samples[next]);
    const a = samples[next - 1], b = samples[next], k = (at - a[key]) / (b[key] - a[key]);
    return values(a).map((v, i) => v + (values(b)[i] - v) * k);
  }

  async function departure(first, before, label) {
    mark(`sample departure through 2 seconds (${label})`);
    await run("wait for the crossing title", () => title.waitFor({ state: "attached", timeout }), timeout);
    const initial = await titleState();
    assert.equal(initial.mounts, before.mounts + 1, "one title mounts on physical departure");
    assert.equal(initial.text, locationTitle);
    assert.equal(initial.opacity, 0);
    const heading = page.getByRole("heading", { name: locationTitle, exact: true });
    assert.equal(await count(heading), 1);
    assert.equal(await attr(title, "aria-hidden"), "true");
    const samples = [first];
    let peak, reveal;
    const limit = Math.ceil(2000 / milliseconds) + 3;
    for (let i = 0; i < limit && samples.at(-1).crossingAge < 2 - 1e-8; i++) {
      const state = await step(1);
      const cue = await assertPresentation(state, samples.at(-1), true);
      assert.ok(state.crossingAge > samples.at(-1).crossingAge, "departure age advances on each presentation");
      samples.push(state);
      assertBoatFrame(state, label);
      await patches(state, label);
      if (!peak && state.crossingAge >= 0.65 - 1e-8) {
        peak = cue;
        assert.ok(cue.opacity > 0.95);
        assert.ok(await run("measure the crossing title against controls", () => title.evaluate(node => {
          const box = node.getBoundingClientRect();
          return [...document.querySelectorAll(".sea-mode button, .sea-mode .joy")].every(item => {
            if (getComputedStyle(item).visibility === "hidden") return true;
            const r = item.getBoundingClientRect();
            return !r.width || r.right < box.left || r.left > box.right || r.bottom < box.top || r.top > box.bottom;
          });
        })), "the title has clearance from buttons and boards");
      }
      if (state.crossingAge < 1.2 - 1e-8) assert.equal(cue.clips, before.clips);
      if (!reveal && state.crossingAge >= 1.2 - 1e-8) {
        reveal = cue;
        assert.equal(cue.clips, before.clips + Number(!first.gap), "one automatic non-gap clip at reveal");
      }
      if (state.crossingAge >= 1.25 - 1e-8) assert.equal(cue.text, undefined);
    }
    assert.ok(samples.at(-1).crossingAge >= 2 - 1e-8, "departure reaches two seconds within the expected frame count");
    assert.equal((await titleState()).mounts, before.mounts + 1);
    const reference = first.camera.position;
    const lift = state => state.camera.position.map((x, i) => x - reference[i]
      - (i === 1 ? 0 : state.hull[i] - first.hull[i]));
    if (!first.reducedMotion) for (const [at, weight] of [[0.325, 0.5], [0.65, 1]]) {
      const offset = sampleAt(samples, at, "crossingAge", lift);
      const want = first.retreat.map((n, i) => weight * (i === 1 ? (phone ? 0.55 : 0.70) : n * (phone ? 1.00 : 1.35)));
      assert.ok(distance(offset, want) <= 0.06, `${label}: rise and retreat at ${at}s: ${offset} vs ${want}`);
    } else {
      assert.ok(samples.slice(1).every(state => state.crestCameraLift === 0), "reduced motion disables the additional camera lift");
    }
    const end = samples.find(state => state.crossingAge >= 1.6 - 1e-8);
    assert.ok(distance(end.camera.position, end.chase.position) <= 0.03, "departure settles into the live chase");
    assert.ok(angle(end.camera.rotation, end.chase.rotation) <= 0.10);
  }

  async function checkReturn(label, first) {
    mark(`return ${label}`);
    const mounts = (await titleState()).mounts;
    let last = first ?? await read(), patch;
    if (last.presented.scene === "sea" && last.returnAge > 0) patch = await patches(last, label);
    for (let i = 0; i < Math.ceil(1300 / milliseconds) + 3; i++) {
      const state = await frame(last);
      if (state.presented.scene === "town") {
        const { townFrame: town } = state;
        const translate = v => v.map((n, i) => n + last.translation[i]);
        assert.ok(Math.abs(last.returnAge - 1.2) < 1e-7);
        assert.equal(town.time, last.time, "the bay waves use the same time");
        for (const key of ["hull", "rider"]) assert.ok(distance(translate(last[key]), town[key]) <= 0.01, key);
        assert.ok(distance(translate(last.camera.position), town.camera.position) <= 0.01, "return eye");
        assert.ok(angle(last.camera.rotation, town.camera.rotation) <= 0.10, "return gaze");
        for (const key of ["hullRotation", "riderRotation"]) assert.ok(angle(last[key], town[key]) <= 0.10, key);
        assert.ok(Math.abs(last.camera.fov - town.camera.fov) <= 0.10);
        assert.deepEqual(last.view, town.view);
        for (const key of ["bow", "stern", "helm"]) assert.ok(distance(cssPoint(last.landmarks[key]), cssPoint(town.landmarks[key])) <= 1, key);
        try {
          const [water] = await pixels([patch.point], `${label} first town water patch`);
          const change = patch.mean.reduce((sum, n, i) => sum + Math.abs(n - water.mean[i]), 0) / 3;
          assert.ok(change <= 5, `${label}: adjacent water changes by ${change}/255`);
        } catch (error) {
          failureShot = { name: "water-failure", scale: "css" };
          throw error;
        }
        mark(`return town blend (${label})`);
        const towns = [state];
        const limit = Math.ceil(600 / milliseconds) + 3;
        for (let j = 0; j < limit && towns.at(-1).townBlend.age < 0.6 - 1e-8; j++) {
          const next = await frame(towns.at(-1));
          assert.ok(next.townBlend?.age > towns.at(-1).townBlend.age, "town blend advances on each presentation");
          towns.push(next);
        }
        assert.ok(towns.at(-1).townBlend.age >= 0.6 - 1e-8, "town blend reaches 0.60 seconds within the expected frame count");
        for (const at of [0.05, 0.30, 0.60]) {
          const sample = towns.find(s => Math.abs(s.townBlend.age - at) < 0.001);
          assert.ok(sample, `town has a rendered frame at ${at}s`);
          const { age, eye, rotation, live } = sample.townBlend, k = (age / 0.6) ** 2 * (3 - 2 * age / 0.6);
          assert.ok(distance(sample.townFrame.camera.position, eye.map((n, i) => n + (live.position[i] - n) * k)) <= 0.04);
          assert.ok(angle(sample.townFrame.camera.rotation, slerp(rotation, live.rotation, k)) <= 0.15);
        }
        assert.equal((await titleState()).mounts, mounts);
        return state;
      }
      assertBoatFrame(state, label);
      patch = await patches(state, label);
      last = state;
    }
    assert.fail(`${label}: town did not present after the committed return`);
  }

  async function sailOut(label, { screenshots = false, full = true } = {}) {
    mark(`physical crossing (${label})`);
    const before = await titleState();
    const { edge, town: { x } } = await read();
    assert.equal(await evaluate(([x, z]) => window.__ew.seaPlaceBoat(x, z), [x, edge + 34], "place boat for departure"), true);
    await key("down", "ArrowUp");
    // Start just before the last half-second so every frame through the seam is checked.
    const approach = Math.ceil(0.5 * 1000 / milliseconds);
    const preceding = [];
    let last = await read(), first;
    for (let i = 0; i < 600; i++) {
      let current = await step(1);
      if (current.phase === "briefing") {
        await chooseWords();
        mark(`first sea frame (${label})`);
        current = await read();
      }
      if (current.phase === "drive") { first = current; break; }
      if (current.town.bowZ - edge < 7.5) {
        await assertPresentation(current, preceding.at(-1));
        await patches(current, "approach to the outer buoys");
        preceding.push(current);
        if (preceding.length > approach) preceding.shift();
        if (screenshots && current.town.bowZ - edge < 0.81) await shot("last-town");
      }
      last = current;
    }
    assert.equal(preceding.length, approach);
    assert.ok(preceding.every(state => state.presented.scene === "town"));
    assert.ok(first, "the sea scene starts within a few frames of crossing");
    await assertPresentation(first, last);
    assert.ok(last.town.bowZ > edge && last.town.bowZ - edge < 0.81);
    assert.ok(first.town.bowZ <= edge);
    assert.equal(first.presented.scene, "sea");
    assert.equal(first.presented.serial, last.presented.serial + 1);
    assert.ok(first.triangles > 0);
    for (const key of ["projection", "view", "hullRotation", "rider", "riderRotation"]) {
      assert.ok(Array.isArray(first[key]) ? distance(first[key], first.departureFrom[key]) < 1e-8
        : JSON.stringify(first[key]) === JSON.stringify(first.departureFrom[key]), `inherits town ${key}`);
    }
    assert.deepEqual(first.camera, first.town.camera, "the first sea camera inherits the town pose and FOV");
    assert.deepEqual(first.hull, first.town.hull, "the first sea frame keeps the hull in place");
    assert.ok(Math.abs(first.hull[2] - last.town.hull[2]) < milliseconds / 1000 * 4 * 17, `hull moved ${first.hull[2] - last.town.hull[2]} m between the last town frame and the first sea frame`);
    assert.ok(Math.abs(first.camera.fov - last.town.camera.fov) < 1);
    assert.equal(first.elapsed, 0);
    assert.ok(first.drawCalls <= 25, `first sea frame uses ${first.drawCalls} draw calls`);
    if (screenshots) await shot("first-sea");
    assertBoatFrame(first, "first sea frame");
    await patches(first, "first sea frame");
    await key("up", "ArrowUp");
    if (full) await departure(first, before, label);
    else {
      await run("wait for the crossing title", () => title.waitFor({ state: "attached", timeout }), timeout);
      const current = await titleState();
      assert.equal(current.mounts, before.mounts + 1);
      assert.equal(current.clips, before.clips);
    }
    return first;
  }

  function assertBoatFrame(state, moment) {
    const f = state.hullFrame;
    assert.ok(f && Object.values(f).every(Number.isFinite) && f.x >= 0.2 && f.x <= 0.8, `${moment}: hull center is outside the middle 60%: ${JSON.stringify(f)}`);
    assert.ok(f.left >= 0 && f.right <= 1 && f.top >= 0 && f.bottom <= 1,
      `${moment}: hull is clipped: ${JSON.stringify(f)}`);
  }

  async function rearm() {
    mark("re-arm sea entry in the bay");
    await key("down", "ArrowUp");
    await waitFor(state => state.armed, "crossing 20 m back into town re-arms the sea entry");
    await key("up", "ArrowUp");
    await ready();
  }

  async function outsideLane(lane) {
    if (!phone) return;
    mark(`outside lane ${lane} at full throttle`);
    await key("down", "ArrowUp");
    await evaluate(n => window.__ew.seaSteer(n), lane);
    let count = 0, previous;
    for (let i = 0; i < 360; i++) {
      const state = await frame(previous);
      previous = state;
      assert.equal(state.totalGates, 0);
      if (state.gateDistance > 32) continue;
      if (state.gateDistance < 16) break;
      count++;
      assert.equal(state.lane, lane);
      assert.ok(state.speed >= 15.99, "the outside lane is tested at full throttle");
      assertBoatFrame(state, `outside lane ${lane}`);
      const labels = await inspect(gates, boards => {
        return boards.map(board => {
          const { left, right, width } = board.getBoundingClientRect();
          const probe = key => board.querySelector(`[data-face-probe="${key}"]`).getBoundingClientRect();
          const a = probe("center"), b = probe("em");
          const { top, bottom } = board.getBoundingClientRect();
          const header = document.querySelector(".sea-overlay header").getBoundingClientRect();
          const joy = document.querySelector(".sea-mode .joy")?.getBoundingClientRect();
          return { left, right, width, em: Math.hypot(b.left - a.left, b.top - a.top),
            clearUi: top >= header.bottom && bottom < (joy?.top ?? innerHeight),
            visible: getComputedStyle(board).visibility === "visible" && !board.disabled };
        });
      });
      try {
        assert.equal(labels.length, 3);
        assert.ok(labels.every((board, i) => board.visible && board.clearUi && board.left >= 8 && board.right <= width - 8
          && board.width >= 86 && board.em >= 15 && (!i || board.left > labels[i - 1].right)),
        `lane ${lane} at ${state.gateDistance.toFixed(2)} m: ${JSON.stringify(labels)}`);
      } catch (error) {
        failureShot = { name: `lane-${lane}-failure` };
        throw error;
      }
    }
    await key("up", "ArrowUp");
    assert.ok(count >= Math.floor(1000 / milliseconds) - 1, "samples the entire 32–16 m decision window");
  }

  await sailOut("first timed run", { screenshots: true });
  mark("first gates and 20 Hz registration");
  assert.equal(await count(page.getByRole("heading", { name: ui("Atvira jūra", "Open sea") })), 1);
  assert.equal(await attr(page.locator(".sea-overlay .road-gates"), "lang"), helper);
  const gates = page.locator(".sea-overlay button.road-gate");
  const steerLane = lane => evaluate(n => window.__ew.seaSteer(n), lane, `steer to lane ${lane}`);
  const steerRight = () => evaluate(() => window.__ew.seaSteer(window.__ew.sea().right), undefined, "steer to the correct board");
  const steerWrong = () => evaluate(() => window.__ew.seaSteer(window.__ew.sea().right === 0 ? 2 : 0), undefined, "steer to a wrong board");
  const jumpTimer = seconds => evaluate(n => window.__ew.seaTimer(n), seconds, `set sea timer to ${seconds}s`);
  const openWaterBumps = await evaluate(() => window.__seaBumps);
  await waitFor(state => state.gateDistance <= 70, "approaches the first buoy row", 25, 1);
  registration = new BoardRegistration("sea", 50, 25);
  for (const lane of [0, 2]) {
    await steerLane(lane);
    await waitFor(async state => {
      assert.equal(state.totalGates, 0);
      assert.equal(state.wobble, 0);
      assert.equal(await evaluate(() => window.__seaBumps), openWaterBumps);
      return state.lane === lane;
    }, `steers across open water to lane ${lane} without damage`, 35, 1);
  }
  await evaluate(async () => { await document.fonts.ready; }, undefined, "wait for gate fonts");
  const layoutChecks = [];
  await waitFor(async state => {
    if (!(state.gateDistance >= 19 && state.gateDistance <= 32)) return false;
    const rows = await inspect(gates, (boards, phone) => {
      const headerBottom = (document.querySelector(".sea-overlay header")?.getBoundingClientRect().bottom ?? 0);
      const stickTop = document.querySelector(".sea-mode .joy")?.getBoundingClientRect().top;
      return boards.map((board, i) => {
        const box = board.getBoundingClientRect();
        const probe = (key) => board.querySelector(`[data-face-probe="${key}"]`).getBoundingClientRect();
        const center = probe("center"), em = probe("em");
        const font = Math.hypot(em.x - center.x, em.y - center.y);
        return {
          text: board.getAttribute("aria-label"), width: box.width, font, left: box.left, right: box.right,
          top: box.top, bottom: box.bottom, headerBottom, stickTop, viewportWidth: innerWidth,
          fullWords: [...board.querySelectorAll(":scope > span")].map((line) => line.textContent).join(" ") === board.getAttribute("aria-label"),
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
  assert.equal(await count(page.locator(".sea-mode .drive-horn, .sea-mode .road-ghost")), 0);
  await shot("gates");
  const firstChoice = await read();
  assert.deepEqual(await inspect(gates, nodes => nodes.map(node => node.getAttribute("aria-label"))), firstChoice.gates);
  await press(gates.nth(firstChoice.right));
  await waitFor(state => state.rightGates === 1, "taps and sails through the correct gate");

  const correct = await read();
  await step(6);
  registration.verify();
  registration = undefined;
  assert.equal(correct.streak, correct.rightGates);
  assert.ok(correct.boost > 0);
  assertBoatFrame(correct, "right gate");
  assert.equal(await count(page.getByText(ui("Teisingai!", "Right!"), { exact: true })), 1);
  const feedback = page.locator(".sea-overlay .road-feedback .kit-feedback");
  assert.equal(await attr(feedback, "data-feedback"), "right");
  assert.equal(await count(feedback.locator('svg[width="16"]')), 1);
  await shot("gate-right");

  mark("wrong gate and 120 Hz registration");
  await waitFor(state => state.gates?.length === 3, "the next gate appears");
  await waitFor(state => state.gateDistance <= 70, "approaches the miss gate", 125, 1);
  milliseconds = 1000 / 120;
  registration = new BoardRegistration("sea", milliseconds, 25);
  const clips = await evaluate(() => window.__seaAudio.length);
  const bumps = await evaluate(() => window.__seaBumps);
  const wrongLane = (await read()).right === 0 ? 2 : 0;
  await steerLane(wrongLane);
  await waitFor(state => state.totalGates === correct.totalGates + 1, "sails through the wrong gate", 180);
  const wrong = await read();
  assert.equal(wrong.lane, wrongLane);
  assert.equal(wrong.rightGates, correct.rightGates);
  assert.equal(wrong.streak, 0);
  assert.ok(wrong.wobble > 0);
  assert.equal(await evaluate(() => window.__seaBumps), bumps + 1);
  assertBoatFrame(wrong, "wrong gate");
  assert.ok(correct.drawCalls <= 25 && wrong.drawCalls <= 25, "both gate reactions stay within the draw-call budget");
  assert.equal(await count(page.getByText(ui("Ne visai. Teisingai:", "Not quite. It's:"), { exact: true })), 1);
  assert.equal(await attr(feedback, "data-feedback"), "retry");
  assert.equal(await count(feedback.locator('svg[width="16"]')), 1);
  const correction = page.locator(".sea-overlay .road-feedback.wrong span[lang=es]");
  assert.equal(await count(correction), 1);
  assert.ok((await text(correction)).length > 0);
  assert.equal(await evaluate(() => window.__seaAudio.length), clips + 1, "plays the missed clip again");
  await shot("gate-wrong");
  await step(48);
  registration.verify();
  registration = undefined;
  milliseconds = 50;

  mark("listening gates and the Spanish gap");
  for (let n = wrong.totalGates; n < 7; n++) {
    await waitFor(state => state.gates?.length === 3, "the next listening gate appears");
    await steerRight();
    await waitFor(state => state.totalGates === n + 1, "passes another listening gate");
  }
  await waitFor(async state => state.gates?.length === 3 && await count(gates) === 3, "three Spanish gap options appear");
  assert.equal(await count(page.getByText(ui("Kurio žodžio trūksta?", "Which word is missing?"), { exact: true })), 1);
  assert.match(await text(page.locator(".sea-overlay .road-gap")), /____/);
  assert.equal(await attr(page.locator(".sea-overlay .road-gates"), "lang"), "es");
  assert.deepEqual(await inspect(gates, nodes => nodes.map(node => node.getAttribute("aria-label"))), (await read()).gates);

  mark("score the first timed run");
  await jumpTimer(119.8);
  const result = page.getByRole("dialog", { name: ui("Plaukimas baigtas", "Boat ride over") });
  const guide = result.getByRole("button", { name: ui("Nuvesk mane", "Take me there") });
  const resultVisible = () => run("check score dialog visibility", () => result.isVisible());
  await waitFor(resultVisible, "shows the score at 120 seconds");
  const scored = await read();
  assert.ok(scored.drawCalls <= 25);
  assert.equal(scored.elapsed, 120);
  assert.equal(scored.result.right, 6);
  assert.equal(scored.result.total, 7);
  assertBoatFrame(scored, "timed score card");
  assert.equal(scored.result.missed.length, 1);
  assert.equal(await count(guide), 1);
  assert.equal(await evaluate(() => JSON.parse(localStorage.getItem("english-world-sea-v1:puerto-colibri"))?.points), scored.result.points);
  await shot("result");

  await press(result.getByRole("button", { name: ui("Atgal į krantą", "Back to shore") }));
  let returned = await checkReturn("timed result → Back to shore");
  assert.equal(returned.town.id, mooring.id);
  assert.equal(returned.town.phase, "on");
  assert.ok(Math.abs(returned.town.x - scored.town.x) < 0.1);
  assert.ok(Math.abs(returned.town.z - (returned.edge + 14)) < 1.5);
  assert.ok(Math.cos(returned.town.heading) > 0.99 && returned.town.speed > 0);
  assert.equal(returned.armed, false);
  await step(16);
  await shot("town-return");

  await rearm();
  await sailOut("offshore timed run", { full: false });
  mark("score the offshore timed run");
  await jumpTimer(85);
  await waitFor(resultVisible, "reaches a timed score beyond the bay mesh", 160, 10);
  const deep = await read();
  assert.equal(deep.elapsed, 120);
  assert.ok(deep.z < deep.edge - 400 && deep.drawCalls <= 25);
  await press(result.getByRole("button", { name: ui("Atgal į krantą", "Back to shore") }));
  await checkReturn("offshore timed result → Back to shore");

  await rearm();
  await sailOut("slow-turn run");
  mark("hold down to turn before any gate");
  await key("down", "ArrowDown");
  await waitFor(state => state.phase === "turn", "holding down at slow speed starts to turn");
  assert.equal((await read()).totalGates, 0);
  await checkReturn("zero-answer slow hold");
  await key("up", "ArrowDown");
  assert.equal(await count(result), 0);
  assert.equal((await read()).town.id, mooring.id);

  await step(18);
  await rearm();
  milliseconds = 1000 / 60;
  const clipsBeforeEarly = (await titleState()).clips;
  await sailOut("interrupted run at 60 Hz", { full: false });
  mark("interrupt the departure at 60 Hz");
  for (let i = 0; i < 15; i++) await frame();
  await key("press", "Escape");
  await checkReturn("interrupted departure at 60 Hz");
  assert.equal((await titleState()).clips, clipsBeforeEarly, "exit cancels the deferred cue");
  await rearm();

  await sailOut("scored-turn run at 60 Hz");
  await outsideLane(0);
  mark("answer one gate and turn for shore at 60 Hz");
  await steerWrong();
  await waitFor(state => state.totalGates === 1, "answers one gate before turning for shore");
  await key("down", "ArrowDown");
  await waitFor(state => state.phase === "turn", "turns toward shore after one answer", 600, 1);
  await step(12);
  const turning = await read();
  assert.equal(turning.phase, "turn");
  assertBoatFrame(turning, "return turn");
  const shore = await step(89 - 12); // last frame of the 1.5-second turn at 60 Hz
  assert.equal(shore.phase, "turn");
  assert.ok(Math.cos(shore.heading) > 0.99 && !(await resultVisible()));
  assertBoatFrame(shore, "last shore-facing frame");
  await shot("shore-turn");
  assert.equal((await step(1)).phase, "result");
  await run("show the one-answer score card", () => result.waitFor({ state: "visible", timeout }));
  await key("up", "ArrowDown");
  const turned = await read();
  assert.equal(turned.result.total, 1);
  assert.equal(turned.result.right, 0);
  assert.ok(Math.cos(turned.heading) > 0.99, "the boat faces shore behind the score card");
  assertBoatFrame(turned, "score card after turning");
  await press(result.getByRole("button", { name: ui("Atgal į krantą", "Back to shore") }));
  await checkReturn("scored turn → Back to shore at 60 Hz");
  await rearm();
  milliseconds = 50;
  await sailOut("retry and guide run");
  await outsideLane(2);
  mark("answer one gate before retrying");
  await steerWrong();
  await waitFor(state => state.totalGates === 1, "answers one gate before retrying");
  await key("press", "Escape");
  await waitFor(resultVisible, "shows the score before retrying");
  const beforeRetry = await titleState();
  await press(result.getByRole("button", { name: ui("Dar kartą", "Try again") }));
  if (storage === "puerto-colibri") await chooseWords();
  await waitFor(state => state.phase === "drive" && !!state.gates, "retry opens a prompt offshore", 15, 1);
  const retried = await read();
  assert.equal((await titleState()).mounts, beforeRetry.mounts);
  assert.equal((await titleState()).clips, beforeRetry.clips + Number(!retried.gap));
  assert.equal(await count(page.locator(".road-cue")), 1);
  assert.equal(retried.totalGates, 0);
  mark("answer one gate before following the guide");
  await steerWrong();
  await waitFor(state => state.totalGates === 1, "answers one gate before following the guide");
  await key("press", "Escape");
  await waitFor(resultVisible, "shows the score before following the guide");
  const destination = await attr(result.locator("[data-sit]"), "data-sit");
  await press(guide);
  assert.equal((await frame()).presented.scene, "town");
  assert.equal(await count(page.locator(".sea-overlay[data-guiding] .mode-score-card")), 1);
  await waitFor(() => evaluate((sit) => {
    const { game, store } = window.__ew;
    const state = store.getState();
    return !state.hud.fade && !state.hud.modeScreen && !game.rides.riding
      && state.progress.objective === sit && !!game.autoTarget && game.autoPath?.length > 0;
  }, destination), "Nuvesk mane starts the guide on foot after the score dissolves");
  const guided = await evaluate((id) => {
    const { game } = window.__ew;
    const { x, y, z } = game.player.root.position, boat = game.rides.find(id).m;
    return { x, y, z, swimming: game.swimming, boat: { x: boat.x, z: boat.z, heading: boat.heading } };
  }, mooring.id);
  assert.ok(!guided.swimming && guided.y >= -0.12 && guided.z > -72 && guided.z < -60
    && Math.abs(guided.x - mooring.x) <= 10, "the guide starts on the beach near the original boarding point");
  assert.ok(["x", "z", "heading"].every((k) => Math.abs(guided.boat[k] - mooring[k]) < 1e-6), `the boat is back at its mooring: ${JSON.stringify({ boat: guided.boat, mooring })}`);
  await shot("guide");

  mark("board and launch lancha-beached-3");
  const sand = await evaluate(() => {
    const { game } = window.__ew;
    game.setJoystick(0.1, 0);
    game.setJoystick(0, 0);
    game.placeOnFoot(64, -68, Math.PI);
    return game.rides.find("lancha-beached-3").home;
  });
  await waitFor(() => evaluate(() => {
    const { game, store } = window.__ew;
    return !game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "lancha-beached-3";
  }), "the beached lancha is within reach from dry sand");
  await key("press", "e");
  await waitFor(state => state.town?.phase === "launch", "sits aboard and starts pushing off", 30, 1);
  await step(15);
  const sliding = (await read()).town;
  assert.equal(sliding.phase, "launch");
  assert.ok(sliding.z < sand.z && sliding.heading < sand.rot, "the boat turns and slides stern-first off the sand");
  assert.equal(await evaluate(() => {
    const { game } = window.__ew;
    const boat = game.rides.riding;
    return boat.beach.circles.some((circle) => game.town.colliders.circles.includes(circle));
  }), false, "boarding removes the sand collider");
  await waitFor(state => state.town?.phase === "on", "floats and can be driven");
  assert.ok((await read()).town.z < sand.z - 6);
  await shot("push-off");
  await ready();
  await run("enable reduced motion", () => page.emulateMedia({ reducedMotion: "reduce" }), timeout);
  reducedMotion = true;
  const launched = await sailOut("reduced-motion lancha-beached-3 run");
  assert.equal(launched.reducedMotion, true);
  mark("reload the launched lancha from open water");
  await run("reload page", () => page.reload({ waitUntil: "domcontentloaded", timeout }), timeout);
  await waitFor(hasPlayScreen, "reloads from open water", 500);
  await waitFor(state => state?.town?.phase === "on", "restores the launched lancha inside the bay");
  returned = await read();
  assert.equal(returned.phase, "town");
  assert.equal(returned.town.id, "lancha-beached-3");
  assert.ok(returned.town.z > returned.edge + 10 && Math.cos(returned.town.heading) > 0.99);

  mark("check errors after reload");
  assert.deepEqual(errors, []);
} catch (error) {
  failure = error;
  trace("failure", error, console.error);
  if (page) {
    const { name, ...options } = failureShot;
    const path = `${shots || process.env.TMPDIR || "/tmp"}/${size}-sea-${name}.png`;
    try {
      await screenshot(`${name} full frame`, { ...options, path });
      trace(`saved ${path}`, undefined, console.error);
    } catch (captureError) {
      trace("failure screenshot could not be saved", captureError, console.error);
    }
  }
} finally {
  for (const [name, resource] of [["context", context], ["browser", browser]]) {
    if (!resource) continue;
    mark(`close ${name}`);
    try { await run(`close ${name}`, () => resource.close(), timeout); }
    catch (error) {
      failure ??= error;
      trace("teardown failure", error, console.error);
    }
  }
  clearInterval(heartbeat);
}
if (failure) throw failure;
console.log(`Sea passed at ${size}`);
