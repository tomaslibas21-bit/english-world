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

## Audit (5 Nov 2026)
Fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md, the brief, this review, the cross and neutral files (lead
decision: "estándar" → neutral "manual"), the situation, corpus and held-out set; seeds 3 and 7 read in full, before
and after; about 390 probes with `tools/probe.ts` (every polite closing, would, echo, no-with-a-yes and side question at
each of her price questions and at the pay step) and a value fuzz (400 random conversations from the corpus, 8,439
turns, 274 deals).

**Money and paperwork (Quintana Roo, Nov 2026), checked:** $85,000 asked for a 2008 convertible with 160,000 km fits
the market (2008 Beetle Cabrio, manual: about $77,000–95,000 asked); her ladder 85 → 80 → 77.5 → 75 ("lo menos") and the
$72,500 floor (−15%), $2,500 off for cash and for a fault: realistic. Cash for $72,500–85,000 is legal (the
anti-money-laundering cash ban for vehicles starts at 3,210 UMA, far above). Papers: the factura original endorsed on
its back (a second owner's factura carries the first owner's endorsement to her), the tarjeta de circulación, the
yearly fees "al corriente" with the receipts in the folder (the 2026 canje de placas / refrendo; whether a tenencia
applies stays vague, as before), REPUVE by the VIN, "nacional", local plates. Quintana Roo has no emissions check
(verificación): no line may claim one. The change of owner (SATQ, by appointment) stays unsaid. The bank at Juárez and
Ceiba matches TOWN.md; nothing gives a direction or a distance.

**Found and fixed, by point**
- 1 · natural Spanish (1): a returning visitor heard "¡Ah, es usted otra vez!" and then "Soy Margarita…" again: no
  self-introduction on a replay now (`introduce`), the presentation stays.
- 4 · facts (2): a personal cheque ("¿Le doy un cheque?", "Con cheque") got "Mejor un cheque de caja…" and the keys and
  the endorsed factura in the same breath, with nothing agreed: now she waits for a yes ("Muy bien." then the keys), a
  no ("¿cómo le hacemos?") or another way; a second personal cheque gets the options. "¿Tiene la verificación?" got
  "Buena pregunta. La verdad, no sé." from the owner: now the papers answer ("Todo en regla: …"), claiming nothing.
- 5 · English (3): "shall" (talk_prompt, flex_yes, pay_reask and its twin and flag, the split hint) → "should";
  a_tires "they're safe" → "they're fine" (están bien); gear_yes had no flag on "estándar".
- 7 · answers and meaning (11 fixed, 1 left below): **sales on no real yes**: "Lo compraría." / "Me lo llevaría." (a would) sold the car,
  at $85,000 without "¿sin regatear?"; "No, sin regatear." (comma lost: "not without haggling") and her own "Sin
  regatear." said back sold it at $85,000; "De acuerdo, gracias." / "Perfecto, gracias." sold it (the closing family
  of "Vale, gracias"): all now get her question again (rules 10, 17). "En efectivo, como dijo, ¿verdad?" / "Mejor un
  cheque de caja" + "Está bien, gracias" paid: now "¿cómo le hacemos?". "Está bien, gracias, lo voy a pensar" asked her
  question again before answering: the other piece answers now (rule 8). **Wrong meanings**: "Tengo que ir al banco",
  "Tengo prisa", "Tengo una pregunta" were read as "¿Tiene…?" ("Buena pregunta…"); "¿Cuánto es el refrendo / cuesta la
  tenencia?" got the car's price (now her honest "no sé": the amount stays vague, rule 14). **No answer**: "¿Acepta
  dólares?", "¿Le puedo pagar en dólares?", "¿Cuánto es en dólares?" (new line `pesos_only` "Lo vendo en pesos, no en
  dólares."; with a price question, pesos first, then her price); paying in parts ("¿Lo puedo pagar en abonos?", "a
  plazos", "la mitad ahora y la mitad mañana", "un anticipo": new line `pay_one` "No, mejor en un solo pago, por
  favor."; with "lo puedo pagar" they are how-to-pay questions, never a yes); "¿Está a su nombre?", "¿Las placas son de
  Quintana Roo?", "¿Tiene los comprobantes de pago?", "¿Tiene el refrendo de este año?" (existing answers). At the pay
  step "¿cómo le hacemos?" came twice in a row after two side questions: it alternates with "¿cómo me va a pagar?".
- 10 · neutral (1): the three gearbox lines get neutral twins with "manual" (the lead's decision); the flag now says
  "Mexican: estándar …; manual is more widely used."

**Checked, no change:** usted everywhere (lines, hints, tips); names (no clash); every flag index; the twins (8 + 3);
spelling and ¿¡ in both texts; every {$price} line can only say $70,000–85,000 in steps of $1,250 and {$amount} only
$50,000–82,500 in steps of $2,500 (the fuzz: every amount said is in a voiced list); one speaker, no plural items.

**Left (for the lead / owner):** "¿Tiene seguro?" and "¿Firmamos un contrato (de compraventa)?" get the catch-all "Buena
pregunta. La verdad, no sé." or nothing, and "¿Me da un recibo?" / "Le pago mañana" aren't understood: harmless, but a
contract line would also belong in the handover line (a voiced change), so not now. "Sí, de acuerdo, gracias" asks
again, as "Sí, está bien, gracias" already did (friction, never a sale). "Me gustaría comprarlo" at her
asking price still sells at $85,000 without "¿sin regatear?" (a clear wish to buy; kept). "No, me lo llevo" reads as
"No me lo llevo" (a refusal: her last chance, no sale; the safe reading, kept). A bare "es mucho" stays out of
too_high: it would put "accept_deal" in the parse of two existing traps ("Quisiera comprarlo pero es mucho"), whose
handlers are safe anyway.

**Tests:** 13 NLU tests, 3 new sims (no sale on a would / a no with the yes / an echo / a closing; a personal cheque
that waits; dollars and parts; a returning visitor), 1 sim updated (the personal cheque now needs its yes); corpus +32
(28 understood, 4 traps). **New spoken lines to voice:** `pesos_only`, `pay_one`; neutral texts of `a_gearbox`,
`gear_no`, `gear_yes`. No spoken line changed.

**Gates:** `tsc` clean; `check-content` 0 errors, 0 warnings, 116/116 NLU, 27 sims 12/12 seeds, fuzz 80 no crash;
corpus 350/350 (was 322/322), 0/99 traps (was 0/95); held-out 39/39, 0/5; `vitest --project es` 113/113.

## Spain twins (11 Nov 2026)

55 Spain twins (lines and hints), no register change: Doña Margarita and the learner keep usted. Spain's words: coche
(carro/auto), conducir (manejar), prueba de conducción, descapotable (convertible), capota (techo), la radio (el
radio), coger una emisora, maletero pequeño and nevera portátil (cajuela chica, hielera), garaje (cochera),
revisiones (servicios), no funciona (no sirve), neumáticos (llantas), depósito (tanque), matrícula (placas), número
de bastidor (número de serie), móvil, datáfono (terminal), cheque bancario (cheque de caja), sitio, delante de,
entre nosotros (entre nos), de verdad (de veras), sincera (honesta), esta mañana (hoy en la mañana), llevarlo a su
mecánico (con), un rasguñito (un rayoncito), me parece caro (se me hace caro), ¿Le vale…? (¿Le sirve…?), ¿Ha tenido
algún accidente? (choque). Fuel use the Spanish way: "Gasta unos ocho litros a los cien" (12 km per liter). Spain's
present perfect for what has just happened: ha venido, ha vuelto / ¿qué le ha parecido?, le ha robado el corazón, lo
ha notado, ya lo ha conducido, ya le he bajado, he visto su anuncio. Kept: the Mexican car papers (factura endosada,
tarjeta de circulación, refrendo, REPUVE, nacional), pesos, the streets. Patterns take he visto, revisiones, prueba de
conducción, descapotable, cheque bancario / le vale, no llevo efectivo. Spain corpus: 23 items, 22/22, 0/1 false
accepts. Gates: Mexican, neutral and Spain 0 errors, sims 12/12; corpus 350/350 0/99; held-out 39/39 0/5.
