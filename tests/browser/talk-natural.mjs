// Run against a local Vite development server. The 3D inspection hooks are DEV-only.
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_PLAYWRIGHT_MODULE=playwright node tests/browser/talk-natural.mjs
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { audioKey, withoutAddressedNames } from "../../src/audio-key.ts";
import { before, INTRO_START, launchBrowser, seedFramingPage, worldConfig } from "../../tools/talk-framing-browser.mjs";
import { ActingFilm, writeFilmIndex } from "./talk-natural-film.mjs";
import { ordinaryPlaywright, runFramingAudit } from "./talk-natural-framing.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const config = worldConfig();
const pc = config.storage === "puerto-colibri";
const layer = pc ? `pc-${config.learner}` : "mh-lt";
const evidence = path.join(root, ".b6/audit", `talk-natural-${layer}`);
const shotDir = process.env.WORLD_SHOTS && path.resolve(process.env.WORLD_SHOTS);
const wrapperShots = process.env.SHOTS_OUT && path.resolve(process.env.SHOTS_OUT);
const chainCapture = !pc && !!shotDir && !!wrapperShots;
const chainMs = 1_200_000;
const started = Date.now();
// Reserve time for the unrestricted four-viewport audit even if routes stall.
const deadline = started + chainMs - 15_000;
const actingBy = chainCapture ? started + 630_000 : deadline;
const measureBy = shotDir ? actingBy - 150_000 : actingBy;
let out;
const sizes = [
  { width: 390, height: 844, touch: true, label: "390x844" },
  { width: 1280, height: 800, touch: false, label: "1280x800" },
];
const dinner = pc ? "x10-loteria" : "s85-dinner";
const directions = pc ? "x13-por-donde" : "x03-ask-the-way";
const directionActor = pc ? "queta" : "earl";
const roster = ["s72-cafe", "s69-local", dinner, "s66-taxi", "s67a-tickets", "s73-restaurant", directions, "street-i_dropped"];
const transportKey = "a536d997675f";
const taxiKey = "7185b68e7cba";
const taxiText = "Hey! Where can I take you?";
const stepMs = 1000 / 60;
const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const saved = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
const blocks = ["audio", "audio-v2", "audio-es"];
const report = { target: config.url.href, edition: config.storage, layer: config.learner, roster, rows: [], subcases: [], films: [], errors: [] };

// As in talk-framing.mjs, canceling a callback from another callback must take effect
// in that same frame. Browser timers and both native audio clocks keep real time.
function installPage({ key, save, speech, seed, film }) {
  if (window.top !== window) return;
  sessionStorage.setItem("ew-play-now", "1");
  localStorage.clear();
  localStorage.setItem(key, JSON.stringify(save));
  localStorage.setItem(key.replace("-progress-v1", "-variety"), "default");
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
  window.__naturalErrors = [];
  addEventListener("unhandledrejection", ({ reason }) => {
    window.__naturalErrors.push(String(reason?.stack ?? reason));
  });
  if (speech) {
    // Same local callbacks and result shape as quests-harness.mjs. No capture or recognition service.
    class Recognition {
      start() { window.__naturalReader = this; queueMicrotask(() => this.onstart?.()); }
      abort() {
        if (window.__naturalReader === this) window.__naturalReader = null;
        queueMicrotask(() => this.onend?.());
      }
      stop() { this.abort(); }
    }
    window.SpeechRecognition = Recognition;
    window.__naturalSpeak = (text) => {
      const reader = window.__naturalReader;
      if (!reader?.onresult) return false;
      reader.onspeechstart?.();
      reader.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
      reader.onspeechend?.();
      return true;
    };
  }
  const nowDate = Date.now.bind(Date);
  // Conversation's own PRNG is initialized while the situation load callback runs.
  // Character timing and variation still use their existing performance clock and Math.random.
  const period = 2 ** 32;
  const seedDate = Math.floor(nowDate() / period) * period + seed;
  Date.now = () => window.__ew?.game?.conversationLoads ? seedDate : nowDate();
  window.__naturalWall = nowDate;
  window.__naturalInput = {};
  addEventListener("click", (event) => {
    if (event.isTrusted && event.target.closest?.(".convo-head .head-actions .close-x:last-child")) {
      window.__naturalInput.close = nowDate();
    }
  }, true);
  if (film) {
    // Let Chromium present frames on its own clock during film. The contract
    // uses the explicit stepping clock below, with the same native media clocks.
    window.__step = () => performance.now();
    addEventListener("submit", (event) => {
      if (event.target.matches?.(".typebox")) window.__naturalInput.submit = nowDate();
    }, true);
    return;
  }
  let now = 1000, next = 0;
  const queued = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (callback) => {
    const id = ++next;
    queued.set(id, callback);
    return id;
  };
  window.cancelAnimationFrame = (id) => { queued.delete(id); };
  window.__step = (n, dt = 1000 / 60) => {
    for (let i = 0; i < n; i++) {
      now += dt;
      for (const id of [...queued.keys()]) {
        const callback = queued.get(id);
        if (!callback) continue;
        queued.delete(id);
        callback(now);
      }
    }
    return now;
  };
}

function seedForTaxi() {
  // Six init rolls precede greet (s66-taxi, first visit). Select its third authored variant.
  for (let seed = 1; seed < 100; seed++) {
    let a = seed, value;
    for (let i = 0; i < 7; i++) {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    if (value >= 2 / 3) return seed;
  }
  throw new Error("could not select the authored Vinnie opening");
}

async function recordings() {
  const catalogue = {};
  for (const dir of blocks) {
    const base = path.join(root, "public", dir);
    const files = await readdir(base).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    if (!files.includes("manifest.json")) continue;
    const durations = JSON.parse(await readFile(path.join(base, "manifest.json"), "utf8"));
    catalogue[dir] = Object.fromEntries(files.filter((name) => name.endsWith(".mp3"))
      .map((name) => name.slice(0, -4)).filter((key) => Number.isFinite(durations[key]) && durations[key] > 0)
      .map((key) => [key, durations[key]]));
  }
  for (const key of [transportKey, taxiKey]) assert(catalogue.audio?.[key] > 0, `local recording public/audio/${key}.mp3`);
  const npcSource = await readFile(path.join(root, "src/content/npcs.ts"), "utf8");
  const voices = Object.fromEntries(Array.from(npcSource.matchAll(/\bN\("([^"]+)"[^\n]+, "[mf]", "([^"]+)"/g), ([, id, voice]) => [id, voice]));
  if (!pc) assert.equal(voices.vinnie, "am_puck");
  Object.assign(voices, { earl: "am_michael", g_coach_m: "af_heart", g_coach_f: "af_heart" });
  return { catalogue, voices };
}

async function audioFixture() {
  const helpers = `return { audioKey: ${audioKey}, withoutAddressedNames: ${withoutAddressedNames} };`;
  const browserHelpers = new Function(helpers)();
  assert.equal(browserHelpers.audioKey("am_puck", 1, taxiText), taxiKey);
  assert.equal(browserHelpers.withoutAddressedNames("Thanks, Rūta!", ["Rūta"]), "Thanks!");
  assert.equal(browserHelpers.withoutAddressedNames(taxiText, ["Rūta"]), null);

  const fixture = { ...await recordings(), helpers };
  const bytes = new Map();
  fixture.bytes = (dir, key) => {
    const file = path.join(root, "public", dir, `${key}.mp3`);
    if (!bytes.has(file)) bytes.set(file, readFile(file));
    return bytes.get(file);
  };
  for (const key of [transportKey, taxiKey]) {
    const clip = await fixture.bytes("audio", key);
    assert(clip.length > 3 && (clip.toString("ascii", 0, 3) === "ID3" || (clip[0] === 255 && (clip[1] & 224) === 224)),
      `local MP3 header public/audio/${key}.mp3`);
    const route = { request: () => ({ headers: () => ({ range: "bytes=0-15" }) }), fulfill: (response) => response };
    const response = await serveRecording(route, clip);
    assert.equal(response.status, 206);
    assert.equal(response.headers["content-range"], `bytes 0-15/${clip.length}`);
    assert.deepEqual(response.body, clip.subarray(0, 16));
  }
  return fixture;
}

async function serveRecording(route, bytes) {
  const headers = { "accept-ranges": "bytes", "cache-control": "no-store" };
  const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
  if (!range) return route.fulfill({ contentType: "audio/mpeg", headers, body: bytes });
  const first = Number(range[1]), last = Math.min(range[2] ? Number(range[2]) : bytes.length - 1, bytes.length - 1);
  if (first > last) return route.fulfill({ status: 416, headers: { "content-range": `bytes */${bytes.length}` } });
  headers["content-range"] = `bytes ${first}-${last}/${bytes.length}`;
  return route.fulfill({ status: 206, contentType: "audio/mpeg", headers, body: bytes.subarray(first, last + 1) });
}

// Provide fixture entries at the existing duration and playback boundaries. The
// original key lookup, speed, repair URL, decoder, player and promises still run.
function observeAudio({ catalogue, voices, transportKey, pc, id, subcase, film, helpers }) {
  const { game, store, audio } = window.__ew;
  const { audioKey, withoutAddressedNames } = new Function(helpers)();
  const files = new Map(), requests = [], owners = new WeakMap(), actors = new Map();
  const transport = { dir: "audio", key: transportKey, duration: catalogue.audio[transportKey], match: false };
  let serial = 0, missing;
  let active = true;
  const known = () => {
    const { conv } = store.getState();
    return conv.active || game.modes?.owns("gofish") || game.modes?.owns("loteria")
      || game.streetLife?.active?.draw?.moment?.id === "i_dropped";
  };
  function prepare(voice, speed, text, options = {}) {
    if (!active || !known() || !/[a-z0-9]/i.test(text)) return null;
    const asked = audioKey(voice, speed, text);
    const plain = withoutAddressedNames(text, audio.names ?? []);
    const alt = plain && audioKey(voice, speed, plain);
    const dir = new URL(audio.base, location.href).pathname.split("/").filter(Boolean).at(-1);
    let key = asked;
    const { conv } = store.getState();
    const first = conv.transcript.find((line) => line.who === "npc")?.sentence?.say === text;
    const forceGap = !film && subcase !== "missing" && id === "s72-cafe" && first;
    let source;
    if (subcase === "missing" && first) {
      missing ??= asked;
      if (missing === asked) source = { missing: true, duration: 1 };
    }
    if (!source && !forceGap) {
      for (const candidate of [asked, alt]) {
        if (catalogue[dir]?.[candidate]) {
          source = { dir, key: candidate, voice, duration: catalogue[dir][candidate], match: candidate !== alt ? true : "addressed-name" };
          if (candidate === alt) {
            delete audio.manifest[asked];
            key = alt;
          }
          break;
        }
      }
      if (!source && !pc) {
        const v1 = voices[voice] ?? voices[voice.replace(/^g_/, "")] ?? voice;
        const full = audioKey(v1, speed, text), shortened = plain && audioKey(v1, speed, plain);
        const existing = catalogue.audio[full] ? full : catalogue.audio[shortened] ? shortened : null;
        if (existing) source = { dir: "audio", key: existing, voice: v1, duration: catalogue.audio[existing], match: existing === full ? true : "addressed-name" };
      }
    }
    if (film && !source) {
      delete audio.manifest[asked];
      if (alt) delete audio.manifest[alt];
      files.delete(asked);
      return { key, source: { unavailable: true, match: false }, slow: !!options.slow };
    }
    source ??= transport;
    audio.manifest[key] = source.duration;
    files.set(key, source);
    return { key, source, slow: !!options.slow };
  }
  const duration = audio.clipDuration.bind(audio);
  const has = audio.hasClip.bind(audio);
  const play = audio.play.bind(audio);
  audio.clipDuration = (voice, speed, text) => {
    prepare(voice, speed, text);
    return duration(voice, speed, text);
  };
  audio.hasClip = (voice, speed, text) => {
    prepare(voice, speed, text);
    return has(voice, speed, text);
  };
  audio.play = (voice, speed, text, options) => {
    const fixture = prepare(voice, speed, text, options);
    if (!fixture || requests.length >= 100) return play(voice, speed, text, options);
    const owner = options?.visual;
    const { conv } = store.getState();
    const line = conv.transcript.find((row) => row.id === owner?.line);
    const mode = game.modes?.active?.id ?? (game.modes?.owns("gofish") ? "gofish" : null);
    const street = !!game.streetLife?.active?.actor;
    const wrapped = { id: ++serial, ...fixture, voice, speed, text, run: conv.run, phase: conv.phase,
      owner: owner?.line ?? null, replay: owner?.replay ?? null, npc: line?.npc ?? null, mode, street,
      ownerMatches: line?.npc ? game.talkCast?.some((actor) => actor.id === line.npc && actor.ch === owner.actor) ?? false : null,
      started: performance.now(), gameTime: game.t, wall: window.__naturalWall() };
    if (owner) owners.set(owner, wrapped);
    requests.push(wrapped);
    const playback = play(voice, speed, text, options);
    void playback.then((ok) => {
      wrapped.result = { ok, state: owner ? audio.visualState(owner) : audio.getState(), time: performance.now(), wall: window.__naturalWall() };
    });
    return playback;
  };
  const sceneBound = (object) => {
    for (let node = object; node; node = node.parent) if (node === game.scene) return true;
    return false;
  };
  const poseIds = new WeakMap();
  let poseSerial = 0, release, tracked;
  function pose(ch) {
    const { root, mouth, smile, body, head, armL, armR, foreL, foreR, legL, legR, shinL, shinR, iris, browL, browR, eyes, corners } = ch;
    const joint = (bone) => bone && [...bone.rotation.toArray().slice(0, 3), ...bone.position.toArray()];
    const world = (bone) => bone?.getWorldPosition(root.position.clone()).toArray();
    const projected = (bone) => {
      const p = bone.getWorldPosition(root.position.clone()).project(game.rig.cam);
      return [(1 + p.x) * innerWidth / 2, (1 - p.y) * innerHeight / 2, p.z];
    };
    const controller = ch.talkPose;
    if (controller && !poseIds.has(controller)) poseIds.set(controller, ++poseSerial);
    const left = ch.leftHand ? world(ch.leftHand)
      : foreL.localToWorld(ch.rightHand.position.clone().setX(-ch.rightHand.position.x)).toArray();
    return {
      identity: root.uuid, live: sceneBound(root), visible: root.visible, anim: ch.anim, seat: ch.seatY,
      root: world(root), facing: root.getWorldDirection(root.position.clone()).toArray(),
      headWorld: world(head), headScreen: projected(head),
      pelvis: world(legL), hands: [left, world(ch.rightHand)], elbows: [world(foreL), world(foreR)],
      gazeAim: (controller?.watch ?? ch.watch)?.toArray?.() ?? null, weight: controller?.weight ?? 0,
      controller: controller?.constructor.name ?? null, poseId: poseIds.get(controller) ?? null,
      mouth: mouth.scale.toArray(), closed: smile?.scale.toArray(), skinned: !!ch.skin?.isSkinnedMesh && !!mouth.isBone,
      eyeScale: eyes?.scale.y ?? null,
      joints: { body: joint(body), head: joint(head), upperL: joint(armL), upperR: joint(armR),
        foreL: joint(foreL), foreR: joint(foreR), thighL: joint(legL), thighR: joint(legR),
        shinL: joint(shinL), shinR: joint(shinR), iris: joint(iris), browL: joint(browL), browR: joint(browR), smile: joint(corners) },
    };
  }
  const { renderer, rig } = game;
  const { cam } = rig;
  const panelIds = new WeakMap();
  let panelSerial = 0, opening, exit, lastFrame = 0;
  function painted(node) {
    if (!node || getComputedStyle(node).visibility !== "visible") return false;
    for (let el = node; el; el = el.parentElement) if (Number(getComputedStyle(el).opacity) === 0) return false;
    return true;
  }

  function lens() {
    const { screenW: w, screenH: h } = game;
    const { x, z } = game.player.root.position;
    const { aspect, fov, view, zoom, projectionMatrix: { elements } } = cam;
    const walking = rig.mode === "follow" || rig.mode === "interior";
    const running = rig.mode === "follow" && game.vel.lengthSq() > 30;
    return {
      mode: rig.mode, zone: game.zone.id, interior: !!game.zone.interior, size: [w, h], viewport: [innerWidth, innerHeight],
      sideways: game.sidewaysPhone, running, at: [x, z], heading: game.heading, aspect, fov, zoom,
      targetFov: walking ? rig.fovFor(w, h, running) + (rig.mode === "follow" ? game.rideFov : 0) : null,
      view: view && { ...view }, projection: [elements[0], elements[5], elements[8], elements[9]],
    };
  }

  // Observe the real synchronous clear before the next draw can set the ordinary
  // portrait offset. The wrapper leaves the camera call and its result intact.
  const clearViewOffset = cam.clearViewOffset;
  cam.clearViewOffset = function (...args) {
    const { conv } = store.getState();
    const closing = exit && !exit.clear && !conv.active && exit.run === conv.run;
    const before = closing ? lens() : null;
    const result = clearViewOffset.apply(this, args);
    if (closing) exit.clear = {
      before, after: lens(), wall: window.__naturalWall(), gameTime: game.t, frame: renderer.info.render.frame,
      talk: !!rig.talk,
    };
    return result;
  };

  function frame(rendered, checkPanel = false) {
    const p = window.__talkNatural?.sample() ?? null;
    const { conv, hud, settings, progress } = store.getState();
    const clip = audio.clip, owner = audio.visualOwner;
    const mode = game.modes?.active?.id;
    const gf = game.modes?.get("gofish")?.run, lot = game.modes?.get("loteria")?.stage;
    const street = game.streetLife?.active;
    const put = (id, actor) => { if (actor?.mouth?.isBone) actors.set(id, actor); };
    for (const n of game.talkCast ?? []) put(n.id, n.ch);
    if (tracked) put(tracked, game.npcs.find((n) => n.id === tracked)?.ch);
    if (p?.bystander?.actorId) {
      const id = p.bystander.actorId;
      put(id, game.npcs.find((n) => n.id === id)?.ch ?? game.naturalTalk?.bystander?.actor?.ch);
    }
    if (street?.actor) put(street.draw.cast.id, street.actor.person);
    if (gf?.actors) for (const [id, seat] of Object.entries(gf.actors)) put(id, seat.ch);
    if (lot) { put("beto", lot.beto); put("tona", lot.tona); }
    put("player", game.player);
    const request = owner ? owners.get(owner) : requests.at(-1);
    const media = clip && {
      key: clip.key, time: clip.position?.() ?? clip.el?.currentTime ?? null,
      rate: clip.el?.playbackRate ?? (request?.slow ? 0.82 : 1),
      pipeline: clip.el ? "html" : clip.position ? "buffer" : null,
      state: owner ? audio.visualState(owner) : audio.getState(),
      nativeState: clip.el ? (clip.el.ended ? "ended" : clip.el.paused ? "paused" : "playing") : audio.ctx?.state,
      envelope: audio.level(false), owner: request?.id ?? null, source: request?.source ?? null,
    };
    const node = document.querySelector(".convo");
    const panel = node?.getBoundingClientRect();
    if (node && !panelIds.has(node)) panelIds.set(node, ++panelSerial);
    const layout = checkPanel && {
      panelAnimating: node?.getAnimations().some((animation) => {
        if (animation.effect?.target !== node) return false;
        const slide = /^(slideup|slidein)$/.test(animation.animationName);
        return animation.pending || (slide ? ["running", "paused"].includes(animation.playState)
          : animation.playState === "running" && Number.isFinite(animation.effect.getComputedTiming().endTime));
      }),
      panelVisible: painted(node),
      intro: !!document.querySelector(".scene-intro, .intro-card"),
      fontsReady: document.fonts.status === "loaded",
      layoutReady: !("talkLayout" in game) || !!game.talkLayout,
    };
    const person = street?.actor?.projection?.().person ?? null;
    const line = conv.transcript.find((row) => row.id === conv.speaking);
    return {
      gameTime: game.t, clock: performance.now(), wall: window.__naturalWall(), frame: renderer.info.render.frame, rendered,
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      p, media, request: request?.id ?? null, audioState: audio.getState(), inputTimes: { ...window.__naturalInput },
      speech: request && { id: request.id, run: request.run, actor: request.npc, line: request.owner, text: request.text,
        gameTime: request.gameTime, source: request.source },
      actual: Object.fromEntries([...actors].map(([id, actor]) => [id, pose(actor)])),
      release: release && { mouth: release.actor.mouth.scale.toArray(), closed: release.actor.smile.scale.toArray(),
        skinned: !!release.actor.mouth.isBone, weight: release.controller?.weight ?? 0,
        playerWeight: release.playerController?.weight ?? 0, voice: release.owner ? audio.visualState(release.owner) : null },
      conv: { id: conv.sitId, run: conv.run, active: conv.active, phase: conv.phase, step: conv.stepId,
        host: conv.hostId, npc: conv.npcId, intro: conv.introOpen, line: conv.speaking, typing: conv.typing,
        slow: conv.slowMode, mic: conv.mic.status, completed: conv.completed, text: line?.sentence?.say ?? null,
        phone: !!hud.phoneCard, visits: progress.sits[conv.sitId]?.completions ?? 0 },
      scene: { mode: game.rig.mode, zone: game.zone.id, mountedZone: sceneBound(game.zone.group), modeId: mode, nearest: game.nearest?.id,
        host: game.talkNpc?.id, speaker: game.talkSpeaker?.id, cast: game.talkCast?.map((n) => n.id),
        heading: game.heading, transition: game.transitioning, quality: settings.quality, view: !!game.rig.cam.view?.enabled,
        pendingRide: game.pendingRide ?? null, ride: !!game.rideTimer || !!game.rides?.riding,
        picture: !!document.querySelector(".scene-backdrop"), panel: panel && [panel.left, panel.top, panel.right, panel.bottom],
        panelId: panelIds.get(node), layout, lens: lens() },
      street: street && { id: street.draw.moment.id, cast: street.draw.cast.id, script: street.draw.scriptName,
        step: street.view.step, exchange: street.view.exchange, line: street.view.line?.key, person },
      table: { gf: window.__ew.gofish?.state()?.step, lot: window.__ew.loteria?.state()?.phase },
    };
  }

  // Polling from Node can miss the first bound draw on a film page, especially
  // while a trusted Start input is in flight. Keep those draws in render order.
  const render = renderer.render;
  renderer.render = function (scene, camera) {
    const result = render.call(this, scene, camera);
    if ((!opening && !exit) || scene !== game.scene || camera !== cam) return result;
    const { conv } = store.getState();
    if (opening) {
      if (conv.active) {
        if (opening.frames.length < 700) opening.frames.push(frame(true));
        else opening.overflow = true;
      } else if (!game.transitioning && ["follow", "interior"].includes(rig.mode)) {
        opening.gameplay = lens();
        if (film && tracked === "vinnie" && !opening.wave
          && game.npcs.find((n) => n.id === tracked)?.ch.anim === "wave") {
          opening.wave = true;
          opening.frames.push(frame(true));
        }
      }
    }
    if (exit?.clear && !conv.active && !game.transitioning && exit.frames.length < 120) {
      exit.frames.push({ frame: renderer.info.render.frame, gameTime: game.t, lens: lens() });
    }
    return result;
  };

  function openingFrames() {
    if (opening?.overflow) throw new Error("opening frame buffer exceeded its limit");
    return opening ? opening.frames.splice(0) : [];
  }

  window.__naturalTest = {
    requests, files, stop: () => { active = false; opening = exit = undefined; },
    frame(checkPanel) {
      const rendered = renderer.info.render.frame !== lastFrame;
      lastFrame = renderer.info.render.frame;
      return { current: frame(rendered, checkPanel), early: openingFrames() };
    },
    beginOpening() { opening = { frames: [] }; },
    finishOpening() {
      const result = { early: openingFrames(), gameplay: opening?.gameplay };
      opening = undefined;
      return result;
    },
    track: (id) => { tracked = id; },
    pinRelease(id) {
      const actor = actors.get(id);
      if (!actor) throw new Error(`missing closing actor ${id}`);
      release = { actor, controller: actor.talkPose, playerController: game.player.talkPose, owner: audio.visualOwner };
      exit = { run: store.getState().conv.run, frames: [] };
    },
    finishExit() {
      const result = exit;
      exit = undefined;
      return result;
    },
  };
}

const mean = (values) => values.reduce((sum, value) => sum + value, 0) / values.length;
const spread = (values) => Math.max(...values) - Math.min(...values);
const distance = (a, b) => Math.hypot(...a.map((value, i) => value - b[i]));
const openMouth = (actor) => actor?.mouth[1] ?? 0;
const mediaPlaying = (f) => f.rendered && f.media?.state === "playing" && f.media.time > 0;
const isVoice = (f) => mediaPlaying(f) && f.media.envelope > 0.05;
const silent = (actor, label) => {
  assert(actor?.skinned && actor.mouth.every((value) => value <= 0.00002) && actor.closed?.[1] > 0.5,
    `${label} closed stroke/open-mouth bone: ${JSON.stringify(actor?.mouth)} ${JSON.stringify(actor?.closed)}`);
};
const actorIs = (frame, id) => {
  const actor = frame.actual[id];
  assert(actor?.live && actor.visible && actor.skinned, `${id} must be the mounted, rendered Character in ${frame.scene.zone}`);
  return actor;
};

const near = (actual, expected) => Math.abs(actual - expected) <= 1e-6;
const sameViewport = (a, b) => a.size.every((value, i) => value === b.size[i] && a.viewport[i] === b.viewport[i]);
const gameplayMode = (lens) => lens.interior ? "interior" : "follow";

function assertGameplayLens(lens, { width, height }, label, baseline) {
  const { mode, view, fov, targetFov, zoom, projection } = lens;
  assert.equal(mode, gameplayMode(lens), `${label} gameplay camera mode in ${lens.zone}`);
  assert.deepEqual(lens.size, [width, height], `${label} projection dimensions`);
  assert.deepEqual(lens.viewport, [width, height], `${label} CSS viewport`);
  assert(near(lens.aspect, width / height) && lens.at.every(Number.isFinite)
    && [lens.heading, fov, targetFov, zoom].every(Number.isFinite), `${label} camera parameters`);
  const shift = lens.sideways ? 0.1 : height > width * 1.15 ? (mode === "follow" ? 0.12 : 0.1) : 0;
  const offsetY = -height * shift;
  if (shift) {
    assert(view?.enabled && near(view.offsetX, 0) && near(view.offsetY, offsetY),
      `${label} gameplay view offset ${JSON.stringify(view)} (expected [0,${offsetY}])`);
    assert.deepEqual([view.fullWidth, view.fullHeight, view.width, view.height], [width, height, width, height],
      `${label} view dimensions`);
  } else {
    assert(!view?.enabled, `${label} unshifted gameplay view`);
  }
  const scale = zoom / Math.tan(fov * Math.PI / 360);
  assert(near(projection[0], scale / lens.aspect) && near(projection[1], scale)
    && near(projection[2], 0) && near(projection[3], -2 * offsetY / height),
    `${label} rendered gameplay projection ${JSON.stringify(projection)}`);
  if (baseline && lens.zone === baseline.zone && sameViewport(lens, baseline) && distance(lens.at, baseline.at) < 0.5) {
    assert.equal(mode, baseline.mode, `${label} original mode at the same location`);
    assert.equal(!!view?.enabled, !!baseline.view?.enabled, `${label} original offset state`);
    if (view?.enabled) assert(near(view.offsetX, baseline.view.offsetX) && near(view.offsetY, baseline.view.offsetY),
      `${label} original numeric offset`);
    if (lens.running === baseline.running) assert(near(targetFov, baseline.targetFov), `${label} original gameplay FOV target`);
  }
}

function inspectControl(el, { scroll, edges, details = true }) {
  const describe = (node) => node && [node.localName, node.id && "#" + node.id,
    ...Array.from(node.classList, (name) => "." + name)].join("");
  if (scroll) el.scrollIntoView({ block: "nearest", inline: "nearest" });
  const { left, top, width, height } = el.getBoundingClientRect();
  const candidates = [[0.5, 0.5]];
  if (edges) candidates.push([0.25, 0.5], [0.75, 0.5], [0.5, 0.25], [0.5, 0.75],
    [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]);
  let center, point = null, hit;
  for (const [dx, dy] of candidates) {
    const x = left + width * dx, y = top + height * dy;
    const target = document.elementFromPoint(x, y);
    center ??= { x, y, target };
    if (el.contains(target)) {
      point = { x, y };
      hit = target;
      break;
    }
  }
  if (el.closest(".scene-intro, .intro-card")) {
    for (let node = el; node; node = node.parentElement) {
      if (Number(getComputedStyle(node).opacity) === 0) point = null;
    }
  }
  if (!details) return { point };
  const covering = [];
  if (!el.contains(center.target)) {
    for (let node = center.target; node && covering.length < 5; node = node.parentElement) covering.push(describe(node));
  }
  let scrollParent = el.parentElement;
  while (scrollParent) {
    const { overflowX, overflowY } = getComputedStyle(scrollParent);
    if (/auto|scroll|hidden/.test(overflowX + " " + overflowY)) break;
    scrollParent = scrollParent.parentElement;
  }
  const { scrollTop, scrollLeft } = scrollParent ?? document.scrollingElement;
  return { control: describe(el), rect: { left, top, width, height }, point,
    hit: describe(hit ?? center.target), center: { x: center.x, y: center.y, hit: describe(center.target) },
    covering, listCoachCoversCenter: !el.contains(center.target) && !!center.target?.closest(".coach"),
    scrollParent: { element: describe(scrollParent ?? document.scrollingElement), scrollTop, scrollLeft },
    activeElement: describe(document.activeElement), focused: document.activeElement === el, focusVisible: el.matches(":focus-visible") };
}

// Retain the native events until propagation and their default actions have finished.
function watchControl(el) {
  const listeners = new AbortController();
  let keydown, click;
  el.addEventListener("keydown", (event) => { keydown = event; }, { signal: listeners.signal });
  el.addEventListener("click", (event) => { click = event; }, { signal: listeners.signal });
  return () => {
    listeners.abort();
    return {
      keydown: keydown && { key: keydown.key, trusted: keydown.isTrusted, prevented: keydown.defaultPrevented },
      click: click && { trusted: click.isTrusted, detail: click.detail },
    };
  };
}

class Route {
  constructor(page, context, row, fixture, options) {
    Object.assign(this, { page, context, row, fixture, ...options });
    this.frames = [];
    this.errors = [];
    this.labels = new Set();
    this.missingUrls = new Set();
    this.playheads = new Map();
    this.openingFrames = [];
    this.lastRecorded = null;
    this.deadline = Math.min(Date.now() + 105_000, this.by);
  }

  async boot() {
    const { page, row } = this;
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => this.errors.push(error.stack ?? error.message));
    page.on("websocket", (socket) => {
      const address = new URL(socket.url());
      if (address.host !== config.url.host) this.errors.push(`external websocket ${address.origin}`);
    });
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const url = message.location().url;
      const value = message.text();
      if (this.subcase === "missing" && this.missingUrls.has(url) && /Failed to load resource.*404/.test(value)) {
        row.expectedErrors.push({ url, value });
      } else this.errors.push(`console error: ${value} (${url})`);
    });
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== config.url.origin) {
        this.errors.push(`external request ${url.origin}${url.pathname}`);
        return route.abort();
      }
      if (!url.pathname.endsWith(".mp3")) return route.continue();
      const match = /\/(audio(?:-v2|-es)?)\/([a-f0-9]{12})\.mp3$/.exec(url.pathname);
      if (!match) return route.fulfill({ status: 204, body: "" });
      const [, dir, key] = match;
      const mapped = await page.evaluate((key) => window.__naturalTest?.files.get(key), key);
      if (mapped?.missing) {
        this.missingUrls.add(url.href);
        return route.fulfill({ status: 404, body: "" });
      }
      const source = mapped ?? (this.fixture.catalogue[dir]?.[key] && { dir, key });
      if (!source) return route.fulfill({ status: 204, body: "" }); // speculative prefetch for a line never requested
      return serveRecording(route, await this.fixture.bytes(source.dir, source.key));
    });
    await seedFramingPage({
      addInitScript: async (_seed, [key, json]) => {
        const save = JSON.parse(json);
        Object.assign(save.settings, { volume: 0.78, sounds: 0, onDevice: false, confirmSpeech: false, worldStyle: "blocks" });
        if (["s69-local", directions, dinner, "street-i_dropped"].includes(row.id)) {
          save.place = { zone: "town", x: 28, z: -20, rot: Math.PI };
          if (row.id !== "street-i_dropped") save.objective = row.id;
        }
        if (row.id === dinner && !pc) {
          save.sits[dinner] = saved;
          save.place = { zone: "dans-house", x: 1.5, z: 0.25, rot: Math.PI };
        }
        if (row.id === dinner && pc) save.place = { zone: "town", x: 21.28, z: -24.38, rot: 2.41 };
        if (row.id === directions && (this.subcase === "missing" || pc)) {
          save.sits[directions] = { ...saved, completions: 0 };
        }
        if (this.film) save.objective = row.id;
        // Seed 2 skips the café small-talk opening in both editions, so the first
        // learner turn is the authored order with complete, selectable examples.
        const cafeSeed = this.film && !pc ? 1 : 2; // Seed 1 selects Mia's matching opening with the internal pause.
        const seed = row.id === "s66-taxi" && !pc ? seedForTaxi() : row.id === "s72-cafe" ? cafeSeed : 42;
        await page.addInitScript(installPage, { key, save, speech: this.subcase === "mic", seed, film: !!this.film });
      },
    }, config.storage, { quietTexts: true });
    await page.goto(config.url.href, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await this.until(async () => page.evaluate(() => {
      window.__step(3);
      const { game, store } = window.__ew ?? {};
      const st = store?.getState();
      return st?.screen === "play" && !!game?.renderer?.domElement && !game.transitioning && !st.hud.flight;
    }), "returning 3D town", 30_000);
    row.screen = await page.evaluate((key) => {
      const { game, store } = window.__ew;
      const { settings, progress } = store.getState();
      const { x, y, width, height } = game.renderer.domElement.getBoundingClientRect();
      return { lang: document.documentElement.lang, exists: !!localStorage.getItem(key),
        profile: progress.profile?.name, returning: progress.coach?.done, flight: !!game.flight,
        settings: [settings.play, settings.quality, settings.scenes, settings.phoneCalls, settings.textMessages, settings.volume],
        css: [innerWidth, innerHeight, devicePixelRatio], viewport: [visualViewport.width, visualViewport.height, visualViewport.scale],
        canvas: [x, y, width, height, game.renderer.getPixelRatio()],
        touch: navigator.maxTouchPoints, coarse: matchMedia("(pointer: coarse)").matches, fine: matchMedia("(pointer: fine)").matches,
        iphone: /iPhone/.test(navigator.userAgent), reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
        synthesis: typeof speechSynthesis, fakeRecognition: typeof window.__naturalSpeak };
    }, `${config.storage}-progress-v1`);
    const { width, height, touch } = this.size;
    const s = row.screen;
    assert.equal(s.lang, config.learner, "served learner layer");
    assert(s.exists && s.profile === "Test" && s.returning && !s.flight, "returning save applied");
    assert.deepEqual(s.settings, ["town", "low", false, false, false, 0.78]);
    assert.deepEqual(s.css, [width, height, 1]);
    assert.deepEqual(s.viewport, [width, height, 1]);
    assert.deepEqual(s.canvas, [0, 0, width, height, 1]);
    assert(touch ? s.touch > 0 && s.coarse && s.iphone : s.touch === 0 && s.fine && !s.iphone, "size/input capabilities");
    assert.equal(s.reduced, this.subcase === "reduced");
    assert.equal(s.synthesis, "undefined");
    assert.equal(s.fakeRecognition, this.subcase === "mic" ? "function" : "undefined");
    await before(this.deadline, "loading the local manifests", () => page.evaluate(async () => {
      await window.__ew.audio.init();
      if (!window.__ew.audio.ready) throw new Error("local voice manifest unavailable");
    }));
    await page.evaluate(observeAudio, {
      catalogue: this.fixture.catalogue, voices: this.fixture.voices, transportKey, pc,
      id: row.id, subcase: this.subcase, film: this.film, helpers: this.fixture.helpers,
    });
    if (row.id === "s66-taxi" && !this.subcase) {
      const url = new URL(`audio/${taxiKey}.mp3?natural-range=1`, config.url).href;
      row.range = await page.evaluate(async (url) => {
        const response = await fetch(url, { headers: { Range: "bytes=0-15" } });
        return { status: response.status, range: response.headers.get("content-range"),
          accept: response.headers.get("accept-ranges"), bytes: [...new Uint8Array(await response.arrayBuffer())] };
      }, url);
      const bytes = await this.fixture.bytes("audio", taxiKey);
      assert.deepEqual(row.range, { status: 206, range: `bytes 0-15/${bytes.length}`, accept: "bytes", bytes: [...bytes.subarray(0, 16)] });
    }
  }

  async tick(n = 1, dt = stepMs, checkPanel = false) {
    const { current, early } = await this.page.evaluate(([n, dt, checkPanel]) => {
      window.__step(n, dt);
      return window.__naturalTest.frame(checkPanel);
    }, [n, dt, checkPanel]);
    this.collectOpening(early);
    if (current.frame !== early.at(-1)?.frame) this.record(current);
    this.last = current;
    return current;
  }

  collectOpening(frames) {
    for (const frame of frames) {
      this.openingFrames.push(frame);
      this.record(frame, true);
    }
  }

  record(frame, early = false) {
    this.capture?.sample(frame);
    if (isVoice(frame) && frame.media.owner != null) {
      const { owner, key, time, envelope, pipeline } = frame.media;
      const sample = this.playheads.get(owner) ?? { id: owner, key, pipeline, first: time, last: time, peakEnvelope: 0, frames: 0 };
      sample.last = Math.max(time, sample.last);
      sample.peakEnvelope = Math.max(envelope, sample.peakEnvelope);
      sample.frames++;
      this.playheads.set(owner, sample);
    }
    // Keep early draws and phase/owner/cue changes in the bounded route trace.
    const signature = JSON.stringify([frame.conv.run, frame.conv.phase, frame.conv.mic, frame.request, frame.media?.state,
      frame.p?.gesture, frame.p?.gaze?.target, frame.p?.reaction?.sequence, frame.scene.mode, frame.street?.step]);
    if (this.frames.length < 1000 && (early || signature !== this.lastRecorded || frame.frame % 6 === 0)) {
      this.frames.push(frame);
      this.lastRecorded = signature;
    }
  }

  async until(poll, label, ms = 14_000) {
    const by = Math.min(Date.now() + ms, this.deadline);
    let last;
    return before(by, `${this.row.id}/${this.size.label}: ${label}`, async () => {
      while (Date.now() < by) {
        if (this.errors.length) throw new Error(this.errors.join("\n"));
        last = await poll();
        if (last) return last;
        await real(12);
      }
      assert.fail(`${label}: ${this.diagnostic()}`);
    }).catch((error) => { throw new Error(`${error.message}\n${this.diagnostic()}`, { cause: error }); });
  }

  diagnostic() {
    const f = this.last;
    return JSON.stringify(f && { conv: f.conv, probe: f.p && [f.p.scope, f.p.speakerId, f.p.lineId, f.p.playback],
      media: f.media, scene: f.scene, table: f.table, street: f.street });
  }

  async wait(predicate, label, ms, checkPanel = false) {
    return this.until(async () => {
      const frame = await this.tick(1, stepMs, checkPanel);
      await this.filmFrame(frame);
      return predicate(frame) ? frame : null;
    }, label, ms);
  }

  async series(count, dt = stepMs) {
    const result = [];
    for (let i = 0; i < count; i++) {
      const started = Date.now();
      const frame = await this.tick(1, dt);
      result.push(frame);
      await this.filmFrame(frame);
      await real(Math.max(1, dt - (Date.now() - started)));
    }
    return result;
  }

  async filmFrame(f) {
    if (!this.capture || !f.rendered) return;
    if (f.audioState === "unavailable" && f.speech?.source.unavailable && this.continued !== f.speech.id) {
      const button = this.page.locator(".audio-recovery button.link-btn").last();
      if (await button.isVisible()) {
        this.continued = f.speech.id;
        await this.mark("continue-reading", f, { once: false, image: false });
        await this.press(button, "continue reading an unmatched line");
      }
    }
  }

  async mark(label, frame = this.last, { once = true, image = true } = {}) {
    if (once && this.labels.has(label)) return;
    if (once) this.labels.add(label);
    const entry = { label, frame: frame?.frame, time: frame?.gameTime, wall: frame?.wall, request: frame?.request,
      speaker: frame?.p?.speakerId ?? frame?.conv.npc ?? this.row.runtime?.id, run: frame?.p?.run ?? frame?.conv.run,
      line: frame?.conv.text ?? frame?.p?.lineId, lineId: frame?.conv.line ?? frame?.p?.lineId,
      recording: frame?.media?.source ?? frame?.speech?.source ?? null, inputTimes: frame?.inputTimes };
    this.row.labels.push(entry);
    if (this.capture) this.capture.mark(entry, image);
  }

  async press(locator, label, { action, count, mouse = false, edges = false, key = "Enter" } = {}) {
    const button = locator.first();
    const trace = action && { action, label, input: this.size.touch ? "tap" : mouse ? "mouse" : key };
    if (trace) (this.row.actions ??= []).push(trace);
    const hitOptions = { scroll: true, edges: edges && !this.size.touch, details: !!trace };
    const hit = await this.until(async () => {
      const frame = await this.tick();
      if (trace) {
        const controls = await locator.all();
        const visible = await Promise.all(controls.map((control) => control.isVisible()));
        Object.assign(trace, { count: controls.length, expectedCount: count, visible,
          before: { table: frame.table.gf, mode: frame.scene.modeId, camera: frame.scene.mode, street: frame.street } });
        trace.hit = controls.length ? await button.evaluate(inspectControl, { ...hitOptions, scroll: visible[0] }) : null;
        trace.enabled = !!controls.length && await button.isEnabled();
        return controls.length === count && visible.every(Boolean) && trace.enabled ? trace.hit?.point : null;
      }
      if (!(await button.isVisible()) || !(await button.isEnabled())) return null;
      return (await button.evaluate(inspectControl, hitOptions)).point;
    }, label, 4500);
    if (!trace) {
      if (this.size.touch) await this.page.touchscreen.tap(hit.x, hit.y);
      else {
        await button.focus();
        await button.press("Enter");
      }
      return;
    }
    const keyboard = !this.size.touch && !mouse;
    if (keyboard) {
      await button.focus();
      trace.focusedHit = await button.evaluate(inspectControl, { ...hitOptions, scroll: false });
      assert(trace.focusedHit.focused && trace.focusedHit.focusVisible && trace.focusedHit.point,
        `${label}: visible keyboard focus and an uncovered hit region`);
    }
    const read = await button.evaluateHandle(watchControl);
    try {
      if (keyboard) await this.page.keyboard.press(key);
      else if (this.size.touch) await this.page.touchscreen.tap(hit.x, hit.y);
      else await this.page.mouse.click(hit.x, hit.y);
    } finally {
      try { trace.events = await read.evaluate((result) => result()); }
      finally { await read.dispose(); }
    }
    if (keyboard) {
      assert.deepEqual(trace.events.keydown, { key: key === "Space" ? " " : key, trusted: true, prevented: false },
        `${label}: native key default reaches the focused button`);
    }
    assert(trace.events.click?.trusted && (!keyboard || trace.events.click.detail === 0),
      `${label}: trusted native button activation`);
    return trace;
  }

  async walkUp(actor) {
    const at = await this.page.evaluate(({ id, film }) => {
      const { game } = window.__ew;
      const target = game.npcs.find((n) => n.id === id);
      if (!target) throw new Error(`no town actor ${id}`);
      const { x: hx, z: hz } = target.home;
      const p = target.approach ?? { x: hx + Math.sin(target.rot) * 1.25, z: hz + Math.cos(target.rot) * 1.25 };
      if (film && id === "vinnie") game.walkTo(p.x, p.z, { kind: "point" });
      else game.placeOnFoot(p.x, p.z, Math.atan2(hx - p.x, hz - p.z), film);
      return { at: [p.x, p.z], home: [hx, hz], approach: !!target.approach };
    }, { id: actor, film: !!this.film });
    this.row.approach = at;
    if (this.film) {
      await this.wait((f) => f.scene.nearest === actor && !f.conv.phone, `physical interaction prompt at ${actor}'s approach`);
      if (this.row.id === "s66-taxi") {
        const waving = (f) => f.actual[actor]?.anim === "wave" && !f.actual[actor].controller;
        const wave = this.openingFrames.find(waving) ?? await this.wait(waving, "native approach wave before binding");
        await this.mark("approach-wave", wave, { image: false });
        await this.series(3);
      }
    } else await this.until(() => this.page.evaluate((actor) => {
      window.__step(2);
      const { game, store } = window.__ew;
      return game.zone.id === "town" && game.nearest?.kind === "npc" && game.nearest.id === actor
        && !!store.getState().hud.prompt && !store.getState().hud.phoneCard;
    }, actor), `physical interaction prompt at ${actor}'s approach`);
    await this.interact();
  }

  async interact() {
    if (this.size.touch) await this.press(this.page.locator(".act-btn"), "tap the town interaction button");
    else await this.page.keyboard.press("e");
  }

  async beginOpening() {
    this.openingFrames = [];
    await this.page.evaluate(() => window.__naturalTest.beginOpening());
  }

  async finishOpening(entry) {
    const { early, gameplay } = await this.page.evaluate(() => window.__naturalTest.finishOpening());
    this.collectOpening(early);
    assert(this.openingFrames.every((f) => !f.conv.active || f.conv.run === entry.conv.run && f.conv.id === entry.conv.id),
      "the observed opening belongs to one live conversation run");
    assert(this.openingFrames.every((f) => f.frame <= entry.frame || f.scene.panelId === entry.scene.panelId),
      "the opening panel stayed mounted through layout");
    assert(gameplay && gameplay.zone === entry.scene.zone, "rendered gameplay lens at the conversation location before entry");
    assertGameplayLens(gameplay, this.size, "before dialogue");
    this.gameplay = gameplay;
    (this.row.gameplay ??= []).push({ run: entry.conv.run, lens: gameplay });
  }

  openingSamples() {
    return this.openingFrames.filter((f) => f.conv.active && !f.conv.intro);
  }

  async start(id = this.row.id, actor, walk = false, launch = true) {
    const expected = await this.page.evaluate((id) => {
      const { game, store } = window.__ew;
      const meta = game.orderedSituations().find((s) => s.id === id)
        ?? [...game.npcToSits.values()].flat().find((s) => s.id === id);
      const profile = store.getState().progress.profile;
      if (!meta) throw new Error(`missing runtime situation ${id}`);
      return { id: ["sam", "emma"].includes(meta.npc) ? profile.datePartner ?? (profile.gender === "f" ? "sam" : "emma") : meta.npc,
        location: meta.location, profile: { gender: profile.gender, datePartner: profile.datePartner } };
    }, id);
    assert(expected.id && (!actor || actor === expected.id), `runtime host for ${id}: ${JSON.stringify(expected)}`);
    this.row.runtime ??= expected;
    if (launch) {
      await this.beginOpening();
      if (walk) await this.walkUp(expected.id);
      else await this.page.evaluate((id) => window.__ew.game.startScenario(id), id);
    }
    const entry = await this.wait((f) => f.conv.active && f.conv.id === id && !!f.scene.panel, `open ${id} in the town`);
    assert.equal(entry.conv.host, expected.id);
    if (entry.conv.intro) {
      const intro = this.page.locator(".scene-intro, .intro-card");
      const named = intro.getByRole("button", { name: INTRO_START });
      await this.press(await named.count() ? named : intro.locator("button.btn"), "press the authored intro Start");
      assert.equal(await this.page.evaluate(() => window.__ew.store.getState().conv.introOpen), false);
      this.row.introPressed = true;
    } else if (id === "s72-cafe" && this.subcase !== "interrupted") {
      assert.fail("the café's real Start button was not exercised");
    }
    const isBound = (f) => f.rendered && f.conv.active && f.conv.run === entry.conv.run
      && f.p?.scope === "session" && f.p.run === entry.conv.run && f.scene.mode === "talk";
    await this.wait(() => this.openingFrames.some(isBound), "lazy presentation attached to the live run");
    const bound = this.openingFrames.find(isBound);
    actorIs(bound, expected.id);
    actorIs(bound, "player");
    assert(bound.scene.cast.includes(expected.id) && bound.scene.mountedZone && !bound.scene.picture);
    await this.mark("entry", bound);
    const settled = await this.panel(entry);
    (this.row.panels ??= []).push({ run: entry.conv.run, frame: settled.frame, wall: settled.wall, rect: settled.scene.panel });
    const sampled = () => {
      const last = this.openingFrames.at(-1);
      return last?.p?.run === bound.conv.run && last.gameTime >= bound.gameTime + 0.24
        && this.openingFrames.some((f) => !f.conv.intro && (f.conv.phase !== "npc"
          || (f.speech?.run === bound.conv.run && (mediaPlaying(f) || f.audioState === "unavailable"))));
    };
    if (!sampled()) await this.wait((f) => {
      assert(f.conv.active && f.conv.run === bound.conv.run && f.scene.panelId === settled.scene.panelId,
        "the same live conversation continues through the opening blend");
      return sampled();
    }, "render the opening blend and playback onset");
    await this.finishOpening(entry);
    return bound;
  }

  async panel(entry) {
    let previous;
    return this.wait((f) => {
      const { panel: rect, panelId, layout, quality } = f.scene;
      assert(f.conv.active && f.conv.run === entry.conv.run && f.conv.id === entry.conv.id
        && panelId === entry.scene.panelId, "the original conversation panel stayed mounted through layout");
      if (f.conv.intro || layout.intro || layout.panelAnimating || !layout.panelVisible || !layout.fontsReady || !layout.layoutReady) {
        previous = undefined;
        return false;
      }
      if (!f.rendered) return false;
      if (previous && previous.frame !== f.frame && rect.every((edge, i) => edge === previous.scene.panel[i])) {
        assert(rect.every(Number.isFinite) && rect[0] >= -1 && rect[1] >= -1
          && rect[2] <= this.size.width + 1 && rect[3] <= this.size.height + 1
          && rect[2] > rect[0] && rect[3] > rect[1] && quality === "low", `scene/panel viewport: ${JSON.stringify(rect)}`);
        assert(f.scene.mountedZone && !f.scene.picture && f.scene.mode === "talk" && f.p?.run === entry.conv.run,
          "settled panel belongs to the live rendered conversation");
        return true;
      }
      previous = f;
      return false;
    }, "settled conversation panel", 4500, true);
  }

  async yourTurn() {
    return this.wait((f) => f.conv.phase === "you" && f.p?.listening && !!f.scene.panel, "real learner turn");
  }

  async hint() {
    const model = this.page.locator(".guide-examples .gx .gx-text .il").first();
    await this.until(() => model.isVisible(), "visible authored learner model", 3500);
    const words = await model.locator(".u > .en").allTextContents();
    const text = words.join(" ").replace(/\s+([.,?!])/g, "$1").trim();
    assert(text && !text.includes("…"), "current supported answer is a complete authored example");
    return text;
  }

  async answer(text, { reaction = null } = {}) {
    const turn = await this.yourTurn();
    const old = await this.page.evaluate(() => window.__ew.store.getState().conv.transcript.at(-1)?.id ?? 0);
    text ??= await this.hint();
    const input = this.page.locator(".typebox input");
    if (!(await input.isVisible())) await this.press(this.page.locator(".type-toggle"), "switch to typing");
    await input.fill(text);
    if (this.size.touch) await this.press(this.page.locator(".typebox button[type=submit]"), "send typed answer by tap");
    else await input.press("Enter");
    const row = await this.page.evaluate((old) => window.__ew.store.getState().conv.transcript.find((r) => r.who === "you" && r.id > old), old);
    assert.equal(row?.understood, reaction !== "puzzled", `${turn.conv.step}: ${JSON.stringify(row)}`);
    if (reaction) {
      const submitted = this.film ? await this.tick() : null;
      if (submitted) await this.mark(`submit-${reaction}`, submitted, { image: false });
      try { await this.feedback(reaction, turn.p.reaction?.sequence ?? 0, submitted?.inputTimes?.submit); }
      catch (error) {
        if (!this.film) throw error;
        this.row.errors.push(error.stack ?? error.message);
      }
    }
    return row;
  }

  async feedback(kind, beforeSerial, submittedAt) {
    let rows = [];
    if (this.film) {
      assert(Number.isFinite(submittedAt), "trusted typebox submission timestamp");
      rows = await through(this, (f) => f.wall >= submittedAt + 700, "render the response after submission", 2500);
      for (const offset of [4, 10, 18]) {
        const f = rows.find((f) => f.rendered && f.wall >= submittedAt + offset * 1000 / 30);
        if (f) await this.mark(`submit-${kind}+${offset}`, f);
      }
    } else {
      for (let i = 1; i <= 21; i++) {
        const [f] = await this.series(1, 1000 / 30);
        rows.push(f);
        if ([4, 10, 18].includes(i)) await this.mark(`submit-${kind}+${i}`, f);
      }
    }
    const samples = rows.filter((f) => f.p?.reaction?.kind === kind && f.p.reaction.sequence > beforeSerial);
    const peak = samples.reduce((a, b) => !a || b.p.reaction.weight > a.p.reaction.weight ? b : a, null);
    assert(peak?.p.reaction.weight > 0.20, `${kind} reaction serial/applied weight: ${this.diagnostic()}`);
    const id = peak.p.reaction.actorId, p = peak.p.speakerId === id ? peak.p.speaker : peak.p.others.find((a) => a.actorId === id);
    const actual = actorIs(peak, id);
    const axis = kind === "understood" ? 0 : 2;
    const delta = kind === "understood" ? p.deltas.headPitch : p.deltas.headRoll;
    assert(Math.abs(delta) > 0.014 && Math.abs(actual.joints.head[axis] - [p.headPitch, p.headYaw, p.headRoll][axis]) < 1e-5,
      `${kind} uses the measured ${axis === 0 ? "nod" : "tilt"} joint`);
    if (kind === "understood") assert(p.deltas.smile > 0.001 && actual.joints.smile[4] === p.smile, "understanding moves the closed smile joint");
    this.row.peaks.push({ kind, actor: id, sequence: peak.p.reaction.sequence, weight: peak.p.reaction.weight,
      delta, actualHead: actual.joints.head, actualSmile: actual.joints.smile, time: peak.gameTime });
    return samples;
  }
}

function crossCheckVoice(f, pipeline) {
  assert(f, `a positive voiced frame was sampled in ${pipeline}`);
  const { p, media } = f;
  assert(p?.requestOwned && p.playback === "playing" && p.speakingLineId !== null,
    `owned speaking token (${media.key}/${pipeline}/${media.state})`);
  assert.equal(media.pipeline, pipeline);
  assert.equal(media.nativeState, pipeline === "html" ? "playing" : "running");
  assert(Math.abs(p.elapsed - media.time / (pipeline === "html" ? media.rate : 1)) < 0.06, "probe and real playhead agree");
  assert(Math.abs(p.envelope - media.envelope) <= 0.1, "probe and decoded envelope agree");
  const actor = actorIs(f, p.speakerId);
  assert(Math.abs(p.speaker.mouthScaleY - actor.mouth[1]) < 1e-5 && p.mouth > 0 && actor.mouth[1] > 0.2,
    "positive speech is reflected in the actual open mouth bone");
  if (p.scope === "session") {
    assert.equal(p.speakingLineId, f.conv.line);
    assert.equal(p.speakerId, f.conv.npc);
    assert.equal(f.scene.speaker, p.speakerId);
  }
  for (const [id, ch] of Object.entries(f.actual)) {
    if (id !== p.speakerId && ch.live && ch.visible && ch.weight > 0) silent(ch, `${id} during ${p.speakerId}'s recording`);
  }
}

async function voiced(route, predicate = () => true, initial = []) {
  const speaking = (f) => isVoice(f) && f.p?.mouth > 0.12 && predicate(f);
  const frame = initial.find(speaking) ?? await route.wait(speaking, "native voice, actual speaker and open bone");
  crossCheckVoice(frame, route.size.touch ? "buffer" : "html");
  return frame;
}

async function through(route, predicate, label, ms, initial = []) {
  const end = initial.findIndex(predicate);
  if (end !== -1) return initial.slice(0, end + 1);
  const rows = [...initial];
  await route.until(async () => {
    const started = Date.now();
    const f = await route.tick();
    if (rows.length < 700) rows.push(f);
    await route.filmFrame(f);
    if (predicate(f)) return true;
    await real(Math.max(1, stepMs - (Date.now() - started)));
    return false;
  }, label, ms);
  return rows;
}

const openingThrough = (route, predicate, label) => through(route, predicate, label, undefined, route.openingSamples());

async function quietTurn(route, actor, count = 36) {
  const rows = await route.series(count);
  const settled = rows.slice(4);
  assert(settled.at(-1).gameTime - settled[0].gameTime >= 0.5 - 1e-6, "half-second sampled learner wait");
  for (const f of settled) {
    assert(f.p?.listening && f.p.mouth <= 0.04 && f.media?.state !== "playing", "quiet listening without unrelated playback");
    silent(actorIs(f, actor), "waiting NPC");
  }
  return rows;
}

function checkRelease(old, at240, rest, reopen = false) {
  assert(!at240.conv.active || at240.conv.run !== old.conv.run, "old conversation run ended");
  assert(at240.media?.owner !== old.request || !["playing", "loading"].includes(at240.media?.state), "old request released");
  assert(!["playing", "loading"].includes(at240.release.voice), "pinned voice owner releases across cut");
  if (reopen) assert.equal(at240.release.voice, "interrupt", "closed while the old recording was still playing");
  silent(at240.release, "mouth within 240 ms after close");
  assert(rest.release.weight <= 0.001 && rest.release.playerWeight <= 0.001, "pinned pose releases within 300 ms");
  if (!rest.conv.active) {
    const who = old.p?.speakerId ?? old.conv.npc;
    assert(rest.actual[who]?.weight <= 0.001 && rest.actual.player.weight <= 0.001, "pose release within 300 ms");
  } else {
    assert(rest.conv.run > old.conv.run && rest.p?.run !== old.conv.run, "reopen owns a fresh binding");
  }
}

async function checkExitLens(route, old, closedAt) {
  const trace = await route.page.evaluate(() => window.__naturalTest.finishExit());
  (route.row.exits ??= []).push(trace);
  const { clear, frames, run } = trace;
  assert.equal(run, old.conv.run, "exit observation belongs to the outgoing run");
  assert(clear && Number.isFinite(closedAt) && clear.wall >= closedAt && clear.wall <= closedAt + 240,
    "the trusted close clears the outgoing talk projection within 240 ms");
  const { after } = clear;
  assert(!clear.talk && after.mode === gameplayMode(after) && !after.view?.enabled
    && after.projection.slice(2).every((value) => near(value, 0)), "actual clear removed the talk composition before gameplay rendered");
  assert(frames.length >= 2, "at least two rendered gameplay frames follow the clear");
  let previous = { frame: clear.frame, gameTime: clear.gameTime, lens: after };
  for (const current of frames) {
    const { frame, gameTime, lens } = current;
    assert(frame > previous.frame && gameTime >= previous.gameTime, "gameplay lens was drawn after the explicit clear");
    assertGameplayLens(lens, route.size, `exit frame ${frame}`, route.gameplay);
    const prior = previous.lens;
    if (lens.mode === prior.mode && lens.zone === prior.zone && sameViewport(lens, prior) && near(lens.targetFov, prior.targetFov)) {
      // Gameplay eases FOV at rate 3 per second and snaps within 0.05 degrees.
      const remaining = Math.abs(prior.fov - lens.targetFov) * Math.exp(-3 * (gameTime - previous.gameTime));
      assert(Math.abs(lens.fov - lens.targetFov) <= Math.max(0.05, remaining) + 1e-6,
        "FOV returns toward the gameplay lens on rendered frames");
    }
    previous = current;
  }
  return clear;
}

async function closeSession(route, { reopen = false } = {}) {
  const old = route.last;
  const who = old.p?.speakerId ?? old.conv.npc;
  await route.page.evaluate((id) => window.__naturalTest.pinRelease(id), who);
  const button = route.page.locator(".convo-head .head-actions .close-x").last();
  await route.press(button, "close through the original conversation button");
  if (reopen) {
    await route.beginOpening();
    await route.page.evaluate((id) => window.__ew.game.startScenario(id), old.conv.id);
  }
  const rows = [];
  for (let i = 1; i <= 9; i++) {
    const [f] = await route.series(1, 1000 / 30);
    rows.push(f);
    if ([1, 4, 9].includes(i)) await route.mark(`exit+${i}`, f);
  }
  const at240 = rows[6], rest = rows[8];
  await checkExitLens(route, old, rest.inputTimes.close);
  checkRelease(old, at240, rest, reopen);
  return { old, rest };
}

function motionPeak(rows, pattern, kinds, axis = "arm") {
  const candidates = rows.filter((f) => f.rendered && f.conv.text && pattern.test(f.conv.text) && kinds.includes(f.p?.gesture));
  const peak = candidates.reduce((a, b) => !a || b.p.gestureWeight > a.p.gestureWeight ? b : a, null);
  assert(peak?.p.gestureWeight > 0.20, `authored cue ${pattern} with a rendered stroke`);
  const { p } = peak, ch = actorIs(peak, p.speakerId);
  const joints = axis === "arm" ? [["upperL", "upperL", 0], ["upperR", "upperR", 0], ["foreL", "elbowL", 0], ["foreR", "elbowR", 0]]
    : [["head", "headPitch", 0], ["head", "headYaw", 1]];
  assert(joints.some(([joint, field, i]) => Math.abs(p.deltas[field]) > (axis === "arm" ? 0.035 : 0.014)
    && Math.abs(ch.joints[joint][i] - p.speaker[field]) < 1e-5), `${p.gesture} actually moves the ${axis} joint`);
  const at = rows.indexOf(peak), w = peak.p.gestureWeight;
  assert(rows.slice(0, at).some((f) => (f.p?.gestureWeight ?? 0) < w * 0.4)
    && rows.slice(at + 1).some((f) => (f.p?.gestureWeight ?? 0) < w * 0.4), "stroke eases in and out");
  return peak;
}

function transportWindows(rows, pipeline) {
  const playing = rows.filter((f) => f.media?.state === "playing" && f.p?.requestOwned && f.media.envelope !== null);
  const token = playing[0]?.request;
  const same = playing.filter((f) => f.request === token);
  const loud = same.filter((f) => f.media.envelope > 0.45);
  const quiet = same.filter((f) => f.media.time >= 0.90 && f.media.time <= 1.06 && f.media.envelope < 0.08);
  const context = JSON.stringify({ pipeline, key: same[0]?.media.key, token, samples: same.length, high: loud.length, low: quiet.length,
    playheads: same.map((f) => Math.round(f.media.time * 1000)) });
  assert(loud.length >= 3 && quiet.length >= 3 && loud.some((f) => f.media.time < 0.70) && loud.some((f) => f.media.time > 1.062), context);
  const following = (f, samples) => samples.filter((g) => g.media.time >= f.media.time && g.media.time - f.media.time <= 0.15);
  const high = loud.map((f) => Math.max(...following(f, same).map((g) => g.p.mouth)));
  const low = quiet.map((f) => Math.min(...following(f, quiet).map((g) => g.p.mouth)));
  assert(Math.max(...high) > 0.22 && spread(same.map((f) => f.p.mouth)) > 0.18 && mean(high) - mean(low) >= 0.12, context);
  const closed = quiet.filter((f) => f.p.mouth <= 0.04 && openMouth(f.actual[f.p.speakerId]) <= 0.00002);
  assert(closed.length >= 1 && loud.some((f) => f.media.time > 1.062 && f.p.mouth > 0.22), `lips close and reopen in the same clip: ${context}`);
  silent(closed.at(-1).actual[closed.at(-1).p.speakerId], "interior quiet window");
  crossCheckVoice(loud.find((f) => f.p.mouth > 0.22), pipeline);
  assert(rows.some((f) => f.request === token && (f.media?.state === "ended" || f.p?.playback === "ended")), `native end observed: ${context}`);
  return { token, high: mean(high), low: mean(low), peak: Math.max(...high), quietFrames: quiet.length };
}

const cafeOrder = pc ? "¿Me puede dar un latte grande con leche de avena para llevar?" : "Can I get a large latte with oat milk to go?";
async function cafe(route) {
  const entry = await route.start();
  const host = entry.conv.host;
  const timeline = await openingThrough(route, (f) => f.conv.phase === "you", "let the café opening play through");
  if (!route.film) route.row.transport = transportWindows(timeline, route.size.touch ? "buffer" : "html");
  const listen = await quietTurn(route, host);
  const early = listen.slice(0, 19).find((f) => f.p?.listeningWeight > 0.12);
  assert(early?.p.speaker.listening && early.actual[host].weight > 0.12, "barista adopts the listening turn at the counter");
  assert(listen.slice(12).every((f) => f.actual[host].hands.every((hand, i) => distance(hand, listen[12].actual[host].hands[i]) < 0.08)),
    "supported barista hands settle at the counter");
  const onsetPitch = actorIs(timeline.at(-1), host).joints.head[0];
  const settledPitch = listen.slice(19, 32).filter((f) => f.rendered).map((f) => {
    const pitch = actorIs(f, host).joints.head[0];
    const { headPitch, deltas } = f.p.speaker;
    assert(Math.abs(pitch - headPitch) < 1e-5 && deltas.headPitch >= 0.020 && deltas.headPitch <= 0.028,
      "supported barista inclination reaches the live head joint");
    return pitch;
  });
  route.row.listeningPitch = { onset: onsetPitch, settled: settledPitch };
  assert(settledPitch.length >= 3 && settledPitch.every((pitch) => pitch - onsetPitch > 0.012),
    "the rendered local head pitch changes from choice onset and stays inclined");
  await route.mark("listen");
  const mic = route.page.locator(".inputbar .mic");
  assert(await mic.isDisabled(), "recognition unsupported and typing still available");

  // Select an authored suggestion option without submitting or playing a model.
  const chip = route.page.locator(".guide .chip[aria-pressed=false]").first();
  await route.press(chip, "select a café order suggestion");
  assert.equal(await chip.count() > 0, true);
  await quietTurn(route, host);
  await route.press(route.page.locator(".guide-examples .gx-btns .play"), "play the learner's authored model");
  const model = await through(route, (f) => mediaPlaying(f) && f.media.time > 0.03 && f.conv.phase === "you", "model shares the real audio pipeline");
  assert(model.at(-1).media.time > 0.03 && !model.at(-1).p.requestOwned, "positive learner audio is separate from the NPC owner");
  const modelRest = await through(route, (f) => f.media?.state !== "playing" && f.media?.state !== "loading", "learner model ends");
  for (const f of [...model, ...modelRest].filter(mediaPlaying)) silent(actorIs(f, host), "learner-only audio");
  await route.answer("zzzqvv", { reaction: "puzzled" });
  await route.answer(cafeOrder, { reaction: "understood" });
  await through(route, (f) => f.conv.phase === "you", "next composed NPC line finishes");

  // The original menu board is behind the barista. Follow a legal question to it.
  const boardPattern = /password.*board|contraseña.*pizarr[oó]n/i;
  let frames = [];
  for (let variant = 0; variant < 2 && frames.length === 0; variant++) {
    await route.answer(pc ? "¿Cuál es la contraseña del wifi?" : "What's the Wi-Fi password?");
    const board = await through(route, (f) => f.conv.phase === "you", "behind-board line");
    frames = board.filter((f) => boardPattern.test(f.conv.text ?? "") && isVoice(f));
  }
  assert(frames.length >= 3 && frames.every((f) => f.p.gaze?.target !== "menu"), "behind-board reference never draws object gaze");
  assert(frames.some((f) => f.p.gaze?.target === "learner"), "barista retains learner gaze");

  const chipView = route.page.locator(".view-chip button");
  const heading = route.last.scene.heading;
  await route.press(chipView, "show authored picture");
  await route.wait((f) => f.scene.picture && !f.p && f.actual[host].weight === 0, "picture releases the presented actor");
  await route.press(chipView, "return to 3D");
  const returned = await route.wait((f) => !f.scene.picture && f.p?.run === entry.conv.run && f.scene.mode === "talk", "same run and camera after picture");
  assert(Math.abs(returned.scene.heading - heading) < 0.02);
  await route.panel(returned);
  await closeSession(route);
}

async function local(route) {
  const entry = await route.start(route.row.id, undefined, true);
  assert.equal(entry.scene.zone, "town");
  const host = entry.conv.host;
  const speaking = await voiced(route, undefined, route.openingSamples());
  assert(speaking.p.player?.mouth === 0 && speaking.p.player.gaze.target === host);
  const wait = await openingThrough(route, (f) => f.conv.phase === "you", "local opening ends");
  const selected = speaking.p.bystander?.actorId;
  if (selected) {
    const observer = actorIs(speaking, selected);
    assert(observer.identity !== speaking.actual[host].identity && speaking.p.bystander.role === "bystander");
    silent(observer, "selected nearby bystander");
  }
  const from = (await route.yourTurn()).conv.step;
  const answer = from === "from" ? (pc ? "Soy de Canadá." : "I'm from Lithuania.")
    : (pc ? "¿Dónde puedo comer pizza?" : "Can you recommend a good place to eat?");
  await route.answer(answer);
  await voiced(route, (f) => f.conv.line !== speaking.conv.line);
  await through(route, (f) => f.conv.phase === "you" || f.conv.phase === "ended", "the local replies");
  assert(wait.some((f) => f.p?.listening && f.p.player?.role === "learner"));
  await closeSession(route);
}

async function taxi(route) {
  const entry = await route.start();
  const host = entry.conv.host;
  assert.notEqual(entry.actual[host].anim, "sit", "driver is at the stand");
  const opening = await openingThrough(route, (f) => f.conv.phase === "you", "driver greets the learner");
  if (!pc) {
    assert(opening.some((f) => f.conv.text === taxiText && isVoice(f)), "authored Vinnie recording for the film");
    const beat = motionPeak(opening, /Hey! Where can I take you\?/, ["greeting"]);
    route.row.peaks.push({ kind: beat.p.gesture, time: beat.gameTime, weight: beat.p.gestureWeight,
      text: beat.conv.text, joints: beat.actual[host].joints, request: beat.request });
  } else {
    motionPeak(opening, /[¿?¡!]/u, ["greeting", "question", "headGreeting"], "head");
  }
  const firstTurn = (await route.yourTurn()).conv.step;
  await route.answer(firstTurn === "dest" && !pc ? "To the Harborview Hotel, please." : undefined);
  await voiced(route);
  const { old, rest } = await closeSession(route, { reopen: true });
  assert(!rest.scene.pendingRide && !rest.scene.ride, "interrupted dialogue does not enqueue or start a ride");
  const reopened = await route.start(route.row.id, host, false, false);
  assert(reopened.conv.run > old.conv.run && reopened.conv.host === host);
  const fresh = await voiced(route, undefined, route.openingSamples());
  assert(fresh.p.requestId !== old.p.requestId && fresh.request !== old.request);
  await through(route, (f) => f.conv.phase === "you", "reopened driver reaches a turn");
  const answers = pc ? {
    dest: "Al centro, por favor", fare: "Sí, está bien", haggle: "Está bien", from: "Soy de Estados Unidos",
    first: "Sí, es mi primera vez", ac: "Sí, por favor", stop: "Aquí está bien", pay: "Aquí tiene", far_terminal: "Sí, por favor",
  } : {
    dest: "To the Harborview Hotel, please.", ride_check: "No, I'm not.", vague: "The Harborview Hotel.", bag: "Yes, please.",
    talk: "I'm from Lithuania.", bball: "Yes, we love basketball!", first_time: "Yes, it's my first time here.",
    radio: "Sure, go ahead.", traffic: "Yes, that's fine.", stop: "Right here is fine.", pay: "Can I pay by card?",
    tip_screen: "Okay.", change: "Keep the change.", receipt: "No, thanks.", closing: "Thank you!",
  };
  for (let i = 0; i < 14 && !route.last.scene.pendingRide && route.last.conv.phase !== "ended"; i++) {
    await route.answer(answers[route.last.conv.step]);
    await through(route, (f) => f.conv.phase === "you" || f.conv.phase === "ended", "authored taxi ride turn");
  }
  const destination = route.last.scene.pendingRide;
  assert(destination?.to && destination.by === "taxi" && route.last.conv.completed, "legal answers queue the original taxi destination");
  const dropOff = await route.page.evaluate((id) => {
    const p = window.__ew.game.arrivalPoint(id);
    return p && [p.x, p.z];
  }, destination.to);
  assert(dropOff, "the original ride has a world destination");
  await closeSession(route);
  assert(!route.last.scene.pendingRide && route.last.scene.ride, "conversation exit launches the authored ride");
  const arrived = await route.wait((f) => f.rendered && !f.scene.ride && f.scene.zone === "town" && !f.conv.active, "normal taxi arrival");
  assert(Math.hypot(arrived.actual.player.root[0] - dropOff[0], arrived.actual.player.root[2] - dropOff[1]) < 0.5,
    "taxi brought the learner to the authored drop-off");
  for (const f of [arrived, ...await route.series(2)]) assertGameplayLens(f.scene.lens, route.size, "taxi destination");
}

const restaurantAnswers = pc ? {
  resv: "Una mesa para dos, por favor.", party: "Somos dos.", seatpref: "En la terraza, por favor.",
} : {
  resv: "No, we don't have a reservation.", party: "Two people, please.", seatpref: "Inside, please.",
  wait: "Sure, we can wait.",
};
const mhServerSteps = ["drinks", "howareyou"];

async function restaurantHandoff(route, entry) {
  const { host, run } = entry.conv;
  assert(entry.scene.cast.length >= 2, "restaurant has its actual host and server");
  const cast = Object.fromEntries([...entry.scene.cast, "player"].map((id) => [id, actorIs(entry, id).identity]));
  const trace = route.row.restaurant = { run, cast, turns: [] };
  const pipeline = route.size.touch ? "buffer" : "html";
  const server = (id) => pc ? id !== host && entry.scene.cast.includes(id) : id === "marco";
  const live = (f, id) => {
    const actor = actorIs(f, id);
    assert.equal(actor.identity, cast[id], `${id} is the same mounted Character throughout the handoff`);
    return actor;
  };
  const played = (f) => isVoice(f) && f.p?.requestOwned && f.p.mouth > 0.12
    && (pc && !route.film || f.media.source?.match && f.media.source.key !== transportKey);
  const sample = (f) => ({
    frame: f.frame, gameTime: f.gameTime, wall: f.wall, step: f.conv.step,
    actor: f.conv.npc, identity: f.actual[f.conv.npc]?.identity, line: f.conv.line,
    text: f.conv.text, request: f.speech, media: f.media,
  });
  const transcript = () => route.page.evaluate(() => window.__ew.store.getState().conv.transcript);
  try {
    const opening = await openingThrough(route, (f) => f.conv.phase === "you", "host completes the opening");
    const greeting = opening.find((f) => f.p?.speakerId === host && played(f));
    crossCheckVoice(greeting, pipeline);
    live(greeting, host);
    trace.opening = sample(greeting);
    let turn = opening.at(-1), waited = false;
    if (!pc) assert.equal(turn.conv.step, "resv");
    for (let i = 0; i < 6; i++) {
      const { step, npc } = turn.conv;
      const followWait = !pc && step === "wait" && waited;
      const text = followWait ? "That's fine." : restaurantAnswers[step];
      const attempt = { step, npc, line: turn.p?.lineId, text, replies: [] };
      trace.turns.push(attempt);
      assert.equal(npc, host, "the host owns each turn before seating");
      if (!pc) assert(text, `unexpected MH restaurant step ${step}`);
      const answer = attempt.answer = await route.answer(text);
      assert(answer.via === "typed" && answer.id > attempt.line, "fresh learner transcript ID from the typebox");
      // Accepting the wait holds that step for one acknowledgement. The next
      // answer triggers table_ready and seating on the existing authored path.
      const next = {
        resv: ["party"], party: ["wait", "seatpref", ...mhServerSteps],
        wait: followWait ? mhServerSteps : ["wait"], seatpref: mhServerSteps,
      }[step];
      const passage = await through(route, (f) => {
        assert(f.conv.active && f.conv.run === run && f.conv.id === entry.conv.id,
          "the restaurant reply belongs to the original run");
        assert(f.conv.phase !== "ended", "the dialogue reaches seating before it ends");
        const fresh = f.conv.line > answer.id;
        if (fresh && attempt.replies.at(-1)?.line !== f.conv.line) {
          attempt.replies.push(sample(f));
          assert(f.conv.npc === host || server(f.conv.npc), `unexpected restaurant speaker ${f.conv.npc}`);
        }
        if (!pc && (fresh || f.conv.phase === "you")) {
          assert(next.includes(f.conv.step), `unexpected MH restaurant transition ${step} → ${f.conv.step}`);
          if (f.conv.step === "wait" && step === "wait" && fresh) {
            assert(f.conv.npc === host && f.conv.text === "Great. It won't take long.", "the authored wait acknowledgement holds this turn");
          }
        }
        return f.conv.phase === "you";
      }, "host seats the learner or asks the next question");
      if (step === "wait") waited = true;
      turn = passage.at(-1);
      attempt.result = { step: turn.conv.step, npc: turn.conv.npc, line: turn.p?.lineId };
      assert(attempt.replies.length && attempt.result.line > answer.id, "the answer advances to fresh NPC transcript IDs");
      const actors = passage.filter((f) => f.rendered && f.conv.line > answer.id && f.p?.speakingLineId === f.conv.line);
      const handoff = actors.find((f) => server(f.p.speakerId));
      if (!handoff) {
        if (!pc) assert(!mhServerSteps.includes(turn.conv.step), "the seating turn contains Marco's entry");
        continue;
      }

      const id = handoff.p.speakerId;
      assert.equal(turn.conv.npc, id, "the learner turn belongs to the new speaker");
      if (!pc) assert(mhServerSteps.includes(turn.conv.step), "Marco greets the learner or asks about drinks");
      const swap = handoff.speech;
      assert(swap?.line === handoff.conv.line && swap.run === run && swap.actor === id && Number.isFinite(swap.gameTime),
        "the first rendered handoff corresponds to the incoming request");
      trace.handoff = { first: sample(handoff) };
      await route.mark("cast-handoff", handoff);
      const outgoing = actors.findLast((f) => f.frame < handoff.frame && f.p.speakerId === host && played(f));
      const incoming = actors.find((f) => f.gameTime - handoff.gameTime >= 0.10 && f.p.speakerId === id
        && (pc || f.conv.line === handoff.conv.line) && played(f));
      assert(outgoing && incoming, "heard the outgoing seating reply and incoming line on their own playheads");
      crossCheckVoice(outgoing, pipeline);
      crossCheckVoice(incoming, pipeline);
      assert(outgoing.conv.line < incoming.conv.line && outgoing.request !== incoming.request, "the cast voices use distinct transcript and request IDs");
      live(outgoing, host);
      live(incoming, id);
      assert.notEqual(cast[host], cast[id], "the two live speakers are distinct characters");
      Object.assign(trace.handoff, { outgoing: sample(outgoing), incoming: sample(incoming) });
      await route.mark("cast-switch", incoming);

      let released = false, aimed = false;
      for (const f of passage.slice(passage.indexOf(handoff)).filter((f) => f.rendered)) {
        const old = live(f, host), head = live(f, id).headWorld, player = live(f, "player");
        const oldPose = f.p?.others?.find((a) => a.actorId === host);
        assert(f.p?.run === run && f.p.speakerId === id && oldPose, "the live incoming speaker and outgoing cast remain bound");
        const age = f.gameTime - swap.gameTime;
        if (!released && age <= 0.24 + 1e-6 && openMouth(old) <= 0.00002 && oldPose.gestureWeight <= 0.001) {
          silent(old, "outgoing host within 240 ms of the handoff");
          trace.handoff.release = { frame: f.frame, age, mouth: old.mouth, gestureWeight: oldPose.gestureWeight };
          released = true;
        }
        if (released || age >= 0.24) {
          silent(old, "outgoing host after speaker switch");
          assert(oldPose.gestureWeight <= 0.001, "old actor has no delayed stroke");
        }
        const dx = head[0] - player.root[0], dz = head[2] - player.root[2];
        const facing = (player.facing[0] * dx + player.facing[2] * dz) / Math.hypot(dx, dz);
        if (!aimed && f.p.player?.gaze.target === id && player.gazeAim && distance(player.gazeAim, head) < 0.15 && facing > 0.5) {
          trace.handoff.aim = { frame: f.frame, age, target: player.gazeAim, head, facing };
          aimed = true;
        }
      }
      assert(released, "sampled the outgoing host's closed lips and released gesture within 240 ms of the handoff");
      assert(aimed, "learner's rendered facing and gaze target move to the incoming actor");
      trace.transcript = await transcript();
      return;
    }
    assert.fail("an authored answer must change the live speaker from host to server within six turns");
  } catch (error) {
    trace.transcript = await transcript().catch((failure) => failure.message);
    throw new Error(`${error.message}\n${JSON.stringify(trace)}\n${route.diagnostic()}`, { cause: error });
  }
}

async function restaurant(route) {
  await restaurantHandoff(route, await route.start());
  await closeSession(route);
}

const ticketAnswers = pc ? {
  dest: "Quisiera un boleto para Cancún.", count: "Uno, por favor.", trip: "Solo de ida, por favor.",
  travel_day: "Hoy, por favor.", pay: "Con tarjeta, por favor.",
} : {
  dest: "A single to Portland, please.", count: "One, please.", trip: "One-way, please.",
  travel_day: "Today, please.", cls: "Coach, please.", pay: "Card, please.",
};
const ticketText = pc ? /aquí tiene su[s]? boleto/i : /here(?:'s| are) your ticket/i;

async function ticketReturn(route, rows, glance) {
  const { npc: host, run, line } = glance.conv;
  const clerk = actorIs(glance, host), learner = actorIs(glance, "player");
  assert(clerk.poseId != null, "the observed ticket glance uses a live pose binding");
  const until = glance.gameTime + 0.85;
  let back;
  await through(route, (f) => {
    if (!f.rendered) return false;
    if (f.gameTime >= until) return true;
    const current = actorIs(f, host), player = actorIs(f, "player");
    assert(f.conv.active && f.conv.id === glance.conv.id && f.conv.run === run && f.conv.npc === host
      && f.p?.scope === "session" && f.p.run === run && f.p.speakerId === host
      && f.p.lineId === line && (f.conv.line === null || f.conv.line === line) && f.request === glance.request
      && current.identity === clerk.identity && current.poseId === clerk.poseId && player.identity === learner.identity,
    "the ticket gaze stays on the original mounted clerk, learner, run and utterance");
    if (!back && f.p.gaze?.target === "learner" && f.p.speaker?.watching && current.gazeAim
      && distance(current.gazeAim, player.headWorld) < 0.15) back = f;
    return false;
  }, "sample the ticket glance through its original game-time window", undefined, rows.slice(rows.indexOf(glance) + 1));
  assert(back && back.gameTime - glance.gameTime < 0.85, `brief object glance returns to the learner: ${route.diagnostic()}`);
  return back;
}

async function tickets(route) {
  const entry = await route.start();
  const host = entry.conv.host;
  assert.equal(entry.scene.zone, "station");
  const rows = await openingThrough(route, (f) => f.conv.phase === "you", "ticket clerk's opening");
  for (let turn = 0; turn < 7 && !rows.some((f) => ticketText.test(f.conv.text ?? "")); turn++) {
    await route.answer(ticketAnswers[route.last.conv.step]);
    rows.push(...await through(route, (f) => f.conv.phase === "you" || f.conv.phase === "ended", "authored ticket counter response"));
  }
  const handoff = rows.filter((f) => ticketText.test(f.conv.text ?? "") && f.p?.speakerId === host && isVoice(f));
  assert(handoff.length >= 3, "ticket_one/ticket_many handoff was voiced at the station");
  const gaze = handoff.find((f) => f.p.gaze?.target === "handoff" && f.p.gaze.pitch > 0.015 && f.p.gaze.eyeY < -0.0005);
  assert(gaze, "front-facing ticket anchor draws signed downward head and iris motion");
  const ch = actorIs(gaze, host);
  const anchor = [-6, 1.08, -6]; // same station counter, in both town sources
  const dx = anchor[0] - ch.headWorld[0], dy = anchor[1] - ch.headWorld[1], dz = anchor[2] - ch.headWorld[2];
  const forward = (ch.facing[0] * dx + ch.facing[2] * dz) / Math.hypot(dx, dz);
  assert(forward > Math.cos(65 * Math.PI / 180) && Math.abs(Math.atan2(dy, Math.hypot(dx, dz))) <= 35 * Math.PI / 180,
    "anchor is in front and within the source gaze cone");
  assert(handoff.filter((f) => f.conv.run === gaze.conv.run && f.conv.line === gaze.conv.line && f.request === gaze.request
    && f.actual[host]?.identity === ch.identity).length >= 3, "three voiced samples belong to the same live ticket handoff");
  const back = await ticketReturn(route, rows, gaze);
  assert(ch.joints.head[0] - back.actual[host].joints.head[0] > 0.006
    && ch.joints.iris[4] - back.actual[host].joints.iris[4] < -0.0005, "signed motion appears on the rendered joints");
  const [px, py, depth] = ch.headScreen;
  const [left, top, right, bottom] = gaze.scene.panel;
  assert(ch.headWorld[1] > anchor[1] + 0.2 && Math.abs(depth) < 1
    && (px < left || px > right || py < top || py > bottom), "face sits above the counter in the uncovered viewport");
  const resting = actorIs(back, host);
  assert(ch.hands.every((hand, i) => distance(hand, resting.hands[i]) < 0.08 || hand[1] >= anchor[1] + 0.065),
    "hands remain supported or clear the counter before reaching");
  await route.mark("object-glance", gaze);
  await route.mark("object-return", back);
  await closeSession(route);
}

async function way(route) {
  const entry = await route.start(directions, directionActor, true);
  assert(!entry.conv.phone && entry.scene.zone === "town");
  await openingThrough(route, (f) => f.conv.phase === "you", "directions opening");
  // Leave the opening arm cue outside the cooldown without changing any random source.
  await route.series(42, 1000 / 30);
  await route.answer(pc ? "Disculpe, ¿cómo llego al correo?" : "Excuse me, how do I get to the post office?");
  const spoken = await through(route, (f) => f.conv.phase === "you", "NPC gives the real directions");
  const point = motionPeak(spoken, pc ? /Cruce.*izquierda|correo.*junto al/i : /Cross.*turn left|post office.*next to/i, ["point"]);
  assert.equal(point.p.speakerId, directionActor);
  route.row.peaks.push({ kind: "point", time: point.gameTime, text: point.conv.text, weight: point.p.gestureWeight,
    request: point.request, joints: point.actual[directionActor].joints });
  assert(spoken.filter((f) => /miss it|no tiene pierde|es muy fácil/i.test(f.conv.text ?? "") && isVoice(f))
    .some((f) => (f.p.gestureWeight ?? 0) < 0.001), "unmarked authored line rests");
  await route.answer(pc ? "¿Puede hablar más despacio, por favor?" : "Could you speak more slowly, please?", { reaction: "repeat" });
  const repeat = await through(route, (f) => f.conv.phase === "you", "the same directions play slowly");
  const repeated = repeat.filter((f) => isVoice(f) && f.media.rate === 0.82 && f.conv.text === point.conv.text);
  assert(repeated.length > 0 && repeated.every((f) => f.p.gesture !== "point" || f.p.gestureWeight < 0.001), "slow replay does not repeat the point");
  assert(repeat.at(-1).conv.slow);
  await route.mark("repeat");
  await route.answer(pc ? "¡Muchas gracias!" : "Thank you so much!");
  const ending = await through(route, (f) => f.conv.phase === "ended" && f.conv.completed, "a natural goodbye opens the end card");
  ending.push(...await route.series(40));
  await route.until(() => route.page.locator(".ended-box .ended-title").isVisible(), "visible directions end card");
  const farewells = ending.filter((f) => f.p?.reaction?.kind === "farewell");
  assert.equal(new Set(farewells.map((f) => f.p.reaction.sequence)).size, 1, "one bounded farewell");
  assert(farewells.some((f) => f.p.reaction.weight > 0.1), "farewell animated");
  assert((ending.at(-1).p?.reaction?.weight ?? 0) < 0.001 && ending.at(-1).conv.visits === 1, "farewell eases out and original completion is written once");
  await closeSession(route);
  await route.until(() => route.page.locator(".directions-card").isVisible(), "closing reveals directions for the existing destination");
}

function seated(frames, id, table) {
  const samples = frames.map((f) => actorIs(f, id));
  const start = samples[0], [x, y, z] = table;
  assert(start.anim === "sit" && start.seat > 0.4 && start.seat < 0.65 && start.pelvis[1] > 0.33 && start.pelvis[1] < 0.76,
    `${id} supported seated pelvis: ${JSON.stringify(start.pelvis)}`);
  assert(samples.every((ch) => distance(ch.root, start.root) < 0.01 && distance(ch.pelvis, start.pelvis) < 0.03), `${id} stays on the seat`);
  for (const ch of samples) for (const [i, hand] of ch.hands.entries()) {
    assert(hand?.every(Number.isFinite) && hand[1] > 0.43 && hand[1] < 1.35, `${id} resting hand ${i}`);
    const elbow = ch.elbows[i];
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const [a, b, c] = elbow.map((p, j) => p + (hand[j] - p) * t);
      assert(!(Math.abs(a - x) < table[3] / 2 - 0.08 && Math.abs(c - z) < table[4] / 2 - 0.04
        && b > y - 0.06 && b < y - 0.012), `${id} reaches through the table slab at ${[a, b, c]}`);
    }
  }
}

async function tableGame(route) {
  if (pc) {
    assert(await route.page.evaluate(() => window.__ew.loteria.stage(2, 1)), "seed the existing lotería deck at normal speed");
    await route.start(dinner, "tona", true);
    await voiced(route, undefined, route.openingSamples());
    for (const answer of ["Sí, claro", "No. ¿Me explica?", "¿Juega seguido?"]) await route.answer(answer);
    await through(route, (f) => f.conv.phase === "ended", "Toña's natural lotería offer");
    await route.press(route.page.locator(".loteria-cta"), "accept Doña Toña's lotería offer");
  } else {
    await route.until(() => route.page.evaluate(() => {
      window.__step(2);
      return window.__ew.game.nearest?.id === "gofish";
    }), "Go Fish interaction at the saved dining table");
    await route.interact();
    await route.page.evaluate(() => window.__ew.gofish.seed(124));
    const start = route.page.locator(".gofish-offer .gofish-offer-actions")
      .getByRole("button", { name: "Pažaisti „Go Fish“", exact: true });
    const acceptance = await route.press(start, "accept Dan's Go Fish offer", { action: "gofish-start", count: 1 });
    assert.equal(acceptance.before.table, "offer");
    const started = await route.wait((f) => f.table.gf === "starting" || f.scene.modeId === "gofish",
      "the offer advances to the real Go Fish table", 4500);
    acceptance.after = { table: started.table.gf, mode: started.scene.modeId, camera: started.scene.mode };
  }
  const id = pc ? "loteria" : "gofish";
  const caller = pc ? "beto" : "nora", companion = pc ? "tona" : "dan";
  const first = await voiced(route, (f) => f.scene.modeId === id && f.p.scope === "mode" && f.p.speakerId === caller);
  assert.equal(first.scene.mode, "stage");
  const rows = await through(route, (f) => pc ? f.table.lot === "waiting" : f.table.gf === "ask", "the table game reaches a real learner wait", 28_000);
  const callerLines = new Set([first, ...rows].filter((f) => f.p?.speakerId === caller && f.p?.scope === "mode" && isVoice(f)).map((f) => f.p.lineId));
  assert(callerLines.size >= 2, "two distinct caller utterances at the actual table");
  const waiting = (await route.series(22)).slice(6);
  seated(waiting, companion, pc ? [22, 0.94, -27, 3.35, 1] : [1.5, 0.79, -1.5, 2.6, 1.2]);
  if (!pc) seated(waiting, caller, [1.5, 0.79, -1.5, 2.6, 1.2]);
  for (const f of waiting) {
    silent(actorIs(f, companion), "seated companion waiting");
    const player = f.actual.player;
    assert(player.live && player.anim === "sit", "learner remains seated during the wait");
    if (player.visible) silent(actorIs(f, "player"), "visible waiting learner");
    else assert(player.weight === 0, "the original stage hides the learner and leaves their visual controller released");
  }
  route.row.learnerVisibleAtTable = waiting.some((f) => f.actual.player.visible);
  await route.mark("listen");
  if (pc) {
    const uncalled = await route.page.evaluate(() => {
      const { board, calls } = window.__ew.loteria.state();
      return board.find((id) => !calls.includes(id));
    });
    assert(uncalled, "there is a legal uncalled card for the teacher cue");
    await route.press(route.page.locator(`.loteria-cell[data-card="${uncalled}"]`), "tap an uncalled lotería card");
  } else {
    const card = route.page.locator('.gofish-card[data-word="hot_dog"]:enabled');
    await route.press(card, "select the seeded hot dog card", { action: "gofish-select-card", count: 1 });
    assert.equal(await card.getAttribute("aria-pressed"), "true", "the hot dog card is selected");
    // Space activates the chip itself. Go Fish uses Enter to submit the selected card as a mode shortcut.
    await route.press(route.page.locator('.gofish-choice[data-line="gf_ask_hot_dog"]:enabled'), "ask Dan for a hot dog",
      { action: "gofish-ask-dan", count: 1, key: "Space" });
  }
  await voiced(route, (f) => f.p.scope === "mode" && f.p.speakerId === companion);
  await route.press(route.page.locator(pc ? ".loteria-exit" : ".gofish-exit"), "leave through the table game's exit",
    pc ? undefined : { action: "gofish-exit", count: 1, key: "Space" });
  const left = await route.wait((f) => !f.scene.modeId && !f.scene.transition && f.actual.player.visible && f.actual.player.anim === "idle", "leave table and restore learner");
  assert.equal(left.actual.player.weight, 0);
}

async function street(route) {
  const choices = (exchange) => route.page.locator(
    `section.street-card[data-moment="i_dropped"][data-step="choices"][data-exchange="${exchange}"][data-cast="a"][data-script="first"] .street-choice`);
  assert(await route.page.evaluate(() => window.__ew.game.streetNow("i_dropped", "a")), "placed the authored world street encounter");
  const first = await route.wait((f) => f.street?.step === "choices" && f.street.exchange === 0 && f.p?.scope === "street" && f.p.listening,
    "real passer-by waits for a choice");
  assert.deepEqual([first.street.id, first.street.cast, first.street.script], ["i_dropped", "a", "first"]);
  assert(first.street.person && !first.conv.active && first.scene.zone === "town");
  const person = actorIs(first, "a");
  assert(first.p.player?.actorId === "player" && first.actual.player.live);
  const waiting = await route.series(36);
  for (const f of waiting.slice(4)) {
    assert(f.p?.listening && f.street.step === "choices");
    silent(actorIs(f, "a"), "placed passer-by listens");
  }
  assert(waiting.some((f) => f.p?.listeningWeight > 0.15 && f.p.deltas.torsoPitch > 0.004), "passer-by leans into the choice");
  await route.mark("listen");
  const firstChoices = choices(0);
  if (!route.size.touch && await firstChoices.first().isVisible()
    && await route.page.evaluate(() => window.__ew.store.getState().hud.coach?.step === "list")) {
    const hit = await firstChoices.first().evaluate(inspectControl, { scroll: false, edges: false });
    if (hit.listCoachCoversCenter) {
      route.row.streetListCoach = hit;
      const next = route.page.locator(".hud .coach .coach-next");
      await route.press(next, "dismiss the returning learner's list hint", { action: "street-list-coach", count: 1, mouse: true });
      assert.equal(await route.page.evaluate(() => window.__ew.store.getState().hud.coach), null);
      await route.page.keyboard.press("Tab");
    }
  }
  const firstChoice = await route.press(firstChoices, "choose an authored street reply",
    { action: "street-choice-0", count: 2, edges: true });
  const voicedReply = await voiced(route, (f) => f.p?.scope === "street" && f.street?.step === "reply" && f.street.exchange === 0);
  firstChoice.after = voicedReply.street;
  assert.equal(voicedReply.actual.a.identity, person.identity);
  const replies = await through(route, (f) => f.street?.step === "choices" && f.street.exchange === 1 && f.p?.listening,
    "street reply ends and the second choice appears");
  assert(replies.some((f) => f.p?.lineId !== voicedReply.p.lineId && f.street?.step === "reply" && f.street.exchange === 0
    && f.actual.a?.identity === person.identity && isVoice(f)));
  assert.equal(actorIs(replies.at(-1), "a").identity, person.identity);
  const secondChoice = await route.press(choices(1), "close the exchange with the next authored answer",
    { action: "street-choice-1", count: 2, edges: true });
  const closing = await through(route, (f) => !f.street && !f.p, "the street actor walks away and releases");
  const finalReply = closing.find((f) => f.street?.step === "reply" && f.street.exchange === 1);
  assert.equal(finalReply?.actual.a?.identity, person.identity, "the same passer-by replies to the second choice");
  secondChoice.after = finalReply.street;
}

async function missingRecording(route) {
  await route.start(directions, directionActor, true);
  const rows = await openingThrough(route, (f) => f.conv.phase === "you", "optional missing voice leaves the text and the turn usable");
  assert(rows.some((f) => f.conv.text && f.p?.mouth === 0), "missing line shown silently");
  assert(await route.page.locator(".transcript .msg.npc .bubble").first().isVisible());
  const quiet = await quietTurn(route, directionActor);
  assert(quiet.at(-1).gameTime - quiet[4].gameTime >= 0.24, "non-playing mouth remains closed");
  assert(route.missingUrls.size >= 1, "actual 404 from the dedicated optionalVoice clip");
  await route.answer(pc ? "Disculpe, ¿cómo llego al correo?" : "Excuse me, how do I get to the post office?");
  await voiced(route);
  await through(route, (f) => f.conv.phase === "you", "next recorded turn still works after the missing clip");
  await closeSession(route);
}

async function micExample(route) {
  const entry = await route.start();
  await openingThrough(route, (f) => f.conv.phase === "you", "standing driver's voice ends before recognition");
  const on = await route.wait((f) => f.conv.mic === "listening" && f.p?.listening, "real mic status redraw");
  const settled = await quietTurn(route, entry.conv.host);
  assert(settled.every((f) => f.conv.mic === "listening"), "native callback shape keeps recognition active");
  assert(settled.slice(0, 19).some((f) => f.p.listeningWeight > 0.15 && (f.p.deltas.torsoPitch > 0.005 || Math.abs(f.p.deltas.elbowL) > 0.025)),
    "listening changes the pose within 320 ms");
  await route.press(route.page.locator(".type-toggle"), "typing releases the active recognizer");
  const typing = await route.wait((f) => f.conv.typing && f.conv.mic === "off" && f.p?.listening, "typing remains a listening turn");
  assert.equal(typing.conv.run, on.conv.run);
  await route.press(route.page.locator(".inputbar .mic"), "reopen the real mic control");
  await route.wait((f) => f.conv.mic === "listening", "second local attempt starts");
  assert(await route.page.evaluate((text) => window.__naturalSpeak(text),
    pc ? "Al centro, por favor" : "To the Harborview Hotel, please."), "local recognition delivered a final transcript");
  await route.wait((f) => f.conv.mic === "off" && f.conv.phase === "npc", "local callback submits through Session");
  const heard = await route.page.evaluate(() => window.__ew.store.getState().conv.transcript.find((line) => line.who === "you"));
  assert(heard?.understood && heard.via === "voice", "actual understood speech transcript row");
  await voiced(route);
  await closeSession(route);
}

function reducedStill(rows, ids) {
  const jitter = {};
  for (const id of ids) {
    const cast = rows.map((f) => actorIs(f, id));
    const keys = Object.keys(cast[0].joints);
    for (const key of keys) {
      assert(cast.every((actor) => actor.joints[key]?.length === 6), `${id}/${key} skeletal sample`);
    }
    jitter[id] = Math.max(...keys.flatMap((key) => cast[0].joints[key].map((_, i) => spread(cast.map((actor) => actor.joints[key][i])))));
    assert(jitter[id] <= 0.002, `${id} reduced-motion joint variation ${jitter[id]}`);
  }
  assert(rows.every((f) => f.reduced && f.p?.reduced && !f.p.gestureWeight && !f.p.speaker.reactionWeight
    && !f.p.reaction?.weight && !f.p.gaze?.eyeX && !f.p.gaze?.eyeY && !f.p.gaze?.yaw && !f.p.gaze?.pitch),
    "reduced motion has steady gaze and zero gesture/feedback weights");
  return jitter;
}

async function reducedMotion(route) {
  const first = await route.start();
  assert(first.reduced && first.p.reduced && first.p.bystander, "fresh reduced context binds the actual cast, learner and café bystander");
  const ids = [first.conv.host, "player", first.p.bystander.actorId, ...first.p.others.map(({ actorId }) => actorId)];
  const opening = await openingThrough(route, (f) => f.conv.phase === "you", "the reduced opening recording plays to the learner turn");
  const speech = opening.filter((f) => isVoice(f) && f.p?.requestOwned);
  assert(speech.length >= 3 && spread(speech.map((f) => f.p.mouth)) > 0.18
    && spread(speech.map((f) => openMouth(f.actual[first.conv.host]))) > 0.18, "reduced mode still follows voiced amplitude");
  crossCheckVoice(speech.find((f) => f.p.mouth > 0.2), route.size.touch ? "buffer" : "html");
  await route.series(16);
  const still = await route.series(216, 1000 / 30);
  assert(still.at(-1).gameTime - still[0].gameTime >= 7, "sample ≥7 game seconds after binding and settle");
  route.row.maxJointRanges = reducedStill(still, ids);
  assert(still.some((f) => f.p.blink > 0.45 && f.actual[first.conv.host].eyeScale < 0.65), "rendered blink during the reduced wait");
  for (const f of still.filter((_, i) => i % 15 === 0)) silent(f.actual[first.conv.host], "reduced non-speaking mouth");

  await route.page.emulateMedia({ reducedMotion: "no-preference" });
  await route.wait((f) => !f.reduced && !f.p?.reduced, "live full-motion preference restored");
  await route.answer(cafeOrder);
  const active = await voiced(route);
  await route.page.emulateMedia({ reducedMotion: "reduce" });
  const toggled = await route.wait((f) => f.reduced && f.p?.reduced, "toggle reduced motion during a live turn");
  assert.equal(toggled.conv.run, active.conv.run);
  assert.equal(toggled.request, active.request, "the real voice keeps its token during the media change");
  const after = await through(route, (f) => f.conv.phase === "you", "let the toggled line finish");
  assert(after.some((f) => isVoice(f) && f.p?.mouth > 0.22), "speech continues through preference change");
  const tail = await route.series(25);
  reducedStill([...after, ...tail].slice(4), ids);
  await closeSession(route);

  const warm = await route.start();
  assert(warm.p.reduced && warm.conv.run > first.conv.run, "cached presentation respects reduced motion on reopen");
  await voiced(route, undefined, route.openingSamples());
  await closeSession(route);
}

async function interruptEntry(route) {
  await route.beginOpening();
  await route.page.evaluate(() => window.__ew.game.startScenario("s72-cafe"));
  const entry = await route.wait((f) => f.conv.intro && f.conv.active && !!f.scene.panel, "early café intro before speech");
  await route.finishOpening(entry);
  await closeSession(route);
  const closed = await route.series(24);
  assert(closed.every((f) => !f.conv.active && !f.p && !f.media?.owner), "early exit never leaks a late binding or playback");
  const warm = await route.start();
  assert(warm.conv.run > entry.conv.run);
  await voiced(route, undefined, route.openingSamples());
  await closeSession(route);
}

const routes = new Map([
  ["s72-cafe", cafe], ["s69-local", local], [dinner, tableGame], ["s66-taxi", taxi],
  ["s67a-tickets", tickets], ["s73-restaurant", restaurant], [directions, way], ["street-i_dropped", street],
]);

async function startFilm(route, actor, zone, kind) {
  ({ actor, zone } = await route.page.evaluate(({ actor, zone, id, pc }) => {
    const { game } = window.__ew;
    if (pc) {
      const meta = game.orderedSituations().find((sit) => sit.id === id);
      if (meta) {
        actor = meta.npc;
        zone = game.getZone(meta.location)?.interior ? meta.location : "town";
      }
    }
    if (game.zone.id !== zone) game.enterZone(zone, undefined, true);
    if (actor === "vinnie") {
      const { home, rot } = game.npcs.find((n) => n.id === actor);
      // Begin outside the ordinary 4.5 m wave radius and use the normal walk
      // path to enter it. Never set the actor's animation from the test.
      game.placeOnFoot(home.x + Math.sin(rot) * 4.8, home.z + Math.cos(rot) * 4.8, rot + Math.PI);
    }
    window.__naturalTest.track(actor);
    return { actor, zone };
  }, { actor, zone, id: route.row.id, pc }));
  await route.wait((f) => f.scene.zone === zone && f.rendered && f.actual[actor]?.live && !f.scene.transition, "approach location rendered");
  await route.capture.start(kind);
  await route.series(4);
  return route.start(route.row.id, actor, true);
}

async function filmExit(route) {
  const f = await route.tick();
  await route.page.evaluate((id) => window.__naturalTest.pinRelease(id), f.p?.speakerId ?? f.conv.npc);
  await route.mark("close", f, { image: false });
  await route.press(route.page.locator(".convo-head .head-actions .close-x").last(), "close through the original conversation button");
  const closed = await route.wait((f) => !f.conv.active && f.rendered, "first rendered frame after release begins");
  await route.mark("release", closed, { image: false });
  const closedAt = closed.inputTimes?.close;
  assert(Number.isFinite(closedAt), "trusted close button timestamp");
  const returned = [closed, ...await through(route, (f) => f.rendered && f.wall >= closedAt + 300
    && f.gameTime >= closed.gameTime + 0.3, "filmed release through 300 ms of game time", 2500)];
  for (const offset of [1, 4, 9]) {
    const f = returned.find((f) => f.rendered && f.wall >= closedAt + offset * 1000 / 30);
    assert(f, `rendered release +${offset}/30 s`);
    await route.mark(`exit+${offset}`, f);
  }
  await route.series(5);
  const clear = await checkExitLens(route, f, closedAt);
  const releasedAt = (ms) => returned.find((frame) => frame.rendered && frame.gameTime >= clear.gameTime + ms / 1000 - 1e-6);
  const at240 = releasedAt(240), at300 = releasedAt(300);
  assert(at240 && at300, "rendered release at the 240 ms and 300 ms checks");
  checkRelease(f, at240, at300);
}

async function filmCafe(route) {
  const reduced = route.subcase === "reduced";
  const entry = await startFilm(route, "mia", "sunny-cup", reduced ? "Mia · reduced motion" : "Mia · counter, miss, yes and slow replay");
  const opening = await openingThrough(route, (f) => f.conv.phase === "you", "Mia's real opening to learner turn");
  const spoken = opening.find((f) => isVoice(f) && f.p?.requestOwned && f.p.mouth > 0.22
    && f.media.envelope > 0.45 && f.media.source?.match);
  const quiet = opening.find((f, i) => f.request === spoken?.request && f.media?.state === "playing"
    && f.media.envelope >= 0 && f.media.envelope < 0.08 && f.p?.mouth <= 0.04
    && opening.slice(0, i).some((g) => g.request === f.request && isVoice(g) && g.p?.mouth > 0.22)
    && opening.slice(i + 1).some((g) => g.request === f.request && isVoice(g) && g.p?.mouth > 0.22));
  if (spoken) await route.mark("voiced-high", spoken);
  if (quiet) await route.mark("voiced-low", quiet);
  if (!spoken || (!pc && spoken.media.source.key !== transportKey) || !quiet) {
    route.row.errors.push("Mia's matching opening did not supply voiced and internal quiet frames on the same playhead");
  }
  const listening = opening.at(-1).p?.listening ? opening.at(-1) : await route.yourTurn();
  await route.mark("listen-start", listening, { image: false });
  for (const seconds of [0.32, 2]) {
    const f = await route.wait((f) => f.rendered && f.p?.listening && f.clock >= listening.clock + seconds * 1000,
      `counter still listening after ${seconds} s`);
    await route.mark(seconds < 1 ? "listen" : "listen+2s", f);
  }
  if (reduced) await route.mark("reduced-motion", route.last, { image: false });
  if (!reduced) {
    await route.answer(pc ? "¿Puede hablar más despacio, por favor?" : "Could you speak more slowly, please?");
    const replay = await through(route, (f) => f.conv.phase === "you", "matching slow repeat");
    const slow = replay.find((f) => isVoice(f) && f.p?.requestOwned && f.media.source?.key === spoken?.media.source.key
      && f.media.rate === 0.82 && f.conv.run === entry.conv.run && f.conv.text === spoken.conv.text);
    if (slow) await route.mark("repeat", slow);
    else route.row.errors.push("the matching opening must replay slowly");
    await route.answer("zzzqvv", { reaction: "puzzled" });
    await route.answer(cafeOrder, { reaction: "understood" });
    await through(route, (f) => f.conv.phase === "you", "Mia answers the real order");
  }
  await filmExit(route);
}

async function filmTaxi(route) {
  const entry = await startFilm(route, "vinnie", "town", "Vinnie · approach wave and sociable opening");
  const after = route.openingFrames.find((f) => f.p?.run === entry.conv.run && f.gameTime >= entry.gameTime + 0.24);
  assert(after, "continuous approach and bind through +0.24 s");
  await route.mark("bind+0.24s", after);
  const opening = await openingThrough(route, (f) => f.conv.phase === "you", "Vinnie's real greeting completes");
  if (!pc) assert(opening.some((f) => f.media?.source?.key === taxiKey && f.conv.text === taxiText && isVoice(f)),
    "Vinnie's greeting must use the exact recording");
  await filmExit(route);
}

async function filmTickets(route) {
  const entry = await startFilm(route, "walter", "station", "Walter · reserved counter and ticket handoff");
  const rows = await openingThrough(route, (f) => f.conv.phase === "you", "Walter's opening");
  for (let i = 0; i < 7 && !rows.some((f) => ticketText.test(f.conv.text ?? "")); i++) {
    await route.answer(ticketAnswers[route.last.conv.step]);
    rows.push(...await through(route, (f) => f.conv.phase === "you" || f.conv.phase === "ended", "real ticket counter response"));
  }
  const object = rows.find((f) => f.rendered && ticketText.test(f.conv.text ?? "") && f.p?.speakerId === entry.conv.host
    && f.media?.source?.match && f.p.gaze?.target === "handoff" && f.p.gaze.pitch > 0.015);
  assert(object, "matching recording for the filmed ticket glance");
  await route.mark("object-glance", object);
  const back = await ticketReturn(route, rows, object);
  await route.mark("object-return", back);
  if (route.last.conv.phase === "you" && route.last.conv.step === "closing") {
    await route.answer(pc ? "¡Hasta luego!" : "Goodbye!");
    const ending = await through(route, (f) => f.conv.phase === "ended", "Walter's natural sign-off");
    const goodbye = ending.find((f) => f.p?.gestureWeight > 0.1 && /goodbye|have a|bye|viaje|hasta/i.test(f.conv.text ?? ""));
    if (goodbye) await route.mark("walter-sign-off", goodbye, { image: false });
    await route.series(36);
  }
  await filmExit(route);
}

async function filmRestaurant(route) {
  const entry = await startFilm(route, "marco_host", "trattoria", "Lucia and Marco · cast switch");
  await restaurantHandoff(route, entry);
  await filmExit(route);
}

async function filmWay(route) {
  await startFilm(route, directionActor, "town", "Directions · natural sign-off and release");
  await route.yourTurn();
  await route.answer(pc ? "Disculpe, ¿cómo llego al correo?" : "Excuse me, how do I get to the post office?");
  await route.yourTurn();
  await route.answer(pc ? "¡Muchas gracias!" : "Thank you so much!");
  const f = await route.wait((f) => f.conv.completed && f.p?.reaction?.kind === "farewell" && f.p.reaction.weight > 0.1,
    "authored completion and farewell");
  await route.mark("sign-off", f, { image: false });
  await route.series(45);
  await filmExit(route);
  assert(await route.page.locator(".directions-card").isVisible(), "sign-off still reveals the authored directions card");
}

async function runPage(context, fixture, size, id, action, options = {}) {
  const row = { id, size: size.label, input: size.touch ? "touch" : "keys", edition: config.storage, layer: config.learner, subcase: options.subcase ?? null,
    labels: [], peaks: [], expectedErrors: [], errors: [], pass: false };
  (options.film ? report.films : options.subcase ? report.subcases : report.rows).push(row);
  let page, route;
  const label = `${size.label}/${id}${options.subcase ? `/${options.subcase}` : ""}${options.film ? "/film" : ""}`;
  try {
    page = await before(options.by, "opening route page", () => context.newPage());
    route = new Route(page, context, row, fixture, { size, ...options });
    if (options.film) route.capture = new ActingFilm(page, context, { out, shotDir, layer, row, fixture });
    await before(route.deadline, label, async () => {
      await route.boot();
      await action(route);
    });
  } catch (error) {
    row.errors.push(error.stack ?? error.message);
  } finally {
    if (route) {
      row.frames = route.frames;
      row.samples = [...(route.playheads?.values() ?? [])];
      row.errors.push(...route.errors);
      try {
        const inspected = await before(Date.now() + 2500, "finish collecting route evidence", () => page.evaluate(() => {
          window.__naturalTest?.stop();
          return { requests: window.__naturalTest?.requests ?? [], errors: window.__naturalErrors ?? [] };
        }));
        row.errors.push(...inspected.errors.map((error) => `unhandled rejection: ${error}`));
        row.requests = inspected.requests;
        const voiced = new Set(row.samples.map((sample) => sample.id));
        row.utterances = [...new Set(inspected.requests.filter((request) => voiced.has(request.id) && request.owner != null &&
          !request.replay && !request.source.missing && (request.npc || request.street || request.mode))
          .map((request) => request.text))];
        if (!options.film && !options.subcase) assert(row.utterances.length >= 2, `two distinct voiced NPC utterances: ${JSON.stringify(row.utterances)}`);
        assert(inspected.requests.every((request) => !voiced.has(request.id) || !request.npc || request.ownerMatches),
          "each voiced session request belongs to the rendered actor for its transcript line");
        if (options.subcase === "missing") {
          assert(inspected.requests.some((r) => r.source.missing && r.result?.ok === false && !voiced.has(r.id)), "missing request resolved without fabricated speech");
        }
      } catch (error) { row.errors.push(error.stack ?? error.message); }
      if (options.film) {
        try {
          await route.capture.finish(row.requests ?? []);
          if (id === "s73-restaurant") {
            const handoff = row.labels.find((label) => label.label === "cast-handoff");
            const voiced = row.labels.find((label) => label.label === "cast-switch");
            assert(handoff?.image && voiced?.image && handoff.filmFrameMs < voiced.filmFrameMs,
              "the cast handoff and voiced cast switch are distinct compositor frames");
          }
          assert(row.requests?.every((request) => !request.source.match || !request.npc
            || (request.source.voice === request.voice || request.source.voice === fixture.voices[request.npc])
            && (request.voice === fixture.voices[request.npc] || request.voice === `g_${request.npc}` || pc)),
          "matching film recordings belong to the requested actor and voice");
        } catch (error) { row.errors.push(error.stack ?? error.message); }
      }
      const failedAction = row.errors.length && row.actions?.at(-1);
      if (failedAction) {
        if (shotDir) {
          const file = `${label.replaceAll("/", "-")}-${failedAction.action}-failed.png`;
          try {
            await page.screenshot({ path: path.join(out, file), timeout: 2500 });
            failedAction.image = file;
          } catch (error) { failedAction.screenshotError = error.message; }
        }
        console.log(`ACTION ${label} · ${JSON.stringify(failedAction)}`);
      }
    }
    try { await page?.close(); } catch (error) { row.errors.push(error.message); }
    row.pass = row.errors.length === 0;
    console.log(`${row.pass ? "PASS" : "FAIL"} ${label}${row.pass ? "" : ` · ${row.errors[0]}`}`);
    // Write each route even if a later Chromium close or the final report fails.
    await writeFile(path.join(out, `${label.replaceAll("/", "-")}.json`), JSON.stringify(row, null, 2) + "\n");
    delete row.frames;
  }
}

async function contextFor(browser, size, reducedMotion = "no-preference") {
  const { width, height, touch } = size;
  const mobile = {
    hasTouch: true, isMobile: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  };
  const context = await browser.newContext({ viewport: { width, height }, ...(touch ? mobile : {}), reducedMotion, deviceScaleFactor: 1, serviceWorkers: "block" });
  // Browser-level sockets can bypass HTTP request interception. Vite's same host is fine.
  if (context.routeWebSocket) await context.routeWebSocket("**/*", (socket) => {
    if (new URL(socket.url()).host === config.url.host) socket.connectToServer();
    else { report.errors.push(`external websocket ${new URL(socket.url()).origin}`); socket.close(); }
  });
  return context;
}

const requiredLabels = ["entry", "voiced-high", "voiced-low", "object-glance", "object-return", "listen",
  "submit-puzzled+4", "submit-puzzled+10", "submit-puzzled+18", "submit-understood+4", "submit-understood+10", "submit-understood+18",
  "repeat", "cast-handoff", "cast-switch", "exit+1", "exit+4", "exit+9"];
const filmRoutes = [
  ["s72-cafe", filmCafe], ["s66-taxi", filmTaxi], ["s67a-tickets", filmTickets], ["s73-restaurant", filmRestaurant], [directions, filmWay],
];

function recordingInventory(fixture) {
  return {
    gap: { file: `public/audio/${transportKey}.mp3`, duration: fixture.catalogue.audio[transportKey],
      quietSeconds: [0.702, 1.062], usage: "matching Mia when her opening hashes to this key, otherwise transport-only" },
    vinnie: { file: `public/audio/${taxiKey}.mp3`, duration: fixture.catalogue.audio[taxiKey], text: taxiText, usage: "matching v1 speech" },
  };
}

async function run() {
  await mkdir(evidence, { recursive: true });
  out = await mkdtemp(path.join(evidence, `${shotDir ? "capture" : "plain"}-${new Date(started).toISOString().replaceAll(":", "-")}-`));
  report.invocation = shotDir ? "capture" : "plain";
  report.budgetMs = chainMs;
  report.node = process.version;
  let browser, directModule, validTarget = false;
  try {
    assert(["127.0.0.1", "localhost", "[::1]"].includes(config.url.hostname) && /^https?:$/.test(config.url.protocol),
      "WORLD_TEST_URL must point at a local edition server");
    validTarget = true;
    let module = process.env.WORLD_PLAYWRIGHT_MODULE;
    const fileModule = module && await stat(path.resolve(module)).then((info) => info.isFile(), () => false);
    if (module && (fileModule || module.startsWith(".") || path.isAbsolute(module))) {
      module = pathToFileURL(path.resolve(module)).href;
      process.env.WORLD_PLAYWRIGHT_MODULE = module;
    }
    directModule = await ordinaryPlaywright(module, !!wrapperShots);
    if (directModule) process.env.WORLD_PLAYWRIGHT_MODULE = directModule;
    else if (wrapperShots) {
      // The known wrapper awaits screenshots and reuses page-local names.
      // On hosts with only the wrapper, disable its shots in the acting run.
      process.env.SHOTS_CAP = "0";
      process.env.SHOTS_OUT = path.join(out, "wrapper");
    }
    report.playwright = process.env.WORLD_PLAYWRIGHT_MODULE || "playwright";
    const fixture = await audioFixture();
    report.recordings = recordingInventory(fixture);
    browser = await launchBrowser(30_000);
    const measureStart = Date.now();
    for (const size of sizes) {
      const context = await contextFor(browser, size);
      try {
        for (const [id, action] of routes) await runPage(context, fixture, size, id, action, { by: measureBy });
        await runPage(context, fixture, size, directions, missingRecording, { subcase: "missing", by: measureBy });
        await runPage(context, fixture, size, "s72-cafe", interruptEntry, { subcase: "interrupted", by: measureBy });
        if (size.touch) await runPage(context, fixture, size, "s66-taxi", micExample, { subcase: "mic", by: measureBy });
      } finally { await context.close(); }
      const reduced = await contextFor(browser, size, "reduce");
      try { await runPage(reduced, fixture, size, "s72-cafe", reducedMotion, { subcase: "reduced", by: measureBy }); }
      finally { await reduced.close(); }
    }
    report.measureWallMs = Date.now() - measureStart;

    if (shotDir) {
      const filmStart = Date.now();
      await Promise.all([shotDir, path.join(out, "labels"), path.join(out, "film")].map((dir) => mkdir(dir, { recursive: true })));
      for (const size of sizes) {
        const context = await contextFor(browser, size);
        try {
          for (const [id, action] of filmRoutes) await runPage(context, fixture, size, id, action, { film: true, by: actingBy });
        } finally { await context.close(); }
        const reduced = await contextFor(browser, size, "reduce");
        try { await runPage(reduced, fixture, size, "s72-cafe", filmCafe, { film: true, subcase: "reduced", by: actingBy }); }
        finally { await reduced.close(); }
      }
      report.filmWallMs = Date.now() - filmStart;
    }
  } catch (error) {
    report.errors.push(error.stack ?? error.message);
  } finally {
    try { await browser?.close(); } catch (error) { report.errors.push(error.message); }
  }

  const expected = sizes.flatMap(({ label }) => roster.map((id) => `${label}/${id}`));
  const actual = report.rows.map(({ size, id }) => `${size}/${id}`);
  if (roster.length !== 8 || new Set(roster).size !== 8 || JSON.stringify(actual) !== JSON.stringify(expected)) {
    report.errors.push(`route rows differ from the fixed roster: ${JSON.stringify({ expected, actual })}`);
  }
  report.missingFilm = shotDir ? sizes.flatMap(({ label }) => {
    const found = new Set(report.films.filter((r) => r.size === label).flatMap((r) => r.labels.filter((l) => l.image).map((l) => l.label)));
    return requiredLabels.filter((name) => !found.has(name)).map((name) => `${label}/${name}`);
  }) : [];
  if (shotDir) {
    try { await writeFilmIndex(out, report.films); }
    catch (error) { report.errors.push(error.stack ?? error.message); }
  }
  report.actingWallMs = Date.now() - started;
  const results = path.join(out, "results.json");
  await writeFile(results, JSON.stringify(report, null, 2) + "\n");

  let auditFailed = false;
  if (chainCapture && validTarget) {
    const dir = path.join(root, ".b6/audit/natural-mh", path.basename(out));
    try {
      const audit = await runFramingAudit({ root, dir, target: config.url.href, module: directModule, deadline });
      report.framingAudit = { status: path.relative(root, path.join(dir, "status.json")), pass: audit.pass };
      auditFailed = !audit.pass;
    } catch (error) {
      report.framingAudit = { pass: false, error: error.stack ?? error.message };
      console.error(report.framingAudit.error);
      auditFailed = true;
    }
  }

  report.wallMs = Date.now() - started;
  report.withinBudget = report.wallMs < chainMs;
  if (!report.withinBudget) report.errors.push("capture invocation exceeded the chain's 1,200 s deadline");
  await writeFile(results, JSON.stringify(report, null, 2) + "\n");
  const failures = [...report.rows, ...report.subcases, ...report.films].filter((row) => !row.pass).length + report.errors.length;
  for (const error of report.errors) console.error(error);
  if (report.missingFilm.length) console.error(`Film evidence missing: ${report.missingFilm.join(", ")}`);
  console.log(`${report.rows.filter((row) => row.pass).length}/16 rendered routes · ${failures} acting failures · ${report.wallMs} / ${chainMs} ms · ${out}`);
  if (failures || report.missingFilm.length || auditFailed) process.exitCode = 1;
}

if (process.argv.includes("--preflight")) {
  const fixture = await audioFixture();
  console.log(JSON.stringify({ node: process.version, recordings: recordingInventory(fixture) }, null, 2));
  console.log("PASS browser-free audio fixture and browser helper factory");
} else {
  await run();
}
