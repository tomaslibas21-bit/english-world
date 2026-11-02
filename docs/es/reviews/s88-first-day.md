# Review: s88-first-day ("¿Dónde está la cafetera?"), writer's commit bac5ba8d

## Gate and blind set, before and after

| Check | Before (bac5ba8d) | After |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 97/97 NLU, 9 sims 12/12, fuzz 80, 0/0 | 120/120 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 278/278, 0/16 false accepts | 294/294 (16 review items added), 0/16 |
| blind set (`tests/es/heldout`, 40 items, 9 traps, written first) | **33/40 = 82.5%**, 0/3 false accepts | 39/40 = 97.5% (not blind any more), 0/3 |

The one blind miss left: "No, por ahora es todo, gracias" at the tour reads as a plain no (it ends the tour, as `no_more` would). The writer's claims held. Still, probes (`tools/probe.ts`, about 120 turns) found five meaning flips that none of the tests could catch.
## Fixes (src: 55 lines changed, 181 added; ~70 must-fix, ~35 polish, ~75 tests and sims)

**meaning-safety, must-fix (~30 lines)**
- Lunch booked on a no: "Gracias por invitarme/por la invitación, pero traje mi comida / hoy no puedo", "Me gustaría ir otro día", "No, pero gracias por invitarme" all set `lunch=true` ("¡Qué bien! Salimos a las dos"). The reason: a lunch_yes piece ran first. Now `LUNCH_NOT` turns such a turn into a no, and each turn gives one lunch answer (the old code could also add "¡Claro!" after "¡No pasa nada!").
- "¡En serio! ¡Me encantan!" after "¿No te animas?" was a no: bare "de verdad / en serio" was in `lunch_no`. It now needs a no next to it. A bare "De verdad" stays a no, but only inside the insist question (`insist_no_ctx`).
- "No sé si puedo" was understood as "Claro, yo lo hago" (it split into `g_dontknow` + `task_ok` on "si puedo"). It is now `task_cant`, guarded by `TASK_NOT`. "¿Y si no puedo?" now gets the demo.
- "Soy Ryan, no es mi primer día" was welcomed as a new colleague. The name no longer counts as a yes when the turn says "not new" (`NOT_NEW`).
- "¿Y cómo entro mañana?" (badge twist) read as "¿Cómo estás?" + first_day. It is now `q_badge`.

**understanding, must-fix for common forms (~45 pattern lines)**
- Lunch no: "No puedo, tengo una junta a las dos", "Gracias, pero hoy traje mi comida", "No, es que estoy a dieta", "Ya tengo planes", "Ya comí", "Todavía no tengo hambre", "Sí, pero no hoy", "Hoy no, pero mañana me encantaría".
- Lunch yes: "Sí, ¿a qué hora?" now answers the time and books the lunch. Before, the yes was dropped and she asked again; now the reply skips "a las dos" a second time. Also new: "Sí, pero llego tarde / los alcanzo".
- Lunch questions: answered per piece by tag. "¿Está lejos? ¿Cuánto cuesta?" now gets both answers and then one "¿vienes?". Before, a regex on the whole turn gave the first answer only. Questions no longer use up her three asks. Added "¿Qué son los chiles rellenos?".
- Tour: a bare "Sí" to "¿Alguna pregunta?" ended the tour. It now gets "¡Claro! Dime." once, as in the English.
- Coffee: "Sí, ¿cómo funciona?" gave the demo twice in a row; it is now said once. New forms: "No, gracias, ya sé" (`know_ctx`), "¿Hay té? / café soluble?" (new `a_tea`, short after the twist), "Ahorita no, más tarde", "Qué lástima".
- Task: "Lo hago después / Ahorita no puedo" (`task_later`: she emails the file), "¿Qué archivo?". Desk: "Olvidé mi contraseña" (accented past), "No tengo contraseña". Printer: "¿Cómo se saca el papel?".
- Day: "Bien, gracias, ¿y a ti?" was taken by the global how-are-you and she asked again; she now answers ("¡Muy bien también!"). New forms: "No estuvo nada mal", "Ni bien ni mal", "…, aunque estoy cansado". Name step: "Me llamo Ryan, ¿y tú?".

**spanish / register (polish, 3 lines)**: "Adiós" before the closing got the shared "¡Que le vaya bien!", which is usted, from tú María. A local `g_bye` now uses her tú lines.
**gloss-english (polish, 5 lines)**: "aquí" was glossed "right" in three lines; now "here". The `l_brought` hint's English said "today", which the Spanish lacks. The q_meeting hint now has a neutral twin and a flag.

**twins / facts / numbers / structure**: no new Mexican-only words ("Sí, ¿verdad?" over "¡Ni modo!"); facts agree with s69 (comida corrida "como cien pesos"); steps, intents and twists match the English. Unchanged.
**tests**: 23 NLU tests (the blind traps and the probe flips) and 3 sims (thanks-but-no + not sure + later; another day + bare "Sí" at the tour; yes-with-a-question + two lunch questions). The 16 corpus items are listed above.

## For the lead / owner
- NEEDS (shared, not touched): `global.ts` g_bye's "¡Hasta luego! ¡Que le vaya bien!" wants `{u:le|t:te}` for every informal NPC. The writer's NEEDS stand.
- The writer's "unsure" list stands: made-up office hours, Pablo and Licenciada Salinas from the cast, the half-time "¿No te animas?" urging.
- Engine: a one-word slip still reads "Claro, yo lo hago" as "lo hice" at the coffee question (harmless: "¡Ah, qué bien!").
