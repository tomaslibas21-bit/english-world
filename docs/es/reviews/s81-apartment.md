# Review: s81-apartment (writer's commit e8c646dc, 1,752 lines)

## Gate and blind set
| | Writer (e8c646dc) | After review |
|---|---|---|
| check-content | 123/123 NLU, 11 sims 12/12, fuzz 80, 0/0 | 137/137 NLU, 14 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus | 328/328 (100%), 0/55 false accepts | 336/336 (100%), 0/59 false accepts |
| blind set (43 items, 12 with `not`) | 35/41 = **85.4%**, **1/2 traps accepted** | 41/41 = 100%, 0/2 (not blind any more) |
| tsc / vitest | clean / 287 | clean / 287 |
Writer's claims held. The blind set found the trap below and 6 gaps. Probes (rule 22) found the rest.

## Fixes (24 lines changed, 119 added; ~70 must-fix, ~15 polish, ~35 tests and sims)
**meaning-safety (must-fix, ~30 lines)**
- "No sé si me lo quedo" / "No sé si me interesa" at "¿Le interesa?" was read as g_dontknow + **take**, so the learner was renting it. Now it's think.
- "¡Me lo quedo!" before the rent, deposit and lease were said used to commit straight away (rule 3). Now Don Ernesto gives the terms ("¡Qué bueno! Antes, para que sepa: …") and asks again.
- "Está un poco caro, ¿me puede bajar la renta?" at the decision was a **decline** that ended the viewing. Haggling now gets "el precio es fijo" and the question again.
- "No es todo, tengo otra pregunta" (the comma is lost, rule 10) ended the questions. It's now have_questions. "No, es todo" still ends them.
- Aval: "No tengo aval, pero mi jefe puede firmar" quoted the $28,000 deposit and also recorded a guarantor. The deposit question then stayed open after the signing. Now it's a guarantor and nothing else.
- "No, mejor la póliza" at the deposit quote wasn't understood. It now gets the póliza offer, which says who pays ("Usted la paga una sola vez"). A yes used to record a póliza whose payer was never mentioned.
- "¿Cuánto cuesta?" at the deposit quote gave the rent. At the póliza question it gave the rent too. Each now gets its own amount.
- Tenant: "No, mañana no puedo, estoy en el trabajo" asked two questions in a row. "A las diez no estoy, pero puede usar su llave" left "¿A qué hora le queda bien?" open after the key was agreed. Now there's one question, and the key settles the time.

**understanding (must-fix, ~15 lines):** "Vi el anuncio del departamento en renta", "Hablamos ayer por teléfono", "¿Cuánto hay que dejar de depósito?", "No tengo trabajo aquí todavía", "Es mucho dinero, no puedo", "Primero quiero leerlo" / "No quiero firmar sin leerlo", "No, nada" after "¿En qué le puedo ayudar?" (tenant, new `nothing_ctx`, expected at that step only).

**spanish / rule 11 (must-fix, ~20 lines):** replies that didn't fit their question:
- "¿Tengo que pagar el agua?", "¿El agua se paga aparte?", "¿Cuánto cuesta el agua?" and "¿Quién paga el agua?" all got "Sí, el agua está incluida". Now: "No, el agua ya está incluida en la renta" for the yes/no questions, the same without "No," for the wh-questions.
- "¿Cuánto cuesta el gas?" got "No, el gas no está incluido". Now: "Eso se paga aparte; depende de cuánto use."
- "¿Está vacío?" got "No, no está amueblado". Now: "Está semiamueblado…"
- "¿Hay mucho ruido?" and "¿Cómo son los vecinos?" could get "Sí, es un edificio muy tranquilo". Now: "No, es un edificio muy tranquilo." / "Muy tranquilos: casi todos son jubilados."
- "¿Dónde puedo estacionar?" could get "Sí, hay…"

**polish (~5 lines):** "Aquí tiene" at the aval question no longer gets "Enseguida. Antes, una pregunta:". bye_think "¡Ojalá me avise pronto!" right after "Nomás avíseme antes del viernes" (said twice) is now "¡Gracias por venir!". New article-pronoun flag on "la paga".

**gloss-english, numbers, twins, facts, structure:** no changes needed. Glosses checked on a third of the lines. $14,000 / $28,000 read right. 13 of ~200 variants are Mexican-only, all with twins. My new lines use "zona", not "colonia", so they need no twin. Steps, English intent ids and both English twists are kept.

**tests:** 14 NLU tests (hedges, the lost comma, rule-11 questions, blind-set gaps), 3 sims (take before the terms; haggling, then a guarantor after all; tenant at work, then the key), 12 corpus items.

## For the lead / owner
- `dropPending()` sets `conv.pending = null` directly. `c.expect(null)` would also hold the turn, so the next step wouldn't be asked. `resume()` (the writer's) also uses engine internals. An engine `c.clearPending()` would be cleaner (NEEDS for the lead, no shared file changed).
- These town facts were invented and are unconfirmed (writer's list): centro 10 min, beach 15 min, colectivo stop on the corner, laundry on the azotea, water and maintenance included, "antes del viernes". They should match s82-neighbor.
