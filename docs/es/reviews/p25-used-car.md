# Review: p25-used-car ("¿Y si lo dejamos en…?"), writer's commit af69de44
File: `src/editions/es/content/situations/p25-used-car.ts` (1,979 lines). No shared file touched; no `// NEEDS:`.

| Check | Before (af69de44) | After |
|---|---|---|
| `tsc` / `check-content --verbose` | clean; 81/81 NLU, 22 sims 12/12, fuzz 80, 0/0 | clean; 94/94 NLU, 23 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 289/289, 0/68 traps | 322/322 (100%), 0/95 traps (+56 reviewer items) |
| blind set (39 items, 9 traps, written first) | **31/39 (79.5%)**, 1 trap accepted | 39/39 (100%), 0 traps |

The blind trap: "Está bien, gracias" at "¿Trato hecho?" parsed as yes. The writer's regex kept the state safe, but the parse
said yes. The after-score isn't blind. My 58 probes written after reading the file scored 66% before and 97% after (now in the corpus).

## Fixes (git: 70 lines added, 18 changed or removed, in the conversation; about 30 of them are tests)
**meaning-safety (must-fix, ~14 lines)**
- "Está bien / Ok / Vale, gracias" at her price, final and confirm questions is now a `closing_ctx` intent, expected only
  there. It asks the question again and is never a yes (rule 17). "¿Lo compro?" / "¿Me lo llevo?" asked as a question does the same.
- "No quiero pagar en efectivo" was not understood. It now offers transfer or cheque (rule 18). "En efectivo no, por
  transferencia" and "No, mejor por transferencia" pay by transfer (rule 10). "No con tarjeta, en efectivo" skips "no tengo terminal".
- `q_mechanic` used a regex-style `llevar(lo)?` that the grammar can't read. It now uses alternatives.

**understanding (must-fix, ~25 pattern lines)**: "…el carro que está en venta", "¿Le puedo dar una vuelta?", "me gustaría
manejarlo un rato", "No hace falta manejarlo", "No está mal, pero hace un ruido raro" (drive_bad), "¿Qué tal si lo dejamos a
la mitad?", "Si le pago en efectivo, ¿me hace un descuento?" (was pay_cash + ask_flex + yes), "¿Es lo menos que me puede
dejar?", "Me lo llevo si me lo deja en setenta" (an offer), "No le voy a dar ochenta mil" (too_high), "¿Las placas son de aquí?",
"¿Es de agencia?", "tenencias pendientes" (answered "nothing owed"), "¿No tiene ningún problema?", "Mejor en efectivo".

**spanish (polish, 2 lines)**: after her own "En efectivo, como dijo, ¿verdad?" the learner's "En efectivo" got a surprised
"¿En efectivo?". It now gets "¡Perfecto! Música para mis oídos." (new line `pay_cash_ok`). **gloss-english (polish, 1 line)**: intro "$85,000 pesos" → "85,000 pesos".
**checked, no change**: price model and domains, every flag index, usted, twins (about 1 line in 20), Calle de los Cedros
and the bank at Juárez and Ceiba (TOWN.md), steps, intents and twists against the English. Transcripts: seeds 3 and 7 and
the twists, no line twice in a row. Probes (rule 22): closings; past tenses ("Ya le pagué", "Pagué todo" record nothing);
what-ifs; "¿Cuánto es?" at final; "No, setenta mil no, sesenta" → 60,000; "No, gracias" → her last chance once, then a walk.
**tests**: 13 NLU tests (5 traps), 1 sim (closings at the confirm question, no cash, then a transfer), 56 corpus items.

## For the lead / owner
- An offer at or above her next step is accepted at once, even before she says a price ("Le ofrezco ochenta mil" →
  "¡Vendido!"). This is the English logic. The learner named the number and the ad shows $85,000, so I kept it.
- A personal "¿Le doy un cheque?" records payment by cheque after her "Mejor un cheque de caja". I left it as it was.
- The writer's open points (tenencia in Quintana Roo, the price, where the change of owner is registered) stay vague in
  the lines, which is right per rule 14.
