import { EDITION } from "@/edition";
import { bookSourceConfigured } from "../../../content/bookCapability";

const lithuanian = EDITION.helper === "lt";
export const LIBRARY_PROFILE = lithuanian ? "sm-lt" : "sme-en";
export const hasLibraryShelf = (env: Record<string, unknown>) => bookSourceConfigured(LIBRARY_PROFILE, env);
export const LIBRARY_ENABLED = hasLibraryShelf(import.meta.env ?? {});

export const LIBRARY_COPY = {
  browse: { label: "Explorar libros", lt: lithuanian ? "Rinkis knygą" : "Browse books" },
  sit: { label: "Sentarse a leer", lt: lithuanian ? "Prisėsk paskaityti" : "Sit and read" },
  stand: { label: "Levantarse", lt: lithuanian ? "Atsistok" : "Stand up" },
};
