import { BOOK_FILES_ROOT, bookSourceConfigured } from "./bookCapability";
import { filesToken } from "../game/audio";
import { createBookSource, type BookProfile } from "../radio/books";
import { createBookReviewSource } from "./bookReviewSource";
import covers from "./book-covers/books.json";
import narrationRevisions from "./book-narration-revisions.json";

export const BOOK_EDITION_KEY = "fluentsteps.books.edition.v1";
const revisions: Readonly<Record<string, string>> = narrationRevisions;
// The free text allowlist in the course's src/lib/files/rules.ts.
const freeBooks = new Set([
  "BOOK-CANT-01", "BOOK-NOTE-01", "BOOK-OZ-01", "BOOK-JEKYLL-01", "BOOK-HOUND-01",
  "BOOK-WORLD-01", "BOOK-PRIDE-01", "BOOK-FRANK-01", "BOOK-DRAC-01", "BOOK-DORIAN-01",
  "BOOK-CAROL-01", "BOOK-WILD-01", "BOOK-HOLMES-01", "BOOK-TIME-01", "BOOK-EARNEST-01",
  "BOOK-SCREW-01", "BOOK-FROME-01", "BOOK-AWAKE-01", "BOOK-GATSBY-01", "BOOK-HEIGHTS-01",
]);

export const EM_BOOK_PROFILE: BookProfile = {
  id: "em-lt",
  bookRoute: "/knygos",
  targetField: "en",
  timingLanguage: { target: "en", helper: "lt" },
  targetClock: "derive",
  sparseTimingIds: true,
  editions: {
    easyBooks: new Set([
      "BOOK-CAROL", "BOOK-WILD", "BOOK-HOLMES", "BOOK-TIME", "BOOK-EARNEST",
      "BOOK-SCREW", "BOOK-FROME", "BOOK-AWAKE", "BOOK-GATSBY", "BOOK-HEIGHTS",
    ]),
    read: () => {
      try { return globalThis.localStorage.getItem(BOOK_EDITION_KEY) === "author" ? "author" : "easy"; }
      catch { return "easy"; }
    },
  },
  jsonOnSite: (section, id) => section === "knygos" ? freeBooks.has(id) : id === "TOM-001" || id === "TOM-005",
  freeRecording: (section, id) => section === "knygos" ? /^BOOK-[A-Z]+-01$/.test(id) : id === "TOM-001",
  recordingFolder: (path, section, mode) => {
    const prefix = `/${section}/audio/${mode === "target" ? "en/" : mode === "helper" ? "lt/" : ""}`;
    return path.startsWith(prefix) && /^v\d+$/.test(path.slice(prefix.length));
  },
  timingRevision: (section, kind, fileId) => revisions[`${section}/${kind}/${fileId}`],
  covers,
  storyCovers: () => import("./book-covers/stories.json").then((data) => data.default),
};

/** Intended for the lazy talk entry point. Construction makes no requests. */
export function bookSource(env: Record<string, unknown> = import.meta.env ?? {}, site = globalThis.location?.origin) {
  if (!site || !bookSourceConfigured(EM_BOOK_PROFILE.id, env)) return null;
  if (import.meta.env.VITE_BOOK_REVIEW === "1") return createBookReviewSource(env, site, EM_BOOK_PROFILE);
  if (env.VITE_BOOK_REVIEW === "1") return null;
  return createBookSource({ profile: EM_BOOK_PROFILE, site, files: BOOK_FILES_ROOT, token: filesToken });
}
