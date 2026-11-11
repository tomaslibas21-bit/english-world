# Review: s90-running-late ("Voy tarde", Ingeniero Montes on the phone), writer's commit 901f06f1

## Gate and blind set
| | Before (901f06f1) | After |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content | 89/89 NLU, 13 sims 12/12, fuzz 80, 0/0 | 107/107 NLU, 17 sims 12/12, fuzz 80, 0/0 |
| corpus | 237/237, 0/21 false accepts | 247/247, 0/21 (10 review items added, 1 moved to its real context) |
| blind set (42 items, 9 with traps, written before reading) | 36/42 = 85.7%, 0 traps accepted (1 misread: "Tarde" taken as a name) | 42/42 = 100%, 0 traps (not blind any more) |

The writer's claims all held. 37 of the 1,354 lines changed, 159 added (about 60 tests and sims).

## Fixes
**meaning-safety (must-fix, ~25 lines)**
- `identify_ctx` took any bare word at the greeting as the caller's name: "Ingeniero" became name "Ingeniero", "…llegar unos minutos tarde" became name "Tarde", "¿Y si nadie viene?" at "¿Necesita ayuda?" became a name. Now it takes only "Es Ryan". A bare name is read only after "¿Quién habla?" (a new optional `who_q`, so the re-asked greeting can't loop). Titles alone ("Ingeniero", "Oiga, ingeniero") are a greeting.
- "Espere, ¿en qué sala?" at "¿Empezamos sin usted?" recorded `planned: wait`. A bare "Espere(n)" is now `wait_ctx`, only at that question, and it waits only when it is the whole answer.
- "No, no voy a llegar tarde" after "¿Todo bien?" recorded `late`. With two noes it is now on time.
- "¿Entonces hoy no viene?" "No." was read as "just late", but to a Spanish speaker it means "not coming". The question is now "¿Entonces hoy va a faltar?", with no negation, so Sí = absent and No / "Hoy no" = just late. "Sí, no voy a poder", "Voy a faltar" and "No, no voy a faltar" are now understood.
- "No, mejor empiecen" recorded `wait` (`sin mí` had become optional in a wait pattern). "No pueden empezar sin mí" (its comma lost) gets "¿empezamos, o lo esperamos?". "No, no hace falta" also gets that question, instead of recording `wait`.
- "Como usted quiera" and "Adelante" were `start_without` everywhere. They now count only at the plan question (`start_ctx`).
- "Sí, gracias" to "¿Necesita ayuda?" sent no help (a bare "Gracias" got "¡De nada!"). Now "Sí, gracias" sends help, and "(No,) gracias" gets "Bueno, cualquier cosa me avisa."

**understanding (~45 pattern lines):** "No puedo / No voy a poder llegar a tiempo", "unos minutos tarde", "No llego tarde, voy a tiempo", "Estoy en el tráfico", "Llovió mucho / Está lloviendo", "Se descompuso mi carro", "Se le ponchó una llanta al coche", "Tuve un accidente", "Tengo gripa / Me enfermé / Mi hija se enfermó", "El camión", "Es personal". A correction ("No es por el tráfico, se me fue el camión") and "Nada, se me hizo tarde" are understood now; the second skips the reason. Also "tal vez una hora", "dos horas" (it was read as 2 minutes), "hora y media", "tres cuartos de hora", a bare "Ahorita", "¿Y si me esperan cinco minutos?", "No empiecen todavía", "Les aviso…", "¿La de siempre?", "¿En qué edificio?", "Gracias por esperarme", "Ya viene mi esposo", "Ya llamé a la grúa".

**spanish / rule 11 (~10 lines):** "¿Hay algún problema?" got "Sí, no se preocupe". It now gets "No, no hay problema". `ok_fine` no longer starts with "Sí". "Me voy en camión" and "Sí voy" at the greeting got "Buena idea." and "So you're just running late". They now count as on the way / late. "Ya viene mi esposo" gets "Ah, qué bueno" instead of "Buena idea". A "No" at the reason question gets "¿Pero qué pasó?". The same "Perdón, ¿quién habla?" came twice in a row on seed 5; the re-asked greeting now says "Hola, ¿quién habla?". Polish: "Y le guardo un lugar" after "Claro, empezamos…", and "¡Y maneje con cuidado!" (no more "Bueno. … Bueno.").

**gloss-english, numbers, twins, facts, structure:** I spot-checked about a third of the glosses and all the flag indexes; they were fine. Room 302/204 is read whole, as "tres cero dos" and as "doscientos tres" (the wrong room gets corrected). The twins are fine (¿Bueno?, camión, ahorita, liga, ándele). No other conversation sets facts about Línea Clara. The steps, intents and twist match the English original.

**tests:** 18 NLU tests (8 traps), 4 sims (faltar/"Hoy no" + dos horas; "Espere" + "Como usted quiera"; help "Sí, gracias" + the plan question asked again; a bare name after "¿Quién habla?"), and 10 corpus items. 74 probe scenarios: plan_q, need_help, cant_q, the greeting and the room.

## For the lead / owner
- "faltar" (to miss work) is new in Montes's question. It is pan-Hispanic, so it has no twin.
- After "¿Todo bien?", "No voy a llegar tarde" and "No, llego a tiempo" are still read as late (the likelier reading, rule 10). After "Dígame", Montes asks.
- The writer's open questions (Uber, atorado/atrapado, "Sí, él habla", the made-up rooms) look fine to me. Nothing is unresolved.

## Audit (5 Nov 2026)

A fresh read of both texts (Mexican and neutral) against docs/es/STYLE.md, AUTHORING-ES.md, the s90 brief, TOWN.md
"Getting around (from the 3D town)" and the cross/neutral leads; seeds 3 and 7 read in full; about 80 probe turns
(tools/probe.ts) on the opening, the reason and time questions, the help offer, the plan question, the room twist
and side questions; the English original on main probed with the same turns.

**The lead's decision (the other building).** Across avenida Juárez from Línea Clara are the Policía Municipal and the
church, and no real building fits a team meeting (Correos, the car rental, the hotel's rooms). So no building is named:
today the meeting isn't in the usual room 204 but in **room 302, on the third floor of Línea Clara's own tower** (22 m
in layout.ts). room_twist "Ah, y por cierto, hoy la reunión no es en la sala de siempre.", room_num "Es en la sala
302."; "¿Dónde queda?/¿En qué piso?/¿Cómo llego?" get building "Aquí en nuestro edificio, en el tercer piso." (or "En
el tercer piso de este edificio."); a learner who still says "el otro edificio" / "el de enfrente" gets building_no
"No, es aquí, en nuestro edificio, en el tercer piso." and never "Así es". The hint q_building is now "¿Dónde queda la
sala 302?"; the written note "Sala 302 · tercer piso". "Aquí lo esperamos" before the news no longer contradicts it.

Found 24, fixed 24, by point:

1. **Natural Spanish (3).** "¡Y maneje con cuidado!" closed the call when the car had broken down (a taxi or a
   colleague coming), on the bus or on foot: now only for traffic or rain when nothing says the learner isn't driving
   (noCar), or when the learner says "voy manejando". "Claro, lo esperamos unos minutos" answered a 40-minute delay: over
   20 minutes "¿Me pueden esperar?" gets plan_wait ("No se preocupe, lo esperamos."). "Estoy en el camión y hay mucho
   tráfico" got "Bueno. ¿Como en cuánto tiempo?" before "Sí, hoy hay mucho tráfico": the time question now comes last.
2. tú/usted: none (Montes is usted throughout; tú to him is accepted with the tip).
3. Names: none (Ingeniero Montes is the boss in s87 too).
4. **Facts (1):** the other building across the street (above).
5. **English (1):** "Shall we start" in the glosses of plan_ask[0] and amb_plan[0] → "Should we start".
6. Spelling: none.
7. **Questions and answers (18).** With caller ID, "¿Todo bien?" answered "Sí, todo bien, gracias", "Bien, ¿y usted?"
   or "Más o menos" got "¿Bueno? ¿Quién habla?" again: they now open the call ("Dígame" / "¡Uy! ¿Qué pasó?"). The
   reason question came back after the learner gave the time, three times in a row and the call never completed: a
   time at the reason question now skips it, and "Sí, todo bien" at "¿Todo bien?" too. "¿Ya llegaron todos?" was read as
   "ya llego" ("Ah, perfecto"): now "Ya casi todos." "No llego en veinte minutos" was taken as twenty minutes: Montes asks
   again ("…, más bien en media hora" is taken). "¿En qué piso?" got the room number; "¿Dónde queda?" wasn't understood.
   A time said with "Ya voy caminando" in one breath still got "¿Como en cuánto tiempo?". A long time while
   "¿Empezamos sin usted?" was open got "Entonces empezamos sin usted" and the same question again, and after
   "Espérenme" the line said start while the state said wait: eta_long now decides it and closes the question.
   "Ok, en el otro edificio, sala 302" got "Así es". "¿Me lo escribe?" after "Así es" had nothing to write. "No sé"
   held the call at the time question ("Bueno, no se preocupe" and silence), and got "Claro, tómese su tiempo" at
   "¿Empezamos sin usted?" and "¿Necesita ayuda?": now "Bueno, me avisa cuando sepa." and on, Montes decides to start,
   "Bueno, cualquier cosa me avisa". Not understood before, answered now: "¿Está el ingeniero Montes?", "¿Con el
   ingeniero Montes, por favor?" ("Sí, él habla."), "Con Ryan." (to "¿Con quién hablo?"), "Habla Ryan, de Línea Clara",
   "¿A qué hora es la junta?" / "¿La junta es a las nueve?" ("A las nueve." / "Sí, a las nueve."), "¿Ya empezó la junta?"
   ("Todavía no. Empieza a las nueve."), "¿Está enojado?" / "¿Se enojó?" ("No, para nada."), "No sé, depende del
   tráfico", "Menos de media hora", "Más de una hora", "Llego en la tarde", "Llego hasta las diez", "No creo que llegue
   antes de las diez", "¿Me puede mandar un taxi?", "Ahorita se la mando" (the location, not an "ahorita" time),
   "Gracias, no se preocupe" at the help offer, "No sé, tal vez más tarde" at "¿Entonces hoy va a faltar?".
8. **Hints (1):** q_building asked for a building that isn't there (now "¿Dónde queda la sala 302?").
9. Accepted answers: no false accept found; corpus +46 understood (247 → 293, 100%), traps 0/21 → 0/23 plus 18 new
   not-checks; held-out 42/42 unchanged. NLU tests 107 → 135, sims 17 → 25 (each 12/12).
10. Neutral text: none. The new lines have no Mexican-only word (no "elevador"); the nine twins are right.

**For the voice list (one speaker, Montes; no values, no plural items).** Changed spoken text: room_twist, room_num,
building (both variants new); new: building_no, not_angry, mtg_time, mtg_time_yes, not_started, team_almost,
eta_unknown; hint changed: room.q_building (coach voice, "¿Dónde queda la sala trescientos dos?"). Glosses only:
plan_ask[0], amb_plan[0]; write fields only: room_right, room_wrong.

**For the lead.** The room picture (public/scenes-es/s90-running-late/room.webp; manifest prompt "points … out of the
big window, where a two-story ochre building … across the street") should now show Montes pointing up, toward the
third floor (or remap "room" to the plan picture). TOWN.md "Named in the conversations, not built": s90's other office
building is gone (room 302 is on Línea Clara's third floor). Global g_dontknow holds a step that has `help`, so the
call stops after "Bueno, no se preocupe" (handled here). The English original shares the drive-safe, reason-loop,
time-question order, "wait a few minutes" and plan-question bugs (EN-FIXES-LEADS.md).

## Spain twins (11 Nov 2026)

- 41 Spain twins (lines and hints), 20 items in tests/es/spain/s90-running-late.json (19 understood, 0 false accepts).
- Register: no change. Ingeniero Montes (the boss) and the learner keep usted; "Empiecen sin mí" / "No me esperen"
  stay ustedes forms (said to the boss for the team).
- Phone: ¿Sí? Buenos días; ¿Diga? ¿Quién es?; Buenos días, soy Montes; the learner's "Buenos días, ingeniero, soy …".
- Spain's present perfect: ¿Qué ha pasado?, me han dicho, se le ha hecho tarde; the learner's Se me ha hecho tarde,
  He perdido el autobús, No me ha sonado el despertador, Me he quedado dormido, Se me ha averiado el coche, He tenido
  que llevar a mi hijo al médico.
- Words: Estoy en un atasco, conduzca con cuidado, la tercera planta, un sitio (seat), Más o menos a qué hora / sobre
  las 9:30, unos 20 minutos, menos mal, ¿En qué le puedo ayudar? (¿Qué se le ofrece?), Perdone por el retraso, vale.
- Grammar: late takes se me ha hecho tarde; why takes he perdido, (no) me ha sonado, se me ha averiado/estropeado;
  eta takes sobre / a eso de / hacia + time; ask_started ha empezado; ask_team han llegado; save_seat sitio.
- Left for the lead: "Perdón, me tengo que ir, voy conduciendo" isn't read as a goodbye: global.ts leaving_why has
  "voy manejando" only (proposal: add "(estoy | voy) conduciendo"). The room note picture still says "tercer piso".
