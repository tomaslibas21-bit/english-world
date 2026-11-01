# Prompt for the executor: a batch of conversations

Before pasting, fill in the batch's letter and its conversations (docs/es/PLAN.md, docs/es/BRIEFS.md). Then paste
everything below the line into ChatGPT (Sol 6.1, extra high reasoning), working in a clone or worktree of the
repository. (The trial's prompt, for s68-hotel alone, is in this file's history.)

---

You are writing conversations of a language-learning game, in a TypeScript repository. Quality is checked by tests
and by a careful review; read before you write. The trial conversation (s68-hotel) passed every test and still had
to change in about 10% of its lines, mostly where its grammar had been bent to pass a test or was too narrow for what
learners really say. The rules that came out of that review are part of the acceptance.

**This batch:** `<letter>`: `<id>`, `<id>`, `<id>` (in this order).

**Repository:** GitHub `tomaslibas21-bit/english-world`. Create the branch `es-batch-<letter>` from
`spanish-edition`, commit there (one commit per conversation), and when the whole batch is done, open a pull request
from `es-batch-<letter>` into `spanish-edition` (not into `main`).

**The game:** a 3D town where the learner walks up to people and talks to them by voice or by typing. There is no AI
at runtime: every line a character says is written in advance, and what the learner may say is understood by a
hand-written grammar per conversation. The repository builds two editions from one engine: the English edition
(Maple Harbor, for Lithuanian speakers) and the Spanish edition (Puerto Colibrí, a small town on Mexico's Caribbean
coast, for English speakers learning Spanish, Mexican by default). You write for the Spanish edition.

**Set up:** Node 22 or newer, then `npm ci` in the repository root.

**Read first, completely and in this order:**
1. `docs/es/README.md`, then `docs/es/EDITIONS.md`.
2. `AUTHORING.md` (the engine and the authoring rules; written for the English edition).
3. `docs/es/STYLE.md` and `docs/es/AUTHORING-ES.md` (what changes for Spanish), above all "Rules from the reviews".
4. `docs/es/reviews/` (what each review changed, and why).
5. The Spanish models: `src/editions/es/content/situations/s72-cafe.ts`, `s32-mercado.ts`, `s66-taxi.ts` and
   `s68-hotel.ts`, with the hotel's corpus `tests/es/corpus/s68-hotel.json`. Run
   `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts s72-cafe --seed=3` and read what it prints.

**For each conversation, in order:**
1. Read its English file `src/content/situations/<id>.ts` and its brief in `docs/es/BRIEFS.md`. Research the real
   interaction in a small town on Mexico's Caribbean coast: what people there ask and answer, the choices, the
   common problems.
2. Write its corpus `tests/es/corpus/<id>.json` before the grammar: at least 100 things learners (A2–B1) might say,
   step by step, with slips, short answers, Mexican and neutral words and a few Spain forms, and at least 20 traps
   (negations and meaning flips, as items with `"not": [...]`), in the format of `tests/es/corpus/s68-hotel.json`.
3. Write `src/editions/es/content/situations/<id>.ts`. Keep the English conversation's id, steps, intents and
   twists, unless the brief changes them. Write the content for Puerto Colibrí, as the brief says.
4. Run `EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/gen-index.ts` and the checks below. Then read
   the transcripts as a native speaker would: the twist sims and two seeds, not only seed 3.

**Rules:**
- Only add your conversations' files, their corpora and the regenerated `index.ts`. Do not edit any other file. If
  you need something from a shared file, write it under `// NEEDS:` at the top of your file.
- Spanish: Mexican by default, natural and current, the way people in a Quintana Roo town speak. A line with a
  Mexican-only word gets a neutral twin (`neutral:`); keep them few. Learners' Spain forms count as correct;
  characters never use them.
- English (glosses, natural translations, hint labels, notes, goal, intro): American English.
- Every line and hint is interlinear by the conventions in STYLE.md; register every multiword unit.
- No randomness except `c.chance()` / `c.pick()`; no network; never put the learner's name into a line a character
  says (it can't be recorded).
- The rules in AUTHORING-ES.md "Rules from the reviews", above all: never bend the grammar to a test; a phrase that
  means something elsewhere (a bare yes, a refusal, a bare time) never goes in a plain intent; nothing paid or
  binding before its price or terms are said.

**Acceptance (for every conversation; paste the output into the pull request):**
```sh
npx tsc --noEmit -p .
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/check-content.ts <id> --verbose    # ✓ 0 errors, 0 warnings
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/coverage.ts <id>                  # ≥ 90%, 0 false accepts
EDITION=es npx tsx --import ./tools/edition-hook.mjs tools/review.ts <id> --seed=3
npx vitest run
```
Also required for every conversation:
- At least 40 NLU tests, of the kinds AUTHORING-ES.md lists: every hint pattern, natural alternatives, short answers
  with their step, tú to staff, gender slips, unaccented spellings, Mexican and neutral words, and at least 3 Spain
  forms.
- Among them, at least 5 meaning-safety tests and 3 sentences that must not be understood.
- At least 4 sims that complete on 12/12 seeds.

**In the pull request, write for each conversation:** what it covers, the checks' output (with the corpus coverage),
any line you weren't sure about, any `// NEEDS:`, and how long it took. If you could not run a command, say so
plainly and don't claim it passes. Then stop: the lead reviews the batch before the next one.
