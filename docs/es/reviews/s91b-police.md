# Review: s91b-police ("Quiero levantar una denuncia"), writer's commit dc8dfebf

| Check | Writer | After review |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content | 121/121 NLU, 12 sims 12/12, fuzz 80, 0/0 | 138/138 NLU, 14 sims 12/12, fuzz 80, 0/0 |
| corpus | 345/345, 0/28 false accepts | 361/361 (+16 review items), 0/28 |
| blind set (45 items, written before reading) | 40/43 = 93%, traps 0/2, all 13 `not` traps safe | 43/43 = 100%, 0/2 |

The blind misses were "No sé, a lo mejor se me cayó", "Un señor se me acercó y me empujó, y luego ya no la tenía" and "Todavía no he llamado al banco". The after score isn't blind. The probes (tools/probe.ts, 30 whole conversations) found more than the blind set did.

## Fixes (158 lines changed or added, 52 removed; about 70 must-fix, 25 polish, 60 tests)

**meaning-safety: must-fix (~30 lines)**
- "No, solo una pregunta" at "¿Algo más?" read "una" as a price and set the cash to $1, overwriting $1,000. Fixed in three ways: one_question_ctx takes it (rule 21), contents/no_cash are ignored once the report is done, and a count under 10 pesos with no "pesos" isn't cash. That last rule also fixes "Tenía dos tarjetas" (it recorded $2 cash).
- "Sí, en el hotel" at "¿Trae alguna identificación?" moved the theft to the hotel. where_when now records a place or time only at the report's early steps, and "en el hotel" at the ID question is no ID (no_id_ctx).
- "Es de cuero café" at the where step recorded the café as the place. A bare café next to a description is now the color.
- "Mi pasaporte no, lo dejé en el hotel" got both "Perfecto, gracias" and "Claro, no se preocupe". It is now one no_id pattern, and when both are heard in one turn the no wins.
- "No falta el dinero" (the hint "No, falta el dinero" said aloud) always counted as missing (rule 10). Without a typed comma he now asks "Perdón, ¿falta algo o está todo?". The hint is now "Falta el dinero."
- "Creo que se me cayó" after "Me robaron…" stayed stolen. It now records lost unless a push or grab is also said.
**understanding (~25 lines)**
- "No sé" at a step now gets help and the next question; before, he said "Ya veo." and then nothing.
- Added: "No sé si me la robaron o la perdí", two actions in one sentence, "No estaba en X, estaba en Y", "No tenía tarjetas, solo efectivo", purse and backpack contents (ropa, lentes, computadora, cámara, celular; a stolen phone in the bag asks for another number), "No, no tengo otro", "¿Puedo verla?", "Las tarjetas sí, pero el dinero no", "¿Y si no firmo?", "Un momento, lo voy a leer", "¿Es gratis el reporte?", "¿Por qué no puedo levantarla aquí?", "¿Puedo ir mañana?".
- At "¿Algo más?", the follow-ups about the Ministerio Público ("¿Dónde queda?") also open after the copy_mp line or a question about it. The pending question is rebuilt at each re-ask.
**spanish / facts / structure (~20 lines)**
- A copy asked for mid-report was handed over before the report existed. Now he says "Claro, al terminar el reporte le doy una copia" and gives it with the folio (rule 13).
- "Le anoto la dirección en su copia" when no copy had been given → "Le anoto la dirección." "Con el folio puede…" before the folio → "con él".
- "¿A qué hora cierran?" got "Mejor hoy mismo" (rule 11). It now gets "No sé el horario exacto. Mejor vaya hoy mismo." (hours kept vague, rule 14).
- After "Está bien" alone he said "De nada"; now only a thanks gets it. "Voy para allá, gracias" now closes the conversation.
- Police station: "on the zócalo" → "across from the zócalo next to the museum" (s62's directions).
- A second "¿Qué le robaron?" gets a short reminder instead of repeating the line (rule 8).
**gloss-english (~4 lines):** "a black small wallet" → the echo is now color + material, or color alone. Three flags pointed past the line or at the wrong unit (copy_mp 13→12, mp_send 15→14, ask_phone_other 6→5: rule 15).
**tests:** 17 NLU tests, 2 sims (the lost comma at check_all; out-of-turn answers plus an early copy), 16 corpus items. Two corpus items were updated to the safer behavior: "No sé" → dont_remember; "No traía efectivo, solo mis tarjetas" → contents with the cash dropped, which a sim checks.
**Kept:** the structure matches the English original: the same steps and intents, both twists, and the added "ministerio" twist from the brief. Usted is consistent. The one Mexican-only word, pluma, has a twin. The remaining glosses I checked were right.

## For the lead / owner
- The writer's open questions stand: whether the report is free ("El reporte es gratis"), the patrol line, and how Mexicans read the folio 4471 aloud. The folio is said digit by digit; pairs ("cuarenta y cuatro, setenta y uno") may be more natural. The owner could pick one.
- A phone number said out of turn at an early step ("984 123 4567" at "¿Dónde pasó?") still parses as cash or a time. This is unlikely, so I left it.
