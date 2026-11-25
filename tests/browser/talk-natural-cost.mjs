#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cpus, homedir, platform, release } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { audioKey } from "../../src/audio-key.ts";
import { INTRO_START, watchPageErrors } from "../../tools/talk-framing-browser.mjs";
import { localPlaywright } from "./talk-natural-framing.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const baselineRevision = "0fb147b880341182abe49281c95eeac11a2fa0e9";
// After four init rolls, seed 21 skips the small talk and selects the fourth greeting.
const scene = { id: "s72-cafe", zone: "sunny-cup", actor: "mia", name: "Mariana", step: "order", seed: 21 };
const voice = "es_mia";
const turns = [
  ["¿Qué es una concha?", "what_concha", "Es un pan dulce con azúcar encima, como una concha de mar."],
  ["¿Qué es el café de olla?", "what_olla", "Es café con canela, hecho en olla de barro."],
  ["¿Qué es la horchata?", "what_horchata", "Es una bebida fría de arroz con canela."],
  ["¿Qué es la jamaica?", "what_jamaica", "Es agua de flor de jamaica, fría y un poco ácida."],
  ["¿Qué es una torta?", "what_torta", "Es un sándwich mexicano: pan blanco con jamón."],
];
const line = (lineKey, ...variants) => ({ lineKey, variants: variants.map((spanish) => ({ spanish, key: audioKey(voice, 1, spanish) })) });
const orderPrompt = line("ask_order", "¿Qué le sirvo?", "¿Qué va a querer?", "Entonces, ¿qué le preparo?");
const voicePlan = [line("greet_order", "¡Hola! ¿Qué le sirvo hoy?"),
  ...turns.flatMap(([, key, spanish]) => [line(key, spanish), orderPrompt])];
const save = {
  version: 1, started: 1,
  profile: { name: "Mateo", surname: "Miller", gender: "m", lookId: "m1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", volume: 0.9, sounds: 0, cameraFollow: true,
    scenes: false, phoneCalls: false, textMessages: false, confirmSpeech: false, onDevice: false },
  sits: {}, phrases: {}, seenIntro: {}, coach: { done: true, run: true, view: true },
  place: { zone: "town", x: 0, z: 0, rot: 0 },
};
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  reducedMotion: "no-preference", serviceWorkers: "block",
  userAgent: "Mozilla/5.0 (Linux; Android 14; Pixel 7a) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36" };
const cpuRate = 4;
const args = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"];
const warmMs = 3000, listeningMs = 10500;
const columns = ["rafMs", "intervalMs", "updateRenderCpuMs", "renderCpuMs", "calls", "triangles",
  "passes", "targetBinds", "renderFrame", "playheadSeconds"];
const usage = "WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en|lt WORLD_PLAYWRIGHT_MODULE=/local/index.mjs "
  + "node tests/browser/talk-natural-cost.mjs --before LOOPBACK --after LOOPBACK --candidate-bundle BUNDLE_JSON --out FRESH_DIR";

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const saveJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

function loopback(value) {
  const url = new URL(value);
  assert(/^https?:$/.test(url.protocol) && /^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(url.hostname)
    && !url.username && !url.password && url.pathname === "/" && !url.search && !url.hash, "Use a root loopback URL");
  return url;
}

async function recordings() {
  const publicAudio = path.join(root, "public/audio-es");
  const manifest = await readJson(path.join(publicAudio, "manifest.json"));
  const repairs = await readJson(path.join(publicAudio, "repair-versions.json"));
  const directories = [publicAudio, process.env.WORLD_AUDIO_ROOT, path.join(homedir(), "puerto-colibri-voicing/audio-es")].filter(Boolean);
  const local = new Map();
  for (const { spanish, key } of voicePlan.flatMap(({ variants }) => variants)) {
    if (local.has(key)) continue;
    assert(manifest[key] > 0, `No existing Mexican Spanish recording for ${spanish}`);
    let match;
    for (const directory of directories) {
      const file = path.resolve(directory, key + ".mp3");
      const bytes = await readFile(file).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
      if (!bytes?.length) continue;
      const hash = sha256(bytes);
      const repair = repairs[key]?.slice(0, 12) ?? null;
      if (repair && !hash.startsWith(repair)) continue;
      match = { bytes, evidence: { file, hash, repair, bytes: bytes.length, duration: manifest[key] } };
      break;
    }
    assert(match, `Missing local MP3 for ${key} · ${spanish}`);
    local.set(key, match);
  }
  return local;
}

function serveAudio(route, { bytes }, origin) {
  const headers = { "access-control-allow-origin": origin, "accept-ranges": "bytes",
    "access-control-expose-headers": "content-range, accept-ranges", "cache-control": "no-store" };
  const range = route.request().headers().range;
  if (!range) return route.fulfill({ contentType: "audio/mpeg", headers, body: bytes });
  const match = /^bytes=(\d+)-(\d*)$/.exec(range);
  const first = match ? Number(match[1]) : bytes.length;
  const last = Math.min(match?.[2] ? Number(match[2]) : bytes.length - 1, bytes.length - 1);
  if (first > last) return route.fulfill({ status: 416, headers: { ...headers, "content-range": `bytes */${bytes.length}` } });
  headers["content-range"] = `bytes ${first}-${last}/${bytes.length}`;
  return route.fulfill({ status: 206, contentType: "audio/mpeg", headers, body: bytes.subarray(first, last + 1) });
}

function installRecorder({ scene, voice, voicePlan, listeningMs, stride }) {
  const { game, store, audio } = window.__ew;
  const { renderer } = game;
  if (typeof game.loop !== "function" || !renderer.info.autoReset || window.__step) throw new Error("Native Game render loop unavailable");
  const capacity = 8192;
  const buffers = Array.from({ length: voicePlan.length + 1 }, () => new Float64Array(capacity * stride));
  const counts = new Uint32Array(buffers.length);
  const requests = [];
  const render = renderer.render;
  const setTarget = renderer.setRenderTarget;
  const loop = game.loop;
  const play = audio.play;
  let armed = false, listening = false, listenRun, listenLine, listenEnd, listenReject;
  let first = 0, priorTime = 0, priorPlayhead = 0, priorSlot = -1, request, drawCpu = 0, passes = 0, targetBinds = 0;
  let dropped = 0, overflow = false, invalidScene = false, focusLost = false;
  let listened = 0;
  let expectedTurn = 0;

  const activeScene = (conv) => conv.active && !conv.introOpen && conv.run === listenRun
    && conv.sitId === scene.id && conv.npcId === scene.actor && game.talkNpc?.id === scene.actor
    && game.zone.id === scene.zone && game.rig.mode === "talk" && !game.covered && !game.transitioning;
  const onFocusLost = () => { if (armed) focusLost = true; };
  const onVisibility = () => { if (document.hidden) onFocusLost(); };
  addEventListener("blur", onFocusLost);
  document.addEventListener("visibilitychange", onVisibility);
  renderer.render = function (world, camera) {
    if (!armed) return render.call(this, world, camera);
    const started = performance.now();
    const result = render.call(this, world, camera);
    drawCpu += performance.now() - started;
    passes++;
    return result;
  };
  renderer.setRenderTarget = function (target, face, level) {
    if (armed && target != null) targetBinds++;
    return setTarget.call(this, target, face, level);
  };
  audio.play = function (who, speed, spanish, options) {
    const { conv } = store.getState();
    const promise = play.call(this, who, speed, spanish, options);
    if (conv.active && conv.sitId === scene.id && conv.speaking != null) {
      const line = conv.transcript.find(({ id }) => id === conv.speaking);
      const planned = voicePlan[expectedTurn];
      const fixture = planned?.lineKey === conv.lineKey && planned.variants.find((take) => take.spanish === spanish);
      const slot = fixture && who === voice && speed === 1 && line?.npc === scene.actor
        && line.sentence?.say === spanish && !options?.slow ? expectedTurn + 1 : 0;
      const item = { who, speed, spanish, key: fixture?.key, slot, line: line?.id, lineKey: conv.lineKey, run: conv.run,
        started: performance.now(), outcome: null };
      requests.push(item);
      request = item;
      if (slot) expectedTurn++;
      void promise.then((ok) => { item.outcome = ok; }, (error) => { item.outcome = String(error); });
    }
    return promise;
  };

  renderer.setAnimationLoop((time, xrFrame) => {
    if (!armed) { loop(time, xrFrame); return; }
    const prevSerial = renderer.info.render.frame;
    drawCpu = passes = targetBinds = 0;
    const started = performance.now();
    loop(time, xrFrame);
    const cpu = performance.now() - started;
    if (document.hidden || !document.hasFocus()) focusLost = true;
    const { conv, settings } = store.getState();
    const clip = audio.clip;
    const el = clip?.el;
    if (!activeScene(conv) || settings.quality !== "low" || renderer.getPixelRatio() !== 1 || audio.volume !== 0.9) invalidScene = true;
    let slot = -1, playhead = 0;
    if (listening) {
      if (conv.phase !== "you" || conv.stepId !== scene.step || conv.speaking != null
        || conv.transcript.at(-1)?.id !== listenLine || audio.getState() !== "idle" || invalidScene || focusLost) {
        listening = false;
        listenReject(new Error("Listening left its original silent, focused learner turn"));
      } else slot = 0;
    } else if (request?.slot > 1 && conv.phase === "npc" && conv.speaking === request.line && conv.run === request.run
      && clip?.key === request.key && !clip.done && audio.getState() === "playing") {
      if (el && !el.paused && !el.ended && el.readyState >= 3 && !el.muted && el.volume > 0 && el.playbackRate === 1) {
        request.pipeline = "html";
        playhead = el.currentTime;
      } else if (clip.position && audio.ctx?.state === "running") {
        request.pipeline = "buffer";
        playhead = clip.position();
      }
      if (playhead > 0) slot = request.slot;
    }
    if (slot === -1) { priorSlot = -1; return; }
    const { calls, triangles, frame } = renderer.info.render;
    if (!passes || frame === prevSerial || calls <= 0 || renderer.getRenderTarget() != null) {
      dropped++;
      priorSlot = -1;
      return;
    }
    if (slot !== priorSlot) first = time;
    const index = counts[slot];
    if (index === capacity) { overflow = true; return; }
    const data = buffers[slot], at = index * stride;
    data[at] = time;
    data[at + 1] = slot === priorSlot ? time - priorTime : 0;
    data[at + 2] = cpu;
    data[at + 3] = drawCpu;
    data[at + 4] = calls;
    data[at + 5] = triangles;
    data[at + 6] = passes;
    data[at + 7] = targetBinds;
    data[at + 8] = frame;
    data[at + 9] = playhead;
    counts[slot]++;
    if (slot === 0) listened += data[at + 1];
    // A source which stalls with a nonzero playhead must never certify a voiced interval.
    if (slot > 1 && slot === priorSlot && playhead < priorPlayhead) invalidScene = true;
    priorTime = time;
    priorPlayhead = playhead;
    priorSlot = slot;
    if (slot === 0 && time - first >= listeningMs) { listening = false; listenEnd(); }
  });

  window.__pcCost = {
    listen() {
      const { conv } = store.getState();
      listenRun = conv.run;
      listenLine = conv.transcript.at(-1)?.id;
      armed = listening = true;
      return new Promise((resolve, reject) => { listenEnd = resolve; listenReject = reject; });
    },
    stop() {
      armed = false;
      renderer.setAnimationLoop(loop);
      renderer.render = render;
      renderer.setRenderTarget = setTarget;
      audio.play = play;
      removeEventListener("blur", onFocusLost);
      document.removeEventListener("visibilitychange", onVisibility);
      return { dropped, overflow, invalidScene, focusLost, listened, requests,
        data: buffers.map((buffer, i) => Array.from(buffer.subarray(0, counts[i] * stride))) };
    },
  };
}

function sceneDetails() {
  const { game, store, audio } = window.__ew;
  const { conv, settings, progress } = store.getState();
  const { renderer } = game;
  const gl = renderer.getContext(), debug = gl.getExtension("WEBGL_debug_renderer_info");
  const lights = [];
  game.scene.traverseVisible((node) => {
    if (node.isLight) lights.push([node.type, node.intensity, node.color.getHex(), node.groundColor?.getHex() ?? null, node.castShadow]);
  });
  const member = game.talkNpc;
  return {
    id: conv.sitId, actor: member?.id, name: member?.tag?.querySelector("b")?.textContent.trim() ?? member?.name,
    step: conv.stepId, zone: game.zone.id, interior: !!game.zone.interior, mode: game.rig.mode, covered: game.covered,
    cast: game.talkCast.map(({ id }) => id), extras: game.extras.map((actor) => ({
      busy: actor.busy, anim: actor.anim, at: actor.root.position.toArray(),
    })),
    counterApproach: member?.approach?.toArray(),
    appearance: progress.profile, quality: settings.quality, volume: audio.volume, sounds: settings.sounds,
    lights, shadows: renderer.shadowMap.enabled, pixelRatio: renderer.getPixelRatio(),
    dimensions: [innerWidth, innerHeight, renderer.domElement.width, renderer.domElement.height],
    dpr: devicePixelRatio, touches: navigator.maxTouchPoints, coarse: matchMedia("(pointer: coarse)").matches,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    browserUA: navigator.userAgent, renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
    glVersion: gl.getParameter(gl.VERSION), contextAttributes: gl.getContextAttributes(),
    hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory ?? null,
  };
}

async function record(browser, label, url, local, layer, bundle, evidence) {
  const context = await browser.newContext(phone);
  const supplied = new Set();
  let page, recorder;
  try {
    let stage = "startup";
    await context.route("**/*", (route) => {
      const wanted = new URL(route.request().url());
      const key = /\/([0-9a-f]{12})\.mp3$/i.exec(wanted.pathname)?.[1];
      if (key && local.has(key)) { supplied.add(key); return serveAudio(route, local.get(key), url.origin); }
      if (/\.mp3$/i.test(wanted.pathname)) return route.fulfill({ status: 404, body: "", headers: { "access-control-allow-origin": url.origin } });
      if (wanted.origin === url.origin) return route.continue();
      evidence.blocked.push(wanted.href);
      return route.abort();
    });
    await context.routeWebSocket("**/*", (socket) => socket.close());
    context.on("request", (request) => {
      const file = new URL(request.url()).pathname.slice(1);
      if (/\.m?js$/.test(file)) evidence.scripts.push({ stage, file });
    });
    page = await context.newPage();
    await page.bringToFront();
    page.setDefaultTimeout(12000);
    const jsErrors = watchPageErrors(page);
    evidence.pageErrors = jsErrors;
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuRate });
    await page.addInitScript(({ key, save }) => {
      sessionStorage.setItem("ew-play-now", "1");
      localStorage.setItem(key, JSON.stringify(save));
      localStorage.setItem(key.replace("-progress-v1", "-variety"), "default");
      Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
      window.SpeechRecognition = window.webkitSpeechRecognition = undefined;
    }, { key: "puerto-colibri-progress-v1", save });
    const navigation = await page.goto(url.href, { waitUntil: "domcontentloaded", timeout: 60000 });
    assert(navigation?.ok() && page.url() === url.href, "Expected local HTML with no redirect");
    const identity = await page.evaluate(() => ({
      lang: document.documentElement.lang, title: document.title,
      modules: Array.from(document.querySelectorAll("script[type=module][src]"), (script) => new URL(script.src).pathname),
    }));
    evidence.identity = identity;
    assert.deepEqual([identity.lang, identity.title, identity.modules.length], [layer, "Puerto Colibrí", 1]);
    assert.match(identity.modules[0], /^\/assets\/index-[\w-]+\.js$/, "Use a production build on each loopback URL");
    const entry = await context.request.get(new URL(identity.modules[0], url).href, { maxRedirects: 0 });
    assert(entry.ok(), "HTML-selected script could not be read");
    const bytes = await entry.body();
    evidence.entry = { file: identity.modules[0].slice(1), hash: sha256(bytes), bytes: bytes.length };
    await entry.dispose();
    if (label === "after") {
      assert.deepEqual(evidence.entry, { file: bundle.entry.file, hash: bundle.entry.sha256, bytes: bundle.entry.bytes });
    } else {
      assert.equal(bytes.length, layer === "en" ? 1037876 : 1104414, "Installed framing entry bytes");
    }

    await page.waitForFunction(() => {
      const w = window.__ew;
      return w?.store.getState().screen === "play" && w.game.renderer.info.render.frame > 0 && !w.game.transitioning;
    }, null, { timeout: 90000 });
    const town = await page.evaluate(() => {
      const { game, store } = window.__ew;
      store.getState().setHud({ panel: null });
      const languages = [...new Set(game.npcs.map(({ tag }) => tag.querySelector("b + span[lang]")?.lang).filter(Boolean))];
      return { languages, zone: game.zone.id, play: store.getState().settings.play, focused: document.hasFocus() };
    });
    assert.deepEqual(town, { languages: ["es"], zone: "town", play: "town", focused: true });
    stage = "walking";
    const origin = await page.evaluate(() => {
      const game = window.__ew.game;
      game.setJoystick(0, -1);
      return game.player.root.position.toArray();
    });
    try {
      const moved = await page.waitForFunction(([x, , z]) => {
        const game = window.__ew.game, pos = game.player.root.position;
        return game.zone.id === "town" && Math.hypot(pos.x - x, pos.z - z) > 0.8;
      }, origin);
      await moved.dispose();
    } finally { await page.evaluate(() => window.__ew.game.setJoystick(0, 0)); }
    await page.waitForTimeout(1000);
    evidence.walked = true;
    stage = "actor-talk";
    await page.evaluate(({ id, seed }) => {
      const realNow = Date.now;
      const period = 2 ** 32;
      const seeded = Math.floor(realNow() / period) * period + seed;
      Date.now = () => window.__ew.game.conversationLoads ? seeded : realNow();
      window.__restoreCostDate = () => { Date.now = realNow; delete window.__restoreCostDate; };
      window.__ew.game.startScenario(id);
    }, scene);
    const start = page.locator(".scene-intro, .intro-card").getByRole("button", { name: INTRO_START });
    await start.waitFor({ state: "visible" });
    assert.match((await start.innerText()).trim(), layer === "lt" ? /^Pradėti/i : /^Start/i);
    await page.evaluate(() => window.__restoreCostDate());
    await page.waitForTimeout(warmMs);
    await page.evaluate(installRecorder, { scene, voice, voicePlan, listeningMs, stride: columns.length });
    recorder = true;
    await start.tap();
    const waiting = () => page.waitForFunction(() => {
      const { conv } = window.__ew.store.getState();
      return conv.active && conv.sitId === "s72-cafe" && conv.phase === "you" && !conv.introOpen;
    });
    await (await waiting()).dispose();
    await page.waitForTimeout(warmMs);
    evidence.scene = await page.evaluate(sceneDetails);
    assert.deepEqual([evidence.scene.id, evidence.scene.zone, evidence.scene.actor, evidence.scene.name, evidence.scene.step,
      evidence.scene.interior, evidence.scene.mode, evidence.scene.covered],
    [scene.id, scene.zone, scene.actor, scene.name, scene.step, true, "talk", false]);
    assert.deepEqual([evidence.scene.quality, evidence.scene.volume, evidence.scene.sounds, evidence.scene.pixelRatio,
      evidence.scene.dpr, evidence.scene.coarse, evidence.scene.reducedMotion], ["low", 0.9, 0, 1, 3, true, false]);
    assert.deepEqual(evidence.scene.dimensions, [390, 844, 390, 844]);
    assert(evidence.scene.cast.includes(scene.actor) && evidence.scene.extras.length === 5
      && evidence.scene.counterApproach?.length === 3 && !evidence.scene.shadows, "Matched low-quality counter staging");
    let timeout;
    try {
      await Promise.race([page.evaluate(() => window.__pcCost.listen()),
        new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error("Listening sample timed out")), 30000); })]);
    } finally { clearTimeout(timeout); }
    for (const [answer] of turns) {
      const input = page.locator(".typebox input");
      if (!await input.isVisible()) await page.locator(".type-toggle").tap();
      await input.fill(answer);
      await page.locator(".typebox button[type=submit]").tap();
      // The answer ID proves the next learner phase followed this submission.
      const result = await page.evaluate((answer) => new Promise((resolve, reject) => {
        const { store } = window.__ew;
        const timer = setTimeout(() => {
          off();
          const { phase, stepId, lineKey } = store.getState().conv;
          reject(new Error(`No completed reply for ${answer} (${phase}, ${stepId}, ${lineKey})`));
        }, 12000);
        function accept({ conv }) {
          if (conv.phase !== "you" || conv.lastHeard !== answer) return;
          const last = conv.transcript.findLast((line) => line.who === "you");
          if (last?.via !== "typed") return;
          clearTimeout(timer);
          off();
          resolve({ step: conv.stepId, understood: last.understood, displayed: last.text });
        }
        const off = store.subscribe(accept);
        accept(store.getState());
      }), answer);
      evidence.answers.push({ answer, ...result });
      assert.equal(result.step, scene.step);
      assert.equal(result.understood, true);
    }
    if (label === "after") {
      const acting = new Set(bundle.acting.map(({ file }) => file));
      assert(!evidence.scripts.some(({ stage, file }) => stage !== "actor-talk" && acting.has(file)),
        "Acting JS requested before the café");
      assert(evidence.scripts.some(({ stage, file }) => stage === "actor-talk" && file === bundle.acting[0].file),
        "Candidate session mixer was not requested on the café route");
    }
    assert.deepEqual(jsErrors, [], "Unexpected browser errors");
    assert.deepEqual(evidence.blocked, [], "Unexpected external requests");
  } finally {
    evidence.delivered = [...supplied];
    try {
      if (recorder) evidence.samples = await page.evaluate(() => window.__pcCost.stop());
    } finally { await context.close(); }
  }
}

const quantile = (values, q) => {
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q, low = Math.floor(pos), high = Math.ceil(pos);
  return sorted[low] + (sorted[high] - sorted[low]) * (pos - low);
};
const metric = (values) => ({ count: values.length, median: quantile(values, 0.5), p95: quantile(values, 0.95),
  min: Math.min(...values), max: Math.max(...values) });
function phaseStats(flat) {
  const rows = [];
  for (let i = 0; i < flat.length; i += columns.length) rows.push(flat.slice(i, i + columns.length));
  assert(rows.length >= 8, "Fewer than eight rendered frames");
  const intervals = rows.map((r) => r[1]).filter((x) => x > 0);
  assert.equal(intervals.length, rows.length - 1, "The phase lost its continuous displayed render series");
  assert(rows.every((r, i) => r.every(Number.isFinite) && r[4] > 0 && r[5] > 0
    && r[6] === 1 && r[7] === 0 && (!i || r[8] === rows[i - 1][8] + 1)),
  "Expected a single onscreen render per native frame and zero offscreen binds");
  return { rows, durationMs: intervals.reduce((a, b) => a + b, 0),
    mediaMs: 1000 * (rows.at(-1)[9] - rows[0][9]),
    calls: metric(rows.map((r) => r[4])), triangles: metric(rows.map((r) => r[5])) };
}

function costStats(rows) {
  return {
    interval: metric(rows.map((r) => r[1]).filter((x) => x > 0)),
    updateRenderCpu: metric(rows.map((r) => r[2])),
    renderCpu: metric(rows.map((r) => r[3])),
  };
}

function summarize(evidence, local) {
  const { dropped, overflow, invalidScene, focusLost, data, requests } = evidence.samples;
  assert(!dropped && !overflow && !invalidScene && !focusLost, "Lost focused 3D samples");
  assert.deepEqual(requests.map(({ slot, outcome }) => [slot, outcome]), voicePlan.map((_, i) => [i + 1, true]),
    "Every authored NPC request must complete in the fixture sequence");
  for (const { key } of requests) assert(evidence.delivered.includes(key), `No local byte delivery for ${key}`);
  const waiting = phaseStats(data[0]);
  const { rows, ...waitStats } = waiting;
  evidence.listening = { ...waitStats, ...costStats(rows) };
  assert(waiting.durationMs >= listeningMs && waiting.mediaMs === 0, "Need at least 10.5 s in the same silent learner turn");
  const combined = [];
  let durationMs = 0, mediaMs = 0;
  evidence.voicedTurns = [];
  for (const request of requests.slice(1)) {
    const section = phaseStats(data[request.slot]);
    const { rows, ...stats } = section;
    const expectedMs = local.get(request.key).evidence.duration * 1000;
    assert(["html", "buffer"].includes(request.pipeline) && section.mediaMs >= expectedMs * 0.80
      && Math.abs(section.mediaMs - section.durationMs) <= Math.max(220, section.durationMs * 0.15),
    `Incomplete advancing native playhead for ${request.key}`);
    durationMs += section.durationMs;
    mediaMs += section.mediaMs;
    combined.push(...rows);
    evidence.voicedTurns.push({ ...request, ...stats, ...costStats(rows) });
  }
  evidence.voiced = { durationMs, mediaMs, ...costStats(combined) };
  assert(durationMs >= 10000 && mediaMs >= 10000, "Need at least 10 s of matched wall time and advancing Spanish audio");
}

function comparable(pair) {
  const { before, after } = pair;
  assert.deepEqual(before.scene, after.scene, "Scene, cast, appearance, renderer or phone settings differ");
  assert.deepEqual(before.answers, after.answers, "Learner answers or answer order differ");
  const identity = ({ who, speed, spanish, key, lineKey, pipeline }) => [who, speed, spanish, key, lineKey, pipeline];
  assert.deepEqual(before.voicedTurns.map(identity), after.voicedTurns.map(identity), "Voiced turns or playback pipelines differ");
  return [before.listening, ...before.voicedTurns].flatMap((phase, index) => {
    const next = [after.listening, ...after.voicedTurns][index];
    return ["calls", "triangles"].flatMap((field) => next[field].max > phase[field].max
      ? [`${index ? next.key : "listening"} ${field} peak ${phase[field].max} → ${next[field].max}`] : []);
  });
}

function compareTiming(pairs) {
  const metrics = [];
  for (const phase of ["listening", "voiced"]) {
    for (const key of ["interval", "updateRenderCpu", "renderCpu"]) {
      for (const percentile of ["median", "p95"]) {
        const before = pairs.map((p) => p.before[phase][key][percentile]);
        const after = pairs.map((p) => p.after[phase][key][percentile]);
        const delta = after.map((v, i) => v - before[i]);
        const baselineSpread = Math.max(...before) - Math.min(...before);
        const candidateSpread = Math.max(...after) - Math.min(...after);
        const resolution = key === "interval" ? 0.5 : 0.25;
        const bound = Math.max(baselineSpread, resolution);
        const noiseLimit = Math.max(key === "interval" ? 2 : 1, quantile(before, 0.5) * 0.2);
        const persistent = delta.every((ms) => ms > bound);
        const noisy = Math.max(baselineSpread, candidateSpread) > noiseLimit
          || Math.max(...delta) > bound && Math.min(...delta) <= bound;
        metrics.push({ phase, key, percentile, before, after, delta, baselineSpread, candidateSpread, bound, noiseLimit, persistent, noisy });
      }
    }
  }
  return metrics;
}

async function main() {
  const { values } = parseArgs({ options: {
    before: { type: "string" }, after: { type: "string" }, "candidate-bundle": { type: "string" }, out: { type: "string" },
  } });
  const layer = process.env.WORLD_LEARNER;
  assert(process.env.WORLD_STORAGE === "puerto-colibri" && ["en", "lt"].includes(layer)
    && values.before && values.after && values["candidate-bundle"] && values.out, usage);
  const urls = { before: loopback(values.before), after: loopback(values.after) };
  assert.notEqual(urls.before.origin, urls.after.origin, "Use distinct local production builds");
  const out = path.resolve(values.out);
  await mkdir(out);
  const channel = process.env.WORLD_BROWSER_CHANNEL || "chromium";
  const report = {
    layer, urls, baselineRevision, profile: phone, cpuRate, channel, args, scene, save, warmMs, listeningMs, columns, turns, voicePlan,
    requestedModule: process.env.WORLD_PLAYWRIGHT_REQUESTED_MODULE ?? process.env.WORLD_PLAYWRIGHT_MODULE ?? null,
    timeBasis: "Native RAF timestamp of the Game canvas render submission and sync performance.now() around Game.loop and renderer.render",
    frameCap: "Native Chromium RAF, no checker or app frame limiter in this route",
    host: { platform: platform(), release: release(), cpu: cpus()[0]?.model, logicalCores: cpus().length },
    pairs: [], errors: [], verdict: "UNVERIFIED",
  };
  let browser;
  try {
    const bundle = await readJson(path.resolve(values["candidate-bundle"]));
    assert.equal(bundle.layer, layer);
    assert(/^[0-9a-f]{40}$/.test(bundle.revision) && bundle.revision !== baselineRevision);
    assert(bundle.acting.length === 3 && bundle.checks.actingLazy);
    report.candidateRevision = bundle.revision;
    const local = await recordings();
    report.recordings = Object.fromEntries([...local].map(([key, { evidence }]) => [key, evidence]));
    report.module = await localPlaywright(process.env.WORLD_PLAYWRIGHT_MODULE);
    const { chromium } = await import(report.module);
    browser = await chromium.launch({ channel, headless: true, args, timeout: 60000 });
    report.browserVersion = browser.version();
    for (let index = 0; index < 3; index++) {
      const order = index % 2 ? ["after", "before"] : ["before", "after"];
      const pair = { number: index + 1, order, errors: [], budgetIncreases: [] };
      report.pairs.push(pair);
      for (const label of order) {
        const evidence = { scripts: [], answers: [], blocked: [] };
        pair[label] = evidence;
        try {
          console.log(`${layer} pair ${pair.number} ${label}`);
          await record(browser, label, urls[label], local, layer, bundle, evidence);
          summarize(evidence, local);
        } catch (error) {
          pair.errors.push(`${label}: ${error.stack ?? error}`);
        } finally {
          await saveJson(path.join(out, `pair-${pair.number}-${label}.json`), evidence);
          delete evidence.samples?.data;
        }
      }
      if (pair.errors.length === 0) {
        try { pair.budgetIncreases = comparable(pair); }
        catch (error) { pair.errors.push(error.message); }
      }
      console.log(`${layer} pair ${pair.number}: ${pair.errors.length ? "UNVERIFIED" : pair.budgetIncreases.length ? "DRAW BUDGET INCREASE" : "comparable"}`);
    }
    if (report.pairs.every((pair) => !pair.errors.length)) {
      report.metrics = compareTiming(report.pairs);
      if (report.pairs.some((pair) => pair.budgetIncreases.length) || report.metrics.some((m) => m.persistent)) {
        report.verdict = "INVESTIGATE";
      } else if (!report.metrics.some((m) => m.noisy)) report.verdict = "PASS";
    }
  } catch (error) {
    report.errors.push(error.stack ?? String(error));
  } finally {
    if (browser) await browser.close().catch((error) => report.errors.push(error.message));
    if (report.errors.length) report.verdict = "UNVERIFIED";
    const rc = report.verdict === "PASS" ? 0 : 1;
    await saveJson(path.join(out, "summary.json"), report);
    await writeFile(path.join(out, "rc"), `${rc}\n`);
    console.log(`${layer} phone active-turn cost: ${report.verdict} · ${path.join(out, "summary.json")}`);
    process.exitCode = rc;
  }
}

main().catch((error) => {
  console.error(error.stack ?? error);
  process.exitCode = 1;
});
