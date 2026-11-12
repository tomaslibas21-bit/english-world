# Review: s64b-security (Oficial Torres, airport security), writer's commit 9cc3cb31

| Check | Before (writer) | After (review) |
|---|---|---|
| tsc / check-content | clean; 74/74 NLU, 9 sims 12/12, fuzz 80, 0/0 | clean; 95/95 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage.ts) | 218/218, 0/52 false accepts | 233/233 (15 probe items added), 0/52 |
| blind set (38 items, 10 traps, written first) | 36/38 = 94.7%: 1 not understood, **1 flip** ("No la tire, por favor, me la tomo" → throw + drink: the bottle was thrown away) | 38/38, 0 traps |

About 50 of the 996 lines changed and 85 were added: ~45 must-fix, ~40 polish, ~50 tests and sims.

## meaning-safety (must-fix, ~30 lines)
1. **"No la/lo + verb" is read as "No," + the verb.** "la"/"lo" are `correctionStarters` (for "No, la grande"), so "No la tire, me la tomo", "No la tiro, me la tomo" and "No la vacío, tírela" ran the refused choice first and recorded it (toss_ok / empty_ok). Fixed here: whole-sentence patterns for refusal-plus-choice, and a `negated()` guard in the bottle handlers and the bottle_keep pending, so a refused choice never acts. **Engine gap, NEEDS at the top of the file:** any conversation with "No lo/la + verb" has this flip.
2. **"No traigo cinturón pero sí reloj"** at "¿Trae cinturón o reloj?" ran both pieces: shoes off *and* "Eso también". A "nothing" piece next to "pero sí …" now declines (`butYes`), so only the item acts (pockets, check_pockets, belt_watch).
3. **bottle_keep: a bare "No"** after "Agua no; la botella sí, vacía" threw the bottle away. It now gives the options again. Its first fix exposed a second bug: a held turn left the step on bag_q, and the next "Sí, es mía" restarted the whole bag check. `affirm` now skips a step that is already done, and the pending re-expects itself.
4. **"¿Los zapatos también?" during the shoes twist** got "Aquí no hace falta quitarse los zapatos" right after "Quíteselos". It now gets "Sí, los zapatos también, por favor."
5. "No, mejor me la tomo" / "No, mejor la vacío" were refusals (bottle_neg); "mejor" makes them the choice now. "No, la vacío" (no comma) stays a safe refusal (rule 10).

## rule 11 / facts (must-fix, ~8 lines)
- "¿Puedo dejarme el cinturón?" → "El cinturón, sí." (it sounded like yes). It now says "Quíteselo y póngalo con lo demás".
- "¿Mi licencia sirve?" → "Sí, está bien". A foreign driver's license isn't flight ID, so it now says "Su pasaporte, por favor".
- "¿Hay algún problema?" at "¿Esta maleta es suya?" → "No, ningún problema" (he was about to search it); it now says "Solo necesito revisarla un momento."
- "¿Con lentes?" at the camera got "Sí, un momentito" (= take them off); the pattern is now "sin lentes" only.
- Gate directions made vague ("por allá, pasando las tiendas") until s64c-gate fixes the layout (rule 14).

## understanding (polish, ~20 pattern lines)
"¿Qué tengo que sacar?" (new `ask_what_out`), "¿Saco el celular?", "¿El celular va en la charola?", "¿Tengo que sacar el bloqueador?", "¿Hay bolsas?", "Un momento, lo estoy buscando", "Ya casi", "¿Tengo que quitármelos?", "No, la mía es la negra", "No, la negra no es mía", "¿Por dónde está la sala 12?", "Se me olvidó sacar las llaves", "No, la laptop no la traigo", "Tírela, no hay problema", "Ah, sí, es agua", "Ok, otra vez" (was global repeat), "No me la tomo, tírela". An item named at the walk step gets "Deje eso en la charola" instead of "Bien."

## spanish / twins (polish, ~8 lines)
- Pockets: one word for one thing (rule 9). He said "las bolsas" once and "los bolsillos" three times, and "bolsa" is already the clear liquids bag and the learner's bag. All his lines now say bolsillos; "bolsas" is still understood. That leaves one Mexican-only line fewer.
- "Los zapatos puede dejárselos puestos" → "Puede dejarse los zapatos puestos" (the same for the glasses). "Cada envase, de 100…" → "En envases de 100 mililitros o menos."
- New lines: shoes_yes, bag_just_check, item_tray (with its charola twin), tablet_no_stay, what_out. The flags were checked against their units.

## tests
21 NLU tests (the blind traps plus the probe flips) and 4 sims that check the recorded state: watch-but-no-belt, the shoes question during the twist, drink-not-throw (`bottleChoice: "drink_ok"`) and the bare no followed by "No la tire, la vacío" (`empty_ok`). bottleDone now records `bottleChoice`.

## For the lead / owner
- The engine gap in meaning-safety 1 (lang.ts `correctionStarters` with a clitic + verb) should be fixed globally.
- The writer's open questions on facts still stand (whether shoes come off, free bags, laptops out where CT scanners are in use). The lines stay general.

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md, the brief, the review above, the
cross-cutting leads (AUDIT/cross, AUDIT/neutral), s64a/s64c for the shared airport facts, the situation, corpus and
held-out files, the transcripts (seeds 3 and 7, every sim), and ~120 probe turns (tools/probe.ts) through every step and
pending question, the bottle choices played end to end with the recorded state (rule 22).

| Check | Before | After |
|---|---|---|
| check-content | 0/0; 95 NLU, 13 sims 12/12, fuzz 80 | 0/0; 108 NLU, 17 sims 12/12, fuzz 80 |
| corpus | 233/233, 0/52 false accepts | 319/319, 0/57 (+91 items, 45 with `not` or `any`) |
| held-out | 38/38, 0/3 | 38/38, 0/3 |

Found 21, fixed 21 (by point: 1:3 4:3 7:14 10:1; nothing on 2, 3, 5, 6, 8, 9).

**1. Natural Spanish (3).** "Sus cosas salen del otro lado" was said once the learner was through (the finish, "¿Me da
mi maleta?"), when they already stand on that side: now "Sus cosas salen por allá" ("del otro lado" stays for the bag
asked about before walking through). The shoes question repeated its whole line after every answer ("Pueden ser los
zapatos. Quíteselos…"): a refusal or a side question now gets the reason and a short reminder, "Quíteselos, por
favor" (new line `shoes_remind`). The collect step said "Todo lo demás está bien" again after every side question:
the second time he hands the bag over.

**4. Facts (3).** The greeting variant "Buenas tardes" for the 8:10 a.m. flight (s64a and s64c say "Buenos días"): now
"Buenos días", both texts. The hint "¿Dónde está la sala 8?": the learner's gate is sala 4 (s64a, s64c, TOWN.md): now
4 (said "cuatro"; neutral "puerta 4"), the test and the sim too. A driver's license handed over counted as the ID
while "¿Mi licencia sirve?" gets "Su pasaporte, por favor": a license (or "credencial") without the passport now
counts as the boarding pass only, and he asks for the passport (`licShown`).

**7. Questions and offers left without an answer (14).**
- **"Listo" / "Ya me lo quité" at an alarm question** ran the walk step's yes: the alarm was passed (walked) and
  "¿Trae cinturón o reloj?" stayed open for good, a loop. At the pockets, check-pockets and belt questions it now
  means "I took it out": "Muy bien, pase otra vez" (`emptied`); ack_done and g_ok never run the walk step during the
  alarm.
- **"¿Por qué?" / "¿Para qué?" / "¿Qué pasó?"** got "No, ningún problema" everywhere but the bag. Now by moment
  (ask_what, `#why`): the camera "Solo para comparar con su foto"; the alarm "Nada grave. Solo vamos a revisar"; the
  shoes "A veces los zapatos tienen metal"; the bottle "Los líquidos de más de 100 mililitros no pueden pasar"; why
  elsewhere "Es por seguridad". Also understood: "¿Qué pasa?", "¿Qué sonó?", "¿Por qué no puede pasar?".
- **"¿Qué hago?" / "¿Es aquí?"** gave "Párese en las huellas y levante los brazos" at the documents, the bottle and
  the goodbye. The scanner's instructions now come only at the walk step; "¿Es aquí?" before the documents gets
  "Es aquí"; at the tray "La laptop, los líquidos y…"; elsewhere the open question is asked again.
- **"¿Es aquí la fila para seguridad?"** was split into where_stand + is_this_line (the scanner line again): one
  pattern.
- **His offer echoed**, "Puede tomársela, vaciarla o dejármela": "Tomármela.", "Vaciarla.", "Dejársela.", "Se la
  dejo.", "Quiero/Prefiero vaciarla", "Tírenla" weren't understood (the offer probe only reads noun lists). Added, with
  the refusals guarded ("No quiero dejársela", "No se la dejo" → bottle_neg; `NEG_CHOICE` reads "no quiero
  tirarla/dejársela/vaciarla/tomármela"; bottle_neg expected at the first reaction too).
- "No traigo ni cinturón ni reloj", "Ni uno ni otro", "Los dos", "Ambos" at "¿Trae cinturón o reloj?" (`both_ctx`).
- "¿Es necesario?", "¿De verdad?", "¿En serio?" at the shoes → "Lo siento, es necesario para pasar" (`must_ctx`).
- "No lo encuentro" (the boarding pass) → "Sin prisa".
- "¿Dónde la puedo llenar?", "¿Dónde compro agua?" after the bottle → "Más adelante venden agua" (new, vague on
  purpose: no claim about fountains).
- At the tray: "¿Tengo que sacar el celular / las llaves?", "¿Tengo que sacar todo de la mochila?", "¿Puedo usar dos
  charolas?", "¿Mi perfume?", "billetera", "cargador".
- After: "¿Ya puedo salir?", "¿Me puedo poner los zapatos?", "¿Dónde me siento?" (not while the shoes are off and the
  arch is still to pass).
- "¿Y si me la tomo / la vacío / la tiro?" (a suggestion here, nothing paid), "¿Dónde la vacío?".
- "Ay, perdón." at the bottle was read as "¿Perdón?" (say that again): now an apology (forgot).
- Whole sentences: "Sí, esa maleta es mía", "Esa mochila no es mía" at the bag question; "No llevo", "No llevo
  nada" at the pockets and the belt.

**10. Neutral (1).** phone_where's twin kept "cartera", a handbag in much of South America: "billetera".

Checked and left: tú/usted (usted throughout, hints too), the name (Oficial Torres, no clash), glosses and flags
(every flag on its unit), spelling and ¿¡, the twins (15, all the Mexican-only words twinned; the new lines need
none), no templated values (only {m:listo|f:lista}). "Vacíela ahí y la botella es suya" is a little odd (it was
always hers/his) but not wrong: kept. "¿Va todo en la charola?" reads as "Va, todo en la charola" (done) once the "¿"
is gone: kept (rule 10, nothing binding).

New lines (voiced in both sets, none needs a twin): rules_why, camera_why, alarm_what, shoes_why, water_ahead,
shoes_remind. Changed: greet_docs[2] (both texts), bags_end_belt, phone_where's twin, hint gate_dir (both texts).

For the lead: the Spanish offer probe misses verb-list offers ("Puede tomársela, vaciarla o dejármela"); global
g_meaning doesn't take "¿Qué es (una) charola?" (only "¿Qué significa…?"); "billetera" for the neutral wallet in
s91a/s91b too.

## Spain twins (11 Nov 2026)

- 44 Spain twins (lines and hints), 19 items in tests/es/spain/s64b-security.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Oficial Torres keeps usted.
- Words: el portátil for la laptop (masculine: sáquelo, póngalo), gafas for lentes, móvil, cartera for billetera, documentación for identificación, (lo) lleva for trae, coja for tome, póngase en las huellas for párese, aseos/delante, fuera for afuera, banco for banca, cola for fila, Vale / Ya está for Está bien / Listo, the perfect (ha detectado algo, ha pitado, ya los he revisado, se me ha olvidado).
- Grammar: no (tengo | traigo | llevo) throughout; is_this_line takes ¿Es esta la cola para el control (de seguridad)?; ack_done takes ya lo he puesto todo; forgot takes se me ha olvidado; ask_restroom takes aseos/servicios. Merge: se me ha olvidado.
- Nothing left for the lead.

## Spain review (12 Nov 2026)

Fresh reviewer (Madrid ear). Checked every Spain twin against the Mexican line and STYLE.md "Spain Spanish": register, vosotros/os agreement, the perfect, Spain's words, glosses, Mexican-only names, spelling, and the Spain corpus.

- Read every twin: usted kept throughout, Spain's words right (billete, tarjeta de embarque, móvil, gafas, portátil, aseos, maleta, facturar, coger, aparcamiento, coche, jersey), the perfect for what just happened, "Ya está" for "Listo", Mexican-only names kept. Meaning, glosses and spelling: no problems found. No changes.
