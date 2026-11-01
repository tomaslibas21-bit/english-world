# Review: s65b-baggage ("Mi maleta no llegó"), writer's commit c752f133

I reviewed `src/editions/es/content/situations/s65b-baggage.ts` (1,364 lines). I changed 22 of its lines and added 56; 24 of the added lines are tests and a sim. No shared file was touched.

| Check | Before (c752f133) | After |
|---|---|---|
| tsc / vitest | clean / 257/257 | clean / 257/257 |
| check-content --verbose | 104/104 NLU, 8 sims 12/12, fuzz 80, 0/0 | 121/121 NLU, 9 sims 12/12, fuzz 80, 0/0 |
| corpus (`tests/es/corpus`) | 168/168, 0/15 false accepts | 184/184 (with 26 review items), 0/25 false accepts |
| blind set (`tests/es/heldout`, 40 items, written first) | 37/40 = 92.5%, 0 traps accepted | 37/40, 0 traps accepted |

All 40 blind sentences were understood. The 3 "misses" got the writer's `_ctx` intents (`tag_lost_ctx`, `describe_ctx`), which run the same handlers as the intent I expected. I left the blind set unchanged. The writer's claims all held. Most bugs came from a second probe of about 65 sentences, written after I had read the file.

## Fixes
**meaning-safety: must-fix (about 14 lines)**
- `pickup` matched a bare "no hace falta". So "No, no hace falta" in answer to the kit offer switched the delivery to a pickup ("puede recogerla aquí"). It now needs "no hace falta que me la lleven / llevarla"; the bare phrase is now in `kit_no_ctx`.
- "No, al hotel no" and "No al hotel, prefiero recogerla" were read as a delivery somewhere else. In the second case Itzel promised delivery while the bag was set to a pickup. A delivery elsewhere now needs "sí / pero" or "a otra dirección"; "no al hotel + recogerla" is a pickup.
- `q_meantime` held "no tengo nada": at the contents or phone question, that offered the kit. It now needs "…para esta noche / que ponerme".
- `kit_no_ctx` "[no] tengo mis cosas": "No tengo mis cosas" declined the kit. That reading now needs a place ("…en mi mochila").
- `marks_none` "no tiene nada" was a plain intent; with tengo≈tiene, "No tengo nada" at the tag question became "no marks". The bare form is now in `marks_bare_ctx`.
- `hand_over` held bare "aquí / tome / tenga / lo tengo". These are now `hand_over_ctx`, used at the tag question only.
**understanding (about 8 lines):** "No fue directo, hice escala en X"; "No es grande, es chica"; "No estoy en un hotel, estoy con unos amigos"; "No tengo celular"; "No sé, creo que Samsonite"; "¿Aquí se reportan las maletas perdidas?"; "Mi maleta sí llegó, pero mi mochila no".
**spanish / replies (must-fix, 3 lines)**
- `ans_free` said "Sí, la entrega no tiene costo", which also answered "¿Tengo que pagar algo?" and "¿Cuánto cuesta?". It is now "La entrega es gratis, no tiene ningún costo."
- The kit was offered twice: after a yes or no at the kit question, "¿Qué hago mientras tanto?" offered it again. `kitGiven` is now set there (new sim).
- `phone_none_call_us` said "llamar con su número de reporte" right before Itzel gave the number ("número de reporte" twice). It is now "el teléfono viene en el reporte".
**gloss / flags (polish, 2 lines):** the `ask_tag` flag on "pase de abordar" was on unit 12, which doesn't exist (the unit is 11), so the Mexican-word flag never showed. The phone hint's `say` had an "el" that its text doesn't show.
**facts (polish, 1 line):** "le reembolsamos lo que gaste" was an open promise. It is now "le reembolsamos los gastos básicos".
**tests (+24 lines):** 17 NLU tests, mostly traps with `not`, and the sim "kit declined, then what to do in the meantime".

Kept as written: usted throughout; the twins (pase de abordar, listón, playera); the flight code PC; the twist city rule; echo_navy; the transcripts (seeds 3, 5 and 8, twist sims included) read naturally, with no line repeated in a row.

## For the lead
- The engine can't tell "No fue un vuelo directo" (not direct) from the hint "No, fue un vuelo directo", because punctuation is stripped. The same goes for "No volé directo", "No es una maleta normal", "No lo perdí" and "No estoy bien". I kept the "No," reading, which is the likelier one at those questions. Fixing it would need comma awareness in the NLU (a shared file).
- A bare "Aquí" at the delivery question still reaches `hand_over` in coverage (it gets a "Gracias."). That is harmless, but it is not understood as "pick it up here".
