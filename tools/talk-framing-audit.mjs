// Run against a dev server, using the same WORLD_* variables as the browser tests.
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

import { CHECKS, SIZES, measureTalk, measurementConfig } from "./talk-framing-measure.mjs";
import {
  INTRO_START, before, beginTalk, launchBrowser, openContext, readCatalogue, remaining,
  requestCloseTalk, seedFramingPage, shortError, talkIsClosed, worldConfig,
} from "./talk-framing-browser.mjs";

const DEFAULT_SIZES = SIZES.map(({ label }) => label).join(",");
const SITUATION_MS = 20000;
const STARTUP_MS = 240000;
const USAGE = `node tools/talk-framing-audit.mjs --out DIR [--src WORKTREE] [--sizes ${DEFAULT_SIZES}] [--only id1,id2] [--limit N]`;

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
    out: path.resolve(values.out), src: path.resolve(values.src ?? fileURLToPath(new URL("../", import.meta.url))),
    sizes, only, limit, ...worldConfig(),
  };
}

async function ready(page) {
  await page.waitForFunction(() => {
    window.__step?.(2);
    const store = window.__ew?.store;
    return store ? store.getState().screen === "play" : document.querySelector(".stage canvas") && document.querySelector(".toolbar");
  }, null, { timeout: STARTUP_MS, polling: 50 });
  await page.evaluate(() => window.__ew?.store?.getState().setHud?.({ panel: null }));
}

async function openPage(context, config) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(shortError(error)));
  await seedFramingPage(page, config.storage);
  try {
    await page.goto(config.url.href, { waitUntil: "domcontentloaded", timeout: STARTUP_MS });
    await ready(page);
  } catch (error) {
    throw new Error(`town startup failed: ${errors.at(-1) ?? shortError(error)}`, { cause: error });
  }
  return { page, errors };
}

async function sourceSituations(config) {
  const dir = path.join(config.src, config.storage === "puerto-colibri"
    ? "src/editions/es/content/situations" : "src/content/situations");
  const names = (await readdir(dir)).filter((file) => /^[spx]\d\d[a-z]?-.+\.ts$/.test(file)).sort();
  const learnerDir = config.storage === "puerto-colibri" && config.learner === "lt"
    ? path.join(config.src, "src/editions/es-lt/content/situations") : dir;
  const metadata = new Map();
  for (const folder of new Set([dir, learnerDir])) {
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
    // A file may have been added before the generated metadata was refreshed.
    const source = await readFile(path.join(dir, file), "utf8");
    const field = (name) => source.match(new RegExp(`^  ${name}: ["']([^"']+)["']`, "m"))?.[1];
    return { id, location: field("location"), mode: field("mode"), npc: field("npc") };
  }));
}

async function situations(page, config) {
  const runtime = await page.evaluate(readCatalogue);
  let all = runtime.all;
  if (!runtime.complete) {
    const fromFiles = await sourceSituations(config).catch((error) => {
      if (!all.length || error.code !== "ENOENT") throw error;
      console.error(`Situation sources unavailable in ${config.src}. Using the runtime route.`);
      return [];
    });
    all = [...new Map([...fromFiles, ...all].map((sit) => [sit.id, sit])).values()];
  }
  return all
    .filter(({ id }) => /^[\w-]+$/.test(id) && (!config.only || config.only.has(id)))
    .sort((a, b) => (a.chapter ?? 0) - (b.chapter ?? 0) || (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id))
    .slice(0, config.limit);
}

function skipReason(sit) {
  if (sit.mode === "video") return "video call";
  if (sit.mode === "phone" || sit.location === "phone") return "phone call";
  if (["light", "picture"].includes(sit.mode)) return "picture-only";
  if (sit.mode === "narration") return "narration";
  if (sit.id === "x04-yaxche" && sit.npc === "yaxche") return "the speaking tree has no character head";
  return null;
}

const press = (locator, phone, deadline) => phone
  ? locator.tap({ timeout: remaining(deadline) })
  : locator.click({ timeout: remaining(deadline) });

async function startTalk(page, sit, phone, deadline) {
  const started = await before(deadline, "starting the situation", () => beginTalk(page, sit, true));

  if (!started) {
    if (!await page.locator(".sheet.scenarios").count()) {
      const menu = page.locator('.toolbar .ride-menu[aria-expanded="false"]');
      if (await menu.isVisible()) await press(menu, phone, deadline);
      const list = page.locator('.toolbar-tools button[title="Visos situacijos"], .toolbar-tools button[title="All situations"]');
      if (await list.first().isVisible()) await press(list.first(), phone, deadline);
    }
    await press(page.locator(`.scn-card[data-sit="${sit.id}"]`).first(), phone, deadline);
  }

  await page.waitForFunction((id) => {
    window.__step?.(1);
    const conv = window.__ew?.store?.getState().conv;
    return conv ? conv.active && conv.sitId === id && !!document.querySelector(".convo") : !!document.querySelector(".convo");
  }, sit.id, { timeout: remaining(deadline), polling: 40 });
  const intro = page.locator(".scene-intro, .intro-card");
  const start = intro.getByRole("button", { name: INTRO_START });
  const button = await start.count() ? start.first() : intro.locator("button.btn").first();
  if (await button.isVisible()) {
    try {
      await press(button, phone, Math.min(deadline, Date.now() + 2500));
    } catch (error) {
      // On the bases the intro can dismiss itself while the button is being pressed.
      if (await button.isVisible()) throw error;
    }
  }
  await page.waitForFunction(() => {
    window.__step?.(1);
    const { game, store } = window.__ew ?? {};
    const conv = store?.getState().conv;
    if (document.querySelector(".scene-intro, .intro-card") || conv?.introOpen) return false;
    if (game?.rig?.mode !== undefined && game.rig.mode !== "talk" && game.talkNpc) return false;
    return !conv || conv.speaking != null || conv.phase !== "npc" || !!conv.transcript?.length;
  }, null, { timeout: remaining(deadline), polling: 40 });
}

async function closeTalk(page, deadline) {
  const closed = await page.evaluate(requestCloseTalk);
  if (!closed) {
    const button = page.locator(".convo").getByRole("button", { name: /^(Baigti pokalbį|End conversation|Hang up)$/i }).first();
    if (await button.isVisible()) await button.click({ timeout: remaining(deadline) });
  }
  await page.waitForFunction(talkIsClosed, 1, { timeout: remaining(deadline), polling: 40 });
}

async function auditSituation(page, sit, size, out) {
  const deadline = Date.now() + SITUATION_MS;
  const measureBy = deadline - 2500;
  const phone = size.width < 768;
  const frame = `frames/${size.label}/${sit.id}.jpg`;
  const errors = [];
  let measurement;
  try {
    await before(measureBy, "opening the talk view", () => startTalk(page, sit, phone, measureBy));
    measurement = await before(measureBy, "measuring the talk view", () => page.evaluate(measureTalk, measurementConfig(size)));
    if (measurement.skipped) return { skipped: measurement.skipped };
  } catch (error) {
    errors.push(`error: ${shortError(error)}`);
    measurement = {
      face: null, speaker: null,
      checks: Object.fromEntries(CHECKS.map((name) => [name, { status: "n/a", reason: "measurement did not complete" }])),
    };
  }

  let savedFrame = null;
  try {
    await before(deadline, "capturing the JPEG", () => page.screenshot({
      path: path.join(out, frame), type: "jpeg", quality: 60, scale: "css", timeout: remaining(deadline),
    }));
    savedFrame = frame;
  } catch (error) {
    errors.push(`error: screenshot: ${shortError(error)}`);
  }
  const { checks, face, speaker, speakerId = null, settled = null } = measurement;
  const reasons = [...new Set([
    ...errors,
    ...CHECKS.filter((name) => checks[name].status === "FAIL").map((name) => checks[name].reason),
    ...CHECKS.filter((name) => checks[name].status === "n/a").map((name) => `${name} n/a: ${checks[name].reason}`),
  ])];
  return {
    id: sit.id, title: sit.title?.lt ?? sit.title?.en ?? sit.id, size: size.label,
    pass: !errors.length && CHECKS.every((name) => checks[name].status === "PASS"),
    checks, reasons, face, speaker, speakerId, settled, frame: savedFrame,
  };
}

function rowStatus(row) {
  if (!row) return "FAIL: missing row";
  const status = row.pass ? "PASS" : `FAIL: ${row.reasons.join(", ")}`;
  return row.settled === false ? `${status} · camera still moving at the 4 s settle limit` : status;
}

function markdown(report, all) {
  const { target, storage, learner, sizes, rows, skipped } = report;
  const md = (value) => String(value).replaceAll("\\", "\\\\").replaceAll("|", "\\|").replace(/\s+/g, " ").trim();
  const grid = new Map(rows.map((row) => [`${row.id}/${row.size}`, row]));
  const headers = ["Situation", ...sizes];
  const table = [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...all.filter((sit) => !skipped.some(({ id }) => id === sit.id)).map((sit) => {
      const cells = sizes.map((size) => rowStatus(grid.get(`${sit.id}/${size}`)));
      const title = sit.title?.lt ?? sit.title?.en ?? sit.id;
      return `| ${[`\`${sit.id}\` ${title}`, ...cells].map(md).join(" | ")} |`;
    }),
  ];
  const summary = sizes.map((size) => {
    const atSize = rows.filter((row) => row.size === size);
    const pass = atSize.filter((row) => row.pass).length;
    const counts = CHECKS.map((name) => {
      const statuses = atSize.map((row) => row.checks[name].status);
      const count = (status) => statuses.filter((s) => s === status).length;
      return `${name} ${count("PASS")} PASS / ${count("FAIL")} FAIL / ${count("n/a")} n/a`;
    });
    return `- **${size}** · ${pass} PASS / ${atSize.length - pass} FAIL · ${counts.join(" · ")}`;
  });
  const unsettled = rows.filter((row) => row.settled === false).length;
  return [
    "# Talk framing audit", "", `${md(target)} · ${storage} · learner ${learner}`, "",
    `${rows.length} frames measured or attempted · ${skipped.length} situations skipped`, "",
    ...summary,
    ...(unsettled ? ["", `${unsettled} rows were measured at the 4 s camera settle limit.`] : []),
    "", ...table, "", "## Skipped", "",
    ...(skipped.length ? skipped.map(({ id, why }) => `- \`${id}\` · ${md(why)}`) : ["None."]), "",
  ].join("\n");
}

async function main() {
  const config = options();
  if (!config) { console.log(USAGE); return; }
  const browser = await launchBrowser();
  const report = {
    target: config.target, storage: config.storage, learner: config.learner,
    sizes: config.sizes.map(({ label }) => label), rows: [], skipped: [],
  };
  const skipped = new Set();
  const recordSkip = (id, why) => {
    if (skipped.has(id)) return;
    skipped.add(id);
    report.skipped.push({ id, why });
    console.log(`SKIP ${id} · ${why}`);
  };
  let all;
  try {
    for (const size of config.sizes) {
      // Preserve the BEFORE audit input configuration, including the landscape mouse.
      const context = await openContext(browser, size, size.width < 768, config.url);
      try {
        let { page, errors } = await openPage(context, config);
        if (!all) {
          all = await situations(page, config);
          if (!all.length) throw new Error("No situations found for this target and selection");
          for (const sit of all) {
            const why = skipReason(sit);
            if (why) recordSkip(sit.id, why);
          }
        }
        await mkdir(path.join(config.out, "frames", size.label), { recursive: true });
        const batch = all.filter((sit) => !skipped.has(sit.id));
        for (const [index, sit] of batch.entries()) {
          const row = await auditSituation(page, sit, size, config.out);
          if (row.skipped) recordSkip(sit.id, row.skipped);
          else {
            if (errors.length) {
              row.reasons.push(...[...new Set(errors)].map((error) => `error: page: ${error}`));
              row.pass = false;
            }
            report.rows.push(row);
            console.log(`[${size.label} ${index + 1}/${batch.length}] ${sit.id} ${rowStatus(row)}`);
          }
          errors.length = 0;
          if (index === batch.length - 1) continue;
          const closeBy = Date.now() + 2000;
          try {
            await before(closeBy, "closing the conversation", () => closeTalk(page, closeBy));
          } catch {
            // Close the page if a delayed start or a stuck transition can leak into the next row.
            await page.close().catch(() => {});
            ({ page, errors } = await openPage(context, config));
          }
        }
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  await Promise.all([
    writeFile(path.join(config.out, "results.json"), JSON.stringify(report, null, 2) + "\n"),
    writeFile(path.join(config.out, "AUDIT.md"), markdown(report, all)),
  ]);
}

main().catch((error) => {
  console.error(`Talk framing audit: ${shortError(error)}`);
  process.exitCode = 1;
});
