// The town's radio (src/radio/): where the songs' files are, the lyric clocks, the playing order, what is remembered,
// and above all that music never sounds over a conversation, a voice or a microphone.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { captureAudio, watchMicrophone } from "../src/convo/audioFocus";
import { STATIONS, songOfSituation } from "../src/content/radio";
import { SITUATIONS } from "../src/content/situations";
import { buildTimeline, lineAt, shortGloss, unitAt, withSungTranslations, wordsBegun } from "../src/radio/lyrics";
import { BufferOutput, NeedsTap, type RadioOutput } from "../src/radio/output";
import { likedSongs, readFavorites, withToggled, type FavoriteStore } from "../src/radio/favorites";
import { loadSaved, nextStation, readSaved, stationOrder, stationSongs, step, type Station } from "../src/radio/playlist";
import { FADE_IN_MS, FADE_OUT_MS, MUSIC_LEVEL, RESUME_AFTER_MS, SKIP_OUT_MS, VOICE_FADE_MS, Radio, type RadioDeps } from "../src/radio/radio";
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

  // the first lines of SB20 "Lo siento" as the Spanish course has them (public/songs/data/SB20.json)
  const bilingual: SongLine[] = [
    { s: 17.23, e: 19.47, src: "Perdóname", lt: "Forgive me", u: [["Perdóname", "Forgive me", 1]], w: [[17.23, 19.47]], wt: ["Perdóname"], en: { s: 10.47, e: 11.69, w: [[10.47, 11.09], [11.11, 11.69]] } },
    { s: 34.43, e: 37.43, src: "Estoy frente a tu puerta", lt: "I'm standing at your door", u: [["Estoy", "I am", 1], ["frente a", "in front of", 2], ["tu", "your", 1], ["puerta", "door", 1]],
      w: [[34.43, 35.49], [35.51, 36.21], [36.23, 36.35], [36.37, 36.65], [36.67, 37.43]], wt: ["Estoy", "frente", "a", "tu", "puerta"], en: { s: 19.55, e: 30.15, w: [[19.55, 19.85], [27.83, 28.77], [28.79, 29.05], [29.07, 29.31], [29.33, 30.15]] } },
  ];

  it("a bilingual song's line is shown twice, as it is sung: first in the learner's language, then in the song's", () => {
    const rows = withSungTranslations(bilingual);
    expect(rows.map((r) => [r.part ?? "song", r.src])).toEqual([
      ["translation", "Forgive me"], ["song", "Perdóname"], ["translation", "I'm standing at your door"], ["song", "Estoy frente a tu puerta"],
    ]);
    expect(rows[2].u.map((u) => u[0])).toEqual(["I'm", "standing", "at", "your", "door"]); // its words, as the course's player splits them
    expect(rows[2].u.every((u) => u[1] === "")).toBe(true); // nothing under them: they are the song, not glosses
    const tl = buildTimeline(rows);
    expect(lineAt(tl, 10.6)).toBe(0); // "Forgive me" while it is sung
    expect(unitAt(rows[0], 10.6)).toBe(0);
    expect(unitAt(rows[0], 11.2)).toBe(1); // "me" lit at its own time
    expect(lineAt(tl, 17.5)).toBe(1); // then "Perdóname"
    expect(lineAt(tl, 19.6)).toBe(2);
    expect(unitAt(rows[2], 19.6)).toBe(0); // "I'm"
    expect(unitAt(rows[2], 28)).toBe(1); // "standing", sung eight seconds later
    expect(lineAt(tl, 34.5)).toBe(3);
    expect(unitAt(rows[3], 35.6)).toBe(1); // "frente a": the Spanish follows its own word times, glosses under it
    expect(rows[3].u[1][1]).toBe("in front of");
  });

  it("a sung translation without a time for every word shows at the line's time with no word lit; a line without one stays as it is", () => {
    const rows = withSungTranslations([
      { ...bilingual[0], en: { s: 10.47, e: 11.69, w: [[10.47, 11.09]] } },
      { ...bilingual[1], en: { s: 19.55, e: 30.15 } },
      { ...bilingual[1], en: undefined },
    ]);
    expect(rows.map((r) => r.part ?? "song")).toEqual(["translation", "song", "translation", "song", "song"]);
    const tl = buildTimeline(rows);
    expect(lineAt(tl, 10.8)).toBe(0);
    for (const t of [10.5, 11, 11.6, 12.5]) expect(unitAt(rows[0], t)).toBe(-1);
    expect(lineAt(tl, 25)).toBe(2);
    expect(unitAt(rows[2], 25)).toBe(-1);
  });

  it("keeps a gloss's meaning and drops its literal one", () => {
    expect(shortGloss("Lipkite! (šokite į vidų)")).toBe("Lipkite!");
    expect(shortGloss("(pažodžiui)")).toBe("(pažodžiui)");
    expect(shortGloss("namo")).toBe("namo");
  });
});

describe("the playing order", () => {
  const songs = ["A", "B", "C", "D", "E", "F"].map((id) => song(id));
  const all: Station = { id: "all", name: "All", freq: 90, lt: "", has: () => true };

  it("keeps the list's own order, or one shuffle per seed", () => {
    expect(stationOrder(songs, all, false, 7)).toEqual(["A", "B", "C", "D", "E", "F"]);
    const a = stationOrder(songs, all, true, 7);
    expect(a).toEqual(stationOrder(songs, all, true, 7));
    expect([...a].sort()).toEqual(["A", "B", "C", "D", "E", "F"]);
    expect(new Set([1, 2, 3, 4, 5, 6, 7, 8].map((seed) => stationOrder(songs, all, true, seed).join(""))).size).toBeGreaterThan(3);
  });

  it("a shuffle is a fair mix of the course's kinds of song: each kind spread evenly, never bunched at the start", () => {
    // a mix of four kinds of very different sizes: 32 vocabulary, 18 situation, 12 grammar and 8 bilingual songs
    const mix: SongMeta[] = [];
    for (const [c, n] of [["v", 32], ["s", 18], ["g", 12], ["b", 8]] as const) for (let i = 0; i < n; i++) mix.push({ ...song(`${c}${i}`), c });
    for (let seed = 1; seed <= 300; seed++) {
      const order = stationOrder(mix, all, true, seed * 7919);
      expect([...order].sort()).toEqual(mix.map((s) => s.id).sort()); // every song, once
      const kinds = order.map((id) => id[0]);
      const b = kinds.flatMap((k, i) => (k === "b" ? [i] : []));
      for (let i = 1; i < b.length; i++) expect(b[i] - b[i - 1], `seed ${seed}`).toBeGreaterThanOrEqual(4); // bilingual songs far apart
      for (let from = 0; from + 10 <= kinds.length; from += 5) {
        const window = kinds.slice(from, from + 10);
        expect(window.filter((k) => k === "b").length, `seed ${seed} at ${from}`).toBeLessThanOrEqual(2);
        expect(window.filter((k) => k === "v").length, `seed ${seed} at ${from}`).toBeGreaterThanOrEqual(3);
        expect(new Set(window).size, `seed ${seed} at ${from}`).toBeGreaterThanOrEqual(3);
      }
    }
    // and it is still a shuffle: different seeds, different starts
    expect(new Set(Array.from({ length: 40 }, (_, i) => stationOrder(mix, all, true, i + 1)[0])).size).toBeGreaterThan(12);
  });

  it("goes forth and back, around the ends", () => {
    const order = ["A", "B", "C"];
    expect(step(order, "A", 1)).toEqual({ id: "B", wrapped: false, before: false });
    expect(step(order, "C", 1)).toEqual({ id: "A", wrapped: true, before: false });
    expect(step(order, "A", -1)).toEqual({ id: "C", wrapped: false, before: true });
    expect(step(order, "gone", 1)).toEqual({ id: "A", wrapped: false, before: false });
    expect(step(order, null, 1)).toEqual({ id: "A", wrapped: false, before: false });
    expect(step([], "A", 1)).toEqual({ id: null, wrapped: false, before: false });
  });

  // English Master's song list as its /songs/index.json has it: the collections in this order, each in the course's
  const course: SongMeta[] = [];
  for (const [c, letter, numbers] of [["g", "G", 31], ["v", "V", 64], ["s", "S", 35], ["p", "P", 30]] as const) {
    for (let n = 1; n <= numbers; n++) course.push({ ...song(`${letter}${String(c === "s" ? n + 61 : n).padStart(2, "0")}`), c, n });
  }

  it("Maple Harbor's stations are the course's kinds of song: every song on exactly one, in the course's order", () => {
    const kinds = STATIONS.filter((s) => !s.kind);
    expect(kinds.map((s) => s.name)).toEqual(["Grammar FM", "Vocab FM", "Situations FM", "Idioms FM"]);
    for (const s of course) expect(kinds.filter((k) => k.has(s)).map((k) => k.id), s.id).toHaveLength(1);
    const ids = (id: string) => stationSongs(course, STATIONS.find((s) => s.id === id)!).map((s) => s.id);
    // the course's second half ("Pažengusiems") is on the station of each part's kind, after the first half's songs
    expect(ids("grammar")).toEqual([...course.filter((s) => s.c === "g").map((s) => s.id), ...Array.from({ length: 12 }, (_, i) => `P${String(i + 1).padStart(2, "0")}`)]);
    expect(ids("grammar")[0]).toBe("G01"); // where a new listener starts
    expect(ids("vocab")).toHaveLength(64);
    expect(ids("situations").slice(-7)).toEqual(["S96", "P25", "P26", "P27", "P28", "P29", "P30"]);
    expect(ids("idioms")).toEqual(Array.from({ length: 12 }, (_, i) => `P${i + 13}`));
    expect(STATIONS[0].id).toBe("grammar");
  });

  it("has a mix of every song and the learner's favorites beside them, each with its own place on the dial", () => {
    const mix = STATIONS.find((s) => s.kind === "mix")!, favorites = STATIONS.find((s) => s.kind === "favorites")!;
    expect([mix.name, favorites.name]).toEqual(["Random FM", "Favorites FM"]);
    expect(stationSongs(course, mix)).toHaveLength(course.length);
    expect(stationSongs(course, favorites)).toEqual([]);
    expect(stationSongs(course, favorites, new Set(["V05", "G02"])).map((s) => s.id)).toEqual(["G02", "V05"]); // the hearts, in the course's order
    const places = STATIONS.map((s) => s.freq);
    expect(places.every((f, i) => f >= 88.5 && f <= 107.5 && (i === 0 || f - places[i - 1] >= 3))).toBe(true);
    expect(new Set(STATIONS.map((s) => s.id)).size).toBe(STATIONS.length);
  });

  it("moves on from a station to the next of the course's kinds that has songs, round and round", () => {
    const counts = { grammar: 43, vocab: 64, situations: 41, idioms: 0, random: 160, favorites: 3 };
    const next = (from: string, dir: 1 | -1 = 1) => nextStation(STATIONS, counts, from, dir)?.id ?? null;
    expect([next("grammar"), next("vocab"), next("situations")]).toEqual(["vocab", "situations", "grammar"]); // none on Idioms FM: skipped
    expect([next("grammar", -1), next("vocab", -1)]).toEqual(["situations", "grammar"]);
    expect(next("favorites")).toBe("grammar"); // from outside the round: its first station
    expect(nextStation(STATIONS, { grammar: 5 }, "grammar")).toBeNull(); // alone in the round: it starts over
    expect(nextStation(STATIONS, {}, "grammar")).toBeNull();
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
    expect(readSaved(JSON.stringify({ on: true, station: 5, at: -3, lyrics: false, seed: "x", shuffle: "yes", places: { grammar: "G07", vocab: 3 } })))
      .toEqual({ on: true, station: "", shuffle: false, seed: 1, song: null, at: 0, places: { grammar: "G07" }, lyrics: false, introduced: false });
  });

  it("a visit after the first radio keeps only on/off and the strip: the stations and the order start anew", () => {
    const store: Record<string, string> = { "ew-radio-v1": JSON.stringify({ on: true, station: "soul", shuffle: true, seed: 9, song: "S70", at: 44, lyrics: false, introduced: true }) };
    vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    try {
      expect(loadSaved("ew-radio-v2", "ew-radio-v1")).toEqual({ on: true, station: "", shuffle: false, seed: 1, song: null, at: 0, places: {}, lyrics: false, introduced: false });
      store["ew-radio-v2"] = JSON.stringify({ on: false, station: "vocab", song: "V40", at: 12 });
      expect(loadSaved("ew-radio-v2", "ew-radio-v1")).toMatchObject({ on: false, station: "vocab", song: "V40", at: 12 }); // its own note, once it has one
    } finally { vi.unstubAllGlobals(); }
  });
});

describe("the heart: the course's favorite songs", () => {
  it("reads the course's note as the course does", () => {
    const raw = JSON.stringify({ G01: { liked: true, at: 5 }, SV12: { liked: false, at: 9 }, S100: { liked: true, at: 7 }, "bad id": { liked: true, at: 1 }, G02: { liked: "yes", at: 1 }, G03: { liked: true }, G04: null });
    expect(readFavorites(raw)).toEqual({ G01: { liked: true, at: 5 }, SV12: { liked: false, at: 9 }, S100: { liked: true, at: 7 } });
    expect(likedSongs(readFavorites(raw))).toEqual(["G01", "S100"]);
    for (const broken of [null, "", "{oops", "[]", "5"]) expect(readFavorites(broken)).toEqual({});
  });

  it("gives a heart and takes it back as a dated entry, always later than the one before (the account's merge goes by it)", () => {
    const given = withToggled({}, "G05", 1000)!;
    expect(given).toEqual({ G05: { liked: true, at: 1000 } });
    const taken = withToggled(given, "G05", 2000)!;
    expect(taken).toEqual({ G05: { liked: false, at: 2000 } }); // kept, not removed: an older copy can't bring the heart back
    expect(withToggled(taken, "G05", 1500)!.G05).toEqual({ liked: true, at: 2001 }); // a clock that went back still moves on
    expect(withToggled({ SB01: { liked: true, at: 3 } }, "G05", 10)).toEqual({ SB01: { liked: true, at: 3 }, G05: { liked: true, at: 10 } }); // the others untouched
    expect(withToggled({}, "not a song", 10)).toBeNull();
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
  /** every change of volume asked for: [to, over how many ms] */
  fades: [number, number][] = [];
  setVolume(volume: number, ms = 0) { this.volume = volume; this.fades.push([volume, ms]); }
  unlock() { this.log.push("unlock"); }
  /** the last thing the radio played */
  get last() { return this.log.filter((l) => l.startsWith("play")).at(-1); }
  prepare(url: string) { this.log.push(`prepare ${url.replace(/\?.*/, "").split("/").pop()}`); }
}

describe("the radio", () => {
  const songs = ["A", "B", "C", "D"].map((id) => song(id));
  // one station with every song, and the learner's favorites (song C has a heart) as a second one to turn to
  const stations: Station[] = [
    { id: "all", name: "All songs", freq: 98.7, lt: "visos", has: () => true },
    { id: "hearts", name: "Hearts", freq: 104.3, lt: "mėgstamos", kind: "favorites", has: () => false },
  ];
  /** the course's favorites, as a list the test can read */
  const hearts = (liked: string[]): FavoriteStore & { liked: string[] } => {
    const store = { liked, list: () => [...store.liked], toggle: (id: string) => { const had = store.liked.includes(id); store.liked = had ? store.liked.filter((x) => x !== id) : [...store.liked, id]; return !had; } };
    return store;
  };
  let out: FakeOutput, store: Record<string, string>, fetched: string[], token: string | null;
  const deps = (over: Partial<RadioDeps> = {}): RadioDeps => ({
    config: { index: "/songs/index.json", files: "https://files.example/course", recordings: null },
    stations, output: out, token: () => token, volume: () => 0.5, storageKey: "radio-test", random: () => 0.5, favorites: hearts(["C"]),
    fetchJson: async (url) => {
      fetched.push(url);
      if (url === "/songs/index.json") return { songs };
      return { L: [line(1, [[1, 2]], [["Hi", "Labas", 1]])] };
    },
    ...over,
  });
  /** let what was asked for happen: a song starts, or the dip of a skipped song has passed */
  const settle = () => vi.advanceTimersByTimeAsync(SKIP_OUT_MS);
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
    radio.power();
    expect(radio.store.getState().on).toBe(false);
    expect(out.log).toEqual([]);
  });

  it("the button is the power switch: one press on, the next off, and the set opens by itself only the first time", async () => {
    const radio = new Radio(deps());
    radio.power();
    expect(out.log).toEqual(["unlock"]); // in the tap itself, before anything is fetched
    await settle();
    const s = radio.store.getState();
    expect([s.on, s.open, s.playing, s.song?.id]).toEqual([true, true, true, "A"]);
    expect(out.url).toBe("https://files.example/course/songs/audio/A.mp3?t=tok");
    expect(fetched).toContain("https://files.example/course/songs/data/A.json?t=tok");
    expect(s.timeline?.lines).toHaveLength(1);
    radio.power(); // off with the set still open: it folds away, off looks off
    expect(radio.store.getState()).toMatchObject({ on: false, open: false });
    await vi.advanceTimersByTimeAsync(FADE_OUT_MS);
    radio.power();
    await settle();
    expect(radio.store.getState()).toMatchObject({ on: true, open: false, playing: true }); // no set in the way the second time
    expect(saved().introduced).toBe(true);
    // the set's own knob turns the radio off without closing the set the learner is using
    radio.setOpen(true);
    radio.toggle();
    expect(radio.store.getState()).toMatchObject({ on: false, open: true });
  });

  it("fades in over a second when turned on, and out over about a second when turned off: never a cut", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    expect(out.fades.slice(-2)).toEqual([[0, 0], [0.5 * MUSIC_LEVEL, FADE_IN_MS]]);
    radio.setOn(false);
    expect(out.fades.at(-1)).toEqual([0, FADE_OUT_MS]);
    expect(radio.store.getState().on).toBe(false); // off at once for the eye
    expect(out.sounding).toBe(true); // while the ear hears it leave
    await vi.advanceTimersByTimeAsync(FADE_OUT_MS - 1);
    expect(out.sounding).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(out.sounding).toBe(false);
    expect(radio.store.getState().playing).toBe(false);
  });

  it("turned on again while it fades out, the music just lifts again", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    const plays = out.log.filter((l) => l.startsWith("play")).length;
    radio.setOn(false);
    await vi.advanceTimersByTimeAsync(300);
    radio.setOn(true);
    expect(out.fades.at(-1)![0]).toBeCloseTo(0.5 * MUSIC_LEVEL);
    await vi.advanceTimersByTimeAsync(FADE_OUT_MS * 2);
    expect(out.sounding).toBe(true);
    expect(radio.store.getState()).toMatchObject({ on: true, playing: true });
    expect(out.log.filter((l) => l.startsWith("play"))).toHaveLength(plays); // the same song went on, nothing restarted
    expect(out.log).not.toContain("pause");
  });

  it("a skipped song dips out and the new one comes in; a song that ends goes straight into the next", async () => {
    const radio = new Radio(deps());
    radio.setOn(true); await settle();
    radio.next();
    expect(radio.store.getState().song?.id).toBe("B"); // the radio is at the new song at once
    expect(out.fades.at(-1)).toEqual([0, SKIP_OUT_MS]);
    expect(out.last).toBe("play A.mp3@0"); // the old one is still leaving
    await vi.advanceTimersByTimeAsync(SKIP_OUT_MS);
    expect(out.last).toBe("play B.mp3@0");
    expect(out.fades.at(-1)![1]).toBeGreaterThan(0); // it fades in
    out.onEnded!();
    await vi.advanceTimersByTimeAsync(0);
    expect(out.last).toBe("play C.mp3@0"); // no wait at a song's own end
    expect(out.fades.at(-1)).toEqual([0.5 * MUSIC_LEVEL, 0]);
    // two quick skips: the song in between never starts
    radio.next(); radio.next();
    await settle();
    expect(out.log.filter((l) => l.startsWith("play")).map((l) => l.slice(5, 6))).toEqual(["A", "B", "C", "A"]);
  });

  it("a station change turns the dial: the tuning sweep plays only while the radio sounds for the learner", async () => {
    const tune = vi.fn();
    const radio = new Radio(deps({ tune }));
    await radio.init();
    radio.setStation("hearts");
    expect(tune).not.toHaveBeenCalled(); // off: the needle moves in silence
    radio.setOn(true); await settle();
    radio.setStation("all"); await settle();
    expect(tune).toHaveBeenCalledOnce();
    radio.hold("conversation");
    radio.setStation("hearts");
    expect(tune).toHaveBeenCalledOnce(); // never over a conversation
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
    radio.setStation("hearts"); await settle();
    expect(radio.store.getState().song?.id).toBe("C");
    radio.next(); await settle();
    expect(radio.store.getState().song?.id).toBe("C");
    expect(saved().station).toBe("hearts");
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
    radio.setStation("hearts"); await settle();
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
    expect(out.fades.at(-1)).toEqual([0, VOICE_FADE_MS]); // a voice in the town: a quicker fade than a conversation's
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

  it("a press before the song list has arrived keeps the remembered song and place", async () => {
    store["radio-test"] = JSON.stringify({ on: false, station: "all", song: "C", at: 33 });
    const radio = new Radio(deps());
    radio.power(); // the list is still on its way
    expect(saved()).toMatchObject({ on: true, song: "C", at: 33 });
    await settle(); await settle();
    expect(out.last).toBe("play C.mp3@33");
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

describe("the stations: the course's songs, kind by kind", () => {
  // a small course: three grammar songs, two vocabulary songs, one situation song, in the list's order
  const kind = (id: string, c: string): SongMeta => ({ ...song(id), c });
  const songs = [kind("G1", "g"), kind("G2", "g"), kind("G3", "g"), kind("V1", "v"), kind("V2", "v"), kind("S1", "s")];
  const stations: Station[] = [
    { id: "grammar", name: "Grammar FM", freq: 90, lt: "", has: (s) => s.c === "g" },
    { id: "vocab", name: "Vocab FM", freq: 94, lt: "", has: (s) => s.c === "v" },
    { id: "situations", name: "Situations FM", freq: 98, lt: "", has: (s) => s.c === "s" },
    { id: "bilingual", name: "Bilingüe FM", freq: 100, lt: "", has: (s) => s.c === "b" }, // a kind this course doesn't have
    { id: "random", name: "Random FM", freq: 102, lt: "", kind: "mix", has: () => true },
    { id: "favorites", name: "Favorites FM", freq: 106, lt: "", kind: "favorites", has: () => false },
  ];
  let out: FakeOutput, store: Record<string, string>, liked: string[];
  const favorites: FavoriteStore = {
    list: () => [...liked],
    toggle: (id) => { const had = liked.includes(id); liked = had ? liked.filter((x) => x !== id) : [...liked, id]; return !had; },
  };
  const deps = (over: Partial<RadioDeps> = {}): RadioDeps => ({
    config: { index: "/songs/index.json", files: null, recordings: null },
    stations, output: out, token: () => null, volume: () => 0.5, storageKey: "radio-test", favorites,
    fetchJson: async (url) => (url === "/songs/index.json" ? { songs } : { L: [] }),
    ...over,
  });
  const settle = () => vi.advanceTimersByTimeAsync(SKIP_OUT_MS);
  const saved = () => JSON.parse(store["radio-test"] ?? "null");
  const now = (radio: Radio) => { const s = radio.store.getState(); return [s.station, s.song?.id ?? null]; };
  const on = async (over: Partial<RadioDeps> = {}) => { const radio = new Radio(deps(over)); radio.setOn(true); await settle(); return radio; };
  /** press next until the radio has been at `count` songs; what it played, station by station */
  const walk = async (radio: Radio, count: number) => {
    const heard = [now(radio).join(":")];
    while (heard.length < count) { radio.next(); await settle(); heard.push(now(radio).join(":")); }
    return heard;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    out = new FakeOutput(); store = {}; liked = [];
    vi.stubGlobal("localStorage", { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; } });
    vi.stubGlobal("navigator", {});
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

  it("starts with the first grammar song, in the course's order, and says where the song is in its station", async () => {
    const radio = await on();
    expect(radio.store.getState()).toMatchObject({ station: "grammar", shuffle: false, playing: true, place: { n: 1, of: 3 } });
    expect(radio.store.getState().song?.id).toBe("G1");
    out.onEnded!(); await settle();
    expect(radio.store.getState()).toMatchObject({ station: "grammar", place: { n: 2, of: 3 } });
    expect(radio.store.getState().song?.id).toBe("G2");
  });

  it("counts each station's songs; a kind the course doesn't have can't be tuned to", async () => {
    const radio = await on();
    expect(radio.store.getState().counts).toEqual({ grammar: 3, vocab: 2, situations: 1, bilingual: 0, random: 6, favorites: 0 });
    radio.setStation("bilingual"); radio.setStation("favorites"); await settle();
    expect(now(radio)).toEqual(["grammar", "G1"]);
  });

  it("starts with the first grammar song even where a place's own song waits: that one comes after it", async () => {
    const radio = new Radio(deps());
    await radio.init();
    radio.suggest(["V2"]); // the learner stands in a place whose conversation is built on V2
    radio.setOn(true); await settle();
    expect(now(radio)).toEqual(["grammar", "G1"]);
    expect(radio.store.getState().upNext?.id).toBe("V2");
    out.onEnded!(); await settle();
    expect(radio.store.getState()).toMatchObject({ station: "grammar", place: null }); // out of turn: Grammar FM keeps its place
    expect(radio.store.getState().song?.id).toBe("V2");
    out.onEnded!(); await settle();
    expect(now(radio)).toEqual(["grammar", "G2"]);
  });

  it("when a station has played to its end the radio moves on to the next one, and after the last to the first", async () => {
    const radio = await on();
    expect(await walk(radio, 8)).toEqual(["grammar:G1", "grammar:G2", "grammar:G3", "vocab:V1", "vocab:V2", "situations:S1", "grammar:G1", "grammar:G2"]);
    // by itself too, at a song's own end, with no dip and no tuning sound
    const tune = vi.fn();
    out = new FakeOutput(); store = {};
    const second = await on({ tune });
    for (let i = 0; i < 3; i++) { out.onEnded!(); await settle(); }
    expect(now(second)).toEqual(["vocab", "V1"]);
    expect(second.store.getState()).toMatchObject({ playing: true, place: { n: 1, of: 2 } });
    expect(out.fades.at(-1)).toEqual([0.5 * MUSIC_LEVEL, 0]);
    expect(tune).not.toHaveBeenCalled();
    expect(saved()).toMatchObject({ station: "vocab", song: "V1" });
  });

  it("a step back from a station's first song goes to the last song of the station before", async () => {
    const radio = await on();
    radio.previous(); await settle();
    expect(now(radio)).toEqual(["situations", "S1"]);
    radio.previous(); await settle();
    expect(now(radio)).toEqual(["vocab", "V2"]);
    radio.previous(); await settle();
    expect(now(radio)).toEqual(["vocab", "V1"]);
  });

  it("a station goes on from where it was left, also on the next visit; one played to its end starts anew", async () => {
    let radio = await on();
    radio.next(); await settle(); // Grammar FM at G2
    radio.setStation("vocab"); await settle();
    expect(now(radio)).toEqual(["vocab", "V1"]);
    radio.next(); await settle(); // Vocab FM at V2
    radio.setStation("grammar"); await settle();
    expect(now(radio)).toEqual(["grammar", "G2"]);
    expect(out.last).toBe("play G2.mp3@0"); // from that song's beginning
    expect(saved()).toMatchObject({ station: "grammar", song: "G2", places: { vocab: "V2" } });
    out = new FakeOutput();
    radio = new Radio(deps());
    await radio.init(); await settle();
    expect(now(radio)).toEqual(["grammar", "G2"]);
    radio.next(); await settle(); radio.next(); await settle(); // G3, then Grammar FM is through: on to Vocab FM, where it was left
    expect(now(radio)).toEqual(["vocab", "V2"]);
    radio.setStation("grammar"); await settle();
    expect(now(radio)).toEqual(["grammar", "G1"]); // it was played to its end: from its first song again
  });

  it("the shuffle key shuffles within the station: every song of it once, then on to the next station, shuffled too", async () => {
    const radio = await on({ random: () => 0.37 });
    radio.setShuffle(true);
    expect(radio.store.getState()).toMatchObject({ shuffle: true, place: { n: 1, of: 3 } }); // it goes on from the song that is playing
    const heard = await walk(radio, 6);
    expect(heard.slice(0, 3).map((x) => x.split(":")[0])).toEqual(["grammar", "grammar", "grammar"]);
    expect(heard.slice(0, 3).map((x) => x.split(":")[1]).sort()).toEqual(["G1", "G2", "G3"]);
    expect(heard.slice(3, 5).map((x) => x.split(":")[1]).sort()).toEqual(["V1", "V2"]);
    expect(heard[5]).toBe("situations:S1");
    expect(saved().shuffle).toBe(true);
    radio.setShuffle(false);
    expect(radio.store.getState().shuffle).toBe(false);
  });

  it("Random FM is a shuffle across all the stations: every song once, round after round, whatever the shuffle key says", async () => {
    const radio = await on();
    radio.setStation("random"); await settle();
    expect(radio.store.getState()).toMatchObject({ station: "random", shuffle: true });
    const heard = (await walk(radio, 12)).map((x) => x.split(":"));
    expect(heard.every(([station]) => station === "random")).toBe(true); // it never moves on
    expect(heard.slice(0, 6).map((x) => x[1]).sort()).toEqual(["G1", "G2", "G3", "S1", "V1", "V2"]);
    expect(heard.slice(6).map((x) => x[1]).sort()).toEqual(["G1", "G2", "G3", "S1", "V1", "V2"]);
    expect(heard[6][1]).not.toBe(heard[5][1]);
    radio.setShuffle(false); // the key is the other stations'
    expect(radio.store.getState().shuffle).toBe(true);
    radio.setStation("grammar"); await settle();
    expect(radio.store.getState().shuffle).toBe(false); // and there the course's order stands
    expect(now(radio)).toEqual(["grammar", "G1"]);
  });

  it("the heart puts the song among the course's favorites and takes it out again", async () => {
    const radio = await on();
    expect(radio.store.getState().liked).toBe(false);
    radio.like();
    expect(liked).toEqual(["G1"]);
    expect(radio.store.getState()).toMatchObject({ liked: true, counts: { favorites: 1 } });
    radio.next(); await settle();
    expect(radio.store.getState().liked).toBe(false); // each song has its own
    radio.previous(); await settle();
    expect(radio.store.getState().liked).toBe(true);
    radio.like();
    expect(liked).toEqual([]);
    expect(radio.store.getState()).toMatchObject({ liked: false, counts: { favorites: 0 } });
    expect(out.sounding).toBe(true); // the music never notices
  });

  it("hears a heart given on the course's own page", async () => {
    const radio = await on();
    liked = ["G1", "V2"]; // the Songs page, in another tab
    radio.favoritesChanged();
    expect(radio.store.getState()).toMatchObject({ liked: true, counts: { favorites: 2 } });
  });

  it("Favorites FM plays the songs with a heart, round and round; with the last heart gone the radio goes back to the course", async () => {
    liked = ["V2", "G2"];
    const radio = await on();
    radio.setStation("favorites"); await settle();
    expect(await walk(radio, 3)).toEqual(["favorites:G2", "favorites:V2", "favorites:G2"]); // in the course's order, and over again
    expect(radio.store.getState().place).toEqual({ n: 1, of: 2 });
    radio.like(); // G2 loses its heart while it plays: it plays on
    expect(radio.store.getState()).toMatchObject({ station: "favorites", liked: false, counts: { favorites: 1 }, playing: true });
    radio.next(); await settle();
    expect(now(radio)).toEqual(["favorites", "V2"]);
    radio.like();
    radio.next(); await settle();
    expect(now(radio)).toEqual(["grammar", "G1"]);
  });

  it("a remembered station that has no songs any more gives way to the first that has", async () => {
    store["radio-test"] = JSON.stringify({ on: true, station: "favorites", song: "V2", at: 30 });
    const radio = new Radio(deps());
    await radio.init(); await settle();
    expect(now(radio)).toEqual(["grammar", "G1"]);
    expect(out.last).toBe("play G1.mp3@0");
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
    const playing = out.play("a.mp3", 61);
    out.pause();
    arrive(new ArrayBuffer(8));
    expect(await playing).toBe(false);
    expect(ctx.sources).toHaveLength(0);
    expect(out.position()).toBe(61); // the place it was asked to start from is kept
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
