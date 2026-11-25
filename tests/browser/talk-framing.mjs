#!/usr/bin/env node
// WORLD_TEST_URL=http://127.0.0.1:8176 WORLD_STORAGE=puerto-colibri WORLD_LEARNER=en node tests/browser/talk-framing.mjs
// Set WORLD_SHOTS=1 to keep failure JPEGs alongside results.json.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHECKS, SIZES, measureTalk, measurementConfig } from "../../tools/talk-framing-measure.mjs";
import {
  before, beginTalk, checkHeldOpening, finishTalk, launchBrowser, openContext, readCatalogue,
  readyTown, remaining, seedFramingPage, shortError, waitForOpening, watchPageErrors, worldConfig,
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

// As in town-entry, pump the real renderer's frames. CSS, fonts, React commits
// and browser timers keep their real clocks.
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
  };
}

async function boot(page, config, size, touch, deadline) {
  await seedFramingPage(page, config.storage, { quietTexts: true });
  await page.addInitScript(installClock);
  const identity = await readyTown(page, config, deadline);
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
      returning: settings.play === "town" && settings.quality === "low" && settings.scenes === false
        && !settings.phoneCalls && !settings.textMessages && progress.coach?.done === true,
    };
  });
  assert.deepEqual([screen.width, screen.height, screen.dpr], [size.width, size.height, 1], "CSS viewport and DPR");
  assert.deepEqual(screen.viewport, [size.width, size.height], "visual viewport");
  assert.deepEqual(screen.canvas, [0, 0, size.width, size.height], "live canvas geometry");
  assert.equal(screen.landscape, size.width > size.height, "viewport orientation");
  assert(touch ? screen.touches > 0 && screen.coarse : screen.touches === 0 && screen.fine,
    `wrong input capability: ${JSON.stringify(screen)}`);
  assert(screen.returning, "returning town save and settings were not applied");
  return { ...identity, ...screen };
}

async function runCase(page, sit, size, touch, end, out, errors) {
  const started = Date.now();
  const deadline = Math.min(started + CASE_MS, end);
  const config = measurementConfig(size);
  const errorFrom = errors.length;
  const reasons = [];
  let opening, measurement, route, openMs, measureMs;
  let kind;
  let frame = null;
  try {
    assert(sit.npc, "situation or its host is missing from the runtime catalogue");
    route = await beginTalk(page, sit, touch, deadline);
    opening = await waitForOpening(page, sit, touch, deadline);
    openMs = Date.now() - started;
    measurement = await before(deadline, "measuring the rendered pose", () => page.evaluate(measureTalk, config));
    measureMs = Date.now() - started - openMs;
    checkHeldOpening(opening, measurement);
  } catch (error) {
    kind = opening ? "measurement-error" : "open-error";
    if (openMs == null) openMs = Date.now() - started;
    else measureMs ??= Date.now() - started - openMs;
    opening ??= error.opening;
    reasons.push(error.message);
  }
  const snapshot = kind && await before(Math.min(end, Date.now() + 750), "reading the failed opening", () =>
    page.evaluate(measureTalk, { ...config, snapshot: true })).catch(() => null);
  kind ??= measurement?.kind ?? "unavailable";
  const checks = measurement?.checks ?? Object.fromEntries(
    CHECKS.map((name) => [name, { status: "n/a", reason: reasons[0] ?? "measurement did not complete" }]));
  for (const name of CHECKS) {
    if (checks[name].status !== "PASS") reasons.push(`${name} ${checks[name].status}: ${checks[name].reason}`);
  }
  const failed = reasons.length > 0;
  const { settled = null, settle = null } = measurement ?? {};
  const unsettled = settled === false;
  const stable = settled === true && settle.steps >= 10 && settle.samples === 11 && settle.spanMm <= 1 && settle.wallMs <= 4000;
  if (!stable) reasons.push(unsettled ? "camera still moving at the 4 s settle limit" : "ten stable camera steps were not measured");
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
  let cleanupFailed = false;
  try {
    await finishTalk(page, Math.min(end, Date.now() + 2500));
  } catch (error) {
    cleanupFailed = true;
    reasons.push(`cleanup: ${shortError(error)}`);
  }
  const pageErrors = errors.slice(errorFrom);
  reasons.push(...pageErrors);
  const row = {
    id: sit.id, size: size.label, input: touch ? "touch" : "keyboard/mouse", route: route ?? null, kind,
    speaker: measurement?.speaker ?? snapshot?.speaker ?? null,
    speakerId: measurement?.speakerId ?? snapshot?.speakerId ?? opening?.speaker ?? null,
    pass: reasons.length === 0, failed: failed || cleanupFailed || pageErrors.length > 0, unsettled, checks, reasons,
    opening: opening ?? null, panel: opening?.box ?? null, face: measurement?.face ?? null,
    facePercent: checks.size.percent ?? null, settled, settle, shot: measurement?.shot ?? snapshot?.shot ?? null,
    landmarks: measurement?.landmarks ?? null, openMs: openMs ?? null, measureMs: measureMs ?? null,
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
    target: config.url.href, storage: config.storage, learner: config.learner, edition: config.edition,
    ids: roster, expectedRows, screens: [], rows: [], issues: [], wallMs: null,
  };
  await mkdir(out, { recursive: true });
  console.log(`Talk framing subset · ${config.storage} · learner ${config.learner}`);
  let browser;
  try {
    browser = await launchBrowser(remaining(end));
    for (const size of SIZES) {
      const touch = size.label !== "1280x800";
      const label = `${size.label} ${touch ? "touch" : "keyboard/mouse"}`;
      let context, errors = [];
      let usedErrors = 0;
      try {
        const bootBy = Math.min(end, Date.now() + BOOT_MS);
        context = await before(bootBy, "booting the viewport", () => openContext(browser, size, touch, config.url));
        const page = await before(bootBy, "creating the warm page", () => context.newPage());
        errors = watchPageErrors(page);
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
          if (cleanupFailed && id !== roster.at(-1)) throw new Error(`warm page could not be reused after ${id}`);
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
  } finally {
    await browser?.close();
    report.wallMs = Date.now() - started;
    const actual = report.rows.map(({ id, size }) => `${id}/${size}`);
    const expected = SIZES.flatMap(({ label }) => roster.map((id) => `${id}/${label}`));
    report.missing = expected.filter((key) => !actual.includes(key));
    report.failedRows = report.rows.filter((row) => !row.pass).length;
    report.unsettledRows = report.rows.filter((row) => row.unsettled).length;
    await writeFile(path.join(out, "results.json"), JSON.stringify(report, null, 2) + "\n");
    console.log(`${report.rows.length - report.failedRows}/${expectedRows} rows passed in ${report.wallMs} ms · ${out}`);
    assert.equal(expected.length, expectedRows, "fixed roster row count");
    assert.deepEqual([...new Set(actual)].sort(), expected.sort(), "all fixed situation and viewport pairs");
    assert.equal(actual.length, expectedRows, "exact unique row count");
    assert.deepEqual(report.issues, [], "browser failures outside measured rows");
    assert(report.wallMs < RUN_MS, "subset exceeded 240 s");
    assert(report.rows.every((row) => row.pass && row.settled && CHECKS.every((name) => row.checks[name].status === "PASS")),
      `${report.failedRows} rows failed. See ${path.join(out, "results.json")}`);
  }
}

await main();
