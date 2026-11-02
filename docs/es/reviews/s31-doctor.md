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
