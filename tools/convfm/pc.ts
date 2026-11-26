import { readFileSync } from "node:fs";
import type { EntityDef, SentSrc, SituationDef } from "../../src/content/types";
import { compose, placeholders, type ComposeOpts, type Vars } from "../../src/convo/compose";
import * as Lithuanian from "../../src/editions/es-lt/convo/target";
import { applyLearner, getValueText, sentKey, SHARED, type LearnerTable } from "../../src/editions/es-lt/tables/loaded";

export const MEXICAN = "default" as const;

function readTable(id: string): LearnerTable | undefined {
  try {
    return JSON.parse(readFileSync(new URL(`../../src/editions/es-lt/tables/${id}.json`, import.meta.url), "utf8"));
  } catch (cause) {
    if ((cause as NodeJS.ErrnoException).code !== "ENOENT") throw cause;
  }
}

/** Render from the same authored sentence and bindings as SME, using SM's tables and grammar. */
export function pcTranslations(sit: SituationDef) {
  const table = readTable(sit.id);
  const entities = new Map<EntityDef, EntityDef>();
  if (table) {
    const original = sit.entities ?? {};
    const translated = structuredClone(original);
    applyLearner({ entities: translated }, table);
    for (const [type, list] of Object.entries(original)) {
      list.forEach((entity, index) => {
        if (table.entity[`${type}/${entity.id}`]?.lt.trim()) entities.set(entity, translated[type][index]);
      });
    }
  }
  return {
    titleLt: table?.text[sit.title.lt],
    lithuanian(src: SentSrc, vars: Vars, opts: ComposeOpts, shared: boolean): string {
      const lookup = shared ? SHARED : table;
      const row = lookup?.sent[sentKey(src.en, src.lt, src.nat)];
      if (!row?.nat.trim()) throw new Error(`Missing SM (Lithuanian) sentence: ${src.en}`);
      const look: ComposeOpts["look"] = (id) => {
        const original = opts.look(id);
        if (!original) return undefined;
        const translated = entities.get(original);
        if (!translated) throw new Error(`Missing SM (Lithuanian) entity ${id}: ${src.en}`);
        return translated;
      };
      const localized = { ...src, lt: row.gloss, nat: row.nat, flags: row.flags };
      for (const name of placeholders(localized).values) {
        if (vars[name] == null) throw new Error(`Unbound value ${name}: ${src.en}`);
      }
      return compose(localized, vars, { ...opts, look, target: lithuanianTarget }).nat;
    },
  };
}

const checkedValue: typeof Lithuanian.valueDisplay = (kind, value, c, dialect) => {
  const out = Lithuanian.valueDisplay(kind, value, c, dialect);
  const authored = value?.lt;
  if (typeof authored === "string" && out.lt === authored && !getValueText()?.has(authored) &&
      authored !== value.en && !["name", "surname", "letters", "spelled"].includes(kind) &&
      /\p{L}/u.test(authored)) {
    throw new Error(`Missing SM (Lithuanian) value ${kind}: ${authored}`);
  }
  return out;
};

const lithuanianTarget = { ...Lithuanian, valueDisplay: checkedValue };
