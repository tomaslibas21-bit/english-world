// Replaces src/content/returning.ts in the Spanish edition. Maple Harbor's model replies for its returning openings
// (main, Nov 2026) are English and point at hint groups of its own; Puerto Colibrí's conversations write their
// returning visits' hints themselves (each situation's `greet_back` and the like, with their own hint groups).
import type { HintGroup, Suggestion } from "../../../content/types";

export const RETURNING_HINTS: Record<string, HintGroup> = {};

export function returningSuggestion(_sit: string, _visits: number, _lines: readonly string[], _pending: string | undefined, _step: string | undefined): Suggestion | null {
  return null;
}
