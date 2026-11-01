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
