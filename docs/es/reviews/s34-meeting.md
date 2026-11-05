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

## Audit (5 Nov 2026)

A fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), the brief, the review above, the
cross-cutting leads (AUDIT/cross, AUDIT/neutral), the situation, the corpus and the held-out set; the transcripts at
seeds 3 and 7; probe.ts on ~120 extra turns (every NPC question with 6–20 replies each, and the questions a learner
asks in a meeting).

| | Before | After |
|---|---|---|
| check-content | 124/124 NLU, 13 sims 12/12, fuzz 80, 0/0 | 135/135 NLU, 15 sims 12/12, fuzz 80, 0/0 |
| corpus | 304/304, 0/55 false accepts | 350/350, 0/58 false accepts |
| held-out | 38/39 | 39/39 (one label fixed, below) |

**Found 27, fixed 26, by point:**

1. *Natural Spanish (2).* With a plural task Sofía said "¿Para cuándo crees que **va** a estar **listas las facturas**?"
   (upd_work_resp, upd_behind_resp, when_reask): now "¿Para cuándo crees que **vas a tener** {listo@X} {X.the}?", the
   learner as subject, right for every task. summary_ask "¿y **le** puedes mandar **a todos**…?" → **les** (the flag
   taught le for a plural); F_LE now names "a todo el equipo", F_LES is new.
2. *tú/usted:* nothing (tú both ways, ustedes to the team, the hints say tú).
3. *Names:* nothing here (Sofía is also s86's girl: s86's reviewer has it).
4. *Facts:* nothing ($80,000 a quarter, the lunch on Thursday at two, Monday at the same time: office facts no other
   conversation contradicts; the printer and "sistemas" agree with s88).
5. *Glosses and English (4).* clarify_ads "online ads" → "social media ads"; offline_sara "Hmm." for "Bueno." →
   "Okay."; aob_wfh_ok "put it in the calendar" → "on the calendar" (American); can_you_take "¿Te | encargas | tú?"
   glossed "Yourself | you-take-care | you?" → "¿Te encargas | tú?" "You-take-care-of-it | you?" (merge "te encargas",
   as "me encargo"; the spoken text is the same).
6. *Spelling, ¿¡:* nothing.
7. *Questions without an answer (10).*
   - "¿Cuándo es el lanzamiento?" / "¿Cuándo sale la app?": not understood (at "¿Algún otro asunto?" "Buen punto. Lo
     ponemos en la agenda…"). New q_launch: Pablo "Todavía no hay fecha definitiva. ¡Pronto les aviso!" (as
     add_customers_ok says), in the soft-launch version "El soft launch es la próxima semana; para todos, todavía no
     hay fecha."
   - "¿Para cuándo…?" → "Ya está listo." / "Ya lo terminé." / "Ya casi.": not understood; "Ya terminé las facturas."
     got "Claro." and the same question again. Now done_ctx / upd_done there make the update "done" (Sofía asks to
     send it); almost_ctx is a date. "No, ya está listo." is done; "Todavía no está listo." is no date yet.
   - The whole sentence "El reporte va a estar listo el viernes." (the update hint's own words) at "¿Para cuándo…?"
     got "Muy bien." and the same question again (upd_working there): with a date, or "ya casi", it now answers it;
     "Voy atrasado…, va a estar listo el lunes." too (upd_behind_ok).
   - "¿Por correo?" / "¿A quién?" at the send and summary requests: not understood; "¿A todos?" was nothing_more
     ("Muy bien."). New send_how_ctx: clarify_send at the send question (open again), a new summary_how "Sí, por
     correo, a todo el equipo. ¿Lo puedes mandar?" at the summary; a spoken "Por correo." (no question mark) agrees.
   - **Meaning flip:** "No, gracias." / "Gracias, estoy bien." to Pablo's "Si quieres, te ayudo con eso." got "Perfecto,
     lo vemos después de la reunión" (help accepted). A thanks with a no now declines; decline_help_ctx ("Te lo
     agradezco, pero no"); state helpAccepted.
   - "¿Dónde es la comida?" got the time: now aob_lunch #where, "Todavía no sabemos dónde, pero es el próximo jueves a
     las dos." (no restaurant named: no new town fact).
   - "Mañana no voy a venir." / "Voy a faltar el viernes." got "¡Disfrútalas!" (a vacation nobody mentioned); "Mañana
     tengo cita con el doctor." / "El viernes voy a faltar." were not understood. #away → aob_wfh_ok ("Nada más ponlo
     en el calendario").
   - A question at "¿Algún otro asunto?" ("¿Puedo salir temprano el viernes?", "¿Quién va a la comida?") got "Buen
     punto. Lo ponemos en la agenda de la próxima semana." Questions now get a new aob_q_ok "Buena pregunta. Lo vemos
     después de la reunión."; points ("Deberíamos…", "¿Y si…?") keep "Buen punto…".
   - "¿Qué piensa Sara?" / "¿Cuánto cuesta la fiesta?" at the budget: not understood. ask_back takes the first
     (your_first: "¡Primero quiero escuchar tu opinión!"); new q_cost answers with clarify_<proposal> ("todo el
     dinero").
   - "Mejor mañana." / "Sí, en la comida." to "¿Lo pueden hablar ustedes dos…?": not understood; talk_when_ctx agrees.
8. *Hints (1, left).* The "when" group's "Va a estar listo el viernes." is masculine for any task (the group has no
   slot to bind the learner's task); the grammar accepts either gender, so it stays.
9. *Accepted answers (9).* A trailing apology ("No puedo, perdón.", "Yo no puedo esta semana, perdón.") was not
   understood (cant_do, cant_send take [perdón | lo siento]); "Mejor que las tome Pablo." added Sofía's stray "Claro."
   (hear_yes on "Mejor"): one suggest_other pattern now; "Prefiero que lo haga otra persona." (cant_do); Mexico's
   "la semana que entra" / "la otra semana" (whenr, dl_view); "Lo voy a tener listo el viernes." (when_ans,
   when_tail); "Claro, en cuanto termine la reunión." / "Terminando la junta se lo mando." (will_send); the neutral
   "el almuerzo" (aob_lunch) and "el acta" (the notes); "Todavía no está listo." (when_not_ctx, with todavía / aún
   only: a bare "No está listo." stays unread rather than split into "No." + "Está listo."). Held-out "Sara, no te
   escuchamos" named only tell_mute; it is tell_mute_ctx, the same handling: both accepted now.
10. *Neutral (1).* Hint m_click "¡Prende tu micrófono!" had no twin: "¡Enciende tu micrófono!" (as s80 and s91a); the
    note says encender and activar work everywhere.

**New lines (voiced):** launch_when, launch_when_soft, summary_how, aob_lunch_where, aob_q_ok, and the m_click
twin. **Changed spoken lines:** upd_work_resp, upd_behind_resp, when_reask, summary_ask. Ids, steps, intents and twists
are unchanged; new intents: done_ctx, almost_ctx, send_how_ctx, decline_help_ctx, talk_when_ctx, q_cost, q_launch.
Tests: 11 NLU tests, 2 sims ("audit: the learner's own questions", "audit: help declined, the summary by email"),
49 corpus items (3 traps).

**For the lead:** a trailing "perdón" / "lo siento" isn't in the engine's built-in tolerance (lang.ts), so "No puedo,
perdón." fails wherever a pattern lacks it; "la semana que entra" / "la otra semana" could go into the shared {day}
slot. For the owner: "la comida" (Mexico's lunch, s88 and here) and "la minuta" (a hint) have no neutral twins
("el almuerzo", "el acta"); both are accepted from learners now.
