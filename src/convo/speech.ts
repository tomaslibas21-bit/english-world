// Speech input via the browser's Web Speech API. This is the Dvikalbės Dainos speech attempt, the engine the course's
// flashcards use (fluent-steps src/lib/songs/speech-attempt.ts), with the conversation grammar in place of one
// target sentence:
//   - one learner answer may span several recogniser sessions, and silence is never a wrong answer;
//   - the attempt never ends while the learner is still speaking (onspeechstart / onspeechend);
//   - every alternative the recogniser offers is combined into a few candidates (up to 8), ranked by the grammar:
//     complete → wait a moment of silence, then hand it over (the learner may add "please" or another item);
//     prefix   → a valid unfinished answer: allow a long natural pause;
//     none     → wait a short silence, then hand it over (the UI shows what was heard and "Did you mean…?").
//   The candidates go to the conversation with the answer (onCommit's `alts`), which picks the most useful reading.
//
// No paid or metered service is called by this code. The browser's own speech service is used, which may send
// audio to the browser vendor (Google for Chrome, Microsoft for Edge, Apple for Safari). Recognition on the device
// (Chrome's processLocally) is an opt-in setting: more private, but it hears accents less well.

import { NEGATION_TOKENS } from "./normalize";

export const SPEECH_REC: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
export const speechSupported = () => !!SPEECH_REC;

/** App attempt limits, not browser endpointing (a browser may end its own recognition sooner and need restarting).
 *  The same generous waits as the flashcards; `unclear` is the conversation's own. */
export const SPEECH_TIMING = {
  /** silence before the first word */
  firstWord: 20_000,
  /** a pause inside an unfinished answer (the grammar sees a valid beginning) */
  betweenWords: 15_000,
  /** silence after an answer the grammar understands */
  finishedAnswer: 1_200,
  /** silence after words the grammar can't use yet */
  unclear: 2_500,
  /** an understood answer the browser keeps as unfinished (Safari never marks results final): this long unchanged */
  interimStable: 900,
  session: 60_000,
  startup: 15_000,
} as const;

export type SpeechStatus = "idle" | "starting" | "listening" | "reconnecting" | "denied" | "error" | "nothing";
export interface SpeechSnapshot { status: SpeechStatus; heard: string; error?: string; local?: boolean }
export type Verdict = "complete" | "prefix" | "none";

type RecognitionResult = ArrayLike<{ transcript: string }> & { isFinal: boolean };
export interface RecognitionEvent { resultIndex?: number; results: ArrayLike<RecognitionResult> }
export interface SpeechRecognizer {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  processLocally?: boolean;
  phrases?: unknown;
  onstart: (() => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  start(): void;
  abort(): void;
}

interface Clock {
  now(): number;
  setTimeout(callback: () => void, delay: number): ReturnType<typeof setTimeout>;
  clearTimeout(timer: ReturnType<typeof setTimeout>): void;
}

export interface SpeechOptions {
  evaluate(text: string): Verdict;
  onUpdate(s: SpeechSnapshot): void;
  /** A finished answer (understood, or given up waiting). `alts` are the other candidates, best first. */
  onCommit(text: string, alts: string[]): void;
  phrases?: string[];
  preferLocal?: boolean;
  /** Tests: a fake recogniser and clock. */
  createRecognition?: () => SpeechRecognizer;
  clock?: Clock;
}

export type LocalAvailability = "available" | "downloadable" | "downloading" | "unavailable" | "unsupported";

export async function localAvailability(): Promise<LocalAvailability> {
  try {
    if (!SPEECH_REC || typeof SPEECH_REC.available !== "function") return "unsupported";
    return await SPEECH_REC.available({ langs: ["en-US"], processLocally: true });
  } catch { return "unsupported"; }
}
/** Must be called from a user gesture. Downloads the browser's English language pack (free, one time). */
export async function installLocal(): Promise<boolean> {
  try {
    if (!SPEECH_REC || typeof SPEECH_REC.install !== "function") return false;
    return !!(await SPEECH_REC.install({ langs: ["en-US"], processLocally: true }));
  } catch { return false; }
}

let localState: LocalAvailability | null = null;
export async function refreshLocalState() { localState = await localAvailability(); return localState; }
/** A browser that refused the contextual word list once keeps refusing it: don't ask again on every answer. */
let phrasesRefused = false;

const MAX_CANDIDATES = 8;
/** "not", "no", "never", "don't"…: a reading without the learner's negation is never preferred. */
export const hasNegation = (text: string) => text.toLowerCase().split(/[^a-z']+/).some((w) => NEGATION_TOKENS.has(w) || w.endsWith("n't"));
const MAX_ALTERNATIVES = 5;

export function createSpeechAttempt(opt: SpeechOptions) {
  const clock: Clock = opt.clock ?? {
    now: () => Date.now(),
    setTimeout: (callback, delay) => setTimeout(callback, delay),
    clearTimeout: (timer) => clearTimeout(timer),
  };
  const createRecognition = opt.createRecognition ?? (() => new SPEECH_REC() as SpeechRecognizer);
  let rec: SpeechRecognizer | null = null;
  let running = false;
  let disposed = false;
  let generation = 0;
  let finalCandidates: string[] = [""];
  let interimCandidates: string[] = [""];
  let pendingInterim = false;
  let hasSpeech = false;
  let speaking = false;
  let startedAt: number | null = null;
  let lastActivity = 0;
  let emptyRestarts = 0;
  let transientRecoveries = 0;
  let useLocal = !!opt.preferLocal && localState === "available";
  let idleTimer: ReturnType<typeof setTimeout> | undefined;
  let stableTimer: ReturnType<typeof setTimeout> | undefined;
  /** the recogniser's own best guess has a negation: readings that drop it rank last */
  let topNegated = false;
  let restartTimer: ReturnType<typeof setTimeout> | undefined;
  let startupTimer: ReturnType<typeof setTimeout> | undefined;
  let snapshot: SpeechSnapshot = { status: "idle", heard: "" };

  // The grammar is asked about the same few texts again and again while results arrive: remember its verdicts.
  const verdicts = new Map<string, Verdict>();
  const verdict = (text: string): Verdict => {
    const t = text.trim();
    if (!t) return "none";
    let v = verdicts.get(t);
    if (!v) { v = opt.evaluate(t); verdicts.set(t, v); }
    return v;
  };
  const rank = (text: string) => {
    if (topNegated && !hasNegation(text)) return -1;
    const v = verdict(text);
    return v === "complete" ? 2 : v === "prefix" ? 1 : 0;
  };

  const update = (s: Partial<SpeechSnapshot>) => {
    snapshot = { ...snapshot, ...s, local: useLocal };
    if (!disposed) opt.onUpdate(snapshot);
  };
  const heard = () => (pendingInterim ? interimCandidates[0] : finalCandidates[0]) ?? "";
  const clearTimers = () => {
    for (const t of [idleTimer, restartTimer, startupTimer, stableTimer]) if (t !== undefined) clock.clearTimeout(t);
    idleTimer = restartTimer = startupTimer = stableTimer = undefined;
  };
  const release = () => {
    const r = rec; rec = null;
    if (!r) return;
    r.onstart = r.onresult = r.onerror = r.onend = r.onspeechstart = r.onspeechend = null;
    try { r.abort(); } catch { /* already ended */ }
  };
  const stopRunning = () => { generation++; running = false; speaking = false; clearTimers(); release(); };

  /** Each new piece of speech (all of the recogniser's alternatives for it) continues every candidate so far. A
   *  learner may also restart from the beginning ("I… I'd like a latte"): only a piece the grammar can use on its
   *  own starts a new candidate, so an arbitrary tail is never salvaged and a negation is never dropped. */
  const combine = (previous: string[], parts: string[]) => {
    const out: string[] = [];
    // after a negation, nothing restarts: "I don't want… oat milk" must never become "oat milk"
    const restartable = previous.some((p) => p) && !previous.some(hasNegation);
    for (const part of parts) {
      for (const prefix of previous) out.push(`${prefix} ${part}`.trim());
      if (restartable && rank(part) > 0) out.push(part);
    }
    const unique = [...new Set(out)].filter((t) => t.length <= 2_000);
    // a stable sort: within the same verdict, the recogniser's own order (its best guess first) stays
    return unique.map((text, i) => ({ text, i, r: rank(text) })).sort((a, b) => b.r - a.r || a.i - b.i).slice(0, MAX_CANDIDATES).map((x) => x.text);
  };

  const commit = () => {
    const cands = pendingInterim ? interimCandidates : finalCandidates;
    const all = [...new Set([...cands, ...finalCandidates, ...interimCandidates].map((t) => t.trim()).filter(Boolean))];
    all.sort((a, b) => rank(b) - rank(a));
    const best = all[0] ?? "";
    stopRunning();
    if (!best) { update({ status: "nothing", heard: "" }); return; }
    update({ status: "idle", heard: best });
    if (!disposed) opt.onCommit(best, all.slice(1));
  };

  const scheduleIdle = () => {
    if (idleTimer !== undefined) clock.clearTimeout(idleTimer);
    idleTimer = undefined;
    if (!running || startedAt === null) return;
    const now = clock.now();
    const totalRemaining = SPEECH_TIMING.session - (now - startedAt);
    if (totalRemaining <= 0) { commit(); return; }
    const best = heard();
    const v = hasSpeech && best ? verdict(best) : null;
    const allowance = !v ? SPEECH_TIMING.firstWord
      : v === "complete" && !pendingInterim ? SPEECH_TIMING.finishedAnswer
      : v === "prefix" ? SPEECH_TIMING.betweenWords
      : v === "complete" ? SPEECH_TIMING.betweenWords // a complete reading with words still coming
      : SPEECH_TIMING.unclear;
    const silenceRemaining = allowance - (now - lastActivity);
    if (!speaking && silenceRemaining <= 0) {
      if (!hasSpeech || !best) { stopRunning(); update({ status: "nothing", heard: "" }); return; }
      commit(); return;
    }
    idleTimer = clock.setTimeout(scheduleIdle, Math.max(1, Math.min(totalRemaining, speaking ? 1_000 : silenceRemaining)));
  };
  const activity = () => { hasSpeech = true; lastActivity = clock.now(); emptyRestarts = 0; scheduleIdle(); };
  const cancelStable = () => { if (stableTimer !== undefined) clock.clearTimeout(stableTimer); stableTimer = undefined; };

  const failService = (error: string) => {
    stopRunning();
    update({ status: error === "not-allowed" || error === "service-not-allowed" ? "denied" : "error", error });
  };
  const reconnectSoon = (run: number) => {
    restartTimer = clock.setTimeout(() => { if (running && run === generation) connect(); }, 50);
  };

  const connect = () => {
    if (!running || disposed) return;
    const run = generation;
    let r: SpeechRecognizer;
    try { r = createRecognition(); } catch { failService("unavailable"); return; }
    rec = r;
    const current = () => running && !disposed && run === generation && rec === r;
    // Rebuild this session from its base: some mobile recognisers replace or shrink earlier result slots, even
    // ones already marked final.
    const sessionBase = finalCandidates.slice();
    let previousResults = "";
    pendingInterim = false;
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = MAX_ALTERNATIVES;
    if (useLocal) { try { r.processLocally = true; } catch { useLocal = false; } }
    // The contextual word list only helps the on-device recogniser.
    if (useLocal && !phrasesRefused && opt.phrases?.length && typeof (globalThis as any).SpeechRecognitionPhrase === "function") {
      try { r.phrases = opt.phrases.slice(0, 60).map((p) => new (globalThis as any).SpeechRecognitionPhrase(p, 3.0)); } catch { phrasesRefused = true; }
    }
    r.onstart = () => {
      if (!current()) return;
      if (startupTimer !== undefined) { clock.clearTimeout(startupTimer); startupTimer = undefined; }
      if (startedAt === null) { startedAt = clock.now(); lastActivity = startedAt; }
      update({ status: "listening", heard: heard() });
      scheduleIdle();
    };
    r.onspeechstart = () => { if (!current()) return; speaking = true; cancelStable(); activity(); };
    r.onspeechend = () => { if (!current()) return; speaking = false; lastActivity = clock.now(); scheduleIdle(); };
    r.onresult = (ev) => {
      if (!current()) return;
      const results = Array.from(ev.results);
      const signature = JSON.stringify(results.map((res) => ({ f: res.isFinal, t: Array.from(res).slice(0, MAX_ALTERNATIVES).map((a) => (a.transcript || "").trim()) })));
      const changed = signature !== previousResults;
      previousResults = signature;
      if (changed) cancelStable();
      // the recogniser's best guess: its first alternative for each piece
      const heardNow = results.map((res) => (res[0]?.transcript || "").trim()).filter(Boolean).join(" ");
      topNegated = hasNegation(`${sessionBase[0] ?? ""} ${heardNow}`);
      let finals = sessionBase.slice();
      let interims = finals;
      let interimText = "";
      let hasFinal = false;
      for (const res of results) {
        const parts = Array.from(res).slice(0, MAX_ALTERNATIVES).map((a) => (a.transcript || "").trim()).filter(Boolean);
        if (!parts.length) continue;
        if (res.isFinal) { finals = combine(finals, parts); interims = finals; hasFinal = true; }
        else { interims = combine(interims, parts); interimText += ` ${parts[0]}`; }
      }
      finalCandidates = finals.length ? finals : [""];
      interimCandidates = interims.length ? interims : [""];
      pendingInterim = !!interimText.trim();
      if (changed && hasFinal && !pendingInterim) speaking = false;
      if (changed && heardNow) activity();
      if (!current()) return;
      update({ status: "listening", heard: heard() });
      // an understood answer the browser still calls unfinished (Safari in continuous mode never marks results
      // final): hand it over once it stays the same for a moment
      if (pendingInterim && verdict(interimCandidates[0] ?? "") === "complete") {
        stableTimer = clock.setTimeout(() => { stableTimer = undefined; if (current()) commit(); }, SPEECH_TIMING.interimStable);
      }
    };
    r.onerror = (e) => {
      if (!current()) return;
      const err = e?.error || "error";
      if (err === "no-speech" || (err === "aborted" && transientRecoveries++ < 1)) {
        // Normal silence is not a wrong answer: onend resumes the same attempt. Some browsers omit onend after an
        // error, so don't leave a live mic showing.
        speaking = false;
        scheduleIdle();
        if (current()) {
          update({ status: "reconnecting", heard: heard() });
          if (startupTimer !== undefined) clock.clearTimeout(startupTimer);
          startupTimer = clock.setTimeout(() => { if (current()) r.onend?.(); }, 2_000);
        }
        return;
      }
      if (err === "phrases-not-supported") { phrasesRefused = true; release(); reconnectSoon(run); return; }
      if ((err === "language-not-supported" || err === "service-not-allowed") && useLocal) { useLocal = false; release(); reconnectSoon(run); return; }
      // a network hiccup after an understood answer: the answer stands
      if ([...finalCandidates, ...(pendingInterim ? interimCandidates : [])].some((t) => t.trim() && verdict(t) === "complete")) { commit(); return; }
      failService(err);
    };
    r.onend = () => {
      if (!current()) return;
      speaking = false;
      // words the browser hadn't finalised yet stay with the answer through its restart
      if (pendingInterim) { finalCandidates = interimCandidates.slice(); pendingInterim = false; }
      cancelStable();
      release();
      if (startupTimer !== undefined) { clock.clearTimeout(startupTimer); startupTimer = undefined; }
      scheduleIdle();
      if (!running) return;
      // Bound restarts on browsers that end instantly or can't stay connected.
      if (++emptyRestarts > 5) { commit(); return; }
      update({ status: "reconnecting", heard: heard() });
      restartTimer = clock.setTimeout(() => { if (running && run === generation) connect(); }, Math.min(250 * 2 ** (emptyRestarts - 1), 2_000));
    };
    startupTimer = clock.setTimeout(() => { if (current()) failService("timeout"); }, SPEECH_TIMING.startup);
    try { r.start(); } catch { if (current()) failService("start"); }
  };

  return {
    start() {
      if (disposed || running) return;
      stopRunning();
      // Every explicit try is a new answer; only the browser's own restarts inside an attempt keep its words.
      finalCandidates = [""]; interimCandidates = [""];
      pendingInterim = false; hasSpeech = false; speaking = false; topNegated = false;
      startedAt = null; emptyRestarts = 0; transientRecoveries = 0;
      verdicts.clear();
      running = true;
      update({ status: "starting", heard: "" });
      connect();
    },
    /** Stop listening and use what was heard so far (if anything). */
    finish() { if (running) commit(); },
    stop() { stopRunning(); update({ status: "idle", heard: "" }); },
    dispose() { disposed = true; stopRunning(); },
    get running() { return running; },
  };
}

/** Tests: forget a browser's refusal of the word list, and pretend the device has (or lacks) the language pack. */
export function resetSpeechForTests(local: LocalAvailability | null = null) { phrasesRefused = false; localState = local; }
