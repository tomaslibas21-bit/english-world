# Review: s34-meeting ("¿Algún otro asunto?"), writer's commit 716c64be
## Gate and blind set
| | Writer (716c64be) | After review |
|---|---|---|
| tsc | clean | clean |
| check-content | 102/102 NLU, 10 sims 12/12, fuzz 80, 0/0 | 124/124 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 234/234, 0/50 false accepts | 304/304, 0/55 false accepts |
| blind (39 items, 9 traps) | 34/39 = 87.2%; 1 trap flipped ("Lo puede hacer Sara" = the learner volunteers) | 38/39 = 97.4%; 0 traps |

The blind miss left is "Sara, no te escuchamos" → tell_mute_ctx, which is the right handling (my item named tell_mute). One blind item now also accepts when_ctx, because the intent was split (below). The after-score isn't blind.
## Fixes (205 lines added, 42 removed in the conversation; corpus +70 items)
**meaning-safety, must-fix (~70 lines)**
- "Lo puede hacer Sara", "Sara/Pablo lo puede hacer" were read as can_do: the learner took the task (or the notes). puede is one slip from puedo. Now it's suggest_other, along with "Yo no, Sara sí", "Pablo puede, yo no", "¿Y si las toma Pablo?" and "Sara, ¿puedes tú?". At the notes twist, Sara can now take the notes.
- "No se lo mando" became "No sé" + "lo mando": the summary (and the send) counted as a yes. It is now cant_send.
- Bare dates were in the plain intent when_ans (rule 2). "Mejor la próxima semana" at the deadline fight got "¡Perfecto, gracias!" and recorded no side. "Mañana no voy a estar" got two replies. Bare dates are now when_ctx, expected only at "¿Para cuándo?" (and as a yes at the send and summary questions). when_ans keeps the forms with a verb.
- "No para el viernes" / "No va a estar listo el viernes" / "El viernes no" were taken as the date. They're now when_not_ctx ("No pasa nada, mantenme al tanto"). "Para el lunes, no para el viernes" means Monday.
- The deadline fight, rule 10: "No con Sara, con Pablo" recorded Sara. Now it records Pablo. "Con Sara no con Pablo" has lost its comma, so Sofía asks once more (#amb). "No el viernes, la próxima semana" → Pablo's side. "Con ninguno" → no side.
- "Todavía no" was in hear_no, so it meant "can't hear Sara" anywhere ("¿Se entiende?" → "Muy bien."). Removed: the pending's no takes it.
- "Estoy de acuerdo, pero es mucho dinero" recorded agree. Now disagree.
- "No, todavía no entiendo" at "¿Tú qué opinas?" recorded opinion = unsure. Now it's clarify.
- "Está claro" at "¿Alguna pregunta?" got "¡Claro, dime!". Now it means no questions.
- "Nada bien" got "Muy bien, gracias". "No estoy de acuerdo, es mucho dinero" said before the budget skipped the whole budget point.
- A bare "Gracias"/"Adiós" at the summary request ended the meeting with nobody sending it. Now Sofía asks again, then sends it herself.

**understanding (~45 pattern lines):** "No estoy seguro de estar de acuerdo", "Entiendo tu punto, pero creo que…", "No me parece mala idea", "Me da igual", "Claro, les mando un resumen esta tarde", "Más o menos / No del todo" at "¿Se entiende?" (new sense_no_ctx), "Te escuchamos, pero muy bajito", "Estoy atrasado", "No mandé las facturas", "Prefiero no", "No puedo hacer el video", "¿Puedo trabajar desde casa?", "¿A qué hora es la comida?", "Me voy de vacaciones", "Que les vaya bien", "¿Cuánto dinero tenemos?" (q_budget).

**spanish and logic, polish (~20 lines):** "Yo lo hago" after siding with "more time" no longer gets "Para el viernes, entonces". "Puedo hacerlo el lunes" gets "Pero lo necesitamos para el viernes, ¿eh?". "Estoy atrasado" + "Con el reporte" now records behind, not "Suena bien". "No me parece mala idea" at "¿Por qué?" changes the opinion to agree. "¿Un resumen de qué?" gets an answer.

**gloss-english, must-fix (2 lines):** two flags pointed at the wrong unit (rule 15). updates_first (pendientes 8→7) and upd_ok_resp (ahorita 7→6, which was past the end).

**twins (4 lines):** "le hablo" (flagged as Mexico) got twins with llamo (dl_client, aob_printer_ok). The awkward term_slip twin is now "Mover la fecha quiere decir pasarla a un día más tarde". Twins: 5 lines.

**facts:** no change. The $80,000 quarter, lunch next Thursday at two and the meeting next Monday are vague, invented office facts. No other conversation uses them.

**structure:** same id, steps, English intents and twists. New intents: when_ctx, when_not_ctx, sense_no_ctx, q_budget.

**tests:** 22 NLU tests (traps: someone else, refusals, a past, a negated reason, dates out of place). 3 sims: corrections, notes by Sara, summary thanks→no. 70 corpus items and the blind set. I played the binding outcomes with probe.ts (notes, owner, summary, deadline side, send): what-ifs, refusals, polite closings and a past.
## For the lead
- Kept as the writer chose: "No, todo claro" means still unclear. New, by rule 10: "No, todo bien" at "¿Cómo vas?" means all good (the likelier reading).
- Left as is: "Ok / Va / Está bien" at "¿Quién se encarga?" volunteers, as in the English. "Ya hice el manual" there also takes the task; no money is involved.
