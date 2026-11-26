import { isRecord, safeTalkId, TALK_LANGUAGES, type TalkLanguage, type TalkMode, type TalkProfile, type TalkSelection } from "./talkProgress";
import { talkFingerprint, type TalkCue, type TalkFailure, type TalkItem, type TalkTrack } from "./talkPlayer";

type Section = "knygos" | "stories";
type CoverKind = "books" | "stories";
type Edition = "author" | "easy" | "standard";
type TimingKind = "timing" | "english-timing" | "lithuanian-timing" | "word-timing";
type CoverTable = Readonly<Record<string, readonly (string | number)[]>>;
type IntroductionLabels = { target: string; helper: string };
const MODES: readonly TalkMode[] = ["paired", "target", "helper"];
const COURSE_MODES = { paired: "bilingual", target: "english", helper: "lithuanian" } as const;
const FOLDER_FIELDS = { paired: "baseUrl", target: "englishBaseUrl", helper: "lithuanianBaseUrl" } as const;

export interface BookProfile {
  id: TalkProfile;
  bookRoute: "/knygos" | "/books";
  targetField: "en" | "es";
  timingLanguage: { target: string; helper: string };
  targetClock: "derive" | "file";
  sparseTimingIds?: boolean;
  narratedTitle?: boolean;
  introductionLabels?: IntroductionLabels;
  editions?: { easyBooks: ReadonlySet<string>; read: () => "easy" | "author" };
  jsonOnSite: (section: Section, id: string) => boolean;
  freeRecording: (section: Section, id: string) => boolean;
  recordingFolder: (path: string, section: Section, mode: TalkMode) => boolean;
  timingRevision?: (section: Section, kind: TimingKind, fileId: string) => string | undefined;
  covers: CoverTable;
  storyCovers: () => Promise<CoverTable>;
}

interface SourceOptions {
  profile: BookProfile;
  site: string;
  files: string;
  /** Some course configs name a shared storage prefix instead of their own Worker. */
  recordings?: string;
  token?: () => string | null;
  fetch?: typeof fetch;
}

export type CoverUrls = Partial<Record<160 | 320, string>>;

export interface BookChapter {
  selection: TalkSelection;
  id: string;
  fileId: string;
  section: Section;
  edition: Edition;
  title: string;
  helperTitle: string;
  number: number;
  introduction?: IntroductionLabels;
  hasAudio: boolean;
  words?: number;
  readHref: string;
}

export interface ShelfBook {
  id: string;
  title: string;
  helperTitle: string;
  author: string;
  level: string;
  edition: Edition;
  words?: number;
  cover: CoverUrls;
  readHref: string;
  chapters: BookChapter[];
}

export interface ShelfStory extends BookChapter { module?: number }

export interface BookCatalog {
  books: ShelfBook[];
  stories: ShelfStory[];
  modules: { number: number; name: string; range: string }[];
}

export type BookUnit = readonly [target: string, gloss: string, ipa: string];
export interface BookSentence {
  id: string;
  target: string;
  helper: string;
  units: BookUnit[];
  textHash: string;
}
export type BookParagraph = { kind: "break" } | {
  kind: "paragraph" | "title" | "introduction";
  helper?: string;
  sentences: BookSentence[];
};
export interface BookItem extends TalkItem {
  chapter: BookChapter;
  paragraphs: BookParagraph[];
  languages: { target: TalkLanguage; helper: TalkLanguage };
}

export class BookSourceError extends Error {
  constructor(readonly kind: TalkFailure, readonly status?: number) {
    super(status === undefined ? `Course book: ${kind}` : `Course book: ${kind} (${status})`);
    this.name = "BookSourceError";
  }
}

const string = (value: unknown) => typeof value === "string" ? value : "";
const integer = (v: unknown): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const time = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;
const sha = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const normalized = (s: string) => s.replaceAll("*", "").normalize("NFC").trim().replace(/\s+/g, " ");

function httpUrl(value: string): URL | null {
  // Reject path encodings and dot segments before URL normalization can reinterpret them.
  if (/[\\\s]/.test(value) || !/^https?:\/\//i.test(value) ||
      /(?:^|\/)\.{1,2}(?=\/|\?|#|$)/.test(value.split("?")[0])) return null;
  try {
    const url = new URL(value);
    return url.username || url.password || url.hash || /[%\\]|\/\//.test(url.pathname) ? null : url;
  } catch { return null; }
}

function rootUrl(value: string): URL | null {
  const url = httpUrl(value);
  if (!url || url.search) return null;
  url.pathname = url.pathname.replace(/\/$/, "");
  return url;
}

function underRoot(root: URL, value: string): URL | null {
  const url = httpUrl(value);
  const prefix = root.pathname.replace(/\/$/, "") + "/";
  return url?.origin === root.origin && url.pathname.startsWith(prefix) && url.pathname.length > prefix.length ? url : null;
}

/** Refuses even unsigned requests outside the exact configured Worker boundary. */
export function bookWorkerUrl(files: string, address: string, token?: string | null): string | null {
  const root = rootUrl(files);
  const url = root && underRoot(root, address);
  if (!url || url.searchParams.has("t")) return null;
  // Preserve the course's encoding of existing revision parameters.
  return token ? `${url.href}${url.search ? "&" : "?"}t=${encodeURIComponent(token)}` : url.href;
}

export function courseReadingLinks(profile: BookProfile, section: Section, id: string) {
  if (!safeTalkId(id)) throw new BookSourceError("invalid");
  const root = section === "knygos" ? profile.bookRoute : "/stories";
  return { read: `${root}/${id}`, audio: (mode: TalkMode) => `${root}/audio/${id}?mode=${COURSE_MODES[mode]}` };
}

export function coverUrls(table: CoverTable, kind: CoverKind, id: string): CoverUrls {
  const entry = safeTalkId(id) ? table[id] : undefined;
  if (!entry || !/^[a-f0-9]{8}$/.test(String(entry[0]))) return {};
  const path = `/art/s/${kind}/${id}.${entry[0]}`;
  return {
    ...(entry.includes(160) && { 160: `${path}.160.webp` }),
    ...(entry.includes(320) && { 320: `${path}.320.webp` }),
  };
}

export function normalizeBookCatalog(profile: BookProfile, bookIndex: unknown, storyIndex: unknown,
  preferred = profile.editions?.read()): BookCatalog {
  if (!isRecord(bookIndex) || !Array.isArray(bookIndex.books) || !isRecord(storyIndex) ||
      !Array.isArray(storyIndex.stories) || !Array.isArray(storyIndex.modules)) throw new BookSourceError("invalid");
  const books: ShelfBook[] = [];
  const chapterIds = new Set<string>();
  const seenBooks = new Set<string>();
  for (const book of bookIndex.books) {
    if (!isRecord(book) || !safeTalkId(book.id) || !string(book.title) || !Array.isArray(book.chapters) || seenBooks.has(book.id)) continue;
    const id = book.id;
    seenBooks.add(id);
    const edition: Edition = !profile.editions ? "standard" : preferred === "easy" && profile.editions.easyBooks.has(id) ? "easy" : "author";
    const easy = edition === "easy" && isRecord(book.easy) ? book.easy : undefined;
    const count = easy?.words ?? book.words;
    const chapters: BookChapter[] = [];
    for (const row of book.chapters) {
      if (!isRecord(row) || !safeTalkId(row.id) || chapterIds.has(row.id) || !integer(row.n) || !string(row.title)) continue;
      chapterIds.add(row.id);
      const abridged = edition === "easy" && isRecord(row.easy) ? row.easy : undefined;
      const words = abridged?.words ?? row.words;
      chapters.push({
        selection: { itemKey: `book/${id}/${edition}`, chapterId: row.id },
        id: row.id, fileId: edition === "easy" ? `${row.id}.easy` : row.id, section: "knygos", edition,
        title: string(row.title), helperTitle: string(row.title_lt), number: row.n,
        ...(row.n === 0 && profile.introductionLabels && { introduction: profile.introductionLabels }),
        hasAudio: (abridged ? abridged.audio : row.audio) === true, words: integer(words) ? words : undefined,
        readHref: courseReadingLinks(profile, "knygos", row.id).read,
      });
    }
    chapters.forEach((chapter, i) => {
      if (chapters[i + 1]?.hasAudio) chapter.selection.nextChapterId = chapters[i + 1].id;
    });
    books.push({
      id, edition, chapters, title: string(book.title), helperTitle: string(book.title_lt), author: string(book.author),
      level: string(easy ? book.level_easy : book.level) || string(book.level),
      words: integer(count) ? count : undefined,
      cover: coverUrls(profile.covers, "books", id), readHref: `${profile.bookRoute}/book/${id}`,
    });
  }
  const seenStories = new Set<string>();
  const stories: ShelfStory[] = [];
  for (const row of storyIndex.stories) {
    if (!isRecord(row) || !safeTalkId(row.id) || seenStories.has(row.id) || !integer(row.n) || !string(row.title)) continue;
    seenStories.add(row.id);
    stories.push({
      selection: { itemKey: `story/${row.id}/standard`, chapterId: row.id },
      id: row.id, fileId: row.id, section: "stories", edition: "standard",
      title: string(row.title), helperTitle: string(row.title_lt), number: row.n, hasAudio: row.audio === true,
      words: integer(row.words) ? row.words : undefined, module: integer(row.module) ? row.module : undefined,
      readHref: courseReadingLinks(profile, "stories", row.id).read,
    });
  }
  const modules = storyIndex.modules.flatMap((row: unknown) => isRecord(row) && integer(row.n) && typeof row.name === "string"
    ? [{ number: row.n, name: row.name, range: string(row.range) }] : []);
  return { books, stories, modules };
}

export function normalizeBookText(profile: BookProfile, chapter: BookChapter, raw: unknown): BookParagraph[] {
  if (!isRecord(raw) || raw.id !== chapter.id || !Array.isArray(raw.paragraphs) ||
      (profile.editions && chapter.edition === "easy" && raw.edition !== "easy") ||
      (chapter.edition === "author" && raw.edition === "easy")) throw new BookSourceError("invalid");
  const paragraphs: BookParagraph[] = [];
  const usedIds = new Set<string>();
  const sentence = (id: string, target: string, helper: string, units: BookUnit[]): BookSentence => {
    if (!safeTalkId(id) || usedIds.has(id) || !target.trim() || !helper.trim()) throw new BookSourceError("invalid");
    usedIds.add(id);
    return { id, target, helper, units, textHash: talkFingerprint(JSON.stringify([normalized(target), normalized(helper)])) };
  };
  if (profile.narratedTitle) {
    const target = string(raw[profile.targetField === "es" ? "title_es" : "title"]) || chapter.title;
    const helper = string(raw.title_lt) || chapter.helperTitle;
    paragraphs.push({ kind: "title", sentences: [sentence(`${chapter.id}-title`, target, helper, [])] });
  }
  for (const paragraph of raw.paragraphs) {
    if (!isRecord(paragraph)) throw new BookSourceError("invalid");
    if (paragraph.break === true) { paragraphs.push({ kind: "break" }); continue; }
    if (!Array.isArray(paragraph.sentences) || !paragraph.sentences.length) throw new BookSourceError("invalid");
    const sentences = paragraph.sentences.map((row: unknown) => {
      if (!isRecord(row) || !integer(row.n)) throw new BookSourceError("invalid");
      const suffix = row.sentence_id ?? `S${String(row.n).padStart(3, "0")}`;
      if (!safeTalkId(suffix)) throw new BookSourceError("invalid");
      const id = suffix.startsWith(chapter.id + "-") ? suffix : `${chapter.id}-${suffix}`;
      const units = Array.isArray(row.units) ? row.units.flatMap((unit: unknown): BookUnit[] =>
        Array.isArray(unit) && typeof unit[0] === "string" && typeof unit[1] === "string"
          ? [[unit[0], unit[1], string(unit[2])]] : []) : [];
      return sentence(id, string(row[profile.targetField]), string(row.lt), units);
    });
    paragraphs.push({ kind: paragraph.introduction === true ? "introduction" : "paragraph", helper: string(paragraph.lt), sentences });
  }
  if (!usedIds.size) throw new BookSourceError("invalid");
  return paragraphs;
}

interface Timing {
  cues: TalkCue[];
  duration: number;
  hash?: string;
  rateSwitches?: TalkTrack["rateSwitches"];
}

function readSwitches(cues: TalkCue[], raw: unknown, hash?: string): TalkTrack["rateSwitches"] {
  if (!isRecord(raw) || raw.version !== 1 || !hash || raw.audio_sha256 !== hash ||
      !Array.isArray(raw.sw) || !Array.isArray(raw.speech) || raw.sw.length !== cues.length ||
      raw.speech.length !== cues.length || raw.sw[0] !== 0) return;
  const zones: NonNullable<TalkTrack["rateSwitches"]>[number][] = [];
  let previousEnd = 0;
  for (const [i, cue] of cues.entries()) {
    const span: unknown = raw.speech[i];
    const from: unknown = raw.sw[i];
    if (!Array.isArray(span) || span.length !== 2 || !time(span[0]) || !time(span[1]) || !time(from) ||
        span[0] < cue.start - 0.001 || span[1] > cue.end + 0.001 || span[1] <= span[0] ||
        (i > 0 && (from <= zones[i - 1].from || from < previousEnd + 0.149 || from > span[0] - 0.079))) return;
    previousEnd = span[1];
    zones.push({ from, until: i ? span[0] - 0.079 : 0, language: cue.language });
  }
  return zones;
}

function readTiming(profile: BookProfile, id: string, sentences: BookSentence[], raw: unknown, mode: TalkMode,
  expectedIds?: readonly string[]): Timing {
  const legacyMode = COURSE_MODES[mode];
  if (!isRecord(raw) || raw.story_id !== id || raw.phrases === true || (raw.mode ?? "bilingual") !== legacyMode ||
      !Array.isArray(raw.timeline) || !time(raw.duration_seconds) || raw.duration_seconds <= 0 ||
      raw.timeline.length !== sentences.length * (mode === "paired" ? 2 : 1)) throw new BookSourceError("invalid");
  const hashes = raw.audio_sha256;
  if (hashes !== undefined && (!isRecord(hashes) || Object.values(hashes).some((value) => !sha(value)))) {
    throw new BookSourceError("invalid");
  }
  const version = isRecord(hashes) ? hashes[legacyMode] : undefined;
  const hash = sha(version) ? version : undefined;
  const languages = TALK_LANGUAGES[profile.id];
  const cues: TalkCue[] = [];
  const idPrefix = id + "-S";
  let previousEnd = 0;
  let previousNumber = 0;
  for (const [i, row] of raw.timeline.entries()) {
    const role = mode === "paired" ? (i % 2 === 0 ? "helper" : "target") : mode;
    const index = mode === "paired" ? Math.floor(i / 2) : i;
    const sentence = sentences[index];
    if (!isRecord(row) || !safeTalkId(row.sentence_id) || row.language !== profile.timingLanguage[role] ||
        typeof row.text !== "string" || normalized(row.text) !== normalized(sentence[role]) || row.phrase !== undefined ||
        !time(row.start) || !time(row.end) || row.start < previousEnd || row.end <= row.start || row.end > raw.duration_seconds + 0.001) {
      throw new BookSourceError("invalid");
    }
    const cueId = row.sentence_id;
    const secondLeg = mode === "paired" && i % 2 === 1;
    const expected = secondLeg ? cues[i - 1].sentenceId : expectedIds?.[index] ?? (profile.sparseTimingIds ? undefined : sentence.id);
    if (expected && cueId !== expected) throw new BookSourceError("invalid");
    // EM display numbers are dense. Some published recordings retain gaps in their original IDs.
    if (profile.sparseTimingIds && !secondLeg) {
      const suffix = cueId.startsWith(idPrefix) ? cueId.slice(idPrefix.length) : "";
      const number = Number(suffix);
      if (!/^\d{3,}$/.test(suffix) || !integer(number) || number <= previousNumber ||
          (i === 0 && number !== 1)) throw new BookSourceError("invalid");
      previousNumber = number;
    }
    previousEnd = row.end;
    cues.push({ sentenceId: cueId, textHash: sentence.textHash, language: languages[role],
      text: row.text, start: row.start, end: row.end });
  }
  return { cues, duration: Math.max(raw.duration_seconds, previousEnd), hash,
    rateSwitches: mode === "paired" ? readSwitches(cues, raw.rate_switches, hash) : undefined };
}

function englishClock(profile: BookProfile, paired: Timing, raw: unknown): Timing {
  const target = paired.cues.filter((cue) => cue.language === TALK_LANGUAGES[profile.id].target);
  let samples = 0;
  const cues = target.map((cue, i) => {
    const start = samples / 24_000;
    samples += Math.round((cue.end - cue.start) * 24_000);
    const end = samples / 24_000;
    if (i + 1 < target.length) samples += 13_200;
    return { ...cue, start, end };
  });
  const hash = isRecord(raw) && isRecord(raw.audio_sha256) ? raw.audio_sha256.english : undefined;
  return { cues, duration: cues.at(-1)!.end, hash: sha(hash) ? hash : undefined };
}

function readWordRows(profile: BookProfile, id: string, raw: unknown): Map<string, unknown> {
  const rows = new Map<string, unknown>();
  if (!isRecord(raw) || raw.story_id !== id || raw.language !== profile.timingLanguage.target || !Array.isArray(raw.lines)) return rows;
  for (const row of raw.lines) {
    if (!isRecord(row) || !safeTalkId(row.sentence_id) || row.phrase !== undefined) continue;
    rows.set(row.sentence_id, rows.has(row.sentence_id) ? undefined : row.w);
  }
  return rows;
}

function wordsMatchRecording(raw: unknown, mode: TalkMode, hash?: string): boolean {
  if (!isRecord(raw) || raw.audio_sha256 === undefined) return true;
  const version = isRecord(raw.audio_sha256) ? raw.audio_sha256[COURSE_MODES[mode]] : raw.audio_sha256;
  return sha(version) && version === hash;
}

function wordSpans(cue: TalkCue, raw: unknown): TalkCue["words"] {
  const tokens = cue.text.trim().split(/\s+/);
  if (!Array.isArray(raw) || tokens.length !== raw.length || normalized(cue.text).split(" ").length !== raw.length) return;
  const spans: NonNullable<TalkCue["words"]>[number][] = [];
  let previousEnd = 0;
  for (const [i, span] of raw.entries()) {
    const spoken = /[\p{L}\p{N}]/u.test(tokens[i]);
    if (span === null && !spoken) { spans.push(null); continue; }
    if (!spoken || !Array.isArray(span) || span.length !== 2 || !time(span[0]) || !time(span[1]) ||
        span[0] < previousEnd || span[1] <= span[0] || cue.start + span[1] > cue.end + 0.001) return;
    previousEnd = span[1];
    spans.push([cue.start + span[0], Math.min(cue.end, cue.start + span[1])]);
  }
  return spans;
}

export function normalizeBookItem(profile: BookProfile, chapter: BookChapter, raw: {
  text: unknown;
  timing: Partial<Record<TalkMode, unknown>>;
  words?: unknown;
  recording: (mode: TalkMode, hash?: string) => { open: () => string; key: string } | null;
}): BookItem {
  const paragraphs = normalizeBookText(profile, chapter, raw.text);
  const sentences = paragraphs.flatMap((row) => row.kind === "break" ? [] : row.sentences);
  const languages = TALK_LANGUAGES[profile.id];
  const words = readWordRows(profile, chapter.id, raw.words);
  const issues: NonNullable<BookItem["issues"]> = {};
  const tracks: BookItem["tracks"] = {};
  let paired: Timing | undefined;
  let sentenceIds: string[] | undefined;
  for (const mode of MODES) {
    try {
      const source = profile.targetClock === "derive" && mode === "target" ? raw.timing.paired : raw.timing[mode];
      if (source instanceof BookSourceError) throw source;
      if (!chapter.hasAudio) throw new BookSourceError("missing");
      let clock: Timing;
      if (mode === "target" && profile.targetClock === "derive") {
        if (!paired) throw new BookSourceError("invalid");
        clock = englishClock(profile, paired, source);
      } else {
        clock = readTiming(profile, chapter.id, sentences, source, mode, sentenceIds);
        if (mode === "paired") paired = clock;
        sentenceIds ??= clock.cues.filter((_, i) => mode !== "paired" || i % 2 === 0).map((cue) => cue.sentenceId);
      }
      const recording = raw.recording(mode, clock.hash);
      if (!recording) throw new BookSourceError("invalid");
      const aligned = wordsMatchRecording(raw.words, mode, clock.hash);
      const cues = aligned ? clock.cues.map((cue) => cue.language === languages.target
        ? { ...cue, words: wordSpans(cue, words.get(cue.sentenceId)) } : cue)
        : clock.cues;
      const audioVersion = clock.hash ?? talkFingerprint(JSON.stringify([chapter.fileId, mode, recording.key, clock.duration, clock.cues]));
      tracks[mode] = { mode, cues, audioVersion, recording: recording.open, duration: clock.duration, rateSwitches: clock.rateSwitches };
    } catch (error) {
      if (!(error instanceof BookSourceError)) throw error;
      issues[mode] = error.kind;
    }
  }
  if (sentenceIds && profile.sparseTimingIds) {
    for (const [i, id] of sentenceIds.entries()) sentences[i].id = id;
  }
  return { selection: chapter.selection, chapter, paragraphs, languages, tracks, issues };
}

function sharedLoads<K, V>(load: (key: K, signal: AbortSignal) => Promise<V>, cache = false) {
  const pending = new Map<K, { request: AbortController; result: Promise<V>; users: number }>();
  const saved = new Map<K, V>();
  return (key: K, signal?: AbortSignal): Promise<V> => {
    if (signal?.aborted) return Promise.reject(signal.reason);
    if (saved.has(key)) return Promise.resolve(saved.get(key)!);
    let entry = pending.get(key);
    if (!entry) {
      const request = new AbortController();
      const result = load(key, request.signal).then((value) => {
        if (cache && !request.signal.aborted) saved.set(key, value);
        return value;
      }).finally(() => {
        if (pending.get(key)?.request === request) pending.delete(key);
      });
      entry = { request, result, users: 0 };
      pending.set(key, entry);
    }
    const shared = entry;
    shared.users++;
    return new Promise((resolve, reject) => {
      const done = () => {
        signal?.removeEventListener("abort", abort);
        if (--shared.users === 0 && pending.get(key) === shared) {
          pending.delete(key);
          shared.request.abort();
        }
      };
      const abort = () => { done(); reject(signal?.reason); };
      signal?.addEventListener("abort", abort, { once: true });
      shared.result.then((value) => {
        if (signal?.aborted) return;
        done();
        resolve(value);
      }, (error) => {
        if (signal?.aborted) return;
        done();
        reject(error);
      });
    });
  };
}

export function createBookSource({ profile, site, files, recordings = files, token, fetch: fetchJson = fetch }: SourceOptions) {
  const app = rootUrl(site);
  const worker = rootUrl(files);
  const recordingRoot = rootUrl(recordings);
  if (!app || app.pathname !== "/" || !worker || worker.pathname === "/" || !recordingRoot || recordingRoot.pathname === "/") {
    throw new BookSourceError("invalid");
  }
  const workerBase = worker.href.replace(/\/$/, "");
  const sign = (url: string, paid: boolean) => bookWorkerUrl(workerBase, url, paid ? token?.() : null)!;
  const json = async (url: string, signal: AbortSignal): Promise<unknown> => {
    let result: Response;
    try { result = await fetchJson(url, { signal, redirect: "error", referrerPolicy: "no-referrer" }); }
    catch (error) { if (signal.aborted) throw error; throw new BookSourceError("unavailable"); }
    if (!result.ok) throw new BookSourceError(result.status === 401 || result.status === 403 ? "access"
      : result.status === 404 ? "missing" : "unavailable", result.status);
    try { return await result.json(); } catch (error) {
      if (signal.aborted) throw error;
      throw new BookSourceError("invalid");
    }
  };
  const indexes = sharedLoads(async (_: "index", signal) => {
    const [books, stories] = await Promise.all([json(app.origin + "/knygos/index.json", signal), json(app.origin + "/stories/index.json", signal)]);
    if (!isRecord(books) || !Array.isArray(books.books) || !isRecord(stories) ||
        !Array.isArray(stories.stories) || !Array.isArray(stories.modules)) throw new BookSourceError("invalid");
    return [books, stories] as const;
  }, true);
  const configs = sharedLoads((section: Section, signal) => json(`${app.origin}/${section}/audio/config.json`, signal));
  const catalog = async (signal?: AbortSignal, edition?: "author" | "easy") =>
    normalizeBookCatalog(profile, ...await indexes("index", signal), edition);

  const load = sharedLoads(async (key: string, signal) => {
    const [kind, itemId, edition, chapterId] = key.split("/");
    const available = await catalog(signal, edition === "author" || edition === "easy" ? edition : undefined);
    const chapter = kind === "book" ? available.books.find((book) => book.id === itemId)?.chapters.find((row) => row.id === chapterId)
      : available.stories.find((story) => story.id === itemId && story.id === chapterId);
    if (!chapter || key !== `${chapter.selection.itemKey}/${chapter.id}`) throw new BookSourceError("missing");
    const { section, fileId, id } = chapter;
    const onSite = profile.jsonOnSite(section, id);
    const content = (path: string) => json(onSite ? app.origin + path : sign(workerBase + path, true), signal);
    const timing = (kind: TimingKind) => {
      const revision = profile.timingRevision?.(section, kind, fileId);
      const path = `/${section}/audio/${kind}/${fileId}.json${revision ? `?v=${encodeURIComponent(revision)}` : ""}`;
      return content(path);
    };
    const optional = (request: Promise<unknown>) => request.catch((error: unknown) => {
      if (error instanceof BookSourceError) return error;
      throw error;
    });
    const text = content(`/${section}/data/${fileId}.json`);
    const [body, config, paired, target, helper, words] = chapter.hasAudio ? await Promise.all([
      text, optional(configs(section, signal)), optional(timing("timing")),
      profile.targetClock === "file" ? optional(timing("english-timing")) : undefined,
      optional(timing("lithuanian-timing")), optional(timing("word-timing")),
    ]) : [await text];
    const folders = chapter.edition === "easy" && isRecord(config) ? config.easy : config;
    const recording = (mode: TalkMode, hash?: string) => {
      if (config instanceof BookSourceError) throw config;
      const folder = isRecord(folders) ? rootUrl(string(folders[FOLDER_FIELDS[mode]])) : null;
      if (!folder || !underRoot(recordingRoot, folder.href)) return null;
      const path = folder.pathname.replace(/\/$/, "").slice(recordingRoot.pathname.length);
      if (!profile.recordingFolder(path, section, mode)) return null;
      const address = `${workerBase}${path}/${id}.mp3${hash ? `?v=${hash}` : ""}`;
      return { open: () => sign(address, !profile.freeRecording(section, id)), key: address };
    };
    return normalizeBookItem(profile, chapter, { text: body, timing: { paired, target, helper }, words, recording });
  });
  return {
    profile: profile.id,
    catalog,
    load: (selection: TalkSelection, signal?: AbortSignal) => load(`${selection.itemKey}/${selection.chapterId}`, signal),
    storyCover: async (id: string) => coverUrls(await profile.storyCovers(), "stories", id),
    links: (chapter: BookChapter) => courseReadingLinks(profile, chapter.section, chapter.id),
  };
}
