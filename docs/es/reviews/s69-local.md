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

## Review of the revision (2 Nov 2026, writer's commit a0e4a716)

| Check | Writer's commit | After the review |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content | 120/120 NLU, 18 sims 12/12, fuzz 80, 0/0 | 128/128 NLU, 18 sims 12/12, fuzz 80, 0/0 |
| corpus | 351/351, 0/64 false accepts | 364/364, 0/64 false accepts (+13 items) |
| blind, batch-1 part (39) | 38/39 | 38/39 (the known "¿No es muy caro?") |
| blind, new part (20, written before reading the revision; 6 traps) | 15/20, 0 traps accepted | 20/20, 0 traps accepted |

Two of the five new misses were my labels ("Soy vegetariano" is the draft's `diet` intent, read correctly); I added
`diet` to those two items after scoring. Counted that way the writer's new-part score is 17/20.

**Meaning safety (must-fix, ~25 lines):**
- "Somos vegetarianos y buscamos algo barato, ¿hay pizza?" (diet + budget + ask_food in one turn) sent the learner to
  Lucía's ($200), then said "¿Algo más barato? Claro." with no tip after it. Now `readTurn` reads the whole utterance
  (meatless, cheap, Italian) before the one tip of the turn: "no hay italiano" + the cheap meatless cocina line;
  `budget` and `too_expensive` stay quiet once the turn has its tip. "Busco algo barato. Soy vegetariano." no longer
  gives the taquería; "Somos veganos, ¿algo no muy caro?" lost a stray "Ah, ¡está bien!" after the tip.
- `setVeg` marked as vegan anyone whose sentence held "vegan" or "huevo": "No soy vegana, pero no como carne" and
  "Soy vegetariano, pero sí como huevo" would have lost the papadzules. Now only a positive vegan / "ni huevo".
- "Soy vegetariana, ¿hay comida italiana?" never answered the Italian question (rule 11): now no_italian first.
- "Pizza no, mejor algo de aquí" and "No quiero comida italiana" never trigger "aquí no hay italiano".
**Understanding (~10 lines):** "¿Dónde puedo probar el poc chuc?" went to the cocina económica ("la cochinita es
buenísima") although Carmen herself names poc chuc at Lucía's: poc chuc, papadzules, sopa de lima, tikin xic now go to
Lucía's (cheap or vegan: the cocina). New patterns: "Ah, pero no como carne", "No soy vegana, pero no como carne",
"Soy vegetariano, pero sí como huevo", "No soy vegetariana, como de todo", "¿Y no hay pizza?", "¿Y otro lugar para
comer?" (was ask_sight), "Sí, ya fui, me encantó el poc chuc" (tried twist), the form "lo de Lucía".
**Spanish (polish, 9 lines):** the three meatless lines started with "Entonces," which doubled after "Entonces, mire:"
and hung after no_italian's colon; now "Vaya a … y pida …", and `diet` says "Ah, ¡está bien!" first. Flags moved.
**Facts (polish, 2 lines):** checked against the listed sources. Wikipedia says citrus marinade (not sour orange) for
poc chuc and names no lime variety for sopa de lima (chicken "or some other meat"): both flags made vaguer.
Papadzules hold. Lucía's place (Juárez, one block from the zócalo, red awning) agrees with s62's geography.
**Tests:** +8 NLU tests (3 meaning-safety), +13 corpus items (2 traps), +20 blind items.

**For the lead / owner:** unchanged from the writer: Lucía's ~$200 and "no aceptan reservaciones" wait for s73.
Not fixed (old part): at the food_kind step "No, eso es todo, gracias" is read as a no and she asks again what
food they'd like; the step has no way out but an answer.

## Audit (5 Nov 2026)

A fresh reviewer (N/AUDIT-BRIEF.md), both texts. Read: STYLE.md, AUTHORING-ES.md's rules, the brief, the reviews
above, the cross-cutting file (with its "Town directions (5 Nov)") and the neutral side-by-side, TOWN.md "Getting
around (from the 3D town)" (checked against layout.ts: her bench at x 18, z −23.2, facing avenida Juárez), and the
facts other audits settled (s62, s66, s67b, s72, s73, s88). Transcripts of seeds 3 and 7 read in full; five probe
scenarios (side questions, refusals, full-sentence answers, the ways, traps).

| | Before | After |
|---|---|---|
| tsc / check-content | clean / 0 errors 0 warnings, 128/128 NLU, 18 sims 12/12, fuzz 80 | clean / 0 errors 0 warnings, 143/143 NLU, 20 sims 12/12, fuzz 80 |
| corpus | 364/364, 0/64 false accepts | 399/399, 0/71 false accepts (+42 items) |
| held-out | 58/59, 0/1 (the known "¿No es muy caro?") | 58/59, 0/1 (unchanged) |

**Found and fixed, by point** (31):
- **1. Natural Spanish (1).** open_cocina "Nada más a mediodía" (Spain's form) → "al mediodía", as her other lines say.
- **4. Facts (15).** The ways now follow the 3D town (the cross file's eleven lines and two more):
  Café La Ceiba "aquí en la plaza, bajo la ceiba grande" → a block west on avenida Juárez, across from Información
  Turística (rec_cafe, dir_cafe; "¿Está lejos?" now walk_close, not walk_here); walk_close "a cinco minutos" → "a dos
  minutos" (the café, Lucía's, the taquería and the cocina are 1–1½ blocks away); the museum "cruzando la plaza" →
  across calle Ceiba (rec_museo, walk_museo, also_museo's English); the malecón "a diez minutos, bajando hacia el mar" /
  "Baje por la calle principal hasta el mar" → right behind her bench, across avenida del Puerto (walk_malecon,
  dir_malecon, which now names the beach too); El Muelle and the boat trips get their own way (new dir_muelle: across
  del Puerto, left to the pier); the ruins "Siga la calle principal hasta el final" → down to the beach and left to its
  end, on the rocks (dir_ruinas); the cocina económica "a dos cuadras" → across the avenue, around the corner from the
  bank (dir_cocina: where TOWN.md puts it, so s88's "de la esquina" agrees); the taquería "a dos cuadras por esa calle"
  → by the mercado, along del Puerto past the museum (dir_mercado); "El sitio está ahí en la esquina" → taxis pass along
  the avenue (the sitio is by the airport; the line's neutral twin went with the sitio); the public beach "al final del
  malecón" + "por el faro" (rec_playa, cheaper_beach), since the ruins' "hasta el final" now points the other way. And
  La Cocina de Lucía "No aceptan reservaciones" contradicted s73 (the host asks "¿Tiene reservación?", walk-ins wait):
  book_trattoria → "Mejor sí, sobre todo en la noche: se llena." No "calle principal" is left. Checked and kept: the
  taquería by the mercado; colectivos with no timetable, paid to the driver on getting off; the cenote twenty minutes
  by colectivo; the ruins half an hour on foot; the museum $80, students less, 10 to 5, closed Mondays; coffee $45;
  comida corrida $100; El Muelle ~$300; Lucía's ~$200 (s73's mains $160–290); the Friday music at eight; night safety.
- **5. Glosses (2).** rec_muelle glossed "a la talla" as "grilled Maya-style" with an achiote flag (that's tikin xic):
  now "split and grilled", the flag "a whole fish split open, rubbed with a red chili paste and grilled over coals".
  cheaper_beach split "¡No | cuesta" against S-NEG and flagged "cuesta": now "¡No cuesta | nada!", the flag on "nada!".
- **7. Questions without an answer (13).** "¿Dónde tomo el colectivo?" / "¿Cómo me voy en colectivo?" got "Sí, pasan…"
  (new bus_where: "Aquí enfrente, en la avenida Juárez: nada más levante la mano."); "¿Puedo ir en taxi?" / "¿Cómo me
  voy en taxi?" got the colectivo line and "¿Dónde tomo un taxi?" / "¿Hay un sitio de taxis?" weren't understood (new
  taxi_where); "¿Dónde está el mercado?", "¿Dónde hay un cajero?" (after "Lleve efectivo"), "Necesito sacar dinero",
  the church, the police, Correos, Información Turística, the pharmacy and the hotel weren't understood, and "¿Está
  lejos la farmacia?" got the last tip's distance (new intent ask_place: the way from her bench, TOWN.md "From the
  zócalo's kiosco"; farther places: "Mejor pregunte en Información Turística…: ahí le dan un mapa"); "¿Cómo se llama
  usted?" (new her_name: "¡Carmen, para servirle!"); after a tip, "¿Qué es un cenote?" and "¿Dónde queda El Muelle?" got
  "¡Claro que sí! Le va a encantar." (now the meaning, through g_meaning, and the way), "¿Qué tal / Cómo es…?" got "¡Claro
  que sí!" (new like_it: "¡Le va a encantar, ya verá!"), and asking about an earlier tip by name repeated the whole tip;
  "No, gracias" / "No, eso es todo, gracias" at "¿Qué se le antoja?" brought the same question back (s31's lesson): now
  "Entonces, mire:" and her pick; El Muelle "muy caro" got the cochinita tacos, now the taquería's fish tacos (her own
  line); "¿Dónde hay un lugar bonito para ver el atardecer?" wasn't understood (now the malecón).
- Nothing found under 2 (usted throughout, the hints too; tú accepted with the tip), 3 (no name clashes), 6 (spelling,
  ¿¡), 8 (hints; their templated values read right with every entity), 10 (the twins qué padre / ándele are right; no
  new line has a Mexican-only word).

**For the voices** (both accents; no value placeholders): 15 spoken lines changed (rec_cafe, dir_cafe, walk_close,
rec_museo, walk_museo, walk_malecon, dir_malecon, dir_ruinas, dir_cocina, dir_mercado, no_walk_taxi, book_trattoria,
rec_playa, cheaper_beach, open_cocina) and 13 new (dir_muelle, taxi_where, bus_where, where_banco, where_correos,
where_iglesia, where_policia, where_mercado, where_turismo, where_west, where_other, her_name, like_it); no_walk_taxi's
neutral twin is gone (no "sitio" left).

**Tests:** +15 NLU (5 meaning-safety), +2 sims (side questions; seafood too pricey and the ways), corpus +42 (7 traps,
4 "not" guards).

**Left for the lead / owner:** "¿Hay un baño por aquí?" is still not understood (off the topic; no restroom fact in
TOWN.md). For TOWN.md "Facts the conversations share": La Cocina de Lucía takes reservations and walk-ins may wait in
the evening (s73, s69); taxis are hailed on avenida Juárez, the sitio is by the airport (s66, s69). "¿Qué es un
cenote?" after the tip uses the global g_meaning, as the pending global change ("¿Qué es X?" in g_meaning) would.
