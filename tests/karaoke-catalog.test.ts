import { describe, expect, it, vi } from "vitest";
import { SONG_COVERS } from "../src/content/songCovers";
import { fetchSongJson, karaokeCatalog, radioConfig, readSongList, songAudioUrls, songCoverUrl } from "../src/radio/songs";
import { SongCover } from "../src/ui/SongCover";

const config = radioConfig({
  VITE_RADIO_INDEX: "https://course.example/songs/index.json?version=public",
  VITE_RADIO_FILES: "https://files.example/fluent-steps",
})!;
const song = (id: string) => ({ id, c: "g", n: 1, t: `Song ${id}`, a: `/songs/audio/${id}.mp3` });
const ids = (prefix: string, first: number, last: number) => Array.from(
  { length: last - first + 1 }, (_, i) => prefix + String(first + i).padStart(2, "0"),
);

describe("the karaoke catalog", () => {
  it("joins all 160 Maple Harbor IDs by ID and keeps the order of the index", () => {
    const indexed = [
      ...ids("G", 1, 31), ...ids("V", 32, 61), ...ids("V", 92, 125),
      ...ids("S", 62, 91), ...ids("S", 96, 100), ...ids("P", 1, 30),
    ].reverse();
    const entries = karaokeCatalog(config, readSongList({ songs: indexed.map(song) }));
    expect(SONG_COVERS.size).toBe(160);
    expect(new Set(entries.map((e) => e.song.id)).size).toBe(160);
    expect(entries.map((e) => e.song.id)).toEqual(indexed);
    expect(entries.every((e) => e.thumbnail && e.jacket)).toBe(true);
    expect(entries.at(-1)).toMatchObject({
      thumbnail: "https://course.example/art/s/songs/G01.adb9ab38.160.webp",
      jacket: "https://course.example/art/s/songs/G01.adb9ab38.320.webp",
    });
    expect(songCoverUrl({ ...config, index: "/songs/index.json" }, "G01", 640)).toBe("/art/s/songs/G01.adb9ab38.640.webp");
    expect(songCoverUrl({ ...config, index: "//course.example/songs/index.json" }, "G01")).toBe("//course.example/art/s/songs/G01.adb9ab38.160.webp");
  });

  it("has no catalog without a configured index or playable entries", () => {
    expect(karaokeCatalog(radioConfig({}), readSongList({ songs: [song("G01")] }))).toEqual([]);
    expect(karaokeCatalog(config, readSongList({ songs: [] }))).toEqual([]);
    expect(readSongList({ songs: [null, {}, song(" "), { ...song("G01"), a: "" }, { ...song("G02"), t: " " }] })).toEqual([]);
    expect(readSongList({ songs: [song("G01"), { ...song("G01"), t: "duplicate" }] }).map((s) => s.t)).toEqual(["Song G01"]);
  });

  it("uses the files token for protected song data and the unsigned course fallback for G01", async () => {
    const token = "a+b /x?&#ą";
    const signed = "a%2Bb%20%2Fx%3F%26%23%C4%85";
    const read = vi.fn(async (url: string) => {
      if (url === `https://files.example/fluent-steps/songs/data/G01.json?t=${signed}`) throw new Error("404");
      return { L: [] };
    });
    await fetchSongJson(config, "G01", token, read);
    await fetchSongJson(config, "G02", token, read);
    expect(read.mock.calls.map(([url]) => url)).toEqual([
      `https://files.example/fluent-steps/songs/data/G01.json?t=${signed}`,
      "https://course.example/songs/data/G01.json",
      `https://files.example/fluent-steps/songs/data/G02.json?t=${signed}`,
    ]);
    expect(songAudioUrls(config, song("G01"), token)).toEqual([
      `https://files.example/fluent-steps/songs/audio/G01.mp3?t=${signed}`,
      "https://course.example/songs/audio/G01.mp3",
    ]);
    expect(songAudioUrls(config, { a: "https://other.example/take.mp3" }, token)).toEqual(["https://other.example/take.mp3"]);
    for (const a of ["/../other/take.mp3", "/%2e%2e/other/take.mp3", "https://files.example/fluent-steps/../other/take.mp3"]) {
      expect(songAudioUrls(config, { a }, token).join(" ")).not.toContain(signed);
    }
    expect(songCoverUrl({ ...config, index: `${config.index}&t=${signed}` }, "G01")).toBe("https://course.example/art/s/songs/G01.adb9ab38.160.webp");
  });

  it("keeps the paper sleeve if the jacket is missing from the map or returns 404", () => {
    const [known, missing] = karaokeCatalog(config, readSongList({ songs: [song("G01"), song("SB01")] }));
    expect(missing.thumbnail).toBeNull();
    const [img, sleeve] = SongCover({ entry: known }).props.children;
    expect(img.props.src).toBe(known.thumbnail);
    expect(img.props.alt).toBe("");
    const broken = { hidden: false };
    img.props.onError({ currentTarget: broken });
    expect(broken.hidden).toBe(true);
    expect(sleeve.props.children[1].props.children).toBe("G01");
    const [noImage, missingSleeve] = SongCover({ entry: missing }).props.children;
    expect(noImage).toBeNull();
    expect(missingSleeve.props.children[2].props.children).toBe("Song SB01");
  });
});
