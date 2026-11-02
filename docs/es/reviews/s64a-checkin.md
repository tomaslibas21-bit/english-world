# Review: s64a-checkin ("¿Ventana o pasillo?", Emilio, airline check-in, usted)

Writer's commit 07f82d66 (1618 lines). Only the conversation, its corpus, the blind set and this file changed.
Diff: 39 lines changed or removed, 133 added. About 60 lines are must-fixes, 15 polish, 58 tests.

## Gate and blind set
| | Writer | After review |
|---|---|---|
| tsc / check-content | clean; 98 NLU, 8 sims 12/12, fuzz 80, 0/0 | clean; 113 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| Corpus | 237/237, 0/23 false accepts | 248/248 (11 review traps added), 0/23 |
| Blind set (40, 9 traps, written first) | 33/40 = 82.5%, 0 traps accepted | 39/40 = 97.5%, 0 traps accepted |

The remaining blind miss is harmless: "¿Aquí la pongo?" at the scale is read as `give_ctx`, and Emilio weighs the bag. The after score isn't blind.
A 160-sentence probe written after reading the file found the bugs below. Each fix was checked in a played conversation.

## Fixes
**meaning-safety, must-fix (~30 lines)**
- "Me da igual" / "Cualquiera" at the overweight choice booked aisle seat 14C. A plain-intent `seat_any` acted at every step. It now acts only at the seat step or when a seat word is said; elsewhere the open question is asked again.
- At the fee, "No, ya no quiero pagar" was read as "ya" (= done) and paid the $600. "ya no…" is now one refusal (`move_items_ctx`), and a "listo"/"ok" that contains a "no" never pays.
- "Tengo el vuelo de las ocho y diez" recorded the passport as handed over: the engine's o/a slip tolerance matched "tengo" to the pattern "Tenga". There are now patterns for "tengo el vuelo de…" and "sí, tengo otra pregunta", and `give` ignores a bare "tengo…" with no document named.
- At "¿Alguna pregunta?", "No, solo tengo una pregunta" was `more_no` and ended the conversation. "No, solo una pregunta" was read as one bag, and "Sí, tengo otra pregunta" as a power bank (the twist line came at the boarding pass). The bare "solo una" and "sí, tengo uno" moved to `_ctx` intents (rule 2). New `more_q` forms cover "solo una pregunta". `bags_ans` is ignored after weighing. `battery_yes` heard outside its question now gives the rule only.
- "Una grande y una chica" recorded 1 bag; it is now 2.
- Rule 10 (lost commas): "Pasillo no, ventana" booked the aisle. A new `seat_amb` intent ("{seat} no {seat}") asks "Perdón, ¿pasillo o ventana?". "A Guadalajara no, a la Ciudad de México" and "No voy a Guadalajara, voy a…" took the first city ("no veo reservación a Guadalajara"). Now the second city is the answer.

**understanding (~25 lines, must-fix for the common ones)**: "¿Es aquí para el vuelo a…?", "Lo estoy buscando", "Ahorita se lo doy", "No me acuerdo" (`lookup_ctx`), "Voy a sacar unas cosas y meterlas en mi mochila", "Es mucho, mejor saco algo", "Ni modo, lo pago", "No pago, saco…", "No quiero sacar nada" while moving things (now goes to the fee), "No, mi esposa" / "Sí, yo" (`packed_*_ctx`), "En la maleta no, la batería la traigo en la mochila", "No traigo nada de eso en la maleta", "No es una, son dos", "¿Cuál es el número de mi asiento?".

**flow and spanish (polish, ~10 lines)**: refusing to move the power bank repeated the whole line; it now gets the reason plus a short re-ask (rule 8). In the line itself, "¿Lo puede cambiar?" became "¿Lo puede sacar?". A bare "Sí" to "¿Cuántas?" no longer means one bag: Emilio asks "¿Cuántas, entonces?" once, then takes one. "¿Aceptan efectivo?" before weighing got "Hoy no tiene que pagar nada" just before a fee; it now gets "Sí, aceptamos tarjeta y efectivo".
**rule 11 (polish)**: "¿A qué hora llegamos?" got "Son más o menos dos horas". It now gets "…así que llega a media mañana", which stays vague about time zones. `media mañana` is registered as a merge.
**gloss-english (polish, 3 lines)**: "a 600 pesos overweight fee" → "an overweight fee of 600 pesos" (×2); "what it carries inside" → "what you carry inside". I checked about a third of the line variants and every flag index in the file: all point at the right unit.
**numbers, twins, structure**: no change. $600, 25/27/24 kg, 12A/14C/23B, 7:30, 8:10, sala 4 (matches s64c), 55 lb are all consistent. The three neutral twins are correct. All 8 English steps, the 43 English intents and the 3 twists are kept.
**tests**: +15 NLU tests (9 traps with `not`), +4 sims (fee refused and seat said without commas; bag count and someone else packed; battery in the backpack; power bank refused once).

## For the lead / owner
- "documentar" and "equipaje documentado" have no neutral twin. Mexico says it, and it is also airline usage across Latin America, so I kept it untwinned.
- From the writer's unsure list, still unverified: 25 kg per bag; the invented $600 fee; cash accepted for overweight; "your fare includes one bag" (Mexican low-cost fares often don't include one). Each is stated as this airline's or this booking's rule.
- Engine: the o/a slip tolerance lets "tengo" match "tenga" (and could do the same in any conversation with a bare "Tenga" hand-over). I worked around it here; other conversations may need the same guard. The fix belongs in the engine, so it's worth a NEEDS.

## Lead's check
Looked at numbers, money, refusals and the open points. A 30-sentence check set (27 + 3 traps, written before the fixes) went from 6/27 (22%) to 27/27, 0/3 traps accepted. Each fix was also played turn by turn.

**meaning-safety, must-fix**
- "No quiero pagar con tarjeta" at the fee was "no quiero pagar" + "con tarjeta", and the "con tarjeta" paid the $600 by card. A new `pay_other_ctx` ("No quiero pagar con tarjeta / en efectivo", "No tengo tarjeta / efectivo") offers the other way to pay, with the amount, and pays nothing ("No hay problema, también aceptamos efectivo. Son $600.", a new line). "No con tarjeta, en efectivo" is cash (rule 10).
- "Tomo el vuelo de las ocho y diez" recorded the passport as handed over: the same o/a slip as "tengo", "tomo" reaching "tome / toma". `give` ignores "tomo" + more words (a bare "Tomo." still hands over), and `dest_ans` has the "tomo / voy a tomar el vuelo…" forms.
- Flight numbers said digit by digit or in pairs: "El vuelo dos dos tres" was flight 2 plus three bags (the bag question was skipped); "Vuelo dos veintitrés" got "su reservación es para el vuelo 223". A `{code:digits}` reading now takes "dos dos tres", "dos veintitrés", "veintidós tres", "PC dos dos tres". A bare "las dos" / "dos" counts bags only at the bag question (rule 4).
- "Ya no quiero sacar nada" while moving things was "ya" (done) + a refusal: the bag was re-weighed at 24 kilos and then the fee was asked. `pay_fee_ctx` takes the "ya"; a "listo / ya" with a no in it isn't done (a tag "¿no?" doesn't count).
- At "¿Le doy uno de pasillo?" (no window seats), "No, en medio" booked the aisle 14C. It reads "no en medio" (rule 10); a "No, …" there now offers the middle seat and asks ("Lo único que queda es en medio…"); "En medio no" keeps the aisle. After "Entonces, ¿pasillo?", "No, en medio" asks "Perdón, ¿pasillo o en medio?" instead of "¿ventana o pasillo?".
- Seat turns that booked twice or asked twice: "No, ventana no, pasillo" (two opposite questions) is `seat_amb`; "Me da igual, pero no en medio" (booked the aisle, then asked again) is `seat_neg`; "Pasillo o ventana, me da igual" (three bookings) is `seat_any`; "¿Ventana o pasillo?" said back (two bookings) is `seat_rec`; "No pasillo, ventana" is the window.
- At the overweight choice, "Tenga" / "Aquí está" / "Listo" weighed the bag again and said the whole twist again (rule 8); `weigh` now leaves an open overweight question to be asked again. "Aquí tiene mi tarjeta" there chooses the fee (Emilio says the amount before he charges it).

**numbers and facts (rule 11)**: "El vuelo de las nueve" got "Vuelo 223…, perfecto"; a wrong time now gets "Mmm, el vuelo a la Ciudad de México sale a las 8:10 de la mañana" (new line; the passport line then doesn't say the time again), and a wrong number with the right city gets "su reservación es para el vuelo 223". A bare "El de las ocho y diez" is `dest_ctx` (rule 2). "¿Cuánto cobran por kilo?" got "Son $600": the line is now "Son $600 por los dos kilos". "Es muy caro" at the fee got "Son $600"; it now gets the choice again. "¿Le sirve mi tarjeta de residente?" got "Sí, su pasaporte, por favor"; it now gets "Sí, claro, su tarjeta de residente también sirve", and a driver's license or an INE gets "Necesito su pasaporte o su tarjeta de residente" (a foreigner's domestic flight in Mexico takes a passport or a resident card; "Aquí tiene mi licencia" was accepted as ID). "¿Necesita mi pase de abordar?" gets "Por ahora solo necesito su pasaporte".

**understanding**: "Traigo uno en la mochila" / "Sí, traigo un cargador portátil en la mochila" (got the power-bank twist), "No, yo no la hice" (was "Sí, yo" + a no), "No quiero pagar nada", "No pago", "No puedo pagar", "Tengo el pasaporte en la mochila", "Mi vuelo sale a las ocho y diez", "¿La sala 4?", "¿El vuelo sale a las ocho?", "Cinco maletas" (got "Muy bien. ¿Cuántas?"; now up to six). `seat_rec` no longer asks the seat question twice.

**tests**: +22 NLU tests (135), +2 sims (14, all 12/12); corpus 248/248, 0/23; held-out 39/40, 0 traps; vitest green.

**open, unchanged**: the engine's o/a slip ("tengo" / "tomo" reaching "tenga" / "tome" / "toma") is still worked around locally; any conversation with a bare "Tenga" / "Tome" / "Toma" hand-over can record one from "Tengo…" / "Tomo…", so it is worth an engine NEEDS. "documentar" stays untwinned (airline usage). Still unverified and stated as this airline's or this booking's rule: 25 kg per bag, the invented $600, cash at the counter, the fare including one bag (and "su reservación ya incluye sus maletas" for two or more).
