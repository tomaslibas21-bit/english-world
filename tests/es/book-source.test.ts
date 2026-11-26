import { afterEach, describe, expect, it, vi } from "vitest";
import { bookSource } from "../../src/content/bookSource";
import { bookSource as smSource } from "../../src/editions/es-lt/content/bookSource";
import { TalkProgress } from "../../src/radio/talkProgress";
import { chapter, chapterIds, intro, mockBookFiles, mockFileToken, SITE, SME_FILES, SM_FILES, story } from "../support/spanish-books";

const fixtures = new URL("./fixtures/books/", import.meta.url);
const env = { VITE_RADIO_FILES: SME_FILES, VITE_RADIO_RECORDINGS: SM_FILES };
const setup = (replace?: (url: URL) => Response | undefined) => {
  const fetcher = mockBookFiles(fixtures, replace);
  const setToken = mockFileToken("sme token+");
  const source = bookSource(env, SITE)!;
  return { source, fetcher, setToken };
};

afterEach(() => vi.unstubAllGlobals());

describe("Spanish Master English Book FM", () => {
  it("selects the English learner's profile from the build and its configured Worker", () => {
    expect(bookSource({ VITE_RADIO_FILES: ` ${SME_FILES}/ ` }, SITE)?.profile).toBe("sme-en");
    expect(bookSource({}, SITE)).toBeNull();
    expect(bookSource({ ...env, VITE_RADIO_FILES: SM_FILES }, SITE)).toBeNull();
    expect(bookSource({ ...env, VITE_RADIO_RECORDINGS: `${SM_FILES}-other` }, SITE)).toBeNull();
  });

  it("keeps chapter zero first with an Introduction label and its authored title", async () => {
    const { source } = setup();
    const { books } = await source.catalog();
    const [first, second] = books[0].chapters;
    expect(first).toMatchObject({ id: "BK01-00", number: 0, title: "Cuentos de la selva", helperTitle: "Jungle Tales",
      introduction: { target: "Introducción", helper: "Introduction" }, selection: { ...intro, nextChapterId: "BK01-01" } });
    expect(second.selection).toEqual(chapter);
    expect(books[0]).toMatchObject({ readHref: "/books/book/BK01", cover: { 160: "/art/s/books/BK01.65adb81f.160.webp" } });
    const item = await source.load(first.selection);
    expect(item.issues).toEqual({});
    expect(item.tracks.paired?.cues.slice(0, 2)).toMatchObject([
      { sentenceId: "BK01-00-title", text: "Jungle Tales" }, { sentenceId: "BK01-00-title", text: "Cuentos de la selva" },
    ]);
  });

  it("keeps title, intro and body IDs and reads English translations and glosses from lt", async () => {
    const { source } = setup();
    const item = await source.load(chapter);
    expect(item.issues).toEqual({});
    expect(item.languages).toEqual({ target: "es", helper: "en" });
    expect(item.paragraphs.map(row => row.kind)).toEqual(["title", "introduction", "paragraph"]);
    expect(item.paragraphs[1]).toMatchObject({ sentences: [{
      id: "BK01-01-intro-01", target: "Horacio Quiroga es un escritor de Uruguay.", helper: "Horacio Quiroga is a writer from Uruguay.",
      units: expect.arrayContaining([["escritor", "writer", ""]]),
    }, expect.anything(), expect.anything()] });
    const { paired, target, helper } = item.tracks;
    expect(paired!.cues.map(cue => cue.sentenceId)).toEqual(chapterIds.flatMap(id => [id, id]));
    expect(paired!.cues.slice(0, 2)).toMatchObject([{ language: "en", text: "The Giant Turtle" }, { language: "es", start: 2.34 }]);
    expect(target!.cues.map(cue => cue.sentenceId)).toEqual(chapterIds);
    expect(helper!.cues.map(cue => cue.sentenceId)).toEqual(chapterIds);
    expect(target!.cues[1]).toMatchObject({ language: "es", start: 2.878625 });
    expect(helper!.cues[1]).toMatchObject({ language: "en", start: 2.34 });
    expect(target!.cues[1].words).toBeDefined();
    expect(helper!.cues[1].words).toBeUndefined();
    expect(source.links(item.chapter).audio("target")).toBe("/books/audio/BK01-01?mode=english");
  });

  it("loads unsigned app JSON even for paid titles and opens recordings only through SME's Worker", async () => {
    const { source, fetcher, setToken } = setup();
    const [paid, free, standalone] = await Promise.all([source.load(intro), source.load(chapter), source.load(story)]);
    expect(fetcher.mock.calls.every(([url]) => String(url).startsWith(`${SITE}/`) && !new URL(String(url)).searchParams.has("t"))).toBe(true);
    expect(fetcher.mock.calls.map(([url]) => url)).toEqual(expect.arrayContaining([
      `${SITE}/knygos/data/BK01-00.json`, ...["timing", "english-timing", "lithuanian-timing", "word-timing"].map(kind =>
        `${SITE}/knygos/audio/${kind}/BK01-00.json`), `${SITE}/stories/data/HIS-SG01.json`,
    ]));
    setToken("fresh sme+");
    for (const [item, id] of [[paid, intro.chapterId], [free, chapter.chapterId], [standalone, story.chapterId]] as const) {
      for (const [mode, folder] of [["paired", "EN-ES"], ["target", "ES"], ["helper", "EN"]] as const) {
        const track = item.tracks[mode]!;
        const suffix = item === paid ? "&t=fresh%20sme%2B" : "";
        expect(track.recording()).toBe(`${SME_FILES}/audio/v1/${folder}/${id}.mp3?v=${track.audioVersion}${suffix}`);
      }
    }
    expect(standalone.chapter).toMatchObject({ helperTitle: "One Word Every Morning", readHref: "/stories/HIS-SG01" });
    expect(source.links(standalone.chapter).audio("helper")).toBe("/stories/audio/HIS-SG01?mode=lithuanian");
    expect(await source.storyCover(story.chapterId)).toEqual({
      160: "/art/s/stories/HIS-SG01.6d8e2bc5.160.webp", 320: "/art/s/stories/HIS-SG01.6d8e2bc5.320.webp",
    });
  });

  it("declines Lithuanian paired folders and lookalike recording prefixes in SME audio configs", async () => {
    const { source } = setup(url => url.pathname.endsWith("/config.json") ? Response.json({
      baseUrl: `${SM_FILES}/audio/v1/LT-ES`, englishBaseUrl: `${SM_FILES}/audio/v1/ES`,
      lithuanianBaseUrl: `${SM_FILES}-other/audio/v1/EN`,
    }) : undefined);
    const item = await source.load(chapter);
    expect(item.issues).toEqual({ paired: "invalid", helper: "invalid" });
    expect(item.tracks.target?.recording()).toMatch(`${SME_FILES}/audio/v1/ES/`);
  });

  it("uses the same Spanish-only recording with separate profiles and bookmarks on one origin", async () => {
    const { source: sme } = setup();
    mockBookFiles(new URL("../es-lt/fixtures/books/", import.meta.url));
    const sm = smSource({ VITE_RADIO_FILES: SM_FILES }, SITE)!;
    const [english, lithuanian] = await Promise.all([sme.load(chapter), sm.load(chapter)]);
    const { target: es } = english.tracks;
    const { target: esLt } = lithuanian.tracks;
    expect(es!.audioVersion).toBe(esLt!.audioVersion);
    expect(es!.cues.map(({ textHash: _textHash, ...cue }) => cue)).toEqual(esLt!.cues.map(({ textHash: _textHash, ...cue }) => cue));
    expect(english.tracks.paired!.audioVersion).not.toBe(lithuanian.tracks.paired!.audioVersion);
    const data = new Map<string, string>();
    const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) };
    const progressSme = new TalkProgress(sme.profile, { storage });
    const progressSm = new TalkProgress(sm.profile, { storage });
    const bookmark = { sentence: "BK01-01-001", leg: "es", offsetSec: 1, fraction: 0.1, complete: false, audioVersion: es!.audioVersion } as const;
    progressSme.checkpoint(english.selection, bookmark);
    expect(new TalkProgress(sm.profile, { storage }).get(lithuanian.selection)).toBeUndefined();
    progressSm.checkpoint(lithuanian.selection, { ...bookmark, offsetSec: 2 });
    expect([...data.keys()]).toEqual(["ew-talk-v1:sme-en", "ew-talk-v1:sm-lt"]);
    expect(new TalkProgress(sme.profile, { storage }).get(chapter)?.offsetSec).toBe(1);
    expect(new TalkProgress(sm.profile, { storage }).get(chapter)?.offsetSec).toBe(2);
  });
});
