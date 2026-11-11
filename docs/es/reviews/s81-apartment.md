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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md "Rules from the reviews", BRIEFS.md
(s81, p24, p29), the review above, AUDIT/cross and AUDIT/neutral for s81 (with "Town directions (5 Nov)"), TOWN.md
"Getting around", p24/p29 for the shared facts, the situation file, corpus and held-out set, the transcripts (seeds 3
and 7), the 3D room (graphics round 2: overhead and talk view) and the 12 scene pictures; about 70 turns played with
tools/probe.ts (the binding outcomes, rule 22).

**Found 33 (1:1 2:0 3:0 4:7 5:0 6:0 7:20 8:0 9:5 10:0), fixed 33.**

**Meaning safety (the most important, point 7)**
- "Si me lo quedo, ¿cuándo me puedo mudar?" (an if) was read as "Sí, me lo quedo" and **rented the apartment** at the
  decision. Now an unaccented si with no comma, followed by a clause, never takes; the question after it is answered.
  "Sí, me lo quedo", "Si, me lo quedo" and "si me lo quedo gracias" still take it (local `ifTake`).
- Typed "¡Está bien, gracias!" (with ¡) slipped past the polite-closing check: it **took the apartment, signed the
  lease, agreed to the $28,000 deposit and to the póliza**. `heard()` now drops ¡¿, so it gets the question again
  (rule 17), and "¡Hola, Don Ernesto!" gets its greeting back.
- "Me gusta mucho." / "Me encanta." to "¿Qué le parece?" took it. Now: "¡Qué bueno que le gusta! Entonces, ¿se lo
  queda?", and only a yes takes it.

**The town (point 4; the lead's "Town directions (5 Nov)"; Las Palmas at Hidalgo × Flamboyán)**
- The centro "a unos diez minutos" → cinco; the beach "a unos quince minutos" → "a dos cuadras, derecho por la calle
  Flamboyán: unos cinco minutos".
- "La parada del colectivo está en la esquina" / "A dos minutos … hay una parada del colectivo": colectivos have no
  stop; they're waved down on avenida Juárez, a block up Flamboyán ("…aquí a una cuadra: nomás levante la mano";
  neutral "solo"). "¿Hay una parada de camión?" now gets the city bus stop, a block east in front of the gym (neutral
  "autobús"). "¿Cómo llego al centro?" gets the way (Flamboyán to Juárez, then right).
- "el mercado está en el centro" → "a dos cuadras" (and no "Sí," so it also answers "¿Dónde hago la despensa?").
- The kitchen: the 3D room has it ahead on the learner's right (counter, stove and fridge on the back wall's east half,
  checked in the round-2 overhead and talk views); the scene pictures, shown instead of the room, have it on the left.
  The line names no side now: "Mire, esta es la sala, y ahí está la cocina."
- All nine viewing pictures show the sea from the balcony, but the line said "Desde el balcón no se ve el mar". The 3D
  room has no balcony; from the town the sea is at the end of calle Flamboyán. Now: "Sí, desde el balcón se alcanza a
  ver el mar, y la playa está cerca."
- Kept, consistent with p29 and p24: rent $14,000 (p29 `RENT`), one month's deposit (two without an aval: $28,000),
  water and maintenance included, the tenant pays electricity, gas and internet; both amounts are in the voiced
  `domains`. Don Ernesto owns the building and lives on the planta baja; no line names an administrador or an
  apartment number (the 3D sign says "SE RENTA · DEPTO. 1B").

**Questions without an answer (point 7) and sentences not understood (point 9)**
- New answers: "¿Hay una farmacia cerca?" (it got the corner store; now Farmacia del Puerto, a block up on Juárez);
  "¿Hay gas?" ("Déjeme revisar…"; now the roof tank and the pipa); "¿Hay internet?" ("…Luz, gas e internet, no", as if
  there were none; now not included + NetWave); "¿Hay ventiladores?" ("Sí, hay un ventilador"; now the AC line);
  "¿Qué pasa si no tengo aval?" and "No tengo aval." before the lease ("Sí, normalmente pido un aval"; now the options:
  two months' deposit or a póliza; nothing recorded or quoted); "¿Hay otra opción?" with no póliza in sight (it got the
  póliza's payment line; now the aval options or "es lo único que le puedo ofrecer"); "¿Qué es una póliza jurídica?" /
  "¿Cómo funciona?" / "¿Qué es eso?" at the póliza (it got who pays; now "Es como un aval, pero de una empresa…");
  "¿Cuánto cuesta la póliza?" (repeated "una sola vez"; now the price line); "¿Qué es eso?" to "¿tiene aval?" (the
  explanation, then the question again); "¿Puedo cancelar el contrato antes?" ("Si se va antes del año, pierde el
  depósito"); "No traigo identificación" ("No se preocupe, eso lo vemos después."); "¿Le sirve mi tarjeta de
  residente?" ("El pasaporte sirve" → "Sí, esa sirve."); "Me interesa, ¿cuánto es la renta?" said the rent twice.
- Now understood: "¿Cuánto es?" (anywhere: the rent; at the deposit and the póliza their own amount), "¿Cuánto es en
  total?" (deposit + first month), "¿A cuántas cuadras está la playa?", "¿Dónde está el súper?", "¿Se ve el mar?",
  "No firmo".

**Neutral text (point 10):** the cross audit's "camión del gas" in util_gas's twin is a false positive (camión =
truck is pan-Latin-American; only camión = bus is Mexican-only). New Mexican words are twinned (nomás, camión, tiendita).

**Tests and gates:** 21 NLU tests (153 → 174/174), 5 sims (19 → 24, each 12/12 seeds: the neighborhood; a compliment,
then yes; an if and a typed polite closing take nothing; the aval options early and the póliza explained; no ID today),
fuzz 80 without a crash, check-content 0 errors 0 warnings. Corpus +37 (18 with `not`): 336/336 → 370/370, false
accepts 0/59 → 0/62; held-out 41/41, 0/2 (unchanged).

**Voices:** 7 spoken lines changed (tour[0], bus[0–1], bus_downtown, beach, sea_view, shops + its twin), 10 new
(bus_city, bus_downtown_way, shops_pharmacy, poliza_what, aval_options, only_option, lease_break, take_q, id_ok,
id_later), all Don Ernesto's; no values added.

**For the lead / owner**
- Edition-wide (lang.ts): a bare "Si …, ¿…?" is read as "Sí, …" in every conversation; s81 guards it locally.
- Other conversations: check handlers that anchor a regex on `c.heard` (`^\s*…`): a typed ¡ or ¿ defeats them (s81's
  polite closing did).
- p24 (its reviewer): the 3D sign says "DEPTO. 1B", so "3B" → "1B". npcs.ts `patel`: "Dueño del departamento" →
  "Dueño del edificio", to match the lead's decision (follow-up pass).
- TOWN.md facts: from Las Palmas, colectivos on Juárez a block up Flamboyán, the city bus stop a block east in front of
  the gym, Farmacia del Puerto a block up, mercado and beach two blocks up Flamboyán, the zócalo five minutes; leaving
  before the year loses the deposit (s81).
- Kept: "Sí, dos meses" at the extra deposit gets the amount again (safe, one turn); the póliza's price stays vague.

## Spain twins (11 Nov 2026)

60 twins + Spain nouns frigorífico and vitrocerámica (stove; forms vitroceramica / placa / fogones added). Don Ernesto
keeps usted (no register change). The flat is "el piso" (the neutral "apartamento"), the rent "el alquiler" (with agreement: "el
alquiler es fijo"), the deposit "la fianza", "se alquila / alquilarlo", "el salón" (sala), "armarios empotrados" (clósets),
ascensor, "plaza de aparcamiento detrás del edificio", fontanero, "se estropea" (se descompone), "a una calle / a dos calles, todo
recto", "muy a menudo", "esta noche", "por la tarde", "¡Me alegro de que le guste / le haya gustado!", "seguro de impago" for the
Mexican "póliza jurídica". "Colectivos" stay (Mexico's own). Patterns: "por la mañana / tarde / noche" accepted beside "en la…".
Spain corpus: 15 items (piso, alquiler, fianza, frigorífico, ascensor, dormitorios, avalista).
