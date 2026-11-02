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
