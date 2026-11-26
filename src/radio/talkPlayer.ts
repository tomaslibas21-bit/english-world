import { bookCueIndex } from "./bookTiming";
import { TALK_LANGUAGES, TALK_RATES, isTalkMode, type TalkBookmark, type TalkLanguage, type TalkMode,
  type TalkPreferences, type TalkProgress, type TalkSelection } from "./talkProgress";

export interface TalkCue {
  sentenceId: string;
  textHash: string;
  language: TalkLanguage;
  text: string;
  start: number;
  end: number;
  /** Absolute source-time spans, one per whitespace token. Null is punctuation. */
  words?: readonly (readonly [number, number] | null)[];
}

export interface TalkTrack {
  mode: TalkMode;
  duration: number;
  cues: readonly TalkCue[];
  audioVersion: string;
  /** Resolve immediately before opening a recording, so a retry sees the current files token. */
  recording: () => string;
  rateSwitches?: readonly { from: number; until: number; language: TalkLanguage }[];
}

export interface TalkItem {
  selection: TalkSelection;
  tracks: Partial<Record<TalkMode, TalkTrack>>;
  issues?: Partial<Record<TalkMode, TalkFailure>>;
}

export type TalkFailure = "access" | "missing" | "invalid" | "unavailable" | "blocked";
export type TalkStopReason = "pause" | "hold" | "capture" | "sleep" | "change" | "end";
type MediaRates = Readonly<Partial<Record<TalkLanguage, number>>>;

export interface TalkOutput {
  /** An output can expose the text-only state before the first Play. */
  readonly unavailable?: TalkFailure;
  /** One source. A start canceled by signal or stop must never subsequently sound. */
  start(request: {
    item: TalkItem;
    track: TalkTrack;
    position: number;
    rates: MediaRates;
    signal: AbortSignal;
    onTime: () => void;
    onEnded: () => void;
    onError: (failure: TalkFailure) => void;
  }): Promise<void>;
  /** Current source seconds for the active request, null while it has no clock. */
  position(): number | null;
  setRates(rates: MediaRates): void;
  /** Capture and source changes also cancel any fade still in progress. */
  stop(reason: TalkStopReason): void;
}

export interface TalkClock {
  now(): number;
  setTimeout(callback: () => void, delay: number): () => void;
}

type Sleep = { kind: "timed"; deadline: number } | { kind: "end" } | null;
type Status = "idle" | "loading" | "paused" | "held" | "starting" | "playing" | "ended" | "error";

export interface TalkSnapshot {
  selection: TalkSelection | null;
  item: TalkItem | null;
  status: Status;
  playIntent: boolean;
  held: boolean;
  position: number;
  cue: TalkCue | null;
  prefs: TalkPreferences;
  sleep: Sleep;
  error: TalkFailure | null;
}

interface PlayerOptions {
  clock: TalkClock;
  output: TalkOutput;
  progress: TalkProgress;
  load: (selection: TalkSelection, signal: AbortSignal) => Promise<TalkItem>;
}

const sameSelection = (a: TalkSelection | null, b: TalkSelection) =>
  a?.itemKey === b.itemKey && a.chapterId === b.chapterId;

function cueAt(track: TalkTrack | undefined, position: number): TalkCue | null {
  if (!track?.cues.length) return null;
  return track.cues[bookCueIndex(track.cues, position)];
}

/** Stable across mode changes, while still distinguishing revised versions of a display sentence. */
export function talkFingerprint(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 0x01000193);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function restoredPosition(track: TalkTrack, saved?: Readonly<Omit<TalkBookmark, "updatedAt">>, includeOffset = true): number {
  if (!saved || (saved.complete && includeOffset)) return track.cues[0].start;
  const expected = saved.fraction * track.duration;
  const matching = track.cues.filter((cue) => saved.textHash === undefined ? cue.sentenceId === saved.sentence : cue.textHash === saved.textHash);
  const firstLegs = (cues: readonly TalkCue[]) => cues.filter((cue, i) => i === 0 || cue.sentenceId !== cues[i - 1].sentenceId);
  const nearest = (cues: readonly TalkCue[]) =>
    cues.reduce((best, cue) => Math.abs(cue.start - expected) < Math.abs(best.start - expected) ? cue : best);
  const same = matching.find((cue) => cue.sentenceId === saved.sentence && cue.language === saved.leg);
  if (includeOffset && same && saved.audioVersion === track.audioVersion) {
    return same.start + Math.min(saved.offsetSec, same.end - same.start);
  }
  const exact = matching.find((cue) => cue.sentenceId === saved.sentence);
  if (exact) return exact.start;
  return nearest(firstLegs(matching.length ? matching : track.cues)).start;
}

function failureOf(error: unknown): TalkFailure {
  const kind = (error as { kind?: unknown } | null)?.kind;
  if (kind === "access" || kind === "missing" || kind === "invalid" || kind === "blocked" || kind === "unavailable") return kind;
  return (error as { name?: unknown } | null)?.name === "NotAllowedError" ? "blocked" : "unavailable";
}

export class TalkPlayer {
  private state: TalkSnapshot;
  private readonly views = new Set<() => void>();
  private readonly holds = new Set<string>();
  private loading: AbortController | null = null;
  private playing: AbortController | null = null;
  private cancelSleep?: () => void;
  private cancelResume?: () => void;
  private started = false;
  private lastCheckpoint = 0;

  constructor(private readonly options: PlayerOptions) {
    this.state = {
      selection: null, item: null, status: "idle", playIntent: false, held: false,
      position: 0, cue: null, prefs: options.progress.getSnapshot().prefs, sleep: null, error: null,
    };
  }

  getSnapshot = (): Readonly<TalkSnapshot> => this.state;
  subscribe = (view: () => void): (() => void) => {
    this.views.add(view);
    return () => { this.views.delete(view); };
  };

  /** Selection is explicit. Inspecting the catalog can leave the player alone. */
  select(selection: TalkSelection, play = false): Promise<void> {
    this.checkSleep();
    if (sameSelection(this.state.selection, selection)) {
      if (play && this.state.status !== "error") this.play();
      return Promise.resolve();
    }
    return this.loadSelection(selection, play, true);
  }

  async retry(play = false): Promise<void> {
    const selection = this.state.selection;
    if (selection && this.state.status === "error") await this.loadSelection(selection, play, true, true);
  }

  play(): void {
    this.checkSleep();
    if (!this.state.selection || (this.state.error && this.state.error !== "blocked")) return;
    if (this.state.status === "ended" && this.track) this.move(this.track.cues[0].start);
    this.state = { ...this.state, playIntent: true, error: null };
    if (!this.playing) this.patch({ status: this.restingStatus(false) });
    this.maybeStart();
  }

  pause(): void {
    this.checkSleep();
    this.capturePosition();
    this.stopOutput("pause");
    this.savePosition();
    this.state = { ...this.state, playIntent: false };
    this.patch({ status: this.restingStatus() });
  }

  /** De-select the talk source before handing transport to another station. */
  clear(): void {
    this.capturePosition();
    this.stopOutput("change");
    this.checkpoint();
    this.loading?.abort();
    this.loading = null;
    this.started = false;
    this.patch({ selection: null, item: null, position: 0, cue: null, status: "idle", playIntent: false, error: null });
  }

  dispose(): void {
    this.clear();
    this.cancelSleep?.();
    this.cancelResume?.();
    this.views.clear();
  }

  seekSentence(sentenceId: string): void {
    this.checkSleep();
    const cue = this.track?.cues.find((entry) => entry.sentenceId === sentenceId);
    if (!cue) return;
    this.stopOutput("change");
    this.move(cue.start);
    this.started = true;
    this.checkpoint();
    this.patch({ status: this.restingStatus(false) });
    this.maybeStart();
  }

  stepSentence(direction: -1 | 1): void {
    this.capturePosition();
    const { cue, position } = this.state;
    const cues = this.track?.cues;
    if (!cue || !cues) return;
    const ids = [...new Set(cues.map((line) => line.sentenceId))];
    const index = ids.indexOf(cue.sentenceId);
    const start = cues.find((line) => line.sentenceId === cue.sentenceId)!.start;
    const next = direction < 0 && position - start > 2 ? index : index + direction;
    this.seekSentence(ids[Math.max(0, Math.min(ids.length - 1, next))]);
  }

  changeMode(mode: TalkMode): void {
    if (!isTalkMode(mode) || mode === this.state.prefs.mode) return;
    this.checkSleep();
    this.capturePosition();
    const previous = this.position() ?? (this.state.selection ? this.options.progress.get(this.state.selection) : undefined);
    this.stopOutput("change");
    const prefs = { ...this.state.prefs, mode };
    const track = this.state.item?.tracks[mode];
    const position = track ? restoredPosition(track, previous, false) : 0;
    const error = this.state.item ? this.trackError(this.state.item, mode) : null;
    // Changing to a missing track still saves the place in the previous recording.
    if (this.started && previous && this.state.selection && !track) this.options.progress.checkpoint(this.state.selection, previous, prefs);
    else if (!this.started || !track) this.options.progress.setPreferences(prefs);
    this.state = { ...this.state, prefs, position, cue: cueAt(track, position), error, playIntent: !error && this.state.playIntent };
    if (track) this.savePosition(false, prefs);
    this.patch({ status: this.restingStatus(false) });
    this.maybeStart();
  }

  setRate(language: TalkLanguage, rate: number): void {
    const { target, helper } = TALK_LANGUAGES[this.options.progress.profile];
    const choices: readonly number[] = language === target ? TALK_RATES.target : language === helper ? TALK_RATES.helper : [];
    if (!choices.includes(rate)) return;
    this.setPreferences({ ...this.state.prefs, rates: { ...this.state.prefs.rates, [language]: rate } });
    if (this.playing) this.options.output.setRates(this.mediaRates());
  }

  setAutoplay(autoplay: boolean): void { this.setPreferences({ ...this.state.prefs, autoplay }); }
  setInterlinear(interlinear: boolean): void { this.setPreferences({ ...this.state.prefs, interlinear }); }

  hold(reason: string, immediate = reason === "microphone"): void {
    this.checkSleep();
    if (this.holds.has(reason)) return;
    this.holds.add(reason);
    this.cancelResume?.();
    this.cancelResume = undefined;
    this.capturePosition();
    this.stopOutput(immediate ? "capture" : "hold");
    this.checkpoint();
    this.state = { ...this.state, held: true };
    this.patch({ status: this.restingStatus() });
  }

  release(reason: string): void {
    if (!this.holds.delete(reason) || this.holds.size) return;
    this.checkSleep();
    this.cancelResume = this.options.clock.setTimeout(() => {
      this.cancelResume = undefined;
      this.checkSleep();
      this.state = { ...this.state, held: false };
      this.patch({ status: this.restingStatus() });
      this.maybeStart();
    }, 700);
  }

  setSleep(choice: "off" | 15 | 30 | "end"): void {
    this.cancelSleep?.();
    this.cancelSleep = undefined;
    const sleep: Sleep = choice === "off" ? null : choice === "end" ? { kind: "end" }
      : { kind: "timed", deadline: this.options.clock.now() + choice * 60_000 };
    this.patch({ sleep });
    if (sleep?.kind === "timed") this.scheduleSleep(sleep.deadline);
  }

  /** Share this checkpoint with pagehide, standing up, or a course handoff. */
  checkpoint(): void {
    this.capturePosition();
    this.savePosition();
  }

  /** The binding can call this on visibility changes as well as output time notifications. */
  tick(): void {
    if (this.checkSleep()) return;
    this.capturePosition();
    if (this.playing && this.options.clock.now() - this.lastCheckpoint >= 5000) this.savePosition();
  }

  private get track(): TalkTrack | undefined { return this.state.item?.tracks[this.state.prefs.mode]; }

  private async loadSelection(selection: TalkSelection, play: boolean, resume: boolean, keepItem = false): Promise<void> {
    this.capturePosition();
    const retryPosition = keepItem ? this.position() : undefined;
    this.stopOutput("change");
    if (!sameSelection(this.state.selection, selection)) this.savePosition();
    this.loading?.abort();
    const request = new AbortController();
    this.loading = request;
    this.started = false;
    this.patch({
      selection, item: keepItem ? this.state.item : null, position: keepItem ? this.state.position : 0,
      cue: keepItem ? this.state.cue : null, status: "loading", playIntent: play, error: null,
    });
    try {
      const item = await this.options.load(selection, request.signal);
      if (this.loading !== request) return;
      if (!sameSelection(item.selection, selection)) {
        this.loading = null;
        this.patch({ status: "error", error: "invalid", playIntent: false });
        return;
      }
      const mode = this.state.prefs.mode;
      const track = item.tracks[mode];
      const saved = retryPosition ?? (resume ? this.options.progress.get(selection) : undefined);
      const position = track ? restoredPosition(track, saved) : 0;
      const error = this.trackError(item, mode);
      this.loading = null;
      this.state = { ...this.state, item, position, cue: cueAt(track, position), error, playIntent: !error && this.state.playIntent };
      this.patch({ status: this.restingStatus(false) });
      this.maybeStart();
    } catch (error) {
      if (this.loading !== request) return;
      this.loading = null;
      this.patch({ status: "error", error: failureOf(error), playIntent: false });
    }
  }

  private trackError(item: TalkItem, mode: TalkMode): TalkFailure | null {
    return this.options.output.unavailable ?? (item.tracks[mode] ? null : item.issues?.[mode] ?? "unavailable");
  }

  private maybeStart(): void {
    if (this.checkSleep() || this.playing || this.loading || this.holds.size || this.cancelResume ||
        !this.state.playIntent || this.state.error || !this.state.item || !this.track) return;
    const request = new AbortController();
    this.playing = request;
    const onError = (error: TalkFailure) => {
      if (this.playing !== request || this.checkSleep()) return;
      this.capturePosition();
      this.stopOutput("pause");
      this.savePosition();
      this.patch({ status: error === "blocked" ? "paused" : "error", playIntent: false, error });
    };
    this.patch({ status: "starting" });
    if (this.playing !== request) return;
    const start = async () => {
      try {
        await this.options.output.start({
          item: this.state.item!, track: this.track!, position: this.state.position,
          rates: this.mediaRates(), signal: request.signal,
          onTime: () => { if (this.playing === request) this.tick(); },
          onEnded: () => this.naturalEnd(request),
          onError,
        });
        if (this.playing !== request || this.checkSleep()) return;
        this.started = true;
        this.checkpoint();
        this.patch({ status: "playing" });
      } catch (error) { onError(failureOf(error)); }
    };
    void start();
  }

  private naturalEnd(request: AbortController): void {
    if (this.playing !== request || this.checkSleep()) return;
    const track = this.track!;
    const selection = this.state.item!.selection;
    this.stopOutput("end");
    this.move(track.duration);
    this.started = true;
    this.savePosition(true);
    if (this.state.sleep?.kind === "end") {
      this.patch({ sleep: null, playIntent: false, status: "ended" });
      return;
    }
    if (this.state.prefs.autoplay && selection.itemKey.startsWith("book/") && selection.nextChapterId &&
        selection.nextChapterId !== selection.chapterId) {
      this.started = false;
      void this.loadSelection({ itemKey: selection.itemKey, chapterId: selection.nextChapterId }, true, false);
    } else this.patch({ playIntent: false, status: "ended" });
  }

  private capturePosition(): void {
    if (!this.playing || !this.track) return;
    const position = this.options.output.position();
    if (position !== null && Number.isFinite(position)) this.move(Math.max(0, Math.min(this.track.duration, position)));
  }

  private move(position: number): void {
    if (position !== this.state.position) this.patch({ position, cue: cueAt(this.track, position) });
  }

  private position(complete = false): Omit<TalkBookmark, "updatedAt"> | undefined {
    const { cue, position } = this.state;
    const track = this.track;
    if (!cue || !track) return;
    return {
      sentence: cue.sentenceId, leg: cue.language, textHash: cue.textHash, audioVersion: track.audioVersion,
      offsetSec: Math.max(0, Math.min(cue.end - cue.start, position - cue.start)),
      fraction: position / track.duration, complete,
    };
  }

  private savePosition(complete = false, prefs?: TalkPreferences): void {
    const position = this.position(complete);
    if (!this.started || !position || !this.state.selection) return;
    this.options.progress.checkpoint(this.state.selection, position, prefs);
    this.lastCheckpoint = this.options.clock.now();
  }

  private stopOutput(reason: TalkStopReason): void {
    const request = this.playing;
    this.playing = null;
    request?.abort();
    if (request || reason === "capture" || reason === "change") this.options.output.stop(reason);
  }

  private restingStatus(keepEnded = true): Status {
    if (this.loading) return "loading";
    if (!this.state.selection) return "idle";
    if (this.state.error) return this.state.error === "blocked" ? "paused" : "error";
    if (keepEnded && this.state.status === "ended") return "ended";
    return this.state.held && this.state.playIntent ? "held" : "paused";
  }

  private scheduleSleep(deadline: number): void {
    this.cancelSleep = this.options.clock.setTimeout(() => {
      if (!this.checkSleep() && this.state.sleep?.kind === "timed") this.scheduleSleep(deadline);
    }, Math.max(0, deadline - this.options.clock.now()));
  }

  private checkSleep(): boolean {
    if (this.state.sleep?.kind !== "timed" || this.options.clock.now() < this.state.sleep.deadline) return false;
    this.cancelSleep?.();
    this.cancelSleep = undefined;
    this.capturePosition();
    this.stopOutput("sleep");
    this.savePosition();
    this.state = { ...this.state, sleep: null, playIntent: false };
    this.patch({ status: this.restingStatus() });
    return true;
  }

  private setPreferences(prefs: TalkPreferences): void {
    this.options.progress.setPreferences(prefs);
    this.patch({ prefs: this.options.progress.getSnapshot().prefs });
  }

  private mediaRates(): MediaRates {
    const { target, helper } = TALK_LANGUAGES[this.options.progress.profile];
    const rates = this.state.prefs.rates;
    return { [target]: (rates[target] ?? 0.75) / 0.75, [helper]: rates[helper] ?? 1 };
  }

  private patch(change: Partial<TalkSnapshot>): void {
    this.state = { ...this.state, ...change };
    for (const view of this.views) view();
  }
}
