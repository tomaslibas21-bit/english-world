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
2. **Trial (batch A):** the executor writes **s68-hotel** from its brief (docs/es/HANDOFF-SOL.md is the prompt). The
   lead reviews it against the models and adjusts the plan, the briefs and the gate.
3. **Batches B–G**, about 6–8 conversations each, in the order of docs/es/BRIEFS.md: B arrival and travel, C town
   services and help, D home and neighbors, E social, F work, G the advanced chapters. The town tasks
   (docs/es/TOWN.md) run alongside, one per batch.
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
npx vitest run                                                                          # both editions green
npx tsx tools/check-content.ts                                                          # the English edition: 0 errors
```

And the conversation itself must have:
- the English conversation's steps, intents and twists (unless its brief changes them), written for a Mexican town;
- at least 40 NLU tests (every hint pattern, alternatives, short answers, tú to staff, slips, unaccented spellings,
  Mexican and neutral words, at least 3 Spain forms), at least 5 meaning-safety tests and 3 not-understood ones;
- at least 4 sims (happy path, questions and changes of mind, each twist forced, short answers), 12/12 seeds;
- every line glossed by the conventions (docs/es/STYLE.md), every multiword unit registered;
- a neutral twin on every line with a Mexican-only word, and not too many of those (about one line in eight);
- usted/tú as STYLE.md says; English help in American English.

For a town task: before/after screenshots at phone size (375×812) and desktop, the draw-call numbers at three camera
spots in the area for both editions, `npx vitest run` green, and the English edition's town unchanged (the same
screenshots of Maple Harbor before and after).

## How finished work comes back

- The executor works on GitHub `tomaslibas21-bit/english-world`, on a branch from `spanish-edition` (or from `main`
  once the switch is merged there) named `es/<batch>` (e.g. `es/A-hotel`, `es/B-arrival`), and opens a pull request
  into that base with: the conversations or tasks done, the gate's output, the review transcripts' file names,
  anything it was unsure about (a `// NEEDS:` or a question for the owner).
- The lead reviews each pull request:
  1. **Automated first:** the gate above on the branch; the English fingerprint if any shared file changed (it
     shouldn't).
  2. **In full, the risky parts:** prices, numbers, names and spelling; negation and meaning flips (the lead adds its
     own trap sentences); usted/tú; Mexican-only words and their twins.
  3. **Spot checks** of the rest: two sims per conversation read as a native speaker, a third of the glosses.
  4. A blind test set: the lead writes 30–40 sentences per conversation that the executor never saw
     (`tests/es/heldout/<id>.json`) and runs `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/coverage.ts
     --dir=tests/es/heldout`; below 70% understood, or any trap accepted, goes back.
  5. Fixes are asked for in the pull request; the lead merges when the batch passes.

## Budget (Claude's share)

The 29 Oct estimate for the whole adaptation by Claude alone was ~100–170% of a weekly limit. With the executor
writing the bulk, the lead's share is about 40–60%: this first stretch (switch, models, town area, plan) about 25%,
the trial review ~3%, then ~3–5% per batch of 6–8 conversations (gate, blind tests, the risky parts in full), the
voices ~5%. Pace by the weekly reset (Wednesday ~21:00 Lithuanian time) and stop at a clean point.

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
