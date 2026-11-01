# Review: s65a-passport ("¿Negocios o placer?"), writer's commit 2c3173b0

| Check | Writer | After review |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 118/118 NLU, 13 sims 12/12, fuzz 80, 0/0 | 133/133 NLU, 18 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus (coverage) | 138/138, 0/16 false accepts | 158/158 (20 items added), 0/16 false accepts |
| blind set (42 items, written before reading) | 35/39 = 89.7%, 0/3 traps | 38/39 = 97.4%, 0/3 traps |

The one blind miss left: "Todavía no sé" at the length question goes to the global "no sé", which gives the length help ("¿Una semana? ¿Dos semanas?"). That is fine. The writer's claims held, but its tests missed six meaning flips that the folded text makes.

## Fixes (85 lines added, 17 changed, in a file of 1449)
- **meaning-safety (must-fix, ~25 lines)**
  - "Vacaciones, no negocios" was read as *business*. The comma is lost, so the writer's "X no, Y" pattern also matches "X, no Y". The same was true of the length ("Dos semanas, no un mes" → 30 days). Both are now tagged `#amb`, and the officer asks again ("Perdón, ¿cuál de los dos?" / "¿Cuántos días, entonces?"). The forms with "sino" and with a leading "no" stay read.
  - At "¿Y trae tarjeta?", "No tengo tarjeta" matched `[no] tengo tarjeta` and was recorded as *has a card*. A handler check now makes it the plain no.
  - At "¿Tiene visa de residente?", "Aquí está mi pasaporte" granted the resident visa. The officer now asks "¿Y su visa de residente?". "Todavía no la tengo" was read as a missing return ticket (return_no); it is now a no.
  - At "¿Ya había venido a México?", "No, es mi primera vez" was recorded as *been before*. It folds like "No es mi primera vez", so the reading now depends on which question was asked.
  - "Una visita de trabajo" was read as vacation; it is now business.
  - At the stamp twist, a figure no bigger than hers is now a yes. A sentence with "no" ("Quince días no son suficientes") is never a yes.
- **understanding (must-fix, ~15 lines)**
  - "Vine a vivir", "Vengo a jubilarme", "Una conferencia de medicina", "¿Con qué mano?", "Prefiero treinta días"
  - "boleto de ida y vuelta", "Es de ida nomás", "…, pero lo voy a comprar" (now said once)
  - "Sí, es la primera", "No lo encuentro"
  - "Tres semanas y media" (was length + a job), "Del cinco al veinte de junio"
- **spanish (polish, 2 lines)**: "¡Qué bueno que regresa!" → "¡Qué bueno que regresó!"; the visa re-ask is now a short line, not the same question twice in a row
- **gloss-english (polish, 1 line)**: "saliendo de aquí" was glossed "going out from"; it is now "as you leave", with a flag
- **numbers, twins, facts, structure:** no changes
  - Days come from the steps 7/10/15…180, spoken by the engine. "180" has its say: text.
  - One twin (departamento), all usted, gender forms fine.
  - Steps, intents and both twists match the English file, except the customs part, which was dropped on purpose (below).
- **tests:** 15 NLU tests and 5 sims (the visa, the comma folds, no card, "No, es mi primera vez", thanks at the stamp and then "Está bien, pero…"); 20 corpus items.

## Left as is (folds with a likely reading)
"No, vengo con mi esposa" (alone_with), "No pago con tarjeta" (cash_no) and "No vengo como turista" at the visa step (have_esta) each have a rarer opposite reading ("I'm not coming with…"). The engine can't tell them apart without the comma. None of them books anything.

## For the lead / the owner
- NEEDS (engine): the comma before "no" is lost, so "X, no Y" = "X no, Y" in every conversation with corrections. A lang.ts or normalize.ts marker for "no" after a comma would make `#amb` unnecessary.
- Owner: the customs declaration and the beagle twist were dropped (INM doesn't ask about food). The writer's facts are still unverified and stay vague: the 30-day deadline to exchange the visa for the card, fingerprints at a small airport, the money question, stamped days rounded to 7/10/15/…, and "no form to fill out".
- Glosses checked: about 40 of the ~110 line variants and hints. No gloss errors besides the one above.
