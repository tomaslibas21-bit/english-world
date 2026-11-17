// The Spanish edition: Spanish (Mexican by default) for English speakers, in Puerto Colibrí, a small town on Mexico's
// Caribbean coast. Replaces src/edition.ts in this edition (docs/es/EDITIONS.md).
import type { Edition } from "../../edition";

export const EDITION: Edition = {
  id: "es",
  target: "es-MX",
  helper: "en",
  // the game is called after its town (the owner, 11 Nov 2026)
  brand: "Puerto Colibrí",
  town: "Puerto Colibrí",
  title: "Puerto Colibrí",
  storage: "puerto-colibri",
  simPlayer: { name: "Ryan", surname: "Miller" },
  simAuto: { howareyou: "Bien, gracias. ¿Y usted?", closing: "¡Gracias, adiós!" },
  corpusDir: "tests/es/corpus",
  heldoutDir: "tests/es/heldout",
  contentDir: "src/editions/es/content",
  // no report strip yet: Spanish Master English's files Worker has no /_game_reports (English Master's takes only its
  // own course's token); with an address here the strip shows, its words already in English (ui/strings.ts)
  reports: null,
};
