import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, open, readFile, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CHECKS, SIZES } from "../../tools/talk-framing-measure.mjs";

const skipIds = ["s76-dentist-call", "s80-support-call", "s83-invite-call", "s89-video-call",
  "s90-running-late", "p24-flood", "p26-complaint", "x04-yaxche"];
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const key = ({ id, size }) => `${id}/${size}`;
const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const save = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
const exists = (file) => stat(file).catch((error) => {
  if (error.code === "ENOENT") return null;
  throw error;
});

export async function localPlaywright(specifier) {
  assert(specifier, "WORLD_PLAYWRIGHT_MODULE must name an installed Playwright entry");
  const local = path.resolve(specifier);
  const explicitPath = path.isAbsolute(specifier) || specifier.startsWith(".") || await exists(local);
  const resolved = specifier.startsWith("file:") ? specifier : explicitPath ? pathToFileURL(local).href : import.meta.resolve(specifier);
  assert(resolved.startsWith("file:"), "Playwright must be an installed local module");
  let file = fileURLToPath(resolved);
  if ((await stat(file)).isDirectory()) file = path.join(file, "index.mjs");
  assert((await stat(file)).isFile(), `Playwright entry file missing at ${file}`);
  return pathToFileURL(await realpath(file)).href;
}

export function assertGameplayLens(lens, { width, height }, label, baseline) {
  const { mode, view, fov, targetFov, zoom, projection, near } = lens;
  const equal = (actual, expected) => Math.abs(actual - expected) <= 1e-6;
  assert.equal(mode, lens.interior ? "interior" : "follow", label);
  assert.deepEqual(lens.size, [width, height], label);
  assert.deepEqual(lens.viewport, [width, height], label);
  assert(equal(lens.aspect, width / height) && [...lens.at, lens.heading, fov, targetFov, zoom].every(Number.isFinite), label);
  assert(mode === "interior" ? near === 0.1 : near >= 0.1 && near <= 0.5, `${label} gameplay near plane`);
  assert.equal(lens.talk, false, label);
  const shift = lens.sideways ? 0.1 : height > width * 1.15 ? (mode === "follow" ? 0.12 : 0.1) : 0;
  const offsetY = -height * shift;
  if (shift) {
    assert(view?.enabled && equal(view.offsetX, 0) && equal(view.offsetY, offsetY), `${label} walking lens offset`);
    assert.deepEqual([view.fullWidth, view.fullHeight, view.width, view.height], [width, height, width, height], label);
  } else {
    assert(!view?.enabled, `${label} unshifted walking lens`);
  }
  const scale = zoom / Math.tan(fov * Math.PI / 360);
  assert(equal(projection[0], scale / lens.aspect) && equal(projection[1], scale)
    && equal(projection[2], 0) && equal(projection[3], -2 * offsetY / height), `${label} projection matrix`);
  if (baseline?.zone === lens.zone) {
    assert.equal(mode, baseline.mode, label);
    assert.equal(!!view?.enabled, !!baseline.view?.enabled, label);
    if (view?.enabled) assert(equal(view.offsetX, baseline.view.offsetX) && equal(view.offsetY, baseline.view.offsetY), label);
    if (lens.running === baseline.running) assert(equal(targetFov, baseline.targetFov), label);
  }
}

export async function fullFramingAudit({ root, out, config, module, baseline, timeout }) {
  const directory = path.join(out, "framing");
  await mkdir(directory);
  const result = { directory, baseline, rc: 1, issues: [], rows: [], pass: false };
  const log = await open(path.join(directory, "child.log"), "wx");
  try {
    const args = [path.join(root, "tools/talk-framing-audit.mjs"), "--src", root, "--out", directory];
    const env = { ...process.env, WORLD_STORAGE: config.storage, WORLD_LEARNER: config.learner,
      WORLD_TEST_URL: config.target, WORLD_PLAYWRIGHT_MODULE: module, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1" };
    Object.assign(result, await new Promise((resolve) => {
      const child = spawn(process.execPath, args, { cwd: root, env, stdio: ["ignore", log.fd, log.fd], timeout });
      let launchError;
      child.once("error", (error) => { launchError = error.message; });
      child.once("close", (code, signal) => resolve({ code, signal, launchError, rc: code ?? 1 }));
    }));
  } finally {
    await log.close();
    await writeFile(path.join(directory, "rc"), `${result.rc}\n`);
  }

  try {
    const current = await readJson(path.join(directory, "results.json"));
    const sizes = SIZES.map(({ label }) => label);
    result.counts = Object.fromEntries(sizes.map((size) => [size, current.rows.filter((row) => row.size === size).length]));
    result.skips = current.skipped;
    result.inventory = current.catalogue;
    result.issues.push(...current.issues);
    if (result.rc !== 0) result.issues.push(`Framing child exited ${result.rc}`);
    if (current.storage !== config.storage || current.learner !== config.learner || current.edition !== "es"
        || current.url !== config.url.href || !same(current.sizes, sizes)
        || !same(current.screens.map(({ size }) => size), sizes)
        || current.screens.some(({ lang, targetLanguages }) => lang !== config.learner || !same(targetLanguages, ["es"]))) {
      result.issues.push("Framing child has the wrong URL, layer, target language or viewports");
    }
    if (current.expectedRows !== 220 || current.rows.length !== 220 || current.missing.length
        || new Set(current.rows.map(key)).size !== 220 || new Set(current.rows.map(({ id }) => id)).size !== 55
        || Object.values(result.counts).some((n) => n !== 55) || !same(current.skipped.map(({ id }) => id), skipIds)) {
      result.issues.push("Expected 55 unique situations at each of four sizes and eight intrinsic skips");
    }
    let prior;
    try {
      prior = await readJson(baseline);
      assert.equal(prior.learner, config.learner, "baseline learner");
      assert.equal(prior.storage, config.storage, "baseline storage");
      assert(same(prior.rows.map(key), current.rows.map(key)), "baseline row inventory");
      const skips = (report) => report.skipped.map(({ id, why }) => `${id}/${why}`);
      assert(same(skips(prior), skips(current)), "baseline skips");
      result.priorInventory = prior.catalogue;
      for (const field of ["source", "runtime", "indexed"]) {
        assert.equal(current.catalogue[field], prior.catalogue[field], `baseline catalogue ${field}`);
      }
      for (const field of ["sourceOnly", "runtimeOnly"]) {
        assert(same(current.catalogue[field], prior.catalogue[field]), `baseline catalogue ${field}`);
      }
    } catch (error) {
      result.issues.push(`Baseline ${baseline} · ${error.message}`);
    }
    const priorRows = new Map((prior?.rows ?? []).map((row) => [key(row), row]));
    for (const row of current.rows) {
      const previous = priorRows.get(key(row));
      const statuses = (entry) => Object.fromEntries(CHECKS.map((name) => [name, entry?.checks?.[name]?.status ?? null]));
      const geometry = (entry) => ({ face: entry?.face, angle: entry?.shot?.headAngle, landmarks: entry?.shot?.landmarks,
        panel: entry?.shot?.panel, geo: entry?.checks?.geo, view: entry?.checks?.view, size: entry?.checks?.size });
      const changes = { speaker: [previous?.speakerId, row.speakerId], settled: [previous?.settled, row.settled],
        checks: [statuses(previous), statuses(row)], geometry: [geometry(previous), geometry(row)] };
      const frame = `frames/${row.size}/${row.id}.jpg`;
      const [width, height] = row.size.split("x").map(Number);
      const pass = row.kind === "measured" && row.pass && row.settled && row.speaker && row.speakerId
        && row.speakerId === previous?.speakerId && row.opening?.speaker === row.speakerId
        && row.opening?.lineSpeaker === row.speakerId && row.opening?.liveSpeaker && row.opening?.held
        && row.run === row.opening?.run && row.line === row.opening?.line && row.lineKey
        && row.shot.mode === "talk" && row.shot.viewport.join("x") === row.size
        && row.shot.canvas?.[2] === width && row.shot.canvas?.[3] === height
        && row.landmarks?.length === 9 && [row.face.x, row.face.y, row.face.w, row.face.h].every(Number.isFinite)
        && row.input === (width < 768 ? "touch" : "keyboard/mouse") && CHECKS.every((name) => row.checks[name].status === "PASS")
        && row.frame === frame && (await exists(path.join(directory, frame)))?.size > 0;
      result.rows.push({ id: row.id, size: row.size, pass: !!pass, reasons: row.reasons, changes });
    }
    if (current.failedRows || current.unsettledRows) result.issues.push("The collector reported failed or unsettled framing");
    if (!(await exists(path.join(directory, "AUDIT.md")))?.size) result.issues.push("AUDIT.md is missing");
  } catch (error) {
    result.issues.push(error.stack ?? String(error));
  }
  result.pass = !result.issues.length && result.rows.length === 220 && result.rows.every((row) => row.pass);
  await save(path.join(directory, "comparison.json"), result);
  return result;
}
