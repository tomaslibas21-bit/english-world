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

## Audit (5 Nov 2026)

A fresh reviewer's pass (AUDIT-BRIEF.md): both texts, the transcripts of seeds 3 and 7 read in full, about 60 probed
turns (`tools/probe.ts`), the cross and neutral leads, TOWN.md "Getting around", the office room (interiors.ts
`office`), s69, s87, s34 and p28b for the shared facts, and the English original on main.

**Found 20, fixed 20** (by point):

1. **Natural Spanish (4).** "¡Bueno! Ahí está cuando la necesites." came right before "¡Bueno! Tu primera tarea…" /
   "Bueno, ¡a la chamba!" every time the demo was declined: `fine_then` now opens "¡Sin problema!". Two lunch questions
   got "Entonces, ¿vienes?" twice in a row: `lunch_reask` has a second variant ("¿Qué dices? ¿Vienes?"; the engine never
   repeats a variant back to back). The day asked a second time said the clock again ("¡Ya son las seis!" after "¡Ya es
   hora de irnos!"): new `day_reask` ("Entonces, ¿qué tal tu primer día?"). "Hola, me llamo Ryan, ¿y tú?" before her
   welcome made her say her name twice in one turn: her name now comes only when the welcome hasn't just said it.
2. **tú/usted (0).** María is tú everywhere, the hints too; the global lines she can reach are switched (the stale
   g_bye NEEDS in the header is gone).
3. **Names (0).** María, Pablo (Línea Clara's colleague, s34, p28b) and la licenciada Salinas (HR, s87) agree with the
   cast; Doña Mari / Mariana is only a near-clash.
4. **Facts and the town (2).** `a_kitchen` "Está allá, al fondo." put the kitchen at the back; in the room it is the
   front east corner (cafetera, fridge and water cooler): "Está allá, en la esquina." `a_place_where` now names the
   corner the 3D town and s69 give (calle Ceiba, behind the bank, at the other end of Línea Clara's block): "Aquí en la
   esquina de Ceiba, a dos minutos." (the cross file's suggestion). Agree already: nine to six and casual Fridays (s87),
   free parking behind the building (s87), comida corrida about $100 cash (s69), la comida at two, an hour till three.
5. **Glosses and English (0).** The new lines' units, flags (the clitic "los") and American English checked.
6. **Spelling, ¿¡ (0).**
7. **Questions and offers (11).** The lunch questions were a plain intent, so a bare "¿Dónde está?", "¿Cuánto
   cuesta?", "¿A qué hora?", "¿Está lejos?", "¿Es caro?" or "¿Qué es eso?" at the name step, the desk, the tour or the
   day was answered about the cocina económica (or the chiles) before any lunch was named: they are `lunch_q_ctx` now,
   only at the invitation and her urging. "¿Qué es eso?" said the chiles even when they weren't named (the urge is now
   two lines, `lunch_insist` with the chiles and `lunch_urge`; "eso" is the last thing she named: the cocina económica,
   the comida corrida or the chiles). "¿A qué hora regresamos?" got "A las dos." (now "Tenemos una hora, de dos a
   tres."). "¿Cuánto cuesta el estacionamiento?" got "Sí, es gratis…" (now "Atrás del edificio. ¡Y es gratis!"). No
   answer for "¿Quiénes van?" / "¿Vamos todos juntos?" (new `a_lunch_who`), "¿Qué es una cocina económica?" (new
   `a_cocina`), "¿Para cuándo lo necesitas?" / "¿Es urgente?" (new intent `task_when`: "¡No hay prisa! Te lo mando por
   correo para cuando puedas."), "¿Quién es Pablo?" after his mug (new `a_pablo`). Offers: she urged after the hint's
   own polite no ("Gracias, pero traje mi comida") and after "No tengo hambre" (both reasons now: she urges only after a
   plain no); "No, gracias, no tomo café" to her offer to show the cafetera got two replies, "Ahorita no" / "Luego lo
   intento" a bare "¡Claro!" (now one "¡Sin problema! Ahí está cuando la necesites."); "¡Gracias por todo! ¡Nos vemos
   mañana!", "Gracias, igualmente" and "Adiós, que descanses" got two goodbyes (now one a turn, `byeBack`).
8. **Hints (0).**
9. **Accepted answers (3).** "Mi primer día fue muy bueno", "Fue un día muy bueno/largo", "Hoy fue un buen día"; "Soy
   Ryan, ¿y tú?" (meet) and "Ryan, ¿y tú?" (name); "No, por ahora es todo, gracias" (read as a bare no; same outcome).
10. **Neutral text (0).** The 13 twins say the same thing; "¡Anda, vente!" follows p28's twin of ándale; "mandé"
    (sent) needs none; the new and changed lines have no Mexican-only word.

**Spoken lines for the voice list:** changed `fine_then`, `a_kitchen`, `a_place_where`; new `lunch_reask[1]`,
`day_reask`, `a_lunch_who`, `a_cocina`, `a_pablo`; `lunch_urge` is the old `lunch_insist[1]` ("¡Ándale, vente!…", with
its neutral twin) under its own id, `lunch_insist` keeps only the chiles line. One speaker (María); no plural items.

**Tests:** corpus +30 (8 traps: the bare lunch questions outside the lunch, "Mi primer día no fue muy bueno", the
learner's "No hay prisa"), 13 NLU tests, 3 sims (a reason is never urged; who, what and until when with one goodbye;
Pablo, the deadline, the day asked again). Corpus 316/316 (was 294/294), 0/24 false accepts; held-out 39/40 (as before:
its one miss, "No, por ahora es todo, gracias", now reads as `no_more`), 0/3.

**Left as is:** "la de las paredes de vidrio" for the meeting room (the room has three glass rooms: the meeting room,
the team room and Elena's office of p28b; María points); the urge after a plain no (the writer's choice, "as Mexicans do",
50%); "¡Claro! Entras, le das clic…" after "No sé si puedo" (reads as encouragement). **English original:** the bare
lunch questions, the double goodbye, the repeated restrooms and clock, and the four unanswered questions are in
N/EN-FIXES-LEADS.md.

## Spain twins (11 Nov 2026)

- 44 Spain twins (lines and hints), 21 items in tests/es/spain/s88-first-day.json (all understood, 0 false accepts).
- Register: no change. María says tú (a coworker) in all three; no plural "you" to the learner here.
- Words: portátil (laptop), tu sitio, tarjeta de acceso (gafete / credencial), los de informática (sistemas), sala de
  reuniones con paredes de cristal, nevera (refrigerador), el armario (alacena), encima del fregadero, ordenador,
  haces clic en, ¿Qué archivo?, vaqueros, sobre las dos / sobre las seis, detrás del edificio, Ya está (Listo),
  el menú del día (comida corrida) a unos cien pesos, un sitio de comida casera, ¡Anda, vente! Es solo un ratito,
  ¡Chao!, ¡Hasta mañana!, ¡Vale!, ¡Qué bien! for ¡Qué bueno!
- Spain's present perfect for today: Se ha estropeado otra vez, Se ha atascado el papel, Ya te lo he mandado,
  ¿Qué tal te ha ido el primer día?, Es la que te he dado; the learner's Me ha ido muy bien, me he traído la comida.
- Kept: la cocina económica (a Mexican eatery), chiles rellenos, agua fresca; allá → allí only in María's directions.
- Grammar: q_desk takes portátil/ordenador; task_later ahora mismo; lunch_no me he traído (la comida); day_good
  ha ido / ha sido; see_you takes "Venga/Vale, hasta mañana". Merges for the new units.
- The two warnings (a_badge, a_badge_have neutral twins: the pronoun la glossed "it") were there before; the Spain
  twins carry a flag for it.

## Spain review (12 Nov 2026)

- Checked (fresh reviewer): every twin against its Mexican line (meaning, facts, prices, names), Peninsular wording, the perfect for today's events, tú/usted and vosotros by STYLE.md, glosses, spelling and ¿¡, the Spain transcripts (`--variety=spain --verbose`, untwinned lines read through their neutral fallback) and tests/es/spain.
- Found: menú del día (for comida corrida) and tarjeta de acceso (for gafete) are right for Spain; cocina económica stays (a Mexican place). "¡En la nevera! Solo ponle tu nombre." (solo + imperative).
- Fixed: "¡En la nevera! Solo tienes que ponerle tu nombre.".
