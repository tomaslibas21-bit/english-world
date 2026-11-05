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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), against AUDIT-BRIEF.md's ten points. Read: STYLE.md, AUTHORING-ES.md,
the brief, the reviews above, the cross-cutting leads (AUDIT/cross, AUDIT/neutral), TOWN.md ("Getting around" and the
town facts), the file, the corpus and the held-out set, the transcripts (seeds 3 and 7, and every sim's 12 seeds), and
about 80 whole conversations played with `tools/probe.ts` (every step and pending offer: polite and unclear answers,
corrections, side questions, price questions, a reservation with the twist before the twist is told). A value run
(964 conversations: every car × 12 rental lengths × 13 later returns, coverage and extras, the prepaid tank, the
airport, the reservations' twists) checked that every value a line says is in its voiced list.

**Before → after:** check-content 161/161 NLU, 16 sims → 182/182 NLU, 20 sims, all 12/12 seeds, fuzz 80, 0 errors 0
warnings; corpus 258/258, 0/30 traps → 294/294, 0/35 traps; held-out 38/38, 0/4 → the same; tsc clean; vitest (es) 109/109.

### Found and fixed, by point (23 found, 22 fixed)

1. **Natural Spanish (4):** "¡Buen viaje!" was followed by "¡De nada! ¡Buen viaje!" (59 times in the sims' seeds):
   `you_welcome` is now "¡De nada! ¡Hasta luego!". After "Bien, gracias, ¿y usted?" Andrés said "Muy bien, gracias
   por preguntar. Muy bien. ¿Tiene reservación…?": `ask_resv[1]` is now "Y dígame, ¿tiene reservación con
   nosotros?". The upgrade offer came back whole, price and all, after every side question: a short reminder
   (`ask_upgrade_again` "Entonces, ¿se lo cambio al intermedio?"). "¿Seguimos, entonces?" ended two turns in a row at
   the twist (24 times in the sims): a second variant, "Entonces, ¿le agrego el seguro obligatorio?", and the same for
   the coverage reminder ("¿Quiere la cobertura amplia, entonces?"). Both new reminders name the thing: a bare
   "¿Se la agrego?" could follow the manual car's switch or a declined upgrade, and its yes adds money.
2. **tú/usted:** nothing (usted throughout, hints in usted, tú accepted with the tip).
3. **Names (1):** "¿Está incluido el seguro obligatorio?" at "¿Me da su apellido?" took "Obligatorio" as the surname
   and found the reservation under it: the conversation's own words are never a surname now (`NOT_A_NAME`).
   Andrés is the only Andrés (AUDIT/cross).
4. **Facts and prices (4):** *The twist was contradicted before it was told.* With a reservation whose online price
   left out the mandatory insurance, "¿Está incluido el seguro?" got "El seguro obligatorio ya está incluido",
   "¿Cuánto cuesta?" got "…con el seguro obligatorio incluido", "Mi tarjeta me cubre" at the upgrade got "…el seguro
   obligatorio ya está incluido" and "¿Es obligatorio?" got "La cobertura amplia es opcional; el seguro obligatorio
   ya está incluido", and then the twist said it isn't. Now, until the twist is told, those get the new `check_first`
   "Enseguida lo revisamos." (the upgrade's own price is still said at the upgrade). *A free upgrade was quoted at
   the midsize's rate:* "¿Cuánto cuesta?" and a later return said $950 a day after "sin costo extra"; the rate stays
   the compact's. *The prepaid tank was $1,200 for every car*, below the pump price for a minivan (about 70 liters at
   about $24, TOWN.md): $1,400 for the SUV and $1,800 for the minivan (both already voiced values; the lines stay
   fixed-value for the voices). *A later return more than 7 days on said a total no clip has* ("No, el viernes no
   puedo" → "Por dos semanas" → "Serían $8,250 más"): it is now quoted by the day, "Claro. Cada día extra cuesta
   $750. ¿Se lo cambio?" (`ret_more_q_day`), and "¿Cuánto es?" there gets "Son $750 al día.". The brute-force run
   found no other value outside its list. Checked and kept: the rates ($650–1,800 with the mandatory insurance), the
   insurance ($350) and coverage ($450), the holds ($5,000 / $20,000), the extras, the $800 airport drop-off, the
   one-hour grace, the hours (7 to 9), "la verde" (Magna's pump), and the gas station "aquí cerca, sobre la avenida"
   (TOWN.md "Getting around": Gasolinera El Faro is the building after the rental on avenida Juárez).
5. **Glosses and English (1):** "Shall I…?" / "Shall we…?" in the natural English and the glosses of 13 lines
   (AUDIT/cross §4) → "Should I…?", "Do you want me to…?", "Would you like me to…?" (English only).
6. **Spelling, ¿¡:** nothing (new lines checked: dígame, agregó, Enseguida, devolverlo).
7. **Questions and offers (12):** "¿Cuánto es en total?" got the deposit at the deposit step and the coverage's
   price at the insurance step, and "¿Cuánto cuesta / me sale en total?", "¿Cuánto le debo?", "¿Cuál es el total?"
   weren't understood: now the daily cost, "Son $750 al día, con el seguro obligatorio incluido", or with something
   added the new `total_day` "Con lo que agregó, son $1,200 al día." (its own `total` list, 30 values). "¿Qué es la
   cobertura amplia?" (the new term) wasn't understood. "¿Vale la pena?" / "¿Me conviene?" weren't, and "¿Qué me
   recomienda?" at the upgrade was answered about the coverage (now the midsize). Side questions with no answer:
   "¿Aceptan dólares?" (new `usd` "Le cobramos en pesos, a su tarjeta de crédito."), "¿Mi esposa también puede
   manejar?" / "¿Puedo agregar otro conductor?" (new `driver_ok` "Sí, solo necesito su licencia; el conductor
   adicional no tiene costo."), "¿Tiene aire acondicionado?" / "¿Tiene clima?" (new `ac_yes`), "¿Lo puedo devolver
   antes?" (new `ret_early`), "¿Y si llego a las seis?" / "¿Lo puedo devolver en la noche?" (the grace hour), "¿Mi
   tarjeta no lo cubre?" at the twist (the card can't cover it). *Meaning safety:* a walk-in who said "Una camioneta"
   and then "Mejor un compacto" (at the days or the documents step, or after them) was ignored, and the SUV was
   rented at $1,400 a day: a walk-in can change the car until signing, and the new rate is said. A walk-in's
   "¿Cuánto cuesta?" before the days was answered and then said again at the documents (and twice in one turn for
   "¿Cuánto es por tres días?"). "Necesito un carro por un mes" wasn't understood at all, nor "Un mes" at "¿Qué día lo
   va a devolver?": "un mes" (30 days) and "tres semanas" are durations now.
8. **Hints and help:** nothing (every hint accepted, usted, American English).
9. **Accepted answers:** no false accept found; corpus +36 understood (258 → 294) and +5 traps (30 → 35): a second
   driver refused, "El carro no tiene aire", "No quiero pagar en dólares", "No lo puedo devolver antes", "Mi esposa
   no va a manejar". New NLU tests: 21; new sims: 4 (the twist asked about before it is told; a walk-in's change of car
   with the total, dollars and a second driver; two weeks quoted by the day, the early and late return; the SUV's
   prepaid tank).
10. **The neutral text (1, not fixed):** the 5 twins are right (carro → auto, licencia de manejo → de conducir) and no
    new line needs one. "Estándar" (a manual car) is Mexican, Central American and Caribbean (DAMER), not South
    American (mecánico / manual): `auto_all` and `economy_manual` here and p25's three gearbox lines say it in the
    neutral text too. Left for the lead, to keep the two conversations alike.

### Voices

New spoken lines: `total_day`, `check_first`, `usd`, `driver_ok`, `ac_yes`, `ret_early`, `ret_more_q_day`,
`ask_upgrade_again`, `tpl_again[1]`, `ask_insurance_again[1]`. Changed: `ask_resv[1]`, `you_welcome`. Values:
`ask_prepay` / `prepay_quote` now say $1,200, $1,400 or $1,800 (fixed values); `total_day` has its own `total` list;
`ret_more_q_day` is a list line (it says only the five rates: a reach-es RULE could keep it to them).

### Left for the lead or the owner

- **Lead:** the neutral "estándar" (point 10), with p25.
- **Owner:** a later return is still quoted at the car's rate only, without full coverage or extras for those days
  (the lead's note above). An additional driver is free here (some agencies charge about $100–150 a day): say if
  it should cost.
