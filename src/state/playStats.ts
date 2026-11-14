// How the learner uses the game, for the course's owner (who decides how much more to build of the 3D town): how
// often the game is opened and on how many days, the active minutes in the 3D town and in the picture scenes (the
// light mode), the conversations started and finished in each, and the minutes the radio played.
//
// Kept in the save (Progress.play), so a course that syncs the save carries it to the learner's account, where the
// owner's per-learner page reads it; the courses add the counters up across devices (their lib/sync/merge.ts). The
// same counts also go, without any account or identifier, to the course's anonymous statistics (stats.ts).
//
// Only active time counts: the tab is on screen and the learner did something in the last two minutes (a tap, a key,
// the mouse, a voice speaking or an answer heard). An open tab left alone stops counting; a hidden tab never counts.
import { useStore, type PlayMode } from "./store";
import type { Progress } from "./progress";
import { sendStat } from "./stats";

export interface ModeStats {
  /** active seconds in this mode */
  sec: number;
  /** of them, seconds in a conversation */
  talk: number;
  /** times the game was opened in this mode */
  opens: number;
  /** conversations started and finished in this mode */
  started: number;
  finished: number;
}

export interface PlayStats {
  /** times the game was opened (a reload or a switch of modes within half an hour is the same opening) */
  opens: number;
  /** the days played, "YYYY-MM-DD" in the learner's time, oldest first (the latest DAYS_KEPT) */
  days: string[];
  /** first opening and the last moment of play (ms) */
  first: number;
  last: number;
  town: ModeStats;
  light: ModeStats;
  /** seconds the radio played while the learner was there */
  radio: number;
}

/** Without input for this long, the learner has stepped away: the clock stops. */
export const IDLE_MS = 120_000;
/** The radio counts a little longer without input (a song or two listened to), then stops too. */
export const RADIO_IDLE_MS = 600_000;
export const TICK_MS = 5_000;
/** A tick that comes much later than due (the computer slept, the tab was frozen) counts as one tick only. */
const MAX_STEP_MS = 15_000;
const SAVE_MS = 60_000;
const SEND_MS = 300_000;
/** A reload, or a switch between the town and the pictures, within this long is the same opening. */
const SAME_OPEN_MS = 30 * 60_000;
export const DAYS_KEPT = 400;

const emptyMode = (): ModeStats => ({ sec: 0, talk: 0, opens: 0, started: 0, finished: 0 });

export function emptyPlayStats(): PlayStats {
  return { opens: 0, days: [], first: 0, last: 0, town: emptyMode(), light: emptyMode(), radio: 0 };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
const modeOf = (v: unknown): ModeStats => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { sec: num(o.sec), talk: num(o.talk), opens: num(o.opens), started: num(o.started), finished: num(o.finished) };
};

/** The save's counts, whatever it holds (an older save has none; a damaged one counts from zero). */
export function readPlayStats(p: Pick<Progress, "play">): PlayStats {
  const o = (p.play && typeof p.play === "object" ? p.play : {}) as Record<string, unknown>;
  const days = Array.isArray(o.days) ? o.days.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)) : [];
  return {
    opens: num(o.opens), days, first: num(o.first), last: num(o.last),
    town: modeOf(o.town), light: modeOf(o.light), radio: num(o.radio),
  };
}

/** The learner's own calendar day. */
export function localDay(t: number): string {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function markDay(s: PlayStats, t: number) {
  const day = localDay(t);
  if (s.days.includes(day)) return;
  s.days = [...s.days, day].sort().slice(-DAYS_KEPT);
}

type Time = { sec: number; talk: number };
export type Pending = { town: Time; light: Time; radio: number };
const emptyPending = (): Pending => ({ town: { sec: 0, talk: 0 }, light: { sec: 0, talk: 0 }, radio: 0 });

/** The clock of one open page, apart from the browser so that it can be tested: what is active is counted by tick(). */
export class PlayMeter {
  /** the mode being played (null: the title screen, or still loading: nothing counts) */
  mode: PlayMode | null = null;
  visible = true;
  /** in a conversation now */
  talking = false;
  /** the radio is sounding now */
  radio = false;
  private lastInput = -Infinity;
  private lastTick: number;
  private pending = emptyPending();

  constructor(private now: () => number = Date.now) { this.lastTick = now(); }

  /** The learner did something (or a voice spoke to them). */
  input() { this.lastInput = this.now(); }

  /** Counts the time since the last tick, if it was active. */
  tick() {
    const t = this.now();
    let step = t - this.lastTick;
    this.lastTick = t;
    if (step <= 0 || !this.visible) return;
    if (step > MAX_STEP_MS) step = TICK_MS;
    const quiet = t - this.lastInput;
    if (this.mode && quiet <= IDLE_MS) {
      const m = this.pending[this.mode];
      m.sec += step / 1000;
      if (this.talking) m.talk += step / 1000;
    }
    if (this.mode && this.radio && quiet <= RADIO_IDLE_MS) this.pending.radio += step / 1000;
  }

  /** The tab was hidden or shown: hidden time never counts. */
  setVisible(v: boolean) {
    if (v === this.visible) return;
    if (!v) this.tick();
    else this.lastTick = this.now();
    this.visible = v;
  }

  /** What was counted since the last take, in seconds, and starts again from zero. */
  take(): Pending {
    const p = this.pending;
    this.pending = emptyPending();
    return p;
  }

  hasPending() {
    const p = this.pending;
    return p.town.sec + p.light.sec + p.radio > 0;
  }
}

/** Adds a page's counted time to the save's counts. */
export function addTime(s: PlayStats, p: Pending, t: number): PlayStats {
  for (const m of ["town", "light"] as const) {
    s[m].sec = Math.round((s[m].sec + p[m].sec) * 10) / 10;
    s[m].talk = Math.round((s[m].talk + p[m].talk) * 10) / 10;
  }
  s.radio = Math.round((s.radio + p.radio) * 10) / 10;
  if (p.town.sec + p.light.sec + p.radio > 0) { s.last = t; markDay(s, t); }
  return s;
}

/** One more opening of the game (in a mode once the learner is in it). */
export function addOpen(s: PlayStats, t: number, mode: PlayMode | null, whole: boolean): PlayStats {
  if (whole) { s.opens++; if (!s.first) s.first = t; }
  if (mode) s[mode].opens++;
  s.last = t;
  markDay(s, t);
  return s;
}

// ------------------------------------------------------------------ the page

const OPEN_KEY = "ew-play-open";

/** Whether this is a new opening (and notes it): one in this tab within SAME_OPEN_MS is the same one. */
function newOpening(part: string, t: number): boolean {
  try {
    const raw = sessionStorage.getItem(`${OPEN_KEY}:${part}`);
    sessionStorage.setItem(`${OPEN_KEY}:${part}`, String(t));
    return !raw || !(t - Number(raw) < SAME_OPEN_MS);
  } catch {
    return true;
  }
}

let started = false;
let meter: PlayMeter | null = null;
let unsent = emptyPending();

function save() {
  if (!meter || !meter.hasPending()) return;
  const p = meter.take();
  for (const m of ["town", "light"] as const) { unsent[m].sec += p[m].sec; unsent[m].talk += p[m].talk; }
  unsent.radio += p.radio;
  useStore.getState().updateProgress((pr) => { pr.play = addTime(readPlayStats(pr), p, Date.now()); });
}

function send() {
  const u = unsent;
  unsent = emptyPending();
  for (const m of ["town", "light"] as const) {
    const sec = Math.round(u[m].sec), talk = Math.round(u[m].talk);
    if (sec > 0) sendStat("game:time", { section: m, n: sec });
    if (talk > 0) sendStat("game:talk", { section: m, n: talk });
  }
  const radio = Math.round(u.radio);
  if (radio > 0) sendStat("game:radio", { n: radio });
}

/** Starts counting for this page (once; App calls it). `radio`: whether the radio is sounding, and its changes. */
export function startPlayStats(radio?: { playing(): boolean; subscribe(fn: () => void): () => void }) {
  if (started || typeof window === "undefined") return;
  started = true;
  const m = (meter = new PlayMeter());
  const t0 = Date.now();
  if (newOpening("page", t0)) useStore.getState().updateProgress((pr) => { pr.play = addOpen(readPlayStats(pr), t0, null, true); });

  let run = useStore.getState().conv.run, completed = false, transcript = 0;
  useStore.subscribe((st) => {
    // the mode is fixed for the page (a switch reloads it): it counts from the moment the learner is in it
    if (st.screen === "play" && !m.mode) {
      m.mode = st.settings.play;
      m.input();
      const t = Date.now();
      if (newOpening(m.mode, t)) {
        useStore.getState().updateProgress((pr) => { pr.play = addOpen(readPlayStats(pr), t, m.mode, false); });
        sendStat("game:open", { section: m.mode });
      }
    }
    const c = st.conv;
    m.talking = c.active;
    if (c.active && c.run !== run) {
      run = c.run; completed = false; transcript = 0;
      if (m.mode) {
        const mode = m.mode;
        m.tick(); save();
        useStore.getState().updateProgress((pr) => { const s = readPlayStats(pr); s[mode].started++; pr.play = s; });
        sendStat("game:conv", { section: mode });
      }
    }
    if (c.active && c.completed && !completed) {
      completed = true;
      if (m.mode) {
        const mode = m.mode;
        m.tick(); save();
        useStore.getState().updateProgress((pr) => { const s = readPlayStats(pr); s[mode].finished++; pr.play = s; });
        sendStat("game:done", { section: mode });
      }
    }
    // an answer heard, a line said: the learner is there even without touching anything
    if (c.transcript.length !== transcript) { transcript = c.transcript.length; m.input(); }
    if (c.mic.status === "listening") m.input();
  });

  if (radio) {
    m.radio = radio.playing();
    radio.subscribe(() => { const on = radio.playing(); if (on !== m.radio) { m.tick(); m.radio = on; } });
  }

  const poke = () => m.input();
  for (const e of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) window.addEventListener(e, poke, { capture: true, passive: true });
  m.setVisible(document.visibilityState !== "hidden");
  const away = () => { m.setVisible(false); save(); send(); };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") away();
    else m.setVisible(true);
  });
  window.addEventListener("pagehide", away);
  let lastSave = Date.now(), lastSend = Date.now();
  setInterval(() => {
    m.tick();
    const t = Date.now();
    if (t - lastSave >= SAVE_MS) { lastSave = t; save(); }
    if (t - lastSend >= SEND_MS) { lastSend = t; send(); }
  }, TICK_MS);
}

/** For tests: forget the page's state. */
export function _resetPlayStats() { started = false; meter = null; unsent = emptyPending(); }
