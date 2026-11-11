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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), against AUDIT-BRIEF.md's ten points and the lead's three extra checks
(the menu's options by digit and by word; account numbers, times and amounts in the voiced value lists, said as on a
Mexican phone; each line in the voice of whoever says it). Read: STYLE.md, AUTHORING-ES.md, the brief, the review above,
AUDIT/cross and AUDIT/neutral, the file, corpus and held-out set, the review transcripts (seeds 3 and 7); played ~120
whole calls with `tools/probe.ts` (every menu answer, side questions to the recording and to Karla, every question of
hers with yes, no, "No sé" and a question back); listed the voice lines of this conversation (who says each line in 800
random calls and the sims, and which values each line with a value list is voiced with).

**Before → after:** check-content 119/119 NLU, 10 sims → 132/132 NLU, 12 sims, all 12/12 seeds, fuzz 80, 0/0; corpus
224/224, 0/21 traps → 251/251 (100%), 0/25 traps; held-out 40/41, 0/3 → the same (the earlier review's "Hace dos
días" label). In 800 random calls the menu's voice said 39 of Karla's lines before (e.g. "¿Con quién tengo el gusto?"
142 times), none after.

### Found and fixed, by point (13 found, 13 fixed)

1. **Natural Spanish:** nothing. Every line read as a Mexican call-center agent and a Mexican IVR would say it (Le
   atiende, ¿Con quién tengo el gusto?, ¿Me proporciona…?, una disculpa, desconectar de la luz, agendar, hasta arriba).
2. **tú/usted:** nothing (usted both ways, hints in usted, tú accepted with the tip).
3. **Names:** nothing (Karla, NetWave; no clash, as AUDIT/cross says; NetWave is the same company in s81 and s82).
4. **Facts and the voiced values (1):** the technician's lines (`tech_offer`, `tech_offer_alt`, `tech_booked`) had an
   item ({D}, the day) and a value ({$win}) in one line, which the line list doesn't expand: only the day/window pairs
   random calls happened to reach were voiced ("La primera cita disponible es el viernes…", "¿Qué tal el viernes…?",
   "También tenemos el jueves, entre las nueve y las dos", "¡Listo! El técnico va el sábado…" were missing). The day is
   a value now (`{$weekday}`, `domains.weekday`), so every day × window is in the list; the text, glosses and flags are
   unchanged. $499 (a common plan price), the windows ("entre las nueve y las dos"), "media hora", the account number
   (said "siete cuatro dos, noventa y uno, treinta y tres") and the report number ("ene, doble u, cuatro, ocho, dos,
   uno, tres") are all in the lists and said as on a Mexican phone.
5. **Glosses and English (2):** `ask_since_again` "And since when has it been out?" → "And how long has it been out?";
   the W flag claimed "doble u" is Mexican only, while the neutral voice says it too: now "doble u in Mexico and much of
   Latin America; doble ve in some countries, uve doble in Spain".
6. **Spelling, ¿¡:** nothing.
7. **Questions and replies (6):**
   - The recorded menu spoke Karla's lines: an account number said to it got "Perfecto, ya me aparece su cuenta" (then
     "Lo siento, no le entendí"), "Ya reinicié el módem" got "Gracias por intentarlo", "¿Me escucha?" got "Sí, lo
     escucho bien", "No le escucho bien" got "¡Ay, perdón! ¿Así está mejor?", "¿Me da un número de reporte?" the
     number, "¿Cuánto cuesta la visita?" the visit's price; and "Llevo veinte minutos esperando" or "¿Cuándo me
     regresan mi dinero?" brought Karla on before the call was routed, after which the menu's voice said all of
     Karla's lines. Now the menu only routes (`atMenu`): anything else said to it gets "Lo siento, no le entendí" and
     the options again; a problem or the light routes to support (Karla opens with "Veo que tiene problemas con su
     internet"), a charge or money back to payments; Karla comes on only once the call is routed.
   - Karla answered what was said to the recording in the turn that routed it ("Soporte técnico. La luz parpadea en
     rojo." → "Okey, eso normalmente quiere decir que no hay señal" before she asked the name): that turn now counts as
     said to the recording too (she asks about the light herself).
   - The menu answered like a person: "Gracias" → "¡A la orden!" and "Lo siento, no le entendí"; "No sé" → "Sin prisa";
     "Un momento" → "Tómese su tiempo"; "Más despacio" → "Por supuesto. Lo digo despacio."; "¿Cómo está?" → "Muy bien,
     gracias. ¿Y usted?". Now "Gracias" / "Perdón" (`menu_social_ctx`) and the rest get the options again; repeat,
     slower, "No entiendo" and "¿Qué significa…?" replay them without a person's lead-in; "Adiós" hangs up. (g_thanks
     and g_sorry are not overridden: a handler would stop "Sí. Muchas gracias." counting as a yes.)
   - "No sé" looped "Tómese su tiempo" / "Sin prisa" at "¿De qué color está la luz…?" and at "¿Ya reinició el módem?":
     now "No se preocupe." and the next question, and the unplug request.
   - The visit's questions had no answer: "¿A qué hora llega el técnico?" / "¿Me avisan antes?" (`tech_when_q` → "Le
     van a llamar media hora antes de llegar"), "¿Tengo que estar en casa?" (`home_q` → new line `home_needed`: "Sí,
     usted o alguien mayor de edad."; while "¿Puede haber alguien más…?" is open, that question answers it), "¿No
     puede venir hoy?" (→ "Lo siento, ese día ya no tenemos lugar" and another day), "¿Cuánto cuesta?" after booking.
   - The visit's cost and length were answered before any visit was mentioned ("No tiene ningún costo, porque la
     falla es de nuestro lado" at "¿En qué le puedo ayudar?"): now only once a visit is on the table.
8. **Hints and help text:** nothing (the hints are right, usted, and accepted).
9. **Accepted answers (4):** "Por soporte técnico" (the answer to the menu's own "¿Llama por pagos o por soporte
   técnico?"), "Para soporte técnico", "Es por mi internet", "Por el internet" (and "Para ventas" with them); "Es este
   mismo número" / "Es el mismo de donde le estoy llamando" to "¿Me da el teléfono registrado en la cuenta?"
   (`same_number_ctx`; never a bare "Este", the Mexican filler); "Está parpadeando"; "Como desde las ocho de la noche"
   / "Desde las ocho". Every menu option works by its digit and its word (1/uno/pagos, 2/dos/soporte, 3/tres/ventas,
   0/cero → an agent). At Karla's "¿En qué le puedo ayudar?", "Es por mi internet" gets her question again (an
   internet_down pattern for it made "El internet sí funciona" a false accept: "es" and "por" may be left out).
10. **The neutral text:** nothing. The six twins say the same thing (recarga → recargar saldo, módem → router,
    ahorita → ahora mismo, prende → enciende); no Mexican-only word without a twin.

Tests: 13 NLU tests, 2 sims (the menu only routes, an agent, "Es este mismo número", "No sé" at the light and the
restart, the visit's questions, Saturday booked; sales by the menu's words, "¿Dónde lo encuentro?", the charge first, a
time for "since"), 31 corpus items (4 traps: two negated menu answers, "No es este número", "Mi esposa no puede venir el
jueves"; and `not` lists on "No está parpadeando", "No voy a estar en casa ese día", "¿Tengo que estar en casa?" and
the rest).

### For the lead

- Who says it: none of this conversation's own lines can now be said by both speakers (the `bot_*` lines only by the
  menu, the rest only by Karla), and the menu says no global line: its global lines can be left out of the list.
- The windowed lines are value lines now (weekday × window): a reach-es.ts rule keeping the four real pairs (jueves
  9–2 and 2–6, viernes 9–2, sábado 9–1) would cut the five never-said pairs per variant (~50 clips).
- Lines with an item and a value elsewhere, voiced only as heard: p26 `brenda_delivery_day`; s32 `got_kilos`,
  `got_kilos_half`, `got_bunches`, `got_money`, `price_kg_pl`, `price_piece`, `price_piece_m`; s66 `fare_is`; s71a
  `rate_size`, `extra_quote`, `ret_confirm_long`, `ret_answer_long`, `ret_long`, `ret_more_q`; s83 `summary`,
  `summary_notime`.
- Plural items: none here.

## Spain twins (11 Nov 2026)

8 twins. Karla keeps usted (call-center usted is common in Spain too; no register change). Spain: "número de incidencia"
for "número de reporte" (line and hint; the pattern takes "incidencia"), "Claro, le ayudo" for "Con gusto le ayudo", "no le he oído
bien", "fuera de su casa", "por la tarde" (hints). The NetWave menu needs no twin. Spain corpus: 15 items (a mano, cada dos por
tres, lo he reiniciado, incidencia).
