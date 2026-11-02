# Review: s79-post ("¿Dónde está mi paquete?"), writer commit 6f994999
## Gate and blind set, before and after
| Check | Writer | After review |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 111/111 NLU, 11 sims 12/12, fuzz 80, 0/0 | 128/128 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage) | 210/210, 0/22 false accepts | 226/226, 0/24 false accepts (14 + 4 new items, 3 renamed) |
| blind set (39 + 1 "any", 9 traps) | 30/39 = 76.9%, 0 traps accepted | 36/39 = 92.3%, 0 traps accepted |
Blind misses left are right readings under other names (tequila refused as alcohol, "Claro, ¿aquí?" signs, cash then).
## Fixes (src: 149 lines added, 41 changed or removed; ~110 must-fix, ~15 polish, ~25 tests)
**meaning-safety (must-fix, ~45 lines)**
- A question about a service chose it: "¿El express tiene rastreo?" booked express; "¿El normal llega antes de Navidad?"
  at the value step switched to standard; "¿Es muy caro el express?" booked express. Questions naming a service are
  now one piece (ask_time/tracking/insured/price/cheaper), and a bare service name never chooses when the turn asks.
- "El más barato" / "El económico" booked economy in the same breath as its price, no tracking and 1-month delay
  (rule 3). Now Gloria quotes it and asks "¿Le parece bien el económico?"; questions in between answer for economy.
- Economy (no tracking) still got a número de guía on the receipt; "¿Lo puedo rastrear?" after it said "on the receipt".
- "No quiero el express" after choosing it said "No hay problema" and kept express: it now goes back to standard.
- "No es caro" anywhere recorded a $500 customs value and skipped "¿Cuánto vale?"; it was also one slip from "No el caro"
  (service_not), which set the service at the contents question. Both now live only at their own question.
- "Necesito dos" / "Me da dos" with no noun at the payment added 2 stamps: a bare count is a stamps_ctx now (rule 2).
- "No tengo efectivo" charged the card at once: now "con tarjeta entonces", paid on the hand-over (rule 17).
- A service named before weighing ("El normal" while the perfume question was open) was chosen with no price said.
- Pickup: "No traigo el aviso, pero tengo el número de guía" + a later "Ok, gracias" recorded the notice as handed over.
**understanding (must-fix, ~25 lines):** one intent twice in a turn isn't read, so "No es regalo, son cosas mías",
"Sí, es frágil, son unas tazas…" got whole patterns; "No vengo a recoger nada, quiero enviar esto", "A Texas, en
Estados Unidos", "¿Qué cosas no se pueden mandar?", "No lleva perfume ni nada así", "Perfume no", "Nada de perfume".
**replies (must-fix, ~20 lines):** "¿Cuánto es?" at the payment said the total twice in a row; "¿Está asegurado?" for
economy got "No hay problema" (now "El económico no lleva seguro"); "Es un poco caro" at the insurance offer quoted
economy (now a no to full insurance); a "No" to the perfume rule re-asked the contents question (the question stays
open); "Ya está" at the return address thanked and asked again; "¿Pongo mi dirección de Canadá?" got a definition
(now "Puede ser la de aquí o la de su país"); "No, gracias" after "¿Sería todo?" asked "¿qué más necesita?"; after
"No tengo el número", Gloria repeated the whole guía question (now "Entonces, ¿a nombre de quién viene?").
**polish (~8):** "solo hasta 2 kilos" said once; a 2nd "¿normal o express?" variant. **gloss (2):** "an | shipment";
the fragile_ok flag pointed at "pongo", not "le".
**numbers, twins, facts, structure:** OK (prices plausible, timbres/nomás/ahorita twinned, Correos across from Café La
Ceiba as in s62, English steps/intents/twists kept). **tests:** 17 NLU traps, 1 sim (economy quoted), 1 sim turn.
## For the lead
- Engine: one intent twice in a turn is rejected (strayRepeat); "X, Y" answers need whole patterns. Comma gaps kept:
  "No, es para mi mamá" at "¿Es regalo?" = gift; "Perfume no, lo saco" = "no lo saco" (nothing recorded).
