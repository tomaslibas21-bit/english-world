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

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), the brief,
the review above, the cross and neutral files (AUDIT/cross, AUDIT/neutral), the situation file, corpus and held-out;
the transcripts at seeds 3 and 7 (before and after); every line rendered with every garment, size, color and value
(both texts); ~200 probe turns (tools/probe.ts) at every step; the Spanish offer probe (200 runs Mexican, 60 neutral);
the voice line list for s74 (tools/es-voices/lines-es.ts, both accents).

| | Before | After |
|---|---|---|
| check-content | 105 NLU, 12 sims 12/12, 0/0 | 134 NLU, 18 sims 12/12, fuzz 80, 0/0 |
| corpus | 233/233, false accepts 0/22 | 314/314, false accepts 0/24 (+83 items, 16 traps) |
| held-out | 39/40 | 55/55 (+15 written after the fixes; one label widened, see 9) |
| offer probe | 2 REAL flags (+ the receipt by name, by hand) | 0 in both texts |

**Found by point** (49; 46 fixed):
1. *Natural Spanish (6).* The fit question's bare "No." said `fit_which` for every garment: **"¿Le queda grande o
   chicos/chicas?"** for sandals, sneakers, shorts, pants (now `sayN`: "¿Le quedan grandes o chicas?"). Shoes go by
   *número* in this shop ("Las sandalias y los tenis van por número") but the exchange asked "¿Qué talla quiere en su
   lugar?" / "¿Mismo modelo en otra talla…?" (new `ret_exchange_shoe_q`, `ret_exchange_what_shoe_q`; and
   `no_bigger_shoe` / `no_smaller_shoe`). "¿Me permite preguntar por qué la devuelve?" to a customer who asked for an
   exchange (now "¿Tuvo algún problema?", the same clip). "Aquí tiene la grande. Aquí tiene su blusa nueva." (now "Le
   traigo la grande."; the shoe number isn't repeated before "Aquí tiene sus tenis nuevos"). "¡Claro! ¿Qué le gustaría
   ver? ¿Qué más le puedo enseñar?" (two questions after "¿Le enseño otra cosa?" – "Sí"). "¡Ese color le queda
   precioso!" right before "¿Y de qué color?" (that compliment waits until a color is chosen).
2. tú/usted: nothing (usted throughout; tú to staff understood with the tip).
3. Names: nothing (Valeria only; no clash).
4. *Facts and voiced values (2).* Prices, sale prices (−20/−30 %, floored to the peso) and totals are all in the
   price/amount/total lists, and the IVA and bag facts hold. But shoe numbers left the voiced 20–33 list: EU 33–34 (men)
   gave "más o menos un 18/19", EU 47–50 gave 34–37, an exchange took any number ("Del 17" → "Aquí tiene, del 17") and
   a size change went past the ends. Now one converter (`shoeMx`) for shopping and exchanges, conversions kept to the
   shop's 20–33, "¿Qué número dijo?" for a number it can't read, and the end of the range says so. The voice list
   rendered every `_pl` line with one garment (quantity 1): "¡Que disfrute su pantalón nuevo!", "¿Le quedan grandes o
   chica?", while "sus pantalones/sandalias/tenis nuevos", "se los aparto", "aquí las tiene"… were never listed (only
   what random runs happened to say). The `_pl` lines now write their agreement as `{lo@X:pl}` / `{X.pl}` (the game's
   text is unchanged) and `closing_bought` has a `_pl` variant.
5. *English (7).* "clothes shop", "sales assistant" (intro), "shop assistant" (tip), "Shops…" / "same shop" (notes) →
   clothing store, sales associate, salesclerk, stores. "Shall I…" in `sold_out_offer`, `rewards_free`, `ask_receipt`
   (+ twin) → "Should I…". Gloss of "¿Trae…?" "Do you bring" → "Do you have (with you)" (as "No traigo").
6. Spelling, accents, ¿¡: nothing.
7. *Questions and offers without an answer (28; 25 fixed).* "¿Mismo modelo en otra talla o en otro color?": "En otra
   talla." / "En otro color." not understood, "Otra talla, por favor." looped, "Quiero otra talla." said "Ah, la
   guayabera del maniquí", "La misma" / "Una igual" not understood (`exch_what_ctx`: which size or color next, or the
   same one new). The receipt by name: "El ticket, por favor.", "El recibo.", "Mi ticket", "Démelo" (receipt step) and
   "Sí, el ticket." (returns) not understood. Her opinion (the brief's "¿Me queda bien?"): "¿Me queda bien?" got
   "¡Qué bueno!", "¿Cómo me queda?", "¿Qué opina?" not understood (`ask_opinion`). "Quiero ver otra cosa" → "Perdón,
   eso no lo tenemos". At "¿Qué color prefiere?": "¿Cuál me recomienda?" got the mannequin nudge, "Cualquiera" / "Me da
   igual" not understood (new `color_tip`: "El blanco es el que más se vende."). At the register "¿Cuánto es?" gave
   the price, the discount and then the total again; "¿Cuánto le debo?", "¿Cuánto es en total?", "¿Me la cobra?" not
   understood. "¿Hasta cuándo es la oferta?" (new `sale_until`: "Hasta agotar existencias."). At the fit: "Más o menos"
   got "¡Ay, lo siento!", "Ni grande ni chica" not understood. "No, vengo a comprar" at "¿Viene a hacer un cambio?".
   "¿Cuánto tiempo tengo para cambiarla?" not understood, and the policy answer picked the mannequin's guayabera and
   asked its size. "El dinero, por favor." / "Mi dinero" at "¿Reembolso o cambio?". "No me gustó", "Es muy chica"
   (reasons), "Soy mediana en Estados Unidos", "Algo fresco", "¿Me puede dar cambio de mil?", "¿Tiene terminal?".
   **Left**: material and care questions ("¿Es de algodón?", "¿Se puede lavar?", "¿Tiene espejo?"), unknown goods asked
   with "¿Tiene…?" ("¿Tiene lentes de sol?" isn't understood; "busco / venden …" get "eso no lo tenemos"), factura
   and "a meses": not in the English edition either; the engine's not-understood path answers.
8. *Hints (1).* Nothing in the help asked her opinion: the fit group now ends with "¿Cómo me queda?" (note: "¿Me
   queda bien?" works too) and the colors with "¿Qué color me recomienda?" (last, so the first model answers stay).
9. *Meaning safety (4).* "¿Tienen bolsas?" was read as "I have my bag" (no bag); "Tiene una mancha" read "una" as a
   shoe number 1 ("Mmm, ¿chica, mediana o grande?"); while shopping "Cambié de opinión" or "Esta tiene una mancha"
   started a return of a past purchase (now: not taking it / "Aquí tiene una nueva, igual."); "Quiero otra talla" at
   the exchange question split into "quiero" = take it. Held-out "No me queda bien" was labelled fit_bad only; the
   grammar's fit_unclear ("¿grande o chico?") is right, so the label takes both.
10. *Neutral (1).* "playera" is Mexican (s65b twins it "camiseta"): the entity has `attrs.neutral: "camiseta"` for the
   coming target.ts fix (FOLLOWUPS, s32); every other twin checked. "Una disculpa" (flagged "a common Mexican way to
   say sorry") has no neutral twin, as in p26 and the global sorry patterns: an edition-wide call, left.

**Spoken lines for the voices**: new Valeria lines `color_tip` (12 colors; 5 reachable), `sale_until`,
`ret_exchange_shoe_q`, `ret_exchange_what_shoe_q`, `no_bigger_shoe`, `no_smaller_shoe`, `closing_bought_pl` (texts the
game already said, now listed); `good_choice`, `sure`, `compliment_plain(_pl)`, `ret_ask_problem(_pl)`, `size_bring`
reuse existing texts (no new clips). Coach: "¿Cómo me queda/quedan?", "¿Qué color me recomienda?". No existing
line's text changed (English only: intro, tip, notes, three "Should I…", one gloss).

**For the lead** (shared tool, not edited): tools/es-voices/lines-es.ts binds a line's entity with quantity 1 and,
for a line random runs never reach, with *every* entity list (here `closing_bought`: "¡Que disfrute su amarillo
nuevo!", "…su chica nueva!"); recording `usedLists` from the scripted sims too (step 0b) would drop that junk, and
multi-entity lines (`color_list`, `color_yes`: a garment and its own colors) still depend on random runs.

## Spain twins (11 Nov 2026)

About 170 Spain twins (lines, the `_pl` lines and hints), 2 Spain nouns (tenis → zapatillas; the size chica → pequeña;
the `G` helper takes spain / spainPl / spainG), 10 Spain multiword units in the file's `merges`.

- **Register:** the brief's usted becomes **tú** in Spain (Valeria is `informalSpain`): "¿Te puedo ayudar en algo?",
  "¿Te lo quieres probar?", "Pruébate…", "¿Qué tal te queda?", "¡Te sienta genial!", "¿Te lo llevas?", "Acerca tu
  tarjeta", "¡Que disfrutes tu…!" ({tu@X}); the learner says tú to her ("¿Me enseñas…?", "¿Tienes una talla más
  pequeña?", "¿Me puedes devolver el dinero?") and vosotros to the shop ("¿Tenéis…?", "¿Qué tallas tenéis?",
  "¿Aceptáis Apple Pay?").
- **Spain's words:** mirar (for ver: "Solo estoy mirando"), pequeña, zapatillas, bañadores, el datáfono, el móvil,
  guardar (for apartar), el extracto (for estado de cuenta), solo (for nada más), "Lo siento" (for "Una disculpa"),
  ¡Pasa, pasa!, Spain's perfect ("¿Qué te ha parecido?", "¿Has tenido algún problema?", "Lo he perdido", "He cambiado
  de opinión"). Shoes keep the Mexican numbers (the shop is in Mexico).
- **Grammar:** "no llevo el ticket", "lo he perdido", "se me ha perdido", "he cambiado de opinión".
- Spain corpus tests/es/spain/s74-clothes.json: 27 items, all understood.
- **For the lead:** "traje de baño" stays the entity's name in Spain's text (Spain says it too); "bañador" would need an
  `attrs.spain` with its own gloss units (one word for "suit | for | bathing": target.ts could take `spainLt`). The size
  chips ("chica (CH)") stay Mexican (chipLabel).
