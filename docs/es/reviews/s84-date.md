# Review: s84-date ("¿Te puedo volver a ver?"), writer's commit acb9f490

## Gate and blind set
| | Writer (acb9f490) | After review |
|---|---|---|
| check-content | 96/96 NLU, 12 sims 12/12, fuzz 80, 0/0 | 122/122 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 213/213, 0/29 false accepts | 229/229 (16 added), 0/29 |
| blind set (37, written before reading) | 33/37 = 89.2%, 0/3 traps accepted | 37/37 = 100%, 0/3 (not blind any more) |
| tsc / vitest | clean / 288 | clean / 288 |

The blind misses: "…, la verdad" after nervous and "no me gusta mucho"; "No hace falta, yo pago"; "No sé, tal vez".
The probes (tools/probe.ts, ~90 turns: pay, split, the offer, the second date, drinks, topics) found the must-fixes.

## Fixes (file: +148 / -35 lines)
**meaning-safety, must-fix (~50 lines)**
- "Yo pago la mitad" parsed pay_all + split: the partner thanked the learner for paying everything. Now split ("mi parte", "lo mío", "la mitad cada uno").
- "No, de verdad, yo pago" at "Yo invito, ¿eh?" hit accept_offer ("de verdad") and the partner paid. accept_offer and g_thanks now step aside when the same turn pays or splits ("La próxima pago yo" still accepts).
- Bare "nada", "no tomo {drink}", "no quiero {drink}" were in the plain no_alcohol: "Nada, estoy de vacaciones" at the job question and "No tomo café" at "¿Café o té?" got the agua de jamaica line and set noAlcohol; "Nada" at the check too. Now no_drink_ctx, at the drinks question only.
- "Sí, claro, pero este fin de semana no puedo" and "No, el domingo no puedo" at "¿Te puedo volver a ver?" were a no: the evening ended. A refused day is now yes plus another day (dayNo/nextWeekendDay remember the refused days; Saturday stays the parents' day in the twist).
- After "¿Cuándo tienes tiempo?" a "No" offered Sunday again although Sunday had just been refused; "El domingo no puedo" when Saturday was offered got "¿y el domingo, entonces?". Fixed by the same helper.
- "No, perdón, no creo" said "Ah... está bien. Sin presión…" twice in a row (no_sorry + decline_again). Now once.
- Adding day_ctx at the again step ("Sí, ¿el sábado?") briefly made "Sí, pero no el sábado" book Saturday; a decline pattern and a test close it.

**numbers / rule 11, must-fix (~14 lines)**: "¿Cuánto es?" got "No es mucho, no te preocupes". Now: before the check "Todavía no nos traen la cuenta"; at the check "A ver... son $1,280" (the check waits for who pays); after splitting "$1,280, o sea, $640 cada quien"; after the partner's treat "¡Ni lo pienses! Yo invito" (kept) or "¡Ya está pagada!".

**understanding (~25 pattern lines)**: trailing "la verdad"; "No hace falta / Gracias, pero yo pago"; "¿Segura? Mejor dividimos"; "¿Quieres que paguemos a la mitad?"; "Sí, ¿el sábado?", "Me encantaría. ¿El sábado?", "Claro, ¿este fin de semana?" (day_ctx at the again step); "¿qué tal si vamos a un cenote?"; "Tal vez la próxima semana"; "Te iba a preguntar lo mismo"; "Me gustaría, pero no sé cuándo" (was "¡Piénsalo!" + "¡Qué bueno!"); "No puedo ese día", "No, tampoco", "El sábado no, el domingo"; "Ninguno (de los dos)", "No tomo café" at the quick questions; "Me encanta la música"; "Tengo una chamba en un hotel", "Antes era maestro, pero ya no trabajo"; "Una cerveza. No, mejor una limonada" (the second drink); "No, tú mándame un mensaje"; "¿Tienes frío?" at the cold twist (new cold_q_ctx: "Un poquito, sí.", then the sweater may follow).
- "Soy estudiante. ¿Tú?": "¿Y te gusta?" was asked and then buried under the partner's own job; a bare final "¿Tú?" now counts as asking back.

**spanish, polish (1 line)**: ask_back "¿Y tú qué?" can sound curt → "¿Y tú, qué me cuentas?".
**gloss-english, polish (1 line)**: hint "Shall we go halves?" (British) → "Should we split it fifty-fifty?". New lines glossed; 2 merges registered (no nos traen, cada quien). About a third of the glosses read: no other errors.
**twins/facts/structure: no change.** padre 1 line, no manches 2, each with a twin. El Muelle matches TOWN.md and s69 (seafood on the malecón, "un poquito caro"). Same id, steps, intents and twists as the English, plus the writer's ask_amount and which_day.
**tests**: 26 NLU tests (the blind traps and each fix), 1 sim (the price, my half, not this weekend), 16 corpus items.

## For the lead / owner
- New figure: dinner for two at El Muelle with drinks = $1,280 (two seafood mains ~$450 each + drinks). The writer had avoided prices, but rule 11 wants a price for "¿Cuánto es?". It stays inside STYLE.md's ranges for a pricey place. Owner may prefer another sum.
- Kept: "Me encantaría, pero no puedo" (with no day) at "¿Te puedo volver a ver?" is a polite no and ends the evening, as in English. A bare "No te preocupes" / "No, gracias" at "Yo invito" means splitting.

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), both dates (Santiago, Camila) and both learner genders. Read:
STYLE.md, AUTHORING-ES.md, the brief, this review, the cross and neutral files (AUDIT/cross, AUDIT/neutral), the
situation file, the corpus and the held-out set, the transcripts of every sim at seeds 3 and 7, probe.ts on the second
date, the check, the drinks and ~40 side questions (Camila and Santiago, all four learner/date gender pairs), and the
line list's own logic (tools/es-voices/lines-es.ts: which date each line is heard from in its random runs and in its
sims for both genders). No "Town directions" conflict (the cross file): the dates live "a unas cuadras" / "a la vuelta".

**Found 16 (1:2 2:0 3:0 4:4 5:0 6:0 7:10 8:0 9:0 10:0), fixed 16.**

1. **Spanish.** (a) qf_beach_yes "¡Obvio! Vivimos en el Caribe." → "Estamos en el Caribe" (the learner may be visiting).
   (b) "Me encanta bailar" / "andar en bici" got "Siempre he querido probarlo": a local who loves cumbia has danced and
   every adult has ridden a bike; both now get the plain reaction (not `tryable`).
2. **tú/usted:** tú both ways in every line, hint and global line (the dates are `informal`); "¿Y usted?" still accepted
   with the tip.
3. **Names:** Santiago, Camila and the cat Luna; no clash in the edition.
4. **Facts, values, voices.** (a) The check: $1,280 for two ($640 a person) against s69's "Como trescientos pesos por
   persona, con bebida" for El Muelle: now **$900, $450 each** (a main and a cocktail each). (b) open_late "Me perdí en
   el centro" from a local who lives a few blocks away → "Había mucho tráfico en la carretera" (calle Itzamná leads to
   the highway, TOWN.md). (c) amount_total / amount_half had no `domains`: amount_half (said only after splitting) was in
   no voice list at all, amount_total only where a sim happened to say it. `domains: { total: [$900], amount: [$450] }`
   (one value each). (d) Who says it: every line of s84 can be said by either date (the learner's choice; no line is
   partner-specific). In the line list's runs own_travel and amount_paid were heard only from Santiago and live_close
   only from Camila (and, once the new lines came, you_are_fine, thats_great, told_you, never_home and qf_tea only from
   Camila): four new sims reach them on every seed, and the list plays every sim for both learner genders (Camila for a
   male learner, Santiago for a female one), so each is heard from both. hello_again is never reached (the list then
   voices it for both).
5. **English:** nothing wrong; the new lines are glossed and flagged (se deja, el before a percentage, a la talla,
   ¡mira!, ver = to work out).
6. **Spelling, ¿¡:** nothing.
7. **Questions, offers and the second date.** (a) **A no to the second date after a first yes was taken as "not that
   day"**: "No quiero volver a verte", "No, perdón, no creo que sea buena idea", "No creo que seamos compatibles" at
   "¿Qué tal el sábado?" got "Mmm, ¿y el domingo, entonces?". Now `datesOff` ends the plan kindly ("Ah... está bien. Sin
   presión. Me dio gusto conocerte.", then "¡Buenas noches!"), at the day step, at "¿Qué día te queda bien?" and at the
   goodbye; a bare "No" / "No puedo" there still turns down only the day. (b) "Prefiero que no", "No me interesa",
   "Mejor quedamos como amigos", "No estoy buscando nada serio", "No creo que funcione", "Me caes muy bien, pero no",
   "No siento química", "Pensándolo bien, mejor no" weren't understood (the question came again): no_date_ctx, only at
   the second-date moments ("No me interesa el fútbol" at the hobbies stays not understood). (c) The learner's personal
   questions weren't understood: ask_personal answers them with the date's own facts, once each ("¡Ja, ya te dije!"
   after): "¿De dónde eres? / ¿Eres de aquí?" "¡De aquí! Nací en Puerto Colibrí."; "¿Cuánto tiempo llevas aquí?" "¡Toda
   la vida! Nací aquí."; "¿Dónde vives?" "Aquí cerca, a unas cuadras del malecón." or "¡Aquí a la vuelta!" (as the walk
   home says); "¿Tienes mascotas?" the cat Luna (qf_cats_yes), "¿Tienes perro?" "No, pero tengo una gata que se llama
   Luna."; "¿Cuántos años tienes?" "Tengo treinta y un años."; "¿Tienes hermanos?" "Sí, una hermana menor."; "¿Tienes
   hijos?" "No, todavía no."; "¿Tu familia vive aquí?" "Sí, mis papás viven aquí cerca." (the parents of the Saturday
   twist); "¿Te gusta vivir aquí?" "¡Me encanta! Tenemos el mar y los cenotes."; "¿Qué vas a comer? / ¿Qué me recomiendas
   de comer? / ¿Cuál es tu comida favorita?" "¡El pescado a la talla! Aquí es buenísimo." (s69's tip); "¿Tienes hambre?"
   "¡Un poquito! …". "Soy de Canadá / Soy irlandesa" gets "¡Ah, mira! A lo mejor algún día me enseñas tu país." (and the
   date's own answer when asked back). (d) "No, gracias" to "¿Pedimos algo de tomar?" got "Bueno, ¿qué quieres tomar?":
   now no drink (no_alcohol_ok). (e) The check: "Entonces yo dejo la propina" (accepts the treat: "¡Trato hecho!"; before
   any offer the date offers), "¿Dejamos propina? / ¿Está incluida?" ("Aquí se deja como el diez o quince por ciento."),
   "¿Aceptan tarjeta?" ("Sí, aquí aceptan tarjeta."), "¿Quién paga? / ¿Cómo le hacemos?" (the date offers to treat),
   "Como quieras / Tú decides", a bare "¿Segura?", "Te doy la mitad", "Pago con tarjeta" weren't understood; a side
   question at "Yo invito, ¿eh?" now keeps the offer open (it was followed by "¿cómo hacemos con la cuenta?"). (f) "¿A
   qué hora?" agreed the day and was never answered: "La hora la vemos después." (g) "Cuando quieras" to "¿Cuándo tienes
   tiempo?" got the same question again: the date names a weekday not turned down ("¿Qué tal el viernes?"). (h) "¿Pasado
   mañana?" was ignored: "¡Perfecto, pasado mañana me queda bien!". (i) "Un jugo de naranja", "Un agua de coco" weren't
   understood (two drinks added). (j) "Yo pago" after the learner had paid got "¡Muy tarde, ya está pagada!": "¡Ay,
   gracias!".
8. **Hints:** right and in register; a check_offer example added, "Entonces yo dejo la propina." (the note: 10–15% is
   usual in Mexico).
9. **Accepted answers:** corpus +58 (283/283 understood, 0/33 false accepts; traps for every new intent: "No dejo
   propina", "No pago con tarjeta", "No me interesa el fútbol", "No soy de aquí"); held-out +10 written before testing,
   blind 45/46 (the miss, "¿Se deja propina aquí?", now takes "aquí" around the tip question: 46/46, 0/4); NLU tests
   +26 (148); four sims (17, all 12/12).
10. **Neutral text:** the three twins (padre, no manches ×2) right; the new lines use no Mexican-only word.

**Voices (for the line list):** changed spoken lines: open_late[1], qf_beach_yes; values: amount_total ($900),
amount_half ($900 / $450); new lines (both dates): tip_usual, cards_ok, time_by_text, own_from, own_always, live_blocks,
live_corner, pets_dog, own_age, own_siblings, own_kids, own_family, like_here, own_food, hungry, from_react,
day_works_after; a new coach example: ck_tip. Every line id is said by both dates.

**For the lead (shared files, proposals):** (1) the engine never starts a new piece at a verb after a negative piece, so
"No te preocupes. ¿Tienes perro?" / "No pasa nada. ¿Eres de aquí?" aren't understood while "Tranquila. ¿Tienes perro?"
is (lang.ts/nlu.ts: fixed negative phrases like "no te preocupes", "no pasa nada", "no hay problema" could end a piece).
(2) lines-es.ts: in a conversation whose partner is the learner's choice (s84), voice every line in both partners'
voices instead of the ones heard (the sims cover it here). **Owner:** the bill ($900 for two) and the dates' own facts
(born in Puerto Colibrí, 31, a younger sister, parents nearby, the cat Luna) are new.

## Spain twins (11 Nov 2026)

- 48 Spain twins (lines and hints), 21 items in tests/es/spain/s84-date.json (all understood, 0 false accepts).
- Register: no change. The date says tú both ways in every variety; one person, so no vosotros.
- Words: aparcar, ¿Pagamos a medias?, cada uno, jersey, padres (for mis papás), calles (for cuadras), me viene bien
  (for me queda bien), háblame de ti, qué detalle / majo, maja (for qué lindo), ¡Qué bien! (for ¡Qué bueno!), menos mal,
  ¡Pues claro! (for ¡Obvio!), ¿vale? at the end of a request, ¡De nada! (for ¡Con gusto!), me alegro mucho, me lo he
  pasado muy bien / genial (for la pasé), más o menos un diez por ciento (for como el diez).
- Compliments: "te ves muy bien" becomes "estás muy guapo / guapa" in the partner's lines (the learner's gender) and
  "¡Estás genial!" in the learner's hints (a hint can't follow the partner's gender).
- Spain's present perfect for what just happened: he llegado, ya has llegado, ha llegado, te lo he dicho, no hemos
  pedido, no nos han traído / han traído la cuenta, he ido, me ha encantado conocerte.
- Grammar: me viene bien wherever me queda bien is read, para mí lo mismo, ¿cuánto ha sido?, jersey in @jacket,
  ¿vienes mucho por aquí?. Merges for the new units.

## Spain review (12 Nov 2026)

- Checked (fresh reviewer): every twin against its Mexican line (meaning, facts, prices, names), Peninsular wording, the perfect for today's events, tú/usted and vosotros by STYLE.md, glosses, spelling and ¿¡, the Spain transcripts (`--variety=spain --verbose`, untwinned lines read through their neutral fallback) and tests/es/spain.
- Found: nothing to change (perfect for tonight, aparcar, a medias, jersey, majo/maja, ¿qué día te viene bien? all right; the 10–15 % tip stays, it is Mexico's custom).
- Fixed: nothing.
