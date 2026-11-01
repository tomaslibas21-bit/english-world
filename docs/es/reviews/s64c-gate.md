# Review: s64c-gate ("¿Es esta la sala?", Daniela, usted), writer's commit 32b76794

| Check | Writer | After review |
|---|---|---|
| tsc / vitest | clean / 257 | clean / 257 |
| check-content | 66/66 NLU, 8 sims 12/12, fuzz 80, 0/0 | 81/81 NLU, 10 sims 12/12, fuzz 80, 0/0 |
| corpus (tests/es/corpus) | 229/229, 0/36 false accepts | 240/240, 0/38 (2 items corrected, 11 added) |
| blind set (tests/es/heldout, 42 items, 8 traps) | 34/38 = 89.5%, 0/4 false accepts | 37/38 = 97.4%, 0/4 |

The one blind miss left, "Sí, por favor, me encantaría" at the seat offer, parses as `affirm`, which `ask()` turns into a yes. It works in play. I didn't edit the blind set to score it. I wrote the set before I read the file, but the after-score isn't blind for me.

The file grew from 1246 to about 1380 lines: 33 lines changed, about 167 added. That is roughly 70 lines of must-fix, 25 of polish and 70 of tests and sims.

## Meaning safety (must-fix, ~20 lines)
- **Comma flip at the gate-check offer (rule 10).** `offer_yes` held "no (la|lo) necesito (en el avión | conmigo…)". So "No, la necesito conmigo" ("No, I need it with me") checked the bag. Outside the offer, "No la necesito en el avión" was read as `keep_bag`, and that undid a bag already checked. Now `bag_amb_ctx #amb` (offer only) asks "Perdón, ¿se la documento o la lleva con usted?". "La necesito…" moved to `keep_bag_ctx`. The writer's NLU test and corpus item that locked in the flip are corrected, and a new sim covers the ambiguity.
- **Bare "la {number}" in plain `can_board` (rule 4).** "¿La tres?" at "¿Algo más?" ended the questions ("Todavía no. Tome asiento"). "¿La cuatro?" at the greeting gave the boarding time. It now sits in `zone_ctx`, expected only at the boarding call and the early zone.
- **"¿Tengo que pagar algo?" → "Sí, es sin costo."** The answer said yes to "do I pay?" (rule 11). `freeAnswer` now picks "Sí, es sin costo" for "¿es gratis?", "No, no tiene costo" for pay/charge questions and "No cuesta nada" for "¿cuánto?".
- **Gate change: "¿Es la sala 7?" was read as flight 7.** Daniela answered "Mmm, de esta sala sale el vuelo 223" and asked for the pass. Gate numbers are now told apart from flight numbers: "Sí, ahora es la sala 7", "No, ahora estamos en la sala 7", "Esta es la sala 4". Before the change is announced, "¿Es la sala 7?" announces it.
- **"¿Hay asientos libres?" on the full flight → "Sí, hoy va lleno."** Now "No, hoy va lleno."

## Replies against their questions (rule 11, must-fix/polish, ~25 lines, 12 new line variants)
- An aisle request got the window seat 16A. Now it gets 14C on the aisle, and `seat_now` remembers which seat. "¿Tiene costo?" at the seat offer got "¿a qué se refiere?"; it now gets "No, no tiene costo" (topic `seat`).
- "¿Cuántas maletas puedo llevar?" got "Sí, puede llevar…"; now `carryon_how`. "¿Cuánto es el retraso?" got "No, hoy vamos a tiempo" or "Sí, lamentablemente"; now `delay_none`, or the delay with no "Sí". The question is kept (`qHeard`) when the flight is asked back first.
- "¿El wifi es gratis?" / "¿Cuánto cuesta el wifi?" got the plane line; now "El de la sala es gratis. En el avión no hay." "¿Hay wifi aquí?" now gets `wifi_here`. "¿A qué hora llegamos?" now gets `arrival` ("Llegamos en unas dos horas y cuarto"; no clock time, so no time zone). "¿Qué zona está pasando?" now gets `zone_now` or "El abordaje todavía no empieza".

## Understanding (~20 pattern lines)
Seat refusals ("No, no me lo cambie", "Me quedo en el pasillo", "Así está bien"); "No, gracias, me la llevo"; the correction "No es el 225, es el 223" (`{neg:number}`); "No sé el número del vuelo"; "lugar para cargar el móvil"; "¿Puedes cambiarme a…?" ((cambiar | cambiarme)); "junto a mi esposa"; "¿Dónde hay un baño?"; "¿Cuál es la hora de abordaje?"; "¿Cuánto falta?"; "No, todo bien".

## Spanish, glosses, flags (polish, ~6 lines)
- "lo puede subir" for mi agua / mi comida: `food_bring_f` with "la" (rule 9).
- The `wifi` flag pointed at "hay" (11); it now points at "sí" (10, rule 15). New lines are glossed and flagged, with no new merges.
- I read every line and about half the glosses. Usted is consistent, the Mexican words have their twins, and the rest is natural; nothing else needed changing.

## Facts, structure, tests
- Structure matches the English: the 5 steps, all its intents and both twists. New intents: `zone_ctx`, `bag_amb_ctx`. Prices: none. The seat change at the gate and the gate check are free.
- Tests: 15 NLU tests (7 traps); 2 new sims (the ambiguous offer; correction + aisle + zone 2 first); 2 sims extended ("¿Es la sala 7?", "¿Tengo que pagar algo?", "¿Hay asientos libres?").

## For the lead / owner
- **Kept the likelier reading:** "No es todo" ends the questions like "No, es todo". The learner can still ask questions while waiting, so the cost is low.
- **The writer's open points still stand:** flight 223 to CDMX, sala 4, zona 3, 7:30/8:10 must match s64a-checkin and s64b-security. The Wi-Fi line now says the gate Wi-Fi is free (common at Mexican airports). A lost boarding pass isn't handled. "No encuentro mi pase" is not understood, which is safe.
