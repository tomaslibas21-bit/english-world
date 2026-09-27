// Speech input via the browser's Web Speech API, adapted from the Dvikalbės Dainos
// speech attempt (work/course/src/lib/speech-attempt.ts): one learner answer may span
// several recogniser sessions; silence is never a wrong answer; restarts are bounded.
//
// Instead of one target sentence, the conversation grammar judges what has been heard:
//   complete → commit after a short grace (the learner may add "please");
//   prefix   → a valid unfinished answer: allow a long natural pause;
//   none     → wait briefly for a final result, then hand it over (the UI shows what was heard).
//
// No paid or metered service is called by this code. Where supported (Chrome), recognition
// runs on the device (processLocally); otherwise the browser's own speech service is used,
// which may send audio to the browser vendor (Google for Chrome, Microsoft for Edge, Apple for Safari).

export const SPEECH_REC: any =
  typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
export const speechSupported = () => !!SPEECH_REC;

export const SPEECH_TIMING = {
  firstWord: 14_000,
  betweenWords: 7_000,
  afterNone: 1_500,
  completeGrace: 550,
  interimStable: 900,
  session: 45_000,
  startup: 12_000,
} as const;

export type SpeechStatus = "idle" | "starting" | "listening" | "reconnecting" | "denied" | "error" | "nothing";
export interface SpeechSnapshot { status: SpeechStatus; heard: string; error?: string; local?: boolean }

export interface SpeechOptions {
  evaluate(text: string): "complete" | "prefix" | "none";
  onUpdate(s: SpeechSnapshot): void;
  /** A finished answer (complete, or given up waiting). `alts` are other hypotheses to try. */
  onCommit(text: string, alts: string[]): void;
  phrases?: string[];
  preferLocal?: boolean;
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

export function createSpeechAttempt(opt: SpeechOptions) {
  let rec: any = null;
  let running = false;
  let disposed = false;
  let generation = 0;
  let base = "";                 // confirmed text from earlier recogniser sessions
  let finals = "";               // finals of the current session
  let interim = "";
  let alts: string[] = [];
  let hasSpeech = false;
  let lastActivity = 0;
  let startedAt = 0;
  let restarts = 0;
  let usePhrases = true;
  let useLocal = !!opt.preferLocal && localState === "available";
  let timer: ReturnType<typeof setTimeout> | undefined;
  let commitTimer: ReturnType<typeof setTimeout> | undefined;
  let snapshot: SpeechSnapshot = { status: "idle", heard: "" };

  const update = (s: Partial<SpeechSnapshot>) => { snapshot = { ...snapshot, ...s, local: useLocal }; if (!disposed) opt.onUpdate(snapshot); };
  const text = () => `${base} ${finals} ${interim}`.replace(/\s+/g, " ").trim();
  const clear = () => { if (timer) clearTimeout(timer); if (commitTimer) clearTimeout(commitTimer); timer = commitTimer = undefined; };
  const release = () => {
    const r = rec; rec = null;
    if (!r) return;
    r.onstart = r.onresult = r.onerror = r.onend = r.onspeechstart = r.onspeechend = null;
    try { r.abort(); } catch { /* ended */ }
  };
  const stopRunning = () => { generation++; running = false; clear(); release(); };

  const commit = () => {
    const t = text();
    const others = alts.filter((a) => a && a !== t);
    stopRunning();
    if (!t) { update({ status: "nothing", heard: "" }); return; }
    update({ status: "idle", heard: t });
    if (!disposed) opt.onCommit(t, others);
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    if (!running) return;
    const now = Date.now();
    if (now - startedAt > SPEECH_TIMING.session) { commit(); return; }
    const t = text();
    let allowance: number = SPEECH_TIMING.firstWord;
    if (hasSpeech && t) {
      const v = opt.evaluate(t);
      allowance = v === "prefix" ? SPEECH_TIMING.betweenWords : v === "complete" ? SPEECH_TIMING.completeGrace + 250 : SPEECH_TIMING.afterNone + 600;
    }
    const remaining = allowance - (now - lastActivity);
    if (remaining <= 0) {
      if (!hasSpeech || !t) { stopRunning(); update({ status: "nothing", heard: "" }); return; }
      commit(); return;
    }
    timer = setTimeout(schedule, Math.min(remaining, 1000));
  };

  const judge = (isFinalChunk: boolean) => {
    if (commitTimer) { clearTimeout(commitTimer); commitTimer = undefined; }
    const t = text();
    if (!t) return;
    const v = opt.evaluate(t);
    if (v === "complete") {
      commitTimer = setTimeout(() => { if (running) commit(); }, isFinalChunk ? SPEECH_TIMING.completeGrace : SPEECH_TIMING.interimStable);
      return;
    }
    // an alternative hypothesis may parse
    if (isFinalChunk) {
      const good = alts.find((a) => opt.evaluate(a) === "complete");
      if (good) {
        commitTimer = setTimeout(() => { if (running) { finals = ""; interim = ""; base = good; commit(); } }, SPEECH_TIMING.completeGrace);
        return;
      }
      if (v === "none") commitTimer = setTimeout(() => { if (running) commit(); }, SPEECH_TIMING.afterNone);
    }
  };

  const connect = () => {
    if (!running || disposed) return;
    const run = generation;
    let r: any;
    try { r = new SPEECH_REC(); } catch { update({ status: "error", error: "unavailable" }); running = false; return; }
    rec = r;
    const current = () => running && !disposed && run === generation && rec === r;
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 5;
    if (useLocal) { try { r.processLocally = true; } catch { useLocal = false; } }
    if (usePhrases && opt.phrases?.length && typeof (window as any).SpeechRecognitionPhrase === "function") {
      try { r.phrases = opt.phrases.slice(0, 60).map((p) => new (window as any).SpeechRecognitionPhrase(p, 3.0)); } catch { usePhrases = false; }
    }
    finals = ""; interim = "";
    r.onstart = () => {
      if (!current()) return;
      if (!startedAt) { startedAt = Date.now(); lastActivity = startedAt; }
      update({ status: "listening", heard: text() });
      schedule();
    };
    r.onspeechstart = () => { if (!current()) return; hasSpeech = true; lastActivity = Date.now(); if (commitTimer) { clearTimeout(commitTimer); commitTimer = undefined; } schedule(); };
    r.onresult = (ev: any) => {
      if (!current()) return;
      const finalParts: string[] = [];
      let i = "";
      let lastFinalAlts: string[] = [];
      let lastWasFinal = false;
      for (let k = 0; k < ev.results.length; k++) {
        const res = ev.results[k];
        const top = (res[0]?.transcript || "").trim();
        if (res.isFinal) {
          finalParts.push(top);
          lastWasFinal = true;
          lastFinalAlts = Array.from(res as ArrayLike<any>).slice(1, 5).map((a: any) => (a.transcript || "").trim()).filter(Boolean);
        } else { i += " " + top; lastWasFinal = false; }
      }
      finals = finalParts.join(" ").trim();
      interim = i.trim();
      // other hypotheses: the same text with the last final chunk replaced by each alternative
      if (lastFinalAlts.length && finalParts.length) {
        const head = finalParts.slice(0, -1).join(" ");
        alts = lastFinalAlts.map((a) => `${base} ${head} ${a}`.replace(/\s+/g, " ").trim());
      }
      hasSpeech = true;
      lastActivity = Date.now();
      restarts = 0;
      update({ status: "listening", heard: text() });
      judge(lastWasFinal && !interim);
      schedule();
    };
    r.onerror = (e: any) => {
      if (!current()) return;
      const err = e?.error || "error";
      if (err === "no-speech" || err === "aborted") { schedule(); return; }
      if (err === "phrases-not-supported") { usePhrases = false; release(); setTimeout(() => { if (running && run === generation) connect(); }, 50); return; }
      if ((err === "language-not-supported" || err === "service-not-allowed") && useLocal) { useLocal = false; release(); setTimeout(() => { if (running && run === generation) connect(); }, 50); return; }
      stopRunning();
      update({ status: err === "not-allowed" || err === "service-not-allowed" ? "denied" : "error", error: err });
    };
    r.onend = () => {
      if (!current()) return;
      base = text(); finals = ""; interim = "";
      release();
      if (!running) return;
      if (++restarts > 6) { commit(); return; }
      update({ status: "reconnecting", heard: base });
      timer = setTimeout(() => { if (running && run === generation) connect(); }, Math.min(200 * 2 ** (restarts - 1), 1600));
    };
    try { r.start(); } catch { if (current()) { stopRunning(); update({ status: "error", error: "start" }); } }
    setTimeout(() => { if (current() && snapshot.status === "starting") { stopRunning(); update({ status: "error", error: "timeout" }); } }, SPEECH_TIMING.startup);
  };

  return {
    start() {
      if (disposed || running) return;
      stopRunning();
      base = ""; finals = ""; interim = ""; alts = [];
      hasSpeech = false; startedAt = 0; restarts = 0;
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
