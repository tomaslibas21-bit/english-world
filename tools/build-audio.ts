// Pre-generates every voice clip with Kokoro-82M (Apache-2.0), locally, during development.
// Nothing here runs while students play; the game only plays the resulting MP3 files.
//   npx tsx tools/build-audio.ts [situation-prefix | path/to/situation.ts ...] [--fuzz=N] [--dry] [--prune]
//   --prune (full runs only): delete clips that no current line uses any more.
//   --part=K/N: generate only every N-th missing clip (run K = 1…N in parallel, e.g. with THREADS=3).
// Output: public/audio/<key>.mp3 and public/audio/manifest.json ({ key: seconds }).
// Resumable: existing clips are kept. Requires ffmpeg on PATH (MP3 encoding).
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { enumerateAll } from "./enumerate";
import { audioKey } from "../src/audio-key";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const prune = args.includes("--prune");
const fuzz = Number(args.find((a) => a.startsWith("--fuzz="))?.slice(7) ?? 120);
const only = args.filter((a) => !a.startsWith("--") && !a.endsWith(".ts"));
// situation files can also be given directly (they don't need to be in the index yet)
const files = args.filter((a) => a.endsWith(".ts"));
const sits = files.length ? await Promise.all(files.map(async (f) => (await import(pathToFileURL(path.resolve(f)).href)).default)) : undefined;
const OUT = path.resolve("public/audio");
fs.mkdirSync(OUT, { recursive: true });
const MANIFEST = path.join(OUT, "manifest.json");
const manifest: Record<string, number> = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};

/** Spelling the TTS reads better (the visible text is unchanged). */
function ttsText(s: string): string {
  return s
    .replace(/\bMr\.\s/g, "Mister ").replace(/\bMrs\.\s/g, "Missus ").replace(/\bMs\.\s/g, "Miz ").replace(/\bDr\.\s/g, "Doctor ")
    .replace(/\bATM\b/g, "A T M").replace(/\bTSA\b/g, "T S A").replace(/\bID\b/g, "I D").replace(/\bIDs\b/g, "I Ds")
    .replace(/\bPIN\b/g, "pin").replace(/\bOK\b/g, "okay").replace(/\bUSPS\b/g, "U S P S").replace(/\bUS\b/g, "U S")
    .replace(/\ba\.m\./gi, "A M").replace(/\bp\.m\./gi, "P M").replace(/&/g, " and ").replace(/#(\d)/g, "number $1")
    .replace(/[“”„]/g, "\"").replace(/…/g, "...").replace(/—/g, ", ").replace(/\s+/g, " ").trim();
}

function trimAndNormalize(samples: Float32Array, sr: number): Float32Array {
  const thr = 0.012;
  let a = 0, b = samples.length - 1;
  while (a < b && Math.abs(samples[a]) < thr) a++;
  while (b > a && Math.abs(samples[b]) < thr) b--;
  const pad = Math.round(sr * 0.06);
  a = Math.max(0, a - pad); b = Math.min(samples.length - 1, b + Math.round(sr * 0.12));
  const cut = samples.slice(a, b + 1);
  let peak = 0, sum = 0;
  for (const v of cut) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
  const rms = Math.sqrt(sum / Math.max(1, cut.length));
  const targetRms = Math.pow(10, -19 / 20);
  const scale = Math.min(targetRms / Math.max(rms, 1e-6), 0.89 / Math.max(peak, 1e-6));
  for (let i = 0; i < cut.length; i++) cut[i] *= scale;
  return cut;
}

function encodeMp3(samples: Float32Array, sr: number, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "f32le", "-ar", String(sr), "-ac", "1", "-i", "pipe:0", "-b:a", "32k", "-ar", "24000", "-ac", "1", file]);
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error("ffmpeg exited " + code))));
    ff.stdin.write(Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength));
    ff.stdin.end();
  });
}

const { utts, errors } = enumerateAll({ fuzzRuns: fuzz, only, sits, log: (s) => process.stdout.write("\r" + s.padEnd(70)) });
console.log(`\n${utts.length} sentences; ${errors.length} handler errors during fuzzing`);
for (const e of errors.slice(0, 20)) console.log("  ! " + e);
if (prune && !only.length && !sits) {
  const keep = new Set(utts.map((u) => audioKey(u.voice, u.speed, u.say)));
  let removed = 0;
  for (const f of fs.readdirSync(OUT)) {
    const key = f.replace(/\.mp3$/, "");
    if (f.endsWith(".mp3") && !keep.has(key)) { if (!dry) fs.unlinkSync(path.join(OUT, f)); delete manifest[key]; removed++; }
  }
  for (const key of Object.keys(manifest)) if (!keep.has(key)) { delete manifest[key]; removed++; }
  if (!dry) fs.writeFileSync(MANIFEST, JSON.stringify(manifest));
  console.log(`pruned ${removed} unused clips${dry ? " (dry run)" : ""}`);
}
// --part=K/N: this process takes every N-th missing clip (several processes share one run evenly)
const part = args.find((a) => a.startsWith("--part="))?.slice(7).split("/").map(Number);
const todo = utts.filter((u) => !manifest[audioKey(u.voice, u.speed, u.say)] || !fs.existsSync(path.join(OUT, audioKey(u.voice, u.speed, u.say) + ".mp3")))
  .filter((_, i) => !part || i % part[1] === part[0] - 1);
console.log(`to generate: ${todo.length} (already done: ${utts.length - todo.length})`);
if (dry) process.exit(0);
if (!todo.length) process.exit(0);

// Parallel builders: cap ONNX threads per process (THREADS=4) so several processes don't oversubscribe the CPU.
if (process.env.THREADS) {
  const ort: any = await import("onnxruntime-node");
  const IS = ort.InferenceSession ?? ort.default?.InferenceSession;
  const create = IS.create.bind(IS);
  IS.create = (a: any, b?: any, ...rest: any[]) => {
    const n = Number(process.env.THREADS);
    const opts = { intraOpNumThreads: n, interOpNumThreads: 1 };
    // create(path|buffer, options) or create(buffer, offset, length, options)
    if (typeof b === "number") return create(a, b, rest[0], { ...(rest[1] ?? {}), ...opts });
    return create(a, { ...(b ?? {}), ...opts });
  };
}
const { KokoroTTS } = await import("kokoro-js");
const tts = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype: "fp32", device: "cpu" });
// Several builders may run at once (e.g. one per group of situations), so the manifest is
// merged under a lock file instead of being overwritten.
const mine: Record<string, number> = {};
function saveManifest() {
  const lock = MANIFEST + ".lock";
  for (let i = 0; i < 500; i++) {
    try { fs.writeFileSync(lock, String(process.pid), { flag: "wx" }); break; }
    catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10); if (i === 499) fs.rmSync(lock, { force: true }); }
  }
  try {
    const cur: Record<string, number> = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, "utf8")) : {};
    Object.assign(cur, mine);
    fs.writeFileSync(MANIFEST + ".tmp", JSON.stringify(cur));
    fs.renameSync(MANIFEST + ".tmp", MANIFEST);
  } finally { fs.rmSync(lock, { force: true }); }
}

const t0 = Date.now();
let done = 0, failed = 0;
for (const u of todo) {
  const key = audioKey(u.voice, u.speed, u.say);
  try {
    const audio = await tts.generate(ttsText(u.say), { voice: u.voice as any, speed: u.speed });
    const trimmed = trimAndNormalize(audio.audio as Float32Array, audio.sampling_rate);
    const tmp = path.join(OUT, `${key}.${process.pid}.tmp.mp3`);
    await encodeMp3(trimmed, audio.sampling_rate, tmp);
    fs.renameSync(tmp, path.join(OUT, key + ".mp3")); // atomic: parallel builders never see half-written clips
    manifest[key] = mine[key] = +(trimmed.length / audio.sampling_rate).toFixed(2);
  } catch (e: any) {
    failed++;
    console.log(`\n  ✗ ${u.voice} "${u.say}": ${e.message}`);
  }
  done++;
  if (done % 25 === 0 || done === todo.length) {
    saveManifest();
    const rate = done / ((Date.now() - t0) / 1000);
    process.stdout.write(`\r${done}/${todo.length} · ${rate.toFixed(2)}/s · ETA ${Math.round((todo.length - done) / rate / 60)} min   `);
  }
}
saveManifest();
console.log(`\ndone: ${done - failed} clips, ${failed} failed`);
