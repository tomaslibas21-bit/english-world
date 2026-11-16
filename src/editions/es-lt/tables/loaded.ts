// The learner's tables the game has (phone loading, 16 Nov 2026): the town-wide one from the start, each conversation's
// when the conversation's file loads (content/situations/meta.gen.ts LOAD), and every table's texts by their English
// (value-text.gen.json, for convo/target.ts) with the first conversation. Tools and tests import
// content/situations/index.ts, which puts every table here at once (as before: all of them at start).
import type { LearnerTable } from "../../es/learner/walk";
import SHARED_JSON from "./_shared.json";

export const SHARED = SHARED_JSON as unknown as LearnerTable;
/** The tables loaded so far, by conversation id ("_shared": the town-wide one). */
export const LOADED: Record<string, LearnerTable> = { _shared: SHARED };

/** The conversations the learner's table is already put in (once each: index.ts, content/situations/meta.gen.ts). */
export const learnerApplied = new WeakSet<object>();

/** Every Lithuanian text the tables have, by its English: the conversations' own first (in the tables' order), then
 *  the town-wide one. tools/gen-meta.ts writes it to value-text.gen.json. */
export function mergeValueText(tables: Record<string, LearnerTable>): Map<string, string> {
  const out = new Map<string, string>();
  for (const [id, t] of Object.entries(tables)) if (id !== "_shared") for (const [k, v] of Object.entries(t.text)) if (!out.has(k)) out.set(k, v);
  for (const [k, v] of Object.entries(tables._shared?.text ?? {})) if (!out.has(k)) out.set(k, v);
  return out;
}

let valueText: Map<string, string> | null = null;
let valueTextLoad: Promise<void> | null = null;
export const getValueText = () => valueText;
export function setValueText(m: Map<string, string>) { valueText = m; }
/** Loads value-text.gen.json (once). */
export function loadValueText(): Promise<void> {
  if (valueText) return Promise.resolve();
  return (valueTextLoad ??= import("./value-text.gen.json").then(
    (m) => { valueText ??= new Map(Object.entries(m.default as Record<string, string>)); },
    (err) => { valueTextLoad = null; throw err; },
  ));
}
