// Shared by Libros FM, the live town and the offline collision baker.
export const SM_FILES = "https://audio.dvikalbesdainos.lt/spanish-master";
export const SME_FILES = SM_FILES + "-en";
export const trimRoot = (value: unknown) => typeof value === "string" ? value.trim().replace(/\/+$/, "") : "";

export function spanishShelfConfigured(profile: "sme-en" | "sm-lt", env: Record<string, unknown>) {
  if (env.VITE_BOOK_REVIEW === "1") return env.VITE_BOOK_PROFILE === profile && env.VITE_RADIO_FILES === `/__files/${profile}`;
  const sme = profile === "sme-en";
  return trimRoot(env.VITE_RADIO_FILES) === (sme ? SME_FILES : SM_FILES)
    && (!sme || (trimRoot(env.VITE_RADIO_RECORDINGS) || SM_FILES) === SM_FILES);
}
