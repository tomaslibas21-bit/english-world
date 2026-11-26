import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { BOOK_EDITION_KEY, EM_BOOK_PROFILE, bookSource } from "../src/content/bookSource";
import { bookWorkerUrl, coverUrls, createBookSource, normalizeBookCatalog } from "../src/radio/books";

const SITE = "https://course.test";
const FILES = "https://audio.dvikalbesdainos.lt/fluent-steps";
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/books/${name}.json`, import.meta.url), "utf8"));
const cant = { itemKey: "book/BOOK-CANT/author", chapterId: "BOOK-CANT-01" } as const;
const gatsby = { itemKey: "book/BOOK-GATSBY/easy", chapterId: "BOOK-GATSBY-01" } as const;
const tom = { itemKey: "story/TOM-001/standard", chapterId: "TOM-001" } as const;

function setup(replace?: (url: URL, name: string) => Response | Promise<Response> | undefined) {
  let token = "one + two";
  const fetcher = vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));
    const [, section, dir, folder, final] = url.pathname.replace(/^\/fluent-steps/, "").split("/");
    const id = (final ?? folder)?.replace(/\.json$/, "");
    const name = dir === "index.json" ? `${section}-index` : dir === "data" ? `${id}-data`
      : folder === "config.json" ? `${section}-audio-config` : `${id}-${folder}`;
    const replacement = replace?.(url, name);
    if (replacement) return replacement;
    try { return Response.json(fixture(name)); }
    catch { return new Response(null, { status: 404 }); }
  });
  const source = createBookSource({ profile: EM_BOOK_PROFILE, site: SITE, files: FILES, token: () => token, fetch: fetcher });
  return { source, fetcher, changeToken: (value: string) => { token = value; } };
}

describe("English Master book source", () => {
  it("keeps ordered IDs and covers for every listed book and reads the course preference", async () => {
    const { source, fetcher } = setup();
    expect(fetcher).not.toHaveBeenCalled();
    expect(bookSource({}, SITE)).toBeNull();
    expect(bookSource({ VITE_RADIO_FILES: FILES }, SITE)).not.toBeNull();
    const getItem = vi.fn((key: string) => key === BOOK_EDITION_KEY ? "author" : null);
    vi.stubGlobal("localStorage", { getItem });
    try {
      const { books, stories, modules } = await source.catalog();
      expect(getItem).toHaveBeenCalledWith(BOOK_EDITION_KEY);
      expect([books.length, stories.length, books.flatMap((b) => b.chapters).length]).toEqual([20, 158, 345]);
      expect(stories[0]).toMatchObject({ id: "TOM-001", module: modules[0].number });
      expect(books[0]).toMatchObject({
        id: "BOOK-CANT", readHref: "/knygos/book/BOOK-CANT",
        cover: { 160: "/art/s/books/BOOK-CANT.9fa4a49e.160.webp", 320: "/art/s/books/BOOK-CANT.9fa4a49e.320.webp" },
      });
      expect(books.every((book) => book.cover[160] && book.cover[320])).toBe(true);
      expect(books.find((b) => b.id === "BOOK-GATSBY")).toMatchObject({ edition: "author", level: "C1" });
      expect(fetcher.mock.calls.map(([url]) => url)).toEqual([`${SITE}/knygos/index.json`, `${SITE}/stories/index.json`]);
    } finally { vi.unstubAllGlobals(); }
  });

  it("coalesces one chapter load and keeps its authored paragraphs, speech legs and independent clocks", async () => {
    const { source, fetcher } = setup();
    const [item, same] = await Promise.all([source.load(cant), source.load(cant)]);
    expect(item).toBe(same);
    expect(item.issues).toEqual({});
    expect(item.languages).toEqual({ target: "en", helper: "lt" });
    expect(item.paragraphs[0]).toMatchObject({ kind: "paragraph", sentences: [{ units: expect.arrayContaining([
      ["to buy", "nusipirkti", "tu baɪ"], ["an", "—", "ən"],
    ]) }, ...Array.from({ length: 4 }, () => expect.any(Object))] });
    const paired = item.tracks.paired!;
    const [helper, target] = paired.cues;
    expect(helper).toMatchObject({ sentenceId: "BOOK-CANT-01-S001", start: 0, language: "lt" });
    expect(helper.end).toBeCloseTo(4.669, 3);
    expect(target).toMatchObject({ sentenceId: helper.sentenceId, language: "en", text: "Mr. Otis wanted to buy an old house in England." });
    expect(target.start).toBeCloseTo(4.969, 3);
    expect(target.words?.[0]?.[0]).toBeCloseTo(target.start + 0.33);
    expect(helper.words).toBeUndefined();
    expect(item.tracks.helper?.cues[1].start).toBeCloseTo(helper.end + 0.55);
    expect(item.tracks.target?.cues[0].start).toBe(0);
    expect(item.tracks.target?.cues[1].start).toBeCloseTo(Math.round((target.end - target.start) * 24_000) / 24_000 + 0.55);
    expect(paired.rateSwitches).toHaveLength(12);
    expect(paired.recording()).toBe(`${FILES}/knygos/audio/v2/BOOK-CANT-01.mp3?v=${paired.audioVersion}`);
    expect(item.selection.nextChapterId).toBe("BOOK-CANT-02");
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("/data/"))).toHaveLength(1);
    expect(fetcher.mock.calls.every(([url, init]) => String(url).startsWith(SITE) &&
      !String(url).includes("?t=") && init?.redirect === "error")).toBe(true);
    expect(source.links(item.chapter).audio("target")).toBe("/knygos/audio/BOOK-CANT-01?mode=english");
  });

  it("uses the easy clock and metadata with the canonical internal ID and recording filename", async () => {
    const { source, fetcher } = setup();
    const { books } = await source.catalog(undefined, "easy");
    const book = books.find((row) => row.id === "BOOK-GATSBY")!;
    expect(book).toMatchObject({ edition: "easy", level: "B1+" });
    expect(book.chapters[0]).toMatchObject({ fileId: "BOOK-GATSBY-01.easy", words: 2651, hasAudio: true });
    const item = await source.load(gatsby);
    expect(item.tracks.paired?.cues[0].sentenceId).toBe("BOOK-GATSBY-01-S001");
    expect(item.tracks.paired?.recording()).toContain("/v3/BOOK-GATSBY-01.mp3?v=");
    expect(item.tracks.target?.recording()).toContain("/en/v3/BOOK-GATSBY-01.mp3?v=");
    expect(item.tracks.helper?.recording()).toBe(`${FILES}/knygos/audio/lt/v2/BOOK-GATSBY-01.mp3`);
    expect(fetcher.mock.calls.some(([url]) => url === `${SITE}/knygos/audio/timing/BOOK-GATSBY-01.easy.json`)).toBe(true);
  });

  it("reads a standalone story and loads story art separately", async () => {
    const storyCovers = vi.fn(EM_BOOK_PROFILE.storyCovers);
    const { source, fetcher } = setup();
    const instrumented = createBookSource({ profile: { ...EM_BOOK_PROFILE, storyCovers }, site: SITE, files: FILES, fetch: fetcher });
    await instrumented.catalog();
    expect(storyCovers).not.toHaveBeenCalled();
    expect(await instrumented.storyCover("TOM-001")).toEqual({
      160: "/art/s/stories/TOM-001.00737b05.160.webp", 320: "/art/s/stories/TOM-001.00737b05.320.webp",
    });
    const item = await source.load(tom);
    expect(item.chapter.title).toBe("The Soup He Chose");
    expect(item.selection.nextChapterId).toBeUndefined();
    expect(item.tracks.paired?.cues[0].sentenceId).toBe("TOM-001-S001");
    expect(source.links(item.chapter)).toMatchObject({ read: "/stories/TOM-001" });
    expect(source.links(item.chapter).audio("helper")).toBe("/stories/audio/TOM-001?mode=lithuanian");
  });

  it("keeps sparse recording IDs aligned with dense display sentences, both clocks, and word rows", async () => {
    const { source } = setup((_, name) => {
      if (!name.startsWith("BOOK-CANT-01-") || !name.endsWith("timing")) return;
      const data = fixture(name);
      const rows = data.timeline ?? data.lines;
      for (const row of rows) {
        row.sentence_id = row.sentence_id.replace(/S00([3-6])$/, (_: string, n: string) => `S00${Number(n) + 1}`);
      }
      return Response.json(data);
    });
    const item = await source.load(cant);
    const paired = item.tracks.paired!;
    expect(item.issues).toEqual({});
    expect(item.paragraphs[0]).toMatchObject({ sentences: expect.arrayContaining([{ id: "BOOK-CANT-01-S004",
      target: paired.cues[5].text, helper: paired.cues[4].text, textHash: paired.cues[5].textHash, units: expect.any(Array) }]) });
    expect(paired.cues[5].sentenceId).toBe("BOOK-CANT-01-S004");
    expect(paired.cues[5].words).toBeDefined();
    expect(item.tracks.helper?.cues[2].sentenceId).toBe("BOOK-CANT-01-S004");
  });

  it("preserves breaks and natural translation, and falls back for missing or misaligned words and covers", async () => {
    const { source } = setup((_, name) => {
      if (name === "BOOK-CANT-01-data") {
        const data = fixture(name);
        data.paragraphs.splice(1, 0, { break: true });
        return Response.json(data);
      }
      if (name === "BOOK-CANT-01-word-timing") {
        const data = fixture(name);
        data.lines[0].w.pop();
        data.lines[1].w[0] = null;
        return Response.json(data);
      }
    });
    const item = await source.load(cant);
    expect(item.paragraphs[1]).toEqual({ kind: "break" });
    expect(item.paragraphs[0]).toMatchObject({ sentences: [expect.objectContaining({
      helper: "Ponas Otisas norėjo nusipirkti seną namą Anglijoje.",
    }), ...Array.from({ length: 4 }, () => expect.any(Object))] });
    expect(item.tracks.paired?.cues[1].words).toBeUndefined();
    expect(item.tracks.paired?.cues[3].words).toBeUndefined();
    expect(item.tracks.paired?.cues[5].words).toBeDefined();
    expect(coverUrls(EM_BOOK_PROFILE.covers, "books", "NONE")).toEqual({});
  });

  it.each([401, 403, 404])("distinguishes HTTP %i and never probes an alternate host", async (status) => {
    const { source, fetcher } = setup((_, name) => name === "TOM-002-data" ? new Response(null, { status }) : undefined);
    const selection = { itemKey: "story/TOM-002/standard", chapterId: "TOM-002" } as const;
    await expect(source.load(selection)).rejects.toMatchObject({ kind: status === 404 ? "missing" : "access", status });
    const requests = fetcher.mock.calls.filter(([url]) => String(url).includes("/data/"));
    expect(requests).toHaveLength(1);
    expect(requests[0][0]).toBe(`${FILES}/stories/data/TOM-002.json?t=one%20%2B%20two`);
  });

  it("retains valid text and other tracks when a sidecar is missing, malformed, or belongs to another recording", async () => {
    expect(() => normalizeBookCatalog(EM_BOOK_PROFILE, { books: "no" }, fixture("stories-index"))).toThrow("invalid");
    const bad = setup((_, name) => {
      if (name === "BOOK-CANT-01-lithuanian-timing") return new Response(null, { status: 404 });
      if (name === "BOOK-CANT-01-timing") {
        const data = fixture(name);
        data.timeline[1].start = "4.969";
        return Response.json(data);
      }
    });
    const item = await bad.source.load(cant);
    expect(item.paragraphs).not.toHaveLength(0);
    expect(item.tracks).toEqual({});
    expect(item.issues).toEqual({ paired: "invalid", target: "invalid", helper: "missing" });
    const wrongClock = setup((_, name) => {
      if (name !== "BOOK-CANT-01-timing") return;
      const data = fixture(name);
      data.timeline[0].sentence_id = "BOOK-CANT-01-S002";
      return Response.json(data);
    });
    expect((await wrongClock.source.load(cant)).tracks.helper).toBeDefined();
    const noWords = setup((_, name) => name.endsWith("word-timing") ? new Response(null, { status: 404 }) : undefined);
    expect((await noWords.source.load(cant)).tracks.target?.cues[0].words).toBeUndefined();
  });

  it("uses revised paid timing paths and resolves the latest token on recording open", async () => {
    const { source, fetcher, changeToken } = setup((_, name) => {
      if (!name.startsWith("TOM-020-")) return;
      const data = fixture(name.replace("TOM-020", "TOM-001"));
      return new Response(JSON.stringify(data).replaceAll("TOM-001", "TOM-020"));
    });
    const item = await source.load({ itemKey: "story/TOM-020/standard", chapterId: "TOM-020" });
    expect(fetcher.mock.calls.some(([url]) => url === `${FILES}/stories/audio/timing/TOM-020.json?v=narration-20261031-2&t=one%20%2B%20two`)).toBe(true);
    expect(JSON.stringify(item)).not.toContain("one + two");
    changeToken("fresh");
    expect(item.tracks.paired?.recording()).toBe(`${FILES}/stories/audio/v2/TOM-020.mp3?v=${item.tracks.paired?.audioVersion}&t=fresh`);
  });

  it.each([
    `${FILES}-other/knygos/audio/v2/id.mp3`, `${FILES}/../outside.mp3`,
    `${FILES}/%2e%2e/outside.mp3`, `${FILES}\\outside.mp3`,
    "https://audio.dvikalbesdainos.lt.attacker.test/fluent-steps/id.mp3",
    "https://audio.dvikalbesdainos.lt@attacker.test/fluent-steps/id.mp3",
    `${FILES}/id.mp3?t=existing`,
  ])("rejects malicious or out-of-bound Worker URL %s", (url) => {
    expect(bookWorkerUrl(FILES, url, "a secret")).toBeNull();
  });

  it("rejects a lookalike audio folder and allows one of two concurrent consumers to cancel", async () => {
    const { source, fetcher } = setup((_, name) => {
      if (name !== "knygos-audio-config") return;
      return Response.json({ ...fixture(name), baseUrl: `${FILES}-mirror/knygos/audio/v2` });
    });
    const controller = new AbortController();
    const first = source.load(cant, controller.signal);
    const second = source.load(cant);
    controller.abort();
    await expect(first).rejects.toMatchObject({ name: "AbortError" });
    const item = await second;
    expect(item.tracks.paired).toBeUndefined();
    expect(item.tracks.target).toBeDefined();
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("/data/"))).toHaveLength(1);
  });
});
