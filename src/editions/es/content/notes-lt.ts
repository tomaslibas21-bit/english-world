// Puerto Colibrí's word notes are already in the learner's language: written in English for the English-speaking
// learner (Spanish Master English), and put in Lithuanian by the Lithuanian layer's tables (Spanish Master,
// src/editions/es-lt/tables). Maple Harbor's English-to-Lithuanian notes (src/content/notes-lt.ts) don't apply here.
export const NOTES_LT: Record<string, string> = {};

/** A unit's note as the learner reads it: as written. */
export function learnerNote(note: string | undefined): string | undefined {
  return note;
}
