# The Spanish edition: plan

Puerto Colibrí: the game for English speakers learning Spanish (Mexican by default), inside the course Spanish
Master English. One engine with two editions (docs/es/EDITIONS.md); the English edition stays exactly as it is.

## Who does what

- **Claude** (the lead): the plan, the engine and the edition switch, the model conversations and their tests, the
  reviews of every batch, anything that touches the shared engine.
- **The executor** (ChatGPT "Sol 6.1", extra high reasoning): the remaining 47 conversations from their briefs, and
  the town-restyling tasks, from this plan. Each conversation is about 1,000–2,000 lines of TypeScript with
  hand-written Spanish understanding; weak work fails silently, so the acceptance gate below decides, and the lead
  reads the risky parts in full.
- **The owner**: the decisions (docs/es/STYLE.md), the pictures (ChatGPT, later), the Gemini key for the voices
  (later, added by the owner), every publish.

## Phases

1. **Done (1 Nov 2026):** the edition switch; the Spanish language layer (understanding, numbers, composing); the
   global skills in Spanish; the cast and the places; three model conversations (café, mercado, taxi); the zócalo
   and the mercado restyled; the interface in English; this plan.
2. **Done (1 Nov 2026): the trial (batch A).** The executor wrote **s68-hotel** in about 20 minutes, and every check
   it reported held. The lead's review still changed about 10% of its lines: a meaning-safety bug bent to pass a
   test, a grammar too narrow for natural sentences, a few Spanish slips. It also added tests: the blind set went from
   83% to 97% understood, a 136-sentence corpus from 60% to 97%, with no trap accepted. Details:
   docs/es/reviews/s68-hotel.md; the rules it taught are in docs/es/AUTHORING-ES.md ("Rules from the reviews").
3. **Batches B–G**, in the order of docs/es/BRIEFS.md: B arrival and travel, C town services and help, D home and
   neighbors, E social, F work, G the advanced chapters. The first batch after the trial is small (3–5
   conversations, e.g. the airport, s64a–s65b) to check the new rules; then 6–8 each. docs/es/HANDOFF-SOL.md is the
   prompt for every batch. The town tasks (docs/es/TOWN.md) run alongside, one per batch.
4. **Voices:** the owner adds a Gemini key; the lead adapts `tools/voice-batch.ts` for Spanish voices (`es_<npcId>`,
   a female and a male coach), a casting sample for the owner, then the batch (~$10).
5. **Pictures:** the owner makes them with ChatGPT from a brief per conversation (as docs/PICTURES-WANTED.md does for
   Maple Harbor); they go to `public/scenes-es/` with their files in `src/editions/es/ui/scene-data/`.
6. **The course:** Spanish Master English's game doorway (`GAME_ENABLED`, `/zaidimas`), the export, the lock behind
   the course's files token (as docs/GAME.md in fluent-steps does for English Master), cards into the course's
   flashcards. Nothing goes live before the owner says so.

## Acceptance (the gate for every conversation)

All of these, run from the repository root, with their output pasted into the hand-back:

```sh
npx tsc --noEmit -p .                                                                   # no errors
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/check-content.ts <id> --verbose
#   → "✓ 0 errors, 0 warnings"; every NLU test passes; every sim "12/12 seeds ✓"; the fuzz has no crashes
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts <id> --seed=3 > review-<id>.txt
#   → read in full: natural Mexican Spanish, right glosses, idiomatic English
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/coverage.ts <id>
#   → the executor's corpus (tests/es/corpus/<id>.json): at least 90% understood, 0 false accepts
npx vitest run                                                                          # both editions green
npx tsx tools/check-content.ts                                                          # the English edition: 0 errors
```

And the conversation itself must have:
- the English conversation's steps, intents and twists (unless its brief changes them), written for a Mexican town;
- at least 40 NLU tests (every hint pattern, alternatives, short answers, tú to staff, slips, unaccented spellings,
  Mexican and neutral words, at least 3 Spain forms), at least 5 meaning-safety tests and 3 not-understood ones;
- a corpus `tests/es/corpus/<id>.json`, written before the grammar: at least 100 learner sentences and 20 traps;
- at least 4 sims (happy path, questions and changes of mind, each twist forced, short answers), 12/12 seeds;
- every line glossed by the conventions (docs/es/STYLE.md), every multiword unit registered;
- a neutral twin on every line with a Mexican-only word, and not too many of those (about one line in eight);
- usted/tú as STYLE.md says; English help in American English;
- the rules in docs/es/AUTHORING-ES.md "Rules from the reviews".

For a town task: before/after screenshots at phone size (375×812) and desktop, the draw-call numbers at three camera
spots in the area for both editions, `npx vitest run` green, and the English edition's town unchanged (the same
screenshots of Maple Harbor before and after).

## How finished work comes back

- The executor works on GitHub `tomaslibas21-bit/english-world`, on a branch from `spanish-edition` (or from `main`
  once the switch is merged there) named `es-trial-hotel` for the trial and `es-batch-<letter>` after it (e.g.
  `es-batch-B`), and opens a pull request into that base with: the conversations or tasks done, the gate's output, the review transcripts' file names,
  anything it was unsure about (a `// NEEDS:` or a question for the owner).
- The lead reviews each conversation with its own fresh helper (a short session: most of a long session's cost is
  re-reading its own context, so one helper for a whole batch would cost more), and notes the review's token use:
  1. **The blind set first:** before reading the executor's file, the helper writes 35–40 things a learner might
     say (`tests/es/heldout/<id>.json`, at least 6 traps) from the English conversation and the brief, and runs
     `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/coverage.ts --dir=tests/es/heldout`. Below 70%
     understood, or any trap accepted, and the conversation goes back to the executor.
  2. **The gate** on the branch, the executor's claims checked; the English fingerprint if a shared file changed.
  3. **In full, the risky parts:** prices, numbers, names and spelling; negation and meaning flips (its own trap
     sentences as tests); usted/tú; Mexican-only words and their twins; real-world facts.
  4. **The transcripts** of the twist sims and two seeds, read as a native speaker; a third of the glosses.
  5. **Fixes** go on the branch as one commit per conversation, the gate runs again, and the lead merges. The
     review's notes go to `docs/es/reviews/<id>.md`; what the executor should do differently goes into
     AUTHORING-ES.md before the next batch.
  The helper reads only what the review needs (STYLE.md, AUTHORING-ES.md, the English file, the brief, the
  executor's file and its transcripts) and keeps command output short.

## Budget (Claude's share)

Measured from the session transcripts, in input-equivalent tokens (input + 1.25 × cache writes + 0.1 × cache reads
+ 5 × output):
- the first stretch (switch, language layer, three models, town area, interface, plan): ~25 M, about 2–3% of a
  weekly limit;
- the trial's review: ~5 M (the fresh helper 3.9 M, the lead about 1.2 M). That is about what Claude spends writing
  one conversation itself (~3–5 M, judging by the models).

So the executor saves Claude's tokens only if reviews cost less than writing. The new rules (a corpus before the
grammar, no grammar bent to a test) should leave less to fix, and the review recipe above reads less. Target: about
2–3 M per conversation reviewed, ~100–150 M for the remaining 46 (roughly 10–15% of a week, over several weeks).
Measure the first batch; if a review still costs as much as writing, change course. Pace by the weekly reset
(Wednesday ~21:00 Lithuanian time) and stop at a clean point.

## Open questions for the owner

1. s73 restaurant: keep Trattoria Lucía (an Italian restaurant, common in Mexican beach towns) or make it a Mexican
   restaurant (cochinita pibil, the factura question)?
2. The church on the zócalo: on its north side (the stalls move a little) or at the east end beside the Policía
   Municipal?
3. s77 salon: a formal stylist (usted, as Jessie is) or a young one who says tú?
4. The course: does Spanish Master English map the game's conversations to its own songs and stories, as English
   Master's situations journey does? The ids are Maple Harbor's (s32 became `s32-mercado`), so a map is easy either
   way.
5. When to record the Spanish voices (Gemini, the owner's key; ~$10), and when to make the pictures.
6. ~~Hotel Mar Azul's made-up figures~~ **Answered: "use real numbers".** Done: typical Tulum-area prices for Nov 2026 in s68 (sources: docs/es/reviews/s68-hotel.md §8).
7. ~~The room-not-ready twist~~ **Answered: fine with a "(Más tarde…)" line.** Done: the returning learner's greeting starts with an unspoken "(Más tarde…)".
8. ~~Hotel keys~~ **Answered: "llave".** Done: kept as it was ("tarjeta" only for the broken key card).
9. ~~The lodging tax~~ **Answered: as the sources say.** Done: the lines teach Quintana Roo's 5% and Tulum's environmental fee (about $35 a night for the first guest).
