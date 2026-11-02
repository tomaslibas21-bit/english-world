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
