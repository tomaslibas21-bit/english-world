// The town's radio: the course's songs while you walk around. This file is the radio itself, with everything it needs
// handed in (so the tests run it without a browser); src/radio/index.ts builds the game's one radio and ties it to
// the conversation, the voices and the microphone.
//
// Two rules above all:
//   1. Music never plays into speech recognition. The radio is silent while anything holds it (hold()): an open
//      conversation, a voice clip, a microphone. Nothing here starts sound while a hold stands.
//   2. Sound starts only from start(), and start() checks rule 1 last, right before the output plays.
import { createStore, type StoreApi } from "zustand/vanilla";
import { buildTimeline, withSungTranslations, type Timeline } from "./lyrics";
import { NeedsTap, type RadioOutput } from "./output";
import type { FavoriteStore } from "./favorites";
import { loadSaved, nextStation, shuffled, stationOrder, stationSongs, step, storeSaved, type RadioSaved, type Station } from "./playlist";
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
  /** the station's songs are in a shuffled order: the learner's shuffle key, or a station that always is (the mix) */
  shuffle: boolean;
  /** how many songs each station has (by station id); one with none is not offered */
  counts: Record<string, number>;
  /** where the song is in its station's order ("3 of 31"); null for a song played out of turn */
  place: { n: number; of: number } | null;
  /** the song has the learner's heart (it is among the course's favorite songs) */
  liked: boolean;
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
  /** the note of the radio before the stations became the course's kinds of song (playlist.ts loadSaved) */
  storageBefore?: string;
  /** the course's favorite songs (favorites.ts); without them the radio has no heart */
  favorites?: FavoriteStore;
  random?: () => number;
  /** a soft tuning sweep, when the learner changes station (never needed for the music itself) */
  tune?: () => void;
}

/** Music sits under the voices: this share of the game's volume. */
export const MUSIC_LEVEL = 0.6;
/** Never a hard cut: turning the radio on or off, and a conversation, fade over about a second; a voice in the town
 *  a little faster. The one exception is a microphone, which silences it at once. */
export const FADE_IN_MS = 1000;
export const FADE_OUT_MS = 900;
export const VOICE_FADE_MS = 500;
/** Skipping a song is a short dip: out, then the new song in. */
export const SKIP_OUT_MS = 220;
export const SKIP_IN_MS = 500;
/** Turned on again while it was still fading out: the music just lifts again. */
const LIFT_MS = 400;
/** The music comes back this long after the last hold is gone, fading in. */
export const RESUME_AFTER_MS = 700;
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
  private hearts: ReadonlySet<string> = new Set();
  private suggested = new Set<string>();
  private resumeAt = 0;
  private holds = new Set<Hold>();
  private run = 0;
  private failures = 0;
  private loading: Promise<void> | null = null;
  private lines = new Map<string, Timeline | null>();
  private fadeTimer: ReturnType<typeof setTimeout> | undefined;
  private switchTimer: ReturnType<typeof setTimeout> | undefined;
  private resumeTimer: ReturnType<typeof setTimeout> | undefined;
  private saveTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private deps: RadioDeps) {
    this.saved = loadSaved(deps.storageKey, deps.storageBefore);
    if (!this.saved.station) this.newSeed(); // a first visit: its own shuffle
    const station = this.stationOf(this.saved.station);
    this.store = createStore<RadioState>(() => ({
      available: !!deps.config && deps.stations.length > 0,
      ready: false, on: false, playing: false, held: false, needsTap: false, failed: false,
      station: station?.id ?? "", shuffle: shuffled(station, this.saved.shuffle), counts: {}, place: null, liked: false,
      lyrics: this.saved.lyrics, open: false, song: null, timeline: null, upNext: null,
    }));
    deps.output.onEnded = () => this.go(1, true);
    deps.output.onStopped = (reason) => this.stopped(reason);
  }

  private get state() { return this.store.getState(); }
  private set(patch: Partial<RadioState>) {
    this.store.setState(patch);
    if ("song" in patch || "station" in patch) this.mark();
  }
  private stationOf(id: string): Station | undefined { return this.deps.stations.find((s) => s.id === id) ?? this.deps.stations[0]; }
  /** The station to play: `id`'s, or the first one that has songs when that one has none (a course without that
   *  kind of song, the favorites with no heart left). */
  private stationWithSongs(id: string): Station | undefined {
    const has = (s: Station) => (this.state.counts[s.id] ?? 0) > 0;
    const station = this.stationOf(id);
    return station && has(station) ? station : this.deps.stations.find(has) ?? station;
  }
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
        this.hearts = new Set(this.deps.favorites?.list() ?? []);
        this.recount();
        const station = this.stationWithSongs(this.state.station);
        if (station && station.id !== this.state.station) this.set({ station: station.id, shuffle: shuffled(station, this.saved.shuffle) });
        this.reorder();
        const kept = this.saved.song ?? this.saved.places[this.state.station] ?? null;
        this.cursor = kept && this.order.includes(kept) ? kept : null;
        this.resumeAt = this.cursor && this.cursor === this.saved.song ? this.saved.at : 0;
        this.set({ ready: true, failed: false, song: this.cursor ? this.byId.get(this.cursor)! : null });
        if (this.saved.on && !this.state.on) this.set({ on: true });
        if (this.state.on) this.start(FADE_IN_MS);
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
    this.order = station ? stationOrder(this.songs, station, this.state.shuffle, this.saved.seed, this.hearts) : [];
    this.mark();
  }

  private recount() {
    this.set({ counts: Object.fromEntries(this.deps.stations.map((s) => [s.id, stationSongs(this.songs, s, this.hearts).length])) });
  }

  /** What the set shows about the song: its place in the station's order, and its heart. */
  private mark() {
    const s = this.state, id = s.song?.id ?? null;
    const i = id && id === this.cursor ? this.order.indexOf(id) : -1;
    const place = i >= 0 ? { n: i + 1, of: this.order.length } : null;
    const liked = !!id && this.hearts.has(id);
    if (place?.n !== s.place?.n || place?.of !== s.place?.of || liked !== s.liked) this.store.setState({ place, liked });
  }

  private newSeed() { this.saved.seed = Math.floor((this.deps.random ?? Math.random)() * 0xffffffff) >>> 0; }

  // ---------------------------------------------------------------- what the learner does

  /** The toolbar's button, the radio's power switch: one press on, the next off. The very first time it is turned
   *  on, the radio set opens by itself, so the learner finds the stations. Switched off, an open set folds away:
   *  off looks off. (The set's own knob leaves the set open: the learner is using it.) */
  power() {
    if (!this.state.available) return;
    if (this.state.on) this.set({ open: false });
    else if (!this.saved.introduced) { this.saved.introduced = true; this.set({ open: true }); }
    this.setOn(!this.state.on);
  }

  setOpen(open: boolean) { this.set({ open }); }

  /** On or off, with a fade. Call it from a tap: that is what lets the browser play at all. */
  setOn(on: boolean) {
    if (!this.state.available) return;
    const out = this.deps.output;
    if (!on) {
      clearTimeout(this.resumeTimer);
      clearTimeout(this.switchTimer);
      this.set({ on: false, needsTap: false });
      if (this.state.playing && !this.holds.size) {
        out.setVolume(0, FADE_OUT_MS);
        clearTimeout(this.fadeTimer);
        this.fadeTimer = setTimeout(() => this.silence(), FADE_OUT_MS);
      } else this.silence();
      this.save();
      return;
    }
    out.unlock();
    this.failures = 0;
    this.set({ on: true, failed: false });
    this.save();
    if (this.state.playing) {
      // still fading out from a moment ago: it lifts again from where it is
      clearTimeout(this.fadeTimer);
      if (!this.holds.size) out.setVolume(this.level(), LIFT_MS);
      this.startSaving();
      return;
    }
    if (this.state.ready) this.start(FADE_IN_MS);
    else void this.init();
  }

  toggle() { this.setOn(!this.state.on); }
  next() { this.go(1); }
  previous() { this.go(-1); }

  /** The learner picks a station. It goes on from where it was left (from that song's beginning), or starts at its
   *  first song. A station with no songs can't be picked. */
  setStation(id: string) {
    const station = this.deps.stations.find((s) => s.id === id);
    if (!station || station.id === this.state.station) return;
    if (this.state.ready && !(this.state.counts[station.id] > 0)) return;
    this.tuneTo(station);
    if (this.state.on && !this.holds.size) this.deps.tune?.();
    if (this.cursor) this.playSong(this.cursor, 0);
    else this.save();
  }

  /** Move to `station`: its order, and its place in it (where it was left, else its first song; `at` "last": its
   *  last song, for a step back from the first song of the station after it). The station being left keeps its
   *  place. */
  private tuneTo(station: Station, at?: "last") {
    if (this.cursor) this.saved.places[this.state.station] = this.cursor;
    const shuffle = shuffled(station, this.saved.shuffle);
    this.set({ station: station.id, shuffle });
    if (shuffle) this.newSeed();
    this.reorder();
    const kept = at ? undefined : this.saved.places[station.id];
    if (kept && this.order.includes(kept)) {
      // a new shuffle goes on from the song the station was left at
      if (shuffle) this.order = [kept, ...this.order.filter((id) => id !== kept)];
      this.cursor = kept;
    } else this.cursor = (at ? this.order[this.order.length - 1] : this.order[0]) ?? null;
    delete this.saved.places[station.id];
    this.mark();
  }

  /** The shuffle key: the station's songs in a shuffled order, or in the course's again. The mix is always shuffled;
   *  the key changes nothing there, and is kept for the other stations. */
  setShuffle(shuffle: boolean) {
    const station = this.stationOf(this.state.station);
    if (station?.kind === "mix" || shuffle === this.saved.shuffle) return;
    this.saved.shuffle = shuffle;
    this.set({ shuffle });
    if (shuffle) this.newSeed();
    this.reorder();
    // a new shuffle goes on from the song that is playing; the course's own order continues from it too
    if (shuffle && this.cursor) { this.order = [this.cursor, ...this.order.filter((id) => id !== this.cursor)]; this.mark(); }
    this.save();
  }

  /** The heart: the song that is playing joins the course's favorite songs, or leaves them. */
  like() {
    const song = this.state.song;
    if (!song || !this.deps.favorites) return;
    this.deps.favorites.toggle(song.id);
    this.favoritesChanged();
  }

  /** The course's favorites changed (the heart here, or the course's own page in another tab). */
  favoritesChanged() {
    if (!this.deps.favorites) return;
    this.hearts = new Set(this.deps.favorites.list());
    if (!this.state.ready) return;
    this.recount();
    // the favorites' own station plays on in its new order, from the song it is at
    if (this.stationOf(this.state.station)?.kind === "favorites") this.reorder();
    else this.mark();
  }

  setLyrics(lyrics: boolean) { this.set({ lyrics }); this.save(); }

  /** The game's volume changed. */
  volumeChanged() { if (!this.holds.size) this.deps.output.setVolume(this.level()); }

  /** A tap or a key anywhere in the game: what a browser may have been waiting for. */
  gesture() {
    if (!this.state.on) return;
    this.deps.output.unlock();
    if (this.state.needsTap && !this.holds.size) this.start(FADE_IN_MS);
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

  /** Something that the music must not sound over begins: it fades out and pauses. `now`: no fade (a microphone). */
  hold(reason: Hold, now = false) {
    const first = !this.holds.size;
    this.holds.add(reason);
    clearTimeout(this.resumeTimer);
    if (!this.state.held) this.set({ held: true });
    if (now) { this.silence(); return; }
    if (!first || !this.sounding()) return;
    const ms = reason === "voice" ? VOICE_FADE_MS : FADE_OUT_MS;
    this.deps.output.setVolume(0, ms);
    clearTimeout(this.fadeTimer);
    this.fadeTimer = setTimeout(() => this.silence(), ms);
  }

  /** It is over. When nothing else holds the radio, the music comes back a moment later. */
  release(reason: Hold) {
    if (!this.holds.delete(reason) || this.holds.size) return;
    this.set({ held: false });
    clearTimeout(this.resumeTimer);
    this.resumeTimer = setTimeout(() => { if (this.state.on) this.start(FADE_IN_MS); }, RESUME_AFTER_MS);
  }

  /** The output is playing or about to. */
  private sounding() { return this.state.playing || this.starting; }
  private starting = false;

  /** Stop the sound now and remember the place. */
  private silence() {
    clearTimeout(this.fadeTimer);
    clearTimeout(this.switchTimer);
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
  private attempt: { song: SongMeta; at: number; fade: number; index: number } | null = null;

  /** Begin, or go on with, the song the radio is at, fading in over `fade` ms. */
  private start(fade: number) {
    if (!this.state.on || !this.state.ready || this.holds.size || this.sounding()) return;
    let song = this.state.song;
    if (!song) {
      // the first song of this visit: where the station was, else its first. (A song waiting out of turn, the one
      // of the place the learner stands in, comes after it: the radio starts where the course's songs start.)
      const id = this.cursor ?? this.order[0];
      song = (id && this.byId.get(id)) || null;
      if (!song) { this.set({ failed: true }); return; }
      this.cursor = id;
      this.resumeAt = id === this.saved.song ? this.saved.at : 0;
    }
    this.sound(song, this.resumeAt, fade);
  }

  /** Move to the next (1) or the previous (-1) song. `auto`: the song before ended by itself (or wouldn't play), so
   *  the next one starts at once; the learner's own skip is a short dip. */
  private go(dir: 1 | -1, auto = false) {
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
      // the station has played to its end (or the learner stepped back from its first song, or it has no songs
      // left): on to the next of the course's kinds of song, or back to the last song of the one before
      const onward = moved.wrapped || moved.before || !this.order.length;
      const station = this.stationOf(this.state.station);
      const next = onward && station?.kind !== "mix" && !(station?.kind === "favorites" && this.order.length)
        ? nextStation(this.deps.stations, this.state.counts, this.state.station, dir) : null;
      if (next) {
        delete this.saved.places[this.state.station]; // it starts from its beginning the next time
        this.cursor = null;
        this.tuneTo(next, moved.before ? "last" : undefined);
        id = this.cursor;
      } else if (moved.wrapped && this.state.shuffle && this.order.length > 1) {
        // nowhere to move on to (the mix, the favorites): a new shuffle; the song just heard, if it comes out
        // first, goes to the round's end instead
        const last = this.cursor;
        this.newSeed();
        this.reorder();
        if (this.order[0] === last) this.order = [...this.order.slice(1), last!];
        id = this.order[0];
      }
      this.cursor = id;
      this.mark();
    }
    if (id) this.playSong(id, 0, turn, !auto);
  }

  /** `turn`: the song is the station's own next one (false: one played out of turn, the station keeps its place).
   *  `dip`: the learner asked for it while music sounds, so the old song dips out before the new one comes in. */
  private playSong(id: string, at: number, turn = true, dip = true) {
    const song = this.byId.get(id);
    if (!song) return;
    if (turn && this.order.includes(id)) this.cursor = id;
    const out = this.deps.output;
    if (!(dip && this.state.playing && this.state.on && !this.holds.size)) {
      this.silence();
      this.resumeAt = at;
      this.set({ song, timeline: this.lines.get(id) ?? null, needsTap: false });
      this.save();
      if (this.state.on && !this.holds.size) this.sound(song, at, dip ? SKIP_IN_MS : 0);
      return;
    }
    // the old song is still sounding for a moment, but the radio is already at the new one
    clearTimeout(this.fadeTimer);
    clearTimeout(this.switchTimer);
    this.run++;
    this.starting = false;
    this.stopSaving();
    this.resumeAt = at;
    this.set({ song, timeline: this.lines.get(id) ?? null, needsTap: false, playing: false });
    this.save();
    out.setVolume(0, SKIP_OUT_MS);
    this.switchTimer = setTimeout(() => {
      out.pause();
      if (this.state.on && !this.holds.size) this.sound(song, at, SKIP_IN_MS);
    }, SKIP_OUT_MS);
  }

  /** The one place a sound starts. `fade`: how long it fades in (0: at once, a song following another);
   *  `index`: which of the song's addresses to try. */
  private sound(song: SongMeta, at: number, fade: number, index = this.played.get(song.id) ?? 0) {
    if (this.holds.size || !this.state.on) return;
    const run = ++this.run, out = this.deps.output;
    this.starting = true;
    this.attempt = { song, at, fade, index };
    if (this.state.song !== song) this.set({ song, timeline: this.lines.get(song.id) ?? null });
    out.setVolume(fade ? 0 : this.level());
    out.play(this.audioUrl(song, index), at).then((sounds) => {
      if (run !== this.run) return;
      this.starting = false;
      if (!sounds) return;
      // a hold that came while the song was loading has silenced it already (run moved on); this is belt and braces
      if (this.holds.size || !this.state.on) { out.pause(); return; }
      this.failures = 0;
      this.played.set(song.id, index);
      if (fade) out.setVolume(this.level(), fade);
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
    if (a && a.index + 1 < songAudioUrls(this.deps.config!, a.song, null).length) { this.sound(a.song, a.at, a.fade, a.index + 1); return; }
    this.songFailed();
  }

  /** The song that will follow, when it is known already (to have its recording ready): not across a new shuffle. */
  private peekNext(): SongMeta | null {
    let id = this.queued;
    if (!id) {
      const ahead = step(this.order, this.cursor, 1);
      id = ahead.id;
      if (ahead.wrapped) {
        const station = this.stationOf(this.state.station);
        const next = station?.kind ? null : nextStation(this.deps.stations, this.state.counts, this.state.station);
        if (next ? shuffled(next, this.saved.shuffle) : this.state.shuffle) id = null;
        else if (next) {
          const songs = stationSongs(this.songs, next, this.hearts), kept = this.saved.places[next.id];
          id = (kept && songs.some((x) => x.id === kept) ? kept : songs[0]?.id) ?? null;
        }
      }
    }
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
    this.go(1, true);
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
      (data) => { const lines = readSongLines(data); return lines.length ? buildTimeline(withSungTranslations(lines)) : null; },
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
