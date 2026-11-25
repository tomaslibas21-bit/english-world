// Run once per Puerto Colibrí server. The page supplies the learner; WORLD_LEARNER can assert it.
import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import { sampleBoardRegistration } from "./board-registration.mjs";
import { assertCameraSettle, assertRoadContinuity } from "./road-handoff.mjs";
import { atTaxiStand, checkSightlines, taxiSightlines, taxiStandStart } from "./taxi-stand.mjs";

const url = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:5188");
const storage = process.env.WORLD_STORAGE ?? "puerto-colibri";
const requested = process.env.WORLD_LEARNER;
const shots = process.env.WORLD_SHOTS;
assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) && /^https?:$/.test(url.protocol),
  "Use a local Puerto Colibrí server");
assert.equal(storage, "puerto-colibri");
assert.ok(requested === undefined || requested === "en" || requested === "lt");
const configuredPlaywright = process.env.WORLD_PLAYWRIGHT_MODULE;
const sharedPlaywright = join(homedir(), "claude-work", "_h-tools", "node_modules", "playwright-core", "index.mjs");
// The chain can pass the PC worktree directory in place of the shared module file.
const configuredDirectory = configuredPlaywright && isAbsolute(configuredPlaywright)
  && statSync(configuredPlaywright, { throwIfNoEntry: false })?.isDirectory();
const defaultPlaywright = existsSync(sharedPlaywright) ? sharedPlaywright : "playwright";
const { chromium } = await import(configuredDirectory ? sharedPlaywright : configuredPlaywright || defaultPlaywright);

const tick = 1000 / 60, max = 15.5, seed = 20261122;
const straight = { x: 110, z: 76, rot: -Math.PI / 2 };
const wall = { x: 125, z: -51.4, rot: Math.PI / 2 + 0.45 };
const lane = { x: -1.65, z: 53, rot: 0 };
const vehicles = {
  "parked-0": { kind: "car", model: "sedan", roofed: true, owners: [], parking: { x: -80, z: -4.2, rot: Math.PI / 2 } },
  park: { kind: "car", model: "convertible", roofed: false, owners: ["park"], tint: "#f0508f", parking: { x: 80.5, z: -11.8, rot: -Math.PI / 2 } },
  muelle: { kind: "boat", model: "boat", roofed: false, owners: [], parking: { x: -11.5, z: -74.3, rot: Math.PI - 0.25 } },
};
const done = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const save = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 1, sounds: 0.8, cameraFollow: true,
    phoneCalls: false, textMessages: false },
  sits: { "s65a-passport": done, "s65b-baggage": done, "s66-taxi": done },
  phrases: {}, seenIntro: {}, started: 1, place: { zone: "town", ...straight },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};
const options = [
  { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 },
];
const speedJs = /\/(?:src\/game\/rides\/speedFeel\.ts|assets\/speedFeel-[\w-]+\.js)$/;
const speedAsset = /\/(?:src\/game\/rides\/speedFeel\.(?:ts|css)|assets\/speedFeel-[\w-]+\.(?:js|css))$/;
const roadAsset = /\/(?:src\/(?:game\/road\/mode\.ts|ui\/Road\.tsx)|assets\/(?:mode|Road)-[\w-]+\.js)$/;
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const near = (a, b, limit, label) =>
  assert.ok(Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= limit, `${label}: ${a} vs ${b} (±${limit})`);
const smooth = (k) => k * k * (3 - 2 * k);
const clamp = (k) => Math.min(1, Math.max(0, k));
const rounded = (n) => Number(n.toFixed(6));
const safeName = (name) => name.replace(/[^\w.-]+/g, "-");

function installClock({ key, save, seed, taxiFirst }) {
  localStorage.setItem(key, JSON.stringify(save));
  sessionStorage.setItem("ew-play-now", "1");
  if (taxiFirst) window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
  const input = window.__speedInput = {};
  document.addEventListener("pointerdown", (event) => {
    input.pointer = { trusted: event.isTrusted, type: event.pointerType, id: event.pointerId };
  }, true);
  document.addEventListener("click", (event) => { input.click = event.isTrusted; }, true);
  document.addEventListener("keydown", (event) => {
    if (event.isTrusted) input.key = event.key.toLowerCase();
  }, true);
  let now = 1000, id = 0;
  const frames = new Map();
  performance.now = () => now;
  Math.random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  window.requestAnimationFrame = (callback) => { frames.set(++id, callback); return id; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__step = (count, ms) => {
    for (let i = 0; i < count; i++) {
      now += ms;
      const pending = [...frames.values()];
      frames.clear();
      for (const callback of pending) callback(now);
    }
  };

  // Observe native targets, graph edges and GPU creation after the original call succeeds.
  const targets = new WeakMap(), connections = new WeakMap(), started = new WeakSet();
  const framebuffers = new WeakMap(), programs = new WeakMap();
  let serial = 0;
  function observe(object, name, record) {
    const original = object[name];
    object[name] = function (...args) {
      const result = original.apply(this, args);
      record(this, args, result);
      return result;
    };
  }
  observe(AudioParam.prototype, "setTargetAtTime", (param, [value, time, tau]) => {
    const record = { value, time, tau, serial: ++serial };
    if (taxiFirst) record.writes = (targets.get(param)?.writes ?? 0) + 1;
    targets.set(param, record);
  });
  observe(AudioNode.prototype, "connect", (node, [destination]) => {
    if (!connections.has(node)) connections.set(node, new Set());
    connections.get(node).add(destination);
  });
  observe(AudioNode.prototype, "disconnect", (node, [destination]) => {
    if (destination === undefined) connections.delete(node);
    else if (destination instanceof AudioNode || destination instanceof AudioParam) connections.get(node)?.delete(destination);
  });
  observe(OscillatorNode.prototype, "start", (node) => started.add(node));
  observe(AudioBufferSourceNode.prototype, "start", (node) => started.add(node));
  for (const type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
    if (!type) continue;
    for (const [name, records] of [["createFramebuffer", framebuffers], ["createProgram", programs]]) {
      observe(type.prototype, name, (gl, _, handle) => {
        if (!records.has(gl)) records.set(gl, new Set());
        if (handle) records.get(gl).add(handle);
      });
    }
  }
  const reaches = (node, destination, seen = new Set()) => {
    if (node === destination) return true;
    if (seen.has(node)) return false;
    seen.add(node);
    return [...(connections.get(node) ?? [])].some((output) => reaches(output, destination, seen));
  };
  const target = (param) => param && targets.get(param);
  const carWind = { motor: undefined, wind: undefined };
  if (window.SpeechSynthesis) {
    SpeechSynthesis.prototype.speak = () => { throw new Error("Unexpected speech synthesis in speed-feel"); };
  }

  window.__speedNative = {
    counts: (gl) => ({ framebuffers: framebuffers.get(gl)?.size ?? 0, glPrograms: programs.get(gl)?.size ?? 0 }),
    audio(audio) {
      const { ctx, motorSet: motor, worldBus: bus } = audio;
      const wind = audio.held.get("wind");
      if (motor?.kind === "car") carWind.motor = motor.gain.gain;
      if (motor?.kind === "car" && wind) carWind.wind = wind.gain.gain;
      return {
        context: ctx?.state, time: ctx?.currentTime, volume: audio.volume, sounds: audio.sounds,
        radio: audio.underMusic, bus: bus && (target(bus.gain)?.value ?? bus.gain.value),
        kind: motor?.kind, pitch: target(motor?.o1.frequency), motorGain: target(motor?.gain.gain),
        motorConnected: !!motor && started.has(motor.o1) && reaches(motor.o1, ctx.destination),
        wind: target(wind?.gain.gain), tone: target(wind?.f.frequency),
        windConnected: !!wind && started.has(wind.src) && reaches(wind.src, ctx.destination),
        retiredMotor: motor?.kind !== "car" && target(carWind.motor),
        retiredWind: wind?.gain.gain !== carWind.wind && target(carWind.wind),
      };
    },
  };
}

function observeGame(taxiFirst) {
  const { game, road, audio, store, carStats } = window.__ew;
  // Keep recording lookup and missing-file handling, and keep native synthesis local to the ride.
  const play = audio.play.bind(audio);
  audio.play = (voice, speed, line, options) => play(voice, speed, line, { ...options, recordingOnly: true });
  const { renderer, rig, rides } = game;
  const gl = renderer.getContext(), native = window.__speedNative;
  const render = renderer.render, setRenderTarget = renderer.setRenderTarget;
  const townClean = rig.cam.clone();
  const targetIds = new Map();
  let draws = [], targets = [], targetUses = 0, tierWrites = 0, pool;
  let drewTaxiShot = false;
  const run = () => game.modes.get("road")?.mode?.run;
  const camera = (cam) => ({
    fov: cam.fov, eye: cam.position.toArray(), rotation: cam.quaternion.toArray(),
    projection: cam.projectionMatrix.toArray(), view: cam.view && { ...cam.view },
    zoom: cam.zoom, layers: cam.layers.mask,
  });
  const visibility = (scene) => {
    const visible = [];
    scene.traverseVisible((object) => {
      if (object.geometry) visible.push([object.id, object.frustumCulled, object.layers.mask]);
    });
    return visible;
  };
  let compareVisibility = false;
  renderer.render = function (scene, cam) {
    const view = run()?.view;
    const world = scene === game.scene && cam === rig.cam ? "town"
      : scene === view?.scene && cam === view.camera ? "road" : "other";
    const drawn = camera(cam);
    const onScreen = this.getRenderTarget() === null;
    const value = render.call(this, scene, cam);
    draws.push({ world, onScreen, ...drawn, drawnEye: cam.matrixWorld.elements.slice(12, 15),
      calls: this.info.render.calls, serial: this.info.render.frame,
      visibility: compareVisibility ? visibility(scene) : undefined });
    return value;
  };
  renderer.setRenderTarget = function (target, ...args) {
    const result = setRenderTarget.call(this, target, ...args);
    if (target) {
      if (!targetIds.has(target)) targetIds.set(target, targetIds.size + 1);
      targets.push([targetIds.get(target), args[0] ?? 0, args[1] ?? 0]);
      targetUses++;
    }
    return result;
  };

  const hud = ".toolbar, .objective-card, .minimap, .prompt, .ride-strip, .ride-menu, .joy, .act-btn, .brake-btn, .drive-horn, .road-header, .road-controls";
  function bounds(node) {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    return { left, right, top, bottom };
  }
  const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  function strips() {
    const containers = [...document.querySelectorAll(".speed-feel")];
    const [layer] = containers;
    if (!layer) return { containers: 0, marks: [] };
    const stage = renderer.domElement.parentElement, css = getComputedStyle(layer);
    const slots = [...layer.children];
    pool ??= [layer, ...slots];
    const controls = [...document.querySelectorAll(hud)]
      .filter((node) => node.getClientRects().length && getComputedStyle(node).visibility === "visible")
      .map((node) => [node.className, bounds(node)]);
    const marks = slots.flatMap((slot, index) => {
      const style = getComputedStyle(slot);
      if (style.display === "none" || style.visibility !== "visible" || !slot.getClientRects().length) return [];
      const pseudo = getComputedStyle(slot, "::before"), box = bounds(slot);
      const matrix = new DOMMatrixReadOnly(style.transform === "none" ? undefined : style.transform);
      return [{
        index, box, opacity: +style.opacity, strength: +pseudo.opacity, ink: pseudo.backgroundImage,
        painted: +style.opacity * +pseudo.opacity > 0,
        height: parseFloat(style.height), width: parseFloat(style.width), top: parseFloat(style.top),
        inset: parseFloat(index % 2 ? style.right : style.left),
        angle: Math.atan2(matrix.b, matrix.a) * 180 / Math.PI, dx: matrix.e, dy: matrix.f,
        duration: parseFloat(style.animationDuration), delay: style.animationDelay,
        infinite: slot.getAnimations().some((anim) => anim.effect?.getTiming().iterations === Infinity),
        overlaps: controls.filter(([, other]) => overlaps(box, other)).map(([name]) => name),
      }];
    });
    return {
      containers: containers.length, slots: slots.length, marks,
      pooled: pool.length === slots.length + 1 && [layer, ...slots].every((node, i) => pool[i] === node),
      stage: layer.parentElement === stage && !!(renderer.domElement.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING),
      beneathHud: Math.max(+getComputedStyle(stage).zIndex || 0, +css.zIndex || 0) < +getComputedStyle(document.querySelector(".hud")).zIndex,
      transparent: css.backgroundImage === "none" && css.filter === "none" && css.maskImage === "none"
        && css.visibility === "visible" && +css.opacity === 1,
      hidden: css.display === "none", pointer: css.pointerEvents, aria: layer.getAttribute("aria-hidden"),
    };
  }
  const recordTiers = (records) => { tierWrites += records.filter(({ target }) => target.matches(".speed-feel")).length; };
  const observer = new MutationObserver(recordTiers);
  observer.observe(game.container, { subtree: true, attributeFilter: ["data-tier"] });

  window.__speedTest = {
    resources() {
      return { ...native.counts(gl), targets: targetIds.size, targetUses,
        programs: renderer.info.programs.map(({ id, cacheKey }) => ({ id, key: cacheKey })) };
    },
    read() {
      recordTiers(observer.takeRecords());
      const ride = rides.riding, m = ride?.m, view = run()?.view, roadState = road.state();
      townClean.position.copy(rig.curPos);
      townClean.lookAt(rig.curLook);
      const feel = window.__speedFeel;
      const taxi = taxiFirst && game.modes.get("taxi");
      const shot = rig.taxiShot;
      return {
        t: game.t, drawn: draws.findLast((draw) => draw.onScreen && draw.world !== "other"), draws, targets,
        presented: game.presentedWorld, calls: renderer.info.render.calls, camera: camera(view?.camera ?? rig.cam),
        townCamera: camera(rig.cam), clean: rig.curPos.toArray(), cleanRotation: townClean.quaternion.toArray(),
        base: rig.fovFor(game.container.clientWidth, game.container.clientHeight, false),
        boatBase: rig.fovFor(game.container.clientWidth, game.container.clientHeight, game.vel.lengthSq() > 30),
        rigMode: rig.mode, dist: rig.dist, jolt: rig.joltT, joltStrength: rig.joltK,
        viewport: [innerWidth, innerHeight, devicePixelRatio], screen: game.screenState(),
        reduced: matchMedia("(prefers-reduced-motion: reduce)").matches, follow: store.getState().settings.cameraFollow,
        probe: feel && { ...feel }, pool: strips(), tierWrites, audio: native.audio(audio),
        ride: ride?.id, phase: rides.phase, model: ride?.model, speed: m?.pace ?? 0, max: m?.spec.max,
        pose: m && [m.x, ride.mesh.position.y, m.z, m.heading], player: game.player.root.position.toArray(),
        seatedVisible: game.player.root.visible, anim: game.player.anim, asphalt: m && rides.asphalt.has(m.x, m.z),
        taxi: taxi ? {
          phase: taxi.run?.phase, index: taxi.run?.index, route: taxi.route?.id, speed: taxi.car.m.speed,
          drewTaxiShot, shot: shot && { distance: shot.distance, blend: shot.elapsed, rays: rig.taxiSnapRays },
        } : undefined,
        damage: ride && rides.crashes.info(ride), hit: rides.crashes.last(),
        contact: rides.contacts?.map(({ target, x, z, push }) => ({ target: typeof target === "object" ? target?.id : target, x, z, push })), revs: rides.revs, slip: m?.slip, helm: rig.portraitHelm, boatLens: game.rideFov, boatBack: game.rideBack,
        rollingDust: game.dust.puffs.filter((p) => p.rolling && (p.s.visible || p.life > 0)).length,
        traffic: game.ambient.traffic.map(({ x, lane, speed, hidden, crashStop }) => ({ x, lane, speed, hidden, crashStop })),
        carStats: carStats(),
        eligible: [...rides.solidVehicles()].filter((r) => r.kind === "car" && (!rides.modeCars.has(r) || r.parked)).length,
        road: {
          phase: roadState.phase, townCar: roadState.townCar, ready: roadState.ready, requested: roadState.requested,
          exitDistance: roadState.exitDistance, onStrip: roadState.onStrip, outwardIntent: roadState.outwardIntent,
          position: roadState.roadPosition, elapsed: roadState.elapsed, speed: roadState.speed,
          actualSpeed: run()?.car.speed, lane: roadState.lane, right: roadState.right, gateDistance: roadState.gateDistance,
          gates: roadState.totalGates, correct: roadState.rightGates, renderSerial: roadState.renderSerial,
          ghost: roadState.ghost, recorded: run()?.ghost.frames.length, lift: roadState.liftHeight,
          pose: view?.car.position.toArray(), reference: window.__speedRoadReference,
        },
        loading: !!document.querySelector(".ew-loading, .road-loading, .sea-loading"),
        fade: Number(getComputedStyle(document.querySelector(".fade")).opacity),
        input: game.driveInput(false),
      };
    },
    step(count, ms) {
      draws = [];
      targets = [];
      drewTaxiShot = taxiFirst && rig.hasTaxiShot;
      window.__step(count, ms);
      return this.read();
    },
    pinTown(cameraToMatch = rig.cam) {
      const cam = rig.cam, pinned = cameraToMatch.clone(), previousCull = game.farCull, observedRender = renderer.render;
      let live;
      const pin = () => { cam.copy(pinned, false); cam.updateMatrixWorld(true); };
      compareVisibility = true;
      game.farCull = function (...args) {
        live = cam.clone();
        pin();
        return previousCull.apply(this, args);
      };
      renderer.render = function (scene, camera, ...args) {
        if (camera === cam) pin();
        return observedRender.call(this, scene, camera, ...args);
      };
      return () => {
        game.farCull = previousCull;
        renderer.render = observedRender;
        compareVisibility = false;
        if (live) { cam.copy(live, false); cam.updateMatrixWorld(true); }
      };
    },
  };
}

function verifyDraw(frame, world, previous) {
  const { drawn, camera } = frame;
  assert.ok(drawn?.onScreen && drawn.world === world && drawn.calls > 0, JSON.stringify(frame.draws));
  assert.equal(frame.draws.filter((draw) => draw.onScreen && draw.world !== "other").length, 1);
  assert.equal(frame.calls, drawn.calls);
  if (previous) assert.equal(drawn.serial, previous.drawn.serial + 1, "one rendered world per step");
  if (frame.presented) assert.deepEqual(frame.presented, { scene: world, serial: drawn.serial });
  for (const key of ["eye", "rotation", "projection", "view", "layers", "fov"]) assert.deepEqual(drawn[key], camera[key], key);
  const viewScale = drawn.view?.enabled ? drawn.view.fullHeight / drawn.view.height : 1;
  near(drawn.projection[5], drawn.zoom * viewScale / Math.tan(drawn.fov * Math.PI / 360), 1e-7, "rendered projection");
  near(distance(drawn.drawnEye, drawn.eye), 0, 1e-7, "rendered eye");
}

function envelope(e, speed, divisor, dt) {
  const goal = clamp(speed / divisor);
  const next = goal + (e - goal) * Math.exp(-Math.max(0, Math.min(0.05, dt)) / (goal > e ? 0.22 : 0.32));
  return goal === 0 && next < 0.002 ? 0 : next;
}

function verifyTarget(target, expected, tau, audioTime, previous, label) {
  assert.ok(target?.serial > (previous?.serial ?? 0), `fresh native ${label} target`);
  near(target.value, expected, 0.00005, label);
  near(target.tau, tau, 1e-9, `${label} time constant`);
  assert.ok(target.time >= (previous?.time ?? 0) && target.time <= audioTime, `${label} schedule time`);
}

function verifyRelease(target, tau, label) {
  assert.equal(target?.value, 0, label);
  near(target.tau, tau, 1e-9, label);
}

function verifyCarAudio(frame, previous, e, voiceCanDuck = false) {
  const { audio, probe } = frame;
  assert.ok(audio.context === "running" && audio.volume === 1 && audio.sounds > 0
    && (voiceCanDuck ? audio.bus >= 0 : audio.bus > 0) && audio.radio === 1, JSON.stringify(audio));
  assert.ok(audio.kind === "car" && audio.motorConnected && audio.motorGain?.value > 0, JSON.stringify(audio));
  verifyTarget(audio.pitch, 52 + 62 * e, 0.08, audio.time, previous?.audio.pitch, "car oscillator");
  assert.ok(audio.pitch.value >= 52 && audio.pitch.value <= 114);
  near(probe.enginePitch, audio.pitch.value, 1e-9, "probe reports native pitch");
  const level = 0.72 * e ** 2, gain = level <= 0.01 ? 0 : 0.035 * level;
  near(probe.windGain, gain, 1e-8, "quadratic car wind with cutoff");
  assert.ok(probe.windGain >= 0 && probe.windGain <= 0.0252 + 1e-8);
  if (gain > 0) {
    assert.ok(audio.windConnected);
    verifyTarget(audio.wind, gain, 0.06, audio.time, previous?.audio.wind, "car wind gain");
    verifyTarget(audio.tone, 260 + 900 * e, 0.07, audio.time, previous?.audio.tone, "car wind cutoff frequency");
    near(audio.wind.value, probe.windGain, 1e-9, "probe reports native wind");
  } else {
    assert.equal(audio.wind, undefined);
    if (previous?.audio.wind) verifyRelease(audio.retiredWind, 0.06, "car wind releases below the threshold");
  }
}

function tierAt(tier, e) {
  if (e >= (tier === 2 ? 0.79 : 0.83)) return 2;
  return Number(e >= (tier > 0 ? 0.55 : 0.59));
}

function verifyPool(frame, tier, reduced, strength = 1) {
  const { pool, probe, viewport: [width, height] } = frame;
  assert.equal(probe.streakCount, tier * 2);
  assert.ok(pool.containers === 1 && pool.slots === 4 && pool.pooled && pool.stage && pool.beneathHud && pool.transparent,
    JSON.stringify(pool));
  assert.equal(pool.aria, "true");
  assert.equal(pool.pointer, "none");
  assert.equal(pool.hidden, reduced, "the media query hides the DOM layer");
  assert.deepEqual(pool.marks.map(({ index }) => index), Array.from({ length: tier * 2 }, (_, i) => i));
  for (const mark of pool.marks) {
    const { index, box, opacity } = mark, right = index % 2, upper = index < 2;
    assert.ok(opacity >= 0 && opacity <= 0.22 + 1e-6 && mark.infinite, JSON.stringify(mark));
    near(mark.strength, strength, 0.002, "rendered resume opacity multiplier");
    assert.match(mark.ink, /linear-gradient\(.*(?:transparent|rgba\(0, 0, 0, 0\)).*rgb\(255, 243, 217\).*(?:transparent|rgba\(0, 0, 0, 0\))/);
    near(mark.height, 1, 0.01, "strip thickness");
    near(mark.width, Math.max(12, Math.min(26, width * 0.024)), 0.03, "strip length");
    near(mark.inset, width * 0.035, 0.03, "strip edge inset");
    near(mark.top, height * (upper ? 0.43 : 0.63), 0.03, "strip height on screen");
    near(mark.angle, (upper ? 12 : -18) * (right ? -1 : 1), 0.02, "outward strip angle");
    near(mark.duration, 0.85, 1e-6, "strip cycle");
    near(mark.dy, 0, 1e-6, "horizontal strip motion");
    assert.ok(mark.dx * (right ? 1 : -1) >= -0.001 && Math.abs(mark.dx) <= 6.001, JSON.stringify(mark));
    assert.ok(box.left >= 0 && box.right <= width && (right ? box.left >= width * 0.88 : box.right <= width * 0.12),
      JSON.stringify(mark));
    assert.deepEqual(mark.overlaps, [], "strips clear the PC HUD");
  }
  assert.equal(new Set(pool.marks.map(({ delay }) => delay)).size, pool.marks.length, "staggered strip phases");
}

function verifyTown(frame, previous, rest, ride, state, reduced, strength = Number(!reduced)) {
  verifyDraw(frame, "town", previous);
  assert.equal(frame.ride, ride);
  assert.equal(frame.phase, "on");
  assert.equal(frame.anim, "sit");
  assert.equal(frame.seatedVisible, !vehicles[ride].roofed);
  assert.ok(frame.probe?.active && frame.rigMode === "follow" && frame.asphalt);
  assert.equal(frame.probe.reducedMotion, reduced);
  near(frame.t - previous.t, tick / 1000, 1e-8, "60 Hz simulation");
  near(frame.probe.speed, frame.speed, 1e-9, "feedback uses post-contact speed");
  near(frame.probe.fov, frame.drawn.fov, 1e-9, "probe and draw lens");
  near(frame.dist, rest.dist, 1e-7, "no speed dolly");

  state.e = envelope(state.e, frame.speed, max, frame.t - previous.t);
  const tier = reduced ? 0 : tierAt(state.tier, state.e);
  assert.equal(frame.tierWrites - previous.tierWrites, Number(tier !== state.tier), "one DOM tier write per transition");
  state.tier = tier;
  verifyPool(frame, tier, reduced, strength);
  verifyCarAudio(frame, previous, state.e);
  const lens = frame.drawn.fov - rest.drawn.fov, amplitude = 0.0025 * state.e ** 2 * strength;
  const [x, y, z] = frame.drawn.eye, [cx, cy, cz] = frame.clean;
  assert.ok(lens >= -0.02 && lens <= 3.52 && frame.probe.shakeAmplitude >= 0 && frame.probe.shakeAmplitude <= 0.00251);
  near(lens, frame.probe.fovDelta, 0.02, "actual speed-only lens");
  near(lens, 3.5 * state.e * strength, 0.02, "linear lens from the speed envelope");
  near(frame.probe.shakeAmplitude, amplitude, 0.00001, "speed vibration amplitude");
  near(Math.hypot(x - cx, z - cz), 0, 1e-7, "no horizontal jitter");
  near(y - cy, amplitude * Math.sin(2 * Math.PI * 7 * frame.t), 0.00001, "7 Hz vertical offset in the rendered eye");
  assert.ok(distance(frame.drawn.eye, frame.clean) <= frame.probe.shakeAmplitude + 0.00001);
  near(distance(frame.drawn.rotation, frame.cleanRotation), 0, 1e-7, "speed preserves the rig quaternion");
  if (reduced) {
    assert.equal(frame.probe.fovDelta, 0);
    assert.equal(frame.probe.shakeAmplitude, 0);
    assert.equal(distance(frame.drawn.eye, frame.clean), 0);
    assert.equal(frame.rollingDust, 0);
  }
}

function verifyIdle(frame, rest) {
  assert.equal(frame.speed, 0);
  near(frame.drawn.fov, rest.drawn.fov, 0.05, "stationary lens");
  assert.equal(frame.pool.marks.length, 0);
  assert.ok(frame.probe.shakeAmplitude < 0.00002);
  assert.equal(frame.probe.windGain, 0);
  near(frame.audio.pitch?.value, 52, 0.5, "stationary native pitch");
}

function verifyNoCar(frame) {
  verifyDraw(frame, "town");
  assert.ok(frame.seatedVisible);
  assert.notEqual(frame.audio.kind, "car");
  assert.equal(frame.rollingDust, 0);
  if (frame.probe) {
    assert.equal(frame.probe.active, false);
    for (const key of ["speed", "enginePitch", "windGain", "shakeAmplitude", "fovDelta"]) assert.equal(frame.probe[key], 0, key);
    verifyPool(frame, 0, frame.reduced);
  } else assert.equal(frame.pool.containers, 0);
  near(distance(frame.drawn.eye, frame.clean), 0, 0.00001, "no car vibration");
  near(distance(frame.drawn.rotation, frame.cleanRotation), 0, 1e-7, "clean rig rotation");
  if (frame.audio.retiredMotor) verifyRelease(frame.audio.retiredMotor, 0.08, "former car gain");
  if (frame.audio.retiredWind) verifyRelease(frame.audio.retiredWind, 0.06, "former car wind");
}

function resourceDelta(start, end) {
  const known = new Set(start.programs.map(({ id }) => id));
  return {
    framebuffers: end.framebuffers - start.framebuffers, glPrograms: end.glPrograms - start.glPrograms,
    targets: end.targets - start.targets, targetUses: end.targetUses - start.targetUses,
    programs: end.programs.length - start.programs.length,
    added: end.programs.filter(({ id }) => !known.has(id)).map(({ key }) => key).sort(),
  };
}

function verifyNoResources(start, end, label) {
  assert.deepEqual(resourceDelta(start, end),
    { framebuffers: 0, glPrograms: 0, targets: 0, targetUses: 0, programs: 0, added: [] }, label);
}

function matchedDraw(a, b) {
  verifyDraw(a, "town");
  verifyDraw(b, "town");
  assert.equal(a.t, b.t);
  assert.equal(a.ride, b.ride);
  for (const key of ["pose", "viewport", "traffic", "targets"]) assert.deepEqual(a[key], b[key], key);
  for (const key of ["eye", "rotation", "projection", "view", "layers", "visibility", "calls"]) {
    assert.deepEqual(a.drawn[key], b.drawn[key], `matched render ${key}`);
  }
  assert.ok(a.drawn.visibility.length > 0);
  assert.deepEqual(a.draws.map(({ world, onScreen, calls }) => [world, onScreen, calls]),
    b.draws.map(({ world, onScreen, calls }) => [world, onScreen, calls]));
}

function encodeCalls(calls) {
  const runs = [];
  for (const count of calls) {
    if (runs.at(-1)?.[0] === count) runs.at(-1)[1]++;
    else runs.push([count, 1]);
  }
  return runs;
}

function summary(frame) {
  return {
    time: rounded(frame.t), speed: rounded(frame.road.speed ?? frame.speed),
    position: (frame.road.pose ?? frame.pose ?? frame.player).map(rounded), eye: frame.drawn?.eye.map(rounded),
    fov: frame.drawn?.fov, delta: frame.probe?.fovDelta, shake: frame.probe?.shakeAmplitude,
    dy: frame.drawn?.world === "town" ? frame.drawn.eye[1] - frame.clean[1] : undefined,
    marks: frame.pool.marks.length, pitch: frame.audio.pitch, wind: frame.audio.wind,
    dust: frame.rollingDust, calls: frame.calls, phase: frame.road.phase === "town" ? frame.phase : frame.road.phase,
    input: frame.input, follow: frame.follow,
  };
}

// Advance a second chase using the actual solver and its initial scalar history. All scratch
// vectors, corners, quaternions and framing results belong to the second chase.
function observeRoadReference() {
  const { view } = window.__ew.game.modes.get("road").mode.run;
  const chase = view.chase, authored = new chase.constructor(), authoredCamera = view.camera.clone();
  for (const key of ["yaw", "pan", "back", "widen", "lens", "tallBody"]) authored[key] = chase[key];
  const update = chase.update, settle = chase.settle;
  const capture = (cam) => ({ fov: cam.fov, eye: cam.position.toArray(), rotation: cam.quaternion.toArray() });
  chase.update = function (camera, car, distance, lift, pace, time, dt, width, height, corners, gate, amplitude) {
    authoredCamera.copy(camera, false);
    update.call(authored, authoredCamera, car, distance, lift, 0, time, dt, width, height, corners, gate, 0);
    update.call(this, camera, car, distance, lift, pace, time, dt, width, height, corners, gate, amplitude);
    window.__speedRoadReference = {
      base: capture(authoredCamera), clean: capture(camera), lens: authored.lens, mix: 1, time,
      inheritedY: view.seam?.offsetY ?? 0, inheritedFov: view.seam?.fovDelta ?? 0,
      inheritedAmplitude: view.seam?.amplitude ?? 0, remaining: gate && gate.distance - distance,
      rawBase: authoredCamera.fov,
    };
  };
  chase.settle = function (camera, start, framing, roof, corners, mix, age, width, height, startFov) {
    const ref = window.__speedRoadReference, seam = view.seam;
    settle.call(authored, authoredCamera, start, seam.cleanFraming, roof, corners, mix, age, width, height,
      start.fov - seam.fovDelta);
    settle.call(this, camera, start, framing, roof, corners, mix, age, width, height, startFov);
    ref.base = capture(authoredCamera);
    ref.clean = capture(camera);
    ref.mix = mix;
  };
  window.__speedRestoreReference = () => {
    chase.update = update;
    chase.settle = settle;
    delete window.__speedRoadReference;
    delete window.__speedRestoreReference;
  };
}

async function suite(browser, options, reduced, edition, taxiFirst = false) {
  const { viewport, hasTouch: phone, deviceScaleFactor } = options;
  const motion = reduced ? "reduce" : "no-preference", input = phone ? "touch" : "keys";
  const context = await browser.newContext({ ...options, reducedMotion: motion, serviceWorkers: "block" });
  let unholdModule;
  const moduleAllowed = new Promise((resolve) => { unholdModule = resolve; });
  const errors = [], requests = [], trace = [];
  let learner, car = "on-foot", checkpoint = "navigation", last, preference = motion;
  const label = (at = checkpoint) => `pc-${learner ?? "undetected"}-${storage} ${viewport.width}x${viewport.height}@${deviceScaleFactor} ${input} ${motion} live-${preference} ${car} ${at}`;
  const checkErrors = () => assert.deepEqual(errors, [], label());
  const page = await context.newPage();
  try {
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const cdp = phone && await context.newCDPSession(page);
    page.on("pageerror", (error) => errors.push({ type: "pageerror", text: error.message, source: error.stack }));
    page.on("console", (message) => {
      const text = message.text();
      if (!["error", "warning"].includes(message.type())) return;
      if (/^\[audio\] Missing clip: [\w./%+-]+\.mp3$/.test(text)
        || /^THREE\.Clock: This module has been deprecated\. Please use THREE\.Timer instead\.$/.test(text)) return;
      errors.push({ type: message.type(), text, source: message.location() });
    });
    page.on("request", (request) => {
      const { pathname } = new URL(request.url());
      if (speedAsset.test(pathname) || roadAsset.test(pathname)) requests.push({ pathname, checkpoint });
    });
    await context.route("**/*", async (route) => {
      const request = new URL(route.request().url());
      if (request.protocol === "data:" || request.protocol === "blob:") return route.continue();
      if (request.origin !== url.origin) {
        errors.push({ type: "external request", source: request.origin + request.pathname });
        return route.abort();
      }
      if (speedJs.test(request.pathname)) await moduleAllowed;
      if (/\.mp3$/i.test(request.pathname)) return route.fulfill({ status: 204, body: "" });
      return route.continue();
    });
    const progress = taxiFirst ? { ...save, place: taxiStandStart, settings: { ...save.settings, quality: "high" } } : save;
    await page.addInitScript(installClock, { key: `${storage}-progress-v1`, save: progress, seed, taxiFirst });
    await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 120_000 });
    const identity = await page.evaluate(() => ({ lang: document.documentElement.lang, title: document.title, origin: location.origin }));
    learner = identity.lang;
    assert.ok(["en", "lt"].includes(learner), JSON.stringify(identity));
    assert.equal(identity.title, "Puerto Colibrí");
    assert.equal(identity.origin, url.origin);
    if (requested) assert.equal(learner, requested, "WORLD_LEARNER asserts the shipped bundle");
    if (edition) assert.equal(learner, edition, "all contexts opened the same bundle");

    const read = () => page.evaluate(() => window.__speedTest.read());
    const roadState = () => page.evaluate(() => window.__ew.road.state());
    const resources = () => page.evaluate(() => window.__speedTest.resources());
    const fail = (message) => assert.fail(`${label()}: ${message}\n${JSON.stringify(last && {
      ...summary(last), road: last.road, ride: last.ride, hit: last.hit, contact: last.contact, traffic: last.traffic,
    })}`);
    async function step(ms = tick) {
      last = await page.evaluate((ms) => window.__speedTest.step(1, ms), ms);
      trace.push({ checkpoint, preference, car, ...summary(last), taxi: last.taxi, road: last.road, hit: last.hit, contact: last.contact });
      if (trace.length > 180) trace.shift();
      checkErrors();
      return last;
    }
    async function ready(predicate, name, frames = 1, value) {
      checkpoint = name;
      const end = Date.now() + 120_000;
      do {
        checkErrors();
        if (await page.evaluate(predicate, value)) return;
        if (frames) await page.evaluate(([n, dt]) => window.__step(n, dt), [frames, tick]);
        await page.evaluate(() => new Promise((resolve) => setTimeout(resolve, 0)));
      } while (Date.now() < end);
      last = await read().catch(() => last);
      fail("readiness timed out");
    }
    function log(name, data) {
      console.log("speed-feel", label(name), JSON.stringify(data));
    }
    async function note(name, frame) {
      checkpoint = name;
      log(name, frame.taxi ? { ...summary(frame), taxi: frame.taxi, mode: frame.rigMode, base: frame.base } : summary(frame));
      if (shots) await page.screenshot({ path: join(shots, `speed-feel-${safeName(label(name))}.png`), timeout: 15_000 });
    }
    const press = (selector) => phone ? page.locator(selector).tap() : page.locator(selector).click();
    const setMotion = async (value) => {
      preference = value;
      await page.emulateMedia({ reducedMotion: value });
      assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), value === "reduce");
    };
    async function touch(selector, forward, reverse = false) {
      const box = await page.locator(selector).boundingBox();
      assert.ok(box, selector);
      const center = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [center] });
      if (forward) {
        const moved = { ...center, y: center.y + (reverse ? 68 : -68) };
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [moved] });
      }
      assert.ok(await page.evaluate((selector) => {
        const event = window.__speedInput.pointer;
        const control = document.querySelector(selector);
        return event?.trusted && event.type === "touch" && control.hasPointerCapture(event.id);
      }, selector), `trusted ${selector} input`);
    }
    const releaseTouch = () => cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const go = (on, reverse = false) => phone ? (on ? touch(".joy", true, reverse) : releaseTouch())
      : page.keyboard[on ? "down" : "up"](reverse ? "s" : "w");
    async function brake(on) {
      if (!phone) return page.keyboard[on ? "down" : "up"]("Space");
      if (!on) return releaseTouch();
      const control = page.locator(".brake-btn");
      assert.equal(await control.getAttribute("aria-label"), learner === "en" ? "Brake" : "Stabdyti");
      assert.equal((await control.innerText()).trim(), "STOP");
      await touch(".brake-btn", false);
    }
    const localized = {
      drive: { en: "Drive", lt: "Vairuoti" }, out: { en: "Get out", lt: "Išlipti" }, boat: { en: "Sail", lt: "Plaukti" },
    };
    async function interact(kind) {
      if (phone) {
        const button = page.locator(".act-btn");
        await button.waitFor({ state: "visible" });
        assert.equal((await button.innerText()).trim(), localized[kind][learner]);
        await button.tap();
        assert.ok(await page.evaluate(() => window.__speedInput.click));
      } else {
        await page.keyboard.press("e");
        assert.equal(await page.evaluate(() => window.__speedInput.key), "e");
      }
    }
    async function board(id, { cold = false, tag = id } = {}) {
      car = tag;
      checkpoint = "real-door";
      checkErrors();
      if (id === "park") {
        await ready(() => window.__ew.game.rides.find("park").owners.every(({ state }) =>
          state !== "hop-in" && state !== "hop-out"), "owner-clear-of-door");
      }
      const home = await page.evaluate((id) => {
        const { game } = window.__ew, { rides, rig } = game;
        const ride = rides.find(id);
        if (!ride) throw new Error(`Missing Puerto Colibrí ride ${id}`);
        const { x, z, heading: rot, spec } = ride.m;
        const sides = [1, -1].map((side) => {
          const reach = side * (spec.wide + 0.7);
          return { x: x + Math.cos(rot) * reach, z: z - Math.sin(rot) * reach, rot };
        });
        if (ride.kind === "boat") {
          for (let a = 0; a < 6.3; a += 0.2) {
            for (const d of [2.4, 2.9, 3.3]) sides.push({ x: x + Math.cos(a) * d, z: z + Math.sin(a) * d, rot });
          }
        }
        const door = sides.find(({ x, z }) => game.town.walkableAt(x, z) && rides.near(x, z) === ride);
        if (!door) throw new Error(`No usable door or dock for ${id}`);
        game.enterZone("town", door, true);
        rig.yaw = rot;
        rig.snap();
        window.__speedRide = ride;
        return { kind: ride.kind, model: ride.model ?? (ride.kind === "car" ? "convertible" : "boat"),
          owners: ride.owners.map((owner) => owner.who.id), tint: ride.tint, roofed: rides.roofed(ride),
          registered: rides.modeCars.has(ride), parking: { x, z, rot } };
      }, id);
      const expected = vehicles[id];
      for (const key of ["kind", "model", "roofed", "owners"]) assert.deepEqual(home[key], expected[key], key);
      if (expected.tint) assert.equal(home.tint, expected.tint);
      if (id === "parked-0") assert.equal(home.registered, true);
      for (const key of ["x", "z", "rot"]) near(home.parking[key], expected.parking[key], 0.001, `${id} parking ${key}`);

      const kind = expected.kind === "car" ? "drive" : "boat";
      await ready(() => {
        const { store, game } = window.__ew, p = game.player.root.position;
        const kind = window.__speedRide.kind === "car" ? "drive" : "boat";
        return store.getState().hud.prompt?.kind === kind && game.rides.near(p.x, p.z) === window.__speedRide;
      }, "board-prompt");
      assert.ok(await page.evaluate(() => window.__ew.audio.context() !== null));
      checkErrors();
      if (cold) assert.deepEqual(requests, [], "ride imports are still deferred at the real door");
      checkpoint = "accepted-board";
      await interact(kind);
      assert.ok(await page.evaluate(() => {
        const { rides } = window.__ew.game;
        return rides.riding === window.__speedRide && (rides.phase === "in" || rides.phase === "launch");
      }), "trusted action enters the real boarding phase");
      await ready(() => {
        const { game, audio } = window.__ew;
        return game.rides.riding === window.__speedRide && game.rides.phase === "on" && audio.ctx?.state === "running";
      }, "seated-audio-unlocked");
      if (expected.kind === "car") {
        await ready(() => {
          const { requested, ready } = window.__ew.road.state();
          return requested && ready;
        }, "road-prepared");
        if (!cold) await ready(() => window.__speedFeel?.active, "feedback-active");
      }
      const seated = await step();
      assert.equal(seated.ride, id);
      assert.equal(seated.phase, "on");
      assert.equal(seated.anim, "sit");
      assert.equal(seated.seatedVisible, !expected.roofed);
      if (id === "park") assert.ok(await page.evaluate(() => window.__speedRide.owners.every((owner) => owner.state !== "in")));
      await note("seated", seated);
    }
    async function reset(pose) {
      await page.evaluate((pose) => {
        const { game } = window.__ew, ride = window.__speedRide;
        if (game.rides.riding !== ride || game.rides.phase !== "on") throw new Error("staging requires the occupied ride");
        game.rides.resetPosition(ride, pose);
        game.rideCourse = game.rig.yaw = pose.rot;
        game.rig.target.set(pose.x, 0, pose.z);
        game.rig.snap();
      }, pose);
    }

    const restoreParking = (id) => page.evaluate((parking) => {
      window.__ew.game.rides.resetPosition(window.__speedRide, parking);
    }, vehicles[id].parking);

    async function exit(id) {
      await ready(() => window.__ew.store.getState().hud.prompt?.kind === "out", "exit-prompt");
      const before = await read();
      await interact("out");
      const exiting = await step();
      assert.equal(exiting.phase, "out");
      assert.equal(exiting.seatedVisible, true, "visible immediately on exiting");
      await ready(() => !window.__ew.game.rides.riding, "on-foot-after-exit");
      const out = await step();
      assert.ok(!out.ride && !out.audio.kind && !out.audio.pitch && !out.audio.wind);
      verifyNoCar(out);
      if (id !== "muelle") {
        const reach = await page.evaluate(() => {
          const { rides, player } = window.__ew.game, { x, z } = player.root.position;
          return rides.reach(window.__speedRide, x, z);
        });
        assert.ok(reach > 0.3 && reach < 2.5, `dismount beside ${id}: ${reach}`);
        near(out.drawn.fov, out.base, 0.05, "neutral on-foot lens");
        verifyRelease(out.audio.retiredMotor, 0.08, "dismount releases the car motor");
      }
      assert.equal(out.eligible, eligible);
      assert.ok(out.traffic.some(({ x }, i) => Math.abs(x - before.traffic[i].x) > 0.1), "traffic continues during dismount");
      await note("exit", out);
      await restoreParking(id);
    }

    async function settleStraight() {
      checkpoint = "stage-calle-uxmal";
      await reset(straight);
      for (let i = 0; i < 144; i++) {
        const frame = await step();
        verifyDraw(frame, "town");
        if (reduced) {
          assert.equal(frame.probe.shakeAmplitude, 0);
          assert.equal(frame.rollingDust, 0);
          verifyPool(frame, 0, true);
        }
        if (i < 36 || frame.jolt < 0.42 || frame.speed !== 0 || Math.abs(frame.drawn.fov - frame.base) >= 0.01
          || frame.probe.fovDelta !== 0 || frame.audio.pitch?.value !== 52 || frame.audio.wind) continue;
        assert.equal(frame.max, max);
        assert.ok(frame.asphalt && frame.phase === "on");
        if (phone) near(frame.drawn.fov, 50, 0.05, "upright follow lens");
        near(frame.pose[0], straight.x, 0.001, "Calle Uxmal x");
        near(frame.pose[2], straight.z, 0.001, "Calle Uxmal z");
        verifyIdle(frame, frame);
        verifyCarAudio(frame, undefined, 0);
        verifyPool(frame, 0, reduced);
        return frame;
      }
      fail("stationary framing did not settle");
    }

    async function coldMount(startup) {
      checkpoint = "cold-mount-prepare";
      await reset(straight);
      for (let i = 0; i < 45; i++) await step();
      assert.ok(last.road.ready && !last.probe && last.pool.containers === 0);
      assert.equal(last.carStats.loadedCarModels, 9);
      assert.ok(requests.some(({ pathname }) => speedJs.test(pathname)));
      assert.ok(requests.some(({ pathname }) => roadAsset.test(pathname)));
      const prepared = await resources();
      await page.evaluate(() => { window.__speedUnpin = window.__speedTest.pinTown(); });
      let control, mounted, mountedResources;
      try {
        checkpoint = "cold-mount-control";
        control = await step(0);
        const controlResources = await resources();
        unholdModule();
        await ready(() => !!window.__speedFeel && !!document.querySelector(".speed-feel"), "mounts-after-accepted-car", 0);
        mounted = await step(0);
        mountedResources = await resources();
        assert.equal(control.pool.containers, 0);
        assert.ok(mounted.probe.active);
        verifyPool(mounted, 0, reduced);
        matchedDraw(control, mounted);
        verifyNoResources(controlResources, mountedResources, "mount adds no GPU resource over the prepared control");
        log("gpu-cold-mount", {
          startup, prepared, control: controlResources, mounted: mountedResources,
          warmupDelta: resourceDelta(startup, prepared), mountDelta: resourceDelta(controlResources, mountedResources),
          drawCalls: [control.calls, mounted.calls], requests,
        });
      } finally {
        await page.evaluate(() => { window.__speedUnpin(); delete window.__speedUnpin; });
      }
      await note("pool-mounted", mounted);
    }

    async function stopAtWheel(top, rest, id, state) {
      checkpoint = "held-brake";
      await brake(true);
      let previous = top, braking, stopped, standstill;
      const tiers = [top.pool.marks.length], calls = [];
      try {
        for (let i = 0; i < 215; i++) {
          const frame = await step();
          verifyTown(frame, previous, rest, id, state, reduced);
          calls.push(frame.calls);
          assert.ok(frame.input.brake, "held brake reaches game driving input");
          assert.ok(frame.speed <= previous.speed + 0.02, "braking slows the car");
          if (!reduced) assert.ok(Math.abs(frame.drawn.fov - previous.drawn.fov) <= 0.28);
          if (frame.pool.marks.length !== tiers.at(-1)) tiers.push(frame.pool.marks.length);
          if (!braking && frame.speed > 2 && frame.speed < top.speed - 1
            && frame.probe.enginePitch > 53 && frame.probe.enginePitch < top.probe.enginePitch
            && frame.probe.windGain > 0 && frame.probe.windGain < top.probe.windGain
            && (reduced || (frame.probe.fovDelta > 0.1 && frame.probe.fovDelta < top.probe.fovDelta
              && frame.probe.shakeAmplitude > 0 && frame.probe.shakeAmplitude < top.probe.shakeAmplitude))) {
            braking = frame;
            await note("braking", frame);
          }
          if (frame.speed === 0) {
            standstill ??= frame.t;
            if (frame.probe.fovDelta < 0.05 && frame.probe.shakeAmplitude < 0.00002 && frame.pool.marks.length === 0
              && frame.probe.windGain === 0 && Math.abs(frame.audio.pitch.value - 52) <= 0.5) {
              stopped = frame;
              break;
            }
            assert.ok(frame.t - standstill < 2.4, "feedback settles within 2.4 s of standstill");
          }
          previous = frame;
        }
      } finally {
        await brake(false);
      }
      if (!braking || !stopped) fail("missing moving-brake or stopped checkpoint");
      assert.ok(stopped.t - standstill <= 2.4);
      assert.deepEqual(tiers, reduced ? [0] : [4, 2, 0]);
      verifyIdle(stopped, rest);
      await note("stopped", stopped);
      return calls;
    }

    async function drive(id, dented = false) {
      const rest = await settleStraight();
      assert.equal(rest.eligible, eligible);
      if (dented) assert.ok(rest.damage?.dentCount > 0);
      await note("rest", rest);
      const prepared = await resources();
      const state = { e: 0, tier: 0 };
      const painted = new Set(), calls = [], tiers = [0];
      let previous = rest, crawl, mid, top, topSince, activation, activationFrame, peak = 0;
      checkpoint = "straight-accelerating";
      await go(true);
      try {
        for (let i = 0; i < 440; i++) {
          const frame = await step();
          verifyTown(frame, previous, rest, id, state, reduced);
          calls.push(frame.calls);
          assert.ok(frame.input.y > 0.99 && Math.abs(frame.input.x) < 0.01 && !frame.input.brake, "trusted straight input reaches physics");
          if (!reduced) assert.ok(Math.abs(frame.drawn.fov - previous.drawn.fov) <= 0.28, "adjacent straight lenses");
          if (dented) assert.ok(frame.damage?.dentCount > 0, "same occupied car retains its dent");
          if (frame.pool.marks.length !== tiers.at(-1)) tiers.push(frame.pool.marks.length);
          if (!crawl && frame.speed >= 2.75 && frame.speed <= 3) {
            crawl = frame;
            await note("crawl", frame);
          }
          if (!mid && frame.speed >= 11.75 && frame.speed <= 12 && (reduced || frame.pool.marks.length === 2)) {
            mid = frame;
            await note("mid", frame);
          }
          if (!activation && frame.pool.marks.length === 2) {
            activationFrame = calls.length;
            activation = await resources();
          }
          if (frame.speed >= 14.88 - 1e-9) {
            topSince ??= frame.t;
            peak = Math.max(peak, distance(frame.drawn.eye, frame.clean));
            for (const mark of frame.pool.marks) if (mark.painted) painted.add(mark.index);
            if (frame.t - topSince >= 0.65 - 1e-9) {
              top = frame;
              await note("top", frame);
              break;
            }
          } else {
            topSince = undefined;
            painted.clear();
            peak = 0;
          }
          previous = frame;
        }
      } finally {
        await go(false);
      }
      if (!crawl || !mid || !top) fail("missing continuous crawl, mid, or sustained top speed");
      assert.ok(rest.pose[0] - top.pose[0] > 25 && Math.abs(rest.pose[2] - top.pose[2]) < 1, "sustained westward movement");
      assert.ok(top.traffic.some(({ x }, i) => Math.abs(x - rest.traffic[i].x) > 0.1));
      function rising(key, gain = 0) {
        assert.ok(crawl.probe[key] < mid.probe[key] && mid.probe[key] < top.probe[key], `${key} increases with speed`);
        assert.ok(top.probe[key] - crawl.probe[key] > gain, `${key} advances by > ${gain}`);
      }
      rising("enginePitch", 40);
      rising("windGain", 0.010);
      assert.deepEqual(tiers, reduced ? [0] : [0, 2, 4]);
      assert.deepEqual([crawl, mid, top].map(({ pool }) => pool.marks.length), reduced ? [0, 0, 0] : [0, 2, 4]);
      if (!reduced) {
        rising("fov", 2.5);
        rising("shakeAmplitude");
        assert.ok(peak > 0.001 && peak <= 0.00251, `measured vibration ${peak} m`);
        assert.equal(painted.size, 4, "all four rendered strips paint during the top hold");
        verifyNoResources(prepared, activation, "first tier adds no WebGL resources");
      }
      const atTop = await resources();
      verifyNoResources(prepared, atTop, "unmodified straight adds no WebGL resources");
      const slowing = await stopAtWheel(top, rest, id, state);
      log("gpu-unaltered", { calls: encodeCalls(calls), braking: encodeCalls(slowing), activationFrame, peak,
        firstTierDelta: activation && resourceDelta(prepared, activation), topDelta: resourceDelta(prepared, atTop) });
    }

    async function damage() {
      checkpoint = "brotecito-west-wall";
      await reset(wall);
      const start = await step();
      assert.ok(!start.damage?.dentCount, "collision starts with the intact sedan");
      let previous = start, impact, e = 0;
      await go(true);
      try {
        for (let i = 0; i < 195; i++) {
          const frame = await step();
          verifyDraw(frame, "town", previous);
          assert.equal(frame.ride, "parked-0");
          assert.equal(frame.phase, "on");
          e = envelope(e, frame.speed, max, frame.t - previous.t);
          verifyCarAudio(frame, previous, e);
          near(frame.probe.speed, frame.speed, 1e-9, "wall approach uses post-contact pace");
          if (reduced) {
            near(frame.drawn.fov, start.base, 0.05, "reduced impact lens");
            assert.equal(frame.probe.shakeAmplitude, 0);
            assert.equal(frame.rollingDust, 0);
            verifyPool(frame, 0, true);
            const jolt = Math.cos(frame.jolt * 47) * 0.12 * Math.max(0, 1 - frame.jolt / 0.42) ** 2 * frame.joltStrength;
            const [x, y, z] = frame.clean;
            near(distance(frame.drawn.eye, [x, y + jolt, z]), 0, 0.00001, "authored collision jolt survives reduced motion");
          }
          if (frame.damage?.dentCount > 0) {
            impact = frame;
            break;
          }
          previous = frame;
        }
      } finally {
        await go(false);
      }
      if (!impact) fail("the real Brotecito impact made no dent");
      assert.ok(impact.hit?.id === "parked-0" && impact.hit.target === "town" && impact.hit.k > 0.3, JSON.stringify(impact.hit));
      const wallContact = impact.contact.find(({ target }) => target === "town");
      assert.ok(wallContact && Math.abs(wallContact.x - 137) < 2, JSON.stringify(impact.contact));
      await note("damage", impact);
    }

    async function boat(tag) {
      await board("muelle", { tag });
      const atMooring = await step();
      let previous = atMooring, fast;
      const baseline = atMooring.dist / (1 + atMooring.boatBack);
      checkpoint = "boat-native-motor-helm";
      await go(true);
      try {
        for (let i = 0; i < 260; i++) {
          const frame = await step();
          verifyNoCar(frame);
          assert.ok(frame.ride === "muelle" && frame.phase === "on" && frame.input.y > 0.99);
          assert.ok(frame.audio.kind === "boat" && frame.audio.motorConnected && frame.audio.motorGain?.value > 0);
          assert.equal(frame.helm, Boolean(phone));
          verifyTarget(frame.audio.pitch, 34 + 26 * clamp(frame.revs), 0.08, frame.audio.time, previous.audio.pitch, "boat motor");
          assert.ok(frame.audio.pitch.value >= 34 && frame.audio.pitch.value <= 60);
          const slip = clamp((Math.abs(frame.slip) - 1.2) / 4.5);
          const level = Math.max(0, (frame.speed - 6) / (frame.max - 3)) * 0.8 + slip * 0.5;
          if (level > 0.01) {
            assert.ok(frame.audio.windConnected);
            verifyTarget(frame.audio.wind, 0.035 * clamp(level), 0.06, frame.audio.time, previous.audio.wind, "boat hull wind");
            verifyTarget(frame.audio.tone, 260 + 900 * clamp(frame.speed / 16), 0.07, frame.audio.time, previous.audio.tone, "boat wind filter");
          } else assert.equal(frame.audio.wind, undefined);
          near(frame.dist, baseline * (1 + frame.boatBack), 1e-7, "boat keeps its authored camera arm");
          const fov = frame.boatBase + frame.boatLens, d = fov - previous.drawn.fov;
          near(frame.drawn.fov, Math.abs(d) < 0.05 ? fov : previous.drawn.fov + d * 0.05, 1e-7, "boat keeps its authored lens");
          previous = frame;
          if (frame.pose[2] < -77.4 && distance(frame.pose.slice(0, 3), atMooring.pose.slice(0, 3)) > 5
            && frame.speed > 6.7 && frame.audio.wind?.value > 0 && frame.boatLens > 0.05 && frame.boatBack > 0) {
            fast = frame;
            break;
          }
        }
      } finally {
        await go(false);
      }
      if (!fast) fail("muelle did not reach its own wind and moving helm");
      await note("boat-moving", fast);
      await brake(true);
      try {
        for (let i = 0; i < 135 && last.speed > 0.2; i++) await step();
        assert.ok(last.speed <= 0.2);
      } finally {
        await brake(false);
      }
      await exit("muelle");
    }

    async function compareMotionDraws(checkpointName) {
      const before = await resources();
      await page.evaluate(() => { window.__speedUnpin = window.__speedTest.pinTown(); });
      let normal, quiet;
      try {
        checkpoint = checkpointName;
        normal = await step(0);
        await setMotion("reduce");
        quiet = await step(0);
        matchedDraw(normal, quiet);
        assert.ok(normal.pool.marks.length > 0);
        verifyPool(quiet, 0, true);
        near(quiet.audio.pitch.value, normal.audio.pitch.value, 1e-9, "same pitch in the paired draw");
        near(quiet.audio.wind.value, normal.audio.wind.value, 1e-9, "same wind in the paired draw");
        const after = await resources();
        verifyNoResources(before, after, "motion pairing adds no GPU resources");
        log(checkpointName, { calls: [normal.calls, quiet.calls], passes: [normal.draws.length, quiet.draws.length],
          resourceDelta: resourceDelta(before, after) });
      } finally {
        await page.evaluate(() => { window.__speedUnpin(); delete window.__speedUnpin; });
        await setMotion("no-preference");
      }
      return quiet;
    }

    async function livePreference(follow) {
      await board("park", { tag: follow ? "park-live-follow" : "park-live-follow-off" });
      await page.evaluate((follow) => window.__ew.store.getState().setSettings({ cameraFollow: follow }), follow);
      try {
        const rest = await settleStraight();
        const state = { e: 0, tier: 0 };
        let previous = rest, matchedFirst = false, atTop = false, resumeFrames = 21;
        async function advance(reduce = false) {
          const frame = await step();
          assert.equal(frame.follow, follow);
          if (!reduce) resumeFrames++;
          const strength = reduce ? 0 : smooth(Math.min(1, resumeFrames / 21));
          verifyTown(frame, previous, rest, "park", state, reduce, strength);
          previous = frame;
          return frame;
        }
        const pair = async (name) => {
          previous = await compareMotionDraws(name);
          state.tier = 0;
          resumeFrames = 0;
        };
        const resume = async () => {
          resumeFrames = 0;
          for (let i = 1; i <= 21; i++) {
            checkpoint = `toggle-resume-${i}`;
            const frame = await advance();
            if (i === 1) {
              assert.ok(frame.probe.fovDelta > 0 && frame.probe.fovDelta < 0.1);
              await note("toggle-first", frame);
            }
          }
          assert.ok(previous.probe.fovDelta > 3);
          await note("toggle-restored", previous);
        };
        await go(true);
        try {
          checkpoint = "toggle-accelerating";
          for (let i = 0; i < 440; i++) {
            const frame = await advance();
            if (!matchedFirst && frame.pool.marks.length === 2) {
              await pair("gpu-paired-first-tier");
              matchedFirst = true;
            }
            if (matchedFirst && resumeFrames >= 21 && frame.speed >= 14.88 && frame.probe.fovDelta > 3) {
              atTop = true;
              break;
            }
          }
          if (!atTop) fail("live pass missed the first tier or top speed");
          const hot = previous;
          await note("toggle-normal-top", hot);
          await setMotion("reduce");
          checkpoint = "toggle-next-draw";
          const quiet = await advance(true);
          assert.ok(quiet.speed >= 14.88 && quiet.audio.pitch.value > 105 && quiet.audio.wind.value > 0.02);
          near(quiet.audio.pitch.value, hot.audio.pitch.value, 1, "engine continues under reduction");
          near(quiet.audio.wind.value, hot.audio.wind.value, 0.001, "wind continues under reduction");
          await note("toggle-reduced-top", quiet);
          await setMotion("no-preference");
          await resume();
          await pair("gpu-paired-top");
          for (let i = 1; i <= 21; i++) {
            checkpoint = `gpu-paired-top-resume-${i}`;
            await advance();
          }
        } finally {
          await go(false);
        }
        await stopAtWheel(previous, rest, "park", state);
        await exit("park");
      } finally {
        await setMotion(motion);
        await page.evaluate(() => window.__ew.store.getState().setSettings({ cameraFollow: true }));
      }
    }

    async function rollingDust() {
      await board("parked-0", { tag: "parked-0-rolling-dust" });
      checkpoint = "dry-ground-dust-stage";
      await page.evaluate(() => {
        window.__ew.store.getState().setSettings({ quality: "high" });
        window.__ew.game.setQuality("high");
      });
      try {
        const pose = await page.evaluate(() => {
          const { game } = window.__ew, ride = window.__speedRide, { rides } = game;
          // Pick one dry, unobstructed strip beside Calle Uxmal before driving it.
          for (const z of [83, 85, 87, 67, 65, 89, 63]) {
            for (const x of [110, 100, 90, 80, 60, 50, 40]) {
              let clear = true;
              for (let d = 0; d <= 16 && clear; d += 1) {
                clear = [-1, 0, 1].every((offset) => !rides.asphalt.has(x - d, z + offset))
                  && rides.fits(ride, x - d, z, -Math.PI / 2, 0.4);
              }
              if (clear) return { x, z, rot: -Math.PI / 2 };
            }
          }
          return null;
        });
        assert.ok(pose, "a dry grass strip for the high-quality rolling-dust control");
        await reset(pose);
        for (let i = 0; i < 36; i++) await step();
        let measured, moving = 0;
        checkpoint = "high-quality-rolling-dust";
        await go(true);
        try {
          for (let i = 0; i < 115; i++) {
            const frame = await step();
            verifyDraw(frame, "town");
            assert.equal(frame.ride, "parked-0");
            assert.equal(frame.asphalt, false);
            if (reduced) assert.equal(frame.rollingDust, 0);
            if (frame.speed > 3.5) {
              moving++;
              if (reduced ? moving >= 20 : frame.rollingDust > 0) {
                measured = frame;
                break;
              }
            }
          }
          if (!measured) fail("did not exercise high-quality rolling dust on the dry strip");
          await note("rolling-dust", measured);
          if (!reduced) {
            await setMotion("reduce");
            checkpoint = "rolling-dust-reduced-next-draw";
            const quiet = await step();
            verifyDraw(quiet, "town", measured);
            assert.ok(quiet.speed > 3.5 && quiet.asphalt === false);
            assert.equal(quiet.rollingDust, 0, "first reduced draw clears moving dust");
            verifyPool(quiet, 0, true);
            await note("rolling-dust-opt-out", quiet);
          }
        } finally {
          await go(false);
        }
        await brake(true);
        try {
          for (let i = 0; i < 90 && last.speed > 0; i++) await step();
          assert.equal(last.speed, 0);
        } finally {
          await brake(false);
        }
        await setMotion(motion);
        await exit("parked-0");
      } finally {
        await page.evaluate(() => {
          window.__ew.store.getState().setSettings({ quality: "low" });
          window.__ew.game.setQuality("low");
        });
      }
    }

    async function crest(frozen = false) {
      await board("park", { tag: frozen ? "park-frozen-crest" : "park-road" });
      const edge = (await roadState()).exit;
      near(edge.outward, 0, 0.01, "signed PC road runs toward +Z");
      near(edge.z, 93.7, 0.01, "Calle Ceiba entry");
      await reset(lane);
      checkpoint = "stage-calle-ceiba";
      for (let i = 0; i < 40; i++) verifyDraw(await step(), "town");
      const rest = last;
      let previous = rest, first, powered = false, widened = false;
      checkpoint = "signed-powered-edge";
      await go(true);
      try {
        for (let i = 0; i < 475; i++) {
          const frame = await step(), reached = frame.road.phase === "briefing";
          verifyDraw(frame, reached ? "road" : "town", previous);
          assert.equal(frame.ride, "park");
          if (reached) {
            assert.equal(frame.road.elapsed, 0);
            assert.ok(frame.road.ready && frame.calls <= cap && !frame.loading && frame.fade < 0.01);
            first = frame;
            break;
          }
          assert.ok(frame.road.requested && frame.road.ready);
          assert.ok(frame.input.y > 0.99 && Math.abs(frame.input.x) < 0.01 && !frame.input.brake);
          powered ||= frame.road.onStrip && frame.road.outwardIntent && frame.road.exitDistance >= 0 && frame.speed > 1;
          widened ||= frame.speed > 0.86 * max && frame.drawn.fov > rest.drawn.fov + 1.5;
          if (reduced) {
            near(frame.drawn.fov, rest.drawn.fov, 0.05, "reduced approach keeps the authored lens");
            near(frame.dist, rest.dist, 1e-7, "reduced approach has no speed dolly");
            assert.equal(frame.probe.shakeAmplitude, 0);
            assert.equal(frame.rollingDust, 0);
            verifyPool(frame, 0, true);
          }
          previous = frame;
        }
      } finally {
        await go(false);
      }
      if (!first) fail("did not cross the prepared signed edge once on the clear lane");
      const state = await roadState();
      assert.ok(powered && previous.road.exitDistance < 32 && first.road.exitDistance >= 31.999
        && first.road.exitDistance < 32.3 && first.speed > 1,
      JSON.stringify({ lane, before: previous.road, first: first.road }));
      assert.ok(reduced || widened, "the powered town approach opens the actual lens");
      assert.equal(state.car, "park");
      assertRoadContinuity(state);
      near(first.probe.fov, first.drawn.fov, 1e-9, "crest owns actual drawn lens");
      near(first.drawn.fov - rest.drawn.fov, first.probe.fovDelta, 0.05, "crest retains just the inherited lens delta");
      assert.ok(first.probe.fovDelta >= 0 && first.probe.fovDelta <= 3.52);
      assert.equal(first.probe.active, false);
      assert.equal(first.probe.enginePitch, 0);
      assert.equal(first.probe.windGain, 0);
      assert.equal(first.audio.kind, undefined);
      verifyRelease(first.audio.retiredMotor, 0.08, "town motor releases at the crest");
      if (previous.audio.wind) verifyRelease(first.audio.retiredWind, 0.06, "town wind releases at the crest");
      verifyPool(first, 0, reduced);
      if (reduced) {
        assert.equal(first.probe.fovDelta, 0);
        assert.equal(first.probe.shakeAmplitude, 0);
      }
      await note("crest", first);
      return { first, previous, rest };
    }

    async function frozenCrest() {
      const { first, previous, rest } = await crest(true);
      const original = first.drawn, lastTown = first.townCamera;
      const inheritedY = previous.drawn.eye[1] - previous.clean[1];
      assert.ok(first.probe.fovDelta > 1.5 && first.probe.shakeAmplitude > 0.001);
      await note("crest-before-opt-out", first);
      await setMotion("reduce");
      checkpoint = "frozen-reduced-next-draw";
      const quiet = await step(0);
      verifyDraw(quiet, "road", first);
      assert.ok(quiet.calls <= cap && !quiet.loading && quiet.fade < 0.01);
      assert.equal(quiet.t, first.t);
      assert.equal(quiet.road.elapsed, 0);
      assert.equal(quiet.road.position, 0);
      assert.deepEqual(quiet.road.pose, first.road.pose);
      assert.deepEqual(quiet.drawn.rotation, original.rotation);
      assert.deepEqual(quiet.drawn.view, original.view);
      near(quiet.drawn.fov, rest.drawn.fov, 0.05, "next frozen draw uses the authored lens");
      near(quiet.townCamera.fov, quiet.drawn.fov, 1e-9, "the town and road reference lenses agree");
      near(quiet.townCamera.eye[1] - lastTown.eye[1], -inheritedY, 1e-7, "town reference removes inherited shake");
      near(quiet.drawn.eye[1] - original.eye[1], -inheritedY, 1e-7, "frozen road removes inherited shake");
      near(distance(quiet.drawn.eye, [original.eye[0], quiet.drawn.eye[1], original.eye[2]]),
        0, 1e-7, "frozen road keeps the horizontal camera position");
      assert.equal(quiet.probe.fovDelta, 0);
      assert.equal(quiet.probe.shakeAmplitude, 0);
      verifyPool(quiet, 0, true);
      await note("crest-opt-out", quiet);

      await setMotion("no-preference");
      checkpoint = "frozen-opt-in-next-draw";
      const resumed = await step(0);
      verifyDraw(resumed, "road", quiet);
      assert.ok(resumed.calls <= cap && !resumed.loading && resumed.fade < 0.01);
      assert.equal(resumed.t, quiet.t);
      assert.equal(resumed.road.elapsed, 0);
      assert.equal(resumed.road.position, 0);
      assert.deepEqual(resumed.road.pose, quiet.road.pose);
      assert.deepEqual(resumed.camera, quiet.camera);
      assert.deepEqual(resumed.townCamera, quiet.townCamera);
      assert.equal(resumed.probe.fovDelta, 0);
      assert.equal(resumed.probe.shakeAmplitude, 0);
      verifyPool(resumed, 0, false);
      await note("crest-opt-in", resumed);
      await returnFromRoad(".road-overlay .word-gate-start button.btn.soft", false);
    }

    async function returnFromRoad(home, hadWind) {
      checkpoint = "road-home";
      await page.locator(home).waitFor({ state: "visible" });
      const name = (await page.locator(home).getAttribute("aria-label")) ?? (await page.locator(home).innerText()).trim();
      assert.equal(name, learner === "en" ? "Back to town" : "Atgal į miestą");
      await press(home);
      const released = await read();
      assert.equal(released.audio.kind, undefined);
      verifyRelease(released.audio.retiredMotor, 0.08, "home releases the former road car motor");
      if (hadWind) verifyRelease(released.audio.retiredWind, 0.06, "home releases road wind");
      await ready(() => window.__ew.road.state().phase === "town" && !document.querySelector(".road-header"), "road-return");
      const returned = await step();
      verifyDraw(returned, "town");
      assert.equal(returned.ride, "park");
      assert.equal(returned.phase, "on");
      assert.equal(returned.rollingDust, 0);
      near(returned.drawn.fov, returned.base, 0.05, "return to clean town lens");
      near(distance(returned.drawn.eye, returned.clean), 0, 1e-7, "return to clean town pose");
      near(returned.probe.fov, returned.drawn.fov, 1e-9, "town owns the actual lens");
      assert.equal(returned.probe.speed, 0);
      assert.equal(returned.probe.windGain, 0);
      assert.equal(returned.probe.shakeAmplitude, 0);
      assert.equal(returned.probe.fovDelta, 0);
      assert.equal(returned.audio.wind, undefined);
      if (hadWind) verifyRelease(returned.audio.retiredWind, 0.06, "road wind releases on return");
      verifyCarAudio(returned, undefined, 0);
      verifyPool(returned, 0, reduced);
      assert.ok(await page.evaluate(() => window.__ew.game.rides.riding === window.__speedRide));
      await note("return", returned);
      await exit("park");
    }

    async function roadDrive() {
      const { first } = await crest();
      const choice = '.road-overlay [data-way="words"]';
      await page.locator(choice).waitFor({ state: "visible" });
      await press(choice);
      await page.locator(".road-header").waitFor({ state: "visible" });
      if (!phone) await page.locator(".road-controls").waitFor({ state: "visible" });
      await page.locator(".road-gate").nth(2).waitFor({ state: "attached" });
      await page.evaluate(async () => { await document.fonts.ready; });
      const opening = await roadState();
      assert.equal(opening.phase, "drive");
      assert.equal(opening.elapsed, 0);
      near(opening.gateDistance, 75, 0.001, "first real gate at 75 m");
      assert.equal(opening.ghost, false, "fresh progress has no saved ghost");
      assert.equal(opening.totalGates, 0);
      assert.equal(await page.locator(".road-gates").getAttribute("lang"), opening.gap ? "es" : learner);
      await page.evaluate(observeRoadReference);

      const settle = [opening];
      let previous = first, e = 0, tier = 0, firstDrive, nearGate, passedGate, clear, lifted = false;
      let sawShake = false, pulledAway = false;
      checkpoint = "first-road-driving-draw";
      await go(true);
      try {
        for (let i = 0; i < 550; i++) {
          const frame = await step(), { road } = frame, ref = road.reference;
          verifyDraw(frame, "road", previous);
          assert.ok(frame.calls <= cap && !frame.loading && frame.fade < 0.01, `road calls ${frame.calls}/${cap}`);
          assert.ok(road.position > previous.road.position && road.elapsed > previous.road.elapsed);
          near(road.elapsed - previous.road.elapsed, tick / 1000, 1e-8, "road step");
          assert.equal(road.renderSerial, previous.road.renderSerial + 1);
          assert.ok(frame.input.y > 0.99 && !frame.input.brake);
          assert.ok(frame.probe.active && frame.probe.reducedMotion === reduced && ref);
          near(road.speed, road.actualSpeed, 1e-9, "read actual road car speed after penalties");
          near(frame.probe.speed, road.actualSpeed, 1e-9, "road controller uses actual speed");
          near(frame.probe.fov, frame.drawn.fov, 1e-9, "road probe and drawn lens");
          e = envelope(e, road.actualSpeed, 28, frame.t - previous.t);
          tier = reduced ? 0 : tierAt(tier, e);
          verifyPool(frame, tier, reduced);
          verifyCarAudio(frame, previous, e);

          const radians = Math.PI / 180;
          const authoredWide = 2 * Math.atan(Math.tan(ref.rawBase * radians / 2) * ref.lens) / radians;
          const projected = 2 * Math.atan(Math.tan((authoredWide + 3.5 * e) * radians / 2) / ref.lens) / radians;
          const liveLens = reduced ? 0 : Math.min(3.5, projected - ref.rawBase);
          const fovDelta = (reduced ? 0 : ref.inheritedFov) * (1 - ref.mix) + liveLens * ref.mix;
          near(frame.probe.fovDelta, fovDelta, 0.02, "projected speed lens at identical chase history");
          near(frame.drawn.fov - ref.base.fov, fovDelta, 0.02, "rendered lens over the authored camera");
          assert.ok(frame.probe.fovDelta >= -0.02 && frame.probe.fovDelta <= 3.52);
          const open = ref.remaining === undefined ? 1 : smooth(clamp((ref.remaining - 85) / 15));
          const liveAmplitude = reduced ? 0 : 0.0025 * e ** 2 * open;
          const amplitude = (reduced ? 0 : ref.inheritedAmplitude) * (1 - ref.mix) + liveAmplitude * ref.mix;
          near(frame.probe.shakeAmplitude, amplitude, 0.00001, "gate-scaled vibration amplitude including crest settle");
          const [x, y, z] = frame.drawn.eye, [cx, cy, cz] = ref.clean.eye;
          const expectedY = liveAmplitude * Math.sin(2 * Math.PI * 7 * ref.time) * ref.mix
            + (reduced ? 0 : ref.inheritedY) * (1 - ref.mix);
          near(Math.hypot(x - cx, z - cz), 0, 1e-7, "no horizontal vibration");
          near(y - cy, expectedY, 0.00001, "7 Hz vertical vibration after road framing");
          assert.ok(distance(frame.drawn.eye, ref.clean.eye) <= 0.00251);
          assert.deepEqual(frame.drawn.rotation, ref.clean.rotation, "vibration preserves authored look");
          if (reduced || ref.mix === 1) {
            near(distance(ref.clean.eye, ref.base.eye), 0, 1e-7, "road has no speed dolly");
            near(distance(ref.clean.rotation, ref.base.rotation), 0, 1e-7, "road has no speed rotation");
          }
          if (reduced) {
            assert.equal(frame.probe.fovDelta, 0);
            assert.equal(frame.probe.shakeAmplitude, 0);
            assert.equal(distance(frame.drawn.eye, ref.clean.eye), 0);
            assert.equal(frame.rollingDust, 0);
          }
          if (!firstDrive) {
            firstDrive = frame;
            await note("first-road-driving-draw", frame);
          }
          sawShake ||= Math.abs(y - cy) > 0.00015 && ref.mix === 1;
          pulledAway ||= frame.audio.pitch.value > firstDrive.audio.pitch.value + 25 && frame.audio.wind?.value > 0.006;
          lifted ||= road.lift > 0.1;
          if (settle.at(-1).elapsed < 1.6 - 1e-8) {
            settle.push(await roadState());
            if (settle.at(-1).elapsed >= 1.6 - 1e-8) {
              assertCameraSettle(settle);
              await note("settled-1.6s", frame);
            }
          }
          if (road.gates === 0 && road.elapsed > 0.35 && road.right !== undefined) {
            // Request a normal lane target through the same helper as road.mjs. Physics still steers and scores.
            await page.evaluate((right) => window.__ew.road.steer(right), road.right);
          }
          if (!nearGate && road.gates === 0 && road.gateDistance > 13 && road.gateDistance < 25 && road.elapsed > 1.6) {
            const registration = await sampleBoardRegistration(page, "road");
            assert.equal(registration.renderSerial, road.renderSerial);
            const centers = registration.samples.filter(({ name }) => name === "center");
            assert.equal(centers.length, 3);
            const options = (await roadState()).gates;
            for (const [index, board] of centers.entries()) {
              assert.ok(board.visible && distance(board.measured, board.projected) <= 0.5, JSON.stringify(board));
              assert.equal(board.lines.join(" "), options[index]);
            }
            nearGate = frame;
            await note("gate-fit", frame);
          }
          if (!passedGate && road.gates === 1) {
            assert.ok(previous.road.position < 75 && road.position >= 75);
            assert.equal(road.correct, 1, "the chosen lane scores at the real first gate");
            passedGate = frame;
            await note("gate-crossed", frame);
          }
          if (road.gates === 1 && (road.gateDistance === undefined || road.gateDistance > 100)
            && (reduced || (sawShake && frame.pool.marks.length >= 2))) {
            clear = frame;
            await note("road-clear", frame);
            break;
          }
          previous = frame;
        }
      } finally {
        await go(false);
        await page.evaluate(() => window.__speedRestoreReference());
      }
      if (!nearGate || !passedGate || !clear) fail("missing fitted gate, actual crossing, or clear road stretch");
      assert.ok(clear.road.recorded > opening.elapsed && clear.road.recorded > firstDrive.road.recorded, "real ghost recorder advances");
      assert.ok(pulledAway && (reduced || sawShake));
      assert.ok(reduced || (nearGate.probe.fovDelta > 0 && clear.probe.fovDelta > 0));
      log("road-run-summary", { lifted, gate: passedGate.road, clear: clear.road });
      await returnFromRoad(".road-header .road-dash > button.road-icon:first-child", !!clear.audio.wind);
    }

    async function standTaxi() {
      const cap = 3.15;
      const choice = '.taxi-choice[data-line="tx_a_where"]';
      const taxiRequests = () => requests.filter(({ pathname }) => speedJs.test(pathname));
      await ready(() => window.__ew.store.getState().hud.prompt?.kind === "taxi", "stand-action");
      assert.ok(await page.evaluate(atTaxiStand), "the reserved taxi is at the stand");
      assert.match(await page.locator(".prompt").innerText(), learner === "lt" ? /Vairuoti taksi/ : /Drive the taxi/);
      car = "stand-taxi";
      if (phone) await press(".act-btn");
      else await page.keyboard.press("e");
      assert.ok(await page.evaluate((phone) => phone ? window.__speedInput.click : window.__speedInput.key === "e", phone));

      await ready(() => {
        const { rides, transitioning } = window.__ew.game;
        return !transitioning && rides.phase === "on" && !!document.querySelector('.taxi-choice[data-line="tx_a_where"]')
          && window.__ew.audio.ctx?.state === "running";
      }, "taxi-opening-choice", 5);
      const pickup = await step();
      verifyDraw(pickup, "town");
      assert.equal(pickup.taxi.phase, "opening");
      assert.ok(await page.evaluate(atTaxiStand, "r1"));
      checkSightlines(await page.evaluate(taxiSightlines), "speed-feel pickup");
      assert.equal(pickup.rigMode, "follow");
      assert.ok(pickup.taxi.drewTaxiShot && !pickup.seatedVisible);
      assert.equal(pickup.probe, undefined);
      assert.deepEqual(taxiRequests(), [], "opening does not fetch the speed module");
      near(pickup.audio.pitch?.value, 52, 1e-6, "opening motor at idle");
      await note("taxi-pickup", pickup);
      await press(choice);
      await ready(() => window.__ew.game.modes.get("taxi").run?.phase === "drive", "taxi-learner-at-wheel", 5);

      function cleanVisual(frame) {
        near(frame.drawn.fov, pickup.drawn.fov, 0.05, "neutral taxi lens");
        near(distance(frame.drawn.eye, frame.clean), 0, 0.00001, "neutral taxi eye");
        assert.equal(frame.pool.marks.length, 0);
        if (frame.probe) {
          assert.equal(frame.probe.fovDelta, 0);
          assert.equal(frame.probe.shakeAmplitude, 0);
        }
        if (frame.reduced) assert.equal(frame.rollingDust, 0);
      }

      let previous, e = 0;
      function driving(frame) {
        verifyDraw(frame, "town", previous);
        assert.equal(frame.ride, "taxi");
        assert.equal(frame.phase, "on");
        assert.equal(frame.taxi.phase, "drive");
        assert.equal(frame.taxi.index, 0);
        assert.equal(frame.rigMode, "follow");
        assert.equal(frame.max, cap);
        assert.ok(frame.speed <= cap + 1e-8 && Math.abs(frame.slip) < 0.05, JSON.stringify(summary(frame)));
        assert.ok(!frame.seatedVisible && frame.input.y > 0.85 && Math.abs(frame.input.x) < 0.03);
        if (frame.taxi.shot?.blend > 0) assert.ok(frame.taxi.shot.distance >= 6, "the clear blend waits for six metres");
      }

      function feedback(frame, strength) {
        driving(frame);
        assert.ok(frame.probe?.active);
        near(frame.probe.speed, frame.speed, 1e-9, "post-contact taxi pace");
        e = envelope(e, frame.speed, max, frame.t - previous.t);
        verifyCarAudio(frame, previous, e, true);
        verifyPool(frame, 0, frame.reduced);
        if (previous.probe?.active) {
          assert.equal(frame.audio.pitch.writes, previous.audio.pitch.writes + 1, "one native motor write per learner frame");
          if (frame.audio.wind && previous.audio.wind) {
            assert.equal(frame.audio.wind.writes, previous.audio.wind.writes + 1, "one native wind write on the same gain node");
          }
        }
        const lift = 3.5 * e * strength, amp = 0.0025 * e ** 2 * strength;
        near(frame.drawn.fov - pickup.drawn.fov, lift, 0.02, "drawn taxi lens from the town scale");
        near(frame.probe.fovDelta, lift, 1e-8, "taxi speed-only lens");
        near(frame.probe.shakeAmplitude, amp, 1e-8, "taxi shake amplitude");
        near(frame.drawn.eye[1] - frame.clean[1], amp * Math.sin(2 * Math.PI * 7 * frame.t), 1e-8, "taxi vertical motion");
        near(distance(frame.drawn.rotation, frame.cleanRotation), 0, 1e-7, "taxi rig keeps its look direction");
        if (!strength) cleanVisual(frame);
        previous = frame;
      }

      checkpoint = "taxi-first-drive-held-import";
      await go(true);
      try {
        for (let i = 0; i < 105; i++) {
          const frame = await step();
          driving(frame);
          assert.ok(frame.reduced && frame.taxi.drewTaxiShot && frame.taxi.shot?.blend === 0);
          assert.equal(frame.probe, undefined);
          assert.equal(frame.pool.containers, 0);
          assert.equal(frame.audio.kind, undefined, "legacy taxi motor releases before the shared module loads");
          assert.equal(frame.audio.wind, undefined);
          cleanVisual(frame);
          previous = frame;
          if (frame.speed >= 3.12) break;
        }
        assert.ok(previous.speed >= 3.12, "the first drive reaches town lesson pace before import");
        assert.equal(taxiRequests().length, 1, "one lazy request on the first learner drive");
        await note("taxi-first-reduced-cold", previous);

        unholdModule();
        await ready(() => !!window.__speedFeel, "taxi-speed-module-ready", 0);
        const quiet = await step();
        assert.ok(quiet.reduced && quiet.taxi.drewTaxiShot);
        feedback(quiet, 0);
        await note("taxi-first-reduced-mounted", quiet);

        await setMotion("no-preference");
        let blendStart, handoff;
        checkpoint = "taxi-clearance-blend";
        for (let i = 0; i < 240; i++) {
          const frame = await step();
          assert.equal(frame.reduced, false);
          assert.ok(frame.taxi.drewTaxiShot, "the frame completing the blend still belongs to the taxi shot");
          feedback(frame, 0);
          if (frame.taxi.shot?.blend > 0 && blendStart === undefined) {
            blendStart = frame.t - frame.taxi.shot.blend;
            await note("taxi-blend-start", frame);
          }
          if (!frame.taxi.shot) { handoff = frame; break; }
        }
        if (!handoff || blendStart === undefined) fail("the dedicated taxi shot never finished its clearance blend");
        near(handoff.t - blendStart, 0.4, 2 * tick / 1000, "clear taxi blend duration");
        assert.ok(handoff.speed >= 3.12 && handoff.audio.wind?.value > 0);
        await note("taxi-final-pickup-draw", handoff);

        checkpoint = "taxi-follow-resume";
        for (let i = 0; i < 33; i++) {
          const frame = await step();
          assert.ok(!frame.taxi.drewTaxiShot && !frame.taxi.shot);
          const strength = smooth(clamp((frame.t - handoff.t) / 0.35));
          feedback(frame, strength);
          if (i === 0) {
            assert.ok(frame.probe.fovDelta > 0 && frame.probe.fovDelta < 0.01, "no lens jump at cruise");
            await note("taxi-first-follow-draw", frame);
          }
        }
        assert.ok(previous.speed >= 3.12 && previous.asphalt);
        near(e, previous.speed / max, 0.001, "settled taxi envelope at attained pace");
        near(previous.drawn.fov - pickup.drawn.fov, 0.71, 0.025, "small taxi lens lift at the cap");
        near(previous.audio.pitch.value, 64.6, 0.2, "taxi motor at the cap");
        near(previous.audio.wind.value, 0.00104, 0.00005, "taxi wind at the cap");
        near(previous.probe.shakeAmplitude, 0.0001, 0.000005, "taxi shake at the cap");
        await note("taxi-follow-cruise", previous);

        await setMotion("reduce");
        checkpoint = "taxi-live-opt-out";
        const quietFollow = await step();
        assert.ok(quietFollow.reduced && quietFollow.speed >= 3.12 && !quietFollow.taxi.drewTaxiShot);
        feedback(quietFollow, 0);
        await note("taxi-live-opt-out", quietFollow);

        // Hear the first cue on the outbound lane so its playback can finish during the reverse.
        checkpoint = "taxi-first-direction";
        const cue = page.locator('.taxi-cue [data-line="tx_r1_c1"]');
        for (let i = 0; i < 18 && !await cue.count(); i++) {
          await page.evaluate(() => window.__step(10, 50));
        }
        assert.ok(await cue.count(), "the learner drives far enough to hear the first direction");
      } finally {
        await go(false);
      }

      // Back up past the pullout to miss the first approach. The lesson supplies the retry pose and camera.
      checkpoint = "taxi-reverses-off-approach";
      await go(true, true);
      try {
        const nearPullout = await page.evaluate((x) => {
          const taxi = window.__ew.game.modes.get("taxi");
          for (let i = 0; i < 24 && taxi.car.m.x < x && taxi.run.phase === "drive"; i++) window.__step(15, 50);
          return taxi.car.m.x;
        }, pickup.pose[0] + 5);
        assert.ok(nearPullout >= pickup.pose[0] + 5, "genuine reverse input reaches the far side of the stand");
        for (let i = 0; i < 45; i++) {
          const frame = await step(50);
          if (frame.taxi.phase === "wrong") break;
        }
        assert.equal(last.taxi.phase, "wrong");
        assert.ok(last.taxi.speed < -2.5 && !last.taxi.shot && !last.probe.active);
        verifyDraw(last, "town");
        cleanVisual(last);
        verifyRelease(last.audio.retiredMotor, 0.08, "wrong approach releases learner motor");
        verifyRelease(last.audio.retiredWind, 0.06, "wrong approach releases learner wind");
        await note("taxi-wrong-approach-release", last);
      } finally {
        await go(false, true);
      }
      await ready(() => {
        const { game } = window.__ew;
        return !game.transitioning && game.modes.get("taxi").run?.phase === "drive" && game.rig.hasTaxiShot;
      }, "taxi-retry-ready", 5);
      const retry = await step();
      verifyDraw(retry, "town");
      checkSightlines(await page.evaluate(taxiSightlines), "speed-feel retry");
      assert.ok(retry.taxi.drewTaxiShot && retry.probe.active && retry.speed < 0.5);
      assert.equal(taxiRequests().length, 1, "retry reuses the mounted controller");
      cleanVisual(retry);
      await note("taxi-retry-pickup", retry);

      const menu = page.getByRole("button", { name: learner === "lt" ? "Meniu" : "Menu", exact: true });
      const out = page.getByRole("button", { name: localized.out[learner], exact: true });
      const activate = (locator) => phone ? locator.tap() : locator.click();
      await activate(menu);
      await activate(out);
      await ready(() => {
        const { game } = window.__ew;
        return !game.transitioning && !game.rides.riding && !game.modes.engaged;
      }, "taxi-exit-to-town");
      const exited = await step();
      verifyNoCar(exited);
      verifyRelease(exited.audio.retiredMotor, 0.08, "taxi exit releases the motor");
      assert.equal(exited.eligible, 21, "the taxi remains reserved");
      assert.ok(await page.evaluate(atTaxiStand), "the lesson taxi is back at its stand");
      await note("taxi-normal-exit", exited);
    }

    await ready(() => {
      const ew = window.__ew;
      return ew?.store.getState().screen === "play" && ew.game?.zone?.id === "town" && !!document.querySelector(".hud .toolbar");
    }, "saved-town", 4);
    await page.evaluate(observeGame, taxiFirst);
    await page.evaluate(() => {
      window.__ew.coach?.finish?.();
      window.__ew.store.getState().setHud({ panel: null });
    });
    await ready((trafficModels) => {
      const { game, carStats } = window.__ew;
      const stats = carStats();
      return game.ledges?.ready && !game.transitioning && game.carVisuals?.ready && game.crashShadersReady
        && stats.loadedCarModels === 9 && stats.parkedModels === 19 && stats.trafficModels === trafficModels && stats.taxi;
    }, "town-models-ledges-shaders", 1, taxiFirst ? 6 : 2);
    const signed = await page.evaluate(() => {
      let signed = false;
      window.__ew.game.town.group.traverse((node) => { signed ||= node.material?.map?.name === "Carretera del Desierto"; });
      return signed;
    });
    assert.equal(signed, true, "shipped Puerto Colibrí road sign");
    checkpoint = "startup-on-foot";
    const startup = await step();
    verifyNoCar(startup);
    assert.deepEqual(startup.viewport, [viewport.width, viewport.height, deviceScaleFactor]);
    assert.deepEqual([startup.screen.w, startup.screen.h], [viewport.width, viewport.height]);
    assert.ok(startup.screen.bufferW > 0 && startup.screen.bufferH > 0);
    assert.equal(startup.probe, undefined);
    assert.equal(startup.pool.containers, 0);
    assert.deepEqual(requests, [], "zero A8 assets and road warmup fetches at startup");
    const eligible = startup.eligible;
    assert.equal(eligible, 21, "three owned convertibles and 18 eligible parked cars; stand taxi is reserved");
    if (taxiFirst) {
      await standTaxi();
      checkErrors();
      log("taxi-first-passed", { seed });
      await context.tracing.stop();
      return learner;
    }
    const startupResources = await resources();
    let foot = startup;
    for (let i = 0; i < 25; i++) {
      foot = await step();
      verifyNoCar(foot);
      assert.equal(foot.audio.kind, undefined);
      assert.equal(foot.audio.wind, undefined);
      assert.equal(foot.probe, undefined);
    }
    assert.ok(foot.traffic.some(({ x }, i) => Math.abs(x - startup.traffic[i].x) > 0.1), "traffic moving with no player car");
    await note("startup-on-foot", foot);
    const cap = phone ? 26 : 60;

    await boat("muelle-before-car");
    assert.deepEqual(requests, [], "the boat does not fetch the car effect or warm the road");
    await board("parked-0", { cold: true });
    await coldMount(startupResources);
    await drive("parked-0");
    await exit("parked-0");

    await board("park");
    await drive("park");
    await exit("park");

    await board("parked-0", { tag: "parked-0-dented" });
    await damage();
    await drive("parked-0", true);
    await exit("parked-0");
    assert.ok(await page.evaluate(() => window.__ew.game.rides.crashes.info(window.__speedRide)?.dentCount > 0));

    await boat("muelle-after-car");
    await roadDrive();
    if (!reduced) {
      await frozenCrest();
      await livePreference(true);
      await livePreference(false);
    }
    await rollingDust();
    checkErrors();
    log("passed", { seed });
    await context.tracing.stop();
    return learner;
  } catch (error) {
    console.error("speed-feel", label(), error);
    if (errors.length) console.error("speed-feel", label("runtime-diagnostics"), JSON.stringify(errors));
    const failureDir = shots ?? join(tmpdir(), "speed-feel-failures");
    const prefix = join(failureDir, `speed-feel-${safeName(label())}-first-failure-${process.pid}-${Date.now()}`);
    try {
      await mkdir(failureDir, { recursive: true });
      await writeFile(`${prefix}.json`, JSON.stringify({ label: label(), url: url.href, seed, assertion: error.stack, errors, requests, last, trace }, null, 2));
      await page.screenshot({ path: `${prefix}.png`, timeout: 15_000 });
    } catch (captureError) {
      console.error("speed-feel", label("failure-capture"), captureError.message);
    }
    try {
      await context.tracing.stop({ path: `${prefix}.zip` });
    } catch (traceError) {
      console.error("speed-feel", label("failure-trace"), traceError.message);
    }
    console.error("speed-feel", label("failure-artifacts"), prefix);
    throw error;
  } finally {
    unholdModule();
    await context.close();
  }
}

if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: [
    // Playwright defaults to --mute-audio in headless Chromium.
    ...(process.platform === "darwin"
      ? ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"]
      : ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"]),
  ],
  ignoreDefaultArgs: ["--mute-audio"],
});
try {
  let edition;
  const failures = [];
  for (const viewport of options) {
    for (const reduced of [false, true]) {
      try {
        edition = await suite(browser, viewport, reduced, edition);
      } catch (error) {
        failures.push(error);
      }
    }
  }
  for (const viewport of options) {
    try {
      edition = await suite(browser, viewport, true, edition, true);
    } catch (error) {
      failures.push(error);
    }
  }
  if (failures.length) throw failures[0];
} finally {
  await browser.close();
}
