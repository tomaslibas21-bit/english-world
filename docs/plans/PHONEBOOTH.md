# Public phone · A town directory you can practice with

At the station, lift the receiver, open the printed directory and try the first four turns of a call. Ask Lizzie or Andrea about Friday. Call Mr. Harris or Ingeniero Montes and explain that you're running late. You can hear either side again or hang up halfway through. The real concert invitation and the office meeting remain yours to arrange on the walking phone.

**Scope.** MH uses `glow8/mh` and EM (`~/fluent-steps`). PC uses the read-only `~/claude-work/review2-pc` reference and the SME / SM courses (`~/spanish-master-english`, `~/spanish-master`). Future work belongs in the game implementation trees. $0. Use the edition's existing voices, room materials and UI fonts. No downloads, paid media or course edits. Any new access rule or Worker change **needs the owner**.

## Find the receiver

Both `src/game/world/layout.ts` files put `station` at (45, 57), 34 × 16 m, facing north. The door is **(45, 49)**, approach **(45, 46.8)**. Both `town.ts::buildBuilding` station branches put the clock above a 12 m canopy. In MH enter **Union Station** from Oak Avenue. In PC enter the **Terminal de Autobuses** from calle Hidalgo between the platform canopies. PC's `theme.ts::busTerminal` and `src/game/world/mexican.ts::busTerminalFront` put the Cancún and Tulum coaches outside. Put the booth inside, where both approaches stay clear.

In the 26 × 18 m waiting room, turn left as you enter and look back toward the door. Set a proposed 1.25 m-wide open-front booth at **room (−5.2, 8.15)**, facing north, with the listening mark at **(−5.2, 6.65)**. The entrance/exit is on the south wall at (0, 8.8), newsstand at (−11, 6.2), nearest bench at (−5, 4), ticket counter at (−6, −6). In PC the shoeshine chair is at (−11, 1.6), ATM on the west wall and route 7 bus on the east. See both `src/game/world/{interiors,roomPeople}.ts`, especially PC `terminalMx` and `terminalAtm`. Mount a small two-sided receiver sign above the hood so you can see it from the door. Leave ≥1.5 m of continuous passage to the benches and exit. Check the mark with the actual follow camera before fixing the collider.

MH gets a burgundy enamel hood, brushed aluminum shelf and a cream directory on a short chain. PC gets a turquoise hood, ivory enamel number plate and a deep blue directory. A dark C-shaped handset and one thick cord should read at 390 px. Build them from the room's merged shapes. Make the listening mark accessible without opening a door, handling coins or tapping tiny number keys.

## What the two phones do

| Existing behavior | Booth decision |
|---|---|
| `src/content/phoneCalls.ts::PHONE_CALLS`, PC `src/editions/es/content/phoneCalls.ts`, `src/game/phone/{Phone,schedule}.ts`, `src/ui/PhoneRing.tsx`. The seven scheduled entries include dental, support, invitation, late-for-work and complaint reminders, the incoming team video call and incoming flood call. Presentation depends on route progress, calm, activity and settings. | The booth has a fixed address and opens on explicit interaction. The first two practice exchanges are available on a new save. No incoming card, dial timer or invented number is needed. Let a pending live ring finish before admitting a new booth session. |
| `src/ui/Panels.tsx::Phone` already shows texts, missed calls with callback, and callable situations from `ROUTE.filter(isPhone)`. The HUD P button opens this phone. `Game.call` launches a real situation. | The printed directory groups people by name with role, source place where known and available practice. In the selected contact's detail, a genuinely outstanding missed item can offer **Open on my phone**. Hang up first, open the existing phone and focus that exact missed row. The learner then chooses its existing Call back action. |
| `src/state/progress.ts::PhoneProgress` stores played time, last presentation, `missed[id].{presentations,retryAt}`, `invitation`, `office` and `followUp`. The scheduler caps automatic presentations at three. `src/game/session.ts::onCompleted` clears the matching missed item on normal completion. | Reading or practicing leaves those fields alone. A manual native callback can still happen after the automatic retry cap. Never manufacture a missed item for a reminder or an unseen contact. Keep the existing phone setting for spontaneous walking calls. A manual visit to the booth works with that setting off. |
| Finishing `s83-invite-call` can save the selected meeting place/time. `src/content/phoneMeeting.ts`, `src/game/phone/{meeting,meetingScene}.ts` and `Game.updatePhoneTasks` stage Lizzie at the actual meeting spot. PC uses its Andrea lines and place map, e.g. kiosco → town square. Finishing `s90-running-late` sets the office objective and arrival leads to `s34-meeting`. | Practice owns a local turn index. It never instantiates a live conversation session, calls `onCompleted`, deletes an invitation or enters the office. Keep the four `phone_meet_*` lines for the in-person meeting. The booth uses the telephone lines from the two actual situations. |

**Directory.** Build rows from the active situation catalog, `src/content/npcs.ts`, `src/content/locations.ts` and their PC counterparts. Deduplicate people by ID. Use the appropriate contact/organization for each call. For example, the shared `lizzie` ID displays Lizzie or Andrea. Andrea can have both an invitation and a flood scenario on the personal phone. Resolve role and available authored place using the active helper layer. List the verified places where a person can be found. A remote-only caller gets a role and organization where known. Keep video labeled on the personal phone. People with an in-person role but no authored practice get a readable directory entry. Show the two playable contacts first and a name-sorted list below. Moving between names is silent.

**Flow.** Nearest prompt → directory → contact → **Start practice call**. First the contact speaks. Then the helper-language prompt invites you to try the reply aloud, privately. Tap **Hear model reply** to hear the existing learner/coach recording, or **Next turn** to advance silently. Replay the current turn any number of times. Show who speaks and the target line, with its natural helper on request. At the end offer Practice again, Open in the course and Hang up. No listening permission, recording, grade or progress award. Browsing the directory has no effect on the radio. Give a practice call its own named hold in `src/radio/radio.ts` so the radio stays quiet between turns. Release on hang-up through the existing hold set, honoring user pause and other audio owners.

## The first two calls have recorded parts

The MH scripts are `src/content/situations/{s83-invite-call,s90-running-late}.ts`. The PC target scripts live under `src/editions/es/content/situations/`, with Lithuanian help in `src/editions/es-lt/tables/<sitId>.json`. Select each indicated template and fixed variant from the lazy-loaded situation, including its units and natural translation. Prefer a reference to the authored hint group/item and variant over a fresh copy of dialogue.

| Turn order | American English · MH | Mexican Spanish · PC |
|---|---|---|
| Friday invitation · 1 contact, `hello_q[0]` | Lizzie · “Hello?” | Andrea · “¿Bueno?” |
| 2 learner, `free_q` | “Are you free on Friday?” | “¿Estás libre el viernes?” |
| 3 contact, `free_yes[0]` | “I think so. Why?” | “Creo que sí. ¿Por qué?” |
| 4 learner, fixed `inv_tickets` | “I've got two tickets for a concert.” | “Tengo dos boletos para un concierto.” |
| Running late · 1 contact, `hello[0]` | Mr. Harris · “Hello, this is Harris.” | Ingeniero Montes · “¿Bueno? Buenos días.” |
| 2 learner, first `running_late` | “I'm running late.” | “Voy tarde.” |
| 3 contact, `ask_eta[0]` | “When do you think you'll get here?” | “¿Como a qué hora llega?” |
| 4 learner, `eta_halfhour` | “In about half an hour.” | “En media hora, más o menos.” |

**Manifest proof.** These are exact speed-1 keys from `src/audio-key.ts` checked in MH `public/audio-v2/manifest.json` and PC `public/audio-es/manifest.json`. Each column follows the four turns above. A pair gives female/male coach versions. Both PC helper layers use the same Mexican target recording.

| Call | MH keys | PC keys |
|---|---|---|
| Friday | `8414938a6ee1` · `5fb44353be01/e6086c3c84ee` · `4a39bf19d87f` · `008f0031cc52/6a5b1b12a38b` | `b30688932f25` · `5642f36306d3/a48b409a5aba` · `53c7f9188e1b` · `71bfcc408e41/5ecbb3b151eb` |
| Late | `d3be99fe43d4` · `2b740a4fab29/bfd047e02215` · `933dcda8650b` · `af14a40186fe/c627968cb959` | `38f1d3b015fa` · `4d8a1180bc3f/bdf12ae5c67a` · `6b6cb0594d5c` · `d8dfe3939af8/141a6508eedf` |

Resolve NPC and coach identity via the edition's `content/voices.ts`. For PC build these practice rows with an explicit Mexican variant and `es_` voices as a pair, even when the personal phone is set to neutral or Spain. Keep that personal preference on return. Resolve helper and formality from the situation, using tú with Andrea and usted in the formal exchange. In SM the Friday question reads “Ar esi laisva penktadienį?” The MH boss asks politely, “Kada, Jūsų manymu, atvyksite?”

Use `src/game/audio.ts::play` with `recordingOnly: true`, `optional: true`, a cancel signal and visible failure handling. These options return control to the booth if a take fails. The manifests identify the MP3s. Both local manifest directories contain metadata only. Check a resident matching master or already authorized playback surface during future device review. Label any unheard line. After a missing manifest, 403/404 or interruption, leave the turn readable with Retry and Next. A superseded request, page hide or hang-up cannot advance or sound a late line. Return from a hidden tab paused with explicit Resume. No synthesis fallback or generated operator greeting.

**Course.** The two companion mission routes are EM `/situacijos/S83` and `/situacijos/S90`, SME `/situations/SS22` and `/situations/SS29`, SM `/situacijos/SS22` and `/situacijos/SS29`. See each course's `src/lib/course/missions.ts`. On a configured course origin offer the link on the final card, with the mission title. Hang up and preserve the directory selection when opening the course. A standalone directory can work entirely from game text.

## Directory on four screens

| Viewport | Composition |
|---|---|
| 390×844 | One-column address book. Select a contact for a separate page with role, practice title and one primary action. During the call, stack caller, line and two reply controls. Hang up stays visible. |
| 390×664 | Short identity header, 44 px controls and one scrollable dialogue area. A++ text may wrap. Pin Hang up and Next above the safe area. Collapse the ornamental handset before reducing type. |
| 844×390 | Directory index on the left, contact or active turn on the right. Let long helper lines scroll independently of the bottom controls. Rotation preserves turn, selection and paused state. |
| 1280×800 | An open directory on the station shelf, maximum width 860 px. Use the left page for names and the right for details. During practice give the selected contact and line the space of the right page. Leave enough of the room visible to recognize the booth. |

Use tap/E/pad X at the world prompt. Move through a scoped list with D-pad/stick, A/Enter to activate, B/Esc to hang up or return one level. After hang-up focus the same contact. On close restore the world prompt, camera and input. Block walking and the native ring/text presentation while the booth owns a panel or mode. If a live ring already owns focus, its Answer/Dismiss controls keep it. Use an actual dialog name, speaker/turn labels, visible focus and a single polite status update per turn. Reduced motion cuts directly to the open book, with a static receiver, no waveform animation or page flip. Audio remains user-controlled.

**Incremental phone budget.** One merged station prop, ≤650 triangles, ≤2 additional room draws, one ≤256 × 128 sign face and zero added outdoor draws. No extra NPC rigs, camera feeds, transparent booth walls or per-frame picking. Load only the selected situation and active helper table on demand, with zero new boot requests. One audio output, one in-flight practice clip, no directory-wide audio prefetch. On a physical phone at the same preset/pose aim for p95 ≤33 ms and ≤2 ms over baseline. After ten start/hang-up cycles, compare renderer counts and live voice/hold/listener counts with the station at rest.

## Copy ledger

Use EN/LT in MH, ES/EN in SME and ES/LT in SM. The physical sign carries the target language. New Lithuanian actions are infinitives and direct learner guidance uses tu. Source dialogue supplies the personal names, titles, register and authored translations.

| Where | EN · US | LT | ES · MX |
|---|---|---|---|
| Sign / world action | Public Phone / Use public phone | Viešasis telefonas / Naudotis viešuoju telefonu | Teléfono público / Usar el teléfono público |
| Directory | Town directory / Practice calls / People in town | Miesto telefonų knyga / Mokomieji skambučiai / Miesto žmonės | Directorio del pueblo / Llamadas de práctica / Gente del pueblo |
| Contact without practice | Found in town / No practice call available | Galima sutikti mieste / Mokomojo skambučio nėra | En el pueblo / No hay llamada de práctica disponible |
| Topics | Invite a friend / Call about being late | Pakviesti draugę / Pranešti apie vėlavimą | Invitar a una amiga / Avisar que vas a llegar tarde |
| Start / native handoff | Start practice call / Open on my phone | Pradėti mokomąjį skambutį / Atverti savo telefone | Iniciar una llamada de práctica / Abrir en mi celular |
| Learner turn | Your turn / Try saying it aloud. | Tavo eilė / Pabandyk pasakyti garsiai. | Tu turno / Intenta decirlo en voz alta. |
| Model / navigation | Hear model reply / Replay line / Next turn | Klausytis atsakymo pavyzdžio / Dar kartą klausytis eilutės / Pereiti prie kitos replikos | Escuchar la respuesta de ejemplo / Volver a escuchar la frase / Pasar al siguiente turno |
| Helper | Show meaning / Hide meaning | Rodyti reikšmę / Slėpti reikšmę | Mostrar el significado / Ocultar el significado |
| Final card | Practice complete / Practice again / Open in the course | Praktika baigta / Kartoti skambutį / Atverti kurse | Práctica terminada / Volver a practicar / Abrir en el curso |
| Recovery | Audio unavailable / Try again / Resume | Garso įrašas nepasiekiamas / Bandyti dar kartą / Tęsti | Audio no disponible / Volver a intentar / Continuar |
| Leave | Hang up / Back to directory / Close | Padėti ragelį / Grįžti į telefonų knygą / Uždaryti | Colgar / Volver al directorio / Cerrar |

## Owner choices and build jobs

Approve the station booth, two four-turn practice calls and the distinction between rehearsing and calling someone back. The proposed booth has no score, coin requirement or new appointment. The directory can list more people immediately. Each additional **voiced** practice exchange needs a coherent set of existing recordings and a review of both learner layers.

| Job and estimate | Acceptance check | Screenshot for Claude |
|---|---|---|
| P1 · Sol · 3 h · MH booth | Register the station-only prompt. Walk from Oak Avenue to the phone, around the booth to the ticket counter and out. Check collider, sightline and same-mark return. | 1280×800 station doorway and 390×844 booth mark with the handset visible. |
| P2 · Sol · 3 h · Directory | Group catalog people, label businesses and roles, keep one Lizzie row with distinct scenarios. Fresh profiles can use both practice calls and look up the other contacts. Browsing is silent. | 390×664 A++ directory, friend detail and an in-person-only contact. |
| P3 · Sol · 4 h · Two MH exchanges | Check all MH manifest keys, both coach voices and spoken punctuation. Play, replay, manually advance, cancel pending load, hide mid-line and retry. Practice changes no situation, phone, phrase or card record. | Friday reply at 390×844 and the late-call ETA with helper and Hang up at 844×390. |
| P4 · Sol · 3 h · Native handoff | Extend the `tests/phone.test.ts` and `tests/browser/phone-rings.mjs` scenarios. Start with a missed reminder and a real incoming flood call. Browsing and rehearsal preserve both rows. Native callback clears only its own completed row. Play live s83 through the meeting and s90 through office arrival, test walking calls off and a ring already onscreen. | Native missed row before/after handoff, s83 appointment and s90 office objective at 390×844. |
| P5 · Sol · 4 h · PC room, language and links | Check PC bench lane, shoeshine and route 7. Verify the Mexican text/voice pair with the personal setting at neutral, SM helper table, friend/usted register and both mission routes. Compare manifests with the table above. | PC station at 1280×800, identical Friday turn in SME/SM and formal ETA at 390×664. |
| P6 · Sol · 4 h · Devices and regressions | Use MH, `tests/es/phone.test.ts`, `tests/es-lt/phone.test.ts` and existing pad harness. Test all four sizes, A++, reduced motion, keyboard, controller, sound off, denied clip and foreground-radio recovery. After ten returns record p95 and resources. Distinguish fixtures from actual audible phone playback. | Four-size contact sheet across all three profiles, with failure, restored contact focus and receiving a subsequent walking call. |
| P7 · Astra · 1 h · Art and dialogue review | Read the booth sign from the entrance, follow both conversations without sound, and check the formal/familiar translations against the edition scripts. | Annotated handset silhouette and matched EN/LT helper frames of the same Spanish line. |

**Estimated total of 22 build/review hours** (21 Sol + 1 Astra). At Sol 1× and Astra ≈5×, allow **≈26 Sol-hour equivalents**. Geometry, runtime, listening and screenshots are future acceptance checks.
