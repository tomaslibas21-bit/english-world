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

## Lead's check (2 Nov 2026)
Numbers, money, the binding choices and the open points. 29 new edge and trap sentences (scratch set: 1/25 understood and 0/4 traps accepted before, 25/25 and 0/4 after) and probe runs of every paid or binding outcome found these; about 50 lines changed and 250 added (fixes, 18 NLU tests, 3 sims).

**Must-fix (all fixed):**
1. **A question left open after paying took a second payment.** "No traigo efectivo, ¿puedo pagar con tarjeta?" and "Con tarjeta no, con el celular" paid, but the "entonces con tarjeta / en efectivo" offer stayed open (and was said first): the next "Sí" paid again, handed a second credential and recorded the phone payment as cash. The other way is now offered by the pay step after the turn's other pieces, so a piece that pays pays alone, and `pay()` never runs twice.
2. **"No tengo tarjeta, aquí tienes" paid by card.** The way handed over is read without the words under "no" / "sin".
3. **Questions about both ways paid.** "¿Puedo pagar con tarjeta o en efectivo?" charged the card and "¿Aceptas tarjeta o solo efectivo?" charged cash. Now "Sí, aceptamos las dos." and the pay step asks how.
4. **Cash amounts were ignored (rule 18).** "Aquí tienes quinientos" or "cien pesos" paid the $600 total (with "Perdón, eso no lo tenemos" for the amount), and "Aquí tienes mil" got no change. Less than the total now pays nothing ("Perdón, son $600."), more pays with "Y tu cambio."; "Te doy mil", "Tome, son seiscientos", "Solo tengo quinientos" and "un billete de quinientos" are understood.
5. **An amount at the total changed the plan (rule 20).** "¿Seiscientos?" at the $100 total switched to the monthly (then "Aquí tienes" paid $600), and "¿Cien pesos?" at $600 switched to the visit. Once a plan is chosen, an amount checks the price on file ("No, son $100."); "La de cien" still chooses, and a real change of plan at the total says the new total.
6. **Questions about a plan chose it (rule 17).** "La mensualidad, ¿qué incluye?", "¿La mensualidad tiene contrato?" (also "eso no lo tenemos"), "¿La visita incluye las clases?", "¿Cien pesos por un día?" (plus "No, es ligero": "pesos" ~ "pesado") and "¿Y la visita?" (by voice too, as in s75) chose the plan. The question is answered and nothing is chosen; the visit and classes get "Con la visita, solo las máquinas. Las clases son para los socios." (classes_info: free for members).
7. **Bookings on a no or an "I don't know".** "Mañana no sé" and "Mañana tal vez" booked tomorrow (then asked "¿Mañana a la misma hora?" again); "A la misma hora no puedo" and "Mañana a las seis no puedo" booked tomorrow and offered Thursday (a "Sí" then kept tomorrow); "El jueves a la misma hora no puedo" booked Thursday. Unsure, a bare "No sé" and a time that doesn't suit are now "Nada más me mandas un mensaje".
8. **The part named first flipped the pain (rule 10).** At "¡Uy! ¿Estás bien?", "La rodilla está bien" was knee pain (arms instead), and "La rodilla no me duele" / "La espalda ya no me duele" recorded the pain, then asked "¿te duele o no?". They are no pain now; "No me duele mucho" is `#amb` (she asks).
9. **Changes at the goodbye were lost.** "Ah, no, mañana no puedo" after "¡Nos vemos mañana!" offered Thursday and the "Sí" kept tomorrow; "¡Nos vemos el jueves!" kept tomorrow. The new day is booked and remembered.
10. **The review's open point.** "No puedo, ¿el jueves?" (aloud "No puedo el jueves") at "¿Mañana a la misma hora?" is `#amb`: "Perdón, ¿entonces el jueves?"; a yes books Thursday, a no is "send me a message". At "¿Qué tal el jueves?" it stays a no.

**Polish:** "¿Cuántos pesos son?" got "Empezamos ligero: cuarenta kilos" (now the total); "Mejor en efectivo" and "Mejor la de cien" got a stray "¡Excelente!"; "Tengo una pregunta" got "Perdón, eso no lo tenemos" (now "¡Claro! Dime.", and no "tengo X" gets it); "Estoy bien, pero me duele un poco la rodilla" said "¡Qué bueno!" before "Para ahí"; "Me duele un poco" at "¿Estás bien?" assumed the knee (now "¿Qué te duele?"); before the form, "No traigo efectivo, ¿puedo pagar con tarjeta?" said "con tarjeta no hay problema" twice; a yes to her own "¿Qué tal el jueves?" got "¿El jueves? ¡Claro!" (now "¡Perfecto! ¡Nos vemos el jueves!"); "yo te cuido" twice after an early "¿Me ayudas?"; "¿Cuánto cuesta?" at the offered visit gets that offer's price (rule 17); "Mañana en la tarde" never gets "a la misma hora"; "Pago con transferencia", "Te transfiero", "No tengo efectivo ni tarjeta", "¿Son seiscientos al mes?" and "Nada más me duele un poco" are understood. Numbers in lines (kilos, hours, prices) and the twins were right.

**Open points:** global g_bye[3] (usted only) stays under NEEDS; this file's closing uses bye_tu. Not changed: "¿Cuánto cuestan las clases?" and "¿Cuánto cuesta el candado?" stay unanswered (lock prices vague by design); a pain with no part named during an exercise still takes the knee; "No, nada" at "¿Qué te duele?" isn't understood.

**Gate:** tsc clean; check-content 154/154 NLU tests, 17 sims all 12/12, fuzz 80, 0/0; corpus 291/291, 0/23 traps; heldout 38/40, 0/3 (the review's two slot-name expectations); vitest 288/288 (both editions).

## Audit (5 Nov 2026)
A fresh reviewer, both texts (N/AUDIT-BRIEF.md). Read: STYLE.md, AUTHORING-ES.md, the brief, this file, the situation
file, the corpus and held-out sets, the cross-audit's leads (`AUDIT/cross/s35-gym.md`) and the neutral side by side
(`AUDIT/neutral/s35-gym.md`); the transcripts at seeds 3 and 7 in full; then about 90 probe turns (tools/probe.ts) of
what a newcomer at a gym would ask or answer at each question, and the 3D room (src/game/world/interiors.ts, `gym`).

**Found and fixed (23):**
- **1. Natural Spanish (2).** The closing "Lo hiciste muy bien hoy. ¡Toma mucha agua!" always followed a praise
  ("¡Lo hiciste muy bien! ¿Mañana…?", "¡Excelente entrenamiento!"), often the same words two lines apart: now "¡Y toma
  mucha agua!". After any side question the plan step asked a bare "¿Cuál quieres?", which right after the showers or
  "Tenemos zumba, spinning y box" read as "which shower / which class?" (the cross-audit's offer probe): a re-ask now
  names the two, "Entonces, ¿la mensualidad o la visita?" / "¿Y cuál prefieres: la mensualidad o la visita?".
- **4. Facts (1).** lockers_info said "al fondo, a la derecha" and "ahí, a la izquierda"; asked twice, the engine says
  the other variant, so both came out. The 3D door is at the back on the learner's right: the second is now "allá
  atrás, a la derecha". (Hours match the sign, Lun–Sáb 6:00–22:00; $600 / $100 realistic; Mónica clashes with no one.)
- **7. Questions and answers (19).** Meaning safety first:
  - "¿Cuál es (la) más barata?" / "¿Qué es más barato?" **chose the visit** (parsed "¿Cuál es" as warm_any + "más
    barata"): a new cheaper_q answers "La visita cuesta $100." + the advice, and choose_plan never chooses on it
    ("Quiero la que es más barata" still does).
  - Typed questions "¿La mensualidad es mejor?", "¿La visita está bien para empezar?" **chose the plan** (with a
    stray "¡Perfecto!"): a "?" with es mejor / está bien / me conviene gets her advice; "¿Me conviene la mensualidad?",
    "¿Es mejor la visita?" (not understood) too. By voice the statement still chooses.
  - At "¿me prestas una identificación?": "No traigo identificación", "No la traigo", "¿Puedo usar mi pasaporte?",
    "Solo tengo pasaporte" were not understood, and "No, se me olvidó" was **the lock** ("En la recepción venden
    candados"): "No te preocupes, me la enseñas la próxima vez." / "¡Claro! El pasaporte sirve.", then the form.
  - At the total: "¿Puedo pagar con tarjeta?" got "¡Perfecto!" (card_tap is now "¡Claro! Acerca tu tarjeta…"),
    "¿Puedo pagar en efectivo?" a bare "¡Gracias!" (now "Claro, en efectivo no hay problema." first), "¿Aceptan
    efectivo?" nothing; "¿Aceptan dólares?" (answered in the town's other conversations: only pesos, or the card),
    "¿Puedo pagar después?" ("se paga antes de empezar"), "¿Me das un recibo?" (after paying: the receipt; before:
    "al pagar te doy tu recibo") and "No traigo dinero" (the card is offered; said again, no money at all is the phone
    or a transfer, never "card, then") had no answer. None of them pays.
  - The classes: "¿Cuánto cuestan las clases?", "¿Cuánto cuesta la zumba?" (it got both plans' prices plus the
    times), "¿A qué hora es la zumba?", "Me interesa la zumba", a bare "Zumba." after "Tenemos zumba, spinning y box"
    (cross-audit): free with the monthly membership, not with the visit; times at the front desk. Her sessions:
    "¿Cuánto cuesta una sesión contigo?" ("se pagan aparte; los precios están en la recepción"), "¿Cuánto cuesta la
    primera sesión?" (free). "¿La visita es para todo el día / solo por hoy?" (all day; never "Solo por hoy", the
    choice). "¿Dónde está la recepción?" ("Ahí, en la entrada", where the 3D desk is).
  - The lock: "¿Necesito uno?" at "¿Trajiste candado?" was not understood; "¿Dónde compro uno?" (a hint) and
    "¿Cuánto cuesta el candado?" got "¡Claro!": lock_borrow_ok is now "Pregunta en la recepción: ahí los venden."
  - "Tengo mucho calor" / "Tengo sed" at "¿Cómo te sientes?" were read as "¿Tienen…?" and **dropped without a
    word**: now tired / water ("Es normal…", "Descansa y toma agua"; at the door "¡Qué calor!" gets the water).
  - At the machine (working): "¿Hay otra?" got "Nada, funciona bien" (now her nudge); "¿De quién es la toalla?",
    "¿Le quito la toalla?" she checks it's free. "Nada" / "Nada, estoy bien" at "¿Qué te duele?" (the lead's open
    point) and "¿Puedo sentarme?" at the last question are understood.
  - At "¿Mañana a la misma hora?": "Mejor en la tarde", "Mejor más temprano", "Mañana más tarde" book tomorrow
    ("¡Nos vemos mañana!", never "a la misma hora"); "Más tarde te aviso" is "send me a message" (a first "más tarde"
    in when_ctx booked tomorrow and said "send me a message" in one turn; caught by a probe and removed).
- **9. Accepted answers (1).** The held-out set's two misses were its own expectations (the review said so): "Nomás
  por hoy" carries the visit as a tag, "Nos vemos el lunes" fills `weekday`. Corrected, with notes: 40/40.
- **2 (tú/usted), 3 (names), 5 (glosses, English), 6 (spelling, ¿¡), 8 (hints), 10 (neutral): nothing wrong.** The
  "Y ¿me prestas…?" / "Y ¿cuándo quieres regresar?" placement of ¿ is accepted (RAE) and stays. Every gloss checked
  line by line; flags point at their units. The 11 twins are right and no line lacks one; the new lines use no
  Mexican-only word. "Aquí te la regreso" stays without a twin, as "me lo regresa" does in s82.

**Probe set (one new held-out item had collided):** "Mejor solo la visita de hoy" matched the first "la visita es por
hoy" pattern (the engine forgives a missing "es" and por/de); the pattern now needs "solo" right after the verb.

**New lines (13 clips per accent) and changed lines (4):** plan_reask ×2, classes_free, class_times, trainer_price,
reception_where, id_later, passport_ok, pesos_only, pay_first, receipt_here, receipt_later; card_tap, lockers_info[1],
lock_borrow_ok, closing[1].

**Tests:** 21 NLU tests and 2 sims (a newcomer's questions; no ID, no money, the lock, nothing hurts); corpus +60
sentences and +6 traps.
**Gate:** tsc clean; check-content 175/175 NLU tests, 19 sims all 12/12, fuzz 80, 0 errors / 0 warnings; corpus
351/351 (was 291/291), 0/29 traps accepted; held-out 40/40 (was 38/40), 0/3; vitest es 107/107.

**Left for the lead:** TOWN.md "Found on the way" still says s35's intro greets the learner at the front desk (it
says the gym floor, by the bench press, since the earlier fix). The global g_bye[3] usted-only NEEDS stands. A
cross-cutting check worth running: lines whose variants state different facts (a direction, a number); the variant
rotation says both when a question is asked twice. Unanswered, by choice: "¿Cuál es la contraseña del wifi?" (not
"Sí, la contraseña…"), "¿Puedo traer a un amigo?", "¿Me das factura?", "¿Puedo pagar la mensualidad con tarjeta?"
(not understood, safe).

## Spain twins (11 Nov 2026)

36 twins + 2 Spain nouns. Mónica says tú (unchanged). Spain's gym words: vestuarios (vestidores; the lockers forms and
patterns now take vestuarios / taquillas), aseos, cinta (caminadora; `attrs.spain: "cinta"`), tarjeta de socio (credencial; Spain
noun too), boxeo (box), asas + coge (agarra las manijas), aparcamiento / aparcar, datáfono, móvil, devuelvo, volver, and Spain's
perfect for today ("¿Has traído candado?", "Ya has calentado", "¡Te lo has ganado!", "¡Lo has hecho muy bien!", the hint "¡Lo he
conseguido!"), "solo por la mañana". Kept: the learner's "¿Qué horario tienen? / ¿Tienen…?" (the hint's note explains ustedes = the
gym; Spain says it too, and the grammar takes "tenéis", see the corpus). Spain corpus: 15 items (apuntarme, tenéis, boli, vestuarios,
aseo, móvil, datáfono).

## Spain review (12 Nov 2026)

Fresh reviewer, against docs/es/STYLE.md "Spain Spanish": every line's Spain reading (twin, else neutral), the hints and
example answers, tú/usted and vosotros by the Spain rule, meaning and English against the Mexican line, Mexican-only
things kept, and the Spain corpus.

Found and fixed: The writer's own twins said ¡Listo! (warmed_up, done_it) → ¡Ya está!; Listo lines → Ya está / ¡Hecho!; seguido → a menudo; llena → rellena; ¿me prestas una identificación? → ¿me enseñas un documento de identidad?; casilleros → taquillas; descompuesta → estropeada; acuéstate en la banca → túmbate en el banco; ¿sí? → ¿vale?; remadora/¡Dale! → máquina de remo/¡Venga!; toma agua → bebe agua; Igual → Aun así; learner to the gym: ¿Tienen…? / ¿Cobran…? → vosotros (¿Tenéis…? ¿Cobráis…?), noted: q_hours keeps its ustedes note in English; hints in the perfect (he traído, se me ha olvidado, he vuelto, he entrado en calor, ha sido duro, ¿qué le ha pasado?), grammar extended.

English of every twin checked against its Mexican line (restored where a twin had rephrased it). Spain corpus items
added for the new forms. Gates: Mexican, neutral and Spain checks 0 errors; coverage 0 false accepts.

