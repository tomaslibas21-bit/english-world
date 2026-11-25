// Standalone browser contract. Run against the normal app, with local assets.
// WORLD_TEST_URL=http://127.0.0.1:5188 WORLD_PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node tests/browser/gamepad.mjs
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { progress as returnedPlayer } from "./life-harness.mjs";

const { chromium } = await import(process.env.WORLD_PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.WORLD_TEST_URL || "http://127.0.0.1:5188");
const storage = process.env.WORLD_STORAGE || "english-world";
const learner = process.env.WORLD_LEARNER || (storage === "puerto-colibri" ? "en" : "lt");
const shots = process.env.WORLD_SHOTS;
const cafe = "s72-cafe";
const clearGround = { x: 28, z: -14.6, rot: Math.PI }; // moves.mjs
const padHint = "[data-pad-hint]";
const toolbar = "[data-pad-toolbar], [data-pad-scope=drawer]";
const phoneTool = "[data-pad-tool=phone]";
const scenariosTool = "[data-pad-tool=scenarios]";
const intro = ".scene-intro[data-pad-scope=intro]";
const button = { A: 0, B: 1, X: 2, LT: 6, RT: 7, Menu: 9, Up: 12, Down: 13, Left: 14, Right: 15 };
const turn = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

assert(["en", "lt"].includes(learner), `Unknown WORLD_LEARNER layer: ${learner}`);

// Café corpus/guide phrases are target-language input. The controller card is UI copy.
const mh = {
  answers: ["I'll have an espresso", "Can I get a latte"],
  hint: ["Valdiklis prijungtas", "Valdiklis atsijungė", "Judėti", "Apsidairyti", "Pašokti", "Naudoti", "Pasirinkti", "Grįžti"],
};
const pc = {
  answers: ["Un americano", "Un latte, por favor"],
  hint: learner === "lt" ? mh.hint :
    ["Controller connected", "Controller disconnected", "Move", "Look", "Jump", "Use", "Choose", "Go back"],
};
const fixture = storage === "puerto-colibri" ? pc : mh;

if (shots) await mkdir(shots, { recursive: true });
const browser = await chromium.launch({
  channel: process.env.WORLD_BROWSER_CHANNEL || "chromium",
  headless: true,
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--mute-audio"],
});

function install({ key, progress }) {
  localStorage.setItem(key, JSON.stringify(progress));
  sessionStorage.setItem("ew-play-now", "1");
  window.SpeechRecognition = undefined;
  window.webkitSpeechRecognition = undefined;
  // The same silent speech completion used by the kit fixtures, with no native synthesizer.
  speechSynthesis.getVoices = () => [];
  speechSynthesis.speak = (utterance) => requestAnimationFrame(() => utterance.onend?.());

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
  let pad;
  Object.defineProperty(navigator, "getGamepads", {
    configurable: true,
    value: () => { polls++; return slots; },
  });
  const dispatch = (type) => {
    const event = new Event(type);
    Object.defineProperty(event, "gamepad", { value: pad });
    window.dispatchEvent(event);
  };
  function attach(mapping = "standard", held = []) {
    pad = {
      id: "Browser contract controller", index: 0, connected: true, mapping,
      timestamp: now, axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({
        pressed: held.includes(i), touched: held.includes(i), value: +held.includes(i),
      })),
    };
    slots[0] = pad;
    dispatch("gamepadconnected");
  }
  function detach() {
    slots[0] = null;
    pad.connected = false;
    dispatch("gamepaddisconnected");
  }

  // Watch the transient's wall time even if a render batch or artifact capture is slow.
  const notices = [];
  let current;
  new MutationObserver(() => {
    const hint = document.querySelector("[data-pad-hint]");
    const kind = hint?.dataset.padHint;
    if (current?.hint === hint && current?.kind === kind) return;
    if (current) current.record.removed = wallNow();
    current = undefined;
    if (hint) {
      const record = { kind, shown: wallNow(), removed: null };
      notices.push(record);
      current = { hint, kind, record };
    }
  }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-pad-hint"] });

  window.__padFixture = {
    attach, detach, dispatch, notices,
    get polls() { return polls; },
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
  const lift = player?.lift;
  // The root tracks support height and the avatar's body gets the hop's lift.
  const jumpY = p ? p.position.y + lift : null;
  const view = p && rig ? rig.cam.getWorldDirection(p.position.clone()).toArray() : null;
  return {
    screen: state?.screen, phase: state?.conv.active ? state.conv.phase : g?.rides?.phase,
    mode: state?.hud.modeScreen?.id, modePhase: document.querySelector(".mode-hud [data-pad-phase]")?.dataset.padPhase,
    panel: state?.hud.panel, prompt: state?.hud.prompt?.kind, water: state?.hud.ride, zone: g?.zone?.id,
    introOpen: state?.conv.introOpen, transition: g?.transitioning, waitingForTraffic: g?.rides?.waitingForTraffic,
    pos, jumpY, lift, speed: r?.m.speed ?? g?.vel?.length(),
    ride: r && { id: r.id, x: r.m.x, z: r.m.z, heading: r.m.heading, steer: r.m.steer },
    visible: p?.visible, yaw: rig?.yaw, view, swimming: g?.swimming, cameraY: rig?.cam.position.y,
    hop: g?.hop && { y: g.hop.y, air: g.hop.air, flipped: g.hop.flipped, doubled: g.hop.doubled },
    focus: f && { tag: f.tagName, scope: f.closest("[data-pad-scope]")?.dataset.padScope, key: f.dataset.padTool ?? f.dataset.padAnswer ?? f.dataset.sit ?? f.dataset.line ?? f.dataset.chip },
    pad: window.__pad ? { ...window.__pad } : null, polls: window.__padFixture?.polls,
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

async function run(width, height, mobile, mode, contract) {
  const context = await browser.newContext({
    viewport: { width, height }, isMobile: mobile, hasTouch: mobile,
    deviceScaleFactor: mobile ? 2 : 1, serviceWorkers: "block",
  });
  const label = `${width}x${height}-${mode}`;
  const errors = [];
  let page;
  let phase = "startup";
  const check = (name, value, detail) => {
    assert(value, `${label} · ${name}: ${JSON.stringify(detail)}`);
    console.log("ok", label, name, detail === undefined ? "" : JSON.stringify(detail));
  };
  const shot = (name) => shots ? page.screenshot({ path: join(shots, `gamepad-${label}-${name}.png`), timeout: 5000 }) : undefined;
  try {
    const cors = { "access-control-allow-origin": "*" };
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
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
        settings: { ...returnedPlayer.settings, play: mode, cameraFollow: false, textSize: 1, textMessages: false, volume: 0, sounds: 0 },
      },
    });
    page = await context.newPage();
    page.setDefaultTimeout(5000);
    page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && !/^\s*(?:\[audio\]\s*)?Missing (?:audio )?clip\b/i.test(message.text())) {
        errors.push(`console: ${message.text()}`);
      }
    });
    await page.goto(base.href, { waitUntil: "domcontentloaded", timeout: 90000 });
    const state = () => page.evaluate(readState);
    const step = async (count = 1) => {
      const frames = [];
      for (let i = 0; i < count; i += 6) {
        frames.push(...await page.evaluate((n) => window.__step(n), Math.min(6, count - i)));
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
    const sample = (axes = [0, 0, 0, 0], buttons = {}) => page.evaluate(
      ([axes, buttons]) => window.__padFixture.sample(axes, buttons), [axes, buttons],
    );
    const press = (key) => sample(undefined, { [button[key]]: 1 });
    const tap = async (key) => {
      await press(key);
      await step();
      await sample();
      await step(2);
    };
    const attach = (mapping, held) => page.evaluate(
      ([mapping, held]) => window.__padFixture.attach(mapping, held), [mapping, held],
    );
    const detach = () => page.evaluate(() => window.__padFixture.detach());
    const duplicate = (type) => page.evaluate((type) => window.__padFixture.dispatch(type), type);
    const focused = (selector) => page.evaluate((sel) => document.activeElement?.matches(sel) ?? false, selector);
    // The controls are reached through pad edges even if an optional tool contributes a navigation stop.
    async function focusWith(selector, key = "Down", limit = 12) {
      for (let i = 0; i < limit && !(await focused(selector)); i++) await tap(key);
      check(`focus reaches ${selector}`, await focused(selector), await state());
    }
    await until("returned player is ready", () => page.evaluate((mode) => {
      const { game, store } = window.__ew ?? {};
      return store?.getState().screen === "play" && (mode === "light"
        ? game?.light && !!document.querySelector('.lh[data-pad-scope="home"]')
        : game?.ledges?.ready && !game.transitioning && !!document.querySelector(".toolbar"));
    }, mode), { timeout: 120000, frames: 3 });

    if (mode === "town") {
      await page.evaluate(() => {
        const { audio, coach } = window.__ew;
        coach?.finish();
        const play = audio.play.bind(audio);
        audio.play = (...args) => {
          const result = play(...args);
          // end-card.mjs advances dialogue through the same action as Continue reading.
          void audio.init().then(() => audio.continueReading());
          return result;
        };
      });
    }
    await contract({
      context, page, mobile, step, state, until, when, sample, press, tap, attach, detach, duplicate,
      focused, focusWith, check, shot, mark: (name) => { phase = name; },
    });
    check("no page or console errors", errors.length === 0, errors);
  } catch (error) {
    const snapshot = page ? await page.evaluate(readState).catch(() => null) : null;
    if (page && shots) await shot("failure").catch(() => {});
    throw new Error(`${label} · ${phase}\n${JSON.stringify({ snapshot, errors })}`, { cause: error });
  } finally {
    await context.close();
  }
}

async function inspectHint(h, kind, map, extra = "") {
  const { page, until, check } = h;
  const [on, off, move, look, jump, use, choose, back] = fixture.hint;
  const expected = map === "world" ? [["L", move], ["R", look], ["A", jump], ["X", use]]
    : [["✚/L", move], ["A", choose], ["B", back]];
  const status = kind === "connected" ? on : off;
  await until(`${kind} hint has its status`, () => page.evaluate(([selector, status]) =>
    document.querySelector(selector)?.textContent === status, [`${padHint} strong`, status]), { frames: 0, timeout: 1500 });
  const result = await page.evaluate(([selector, extra]) => {
    const cards = [...document.querySelectorAll(selector)];
    const card = cards[0];
    if (!card) return { count: cards.length };
    const box = card.getBoundingClientRect();
    const safe = document.createElement("div");
    safe.style.cssText = "position:fixed;visibility:hidden;inset:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
    document.body.append(safe);
    const inset = safe.getBoundingClientRect();
    safe.remove();
    const within = (r, b) => r.width > 0 && r.height > 0 && r.left >= b.left - 1 && r.top >= b.top - 1
      && r.right <= b.right + 1 && r.bottom <= b.bottom + 1;
    const drawn = (el) => el.getClientRects().length && getComputedStyle(el).visibility === "visible";
    const selectors = [".joy", ".jump-btn", ".act-btn", ".ride-menu", ".prompt", extra].filter(Boolean).join(",");
    const obstacles = [...document.querySelectorAll(selectors)].filter(drawn).filter((el) => {
      const r = el.getBoundingClientRect();
      return r.left < box.right && r.right > box.left && r.top < box.bottom && r.bottom > box.top;
    }).map((el) => el.className);
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
      box: box.toJSON(), safe: within(box, inset), textFits, obstacles,
      mapSize: parseFloat(getComputedStyle(map).fontSize), visible: !!drawn(card),
      overflow: card.scrollWidth - card.clientWidth,
    };
  }, [padHint, extra]);
  check(`${kind} hint has one visible status and paired map`, result.count === 1 && result.kind === kind &&
    result.status === status && result.visible && result.role === "status" && result.live === "polite" &&
    JSON.stringify(result.columns) === JSON.stringify(expected) && result.menuKey === (map === "menu" ? "☰" : null), result);
  check(`${kind} hint stays in the safe area, clear of current controls`, result.safe && result.textFits &&
    result.overflow <= 1 && result.mapSize >= 12 && result.box.width <= 269 && result.box.height <= 140 &&
    result.obstacles.length === 0, result);
  return result;
}

async function hintExpires(h, kind, milliseconds) {
  const gone = await h.until(`${kind} hint expires on the wall clock`, () => h.page.evaluate((kind) =>
    window.__padFixture.notices.findLast((notice) => notice.kind === kind && notice.removed !== null), kind),
  { timeout: milliseconds + 1500, frames: 0 });
  const duration = gone.removed - gone.shown;
  h.check(`${kind} hint expires around ${milliseconds} ms`, duration >= milliseconds - 150 && duration <= milliseconds + 900 &&
    await h.page.locator(padHint).count() === 0, { duration });
}

async function realMovement(h) {
  const { context, page, mobile } = h;
  if (!mobile) return { down: () => page.keyboard.down("w"), up: () => page.keyboard.up("w") };
  const cdp = await context.newCDPSession(page);
  const touch = (type, touchPoints = []) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  return {
    async down() {
      const box = await page.locator(".joy").boundingBox();
      assert(box, "The touch joystick is available");
      const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
      await touch("touchStart", [point]);
      await touch("touchMove", [{ ...point, y: point.y - 42 }]);
    },
    up: () => touch("touchEnd"),
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

async function idleAndAttach(h, real) {
  const { page, step, state, check, attach, detach, when, duplicate, sample, shot } = h;
  h.mark("town baseline");
  await place(h);
  const before = await state();
  await step(60);
  const idle = await state();
  check("60 quiet frames leave position, focus, and controller polling alone", before.polls >= 1 && idle.polls === before.polls &&
    !idle.hint && idle.focus.tag === "BODY" && horizontal(before, idle) < 0.05 &&
    JSON.stringify(idle.pad) === JSON.stringify({ connected: false, lastAction: null, focusTarget: null }), { before, idle });
  await shot("baseline");
  await existingMovement(h, real, "without a controller");
  await place(h);
  const probe = await state();
  await attach("");
  await step(8);
  check("a nonstandard device produces no hint or frame polling", await page.locator(padHint).count() === 0 &&
    (await state()).polls === probe.polls && !(await state()).pad.connected);
  await detach();
  // Attach and remove a Standard pad within one event-loop turn, before the lazy module settles.
  await page.evaluate(() => {
    window.__padFixture.attach();
    window.__padFixture.detach();
  });
  const afterStale = await state();
  await step(20);
  check("a connection removed during the lazy load leaves the town idle", await page.locator(padHint).count() === 0 &&
    !(await state()).pad.connected && (await state()).polls === afterStale.polls);

  h.mark("neutral attach");
  const neutral = await state();
  await attach();
  await when("first Standard pad sample after lazy readiness", (s) => s.pad?.connected, { frames: 1 });
  await duplicate("gamepadconnected");
  await step(5);
  const connected = await state();
  check("the first six samples preserve focus and the grounded player", connected.focus.tag === neutral.focus.tag &&
    connected.pad.focusTarget === null && connected.pad.lastAction === null && !connected.hop.air &&
    horizontal(neutral, connected) < 0.05, { neutral, connected });
  await inspectHint(h, "connected", "world");
  await shot("connect");
  const frames = await step(20);
  check("town samples once on each of 20 stable host frames", frames.every((frame) => frame.polls === 1) &&
    (await state()).polls - connected.polls === 20, frames);
  await hintExpires(h, "connected", 3200);
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

async function walkLookJump(h) {
  const { state, step, sample, press, check, shot, when } = h;
  h.mark("walk and look");
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
  h.mark("car boarding");
  const car = await page.evaluate(() => {
    const g = window.__ew.game;
    const cars = g.rides.list.filter((r) => r.kind === "car");
    const parked = g.town.parkedCars?.placements ?? [];
    // As in moves.mjs, leave room to move ahead of the parked car, including past roadside models.
    for (const r of cars) {
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
  const coastGround = await lane();
  await step(5);
  const coast = await state();
  const brakeGround = await lane();
  await sample(undefined, { [button.LT]: 1 });
  await step(5);
  const brake = await state();
  check("the first five LT frames lose more speed than five coasting frames on the same surface",
    coast.speed > 1 && steered.speed >= coast.speed && coast.speed - brake.speed > steered.speed - coast.speed &&
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
}

async function boatContract(h) {
  const { page, state, step, sample, tap, when, check, shot } = h;
  h.mark("boat boarding");
  const boat = await page.evaluate(() => {
    const g = window.__ew.game;
    const boats = g.rides.list.filter((r) => r.kind === "boat");
    for (const r of boats) {
      // rides.mjs searches the hull's approach points rather than using a pier coordinate.
      for (let a = 0; a < Math.PI * 2; a += 0.2) for (const d of [2.4, 2.9, 3.3]) {
        const x = r.m.x + Math.cos(a) * d, z = r.m.z + Math.sin(a) * d;
        if (!g.town.walkableAt(x, z) || g.rides.near(x, z) !== r) continue;
        g.enterZone("town", { x, z, rot: r.m.heading }, true);
        return { id: r.id, x, z };
      }
    }
    return null;
  });
  check("there is a walkable approach to a town hull", boat);
  await when("boat prompt at the hull", (s) => s.prompt === "boat");
  await tap("X");
  await when("X boards the selected hull", (s) => s.ride?.id === boat.id && s.phase === "on" && s.prompt === "out");
  await step(10);
  const moored = await state();
  check("X seats the learner in the identified boat", moored.ride?.id === boat.id && moored.visible, moored);
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
  await tap("X");
  await when("X leaves the boat onto a legal surface or into the water", (s) => !s.ride && s.visible);

  h.mark("beach and swimming");
  const beach = await page.evaluate(() => {
    const g = window.__ew.game;
    const b = g.rides.list.find((r) => r.kind === "boat");
    const nav = g.zone.nav;
    // Both towns have SEA_Z=-72 and SHORE.limit=SEA_Z-5.4 (water.ts), as in rides.mjs.
    const limit = -77.4;
    const hulls = g.rides.list.filter((q) => q.kind === "boat").map(({ m }) =>
      ({ x: m.x, z: m.z, r: Math.hypot(m.spec.half, m.spec.wide) }));
    const hazards = [...g.rides.sea.circles, ...hulls];
    // The clear beach search from moves.mjs, with room to reach diving depth in the same channel.
    for (const dx of [8, 12, 4, 16, -8, -12]) {
      const x = b.home.x + dx;
      if (hazards.some((c) => Math.abs(c.x - x) < c.r + 0.6 && c.z < limit + 14 && c.z > limit - 25)) continue;
      if (g.rides.sea.boxes.some((box) => x > box.minX - 0.6 && x < box.maxX + 0.6 && box.maxZ > limit - 20)) continue;
      for (const dz of [9, 8, 7, 6, 5, 4]) {
        const z = b.home.z + dz;
        let clear = true;
        for (let zz = z; zz >= b.home.z + 3.5; zz -= 0.5) {
          if (!nav.free(nav.idx(x, zz))) { clear = false; break; }
        }
        if (clear) return { x, z, rot: Math.PI, limit };
      }
    }
    return null;
  });
  check("the town hull identifies an unobstructed beach-to-water line", beach);
  await place(h, beach);
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
  await tap("A");
  await when("A dives below the surface", (s) => s.water === "dive" && s.cameraY < -0.4);
  await shot("swimmer-dive");
  await tap("A");
  await when("a fresh A returns to the surface", (s) => s.water === "swim");
  check("a release-separated A pair dives and surfaces in water", (await state()).swimming, await state());
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
  check("the selected café is staged before A", before.id === sit && before.intro, before);
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
      marked: f.hasAttribute("data-pad-focus"), scope: f.closest("[data-pad-scope]")?.dataset.padScope,
      key: window.__pad.focusTarget, width: parseFloat(css.outlineWidth), style: css.outlineStyle, contrast,
      color: css.outlineColor, offset: css.outlineOffset,
      onTop: f.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)),
    };
  }, selector);
  h.check("the selected control has scoped focus and a visible, unobstructed contrast ring", effect?.scope === scope &&
    effect.key === key && effect.marked && effect.style === "solid" && effect.width >= 2 &&
    effect.contrast >= 3 && effect.onTop && effect.color === "rgb(8, 124, 120)" && effect.offset === "2px", effect);
}

async function wordPopoverContract(h, launcher) {
  const { page, mobile, focused, tap, press, step, sample, until, state, check, shot } = h;
  h.mark("word popover over the café");
  const conversation = () => page.evaluate(() => {
    const { game, store } = window.__ew;
    const { conv } = store.getState();
    return { active: conv.active && game.activeSession?.active, id: conv.sitId, run: conv.run,
      lines: conv.transcript.map(({ id }) => id) };
  });
  const before = await conversation();
  // Use the ordinary transcript tap from nat-star.mjs while the existing café turn is open.
  const word = page.locator('.convo .transcript .msg.npc .il .u[data-i="0"]:has(.lt:not(.dash)) > .en').first();
  await word.evaluate((el) => el.scrollIntoView({ block: "nearest", behavior: "instant" }));
  const point = await word.evaluate((el) => {
    const { left, top, width, height } = el.getBoundingClientRect();
    const x = left + width / 2, y = top + height / 2;
    return el.contains(document.elementFromPoint(x, y)) && { x, y };
  });
  check("a real NPC word can be tapped in the transcript", point, point);
  if (mobile) await page.touchscreen.tap(point.x, point.y);
  else await page.mouse.click(point.x, point.y);
  const popup = 'body > .wpop[role="dialog"]';
  const choices = page.locator(`${popup} .wpop-acts button`);
  await until("the body portal offers both card actions", async () =>
    await choices.count() === 2 && await choices.first().isVisible());
  await step(2);
  await tap("Down");
  const first = (await state()).pad.focusTarget;
  check("the first direction focuses the word action in the upper dialog",
    first && await focused(`${popup} .wpop-acts button:nth-of-type(1)`), first);
  await tap("Right");
  const second = (await state()).pad.focusTarget;
  check("the two sibling buttons have distinct controller IDs", second && second !== first, { first, second });
  await checkFocusRing(h, `${popup} .wpop-acts button:nth-of-type(2)`, second, "popover");
  await shot("word-popover-focus");
  await tap("A");
  await until("A saves the whole sentence through the upper button", async () =>
    await choices.count() === 1 && await page.locator(`${popup} .wpop-in`).filter({ hasText: "Sakinys kortelėse" }).count() === 1);
  await tap("Down");
  check("the remaining word action accepts focus", await focused(`${popup} .wpop-acts button`), await state());
  await tap("A");
  await until("the real dialog stays open with both cards saved and no buttons", async () =>
    await choices.count() === 0 && await page.locator(`${popup} .wpop-in`).count() === 2);
  await press("B");
  await until("B closes the buttonless word popover", async () => await page.locator(popup).count() === 0);
  await step(32);
  const after = await conversation();
  check("held B closes only the word dialog and restores the same answer in the same conversation",
    after.active && after.id === before.id && after.run === before.run &&
    JSON.stringify(after.lines) === JSON.stringify(before.lines) &&
    await focused(launcher + "[data-pad-focus]"), { before, after, focus: (await state()).focus });
  await sample();
  await step(2);
}

async function townUi(h) {
  const { page, mobile, focused, focusWith, press, tap, sample, step, until, when, state, check, shot } = h;
  h.mark("toolbar and nested phone");
  await place(h);
  const before = await state();
  const folded = page.locator('.toolbar .ride-menu[aria-expanded="true"]');
  await tap("Menu");
  await until("Menu opens the drawer or focuses the toolbar", async () =>
    (mobile ? await folded.count() === 1 : await focused(`[data-pad-toolbar] ${scenariosTool}`)));
  check("Menu starts navigation at scenarios", await focused(`:is(${toolbar}) ${scenariosTool}`), await state());
  await sample([0, 0.85, 0, 0]);
  await step(2);
  await sample();
  await step(2);
  check("a stick deflection moves focus to another toolbar control",
    await focused(`:is(${toolbar}) button`) && !(await focused(scenariosTool)), await state());
  await focusWith(`:is(${toolbar}) ${phoneTool}`);
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

  h.mark("picker and intro");
  await tap("Menu");
  await focusWith(`:is(${toolbar}) ${scenariosTool}`, "Up");
  await tap("A");
  await when("A opens scenarios", (s) => s.panel === "scenarios");
  const card = `[data-pad-scope=panel] .scn-card[data-sit="${cafe}"]`;
  await until("the café card exists in the real picker", () => page.locator(card).first().isVisible());
  await focusWith(card);
  await shot("picker");
  await press("A");
  await step();
  await until("holding A on the picker opens the café intro", () => page.locator(intro).isVisible());
  await step(16);
  check("held picker A does not also click the new intro's primary", await page.evaluate(() => {
    const { conv } = window.__ew.store.getState();
    return conv.introOpen && conv.transcript.length === 0;
  }), await state());
  await sample();
  await step(2);
  await startScene(h, cafe);
  await until("the current session reaches an actual learner turn", () => page.evaluate(() => {
    const { game, store } = window.__ew;
    const { conv } = store.getState();
    return game.activeSession?.active && conv.phase === "you" && !conv.introOpen;
  }));

  h.mark("scoped café answer");
  const answers = fixture.answers;
  const seed = await page.evaluate((choices) => {
    const { store } = window.__ew;
    const current = store.getState().conv;
    store.getState().setConv({ speechChoices: choices, lastHeard: choices[0] });
    return { run: current.run, ids: current.transcript.map(({ id }) => id) };
  }, answers);
  const choices = page.locator('.convo [data-pad-answer]:enabled');
  await until("the two real answer buttons are rendered", async () => await choices.count() === 2);
  check("both real controls contain the seeded target-language answers",
    JSON.stringify(await choices.allTextContents()) === JSON.stringify(answers), await choices.allTextContents());
  await step(2);
  const typed = await focused(".convo .typebox input");
  if (typed) {
    await tap("B");
    check("field Back exits typing focus while preserving the conversation", await focused('.convo [data-pad-answer]') &&
      await page.locator(".convo").count() === 1, await state());
  }
  const first = '.convo [data-pad-answer]:nth-of-type(1)';
  const second = '.convo [data-pad-answer]:nth-of-type(2)';
  await focusWith(first);
  const learner = await state();
  await tap("Down");
  await checkFocusRing(h, second, answers[1]);
  await shot("choice-focus");
  if (storage !== "puerto-colibri") await wordPopoverContract(h, second);
  h.mark("scoped café answer");
  await press("A");
  await step();
  await until("one real learner transcript entry is added", () => page.evaluate(({ ids }) =>
    window.__ew.store.getState().conv.transcript.some((line) => !ids.includes(line.id) && line.who === "you"), seed));
  await step(34);
  await when("the confirmation proceeds through the next actual turn", (s) => ["you", "ended"].includes(s.phase));
  const submitted = await page.evaluate(({ ids }) => {
    const { conv } = window.__ew.store.getState();
    return { run: conv.run, added: conv.transcript.filter((line) => line.who === "you" && !ids.includes(line.id)).map(({ text }) => text) };
  }, seed);
  const normalize = (text) => text.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").trim();
  const standing = await state();
  check("held A submits the second answer once through the new turn and does not move or jump in town",
    submitted.run === seed.run && submitted.added.length === 1 &&
    normalize(submitted.added[0]) === normalize(answers[1]) && normalize(submitted.added[0]) !== normalize(answers[0]) &&
    horizontal(learner, standing) < 0.05 && !standing.hop.air, { seed, submitted, learner, standing });
  await sample();
  await step(3);
  if (await focused(".convo .typebox input")) await tap("B");
  await tap("B");
  await when("B returns from the conversation", (s) => s.phase === "on" && !s.panel && !s.transition);
}

async function kitContract(h) {
  const { page, until, when, focusWith, tap, check, shot } = h;
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
  await focusWith(`[data-pad-scope=barista] ${greeting}`);
  await tap("A");

  h.mark("café kit order and chip");
  const enabled = '[data-pad-scope=barista] [data-row] [data-chip][aria-disabled="false"]';
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
}

async function meetingContract(h) {
  const { page, until, focused, when, tap, press, sample, step, check, shot, state } = h;
  h.mark("Lizzie meeting choices");
  await page.evaluate(() => {
    const { game, store } = window.__ew;
    // This is the saved invitation and town arrival used by phone-rings.mjs.
    store.getState().updateProgress((p) => {
      p.phone ??= { played: 0, missed: {} };
      p.phone.invitation = { place: "cafe", chip: "prie kavinės", when: "penktadienį 19:30" };
    });
    game.teleportTo("sunny-cup");
  });
  const meeting = '.lizzie-meeting[data-pad-scope="meeting"]';
  const ready = `${meeting} [data-meeting-answer="phone_meet_ready"]:enabled`;
  const tickets = `${meeting} [data-meeting-answer="phone_meet_tickets"]:enabled`;
  const greeting = page.locator(`${meeting} [data-meeting-line="phone_meet_hello"]`);
  await until("arriving at Sunny Cup starts Lizzie's actual greeting", () => greeting.isVisible(), { timeout: 25000 });
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
  await shot("lizzie-choice-focus");
  await tap("A");
  await until("Lizzie gives her follow-up after the focused answer", () =>
    page.locator(`${meeting} [data-meeting-line="phone_meet_go"]`).isVisible(), { timeout: 20000, frames: 6 });
  await when("the meeting completes and returns to town", (s) => !s.mode && !s.transition && s.phase === "on",
    { timeout: 20000, frames: 6 });
  check("the chosen reply consumes the saved invitation through normal progression",
    await page.evaluate(() => !window.__ew.game.phoneState().invitation), await state());
}

async function detachContract(h, real) {
  const { page, step, state, when, sample, attach, detach, duplicate, check, shot, until } = h;
  h.mark("unplug while moving");
  await place(h);
  const rest = await state();
  await sample([0, -0.8, 0, 0]);
  await step(22);
  const moving = await state();
  check("the pad is physically deflected and walking before disconnect", horizontal(rest, moving) > 0.35, { rest, moving });
  // The original source stays down through the unplug. It must own the original movement continuously.
  await real.down();
  let disconnected;
  try {
    await step(3);
    await detach();
    await duplicate("gamepaddisconnected");
    await step();
    disconnected = await state();
    check("the next frame reports one disconnect and releases controller focus", !disconnected.pad.connected &&
      disconnected.pad.focusTarget === null && disconnected.pad.lastAction === "disconnect" && !disconnected.hop.air,
    disconnected);
    await inspectHint(h, "disconnected", "world");
    await turn(100);
    await shot("disconnect");
    await sample([0.92, 0.85, 0.9, 0], { [button.A]: 1, [button.LT]: 1, [button.RT]: 1 });
    await step(22);
    const continued = await state();
    check("unplug leaves the held real movement source working", horizontal(disconnected, continued) > 0.4 &&
      !continued.hop.air && Math.abs(angle(disconnected.yaw, continued.yaw)) < 0.02, { disconnected, continued });
  } finally {
    await real.up();
  }
  await step(36);
  const afterDamping = await state();
  await sample([-0.94, -0.85, -0.9, 0], { [button.X]: 1, [button.RT]: 1 });
  await step(10);
  await sample([0.9, 0.85, 0.9, 0], { [button.A]: 1, [button.LT]: 1 });
  await step(20);
  const orphaned = await state();
  check("the orphaned fake cannot walk, orbit, jump, charge or cause frame polls",
    orphaned.polls === disconnected.polls && horizontal(afterDamping, orphaned) < 0.05 &&
    Math.abs(angle(afterDamping.yaw, orphaned.yaw)) < 0.02 && !orphaned.hop.air &&
    orphaned.pad.lastAction === "disconnect", { disconnected, afterDamping, orphaned });
  await hintExpires(h, "disconnected", 2400);
  check("a duplicate disconnect produces one announcement", await page.evaluate(() =>
    window.__padFixture.notices.filter((n) => n.kind === "disconnected").length === 1));
  await shot("disconnect-cleared");
  await existingMovement(h, real, "after unplug");

  h.mark("same-index reconnect and 130% hint");
  await place(h);
  await page.evaluate(() => window.__ew.store.getState().setSettings({ textSize: 1.3 }));
  await until("the app applies the 130% text setting", () => page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--scale").trim() === "1.3"));
  await attach("standard", [button.A]);
  await when("the replacement connects on the same slot", (s) => s.pad.connected, { frames: 1 });
  const ground = await state();
  await step(8);
  const scaled = await inspectHint(h, "connected", "world");
  check("the visible map scales and fits at 130%", scaled.mapSize >= 15.5, scaled);
  await shot("connect-130-percent");
  const held = await state();
  check("a physically held A on the new pad does not jump",
    !held.hop.air && Number.isFinite(ground.jumpY) && Number.isFinite(held.jumpY) &&
    Math.abs(held.jumpY - ground.jumpY) < 0.05 && Math.abs(held.pos[1] - ground.pos[1]) < 0.05, { ground, held });
  await sample();
  await step(2);
  await h.press("A");
  await step(4);
  const fresh = await state();
  check("a real release and fresh A after reconnect lifts the player",
    fresh.hop.air && Number.isFinite(fresh.jumpY) && fresh.jumpY > ground.jumpY + 0.1,
    { ground, fresh });
  await sample();
  await when("the reconnect jump lands", (s) => !s.hop.air);
}

async function townContract(h) {
  const real = await realMovement(h);
  await idleAndAttach(h, real);
  await walkLookJump(h);
  await carContract(h);
  await boatContract(h);
  await townUi(h);
  await kitContract(h);
  if (storage !== "puerto-colibri") await meetingContract(h);
  await detachContract(h, real);
}

async function lightContract(h) {
  const { page, step, state, attach, focused, focusWith, check, shot, tap, when, until } = h;
  h.mark("light home");
  const lightOnly = () => page.evaluate(() => {
    const g = window.__ew.game;
    return g.light && !g.groundCanvas && !g.renderer && !g.player &&
      !document.querySelector(".stage, canvas");
  });
  await step(4);
  const probe = await state();
  const lightFrames = await step(20);
  check("light home uses its existing frame callback and no town host", await lightOnly() &&
    lightFrames.every(({ callbacks, polls }) => callbacks === 1 && polls === 0) &&
    (await state()).polls === probe.polls, lightFrames);
  await attach();
  await when("the light host sees the Standard pad", (s) => s.pad.connected, { frames: 1 });
  check("neutral attach does not focus a card", (await state()).focus.tag === "BODY", await state());
  const card = `.lh-card[data-sit="${cafe}"]`;
  await inspectHint(h, "connected", "menu", `${card}, .lh-tools button`);
  await shot("light-connect");
  const polled = await step(20);
  check("light samples once per existing frame with no new frame callback", await lightOnly() &&
    polled.every(({ callbacks, polls }) => callbacks === 1 && polls === 1), polled);

  h.mark("light scene and back");
  await focusWith(`[data-pad-scope=home] ${card}`);
  check("light card focus belongs to home", await focused(`[data-pad-scope=home] ${card}[data-pad-focus]`) &&
    (await state()).pad.focusTarget === cafe, await state());
  await tap("A");
  await startScene(h, cafe);
  await shot("light-scene");
  // A conversation is closable even if local audio is still finishing. At a typing field B first moves focus.
  if (await focused(".convo .typebox input")) await tap("B");
  await tap("B");
  await until("B closes the light conversation and restores the actual home", () => page.evaluate(() =>
    !window.__ew.store.getState().conv.active && !!document.querySelector(".lh[data-pad-scope=home]:not([inert])")));
  check("the light scene and Back never create a 3D host", await lightOnly());
  await shot("light-back");
}

try {
  for (const [width, height, mobile] of [[390, 844, true], [1280, 800, false]]) {
    await run(width, height, mobile, "town", townContract);
    await run(width, height, mobile, "light", lightContract);
  }
  console.log("gamepad: all checks passed");
} finally {
  await browser.close();
}
