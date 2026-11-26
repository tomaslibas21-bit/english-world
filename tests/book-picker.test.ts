import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { bookWord, chapterCount } from "../src/content/bookCopy";
import { EM_BOOK_PROFILE, bookSource } from "../src/content/bookSource";
import { createBookChannel } from "../src/radio/bookChannel";
import { normalizeBookCatalog } from "../src/radio/books";
import { BookDetail, Jacket } from "../src/ui/BookPicker";
import { chapterPlace, continueEntry, coverButtonId, loadShelf, pickerFocus, shelfEntries } from "../src/ui/bookShelf";

const catalog = normalizeBookCatalog(EM_BOOK_PROFILE, {
  books: [{ id: "BOOK-CANT", title: "The Canterville Ghost", title_lt: "Kentervilio vaiduoklis", author: "Oskaras Vaildas", level: "A2/A2+",
    chapters: [{ id: "BOOK-CANT-00", n: 0, title: "About the author", audio: true }, { id: "BOOK-CANT-01", n: 1, title: "A house with a warning", audio: true }] }],
}, { modules: [{ n: 1, name: "1 modulis" }], stories: [{ id: "TOM-001", title: "The Soup He Chose", n: 1, module: 1, audio: true }] });
const entries = shelfEntries(catalog);
const [book, story] = entries;
const mark = { sentence: "test-S001", leg: "lt", offsetSec: 1, fraction: 0.36, audioVersion: "123abc", complete: false } as const;

function shelf() {
  const source = bookSource({ VITE_RADIO_FILES: "https://audio.dvikalbesdainos.lt/fluent-steps" }, "https://course.test")!;
  const channel = createBookChannel(source, { setRates() {}, stop() {}, start: async () => {}, position: () => null });
  const snapshot = channel.progress.getSnapshot;
  const detail = (entry = book) => renderToStaticMarkup(createElement(BookDetail, { channel, entry, listen() {} }));
  return { channel, snapshot, detail };
}

describe("Book FM shelf and chapter detail", () => {
  it("keeps the source order and gives a fresh book a single start action and a focusable introduction", () => {
    const { detail, snapshot } = shelf();
    expect(continueEntry(entries, snapshot())).toBeUndefined();
    expect(chapterPlace(book, snapshot())).toMatchObject({ chapter: book.chapters[0], started: false, action: "start" });
    const html = detail();
    expect(html).toContain('id="chapter-BOOK-CANT-00" class="chapter" data-pad-default="true"');
    expect(html).toContain("Įžanga");
    expect(html.indexOf("About the author")).toBeLessThan(html.indexOf("A house with a warning"));
    expect(html.match(/class="primary"/g)).toHaveLength(1);
    expect(html).toContain("Pradėti klausytis");
    expect(html).toContain("2 skyriai");
    expect(html).toContain("BOOK-CANT.9fa4a49e.320.webp");
  });

  it("continues the most recently started unfinished chapter or story, ignoring removed items and editions", () => {
    let time = 0;
    const clock = vi.spyOn(Date, "now").mockImplementation(() => ++time);
    try {
      const { channel, snapshot } = shelf();
      const save = channel.progress.checkpoint.bind(channel.progress);
      save(book.chapters[1].selection, mark);
      save(story.chapters[0].selection, mark);
      expect(continueEntry(entries, snapshot())).toMatchObject({ entry: story, fraction: 0.36 });
      save(story.chapters[0].selection, { ...mark, complete: true, fraction: 1 });
      save({ ...book.chapters[1].selection, itemKey: "book/BOOK-CANT/easy" }, mark);
      expect(continueEntry(entries, snapshot())).toMatchObject({ entry: book, chapter: book.chapters[1] });
      expect(continueEntry([story], snapshot())).toBeUndefined();
    } finally { clock.mockRestore(); }
  });

  it("marks current and finished chapters, focuses the bookmark, and offers replay after completion", () => {
    const { channel, detail } = shelf();
    channel.progress.checkpoint(book.chapters[0].selection, { ...mark, complete: true, fraction: 1 });
    channel.progress.checkpoint(book.chapters[1].selection, mark);
    const html = detail();
    expect(html).toContain('id="chapter-BOOK-CANT-01" class="chapter current" data-pad-default="true" aria-current="true"');
    expect(html).toContain("Čia sustojai");
    expect(html).not.toContain("Dabar klausaisi");
    const snapshot = channel.player.getSnapshot();
    const playback = vi.spyOn(channel.player, "getSnapshot").mockReturnValue({
      ...snapshot, status: "playing", selection: book.chapters[1].selection,
    });
    expect(detail()).toContain("Dabar klausaisi");
    playback.mockReturnValue({ ...snapshot, status: "playing", selection: story.chapters[0].selection });
    expect(detail()).toContain("Čia sustojai");
    expect(detail()).not.toContain("Dabar klausaisi");
    playback.mockRestore();
    expect(html).toContain("Išklausyta");
    expect(html).toContain("Klausytis toliau");
    channel.progress.checkpoint(book.chapters[1].selection, { ...mark, complete: true, fraction: 1 });
    expect(detail()).toContain("Klausytis dar kartą");
    expect(detail()).not.toContain("Dabar klausaisi");
  });

  it("treats a story as one listening item and supplies a cloth spine when a cover is missing", () => {
    const { detail } = shelf();
    expect(story.chapters).toHaveLength(1);
    expect(story.chapters[0].selection.nextChapterId).toBeUndefined();
    const html = detail(story);
    expect(html).toContain("The Soup He Chose");
    expect(html).toContain('id="chapter-TOM-001"');
    expect(html).toContain("cloth-spine");
    const cover = renderToStaticMarkup(createElement(Jacket, { urls: {}, size: 160 }));
    expect(cover).toContain("aspect-ratio:160 / 241");
    expect(cover).not.toContain("<img");
  });

  it("reports offline, retries the catalog, and distinguishes an empty shelf from a canceled request", async () => {
    const source = { catalog: vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce(catalog)
      .mockResolvedValue({ books: [], stories: [], modules: [] }) };
    const publish = vi.fn();
    const signal = new AbortController().signal;
    await loadShelf(source, signal, publish);
    expect(publish).toHaveBeenLastCalledWith({ failed: true });
    await loadShelf(source, signal, publish);
    expect(publish).toHaveBeenLastCalledWith({ failed: false, entries });
    await loadShelf(source, signal, publish);
    expect(publish).toHaveBeenLastCalledWith({ failed: false, entries: [] });
    await loadShelf(source, AbortSignal.abort(), publish);
    expect(publish).toHaveBeenCalledTimes(3);
  });

  it("returns to the same cover after reordering, with a default when the item was removed", () => {
    const buttons = entries.map((entry) => ({ id: coverButtonId(entry.id) }));
    const opened = buttons[0].id;
    buttons.reverse();
    const root = { querySelector: (selector: string) => selector === "[data-pad-default]" ? buttons[0] : buttons.find((el) => "#" + el.id === selector) };
    expect(pickerFocus(root as ParentNode, opened)?.id).toBe(opened);
    buttons.pop();
    expect(pickerFocus(root as ParentNode, opened)?.id).toBe(buttons[0].id);
  });

  it("uses the course's Lithuanian action forms, percent label and chapter number inflections", () => {
    expect(bookWord("browse")).toBe("Rinktis knygą");
    expect(bookWord("retry")).toBe("Pabandyk dar kartą");
    expect(bookWord("complete", { percent: "36 %" })).toBe("Išklausyta 36 %");
    expect([1, 8, 10, 11, 21].map(chapterCount)).toEqual(["1 skyrius", "8 skyriai", "10 skyrių", "11 skyrių", "21 skyrius"]);
  });
});
