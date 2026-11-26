import { filesToken } from "../../../game/audio";
import { createBookSource, type BookProfile } from "../../../radio/books";
import covers from "./book-covers/books.json";

const SM_FILES = "https://audio.dvikalbesdainos.lt/spanish-master";
const SME_FILES = `${SM_FILES}-en`;
const freeChapters = /^BK(?:0[1-9]|10)-01$/;

export function spanishBookProfile(id: "sme-en" | "sm-lt", artwork: Pick<BookProfile, "covers" | "storyCovers">): BookProfile {
  const sme = id === "sme-en";
  const folders = { paired: sme ? "EN-ES" : "LT-ES", target: "ES", helper: sme ? "EN" : "LT" };
  return {
    ...artwork,
    id,
    bookRoute: sme ? "/books" : "/knygos",
    targetField: "es",
    // Both courses use the same legacy keys for the helper text and clock.
    timingLanguage: { target: "es", helper: "lt" },
    targetClock: "file",
    narratedTitle: true,
    introductionLabels: { target: "Introducción", helper: sme ? "Introduction" : "Įžanga" },
    jsonOnSite: (section, id) => sme || (section === "knygos" ? freeChapters.test(id) : id === "HIS-SG01" || id === "HIS-SG02"),
    freeRecording: (section, id) => section === "knygos" ? /^BK\d{2}-01$/.test(id) : id === "HIS-SG01",
    recordingFolder: (path, _section, mode) => path === `/audio/v1/${folders[mode]}`,
  };
}

export const SME_BOOK_PROFILE = spanishBookProfile("sme-en", {
  covers,
  storyCovers: () => import("./book-covers/stories.json").then((data) => data.default),
});

const trimRoot = (value: unknown) => typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

export function spanishBookSource(profile: BookProfile, env: Record<string, unknown>, site?: string) {
  const sme = profile.id === "sme-en";
  const files = trimRoot(env.VITE_RADIO_FILES);
  if (!site || files !== (sme ? SME_FILES : SM_FILES)) return null;
  // SME's audio configs name SM's storage prefix. The adapter resolves it through SME's Worker.
  const recordings = sme ? trimRoot(env.VITE_RADIO_RECORDINGS) || SM_FILES : SM_FILES;
  if (recordings !== SM_FILES) return null;
  return createBookSource({ profile, site, files, recordings, token: filesToken });
}

export function bookSource(env: Record<string, unknown> = import.meta.env ?? {}, site = globalThis.location?.origin) {
  return spanishBookSource(SME_BOOK_PROFILE, env, site);
}
