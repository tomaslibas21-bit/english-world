import { createStore, type StoreApi } from "zustand/vanilla";
import { buildTimeline, karaokeReading, withSungTranslations, type Timeline } from "./lyrics";
import { NeedsTap, type RadioOutput } from "./output";
import { fetchSongJson, readSongLines, songAudioUrls, type RadioConfig, type SongMeta } from "./songs";
import { KaraokePractice, type KaraokePracticeMode, type PracticeSnapshot } from "../game/karaoke/practice";
import type { KaraokeMicState } from "../game/karaoke/microphone";

export interface KaraokeState {
  status: "idle" | "loading" | "playing" | "paused" | "blocked" | "ended" | "error" | "closed";
  song: SongMeta | null;
  timeline: Timeline | null;
  held: boolean;
  issue: "audio" | "timing" | null;
  practice?: PracticeSnapshot;
  turnPaused?: boolean;
  rate?: 1 | 0.8;
  canSlow?: boolean;
  microphone?: KaraokeMicState;
}

interface SessionDeps {
  config: RadioConfig;
  output: RadioOutput;
  song(id: string): SongMeta | undefined;
  token(): string | null;
  fetchJson(url: string, signal?: AbortSignal): Promise<unknown>;
  level(): number;
  resumeDelay: number;
  held: boolean;
  close(resumeStreet: boolean): void;
}

/** A single take on the radio's borrowed output. Closing returns ownership to the street. */
export class KaraokeSession {
  readonly store: StoreApi<KaraokeState>;
  private at = 0;
  private length = 0;
  private address = 0;
  private wantsPlay = false;
  private run = 0;
  private load?: AbortController;
  private resumeTimer?: ReturnType<typeof setTimeout>;
  private practice?: KaraokePractice;
  private mode: KaraokePracticeMode = "along";
  private sampledAt = 0;
  private endedInTurn = false;
  private reading = false;
  private resumePending = false;
  private tickAt = performance.now();
  private microphoneFocused = false;

  constructor(private deps: SessionDeps) {
    this.store = createStore<KaraokeState>(() => ({
      status: "idle", song: null, timeline: null, held: deps.held, issue: null, rate: 1, canSlow: this.canSlow(),
    }));
  }

  private get state() { return this.store.getState(); }
  position() { return this.state.status === "playing" ? this.deps.output.position() : this.at; }
  duration() { return this.length || this.state.song?.d || 0; }
  private canSlow() { return !!this.deps.output.setPlaybackRate && !!this.deps.output.playbackRate && this.deps.output.canPreservePitch?.() === true; }
  private resetRate() { try { this.deps.output.setPlaybackRate?.(1); } catch { /* keep the normal-speed path usable */ } }

  start(id: string, mode: KaraokePracticeMode = "along") {
    const song = this.deps.song(id);
    if (!song || this.state.status === "closed") return;
    this.cancel();
    this.resetRate();
    this.at = this.length = this.address = 0;
    this.sampledAt = 0;
    this.practice = undefined;
    this.mode = mode;
    this.microphoneFocused = false;
    this.endedInTurn = this.reading = false;
    this.wantsPlay = true;
    this.store.setState({ song, timeline: null, practice: undefined, microphone: undefined, turnPaused: false, issue: null, status: "paused", rate: 1, canSlow: this.canSlow() });
    return this.resume();
  }

  pause() {
    if (this.state.status === "closed") return;
    this.tickAt = performance.now();
    this.sample();
    this.wantsPlay = false;
    this.cancel(this.sampledAt);
    if (["loading", "playing", "blocked"].includes(this.state.status)) this.store.setState({ status: "paused" });
    this.publishPractice();
  }

  resume() {
    if (this.state.practice?.turn && this.state.microphone?.used && this.state.held) return;
    const { song, status, held } = this.state;
    if (!song || (status !== "paused" && status !== "blocked")) return;
    this.tickAt = performance.now();
    this.wantsPlay = true;
    this.publishPractice();
    if (held || this.reading || this.resumePending || this.practice?.snapshot().turn) return;
    this.deps.output.unlock();
    return this.play(song);
  }

  retry() {
    if (this.state.status !== "error") return;
    this.address = 0;
    this.store.setState({ status: "paused", issue: null });
    return this.resume();
  }

  seek(seconds: number) {
    const { song, status } = this.state;
    if (!song || !Number.isFinite(seconds) || ["error", "closed"].includes(status)) return;
    const requested = this.wantsPlay;
    this.sample();
    this.cancel();
    this.at = Math.max(0, this.length ? Math.min(seconds, this.length) : seconds);
    this.sampledAt = this.at;
    this.endedInTurn = false;
    this.practice?.seek(this.at);
    this.microphoneFocused = false;
    this.store.setState({ status: status === "blocked" ? "blocked" : "paused", practice: this.practice?.snapshot() });
    if (requested && !this.state.held && !this.reading) return this.play(song);
  }

  /** Called from the mode's existing frame loop, including while its controls own input. */
  tick(seconds?: number) {
    const now = performance.now();
    const elapsed = seconds ?? Math.max(0, (now - this.tickAt) / 1000);
    this.tickAt = now;
    if (this.state.status === "playing") this.sample();
    else if (this.state.status === "paused" && this.wantsPlay && !this.state.held && !this.reading && !this.resumePending && !this.microphoneFocused) {
      if (this.practice?.elapse(elapsed)) { this.continueTurn(); return; }
      this.publishPractice();
    }
  }

  continueTurn() {
    if (this.state.held || !this.practice?.snapshot().turn) return;
    this.microphoneFocused = false;
    this.practice.continue();
    this.publishPractice();
    if (this.endedInTurn) { this.finish(); return; }
    return this.resume();
  }

  replayLine() {
    if (this.state.held) return;
    const call = this.practice?.replayAt(this.position());
    if (!call) return;
    this.pause();
    void this.seek(call.start);
    return this.resume();
  }

  revealWord() {
    if (!this.state.timeline || this.state.status === "closed" || this.state.status === "ended") return;
    const row = karaokeReading(this.state.timeline, this.position()).current;
    this.practice?.reveal(row);
    this.publishPractice();
  }

  /** A keyboard/controller learner can inspect the opt-in without racing the quiet-turn timer. */
  focusMicrophone(focused: boolean) { this.microphoneFocused = focused; this.tickAt = performance.now(); }

  /** Change the same output in place: media seconds, play intent, holds and an existing quiet turn stay intact. */
  setRate(rate: number) {
    if (!this.state.song || ["closed", "ended"].includes(this.state.status) || (rate !== 1 && rate !== 0.8)) return;
    const capable = this.canSlow();
    if (rate !== 1 && !capable) return;
    this.sample();
    const out = this.deps.output;
    let actual: 1 | 0.8 = 1;
    try {
      out.setPlaybackRate?.(rate);
      if (capable && out.playbackRate?.() === 0.8) actual = 0.8;
      else if (out.playbackRate?.() !== 1) out.setPlaybackRate?.(1);
    } catch { try { out.setPlaybackRate?.(1); } catch { /* normal-speed-only output */ } }
    this.store.setState({ rate: actual, canSlow: capable && (rate === 1 || actual === rate) });
  }

  /** A compact meaning card borrows silence without overriding a later explicit pause. */
  setReading(reading: boolean) {
    if (this.reading === reading || this.state.status === "closed") return;
    this.tickAt = performance.now();
    this.reading = reading;
    if (reading) {
      this.sample();
      this.cancel(this.sampledAt);
      if (this.state.status === "playing" || this.state.status === "loading") this.store.setState({ status: "paused" });
    } else if (this.wantsPlay && !this.state.held && !this.resumePending && !this.practice?.snapshot().turn && this.state.song) {
      return this.play(this.state.song);
    }
  }

  private publishPractice() {
    const practice = this.practice?.snapshot();
    const turnPaused = !!practice?.turn && !this.wantsPlay;
    if (practice !== this.state.practice || turnPaused !== this.state.turnPaused) this.store.setState({ practice, turnPaused });
  }

  private sample(until = this.deps.output.position()) {
    if (this.state.status !== "playing" || !this.practice) return;
    const boundary = this.practice.advance(this.sampledAt, until, this.deps.output.playbackRate?.() ?? 1);
    this.sampledAt = boundary ?? until;
    this.publishPractice();
    if (boundary !== null) {
      this.cancel(boundary);
      this.at = boundary;
      this.endedInTurn = this.length > 0 && boundary >= this.length - 0.001;
      this.store.setState({ status: "paused" });
    }
    return boundary;
  }

  /** An OS interruption or a hidden page always needs a new play request. */
  interrupt() {
    if (this.state.status === "playing" || this.state.status === "loading" || this.wantsPlay) this.pause();
  }

  /** The radio still owns the hold set, including overlapping voice, bed and microphone holds. */
  setHeld(held: boolean) {
    if (this.state.held === held || this.state.status === "closed") return;
    this.tickAt = performance.now();
    if (held && this.wantsPlay) {
      this.store.setState({ held });
      this.sample();
      this.cancel(this.sampledAt);
      this.store.setState({ held, status: "paused" });
      return;
    }
    this.store.setState({ held });
    if (!held && this.wantsPlay) {
      this.resumePending = true;
      this.resumeTimer = setTimeout(() => {
        this.resumePending = false;
        this.tickAt = performance.now();
        const { song, held } = this.state;
        if (song && !held && !this.reading && this.wantsPlay && !this.practice?.snapshot().turn) void this.play(song);
      }, this.deps.resumeDelay);
    }
  }

  close(resumeStreet = true) {
    if (this.state.status === "closed") return;
    this.wantsPlay = false;
    this.cancel();
    this.resetRate();
    this.at = this.length = 0;
    this.practice = undefined;
    this.reading = false;
    this.microphoneFocused = false;
    this.store.setState({ status: "closed", song: null, timeline: null, practice: undefined, microphone: undefined, turnPaused: false, issue: null, held: false, rate: 1 });
    this.deps.close(resumeStreet);
  }

  private cancel(at?: number) {
    const out = this.deps.output;
    clearTimeout(this.resumeTimer);
    this.resumePending = false;
    this.run++;
    this.load?.abort();
    this.load = undefined;
    if (this.state.status === "playing") this.at = at ?? out.position();
    out.pause();
    out.onEnded = null;
    out.onStopped = null;
  }

  private async play(song: SongMeta) {
    if (this.state.held || this.reading || !this.wantsPlay) return;
    this.cancel();
    const run = this.run;
    const { config, output: out } = this.deps;
    if (this.length && this.at >= this.length) {
      this.wantsPlay = false;
      return;
    }
    this.store.setState({ status: "loading" });
    if (run !== this.run) return;
    let timeline = this.state.timeline;
    if (!timeline) {
      const load = this.load = new AbortController();
      try {
        const data = await fetchSongJson(config, song.id, this.deps.token(), this.deps.fetchJson, load.signal, config.karaokeText);
        if (run !== this.run) return;
        const lines = readSongLines(data, true);
        if (!lines.length) { this.fail("timing"); return; }
        timeline = buildTimeline(withSungTranslations(lines));
        this.practice = new KaraokePractice(timeline.lines, this.mode);
        this.practice.seek(this.at);
        this.store.setState({ timeline, practice: this.practice.snapshot() });
      } catch {
        if (run === this.run) this.fail("audio");
        return;
      } finally {
        if (this.load === load) this.load = undefined;
      }
    }
    if (run !== this.run) return;
    const urls = songAudioUrls(config, song, this.deps.token());
    out.setVolume(this.deps.level());
    for (let index = this.address; index < urls.length; index++) {
      let current = true;
      out.onEnded = () => {
        if (run !== this.run || !current) return;
        this.length = out.duration?.() || this.duration();
        const boundary = this.sample(this.length);
        if (boundary != null) { this.endedInTurn = boundary >= this.length - 0.001; return; }
        this.finish();
      };
      out.onStopped = (reason) => {
        if (run !== this.run || !current) return;
        if (reason === "interrupted") this.interrupt();
        else if (this.state.status === "playing") this.fail("audio");
      };
      try {
        const playing = await out.play(urls[index], this.at, true);
        if (run !== this.run) return;
        if (!playing) { this.interrupt(); return; }
        this.address = index;
        this.length = out.duration?.() || 0;
        this.sampledAt = this.at;
        this.store.setState({ status: "playing" });
        return;
      } catch (error) {
        current = false;
        if (run !== this.run) return;
        if (error instanceof NeedsTap) {
          this.address = index;
          this.wantsPlay = false;
          this.cancel();
          this.store.setState({ status: "blocked" });
          return;
        }
      }
    }
    this.fail("audio");
  }

  private finish() {
    this.wantsPlay = false;
    this.cancel();
    this.at = this.length;
    this.store.setState({ status: "ended", practice: this.practice?.snapshot() });
  }

  private fail(issue: NonNullable<KaraokeState["issue"]>) {
    this.wantsPlay = false;
    this.cancel();
    this.store.setState({ status: "error", issue });
  }
}
