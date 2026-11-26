import { beforeAll, describe, expect, it, vi } from "vitest";
import { EDITION } from "../../src/edition";
import { STATIONS } from "../../src/content/radio";
import { karaokeStations } from "../../src/game/karaoke/store";
import { karaokeReading, karaokeWordAt } from "../../src/radio/lyrics";
import { KaraokeSession } from "../../src/radio/karaokeSession";
import type { RadioOutput } from "../../src/radio/output";
import { loadKaraokeCovers, karaokeCatalog, radioConfig, readSongList, songDataUrls, type SongMeta } from "../../src/radio/songs";
import fixture from "../fixtures/karaoke-pc.json";

const lithuanian = EDITION.helper === "lt";
const course = lithuanian ? fixture.sm : fixture.sme;
const site = "https://course.example";
const audio = "https://audio.dvikalbesdainos.lt";
const files = audio + (lithuanian ? "/spanish-master" : "/spanish-master-en");
const token = "course+a /?&=";
const signed = "?t=" + encodeURIComponent(token);
const config = radioConfig({
  VITE_RADIO_INDEX: site + "/songs/index.json",
  VITE_RADIO_FILES: files,
  VITE_RADIO_RECORDINGS: lithuanian ? "" : audio + "/spanish-master",
})!;

beforeAll(loadKaraokeCovers);

describe("Puerto Colibrí course sources", () => {
  it("joins every indexed ID to the active course jackets and leaves Bilingüe in SME only", () => {
    const songs = readSongList({ songs: course.ids.split(" ").map((id, n) => ({
      id, n, c: id[1].toLowerCase(), t: id, a: "/songs/v1/" + id + ".mp3",
    })) });
    const catalog = karaokeCatalog(config, songs);
    expect(catalog.map(({ song }) => song.id).join(" ")).toBe(course.ids);
    expect(catalog).toHaveLength(lithuanian ? 130 : 186);
    expect(new Set(catalog.map(({ song }) => song.id)).size).toBe(catalog.length);
    expect(catalog.filter(({ thumbnail }) => thumbnail)).toHaveLength(130);
    expect(catalog.filter(({ thumbnail }) => !thumbnail).map(({ song }) => song.id))
      .toEqual(lithuanian ? [] : course.ids.split(" ").filter((id) => id.startsWith("SB")));
    expect(catalog[0]).toMatchObject({
      thumbnail: site + "/art/s/songs/SG01.50df7d56.160.webp",
      jacket: site + "/art/s/songs/SG01.50df7d56.320.webp",
    });
    expect(karaokeStations(catalog, STATIONS).map(({ id }) => id))
      .toEqual(lithuanian ? ["grammar", "vocab", "situations"] : ["grammar", "vocab", "situations", "bilingual"]);
    expect(radioConfig({})).toBeNull();
    expect(karaokeCatalog(null, songs)).toEqual([]);
    expect(readSongList({ songs: [{ id: "bad", t: "", a: "" }] })).toEqual([]);
  });

  it.each(["SG01", "SV64"] as const)("loads %s text and the matched recording through the shared session", async (id) => {
    const { meta, first } = course.songs[id];
    let at = 0;
    const output: RadioOutput = {
      play: vi.fn(async (_url, seconds) => { at = seconds; return true; }),
      pause() {}, position: () => at, duration: () => meta.d,
      setVolume() {}, unlock() {}, onEnded: null, onStopped: null,
    };
    const fetchJson = vi.fn(async () => ({ L: [first] }));
    const take = new KaraokeSession({
      config, output, song: () => meta, token: () => token, fetchJson,
      level: () => 1, held: false, resumeDelay: 0, close() {},
    });
    await take.start(id);
    const siteText = site + "/songs/data/" + id + ".json";
    const workerText = files + "/songs/data/" + id + ".json" + signed;
    expect(songDataUrls(config, id, token)).toEqual([workerText, siteText]);
    expect(fetchJson).toHaveBeenCalledExactlyOnceWith(lithuanian ? workerText : siteText, expect.any(AbortSignal));
    const filename = id === "SV64" && !lithuanian ? "SV64-en" : id;
    expect(output.play).toHaveBeenCalledExactlyOnceWith(files + "/songs/v1/" + filename + ".mp3" + signed, 0, true);
    const timeline = take.store.getState().timeline!;
    expect(take.duration()).toBe(id === "SV64" ? (lithuanian ? 210.48 : 199.14) : 207.6);
    expect(timeline.lines[0].s).toBe(id === "SV64" ? (lithuanian ? 3.54 : 3.07) : 6.79);
    expect(timeline.lines[0].u[0][1]).toBe(id === "SV64" ? (lithuanian ? "Iš" : "From")
      : (lithuanian ? "Opa! (Karibų šūksnis)" : "Woo-hoo (Caribbean shout)!"));
    expect(karaokeReading(timeline, timeline.lines[0].s).current).toBe(0);
    expect(karaokeWordAt(timeline.lines[0], timeline.lines[0].s)).toBe(0);
    take.close();
  });

  it("uses unsigned text fallback only for SM and never signs an unrelated recording", async () => {
    const song: SongMeta = { ...course.songs.SG01.meta, a: "https://unrelated.example/SG01.mp3" };
    const output: RadioOutput = {
      play: vi.fn(async () => true), pause() {}, position: () => 0, setVolume() {}, unlock() {},
      onEnded: null, onStopped: null,
    };
    const fetchJson = vi.fn(async (url: string) => {
      if (url.startsWith(files)) throw new Error("Unavailable");
      return { L: [course.songs.SG01.first] };
    });
    const take = new KaraokeSession({
      config, output, song: () => song, token: () => token, fetchJson,
      level: () => 1, held: false, resumeDelay: 0, close() {},
    });
    await take.start(song.id);
    expect(fetchJson.mock.calls.map(([url]) => url)).toEqual(lithuanian
      ? [files + "/songs/data/SG01.json" + signed, site + "/songs/data/SG01.json"]
      : [site + "/songs/data/SG01.json"]);
    expect(output.play).toHaveBeenCalledExactlyOnceWith(song.a, 0, true);
    take.close();
  });
});
