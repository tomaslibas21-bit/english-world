# Claude's check of Astra's PLAN.md (26 Nov 2026)

Verdict: **approved with the changes below.** The plan keeps the gates: $0, no new voices or pictures, no downloads,
no Worker or course-repo change, course data read-only, nothing exported or pushed, VOA design-only behind an off flag.

## Changes Claude makes to the plan
1. **Ports.** Dev servers 8700–8712 (Claude's). The private review servers are **8720 MH (EM), 8721 PC-EN (SME),
   8722 PC-LT (SM)**, not 8700–8702.
2. **The review server stays out of the game repo.** No tracked file names the owner's home folders. Sol writes
   `tools/review-books.py` and its allowlist into the worktree's git-excluded `.b8/review/` folder; Claude copies it to
   `~/claude-work/b8/b8-chatgpt/review/` and runs it. The game side only knows `VITE_BOOK_REVIEW=1` and a files root.
3. **Job grouping (budget).** Fewer, larger Sol jobs, each leaving the game working:
   - **J1** = M1 + M2: course adapter, cover lookup, shared talk player and progress store (pure, unit-tested).
   - **J2** = M3 + M6: HTML-path chapter streaming + the offline review source (so Claude can hear real chapters early).
   - **J3** = M7 + M8: talk bank in the set + the cover and chapter picker.
   - **J4** = M9: reader, listening settings, sleep.
   - Astra review round 1 (screenshots) → Sol fix round.
   - **J5** = M10: Conversation FM.
   - **J6** = M4 + M5: bounded iOS decoding + tempo. If it does not land, iOS shows the text with **Read the text** /
     **Open in course** and no in-game audio (never a standing media element).
   - **J7** = M11: library shell, room and furniture. **J8** = M12: chair + headphones.
   - Astra review round 2 → fixes. Then P1–P4 (PC port) on `radio-library/pc`.
4. **Words.** Sol drafts every string in `src/content/bookCopy.ts` (and PC's string files) from the ledger; Claude checks
   each line. Already fixed from the ledger:
   - PC library in Lithuanian: **Kolibrių uosto biblioteka** (the game's own name for the town is „Kolibrių uostas“,
     e.g. „Kolibrių uosto oro uostas“), not „Puerto Kolibrio biblioteka“.
   - MH library in Lithuanian: **Meipl Harboro viešoji biblioteka** (matches „Meipl Harboro oro uostas“).
   - Lithuanian UI grammar follows the game: a button or prompt that names an action uses the infinitive, like the
     game's „Vairuoti taksi“, „Rodyti tekstą“, „Įjungti mikrofoną“ (so „Rinktis knygą“, „Prisėsti paskaityti“,
     „Atsistoti“, „Atverti skaityklę“, „Atverti kurse“, „Leisti / Pristabdyti“); a sentence that talks to the learner
     says **tu** („Pabandyk dar kartą“ — the game's existing string — „Ieškome, kur sustojai…“).
5. **Defaults** as Astra proposes: paired (helper then target), target 0.75×, helper 1×, play next chapter on, sleep off.
6. **Library site** (house3 west of Union Station at (22, 54), and PC's matching cottage on Calle Hidalgo): accepted;
   Claude re-checks colliders, lamps and paths in the browser at J7.
