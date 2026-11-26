import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBookReviewSource } from "../src/content/bookReviewSource";
import { bookSource, EM_BOOK_PROFILE } from "../src/content/bookSource";
import type { TalkProfile } from "../src/radio/talkProgress";

const site = "http://review.test:8720";
const emRoot = "/__files/em-lt";
const fixture = (name: string) => JSON.parse(readFileSync(new URL(`./fixtures/books/${name}.json`, import.meta.url), "utf8"));
const env = (profile: TalkProfile = "em-lt") => ({
  VITE_BOOK_REVIEW: "1", VITE_BOOK_PROFILE: profile, VITE_RADIO_FILES: `/__files/${profile}`,
});
const selection = { itemKey: "book/BOOK-CANT/author", chapterId: "BOOK-CANT-01" } as const;
const localHash = "a".repeat(64);
const samples = new Uint8Array([1, 20, 3, 4, 55, 7]);

function emRoutes(): Record<string, unknown> {
  const bookIndex = fixture("knygos-index");
  const storyIndex = fixture("stories-index");
  const paired = fixture("BOOK-CANT-01-timing");
  const target = paired.timeline.filter((cue: { language: string }) => cue.language === "en");
  let start = 0;
  const timeline = target.map((cue: { start: number; end: number }) => {
    const end = start + Math.round((cue.end - cue.start) * 24_000) / 24_000;
    const row = { ...cue, start, end };
    start = end + 0.55;
    return row;
  });
  return {
    "/knygos/index.json": { books: [
      { ...bookIndex.books[0], chapters: bookIndex.books[0].chapters.slice(0, 2) },
      { ...bookIndex.books.find((book: { id: string }) => book.id === "BOOK-OZ"),
        chapters: bookIndex.books.find((book: { id: string }) => book.id === "BOOK-OZ").chapters.slice(0, 1) },
    ] },
    "/stories/index.json": { modules: storyIndex.modules.slice(0, 1), stories: storyIndex.stories.slice(0, 1) },
    "/knygos/audio/config.json": {
      baseUrl: emRoot + "/knygos/audio/v2", englishBaseUrl: emRoot + "/knygos/audio/en/v2",
      lithuanianBaseUrl: emRoot + "/knygos/audio/lt/v1",
    },
    [emRoot + "/knygos/data/BOOK-CANT-01.json"]: fixture("BOOK-CANT-01-data"),
    [emRoot + "/knygos/audio/timing/BOOK-CANT-01.json"]: paired,
    [emRoot + "/knygos/audio/lithuanian-timing/BOOK-CANT-01.json"]: fixture("BOOK-CANT-01-lithuanian-timing"),
    [emRoot + "/knygos/audio/english-timing/BOOK-CANT-01.json"]: {
      story_id: "BOOK-CANT-01", mode: "english", audio_sha256: { english: localHash },
      duration_seconds: timeline.at(-1).end, timeline,
    },
    [emRoot + "/knygos/audio/word-timing/BOOK-CANT-01.json"]: fixture("BOOK-CANT-01-word-timing"),
  };
}

function setup(routes = emRoutes(), profile: TalkProfile = "em-lt") {
  const fetcher = vi.fn<typeof fetch>(async (address, init) => {
    const url = new URL(String(address));
    expect(url.origin).toBe(site);
    expect(url.searchParams.has("t")).toBe(false);
    const path = url.pathname;
    if (path in routes) return Response.json(routes[path]);
    if (path === emRoot + "/knygos/audio/en/v2/BOOK-CANT-01.mp3" && url.searchParams.get("v") === localHash) {
      if (init?.method === "HEAD") return new Response(null, {
        headers: { "Content-Length": String(samples.length), "Accept-Ranges": "bytes" },
      });
      if (new Headers(init?.headers).get("Range") === "bytes=1-2") return new Response(samples.slice(1, 3), {
        status: 206, headers: { "Content-Range": `bytes 1-2/${samples.length}`, "Content-Length": "2" },
      });
    }
    return new Response(null, { status: 404 });
  });
  return { source: createBookReviewSource(env(profile), site, EM_BOOK_PROFILE, fetcher)!, fetcher };
}

function spanishRoutes(profile: "sme-en" | "sm-lt") {
  const root = `/__files/${profile}`;
  const helper = profile === "sme-en" ? "The Giant Turtle" : "Milžiniškas vėžlys";
  const helperIntro = profile === "sme-en" ? "A writer from Uruguay." : "Rašytojas iš Urugvajaus.";
  const record = { id: "BK01-01", n: 1, title: "La tortuga gigante", title_lt: helper, audio: true };
  const raw = { ...record, title_es: record.title, paragraphs: [
    { introduction: true, sentences: [{ n: 0, sentence_id: "intro-01", es: "Un escritor de Uruguay.", lt: helperIntro }] },
  ] };
  const title = [
    { sentence_id: "BK01-01-title", language: "lt", text: helper, start: 0, end: 2 },
    { sentence_id: "BK01-01-title", language: "es", text: record.title, start: 2.3, end: 4 },
  ];
  const intro = [
    { sentence_id: "BK01-01-intro-01", language: "lt", text: helperIntro, start: 4.5, end: 6 },
    { sentence_id: "BK01-01-intro-01", language: "es", text: "Un escritor de Uruguay.", start: 6.3, end: 8 },
  ];
  const timing = (mode: string, timeline: unknown[], duration: number) => ({
    story_id: "BK01-01", duration_seconds: duration, mode, timeline, audio_sha256: { [mode]: localHash },
  });
  return {
    "/knygos/index.json": { books: [{ id: "BK01", title: "Cuentos de la selva", chapters: [record] }] },
    "/stories/index.json": { stories: [], modules: [] },
    "/knygos/audio/config.json": {
      baseUrl: root + (profile === "sme-en" ? "/audio/v1/EN-ES" : "/audio/v1/LT-ES"),
      englishBaseUrl: root + "/audio/v1/ES", lithuanianBaseUrl: root + (profile === "sme-en" ? "/audio/v1/EN" : "/audio/v1/LT"),
    },
    [root + "/knygos/data/BK01-01.json"]: raw,
    [root + "/knygos/audio/timing/BK01-01.json"]: timing("bilingual", [...title, ...intro], 8),
    [root + "/knygos/audio/english-timing/BK01-01.json"]: timing("english",
      [{ ...title[1], start: 0, end: 1.7 }, { ...intro[1], start: 2.2, end: 3.9 }], 3.9),
    [root + "/knygos/audio/lithuanian-timing/BK01-01.json"]: timing("lithuanian",
      [title[0], { ...intro[0], start: 2.5, end: 4 }], 4),
  };
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("local review source", () => {
  it("requires an explicit review build, known profile and exact same-origin files prefix", () => {
    const remote = "https://audio.dvikalbesdainos.lt/fluent-steps";
    expect(createBookReviewSource({ ...env(), VITE_BOOK_REVIEW: undefined }, site, EM_BOOK_PROFILE)).toBeNull();
    expect(bookSource(env(), site)).toBeNull();
    expect(bookSource({ VITE_RADIO_FILES: remote }, site)).not.toBeNull();
    vi.stubEnv("VITE_BOOK_REVIEW", "1");
    expect(bookSource(env(), site)?.profile).toBe("em-lt");
    expect(bookSource({ ...env(), VITE_RADIO_FILES: remote }, site)).toBeNull();
    expect(createBookReviewSource({ ...env(), VITE_BOOK_PROFILE: "constructor" }, site, EM_BOOK_PROFILE)).toBeNull();
    expect(createBookReviewSource(env(), "http://review.test:8720/other", EM_BOOK_PROFILE)).toBeNull();
  });

  it("retains only the configured catalog members, cover widths and chapter order", async () => {
    const { source, fetcher } = setup();
    const catalog = await source.catalog();
    expect(catalog.books.map((book) => book.chapters.map((row) => row.id))).toEqual([
      ["BOOK-CANT-01", "BOOK-CANT-02"], ["BOOK-OZ-01"],
    ]);
    expect(catalog.books[0].chapters[0].selection.nextChapterId).toBe("BOOK-CANT-02");
    expect(catalog.stories.map((story) => story.id)).toEqual(["TOM-001"]);
    expect(catalog.books[0].cover).toEqual({
      160: "/art/s/books/BOOK-CANT.9fa4a49e.160.webp", 320: "/art/s/books/BOOK-CANT.9fa4a49e.320.webp",
    });
    expect(await source.storyCover("TOM-001")).toEqual({
      160: "/art/s/stories/TOM-001.00737b05.160.webp", 320: "/art/s/stories/TOM-001.00737b05.320.webp",
    });
    await expect(source.load({ ...selection, chapterId: "BOOK-CANT-03" })).rejects.toMatchObject({ kind: "missing" });
    await expect(source.load({ ...selection, chapterId: "../../BOOK-CANT-01" })).rejects.toMatchObject({ kind: "missing" });
    expect(fetcher.mock.calls.map(([address]) => address)).toEqual([site + "/knygos/index.json", site + "/stories/index.json"]);
  });

  it("pairs the local EM mono clock with its own version and makes the same address usable by HEAD and Range", async () => {
    vi.stubGlobal("localStorage", { getItem: () => JSON.stringify({ token: "never-in-review", exp: 9999999999 }) });
    const { source, fetcher } = setup();
    const item = await source.load(selection);
    expect(item.issues).toEqual({});
    const track = item.tracks.target!;
    expect(track.audioVersion).toBe(localHash);
    expect(track.cues.at(-1)!.end).toBeCloseTo(track.duration, 3);
    expect(track.recording()).toBe(site + emRoot + "/knygos/audio/en/v2/BOOK-CANT-01.mp3?v=" + localHash);
    const head = await fetcher(track.recording(), { method: "HEAD" });
    expect(head.headers.get("Content-Length")).toBe(String(samples.length));
    expect((await head.arrayBuffer()).byteLength).toBe(0);
    const range = await fetcher(track.recording(), { headers: { Range: "bytes=1-2" } });
    expect(range.status).toBe(206);
    expect(range.headers.get("Content-Range")).toBe("bytes 1-2/6");
    expect(await range.bytes()).toEqual(samples.slice(1, 3));
  });

  it.each(["sme-en", "sm-lt"] as const)("uses the %s helper, voiced title and introduction with correct course links", async (profile) => {
    const { source } = setup(spanishRoutes(profile), profile);
    const { books } = await source.catalog();
    expect(books[0].cover[320]).toBe("/art/s/books/BK01.65adb81f.320.webp");
    const item = await source.load(books[0].chapters[0].selection);
    expect(item.issues).toEqual({});
    expect(item.tracks.paired?.cues[0]).toMatchObject({
      sentenceId: "BK01-01-title", language: profile === "sme-en" ? "en" : "lt",
      text: profile === "sme-en" ? "The Giant Turtle" : "Milžiniškas vėžlys",
    });
    expect(item.tracks.target?.cues[1].sentenceId).toBe("BK01-01-intro-01");
    expect(item.tracks.helper?.recording()).toContain(profile === "sme-en" ? "/audio/v1/EN/" : "/audio/v1/LT/");
    expect(source.links(item.chapter).audio("target")).toBe(`${profile === "sme-en" ? "/books" : "/knygos"}/audio/BK01-01?mode=english`);
  });

  it("keeps paired narration and text when a review-only mono sidecar is missing", async () => {
    const routes = emRoutes();
    delete routes[emRoot + "/knygos/audio/english-timing/BOOK-CANT-01.json"];
    const { source, fetcher } = setup(routes);
    const item = await source.load(selection);
    expect(item.issues).toEqual({ target: "missing" });
    expect(item.tracks.paired).toBeDefined();
    expect(item.paragraphs).not.toHaveLength(0);
    expect(fetcher.mock.calls.every(([address]) => !String(address).includes("/derived/"))).toBe(true);
  });

  it("reports missing local chapter text through the review origin", async () => {
    const routes = emRoutes();
    delete routes[emRoot + "/knygos/data/BOOK-CANT-01.json"];
    const { source, fetcher } = setup(routes);
    await expect(source.load(selection)).rejects.toMatchObject({ kind: "missing", status: 404 });
    expect(fetcher.mock.calls.filter(([address]) => String(address).includes("/data/")))
      .toEqual([[site + emRoot + "/knygos/data/BOOK-CANT-01.json", expect.anything()]]);
  });

  it.each([
    "/__files/em-lt/../em-lt/knygos/audio/v2",
    "/__files/em-lt/%2e%2e/em-lt/knygos/audio/v2",
    "https://audio.dvikalbesdainos.lt/fluent-steps/knygos/audio/v2",
    "/__files/sme-en/knygos/audio/v2",
  ])("rejects a recording config that leaves the allowlisted prefix: %s", async (baseUrl) => {
    const routes = emRoutes();
    routes["/knygos/audio/config.json"] = { ...routes["/knygos/audio/config.json"] as object, baseUrl };
    const { source } = setup(routes);
    const item = await source.load(selection);
    expect(item.issues).toEqual({ paired: "invalid" });
    expect(item.tracks.paired).toBeUndefined();
  });
});
