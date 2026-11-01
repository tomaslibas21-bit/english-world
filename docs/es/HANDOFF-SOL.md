# Prompt for the executor: the trial conversation (batch A)

Paste everything below the line into ChatGPT (Sol 6.1, extra high reasoning), with the GitHub connector on.

---

You are writing one conversation of a language-learning game, in a TypeScript repository, as a trial for a series of
47. Quality is checked by tests and by a careful review; read before you write.

**Repository:** GitHub `tomaslibas21-bit/english-world`, branch `spanish-edition` (base your work on it). Create the
branch `es/A-hotel` from it, and when you're done open a pull request from `es/A-hotel` into `spanish-edition`.

**The game:** a 3D town where the learner walks up to people and talks to them by voice or by typing. There is no AI
at runtime: every line a character says is written in advance, and what the learner may say is understood by a
hand-written grammar per conversation. The repository builds two editions from one engine: the English edition
(Maple Harbor, for Lithuanian speakers) and the Spanish edition (Puerto Colibrí, a small town on Mexico's Caribbean
coast, for English speakers learning Spanish, Mexican by default). You write for the Spanish edition.

**Set up:** Node 22 or newer, then `npm ci` in the repository root.

**Read first, completely and in this order:**
1. `docs/es/README.md`, then `docs/es/EDITIONS.md`.
2. `AUTHORING.md` (the engine and the authoring rules; written for the English edition).
3. `docs/es/STYLE.md` and `docs/es/AUTHORING-ES.md` (what changes for Spanish).
4. The three Spanish models: `src/editions/es/content/situations/s72-cafe.ts`, `s32-mercado.ts`, `s66-taxi.ts`.
   Run `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts s72-cafe --seed=3` and read what it
   prints.
5. The English hotel conversation: `src/content/situations/s68-hotel.ts`, and the hotel's brief in
   `docs/es/BRIEFS.md` (s68-hotel).

**Your task:** write `src/editions/es/content/situations/s68-hotel.ts`, the hotel check-in at Hotel Mar Azul with
Fernanda at the reception (usted). Keep the English conversation's id, steps, intents and twists; write the content
for a Mexican Caribbean hotel as the brief says (research the real interaction: what a receptionist there asks, the
deposit or card imprint, the lodging tax, breakfast hours, the Wi-Fi, a late check-out, the room not ready). Then run
`EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/gen-index.ts`.

**Rules:**
- Only add `src/editions/es/content/situations/s68-hotel.ts` and the regenerated `index.ts` next to it. Do not edit
  any other file. If you need something from a shared file, write it under `// NEEDS:` at the top of your file.
- Spanish: Mexican by default, natural and current, the way a receptionist in a Quintana Roo beach town speaks. A
  line with a Mexican-only word gets a neutral twin (`neutral:`); keep them few.
- English (glosses, natural translations, hint labels, notes, goal, intro): American English.
- Every line and hint is interlinear by the conventions in STYLE.md; register every multiword unit.
- No randomness except `c.chance()` / `c.pick()`; no network; never put the learner's name into a line the
  character says (it can't be recorded).

**Acceptance (all must pass; paste their output into the pull request):**
```sh
npx tsc --noEmit -p .
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/check-content.ts s68 --verbose    # ✓ 0 errors, 0 warnings
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts s68-hotel --seed=3
npx vitest run
```
plus at least 40 NLU tests (every hint pattern; natural alternatives; short answers with their step; tú to staff;
gender slips; unaccented spellings; Mexican and neutral words; at least 3 learners' Spain forms such as vosotros,
"zumo" or "vale", which count as correct; at least 5 meaning-safety tests and 3 that must not be understood) and at least 4 sims that complete on 12/12 seeds (the happy path; questions and a change of mind; each
twist forced with `setup`; short answers).

**In the pull request, write:** what the conversation covers, the gate's output, any line you weren't sure about,
any `// NEEDS:`, and how long the work took you. Then stop: the lead reviews the trial before the next batch.
