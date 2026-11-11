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

## Audit (5 Nov 2026)

A fresh reviewer, both texts, on spanish-edition after the five fixes (db00d9c3). Read: STYLE.md, AUTHORING-ES.md's
rules, the brief, this review, the audit's cross-checks (names, facts, spelling, English, neutral twins, the offer
probe: nothing flagged here); the file, the corpus, the blind set; the transcripts at seeds 3 and 7, then the neutral
text with its unit glosses for a female learner; about 60 extra turns played with tools/probe.ts; the voice line list
(tools/es-voices/lines-es.ts) and values-es.ts for this conversation; the offer probe again after the fixes, in both
texts (0 flags).

**Found 25, fixed 25** (by point: 1: 3, 2: 0, 3: 0, 4: 5, 5: 0, 6: 0, 7: 16, 8: 0, 9: 1, 10: 0).

**1. Spoken lines and flow**
- "No quiero en medio" → "Claro. Entonces, ¿ventana o pasillo?": a bare "Sí" got the same line again plus the seat step's
  own "¿Prefiere ventana o pasillo?". A bare yes or no now gets the short "Perdón, ¿ventana o pasillo?".
- "No quiero ventana" → "Entonces, ¿pasillo?" → "No" got "¿Prefiere ventana o pasillo?" and "¿Tiene alguna preferencia de
  asiento?", two questions offering the two refused seats. Now "Entonces, ¿en medio?" (new line; a no to it lets the seat
  step ask once).
- Voice: "Perdón, ¿{X} o {Y}?" was the edition's only line with two entities, which the voice line list doesn't expand,
  so only the pairs random talk reached were voiced ("¿ventana o pasillo?", "¿pasillo o ventana?"); the four with "en
  medio" ("Perdón, ¿pasillo o en medio?" after "¿Pasillo?" → "No, en medio") would have played in the device voice. The
  seats are now values with a list ({$sa}, {$sb}: ventana, pasillo, en medio): all six pairs are in the list, in both
  accents (and three same-seat pairs nobody says, which a reach-es.ts rule could drop).

**4. Facts**
- The two directions to security disagreed ("por allá, a la izquierda" / "derecho, pasando la cafetería"); asked twice,
  the learner heard both. Both say left now ("Seguridad está a la izquierda, pasando la cafetería"): the room has the
  filtro east of the counter, on the left as you walk away from it, and the restrooms stay "junto a la cafetería".
- After the fee was paid, "Mejor saco unas cosas" got "No hace falta. Su maleta pesa menos de 25 kilos" (it weighs 27),
  and "¿Puedo pagar con tarjeta?", "Lo pago", "¿Cuánto es?" got "Hoy no tiene que pagar nada" or "no tiene costo". Now
  "No hace falta, ya pagó el sobrepeso" (new).
- The bag tag said "el comprobante de su maleta" to a learner with two or more bags: "Y estos son los comprobantes de sus
  maletas" (new) for them, and it isn't handed over twice when the learner asked for it first.
- "No hace falta. Su maleta pesa menos de 25 kilos" to two bags: "Sus maletas pesan menos de 25 kilos" (new); carry-on
  only gets "Muy bien".
- Before the bag question, "¿Aceptan tarjeta?" / "¿Aceptan efectivo?" / dollars got "Hoy no tiene que pagar nada", though
  the bag may still be over: the ways to pay now, as once the bag is named and not yet weighed.

**7. Questions answered wrongly or not at all** (each played in a turn; the new lines are in both accents' lists)
- Wrong: "¿Dónde está la sala 4?" got "Es la sala 4" → "La sala 4 está pasando el filtro de seguridad" (new; twin "La
  puerta 4 está pasando el control de seguridad"; s64b's officer says the gates are past security). "¿Tengo que pagar
  por la maleta?" at the overweight choice got "no tiene costo" right after the $600 → "Son $600 por los dos kilos".
  "¿Cuánto cuesta el sobrepeso?" with nothing over got "no tiene costo" → the limit before the scale, nothing to pay
  after. "¿Cuánto pesa mi maleta?" before the scale got the limit → "Primero vamos a pesar su maleta". The fee in cash,
  asked again after a side question, was "Acerque su tarjeta aquí" → "Son $600, por favor" (new).
- Not understood (silence, then "no entendí"): "¿Aceptan dólares?" / "Solo traigo dólares" → "Lo siento, solo aceptamos
  pesos. También puede pagar con tarjeta" (new; as s31 and s35 answer it); "¿Tiene terminal?" → paying by card (as s31);
  "¿Me da un recibo?" after the fee → "Claro, aquí tiene su recibo" (new), the bag's claim tag(s) when asked for them,
  nothing to pay otherwise; "¿Cuál es el número de mi vuelo?" → "Es el vuelo 223, a la Ciudad de México" (new; before the
  booking is found, the passport lookup); "¿Es directo?" / "¿Hace escala?" → "Es un vuelo directo, sin escalas" (new, no
  sí or no that answers only one of them); "¿Puedo llevar líquidos?" → "En el equipaje de mano, solo en envases de 100
  mililitros o menos" (new, s64b's rule); "¿Tengo que documentar la mochila?" → "No, la puede llevar como equipaje de
  mano" (new; carryon_ok's "Sí, …" would have meant yes); "¿Cuántas maletas puedo llevar?" → the fare's one checked bag;
  "¿Dónde recojo mi maleta?" → "En la Ciudad de México, al llegar" (new; s64c says baggage claim, on landing);
  "¿Puedo cambiar de asiento?" → "Claro, no hay problema" and the seat question (the boarding pass is updated, as for a
  named seat); "No traigo mi pasaporte" → "Necesito su pasaporte o su tarjeta de residente"; "No tengo pasaporte, pero
  tengo mi tarjeta de residente" is a hand-over.

**9.** "Sí, la empaqué yo sola" was two intents and two acknowledgements ("Muy bien. Perfecto, gracias."): one pattern now.

**Checked, nothing to change**: tú/usted (Emilio and the hints say usted; tú to him is understood with the tip); names
(Emilio only); flight 223, sala 4, 7:30 and 8:10 as in s64c and TOWN.md; $600, 25 kg, 12A/14C/23B; every gloss and
flag index (the new lines' too) and the American English; spelling and ¿¡; the eight neutral twins (and "sale" in
found_booking is "leaves"); every value list (values-es.ts: every value said is listed and kept). The flight's length
("más o menos dos horas") and s64c's "unas dos horas y cuarto" agree as estimates. "No veo ninguna reservación a
Guadalajara para hoy" before the passport stays (the game knows the learner; two reviews kept it). The 3D airport has
no café or restrooms by the counter; the lines' café (landside) contradicts nothing (s64c's is across from gate 2).

**Tests**: NLU 135 → 155 (+20, 2 of them traps), sims 14 → 15 (no passport, the side questions, the fee in cash asked
again, window and aisle refused, the receipt, where the gate is), 12/12 seeds each; corpus 248/248 → 287/287, false
accepts 0/23 → 0/27 (+39, traps +4); blind set 39/40 as before (the harmless "¿Aquí la pongo?").

**For the lead** (shared files, proposals): tools/es-voices/reach-es.ts could keep "s64a-checkin:seat_which" to two
different seats (`b.sa.en !== b.sb.en`), dropping three clips per accent nobody hears; lines-es.ts (or check-content)
could warn about a line with two entity placeholders, which the voice list never expands (none left in the edition).

## Spain twins (11 Nov 2026)

- 36 Spain twins (lines and hints), 21 items in tests/es/spain/s64a-checkin.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Emilio (the airline) keeps usted.
- Words: facturar for documentar, reserva for reservación, embarque for abordaje, (maleta) facturada, coste for costo, aseos for baños, móvil, dentro for adentro, llevar for traer (what you carry), jersey for suéter, ¿Me deja su pasaporte? for ¿Me permite/presta…?; the perfect: ¿Ha hecho usted mismo su maleta?, Sí, la he hecho yo, ya he encontrado su reserva, ya ha pagado el sobrepeso; Ya está for Listo.
- Grammar: packed_yes takes la he hecho (yo / yo mismo/a); ack_done takes ya lo he cambiado; ask_dollars takes solo llevo dólares; the sweater entity takes jersey.
- Nothing left for the lead.
