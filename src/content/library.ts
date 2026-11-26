import { bookSourceConfigured } from "./bookCapability";

// The town, collision baker and Book FM use one source capability.
export const hasLibraryShelf = bookSourceConfigured;
export const LIBRARY_ENABLED = hasLibraryShelf(import.meta.env ?? {});

// The room and its reader share these bilingual world actions.
export const LIBRARY_COPY = {
  enter: { label: "Įeiti į biblioteką" },
  exit: { label: "Išeiti į lauką" },
  browse: { label: "Browse books", lt: "Rinktis knygą" },
  sit: { label: "Sit and read", lt: "Prisėsti paskaityti" },
  stand: { label: "Stand up", lt: "Atsistoti" },
} as const;
