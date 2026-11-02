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
