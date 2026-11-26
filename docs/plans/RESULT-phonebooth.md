# Maple Harbor · Union Station public phone

From Oak Avenue, enter Union Station and turn left. At the burgundy listening mark, use the handset to open the town directory. A new learner can call Lizzie about Friday or tell Mr. Harris they are running late, even with walking calls switched off.

Each call has four turns from its original situation. The contact speaks first. On a learner turn, the learner can say the reply privately, hear either coach’s model according to their profile, or advance in silence. The meaning, replay, retry and hang-up controls stay available as appropriate. Hiding the page pauses the call until the learner chooses Resume. The final card offers another practice and, on a configured course origin, the matching English Master mission.

The directory lists each person once, with their role, organization, authored places and available calls. Choosing an outstanding missed call opens the existing personal phone with that call’s callback button focused. Reading or practicing leaves appointments, missed calls and learning progress intact.

## Second-round art review

- **844 × 390, A++** — Mr. Harris’s ETA and its Lithuanian meaning scroll above two fixed control rows. Show/Hide meaning and Replay each measure 44 px high. The browser hit-tested all four corners of both buttons, played Replay with the meaning open, then advanced to the learner’s reply. [Landscape call](phonebooth/landscape.webp)
- **1280 × 800 doorway and 390 × 844 mark** — A cream receiver fills the upper half of the raised burgundy sign, above “Public Phone.” Both sides use the same 256 × 128 painted face with upright lettering. Brass trim and brackets are merged into the station mesh. [Entrance and listening mark](phonebooth/station.webp)
- **390 × 664, A++** — “Pakviesti draugę” shares a row with “Pradėti mokomąjį skambutį.” Lizzie’s personal-phone topics appear beneath them under “Tavo telefone.” The directory carries the sign’s burgundy and brass into the binding, with a cream paper gutter and ruled headings. [Lizzie’s directory page](phonebooth/directory.webp)

## Implementation

| Area | Files | What changed |
| --- | --- | --- |
| Station | `src/game/world/{interiors,stationPhone}.ts`, `src/game/{Game,camera}.ts`, `src/ui/Hud.tsx` | Open-front hood, chained book, cord and handset, 256 × 128 two-sided sign, collision and nearest interaction. At the listening mark, the portrait room camera keeps the receiver above the prompt. |
| Directory and dialogue | `src/content/{phoneBooth,phoneCalls}.ts` | Contact list from catalog metadata and authored roles and places. The selected script supplies fixed units, translations and the voices for its four turns. |
| Book and personal phone | `src/ui/{PhoneBooth.tsx,phoneBooth.css,Panels.tsx}`, `src/state/store.ts` | Lazy-loaded responsive book, touch, keyboard and controller navigation, exact missed-row handoff and focus restoration. |
| Sound | `src/game/audio.ts`, `src/radio/radio.ts` | One optional recorded clip at a time, cancellable iOS downloads, and a named radio hold from first turn through hang-up. Browsing is silent. |
| Tests | `tests/{phone,audio-buffer,radio}.test.ts`, `tests/browser/{phone-booth,phone-rings,gamepad}.mjs` | Authored lines and manifest keys, cancellations, radio ownership, station traversal, native callbacks and input coverage. |
| Learner copy | [WORDS-phonebooth.md](WORDS-phonebooth.md) | All new UI text, both scripts with natural Lithuanian help, audio keys for both coaches and listening status. |

## Verification

| Check | Result |
| --- | --- |
| TypeScript and production build | `npx tsc --noEmit` and `npx vite build` passed. Both production manifests have one JS entry and one CSS file at the home screen, and 21 statically required JS chunks on entering the game. The directory JavaScript and CSS load on demand. The browser saw neither practice script while browsing names. |
| Related Vitest suites | 181 passed in nine files covering phone, audio, Web Audio buffers, radio, radio spots, controller input, the meeting camera, sign fit and indoor jumping. |
| Full Vitest suite | All 1,699 tests passed across 122 files in one run with one worker and the repository’s original timeouts. |
| Fresh-save browser test | Walked from the station door to the listening mark, around the booth to Walter’s ticket counter and back outside. Exercised both calls, replay, failed recording and Retry, hidden-page Resume, rotation, both course routes, retained focus and ten start/hang-up cycles. The production build also completed the route without a course origin. The save still had empty situation, phrase and card records and no phone record. |
| Native phone browser test | A real missed support reminder and an incoming flood call survived rehearsal. With the flood call at the three-presentation cap, the handoff focused Lizzie’s exact row. Completing the native callback left only NetWave. S83 produced the café appointment and staged meeting. S90 produced the office objective and office arrival started S34. The existing browser harness accelerates scheduling and uses its native situation-completion hook. |
| Controls and layout | Chromium at 390 × 844, 390 × 664, 844 × 390 and 1280 × 800. Checked A++, reduced motion, touch, keyboard and sound off. The controller harness passed X, D-pad, A and B at 390 × 844 and 1280 × 800. |
| Voices | The eight fixed lines match all 12 speed-1 manifest keys, including both coaches. The browser exercised success with silent fixture audio and a 403 with Retry. The game checkout has metadata only. All eight lines are marked unheard in the copy ledger. |

## Station budget

Compared with `c7e844b2` at the same 390 × 844 low-preset station pose. The geometry count includes the room’s merged solids and both sign faces.

| Measurement | Base | With booth |
| --- | ---: | ---: |
| Room triangles | 2,226 | 2,726 (+500) |
| Room meshes | 12 | 13 (+1) |
| Visible draws | 21 | 22 (+1) |
| Added outdoor draws | — | 0 |
| Synchronized render p95, software Chromium | 40.5 ms | 46.2 ms (+5.7 ms) |

At 844 × 390, before and after ten calls, the renderer held 64 geometries and 23 textures and drew 29 calls from the same pose. Both snapshots had four document visibility listeners, three window page-hide listeners, zero radio holds, idle voice and zero pending playback requests. The player returned to the same coordinates. At that landscape pose, synchronized render p95 measured 55.2 ms before opening the book and 78.8 ms after the tenth return.

Timing samples used five warm-up frames and 40 measured draws with a WebGL pixel readback. The browser used SwiftShader at DPR 1. The functional browser harness throttled repeated software draws during manual simulation steps. Timing samples used direct renders.

## Screenshots

| Review | Frames |
| --- | --- |
| [Station approach and handset](phonebooth/station.webp) | Doorway, touch listening mark and annotated cream sign, receiver and cord. |
| [Directory at A++](phonebooth/directory.webp) | Index, Lizzie’s Friday practice and Walter’s in-person listing. |
| [Friday reply and recording recovery](phonebooth/practice.webp) | The same target line with and without its Lithuanian meaning, plus the readable failed turn. |
| [Landscape and desktop](phonebooth/landscape.webp) | Formal ETA with its helper and both 44 px utility controls, focus after hang-up, and the open book above the station shelf. |
| [Native callbacks](phonebooth/callbacks.webp) | Two missed rows, the remaining support row after returning Lizzie’s call and the next incoming walking call after leaving the booth. |
| [Live appointments](phonebooth/appointments.webp) | S83 café objective, Lizzie at the meeting and the S90 office objective. |

## Owner review

Audition all 12 takes on an authorized playback surface and have the EN/LT copy checked before shipping. Measure p95 on a physical phone at the same preset and pose against the 33 ms absolute and +2 ms incremental targets. The software renderer exceeded both thresholds. The Puerto Colibri port is deferred.
