import { createBookSource, type BookProfile } from "../radio/books";
import { TALK_LANGUAGES, type TalkProfile } from "../radio/talkProgress";

const spanishCovers = { BK01: ["65adb81f", 160, 320], BK04: ["ed68dbd8", 160, 320] };
const spanishStories = async () => ({ "HIS-SG01": ["6d8e2bc5", 160, 320] });

function spanishReviewProfile(id: Exclude<TalkProfile, "em-lt">): BookProfile {
  const english = id === "sme-en";
  const folders = { paired: english ? "EN-ES" : "LT-ES", target: "ES", helper: english ? "EN" : "LT" };
  return {
    id, bookRoute: english ? "/books" : "/knygos", targetField: "es",
    timingLanguage: { target: "es", helper: "lt" }, targetClock: "file", narratedTitle: true,
    jsonOnSite: () => false, freeRecording: () => true,
    recordingFolder: (path, _section, mode) => path === `/audio/v1/${folders[mode]}`,
    covers: spanishCovers, storyCovers: spanishStories,
  };
}

export function createBookReviewSource(env: Record<string, unknown>, site: string | undefined, em: BookProfile,
  fetcher?: typeof fetch) {
  const id = env.VITE_BOOK_PROFILE;
  if (env.VITE_BOOK_REVIEW !== "1" || typeof id !== "string" || !Object.hasOwn(TALK_LANGUAGES, id) || !site) return null;
  const profileId = id as TalkProfile;
  const root = `/__files/${profileId}`;
  let origin: URL;
  try { origin = new URL(site); } catch { return null; }
  if (!/^https?:$/.test(origin.protocol) || origin.href !== origin.origin + "/" || origin.username || origin.password ||
      env.VITE_RADIO_FILES !== root) return null;
  const profile: BookProfile = profileId === "em-lt"
    ? { ...em, targetClock: "file", jsonOnSite: () => false, timingRevision: undefined }
    : spanishReviewProfile(profileId);
  return createBookSource({ profile, site: origin.origin, files: origin.origin + root, fetch: fetcher });
}
