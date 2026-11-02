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

## Lead's check (2 Nov 2026)
Gate after: tsc clean; check-content 153/153 NLU, 19 sims 12/12, fuzz 80, 0 errors 0 warnings; corpus 336/336, 0/59 false
accepts; blind set 41/41, 0/2; a new 30-item edge set (numbers, money, refusals) 19/19, 0/13 traps; vitest 287. 215 lines
added, 41 changed in the conversation.

**numbers and money (must-fix)**
- After two months' deposit was agreed, "¿Cuánto es el depósito?" and "¿Cuánto tengo que pagar para entrar?" still said "Es un mes de renta: $14,000". Now "Son $28,000 de depósito: dos meses de renta" (and the $28,000 quote while it's open, or after no deal).
- "¿Dos meses?", "¿Seis meses?" and "¿Son dos meses de depósito?" were read as a rent of $2 or $6 ("Son $14,000 al mes"). Now they get the deposit amount at the extra-deposit question, the one-year minimum, and the deposit.
- An amount at the extra deposit is checked (rule 18): "Puedo dejar veinte mil" got "la renta es fija" and agrees to nothing; now he repeats the $28,000. "Sí, puedo pagar los veintiocho mil" agrees, and "¿Veintiocho mil?" gets the amount.
- "Somos cinco" got "para cuatro personas", and "Mi esposa, mis dos hijos y yo" got "Perfecto". People are counted now, and the line has no number ("para tantas personas"). "Tengo dos gatos" / "dos perros" got "Un gato…" / "Un perro chico…"; now they get plural lines.
- A move-in "Hoy mismo" / "Ya" / "Mañana" got "Sí, se puede", though it's free only from the first. Now it gets "Está disponible desde el primero del mes". "¿Puedo rentarlo por ocho meses / por un mes?" got "El contrato es por un año"; now it gets the minimum.

**meaning safety (must-fix)**
- Tenant: "Mañana a las diez no puedo" and "A las diez no está bien" booked the repairman for that time ("le digo que venga a esa hora"). Now he asks for another time. A bare time inside a refusal is never booked, at the visit, key and other-time questions alike.
- "No, me lo quedo" / "No, mejor me lo quedo" at "¿Alguna otra pregunta?" and at "¿Me puede avisar hoy en la noche?" was a decline. With its comma or "mejor" it's a take now. Said aloud ("No me lo quedo"), he asks "¿se lo queda o no?" (rule 10). A decline at the hurry question used to leave it open: "¡Gracias por venir!", then the question again.
- "Me lo quedo, pero ¿me puede bajar la renta?" committed at full price. "Lo quiero, pero tengo que hablar con mi esposa" got "¡Qué bueno que le gustó!" first. "Quiero rentarlo por seis meses" took the one-year lease. Now a haggle or hedge after "pero", or a shorter lease, never commits; that part gets the answer and the question again.
- Rule 17: "Está bien, gracias" / "Ok, gracias" at "¿Le interesa?" took the apartment, and at the lease signed it. Now he asks again ("¿se lo queda o no?") or gives the reminder. "No, gracias" at the lease got "firme aquí" again; now "no hay prisa", and nothing is signed.

**understanding:** "No tengo a nadie que pueda ser mi aval", "No, prefiero la póliza" (at the aval question: the offer, with who pays), "¿Quién la paga?", "No quiero firmar", "¿Puedo firmar mañana?", "¿El agua no está incluida?", "¿Puedo tener dos gatos?", "Tengo tres gatos", "Me lo quedo por un año".

**tests:** 16 NLU tests, 5 sims (tomorrow at ten refused; "No, me lo quedo" with its comma; "No me lo quedo" said aloud; a polite closing and a haggle at the decision; nothing signed on a polite closing).

**still open:** the engine's `c.clearPending()` (the review's NEEDS). "Sí, dos meses" at the extra deposit gets the amount again rather than agreeing: safe, one more turn.
