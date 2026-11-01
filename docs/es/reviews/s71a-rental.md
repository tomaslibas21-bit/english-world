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
