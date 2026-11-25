#!/usr/bin/env node
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CHECKS, SIZES, measurementConfig, measureTalk } from "./talk-framing-measure.mjs";
import {
  before, beginTalk, checkHeldOpening, finishTalk, launchBrowser, openContext, readCatalogue,
  readyTown, remaining, seedFramingPage, shortError, waitForOpening, watchPageErrors, worldConfig,
} from "./talk-framing-browser.mjs";

const SITUATION_MS = 20_000;
const STARTUP_MS = 240_000;
const DEFAULT_SIZES = SIZES.map(({ label }) => label).join(",");
const USAGE = `node tools/talk-framing-audit.mjs --out DIR [--src WORKTREE] [--sizes ${DEFAULT_SIZES}] [--only id1,id2] [--limit N]`;
const PC_SKIPS = new Map([
  ["s76-dentist-call", "phone call"], ["s80-support-call", "phone call"], ["s83-invite-call", "phone call"],
  ["s89-video-call", "video call"], ["s90-running-late", "phone call"], ["p24-flood", "phone call"],
  ["p26-complaint", "phone call"], ["x04-yaxche", "the speaking tree has no character head"],
]);

function options() {
  const { values } = parseArgs({ options: {
    out: { type: "string" }, src: { type: "string" }, sizes: { type: "string", default: DEFAULT_SIZES },
    only: { type: "string" }, limit: { type: "string" }, help: { type: "boolean", short: "h" },
  } });
  if (values.help) return null;
  if (!values.out) throw new Error(`--out is required\n${USAGE}`);
  const sizes = [...new Set(values.sizes.split(",").map((s) => s.trim()))].map((label) => {
    const match = /^([1-9]\d*)x([1-9]\d*)$/.exec(label);
    const [width, height] = match?.slice(1).map(Number) ?? [];
    if (![width, height].every(Number.isSafeInteger)) throw new Error(`Invalid viewport size ${label}`);
    return { label, width, height };
  });
  const only = values.only === undefined ? null : new Set(values.only.split(",").map((s) => s.trim()).filter(Boolean));
  const limit = values.limit === undefined ? Infinity : Number(values.limit);
  if (values.limit !== undefined && (!/^[1-9]\d*$/.test(values.limit) || !Number.isSafeInteger(limit))) {
    throw new Error("--limit must be a positive integer");
  }
  return {
    ...worldConfig(), out: path.resolve(values.out), sizes, only, limit,
    src: path.resolve(values.src ?? fileURLToPath(new URL("../", import.meta.url))),
  };
}

async function sourceSituations(config) {
  const dir = path.join(config.src, config.edition === "es" ? "src/editions/es/content/situations" : "src/content/situations");
  const names = (await readdir(dir)).filter((file) => /^[spx]\d\d[a-z]?-.+\.ts$/.test(file)).sort();
  const metadata = new Map();
  const dirs = [dir];
  if (config.edition === "es" && config.learner === "lt") dirs.push(path.join(config.src, "src/editions/es-lt/content/situations"));
  for (const folder of dirs) {
    const generated = await readFile(path.join(folder, "meta.gen.ts"), "utf8").catch((error) => {
      if (error.code !== "ENOENT") throw error;
      return "";
    });
    for (const row of generated.matchAll(/^\s*(\{"id":.*\}),\s*$/gm)) {
      const sit = JSON.parse(row[1]);
      metadata.set(sit.id, sit);
    }
  }
  return Promise.all(names.map(async (file) => {
    const id = file.slice(0, -3);
    if (metadata.has(id)) return metadata.get(id);
    const source = await readFile(path.join(dir, file), "utf8");
    const field = (name) => source.match(new RegExp(`^  ${name}: ["']([^"']+)["']`, "m"))?.[1];
    return { id, location: field("location"), mode: field("mode"), npc: field("npc") };
  }));
}

async function situations(page, config) {
  const runtime = await page.evaluate(readCatalogue);
  const source = await sourceSituations(config).catch((error) => {
    if (!runtime.all.length || error.code !== "ENOENT") throw error;
    console.error(`Situation sources unavailable in ${config.src}. Using the runtime catalogue.`);
    return [];
  });
  const fromRuntime = new Map(runtime.all.map((sit) => [sit.id, sit]));
  const fromSource = new Map(source.map((sit) => [sit.id, sit]));
  const all = new Map([...fromSource, ...fromRuntime]);
  const missing = [...config.only ?? []].filter((id) => !all.has(id));
  if (missing.length) throw new Error(`Unknown --only situation IDs: ${missing.join(", ")}`);
  const selected = [...all.values()]
    .filter(({ id }) => /^[\w-]+$/.test(id) && (!config.only || config.only.has(id)))
    .sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
    .slice(0, config.limit);
  if (!selected.length) throw new Error("No situations found for this target and selection");
  return {
    selected,
    catalogue: {
      source: fromSource.size, runtime: fromRuntime.size, indexed: runtime.indexed,
      sourceOnly: [...fromSource.keys()].filter((id) => !fromRuntime.has(id)),
      runtimeOnly: [...fromRuntime.keys()].filter((id) => !fromSource.has(id)),
    },
  };
}

function skipReason(sit, config) {
  if (config.edition === "es") return PC_SKIPS.get(sit.id);
  if (sit.mode === "video") return "video call";
  if (sit.mode === "phone" || sit.location === "phone") return "phone call";
  if (["light", "picture"].includes(sit.mode)) return "picture-only";
  if (sit.mode === "narration") return "narration";
}

async function openPage(context, config) {
  const page = await context.newPage();
  const errors = watchPageErrors(page);
  await seedFramingPage(page, config.storage);
  const deadline = Date.now() + STARTUP_MS;
  const identity = await before(deadline, "starting the returning town", () => readyTown(page, config, deadline));
  return { page, errors, identity };
}

async function auditSituation(page, sit, size, out, pageErrors) {
  const started = Date.now();
  const deadline = started + SITUATION_MS;
  const measureBy = deadline - 2500;
  const touch = size.width < 768;
  const config = measurementConfig(size);
  const frame = `frames/${size.label}/${sit.id}.jpg`;
  const reasons = [];
  let opening, measurement, route, openMs, measureMs;
  try {
    route = await beginTalk(page, sit, touch, measureBy);
    opening = await waitForOpening(page, sit, touch, measureBy);
    openMs = Date.now() - started;
    measurement = await before(measureBy, "measuring the talk view", () => page.evaluate(measureTalk, config));
    measureMs = Date.now() - started - openMs;
    checkHeldOpening(opening, measurement);
  } catch (error) {
    reasons.push(`error: ${shortError(error)}`);
    const kind = opening ? "measurement-error" : "open-error";
    if (openMs == null) openMs = Date.now() - started;
    else measureMs ??= Date.now() - started - openMs;
    opening ??= error.opening;
    const snapshot = await before(Date.now() + 750, "reading the failed opening", () =>
      page.evaluate(measureTalk, { ...config, snapshot: true })).catch(() => null);
    measurement = {
      kind, shot: snapshot?.shot ?? measurement?.shot ?? null, speaker: snapshot?.speaker ?? null,
      speakerId: snapshot?.speakerId ?? opening?.speaker ?? null, settled: null, settle: null, face: null,
      checks: Object.fromEntries(CHECKS.map((name) => [name, { status: "n/a", reason: reasons[0] }])),
    };
  }

  let savedFrame = null;
  try {
    await before(deadline, "capturing the JPEG", () => page.screenshot({
      path: path.join(out, frame), type: "jpeg", quality: 60, scale: "css", timeout: remaining(deadline),
    }));
    savedFrame = frame;
  } catch (error) {
    reasons.push(`error: screenshot: ${shortError(error)}`);
  }
  let cleanupFailed = false;
  try {
    await finishTalk(page, Date.now() + 2000);
  } catch (error) {
    reasons.push(`error: cleanup: ${shortError(error)}`);
    cleanupFailed = true;
  }
  const { checks, settled } = measurement;
  const badChecks = CHECKS.filter((name) => checks[name].status !== "PASS");
  reasons.push(...badChecks.map((name) =>
    checks[name].status === "n/a" ? `${name} n/a: ${checks[name].reason}` : checks[name].reason));
  reasons.push(...pageErrors.splice(0).map((error) => `error: ${error}`));
  const failed = reasons.length > 0;
  return {
    cleanupFailed,
    row: {
      id: sit.id, title: sit.title?.lt ?? sit.title?.en ?? sit.id, size: size.label,
      input: touch ? "touch" : "keyboard/mouse", route: route ?? null,
      ...measurement, opening: opening ?? null, frame: savedFrame, pass: !failed, failed, unsettled: settled === false,
      reasons: [...new Set(reasons)], openMs: openMs ?? null, measureMs: measureMs ?? null, wallMs: Date.now() - started,
    },
  };
}

function rowStatus(row) {
  if (!row) return "FAIL: missing row";
  const status = row.failed ? `FAIL: ${row.reasons.map((reason) => reason.split("\n")[0]).join(", ")}` : "PASS";
  return row.unsettled ? `${status} · camera still moving at the 4 s settle limit` : status;
}

function markdown(report, all) {
  const { target, storage, learner, edition, sizes, rows, skipped, issues } = report;
  const md = (value) => String(value).replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
  const grid = new Map(rows.map((row) => [`${row.id}/${row.size}`, row]));
  const headers = ["Situation", ...sizes];
  const table = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...all.map((sit) => {
      const cells = sizes.map((size) => rowStatus(grid.get(`${sit.id}/${size}`)));
      return `| ${[`\`${sit.id}\` ${sit.title?.lt ?? sit.title?.en ?? sit.id}`, ...cells].map(md).join(" | ")} |`;
    }),
  ];
  const summary = sizes.map((size) => {
    const atSize = rows.filter((row) => row.size === size);
    const failed = atSize.filter((row) => row.failed).length;
    const unsettled = atSize.filter((row) => row.unsettled).length;
    const counts = CHECKS.map((name) => {
      const count = (status) => atSize.filter((row) => row.checks[name].status === status).length;
      return `${name} ${count("PASS")} PASS / ${count("FAIL")} FAIL / ${count("n/a")} n/a`;
    });
    return `- **${size}** · ${atSize.length - failed} PASS / ${failed} FAIL · ${unsettled} unsettled · ${counts.join(" · ")}`;
  });
  return [
    "# Talk framing audit", "", `${md(target)} · ${storage} · edition ${edition} · learner ${learner}`, "",
    `${rows.length}/${report.expectedRows} rows measured or attempted · ${skipped.length} situations skipped`, "",
    ...summary, "", ...table, "", "## Skipped", "",
    ...(skipped.length ? skipped.map(({ id, why }) => `- \`${id}\` · ${md(why)}`) : ["None."]),
    ...(issues.length ? ["", "## Run errors", "", ...issues.map((issue) => `- ${md(issue)}`)] : []), "",
  ].join("\n");
}

async function main() {
  const config = options();
  if (!config) { console.log(USAGE); return; }
  await mkdir(config.out, { recursive: true });
  const report = {
    target: config.target, url: config.url.href, storage: config.storage, learner: config.learner, edition: config.edition,
    sizes: config.sizes.map(({ label }) => label), screens: [], rows: [], skipped: [], expectedRows: 0, issues: [],
  };
  let batch = [];
  let browser;
  try {
    browser = await launchBrowser();
    for (const size of config.sizes) {
      const context = await openContext(browser, size, size.width < 768, config.url);
      try {
        let { page, errors, identity } = await openPage(context, config);
        report.screens.push({ size: size.label, ...identity });
        if (!report.catalogue) {
          const { selected, catalogue } = await situations(page, config);
          report.catalogue = catalogue;
          batch = selected.filter((sit) => {
            const why = skipReason(sit, config);
            if (!why) return true;
            report.skipped.push({ id: sit.id, why });
            console.log(`SKIP ${sit.id} · ${why}`);
            return false;
          });
          report.expectedRows = batch.length * config.sizes.length;
        }
        await mkdir(path.join(config.out, "frames", size.label), { recursive: true });
        for (const [index, sit] of batch.entries()) {
          const { row, cleanupFailed } = await auditSituation(page, sit, size, config.out, errors);
          report.rows.push(row);
          console.log(`[${size.label} ${index + 1}/${batch.length}] ${sit.id} ${rowStatus(row)}`);
          if (cleanupFailed && index < batch.length - 1) {
            await page.close();
            ({ page, errors } = await openPage(context, config));
          }
        }
      } finally {
        await context.close();
      }
    }
  } catch (error) {
    report.issues.push(shortError(error));
  } finally {
    await browser?.close();
    const keys = report.rows.map(({ id, size }) => `${id}/${size}`);
    report.missing = config.sizes.flatMap(({ label }) => batch.map(({ id }) => `${id}/${label}`)).filter((key) => !keys.includes(key));
    if (report.missing.length || keys.length !== new Set(keys).size) report.issues.push("audit roster is incomplete or duplicated");
    report.failedRows = report.rows.filter((row) => row.failed).length;
    report.unsettledRows = report.rows.filter((row) => row.unsettled).length;
    await Promise.all([
      writeFile(path.join(config.out, "results.json"), JSON.stringify(report, null, 2) + "\n"),
      writeFile(path.join(config.out, "AUDIT.md"), markdown(report, batch)),
    ]);
    console.log(`${report.rows.length} rows · ${report.failedRows} failed · ${report.unsettledRows} unsettled · ${config.out}`);
  }
  if (report.issues.length) throw new Error(report.issues.join(", "));
}

main().catch((error) => {
  console.error(`Talk framing audit: ${shortError(error)}`);
  process.exitCode = 1;
});
