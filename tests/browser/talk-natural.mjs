#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { audioKey, withoutAddressedNames } from "../../src/audio-key.ts";
import { classifyTalk } from "../../src/editions/es/content/talkNatural.ts";
import { before, INTRO_START, launchBrowser, openContext, readyTown, worldConfig } from "../../tools/talk-framing-browser.mjs";
import { CHECKS, measureTalk, measurementConfig } from "../../tools/talk-framing-measure.mjs";
import { ActingFilm, writeFilmIndex } from "./talk-natural-film.mjs";
import { assertGameplayLens, fullFramingAudit, localPlaywright } from "./talk-natural-framing.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const sizes = [
  { width: 390, height: 844, touch: true, label: "390x844" },
  { width: 1280, height: 800, touch: false, label: "1280x800" },
];
const frameMs = 1000 / 60;
const budgets = { boot: 60_000, measure: 150_000, film: 240_000, audit: 5_400_000 };
const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const json = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
const errorText = (error) => error.stack ?? String(error);
const span = (values) => Math.max(...values) - Math.min(...values);
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

const fixtures = {
  mia: { key: "342ff2b33d8d", text: "¡Hola! ¿Qué le sirvo hoy?", duration: 1.82, gap: [0.791, 0.996] },
  vinnie: { key: "78253ba09a9c", text: "¡Buenas! ¿A dónde lo llevo?", duration: 2.13, gap: [0.666, 0.991] },
  walter: { key: "a4198b5006bd", text: "Aquí tiene su boleto.", duration: 1.53 },
};

function pickSeed(accept) {
  for (let seed = 1; seed <= 1000; seed++) {
    let a = seed;
    const rolls = Array.from({ length: 12 }, () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    });
    if (accept(rolls)) return seed;
  }
  throw new Error("No seed matches the authored variant");
}

// Four init rolls on the first visit to each. Café first skips the how-are-you branch.
const cafeSeed = pickSeed((rolls) => rolls[4] >= 0.4 && rolls[5] >= 3 / 4);
const taxiSeed = pickSeed((rolls) => rolls[4] < 1 / 3);
// Exercise the no-reservation path with a predictable wait and optional seating questions.
const restaurantSeed = pickSeed((rolls) => rolls[0] >= 0.3 && rolls[1] >= 0.4);
const cafeOrder = "¿Me puede dar un latte grande con leche de avena para llevar?";

function installPage({ key, seed, native, mic, nullTree }) {
  if (window.top !== window) return;
  sessionStorage.setItem("ew-play-now", "1");
  const save = {
    version: 1,
    profile: { name: "Mateo", surname: "Miller", gender: "m", lookId: "m1",
      look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
    settings: { v: 6, play: "town", quality: "low", volume: 0.9, sounds: 0, cameraFollow: true,
      scenes: false, phoneCalls: false, textMessages: false, lt: true, confirmSpeech: false, onDevice: false },
    sits: {}, phrases: {}, seenIntro: {}, started: 1,
    place: { zone: "airport", x: -14, z: -1, rot: Math.PI },
    coach: { done: true, run: true, view: true },
    cave: { lit: nullTree ? ["agua", "raices", "rio", "estrellas", "corazon"].flatMap((chamber) => [1, 2, 3].map((i) => `${chamber}-${i}`)) : [],
      passed: ["kin", "nikte"], seen: true, told: 5, heart: nullTree },
  };
  localStorage.setItem(key, JSON.stringify(save));
  localStorage.setItem(key.replace("-progress-v1", "-variety"), "default");
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
  window.__naturalErrors = [];
  addEventListener("unhandledrejection", ({ reason }) => window.__naturalErrors.push(String(reason?.stack ?? reason)));
  if (mic) {
    class Recognition {
      start() { window.__naturalRecognizer = this; queueMicrotask(() => this.onstart?.()); }
      abort() {
        if (window.__naturalRecognizer === this) window.__naturalRecognizer = null;
        queueMicrotask(() => this.onend?.());
      }
      stop() { this.abort(); }
    }
    window.SpeechRecognition = Recognition;
    window.__naturalSpeak = (text) => {
      const reader = window.__naturalRecognizer;
      if (!reader?.onresult) return false;
      reader.onspeechstart?.();
      reader.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: text }], { isFinal: true })] });
      reader.onspeechend?.();
      return true;
    };
  }
  const realDate = Date.now.bind(Date);
  window.__naturalWall = realDate;
  const period = 2 ** 32;
  const seedDate = Math.floor(realDate() / period) * period + seed;
  Date.now = () => window.__ew?.game?.conversationLoads ? seedDate : realDate();
  if (native) return;
  let now = 1000, next = 0, steppedAt = realDate();
  const queued = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (callback) => {
    queued.set(++next, callback);
    return next;
  };
  window.cancelAnimationFrame = (id) => { queued.delete(id); };
  window.__step = (n, dt) => {
    const currentWall = realDate();
    const step = dt ?? Math.min(1000 / 20, Math.max(1000 / 60, (currentWall - steppedAt) / n));
    steppedAt = currentWall;
    for (let i = 0; i < n; i++) {
      now += step;
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

function observe({ hash, shorten }) {
  const { game, store, audio } = window.__ew;
  const audioKey = new Function(`return (${hash})`)();
  const withoutAddressedNames = new Function(`return (${shorten})`)();
  const wall = window.__naturalWall;
  const actors = new Map(), roles = new WeakMap(), poses = new WeakMap(), panels = new WeakMap();
  const requests = [], frames = [], owners = new WeakMap(), pins = new Map(), clears = [];
  function observers() {
    const { root } = game.talkNpc?.ch ?? {};
    if (!root) return [];
    return game.extras.map((ch) => ({ identity: ch.root.uuid, root: ch.root.position.toArray(), busy: ch.busy,
      carry: ch.naturalRig?.()?.carry ?? null, holding: ch.rightHand.children.length, canNotice: ch.canNoticeTalk?.(),
      distance: ch.root.position.distanceTo(root.position), visible: ch.root.visible }));
  }
  let panelSerial = 0, poseSerial = 0, lastFrame, lastGame;
  function put(id, actor) {
    if (!actor?.root) return;
    actors.set(id, actor);
    roles.set(actor, id);
  }
  function findActors(probe) {
    put("player", game.player);
    for (const member of game.talkCast ?? []) put(member.id, member.ch);
    const nearby = probe?.bystander?.actorId;
    if (nearby?.startsWith("nearby:")) {
      const bound = game.extras.find((ch) => ch.talkPose?.applied?.role === "bystander");
      if (bound) put(nearby, bound);
    }
    const other = [nearby, probe?.speakerId].filter(Boolean);
    for (const id of other) {
      const actor = game.npcs.find((npc) => npc.id === id);
      if (actor) put(id, actor.ch);
    }
    const street = game.streetLife?.active;
    if (street?.actor) put(street.draw.cast.id, street.actor.person);
    const stage = game.modes?.get("loteria")?.stage;
    if (stage) { put("beto", stage.beto); put("tona", stage.tona); }
  }
  const bodyWithin = (o, parent) => {
    for (let node = o; node; node = node.parent) if (node === parent) return true;
    return false;
  };
  const visible = (o) => {
    for (let node = o; node; node = node.parent) if (!node.visible) return false;
    return true;
  };
  function pose(actor) {
    const rig = actor.naturalRig?.();
    const head = actor.headJoint;
    const root = actor.root, controller = actor.talkPose;
    const joint = (bone) => bone ? [...bone.rotation.toArray().slice(0, 3), ...bone.position.toArray()] : null;
    const world = (bone) => bone?.getWorldPosition(root.position.clone()).toArray() ?? null;
    const screen = (bone) => {
      const p = bone.getWorldPosition(root.position.clone()).project(game.rig.cam);
      const canvas = game.renderer.domElement.getBoundingClientRect();
      return [canvas.left + (p.x + 1) * canvas.width / 2, canvas.top + (1 - p.y) * canvas.height / 2, p.z];
    };
    const left = rig?.foreL && rig.foreL.localToWorld(actor.rightHand.position.clone().setX(-actor.rightHand.position.x)).toArray();
    if (controller && !poses.has(controller)) poses.set(controller, ++poseSerial);
    const mouth = rig?.mouth;
    return { identity: root.uuid, live: bodyWithin(root, game.scene), visible: visible(root),
      skinned: !!mouth?.isBone && bodyWithin(mouth, root), anim: actor.anim, seat: actor.seatY,
      root: world(root), facing: root.getWorldDirection(root.position.clone()).toArray(), headWorld: world(head),
      headScreen: head && screen(head), mouthScreen: mouth && screen(mouth), pelvis: world(rig?.thighL),
      hands: [left, world(actor.rightHand)], elbows: [world(rig?.foreL), world(rig?.foreR)],
      gazeAim: controller?.watch && (root.parent?.localToWorld(controller.watch.clone()) ?? controller.watch).toArray(),
      weight: controller?.weight ?? 0, poseId: controller && poses.get(controller),
      mouth: mouth?.scale.toArray(), closed: actor.smile?.scale.toArray(), eyeScale: actor.eyes?.scale.y,
      joints: rig && { body: joint(rig.body), head: joint(rig.head), upperL: joint(rig.upperL), upperR: joint(rig.upperR),
        foreL: joint(rig.foreL), foreR: joint(rig.foreR), iris: joint(rig.eye), smile: joint(rig.corners) } };
  }
  function bounds(el) {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.right, r.bottom];
  }
  function lens() {
    const { rig, renderer } = game;
    const { cam } = rig;
    const el = renderer.domElement;
    const w = el.clientWidth, h = el.clientHeight;
    const running = rig.mode === "follow" && game.vel.lengthSq() > 30;
    return { mode: rig.mode, zone: game.zone.id, interior: !!game.room, sideways: game.sidewaysPhone,
      size: [w, h], viewport: [innerWidth, innerHeight], at: game.player.root.position.toArray(), heading: game.heading,
      near: cam.near, fov: cam.fov, aspect: cam.aspect, zoom: cam.zoom, view: cam.view && { ...cam.view }, talk: !!rig.talk,
      running, targetFov: rig.fovFor(w, h, running) + (rig.mode === "follow" ? game.rideFov : 0),
      projection: [0, 5, 8, 9].map((i) => cam.projectionMatrix.elements[i]) };
  }
  const play = audio.play.bind(audio);
  let lastRequest = null;
  audio.play = (voice, speed, text, options) => {
    const owner = options?.visual, conv = store.getState().conv;
    const line = conv.transcript.find((row) => row.id === owner?.line) ??
      (conv.speaking != null ? conv.transcript.find((row) => row.id === conv.speaking && row.sentence?.say === text) : null);
    findActors(window.__talkNatural?.sample());
    const npc = owner && game.npcs.find((member) => member.ch === owner.actor);
    const actor = (owner && (roles.get(owner.actor) ?? npc?.id)) || line?.npc || (game.talkTree ? "yaxche" : null);
    const id = requests.length + 1;
    const asked = audioKey(voice, speed, text);
    const plain = withoutAddressedNames(text, audio.names);
    const alt = plain && audioKey(voice, speed, plain);
    // Observe the actual application's name fallback and manifest. Never substitute a take.
    const key = !audio.manifest[asked] && alt && audio.manifest[alt] ? alt : asked;
    const request = { id, actor, identity: owner?.actor.root.uuid ?? actors.get(actor)?.root.uuid ?? null,
      voice, speed, text, recordedText: key === asked ? text : plain, asked, key, duration: audio.manifest[key] ?? null,
      nameFallback: key !== asked, repair: audio.repairVersions[key]?.slice(0, 12) ?? null,
      line: owner?.line ?? line?.id ?? null, lineKey: typeof owner?.line === "string" ? owner.line : conv.lineKey,
      run: conv.run, zone: game.zone.id, step: conv.stepId, knownActor: !!owner, optional: !!options?.optional || !!options?.recordingOnly,
      replay: owner?.replay ?? null, slow: !!options?.slow, wall: wall(), gameTime: game.t };
    if (owner) { owners.set(owner, request); if (actor) put(actor, owner.actor); }
    requests.push(request);
    const playback = play(voice, speed, text, options);
    lastRequest = request;
    void playback.then((ok) => {
      request.finished = { ok, state: owner ? audio.visualState(owner) : audio.getState(), wall: wall() };
    });
    return playback;
  };
  const clear = game.rig.cam.clearViewOffset;
  game.rig.cam.clearViewOffset = function (...args) {
    const value = clear.apply(this, args);
    if (!store.getState().conv.active && !game.rig.talk) clears.push({
      wall: wall(), gameTime: game.t, frame: game.renderer.info.render.frame, lens: lens(), run: store.getState().conv.run,
    });
    return value;
  };
  function sample(rendered) {
    const { conv, hud, settings, progress } = store.getState();
    const probe = window.__talkNatural?.sample() ?? null;
    findActors(probe);
    const line = conv.transcript.find((row) => row.id === conv.speaking);
    const owner = audio.visualOwner;
    const request = owners.get(owner) ?? lastRequest;
    const clip = audio.clip;
    const media = clip && request && clip.key === request.key && {
      key: clip.key, owner: request.id, state: owner ? audio.visualState(owner) : audio.getState(),
      time: clip.position?.() ?? clip.el?.currentTime, rate: clip.el?.playbackRate ?? (request.slow ? 0.82 : 1),
      pipeline: clip.el ? "html" : clip.position ? "buffer" : null,
      native: clip.el ? (clip.el.ended ? "ended" : clip.el.paused ? "paused" : "playing") : audio.ctx?.state,
      duration: clip.el?.duration ?? audio.buffers.get(audio.cacheKey(request.key) + (request.slow ? "#slow" : ""))?.duration,
      envelope: audio.level(false),
    };
    const panel = document.querySelector(".convo");
    if (panel && !panels.has(panel)) panels.set(panel, ++panelSerial);
    const panelAnimating = panel?.getAnimations().some((animation) => animation.playState === "running"
      && Number.isFinite(animation.effect?.getComputedTiming().endTime));
    if (game.nearest?.ch) put(game.nearest.id, game.nearest.ch);
    const street = game.streetLife?.active;
    const table = window.__ew.loteria?.state();
    return { wall: wall(), gameTime: game.t, clock: performance.now(), frame: game.renderer.info.render.frame,
      rendered, calls: game.renderer.info.render.calls, p: probe, media, request: request?.id ?? null,
      voiceOwner: owner ? owners.get(owner)?.id ?? null : null, audioState: audio.getState(),
      reduced: matchMedia("(prefers-reduced-motion: reduce)").matches,
      actual: Object.fromEntries([...actors].map(([id, actor]) => [id, pose(actor)])),
      pinned: Object.fromEntries([...pins].map(([id, pin]) => [id, { actor: pose(pin.actor), weight: pin.controller?.weight ?? 0,
        voice: pin.owner ? audio.visualState(pin.owner) : null }])),
      conv: { id: conv.sitId, active: conv.active, run: conv.run, host: conv.hostId, npc: conv.npcId, phase: conv.phase,
        intro: conv.introOpen, step: conv.stepId, line: conv.speaking, lineKey: conv.lineKey, text: line?.sentence?.say,
        mic: conv.mic.status, typing: conv.typing, slow: conv.slowMode, complete: conv.completed,
        completions: progress.sits[conv.sitId]?.completions ?? 0, phone: !!hud.phoneCard },
      scene: { zone: game.zone.id, mode: game.rig.mode, modeId: game.modes.active?.id, cast: game.talkCast.map(({ id }) => id),
        talkSpeaker: game.talkSpeaker?.id, nearest: game.nearest?.id, mountedZone: bodyWithin(game.zone.group, game.scene),
        tree: game.talkTree, panel: bounds(panel), panelId: panel && panels.get(panel), panelAnimating,
        canvas: bounds(game.renderer.domElement), layout: game.talkLayout?.picture, fonts: document.fonts.status,
        picture: !!document.querySelector(".scene-backdrop"), covered: game.covered, quality: settings.quality,
        transition: game.transitioning, pendingRide: game.pendingRide, ride: !!game.rideTimer || !!game.rides.riding,
        board: bounds(document.querySelector(".loteria-board")), lens: lens() },
      street: street && { moment: street.draw.moment.id, cast: street.draw.cast.id, script: street.draw.scriptName,
        exchange: street.view.exchange, step: street.view.step, line: street.view.line?.key, person: street.actor?.projection()?.person },
      table: table && { phase: table.phase, calls: table.calls, covered: table.covered, board: table.board },
      pool: game.pool?.debug(),
    };
  }
  const present = game.presentWorld;
  game.presentWorld = function (...args) {
    const value = present.apply(this, args);
    const serial = game.renderer.info.render.frame;
    if (serial !== lastFrame && lastGame !== game.t) {
      lastFrame = serial;
      lastGame = game.t;
      frames.push(sample(true));
    }
    return value;
  };
  window.__naturalTest = { requests, clears, sample, observers,
    drain: () => frames.splice(0),
    pin(label, actor) {
      const ch = actors.get(actor);
      if (!ch) throw new Error(`Cannot pin absent actor ${actor}`);
      pins.set(label, { actor: ch, controller: ch.talkPose, owner: audio.visualOwner?.actor === ch ? audio.visualOwner : null });
    },
  };
}

async function localRecordings() {
  const roots = [path.join(root, "public/audio-es"), process.env.WORLD_AUDIO_ROOT,
    path.join(homedir(), "puerto-colibri-voicing/audio-es")].filter(Boolean).map((base) => path.resolve(base));
  const manifestPath = path.join(root, "public/audio-es/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const repairs = JSON.parse(await readFile(path.join(root, "public/audio-es/repair-versions.json"), "utf8"));
  const files = new Map();
  async function find(key) {
    if (files.has(key)) return files.get(key);
    assert(/^[0-9a-f]{12}$/.test(key), `Invalid audio key ${key}`);
    let source = null;
    for (const base of roots) {
      const file = path.join(base, `${key}.mp3`);
      const info = await stat(file).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (info?.isFile() && info.size) {
        const repair = repairs[key]?.slice(0, 12) ?? null;
        const hash = createHash("sha256").update(await readFile(file)).digest("hex");
        if (repair && hash.slice(0, 12) !== repair) continue;
        source = { file, bytes: info.size, duration: manifest[key] ?? null, repair, hash };
        break;
      }
    }
    files.set(key, source);
    return source;
  }
  for (const [actor, fixture] of Object.entries(fixtures)) {
    assert.equal(audioKey(`es_${actor}`, 1, fixture.text), fixture.key);
    assert(Math.abs(manifest[fixture.key] - fixture.duration) < 0.15, `Manifest duration for ${fixture.key}`);
  }
  return { find, roots, manifestPath, manifest, files };
}

async function serveRecording(route, file, cors) {
  const bytes = await readFile(file);
  const headers = { ...cors, "accept-ranges": "bytes", "cache-control": "no-store" };
  const match = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range ?? "");
  if (!match) return route.fulfill({ contentType: "audio/mpeg", headers, body: bytes });
  const first = Number(match[1]), last = Math.min(match[2] ? Number(match[2]) : bytes.length - 1, bytes.length - 1);
  if (first > last) return route.fulfill({ status: 416, headers: { ...headers, "content-range": `bytes */${bytes.length}` } });
  headers["content-range"] = `bytes ${first}-${last}/${bytes.length}`;
  return route.fulfill({ status: 206, contentType: "audio/mpeg", headers, body: bytes.subarray(first, last + 1) });
}

const mediaPlaying = (f) => f.rendered && f.media?.state === "playing" && f.media.time > 0;
const audible = (f) => mediaPlaying(f) && f.media.envelope > 0.05;
const mouth = (ch) => ch?.mouth?.[1] ?? 0;
const isSilent = (ch) => ch?.skinned && ch.mouth.every((v) => v <= 0.00002) && ch.closed?.[1] > 0.5;
const silent = (ch, label) => assert(isSilent(ch), `${label} · ${JSON.stringify(ch?.mouth)} ${JSON.stringify(ch?.closed)}`);
const live = (f, id) => {
  const ch = f.actual[id];
  assert(f.rendered && f.calls > 0 && ch?.live && ch.visible && ch.skinned, `${id} on the rendered rig in ${f.scene.zone}`);
  return ch;
};
const inRect = ([x, y], box, pad = 0) => box && x >= box[0] + pad && x <= box[2] - pad && y >= box[1] + pad && y <= box[3] - pad;
const compact = (f) => f && ({ wall: f.wall, gameTime: f.gameTime, frame: f.frame, rendered: f.rendered, actor: f.p?.speakerId ?? f.conv.npc,
  identity: f.actual[f.p?.speakerId ?? f.conv.npc]?.identity, run: f.conv.run, phase: f.conv.phase, step: f.conv.step,
  lineKey: f.conv.lineKey ?? f.p?.lineId, line: f.conv.line, text: f.conv.text, request: f.request, media: f.media,
  cue: f.p?.gesture, reaction: f.p?.reaction, gaze: f.p?.gaze?.target, mouth: f.p?.mouth, camera: f.scene.lens, scene: f.scene.mode,
  canvas: f.scene.canvas, panel: f.scene.panel, mode: f.scene.modeId, board: f.scene.board, street: f.street });

class Route {
  constructor(page, context, row, options) {
    Object.assign(this, { page, context, row, ...options });
    this.frames = [];
    this.missingUrls = new Set();
    this.fulfilled = new Map();
    this.playheads = new Map();
    this.labels = {};
    this.deadline = Date.now() + budgets.boot + (options.film ? budgets.film : budgets.measure);
  }

  async boot() {
    const { page, config, row } = this;
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => row.jsErrors.push(errorText(error)));
    page.on("console", (message) => {
      const url = message.location().url;
      const value = message.text();
      if (message.type() !== "error") return;
      if (this.missingUrls.has(url) && /404|Failed to load resource/.test(value)) row.clipNotices.push({ url, value });
      else row.jsErrors.push(`${value} (${url})`);
    });
    await page.routeWebSocket("**/*", (socket) => {
      if (new URL(socket.url()).host === config.url.host) socket.connectToServer();
      else {
        row.jsErrors.push(`External websocket blocked at ${socket.url()}`);
        socket.close();
      }
    });
    // Page routes take precedence over openContext's blanket 404 for MP3s. A worker URL is
    // fulfilled locally and is never forwarded. The normal manifest and repair list stay live.
    await page.route("**/*", async (route) => {
      const url = new URL(route.request().url());
      const match = /\/([0-9a-f]{12})\.mp3$/i.exec(url.pathname);
      const cors = { "access-control-allow-origin": config.url.origin, "access-control-expose-headers": "content-range, accept-ranges" };
      if (match && Object.hasOwn(this.recordings.manifest, match[1])) {
        const key = match[1];
        try {
          const source = key === this.omit ? null : await this.recordings.find(key);
          row.audioUrls.push({ key, url: url.href, local: source?.file ?? null, omitted: key === this.omit });
          if (source) {
            this.fulfilled.set(key, source);
            return await serveRecording(route, source.file, cors);
          }
        } catch (error) {
          row.errors.push(errorText(error));
        }
        this.missingUrls.add(url.href);
        return route.fulfill({ status: 404, body: "", headers: cors });
      }
      if (/\.mp3$/i.test(url.pathname)) {
        this.missingUrls.add(url.href);
        return route.fulfill({ status: 404, body: "", headers: cors });
      }
      if (url.origin === config.url.origin) return route.fallback();
      if (["data:", "blob:"].includes(url.protocol)) return route.continue();
      row.blocked.push(url.href);
      return route.abort();
    });
    const storeKey = `${config.storage}-progress-v1`;
    await page.addInitScript(installPage, { key: storeKey, seed: row.seed, native: this.film, mic: this.subcase === "mic",
      nullTree: this.subcase === "null-tree" });
    row.identity = await readyTown(page, config, Date.now() + budgets.boot);
    const identity = await page.evaluate(() => {
      const { game, store, audio } = window.__ew;
      const { progress, screen } = store.getState();
      const rect = game.renderer.domElement.getBoundingClientRect();
      return { screen, name: progress.profile?.name, gender: progress.profile?.gender, started: progress.started,
        volume: audio.volume, manifest: Object.keys(audio.manifest).length, width: innerWidth, height: innerHeight,
        canvas: [rect.width, rect.height], viewport: [visualViewport.width, visualViewport.height], touch: navigator.maxTouchPoints,
        landscape: matchMedia("(orientation: landscape)").matches,
        coarse: matchMedia("(pointer: coarse)").matches, fine: matchMedia("(pointer: fine)").matches,
        ua: navigator.userAgent, dpr: devicePixelRatio,
        mic: typeof SpeechRecognition };
    });
    Object.assign(row.identity, identity);
    assert.deepEqual([identity.screen, identity.name, identity.gender, identity.started], ["play", "Mateo", "m", 1], "returning Spanish save");
    assert(identity.volume > 0 && identity.manifest > 0, "game loaded the real manifest and audio volume");
    assert.equal(identity.manifest, Object.keys(this.recordings.manifest).length, "live local recording inventory");
    assert.deepEqual([identity.width, identity.height, ...identity.canvas, identity.dpr], [this.size.width, this.size.height,
      this.size.width, this.size.height, 1], "CSS viewport and canvas dimensions");
    assert.deepEqual(identity.viewport, [this.size.width, this.size.height]);
    assert.equal(identity.landscape, this.size.width > this.size.height);
    assert(this.size.touch ? identity.touch > 0 && identity.coarse : identity.touch === 0 && identity.fine);
    assert.equal(identity.mic, this.subcase === "mic" ? "function" : "undefined");
    await page.evaluate(observe, { hash: audioKey.toString(), shorten: withoutAddressedNames.toString() });
    if (this.film) {
      this.capture = new ActingFilm(page, this.context, { out: this.out, shots: this.shots, row });
      await this.capture.start();
    }
    await this.pull();
  }

  async pull(count = 1) {
    const data = await this.page.evaluate((count) => {
      window.__step?.(count);
      const probe = window.__naturalTest;
      return { frames: probe.drain(), current: probe.sample(false) };
    }, count);
    for (const f of data.frames) {
      this.frames.push(f);
      if (audible(f)) {
        const { owner, key, pipeline, time, envelope } = f.media;
        const played = this.playheads.get(owner) ?? { key, pipeline, first: time, last: time, peak: 0, count: 0, firstWall: f.wall };
        played.last = time;
        played.lastWall = f.wall;
        played.peak = Math.max(played.peak, envelope);
        played.count++;
        this.playheads.set(owner, played);
      }
    }
    this.current = data.current;
    this.last = data.frames.at(-1) ?? this.last ?? data.current;
    return data;
  }

  async wait(predicate, label, ms = 20_000, { liveState = false, from = this.frames.length } = {}) {
    const deadline = Math.min(this.deadline, Date.now() + ms);
    while (Date.now() < deadline) {
      for (; from < this.frames.length; from++) {
        const frame = this.frames[from];
        if (predicate(frame)) return frame;
      }
      const { current } = await this.pull();
      if (liveState && predicate(current)) return current;
      await real(this.film ? 17 : 12);
    }
    throw new Error(`Timed out waiting for ${label}. ${JSON.stringify(compact(this.current))}`);
  }

  async elapsed(seconds, start = this.last) {
    return this.wait((f) => f.gameTime >= start.gameTime + seconds, `${seconds}s of rendered game time`,
      Math.max(5000, seconds * 2400));
  }

  async press(locator, action, { key = false, focus = false } = {}) {
    let hit;
    const deadline = Math.min(this.deadline, Date.now() + 6000);
    while (Date.now() < deadline) {
      await this.pull();
      if (await locator.count() && await locator.isVisible() && await locator.isEnabled()) {
        hit = await locator.evaluate((el) => {
          el.scrollIntoView({ block: "nearest", inline: "nearest" });
          const box = el.getBoundingClientRect(), x = box.left + box.width / 2, y = box.top + box.height / 2;
          return el.contains(document.elementFromPoint(x, y)) && el.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
            ? { x, y, box: [box.left, box.top, box.right, box.bottom], text: el.textContent.trim() } : null;
        });
        if (hit) break;
      }
      await real(20);
    }
    assert(hit, `${action} must be visible, enabled and hit-testable`);
    const at = this.last;
    const wall = Date.now();
    if (this.size.touch) await this.page.touchscreen.tap(hit.x, hit.y);
    else if (key || focus) {
      await locator.focus();
      if (key) await this.page.keyboard.press("Enter");
    } else await this.page.mouse.click(hit.x, hit.y);
    const event = { action, wall, gameTime: at.gameTime, frame: at.frame, hit,
      input: this.size.touch ? "tap" : key ? "Enter" : focus ? "focus" : "click" };
    this.row.actions.push(event);
    await this.pull();
    return event;
  }

  mark(label, frame) {
    if (!frame || !Number.isFinite(frame.wall)) return;
    this.labels[label] ??= compact(frame);
  }

  require(...labels) {
    for (const label of labels) if (!this.row.requiredLabels.includes(label)) this.row.requiredLabels.push(label);
  }

  checkpoints(label, at, offsets, candidates = this.frames) {
    for (const offset of offsets) {
      this.require(`${label}${offset < 0 ? "" : "+"}${offset}`);
      const targetWall = at.wall + offset * 1000 / 30;
      const targetGame = at.gameTime + offset / 30;
      const rows = this.film ? candidates : candidates.filter((f) => f.gameTime >= targetGame - 0.12 && f.gameTime <= targetGame + 0.12);
      const error = (f) => this.film ? Math.abs(f.wall - targetWall) : 1000 * Math.abs(f.gameTime - targetGame);
      const match = rows.reduce((best, next) => !best || error(next) < error(best) ? next : best, null);
      if (!match || error(match) > 135) continue;
      const name = `${label}${offset < 0 ? "" : "+"}${offset}`;
      this.mark(name, match);
      Object.assign(this.labels[name], { targetWall, targetGame, sampleOffsetMs: this.film ? match.wall - targetWall : (match.gameTime - targetGame) * 1000 });
    }
  }

  async interact() {
    if (this.size.touch) return this.press(this.page.locator(".act-btn"), "walk-up talk");
    await this.page.keyboard.press("e");
  }

  async stageApproach(actor, id, spot) {
    this.approachAt = this.frames.length;
    await this.page.evaluate(({ actor, id, spot }) => {
      const { game, store } = window.__ew;
      store.getState().updateProgress((progress) => { progress.objective = id; });
      if (spot) return game.enterZone(spot.zone, spot, true);
      if (game.zone.id !== "town") game.enterZone("town", undefined, true);
      const member = game.npcs.find((npc) => npc.id === actor);
      if (!member) throw new Error(`Missing town actor ${actor}`);
      const near = member.approach ?? member.home.clone().add(member.home.clone().set(Math.sin(member.rot) * 2.2, 0, Math.cos(member.rot) * 2.2));
      return game.enterZone("town", { x: near.x, z: near.z, rot: Math.atan2(member.home.x - near.x, member.home.z - near.z) }, true);
    }, { actor, id, spot });
    await this.wait((f) => f.scene.nearest === actor && !f.scene.transition && !f.conv.phone, `walk-up prompt for ${actor}`);
    const before = this.last;
    assertGameplayLens(before.scene.lens, this.size, `before ${id}`);
    this.gameplay = before.scene.lens;
    if (actor === "vinnie") {
      const wave = await this.wait((f) => f.actual.vinnie?.anim === "wave", "Don Rigo's approach wave",
        4000, { from: this.approachAt ?? 0 });
      await this.elapsed(0.25, wave);
      const waving = this.frames.filter((f) => f.gameTime >= wave.gameTime && f.gameTime <= wave.gameTime + 0.38
        && f.actual.vinnie?.anim === "wave");
      const raised = waving.find((f) => f.actual.vinnie.hands.some((hand) => hand[1] >= f.actual.vinnie.headWorld[1] - 0.17));
      assert(raised, "Don Rigo raises an actual hand during the town wave");
      this.mark("approach-wave", raised);
      this.require("approach-wave");
    }
    await this.interact();
  }

  async start(id, actor, { walk = false, spot, begun = false, nullTree = false } = {}) {
    this.entryAt = this.frames.length;
    if (!begun) {
      if (walk) await this.stageApproach(actor, id, spot);
      else await this.page.evaluate((id) => window.__ew.game.startScenario(id), id);
    }
    const entry = await this.wait((f) => f.conv.active && f.conv.id === id && f.conv.host === actor && !!f.scene.panel,
      `${id} mounts its real panel`, 25_000, { from: this.entryAt });
    assert.equal(entry.scene.mode, "talk");
    assert(!entry.conv.phone && entry.scene.mountedZone && !entry.scene.picture);
    const start = this.page.locator(".scene-intro, .intro-card").getByRole("button", { name: INTRO_START });
    let pressed;
    if (entry.conv.intro || await start.isVisible()) {
      pressed = await this.press(start, "Start", { key: true });
      const expected = this.config.learner === "lt" ? /^Pradėti/i : /^Start/i;
      assert.match(pressed.hit.text, expected, "learner-layer Start control");
    }
    if (["s72-cafe", "s66-taxi", "s67a-tickets", "s73-restaurant"].includes(id)) assert(pressed, `${id} exercised Start`);
    const first = await this.wait((f) => f.conv.run === entry.conv.run && !f.conv.intro &&
      (nullTree ? f.scene.tree && !f.p : f.p?.scope === "session" && f.p.run === entry.conv.run),
    "lazy acting on the original run", 9000, { from: this.entryAt });
    if (!nullTree) {
      live(first, actor);
      live(first, "player");
      assert(first.scene.cast.includes(actor));
    }
    const painted = pressed
      ? this.frames.find((f) => f.wall >= pressed.wall && f.conv.run === entry.conv.run && !f.conv.intro) ?? first : first;
    assert(painted.rendered && painted.calls > 0 && painted.scene.mode === "talk" && painted.scene.mountedZone,
      "entry samples the mounted rendered room");
    this.mark("entry", painted);
    this.require("entry");
    let previous;
    const settled = await this.wait((f) => {
      assert.equal(f.conv.run, entry.conv.run, "panel stayed on the original run");
      const { panel, panelId, panelAnimating, fonts } = f.scene;
      if (f.conv.intro || !panel || panelAnimating || fonts !== "loaded" || (!nullTree && !f.scene.layout)) {
        previous = null;
        return false;
      }
      assert.equal(panelId, entry.scene.panelId, "same mounted panel through entrance");
      const pass = previous && previous.frame !== f.frame && distance(panel, previous.scene.panel) < 0.1;
      previous = f;
      return pass;
    }, "settled panel after entrance transform", 8000);
    const [l, t, r, b] = settled.scene.panel;
    assert(l >= -1 && t >= -1 && r <= this.size.width + 1 && b <= this.size.height + 1 && r > l && b > t);
    assert.deepEqual(settled.scene.canvas, [0, 0, this.size.width, this.size.height], "actual canvas bounds");
    this.row.panels.push(compact(settled));
    this.row.host = await this.page.evaluate((id) => {
      const member = window.__ew.game.talkCast.find((actor) => actor.id === id);
      return member ? { id, name: member.tag.querySelector("b")?.textContent.trim(), home: member.home.toArray() } : null;
    }, actor);
    if (id === "s72-cafe" && !this.row.observers) this.row.observers = await this.page.evaluate(() => window.__naturalTest.observers());
    this.row.ui = await this.page.evaluate(() => [...document.querySelectorAll(".convo [lang]")]
      .slice(0, 100).map((el) => [el.lang, el.textContent.trim()]));
    this.entry = { frame: first, painted, run: entry.conv.run, host: actor, id };
    this.filmEntry ??= this.entry;
    if (!this.gameplay || this.gameplay.zone !== entry.scene.zone) {
      const baseline = this.frames.slice(0, this.frames.indexOf(entry)).findLast((f) => !f.conv.active
        && f.scene.zone === entry.scene.zone && !f.scene.transition && ["follow", "interior"].includes(f.scene.mode));
      assert(baseline, "presented walking lens in the actual room before conversation");
      assertGameplayLens(baseline.scene.lens, this.size, "entry gameplay");
      this.gameplay = baseline.scene.lens;
    }
    return first;
  }

  async next(label = "learner choices or completed transcript") {
    let warned = false;
    const deadline = Math.min(this.deadline, Date.now() + 30_000);
    while (Date.now() < deadline) {
      const { current } = await this.pull();
      if (current.audioState === "unavailable" && await this.page.locator(".audio-recovery .link-btn").last().isVisible()) {
        const notice = await this.page.locator(".audio-recovery").innerText();
        const key = current.request;
        this.row.recoveries.push({ request: key, notice, wall: current.wall });
        assert(notice.trim(), "usual missing-recording notice");
        await this.press(this.page.locator(".audio-recovery .link-btn").last(), "continue reading");
        warned = true;
      }
      if (current.conv.phase === "you" || current.conv.phase === "ended") {
        await this.pull();
        return this.last;
      }
      await real(17);
    }
    throw new Error(`Timed out on ${label}${warned ? " after continuing to read" : ""}. ${JSON.stringify(compact(this.current))}`);
  }

  async answer(text, { step, understood = true, label, reaction } = {}) {
    const turn = await this.next();
    assert.equal(turn.conv.phase, "you", JSON.stringify(compact(turn)));
    if (step) assert.equal(turn.conv.step, step, "live step before submitting");
    assert(text, `Missing authored answer for ${turn.conv.step}`);
    const where = this.page.locator(".typebox input");
    if (!await where.isVisible()) await this.press(this.page.locator(".type-toggle"), "open typebox", { key: true });
    if (this.size.touch) await this.press(where, "focus typebox");
    else await where.focus();
    await this.page.keyboard.insertText(text);
    const from = this.frames.length;
    const submit = await this.press(this.page.locator(".typebox button[type=submit]"), `submit ${turn.conv.step}`, { key: true });
    const answer = await this.page.evaluate(() => window.__ew.store.getState().conv.transcript.findLast((row) => row.who === "you"));
    assert(answer?.understood === understood && answer.via === "typed", `accepted parse at ${turn.conv.step} · ${JSON.stringify(answer)}`);
    const result = { step: turn.conv.step, actor: turn.conv.npc, answer, submit, from };
    this.row.turns.push(result);
    if (reaction) {
      const f = await this.wait((f) => f.p?.reaction?.kind === reaction && f.p.reaction.weight > 0.07, reaction, 5000, { from });
      const ch = live(f, f.p.reaction.actorId);
      const previous = turn.actual[f.p.reaction.actorId];
      assert(ch.joints.head && previous?.identity === ch.identity && (distance(ch.joints.head, previous.joints.head) > 0.003
        || distance(ch.joints.smile, previous.joints.smile) > 0.001), `rendered ${reaction} feedback`);
      this.mark(reaction, f);
      this.require(reaction);
    }
    if (label) {
      await this.elapsed(0.65);
      this.checkpoints(label, submit, [-1, 4, 10, 18]);
    }
    return result;
  }

  async pin(label, actor) {
    await this.page.evaluate(([label, actor]) => window.__naturalTest.pin(label, actor), [label, actor]);
  }

  async close({ reopen = false } = {}) {
    const old = this.last;
    const who = old.p?.speakerId ?? old.conv.npc;
    const pin = `close-${old.conv.run}`;
    await this.pin(pin, who);
    await this.pin(`${pin}-player`, "player");
    const from = this.frames.length;
    const press = await this.press(this.page.locator(".convo-head .head-actions .close-x").last(), "close conversation", { key: true });
    if (reopen) await this.page.evaluate((id) => window.__ew.game.startScenario(id), old.conv.id);
    const back = await this.wait((f) => !f.conv.active && ["follow", "interior"].includes(f.scene.mode), "drawn gameplay after close", 9000, { from });
    await this.elapsed(0.55, back);
    const clear = await this.page.evaluate(({ run, time }) => window.__naturalTest.clears.find((item) => item.run === run && item.wall >= time - 10),
      { run: old.conv.run, time: press.wall });
    assert(clear && clear.wall <= press.wall + 240 && !clear.lens.talk && !clear.lens.view?.enabled
      && clear.lens.projection.slice(2).every((v) => Math.abs(v) < 1e-6), "explicit talk projection clear within 240 ms");
    const exit = this.frames.slice(from).filter((f) => f.frame > clear.frame && f.gameTime >= clear.gameTime
      && !f.conv.active && f.scene.zone === back.scene.zone && ["follow", "interior"].includes(f.scene.mode));
    assert(exit.length >= 2, "at least two rendered gameplay frames after the clear");
    let prior = { lens: clear.lens, gameTime: clear.gameTime };
    for (const f of exit) {
      const lens = f.scene.lens;
      assertGameplayLens(lens, this.size, "gameplay on return", this.gameplay);
      assert(f.actual.player.live && f.actual.player.visible);
      if (lens.targetFov === prior.lens.targetFov && lens.zone === prior.lens.zone) {
        const left = Math.abs(prior.lens.fov - lens.targetFov) * Math.exp(-3 * (f.gameTime - prior.gameTime));
        assert(Math.abs(lens.fov - lens.targetFov) <= Math.max(0.05, left) + 1e-6, "return eases toward gameplay FOV");
      }
      prior = { lens, gameTime: f.gameTime };
    }
    this.row.exits.push({ clear, frames: exit.map(compact) });
    const released = this.frames.slice(from).find((f) => f.gameTime >= back.gameTime + 0.22);
    const rest = this.frames.slice(from).find((f) => f.gameTime >= back.gameTime + 0.30);
    assert(released && rest && !["playing", "loading"].includes(released.pinned[pin]?.voice), "outgoing voice owner released");
    if (reopen) assert.equal(released.pinned[pin].voice, "interrupt", "close interrupted a live recording");
    silent(released.pinned[pin].actor, "outgoing mouth after close");
    assert(rest.pinned[pin].weight <= 0.001 && rest.pinned[`${pin}-player`].weight <= 0.001);
    assert(reopen || this.current.scene.panel === null, "exit unmounted panel");
    this.checkpoints("close", press, [1, 4, 9, 15]);
    return { old, back, press };
  }
}

function checkVoice(route, f, actor) {
  const ch = live(f, actor);
  const { media, p } = f;
  assert(audible(f) && p?.speakerId === actor && p.requestOwned && p.requestId != null
    && p.playback === "playing" && p.mouth > 0.12 && mouth(ch) > 0.04, `actual mouth follows ${actor}'s request`);
  assert.equal(media.owner, f.voiceOwner);
  assert.equal(media.pipeline, route.size.touch ? "buffer" : "html");
  assert.equal(media.native, route.size.touch ? "running" : "playing");
  assert(Math.abs(p.envelope - media.envelope) < 0.35, "pose and native gain envelope agree");
  assert(Number.isFinite(media.duration) && media.duration > media.time, "native decoder reports a finite playhead and duration");
  if (p.scope === "session") {
    assert.equal(f.scene.talkSpeaker, actor);
    assert.equal(f.conv.npc, actor);
    silent(live(f, "player"), "learner while the NPC speaks");
  }
  if (!route.row.requiredVoices.includes(media.owner)) route.row.requiredVoices.push(media.owner);
  route.mark("first-voiced", f);
  return f;
}

async function voiced(route, actor, test = () => true, from = route.entryAt) {
  const f = await route.wait((f) => audible(f) && f.p?.speakerId === actor && f.p?.requestOwned
    && f.p.mouth > 0.12 && mouth(f.actual[actor]) > 0.04 && test(f), `${actor} native audio and rendered mouth`, 15_000, { from });
  return checkVoice(route, f, actor);
}

function checkFixture(route, actor, frames) {
  const fixture = fixtures[actor];
  const first = frames.find((f) => f.conv.text === fixture.text && f.media?.key === fixture.key && audible(f) && f.p?.mouth > 0.12);
  assert(first, `${actor} selected the authored speed-1 recording ${fixture.key}`);
  assert(Math.abs(first.media.duration - fixture.duration) < 0.15, "verified Spanish take duration");
  checkVoice(route, first, actor);
  const samples = frames.filter((f) => f.media?.owner === first.request && mediaPlaying(f));
  const [from, to] = fixture.gap;
  const before = samples.filter((f) => f.media.time < from && audible(f));
  const quiet = samples.filter((f) => f.media.time >= from && f.media.time <= to && f.media.envelope <= 0.05);
  const after = samples.filter((f) => f.media.time > to && audible(f));
  const high = (rows) => rows.find((f) => f.p?.mouth > 0.22 && mouth(f.actual[actor]) > 0.1);
  const closed = quiet.find((f) => f.p?.mouth === 0 && isSilent(f.actual[actor]));
  assert(before.length >= 3 && quiet.length >= 3 && after.length >= 3 && high(before) && high(after) && closed,
    `open–closed–open within one Spanish playhead at ${from}–${to}s · ${JSON.stringify(samples.map((f) => [f.media.time, f.media.envelope, f.p?.mouth]))}`);
  assert(span(samples.map((f) => f.p?.mouth ?? 0)) >= 0.18, "mouth has a distinct voiced range");
  assert(frames.some((f) => f.request === first.request && f.p?.playback === "ended")
    || frames.at(-1)?.media?.state === "ended" || frames.at(-1)?.media?.time >= fixture.duration - 0.1,
    "native clock reached the recording end");
  for (const [label, frame] of [["voiced-open", high(before)], ["voiced-closed", closed], ["voiced-reopen", high(after)]]) {
    route.mark(label, frame);
    route.require(label);
  }
  route.row.gap = { actor, ...fixture, request: first.request, before: compact(high(before)), closed: compact(closed), after: compact(high(after)) };
}

async function layoutEvidence(route, actor) {
  const row = await route.page.evaluate(measureTalk, { ...measurementConfig(route.size), snapshot: true });
  route.row.geometry.push(row);
  assert.equal(row.kind, "snapshot", row.reason);
  assert.equal(row.speakerId, actor, "measured the live named speaker");
  assert.equal(row.landmarks.length, 9);
  for (const name of CHECKS) assert.equal(row.checks[name].status, "PASS", `${actor} ${name} · ${row.checks[name].reason}`);
  return row;
}

function motionPeak(route, frames, actor, cue, label, { head = false } = {}) {
  const candidates = frames.filter((f) => f.p?.speakerId === actor && cue.includes(f.p.gesture));
  const peak = candidates.reduce((best, f) => !best || f.p.gestureWeight > best.p.gestureWeight ? f : best, null);
  assert(peak?.p.gestureWeight > 0.20, `${actor} ${cue.join("/")} rendered stroke`);
  const joint = live(peak, actor).joints;
  const deltas = peak.p.deltas;
  const axis = head ? [["head", "headPitch", 0], ["head", "headYaw", 1]]
    : [["upperL", "upperL", 0], ["upperR", "upperR", 0], ["foreL", "elbowL", 0], ["foreR", "elbowR", 0]];
  const low = frames.find((f) => f.frame < peak.frame && f.actual[actor]?.identity === peak.actual[actor].identity
    && (f.p?.gestureWeight ?? 0) < peak.p.gestureWeight * 0.4);
  assert(low && axis.some(([name, field, i]) => Math.abs(deltas[field]) > (head ? 0.014 : 0.035)
    && Math.abs(joint[name][i] - low.actual[actor].joints[name][i]) > (head ? 0.006 : 0.018)), "DEV cue appears on the actual joint");
  assert(frames.some((f) => f.frame > peak.frame && (f.p?.gestureWeight ?? 0) < peak.p.gestureWeight * 0.5), "gesture eases out");
  route.mark(label, peak);
  route.require(label);
  route.checkpoints(label, peak, [8]);
  route.row.peaks.push({ actor, cue: peak.p.gesture, line: peak.conv.lineKey, text: peak.conv.text,
    relative: peak.gameTime - (frames.find((f) => f.conv.line === peak.conv.line)?.gameTime ?? peak.gameTime),
    weight: peak.p.gestureWeight, joints: joint });
  return peak;
}

async function listening(route, actor, { duration = 0.65, seated = false, cafe = false } = {}) {
  const start = await route.next();
  assert.equal(start.conv.phase, "you");
  const at = route.frames.findLast((f, i) => f.conv.run === start.conv.run && f.conv.phase === "you"
    && route.frames[i - 1]?.conv.phase !== "you") ?? start;
  await route.elapsed(duration, at);
  const rows = route.frames.filter((f) => f.gameTime >= at.gameTime + 0.12 && f.conv.run === at.conv.run && f.conv.phase === "you");
  assert(rows.length > 10, "sample quiet mounted learner turn");
  for (const f of rows) {
    assert(f.p?.listening && f.media?.state !== "playing", "learner turn retains listening ownership");
    silent(live(f, actor), "speaker waiting");
    silent(live(f, "player"), "learner waiting");
  }
  if (!rows[0].reduced) assert(rows.some((f) => f.p.listeningWeight > 0.15
    && (Math.abs(f.p.deltas.torsoPitch) > 0.004 || Math.abs(f.p.deltas.headPitch) > 0.004)),
    "waiting has a rendered listening pose");
  const first = live(rows[0], actor);
  if (seated) checkSeat(rows, actor);
  if (cafe) {
    const late = rows.find((f) => f.gameTime >= at.gameTime + 2.5);
    const early = rows.find((f) => f.gameTime >= at.gameTime + 0.32);
    assert(early && late && early.p.speaker.listening && late.p.speaker.listening);
    assert(rows.every((f) => f.actual[actor].hands.every((hand, i) => distance(hand, first.hands[i]) < 0.08)), "counter keeps both hands supported");
    const nearby = route.frames.find((f) => f.conv.run === at.conv.run && f.p?.bystander?.actorId);
    const observer = nearby?.p.bystander.actorId;
    route.row.listener = { early: compact(early), late: compact(late), observer: observer ?? null, joints: early.actual };
    if (observer) {
      const observed = live(nearby, observer);
      assert.notEqual(observed.identity, first.identity);
      assert.equal(nearby.p.bystander.role, "bystander");
      silent(observed, "observer waiting");
    } else {
      route.row.errors.push("Café has no sampled free bystander on the existing cast");
    }
    for (const [label, f] of [["listen-032", early], ["listen-250", late]]) { route.mark(label, f); route.require(label); }
  }
  route.mark("choices", at);
  route.require("choices");
  if (duration >= 5) route.checkpoints("choices", at, [8, 60, 150], route.frames.filter((f) => f.conv.run === at.conv.run && f.conv.phase === "you"));
  return rows;
}

function checkSeat(frames, actor) {
  const first = live(frames[0], actor);
  assert(first.anim === "sit" && first.seat >= 0.4 && first.seat <= 0.65
    && first.pelvis[1] - first.root[1] > 0.33 && first.pelvis[1] - first.root[1] < 0.76, `${actor} actual seat and pelvis`);
  for (const f of frames) {
    const ch = live(f, actor);
    assert(ch.identity === first.identity && distance(ch.root, first.root) < 0.01 && distance(ch.pelvis, first.pelvis) < 0.035);
    assert(ch.hands.every((h) => h?.every(Number.isFinite) && h[1] - ch.root[1] > 0.43 && h[1] - ch.root[1] < 1.35),
      `${actor} hands clear of lap and face`);
  }
}

async function replay(route, actor, { slow = true, first = true } = {}) {
  await route.next();
  const transcript = route.page.locator(".transcript .msg.npc");
  const line = first ? transcript.first() : transcript.last();
  const button = line.locator(".meta button").nth(slow ? 1 : 0);
  const from = route.frames.length, base = route.last;
  await route.press(button, "transcript replay", { key: true });
  const f = await voiced(route, actor, (f) => f.conv.run === base.conv.run && f.request !== base.request
    && (slow ? Math.abs(f.media.rate - 0.82) < 0.01 : f.media.rate === 1), from);
  assert.equal(live(f, actor).identity, base.actual[actor].identity);
  assert(f.p.gestureWeight <= 0.001 || f.p.gesture !== "greeting", "replay has no second greeting stroke");
  route.mark("replay", f);
  route.require("replay");
  await route.wait((next) => next.voiceOwner !== f.request && isSilent(next.actual[actor]), "replay mouth releases", 12000, { from });
  return f;
}

async function pictureRoundTrip(route) {
  const turn = await route.next();
  const at = route.frames.length;
  const chip = route.page.locator(".view-chip button");
  await route.press(route.page.locator(".transcript .msg.npc .meta button").first(), "start a transcript replay before hiding the room", { key: true });
  const talking = await voiced(route, "mia", (f) => f.conv.run === turn.conv.run && f.media.time < 0.9, at);
  await route.pin("picture-npc", "mia");
  await route.pin("picture-player", "player");
  await route.press(chip, "show conversation picture", { key: true });
  const covered = await route.wait((f) => f.conv.run === turn.conv.run && f.scene.picture && f.scene.covered && !f.p
    && f.pinned["picture-npc"]?.weight === 0 && f.pinned["picture-player"]?.weight === 0,
  "same active run releases pose under the picture", 7000, { liveState: true, from: at });
  assert(covered.conv.active && covered.scene.panelId === turn.scene.panelId && !covered.p?.requestOwned);
  assert.equal(covered.pinned["picture-npc"].actor.identity, live(talking, "mia").identity);
  const art = route.page.locator(".scene-backdrop img.on");
  assert(await art.count() && await art.evaluate((img) => img.complete && img.naturalWidth > 0), "actual local picture covers the same panel");
  silent(covered.pinned["picture-npc"].actor, "picture released Mariana");
  await route.press(chip, "return from picture to 3D", { key: true });
  const back = await route.wait((f) => !f.scene.picture && f.p?.run === turn.conv.run && f.scene.mode === "talk" && f.p.listening,
    "same-run held panel returns to 3D");
  assert.equal(back.scene.panelId, turn.scene.panelId);
  assert.equal(live(back, "mia").identity, turn.actual.mia.identity);
  assert(Math.abs(back.scene.lens.heading - turn.scene.lens.heading) < 0.02);
  assert((back.p.gestureWeight ?? 0) <= 0.001, "return cannot restart an old gesture behind the picture");
  await route.wait((f) => f.voiceOwner !== talking.request && isSilent(f.actual.mia), "prior playback releases after picture return");
  route.row.picture = { before: compact(turn), covered: compact(covered), back: compact(back) };
}

async function cafe(route) {
  const start = await route.start("s72-cafe", "mia");
  const rows = await listening(route, "mia", { duration: 10.15, cafe: true });
  const opening = route.frames.filter((f) => f.conv.run === start.conv.run && f.conv.lineKey === "greet_order");
  checkFixture(route, "mia", opening);
  const gestureFrames = route.frames.slice(route.entryAt);
  motionPeak(route, gestureFrames, "mia", ["headGreeting", "question", "greeting"], "gesture-peak", { head: true });
  assert(rows.some((f) => f.p.blink > 0.45 && f.actual.mia.eyeScale < 0.65), "Mariana's real eye bones blink");
  const camera = await layoutEvidence(route, "mia");
  const mouthPoint = camera.landmarks.find(({ name }) => name === "mouth");
  assert(inRect([mouthPoint.x, mouthPoint.y], route.last.scene.canvas, 4) && !inRect([mouthPoint.x, mouthPoint.y], route.last.scene.panel),
    "closed smile is visible above or beside the real panel");
  assert(await route.page.locator(".inputbar .mic").isDisabled(), "typing works with unsupported recognition");
  const choice = route.page.locator(".guide .chips .chip").first();
  await route.press(choice, "choose an authored café suggestion", { key: true });
  assert.equal(await choice.getAttribute("aria-pressed"), "true");
  const example = route.page.locator(".guide-examples .gx-btns .play").first();
  const modelFrom = route.frames.length;
  await route.press(example, "listen to the authored learner model", { key: true });
  const model = await route.wait((f) => mediaPlaying(f) && f.media.time > 0.03 && !f.p?.requestOwned
    && !f.voiceOwner && isSilent(f.actual.mia), "learner model uses its own playback", 9000, { from: modelFrom });
  await route.wait((f) => f.request === model.request && !mediaPlaying(f), "learner model playback ends");
  await route.answer("zzzqvv", { step: "order", understood: false, reaction: "puzzled", label: "submit-miss" });
  const accepted = await route.answer(cafeOrder, { step: "order", reaction: "understood", label: "submit" });
  await route.next();
  const reply = await voiced(route, "mia", (f) => f.conv.line > accepted.answer.id, accepted.from);
  await replay(route, "mia");
  const glance = route.frames.filter((f) => f.conv.line === reply.conv.line);
  assert(glance.length > 2 && glance.every((f) => f.p?.gaze?.target !== "menu"), "barista keeps attention away from the hidden menu anchor");
  if (!route.film) await pictureRoundTrip(route);
  await route.close();
}

async function local(route) {
  const entry = await route.start("s69-local", "rosa", { walk: true });
  await route.next();
  const opening = await voiced(route, "rosa");
  assert.equal(entry.scene.zone, "town");
  assert(opening.p.player?.gaze.target === "rosa", "learner listens to Doña Carmen");
  const rows = await listening(route, "rosa", { duration: 7.8, seated: true });
  const learner = rows[0].actual.player;
  assert(rows.some((f) => f.p.player?.role === "learner" && f.p.player.gaze.target === "rosa"
    && (Math.abs(f.p.player.deltas.hipRoll) > 0.003 || Math.abs(f.p.player.deltas.headPitch) > 0.008)
    && (distance(f.actual.player.joints.head, learner.joints.head) > 0.004 || distance(f.actual.player.joints.body, learner.joints.body) > 0.003)),
  "learner keeps Doña Carmen in view and shows a mounted nod or shift");
  await route.answer("¿Qué me recomienda?");
  await route.next();
  await voiced(route, "rosa", (f) => f.request !== opening.request);
  await route.close();
}

async function taxi(route) {
  const entry = await route.start("s66-taxi", "vinnie", { walk: true });
  const rows = await listening(route, "vinnie", { duration: 5.15 });
  assert.notEqual(live(entry, "vinnie").anim, "sit");
  const opening = route.frames.filter((f) => f.conv.run === entry.conv.run && f.conv.lineKey === "greet");
  checkFixture(route, "vinnie", opening);
  motionPeak(route, route.frames.slice(route.entryAt), "vinnie", ["greeting"], "gesture-peak");
  await layoutEvidence(route, "vinnie");
  await route.answer("Al hotel Mar Azul, por favor.", { step: "dest", reaction: "understood", label: "submit" });
  await route.next();
  await voiced(route, "vinnie", (f) => f.conv.lineKey !== "greet");
  await replay(route, "vinnie");
  const { back } = await route.close();
  assert(back.scene.zone === "town" && !back.scene.pendingRide && !back.scene.ride, "dialogue returns to the walk-up with no ride queued");
  const before = back.actual.player.root;
  if (route.size.touch) {
    await route.page.evaluate((p) => window.__ew.game.walkTo(p[0] + 2, p[2] + 1, { kind: "point" }), before);
  } else await route.page.keyboard.down("ArrowUp");
  try {
    await route.wait((f) => !f.conv.active && f.scene.mode === "follow" && distance(f.actual.player.root, before) > 0.2, "learner actually walks after close");
  } finally {
    if (!route.size.touch) await route.page.keyboard.up("ArrowUp");
  }
  assert(rows.length > 10);
}

const restaurantAnswers = {
  resv: "No, no tenemos reservación.", resv_name: "A nombre de Miller.", party: "Somos dos.",
  wait: "Sí, está bien.", seatpref: "Adentro, por favor.",
};
const hostId = "marco_host", serverId = "marco";

async function restaurant(route) {
  const entry = await route.start("s73-restaurant", hostId);
  assert(entry.scene.cast.includes(hostId) && entry.scene.cast.includes(serverId));
  const turn = await listening(route, hostId, { duration: 5.15 });
  assert.equal(turn[0].conv.step, "resv");
  const greeting = await voiced(route, hostId);
  await layoutEvidence(route, hostId);
  const path = route.row.handoff = { greeting: compact(greeting), turns: [] };
  let lastTurn = turn.at(-1), swap;
  for (let i = 0; i < 6; i++) {
    const step = lastTurn.conv.step;
    assert(lastTurn.conv.npc === hostId && lastTurn.conv.run === entry.conv.run
      && restaurantAnswers[step], `live restaurant step ${step}`);
    const answer = await route.answer(restaurantAnswers[step], { step, label: !i ? "submit" : undefined });
    const next = await route.next("seating or next restaurant step");
    const branch = { resv: ["resv_name", "party"], resv_name: ["party", "wait", "seatpref"],
      party: ["wait", "seatpref"], wait: ["wait", "seatpref"], seatpref: [] };
    assert(next.conv.active && next.conv.run === entry.conv.run && next.conv.phase === "you");
    const passage = route.frames.slice(answer.from);
    const replies = [...new Map(passage.filter((f) => f.conv.line > answer.answer.id).map((f) => [f.conv.line, compact(f)])).values()];
    assert(replies.length && replies.every((f) => [hostId, serverId].includes(f.actor)), "accepted parse leads to fresh authored NPC lines");
    path.turns.push({ step, answer: answer.answer, next: next.conv.step, replies });
    if (next.conv.npc !== hostId) {
      assert.equal(next.conv.npc, serverId);
      swap = passage.find((f) => f.conv.npc === serverId && f.conv.line > answer.answer.id && f.p?.speakerId === serverId);
      assert(swap, "mounted first server frame on original run");
      break;
    }
    assert(branch[step].includes(next.conv.step), `unexpected host step ${step} → ${next.conv.step}`);
    lastTurn = next;
  }
  assert(swap, "restaurant reached Luis through its live host steps");
  const lastHost = route.frames.findLast((f) => f.frame < swap.frame && f.p?.speakerId === hostId && f.conv.line != null);
  assert(lastHost && lastHost.conv.run === swap.conv.run);
  const oldVoice = route.frames.findLast((f) => f.frame <= lastHost.frame && f.conv.line === lastHost.conv.line && audible(f) && f.p?.mouth > 0.12);
  assert(oldVoice, "last host utterance has matching playback");
  checkVoice(route, oldVoice, hostId);
  const incoming = await voiced(route, serverId, (f) => f.conv.line === swap.conv.line, route.frames.indexOf(swap));
  const host = live(lastHost, hostId), server = live(incoming, serverId), player = live(swap, "player");
  assert.notEqual(host.identity, server.identity);
  assert.equal(live(incoming, hostId).identity, host.identity);
  assert.notEqual(oldVoice.request, incoming.request);
  assert(oldVoice.conv.line < incoming.conv.line);
  const after = route.frames.filter((f) => f.frame >= swap.frame && f.conv.npc === serverId && f.gameTime <= swap.gameTime + 0.65);
  const aim = after.find((f) => {
    const learner = live(f, "player"), head = live(f, serverId).headWorld;
    const [dx, dz] = [head[0] - learner.root[0], head[2] - learner.root[2]];
    return f.p?.player?.gaze.target === serverId && learner.gazeAim && distance(learner.gazeAim, head) < 0.15
      && (learner.facing[0] * dx + learner.facing[2] * dz) / Math.hypot(dx, dz) > 0.5;
  });
  assert(aim && aim.gameTime - swap.gameTime <= 0.10 + 2 * frameMs / 1000, "learner turns actual attention to Luis within about 100 ms");
  const released = after.find((f) => isSilent(f.actual[hostId]) && f.voiceOwner !== oldVoice.request
    && (f.p?.others.find((p) => p.actorId === hostId)?.gestureWeight ?? 0) <= 0.001);
  assert(released && released.gameTime - swap.gameTime <= 0.24, "host voice, lips and gesture release by 240 ms");
  for (const f of after.filter((f) => f.frame >= released.frame)) {
    assert.equal(live(f, hostId).identity, host.identity);
    silent(f.actual[hostId], "host remains quiet after handoff");
    assert((f.p?.others.find((p) => p.actorId === hostId)?.gestureWeight ?? 0) <= 0.001, "old host gesture cannot fire late");
  }
  assert.equal(live(aim, "player").identity, player.identity);
  Object.assign(path, { lastHost: compact(lastHost), firstServer: compact(swap), oldVoice: compact(oldVoice),
    newVoice: compact(incoming), released: compact(released), aim: compact(aim) });
  route.mark("cast-last-host", lastHost);
  route.mark("cast-first-server", swap);
  route.require("cast-last-host", "cast-first-server");
  route.checkpoints("cast", swap, [-1, 1, 5, 12]);
  await layoutEvidence(route, serverId);
  await replay(route, serverId, { first: false });
  await route.close();
}

const ticketAnswers = {
  dest: "Un boleto sencillo a Tulum, por favor.", count: "Solo uno.", trip: "Sencillo, por favor.", ret: "El domingo.",
  travel_day: "Sí, hoy.", time: "El próximo, por favor.", sold_out: "Sí, está bien.", seat: "Ventanilla, por favor.",
  name: "Aquí tiene mi pasaporte.", other_name: "Ana Miller.", discount: "No, ninguna.", student_id: "Aquí tiene.",
  pay: "Con tarjeta.", ticket: "Gracias.", info: "No, es todo, gracias.",
};

async function tickets(route, many = false) {
  const entry = await route.start("s67a-tickets", "walter");
  await listening(route, "walter", { duration: route.film ? 5.15 : 0.7 });
  const opening = await voiced(route, "walter");
  assert.equal(entry.scene.zone, "station");
  await layoutEvidence(route, "walter");
  const handoffKey = many ? "ticket_many" : "ticket_one";
  let utterance, passage;
  for (let i = 0; i < 16; i++) {
    const turn = await route.next();
    const step = turn.conv.step;
    assert(turn.conv.active && turn.conv.run === entry.conv.run && turn.conv.npc === "walter" && ticketAnswers[step],
      `live ticket step ${step}`);
    const answer = many && step === "dest" ? "Dos boletos sencillos a Tulum, por favor." : step === "count" && many ? "Dos." : ticketAnswers[step];
    const submitted = await route.answer(answer, { step, label: step === "pay" ? "submit" : undefined });
    await route.next("ticket reply or clerk's next question");
    passage = route.frames.slice(submitted.from);
    utterance = passage.find((f) => f.conv.lineKey === handoffKey && f.conv.line > submitted.answer.id);
    if (utterance) break;
  }
  assert(utterance, `reached authored ${handoffKey} via the clerk's live steps`);
  const { line, text } = utterance.conv;
  assert.match(text, many ? /^Aquí tiene sus boletos\.$/ : /^(?:Listo, aquí|Aquí) tiene su boleto\.$/);
  // Both singular variants are selected by the game's own RNG. Check the key of the exact line played.
  const key = audioKey("es_walter", 1, text);
  if (text === fixtures.walter.text) assert.equal(key, fixtures.walter.key);
  const voicedHandoff = await voiced(route, "walter", (f) => f.conv.line === line && f.media.key === key, route.frames.indexOf(utterance));
  assert.notEqual(voicedHandoff.request, opening.request);
  const sameLine = passage.filter((f) => f.conv.line === line && f.conv.run === entry.conv.run && f.request === voicedHandoff.request);
  assert(sameLine.filter(audible).length >= 3, "audible ticket handoff keeps its real playhead");
  const glance = sameLine.find((f) => f.p?.gaze?.target === "handoff" && f.p.deltas.headPitch > 0.006 && f.p.deltas.eyeY < -0.0005);
  assert(glance, "brief downward gaze to the handoff on the voiced ticket line");
  const ch = live(glance, "walter"), learner = live(glance, "player");
  const delta = ch.gazeAim.map((v, i) => v - ch.headWorld[i]);
  const forward = (ch.facing[0] * delta[0] + ch.facing[2] * delta[2]) / Math.hypot(delta[0], delta[2]);
  assert(forward > Math.cos(65 * Math.PI / 180) && Math.abs(Math.atan2(delta[1], Math.hypot(delta[0], delta[2]))) <= 35 * Math.PI / 180,
    "counter handoff is in the actual clerk's gaze cone");
  const back = sameLine.find((f) => f.gameTime > glance.gameTime && f.p?.gaze?.target === "learner" && f.p.speaker?.watching
    && f.actual.walter.gazeAim && distance(f.actual.walter.gazeAim, f.actual.player.headWorld) < 0.15);
  assert(back && back.gameTime - glance.gameTime < 0.85 && back.actual.walter.identity === ch.identity
    && back.actual.walter.poseId === ch.poseId && back.actual.player.identity === learner.identity, "returns to the learner on the same line, pose and request");
  const returned = live(back, "walter");
  assert(ch.joints.head[0] - returned.joints.head[0] > 0.006 && ch.joints.iris[4] - returned.joints.iris[4] < -0.0005,
    "downward head and iris have signed motion on the rig");
  const counterY = ch.gazeAim[1];
  assert(ch.headWorld[1] > counterY + 0.2 && Math.abs(ch.headScreen[2]) < 1
    && inRect(ch.headScreen, glance.scene.canvas, 4) && !inRect(ch.headScreen, glance.scene.panel));
  assert(ch.hands.every((hand, i) => distance(hand, returned.hands[i]) < 0.08 || hand[1] >= counterY + 0.065),
    "supported hands stay clear of the counter on the reach");
  route.row.handoff = { text, key, request: voicedHandoff.request, glance: { ...compact(glance), ch }, back: { ...compact(back), ch: returned } };
  route.mark("object-glance", glance);
  route.mark("object-return", back);
  route.require("object-glance", "object-return");
  route.checkpoints("object-glance", glance, [8], sameLine);
  await replay(route, "walter", { first: false });
  await route.close();
}

async function directions(route) {
  const entry = await route.start("x13-por-donde", "queta", { walk: true });
  await listening(route, "queta", { duration: 5.15 });
  await route.answer("Disculpe, ¿cómo llego al correo?", { step: "where", label: "submit" });
  const turn = await route.next();
  assert.equal(turn.conv.step, "thanks");
  const rows = route.frames.filter((f) => f.conv.run === entry.conv.run && f.conv.lineKey?.startsWith("aw_post"));
  assert.deepEqual([...new Set(rows.map((f) => f.conv.lineKey))], ["aw_post_1", "aw_post_2"]);
  const first = rows.filter((f) => f.conv.lineKey === "aw_post_1");
  const second = rows.filter((f) => f.conv.lineKey === "aw_post_2");
  assert(first[0].conv.text.includes("a la izquierda") && second[0].conv.text.includes("junto al banco"));
  let beat;
  try {
    beat = motionPeak(route, first, "queta", ["point"], "gesture-peak");
  } catch (error) {
    route.row.errors.push(errorText(error));
  }
  const arm = (f) => [f.p.deltas.upperL, f.p.deltas.upperR, f.p.deltas.elbowL, f.p.deltas.elbowR];
  const repetition = second.filter((f) => f.p?.gesture === "point" && f.p.gestureWeight > 0.17);
  if (beat) assert(!repetition.length || repetition.some((f) => distance(arm(f), arm(beat)) > 0.04), "landmark line varies the directional beat");
  for (const [label, group] of [["direction-left", first], ["direction-landmark", second]]) {
    const spoken = group.find((f) => audible(f) && f.p?.mouth > 0.12);
    if (spoken) checkVoice(route, spoken, "queta");
    else {
      const closed = group.filter((f) => isSilent(f.actual.queta) && !mediaPlaying(f));
      assert(closed.length > 2, "optional unrecorded line stays silent");
      if (!closed.some((f) => f.p?.gestureWeight > 0.15)) {
        route.row.errors.push(`${group[0].conv.lineKey} has text and closed-mouth evidence but no emitted silent stroke`);
      }
    }
    route.mark(label, spoken ?? group.find((f) => f.p?.speakerId === "queta"));
    route.require(label);
  }
  await layoutEvidence(route, "queta");
  const slower = await route.answer("¿Puede hablar más despacio, por favor?", { step: "thanks" });
  const repeated = await route.next();
  const repeat = route.frames.slice(slower.from).filter((f) => f.conv.line > slower.answer.id && f.conv.lineKey?.startsWith("aw_post"));
  assert(repeated.conv.slow && repeated.conv.step === "thanks", "real slow repeat keeps the original directions turn");
  assert.deepEqual([...new Set(repeat.map((f) => f.conv.text))], [first[0].conv.text, second[0].conv.text], "repeated Spanish route, both lines");
  assert(repeat.every((f) => f.p?.gesture !== "point" || f.p.gestureWeight <= 0.001), "the replay does not repeat the pointing stroke");
  route.mark("replay", repeat.find((f) => audible(f)) ?? repeat[0]);
  route.require("replay");
  const from = route.frames.length;
  await route.answer("¡Muchas gracias!", { step: "thanks" });
  const ended = await route.next();
  assert.equal(ended.conv.phase, "ended");
  await route.elapsed(1.0, ended);
  const ending = route.frames.slice(from);
  const bye = ending.find((f) => f.conv.lineKey === "aw_bye" && f.conv.text);
  const farewell = ending.filter((f) => f.p?.reaction?.kind === "farewell");
  assert(bye, "the authored sign-off occurs");
  if (!farewell.some((f) => f.p.reaction.weight > 0.1) || new Set(farewell.map((f) => f.p.reaction.sequence)).size !== 1) {
    route.row.errors.push("No single rendered sign-off in the actual exchange");
  }
  assert((route.last.p?.reaction?.weight ?? 0) <= 0.001 && route.last.conv.completions === 1, "one restrained sign-off that releases");
  route.mark("sign-off", farewell.reduce((a, b) => !a || a.p.reaction.weight < b.p.reaction.weight ? b : a, null));
  route.require("sign-off");
  assert(await route.page.locator(".ended-box .ended-title").isVisible(), "real directions end card");
  await route.close();
  await route.page.locator('.directions-card[data-destination="post"]').waitFor({ state: "visible", timeout: 8000 });
  // The post-office reply has a left turn but no straight instruction. Walk up again
  // for the separately authored right turn and "Siga derecho".
  const again = await route.start("x13-por-donde", "queta", { walk: true });
  const straight = await route.answer("Disculpe, ¿cómo llego al café La Ceiba?", { step: "where" });
  await route.next();
  const section = route.frames.slice(straight.from).filter((f) => f.conv.run === again.conv.run && f.conv.lineKey === "aw_cafe_1");
  assert(section.some((f) => /Siga derecho/.test(f.conv.text)), "authored straight instruction");
  const sample = section.find((f) => f.p?.gesture === "point" && f.p.gestureWeight > 0.20 && f.actual.queta?.joints);
  if (!sample) route.row.errors.push("No rendered point on the authored straight instruction");
  route.mark("direction-straight", sample);
  route.require("direction-straight");
  await route.close();
}

async function loteria(route) {
  assert(await route.page.evaluate(() => window.__ew.loteria.stage(2, 1)), "seeded stage through the existing hook");
  const entry = await route.start("x10-loteria", "tona", { walk: true, spot: { zone: "town", x: 21.28, z: -24.38, rot: 2.41 } });
  const town = live(entry, "tona");
  for (const [step, answer] of [["play", "Sí, claro"], ["know", "No. ¿Me explica?"], ["ask", "¿Juega seguido?"]]) {
    await route.answer(answer, { step });
  }
  const ended = await route.next();
  assert.equal(ended.conv.phase, "ended");
  assert.equal(ended.conv.completions, 1);
  const action = await route.press(route.page.locator(".loteria-cta"), "join the lotería board", { key: true });
  assert.equal(action.hit.text, route.config.learner === "lt" ? "Sužaisti loteriją" : "Play lotería");
  const stagedAt = route.frames.length;
  const entered = await route.wait((f) => f.scene.mode === "stage" && f.scene.modeId === "loteria" && !!f.table,
    "real lotería stage", 12000, { from: Math.max(0, stagedAt - 60) });
  assert(!entered.conv.active);
  assert.equal(live(entered, "tona").identity, town.identity, "town Toña takes her actual seat on the stage");
  assert.notEqual(live(entered, "beto").identity, town.identity);
  route.mark("stage-entry", entered);
  route.require("stage-entry");
  const call = await voiced(route, "beto", (f) => f.p.scope === "mode" && f.scene.modeId === "loteria" && /^lt_[cv]_/.test(f.p.lineId),
    route.frames.indexOf(entered));
  route.mark("beto-call", call);
  route.require("beto-call");
  const waiting = await route.wait((f) => f.table?.phase === "waiting" && f.table.calls.length > 0, "learner wait after Beto's call");
  await route.elapsed(0.5, waiting);
  const rows = route.frames.filter((f) => f.gameTime >= waiting.gameTime && f.table?.phase === "waiting");
  assert(rows.every((f) => !f.actual.player.visible && f.actual.player.anim === "sit" && f.actual.player.weight === 0
    && Math.abs(f.actual.player.seat - 0.49) < 0.01 && Math.hypot(f.actual.player.root[0] - 21.55, f.actual.player.root[2] + 26.02) < 0.05),
    "stage learner's original hidden seat and released ownership");
  checkSeat(rows, "tona");
  assert(rows.some((f) => isSilent(f.actual.beto) && isSilent(f.actual.tona)));
  route.mark("stage-wait", waiting);
  route.require("stage-wait");
  const bounds = await route.page.evaluate(() => {
    const rect = (selector) => {
      const r = document.querySelector(selector)?.getBoundingClientRect();
      return r && [r.left, r.top, r.right, r.bottom];
    };
    return { panel: rect(".loteria-board-panel"), scene: rect(".loteria-scene"), draw: rect(".loteria-draw"), exit: rect(".loteria-exit"),
      board: rect(".loteria-board"), cells: [...document.querySelectorAll(".loteria-cell")].map((el) => {
        const r = el.getBoundingClientRect();
        return [r.left, r.top, r.right, r.bottom];
      }), overflow: [document.documentElement.scrollWidth, document.documentElement.scrollHeight] };
  });
  route.row.board = bounds;
  const box = [0, 0, route.size.width, route.size.height];
  for (const rect of [bounds.panel, bounds.draw, bounds.board, ...bounds.cells]) {
    assert(rect && rect[2] > rect[0] && rect[3] > rect[1] && inRect(rect.slice(0, 2), box) && inRect(rect.slice(2), box), "lotería controls and cells fit");
  }
  assert.equal(bounds.cells.length, 16);
  assert.deepEqual(bounds.overflow, box.slice(2));
  for (const id of ["beto", "tona"]) {
    const head = live(route.last, id).headScreen;
    assert(inRect(head, bounds.scene) && [bounds.panel, bounds.draw, bounds.exit].every((rect) => !inRect(head, rect)), `${id} face unobscured`);
  }
  const uncalled = waiting.table.board.find((id) => !waiting.table.calls.includes(id));
  assert(uncalled, "seeded board has a legal uncalled tile");
  const tile = route.page.locator(`.loteria-cell[data-card="${uncalled}"]`);
  // The mode owns Enter while the board is up. Use the real pointed tile for this action.
  await route.press(tile, "try an uncalled lotería tile");
  const response = await voiced(route, "tona", (f) => f.scene.modeId === "loteria" && /^lt_t_/.test(f.p.lineId), stagedAt);
  assert.equal(live(response, "tona").identity, town.identity);
  silent(live(response, "beto"), "Beto releases on Toña's response");
  route.mark("tona-response", response);
  route.require("tona-response");
  const nextBeto = await voiced(route, "beto", (f) => f.request !== call.request && /^lt_[cv]_/.test(f.p.lineId), route.frames.indexOf(response));
  assert.notEqual(nextBeto.p.lineId, call.p.lineId);
  await route.pin("beto-stage", "beto");
  await route.pin("tona-stage", "tona");
  if (route.size.touch) await route.press(route.page.locator(".loteria-exit"), "leave the lotería stage");
  else await route.page.keyboard.press("Escape");
  const exit = await route.wait((f) => !f.scene.modeId && !f.scene.transition && f.actual.player.visible && f.actual.player.anim === "idle",
    "restored town learner after lotería");
  const farewell = route.frames.find((f) => f.scene.modeId === "loteria" && f.p?.speakerId === "tona" && f.p.lineId === "lt_t_bye");
  assert(farewell, "staged Toña says her authored goodbye before the town return");
  route.mark("stage-goodbye", farewell);
  route.require("stage-goodbye");
  assert(!exit.actual.beto.live && exit.actual.player.weight === 0 && exit.actual.tona.identity === town.identity);
  assert(!["playing", "loading"].includes(exit.pinned["beto-stage"].voice) && exit.pinned["tona-stage"].weight <= 0.001);
  route.mark("stage-exit", exit);
  route.require("stage-exit");
}

async function street(route) {
  const from = route.frames.length;
  await route.page.evaluate(() => window.__ew.game.enterZone("town", undefined, true));
  await route.wait((f) => f.scene.zone === "town" && !f.scene.transition, "street town position");
  assert(await route.page.evaluate(() => window.__ew.game.streetNow("i_dropped", "a")), "authored dropped-wallet moment");
  const arrival = await route.wait((f) => f.street?.moment === "i_dropped" && f.actual.a?.live, "wallet passer-by arrives", 9000, { from });
  const person = live(arrival, "a");
  const choice = (n) => route.page.locator(`.street-card[data-step="choices"][data-exchange="${n}"] .street-choice`).first();
  for (const exchange of [0, 1]) {
    const turn = await route.wait((f) => f.street?.step === "choices" && f.street.exchange === exchange && f.p?.listening,
      `passer-by waiting on exchange ${exchange}`);
    assert.deepEqual([turn.street.moment, turn.street.cast, turn.street.script], ["i_dropped", "a", "first"]);
    assert(turn.street.person?.onScreen && !turn.conv.active && turn.scene.zone === "town");
    await route.elapsed(0.6, turn);
    const rows = route.frames.filter((f) => f.gameTime >= turn.gameTime + 0.12 && f.street?.step === "choices" && f.street.exchange === exchange);
    assert(rows.some((f) => f.p?.listeningWeight > 0.15 && Math.abs(f.p.deltas.torsoPitch) > 0.004), "non-idle passer-by waiting");
    for (const f of rows) {
      const actor = live(f, "a");
      assert.equal(actor.identity, person.identity);
      assert(actor.hands.every((h) => h.every(Number.isFinite)));
      assert(actor.hands.every((h, i) => distance(h, rows[0].actual.a.hands[i]) < 0.20), "waiting grip stays with the same passer-by");
      silent(actor, "street choices");
    }
    assert.equal(turn.p.player?.actorId, "player");
    const at = route.frames.length;
    if (exchange === 0) {
      route.row.ui = await route.page.evaluate(() => [...document.querySelectorAll(".street-card [lang]")]
        .map((el) => [el.lang, el.textContent.trim()]));
    }
    const choices = route.page.locator(`.street-card[data-step="choices"][data-exchange="${exchange}"] .street-choice`);
    assert.equal(await choices.count(), 2, "the original two authored choices");
    const picked = await route.press(choice(exchange), `choose street reply ${exchange + 1}`, { key: true });
    const [left, top, right, bottom] = picked.hit.box;
    assert(right - left >= 40 && bottom - top >= 36 && inRect([left, top], [0, 0, route.size.width, route.size.height])
      && inRect([right, bottom], [0, 0, route.size.width, route.size.height]), "street choice fits and receives trusted input");
    if (exchange === 0) assert.match(picked.hit.text, /Disculpe/i, "authored learner greeting");
    const reply = await voiced(route, "a", (f) => f.p.scope === "street" && f.street?.step === "reply" && f.street.exchange === exchange, at);
    assert.equal(live(reply, "a").identity, person.identity);
    if (exchange === 0) {
      await voiced(route, "a", (f) => f.p.scope === "street" && f.street?.step === "reply"
        && f.street.exchange === exchange && f.p.lineId !== reply.p.lineId, route.frames.indexOf(reply));
    }
    route.row.turns.push({ exchange, picked, reply: compact(reply) });
  }
  await route.pin("street", "a");
  const gone = await route.wait((f) => !f.street && !f.actual.a?.live, "same passer-by departs and unmounts", 18000);
  assert(!["playing", "loading"].includes(gone.pinned.street.voice));
  assert(gone.pinned.street.weight <= 0.001);
  const departure = route.frames.filter((f) => f.street?.step === "done" && f.actual.a?.identity === person.identity);
  assert(departure.some((f) => distance(f.actual.a.root, departure[0].actual.a.root) > 0.2), "actual passer-by walked away");
}

async function missing(route) {
  const entry = await route.start("s72-cafe", "mia");
  const unavailable = await route.wait((f) => f.audioState === "unavailable" && f.conv.text === fixtures.mia.text,
    "unavailable Mariana request", 15000, { from: route.entryAt });
  const notice = route.page.locator(".audio-recovery[role=status]");
  assert(await notice.isVisible() && (await notice.innerText()).trim(), "usual missing-clip notice");
  assert(await route.page.locator(".transcript .msg.npc .bubble").first().isVisible(), "Spanish transcript remains usable");
  await route.elapsed(0.32, unavailable);
  const missingFrames = route.frames.filter((f) => f.wall >= unavailable.wall && f.conv.run === entry.conv.run && f.audioState === "unavailable");
  assert(missingFrames.length >= 8 && missingFrames.every((f) => !mediaPlaying(f) && isSilent(live(f, "mia"))));
  assert(route.row.audioUrls.some((r) => r.omitted && r.key === fixtures.mia.key && !r.local), "deliberate exact-key 404 from the local route");
  const waiting = await route.next();
  assert.equal(waiting.conv.step, "order");
  assert(await route.page.locator(".guide .chips .chip").first().isVisible(), "choices remain available without the opening recording");
  await route.answer(cafeOrder, { step: "order", reaction: "understood" });
  await route.next();
  await route.close();
}

async function interrupted(route) {
  // A pending first presentation may finish loading, but it cannot attach after the trusted close.
  await route.page.evaluate(() => window.__ew.game.startScenario("s72-cafe"));
  const intro = await route.wait((f) => f.conv.id === "s72-cafe" && f.conv.active && f.conv.intro && f.scene.panel, "early café intro");
  await route.press(route.page.locator(".convo-head .head-actions .close-x").last(), "close during intro", { key: true });
  const closed = await route.wait((f) => !f.conv.active && f.scene.mode === "interior", "interrupted intro releases");
  await route.elapsed(0.55, closed);
  assert(route.frames.filter((f) => f.gameTime >= closed.gameTime).every((f) => !f.conv.active && f.voiceOwner == null && !f.p));
  const first = await route.start("s72-cafe", "mia");
  const old = await voiced(route, "mia", (f) => f.media.time < 0.9);
  assert(first.conv.run > intro.conv.run);
  const exit = await route.close({ reopen: true });
  assert.equal(exit.old.conv.run, first.conv.run);
  const next = await route.start("s72-cafe", "mia", { begun: true });
  const fresh = await voiced(route, "mia");
  assert(next.conv.run > first.conv.run && fresh.p.requestId !== old.p.requestId && fresh.request !== old.request, "same speaker reopens through a fresh request");
  assert.equal(fresh.media.key, old.media.key);
  await route.next();
  await route.close();
}

async function mic(route) {
  const entry = await route.start("s72-cafe", "mia");
  await route.next();
  const button = route.page.locator(".inputbar .mic");
  if (route.current.conv.mic !== "listening") await route.press(button, "start local recognition");
  const on = await route.wait((f) => f.conv.mic === "listening" && f.p?.listening, "local recognition callback");
  await route.elapsed(0.5, on);
  const observed = route.frames.filter((f) => f.gameTime >= on.gameTime);
  assert(observed.every((f) => f.conv.mic === "listening" && f.conv.run === entry.conv.run && isSilent(f.actual.mia)));
  assert(observed.some((f) => f.p.listeningWeight > 0.15
    && (Math.abs(f.p.deltas.torsoPitch) > 0.004 || Math.abs(f.p.deltas.headPitch) > 0.004)));
  await route.press(route.page.locator(".type-toggle"), "typing interrupts recognition");
  await route.wait((f) => f.conv.typing && f.conv.mic === "off" && f.p?.listening, "typebox releases mic");
  await route.press(button, "reopen mic");
  await route.wait((f) => f.conv.mic === "listening", "second local recognition attempt");
  assert(await route.page.evaluate((text) => window.__naturalSpeak(text), cafeOrder));
  const replied = await route.wait((f) => f.conv.mic === "off" && f.conv.phase === "npc" && f.conv.run === entry.conv.run, "recognition reaches Session");
  const answer = await route.page.evaluate(() => window.__ew.store.getState().conv.transcript.findLast((line) => line.who === "you"));
  assert(answer?.understood && answer.via === "voice");
  route.row.turns.push({ answer, response: compact(replied) });
  await route.next();
  await route.close();
}

function reducedStill(rows, ids) {
  assert(rows.at(-1).gameTime - rows[0].gameTime >= 7, "seven rendered seconds after the reduced pose settles");
  const ranges = {};
  for (const id of ids) {
    const actors = rows.map((f) => live(f, id));
    assert(actors.every((ch) => ch.identity === actors[0].identity));
    ranges[id] = {};
    for (const name of ["body", "head", "upperL", "upperR", "foreL", "foreR", "iris", "smile"]) {
      assert(actors.every((ch) => ch.joints[name]?.length === 6), `${id} ${name} joint sample`);
      const range = Math.max(...actors[0].joints[name].map((_, i) => span(actors.map((ch) => ch.joints[name][i]))));
      assert(range <= 0.002, `${id} ${name} reduced motion range ${range}`);
      ranges[id][name] = range;
    }
  }
  assert(rows.every((f) => f.reduced && f.p?.reduced && !f.p.gestureWeight && !(f.p.reaction?.weight > 0.001)));
  return ranges;
}

async function reduced(route) {
  const entry = await route.start("s72-cafe", "mia");
  assert(entry.reduced && entry.p.reduced);
  await route.next();
  checkFixture(route, "mia", route.frames.filter((f) => f.conv.run === entry.conv.run && f.conv.lineKey === "greet_order"));
  const observed = await route.wait((f) => f.p?.listening, "reduced café waiting pose");
  const start = await route.elapsed(0.36, observed);
  await route.elapsed(7.05, start);
  const rows = route.frames.filter((f) => f.gameTime >= start.gameTime && f.conv.phase === "you" && f.conv.run === entry.conv.run);
  const observer = rows.find((f) => f.p?.bystander)?.p.bystander.actorId;
  if (!observer) route.row.errors.push("The fresh reduced café did not expose a mounted free observer");
  const ids = observer && rows.every((f) => f.actual[observer]) ? ["mia", "player", observer] : ["mia", "player"];
  route.row.still = reducedStill(rows, ids);
  const blink = rows.find((f) => f.p.blink > 0.45 && f.actual.mia.eyeScale < 0.65);
  assert(blink, "fresh reduced blink on the actual eye bone");
  route.mark("reduced-blink", blink);
  route.require("reduced-blink");
  const at = route.frames.findLast((f, i) => f.conv.run === entry.conv.run && f.conv.phase === "you"
    && route.frames[i - 1]?.conv.phase !== "you");
  route.mark("choices", at);
  route.checkpoints("choices", at, [8, 60, 150], route.frames.filter((f) => f.conv.phase === "you"));
  await route.page.emulateMedia({ reducedMotion: "no-preference" });
  await route.wait((f) => !f.reduced && f.p && !f.p.reduced, "live full-motion preference");
  const beforeAnswer = route.frames.length;
  const answer = await route.answer(cafeOrder, { step: "order" });
  const active = await voiced(route, "mia", (f) => f.media.time < 0.6, beforeAnswer);
  await route.page.emulateMedia({ reducedMotion: "reduce" });
  const toggle = await route.wait((f) => f.reduced && f.p?.reduced, "live motion preference change");
  assert.equal(toggle.conv.run, active.conv.run);
  assert.equal(toggle.voiceOwner, active.request, "playhead remains owned across preference change");
  const after = await voiced(route, "mia", (f) => f.reduced && f.request === active.request && f.media.time > active.media.time,
    route.frames.indexOf(toggle));
  route.mark("reduced-toggle", after);
  route.require("reduced-toggle");
  await route.elapsed(0.65, toggle);
  route.checkpoints("submit", answer.submit, [-1, 4, 10, 18]);
  const end = await route.next();
  const tail = await route.elapsed(0.45, end);
  await route.elapsed(7.05, tail);
  const still = route.frames.filter((f) => f.gameTime >= tail.gameTime && f.conv.phase === "you" && f.conv.run === entry.conv.run);
  route.row.toggledStill = reducedStill(still, ids);
  await replay(route, "mia");
  await route.close();
}

async function alux(route, id, actor, x, z) {
  const entry = await route.start(id, actor, { walk: true, spot: { zone: "gruta", x, z, rot: 0 } });
  assert.equal(entry.scene.zone, "gruta");
  await route.next();
  await voiced(route, actor);
  await layoutEvidence(route, actor);
  await listening(route, actor);
  await route.close();
}

async function tree(route) {
  await route.page.evaluate(async () => {
    const { game } = window.__ew;
    await game.enterZone("gruta", { x: 6, z: -171.5, rot: Math.PI }, true);
    game.rig.yaw = Math.PI;
    game.rig.snap();
  });
  await route.wait((f) => f.scene.zone === "gruta" && !f.scene.transition, "tree lake approach");
  await route.page.evaluate(() => window.__ew.game.walkTo(6, -177.2, { kind: "point" }));
  const entry = await route.start("x04-yaxche", "yaxche", { begun: true, nullTree: true });
  await route.next();
  const samples = route.frames.filter((f) => f.conv.run === entry.conv.run && f.conv.active);
  assert(samples.length > 10 && samples.every((f) => f.scene.tree && !f.p && f.scene.cast.length === 0 && f.voiceOwner == null));
  assert(await route.page.locator(".transcript .msg.npc .bubble").first().isVisible(), "tree retains the real transcript with no humanoid actor");
  await route.press(route.page.locator(".convo-head .head-actions .close-x").last(), "close the tree transcript", { key: true });
  await route.wait((f) => !f.conv.active && !f.scene.tree, "tree releases");
}

async function paco(route) {
  const entry = await route.start("x05-tienda", "tienda");
  assert.equal(entry.scene.zone, "gas-station");
  const position = await route.page.evaluate(() => {
    const { game } = window.__ew;
    const p = game.talkNpc.ch.root.getWorldPosition(game.talkNpc.home.clone());
    return game.zone.group.worldToLocal(p).toArray();
  });
  assert(Math.hypot(position[0] + 3, position[2] + 3.8) < 0.1, "Paco at his own store counter");
  await route.next();
  await voiced(route, "tienda");
  await layoutEvidence(route, "tienda");
  await route.close();
}

async function pool(route) {
  const entry = await route.start("x09-alberca", "vale", { walk: true });
  for (const [step, answer] of [["play", "Sí, claro"], ["name", "Me llamo Ana"], ["from", "Soy de Lituania"]]) {
    await route.answer(answer, { step });
  }
  await route.next();
  const lastVale = await voiced(route, "vale", (f) => f.conv.lineKey === "from_us" || f.conv.lineKey === "far");
  await route.pin("pool-chat", "vale");
  const from = route.frames.length;
  await route.answer("¿Cuántos años tienes?", { step: "ask" });
  const opening = await route.wait((f) => f.scene.mode === "stage" && f.scene.modeId === "pool" && f.pool?.phase === "opening" && !f.conv.active,
    "Vale's authored conversation queues the pool game", 25000, { from });
  assert.equal(opening.conv.completions, 1);
  const learner = opening.actual.player.root;
  assert(Math.hypot(learner[0] + 106, learner[1] + 1.16, learner[2] + 28.75) < 0.05);
  const rule = await voiced(route, "vale", (f) => f.scene.modeId === "pool" && f.p.scope === "mode" && f.p.lineId === "pl_rules", from);
  assert.equal(rule.actual.vale.identity, entry.actual.vale.identity, "Vale remains mounted from the water conversation to the game");
  assert.notEqual(rule.request, lastVale.request);
  assert(rule.pinned["pool-chat"].weight <= 0.001 && !["loading", "playing"].includes(rule.pinned["pool-chat"].voice));
  const hit = await route.wait((f) => f.scene.modeId === "pool" && f.pool?.phase === "play" && f.pool.receiver === "learner" && f.pool.canHit,
    "the existing pool receiver and hit window", 22000, { from });
  if (route.size.touch) await route.press(route.page.locator('.pool-hit[data-can-hit="true"]'), "return the pool ball");
  else await route.page.keyboard.press("Space");
  const caught = await route.wait((f) => f.pool?.hits > hit.pool.hits, "legal pool return");
  assert.equal(caught.pool.hits, hit.pool.hits + 1);
  const child = await route.wait((f) => f.scene.modeId === "pool" && f.pool?.phase === "play" && ["diego", "santi"].includes(f.p?.speakerId)
    && f.p.requestOwned && f.p.mouth > 0.12 && audible(f), "an active pool child owns a real call", 45_000, { from });
  const speaker = child.p.speakerId;
  checkVoice(route, child, speaker);
  assert.notEqual(live(child, speaker).identity, rule.actual.vale.identity);
  await route.pin("pool-child", speaker);
  if (route.size.touch) await route.press(route.page.locator(".mode-exit"), "leave pool game");
  else await route.page.keyboard.press("Escape");
  const returned = await route.wait((f) => !f.scene.modeId && !f.scene.transition && f.actual.player.visible, "pool mode releases to deck");
  assert(returned.pinned["pool-child"].weight <= 0.001 && !["loading", "playing"].includes(returned.pinned["pool-child"].voice));
  route.row.pool = { chat: compact(lastVale), opening: compact(opening), rule: compact(rule), child: compact(child), returned: compact(returned) };
}

const core = new Map([
  ["s72-cafe", cafe], ["s69-local", local], ["s66-taxi", taxi], ["s67a-tickets", tickets], ["s73-restaurant", restaurant],
  ["x10-loteria", loteria], ["x13-por-donde", directions], ["street-i_dropped", street],
]);
const subcases = [
  ["s72-cafe", "missing", missing], ["s72-cafe", "interrupted", interrupted], ["s72-cafe", "reduced", reduced],
  ["s67a-tickets", "ticket-many", (route) => tickets(route, true)],
  ["x02-alux-kin", "kin", (route) => alux(route, "x02-alux-kin", "alux_kin", 0.2, -1.6)],
  ["x03-alux-nikte", "nikte", (route) => alux(route, "x03-alux-nikte", "alux_nikte", -6.2, -98.6)],
  ["x04-yaxche", "null-tree", tree], ["x05-tienda", "paco", paco], ["x09-alberca", "pool", pool],
  ["s72-cafe", "mic", mic],
];
const filmCases = [
  ["s72-cafe", null, cafe, ["voiced-open", "voiced-closed", "voiced-reopen", "gesture-peak", "listen-032", "listen-250", "puzzled", "understood", "replay"]],
  ["s66-taxi", null, taxi, ["approach-wave", "voiced-open", "voiced-closed", "voiced-reopen", "gesture-peak", "replay"]],
  ["s67a-tickets", null, tickets, ["object-glance", "object-return", "replay"]],
  ["s73-restaurant", null, restaurant, ["cast-last-host", "cast-first-server", "cast-1", "cast+1", "cast+5", "cast+12", "replay"]],
  ["x13-por-donde", null, directions, ["direction-left", "direction-landmark", "direction-straight", "gesture-peak", "replay", "sign-off"]],
  ["s72-cafe", "reduced", reduced, ["voiced-open", "voiced-closed", "voiced-reopen", "reduced-blink", "reduced-toggle", "replay"]],
  ["x10-loteria", null, loteria, ["stage-entry", "beto-call", "tona-response", "stage-wait", "stage-goodbye", "stage-exit"]],
];

const seedFor = (id) => id === "s72-cafe" ? cafeSeed : id === "s66-taxi" ? taxiSeed : id === "s73-restaurant" ? restaurantSeed : 19;

async function collectRoute(route) {
  const { row, page } = route;
  await route.pull();
  const pageData = await page.evaluate(() => ({
    requests: window.__naturalTest.requests, jsErrors: window.__naturalErrors,
    transcript: window.__ew.store.getState().conv.transcript,
    goal: document.querySelector(".directions-card")?.getAttribute("data-destination") ?? null,
  }));
  row.jsErrors.push(...pageData.jsErrors);
  row.transcript = pageData.transcript;
  row.directionsGoal = pageData.goal;
  const seen = new Set();
  row.requests = await Promise.all(pageData.requests.map(async (request) => {
    const id = `${request.run}/${request.actor}`;
    const opening = !seen.has(id);
    if (request.actor && !request.replay) seen.add(id);
    const intendedCue = request.actor && classifyTalk(request.text, request.zone, opening, request.step === "closing", !!request.replay);
    const source = request.key === route.omit ? null : await route.recordings.find(request.key);
    return { ...request, intendedCue, source, delivered: route.fulfilled.has(request.key), audible: route.playheads.get(request.id) ?? null };
  }));
  if (route.film && row.id !== "x13-por-donde") route.require("first-voiced");
  row.labels = route.labels;
  row.end = compact(route.last);
  const trace = route.frames.map((f) => ({ ...compact(f), voiceOwner: f.voiceOwner, reduced: f.reduced }));
  await json(path.join(route.out, row.trace), trace);
  // Keep spatial samples around transition, cue and listening windows with the partial trace as well.
  const selected = new Set(Object.values(route.labels).map((f) => f.frame));
  await json(path.join(route.out, row.joints), route.frames.filter((f, i) => selected.has(f.frame) || i % 12 === 0)
    .map((f) => ({ ...compact(f), actual: f.actual, probe: f.p, pinned: f.pinned })));

  row.utterances = row.requests.filter((r) => r.actor && !r.replay && r.duration != null)
    .map((r) => ({ actor: r.actor, line: r.lineKey, text: r.text, voice: r.voice, speed: r.speed, key: r.key, intendedCue: r.intendedCue,
      audible: r.audible, cue: route.frames.find((f) => f.request === r.id && f.p?.gestureWeight > 0.15)?.p.gesture ?? null }));
  for (const r of row.requests) {
    if (r.actor) {
      assert.match(r.voice, /^es_/, `Mexican Spanish voice for ${r.actor}`);
      if (r.knownActor && !["a", "yaxche"].includes(r.actor)) assert.equal(r.voice, `es_${r.actor}`, r.text);
    }
    if (r.delivered) {
      assert.equal(r.key, audioKey(r.voice, r.speed, r.recordedText));
      assert.equal(r.repair, r.source.repair, "live repair inventory");
      assert(row.audioUrls.some((event) => event.key === r.key && event.local === r.source.file
        && (!r.repair || new URL(event.url).searchParams.get("v") === r.repair)), "actual normal recording URL");
    }
    if (route.film && r.actor && (!r.optional || r.source?.file)) {
      assert(r.source?.file && r.delivered, `Missing Spanish film bytes for ${r.actor} ${r.key} · ${r.text}`);
      // The live preference and cast/close tests may deliberately cut a playing request.
      assert(r.audible || r.finished?.state === "interrupt", `No sampled audible playhead for ${r.actor} ${r.key}`);
    }
  }
  if (!row.subcase && !route.film) {
    const lines = new Set(row.utterances.filter((r) => r.audible).map(({ actor, line, key }) => `${actor}/${line}/${key}`));
    const directionsLines = new Set(route.frames.filter((f) => f.conv.lineKey?.startsWith("aw_") && f.conv.text).map((f) => f.conv.lineKey));
    assert(row.id === "x13-por-donde" ? directionsLines.size >= 3 : lines.size >= 2, "two or more actual NPC utterances through the real route");
  }
  if (route.subcase === "missing") {
    const missing = row.requests.find((r) => r.key === route.omit);
    assert(missing && !missing.source && !missing.audible && row.recoveries.some((r) => r.request === missing.id), "missing recording remains missing");
  }
  for (const label of row.requiredLabels) assert(row.labels[label], `Missing evidence label ${label}`);
  assert.deepEqual(row.jsErrors, [], "JavaScript and browser console errors");
  assert.deepEqual(row.blocked, [], "only loopback and local byte sources");
}

async function runRoute(browser, options, list, size, id, action, { subcase = null, film = false, labels = [] } = {}) {
  const slug = [size.label, id, subcase, film && "film"].filter(Boolean).join("-");
  const row = { id, size: size.label, input: size.touch ? "touch" : "keyboard/mouse",
    layer: options.config.learner, seed: seedFor(id), subcase, film,
    trace: `traces/${slug}.json`, joints: `traces/${slug}-joints.json`,
    actions: [], turns: [], exits: [], panels: [], peaks: [], geometry: [], audioUrls: [], recoveries: [],
    jsErrors: [], clipNotices: [], blocked: [], errors: [], requiredLabels: [...labels], requiredVoices: [], pass: false };
  list.push(row);
  let context, page, route;
  console.log(`START ${row.layer} ${slug}`);
  try {
    context = await openContext(browser, size, size.touch, options.config.url);
    page = await context.newPage();
    if (subcase === "reduced") await page.emulateMedia({ reducedMotion: "reduce" });
    route = new Route(page, context, row, { ...options, size, subcase, film, omit: subcase === "missing" ? fixtures.mia.key : null });
    await before(route.deadline, slug, async () => {
      await route.boot();
      await action(route);
      if (film && route.filmEntry) {
        const { painted, run } = route.filmEntry;
        route.checkpoints("entry", painted, [0, 3, 7, 12], route.frames.filter((f) => f.conv.run === run && !f.conv.intro));
      }
    });
  } catch (error) {
    row.errors.push(errorText(error));
  } finally {
    if (route && page) {
      try {
        await before(Date.now() + 45_000, `writing ${slug} evidence`, () => collectRoute(route));
      } catch (error) {
        row.errors.push(errorText(error));
      }
      if (route.capture) {
        await before(Date.now() + 60_000, `retaining ${slug} compositor evidence`, () => route.capture.finish(
          route.frames.map(compact), row.requests ?? [], route.labels, route.fulfilled,
        )).catch((error) => row.errors.push(errorText(error)));
      }
      if (row.errors.length) {
        row.failure = `traces/${slug}-failure.jpg`;
        await page.screenshot({ path: path.join(options.out, row.failure), type: "jpeg", scale: "css", timeout: 4000 })
          .catch((error) => { row.screenshotError = error.message; });
      }
    }
    await context?.close().catch((error) => row.errors.push(errorText(error)));
  }
  row.pass = row.errors.length === 0 && row.jsErrors.length === 0;
  console.log(`${row.pass ? "PASS" : "FAIL"} ${row.layer} ${slug}${row.errors.length ? ` · ${row.errors[0].split("\n")[0]}` : ""}`);
  await options.persist();
}

async function compareLayers(report, parent, out) {
  const peer = report.layer === "en" ? "lt" : "en";
  const other = path.join(parent, `talk-natural-pc-${peer}`);
  const folders = await readdir(other).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  let previous, previousFile;
  for (const folder of folders.sort().reverse()) {
    const file = path.join(other, folder, "results.json");
    const candidate = await readFile(file, "utf8").then(JSON.parse).catch((error) => {
      if (error.code === "ENOENT" || error instanceof SyntaxError) return null;
      throw error;
    });
    if (candidate?.revision !== report.revision || candidate.layer !== peer || candidate.rows?.length !== 16) continue;
    previous = candidate;
    previousFile = file;
    break;
  }
  const comparison = { peer, source: previousFile ?? null, status: "awaiting matching learner invocation", rows: [], issues: [] };
  if (previous) {
    const cases = new Map(previous.rows.map((row) => [`${row.size}/${row.id}`, row]));
    for (const row of report.rows) {
      const id = `${row.size}/${row.id}`, otherRow = cases.get(id), issues = [];
      try {
        assert(otherRow, "matching input and route are present");
        if (!row.pass || !otherRow.pass) issues.push("One or both routes failed their local assertions");
        assert.equal(row.seed, otherRow.seed);
        assert.notEqual(row.identity.lang, otherRow.identity.lang);
        assert.deepEqual(row.identity.targetLanguages, otherRow.identity.targetLanguages);
        const delivery = (r) => r.utterances.map(({ actor, line, text, voice, speed, key, intendedCue }) =>
          [actor, line, text, voice, speed, key, intendedCue]);
        assert.deepEqual(delivery(row), delivery(otherRow), "same authored Spanish, voice keys and mounted roles at the same seed");
        const helper = (r) => r.ui?.filter(([lang]) => lang === r.layer).map(([, text]) => text).filter(Boolean);
        assert(helper(row)?.length && helper(otherRow)?.length && JSON.stringify(helper(row)) !== JSON.stringify(helper(otherRow)),
          "learner gloss or interface changes with the layer");
        for (const [i, f] of row.peaks.entries()) {
          const p = otherRow.peaks[i];
          assert(p && f.actor === p.actor && f.cue === p.cue && f.line === p.line && Math.abs(f.relative - p.relative) < 0.40,
            `same intended cue and tolerant timing for ${f.cue}`);
          for (const joint of ["head", "body", "upperL", "upperR", "foreL", "foreR"]) {
            assert(distance(f.joints[joint], p.joints[joint]) < 0.35, `${f.actor} ${joint} comparable posed range`);
          }
        }
        if (row.gap) {
          assert.equal(row.gap.key, otherRow.gap?.key);
          assert(Math.abs(row.gap.closed.media.time - otherRow.gap.closed.media.time) < 0.13, "same measured internal pause");
        }
      } catch (error) {
        issues.push(error.message);
      }
      comparison.rows.push({ id, pass: !issues.length, issues });
    }
    comparison.status = comparison.rows.length === 16 && comparison.rows.every((row) => row.pass) ? "pass" : "fail";
  }
  await json(path.join(out, "layers.json"), comparison);
  return comparison;
}

async function main() {
  const { WORLD_STORAGE: storage, WORLD_LEARNER: layer, WORLD_TEST_URL: target } = process.env;
  assert.equal(storage, "puerto-colibri", "set WORLD_STORAGE=puerto-colibri");
  assert(["en", "lt"].includes(layer), "set WORLD_LEARNER=en or lt");
  assert(target, "set WORLD_TEST_URL to the local PC Vite server");
  const config = worldConfig();
  const args = new Set(process.argv.slice(2));
  assert([...args].every((arg) => ["--film", "--plain"].includes(arg)) && args.size <= 1,
    "Usage: node tests/browser/talk-natural.mjs [--film | --plain]");
  const film = !args.has("--plain");
  const parent = path.join(root, ".b6/audit");
  const home = path.join(parent, `talk-natural-pc-${layer}`);
  await mkdir(home, { recursive: true });
  const out = await mkdtemp(path.join(home, `${new Date().toISOString().replaceAll(":", "-")}-${film ? "film" : "plain"}-`));
  await mkdir(path.join(out, "traces"));
  const shots = process.env.WORLD_SHOTS ? path.resolve(process.env.WORLD_SHOTS) : null;
  const baseline = path.resolve(process.env.WORLD_FRAMING_BASELINE ?? path.join(parent, `before-natural-pc-${layer}`, "results.json"));
  const report = { pass: false, rc: null, storage, layer, edition: "es", targetLanguage: "es", url: config.url.href, out, film, shots, baseline,
    revision: null, module: null, started: new Date().toISOString(), budgets, sizes, rows: [], subcases: [], films: [], errors: [] };
  const persist = () => json(path.join(out, "results.json"), report);
  await persist();
  console.log(`PC ${layer} natural talk evidence · ${out}`);

  let browser, module;
  try {
    report.revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    report.workingTree = execFileSync("git", ["status", "--short"], { cwd: root, encoding: "utf8" }).trim();
    module = report.module = await localPlaywright(process.env.WORLD_PLAYWRIGHT_MODULE);
    process.env.WORLD_PLAYWRIGHT_MODULE = module;
    const recordings = await localRecordings();
    report.recordings = { roots: recordings.roots, manifest: recordings.manifestPath };
    const options = { config, out, shots, recordings, persist };
    browser = await launchBrowser(budgets.boot);
    for (const size of sizes) {
      for (const [id, action] of core) await runRoute(browser, options, report.rows, size, id, action);
      for (const [id, subcase, action] of subcases) {
        if (subcase === "mic" && !size.touch) continue;
        await runRoute(browser, options, report.subcases, size, id, action, { subcase });
      }
      if (film) {
        for (const [id, subcase, action, labels] of filmCases) {
          const windows = id === "x10-loteria" ? [] : [
            ...[8, 60, 150].map((n) => `choices+${n}`), "submit-1", "submit+4", "submit+10", "submit+18",
            ...[1, 4, 9, 15].map((n) => `close+${n}`),
          ];
          await runRoute(browser, options, report.films, size, id, action, {
            subcase, film, labels: ["entry", "entry+0", "entry+3", "entry+7", "entry+12", ...windows, ...labels],
          });
        }
      }
    }
  } catch (error) {
    report.errors.push(errorText(error));
  } finally {
    await browser?.close().catch((error) => report.errors.push(errorText(error)));
  }

  if (film) {
    await writeFilmIndex(out, report.films).catch((error) => report.errors.push(errorText(error)));
  }
  try {
    report.comparison = await compareLayers(report, parent, out);
    if (report.comparison.status === "fail") report.errors.push("Matching EN and LT route evidence differs. See layers.json.");
  } catch (error) {
    report.errors.push(errorText(error));
  }
  if (module) {
    try {
      console.log(`START PC ${layer} full framing audit · 55 × 4 + 8 skips`);
      report.framing = { pending: true, baseline };
      await persist();
      report.framing = await fullFramingAudit({ config, module, root, out, baseline, timeout: budgets.audit });
      if (!report.framing.pass) report.errors.push("Full PC framing comparison failed. See framing/comparison.json and framing/child.log.");
    } catch (error) {
      report.errors.push(errorText(error));
    }
  }

  const inventories = [[report.rows, 16], [report.subcases, 19], [report.films, film ? 14 : 0]];
  for (const [rows, expected] of inventories) {
    if (rows.length !== expected || new Set(rows.map((r) => `${r.size}/${r.id}/${r.subcase}`)).size !== expected) {
      report.errors.push(`Expected ${expected} unique rows, got ${rows.length}`);
    }
  }
  report.pass = !report.errors.length && report.framing?.pass === true
    && inventories.every(([rows]) => rows.every((row) => row.pass));
  report.rc = report.pass ? 0 : 1;
  report.finished = new Date().toISOString();
  process.exitCode = report.rc;
  await Promise.all([persist(), writeFile(path.join(out, "rc"), `${report.rc}\n`)]);
  console.log(`${report.pass ? "PASS" : "FAIL"} PC ${layer} · ${report.rows.filter((row) => row.pass).length}/16 core · ${out}`);
}

main().catch((error) => {
  console.error(errorText(error));
  process.exitCode = 1;
});
