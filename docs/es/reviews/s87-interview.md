# Review: s87-interview ("¿Por qué deberíamos contratarlo?"), writer's commit 850846c2

| Check | Writer | After review |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 152/152 NLU, 12 sims 12/12, fuzz 80, 0/0 | 175/175 NLU, 15 sims 12/12, fuzz 80, 0/0 |
| corpus (285 items) | 285/285, 0/49 false accepts | 285/285, 0/49 (32 items now also accept the new `_ctx` intents) |
| blind set (38, 4 traps, written before reading) | **33/38 = 86.8%**, 0/4 traps | 38/38 = 100%, 0/4 (not blind any more) |

Blind misses: "¡Sí, acepto con mucho gusto!" and "¿Puedo pensarlo un par de días?" at the offer, "No, creo que eso es todo,
gracias", "En cinco años me veo como gerente de un equipo", "Porque tengo experiencia y soy muy responsable".
Still not understood (safe): "No lo puedo creer, ¡acepto!", "Acepto, pero necesito empezar en un mes", "¿Y si no puedo empezar el lunes?".

## Fixes (diff of the conversation: 58 lines changed or removed, 201 added)

**meaning-safety, must-fix (~80 lines).** Probed the offer with 42 answers (rule 22) and every step's answers.
- Bare times were a plain intent: "Ya no quiero el puesto" at the offer = decline + start date ("…gracias por su tiempo. Perfecto."); "Ya, gracias" at her questions recorded a start date and said "Perfecto." Bare "Ya / Mañana / El lunes / En dos semanas / Cuando ustedes quieran" are now `start_ctx` (start step only).
- "¿Cuándo empiezo?" at the offer took the job; it now gets the start date and "Entonces, ¿acepta el puesto?" (rule 17).
- "No, gracias" at the offer asked "¿acepta?" again and a second one left it "for Friday": it now turns the job down.
- "Me encantaría, pero tengo que pensarlo" / "Sí, pero lo tengo que pensar": a "pero/pensarlo" in the same breath holds the yes (think it over). Accepting, thinking and declining are one per turn (`offerDone`), and the outcome is recorded in `offerState` (hired / think / no).
- "Me encantaría", "¡Qué buena noticia!", "Con mucho gusto" accept only at the offer (`accept_ctx`); "¿En serio?", "¡No lo puedo creer!" get "¡Sí, en serio! ¿Acepta el puesto?" (`surprise_ctx`), and with a question in the same breath the question is answered first.
- "No sé qué decir, ¡muchas gracias!" at the offer got "Lo básico: a qué se dedica…"; `what_know` now answers only at "Cuénteme de usted".
- After the job was accepted, "¿Cuáles son los siguientes pasos?" said "vamos a entrevistar a otros candidatos"; now the contract, or "Usted me avisa el viernes" after "lo pienso".
- "Gracias, que tenga buen día" while she waited for questions ended the interview with "¡Nos vemos!" and no completion; it now closes properly.
- "Todo bien / Más o menos / Un poco difícil" (found_hard) answered other questions ("Más o menos" at "¿Le parece bien?" → "Muy bien."): now `found_ctx`. "Nada más / Ya no" (no_questions) answered "Fui contador, pero ya no": now `no_questions_ctx`. "No sé, ¿cuánto pagan?" said the salary range twice.

**understanding (~30 pattern lines).** "Acepto con mucho gusto", "pensarlo / lo tengo que pensar / déjeme pensarlo", "ya acepté otra oferta", "creo que eso es todo / solo eso", "en cinco años me veo como…", "tengo experiencia y soy…", "No sé, a veces soy impaciente", "Sí, pero mi permiso todavía está en trámite", "Tengo visa de turista", "Me parece poco / Más o menos" at the range, "¿Y el sueldo? / ¿Cuánto voy a ganar?", "Trabajé diez años en un banco", "No son diez años, son cinco", "Fui contador pero ya no" (not the job), "No puedo el lunes, mejor el primero de diciembre", "Me encantaría trabajar aquí / un café".

**answers that fit the question (rule 11, ~25 lines).** "¿Quién me va a capacitar?" got "¡Sí! …"; "¿El estacionamiento tiene costo?" got "Sí, … sin costo"; "¿Es de tiempo completo?", "¿Se trabaja los sábados?", "¿Hay horas extra?", "¿Quién sería mi jefe?" (Ingeniero Montes, npcs.ts), "¿Cuántos días de vacaciones?" ("Las que marca la ley", vague on purpose) now get their own answers; "¿Puedo empezar el lunes?" among her questions is answered, not "Perfecto."

**gloss-english (polish, 2 lines).** Hint "No, todo está muy claro" said "you've covered everything"; "Estoy abierta a negociar" said "I'm flexible". Read a third of the glosses: no other errors.

**spanish, numbers, twins, facts, structure.** No change needed: usted throughout, gender forms right, 7 Mexican-only lines with twins, salary in pesos a month, steps/intents/twists as in the English file.

**tests (~38 lines).** 23 NLU tests (traps with `not`), 3 sims: the offer's terms then "No, gracias" (state offerState "no"), "Me encantaría, pero tengo que pensarlo" (think), a goodbye while she waits for questions.

## For the lead / owner
- The writer's NEEDS stand (a first name for Licenciada Salinas; a piece starting with "fue").
- "Vale" or "Claro que sí" alone at the offer takes the job (a present yes, as rule 17 allows); "Está bien, gracias" asks again.
- Unsure facts unchanged: the $14,000–17,000 range, 9–6 office hours, "casual de negocios".
