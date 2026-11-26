# Maple Harbor backpack and field notebook

The Backpack opens from the town drawer or picture mode. The button keeps the due badge and matches the fabric chosen for the player’s pack. At the existing public bench east of the Visitor Center (−48, −17.5), the learner can sit beside the reader, open the notebook, and return to the same seat or standing position.

## Second-round art review

- **Friday card, 390×664 and 1280×800.** The source tab says **Pokalbis telefonu**, including for existing cards saved with the conversation title. The active desktop index row shows the target and source. The stored Lithuanian answer appears in the detail when the learner taps **Rodyti reikšmę**. [Phone meaning](backpack/390x664-meaning.png) · [Desktop spread](backpack/1280x800-notebook.png)
- **Review, 844×390.** A navy number and a tinted row mark the current card. After the first of four cards is marked **Kartoti dar kartą**, row two lights up and the counter reads **2/4 · 1 pakartojimas**. When the missed card returns, row one is active again and the counter reads **1/4 · Pakartojimas 1/1**. All four cards still have exactly one recorded grade after five turns. The browser check also exercised a second retry on the same card and verified a single stored grade. [First card](backpack/844x390-grading.png) · [Next card with a retry queued](backpack/844x390-next-card.png) · [Fifth turn](backpack/844x390-retry.png)
- **Drawer, 390×844.** The pack glyph grew from 22 to 35 pixels inside the 44-pixel button. The carry loop, curved flap, front pocket and brass clasp are visible at tool size. The due count sits at the lower right, clear of the flap. [Phone drawer](backpack/390x844-drawer.png)
- The book now has a stitched cloth spine and ribbon, brighter brass corner edges, a layered paper edge under the card, and a meaning tab that looks pressed when the translation is open. These details use CSS and the game’s vector icons.

## What the learner can do

- **Saved cards** opens first. Browse newest first, reveal the stored Lithuanian meaning, read the source sentence with a unique target match marked, or use the existing delete and export tools. A due round starts helper-first, accepts the first grade immediately and can repeat missed cards within its 20-card limit. Browsing leaves the schedule alone.
- **Practiced phrases** groups authored expressions by situation and shows their usage counts. Save one or save all through the game’s existing card store. An existing card keeps its source and progress. A configured course build also offers the learner’s own collection in a new tab.
- **Keepsakes** shows a pocket for each earned kind and lists the conversations that contributed it. Follow a source to the expressions practiced there, including its empty state. Repeated visits to the same café still produce one cup.
- **Listening** uses an exact manifest match for the saved speaker or, for an unidentified speaker, the learner’s coach. A saved unit can offer the whole recorded source sentence, including its authored spoken form. A failed request can be retried. Changing the selection or leaving the notebook releases playback.
- **Navigation** remembers the last leaf for the session. Back returns focus to the entry or the Backpack tool. The portrait page and landscape spread share the same review state through rotation.

## Where to look in the code

| Area | Files |
| --- | --- |
| Pack fabric, icon and entry points | `src/content/backpack.ts`, `src/game/characters/index.ts`, `src/ui/BackpackTool.tsx`, `src/ui/icons.tsx`, `src/ui/Hud.tsx`, `src/ui/LightHome.tsx`, `src/ui/Panels.tsx`, `src/ui/styles.css`, `src/ui/light.css` |
| Bench and seat prompt | `src/game/Game.ts`, `src/game/world/layout.ts`, `src/game/world/town.ts`, `src/state/store.ts` |
| Notebook pages, sources and course link | `src/ui/Notebook.tsx`, `src/ui/notebookData.ts`, `src/ui/notebook.css` |
| Card review, scheduling and explicit saves | `src/ui/Cards.tsx`, `src/ui/cards.css`, `src/ui/useReviewDay.ts`, `src/state/cards.ts`, `src/ui/kit/PhraseSave.tsx`, `src/ui/Conversation.tsx` |
| Recording lookup, retry and cancellation | `src/ui/notebookAudio.ts`, `src/ui/NotebookSound.tsx`, `src/game/audio.ts` |
| Regression coverage and editorial copy | `tests/notebook.test.ts`, `tests/browser/backpack.mjs`, the existing browser checks for the renamed tool, [WORDS-backpack.md](WORDS-backpack.md) |

## Verification

| Check | Result |
| --- | --- |
| TypeScript and production build | `npx tsc --noEmit` and `npx vite build` passed. |
| Focused Vitest | 131 tests across 9 files passed. Coverage included notebook, cards, keepsakes, audio, voices, gamepad input and characters. |
| Complete Vitest suite | All 1,700 tests passed across 123 files in one run (11 min 4 s). The cloud run used `npx vitest run --maxWorkers=2 --testTimeout=20000` to give the camera and voice-catalog checks enough time on this machine. |
| Input and layout | Chromium covered all four planned sizes, A++ text, reduced motion, touch, keyboard, simulated controller navigation and disconnect, and rotation after revealing an answer. |
| Storage and review | Verified empty, legacy and unknown-source cards, source counts, individual and bulk saves, denied storage, cross-tab deletion, 20-card cap, early exit, a single persisted grade on a repeated card, and the due-date change at midnight. |
| Media | Verified both Friday coach keys, an exact unit, source-sentence fallback, unavailable manifest, denied and blocked playback, retry and cancellation. Ten open/play/close cycles returned the audio state and observed listener counts to baseline. A silent fixture exercised the media and radio paths. |
| Course handoff | A course-configured build opened the same-origin `/korteles?mode=mine` on selection, restored focus on return, and mirrored only new saves. Opening the notebook made no course-deck writes. |
| Warm opening | With 500 cards and 1,000 practiced phrases, 20 warm picture-mode opens across two browser runs took **31.4–110.7 ms** from click to first card text in the DOM (median **50.8 ms**). Lists mounted 30 entries initially and another 30 on request. |
| Town rendering | In the first-round baseline capture at the same low-quality standing pose, the software renderer measured **300.0 ms p95** in the drawer (45–46 draw calls) and **216.6 ms p95** with the notebook (45 calls), over 60 frame intervals each. The notebook uses DOM and the bench reuses existing geometry. Physical-phone frame time remains unverified. |

## Screenshots

The standing learner is in front of the bench, facing the seated reader. On the right edge of that frame, the pack tool sits between the phone and settings with a brass due badge. The phone drawer shows the same pocket and flap, with the count at their lower right.

| View | Captures |
| --- | --- |
| 1280×800, visitor-center bench | [Standing learner and pack tool](backpack/1280x800-bench-standing.png) · [Seated learner](backpack/1280x800-bench.png) · [Open spread](backpack/1280x800-notebook.png) |
| 390×844, town drawer and Friday card | [Drawer and due badge](backpack/390x844-drawer.png) · [Exact-phrase speaker](backpack/390x844-friday.png) |
| 390×664, A++ collection pages | [One ticket with two sources](backpack/390x664-ticket.png) · [Before Save](backpack/390x664-phrase-before.png) · [After Save](backpack/390x664-phrase-saved.png) · [Friday meaning](backpack/390x664-meaning.png) · [Long card](backpack/390x664-long.png) |
| 390×664, A++ keyboard and review | [Focused reveal](backpack/390x664-review-front.png) · [Revealed answer](backpack/390x664-review-answer.png) · [Next prompt after first grade](backpack/390x664-after-grade.png) |
| 844×390, rotated review and audio recovery | [Grading controls](backpack/844x390-grading.png) · [Following card](backpack/844x390-next-card.png) · [Source-sentence speaker](backpack/844x390-source.png) · [Unavailable recording](backpack/844x390-offline.png) |

## Owner acceptance still open

- Profile on a physical phone at the same bench pose. The targets are p95 at or below 33 ms and at most 2 ms above baseline.
- Listen to the protected female and male Friday recordings in an authorized session. The manifest matched `5fb44353be01` and `e6086c3c84ee` at speed 1. The browser exercise used silence, so voice, pronunciation and recording quality still need a listening check.
- Open the exported game inside the signed-in English course and capture the live personal collection at 1280×800. The browser test verified the destination and focus with a local landing-page fixture.
- Have the human editor review the [English and Lithuanian copy](WORDS-backpack.md) before release. Puerto Colibrí is scheduled for a later port.
