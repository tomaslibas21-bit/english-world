# Review: s76-dentist-call (writer's commit 3f3e2af6)

| Check | Before | After |
|---|---|---|
| tsc / vitest | clean / 287 | clean / 287 |
| check-content | 110 NLU, 10 sims 12/12, fuzz 80, 0/0 | 124 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus | 219/219 (100%), 0/26 false accepts | 237/237 (100%), 0/26 |
| blind set (42, 11 traps) | 39/42 (92.9%), 0 traps accepted | 42/42 (100%), 0 traps (no longer blind) |

The scores were strong, but probe.ts found 7 meaning-safety bugs in how turns were handled. Changes: +110 / -22 lines.

**meaning-safety, must-fix (~45 lines)**
1. "No el martes, el miércoles" at Tuesday's offer **booked Tuesday**. Fix: "no X, Y" is now a day_req correction, and a turn containing "no" never books through pick_ctx.
2. "El martes, no el miércoles" with Wednesday on offer booked Wednesday (lost comma). Fix: a correction only asks again.
3. "No, todavía no" at "¿Ya había venido antes?" became speak_up. Fix: speak_up needs "se oye / la escucho"; "todavía no" counts as a new patient at that question only.
4. "No es mi primera vez" at "¿Ya había venido antes?" silently recorded a new patient (rule 10). Fix: Lorena asks "Perdón, entonces, ¿es su primera vez con nosotros?".
5. "¿Y pasado mañana?" outside the twist offered tomorrow 9:30. On the move path that was the appointment being moved. Fix: "ese día ya no tengo lugar", then the next opening.
6. After booking, "¿Puedo cambiar la cita…?" or "Sí" to "¿Quiere cambiarla?" got "Su cita ya quedó…". A cancel kept the appointment ("¡Lo esperamos el martes!"). Fix: a change frees the time and offers another (the day asked for first). A cancel clears the appointment and the time question isn't asked again. Arrival and text lines: once per call.
7. "Así está bien" gets the question again (kept), but after that any turn with "así" in it booked. Fix: only "así está bien" again books. Also "No voy a pagar yo, tengo seguro" quoted the self-pay price; it is now insurance_yes.

**understanding (~30 lines)**
- At the time question: "Ese día no", "No, mejor otro día", "No tengo tiempo el martes", "No me queda bien el martes a las diez", "Sí, pero en la tarde", "Prefiero no en la mañana". "El martes no puedo, ¿y el jueves?" got two offers in one turn; it now gets one.
- Cancel and move: "No, nada más cancélela" and "No quiero cancelar, quiero cambiarla".
- Insurance: travel or medical-only insurance counts as paying yourself. New insurance_q "¿Aceptan seguro?" gets a vague "Depende del seguro…".
- Other: "¿Dónde están ubicados?" and "Gracias, es todo" (it only thanked, and the call stayed open).
- A day asked before booking ("¿Tiene algo el lunes en la mañana?") made Lorena re-ask how she could help. It now starts the booking and remembers the part of the day.

**spanish (~10, polish)**: "¡Ay, qué pena!" for a toothache reads as "how embarrassing" in Mexico; a local line replaces it ("¡Ay, lo siento!" / "¡Uy, qué mal!"). "Vamos a buscarle algo pronto" now comes with the soonest opening. "Por ser primera vez" is said only to a known new patient.

**gloss-english, numbers, twins, facts, structure: no fixes.** About a third of the glosses and flag indices checked. Also checked: dates (day first, US tip), phone numbers in pairs, letter names, the 2 twins (¿Bueno?, ahorita), calle Morelos (also in s65b), and the steps, intents and 3+1 twists against the English. **tests (~35)**: 14 NLU traps, 2 sims, 18 corpus items.

**For the lead / owner**: global.ts g_sorry_to_hear "¡Ay, qué pena!" (also used in s65a) → suggest "¡Ay, lo siento!" (`// NEEDS:` in the file). The writer's unsure facts stay as they were: $400 valoración, the hours, 15 minutes' tolerance, and the dentist speaks English. After booking, a bare "Mejor el viernes" still only gets "Su cita ya quedó…" (safe); "¿Puedo cambiarla?" changes it.

## Lead's check (2 Nov 2026)

| Check | Before | After |
|---|---|---|
| check-content | 124 NLU, 12 sims 12/12, 0/0 | 146 NLU, 18 sims 12/12, fuzz 80, 0/0 |
| corpus / heldout | 237/237, 0/26 / 42/42, 0 traps | same |
| lead's set (29: 22 + 7 traps) | 9/22, 0/7 (handler bugs only in probe.ts) | 22/22, 0/7 |
| tsc / vitest | clean / 287 | clean / 287 |

Looked at numbers, letter names, money and the binding steps; played 6 probe files of whole calls (~60 calls).

**must-fix (meaning, booking, money, numbers)**
1. A question booked the time on offer: "¿Tiene algo el martes?", "¿Puedo ir el martes?", "¿Abren el martes?", "¿Tiene algo pasado mañana?" (twist), "¿Tiene algo el lunes?" (week full) all got "le agendo la cita…". Question patterns now carry `#ask`: Lorena offers it again ("Entonces, ¿le aparto…?"); a statement ("Mejor el martes") still books (rule 17).
2. Next week's day booked this week's: "Mejor el martes de la próxima semana", "El próximo martes está bien", "¿Y el martes que viene?" booked this Tuesday at 10. Now next Tuesday at 4:30 is offered (also from the opening, "…para el próximo martes", and when moving); another weekday of next week gets day_full and next Tuesday; "El lunes en la mañana" gets Monday at 10.
3. Twist: "¿Tiene algo la próxima semana en la mañana?" after "Lo único que me queda es pasado mañana" offered this Tuesday at 10; "¿Y el lunes?" got "es lo único que tengo esta semana". A next-week request now turns the only opening down and gets next week's.
4. "No, todavía no" right after "¿Así me escucha mejor?" (asked at "¿Ya había venido antes?") recorded a new patient (from review fix 3). It now answers the hearing question; she speaks up again.
5. Insurance said twice in one breath: "No tengo seguro dental, pero tengo seguro médico" quoted $400, then asked for the insurance details and recorded insured; "No voy a pagar particular, tengo seguro" quoted $400 first; "Sí, tengo seguro, pero voy a pagar yo" asked for insurance details first. One answer each now.
6. A number read in pieces was the phone number: "Mi celular es 984 123" (or "984") got "Muy bien, gracias" and the rest was lost. Under 7 digits Lorena says "Ajá..." (new line phone_more) and joins the next piece; 10+ digits at once is a whole number said again.
7. "Del treinta" was 2030, "dos mil treinta" a birth year. Two-digit years over 25 are 19xx (also in 4/6/28); a year after 2025 is not taken ("¿Y el año?").
8. After "¿Puedo cambiar la cita para el viernes?" the booked time was gone: "No, mejor déjela como estaba" wasn't understood and "Así está bien" twice booked the new offer. The booked time is kept until a new one is agreed; keep_appt and "Así está bien" give it back ("Su cita ya quedó…").
9. "¿Cuánto cobran si cancelo?" gave the exam price with the policy; now only the policy. "¿Aceptan dólares?" got "Aceptamos efectivo, tarjeta y transferencia" (no answer); new line pay_dollars: pesos only in cash, cards and transfers (as s67a).
10. "El martes a las diez no puedo" and "No a las diez, a las once" offered the refused time again before the next one; now one offer. "Hace mucho tiempo" at "¿Ya había venido antes?" recorded pain; now a yes.

**polish**: "¿El martes, no?" typed as a tag asks again; "Tampoco (me queda)", "Ninguno me queda", "Prefiero el jueves", "No puedo en la tarde / en la mañana", "¿Es gratis la valoración?", "Con mi seguro", "Mi seguro no cubre dental", "No estoy asegurado", "Sí, quiero cancelarla".

**Left for the owner**: global.ts g_sorry_to_hear "¡Ay, qué pena!" (s65a) unchanged; the unsure facts ($400 valoración, hours, tolerancia, English-speaking dentist) and the new "solo pesos en efectivo" stay as written; "¿Cuánto cuesta la limpieza?" still gets the exam price and "la doctora le da un presupuesto"; "Sí, pero no el martes" offers Tuesday again (asks) rather than the next time; "i con acento" isn't read when spelling (global letters slot).
