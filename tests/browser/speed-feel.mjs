// Stepped driving feedback on the shipped world, against Vite dev or the built site.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { sampleBoardRegistration } from "./board-registration.mjs";
import { assertCameraSettle, assertRoadContinuity } from "./road-handoff.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const url = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:5188");
const storage = process.env.WORLD_STORAGE || "english-world";
const pc = storage.startsWith("puerto-colibri");
const learner = process.env.WORLD_LEARNER || (pc && !storage.includes("-lt") ? "en" : "lt");
const shots = process.env.WORLD_SHOTS;
const ms = 1000 / 60;
const max = 15.5;
const viewportCases = [
  { phone: true, viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { phone: false, viewport: { width: 1280, height: 800 } },
];
// Calle Uxmal uses the quiet stretch in PC's playing-screen fixture. Its crash fixture uses Brotecito's forecourt.
const straight = { x: pc ? 110 : 100, z: 76, rot: -Math.PI / 2 };
const wall = { x: 125, z: pc ? -51.4 : -54.6, rot: Math.PI / 2 + 0.45 };
const complete = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const save = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 1, sounds: 0.8, cameraFollow: true,
    phoneCalls: false, textMessages: false },
  sits: { "s65a-passport": complete, "s65b-baggage": complete, "s66-taxi": complete },
  phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", ...straight },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};
const round = (value) => Number(value.toFixed(6));
const magnitude = (vector) => Math.hypot(...vector);
const difference = (a, b) => a.map((value, i) => value - b[i]);
const near = (a, b, tolerance, message) =>
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance, `${message} (${a} vs ${b}, ±${tolerance})`);
const filename = (name) => name.replace(/[^\w.-]+/g, "-");
function encodeCalls(calls) {
  const runs = [];
  for (const count of calls) {
    if (runs.at(-1)?.[0] === count) runs.at(-1)[1]++;
    else runs.push([count, 1]);
  }
  return runs;
}
if (shots) await mkdir(shots, { recursive: true });

function installHarness([key, progress]) {
  localStorage.setItem(key, progress);
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000, seed = 20261122, nextFrame = 0;
  const frames = new Map();
  performance.now = () => now;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  window.requestAnimationFrame = (fn) => { frames.set(++nextFrame, fn); return nextFrame; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__step = (count, milliseconds) => {
    for (let i = 0; i < count; i++) {
      now += milliseconds;
      const pending = [...frames.values()];
      frames.clear();
      for (const fn of pending) fn(now);
    }
  };

  // Wrap native operations before Three or Audio can retain references to them.
  const params = new WeakMap(), connections = new WeakMap(), started = new WeakSet();
  const framebuffers = new WeakMap(), programs = new WeakMap();
  let schedule = 0;
  function forward(object, name, after) {
    const original = object[name];
    object[name] = function (...args) {
      const value = original.apply(this, args);
      after(this, args, value);
      return value;
    };
  }
  forward(AudioParam.prototype, "setTargetAtTime", (param, [value, time, tau]) =>
    params.set(param, { value, time, tau, serial: ++schedule }));
  forward(AudioNode.prototype, "connect", (node, [destination]) => {
    if (!connections.has(node)) connections.set(node, new Set());
    connections.get(node).add(destination);
  });
  forward(AudioNode.prototype, "disconnect", (node, [destination]) => {
    if (destination instanceof AudioNode || destination instanceof AudioParam) connections.get(node)?.delete(destination);
    else if (destination === undefined) connections.delete(node);
  });
  forward(OscillatorNode.prototype, "start", (node) => started.add(node));
  forward(AudioBufferSourceNode.prototype, "start", (node) => started.add(node));
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue;
    forward(type.prototype, "createFramebuffer", (gl, _, value) => {
      if (!framebuffers.has(gl)) framebuffers.set(gl, new Set());
      if (value) framebuffers.get(gl).add(value);
    });
    forward(type.prototype, "createProgram", (gl, _, value) => {
      if (!programs.has(gl)) programs.set(gl, new Set());
      if (value) programs.get(gl).add(value);
    });
  }

  // road.mjs silences recorded speech. Also guard native speech synthesis, which bypasses HTTP routing.
  if (window.SpeechSynthesis) {
    SpeechSynthesis.prototype.speak = () => { throw new Error("Unexpected speech synthesis in speed-feel"); };
  }
  const reaches = (node, destination, visited = new Set()) => {
    if (node === destination) return true;
    if (visited.has(node)) return false;
    visited.add(node);
    return [...(connections.get(node) ?? [])].some((next) => reaches(next, destination, visited));
  };
  const target = (param) => param && params.get(param);
  window.__speedTestNative = {
    audio(node) {
      const audio = window.__ew.audio;
      const motor = audio.motorSet, wind = audio.held.get("wind"), ctx = audio.ctx;
      const bus = audio.worldBus;
      return {
        context: ctx?.state, contextTime: ctx?.currentTime, volume: audio.volume, sounds: audio.sounds,
        radio: audio.underMusic, bus: bus && (target(bus.gain)?.value ?? bus.gain.value),
        pitch: target(motor?.o1.frequency), motorGain: target(motor?.gain.gain),
        motorConnected: !!motor && started.has(motor.o1) && reaches(motor.o1, ctx.destination),
        car: motor?.kind === "car", wind: target(wind?.gain.gain), windTone: target(wind?.f.frequency),
        windConnected: !!wind && started.has(wind.src) && reaches(wind.src, ctx.destination),
        motorNode: motor?.gain.gain ?? node.motor,
        windNode: wind?.gain.gain ?? node.wind,
        retiredMotor: !motor && target(node.motor),
        retiredWind: !wind && target(node.wind),
      };
    },
    framebuffers: (gl) => framebuffers.get(gl)?.size ?? 0,
    programs: (gl) => programs.get(gl)?.size ?? 0,
  };
}

function installObservers() {
  const { game, audio } = window.__ew;
  const native = window.__speedTestNative;
  // Leave the real motor, rush, unlock and buses in place.
  audio.play = async () => true;
  const renderer = game.renderer, gl = renderer.getContext(), render = renderer.render;
  const setRenderTarget = renderer.setRenderTarget;
  let draws = [], uses = [], targetUses = 0, pool, poolChanges = 0;
  const targetIds = new Map(), nodes = {};
  const run = () => game.modes.get("road")?.mode?.run;
  const cameraState = (camera) => ({
    fov: camera.fov, pose: camera.position.toArray(), rotation: camera.quaternion.toArray(),
    projection: camera.projectionMatrix.toArray(), zoom: camera.zoom, layers: camera.layers.mask,
    viewHeightRatio: camera.view?.enabled ? camera.view.fullHeight / camera.view.height : 1,
  });
  const resourceState = () => ({
    framebuffer: native.framebuffers(gl), glPrograms: native.programs(gl), targets: targetIds.size, targetUses,
    programs: renderer.info.programs.length,
    identities: renderer.info.programs.map(({ id, cacheKey }) => ({ id, key: cacheKey })),
  });
  renderer.render = function (scene, camera, ...args) {
    const road = run();
    const world = scene === game.scene && camera === game.rig.cam ? "town"
      : scene === road?.view.scene && camera === road.view.camera ? "road" : "other";
    const drawn = cameraState(camera);
    const onScreen = this.getRenderTarget() === null;
    const value = render.call(this, scene, camera, ...args);
    draws.push({ world, onScreen, ...drawn, renderedEye: camera.matrixWorld.elements.slice(12, 15),
      calls: this.info.render.calls, serial: this.info.render.frame });
    return value;
  };
  renderer.setRenderTarget = function (target, ...args) {
    const value = setRenderTarget.call(this, target, ...args);
    if (target) {
      if (!targetIds.has(target)) targetIds.set(target, targetIds.size + 1);
      targetUses++;
      uses.push({ id: targetIds.get(target), face: args[0] ?? 0, level: args[1] ?? 0 });
    }
    return value;
  };

  const hudSelector = ".toolbar, .objective-card, .minimap, .prompt, .ride-strip, .joy, .act-btn, .brake-btn, .drive-horn, .road-header, .road-controls";
  const rect = (node) => {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    return { left, right, top, bottom };
  };
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  function strips() {
    const containers = [...document.querySelectorAll(".speed-feel")];
    const [element] = containers;
    if (!element) return { containers: 0, count: 0 };
    const stage = renderer.domElement.parentElement, style = getComputedStyle(element);
    const hudZ = Number(getComputedStyle(document.querySelector(".hud")).zIndex);
    const layer = Number(getComputedStyle(stage).zIndex) || 0;
    const slots = [...element.children];
    if (!pool) pool = [element, ...slots];
    const controls = [...document.querySelectorAll(hudSelector)]
      .filter((node) => node.getClientRects().length && getComputedStyle(node).visibility === "visible")
      .map((node) => [node.className, rect(node)]);
    const visible = slots.flatMap((slot, index) => {
      const css = getComputedStyle(slot), pseudo = getComputedStyle(slot, "::before");
      if (css.display === "none" || css.visibility !== "visible" || !slot.getClientRects().length) return [];
      const box = rect(slot), matrix = new DOMMatrixReadOnly(css.transform === "none" ? undefined : css.transform);
      return [{
        index, box, opacity: Number(css.opacity), ink: pseudo.backgroundImage,
        painted: Number(css.opacity) * Number(pseudo.opacity) > 0,
        thickness: parseFloat(css.height), length: parseFloat(css.width),
        inset: parseFloat(index % 2 ? css.right : css.left), top: parseFloat(css.top),
        angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, dx: matrix.e, dy: matrix.f,
        duration: css.animationDuration, delay: css.animationDelay,
        animation: slot.getAnimations().some((animation) => animation.effect?.getTiming().iterations === Infinity),
        overlap: controls.filter(([, control]) => overlaps(box, control)).map(([name]) => name),
      }];
    });
    return {
      containers: containers.length, count: visible.length, visible, slots: slots.length,
      pooled: pool.length === slots.length + 1 && [element, ...slots].every((node, i) => node === pool[i]),
      stage: element.parentElement === stage && Boolean(renderer.domElement.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
      aria: element.getAttribute("aria-hidden"), pointer: style.pointerEvents, hidden: style.display === "none",
      clearStage: style.backgroundImage === "none" && style.filter === "none" && style.maskImage === "none"
        && style.visibility === "visible" && Number(style.opacity) > 0,
      beneathHud: Math.max(layer, Number(style.zIndex) || 0) < hudZ,
    };
  }

  // init() runs after the first draw. This observer starts before any car is boarded.
  const recordTiers = (records) => {
    for (const record of records) {
      if (record.target.matches(".speed-feel")) poolChanges++;
    }
  };
  const observer = new MutationObserver(recordTiers);
  observer.observe(game.container, { subtree: true, attributeFilter: ["data-tier"] });

  window.__speedTest = {
    read() {
      recordTiers(observer.takeRecords());
      const { rig, rides } = game, ride = rides.riding, motion = ride?.m;
      const road = window.__ew.road.state();
      const view = run()?.view, activeCamera = view?.camera ?? rig.cam;
      const { motorNode, windNode, ...webAudio } = native.audio(nodes);
      nodes.motor = motorNode;
      nodes.wind = windNode;
      const clean = rig.curPos.toArray();
      const expectedRotation = rig.cam.clone();
      expectedRotation.position.copy(rig.curPos);
      expectedRotation.lookAt(rig.curLook);
      const feel = window.__speedFeel;
      return {
        t: game.t, drawn: draws.findLast((draw) => draw.onScreen && draw.world !== "other"), draws, uses,
        devPresented: game.presentedWorld, calls: renderer.info.render.calls,
        camera: cameraState(activeCamera), clean, cleanRotation: expectedRotation.quaternion.toArray(),
        fovFor: rig.fovFor(game.container.clientWidth, game.container.clientHeight, false),
        rigMode: rig.mode, dist: rig.dist, jolt: rig.joltT, joltStrength: rig.joltK,
        viewpoint: [innerWidth, innerHeight, devicePixelRatio],
        probe: feel && { ...feel }, pool: strips(), webAudio, poolChanges,
        ride: ride?.id, model: ride?.model ?? (ride ? "convertible" : undefined),
        speed: motion?.pace ?? 0, max: motion?.spec.max, pose: motion && [motion.x, ride.mesh.position.y, motion.z, motion.heading],
        phase: rides.phase, seatedVisible: game.player.root.visible, anim: game.player.anim,
        player: game.player.root.position.toArray(),
        asphalt: motion && rides.asphalt.has(motion.x, motion.z),
        dent: ride && rides.crashes.info(ride)?.dentCount || 0, hit: rides.crashes.last(),
        road: {
          phase: road.phase, requested: road.requested, ready: road.ready, exitDistance: road.exitDistance,
          position: road.roadPosition, elapsed: road.elapsed, speed: road.speed, lift: road.liftHeight,
          gateDistance: road.gateDistance, gates: road.totalGates, right: road.right, renderSerial: road.renderSerial,
          pose: view && view.car.position.toArray(), fov: view?.camera.fov, reference: window.__speedRoadReference,
        },
        traffic: game.ambient.traffic.slice(0, 8).map((car) => car.x),
        loading: !!document.querySelector(".ew-loading, .road-loading, .sea-loading"),
        fade: Number(getComputedStyle(document.querySelector(".fade")).opacity),
        input: game.driveInput(false),
      };
    },
    step(count, ms) {
      draws = [];
      uses = [];
      window.__step(count, ms);
      return this.read();
    },
    resourceState,
    pinDrawCamera() {
      const cam = game.rig.cam, saved = cam.clone();
      const farCull = game.farCull, measuredRender = renderer.render;
      let live;
      const pin = () => { cam.copy(saved, false); cam.updateMatrixWorld(true); };
      game.farCull = function (...args) {
        live = cam.clone();
        pin();
        return farCull.apply(this, args);
      };
      renderer.render = function (scene, camera, ...args) {
        if (camera === cam) pin();
        return measuredRender.call(this, scene, camera, ...args);
      };
      return () => {
        game.farCull = farCull;
        renderer.render = measuredRender;
        if (live) { cam.copy(live, false); cam.updateMatrixWorld(true); }
      };
    },
  };
}

function verifyWorld(frame, world, previous) {
  assert.ok(frame.drawn?.onScreen && frame.drawn.world === world && frame.drawn.calls > 0,
    `expected a visible ${world} draw: ${JSON.stringify(frame.draws)}`);
  assert.equal(frame.calls, frame.drawn.calls);
  assert.equal(frame.draws.filter(({ onScreen, world }) => onScreen && world !== "other").length, 1);
  if (frame.devPresented) {
    assert.equal(frame.devPresented.scene, world);
    assert.equal(frame.devPresented.serial, frame.drawn.serial);
  }
  if (previous) assert.equal(frame.drawn.serial, previous.drawn.serial + 1, "one presented world per step");
  assert.deepEqual(frame.drawn.pose, frame.camera.pose);
  assert.deepEqual(frame.drawn.rotation, frame.camera.rotation);
  assert.deepEqual(frame.drawn.projection, frame.camera.projection);
  near(frame.drawn.fov, frame.camera.fov, 1e-9, "lens at the actual render");
  const { projection, fov, zoom, viewHeightRatio } = frame.drawn;
  near(projection[5], zoom * viewHeightRatio / Math.tan(fov * Math.PI / 360), 1e-7, "lens is applied to the WebGL projection");
  near(magnitude(difference(frame.drawn.renderedEye, frame.drawn.pose)), 0, 1e-7, "WebGL view uses the presented eye");
}

// The reference integrates post-contact pace. Audio assertions use the live graph and the native ramp calls.
function stepEnvelope(previous, speed, divisor, dt) {
  const u = Math.max(0, Math.min(1, speed / divisor));
  const tau = u > previous ? 0.22 : 0.32;
  const next = u + (previous - u) * Math.exp(-Math.max(0, Math.min(0.05, dt)) / tau);
  return u === 0 && next < 0.002 ? 0 : next;
}

function verifyAudio(frame, previous, e) {
  const { probe, webAudio: a } = frame;
  assert.equal(a.context, "running");
  assert.equal(a.volume, 1);
  assert.ok(a.sounds > 0 && a.bus > 0 && a.radio === 1, JSON.stringify(a));
  assert.ok(a.car && a.motorConnected && a.motorGain?.value > 0);
  assert.ok(a.pitch?.serial > (previous?.webAudio.pitch?.serial ?? 0), "fresh target on the live primary oscillator");
  near(a.pitch.tau, 0.08, 1e-9, "motor ramp");
  near(a.pitch.value, 52 + 62 * e, 0.00005, "ground-speed oscillator target");
  near(probe.enginePitch, a.pitch.value, 1e-9, "probe and native pitch agree");
  const level = 0.72 * e * e, gain = level <= 0.01 ? 0 : 0.035 * level;
  assert.ok(probe.windGain >= 0 && probe.windGain <= 0.0252 + 1e-8);
  near(probe.windGain, gain, 1e-8, "quadratic wind with the held-noise cutoff");
  if (gain > 0) {
    assert.ok(a.windConnected && a.wind?.serial > (previous?.webAudio.wind?.serial ?? 0),
      "fresh target on the connected wind gain");
    near(a.wind.value, probe.windGain, 1e-9, "probe and native wind gain agree");
    near(a.wind.tau, 0.06, 1e-9, "wind ramp");
    near(a.windTone?.value, 260 + 900 * e, 0.001, "wind filter receives the same envelope");
  } else {
    assert.equal(a.wind, undefined);
    if (previous?.webAudio.wind) assert.equal(a.retiredWind?.value, 0, "wind gain ramps out below cutoff");
  }
}

function expectedTier(tier, e) {
  if (e >= (tier === 2 ? 0.79 : 0.83)) return 2;
  return Number(e >= (tier > 0 ? 0.55 : 0.59));
}

function verifyPool(frame, tier, reduced) {
  const { pool, probe, viewpoint: [width, height] } = frame;
  assert.equal(probe.streakCount, tier * 2);
  assert.equal(pool.count, tier * 2, "rendered slots");
  assert.ok(pool.containers === 1 && pool.slots === 4 && pool.pooled && pool.stage && pool.beneathHud && pool.clearStage,
    JSON.stringify(pool));
  assert.equal(pool.aria, "true");
  assert.equal(pool.pointer, "none");
  assert.equal(pool.hidden, reduced, "the OS media query also hides the DOM pool");
  assert.deepEqual(pool.visible.map(({ index }) => index), Array.from({ length: 2 * tier }, (_, i) => i));
  for (const mark of pool.visible) {
    const { index, box, opacity } = mark, right = index % 2, upper = index < 2;
    assert.ok(opacity >= 0 && opacity <= 0.22 + 1e-6 && mark.animation, JSON.stringify(mark));
    assert.match(mark.ink, /linear-gradient\(.*(?:transparent|rgba\(0, 0, 0, 0\)).*rgb\(255, 243, 217\).*(?:transparent|rgba\(0, 0, 0, 0\))/);
    near(mark.thickness, 1, 0.01, "strip thickness");
    near(mark.length, Math.max(12, Math.min(26, width * 0.024)), 0.03, "strip width");
    near(mark.inset, width * 0.035, 0.03, "strip edge inset");
    near(mark.top, height * (upper ? 0.43 : 0.63), 0.03, "strip height on screen");
    near(mark.angle, (upper ? 12 : -18) * (right ? -1 : 1), 0.02, "outward strip angle");
    near(parseFloat(mark.duration), 0.85, 1e-6, "strip cycle");
    near(mark.dy, 0, 1e-6, "strip translation stays level");
    assert.ok(mark.dx * (right ? 1 : -1) >= -0.001 && Math.abs(mark.dx) <= 6.001, JSON.stringify(mark));
    assert.ok(box.left >= 0 && box.right <= width
      && (right ? box.left >= width * 0.88 : box.right <= width * 0.12), JSON.stringify(mark));
    assert.deepEqual(mark.overlap, [], "the marks clear the HUD controls");
  }
  assert.equal(new Set(pool.visible.map(({ delay }) => delay)).size, pool.visible.length, "staggered strip phases");
}

function verifyTown(frame, previous, rest, ride, state, reduced, strength = Number(!reduced)) {
  verifyWorld(frame, "town", previous);
  assert.equal(frame.ride, ride.id);
  assert.equal(frame.phase, "on");
  assert.equal(frame.anim, "sit");
  assert.equal(frame.seatedVisible, !ride.roofed);
  assert.ok(frame.probe?.active && frame.rigMode === "follow" && frame.asphalt);
  assert.equal(frame.probe.reducedMotion, reduced);
  near(frame.probe.speed, frame.speed, 1e-9, "the occupied car's actual pace");
  near(frame.probe.fov, frame.drawn.fov, 1e-9, "probe and drawn lens agree");
  near(frame.dist, rest.dist, 1e-7, "follow arm has no speed dolly");

  state.e = stepEnvelope(state.e, frame.speed, max, frame.t - previous.t);
  const next = reduced ? 0 : expectedTier(state.tier, state.e);
  assert.equal(frame.poolChanges - previous.poolChanges, Number(next !== state.tier), "DOM tier writes only on transitions");
  state.tier = next;
  verifyPool(frame, state.tier, reduced);
  verifyAudio(frame, previous, state.e);

  const delta = frame.drawn.fov - rest.drawn.fov, amplitude = 0.0025 * state.e ** 2 * strength;
  const offset = difference(frame.drawn.pose, frame.clean);
  assert.ok(delta >= -0.02 && delta <= 3.52 && frame.probe.shakeAmplitude >= 0 && frame.probe.shakeAmplitude <= 0.00251);
  near(delta, frame.probe.fovDelta, 0.02, "actual speed-only lens");
  near(delta, 3.5 * state.e * strength, 0.02, "linear lens from the single speed envelope");
  near(frame.probe.shakeAmplitude, amplitude, 0.00001, "shake peak");
  near(magnitude([offset[0], offset[2]]), 0, 1e-7, "no horizontal jitter");
  near(offset[1], amplitude * Math.sin(2 * Math.PI * 7 * frame.t), 0.00001, "7 Hz vertical vibration in the drawn pose");
  assert.ok(magnitude(offset) <= frame.probe.shakeAmplitude + 0.00001);
  assert.ok(magnitude(difference(frame.drawn.rotation, frame.cleanRotation)) < 1e-7, "no speed roll or yaw");
  if (reduced) {
    near(frame.drawn.fov, rest.drawn.fov, 0.05, "reduced lens at the actual draw");
    assert.equal(frame.probe.shakeAmplitude, 0);
    assert.equal(magnitude(offset), 0);
  }
}

function verifyIdle(frame, rest) {
  assert.equal(frame.speed, 0);
  near(frame.drawn.fov, rest.drawn.fov, 0.05, "stationary lens");
  assert.equal(frame.pool.count, 0);
  assert.ok(frame.probe.shakeAmplitude < 0.00002);
  assert.equal(frame.probe.windGain, 0);
  near(frame.webAudio.pitch?.value, 52, 0.5, "stationary native pitch");
}

function verifyOut(frame, reduced) {
  verifyWorld(frame, "town");
  assert.ok(!frame.ride && frame.seatedVisible);
  assert.equal(frame.probe.active, false);
  assert.equal(frame.probe.enginePitch, 0);
  assert.equal(frame.probe.windGain, 0);
  assert.equal(frame.probe.shakeAmplitude, 0);
  assert.equal(frame.webAudio.car, false);
  assert.equal(frame.webAudio.pitch, undefined);
  assert.equal(frame.webAudio.wind, undefined);
  assert.equal(frame.webAudio.retiredMotor?.value, 0, "the former car gain was ramped down");
  assert.equal(frame.probe.fovDelta, 0);
  near(frame.drawn.fov, frame.fovFor, 0.05, "neutral lens on foot");
  near(magnitude(difference(frame.drawn.pose, frame.clean)), 0, 0.00001, "neutral pose on foot");
  verifyPool(frame, 0, reduced);
}

function resourceDelta(before, after) {
  const known = new Set(before.identities.map(({ id }) => id));
  return {
    framebuffer: after.framebuffer - before.framebuffer,
    glPrograms: after.glPrograms - before.glPrograms,
    targets: after.targets - before.targets,
    targetUses: after.targetUses - before.targetUses,
    programs: after.programs - before.programs,
    added: after.identities.filter(({ id }) => !known.has(id)).map(({ key }) => key).sort(),
  };
}

function zeroResources(before, after, message) {
  assert.deepEqual(resourceDelta(before, after), {
    framebuffer: 0, glPrograms: 0, targets: 0, targetUses: 0, programs: 0, added: [],
  }, message);
}

function report(frame) {
  return {
    t: round(frame.t), pace: round(frame.road.speed ?? frame.speed),
    pose: (frame.road.pose ?? frame.pose ?? frame.player).map(round), eye: frame.drawn?.pose.map(round),
    fov: frame.drawn && round(frame.drawn.fov), lift: frame.probe && round(frame.probe.fovDelta),
    shake: frame.probe && round(frame.probe.shakeAmplitude),
    dy: frame.drawn?.world === "town" ? round(frame.drawn.pose[1] - frame.clean[1]) : undefined,
    pitch: round(frame.webAudio.pitch?.value ?? 0), wind: round(frame.webAudio.wind?.value ?? 0),
    lines: frame.pool.count, calls: frame.calls, phase: frame.road.phase === "town" ? frame.phase : frame.road.phase,
  };
}

async function suite(browser, { phone, ...options }, reduced) {
  const motion = reduced ? "reduce" : "no-preference";
  const label = `${pc ? "pc" : "mh"}-${learner}-${storage} ${options.viewport.width}x${options.viewport.height} ${phone ? "touch" : "keys"} ${motion}`;
  const context = await browser.newContext({ ...options, reducedMotion: motion, serviceWorkers: "block" });
  try {
    const page = await context.newPage(), errors = [];
    const cdp = phone && await context.newCDPSession(page);
    let model = "town", last, lastBand = "loading";
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      const text = message.text();
      if (["error", "warning"].includes(message.type())
        && !/^\[audio\] Missing clip: [\w./%+-]+\.mp3$/.test(text)
        && !/^THREE\.Clock: This module has been deprecated\. Please use THREE\.Timer instead\.$/.test(text))
        errors.push(text);
    });
    await context.route("**/*", (route) => {
      const request = new URL(route.request().url());
      if (request.protocol === "data:" || request.protocol === "blob:") return route.continue();
      if (request.origin !== url.origin) {
        errors.push(`unexpected external request: ${request.origin}${request.pathname}`);
        return route.abort();
      }
      if (/\.mp3$/i.test(request.pathname)) return route.fulfill({ status: 204, body: "" });
      return route.continue();
    });
    await page.addInitScript(installHarness, [
      storage.endsWith("-progress-v1") ? storage : `${storage}-progress-v1`, JSON.stringify(save),
    ]);
    const read = () => page.evaluate(() => window.__speedTest.read());
    const resources = () => page.evaluate(() => window.__speedTest.resourceState());
    const step = async (milliseconds = ms) => (last = await page.evaluate((ms) => window.__speedTest.step(1, ms), milliseconds));
    const timeout = (message) => assert.fail(`${label} ${model}: ${message}, last completed band ${lastBand}\n${JSON.stringify(last && {
      ...report(last), probe: last.probe, camera: last.camera, road: last.road, hit: last.hit, input: last.input, errors,
    })}`);
    async function ready(predicate, description) {
      const deadline = Date.now() + 120_000;
      do {
        await page.evaluate((ms) => window.__step(4, ms), ms);
        assert.deepEqual(errors, [], `${label}: runtime errors during ${description}`);
        if (await page.evaluate(predicate)) return;
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
      } while (Date.now() < deadline);
      last = await read().catch(() => last);
      timeout(description);
    }
    const note = async (name, frame) => {
      lastBand = name;
      console.log("speed-feel", label, model, name, JSON.stringify(report(frame)));
      if (shots) await page.screenshot({ path: join(shots, `speed-feel-${filename(`${label}-${model}-${name}`)}.png`), timeout: 15_000 });
    };
    const button = (selector) => phone ? page.locator(selector).tap() : page.locator(selector).click();
    const interact = () => phone ? button(".act-btn") : page.keyboard.press("e");
    async function touch(selector, joystick = false) {
      const box = await page.locator(selector).boundingBox({ timeout: 10_000 });
      assert.ok(box, `touch control ${selector}`);
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [center] });
      if (joystick) await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove", touchPoints: [{ ...center, y: center.y - 68 }],
      });
    }
    const releaseTouch = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const go = (on) => phone ? (on ? touch(".joy", true) : releaseTouch()) : page.keyboard[on ? "down" : "up"]("w");
    const brake = (on) => phone ? (on ? touch(".brake-btn") : releaseTouch()) : page.keyboard[on ? "down" : "up"]("Space");

    async function board(kind) {
      const ride = await page.evaluate((kind) => {
        const { game } = window.__ew, { rides } = game;
        const r = kind === "roofed"
          ? [...rides.modeCars.keys()].find((r) => r.parked && rides.roofed(r))
          : rides.list.find((r) => r.kind === "car" && !rides.roofed(r) && (kind !== "road" || r.id === "park"));
        if (!r) throw new Error(`No ${kind} car`);
        const { x, z, heading, spec } = r.m;
        const d = spec.wide + 0.7, c = Math.cos(heading), s = Math.sin(heading);
        const doors = [1, -1].map((side) => ({ x: x + side * c * d, z: z - side * s * d, rot: heading }));
        const door = doors.find(({ x, z }) => game.town.walkableAt(x, z) && rides.near(x, z) === r);
        if (!door) throw new Error(`No clear door for ${r.id}`);
        game.enterZone("town", door, true);
        game.rig.yaw = heading;
        game.rig.snap();
        window.__speedRide = r;
        return { id: r.id, roofed: rides.roofed(r), model: r.model ?? "convertible", parking: { x, z, rot: heading } };
      }, kind);
      model = `${kind}-${ride.model}-${ride.id}`;
      await ready(() => {
        const { game, store } = window.__ew, p = game.player.root.position;
        return store.getState().hud.prompt?.kind === "drive" && game.rides.near(p.x, p.z) === window.__speedRide;
      }, "actual door prompt");
      if (phone) await page.locator(".act-btn").waitFor({ state: "visible" });
      // The trusted boarding click/key unlocks the context created by the game's audio service.
      assert.ok(await page.evaluate(() => window.__ew.audio.context() !== null), "real audio context is available");
      await interact();
      await ready(() => {
        const { game } = window.__ew;
        return game.rides.riding === window.__speedRide && game.rides.phase === "on"
          && window.__speedFeel?.active && window.__ew.audio.ctx?.state === "running"
          && window.__ew.road.state().requested && window.__ew.road.state().ready;
      }, "seated, audio running, speed pool mounted and requested road preparation ready");
      const aboard = await read();
      assert.equal(aboard.ride, ride.id);
      assert.equal(aboard.phase, "on");
      assert.equal(aboard.anim, "sit");
      assert.equal(aboard.seatedVisible, !ride.roofed);
      return ride;
    }

    async function reset(position) {
      await page.evaluate((position) => {
        const { game } = window.__ew;
        if (game.rides.riding !== window.__speedRide || game.rides.phase !== "on") throw new Error("lost the occupied car");
        game.rides.resetPosition(window.__speedRide, position);
        const { rig } = game;
        game.rideCourse = rig.yaw = position.rot;
        rig.target.set(position.x, 0, position.z);
        rig.snap();
      }, position);
    }

    async function settleStraight() {
      await reset(straight);
      let rest;
      for (let i = 0; i < 144; i++) {
        const frame = await step();
        verifyWorld(frame, "town");
        if (frame.probe.reducedMotion) {
          assert.equal(frame.probe.shakeAmplitude, 0);
          verifyPool(frame, 0, true);
        }
        if (i >= 36 && frame.jolt >= 0.42 && frame.speed === 0 && Math.abs(frame.drawn.fov - frame.fovFor) < 0.01
          && frame.probe.fovDelta === 0 && frame.webAudio.pitch?.value === 52 && !frame.webAudio.wind) {
          rest = frame;
          break;
        }
      }
      if (!rest) timeout("stationary framing did not settle");
      assert.equal(rest.max, max);
      assert.ok(rest.asphalt && rest.phase === "on");
      if (phone) near(rest.drawn.fov, 50, 0.05, "upright settled follow lens");
      near(rest.pose[0], straight.x, 0.001, "straight start x");
      near(rest.pose[2], straight.z, 0.001, "straight start z");
      verifyIdle(rest, rest);
      verifyAudio(rest, undefined, 0);
      verifyPool(rest, 0, reduced);
      return rest;
    }

    async function getOut(ride, restoreParking = true) {
      await ready(() => window.__ew.store.getState().hud.prompt?.kind === "out", "exit prompt");
      const before = await read();
      await interact();
      await ready(() => !window.__ew.game.rides.riding, "driver leaves");
      const out = await step();
      verifyOut(out, reduced);
      assert.ok(out.traffic.some((x, i) => Math.abs(x - before.traffic[i]) > 0.1), "town traffic is still moving");
      await note("out", out);
      if (restoreParking) {
        // Return the measured car to its own spot between independent drives so it cannot block the next straight.
        await page.evaluate((pose) => window.__ew.game.rides.resetPosition(window.__speedRide, pose), ride.parking);
      }
    }

    async function compareDraws(moment) {
      const start = await resources();
      await page.evaluate(() => { window.__speedUnpin = window.__speedTest.pinDrawCamera(); });
      try {
        const active = await step(0);
        await page.emulateMedia({ reducedMotion: "reduce" });
        const control = await step(0);
        verifyWorld(active, "town");
        verifyWorld(control, "town");
        assert.ok(active.pool.count > 0 && control.pool.hidden && control.pool.count === 0);
        assert.equal(active.t, control.t);
        assert.equal(active.ride, control.ride);
        assert.deepEqual(active.pose, control.pose);
        assert.deepEqual(active.viewpoint, control.viewpoint);
        assert.deepEqual(active.drawn.projection, control.drawn.projection);
        assert.deepEqual(active.drawn.pose, control.drawn.pose);
        assert.deepEqual(active.drawn.rotation, control.drawn.rotation);
        assert.equal(active.drawn.layers, control.drawn.layers);
        assert.equal(active.calls, control.calls, "equal positive draw counts at the same time, pose and projection");
        assert.deepEqual(active.uses, control.uses, "same target identities and uses");
        assert.deepEqual(active.draws.map(({ world, onScreen, calls }) => [world, onScreen, calls]),
          control.draws.map(({ world, onScreen, calls }) => [world, onScreen, calls]), "same renderer passes");
        zeroResources(start, await resources(), "no resources for the paired speed effect");
        console.log("speed-feel", label, model, "gpu-paired", JSON.stringify({
          moment, calls: [active.calls, control.calls], drawCalls: 0, programs: 0, targets: 0, framebuffers: 0,
        }));
      } finally {
        await page.evaluate(() => { window.__speedUnpin(); delete window.__speedUnpin; });
        await page.emulateMedia({ reducedMotion: motion });
      }
    }

    async function stopAtWheel(top, rest, ride, state) {
      await brake(true);
      let previous = top, braking, stopped, stopTime;
      const tiers = [top.pool.count], calls = [];
      for (let i = 0; i < 215; i++) {
        const frame = await step();
        verifyTown(frame, previous, rest, ride, state, reduced);
        calls.push(frame.calls);
        assert.ok(frame.input.brake, "held brake control reaches the driving input");
        assert.ok(frame.speed <= previous.speed + 0.02, "the car slows without gaining speed");
        if (frame.pool.count !== tiers.at(-1)) tiers.push(frame.pool.count);
        if (!braking && frame.speed > 2 && frame.speed < top.speed - 1
          && frame.probe.enginePitch > 53 && frame.probe.enginePitch < top.probe.enginePitch
          && frame.probe.windGain > 0 && frame.probe.windGain < top.probe.windGain
          && (reduced || (frame.probe.fovDelta > 0.1 && frame.probe.fovDelta < top.probe.fovDelta
            && frame.probe.shakeAmplitude > 0 && frame.probe.shakeAmplitude < top.probe.shakeAmplitude))) {
          braking = frame;
          await note("braking", frame);
        }
        if (frame.speed === 0) {
          stopTime ??= frame.t;
          if (frame.probe.fovDelta < 0.05 && frame.probe.shakeAmplitude < 0.00002 && frame.pool.count === 0
            && frame.probe.windGain === 0 && Math.abs(frame.webAudio.pitch.value - 52) <= 0.5) {
            stopped = frame;
            break;
          }
          if (frame.t - stopTime >= 2.4) timeout("feedback did not settle within 2.4 seconds of standstill");
        }
        previous = frame;
      }
      await brake(false);
      if (!braking || !stopped) timeout("missing intermediate braking or standstill sample");
      assert.ok(stopped.t - stopTime <= 2.4);
      assert.deepEqual(tiers, reduced ? [0] : [4, 2, 0], "line tiers retire in order");
      verifyIdle(stopped, rest);
      await note("stopped", stopped);
      return calls;
    }

    async function drive(ride, damaged = false) {
      const rest = await settleStraight();
      await note("rest", rest);
      const warm = await resources();
      let previous = rest, crawl, mid, top, topSince, activation, activationSamples = 0, atTop;
      const state = { e: 0, tier: 0 }, calls = [];
      const painted = new Set();
      let peakOffset = 0;
      await go(true);
      for (let i = 0; i < 440; i++) {
        const frame = await step();
        verifyTown(frame, previous, rest, ride, state, reduced);
        calls.push(frame.calls);
        assert.ok(frame.input.y > 0.99 && Math.abs(frame.input.x) < 0.01 && !frame.input.brake, "sustained straight input");
        near(frame.t - previous.t, 1 / 60, 1e-9, "one simulation step per measurement");
        if (!reduced) assert.ok(Math.abs(frame.drawn.fov - previous.drawn.fov) <= 0.28, "adjacent straight FOVs");
        if (damaged) assert.ok(frame.dent > 0, "the same car still has its dent");

        if (!crawl && frame.speed >= 2.75 && frame.speed <= 3) {
          crawl = frame;
          await note("crawl", frame);
        }
        if (!mid && frame.speed >= 11.75 && frame.speed <= 12 && (reduced || frame.pool.count === 2)) {
          mid = frame;
          await note("mid", frame);
        }
        if (!activation && frame.pool.count === 2) {
          activation = await resources();
          activationSamples = calls.length;
        }
        if (frame.speed >= 0.96 * max) {
          topSince ??= frame.t;
          peakOffset = Math.max(peakOffset, magnitude(difference(frame.drawn.pose, frame.clean)));
          for (const { index, painted: drawn } of frame.pool.visible) if (drawn) painted.add(index);
          if (frame.t - topSince >= 0.65 - 1e-9) {
            top = frame;
            await note("top", frame);
            if (shots && (damaged || reduced)) await note(damaged ? "damaged-top" : "reduced-top", frame);
            atTop = await resources();
            break;
          }
        } else {
          topSince = undefined;
          peakOffset = 0;
          painted.clear();
        }
        previous = frame;
      }
      await go(false);
      if (!crawl || !mid || !top) timeout("continuous acceleration did not reach all three pace bands");
      assert.ok(rest.pose[0] - top.pose[0] > 25 && Math.abs(rest.pose[2] - top.pose[2]) < 1, "forward asphalt distance");
      const increasing = (key, change = 0) => {
        assert.ok(crawl.probe[key] < mid.probe[key] && mid.probe[key] < top.probe[key], `${key} must strictly increase`);
        assert.ok(top.probe[key] - crawl.probe[key] > change, `${key} advance exceeded noise`);
      };
      increasing("enginePitch", 40);
      increasing("windGain", 0.010);
      assert.deepEqual([crawl, mid, top].map(({ pool }) => pool.count), reduced ? [0, 0, 0] : [0, 2, 4]);
      if (!reduced) {
        increasing("fov", 2.5);
        increasing("shakeAmplitude");
        assert.ok(peakOffset > 0.001 && peakOffset <= 0.00251, "the rendered camera vibrates at top speed");
        assert.equal(painted.size, 4, "all four real strips paint during the top-speed hold");
        zeroResources(warm, activation, "first tier activation adds no WebGL resources after readiness");
      }
      zeroResources(warm, atTop, "the uninterrupted straight adds no WebGL resources after readiness");
      const brakingCalls = await stopAtWheel(top, rest, ride, state);
      console.log("speed-feel", label, model, "gpu-unaltered", JSON.stringify({
        driveCalls: encodeCalls(calls), brakingCalls: encodeCalls(brakingCalls), firstTierFrame: activationSamples,
        programs: atTop.programs, framebuffer: atTop.framebuffer, targets: atTop.targets,
        activationDelta: resourceDelta(warm, atTop),
      }));
      return atTop;
    }

    async function damage(ride) {
      await reset(wall);
      let previous = await step(), e = 0, impact;
      const base = previous.fovFor;
      await go(true);
      for (let i = 0; i < 195; i++) {
        const frame = await step();
        verifyWorld(frame, "town", previous);
        assert.equal(frame.ride, ride.id);
        assert.equal(frame.phase, "on");
        e = stepEnvelope(e, frame.speed, max, frame.t - previous.t);
        verifyAudio(frame, previous, e);
        near(frame.probe.speed, frame.speed, 1e-9, "post-contact pace on the way to the wall");
        if (reduced) {
          near(frame.drawn.fov, base, 0.05, "impact does not enable a speed lens");
          assert.equal(frame.probe.shakeAmplitude, 0);
          verifyPool(frame, 0, true);
          const authoredJolt = Math.cos(frame.jolt * 47) * 0.12 * Math.max(0, 1 - frame.jolt / 0.42) ** 2
            * frame.joltStrength;
          near(magnitude(difference(frame.drawn.pose, [frame.clean[0], frame.clean[1] + authoredJolt, frame.clean[2]])),
            0, 0.00001, "the reduced collision camera retains only its impact jolt");
        }
        if (frame.dent > 0) {
          impact = frame;
          break;
        }
        previous = frame;
      }
      await go(false);
      if (!impact) timeout("real warehouse impact made no dent");
      assert.ok(impact.hit?.id === ride.id && impact.hit.target === "town" && impact.hit.k > 0.3, JSON.stringify(impact.hit));
      await note("collision", impact);
    }

    async function livePreference(ride) {
      const rest = await settleStraight();
      const state = { e: 0, tier: 0 };
      let previous = rest, comparedFirst = false, reachedTop = false;
      let reducedForFrame = false, resumeFrames = 21;
      const advance = async () => {
        const frame = await step();
        if (!reducedForFrame) resumeFrames++;
        const k = Math.min(1, resumeFrames / 21);
        verifyTown(frame, previous, rest, ride, state, reducedForFrame, reducedForFrame ? 0 : k * k * (3 - 2 * k));
        previous = frame;
        return frame;
      };
      const reenter = async () => {
        // The comparison used a scoped pinned camera. Read the unpinned zero-time frame before resuming.
        previous = await step(0);
        state.tier = previous.pool.count / 2;
        resumeFrames = 0;
        near(previous.drawn.fov, rest.drawn.fov, 0.05, "preference re-entry starts at zero visual lift");
      };
      await go(true);
      for (let i = 0; i < 440; i++) {
        const frame = await advance();
        if (!comparedFirst && frame.pool.count === 2) {
          await compareDraws("first-tier");
          await reenter();
          comparedFirst = true;
        }
        if (frame.speed >= 0.96 * max && resumeFrames >= 21) {
          reachedTop = true;
          break;
        }
      }
      if (!reachedTop || !comparedFirst) timeout("live preference pass did not reach first tier and top");
      const hot = previous;
      await page.emulateMedia({ reducedMotion: "reduce" });
      // The immediate media change may have reset the tier before the first simulation step.
      await page.waitForFunction(() => matchMedia("(prefers-reduced-motion: reduce)").matches, null, { polling: 50 });
      reducedForFrame = true;
      const down = await advance();
      assert.ok(down.speed >= 0.96 * max && down.webAudio.pitch.value > 105 && down.webAudio.wind.value > 0.02);
      near(down.webAudio.pitch.value, hot.webAudio.pitch.value, 1, "sound continues with motion reduced");
      near(down.webAudio.wind.value, hot.webAudio.wind.value, 0.001, "wind continues with motion reduced");
      await note("toggle-reduced-top", down);
      await page.emulateMedia({ reducedMotion: "no-preference" });
      reducedForFrame = false;
      resumeFrames = 0;
      const up = await advance();
      assert.ok(up.drawn.fov > rest.drawn.fov && up.drawn.fov - rest.drawn.fov < 0.1, "first resumed frame has a small visual lift");
      await note("toggle-first", up);
      while (resumeFrames < 21) await advance();
      assert.ok(previous.probe.fovDelta > 3, "returns to full visual strength after 0.35 s");
      await note("toggle-restored", previous);
      await compareDraws("cruise");
      await reenter();
      while (resumeFrames < 21) await advance();
      await go(false);
      await stopAtWheel(previous, rest, ride, state);
    }

    async function roadHandoff() {
      const ride = await board("road");
      const cap = phone ? 26 : 60;
      const readRoad = () => page.evaluate(() => window.__ew.road.state());
      const state = await readRoad(), { x, z, outward } = state.exit;
      near(outward, pc ? 0 : -Math.PI / 2, 0.01, "the edition's physical road exit");
      assert.equal(state.phase, "town");
      assert.ok(state.requested && state.ready);
      await reset({ x: x - Math.sin(outward) * 19, z: z - Math.cos(outward) * 19, rot: outward });
      let townBase, townDist, previous;
      for (let i = 0; i < 40; i++) {
        previous = await step();
        verifyWorld(previous, "town");
        townBase = previous.drawn.fov;
        townDist = previous.dist;
      }
      await go(true);
      let first, firstFrame, signed = false;
      for (let i = 0; i < 475; i++) {
        const frame = await step();
        verifyWorld(frame, frame.road.phase === "briefing" ? "road" : "town", previous);
        if (frame.road.phase === "briefing") {
          firstFrame = frame;
          first = await readRoad();
          break;
        }
        assert.ok(frame.road.ready && frame.ride === ride.id);
        signed ||= frame.road.exitDistance >= 0 && frame.speed > 1;
        if (reduced) {
          near(frame.drawn.fov, townBase, 0.05, "reduced lens on the signed approach");
          near(frame.dist, townDist, 1e-7, "reduced approach has no speed dolly");
          assert.equal(frame.probe.shakeAmplitude, 0);
          verifyPool(frame, 0, true);
        }
        previous = frame;
      }
      await go(false);
      if (!first) timeout("did not cross the warm signed exit");
      assert.ok(signed && first.ready && first.car === ride.id);
      assertRoadContinuity(first);
      assert.equal(firstFrame.road.elapsed, 0);
      assert.ok(firstFrame.calls <= cap && !firstFrame.loading && firstFrame.fade < 0.01);
      near(firstFrame.probe.fov, firstFrame.road.fov, 1e-9, "road owns the actual first lens");
      near(firstFrame.drawn.fov - townBase, firstFrame.probe.fovDelta, 0.05, "only the inherited lens at the crest");
      assert.ok(firstFrame.probe.fovDelta <= 3.52);
      if (reduced) {
        near(firstFrame.drawn.fov, townBase, 0.05, "reduced crest retains the authored lens");
        assert.equal(firstFrame.probe.fovDelta, 0);
      }
      assert.equal(firstFrame.probe.enginePitch, 0, "town audio is released at ownership transfer");
      assert.equal(firstFrame.webAudio.car, false);
      assert.equal(firstFrame.webAudio.retiredMotor?.value, 0);
      verifyPool(firstFrame, 0, reduced);
      await note("road-first", firstFrame);
      await page.locator('[data-way="words"]').waitFor({ state: "visible" });
      await button('[data-way="words"]');
      await page.locator(".road-header").waitFor({ state: "visible" });
      await page.locator(".road-gate").nth(2).waitFor({ state: "attached" });
      await page.evaluate(() => document.fonts.ready);
      assert.equal((await readRoad()).phase, "drive");

      // Recalculate the authored shot with the same distance, gate, lift, easing history and viewport, on a
      // copied chase and camera. The live render sees the original arguments and still owns its projection.
      await page.evaluate(() => {
        const { game } = window.__ew, { view } = game.modes.get("road").mode.run;
        const { chase } = view, update = chase.update, settle = chase.settle;
        const state = (camera) => ({
          fov: camera.fov, pose: camera.position.toArray(), rotation: camera.quaternion.toArray(),
        });
        chase.update = function (camera, center, distance, lift, visualPace, time, dt, width, height, corners, gate, amplitude) {
          const control = Object.assign(Object.create(Object.getPrototypeOf(this)), this,
            { focus: this.focus.clone(), target: this.target.clone() });
          const base = camera.clone();
          update.call(control, base, center, distance, lift, 0, time, dt, width, height, corners, gate, 0);
          const result = update.call(this, camera, center, distance, lift, visualPace, time, dt, width, height, corners, gate, amplitude);
          window.__speedRoadReference = {
            base: state(base), clean: state(camera), lens: control.lens, mix: 1, time,
            inheritedY: view.seam?.vibration ?? 0, gateDistance: gate && gate.distance - distance,
          };
          return result;
        };
        chase.settle = function (...args) {
          const result = settle.apply(this, args);
          const ref = window.__speedRoadReference;
          ref.clean = state(args[0]);
          ref.mix = args[5];
          return result;
        };
        window.__speedRestoreRoad = () => {
          chase.update = update;
          chase.settle = settle;
          delete window.__speedRoadReference;
        };
      });

      const settle = [await readRoad()];
      let e = 0, tier = 0, nearGate, clear, sawShake = false, pulledAway = false;
      let firstDrive;
      previous = firstFrame;
      await go(true);
      try {
        for (let i = 0; i < 550; i++) {
          const frame = await step(), road = frame.road, ref = road.reference;
          verifyWorld(frame, "road", previous);
          assert.ok(frame.calls <= cap && !frame.loading && frame.fade < 0.01, `road draw budget ${frame.calls}/${cap}`);
          assert.ok(road.elapsed > previous.road.elapsed && road.position > previous.road.position);
          assert.equal(road.renderSerial, previous.road.renderSerial + 1);
          assert.ok(frame.probe.active && frame.probe.reducedMotion === reduced);
          near(frame.probe.speed, road.speed, 1e-9, "open-road actual car speed in m/s");
          near(frame.probe.fov, road.fov, 1e-9, "RoadView camera agrees with probe");
          e = stepEnvelope(e, road.speed, 28, frame.t - previous.t);
          tier = reduced ? 0 : expectedTier(tier, e);
          verifyPool(frame, tier, reduced);
          verifyAudio(frame, previous, e);
          firstDrive ??= frame;
          assert.ok(frame.probe.fovDelta >= -0.02 && frame.probe.fovDelta <= 3.52);
          assert.ok(frame.probe.shakeAmplitude >= 0 && frame.probe.shakeAmplitude <= 0.00251);
          const radians = Math.PI / 180;
          const authoredWide = 2 * Math.atan(Math.tan(ref.base.fov * radians / 2) * ref.lens) / radians;
          const projected = 2 * Math.atan(Math.tan((authoredWide + 3.5 * e) * radians / 2) / ref.lens) / radians;
          const liveDelta = reduced ? 0 : Math.min(3.5, projected - ref.base.fov);
          const lift = firstFrame.probe.fovDelta * (1 - ref.mix) + liveDelta * ref.mix;
          near(frame.probe.fovDelta, lift, 0.02, "projected speed lens, same gate distance and framing");
          if (ref.mix === 1) near(frame.drawn.fov - ref.base.fov, lift, 0.02, "actual RoadView lens over the reference fit");
          const g = ref.gateDistance === undefined ? 1 : Math.max(0, Math.min(1, (ref.gateDistance - 85) / 15));
          const liveShake = reduced ? 0 : 0.0025 * e ** 2 * g * g * (3 - 2 * g);
          const offset = difference(frame.drawn.pose, ref.clean.pose);
          near(frame.probe.shakeAmplitude, liveShake * ref.mix, 0.00001, "road vibration peak");
          near(magnitude([offset[0], offset[2]]), 0, 1e-7, "no horizontal road vibration");
          near(offset[1], liveShake * ref.mix * Math.sin(2 * Math.PI * 7 * ref.time)
            + (reduced ? 0 : ref.inheritedY * (1 - ref.mix)), 0.00001, "RoadView applies vertical vibration after framing");
          assert.ok(magnitude(offset) <= 0.00251);
          assert.deepEqual(frame.drawn.rotation, ref.clean.rotation, "road vibration preserves the authored look");
          if (reduced) {
            assert.equal(frame.probe.fovDelta, 0);
            assert.equal(frame.probe.shakeAmplitude, 0);
            assert.equal(magnitude(offset), 0);
            if (ref.mix === 1) near(magnitude(difference(frame.drawn.pose, ref.base.pose)), 0, 1e-7, "reduced road has no speed dolly");
          }
          sawShake ||= Math.abs(offset[1]) > 0.00015 && ref.mix === 1;
          pulledAway ||= frame.webAudio.pitch.value > firstDrive.webAudio.pitch.value + 25 && frame.webAudio.wind?.value > 0.006;
          if (settle.at(-1).elapsed < 1.6 - 1e-8) {
            settle.push(await readRoad());
            if (settle.at(-1).elapsed >= 1.6 - 1e-8) {
              assertCameraSettle(settle);
              await note("road-settled", frame);
            }
          }
          if (road.gates === 0 && road.elapsed > 0.35 && road.right !== undefined) {
            await page.evaluate((lane) => window.__ew.road.steer(lane), road.right);
          }
          if (!nearGate && road.gates === 0 && road.gateDistance > 13 && road.gateDistance < 25 && road.elapsed > 1.6) {
            const registration = await sampleBoardRegistration(page, "road");
            const centers = registration.samples.filter(({ name }) => name === "center");
            assert.equal(centers.length, 3);
            for (const board of centers) {
              assert.ok(board.visible && magnitude(difference(board.measured, board.projected)) <= 0.5,
                JSON.stringify(board));
            }
            nearGate = frame;
            await note("road-gate-fit", frame);
          }
          if (road.gates === 1 && (road.gateDistance === undefined || road.gateDistance > 100)
            && (reduced || (sawShake && frame.pool.count >= 2))) {
            clear = frame;
            await note("road-clear", frame);
            break;
          }
          previous = frame;
        }
      } finally {
        await go(false);
        await page.evaluate(() => { window.__speedRestoreRoad(); delete window.__speedRestoreRoad; });
      }
      if (!nearGate || !clear) timeout("did not sample a fitted gate and a clear stretch");
      assert.ok(pulledAway && (reduced || sawShake));
      assert.ok(reduced || (nearGate.probe.fovDelta > 0 && clear.probe.fovDelta > 0));

      const home = ".road-header .road-dash > button.road-icon:first-child";
      await button(home);
      await ready(() => window.__ew.road.state().phase === "town" && !document.querySelector(".road-header"), "returns from road");
      const returned = await step();
      verifyWorld(returned, "town");
      assert.equal(returned.ride, ride.id);
      assert.equal(returned.phase, "on");
      assert.equal(returned.probe.speed, 0);
      assert.equal(returned.probe.windGain, 0);
      assert.equal(returned.webAudio.wind, undefined);
      assert.equal(returned.webAudio.retiredWind?.value, 0);
      near(returned.webAudio.pitch?.value, 52, 0.5, "the returned car's idle oscillator");
      assert.equal(returned.probe.shakeAmplitude, 0);
      assert.equal(returned.probe.fovDelta, 0);
      near(returned.probe.fov, returned.drawn.fov, 1e-9, "town owns the lens again");
      verifyPool(returned, 0, reduced);
      await note("road-return", returned);
      await getOut(ride, false);
    }

    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await ready(() => {
      const ew = window.__ew;
      return ew?.store.getState().screen === "play" && ew.game?.zone?.id === "town"
        && !!document.querySelector(".hud .toolbar");
    }, "returning player reaches the real town");
    await page.evaluate(installObservers);
    await page.evaluate(() => {
      window.__ew.coach?.finish?.();
      window.__ew.store.getState().setHud({ panel: null });
    });
    await ready(() => {
      const { game, carStats } = window.__ew;
      const cars = carStats();
      return game.ledges?.ready && !game.transitioning && game.carVisuals?.ready && game.crashShadersReady
        && cars.loadedCarModels > 0 && cars.parkedModels > 0 && cars.trafficModels > 0;
    }, "town car models and crash shader warmup");
    const before = await step();
    verifyWorld(before, "town");
    assert.ok(!before.probe && before.pool.containers === 0, "speed pool stays lazy until the first board");
    assert.deepEqual(before.viewpoint, [options.viewport.width, options.viewport.height, phone ? 2 : 1]);
    const cold = await resources();
    const roofed = await board("roofed");
    const prepared = await resources();
    const atTop = await drive(roofed);
    const coldMount = resourceDelta(cold, prepared);
    assert.deepEqual(resourceDelta(prepared, atTop).added, [], "no extra programs at first cruise");
    await getOut(roofed);

    const convertible = await board("convertible");
    await drive(convertible);
    await getOut(convertible);

    const dented = await board("roofed");
    assert.equal(dented.id, roofed.id);
    model = `damaged-${dented.model}-${dented.id}`;
    await damage(dented);
    await drive(dented, true);
    await getOut(dented);
    assert.ok(await page.evaluate(() => window.__ew.game.rides.crashes.info(window.__speedRide)?.dentCount > 0),
      "the stationary damaged car remains in town after the probe releases");

    if (!reduced) {
      const moving = await board("convertible");
      model = `live-${moving.model}-${moving.id}`;
      await page.evaluate(() => window.__ew.store.getState().setSettings({ cameraFollow: false }));
      try {
        await livePreference(moving);
        await getOut(moving);
      } finally {
        await page.evaluate(() => window.__ew.store.getState().setSettings({ cameraFollow: true }));
      }
    }

    await roadHandoff();
    assert.deepEqual(errors, []);
    return coldMount;
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: [...(process.platform === "darwin"
    ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
    : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]), "--mute-audio"],
});
try {
  for (const options of viewportCases) {
    const control = await suite(browser, options, true);
    const active = await suite(browser, options, false);
    const identity = `${pc ? "pc" : "mh"}-${learner}-${storage} ${options.viewport.width}x${options.viewport.height} ${options.phone ? "touch" : "keys"}`;
    assert.deepEqual(active, control, `${identity}: first pool mount adds no resources over matching car and road warmup`);
    console.log("speed-feel", identity, "roofed cold-mount no-preference/reduce", JSON.stringify({
      warmup: { ...control, added: control.added.length }, drawCalls: 0, programs: 0, targets: 0, framebuffers: 0,
    }));
  }
  console.log("speed-feel: all browser checks passed");
} finally {
  await browser.close();
}
