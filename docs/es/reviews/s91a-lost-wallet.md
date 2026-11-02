# Review: s91a-lost-wallet ("¿Me puede ayudar?", Doña Mari at the tianguis), writer commit 505135d1

## Gate and blind set
| | Writer (505135d1) | After review |
|---|---|---|
| tsc / check-content | clean; 106/106 NLU, 11 sims 12/12, fuzz 80, 0/0 | clean; 123/123 NLU, 14 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus (coverage) | 198/198 (100%), 0/36 false accepts | 206/206 (100%), 0/39 (11 review items added) |
| blind set (41 items, 4 safety traps + 3 `not:` traps) | 31/41 (76%) with my intent names; 39/41 (95%) once the draft's `_ctx` twins count (when_ctx, describe_ctx, police_*_ctx, its_mine_ctx); 0 traps accepted | 41/41 (100%), 0 traps (not blind any more for me) |

The two blind misses were "Bueno, voy a regresar al café a preguntar" and "Las tarjetas sí, pero el dinero no". The probes (rule 22) found the real problems.

## Fixes (102 lines added, 27 changed or removed in the conversation; about 55 must-fix, 25 polish, 40 tests and sims)
**meaning-safety (must-fix, ~30 lines)**
- "No sé, ¿está todo?" at "¿Está todo adentro?" was read as some_missing, so the wallet was recorded as partly emptied and the learner was sent to the police. It's now unsure_all_ctx ("Revise con calma").
- "No falta el dinero" (commas are lost, rule 10) recorded the money as gone. A single "no" now gets "Perdón, ¿sí le falta algo?" (pending `missing_really`: "Sí, el dinero" → missing; "No, está todo" / "No falta el dinero" again → all there). "No, no falta el dinero" is all there.
- "La mía es negra" at "¿Es suya?", with no "no", recorded found = "no" (the boy's wallet vanished). It may be a yes, so she says "Fíjese bien. ¿Es suya?". "No, la mía es negra" stays a no.
- "La policía está junto al banco, ¿verdad?" got "Ah, muy bien" (wrong place confirmed). A place other than the museum now gets "No, está junto al museo, aquí enfrente."
- "Es una emergencia" was in call911, so she answered "No, el 911 es solo para emergencias" (it contradicted the learner). Removed.

**understanding (must-fix, ~12 lines)**: "Ay, espere… ya la encontré, estaba en mi mochila" (at the pockets question); "A lo mejor la dejé en mi casa"; "voy a regresar al café a preguntar" ("al" + place + "a preguntar"); "Las tarjetas sí, pero el dinero no" (and the reverse); "¿Puedo verla?" (the "ver[la | lo]" pattern never matched "verla"); "¿Está abierta los sábados?".

**spanish / rule 11 / rule 8 (must-fix 4, polish 4; ~20 lines)**
- "¿Qué hago con mis tarjetas?" got "Sí, yo de una vez llamaría…". The line no longer starts with "Sí".
- "¿Cuánto cuestan las rosas?" got "Están baratas, ahorita le digo" (no price, never told). It's now "El ramo está en $150" (a market bunch; within STYLE ranges). "Me da unas rosas" also hears the price instead of only "¡Claro que sí!" (rule 3).
- Left at home: "Primero regrese y pregunte. Si no aparece, vaya a la policía." came right before "Y si no aparece, vaya a la Policía Municipal." The first line is gone.
- "No sé" then "No me acuerdo" at "¿Dónde la vio…?" repeated "Piense un momento…". The second time she now goes on without a place.
- Polish: "junto al museo" in two lines in a row ("Nada más cruce la calle y ahí está"); "A ver, cálmese" + "A ver, vamos a pensar" → "¡Ay, no! Cálmese."; "Ándele" after "Ya busqué por todos lados" → "Ah, bueno." / "Está bien."; no "maybe it's still in the same place" when no place is known.

**gloss-english**: I read every line (about a third closely): the units, flags (indices checked), American English and the six Mexican twins are right. New lines are glossed the same way. No merges needed.
**numbers / twins / facts**: The police is next to the museum, across from the zócalo, as in s62. 911 is for emergencies only (kept vague). Six Mexican-only words, each with its twin (fine). Opening hours and English at the police stay vague, as the writer chose; I agree.
**structure**: The same id, steps, intents and found_it twist as the English. The writer's additions (#amb asks, short reminders, the 4th-ask directions) are good.
**tests**: 17 NLU tests (flips, rule-19 "¿Usted la encontró?" ≠ "la encontré", "No la encontré"), 3 sims (comma-less "No falta el dinero"; a color then a yes; the police "junto al banco"), 11 corpus items, and the blind set `tests/es/heldout/s91a-lost-wallet.json`.

## For the lead
- The writer's // NEEDS stands: g_dontknow lacks "No me acuerdo" / "No recuerdo".
- "No, está todo" at "¿Está todo adentro?" (first ask) still reads as "No está todo" (missing). That's the likelier voice reading; the contradictory comma reading is rare.
- $150 for a bunch of flowers is my estimate of a market price.
