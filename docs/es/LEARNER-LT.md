# Puerto Colibrí for Lithuanians (the learner layer `lt`)

The same Spanish game, with its three Spanishes, the same clips and the same pictures, for a learner whose own language
is Lithuanian (the course Spanish Master, kursas.skaitykispaniskai.lt). Spanish Master English keeps the English layer.

- Build: `VITE_EDITION=es VITE_LEARNER=lt npm run build`. Tools: `EDITION=es LEARNER=lt`.
- The interface is Maple Harbor's Lithuanian, the strings' originals in `L()`. `src/editions/es-lt/ui/strings.ts`
  holds only the strings whose Lithuanian original speaks of English or Maple Harbor.
- The content stays one source. `src/editions/es-lt/tables/<sit>.json` (one per conversation, plus `_shared.json`)
  is a table from the English learner text to its Lithuanian. `applyLearner()` puts it in place when the content
  loads (`src/editions/es/learner/walk.ts`).
- When a conversation changes, re-run the extraction and translate only the new items.
  `tools/es-learner/check.ts` lists what is missing.

## Translating (the work files)

`tools/es-learner/extract.ts` writes `~/puerto-colibri-lt/work/<sit>.json`: every item with its Spanish context.
Fill `lt` in every item and save the whole file to `~/puerto-colibri-lt/done/<sit>.json`. Then
`npx tsx tools/es-learner/build.ts <sit>` checks it and writes the table. Fix every error it prints.

Maple Harbor is the model: `src/content/situations/*.ts` (the English edition) is the same engine with Lithuanian in
these same fields. Read one, for example s72-cafe.ts, before you start.

### The three kinds of item

**sent**: a sentence. `es` is the Spanish in units (" | "), `gloss` the English unit by unit, `nat` the natural
English, and `flags` the notes on units (by unit index). Write `lt` as an object:
`{ "gloss": "...", "nat": "...", "flags": { "3": "..." } }`.
- `gloss`: Lithuanian unit by unit, **exactly as many units as `es`**.
  - Each unit says what that Spanish unit means in Lithuanian, in Lithuanian word order where the meaning allows.
  - A unit with no Lithuanian word of its own (an article, "a" marking a person, a doubled pronoun) is "—".
  - Keep any choice the Spanish has in the same unit, written the Lithuanian way:
    - the person addressed `{m:pasiruošęs|f:pasiruošusi}` (in an NPC's line, the learner);
    - the speaker `{sm:…|sf:…}`;
    - Spanish usted/tú `{u:…|t:…}` becomes `{j:Jūs|t:tu}`.
- `nat`: what a Lithuanian would naturally say, not a word-for-word rendering.
- `flags`: notes for a **Lithuanian** speaker, the same unit indexes. Adapt, don't translate.
  - "The article has no English word here." becomes "Lietuvių kalboje artikelių nėra."
  - "a marks a person as the object; English needs no word." becomes "a žymi asmenį – lietuviškai jo nereikia."
  - Compare with Lithuanian, not with English. Drop a note only if it makes no sense for a Lithuanian, and say so in your report.
- Placeholders:
  - An entity placeholder in the Spanish (`{X}`, `{X.np}`, `{X.the}`, `{X.pl}`, and the same for S, T, C, D…) gets its Lithuanian case in the gloss and in nat: `{X:acc}`, `{X.np:gen}`, `{X.pl:nom}`. The cases are nom gen dat acc ins loc. `X.the` and `X.np` both become `{X.np:case}` or `{X:case}` (Lithuanian has no article).
  - Spanish agreement (`{lo@X}`, `{nuevo@X:pl}`) becomes Lithuanian agreement where a word must agree, `{jis@X:acc}` (lemmas in src/convo/lt-morph.ts), or a plain word where none is needed.
  - Values (`{$price}`, `{$time}`, `{$name}`…) stay exactly as they are; the engine writes them in Lithuanian.

**entity**: a thing or person the learner can name. `es`/`esPl` are the Spanish units.
- Write `lt` as an object `{ "lt": "...", "ltPl": "...", "g": "m" | "f", "nat": "...", "natPl": "..." }`, with only the keys the item's `fields` has, plus `g`.
- `lt` and `ltPl` give, unit by unit (" | ", **as many units as `es`**), the six case forms nom/gen/dat/acc/ins/loc separated by "/": "kava/kavos/kavai/kavą/kava/kavoje". Give one form for a unit that doesn't decline, or "—".
- Always give `ltPl` when the item has `esPl`, even if `fields` has none: English adds "s", Lithuanian can't.
- `nat`/`natPl` (the natural name where the gloss units alone read badly: agua | de | jamaica → hibiskų gėrimas) is
  the whole phrase in its six cases: "hibiskų gėrimas/hibiskų gėrimo/hibiskų gėrimui/hibiskų gėrimą/hibiskų
  gėrimu/hibiskų gėrime". **Every entity whose `lt` has more than one unit needs it**: the answer chips show its
  nominative („vietinis maistas“, „itališkas maistas“), never the gloss joined in Spanish order.
- `natF`/`natPlF`: an entity with `ltF` (a job: guía de turistas) and a `nat` gets the feminine natural name too, six
  cases ("turistų gidė/…"): a woman learner's chip shows it.
- `neutralLt`/`spainLt` (and their `…Pl`): when the item's `fields` has them, the gloss of the neutral or Spain noun,
  which has other units than the Mexican one ("cuenta | corriente"): case forms per unit, as `lt`.
- `plOnly: true` for a noun Lithuanian has only in the plural (camisa → marškiniai, escalera → kopėčios): give its
  forms in `ltPl` (and `lt` the same); the gloss and every agreement ({naujas@X}, {šis@X}) then use the plural.
- `g` is the Lithuanian gender of the head noun.
- `ltF`/`ltPlF`: the feminine forms when the entity describes the learner (jobs).

**text**: a label, goal, intro, hint goal, tip, note or merge note. Write `lt` as a string.
- Goals, mission items and step labels are short imperatives, as in Maple Harbor ("Užsisakyk gėrimą").
- Merge notes (`split`, `minimal`) explain a Spanish multiword unit to a Lithuanian.

### Lithuanian rules (the owner's)

- Natural Lithuanian, as a good teacher writes it. Not a calque of the English.
- Polite address to one person: capital **Jūs, Jus, Jums, Jūsų** (and Jūsiškis…). A group stays jūs. Familiar: tu.
  Usted is Jūs; ustedes is jūs, or Jūs when the context is plural.
- The learner may be a man or a woman. Every form that depends on it goes in `{m:…|f:…}` when the learner is
  addressed, and in the learner's own lines too (the engine resolves `{m|f}` by the learner's gender there).
  - Check every participle and adjective: pasiruošęs/pasiruošusi, pavargęs/pavargusi, tikras/tikra.
- An NPC speaking of themself uses `{sm:…|sf:…}` where their gender shows.
- Spanish names, places and brands stay Spanish (Puerto Colibrí, avenida Juárez, Café La Ceiba, Doña Lupita).
  Common nouns are translated (café → kavinė).
- Prices are pesos: "45 pesai", "$45" stays.
- Lithuanian quotation marks „…“; dashes –.
