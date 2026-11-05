# Review: p26-complaint ("Quiero poner una queja"), writer commit 06c0f855

## Gate and blind set

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 93/93 NLU, 16 sims 12/12, fuzz 80, 0/0 | 110/110 NLU, 17 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 292/292 (100%), 0/45 false accepts | 318/318 (100%), 0/47 (26 review items added) |
| blind set (40 items, 3 "any" traps + 9 `not:` traps) | 36/40 = **90%**, 0 false accepts | 38/40 = **95%**, 0 false accepts |

Blind misses before: "Si no lo resuelven voy a ir a la Profeco", "¿Me lo da por escrito?". The 2 left get another intent with the same outcome. Not blind after; the fixes are general constructions.

## Fixes (src file: 115 lines added, 30 removed)

**meaning-safety: must-fix (~25 lines)**
1. **"No un sofá nuevo, un reembolso" booked a new sofa.** It was read as ask_replacement + ask_refund + no, and the first piece won. There are now whole patterns, both ways, for "No X, Y", "X no, Y", "no X sino Y" and "No con un cupón, con mi dinero" (rules 10 and 18).
2. **"No para el viernes, para el jueves" recorded Friday.** "No, el jueves no, mejor el lunes" was not understood. These are now correction patterns with `{wrong:day}`, so the second day is the one recorded.
3. **A bare "Nada" / "No, nada" / "Igual" in the plain `fridge_broke` intent.** At "¿Le puedo ayudar en algo más?" these got "Lo sé, y eso no debió pasar" and were not taken as a no. They now live in `still_ctx`, which only the "¿bien armado?" steps expect (rule 2). "[no] nada [más]" is a thats_all.
4. **"¿Puedo pedir otro día?" accepted Brenda's Wednesday visit** (`accept_offer` had "puedo (pedir | tomar) otro día"). That pattern is removed.

**understanding: must-fix for the common ones (~45 lines)**
- Profeco threats ("Si no lo resuelven voy a ir a la Profeco"); "¿Me lo da por escrito?"; "Sí, estoy de acuerdo" (her question is "¿Está usted de acuerdo?"); "No, no estoy de acuerdo" = new `disagree_ctx` (Brenda asks for a day); a bare "Hasta el viernes" (with the by_until tip); "Prefiero el dinero", "¿Nada más un cupón?", "Ya me agendaron una visita y nadie vino", "¿Y si el martes tampoco viene nadie?", and "El martes no, mejor páseme con su gerente" / "Martes no, quiero hablar con el gerente" as whole patterns.
- The order number said whole ("cincuenta y ocho mil doscientos trece") came out as two pieces, "50" and "8213", and got "no me aparece ese número". It is now `@order_whole`.
- A read-back without the letters ("Cuatro cuatro siete dos") is now understood (`readback_ctx`, only right after the folio).
- "¿Pueden venir el sábado?" at the Wednesday visit was not understood. It is now `other_day_ctx`: a new line, "Lo siento, el técnico solo puede el miércoles, entre {$win}.", then "¿Qué le parece?". If the learner asks again, Brenda takes it as a no to Wednesday, so the line is not said twice. Nothing is booked.

**gloss-english (polish, 3 lines):** three flags were one unit off (rule 15). In the two `further` hints the flag was on "Profeco." and belongs on "la". In need_by the flags sat on "el / viernes" and belong on "para / el".

**tests:** 17 NLU tests (corrections, traps) and 1 sim with the order number whole, another day, two corrections, a disagreement and a wrong read-back. The writer's corpus got 26 items, and its 2 items for the new intents were updated.

## Checked and kept
Probed (probe.ts): Tuesday "Así está bien" = no, "Está bien, gracias" asks first, what-if/price never book; coupon "¿Cuánto vale…?"/"¿Y si acepto…?" give facts, "Ok, gracias" asks again, a past tense books nothing; deadline and folio correct. Spanish, usted, 2 twinned Mexican words, glosses (a third read) and structure: fine.

## For the lead / owner
- **NEEDS (shared):** `{number}` in `src/editions/es/convo/slots.ts` reads "cincuenta y ocho mil doscientos trece" as 58 (it doesn't take a compound before "mil"). This is worked around locally.
- **NEEDS (audio):** the new line `brenda_only_wed` needs audio.
- **Left:** "¿La visita tiene costo?" asked of Jorge gets no answer (no line); "¿Y si pido un reembolso?" isn't understood (safe). (The visit's cost: done 5 Nov; see below.)

## 5 Nov 2026: the visit's cost

Decided on the owner's "decide on best fixes": "¿La visita tiene costo?" now gets an answer in the agent's register,
"No tiene ningún costo: la visita está cubierta por la garantía." (There's no charge: the visit is covered under the
warranty.), with no "No," first, so that "¿Es gratis?" never gets a no. Then the offer that was open comes back: Jorge's
"Entonces, ¿le agendo la visita para el próximo martes?" (or "¿Le gustaría hablar con mi gerente?"); Brenda's "¿Qué le
parece?". At Brenda's Wednesday visit the answer is her existing visit_info line ("…sin costo para usted"), as before;
at her coupon she says the new line in her voice (it used to give the coupon's facts, a wrong answer). Nothing is
booked or accepted by a cost question: "Si es gratis, está bien", "Sí, si es gratis" and "Vale, ¿y tiene algún costo?"
get the answer and the question again (probed). New: `visit_cost` (the visit or the technician named, any step) and
`cost_ctx` (bare "¿Tiene algún costo?", "¿Es gratis?", "¿Cuánto cuesta?", "¿Me van a cobrar?", only while Jorge's
visit is on the table: the history step and his booking question; never at Brenda's offer, where a coupon may be on the
table). offer_q lost its one cost pattern to `visit_cost`. Lines: kyle_visit_free, brenda_visit_free (the same words).
Tests: 14 NLU tests, 2 sims, 33 corpus items (10 traps: a refusal is never a yes).
