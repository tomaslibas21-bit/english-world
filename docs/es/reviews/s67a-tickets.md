# Review: s67a-tickets (bus tickets, Don Raúl), writer's commit 16405865

## Gate and blind set
| Check | Before (writer) | After (review) |
|---|---|---|
| tsc | clean | clean |
| check-content | 107/107 NLU, 10 sims 12/12, fuzz 80, 0/0 | 124/124 NLU, 14 sims 12/12, fuzz 80, 0/0 |
| corpus | 173/173, 0/22 false accepts | 222/222, 0/39 (66 probe items added) |
| blind set (42 items, written before reading) | 32/37 = 86.5%, 0/5 traps | 36/37 = 97.3%, 0/5 traps |

Blind misses before: "No voy a Cancún, voy a Mérida", "Todavía no sé cuándo regreso", "Hoy mismo", "Ventanilla no, mejor pasillo"; "¿Tiene baño el autobús?" goes to ask_wifi, whose reply ("Tiene aire acondicionado y baño…") answers it (my label was wrong). A post-read probe of 78 items found 9 more gaps and 1 flip.

## Fixes (about 150 lines changed or added in the conversation, 17 NLU tests, 4 sims)
**meaning-safety, must-fix (~35 lines)**
- Sold-out twist on the wrong day: "¿Viaja hoy?" "No, el viernes" + the morning bus → "¡Híjole! … lleno … Hoy ya no hay otro. Mañana…". The twist and the "full" checks now apply only to today (`fullNow`).
- Inside the sold-out questions any day but today booked *tomorrow* ("Mejor el viernes", "pasado mañana"), and "Hoy" at "¿Se lo doy para mañana?" booked tomorrow. Now: that day's bus; "Hoy" → "Hoy solo queda el de las 5:15. ¿Se lo doy?" (`onDay`).
- "Quiero ir a la playa" (the beach) booked Playa del Carmen. "la playa" without "del Carmen" now gets "¿A Playa del Carmen?" (yes/no).
- "El de la mañana no, el de la tarde" (commas lost, rule 10): `#amb`, Don Raúl asks the time again; with "mejor"/"sino" it is read as the correction.

**understanding, must-fix (~35 lines)**
- "¿A qué hora sale…?" before the time step got "¿Cuál le doy?", but no answer was understood there. It now says both departures as information, and the current step asks its own question.
- No way to decline the 5:15 or tomorrow in words: "No, esa hora no me sirve", "Es muy tarde para mí", "Mañana no puedo" (`late_no_ctx`, `tomorrow_no_ctx`, pending-only).
- "No, eso es todo" right after "Aquí tiene su boleto" got "¿Algo más?"; now the time and gate (ticket step `no`, `more_no`).
- Breadth: "No voy a X, voy a Y", "Somos dos" at any step, "(Todavía) no sé (cuándo regreso)", "Hoy mismo", "Sí, solo", "El primero que salga", "Ventanilla no, mejor pasillo", "Pasillo no", "Cerca de la ventana", "Lo tengo en el hotel", a bare "No" at the ID question, "Sí, una pregunta".

**spanish / rule 11 (~15 lines)**
- Must-fix: "¿Hay descuento para niños?" got "Sí… estudiantes y adultos mayores pagan la mitad". New vague line: "Los niños también tienen descuento, según la edad."
- Polish: "¿Es directo?" for a bus with stops: "Sí, es directo. Nada más hace parada en…" → "Sí, no tiene que cambiar de autobús." + the stops.
- Polish (rules 8, 13): tomorrow's bus is offered once (a second no ends the visit); a second "no ID" gets "Con su nombre completo basta." instead of the same line; a second variant for "¿Y para qué hora…?".

**gloss-english, numbers, twins, facts, structure: no must-fix.** Read every NPC line and about 45 glosses: right. Totals checked in transcripts (Mérida 2 × round-trip $2,880, senior $35, student $90). Flags point at their units. 3 Mexican-only lines (pásele, híjole, ahorita), each with a neutral twin. Tulum is half an hour away, as in s62. Steps match the English file, apart from the brief's changes.

## For the lead / owner
- The writer's open points stand: invented fares and times; "pagan la mitad" for students and seniors (in reality: limited seats, school vacations for students); INAPAM by name; no open return.
- Kept: the discount takes half off one ticket, even for "Somos estudiantes" with two tickets. Kept: when the learner says "Con tarjeta" before the total, Don Raúl says the total and charges in the same turn.

## Lead's check
30 new edge and trap sentences (numbers, money, corrections, the sold-out answers, discounts): 15/26 understood and 1/4 traps accepted before, 26/26 and 0/4 after; added to the corpus. Handler-level flips were found in transcripts and are covered by 6 new sims.

**Must-fix (meaning, money)**
- "No con tarjeta, en efectivo" charged the card (two pieces, the card first). "No X, Y" and "X no, mejor Y" corrections for card and cash; "Tarjeta no, efectivo" (commas lost) is `#amb`: "Perdón, ¿efectivo o tarjeta?".
- "se" is a droppable word, so "no (se | lo se)" matched a bare "no": "No" and "No, el domingo" at the return question sold a one-way ticket, "El lunes no" booked Monday. Rewritten so "se" stays; "{day} no" is `#amb`.
- The sold-out flag was not per destination: after "Mejor a Tulum", Tulum's 10:15 was "full"; "No voy a Cancún" left the question open and the next answer crashed. `full` now holds the destination, and buy / change_dest / not_dest close the sold-out questions.
- Sold-out answers dropped the time: "El viernes a las cinco", "Mejor mañana en la tarde" booked the morning bus, and at tomorrow's offer "Sí, mañana a las cinco" booked today's 5:15, already declined. The time said is kept; tomorrow's is said with "mañana".
- "No, a Cancún" (commas lost) on a ticket for Mérida got "Perfecto." and kept Mérida. Now a correction, and every change of place is said back ("Claro, a Cancún."); "A Mérida no, a Cancún" is `#amb`: "Perdón, ¿a dónde va entonces?" (also after the goodbye). After "No voy a Mérida" the dest step asks again, so a bare "A Cancún" answers it. A new place after the time or gate was told: the new ticket comes with the new ones.
- "¿Cuánto es?" after "Le cobro $2,880" gave the fares ($720, $1,440). It now gives the order's total (`total_is`, the same words as `say_total`, so the same clip); "¿Cuánto le debo / es en total / sería?" understood.
- Teachers got the student half ("Soy maestra" was `#student`; "¿Hay descuento para maestros?" got "Sí… estudiantes y adultos mayores…"). In Mexico teachers get less, only in school vacations (rule 14): "Los maestros solo tienen descuento en vacaciones.", no discount applied.
- Prices for 5–9 tickets (countOf reads them) were outside the price domain, so not recorded.

**Breadth:** "Sí, de estudiante / del INAPAM", "No, ninguna de las dos", "Somos jubilados", "Quiero pagar con dólares", "¿Se puede con tarjeta?", "Hoy en la tarde" as one answer, "Mañana en la tarde" at the time or day question sets both.

**New lines (5):** which_dest, dest_changed ({X}), which_pay, total_is, teacher_disc.

**Gate:** tsc clean; check-content 139/139 NLU, 20 sims 12/12, fuzz 80, 0/0; corpus 248/248, 0/43; heldout 36/37, 0/5 traps; vitest 257/257 in both editions.

**For the owner:** the open points stand; note that in Mexico the student half, like the teachers' discount, applies only in school vacations (2025–26 press on the SEP-period bus discounts: students 50%, teachers 25%, limited seats). Left as is: "Un boleto a Valladolid" gets "no hay salidas para allá", though the Mérida bus stops there.

## Audit (5 Nov 2026)

Fresh reviewer (N/AUDIT-BRIEF.md): both texts, the transcripts at seeds 3 and 7 read in full, six probe sets
(`tools/probe.ts`, ~90 turns), the cross file's leads, and the real region checked for the facts (ADO-style coaches on
the Riviera Maya, Nov 2026: ADO's Tulum–Cancún ~$300–350, Tulum–Mérida ~$500–750 and ~4 h 20, Tulum–Playa ~1 h 10; 25 kg
of luggage free; INAPAM's half all year; the students' half and the teachers' quarter only in the SEP's school
vacations, summer 2026 16 July–30 August). The town's fares and times ($70 / $180 / $380 / $720; 30 min / 1 h 30 /
2 h 30 / 5 h from 30 minutes south of Tulum; the morning buses and the 5:15 on the terminal's board) hold and stay.

**Found 22, fixed 22** (by point: 1:2 2:0 3:0 4:2 5:5 6:0 7:10 8:2 9:1 10:0).

- **4, facts (must-fix):** "Con credencial, estudiantes y adultos mayores pagan la mitad" and the card question for a
  student card gave students half off in November. Now `discount_info` says the INAPAM half only, `ask_discount` asks
  "¿Tiene credencial del INAPAM?", and a student (asking, claiming, "Sí, de estudiante", or showing the card, even when the
  NLU splits "credencial | de estudiante") gets the new `student_disc` "Los estudiantes solo tienen descuento en
  vacaciones." (the teachers' line's twin) and the full fare; said again, the short `vac_remind` "Lo siento, solo en
  vacaciones." The INAPAM path is unchanged (the card question's yes now defaults to "senior").
- **7, answers and meaning (10):** "Quiero un boleto redondo" (and "Un boleto sencillo") at "¿Sencillo o redondo?" was
  the unknown place "redondo" ("Lo siento, de aquí no hay salidas para allá"): trip_ans takes the ticket word, and
  "Dos boletos sencillos" counts two. "¿A qué hora sale el último / el primero?" at the departure question booked that bus
  (ask_next + time_ctx): now an `ask_other_ctx` question (both times, asked again); at the sold-out offer "¿Hay uno más
  tarde?" was "la una" + "más tarde" and booked the 5:15: now "Hoy solo queda el de las 5:15. ¿Se lo doy?"; at
  tomorrow's offer the same booked tomorrow's 5:15 after a stray "¿Y para qué hora…?": now tomorrow's two buses and which
  one, where a "No" walks off as at the offer ("¿Más temprano?": "No, el primero es el de las…", the offer kept). "¿A qué hora sale?" at the sold-out offer got
  "Sí, el de las 5:15" (rule 11): new `next_at` "El siguiente sale a las 5:15…", the offer kept open. "¿Cuántas maletas
  puedo llevar?" got "Claro. Su maleta va abajo…": new `luggage_limit` "Puede llevar hasta 25 kilos sin costo." (also
  "¿Cuántos kilos…?", "¿Hay límite de equipaje?"). "¿Puedo pagar con el celular?" got "Acerque o inserte su tarjeta": new
  `phone_ok` "Claro, acerque su celular a la terminal." Understood now: "¿A dónde tienen salidas?" (cross lead), "¿A qué
  hora sale el último autobús a Cancún?" (both departures, never "su autobús"), "¿Cuánto cuesta para niños?" / "¿Los
  niños pagan?", "¿Dónde está el andén?"; "¿Los estudiantes tienen descuento?" / "¿Aceptan la credencial de estudiante?"
  tagged (they got the general line).
- **1, flow (2):** after "¿A Playa del Carmen?" a "No, a Tulum." got the whole destination list first (cross lead): the
  list now only for a bare no. Travelling another day with the twist on, "El primero" got no "Muy bien, el de las 11:30…"
  (the check didn't ask whether the sold-out step really follows); fixed, and a bus picked after the sold-out offers is
  said with "mañana" (`tomorrow_ok`).
- **5, American English (5):** "shall I give" in the glosses of sold_out (both texts), sold_remind, today_only and
  tomorrow_offer, and "Shall I give you…?" in three natural lines: "should I give" / "Should I give you that one?" (not
  voiced).
- **8, hints (2):** discount_ans: "No, ninguna." ("neither" of two cards) → "No, no tengo."; "Soy estudiante." kept with a
  note (students and teachers: school vacations only); show_card: "Aquí está mi credencial del INAPAM."; the step's label
  "Say whether you have an INAPAM senior card".
- **9 (1):** the held-out "¿Tiene baño el autobús?" was labeled ask_restroom only; ask_wifi answers it ("Tiene aire
  acondicionado y baño"), as the first review noted: both accepted.
- Checked and right: names (Don Raúl only; no clash), usted throughout (hints too), spelling and ¿¡, the three neutral
  twins (pásele, híjole, ahorita; boleto is shared, no twin), every flag on its unit, every gloss of the new lines, the
  in-terminal places against the 3D room (benches in front of the window, the shop by the door; no town directions), and
  every fare and time a line can say: `price` (97: every total for 1–9 tickets, one-way or round, with or without one
  half), `at` (13: the four morning buses, the 5:15, every arrival), `late`, `num`; `tools/es-voices/reach-es.ts` gives
  each value line its whole list, so all are voiced.

**Voiced lines changed:** ask_discount, discount_info; new: student_disc, vac_remind, next_at, luggage_limit, phone_ok;
hints discount_ans.no_discount and show_card.here_id.

**Tests:** NLU 139 → 149; sims 20 → 23 (the student sim rewritten for the full fare; new: a student at the INAPAM question
paying by phone, full sentences with the place in the no, questions at both sold-out offers); corpus 248 → 287 understood,
traps 43 → 46, 0 false accepts; held-out 36/37 → 37/37, 0/5.

**For the lead / the owner:**
- Owner: students now pay the full fare (the half is for school vacations only, like the teachers' quarter). If the game
  should keep a year-round student half as a simplification, it is a small revert.
- Kept (earlier reviews): two seniors ("Somos jubilados") get half off one ticket; "Un boleto a Valladolid" is not sold
  (the Mérida bus stops there).
- Shared (proposals): `{time}` reads a bare "uno" as "la una" ("¿Hay uno más tarde?" → 1:00), rule 4, edition-wide
  wherever a step expects a bare `{time}`; the parser splits a question into a plain question + the step's expected
  `_ctx` piece ("¿A qué hora sale | el último?" → ask_next + time_ctx: the piece books), handled here by giving the step
  the whole question. The picture prompt for `s67a-tickets/card` says "a student card or a senior card?" (the picture is
  a blank card and fits).

## Spain twins (11 Nov 2026)

- 57 Spain twins (lines and hints), 16 items in tests/es/spain/s67a-tickets.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Don Raúl keeps usted.
- Words: billete(s) for boleto(s), ¿Solo ida o ida y vuelta? for ¿Sencillo o redondo?, la vuelta and vuelvo for el regreso and regreso, por la tarde, plazas / asientos / sitio for lugares, delante, ¿Me deja su documentación?, profesores for maestros, móvil and datáfono, Perfecto for Listo, solo hace parada, tienda, aseos, en el maletero for abajo del autobús, sin coste, Vale, deme ese.
- Grammar: ret_ctx takes por la mañana/tarde/noche; no_id takes llevo and documentación/carné; show_id takes mi carné; seat_taken takes sitio. Merges: solo ida, (de) ida y vuelta, he anotado, en el maletero, sin coste, por la tarde.
- Kept: INAPAM and its credencial (Mexico's own).
