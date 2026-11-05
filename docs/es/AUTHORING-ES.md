# Writing a Spanish conversation

How to turn one of Maple Harbor's conversations into Puerto Colibrí's. Read first, in this order:

1. `AUTHORING.md` (the English edition's guide): the engine, the grammar syntax, steps, handlers, hints, tests and
   sims. Everything there holds, except what this file changes.
2. `docs/es/STYLE.md`: the owner's decisions, usted/tú, glosses, money, the glossary, names.
3. The Spanish models, completely: `src/editions/es/content/situations/s72-cafe.ts`, `s32-mercado.ts`,
   `s66-taxi.ts`, and `s68-hotel.ts` (the trial, after the lead's review). Copy their patterns of code; they pass
   every check. `docs/es/reviews/` says what each review changed and why: the same mistakes cost the most.
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
- **One accent stays: a past tense in é / ó.** "Pagué", "compró" said with the accent (speech always has it) is a
  past and never matches "pague" (a command) or "pago" (I pay). So a pattern that means the past writes the accent:
  `"ya lo pagué"`, `"se me olvidó"`, `"(reservé | reservamos)"`, `"no llegó mi maleta"`; a command or a present stays
  unaccented (`"tome"`, `"lo pago"`). The learner's unaccented "pague" still matches "pagué". (Not marked: -ió pasts,
  futures, the -rar verbs' "-ré" pasts like "tiré", "esperé"; `markPast` in `src/editions/es/convo/lang.ts`.)
- **A what-if's "si" goes in the same words as its "y" / "que pasa" / "que tal"**: `"(y si | que pasa si) cancelo"`,
  not `"(y | que pasa) si cancelo"`. That "si" is an "if" (never the "sí" of a yes: "¿Y si lo pago por adelantado?"
  is no "[sí] lo pago por adelantado"), in what is said and in the pattern, but only when the engine sees both words
  together.
- `por favor` is removed from what the learner says (and recorded), so patterns never contain it.
- **Built-in tolerance** (don't write patterns for these): a missing article or little word (el/la/un/una, de, a, en,
  con, por/para, me/te/le/lo/se, es/está); an extra subject pronoun or filler (yo, usted, tú, pues, bueno, este,
  ya…); gender and person slips (la café, yo quiere, ¿puedes…? to staff), ser/estar, por/para, qué/cuál, but never a
  slip of a verb's last vowel, which carries its person and mood ("tengo" is no "tenga", "tomo" no "tome" or
  "toma", "llevo" no "lleve"; write each form you mean); spelling
  by sound (baso/vaso, serbesa/cerveza, ola/hola, yevar/llevar); a leading "hola", "buenos días", "oiga",
  "disculpe", "perdón", "este", "a ver", "yo"; a trailing "gracias", "por favor", "entonces", "nada más",
  "ahorita"; the NPC's name or a "señor/joven". Write patterns for different constructions and vocabulary instead.
- **Negation is safe by construction, if you help it:**
  - "no" before a verb is the verb's negation: "No quiero leche" is never "No." + "quiero leche", and neither is
    "No la tiro" (a clitic between them) "No." + "la tiro". After a bare leading "no", only a correction word can
    start an answer ("No, el grande", "No, la roja", "No, para llevar": see `correctionStarters` and `noNegates` in
    `src/editions/es/convo/lang.ts`).
  - Write explicit negative intents for what can be refused: `"[mejor] no (quiero | voy a querer) {item}"`,
    `"no {item}"`, `"sin {item}"`, and corrections: `"no {item} sino {item}"`, `"{item} en vez de {item}"`.
  - A piece after a negative piece must start something new ("No tengo efectivo, | con tarjeta", "…, | quiero pagar
    con tarjeta", "No vengo de vacaciones, | vengo a una conferencia", "No la tiro, | me la tomo"); so "no un
    capuchino, un latte" is read by your `correction` intent, never as a refusal plus an order. A verb right after a
    "no" never starts one ("Efectivo no quiero…" stays together).
  - "Así está bien", "Está bien así", "Déjelo así" (as it is) are a built-in **no**: at an offer they decline it.
    Where a question wants them as a yes ("¿Así está bien?" at the fingerprint reader), write them in that step's own
    intent; "Sí, así está bien" stays a yes. "Claro que no" (por supuesto / desde luego que no) is a no; "Claro que
    no hay ningún problema" a yes.
- Mexican and neutral words both: `"(jitomate | tomate)"`, `"(sitio | parada) de taxis"`, `"(ticket | recibo)"`.
- Learners' calques of English are accepted where clear, often with a tip: "para ir" (to go) `#tip:para_llevar`,
  "tomo un café" (I take) `#blunt`, "yo quiero" (fine).
- Tags: `#h:<hintItemId>` on every hint's pattern (credits the phrasebook), `#tip:<key>` (define `tips`), `#blunt`.
- Intent suffixes `_ctx` (only when expected) and `_unknown` (catch-all) work as in the English edition.

## Rules from the reviews

The trial (s68-hotel) passed every check and still had to change in about 10% of its lines: the checks prove what
the tests say, not what learners say. These rules come from what the reviews fixed (`docs/es/reviews/`: rules 1–9 from the trial, 10–16 from
batch 1: the passport, the baggage desk, the visitor center and the local; 17–22 from batch 2: the museum and the
travel chapter).

1. **Never bend the grammar to a test.** Don't add a `_ctx` intent to a step's `expects` so that an NLU test can use
   `step:`. An answer to a pending question (a taxi time, a choice) is tested in a sim. (The trial's worst bug: a
   bare "A las dos" or "Por ahora es todo" at "¿Algo más?" ordered a taxi.)
2. **A phrase that means something elsewhere never goes in a plain intent.** A bare yes ("está bien"), a refusal
   ("no quiero pagar más"), a bare time or number belongs in the pending question's `yes`/`no` or in a `_ctx` intent
   expected only where it makes sense.
3. **Nothing paid or binding before its price or terms are said.** If the learner names the paid option first,
   quote it and ask.
4. **Spanish words that look like numbers.** A handler that reads `c.heard` matches "a la una", "las dos", never a
   bare "una" or "dos" ("una salida tardía", "los dos"). In patterns, "cambiar(me)?" doesn't match "cambiarme":
   write "(cambiar | cambiarme)".
5. **Actions belong to their part of the conversation.** A handler shared by two modes (check-in and a problem
   visit) checks the mode before it acts.
6. **Breadth.** For every likely intent, the 5–8 commonest ways to say it: Mexican everyday verbs (no sirve, no
   prende, el clima), verb-first questions ("¿Está incluido el desayuno?"), one-word answers at their step
   ("¿Aquí?", "Tome", "Ya está"), corrections ("No son tres, son cuatro", "Mejor al mediodía"), closings ("Eso sería
   todo", "Por ahora es todo"). An intent counts once per turn, so an answer in two pieces of one intent ("Sí, es
   frágil, son unas tazas") needs one whole pattern.
7. **A corpus before the grammar.** Write `tests/es/corpus/<id>.json` first: at least 100 things learners might say,
   step by step, and at least 20 traps (an item with `"not": [...]`), in the format of
   `tests/es/corpus/s68-hotel.json`. At the end `tools/coverage.ts <id>` must show at least 90% understood and no
   trap accepted. (The trial's 131 tests all passed; a broad corpus found 60%.)
8. **Read the transcripts twice:** the twist sims and two seeds, not only seed 3. No line twice in a row; every reply
   answers what was asked; a repeated question gets a short reminder, not the same line again.
9. **Spanish details:** se lo / se la agree with the noun (la almohada → se la llevamos); say information once (the
   lodging tax); one word for one thing (the room key is la llave, the credit card la tarjeta).

10. **Commas are lost, and voice never has them.** "Vacaciones, no negocios" and "Vacaciones no, negocios" read the
    same; so do "No, es todo" and "No es todo", "No, fue directo" and "No fue directo". Where the two readings book
    or record different things, tag the pattern `#amb` and have the character ask again ("Perdón, ¿cuál de los
    dos?"); where they don't, keep the likelier reading. In "No X, Y" corrections the second item is the answer
    ("No a la derecha, a la izquierda" → left).
11. **Every reply answers the question that reached it.** Check each answer line against the yes/no and the wh-
    forms that lead to it: "¿Está lejos?" gets "No, a cinco minutos", never "Sí, está a cinco minutos"; "¿Cuánto
    cuesta?" gets a price, not "No, es barato". "¿Es muy caro?" is a question, not the too-expensive complaint.
12. **Handlers check which question is pending.** "No, es mi primera vez" means "not before" only after "¿Ya había
    venido?"; "No tengo tarjeta" is a plain no at "¿Trae tarjeta?". A bare "aquí", "tome", "no hace falta", "no
    tengo nada" lives in a `_ctx` intent of the one step where it fits (rule 2).
13. **Offer once, inform once, in order.** Don't offer the same thing twice (a kit already given or refused is
    remembered); don't mention something before it's given ("con su número de reporte" before the number).
14. **Facts agree across the town.** A place, a person or an opening time named in another conversation keeps its
    facts, and every direction follows the 3D town (`docs/es/TOWN.md`, "Getting around (from the 3D town)" and "Town
    facts from the conversations": Café La Ceiba is on avenida Juárez, straight across from Información Turística; the
    Policía Municipal is at the zócalo's east end, next to the church; grep the Spanish conversations too). Unsure
    real-world figures (fees, deadlines, an office's practice) stay vague.
15. **Flags point at real units.** A `flags` index counts the line's units from 0; check it in the transcript (the
    Mexican-word flag must show on the Mexican word).
16. **Clarification is global.** Repeat, slower, write it down, spell, "¿Qué significa…?" and thanks are in
    `global.ts` (repetirlo, ¿Lo puede repetir?, ¿Me lo escribe?, Hable más despacio, Muchas gracias por todo). Don't
    copy them into a conversation; if a common form is missing, write it under `// NEEDS:`.

17. **Money and bookings move only on a present yes or a hand-over.** A past tense ("Pagué todo", "Ya lo pagué"), a
    what-if ("¿Y si cancelo?", "¿Y si quiero la cobertura?"), a price question ("¿Cuánto es?", "¿Es cara?") and a
    polite closing ("Así está bien", "Está bien, gracias", "Vale, gracias") never pay, book or add an extra. At a paid
    offer "Así está bien" is a no; a closing that could be either gets the question again; "¿Cuánto es?" at an open
    offer gets that offer's price. (Since 2 Nov 2026 the engine reads a past said with its accent, a what-if and "Así
    está bien" this way by itself; an unaccented "pague todo" is still yours to read: accent your past patterns.)
18. **The other way, the other choice.** "No quiero pagar con tarjeta" offers cash and charges nothing; "No con
    tarjeta, en efectivo" is cash; "Pasillo no, ventana" could be either once its comma is gone: `#amb` (rule 10). A
    cash amount smaller than the total asks for the rest ("Son $861.50; faltan $361.50"); one over the maximum is
    capped and said.
19. **Words one slip apart.** The engine forgives small slips and drops accents, so a pattern word can match its
    neighbor: "sala" ← "salida", "playera" ← "playa" (a shared stem). (Since 2 Nov 2026 it no longer forgives a verb's last vowel, "Tenga" ← "Tengo el
    vuelo…", "Tome" ← "Tomo el de las…", nor reads "¿Y si cancelo?" as "Sí, cancelo".) Test every hand-over and yes
    intent against such statements with `not:`, and keep near-identical words out of each other's intents.
20. **Numbers as people say them.** Flight, room and phone numbers whole, in pairs and digit by digit
    ("doscientos veintitrés", "dos veintitrés", "dos dos tres"); amounts with and without "pesos"; every count the
    grammar accepts has its total in the price domain; a number that isn't the one on file is noticed ("Su
    reservación es para el vuelo 223").
21. **A held turn keeps its step, and a yes belongs to the last question.** After `c.hold()` the next turn is parsed
    with that step's expects; an offer's yes counts only right after the offer; "No, solo una pregunta" answers
    "¿Algo más?" without ending the conversation.
22. **Play the binding outcomes.** For every paid or binding choice, play whole conversations with `tools/probe.ts`
    (exact turns, how each was parsed, the recorded state): a plain no, a correction, a what-if, a price question, a
    polite closing, a past tense. A reply can sound right and still record the wrong thing; batch 2's max checks
    found such bugs in every conversation with money.

## Tests and sims (the acceptance gate)

- First, the **corpus** (rule 7): `tests/es/corpus/<id>.json`, before the grammar.
- At least **40 NLU tests**: every hint pattern; natural alternatives; short answers with their `step`; tú to staff;
  gender slips; spellings without accents; the Mexican and the neutral word; **at least 3 Spain forms** (vosotros, a
  Spain word, vale: STYLE.md); **at least 5 negation / meaning-safety tests** (`not: [...]` or `intent: "none"`);
  3 or more sentences that must not be understood.
- At least **4 sims** that complete on all 12 seeds: the happy path, one with questions and changes of mind, one per
  twist (forced with `setup`), one with the learner's short answers. Use `auto` answers (in Spanish) for optional
  questions, as the models do. A sim's turns are what a learner really says, in Spanish, with accents or without.
- Play the binding outcomes (rule 22) with
  `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/probe.ts <id> <scenarios.json> [--keys=a,b]`: a JSON
  list of `{ "name", "turns": [...], "setup": {...} }`; it prints each turn's step or pending question, its parse,
  the replies and the recorded state.
- Read your sims' transcripts as a native speaker would:
  `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts <id> --seed=3`. Every line must be natural
  Mexican Spanish in its context, every gloss right, every natural English line idiomatic.

## Checks (all must pass before you hand it in)

```sh
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/check-content.ts <id> --verbose   # 0 errors, 0 warnings
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/coverage.ts <id>                     # ≥ 90%, 0 false accepts
npx tsc --noEmit -p .                                                                          # no errors
npx vitest run                                                                                 # both editions green
```

`docs/es/PLAN.md` "Acceptance" lists the full gate, including the English edition's no-change check.
