# Review: s75-pharmacy (Farmacia del Puerto, Don Héctor), writer's commit e1fed1aa

**Gate before → after:** tsc clean → clean; check-content 102/102 NLU tests, 13 sims all 12/12, fuzz 80, 0/0 → 113/113 NLU tests, 16 sims all 12/12, fuzz 80, 0/0; corpus 264/264, 0/26 traps accepted → 276/276, 0/29; vitest 287/287 → 287/287.
**Blind set** (40 sentences, `tests/es/heldout/s75-pharmacy.json`, written before I opened the draft): **36/40 (90%) → 40/40**, 0 traps accepted both times. Before: "No, ninguna alergia", "Solo una pastilla para la presión" and "Ya tomé paracetamol pero no me hizo nada" were not understood; "Como una semana" was understood as `howlong_ctx` (the right meaning; I added that intent name to the item). The after score isn't blind. The bigger findings came from probe runs (rule 22), not from the blind set.

About 31 of the 1,892 lines changed and 126 were added (≈60 must-fix, ≈15 polish, ≈50 tests and sims).

## meaning-safety: must-fix (~35 lines)
1. **Price said, then a different charge.** After "Serían $35", "¿Me da también unas curitas?" (or the extra cream for a second symptom) put $80 on the card without saying the new total. "¿Hay algo más barato?" at the pay step quietly switched the brand-name medicine to the generic after "$95" was said. Now `totalSaid` holds the amount said, and the pay step, `choosePay`, `here_you_go` and `ask_price` say the total again when it has changed. The cheaper question answers with the generic's price and asks "¿Quiere el genérico, entonces?" (`switch_q`, optional); only a yes switches.
2. **"Sí" to "¿Quiere pasar con el doctor?" bought cough syrup.** When the doctor question came from the recommend step (a cough for two weeks), the step's `accept_ctx` took the plain yes. `doctorPending` now handles `accept_ctx` (the yes goes to the doctor) and asks again for "Está bien, gracias".
3. **Questions bought the generic.** "¿Y el genérico?" and "¿Cuánto cuesta el genérico?" at the recommendation, and "¿Cuál es el más barato?" at the brand question (which also said its line twice), chose and bagged the generic. Now a price word or "?" gets the prices, and "No quiero el de patente" at the offer only records the choice. Both kinds of question get the offer again.
4. **Polite closings (rule 17).** "Está bien, gracias" / "Vale, gracias" took the medicine (accept_ctx) and the extra; now he asks again.
5. **Lost commas (rule 10).** "Genérico no, de patente" chose the generic. "X no (el) Y" without "mejor/sino" is now `#amb`, and he asks "Perdón, ¿cuál de los dos?". "No, de patente no" is understood (generic).

## understanding: must-fix for the common ones (~20 pattern lines)
"No, ninguna alergia" · "Solo una pastilla para la presión" · "Ah, pero tomo pastillas para la presión" (said at the dosage step, it now swaps the ibuprofen on the counter) · "Ya tomé paracetamol, pero no me hizo nada" (recorded, never an order) · "Las curitas no, gracias" (article) · "Ya fui al doctor" · "Tome doscientos" · "Aquí tiene otros cien" (now adds to the first bill when it alone doesn't cover the total) · "¿Necesito receta para la amoxicilina?" · "No, solo vengo por un bloqueador" at the returning-customer question. "No, no necesito nada" at "¿Algo más?" said "No hay problema" and asked "¿Algo más?" again; it now ends the list.

## spanish / flow (polish, ~10 lines)
- "Tengo una receta, pero no la traigo" got "¿Me deja ver la receta?" and then "Sin receta no puedo vendérsela". Now only the second.
- "¿Puedo pagar con el celular?" got "Claro, con tarjeta sí" → "Sí, claro. Al final le cobro."
- Dosage given twice in a row (a "No" right after the third ask). "Ya lo he tomado" reminded of the measuring cup → a reminder now only states the limit.
- "¿Cuánto es?" after the stamp said "Son $85" and "Serían $85" back to back.

## facts (owner: please check)
- **rx_stamp:** "le sello la receta y se la regreso" → "tengo que sellar la receta", and "Aquí tiene su medicina" without "y su receta". My understanding of the COFEPRIS antibiotic rule (not checked against the text): stamp every time, and keep the prescription once the whole treatment is filled. The vague line is true either way (rule 14).
- Kept: prices (in STYLE ranges), dosages (label-like and conservative), consultorio "unos sesenta pesos", the reef line, blood pressure → paracetamol.
- **For the lead (town map):** s62 puts the pharmacy "junto a la estética"; here the consultorio is "la puerta de al lado". There's no conflict if it's on the other side, but the map should agree.

## gloss-english, twins, numbers, structure: no must-fix
I checked every flag index against its unit (all right) and about a third of the glosses. The Mexican-only words (pásele ×2, híjole, ahorita, moscos ×2, piquetes, agruras) all have twins, about 8 of ~165 lines. Structure: all the English steps except the dropped US pickup steps, the brief's generic and consultorio twists, and every English twist.

## tests (~50 lines)
11 NLU tests (traps: past tense, questions, a plan "Si no se me quita, voy al doctor"), 3 sims (questions and closings never buy plus the total said again; an ambiguous answer asked again plus cash in two goes; a plain yes to the doctor), 15 corpus items.
