# Review: s31-doctor "Respire hondo" (writer's commit 8ef25ded)

File: `src/editions/es/content/situations/s31-doctor.ts` (2,034 lines). No shared file touched; no `// NEEDS:`.

| | Before (8ef25ded) | After |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content | 88/88 NLU, 13 sims 12/12, fuzz 80, 0/0 | 105/105 NLU, 14 sims 12/12, fuzz 80, 0/0 |
| corpus | 259/259 (100%), 0/25 traps | 295/295 (100%), 0/29 traps (+40 review items) |
| blind set (44 items, written first) | 40/41 = 97.6%, 0/3 traps | 41/41 = 100%, 0/3 traps |

The blind score was high, but a second probe written after reading (now in the corpus) found 28/43 (65%) with 3
misreadings, and the rule-22 probes found a card charged on "No con tarjeta". 68 lines added, 25 changed/removed.
**meaning-safety (must-fix, ~10 lines)**
- "No con tarjeta, en efectivo" parsed as pay_card + pay_cash and **charged the card**; "No en efectivo, con
  tarjeta" said "Claro, en efectivo" and then charged it. Whole correction patterns now take the second item (rule
  18, also "…, por transferencia"); "Tarjeta no efectivo" / "Efectivo no, tarjeta" lose their comma: `#amb`, she
  asks "Perdón, ¿en efectivo o con tarjeta?" (rule 10).
- "Tengo el estómago revuelto" was tagged body aches, so the visit became a virus (paracetamol, wrong advice).
- "Es (muy) fuerte" at the pain scale (or before the exam) was ask_side ("Primero vemos qué necesita"). ask_side now
  needs the medicine named; the scale reads "es/está (muy) fuerte".
**understanding (must-fix, ~16 lines)**: "No, fiebre no, pero tos sí", "No tengo tos, pero sí fiebre", "Ya no tengo
fiebre", "Me pica la garganta", "Creo que me enfermé", "Empezó ayer en la noche", "No, conozco otra", "Hay una al
lado de mi casa", "No sé, soy nueva aquí", "¿Me da factura?", "Prefiero pagar con transferencia", "¿Cuánto falta?"
(now "Faltan $300", not the full price again).
**replies, rule 11 (polish, ~8 lines)**: "¿Aceptan tarjeta?" mid-visit got "Al final me paga" → "Sí, acepto
tarjeta; me paga al final" (transfer too); "No traigo efectivo" mid-visit gets "también acepto tarjeta y
transferencia"; "Sí" to "¿Sabe dónde surtirla?" recorded Farmacia del Puerto, now "other".
**numbers (polish, 2 lines)**: Fahrenheit was converted to the half degree (100 °F → "como 38", then "unas líneas de
temperatura"); now to the tenth ("como 37.8"). **spanish (polish, 1)**: "Muy bien, gracias" after a pain of 5 → "Ajá".
**twins, gloss-english, facts, structure**: no change needed. ahorita ×2 and "unas líneas" ×1 have neutral twins;
"gripa" only in a hint. A third of the glosses and every flag index checked. Steps, intents and the three twists
match the English original; the pay step is the brief's addition.
**tests**: 17 NLU tests (corrections, #amb, what-if, past tense, symptoms) and a sim "an upset stomach, a lost comma
at paying, cash in two goes". Probes: no / correction / what-if / price question / polite closing / past tense /
short cash / a $2,000 bill / goodbye before paying all record the right state.
**For the lead or the owner**: the fee ($500 MXN) and the unnamed second antibiotic stay vague as written. When the
learner names a method before hearing the fee ("Con tarjeta" right after the directions), she says the price and
charges in the same turn; it is a fixed fee for a visit already given, so I kept it.

## Lead's check (2 Nov 2026)
Numbers, money, the binding choices and the open points. 30 new edge and trap sentences (scratch set: 12/25 understood
with 4 misreadings and 0/5 traps accepted before, 25/25 and 0/5 after) and probe runs of every paid or binding outcome
found these; about 30 lines changed, 110 added (fixes, 15 NLU tests, 2 sims, 2 new lines).

**Must-fix (all fixed):**
1. **A bare "Aquí tiene" / "Tenga" wasn't understood once paying started early.** When the fee came up in the first turn
   after the directions (a price question, a method, some cash, a goodbye, a lost comma), she held the turn and the
   conversation stayed on the directions, so the pay step's own answers and hints never came: "¿Cuánto le debo?… En
   efectivo… Aquí tiene" (the hint's own words) got "Perdón, ¿puede repetir?", also right after "faltan $300". The pay
   step now becomes the current one without asking again (`payNow`).
2. **A question about both ways paid.** "¿Puedo pagar con tarjeta o en efectivo?" charged the card and then said "Ya
   está pagado, gracias"; "¿Acepta tarjeta o solo efectivo?" at the pay step recorded cash. Two ways joined by "o" are a
   question (whole patterns `#either`, and any turn that names two different ways around an "o", spelled by sound too):
   "Sí, como prefiera." (new line), the fee if it wasn't said, nothing charged. "¿Cómo le pago?" was "how are you?": now
   the fee and "¿Cómo va a pagar…?".
3. **The card after some cash.** "Aquí tiene doscientos… faltan $300… Mejor con tarjeta" tapped the card with no word
   on the $200: she says "Faltan $300." before the tap (the pay event carries the rest), and her reminder after some
   cash is "Faltan $300", not "Son $300" after "son $500". "No traigo más efectivo", "No me alcanza", "Es todo lo que
   traigo" are understood (the last two at paying only: "Es todo lo que tengo" ends the symptoms at "¿Algún otro
   síntoma?").
4. **An allergy in two pieces.** "Soy alérgico a la penicilina, no tengo otras alergias", "Solo a la penicilina, a nada
   más", "Sí, a la penicilina, ninguna otra" weren't understood. The "no other" piece (`#others`) keeps the allergy
   named, and a "none" piece never undoes an allergy named in the same answer (at the chart question too), whatever
   the order. "No sé si soy alérgica a la penicilina" gets one reply (the other antibiotic), not "Le voy a dar algo muy
   seguro" plus "Qué bueno que me lo dice".
5. **"No sé, como 38"** said "No se preocupe, ahorita se la tomo" and then "Eso ya es fiebre" (38 recorded): the number
   counts, one reply (fever question only, so "No, cien" at paying is never a temperature).

**Numbers (polish):** a body temperature is 35–43 °C / 95–109 °F (34 °C was "normal: no tiene fiebre", and 93 or
110 °F gave a Celsius outside the voiced domain); "Un siete u ocho", "Desde hace unas horas", "Nací en 1980" (then
"¿Y el día y el mes?", new line, not the date question again), "Junio 4 de 1980" (an American's order, with the
day-first tip); a bare "Aquí tiene" records the cash handed over.

**Open points:** as the review: the $500 fee and the unnamed second antibiotic stay vague, and a method named right
after the directions says the fee and charges it in the same turn (a fixed fee for a visit already given). Not changed:
"Creo que no" at the chart question corrects the chart (the learner's own answer, as the twist intends); "Dos billetes
de doscientos y uno de cien", dollars, "Ya pagué en recepción" and "No, como 37" aren't understood (she asks again;
nothing is paid or recorded).

**Gate:** tsc clean; check-content 120/120 NLU tests, 16 sims all 12/12, fuzz 80, 0/0; corpus 295/295, 0/29 traps;
held-out 41/41, 0/3; vitest 288/288.
