// The geometry baker and the running town must choose the same Oak Avenue parcel.
export function hasLibraryShelf(env: Record<string, unknown>) {
  if (env.VITE_BOOK_REVIEW === "1") return env.VITE_BOOK_PROFILE === "em-lt" && env.VITE_RADIO_FILES === "/__files/em-lt";
  return typeof env.VITE_RADIO_FILES === "string"
    && env.VITE_RADIO_FILES.trim().replace(/\/$/, "") === "https://audio.dvikalbesdainos.lt/fluent-steps";
}
export const LIBRARY_ENABLED = hasLibraryShelf(import.meta.env ?? {});

// The room and its reader share these bilingual world actions.
export const LIBRARY_COPY = {
  browse: { label: "Browse books", lt: "Rinktis knygą" },
  sit: { label: "Sit and read", lt: "Prisėsti paskaityti" },
  stand: { label: "Stand up", lt: "Atsistoti" },
} as const;
