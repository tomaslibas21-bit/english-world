# Review: s85-dinner ("Gracias por invitarme", Diego and Natalia), writer's commit 42e057fd

**Gate before → after:** tsc clean → clean; check-content 102/102 NLU, 12 sims 12/12, fuzz 80, 0/0 → 113/113 NLU,
14 sims 12/12, fuzz 80, 0 errors 0 warnings; corpus 235/235, 0/32 false accepts → 243/243, 0/32.
**Blind set** (`tests/es/heldout/s85-dinner.json`, 43 items, 10 traps and 1 nonsense line, written before I read the draft): before
37/40 = 92.5%, 0/3 traps accepted (missed: "Perdón por llegar tarde, había mucho tráfico", "No está nada picante, está
muy rico", "Postre no, gracias, estoy llena"); after 40/40, 0/3 (not blind for me any more).
A good draft (tú held, glosses and flags right, twists as in English); the probes found the problems, all in the
turn handling. 62 lines added, 15 changed: ~35 must-fix, ~5 polish, ~35 tests.

## Fixes
- **meaning-safety (must-fix, ~25 lines)**
  - "No, estoy lleno/llena" to the flan got the flan ("¡Aquí está!"): more_yes held a bare "no estoy @full". By voice
    "No estoy lleno" = "No, estoy lleno" (rule 10), so the yes now needs todavía / aún / tan.
  - "Se me hizo tarde, perdón" at the door was read as leaving: "¿Ya te vas? ¡Pero la cena…!". Before dinner it is
    now late_sorry (handler guard plus patterns).
  - "¿Te sirvo algo más? ¿Un cafecito?" ignored "Sí, por favor" and asked the same question again. "No, gracias" also
    got the question again, and after the sobremesa that meant "¿Otro cafecito?" twice in a row. "Sí, un cafecito"
    was served and then offered again. Now a yes serves it once (`coffee`), a no gets "Entonces seguimos con la
    sobremesa" (after the sobremesa it is the goodbye), and once the coffee is settled nothing is offered again. The
    evening's drink stays on record (it used to be overwritten with "coffee" or "none").
  - At "¡Quédate otro ratito!", "Está bien, gracias" ended the visit. It could mean either, so Natalia asks again
    ("Entonces, ¿te quedas otro ratito?"), as rule 17 says.
  - cat_reask "¿No te molestan los gatos?" flipped the step's sí (= allergic): now "¿Te molestan los gatos?".
  - A typed "No, está picante" counted as praise. With its comma it is now a complaint; by voice it stays "not spicy".
- **understanding (must-fix, ~8 pattern lines):** "Cerveza no, gracias" (drink_neg), "Postre/Flan no, gracias",
  "Me encantaría, pero ya no puedo" at dessert (was thanks_end), "Ya cené mucho", "No está nada picante, está muy
  rico" as one pattern, "Perdón por llegar tarde, había mucho tráfico".
- **spanish (polish, 2 lines):** "¡Que llegues bien! Avísanos cuando llegues" used llegues twice, so it is now "¡Que
  descanses! Avísanos cuando llegues." The new line chat_then uses sobremesa, with no Mexican-only word.
- **gloss-english, numbers, twins, facts, structure:** no changes (a third of the glosses and flag indexes checked;
  no prices; every Mexican-only word has its twin; the English steps, intents and five twists are kept).
- **tests (~35 lines):** 11 NLU traps, 2 sims (late at the door + full + coffee declined; coffee yes + stay asked
  again), 9 corpus items. The writer's corpus item "No estoy llena" → more_yes is now more_no (rule 10).

## For the lead / owner
- The writer's NEEDS stand: global g_bye reads a bare "igualmente" as a goodbye, and @greet reads "buenas noches" as
  a hello at any hour. Both are handled locally.
- Left as they are (low harm): "Rico" before dinner counts as praise for the food; a spoken "Esto pica" without "?"
  gets an apology and water; "Bueno, un ratito más" after the goodbye has started still ends the visit.
- Owner: the menu (cochinita pibil, agua de jamaica, flan) and "casi las once" are plausible but not researched.