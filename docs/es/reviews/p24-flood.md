# Review: p24-flood (writer's commit b68ef195)
## Gate and blind set
| | Writer | After review |
|---|---|---|
| tsc / check-content | clean; 114/114 NLU, 16 sims 12/12, fuzz 80, 0/0 | clean; 129/129 NLU, 17 sims 12/12, fuzz 80, 0/0 |
| Corpus (coverage) | 304/304, 0/81 traps | 314/314, 0/81 traps (10 review items added: 6 traps with `not`) |
| Blind set (37 items, 8 traps, written first) | **25/37 = 67.6%**, 0 traps accepted | **35/37 = 94.6%**, 0 traps accepted |
Blind misses left: "La verdad no, estoy asustado" (lost comma: also "honestly I'm not scared"; left unread) and "Toallas no,
solo café" (read right, drop towels + coffee, but as `ask_help`, not my label).
## Fixes (conversation: 29 lines changed, 62 added; about 40 must-fix, 10 polish, 40 tests)
**meaning-safety, must-fix (~14 lines)**
- "No tiene que ser hoy" / "No necesita ser hoy" / "No debe ser hoy" sent the plumber today (`insist_today` had `[no] tiene
  que ser hoy`); "No puede ser hoy" and "¿No podría ser hoy?" did the same. Now `no_rush_ctx #amb`: "¿entonces hoy o mañana?"
  (rule 10). "Mañana no, tiene que ser hoy" got a whole pattern so it isn't split into "Mañana" + the ambiguous half.
- "Las dos." at "¿A las once o a la una?" booked eleven (`time_ctx #any` had a bare "las dos" = both). It is now 2:00, so he says
  "solo puede a las once o a la una" (rule 4); "cualquiera (de las dos)", "ambas" stay "either".
- "¡Bye!" at "¿Quién habla?" was read as the name "Bye" and marked the caller identified (3B). Greetings, bye, ok, gracias are
  no longer names; a bye there is a goodbye.
- "No estoy bien" at "¿Alguien se lastimó?" got "Gracias a Dios"; he now asks "¿Cómo? ¿Usted está bien?". The second hurt
  question was two questions in one ("¿Usted está bien? ¿Nadie se lastimó?"), so a "Sí"/"No" answered either: now
  "¿Alguien salió lastimado?". New `hurt_ctx` ("Me corté el pie", "Me resbalé") gets the same check, never "Qué bueno".
- "Así está bien" at "¿Podría esperar a mañana?" was a no (= today); he now asks which day (rule 17).
**understanding (~25 pattern lines)**: "Ya." / "Listo." at the power question; "la vecina ya se quejó" without "de abajo";
"está goteando en el depa de abajo"; "Mejor mañana", "Prefiero mañana", "Mañana sí, hoy no" (each still meets "¿Está
seguro?"); "Bueno." to the tomorrow offer (it repeated the same line, then gave up); "Quiero café" (was read as "te quiero");
"No me traigas nada"; "nomás mojada"; "no sé qué hacer"; "le habla su inquilina del 3B"; "soy yo, la del departamento 3B";
"hace un par de horas"; "No sé, me desperté y…"; "hora segura o más o menos"; "su pronta ayuda"; "Ya le dije que es urgente".
**spanish (polish, ~6 lines)**: no "¿Podría esperar a mañana…?" twice in a row (now "Entonces, ¿le parece bien mañana en la
mañana?"); "¿«Pronta atención»?" was quoted back to "pronta ayuda". **gloss-english, numbers, twins, facts, structure**: no
fixes; every line, gloss and flag index read; twins on all Mexican-only words (~7 of 90 variants); steps/intents/twists as English.
**tests (~40 lines)**: 15 NLU tests (8 traps), one sim (cut foot, "No tiene que ser hoy", "Las dos"), the lost-comma sim now
answers his "¿Usted está bien?".
**Played (rule 22):** ~70 probe turns on the binding choices (today/tomorrow, 11/1, Andrea's items): no, corrections, lost commas, a what-if ("¿Y si
llueve otra vez?" = a worry, today), a price question (the damage answer, nothing booked), closings, a past. Tomorrow is
recorded only after his "¿Está seguro?".
## For the lead
- TOWN conflict, as the writer flagged: s81/s82 make Don Ernesto the landlord at Departamentos Las Palmas; here Don Gilberto
  (npcs.ts, the brief) owns an unnamed building with "doce inquilinos". Someone should pick one.
- Tools: a bare "Bueno." can't be scripted in a sim (sim-play swaps in the auto answer); it was checked with probe.ts.

## Audit (5 Nov 2026)

Fresh reviewer (AUDIT-BRIEF.md). Read: the situation file, both transcripts (seeds 3 and 7) before and after, the
corpus and the held-out set, STYLE.md, AUTHORING-ES.md's rules, the brief, the cross and neutral files, and the
building as s81, s82 and p29 have it. Played ~60 probe turns (tools/probe.ts) on the power question, Andrea's offer,
the side questions, the voicemail and gr_which ("No a las once" → "La de la una." / "Once." / "A la una, por favor.").
The offer probe: 0 flags in both texts.

**The lead's decision applied (Don Gilberto is the building's administrador; Don Ernesto owns Las Palmas; 1B).**
"casero"/landlord is gone from the lines, hints, tips, mission, goal, intro and topic ("Dos llamadas: a una amiga y al
administrador"); Andrea says "llámale al administrador" (3 lines); "Tengo doce inquilinos" → "Administro doce
departamentos" (+ twin); "Es mi edificio" → "Es mi trabajo"; the hint "Soy su inquilino del 3B" → "Soy el/la
inquilino/a del 1B" ("su inquilino" is still understood). 3B → 1B everywhere (2 lines with `say` "uno be", 4 hints,
AUTO, tests, sims); **"Habla Ryan, del 1B" and "Soy la inquilina del 1B" were not understood at all** (only 3B was in
`aptno`): fixed, 3B still taken. The intro now names Departamentos Las Palmas and says the roof is his job; s82's rule
(the apartment → Don Ernesto, the building → Don Gilberto) fits the clogged roof drain. New: "¿Le aviso a Don
Ernesto?" (ask_owner) → "Yo le aviso a Don Ernesto. Usted no se preocupe."

**Found by point** (30 found, 30 fixed):
1. Spanish/coherence (6): Andrea's "¿Qué tan grave está?" was left unanswered by her own next lines ("No pasa nada…"
   read as its answer) → "¡Ay, no! ¡Qué horror!"; "¡Nos vemos en diez minutos!" twice in a row (gr_see_you, then
   gr_bye) → gr_see_you "¡Bueno! Voy para allá."; "¡Ay, no, tiene razón! ¡Qué pena con usted!" when he had offered
   nothing (the learner insisted first) → only after his "¿Podría esperar a mañana?" / "¿Está seguro?"; "No sé" at
   "¿Está seguro?" decided today and then he asked "¿Está seguro?" again → g_dontknow in that question;
   "¿Quiere que le mande a mi plomero?" twice in a row after "No, gracias" → "Entonces, ¿cómo le ayudo?" in between;
   "Listo, ya los bajé" got "Perfecto. Perfecto." → once.
2. tú/usted: nothing found.
3. Names/roles (5): the administrador decision (lines, English labels and tips, gr_its_me, gr_inconvenience, tenant_in).
4. Facts (2): 3B → 1B; 1B not understood.
5. Glosses/English (2): l_coming_yes "Yay!" for "¡Claro!" → "Sure!"; gr_bye's neutral twin "¡Ahora nos vemos!" glossed
   Ahora as "Soon" → "¡Nos vemos en un rato!" (accurate gloss, LatAm-neutral).
6. Spelling: nothing found.
7. Questions, offers, meaning safety (10):
   - **Towels or bailing answered the power question**: "Ya puse toallas en el piso." / "Ya saqué el agua con una
     cubeta." were water_off, so he said "Muy bien. Con agua en el piso, es lo primero." and never checked the power
     (also when said in the report). Now towels_done: at his question "Bien. Pero primero, la luz." + where the
     breakers are; in a report "Ajá, ajá." and the question still comes.
   - **The power question was "done" once asked**: any other answer (a request, a late answer) moved on with the power
     unknown. Now only an answer closes it; on his second turn he says "Bien. Pero primero, la luz." + the breakers.
   - "No hay luz." / "Se fue la luz con la tormenta." not understood → no_power: "Igual, por si regresa la luz." + the
     breakers (switch off even in an outage, in case it comes back).
   - "¿Cuál switch?" / "¿Qué es el switch?" / "¿Dónde está?" at his question not understood → his instructions.
   - "¿Qué hago (mientras tanto)?" not understood → the breakers if the power isn't known to be off, else
     "Mientras tanto, saque el agua que pueda y levante sus cosas del piso." (Andrea: "Respira. Es solo agua.")
   - "¿Le aviso a Don Ernesto?" / "¿Don Ernesto ya sabe?" not understood → gr_owner.
   - **"Sí, por favor." / "Sí, porfa." / "Bueno, sí." to "¿Segura? Puedo pasar después de desayunar." kept Andrea at
     breakfast** (read as "yes, I'm sure"); now they take up her offer; a bare "Sí" / "Sí, gracias" / "Sí, estoy
     segura" still mean she stays. "Sí, pásate después" was not understood (now she comes).
   - "¿A qué hora llegas?" to Andrea got "¡Ay, no!" → "Llego en veinte minutos." (and it takes up her offer).
   - "¡Te debo una!" / "¡Eres la mejor!" got "¡Yo también te quiero!" → "¡Para eso estamos!" + a bye (only "te
     quiero / te amo" gets "¡Yo también te quiero!").
8. Hints (1): the new neutral hints "…se inundó el apartamento" / "…al apartamento de abajo" were not accepted:
   `apartamento` added wherever the grammar had departamento (what_formal, down, downy, downstairs_no, unsure_ctx, fl).
9. Accepted answers (1): the corpus had "Ya puse toallas en el piso" as water_off (the bug) → towels_done, not
   water_off. Corpus 314 → 356 understood (+42), traps 81 → 86 (+5), 0 false accepts; held-out 35/37 unchanged
   (the two blind misses the first review left), 0/2. NLU tests 129 → 146; sims 17 → 19 (both 12/12): one plays the
   offer, towels, "No hay luz", "¿Qué hago mientras tanto?" and Don Ernesto; one leaves the power question unanswered.
10. Neutral (3): "departamento" twins added to gr_down_q[0..1] and 7 hints (with F_DEPA flags, as s81/s82); "Le hablo"
   (hablar = to phone, Mexico) twinned "Lo llamo…" in who.calling_from and report.report_leak (as s34); the tips'
   examples have no twin mechanism, so they now say "la cocina" (not "el depa" / "el departamento").

**Voices.** New spoken lines (all Don Gilberto): gr_power_first, gr_no_power, gr_meanwhile, gr_owner. Changed: Andrea's
l_react_water[1], l_bye_q[0], l_door_go, l_door_friends; Don Gilberto's gr_its_me (+ new twin), gr_guess_who,
gr_hi_tenant[1] (say "uno be"), gr_down_q[0..1] (new twins), gr_inconvenience, gr_see_you, gr_bye[1]'s neutral twin.
Hints changed: who.this_is_apt, who.tenant_in, who.calling_from, report.regret, report.report_leak, details.downstairs,
insist.downstairs, voicemail.this_is_apt, voicemail.regret (all but tenant_in with new neutral twins). No line of this
file is said by both speakers (L = Andrea, G = Don Gilberto); the global replies (not understood, ack, hello, thanks,
repeat, slower, wait, "no sé") can come from either, in their own register. No `attrs.plural` items ("toallas" is a
bare plural, art "", and reads right); no values.

**Left (for the lead):** npcs.ts mr_grant "Tu casero / Your landlord" → "Administrador del edificio / Building
manager" (FOLLOWUPS); BRIEFS.md p24 "(landlord, usted, formal)" → administrador; TOWN.md "The landlord…" (p24's Don
Gilberto "tu casero", 3B, an open question) → decided; scene-data/p24-flood.json "npc" says "your landlord".
Story details, unchanged: s82 has neighbors upstairs ("los de arriba"), so the roof drain's water reaches 1B's ceiling
through the floor above (plausible; no line names it); "la vecina de abajo" lives on the planta baja with Don Ernesto
and the tiendita (no clash, no name). Not twinned (not on STYLE's list): "trapeador", "cubeta" (neutral "balde" is
masculine, so an `attrs.neutral` would need the article too), "jalador", "llámale".

## Spain twins (11 Nov 2026)

72 Spain twins (lines and hints; the voicemail hints repeat the call's), no register change: Andrea and the learner
say tú, Don Gilberto and the learner usted, as in Mexico. The phone: "¿Dígame? Soy Gilberto. ¿Quién es?", "soy
Gilberto" on the voicemail and the callback, "¿quién es?" for "¿quién habla?"; the learner says "Le llamo" (Spain's
le for usted) for "Le hablo"/"Lo llamo". Spain's words: piso (departamento/depa), suelo (the floor), fontanero
(plomero), fregona and fregar (trapeador, trapear; also attrs.spain on the mop entity, cubo on the bucket), nevera,
desagüe atascado (coladera tapada), cuadro eléctrico, interruptor (switch), resbala, menos mal (qué bueno), vale,
chao (bye), aun así (igual), por la mañana, de camino, le viene mejor, lo siento muchísimo (qué pena con usted,
which in Spain means "what a shame"), ¡Eh, eh! (¡Epa!), «SOCORRO». Spain's present perfect for what has just
happened: ¿Qué ha pasado?, he visto, has mandado, te he traído, se me ha inundado, se ha atascado, ha bajado / he
bajado, he puesto, se ha hecho daño (lastimarse → hacerse daño), me has salvado, he escuchado su mensaje. The flat
is "el 1B" in Spain's twins ("del 1B"), not "el piso 1B". Left: jalador (the squeegee chip; no settled Spain word),
chilaquiles (Mexican food), the anoche lines in the preterite (Spain says them so too). Patterns take the Spain forms
(encima de la nevera, no hace falta, has salvado, hecho daño, lo he mirado, cuadro eléctrico / plomos, por la mañana,
me viene bien, de camino). Spain corpus: 25 items, 24/24, 0/1 false accepts. Gates: Mexican, neutral and Spain 0
errors, sims 12/12; corpus 356/356 0/86; held-out 35/37 0/2 (unchanged).
