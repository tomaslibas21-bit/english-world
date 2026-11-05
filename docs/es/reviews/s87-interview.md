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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md, the brief, the review above, the
cross file and the neutral digest (11 twins), the situation file, the corpus and the held-out set, `review.ts` seeds 3
and 7 in full, and ~240 probe turns (`tools/probe.ts`) at every step and at the job offer (60 answers there, alone and
in one breath with a thank-you or a question). The English original (main) read for shared bugs.

| Check | Before | After |
|---|---|---|
| `check-content --verbose` | 175/175 NLU, 15 sims 12/12, fuzz 80, 0/0 | 202/202 NLU, 18 sims 12/12, fuzz 80, 0/0 |
| corpus | 285/285, 0/49 false accepts | 331/331, 0/55 |
| held-out | 38/38, 0/4 | 38/38, 0/4 (not touched) |

**By point.** 1 Spanish: "Son muy buenas cualidades" after one quality ("Soy trabajador"). 2 usted: right throughout
(lines, hints, the tú patterns tagged). 3 names: Licenciada Salinas, María, el ingeniero Montes, as the cast. 4 facts:
hours 9–6, lunch 2–3 and the dress code agree with s88; the range $14,000–17,000 a month, the prestaciones de ley
(seguro social / IMSS, aguinaldo, vacaciones, days left to the law) kept; the only voiced value is the 9:30 of the
interview (`values-es.ts`: 1 value per line, kept by reach-es.ts). 5 glosses / English, 6 spelling, 10 the neutral
text: nothing wrong; the four new lines need no twin (lunch is "para comer", never "la comida"). 7 answers and offers:
the rest of this list. 8 hints: right; "¡Qué buena noticia!" (o_wonderful) stays as a hint, now a reaction she follows
with "¿Acepta el puesto?". 9: below.

**The job offer: only a clear yes takes it (binding).**
- "¡Qué buena noticia!" took the job; so did "Muchas gracias. ¡Qué buena noticia!". Joy ("¡Qué buena noticia!", "¡Qué
  emoción!", "¡Qué padre!", "Me interesa mucho", "Estoy muy feliz") is now `joy_ctx` (offer only): "Entonces, ¿acepta el
  puesto?" once, a second one leaves it for Friday, as a thank-you does; with a "sí" in the same breath it accepts.
- A thank-you in one breath with the answer asked first and then answered itself ("Gracias, ¿lo puedo pensar?" →
  "Entonces, ¿acepta el puesto? … Claro. Tómese su tiempo…"; "Gracias, sí acepto", "Gracias, me encantaría"): the rest
  of the breath now answers (the turn's pieces are read, as s33 does).
- "Sí, gracias", "Sí, muchas gracias", "Claro, gracias", "Por supuesto, muchas gracias" got the question again: a yes
  word with the thanks now accepts; "Está bien, gracias", "Vale, gracias", "Ok, gracias" still ask (rule 17).
- "Lo acepto", "Sí, lo acepto", "Acepto su oferta" were not understood. "Tal vez" / "Quizás" leave it for Friday.
- "¡Qué emoción!" got "¡Sí, en serio!"; "¡Wow, qué bien!" and "¡Wow! ¡Muchas gracias!" dropped the open offer ("Muy
  bien." and no way left to accept): `surprise_ctx` now lets the other piece answer and keeps the offer open; a second
  "¿En serio?" gets "Entonces, ¿acepta el puesto?" (not the same line twice).
- "¿Cuáles son los siguientes pasos?" while the offer was open said "Esta semana vamos a entrevistar a otros
  candidatos": now the contract and the training, then "¿acepta?". Questions about the terms (pay, hours, benefits…) are
  answered first, then she asks once ("Me interesa, ¿cuánto pagan?" asked before answering).
- At the goodbye: "Sí, acepto" again once hired got "Al contrario…" (the reply to a thank-you): now "Fue un gusto
  conocerlo"; "¡Acepto!" after "lo pienso" or a no takes the job after all (it ended with nothing recorded).

**Answers that looped or got the wrong reply.**
- "Tengo diez años" at "¿Cuánto tiempo tiene trabajando como contador?" was an age: "Ah, qué bien" and the question
  again. Now experience when it answers that question (or is under 16); "Tengo treinta años" when she asked about the
  learner stays an age, "de edad" always.
- "Soy mexicano" / "Soy de aquí" at "¿Tiene permiso para trabajar en México?" got "¡Qué padre!" and the question again:
  now a yes. "No, todavía no tengo permiso" was "no sé" + the answer ("Sin prisa. Muy bien…" and no next question).
- "Más o menos, me perdí un poco" got "¡Ay, no!…" and then "Muy bien.": one reaction per answer.
- `future_ans` had bare "aquí / en la empresa / como gerente" as a plain intent: "¿Qué hace la empresa?" got "Lo reviso
  y le aviso" + "Suena muy bien". The bare places and roles are `future_ctx` (five-years question only).

**Questions with no answer or the wrong one (she is the HR manager: "Lo reviso y le aviso" is wrong for what she knows).**
- Benefits by law: "¿Tienen IMSS?", "¿Hay prima vacacional?", "¿IMSS e Infonavit?", "¿Seguro de gastos médicos
  mayores?" got "Lo reviso…"; "¿Me dan de alta en el seguro social?" not understood → the prestaciones de ley line.
- "¿A qué hora es la comida?" ("Lo reviso…"), "¿Cuánto dura la comida?" → new line: "Tiene una hora para comer, de dos
  a tres." (s88's hours).
- "¿Cuál sería mi sueldo?" ("Lo reviso…") → the range. "¿Hay que usar traje?", "¿Puedo usar jeans?" ("Lo reviso…") →
  the dress code.
- "¿A qué se dedica la empresa?" / "¿Qué hace la empresa?" → new line: "Somos una empresa de servicios: atendemos a
  clientes de toda la zona." (nothing in the edition says more; for the lead).
- "¿Cómo es el ambiente de trabajo?" (a top interview question) → new line: "Muy bueno, la verdad. Es un equipo muy
  unido."
- Not understood before: "¿Es de lunes a viernes?", "¿Y el horario?", "¿Y las vacaciones?", "¿Cuántos días de home
  office?", "¿Qué es lo que más le gusta de la empresa?", "Sí, una" / "Sí, varias" (to "¿Tiene alguna pregunta?", the
  questions step only: `can_ask_ctx`), "No, ya me explicó todo".
- Pesos a month: a salary in dollars ("Mil dólares al mes") was not understood → new line "Aquí pagamos en pesos.
  ¿Cuánto sería en pesos, al mes?" (once; a second answer in dollars is noted). "Lo que sea justo", "Me parece justo",
  "No me parece justo" (range, `range_ctx`); "Cuando quieran", months ("En enero", "A principios de diciembre"); "Sí, ya
  tengo mi tarjeta", "visa de estudiante", "residente temporal pero sin permiso de trabajo"; "Agua natural".

**Lines.** New (4, no values, no twins): `salary_pesos`, `a_lunch_time`, `a_mood`, `a_company`. Split: `strength_ack`
(one quality) / `strength_ack_many` ("Son muy buenas cualidades", same text, 2+ qualities). No other spoken line
changed. One speaker only; no plural items.

**Tests.** 27 NLU tests, 3 sims (joy then yes: `offerThanked` and hired; thanks + "¿lo puedo pensar?" in one breath,
then "Bueno, sí acepto": hired with no "¿acepta?" first; dollars then pesos, IMSS, lunch, atmosphere, the company);
corpus +46 items and +6 traps ("¿Y si acepto?", "No lo acepto", "No me interesa mucho", "No estoy contento", "No soy
mexicano", "No sé, no en dólares"); "¡Qué buena noticia!" is now a trap for accepting.

**Left.** For the lead: what Línea Clara does (s87 now says "una empresa de servicios"); the global `g_dontknow` read
"No, todavía no tengo permiso" as "no sé" (fixed here with a whole pattern; other conversations may have the same
"No, todavía no + answer"). Not changed (minor): something other than "no problem" while she takes the phone call
("Gracias", a question) is answered without her "Gracias por esperar"; "¡Mucha suerte!" in the goodbye after a hire.
