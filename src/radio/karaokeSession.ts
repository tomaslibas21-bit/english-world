import { createStore, type StoreApi } from "zustand/vanilla";
import { buildTimeline, withSungTranslations, type Timeline } from "./lyrics";
import { NeedsTap, type RadioOutput } from "./output";
import { fetchSongJson, readSongLines, songAudioUrls, type RadioConfig, type SongMeta } from "./songs";

export interface KaraokeState {
  status: "idle" | "loading" | "playing" | "paused" | "blocked" | "ended" | "error" | "closed";
  song: SongMeta | null;
  timeline: Timeline | null;
  held: boolean;
  issue: "audio" | "timing" | null;
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

  constructor(private deps: SessionDeps) {
    this.store = createStore<KaraokeState>(() => ({
      status: "idle", song: null, timeline: null, held: deps.held, issue: null,
    }));
  }

  private get state() { return this.store.getState(); }
  position() { return this.state.status === "playing" ? this.deps.output.position() : this.at; }
  duration() { return this.length || this.state.song?.d || 0; }

  start(id: string) {
    const song = this.deps.song(id);
    if (!song || this.state.status === "closed") return;
    this.cancel();
    this.at = this.length = this.address = 0;
    this.wantsPlay = true;
    this.store.setState({ song, timeline: null, issue: null, status: "paused" });
    return this.resume();
  }

  pause() {
    if (this.state.status === "closed") return;
    this.wantsPlay = false;
    this.cancel();
    if (["loading", "playing", "blocked"].includes(this.state.status)) this.store.setState({ status: "paused" });
  }

  resume() {
    const { song, status, held } = this.state;
    if (!song || (status !== "paused" && status !== "blocked")) return;
    this.wantsPlay = true;
    if (held) return;
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
    this.cancel();
    this.at = Math.max(0, this.length ? Math.min(seconds, this.length) : seconds);
    this.store.setState({ status: status === "blocked" ? "blocked" : "paused" });
    if (requested && !this.state.held) return this.play(song);
  }

  /** An OS interruption or a hidden page always needs a new play request. */
  interrupt() {
    if (this.state.status === "playing" || this.state.status === "loading" || this.wantsPlay) this.pause();
  }

  /** The radio still owns the hold set, including overlapping voice, bed and microphone holds. */
  setHeld(held: boolean) {
    if (this.state.held === held || this.state.status === "closed") return;
    if (held && this.wantsPlay) {
      this.cancel();
      this.store.setState({ held, status: "paused" });
      return;
    }
    this.store.setState({ held });
    if (!held && this.wantsPlay) {
      this.resumeTimer = setTimeout(() => {
        const { song, held } = this.state;
        if (song && !held && this.wantsPlay) void this.play(song);
      }, this.deps.resumeDelay);
    }
  }

  close(resumeStreet = true) {
    if (this.state.status === "closed") return;
    this.wantsPlay = false;
    this.cancel();
    this.at = this.length = 0;
    this.store.setState({ status: "closed", song: null, timeline: null, issue: null, held: false });
    this.deps.close(resumeStreet);
  }

  private cancel() {
    const out = this.deps.output;
    clearTimeout(this.resumeTimer);
    this.run++;
    this.load?.abort();
    this.load = undefined;
    if (this.state.status === "playing") this.at = out.position();
    out.pause();
    out.onEnded = null;
    out.onStopped = null;
  }

  private async play(song: SongMeta) {
    if (this.state.held || !this.wantsPlay) return;
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
        const data = await fetchSongJson(config, song.id, this.deps.token(), this.deps.fetchJson, load.signal);
        if (run !== this.run) return;
        const lines = readSongLines(data, true);
        if (!lines.length) { this.fail("timing"); return; }
        timeline = buildTimeline(withSungTranslations(lines));
        this.store.setState({ timeline });
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
        this.wantsPlay = false;
        this.cancel();
        this.at = this.length;
        this.store.setState({ status: "ended" });
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

  private fail(issue: NonNullable<KaraokeState["issue"]>) {
    this.wantsPlay = false;
    this.cancel();
    this.store.setState({ status: "error", issue });
  }
}
