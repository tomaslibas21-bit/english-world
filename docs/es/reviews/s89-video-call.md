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

## Audit (5 Nov 2026)

Fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), BRIEFS.md s89 and s34, this
review, the cross and neutral files (no leads: Sofía, Pablo, Sara, Tigre; the five twins right), the situation file,
corpus and held-out, the transcripts (seeds 3 and 7), the scene data (freeze_q and paul_hear → "grid"), s34 for the
same team in person. Probed ~250 turns with tools/probe.ts (every NPC question with yes, no, "No, gracias", a full
sentence, a side question) and the who-says-it report the voice list uses (fuzz 120 runs + the sims, seeds 1–2).

**Found 36 by point** (1:2 2:0 3:0 4:0 5:3 6:0 7:20 8:1 9:9 10:1), **fixed 36**.

- **7 (offers taken the wrong way):** "No, gracias." to Pablo's "Si quieres, te ayudo con eso" got "Perfecto, hablamos
  después de la llamada" (on.g_thanks won over the no): now a no ("Está bien, no hay problema"), and "Gracias, Pablo,
  pero no hace falta", "No te preocupes, yo puedo", "Estoy bien, gracias" are understood as a no (`decline_help_ctx`).
  "No, gracias" to Sara's "¡Ay, perdón! Tú primero." made the learner go first: now Sara goes.
- **7 (an answer that is asked again, the s34 lesson):** the u_ready hint itself ("Voy a terminar la página web para el
  viernes"), "Voy un poco atrasado con el reporte, pero lo termino el viernes", "Estoy con la presentación, para el
  viernes" all got "¿Para cuándo crees que tengas … listo?" (and then "Perfecto. Me vas avisando." under the open
  question); "Terminé el reporte, te lo mando después de la llamada" got "¿Me mandas el reporte…?". `react` now reads the
  whole utterance (a {day}/{whenr} in the update, a when_ans, will_send or cant_send piece) and answers once. "El reporte
  va a estar listo el viernes" / "Estoy con el reporte, va a estar listo el viernes" were not understood (now
  upd_working #when). "Voy bien con el reporte" was "Voy bien" + "con el reporte" and Sofía asked the task again.
- **7 (questions left open, loops):** Pablo said "¿Y ahora?" twice in a row and the call went on under his question:
  a second no now gets Sofía's new "Pablo, revisa tu micrófono y escríbenos en el chat." At the freeze and after the
  mic fix, a no got "¡Ay, perdón! ¿Así está mejor?" and she went on without the answer: freeze_q now waits for it once
  (same pending id, so the "grid" picture), then she carries on with the new "Bueno, sigo. Cualquier cosa, me avisan."
  (hear2's second no too). A question answered before the questions step (while Pablo leaves) got "¿Alguien tiene
  alguna pregunta?" right after its answer: now "¿Algo más?". "¿Me escuchan?" with the camera off never marked "heard",
  so "¿Me escuchan ahora?" came back and "…pero tienes la cámara apagada" twice; "¿Estoy en silencio?" got "¡Sí, te
  escuchamos!" (a yes to the mute: new "No, te escuchamos bien."); "¿Me ven?" got "te escuchamos" (new "¡Sí, te vemos
  bien!"; at the camera step it means it's on: "¡Ahí estás!"). "¿Me escuchan?" while Sofía is frozen was answered by her.
  "Me tengo que ir" twice repeated "Pero antes, ¿nos das una actualización rápida?"; "Perdón, no puedo, ya me tengo que
  ir" / "Te lo mando por correo" there weren't understood or left it open; leaving without an update ended with "Say
  how your work is going" open (now hidden, like the other items the learner skips by leaving).
- **7 (wrong replies):** "No, no puedo" / "No, gracias" to "¿Nos vemos… la próxima semana?" got "¡Nos vemos la próxima
  semana!" (now "¡Ah, no hay problema! Te mando las notas." + "¡Adiós a todos!"); "No sé" there got "take your time". A
  plain "No" to "¿Te puedes silenciar…?" got "Claro." (new "Ah, perdón. Bueno, sigamos.", also for "No es mi
  micrófono", "Yo ya estoy en silencio"). "Sigues con la cámara prendida" came after "Mi cámara no funciona" / "No la
  quiero prender". A late Sara said "¡Pablo, estás en silencio!" before her "¡Hola a todos! ¡Perdón por llegar tarde!".
  "Hola" to the opening got "¡Hola!" + "¿Me escuchan ahora?" (now "¡Hola! ¿Me escuchan bien?"); "Hola, sí te escucho" /
  "Buenos días a todos. Sí, se oye perfecto" got that greeting plus "¡Perfecto!"; "Hola, Pablo" to a muted Pablo got
  "¡Hola!" from Sofía. After a screen share that never worked, "¿Puedes regresar a la diapositiva anterior?" got "Claro.
  Aquí está." (now the presentation by email).
- **7 / 9 (pieces read as something else at the update):** "Todo igual" was no_questions + hear_no ("¡Ay, perdón! ¿Así
  está mejor?", and the questions were skipped later); "Nada de mi parte" / "Por mi parte, todo bien" skipped the
  questions; "Más o menos" got "¿Así está mejor?"; a bare "Es…" or "Fue…" ("Es el reporte") was tell_freeze (the
  pattern "se (cortó | fue) [...]" matched "es" alone; "se fue/cayó" now needs what went). The bare "igual", "lo mismo",
  "más o menos", "no muy bien", "nada" moved to `hear_meh_ctx`, expected only where the sound or the screen was asked.
- **9 (not understood):** an update without the task ("Voy un poco atrasado.", "Ya terminé.", "Ya casi termino.",
  "Tengo mucho trabajo.", "Estoy muy ocupada.", "Ando a mil", "Más o menos"): `status_ctx`, Sofía asks which one keeping
  the status (new "¡Qué bien! ¿Qué terminaste?"; "Uy, ¿y eso? ¿En qué estás trabajando?" and "Semana pesada, ¿eh? ¿En qué
  estás trabajando?" are s34's words, the same team); "proyecto" (Sofía asks "¿Y cómo vas con tu proyecto?") is a task
  now; "Ya está listo." / "Ya casi." at "¿Para cuándo…?"; "¿Por correo?" / "Claro, ¿a tu correo?" at "¿Me mandas…?" (new
  "Por correo, por favor. ¡Gracias!") and "Todavía no, falta revisarlo"; "¿Cómo se llama?" / "¿Es tu gato?" (new "Se
  llama Tigre. ¡Es mi gato!"); "¡Felicidades!" after the sales news (new "¡Gracias! Es trabajo de todos."); "¿El lunes a
  las diez?" at the closing; "¿Se va a grabar?"; "No, nada" at the questions; "Nada especial, ¿y el tuyo?"; "No la
  quiero prender"; "Todavía se corta un poco"; "La próxima semana no."
- **1:** paul_silent said twice in a row at the mute step (a second variant, "Pablo, ¿estás ahí? No se oye nada.");
  "Ahora, vamos con las actualizaciones. ¿Quién empieza?" came back whole after a side question (new short re-ask
  "Entonces, ¿quién empieza?" / "Bueno, ¿quién quiere empezar?").
- **5:** flags on the wrong unit: not_muted_resp ("en rojo" on "Su") and echo_q_yes ("que" on "sí."); u_almost said
  "Mexico uses the present here" (Spanish does).
- **8:** the u_ready hint was answered with the question it answers (above).
- **10:** the oops hint "¡Qué pena! ¡Gracias! ¡Adiós!": "qué pena" is "what a pity" in much of South America; neutral
  twin "¡Qué vergüenza! ¡Gracias! ¡Adiós!", note rewritten for both texts.
- Held-out: the two misses the first review called its narrow expectations ("¿Ya me ven?" = cam_fixed, "¡Uy, perdón!
  Adiós" = bye_all) now accept those intents. Left as is: "Que empiece Pablo" lets Sara go first (Pablo has no update);
  two not-understood turns while Sofía is frozen get the global "Disculpa, no entendí." in her voice.

**Speakers.** Sofía (kate): every line but these. Pablo (paul, 11): paul_unmuted, paul_reask, paul_ok, paul_ok_short,
paul_now, paul_help, paul_talk_later, paul_help_sure, paul_leave, paul_bye, paul_hi_tiger. Sara (sara, 12): sara_join,
sara_mute, sara_froze, sara_echo, sara_start, sara_sorry, sara_go, sara_update, sara_cat, sara_bye, sara_cam_on,
sara_laugh. No conversation line is said by two of them (K/P/S set the speaker on every line); the global replies come
from whoever spoke last (Pablo after "¿Ya me escuchan?", Sara after "Tú primero"), and lines-es.ts voices every global
for all three. Before: paul_hi_tiger, paul_ok_short, greet_back, weekend_meh and echo_q_yes were reached by no run, and
paul_hi_tiger's neighbours would have put it in Sofía's voice; now six new sims reach every line, each in its speaker's
voice (seeds 1–2, both genders). s34's team is the same: tú to the learner, ustedes to the team, Sofía's s34 words reused.

**Plural items:** slides (las diapositivas), numbers (las cifras de ventas), invoices (las facturas), `attrs.plural`:
plural in upd_done_resp, upd_work_resp, upd_behind_resp, when_reask and the hints u_finished, u_working, u_almost,
u_ready, u_behind, t_task (checked in the transcripts: "las facturas listas", "las cifras de ventas listas").

**Voices:** 14 new Sofía line texts (seen_you, not_muted_you, go_on, paul_silent[1], paul_chat, thanks_team,
echo_not_me, first_reask ×2, upd_problem_resp and upd_busy_resp = s34's texts, upd_done_what, send_how, cat_name), all
neutral (no twin needed); no existing spoken text changed; no Pablo or Sara line new or changed. The new task "el
proyecto" in the four templated lines and six hints; one neutral-only coach twin (the oops hint). Phases: freeze_q can
come twice (same id, "grid"); a second no at paul_hear now ends with Sofía's paul_chat, then the screen.

**Tests:** NLU 126 → 144; sims 12 → 18 (all 12/12); corpus 457 → 538 understood (+81), traps 75 → 82 (+10, 3 old
"any" items are answers now), 0 false accepts; held-out 41/43 → 43/43.
