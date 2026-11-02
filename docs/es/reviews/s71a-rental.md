# Review: s71a-rental (Andrés, Renta de Autos Colibrí), writer's commit a3f5ffe2

## Gate and blind set
| | Writer (a3f5ffe2) | After the review |
|---|---|---|
| tsc / vitest | clean / 257 of 257 | clean / 257 of 257 |
| check-content | 127 of 127 NLU, 10 sims 12/12, fuzz 80, 0 errors, 0 warnings (fuel_type flag 9 pointed past the last unit) | 144 of 144 NLU, 13 sims 12/12, fuzz 80, 0 errors, 0 warnings |
| corpus | 232 of 232 (100%), 0 of 29 traps | 258 of 258 (100%), 0 of 30 traps |
| blind set (38 items + 4 safety items, written before I read the draft) | **35 of 38 (92.1%)**, 0 misread, 0 of 4 traps | 38 of 38, 0 of 4 traps (no longer blind) |

The blind misses: "¿Cuánto cuesta el más grande?", "Pero ya pagué el seguro en línea" and "¿Y si veo un rayón?". The NLU score was good, but whole conversations with polite or negative answers recorded the wrong thing.

## Fixes (about 196 lines added and 66 changed in the conversation, about 55 of them tests)
**meaning-safety, must-fix (~45 lines)**
1. Paid offers taken on a polite no. The shared yes list contains "así está bien". "Así está bien" and "Está bien, gracias" to "¿Le agrego la cobertura amplia?" therefore added full coverage at $450 a day. The same thing happened with the upgrade ($200 a day), the prepaid tank ($1,200), extras, the airport drop-off, a later return day and the switch from the manual. The new `offerReply()` reads "así está bien", "estoy bien así" and "claro que no" as a no. "Está bien, gracias" gets the new line "Perdón, ¿eso es un sí o un no?" (rule 10). The wrapper is on all 9 offers, including the `lower` pending, which is now a function.
2. At the twist, "¿Por qué no?" (why isn't it included?) read as ok_ack and accepted the $350 a day. It now gets tpl_why.
3. "Claro que no" read as ok_ack, which counted as a yes at the fuel question and at every pending offer. It is now a no.
4. At the insurance step, "¿La cobertura amplia es cara?" declined the coverage (rule 11). It now gets the price, and the offer stays open. "Es muy/demasiado caro" still declines.
5. At the upgrade pending, "No, gracias, me quedo con el compacto" was handled outside the pending, so the same offer was asked again. `keep_size` and `upgrade_yes` now answer the pending.
6. "No, lo devuelvo lleno" at the plain fuel question has lost its comma, and both readings are possible. The writer recorded a fuel charge. Andrés now asks again (rule 10).

**numbers, must-fix (~35 lines).** Rentals longer than a week used `ORDER[n % 7]`. Two weeks was "el próximo martes", 10 days was "el viernes", and "el miércoles" was then booked as an earlier, free day. Returns are now stored as days after the Tuesday pickup (`retN`). Rentals over 7 days get "Lo devuelve en 10 días, el viernes…" (4 new lines and a `num` domain). A weekday change picks the nearest such day, or the next one after the current return for "¿Me lo puedo quedar hasta…?".

**understanding (~25 pattern lines).** At the size step: "El económico", "Ok, el compacto" and "La camioneta" (an article or "ok" before the size wasn't understood, so walk-ins got stuck). Also added: "¿Puedo pagar con débito?", "…la garantía en efectivo", "Mi tarjeta lo cubre", "¿Lo puedo devolver en Cancún?", "¿Y en el aeropuerto?", "¿Tiene algo más grande?" (it got "Es más grande…" and is now quoted as an upgrade), "¿Cuánto cuesta el más grande?", "ya pagué el seguro en línea", "¿Y si veo un rayón?", "Así estoy bien, gracias", "Es caro" at a quoted price (the new `pricey_ctx`), "sé manejar estándar" (the new `manual_ok_ctx`) and "Mejor cancelo".

**spanish, polish (~8 lines)**
- After a second refusal at the twist, the new `tpl_required_again` ("¿Se lo agrego, o prefiere cancelar?") replaces tpl_required said twice in a row (rule 8).
- A fuel answer said twice now gets "Perfecto, con el tanque lleno" instead of the return question twice in a row.
- A "Sí" at "¿Algo más…?" now gets "¡Claro! ¿Qué necesita?" instead of the same question again.
- "¿Cuánto es?" at the deposit now gets the deposit, not the daily rate.
- "¿Lo tengo que pagar?" at the twist now gets the law, not just the price.
- "…multas o si falta gasolina".
**gloss-english.** I read all the lines of seeds 3, 4, 5 and 8, about a third of the glosses: none was wrong. The new lines are glossed and their flags checked.
**twins, facts, structure.** Five carro / licencia de manejo lines have neutral twins, which is fine. Usted throughout, no real brands; "La verde" and the vague hold figures were kept. The English id, steps, intents and both twists are kept; the tpl step comes from the brief.

**tests.** 17 NLU tests, 3 sims (the polite offers, the twist refused and cancelled, a 10-day walk-in with the manual kept), 27 corpus items with 8 traps, and the blind set.

## For the lead or the owner
- **Lead:** `global` / `lang.ts` has "así está bien" in the yes list. At an offer it means no. Other conversations with paid offers probably have the same bug (see the `// NEEDS:` note at the top of the file).
- **Owner:** the writer's "unsure" list still stands: the prices, the $5,000 and $20,000 holds, the one-hour grace period, the office hours and "la verde". The rates were not checked against a source.

## Lead's check (2 Nov 2026)

Looked at the risky parts only: the money (the offers, the twist, the hold, the tank), the return days, and questions or complaints that read as a yes. 30 new edge and trap sentences (outside the repo), before the fixes: 9/27 understood, 3 misread (two of them took money), 0/3 traps; after: 27/27, 0/3. Each flip below was played as a whole conversation before and after the fix.

| Check | After review | After the lead's check |
|---|---|---|
| check-content --verbose | 144/144 NLU, 13 sims 12/12, fuzz 80 | 161/161 NLU, 16 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus | 258/258, 0/30 | 258/258, 0/30 |
| blind set (heldout) | 38/38, 0/4 | 38/38, 0/4 |
| tsc, vitest | clean, 257/257 | clean, 257/257 |

**Money taken on a complaint or a question (must-fix)**
- "Pagué todo", "Lo pagué todo", "Todo está pagado", "Pagamos todo" at the twist accepted the $350 a day ("Gracias por entender. Ya queda incluido."), and "Pagué todo" booked the upgrade and full coverage: the engine reads pagué (folded "pague") and pagado as forms of "pago", so they matched "Lo pago". Now `tpl_refuse_ctx` patterns ("Lo entiendo, y lo siento…"), and a `paidPast` guard in tplAccept and offerReply (asked again). "Lo pago todo" and "Pago todo" still accept.
- "¿Y si cancelo?" ended the rental (the "si" folds to "sí": "Sí, cancelo"); "¿Puedo cancelar?" wasn't understood. New `cancel_q_ctx` (twist only) and line `tpl_cancel_q` "Si quiere, puede cancelar la reservación. ¿Se la cancelo?": a yes cancels, a no goes back to "¿Seguimos, entonces?". The same "¿Y si…?" no longer books full coverage ("Entonces, ¿le agrego la cobertura amplia?", or the lower-hold quote after the deposit), the upgrade ("Son $200 más al día.") or the prepaid tank (its quote again).
- The tank, asked as "¿O prefiere pagar el tanque por adelantado?" right after "…y lo devuelve lleno": "Está bien", "Ok", "Órale" prepaid $1,200; "Va", "Vale, gracias", "Muy bien, gracias" got "Perfecto, con el tanque lleno" and then "¿Se lo cobro?" (that pending had no ok_ack); "No lo voy a llenar" and "No tengo tiempo de llenarlo" got "Perfecto, con el tanque lleno". Now only a clear yes (sí, claro, lo pago…) prepays there; another agreement or those sentences get the new line `prepay_confirm` "Entonces, ¿le cobro el tanque por adelantado?". "No, lo devuelvo lleno" is still the full tank.
- "Vale, gracias", "Muy bien, gracias", "Sale, gracias" booked full coverage, the upgrade and the lower hold; like "Ok, gracias" they are now asked again.
- "Claro que no hay problema" was a no (the twist refused, the upgrade declined); "Claro que no" still is.

**Answers given to the wrong question, wrong prices (should-fix)**
- At the manual-car question (asked inside the insurance step), "No, así está bien" recorded basic insurance and the question came back; "Mejor el compacto" switched the car and the question came back; "¿Cuánto más es?" got "Son $450 al día" (the insurance). Every paid offer now takes the polite no ("No, está bien así", "Déjelo así", "Mejor no") itself, the manual question takes a size, and "¿Cuánto es?" at an open offer gets that offer's price: the new line `price_once` "Son {$price}." for the tank, the airport fee and a later day, "Son $100 más al día." for the switch (added to the price domain).
- "Aquí tiene mi licencia y mi tarjeta de débito" was taken right after "con débito o efectivo no se puede": now `debit_no` and the documents again.
- "¿Cuánto cuesta?" before a walk-in has chosen: "Un compacto cuesta $750 al día…", not a bare "Son $750".

**Understanding:** "No, está bien así", "Déjelo así", "Mejor el compacto", "No, con el compacto estoy bien", "El GPS, por favor", "No necesito el GPS, pero sí la silla" (the second is the answer, as in size_ctx), "No puedo devolverlo el viernes", "Hasta el domingo" at the return, "¿Y si no lo lleno?" (the charge, nothing recorded), "No lo acepto", "Cancélela".

**English:** "with a 800 pesos drop-off fee" → "for a drop-off fee of 800 pesos".

**Checked, fine:** the days (8 → miércoles, 10 → viernes, 11 → sábado, 7 → "el próximo martes", "Hasta mañana" → miércoles, an earlier day free), every price and hold as said ("mil cuatrocientos pesos", "veinte mil pesos"), "B4" said "be cuatro", the deposit echo.

**Tests:** 17 NLU tests (144 → 161), 3 sims (13 → 16), all 12/12.

**Left as is:** "¿Mi tarjeta me cubre?" spoken reads like the statement and records the card (the learner can still add full coverage); "Vale, gracias" said twice gets "¿eso es un sí o un no?" twice.

**For the owner:** a later return is quoted at the car's rate only ("Serían $750 más"), without full coverage or extras for those days; quoting the full daily cost would multiply the price domain and its clips.

**NEEDS (global):** `lang.ts` grammarClasses put "pague" (folded "pagué", I paid) with "pago", and "pagado" matches it as an inflection: every conversation with "lo pago" as a yes reads "Pagué todo" as one. The `{letters}` slot doesn't know "doble ele" (ll): "eme, i, doble ele, e, erre" → "mi" + "doble" + "ler", and spelled before the name it becomes "Eme I Doble". The reviewer's "así está bien" note stands.
