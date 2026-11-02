# Review: s89-video-call ("¡Estás en silencio!"), writer's commit 1088c5de

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 113/113 NLU, 10 sims 12/12, fuzz 80, 0/0 | 126/126 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus coverage | 439/439 (100%), 0/72 false accepts | 457/457 (100%), 0/75 (21 review items added) |
| blind set (43 items, 10 traps) | 37/43 = **86%**, **1/10 traps** ("Yo no, empieza tú" read as volunteer_ctx) | 41/43 = **95%**, 0/10 |

Claims held. The 2 blind misses left are my narrow expectations ("¿Ya me ven?" = cam_fixed, the hint; "¡Uy, perdón! Adiós" = bye_all).

## Fixes (about 90 lines of must-fix, 25 of polish, 35 of tests)
**meaning-safety (must-fix, ~30 lines)**
- At Pablo's help offer, "Sí, nos vemos después de la llamada" and "Gracias, Pablo, hablamos después" ended the whole call (bye_all / g_bye
  → goodbye, leftEarly). The offer now takes g_bye, bye_all and next_week_yes as a yes, and `laterTalk` keeps "después de la llamada" or
  "hablamos luego" from ending the call before the closing.
- "Sí, me parece bien" to Pablo's offer → "A la misma hora, la próxima semana": it is the global yes, now out of next_week_yes.
- "No, la próxima semana no puedo" / "estoy de viaje" set vacation, so Sofía said "¡Disfruta tus vacaciones!". Now only "vacaciones" sets it
  (`away` otherwise, plain goodbye). My own first pattern took "No estoy de vacaciones"; the corpus caught it, and the leading "no" is gone.
- "Yo no, empieza tú, Sara" parsed volunteer_ctx ("yo"). Now defer, plus a `defer_ctx` for a bare "Yo no" at "¿Quién empieza?" only (rule 2).
- At the screen question, "No, todavía no" was hear_no and Sofía asked "¿Así está mejor?". It now counts as no screen. A second no got
  "Claro, la hago más grande" (inherited from English, rule 11); it now gets "Mmm, qué raro. Bueno, les mando la presentación después."
- At the echo, "¿Es mi micrófono?" muted the mic and Sofía said thanks. A question now gets "Sí, creo que sí. ¿Te puedes silenciar?" and holds.
- "¿Me ven ahora?" with the camera off gave "Sí, te escuchamos, pero tienes la cámara apagada" and then "¡Ahí estás!". It is now cam_fixed.
- Leaving while Sofía is frozen: she answered "¡Claro! Pero antes…" mid-freeze (the writer's open question). Now she comes back with
  "¡Perdón, me congelé! ¿Qué me decías?", and the learner says it again (new sim).
- "Terminé el reporte y ahora estoy con la presentación" asked two questions at once; `react` answers the first part only.

**understanding (must-fix for the common ones, ~25 lines)**: "Ay, perdón, ya prendo la cámara", "Un momento, la enciendo", "No me había
dado cuenta", "Prefiero no prenderla", "Te escucho pero no te veo", "Pablo, no te escuchamos, activa tu micrófono" (one pattern for
both pieces), "Sigo sin ver nada", "No muy bien, estuve enfermo", "Ya mero termino…", "Con el presupuesto", "No sé si te lo puedo mandar
hoy", "No voy a estar, estoy de viaje", "¿Puedo hacer una pregunta?", "No, solo una pregunta más: ¿…?" at "¿Algo más?" (rule 21),
"Yo no puedo empezar", "Bueno, yo sigo", "¿A qué hora?" at the closing.

**spanish (polish, 4)**: not_muted_resp "Mmm, yo creo que sí" answered "Yo sí lo escucho" → "Mmm, yo no lo escucho. Su micrófono está en rojo."
**gloss-english (polish, 3)**: "Everyone | me | hears?" / "Everyone | sees" → "All of you | …" (+ ustedes flag); b_vacation English lost "Actually".
**numbers, twins, facts, structure**: unchanged (padre, ahorita, junta, prendida: 4 of ~100 lines, all twinned). New: defer_ctx, 4 lines
(screen_give_up, freeze_missed, echo_q_yes, bye_kate_away), 1 merge. **tests**: 13 NLU (5 meaning-safety), 2 sims, 21 corpus items (8 traps).

**For the lead**: nothing risky left open. There is no money here; ending the call, Sara going first and the update were played with probe.ts.
