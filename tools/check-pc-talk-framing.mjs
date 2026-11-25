#!/usr/bin/env node
import { spawn } from "node:child_process";
import { cp, mkdir, open, readFile, realpath, rename, rm, rmdir, stat, writeFile } from "node:fs/promises";
import { constants } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { CHECKS, SIZES } from "./talk-framing-measure.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const fixedParent = path.join(root, ".b6/audit");
const sizes = SIZES.map(({ label }) => label);
const requiredRooms = { "x05-tienda": ["tienda", "gas-station"], "p18-startup": ["tyler", "sproutly"] };
const skipIds = [
  "s76-dentist-call", "s80-support-call", "s83-invite-call", "s90-running-late",
  "p24-flood", "p26-complaint", "s89-video-call", "x04-yaxche",
];
const suites = [
  { name: "talk-framing", fixed: "subset", report: "results.json" },
  { name: "talk-framing-continuity", fixed: "continuity", report: "trace.json" },
  { name: "talk-framing-audit", full: true },
  { name: "talk-view", shotFlag: true },
  { name: "playing-screen" }, { name: "end-card" }, { name: "picker-cards" }, { name: "town-entry" },
  { name: "view-switch" }, { name: "tienda" }, { name: "cave-talk", shotFlag: true },
  { name: "cave-tree", shotFlag: true }, { name: "pool-chat" },
];
const usage = "node tools/check-pc-talk-framing.mjs --learner en|lt --url LOOPBACK --playwright MODULE --out DIR "
  + "[--before BASE_RESULTS_JSON] [--preflight-only]";

async function info(file) {
  return stat(file).catch((error) => {
    if (error.code !== "ENOENT") throw error;
    return null;
  });
}

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const saveJson = (file, value) => writeFile(file, JSON.stringify(value, null, 2) + "\n");
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

async function playwrightModule(specifier) {
  const local = path.resolve(specifier);
  const explicitPath = path.isAbsolute(specifier) || /^\.{1,2}(?:[/\\]|$)/.test(specifier) || await info(local);
  const resolved = explicitPath ? pathToFileURL(local).href : import.meta.resolve(specifier);
  if (!resolved.startsWith("file:")) throw new Error("--playwright must resolve to an installed local module");
  const file = fileURLToPath(resolved);
  const entry = await info(file);
  if (entry?.isDirectory()) {
    throw new Error(`--playwright points to a directory: ${file}. Pass a Playwright entry file (e.g. index.mjs) or installed package specifier.`);
  }
  if (!entry?.isFile()) throw new Error(`--playwright entry file missing: ${file}`);
  const module = pathToFileURL(await realpath(file)).href;
  if (typeof (await import(module)).chromium?.launch !== "function") {
    throw new Error(`--playwright module must export chromium.launch: ${file}`);
  }
  return module;
}

function command(suite, config, attempt) {
  const directory = path.join(config.out, attempt, suite.name);
  const program = path.join(root, suite.full ? "tools" : "tests/browser", `${suite.name}.mjs`);
  const shots = path.join(directory, "shots");
  const args = suite.full ? ["--src", root, "--out", directory] : suite.shotFlag ? [`--shots=${shots}`] : [];
  const env = { WORLD_SHOTS: suite.fixed === "subset" ? "1" : shots };
  if (suite.name === "end-card") Object.assign(env, { END_CARD_LAYER: config.learner, END_CARD_SHOTS: shots });
  return { directory, program, args, env };
}

function collectProcess(program, args, env, fd, timeout) {
  return new Promise((resolve) => {
    let launchError;
    const child = spawn(process.execPath, [program, ...args], { cwd: root, env, stdio: ["ignore", fd, fd], timeout });
    child.once("error", (error) => { launchError = error.message; });
    child.once("close", (code, signal) => {
      resolve({ code, signal, launchError, rc: code ?? (signal ? 128 + constants.signals[signal] : 1) });
    });
  });
}

// These two probes write next to the checkout. Isolate each attempt and restore the previous evidence.
async function preserveFixed(fixed, scratch, destination, run) {
  await mkdir(scratch);
  const previous = path.join(scratch, "previous");
  const generated = path.join(scratch, "generated");
  if (await info(fixed)) await rename(fixed, previous);
  try {
    return await run();
  } finally {
    if (await info(fixed)) await rename(fixed, generated);
    if (await info(previous)) await rename(previous, fixed);
    if (await info(generated)) {
      await cp(generated, destination, { recursive: true, force: false, errorOnExist: true });
      await rm(generated, { recursive: true });
    }
    await rmdir(scratch);
  }
}

async function fullVerdict(directory, config) {
  const report = await readJson(path.join(directory, "results.json"));
  const issues = [...report.issues];
  const keys = (rows) => rows.map(({ id, size }) => `${id}/${size}`);
  const skips = (report) => report.skipped.map(({ id, why }) => `${id}/${why}`);
  const matrix = keys(report.rows);
  const ids = [...new Set(report.rows.map(({ id }) => id))];
  const counts = Object.fromEntries(sizes.map((size) => [size, report.rows.filter((row) => row.size === size).length]));
  if (ids.length !== 55 || matrix.length !== 220 || new Set(matrix).size !== 220
      || sizes.some((size) => counts[size] !== 55) || !same(report.sizes, sizes)
      || report.expectedRows !== 220 || report.missing?.length) issues.push("Expected 220 unique keys, 55 per viewport");
  try {
    const baseline = await readJson(config.before);
    if (baseline.storage !== config.storage || baseline.learner !== config.learner
        || !same(keys(baseline.rows), matrix) || !same(skips(baseline), skips(report))) {
      issues.push("Full audit keys or skips differ from the matching before report");
    }
  } catch (error) {
    issues.push(`Before report unavailable: ${error.message}`);
  }
  if (!same(report.skipped.map(({ id }) => id), skipIds)) issues.push("Wrong intrinsic skips");
  if (report.target !== config.url || report.storage !== config.storage || report.learner !== config.learner || report.edition !== "es"
      || !same(report.screens.map(({ size }) => size), sizes)
      || report.screens.some(({ lang, targetLanguages }) => lang !== config.learner || !same(targetLanguages ?? [], ["es"]))) {
    issues.push("Wrong/missing full-audit URL, document language or live ES target");
  }
  if (!(await info(path.join(directory, "AUDIT.md")))?.size) issues.push("AUDIT.md missing or empty");
  if (report.failedRows !== 0 || report.unsettledRows !== 0) issues.push("Collector reported failed or unsettled rows");

  const rows = await Promise.all(report.rows.map(async (row) => {
    const { id, size, opening, shot, speakerId: actor, frame } = row;
    const reasons = [...row.reasons];
    if (row.pass !== true || row.failed !== false || CHECKS.some((name) => row.checks?.[name]?.status !== "PASS")) {
      reasons.push("Expected a successful row with view, ui, geo and size all PASS");
    }
    if (row.settled !== true || row.unsettled !== false) reasons.push("Camera did not show a settled held pose");
    if (!(row.kind === "measured" && row.sitId === id && opening?.sitId === id
        && shot?.mode === "talk" && actor && row.speaker && opening.liveSpeaker === true
        && opening.held === true && actor === opening.speaker && actor === opening.lineSpeaker
        && row.run != null && row.run === opening.run && row.line != null && row.line === opening.line && row.lineKey)) {
      reasons.push("Missing evidence of the same held live speaker and line");
    }
    const room = requiredRooms[id];
    if (room && (actor !== room[0] || opening?.zone !== room[1] || shot?.zone !== room[1])) {
      reasons.push(`Expected ${room[0]} to speak in ${room[1]}`);
    }
    if (row.input !== (size.startsWith("390x") ? "touch" : "keyboard/mouse")) reasons.push("Wrong viewport input");
    const jpeg = frame === `frames/${size}/${id}.jpg` && /^[\w-]+$/.test(id) && sizes.includes(size)
      ? await info(path.join(directory, frame)) : null;
    if (!jpeg?.isFile() || !jpeg.size) reasons.push("Missing held JPEG");
    return { id, size, frame: jpeg?.isFile() ? frame : null, pass: !reasons.length, reasons };
  }));
  const failedRows = rows.filter((row) => !row.pass).length;
  const verdict = { pass: !issues.length && failedRows === 0, counts, failedRows, issues, rows };
  await saveJson(path.join(directory, "verdict.json"), verdict);
  return { ...verdict, rows: rows.length };
}

async function probeEvidence(suite, evidence) {
  const report = await readJson(path.join(evidence, suite.report));
  if (suite.fixed === "subset") {
    if (report.rows.length !== 44 || report.failedRows !== 0 || report.unsettledRows !== 0 || report.issues.length) {
      throw new Error("Quick results lack 44 passing, settled cases");
    }
    return;
  }
  if (report.pass !== true || report.rows.length !== 4) throw new Error("Continuity trace lacks four passing routes");
  for (const row of report.rows) {
    const files = Object.values(row.frames).map(({ file }) => file);
    if (!files.length || (await Promise.all(files.map(async (file) => {
      const image = await info(path.join(evidence, file));
      return image?.isFile() && image.size > 0;
    }))).includes(false) || !row.frames["entry-held"] || !row.frames.return) {
      throw new Error(`Missing continuity screenshots for ${row.id} at ${row.size.width}x${row.size.height}`);
    }
  }
}

async function runSuite(suite, config, attempt, scratch) {
  const { directory, program, args, env } = command(suite, config, attempt);
  const log = path.join(directory, "run.log");
  const evidence = path.join(directory, "evidence");
  const result = { attempt, directory, program, args, env, log, rc: null, pass: false };
  console.log(`[${config.learner}/${attempt}] ${suite.name} starting`);
  try {
    await mkdir(directory, { recursive: true });
    const file = await open(log, "wx");
    try {
      const run = async () => {
        Object.assign(result, await collectProcess(program, args, { ...process.env, ...config.env, ...env },
          file.fd, suite.full ? 5_400_000 : 1_200_000));
        if (result.launchError) await file.appendFile(result.launchError + "\n");
        await writeFile(path.join(directory, "rc"), `${result.rc}\n`);
      };
      if (suite.fixed) await preserveFixed(path.join(fixedParent, `${suite.fixed}-pc-${config.learner}`),
        path.join(scratch, `${attempt}-${suite.fixed}`), evidence, run);
      else await run();
    } finally {
      await file.close();
    }
    if (suite.full) result.matrix = await fullVerdict(directory, config);
    if (suite.fixed && result.rc === 0) await probeEvidence(suite, evidence);
    result.pass = result.rc === 0 && (result.matrix?.pass ?? true);
  } catch (error) {
    result.evidenceError = error.message;
  }
  const detail = result.matrix ? ` · ${result.matrix.rows} rows, ${result.matrix.failedRows} failed strict checks` : "";
  console.log(`[${config.learner}/${attempt}] ${suite.name} ${result.pass ? "PASS" : "FAIL"} · rc=${result.rc ?? "unavailable"}${detail}`
    + (result.evidenceError ? ` · ${result.evidenceError}` : ""));
  return result;
}

async function main() {
  const { values } = parseArgs({ options: {
    learner: { type: "string" }, url: { type: "string" }, playwright: { type: "string" }, out: { type: "string" },
    before: { type: "string" }, "preflight-only": { type: "boolean" }, help: { type: "boolean", short: "h" },
  } });
  if (values.help) { console.log(usage); return; }
  if (!["en", "lt"].includes(values.learner) || !values.url || !values.playwright || !values.out) throw new Error(usage);
  const url = new URL(values.url);
  if (!["http:", "https:"].includes(url.protocol) || !/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(url.hostname)
      || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--url must be the root of a loopback HTTP(S) Vite dev server");
  }
  const { learner } = values;
  const module = await playwrightModule(values.playwright);
  const storage = "puerto-colibri";
  const channel = process.env.WORLD_BROWSER_CHANNEL || "chromium";
  const out = path.resolve(values.out);
  const before = path.resolve(values.before ?? path.join(root, "../talk-framing/audit", `before-pc-${learner}`, "results.json"));
  const scratch = path.join(fixedParent, `.pc-${learner}-checker`);
  for (const fixed of [...suites.filter((suite) => suite.fixed).map((suite) => `${suite.fixed}-pc-${learner}`), path.basename(scratch)]) {
    const relative = path.relative(path.join(fixedParent, fixed), out);
    if (relative !== ".." && !relative.startsWith(`..${path.sep}`)) {
      throw new Error("--out must be separate from the probes' fixed directories");
    }
  }
  const env = { WORLD_STORAGE: storage, WORLD_LEARNER: learner, WORLD_TEST_URL: values.url,
    WORLD_PLAYWRIGHT_MODULE: module, WORLD_BROWSER_CHANNEL: channel, PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1", npm_config_offline: "true" };
  const config = { root, out, before, storage, learner, url: values.url, module, channel, env };
  const children = suites.map((suite) => command(suite, config, "original"));
  for (const { program } of children) {
    if (!(await info(program))?.isFile()) throw new Error(`Missing PC child: ${program}`);
  }
  if (values["preflight-only"]) {
    const output = await info(out);
    if (output && !output.isDirectory()) throw new Error(`--out must be a directory: ${out}`);
    if (await info(path.join(out, "original"))) throw new Error(`--out already contains a checker run: ${out}`);
    console.log(JSON.stringify({ ...config, children }, null, 2));
    return;
  }

  await mkdir(fixedParent, { recursive: true });
  await mkdir(scratch);
  try {
    await mkdir(out, { recursive: true });
    // A fresh original directory prevents overwriting any prior run or retry.
    await mkdir(path.join(out, "original"));
    const summary = { ...config, children: {}, pass: false };
    for (const suite of suites) {
      const first = await runSuite(suite, config, "original", scratch);
      const attempts = [first];
      if (first.rc > 0) attempts.push(await runSuite(suite, config, "retry", scratch));
      const pass = attempts.at(-1).pass;
      summary.children[suite.name] = { pass, recovered: pass && attempts.length > 1, attempts };
      await saveJson(path.join(out, "summary.json"), summary);
    }
    summary.pass = Object.values(summary.children).every(({ pass }) => pass);
    await saveJson(path.join(out, "summary.json"), summary);
    process.exitCode = summary.pass ? 0 : 1;
    await writeFile(path.join(out, "rc"), `${process.exitCode}\n`);
    console.log(`PC ${learner} checker ${summary.pass ? "PASS" : "FAIL"} · ${path.join(out, "summary.json")}`);
  } finally {
    // Leave any uncopied evidence in the scratch directory if archiving failed.
    await rmdir(scratch);
  }
}

main().catch((error) => {
  console.error(`PC talk framing checker: ${error.message}`);
  process.exitCode = 1;
});
