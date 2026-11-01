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
