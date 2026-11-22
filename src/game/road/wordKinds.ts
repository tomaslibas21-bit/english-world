import type { SituationDef } from "../../content/types";

export type WordKind = { role: string; topic?: string };

const color = /^(?:(?:dark|light|pale|bright|navy) )?(?:black|white|red|blue|green|gray|grey|silver|yellow|orange|purple|violet|pink|brown|beige|navy|golden|turquoise|tan|burgundy)$/;
const number = /^(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred)\b/;
const adjective = new Set("big small large little medium hard hard-shell soft leather fine good great nice awesome cool better best free clear ready early late right wrong sure safe quiet close open closed new old easy difficult welcome careful perfect happy healthy friendly pretty sorry".split(" "));
const social = new Set("hi|hello|hey|bye|goodbye|thanks|thank you|yes|no|sure|okay|ok|alright|all right|great|perfect|good|fine|you're welcome|you too|got it|no problem|hi there|hey there|welcome back|good morning|good afternoon|good evening|good night|excuse me".split("|"));
const acknowledgement = new Set("puiku šaunu nuostabu gerai žinoma aišku puikiai super valio".split(" "));
const interjection = new Set("hi hello hey bye goodbye yes no ha yay thanks congratulations".split(" "));
const adverb = new Set("now then today tomorrow yesterday here there anyway anytime always never sometimes often soon already really just still yet exactly quite too very together again straight back around".split(" "));
const noun = new Set("business pleasure vacation holiday family friend work trip bag baggage luggage passport hotel driver town station ticket address time day night way phone car ride card cash price train bus airport gate change name room desk key water tea coffee milk food menu order help thanks gratitude receipt morning snack snacks coffee".split(" "));
const verb = new Set("go stay come send show tell take bring get give keep see look wait pay buy book want need call make drive walk stop turn speak say talk check open close find start help ask work live eat drink run leave pick meet sign have mean enjoy follow".split(" "));

export function wordKey(text: string) {
  return text.trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "").toLowerCase().replace(/[’]/g, "'").replace(/\s+/g, " ");
}

export function entityKinds(def: SituationDef) {
  const types = new Map<string, WordKind>();
  for (const [slot, entities] of Object.entries(def.entities ?? {})) {
    const role = /^(?:colou?r|size|material)$/.test(slot) ? "adjective" : "noun";
    for (const entity of entities) for (const en of [entity.en, entity.pl]) {
      if (en) types.set(wordKey(en.replace(/\|/g, " ")), { role, topic: slot === "colour" ? "color" : slot });
    }
  }
  return types;
}

export function kindOf(text: string, gap: boolean, authored?: Map<string, WordKind>, context?: { previous?: string; next?: string }): WordKind | undefined {
  const en = wordKey(text);
  const marked = authored?.get(en);
  if (color.test(en)) return { role: "adjective", topic: "color" };
  if (number.test(en)) return { role: "number" };
  if (gap && interjection.has(en)) return { role: "interjection" };
  if (!gap) {
    if (social.has(en)) return { role: "social" };
    if (/^(?:from|to|on|in|at) [\p{L}]/u.test(en)) return { role: "prepositional phrase" };
    if (/^(?:my|your|our|his|her|their|a|an|the) [\p{L}]/u.test(en)) return { role: "noun phrase" };
    if (/^(?:who|when|how|what|where|which|why) [\p{L}]/u.test(en)) return { role: "question" };
    if (/^not [\p{L}]/u.test(en)) return { role: "negative phrase" };
    const predicate = en.match(/^(?:i'm|you're|it's|he's|she's|we're|they're) (.+)$/)?.[1];
    if (predicate) {
      const kind = kindOf(predicate, true, authored);
      if (kind) return { role: `${kind.role} predicate`, topic: kind.topic };
    }
  }
  if (marked) return marked;
  if (adjective.has(en) || /(?:able|ible|ful|less|ous|ive)$/.test(en)) return { role: "adjective" };
  if (adverb.has(en) || /(?:ally|ly)$/.test(en) && !noun.has(en)) return { role: "adverb" };
  if (context && /^(?:to|can|will|would|could|should|please|must)$/.test(wordKey(context.previous ?? "")) && verb.has(en)) return { role: "verb" };
  if (noun.has(en) || /(?:tion|ment|ness|ship|ity|ance|ence)$/.test(en)) return { role: "noun" };
  if (verb.has(en)) return { role: "verb" };
  if (gap) {
    if (en.endsWith("ing")) return { role: "ing form" };
    if (en.endsWith("ed")) return { role: "ed form" };
    if (context && /^(?:a|an|the|my|your|our|his|her|their)$/.test(wordKey(context.previous ?? ""))
      && !noun.has(wordKey(context.next ?? ""))) return { role: "noun" };
  }
}

/** A standalone reaction such as “Awesome!” is classified by its gloss as well as its English spelling. */
export function hearKind(en: string, gloss: string, kind = kindOf(en, false)): WordKind | undefined {
  if (kind?.role === "adjective" && acknowledgement.has(wordKey(gloss))) return { role: "social" };
  return kind;
}
