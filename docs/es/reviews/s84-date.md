# Review: s84-date ("¿Te puedo volver a ver?"), writer's commit acb9f490

## Gate and blind set
| | Writer (acb9f490) | After review |
|---|---|---|
| check-content | 96/96 NLU, 12 sims 12/12, fuzz 80, 0/0 | 122/122 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 213/213, 0/29 false accepts | 229/229 (16 added), 0/29 |
| blind set (37, written before reading) | 33/37 = 89.2%, 0/3 traps accepted | 37/37 = 100%, 0/3 (not blind any more) |
| tsc / vitest | clean / 288 | clean / 288 |

The blind misses: "…, la verdad" after nervous and "no me gusta mucho"; "No hace falta, yo pago"; "No sé, tal vez".
The probes (tools/probe.ts, ~90 turns: pay, split, the offer, the second date, drinks, topics) found the must-fixes.

## Fixes (file: +148 / -35 lines)
**meaning-safety, must-fix (~50 lines)**
- "Yo pago la mitad" parsed pay_all + split: the partner thanked the learner for paying everything. Now split ("mi parte", "lo mío", "la mitad cada uno").
- "No, de verdad, yo pago" at "Yo invito, ¿eh?" hit accept_offer ("de verdad") and the partner paid. accept_offer and g_thanks now step aside when the same turn pays or splits ("La próxima pago yo" still accepts).
- Bare "nada", "no tomo {drink}", "no quiero {drink}" were in the plain no_alcohol: "Nada, estoy de vacaciones" at the job question and "No tomo café" at "¿Café o té?" got the agua de jamaica line and set noAlcohol; "Nada" at the check too. Now no_drink_ctx, at the drinks question only.
- "Sí, claro, pero este fin de semana no puedo" and "No, el domingo no puedo" at "¿Te puedo volver a ver?" were a no: the evening ended. A refused day is now yes plus another day (dayNo/nextWeekendDay remember the refused days; Saturday stays the parents' day in the twist).
- After "¿Cuándo tienes tiempo?" a "No" offered Sunday again although Sunday had just been refused; "El domingo no puedo" when Saturday was offered got "¿y el domingo, entonces?". Fixed by the same helper.
- "No, perdón, no creo" said "Ah... está bien. Sin presión…" twice in a row (no_sorry + decline_again). Now once.
- Adding day_ctx at the again step ("Sí, ¿el sábado?") briefly made "Sí, pero no el sábado" book Saturday; a decline pattern and a test close it.

**numbers / rule 11, must-fix (~14 lines)**: "¿Cuánto es?" got "No es mucho, no te preocupes". Now: before the check "Todavía no nos traen la cuenta"; at the check "A ver... son $1,280" (the check waits for who pays); after splitting "$1,280, o sea, $640 cada quien"; after the partner's treat "¡Ni lo pienses! Yo invito" (kept) or "¡Ya está pagada!".

**understanding (~25 pattern lines)**: trailing "la verdad"; "No hace falta / Gracias, pero yo pago"; "¿Segura? Mejor dividimos"; "¿Quieres que paguemos a la mitad?"; "Sí, ¿el sábado?", "Me encantaría. ¿El sábado?", "Claro, ¿este fin de semana?" (day_ctx at the again step); "¿qué tal si vamos a un cenote?"; "Tal vez la próxima semana"; "Te iba a preguntar lo mismo"; "Me gustaría, pero no sé cuándo" (was "¡Piénsalo!" + "¡Qué bueno!"); "No puedo ese día", "No, tampoco", "El sábado no, el domingo"; "Ninguno (de los dos)", "No tomo café" at the quick questions; "Me encanta la música"; "Tengo una chamba en un hotel", "Antes era maestro, pero ya no trabajo"; "Una cerveza. No, mejor una limonada" (the second drink); "No, tú mándame un mensaje"; "¿Tienes frío?" at the cold twist (new cold_q_ctx: "Un poquito, sí.", then the sweater may follow).
- "Soy estudiante. ¿Tú?": "¿Y te gusta?" was asked and then buried under the partner's own job; a bare final "¿Tú?" now counts as asking back.

**spanish, polish (1 line)**: ask_back "¿Y tú qué?" can sound curt → "¿Y tú, qué me cuentas?".
**gloss-english, polish (1 line)**: hint "Shall we go halves?" (British) → "Should we split it fifty-fifty?". New lines glossed; 2 merges registered (no nos traen, cada quien). About a third of the glosses read: no other errors.
**twins/facts/structure: no change.** padre 1 line, no manches 2, each with a twin. El Muelle matches TOWN.md and s69 (seafood on the malecón, "un poquito caro"). Same id, steps, intents and twists as the English, plus the writer's ask_amount and which_day.
**tests**: 26 NLU tests (the blind traps and each fix), 1 sim (the price, my half, not this weekend), 16 corpus items.

## For the lead / owner
- New figure: dinner for two at El Muelle with drinks = $1,280 (two seafood mains ~$450 each + drinks). The writer had avoided prices, but rule 11 wants a price for "¿Cuánto es?". It stays inside STYLE.md's ranges for a pricey place. Owner may prefer another sum.
- Kept: "Me encantaría, pero no puedo" (with no day) at "¿Te puedo volver a ver?" is a polite no and ends the evening, as in English. A bare "No te preocupes" / "No, gracias" at "Yo invito" means splitting.
