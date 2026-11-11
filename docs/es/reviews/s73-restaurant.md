# Review: s73-restaurant (La Cocina de Lucía), writer's commit ab03afe1

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 100/100 NLU, 7 sims 12/12, fuzz 80, 0/0 | 112/112 NLU, 9 sims 12/12, fuzz 80, 0/0 |
| corpus `coverage.ts` | 236/236 (100%), 0/21 false accepts | 236/236 (100%), 0/21 |
| blind set (`tests/es/heldout`, 45 items, written before reading) | 37/40 = **92.5%**, 0/5 traps | 40/40 = 100%, 0/5 (not blind any more) |
| `vitest` | 288/288 | 288/288 |

Blind misses: "No, gracias, mejor regresamos otro día", "Disculpe, yo pedí el poc chuc, no esto", "No, gracias, ya estoy lleno". Understanding was good. The binding outcomes were not: probe.ts found 12 must-fixes, almost all about money.

## Fixes (src file: 31 lines changed, 124 added; ~95 must-fix, ~25 polish, ~25 tests)
**meaning-safety: must-fix (~70 lines)**
1. Cash was never counted. "Aquí tiene cien pesos" on a $270 check paid it and gave change. Now a short amount gets "Perdón, son $270; faltan $170" and the amounts add up (rule 18); an exact amount gets "Gracias, está completo".
2. "¿Es mucho el quince?" got "Sí, es lo normal" (rule 11). Now it gets "No, está bien…". "Está bien el diez por ciento" without a "?" was held as a question and now counts as the tip.
3. "¿Cuánto se deja (de propina)?" / "¿Hay que dejar propina?" got "No, la propina no está incluida…". Now they get the 10–15% range (tag #how).
4. "Póngale mil pesos" on a $270 check was charged at once. Now Luis checks once: "¿$1,000 de propina? ¿Está seguro?"
5. "¿Cuánto es?" at the soup offer quoted the cochinita ($220). Now it quotes the soup ($110); at the to-go box it gets "No cuesta nada" (rule 17).
6. "¿La horchata lleva leche?" ordered a horchata. Now it's a question ("Déjeme preguntar en la cocina"), never "Gracias por avisarme".
7. "¿Cuánto cuesta el flan?" at dessert answered $220, because the dish went to an order segment; it now answers $75. ask_price/ask_desc/ask_allergy were added to the drinks and dessert expects.
8. **Conversation ended at the drinks question.** "No quiero cerveza, una limonada natural" (a correction or change) added the drink, but drinksDone stayed unset, so every step was done and Luis said "¡Gracias por venir!". This is fixed with drinksSettled().
9. Corrections right after "Ahorita paso su orden" ("No la cochinita, el poc chuc") got "Sin problema" and the cochinita still came. They now count until the food is served, and the side question follows.
10. "¿Esta es la cochinita?" / "Yo pedí la cochinita" with the cochinita on the table sent it back to the kitchen. Now Luis answers "Sí, es la cochinita pibil. ¡Provecho!"
11. "Sí, para dos" at "¿Tiene reservación?" recorded 2 o'clock (rule 4). It is now a party of two.
12. "No quiero pagar con tarjeta" wasn't understood. It now means cash, with nothing charged until the money is handed over (rule 18).

**understanding (~8 lines):** "[mejor] regresamos otro día"; "[ya] estoy lleno"; "Yo pedí X, no esto"; "Cien pesos" as a tip; "No quiero X, (mejor) Y" as a correction; "¿Cuánto se deja normalmente?".

**spanish (~15 lines):**
- Must-fix: "No, no es vegetariano" for la sopa / la cochinita / la arrachera now uses {vegetariano@X}. "Ahorita lo llevo a la cocina" for la arrachera now uses {lo@X}. "Ahorita se lo traigo" for several drinks or the caballeros pobres now uses drinks_ack_pl "se los traigo" (with a twin) and {lo@X}.
- Polish: "Todavía no" after "Cuando quiera la cuenta…" repeated the same line, and now gets "Sin prisa". The soup offer repeated its price right after "Son $110", and now uses a short "¿Le traigo una sopa para empezar?". "Sin problema. No hay problema." in one turn is now said once.

**twins / facts / structure:** no changes. The new Mexican-only line (drinks_ack_pl, ahorita) has its twin. Steps, intents and twists match the English s73 plus the brief's factura twist.
**tests (~25 lines):** 12 NLU traps; 2 sims ("the soup's price, then cash in two parts", "tip questions and an amount in pesos"), both 12/12.

## For the lead / the owner
- The writer's NEEDS stand: the global goodbye says "¡Que tenga buen día!" at dinner, and s69-local still says "Trattoria Lucía".
- Doneness words are feminine (roja, bien cocida) to agree with la arrachera; many Mexican waiters use the masculine (término rojo). Both are accepted.
- The writer's other unsure points are kept as they were: estimated prices, the vague factura line, "No está fría" → #amb asks again. "No, gracias" at "¿Se le ofrece algo más?" brings the check, as in the English edition. A dairy or egg question gets only "Déjeme preguntar en la cocina" (no follow-up), so the facts stay vague.

## Lead's check (2 Nov 2026)
Checked: prices and totals said and read (the total at any time, quantities, kinds), cash counted against the check
(short, exact, handed before the check, the rest, keep the change), the tip (percent, pesos, bare numbers, the big-tip
check, how-much questions), a reservation's party and time, the factura, and every paid or binding outcome played whole
with probe.ts (a dish said twice, quantities, changes and corrections up to the dessert, the other way of paying). 30 new
edge and trap sentences: 9/29 understood and 0/1 traps accepted before, 29/29 and 0/1 after; about 70 lines changed and
290 added (fixes, 22 NLU tests, 6 sims).

**Must-fix (all fixed):**
1. **The big-tip check had no yes, and its "No" paid no tip.** At "¿$1,000 de propina? ¿Está seguro?", "Sí, estoy
   seguro" wasn't understood and "No." charged a 0 tip and ended the dinner. It's a pending question now (tip_big): a yes
   or "Sí, estoy seguro" charges it, "No" gets "Ah, perdón. ¿Cuánto le pongo, entonces?", another amount is the tip.
2. **Short cash still paid.** After "Perdón, son $235; faltan $35" the next turn paid anyway: "Gracias" and "¿Me da mi
   cambio?" with change, "Quédese con el cambio" / "Esto es para usted" with a tip; "Aquí tiene cien, quédese con el
   cambio" on $235 recorded the tip too. Short now gets "Todavía faltan $35" until the rest comes (rule 18).
3. **"Aquí tiene trescientos, quédese con el cambio" gave the change back** and lost the tip (the hand-over paid first).
   The money and the tip are one payment now.
4. **Cash handed before the check was dropped.** "Aquí tiene cien pesos" at "¿Algo más?" later paid a $235 check with
   change. It's counted when the check comes ("Son $235 en total. Faltan $135.").
5. **"¿Cuánto es todo?" during the meal got the last dish's price** ($190 on a $235 bill): now the total so far, at any
   time. "¿Cuánto cuestan dos cervezas?" got "¿Cuál?" (now $110); a kind not chosen yet gets its price when every kind
   costs the same.
6. **The same dish said again was billed twice.** "Sí, la cochinita, gracias" after "Ahorita paso su orden" ($440),
   "Sí, una cerveza" after "¡Enseguida!", and "La arrachera término medio" at "¿En qué término…?" (two steaks, and the
   término asked again for the first). A dish named again is that dish; "otra", "una más", "también", "para mi esposa"
   or, at a table of two or more, a plain repeat without "Sí" orders another; "Dos cochinitas" makes it two in all.
7. **"Que sean dos" after "Dos cervezas" billed three**, and "Perdón, solo una" wasn't understood. Now two, and qty_ctx
   sets the count while the order can still change.
8. **"No, mejor X" removed X instead of ordering it.** "No, mejor el poc chuc" after "Ahorita paso su orden" (and "No,
   mejor una limonada" after "¡Enseguida!") was a reject: the cochinita (the beer) stayed on the bill. It's a change now.
   Understood too: "Ya no quiero la cerveza", "Cámbieme la cochinita por el poc chuc", "En vez de la cochinita, el poc
   chuc" (the swap reads which one comes after "en vez de"), "Quiero el poc chuc en lugar de la cochinita" (without a
   stray "eso no lo tenemos").
9. **Dessert-time orders were lost.** "No, gracias, solo un café" at the dessert or "¿Algo más?" said "Cuando quiera la
   cuenta" and brought nothing; "No, mejor un flan" was "no flan"; "Mejor un flan" got "No hay problema" and nothing;
   "No el flan, el helado" / "Mejor el helado" after ordering the flan served the flan; "Ya no quiero el flan" kept it on
   the bill. They order, swap or cancel now until the dessert comes.
10. **"Reservamos para cuatro" was four o'clock** (the party stayed at the default 2; rule 4). A number is a time only
    as "las cuatro", "la una" or "4:00", so "Reservamos para cuatro a las 8:30" is four people at 8:30.
11. **"¿Cuánto es el diez por ciento?" got "Su total es de $235. Sí, es lo normal…"** (rule 11), and "¿Es normal el
    veinte?" got "Sí, es lo normal" before "del diez al quince". Now "Serían como $24 de propina." (new line, whole
    pesos, its own `amount` domain) and the range for twenty.
12. **Two money lines had no recordings.** cash_short said {$total} and {$price} (no total domain, and two values can't
    be enumerated) and tip_big {$amount} (no domain). One value per line now ("Perdón, son $235." / "Faltan $35." /
    "Todavía faltan $35."), tip_big on the price domain.

**Polish / understanding:** the other way while nothing is paid (rule 18): "Mejor en efectivo" / "Perdón, es en
efectivo" at the terminal (also after a bare "Aquí tiene" was taken as the card) and "Mejor con tarjeta" / "No traigo
más efectivo" before the change. "Quiero dejar el diez por ciento" said "eso no lo tenemos" first. A bare tip number above
30 ("Cincuenta", "No, quinientos") is pesos, never 50 %; "Le dejo cincuenta de propina" pays cash with the tip. "¿Tiene
cambio de quinientos?" got "Perdón, eso no lo tenemos. Tenemos comida yucateca…" (now "¡Sí, claro!" and cash). "¿Cuesta
algo la factura?" registered a factura (now "No cuesta nada": a factura is free in Mexico). Understood now: "Tenga,
doscientos pesos", "Le doy quinientos", "Con un billete de quinientos", "Aquí tiene cien más", "Son doscientos,
¿verdad?" (the real total back), "Ni muy roja ni muy cocida" (término medio; by its words it would have been roja),
"Sí, una, por favor" at the soup, "Somos cuatro adultos y dos niños", "Una más". Spoken forms of every money line checked.

**Open points:** the review's stand (the global goodbye's "¡Que tenga buen día!" and s69-local's "Trattoria Lucía" under
NEEDS; the feminine término; "No, gracias" at "¿Se le ofrece algo más?" brings the check; allergy questions without a
known answer). Not changed: "En efectivo" still gets "Muy bien, enseguida le traigo su cambio" before any amount; a $1
shortfall would say "Faltan un peso"; cash for separate checks isn't counted; "Yo también" at a table of two, "¿Y si le
dejo cien pesos?" and "Ya pagué con tarjeta" aren't understood (nothing paid).

**Gate:** tsc clean; check-content 134/134 NLU tests, 15 sims all 12/12, fuzz 80, 0/0; corpus 236/236, 0/21; heldout
40/40, 0/5; lead's set 29/29, 0/1; vitest 288/288.

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md, the brief, this review, the cross
and neutral files (AUDIT/cross, AUDIT/neutral), the situation file, the corpus and the held-out set, the transcripts of
every sim at seeds 3 and 7, probe.ts on every offer and side question, and the line list itself (tools/es-voices
lines-es.ts run on s73 alone: which values and which voices each line is recorded in). No "Town directions" section in
the cross file: s73 gives no directions in the town (only "al fondo, a la derecha" inside).

**Found 23 (1:2 2:0 3:0 4:5 5:3 6:0 7:8 8:0 9:2 10:3), fixed 22; one is the shared line list's (proposal).**

1. **Spanish.** (a) "¿Qué es la chaya / la horchata / el agua mineral / el café de olla / un agua fresca / el pibil?" got
   "Es uno de nuestros platillos más populares": a drink is no platillo, and it didn't answer. Seven real descriptions
   now (desc_horchata, desc_jamaica, desc_chaya, desc_fresca, desc_olla, desc_mineral "La natural es sin gas, y la mineral
   es con gas.", desc_pibil), all Yucatecan as served; the generic one (a soda, a side) says "Es de lo más pedido aquí." and
   needs no twin. (b) "¿Estos son los papadzules?" with them on the table got "Sí, es los papadzules": its_yours_pl
   "¡Sí, esos son! ¡Provecho!" for the plural dish.
2. **tú/usted:** consistent (usted to one guest, ustedes to a table, the hints usted).
3. **Names:** Lucía, Luis, Miller only; no clash (cross file). The NEEDS note about s69's "Trattoria Lucía" was stale.
4. **Facts, prices, values, voices.** (a) The room's menu board (interiors.ts) says "Limonada natural o mineral $50";
   the code charged $55 for the mineral: $50. (b) Every price is now a multiple of $10 (the brief's "round prices"):
   water $40 (natural and mineral the same), aguas frescas $40, beer and non-alcoholic beer $60, café de olla $50,
   capuchino $60, tea $40, a side on its own $40, flan $70, caballeros pobres $80, dulce de papaya $70; the dishes were
   round already. So every bill is a multiple of $10 and the bill lines (total_is, cash_short: `{$total}` now) and the
   cash still missing (cash_missing, cash_still) are voiced every $10 to $3,000 (was every $5): s73's line list is
   **8,597 clips for both sets, was 12,932**. (c) tip_amount said whole pesos above $200 ("como $217") where its list
   had only $5 steps: tipAmount rounds to $5 above $200, and the amount list (whole pesos to $200, every $5 to $1,000,
   every $100 to $3,000) now also carries tip_big ("¿$1,000 de propina?", was the $5 price list × 2 genders); a
   play-through of 300 random conversations and every sim × 12 seeds × both genders said no value outside its list. An
   odd sum the learner names ("Póngale mil doscientos cincuenta", $235 handed over) is echoed in the device voice, as the
   lead decided for s71b.
   (d) Voices: the line list voices a line in the voices it heard it in; 19 of Luis's answers had only been heard at
   Lucía's stand (take_time_pl, doneness_ok, desc_poc_chuc, comes_tortillas, comes_alone, spicy_which, allergy_check,
   nuts_ok, nuts_general, gluten_info, amb_again, request_ok, have_yes, have_no, unknown_order, restroom, box_free,
   ask_pay_method, pay_options) and tip_amount was voiced in Lucía's voice too (280 clips a set). Three new sims make
   Luis say them all; a total asked at Lucía's stand gets "¡Claro! Se la traigo después de la cena" so the totals stay
   in Luis's voice alone. (e) Not fixed here (shared tool, proposal): the plural dishes' item lines (below).
5. **English.** "starter(s)" (British) → appetizer: the hint group "Order an appetizer", the order step's suggestion,
   start_with's gloss "As | an appetizer", starters_list "As | appetizer" / "For appetizers, we have…". "sweet(s) of
   papaya" → "candy / candies | of | papaya". The lima flag said "a mild Yucatán citrus": lima agria is fragrant and
   sour ("a fragrant Yucatán citrus (lima agria)").
6. **Spelling, ¿¡:** nothing (cross file and a read of every new line).
7. **Questions and offers.** (a) The offer probe's two REAL flags: "Un postre, por favor" / "Sí, un postre" / "Postre"
   at "¿Le(s) traigo un postre o un cafecito?" weren't understood: dessert_some_ctx (the dessert and the check steps)
   gives the list and "¿Cuál le traigo?". (b) "¿Aceptan tarjeta?" or "No traigo efectivo" while ordering asked for the
   check: "Claro, le traigo la terminal", no dessert offered, the check brought unasked after the meal. Now an answer
   only ("¡Sí, claro!" to a question, "No hay problema" to a statement, which is kept as the way to pay). (c) "No,
   gracias" at "¿Se le ofrece algo más?" brought the check unasked with "¡Claro! Ahorita se la traigo" (the brief: never
   unasked): first "Muy bien. Cuando quiera la cuenta, nada más me dice."; a second no brings it. (d) "¿Cuánto cuesta
   el agua / la limonada / el café?" got "¿Cuál?" and the next "La mineral." ordered one: the kinds cost the same now, and
   "el café" is the plain one's $40 ("¿Cuál?" stays only for the pibil). (e) the drinks' "¿Qué es…?" (point 1).
   (f) "¿Hay chile habanero?" got "Perdón, eso no lo tenemos": the habanero salsa is brought. (g) "La propina se la dejo
   en efectivo" / "¿Puedo dejar la propina en efectivo?" (card for the bill, the tip in cash: everyday in Mexico)
   weren't understood: tip_cash at the terminal pays the bill alone ("¡Claro! Entonces le cobro solo la cuenta."), a
   hint teaches it. (h) "¿Qué guarniciones tienen?" at the side question: the list twice in one turn; now once.
   Checked and fine: every refusal of an offer (soup, box, dessert, factura, the wait), the kind questions the probe
   never reached ("¿Tinto o blanco?", the sodas, the aguas frescas, "¿Americano o de olla?"), dollars, the restroom.
   The offer probe after the fixes: 19 offers, 0 flagged, in both texts (was 2).
8. **Hints:** all accepted (check-content); the new tip_cash hint has its pattern and test.
9. **Accepted answers:** "Mejor pago todo en efectivo" and "Postre no, gracias" / "Mejor un postre" weren't understood
   (patterns). Corpus +46, 34 of them traps (33 with `not`, 1 `any`): 281/281, 0/22 false accepts;
   held-out 40/40, 0/5; NLU tests 134 → 143; sims 15 → 18, all 12/12.
10. **Neutral text.** (a) "¿Natural o mineral?" (water and lemonade, 4 lines) is Mexican: elsewhere natural water is
    water at room temperature and mineral water may be still: neutral twins "¿Sin gas o con gas?". (b) "¿Gusta(n)…?"
    (soup_offer, ask_dessert, ask_dessert_pl), flagged Mexican by the writer: twins "¿Quiere(n)…?" as s74 and s87.
    (c) The hint "Solo agua natural, por favor": twin "Solo agua sin gas, por favor."

**Spoken lines for the voices** (all before the freeze): new desc_pibil, desc_horchata, desc_jamaica, desc_chaya,
desc_fresca, desc_olla, desc_mineral, its_yours_pl, tip_cash_ok; changed desc_generic; new neutral twins for
ask_water_kind ×2, ask_lemonade_kind ×2, soup_offer, ask_dessert[0], ask_dessert_pl[0] and the tap_water hint; the
hint tip_cash (coach voices); the money lines keep their words with new value lists (total_is, cash_short, cash_missing,
cash_still, tip_big, tip_amount, price_is).

**For the lead (shared files):**
- interiors.ts cocina(), the menu board: "Flan|$70", "Caballeros pobres|$80", "Dulce de papaya|$70", "Aguas frescas:
  horchata, jamaica, chaya|$40" (the rest unchanged); TOWN.md "Prices the conversations share": s73's coffee $40–60.
- tools/es-voices/lines-es.ts: (1) step 1 binds an item line to `{ X: id }`, so a dish that is always plural
  (attrs.plural → qty 2 in s34, s73, s89, p18) is voiced "Aquí tiene: el papadzules", "Para empezar, el panuchos", and
  its real form only when a run reaches it: bind `{ id, qty: 2 }` for attrs.plural; (2) usedLists come from the random
  runs only, so a line the sims reach gets every item list ("Sí, es el agua. ¡Provecho!"): take them from the sims too;
  (3) a line heard from one speaker only is voiced in that voice only: 19 of Luis's answers here (fixed by sims), likely
  the same in s65b, s70, s85, p30, s63, p27.
- global.ts: the goodbye's "¡Que tenga buen día!" at this dinner (the writer's NEEDS, still open).
- Graphics: the room has no restroom door ("Está al fondo, a la derecha"), as s72 noted for the café.
- target.ts attrs.neutral (when it lands): s73's agua mineral / limonada mineral could take "agua con gas" / "limonada
  con gas" in the neutral item lines (a multiword noun needs its unit-aligned gloss).

**Gates:** tsc clean; check-content 143/143 NLU tests, 18 sims all 12/12, fuzz 80, 0 errors 0 warnings; corpus 281/281,
0/22 false accepts; held-out 40/40, 0/5; vitest (es) 109/109.

## Spain twins (11 Nov 2026)

198 Spain twins (lines, the `_pl` lines and hints), Spain nouns for 9 entities (agua sin gas / con gas, limonada
sin gas / con gas, zumo de naranja, refresco de pomelo, patatas fritas, and the steak's points: poco hecha, medio
hecha, al punto, hecha, muy hecha), 27 Spain multiword units in the file's `merges`.

- **Register:** the brief's usted becomes **tú** in Spain (Lucía and Luis are `informalSpain`), and the waiter's
  ustedes to a group becomes **vosotros** in every `_pl` line ("¿Qué os traigo de beber?", "Pasad por aquí", "¿Ya
  estáis listos para pedir?", "Tomaos vuestro tiempo", "Aquí tenéis la cuenta", "¡Volved pronto!"). The learner's
  hints say tú to them ("¿Me traes…?", "¿Nos traes la cuenta?", "¿Me cobras?", "Ponle cien pesos") and vosotros to the
  restaurant ("¿Tenéis mesa para dos?", "¿Qué tenéis de beber?"). Lines said to one guest or a group alike (m_greet,
  drinks_served, specials, host_order) take a Spain twin that needs no "you" ("el camarero de esta mesa", "las
  bebidas", "Hoy recomiendo…").
- **Spain's words:** la reserva, el camarero, la carta (the menu: el menú is a set meal in Spain), pedir (for
  ordenar), dentro / fuera, de beber, de segundo (for plato fuerte), el punto of a steak, el datáfono, el pedido,
  ¡Que aproveche!, calentito, pomelo, patatas, zumo, agua con gas / sin gas (in Spain "agua natural" is water that isn't
  chilled), Spain's perfect for today ("¿Qué ha pasado?", "has pedido", "Te he traído el datáfono", "lo que ha
  sobrado").
- **Warnings left:** "frijoles" in ask_side, side_list and comes_side: refried beans are a Mexican dish (like tortillas),
  and a Spaniard at a Mexican restaurant calls them frijoles, not judías.
- **Grammar:** de primero / de segundo, "¿Qué tenéis de beber?", "Ya lo tenemos", "he pedido / no he pedido" in the
  complaint, "Pagamos a medias".
- Spain corpus tests/es/spain/s73-restaurant.json: 32 items, all understood.
- **For the lead:** the doneness chips ("roja", "término medio"…) and "papas fritas", "agua natural" chips stay Mexican
  (chipLabel). Whether a sit-down restaurant's host says tú to an adult guest in Spain is the owner's call (the
  lead's `informalSpain` on Lucía and Luis says yes; a smart Madrid restaurant would often say usted).
