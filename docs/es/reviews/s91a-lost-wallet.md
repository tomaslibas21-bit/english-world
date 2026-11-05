# Review: s91a-lost-wallet ("¿Me puede ayudar?", Doña Mari at the tianguis), writer commit 505135d1

## Gate and blind set
| | Writer (505135d1) | After review |
|---|---|---|
| tsc / check-content | clean; 106/106 NLU, 11 sims 12/12, fuzz 80, 0/0 | clean; 123/123 NLU, 14 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus (coverage) | 198/198 (100%), 0/36 false accepts | 206/206 (100%), 0/39 (11 review items added) |
| blind set (41 items, 4 safety traps + 3 `not:` traps) | 31/41 (76%) with my intent names; 39/41 (95%) once the draft's `_ctx` twins count (when_ctx, describe_ctx, police_*_ctx, its_mine_ctx); 0 traps accepted | 41/41 (100%), 0 traps (not blind any more for me) |

The two blind misses were "Bueno, voy a regresar al café a preguntar" and "Las tarjetas sí, pero el dinero no". The probes (rule 22) found the real problems.

## Fixes (102 lines added, 27 changed or removed in the conversation; about 55 must-fix, 25 polish, 40 tests and sims)
**meaning-safety (must-fix, ~30 lines)**
- "No sé, ¿está todo?" at "¿Está todo adentro?" was read as some_missing, so the wallet was recorded as partly emptied and the learner was sent to the police. It's now unsure_all_ctx ("Revise con calma").
- "No falta el dinero" (commas are lost, rule 10) recorded the money as gone. A single "no" now gets "Perdón, ¿sí le falta algo?" (pending `missing_really`: "Sí, el dinero" → missing; "No, está todo" / "No falta el dinero" again → all there). "No, no falta el dinero" is all there.
- "La mía es negra" at "¿Es suya?", with no "no", recorded found = "no" (the boy's wallet vanished). It may be a yes, so she says "Fíjese bien. ¿Es suya?". "No, la mía es negra" stays a no.
- "La policía está junto al banco, ¿verdad?" got "Ah, muy bien" (wrong place confirmed). A place other than the museum now gets "No, está junto al museo, aquí enfrente."
- "Es una emergencia" was in call911, so she answered "No, el 911 es solo para emergencias" (it contradicted the learner). Removed.

**understanding (must-fix, ~12 lines)**: "Ay, espere… ya la encontré, estaba en mi mochila" (at the pockets question); "A lo mejor la dejé en mi casa"; "voy a regresar al café a preguntar" ("al" + place + "a preguntar"); "Las tarjetas sí, pero el dinero no" (and the reverse); "¿Puedo verla?" (the "ver[la | lo]" pattern never matched "verla"); "¿Está abierta los sábados?".

**spanish / rule 11 / rule 8 (must-fix 4, polish 4; ~20 lines)**
- "¿Qué hago con mis tarjetas?" got "Sí, yo de una vez llamaría…". The line no longer starts with "Sí".
- "¿Cuánto cuestan las rosas?" got "Están baratas, ahorita le digo" (no price, never told). It's now "El ramo está en $150" (a market bunch; within STYLE ranges). "Me da unas rosas" also hears the price instead of only "¡Claro que sí!" (rule 3).
- Left at home: "Primero regrese y pregunte. Si no aparece, vaya a la policía." came right before "Y si no aparece, vaya a la Policía Municipal." The first line is gone.
- "No sé" then "No me acuerdo" at "¿Dónde la vio…?" repeated "Piense un momento…". The second time she now goes on without a place.
- Polish: "junto al museo" in two lines in a row ("Nada más cruce la calle y ahí está"); "A ver, cálmese" + "A ver, vamos a pensar" → "¡Ay, no! Cálmese."; "Ándele" after "Ya busqué por todos lados" → "Ah, bueno." / "Está bien."; no "maybe it's still in the same place" when no place is known.

**gloss-english**: I read every line (about a third closely): the units, flags (indices checked), American English and the six Mexican twins are right. New lines are glossed the same way. No merges needed.
**numbers / twins / facts**: The police is next to the museum, across from the zócalo, as in s62. 911 is for emergencies only (kept vague). Six Mexican-only words, each with its twin (fine). Opening hours and English at the police stay vague, as the writer chose; I agree.
**structure**: The same id, steps, intents and found_it twist as the English. The writer's additions (#amb asks, short reminders, the 4th-ask directions) are good.
**tests**: 17 NLU tests (flips, rule-19 "¿Usted la encontró?" ≠ "la encontré", "No la encontré"), 3 sims (comma-less "No falta el dinero"; a color then a yes; the police "junto al banco"), 11 corpus items, and the blind set `tests/es/heldout/s91a-lost-wallet.json`.

## For the lead
- The writer's // NEEDS stands: g_dontknow lacks "No me acuerdo" / "No recuerdo".
- "No, está todo" at "¿Está todo adentro?" (first ask) still reads as "No está todo" (missing). That's the likelier voice reading; the contradictory comma reading is rare.
- $150 for a bunch of flowers is my estimate of a market price.

## Audit (5 Nov 2026)

A fresh reviewer's pass (AUDIT-BRIEF.md): both texts; the transcripts of seeds 3 and 7 read in full; about 90 probed
turns (`tools/probe.ts`); the cross file (with its "Town directions (5 Nov)") and the neutral digest; TOWN.md "Getting
around" (her stall in the tianguis' north-west row, the police at the square's east end next to the church, the sitio
at the east end of avenida Juárez, the colectivos waved down on the avenue, the tianguis on Saturdays 7 to 2); s62,
s64b, s69 and s91b for the shared facts; the English original on main.

**Found 30, fixed 30** (by point):

1. **Natural Spanish (1).** Only what's inside, said after a description ("Adentro hay dos tarjetas…"), got the old
   echo again ("Entonces, una mochila azul…"): now "Muy bien. Si la veo, le aviso."
2. **tú/usted (0).** Doña Mari is usted everywhere, warm with mijo/mija; the hints say usted to her (tú is understood,
   with the tip).
3. **Names (0).** Doña Mari agrees with the cast. Her new answer to "¿Cómo se llama usted?" is "Mari, mijo, para
   servirle." (not "María": s88's coworker is María, the cross file's mild near-clash).
4. **Facts and the town (7).** The police was "ahí enfrente, junto al museo" (s62's old map); in the 3D town it's
   across the square from her stall, next to the church, a minute on foot, no street to cross (the cross file's table):
   `directions` "Está ahí, al otro lado de la plaza, junto a la iglesia.", `directions2` "¿Ve la iglesia? La policía
   está al lado." / "Nada más cruce la plaza y ahí está.", `far` "…cruzando la plaza. Un minuto a pie." (and its twin),
   `police_correct` "No, está junto a la iglesia, al otro lado de la plaza."; `police_known` takes the church (or the
   kiosco, or the square) as right and corrects the museum, the bank and the rest; the header comment. `call_bus` sent
   the learner to "la parada de los colectivos", which the town doesn't have (they pass along the avenue and are waved
   down: s62, s69): "Entonces pregúnteles a los choferes de los colectivos. Pasan por la avenida cada rato."
5. **Glosses and English (1).** The place hints said "At the taxi.", "I was at the colectivo.", "This morning, at the
   taxi.": they are for places only now (a ride gets "Tomé un taxi."). Every new line's units, flags and American
   English checked.
6. **Spelling, ¿¡ (0).**
7. **Questions and offers (14).** "¿No ha visto una cartera negra?" got no answer ("¡Ay, Dios! No se preocupe."), and
   "Ándele." when asked again: new `not_seen` "No, mijo, no he visto nada." first (and its color is the description).
   "¿Cuánto cuestan las rosas?" after the loss got "Muy bien." / "Ándele." (now the price, $150; a compliment is
   thanked). After the way to the police was given early, the advice still asked "¿Sabe dónde está?" (now only if the
   way wasn't given). "¿Y las llaves también?" came with "¿Dónde la vio…?" in the same turn, so "Sí" got "¿Ah, sí?
   ¿Dónde fue eso?" (the keys question now waits for its yes or no). "¿Seguro? Parece que busca algo." had no answer for
   "Sí, estoy seguro" or "Solo estoy viendo las flores" (new pending: `if_need` "Bueno. Si necesita algo, aquí estoy.";
   a no gets "¿Qué le pasó?"). "¿Compró algo hoy en la mañana?": "Sí, compré pan" and "No, nada" weren't understood
   (`bought_ctx` → "¿Ah, sí? ¿Dónde fue eso?"; `nothing_ctx` = no). The wallet back without its money ended with
   "¡Suerte! Ojalá la encuentre." (now "¡Mucha suerte, mijo!", `luck`). No answer for "¿Dónde está el sitio (de
   taxis)?" (`where_sitio`: the end of avenida Juárez, by the airport), "¿Dónde paran los colectivos?"
   (`where_colectivos`), "¿Dónde está la iglesia?" after "¿Ve la iglesia?" (`where_church`: at the far end of the
   square, facing the kiosco, as s62), "Si la encuentra, ¿me avisa?" (`eye_yes` "¡Claro que sí! Aquí estoy hasta las
   dos.", the tianguis' hours), "¿Me ayuda a buscarla?" (`cant_leave`), "¿Le dejo mi número?" (`number_police`: leave it
   at the police, as s91b takes it), "¿Usted vio a alguien?" (`not_seen`), "¿Cómo se llama usted?" (`her_name`), "¿Qué
   hago si no la encuentro?" / "¿Y si me la robaron?" (`what_do`; asked again: the short "Por algo perdido…"; stolen:
   "Entonces de todos modos vaya a la policía."). A right guess ("¿Junto a la iglesia?", "¿La iglesia?") got "Ah, muy
   bien." (now `police_yes` "Sí, ahí, junto a la iglesia.").
8. **Hints (0).** Natural, usted, and accepted by the grammar (the NLU tests have every hint).
9. **Accepted answers (6).** The intro's own moment: "Aquí, cuando fui a pagar los mangos", "En el puesto de mangos,
   cuando iba a pagar" (now the tianguis and the fruit stand); what's inside ("Adentro hay dos tarjetas y unos
   quinientos pesos", "Tenía mis tarjetas, mi licencia y como mil pesos", "…tiene mi celular y mi pasaporte"; a `thing`
   macro, plurals and amounts); "Está todo menos el dinero", "Falta mi pasaporte"; "¿Está retirado?", "¿A cuántas
   cuadras?"; "¿Me puede marcar la policía en el mapa?"; "La policía está junto a la iglesia, ¿no?".
10. **The neutral text (2).** The wallet's neutral noun is "billetera" (as s64b; "cartera" is a handbag in much of South
    America): `attrs.neutral` on the wallet for the coming target.ts fix, and a twin for the describe hint "Es una
    billetera negra de piel."; the hint notes no longer say only "cartera". No new line has a Mexican-only word.

**Tests.** NLU 123 → 151, sims 14 → 20 (all 12/12: the mangoes and "¿No ha visto…?", the museum corrected, "¿Seguro?"
and the bread, contents with her eye and the number, the keys, the church and her name, everything but the money and
the roses), corpus 206 → 252 understood (0/39 → 0/43 false accepts, +4 traps: "No compré pan", "No fui a pagar los
mangos", "No le dejo mi número", "No estoy seguro"), held-out 41 → 51 (+10 written before testing, all understood, 0/4).

**Voices.** Changed: `directions`, `directions2` (both), `far` (+ twin), `police_correct`, `call_bus`; new: `not_seen`,
`eye_yes`, `cant_leave`, `number_police`, `where_church`, `where_sitio`, `where_colectivos`, `police_yes`, `if_need`,
`her_name`, `luck` (good_luck's own text); the describe hint's neutral twin. One speaker; no plural items; the only
value is the roses' $150 (a module constant).

**For the lead.**
- target.ts (FOLLOWUPS, s32): with `attrs.neutral` read, the neutral text says "billetera" in every {X} line and hint;
  the wallet's chip ("cartera") and the topic "Cartera perdida" have no neutral form.
- s91b (its reviewer): the intro and header still put the police "across from the zócalo next to the museum".
- English (EN-FIXES-LEADS): "Have you seen a black wallet?" is never answered; "How much are the roses?" after the loss
  gets "Okay."; the twist with the money gone ends "I hope you find it."
