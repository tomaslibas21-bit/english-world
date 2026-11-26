// WORLD_TEST_URL=http://127.0.0.1:8176 node tests/browser/talk-framing.mjs
// WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en|lt selects the PC build.
// Set WORLD_SHOTS to save failure JPEGs beside the subset's JSON report under .b6/audit/.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS, SIZES, measureTalk, measurementConfig } from "../../tools/talk-framing-measure.mjs";
import {
  INTRO_START, before, beginTalk, launchBrowser, openContext, readCatalogue, remaining,
  requestCloseTalk, seedFramingPage, shortError, talkIsClosed, worldConfig,
} from "../../tools/talk-framing-browser.mjs";

const MAPLE_HARBOR = [
  "s65a-passport", "s72-cafe", "s78-bank", "s32-supermarket", "s33-small-talk",
  "s64b-security", "p28b-review", "s34-meeting", "s73-restaurant", "p18-startup",
];
const PUERTO_COLIBRI = [
  "s65a-passport", "s72-cafe", "s78-bank", "p28b-review", "s85-dinner", "s91a-lost-wallet",
  "x01-surf", "x03-alux-nikte", "x09-alberca", "x05-tienda", "p18-startup",
];
const RUN_MS = 240_000;
const BOOT_MS = 45_000;
const CASE_MS = 12_000;
const real = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// As in town-entry, the game clock advances only when a test pumps frames.
// Browser timers, React commits, fonts and CSS animation keep their real clocks.
function installClock() {
  let now = 1000;
  let next = 0;
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

function openingState(startName) {
  window.__step(4);
  const { game, store } = window.__ew;
  const { conv } = store.getState();
  const panel = document.querySelector(".convo");
  const intro = document.querySelector(".scene-intro, .intro-card");
  const label = new RegExp(startName, "i");
  const button = intro && ([...intro.querySelectorAll("button")].find((el) =>
    label.test((el.getAttribute("aria-label") ?? el.textContent).trim())) ?? intro.querySelector("button.btn"));
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    if (!r.width || !r.height || r.right <= 0 || r.left >= innerWidth || r.bottom <= 0 || r.top >= innerHeight
        || style.visibility !== "visible") return false;
    for (let node = el; node; node = node.parentElement) if (Number(getComputedStyle(node).opacity) === 0) return false;
    return true;
  };
  const animating = (el) => el?.getAnimations().some((animation) =>
    (animation.pending || animation.playState === "running") && Number.isFinite(animation.effect?.getComputedTiming().endTime));
  const panelAnimating = animating(panel);
  let click = null;
  if (!panelAnimating && !animating(intro) && visible(button) && !button.disabled && button.getAttribute("aria-disabled") !== "true") {
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    if (button.contains(document.elementFromPoint(x, y))) click = { x, y };
  }
  const panelVisible = visible(panel);
  const fontsReady = document.fonts.status === "loaded";
  // Where the live layout observer exists, wait for its first panel refit. The
  // settled DOM rectangle and the following frames also let its final dirty read run.
  const layoutReady = !("talkLayout" in game) || !!game.talkLayout;
  const rect = panelVisible && !panelAnimating ? panel.getBoundingClientRect() : null;
  const first = conv.transcript.find((line) => line.who === "npc");
  const actor = game.talkCast?.find((member) => member.id === conv.npcId);
  return {
    active: conv.active, sitId: conv.sitId, run: conv.run, host: conv.hostId, speaker: conv.npcId,
    line: first?.id ?? null, lineSpeaker: first?.npc ?? null, speaking: conv.speaking, phase: conv.phase,
    introOpen: conv.introOpen || !!intro, introButton: !!button, click,
    mode: game.rig?.mode, actor: game.talkNpc?.id ?? null,
    cast: game.talkCast?.map((member) => member.id) ?? [],
    liveSpeaker: !!actor && game.npcs?.includes(actor) && !!actor.ch?.root,
    panelVisible, panelAnimating, fontsReady, layoutReady,
    box: rect && [rect.x, rect.y, rect.width, rect.height],
    openingText: !!panel?.querySelector(".transcript .msg.npc .bubble-part.speaking, .transcript .msg.npc.speaking .bubble")?.textContent.trim(),
    picture: !!document.querySelector(".scene-backdrop"),
  };
}

async function waitForOpening(page, sit, touch, deadline) {
  let previousBox;
  let sawStart = false;
  let pressedStart = false;
  let state;
  while (Date.now() < deadline) {
    state = await before(deadline, "reading the opening state", () => page.evaluate(openingState, INTRO_START.source));
    assert(!state.active || state.sitId === sit.id, `expected ${sit.id}, opened ${state.sitId}`);
    if (state.introOpen) {
      sawStart ||= state.introButton;
      if (state.click && !pressedStart) {
        const { x, y } = state.click;
        await before(deadline, "pressing the intro start", () => touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
        pressedStart = true;
      }
    } else if (state.active && state.panelVisible) {
      assert(!sawStart || pressedStart, "intro closed without a clickable Start button");
      assert(!state.picture, "picture covers the 3D view");
      if (state.speaking != null || state.phase !== "npc") {
        assert(state.mode === "talk" && state.host === sit.npc && state.actor === sit.npc,
          `expected ${sit.npc} in 3D talk mode, saw host ${state.host}, actor ${state.actor}, rig ${state.mode}`);
        assert(state.speaking != null && state.speaking === state.line && state.speaker === state.lineSpeaker && state.liveSpeaker,
          `first line and live speaking actor disagree: ${JSON.stringify(state)}`);
        if (state.box && state.fontsReady && state.layoutReady && state.openingText) {
          if (previousBox && state.box.every((value, i) => value === previousBox[i])) return state;
          previousBox = state.box;
        } else previousBox = undefined;
      }
    }
    await real(25);
  }
  throw new Error(`timed out waiting for the opening speaker and settled panel: ${JSON.stringify(state)}`);
}

async function finishTalk(page, deadline) {
  await before(deadline, "closing the conversation", () => page.evaluate(requestCloseTalk));
  let idle = false;
  while (Date.now() < deadline) {
    const closed = await before(deadline, "draining the scene and animation frames", () => page.evaluate(talkIsClosed, 4));
    if (closed && idle) return;
    if (!closed) await before(deadline, "closing a pending start", () => page.evaluate(requestCloseTalk));
    idle = closed;
    await real(20);
  }
  throw new Error("timed out returning to the town");
}

async function boot(page, config, size, touch, deadline) {
  await seedFramingPage(page, config.storage, { quietTexts: true });
  await page.addInitScript(installClock);
  await page.goto(config.url.href, { waitUntil: "domcontentloaded", timeout: remaining(deadline) });
  const lang = await page.evaluate(() => document.documentElement.lang);
  assert.equal(lang, config.learner, "served learner layer");
  await page.waitForFunction(() => {
    window.__step(3);
    const { game, store } = window.__ew ?? {};
    const state = store?.getState();
    return state?.screen === "play" && !!game?.renderer?.domElement && !game.transitioning && !state.hud.flight;
  }, null, { timeout: remaining(deadline), polling: 35 });
  const screen = await page.evaluate(() => {
    const { settings, progress } = window.__ew.store.getState();
    const canvas = window.__ew.game.renderer.domElement.getBoundingClientRect();
    return {
      width: innerWidth, height: innerHeight, dpr: devicePixelRatio,
      viewport: [visualViewport.width, visualViewport.height],
      canvas: [canvas.x, canvas.y, canvas.width, canvas.height],
      landscape: matchMedia("(orientation: landscape)").matches,
      touches: navigator.maxTouchPoints, coarse: matchMedia("(pointer: coarse)").matches,
      fine: matchMedia("(pointer: fine)").matches,
      returning: settings.play === "town" && settings.scenes === false && !settings.phoneCalls
        && !settings.textMessages && progress.coach?.done === true,
    };
  });
  assert.deepEqual([screen.width, screen.height, screen.dpr], [size.width, size.height, 1], "CSS viewport and DPR");
  assert.deepEqual(screen.viewport, [size.width, size.height], "visual viewport");
  assert.deepEqual(screen.canvas, [0, 0, size.width, size.height], "canvas geometry matches the audit viewport");
  assert.equal(screen.landscape, size.width > size.height, "viewport orientation");
  assert(touch ? screen.touches > 0 && screen.coarse : screen.touches === 0 && screen.fine,
    `wrong input capability: ${JSON.stringify(screen)}`);
  assert(screen.returning, "returning town save and settings were not applied");
  // Allow the town's existing manifest load to finish, including PC's
  // recorded-only pool opening. The MP3s themselves still receive a 404.
  await page.evaluate(() => window.__ew.audio.init());
  return screen;
}

async function runCase(page, sit, size, touch, end, out, errors) {
  const started = Date.now();
  const deadline = Math.min(started + CASE_MS, end);
  const errorFrom = errors.length;
  const reasons = [];
  let measurement;
  let opening;
  let cleanupFailed = false;
  let frame = null;
  try {
    assert(sit.npc, "situation or its actor is missing from the runtime catalogue");
    await before(deadline, "starting the situation", () => beginTalk(page, sit));
    opening = await waitForOpening(page, sit, touch, deadline);
    await before(deadline, "waiting for conversation fonts", () => page.evaluate(async () => { await document.fonts.ready; }));
    measurement = await before(deadline, "measuring the rendered pose", () => page.evaluate(measureTalk, measurementConfig(size)));
    assert(!measurement.skipped, `unexpected skip: ${measurement.skipped}`);
    assert.equal(measurement.speakerId, opening.speaker, "measured speaker changed");
    const held = await before(deadline, "verifying the held opening line", () => page.evaluate(() => {
      const { conv } = window.__ew.store.getState();
      return [conv.active, conv.sitId, conv.npcId, conv.run, conv.speaking, window.__ew.game.rig.mode, innerWidth, innerHeight];
    }));
    assert.deepEqual(held, [true, sit.id, opening.speaker, opening.run, opening.line, "talk", size.width, size.height],
      "opening line or CSS viewport changed during measurement");
  } catch (error) {
    reasons.push(error.message);
  }
  const checks = measurement?.checks ?? Object.fromEntries(
    CHECKS.map((name) => [name, { status: "n/a", reason: reasons[0] ?? "measurement did not complete" }]));
  for (const name of CHECKS) {
    if (checks[name].status !== "PASS") reasons.push(`${name} ${checks[name].status}: ${checks[name].reason}`);
  }
  if (measurement?.settled === false) reasons.push("camera still moving at the 4 s settle limit");
  if (measurement?.settled == null) reasons.push("camera settling could not be measured");

  if (process.env.WORLD_SHOTS && (reasons.length || errors.length > errorFrom)) {
    const shotBy = Math.min(end, Date.now() + 1500);
    const file = `${size.label}-${sit.id}.jpg`;
    try {
      await before(shotBy, "capturing failure JPEG", () => page.screenshot({
        path: path.join(out, file), type: "jpeg", quality: 60, scale: "css", timeout: remaining(shotBy),
      }));
      frame = file;
    } catch (error) {
      reasons.push(`screenshot: ${shortError(error)}`);
    }
  }
  try {
    await finishTalk(page, Math.min(end, Date.now() + 2500));
  } catch (error) {
    cleanupFailed = true;
    reasons.push(`cleanup: ${shortError(error)}`);
  }
  reasons.push(...errors.slice(errorFrom));
  const row = {
    id: sit.id, size: size.label, input: touch ? "touch" : "keyboard/mouse",
    speaker: measurement?.speaker ?? opening?.speaker ?? null, speakerId: measurement?.speakerId ?? opening?.speaker ?? null,
    pass: reasons.length === 0, checks, reasons, panel: opening?.box ?? null, face: measurement?.face ?? null,
    facePercent: checks.size.percent ?? null, settled: measurement?.settled ?? null, shot: measurement?.shot ?? null,
    wallMs: Date.now() - started, frame,
  };
  return { row, cleanupFailed };
}

async function main() {
  const config = worldConfig();
  const pc = config.storage === "puerto-colibri";
  const roster = pc ? PUERTO_COLIBRI : MAPLE_HARBOR;
  const expectedRows = pc ? 44 : 40;
  const out = fileURLToPath(new URL(`../../.b6/audit/subset-${pc ? `pc-${config.learner}` : "mh"}/`, import.meta.url));
  const started = Date.now();
  const end = started + RUN_MS;
  const report = {
    target: config.url.href, storage: config.storage, learner: config.learner, ids: roster,
    expectedRows, screens: [], rows: [], issues: [], wallMs: null,
  };
  await mkdir(out, { recursive: true });
  console.log(`Talk framing subset · ${config.storage} · learner ${config.learner}`);
  let browser;
  try {
    browser = await launchBrowser(remaining(end));
    for (const size of SIZES) {
      const touch = size.label !== "1280x800";
      const label = `${size.label} ${touch ? "touch" : "keyboard/mouse"}`;
      const errors = [];
      let usedErrors = 0;
      let context;
      const record = (message) => { errors.push(message); console.error(`[${label}] ${message}`); };
      try {
        const bootBy = Math.min(end, Date.now() + BOOT_MS);
        await before(bootBy, "booting the viewport", async () => {
          context = await openContext(browser, size, touch, config.url);
        });
        const page = await before(bootBy, "creating the warm page", () => context.newPage());
        page.on("pageerror", (error) => record(`pageerror: ${error.stack ?? error.message}`));
        page.on("console", (message) => {
          if (message.type() !== "error") return;
          const text = message.text();
          const location = message.location().url;
          const detail = `console error: ${text}${location ? ` (${location})` : ""}`;
          const silentClip = /\.mp3(?:[?#]|$)/.test(location) && /Failed to load resource.*\b404\b/.test(text);
          if (silentClip) console.error(`[${label}] silent clip · ${detail}`);
          else record(detail);
        });
        const screen = await before(bootBy, "starting the returning town", () => boot(page, config, size, touch, bootBy));
        report.screens.push({ label, ...screen });
        const { all } = await before(bootBy, "reading the situation catalogue", () => page.evaluate(readCatalogue));
        const byId = new Map(all.map((sit) => [sit.id, sit]));
        report.issues.push(...errors.map((error) => `[${label}] boot: ${error}`));
        usedErrors = errors.length;
        for (const id of roster) {
          if (Date.now() >= end) throw new Error("240 s run deadline reached");
          const { row, cleanupFailed } = await runCase(page, byId.get(id) ?? { id }, size, touch, end, out, errors);
          report.rows.push(row);
          usedErrors = errors.length;
          console.log(`${row.pass ? "PASS" : "FAIL"} ${JSON.stringify(row)}`);
          if (cleanupFailed) throw new Error(`warm page could not be reused after ${id}`);
        }
      } catch (error) {
        const detail = `[${label}] ${error.message}`;
        report.issues.push(detail);
        console.error(detail);
      } finally {
        await context?.close();
        report.issues.push(...errors.slice(usedErrors).map((error) => `[${label}] ${error}`));
      }
    }
  } catch (error) {
    report.issues.push(error.message);
    console.error(error);
  } finally {
    await browser?.close();
    report.wallMs = Date.now() - started;
    const keys = (rows) => rows.map(({ id, size }) => `${id}/${size}`);
    const actual = keys(report.rows);
    const expected = SIZES.flatMap(({ label }) => roster.map((id) => `${id}/${label}`));
    report.missing = expected.filter((key) => !actual.includes(key));
    report.failedRows = report.rows.filter((row) => !row.pass).length;
    await writeFile(path.join(out, "results.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(`${report.rows.length - report.failedRows}/${expectedRows} rows passed in ${report.wallMs} ms · ${out}`);
    assert.equal(expected.length, expectedRows, "fixed roster row count");
    assert.deepEqual([...new Set(actual)].sort(), expected.sort(), "all fixed situation and viewport pairs");
    assert.equal(actual.length, expectedRows, "exact unique row count");
    assert.deepEqual(report.issues, [], "browser failures outside measured rows");
    assert(report.rows.every((row) => row.pass && row.settled && CHECKS.every((name) => row.checks[name].status === "PASS")),
      `${report.failedRows} rows failed; see ${path.join(out, "results.json")}`);
    assert(report.wallMs < RUN_MS, "subset exceeded 240 s");
  }
}

await main();
