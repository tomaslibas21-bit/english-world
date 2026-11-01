// The edition this build is. One engine builds two games (docs/es/EDITIONS.md):
//   en: English for Lithuanian speakers, in Maple Harbor (this file, the default);
//   es: Spanish for English speakers, in Puerto Colibrí (src/editions/es/edition.ts).
// A build or a tool for the Spanish edition sees the files under src/editions/es/ instead of the ones with the same
// path under src/ (the edition overlay: vite.config.ts, tools/edition-hook.mjs). This file is one of them.

export interface Edition {
  id: "en" | "es";
  /** The language the learner practises (BCP 47): speech recognition, the browser voice, `lang` attributes. */
  target: string;
  /** The learner's own language: help, glosses and the interface. */
  helper: string;
  /** The town. */
  town: string;
  /** The page title. */
  title: string;
  /** localStorage keys begin with this, so the editions never share a save. */
  storage: string;
  /** The learner the tools play (sims, enumerate, coverage); their name is registered as the player's. */
  simPlayer: { name: string; surname: string };
  /** Practice sentences and the blind set (tools/coverage.ts). */
  corpusDir: string;
  heldoutDir: string;
  /** Where this edition's content files are (tools that read the source). */
  contentDir: string;
}

export const EDITION: Edition = {
  id: "en",
  target: "en-US",
  helper: "lt",
  town: "Maple Harbor",
  title: "English World · Maple Harbor",
  storage: "english-world",
  simPlayer: { name: "Tomas", surname: "Mikalauskas" },
  corpusDir: "tests/corpus",
  heldoutDir: "tests/heldout",
  contentDir: "src/content",
};
