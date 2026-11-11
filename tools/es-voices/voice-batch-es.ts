// Records Puerto Colibrí's voices with Gemini (docs/es/VOICES.md): the Spanish edition's copy of tools/voice-batch.ts,
// which stays as it is for Maple Harbor. The lines come from tools/es-voices/lines-es.ts (both learner genders, and
// every line in three accent sets: Mexican, es_…, neutral Latin American, esn_…, and Spain's, esp_…, each with its own text where a line
// has a neutral twin), the voices and directions from tools/es-voices/casting-es.ts (a direction per character, a
// setting per conversation, an accent per set). Every request goes into a cost ledger, and nothing new is asked for
// past the cap.
// Run everything with the edition overlay:
//   EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-batch-es.ts <command>
// Commands:
//   plan                          what would be recorded: clips per voice, minutes, price (no key)
//   sample [--per=3] [--who=a,b] [--round=name] [--accent=mx|neutral|spain] [--age] [--no-accent]
//                                 a few lines per voice right away, in both accents unless --accent (key)
//   check-samples <round>         Whisper (Spanish) and the length screen on a sample round (no key)
//   judge <round>                 a Gemini listener, not told which accent was asked for, says which it hears
//                                 (Mexican, neutral Latin American, Spain, other), the words, the age (key, cents)
//   sheet <round>                 a page to listen to a sample round: <work>/samples/<round>/index.html
//   prepare [--size=3000]         request files for every line not recorded yet (no key)
//   send / status / fetch         start the batches, their state, download one at a time and make the clips (key)
//   check                         Whisper (Spanish) listens to every new clip, plus the length rule (no key)
//   redo [--below=0.8]            failed clips go back to the next prepare (their takes kept in <work>/rejected/)
//   install [--to=<repo>]         the clips, manifest.json and repair-versions.json into <repo>/public/audio-es/
//   ledger                        the spend so far
// The work folder is ~/puerto-colibri-voicing (PC_VOICING to change it): lines, requests, batch results, the clean
// 16 kHz copies Whisper hears, rejected takes, the ledger, and the master copy of the clips (audio-es/).
// The key: GEMINI_API_KEY in ~/english-world/.env.local (PC_ENV to change it), read by this script into memory and
// only ever put into a request header. Nothing prints or logs it.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { createHash } from "node:crypto";
import { audioKey } from "../../src/audio-key";
import { levenshtein } from "../../src/convo/normalize";
import { EDITION } from "../../src/edition";
import { NPCS } from "../../src/content/npcs";
import { SITUATION_BY_ID } from "../../src/content/situations";
import { placeholders } from "../../src/convo/compose";
import { enumerateEs, mergeUtts, type EsUtt, type LinesResult } from "./lines-es";
import { accentOf, castingProblems, roleOf, styleFor, whoOf, type Accent, type StyleOpts } from "./casting-es";
import { decodeAudio, trimAndNormalize } from "../audio-util";

if (EDITION.id !== "es") { console.error("Run with the Spanish edition: EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/es-voices/voice-batch-es.ts …"); process.exit(1); }

const ROOT = path.resolve(import.meta.dirname, "../..");
const WORK = process.env.PC_VOICING ?? path.join(os.homedir(), "puerto-colibri-voicing");
const CLIPS = path.join(WORK, "audio-es");
const WAV = path.join(WORK, "wav16");
const MANIFEST = path.join(CLIPS, "manifest.json");
const REPAIRS = path.join(CLIPS, "repair-versions.json");
const RECORDED = path.join(WORK, "recorded.json");
const JOBS = path.join(WORK, "jobs.json");
const CHECK = path.join(WORK, "check.json");
const LEDGER = path.join(WORK, "ledger.jsonl");
const INSTALLED = path.join(WORK, "installed.json");
const ENV_FILE = process.env.PC_ENV ?? path.join(os.homedir(), "english-world/.env.local");
const WHISPER_MODEL = process.env.WHISPER_MODEL ?? path.join(os.homedir(), "english-world/voicing/models/ggml-large-v3-turbo-q5_0.bin");
const MODEL = "gemini-3.8-flash-tts";
const JUDGE_MODEL = process.env.PC_JUDGE ?? "gemini-3.8-flash";
const API = "https://generativelanguage.googleapis.com";
/** $ per 1M tokens (checked 4 Nov 2026 on Google's price page; the batch and standard prices double from 2027). */
const PRICE = {
  batch: { text: 0.25, audio: 4.5 },
  standard: { text: 0.5, audio: 9 },
  judge: { input: 0.75, output: 3.75 },
  tokensPerSecond: 25,
};
/** The owner's stop line for all three accent sets together, samples and redos included (4 Nov 2026: $38; 11 Nov,
 *  with Spain's set and the owner's top-up: $48). All bulk voicing goes through the Batch API; single requests only for
 *  a few sample lines. */
const CAP = Number(process.env.PC_CAP ?? 48);
const MAX_TRIES = 4;

const args = process.argv.slice(2);
const cmd = args[0];
const flag = (name: string) => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const has = (name: string) => args.includes(`--${name}`);

export interface Line {
  key: string; voice: string; who: string; accent: Accent; speed: number; say: string; shown: string;
  /** What Gemini is given to say (geminiTextEs), the voice, the style, the sound of the setting. */
  text: string; gv: string; style: string; fx?: "phone" | "video";
  where: string; sits: string[]; neutral?: boolean; spain?: boolean;
}
interface Recorded { gv: string; style: string; text: string; fx?: string; tries: number; ok: boolean; sec?: number; tokens?: number; textTokens?: number; why?: string }
interface Job { file: string; count: number; estimate: number; uploaded?: string; batch?: string; state?: string; stats?: unknown; results?: string; fetched?: boolean; failed?: boolean; created?: string }

const readJson = <T,>(f: string, fallback: T): T => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : fallback);
function writeJson(f: string, v: unknown, compact = false) {
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f + ".tmp", JSON.stringify(v, null, compact ? undefined : 1));
  fs.renameSync(f + ".tmp", f);
}
const mp3Of = (key: string) => path.join(CLIPS, key + ".mp3");
const wavOf = (key: string) => path.join(WAV, key + ".wav");

// ---------------------------------------------------------------- the key, the API, the ledger
function apiKey(): string {
  let k = process.env.GEMINI_API_KEY;
  if (!k && fs.existsSync(ENV_FILE)) {
    for (const row of fs.readFileSync(ENV_FILE, "utf8").split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(.*)$/.exec(row);
      if (m) k = m[1].trim().replace(/^(['"])(.*)\1$/, "$2");
    }
  }
  if (!k) { console.error(`No Gemini key yet: the owner adds GEMINI_API_KEY=… to ${ENV_FILE}.`); process.exit(1); }
  return k;
}
let KEY = "";
async function api<T = any>(url: string, init: RequestInit = {}): Promise<T> {
  KEY ||= apiKey();
  const r = await fetch(url.startsWith("http") ? url : API + url, { ...init, headers: { "x-goog-api-key": KEY, "Content-Type": "application/json", ...(init.headers || {}) } });
  if (!r.ok) throw new Error(`${init.method ?? "GET"} ${url.split("?")[0]} → ${r.status}: ${(await r.text()).slice(0, 600)}`);
  return (await r.json()) as T;
}

interface LedgerRow { at: string; kind: string; what: string; model: string; requests: number; textTokens: number; audioTokens: number; outTokens?: number; price: number; batch?: string; total: number; note?: string }
const ledgerRows = (): LedgerRow[] => (fs.existsSync(LEDGER) ? fs.readFileSync(LEDGER, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
/** Spent: the ledger's rows. Committed: batches sent and not fetched yet, at their estimate. */
function spend() {
  const spent = ledgerRows().reduce((a, r) => a + r.price, 0);
  const committed = readJson<Job[]>(JOBS, []).filter((j) => j.batch && !j.fetched && !j.failed).reduce((a, j) => a + (j.estimate ?? 0), 0);
  return { spent, committed };
}
function ledger(row: Omit<LedgerRow, "at" | "total">) {
  const { spent, committed } = spend();
  const full: LedgerRow = { at: new Date().toISOString(), ...row, price: +row.price.toFixed(6), total: +(spent + row.price + committed).toFixed(4) };
  fs.mkdirSync(WORK, { recursive: true });
  fs.appendFileSync(LEDGER, JSON.stringify(full) + "\n");
  return full;
}
/** No new request past the cap: what is spent, what running batches will cost, and this request's estimate. */
function capCheck(extra: number, what: string) {
  const { spent, committed } = spend();
  if (spent + committed + extra > CAP) {
    console.error(`stop: ${what} (about $${extra.toFixed(2)}) would pass the $${CAP} cap: spent $${spent.toFixed(2)}, running batches about $${committed.toFixed(2)}`);
    process.exit(2);
  }
}
const priceOf = (rate: { text: number; audio: number }, textTokens: number, audioTokens: number) => (textTokens * rate.text + audioTokens * rate.audio) / 1e6;

/** How the voice is named in a request (the English run found `voiceConfig.voice`; the other shape is kept as a fallback). */
const CONFIG = path.join(WORK, "config.json");
const voiceShape = (): "voice" | "prebuilt" => readJson<{ voiceShape?: "voice" | "prebuilt" }>(CONFIG, {}).voiceShape ?? "voice";
const request = (text: string, voice: string, style: string, shape = voiceShape()) => ({
  contents: [{ role: "user", parts: [{ text, speech_metadata: { style } }] }],
  generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: shape === "voice" ? { voice } : { prebuiltVoiceConfig: { voiceName: voice } } } },
});

// ---------------------------------------------------------------- the lines
/** Spelling for Gemini, which reads the text as a verbatim transcript: no angle brackets (sound tags), "&" said in
 *  Spanish, "#4" as "número 4", a peso sign before digits said as pesos (Mexico writes $85 for pesos; Gemini could say
 *  dollars), quotes and dashes it would pause on oddly. */
export function geminiTextEs(s: string): string {
  return s
    .replace(/[<>]/g, "").replace(/\s*&\s*/g, " y ").replace(/#(\d)/g, "número $1")
    .replace(/\$\s?(\d[\d,]*(?:\.\d+)?)/g, "$1 pesos")
    .replace(/[“”„«»]/g, "\"").replace(/…/g, "...").replace(/\s*—\s*/g, ", ").replace(/\s+/g, " ").trim();
}
/** Lines Gemini refuses or misreads as written, sent another way (the clip keeps the line's own key). */
const SAY_AS: Record<string, string> = {};

function newestSource(): number {
  let t = 0;
  const walk = (p: string) => { if (!fs.existsSync(p)) return; const s = fs.statSync(p); if (s.isDirectory()) for (const f of fs.readdirSync(p)) walk(path.join(p, f)); else t = Math.max(t, s.mtimeMs); };
  for (const p of ["src/content", "src/convo", "src/editions/es/content", "src/editions/es/convo", "src/audio-key.ts", "tools/enumerate.ts", "tools/sim-play.ts", "tools/es-voices/lines-es.ts", "tools/es-voices/runs-es.ts", "tools/es-voices/reach-es.ts"]) walk(path.join(ROOT, p));
  return t;
}
/** Every line the game can speak (lines-es.ts), cached in <work>/lines.json until the content changes (--fresh makes
 *  it again). The random conversations take a while, so `--workers=2` (the default; the machine is shared, so no
 *  more than two heavy processes) lists the conversations in parallel processes, niced. `--only=s73,s65b` lists only
 *  those conversations (with the global lines of their people), into <work>/lines-only.json, never the whole list:
 *  for trying a change quickly. */
async function utterances(): Promise<EsUtt[]> {
  const only = flag("only");
  const cache = path.join(WORK, only ? "lines-only.json" : "lines.json");
  // --cached: the list as it is, even if the content changed since (for a sample while the list is made again)
  if (!only && !has("fresh") && fs.existsSync(cache) && (has("cached") || fs.statSync(cache).mtimeMs > newestSource())) return readJson<EsUtt[]>(cache, []);
  const t0 = Date.now();
  const n = Math.max(1, Number(flag("workers") ?? 2));
  const dir = path.join(WORK, "lines-parts");
  fs.mkdirSync(dir, { recursive: true });
  const run = promisify(execFile);
  const env = { ...process.env, EDITION: "es" };
  console.log(`listing ${only ? `the lines of ${only}` : "every line"} in ${n} worker(s)…`);
  const results = await Promise.all(Array.from({ length: n }, (_, k) => run("nice", ["-n", "10", process.execPath, ...process.execArgv, process.argv[1], "lines-part", `--part=${k}/${n}`, `--out=${path.join(dir, `part${k}.json`)}`, `--fuzz=${flag("fuzz") ?? 120}`, ...(only ? [`--only=${only}`] : [])], { env, maxBuffer: 64 << 20, cwd: ROOT })
    .then(() => readJson<LinesResult>(path.join(dir, `part${k}.json`), { utts: [], errors: ["no output"], warnings: [], stats: {} }))));
  const errors = results.flatMap((r) => r.errors);
  const warnings = [...new Set(results.flatMap((r) => r.warnings ?? []))].sort();
  const utts = mergeUtts(results.map((r) => r.utts));
  const stats = Object.assign({}, ...results.map((r) => r.stats ?? {})) as LinesResult["stats"];
  const probed = Object.entries(stats).filter(([, s]) => s.probes);
  console.log(`${utts.length} lines in ${Math.round((Date.now() - t0) / 1000)} s; ${utts.filter((u) => u.why === "heard").length} of them heard in runs, sims or probes`);
  if (probed.length) console.log(`probes where another person holds the floor: ${probed.map(([id, s]) => `${id} ${s.probes}${s.misrouted ? ` (${s.misrouted} not counted)` : ""}`).join(", ")}`);
  if (warnings.length) { console.log(`${warnings.length} lines the list can't make from their text (only as heard):`); for (const w of warnings) console.log("  ~ " + w); }
  if (errors.length) { console.log(`${errors.length} handler errors while listing lines (fix them first):`); for (const e of errors.slice(0, 10)) console.log("  ! " + e); process.exit(1); }
  writeJson(cache, utts, true);
  writeJson(path.join(WORK, only ? "lines-only-notes.json" : "lines-notes.json"), { warnings, stats });
  return utts;
}
/** One worker's share of the lines (utterances() starts them). */
function linesPart() {
  const [k, n] = (flag("part") ?? "0/1").split("/").map(Number);
  const res = enumerateEs({ fuzzRuns: Number(flag("fuzz") ?? 120), part: [k, n], ...(flag("only") ? { only: flag("only")!.split(",") } : {}) });
  writeJson(flag("out")!, res, true);
}
async function allLines(styleOpts?: StyleOpts): Promise<Line[]> {
  const out: Line[] = [];
  const nobody = new Set<string>();
  for (const u of await utterances()) {
    if (!/[a-z0-9áéíóúüñ]/i.test(u.say)) continue; // nothing to say: the game plays nothing (src/game/audio.ts)
    const who = whoOf(u.voice);
    if (!who || !roleOf(who)) { nobody.add(u.voice); continue; }
    // the same voice and manner in both sets; only the accent direction differs
    const accent = accentOf(u.voice);
    const s = styleFor(who, u.sits, { ...styleOpts, accent: styleOpts?.accent === "none" ? "none" : accent });
    out.push({ key: audioKey(u.voice, u.speed, u.say), voice: u.voice, who, accent, speed: u.speed, say: u.say, shown: u.shown, text: geminiTextEs(SAY_AS[u.say] ?? u.say), gv: roleOf(who)!.voice, style: s.style, ...(s.fx ? { fx: s.fx } : {}), where: u.where, sits: u.sits, ...(u.neutral ? { neutral: true } : {}) });
  }
  if (nobody.size) { console.log(`no casting for: ${[...nobody].join(", ")}`); process.exit(1); }
  return out;
}

/** About how long a line takes: Spanish syllables at an everyday pace. */
const estimate = (l: { say: string }) => 0.45 + 0.16 * syllables(l.say) + 0.2 * pauses(l.say);
/** Audio tokens a line costs, before any sample: Maple Harbor's 33,684 clips came to 20.3 + 1.477 tokens a character
 *  (fitted on the English run's recorded.json), and the first two Spanish clips to 5–27% more than that; so the
 *  English fit + 15%. `project` replaces it with the sample's own fit. */
const audioTokens = (l: { say: string }) => 1.15 * (20.3 + 1.477 * l.say.length);
const estimatePrice = (lines: Line[], rate = PRICE.batch) => {
  const tokens = lines.reduce((a, l) => a + audioTokens(l), 0);
  // the request's text: the line and the style, about 4 characters a token
  const text = lines.reduce((a, l) => a + (l.text.length + l.style.length) / 4 + 12, 0);
  return { sec: tokens / PRICE.tokensPerSecond, price: priceOf(rate, text, tokens) };
};

// ---------------------------------------------------------------- plan
async function plan() {
  const problems = castingProblems();
  if (problems.length) { console.log("casting problems:\n  " + problems.join("\n  ")); process.exit(1); }
  const lines = await allLines();
  const per = new Map<string, { n: number; s: number }>();
  for (const l of lines) { const p = per.get(l.who) ?? { n: 0, s: 0 }; p.n++; p.s += estimate(l); per.set(l.who, p); }
  const { sec, price } = estimatePrice(lines);
  const mx = lines.filter((l) => l.accent === "mx"), nt = lines.filter((l) => l.accent === "neutral"), sp = lines.filter((l) => l.accent === "spain");
  const mxSay = new Set(mx.map((l) => l.who + "|" + l.say));
  console.log(`${lines.length} clips: ${mx.length} in Mexican Spanish, ${nt.length} in neutral Latin American Spanish (${nt.filter((l) => !mxSay.has(l.who + "|" + l.say)).length} of them a neutral twin's own text), ${sp.length} in Spain's Spanish (${sp.filter((l) => !mxSay.has(l.who + "|" + l.say)).length} of them a twin's own text); ${lines.filter((l) => l.fx === "phone").length} on the phone, ${lines.filter((l) => l.fx === "video").length} on video; about ${Math.round(sec / 60)} min of speech`);
  console.log(`price in batch: about $${price.toFixed(2)} for all three (Mexican $${estimatePrice(mx).price.toFixed(2)}, neutral $${estimatePrice(nt).price.toFixed(2)}, Spain $${estimatePrice(sp).price.toFixed(2)}; audio $${PRICE.batch.audio}/1M tokens until 31 Dec 2026)`);
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const done = lines.filter((l) => manifest[l.key]).length;
  if (done) console.log(`already recorded: ${done}`);
  console.log("\nclips per voice:");
  for (const [who, p] of [...per].sort((a, b) => b[1].n - a[1].n)) console.log(`  ${who.padEnd(12)} ${String(p.n).padStart(5)} clips  ${(p.s / 60).toFixed(1).padStart(5)} min  ${roleOf(who)?.voice}`);
  const odd = lines.filter((l) => /[()*[\]_{}<>|~^\\$#&%@]|\d/.test(l.say));
  if (odd.length) { console.log(`\n${odd.length} lines with digits or signs a voice might read its own way:`); for (const l of odd.slice(0, 25)) console.log(`  ${l.who}: ${l.say}${l.text !== l.say ? `   → ${l.text}` : ""}`); }
}

// ---------------------------------------------------------------- the sample, right away
/** The sample in both accents: lines picked in the Mexican set (pickFrom), each also in the neutral set: the same
 *  line, or its neutral twin (the same person's neutral-only line closest in words). */
function sampleOf(lines: Line[], per: number, only?: Set<string>, accents: Accent[] = ["mx", "neutral"]): Line[] {
  const mx = lines.filter((l) => l.accent === "mx");
  const base = pickFrom(mx, per, only);
  const mxSay = new Set(mx.map((l) => l.who + "|" + l.say));
  const words = (s: string) => new Set(strip(s).match(/[a-z]+/g) ?? []);
  const out = accents.includes("mx") ? [...base] : [];
  // each other accent: the same line, or its twin (the same person's own line in that set closest in words)
  for (const acc of accents.filter((a) => a !== "mx")) {
    const set = lines.filter((l) => l.accent === acc);
    const by = new Map(set.map((l) => [l.who + "|" + l.say, l]));
    for (const l of base) {
      let twin = by.get(l.who + "|" + l.say), best = 0;
      if (!twin) {
        const w = words(l.say);
        for (const n of set) if (n.who === l.who && !mxSay.has(n.who + "|" + n.say)) {
          const v = words(n.say), o = [...w].filter((x) => v.has(x)).length / Math.max(w.size, v.size);
          if (o > best) { best = o; twin = n; }
        }
        if (best < 0.4) twin = undefined;
      }
      if (twin && !out.includes(twin)) out.push(twin);
    }
  }
  return out;
}

/** A few lines per voice: short, middle and long ones the character says in their own conversation. The two coach
 *  voices say the same example answers, so they can be compared. */
function pickFrom(lines: Line[], per: number, only?: Set<string>): Line[] {
  const pick: Line[] = [];
  const byWho = new Map<string, Line[]>();
  for (const l of lines) { if (only && !only.has(l.who)) continue; if (!byWho.has(l.who)) byWho.set(l.who, []); byWho.get(l.who)!.push(l); }
  const qs = per === 1 ? [0.6] : per === 2 ? [0.3, 0.9] : [0.2, 0.6, 0.95, 0.4, 0.8].slice(0, per);
  // a line the character really says: met in a sim or a random conversation, or a line of theirs with nothing to fill
  // in (a line voiced with every item of every list can come out as one never said: "esa Mérida se queda aquí")
  const real = (l: Line) => {
    if (/:(sim|fuzz|probe)$/.test(l.where) || l.who.startsWith("coach_")) return true;
    const m = /^([^:]+):([a-z0-9_]+)\[(\d+)\]$/i.exec(l.where);
    const src = m ? SITUATION_BY_ID[m[1]]?.lines[m[2]]?.[Number(m[3])] : undefined;
    return !!src && !placeholders(src).entities.length && !placeholders(src).values.length;
  };
  const spread = (ls: Line[], n: number) => {
    const own = ls.filter((l) => !l.where.startsWith("global") && !l.where.includes(":soundcheck:") && !l.neutral && !l.spain && real(l) && l.say.length >= 20 && l.say.length <= 150);
    const pool = (own.length >= n ? own : ls).slice().sort((a, b) => a.say.length - b.say.length || a.say.localeCompare(b.say));
    return qs.slice(0, n).map((q) => pool[Math.min(pool.length - 1, Math.floor(q * pool.length))]).filter((l, i, a) => l && a.indexOf(l) === i);
  };
  for (const [who, ls] of byWho) if (!who.startsWith("coach_")) pick.push(...spread(ls, who.startsWith("amb_") ? Math.min(2, per) : per));
  const f = byWho.get("coach_f") ?? [], m = new Map((byWho.get("coach_m") ?? []).map((l) => [l.say, l]));
  for (const l of spread(f.filter((x) => m.has(x.say)), per)) pick.push(l, m.get(l.say)!);
  if (!f.length || !m.size) for (const c of ["coach_f", "coach_m"]) pick.push(...spread(byWho.get(c) ?? [], per));
  // and the words a voice could read its own way: numbers, a peso sign, English loanwords, Mexican words, very short lines
  if (!only) for (const re of RISKY) {
    const all = lines.filter((l) => re.test(l.say) && !pick.includes(l) && !l.who.startsWith("amb_")).sort((a, b) => a.say.length - b.say.length);
    const hit = all.some(real) ? all.filter(real) : all;
    if (hit.length) pick.push(hit[Math.floor(hit.length / 3)]);
  }
  return pick;
}
const RISKY = [/\d/, /\bwi-?fi\b/i, /\blatte\b/i, /\bNetWave\b/, /\bok(ay|ey)?\b/i, /güer/i, /\bahorita\b/i, /¿mande\?/i, /\bpásele\b/i, /\bándale\b/i,
  /\bchamba\b/i, /\bpadrísimo|\bqué padre\b/i, /\bcamión\b/i, /\bjitomate/i, /\bpilón\b/i, /^¿?¡?\p{L}+[.!?]$/u, /\bQuintana Roo|Tulum|Cancún\b/, /\bmarchant[ae]\b/i,
  /\bUSB|PIN|CURP|RFC|INE|SAT\b/, /\bemail|e-mail|correo\b/i];

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
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
/** One request, again after a pause when Google is busy (429, 500, 503). */
async function patiently<T>(fn: () => Promise<T>, tries = 6): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e: any) {
      if (i >= tries - 1 || !/→ (429|500|503|504)/.test(e.message)) throw e;
      await sleep(Math.min(60000, 4000 * 2 ** i) * (0.75 + Math.random() * 0.5));
    }
  }
}

/** One clip right away (the standard price), into `dir`: the clip as the game would play it, and its clean copies. */
async function speakNow(l: Line, dir: string, what: string): Promise<{ sec: number; textTokens: number; audioTokens: number; finish?: string } | { error: string }> {
  const ask = (shape: "voice" | "prebuilt") => api(`/v1beta/models/${MODEL}:generateContent`, { method: "POST", body: JSON.stringify(request(l.text, l.gv, l.style, shape)) });
  let r: any;
  try { r = await patiently(() => ask(voiceShape())); } catch (e: any) {
    if (!/→ 400/.test(e.message) || !/voice/i.test(e.message)) return { error: e.message };
    const other = voiceShape() === "voice" ? "prebuilt" : "voice";
    try { r = await patiently(() => ask(other)); writeJson(CONFIG, { ...readJson(CONFIG, {}), voiceShape: other }); console.log(`\nthe API wants the voice named the other way (${other}); kept`); }
    catch (e2: any) { return { error: e2.message }; }
  }
  const textTokens = r.usageMetadata?.promptTokenCount ?? 0, audioTokens = r.usageMetadata?.candidatesTokenCount ?? 0;
  ledger({ kind: "sample", what: `${what} ${l.who} ${l.key}`, model: MODEL, requests: 1, textTokens, audioTokens, price: priceOf(PRICE.standard, textTokens, audioTokens) });
  const cand = r.candidates?.[0];
  const parts = (cand?.content?.parts ?? []).filter((p: any) => p.inlineData?.data);
  if (!parts.length) return { error: `no audio (${cand?.finishReason ?? r.promptFeedback?.blockReason ?? "no answer"})` };
  const pcm = joinParts(parts);
  const clip = trimAndNormalize(pcm.samples, pcm.rate);
  const base = path.join(dir, `${l.who}-${l.key}`);
  await encodeClip(clip, pcm.rate, base + ".mp3", base + ".wav", l.fx);
  await writeWav24(base + ".raw.wav", pcm.samples, pcm.rate);
  return { sec: +(clip.length / pcm.rate).toFixed(2), textTokens, audioTokens, finish: cand?.finishReason };
}

function joinParts(parts: any[]): { samples: Float32Array; rate: number } {
  const chunks = parts.map((p: any) => decodeAudio(Buffer.from(p.inlineData.data, "base64"), p.inlineData.mimeType));
  const all = new Float32Array(chunks.reduce((a: number, c: { samples: Float32Array }) => a + c.samples.length, 0));
  let at = 0;
  for (const c of chunks) { all.set(c.samples, at); at += c.samples.length; }
  return { samples: all, rate: chunks[0].rate };
}

async function sample() {
  const problems = castingProblems();
  if (problems.length) { console.log("casting problems:\n  " + problems.join("\n  ")); process.exit(1); }
  const per = Number(flag("per") ?? 3);
  const only = flag("who") ? new Set(flag("who")!.split(",")) : undefined;
  const styleOpts: StyleOpts = { age: has("age"), ...(has("no-accent") ? { accent: "none" as const } : {}) };
  const accents: Accent[] = flag("accent") ? [flag("accent") as Accent] : ["mx", "neutral"];
  const round = flag("round") ?? `r${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "")}`;
  const lines = sampleOf(await allLines(styleOpts), per, only, accents);
  const dir = path.join(WORK, "samples", round);
  fs.mkdirSync(dir, { recursive: true });
  const est = estimatePrice(lines, PRICE.standard).price;
  console.log(`sample ${round}: ${lines.length} clips (${lines.filter((l) => l.accent === "mx").length} Mexican, ${lines.filter((l) => l.accent === "neutral").length} neutral), about $${est.toFixed(2)} at the standard price${styleOpts.age ? ", age in the style" : ""}${styleOpts.accent === "none" ? ", no accent in the style" : ""}`);
  // --dry: only the lines it would ask for (<round>/plan.json), no request
  writeJson(path.join(dir, "plan.json"), lines.map((l) => ({ who: l.who, accent: l.accent, gv: l.gv, say: l.say, style: l.style, fx: l.fx, key: l.key })));
  if (has("dry")) { console.log(`the lines are in ${path.join(dir, "plan.json")} (nothing asked for)`); return; }
  capCheck(est, `sample ${round}: ${lines.length} clips`);
  const index: Record<string, unknown>[] = readJson(path.join(dir, "index.json"), []);
  const have = new Set(index.map((x) => x.key as string));
  let n = 0;
  await pool(lines.filter((l) => !have.has(l.key)), Number(flag("parallel") ?? 4), async (l) => {
    const res = await speakNow(l, dir, `sample ${round}`);
    index.push({ key: l.key, voice: l.voice, who: l.who, accent: l.accent, gv: l.gv, style: l.style, fx: l.fx, say: l.say, shown: l.shown, text: l.text, where: l.where, sits: l.sits, ...res });
    if (++n % 10 === 0) { writeJson(path.join(dir, "index.json"), index); process.stdout.write(`\r  ${n}/${lines.length}`); }
  });
  writeJson(path.join(dir, "index.json"), index);
  const bad = index.filter((x) => x.error);
  const { spent } = spend();
  console.log(`\n${index.length - bad.length} clips in ${dir}${bad.length ? `, ${bad.length} without audio:\n  ` + bad.map((x) => `${x.who}: ${x.error}`).join("\n  ") : ""}`);
  console.log(`spent so far: $${spent.toFixed(3)}`);
}

// ---------------------------------------------------------------- the clip
/** A biquad filter (the RBJ cookbook): low or high pass at f0. */
function biquad(x: Float32Array, sr: number, type: "hp" | "lp", f0: number, q: number): Float32Array {
  const w0 = (2 * Math.PI * f0) / sr, cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * q);
  const b0 = type === "lp" ? (1 - cos) / 2 : (1 + cos) / 2, b1 = type === "lp" ? 1 - cos : -(1 + cos), b2 = b0;
  const a0 = 1 + alpha, a1 = -2 * cos, a2 = 1 - alpha;
  const y = new Float32Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = (b0 * x[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x[i]; y2 = y1; y1 = v; y[i] = v;
  }
  return y;
}
/** The sound of the setting: a phone line (300–3400 Hz, steep, as narrowband telephony) or a video call (a laptop's
 *  microphone and a voice codec: 120–7000 Hz, gentle), then as loud as every other clip. */
export function withFx(x: Float32Array, sr: number, fx?: "phone" | "video"): Float32Array {
  if (!fx) return x;
  let y = x;
  if (fx === "phone") for (const q of [0.5412, 1.3066]) { y = biquad(y, sr, "hp", 300, q); y = biquad(y, sr, "lp", 3400, q); }
  else { y = biquad(y, sr, "hp", 120, 0.7071); y = biquad(y, sr, "lp", 7000, 0.7071); }
  let peak = 0, sum = 0;
  for (const v of y) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const rms = Math.sqrt(sum / Math.max(1, y.length));
  const scale = Math.min(Math.pow(10, -19 / 20) / Math.max(rms, 1e-6), 0.89 / Math.max(peak, 1e-6));
  for (let i = 0; i < y.length; i++) y[i] *= scale;
  return y;
}

/** One clip in two files: the MP3 the game plays (CBR 40 kbps, mono, 24 kHz, with the setting's sound) and a clean
 *  16 kHz WAV for Whisper. */
function encodeClip(clean: Float32Array, sr: number, mp3: string, wav16: string, fx?: "phone" | "video", kbps = 40): Promise<void> {
  const played = withFx(clean, sr, fx);
  const run = (samples: Float32Array, outArgs: string[]) => new Promise<void>((resolve, reject) => {
    const ff = spawn("nice", ["-n", "10", "ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", String(sr), "-ac", "1", "-i", "pipe:0", ...outArgs]);
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code))));
    ff.stdin.write(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    ff.stdin.end();
  });
  return Promise.all([
    run(played, ["-b:a", `${kbps}k`, "-ar", "24000", "-ac", "1", "-f", "mp3", mp3]),
    run(clean, ["-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", "-f", "wav", wav16]),
  ]).then(() => undefined);
}
/** The take as Gemini sent it (24 kHz), for samples: so a direction or a sound can be tried again without paying. */
function writeWav24(file: string, samples: Float32Array, sr: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("nice", ["-n", "10", "ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", String(sr), "-ac", "1", "-i", "pipe:0", "-c:a", "pcm_s16le", file]);
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code))));
    ff.stdin.write(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    ff.stdin.end();
  });
}

// ---------------------------------------------------------------- prepare
function jobsList(): Job[] { return readJson<Job[]>(JOBS, []); }
function linesFile(requestFile: string) { return requestFile.replace(/\.jsonl$/, ".lines.json"); }
const same = (r: Recorded | undefined, l: Line) => !!r && r.gv === l.gv && r.style === l.style && r.text === l.text && (r.fx ?? "") === (l.fx ?? "");

async function prepare() {
  const problems = castingProblems();
  if (problems.length) { console.log("casting problems:\n  " + problems.join("\n  ")); process.exit(1); }
  const size = Number(flag("size") ?? 3000);
  // --accent=mx: only the Mexican set (the default), --accent=neutral: only the neutral one
  const lines = (await allLines()).filter((l) => !flag("accent") || l.accent === flag("accent"));
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const jobs = jobsList();
  const reqDir = path.join(WORK, "requests");
  fs.mkdirSync(reqDir, { recursive: true });
  // request files of this kind never sent are made again (another kind's stay: the neutral set's files wait while the
  // Mexican set's are remade); lines in batches still running, or waiting in another kind's file, are not asked twice
  const kind = flag("kind") ?? "lines";
  const sent = new Set(jobs.map((j) => j.file));
  const unsent = (f: string) => !sent.has(path.join("requests", f.replace(/\.lines\.json$/, ".jsonl")));
  for (const f of fs.readdirSync(reqDir)) if (unsent(f) && new RegExp(`^\\d+-${kind}(-[ab])*\\.(jsonl|lines\\.json)$`).test(f)) fs.rmSync(path.join(reqDir, f));
  const waiting = new Set<string>();
  for (const j of jobs) if (!j.fetched && !j.failed) for (const l of readJson<Line[]>(path.join(WORK, linesFile(j.file)), [])) waiting.add(l.key);
  for (const f of fs.readdirSync(reqDir)) if (f.endsWith(".lines.json") && unsent(f)) for (const l of readJson<Line[]>(path.join(reqDir, f), [])) waiting.add(l.key);
  const tired: Line[] = [];
  const need = lines.filter((l) => {
    if (waiting.has(l.key)) return false;
    const r = recorded[l.key];
    if (manifest[l.key] && fs.existsSync(mp3Of(l.key)) && same(r, l)) return false;
    if (same(r, l) && r!.tries >= MAX_TRIES) { tired.push(l); return false; }
    return true;
  });
  if (tired.length) console.log(`${tired.length} lines failed ${MAX_TRIES} times and are left for a person to look at (${RECORDED})`);
  if (!need.length) { console.log("nothing to record"); return; }
  let n = Math.max(0, ...fs.readdirSync(reqDir).map((f) => Number(f.split("-")[0]) || 0), ...jobs.map((j) => Number(path.basename(j.file).split("-")[0]) || 0));
  for (let i = 0; i < need.length; i += size) {
    const part = need.slice(i, i + size);
    const name = `${String(++n).padStart(3, "0")}-${kind}`;
    fs.writeFileSync(path.join(reqDir, name + ".jsonl"), part.map((l) => JSON.stringify({ key: l.key, request: request(l.text, l.gv, l.style) })).join("\n") + "\n");
    writeJson(path.join(reqDir, name + ".lines.json"), part, true);
  }
  const { sec, price } = estimatePrice(need);
  console.log(`${need.length} lines in ${Math.ceil(need.length / size)} request file(s) in ${reqDir}, about ${Math.round(sec / 60)} min, about $${price.toFixed(2)} in batch`);
}

// ---------------------------------------------------------------- send, status
async function send() {
  const jobs = jobsList();
  const reqDir = path.join(WORK, "requests");
  // --kind=mx: only that kind's files (the neutral set's wait for the owner's OK when both don't fit)
  const files = fs.existsSync(reqDir) ? fs.readdirSync(reqDir).filter((f) => f.endsWith(".jsonl") && (!flag("kind") || new RegExp(`^\\d+-${flag("kind")}(-[ab])*\\.jsonl$`).test(f))).sort() : [];
  const todo = files.map((f) => path.join("requests", f)).filter((f) => !jobs.some((j) => j.file === f));
  if (!todo.length) { console.log("nothing prepared to send (prepare)"); return; }
  KEY ||= apiKey();
  const queue = [...todo];
  while (queue.length) {
    const file = queue.shift()!;
    try { await sendOne(file, jobs); } catch (e: any) {
      if (!/→ 429/.test(e.message) || !/concurrent|enqueued|quota/i.test(e.message)) throw e;
      const running = jobs.some((j) => !j.fetched && !j.failed && /PENDING|RUNNING|QUEUED/.test(j.state ?? ""));
      const lines = readJson<Line[]>(path.join(WORK, linesFile(file)), []);
      if (running || lines.length < 200) { console.log(`no room for ${path.basename(file)} while other batches run: it waits (${queue.length + 1} files to send)`); return; }
      queue.unshift(...splitRequestFile(file));
      console.log(`${path.basename(file)} is too big to run alone: split in two`);
    }
  }
}

function splitRequestFile(file: string): string[] {
  const rows = fs.readFileSync(path.join(WORK, file), "utf8").split("\n").filter(Boolean);
  const lines = readJson<Line[]>(path.join(WORK, linesFile(file)), []);
  const half = Math.ceil(rows.length / 2);
  const out: string[] = [];
  for (const [suffix, from, to] of [["a", 0, half], ["b", half, rows.length]] as const) {
    const f = file.replace(/\.jsonl$/, `-${suffix}.jsonl`);
    const keys = new Set(rows.slice(from, to).map((r) => JSON.parse(r).key));
    fs.writeFileSync(path.join(WORK, f), rows.slice(from, to).join("\n") + "\n");
    writeJson(path.join(WORK, linesFile(f)), lines.filter((l) => keys.has(l.key)), true);
    out.push(f);
  }
  fs.rmSync(path.join(WORK, file));
  fs.rmSync(path.join(WORK, linesFile(file)));
  return out;
}

async function sendOne(file: string, jobs: Job[]) {
  const lines = readJson<Line[]>(path.join(WORK, linesFile(file)), []);
  const est = estimatePrice(lines).price;
  capCheck(est, `batch ${path.basename(file)} (${lines.length} lines)`);
  const bytes = fs.readFileSync(path.join(WORK, file));
  const name = `puerto-colibri-${path.basename(file, ".jsonl")}`;
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
  const job: Job = { file, count: lines.length, estimate: +est.toFixed(4), uploaded, created: new Date().toISOString() };
  const b = await api(`/v1beta/models/${MODEL}:batchGenerateContent`, { method: "POST", body: JSON.stringify({ batch: { display_name: name, input_config: { file_name: uploaded } } }) });
  job.batch = b.name;
  job.state = b.metadata?.state ?? b.state ?? "JOB_STATE_PENDING";
  jobs.push(job);
  writeJson(JOBS, jobs); // at once: starting a batch twice would record (and pay for) it twice
  const { spent, committed } = spend();
  console.log(`${file}: ${job.count} lines → ${job.batch} (${job.state}), about $${est.toFixed(2)}; spent $${spent.toFixed(2)}, running about $${committed.toFixed(2)}`);
}

async function status(quiet = false): Promise<Job[]> {
  const jobs = jobsList();
  for (const j of jobs) {
    if (j.fetched || j.failed || !j.batch) continue;
    const b = await patiently(() => api(`/v1beta/${j.batch}`));
    const md = b.metadata ?? {};
    j.state = md.state ?? b.state ?? j.state;
    j.stats = md.batchStats ?? b.batchStats ?? j.stats;
    j.results = b.response?.responsesFile ?? md.output?.responsesFile ?? b.output?.responsesFile ?? b.dest?.fileName ?? md.dest?.fileName ?? j.results;
    if (/FAILED|CANCELLED|EXPIRED/.test(j.state ?? "")) { j.failed = true; ledger({ kind: "batch-failed", what: path.basename(j.file), model: MODEL, requests: j.count, textTokens: 0, audioTokens: 0, price: 0, batch: j.batch, note: j.state }); }
  }
  writeJson(JOBS, jobs);
  if (!quiet) {
    for (const j of jobs) console.log(`${path.basename(j.file)}  ${j.batch ?? "not sent"}  ${j.fetched ? "fetched" : j.state}  ${j.stats ? JSON.stringify(j.stats) : ""}`);
    const reqDir = path.join(WORK, "requests");
    const unsent = (fs.existsSync(reqDir) ? fs.readdirSync(reqDir) : []).filter((f) => f.endsWith(".jsonl") && !jobs.some((j) => j.file === path.join("requests", f))).length;
    const running = jobs.filter((j) => !j.fetched && !j.failed && /PENDING|RUNNING|QUEUED/.test(j.state ?? "")).length;
    const toFetch = jobs.filter((j) => !j.fetched && /SUCCEEDED$/.test(j.state ?? "")).length;
    console.log(`left: ${unsent} files to send, ${running} batches running, ${toFetch} to fetch, ${jobs.filter((j) => j.failed).length} failed`);
  }
  return jobs;
}

// ---------------------------------------------------------------- fetch
/** Makes clips from one results file. Returns [made, problems, text tokens, audio tokens]. */
async function makeClips(resultsFile: string, lines: Line[]): Promise<[number, number, number, number]> {
  const byKey = new Map(lines.map((l) => [l.key, l]));
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  fs.mkdirSync(CLIPS, { recursive: true });
  fs.mkdirSync(WAV, { recursive: true });
  let made = 0, bad = 0, n = 0, textTokens = 0, audioTokens = 0;
  const save = () => { writeJson(MANIFEST, manifest, true); writeJson(RECORDED, recorded); };
  const rows = readline.createInterface({ input: fs.createReadStream(resultsFile, { highWaterMark: 1 << 20 }), crlfDelay: Infinity });
  await pool(rows, 2, async (row) => { // two at a time: the machine is shared
    if (!row.trim()) return;
    const o = JSON.parse(row);
    const l = byKey.get(o.key);
    if (!l) return;
    textTokens += o.response?.usageMetadata?.promptTokenCount ?? 0;
    audioTokens += o.response?.usageMetadata?.candidatesTokenCount ?? 0;
    const prev = recorded[l.key];
    const tries = (same(prev, l) ? prev.tries : 0) + 1;
    const fail = (why: string) => { bad++; recorded[l.key] = { gv: l.gv, style: l.style, text: l.text, ...(l.fx ? { fx: l.fx } : {}), tries, ok: false, why }; };
    try {
      const cand = o.response?.candidates?.[0];
      const parts = (cand?.content?.parts ?? []).filter((p: any) => p.inlineData?.data);
      if (!parts.length) return fail(o.error?.message ?? o.status?.message ?? `no audio (${cand?.finishReason ?? o.response?.promptFeedback?.blockReason ?? "no answer"})`);
      const pcm = joinParts(parts);
      const clip = trimAndNormalize(pcm.samples, pcm.rate);
      const sec = +(clip.length / pcm.rate).toFixed(2);
      if (sec < 0.25) return fail("silent");
      const tmp = mp3Of(l.key) + `.${process.pid}.tmp`;
      await encodeClip(clip, pcm.rate, tmp, wavOf(l.key), l.fx);
      fs.renameSync(tmp, mp3Of(l.key));
      manifest[l.key] = sec;
      recorded[l.key] = { gv: l.gv, style: l.style, text: l.text, ...(l.fx ? { fx: l.fx } : {}), tries, ok: true, sec, tokens: o.response?.usageMetadata?.candidatesTokenCount, textTokens: o.response?.usageMetadata?.promptTokenCount };
      made++;
    } catch (e: any) { fail(e.message); }
    if (++n % 200 === 0) { save(); process.stdout.write(`\r  ${n} clips`); }
  });
  save();
  process.stdout.write("\n");
  return [made, bad, textTokens, audioTokens];
}

async function fetchAll() {
  const jobs = await status(true);
  let any = false;
  for (const j of jobs) {
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
    console.log(`${path.basename(j.file)}: making clips from ${path.relative(WORK, local)} (${(fs.statSync(local).size / 1048576).toFixed(0)} MB)`);
    const [made, bad, textTokens, audioTokens] = await makeClips(local, readJson<Line[]>(path.join(WORK, linesFile(j.file)), []));
    const row = ledger({ kind: /redo/.test(j.file) ? "redo-batch" : "batch", what: path.basename(j.file), model: MODEL, requests: j.count, textTokens, audioTokens, price: priceOf(PRICE.batch, textTokens, audioTokens), batch: j.batch, note: `estimate was $${j.estimate}` });
    j.fetched = true;
    writeJson(JOBS, jobs);
    console.log(`  ${made} clips made, ${bad} without a usable clip (they go into the next prepare); $${row.price.toFixed(3)}, total $${row.total.toFixed(3)}`);
  }
  if (!any) console.log("no finished batch to fetch yet (status)");
}

// ---------------------------------------------------------------- comparing what was said with what Whisper heard
const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const ES_SMALL: Record<string, number> = { cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiun: 21, veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29 };
const ES_TENS: Record<string, number> = { treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90 };
const ES_HUNDREDS: Record<string, number> = { cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400, cuatrocientas: 400,
  quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600, setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900 };
const ES_BIG: Record<string, number> = { mil: 1000, millon: 1e6, millones: 1e6 };
/** Spanish numbers in words become digits, the way Whisper writes them: "ochenta y cinco" → 85, "dos mil trescientos"
 *  → 2300; numbers said in pieces run together ("noventa y ocho, cuarenta y cinco" → 9845). */
export function numbersToDigitsEs(s: string): string {
  const words = strip(s).split(/\s+/);
  const bare = (w: string) => w.replace(/[^a-z]/g, "");
  const isNum = (w: string) => w in ES_SMALL || w in ES_TENS || w in ES_HUNDREDS || w in ES_BIG;
  const out: string[] = [];
  for (let i = 0; i < words.length;) {
    if (!isNum(bare(words[i]))) { out.push(words[i]); i++; continue; }
    const groups: string[] = [];
    let total = 0, cur = 0, last = "", end = "";
    const flush = () => { groups.push(String(total + cur)); total = 0; cur = 0; last = ""; };
    while (i < words.length) {
      const w = bare(words[i]);
      if (w === "y" && last === "tens" && i + 1 < words.length && bare(words[i + 1]) in ES_SMALL && ES_SMALL[bare(words[i + 1])] < 10) { i++; continue; }
      if (!isNum(w)) break;
      if (w in ES_BIG) { cur = (cur || 1) * ES_BIG[w]; total += cur; cur = 0; last = "big"; }
      else if (w in ES_HUNDREDS) { if (last === "unit" || last === "tens" || last === "teen" || last === "hundred") flush(); cur += ES_HUNDREDS[w]; last = "hundred"; }
      else if (w in ES_TENS) { if (last === "unit" || last === "tens" || last === "teen") flush(); cur += ES_TENS[w]; last = "tens"; }
      else { const v = ES_SMALL[w]; if (last === "unit" || last === "teen" || (last === "tens" && v >= 10)) flush(); cur += v; last = v >= 10 ? "teen" : "unit"; }
      i++;
      // a number ends at a stop, a comma or a question mark (kept, so sentences still end there)
      const m = /[.,;:!?]+$/.exec(words[i - 1]);
      if (m) { end = m[0]; break; }
    }
    if (last || cur || total) flush();
    out.push(groups.join("") + end);
  }
  return out.join(" ");
}
/** What a voice says and Whisper writes differently: a time ("las 8 y media" / "8:30"), money ("85 pesos con 50
 *  centavos" / "$85.50"), percent, a laugh or an "ay" it leaves out, okay. */
const spokenEs = (s: string) => numbersToDigitsEs(strip(s).replace(/&/g, " y ").replace(/%/g, " por ciento "))
  .replace(/(\d+) y media\b/g, "$1 30").replace(/(\d+) y cuarto\b/g, "$1 15")
  .replace(/\b(pesos?|centavos?|dolares?|mxn|por ciento)\b/g, " ")
  .replace(/(\d)\s+con\s+(\d)/g, "$1 $2")
  .replace(/\b(ay|ah|eh|oh|uy|mmm?|ja|jaja|jajaja|je|ejem|um)\b/g, " ")
  .replace(/\b(okay|okey|oka|ok)\b/g, "ok");
const letters = (s: string) => spokenEs(s).replace(/[^a-z0-9]/g, "").replace(/([a-z])\1{2,}/g, "$1$1");
const onceEach = (s: string) => s.split(/(?<=[.!?])\s+/).filter((x, i, all) => i === 0 || letters(x) !== letters(all[i - 1])).join(" ");
function alike(a: string, b: string): number {
  if (!a || !b) return a === b ? 1 : 0;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}
/** How alike the line and what Whisper heard are, 0…1, letter by letter (accents, punctuation, spaces and how a number
 *  is written don't count). Both the spoken form and the shown form are tried. */
export function likenessEs(said: string, heard: string, shown?: string): number {
  const one = (s: string) => Math.max(alike(letters(s), letters(heard)), alike(letters(onceEach(s)), letters(onceEach(heard))));
  return Math.max(one(said), shown && shown !== said ? one(shown) : 0);
}
/** Syllables, roughly: vowel groups per word (a hiatus counts once), digits one each. */
export function syllables(s: string): number {
  let n = 0;
  for (const w of strip(s).split(/[\s-]+/)) n += (w.match(/\d/g)?.length ?? 0) + (/[a-z]/.test(w) ? Math.max(1, (w.match(/[aeiou]+/g) ?? []).length) : 0);
  return n;
}
const CLIP_BASE = 0.45, PAUSE = 0.2;
const pauses = (s: string) => (s.trim().replace(/[\s.!?…"”’)]+$/, "").match(/[,;:.!?…—]+/g) ?? []).length;
const heardMore = (said: string, heard: string) => letters(heard).length >= 1.25 * letters(said).length && letters(said).length > 0;
/** The clip says more than the line (Gemini sometimes says a line twice, or a piece of it again): Whisper heard more,
 *  and the clip's length fits what Whisper heard better than the line. `pace`: the voice's seconds per syllable. */
export function saysMore(said: string, heard: string, sec: number, pace: number): boolean {
  if (!heardMore(said, heard)) return false;
  const speech = pace * syllables(said);
  const once = CLIP_BASE + PAUSE * pauses(said) + speech;
  const more = CLIP_BASE + PAUSE * pauses(heard) + (speech * letters(heard).length) / letters(said).length;
  return Math.abs(Math.log(sec / more)) < Math.abs(Math.log(sec / once));
}
/** The length screen: far too long for the line (said twice, a long silence) or far too short (cut off). */
const expected = (said: string, pace: number) => CLIP_BASE + PAUSE * pauses(said) + pace * syllables(said);
export const tooLong = (said: string, heard: string | undefined, sec: number, pace: number) =>
  (heard !== undefined && saysMore(said, heard, sec, pace)) || sec > 2.2 * expected(said, pace) + 0.5;
export const tooShort = (said: string, sec: number, pace: number) => syllables(said) >= 6 && sec < 0.5 * expected(said, pace);
/** Each voice's usual pace: seconds per syllable beyond CLIP_BASE, the median of its clips of 4 syllables or more. */
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

/** Whisper (Spanish), serially and niced: each file's transcript. `full`: the 30-second window (else 10 s). */
async function whisper(files: string[], full: boolean, onPart?: (done: number) => void): Promise<Map<string, string>> {
  if (!fs.existsSync(WHISPER_MODEL)) { console.error(`no Whisper model at ${WHISPER_MODEL} (set WHISPER_MODEL)`); process.exit(1); }
  const run = promisify(execFile);
  const heard = new Map<string, string>();
  for (let i = 0; i < files.length; i += 200) {
    const part = files.slice(i, i + 200);
    await run("nice", ["-n", "10", "whisper-cli", "-m", WHISPER_MODEL, "-l", "es", "-nt", "-np", "-otxt", "-t", "8", ...(full ? [] : ["-ac", "512"]), ...part], { maxBuffer: 64 << 20 });
    for (const f of part) {
      const txt = f + ".txt";
      heard.set(f, fs.existsSync(txt) ? fs.readFileSync(txt, "utf8").replace(/\s+/g, " ").trim() : "");
      fs.rmSync(txt, { force: true });
    }
    onPart?.(Math.min(files.length, i + 200));
  }
  return heard;
}

// ---------------------------------------------------------------- the sample's checks, the listener, the page
async function checkSamples() {
  const round = args[1];
  const dir = path.join(WORK, "samples", round ?? "");
  if (!round || !fs.existsSync(path.join(dir, "index.json"))) { console.error("usage: check-samples <round>"); process.exit(1); }
  const index: any[] = readJson(path.join(dir, "index.json"), []);
  const ok = index.filter((x) => !x.error && fs.existsSync(path.join(dir, `${x.who}-${x.key}.wav`)));
  const heard = await whisper(ok.map((x) => path.join(dir, `${x.who}-${x.key}.wav`)), true);
  const said = new Map(ok.map((x) => [x.key, x.say])), whose = new Map(ok.map((x) => [x.key, x.who]));
  const secs = Object.fromEntries(ok.map((x) => [x.key, x.sec]));
  const pace = paces(ok.map((x) => x.key), secs, said, whose);
  const all = [...pace.values()].sort((a, b) => a - b);
  const median = all[Math.floor(all.length / 2)] ?? 0.13;
  for (const x of ok) {
    x.heard = heard.get(path.join(dir, `${x.who}-${x.key}.wav`)) ?? "";
    x.score = +likenessEs(x.say, x.heard, x.shown).toFixed(3);
    const p = median; // a sample has too few clips per voice for its own pace
    x.long = tooLong(x.say, x.heard, x.sec, p);
    x.short = tooShort(x.say, x.sec, p);
  }
  writeJson(path.join(dir, "index.json"), index);
  const flagged = ok.filter((x) => x.score < 0.85 || x.long || x.short);
  console.log(`${ok.length} clips heard; median pace ${median.toFixed(3)} s a syllable; ${flagged.length} flagged:`);
  for (const x of flagged) console.log(`  ${x.score.toFixed(2)}${x.long ? " LONG" : ""}${x.short ? " SHORT" : ""} ${x.who} ${x.key} ${x.sec}s\n     said:  ${x.say}\n     heard: ${x.heard}`);
}

/** A Gemini listener for the sample, not told which accent was asked for: which accent it hears (Mexican, neutral Latin
 *  American, Spain, other), whether the speaker sounds native, the age, the pace, the words. A second pair of ears
 *  where nobody here can listen, and the check that a "Mexican" clip doesn't come out neutral or the reverse; cents. */
async function judge() {
  const round = args[1];
  const dir = path.join(WORK, "samples", round ?? "");
  if (!round || !fs.existsSync(path.join(dir, "index.json"))) { console.error("usage: judge <round>"); process.exit(1); }
  const index: any[] = readJson(path.join(dir, "index.json"), []);
  const todo = index.filter((x) => !x.error && !x.judge && fs.existsSync(path.join(dir, `${x.who}-${x.key}.mp3`)));
  capCheck(todo.length * 0.0012, `listening to ${todo.length} sample clips`);
  const prompt = (x: any) => `You are an expert in Spanish dialects and a voice director. Listen to this short voice clip from a language-learning game. The speaker should say exactly: "${x.say}"
Judge only what you hear. Answer in JSON with these keys:
"language": the language you hear (e.g. "Spanish", "English", "mixed");
"accent": the accent of the Spanish, one of "mexican" (clearly Mexican: Mexican intonation and melody, Mexican vowel and consonant habits), "neutral_latin_american" (standard Latin American Spanish with no clear regional features, as in dubbing or international news), "spain" (Peninsular: distinción, apical s, Castilian intonation), "other" (another region, e.g. Caribbean, Rioplatense, Andean, Chilean, or unclear);
"accent_strength": 1 to 5 (1 = barely any regional color, 5 = strongly regional);
"accent_notes": one short sentence on what you hear (seseo or distinción, intonation, vowels, s, any non-native sounds);
"sounds_native": true if a native Spanish speaker, false if you hear a foreign (e.g. English) accent;
"age": the speaker's apparent age range, e.g. "20-30";
"gender": "female" or "male";
"pace": "slow", "normal" or "fast";
"words_match": true if the words are exactly the expected ones (ignoring punctuation), else false;
"differences": the words that differ, are repeated, missing or added, or "" if none;
"naturalness": 1 to 5 (5 = a natural native speaker);
"issues": anything else wrong (cut off, odd pause, robotic, odd emphasis, sounds like a phone line), or "".`;
  let n = 0;
  await pool(todo, 4, async (x) => {
    const audio = fs.readFileSync(path.join(dir, `${x.who}-${x.key}.mp3`)).toString("base64");
    const body = { contents: [{ role: "user", parts: [{ inlineData: { mimeType: "audio/mpeg", data: audio } }, { text: prompt(x) }] }], generationConfig: { responseMimeType: "application/json", temperature: 0 } };
    try {
      const r: any = await patiently(() => api(`/v1beta/models/${JUDGE_MODEL}:generateContent`, { method: "POST", body: JSON.stringify(body) }));
      const u = r.usageMetadata ?? {};
      const inTok = u.promptTokenCount ?? 0, outTok = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
      ledger({ kind: "listener", what: `judge ${round} ${x.who} ${x.key}`, model: JUDGE_MODEL, requests: 1, textTokens: inTok, audioTokens: 0, outTokens: outTok, price: (inTok * PRICE.judge.input + outTok * PRICE.judge.output) / 1e6 });
      const txt = (r.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? "").join("");
      try { x.judge = JSON.parse(txt.replace(/^```(json)?|```$/g, "").trim()); } catch { x.judge = { raw: txt.slice(0, 400) }; }
    } catch (e: any) { x.judgeError = e.message.slice(0, 300); }
    if (++n % 10 === 0) { writeJson(path.join(dir, "index.json"), index); process.stdout.write(`\r  ${n}/${todo.length}`); }
  });
  writeJson(path.join(dir, "index.json"), index);
  judgeSummary(index);
  console.log(`spent so far: $${spend().spent.toFixed(3)}`);
}
/** What the listener heard, by the accent asked for: the accents, native or not, the words, and each clip that
 *  came out another accent than asked (Mexican heard as anything but Mexican; neutral heard as Mexican or Spain). */
function judgeSummary(index: any[]) {
  const judged = index.filter((x) => x.judge && !x.judge.raw);
  for (const acc of ["mx", "neutral", "spain"]) {
    const xs = judged.filter((x) => (x.accent ?? "mx") === acc);
    if (!xs.length) continue;
    const count = (f: (j: any) => string) => Object.entries(xs.reduce((a: Record<string, number>, x) => { const k = f(x.judge); a[k] = (a[k] ?? 0) + 1; return a; }, {})).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ");
    const strength = xs.reduce((a, x) => a + (Number(x.judge.accent_strength) || 0), 0) / xs.length;
    console.log(`\n${acc === "mx" ? "Mexican" : acc === "spain" ? "Spain's" : "neutral"} set, ${xs.length} clips: heard ${count((j) => j.accent)}; regional strength ${strength.toFixed(1)}; native ${count((j) => String(j.sounds_native))}; words match ${count((j) => String(j.words_match))}`);
  }
  const off = judged.filter((x) => ((x.accent ?? "mx") === "mx" ? x.judge.accent !== "mexican" : x.accent === "spain" ? x.judge.accent !== "spain" : x.judge.accent === "mexican" || x.judge.accent === "spain") || x.judge.sounds_native === false || !x.judge.words_match || x.judge.naturalness < 4 || x.judge.issues);
  for (const x of off) console.log(`  [${x.accent ?? "mx"}] ${x.who} (${x.gv}) ${x.key}: heard ${x.judge.accent} ${x.judge.accent_strength}, ${x.judge.sounds_native ? "native" : "NOT NATIVE"}, ${x.judge.age}, ${x.judge.pace}, nat ${x.judge.naturalness}${x.judge.words_match ? "" : `, words: ${x.judge.differences}`}${x.judge.issues ? `, ${x.judge.issues}` : ""} | ${x.judge.accent_notes}`);
}

function sheet() {
  const round = args[1];
  const dir = path.join(WORK, "samples", round ?? "");
  if (!round || !fs.existsSync(path.join(dir, "index.json"))) { console.error("usage: sheet <round>"); process.exit(1); }
  const index: any[] = readJson(path.join(dir, "index.json"), []);
  const esc = (s: string) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const who = (id: string) => id === "coach_f" ? "Coach (female learner)" : id === "coach_m" ? "Coach (male learner)" : id === "amb_f" ? "Passer-by (f)" : id === "amb_m" ? "Passer-by (m)" : `${NPCS[id]?.name ?? id} · ${NPCS[id]?.role.lt ?? ""}`;
  let html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Puerto Colibrí voices</title>
<style>:root{color-scheme:light dark;--bg:#faf7f0;--fg:#222;--mute:#666;--line:#e3ddd0}@media (prefers-color-scheme:dark){:root{--bg:#1c1b19;--fg:#eee;--mute:#aaa;--line:#3a3833}}
body{margin:0 auto;max-width:900px;padding:16px;background:var(--bg);color:var(--fg);font:16px/1.45 system-ui,sans-serif}h1{font-size:1.5em}
section{border-top:1px solid var(--line);padding:12px 0}h2{font-size:1.1em;margin:0}.about{color:var(--mute);font-size:.9em}
.clip{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0}.clip span{flex:1 1 300px}audio{height:32px;max-width:100%}</style>
<h1>Puerto Colibrí: voice sample ${esc(round)}</h1><p class="about">Each character's Gemini voice and direction. Say which voices to change (for example “Doña Carmen: older, slower”).</p>`;
  const groups = new Map<string, any[]>();
  for (const x of index) if (!x.error) { if (!groups.has(x.who)) groups.set(x.who, []); groups.get(x.who)!.push(x); }
  for (const [id, xs] of groups) {
    const styles = [...new Set(xs.map((x) => x.style))];
    html += `<section><h2>${esc(who(id))} — ${esc(xs[0].gv)}</h2>${styles.map((s) => `<div class="about">“${esc(s)}”</div>`).join("")}`;
    for (const x of [...xs].sort((a, b) => (a.accent === b.accent ? 0 : a.accent === "mx" ? -1 : 1))) html += `<div class="clip"><audio controls preload="none" src="${esc(x.who)}-${x.key}.mp3"></audio><span><b>${x.accent === "neutral" ? "neutral" : "Mexican"}</b> · ${esc(x.say)}${x.fx ? ` <small class="about">(${x.fx})</small>` : ""}${x.judge?.accent ? ` <small class="about">· heard: ${esc(x.judge.accent)}, ${esc(x.judge.age)}</small>` : ""}</span></div>`;
    html += `</section>`;
  }
  fs.writeFileSync(path.join(dir, "index.html"), html);
  console.log(`${index.length} clips on ${path.join(dir, "index.html")}`);
}

// ---------------------------------------------------------------- check, redo
const madeFrom = (r: Recorded) => r.text + "|" + r.sec + (r.tries > 1 ? "|" + r.tries : "");
interface Checked { heard: string; score: number; text: string; full?: boolean; odd?: "long" | "short" }

/** Every line recorded so far, by key (the request files keep each line's say/shown/who). */
function knownLines(): Map<string, Line> {
  const m = new Map<string, Line>();
  const reqDir = path.join(WORK, "requests");
  for (const f of fs.existsSync(reqDir) ? fs.readdirSync(reqDir).filter((f) => f.endsWith(".lines.json")).sort() : []) for (const l of readJson<Line[]>(path.join(reqDir, f), [])) m.set(l.key, l);
  return m;
}

async function check() {
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const results: Record<string, Checked> = readJson(CHECK, {});
  const lines = knownLines();
  const todo = Object.keys(manifest).filter((k) => recorded[k]?.ok && fs.existsSync(wavOf(k)) && results[k]?.text !== madeFrom(recorded[k]));
  console.log(`${todo.length} clips to check`);
  for (const [k, r] of Object.entries(results)) { const l = lines.get(k); if (l) r.score = +likenessEs(l.say, r.heard, l.shown).toFixed(3); }
  let checked = 0;
  const listen = async (keys: string[], full: boolean) => {
    if (!keys.length) return;
    const heard = await whisper(keys.map(wavOf), full, () => {});
    for (const k of keys) {
      const l = lines.get(k);
      const h = heard.get(wavOf(k)) ?? "";
      results[k] = { heard: h, score: +likenessEs(l?.say ?? recorded[k].text, h, l?.shown).toFixed(3), text: madeFrom(recorded[k]), ...(full ? { full } : {}) };
    }
    writeJson(CHECK, results);
    checked += keys.length;
    process.stdout.write(`\r  ${checked} heard`);
  };
  // short clips first in a 10-second window (about twice as fast), long ones in the full window, and a doubtful one
  // (below 0.85, or Whisper heard more than the line) again in the full window
  for (let i = 0; i < todo.length; i += 1000) {
    const part = todo.slice(i, i + 1000);
    await listen(part.filter((k) => manifest[k] <= 9.5), false);
    await listen(part.filter((k) => manifest[k] > 9.5), true);
  }
  await listen(Object.keys(results).filter((k) => manifest[k] && recorded[k]?.ok && lines.has(k) && !results[k].full && (results[k].score < 0.85 || heardMore(lines.get(k)!.say, results[k].heard))), true);
  // the length rule: said twice (scores well, as a repeated sentence counts once), far too long, or cut short
  const said = new Map([...lines].map(([k, l]) => [k, l.say])), whose = new Map([...lines].map(([k, l]) => [k, l.who]));
  const pace = paces(Object.keys(results), manifest, said, whose);
  for (const [k, r] of Object.entries(results)) {
    const l = lines.get(k);
    if (!manifest[k] || !l) continue;
    const p = pace.get(l.who) ?? 0.13;
    if (tooLong(l.say, r.heard, manifest[k], p)) r.odd = "long";
    else if (tooShort(l.say, manifest[k], p) && r.score < 0.9) r.odd = "short";
    else delete r.odd;
  }
  writeJson(CHECK, results);
  process.stdout.write("\n");
  const low = Object.entries(results).filter(([k, r]) => manifest[k] && r.score < 0.85).sort((a, b) => a[1].score - b[1].score);
  const odd = Object.entries(results).filter(([k, r]) => manifest[k] && r.odd);
  console.log(`${Object.keys(results).filter((k) => manifest[k]).length} clips checked; ${odd.length} say more than the line, are far too long or cut short; ${low.length} where Whisper heard something different (below 0.85):`);
  for (const [k, r] of low.slice(0, Number(flag("show") ?? 40))) console.log(`  ${r.score.toFixed(2)} ${k} ${lines.get(k)?.who}\n       said:  ${lines.get(k)?.say ?? recorded[k]?.text}\n       heard: ${r.heard}`);
}

function redo() {
  const below = Number(flag("below") ?? 0.8);
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const recorded: Record<string, Recorded> = readJson(RECORDED, {});
  const results: Record<string, Checked> = readJson(CHECK, {});
  const out = path.join(WORK, "rejected");
  fs.mkdirSync(out, { recursive: true });
  let n = 0, kept = 0;
  for (const [k, r] of Object.entries(results)) {
    if (!manifest[k] || (r.score >= below && !r.odd)) continue;
    // a line that has had all its tries keeps its last take: better than no clip (and Whisper mishears some words)
    if ((recorded[k]?.tries ?? 1) >= MAX_TRIES) { kept++; continue; }
    if (fs.existsSync(mp3Of(k))) fs.renameSync(mp3Of(k), path.join(out, `${k}.${recorded[k]?.tries ?? 1}.mp3`));
    if (fs.existsSync(wavOf(k))) fs.renameSync(wavOf(k), path.join(out, `${k}.${recorded[k]?.tries ?? 1}.wav`));
    delete manifest[k];
    n++;
  }
  writeJson(MANIFEST, manifest, true);
  console.log(`${n} clips taken out (their takes kept in ${out}); the next prepare asks for them again`);
  if (kept) console.log(`${kept} flagged clips kept: their lines have had ${MAX_TRIES} tries (${CHECK})`);
}

// ---------------------------------------------------------------- install
/** The clips where the Spanish dev build plays them: <repo>/public/audio-es/ (clips git-ignored; the manifest and
 *  repair-versions.json are kept in git). A clip that was installed before and has been recorded again since gets a
 *  repair version (its content hash), so a browser that cached the old take fetches the new one. */
function install() {
  const repo = path.resolve(flag("to") ?? ROOT);
  const dest = path.join(repo, "public/audio-es");
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  const installed: Record<string, string> = readJson(INSTALLED, {});
  const repairs: Record<string, string> = readJson(REPAIRS, {});
  fs.mkdirSync(dest, { recursive: true });
  let copied = 0, repaired = 0;
  for (const k of Object.keys(manifest)) {
    if (!fs.existsSync(mp3Of(k))) { delete manifest[k]; continue; }
    const hash = createHash("sha256").update(fs.readFileSync(mp3Of(k))).digest("hex");
    if (installed[k] && installed[k] !== hash && repairs[k] !== hash) { repairs[k] = hash; repaired++; }
    installed[k] = hash;
    const to = path.join(dest, k + ".mp3");
    if (!fs.existsSync(to) || createHash("sha256").update(fs.readFileSync(to)).digest("hex") !== hash) { fs.copyFileSync(mp3Of(k), to); copied++; }
  }
  writeJson(MANIFEST, manifest, true);
  writeJson(REPAIRS, repairs);
  writeJson(INSTALLED, installed, true);
  fs.copyFileSync(MANIFEST, path.join(dest, "manifest.json"));
  fs.copyFileSync(REPAIRS, path.join(dest, "repair-versions.json"));
  console.log(`${Object.keys(manifest).length} clips in ${dest} (${copied} copied now), ${Object.keys(repairs).length} repair versions (${repaired} new)`);
}

/** What both sets would cost in batch, from what the sample's clips really cost: audio tokens fitted to syllables and
 *  pauses (least squares), text tokens to the request's length; plus a share for redos. `project <round> [<round>…]` */
async function project() {
  const rounds = args.slice(1).filter((a) => !a.startsWith("--"));
  const xs = rounds.flatMap((r) => readJson<any[]>(path.join(WORK, "samples", r, "index.json"), [])).filter((x) => !x.error && x.audioTokens > 0);
  if (xs.length < 10) { console.error("usage: project <round> … (a sample with at least 10 clips)"); process.exit(1); }
  // audio tokens ≈ a + b·syllables + c·pauses (normal equations, 3×3)
  const rows = xs.map((x) => [1, syllables(x.say), pauses(x.say), x.audioTokens]);
  const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], v = [0, 0, 0];
  for (const r of rows) for (let i = 0; i < 3; i++) { v[i] += r[i] * r[3]; for (let j = 0; j < 3; j++) A[i][j] += r[i] * r[j]; }
  const det = (m: number[][]) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(A);
  const coef = [0, 1, 2].map((k) => det(A.map((row, i) => row.map((c, j) => (j === k ? v[i] : c)))) / D);
  const fit = (say: string) => Math.max(10, coef[0] + coef[1] * syllables(say) + coef[2] * pauses(say));
  const textPerChar = xs.reduce((a, x) => a + x.textTokens, 0) / xs.reduce((a, x) => a + x.text.length + x.style.length, 0);
  const err = Math.sqrt(rows.reduce((a, r) => a + (fit(xs[rows.indexOf(r)].say) - r[3]) ** 2, 0) / rows.length);
  console.log(`${xs.length} sample clips: audio tokens ≈ ${coef[0].toFixed(1)} + ${coef[1].toFixed(2)} × syllables + ${coef[2].toFixed(1)} × pauses (±${err.toFixed(0)}); text ${textPerChar.toFixed(3)} tokens a character`);
  const lines = await allLines();
  const manifest: Record<string, number> = readJson(MANIFEST, {});
  // lines in batches sent and not fetched yet are already counted as running (spend().committed)
  const running = new Set<string>();
  for (const j of jobsList()) if (j.batch && !j.fetched && !j.failed) for (const l of readJson<Line[]>(path.join(WORK, linesFile(j.file)), [])) running.add(l.key);
  const redo = Number(flag("redo") ?? 0.05);
  // the conversations still to land (p18, p24–p30): about 11% more lines, as in Maple Harbor (3,636 of its 33,684)
  const later = Number(flag("later") ?? 0.11);
  const set: Record<string, number> = {};
  for (const acc of ["mx", "neutral"] as Accent[]) {
    const ls = lines.filter((l) => l.accent === acc && !manifest[l.key] && !running.has(l.key));
    const audio = ls.reduce((a, l) => a + fit(l.say), 0), text = ls.reduce((a, l) => a + (l.text.length + l.style.length) * textPerChar, 0);
    const price = priceOf(PRICE.batch, text, audio) * (1 + redo);
    set[acc] = price;
    console.log(`${acc === "mx" ? "Mexican" : "neutral"} set: ${ls.length} clips to record, ${(audio / 1e6).toFixed(2)}M audio tokens (${Math.round(audio / PRICE.tokensPerSecond / 60)} min), ${(text / 1e6).toFixed(2)}M text tokens: about $${price.toFixed(2)} in batch with ${Math.round(redo * 100)}% for redos`);
  }
  const { spent, committed } = spend();
  const now = spent + committed, both = set.mx + set.neutral, laterBoth = both * later;
  console.log(`spent so far $${spent.toFixed(2)}${committed ? `, running $${committed.toFixed(2)}` : ""}; both sets now about $${both.toFixed(2)}, the later conversations about $${laterBoth.toFixed(2)} more (both sets); stop line $${CAP}`);
  console.log(now + both + laterBoth <= CAP ? `both sets fit, the later conversations too: $${(now + both + laterBoth).toFixed(2)}`
    : now + set.mx * (1 + later) <= CAP ? `both sets don't fit with the later conversations ($${(now + both + laterBoth).toFixed(2)}): the Mexican set first ($${(now + set.mx * (1 + later)).toFixed(2)} with its later conversations), the neutral set waits for the owner's OK`
    : `even the Mexican set doesn't fit: $${(now + set.mx * (1 + later)).toFixed(2)}`);
}

/** One clip right away: `try "¡Hola!" --voice=<Gemini voice> --style="…" [--fx=phone]` → <work>/try/ (the standard
 *  price, in the ledger). */
async function tryOne() {
  const text = args.slice(1).find((a) => !a.startsWith("--")) ?? "¡Buenas tardes! ¿En qué le puedo ayudar?";
  const voice = flag("voice") ?? "Kore", style = flag("style") ?? "friendly; natural Mexican Spanish";
  const fx = flag("fx") as "phone" | "video" | undefined;
  capCheck(0.002, "one clip");
  const dir = path.join(WORK, "try");
  fs.mkdirSync(dir, { recursive: true });
  const l = { key: `${voice}-${Date.now()}`, voice: "try", who: "try", accent: "mx", speed: 1, say: text, shown: text, text: geminiTextEs(text), gv: voice, style, ...(fx ? { fx } : {}), where: "try", sits: [] } as Line;
  const res = await speakNow(l, dir, "try");
  console.log(JSON.stringify(res), path.join(dir, `try-${l.key}.mp3`));
}

/** Google's voice catalog (GET /v1beta/voices, free): which voices it lists for Spanish and Mexico, to compare with the
 *  prebuilt voices the casting uses. `voices [--lang=es-MX] [--region=MX] [--search=…]` */
async function listVoices() {
  const q = new URLSearchParams({ page_size: "200" });
  if (flag("lang")) q.set("language_code", flag("lang")!);
  if (flag("region")) q.set("region_code", flag("region")!);
  if (flag("search")) q.set("search", flag("search")!);
  const out: any[] = [];
  let token = "";
  do {
    if (token) q.set("page_token", token);
    const r: any = await api(`/v1beta/voices?${q}`);
    out.push(...(r.voices ?? []));
    token = r.nextPageToken ?? r.next_page_token ?? "";
  } while (token && out.length < 2000);
  writeJson(path.join(WORK, "catalog", `voices-${flag("lang") ?? "all"}-${flag("region") ?? "all"}.json`), out);
  for (const v of out.slice(0, Number(flag("show") ?? 60))) console.log(`${v.id ?? v.name}  ${v.displayName ?? v.display_name ?? ""}  ${v.languageCode ?? v.language_code ?? ""}  ${v.accent ?? ""}  ${v.gender ?? ""}  ${v.pitch ?? ""}  ${(v.description ?? "").slice(0, 80)}`);
  console.log(`${out.length} voices (saved in ${path.join(WORK, "catalog")})`);
}

function showLedger() {
  const rows = ledgerRows();
  const by = new Map<string, { n: number; price: number; audio: number }>();
  for (const r of rows) { const b = by.get(r.kind) ?? { n: 0, price: 0, audio: 0 }; b.n += r.requests; b.price += r.price; b.audio += r.audioTokens; by.set(r.kind, b); }
  for (const [k, b] of by) console.log(`${k.padEnd(14)} ${String(b.n).padStart(6)} requests  ${(b.audio / 1e6).toFixed(3)}M audio tokens  $${b.price.toFixed(3)}`);
  const { spent, committed } = spend();
  console.log(`spent $${spent.toFixed(3)}; batches running about $${committed.toFixed(3)}; cap $${CAP}`);
}

const commands: Record<string, () => unknown> = { plan, sample, "check-samples": checkSamples, judge, sheet, prepare, send, status: () => status(), fetch: fetchAll, check, redo, install, ledger: showLedger, voices: listVoices, "lines-part": linesPart, try: tryOne, project };
if (process.argv[1]?.endsWith("voice-batch-es.ts")) {
  if (!commands[cmd]) { console.log("commands: " + Object.keys(commands).join(", ") + " (see the top of tools/es-voices/voice-batch-es.ts)"); process.exit(1); }
  await commands[cmd]();
}
