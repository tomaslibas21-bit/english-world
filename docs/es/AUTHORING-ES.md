# Writing a Spanish conversation

How to turn one of Maple Harbor's conversations into Puerto Colibrí's. Read first, in this order:

1. `AUTHORING.md` (the English edition's guide): the engine, the grammar syntax, steps, handlers, hints, tests and
   sims. Everything there holds, except what this file changes.
2. `docs/es/STYLE.md`: the owner's decisions, usted/tú, glosses, money, the glossary, names.
3. The three Spanish models, completely: `src/editions/es/content/situations/s72-cafe.ts`, `s32-mercado.ts`,
   `s66-taxi.ts`. Copy their patterns of code; they pass every check.
4. Your conversation's English file in `src/content/situations/` and its brief in `docs/es/BRIEFS.md`.

## Where the file goes

- `src/editions/es/content/situations/<id>.ts`, the **same id** as the English one (`s68-hotel`), unless the brief
  renames it (s32 became `s32-mercado`). Then run `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/gen-index.ts`.
- Import with the `@/` alias: `import type { Ctx, SituationDef } from "@/content/types"`, `import { ent, t } from
  "@/content/dsl"`, `import { expectHowAreYou } from "@/content/global"`. In this edition `@/content/global` *is* the
  Spanish global skills, `@/convo/slots` the Spanish numbers (the edition overlay, `docs/es/EDITIONS.md`).
- Never edit the English edition's files, the shared engine (`src/convo/`, `src/game/`, `src/ui/`) or
  `src/editions/es/convo/`, `src/editions/es/content/global.ts`, `npcs.ts`, `locations.ts`. If you need something
  there, write it under `// NEEDS:` at the top of your file and in your report.

## Keep from the English conversation, change for Mexico

- **Keep:** the id, `song`, `songTitle`, `chapter`, `order`, `location`, `npc`/`npcs` ids, the steps' ids and order,
  the intents' ids, the handlers' logic, the twists and the sims' situations. Learners and the course's mission map
  rely on them; the shape of the state machine is proven by the English edition's sims.
- **Change:** the content. Not a translation of the American scene: what really happens in a Mexican Caribbean town
  (the brief says what changes: no meter in taxis, a "¿Para hoy o para mañana?" at the market, the factura at the
  restaurant, the CURP, the pharmacist who sells antibiotics only with a prescription…). Research how the real
  interaction goes, the questions staff ask, the choices, the common problems; drop what doesn't exist in Mexico and
  add what does. The brief lists the must-haves.
- `title`: `{ en: "<Spanish title>", lt: "<English>" }`, `topic` the same (`en` holds the practised language,
  `lt` the learner's: the field names are the English edition's). `goal`, `intro`, mission labels, hint and
  suggestion labels: English (STYLE.md "Writing natural English help").

## Lines and hints

`t("Spanish | units", "English | glosses", "Natural English.", { flags, say, spell, write, neutral })`

- One Spanish word per unit, the English it means under it (STYLE.md "Interlinear glosses").
- Placeholders in the Spanish (the composer builds them, `src/editions/es/convo/target.ts`):
  - `{X}` the entity's head ("latte"), `{X.np}` with the indefinite article or a number ("un latte grande", "una
    horchata", "dos lattes", "leche" for a mass noun), `{X.the}` with the definite one ("el agua"), `{X.pl}` plural.
    In the gloss: `{X}`, `{X.np}`, `{X.the}`, `{X.pl}` (no case).
  - `a {X.the}` becomes "al" by itself ("al centro"), `de {X.the}` "del".
  - Agreement: `{lo@X}` → lo / la / los / las, `{frío@X}` → frío / fría / fríos / frías: any adjective or
    determiner in its masculine singular, agreeing with X.
  - `{m:…|f:…}` the learner's gender, `{sm:…|sf:…}` the speaker's, `{u:…|t:…}` usted / tú (shared lines only).
  - Values: `{$price}` (and total, amount, fare, rent, deposit), `{$time}` (with its article: "las 8:30"), `{$num}`,
    `{$letters}`, `{$name}`. Declare a domain for every value in a line (`domains`), as the models do.
  - Digits written in a line need a `say:` with the words.
- Entities (`ent(id, spanish, english, gender, extra)`): `pl` the Spanish plural (when it isn't regular), `ltPl` the
  English plural, `g` the **Spanish** gender (it picks un/una and the agreement), `art: ""` for a mass noun, `art:
  "un"` + `def: "el"` for "agua", `forms` for synonyms, the neutral word and recognizer spellings ("orchata",
  "late"), `attrs.nat` the natural English name for multiword ones ("agua | de | jamaica" → "hibiscus water"),
  `attrs.pre` for a modifier that goes before the noun. Entities that describe the learner (jobs, nationalities):
  `enF` / `plF` / `gF` (the Spanish feminine).
- A line with a Mexican-only word: `neutral: t(…)` with the neutral wording and its own glosses (STYLE.md). Keep
  them few.
- Hint items: about 8–12 for the main intention, 3–6 for others. The learner's register to this NPC (usted to
  staff). A `note` for anything subtle, in English.

## Patterns (what the learner may say)

- Lowercase, **no accents, no ¿¡, no punctuation**: the engine folds "¿Cuánto cuesta?" to "cuanto cuesta" before
  matching. Write "cafe", "jamon", "esta bien".
- `por favor` is removed from what the learner says (and recorded), so patterns never contain it.
- **Built-in tolerance** (don't write patterns for these): a missing article or little word (el/la/un/una, de, a, en,
  con, por/para, me/te/le/lo/se, es/está); an extra subject pronoun or filler (yo, usted, tú, pues, bueno, este,
  ya…); gender and person slips (la café, yo quiere, ¿puedes…? to staff), ser/estar, por/para, qué/cuál; spelling
  by sound (baso/vaso, serbesa/cerveza, ola/hola, yevar/llevar); a leading "hola", "buenos días", "oiga",
  "disculpe", "perdón", "este", "a ver", "yo"; a trailing "gracias", "por favor", "entonces", "nada más",
  "ahorita"; the NPC's name or a "señor/joven". Write patterns for different constructions and vocabulary instead.
- **Negation is safe by construction, if you help it:**
  - "no" before a verb is the verb's negation: "No quiero leche" is never "No." + "quiero leche". After a bare
    leading "no", only a correction word can start an answer ("No, el grande", "No, para llevar": see
    `correctionStarters` in `src/editions/es/convo/lang.ts`).
  - Write explicit negative intents for what can be refused: `"[mejor] no (quiero | voy a querer) {item}"`,
    `"no {item}"`, `"sin {item}"`, and corrections: `"no {item} sino {item}"`, `"{item} en vez de {item}"`.
  - A piece after a negative piece must start something new ("No tengo efectivo, | con tarjeta"); so "no un
    capuchino, un latte" is read by your `correction` intent, never as a refusal plus an order.
- Mexican and neutral words both: `"(jitomate | tomate)"`, `"(sitio | parada) de taxis"`, `"(ticket | recibo)"`.
- Learners' calques of English are accepted where clear, often with a tip: "para ir" (to go) `#tip:para_llevar`,
  "tomo un café" (I take) `#blunt`, "yo quiero" (fine).
- Tags: `#h:<hintItemId>` on every hint's pattern (credits the phrasebook), `#tip:<key>` (define `tips`), `#blunt`.
- Intent suffixes `_ctx` (only when expected) and `_unknown` (catch-all) work as in the English edition.

## Tests and sims (the acceptance gate)

- At least **40 NLU tests**: every hint pattern; natural alternatives; short answers with their `step`; tú to staff;
  gender slips; spellings without accents; the Mexican and the neutral word; **at least 3 Spain forms** (vosotros, a
  Spain word, vale: STYLE.md); **at least 5 negation / meaning-safety tests** (`not: [...]` or `intent: "none"`);
  3 or more sentences that must not be understood.
- At least **4 sims** that complete on all 12 seeds: the happy path, one with questions and changes of mind, one per
  twist (forced with `setup`), one with the learner's short answers. Use `auto` answers (in Spanish) for optional
  questions, as the models do. A sim's turns are what a learner really says, in Spanish, with accents or without.
- Read your sims' transcripts as a native speaker would:
  `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts <id> --seed=3`. Every line must be natural
  Mexican Spanish in its context, every gloss right, every natural English line idiomatic.

## Checks (all must pass before you hand it in)

```sh
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/check-content.ts <id> --verbose   # 0 errors, 0 warnings
npx tsc --noEmit -p .                                                                          # no errors
npx vitest run                                                                                 # both editions green
```

`docs/es/PLAN.md` "Acceptance" lists the full gate, including the English edition's no-change check.
