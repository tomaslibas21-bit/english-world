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

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md's rules, the brief, the review above,
the cross file and the neutral digest (AUDIT/cross, AUDIT/neutral), TOWN.md ("Getting around"), s91a as landed (8b8571ab)
and the English original on main. Transcripts read in full at seeds 3 and 7, the neutral text through the same sims
(compose's variety set to neutral), about 60 whole conversations played with tools/probe.ts, and the Spanish offer
probe in both texts (1 REAL before, 0 after).

**Found 28, fixed 28** (by point: 1: 2 · 2: 0 · 3: 0 · 4: 2 · 5: 0 · 6: 0 · 7: 20 · 8: 1 · 9: 0 · 10: 3).

1. **Natural Spanish.** "¿Lo traía en una cartera, una bolsa o una mochila?" (asked when the learner names what was
   inside first) said "lo" for every thing: "Me robaron mis tarjetas" → "¿Lo traía…?". Now it agrees: "¿Y lo / la traía…?"
   (ask_what_in), "¿Y los / las traía…?" (ask_what_in_pl, `{lo@X:pl}`) and "¿Y todo eso lo traía…?" for several
   (ask_what_in_all). "Quiero hacer un reporte" got "Lo siento mucho. Claro. ¿Qué perdió…?": the sympathy now waits until
   something bad is said (once).
2. tú/usted: usted throughout, in the lines, hints and tips. Nothing found.
3. Names: Oficial Reyes only; the finder is "una señora". Nothing found.
4. **Facts.** The intro and the header put the station "across from the zócalo next to the museum" (s62's old map): it is
   on the zócalo next to the church (TOWN.md; s91a's "al otro lado de la plaza, junto a la iglesia"). **Mexican
   procedure:** after a loss, "¿Esto es una denuncia? / ¿Necesito una denuncia para el seguro?" sent the learner to file a
   denuncia at the Ministerio Público; a loss has no denuncia. Now (q_denuncia_lost): "Por una pérdida no hay denuncia.
   Si le piden algo más, es la constancia de extravío del Ministerio Público." Checked and kept: "levantar un reporte /
   una denuncia", the police report with a folio, the denuncia at the Ministerio Público (free, with an official ID:
   "Ni el reporte ni la denuncia cuestan nada", "Una identificación y el número de folio del reporte"), "¿Trae alguna
   identificación?", the consulate for a passport, the bank for cards, "si aparece, le avisamos".
5. Glosses and English: the new lines' glosses and flags checked against their units (check-content); nothing else found.
6. Spelling, accents, ¿¡: nothing found (the cross file's dictionary pass agrees).
7. **Questions and answers** (20):
   - the offer probe's REAL: "Falta algo." / "Sí, falta algo." at the check weren't understood. Now "¿Qué le falta?"
     (missing_what) and a bare thing answers it ("El dinero.", "Los trescientos pesos.", missing_what_ctx); a bare thing
     said first gets "Perdón, ¿falta algo o está todo?"; a bare "No." asks "¿Qué le falta?" instead of filing it blind;
     "Nada." is all there; "No sé" after "¿Qué le falta?" goes on the report as missing;
   - no number to call ("No tengo teléfono / número mexicano" → "Usted nos puede llamar, o venir a preguntar") was
     followed by "Si aparece, le avisamos / le llamamos": now "Si aparece, aquí se la / lo guardamos." (will_keep), also
     for "¿Qué hago ahora?" and "¿Me van a llamar?";
   - "¿Qué hago ahora?" after the wallet came back without the money said "Si alguien la entrega, le llamamos" (it had
     been turned in): now "Si sabemos algo, le avisamos"; after it came back complete, "No hace falta: usted ya tiene su
     cartera" (also for the folio, as no report was written);
   - "No sé" at "¿Qué le robaron?", "¿Ya llamó a su banco?" and "¿Trae alguna otra identificación?" got "No se preocupe."
     and silence: now the question again ("¿Y qué era? ¿Una cartera, una bolsa…?"), the bank advice, "Claro, no se
     preocupe" (no ID);
   - "¿Hay cámaras en el mercado?" was read as a camera in the wallet + the market ("De acuerdo."): now "Vamos a revisar
     si hay cámaras en la zona.";
   - not understood before, answered now: the folio again ("¿Cuál es el número de folio?", "¿Me repite el número?";
     mid-report "Al terminar, le doy su número de folio."), "¿Habla inglés?" ("Solo un poquito. Pero no se preocupe, le
     hablo despacio."), "¿Dónde la encontraron? / ¿Quién la trajo?" ("Una señora. Dice que la encontró en la calle.", the
     question stays open), "No quiero ir al Ministerio Público / ¿Es obligatorio?" ("No es obligatorio. Pero si su seguro
     se la pide, sí la va a necesitar."), the constancia de extravío (a loss: "La constancia de extravío se pide en el
     Ministerio Público. Está aquí cerca."; a theft: "Por un robo, lo que necesita es la denuncia del Ministerio
     Público."), "¿Necesito ir al Ministerio Público?", "¿Me van a llamar?", "¿Cuánto tarda el reporte?" ("Unos minutos,
     nada más."), "¿A qué número les llamo?" ("Le anoto el teléfono de aquí."), "¿Tengo que regresar? / ¿Cuándo vuelvo?",
     "¿Ya me puedo ir?".
8. **Hints:** the describe hints were not s91a's (a red wallet; the black leather one second, untwinned). They are now
   s91a's, word for word: "Es una cartera negra de piel." (neutral "Es una billetera negra de piel."), "Es café y
   chiquita.", "Es negra y tiene una foto de mis hijos." (the black leather wallet of the found/handback pictures; the
   photo is a describe feature now). Contents hints already match s91a's (cards, license, about $500).
9. Tests: corpus +49 (389 → 438 items; understood 361 → 408/408; traps (items with `not`) 87 → 119; none/any 0/30);
   the two "No … ir al Ministerio Público" items are now mp_optional. Held-out +13 written blind before the fixes (44/56
   before, 56/56 after; one blind item's intent id corrected to ["missing_what", "missing_some"]). NLU tests 157 → 181,
   sims 18 → 29 (each new line's every pronoun form is reached by a sim: lo/la/los/las, la/lo for the items).
10. **Neutral text.** "folio" (Mexican, the lead's decision) had no twin: case_number ("Su número de reporte es el 4471.",
    say and write too), mp_send2, mp_bring_ans, and the new folio_later now have one. "cartera" in what_again,
    ask_what_in and the describe hint: twins with "billetera" (as s64b, s91a). The entity lines (describe_echo, found,
    closing…) say the wallet through the entity: `attrs.neutral` "billetera" on wallet and wallet_in, "licencia de
    conducir" on the license (Mexican "licencia de manejo", as s71a's twin; merge registered): these need the shared
    target.ts fix (FOLLOWUPS s32) before the neutral set is voiced. "bolsa" kept, as s91a.

**Voices** (one speaker, Oficial Reyes): changed ask_what_in (now "¿Y {lo@X} traía…"); new ask_what_in_pl, ask_what_in_all,
folio_later, no_report_needed ({X}: the 4 items), will_keep ({lo@X}: lo/la), found_who ({lo@X}), missing_what,
english_ans, report_quick, cams_ans, our_number, q_denuncia_lost, constancia_ans, constancia_robo, mp_optional_ans; new
neutral twins on what_again, ask_what_in(_pl, _all), case_number, folio_later, mp_send2, mp_bring_ans; hints: the three
describe hints above (+ one neutral twin), "Es café, de piel y chica." and "Es chica y roja." gone. No values added; no
attrs.plural items (the plural contents use attrs.pl and `{lo@X:pl}`).

**Left for the lead / owner:** the target.ts attrs.neutral fix (above); target.ts LETTER_SAY says Spain's names (V "uve",
Y "ye") in both texts when the spell hint reads a surname (s76's proposal; neutral would want "ve corta"); the found and
handback pictures always show a black wallet while the line says the learner's color; TOWN.md could note "the
Ministerio Público: 'aquí cerca', not placed (s91b)"; the owner's open points above stand (the patrol line; the folio
read digit by digit). EN-FIXES-LEADS: the same no-number "we'll call you" and the missing "Something's missing".

## Spain twins (11 Nov 2026)

- 57 Spain twins (lines and hints), 22 items in tests/es/spain/s91b-police.json (all understood, 0 false accepts).
- Register: no change. Oficial Reyes and the learner keep usted (the police, STYLE.md).
- Spain's present perfect for what happened today: ¿Qué ha pasado?, ¿Qué le han robado?, ¿Qué ha perdido?, ¿Ha
  llamado ya a su banco?, Dice que lo ha encontrado, Usted ha dicho…, ¡Qué suerte ha tenido!; the learner's Me han
  robado…, Alguien me ha robado…, He perdido…, Se me ha perdido…, Creo que ha sido un robo, se me ha caído, Cuando he
  ido a pagar…, Alguien se ha chocado conmigo, Ya he llamado, Ha sido usted muy amable.
- Words: Usted dirá (¿Qué se le ofrece?), llevar (traer) for what one carries, dentro (adentro), documento de
  identidad (identificación, in the officer's question), relleno el reporte, Solo unos minutos, poner una denuncia
  (levantar), por internet (en línea), No hay de qué, sobre las once, unos $500, ¿Me deja un bolígrafo?, Ya está.
- Entities: Spain nouns cartera (wallet; neutral billetera), móvil, bolso (m), marrón, pequeño, carné de conducir,
  gafas de sol (f), portátil (m).
- Kept: Mexico's institutions and their words, which the conversation is built on: el reporte (the police report)
  against la denuncia and la constancia de extravío at the Ministerio Público; the 911; the colectivo. Spain would say
  "parte" or "denuncia" for the police's paper, but the reporte/denuncia contrast is the point of the scene (for the
  lead). The bench keeps banca (banco = the bank in the same list).
- Grammar: stolen_yes/no, happened (he ido a pagar), whenp (sobre / hacia + time), bank_called, have_id (llevo,
  carné de conducir, DNI, documento de identidad), no_id_ctx (me lo han robado todo), pen (me deja, boli),
  found_who_ctx (han encontrado). Merges added.

## Spain review (12 Nov 2026)

- Checked (fresh reviewer): every twin against its Mexican line (meaning, facts, prices, names), Peninsular wording, the perfect for today's events, tú/usted and vosotros by STYLE.md, glosses, spelling and ¿¡, the Spain transcripts (`--variety=spain --verbose`, untwinned lines read through their neutral fallback) and tests/es/spain.
- Found: two hint twins had lost their amount ("y unos | | en efectivo", "Unos | ."): $500 missing from the Spain text.
- Fixed: "Mis tarjetas, el carné de conducir y unos $500 en efectivo." and "Unos $500.". Kept as the writer chose: el reporte vs la denuncia (the scene's point), el 911, la banca (bench; banco is the bank in the same list).
