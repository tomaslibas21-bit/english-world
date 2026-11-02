# Review: s35-gym "¡Una más!" (writer's commit 5d25d2be, 2146 lines)

## Gate and blind set
| | Before (writer) | After (review) |
|---|---|---|
| tsc / vitest | clean / 288 of 288 | clean / 288 of 288 |
| check-content | 118 of 118 NLU tests, 12 sims at 12/12, fuzz 80, 0/0 | 136 of 136 NLU tests, 14 sims at 12/12, fuzz 80, 0/0 |
| corpus | 276/276 (100%), 0 of 20 traps accepted | 291/291 (100%), 0 of 23 traps accepted |
| blind set (43, written first) | 37/40 (92.5%), 0 of 3 traps | 38/40 (95%), 0 of 3 traps |

The blind set's two remaining "misses" are my own slot expectations: "Nomás por hoy" picks the day pass from a tag, not a slot, and "Nos vemos el lunes" fills `weekday`. Probing showed both are handled correctly. The blind score didn't find the worst bugs. Playing whole conversations with probe.ts did (rule 22).

## Fixes (about 104 lines added and 28 changed in the conversation, plus 18 corpus items)
**meaning-safety, must-fix (~30 lines)**
1. "Mañana no puedo, ¿el jueves?" at "¿Mañana a la misma hora?" was parsed as when_ctx "mañana" + day_no and booked **tomorrow**. Whole-sentence next_day patterns now cover it ("No puedo mañana, ¿qué tal el viernes?" too).
2. "No entiendo" / "No entendí" / "No todo está claro" matched `ready` through a leading `[no]`. At "¿Alguna pregunta?" that started the sets, and in the rep pending it counted the rep as done. Now the global "don't understand" (repeat) handles them; "No, ya entendí" and "No entiendo cómo funciona" (ask_how) work.
3. "¿Cuánto es por un mes?" at the plan step was ask_price + choose_plan and **chose the monthly plan** (rule 17). Now a price word in the turn never chooses; ask_price answers once per turn.
4. At the total, "Aquí está mi tarjeta" paid and recorded **cash**. Now the card handed over is a card payment. "Aquí está mi identificación" (the ID asked for at the form) **paid** the total. Now Mónica gives the ID back and nothing is paid.
5. "No tengo tarjeta" then "No traigo efectivo" kept cash on file, said two questions in a row, and then a "Sí" **paid cash**. Now she offers the phone or a transfer, the stored method is cleared, and a "Sí" pays nothing.
6. "No me duele" (no body part; said aloud it is also "No, me duele") was not understood at "¿Estás bien?". It is now `#amb` (rule 10): she asks, and a "Sí" asks what hurts instead of assuming the knee. "No, no me duele" is clear.

**understanding / rule 11 (~25 lines)**
- "¿Tienen clases de yoga?" got "¡Sí! Zumba, spinning y box". Now: "Esa clase no, perdón. Tenemos zumba, spinning y box."
- "¿Tienen pesas / aire acondicionado / clima? ¿Hay baños / máquinas de cardio?" got "Perdón, eso no lo tenemos". A new `basics` amenity answers "¡Sí, claro!", and the restrooms get their place.
- "¿Es caro?" / "¿Es cara la mensualidad?" repeated both options. Now: "Para la zona, es un buen precio."
- "¿Está ocupada? / ¿La estás usando? / ¿Te falta mucho?" got "¡Sí, está libre!". The line is now "A ver... ¡Está libre!". "¿Qué le pasó?" got "No, está bien", now "Nada, funciona bien."
- "No quiero pagar en efectivo" / "No en efectivo" offer the card (rule 18). "¿Puedo usar la bici?" chooses the bike.

**spanish / structure, polish (~8 lines)**: "Bienvenido" was said twice in a row (greeting + intro). "¡Excelente primer entrenamiento!" in the closing also played on later visits (the twists) and followed another "¡Excelente!", so it is now "¡Y no olvides estirar!". "Mañana a las siete" got "Mañana, a la misma hora", so a new see_tomorrow_plain line fixes that.
**gloss-english, polish**: flags moved to the right unit, lb_note ("como") and ask_change ("te") (rule 15). The glosses I checked (about 50 lines) are fine.
**numbers / twins / facts**: no change. $600 a month and $100 a visit are plausible for small-town Quintana Roo. The hours, classes and "no inscripción this month" are invented but harmless. The twins are correct and stay under one line in eight. The Gimnasio Colibrí name matches locations.ts.
**tests**: 18 NLU tests (traps and breadth), 2 sims (hand-overs + "No entiendo" + Thursday; no card and no cash → phone), and 18 corpus items.

## For the lead
- The writer's NEEDS stands: global g_bye[3] is usted only ({u:le|t:te}).
- These stay unanswered but safe (they pay nothing): "Ya pagué", "¿Y si pago con tarjeta?", "¿Y si vengo el sábado?". Said aloud, "No puedo, ¿el jueves?" reads like "No puedo el jueves" (day_no → she says to send a message later). It is not flagged `#amb`.
- If the learner asks the price at the door, the price answer sets `introduced`, so Mónica never gives her name (the English edition does the same).
