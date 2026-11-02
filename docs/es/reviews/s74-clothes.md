# Review: s74-clothes (Boutique Hilos, Valeria), writer's commit 220bbc0f

## Gate and blind set
| | Writer (220bbc0f) | After review |
|---|---|---|
| tsc / vitest | clean / 287 | clean / 287 |
| check-content | 87 NLU, 11 sims 12/12, fuzz 80, 0/0 | 105 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus | 226/227 (99.6%), 0 false accepts | 233/233 (100%), 0 false accepts |
| blind set (40, 9 traps, written first) | **38/40 (95%)**, 0 traps accepted | 39/40 (97.5%), 0 traps |

The blind miss left: "No me queda bien" reads fit_unclear, which is right (Valeria asks "¿grande o chico?"); my label was narrow.
A strong draft: steps, intents and twists as in English plus the sold-out twist, and good Mexican shop Spanish. The binding probes (rule 22) found the bugs below.

## Fixes (src: 92 lines added, 22 changed or removed)
**meaning-safety, must-fix (~25 lines)**
- "No con efectivo" (comma lost) read pay_cash and **paid in cash**. Now no_cash; "Efectivo no, con tarjeta" pays by card.
- "No quiero pagar con tarjeta" wasn't understood, nor was "…, en efectivo". New no_card says cash is fine and charges nothing until "Aquí tiene" (rule 18). no_cash now does the same for the card and no longer charges the card at once.
- "¿Cuánto cuesta la bolsa?" read ask_price + want_bag: Valeria quoted the guayabera's $950 and bagged it. New bag_price: "Es gratis. ¿Le doy una?"
- At the sign-up offer, "¿Cuánto cuesta?" got the garment's price (rule 11/17). Now "No cuesta nada. ¿Lo/La registro?" and the offer stays open (rewardsJoin()).
- At the sold-out offer, "¿Cuánto cuesta la grande?" took the size ("Listo"). Now it's a price question and the offer stays open.

**understanding, must-fix (~25 lines)**
- Refund/exchange corrections: "No quiero un cambio, quiero mi dinero", "El dinero no, un cambio", "Mejor saldo a favor, no el dinero".
- "Sí, ¿por qué no?" at decide, the sold-out offer and the sign-up: local why_not_ctx (the global NEEDS stays).
- "No me interesa" (im_fine_ctx, also at the sign-up), "No me la llevo todavía", "No quiero comprarla", "Le doy mil pesos".
- The return twist: "Sí, compré esta guayabera la semana pasada" (no "aquí"); "No, no vengo a devolver nada".
- The playa→playera slip: "Me gusta la playa" still parsed as looking_for(playera). A guard in looking_for now answers about the beach.

**spanish, polish (3 lines)**: "¡Claro!" + "¡Claro! ¿De qué número?" twice in a row → "¿De qué número?". "¿Débito o crédito? Aquí está la terminal." asked a question nobody answered → "Claro. Aquí está la terminal.". Color hint "¿Lo tiene en {X}?" (wrong for la blusa) → "¿Hay en {X}?".
**gloss-english**: I read about 40% of the lines: no errors. **numbers**: prices are in range, discounts floor to whole pesos, shoe sizes say "más o menos". **twins**: pásele, ¿gusta…?, ticket all have twins; Mexican-only words are well under one line in eight.
**facts**: Prices include IVA (Mexican law requires the full price on the tag). Quintana Roo's 2019 plastic-bag ban is real. The store policies are this shop's own and vague: fine.
**structure**: All English steps, intents and twists kept. Added: no_card, bag_price, why_not_ctx; beach_q.
**tests (~25 lines)**: 18 NLU tests (12 with not:), 1 sim (no card, money handed over, bag price), 6 corpus items, the blind set.

## For the lead
- global.ts: "¿Por qué no?" as a yes (NEEDS kept; why_not_ctx is a local stopgap).
- Engine: "playa" ≈ "playera" slip; a bare "La playa" still parses as playera (the handler covers it).
- Kept on purpose: "No está caro" → "Lo entiendo. Pero la tela es muy buena." (comma lost, nothing recorded). The refund line "Le devuelvo el dinero a su tarjeta" assumes a card, as in English.
