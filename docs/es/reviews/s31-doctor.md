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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral). Read as a native speaker: the transcripts at seeds 3 and 7 (all 16
sims), probe runs of what patients ask and answer (`tools/probe.ts`), the cross-cutting leads (`AUDIT/cross`,
`AUDIT/neutral`: nothing found there), the cast, the town and the prices. **Found 18, fixed 18.** Spoken lines: 4 new,
2 removed, 1 reworded, 1 moved to its own id (same text); the rest is logic, patterns and hint help text.

**1. Natural Spanish, the flow (5)**
- **Must-fix, a question left open:** "Me siento mal, tengo fiebre", "Me siento fatal, tengo fiebre y tos" (both in the
  corpus) and "No muy bien, me duele la garganta" (the natural answer to "¿Cómo se siente hoy?") got "Lo siento. ¿Qué
  síntomas tiene?" right after the symptom, and that question stayed open: "Desde ayer", "38", "No, nada" each got
  "¿Qué lo trae por aquí?" again until a symptom was repeated. Now, when the turn names a symptom, one "¡Ay, qué mal!"
  and on to "¿Desde cuándo…?"; when she does ask, the question is optional (the "problem" step asks again; never a loop).
- "Le voy a dar algo para el dolor. Antes de recetarle algo, ¿es alérgico…?" (the chart twist's intro on a visit
  without an antibiotic): after the intro she asks "¿Es alérgico a algún medicamento?".
- The pharmacy question asked again after a side question handed the prescription over a second time ("Aquí tiene la
  receta. ¿Tiene alguna farmacia cerca?"): the second time it's "¿Sabe dónde surtir la receta?" (new line, rule 8).
- Two questions before the exam ("¿Cuánto tiempo tengo que descansar?" = how long + work) got "Primero vemos qué
  necesita. Primero vamos a ver.": one "first" per turn.
- Cash named before the fee: "La consulta son $500. Claro, en efectivo." → "Claro, en efectivo. La consulta son $500."
  (the order only).

**2. tú/usted (0):** usted throughout, in the hints, the tips and `#tip:tu_staff`.
**3. Names (0):** Doctora Herrera only; no other Herrera in the edition.

**4. Facts (2)**
- The virus visit prescribes paracetamol, yet "¿Puedo manejar?" said "Con cuidado: puede darle sueño" and the side
  effects "Puede darle un poco de sueño": paracetamol doesn't make you drowsy. Now "No mucho. Es muy suave." and the
  drive line below; `side_sym` and `drive_careful` removed.
- An ear infection: "¿Puedo ir a trabajar?" → "Sí, si se siente bien.", then (half the time) the goodbye "Quédese en
  casa, descanse y tome muchos líquidos". "Quédese en casa…" (its own id, `advice_rest_home`, same text) is now said only
  when it's contagious, and not after "Mejor quédese en casa…" (rule 13).
- Checked ✓: the $500 visit (s75's consultorio, "unos sesenta pesos", is a pharmacy doctor), Farmacia del Puerto "aquí
  cerca, en el centro" (TOWN.md), the clinic downtown, the doses and days as the brief.

**5. Glosses (1):** "No | soy | alérgico" was glossed "Not | I-am" (S-NEG): "No soy" → "I'm not" (two hints).
**6. Spelling, accents, ¿¡ (0)** in both texts.

**7. Questions and replies (8)** (every new answer is in her register; nothing is paid by any of them)
- "¿Cuánto cuesta el medicamento?" (in the corpus, not understood) → "Depende de la farmacia; el genérico sale más
  barato." (new; the generic isn't said twice); "¿Dónde hay una farmacia?" / "¿Dónde la compro?" → Farmacia del Puerto
  (at the pharmacy question, that question's own answer; told before the directions, the question isn't asked);
  "¿Me da la receta?" → "Claro, aquí tiene su receta." (new), or the pharmacy question if it hasn't come yet;
  "¿Aceptan dólares?" / "Solo traigo dólares" → "Lo siento, solo acepto pesos. Puede pagar con tarjeta o por
  transferencia." (new; after the directions, the fee); "¿Tiene terminal?" is the card, like "¿Acepta tarjeta?".
- "Vengo porque me duele la garganta", "Vine porque tengo fiebre" (the commonest answer to "¿Qué lo trae por aquí?")
  weren't understood: a "vengo / vine porque" prefix on the symptom and feeling-unwell patterns. "Solo agua" at
  "¿Ha tomado algo para eso?" is understood (as a home remedy).
- "¿Me va a dar sueño?" got "Sí, no le da sueño." (a yes to a no, rule 11): the line is now "No le da sueño: puede
  manejar sin problema." (it answers both questions; no medicine of hers makes you drowsy).

**8. Hints and help text (2):** the learner's own body was flagged "where English says “your”" ("Me duele la
garganta" = my throat hurts, "Me escurre la nariz"): "my" (six hint items). "También tengo {X}." had the natural English
"I also have that.": now per symptom ("I also have a cough.").

**9. Accepted answers:** corpus 295 → 326 understood (+30 items, and "¿Cuánto cuesta el medicamento?" is now
`ask_med_price`, never `ask_cost`), traps 29 → 39 (+11, one became a positive), 0 false accepts; held-out 41/41, 0/3
(unchanged). 13 NLU tests and 2 sims ("unwell and the symptom in one breath…", "the reason for the visit, drowsiness,
the pharmacy question twice, cash").
**10. The neutral text (0):** the four twins are right (ahorita ×2, unas líneas de temperatura, gripa); the new lines
have no Mexican-only word. "Surtir (una receta)" stays untwinned, as in s75.

**Not changed (taste, or not this file's):** "¡A la orden!" after thanks (global); "¡Perdón! Con cuidado."; "¿Qué le
pasa ahora?" (warm in her voice); "Esta semana no" to exercise also for a tension headache; the $500 fee and the
unnamed second antibiotic stay as the review left them.

**Gates:** tsc clean; check-content 133/133 NLU, 18 sims 12/12, fuzz 80, 0 errors 0 warnings; corpus 326/326, 0/39;
held-out 41/41, 0/3; vitest (es) 107/107.
