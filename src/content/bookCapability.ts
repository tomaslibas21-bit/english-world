// Pure configuration shared by the town/collision baker and the lazy Book FM source. No media or requests here.
export const BOOK_FILES_ROOT = "https://audio.dvikalbesdainos.lt/fluent-steps";
export function bookSourceConfigured(env: Record<string, unknown>) {
  if (env.VITE_BOOK_REVIEW === "1") {
    const profile = env.VITE_BOOK_PROFILE;
    return (profile === "em-lt" || profile === "sm-lt" || profile === "sme-en")
      && env.VITE_RADIO_FILES === `/__files/${profile}`;
  }
  return typeof env.VITE_RADIO_FILES === "string" && env.VITE_RADIO_FILES.trim().replace(/\/$/, "") === BOOK_FILES_ROOT;
}
