// The town's radio: the course's songs while you walk around. This file is the radio itself, with everything it needs
// handed in (so the tests run it without a browser); src/radio/index.ts builds the game's one radio and ties it to
// the conversation, the voices and the microphone.
//
// Two rules above all:
//   1. Music never plays into speech recognition. The radio is silent while anything holds it (hold()): an open
//      conversation, a voice clip, a microphone. Nothing here starts sound while a hold stands.
//   2. Sound starts only from start(), and start() checks rule 1 last, right before the output plays.
import { createStore, type StoreApi } from "zustand/vanilla";
import { buildTimeline, type Timeline } from "./lyrics";
import { NeedsTap, type RadioOutput } from "./output";
import { loadSaved, stationOrder, step, storeSaved, type RadioSaved, type Station } from "./playlist";
import { readSongLines, readSongList, songAudioUrls, songDataUrls, type RadioConfig, type SongMeta } from "./songs";

/** What stops the music: a conversation is open, a voice is loading or speaking, a microphone is listening. */
export type Hold = "conversation" | "voice" | "microphone";

export interface RadioState {
  /** this build has songs to play */
  available: boolean;
  /** the song list has arrived */
  ready: boolean;
  /** the learner turned the radio on */
  on: boolean;
  /** sound is coming out */
  playing: boolean;
  /** silent for a conversation, a voice or the microphone; it comes back by itself */
  held: boolean;
  /** the browser wants a tap before it lets the radio sound */
  needsTap: boolean;
  /** nothing could be played (no connection, or the course's files didn't open) */
  failed: boolean;
  station: string;
  shuffle: boolean;
  /** the lyric strip is shown */
  lyrics: boolean;
  /** the radio card is open */
  open: boolean;
  song: SongMeta | null;
  /** the song's lines, once they are here */
  timeline: Timeline | null;
  /** a song waiting to play next out of turn (the song of the place the learner walked into) */
  upNext: SongMeta | null;
}

export interface RadioDeps {
  config: RadioConfig | null;
  stations: Station[];
  output: RadioOutput;
  /** the course's files token, as it is now */
  token(): string | null;
  fetchJson(url: string): Promise<unknown>;
  /** the game's volume setting, 0–1 */
  volume(): number;
  storageKey: string;
  random?: () => number;
}

/** Music sits under the voices: this share of the game's volume. */
export const MUSIC_LEVEL = 0.6;
/** A hold fades the music out over this long, then pauses it (a microphone cuts it at once). */
export const FADE_OUT_MS = 250;
/** The music comes back this long after the last hold is gone, fading in. */
export const RESUME_AFTER_MS = 700;
export const FADE_IN_MS = 600;
/** After this many songs in a row that won't play, the radio stops trying. */
const MAX_FAILURES = 3;
const SAVE_EVERY_MS = 5000;

export class Radio {
  readonly store: StoreApi<RadioState>;
  private saved: RadioSaved;
  private songs: SongMeta[] = [];
  private byId = new Map<string, SongMeta>();
  private order: string[] = [];
  /** where the station is in its order; the song playing differs only for one played out of turn */
  private cursor: string | null = null;
  private queued: string | null = null;
  private suggested = new Set<string>();
  private resumeAt = 0;
  private holds = new Set<Hold>();
  private run = 0;
  private failures = 0;
  private loading: Promise<void> | null = null;
  private lines = new Map<string, Timeline | null>();
  private fadeTimer: ReturnType<typeof setTimeout> | undefined;
  private resumeTimer: ReturnType<typeof setTimeout> | undefined;
  private saveTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private deps: RadioDeps) {
    this.saved = loadSaved(deps.storageKey);
    if (!this.saved.station) this.newSeed(); // a first visit: its own shuffle
    const station = this.stationOf(this.saved.station);
    this.store = createStore<RadioState>(() => ({
      available: !!deps.config && deps.stations.length > 0,
      ready: false, on: false, playing: false, held: false, needsTap: false, failed: false,
      station: station?.id ?? "", shuffle: this.saved.shuffle ?? station?.shuffle ?? false,
      lyrics: this.saved.lyrics, open: false, song: null, timeline: null, upNext: null,
    }));
    deps.output.onEnded = () => this.go(1);
    deps.output.onStopped = (reason) => this.stopped(reason);
  }

  private get state() { return this.store.getState(); }
  private set(patch: Partial<RadioState>) { this.store.setState(patch); }
  private stationOf(id: string): Station | undefined { return this.deps.stations.find((s) => s.id === id) ?? this.deps.stations[0]; }
  private level() { return Math.max(0, Math.min(1, this.deps.volume() * MUSIC_LEVEL)); }

  // ---------------------------------------------------------------- the list

  /** Fetch the song list (once; a failed try is made again at the next call) and, if the radio was on when the
   *  learner left, turn it on again. */
  init(): Promise<void> {
    const cfg = this.deps.config;
    if (!cfg || !this.state.available || this.state.ready) return Promise.resolve();
    this.loading ??= (async () => {
      try {
        this.songs = readSongList(await this.deps.fetchJson(cfg.index));
        if (!this.songs.length) throw new Error("no songs");
        this.byId = new Map(this.songs.map((s) => [s.id, s]));
        this.reorder();
        this.cursor = this.saved.song && this.order.includes(this.saved.song) ? this.saved.song : null;
        this.resumeAt = this.cursor ? this.saved.at : 0;
        this.set({ ready: true, failed: false, song: this.cursor ? this.byId.get(this.cursor)! : null });
        if (this.saved.on && !this.state.on) this.set({ on: true });
        if (this.state.on) this.start(false);
      } catch {
        if (this.state.on) this.set({ failed: true });
      } finally {
        this.loading = null;
      }
    })();
    return this.loading;
  }

  private reorder() {
    const station = this.stationOf(this.state.station);
    this.order = station ? stationOrder(this.songs, station, this.state.shuffle, this.saved.seed) : [];
  }

  private newSeed() { this.saved.seed = Math.floor((this.deps.random ?? Math.random)() * 0xffffffff) >>> 0; }

  // ---------------------------------------------------------------- what the learner does

  /** The toolbar's button: the first press turns the radio on and shows its card; later ones show or hide the card. */
  press() {
    if (!this.state.available) return;
    if (!this.state.on) { this.set({ open: true }); this.setOn(true); return; }
    this.set({ open: !this.state.open });
  }

  setOpen(open: boolean) { this.set({ open }); }

  /** Play or pause. Call it from a tap: that is what lets the browser play at all. */
  setOn(on: boolean) {
    if (!this.state.available) return;
    if (!on) {
      clearTimeout(this.resumeTimer);
      this.silence();
      this.set({ on: false, needsTap: false });
      this.save();
      return;
    }
    this.deps.output.unlock();
    this.failures = 0;
    this.set({ on: true, failed: false });
    this.save();
    if (this.state.ready) this.start(false);
    else void this.init();
  }

  toggle() { this.setOn(!this.state.on); }
  next() { this.go(1); }
  previous() { this.go(-1); }

  setStation(id: string) {
    const station = this.deps.stations.find((s) => s.id === id);
    if (!station || station.id === this.state.station) return;
    // the learner's own choice of shuffle stays; without one the station starts as it likes
    this.set({ station: station.id, shuffle: this.saved.shuffle ?? station.shuffle });
    this.newSeed();
    this.reorder();
    this.cursor = null;
    if (this.order.length) this.playSong(this.order[0], 0);
    else this.save();
  }

  setShuffle(shuffle: boolean) {
    if (shuffle === this.state.shuffle) return;
    this.saved.shuffle = shuffle;
    this.set({ shuffle });
    if (shuffle) this.newSeed();
    this.reorder();
    // a new shuffle goes on from the song that is playing; the list's own order continues from it too
    if (shuffle && this.cursor) this.order = [this.cursor, ...this.order.filter((id) => id !== this.cursor)];
    this.save();
  }

  setLyrics(lyrics: boolean) { this.set({ lyrics }); this.save(); }

  /** The game's volume changed. */
  volumeChanged() { if (!this.holds.size) this.deps.output.setVolume(this.level()); }

  /** A tap or a key anywhere in the game: what a browser may have been waiting for. */
  gesture() {
    if (!this.state.on) return;
    this.deps.output.unlock();
    if (this.state.needsTap && !this.holds.size) this.start(false);
  }

  /** The learner walked into a place whose conversation is built on one of these songs: the first of them that the
   *  course has, and that wasn't offered in this visit yet, plays next, out of the station's turn. */
  suggest(ids: (string | null)[]) {
    const id = ids.find((x): x is string => !!x && this.byId.has(x) && !this.suggested.has(x) && x !== this.state.song?.id);
    if (!id) return;
    this.suggested.add(id);
    this.queued = id;
    this.set({ upNext: this.byId.get(id)! });
    if (this.state.playing) this.deps.output.prepare?.(this.audioUrl(this.byId.get(id)!));
  }

  /** Seconds into the song. */
  position(): number { return this.state.playing ? this.deps.output.position() : this.resumeAt; }

  // ---------------------------------------------------------------- holds

  /** Something that the music must not sound over begins. `now`: no fade (a microphone). */
  hold(reason: Hold, now = false) {
    const first = !this.holds.size;
    this.holds.add(reason);
    clearTimeout(this.resumeTimer);
    if (!this.state.held) this.set({ held: true });
    if (now) { this.silence(); return; }
    if (!first || !this.sounding()) return;
    this.deps.output.setVolume(0, FADE_OUT_MS);
    clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => this.silence(), FADE_OUT_MS);
  }

  /** It is over. When nothing else holds the radio, the music comes back a moment later. */
  release(reason: Hold) {
    if (!this.holds.delete(reason) || this.holds.size) return;
    this.set({ held: false });
    clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => { if (this.state.on) this.start(true); }, RESUME_AFTER_MS);
  }

  /** The output is playing or about to. */
  private sounding() { return this.state.playing || this.starting; }
  private starting = false;

  /** Stop the sound now and remember the place. */
  private silence() {
    clearTimeout(this.fadeTimer);
    if (this.sounding()) this.resumeAt = this.deps.output.position();
    this.run++;
    this.starting = false;
    this.deps.output.pause();
    this.stopSaving();
    if (this.state.playing) this.set({ playing: false });
  }

  // ---------------------------------------------------------------- playing

  /** A song's recording: the address that played it before, else the first to try. */
  private audioUrl(song: SongMeta, index = this.played.get(song.id) ?? 0) {
    const urls = songAudioUrls(this.deps.config!, song, this.deps.token());
    return urls[Math.min(index, urls.length - 1)];
  }
  /** which of a song's addresses played it (the files folder, or the course's site for a free example) */
  private played = new Map<string, number>();
  private attempt: { song: SongMeta; at: number; fadeIn: boolean; index: number } | null = null;

  /** Begin, or go on with, the song the radio is at. */
  private start(fadeIn: boolean) {
    if (!this.state.on || !this.state.ready || this.holds.size || this.sounding()) return;
    let song = this.state.song;
    if (!song) {
      // the first song of this visit: one waiting out of turn, else where the station was, else its first
      const id = this.queued ?? this.cursor ?? this.order[0];
      song = (id && this.byId.get(id)) || null;
      if (!song) { this.set({ failed: true }); return; }
      if (id === this.queued) { this.queued = null; this.set({ upNext: null }); } else this.cursor = id;
      this.resumeAt = id === this.saved.song ? this.saved.at : 0;
    }
    this.sound(song, this.resumeAt, fadeIn);
  }

  /** Move to the next (1) or the previous (-1) song. */
  private go(dir: 1 | -1) {
    if (!this.state.ready) return;
    let id: string | null, turn = true;
    const outOfTurn = !!this.state.song && this.state.song.id !== this.cursor;
    if (dir > 0 && this.queued) {
      id = this.queued;
      turn = false; // the station stays where it is
      this.queued = null;
      this.set({ upNext: null });
    } else if (dir < 0 && outOfTurn && this.cursor) {
      id = this.cursor; // back from a song played out of turn: the station's own song again
    } else {
      const moved = step(this.order, this.cursor, dir);
      id = moved.id;
      if (moved.wrapped && this.state.shuffle && this.order.length > 1) {
        const last = this.cursor;
        this.newSeed();
        this.reorder();
        id = this.order[0] === last ? this.order[1] : this.order[0];
      }
      this.cursor = id;
    }
    if (id) this.playSong(id, 0, turn);
  }

  /** `turn`: the song is the station's own next one (false: one played out of turn, the station keeps its place). */
  private playSong(id: string, at: number, turn = true) {
    const song = this.byId.get(id);
    if (!song) return;
    if (turn && this.order.includes(id)) this.cursor = id;
    this.silence();
    this.resumeAt = at;
    this.set({ song, timeline: this.lines.get(id) ?? null, needsTap: false });
    this.save();
    if (this.state.on && !this.holds.size) this.sound(song, at, false);
  }

  /** The one place a sound starts. `index`: which of the song's addresses to try. */
  private sound(song: SongMeta, at: number, fadeIn: boolean, index = this.played.get(song.id) ?? 0) {
    if (this.holds.size || !this.state.on) return;
    const run = ++this.run, out = this.deps.output;
    this.starting = true;
    this.attempt = { song, at, fadeIn, index };
    if (this.state.song !== song) this.set({ song, timeline: this.lines.get(song.id) ?? null });
    out.setVolume(fadeIn ? 0 : this.level());
    out.play(this.audioUrl(song, index), at).then((sounds) => {
      if (run !== this.run) return;
      this.starting = false;
      if (!sounds) return;
      // a hold that came while the song was loading has silenced it already (run moved on); this is belt and braces
      if (this.holds.size || !this.state.on) { out.pause(); return; }
      this.failures = 0;
      this.played.set(song.id, index);
      if (fadeIn) out.setVolume(this.level(), FADE_IN_MS);
      this.set({ playing: true, needsTap: false, failed: false });
      this.startSaving();
      const ahead = this.peekNext();
      if (ahead) out.prepare?.(this.audioUrl(ahead));
    }, (error) => {
      if (run !== this.run) return;
      this.starting = false;
      if (error instanceof NeedsTap) { this.set({ playing: false, needsTap: true }); return; }
      this.startFailed();
    });
    this.loadLines(song);
  }

  /** The recording didn't start: its other address is tried (a free example lives on the course's site), then the
   *  song is given up. */
  private startFailed() {
    const a = this.attempt;
    this.attempt = null;
    if (a && a.index + 1 < songAudioUrls(this.deps.config!, a.song, null).length) { this.sound(a.song, a.at, a.fadeIn, a.index + 1); return; }
    this.songFailed();
  }

  private peekNext(): SongMeta | null {
    const id = this.queued ?? step(this.order, this.cursor, 1).id;
    return (id && id !== this.state.song?.id && this.byId.get(id)) || null;
  }

  private songFailed() {
    this.set({ playing: false });
    if (++this.failures >= MAX_FAILURES || this.order.length < 2) {
      this.failures = 0;
      this.set({ on: false, failed: true });
      this.save();
      return;
    }
    this.go(1);
  }

  private stopped(reason: "error" | "interrupted") {
    if (!this.state.playing && !this.starting) return;
    if (reason === "error") {
      const starting = this.starting;
      this.run++; this.starting = false; this.stopSaving();
      if (starting) this.startFailed(); else this.songFailed();
      return;
    }
    // taken away by the system: it waits where it was for the next tap
    this.resumeAt = this.deps.output.position();
    this.run++;
    this.starting = false;
    this.stopSaving();
    this.set({ playing: false, needsTap: true });
  }

  private loadLines(song: SongMeta) {
    if (this.lines.has(song.id)) return;
    const urls = songDataUrls(this.deps.config!, song.id, this.deps.token());
    const read = (i: number): Promise<unknown> => this.deps.fetchJson(urls[i]).catch((error) => { if (i + 1 < urls.length) return read(i + 1); throw error; });
    void read(0).then(
      (data) => { const lines = readSongLines(data); return lines.length ? buildTimeline(lines) : null; },
      () => undefined, // not kept: asked for again the next time the song plays
    ).then((timeline) => {
      if (timeline === undefined) return;
      if (this.lines.size >= 12) this.lines.delete(this.lines.keys().next().value!);
      this.lines.set(song.id, timeline);
      if (this.state.song?.id === song.id) this.set({ timeline });
    });
  }

  // ---------------------------------------------------------------- remembered in this browser

  save() {
    const s = this.state;
    this.saved = { ...this.saved, on: s.on, station: s.station, lyrics: s.lyrics };
    // before the list has arrived the radio doesn't know its place yet: what was remembered stays
    if (s.ready) { this.saved.song = this.cursor; this.saved.at = s.song && s.song.id === this.cursor ? Math.floor(this.position()) : 0; }
    storeSaved(this.deps.storageKey, this.saved);
  }

  private startSaving() { this.stopSaving(); this.saveTimer = setInterval(() => this.save(), SAVE_EVERY_MS); }
  private stopSaving() { clearInterval(this.saveTimer); this.saveTimer = undefined; }

  /** The game is going away. */
  shutdown() {
    if (this.state.ready) this.save();
    clearTimeout(this.resumeTimer);
    this.silence();
    this.set({ open: false });
  }
}
