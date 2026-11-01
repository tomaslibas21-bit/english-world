// The Spanish edition: Spanish (Mexican by default) for English speakers, in Puerto Colibrí, a small town on Mexico's
// Caribbean coast. Replaces src/edition.ts in this edition (docs/es/EDITIONS.md).
import type { Edition } from "../../edition";

export const EDITION: Edition = {
  id: "es",
  target: "es-MX",
  helper: "en",
  town: "Puerto Colibrí",
  title: "Spanish World · Puerto Colibrí",
  storage: "puerto-colibri",
  simPlayer: { name: "Ryan", surname: "Miller" },
  simAuto: { howareyou: "Bien, gracias. ¿Y usted?", closing: "¡Gracias, adiós!" },
  corpusDir: "tests/es/corpus",
  heldoutDir: "tests/es/heldout",
  contentDir: "src/editions/es/content",
};
