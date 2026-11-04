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

## Lead's check (4 Nov 2026)
Looked at money and numbers, the pay step and every way a yes, a no, a question or a condition reaches her price
questions (rules 10, 11, 17, 18, 22). 31 new edge and trap sentences (24 + 7 traps): **12/24 before, 24/24 after**, 0/7 traps.
The worst bugs were in the handlers (the parse looked right), so each was played whole with `tools/probe.ts`.

**meaning-safety (must-fix)**
- A yes with a push after it bought the car at her current price: "Me parece bien, pero es un poco caro", "Quiero comprarlo,
  pero es muy caro", "Lo compraría, pero no tengo tanto dinero" (the yes outranked the push). Now the push answers; "Es caro,
  pero me lo llevo" (the yes after it) still buys.
- A condition bought the car: "Si me hace un descuento, me lo llevo" at the asking price sold it for $85,000 ("Entre nos,
  podía haber regateado…"); "Si me deja llevarlo con mi mecánico, lo compro" sold it too. An unaccented "si" with a clause
  after it is now an "if": the other piece answers, or her question comes again ("Sí, me lo llevo", "si me lo llevo" stay yes).
- Questions bought the car: "¿Es un precio justo?", "¿Lo puedo pagar en partes?", "¿Lo puedo pagar con tarjeta?", and her own
  "¿Sin regatear?" said back at the confirm question (sold for $85,000). A question is never a yes: "¿Es un precio justo?"
  gets a new line (`fair_price`) and her question; a way to pay named after "lo puedo pagar" is a payment question.
- Her price said back without a question mark (voice): "ochenta y cinco mil" sold the car for $85,000, while "¿Ochenta y cinco
  mil?" was an echo. A bare number at or above her price, alone, now gets her question again (rule 10); "Sí, ochenta mil" and
  "Ochenta mil, trato hecho" are yes.
- The pay step: "No en efectivo", "No con efectivo", "Mejor no en efectivo" recorded payment in cash. Now no cash: she offers a
  transfer or a cashier's check and nothing is paid (rules 10, 18).
- "Así está bien (, gracias)" at her last price, after her last chance, ended the talk with no car. Now her question again.

**understanding**: "¿No me lo deja en setenta?" (the negative-question offer), "No quiero comprarlo" / "Ya no quiero
comprarlo", "No tengo ochenta mil", "Sigue siendo mucho dinero", "Efectivo no", "Ya no traigo efectivo", "Le pago con un
cheque personal". **numbers**: "setenta y dos mil y medio" was $72,000 plus a halfway; now $72,500.
**rule 8**: the closings at "¿sin regatear?" got the same line three times in a row; her re-asks now alternate two lines
(price, final and confirm questions), and a second "no cash" gets "¿cómo le hacemos?".
**gloss-english**: the natural English "$2,500" (dollars, to an American) → "2,500 pesos" in `flaw_point`, `already_off`,
`already_off_limit`.
**checked, no change**: the price slot (counts, the year 2008 and 700,000 are no price; "70.000", "72 500", "70 mil 500"
read right); rounding to $500 as the English edition rounds to $50 (an odd 72,300 becomes 72,500: rare, left); the spoken and
glossed forms of all 13 prices and 14 amounts; the factura, REPUVE and refrendo/tenencia facts (vague where unsure); the
reviewer's two open points (an offer at or above her next step closes the deal; a personal cheque recorded as "check"): kept.
**tests**: 9 NLU tests, 1 sim ("hedged yeses, a question, no cash"). **For the owner**: one new line to voice, `fair_price`.
Gate: `tsc` clean; `check-content` 0/0, 103/103 NLU, 24 sims 12/12, fuzz 80; corpus 322/322, 0/95; heldout 39/39, 0/5;
vitest 288/288 in both editions.
