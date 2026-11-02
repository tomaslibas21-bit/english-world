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
