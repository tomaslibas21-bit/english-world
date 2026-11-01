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
