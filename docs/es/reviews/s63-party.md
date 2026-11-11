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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), against AUDIT-BRIEF.md's ten points. Read: STYLE.md, AUTHORING-ES.md,
the brief, the review above, the cross-cutting leads (AUDIT/cross, AUDIT/neutral), the file, corpus and held-out set,
the review transcripts (seeds 3 and 7), and ~150 whole conversations played with `tools/probe.ts` (every step, every
pending question, yes/no with "¿Y tú?", corrections, refusals, side questions).

**Before → after:** check-content 102/102 NLU, 8 sims → 119/119 NLU, 10 sims, all 12/12 seeds, fuzz 80, 0/0; corpus
235/235, 0/28 traps → 312/312 (100%), 0/35 traps; held-out 40/40, 0/1 → the same.

### Found and fixed, by point (56 found, 56 fixed)

1. **Natural Spanish (8):** "Me gusta ir a los cenotes" / "Hago snorkel" got "¿Bucear?" (now "¡Ah, qué bien! Suena
   divertido."); a reason that isn't the sea ("Por la comida y la gente", "Me gustó el pueblo", "Me encanta México")
   got "Con este mar, ¿quién no?" (new line `why_life`: "¡Te entiendo! Aquí se vive muy bien."); "Yo también soy chef"
   after Marcos had said he is one got "¡Yo también soy chef!" (new `job_chef_too`: "¡No te creo! ¡Somos colegas!");
   a dance class after Marcos had told his own got "¡Nosotros también…!" again (new `know_dance_too`: "¡No te creo!
   ¡Igual que nosotros!"); "Sí, me encanta. ¿Y a ti?" got "A mí también me encanta" and then "¡Me encanta!", and "Un
   año. ¿Y tú?" got "Yo llegué en mayo" twice (Marcos's own line is skipped when his reaction already said it); "No, no
   todos" (hockey) and a second "¡Salud!" got "¿Verdad?" (now "¿Ah, no? ¡Yo pensaba que sí!" / "¡Salud!"); "¿Qué hay?"
   at Marcos's offer was answered by Ximena (now Marcos); "Un taco y otra cerveza" got two "¡Claro!" lines.
2. **tú/usted:** nothing (tú both ways, hints in tú, usted accepted).
3. **Names:** nothing (Ximena, Marcos; no clash, as AUDIT/cross says).
4. **Facts:** nothing to change. "Cerca del mercado, a dos cuadras del zócalo" agrees with TOWN.md (the mercado faces the
   zócalo); "Ya casi son las once" matches the scene pictures (the numbers and goodbye pictures are at night, string
   lights on), so the earlier review's owner question is answered by the pictures; the new café and Marcos's
   restaurant stay unnamed.
5. **Glosses and English (1):** hint `n_swap` "Shall we swap numbers?" → "Want to swap numbers?" (gloss
   "Should-we-swap"), as CROSS.md §12. English only.
6. **Spelling, ¿¡:** nothing.
7. **Questions and offers (28):** "Hola, ¿cómo estás?" was never answered (Marcos asked the name; now "¡Muy bien,
   gracias!" first). Answers that were read as another question and brought the question back: "Por el trabajo" at
   "¿Cómo conociste a Ximena?" (was why_ans, "Como yo"), "Estoy de vacaciones" at "¿Qué te trae por aquí?" (was the
   job), "No mucho, ¿y a ti?" at "¿Te gusta…?" (was "not long", time_ans). A yes or no with "¿Y tú?" was lost and the
   question came back: "Sí. ¿Y a ti?" (like), "No, ¿y tú?" / "No, ¿cuál?" (the café), "Sí, por favor. ¿Y tú?" / "No,
   gracias. ¿Y tú?" (drinks); now the yes or no answers first. "Una cerveza, ¿y tú?" got "Yo soy de la Ciudad de
   México" (new `mark_drink`: "Yo ya tengo mi cerveza. ¡Salud!"; also "¿Y tú qué tomas?"). "¿Y tú qué cocinas / vives
   cerca / has ido a…? / bailas?" got two answers (ask_back + the question). At "¿Cuál es tu número?" the polite
   "Mejor no, perdón" was asked again (the "perdón" read as "¿Perdón?" and the pending had no no), "¿Y el tuyo?" wasn't
   understood, and a bare "Sí" got the same line twice (now "Entonces, ¿me pasas tu número?"). "El sábado no puedo" at
   the café invitation said yes and no; "¿El sábado?" / "¿Cuándo?" weren't understood. "No por el trabajo, por amor"
   answered "for work". Questions that stayed open (not optional): "Está en Oregón" / "Es un estado de Estados Unidos" /
   "En Nueva Escocia" at "¿Y eso dónde queda?", "Varias cosas" at "¿Y qué haces exactamente?", a title ("Harry Potter")
   at "¿Qué estás leyendo?", "No, no llueve tanto" at the rain question. "No está en Canadá" was read as Canada (now the
   question is asked again, shorter: new `city_where_again` "¿Entonces dónde queda?"). Side questions with no answer:
   "¿Cuántos años tienes?", "¿Tienes hijos?", "¿Estás casado?" (new `mark_personal`: "¡Ja! Eso te lo cuento otro
   día."), "¿Ya te vas?" (new `mark_going`: "Sí, ya me voy."), "¿De qué son los tacos?" (new `tacos_what`: "¡De
   carne asada, claro! ¿Te traigo uno?", and its yes is the taco), "¡Los tacos están deliciosos!" (new `food_thanks`:
   "¡Gracias! Me alegra que te guste."). "Soy de Canadá, pero vivo aquí desde hace un año" buried the cold question
   under the time reply (now no weather question when the answer goes on to another topic). "¡Sí, está delicioso!" to
   "Su tres leches está buenísimo, ¿verdad? ¿Y si vamos juntos…?" said the café lines again (now it is a yes to
   going); "¡Claro!" to "¡Pregúntame algo!" got both lines again (now "¡Pregúntame algo!" alone, and a "No" gets
   Marcos's own story).
8. **Hints (1):** the reading hint "Nada por ahora." got "¡Suena bien!" (now "¡Ja, te entiendo!").
9. **Accepted answers (18):** "Hola, soy Ryan, amigo / vecino / compañera de trabajo de Ximena" (also answers how they
   know her); "Lo que tú quieras"; "No tomo alcohol, ¿tienes agua?"; "La conozco del trabajo / de la clase de yoga /
   del barrio", "Es la novia de mi amigo", "Es mi prima", "Porque trabajamos juntos"; "Soy de Estados Unidos, pero vivo
   aquí", "Soy de Portland, Oregón", states and provinces (Colorado, Oregón, Nueva Escocia, Alberta…); "Trabajo en una
   empresa (de software)", "Soy diseñador freelance"; "Llevo aquí dos meses", "Vivo / Estoy aquí desde marzo"; a
   leading "Porque…" / "Es que…" on every reason; "Sí, lo conozco", "Sí, está buenísimo" (the café's cake, not a
   compliment to Marcos); "Claro, apunta: …"; "No, gracias, no como carne", "Soy vegetariana". Corpus +77 items,
   traps +7 ("No está en Canadá" is covered by a sim instead: it still parses as "No." + "está en Canadá", and the
   handler asks again).
10. **Neutral text:** nothing. The five twins say the same thing; the nine new lines have no Mexican-only word.

New spoken lines (9, one variant each, to voice): know_dance_too, job_chef_too, why_life, mark_personal, mark_drink,
food_thanks, tacos_what, mark_going, city_where_again. Marcos also says drink_menu now (at his own offer). No existing
line's words changed. Two sims added ("yes or no, and ask back", "neighbor, a state, no number") and 17 NLU tests.

### For the lead (shared files)

- lang.ts: "está" / "queda" aren't in PART_VERBS, so "No está en Canadá" parses as "No." + "está en Canadá" (here the
  handler asks again; other conversations may take the place).
- global.ts LEAVING_PATTERNS: "Ya vamos" at a café question reads as a goodbye and ends the conversation (here the flow
  no longer re-asks, so it isn't reached).
- Still open from the first review: g_bye takes "igualmente" / "tú también".

## Spain twins (11 Nov 2026)

17 twins + Spain nouns for camarero/a, fontanero/a (the J helper takes a Spain pair) and zumo. Guests say tú (unchanged).
Register change in Spain: Ximena's plural "you" to the learner and Marcos is vosotros ("Entonces trabajáis juntos", "¡Sois
vecinos!"). Also: "¡Qué bien que hayas venido!", "¡Vale! Si quieres algo, me lo dices", calentita, "solo" for "nada más", "a dos
calles del zócalo", "tarta de tres leches", "pequeñito", "muy a menudo", "juegan al hockey", "¡Me ha encantado conocerte!" (the
goodbye pattern now takes "me ha encantado / encantado de conocerte"). Spain corpus: 14 items (zumo, camarera, fontanero, porfa).
