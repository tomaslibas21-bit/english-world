// The piece-by-piece check of voice clips (docs/VOICING-PLAN.md, "Repeats"): Gemini sometimes starts a line again
// ("Would you like your… would you like your receipt printed or emailed?") or says a piece of it twice, and a
// recognizer that hears the whole clip tends to smooth that away (Whisper wrote the receipt line once and scored it 1).
// So every clip is also cut at its inner pauses and each piece is recognized on its own (tools/voice-pieces.py,
// Parakeet), and the words heard are counted against the words of the line: a run of words heard more often than the
// line says it is a repeat. Shared by tools/voice-batch.ts (Maple Harbor) and tools/es-voices/voice-batch-es.ts
// (Puerto Colibrí); each passes its own way of writing a line as spoken (numbers as digits, fillers left out).
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

/** What tools/voice-pieces.py heard in one clip. */
export interface Heard {
  key: string;
  sec: number;
  /** inner pauses, ms from the clip's start */
  pauses: [number, number][];
  /** the whole clip's transcript, and its words with their start times (s) */
  whole: string;
  words: [string, number][];
  /** each piece between two pauses: from, to (ms), transcript */
  pieces: [number, number, string][];
  /** which recognizer heard it; "none": only the pauses and the stripe */
  engine?: "parakeet" | "whisper" | "none";
  /** the clip's longest stretch that sounds like an earlier one: its length, its length counted by how much the
   *  sound changes in it ("moving" ms), how alike, and where both times start (ms) */
  stripe?: { ms: number; moving: number; sim: number; at: [number, number] };
}

export interface Verdict {
  /** words heard more often than the line says them, e.g. "would you like your" (whole, pieces or both) */
  again?: string;
  /** where `again` was heard: "whole", "pieces" or "both" */
  where?: "whole" | "pieces" | "both";
  /** the clip's sound comes twice (a stripe of SOUNDS_TWICE moving ms or more) though the line repeats no word */
  twice?: boolean;
  /** letters heard beyond the line's own, the larger of the two hearings */
  extra: number;
  /** the pieces' transcripts, joined with " | " */
  heard: string;
}

export type Spoken = (s: string) => string;

/** A line's words as a recognizer would write them: `spoken` makes numbers digits and drops fillers; apostrophes
 *  and accents don't count. */
export function wordsOf(s: string, spoken: Spoken): string[] {
  return spoken(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
}

function counts(words: string[], n: number): Map<string, number> {
  const m = new Map<string, number>();
  for (let i = 0; i + n <= words.length; i++) { const g = words.slice(i, i + n).join(" "); m.set(g, (m.get(g) ?? 0) + 1); }
  return m;
}

/** The longest run of words (up to 5) heard more often than the line says it; one word counts only when it comes
 *  twice in a row ("up up and down"). Undefined when nothing is heard again. */
export function heardAgain(said: string[], heard: string[]): string | undefined {
  for (let n = Math.min(5, Math.floor(heard.length / 2)); n >= 2; n--) {
    const want = counts(said, n);
    for (const [g, c] of counts(heard, n)) if (c > (want.get(g) ?? 0) && c > 1) return g;
  }
  const twice = (ws: string[], w: string) => ws.filter((x, i) => x === w && ws[i + 1] === w).length;
  for (let i = 0; i + 1 < heard.length; i++) if (heard[i] === heard[i + 1] && twice(heard, heard[i]) > twice(said, heard[i])) return `${heard[i]} ${heard[i]}`;
  return undefined;
}

/** How many words must be added, dropped or changed to make one list of words the other. */
function wordDistance(a: string[], b: string[]): number {
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

/** A line begun, broken off and begun again, where the first attempt's last word came out cut ("They're 34 na…
 *  They're 3499", "I'm look… I'm looking for a dress", "A big… a bagel as well"): a word comes again within five
 *  words, and the words from its first time up to its second are all extra: without them what was heard is as many
 *  words nearer the line. Returns "word … word". */
export function startedAgain(said: string[], heard: string[]): string | undefined {
  const base = wordDistance(heard, said);
  for (let p = 0; p < heard.length; p++)
    for (let q = p + 1; q <= Math.min(heard.length - 1, p + 5); q++)
      if (heard[p] === heard[q] && base - wordDistance([...heard.slice(0, p), ...heard.slice(q)], said) === q - p) return `${heard[p]} … ${heard[q]}`;
  return undefined;
}

/** How many of the line's words are missing from what was heard (in order; a number said in pieces counts as one:
 *  "35, 47" is 3547). A cut must not raise this: "I can come down to eight. It hurts" has lost "thousand", though
 *  letter by letter it is still 0.9 like its line. */
export function wordsLost(said: string, heard: string, spoken: Spoken): number {
  const runs = (ws: string[]) => ws.reduce<string[]>((out, w) => { if (/^\d+$/.test(w) && out.length && /^\d+$/.test(out[out.length - 1])) out[out.length - 1] += w; else out.push(w); return out; }, []);
  const a = runs(wordsOf(said, spoken)), b = runs(wordsOf(heard, spoken));
  let row = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    const next = [0];
    for (let j = 1; j <= b.length; j++) next[j] = a[i - 1] === b[j - 1] ? row[j - 1] + 1 : Math.max(row[j], next[j - 1]);
    row = next;
  }
  return a.length - row[b.length];
}

/** wordsLost on the line as spoken (numbers as digits) plus on its plain words: "Six. Oh." must not pass for "60". */
export const lostEitherWay = (said: string, heard: string, spoken: Spoken) => wordsLost(said, heard, spoken) + wordsLost(said, heard, (x) => x.toLowerCase());

/** A word begun and begun again ("ha- their house had", "sau- saulė"): a heard word of two letters or more that the
 *  line doesn't have there, and that the next heard word starts with. */
export function falseStart(said: string[], heard: string[]): string | undefined {
  const have = new Set(said);
  for (let i = 0; i + 1 < heard.length; i++) {
    const a = heard[i], b = heard[i + 1];
    if (a.length >= 2 && b.length > a.length && b.startsWith(a) && !have.has(a) && have.has(b)) return `${a}- ${b}`;
  }
  return undefined;
}

/** Words with every run said twice in a row left once ("okay okay that comes to" → "okay that comes to"). Whisper
 *  writes a short piece's words two or three times now and then; with `onceInARow` a repeat counts only when it
 *  reaches across two pieces, and the line's own words are folded the same way. */
export function onceInARow(words: string[]): string[] {
  const w = [...words];
  for (let changed = true; changed;) {
    changed = false;
    for (let n = Math.min(6, Math.floor(w.length / 2)); n >= 1 && !changed; n--)
      for (let i = 0; i + 2 * n <= w.length; i++) if (w.slice(i, i + n).join(" ") === w.slice(i + n, i + 2 * n).join(" ")) { w.splice(i, n); changed = true; break; }
  }
  return w;
}

/** A stripe this long (moving ms) is a phrase said twice: clean clips whose line repeats nothing stay under it but
 *  for about 1 in 100 (measured on Maple Harbor's 33,682 clips, 15 Nov 2026). */
export const SOUNDS_TWICE = 450;

/** The line says something twice itself ("seven thousand … seven thousand", "thirty-five point five", "7788"): its
 *  sound may well come twice. Counted on the line as written, before its numbers become digits. */
export function repeatsItself(said: string): boolean {
  const seen = new Set<string>();
  for (const w of said.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/['’]/g, "").split(/[^a-z0-9]+/).filter(Boolean)) {
    if (/^\d+$/.test(w)) { if (new Set(w).size < w.length) return true; }
    if (w.length >= 3 || /\d/.test(w)) { if (seen.has(w)) return true; seen.add(w); }
  }
  return false;
}

/** The verdict on one clip: is a piece of the line heard again, in the whole clip's transcript or in its pieces', or
 *  does its sound come twice? Whisper's hearing is folded (see onceInARow). */
export function judgePieces(said: string, h: Heard, spoken: Spoken): Verdict {
  const fold = h.engine === "whisper";
  const f = (ws: string[]) => (fold ? onceInARow(ws) : ws);
  const want = f(wordsOf(said, spoken));
  const whole = f(wordsOf(h.whole, spoken));
  const pieces = h.pieces.flatMap((p) => f(wordsOf(p[2], spoken)));
  const any = (ws: string[]) => heardAgain(want, ws) ?? startedAgain(want, ws) ?? falseStart(want, ws);
  const a = any(whole), b = any(pieces);
  const len = (ws: string[]) => ws.join("").length;
  const v: Verdict = { extra: Math.max(len(whole), len(pieces)) - len(want), heard: h.pieces.map((p) => p[2]).join(" | ") };
  if (h.engine !== "none" && (a || b)) { v.again = a ?? b; v.where = a && b ? "both" : a ? "whole" : "pieces"; }
  if ((h.stripe?.moving ?? 0) >= SOUNDS_TWICE && !repeatsItself(said)) v.twice = true;
  return v;
}

// ---------------------------------------------------------------- hearing (Parakeet, tools/voice-pieces.py)
const HERE = import.meta.dirname;

/** Runs tools/voice-pieces.py over clips ({key, path}) and returns what it heard, by key. `cache`: a .jsonl file the
 *  script appends to and skips the keys of, so a long run can be stopped and started again. */
export async function hearPieces(jobs: { key: string; path: string }[], opts: { cache?: string; procs?: number; engine?: "parakeet" | "whisper" | "none"; lang?: "en" | "es"; log?: (s: string) => void } = {}): Promise<Map<string, Heard>> {
  if (!jobs.length) return new Map();
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-pieces-"));
  const jobsFile = path.join(tmp, "jobs.jsonl");
  const out = opts.cache ?? path.join(tmp, "heard.jsonl");
  fs.writeFileSync(jobsFile, jobs.map((j) => JSON.stringify(j)).join("\n") + "\n");
  await new Promise<void>((resolve, reject) => {
    const p = spawn("python3", [path.join(HERE, "voice-pieces.py"), jobsFile, out, `--engine=${opts.engine ?? "parakeet"}`, `--lang=${opts.lang ?? "en"}`, ...(opts.procs ? [`--procs=${opts.procs}`] : [])], { stdio: ["ignore", "pipe", "inherit"] });
    p.stdout.on("data", (d) => opts.log?.(String(d)));
    p.on("error", reject);
    p.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`tools/voice-pieces.py ended with ${code} (what it needs is at the top of that file)`))));
  });
  const heard = readHeard(out);
  if (!opts.cache) fs.rmSync(tmp, { recursive: true, force: true });
  const missing = jobs.filter((j) => !heard.has(j.key));
  if (missing.length) throw new Error(`${missing.length} clips were not heard piece by piece (${missing[0].key}…)`);
  return heard;
}

export function readHeard(file: string): Map<string, Heard> {
  const m = new Map<string, Heard>();
  if (fs.existsSync(file)) for (const row of fs.readFileSync(file, "utf8").split("\n")) if (row.trim()) { const h = JSON.parse(row) as Heard; m.set(h.key, h); }
  return m;
}

// ---------------------------------------------------------------- repeats in clips already made, and cutting them
/** How an edition writes and compares its lines: its language, the spoken form, and how alike a line and a
 *  transcript are (0…1). */
export interface Edition { lang: "en" | "es"; spoken: Spoken; alike: (said: string, heard: string) => number }
export interface Clip { key: string; path: string; said: string }
export interface Found extends Verdict { key: string; said: string; sec: number; whole: string; stripe?: Heard["stripe"]; alike: number; lost: number; lostInPieces: number }

/** Hears clips piece by piece and returns the ones where a piece of the line comes again (words heard again, or the
 *  sound twice). */
export async function findRepeats(clips: Clip[], ed: Edition, opts: Parameters<typeof hearPieces>[1] = {}): Promise<{ found: Found[]; all: Map<string, Found> }> {
  const heard = await hearPieces(clips, { lang: ed.lang, ...opts });
  const all = new Map<string, Found>();
  for (const c of clips) { const h = heard.get(c.key)!; all.set(c.key, { key: c.key, said: c.said, sec: h.sec, whole: h.whole, stripe: h.stripe, alike: +ed.alike(c.said, h.whole).toFixed(3), lost: lostEitherWay(c.said, h.whole, ed.spoken), lostInPieces: lostEitherWay(c.said, h.pieces.map((x) => x[2]).join(" "), ed.spoken), ...judgePieces(c.said, h, ed.spoken) }); }
  return { found: [...all.values()].filter((f) => f.again || f.twice), all };
}

export interface CutResult { key: string; ok: boolean; cuts: [number, number][]; secBefore: number; sec: number; heard: string; why?: string }

/** After a cut the clip must be as like its line as before it (less this much), and at least ALIKE_AFTER_CUT. */
export const ALIKE_AFTER_CUT = 0.9, ALIKE_LOST = 0.03;
/** … and not shorter than this share of the line's usual length (Clip.usual), when that is known. */
export const SHORT_AFTER_CUT = 0.75;

/** Cuts the restart out of each clip (tools/voice-cut.py: the first attempt and the pause after it go, the complete
 *  attempt stays) into `outDir`, and hears every result again: a cut is kept only when the clip then says its line
 *  once (nothing heard again, the sound not twice), is as like the line as it was before, has lost none of the
 *  words heard in it before (in the whole clip's transcript and in its pieces'), and isn't too short for it. A clip whose cut doesn't hold gets the next-best cut, three in all; then its file is removed: that line needs
 *  a new take. */
export async function cutRepeats(clips: (Clip & { usual?: number })[], ed: Edition, outDir: string, opts: { engine?: "parakeet" | "whisper"; kbps?: number; log?: (s: string) => void } = {}): Promise<CutResult[]> {
  if (!clips.length) return [];
  fs.mkdirSync(outDir, { recursive: true });
  const before = (await findRepeats(clips, ed, { engine: opts.engine, log: opts.log })).all;
  const results = new Map<string, CutResult>();
  let left = clips;
  for (let pick = 1; pick <= 3 && left.length; pick++) {
    const jobs = path.join(outDir, "cut-jobs.jsonl"), log = path.join(outDir, "cuts.jsonl");
    fs.writeFileSync(jobs, left.map((c) => JSON.stringify({ key: c.key, path: c.path })).join("\n") + "\n");
    fs.rmSync(log, { force: true });
    await new Promise<void>((resolve, reject) => {
      const proc = spawn("python3", [path.join(HERE, "voice-cut.py"), jobs, outDir, `--kbps=${opts.kbps ?? 64}`, `--pick=${pick}`], { stdio: ["ignore", "pipe", "inherit"] });
      proc.stdout.on("data", (d) => opts.log?.(String(d)));
      proc.on("error", reject);
      proc.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`tools/voice-cut.py ended with ${code}`))));
    });
    const rows = new Map(fs.readFileSync(log, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as { key: string; cuts: [number, number][]; sec_before: number; sec: number }).map((r) => [r.key, r]));
    const made = left.filter((c) => rows.get(c.key)?.cuts.length).map((c) => ({ ...c, path: path.join(outDir, c.key + ".mp3") }));
    const { all } = await findRepeats(made, ed, { engine: opts.engine, log: opts.log });
    const again: typeof clips = [];
    for (const c of left) {
      const r = rows.get(c.key), f = all.get(c.key), was = before.get(c.key)!;
      const why = !r?.cuts.length ? (pick === 1 ? "no two onsets that sound alike" : results.get(c.key)!.why)
        : f!.again ? `still heard again: ${f!.again}` : f!.twice ? "the sound still comes twice"
        : f!.alike < Math.max(ALIKE_AFTER_CUT, was.alike - ALIKE_LOST) ? `after the cut it says "${f!.whole}" (${f!.alike}, before ${was.alike})`
        : f!.lost > was.lost ? `the cut lost a word: "${f!.whole}"`
        : f!.lostInPieces > was.lostInPieces ? `the cut lost a word: "${f!.heard}"`
        : c.usual && r.sec < SHORT_AFTER_CUT * c.usual ? `after the cut it is ${r.sec} s, short for a line of about ${c.usual.toFixed(1)} s` : undefined;
      if (why && r?.cuts.length) fs.rmSync(path.join(outDir, c.key + ".mp3"), { force: true });
      results.set(c.key, { key: c.key, ok: !why, cuts: r?.cuts ?? [], secBefore: r?.sec_before ?? was.sec, sec: r?.sec ?? was.sec, heard: f?.heard ?? was.heard, ...(why ? { why } : {}) });
      if (why && r?.cuts.length) again.push(c);
    }
    left = again;
  }
  fs.rmSync(path.join(outDir, "cut-jobs.jsonl"), { force: true });
  fs.rmSync(path.join(outDir, "cuts.jsonl"), { force: true });
  return clips.map((c) => results.get(c.key)!);
}
