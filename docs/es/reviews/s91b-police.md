# Review: s91b-police ("Quiero levantar una denuncia"), writer's commit dc8dfebf

| Check | Writer | After review |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content | 121/121 NLU, 12 sims 12/12, fuzz 80, 0/0 | 138/138 NLU, 14 sims 12/12, fuzz 80, 0/0 |
| corpus | 345/345, 0/28 false accepts | 361/361 (+16 review items), 0/28 |
| blind set (45 items, written before reading) | 40/43 = 93%, traps 0/2, all 13 `not` traps safe | 43/43 = 100%, 0/2 |

The blind misses were "No sé, a lo mejor se me cayó", "Un señor se me acercó y me empujó, y luego ya no la tenía" and "Todavía no he llamado al banco". The after score isn't blind. The probes (tools/probe.ts, 30 whole conversations) found more than the blind set did.

## Fixes (158 lines changed or added, 52 removed; about 70 must-fix, 25 polish, 60 tests)

**meaning-safety: must-fix (~30 lines)**
- "No, solo una pregunta" at "¿Algo más?" read "una" as a price and set the cash to $1, overwriting $1,000. Fixed in three ways: one_question_ctx takes it (rule 21), contents/no_cash are ignored once the report is done, and a count under 10 pesos with no "pesos" isn't cash. That last rule also fixes "Tenía dos tarjetas" (it recorded $2 cash).
- "Sí, en el hotel" at "¿Trae alguna identificación?" moved the theft to the hotel. where_when now records a place or time only at the report's early steps, and "en el hotel" at the ID question is no ID (no_id_ctx).
- "Es de cuero café" at the where step recorded the café as the place. A bare café next to a description is now the color.
- "Mi pasaporte no, lo dejé en el hotel" got both "Perfecto, gracias" and "Claro, no se preocupe". It is now one no_id pattern, and when both are heard in one turn the no wins.
- "No falta el dinero" (the hint "No, falta el dinero" said aloud) always counted as missing (rule 10). Without a typed comma he now asks "Perdón, ¿falta algo o está todo?". The hint is now "Falta el dinero."
- "Creo que se me cayó" after "Me robaron…" stayed stolen. It now records lost unless a push or grab is also said.
**understanding (~25 lines)**
- "No sé" at a step now gets help and the next question; before, he said "Ya veo." and then nothing.
- Added: "No sé si me la robaron o la perdí", two actions in one sentence, "No estaba en X, estaba en Y", "No tenía tarjetas, solo efectivo", purse and backpack contents (ropa, lentes, computadora, cámara, celular; a stolen phone in the bag asks for another number), "No, no tengo otro", "¿Puedo verla?", "Las tarjetas sí, pero el dinero no", "¿Y si no firmo?", "Un momento, lo voy a leer", "¿Es gratis el reporte?", "¿Por qué no puedo levantarla aquí?", "¿Puedo ir mañana?".
- At "¿Algo más?", the follow-ups about the Ministerio Público ("¿Dónde queda?") also open after the copy_mp line or a question about it. The pending question is rebuilt at each re-ask.
**spanish / facts / structure (~20 lines)**
- A copy asked for mid-report was handed over before the report existed. Now he says "Claro, al terminar el reporte le doy una copia" and gives it with the folio (rule 13).
- "Le anoto la dirección en su copia" when no copy had been given → "Le anoto la dirección." "Con el folio puede…" before the folio → "con él".
- "¿A qué hora cierran?" got "Mejor hoy mismo" (rule 11). It now gets "No sé el horario exacto. Mejor vaya hoy mismo." (hours kept vague, rule 14).
- After "Está bien" alone he said "De nada"; now only a thanks gets it. "Voy para allá, gracias" now closes the conversation.
- Police station: "on the zócalo" → "across from the zócalo next to the museum" (s62's directions).
- A second "¿Qué le robaron?" gets a short reminder instead of repeating the line (rule 8).
**gloss-english (~4 lines):** "a black small wallet" → the echo is now color + material, or color alone. Three flags pointed past the line or at the wrong unit (copy_mp 13→12, mp_send 15→14, ask_phone_other 6→5: rule 15).
**tests:** 17 NLU tests, 2 sims (the lost comma at check_all; out-of-turn answers plus an early copy), 16 corpus items. Two corpus items were updated to the safer behavior: "No sé" → dont_remember; "No traía efectivo, solo mis tarjetas" → contents with the cash dropped, which a sim checks.
**Kept:** the structure matches the English original: the same steps and intents, both twists, and the added "ministerio" twist from the brief. Usted is consistent. The one Mexican-only word, pluma, has a twin. The remaining glosses I checked were right.

## For the lead / owner
- The writer's open questions stand: whether the report is free ("El reporte es gratis"), the patrol line, and how Mexicans read the folio 4471 aloud. The folio is said digit by digit; pairs ("cuarenta y cuatro, setenta y uno") may be more natural. The owner could pick one.
- A phone number said out of turn at an early step ("984 123 4567" at "¿Dónde pasó?") still parses as cash or a time. This is unlikely, so I left it.

## Lead's check (2 Nov 2026)
Checked: cash amounts read and said back (counts, bills, bounds, dollars, amounts with no recording), times and street or
route numbers, phone numbers (pairs, digit by digit, +1), the name and its spelling, the fee answers, every binding
outcome played whole with probe.ts (the turned-in wallet, everything there or missing, the signature, the ID, the bank, the
phone), the reviewer's open points, every flag's unit. 30 new edge and trap sentences: 7/24 understood and 4/6 traps
accepted before, 24/24 and 0/6 after; about 60 lines changed, 190 added (fixes, 19 NLU tests, 4 sims).

**Must-fix (all fixed):**
1. **Counts recorded as cash.** "Traía 500 pesos y dos tarjetas" recorded $2 (the count overwrote the $500); "Mil pesos
   en efectivo y tres tarjetas" $3; "12 tarjetas de regalo" $12. A number right before a thing is a count now.
   "Dos billetes de quinientos" is $1,000 (was $500).
2. **He said back a number nobody said.** The echo took the nearest recorded amount: "quince pesos" → "Unos $10",
   "cuarenta y cinco" → "$40", "85.50" → "$90", "8,800" → "$9,000", "Menos de cien pesos" → "Unos $100". He now says an
   amount back only when it has a recording and isn't a bound (else "Bien, ya lo anoté"), and not the pesos alone when
   dollars were said too. "Como cinco" at "¿Cuánto efectivo?" got "Bien, ya lo anoté" and then the same question again;
   the $5 is taken now.
3. **A stray number at an early step.** "En el camión 25" at "¿Dónde pasó?" recorded $25 cash, so the contents question was
   never asked; "En la calle 12" recorded twelve o'clock, so "¿A qué hora?" was skipped. Street and route numbers are
   neither now, and a lone number with no money word before the contents question isn't cash (this also covers the
   reviewer's phone number at "¿Dónde pasó?": no cash; its digits can still read as a time).
4. **Negated contents written down.** "Traía mis tarjetas pero no el pasaporte", "Tarjetas y dinero, pero no mi
   pasaporte", "El pasaporte no estaba, solo dinero", "Solo dinero, el pasaporte lo dejé en el hotel" recorded the
   passport and said "avise también a su consulado". Patterns with the passport as `{neg:ci}` plus a guard in the
   handler (no / ni / sin before a thing, "X no estaba", "X lo dejé…", a final "X no").
5. **The turned-in wallet refused.** "Sí, la mía es negra" about the black wallet he holds kept it and went on with the
   report. A description that matches the wallet turned in (with no "no") is a yes now (and asks "¿Está seguro?" when
   it contradicts the learner's own earlier color).
6. **Everything there or missing.** "No, todo está bien" (typed) made it partial ("Lo siento…"); "Está todo menos los
   trescientos pesos" made it complete ("¡Qué suerte tuvo!"). Rule 10: "No está todo" / "No todo está bien" said aloud
   gets "Perdón, ¿falta algo o está todo?", with a typed comma it's all there; "menos" / "falta" never completes;
   "Solo faltan doscientos pesos", "Falta el dinero, todo lo demás está" are understood.
7. **Bare answers outside their question (rules 2, 12).** "No, no tengo otra" at "¿Trae alguna otra identificación?"
   recorded no phone (the phone question was skipped) and asked the ID question again; "Se me olvidó en el hotel" there
   got "Llame al banco…"; "Ya lo hice" at the signature or the end was the bank; "Sí, seguro" at the signature or after
   "¿Está seguro?" was "it was stolen". New `_ctx` intents: bank_called_ctx / bank_not_yet_ctx (bank question),
   no_phone_ctx (phone), the bare seguro / probablemente in sure_ctx (stolen_q, found); "No tengo otra / ninguna" is no
   ID; "Ya lo hice" signs at the signature.
8. **A purse's wallet as "it's mine".** "Mi celular, mi cartera y una toalla" read "mi cartera" as its_mine; "Mi celular
   estaba en la bolsa" recorded no phone. A wallet is now a content (wallet_in), and the phone said that way goes on the
   list (the phone question then asks for another number).

**Polish:** "¿Cuánto cuesta la denuncia?" and any cost question once the Ministerio Público has come up get the new
"Ni el reporte ni la denuncia cuestan nada" (a denuncia is free in Mexico; was "El reporte es gratis" only). "No sé" gets
"Revise bien, por favor" at "¿Es suya?" and at the check, "Aquí abajo, en la línea" at the signature (not a signature),
and no number at the phone (it went on to the end only when nothing else was left). The check asked again is "Perdón,
¿falta algo o está todo?", not the hand-over again; "No, nada" there gets it too. Understood now: "El del hotel es el
984…", "No me lo sé de memoria", "¿Tengo que firmar?" / "No firmo nada sin leerlo" (sign_need), "Tal vez" / "Puede ser" at
"¿Cree que se la robaron?", "Se parece a la mía", "¿Y si no aparece?". 8 corpus items accept the new `_ctx` intents.

**Open points:** the writer's three stand (the report free, now also the denuncia line; the patrol line; folio 4471 digit
by digit): owner's call. Not changed: "Veinte dólares y quinientos pesos" records only the pesos (no echo); an unparsed
answer with "creo" in it can get the engine's sound check "Perdón, ¿correo?" (engine-level, only after a miss).

**Gate after:** tsc clean; check-content 157/157 NLU, 18 sims 12/12, fuzz 80, 0/0; corpus 361/361, 0/28; held-out 43/43,
0/2; lead's set 24/24, 0/6; vitest 288/288.
