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
