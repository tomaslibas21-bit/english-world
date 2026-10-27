// Records the game's lines with Gemini voices (docs/VOICING-PLAN.md) through the Gemini Batch API: half the price of
// single requests, and Google works through each list on its own, usually within hours. The clips go to
// public/audio-v2/ with their own manifest; the game plays them once the v2 voices are on (src/content/voices.ts).
// The key is GEMINI_API_KEY in .env.local (git-ignored). It only ever goes into a request header; nothing prints it.
//   npx tsx tools/voice-batch.ts plan                         what would be recorded: clips, minutes, price (no key)
//   npx tsx tools/voice-batch.ts try "Hello!" --who=maggie    one clip right away, into voicing/try/ (--voice=, --style=)
//   npx tsx tools/voice-batch.ts prepare [--sample] [--size=4000]   request files in voicing/requests/ (no key)
//   npx tsx tools/voice-batch.ts send                         uploads the prepared files and starts a batch for each
//   npx tsx tools/voice-batch.ts status                       each batch's state
//   npx tsx tools/voice-batch.ts fetch                        downloads finished batches and makes the clips
//   npx tsx tools/voice-batch.ts check                        Whisper listens to new clips (no key) → voicing/check.json
//   npx tsx tools/voice-batch.ts redo [--below=0.8]           clips that failed the check go back to the next prepare
//   npx tsx tools/voice-batch.ts sheet                        a page to listen to the casting sample: voicing/sample/
//   npx tsx tools/voice-batch.ts upload [--parallel=4]        clips not on R2 yet → fluent-steps/game/audio-v2/
// The list of lines is cached in voicing/lines.json until the content changes (--fresh makes it again).
// A clip is recorded again when its character's Gemini voice or style changes (voicing/recorded.json says which
// voice and style made each clip), at most 4 times.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { audioKey } from "../src/audio-key";
import { NPCS, COACH_VOICE } from "../src/content/npcs";
import { AMBIENT_VOICES } from "../src/content/ambient";
import { levenshtein } from "../src/convo/normalize";
import { enumerateAll, type Utt } from "./enumerate";
import { roleFor, where } from "./casting";
import { decodeAudio, encodeClip, geminiText, trimAndNormalize } from "./audio-util";

const ROOT = path.resolve(import.meta.dirname, "..");
const WORK = path.join(ROOT, "voicing");
const OUT = path.join(ROOT, "public/audio-v2");
const WAV = path.join(WORK, "wav16");
const MANIFEST = path.join(OUT, "manifest.json");
const RECORDED = path.join(WORK, "recorded.json");
const JOBS = path.join(WORK, "jobs.json");
const CHECK = path.join(WORK, "check.json");
const MODEL = "gemini-3.8-flash-tts";
const API = "https://generativelanguage.googleapis.com";
/** $ per 1M audio tokens; 25 tokens are one second of speech. The batch price doubles after 31 Dec 2026. */
const PRICE = { batch: 4.5, batchFrom2027: 9, tokensPerSecond: 25 };
const MAX_TRIES = 4;

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`);

interface Line { key: string; voice: string; speed: number; say: string; text: string; gv: string; style: string; who: string; where: string }
interface Recorded { gv: string; style: string; text: string; tries: number; ok: boolean; sec?: number; tokens?: number; why?: string }
interface Job { file: string; count: number; uploaded?: string; batch?: string; state?: string; stats?: unknown; results?: string; fetched?: boolean; created?: string }

const readJson = <T,>(f: string, fallback: T): T => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
function writeJson(f: string, v: unknown) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + ".tmp", JSON.stringify(v, null, f === MANIFEST ? undefined : 1));
  fs.renameSync(f + ".tmp", f);
}
const mp3Of = (key: string) => path.join(OUT, key + ".mp3");

// ---------------------------------------------------------------- the key and the API
function apiKey(): string {
  let k = process.env.GEMINI_API_KEY;
  const f = path.join(ROOT, ".env.local");
  if (!k && fs.existsSync(f)) {
    for (const row of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(.*)$/.exec(row);
      if (m) k = m[1].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  if (!k) { console.error("No Gemini key: add a line GEMINI_API_KEY=… to .env.local in this folder."); process.exit(1); }
  return k;
}
let KEY = "";
async function api<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  KEY ||= apiKey();
  const r = await fetch(url.startsWith("http") ? url : API + url, { ...init, headers: { "x-goog-api-key": KEY, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${url.split("?")[0]} → ${r.status}: ${(await r.text()).slice(0, 600)}`);
  return (await r.json()) as T;
}

/** How the voice is named in a request: Google's docs for gemini-3.8-flash-tts show `voiceConfig.voice`, older models
 *  `voiceConfig.prebuiltVoiceConfig.voiceName`. `try` finds out which one the API takes and keeps it here. */
const CONFIG = path.join(WORK, "config.json");
const voiceShape = (): "voice" | "prebuilt" => readJson<{ voiceShape?: "voice" | "prebuilt" }>(CONFIG, {}).voiceShape ?? "voice";

/** One request: the line as a verbatim transcript, the manner as speech_metadata.style (never read aloud). */
const request = (text: string, voice: string, style: string, shape = voiceShape()) => ({
  contents: [{ role: "user", parts: [{ text, speech_metadata: { style } }] }],
  generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: shape === "voice" ? { voice } : { prebuiltVoiceConfig: { voiceName: voice } } } },
});

// ---------------------------------------------------------------- the lines
function newestSource(): number {
  let t = 0;
  const walk = (p: string) => { const s = fs.statSync(p); if (s.isDirectory()) for (const f of fs.readdirSync(p)) walk(path.join(p, f)); else t = Math.max(t, s.mtimeMs); };
  for (const p of ["src/content", "src/convo", "src/audio-key.ts", "tools/enumerate.ts"]) walk(path.join(ROOT, p));
  return t;
}
function utterances(): Utt[] {
  const cache = path.join(WORK, "lines.json");
  if (!has("fresh") && fs.existsSync(cache) && fs.statSync(cache).mtimeMs > newestSource()) return readJson<Utt[]>(cache, []);
  const { utts, errors } = enumerateAll({ v2: true, fuzzRuns: 120, log: (s) => process.stdout.write("\r" + s.padEnd(70)) });
  process.stdout.write("\n");
  if (errors.length) { console.log(`${errors.length} handler errors while listing lines (fix them first):`); for (const e of errors.slice(0, 10)) console.log("  ! " + e); process.exit(1); }
  writeJson(cache, utts);
  return utts;
}
/** Lines Gemini refuses as written ("PROHIBITED_CONTENT", a false alarm on a name), sent with the name in quotes,
 *  which it doesn't read out. The clip keeps the line's own key. */
const SAY_AS: Record<string, string> = { "I'm looking for Threads.": "I'm looking for \"Threads\"." };

function allLines(): Line[] {
  const out: Line[] = [];
  const nobody = new Set<string>();
  for (const u of utterances()) {
    if (!/[a-z0-9]/i.test(u.say)) continue; // nothing to say: the game plays nothing (src/game/audio.ts)
    const r = roleFor(u.voice);
    if (!r) { nobody.add(u.voice); continue; }
    out.push({ key: audioKey(u.voice, u.speed, u.say), voice: u.voice, speed: u.speed, say: u.say, text: geminiText(SAY_AS[u.say] ?? u.say), gv: r.voice, style: r.style, who: r.who, where: u.where });
  }
  if (nobody.size) { console.log(`no casting for: ${[...nobody].join(", ")}`); process.exit(1); }
  return out;
}

/** About how long a line takes: the same line's length in the game's current voices, or from its words. */
function estimateSeconds(lines: Line[]): Map<string, number> {
  const v1: Record<string, number> = readJson(path.join(ROOT, "public/audio/manifest.json"), {});
  const old = (l: Line) => (l.who === "coach_f" || l.who === "coach_m" ? COACH_VOICE : l.who === "amb_f" ? AMBIENT_VOICES.f : l.who === "amb_m" ? AMBIENT_VOICES.m : NPCS[l.who]?.voice);
  return new Map(lines.map((l) => [l.key, v1[audioKey(old(l) ?? "", l.speed, l.say)] ?? 0.42 * l.say.split(/\s+/).length + 0.4]));
}

// ---------------------------------------------------------------- plan
function plan() {
  const lines = allLines();
  const est = estimateSeconds(lines);
  const per = new Map<string, { n: number; s: number }>();
  for (const l of lines) { const p = per.get(l.who) ?? { n: 0, s: 0 }; p.n++; p.s += est.get(l.key)!; per.set(l.who, p); }
  const total = [...est.values()].reduce((a, b) => a + b, 0);
  const tokens = total * PRICE.tokensPerSecond;
  console.log(`${lines.length} clips, about ${Math.round(total / 60)} min of speech, ${(tokens / 1e6).toFixed(2)}M audio tokens`);
  console.log(`price in batch: about $${((tokens / 1e6) * PRICE.batch).toFixed(2)} until 31 Dec 2026, $${((tokens / 1e6) * PRICE.batchFrom2027).toFixed(2)} after`);
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const done = lines.filter((l) => manifest[l.key]).length;
  if (done) console.log(`already recorded: ${done}`);
  console.log("\nclips per voice:");
  for (const [who, p] of [...per].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${who.padEnd(12)} ${String(p.n).padStart(5)} clips  ${(p.s / 60).toFixed(1).padStart(5)} min  ${roleFor("g_" + who)?.voice}`);
  const odd = lines.filter((l) => /[()*[\]_{}<>|~^\\]/.test(l.say));
  if (odd.length) { console.log(`\n${odd.length} lines with characters a voice might read out:`); for (const l of odd.slice(0, 15)) console.log(`  ${l.who}: ${l.say}`); }
}

// ---------------------------------------------------------------- prepare
function jobsList(): Job[] { return readJson<Job[]>(JOBS, []); }
function linesFile(requestFile: string) { return requestFile.replace(/\.jsonl$/, ".lines.json"); }

/** Three lines per voice for the casting sample: short, middle and long ones the character really says. */
function sampleOf(lines: Line[]): Line[] {
  const pick: Line[] = [];
  const byWho = new Map<string, Line[]>();
  for (const l of lines) { if (!byWho.has(l.who)) byWho.set(l.who, []); byWho.get(l.who)!.push(l); }
  const spread = (ls: Line[], n: number) => {
    const own = ls.filter((l) => !l.where.startsWith("global") && !l.where.endsWith(":fuzz") && !l.where.includes(":soundcheck:") && l.say.length >= 20 && l.say.length <= 150);
    const pool = (own.length >= n ? own : ls).slice().sort((a, b) => a.say.length - b.say.length || a.say.localeCompare(b.say));
    return [0.2, 0.6, 0.95].slice(0, n).map((q) => pool[Math.min(pool.length - 1, Math.floor(q * pool.length))]).filter((l, i, a) => l && a.indexOf(l) === i);
  };
  for (const [who, ls] of byWho) if (!who.startsWith("coach_")) pick.push(...spread(ls, who.startsWith("amb_") ? 2 : 3));
  // the two coach voices say the same three example answers, so they can be compared
  const f = byWho.get("coach_f") ?? [], m = new Map((byWho.get("coach_m") ?? []).map((l) => [l.say, l]));
  for (const l of spread(f.filter((x) => m.has(x.say)), 3)) pick.push(l, m.get(l.say)!);
  return pick;
}

function prepare() {
  const size = Number(flag("size") ?? 4000);
  const lines = allLines();
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const jobs = jobsList();
  const reqDir = path.join(WORK, "requests");
  fs.mkdirSync(reqDir, { recursive: true });
  // request files that were never sent are replaced; lines in batches still running are not asked for again
  const sent = new Set(jobs.map((j) => j.file));
  for (const f of fs.readdirSync(reqDir)) if (!sent.has(path.join("requests", f.replace(/\.lines\.json$/, ".jsonl")))) fs.rmSync(path.join(reqDir, f));
  const waiting = new Set<string>();
  for (const j of jobs) if (!j.fetched && !/FAILED|CANCELLED|EXPIRED/.test(j.state ?? "")) for (const l of readJson<Line[]>(path.join(WORK, linesFile(j.file)), [])) waiting.add(l.key);
  const same = (r: Recorded | undefined, l: Line) => !!r && r.gv === l.gv && r.style === l.style && r.text === l.text;
  const pool = has("sample") ? sampleOf(lines) : lines;
  const tired: Line[] = [];
  const need = pool.filter((l) => {
    if (waiting.has(l.key)) return false;
    const r = recorded[l.key];
    if (manifest[l.key] && fs.existsSync(mp3Of(l.key)) && same(r, l)) return false;
    if (same(r, l) && r!.tries >= MAX_TRIES) { tired.push(l); return false; }
    return true;
  });
  if (tired.length) console.log(`${tired.length} lines failed ${MAX_TRIES} times and are left for a person to look at (voicing/recorded.json)`);
  if (!need.length) { console.log("nothing to record"); return; }
  let n = Math.max(0, ...fs.readdirSync(reqDir).map((f) => Number(f.split("-")[0]) || 0), ...jobs.map((j) => Number(path.basename(j.file).split("-")[0]) || 0));
  const kind = has("sample") ? "sample" : "lines";
  const est = estimateSeconds(need);
  for (let i = 0; i < need.length; i += size) {
    const part = need.slice(i, i + size);
    const name = `${String(++n).padStart(3, "0")}-${kind}`;
    fs.writeFileSync(path.join(reqDir, name + ".jsonl"), part.map((l) => JSON.stringify({ key: l.key, request: request(l.text, l.gv, l.style) })).join("\n") + "\n");
    writeJson(path.join(reqDir, name + ".lines.json"), part);
  }
  const sec = need.reduce((a, l) => a + est.get(l.key)!, 0);
  console.log(`${need.length} lines in ${Math.ceil(need.length / size)} request file(s) in voicing/requests/, about ${Math.round(sec / 60)} min, about $${((sec * PRICE.tokensPerSecond / 1e6) * PRICE.batch).toFixed(2)} in batch`);
}

// ---------------------------------------------------------------- send, status
async function send() {
  const jobs = jobsList();
  const reqDir = path.join(WORK, "requests");
  const files = fs.existsSync(reqDir) ? fs.readdirSync(reqDir).filter((f) => f.endsWith(".jsonl")).sort() : [];
  const todo = files.map((f) => path.join("requests", f)).filter((f) => !jobs.some((j) => j.file === f));
  if (!todo.length) { console.log("nothing prepared to send (npx tsx tools/voice-batch.ts prepare)"); return; }
  KEY ||= apiKey();
  // Google lets only so much batch work run at once (Tier 2: 100,000 "active concurrent batch tokens" for this
  // model). A file it refuses waits while other batches run; a file refused with nothing running is split in two.
  const queue = [...todo];
  while (queue.length) {
    const file = queue.shift()!;
    try { await sendOne(file, jobs); } catch (e: any) {
      if (!/→ 429/.test(e.message) || !/concurrent|enqueued/i.test(e.message)) throw e;
      const running = jobs.some((j) => !j.fetched && /PENDING|RUNNING|QUEUED/.test(j.state ?? ""));
      const lines = readJson<Line[]>(path.join(WORK, linesFile(file)), []);
      if (running || lines.length < 200) { console.log(`no room for ${path.basename(file)} while other batches run: it waits (${queue.length + 1} files to send)`); return; }
      queue.unshift(...splitRequestFile(file));
      console.log(`${path.basename(file)} is too big to run alone: split in two`);
    }
  }
}

/** Splits a prepared, unsent request file into two halves (…-a, …-b) and returns them. */
function splitRequestFile(file: string): string[] {
  const rows = fs.readFileSync(path.join(WORK, file), "utf8").split("\n").filter(Boolean);
  const lines = readJson<Line[]>(path.join(WORK, linesFile(file)), []);
  const half = Math.ceil(rows.length / 2);
  const out: string[] = [];
  for (const [suffix, from, to] of [["a", 0, half], ["b", half, rows.length]] as const) {
    const f = file.replace(/\.jsonl$/, `-${suffix}.jsonl`);
    const keys = new Set(rows.slice(from, to).map((r) => JSON.parse(r).key));
    fs.writeFileSync(path.join(WORK, f), rows.slice(from, to).join("\n") + "\n");
    writeJson(path.join(WORK, linesFile(f)), lines.filter((l) => keys.has(l.key)));
    out.push(f);
  }
  fs.rmSync(path.join(WORK, file));
  fs.rmSync(path.join(WORK, linesFile(file)));
  return out;
}

async function sendOne(file: string, jobs: Job[]) {
  {
    const bytes = fs.readFileSync(path.join(WORK, file));
    const name = `maple-harbor-${path.basename(file, ".jsonl")}`;
    const start = await fetch(`${API}/upload/v1beta/files`, {
      method: "POST",
      headers: { "x-goog-api-key": KEY, "X-Goog-Upload-Protocol": "resumable", "X-Goog-Upload-Command": "start", "X-Goog-Upload-Header-Content-Length": String(bytes.length), "X-Goog-Upload-Header-Content-Type": "application/jsonl", "Content-Type": "application/json" },
      body: JSON.stringify({ file: { display_name: name } }),
    });
    const uploadUrl = start.headers.get("x-goog-upload-url");
    if (!start.ok || !uploadUrl) throw new Error(`upload start → ${start.status}: ${(await start.text()).slice(0, 400)}`);
    const up = await fetch(uploadUrl, { method: "POST", headers: { "X-Goog-Upload-Offset": "0", "X-Goog-Upload-Command": "upload, finalize" }, body: bytes });
    if (!up.ok) throw new Error(`upload → ${up.status}: ${(await up.text()).slice(0, 400)}`);
    const uploaded = (await up.json()).file?.name as string;
    const job: Job = { file, count: readJson<Line[]>(path.join(WORK, linesFile(file)), []).length, uploaded, created: new Date().toISOString() };
    const b = await api(`/v1beta/models/${MODEL}:batchGenerateContent`, { method: "POST", body: JSON.stringify({ batch: { display_name: name, input_config: { file_name: uploaded } } }) });
    job.batch = b.name;
    job.state = b.metadata?.state ?? b.state ?? "JOB_STATE_PENDING";
    jobs.push(job);
    writeJson(JOBS, jobs); // at once: starting a batch twice would record (and pay for) it twice
    console.log(`${file}: ${job.count} lines → ${job.batch} (${job.state})`);
  }
}

async function status(quiet = false): Promise<Job[]> {
  const jobs = jobsList();
  for (const j of jobs) {
    if (j.fetched || !j.batch) continue;
    const b = await api(`/v1beta/${j.batch}`);
    const md = b.metadata ?? {};
    j.state = md.state ?? b.state ?? j.state;
    j.stats = md.batchStats ?? b.batchStats ?? j.stats;
    j.results = b.response?.responsesFile ?? md.output?.responsesFile ?? b.output?.responsesFile ?? b.dest?.fileName ?? md.dest?.fileName ?? j.results;
  }
  writeJson(JOBS, jobs);
  if (!quiet) {
    for (const j of jobs) console.log(`${path.basename(j.file)}  ${j.batch ?? "not sent"}  ${j.fetched ? "fetched" : j.state}  ${j.stats ? JSON.stringify(j.stats) : ""}`);
    const reqDir = path.join(WORK, "requests");
    const unsent = (fs.existsSync(reqDir) ? fs.readdirSync(reqDir) : []).filter((f) => f.endsWith(".jsonl") && !jobs.some((j) => j.file === path.join("requests", f))).length;
    const running = jobs.filter((j) => !j.fetched && /PENDING|RUNNING|QUEUED/.test(j.state ?? "")).length;
    const toFetch = jobs.filter((j) => !j.fetched && /SUCCEEDED$/.test(j.state ?? "")).length;
    const failed = jobs.filter((j) => !j.fetched && /FAILED|CANCELLED|EXPIRED/.test(j.state ?? "")).length;
    console.log(`left: ${unsent} files to send, ${running} batches running, ${toFetch} to fetch, ${failed} failed`);
  }
  return jobs;
}

// ---------------------------------------------------------------- fetch
/** Runs `fn` over items with at most `n` at a time. */
async function pool<T>(items: AsyncIterable<T> | Iterable<T>, n: number, fn: (t: T) => Promise<void>) {
  const running = new Set<Promise<void>>();
  for await (const it of items as AsyncIterable<T>) {
    const p = fn(it).finally(() => running.delete(p));
    running.add(p);
    if (running.size >= n) await Promise.race(running);
  }
  await Promise.all(running);
}

/** Makes clips from one results file. Returns [made, problems]. */
async function makeClips(resultsFile: string, lines: Line[]): Promise<[number, number]> {
  const byKey = new Map(lines.map((l) => [l.key, l]));
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  fs.mkdirSync(OUT, { recursive: true });
  fs.mkdirSync(WAV, { recursive: true });
  let made = 0, bad = 0, n = 0;
  const save = () => { writeJson(MANIFEST, manifest); writeJson(RECORDED, recorded); };
  // one row is one clip (about 200 KB); the reader pauses the file while rows wait
  const rows = readline.createInterface({ input: fs.createReadStream(resultsFile, { highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  await pool(rows, 6, async (row) => {
    if (!row.trim()) return;
    const o = JSON.parse(row);
    const l = byKey.get(o.key);
    if (!l) return;
    const prev = recorded[l.key];
    const tries = (prev && prev.gv === l.gv && prev.style === l.style && prev.text === l.text ? prev.tries : 0) + 1;
    const fail = (why: string) => { bad++; recorded[l.key] = { gv: l.gv, style: l.style, text: l.text, tries, ok: false, why }; };
    try {
      const cand = o.response?.candidates?.[0];
      const parts = (cand?.content?.parts ?? []).filter((p: any) => p.inlineData?.data);
      if (!parts.length) return fail(o.error?.message ?? o.status?.message ?? `no audio (${cand?.finishReason ?? "no answer"})`);
      const chunks = parts.map((p: any) => decodeAudio(Buffer.from(p.inlineData.data, "base64"), p.inlineData.mimeType));
      const rate = chunks[0].rate;
      const all = new Float32Array(chunks.reduce((a: number, c: { samples: Float32Array }) => a + c.samples.length, 0));
      let at = 0;
      for (const c of chunks) { all.set(c.samples, at); at += c.samples.length; }
      const clip = trimAndNormalize(all, rate);
      const sec = +(clip.length / rate).toFixed(2);
      if (sec < 0.25) return fail("silent");
      const tmp = mp3Of(l.key) + `.${process.pid}.tmp`;
      await encodeClip(clip, rate, tmp, path.join(WAV, l.key + ".wav"));
      fs.renameSync(tmp, mp3Of(l.key));
      manifest[l.key] = sec;
      recorded[l.key] = { gv: l.gv, style: l.style, text: l.text, tries, ok: true, sec, tokens: o.response?.usageMetadata?.candidatesTokenCount };
      made++;
    } catch (e: any) { fail(e.message); }
    if (++n % 200 === 0) { save(); process.stdout.write(`\r  ${n} clips`); }
  });
  save();
  process.stdout.write("\n");
  return [made, bad];
}

async function fetchAll() {
  const jobs = await status(true);
  let any = false;
  for (const j of jobs) {
    // the docs name the states both JOB_STATE_… and BATCH_STATE_…
    if (j.fetched || !/SUCCEEDED$/.test(j.state ?? "")) continue;
    any = true;
    if (!j.results) { console.log(`${j.batch}: finished, but names no results file`); continue; }
    const local = path.join(WORK, "results", `${j.batch!.split("/").pop()}.jsonl`);
    if (!fs.existsSync(local)) {
      fs.mkdirSync(path.dirname(local), { recursive: true });
      KEY ||= apiKey();
      const r = await fetch(`${API}/download/v1beta/${j.results}:download?alt=media`, { headers: { "x-goog-api-key": KEY } });
      if (!r.ok || !r.body) throw new Error(`download ${j.results} → ${r.status}: ${(await r.text()).slice(0, 400)}`);
      await pipeline(Readable.fromWeb(r.body as any), fs.createWriteStream(local + ".tmp"));
      fs.renameSync(local + ".tmp", local);
    }
    console.log(`${path.basename(j.file)}: making clips from ${path.relative(ROOT, local)} (${(fs.statSync(local).size / 1048576).toFixed(0)} MB)`);
    const [made, bad] = await makeClips(local, readJson<Line[]>(path.join(WORK, linesFile(j.file)), []));
    j.fetched = true;
    writeJson(JOBS, jobs);
    console.log(`  ${made} clips made, ${bad} without a usable clip (they go into the next prepare)`);
  }
  if (!any) console.log("no finished batch to fetch yet (npx tsx tools/voice-batch.ts status)");
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const tokens = Object.values(recorded).reduce((a, r) => a + (r.tokens ?? 0), 0);
  if (tokens) console.log(`audio tokens so far: ${(tokens / 1e6).toFixed(2)}M ≈ $${((tokens / 1e6) * PRICE.batch).toFixed(2)} in batch`);
}

// ---------------------------------------------------------------- try
async function tryOne() {
  const text = args.slice(1).find((a) => !a.startsWith("--")) ?? "Hi there! What can I get started for you today?";
  const who = flag("who") ?? "coach_f";
  const role = roleFor("g_" + who);
  if (!role) { console.error(`no such character: ${who}`); process.exit(1); }
  const voice = flag("voice") ?? role.voice, style = flag("style") ?? role.style;
  const ask = (shape: "voice" | "prebuilt") => api(`/v1beta/models/${MODEL}:generateContent`, { method: "POST", body: JSON.stringify(request(geminiText(text), voice, style, shape)) });
  let r;
  try { r = await ask(voiceShape()); } catch (e: any) {
    // the other way of naming the voice; the one that works is kept for every later request
    if (!/→ 400/.test(e.message) || !/voice/i.test(e.message)) throw e;
    const other = voiceShape() === "voice" ? "prebuilt" : "voice";
    console.log(`the API wants the voice named the other way (${other}); keeping that`);
    r = await ask(other);
    writeJson(CONFIG, { ...readJson(CONFIG, {}), voiceShape: other });
  }
  const parts = (r.candidates?.[0]?.content?.parts ?? []).filter((p: any) => p.inlineData?.data);
  if (!parts.length) { console.log("no audio in the answer:", JSON.stringify(r).slice(0, 600)); process.exit(1); }
  const { samples, rate } = decodeAudio(Buffer.from(parts[0].inlineData.data, "base64"), parts[0].inlineData.mimeType);
  const clip = trimAndNormalize(samples, rate);
  const dir = path.join(WORK, "try");
  fs.mkdirSync(dir, { recursive: true });
  const base = path.join(dir, `${who}-${voice}-${Date.now()}`);
  await encodeClip(clip, rate, base + ".mp3", base + ".wav");
  console.log(`${path.relative(ROOT, base)}.mp3: ${(clip.length / rate).toFixed(2)} s, ${parts[0].inlineData.mimeType}, ${r.usageMetadata?.candidatesTokenCount ?? "?"} audio tokens (${voice}, "${style}")`);
}

// ---------------------------------------------------------------- check, redo
const UNITS: Record<string, number> = { zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const TIMES: Record<string, number> = { hundred: 100, thousand: 1000, million: 1e6 };
/** Numbers in words become digits, the way Whisper writes them: "nine hundred fifteen" → 915, and prices and times
 *  said in pieces run together: "twenty-seven sixty-four" → 2764, "thirty-seven oh nine" → 3709 (punctuation such as
 *  the dot in 42.1 doesn't count anyway). */
export function numbersToDigits(s: string): string {
  const words = s.toLowerCase().replace(/(\d),(\d)/g, "$1$2").replace(/\ban? (hundred|thousand|million)\b/g, "one $1").split(/[\s-]+/);
  const bare = (w: string) => w.replace(/[^a-z]/g, "");
  const isNum = (w: string, prevNum: boolean) => w in UNITS || w in TENS || ((w in TIMES || w === "point") && prevNum) ? (w !== "oh" || prevNum) : false;
  const out: string[] = [];
  for (let i = 0; i < words.length;) {
    if (!isNum(bare(words[i]), false)) { out.push(words[i]); i++; continue; }
    const groups: string[] = [];
    let total = 0, cur = 0, last = "";
    const flush = () => { groups.push(String(total + cur)); total = 0; cur = 0; };
    while (i < words.length && (isNum(bare(words[i]), true) || (bare(words[i]) === "and" && last === "times" && i + 1 < words.length && isNum(bare(words[i + 1]), true)))) {
      const w = bare(words[i]);
      if (w === "and") { i++; continue; } // "a hundred and one"
      if (w === "point") { flush(); last = "point"; } // "forty-two point one" → 42.1, written 421 without the dot
      else if (w in TIMES) { cur = (cur || 1) * TIMES[w]; if (TIMES[w] >= 1000) { total += cur; cur = 0; } last = "times"; }
      else if (w in TENS) { if (last === "unit" || last === "tens" || last === "teen") flush(); cur += TENS[w]; last = "tens"; }
      else { const v = UNITS[w]; if (last === "unit" || last === "teen" || (last === "tens" && (v >= 10 || v === 0))) flush(); cur += v; last = v >= 10 ? "teen" : "unit"; }
      i++;
    }
    flush();
    out.push(groups.join(""));
  }
  return out.join(" ");
}
const ORDINAL: Record<string, string> = { first: "one", second: "two", third: "three", fifth: "five", eighth: "eight", ninth: "nine", twelfth: "twelve" };
/** What a voice says and Whisper writes differently: "-4?" (minus four), "20s" (twenties), "June 4th" (fourth),
 *  "See ya!" (see you); a laugh ("Ha!") it leaves out. */
const spoken = (s: string) => s.toLowerCase().replace(/&/g, " and ")
  .replace(/(^|[\s(])[-−](?=\d)/g, "$1minus ")
  .replace(/\b(twent|thirt|fort|fift|sixt|sevent|eight|ninet)ies\b/g, "$1y s")
  .replace(/\b(twent|thirt|fort|fift|sixt|sevent|eight|ninet)ieth\b/g, "$1y")
  .replace(/\b(first|second|third|fifth|eighth|ninth|twelfth)\b/g, (w) => ORDINAL[w])
  .replace(/\b(four|six|seven|ten|eleven|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)th\b/g, "$1")
  .replace(/(\d)(st|nd|rd|th)\b/g, "$1")
  .replace(/\bya\b/g, "you")
  .replace(/\b(ha|hah|haha)\b/g, " ");
/** Letters and digits only, numbers as digits, without the money words a voice and Whisper write differently. */
const letters = (s: string) => numbersToDigits(spoken(s)).replace(/\b(dollars?|bucks|cents?|percent)\b/g, "").replace(/[^a-z0-9]/g, "").replace(/([a-z])\1{2,}/g, "$1$1");
/** Whisper sometimes repeats a sentence it heard once ("Take one. Take one. Take one."): a sentence that comes again
 *  right after itself counts once, on both sides. */
const onceEach = (s: string) => s.split(/(?<=[.!?])\s+/).filter((x, i, all) => i === 0 || letters(x) !== letters(all[i - 1])).join(" ");
/** How alike the line and what Whisper heard are, 0…1, letter by letter (punctuation, spaces and how a number is
 *  written don't count). */
export function likeness(said: string, heard: string): number {
  return Math.max(alike(letters(said), letters(heard)), alike(letters(onceEach(said)), letters(onceEach(heard))));
}
function alike(a: string, b: string): number {
  if (!a || !b) return a === b ? 1 : 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
/** Syllables, roughly: vowel groups (a silent final e doesn't count) and digits one each. A speaking pace by syllables
 *  isn't thrown off by numbers in words ("thirty-six thirty-eight") or long words the way a pace by words is. */
export function syllables(s: string): number {
  let n = 0;
  for (const w of s.toLowerCase().split(/[\s-]+/)) {
    const groups = (w.match(/[aeiouy]+/g) ?? []).length;
    const silentE = groups > 1 && /[^aeiouy]e[^a-z0-9]*$/.test(w) ? 1 : 0;
    n += (w.match(/\d/g)?.length ?? 0) + (/[a-z]/.test(w) ? Math.max(1, groups - silentE) : 0);
  }
  return n;
}
/** Every clip is about this much longer than its syllables alone (a one-word clip is about a second), and each comma,
 *  colon or stop inside the line adds about PAUSE. */
const CLIP_BASE = 0.45, PAUSE = 0.2;
const pauses = (s: string) => (s.trim().replace(/[\s.!?…"”’)]+$/, "").match(/[,;:.!?…—]+/g) ?? []).length;
/** Whisper heard a quarter more than the line or more (the line twice, a piece of it again, or words added). */
const heardMore = (said: string, heard: string) => letters(heard).length >= 1.25 * letters(said).length && letters(said).length > 0;
/** The clip says more than the line (Gemini sometimes says a line two or three times, or a piece of it again): Whisper
 *  heard more, and the clip's length fits what Whisper heard better than the line. Whisper alone isn't enough: it
 *  sometimes writes a sentence twice that the clip says once. `pace` is the character's usual seconds per syllable. */
export function saysMore(said: string, heard: string, sec: number, pace: number): boolean {
  if (!heardMore(said, heard)) return false;
  const speech = pace * syllables(said);
  const once = CLIP_BASE + PAUSE * pauses(said) + speech;
  const more = CLIP_BASE + PAUSE * pauses(heard) + (speech * letters(heard).length) / letters(said).length;
  return Math.abs(Math.log(sec / more)) < Math.abs(Math.log(sec / once));
}
/** A clip to record again for its length: it says more than the line (above), or it is far too long even without
 *  Whisper's word for it (a long silence, the line three times). */
export const tooLong = (said: string, heard: string | undefined, sec: number, pace: number) =>
  (heard !== undefined && saysMore(said, heard, sec, pace)) || sec > 2.2 * (CLIP_BASE + PAUSE * pauses(said) + pace * syllables(said)) + 0.5;
/** Each character's usual pace: seconds per syllable (beyond CLIP_BASE), the median of their clips of 4 syllables or
 *  more. */
export function paces(keys: string[], sec: Record<string, number>, said: Map<string, string>, whose: Map<string, string>): Map<string, number> {
  const byWho = new Map<string, number[]>();
  for (const k of keys) {
    const n = syllables(said.get(k) ?? "");
    if (!sec[k] || n < 4) continue;
    const w = whose.get(k) ?? "?";
    if (!byWho.has(w)) byWho.set(w, []);
    byWho.get(w)!.push((sec[k] - CLIP_BASE - PAUSE * pauses(said.get(k)!)) / n);
  }
  return new Map([...byWho].map(([w, xs]) => [w, xs.sort((a, b) => a - b)[Math.floor(xs.length / 2)]]));
}
/** What a check result was made from: the line, the clip's length and, for a clip recorded again, which try it is (a
 *  new take can come out exactly as long as the old one). */
const madeFrom = (r: Recorded) => r.text + "|" + r.sec + (r.tries > 1 ? "|" + r.tries : "");

async function check() {
  const model = process.env.WHISPER_MODEL ?? path.join(WORK, "models/ggml-large-v3-turbo-q5_0.bin");
  if (!fs.existsSync(model)) { console.error(`no Whisper model at ${model} (set WHISPER_MODEL)`); process.exit(1); }
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const results: Record<string, { heard: string; score: number; text: string; full?: boolean; odd?: "long" }> = readJson(CHECK, {});
  const todo = Object.keys(manifest).filter((k) => recorded[k]?.ok && fs.existsSync(path.join(WAV, k + ".wav")) && results[k]?.text !== madeFrom(recorded[k]));
  console.log(`${todo.length} clips to check`);
  const run = promisify(execFile);
  const said = new Map<string, string>(), whose = new Map<string, string>();
  for (const f of fs.existsSync(path.join(WORK, "requests")) ? fs.readdirSync(path.join(WORK, "requests")).filter((f) => f.endsWith(".lines.json")) : []) for (const l of readJson<Line[]>(path.join(WORK, "requests", f), [])) { said.set(l.key, l.say); whose.set(l.key, l.who); }
  // earlier results scored again, in case the comparison has improved since
  for (const [k, r] of Object.entries(results)) if (said.has(k)) r.score = +likeness(said.get(k)!, r.heard).toFixed(3);
  let checked = 0;
  const listen = async (keys: string[], full: boolean) => {
    for (let i = 0; i < keys.length; i += 200) {
      const part = keys.slice(i, i + 200);
      await run("whisper-cli", ["-m", model, "-l", "en", "-nt", "-np", "-otxt", "-t", "8", ...(full ? [] : ["-ac", "512"]), ...part.map((k) => path.join(WAV, k + ".wav"))], { maxBuffer: 64 << 20 });
      for (const k of part) {
        const txt = path.join(WAV, k + ".wav.txt");
        const heard = fs.existsSync(txt) ? fs.readFileSync(txt, "utf8").replace(/\s+/g, " ").trim() : "";
        fs.rmSync(txt, { force: true });
        results[k] = { heard, score: +likeness(said.get(k) ?? recorded[k].text, heard).toFixed(3), text: madeFrom(recorded[k]), ...(full ? { full } : {}) };
      }
      writeJson(CHECK, results);
      checked += part.length;
      process.stdout.write(`\r  ${checked} heard`);
    }
  };
  // most clips are short: Whisper first listens in a 10-second window instead of 30 for them, about twice as fast.
  // That window sometimes makes it repeat what it heard or lose words, so a clip that doesn't match, or where Whisper
  // heard more than the line, is heard again in full (once).
  await listen(todo.filter((k) => manifest[k] <= 9.5), false);
  await listen(todo.filter((k) => manifest[k] > 9.5), true);
  await listen(Object.keys(results).filter((k) => manifest[k] && recorded[k]?.ok && said.has(k) && !results[k].full && (results[k].score < 0.85 || heardMore(said.get(k)!, results[k].heard))), true);
  // A line said twice scores well (a repeated sentence counts once), so the clip's length decides (see saysMore).
  const pace = paces(Object.keys(results), manifest, said, whose);
  for (const [k, r] of Object.entries(results)) {
    if (manifest[k] && said.has(k) && tooLong(said.get(k)!, r.heard, manifest[k], pace.get(whose.get(k) ?? "?") ?? 0.2)) r.odd = "long";
    else delete r.odd;
  }
  writeJson(CHECK, results);
  process.stdout.write("\n");
  const low = Object.entries(results).filter(([k, r]) => manifest[k] && r.score < 0.85).sort((a, b) => a[1].score - b[1].score);
  const odd = Object.entries(results).filter(([k, r]) => manifest[k] && r.odd);
  console.log(`${odd.length} clips that say more than the line (twice, or a piece of it again) or are far too long`);
  console.log(`${low.length} clips where Whisper heard something different (below 0.85):`);
  for (const [k, r] of low.slice(0, 40)) console.log(`  ${r.score.toFixed(2)} ${k}\n       said:  ${said.get(k) ?? recorded[k]?.text}\n       heard: ${r.heard}`);
}

function redo() {
  const below = Number(flag("below") ?? 0.8);
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const results: Record<string, { score: number; odd?: string }> = readJson(CHECK, {});
  const out = path.join(WORK, "rejected");
  fs.mkdirSync(out, { recursive: true });
  let n = 0, kept = 0;
  for (const [k, r] of Object.entries(results)) {
    if (!manifest[k] || (r.score >= below && !r.odd)) continue;
    // a line that has had all its tries keeps its last take: better than no clip (and Whisper mishears some names)
    if ((recorded[k]?.tries ?? 1) >= MAX_TRIES) { kept++; continue; }
    if (fs.existsSync(mp3Of(k))) fs.renameSync(mp3Of(k), path.join(out, `${k}.${recorded[k]?.tries ?? 1}.mp3`));
    delete manifest[k];
    n++;
  }
  writeJson(MANIFEST, manifest);
  console.log(`${n} clips taken out (kept in voicing/rejected/); the next prepare asks for them again`);
  if (kept) console.log(`${kept} flagged clips kept: their lines have had ${MAX_TRIES} tries (voicing/check.json)`);
}

// ---------------------------------------------------------------- the casting sample page
function sheet() {
  const dir = flag("out") ?? path.join(WORK, "sample");
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const reqDir = path.join(WORK, "requests");
  const lines = fs.readdirSync(reqDir).filter((f) => f.endsWith("-sample.lines.json")).flatMap((f) => readJson<Line[]>(path.join(reqDir, f), []));
  const latest = new Map(lines.map((l) => [l.key, l]));
  fs.mkdirSync(path.join(dir, "clips"), { recursive: true });
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const roles: { who: string; name: string; about: string }[] = [
    ...Object.values(NPCS).map((n) => ({ who: n.id, name: n.name, about: `${n.role.en} · ${where(n.id).join(", ")}` })),
    { who: "coach_f", name: "Coach (female learner)", about: "the learner's example answers" },
    { who: "coach_m", name: "Coach (male learner)", about: "the learner's example answers" },
    { who: "amb_f", name: "Passer-by (f)", about: "the town" }, { who: "amb_m", name: "Passer-by (m)", about: "the town" },
  ];
  let html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maple Harbor voices</title>
<style>:root{color-scheme:light dark;--bg:#faf7f0;--fg:#222;--mute:#666;--line:#e3ddd0}@media (prefers-color-scheme:dark){:root{--bg:#1c1b19;--fg:#eee;--mute:#aaa;--line:#3a3833}}
body{margin:0 auto;max-width:860px;padding:16px;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,sans-serif}h1{font-size:1.5em}
section{border-top:1px solid var(--line);padding:12px 0}h2{font-size:1.1em;margin:0}.about{color:var(--mute);font-size:.9em}
.clip{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.clip span{flex:1 1 280px}audio{height:32px;max-width:100%}</style>
<h1>Maple Harbor: voice casting sample</h1><p class="about">Each character's Gemini voice and how they speak. Say which voices to change (for example "Rosa: older, warmer").</p>`;
  let count = 0;
  for (const r of roles) {
    const role = roleFor("g_" + r.who);
    const mine = [...latest.values()].filter((l) => l.who === r.who && manifest[l.key]);
    if (!role || !mine.length) continue;
    html += `<section><h2>${esc(r.name)} — ${role.voice}</h2><div class="about">${esc(r.about)} · “${esc(role.style)}”</div>`;
    for (const l of mine) {
      fs.copyFileSync(mp3Of(l.key), path.join(dir, "clips", l.key + ".mp3"));
      html += `<div class="clip"><audio controls preload="none" src="clips/${l.key}.mp3"></audio><span>${esc(l.say)}</span></div>`;
      count++;
    }
    html += `</section>`;
  }
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log(`${count} clips on ${path.join(dir, "index.html")}`);
}

// ---------------------------------------------------------------- upload to R2
async function upload() {
  const wrangler = process.env.WRANGLER ?? path.join(process.env.HOME ?? "", "fluent-steps/node_modules/.bin/wrangler");
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const doneFile = path.join(WORK, "uploaded.json");
  const done: Record<string, string> = readJson(doneFile, {});
  // a clip recorded again after its upload goes up again (before the switch no browser has it yet; after it, a
  // re-recorded clip also needs a repair version, see src/game/audio.ts)
  const md5 = (k: string) => createHash("md5").update(fs.readFileSync(mp3Of(k))).digest("hex");
  const todo = Object.keys(manifest).filter((k) => fs.existsSync(mp3Of(k)) && done[k] !== md5(k));
  console.log(`${todo.length} clips to upload`);
  const run = promisify(execFile);
  let n = 0, failed = 0;
  // Cloudflare's API takes about 4 requests a second per account; 4–6 uploads at a time stay under it
  await pool(todo, Number(flag("parallel") ?? 4), async (k) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await run(wrangler, ["r2", "object", "put", `fluent-steps-audio/fluent-steps/game/audio-v2/${k}.mp3`, "--file", mp3Of(k), "--content-type", "audio/mpeg", "--remote"]);
        done[k] = md5(k);
        break;
      } catch { if (attempt === 2) failed++; }
    }
    if (++n % 100 === 0) { writeJson(doneFile, done); process.stdout.write(`\r  ${n}/${todo.length}`); }
  });
  writeJson(doneFile, done);
  console.log(`\nuploaded ${n - failed}, failed ${failed}`);
}

const commands: Record<string, () => unknown> = { plan, prepare, send, status: () => status(), fetch: fetchAll, try: tryOne, check, redo, sheet, upload };
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("voice-batch.ts")) {
  if (!commands[cmd]) { console.log("commands: " + Object.keys(commands).join(", ") + " (see the top of tools/voice-batch.ts)"); process.exit(1); }
  await commands[cmd]();
}
export { makeClips, request, sampleOf };
