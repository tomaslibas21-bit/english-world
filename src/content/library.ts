import { bookSourceConfigured } from "./bookCapability";

export const LIBRARY_PROFILE = "em-lt";

export const hasLibraryShelf = (env: Record<string, unknown>) => bookSourceConfigured(LIBRARY_PROFILE, env);
export const LIBRARY_ENABLED = hasLibraryShelf(import.meta.env ?? {});

// The room and its reader share these bilingual world actions.
export const LIBRARY_COPY = {
  browse: { label: "Browse books", lt: "Rinktis knygą" },
  sit: { label: "Sit and read", lt: "Prisėsti paskaityti" },
  stand: { label: "Stand up", lt: "Atsistoti" },
} as const;
