import type { BookCatalog, BookChapter, ShelfBook } from "../radio/books";
import type { BookSource } from "../radio/bookChannel";
import type { TalkProgressData } from "../radio/talkProgress";

export interface ShelfEntry extends Pick<ShelfBook, "id" | "title" | "helperTitle" | "cover" | "author" | "level" | "chapters"> {
  kind: "books" | "stories";
}

export function shelfEntries(catalog: BookCatalog): ShelfEntry[] {
  return [
    ...catalog.books.map((book): ShelfEntry => ({ ...book, kind: "books" })),
    ...catalog.stories.map((story): ShelfEntry => ({
      ...story, kind: "stories", chapters: [story], author: "", cover: {},
      level: catalog.modules.find((module) => module.number === story.module)?.name ?? "",
    })),
  ];
}

export function chapterPlace(entry: ShelfEntry, progress: Readonly<TalkProgressData>) {
  const chapters = entry.chapters.filter((row) => row.hasAudio);
  const marks = progress.items[chapters[0]?.selection.itemKey]?.chapters ?? {};
  let current: BookChapter | undefined;
  let done = 0;
  for (const chapter of chapters) {
    const mark = marks[chapter.id];
    if (mark?.complete) done++;
    else if (mark && (!current || mark.updatedAt > marks[current.id].updatedAt)) current = chapter;
  }
  const started = done > 0 || !!current;
  const chapter = current ?? chapters.find((row) => !marks[row.id]?.complete) ?? chapters[0];
  const action = started && done === chapters.length ? "replay" : started ? "resume" : "start";
  return { chapter, marks, done, action, started, current, fraction: chapter ? marks[chapter.id]?.fraction ?? 0 : 0 } as const;
}

/** Choose among this catalog's editions and playable chapters only. */
export function continueEntry(entries: ShelfEntry[], progress: Readonly<TalkProgressData>) {
  let latest: { entry: ShelfEntry; chapter: BookChapter; fraction: number; time: number } | undefined;
  for (const entry of entries) {
    const { current, marks } = chapterPlace(entry, progress);
    if (!current) continue;
    const mark = marks[current.id];
    if (!latest || mark.updatedAt > latest.time) latest = { entry, chapter: current, fraction: mark.fraction, time: mark.updatedAt };
  }
  return latest;
}

export type ShelfResult = { entries: ShelfEntry[]; failed: false } | { entries?: undefined; failed: true };
export async function loadShelf(source: Pick<BookSource, "catalog">, signal: AbortSignal, publish: (result: ShelfResult) => void) {
  try {
    const entries = shelfEntries(await source.catalog(signal));
    if (!signal.aborted) publish({ entries, failed: false });
  } catch {
    if (!signal.aborted) publish({ failed: true });
  }
}

export const coverButtonId = (id: string) => `cover-${id}`;
export function pickerFocus(root: ParentNode, savedId?: string) {
  return (savedId ? root.querySelector<HTMLElement>(`#${savedId}`) : null)
    ?? root.querySelector<HTMLElement>("[data-pad-default]") ?? root.querySelector("button");
}
