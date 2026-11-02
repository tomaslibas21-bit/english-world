# Review: s80-support-call ("Su llamada es muy importante"), writer's commit 209e839e

Files: the conversation (1430 lines), its corpus, the new blind set `tests/es/heldout/s80-support-call.json`. No shared file touched.

## Gate, before → after
| Check | Writer | After review |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 102/102 NLU, 9 sims 12/12, fuzz 80, 0/0 | 119/119 NLU, 10 sims 12/12, fuzz 80, 0/0 |
| corpus coverage | 209/209 (100%), 0/21 false accepts | 224/224 (100%), 0/21 false accepts |
| vitest | 287/287 | 287/287 |
| **Blind set** (41 + 3 safety items, 9 traps) | **36/41 = 87.8%**, 0/3 false accepts | **40/41 = 97.6%**, 0/3 false accepts |
The writer's claims all held. The one blind miss left, "Hace dos días", is read as `since_ctx` (the draft's intended reading of a bare time); I left my blind label as it was. The after-score isn't blind.
## Fixes (≈ 119 lines added, 22 changed; about 45 must-fix, 25 polish, 50 tests)
**meaning-safety (must-fix, ~30 lines)**
- "Mi esposo, pero solo en la tarde" at "¿Puede haber alguien más…?" booked the **morning** visit. Now the time named is offered (shared `altAsked`).
- "No puedo el jueves, ¿y el viernes?" asked two questions in one turn ("¿alguien más…?" and "¿Qué tal el viernes?"). My first fix booked Thursday with the refused day's slot. Now the other day is offered alone, and the refused day never goes to tech_other.
- "Trabajo en la tarde" offered the afternoon window (`tech_other_ctx` after `tech_busy` in the same turn). Now it's ignored.
- "No sé cómo" at "¿Ya reinició el módem?" got "No me quejo. ¿Y usted?" (global ¿cómo está?). It's now `restart_no` and leads to the unplug request.
- At "¿Lo puede desconectar…?", "No puedo" got "Muy bien. Ahora vuelva a conectarlo". Now: not yet → "Claro, sin prisa"; can't → "No hay problema" and the line test.
- "Necesito ayuda" / "Ayuda" while talking to Karla offered her supervisor. Now she says "Claro, dígame". An agent or a person asked for still goes to the supervisor line.
- A time said at the technician step ("Ese día trabajo…") also answered the outage question ("Entendido."). `since_ans` is now off once a window is offered.
**understanding (must-fix for the common ones, ~25 lines)**
"Estoy en casa todo el día", "¿Y si mejor el sábado?", "Jueves no, viernes" (lost comma: the correction reading), "El jueves en la mañana no, mejor en la tarde", "Mi esposa no puede, trabaja todo el día", "Se me cae la conexión a cada rato", "No es un problema de pago, es que no tengo internet", "Es sobre mi recibo", "Necesito un técnico", "No hay luz roja" (lights_neg), "La luz verde está prendida pero la roja parpadea", "No me acuerdo, creo que ayer", "Ya no necesito nada", "Nada más". New `more_yes_ctx` for "Sí, una cosa más" / "No, solo una pregunta" (rule 21).
**replies (rule 8/11, polish ~20 lines)**
- "No sé" at "¿Desde cuándo…?" looped "Tómese su tiempo". Now "No se preocupe." and she goes on. At "¿alguien más…?" it now gets another window.
- "¿Cuándo me regresan mi dinero?" with no double charge got "No hay problema". Now it gets a new line, "Mmm, no veo ningún cargo por reembolsar en su cuenta". On the charge twist, the question reports the double charge.
- "No, todavía no" while she waits repeated the unplug request word for word. Now she says "Claro, sin prisa".
- "Ya funciona" at the technician offer now gets "¡Ah, qué bien! Pero todavía veo una falla en la línea".
- "No lo apagué, lo desconecté" no longer gives both "¿Lo puede desconectar…?" and "Gracias por intentarlo".
**gloss-english**: "¿Con quién tengo el gusto?" → "Who am I speaking with?" (the draft had "And who…"). I checked about a third of the glosses and every flag index; no other problems.
**spanish / twins / numbers / structure**: natural Mexican call-center Spanish (Le atiende, ¿Con quién tengo el gusto?, folio, asesor, Tiene razón, una disculpa). The Mexican-only words módem, ahorita, recarga and prender each have a neutral twin. Usted throughout. The account number is read in pairs and digit by digit. The English steps, intents and the four twists are all kept.
**tests**: 17 NLU tests (8 traps), 16 corpus items, and 1 sim covering the new paths.
## For the lead / owner
- $499 (a double-charged plan) is a typical plan price, not rounded to 5 as STYLE.md asks. Real plans end in 99, so I kept it.
- A bare "No" to "¿Sigue en rojo la luz?" still gets the neutral "Mmm, entiendo." (as in the English original). Nothing is recorded differently.
- "¿Puede venir el viernes en la tarde?" is offered Thursday afternoon, since there's no Friday-afternoon window. The English original does the same.
