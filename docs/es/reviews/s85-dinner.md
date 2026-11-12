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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), against AUDIT-BRIEF.md's ten points. Read: STYLE.md, AUTHORING-ES.md
(rules from the reviews), the brief, the review above, the cross and neutral files (AUDIT/cross, AUDIT/neutral: nothing
to fix there; no town-direction conflict, the house on calle Hidalgo is never placed in the lines), the situation file,
corpus and held-out set, the review transcripts (seeds 3 and 7), ~70 whole conversations with `tools/probe.ts` (every
offer with each option, "Sí", "No, gracias", "Nada", "Estoy bien" and a change of mind; side questions at the door, the
table and the goodbye), who the voice line list hears saying each line (120 random runs + the sims, as lines-es.ts
does), the scene pictures and the 3D room (graphics round 2: tile floor, hammock, Guadalupe altar, plants in clay pots,
the kitchen at the back).

**Before → after:** check-content 113/113 NLU, 14 sims → 127/127 NLU, 19 sims, all 12/12 seeds, fuzz 80, 0 errors
0 warnings; corpus 243/243, 0/32 false accepts → 272/272, 0/36; held-out 40/40, 0/3 → the same.

**Found 20 (1:4 2:0 3:0 4:3 5:1 6:0 7:11 8:0 9:1 10:0), fixed 20.**

1. **Natural Spanish (4).** (a) "¿Quién cocinó (la cochinita)?" got "¡Sí, yo!", a yes to a who-question, and "¿Quién
   hizo el flan?" wasn't understood: new `i_did_who` "¡Yo! Bueno, el flan lo hizo Natalia." and `flan_who` "¡Yo! Es la
   receta de mi abuela." (b) "¡Ay, perdón! Se me pasó la sal" was Natalia's, though Diego cooked the cochinita (`i_did`):
   now Diego says it (speaker only). (c) "¿Qué es esto?" asked a second time at the table got "¡Cochinita pibil!
   Ahorita la pruebas" (you'll taste it in a minute) while eating: at the table it is now `dish_is`. (d) "¡Qué bonita
   vista!" / "¡Qué bonito jardín!" / "Me encanta su decoración" got "La acabamos de pintar" (a feminine "it", the
   house): that answer now goes only with la casa, la cocina, la sala; the rest get `glad_you_like`.
2. **tú/usted:** nothing (tú both ways; hints ustedes to both hosts, tú to one; usted and vosotros understood).
3. **Names:** nothing (Diego, Natalia, Michi female as in p30; Natalia's mother, sister and grandmother unnamed).
4. **Facts (3).** (a) A guest who eats no meat (the diet twist: "Soy vegetariano", "No como carne / puerco") got the
   rajas tacos, then "¿Qué tal la cochinita?", "Ahorita la pruebas" and cochinita packed to take home: now "¿Y? ¿Te
   gusta?" (asked once), the dish named only as a fact, no cochinita to go. (b) "No como pescado / mariscos / pollo /
   res" got "También hice tacos de rajas con queso", as if the cochinita had it: now "¡Qué bueno que me dices! Te digo
   qué lleva cada plato." (diet "other"). (c) Yucatecan cooking: the cochinita flag said "achiote and orange juice";
   now "pork marinated in achiote and sour-orange juice, slow-cooked in banana leaves". The menu itself is right
   (cochinita with pickled red onion, tortillas, lime and habanero salsa; agua de jamaica; flan; rice and beans), and
   matches the dinner picture. The house matches the lines: "La acabamos de pintar", "Los pintó mi hermana" (two
   paintings in the pictures), "la recámara", the kitchen at the back; the late picture shows coffee already poured,
   so "¿Otro cafecito?" after the sobremesa stays.
5. **Glosses and English (1).** `restroom_where` "Down the hall, on the right" → "In the back, on the right" (the
   Spanish says "al fondo"; there is no hall in the 3D room or the pictures). New flags for achiote and naranja agria;
   the merges "naranja agria" and "hoja de plátano".
6. **Spelling, ¿¡:** nothing (the cross file's check, and every new line read).
7. **Questions and offers (11).** (a) "¿Qué lleva?", "¿Cómo la preparas?", "¿Cuál es el secreto / la receta?" got
   "¡Claro! Te la mando por mensaje" (no answer), and "¿Qué es la cochinita (pibil)?" wasn't understood: new
   `recipe_what` (Diego) "Es puerco adobado con achiote y naranja agria, cocido en hoja de plátano." (neutral: cerdo);
   "¿Me das la receta?" keeps Natalia's "Te la mando por mensaje". (b) "¿Qué lleva la salsa?": new `salsa_what` "Chile
   habanero, naranja agria y sal. ¡Cuidado, que pica!". (c) "¿Me das otra cerveza?", "Otra cerveza, por favor", "¿Me
   sirves otra copa de vino tinto?" weren't understood: served. (d) "¿Me sirves más (cochinita)?", "¿Hay más
   cochinita?" weren't understood (or were silent outside the seconds question): more is served and Natalia doesn't
   offer it again; "más arroz" stays a pass. (e) "¿Les ayudo a recoger la mesa?" wasn't understood. (f) Help offered
   after dinner on a visit with the kitchen task got "¿Me ayudas a llevar el agua de jamaica a la mesa?": that task is
   now only before dinner. (g) "¿Te gusta?" came back after every side question without end (seven times in a probe),
   a "No" to it got the question again, and "Más o menos" was followed by "¿Quieres más?": now at most three asks, a
   "No" or "Más o menos" answers it once ("¿No? ¡Ay, perdón! También hay arroz y frijoles"), no seconds are pressed
   after it, a second complaint gets Diego's "Si se te antoja algo, me dices" and at the flan it is a no to the flan.
   (h) "¡Bueno! Pero deja lugar para el postre" (and Diego's "el flan lo hizo Natalia") on a visit without dessert never
   brought the flan: once the flan is mentioned it is offered. (i) "¡Claro!", "Con gusto", "Sí, ¿dónde la pongo?" to a
   question asked the second time ("¿Me ayudas con el agua?", "Entonces, ¿un poquito de flan?") were silent (the step
   counted as done): they now answer it as "Sí" does. (j) "Oye, ¿me pasas las tortillas?" came twice word for word:
   new `pass_reask` "¿Me pasas las tortillas, porfa?". (k) "Ya me voy" as dinner was served got "¡Claro! ¡Gracias por
   venir!", and on a stay-twist visit "¡Quédate otro ratito, estamos en la sobremesa!" with the main course on the
   table: Natalia now protests once (new `but_eating` "¿Ya te vas? ¡Pero si apenas estamos cenando!"), and the
   sobremesa twist comes only after dinner. Every offer was played with each option and its refusals: the drink
   (cerveza, vino, agua de jamaica, refresco; "Sí" lists them; "No, gracias", "Nada", "Estoy bien" get "Si se te
   antoja algo, me dices"), seconds, the flan, the coffee, "¡Quédate otro ratito!", Michi in the bedroom: every option
   answered, every "No, gracias" respected.
8. **Hints:** nothing (all accepted by the grammar, in the right register).
9. **Accepted answers (1 + tests).** Compliments on what the room shows weren't understood: "¡Qué bonita hamaca!", "Me
   encantan sus plantas", "Qué bonito altar". Corpus +33 (12 traps: 4 any, 8 with `not`), NLU tests 113 → 127, sims
   14 → 19.
10. **Neutral text:** nothing to fix in the 9 twins; the new `recipe_what` has its twin (puerco → cerdo), the other new
    lines have no Mexican-only word.

**Spoken lines for the voices** (before the freeze): new `i_did_who`, `flan_who`, `recipe_what` (+ its neutral twin),
`salsa_what`, `pass_reask`, `but_eating`; `sorry_salty` is now Diego's (was Natalia's). No existing line's words
changed.

**Who says it.** Two lines can be said by both hosts: `glad_you_like` (Diego to a second compliment on the smell or
"Cocinas muy bien"; either after praise of the food; Natalia after "Sí" to "¿Te gusta?" and to a compliment on the
view, the garden or the room) and `how_is_it` (either host asks). Every other line has one speaker. Before this audit
the line list's runs heard nobody say `dish_again`, `sorry_salty` or `diet_allergy_ok` (so they would be voiced for
both or guessed); two new sims make each host say their own side answers (Diego: on_time, gift_mezcal, dish_is,
dish_again, i_did_who, diet_allergy_ok, cheers_back, recipe_what, salsa_what, sorry_salty, it_sure_does, thanks_dinner;
Natalia: gift_cookies, thanks_again, salad_task, salad_reask, restroom_where, star, pictures, spicy_answer, no_spicy_ok,
flan_mine, flan_who, here_cake, for_the_road, get_home_will), and after the fixes every s85 line is heard in its own
speaker's voice. No plural items, no values.

**For the lead / owner:**
- Pictures: the closing picture always shows Natalia holding the foil plate; the lines offer food to take home on half
  the visits (roadFood) and never to a guest who eats no meat. Always offer it, or leave as is.
- Still open from the first review (global.ts): g_bye reads a bare "igualmente" as a goodbye, @greet reads "buenas
  noches" as a hello at any hour (both handled here).
- Left as they are: "¿Es casera?" gets "¡Sí, yo! Bueno, el flan lo hizo Natalia"; a bare "¿Qué lleva?" at the flan gets
  the recipe by text; "¿Qué hora es?" isn't understood (global, rare here).

## Spain twins (11 Nov 2026)

- 57 Spain twins (lines and hints), 22 items in tests/es/spain/s85-dinner.json (all understood, 0 false accepts).
- Register: Diego and Natalia say tú to the learner in every variety. **Change:** the learner's hints to both hosts
  move from ustedes to **vosotros** in Spain (friends one says tú to): ¡Qué alegría veros!, Esto es para vosotros,
  Os he traído…, ¿Os ayudo en algo?, Os aviso cuando llegue. The English note on gf_for_you ("Ustedes: you're
  speaking to…") is shared by all three texts and still says ustedes; left for the lead.
- Words: ¿Qué te pongo (de beber)?, te apetece, ¡Que aproveche!, ¡Ya está!, café (for cafecito), trocito, sitio (for
  lugar), judías, madre (for la mamá de Natalia), majo / maja, ¡Qué bien! / ¡Qué alegría! (for ¡Qué bueno! / ¡Qué
  gusto!), menos mal, ¡Espera!, se me ha ido la mano con la sal, no tenías que haberte molestado, ¡Claro que sí!
  (for the learner's ¡Con gusto!), ¡estaba buenísima!.
- Spain's present perfect for what just happened: qué bien que hayas venido, has venido, has llegado, se me ha
  olvidado, he hecho, se me ha quemado, has traído, os he traído, ¿Has cocinado tú?, me lo he pasado muy bien, nos
  ha encantado verte, qué bien que te haya gustado.
- Grammar: que aproveche, aseo / servicios, qué alegría veros, no he traído nada, quién ha preparado / lo has hecho
  tú, trocito, fregar los platos, me lo he pasado muy bien. Merges for the new units.
- Left for the lead (global.ts): "¿Qué tal estáis?" isn't read as g_howareyou ("¿Cómo estáis?" is).

After pass B (merge of es-spain 98cfaffc, 12 Nov 2026): the new for_the_road_flan line gets its Spain twin, "¡Espera!
Te pongo un trozo de flan para llevar." (like for_the_road's "¡Espera!").
