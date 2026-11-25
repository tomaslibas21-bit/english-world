// Run once against the PC-en Vite server and again against the PC-lt Vite server.
// The chain owns browser execution. Each run uses four independent contexts.
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

assert(process.env.WORLD_TEST_URL, "Set WORLD_TEST_URL to this learner layer’s Vite server");
const base = new URL(process.env.WORLD_TEST_URL);
assert(["http:", "https:"].includes(base.protocol) && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname),
  "Use a loopback WORLD_TEST_URL");
const storage = process.env.WORLD_STORAGE;
const learner = process.env.WORLD_LEARNER;
assert.equal(storage, "puerto-colibri", "WORLD_STORAGE");
assert(["en", "lt"].includes(learner), "WORLD_LEARNER must be en or lt");
const key = "puerto-colibri-progress-v1";
const shots = process.env.SHOTS_DIR;
const sizes = [[390, 844], [1280, 800]];
const moves = ["jacks", "toes", "squats", "circles", "run", "reach", "lunges", "pushups"];
const calls = [...moves, "toes", "jacks"];
const againCalls = [...moves.slice(2), ...moves.slice(0, 2), "circles", "squats"];
const slots = [1, 3, 2, 4, 3, 1, 4, 2, 1, 3];
const arrows = ["ArrowLeft", "ArrowUp", "ArrowDown", "ArrowRight"];
const glyphs = ["←", "↑", "↓", "→"];
const zero = { completed: 0, firstTry: 0, wrong: 0, said: 0 };
const baseline = 3;
const situation = "s35-gym";
const nextSituation = "s87-interview";
const noHud = ".toolbar, .ride-menu, .joy, .jump-btn, .act-btn, .minimap, .objective-card, .prompt";
const mat = { zone: "gym", x: -6.4, z: 2.4, rot: Math.PI / 2 };
const progress = {
  version: 1,
  profile: {
    name: "Test", surname: "Tester", gender: "f", lookId: "f1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" },
  },
  settings: { v: 6, play: "town", quality: "low", scenes: false, slowVoice: false, volume: 0.8, sounds: 0, cameraFollow: true, phoneCalls: false, textMessages: false },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: mat, play: { games: { gym: baseline } },
  coach: { done: true, run: true, view: true, seen: { list: true } },
};

// Pinned from the PC writing brief, EN authoring rows and the compact LT table.
// There are no browser imports of workout content or of the s35 situation/table.
const sourceLines = {
  gy_jacks: ["¡Haga | saltos de tijera!", "Do | jumping jacks!", "Do jumping jacks!", "Darykite | šuoliukus skėčiant kojas!", "Šokinėkite skėsdami kojas ir keldami rankas!"],
  gy_toes: ["¡Tóquese | los | pies!", "Touch | your | feet!", "Bend down and touch your feet!", "Palieskite | — | pėdas!", "Pasilenkite ir palieskite pėdas!"],
  gy_squats: ["¡Haga | una | sentadilla!", "Do | a | squat!", "Do a squat!", "Padarykite | vieną | pritūpimą!", "Pritūpkite!"],
  gy_circles: ["¡Haga | círculos | con | los | brazos!", "Make | circles | with | your | arms!", "Circle your arms!", "Sukite | ratus | su | — | rankomis!", "Sukite rankas ratu!"],
  gy_run: ["¡Corra | en | su | lugar!", "Run | in | your | spot!", "Run in place!", "Bėkite | — | savo | vietoje!", "Bėkite vietoje!"],
  gy_reach: ["¡Levante | los | brazos!", "Raise | your | arms!", "Raise your arms!", "Pakelkite | — | rankas!", "Pakelkite rankas aukštyn!"],
  gy_lunges: ["¡Haga | un | desplante!", "Do | a | lunge!", "Do a lunge!", "Padarykite | vieną | įtūpstą!", "Ženkite pirmyn ir padarykite įtūpstą!"],
  gy_pushups: ["¡Haga | una | lagartija!", "Do | a | push-up!", "Do a push-up!", "Padarykite | vieną | atsispaudimą!", "Padarykite atsispaudimą!"],
  gy_intro: ["¡Muévase | conmigo!", "Move | with me!", "Move with me!", "Judėkite | su manimi!", "Pajudėkime kartu!"],
  gy_right_a: ["¡Eso es!", "That’s it!", "That’s it!", "Štai taip!", "Štai taip!"],
  gy_right_b: ["¡Muy | bien!", "Very | well!", "Nice work!", "Labai | gerai!", "Puikiai!"],
  gy_retry: ["Pruebe | otra | vez.", "Try | another | time.", "Try again.", "Pabandykite | dar | kartą.", "Pabandykite dar kartą."],
  gy_end: ["¡Terminamos!", "We finished!", "We’re done!", "Baigėme!", "Štai ir baigėme!"],
};
const fixture = {
  target: "es-MX", voice: "es_jordan", speed: 1, male: false, trainer: "jordan",
  name: "Mónica", place: "Gimnasio Colibrí", title: "¡Una más!",
  ...(learner === "en" ? {
    card: "One more!", scenariosTool: "All situations", sceneStart: "Start", taskComplete: "Task completed!", read: "Keep going by reading", mapTool: "Map (M)", settingsTool: "Settings (Esc)", volume: "Volume",
    entry: { startLabel: "Work out with Mónica", mapLabel: "Start your workout on the mat in Gimnasio Colibrí.", listAction: "Find the exercise mat" },
    ui: {
      readyTitle: "Workout with Mónica", readyTouch: "Listen and tap the picture that matches.",
      readyKeys: "Listen and choose a move with an arrow key or 1–4.", start: "Start",
      progress: (i) => `Move ${i} of 10`, exit: "Leave workout", replay: "Listen again", reveal: "Show words",
      choices: "Choose a move", scoreTitle: "Workout complete", completed: "Moves completed", firstTry: "Right on the first try",
      again: "Again", done: "Back to the gym",
    },
    labels: {
      jacks: "Do jumping jacks", toes: "Touch your feet", squats: "Do a squat", circles: "Circle your arms",
      run: "Run in place", reach: "Raise your arms", lunges: "Do a lunge", pushups: "Do a push-up",
    },
    speech: { mic: "Say it aloud", micStop: "Stop listening", hit: "Well said! +1", miss: "Almost! You can try again", stat: "Said aloud" },
  } : {
    card: "Dar vieną!", scenariosTool: "Visos situacijos", sceneStart: "Pradėti", taskComplete: "Užduotis įvykdyta!", read: "Tęsti skaitant", mapTool: "Žemėlapis (M)", settingsTool: "Nustatymai (Esc)", volume: "Garsumas",
    entry: { startLabel: "Treniruotis su trenere", mapLabel: "Treniruotė prasideda ant kilimėlio sporto klube „Gimnasio Colibrí“.", listAction: "Rasti treniruočių kilimėlį" },
    ui: {
      readyTitle: "Mónica kviečia į treniruotę", readyTouch: "Klausykite ir bakstelėkite tinkamą paveikslėlį.",
      readyKeys: "Klausykite. Judesį pasirinkite rodykle arba skaičiumi nuo 1 iki 4.", start: "Pradėti",
      progress: (i) => `Judesys ${i} iš 10`, exit: "Išeiti iš treniruotės", replay: "Klausyti dar kartą", reveal: "Rodyti žodžius",
      choices: "Pasirinkti judesį", scoreTitle: "Treniruotė baigta", completed: "Atlikti judesiai", firstTry: "Teisingai iš pirmo karto",
      again: "Dar kartą", done: "Grįžti į sporto klubą",
    },
    labels: {
      jacks: "Šokinėti skėčiant kojas ir keliant rankas", toes: "Paliesti pėdas", squats: "Pritūpti", circles: "Sukti rankas ratu",
      run: "Bėgti vietoje", reach: "Pakelti rankas aukštyn", lunges: "Daryti įtūpstą", pushups: "Daryti atsispaudimą",
    },
    speech: { mic: "Pasakyti garsiai", micStop: "Nebeklausyti", hit: "Puikiai pasakyta! +1", miss: "Beveik! Galite bandyti dar", stat: "Pasakyta garsiai" },
  }),
};

// PC's day-pass simulation and optional branches, through the regular typed conversation.
const dialogue = {
  howareyou: "Bien, gracias. ¿Y usted?",
  new: "Hola, es mi primera vez aquí.",
  plan: "Una visita, por favor.",
  form: "Listo.",
  pay: "Pago en efectivo.",
  lockers: "No, ya estoy lista.",
  lock_q: "No, gracias.",
  changing: "Ya estoy lista.",
  warmup: "Caminadora.",
  feel_q: "¡Bien!",
  machine: "¿Está libre?",
  broken: "¿Está libre esta máquina?",
  sets: "¿Cuántas series hago?",
  rep: "¡Diez!",
  okay_q: "Estoy bien, gracias.",
  stretch: "Sí, por favor.",
  spot: "¿Me puede ayudar con la barra?",
  breath: "¡Me falta el aire!",
  breath_q: "¡Me falta el aire!",
  next: "¡Nos vemos mañana!",
  closing: "¡Gracias, adiós!",
};

function installControls({ key, progress, recognition, storage, silentDesktop }) {
  localStorage.setItem(key, JSON.stringify(progress));
  localStorage.setItem(`${storage}-variety`, "default");
  sessionStorage.setItem("ew-play-now", "1");
  let now = 1000;
  let seed = 20261122;
  Math.random = () => ((seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296);
  performance.now = () => now;
  const frames = new Map();
  let frame = 0;
  window.requestAnimationFrame = (fn) => { frames.set(++frame, fn); return frame; };
  window.cancelAnimationFrame = (id) => { frames.delete(id); };
  window.__step = async (n, dt = 50) => {
    for (let i = 0; i < n; i++) {
      now += dt;
      window.__gymAudio?.tick(now);
      await Promise.resolve(); // deliver the recording result before the game consumes the next frame
      for (const [id, fn] of [...frames]) if (frames.delete(id)) fn(now);
    }
    return now;
  };

  delete window.SpeechRecognition;
  delete window.webkitSpeechRecognition;
  window.__gymMic = { starts: [], active: false, aborts: 0 };
  if (recognition) {
    let active, previous;
    window.SpeechRecognition = class {
      start() {
        active = this;
        previous = { recognizer: this, onresult: this.onresult };
        window.__gymMic.starts.push(this.lang);
        window.__gymMic.active = true;
        this.onstart?.();
      }
      abort() {
        if (active === this) {
          active = null;
          window.__gymMic.active = false;
        }
        window.__gymMic.aborts++;
        this.onend?.();
      }
    };
    const result = (transcript) => ({ resultIndex: 0, results: [Object.assign([{ transcript }], { isFinal: true })] });
    window.__sayItHear = (transcript) => {
      if (!active) throw new Error("SpeechRecognition is idle");
      const recognizer = active;
      recognizer.onspeechstart?.();
      recognizer.onresult?.(result(transcript));
      recognizer.onspeechend?.();
    };
    window.__gymLateHear = (transcript) => previous.onresult?.call(previous.recognizer, result(transcript));
  }
  // No device voice can run. A dialogue with a missing recording offers its real reading control.
  if (silentDesktop) speechSynthesis.getVoices = () => [];
  window.__gymSynth = [];
  speechSynthesis.speak = (utterance) => {
    window.__gymSynth.push({ at: now, text: utterance.text, gym: !!window.__gym });
    queueMicrotask(() => utterance.onerror?.());
  };
}

function observeAudio({ entries, fixture, audible, silentDesktop, situation }) {
  const { audio, store } = window.__ew;
  const original = audio.play.bind(audio);
  const clipDuration = audio.clipDuration.bind(audio);
  const texts = new Map(entries);
  const pending = new Map();
  const signals = new WeakSet();
  const requests = [];
  const fixtureAudio = window.__gymAudio = {
    requests, next: null, tick(at) {
      for (const [request, finish] of pending) if (at >= request.releaseAt) finish(true);
    },
  };
  audio.clipDuration = (voice, speed, text) => {
    if (!window.__gym || voice !== fixture.voice || speed !== fixture.speed || !texts.has(text)) {
      return clipDuration(voice, speed, text);
    }
    if (fixtureAudio.next?.text === text) return fixtureAudio.next.manifest;
    return audible ? 0.5 : clipDuration(voice, speed, text);
  };
  audio.play = (voice, speed, text, options) => {
    if (!window.__gym) {
      const { conv } = store.getState();
      if (silentDesktop && conv.active && conv.sitId === situation && conv.phase === "npc" && conv.speaking !== null) {
        return original(voice, speed, text, { ...options, localVoiceOnly: true });
      }
      return original(voice, speed, text, options);
    }
    const trainerRecording = voice === fixture.voice && speed === fixture.speed && texts.has(text)
      && options?.recordingOnly === true && options?.optional === true;
    const override = trainerRecording && fixtureAudio.next?.text === text ? fixtureAudio.next : null;
    if (override) fixtureAudio.next = null;
    const signal = options?.signal;
    const request = {
      text, voice, speed, optional: options?.optional, recordingOnly: options?.recordingOnly,
      slow: options?.slow, male: options?.male,
      freshSignal: signal instanceof AbortSignal && !signal.aborted && !signals.has(signal),
      at: performance.now(), volume: audio.volume, mic: window.__gymMic.active, chooseEnabled: document.querySelectorAll(".gym-choices button:enabled").length,
      kind: override?.stall ? "stall" : audible && trainerRecording ? "gate" : "real",
    };
    requests.push(request);
    if (signal instanceof AbortSignal) signals.add(signal);
    signal?.addEventListener("abort", () => { request.aborted = performance.now(); }, { once: true });
    const settled = (ok) => {
      request.ended = performance.now();
      request.ok = ok;
      return ok;
    };
    if (request.kind === "real") return original(voice, speed, text, options).then(settled);
    request.releaseAt = override?.stall ? null : request.at + (override?.ms ?? 500);
    return new Promise((resolve) => {
      const finish = (ok) => {
        pending.delete(request);
        signal?.removeEventListener("abort", abort);
        resolve(settled(ok));
      };
      const abort = () => finish(false);
      if (!override?.stall) pending.set(request, finish);
      if (signal?.aborted) abort();
      else signal?.addEventListener("abort", abort, { once: true });
    });
  };
}

const lines = Object.fromEntries(Object.entries(sourceLines).map(([id, [es, enGloss, enNat, ltGloss, ltNat]]) => {
  const units = es.split(" | ");
  for (const [gloss, natural] of [[enGloss, enNat], [ltGloss, ltNat]]) {
    assert(natural.trim() && gloss.split(" | ").every((unit) => unit.trim()), id + " has full learner support");
    assert.equal(gloss.split(" | ").length, units.length, id + " aligned units");
  }
  const target = units.join(" ");
  return [id, { target, units, gloss: (learner === "en" ? enGloss : ltGloss).split(" | "),
    natural: learner === "en" ? enNat : ltNat, say: target }];
}));
const authored = Object.entries(lines).map(([id, line]) => [line.say, id]);
assert.equal(authored.length, 13);
assert.equal(new Set(authored.map(([say]) => say)).size, 13);

const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const expectedOptions = (move, slot) => {
  const options = [];
  for (const [i, offset] of [0, 1, 3, 5].entries()) options[(slot - 1 + i) % 4] = moves[(moves.indexOf(move) + offset) % moves.length];
  return options;
};

function observeHandoffs(trainerId) {
  const { game } = window.__ew;
  const liveTrainer = () => game.npcs.find(({ id }) => id === trainerId)?.ch;
  const transform = (node) => ({
    position: node.position.toArray(), rotation: node.rotation.toArray(), scale: node.scale.toArray(),
  });
  const captureRig = (ch) => ch && ({
    ...transform(ch.root), visible: ch.root.visible, anim: ch.anim,
    watch: ch.watch === game.learnerAt ? "learner" : ch.watch === game.talkAt ? "partner" : ch.watch?.toArray() ?? ch.watch,
    busy: ch.busy, steady: ch.steady, attentive: ch.attentive, fidgets: ch.fidgets,
    lift: ch.lift, tuck: ch.tuck, squash: ch.squash, flip: ch.flip, bank: ch.bank, moveSpeed: ch.moveSpeed,
    joints: Object.fromEntries(["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"]
      .map((id) => [id, transform(ch.joint(id))])),
  });
  const capture = (player, trainer) => {
    const { mode, stage, yaw, pitch, dist, viewShift, cam } = game.rig;
    return { at: performance.now(), player: captureRig(player), trainer: captureRig(trainer),
      camera: { mode, stage: stage === null, yaw, pitch, dist, viewShift: { ...viewShift },
        view: cam.view && { ...cam.view }, zoom: cam.zoom, fov: cam.fov, near: cam.near } };
  };
  const handoffs = window.__gymHandoffs = [];
  let originalCamera;
  const prepare = game.prepareMode;
  game.prepareMode = function (...args) {
    if (this.modes.owns("gym")) {
      const player = game.player, trainer = liveTrainer();
      window.__gymActors = { player, trainer, trainerId };
      originalCamera = game.rig.cam;
      handoffs.push({ entry: capture(player, trainer) });
    }
    return prepare.apply(this, args);
  };
  const left = game.modes.left;
  game.modes.left = function (id) {
    const handoff = handoffs.at(-1);
    if (id === "gym" && this.owns(id) && handoff && !handoff.release) {
      // Restoration has happened. Sample before the room animator can update the joints in this frame.
      const { player, trainer } = window.__gymActors;
      handoff.sameCamera = originalCamera === game.rig.cam;
      const current = liveTrainer();
      handoff.sameActors = player === game.player && trainer === current;
      handoff.release = capture(game.player, current);
    }
    return left.call(this, id);
  };
}

function sampleRigs({ project, moves = [] }) {
  const { game } = window.__ew;
  const { player, trainer, trainerId } = window.__gymActors;
  const { cam } = game.rig;
  const viewport = game.renderer.domElement.getBoundingClientRect();
  const point = player.root.position.clone();
  const pixels = (p) => {
    p.project(cam);
    return [viewport.left + (p.x + 1) * viewport.width / 2, viewport.top + (1 - p.y) * viewport.height / 2, p.z];
  };
  const ray = project ? new game.raycaster.constructor() : null;
  const room = [];
  const figures = [];
  if (project) {
    // Use the rendered room meshes, including the merged boxing-ring platform, pads and ropes.
    game.zone.group.traverseVisible((node) => {
      if (node.isMesh && node.layers.test(cam.layers) && node.material.visible && !node.material.transparent) room.push(node);
    });
    for (const ch of moves.length ? [player, trainer] : []) {
      ch.root.updateMatrixWorld(true);
      ch.root.traverseVisible((node) => {
        if (node.isMesh && node.layers.test(cam.layers) && node.material.visible && !node.material.transparent) figures.push(node);
      });
    }
  }
  const eye = cam.getWorldPosition(point.clone());
  const vector = point.clone();
  const clear = (vertices, throughFigures = false) => {
    const step = Math.max(1, Math.floor(vertices.length / (throughFigures ? 24 : 12)));
    let visible = 0;
    for (let i = 0; i < vertices.length; i += step) {
      const world = point.fromArray(vertices[i].world);
      vector.copy(world).sub(eye);
      ray.far = vector.length() - 0.018;
      ray.set(eye, vector.normalize());
      if (ray.intersectObjects(room, false).length) continue;
      if (throughFigures && ray.intersectObjects(figures, false).length) continue;
      if (++visible >= 3) return true;
    }
    return false;
  };
  const actor = (ch, live, move) => {
    ch.root.updateMatrixWorld(true);
    const joints = Object.fromEntries(["body", "head", "armL", "armR", "foreL", "foreR", "legL", "legR", "shinL", "shinR"].map((id) => {
      const joint = ch.joint(id);
      return [id, {
        angle: joint.rotation.toArray().slice(0, 3),
        local: joint.position.toArray(),
        world: joint.getWorldPosition(point).toArray(),
      }];
    }));
    // The toe is carried by the shin bone on both character implementations.
    const foot = (side) => {
      const leg = ch.joint("leg" + side), shin = ch.joint("shin" + side);
      const scale = ch.height / 1.75;
      return shin.localToWorld(point.set(0, -(leg.position.y + shin.position.y), 0.185 * scale)).toArray();
    };
    const feet = [foot("L"), foot("R")];
    const meshes = [];
    const painted = [];
    const silhouette = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, clipped: false };
    const regions = {};
    ch.root.traverse((mesh) => { if (mesh.isMesh) meshes.push(mesh.uuid); });
    if (project) {
      const parts = Object.fromEntries(["head", "foreL", "foreR", "legL", "legR", "shinL", "shinR"].map((name) =>
        [name, { joint: ch.joint(name), vertices: [] }]));
      const byJoint = new Map(Object.values(parts).map((part) => [part.joint, part]));
      const regionFor = (bone) => {
        for (let node = bone; node; node = node.parent) {
          if (byJoint.has(node)) return byJoint.get(node);
        }
      };
      const local = point.clone();
      ch.root.traverseVisible((mesh) => {
        if (!mesh.isMesh || !mesh.material.visible || !mesh.layers.test(cam.layers)) return;
        if (mesh.isSkinnedMesh) painted.push(mesh.uuid);
        const skin = mesh.geometry.attributes.skinIndex;
        const bones = mesh.skeleton?.bones.map(regionFor);
        const rigid = skin ? undefined : regionFor(mesh.parent);
        for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
          mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld);
          const world = point.toArray();
          const part = bones ? bones[skin.getX(i)] : rigid;
          const localY = part?.joint.worldToLocal(local.copy(point)).y;
          const [x, y, z] = pixels(point);
          silhouette.left = Math.min(silhouette.left, x);
          silhouette.right = Math.max(silhouette.right, x);
          silhouette.top = Math.min(silhouette.top, y);
          silhouette.bottom = Math.max(silhouette.bottom, y);
          silhouette.clipped ||= z < -1 || z > 1;
          if (part) part.vertices.push({ world, pixel: [x, y, z], localY });
        }
      });
      const record = (name, vertices, anatomy = false) => {
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity, floor: Infinity };
        for (const { world, pixel: [x, y] } of vertices) {
          bounds.left = Math.min(bounds.left, x);
          bounds.right = Math.max(bounds.right, x);
          bounds.top = Math.min(bounds.top, y);
          bounds.bottom = Math.max(bounds.bottom, y);
          bounds.floor = Math.min(bounds.floor, world[1]);
        }
        regions[name] = { ...bounds, vertices: vertices.length, clear: clear(vertices),
          exposed: anatomy && clear(vertices, true) };
      };
      record("head", parts.head.vertices);
      for (const side of ["L", "R"]) {
        const { vertices: fore } = parts["fore" + side];
        const { vertices: thigh } = parts["leg" + side];
        const { vertices: shin } = parts["shin" + side];
        const tip = fore.reduce((min, v) => Math.min(min, v.localY), Infinity);
        const heel = shin.reduce((min, v) => Math.min(min, v.localY), Infinity);
        record("hand" + side, fore.filter((v) => v.localY < tip + 0.025), move === "reach");
        record("fore" + side, fore);
        record("hip" + side, thigh.filter((v) => v.localY > -0.09 && v.localY < 0.09));
        record("knee" + side, shin.filter((v) => v.localY > -0.06), move === "squats" || move === "lunges");
        record("shin" + side, shin);
        record("shoe" + side, shin.filter((v) => v.localY < heel + 0.072), move === "lunges" && side === "R");
      }
    }
    return {
      same: ch === live, visible: ch.root.visible, joints, feet, meshes,
      palms: ["L", "R"].map((side) => ch.joint("fore" + side).localToWorld(point.set(0, ch.rightHand.position.y, 0)).toArray()),
      root: ch.root.position.toArray(), yaw: ch.root.rotation.y, anim: ch.anim,
      ...(project ? {
        silhouette, regions, painted, shoes: feet.map((p) => pixels(point.fromArray(p))),
        face: pixels(ch.joint("head").localToWorld(point.set(0, ch.height * 0.09, ch.height * 0.08))),
      } : {}),
    };
  };
  return {
    at: performance.now(), phase: window.__gym?.state()?.phase, pose: window.__gym?.state()?.pose,
    camera: game.rig.mode, eye: cam.position.toArray(), fov: cam.fov,
    view: [...cam.matrixWorld.elements, ...cam.projectionMatrix.elements].map((value) => Math.round(value * 1e6) / 1e6),
    calls: game.renderer.info.render.calls, renderFrame: game.renderer.info.render.frame,
    renderTarget: game.renderer.getRenderTarget()?.uuid ?? null, render: window.__gymRender?.last,
    actors: [
      actor(player, game.player, moves[0]),
      actor(trainer, game.npcs.find(({ id }) => id === trainerId)?.ch, moves[1]),
    ],
  };
}

function observeDraws() {
  const { game } = window.__ew;
  const { renderer, scene } = game;
  const restore = [];
  const probe = window.__gymRender = { last: null, stop() { for (const undo of restore) undo(); } };
  scene.traverse((node) => {
    if (!node.isMesh) return;
    const original = node.onBeforeRender;
    node.onBeforeRender = function (activeRenderer, activeScene, camera, ...args) {
      const at = performance.now();
      if (probe.last?.at !== at) probe.last = { at, frames: [], offscreen: [], drawn: [] };
      const last = probe.last;
      const frame = renderer.info.render.frame;
      if (!last.frames.includes(frame)) last.frames.push(frame);
      const target = activeRenderer.getRenderTarget();
      if (target && !last.offscreen.includes(target.uuid)) last.offscreen.push(target.uuid);
      if (activeScene === scene && camera === game.rig.cam && !target) last.drawn.push(node.uuid);
      return original.call(this, activeRenderer, activeScene, camera, ...args);
    };
    restore.push(() => { node.onBeforeRender = original; });
  });
}

function measureLayout() {
  const overlay = document.querySelector(".gym-overlay");
  const box = (el) => el.getBoundingClientRect().toJSON();
  const inside = (r) => r.left >= -0.5 && r.right <= innerWidth + 0.5 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5;
  const overlaps = (a, b) => a.left < b.right - 0.5 && a.right > b.left + 0.5 && a.top < b.bottom - 0.5 && a.bottom > b.top + 0.5;
  const shown = (el) => el.checkVisibility({ visibilityProperty: true, opacityProperty: true }) && el.getBoundingClientRect().width > 0;
  const controls = [...overlay.querySelectorAll("button")].filter(shown).map((el) => {
    const bounds = box(el);
    const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
    return {
      name: el.getAttribute("aria-label") ?? el.innerText.trim(), bounds,
      hit: el.contains(hit), accessible: !el.closest('[aria-hidden="true"], [inert]') && el.tabIndex >= 0,
      inside: inside(bounds), size: [el.offsetWidth, el.offsetHeight],
      overflow: el.scrollWidth - el.clientWidth, slot: el.dataset.slot,
    };
  });
  const boxes = [...overlay.querySelectorAll(".gym-header-bar, .gym-cue, .gym-ready, .gym-dock, .mode-score-card, .say-it-message:not(:empty)")].filter(shown);
  const obstacles = boxes.filter((el) => !el.matches(".say-it-message"));
  const problems = boxes.flatMap((el, i) => {
    const bounds = box(el);
    const issues = boxes.slice(i + 1).filter((other) => !el.contains(other) && !other.contains(el) && overlaps(bounds, box(other)))
      .map((other) => other.className);
    if (el.matches(".say-it-message")) issues.push(...controls.filter((b) => overlaps(bounds, b.bounds)).map((b) => b.name));
    if (!inside(bounds) || el.scrollWidth > el.clientWidth + 1) issues.push("overflow");
    return issues.length ? [{ el: el.className, bounds, issues }] : [];
  });
  for (const el of overlay.querySelectorAll(".gym-cue .nat, .gym-cue .lt, .kit-gloss-compact small, .say-it-message:not(:empty)")) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const parent = box(el.closest(".gym-cue") ?? el);
    for (const rect of range.getClientRects()) {
      if (!inside(rect) || rect.left < parent.left - 1 || rect.right > parent.right + 1
        || rect.top < parent.top - 1 || rect.bottom > parent.bottom + 1) problems.push({ clippedText: el.innerText });
    }
  }
  for (const icon of overlay.querySelectorAll(".say-it-badge, .say-it-sparkle")) {
    const bounds = box(icon), button = box(icon.closest("button"));
    if (bounds.left < button.left || bounds.right > button.right || bounds.top < button.top || bounds.bottom > button.bottom) {
      problems.push({ outsideMic: icon.getAttribute("class") });
    }
  }
  for (const [i, button] of controls.entries()) {
    for (const other of controls.slice(i + 1)) {
      if (overlaps(button.bounds, other.bounds)) problems.push({ button: button.name, other: other.name });
    }
  }
  return {
    width: innerWidth, height: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth,
    controls, problems, blocked: obstacles.map(box),
    free: [box(overlay.querySelector(".gym-header")).bottom, box(overlay.querySelector(".gym-bottom")).top],
  };
}

function checkMotion(moves, baseline, first, peak, description) {
  for (let i = 0; i < 2; i++) {
    const move = moves[i];
    const neutral = baseline.actors[i], early = first.actors[i], actor = peak.actors[i];
    const { joints: j, feet } = actor;
    const tilt = (joint, axis) => Math.abs(j[joint].angle[axis] - neutral.joints[joint].angle[axis]);
    const cycle = (joint) => distance(j[joint].angle, early.joints[joint].angle);
    const footGap = ({ feet: [l, r] }) => Math.hypot(l[0] - r[0], l[2] - r[2]);
    const nearFloor = feet.every((foot, side) => Math.abs(foot[1] - neutral.feet[side][1]) < 0.09);
    const bodyDrop = neutral.joints.legL.world[1] - j.legL.world[1];
    const shoulderDrop = neutral.joints.armL.world[1] - j.armL.world[1];
    const torso = j.armL.world.map((value, axis) => value - j.legL.world[axis]);
    const evidence = {
      jacks: tilt("armL", 2) > 0.12 && tilt("legL", 2) > 0.12 && footGap(actor) > footGap(neutral) + 0.20,
      toes: tilt("body", 0) > 0.75 && shoulderDrop > 0.15 && nearFloor,
      squats: tilt("shinL", 0) > 0.50 && bodyDrop > 0.16 && nearFloor,
      circles: tilt("armL", 2) > 0.12 && cycle("armL") > 0.12,
      run: (tilt("legL", 0) > 0.12 || tilt("shinL", 0) > 0.12) && cycle("legL") > 0.12 && cycle("legR") > 0.12,
      reach: tilt("armL", 0) > 0.75 && Math.abs(footGap(actor) - footGap(neutral)) < 0.06 && nearFloor,
      lunges: tilt("shinL", 0) > 0.5 && bodyDrop > 0.16 && footGap(actor) > footGap(neutral) + 0.20 && nearFloor,
      pushups: tilt("body", 0) > 1.0 && shoulderDrop > 0.65 && Math.abs(torso[1]) < Math.hypot(torso[0], torso[2]) * 0.4
        && nearFloor && cycle("foreL") > 0.12 && early.joints.armL.world[1] - j.armL.world[1] > 0.04,
    };
    assert(actor.same && actor.visible && early.same, description + " uses the original " + (i ? "trainer" : "learner") + " rig");
    assert.deepEqual(actor.meshes, neutral.meshes, description + " adds zero actor meshes");
    assert(evidence[move], description + " " + move + " joints " + JSON.stringify({ i, bodyDrop, shoulderDrop, torso, neutral, early, peak: actor }));
  }
}

function checkProjectedPose(moves, early, peak, description) {
  const midX = (box) => (box.left + box.right) / 2;
  for (const [i, actor] of peak.actors.entries()) {
    const { regions: r } = actor;
    const move = moves[i];
    const label = description + " " + move + " actor " + i;
    if (move === "lunges") {
      assert(r.shoeR.exposed && r.shoeR.left - r.shinL.right > 8, label + " rear shoe clears the lead leg");
      assert(midX(r.kneeR) - midX(r.kneeL) > 18, label + " knees are visibly separated");
    }
    for (const side of ["L", "R"]) {
      const knee = r["knee" + side], hand = r["hand" + side], hip = r["hip" + side];
      if (move === "squats") assert(knee.exposed && midX(knee) - midX(hip) > 4, label + " shows each bent knee");
      if (move === "lunges") assert(knee.exposed, label + " both knees face the camera");
      if (move === "reach") assert(hand.exposed && r.head.top - hand.top > 3, label + " each raised hand clears the crown");
      if (["toes", "squats", "reach", "lunges", "pushups"].includes(move)) {
        for (const sample of move === "pushups" ? [early.actors[i], actor] : [actor]) {
          const sole = sample.regions["shoe" + side].floor;
          assert(Math.abs(sole) < 0.020, label + " deformed sole stays on the floor: " + sole);
          if (move === "pushups") {
            const floor = sample.regions["fore" + side].floor;
            assert(floor >= -0.01 && floor < 0.020, label + " deformed palm contact: " + floor);
          }
        }
        if (move === "pushups") {
          assert(distance(early.actors[i].palms[side === "L" ? 0 : 1], actor.palms[side === "L" ? 0 : 1]) < 0.025,
            label + " loaded palm stays positioned as the shoulder lowers");
        }
      }
    }
  }
}

function checkNeutral(neutral, sample, description) {
  assert.equal(sample.pose, null, description + " has no active pose");
  for (const [i, actor] of sample.actors.entries()) {
    const before = neutral.actors[i];
    assert(actor.same && actor.visible && actor.anim === "idle" && Math.abs(actor.yaw - before.yaw) < 0.03,
      description + " original idle actor " + JSON.stringify(actor));
    for (const joint of ["body", "armL", "armR", "legL", "legR", "shinL", "shinR"]) {
      const { angle, local } = actor.joints[joint];
      const expected = before.joints[joint];
      assert(distance(angle, expected.angle) < 0.12 && distance(local, expected.local) < 0.04,
        description + " neutral " + joint + " " + JSON.stringify({ i, expected, angle, local }));
    }
  }
}

async function journey(browser, [width, height], audible) {
  const touch = width === 390;
  const silentDesktop = !audible && !touch;
  const size = width + "x" + height;
  const label = "PC-" + learner + " " + size + (audible ? " audible" : " silent");
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: touch, hasTouch: touch, deviceScaleFactor: touch ? 2 : 1,
    serviceWorkers: "block",
  });
  const errors = [];
  const bootWarnings = [];
  const blocked = [];
  const manifests = new Set();
  const failures = [];
  const deferred = new Set();
  let enteredGym = false;
  const isDeferredGym = (pathname) => /\/src\/(?:game\/gym\/(?:mode|poses|round|store)\.ts|(?:editions\/(?:es|es-lt)\/)?(?:content\/(?:gym(?:-lines)?\.ts|situations\/s35-gym\.ts)|tables\/s35-gym\.json|game\/world\/gym\.ts)|ui\/(?:Gym\.tsx|gym\.css))$/.test(pathname);
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== base.origin) {
      blocked.push(url.href);
      return route.abort("blockedbyclient");
    }
    if (isDeferredGym(url.pathname)) {
      deferred.add(url.pathname);
      if (!enteredGym) errors.push("early workout request: " + url.pathname);
    }
    const manifest = /\/(audio(?:-v2|-es)?)\/(manifest|repair-versions)\.json$/.exec(url.pathname);
    if (manifest) {
      if (manifest[2] === "manifest") manifests.add(manifest[1]);
      return route.fulfill({ json: {} });
    }
    if (/\/(?:audio|audio-v2|audio-es)\/[^/]+\.mp3$/.test(url.pathname)) {
      blocked.push(url.href);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  if (context.routeWebSocket) {
    await context.routeWebSocket(/^wss?:\/\//, (socket) => {
      const origin = new URL(socket.url()).origin.replace(/^ws/, "http");
      if (origin === base.origin) socket.connectToServer();
      else {
        blocked.push(socket.url());
        void socket.close();
      }
    });
  }
  try {
    await context.addInitScript(installControls, { key, progress, recognition: audible, storage, silentDesktop });
    const page = await context.newPage();
    page.setDefaultTimeout(7000);
    let seeded = false;
    page.on("requestfailed", (request) => failures.push([request.url(), request.failure()?.errorText]));
    page.on("pageerror", (error) => errors.push("pageerror: " + error.stack));
    page.on("console", (message) => {
      const type = message.type(), text = message.text();
      const diagnostic = type + ": " + text + " " + message.location().url;
      // Game creates Three's existing Clock at boot, before any map, picker or gym action.
      if (!seeded && !bootWarnings.length && type === "warning" && text === "THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.") {
        bootWarnings.push(diagnostic);
      } else if (type === "error" || type === "warning") errors.push(diagnostic);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) errors.push("HTTP " + response.status() + " " + response.url());
    });

    let stepName = "load seeded gym";
    const read = () => page.evaluate(() => window.__gym?.state() ?? null);
    const audio = () => page.evaluate(() => window.__gymAudio.requests);
    const micState = () => page.evaluate(() => window.__gymMic);
    const now = () => page.evaluate(() => performance.now());
    const step = (n = 1, dt = 50) => page.evaluate(([n, dt]) => window.__step(n, dt), [n, dt]);
    let lastKey = null;
    const diagnostics = async () => {
      const last = await page.evaluate((key) => {
        const { game, store, audio } = window.__ew ?? {};
        const s = store?.getState();
        const box = document.querySelector(".gym-overlay, .ended-box, .convo, .sheet, .hud");
        return {
          at: performance.now(), gym: window.__gym?.state(), phase: box?.getAttribute("data-phase"),
          dom: box?.innerText.slice(0, 1100), enabledChoices: document.querySelectorAll(".gym-choices button:enabled").length,
          screen: s?.screen, zone: game?.zone?.id, camera: game?.rig.mode, position: game?.player.root.position.toArray(),
          prompt: s?.hud.prompt, panel: s?.hud.panel, mode: s?.hud.modeScreen, fade: s?.hud.fade,
          conversation: s?.conv.active ? { phase: s.conv.phase, step: s.conv.stepId, speaking: s.conv.speaking, audioState: audio?.getState() } : null,
          count: s?.progress.play?.games.gym, saved: JSON.parse(localStorage.getItem(key) ?? "null")?.play?.games.gym,
          volume: audio?.volume, audio: window.__gymAudio?.requests.slice(-5), mic: window.__gymMic, handoff: window.__gymHandoffs?.at(-1),
        };
      }, key).catch((error) => ({ diagnostics: error.message }));
      return JSON.stringify({ layer: learner, key: lastKey, last, errors, blocked, bootWarnings, failures, deferred: [...deferred] });
    };
    const wait = async (description, predicate, { frames = 1, timeout = 15000, attempts = 180 } = {}) => {
      stepName = description;
      const deadline = Date.now() + timeout;
      for (let i = 0; i < attempts && Date.now() < deadline; i++) {
        if (await predicate()) return;
        // Each evaluation yields to React, imports, ResizeObserver and native speech/save callbacks.
        await step(frames);
      }
      assert.fail(description);
    };
    const waitNative = async (description, predicate) => {
      stepName = description;
      const deadline = Date.now() + 5000;
      do {
        if (await predicate()) return;
        await new Promise((resolve) => setTimeout(resolve, 20));
      } while (Date.now() < deadline);
      assert.fail(description);
    };
    const check = (description, detail) => console.log("ok", label, description, JSON.stringify(detail));
    const overlay = page.locator(".gym-overlay");
    const action = (id) => overlay.locator('button[data-gym-action="' + id + '"]');
    const choices = overlay.locator(".gym-choices button[data-slot][data-move]");
    const tile = (move) => choices.and(page.locator('[data-move="' + move + '"]'));
    const enabled = choices.and(page.locator(":enabled"));
    const scoreCard = page.locator(".gym-result .mode-score-card");
    const bonus = page.locator(".gym-overlay .say-it");
    const mic = bonus.locator(".say-it-mic");
    const caption = overlay.locator("[data-gym-target]");
    const prompt = page.locator("button.prompt");
    const rig = (project = false, moves) => page.evaluate(sampleRigs, { project, moves });
    const press = (locator) => touch ? locator.tap() : locator.click();
    const keyPress = async (key) => { lastKey = key; await page.keyboard.press(key); };
    const keyDown = async (key) => { lastKey = key; await page.keyboard.down(key); };
    const seenShots = new Set();
    const shot = async (name) => {
      assert(!seenShots.has(name), "duplicate review frame " + name);
      seenShots.add(name);
      if (!shots) return;
      const dir = join(shots, learner, size, audible ? "audible" : "silent");
      await mkdir(dir, { recursive: true });
      await page.screenshot({ path: join(dir, name + ".png"), animations: name === "11-mic-hit" ? "allow" : "disabled", timeout: 7000 });
    };

    try {
      await page.goto(base.href, { waitUntil: "domcontentloaded", timeout: 30000 });
      const edition = await page.evaluate(async (key) => {
        const { EDITION } = await import(new URL("/src/edition.ts", location.href).href);
        return { id: EDITION.id, target: EDITION.target, helper: EDITION.helper, storage: EDITION.storage,
          saved: JSON.parse(localStorage.getItem(key) ?? "null")?.play?.games?.gym, lang: document.documentElement.lang };
      }, key);
      assert.deepEqual(edition, { id: "es", target: fixture.target, helper: learner, storage, saved: baseline, lang: learner });
      await wait("the seeded low-quality 3D gym loads at the real mat", () => page.evaluate(() => {
        const { game, store } = window.__ew ?? {};
        return store?.getState().screen === "play" && game.zone?.id === "gym" && !game.transitioning
          && game.renderer?.info.render.calls > 0 && store.getState().hud.prompt?.kind === "gym";
      }), { frames: 3, attempts: 6000, timeout: 120000 });
      assert.deepEqual([...deferred], [], "real room boots cold before any workout action");
      seeded = true;
      if (bootWarnings.length) console.log(label, "existing town boot warning", ...bootWarnings);
      const initial = await page.evaluate(() => {
        const { game, store, audio } = window.__ew;
        const { settings, hud, progress } = store.getState();
        return {
          position: game.player.root.position.toArray(), camera: game.rig.mode, touch: hud.showTouch,
          play: settings.play, quality: settings.quality, scenes: settings.scenes, volume: audio.volume,
          completed: progress.sits["s35-gym"]?.completions ?? 0, coach: progress.coach.done, dpr: devicePixelRatio,
        };
      });
      assert(distance(initial.position, [mat.x, 0, mat.z]) < 0.02, JSON.stringify(initial));
      assert.deepEqual({ ...initial, position: undefined }, {
        position: undefined, camera: "interior", touch, play: "town", quality: "low", scenes: false,
        volume: 0.8, completed: 0, coach: true, dpr: touch ? 2 : 1,
      });
      await page.evaluate(async () => {
        await Promise.all([window.__ew.audio.init(), document.fonts.ready]);
      });
      assert.deepEqual([...manifests], ["audio-es"], "only the PC manifest is loaded");
      const { ui, entry, speech } = fixture;
      await page.evaluate(observeAudio, {
        entries: authored, fixture: { voice: fixture.voice, speed: fixture.speed }, audible, silentDesktop, situation,
      });
      await page.evaluate(observeHandoffs, fixture.trainer);
      const handoff = () => page.evaluate(() => ({
        entries: window.__gymHandoffs.length,
        ...window.__gymHandoffs.at(-1),
      }));
      let entries = 0;
      let muted = false;

      const counts = () => page.evaluate((key) => ({
        live: window.__ew.store.getState().progress.play?.games.gym ?? 0,
        saved: JSON.parse(localStorage.getItem(key) ?? "null")?.play?.games.gym ?? 0,
      }), key);
      const countIs = async (expected) => {
        assert.equal((await counts()).live, expected, "live gym count at " + stepName);
        await waitNative("gym Start count is saved as " + expected, async () => (await counts()).saved === expected);
        assert.deepEqual(await counts(), { live: expected, saved: expected });
      };
      let count = baseline;
      const phase = (name, index) => wait(name + (index ? " on call " + index : ""), async () => {
        const s = await read();
        return s?.phase === name && (index === undefined || s.index === index)
          && await overlay.getAttribute("data-phase") === name;
      });
      const fit = async (stage, sample, figures = true) => {
        const layout = await page.evaluate(measureLayout);
        assert.equal(layout.width, width, stage + " viewport");
        assert.equal(layout.height, height, stage + " viewport");
        assert(layout.overflow <= 1 && layout.problems.length === 0, stage + " layout " + JSON.stringify(layout));
        assert.equal(layout.controls.length, await overlay.locator("button").count(), stage + " all controls visible");
        assert(layout.controls.length > 0, stage + " visible controls");
        for (const button of layout.controls) {
          assert(button.name && button.hit && button.accessible && button.inside && button.size.every((px) => px >= 44) && button.overflow <= 1,
            stage + " button fit " + JSON.stringify(button));
        }
        const tiles = layout.controls.filter((button) => button.slot);
        if (tiles.length) {
          assert.equal(tiles.length, 4);
          const row = (i, j) => Math.abs(tiles[i].bounds.top - tiles[j].bounds.top) < 1 && tiles[i].bounds.left < tiles[j].bounds.left;
          assert(touch
            ? row(0, 1) && row(2, 3) && tiles[0].bounds.bottom < tiles[2].bounds.top
              && Math.abs(tiles[0].bounds.left - tiles[2].bounds.left) < 1 && Math.abs(tiles[1].bounds.left - tiles[3].bounds.left) < 1
            : row(0, 1) && row(1, 2) && row(2, 3), stage + " choice tiles in reading order " + JSON.stringify(tiles));
        }
        if (figures) {
          sample ??= await rig(true);
          const [top, bottom] = layout.free;
          for (const actor of sample.actors) {
            const b = actor.silhouette;
            assert(actor.same && actor.visible && sample.camera === "stage" && !b.clipped
              && b.left >= 0 && b.right <= width && b.top >= top && b.bottom <= bottom && b.bottom - b.top > 30,
            stage + " full original actor clears the cards " + JSON.stringify({ free: layout.free, b, camera: sample.camera }));
            for (const name of ["head", "handL", "handR", "kneeL", "kneeR", "shoeL", "shoeR"]) {
              const region = actor.regions[name];
              assert(region.vertices > 0 && region.clear && region.left >= 0 && region.right <= width
                && region.top >= top && region.bottom <= bottom,
              stage + " actual " + name + " geometry clears the room (including ring/ropes) and dock " + JSON.stringify(region));
            }
            if (sample.render?.at === sample.at) {
              assert(actor.painted.some((uuid) => sample.render.drawn.includes(uuid)), stage + " the renderer draws this actor's skinned geometry");
            }
            for (const [x, y, z] of [actor.face, ...actor.shoes]) {
              assert(x > 0 && x < width && y > top && y < bottom && z > -1 && z < 1, stage + " face/feet " + JSON.stringify({ x, y, z, top, bottom }));
            }
          }
          assert(Math.abs(sample.actors[0].face[0] - sample.actors[1].face[0]) > width * 0.06, stage + " both faces separated");
        }
        assert.equal(await page.locator(noHud).and(page.locator(":visible")).count(), 0, stage + " no walking HUD");
      };
      const openTool = async (panel) => {
        const menu = page.locator('.toolbar .ride-menu[aria-expanded="false"]');
        if (await menu.count()) await press(menu);
        const tools = page.locator(".toolbar-tools button.icon-btn");
        const title = { scenarios: fixture.scenariosTool, map: fixture.mapTool, settings: fixture.settingsTool }[panel];
        await press(tools.and(page.locator('[title="' + title + '"]')));
      };
      const muteThroughSettings = async () => {
        await openTool("settings");
        const settings = page.locator(".sheet").filter({ has: page.locator(".settings-grid") });
        const volume = settings.locator(".set-row").filter({ has: page.getByText(fixture.volume, { exact: true }) }).getByRole("slider");
        assert.equal(await volume.inputValue(), "0.8");
        await volume.press("Home");
        assert.equal(await volume.inputValue(), "0");
        assert.equal(await page.evaluate(() => window.__ew.audio.volume), 0);
        muted = true;
        await press(settings.locator(".close-x"));
      };
      const gymCard = page.locator('.sheet.scenarios .scn-card[data-sit="s35-gym"]');
      const pickerGuide = page.locator(".sheet.scenarios .scn-foot").getByRole("button", { name: entry.listAction, exact: true });
      const listing = async () => {
        await openTool("scenarios");
        await wait("3D picker and s35 card", () => gymCard.isVisible());
        const sheet = page.locator(".sheet.scenarios");
        const ids = await sheet.locator(".scn-card").evaluateAll((cards) => cards.map((card) => card.dataset.sit));
        const expected = await page.evaluate(() => window.__ew.game.orderedSituations().map(({ id }) => id));
        assert.equal(expected.length, 51, "PC keeps the base route size");
        assert.equal(new Set(ids).size, expected.length, "one distinct card id per scenario");
        const starterCards = ["s72-cafe", "s66-taxi", "s68-hotel", "s75-pharmacy", "s74-clothes", "s90-running-late", "s84-date"];
        assert.equal(ids.length, expected.length + starterCards.filter((id) => expected.includes(id)).length,
          "the optional footer preserves starter and main card counts");
        assert(ids.every((id) => expected.includes(id)), "the mat listing is outside the scenario cards");
        assert.equal(await gymCard.count(), 1);
        assert.equal(await gymCard.locator("b").innerText(), fixture.card);
        assert.equal(await gymCard.locator("i").innerText(), fixture.title);
        assert((await gymCard.innerText()).includes(fixture.name));
        assert(await pickerGuide.isVisible());
        assert(await pickerGuide.evaluate((b) => b.offsetWidth >= 44 && b.offsetHeight >= 44));
      };
      const matEntry = async () => {
        await wait("mat prompt is visible", () => prompt.isVisible());
        assert.equal(await prompt.locator(".prompt-text").innerText(), entry.startLabel);
        assert.equal(await page.locator("button.prompt.touch").count(), Number(touch));
        if (touch) {
          const actionButton = page.locator(".act-btn").and(page.getByRole("button", { name: entry.startLabel, exact: true }));
          assert(await actionButton.evaluate((b) => {
            const r = b.getBoundingClientRect();
            return r.width >= 44 && r.height >= 44 && b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          }));
        }
        enteredGym = true;
        if (touch) await press(prompt);
        else await keyPress("e");
      };
      const ready = async () => {
        await wait("lazy workout entry reaches ready", async () =>
          (await read())?.phase === "ready" && await overlay.getAttribute("data-phase") === "ready",
        { attempts: 1800, timeout: 30000 });
        const trace = await handoff();
        assert.equal(trace.entries, ++entries, "one fresh actor capture per gym entry");
        assert.equal(trace.release, undefined, "gym owns the original two actors");
        assert(trace.entry.player && trace.entry.trainer);
        const sample = await rig();
        assert.equal(sample.camera, "stage");
        const positions = [[-7.54, 0, 2.64], [-5.90, 0, 2.64]];
        for (const [i, actor] of sample.actors.entries()) {
          assert(actor.same && distance(actor.root, positions[i]) < 0.02 && Math.abs(actor.yaw) < 0.02,
            "PC mat stage roots face along +Z " + JSON.stringify({ i, root: actor.root, yaw: actor.yaw }));
        }
        assert.deepEqual(sample.eye, [-6.72, 1.55, touch ? 6.64 : 6.40]);
        assert.equal(sample.fov, touch ? 62 : 44);
        for (const path of ["/src/game/gym/mode.ts", "/src/game/gym/poses.ts", "/src/ui/Gym.tsx", "/src/ui/gym.css",
          "/src/editions/es/content/gym-lines.ts", "/src/editions/es/content/situations/s35-gym.ts",
          ...(learner === "lt" ? ["/src/editions/es-lt/tables/s35-gym.json"] : [])]) {
          assert(deferred.has(path), "cold entry fetches " + path);
        }
        assert.equal(await overlay.getAttribute("lang"), learner);
        assert.equal(await overlay.locator(".gym-ready h2").innerText(), ui.readyTitle);
        assert.equal(await overlay.locator(".gym-ready p").innerText(), touch ? ui.readyTouch : ui.readyKeys);
        assert.equal(await action("start").innerText(), ui.start);
        assert.equal(await action("exit").innerText(), ui.exit);
        assert.deepEqual((await read()).score, zero);
        assert.equal(await bonus.count(), 0);
        await countIs(count);
        await fit("ready");
        const blank = await page.evaluate(() => {
          const overlay = document.querySelector(".gym-overlay");
          const x = innerWidth * 0.5, y = innerHeight * 0.5;
          const canvas = window.__ew.game.renderer.domElement;
          window.__gymCanvasPointers = 0;
          if (!canvas.dataset.gymProbe) {
            canvas.dataset.gymProbe = "true";
            canvas.addEventListener("pointerdown", () => { window.__gymCanvasPointers++; }, { passive: true });
          }
          return { x, y, hit: document.elementFromPoint(x, y) === overlay };
        });
        assert(blank.hit, "the open lane belongs to the overlay");
        if (touch) await page.touchscreen.tap(blank.x, blank.y);
        else await page.mouse.click(blank.x, blank.y);
        assert.equal(await page.evaluate(() => window.__gymCanvasPointers), 0, "an empty overlay tap never reaches the scene");
        assert.equal((await read()).phase, "ready");
      };

      const expectedAudio = [];
      let listeningNeutral;
      const request = async (id, kind = audible ? "gate" : "real") => {
        expectedAudio.push(id);
        const requests = await audio();
        assert.deepEqual(requests.map((r) => r.text), expectedAudio.map((id) => lines[id].say), "trainer audio order");
        const last = requests.at(-1);
        const { voice, speed, text, optional, recordingOnly, freshSignal, slow, male, mic, kind: boundary } = last;
        assert.deepEqual({ voice, speed, text, optional, recordingOnly, freshSignal, slow, male, mic, boundary }, {
          voice: fixture.voice, speed: fixture.speed, text: lines[id].say, optional: true,
          recordingOnly: true, freshSignal: true, slow: false, male: fixture.male, mic: false, boundary: kind,
        }, id + " recorded request while microphone is released");
        return last;
      };
      const override = (id, options) => page.evaluate((settings) => { window.__gymAudio.next = settings; }, { text: lines[id].say, ...options });
      const checkLine = async (id, full, explicit = false) => {
        const line = lines[id];
        const cue = overlay.locator('.gym-cue[data-line="' + id + '"]');
        assert(await cue.isVisible(), id + " visible cue");
        const interlinear = cue.locator(".il");
        if (await interlinear.count()) {
          assert.equal(await interlinear.getAttribute("lang"), fixture.target.split("-")[0]);
          const seen = await cue.locator(".u").evaluateAll((units) => units.map((unit) => {
            const [target, gloss] = unit.children;
            return [target.firstChild.textContent.trim(), gloss?.innerText.trim(), gloss?.lang];
          }));
          assert.deepEqual(seen, line.units.map((text, i) => [text, full ? line.gloss[i] : undefined, full ? learner : undefined]),
            id + " exact visible target and aligned learner-language gloss");
          const natural = cue.locator(".nat");
          const distinct = line.gloss.join(" ").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase()
            !== line.natural.replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
          assert.equal(await natural.count(), Number(full && (explicit || distinct)), id + " natural translation presence");
          if (await natural.count()) {
            assert.equal(await natural.innerText(), line.natural);
            assert.equal(await natural.getAttribute("lang"), learner);
          }
        } else {
          const compact = cue.locator(".kit-gloss-compact");
          assert.equal(await compact.locator("span").innerText(), line.target);
          assert.equal(await compact.locator("span").getAttribute("lang"), fixture.target.split("-")[0]);
          assert.equal(await compact.locator("small").innerText(), line.natural);
          assert.equal(await compact.locator("small").getAttribute("lang"), learner);
        }
      };
      const chosen = async (i, move, level, { full = level === 0 || !audible, reveal = false } = {}) => {
        await phase("choose", i + 1);
        const s = await read();
        assert.equal(s.callId, move);
        assert.equal(s.helpLevel, level);
        assert.equal(s.audible, audible);
        assert.equal(s.fallback, !audible);
        assert.equal(s.revealed, reveal);
        assert.equal(await overlay.locator(".gym-progress").innerText(), ui.progress(i + 1));
        assert.equal(await overlay.locator(".gym-choices").getAttribute("aria-label"), ui.choices);
        assert.equal(await enabled.count(), 4);
        const layout = await choices.evaluateAll((buttons) => buttons.map((b) => ({
          slot: +b.dataset.slot, move: b.dataset.move, label: b.getAttribute("aria-label"),
          keys: b.getAttribute("aria-keyshortcuts"), shown: getComputedStyle(b.querySelector("kbd")).display !== "none",
          shortcut: b.querySelector("kbd").textContent,
        })));
        const options = expectedOptions(move, slots[i]);
        assert.deepEqual(s.options, options);
        assert.deepEqual(layout, options.map((id, j) => ({ slot: j + 1, move: id, label: fixture.labels[id],
          keys: (j + 1) + " " + arrows[j], shown: !touch, shortcut: (j + 1) + " / " + glyphs[j] })));
        const hint = choices.and(page.locator('[data-hint="true"]'));
        assert.equal(await hint.count(), level === 0 ? 1 : 0);
        if (level === 0) {
          assert.equal(await hint.getAttribute("data-move"), move);
          const rings = await choices.evaluateAll((buttons) => buttons.map((button) => getComputedStyle(button).boxShadow));
          assert.equal(rings.filter((shadow) => shadow !== "none").length, 1, "only the matching tile has a painted ring");
        }
        const id = "gy_" + move;
        assert.equal(await caption.count(), (full || level < 2) ? 1 : 0);
        assert.equal(await overlay.locator("[data-gym-gloss]").count(), Number(full));
        if (full || level < 2) {
          assert.equal(await caption.getAttribute("data-gym-target"), lines[id].target);
          if (full) assert.equal(await caption.getAttribute("data-gym-gloss"), lines[id].natural);
          await checkLine(id, full, reveal);
        } else assert.equal(await overlay.locator(".gym-cue[data-line]").count(), 0, "hidden calls have no readable cue");
        assert.equal(await action("replay").innerText(), ui.replay);
        assert.equal(await action("reveal").innerText(), ui.reveal);
        assert.equal(await action("reveal").getAttribute("aria-pressed"), String(reveal));
        assert.equal(await bonus.count(), Number(audible), "optional mic support");
        await fit("choose " + (i + 1) + " " + move, undefined, false);
        return s;
      };
      const begin = async (index = 1, again = false) => {
        await press(again ? scoreCard.getByRole("button", { name: ui.again, exact: true }) : action("start"));
        count++;
        await phase("intro");
        const intro = await request("gy_intro");
        assert.deepEqual((await read()).score, zero);
        assert.equal(await choices.count(), 0);
        assert.equal(await bonus.count(), 0);
        await checkLine("gy_intro", true);
        await countIs(count);
        await stepTo(intro.at + 950);
        assert(await overlay.locator('.gym-cue[data-line="gy_intro"]').isVisible(), "intro is still readable at 950 ms");
        await phase("listen", index);
        assert(await now() - intro.at >= 1000, "intro has at least one stepped second");
      };
      const stepTo = async (at) => {
        const frames = (at - await now()) / 50;
        assert(Number.isInteger(frames) && frames >= 0, "sample is on the stepped clock: " + JSON.stringify({ at, frames }));
        if (frames) await step(frames);
      };
      const listening = async (i, id, { kind, checkKeys = false, replay = false, snapshot = false } = {}) => {
        await phase("listen", i + 1);
        const clip = await request(id, kind);
        if (!replay) assert.equal(clip.chooseEnabled, 0, "request precedes enabling a fresh call");
        assert.equal(await enabled.count(), 0);
        if (!replay) assert.equal(await caption.count(), 0, "no automatic target or gloss while listening");
        assert.equal(await bonus.count(), 0);
        if (snapshot) {
          await fit("listen");
          await shot("02-listen");
        }
        if (checkKeys) {
          const start = await read();
          for (const input of ["1", "ArrowLeft", "2", "ArrowUp", "3", "ArrowDown", "4", "ArrowRight"]) {
            await keyDown(input);
            await keyDown(input);
            await page.keyboard.up(input);
          }
          await step(6); // 300 stepped ms: the minimum cannot already have elapsed.
          assert.deepEqual(await read(), start, "regular and repeated keys are ignored during listen");
          assert.equal(await enabled.count(), 0);
          assert.equal(await caption.count(), 0);
          listeningNeutral = await rig();
        }
        return clip;
      };
      const heard = async (i, move, level, clip, options) => {
        const s = await chosen(i, move, level, options);
        assert.equal(clip.volume, muted ? 0 : 0.8, "playback sees the actual selected volume");
        const settled = (await audio()).find(({ at, text }) => at === clip.at && text === clip.text);
        assert(await now() - clip.at >= 350, "choose waits at least 350 ms of game time");
        assert(settled.ended !== undefined && settled.ended <= await now(), "choose waits for clip result");
        if (settled.kind === "gate") {
          assert.equal(settled.ok, true);
          assert.equal(settled.ended, settled.releaseAt);
          assert.equal(settled.aborted, undefined, "successful recording is not cut off");
        } else if (settled.kind === "real") {
          assert.equal(settled.ok, false, "actual local manifest miss completes without audio");
          assert.equal(settled.aborted, undefined, "actual manifest miss settles before the safety deadline");
        }
        return s;
      };

      const assertClosed = async (zone = "gym") => {
        await wait("walking and camera restored in " + zone, () => page.evaluate((zone) => {
          const { game, store } = window.__ew;
          return game.zone.id === zone && !game.transitioning && !game.modes.engaged && !game.modes.active
            && !store.getState().hud.modeScreen && !store.getState().conv.active && !window.__gym
            && game.rig.mode === (zone === "gym" ? "interior" : "follow") && game.rig.stage === null;
        }, zone), zone === "town" ? { frames: 2, attempts: 600 } : undefined);
        await wait("ordinary walking HUD is visible", async () => await page.locator(".toolbar").isVisible()
          && await page.locator(".minimap").isVisible() && (!touch || await page.locator(".joy").isVisible()));
        assert.equal(await page.locator(".gym-overlay, .say-it, .mode-score-card").count(), 0);
        assert.equal((await micState()).active, false);
      };
      const restored = async (reason, done = false) => {
        await assertClosed();
        stepName = reason + " actor and camera handoff";
        const { entry: home, release, sameActors, sameCamera } = await handoff();
        assert(release && release.at > home.at && sameActors && sameCamera, "release captures the original live actors and camera");
        assert.deepEqual(release.trainer, home.trainer, "trainer pose, gaze and animation flags at release");
        const playerHome = done ? { ...home.player, position: [mat.x, 0, mat.z] } : home.player;
        assert.deepEqual(release.player, playerHome, "learner transform, pose and flags at release");
        assert.deepEqual(release.camera, home.camera, "walking camera mode, shift and lens at release");
        await wait("the ordinary room animator updates the released trainer", async () => {
          const { actors: [player, trainer] } = await rig();
          assert(player.same && trainer.same && player.visible && trainer.visible === home.trainer.visible);
          assert(distance(trainer.root, home.trainer.position) < 0.01);
          return ["armL", "armR", "head", "body"].some((id) => distance(trainer.joints[id].angle,
            release.trainer.joints[id].rotation.slice(0, 3)) > 1e-5);
        }, { attempts: 60 });
        await countIs(count);
        check(reason, { entryAt: home.at, releaseAt: release.at, fidgets: release.trainer.fidgets });
      };
      const exit = () => touch ? press(action("exit")) : keyPress("Escape");
      const position = () => page.evaluate(() => window.__ew.game.player.root.position.toArray());
      const walk = async (key, dx, dy, advance) => {
        if (!touch) {
          await keyDown(key);
          try { await advance(); } finally { await page.keyboard.up(key); }
          return;
        }
        const joy = await page.locator(".joy").boundingBox();
        assert(joy, "the real walking stick is available");
        const cdp = await context.newCDPSession(page);
        const x = joy.x + joy.width / 2, y = joy.y + joy.height / 2;
        try {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
          await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx, y: y + dy }] });
          await advance();
        } finally {
          await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
          await cdp.detach();
        }
      };
      const leaveRoom = async (reviewFrames) => {
        if (reviewFrames) await shot("14-back-in-gym");
        const [doorX, doorZ] = await page.evaluate(() => {
          const { x, z } = window.__ew.game.zone.interior.exit;
          return [x, z];
        });
        await walk("s", 0, 48, () => wait("walk south of the ring into the door aisle", async () =>
          (await position())[2] >= doorZ - 1.1, { frames: 2, attempts: 100 }));
        await step(8);
        await walk("d", 48, 0, () => wait("walk along the aisle to the real exit", async () =>
          (await position())[0] >= doorX - 1.0, { frames: 2, attempts: 100 }));
        await wait("the ordinary room exit prompt is visible", async () => await prompt.isVisible()
          && await page.evaluate(() => window.__ew.store.getState().hud.prompt?.kind === "exit"));
        if (touch) await press(prompt);
        else await keyPress("e");
        await assertClosed("town");
        await wait("the town door fade clears", () => page.evaluate(() => {
          const fade = document.querySelector(".fade");
          return !fade || +getComputedStyle(fade).opacity < 0.02;
        }));
        await wait("automatic step out has settled before testing walking", () => page.evaluate(() => {
          const { game } = window.__ew;
          return game.stepOut === 0 && game.vel.lengthSq() < 0.01;
        }));
        if (reviewFrames) await shot("15-town");
        const before = await position();
        await walk("d", 0, -48, () => step(14));
        const after = await position();
        assert(Math.hypot(after[0] - before[0], after[2] - before[2]) > 0.25, "walking after the door " + JSON.stringify({ before, after }));
        await countIs(count);
      };

      if (audible) {
        await walk("s", 0, 48, () => step(8));
        await step(8);
        await listing();
        await press(pickerGuide);
        assert.deepEqual(await page.evaluate(() => {
          const { game, store } = window.__ew;
          const at = game.autoPath?.at(-1);
          return { panel: store.getState().hud.panel, zone: game.zone.id, kind: game.autoTarget?.kind, at };
        }), { panel: null, zone: "gym", kind: "point", at: [mat.x, mat.z] }, "picker footer plans a walk to the real mat");
        await wait("picker guidance settles at the mat without launching gym", async () =>
          await prompt.isVisible() && await page.evaluate(() => !window.__ew.game.autoTarget && !window.__gym));
        await openTool("map");
        const map = page.locator(".sheet").filter({ has: page.locator(".map-wrap") });
        await wait("town map opens", () => map.isVisible());
        await press(map.getByRole("button", { name: fixture.place, exact: true }));
        assert.equal(await map.locator(".place-title").innerText(), fixture.place);
        assert(await map.getByText(entry.mapLabel, { exact: true }).isVisible());
        assert.equal(await map.locator('.sit-card[data-sit="s35-gym"]').count(), 1);
        await press(map.locator(".close-x"));
        await wait("visible mat prompt after closing the map", () => prompt.isVisible());
        await shot("00-entry");
        await matEntry();
        await ready();
        await shot("01-ready");
        assert.equal((await audio()).length, 0, "ready is quiet");
        check("picker, map clue and mat ready", { count });
      } else {
        assert(await page.evaluate(([voice, speed, texts]) => {
          const { audio } = window.__ew;
          return audio.ready && texts.every((text) => !audio.hasClip(voice, speed, text));
        }, [fixture.voice, fixture.speed, authored.map(([text]) => text)]), "the initialized local manifest has no gym recording");
        await matEntry();
        await ready();
        if (!touch) await keyDown("e");
        await exit();
        await restored("free ready exit");
        if (!touch) {
          await keyDown("e");
          await keyDown("e");
          await step(4);
          await page.keyboard.up("e");
          assert(await prompt.isVisible(), "held interaction key cannot open a scene after leaving gym");
          assert.equal(await read(), null);
          assert.equal(await page.locator(".convo").count(), 0);
          await countIs(count);
        }
        await matEntry();
        await ready();
        const id = "gy_jacks";
        await override(id, { stall: true, manifest: 2.1 });
        await begin();
        const stall = await listening(0, id, { kind: "stall" });
        await step(47);
        assert.equal((await read()).phase, "listen", "a pending recording waits past two seconds");
        assert.equal(await enabled.count(), 0);
        await heard(0, "jacks", 0, stall);
        const aborted = (await audio()).at(-1);
        assert(aborted.aborted - stall.at >= 2850 && aborted.aborted - stall.at <= 2900 && aborted.ok === false,
          "game-clock deadline considers the manifest duration " + JSON.stringify(aborted));
        await override(id, { stall: true, manifest: 2.1 });
        await press(action("replay"));
        const early = await listening(0, id, { kind: "stall", replay: true });
        await step(4);
        await exit();
        await restored("stalled replay exit");
        const cancelled = (await audio()).at(-1);
        assert(cancelled.aborted - early.at < 350 && cancelled.ok === false, "exit aborts only its pending replay " + JSON.stringify(cancelled));
        await step(60);
        assert.equal(await read(), null, "stale playback cannot re-open the overlay");
        // The primary touch run covers actual volume zero; desktop stays at normal gain for s35's reading journey.
        if (touch) await muteThroughSettings();
        await matEntry();
        await ready();
        check("silent safety deadline and aborted replay on early exit", { aborted, cancelled, count });
      }

      await page.evaluate(observeDraws);
      await begin();
      const used = { touch: new Set(), number: new Set(), arrow: new Set(), desktop: new Set() };
      const introduced = new Set();
      let neutral;
      const result = { ...zero };
      let closing;
      // Click a disabled tile at the real screen position to detect a second tap being scored.
      const pressDisabled = async (move) => {
        const b = await tile(move).boundingBox();
        const x = b.x + b.width / 2, y = b.y + b.height / 2;
        if (touch) await page.touchscreen.tap(x, y);
        else await page.mouse.click(x, y);
      };
      const selectMove = async (move, i) => {
        const button = tile(move);
        const slot = Number(await button.getAttribute("data-slot"));
        assert.equal(slot, slots[i]);
        if (!touch) used.desktop.add(slot);
        assert.equal(await overlay.getByRole("button", { name: fixture.labels[move], exact: true }).count(), 1);
        if (touch) {
          used.touch.add(slot);
          await press(button);
        } else if (audible || i > 1) {
          const method = i % 2 ? "arrow" : "number";
          used[method].add(slot);
          await keyPress(method === "arrow" ? arrows[slot - 1] : String(slot));
        } else if (i === 0 || i === 1) {
          await (i === 0 ? action("exit") : choices.nth(slot - 2)).focus();
          await keyPress("Tab");
          assert(await button.evaluate((el) => document.activeElement === el), "Tab reaches the choice in DOM order");
          await keyPress(i === 0 ? "Enter" : "Space");
        }
      };

      const reveal = async (id) => {
        const before = await read();
        await press(action("reveal"));
        await wait("explicit words shown for " + id, () => overlay.locator("[data-gym-gloss]").isVisible());
        assert.deepEqual(await read(), { ...before, revealed: true }, "showing words changes only visibility");
        assert.equal(await action("reveal").getAttribute("aria-pressed"), "true");
        await checkLine(id, true, true);
        await countIs(count);
      };
      const replay = async (i, id, level, revealed = false) => {
        const before = await read();
        await press(action("replay"));
        const clip = await listening(i, id, { replay: true });
        assert.equal(clip.text, lines[id].say);
        await heard(i, before.callId, level, clip, { full: level === 0 || revealed, reveal: revealed });
        assert.deepEqual(await read(), before, "replay returns to the same call, slots, help and score");
        await countIs(count);
      };
      const startMic = async () => {
        const before = await micState();
        const button = bonus.getByRole("button", { name: speech.mic, exact: true });
        await press(button);
        await waitNative("the fake recognizer starts after the mic button", async () => (await micState()).starts.length === before.starts.length + 1);
        const open = await micState();
        assert.equal(open.starts.at(-1), fixture.target);
        assert(open.active);
        assert.equal(await mic.getAttribute("aria-label"), speech.micStop);
        assert.equal(await bonus.getAttribute("data-status"), "listening");
      };
      const speak = async (text, status, { prefixPause = false } = {}) => {
        const before = await read();
        const requests = (await audio()).length;
        await startMic();
        if (prefixPause) {
          const allowanceMs = 15_000;
          const latestMissMs = allowanceMs + 5_000;
          const open = await micState();
          stepName = "shared SayIt keeps listening after the Spanish prefix";
          const injectedAt = await page.evaluate((text) => {
            const at = Date.now(); // The fake dispatches the final result and speechend synchronously.
            window.__sayItHear(text);
            return at;
          }, text);
          let checkedPause = false;
          let sample;
          for (;;) {
            sample = await bonus.evaluate((el, at) => ({
              status: el.getAttribute("data-status"), elapsedMs: Date.now() - at,
            }), injectedAt);
            if (!checkedPause && sample.elapsedMs >= 5_000) {
              assert(sample.elapsedMs < allowanceMs, "the listening checkpoint is within the prefix allowance");
              assert.equal(sample.status, "listening", "the mic is still listening after five seconds");
              assert.equal(await mic.getAttribute("aria-pressed"), "true");
              assert.equal(await mic.getAttribute("aria-disabled"), "false");
              assert.equal(await enabled.count(), 4, "all four choices stay enabled while listening");
              const paused = await read();
              assert.equal(paused.score.said, 0, "the unfinished answer earns no spoken bonus");
              assert.deepEqual(paused, before, "the pause leaves the call and score unchanged");
              assert.deepEqual(await counts(), { live: count, saved: count }, "the pause adds no plays");
              assert.deepEqual(await micState(), open, "the same recognizer stays active without a restart or abort");
              check("Spanish prefix is still listening", { elapsedMs: sample.elapsedMs });
              checkedPause = true;
              stepName = "shared SayIt shows " + status;
            }
            if (sample.status !== "listening" || sample.elapsedMs >= latestMissMs) break;
            await new Promise((resolve) => setTimeout(resolve, 20));
          }
          assert.equal(sample.status, status, stepName);
          assert(sample.elapsedMs >= allowanceMs && sample.elapsedMs <= latestMissMs,
            `the Spanish prefix must settle in ${allowanceMs}–${latestMissMs} native ms, saw ${sample.elapsedMs}`);
          check("Spanish prefix settled", sample);
        } else {
          await page.evaluate((text) => window.__sayItHear(text), text);
          await waitNative("shared SayIt shows " + status, async () => await bonus.getAttribute("data-status") === status);
        }
        assert.equal(await bonus.locator('[role="status"]').innerText(), speech[status]);
        assert.deepEqual(await read(), { ...before, score: { ...before.score, said: before.score.said + Number(status === "hit") } });
        assert.equal((await audio()).length, requests, "speech adds no trainer request");
        assert.equal((await micState()).active, false);
      };
      const noDuplicateCredit = async () => {
        assert.equal(await mic.getAttribute("aria-disabled"), "true");
        const starts = (await micState()).starts.length;
        const b = await mic.boundingBox();
        if (touch) await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        else await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
        assert.equal((await micState()).starts.length, starts);
        assert.equal((await read()).score.said, 1);
      };
      const samplePose = async ({ before, called, picked, ms, at, frame }) => {
        const timeAt = async (offset, project = false, moves) => {
          await stepTo(at + offset);
          return rig(project, moves);
        };
        const early = await timeAt(Math.round(ms * (called === "run" ? 0.35 : 0.24) / 50) * 50, true);
        if (called === "run" || called === "circles" || called === "pushups") await fit(called + " early", early);
        if (called === "run" && frame) await shot(frame);
        const peak = await timeAt(Math.round(ms * 0.5 / 50) * 50, true, [picked, called]);
        for (const sample of [early, peak]) {
          assert.equal(sample.pose?.player, picked);
          assert.equal(sample.pose?.trainer, called);
          assert(Math.abs(sample.pose.progress - (sample.at - at) / ms) < 0.002, "both poses follow the same game clock");
        }
        assert(peak.pose.progress >= 0.40 && peak.pose.progress <= 0.55);
        checkMotion([picked, called], before, early, peak, stepName);
        checkProjectedPose([picked, called], early, peak, stepName);
        await fit(called + " peak", peak);
        if (frame && called !== "run") await shot(frame);
        if (called === "run") {
          const otherStride = await timeAt(Math.round(ms * 0.625 / 50) * 50, true);
          for (const [i, move] of [picked, called].entries()) {
            if (move === "run") {
              assert(early.actors[i].joints.legL.angle[0] > 0.55 && otherStride.actors[i].joints.legL.angle[0] < -0.55,
                "the run reverses stride on both original rigs");
            }
          }
        }
        return { peak, timeAt };
      };

      for (const [i, move] of calls.entries()) {
        const n = i + 1;
        const id = "gy_" + move;
        const scheduled = Math.min(2, Math.floor(i / 3));
        const initialLevel = audible && n === 6 ? 0 : scheduled;
        const clip = await listening(i, id, { checkKeys: n === 1 && audible, snapshot: n === 1 && audible });
        if (!audible && n === 1) {
          await stepTo(clip.at + 300);
          assert.equal((await read()).phase, "listen");
          assert.equal(await caption.count(), 0);
          listeningNeutral = await rig();
        }
        if (n === 1 && audible) {
          await stepTo(clip.at + 450);
          assert.equal((await read()).phase, "listen", "350 ms alone cannot release an unfinished call");
          assert.equal((await audio()).at(-1).ended, undefined);
          assert.equal(await caption.count(), 0, "unfinished call remains caption-free after the minimum");
          assert.equal(await enabled.count(), 0);
          if (!touch) await keyDown("1");
        }
        const current = await heard(i, move, initialLevel, clip);
        introduced.add(move);
        assert.deepEqual(current.score, result, "choose does not change prior scoring");
        const atRest = await rig();
        neutral ??= atRest;
        checkNeutral(neutral, atRest, "choose " + n);
        if (n === 1) checkNeutral(neutral, listeningNeutral, "idle through the first listening call");
        if (n === 1 && audible) {
          assert.deepEqual((await micState()).starts, [], "the gym mic never auto-starts");
          if (!touch) {
            await keyDown("1");
            await page.keyboard.up("1");
            assert.deepEqual(await read(), current, "held key repeat on entering choose cannot answer");
          }
          await fit("guided");
          await shot("03-guided");
          await step(2); // All imports complete and the first choose camera is settled.
        }
        if (audible && n === 3) {
          assert.deepEqual((await micState()).starts, [], "the mic only starts on demand");
          await speak("haga una", "miss", { prefixPause: true });
          await speak(lines.gy_pushups.target, "miss");
          assert.deepEqual((await read()).score, result, "partial or competing exercise leaves the choice open");
        }
        if (audible && n === 4) {
          await fit("target only");
          await shot("06-text-only");
        }
        if (audible && n === 5) {
          assert.deepEqual((await micState()).starts, [fixture.target, fixture.target], "call three handled only the two requested misses");
          await fit("mic is reachable beside replay and reveal");
          await startMic();
          await replay(i, id, 1);
          assert.equal((await micState()).active, false, "replay releases the live mic before calling");
          await page.evaluate((text) => window.__gymLateHear(text), lines[id].target);
          assert.deepEqual((await read()).score, result, "late transcript after replay earns nothing");
          await speak(lines[id].target, "hit");
          result.said = 1;
          assert(await bonus.locator(".say-it-sparkle").isVisible());
          await fit("mic hit");
          await shot("11-mic-hit");
          await noDuplicateCredit();
          await replay(i, id, 1);
          await noDuplicateCredit();
          const wrong = current.options.find((option) => option === "toes");
          assert(wrong && wrong !== move);
          const at = await now();
          if (touch) await press(tile(wrong));
          else await keyPress(await tile(wrong).getAttribute("data-slot"));
          await phase("retry", n);
          const retry = await request("gy_retry");
          assert.equal(await tile(wrong).getAttribute("data-result"), "retry");
          assert.equal(await overlay.locator('.kit-feedback[data-feedback="retry"]').count(), 1);
          await checkLine("gy_retry", true);
          result.wrong++;
          assert.deepEqual((await read()).score, result, "wrong raises only the wrong tally");
          assert.equal((await read()).helpLevel, 0);
          assert.equal(await bonus.count(), 0);
          await countIs(count);
          await pressDisabled(move);
          const wrongPose = await samplePose({ before: atRest, called: move, picked: wrong, ms: 1050, at, frame: "07-wrong" });
          assert.deepEqual((await read()).score, result, "second tap during retry does not score");
          await wrongPose.timeAt(1000);
          assert((await read()).pose?.progress > 0.9, "the retry pose lasts 1050 stepped ms");
          const repeat = await listening(i, id);
          assert(repeat.at - retry.at >= 1050 && retry.at === at);
          const retryChoice = await heard(i, move, 0, repeat);
          assert.deepEqual(retryChoice.options, current.options, "retry holds the slots");
          assert.deepEqual(retryChoice.score, result);
          checkNeutral(neutral, await rig(), "neutral at retry choose");
          await noDuplicateCredit();
          await fit("retry guidance");
          await shot("08-retry");
          await countIs(count);
        }
        if (!audible && n === 10) {
          assert.equal(await caption.getAttribute("data-gym-target"), "¡Haga saltos de tijera!");
          await checkLine("gy_jacks", true);
        }
        if (n === 7) {
          if (audible) {
            await fit("hidden");
            await shot("09-hidden");
            await reveal(id);
            await fit("revealed");
            await shot("10-reveal");
            await replay(i, id, 2, true);
          } else {
            await fit("silent late call");
            await shot("16-silent-late");
          }
        }

        stepName = "select and measure call " + n + " (" + move + ")";
        const before = await rig();
        const poseMs = [1200, 1050, 900][scheduled];
        const gap = [500, 375, 250][scheduled];
        const praise = i % 2 ? "gy_right_b" : "gy_right_a";
        if (n === 1 && audible) await override(praise, { ms: 1550, manifest: 1.55 });
        const at = await now();
        await selectMove(move, i);
        await phase("right", n);
        const feedback = await request(praise);
        assert.equal(feedback.at, at);
        assert.equal(await tile(move).getAttribute("data-result"), "right");
        assert.equal(await overlay.locator('.kit-feedback[data-feedback="right"]').count(), 1);
        await checkLine(praise, true);
        result.completed++;
        if (!audible || n !== 5) result.firstTry++;
        assert.deepEqual((await read()).score, result, "one completion per right answer");
        assert.equal(await enabled.count(), 0);
        assert.equal(await bonus.count(), 0);
        if (n === 1) {
          await pressDisabled(move);
          assert.deepEqual((await read()).score, result, "double tap/click is ignored");
        }
        const frames = {
          1: "04-jacks-peak", 2: "05-toes-peak", 3: "17-squat-peak", 4: "18-circles-peak",
          5: "19-run-stride", 6: "20-reach-peak", 7: "21-lunge-peak", 8: "12-plank",
        };
        const { peak, timeAt } = await samplePose({ before, called: move, picked: move, ms: poseMs, at, frame: audible ? frames[n] : undefined });
        const end = await timeAt(poseMs - 50);
        assert(end.pose?.progress > 0.92 && end.pose.progress < 1, "right pose lasts the scheduled time");
        assert(await overlay.locator('.gym-cue[data-line="' + praise + '"]').isVisible(), "praise remains readable through the pose");
        await timeAt(poseMs);
        const gapFrame = await timeAt(poseMs + 100);
        checkNeutral(neutral, gapFrame, "neutral during gap " + n);
        assert.equal(gapFrame.phase, "right");
        if (n === 1) {
          assert.deepEqual(gapFrame.view, peak.view, "settled neutral gap and peak share the camera");
          assert(peak.render?.drawn.length > 0 && gapFrame.render?.drawn.length > 0);
          assert.deepEqual([...gapFrame.render.drawn].sort(), [...peak.render.drawn].sort(), "same drawn objects at neutral and peak");
          assert.equal(peak.calls, gapFrame.calls, "renderer.info.render.calls remains unchanged");
          for (const frame of [peak, gapFrame]) {
            assert.deepEqual(frame.render.frames, [frame.renderFrame], "one ordinary scene pass at this timestep");
            assert.deepEqual(frame.render.offscreen, [], "zero offscreen draw targets");
            assert.equal(frame.renderTarget, null);
          }
          assert.equal(gapFrame.renderFrame - peak.renderFrame, (gapFrame.at - peak.at) / 50, "one renderer frame per step");
          check("same camera and draws at jacks peak and neutral", { calls: peak.calls, passes: 1, offscreen: 0 });
        }

        if (n === 1 && audible) {
          await timeAt(1500);
          assert.equal((await read()).phase, "right", "praise outlasts the pose and stays in feedback");
          assert.equal((await audio()).at(-1).ended, undefined);
          await timeAt(2000);
          assert.equal((await read()).phase, "right", "gap starts when the long praise actually ends");
        }
        if (n === calls.length) {
          await phase("closing");
          closing = await request("gy_end");
          await checkLine("gy_end", true);
        } else await phase("listen", n + 1);
        const history = await audio();
        const [, next] = history.slice(-2);
        const right = history.at(-2);
        const minimum = Math.max(poseMs, 800, right.ended - at) + gap;
        assert.equal(right.aborted, undefined, "praise playback is never clipped");
        assert(next.at - at >= minimum && next.at - at <= minimum + 50, "pose/voice plus scheduled gap " + JSON.stringify({ minimum, feedback: right, next }));
        check("call " + n + " " + move, { slot: slots[i], help: initialLevel, completed: result.completed, feedbackMs: next.at - at });
      }
      assert.deepEqual([...introduced], moves);
      assert.deepEqual([...(touch ? used.touch : used.desktop)].sort(), [1, 2, 3, 4]);
      if (audible && !touch) {
        assert.deepEqual([...used.number].sort(), [1, 2, 3, 4]);
        assert.deepEqual([...used.arrow].sort(), [1, 2, 3, 4]);
      }
      assert.deepEqual((await micState()).starts, Array(audible ? 4 : 0).fill(fixture.target), "only call five used the optional mic");
      await stepTo(closing.at + 950);
      assert(await overlay.locator('.gym-cue[data-line="gy_end"]').isVisible(), "closing is still readable at 950 ms");
      await phase("score");
      assert(await now() - closing.at >= 1000, "closing has at least one stepped second");
      assert.deepEqual((await read()).score, { completed: 10, firstTry: audible ? 9 : 10, wrong: Number(audible), said: Number(audible) });
      assert.equal(await scoreCard.getByRole("heading", { name: ui.scoreTitle, exact: true }).count(), 1);
      const rows = await scoreCard.locator("dl > div").evaluateAll((rows) => rows.map((row) => [row.querySelector("dt").innerText, row.querySelector("dd").innerText]));
      assert.deepEqual(rows, [[ui.completed, "10/10"], [ui.firstTry, (audible ? "9" : "10") + "/10"], ...(audible ? [[speech.stat, "1"]] : [])]);
      assert.equal(await scoreCard.locator(".mode-score-award .stars .on:visible").count(), 3);
      assert.equal(await bonus.count(), 0);
      await countIs(count);
      await fit("score");

      await page.evaluate(() => window.__gymRender.stop());
      if (audible) {
        await shot("13-score");
        await begin(1, true);
        const firstAgain = "gy_" + againCalls[0];
        const againClip = await listening(0, firstAgain);
        await heard(0, againCalls[0], 0, againClip);
        assert.deepEqual((await read()).score, zero, "Again resets completed, first try, wrong and said");
        assert.equal(await mic.getAttribute("aria-disabled"), "false");
        assert.deepEqual((await micState()).starts, Array(4).fill(fixture.target), "Again does not auto-start recognition");
        await startMic();
        await press(tile(againCalls[0]));
        await phase("right", 1);
        await request("gy_right_a");
        assert.equal((await micState()).active, false, "a hand answer closes pending recognition immediately");
        await page.evaluate((text) => window.__gymLateHear(text), lines[firstAgain].target);
        await step(10);
        assert.deepEqual((await read()).score, { ...zero, completed: 1, firstTry: 1 }, "late recognition after the pick is ignored");
        assert.equal((await read()).pose?.player, againCalls[0]);
        const secondAgain = await listening(1, "gy_" + againCalls[1]);
        await heard(1, againCalls[1], 0, secondAgain);
        assert.deepEqual((await read()).score, { ...zero, completed: 1, firstTry: 1 });
        assert.equal((await micState()).starts.length, 5);
        await press(tile(againCalls[1]));
        await phase("right", 2);
        await request("gy_right_b");
        await step(10);
        assert.equal((await read()).pose?.trainer, againCalls[1]);
        await exit();
        await restored("partial Again exit");
        check("Again rotates the introduction and resets the round, partial exit restores the original trainer", { starts: count - baseline });
      } else {
        await press(scoreCard.getByRole("button", { name: ui.done, exact: true }));
        await restored("Done", true);
        const learnerRoot = (await rig()).actors[0].root;
        assert(distance(learnerRoot, [mat.x, 0, mat.z]) < 0.02, "Done returns to the real mat");
        await leaveRoom(true);
        await listing();
        await press(pickerGuide);
        const route = await page.evaluate(() => {
          const { game, store } = window.__ew;
          const door = game.doors.find((d) => d.loc === "gym");
          return { panel: store.getState().hud.panel, dest: game.autoPath?.at(-1), door: [door.outX, door.outZ] };
        });
        assert.equal(route.panel, null);
        assert.deepEqual(route.dest, route.door, "the town footer guides to Gimnasio Colibrí's real door");
        await wait("the town guide reaches the gym door", async () => await prompt.isVisible()
          && await page.evaluate(() => !window.__ew.game.autoTarget && window.__ew.game.nearest?.id === "gym"), { frames: 2 });
        check("Done, door prompt and ordinary walking restore both cameras", { starts: count - baseline });
      }

      if (silentDesktop) {
        // The s35 picker still opens the original dialogue. Follow its authored day-pass route using
        // the same typebox as end-card.mjs and the visible audio recovery control for missing recordings.
        await listing();
        await press(gymCard);
        const convo = page.locator(".convo");
        const sceneStart = convo.locator(".scene-intro button.btn");
        await wait("picker opens the explicit s35 scene start", () => sceneStart.isVisible(), { frames: 2 });
        assert.equal(await sceneStart.innerText(), fixture.sceneStart);
        assert.equal(await page.evaluate(() => window.__ew.store.getState().conv.sitId), situation);
        assert.equal(await overlay.count(), 0);
        const synthBefore = await page.evaluate(() => window.__gymSynth.length);
        await press(sceneStart);
        const reading = convo.locator(".audio-recovery .link-btn").filter({ hasText: fixture.read });
        const input = convo.locator(".typebox input");
        const ended = convo.locator(".ended-box");
        const dialogueSteps = [];
        let readingRecoveries = 0;
        for (let turn = 0; turn < 100; turn++) {
          await wait("the next s35 dialogue line or answer", async () =>
            await ended.isVisible() || await reading.isVisible() || await convo.getAttribute("data-phase") === "you", { frames: 2 });
          if (await ended.isVisible()) break;
          if (await reading.isVisible()) {
            assert.equal(await page.evaluate(() => window.__ew.audio.getState()), "unavailable");
            assert.equal(await reading.innerText(), fixture.read);
            await press(reading);
            readingRecoveries++;
            continue;
          }
          const step = await page.evaluate(() => window.__ew.store.getState().conv.stepId);
          const answer = dialogue[step];
          dialogueSteps.push(step);
          assert(answer, "authored s35 dialogue step " + step + " after " + dialogueSteps.join(" → "));
          if (!await input.isVisible()) await press(convo.locator(".type-toggle"));
          await input.fill(answer);
          await press(convo.locator('.typebox button[type="submit"]'));
        }
        assert(await ended.isVisible(), "complete s35 through the typebox " + dialogueSteps.join(" → "));
        assert(readingRecoveries > 0, "normal s35 uses the real reading recovery");
        assert.equal(await page.evaluate(() => window.__gymSynth.length), synthBefore, "ordinary dialogue has no local voice");
        assert(dialogueSteps.includes("plan") && dialogueSteps.includes("pay"), "visited the PC day-pass and cash steps");
        assert(await page.evaluate(() => window.__ew.store.getState().conv.completed), "s35 dialogue task completed");
        assert.equal(await ended.locator(".ended-title").innerText(), fixture.taskComplete);
        assert(await ended.locator(".ended-phrase").isVisible());
        assert(await ended.locator(".ended-secondary").isVisible());
        assert(await ended.locator('.ended-destination[data-sit="' + nextSituation + '"]').isVisible(),
          "the base s35 destination to s87 remains available");
        const beforeCta = count;
        await countIs(beforeCta);
        const cta = ended.locator(".gym-cta");
        assert.equal(await cta.count(), 1);
        assert.equal(await cta.innerText(), entry.startLabel);
        await press(cta);
        await ready();
        assert.equal((await handoff()).entry.trainer.fidgets, true, "end-card reentry captures the real fidgets-enabled trainer");
        assert.equal(await convo.count(), 0);
        await begin();
        const ctaClip = await listening(0, "gy_jacks");
        await heard(0, "jacks", 0, ctaClip);
        await exit();
        await restored("s35 CTA exit");
        await countIs(beforeCta + 1);
        check("ordinary s35 Start and typed dialogue lead to the end-card gym CTA", { dialogueSteps, readingRecoveries, starts: count - baseline });
      }

      const expectedStarts = audible || touch ? 2 : 3;
      assert.equal(count, baseline + expectedStarts);
      await countIs(baseline + expectedStarts);
      const expectedFrames = audible
        ? ["00-entry", "01-ready", "02-listen", "03-guided", "04-jacks-peak", "05-toes-peak", "06-text-only", "07-wrong", "08-retry",
          "09-hidden", "10-reveal", "11-mic-hit", "12-plank", "13-score",
          "17-squat-peak", "18-circles-peak", "19-run-stride", "20-reach-peak", "21-lunge-peak"]
        : ["14-back-in-gym", "15-town", "16-silent-late"];
      assert.deepEqual([...seenShots].sort(), expectedFrames);
      assert.deepEqual(await page.evaluate(() => window.__gymSynth.filter(({ gym }) => gym)), [], "the gym never calls speech synthesis");
      assert.deepEqual((await audio()).map(({ text }) => text), expectedAudio.map((id) => lines[id].say), "complete trainer request sequence");
      assert.deepEqual(blocked, [], "no external or chapter audio asset requests");
      assert.deepEqual(failures, [], "no failed local asset or remote requests");
      assert.deepEqual(errors, [], "no unexpected browser errors or warnings");
      check("gym contract", { calls: calls.length, score: result, starts: count - baseline, frames: [...seenShots].sort() });
    } catch (error) {
      throw new Error(label + " / " + stepName + "\n" + await diagnostics(), { cause: error });
    }
  } finally {
    await context.close();
  }
}

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
try {
  const failed = [];
  for (const size of sizes) {
    for (const audible of [true, false]) {
      try { await journey(browser, size, audible); }
      catch (error) { failed.push(error); }
    }
  }
  if (failed.length) throw new AggregateError(failed, "PC-" + learner + " gym journeys failed");
  console.log("PC-" + learner + " gym: four journeys passed");
} finally {
  await browser.close();
}
