import { spawn } from "node:child_process";
import { mkdir, open, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CHECKS, SIZES } from "../../tools/talk-framing-measure.mjs";

export async function ordinaryPlaywright(configured, capture) {
  if (configured && (!capture || !configured.endsWith("/pw-shots.mjs"))) return configured;
  for (const name of ["playwright", "playwright-core"]) {
    try { return import.meta.resolve(name); } catch (error) {
      if (error.code !== "ERR_MODULE_NOT_FOUND") throw error;
    }
  }
  const installed = path.join(homedir(), "claude-work/_h-tools/node_modules/playwright-core/index.mjs");
  if ((await stat(installed).catch(() => null))?.isFile()) return pathToFileURL(installed).href;
  return capture ? null : configured;
}

async function compareAudit(current, priorFile) {
  const prior = JSON.parse(await readFile(priorFile, "utf8").catch((error) => {
    if (error.code === "ENOENT") return "null";
    throw error;
  }));
  const sizes = SIZES.map(({ label }) => label);
  const key = ({ id, size }) => `${size}/${id}`;
  const rows = new Map(current.rows.map((row) => [key(row), row]));
  const baseline = new Map(prior?.rows.map((row) => [key(row), row]));
  const missing = [...baseline.keys()].filter((pair) => !rows.has(pair));
  const added = prior ? [...rows.keys()].filter((pair) => !baseline.has(pair)) : [];
  const result = (row) => ({
    speaker: row.speaker, speakerId: row.speakerId, settled: row.settled,
    ...Object.fromEntries(CHECKS.map((name) => [name, row.checks[name]?.status])),
  });
  const changes = [];
  for (const [pair, row] of rows) {
    const old = baseline.get(pair);
    if (!old) continue;
    const before = result(old), after = result(row);
    const fields = Object.keys(before).filter((field) => before[field] !== after[field]);
    if (fields.length) changes.push({ pair, fields, before, after });
  }
  const failures = current.rows.filter((row) => !row.pass || !row.speakerId || row.settled !== true
    || CHECKS.some((name) => row.checks[name]?.status !== "PASS"))
    .map((row) => ({ pair: key(row), ...result(row), reasons: row.reasons }));
  const skips = (report) => report.skipped.map(({ id, why }) => `${id}: ${why}`).sort();
  const sameSkips = current.skipped.length === 7 && new Set(current.skipped.map(({ id }) => id)).size === 7
    && (!prior || JSON.stringify(skips(prior)) === JSON.stringify(skips(current)));
  const bySize = Object.fromEntries(sizes.map((size) => [size, current.rows.filter((row) => row.size === size).length]));
  const complete = JSON.stringify(current.sizes) === JSON.stringify(sizes) && current.rows.length === rows.size
    && rows.size === 184 && Object.values(bySize).every((count) => count === 46) && missing.length === 0 && added.length === 0;
  return {
    baseline: prior ? priorFile : null, expectedRows: 184, rows: current.rows.length, bySize, complete,
    missing, added, failures, changes, skips: current.skipped, priorSkips: prior?.skipped ?? null, sameSkips,
    pass: complete && sameSkips && !failures.length && !changes.length,
  };
}

export async function runFramingAudit({ root, dir, target, module, deadline }) {
  await mkdir(dir, { recursive: true });
  const log = await open(path.join(dir, "audit.log"), "w");
  const started = Date.now();
  const status = { target, module: module ?? "playwright", budgetMs: Math.max(0, deadline - started), pass: false };
  try {
    if (!status.budgetMs) throw new Error("no time left in the 1,200 s capture invocation for the full audit");
    const env = { ...process.env, WORLD_TEST_URL: target, SHOTS_OUT: path.join(dir, "wrapper") };
    if (module) env.WORLD_PLAYWRIGHT_MODULE = module;
    delete env.WORLD_SHOTS;
    const child = spawn(process.execPath, [path.join(root, "tools/talk-framing-audit.mjs"), "--src", root, "--out", dir], {
      cwd: root, env, stdio: ["ignore", log.fd, log.fd],
    });
    let kill;
    const timeout = setTimeout(() => {
      status.timedOut = true;
      child.kill("SIGTERM");
      kill = setTimeout(() => child.kill("SIGKILL"), 2000);
    }, status.budgetMs);
    try {
      Object.assign(status, await new Promise((resolve, reject) => {
        child.once("error", reject);
        child.once("close", (code, signal) => resolve({ code, signal }));
      }));
    } finally {
      clearTimeout(timeout);
      clearTimeout(kill);
    }
    const current = JSON.parse(await readFile(path.join(dir, "results.json"), "utf8"));
    const comparison = await compareAudit(current, path.resolve(root, "../talk-framing/audit/mh-r2/results.json"));
    await writeFile(path.join(dir, "comparison.json"), JSON.stringify(comparison, null, 2) + "\n");
    status.pass = status.code === 0 && comparison.pass;
    status.rows = comparison.rows;
    status.complete = comparison.complete;
    status.changed = comparison.changes.length;
    status.failedRows = comparison.failures.length;
    status.skipsMatch = comparison.sameSkips;
  } catch (error) {
    const tail = (await readFile(path.join(dir, "audit.log"), "utf8")).trim().split("\n").slice(-8).join("\n");
    status.error = [status.timedOut ? "full framing audit reached its share of the chain deadline" : error.message, tail]
      .filter(Boolean).join("\n");
  } finally {
    await log.close();
    status.wallMs = Date.now() - started;
    await writeFile(path.join(dir, "status.json"), JSON.stringify(status, null, 2) + "\n");
  }
  console.log(`Full framing audit ${status.pass ? "PASS" : "FAIL"} · ${status.rows ?? 0}/184 rows · ${status.wallMs} ms · ${dir}`);
  if (status.error) console.error(status.error);
  return status;
}
