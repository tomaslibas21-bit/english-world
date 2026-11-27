import { readSongList } from "../radio/songs";
import type { CourseProfile } from "./profile";
import { positive, record, type Stamp } from "./stamps";
import { copy, withCount, words, type Words } from "./words";

export const COURSE_KEY = "fluentsteps.course.v1";
export const COURSE_EVENT = "fluentsteps:course";
export type CourseSection = "songs" | "books";
export type CatalogItem = { id: string; title: Words };
export type Book = CatalogItem & { chapters: CatalogItem[] };
export type Catalogs = { songs?: CatalogItem[]; books?: Book[] };
export type CourseItems = Record<string, unknown>;

export function readCourse(raw: string | null): CourseItems {
  try {
    const data = raw && JSON.parse(raw);
    if (data?.version === 1 && record(data.items)) return data.items;
  } catch { /* an unreadable course save has no proof */ }
  return {};
}
const validId = (id: unknown): id is string => typeof id === "string" && /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(id);

export function songCatalog(data: unknown): CatalogItem[] {
  const songs = new Map<string, CatalogItem>();
  for (const s of readSongList(data)) if (validId(s.id) && s.t.trim())
    songs.set(s.id, { id: s.id, title: words(s.t, s.tl) });
  return [...songs.values()];
}
function bookItem(item: unknown): CatalogItem | null {
  return record(item) && validId(item.id) && typeof item.title === "string" && item.title.trim()
    ? { id: item.id, title: words(item.title, typeof item.title_lt === "string" ? item.title_lt : "") } : null;
}
export function bookCatalog(data: unknown): Book[] {
  if (!record(data) || !Array.isArray(data.books)) return [];
  const books: Book[] = [], ids = new Set<string>();
  for (const raw of data.books) {
    const book = bookItem(raw);
    if (!book || ids.has(book.id) || !Array.isArray(raw.chapters) || !raw.chapters.length) continue;
    const chapters = raw.chapters.map(bookItem) as (CatalogItem | null)[];
    // A damaged index must never shorten a book enough to award its cover.
    if (!chapters.every((c): c is CatalogItem => !!c && !ids.has(c.id) && c.id !== book.id) || new Set(chapters.map(c => c.id)).size !== chapters.length) continue;
    ids.add(book.id);
    chapters.forEach(c => ids.add(c.id));
    books.push({ ...book, chapters });
  }
  return books;
}
const cache: Catalogs = {};
export async function loadCatalog(section: CourseSection, signal: AbortSignal): Promise<Catalogs> {
  if (cache[section]) return { [section]: cache[section] };
  const res = await fetch(section === "songs" ? "/songs/index.json" : "/knygos/index.json", { signal, mode: "same-origin" });
  if (!res.ok) throw new Error("catalog unavailable");
  const data: unknown = await res.json();
  const catalog = section === "songs" ? songCatalog(data) : bookCatalog(data);
  if (!catalog.length) throw new Error("empty catalog");
  const part = { [section]: catalog };
  Object.assign(cache, part);
  return part;
}
export function courseStamps(catalogs: Catalogs, items: CourseItems, profile: CourseProfile): Stamp[] {
  const rows: Stamp[] = [];
  for (const song of catalogs.songs ?? []) {
    const id = "songs:" + song.id, item = items[id];
    const earned = record(item) && positive(item.heard);
    rows.push({ id, section: "songs", title: song.title, condition: copy.song, earned, proof: earned ? [copy.heard] : [], href: "/songs/" + song.id });
  }
  for (const book of catalogs.books ?? []) {
    const chapters: Stamp[] = book.chapters.map(ch => {
      const id = "books:" + ch.id, item = items[id];
      const proof: Words[] = [];
      if (record(item) && positive(item.read)) proof.push(copy.read);
      if (record(item) && positive(item.heard)) proof.push(copy.heard);
      return { id, section: "books", title: ch.title, book: book.title, condition: copy.chapter, proof, earned: !!proof.length, href: profile.chapterPath + ch.id };
    });
    const n = chapters.filter(c => c.earned).length, earned = n === chapters.length;
    const total = withCount(copy.chapters, n + "/" + chapters.length);
    rows.push({ id: "covers:" + book.id, section: "books", title: book.title, book: book.title, condition: copy.cover,
      earned, proof: earned ? [total, copy.complete] : [total], href: chapters[0].href },
      ...chapters.map(c => ({ ...c, proof: [...c.proof, total] })));
  }
  return rows;
}

export function needsCatalog(items: CourseItems, section: CourseSection) {
  return Object.entries(items).some(([id, v]) => id.startsWith(section + ":") && record(v) &&
    (positive(v.heard) || (section === "books" && positive(v.read))));
}
