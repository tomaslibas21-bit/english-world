// The town's radio (src/radio/): where the songs' files are, the lyric clocks, the playing order, what is remembered,
// and above all that music never sounds over a conversation, a voice or a microphone.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureAudio, watchMicrophone } from "../src/convo/audioFocus";
import { STATIONS, songOfSituation } from "../src/content/radio";
import { SITUATIONS } from "../src/content/situations";
import { buildTimeline, lineAt, shortGloss, unitAt, wordsBegun } from "../src/radio/lyrics";
import { BufferOutput, NeedsTap, type RadioOutput } from "../src/radio/output";
import { readSaved, stationOrder, step, type Station } from "../src/radio/playlist";
import { FADE_OUT_MS, MUSIC_LEVEL, RESUME_AFTER_MS, Radio, type RadioDeps } from "../src/radio/radio";
import { radioConfig, readSongLines, readSongList, songAudioUrls, songDataUrls, type SongLine, type SongMeta } from "../src/radio/songs";

const song = (id: string, g = "pop", a = `/songs/audio/${id}.mp3`): SongMeta => ({ id, c: "g", n: 1, t: `Song ${id}`, tl: `Daina ${id}`, tp: "", g, d: 200, a });
const line = (s: number, words: [number, number][], units: [string, string, number][]): SongLine =>
  ({ s, e: words[words.length - 1][1], src: units.map((u) => u[0]).join(" "), lt: "", u: units, w: words, wt: units.map((u) => u[0]) });

describe("where the songs' files are", () => {
  it("has no radio without a song list", () => {
    expect(radioConfig({})).toBeNull();
    expect(radioConfig({ VITE_RADIO_INDEX: "  " })).toBeNull();
    expect(radioConfig({ VITE_RADIO_INDEX: "/songs/index.json", VITE_RADIO_FILES: "https://files.example/course/" }))
      .toEqual({ index: "/songs/index.json", files: "https://files.example/course", recordings: null });
  });

  it("reads English Master's songs from its files folder with the token, then from the site (a free example)", () => {
    const cfg = radioConfig({ VITE_RADIO_INDEX: "/songs/index.json", VITE_RADIO_FILES: "https://audio.example/fluent-steps" })!;
    expect(songDataUrls(cfg, "G05", "tok/en")).toEqual(["https://audio.example/fluent-steps/songs/data/G05.json?t=tok%2Fen", "/songs/data/G05.json"]);
    expect(songAudioUrls(cfg, song("G05"), "tok")).toEqual(["https://audio.example/fluent-steps/songs/audio/G05.mp3?t=tok", "/songs/audio/G05.mp3"]);
    expect(songAudioUrls(cfg, song("G05"), null)[0]).toBe("https://audio.example/fluent-steps/songs/audio/G05.mp3");
  });

  it("plays a recording named in the other edition's folder through this course's own files folder", () => {
    const cfg = radioConfig({ VITE_RADIO_INDEX: "/songs/index.json", VITE_RADIO_FILES: "https://audio.example/spanish-master-en", VITE_RADIO_RECORDINGS: "https://audio.example/spanish-master" })!;
    const sv64 = song("SV64", "dancehall latino", "https://audio.example/spanish-master/songs/v1/SV64-en.mp3");
    expect(songAudioUrls(cfg, sv64, "tok")).toEqual(["https://audio.example/spanish-master-en/songs/v1/SV64-en.mp3?t=tok"]);
    expect(songDataUrls(cfg, "SV64", "tok")[0]).toBe("https://audio.example/spanish-master-en/songs/data/SV64.json?t=tok");
  });

  it("never sends the token to an address outside the course's files folder", () => {
    const cfg = radioConfig({ VITE_RADIO_INDEX: "/songs/index.json", VITE_RADIO_FILES: "https://audio.example/fluent-steps" })!;
    for (const a of ["https://elsewhere.example/x.mp3", "https://audio.example/fluent-steps-other/x.mp3", "//elsewhere.example/x.mp3"]) {
      expect(songAudioUrls(cfg, song("X", "pop", a), "secret")).toEqual([a]);
    }
    for (const url of [songAudioUrls(cfg, song("G05"), "secret")[1], songDataUrls(cfg, "G05", "secret")[1]]) expect(url).not.toContain("secret");
  });

  it("reads the files from the list's own site when no files folder is set (a local trial)", () => {
    const cfg = radioConfig({ VITE_RADIO_INDEX: "/songs/index.json" })!;
    expect(songDataUrls(cfg, "G01", "tok")).toEqual(["/songs/data/G01.json"]);
    expect(songAudioUrls(cfg, song("G01"), "tok")).toEqual(["/songs/audio/G01.mp3"]);
  });

  it("keeps only what can be played or shown", () => {
    expect(readSongList({ songs: [song("A"), { id: "B" }, null, { ...song("C"), d: "x" }] }).map((s) => [s.id, s.d])).toEqual([["A", 200], ["C", 0]]);
    expect(readSongList(null)).toEqual([]);
    expect(readSongLines({ L: [line(1, [[1, 2]], [["Hi", "Labas", 1]]), { s: 1 }, { s: 1, e: 2, u: [], w: [] }] })).toHaveLength(1);
  });
});

describe("the lyric clocks", () => {
  const lines = [
    line(10, [[10, 10.4], [10.5, 11], [11.1, 12]], [["Every evening,", "Kiekvieną vakarą,", 2], ["home", "namo", 1]]),
    line(13, [[13, 14]], [["again", "vėl", 1]]),
    line(30, [[30, 31]], [["Later", "Vėliau", 1]]), // after a long break
  ];
  const tl = buildTimeline(lines);

  it("shows a line a moment before it is sung and until the next one", () => {
    expect(lineAt(tl, 0)).toBe(-1);
    expect(lineAt(tl, 8.9)).toBe(-1);
    expect(lineAt(tl, 9)).toBe(0);
    expect(lineAt(tl, 12.4)).toBe(0);
    expect(lineAt(tl, 12.6)).toBe(1);
  });

  it("takes the line away in a long break and after the last word", () => {
    expect(lineAt(tl, 15.8)).toBe(1);
    expect(lineAt(tl, 16)).toBe(-1);
    expect(lineAt(tl, 25)).toBe(-1);
    expect(lineAt(tl, 29.6)).toBe(2);
    expect(lineAt(tl, 33)).toBe(2);
    expect(lineAt(tl, 33.2)).toBe(-1);
  });

  it("follows the singing word by word, a unit of two words as one", () => {
    expect(wordsBegun(lines[0], 9.9)).toBe(0);
    expect(unitAt(lines[0], 9.9)).toBe(-1);
    expect(unitAt(lines[0], 9.96)).toBe(0); // a touch before the word, as in the song player
    expect(unitAt(lines[0], 10.6)).toBe(0); // the second word of the same unit
    expect(unitAt(lines[0], 11.2)).toBe(1);
    expect(unitAt(lines[0], 12.1)).toBe(2); // all sung
  });

  it("never falls over on a line whose word count and units disagree", () => {
    const odd = line(1, [[1, 2], [2, 3], [3, 4]], [["one", "vienas", 1]]);
    expect(unitAt(odd, 3.5)).toBe(0);
    expect(unitAt(odd, 4.5)).toBe(1);
  });

  it("keeps a gloss's meaning and drops its literal one", () => {
    expect(shortGloss("Lipkite! (šokite į vidų)")).toBe("Lipkite!");
    expect(shortGloss("(pažodžiui)")).toBe("(pažodžiui)");
    expect(shortGloss("namo")).toBe("namo");
  });
});

describe("the playing order", () => {
  const songs = ["A", "B", "C", "D", "E", "F"].map((id) => song(id));
  const all: Station = { id: "all", name: "All", lt: "", shuffle: true, has: () => true };

  it("keeps the list's own order, or one shuffle per seed", () => {
    expect(stationOrder(songs, all, false, 7)).toEqual(["A", "B", "C", "D", "E", "F"]);
    const a = stationOrder(songs, all, true, 7);
    expect(a).toEqual(stationOrder(songs, all, true, 7));
    expect([...a].sort()).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => stationOrder(songs, all, true, seed).join(""))).size).toBeGreaterThan(3);
  });

  it("goes forth and back, around the ends", () => {
    const order = ["A", "B", "C"];
    expect(step(order, "A", 1)).toEqual({ id: "B", wrapped: false });
    expect(step(order, "C", 1)).toEqual({ id: "A", wrapped: true });
    expect(step(order, "A", -1)).toEqual({ id: "C", wrapped: false });
    expect(step(order, "gone", 1)).toEqual({ id: "A", wrapped: false });
    expect(step(order, null, 1)).toEqual({ id: "A", wrapped: false });
    expect(step([], "A", 1)).toEqual({ id: null, wrapped: false });
  });

  it("Maple Harbor's stations find their songs in the course's genre text", () => {
    const [town, soul, sunny] = STATIONS;
    expect(town.has(song("X", "anything"))).toBe(true);
    expect(soul.has(song("X", "motown-flavored soul-funk"))).toBe(true);
    expect(soul.has(song("X", "80s synthwave road-trip pop"))).toBe(false);
    expect(sunny.has(song("X", "bossa nova / MPB"))).toBe(true);
    expect(sunny.has(song("X", "roots reggae"))).toBe(true);
    expect(sunny.has(song("X", "stomping indie folk-rock"))).toBe(false);
  });

  it("knows the course song of every conversation", () => {
    expect(songOfSituation({ song: 72 })).toBe("S72");
    expect(songOfSituation({ song: 31 })).toBe("S96");
    expect(songOfSituation({ song: 35 })).toBe("S100");
    expect(songOfSituation({ song: "P25" })).toBe("P25");
    for (const sit of SITUATIONS) expect(songOfSituation(sit), sit.id).toMatch(/^(S\d{2,3}|P\d{2})$/);
  });

  it("starts fresh from anything unreadable in storage", () => {
    expect(readSaved(null).on).toBe(false);
    expect(readSaved("{oops").lyrics).toBe(true);
    expect(readSaved(JSON.stringify({ on: true, station: 5, at: -3, lyrics: false, seed: "x" }))).toEqual({ on: true, station: "", shuffle: null, seed: 1, song: null, at: 0, lyrics: false });
  });
});

/** An output that records what the radio asks of it. */
class FakeOutput implements RadioOutput {
  onEnded: (() => void) | null = null;
  onStopped: ((reason: "error" | "interrupted") => void) | null = null;
  log: string[] = [];
  sounding = false;
  url = "";
  at = 0;
  volume = 1;
  /** how the next play() goes: it sounds, the browser wants a tap, or the recording is broken */
  next: "ok" | "tap" | "broken" = "ok";
  broken = new Set<string>();
  /** addresses that aren't there (a prefix) */
  missing: string[] = [];
  private run = 0;
  async play(url: string, at: number) {
    const run = ++this.run;
    this.log.push(`play ${url.replace(/\?.*/, "").split("/").pop()}@${at}`);
    await Promise.resolve();
    if (run !== this.run) return false;
    if (this.next === "tap") throw new NeedsTap();
    if (this.next === "broken" || this.broken.has(url.replace(/\?.*/, "").split("/").pop()!) || this.missing.some((m) => url.startsWith(m))) throw new Error("404");
    this.url = url; this.at = at; this.sounding = true;
    return true;
  }
  pause() { this.run++; if (this.sounding) this.log.push("pause"); this.sounding = false; }
  position() { return this.at; }
  setVolume(volume: number) { this.volume = volume; }
  unlock() { this.log.push("unlock"); }
  /** the last thing the radio played */
  get last() { return this.log.filter((l) => l.startsWith("play")).at(-1); }
  prepare(url: string) { this.log.push(`prepare ${url.replace(/\?.*/, "").split("/").pop()}`); }
}

describe("the radio", () => {
  const songs = ["A", "B", "C", "D"].map((id) => song(id, id === "C" ? "roots reggae" : "pop"));
  const stations: Station[] = [
    { id: "all", name: "All songs", lt: "visos", shuffle: false, has: () => true },
    { id: "reggae", name: "Reggae", lt: "regis", shuffle: false, has: (s) => /reggae/.test(s.g) },
  ];
  let out: FakeOutput, store: Record<string, string>, fetched: string[], token: string | null;
  const deps = (over: Partial<RadioDeps> = {}): RadioDeps => ({
    config: { index: "/songs/index.json", files: "https://files.example/course", recordings: null },
    stations, output: out, token: () => token, volume: () => 0.5, storageKey: "radio-test", random: () => 0.5,
    fetchJson: async (url) => {
      fetched.push(url);
      if (url === "/songs/index.json") return { songs };
      return { L: [line(1, [[1, 2]], [["Hi", "Labas", 1]])] };
    },
    ...over,
  });
  const settle = () => vi.advanceTimersByTimeAsync(0);
  const saved = () => JSON.parse(store["radio-test"] ?? "null");

  beforeEach(() => {
    vi.useFakeTimers();
    out = new FakeOutput(); store = {}; fetched = []; token = "tok";
    vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    vi.stubGlobal("navigator", {});
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("is not there without songs", () => {
    const radio = new Radio(deps({ config: null }));
    expect(radio.store.getState().available).toBe(false);
    radio.press();
    expect(radio.store.getState().on).toBe(false);
    expect(out.log).toEqual([]);
  });

  it("the first press turns it on, shows the card and plays the station's first song with the course's token", async () => {
    const radio = new Radio(deps());
    radio.press();
    expect(out.log).toEqual(["unlock"]); // in the tap itself, before anything is fetched
    await settle();
    const s = radio.store.getState();
    expect([s.on, s.open, s.playing, s.song?.id]).toEqual([true, true, true, "A"]);
    expect(out.url).toBe("https://files.example/course/songs/audio/A.mp3?t=tok");
    expect(out.volume).toBeCloseTo(0.5 * MUSIC_LEVEL);
    expect(fetched).toContain("https://files.example/course/songs/data/A.json?t=tok");
    expect(s.timeline?.lines).toHaveLength(1);
    radio.press();
    expect(radio.store.getState().open).toBe(false);
    expect(radio.store.getState().on).toBe(true); // closing the card doesn't stop the music
  });

  it("goes to the next song when one ends, and back and forth on request", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    out.onEnded!(); await settle();
    expect(radio.store.getState().song?.id).toBe("B");
    radio.next(); await settle();
    radio.next(); await settle();
    expect(radio.store.getState().song?.id).toBe("D");
    radio.next(); await settle();
    expect(radio.store.getState().song?.id).toBe("A");
    radio.previous(); await settle();
    expect(radio.store.getState().song?.id).toBe("D");
    expect(radio.store.getState().playing).toBe(true);
    expect(out.log).toContain("prepare A.mp3");
  });

  it("changes station and plays only that station's songs", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.setStation("reggae"); await settle();
    expect(radio.store.getState().song?.id).toBe("C");
    radio.next(); await settle();
    expect(radio.store.getState().song?.id).toBe("C");
    expect(saved().station).toBe("reggae");
  });

  it("a station starts shuffled or not as it likes, until the learner chooses", async () => {
    const mixed: Station[] = [stations[0], { ...stations[1], id: "mix", shuffle: true, has: () => true }];
    const radio = new Radio(deps({ stations: mixed }));
    await radio.init();
    expect(radio.store.getState().shuffle).toBe(false);
    radio.setStation("mix");
    expect(radio.store.getState().shuffle).toBe(true);
    radio.setShuffle(false);
    radio.setStation("all"); radio.setStation("mix");
    expect(radio.store.getState().shuffle).toBe(false); // the learner's choice goes along
    expect(saved().shuffle).toBe(false);
  });

  it("a shuffle plays every song once before any comes again", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.setShuffle(true);
    const heard = [radio.store.getState().song!.id];
    for (let i = 0; i < 3; i++) { radio.next(); await settle(); heard.push(radio.store.getState().song!.id); }
    expect([...heard].sort()).toEqual(["A", "B", "C", "D"]);
    radio.next(); await settle();
    expect(radio.store.getState().song!.id).not.toBe(heard[3]); // a new round doesn't begin with the song just heard
  });

  it("stops for a conversation and comes back after it, where it was", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    out.at = 42;
    radio.hold("conversation");
    expect(out.volume).toBe(0); // fading
    await vi.advanceTimersByTimeAsync(FADE_OUT_MS);
    expect(out.sounding).toBe(false);
    expect(radio.store.getState()).toMatchObject({ on: true, playing: false, held: true });
    radio.release("conversation");
    await vi.advanceTimersByTimeAsync(RESUME_AFTER_MS - 1);
    expect(out.sounding).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(out.sounding).toBe(true);
    expect(out.last).toBe("play A.mp3@42");
    expect(radio.store.getState()).toMatchObject({ playing: true, held: false });
  });

  it("is cut at once for a microphone, and stays silent until every hold is gone", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.hold("conversation");
    radio.hold("microphone", true);
    expect(out.sounding).toBe(false); // no waiting for the fade
    radio.release("microphone");
    await vi.advanceTimersByTimeAsync(5000);
    expect(out.sounding).toBe(false); // the conversation is still open
    radio.hold("voice"); radio.release("conversation");
    await vi.advanceTimersByTimeAsync(5000);
    expect(out.sounding).toBe(false);
    radio.release("voice");
    await vi.advanceTimersByTimeAsync(RESUME_AFTER_MS);
    expect(out.sounding).toBe(true);
  });

  it("hears the game's microphone itself: a lease silences it before the audio route changes", async () => {
    const radio = new Radio(deps());
    const order: string[] = [];
    vi.stubGlobal("navigator", { audioSession: { get type() { return "playback"; }, set type(v: string) { order.push(`route ${v} sounding=${out.sounding}`); } } });
    const unwatch = watchMicrophone((listening) => { if (listening) radio.hold("microphone", true); else radio.release("microphone"); });
    radio.setOn(true); await settle();
    expect(out.sounding).toBe(true);
    const lease = captureAudio();
    expect(order[0]).toBe("route auto sounding=false");
    expect(out.sounding).toBe(false);
    lease.ended();
    await vi.advanceTimersByTimeAsync(RESUME_AFTER_MS);
    expect(out.sounding).toBe(true);
    unwatch();
  });

  it("nothing starts it while a hold stands: not a press, not next, not a station, not a song that finished loading", async () => {
    const radio = new Radio(deps());
    await radio.init();
    radio.hold("conversation");
    radio.setOn(true); await settle();
    radio.next(); await settle();
    radio.setStation("reggae"); await settle();
    radio.gesture(); await settle();
    radio.volumeChanged();
    expect(out.log.filter((l) => l.startsWith("play"))).toEqual([]);
    expect(out.sounding).toBe(false);
    expect(radio.store.getState().song?.id).toBe("C"); // the choice is kept for afterwards
    radio.release("conversation");
    await vi.advanceTimersByTimeAsync(RESUME_AFTER_MS);
    expect(out.last).toBe("play C.mp3@0");
    // a hold that arrives while a song is still loading
    radio.next();
    radio.hold("microphone", true);
    await settle();
    expect(out.sounding).toBe(false);
    expect(radio.store.getState().playing).toBe(false);
  });

  it("a short voice doesn't leave it silent: a hold released during the fade still comes back", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.hold("voice");
    await vi.advanceTimersByTimeAsync(100);
    radio.release("voice");
    await vi.advanceTimersByTimeAsync(FADE_OUT_MS + RESUME_AFTER_MS);
    expect(out.sounding).toBe(true);
    expect(radio.store.getState()).toMatchObject({ playing: true, held: false });
  });

  it("pause is pause: no hold's end turns it back on", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.hold("conversation");
    await vi.advanceTimersByTimeAsync(FADE_OUT_MS);
    radio.setOn(false);
    radio.release("conversation");
    await vi.advanceTimersByTimeAsync(5000);
    expect(out.sounding).toBe(false);
    expect(saved().on).toBe(false);
  });

  it("remembers on, station, the song and the place in it, and the lyric strip", async () => {
    let radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.next(); await settle();
    radio.setLyrics(false);
    out.at = 61.7;
    await vi.advanceTimersByTimeAsync(5000);
    expect(saved()).toMatchObject({ on: true, station: "all", song: "B", at: 61, lyrics: false });
    // the next visit: the song list arrives, and the radio goes on from there
    out = new FakeOutput();
    radio = new Radio(deps());
    expect(radio.store.getState().lyrics).toBe(false);
    await radio.init(); await settle();
    expect(out.last).toBe("play B.mp3@61");
    expect(radio.store.getState()).toMatchObject({ on: true, playing: true });
  });

  it("waits for a tap when the browser asks for one, and starts at the next tap", async () => {
    store["radio-test"] = JSON.stringify({ on: true, station: "all", song: "B", at: 10 });
    const radio = new Radio(deps());
    out.next = "tap";
    await radio.init(); await settle();
    expect(radio.store.getState()).toMatchObject({ on: true, playing: false, needsTap: true, failed: false });
    out.next = "ok";
    radio.gesture(); await settle();
    expect(radio.store.getState()).toMatchObject({ playing: true, needsTap: false });
    expect(out.last).toBe("play B.mp3@10");
  });

  it("skips a song that won't play, and gives up after three in a row", async () => {
    let radio = new Radio(deps());
    out.broken.add("A.mp3");
    radio.setOn(true); await settle(); await settle();
    expect(radio.store.getState()).toMatchObject({ playing: true, failed: false });
    expect(radio.store.getState().song?.id).toBe("B");
    out = new FakeOutput(); out.next = "broken"; store = {};
    radio = new Radio(deps());
    radio.setOn(true);
    for (let i = 0; i < 6; i++) await settle();
    expect(radio.store.getState()).toMatchObject({ on: false, playing: false, failed: true });
    expect(out.log.filter((l) => l.startsWith("play"))).toHaveLength(6); // three songs, each at both its addresses
  });

  it("finds a free example on the course's site when the files folder doesn't have it", async () => {
    const radio = new Radio(deps({ fetchJson: async (url) => {
      fetched.push(url);
      if (url === "/songs/index.json") return { songs };
      if (url.startsWith("https://files.example/course/songs/data/A.json")) throw new Error("404");
      return { L: [line(1, [[1, 2]], [["Hi", "Labas", 1]])] };
    } }));
    out.missing.push("https://files.example/course/songs/audio/A.mp3");
    radio.setOn(true); await settle(); await settle();
    expect(radio.store.getState()).toMatchObject({ playing: true, failed: false });
    expect(radio.store.getState().song?.id).toBe("A");
    expect(out.url).toBe("/songs/audio/A.mp3"); // no token on the site's address
    expect(fetched.slice(-2)).toEqual(["https://files.example/course/songs/data/A.json?t=tok", "/songs/data/A.json"]);
    expect(radio.store.getState().timeline?.lines).toHaveLength(1);
    // after a conversation it goes straight to the address that worked
    radio.hold("microphone", true); radio.release("microphone");
    const plays = out.log.filter((l) => l.startsWith("play")).length;
    await vi.advanceTimersByTimeAsync(RESUME_AFTER_MS);
    expect(out.log.filter((l) => l.startsWith("play"))).toHaveLength(plays + 1);
    expect(out.url).toBe("/songs/audio/A.mp3");
  });

  it("says so when the song list can't be fetched, and tries again at the next press", async () => {
    let fail = true;
    const radio = new Radio(deps({ fetchJson: async () => { if (fail) throw new Error("offline"); return { songs }; } }));
    radio.setOn(true); await settle();
    expect(radio.store.getState()).toMatchObject({ ready: false, failed: true });
    fail = false;
    radio.setOn(true); await settle(); await settle();
    expect(radio.store.getState()).toMatchObject({ ready: true, failed: false, playing: true });
  });

  it("plays the song of the place the learner walks into next, once, then goes on with the station", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.suggest([null, "nope", "C"]);
    expect(radio.store.getState().upNext?.id).toBe("C");
    out.onEnded!(); await settle();
    expect(radio.store.getState().song?.id).toBe("C");
    expect(radio.store.getState().upNext).toBeNull();
    radio.suggest(["C"]); // not offered twice
    expect(radio.store.getState().upNext).toBeNull();
    radio.previous(); await settle();
    expect(radio.store.getState().song?.id).toBe("A"); // back to the station's own song
    radio.next(); await settle();
    expect(radio.store.getState().song?.id).toBe("B");
  });

  it("the system taking the sound away leaves it waiting, not failed", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    out.at = 12; out.sounding = false;
    out.onStopped!("interrupted");
    expect(radio.store.getState()).toMatchObject({ on: true, playing: false, needsTap: true, failed: false });
    radio.gesture(); await settle();
    expect(out.last).toBe("play A.mp3@12");
  });

  it("follows the game's volume, under the voices", async () => {
    let volume = 1;
    const radio = new Radio(deps({ volume: () => volume }));
    radio.setOn(true); await settle();
    expect(out.volume).toBeCloseTo(MUSIC_LEVEL);
    volume = 0; radio.volumeChanged();
    expect(out.volume).toBe(0);
  });
});

describe("the iPhone output: the game's own Web Audio, no media element", () => {
  class FakeSource { buffer: any = null; onended: (() => void) | null = null; started: [number, number] | null = null; stopped = false;
    connect() {} disconnect() {} start(when: number, offset: number) { this.started = [when, offset]; } stop() { this.stopped = true; } }
  const context = () => {
    const listeners: (() => void)[] = [];
    const ctx = {
      state: "running" as string, currentTime: 100, destination: {}, sources: [] as FakeSource[],
      createBufferSource() { const s = new FakeSource(); ctx.sources.push(s); return s; },
      createGain: () => ({ gain: { value: 1, cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {}, disconnect() {} }),
      addEventListener: (_: string, f: () => void) => { listeners.push(f); },
      resume: async () => { ctx.state = "running"; },
      change(state: string) { ctx.state = state; listeners.forEach((f) => f()); },
    };
    return ctx;
  };
  let decoded: number;
  beforeEach(() => {
    decoded = 0;
    vi.stubGlobal("OfflineAudioContext", class { constructor(public channels: number, public length: number, public rate: number) {}
      decodeAudioData(bytes: ArrayBuffer) { decoded++; return Promise.resolve({ duration: 200, bytes: bytes.byteLength, rate: this.rate }); } });
    vi.stubGlobal("Audio", class { constructor() { throw new Error("no media element on iPhone"); } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("decodes a song once at the lower rate, plays it from the place asked, and keeps the place across a pause", async () => {
    const ctx = context(), fetches: string[] = [];
    const out = new BufferOutput(() => ctx as any, async (url) => { fetches.push(url); return new ArrayBuffer(8); });
    expect(await out.play("a.mp3", 30)).toBe(true);
    expect(ctx.sources[0].started).toEqual([0, 30]);
    expect((ctx.sources[0].buffer as any).rate).toBe(32000);
    ctx.currentTime = 112;
    expect(out.position()).toBe(42);
    out.pause();
    expect(ctx.sources[0].stopped).toBe(true);
    ctx.currentTime = 500;
    expect(out.position()).toBe(42);
    expect(await out.play("a.mp3", 42)).toBe(true);
    expect([fetches.length, decoded]).toEqual([1, 1]); // the same song again: nothing fetched or decoded twice
    expect(ctx.sources[1].started).toEqual([0, 42]);
  });

  it("ends only when the clock has reached the song's end", async () => {
    const ctx = context();
    const out = new BufferOutput(() => ctx as any, async () => new ArrayBuffer(8));
    const ended = vi.fn(), stopped = vi.fn();
    out.onEnded = ended; out.onStopped = stopped;
    await out.play("a.mp3", 0);
    ctx.currentTime = 150;
    ctx.sources[0].onended!(); // an interruption, 50 s in
    expect([ended.mock.calls.length, stopped.mock.calls]).toEqual([0, [["interrupted"]]]);
    expect(out.position()).toBe(50);
    await out.play("a.mp3", 50);
    ctx.currentTime = 300;
    ctx.sources[1].onended!();
    expect(ended).toHaveBeenCalledOnce();
  });

  it("a pause while the song is still being fetched leaves it silent", async () => {
    const ctx = context();
    let arrive!: (b: ArrayBuffer) => void;
    const out = new BufferOutput(() => ctx as any, () => new Promise((r) => { arrive = r; }));
    const playing = out.play("a.mp3", 0);
    out.pause();
    arrive(new ArrayBuffer(8));
    expect(await playing).toBe(false);
    expect(ctx.sources).toHaveLength(0);
  });

  it("asks for a tap when the context isn't running, and stops when the system takes it", async () => {
    const ctx = context();
    ctx.state = "suspended"; ctx.resume = async () => {};
    const out = new BufferOutput(() => ctx as any, async () => new ArrayBuffer(8));
    await expect(out.play("a.mp3", 0)).rejects.toBeInstanceOf(NeedsTap);
    ctx.state = "running";
    const stopped = vi.fn(); out.onStopped = stopped;
    await out.play("a.mp3", 0);
    ctx.currentTime = 110;
    ctx.change("interrupted");
    expect(stopped).toHaveBeenCalledWith("interrupted");
    expect(out.position()).toBe(10);
  });

  it("uses a recording fetched ahead of its turn", async () => {
    const ctx = context(), fetches: string[] = [];
    const out = new BufferOutput(() => ctx as any, async (url) => { fetches.push(url); return new ArrayBuffer(8); });
    await out.play("a.mp3", 0);
    out.prepare("b.mp3"); out.prepare("b.mp3"); out.prepare("a.mp3");
    await out.play("b.mp3", 0);
    expect(fetches).toEqual(["a.mp3", "b.mp3"]);
  });
});
