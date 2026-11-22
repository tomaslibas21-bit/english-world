import { NPCS } from "../../content/npcs";
import type { EntityDef } from "../../content/types";
import { splitUnits } from "../../convo/compose";
import { agree, CASES, parseForms } from "../../convo/lt-morph";
import { wordKey, type WordKind } from "./wordKinds";

const possessives: Record<string, string> = { my: "mano", your: "jūsų", our: "mūsų", his: "jo", her: "jos", their: "jų" };
const ltCaseEnding = /(?:[ąęįų]|iams|iems|ams|oms|ėms|[iu]ui|[yė]je|oje|ame|uose|ose|ais|omis|ėmis)$/u;
const names = new Set(Object.values(NPCS).flatMap(({ name }) => name.split(/\s+/)).map(wordKey));
for (const name of "Monday Tuesday Wednesday Thursday Friday Saturday Sunday January February March April May June July August September October November December".split(" ")) names.add(wordKey(name));

const strip = (text: string) => text.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");

export class RoadWordForms {
  private table = new Map<string, string>();
  private proper = new Set(names);

  constructor(entities: readonly EntityDef[], playerNames: readonly string[]) {
    for (const name of playerNames) for (const part of name.split(/\s+/)) this.proper.add(wordKey(part));
    for (const entity of entities) {
      this.add(entity.en, entity.lt);
      this.add(entity.en, entity.ltF);
      if (entity.pl) {
        this.add(entity.pl, entity.ltPl);
        this.add(entity.pl, entity.ltPlF);
      }
    }
  }

  private add(en: string, spec?: string) {
    if (!spec) return;
    const english = splitUnits(en).join(" ");
    const forms = splitUnits(spec).map(parseForms);
    const base = forms.map(([nom]) => nom).join(" ");
    if (/^\p{Lu}\p{Ll}/u.test(english)) this.proper.add(wordKey(english));
    for (let i = 0; i < CASES.length; i++) {
      const gloss = forms.map((row) => row[i]).join(" ");
      this.table.set(`${wordKey(english)}|${wordKey(gloss)}`, base);
    }
  }

  hear(en: string, lt: string, kind: WordKind | undefined, contextual: boolean) {
    const key = wordKey(en), gloss = wordKey(lt);
    const fromTable = (english: string, lithuanian: string) => this.table.get(`${english}|${lithuanian}`);
    const entity = fromTable(key, gloss);
    if (entity !== undefined) return entity;
    const [lead, ...rest] = key.split(" ");
    if (rest.length) {
      const possessive = possessives[lead];
      if (possessive || /^(a|an|the)$/.test(lead)) {
        const head = rest.join(" ");
        const translatedHead = gloss.replace(/^(?:mano|savo|tavo|jūsų|mūsų|jo|jos|jų) /, "");
        const base = fromTable(head, translatedHead);
        if (base) {
          const writtenPossessive = gloss !== translatedHead ? gloss.slice(0, gloss.indexOf(" ")) : undefined;
          return possessive ? `${writtenPossessive === "tavo" && lead === "your" ? "tavo" : possessive} ${base}` : base;
        }
        if (possessive && gloss === translatedHead && !/\s/u.test(gloss) && !ltCaseEnding.test(gloss)) return `${possessive} ${gloss}`;
        // Keep complete authored phrases. Fragments with only an oblique noun do not make standalone answers.
        if (gloss === translatedHead && ltCaseEnding.test(gloss)) return null;
      }
      return lt;
    }
    // Reuse the regular adjective forms for authored colours which may occur in a different situation.
    if (kind?.role === "adjective" && ltCaseEnding.test(gloss)) {
      const masculine = gloss.replace(/(?:inį|inę|inėje|iniame|inio|iniam|iniu)$/, "inis");
      if (masculine !== gloss && CASES.some((c) => agree(masculine, "m", c) === gloss || agree(masculine, "f", c) === gloss)) return masculine;
    }
    // An unverified inflection can still appear with its sentence in a gap exercise.
    if (kind?.role === "verb" && !/ti(?:s)?$/u.test(gloss)) return null;
    if (kind && /^(noun|adjective|number)$/.test(kind.role) && ltCaseEnding.test(gloss)) return null;
    if (contextual && kind?.role === "noun" && !/\s/u.test(gloss) && !/(?:as|is|ys|us|uo|ė|a|ai|ės|os)$/u.test(gloss)
      && !this.proper.has(key)) return null;
    return lt;
  }

  gap(en: string, kind?: WordKind) {
    if (/^i(?:['’]|$)/i.test(en)) return `I${en.slice(1).toLowerCase()}`;
    if (this.proper.has(wordKey(en)) && kind?.role !== "adjective" && !/^\p{Lu}{2,}$/u.test(en)) return en[0].toUpperCase() + en.slice(1);
    return strip(en).toLowerCase();
  }
}

export function gapLabel(en: string) {
  return /^i(?:['’]|$)/i.test(en) ? `I${en.slice(1).toLowerCase()}` : names.has(wordKey(en)) ? en : en.toLowerCase();
}
