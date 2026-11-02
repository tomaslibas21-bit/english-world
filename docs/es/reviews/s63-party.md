# Review: s63-party ("¿Y tú de dónde eres?"), writer's commit 3e8c6b94
| Check | Before (writer) | After (review) |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content | 89/89 NLU, 8 sims 12/12, fuzz 80, 0/0 | 102/102 NLU, 8 sims 12/12, fuzz 80, 0/0 |
| corpus (writer's + 20 review items) | 215/215, 0/28 traps | 235/235 (100%), 0/28 traps |
| blind set (40, written first) | **37/40 = 92.5%**, 0 traps | 40/40 (not blind any more) |
The bugs were found by probing whole conversations with `tools/probe.ts` (32 scenarios), not by the blind set.

## Fixes (91 lines added, 45 changed or removed in the conversation file)
- **meaning-safety, must-fix (~20 lines)**: (1) `drink_no` held bare refusals ("Mejor no", "Ahorita no", "Estoy
  bien"). It is a plain intent, so at "¿Me pasas tu número?" the answer "Mejor no, gracias" made Ximena answer about
  drinks, and the number question stayed open. Those refusals are now `drink_no_ctx`, used only at the drink offers.
  (2) "Un taco no, gracias, estoy lleno" served a taco; "Cerveza no, gracias" and "Otra no" are now refusals.
  (3) "Me gusta, pero todo es caro" got like_yes, and "Aquí es muy bonito" at "¿Te gusta?" became why_ans. (4) "No
  trabajo, estoy de vacaciones" was read as job-hunting. (5) "Islandia no" now keeps the country the learner said
  first (`heardRight`).
- **understanding (~15 lines)**: Por trabajo / negocios; Vine de vacaciones y me quedé; No me gusta el calor; Estoy
  muy bien aquí; …, la verdad; Algo sin alcohol; Vine con un amigo; No trabajamos juntos, somos vecinos; No me gusta
  correr, pero…. At the number question, "¡Buena idea!" and "¡Por qué no!" now count as a yes (agree_go did nothing).
- **spanish / rule 11 (~14 lines)**
  - Must-fix: "Me encantaría conocer algún día" had no object; it is now "ir".
  - Must-fix: "Es caro", "Es diferente" and "Más o menos" got "Yo también extraño la Ciudad de México". They now get
    `like_cost` / `like_adjust`.
  - Must-fix: "¿Qué cocinas?" got "Me encanta, pero es mucha chamba" (now `mark_cook`); "Me gusta nadar" got
    "¿Bucear?" (now `fun_swim`).
  - Polish: "No, no tanto" no longer gets "no sé nada de geografía"; "llevas más tiempo que yo"; "algo más de tomar".
  - Polish: like_yes no longer echoes the learner; "Siempre he querido intentarlo" only follows sports, instruments
    and activities; Marcos answers "¡Igualmente!" when the learner said "mucho gusto" first.
- **flags, must-fix (6 lines, rule 15)**: know_q ×2, hint b_know, time_q, mark_job and rain_yes (which pointed past
  the end of the line) had their flags on the neighboring unit.
- **gloss-english (2 lines)**: cold_q_named and rain_q_named are glossed as questions, not tag questions.
  **tests**: 13 NLU trap tests, 20 corpus items, a 40-item blind set.

Kept: the structure (every English step, intent and twist, plus `why` and `cheers`), 5 Mexican-only lines with
twins, tú throughout, vague town facts that agree with TOWN.md, and "¡Ah, mesero!" for camarero.
## For the lead
- The writer's `// NEEDS:` is still open: global g_bye takes "igualmente" and "tú también".
- Polish not done: a second "¿Y tú?" on an answered topic repeats Marcos's line. For the owner (the writer's
  question): "casi son las once" at an afternoon carne asada.
