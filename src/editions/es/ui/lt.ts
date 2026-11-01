// Small interface helpers for the Spanish edition (replaces src/ui/lt.ts): counts and labels in English.
import { L } from "../../../ui/i18n";

/** A noun after a number, from the Lithuanian forms the code passes (1 pokalbis · 2 pokalbiai · 10 pokalbių):
 *  "1 conversation", "2 conversations". */
export function ltCount(n: number, one: string, _few: string, many: string): string {
  return L(n === 1 ? one : many);
}

/** Labels are written as imperatives already ("Order a drink"). */
export function toImperative(s: string): string {
  return s;
}
