# Rules for cloud build jobs (26 Nov 2026)

- Game: english-world. Maple Harbor (MH) = American English for Lithuanian learners. This branch = the owner's review build.
- Build ONLY the plan named in your task, on your own new branch. Keep every existing test green.
  - Run `npx tsc --noEmit`, the related vitest files, and the full `npx vitest run` once at the end.
- Learner words:
  - American English, warm teacher voice, nothing legal or stiff.
  - Lithuanian UI text addresses the learner with "tu". Characters speaking politely to one person use capital Jūs/Jus/Jums/Jūsų.
  - List every new learner-facing string (EN + LT) in `docs/plans/WORDS-<plan>.md`. A human editor checks them before anything ships.
- No new paid media: no new voices, pictures or music.
  - Reuse existing voiced lines (manifest `public/audio-v2/manifest.json`, `audioKey` in `src/audio-key.ts`). Otherwise leave text-only, with a TODO in the WORDS file.
- No downloads beyond the lockfile. No changes to `.claude/launch.json`.
- Performance: phones matter. Keep draw calls low and merge static meshes as the town already does. Respect reduced motion. The controller and keyboard must reach everything.
- At the end, write `docs/plans/RESULT-<plan>.md`: what was built, the files, the test numbers, what is left.
