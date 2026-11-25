// External browser contract for the two Puerto Colibrí learner layers (Vite dev server).
// WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en WORLD_TEST_URL=http://127.0.0.1:5188 node tests/browser/gamepad.mjs
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { init as initModuleLexer, parse as parseModules } from "es-module-lexer";
import { contentUrl, contextOptions, progress as returnedPlayer } from "./life-harness.mjs";
import { checkEdition } from "./quests-harness.mjs";
import { openPhoneMenu } from "./screen-harness.mjs";

const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:5188");
const storage = process.env.WORLD_STORAGE || "puerto-colibri";
const learner = process.env.WORLD_LEARNER || "en";
const shots = process.env.WORLD_SHOTS;
assert.equal(storage, "puerto-colibri");
assert(["en", "lt"].includes(learner), `Unknown WORLD_LEARNER layer: ${learner}`);
assert(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname), "Use the matching local PC dev server");

const cafe = "s72-cafe";
// The Maple Harbor spawn (28, -14.6) is a lamp's nav cell in Puerto Colibrí; this plaza spot has 8+ m of open nav
// grid and no collider (body radius 0.38) ahead and behind and 4 m to each side (probed on the live PC town).
const clearGround = { x: 29.5, z: -10, rot: Math.PI };
const padHint = "[data-pad-hint]";
const toolbar = "[data-pad-toolbar], [data-pad-scope=drawer]";
const phoneTool = "[data-pad-tool=phone]";
const scenariosTool = "[data-pad-tool=scenarios]";
const intro = ".scene-intro[data-pad-scope=intro]";
const primary = `${intro} [data-pad-default]`;
// The small button constants are also used by the existing town activities.
const lazyPadAsset = /\/(?:assets\/(?:gamepad|padPopover)-[^/]+\.(?:js|css)|src\/(?:game\/gamepad|ui\/(?:gamepad|padPopover)|(?:editions\/[^/]+\/)?content\/gamepad)\.(?:ts|css))$/i;
const button = { A: 0, B: 1, X: 2, LB: 4, LT: 6, RT: 7, Menu: 9, Up: 12, Down: 13, Left: 14, Right: 15 };
const turn = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));
const words = (en, lt) => learner === "lt" ? lt : en;
const labels = words(
  ["Controller connected", "Controller disconnected", "Move", "Look around", "Jump", "Use", "Choose", "Go back"],
  ["Valdiklis prijungtas", "Valdiklis atsijungė", "Judėti", "Apsidairyti", "Pašokti", "Naudoti", "Pasirinkti", "Grįžti"],
);
const answers = ["Un americano", "¿Me da un café de olla?"];

if (shots) await mkdir(shots, { recursive: true });
const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const launch = () => chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium", headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});
let browser = await launch();
/** The context of the case running now, so a stalled case can be released without hanging the rest. */
let live = null;

function install({ key, progress }) {
  localStorage.setItem(key, JSON.stringify(progress));
  localStorage.setItem("puerto-colibri-variety", "default");
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  // The same silent speech completion used by the kit fixtures, with no native synthesizer.
  speechSynthesis.getVoices = () => [];
  speechSynthesis.speak = (utterance) => queueMicrotask(() => utterance.onend?.(new SpeechSynthesisEvent("end", { utterance })));

  let seed = 20261122;
  Math.random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const wallNow = performance.now.bind(performance);
  let now = 1000;
  let id = 0;
  let polls = 0;
  let portalEvents = 0;
  document.addEventListener("padpopover", () => { portalEvents++; });
  const callbacks = new Map();
  performance.now = () => now;
  window.requestAnimationFrame = (cb) => { callbacks.set(++id, cb); return id; };
  window.cancelAnimationFrame = (key) => callbacks.delete(key);
  window.__step = (n, dt = 1000 / 60) => {
    const frames = [];
    for (let i = 0; i < n; i++) {
      now += dt;
      const before = polls;
      const queued = [...callbacks];
      for (const [key, cb] of queued) if (callbacks.delete(key)) cb(now);
      frames.push({ callbacks: queued.length, polls: polls - before });
    }
    return frames;
  };

  const slots = [null, null, null, null];
  let pad, published;
  let broken = false;
  const index = 2;
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => {
      polls++;
      if (broken) throw new Error("Gamepad API unavailable in this fixture");
      return slots;
    },
  });
  const reads = new WeakMap();
  const dispatch = (type, device = published) => {
    // Chromium's GamepadEvent constructor only accepts native Gamepad objects.
    const event = new Event(type);
    Object.defineProperty(event, "gamepad", { value: device });
    window.dispatchEvent(event);
  };
  function attach(mapping = "standard", held = [], slot = index, name = "Browser contract controller") {
    const snapshot = {
      id: name, index: slot, connected: true, mapping,
      timestamp: now, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({
        pressed: held.includes(i), touched: held.includes(i), value: +held.includes(i),
      })),
    };
    let samples = 0;
    published = new Proxy(snapshot, {
      get(target, field) {
        if (field === "axes" || field === "buttons") samples++;
        return Reflect.get(target, field);
      },
    });
    reads.set(published, () => samples);
    pad = snapshot;
    slots[slot] = published;
    dispatch("gamepadconnected");
  }
  function detach(device = published) {
    slots[device.index] = null;
    device.connected = false;
    dispatch("gamepaddisconnected", device);
  }

  // Watch the transient's wall time even if a render batch or artifact capture is slow.
  const notices = [];
  let current;
  const announcements = new MutationObserver((records) => {
    if (current) current.record.writes += records.length;
  });
  new MutationObserver((records) => {
    if (current && records.some((record) => [...record.removedNodes].some((node) =>
      node === current.hint || node.contains(current.hint)))) current.record.unmounts++;
    const hint = document.querySelector("[data-pad-hint]");
    const kind = hint?.dataset.padHint;
    if (current?.hint === hint && current?.kind === kind) return;
    if (current) current.record.removed = wallNow();
    announcements.disconnect();
    current = undefined;
    if (hint) {
      const record = { kind, shown: wallNow(), removed: null, writes: 0, unmounts: 0 };
      notices.push(record);
      current = { hint, kind, record };
      announcements.observe(hint.querySelector("strong"), { childList: true, subtree: true, characterData: true });
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-pad-hint"] });

  window.__padFixture = {
    attach, detach, dispatch, notices, wallNow,
    setFrameTime(time) { now = time; },
    failReads(value) { broken = value; },
    device() { return published; },
    get deviceReads() { return reads.get(published)?.() ?? 0; },
    get polls() { return polls; },
    get portalEvents() { return portalEvents; },
    sample(axes, buttons) {
      pad.axes.splice(0, 4, ...axes);
      for (const [i, entry] of pad.buttons.entries()) {
        const value = buttons[i] ?? 0;
        Object.assign(entry, { pressed: value > 0.5, touched: value > 0, value });
      }
      pad.timestamp = now;
    },
  };
}

function readState() {
  const { game: g, store } = window.__ew ?? {};
  const state = store?.getState();
  const r = g?.rides?.riding;
  const player = g?.player;
  const p = player?.root;
  const rig = g?.rig;
  const f = document.activeElement;
  const pos = p?.position.toArray() ?? null;
  const lift = player?.lift ?? 0;
  // The root tracks support height and the avatar's body gets the hop's lift.
  const jumpY = p ? p.position.y + lift : null;
  const view = p && rig ? rig.cam.getWorldDirection(p.position.clone()).toArray() : null;
  return {
    screen: state?.screen, phase: state?.conv.active ? state.conv.phase : g?.rides?.phase,
    conversation: state?.conv.active && { sit: state.conv.sitId, run: state.conv.run, line: state.conv.transcript.at(-1)?.sentence?.en,
      step: g?.activeSession?.conv.effectiveStep()?.id },
    mode: g?.modes?.active?.id ?? state?.hud.modeScreen?.id,
    modePhase: g?.modes?.active?.padPhase ?? document.querySelector(".mode-hud [data-pad-phase]")?.dataset.padPhase,
    line: document.querySelector(".mode-hud [data-line], .road-lift-line")?.dataset.line,
    photoNear: document.querySelector(".photo-chip")?.dataset.near,
    panel: state?.hud.panel, prompt: state?.hud.prompt?.kind, water: state?.hud.ride, zone: g?.zone?.id,
    introOpen: state?.conv.introOpen, transition: g?.transitioning, waitingForTraffic: g?.rides?.waitingForTraffic,
    pos, jumpY, lift, speed: r?.m.speed ?? g?.vel?.length(),
    ride: r && { id: r.id, x: r.m.x, z: r.m.z, heading: r.m.heading, steer: r.m.steer },
    visible: p?.visible, yaw: rig?.yaw, pitch: rig?.pitch, view, swimming: g?.swimming, cameraY: rig?.cam.position.y,
    hop: g?.hop && { y: g.hop.y, air: g.hop.air, flipped: g.hop.flipped, doubled: g.hop.doubled },
    focus: f && { tag: f.tagName, scope: f.closest("[data-pad-scope]")?.dataset.padScope, key: f.dataset.padTool ?? f.dataset.padAnswer ?? f.dataset.sit ?? f.dataset.line ?? f.dataset.chip },
    pad: window.__pad ? { ...window.__pad } : null, polls: window.__padFixture?.polls,
    deviceReads: window.__padFixture?.deviceReads,
    surface: (() => {
      const v = g?.pad?.input?.view, root = v?.scope;
      return root ? { cls: String(root.className), kind: root.dataset.padScope ?? root.tagName, phase: root.dataset.padPhase ?? root.dataset.phase,
        desktopStacks: window.__desktopStacks } : null;
    })(),
    latches: g?.pad?.input && {
      buttonsReady: g.pad.input.buttonsReady, held: g.pad.input.held,
      leftReady: g.pad.input.leftReady, rightReady: g.pad.input.rightReady,
      ltReady: g.pad.input.ltReady, rtReady: g.pad.input.rtReady,
    },
    hint: document.querySelector("[data-pad-hint]")?.dataset.padHint,
  };
}

function horizontal(a, b) {
  return Math.hypot(b.pos[0] - a.pos[0], b.pos[2] - a.pos[2]);
}
function angle(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a));
}
function viewYaw(state) {
  return Math.atan2(state.view[0], state.view[2]);
}
function rideTravel(a, b) {
  return Math.hypot(b.ride.x - a.ride.x, b.ride.z - a.ride.z);
}

async function run(width, height, mobile, mode, contract, checkpoint = mode) {
  const label = `pc-${learner}-${width}x${height}-${checkpoint}`;
  const errors = [];
  const external = [];
  const actions = [];
  let frame = 0;
  const action = (input) => {
    actions.push({ frame, input });
    if (actions.length > 18) actions.shift();
  };
  let context;
  let page;
  let failure;
  let phase = "startup";
  // Allocated before the try so the reporter can always name them, even when setup fails.
  const padRequests = [];
  const modules = [];
  const check = (name, value, detail) => {
    assert(value, `${label} · ${name}: ${JSON.stringify(detail)}`);
    console.log("ok", label, name, detail === undefined ? "" : JSON.stringify(detail));
  };
  const shot = (name) => shots ? page.screenshot({ path: join(shots, `gamepad-${label}-${name}.png`), timeout: 5000 }) : undefined;
  try {
    context = await browser.newContext({ ...contextOptions(width, height), serviceWorkers: "block" });
    live = context;
    const cors = { "access-control-allow-origin": "*" };
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.origin !== base.origin) external.push({ method: route.request().method(), origin: url.origin, path: url.pathname });
      if (/\/(?:manifest|repair-versions)\.json$/.test(url.pathname) &&
          (url.origin !== base.origin || /\/audio[^/]*\//.test(url.pathname))) {
        return route.fulfill({ json: {}, headers: cors });
      }
      if (/\.(?:mp3|wav|ogg|m4a|aac|flac)$/i.test(url.pathname) || route.request().resourceType() === "media") {
        return route.fulfill({ status: 204, headers: cors });
      }
      if (url.origin === base.origin) return route.continue();
      return route.fulfill({ status: 204, headers: cors });
    });
    await context.addInitScript(install, {
      key: `${storage}-progress-v1`,
      progress: {
        ...returnedPlayer, place: { zone: "town", ...clearGround }, coach: { done: true, run: true, view: true, seen: { list: true } },
        settings: { ...returnedPlayer.settings, play: mode, cameraFollow: false, textSize: 1, textMessages: false,
          scenes: mode === "light", lt: true, ltNatural: false, hintsOpen: true, volume: 0, sounds: 0 },
      },
    });
    page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.origin === base.origin && lazyPadAsset.test(url.pathname)) padRequests.push(url.pathname);
    });
    if (checkpoint.startsWith("light-portal")) {
      page.on("response", (response) => {
        if (response.ok() && response.request().resourceType() === "script" && new URL(response.url()).origin === base.origin) {
          modules.push(response);
        }
      });
    }
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    page.on("console", (message) => {
      // (also the base's React dev notice for SceneBackdrop's lowercase fetchpriority, present before A10)
      if (message.type() === "error" && !/^\s*(?:\[audio\]\s*)?Missing (?:audio )?clip\b/i.test(message.text()) &&
          !/Invalid DOM property `%s`\. Did you mean `%s`\? fetchpriority fetchPriority/.test(message.text())) {
        errors.push(`console: ${message.text()}`);
      }
    });
    await page.goto(base.href, { waitUntil: "domcontentloaded", timeout: 90000 });
    const state = () => page.evaluate(readState);
    const step = async (count = 1, dt = 1000 / 60) => {
      const frames = [];
      for (let i = 0; i < count; i += 6) {
        const n = Math.min(6, count - i);
        frames.push(...await page.evaluate(([n, dt]) => window.__step(n, dt), [n, dt]));
        frame += n;
        await turn();
      }
      return frames;
    };
    async function until(name, test, { timeout = 8000, frames = 4 } = {}) {
      const end = Date.now() + timeout;
      do {
        if (errors.length) assert.fail(`${name}: ${JSON.stringify(errors)}`);
        const result = await test();
        if (result) return result;
        if (frames) await step(frames);
        await turn(15);
      } while (Date.now() < end);
      assert.fail(`${name} timed out: ${JSON.stringify(await state())}`);
    }
    const when = (name, predicate, options) => until(name, () => state().then(predicate), options);
    const sample = (axes = [0, 0, 0, 0], buttons = {}) => {
      action({ axes, buttons });
      return page.evaluate(([axes, buttons]) => window.__padFixture.sample(axes, buttons), [axes, buttons]);
    };
    const press = (key) => sample(undefined, { [button[key]]: 1 });
    const tap = async (key) => {
      await press(key);
      await step();
      await sample();
      await step(2);
    };
    const attach = (mapping, held) => {
      action({ connect: mapping ?? "standard", held });
      return page.evaluate(([mapping, held]) => window.__padFixture.attach(mapping, held), [mapping, held]);
    };
    const detach = () => {
      action("disconnect");
      return page.evaluate(() => window.__padFixture.detach());
    };
    const duplicate = (type) => page.evaluate((type) => window.__padFixture.dispatch(type), type);
    const focused = (selector) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);
    // The controls are reached through pad edges even if an optional tool contributes a navigation stop.
    async function focusWith(selector, key = "Down", limit = 12) {
      const reverse = { Down: "Up", Up: "Down", Right: "Left", Left: "Right" }[key];
      for (const direction of [key, reverse]) {
        for (let i = 0; i < limit && !(await focused(selector)); i++) {
          const previous = (await state()).pad.focusTarget;
          await tap(direction);
          if (previous && previous === (await state()).pad.focusTarget) break;
        }
        if (await focused(selector)) break;
      }
      check(`focus reaches ${selector}`, await focused(selector), await state());
    }
    await until("returned player is ready", () => page.evaluate((mode) => {
      const { game, store } = window.__ew ?? {};
      return store?.getState().screen === "play" && (mode === "light"
        ? game?.light && !!document.querySelector('.lh[data-pad-scope="home"]')
        : game?.ledges?.ready && !game.transitioning && !!document.querySelector(".toolbar"));
    }, mode), { timeout: 120000, frames: 3 });
    assert.deepEqual(await checkEdition(page), { TL: "es", HL: learner });
    const profile = await page.evaluate(async () => {
      const { EDITION } = await import("/tests/browser/fixtures/quest-content.mjs");
      return { target: EDITION.target, helper: EDITION.helper, title: document.title, documentLanguage: document.documentElement.lang,
        save: JSON.parse(localStorage.getItem("puerto-colibri-progress-v1"))?.version,
        variety: localStorage.getItem("puerto-colibri-variety") };
    });
    check("the local app is Puerto Colibrí with the selected helper and Mexican Spanish target",
      profile.target === "es-MX" && profile.helper === learner && profile.documentLanguage === learner &&
      profile.title === "Puerto Colibrí" && profile.save === 1 && profile.variety === "default", profile);

    await page.evaluate(() => window.__ew.coach?.finish());
    phase = checkpoint;
    await contract({
      context, page, mobile, step, state, until, when, sample, press, tap, attach, detach, duplicate,
      focused, focusWith, check, shot, padRequests, modules, action, mark: (name) => { phase = name; },
    });
    check("no page or console errors", errors.length === 0, errors);
  } catch (error) {
    const snapshot = page ? await page.evaluate(readState).catch(() => null) : null;
    if (page && shots) await shot("failure").catch(() => {});
    failure = new Error(`${label} · ${phase}\n${JSON.stringify({ frame, actions, snapshot, errors, external, padRequests })}`, { cause: error });
    throw failure;
  } finally {
    console.log(label, "attempted external requests (intercepted)", JSON.stringify(external));
    await context?.close().catch((error) => {
      if (!failure) throw new Error(`${label} · closing context`, { cause: error });
      console.error(`${label} · closing context`, error);
    });
  }
}

async function inspectHint(h, kind, map, extra = "", surface = null) {
  const { page, until, check } = h;
  const [on, off, move, look, jump, use, choose, back] = labels;
  const expected = map === "world" ? [["L", move], ["R", look], ["A", jump], ["X", use]]
    : [["✚/L", move], ["A", choose], ["B", back]];
  const status = kind === "connected" ? on : off;
  await until(`${kind} hint has its status`, () => page.evaluate(([selector, status]) =>
    document.querySelector(selector)?.textContent === status, [`${padHint} strong`, status]), { frames: 0, timeout: 1500 });
  const result = await page.evaluate(([selector, extra, surface]) => {
    const cards = [...document.querySelectorAll(selector)];
    const card = cards[0];
    if (!card) return { count: cards.length };
    const box = card.getBoundingClientRect();
    const style = getComputedStyle(card);
    const safe = document.createElement("div");
    safe.style.cssText = "position:fixed;visibility:hidden;inset:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.append(safe);
    const inset = safe.getBoundingClientRect();
    safe.remove();
    const within = (r, b) => r.width > 0 && r.height > 0 && r.left >= b.left - 1 && r.top >= b.top - 1
      && r.right <= b.right + 1 && r.bottom <= b.bottom + 1;
    const drawn = (el) => el.getClientRects().length && getComputedStyle(el).visibility === "visible";
    const onScreen = (el) => {
      if (!drawn(el) || el.closest("[inert], [hidden], [aria-hidden=true]")) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.right > inset.left && r.bottom > inset.top &&
        r.left < inset.right && r.top < inset.bottom;
    };
    const panel = document.querySelector(".overlay > :is(.sheet, .phone)");
    const task = panel && within(box, panel.getBoundingClientRect()) ? "" : ".objective-card";
    const selectors = [".toolbar", ".joy", ".jump-btn", ".act-btn", ".ride-menu", ".prompt", ".zone-banner",
      ".town-toasts .toast", ".coach", task, extra].filter(Boolean).join(",");
    const controls = [...document.querySelectorAll(selectors)].filter(drawn);
    const root = surface && document.querySelector(surface.root);
    const choice = root && [...root.querySelectorAll(surface.choice)].find((el) =>
      !el.matches(":disabled, [aria-disabled=true]") && onScreen(el));
    const focused = root?.contains(document.activeElement) && onScreen(document.activeElement) ? document.activeElement : null;
    const back = root && [...root.querySelectorAll("[data-pad-back]")].find(onScreen);
    for (const el of [choice, focused, back]) if (el) controls.push(el);
    if (root) {
      for (const el of root.querySelectorAll("button, input, select, textarea, summary, a[href]")) {
        if (!onScreen(el)) continue;
        const r = el.getBoundingClientRect();
        if (el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2))) controls.push(el);
      }
    }
    const obstacles = controls.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
    }).map((el) => el.className);
    const g = window.__ew.game;
    if (g?.player?.root.visible && g.rig?.cam && !root) {
      const p = g.player.root.position;
      const points = [0, 0.9, 1.7].map((y) => p.clone().add(p.clone().set(0, y + (g.player.lift ?? 0), 0)).project(g.rig.cam));
      const avatar = points.map((q) => ({ x: (q.x + 1) * innerWidth / 2, y: (1 - q.y) * innerHeight / 2 }));
      if (avatar.some(({ x, y }) => x + 12 > box.left && x - 12 < box.right && y + 6 > box.top && y - 6 < box.bottom)) {
        obstacles.push({ avatar });
      }
    }
    const map = card.querySelector(".pad-hint-map");
    const labels = [...map.querySelectorAll("span")].map((el) => {
      const key = el.querySelector("b");
      return [key.textContent, el.textContent.slice(key.textContent.length).trim()];
    });
    const textFits = [...card.querySelectorAll("strong, .pad-hint-map b, .pad-hint-map span")].every((el) => {
      const range = document.createRange();
      range.selectNodeContents(el);
      return [...range.getClientRects()].every((r) => within(r, box));
    });
    return {
      count: cards.length, kind: card.dataset.padHint, status: card.querySelector("strong").innerText,
      columns: labels, menuKey: map.querySelector(":scope > b")?.innerText ?? null,
      role: card.getAttribute("role"), live: card.getAttribute("aria-live"),
      atomic: card.getAttribute("aria-atomic"), pointerEvents: style.pointerEvents,
      box: box.toJSON(), safe: within(box, inset), textFits, obstacles,
      mapSize: parseFloat(getComputedStyle(map).fontSize),
      statusSize: parseFloat(getComputedStyle(card.querySelector("strong")).fontSize),
      accentWidth: style.borderInlineStartWidth, accentColor: style.borderInlineStartColor, radius: style.borderRadius,
      visible: !!drawn(card) && Number(style.opacity) > 0,
      choice: choice?.textContent.trim(), back: back?.getAttribute("aria-label") ?? back?.textContent.trim(),
      overflow: card.scrollWidth - card.clientWidth,
    };
  }, [padHint, extra, surface]);
  check(`${kind} hint has one visible status and paired map`, result.count === 1 && result.kind === kind &&
    result.status === status && result.visible && result.role === "status" && result.live === "polite" && result.atomic === "true" &&
    JSON.stringify(result.columns) === JSON.stringify(expected) && result.menuKey === (map === "menu" ? "☰" : null), result);
  check(`${kind} hint stays in the safe area, clear of current controls`, result.safe && result.textFits &&
    result.overflow <= 1 && result.statusSize >= 14 && result.mapSize >= 12 && result.box.width <= 269 && result.box.height <= 140 &&
    result.pointerEvents === "none" && result.obstacles.length === 0 && (!surface || (result.choice && result.back)), result);
  check(`${kind} keeps the rounded cream card's teal accent`, result.accentWidth === "3px" &&
    result.accentColor === "rgb(8, 124, 120)" && result.radius === "12px", result);
  return result;
}

async function sameNotice(h, live, kind) {
  const lifecycle = await live.evaluate((card, kind) => ({
    same: card === document.querySelector("[data-pad-hint]"),
    ...window.__padFixture.notices.findLast((notice) => notice.kind === kind),
  }), kind);
  h.check(`${kind} kept the same mounted status with one announcement write`, lifecycle.same &&
    lifecycle.removed === null && lifecycle.unmounts === 0 && lifecycle.writes === 1, lifecycle);
}

async function hintExpires(h, kind, milliseconds) {
  const gone = await h.until(`${kind} hint expires on the wall clock`, () => h.page.evaluate((kind) => {
    const notice = window.__padFixture.notices.findLast((notice) => notice.kind === kind);
    return notice?.removed != null ? notice : null;
  }, kind),
  { timeout: milliseconds + 1500, frames: 0 });
  const duration = gone.removed - gone.shown;
  h.check(`${kind} hint expires around ${milliseconds} ms`, duration >= milliseconds - 150 && duration <= milliseconds + 900 &&
    await h.page.locator(padHint).count() === 0, { duration });
}

async function hintAtLargeText(h) {
  const { page, until } = h;
  await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
  await until("the app applies the 130% text setting", () => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--scale").trim() === "1.3"));
}

async function realMovement(h) {
  const { context, page, mobile } = h;
  if (!mobile) return {
    down: () => { h.action("W down"); return page.keyboard.down("w"); },
    up: () => { h.action("W up"); return page.keyboard.up("w"); },
  };
  const cdp = await context.newCDPSession(page);
  const touch = (type, touchPoints = []) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  return {
    async down() {
      h.action("finger down and drag");
      const box = await page.locator(".joy").boundingBox();
      assert(box, "The touch joystick is available");
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
      await touch("touchStart", [point]);
      await touch("touchMove", [{ ...point, y: point.y - 42 }]);
    },
    up: () => { h.action("finger release"); return touch("touchEnd"); },
  };
}

async function existingMovement(h, real, label) {
  const before = await h.state();
  await real.down();
  let moving;
  try {
    await h.step(30);
    moving = await h.state();
    h.check(`${label} moves with a real ${h.mobile ? "finger drag" : "W key"}`, horizontal(before, moving) > 0.65, { before, moving });
  } finally {
    await real.up();
  }
  const neutral = await h.page.evaluate(() => {
    const g = window.__ew.game;
    return { joy: { ...g.joy }, key: g.keys.has("w") };
  });
  h.check(`${label} releases the original input`, !neutral.key && neutral.joy.x === 0 && neutral.joy.y === 0, neutral);
  await h.step(38);
  const stop = await h.state();
  await h.step(20);
  const settled = await h.state();
  h.check(`${label} settles after release`, horizontal(stop, settled) < 0.05, { stop, settled });
}

async function place(h, spawn = clearGround) {
  await h.page.evaluate((spot) => window.__ew.game.enterZone("town", spot, true), spawn);
  await h.step(20);
}

async function watchNeutralDraws(page) {
  return page.evaluateHandle(() => {
    const { game: g } = window.__ew;
    const { pad, renderer, scene } = g;
    const { cam } = g.rig;
    const tick = pad.tick;
    const restore = () => { pad.tick = tick; };
    let measurement;
    function render() {
      renderer.render(scene, cam);
      return {
        calls: renderer.info.render.calls,
        connected: window.__pad.connected,
        frame: {
          time: g.t, clock: performance.now(), zone: g.zone.id, scene: g.scene.uuid, camera: g.rig.cam.uuid,
          view: cam.matrixWorldInverse.toArray(), projection: cam.projectionMatrix.toArray(),
          player: g.player.root.position.toArray(),
          buffer: [renderer.domElement.width, renderer.domElement.height, renderer.getPixelRatio()],
          target: renderer.getRenderTarget()?.texture.uuid ?? null,
          shadows: renderer.shadowMap.enabled, toneMapping: renderer.toneMapping,
        },
      };
    }
    const without = render();
    // After the lazy load, the scheduled tick connects on a zero-time frame. Sample before the town update
    // so the renderer sees the same world as it did before the device was attached.
    pad.tick = function (dt) {
      tick.call(this, dt);
      if (!window.__pad.connected) return;
      const withPad = render();
      const { x, y, rx, ry, throttle, brake } = pad.input;
      measurement = { without, withPad, inputs: [x, y, rx, ry, throttle, Number(brake)], delta: withPad.calls - without.calls };
      restore();
    };
    return {
      restore,
      connect() {
        if (!pad.input) return false;
        window.__step(1, 0);
        return measurement;
      },
    };
  });
}

async function idleAndAttach(h) {
  const real = await realMovement(h);
  const { page, step, state, check, attach, until, duplicate, sample, shot } = h;
  h.mark("town baseline");
  await place(h);
  const ground = await page.evaluate(({ x, z }) => {
    const g = window.__ew.game;
    const open = (px, pz) => g.zone.nav.free(g.zone.nav.idx(px, pz)) && !g.zone.colliders.blocked(px, pz, 0.38);
    // The corridor the walking, running and released-stick checks use.
    const corridor = [];
    // (rot π walks toward -z: 4.5 m ahead, 2 m behind, 0.5 m to each side of the line)
    for (let d = -4.5; d <= 2; d += 0.5) for (const side of [-0.5, 0, 0.5]) if (!open(x + side, z + d)) corridor.push([x + side, z + d]);
    return { nav: g.zone.nav.free(g.zone.nav.idx(x, z)), body: !g.zone.colliders.blocked(x, z, 0.38), floor: g.hop.y,
      pose: g.player.root.position.toArray(), corridor };
  }, clearGround);
  check("the PC clear ground and its walking corridor are open", ground.nav && ground.body && Math.abs(ground.floor) < 0.05 &&
    ground.corridor.length === 0, ground);
  const before = await state();
  const quiet = await step(60);
  const idle = await state();
  check("60 quiet frames leave position, focus, and controller polling alone", before.polls >= 1 && idle.polls === before.polls &&
    !idle.hint && idle.focus.tag === "BODY" && horizontal(before, idle) < 0.05 && Math.abs(angle(before.yaw, idle.yaw)) < 0.02 &&
    quiet.every(({ polls }) => polls === 0) && h.padRequests.length === 0 &&
    JSON.stringify(idle.pad) === JSON.stringify({ connected: false, lastAction: null, focusTarget: null }), { before, idle });
  await shot("baseline");
  await existingMovement(h, real, "without a controller");
  await place(h);
  h.mark("neutral attach");
  const neutral = await state();
  const drawProbe = await watchNeutralDraws(page);
  let draws;
  const hudBefore = await hudGeometry(h);
  try {
    await attach();
    draws = await until("first Standard pad sample after lazy readiness",
      () => drawProbe.evaluate((probe) => probe.connect()), { frames: 0 });
  } finally {
    await drawProbe.evaluate((probe) => probe.restore());
    await drawProbe.dispose();
  }
  check("a neutral pad adds zero draws at the same town checkpoint", draws && !draws.without.connected && draws.withPad.connected &&
    draws.inputs.every((value) => value === 0) && draws.without.frame.zone === "town" && Number.isFinite(draws.without.frame.time) &&
    JSON.stringify(draws.without.frame) === JSON.stringify(draws.withPad.frame) &&
    draws.without.calls > 0 && draws.withPad.calls > 0 && draws.delta === 0, draws);
  await duplicate("gamepadconnected");
  await step(5);
  const connected = await state();
  check("the first six samples preserve focus and the grounded player", connected.focus.tag === neutral.focus.tag &&
    connected.pad.focusTarget === null && connected.pad.lastAction === null && !connected.hop.air &&
    horizontal(neutral, connected) < 0.05, { neutral, connected });
  await inspectHint(h, "connected", "world");
  await shot("connect");
  const frames = await step(20);
  check("town samples once on each of 20 stable host frames", frames.every((frame) => frame.polls === 1 && frame.callbacks === 1) &&
    (await state()).polls - connected.polls === 20, frames);
  await hintExpires(h, "connected", 3200);
  assert.deepEqual(await hudGeometry(h), hudBefore, "the town controls keep their dimensions after expiry");
  await shot("connect-expired");
  check("a duplicate connection produces one announcement", await page.evaluate(() =>
    window.__padFixture.notices.filter((n) => n.kind === "connected").length === 1));
  await existingMovement(h, real, "with a neutral controller");
  await place(h);
  const rest = await state();
  await sample([0.12, 0, 0.12, 0]);
  await step(20);
  const wobble = await state();
  check("0.12 stick wobble stays inside the movement and look dead zones", horizontal(rest, wobble) < 0.05 &&
    Math.abs(angle(rest.yaw, wobble.yaw)) < 0.02, { rest, wobble });
  await sample();
  await step(2);
}

async function deviceErrors(h) {
  const { page, step, state, attach, detach, check, until } = h;
  await place(h);
  const probe = await state();
  await attach("");
  await step(8);
  check("a nonstandard device produces no hint or frame polling", await page.locator(padHint).count() === 0 &&
    (await state()).polls === probe.polls && !(await state()).pad.connected);
  await detach();
  await page.evaluate(() => {
    window.__padFixture.failReads(true);
    window.dispatchEvent(new Event("focus"));
  });
  const threw = await state();
  check("a throwing native API remains idle after the guarded focus probe",
    (await step(8)).every(({ polls }) => polls === 0) && !(await state()).pad.connected && threw.polls > probe.polls, threw);
  await page.evaluate(() => window.__padFixture.failReads(false));
  // Attach and remove a Standard pad within one event-loop turn, before the lazy module settles.
  await page.evaluate(() => {
    window.__padFixture.attach();
    window.__padFixture.detach();
  });
  const afterStale = await state();
  await step(20);
  check("a connection removed during the lazy load leaves the town idle", await page.locator(padHint).count() === 0 &&
    !(await state()).pad.connected && (await state()).polls === afterStale.polls);
  await until("the rejected device's dynamic request has settled", async () => {
    if (!h.padRequests.some((p) => p.endsWith("/src/game/gamepad.ts"))) return false;
    await page.evaluate(async () => { await import("/src/game/gamepad.ts"); });
    return true;
  }, { frames: 0 });
  const frames = await step(20);
  const ended = await state();
  check("completed loading cannot revive a removed device",
    frames.every((f) => f.polls === 0) && ended.polls === afterStale.polls && ended.deviceReads === afterStale.deviceReads &&
    !ended.pad.connected && !ended.pad.focusTarget && !ended.hint && horizontal(probe, ended) < 0.05 &&
    Math.abs(angle(probe.yaw, ended.yaw)) < 0.02, ended);
}

async function walkLookJump(h) {
  const { state, step, sample, press, check, shot, when } = h;
  h.mark("walk and look");
  await connect(h);
  await place(h);
  const start = await state();
  await sample([0, -0.80, 0, 0]);
  const walks = [];
  for (const [frame, advance] of [[1, 1], [15, 14], [45, 30]]) {
    await step(advance);
    walks.push(await state());
    await shot(`walk-${frame}`);
  }
  const [first, mid, walked] = walks;
  const dx = walked.pos[0] - start.pos[0], dz = walked.pos[2] - start.pos[2];
  const forward = (dx * start.view[0] + dz * start.view[2]) / Math.hypot(start.view[0], start.view[2]);
  check("left stick moves forward relative to the rendered camera over frames 1, 15 and 45",
    horizontal(start, walked) > 1 && forward > 1 && horizontal(start, first) < horizontal(start, mid) &&
    horizontal(start, mid) < horizontal(start, walked), { start, first, mid, walked, forward });
  await sample();
  await step(45);
  const still = await state();
  await sample([0, 0, 0.85, 0]);
  const views = [];
  for (const [frame, advance] of [[1, 1], [15, 14], [30, 15]]) {
    await step(advance);
    views.push(await state());
    await shot(`look-${frame}`);
  }
  const looked = views.at(-1);
  check("right stick turns the rig and rendered view clockwise while the player stays put",
    angle(still.yaw, looked.yaw) < -0.35 && angle(viewYaw(still), viewYaw(looked)) < -0.35 &&
    horizontal(still, looked) < 0.08, { still, views });
  await sample();
  await step(20);

  const pitchStart = await state();
  await sample([0, 0, 0, 0.8]);
  await step(16);
  await sample();
  // The rendered arm follows the rig's pitch on the camera's existing spring: let it arrive before reading the view.
  await step(30);
  const pitchEnd = await state();
  check("positive right Y increases rig pitch and lowers the rendered look direction",
    pitchEnd.pitch > pitchStart.pitch + 0.08 && pitchEnd.view[1] < pitchStart.view[1] - 0.04 &&
    horizontal(pitchStart, pitchEnd) < 0.08, { pitchStart, pitchEnd });
  await sample();
  await step(25);
  const pace = async (y) => {
    await place(h);
    const start = await state();
    await sample([0, y, 0, 0]);
    await step(35);
    const end = await state();
    await sample();
    await step(45);
    return { speed: end.speed, travel: horizontal(start, end) };
  };
  const walk = await pace(-0.8);
  const run = await pace(-0.98);
  check("the outer stick runs faster over the same ground and frame count", run.travel > walk.travel * 1.25 &&
    run.speed > walk.speed * 1.25, { walk, run });
  await place(h);
  h.mark("jump edges");
  const ground = await state();
  await press("A");
  await step(4);
  const rise = await state();
  check("A lifts the player within four frames", rise.hop.air && Number.isFinite(ground.jumpY) &&
    Number.isFinite(rise.jumpY) && rise.jumpY > ground.jumpY + 0.1, { ground, rise });
  await shot("jump-4");
  await step(2);
  const held = await state();
  check("holding A through frame 5 adds no flip", !held.hop.flipped && !held.hop.doubled &&
    Number.isFinite(held.jumpY), held);
  await sample();
  await step(1);
  await press("A");
  await step(1);
  const flip = await state();
  check("the frame 7 edge makes one flip", flip.hop.air && flip.hop.flipped && !flip.hop.doubled &&
    Number.isFinite(flip.jumpY), flip);
  await shot("jump-flip-7");
  await sample();
  await step(6);
  await press("A");
  await step(1);
  const double = await state();
  check("the frame 14 edge makes a double", double.hop.air && double.hop.doubled && Number.isFinite(double.jumpY), double);
  await shot("jump-double-14");
  await sample();
  let peak = double.jumpY;
  await when("the high jump lands", (s) => {
    assert(Number.isFinite(s.jumpY), `the high jump has a finite rendered height: ${JSON.stringify(s)}`);
    peak = Math.max(peak, s.jumpY);
    return !s.hop.air;
  }, { frames: 2 });
  const landed = await state();
  check("the high jump peaks above 1.5 m and lands back on the same ground",
    peak - ground.jumpY > 1.5 && Number.isFinite(landed.jumpY) && Math.abs(landed.jumpY - ground.jumpY) < 0.05,
    { peak, ground, landed });
  check("the root lands at its original support height and horizontal position",
    Math.abs(landed.pos[1] - ground.pos[1]) < 0.05 &&
    horizontal(ground, landed) < 0.05, { peak, ground, landed });
  await shot("jump-landed");
}

async function carContract(h) {
  const { page, state, step, sample, tap, when, until, check, shot } = h;
  const counts = await playCounts(h);
  await connect(h);
  h.mark("car boarding");
  const car = await page.evaluate(() => {
    const g = window.__ew.game;
    const cars = g.rides.list.filter((r) => r.kind === "car");
    const valeria = cars.find((r) => r.id === "park" && r.home.x === 80.5 && r.home.z === -11.8);
    const parked = g.town.parkedCars?.placements ?? [];
    // As in moves.mjs, leave room to move ahead of the parked car, including past roadside models.
    for (const r of [valeria, ...cars.filter((r) => r !== valeria)].filter(Boolean)) {
      const m = r.m;
      const side = { x: m.x + Math.cos(m.heading) * 2.2, z: m.z - Math.sin(m.heading) * 2.2, rot: m.heading };
      if (!g.town.walkableAt(side.x, side.z) || g.rides.near(side.x, side.z) !== r) continue;
      const clear = [2, 4, 6, 8].every((d) => {
        const x = m.x + m.fx * d, z = m.z + m.fz * d;
        return g.rides.drivable.has(x, z) && !g.zone.colliders.blocked(x, z, m.spec.wide + 0.15) &&
          !parked.some((p) => Math.hypot(x - p.x, z - p.z) < 2.8) &&
          !cars.some((p) => p !== r && g.rides.reach(p, x, z) < 1.5);
      });
      if (clear) {
        g.enterZone("town", side, true);
        return { id: r.id, side };
      }
    }
    return null;
  });
  check("a real car has a reachable door and a clear stretch ahead", car);
  await when("drive prompt beside the selected car", (s) => s.prompt === "drive");
  // Carry the physical trigger through boarding. It must be released at the wheel before it can drive.
  await sample(undefined, { [button.X]: 1, [button.RT]: 0.85 });
  await step();
  await sample(undefined, { [button.RT]: 0.85 });
  await when("X boards the selected car", (s) => s.ride?.id === car.id && s.phase === "on" && s.prompt === "out");
  await step(12);
  const boarded = await state();
  check("X boards the selected car without carrying the held throttle into the ride", boarded.ride?.id === car.id &&
    boarded.phase === "on" && Math.abs(boarded.speed) < 0.1, boarded);
  await assertRideOut(h);
  const lane = () => page.evaluate(() => {
    const g = window.__ew.game;
    const r = g.rides.riding;
    const { m } = r;
    const owners = r.owners.every((o) => {
      const p = o.ch.root.position;
      const dx = p.x - m.x, dz = p.z - m.z;
      return o.state !== "in" && o.state !== "hop-out" && g.rides.reach(r, p.x, p.z) > 0.3 &&
        (dx * m.fx + dz * m.fz < 0 || Math.abs(dx * m.fz - dz * m.fx) > 1.6);
    });
    const traffic = g.ambient.carAhead(m.x, m.z, m.fx, m.fz, 20, m.spec.wide + 0.35).gap;
    return { owners, lead: Number.isFinite(traffic) ? traffic : null, waiting: g.rides.waitingForTraffic,
      road: g.rides.asphalt.has(m.x, m.z), legalExit: !!g.rides.carExit(r) };
  });
  let blockedSamples = 0;
  const clear = await until("owners and traffic clear the driving lane", async () => {
    const clear = await lane();
    if (clear.owners && !clear.waiting && (clear.lead === null || clear.lead > 12)) return clear;
    blockedSamples++;
    return false;
  }, { timeout: 25000, frames: 6 });
  const ready = await state();
  check("the held boarding trigger stays disarmed while the lane clears", ready.ride.id === car.id &&
    ready.phase === "on" && Math.abs(ready.speed) < 0.1 && rideTravel(boarded, ready) < 0.3,
    { boarded, ready, clear, blockedSamples });
  await shot("car-board");

  h.mark("car drive and turn");
  await sample();
  await step(2);
  await sample(undefined, { [button.RT]: 0.85 });
  await step(54);
  const driven = await state();
  check("RT alone builds forward speed and moves the selected car", driven.speed > 1 && rideTravel(ready, driven) > 0.5,
    { ready, driven, lane: await lane() });
  await shot("car-drive");
  await sample([0.55, 0, 0, 0], { [button.RT]: 0.85 });
  await step(24);
  const steered = await state();
  check("left stick steers the moving car right", steered.speed > 0 && steered.ride.steer > 0 &&
    angle(driven.ride.heading, steered.ride.heading) < -0.03, { driven, steered });
  await shot("car-steer");

  h.mark("car coast versus LT");
  await sample();
  const restart = await page.evaluateHandle(() => {
    const g = window.__ew.game;
    const m = g.rides.riding.m;
    const snapshot = { ...m };
    return () => {
      g.rides.resetPosition(g.rides.riding, { x: snapshot.x, z: snapshot.z, rot: snapshot.heading });
      Object.assign(m, snapshot);
    };
  });
  const coastGround = await lane();
  await step(5);
  const coast = await state();
  await restart.evaluate((restore) => restore());
  await restart.dispose();
  const brakeStart = await state();
  const brakeGround = await lane();
  await sample(undefined, { [button.LT]: 1 });
  await step(5);
  const brake = await state();
  check("the first five LT frames lose more speed than five coasting frames on the same surface",
    coast.speed > 1 && steered.speed >= coast.speed && brakeStart.speed === steered.speed &&
    rideTravel(steered, brakeStart) < 1e-6 && angle(steered.ride.heading, brakeStart.ride.heading) === 0 &&
    brakeStart.speed - brake.speed > steered.speed - coast.speed &&
    coastGround.road === brakeGround.road && !coastGround.waiting && !brakeGround.waiting,
    { steered, coast, brake, coastGround, brakeGround });
  await shot("car-brake");
  let reverse = brake.speed;
  for (let i = 5; i < 60; i += 5) {
    await step(5);
    reverse = Math.min(reverse, (await state()).speed);
  }
  const stopped = await state();
  check("LT by itself brakes to a stop and stays out of reverse",
    stopped.speed <= coast.speed / 2 && Math.abs(stopped.speed) < 0.25 && reverse >= -0.02, { coast, stopped, reverse });

  h.mark("car blur and leave");
  const blur = () => page.evaluate(() => window.dispatchEvent(new Event("blur")));
  const focus = () => page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await blur(); // LT is still physically held.
  await sample(undefined, { [button.LT]: 1, [button.RT]: 0.85 });
  const blurred = await step(12);
  check("blur suspends pad polls and the car remains still", blurred.every((f) => f.polls === 0) &&
    Math.abs((await state()).speed) < 0.25, await state());
  await sample(undefined, { [button.LT]: 1 });
  await focus();
  await step(4); // RT reads neutral. LT has had no release since blur.
  const resumed = await state();
  await sample(undefined, { [button.LT]: 1, [button.RT]: 0.85 });
  await step(25);
  const rolling = await state();
  check("a fresh RT works after focus returns while old LT stays disarmed",
    rolling.speed > 0.8 && rideTravel(resumed, rolling) > 0.1, { resumed, rolling });
  await sample();
  await step(2);
  await sample(undefined, { [button.LT]: 1 });
  await step(25);
  check("releasing and pressing LT again brakes the car", Math.abs((await state()).speed) < 0.25, await state());
  await sample();
  await step(2);
  await until("a stopped car has a legal step out", async () => (await lane()).legalExit);
  await tap("X");
  await when("X steps out of the parked car", (s) => !s.ride && s.visible && !s.swimming && !s.hop.air);
  check("X leaves the learner visible beside the car at ground level", (await state()).pos[1] < 0.1, await state());
  await shot("car-leave");
  await assertCount(h, counts, "rides", "car");
}

async function boatContract(h, id) {
  const { page, state, step, sample, tap, when, check, shot } = h;
  const counts = await playCounts(h);
  await connect(h);
  h.mark("boat boarding");
  const boat = await page.evaluate((id) => {
    const g = window.__ew.game;
    const r = g.rides.list.find((r) => r.id === id && r.kind === "boat");
    if (!r) return null;
    // rides.mjs searches the live hull's approach points, including raised piers.
    for (let a = 0; a < Math.PI * 2; a += 0.2) for (const d of [2.4, 2.9, 3.3]) {
      const x = r.m.x + Math.cos(a) * d, z = r.m.z + Math.sin(a) * d;
      if (!g.town.walkableAt(x, z) || g.rides.near(x, z) !== r) continue;
      g.enterZone("town", { x, z, rot: r.m.heading }, true);
      return { id: r.id, x, z, home: [r.home.x, r.home.z] };
    }
    return null;
  }, id);
  check("there is a walkable approach to a town hull", boat);
  assert.deepEqual(boat.home, id === "muelle" ? [-11.5, -74.3] : [11.5, -74.5]);
  await when("boat prompt at the hull", (s) => s.prompt === "boat");
  await tap("X");
  await when("X boards the selected hull", (s) => s.ride?.id === boat.id && s.phase === "on" && s.prompt === "out");
  await step(10);
  const moored = await state();
  check("X seats the learner in the identified boat", moored.ride?.id === boat.id && moored.visible, moored);
  await assertRideOut(h);
  await shot("boat-board");

  h.mark("boat propulsion and steering");
  await sample([0, -0.9, 0, 0]);
  await step(65);
  const underway = await state();
  check("left stick moves the boat out from the hull's boarding point", rideTravel(moored, underway) > 0.5 && underway.speed > 0.5,
    { moored, underway });
  await sample([0.75, -0.55, 0, 0]);
  await step(52);
  const turned = await state();
  check("the deflected left stick turns the boat to the right", angle(underway.ride.heading, turned.ride.heading) < -0.12,
    { underway, turned });
  await shot("boat-turn");
  await sample(undefined, { [button.LT]: 1 });
  await when("boat comes within dismount speed", (s) => Math.abs(s.speed) < 0.45);
  await sample();
  await step(2);
  const exit = await page.evaluate(() => window.__ew.game.rides.boatExit(window.__ew.game.rides.riding).toArray());
  await tap("X");
  await when("X leaves the boat onto a legal surface or into the water", (s) => !s.ride && s.visible);
  const ashore = await state();
  check("the real dismount starts near the chosen legal exit", Math.hypot(ashore.pos[0] - exit[0], ashore.pos[2] - exit[2]) < 1.8,
    { exit, ashore });
  await shot("boat-leave");
  await assertCount(h, counts, "rides", "boat");
}

async function swimContract(h) {
  const { page, state, step, sample, tap, when, check, shot } = h;
  await connect(h);
  h.mark("beach and swimming");
  const waterModule = contentUrl(base.href, "game/water");
  const route = await page.evaluate(async (url) => {
    const { BAY, DECKS, FLOORS, SEA_LEVEL, SHORE, SWIM, floorY, seaBedY, waterY } = await import(url);
    const g = window.__ew.game;
    const boats = [...g.rides.list, ...g.rides.modeCars.keys()].filter((r) => r.kind === "boat");
    const nav = g.zone.nav;
    const land = new nav.constructor(nav.minX, nav.minZ, nav.minX + nav.cols * nav.cell,
      nav.minZ + nav.rows * nav.cell, nav.cell,
      { boxes: g.town.colliders.boxes.filter((box) => box.tag !== "sea"), circles: g.town.colliders.circles });
    const radius = 0.38; // Game.updatePlayer
    const z = SHORE.top + 3;
    const deep = SHORE.limit - 10;
    const end = deep - 1; // Include the remaining stroke and drift after the endpoint check.
    const samples = Math.ceil((z - end) / 0.5);
    const minSurface = SEA_LEVEL - (0.12 + 0.1 + 0.045); // water.ts swell amplitudes
    const diveDepth = SWIM.dive + 0.9;
    const surfaces = [...DECKS, ...FLOORS];
    const attempted = [];
    const detail = { z, deep, end, diveDepth, bay: BAY, attempted };

    function reject(x) {
      if (x - radius <= BAY.x0 || x + radius >= BAY.x1 || end <= BAY.z0 + 4) return { reason: "bay edge" };
      if (!g.town.walkableAt(x, z) || !nav.free(nav.idx(x, z)) || waterY(x, z, g.t) !== null || floorY(x, z) !== 0) {
        return { reason: "start is not dry walkable sand" };
      }
      const deck = surfaces.find((d) => x > d.x0 - radius && x < d.x1 + radius && z > d.z0 - radius && end < d.z1 + radius);
      if (deck) return { reason: "deck or raised floor crosses the lane", deck: [deck.x0, deck.x1, deck.z0, deck.z1] };
      const rock = g.rides.sea.circles.find((c) =>
        Math.hypot(x - c.x, Math.max(end - c.z, 0, c.z - z)) < c.r + radius);
      if (rock) return { reason: "rock or anchored boat crosses the lane", rock };
      for (let i = 0; i <= samples; i++) {
        const zz = z + (end - z) * i / samples;
        // The sea-tagged blocker stops passers-by. The player wades through it.
        if (zz >= SHORE.top && !land.free(land.idx(x, zz))) return { reason: "dry nav cell", z: zz };
        const lip = g.ledges.pieces?.find((p) => x > p.minX - radius && x < p.maxX + radius &&
          zz > p.minZ - radius && zz < p.maxZ + radius && p.top > floorY(x, zz) + 0.2);
        if (lip) return { reason: "ledge", z: zz, top: lip.top };
        // (Colliders.resolve lets the player wade through the sea-tagged passer-by blocker and leaves split pieces to
        // the ledge check above: only the other boxes and the circles stop the swimmer)
        if (g.town.colliders.boxes.some((b) => b.tag !== "sea" && !b.split && x > b.minX - radius && x < b.maxX + radius &&
            zz > b.minZ - radius && zz < b.maxZ + radius) ||
          g.town.colliders.circles.some((c) => Math.hypot(x - c.x, zz - c.z) < radius + c.r)) return { reason: "town collider", z: zz };
        const hull = boats.find((b) => g.rides.reach(b, x, zz) < radius);
        if (hull) return { reason: "live hull", id: hull.id, z: zz };
        if (zz < SHORE.limit && floorY(x, zz) !== seaBedY(x, zz)) return { reason: "coast or pool interrupts open water", z: zz };
      }
      for (const zz of [deep, deep - 0.5, end]) {
        const depth = minSurface - floorY(x, zz);
        if (depth < diveDepth) return { reason: "too shallow to dive at low swell", z: zz, depth };
      }
      return null;
    }

    for (const b of boats) {
      for (let distance = 1; distance <= 40; distance++) for (const side of [1, -1]) {
        const x = b.home.x + side * distance;
        const rejected = reject(x);
        if (!rejected) return { beach: { x, z, rot: Math.PI, limit: SHORE.limit }, mooring: b.id, ...detail };
        attempted.push({ mooring: b.id, x, ...rejected });
      }
    }
    return { beach: null, ...detail };
  }, waterModule);
  const { beach } = route;
  check("the town hull identifies an unobstructed beach-to-water line", beach, route);
  await place(h, beach);
  const dry = await state();
  check("the learner starts on dry sand and on foot", !dry.ride && !dry.swimming && dry.visible && !dry.hop.air &&
    Math.abs(dry.pos[1]) < 0.05, dry);
  await sample([0, -0.9, 0, 0]);
  await when("walk and wade into swimming depth", (s) => s.swimming && s.water === "swim", { timeout: 30000, frames: 6 });
  const water = await state();
  await step(40);
  const paddled = await state();
  check("the stick continues to move the learner after swimming begins",
    paddled.swimming && paddled.pos[2] < water.pos[2] - 0.5, { water, paddled });
  await shot("swimmer");
  await when("swimmer reaches deep water", (s) => s.swimming && s.pos[2] < beach.limit - 10, { timeout: 30000, frames: 6 });
  await sample();
  await step(18);
  const dive = await page.evaluate(async (url) => {
    const { SWIM, floorY, waterY } = await import(url);
    const { game: g } = window.__ew;
    const { x, z } = g.player.root.position;
    const surface = waterY(x, z, g.t);
    return { x, z, depth: surface === null ? null : surface - floorY(x, z), required: SWIM.dive + 0.9 };
  }, waterModule);
  check("the released swimmer is deep enough to dive", dive.depth !== null && dive.depth >= dive.required, dive);
  await tap("A");
  await when("A dives below the surface", (s) => s.water === "dive" && s.cameraY < -0.4);
  await shot("swimmer-dive");
  await tap("A");
  await when("a fresh A returns to the surface", (s) => s.water === "swim");
  check("a release-separated A pair dives and surfaces in water", (await state()).swimming, await state());
}

async function taxiCue(h, pad) {
  const { page, step, sample, press, tap, until, focused, focusWith, check } = h;
  h.mark("taxi cue focus");
  await place(h, { x: 121, z: -2.4, rot: Math.PI });
  await page.evaluate(() => {
    const { game, store } = window.__ew;
    store.getState().updateProgress((p) => {
      p.miniGameHelp = { ...p.miniGameHelp, taxi: { level: 1, streak: 0 } };
    });
    game.modeStart("taxi");
  });
  const choice = '.taxi-choice[data-line="tx_a_where"]';
  const reveal = ".taxi-cue .taxi-reveal";
  await until("the Taxi opening offers the question and a hidden cue", async () =>
    await page.locator(choice).isVisible() && await page.locator(reveal).isVisible(), { timeout: 25000 });
  if (pad) {
    await focusWith(choice);
    await tap("Menu");
    check("Menu focuses the Taxi reveal beside the spoken choice", await focused(reveal), await h.state());
    const cue = await page.locator(reveal).getAttribute("data-line");
    await tap("A");
    await until("A reveals the words for the same Taxi cue", async () =>
      await page.locator('.taxi-cue .taxi-line[lang="es"]').getAttribute("data-line").catch(() => null) === cue);
    await press("B");
    await step(16);
    check("held B leaves only the Taxi auxiliary focus and restores the question", await focused(choice), await h.state());
    await sample();
    await step(2);
    await tap("A");
  } else await physical(h, page.locator(choice));
  const taxi = () => page.evaluate(() => {
    const { game } = window.__ew;
    const { car, run } = game.modes.get("taxi");
    const { x, z, heading, steer, pace } = car.m;
    return { phase: run?.phase, seated: game.rides.phase === "on" && game.rides.riding === car, x, z, heading, steer, pace };
  });
  await until("the real Taxi enters its driving phase", async () => {
    const { phase, seated } = await taxi();
    return phase === "drive" && seated;
  }, { timeout: 25000 });
  await page.evaluate(() => {
    // Start the measurement at the same approach distance as the Taxi's retry pose.
    const { game } = window.__ew;
    const { car, route } = game.modes.get("taxi");
    const { at, via } = route.decisions[0];
    const from = via.at(-1) ?? route.start;
    const rot = Math.atan2(at.x - from.x, at.z - from.z);
    game.rides.resetPosition(car, { x: at.x - 14 * Math.sin(rot), z: at.z - 14 * Math.cos(rot), rot });
  });
  const assist = '.taxi-action[data-action="left"]';
  await until("the Taxi's first left-turn assist cue is visible", () => page.locator(assist).isVisible(), { timeout: 25000 });

  return { taxi, assist };
}

async function taxiContract(h) {
  const { page, sample, step, tap, press, until, focused, check, shot } = h;
  const counts = await playCounts(h);
  await connect(h);
  const { taxi, assist } = await taxiCue(h, true);
  h.mark("taxi steering and held assist");
  const ready = await taxi();
  await tap("Menu");
  const scenarios = `:is(${toolbar}) ${scenariosTool}`;
  await until("the Taxi tools restore their scenarios default", () => focused(scenarios));
  await sample([0.55, 0, 0, 0], { [button.RT]: 0.85, [button.B]: 1 });
  await step(16);
  const held = await taxi();
  check("B leaves the tools and held steering and throttle wait for neutral",
    held.phase === "drive" && held.pace < 0.1 && Math.abs(held.steer) < 0.1 &&
    !(await page.locator('.ride-menu[aria-expanded="true"]').count()), { ready, held });
  await sample();
  await step(2);
  await sample([0.55, 0, 0, 0], { [button.RT]: 0.85 });
  await step(24);
  const steered = await taxi();
  check("the idle Taxi cue leaves the real stick and throttle usable",
    await page.locator(assist).isVisible() && steered.steer > 0.2 && steered.pace > 0.5 &&
      angle(ready.heading, steered.heading) < -0.02, { ready, steered });
  await sample();
  await step(2);
  const before = await taxi();
  await press("A");
  await step(24);
  const assisted = await taxi();
  check("holding A drives and turns the Taxi left through the assist action",
    assisted.phase === "drive" && assisted.steer < -0.6 && assisted.pace > 0.5 &&
      angle(before.heading, assisted.heading) > 0.02 &&
      Math.hypot(assisted.x - before.x, assisted.z - before.z) > 0.15, { before, assisted });
  await shot("taxi-assist");
  await sample();
  await step(18);
  const released = await taxi();
  check("releasing A stops applying the Taxi assist while the cue stays visible",
    await page.locator(assist).isVisible() && Math.abs(released.steer) < Math.abs(assisted.steer) / 2,
    { assisted, released });
  await tap("B");
  await until("B returns from Taxi drive to town", async () => !(await taxi()).phase && !(await h.state()).transition);
  // Puerto Colibrí's Taxi counts a play when a ride reaches its result (game/taxi/mode.ts): leaving mid-ride adds none.
  await assertCounts(h, counts, []);
}

async function startScene(h, sit) {
  const { page, until, step, tap, check } = h;
  await until(`${sit} intro opens`, () => page.evaluate((selector) => !!document.querySelector(selector), intro));
  const primary = page.locator(`${intro} [data-pad-default]`);
  check("the scene has its actual enabled primary button", await primary.count() === 1 && await primary.isEnabled());
  const before = await page.evaluate(() => {
    const { conv } = window.__ew.store.getState();
    return { id: conv.sitId, intro: conv.introOpen, run: conv.run, lines: conv.transcript.length };
  });
  await primary.evaluate((el) => {
    window.__introClicks = 0;
    el.addEventListener("click", () => { window.__introClicks++; });
  });
  check("the selected scene is staged before A", before.id === sit && before.intro, before);
  await step(2); // Neutral is sampled in the intro scope before a fresh confirm.
  await tap("A");
  const after = await until("A clicks the primary and the real scene starts", () => page.evaluate(() => {
    const { conv } = window.__ew.store.getState();
    return !conv.introOpen && conv.active && conv.transcript.length > 0 &&
      { id: conv.sitId, run: conv.run, clicks: window.__introClicks, who: conv.transcript[0].who };
  }));
  check("one primary click begins the same conversation run", after.id === sit && after.run === before.run &&
    after.clicks === 1 && after.who === "npc", { before, after });
}

async function checkFocusRing(h, selector, key, scope = "convo") {
  const effect = await h.page.evaluate((selector) => {
    const f = document.activeElement;
    if (!f?.matches(selector)) return null;
    const css = getComputedStyle(f);
    const r = f.getBoundingClientRect();
    const rgb = (value) => value.match(/[\d.]+/g)?.map(Number) ?? [];
    const luminance = (value) => rgb(value).slice(0, 3).reduce((sum, n, i) => {
      const v = n / 255;
      return sum + [0.2126, 0.7152, 0.0722][i] * (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    }, 0);
    let background = css.backgroundColor;
    for (let el = f.parentElement; rgb(background)[3] === 0 && el; el = el.parentElement) {
      background = getComputedStyle(el).backgroundColor;
    }
    const ring = luminance(css.outlineColor);
    const fill = luminance(background);
    const contrast = (Math.max(ring, fill) + 0.05) / (Math.min(ring, fill) + 0.05);
    return {
      marked: f.hasAttribute("data-pad-focus"), scope: f.closest("[data-pad-scope]")?.dataset.padScope ?? null,
      key: window.__pad.focusTarget, width: parseFloat(css.outlineWidth), style: css.outlineStyle, contrast,
      color: css.outlineColor, offset: css.outlineOffset,
      inBounds: r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1,
      clipped: (() => {
        for (let parent = f.parentElement; parent; parent = parent.parentElement) {
          if (!/auto|scroll/.test(getComputedStyle(parent).overflowY)) continue;
          const clip = parent.getBoundingClientRect();
          if (r.top < clip.top - 1 || r.bottom > clip.bottom + 1) return true;
        }
        return false;
      })(),
      onTop: f.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
    };
  }, selector);
  h.check("the selected control has scoped focus and a visible, unobstructed contrast ring", effect?.scope === scope &&
    effect.key === key && effect.marked && effect.style === "solid" && effect.width >= 2 &&
    effect.contrast >= 3 && effect.inBounds && !effect.clipped && effect.onTop && effect.color === "rgb(8, 124, 120)" && effect.offset === "2px", effect);
}

async function townUi(h) {
  const { page, mobile, focused, focusWith, press, tap, sample, step, until, when, state, check } = h;
  const counts = await playCounts(h);
  await connect(h);
  h.mark("toolbar and nested phone");
  await place(h);
  const before = await state();
  const folded = page.locator('.toolbar .ride-menu[aria-expanded="true"]');
  await tap("Menu");
  await until("Menu opens the drawer or focuses the toolbar", async () =>
    (mobile ? await folded.count() === 1 : await focused(`[data-pad-toolbar] ${scenariosTool}`)));
  check("Menu starts navigation at scenarios", await focused(`:is(${toolbar}) ${scenariosTool}`), await state());
  if (mobile) {
    assert.equal(await folded.getAttribute("aria-controls"), "town-tools");
    assert.equal(await page.locator("#town-tools[inert]").count(), 0);
  }
  await sample([0, 0.85, 0, 0]);
  await step(2);
  await sample();
  await step(2);
  check("a stick deflection moves focus to another toolbar control",
    await focused(`:is(${toolbar}) button`) && !(await focused(scenariosTool)), await state());
  await focusWith(`:is(${toolbar}) ${scenariosTool}`, "Up");
  await press("Down");
  await step();
  const initialEdge = (await state()).pad.focusTarget;
  await step(12);
  assert.equal((await state()).pad.focusTarget, initialEdge, "a held D-pad direction waits for the repeat delay");
  await step(20);
  check("the held direction repeats within its stable tools scope", (await state()).pad.focusTarget !== initialEdge, await state());
  await sample();
  await step(2);
  await focusWith(`:is(${toolbar}) ${phoneTool}`);
  await checkFocusRing(h, `:is(${toolbar}) ${phoneTool}`, "phone", mobile ? "drawer" : null);
  await sample(undefined, { [button.A]: 1, [button.Down]: 1 });
  await step();
  await until("A opens the phone panel", () => page.locator('[data-pad-phase="phone"] .phone').isVisible());
  const opened = await state();
  await sample([0, 0.8, 0, 0], { [button.Down]: 1 });
  await step(34);
  const held = await state();
  check("a held direction across the menu change cannot move focus, repeat A or walk",
    held.panel === "phone" && JSON.stringify(opened.focus) === JSON.stringify(held.focus) &&
    horizontal(before, held) < 0.05 && !held.hop.air, { before, opened, held });
  await sample();
  await step(2);
  await press("B");
  await step();
  await when("B closes the phone", (s) => !s.panel);
  await step(30);
  check("held B closes only the top surface and restores the phone launcher",
    await focused(`:is(${toolbar}) ${phoneTool}`) && (await state()).pad.focusTarget === "phone" &&
    (!mobile || await folded.count() === 1), await state());
  await sample();
  await step(2);
  await tap("B");
  check("a fresh B closes the restored drawer or relinquishes toolbar focus",
    await folded.count() === 0 && (await state()).pad.focusTarget === null, await state());
  if (mobile) assert.equal(await page.locator("#town-tools[inert]").count(), 1);

  check("toolbar navigation leaves play counts untouched", JSON.stringify(await playCounts(h)) === JSON.stringify(counts));
}

async function kitContract(h) {
  const { page, until, when, focusWith, tap, check, shot } = h;
  const counts = await playCounts(h);
  await connect(h);
  h.mark("café kit greeting");
  const kitState = () => page.evaluate(() => window.__ew.game.modes.get("barista")?.state());
  await page.evaluate(() => {
    const { game, store } = window.__ew;
    const id = "s72-cafe";
    store.getState().updateProgress((p) => {
      p.sits[id] = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
    });
    const café = game.orderedSituations().find((s) => s.id === id);
    game.enterZone(café.location, { x: -2.55, z: -2.03, rot: Math.PI }, true);
    game.modeStart("barista", "conversation"); // The normal café payoff entry.
  });
  const greeting = '.barista-choice[data-line="bs_a_hi"]:enabled';
  await until("the first greeting becomes available", () => page.locator(greeting).isVisible(), { timeout: 25000, frames: 6 });
  check("the kit is on the first customer's greeting", (await kitState())?.step === "greet", await kitState());
  await focusWith(`.barista-overlay[data-pad-scope=choice] ${greeting}`);
  await tap("A");

  h.mark("café kit order and chip");
  const enabled = '.barista-overlay[data-pad-scope=choice] [data-row] [data-chip][aria-disabled="false"]';
  await until("A advances the greeting to a live order tray", async () =>
    ["order", "build"].includes((await kitState())?.step) && await page.locator(enabled).first().isVisible());
  const offered = await kitState();
  const chip = `${enabled}.barista-chip-glow`;
  await until("the order shows its first eligible chip", () => page.locator(chip).isVisible());
  const target = await page.locator(chip).evaluate((el) => ({ id: el.dataset.chip, row: el.closest("[data-row]").dataset.row }));
  await focusWith(chip, "Right", 12);
  await shot("kit-chip");
  await tap("A");
  const built = await until("the selected chip advances the order piece", async () => {
    const s = await kitState();
    return s?.piece === offered.piece + 1 && s.built[target.row] === target.id && s;
  });
  check("D-pad and A select the actual greeting and put the selected chip in the order", built.customer === 1 &&
    built.piece === offered.piece + 1, { offered, target, built });
  await tap("B");
  await when("B exits the café shift", (s) => !s.transition && s.phase === "on");
  await until("town controls return after the kit", () => page.locator(".toolbar").isVisible());
  // Puerto Colibrí's barista counts a play when a shift reaches its score (game/barista/mode.ts), so leaving the shift
  // part-way adds nothing; the controller adds no count of its own.
  await assertCounts(h, counts, []);
}

async function meetingContract(h) {
  const { page, until, focused, when, tap, press, sample, step, check, shot, state } = h;
  await connect(h);
  h.mark("Andrea meeting choices");
  await page.evaluate(() => {
    const { game, store } = window.__ew;
    // This is the saved invitation and town arrival used by phone-rings.mjs.
    store.getState().updateProgress((p) => {
      p.phone ??= { played: 0, missed: {} };
      p.phone.invitation = { place: "cafe", chip: "prie kavinės", when: "penktadienį 19:30" };
    });
    game.teleportTo("sunny-cup");
  });
  const meeting = '.friend-meeting[data-pad-scope="meeting"]';
  const ready = `${meeting} [data-meeting-answer="phone_meet_ready"]:enabled`;
  const tickets = `${meeting} [data-meeting-answer="phone_meet_tickets"]:enabled`;
  const greeting = page.locator(`${meeting} [data-meeting-line="phone_meet_hello"]`);
  await until("arriving at Sunny Cup starts Andrea's actual greeting", () => greeting.isVisible(), { timeout: 25000 });
  await step(2);
  await press("A");
  await until("the greeting finishes and both reading-only answers remain available", async () =>
    await page.locator(ready).isVisible() && await page.locator(tickets).isVisible(), { timeout: 20000, frames: 6 });
  await step(4);
  check("A held through the narration cannot submit the new turn", await page.locator(tickets).isVisible(), await state());
  await sample();
  await step(2);
  await tap("Down");
  check("the first direction starts on the first available meeting answer",
    await focused(ready) && (await state()).pad.focusTarget === "phone_meet_ready", await state());
  await tap("Down");
  await checkFocusRing(h, tickets, "phone_meet_tickets", "meeting");
  await shot("andrea-choice-focus");
  await tap("A");
  await until("Andrea gives her follow-up after the focused answer", () =>
    page.locator(`${meeting} [data-meeting-line="phone_meet_go"]`).isVisible(), { timeout: 20000, frames: 6 });
  await when("the meeting completes and returns to town", (s) => !s.mode && !s.transition && s.phase === "on",
    { timeout: 20000, frames: 6 });
  check("the chosen reply consumes the saved invitation through normal progression",
    await page.evaluate(() => !window.__ew.game.phoneState().invitation), await state());
}

async function settingsAdjustments(h) {
  const { page, step, attach, detach, when, check, until, tap, press, sample, focusWith, focused } = h;
  h.mark("native settings ranges");
  if (h.mobile) await openPhoneMenu(page);
  await physical(h, page.locator('.toolbar [data-pad-tool="settings"]'));
  const panel = '[data-pad-scope="panel"][data-pad-phase="settings"]';
  const volume = `${panel} input[aria-labelledby="settings-volume"]`;
  const sounds = `${panel} input[aria-label="${words("Sounds", "Garsai")}"]`;
  await until("both native ranges are in Settings", () => page.locator(`${panel} input[type=range]`).count().then((n) => n === 2));
  const levels = () => page.locator(`${panel} input[type=range]`).evaluateAll((inputs) => {
    const { store, audio } = window.__ew;
    const { volume, sounds } = store.getState().settings;
    return { dom: inputs.map((el) => el.valueAsNumber), settings: [volume, sounds], audio: [audio.volume, audio.sounds] };
  });
  const initial = await levels();
  await attach();
  await when("a neutral controller connects in Settings", (s) => s.pad.connected);
  await step(8);
  assert.deepEqual(await levels(), initial);
  check("neutral attachment leaves both settings unadjusted", initial.dom.every((value) => value === 0) &&
    await page.locator("[data-pad-focus], [data-pad-adjusting]").count() === 0, initial);

  const raised = { dom: [0.05, 0], settings: [0.05, 0], audio: [0.05, 0] };
  await page.locator(volume).focus();
  await tap("Right");
  assert.deepEqual(await levels(), initial, "the pad leaves the native-focused slider alone");
  await page.keyboard.press("ArrowRight");
  assert.deepEqual(await levels(), raised, "the physical key uses the native slider step");
  await page.keyboard.press("ArrowLeft");
  assert.deepEqual(await levels(), initial);
  await page.locator(volume).evaluate((el) => el.blur());

  await focusWith(volume, "Down", 30);
  await checkFocusRing(h, volume, (await h.state()).pad.focusTarget, "panel");
  await tap("Down");
  check("a direction before A moves focus to the other range", await focused(sounds));
  assert.deepEqual(await levels(), initial);
  await tap("Up");
  await tap("A");
  check("A enters adjustment on the real volume input", await focused(`${volume}[data-pad-adjusting]`));
  await press("Right");
  await step(12); // Shorter than the existing directional repeat delay.
  await sample();
  await step(2);
  assert.deepEqual(await levels(), raised, "one directional edge changes the DOM, saved setting and live audio by 0.05");
  await tap("A");
  await tap("Down");
  check("A keeps the volume and directions return to panel navigation", await focused(sounds));
  assert.deepEqual(await levels(), raised);

  await tap("A");
  await tap("Right");
  assert.deepEqual(await levels(), { dom: [0.05, 0.05], settings: [0.05, 0.05], audio: [0.05, 0.05] });
  await press("B");
  await step(25);
  assert.deepEqual(await levels(), raised, "the first B restores the original effects level");
  check("held B leaves the settings panel open and focus on the native slider", await focused(`${sounds}[data-pad-focus]:not([data-pad-adjusting])`));
  await sample();
  await step(2);
  await tap("B");
  await when("a release and second B close Settings", (s) => !s.panel);
  await detach();
}

async function townHudChoices(h) {
  const { page, step, state, when, until, attach, tap, press, sample, focusWith, focused, check } = h;
  h.mark("town translation and camera controls");
  const chip = ".photo-chip";
  const bubble = ".street-bubble[data-chatter]";
  const scenarios = `:is(${toolbar}) ${scenariosTool}`;
  // The same Ambient pair search as street.mjs: stand 3.5 m from a real chatting pair, turning until it is in view.
  const pairs = await page.evaluate(() => {
    const { game, store } = window.__ew;
    store.getState().updateProgress((p) => { p.photoWalk = { status: "on", found: [] }; });
    const chats = new Map();
    for (const root of game.ambient.walkerRoots) {
      const walker = game.ambient.walkerFor(root);
      if (!walker?.chat) continue;
      const members = chats.get(walker.chat) ?? [];
      members.push(root.position);
      chats.set(walker.chat, members);
    }
    return [...chats.values()].filter((members) => members.length === 2).map(([first, second]) => {
      const { x, z } = first.clone().lerp(second, 0.5);
      return { x, z };
    });
  });
  assert(pairs.length > 0, "real Ambient pairs are available");
  let inView = false;
  for (const pair of pairs) {
    for (let turn = 0; turn < 2 * Math.PI && !inView; turn += Math.PI / 4) {
      await page.evaluate(({ x, z, turn }) =>
        window.__ew.game.placeOnFoot(x + 3.5 * Math.sin(turn), z + 3.5 * Math.cos(turn), turn + Math.PI), { ...pair, turn });
      await step(30);
      // (and a camera with room behind the player, so the avatar is not the whole screen)
      inView = await page.evaluate(() => window.__ew.game.streetLife.world.pairs(5).length > 0 && window.__ew.game.rig.armL >= 5);
    }
    if (inView) break;
  }
  assert(inView, "a real pair qualifies for natural chatter");
  await bannerGone(h);
  check("the real pair begins chatter", await page.evaluate(() =>
    window.__ew.game.streetChatterNow("c_calor") || window.__ew.game.streetChatterNow()));
  await until("the camera chip and untranslated speech bubble are visible", async () =>
    await page.locator(chip).isVisible() && await page.locator(bubble).isVisible());
  await attach();
  await when("a neutral controller connects during chatter", (s) => s.pad.connected);
  check("visible chatter leaves the HUD without controller focus", !(await state()).pad.focusTarget &&
    await page.locator(`${bubble} .street-tr`).count() === 0);
  const obstacles = `${chip}, ${bubble}, .toolbar-drawer:not([inert])`;
  await inspectHint(h, "connected", "world", obstacles);
  await tap("Menu");
  await until("Menu focuses the existing scenarios default", () => focused(scenarios));
  await focusWith(bubble, "Down", 22);
  await checkFocusRing(h, bubble, "street-bubble", null);
  const clickProbe = (selector) => page.locator(selector).evaluateHandle((el) => {
    const clicks = { count: 0 };
    el.addEventListener("click", () => { clicks.count++; });
    return clicks;
  });
  const translated = await clickProbe(bubble);
  await press("A");
  await until("A reveals the existing helper translation", () => page.locator(`${bubble} .street-tr`).isVisible());
  await step(12);
  assert.equal(await translated.evaluate(({ count }) => count), 1, "a held A issues one native bubble click");
  await translated.dispose();
  await sample();
  await step(2);
  await tap("B");

  // Remove the line while walking with the same stick deflection.
  const beforeWalk = await state();
  await sample([0, -0.8, 0, 0]);
  await step(20);
  const during = await state();
  await page.evaluate(() => window.__ew.game.streetLife.clearChatter());
  await until("the chatter is cleared", () => page.locator(bubble).count().then((n) => n === 0), { frames: 0 });
  await step(20);
  const after = await state();
  check("chatter and its removal preserve walking and never claim focus", horizontal(beforeWalk, during) > 0.2 &&
    horizontal(during, after) > 0.2 && !during.pad.focusTarget && !after.pad.focusTarget, { beforeWalk, during, after });
  await sample();
  await step(2);

}

async function connect(h, held = []) {
  await h.attach("standard", held);
  await h.when("the standard controller connects", (s) => s.pad?.connected, { frames: 1 });
  if (process.env.PAD_TRACE) await h.page.evaluate(() => {
    const v = window.__ew.game.pad?.input?.view;
    if (!v) return;
    let value = v.desktop;
    window.__desktopStacks = [];
    Object.defineProperty(v, "desktop", { configurable: true, get: () => value,
      set: (x) => { if (x && !value) window.__desktopStacks.push(new Error().stack.split("\n").slice(1, 9).join(" | ")); value = x; } });
  });
  await h.step(2);
}

async function physical(h, locator) {
  h.action({ physical: String(locator) });
  await locator.scrollIntoViewIfNeeded();
  return h.mobile ? locator.tap() : locator.click();
}

const playCounts = (h) => h.page.evaluate(() => {
  const p = JSON.parse(localStorage.getItem("puerto-colibri-progress-v1"));
  return { rides: p.play?.rides ?? {}, games: p.play?.games ?? {} };
});

async function assertCount(h, before, kind, key) {
  await assertCounts(h, before, [[kind, key]]);
}

async function assertCounts(h, before, activations) {
  const expected = structuredClone(before);
  for (const [kind, key] of activations) expected[kind][key] = (expected[kind][key] ?? 0) + 1;
  const actual = await playCounts(h);
  assert.deepEqual(actual, expected, "only the real ride and game activations update the saved counts");
}

const hudGeometry = (h) => h.page.locator(".joy, .jump-btn, .act-btn, .ride-menu, .toolbar-tools").evaluateAll((nodes) =>
  nodes.map((el) => {
    const r = el.getBoundingClientRect();
    return [el.className, r.x, r.y, r.width, r.height];
  }));

async function assertRideOut(h) {
  const label = words("Get out", "Išlipti");
  const el = h.page.locator(h.mobile ? ".act-btn" : ".prompt .prompt-text");
  await h.until("the original dismount control is visible", () => el.isVisible());
  assert.equal(await el.evaluate((node) => [...node.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent).join("").trim()), label);
}

function lightOnly() {
  const g = window.__ew.game;
  return g.light && !g.groundCanvas && !g.renderer && !g.player && !document.querySelector(".stage, canvas");
}

async function lightIdle(h) {
  const start = await h.state();
  const quiet = await h.step(60);
  const idle = await h.state();
  h.check("60 quiet Light Home frames use the existing clock and leave focus and requests alone",
    await h.page.evaluate(lightOnly) && quiet.every((f) => f.callbacks === 1 && f.polls === 0) &&
    idle.polls === start.polls && idle.focus.tag === "BODY" && !idle.pad.focusTarget && !idle.hint && h.padRequests.length === 0,
    { start, idle });
  await connect(h);
  const before = await h.state();
  const frames = await h.step(20);
  h.check("Light Home samples once per each of its existing 20 callbacks", frames.every((f) => f.callbacks === 1 && f.polls === 1) &&
    (await h.state()).polls - before.polls === 20 && before.focus.tag === "BODY" && !before.pad.focusTarget, frames);
  await inspectHint(h, "connected", "menu", ".lh-tools button");
  await h.shot("connect");
}

async function startCafe(h, light, pad = true) {
  const { page, until, focused, tap, step, check } = h;
  const picker = '[data-pad-scope=panel][data-pad-phase=scenarios]';
  let card;
  // (the café card appears twice, in its chapter and as a suggestion: either opens the same intro)
  if (light) card = page.locator(`.lh-card[data-sit="${cafe}"]`).first();
  else {
    await tap("Menu");
    await until("the tools focus their scenarios launcher", () => focused(scenariosTool));
    await tap("A");
    await until("A opens the real scenarios sheet", () => page.locator(picker).isVisible());
    card = page.locator(`${picker} .scn-card[data-sit="${cafe}"]`).first();
  }
  const selector = light ? `.lh-card[data-sit="${cafe}"]` : `${picker} .scn-card[data-sit="${cafe}"]`;
  if (pad) {
    // Start near the test card with native focus so the big picker need not traverse every chapter.
    await card.scrollIntoViewIfNeeded();
    await card.focus();
    await step(2);
    check("the real picker card has focus before A", await focused(selector));
    await h.press("A");
    await step();
    await until("A on the card opens the café intro", () => page.locator(intro).isVisible());
    await step(16);
    check("held picker A leaves the explicit start button unclicked", await page.evaluate(() => {
      const { conv } = window.__ew.store.getState();
      return conv.introOpen && conv.transcript.length === 0;
    }), await h.state());
    await h.sample();
    await step(2);
  } else await physical(h, card);
  const start = page.locator(primary);
  await until("the café intro start is visible", () => start.isVisible());
  assert.equal(await start.innerText(), words("Start", "Pradėti"));
  assert.match(await page.locator(intro).innerText(), /Mariana|La Ceiba/);
  if (light) assert(await page.locator(".lh[inert]").count(), "the active scene covers Light Home");
  await h.shot("intro");
  if (pad) await startScene(h, cafe);
  else await physical(h, start);
}

async function learnerTurn(h) {
  const recovery = h.page.locator(".convo .audio-recovery").getByRole("button", {
    name: words("Keep going by reading", "Tęsti skaitant"), exact: true,
  });
  await h.until("reading fallback reaches Mariana's learner turn", async () => {
    const state = await h.page.evaluate(() => {
      const { game, store } = window.__ew;
      const c = store.getState().conv;
      return c.active && !c.introOpen && c.phase === "you" && game.activeSession?.active &&
        { host: c.hostId, sit: c.sitId, step: c.stepId, line: c.lineKey };
    });
    if (state) return state;
    if (await recovery.isVisible()) await physical(h, recovery);
    return false;
  }, { timeout: 20000, frames: 1 });
}

const recognize = (h, typing = false) => h.page.evaluate(({ answers, typing }) => {
  const { store } = window.__ew;
  const { conv } = store.getState();
  if (conv.phase !== "you" || conv.sitId !== "s72-cafe" || conv.hostId !== "mia") {
    throw new Error(`Cannot seed Spanish alternatives at ${conv.sitId}/${conv.hostId}/${conv.phase}`);
  }
  store.getState().setConv({ speechChoices: answers, lastHeard: answers[0], typing });
  return { run: conv.run, ids: conv.transcript.map(({ id }) => id) };
}, { answers, typing });

const firstAnswer = '.convo [data-pad-answer="0"]';
const secondAnswer = '.convo [data-pad-answer="1"]';

async function cafeChoices(h, light) {
  const { page, state, check, until, step, tap, press, sample } = h;
  await connect(h);
  await startCafe(h, light);
  await learnerTurn(h);
  const seed = await recognize(h);
  const choices = page.locator(".convo [data-pad-answer]:enabled");
  await until("the real learner turn offers two live recognition alternatives", async () => await choices.count() === 2);
  assert.deepEqual(await choices.allTextContents(), answers);
  assert.deepEqual(await choices.evaluateAll((nodes) => nodes.map((el) => el.lang)), ["es", "es"]);
  assert.equal(await page.locator(".miss-box button:not([data-pad-answer])").innerText(), words("Edit text", "Pataisyti tekstą"));
  const gloss = await page.locator(".convo .transcript .msg.npc .il").first().evaluate((line) => ({
    target: line.lang, words: [...line.querySelectorAll(".lt:not(.dash)")].map((el) => [el.lang, el.textContent.trim()]),
  }));
  const greeting = { en: /Good morning|Welcome|Hi!|How|What/, lt: /Laba diena|Labas|Sveiki|Sveika|Kaip|Ką|Ko/i };
  check("Mariana's interlinear units show Spanish and the selected helper gloss",
    gloss.target === "es" && gloss.words.length > 0 && gloss.words.every(([lang, text]) => lang === learner && text) &&
    greeting[learner].test(gloss.words.map(([, value]) => value).join(" ")), gloss);
  await step(2);
  await h.focusWith(firstAnswer);
  const before = await state();
  await tap("Down");
  await checkFocusRing(h, secondAnswer, "1");
  await h.shot("second-answer");
  await press("A");
  await step();
  const spoken = () => page.evaluate((seed) => {
    const { conv } = window.__ew.store.getState();
    return { run: conv.run, added: conv.transcript.filter((line) => line.who === "you" && !seed.ids.includes(line.id)).map(({ text }) => text) };
  }, seed);
  await until("A adds the new learner transcript entry", async () => (await spoken()).added.length > 0, { frames: 1 });
  await step(34);
  const after = await spoken();
  const settled = await state();
  const normalize = (text) => text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  check("held A submits only the second Spanish answer once", after.run === seed.run && after.added.length === 1 &&
    normalize(after.added[0]) === normalize(answers[1]) && normalize(after.added[0]) !== normalize(answers[0]) &&
    (light ? await page.evaluate(lightOnly) : horizontal(before, settled) < 0.05 && !settled.hop.air), { seed, after, before, settled });
  await sample();
  await step(2);
  await learnerTurn(h);
  const afterTurn = await spoken();
  assert.deepEqual(afterTurn, after, "the held edge stays silent through the next turn");
}

async function lightBack(h, withDraft) {
  const { page, step, tap, press, sample, until, check, focused } = h;
  await connect(h);
  await startCafe(h, true);
  await learnerTurn(h);
  await recognize(h, withDraft);
  const input = page.locator(".convo .typebox input");
  const draft = "Para aquí, por favor";
  if (withDraft) {
    await input.fill(draft);
    await input.focus();
  } else await h.focusWith(firstAnswer);
  await step(3);
  const owner = withDraft ? ".convo .typebox input" : firstAnswer;
  check("the intended Back owner is stable before input", await focused(owner), await h.state());
  await press("B");
  await step();
  if (withDraft) {
    await until("B transfers focus from text entry to the first answer", () => focused(firstAnswer), { frames: 1 });
    await step(25);
    check("held B keeps the field, draft and conversation intact", await input.inputValue() === draft &&
      await focused(firstAnswer) && (await h.state()).conversation?.sit === cafe, await h.state());
    await sample();
    await step(2);
    assert(await focused(firstAnswer), "the answer still owns focus at the release boundary");
    await tap("B");
  }
  await until("B restores the uncovered Light Home", () => page.locator(".lh:not([inert])").isVisible());
  check("Back leaves just the pictures host", await page.evaluate(lightOnly) && await page.locator(".convo").count() === 0, await h.state());
  await h.shot(withDraft ? "draft-back" : "direct-back");
}
const popup = 'body > .wpop[role="dialog"]';

function readConversation() {
  const { game, store } = window.__ew;
  const c = store.getState().conv;
  return { active: c.active && game.activeSession?.active, sit: c.sitId, run: c.run, lines: c.transcript.map(({ id }) => id) };
}

async function checkQuietPortals(h) {
  await initModuleLexer;
  const links = await h.page.locator('script[type=module][src], link[rel=modulepreload], link[rel=stylesheet]').evaluateAll(
    (nodes) => nodes.map((node) => node.src || node.href));
  const imports = (await Promise.all(h.modules.map(async (response) => parseModules(await response.text(), response.url())[0]
    .filter(({ d, n }) => d === -1 && n).map(({ n }) => new URL(n, response.url()).href)))).flat();
  const eager = [...new Set([...links, ...imports].map((url) => new URL(url).pathname).filter((path) => lazyPadAsset.test(path)))];
  const idle = await h.state();
  const events = await h.page.evaluate(() => window.__padFixture.portalEvents);
  h.check("ordinary PC portals fetch no pad runtime, stylesheet or labels and emit no registration events",
    !eager.length && !events && !h.padRequests.length && !idle.pad.connected && !idle.hint &&
    await h.page.locator("[data-pad-focus]").count() === 0, { eager, events, requests: h.padRequests, idle });
}

async function portalSetup(h) {
  await startCafe(h, true, false);
  await learnerTurn(h);
  await recognize(h);
  const before = await h.page.evaluate(readConversation);
  assert(before.active && before.sit === cafe && await h.page.evaluate(lightOnly));
  return async () => assert.deepEqual(await h.page.evaluate(readConversation), before, "the same conversation and transcript remain underneath");
}

async function wordPortal(h) {
  const { page, check, tap, press, sample, step, until, focused } = h;
  const unchanged = await portalSetup(h);
  const unit = page.locator('.convo .transcript .msg.npc .il .u[data-i]:has(.lt:not(.dash)) > .en').first();
  await unit.scrollIntoViewIfNeeded();
  const word = await unit.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const gloss = el.closest(".u").querySelector(".lt");
    return { hit: el.contains(hit) && !hit.closest(".nat-star"), target: el.closest(".il").lang,
      gloss: gloss.textContent, helper: gloss.lang };
  });
  check("the transcript has an independently tappable glossed unit", word.hit && word.target === "es" && word.gloss &&
    word.helper === learner, word);
  const actions = `${popup} .wpop-acts button`;
  const openWord = async () => {
    await physical(h, unit);
    await until("a real word tap opens the body-mounted two-action dialog", async () =>
      await page.locator(actions).count() === 2 && await page.locator(actions).first().isVisible());
  };
  await openWord();
  await page.keyboard.press("Escape");
  await until("ordinary Escape closes the word card only", async () => await page.locator(popup).count() === 0);
  await unchanged();
  await openWord();
  await checkQuietPortals(h);

  await connect(h);
  check("eligible attachment requests the lazy runtime", h.padRequests.some((p) => /\/src\/game\/gamepad\.ts$/.test(p)), h.padRequests);
  await tap("Down");
  const first = `${actions}:nth-of-type(1)`;
  const second = `${actions}:nth-of-type(2)`;
  const firstId = (await h.state()).pad.focusTarget;
  check("the already-open portal receives controller focus first", firstId && await focused(first), await h.state());
  await tap("Right");
  const secondId = (await h.state()).pad.focusTarget;
  assert(secondId && secondId !== firstId, "word and sentence actions have different focus IDs");
  await checkFocusRing(h, second, secondId, "popover");
  await h.shot("word-actions");
  await tap("A");
  await until("A saves the sentence in the real card store", async () => await page.locator(actions).count() === 1 &&
    (await page.locator(`${popup} .wpop-in`).innerText()).includes(words("Sentence in cards", "Sakinys kortelėse")));
  await h.focusWith(actions);
  await tap("A");
  await until("A saves the word too and leaves the buttonless dialog open", async () =>
    await page.locator(actions).count() === 0 && await page.locator(`${popup} .wpop-in`).count() === 2);
  await press("B");
  await step(32);
  await until("B closes the upper dialog", async () => await page.locator(popup).count() === 0);
  await unchanged();
  check("the non-button word anchor returns to the real conversation's default answer without click-through",
    await focused(firstAnswer + "[data-pad-focus]") && (await h.state()).pad.focusTarget === "0", await h.state());
  await sample();
  await step(2);
  await h.shot("word-return");
}

async function naturalPortal(h) {
  const { page, check, tap, press, sample, step, until } = h;
  const unchanged = await portalSetup(h);
  const stars = page.locator(".convo .il .nat-star");
  const index = await until("the PC transcript or guide has a natural line or meaningful notes", () => stars.evaluateAll((nodes) => {
    const i = nodes.findIndex((el) => document.getElementById(el.getAttribute("aria-describedby"))?.textContent.trim().length > 8 &&
      !el.closest("[inert], [hidden], [aria-hidden=true]"));
    return i >= 0 ? { i } : false;
  }));
  const star = stars.nth(index.i);
  const id = await star.getAttribute("aria-describedby");
  const tip = page.locator(`body > .nat-tipbox[id=${JSON.stringify(id)}][role=tooltip]`);
  const handle = await tip.elementHandle();
  assert(handle && await handle.evaluate((el) => el.hidden), "the star describes the mounted but hidden tooltip");
  const toggle = async (visible) => {
    await physical(h, star);
    if (!h.mobile) await page.mouse.move(2, 2);
    await until(`the real natural line is ${visible ? "visible" : "hidden"}`, async () => await tip.isVisible() === visible);
  };
  await toggle(true);
  const measured = await star.evaluate((s) => {
    const t = document.getElementById(s.getAttribute("aria-describedby"));
    const r = s.getBoundingClientRect(), b = t.getBoundingClientRect();
    return { text: t.textContent.trim(), lang: t.lang, placed: t.classList.contains("below") ? b.top >= r.bottom : b.bottom <= r.top,
      arrow: Math.abs(b.left + parseFloat(t.style.getPropertyValue("--arrow")) - (r.left + r.width / 2)),
      popup: !!document.querySelector(".wpop"), expanded: s.getAttribute("aria-expanded") };
  });
  check("the actual natural text or notes appear in the helper layer beside the star", measured.text.length > 8 &&
    measured.lang === learner && measured.placed && measured.arrow < 2 && !measured.popup && measured.expanded === "true", measured);
  if (!h.mobile) {
    await page.keyboard.press("Escape");
    await until("Escape hides the natural tooltip", async () => !await tip.isVisible());
    await star.hover();
    await until("desktop hover shows the same tooltip", () => tip.isVisible());
    await page.mouse.move(2, 2);
    await until("leaving the star hides the hovered tooltip", async () => !await tip.isVisible());
    await toggle(true);
  }
  await toggle(false);
  await unchanged();
  await toggle(true);
  await checkQuietPortals(h);
  await connect(h, [button.B]);
  await step(32);
  assert(await tip.isVisible(), "B held across attach does not dismiss the upper tooltip");
  await sample();
  await step(2);
  await tap("A");
  assert(await tip.isVisible(), "A in the tooltip cannot click the conversation through it");
  await unchanged();
  await press("B");
  await step(32);
  await until("fresh B dismisses only the already-open natural line", async () => !await tip.isVisible());
  await unchanged();
  const returned = await star.evaluate((el) => el === document.activeElement && el.hasAttribute("data-pad-focus"));
  check("held Back restores the exact star without click-through", returned && !!(await h.state()).pad.focusTarget, await h.state());
  await sample();
  await step(2);
  await toggle(true);
  await tap("Down");
  await until("D-pad leaves the natural line and continues from its launcher", async () => !await tip.isVisible() &&
    await h.focused(".convo [data-pad-focus]:not(.nat-star)"));
  await unchanged();
  await h.shot("natural-return");
  await handle.dispose();
}

async function reconnect(h) {
  const { detach, state, step, sample, press, when, check } = h;
  await place(h);
  await connect(h);
  const first = await state();
  const device = await h.page.evaluateHandle(() => window.__padFixture.device());
  await detach();
  await connect(h, [button.A]);
  await step(8);
  const held = await state();
  check("same-index replacement with held A stays grounded", held.pad.connected && !held.hop.air &&
    Math.abs(held.jumpY - first.jumpY) < 0.05, { first, held });
  assert.equal(await device.evaluate((old) => old.index), await h.page.evaluate(() => window.__padFixture.device().index));
  await device.dispose();
  await sample();
  await step(2);
  await press("A");
  await step(4);
  const fresh = await state();
  check("release and a fresh A after reconnect lifts the avatar", fresh.hop.air && fresh.jumpY > held.jumpY + 0.1 &&
    fresh.pad.lastAction === "jump", fresh);
  await h.shot("fresh-reconnect-jump");
  await sample();
  await when("the fresh jump lands", (s) => !s.hop.air);
}

async function replacementDevice(h) {
  await connect(h);
  const { page, state, step, sample, press, check } = h;
  const primary = await page.evaluateHandle(() => window.__padFixture.device());
  try {
    await page.evaluate(() => window.__padFixture.attach("standard", [], 1, "Second controller"));
    await sample(undefined, { [button.A]: 1 });
    await step(6);
    const ignored = await state();
    check("a second connected slot cannot preempt the first controller", ignored.pad.connected &&
      ignored.deviceReads === 0 && !ignored.hop.air, ignored);
    await primary.evaluate((pad) => window.__padFixture.detach(pad));
    await step(8);
    const replaced = await state();
    check("the remaining sparse slot replaces the removed controller and rearms with A held",
      replaced.pad.connected && replaced.deviceReads > 0 && !replaced.hop.air, replaced);
    await primary.evaluate((pad) => window.__padFixture.dispatch("gamepaddisconnected", pad));
    await sample();
    const frames = await step(3);
    assert(frames.every((f) => f.polls === 1), "a stale disconnect cannot drop the replacement's normal samples");
    await press("A");
    await step(4);
    const jump = await state();
    check("the surviving device acts after a new physical A edge", jump.hop.air &&
      jump.jumpY > replaced.jumpY + 0.1 && jump.pad.lastAction === "jump", jump);
  } finally {
    await primary.dispose();
  }
}

async function disposePending(h) {
  const { page, step, check, state, until } = h;
  let requested = false, delivered = false, release;
  const pending = new Promise((resolve) => { release = resolve; });
  const url = (url) => url.origin === base.origin && url.pathname.endsWith("/src/game/gamepad.ts");
  await page.route(url, async (route) => {
    requested = true;
    await pending;
    await route.continue();
    delivered = true;
  });
  try {
    await h.attach();
    await until("the host's first dynamic controller request is in flight", () => requested, { frames: 0 });
    await page.evaluate(() => window.__ew.game.dispose());
    release();
    await until("the deferred response was released", () => delivered, { frames: 0 });
    // Wait for the existing in-flight import to settle. This does not create a second controller host.
    await page.evaluate(async () => { await import("/src/game/gamepad.ts"); });
    const before = await state();
    await h.duplicate("gamepadconnected");
    const frames = await step(20);
    const after = await state();
    check("a disposed host cannot attach late, sample or restore controller UI",
      !after.pad.connected && after.pad.lastAction === null && !after.pad.focusTarget && !after.hint &&
      after.polls === before.polls && frames.every(({ polls }) => polls === 0), { before, after });
  } finally {
    release();
  }
}

async function unplug(h) {
  const { page, step, state, sample, check } = h;
  await place(h);
  await connect(h);
  const real = await realMovement(h);
  const rest = await state();
  await sample([0, -0.8, 0, 0]);
  await step(22);
  const moving = await state();
  check("the controller was already walking before physical handoff", horizontal(rest, moving) > 0.35, { rest, moving });
  await real.down();
  try {
    await step(3);
    const checkpoint = await page.evaluateHandle(() => {
      const g = window.__ew.game;
      const { rig, player, clock } = g;
      const copy = (object) => Object.fromEntries(Object.entries(object).filter(([, v]) => v === null ||
        ["number", "boolean", "string"].includes(typeof v) || v?.isVector3)
        .map(([k, v]) => [k, v?.isVector3 ? v.clone() : v]));
      const restore = (object, values) => {
        for (const [k, v] of Object.entries(values)) {
          if (v?.isVector3) object[k].copy(v);
          else object[k] = v;
        }
      };
      const parts = [rig, g.steer, g.gait, g.wading, g.hop, rig.motion, clock].filter(Boolean);
      const saved = parts.map(copy);
      const movement = ["t", "heading", "gaitOn", "jogDir", "jogT", "joyRun", "lastSpeed", "stepOut", "diveK", "moveT", "stillT",
        "vel", "moveVel"];
      const playerMotion = Object.fromEntries(Object.entries(copy(g)).filter(([key]) => movement.includes(key)));
      const pose = player.root.position.clone(), rotation = player.root.rotation.clone();
      const camPose = rig.cam.position.clone(), camRot = rig.cam.quaternion.clone();
      const time = performance.now();
      const drag = rig.drag.bind(rig);
      const trace = { drags: 0 };
      rig.drag = (...args) => { trace.drags++; return drag(...args); };
      return {
        trace, restore() {
          parts.forEach((p, i) => restore(p, saved[i]));
          restore(g, playerMotion);
          player.root.position.copy(pose);
          player.root.rotation.copy(rotation);
          rig.cam.position.copy(camPose);
          rig.cam.quaternion.copy(camRot);
          rig.cam.updateMatrixWorld();
          window.__padFixture.setFrameTime(time);
          trace.drags = 0;
        },
        stop() { rig.drag = drag; },
      };
    });
    try {
      const start = await state();
      await sample(); // Control segment has only the already-held physical input.
      await step(22);
      const control = await state();
      assert.equal(await checkpoint.evaluate((p) => p.trace.drags), 0);
      await checkpoint.evaluate((p) => p.restore());
      const replay = await state();
      assert(horizontal(start, replay) < 1e-9 && Math.abs(angle(start.yaw, replay.yaw)) < 1e-9 &&
        start.view.every((value, i) => Math.abs(value - replay.view[i]) < 1e-9) && replay.speed === start.speed,
        "the unplug replay starts at the same pose, velocity and rendered view");
      await sample([0.9, -0.85, 0.9, 0], { [button.A]: 1, [button.RT]: 1, [button.LT]: 1 });
      await h.detach();
      await h.duplicate("gamepaddisconnected");
      const detached = await state();
      await step(22);
      const continued = await state();
      const delta = angle(angle(start.yaw, control.yaw), angle(replay.yaw, continued.yaw));
      check("the held finger or W continues through unplug with no orphan polling, drag or jump",
        horizontal(replay, continued) > 0.4 && !continued.hop.air && continued.polls === detached.polls &&
        continued.deviceReads === detached.deviceReads &&
        await checkpoint.evaluate((p) => p.trace.drags) === 0 && Math.abs(delta) < 0.02 &&
        !continued.pad.connected && continued.pad.focusTarget === null && continued.pad.lastAction === "disconnect",
        { start, control, replay, detached, continued, delta });
      await h.shot("unplug-physical-held");
    } finally {
      await checkpoint.evaluate((p) => p.stop());
      await checkpoint.dispose();
    }
  } finally {
    await real.up();
  }
  await step(85);
  const settled = await state();
  await sample([-0.94, -0.85, -0.9, 0], { [button.X]: 1, [button.RT]: 1 });
  await step(10);
  await sample([0.9, 0.85, 0.9, 0], { [button.A]: 1, [button.LT]: 1 });
  await step(20);
  const orphan = await state();
  const physicalInput = await page.evaluate(() => {
    const g = window.__ew.game;
    return { joy: { ...g.joy }, w: g.keys.has("w"), brake: g.brake };
  });
  check("after original damping settles the orphan cannot move, orbit, jump or leave a hold",
    orphan.polls === settled.polls && orphan.deviceReads === settled.deviceReads && horizontal(settled, orphan) < 0.05 &&
    Math.abs(angle(settled.yaw, orphan.yaw)) < 0.02 && !orphan.hop.air && !orphan.ride &&
    !physicalInput.joy.x && !physicalInput.joy.y && !physicalInput.w && !physicalInput.brake, { settled, orphan, physicalInput });
  await hintExpires(h, "disconnected", 2400);
}
const pickerSurface = { root: '[data-pad-scope=panel][data-pad-phase=scenarios]', choice: ".scn-card[data-sit]" };
const introSurface = { root: intro, choice: "[data-pad-default]" };
const conversationSurface = { root: ".convo", choice: "[data-pad-answer], .guide .chip, .guide-toggle, .type-toggle" };

/** The town's arrival title lasts 2.6 s of wall time (Game.enterZone); a controller is plugged in during play. */
async function bannerGone(h) {
  await h.until("the town's arrival title has gone", async () => await h.page.locator(".zone-banner").count() === 0,
    { timeout: 6000, frames: 1 });
}

async function worldHint(h, scale) {
  if (scale === 1.3) await hintAtLargeText(h);
  await bannerGone(h);
  const baseline = await hudGeometry(h);
  await connect(h);
  const shown = await inspectHint(h, "connected", "world");
  h.check("the original world legend remains legible at the chosen size", shown.mapSize >= 12 * scale - 0.1, shown);
  await h.shot("connect");
  const live = await h.page.locator(padHint).elementHandle();
  await h.detach();
  await h.duplicate("gamepaddisconnected");
  const unplugged = await inspectHint(h, "disconnected", "world");
  h.check("the unplug legend keeps the same text scale", unplugged.mapSize === shown.mapSize && unplugged.statusSize === shown.statusSize);
  await sameNotice(h, live, "disconnected");
  await h.shot("disconnect");
  await hintExpires(h, "disconnected", 2400);
  assert.deepEqual(await hudGeometry(h), baseline, "expiry restores the original world controls");
  assert(await h.page.evaluate(() => window.__padFixture.notices.filter((n) => n.kind === "disconnected").length === 1));
  await live.dispose();
  await h.shot("expired");
}

async function scaledHint(h, surface, scale) {
  const { page, step, until, check } = h;
  if (scale === 1.3) await hintAtLargeText(h);
  const home = surface === "picker" ? null : page.locator(`.lh-card[data-sit="${cafe}"]`).first();
  if (surface === "intro" || surface === "conversation") {
    await physical(h, home);
    await until("the visible Light Home intro opens", () => page.locator(primary).isVisible());
    if (surface === "conversation") {
      await physical(h, page.locator(primary));
      await learnerTurn(h);
      await recognize(h);
    }
  }
  const worldBefore = surface === "picker" ? await hudGeometry(h) : null;
  if (surface === "picker") {
    if (h.mobile) await openPhoneMenu(page);
    await physical(h, page.locator(`:is(${toolbar}) ${scenariosTool}:visible`).first());
  }
  const target = surface === "picker" ? pickerSurface : surface === "intro" ? introSurface : conversationSurface;
  await until("the current hint surface has a live control", () => page.locator(`${target.root} :is(${target.choice}):visible`).first().isVisible());
  await page.locator(target.root).evaluate(async (root) => {
    // Wait for the actual entrance transition to finish before reading bounds.
    await Promise.allSettled(root.getAnimations({ subtree: true })
      .filter((a) => a.effect?.getComputedTiming().endTime < 1000).map((a) => a.finished));
  });
  const before = await hudGeometry(h);
  await connect(h);
  const shown = await inspectHint(h, "connected", "menu", "", target);
  check("the live map and status scale with the existing text preference", shown.mapSize >= 12 * scale - 0.1 &&
    shown.statusSize >= 14 * scale - 0.1, shown);
  await h.shot("connect");
  const live = await page.locator(padHint).elementHandle();
  await h.detach();
  const unplugged = await inspectHint(h, "disconnected", "menu", "", target);
  check("disconnect preserves the chosen text scale", unplugged.mapSize === shown.mapSize && unplugged.statusSize === shown.statusSize,
    { shown, unplugged });
  await sameNotice(h, live, "disconnected");
  await h.shot("disconnect");

  const viewport = page.viewportSize();
  await page.setViewportSize({ width: viewport.width, height: viewport.height - 24 });
  await step(2);
  await inspectHint(h, "disconnected", "menu", "", target);
  await sameNotice(h, live, "disconnected");
  await h.shot("disconnect-resized");
  await page.setViewportSize(viewport);
  await step(2);
  if (surface === "intro") {
    await physical(h, page.locator(primary));
    await until("explicit Start changes the owner while still unplugged", async () => await page.locator(intro).count() === 0, { frames: 0 });
    await inspectHint(h, "disconnected", "menu", "", conversationSurface);
    await sameNotice(h, live, "disconnected");
    await h.shot("disconnect-after-start");
    await connect(h);
    await inspectHint(h, "connected", "menu", "", conversationSurface);
    await sameNotice(h, live, "connected");
    await hintExpires(h, "connected", 3200);
  } else {
    if (surface === "picker") {
      await physical(h, page.locator(`${pickerSurface.root} [data-pad-back]`).first());
      await until("the picker closes while the unplug status is live",
        async () => await page.locator(pickerSurface.root).count() === 0, { frames: 0 });
      await inspectHint(h, "disconnected", "world");
      await sameNotice(h, live, "disconnected");
    }
    await hintExpires(h, "disconnected", 2400);
    assert.deepEqual(await hudGeometry(h), worldBefore ?? before, "the original HUD dimensions return when the reflowing card expires");
  }
  await live.dispose();
  assert.equal(await page.locator("[data-pad-focus], [data-pad-slot], .pad-hint-layer").count(), 0);
  await h.shot("expired");
}

async function photoContract(h) {
  const { page, check, state, until, when, step, tap } = h;
  const counts = await playCounts(h);
  await connect(h);
  const located = await page.evaluate(async () => {
    const { PHOTO_THINGS, PHOTO_WALK_NPC, PHOTO_WALK_SITUATION } = await import("/src/content/photo-walk-lines.ts");
    const { game: g, store } = window.__ew;
    const things = new Map(PHOTO_THINGS.map((thing) => [thing.id, thing]));
    const cars = [...g.rides.list, ...g.rides.modeCars.keys()].filter((r) => r.kind === "car" && !g.rides.roofed(r));
    const nav = g.zone.nav;
    const candidates = [];
    for (const r of cars) {
      const side = { x: r.m.x + Math.cos(r.m.heading) * 2.2, z: r.m.z - Math.sin(r.m.heading) * 2.2 };
      if (!nav.free(nav.idx(side.x, side.z)) || !g.town.walkableAt(side.x, side.z) || g.rides.near(side.x, side.z) !== r) continue;
      for (const spot of g.town.photoSpots) {
        const d = Math.hypot(spot.x - side.x, spot.z - side.z);
        if (d + 0.12 <= things.get(spot.id)?.near && spot.visible?.() !== false)
          candidates.push({ side, car: r.id, spot, d });
      }
    }
    // If the live convertible parking spots have no eligible subject, stage the same
    // drivable car in a clear, legal lane beside an independently measured PC subject.
    const park = g.rides.find("park");
    if (park && !candidates.length) {
      for (const spot of g.town.photoSpots) {
        if (!things.has(spot.id) || spot.visible?.() === false) continue;
        const radius = things.get(spot.id).near - 0.15;
        for (let dz = -radius; dz <= radius; dz += 0.75) for (let dx = -radius; dx <= radius; dx += 0.75) {
          if (Math.hypot(dx, dz) > radius) continue;
          const side = { x: spot.x + dx, z: spot.z + dz };
          if (!nav.free(nav.idx(side.x, side.z)) || !g.town.walkableAt(side.x, side.z)) continue;
          for (const rot of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
            const cx = side.x - Math.cos(rot) * 2.2, cz = side.z + Math.sin(rot) * 2.2;
            const clear = [-2.4, 0, 2.4].every((offset) => {
              const x = cx + Math.sin(rot) * offset, z = cz + Math.cos(rot) * offset;
              return g.rides.drivable.has(x, z) && !g.zone.colliders.blocked(x, z, 1.22) &&
                ![...g.rides.list, ...g.rides.modeCars.keys()].some((o) => o !== park && g.rides.reach(o, x, z) < 1.3);
            });
            if (clear) candidates.push({ side, car: park.id, spot, pose: { x: cx, z: cz, rot }, d: Math.hypot(dx, dz) });
          }
        }
      }
    }
    candidates.sort((a, b) => a.d - b.d);
    const tested = [];
    for (const { side, car, spot, d, pose } of candidates.slice(0, 36)) {
      if (pose) g.rides.resetPosition(park, pose);
      if (g.rides.near(side.x, side.z)?.id !== car) continue;
      const rot = Math.atan2(spot.x - side.x, spot.z - side.z);
      g.placeOnFoot(side.x, side.z, rot);
      // (camera follow is off in this harness: turn the camera until the subject is in front of it, then snap it there)
      for (const yaw of [rot, rot + Math.PI, rot + Math.PI / 2, rot - Math.PI / 2]) {
        g.rig.yaw = yaw;
        g.rig.snap();
        g.rig.cam.updateMatrixWorld();
        const q = g.player.root.position.clone().set(spot.x, spot.y, spot.z).project(g.rig.cam);
        if (Math.abs(q.x) < 0.85 && Math.abs(q.y) < 0.85 && Math.abs(q.z) < 1) break;
      }
      const projections = g.town.photoSpots.map((s) => ({
        id: s.id, distance: Math.hypot(s.x - side.x, s.z - side.z), radius: things.get(s.id)?.near, spot: s === spot,
        visible: s.visible?.() !== false, ndc: g.player.root.position.clone().set(s.x, s.y, s.z).project(g.rig.cam).toArray(),
      }));
      // (a kind of subject can stand in several places, the palms: this is the one beside this car)
      const subject = projections.find((p) => p.spot);
      tested.push({ car, d, side, pose, subject });
      if (!subject.visible || Math.max(...subject.ndc.slice(0, 2).map(Math.abs)) > 0.85 || Math.abs(subject.ndc[2]) >= 1) continue;
      // Restrict this fixture to one remaining album subject, which isolates the
      // competition between the shutter and the real drive prompt.
      store.getState().updateProgress((p) => { p.photoWalk = { status: "on", found: PHOTO_THINGS.filter((t) => t.id !== spot.id).map((t) => t.id) }; });
      return { car, subject, projections, tested, npc: PHOTO_WALK_NPC, sit: PHOTO_WALK_SITUATION };
    }
    return { tested };
  });
  check("Renata's PC album has a projected uncollected subject at a genuine car door", located.subject &&
    located.sit === "x12-album" && located.subject.distance <= located.subject.radius, located);
  const { id } = located.subject;
  const chip = `.photo-chip[data-near="${id}"]`;
  await until("both shutter and real drive control appear at the selected pose", async () => (await state()).prompt === "drive" &&
    await page.locator(".photo-chip[data-near]").isVisible() &&
    await page.locator(h.mobile ? ".act-btn" : ".prompt").isVisible());
  assert.equal(await page.locator(".photo-chip").getAttribute("data-near"), id);
  const live = await page.evaluate((id) => {
    const g = window.__ew.game, p = g.player.root.position;
    const s = g.town.photoSpots.filter((s) => s.id === id).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    return p.clone().set(s.x, s.y, s.z).project(g.rig.cam).toArray();
  }, id);
  assert(Math.abs(live[0]) <= 0.98 && Math.abs(live[1]) <= 0.98 && Math.abs(live[2]) < 1, JSON.stringify(live));
  await tap("Menu");
  await h.focusWith(chip, "Down", 22);
  await checkFocusRing(h, chip, "photo-chip", null);
  await h.shot("shutter-at-car");
  const clicks = await page.locator(chip).evaluateHandle((el) => {
    const n = { count: 0 };
    el.addEventListener("click", () => n.count++);
    return n;
  });
  await h.press("A");
  await step();
  const quiz = `.photo-quiz[data-thing="${id}"]`;
  await until("A takes the photo and opens its own quiz", () => page.locator(quiz).isVisible());
  await step(12);
  assert.equal(await clicks.evaluate(({ count }) => count), 1);
  await clicks.dispose();
  await h.sample();
  await step(2);
  const answer = `${quiz} [data-choice="${id}"]`;
  await h.focusWith(answer);
  assert.equal(await page.locator(answer).getAttribute("lang"), "es");
  await tap("A");
  await until("the correct quiz answer saves the same photo", () => page.evaluate((id) =>
    JSON.parse(localStorage.getItem("puerto-colibri-progress-v1")).photoWalk?.found.includes(id), id));
  await until("closing the real quiz restores the drive control", async () => await page.locator(quiz).count() === 0 &&
    (await state()).prompt === "drive");
  if ((await state()).pad.focusTarget) await tap("B");
  await tap("X");
  await when("X still boards this car after the photo is saved", (s) => s.ride?.id === located.car && s.phase === "on");
  await assertCount(h, counts, "rides", "car");
}
async function physicalTaxi(h) {
  const { page, context, mobile, check } = h;
  const before = await h.state();
  const { taxi, assist } = await taxiCue(h, false);
  const chip = page.locator(assist);
  const b = await chip.boundingBox();
  assert(b);
  const point = { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  const cdp = mobile ? await context.newCDPSession(page) : null;
  if (!cdp) await page.mouse.move(point.x, point.y);
  const down = () => cdp ? cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [point] }) : page.mouse.down();
  const up = () => cdp ? cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] }) : page.mouse.up();
  const held = () => page.evaluate(() => Boolean(window.__ew.game.modes.get("taxi").assist));
  const capture = await chip.evaluateHandle((el) => {
    let pointerId = -1;
    el.addEventListener("pointerdown", (e) => { pointerId = e.pointerId; }, { once: true });
    return () => el.hasPointerCapture(pointerId);
  });
  const focus = () => chip.evaluate((el) => el === document.activeElement);
  const blur = () => chip.evaluate((el) => el.blur());
  assert(!(await h.state()).pad.connected);
  await chip.focus();
  await down();
  try {
    assert(await focus() && await held() && await capture.evaluate((captured) => captured()),
      "real pointer input captures the cue and holds assist");
    await blur();
    assert(!await focus() && !await held(), "native element blur releases pointer assist before touchend or mouseup");
  } finally {
    await up();
    await capture.dispose();
  }
  assert(!await held(), "late pointer release stays canceled");
  if (!mobile) {
    await chip.focus();
    await page.keyboard.down("Space");
  }
  await down();
  assert(await held(), "fresh physical input holds the same cue");
  if (mobile) assert(!await focus(), "a fresh real touch does not steal focus");
  await up();
  assert.equal(await held(), !mobile, "the actual pointer release preserves a separately held Space source");
  if (!mobile) {
    await page.keyboard.up("Space");
    assert(!await held());
    for (const key of ["Space", "Enter"]) {
      await chip.focus();
      await page.keyboard.down(key);
      try {
        assert(await held(), `${key} drives the real assist handler`);
        await page.keyboard.press("Tab");
        assert(!await focus() && !await held(), `native Tab blur cancels held ${key}`);
      } finally {
        await page.keyboard.up(key);
      }
      assert(!await held(), `late ${key} release stays canceled`);
    }
  }
  check("the real cue and drive phase survived all physical blur paths without any pad activity",
    (await taxi()).phase === "drive" && await chip.isVisible() && (await h.state()).polls === before.polls && h.padRequests.length === 0,
    await taxi());
  await h.shot("physical-cue-blur");
  const real = await realMovement(h);
  await real.down();
  try {
    await h.until("the straight-ahead physical input reaches the existing wrong-turn cue",
      () => page.locator('.taxi-cue [data-line="tx_wrong"]').isVisible(), { timeout: 20000, frames: 4 });
  } finally {
    await real.up();
  }
}

async function loteriaContract(h) {
  const { page, until, tap, check } = h;
  const counts = await playCounts(h);
  await connect(h);
  assert(await page.evaluate(() => window.__ew.loteria.stage(2, 6)), "stage the existing seeded PC zócalo game");
  await page.evaluate(() => window.__ew.game.startScenario("x10-loteria"));
  await startScene(h, "x10-loteria");
  for (const [id, text] of [["play", "Sí, claro"], ["know", "No. ¿Me explica?"], ["ask", "¿Juega seguido?"]]) {
    const input = page.locator(".convo .typebox input");
    await until(`Doña Toña's real ${id} turn`, async () => {
      const recovery = page.locator(".convo .audio-recovery .link-btn").last();
      if (await recovery.isVisible()) await physical(h, recovery);
      return page.evaluate((id) => {
        const c = window.__ew.store.getState().conv;
        return c.phase === "you" && c.stepId === id && c.hostId === "tona";
      }, id);
    }, { timeout: 20000, frames: 1 });
    if (!await input.isVisible()) await physical(h, page.locator(".convo .type-toggle"));
    await input.fill(text);
    await physical(h, page.locator(".convo .typebox button[type=submit]"));
  }
  await until("the completed conversation offers its original Lotería start", () => page.locator(".loteria-cta").isVisible());
  await h.focusWith(".loteria-cta");
  await tap("A");
  const read = () => page.evaluate(() => window.__ew.loteria.state());
  const called = await until("a called, uncovered card is enabled in the seeded board", async () => {
    const s = await read();
    return s?.phase === "waiting" && s.current && s.board.includes(s.current) &&
      await page.locator(`.loteria-cell[data-card="${s.current}"]:enabled`).isVisible() && s;
  }, { timeout: 25000, frames: 1 });
  const target = called.board.indexOf(called.current);
  const cells = page.locator(".loteria-cell");
  // Choose a real starting square in another row and column, so both axes must move focus.
  const from = ((Math.floor(target / 4) + 1) % 4) * 4 + (target % 4 + 1) % 4;
  await cells.nth(from).focus();
  if (process.env.PAD_DEBUG) await page.evaluate(() => {
    const input = window.__ew.game.pad?.input;
    window.__trace = [];
    const sample = input.sample.bind(input);
    input.sample = (pad, dt) => {
      const before = { ready: input.buttonsReady, rev: input.revision, held: input.held };
      sample(pad, dt);
      const b = pad.buttons.map((x, i) => (x.pressed ? i : -1)).filter((i) => i >= 0);
      if (b.length || window.__trace.length < 4) window.__trace.push({ b, before, after: { ready: input.buttonsReady, rev: input.revision, held: input.held },
        view: input.view?.scope?.className, last: window.__pad.lastAction });
      if (window.__trace.length > 40) window.__trace.shift();
    };
  });
  const axis = async (end, keyPlus, keyMinus, current, axisValue) => {
    for (let i = 0; i < 4 && axisValue(current) !== end; i++) {
      await tap(axisValue(current) < end ? keyPlus : keyMinus);
      const next = await cells.evaluateAll((nodes) => nodes.indexOf(document.activeElement));
      if (!(next >= 0 && next !== current)) {
        assert.fail(`the D-pad moves focus between Lotería cells: ${JSON.stringify({ current, next, state: await h.state(),
          active: await page.evaluate(() => {
            const v = window.__ew.game.pad?.input?.view, root = v?.scope, items = root ? v.controls(root) : [];
            return { cls: document.activeElement?.className, scope: document.activeElement?.closest("[data-pad-scope]")?.className,
              root: root?.className, items: items.length, has: items.includes(document.activeElement), trace: window.__trace };
          }) })}`);
      }
      current = next;
    }
    assert.equal(axisValue(current), end);
    return current;
  };
  const column = await axis(target % 4, "Right", "Left", from, (n) => n % 4);
  await axis(Math.floor(target / 4), "Down", "Up", column, (n) => Math.floor(n / 4));
  const selected = `.loteria-cell[data-card="${called.current}"]`;
  await checkFocusRing(h, selected, called.current, "choice");
  await tap("A");
  await until("one bean marks the exact called card", async () => await page.locator(selected).getAttribute("aria-pressed") === "true");
  const after = await read();
  check("the board records only the chosen cell and draws its bean", after.covered.length === called.covered.length + 1 &&
    after.covered.includes(target) && await page.locator(`${selected} .loteria-bean:not(.loteria-bounce)`).isVisible(), { called, after });
  await h.shot("loteria-mark");
  await h.focusWith(".loteria-shout:enabled", "Down", 16);
  assert.equal(await page.locator(".loteria-shout").getAttribute("data-ready"), "false");
  await tap("B");
  await until("B leaves Lotería and brings back the world controls", async () => !(await read()) && await page.locator(".toolbar").isVisible());
  await assertCount(h, counts, "games", "loteria");
}

async function poolContract(h) {
  const { page, until, step, press, sample, tap, check } = h;
  const counts = await playCounts(h);
  await connect(h);
  // As pool-ball.mjs: the finished x09-alberca chat unlocks the ball, and the prompt appears once the player wades in
  await page.evaluate(() => window.__ew.store.getState().updateProgress((p) => {
    p.sits["x09-alberca"] = { visits: 1, completions: 1, used: [], twists: [], memory: {} };
  }));
  assert(await page.evaluate(() => window.__ew.game.poolTeleport()));
  await step(4);
  await sample([0, -0.8, 0, 0]);
  try {
    await until("the ball game is available at the deck", async () => (await h.state()).prompt === "pool", { frames: 2, timeout: 20000 });
  } finally {
    await sample();
    await step(2);
  }
  await tap("X");
  const read = () => page.evaluate(() => {
    const pool = window.__ew.game.pool;
    return { ...pool.debug(), liveWindow: pool.round?.canHit ?? false };
  });
  const hitWindow = () => until("a live ball return opens the real hit window", async () => {
    const s = await read();
    return s.phase === "play" && s.liveWindow && s;
  }, { timeout: 25000, frames: 1 });
  const first = await hitWindow();
  await press("A");
  await step();
  const hit = await read();
  check("one A edge increments actual hits and closes the open window", hit.hits === first.hits + 1 && !hit.liveWindow, { first, hit });
  if (h.mobile) assert.equal(await page.locator(".pool-hit").getAttribute("data-can-hit"), "false");
  await h.shot("pool-hit");
  const next = await hitWindow(); // A remains physically held into another actionable window.
  assert.equal(next.hits, hit.hits);
  await step(4);
  assert.equal((await read()).hits, hit.hits);
  await sample();
  await step(2);
  assert((await read()).liveWindow, "there is still time for a deliberate second edge");
  await tap("A");
  assert.equal((await read()).hits, hit.hits + 1);
  const third = await hitWindow();
  await until("the third window expires into the falling ball", async () => (await read()).flightPhase === "fall", { frames: 1 });
  await tap("A");
  await until("the missed pass drops in the water", async () => (await read()).drops === third.drops + 1, { frames: 1 });
  assert.equal((await read()).hits, third.hits, "a fresh press outside the window never scores");
  await tap("B");
  await until("B restores the world from Alberca", async () => !(await read()).phase && await page.locator(".toolbar").isVisible());
  await assertCount(h, counts, "games", "pool");
}

async function cenoteContract(h) {
  const { page, when, until, tap, sample, step, check, state } = h;
  await connect(h);
  await page.evaluate(() => {
    const { game, store } = window.__ew;
    // As cave.mjs: Kin has let the learner through before the first glyph stone listens
    store.getState().updateProgress((p) => { p.cave = { lit: [], ...(p.cave ?? {}), seen: true, passed: [...new Set([...(p.cave?.passed ?? []), "kin"])] }; });
    // The stones say only lines that have a recording (cave/quest.ts sayable); this harness serves an empty manifest,
    // so the recordings are taken as present (cave.mjs reads the real one).
    window.__ew.audio.hasClip = () => true;
    game.enterZone("gruta", { x: -6.4, z: -24.5, rot: -Math.PI / 2 }, true);
  });
  await when("the real cave listen prompt identifies the stone", (s) => s.zone === "gruta" && s.prompt === "listen");
  await tap("X");
  const glyph = () => page.evaluate(() => window.__ew.store.getState().hud.glyph);
  const opened = await until("the glyph contains the real Spanish line and three options", glyph);
  assert.equal(opened.text, "El agua guarda la memoria.");
  assert.equal(opened.options.length, 3);
  assert.equal(opened.options[opened.answer], opened.lt);
  // (each option shows its number key before the meaning: the meaning is the option's text span)
  assert.deepEqual(await page.locator(".glyph-opt").evaluateAll((els) => els.map((el) => [el.lang, (el.querySelector("span") ?? el).textContent.trim()])),
    opened.options.map((meaning) => [learner, meaning]));
  const before = await state();
  await sample([0, -0.8, 0, 0]);
  await step(18);
  await sample();
  await step(2);
  assert(horizontal(before, await state()) < 0.05, "navigation does not walk behind the stone's card");
  const wrong = (opened.answer + 1) % 3;
  await h.focusWith(`.glyph-opt[data-pad-answer="${wrong}"]`, "Down");
  await tap("A");
  await until("A applies the actual selected meaning", async () => (await glyph())?.wrong.includes(wrong));
  check("the attempted meaning is disabled and the revealed line is Spanish", await page.locator(`.glyph-opt[data-pad-answer="${wrong}"]`).isDisabled() &&
    await page.locator(".glyph-text[lang=es]").isVisible(), await glyph());
  await h.shot("glyph-choice");
  await tap("B");
  await until("B removes the glyph and restores cave controls", async () => !await glyph() && await page.locator(".toolbar").isVisible());
}
async function billiardsContract(h, interruption) {
  const { page, press, step, tap, sample, until, check, when } = h;
  const counts = await playCounts(h);
  await connect(h);
  assert(await page.evaluate(() => window.__ew.billiards.start("solids")), "stage the PC billiards rack");
  const read = () => page.evaluate(() => window.__ew.billiards.state());
  await until("the actual rack reaches the break phase", async () => (await read())?.phase === "break", { frames: 1, timeout: 25000 });
  // (a press on the very frame a phase begins is re-armed, by design: the player's thumb arrives a few frames later)
  await step(3);
  const ready = await read();
  await tap("Right");
  const coarse = await read();
  await sample(undefined, { [button.LB]: 1, [button.Right]: 1 });
  await step();
  await sample();
  await step(2);
  const fine = await read();
  const degrees = (a, b) => angle(a, b) * 180 / Math.PI;
  check("Right nudges 0.5° and LB + Right nudges 0.1° in the same direction",
    Math.abs(degrees(ready.angle, coarse.angle) + 0.5) < 1e-6 &&
    Math.abs(degrees(coarse.angle, fine.angle) + 0.1) < 1e-6, {
      coarse: degrees(ready.angle, coarse.angle), fine: degrees(coarse.angle, fine.angle),
    });
  const charge = async () => {
    await press("A");
    await step(20);
    const charging = await read();
    assert(charging.power > 0.12 && charging.phase === "break");
    return charging;
  };
  await charge();
  if (interruption === "unplug") await h.detach();
  else await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await step(24);
  const canceled = await read();
  check("cancellation drops the power and leaves all balls still with A held", canceled.phase === "break" &&
    canceled.power === 0 && canceled.shots === fine.shots &&
    JSON.stringify(canceled.layout) === JSON.stringify(fine.layout), { phase: canceled.phase, power: canceled.power, shots: canceled.shots });
  if (interruption === "unplug") await connect(h, [button.A]);
  else await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await step(8);
  assert.equal((await read()).power, 0, "the held A stays disarmed when input returns");
  await sample();
  await step(2);
  assert.equal((await read()).phase, "break", "the late release doesn't shoot");
  await charge();
  await h.shot("charged");
  await sample();
  await step(18);
  const shot = await read();
  await step(4);
  const later = await read();
  const a = canceled.layout[0], b = shot.layout[0];
  // (the meter keeps the shot's power while the balls roll, as with Space; it is no longer charging)
  check("a fresh charge and physical release rolls the cue ball", shot.phase === "rolling" &&
    later.power === shot.power && Math.hypot(b.x - a.x, b.z - a.z) > 0.02, { phase: shot.phase, power: shot.power, later: later.power, a, b });
  await h.shot("cue-ball-moving");
  await tap("B");
  await when("B leaves billiards", (s) => !s.mode && !s.transition);
  await assertCount(h, counts, "games", "billiards");
}

async function surfContract(h) {
  const { page, tap, step, until, check } = h;
  const counts = await playCounts(h);
  await connect(h);
  await page.evaluate(() => window.__ew.game.surfStart("beginner"));
  const read = () => page.evaluate(() => {
    const s = window.__ew.game.surf.logic;
    if (!s) return null;
    const { phase, pose, todo, choice, duckT, d, score, talking, heard } = s;
    return { phase, pose, todo, choice: choice && { id: choice.id, options: choice.options }, duckT, d, score, talking,
      previousWave: heard.filter((line) => line === "prev_mine" || line === "prev_yours").at(-1) };
  });
  const reach = (name, condition) => until(name, async () => {
    const s = await read();
    if (s && condition(s)) return s;
    if (s?.choice) {
      const key = s.choice.id === "board" ? "b_long" :
        s.choice.id === "turn" ? (s.previousWave === "prev_mine" ? "a_go" : "a_yours") : s.choice.options[0];
      const selector = `.surf-choice[data-pad-answer="${key}"]`;
      if (await page.locator(selector).isVisible()) {
        await h.focusWith(selector, "Down");
        await tap("A");
      }
    }
    return false;
  }, { timeout: 28000, frames: 1 });
  const first = await reach("the real beginner lesson asks for its first stroke", (s) => s.todo?.do === "paddle");
  await tap("X");
  const stroked = await read();
  check("X performs exactly one requested stroke", stroked.todo?.do === "paddle" && stroked.todo.left === first.todo.left - 1,
    { first, stroked });
  for (let i = 0; i < stroked.todo.left; i++) await tap("X");
  const duck = await reach("the outgoing wave asks for a duck", (s) => s.todo?.do === "duck");
  await tap("Up");
  const mismatched = await read();
  check("the mismatched direction leaves the duck unfinished", mismatched.todo?.cue === duck.todo.cue &&
    mismatched.duckT === 0, { duck, mismatched });
  await tap("Down");
  const matched = await read();
  check("fresh D-pad Down ducks the learner under the real wave", matched.duckT > 0 && matched.todo?.cue !== duck.todo.cue, matched);
  await h.shot("duck");
  for (let i = 0; i < 5; i++) {
    const next = await reach("paddle, turn, or stand cue", (s) => ["paddle", "turn", "up"].includes(s.todo?.do));
    if (next.todo.do === "up") break;
    if (next.todo.do === "turn") await tap("Right");
    else for (let n = 0; n < next.todo.left; n++) await tap("X");
  }
  const ready = await read();
  assert.equal(ready.todo?.do, "up");
  await tap("A");
  await step(4);
  const stood = await read();
  check("A stands the learner on the board at the real catch cue", stood.phase === "ride" && stood.pose === "stand", { ready, stood });
  await h.shot("stood");
  await tap("B");
  await until("B returns from the real surf lesson with the backpack", () => page.evaluate(() =>
    !window.__ew.game.surf.active && window.__ew.game.player.backpackVisible && !window.__ew.game.transitioning));
  await assertCount(h, counts, "games", "surf");
}

const roadState = (h) => h.page.evaluate(() => window.__ew.road.state());
const seaState = (h) => h.page.evaluate(() => window.__ew.sea());

async function enterRoad(h) {
  await place(h, { x: 0, z: 91.6, rot: 0 });
  await h.sample([0, -0.8, 0, 0]);
  try {
    await h.until("walking through the PC Calle Ceiba boundary starts Don Rigo's approach",
      async () => (await roadState(h)).phase === "approach", { timeout: 20000, frames: 1 });
  } finally {
    await h.sample();
  }
  const state = await roadState(h);
  assert.equal(state.model, "taxi");
}

async function deferLine(h, key) {
  return h.page.evaluateHandle(async (key) => {
    const { ModeDialogue } = await import("/src/game/kit/dialogue.ts");
    const previous = ModeDialogue.prototype.say;
    let release;
    const deferred = new Promise((resolve) => { release = resolve; });
    const probe = { called: 0, returned: 0, delivered: 0, restore() { ModeDialogue.prototype.say = previous; release(); } };
    ModeDialogue.prototype.say = async function (...args) {
      if (args[2] !== key) return previous.apply(this, args);
      probe.called++;
      const original = await previous.apply(this, args);
      probe.returned++;
      await deferred;
      probe.delivered++;
      return original;
    };
    return probe;
  }, key);
}

async function narrationBack(h, name) {
  const { page, step, sample, until, check } = h;
  const road = name === "road";
  const key = road ? "rd_lift" : "tx_hello";
  const line = road ? `.road-lift-line[data-line="${key}"]` : `.taxi-cue [data-line="${key}"]`;
  const choices = road ? ".road-choice" : ".taxi-choice";
  await connect(h);
  // Leave reading recovery manual. Defer just the outer completion the real mode awaits.
  const deferred = await deferLine(h, key);
  try {
    if (road) await enterRoad(h);
    else {
      await place(h, { x: 121, z: -2.4, rot: Math.PI });
      await page.evaluate(() => window.__ew.game.modeStart("taxi"));
    }
    const both = { [button.A]: 1, [button.B]: 1 };
    if (!road) await sample(undefined, both);
    await until(`the real ${key} narration is visible before any answer mounts`, async () => {
      const s = road ? await roadState(h) : await h.state();
      return (road ? s.phase === "offer" && s.line === key && s.choices.length === 0 : s.mode === "taxi" && !s.transition) &&
        await page.locator(line).isVisible() && await page.locator(choices).count() === 0;
    }, { timeout: 25000, frames: 1 });
    assert.equal(await deferred.evaluate((p) => p.called), 1);
    if (road) {
      assert.match(await page.locator(line).innerText(), /aventón/i);
      assert(await page.locator(`${line} [lang=es]`).count());
    }
    await step(4);
    assert.equal(await page.locator(choices).count(), 0);
    await h.shot("narration");
    const exited = await page.evaluateHandle((name) => {
      const entry = window.__ew.game.modes.get(name), mode = name === "road" ? entry.mode : entry;
      const exit = mode.exit;
      const calls = { count: 0, restore() { mode.exit = exit; } };
      mode.exit = function (...args) { calls.count++; return exit.apply(this, args); };
      return calls;
    }, name);
    try {
      await sample();
      await step(2);
      await sample(undefined, both);
      await step();
      await h.when("one fresh B leaves the real narration through its owning mode", (s) => !s.mode && !s.transition);
      await step(24);
      check("held B exits once and carried A never jumps behind the narration", await exited.evaluate((p) => p.count) === 1 &&
        !(await h.state()).hop.air, await h.state());
    } finally {
      await exited.evaluate((p) => p.restore());
      await exited.dispose();
      await sample();
    }
    await deferred.evaluate((p) => p.restore());
    await until("the suspended completion has been delivered after exit", () => deferred.evaluate((p) => p.delivered === 1), { frames: 1 });
    await step(45);
    check("late completion cannot restore a departed line or mount its choices",
      !await page.locator(line).count() && !await page.locator(choices).count() &&
      (!road || (await roadState(h)).phase === "town"), await h.state());
    await h.shot("returned");
  } finally {
    await deferred.evaluate((p) => p.restore());
    await deferred.dispose();
  }
}

async function roadDecline(h) {
  await connect(h);
  await enterRoad(h);
  const no = '.road-choice[data-line="rd_a_no"]';
  await h.until("Don Rigo's real decline choice becomes available", () => h.page.locator(no).isVisible(), { timeout: 25000, frames: 1 });
  await h.focusWith(no, "Down");
  await h.tap("A");
  await h.until("the decline starts departure with its answers removed", async () => (await roadState(h)).phase === "depart" &&
    await h.page.locator(".road-choice").count() === 0, { frames: 1 });
  await h.shot("decline-depart");
  // (the departure takes the controls over from the answers: a press on that very frame is re-armed, by design)
  await h.step(3);
  await h.tap("B");
  const immediately = await roadState(h);
  h.check("B interrupts active departure and returns through the real Road entry", immediately.phase === "town" &&
    await h.page.locator(".road-overlay").count() === 0, immediately);
}

async function roadLiftChoice(h) {
  await connect(h);
  await enterRoad(h);
  await h.step(2);
  await h.press("A");
  const yes = '.road-choice[data-line="rd_a_yes"]';
  await h.until("Don Rigo offers two real Spanish answers", async () => await h.page.locator(yes).isVisible() &&
    await h.page.locator(".road-choice").count() === 2, { timeout: 25000, frames: 1 });
  await h.step(20);
  assert.equal((await roadState(h)).phase, "offer");
  assert.equal(await h.page.locator(".road-choice").count(), 2, "held A from approach leaves both new choices intact");
  await h.sample();
  await h.step(2);
  assert.match(await h.page.locator(`${yes} [lang=es]`).innerText(), /Sí, gracias/);
  await h.focusWith(yes);
  await h.tap("A");
  const setup = h.page.locator(".road-overlay [data-pad-scope=word-setup]");
  await h.until("choosing the actual lift answer opens the road briefing", () => setup.isVisible(), { timeout: 20000, frames: 1 });
  // (a new surface re-arms the buttons on its first sampled frame, by design: the thumb arrives a few frames later)
  await h.step(3);
  await h.tap("B");
  await h.until("B leaves the unstarted lift briefing", async () => (await roadState(h)).phase === "town");
}

async function openRoadPhrases(h) {
  // road-handoff.mjs stages the real PC crest approach in the original car.
  const exit = (await roadState(h)).exit;
  assert(Math.abs(exit.outward) < 0.01 && exit.z === 93.7);
  const staged = await h.page.evaluate(({ x, z, outward }) => {
    const g = window.__ew.game;
    const car = g.rides.find("park");
    const pos = { x, z: z - 19, rot: outward };
    if (!car || !g.rides.drivable.has(pos.x, pos.z)) return null;
    g.rides.resetPosition(car, pos);
    const side = { x: pos.x + Math.cos(outward) * 2.2, z: pos.z - Math.sin(outward) * 2.2 };
    if (!g.town.walkableAt(side.x, side.z) || g.rides.near(side.x, side.z) !== car) return null;
    g.placeOnFoot(side.x, side.z, pos.rot);
    return { id: car.id, pos, side };
  }, exit);
  assert(staged, "the staged PC approach has an original, reachable driver door");
  await h.when("the crest fixture offers the original drive prompt", (s) => s.prompt === "drive");
  await h.tap("X");
  await h.when("X boards the source convertible", (s) => s.phase === "on" && s.ride?.id === staged.id);
  await h.until("the PC road prefetch is ready at the existing approach", async () => (await roadState(h)).ready, { timeout: 25000 });
  await h.sample(undefined, { [button.RT]: 0.85 });
  try {
    await h.until("RT drives through the real crest into the briefing", async () => (await roadState(h)).phase === "briefing", { timeout: 25000 });
  } finally {
    await h.sample();
    await h.step(2);
  }
  await startPhrases(h, "road", roadState);
}

async function startPhrases(h, name, read) {
  const launch = `.${name}-overlay [data-pad-scope=word-setup] [data-way=phrases]`;
  await h.until(`the actual ${name} briefing has phrase practice`, () => h.page.locator(launch).isVisible(), { timeout: 25000, frames: 1 });
  await h.focusWith(launch, "Down");
  await h.tap("A");
  await h.until(`A starts the real ${name} phrases run`, async () => {
    const s = await read(h);
    return s.phase === "drive" && s.way === "phrases" && s.gates;
  }, { timeout: 25000, frames: 1 });
}

async function enterSea(h) {
  // The pier boat from rides.mjs boards by its own prompt. sea.mjs stages the
  // departure approach inside the buoy line, then crosses it under normal throttle.
  const boat = await h.page.evaluate(() => {
    const g = window.__ew.game;
    const r = g.rides.find("muelle");
    for (let a = 0; a < Math.PI * 2; a += 0.2) for (const d of [2.4, 2.9, 3.3]) {
      const x = r.m.x + Math.cos(a) * d, z = r.m.z + Math.sin(a) * d;
      if (!g.town.walkableAt(x, z) || g.rides.near(x, z) !== r) continue;
      g.placeOnFoot(x, z, r.m.heading);
      return r.id;
    }
  });
  assert.equal(boat, "muelle");
  await h.when("the actual pier boat can be boarded", (s) => s.prompt === "boat");
  await h.tap("X");
  await h.when("X boards the source hull", (s) => s.phase === "on" && s.ride?.id === boat);
  const pre = await h.until("local open-sea resources are ready", async () => {
    const s = await seaState(h);
    return s.ready && s.town && s;
  }, { timeout: 30000 });
  assert(await h.page.evaluate(({ edge, town }) => window.__ew.seaPlaceBoat(town.x, edge + 34), pre));
  await h.sample(undefined, { [button.RT]: 0.85 });
  await h.until("RT crosses the sea boundary into the real briefing", async () => (await seaState(h)).phase === "briefing", { timeout: 20000, frames: 6 });
  await h.sample();
  await h.step(2);
  return boat;
}

async function seaDrive(h) {
  const counts = await playCounts(h);
  await connect(h);
  const source = await enterSea(h);
  await startPhrases(h, "sea", seaState);
  // (the stick is re-armed when the run takes over the controls: neutral for a few frames, as a thumb would be)
  await h.step(3);
  const straight = await seaState(h);
  await h.sample([0.85, -0.8, 0, 0]);
  await h.step(50);
  const steered = await seaState(h);
  h.check("positive left X input to the helm moves the actual sea hull into the next lane",
    steered.x > straight.x + 1 && steered.lane > straight.lane && steered.z < straight.z &&
    straight.drawCalls <= 25 && steered.drawCalls <= 25, { straight, steered });
  await h.sample(undefined, { [button.LT]: 1 });
  await h.step(45);
  const slowed = await seaState(h);
  h.check("LT slows the existing Sea boat while moving forward", slowed.phase === "drive" &&
    slowed.speed < steered.speed - 1 && slowed.z < steered.z, { steered, slowed });
  await h.shot("sea-slow");
  await h.sample();
  await h.step(2);
  await h.tap("B");
  await h.until("B starts the existing sea return turn", async () => (await seaState(h)).phase === "turn", { frames: 1 });
  const returned = await h.until("the same boat returns to town under the original handoff", async () => {
    const s = await seaState(h);
    return s.phase === "town" && s.town?.id === source && s.town.phase === "on" && s;
  }, { timeout: 25000, frames: 6 });
  assert(Math.cos(returned.town.heading) > 0.99);
  assert(!returned.armed);
  await assertCounts(h, counts, [["rides", "boat"], ["games", "sea"]]);
}
async function seedReviewPrompts(h, name) {
  // The PC course phrases have no town situation ID. Supply the contextual
  // destinations on these fixture prompts before the real scorer sees them.
  return h.page.evaluate(async (name) => {
    const { loadPhrasePool } = await import("/src/game/road/phrasePool.ts");
    const { SITUATION_BY_ID } = await import("/src/content/situations/catalog.ts");
    const pool = await loadPhrasePool(() => 0.48);
    const specs = [
      ["Un bar servía café y pan.", "s72-cafe"],
      ["Se me olvidó la maleta.", "s65b-baggage"],
      ["¿Hay autobús?", "s66-taxi"],
    ];
    const sequence = specs.map(([line, id]) => {
      const p = pool.listen.find((prompt) => prompt.word.en === line);
      if (!p || !SITUATION_BY_ID[id]) throw new Error(`Missing real PC phrase or destination ${line} / ${id}`);
      return { ...p, word: { ...p.word, situation: id } };
    });
    sequence.push({ ...sequence[0], practice: "firstRetry" });
    const mode = window.__ew.game.modes.get(name).mode;
    const owner = name === "road" ? mode.run : mode;
    const original = owner.pick;
    owner.pick = (history, ...args) => sequence[history.length - 1] ?? original(history, ...args);
    return sequence.map((prompt) => prompt.word);
  }, name);
}

async function steerGate(h, name, read, first, lane) {
  const road = name === "road";
  const laneModule = road ? "/src/game/road/track.ts" : "/src/game/sea/course.ts";
  const target = await h.page.evaluate(async ({ lane, laneModule }) => (await import(laneModule)).laneOffset(lane), { lane, laneModule });
  // (the stick re-arms after the run takes the controls: start each gate from a neutral thumb)
  await h.sample();
  await h.step(3);
  let actual = first;
  for (let i = 0; i < 230 && actual.totalGates === first.totalGates; i++) {
    const position = road ? actual.x : await h.page.evaluate(() => window.__ew.game.modes.get("sea").mode.boat.x);
    const diff = target - position;
    const steer = Math.abs(diff) < 0.45 ? 0 : Math.max(-0.85, Math.min(0.85, diff * 0.27));
    await h.sample([steer, -0.8, 0, 0]);
    await h.step(6, 50);
    actual = await read(h);
  }
  await h.sample();
  assert.equal(actual.totalGates, first.totalGates + 1, `the real ${name} gate crossed: ${JSON.stringify(actual)}`);
  return actual;
}

async function reviewAdjustments(h, name, result) {
  const { page, step, until, check, press, sample, tap, focused, focusWith } = h;
  const score = `.${name}-overlay [data-pad-scope=score]`;
  const missed = `${score} .road-missed:not(.road-practice) select`;
  const practiced = `${score} .road-practice select`;
  const badge = page.locator(`${score} .road-practice .road-comeback`);
  const destination = page.locator(`${score} .road-missed:not(.road-practice) .ended-destination`);
  const selected = (selector) => page.locator(selector).evaluate((el) => ({
    index: el.selectedIndex, label: el.selectedOptions[0].label,
  }));
  const option = ({ en, lt }, index) => ({ index, label: `${en} · ${lt}` });
  await until("the actual score opens both independent selectors", async () =>
    await page.locator(missed).isVisible() && await page.locator(practiced).isVisible());
  await h.detach();
  await connect(h);
  await step(6);
  assert.deepEqual(await selected(missed), option(result.missed[0], 0));
  assert.deepEqual(await selected(practiced), option(result.phrases[0], 0));
  assert.equal(await destination.getAttribute("data-sit"), result.missed[0].situation);
  assert.equal(await page.locator("[data-pad-focus]").count(), 0, "neutral attachment leaves the result unfocused and unchanged");

  await focusWith(practiced, "Down", 24);
  const practiceId = (await h.state()).pad.focusTarget;
  await checkFocusRing(h, practiced, practiceId, "score");
  await tap("A");
  await tap("Right");
  assert.deepEqual(await selected(practiced), option(result.phrases[1], 1));
  await tap("B");
  assert.deepEqual(await selected(practiced), option(result.phrases[0], 0));
  assert(await focused(`${practiced}[data-pad-focus]:not([data-pad-adjusting])`));
  await tap("A");
  const recovered = result.phrases.findIndex((word) => result.recovered.some((r) => r.en === word.en && r.situation === word.situation));
  assert(recovered > 0, "the real retry is a distinct practiced entry");
  for (let i = 0; i < recovered; i++) await tap("Right");
  assert.deepEqual(await selected(practiced), option(result.phrases[recovered], recovered));
  assert(await badge.isVisible(), "the actual recovered phrase shows its comeback badge");
  await tap("A");

  await focusWith(missed, "Down", 24);
  await checkFocusRing(h, missed, (await h.state()).pad.focusTarget, "score");
  await tap("A");
  await tap("Down");
  assert.deepEqual(await selected(missed), option(result.missed[1], 1));
  assert.equal(await destination.getAttribute("data-sit"), result.missed[1].situation);
  await press("B");
  await step(25);
  check("held B cancels one select edit and preserves the score owner and its focus",
    await focused(`${missed}[data-pad-focus]:not([data-pad-adjusting])`) && await page.locator(score).isVisible());
  assert.deepEqual(await selected(missed), option(result.missed[0], 0));
  assert.equal(await destination.getAttribute("data-sit"), result.missed[0].situation);
  await sample();
  await step(2);
  await tap("A");
  await h.detach();
  assert(!await focused(missed) && await page.locator("[data-pad-adjusting]").count() === 0, "disconnect releases the native selector");
  await connect(h, [button.Right]);
  await step(12);
  assert.deepEqual(await selected(missed), option(result.missed[0], 0));
  assert.deepEqual(await selected(practiced), option(result.phrases[recovered], recovered));
  await sample();
  await step(2);
  await focusWith(missed);
  await tap("A");
  await tap("Right");
  await tap("A");
  assert.deepEqual(await selected(missed), option(result.missed[1], 1));
  assert.equal(await destination.getAttribute("data-sit"), result.missed[1].situation);
  await focusWith(`${score} .ended-destination button`);
  await h.shot("selected-destination");
  await tap("A");
  await until("A opens the actual selected town destination", () => page.evaluate((id) =>
    window.__ew.store.getState().hud.objective?.sitId === id, result.missed[1].situation));
  await until("the existing mode handoff restores town on foot", async () => {
    const s = await h.state();
    return s.zone === "town" && !s.mode && !s.transition && !s.ride && !s.swimming;
  }, { timeout: 20000, frames: 6 });
  await h.shot("guided-return");
}

async function wordGameResult(h, name) {
  const counts = await playCounts(h);
  const road = name === "road";
  const read = road ? roadState : seaState;
  await connect(h);
  if (road) await openRoadPhrases(h);
  else {
    await enterSea(h);
    await startPhrases(h, name, read);
  }
  const planned = await seedReviewPrompts(h, name);
  const expectedRights = [true, false, false, true, true];
  const seen = [];
  for (const [i, right] of expectedRights.entries()) {
    const gate = await h.until(`phrase gate ${i + 1} enters the live course`, async () => {
      const s = await read(h);
      return s.phase === "drive" && s.totalGates === i && s.phrasePrompt && s.gateDistance > 12 && s;
    }, { timeout: 22000, frames: 6 });
    if (i) {
      assert.equal(gate.word, planned[i - 1].en);
      assert.equal(gate.phrasePrompt.p, planned[i - 1].lt);
    }
    const lane = right ? gate.right : (gate.right + 1) % 3;
    const after = await steerGate(h, name, read, gate, lane);
    assert.equal(after.rightGates, gate.rightGates + Number(right), `gate ${i + 1} scores the occupied lane ${lane}`);
    if (!road) assert(after.drawCalls <= 25);
    seen.push({ word: gate.word, lane, right, rightGates: after.rightGates, total: after.totalGates });
  }
  await h.page.evaluate((name) => {
    if (name === "road") window.__ew.road.jumpTimer(149.95);
    else window.__ew.seaTimer(119.95);
  }, name);
  const result = await h.until("the real gate scorer publishes phrase practice and misses", async () => {
    const s = await read(h);
    return s.phase === "result" && s.result;
  }, { timeout: 25000, frames: 6 });
  h.check("the real run scores three correct gates, two misses and a recovered phrase",
    result.right === 3 && result.total === 5 && result.phrases.length >= 2 && result.missed.length === 2 &&
    result.recovered.some(({ en }) => en === planned[0].en), { seen, result });
  assert.deepEqual(result.missed.map(({ situation }) => situation), ["s72-cafe", "s65b-baggage"]);
  await reviewAdjustments(h, name, result);
  await assertCounts(h, counts, [["games", name], ["rides", road ? "car" : "boat"]]);
}

const cases = [
  ["town", "town-idle", idleAndAttach],
  ["town", "unsupported-throwing-and-aborted", deviceErrors],
  ["light", "light-idle", lightIdle],
  ["town", "walk-orbit-jump", walkLookJump],
  ["town", "valeria-car", carContract],
  ["town", "muelle-boat", (h) => boatContract(h, "muelle")],
  ["town", "playa-boat", (h) => boatContract(h, "playa")],
  ["town", "beach-swim", swimContract],
  ["town", "physical-unplug", unplug],
  ["town", "same-slot-reconnect", reconnect],
  ["town", "sparse-slot-replacement", replacementDevice],
  ["town", "town-dispose-pending", disposePending],
  ["light", "light-dispose-pending", disposePending],
  ["town", "phone-menu", townUi],
  ["town", "settings-edit", settingsAdjustments],
  ["town", "street-translation", townHudChoices],
  ["town", "cafe-town-choice", (h) => cafeChoices(h, false)],
  ["light", "cafe-light-choice", (h) => cafeChoices(h, true)],
  ["light", "light-back-with-draft", (h) => lightBack(h, true)],
  ["light", "light-direct-back", (h) => lightBack(h, false)],
  ["light", "light-portal-word", wordPortal],
  ["light", "light-portal-natural", naturalPortal],
  ["town", "andrea-invitation", meetingContract],
  ["town", "barista-order", kitContract],
  ["town", "loteria-grid", loteriaContract],
  ["town", "alberca-timing", poolContract],
  ["town", "cenote-meaning", cenoteContract],
  ["town", "taxi-pad-assist", taxiContract],
  ["town", "taxi-physical-assist", physicalTaxi],
  ["town", "taxi-narration", (h) => narrationBack(h, "taxi")],
  ["town", "billiards-blur", (h) => billiardsContract(h, "blur")],
  ["town", "billiards-unplug", (h) => billiardsContract(h, "unplug")],
  ["town", "surf-cues", surfContract],
  ["town", "renata-photo-and-drive", photoContract],
  ["town", "road-narration", (h) => narrationBack(h, "road")],
  ["town", "road-decline", roadDecline],
  ["town", "road-lift-choice", roadLiftChoice],
  ["town", "road-review", (h) => wordGameResult(h, "road")],
  ["town", "sea-drive-and-return", seaDrive],
  ["town", "sea-review", (h) => wordGameResult(h, "sea")],
  ...[1, 1.3].map((scale) => ["town", `hint-world-${Math.round(scale * 100)}`, (h) => worldHint(h, scale)]),
  ...[1, 1.3].flatMap((scale) => ["picker", "intro", "conversation"].map((surface) => [
    surface === "picker" ? "town" : "light",
    `hint-${surface}-${Math.round(scale * 100)}`,
    (h) => scaledHint(h, surface, scale),
  ])),
];

// PAD_CASES (a regular expression) and PAD_SIZES ("390" or "1280") narrow a local run; the default runs everything.
const only = process.env.PAD_CASES ? new RegExp(process.env.PAD_CASES) : null;
const sizes = [[390, 844, true], [1280, 800, false]].filter(([w]) => !process.env.PAD_SIZES || process.env.PAD_SIZES.split(",").includes(String(w)));
const chosen = cases.filter(([, name]) => !only || only.test(name));
// A case that stalls the page (an evaluate that never returns) fails on its own after CASE_MS; its context, or if
// need be the whole browser, is released so the remaining independent cases still run.
const CASE_MS = Number(process.env.PAD_CASE_MS) || 240000;
const within = (promise, ms, what) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${what} stalled for ${ms} ms`)), ms); })])
    .finally(() => clearTimeout(timer));
};
try {
  const failed = [];
  for (const [width, height, mobile] of sizes) {
    for (const [mode, name, contract] of chosen) {
      const id = `pc-${learner}-${width}x${height}-${name}`;
      console.log("case start", id);
      const started = Date.now();
      try {
        live = null;
        await within(run(width, height, mobile, mode, contract, name), CASE_MS, id);
        console.log("case done", id, `${Math.round((Date.now() - started) / 1000)} s`);
      } catch (error) {
        failed.push(id);
        console.error(error);
        console.log("case failed", id, `${Math.round((Date.now() - started) / 1000)} s`);
        if (/stalled for/.test(String(error?.message))) {
          const released = await within(live?.close() ?? Promise.resolve(), 15000, `${id} context close`).then(() => true, () => false);
          if (!released) {
            await within(browser.close(), 15000, "browser close").catch(() => {});
            browser = await launch();
          }
        }
      }
    }
  }
  const total = sizes.length * chosen.length;
  console.log(`gamepad PC-${learner} · ${total - failed.length}/${total} cases passed${total < 2 * cases.length ? ` (subset of ${2 * cases.length})` : ""}`);
  if (failed.length) {
    console.error("Failed independent cases", failed.join(", "));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
