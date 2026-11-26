// Use the Vite dev server for the sea debug hooks. SEA_SIZE sets the viewport and SEA_SHOTS saves the handoff and gates.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";
import { BoardRegistration, sampleBoardRegistration } from "./board-registration.mjs";

const base = process.env.WORLD_TEST_URL || "http://127.0.0.1:8310";
const storage = process.env.WORLD_STORAGE || "english-world";
const shots = process.env.SEA_SHOTS || process.env.WORLD_SHOTS;
const size = process.env.SEA_SIZE || "1280x800";
assert.ok(["1280x800", "390x844", "390x664"].includes(size), `Unsupported SEA_SIZE: ${size}`);
const [width, height] = size.split("x").map(Number);
const phone = width === 390;
const startedAt = performance.now();
function checkpoint(stage, state) {
  const elapsed = ((performance.now() - startedAt) / 1000).toFixed(1);
  const scene = state?.presented?.scene ?? "pending";
  const draw = state?.drawCalls === undefined ? "" : ` calls=${state.drawCalls} baseline=unmatched`;
  console.log(`sea ${size} +${elapsed}s ${stage} phase=${state?.phase ?? "boot"} scene=${scene}${draw}`);
}
const locationTitle = process.env.VITE_EDITION === "es" && process.env.VITE_LEARNER !== "lt" ? "Open sea" : "Atvira jūra";
const distance = (a, b) => Math.hypot(...a.map((n, i) => n - b[i]));
const dot = (a, b) => a.reduce((n, q, i) => n + q * b[i], 0);
const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.abs(dot(a, b)))) * 180 / Math.PI;
const cssPoint = ([x, y]) => [(x + 1) * width / 2, (1 - y) * height / 2];
const timeout = 20_000;
const stallTime = 30_000;
const waitLimit = 60_000;
const errors = [];
let stage, operation, condition, waitDeadline, lastLog, reportedError;
let lastSample = null;
let milliseconds = 50;

function trace(message, details, log = console.log) {
  lastLog = performance.now();
  log(`[${new Date().toISOString()}] sea ${size} ${message}${details ? ` ${JSON.stringify(details)}` : ""}`);
}

function mark(name) {
  stage = name;
  operation = name;
  trace(name);
}

function diagnostic() {
  return { stage, operation, condition, milliseconds, lastSample, pageErrors: errors };
}

function reportFailure(error) {
  if (error === reportedError) return;
  reportedError = error;
  trace("failure", { ...diagnostic(), error: error.message }, console.error);
}

async function run(name, action) {
  operation = name;
  // Evaluations and raw input have no Playwright timeout option.
  const remaining = (waitDeadline ?? Infinity) - performance.now();
  const limit = Math.min(remaining, stallTime);
  const timeoutError = () => new Error(remaining <= stallTime
    ? `Wait for "${condition}" exceeded ${waitLimit / 1000}s during ${name}`
    : `No progress for ${stallTime / 1000}s during ${name}`);
  if (limit <= 0) throw timeoutError();
  let timer;
  const stalled = new Promise((_, reject) => {
    timer = setTimeout(() => reject(timeoutError()), limit);
  });
  try {
    const result = await Promise.race([stalled, action()]);
    if (performance.now() - lastLog >= stallTime) trace("progress", diagnostic());
    return result;
  } finally {
    clearTimeout(timer);
  }
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
  place: { zone: "town", x: -10, z: -69.5, rot: Math.PI },
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

checkpoint("boot");
let browser, context, failure;
try {
  mark("launch browser");
  const { chromium } = await run("import Playwright", () => import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright"));
  if (shots) await run("create screenshot directory", () => mkdir(shots, { recursive: true }));
  browser = await run("launch Chromium", () => chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
    headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
    timeout,
  }));
  context = await run("create context", () => browser.newContext({
    viewport: { width, height },
    ...(phone ? { deviceScaleFactor: 2, isMobile: true, hasTouch: true } : {}),
  }));
  context.setDefaultTimeout(timeout);
  const page = await run("create page", () => context.newPage());
  const seaRequests = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("request", (req) => {
    const path = new URL(req.url()).pathname;
    if (/\/src\/(?:game\/sea\/(?!entry\.ts$)|ui\/Sea\.tsx$)/.test(path)) seaRequests.push(path);
  });
  await run("route audio", () => page.route(/\.mp3(?:\?|$)/, (request) => request.fulfill({ status: 204, body: "" })));
  await run("install clock", () => page.addInitScript(installClock, [`${storage}-progress-v1`, JSON.stringify(progress)]));
  mark("load play screen");
  await run("navigate to town", () => page.goto(base, { waitUntil: "domcontentloaded", timeout }));

  const evaluate = (name, fn, arg) => run(name, () => page.evaluate(fn, arg));
  const keyboard = (action, value) => run(`keyboard ${action} ${value}`, () => page.keyboard[action](value));
  const count = locator => run(`count ${locator}`, () => locator.count());
  const attribute = (locator, name) => run(`read ${name} from ${locator}`, () => locator.getAttribute(name));
  const visible = locator => run(`check visibility of ${locator}`, () => locator.isVisible());
  const read = () => run("read sea state", async () => {
    const state = await page.evaluate(() => window.__ew?.sea?.());
    if (state) {
      lastSample = {
        scene: state.presented?.scene ?? null, phase: state.phase ?? null, serial: state.presented?.serial ?? null,
        crossingAge: state.crossingAge ?? null, returnAge: state.returnAge ?? null, blendAge: state.townBlend?.age ?? null,
      };
    }
    return state;
  });
  let registration;
  const rawStep = (frames = 1) => evaluate(`step ${frames} frame(s)`, ([n, ms]) => window.__step(n, ms), [frames, milliseconds]);
  const step = async (frames) => {
    if (!registration) return rawStep(frames);
    for (let i = 0; i < frames; i++) {
      await rawStep();
      registration.record(await run("sample board registration", () => sampleBoardRegistration(page, "sea")));
    }
  };
  const waitFor = async (predicate, description, attempts = 160, frames = 5) => {
    condition = description;
    waitDeadline = performance.now() + waitLimit;
    try {
      for (let i = 0; i < attempts; i++) {
        await step(frames);
        if (await predicate()) {
          condition = undefined;
          return;
        }
      }
      assert.fail(`${description} after ${attempts} attempts (${attempts * frames} simulated frames)`);
    } finally {
      waitDeadline = undefined;
    }
  };
  const screenshot = (name, options) => run(`screenshot ${name}`, () => page.screenshot({ ...options, timeout }));
  const shot = name => shots && screenshot(name, { path: `${shots}/${size}-sea-${name}.png` });
  async function saveFailure(error, name, options = {}) {
    reportFailure(error);
    const path = `${shots || process.env.TMPDIR || "/tmp"}/${size}-sea-${name}.png`;
    try {
      await screenshot(name, { ...options, path });
      trace(`saved ${path}`, undefined, console.error);
    } catch (captureError) {
      trace("failure screenshot could not be saved", { ...diagnostic(), path, error: captureError.message }, console.error);
    }
  }

  async function press(locator, name) {
    mark(name);
    let previous, target;
    const deadline = performance.now() + timeout;
    // Check consecutive wall-clock samples while the presentation clock stays frozen.
    do {
      target = await run(`measure ${locator}`, () => locator.evaluateAll(nodes => {
        if (nodes.length !== 1) return { matches: nodes.length };
        const [node] = nodes;
        const visible = node.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        const enabled = !node.matches(":disabled") && !node.closest('[inert], [aria-disabled="true"]');
        if (!visible || !enabled) return { matches: 1, visible, enabled };
        const measure = () => {
          const { x, y, width, height } = node.getBoundingClientRect();
          const center = [x + width / 2, y + height / 2];
          const clear = width > 0 && height > 0 && node.contains(document.elementFromPoint(...center));
          return { matches: 1, visible, enabled, bounds: [x, y, width, height], center, clear };
        };
        const result = measure();
        if (result.clear) return result;
        node.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "instant" });
        return measure();
      }));
      if (target.clear && previous?.clear && target.bounds.every((n, i) => n === previous.bounds[i])) {
        const [x, y] = target.center;
        return run(`${phone ? "tap" : "click"} ${locator}`, () => phone ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
      }
      previous = target;
      await delay(32);
    } while (performance.now() < deadline);
    assert.fail(`${name}: no unique, visible, enabled, unobscured target with stable bounds for ${locator}: ${JSON.stringify(target)}`);
  }

  const loading = page.locator(":is(.ew-loading, .road-loading, .sea-loading):visible");
  const fade = page.locator(".fade");
  const fadeOpacity = () => run("read fade opacity", () => fade.evaluate(element => Number(getComputedStyle(element).opacity)));
  const ready = () => run("wait for sea mode to prefetch", () => page.waitForFunction(() => window.__ew?.sea?.().ready,
    undefined, { polling: 50, timeout }));
  const hasPlayScreen = () => evaluate("check play screen", () => window.__ew?.store.getState().screen === "play");
  await waitFor(hasPlayScreen, "the beach loads", 500);
  mark("play screen ready");
  await evaluate("clear coach and HUD panel", () => { window.__ew.coach?.finish?.(); window.__ew.store.getState().setHud({ panel: null }); });
  const town = await read();
  assert.equal(town.phase, "town");
  assert.deepEqual(seaRequests, [], "the mode chunk stays unloaded before boarding");
  checkpoint("town rendered", town);
  await evaluate("record sea audio and bump calls", () => {
    const { audio } = window.__ew;
    window.__seaAudio = [];
    window.__seaBumps = 0;
    const bump = audio.bump.bind(audio);
    audio.bump = (...args) => { window.__seaBumps++; return bump(...args); };
    audio.play = async (_voice, _speed, text) => { window.__seaAudio.push(text); return true; };
  });

  mark("swim and board anchored-1");
  await keyboard("down", "ArrowUp");
  await waitFor(() => evaluate("check swim and boarding prompt", () => {
    const { game, store } = window.__ew;
    return game.swimming && store.getState().hud.prompt?.kind === "boat" && game.nearest?.id === "anchored-1";
  }), "swims from the beach within reach of the first anchored boat");
  await keyboard("up", "ArrowUp");
  await keyboard("press", "e");
  await waitFor(async () => (await read()).town?.phase === "on", "boards with the interact key");
  const mooring = (await read()).town;
  assert.equal(mooring.id, "anchored-1");
  await ready();
  assert.ok(seaRequests.some((path) => path.endsWith("/mode.ts")), "the mode prefetches aboard");
  mark("anchored-1 aboard and sea mode ready");
  checkpoint("boat ready", await read());

  const title = page.locator(".sea-crossing-title");
  const waitForTitle = () => run("wait for crossing title", () => title.waitFor({ state: "attached", timeout }));
  const titleState = () => evaluate("read crossing title and cue", () => {
    const node = document.querySelector(".sea-crossing-title");
    return { mounts: window.__seaTitles, clips: window.__seaAudio.length, text: node?.textContent,
      opacity: node ? Number(getComputedStyle(node).opacity) : undefined };
  });

  const ageOf = (state, key) => key === "townBlend.age" ? state?.townBlend?.age : state?.crossingAge;
  const ageTrace = (state, key) => `${key}=${ageOf(state, key)} (serial ${state?.presented?.serial})`;
  const ageLimit = seconds => Math.ceil(seconds * 1000 / milliseconds) + 3;
  const reachedAge = (state, key, seconds) => ageOf(state, key) >= seconds - 1e-8;

  async function assertPresentation(state, previous, ageKey) {
    try {
      if (ageKey) {
        const before = ageOf(previous, ageKey), after = ageOf(state, ageKey);
        assert.ok(Number.isFinite(before) && Number.isFinite(after) && after > before,
          `presentation age did not advance: ${ageTrace(previous, ageKey)} → ${ageTrace(state, ageKey)}`);
      }
      if (previous) assert.equal(state.presented.serial, previous.presented.serial + 1, "one scene per presentation");
      assert.ok(state.triangles > 0 && state.drawCalls > 0, "the presentation contains geometry");
      if (state.presented.scene === "sea") assert.ok(state.drawCalls <= 25, `sea budget at ${state.crossingAge}s: ${state.drawCalls}`);
      assert.equal(await count(loading), 0);
      assert.equal(await fadeOpacity(), 0);
    } catch (error) {
      await saveFailure(error, "presentation-failure");
      throw error;
    }
  }

  async function frame(previous, ageKey) {
    await step(1);
    const state = await read();
    await assertPresentation(state, previous, ageKey);
    return state;
  }

  async function pixels(points, label) {
    // The last sampled pixel is two CSS pixels past the centre, so the clip ends one pixel later.
    const xs = points.map(([x]) => Math.floor(x)), ys = points.map(([, y]) => Math.floor(y));
    const x = Math.min(...xs) - 2, y = Math.min(...ys) - 2;
    const clip = { x, y, width: Math.max(...xs) + 3 - x, height: Math.max(...ys) + 3 - y };
    const image = await screenshot(label, { clip, scale: "css" });
    return evaluate(`decode ${label}`, async ({ data, points, clip }) => {
      const png = Uint8Array.from(atob(data), value => value.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([png], { type: "image/png" }));
      const ctx = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      bitmap.close();
      if (ctx.canvas.width !== clip.width || ctx.canvas.height !== clip.height) {
        throw new Error(`Expected ${clip.width}×${clip.height} CSS pixels, got ${ctx.canvas.width}×${ctx.canvas.height}`);
      }
      return points.map(([x, y]) => {
        const patch = ctx.getImageData(x - clip.x - 2, y - clip.y - 2, 5, 5).data;
        const values = [0, 1, 2].map(channel => Array.from({ length: 25 }, (_, i) => patch[4 * i + channel]));
        return { median: values.map(a => a.sort((x, y) => x - y)[12]),
          mean: values.map(a => a.reduce((x, y) => x + y, 0) / a.length) };
      });
    }, { data: image.toString("base64"), points, clip });
  }

  async function patches(state, label) {
    const points = await evaluate(`raycast hull and water for ${label}`, (hullFrame) => {
      const { game } = window.__ew;
      const camera = game.sea.active ? game.sea.mode.view.camera : game.rig.cam;
      const boat = game.rides.riding.mesh, rider = game.player.root;
      const { width: w, height: h } = document.querySelector(".stage canvas").getBoundingClientRect();
      const ray = new game.raycaster.constructor();
      const p = boat.position.clone(), f = boat.position.clone().project(camera);
      const x = (f.x + 1) * w / 2, y = (1 - f.y) * h / 2;
      const hud = [...document.querySelectorAll(".road-header, .road-controls, .joy, .mode-score-card, .hud-top button, .sea-crossing-title")]
        .filter(node => getComputedStyle(node).visibility !== "hidden").map(node => node.getBoundingClientRect());
      const clear = (x, y) => x > 2 && x < w - 2 && y > 2 && y < h - 2
        && !hud.some(box => x + 2 >= box.left && x - 2 <= box.right && y + 2 >= box.top && y - 2 <= box.bottom);
      const sample = (cx, cy) => {
        ray.setFromCamera(p.set(cx / w * 2 - 1, 1 - cy / h * 2, 0), camera);
        const water = (-0.25 - ray.ray.origin.y) / ray.ray.direction.y;
        const hit = ray.intersectObjects([boat, rider], true)[0];
        if (hit && (water <= 0 || hit.distance < water)) {
          for (let o = hit.object; o; o = o.parent) if (o === boat) return "hull";
          return null;
        }
        return water > 0 && water < 45 ? "water" : null;
      };
      const points = { hull: [], water: [] };
      const scan = (left, top, right, bottom, types) => {
        for (let cy = bottom; cy >= top; cy -= 5) for (let cx = left; cx <= right; cx += 5) {
          if (types.every(type => points[type].length === 12)) return;
          if (!clear(cx, cy)) continue;
          const type = sample(cx, cy);
          if (!types.includes(type) || points[type].length === 12) continue;
          if ([-2, 2].every(a => [-2, 2].every(b => sample(cx + a, cy + b) === type))) points[type].push([cx, cy]);
        }
      };
      scan(Math.round(x) - 65, Math.round(y) - 72, Math.round(x) + 65, Math.round(y) + 18, ["hull", "water"]);
      const missing = ["hull", "water"].filter(type => !points[type].length);
      if (hullFrame && missing.length) {
        // The crossing camera can fill the fixed window with the hull. Include nearby water around its projected edges.
        const margin = 12;
        scan(Math.max(3, Math.floor(hullFrame.left * w) - margin), Math.max(3, Math.floor(hullFrame.top * h) - margin),
          Math.min(w - 3, Math.ceil(hullFrame.right * w) + margin), Math.min(h - 3, Math.ceil(hullFrame.bottom * h) + margin), missing);
      }
      return points;
    }, state.hullFrame ?? null);
    try {
      const age = state.returnAge ?? state.crossingAge;
      assert.ok(points.hull.length && points.water.length,
        `${label}: unobstructed hull and water patches (hull ${points.hull.length}, water ${points.water.length}, crossing age ${age ?? "n/a"})`);
      const colors = await pixels([...points.hull, ...points.water], `${label} hull and water patches`);
      const hull = colors.slice(0, points.hull.length), water = colors.slice(points.hull.length);
      assert.ok(hull.some(a => water.some(b => a.median.some((c, i) => Math.abs(c - b.median[i]) >= 20))),
        `${label}: hull and water have different composited colours at ${state.time ?? state.townFrame.time}`);
      return { mean: water[0].mean, point: points.water[0] };
    } catch (error) {
      await saveFailure(error, "failure", { scale: "css" });
      throw error;
    }
  }

  function sampleAt(samples, at, key, values) {
    const next = samples.findIndex(s => s[key] >= at - 1e-8);
    assert.ok(next >= 0, `samples reach ${at} seconds`);
    if (next === 0 || Math.abs(samples[next][key] - at) < 1e-8) return values(samples[next]);
    const a = samples[next - 1], b = samples[next], k = (at - a[key]) / (b[key] - a[key]);
    return values(a).map((v, i) => v + (values(b)[i] - v) * k);
  }

  async function departure(first, before, label) {
    mark(`${label}: sample departure through 2.0s`);
    await waitForTitle();
    const initial = await titleState();
    assert.equal(initial.mounts, before.mounts + 1, "one title mounts on physical departure");
    assert.equal(initial.text, locationTitle);
    assert.equal(initial.opacity, 0);
    const heading = page.getByRole("heading", { name: locationTitle, exact: true });
    assert.equal(await count(heading), 1);
    assert.equal(await attribute(title, "aria-hidden"), "true");
    const samples = [first];
    let peak, reveal;
    const key = "crossingAge", endAge = 2, limit = ageLimit(endAge);
    for (let i = 0; i < limit && !reachedAge(samples.at(-1), key, endAge); i++) {
      const state = await frame(samples.at(-1), key);
      samples.push(state);
      assertBoatFrame(state, label);
      await patches(state, label);
      const cue = await titleState();
      if (!peak && state.crossingAge >= 0.65 - 1e-8) {
        peak = cue;
        assert.ok(cue.opacity > 0.95);
        assert.ok(await run("check crossing title clearance", () => title.evaluate(node => {
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
    assert.ok(reachedAge(samples.at(-1), key, endAge),
      `${label}: departure did not reach ${endAge}s in ${limit} presentations: ${ageTrace(first, key)} → ${ageTrace(samples.at(-1), key)}`);
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
    mark(`return: ${label}`);
    const mounts = (await titleState()).mounts;
    let last = first ?? await read(), patch;
    checkpoint(`return started (${label})`, last);
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
          await saveFailure(error, "water-failure", { scale: "css" });
          throw error;
        }
        mark(`return town blend: ${label}`);
        const towns = [state];
        const key = "townBlend.age", endAge = 0.6, limit = ageLimit(endAge);
        for (let i = 0; i < limit && !reachedAge(towns.at(-1), key, endAge); i++) {
          towns.push(await frame(towns.at(-1), key));
        }
        assert.ok(reachedAge(towns.at(-1), key, endAge),
          `${label}: town blend did not reach ${endAge}s in ${limit} presentations: ${ageTrace(state, key)} → ${ageTrace(towns.at(-1), key)}`);
        for (const at of [0.05, 0.30, 0.60]) {
          const sample = towns.find(s => Math.abs(s.townBlend.age - at) < 0.001);
          assert.ok(sample, `town has a rendered frame at ${at}s`);
          const { age, eye, rotation, live } = sample.townBlend, k = (age / 0.6) ** 2 * (3 - 2 * age / 0.6);
          assert.ok(distance(sample.townFrame.camera.position, eye.map((n, i) => n + (live.position[i] - n) * k)) <= 0.04);
          assert.ok(angle(sample.townFrame.camera.rotation, slerp(rotation, live.rotation, k)) <= 0.15);
        }
        assert.equal((await titleState()).mounts, mounts);
        checkpoint(`return checked (${label})`, towns.at(-1));
        return state;
      }
      assertBoatFrame(state, label);
      patch = await patches(state, label);
      last = state;
    }
    assert.fail(`${label}: town did not present after the committed return`);
  }

  async function sailOut(label, { screenshots = false, full = true } = {}) {
    mark(`depart: ${label}`);
    const before = await titleState();
    const { edge, town: { x } } = await read();
    assert.equal(await evaluate("place boat for departure", ([x, z]) => window.__ew.seaPlaceBoat(x, z), [x, edge + 34]), true);
    await keyboard("down", "ArrowUp");
    // Start just before the last half-second so every frame through the seam is checked.
    const approach = Math.ceil(0.5 * 1000 / milliseconds);
    const preceding = [];
    let last = await read(), first;
    for (let i = 0; i < 600; i++) {
      await step(1);
      const current = await read();
      assert.equal(await count(loading), 0);
      if (current.phase === "briefing") { first = current; break; }
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
    assert.equal(await count(loading), 0);
    for (const key of ["projection", "view", "hullRotation", "rider", "riderRotation"]) {
      assert.ok(Array.isArray(first[key]) ? distance(first[key], first.departureFrom[key]) < 1e-8
        : JSON.stringify(first[key]) === JSON.stringify(first.departureFrom[key]), `inherits town ${key}`);
    }
    assert.deepEqual(first.camera, first.town.camera, "the first sea camera inherits the town pose and FOV");
    assert.deepEqual(first.hull, first.town.hull, "the first sea frame keeps the hull in place");
    assert.ok(Math.abs(first.hull[2] - last.town.hull[2]) < milliseconds / 1000 * 4 * 17, `hull moved ${first.hull[2] - last.town.hull[2]} m between the last town frame and the first sea frame`);
    assert.ok(Math.abs(first.camera.fov - last.town.camera.fov) < 1);
    assert.equal(first.elapsed, 0);
    assert.equal(await fadeOpacity(), 0);
    assert.ok(first.drawCalls <= 25, `first sea frame uses ${first.drawCalls} draw calls`);
    checkpoint("border crossed", first);
    await keyboard("up", "ArrowUp");
    await press(page.locator('[data-way="words"]'), `briefing: choose words for ${label}`);
    const start = await read();
    assert.equal(start.phase, "drive");
    assert.equal(start.presented.serial, first.presented.serial);
    if (screenshots) await shot("first-sea");
    assertBoatFrame(first, "first sea frame");
    await patches(first, "first sea frame");
    if (full) await departure(start, before, label);
    else {
      await waitForTitle();
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
    await keyboard("down", "ArrowUp");
    await waitFor(async () => (await read()).armed, "crossing 20 m back into town re-arms the sea entry");
    await keyboard("up", "ArrowUp");
    await ready();
  }

  async function outsideLane(lane) {
    if (!phone) return;
    mark(`gates: outside lane ${lane} at full throttle`);
    await keyboard("down", "ArrowUp");
    await evaluate(`steer to outside lane ${lane}`, n => window.__ew.seaSteer(n), lane);
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
      const labels = await run(`measure outside lane ${lane} labels`, () => gates.evaluateAll(boards => {
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
      }));
      try {
        assert.equal(labels.length, 3);
        assert.ok(labels.every((board, i) => board.visible && board.clearUi && board.left >= 8 && board.right <= width - 8
          && board.width >= 86 && board.em >= 15 && (!i || board.left > labels[i - 1].right)),
        `lane ${lane} at ${state.gateDistance.toFixed(2)} m: ${JSON.stringify(labels)}`);
      } catch (error) {
        await saveFailure(error, `lane-${lane}-failure`);
        throw error;
      }
    }
    await keyboard("up", "ArrowUp");
    assert.ok(count >= Math.floor(1000 / milliseconds) - 1, "samples the entire 32–16 m decision window");
  }

  await sailOut("first timed run", { screenshots: true });
  const gates = page.locator(".sea-overlay button.road-gate");
  const readBumps = () => evaluate("read sea bump count", () => window.__seaBumps);
  const readClips = () => evaluate("read sea clip count", () => window.__seaAudio.length);
  const steerLane = lane => evaluate(`steer to lane ${lane}`, lane => window.__ew.seaSteer(lane), lane);
  const steerWrong = () => evaluate("steer to the wrong gate", () => window.__ew.seaSteer(window.__ew.sea().right === 0 ? 2 : 0));
  const jumpTimer = seconds => evaluate(`set sea timer to ${seconds}s`, seconds => window.__ew.seaTimer(seconds), seconds);
  mark("gates: first approach and open-water steering");
  const openWaterBumps = await readBumps();
  await waitFor(async () => (await read()).gateDistance <= 70, "approaches the first buoy row", 25, 1);
  registration = new BoardRegistration("sea", 50, 25);
  for (const lane of [0, 2]) {
    await steerLane(lane);
    await waitFor(async () => {
      const state = await read();
      assert.equal(state.totalGates, 0);
      assert.equal(state.wobble, 0);
      assert.equal(await readBumps(), openWaterBumps);
      return state.lane === lane;
    }, `steers across open water to lane ${lane} without damage`, 35, 1);
  }
  await evaluate("wait for gate fonts", async () => { await document.fonts.ready; });
  const layoutChecks = [];
  await waitFor(async () => {
    const state = await read();
    if (!(state.gateDistance >= 19 && state.gateDistance <= 32)) return false;
    const rows = await run("measure first gate layout", () => gates.evaluateAll((boards, phone) => {
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
    }, phone));
    layoutChecks.push({ distance: +state.gateDistance.toFixed(2), rows });
    return rows.length === 3 && rows.every((row) => row.fullWords && row.inside && row.belowHeader
      && row.aboveControls && row.separated && row.readableWidth && row.readableFont);
  }, "all three labels fit at a readable size", 125, 1).catch((error) => {
    trace("gate layout at 19–32 m", layoutChecks, console.error);
    throw error;
  });
  const firstGate = await read();
  assert.ok(firstGate.drawCalls <= 25);
  checkpoint("first gate readable", firstGate);
  assert.equal(await count(page.locator(".sea-mode .drive-horn, .sea-mode .road-ghost")), 0);
  await shot("gates");
  await press(gates.nth((await read()).right), "gates: select the first correct board");
  await waitFor(async () => (await read()).rightGates === 1, "taps and sails through the correct gate");

  let correct = await read();
  checkpoint("first gate passed", correct);
  await step(6);
  registration.verify();
  registration = undefined;
  mark("gates: verify a correct pass in a side lane");
  // The picker can put the first answer in the middle. Continue until a correct answer exercises a side lane.
  for (let attempt = 1; correct.lane === 1 && attempt < 8; attempt++) {
    const count = correct.rightGates;
    await waitFor(async () => (await read()).gates?.length === 3, "the next gate appears");
    await evaluate("steer to the next correct gate", () => window.__ew.seaSteer(window.__ew.sea().right));
    await waitFor(async () => (await read()).rightGates === count + 1, "sails through the next correct gate");
    correct = await read();
  }
  assert.notEqual(correct.lane, 1, "a correct pass exercises a side lane");
  assert.equal(correct.streak, correct.rightGates);
  assert.ok(correct.boost > 0);
  assertBoatFrame(correct, "right gate");
  assert.equal(await count(page.getByText("Teisingai!", { exact: true })), 1);
  const feedback = page.locator(".sea-overlay .road-feedback .kit-feedback");
  assert.equal(await attribute(feedback, "data-feedback"), "right");
  assert.equal(await count(feedback.locator('svg[width="16"]')), 1);
  await shot("gate-right");

  mark("gates: wrong pass and registration at 120 Hz");
  await waitFor(async () => (await read()).gates?.length === 3, "the next gate appears");
  await waitFor(async () => (await read()).gateDistance <= 70, "approaches the miss gate", 125, 1);
  milliseconds = 1000 / 120;
  registration = new BoardRegistration("sea", milliseconds, 25);
  const clips = await readClips();
  const bumps = await readBumps();
  const wrongLane = (await read()).right === 0 ? 2 : 0;
  await steerLane(wrongLane);
  await waitFor(async () => (await read()).totalGates === correct.totalGates + 1, "sails through the wrong gate", 180);
  const wrong = await read();
  assert.equal(wrong.lane, wrongLane);
  assert.equal(wrong.rightGates, correct.rightGates);
  assert.equal(wrong.streak, 0);
  assert.ok(wrong.wobble > 0);
  assert.equal(await readBumps(), bumps + 1);
  assertBoatFrame(wrong, "wrong gate");
  assert.ok(correct.drawCalls <= 25 && wrong.drawCalls <= 25, "both gate reactions stay within the draw-call budget");
  assert.equal(await count(page.getByText("Ne visai. Teisingai:", { exact: true })), 1);
  assert.equal(await attribute(feedback, "data-feedback"), "retry");
  assert.equal(await count(feedback.locator('svg[width="16"]')), 1);
  const correction = page.locator(".sea-overlay .road-feedback.wrong span[lang=en]");
  assert.equal(await count(correction), 1);
  assert.ok((await run("read gate correction", () => correction.innerText())).length > 0);
  assert.equal(await readClips(), clips + 1, "plays the missed clip again");
  await shot("gate-wrong");
  await step(48);
  registration.verify();
  registration = undefined;
  milliseconds = 50;

  mark("score: first timed run");
  await jumpTimer(119.8);
  const result = page.getByRole("dialog", { name: "Plaukimas baigtas" });
  await waitFor(() => visible(result), "shows the score at 120 seconds");
  const scored = await read();
  assert.ok(scored.drawCalls <= 25);
  assert.equal(scored.elapsed, 120);
  assert.equal(scored.result.right, correct.rightGates);
  assert.equal(scored.result.total, wrong.totalGates);
  assertBoatFrame(scored, "timed score card");
  assert.equal(scored.result.missed.length, 1);
  assert.equal(await count(result.getByRole("button", { name: "Nuvesk mane" })), 1);
  checkpoint("score checked", scored);
  await shot("result");

  await press(result.getByRole("button", { name: "Atgal į krantą" }), "return input: first timed result");
  let returned = await checkReturn("timed result → Back to shore");
  assert.equal(returned.town.id, "anchored-1");
  assert.equal(returned.town.phase, "on");
  assert.ok(Math.abs(returned.town.x - scored.town.x) < 0.1);
  assert.ok(Math.abs(returned.town.z - (returned.edge + 14)) < 1.5);
  assert.ok(Math.cos(returned.town.heading) > 0.99 && returned.town.speed > 0);
  assert.equal(returned.armed, false);
  await step(16);
  await shot("town-return");

  await rearm();
  await sailOut("offshore timed run", { full: false });
  mark("score: offshore timed run");
  await jumpTimer(85);
  await waitFor(() => visible(result), "reaches a timed score beyond the bay mesh", 160, 10);
  const deep = await read();
  assert.equal(deep.elapsed, 120);
  assert.ok(deep.z < deep.edge - 400 && deep.drawCalls <= 25);
  checkpoint("offshore score checked", deep);
  await press(result.getByRole("button", { name: "Atgal į krantą" }), "return input: offshore timed result");
  await checkReturn("offshore timed result → Back to shore");

  await rearm();
  await sailOut("slow-turn run");
  mark("return input: slow turn before any gate");
  await keyboard("down", "ArrowDown");
  await waitFor(async () => (await read()).phase === "turn", "holding down at slow speed starts to turn");
  assert.equal((await read()).totalGates, 0);
  await checkReturn("zero-answer slow hold");
  await keyboard("up", "ArrowDown");
  assert.equal(await count(result), 0);
  assert.equal((await read()).town.id, "anchored-1");

  await step(18);
  await rearm();
  milliseconds = 1000 / 60;
  const clipsBeforeEarly = (await titleState()).clips;
  await sailOut("interrupted run at 60 Hz", { full: false });
  for (let i = 0; i < 15; i++) await frame();
  mark("return input: interrupt departure with Escape");
  await keyboard("press", "Escape");
  await checkReturn("interrupted departure at 60 Hz");
  assert.equal((await titleState()).clips, clipsBeforeEarly, "exit cancels the deferred cue");
  await rearm();

  await sailOut("scored-turn run at 60 Hz");
  await outsideLane(0);
  mark("gates: answer one before the scored turn");
  await steerWrong();
  await waitFor(async () => (await read()).totalGates === 1, "answers one gate before turning for shore");
  mark("return input: turn after answering one gate");
  await keyboard("down", "ArrowDown");
  await waitFor(async () => (await read()).phase === "turn", "turns toward shore after one answer", 600, 1);
  await step(12);
  const turning = await read();
  assert.equal(turning.phase, "turn");
  assertBoatFrame(turning, "return turn");
  // The turn lasts 1.5 s. Hold its 89th frame at 60 Hz, then verify the very next frame ends it.
  await step(89 - 12);
  const shore = await read();
  assert.equal(shore.phase, "turn");
  assert.ok(Math.cos(shore.heading) > 0.99 && !(await visible(result)));
  assertBoatFrame(shore, "last shore-facing frame");
  await shot("shore-turn");
  await step(1);
  assert.equal((await read()).phase, "result");
  await run("score card after one answer", () => result.waitFor({ state: "visible", timeout }));
  await keyboard("up", "ArrowDown");
  const turned = await read();
  assert.equal(turned.result.total, 1);
  assert.equal(turned.result.right, 0);
  assert.ok(Math.cos(turned.heading) > 0.99, "the boat faces shore behind the score card");
  assertBoatFrame(turned, "score card after turning");
  await press(result.getByRole("button", { name: "Atgal į krantą" }), "return input: scored turn at 60 Hz");
  await checkReturn("scored turn → Back to shore at 60 Hz");
  await rearm();
  milliseconds = 50;
  await sailOut("retry and guide run");
  await outsideLane(2);
  mark("gates: answer one before retrying");
  await steerWrong();
  await waitFor(async () => (await read()).totalGates === 1, "answers one gate before retrying");
  await keyboard("press", "Escape");
  await waitFor(() => visible(result), "shows the score before retrying");
  const beforeRetry = await titleState();
  await press(result.getByRole("button", { name: "Dar kartą" }), "retry from the score card");
  const briefing = await read();
  assert.equal(briefing.phase, "briefing");
  checkpoint("retry briefing", briefing);
  await press(page.locator('[data-way="words"]'), "briefing: choose words for the offshore retry");
  await waitFor(async () => (await read()).phase === "drive" && !!(await read()).gates, "retry opens a prompt offshore", 15, 1);
  const retried = await read();
  assert.equal((await titleState()).mounts, beforeRetry.mounts);
  assert.equal((await titleState()).clips, beforeRetry.clips + Number(!retried.gap));
  assert.equal(await count(page.locator(".road-cue")), 1);
  assert.equal(retried.totalGates, 0);
  checkpoint("retry prompt checked", retried);
  mark("gates: answer one on the retry before following the guide");
  await steerWrong();
  await waitFor(async () => (await read()).totalGates === 1, "answers one gate before following the guide");
  await keyboard("press", "Escape");
  await waitFor(() => visible(result), "shows the score before following the guide");
  const destination = await attribute(result.locator("[data-sit]"), "data-sit");
  await press(result.getByRole("button", { name: "Nuvesk mane" }), "return input: follow the guide");
  await frame();
  assert.equal((await read()).presented.scene, "town");
  assert.equal(await count(page.locator(".sea-overlay[data-guiding] .mode-score-card")), 1);
  await waitFor(() => evaluate("check guide after the score dissolves", (sit) => {
    const { game, store } = window.__ew;
    const state = store.getState();
    return !state.hud.fade && !state.hud.modeScreen && !game.rides.riding
      && state.progress.objective === sit && !!game.autoTarget && game.autoPath?.length > 0;
  }, destination), "Nuvesk mane starts the guide on foot after the score dissolves");
  const guided = await evaluate("read guide start and boat mooring", (id) => {
    const { game } = window.__ew;
    const { x, y, z } = game.player.root.position, boat = game.rides.find(id).m;
    return { x, y, z, swimming: game.swimming, boat: { x: boat.x, z: boat.z, heading: boat.heading } };
  }, mooring.id);
  assert.ok(!guided.swimming && guided.y >= -0.12 && guided.z > -72 && guided.z < -60
    && Math.abs(guided.x - mooring.x) <= 10, "the guide starts on the beach near the original boarding point");
  assert.ok(["x", "z", "heading"].every((k) => Math.abs(guided.boat[k] - mooring[k]) < 1e-6), `the boat is back at its mooring: ${JSON.stringify({ boat: guided.boat, mooring })}`);
  await shot("guide");

  mark("board lobster-1");
  await evaluate("place player on the lobster boat deck", () => {
    const { game } = window.__ew;
    game.setJoystick(0.1, 0);
    game.setJoystick(0, 0);
    game.placeOnFoot(-40, -80.5, -Math.PI / 2);
  });
  await waitFor(() => evaluate("check the lobster boat is in reach", () => window.__ew.game.nearest?.id === "lobster-1"), "the lobster boat is within reach of the deck");
  await keyboard("press", "e");
  await waitFor(async () => (await read()).town?.phase === "on", "boards the lobster boat");
  assert.equal((await read()).town.id, "lobster-1");
  await ready();
  await run("enable reduced motion", () => page.emulateMedia({ reducedMotion: "reduce" }));
  await sailOut("reduced-motion lobster boat run");
  mark("reload from open water");
  checkpoint("reload started", await read());
  await run("reload page", () => page.reload({ waitUntil: "domcontentloaded", timeout }));
  await waitFor(hasPlayScreen, "reloads from open water", 500);
  await waitFor(async () => (await read()).town?.phase === "on", "restores the lobster boat inside the bay");
  returned = await read();
  assert.equal(returned.phase, "town");
  assert.equal(returned.town.id, "lobster-1");
  assert.ok(returned.town.z > returned.edge + 10 && Math.cos(returned.town.heading) > 0.99);
  checkpoint("reload checked", returned);

  mark("check page errors after reload");
  assert.deepEqual(errors, []);
} catch (error) {
  failure = error;
  reportFailure(error);
} finally {
  for (const [name, resource] of [["context", context], ["browser", browser]]) {
    if (!resource) continue;
    mark(`teardown: close ${name}`);
    try {
      await run(`close ${name}`, () => resource.close());
    } catch (error) {
      failure ??= error;
      reportFailure(error);
    }
  }
}
if (failure) throw failure;
console.log(`Sea passed at ${size}`);
