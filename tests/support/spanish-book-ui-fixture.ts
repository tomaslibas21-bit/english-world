import { readFileSync } from "node:fs";
import { spanishBookProfile } from "../../src/editions/es/content/bookSource";
import { normalizeBookCatalog, normalizeBookItem } from "../../src/radio/books";

export function spanishBookUiFixture(fixtures: URL, helper: "en" | "lt") {
  const json = (name: string) => JSON.parse(readFileSync(new URL(`${name}.json`, fixtures), "utf8"));
  const profile = spanishBookProfile(helper === "en" ? "sme-en" : "sm-lt", {
    covers: { BK01: ["65adb81f", 160, 320] }, storyCovers: async () => ({}),
  });
  const indexes = json("catalog");
  const catalog = normalizeBookCatalog(profile, indexes.knygos, indexes.stories);
  const book = catalog.books[0];
  const chapter = book.chapters.find(({ id }) => id === "BK01-01")!;
  const raw = json(chapter.id);
  const item = { ...normalizeBookItem(profile, chapter, {
    text: raw.data,
    words: raw["word-timing"],
    timing: { paired: raw.timing, target: raw["english-timing"], helper: raw["lithuanian-timing"] },
    recording: () => ({ open: () => "/recording.mp3", key: "local-master" }),
  }), book };
  return { catalog, book, chapter, item };
}
