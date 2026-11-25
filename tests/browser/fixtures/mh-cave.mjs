import assert from "node:assert/strict";
import { basename, dirname, join } from "node:path";
import { performance } from "node:perf_hooks";
import { setTimeout as wall } from "node:timers/promises";
import { tsImport } from "tsx/esm/api";
import { openPhoneMenu } from "../screen-harness.mjs";

const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:8310");
assert(["http:", "https:"].includes(base.protocol) && ["127.0.0.1", "localhost", "[::1]"].includes(base.hostname),
  "WORLD_TEST_URL must be local");
const storage = process.env.WORLD_STORAGE || "english-world";
assert(["english-world", "puerto-colibri"].includes(storage), `Unknown WORLD_STORAGE: ${storage}`);
const pc = storage === "puerto-colibri";
const learner = process.env.WORLD_LEARNER || (pc ? "en" : "lt");
assert(pc ? ["en", "lt"].includes(learner) : learner === "lt", `Wrong WORLD_LEARNER for ${storage}`);
assert(!process.env.VITE_EDITION || process.env.VITE_EDITION === (pc ? "es" : "en"), "VITE_EDITION disagrees with WORLD_STORAGE");
if (pc) {
  assert(!process.env.VITE_LEARNER || process.env.VITE_LEARNER === learner, "VITE_LEARNER disagrees with WORLD_LEARNER");
  process.env.VITE_LEARNER = learner;
}
const shots = process.argv.find((arg) => arg.startsWith("--shots="))?.slice(8) || process.env.WORLD_SHOTS;
// The chain's sheet takes the first named images by path for each viewport.
const highlights = new Set([
  "tide-hidden", "tide-reveal-ipa", "oak-projection", "oak-end", "fern-mid-hop", "stair-landing",
  "tide-hall", "root-garden", "hidden-river", "star-hall", "oak-heart", "ring-lawn", "dry-guide-dots",
]);

const source = (file) => tsImport(`../../../src/${file}`, import.meta.url);
export const { audioKey } = await source("audio-key.ts");
export const { cardKey } = await source("state/cards.ts");
const { CAVE_STONE_HINTS } = await source("content/cave-stones.ts");
const { compose } = await source("convo/compose.ts");
export const lines = new Map(Object.values(CAVE_STONE_HINTS).flatMap(({ items }) => items.map(({ id, s }) => {
  const sentence = compose(s, {}, { look: () => undefined });
  return [id, { en: sentence.en, lt: sentence.nat, say: sentence.say }];
})));
const meanings = new Set([...lines.values()].map(({ lt }) => lt));
export const TIDE = ["tide-1", "tide-2", "tide-3"];
export const STONES = ["tide", "root", "river", "star", "oak"].flatMap((room) => [1, 2, 3].map((n) => `${room}-${n}`));
export const START = { zone: "town", x: -101, z: -55, rot: -Math.PI / 2 };
export const DEVICES = [[390, 844], [1280, 800]];
export const CAVE = ["Slate Cove Cave", "Skalūnų įlankos ola"];
export const RING = ["Old Stone Ring", "Senasis akmenų ratas"];
export const BRAM = { id: "x06-bram", npc: "cave_bram", name: "Bram", title: ["Bram on the gray path", "Bramas ant pilkojo tako"] };
export const FERN = { id: "x07-fern", npc: "cave_fern", name: "Fern", title: ["Fern on the bridge", "Ferna ant tilto"] };
export const OAK = { id: "x08-old-oak", npc: "cave_oak", name: "The Old Oak", title: ["The Old Oak", "Senasis ąžuolas"] };
export const TIDE_LINE = ["The tide remembers your name.", "Potvynis mena Jūsų vardą."];
export const KEEP = ["Keep one word close. Let it grow.", "Pasilikite vieną žodį širdyje. Leiskite jam augti."];
export const BACK = ["Come back. The stones have more to say.", "Sugrįžkite. Akmenys dar turi ką pasakyti."];
export const DOORS = {
  main: { prompt: "Cave entrance", at: [-135, -63], out: [-131.8, -63], rot: -Math.PI / 2, spawn: [0, 2.2], exit: [0, 6.4], reach: 2.6, exitRot: 0 },
  cleft: { prompt: "Slate cleft", at: [-121, -65], out: [-121, -61.8], rot: Math.PI, spawn: [1.2, -0.7], exit: [9.2, -2.2], reach: 2.4, exitRot: Math.atan2(1, -0.25) },
};

const progress = {
  version: 1,
  profile: { name: "Test", surname: "Tester", gender: "m", lookId: "m1",
    look: { skin: "#f2d3bd", hair: { style: "short", color: "#5a3a25" }, top: "#2a9d8f", bottom: "#264653" } },
  settings: { v: 6, play: "town", quality: "low", scenes: false, volume: 0.8, sounds: 0, phoneCalls: false,
    cameraFollow: true, textMessages: false, lt: true, ltNatural: true, ipa: false, sayLt: true },
  sits: {}, phrases: {}, seenIntro: {}, started: 1, place: START, objective: "s69-local",
  coach: { done: true, run: true, view: true, seen: { list: true, talk: true, walk: true } },
};

function installClock([key, save]) {
  sessionStorage.setItem("ew-play-now", "1");
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(save));
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: undefined });
  window.__caveWallNow = performance.now.bind(performance);
  let now = 1000, next = 0, seed = 20261122;
  const frames = new Map();
  performance.now = () => now;
  Math.random = () => (seed = (Math.imul(1664525, seed) + 1013904223) >>> 0) / 4294967296;
  window.requestAnimationFrame = (fn) => { frames.set(++next, fn); return next; };
  window.cancelAnimationFrame = (id) => frames.delete(id);
  window.__step = (n, dt = 50) => {
    for (let i = 0; i < n; i++) {
      now += dt;
      for (const id of [...frames.keys()]) {
        const fn = frames.get(id);
        frames.delete(id);
        fn?.(now);
      }
    }
  };
}

// Local in-memory PCM responses. These exist only behind the test route.
function silence(seconds) {
  const samples = seconds * 8000, b = Buffer.alloc(44 + samples * 2);
  b.write("RIFF", 0); b.writeUInt32LE(b.length - 8, 4); b.write("WAVEfmt ", 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(b.length - 44, 40);
  return b;
}
const wav = new Map([[0.25, silence(0.25)], [1.2, silence(1.2)]]);
const clips = Object.fromEntries([
  ...[...lines.values()].flatMap(({ say }) => ["g_coach_f", "g_coach_m"].map((voice) => [audioKey(voice, 1, say), 1.2])),
  ...[KEEP, BACK, ["I heard you coming."], ["Who's there on the path?"], ["Two riddles, then you can cross. Ready?"],
    ["Look under an oak in the fall."]].map(([line], i) => [audioKey(i < 3 ? "g_cave_oak" : i === 3 ? "g_cave_bram" : "g_cave_fern", 1, line), 0.25]),
]);

function observe() {
  const { audio, store, game } = window.__ew;
  const watch = window.__caveWatch = { calls: [], hush: [], toasts: {}, masks: [], hearts: 0, trees: 0, events: [], solvedAt: 0 };
  // (light mode's window.__ew has the game and the store only: its recordings cannot be watched from here)
  if (audio) {
  const play = audio.play;
  audio.play = function (voice, speed, text, options) {
    const g = store.getState().hud.glyph;
    const call = { voice, speed, text, at: window.__caveWallNow(), end: null, result: null, aborted: false,
      glyph: g?.text === text ? g.id : null, solved: !!g?.solved };
    watch.calls.push(call);
    options?.signal?.addEventListener("abort", () => { call.aborted = true; }, { once: true });
    return play.call(this, voice, speed, text, options).then((result) => {
      Object.assign(call, { end: window.__caveWallNow(), result });
      return result;
    });
  };
  const onEvent = game.onSessionEvent;
  game.onSessionEvent = function (name, data) {
    if (name === "tree-heard" || name === "cave-pass") watch.events.push([name, data?.gate ?? null]);
    return onEvent.call(this, name, data);
  };
  const hush = audio.hush;
  audio.hush = function (...args) {
    if (args[0] === "cave-reader") watch.hush.push(args[1]);
    return hush.apply(this, args);
  };
  }
  store.subscribe((st, before) => {
    if (st.hud.glyph?.solved && !before.hud.glyph?.solved) watch.solvedAt = window.__caveWallNow();
    if (st.hud.minimap.gates !== before.hud.minimap.gates) watch.masks.push(st.hud.minimap.gates);
    if (st.progress.cave?.heart && !before.progress.cave?.heart) watch.hearts++;
    if (st.progress.cave?.tree && !before.progress.cave?.tree) watch.trees++;
    for (const toast of [...st.toasts, ...st.townToasts.map(({ toast }) => toast)]) {
      const ids = watch.toasts[toast.title] ??= [];
      if (!ids.includes(toast.id)) ids.push(toast.id);
    }
  });
}

function readState() {
  const g = window.__ew?.game, st = window.__ew?.store.getState(), p = g?.player?.root.position;
  return { screen: st?.screen, url: location.href, zone: g?.zoneId, x: p?.x, y: p?.y, z: p?.z, swim: g?.swimming, t: g?.t,
    prompt: st?.hud.prompt ?? null, nearest: g?.nearest?.id, mask: g?.cave?.mask ?? null, target: g?.zone && p ? g.objectiveTarget() : null,
    auto: g?.autoTarget, path: g?.autoPath?.length ?? 0, fade: st?.hud.fade, panel: st?.hud.panel,
    phase: st?.conv.phase ?? null, talk: st?.conv.active ? st.conv.sitId : null, card: st?.hud.cave ?? null, glyph: st?.hud.glyph?.id,
    cave: st?.progress.cave, savedPlace: st?.progress.place, visits: st?.progress.play?.games?.["slate-cove-cave"] ?? 0,
    course: g?.currentObjective?.()?.id, calls: g?.renderer?.info.render.calls };
}

export async function suite(script, scenarios) {
  assert(!pc, `${script} needs the Maple Harbor server and storage. PC keeps its original browser scripts.`);
  const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
  const browser = await chromium.launch({
    channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
    args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"],
  });
  let failed = false;
  try { await scenarios((device, name, options, test) => withGame(browser, script, device, name, options, test)); }
  catch (error) { failed = true; throw error; }
  finally { await close(browser, failed); }
}

async function close(resource, failed) {
  try { await resource.close(); }
  catch (error) {
    if (!failed) throw error;
    console.warn("MH cave cleanup failed", error);
  }
}

async function withGame(browser, script, [width, height], scenario, options, test) {
  const phone = width < 900;
  const context = await browser.newContext({
    viewport: { width, height }, serviceWorkers: "block", reducedMotion: "reduce",
    ...(phone && { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }),
    ...(options.userAgent && { userAgent: options.userAgent }),
  });
  const label = `${script}-${width}x${height}-${scenario}`;
  const errors = [], requests = [];
  const gender = options.save?.profile?.gender ?? progress.profile.gender;
  const missing = options.media === "listed-missing" ? audioKey(`g_coach_${gender}`, 1, TIDE_LINE[0]) : null;
  let page, lastState, lastMark;
  let failed = false;
  let captureFrames = false;

  async function capture(name) {
    if (!shots) return;
    const folder = highlights.has(name) || /-approach-v\d+$/.test(name) ? "highlights" : "";
    const path = join(shots, folder, `${label}-${name}.png`);
    try {
      await page.screenshot({ path, type: "png", timeout: 3_000 });
      console.log(`shot=${path}`);
    } catch (error) {
      console.warn(`${label}: could not capture ${name}`, error);
    }
  }

  try {
    page = await context.newPage();
    page.setDefaultTimeout(15_000);
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      const { url } = message.location();
      if (missing && url.split("?")[0].endsWith(`/${missing}.mp3`) &&
        message.text() === "Failed to load resource: the server responded with a status of 404 (Not Found)") return;
      errors.push(`${message.text()} (${url})`);
    });
    if (page.__mark && process.env.SHOTS_OUT) {
      // The chain wrapper resets each JPEG sequence on newPage. Keep each scenario's sequence.
      const screenshot = page.screenshot.bind(page);
      page.screenshot = async (options = {}) => {
        if (options.type !== "jpeg" || !options.path) return screenshot(options);
        if (!captureFrames) return;
        const path = join(dirname(options.path), label, basename(options.path));
        return screenshot({ ...options, path, timeout: 3_000 });
      };
    }
    await context.route("**/*", async (route) => {
      const request = route.request(), url = new URL(request.url());
      const match = url.pathname.match(/\/([\da-f]{12})\.mp3$/i);
      const headers = { "access-control-allow-origin": "*", "cache-control": "no-store" };
      if (match) {
        const key = match[1], duration = clips[key];
        requests.push({ key, path: url.pathname, duration: duration ?? null });
        if (key === missing) return route.fulfill({ status: 404, headers });
        if (duration) return route.fulfill({ contentType: "audio/wav", headers, body: wav.get(duration) });
      }
      if (/\/audio-v2\/manifest\.json$/.test(url.pathname)) {
        requests.push({ manifest: options.media || "recorded" });
        if (options.media === "no-manifest") return route.fulfill({ status: 200, body: "", headers });
        return route.fulfill({ json: clips, headers });
      }
      if (/\/audio-v2\/repair-versions\.json$/.test(url.pathname)) return route.fulfill({ json: {}, headers });
      if (url.origin === base.origin && request.method() === "GET" && !/\/(?:api|rest\/v1)\/|\.mp3$/i.test(url.pathname)) return route.continue();
      return route.fulfill({ status: 204, headers });
    });
    await page.addInitScript(installClock, [`${storage}-progress-v1`, {
      ...progress, ...options.save,
      profile: { ...progress.profile, ...options.save?.profile },
      settings: { ...progress.settings, ...options.save?.settings },
    }]);

    const ev = (fn, arg) => page.evaluate(fn, arg);
    // The chain counts numeric arguments on evaluations mentioning __step. Layout, boot and
    // replay timing still step the same clock, without waiting for frame screenshots.
    const step = (n = 1, dt = 50) => captureFrames && dt === 50
      ? ev((n) => window.__step(n), n)
      : ev(([hook, n, dt]) => window[hook](n, dt), ["__step", n, dt]);
    const state = async () => (lastState = await ev(readState));
    async function withoutFrameCapture(action) {
      const previous = captureFrames;
      captureFrames = false;
      try { return await action(); }
      finally { captureFrames = previous; }
    }
    async function until(read, what, { timeout = 15_000, frames = 3, dt = 50 } = {}) {
      const limit = performance.now() + timeout;
      do {
        assert.deepEqual(errors, [], "browser errors");
        const value = await read();
        if (value) return value;
        if (frames) await step(frames, dt);
        await wall(frames ? 8 : 16);
      } while (performance.now() < limit);
      throw new Error(`timeout after ${timeout} ms: ${what}`);
    }
    const wait = (fn, what, timeout, arg, frames) => until(() => ev(fn, arg), what, { timeout, frames });
    const visible = (locator, timeout) => until(() => locator.isVisible(), `visible ${locator}`, { timeout, frames: 0 });
    async function layout(action) {
      let done = false;
      const flush = (async () => {
        while (!done) { await step(2, 0); await wall(15); }
      })();
      try { return await action(); }
      finally { done = true; await flush; }
    }
    const press = (locator) => layout(() => phone ? locator.tap() : locator.click());
    const mark = async (name) => {
      await checkCanvasLabels(ev);
      lastMark = name;
      console.log(`ok ${label} ${name}`);
      await capture(name);
    };
    async function enter(reload = false) {
      captureFrames = false;
      const nav = { waitUntil: "domcontentloaded", timeout: options.boot || 120_000 };
      await (reload ? page.reload(nav) : page.goto(base.href, nav));
      assert.match(await page.title(), /Maple Harbor/);
      assert.equal(await page.locator("html").getAttribute("lang"), "lt");
      await wait(() => window.__ew?.store.getState().screen === "play" &&
        (window.__ew.game?.light || (window.__ew.game?.ledges?.ready && !window.__ew.game.caveTravel.pending)),
      "the real game starts", options.boot || 120_000);
      await ev(() => {
        window.__ew.coach?.finish?.();
        window.__ew.store.getState().setHud({ panel: null });
      });
      await ev(observe);
      await step(4);
      captureFrames = true;
    }
    const run = { page, phone, width, height, ev, step, state, until, wait, visible, layout, press, mark, enter, requests, missing, withoutFrameCapture };
    await enter();
    await test(run);
    await wall(50);
    assert.deepEqual(errors, [], "browser errors");
  } catch (error) {
    failed = true;
    let timer;
    const diagnostic = page && await Promise.race([
      page.evaluate(readState).catch(() => null),
      new Promise((resolve) => { timer = setTimeout(resolve, 2000, null); }),
    ]).finally(() => clearTimeout(timer));
    if (page && !lastMark) await capture("before-first-mark-failure");
    throw new Error(`${label}: ${error.message}\nlast state: ${JSON.stringify(diagnostic ?? lastState ?? null)}\nerrors: ${JSON.stringify(errors)}`, { cause: error });
  } finally { await close(context, failed); }
}

const normalize = (text) => text.normalize("NFKD").replace(/\p{M}/gu, "").replace(/[’‘]/g, "'").replace(/\s+/gu, " ").trim().toLowerCase();
const forbidden = /[¿¡]|(?<![\p{L}\p{N}])(?:cenote|ka['’]?an|alux\p{L}*|aluks\p{L}*|yaxche|kin|nikte|maya\p{L}*|maju|sacbe|ceiba|glif(?:o|as|ai|u)\p{L}*|puerto colibri|gruta de los aluxes|la grieta|el ojo|el salto|avenida juarez|buenos dias|buenas tardes|muchas gracias|por favor|escucha otra vez|elige (?:el|la) significado|el agua guarda la memoria|la luz entra por el ojo|la ceiba une el cielo y la tierra|donde estan las piedras)(?![\p{L}\p{N}])/u;

// textTexture stores the exact lettering on the CanvasTexture. Inspect drawn scene
// candidates through the current camera and keep map IDs and geometry names out of the audit.
async function checkCanvasLabels(ev) {
  const labels = await ev(() => {
    const g = window.__ew.game, camera = g.rig?.cam;
    if (!camera) return [];
    const labels = new Set();
    g.scene.traverseVisible((o) => {
      if (!o.isMesh) return;
      const materials = Array.isArray(o.material) ? o.material : [o.material];
      const names = materials.flatMap((m) => m?.map?.isCanvasTexture && m.map.name ? [m.map.name] : []);
      if (!names.length && !o.userData.signQuads) return;
      const inFrame = (p) => {
        p.project(camera);
        return Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1 && Math.abs(p.z) < 1;
      };
      const v = o.position.clone();
      if (names.length && inFrame(o.getWorldPosition(v))) names.forEach((name) => labels.add(name));
      for (const quad of o.userData.signQuads ?? []) {
        v.set(quad.m[12], quad.m[13], quad.m[14]).applyMatrix4(o.matrixWorld);
        if (inFrame(v)) labels.add(quad.key);
      }
    });
    return [...labels];
  });
  assert(!labels.some((label) => forbidden.test(normalize(label))), `PC vocabulary on scene labels: ${labels}`);
}

// MH's town toasts take turns (playing-screen.mjs): a later one can wait behind earlier ones.
export const TOAST_WAIT = 60_000;
export async function surface(run, locator, expected, timeout) {
  await run.visible(locator, timeout);
  // A toast or card can still be fading in (opacity 0) when it first becomes visible: read again for a moment.
  const limit = performance.now() + 4000;
  for (;;) {
    const text = await surfaceText(locator);
    const ok = expected.every((term) => text.normalize("NFC").replace(/\s+/gu, " ").includes(term.normalize("NFC")));
    if (ok || performance.now() > limit) break;
    await run.layout(() => wall(120));
  }
  const text = await surfaceText(locator);
  assert(!forbidden.test(normalize(text)), `PC vocabulary in ${locator}: ${text}`);
  for (const term of expected) {
    assert(text.normalize("NFC").replace(/\s+/gu, " ").includes(term.normalize("NFC")), `${locator} shows “${term}”: ${text}`);
  }
}

async function surfaceText(locator) {
  const values = await locator.evaluate((root) => {
    const shown = (el) => {
      for (let a = el; a; a = a.parentElement) {
        const s = getComputedStyle(a);
        if (a.hidden || s.display === "none" || s.visibility === "hidden" || s.opacity === "0") return false;
      }
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), chunks = [];
    for (let n; (n = walker.nextNode());) {
      const el = n.parentElement;
      if (el.closest("script, style, select, svg, canvas") || !shown(el)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      if (n.textContent.trim() && range.getClientRects().length) chunks.push(n.textContent.trim());
    }
    const names = [root, ...root.querySelectorAll("[aria-label], [alt], select")].filter(shown).flatMap((el) => {
      if (el.closest("[inert], [aria-hidden=true]")) return [];
      if (el instanceof HTMLSelectElement) return Array.from(el.selectedOptions, (o) => o.label);
      return [el.getAttribute("aria-label") || el.getAttribute("alt")].filter(Boolean);
    });
    return { text: chunks.join(" "), names };
  });
  return [values.text, ...values.names].join(" ");
}

export const glyph = (run) => run.ev(() => window.__ew.store.getState().hud.glyph);
export const calls = (run) => run.ev(() => window.__caveWatch.calls);
export const watch = (run) => run.ev(() => window.__caveWatch);
export const interact = (run) => run.phone ? run.press(run.page.locator(".act-btn")) : run.page.keyboard.press("e");
export const settled = (run, zone, timeout = 15_000) => run.wait((zone) => {
  const { game, store } = window.__ew;
  return game.zoneId === zone && !game.transitioning && !store.getState().hud.fade;
}, `settled in ${zone}`, timeout, zone);
export const distance = (s, [x, z]) => Math.hypot(s.x - x, s.z - z);

export async function at(run, x, z, rot, zone = "gruta") {
  await run.ev(([x, z, rot, zone]) => {
    const g = window.__ew.game;
    g.keys.clear(); g.setJoystick(0, 0);
    g.enterZone(zone, { x, z, rot }, true);
    g.rig.yaw = rot; g.rig.snap();
  }, [x, z, rot, zone]);
  await settled(run, zone);
}

export async function walk(run, x, z, { near = 0.65, timeout = 25_000, stop = true, target = { kind: "point" } } = {}) {
  await run.ev(([x, z, target]) => window.__ew.game.walkTo(x, z, target), [x, z, target]);
  await run.wait(([x, z, near, stop]) => {
    const g = window.__ew.game, p = g.player.root.position;
    return Math.hypot(p.x - x, p.z - z) < near && (!stop || !g.autoPath);
  }, `walk to (${x}, ${z})`, timeout, [x, z, near, stop]);
}

export async function look(run, yaw) {
  await run.ev((yaw) => {
    const g = window.__ew.game, r = g.rig;
    r.yaw = yaw; r.yawVel = 0; r.slideYaw = r.standYaw = null; r.snap();
  }, yaw);
}

export async function forward(run, task) {
  if (!run.phone) {
    await run.page.keyboard.down("w");
    try { return await task(); } finally { await run.page.keyboard.up("w"); }
  }
  // Real pointer input to the production stick, including its pointer capture and release.
  const joy = run.page.locator(".joy");
  await run.visible(joy);
  const { x, y, width, height } = await joy.boundingBox();
  const touch = await run.page.context().newCDPSession(run.page);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x + width / 2, y: y + height / 2 - Math.min(48, height / 2 - 2) }],
  });
  run.page.__mark?.();
  try { return await task(); }
  finally {
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await touch.detach();
  }
}

export async function prompt(run, kind, id, pair, timeout = 20_000) {
  await run.wait(([kind, id]) => {
    const { game, store } = window.__ew;
    return store.getState().hud.prompt?.kind === kind && (!id || game.nearest?.id === id);
  }, `prompt ${kind} ${id ?? ""}`, timeout, [kind, id], 1);
  await surface(run, run.page.locator(".prompt"), pair);
}

export async function openRune(run, id, timeout = 20_000) {
  await prompt(run, "listen", id, ["Listen to the stone", "Pasiklausyti akmens"], timeout);
  await interact(run);
  await run.wait(() => !!window.__ew.store.getState().hud.glyph, "rune opens", 12_000);
  const card = run.page.locator(".glyph-card");
  await run.visible(card);
  const q = await glyph(run);
  const choices = card.locator(".glyph-opt");
  assert.equal(q.id, id);
  assert.equal(q.options.length, 3);
  assert.equal(new Set(q.options).size, 3);
  assert.equal(q.options[q.answer], q.lt);
  assert.equal(await choices.count(), 3);
  for (const [i, option] of q.options.entries()) {
    const choice = choices.nth(i);
    assert(meanings.has(option), `authored Lithuanian meaning ${option}`);
    assert(await choice.isVisible());
    assert.equal(await choice.getAttribute("lang"), "lt");
    assert.equal(await choice.locator("span").innerText(), option);
    assert.equal(await choice.getAttribute("aria-label"), `${i + 1} pasirinkimas. ${option}`);
  }
  await surface(run, card, ["Ką sako akmuo?", q.lt]);
  return q;
}

export async function cue(run, locator, en, lt) {
  const units = locator.locator(".il .u > .en:visible");
  const english = (await units.count()) ? (await units.evaluateAll((nodes) => nodes.map((n) => n.firstChild?.textContent).join(" "))) :
    await locator.locator(".il[lang=en]").innerText();
  assert.equal(english.trim(), en);
  if (lt) {
    const natural = locator.locator(".nat[lang=lt]").filter({ hasText: lt });
    await run.visible(natural);
    assert.equal(await natural.innerText(), lt);
  }
  await surface(run, locator, lt ? [lt] : [en]);
}

export async function solve(run, q, pair) {
  assert.deepEqual([q.text, q.lt], pair);
  const card = run.page.locator(".glyph-card");
  await run.press(card.locator(".glyph-opt").nth(q.answer));
  await run.wait(() => window.__ew.store.getState().hud.glyph?.solved, "the chosen meaning solves the rune", 10_000);
  await cue(run, card.locator(".glyph-line"), ...pair);
  await surface(run, card, ["Akmuo sušvito!", pair[1]]);
}

export async function closeRune(run, button = run.phone) {
  if (button) await run.press(run.page.locator(".glyph-x"));
  else await run.page.keyboard.press("Escape");
  await run.wait(() => !window.__ew.store.getState().hud.glyph, "explicit rune dismissal", 5000);
  assert.equal(await run.page.locator(".glyph-veil").count(), 0);
}

export async function openMap(run, pair) {
  await run.press(run.page.locator(".minimap"));
  const sheet = run.page.locator(".sheet").filter({ has: run.page.locator(".map-wrap") });
  await run.visible(sheet);
  if (pair) {
    await run.press(sheet.getByRole("button", { name: pair[0], exact: true }));
    await surface(run, sheet, [...pair, "Nuvesk mane"]);
  }
  return sheet;
}

export async function toolbar(run, name) {
  await run.layout(() => openPhoneMenu(run.page));
  await run.press(run.page.locator(`.toolbar-tools button[title="${name}"]`));
}

export async function conversation(run, who, timeout = 15_000) {
  await run.wait((id) => {
    const c = window.__ew.store.getState().conv;
    return c.active && c.sitId === id;
  }, `real conversation ${who.id}`, timeout, who.id);
  const dialog = run.page.getByRole("dialog", { name: `Pokalbis: ${who.name}`, exact: true });
  await run.visible(dialog);
  const intro = dialog.locator(".scene-intro");
  if (await run.ev(() => window.__ew.store.getState().conv.introOpen)) {
    await surface(run, intro, [who === BRAM ? "Prisistatyk" : who === FERN ? "Ji tau užmins kelias mįsles" : "Penki akmenys jau šviečia", "Pradėti"]);
    const visit = await run.ev(() => window.__ew.store.getState().conv.run);
    await run.mark(`${who.id}-intro-${visit}`);
    await run.press(intro.getByRole("button", { name: "Pradėti", exact: true }));
  }
  await turn(run, timeout === 40_000 ? 90_000 : 30_000);
  return dialog;
}

export const turn = (run, timeout = 30_000) => run.wait(() => {
  const c = window.__ew.store.getState().conv;
  return c.active && c.phase === "you";
}, "the learner's turn", timeout);

export async function answer(run, text, timeout = 30_000) {
  await turn(run, timeout);
  const input = run.page.locator(".typebox input");
  if (!(await input.isVisible())) await run.press(run.page.locator(".type-toggle"));
  await input.fill(text);
  if (run.phone) await run.press(run.page.locator(".typebox").getByRole("button", { name: "Siųsti", exact: true }));
  else await input.press("Enter");
}

export async function heard(run, pair) {
  const transcript = run.page.locator(".convo .transcript");
  const natural = transcript.locator(".nat[lang=lt]").filter({ hasText: pair[1] }).last();
  await run.visible(natural);
  await run.layout(() => natural.scrollIntoViewIfNeeded());
  await cue(run, natural.locator(".."), ...pair);
  await surface(run, transcript, [pair[1]]);
}

export async function ended(run, who, gift) {
  const end = run.page.locator(".ended-box");
  await run.until(() => end.isVisible(), `${who.name} reaches the end card`, { timeout: 30_000 });
  assert.equal(await end.locator(".ended-title").innerText(), "Užduotis įvykdyta!");
  const phrase = await run.ev(() => window.__ew.store.getState().conv.bestPhrase);
  assert(phrase?.en && phrase.nat);
  assert.equal(await end.locator(".ended-phrase [lang=en]").innerText(), phrase.en);
  assert.equal(await end.locator(".ended-phrase [lang=lt]").innerText(), phrase.nat);
  assert.equal(await end.locator(".ended-phrase-label").innerText(), "Tavo frazė");
  assert.equal(await end.locator(".ended-keepsake").innerText(), gift);
  await surface(run, end, [phrase.en, phrase.nat, gift, "Tavo frazė"]);
  return end;
}

export async function endTalk(run) {
  const end = run.page.locator(".ended-box");
  if (await end.isVisible() && !await run.ev(() => window.__ew.game.light)) {
    await run.press(end.getByRole("button", { name: "Tęsti", exact: true }));
  } else await run.press(run.page.getByRole("button", { name: "Baigti pokalbį", exact: true }));
  await run.wait(() => !window.__ew.store.getState().conv.active, "conversation closes", 20_000);
}

export async function tapGround(run, x, z) {
  const here = await run.state();
  await look(run, Math.atan2(x - here.x, z - here.z));
  await run.step(1, 0);
  const point = await run.ev(([x, z]) => {
    const { game: g } = window.__ew, canvas = g.renderer.domElement;
    const box = canvas.getBoundingClientRect();
    const v = g.player.root.position.clone().set(x, 0, z).project(g.rig.cam);
    const px = box.left + (v.x + 1) * box.width / 2, py = box.top + (1 - v.y) * box.height / 2;
    return { x: px, y: py, hit: v.z < 1 && document.elementFromPoint(px, py) === canvas };
  }, [x, z]);
  assert(point.hit, `walk target hits the canvas: ${JSON.stringify({ x, z, point })}`);
  if (run.phone) await run.page.touchscreen.tap(point.x, point.y);
  else await run.page.mouse.click(point.x, point.y);
  run.page.__mark?.();
}

export async function trail(run, door, realTaps = false) {
  const way = [[-108, -59], [-116, -59], ...(door === "main" ? [[-128, -61.7], [-132, -63]] : [[-119, -60], [-121, -61.8]])];
  if (!realTaps) run.page.__mark?.();
  for (const [x, z] of way) {
    if (realTaps) {
      await tapGround(run, x, z);
      await run.wait(([x, z]) => {
        const g = window.__ew.game, p = g.player.root.position;
        return !g.autoPath && Math.hypot(p.x - x, p.z - z) < 0.65;
      }, `walk from canvas to (${x}, ${z})`, 30_000, [x, z]);
    } else await walk(run, x, z, { timeout: 30_000 });
    const s = await run.state();
    assert(s.zone === "town" && s.y >= 0 && !s.swim);
  }
}

export async function crossIn(run, id, hold = false) {
  await settled(run, "town");
  const d = DOORS[id], s = await run.state();
  assert(s.zone === "town" && s.y >= 0 && !s.swim && distance(s, d.at) < 4 && distance(s, d.at) > 2.4, JSON.stringify(s));
  await run.mark(`${id}-approach-v${s.visits + 1}`);
  await look(run, Math.atan2(d.at[0] - s.x, d.at[1] - s.z));
  await forward(run, async () => {
    await prompt(run, "enter", id, [d.prompt, "Įeiti į olą"]);
    const offered = await run.state();
    assert(offered.zone === "town" && !offered.swim && offered.y >= 0 && distance(offered, d.at) < 2.4);
    assert(distance(offered, d.at) < distance(s, d.at));
    await run.wait(() => window.__ew.game.zoneId === "gruta", "walking crosses the dry entrance", 20_000);
    if (hold) {
      await settled(run, "gruta");
      await run.step(37);
    }
  });
  await settled(run, "gruta");
  // (the cave card follows on the first frame the cave's quest runs after the fade)
  await run.wait(() => !!window.__ew.store.getState().hud.cave, "the cave card after the walk in", 10_000);
  const inside = await run.state();
  assert(distance(inside, d.spawn) < (id === "main" ? 2.5 : 1.5) && inside.y === 0 && !inside.swim, JSON.stringify(inside));
  assert.equal(inside.visits, s.visits + 1);
  await run.mark(`${id}-inside-v${inside.visits}`);
  return inside;
}

export async function exitVia(run, id, { action = false, hold = false, timeout = 20_000 } = {}) {
  const d = DOORS[id];
  const approach = [d.exit[0] - 1.9 * Math.sin(d.exitRot), d.exit[1] - 1.9 * Math.cos(d.exitRot)];
  await walk(run, ...approach, { timeout: 40_000 });
  await prompt(run, "exit", id, ["Exit to the trail", "Išeiti iš olos"], 15_000);
  const before = await run.state();
  assert(distance(before, d.exit) < d.reach && before.zone === "gruta" && !before.swim);
  await run.mark(`${id}-exit-prompt-v${before.visits}`);
  const outside = () => run.wait(() => window.__ew.game.zoneId === "town", "leave the cave through its real door", timeout);
  if (action) { await interact(run); await outside(); }
  else {
    await look(run, Math.atan2(d.exit[0] - before.x, d.exit[1] - before.z));
    await forward(run, async () => {
      await outside();
      if (hold) {
        await settled(run, "town");
        await run.step(42);
      }
    });
  }
  await settled(run, "town");
  const s = await run.state();
  assert(s.y >= 0 && !s.swim && !s.card && distance(s, d.out) < (id === "main" ? 3 : 2.5), JSON.stringify(s));
  assert.equal(s.visits, before.visits);
  // (the phone layout hides the minimap's town name; its map region says where one is)
  if (run.phone) assert.notEqual(await run.page.locator(".minimap").getAttribute("data-map"), "gruta");
  else await surface(run, run.page.locator(".minimap .label"), ["Maple Harbor"]);
  await surface(run, run.page.locator(".town-toasts .toast").filter({ hasText: "Vėl ant tako" }).first(),
    ["Vėl ant tako", "Taku grįši į miestelį."], TOAST_WAIT);
  await run.mark(`${id}-outside-v${s.visits}`);
  return s;
}

export async function assertPickerIds(run, cards, expanded) {
  const course = await run.ev(() => window.__ew.game.orderedSituations().map((s) => s.id));
  const ids = await cards.evaluateAll((nodes) => nodes.map((card) => card.dataset.sit));
  const bonuses = [BRAM.id, FERN.id, OAK.id];
  assert.equal(new Set(course).size, 50);
  assert(bonuses.every((id) => !course.includes(id)), "the cave is off the course route");
  assert.deepEqual(new Set(ids), new Set(expanded ? [...course, ...bonuses] : course));
  for (const id of bonuses) assert.equal(ids.filter((value) => value === id).length, expanded ? 1 : 0, id);
}

export async function toggleCavePicker(run, picker, expanded) {
  const toggle = picker.getByRole("button", { name: /^Skalūnų įlankos ola\s+Slate Cove Cave$/ });
  await surface(run, toggle, CAVE);
  assert.equal(await toggle.getAttribute("aria-expanded"), String(!expanded));
  const id = await toggle.getAttribute("aria-controls");
  assert(id, "the disclosure names its controlled panel");
  const panel = picker.locator(`[id="${id}"]`);
  assert.equal(await panel.count(), 1);
  assert.equal(await panel.isVisible(), !expanded);
  await run.layout(() => toggle.scrollIntoViewIfNeeded());
  assert(await toggle.evaluate((button) => {
    const { width, height, left, top, right, bottom } = button.getBoundingClientRect();
    return width >= 44 && height >= 44 && left >= 0 && right <= innerWidth && top >= 0 && bottom <= innerHeight;
  }), "the bilingual disclosure has an in-frame touch target");
  if (run.phone) await run.press(toggle);
  else await toggle.press(expanded ? "Enter" : "Space");
  assert.equal(await toggle.getAttribute("aria-expanded"), String(expanded));
  assert.equal(await panel.isVisible(), expanded);
  const ids = await panel.locator(".scn-card, .lh-card").evaluateAll((nodes) => nodes.map((card) => card.dataset.sit));
  assert.deepEqual(ids, expanded ? [BRAM.id, FERN.id, OAK.id] : []);
}

export async function inspectPickerCard(run, card, labels) {
  await run.visible(card);
  await run.layout(() => card.scrollIntoViewIfNeeded());
  await surface(run, card, labels);
  const problems = await card.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const scroll = el.closest(".sheet-body, .lh");
    const clip = scroll.getBoundingClientRect();
    const grid = el.parentElement.getBoundingClientRect();
    const text = el.querySelector(".txt, .lh-txt");
    const titles = [...text.querySelectorAll("b, i, span")];
    const marks = [...el.querySelectorAll("svg[data-sit-icon], .stars")];
    const within = (r, bounds) => r.left >= bounds.left - 1 && r.right <= bounds.right + 1 &&
      r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1;
    const overlaps = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
    const problems = [];
    if (box.width < 44 || box.height < 44 || !within(box, clip) || !within(box, grid) ||
      box.left < -1 || box.right > innerWidth + 1 || box.top < -1 || box.bottom > innerHeight + 1 ||
      !el.contains(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2))) problems.push("card out of view");
    if (scroll.scrollWidth > scroll.clientWidth + 1) problems.push("picker scrolls sideways");
    if (text.getBoundingClientRect().width < 150) problems.push("text column is cramped");
    const art = marks.map((mark) => mark.getBoundingClientRect());
    if (marks.length !== 2 || art.some((r) => !r.width || !r.height || !within(r, box))) problems.push("art or stars missing or clipped");
    for (const label of titles) {
      const range = document.createRange();
      range.selectNodeContents(label);
      const rows = [...range.getClientRects()].filter((r) => r.width && r.height);
      if (!rows.length || (label.matches("b, i") && rows.length > 3) || label.scrollWidth > label.clientWidth + 1 ||
        rows.some((r) => !within(r, box) || art.some((mark) => overlaps(r, mark)))) problems.push(`cramped or clipped text: ${label.textContent}`);
    }
    return problems;
  });
  assert.deepEqual(problems, [], `${card}`);
}

export async function inspectPicker(run) {
  const textSize = async (label) => {
    await toolbar(run, "Nustatymai (Esc)");
    const settings = run.page.locator(".sheet.narrow").filter({ has: run.page.getByRole("heading", { name: "Nustatymai", exact: true }) });
    await run.press(settings.getByRole("button", { name: label, exact: true }));
    await run.press(settings.getByRole("button", { name: "Uždaryti", exact: true }));
  };
  const scale = await run.ev(() => window.__ew.store.getState().settings.textSize);
  if (run.phone) {
    await textSize("A++");
    await run.wait(() => document.documentElement.style.getPropertyValue("--scale") === "1.3", "largest text is applied");
  }
  await toolbar(run, "Visos situacijos");
  const picker = run.page.locator(".sheet.scenarios");
  const cards = picker.locator(".scn-card");
  await run.visible(picker);
  await assertPickerIds(run, cards, false);
  await toggleCavePicker(run, picker, true);
  await assertPickerIds(run, cards, true);
  await run.ev(() => document.fonts.ready.then(() => undefined));
  for (const [who, pair] of [[BRAM, CAVE], [FERN, FERN.title], [OAK, OAK.title]]) {
    await inspectPickerCard(run, picker.locator(`.scn-card[data-sit="${who.id}"]`), pair);
  }
  await run.mark("picker");
  await toggleCavePicker(run, picker, false);
  await assertPickerIds(run, cards, false);
  await toggleCavePicker(run, picker, true);
  if (run.phone) await run.press(picker.getByRole("button", { name: "Uždaryti", exact: true }));
  else await run.page.keyboard.press("Escape");
  await picker.waitFor({ state: "detached" });
  if (run.phone && scale !== 1.3) await textSize(scale === 1.15 ? "A+" : "A");

  await toolbar(run, "Visos situacijos");
  await assertPickerIds(run, cards, false);
  await toggleCavePicker(run, picker, true);
  const objective = await run.ev(() => window.__ew.store.getState().progress.objective);
  await run.press(picker.locator(`.scn-card[data-sit="${BRAM.id}"]`));
  await picker.waitFor({ state: "detached" });
  assert.deepEqual(await run.ev(() => {
    const { game, store } = window.__ew, st = store.getState();
    const target = game.objectiveTarget();
    return [game.zoneId, game.caveGuideNpc, target?.kind, target?.id, st.progress.objective, st.conv.active,
      st.progress.play?.games?.["slate-cove-cave"] ?? 0];
  }), ["town", BRAM.npc, "cave-entry", "cleft", objective, false, 0]);
}

export async function alternative(run, label, pair) {
  const guide = run.page.locator(".convo .guide"), alternatives = guide.locator(".guide-alt");
  const choice = alternatives.getByRole("button", { name: label, exact: true });
  await surface(run, alternatives, ["Arba:", label]);
  await run.press(choice);
  assert.equal(await guide.locator(".guide-task span").innerText(), label);
  const examples = await guide.locator(".gx-text").all();
  const phrases = await Promise.all(examples.map((example) => example.locator(".il .u > .en:visible").evaluateAll(
    (nodes) => nodes.map((n) => n.firstChild?.textContent).join(" "),
  )));
  const example = examples[phrases.indexOf(pair[0])];
  assert(example, `the selected alternative shows ${pair[0]}: ${phrases}`);
  await run.layout(() => example.scrollIntoViewIfNeeded());
  await surface(run, example, [pair[1]]);
}

export const BRAM_TURNS = ["My name is Test.", "I'm from Lithuania.", "I want to see the cave.", "Where are the stones?", "No, thanks."];
export async function bramTalk(run, { first = true } = {}) {
  const dialog = await conversation(run, BRAM);
  await surface(run, dialog, ["Bram", "Tavo eilė"]);
  await heard(run, first ? ["Who's there on the path?", "Kas ten ant tako?"] :
    ["Back again? Tell me your name.", "Sugrįžote? Kuo Jūs vardu?"]);
  await alternative(run, "Ko nors paklausti Bramo", ["Who are you?", "Jūs?"]);
  await run.mark("bram-alternatives");
  for (const line of BRAM_TURNS) {
    await answer(run, line);
    if (line === "Where are the stones?") {
      await turn(run);
      await heard(run, ["The first stone is left of the tree.", "Pirmasis akmuo – medžio kairėje."]);
      assert(!(await run.state()).cave.passed.includes("bram"), "directions still need the closing turn");
    }
  }
  await run.wait(() => window.__ew.store.getState().progress.cave?.passed?.includes("bram"), "Bram's release is saved", 30_000);
  await ended(run, BRAM, "Gavai mažą skalūno akmenėlį");
  await run.mark("bram-end");
  await endTalk(run);
}

export async function fernTalk(run, { clues = true } = {}) {
  const dialog = await conversation(run, FERN);
  await surface(run, dialog, ["Fern", "Tavo eilė"]);
  await heard(run, ["Two riddles, then you can cross. Ready?", "Dvi mįslės, ir galėsite pereiti. Pradėsim?"]);
  await answer(run, "I'm ready.");
  await turn(run);
  await heard(run, ["I wear a little cap. An oak sleeps inside me.", "Dėviu mažą kepurėlę. Manyje miega ąžuolas."]);
  await surface(run, dialog.locator(".guide .chips"), ["gilė", "riešutas", "akmuo", "kriauklė"]);
  if (clues) {
    await alternative(run, "Paprašyk pagalbos", ["Can I have a clue?", "užuominą?"]);
    await answer(run, "Can I have a clue?");
    await turn(run);
    await heard(run, ["Look under an oak in the fall.", "Rudenį paieškokite po ąžuolu."]);
    await run.mark("fern-clue");
  }
  await answer(run, "An acorn.");
  await turn(run);
  await heard(run, ["You call to me. I send back your words.", "Jūs mane šaukiate, o aš grąžinu Jūsų žodžius."]);
  assert(!(await run.state()).cave.passed.includes("fern"), "one riddle leaves the bridge shut");
  await answer(run, "I think it's an echo.");
  await turn(run);
  await heard(run, ["The bridge is yours. Go ahead.", "Tiltas Jūsų. Pereikite."]);
  await answer(run, "Thanks!");
  await ended(run, FERN, "Gavai mažą skalūno akmenėlį");
  assert.equal(await run.ev(() => window.__ew.store.getState().progress.sits["x07-fern"].completions), 1);
  await run.mark("fern-end");
  await endTalk(run);
}

export async function oakTalk(run, { leaveByGuide = false } = {}) {
  const dialog = await conversation(run, OAK, 40_000);
  await surface(run, dialog, ["The Old Oak", "Tavo eilė"]);
  await heard(run, ["Do you know who is speaking?", "Ar žinote, kas kalba?"]);
  await run.step(24);
  const v = await run.ev(() => {
    const { game: g, store } = window.__ew, r = g.rig, p = g.player.root.position;
    const canvas = g.renderer.domElement.getBoundingClientRect(), panel = document.querySelector(".convo").getBoundingClientRect();
    const trunk = r.cam.position.clone().set(6, r.talk.look.y, -180), n = trunk.clone().project(r.cam);
    return { sit: store.getState().conv.sitId, npc: store.getState().conv.npcId,
      lines: store.getState().conv.transcript.filter((l) => l.who === "npc").length,
      mode: r.mode, actorless: g.talkTree && !g.talkNpc && g.npcs.every((a) => a.id !== "cave_oak"),
      distance: Math.hypot(p.x - 6, p.z + 180), inRock: g.wild.space.inside(r.cam.position), clear: g.wild.space.free(r.cam.position, trunk),
      z: +n.z.toFixed(3),
      px: [canvas.left + (n.x + 1) * canvas.width / 2, canvas.top + (1 - n.y) * canvas.height / 2].map(Math.round),
      free: (innerWidth > 900 ? [0, 0, panel.left, innerHeight] : [0, 0, innerWidth, panel.top]).map(Math.round),
    };
  });
  assert(v.sit === OAK.id && v.npc === OAK.npc && v.lines >= 3 && v.actorless && v.distance < 3.6, JSON.stringify(v));
  assert(v.mode === "talk" && !v.inRock && v.clear >= 0.6 && v.z < 1 && v.px[0] >= v.free[0] &&
    v.px[0] <= v.free[2] && v.px[1] >= v.free[1] && v.px[1] <= v.free[3], JSON.stringify(v));
  await run.mark("oak-projection");
  await oakClosing(run, { leaveByGuide });
  assert.equal(await run.ev(() => window.__ew.game.keepsakeKind()), "oak_leaf");
}

export async function oakClosing(run, { leaveByGuide = false } = {}) {
  const light = await run.ev(() => window.__ew.game.light);
  await answer(run, "Who are you?", 90_000);
  await answer(run, "I feel at home here.", 90_000);
  await turn(run, 90_000);
  await heard(run, ["Will you keep learning?", "Ar mokysitės ir toliau?"]);
  await run.mark("oak-promise");
  await answer(run, "Yes, I'll keep learning.", 90_000);
  if (!light) await run.wait(() => window.__ew.store.getState().progress.cave?.tree, "the Oak story event is saved", 90_000);
  await turn(run, 90_000);
  await heard(run, KEEP);
  await heard(run, BACK);
  const spoken = await calls(run);
  for (const [en] of [KEEP, BACK]) {
    if (!light) assert.equal(spoken.filter((c) => c.voice === "g_cave_oak" && c.text === en && c.result === true).length, 1);
    assert(run.requests.some((r) => r.key === audioKey("g_cave_oak", 1, en) && r.duration === 0.25));
  }
  assert(await run.ev(() => window.__ew.store.getState().conv.transcript.filter((l) => l.who === "npc").length >= 9));
  await run.mark("oak-closing-words");
  await answer(run, "Goodbye!", 90_000);
  const end = await ended(run, OAK, "Gavai ąžuolo lapą");
  const expected = {
    "Who are you?": "Kas Jūs?",
    "I feel at home here.": "Čia jaučiuosi kaip namie.",
    "Yes, I'll keep learning.": "Taip, mokysiuosi ir toliau.",
    "Goodbye!": "Viso gero!",
  };
  const chosen = await end.locator(".ended-phrase [lang=en]").innerText();
  assert(expected[chosen], chosen);
  assert.equal(await end.locator(".ended-phrase [lang=lt]").innerText(), expected[chosen]);
  const ending = end.locator(".cave-ending");
  await run.visible(ending);
  assert.equal(await ending.locator("[lang=en]").innerText(), "Follow the lights to the dry exit.");
  assert.equal(await ending.locator("[lang=lt]").innerText(), "Sek žiburėlius iki išėjimo į sausą taką.");
  const guide = ending.getByRole("button", { name: "Nuvesk mane", exact: true });
  assert.equal(await guide.count(), light ? 0 : 1);
  if (!light) await run.visible(guide);
  const observed = await watch(run);
  assert.equal(observed.trees, light ? 0 : 1);
  // (light mode's practice run stores nothing for the cave, and its game is not the one watched at boot)
  if (!light) assert.deepEqual(observed.events.filter(([name]) => name === "tree-heard"), [["tree-heard", null]]);
  assert.equal(await run.ev(() => window.__ew.store.getState().progress.sits["x08-old-oak"].completions), 1);
  await run.mark(light ? "light-oak-end" : "oak-end");
  if (leaveByGuide) {
    await run.press(guide);
    await run.wait(() => {
      const { game, store } = window.__ew;
      return !store.getState().conv.active && game.zoneId === "gruta" && game.autoPath?.length > 0 &&
        game.autoTarget?.kind === "cave-exit" && game.autoTarget.id === "cleft";
    }, "the Oak invitation starts the existing exit route", 5000, undefined, 0);
  } else await endTalk(run);
}
