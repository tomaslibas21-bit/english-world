# Review: s69-local "¿Qué me recomienda?" (writer's commit b325086f)

The draft is good: all 7 steps, 39 intents and both twists of the English original are here, the Spanish is natural
Mexican Spanish for an older woman (usted, mijo/mija), the glosses I checked (about 40 of ~120 lines) are right, and
the twins (qué padre, ándele, sitio) are few. The fixes are mostly replies that didn't answer the question.
## Gate and blind set
| | Writer (b325086f) | After the review |
|---|---|---|
| tsc / check-content | clean / 0 errors 0 warnings, 81 NLU, 9 sims 12/12, fuzz 80 | clean / 0 errors 0 warnings, 101 NLU, 11 sims 12/12, fuzz 80 |
| corpus (coverage) | 257/257 (100%), 0/50 false accepts | 304/304 (100%), 0/60 false accepts (57 review probes added) |
| blind set (39 items, 7 traps; written before I read the draft) | **34/39 = 87.2%**, 0 traps accepted | 38/39 = 97.4%, 0 traps accepted |
| vitest | 257/257 | 257/257 |
A probe written after reading the draft: 37/53 (70%) before, 52/53 after, 0 false accepts. The blind miss left,
"¿No es muy caro?", parses as `not_far #price`, which gives the price answer, so it works.
## Fixes (file: 74 lines added, 35 removed)
- **meaning-safety, must-fix (~12 lines).** "¿Está lejos?" got "**Sí**, está a cinco minutos" (walk_close, walk_malecon,
  walk_ruinas): now the distance without "Sí". "¿Cuánto cuesta?" got "**No**, es barato" (price_cheap, price_taqueria,
  price_cocina, price_cafe): the "No" is gone. "¿A qué hora abre?" (El Muelle, café, Trattoria) got "Creo que sí, todos
  los días": now "Abre todos los días, desde temprano, creo"; the boat trip uses its morning line. "¿Es muy caro?" (a
  question) was the complaint `too_expensive` ("¿Algo más barato? Claro."): the handler now answers the price when the
  sentence has "?" and no "barato/económico/dinero/para mí" (new sim).
- **understanding, must-fix for the common phrases (~30 pattern lines).** "Muchas/Mil gracias por los consejos / por
  todo", "Muy amable"; "Tengo mucha hambre, ¿a dónde voy?", "¿Y para cenar?"; "No me gustaría / Prefiero no ir a la
  playa", "Ya conozco el cenote", "Ya fui a las ruinas" (now sight_neg: another tip); "¿No es peligroso de noche?",
  "¿Es peligrosa la playa de noche?"; plurals ("¿Las ruinas están lejos?", "¿Están abiertos los puestos?"), "¿Es caro
  El Muelle?", "¿Cuánto se paga?", "¿No hay que reservar?"; "No quiero molestarla" (the walk offer), "Lo que sea, no soy
  exigente", "No soy de aquí, ¿qué me recomienda?", "No soy de Estados Unidos, soy de Canadá"; "Ya comí tacos" (no taco tip).
- **facts / names, must-fix (~6 lines).** In s72, Café La Ceiba is on the zócalo, under the ceiba tree. The draft had it "a la vuelta", and the directions to it went past "the bank". Both now say it's on the square.
- **new lines, polish (2).** The learner asks "¿Cuánto cuesta el colectivo / el taxi?" right after being told to take one. These lines give no fare: "No es caro. Le paga al chofer al bajarse, en efectivo." / "El taxi cuesta más. Pregunte el precio antes de subirse."
- **spanish, polish (2).** "cuénteles a sus amigos de Puerto Colibrí" can be read as "your friends from Puerto Colibrí". It is now "hábleles de Puerto Colibrí a sus amigos". price_muelle no longer repeats "es un poquito caro" from the tip just before.
- **gloss-english.** No errors found in the ~40 lines checked. The new lines follow S-WORD/S-LEX. The "dé vuelta" merge is removed because nothing uses it now.
- **numbers, twins, structure.** These are fine: prices in round pesos ($45 coffee = s72, $80 museum = s70 brief), 3 twins, steps, intents and twists match the English.
- **tests (+20 NLU, +2 sims, +57 corpus items).** They cover every fix above, including 8 traps with `not:`.

## For the lead / the owner
- The English original has the same two reply bugs ("Is it far?" → "Yes, it's only five minutes"; "How much?" → "No, it's cheap!") in src/content/situations/s69-local.ts walk_close / price_cheap. Not touched.
- The "¿Es muy caro?" fix relies on the "?" in the typed text. If voice input drops it, the sentence is read as the complaint (cheaper tip), which is harmless.
- Global grammar gap (// NEEDS for global.ts): "muchas gracias por todo" isn't g_thanks (only "[muchas] gracias" or "gracias por todo" alone). I covered it here in thanks_tip.
- The writer's open questions still stand: fixture prices (El Muelle ~$300, comida corrida ~$100, Trattoria ~$200),
  music Fridays at seven, the museum's hours, and mijo/mija. I added no new numbers.

## Revision 2 Nov 2026: La Cocina de Lucía (the Trattoria is gone)

The owner's choice (s73, 2 Nov): the restaurant at the Trattoria's place is **La Cocina de Lucía**, a sit-down Yucatecan
restaurant. The place id stays `trattoria` (the code and the world use it); its name, forms and lines change.
- **The place.** Forms: "La Cocina de Lucía", "el restaurante de Lucía", "Lucía", "el restaurante yucateco". Where it is
  agrees with s62 and TOWN.md: avenida Juárez, one block from the square, the red awning (dir_trattoria). A bit
  pricier than the cocina económica (said once, in rec_trattoria; price_trattoria keeps "como doscientos pesos").
  rec_trattoria: two variants (poc chuc; sopa de lima). "¿Ya fue a La Cocina de Lucía?" for the tried-tip twist.
  "¿Hay un restaurante yucateco?" gets Lucía's (a restaurant), "comida yucateca" still the cocina económica.
- **Italian.** There is no Italian place in town: `no_italian` (two variants: "¡Ay, mijo, aquí no hay restaurante
  italiano! Pero la comida de aquí le va a encantar:") once, then Lucía's, or the cocina económica when the learner
  wants it cheap ("¿Hay un restaurante italiano barato?"). The hint "¿Hay un buen lugar de comida italiana…?" no longer
  offers Italian. Not wanting Italian or vegetarian food no longer rules out Lucía's (`placeOf`).
- **Vegetarian.** Papadzules at Lucía's (rec_trattoria_veg: egg in pumpkin-seed sauce, no meat). Vegans ("vegano", "no
  como carne ni huevo") and vegetarians on a budget get the cocina económica, with no dish named ("Dígales que no come
  carne [ni huevo]: ahí le preparan algo"). Once the learner is vegetarian, every later tip for Lucía's or the cocina
  uses the meatless line, and "too expensive" never sends them to the taquería.
- **A fix on the way:** "Somos veganos. ¿Dónde podemos comer?" said "Entonces, mire:" with no tip after it (a second
  food question in one turn); ask_food now stays quiet when the turn already has a tip.
- **Tests:** +51 corpus items (11 traps), +19 NLU tests (6 meaning-safety), +7 sims (Italian, cheap Italian,
  vegetarian, vegans, vegetarian too pricey, cheap then no meat, the tried-tip twist at Lucía's). Gate: tsc clean;
  check-content 0 errors 0 warnings, 120/120 NLU, 18 sims 12/12, fuzz 80; corpus 351/351 (100%), 0/64 false
  accepts; blind set 38/39 (97.4%), 0 traps accepted (unchanged; the miss is the known "¿No es muy caro?").
- **Sources** (read 2 Nov 2026): Wikipedia "Papadzules" (https://en.wikipedia.org/wiki/Papadzules: corn tortillas,
  hard-boiled egg, pumpkin-seed sauce, no meat); "Poc chuc" (https://en.wikipedia.org/wiki/Poc_Chuc: grilled pork in a
  citrus marinade, a Yucatán signature dish); "Sopa de lima" (https://en.wikipedia.org/wiki/Sopa_de_lima: chicken and
  lime, from Yucatán, so never in a vegetarian tip). Whether the cocina económica cooks without meat is not sourced and
  stays vague ("ahí le preparan algo"). The menu is s73's brief; s73 isn't written yet, so its writer should keep
  poc chuc, sopa de lima and papadzules on Lucía's menu and its "no reservations" (book_trattoria) or tell s69.
