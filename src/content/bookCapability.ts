import type { TalkProfile } from "../radio/talkProgress";

export const BOOK_FILES_ROOT = "https://audio.dvikalbesdainos.lt/fluent-steps";
export const SM_FILES = "https://audio.dvikalbesdainos.lt/spanish-master";
export const SME_FILES = SM_FILES + "-en";

const trimRoot = (value: unknown) => typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

// The Book FM source, live town and collision baker agree on the configured course or review shelf.
export function bookSourceConfigured(profile: TalkProfile, env: Record<string, unknown>) {
  if (env.VITE_BOOK_REVIEW === "1") {
    return env.VITE_BOOK_PROFILE === profile && env.VITE_RADIO_FILES === `/__files/${profile}`;
  }
  const root = profile === "em-lt" ? BOOK_FILES_ROOT : profile === "sm-lt" ? SM_FILES : SME_FILES;
  return trimRoot(env.VITE_RADIO_FILES) === root
    && (profile !== "sme-en" || (trimRoot(env.VITE_RADIO_RECORDINGS) || SM_FILES) === SM_FILES);
}
