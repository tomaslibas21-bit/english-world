import { afterEach, describe, expect, it, vi } from "vitest";
import { bookSource } from "../../src/content/bookSource";
import { chapter, chapterIds, intro, mockBookFiles, mockFileToken, SITE, SME_FILES, SM_FILES, story } from "../support/spanish-books";

const fixtures = new URL("./fixtures/books/", import.meta.url);
const env = { VITE_RADIO_FILES: SM_FILES };
const setup = (replace?: (url: URL) => Response | undefined) => {
  const fetcher = mockBookFiles(fixtures, replace);
  const setToken = mockFileToken("sm token+");
  const source = bookSource(env, SITE)!;
  return { source, fetcher, setToken };
};

afterEach(() => vi.unstubAllGlobals());

describe("Spanish Master Book FM", () => {
  it("selects the Lithuanian learner's profile from the build and its configured Worker", () => {
    expect(bookSource({ VITE_RADIO_FILES: ` ${SM_FILES}/ ` }, SITE)?.profile).toBe("sm-lt");
    expect(bookSource({}, SITE)).toBeNull();
    expect(bookSource({ VITE_RADIO_FILES: SME_FILES }, SITE)).toBeNull();
  });

  it("keeps chapter zero first with an Įžanga label and its authored title", async () => {
    const { source } = setup();
    const { books } = await source.catalog();
    const [first, second] = books[0].chapters;
    expect(first).toMatchObject({ id: "BK01-00", number: 0, title: "Cuentos de la selva", helperTitle: "Džiunglių pasakos",
      introduction: { target: "Introducción", helper: "Įžanga" }, selection: { ...intro, nextChapterId: "BK01-01" } });
    expect(second.selection).toEqual(chapter);
    expect(books[0]).toMatchObject({ readHref: "/knygos/book/BK01", cover: { 320: "/art/s/books/BK01.65adb81f.320.webp" } });
    const item = await source.load(first.selection);
    expect(item.issues).toEqual({});
    expect(item.tracks.paired?.cues.slice(0, 2)).toMatchObject([
      { sentenceId: "BK01-00-title", text: "Džiunglių pasakos" }, { sentenceId: "BK01-00-title", text: "Cuentos de la selva" },
    ]);
  });

  it("keeps the voiced cues and each mono clock with Lithuanian helper text and glosses", async () => {
    const { source } = setup();
    const item = await source.load(chapter);
    expect(item.issues).toEqual({});
    expect(item.languages).toEqual({ target: "es", helper: "lt" });
    expect(item.paragraphs.map(row => row.kind)).toEqual(["title", "introduction", "paragraph"]);
    expect(item.paragraphs[1]).toMatchObject({ sentences: [{
      id: "BK01-01-intro-01", target: "Horacio Quiroga es un escritor de Uruguay.", helper: "Orasijus Kiroga – rašytojas iš Urugvajaus.",
      units: expect.arrayContaining([["un escritor", "rašytojas", ""]]),
    }, expect.anything(), expect.anything()] });
    const { paired, target, helper } = item.tracks;
    expect(paired!.cues.map(cue => cue.sentenceId)).toEqual(chapterIds.flatMap(id => [id, id]));
    expect(paired!.cues.slice(0, 2)).toMatchObject([{ language: "lt", text: "Milžiniškas vėžlys" }, { language: "es", start: 2.54 }]);
    expect(target!.cues.map(cue => cue.sentenceId)).toEqual(chapterIds);
    expect(helper!.cues.map(cue => cue.sentenceId)).toEqual(chapterIds);
    expect(target!.cues[1]).toMatchObject({ language: "es", start: 2.878625 });
    expect(helper!.cues[1]).toMatchObject({ language: "lt", start: 2.74 });
    expect(source.links(item.chapter)).toMatchObject({ read: "/knygos/BK01-01" });
    expect(source.links(item.chapter).audio("paired")).toBe("/knygos/audio/BK01-01?mode=bilingual");
  });

  it("uses signed Worker JSON for paid titles, public JSON for free items, and SM recording folders", async () => {
    const { source, fetcher, setToken } = setup();
    const [paid, free, standalone] = await Promise.all([source.load(intro), source.load(chapter), source.load(story)]);
    const requests = fetcher.mock.calls.map(([url]) => String(url));
    expect(requests.filter(url => url.includes("BK01-00"))).toEqual([
      `${SM_FILES}/knygos/data/BK01-00.json?t=sm%20token%2B`,
      ...["timing", "english-timing", "lithuanian-timing", "word-timing"].map(kind => `${SM_FILES}/knygos/audio/${kind}/BK01-00.json?t=sm%20token%2B`),
    ]);
    expect(requests.filter(url => !url.includes("BK01-00")).every(url => url.startsWith(`${SITE}/`) && !new URL(url).search)).toBe(true);
    setToken("fresh sm+");
    for (const [item, id] of [[paid, intro.chapterId], [free, chapter.chapterId], [standalone, story.chapterId]] as const) {
      for (const [mode, folder] of [["paired", "LT-ES"], ["target", "ES"], ["helper", "LT"]] as const) {
        const track = item.tracks[mode]!;
        const suffix = item === paid ? "&t=fresh%20sm%2B" : "";
        expect(track.recording()).toBe(`${SM_FILES}/audio/v1/${folder}/${id}.mp3?v=${track.audioVersion}${suffix}`);
      }
    }
    expect(standalone.chapter).toMatchObject({ helperTitle: "Kasdien po vieną žodį", readHref: "/stories/HIS-SG01", module: 1 });
    expect(source.links(standalone.chapter).audio("helper")).toBe("/stories/audio/HIS-SG01?mode=lithuanian");
    expect(await source.storyCover(story.chapterId)).toEqual({
      160: "/art/s/stories/HIS-SG01.6d8e2bc5.160.webp", 320: "/art/s/stories/HIS-SG01.6d8e2bc5.320.webp",
    });
  });

  it("keeps a paid JSON denial on SM's Worker", async () => {
    const { source, fetcher } = setup(url => url.pathname.endsWith("/data/BK01-00.json") ? new Response(null, { status: 403 }) : undefined);
    await expect(source.load(intro)).rejects.toMatchObject({ kind: "access", status: 403 });
    expect(fetcher.mock.calls.map(([url]) => String(url)).filter(url => url.includes("/data/"))).toEqual([
      `${SM_FILES}/knygos/data/BK01-00.json?t=sm%20token%2B`,
    ]);
  });
});
