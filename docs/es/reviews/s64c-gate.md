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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), on 842cebb4. Read: STYLE.md, AUTHORING-ES.md, the brief, the review
above, AUDIT/cross and AUDIT/neutral for s64c, s64a/s64b's gate facts, TOWN.md; the seed 3 and seed 7 transcripts in
full; about 150 extra learner sentences and 25 played conversations (`tools/probe.ts`) for the questions and offers.

| Check | Before | After |
|---|---|---|
| check-content | 81/81 NLU, 10 sims 12/12, fuzz 80, 0/0 | 96/96 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 240/240, 0/38 false accepts (278 items) | 285/285, 0/38 (323 items: +45, 24 of them with traps) |
| held-out (not edited) | 37/38, 0/4 | 37/38, 0/4 (the one miss is still "Sí, por favor, me encantaría" → `affirm`, a yes in play) |

The ten original sims read word for word as before in both seeds; the changes show only in new paths.

### Found, by point

1. Natural Spanish, 2. tú/usted, 3. names, 4. facts, 6. spelling: nothing wrong. Daniela's lines are natural Mexican
   airline Spanish ("Traemos un retraso de unos 20 minutos", "Fíjese que hubo un cambio de sala", "Ahorita los
   llamamos por zonas"), usted throughout, Daniela unique in the edition, sala 4 / flight 223 / zona 3 / 7:30 / 8:10
   as in s64a and TOWN.md. The value lists cover every value said: times 7:30, 7:50, 8:10, 8:30; zones 2 and 3.
5. Glosses and English (3): "a | item personal" (carryon_ok, carryon_how) → "one | carry-on … one | item"; zone_now
   glossed "the | zone" under a flag that says English has no article → "—"; arrival's English "We get in about two
   and a quarter hours from now" was false at the gate (the flight leaves later) → "It takes about two and a quarter
   hours to get there."
7. Questions and offers (8):
   - "Un momento", "Un segundo", "Una pregunta" at "¿En qué vuelo viaja?" were read as flight 1: "Mmm, de esta sala
     sale el vuelo 223…" and the pass asked for (rule 4). Now the wait gets "Sin prisa" and the question stays open.
   - "¿El vuelo 223 va a tiempo?", "Voy en el vuelo 223, ¿va a tiempo?", "¿Es la sala del vuelo 223? ¿Va a tiempo?":
     the engine won't start a piece with "va / sale / está", so "a tiempo" was dropped and the turn read as the gate
     question: "Sí, aquí sale el vuelo 223…", a "Sí" that sounds like "on time" on a delayed flight. Now one
     `ask_ontime` / `ask_delayed` with the flight in it (`@fl_given`), and the flight in a time question is taken
     without asking for it again ("¿A qué hora sale el vuelo 223?" had asked "¿En qué vuelo viaja?" and answered it
     in the same turn). The time questions are now expected at the gate step, where their hints are shown.
   - "¡Ya voy!" at the boarding call was the goodbye "ya me voy" (the tolerance drops "me"): the conversation ended
     without boarding. Now `coming_ctx` at the board step (the pass is asked for; at zone 2, "Todavía no…").
   - The gate-check offer had no answer for "No traigo maleta" / "Solo traigo una mochila" (the player carries a
     backpack), "¿Es obligatorio?" / "¿Tengo que documentarla?", "¿Puedo llevarla conmigo?". Now `no_bag_ctx`
     ("Ah, entonces no se preocupe."), `must_q_ctx` ("No, es opcional.", the offer stays open) and a keep.
   - "¿Dónde está la sala 7?", a hint on every visit, got "Esta es la sala 4." without the gate change. Now the way
     there (gate7_dir) in both cases.
   - Side questions not understood: "¿Cuál es mi asiento?" / "¿Qué asiento tengo?" (now the new seat, or "Viene en su
     pase de abordar"), "¿Sirve mi pasaporte?" / "¿Necesito mi pasaporte?" at the ID request (now "Sí, su pasaporte
     sirve como identificación.", and at the scan the request stays open without repeating it), "¿Cuál es mi sala?"
     (s64a's hint: the flight is asked for, then "Esta es la sala 4" / the way to sala 7, no "Sí").
   - The counter-request at the seat offer, "¿No tiene uno de pasillo?" / "¿Y uno de ventanilla?", now offers the
     other seat (14C / 16A).
   - "¿Cuándo me toca?" got "Usted va en la zona 3…" (which zone, not when). Now "La zona 3 pasa justo después de la
     2." (with the boarding time before the call; at the zone 3 call, the scan). "¿Cuánto tiempo de retraso hay?" is
     understood.
8. Hints: correct and accepted (the q_gate12 reply is in point 7).
9. Accepted answers (1): at the scan "Tenga mi pasaporte" / "Mi pasaporte" were not understood; now a hand-over.
10. Neutral text (1): "sala" (the gate) had no twin, while s64a and s64b twin it to "puerta" (a neutral learner heard
    "puerta 4" at check-in and "sala 4" here). Ten lines (gate4_here, gate4_for_223, gate7_is, gate7_yes, gate7_not4,
    gate7_dir, gate_changed, not_this_flight, coffee, restroom) and four hints (q_gate, q_gate4, q_right, q_gate12)
    now have "puerta" twins, and the Mexican lines flag "sala" as s64a does. "Aquí en la sala hay wifi" (the waiting
    area) stays. The other twins (pase de abordar, ahorita, contactos) were right.

### For the voices

No Mexican line's text changed. New lines: `no_bag`, `offer_optional`, `id_passport`. Neutral text changed: the 14
"puerta" twins. The rest (glosses, the English, grammar, handlers) isn't voiced.

### Left for the lead / owner

- Global (proposal): the tolerance that drops a little word turns "Ya voy" (I'm coming) into LEAVING_PATTERNS' "ya me
  voy" everywhere; g_bye's leaving patterns could require the "me". Here it's handled at the boarding call only.
- Engine (proposal): `predicateAux` (va, sale, está, es…) can't start a piece, which is right for "el bistec | no está
  bueno" but drops Spanish's subjectless follow-up questions ("Voy en el 223, ¿va a tiempo?"), and the approximate
  reading then keeps the first half only. Worth a look edition-wide; here the patterns cover it.
- Kept: "¿Dónde está la sala 4?" at gate 4 still gets "Sí, es la sala 4. Aquí sale el vuelo 223…" (natural enough
  there); "¿Está lejos?" after the gate change and a lost boarding pass ("No encuentro mi pase") are not understood,
  which is safe.

## Spain twins (11 Nov 2026)

- 38 Spain twins (lines and hints), 17 items in tests/es/spain/s64c-gate.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Daniela (the gate) keeps usted.
- Words: embarque/embarcar for abordaje/abordar, facturar for documentar, coste for costo, cinta de equipajes for banda de equipaje, móvil, documentación, ¿Me deja…? for ¿Me permite…?, ¿Qué desea? for ¿Qué se le ofrece?, Mire, ha habido un cambio de puerta for Fíjese que hubo…, Pues no for Fíjese que no, Llevamos un retraso for Traemos…, the perfect (el avión todavía no ha llegado, el embarque todavía no ha empezado), un bolso for una bolsa, asientos for lugares, aseos, delante.
- Grammar: the boarding pass may be tarjeta / billete; ask_free takes coste; give_bp takes documentación / DNI. Merges: ha habido, no ha llegado, no ha empezado.
- Nothing left for the lead.
