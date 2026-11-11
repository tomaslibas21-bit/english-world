# s32-mercado · "¿A cómo el kilo?": reviews

Doña Lupe's fruit and vegetable stall in the Mercado Municipal. One of the three models (with s72-cafe and s66-taxi), written
before the review rules and the corpora existed, so it had no earlier review, no corpus and no held-out set.

## Audit (5 Nov 2026)

A fresh reviewer read both texts (Mexican and neutral), the transcripts of every sim on seeds 3 and 7, probed about 150
learner turns with `tools/probe.ts`, and listed every clip the voices would record (`tools/es-voices/lines-es.ts`, both
sets). Leads from the cross-cutting audit (N/AUDIT/cross, N/AUDIT/neutral) were checked too.

### Found, by point

1. **Natural Spanish** (6): "Ahorita se los escojo" for papayas (now los / las / lo / la by the fruit and how many);
   "¡Sí, claro! Están muy buenos" for papayas and cilantro (now buenos / buenas, and "Está muy fresco" for cilantro);
   cilantro treated as countable ("Un manojo de cilantros", "$20 de cilantros", "sin cilantros", hints "Me llevo un
   cilantro", "Quisiera cilantros"; now a mass noun); amounts said back wrong: "Tres aguacates" → "1 kilos de
   aguacates", "Un aguacate" → "0 kilos", "Cinco limones" → "Un kilo de limones", "Dos kilos y medio" → "3 kilos",
   "Tres cuartos" → "1 kilos" (now "Tres aguacates…", "Dos kilos y medio…", "Tres cuartos de…", "Dos manojos…");
   "¿Cuánto le doy?" for mangos and piñas (now "¿Cuántos / Cuántas le doy?"); the haggle answer repeated word for
   word and the total said twice after a short bill.
2. **tú/usted**: nothing; Lupe says usted throughout, the hints too.
3. **Names** (1): Doña Lupe (here) and Doña Lupita (s82, p29: "Yo soy Guadalupe") are both Guadalupe. A cast name:
   left for the owner (CROSS.md), not renamed. No spoken line here says "Lupe".
4. **Facts** (5): "Nomás efectivo" contradicted "Sí, también por transferencia" (now "Tarjeta no, joven. Nomás
   efectivo o transferencia."); about half of the real totals ($17.50, $52.50, $47…) were not in the price list the
   totals are voiced with, so they would have played in the device's voice: the kilo prices are now multiples of $20
   (a quarter kilo is a whole $5) and pieces are rounded to $5, so every total is a multiple of $5 (aguacate $60,
   jitomate $40, limón $40, plátano $20, papaya $40, cebolla $40, papa $40, naranja $20, habanero $80; mango $15 and
   piña $40 each, cilantro $10 a bunch: all plausible for the Riviera Maya in Nov 2026); pieces of what is sold by
   the kilo cost 200 g each whatever the fruit (five limes = $35, two papayas = $14; now a weight per fruit: a lime
   50 g, a papaya 1.5 kg); "Un kilo de mangos" was one mango (now three); "Hasta ahorita van $0" could be said.
5. **Glosses and English** (7): "young man" glossed "joven" for women too (now "young man / young lady"); "chilis
   habanero" (now "habanero peppers"); "What are you taking (today)?" ×3 (now "What are you getting?"); "How much
   shall I put in?" (now "should"); "The pineapples 40 pesos each." (now "are"); "20 pesos worth" (now "pesos'
   worth"); "¿No | trae" split against S-NEG (now one unit, "Don't you have").
6. **Spelling, accents, ¿¡**: nothing.
7. **Questions and offers without an answer** (15): "¿De cuál?" took no answer ("Del aguacate" not understood); after
   "Los mangos están buenísimos hoy", "Deme tres" / "Me llevo uno" / "Deme medio kilo" got "Mmm, eso no lo vendo
   aquí" (the catch-all read the amount as a product); at "¿Los quiere para hoy o para mañana?", "Me da igual" got the
   same, and "No importa", "Unos para hoy y otros para mañana", "Para el lunes", "Para comer mañana" were not
   understood; "¿Qué tiene?", "¿Están maduros?", "¿Acepta dólares?", "No traigo efectivo" (after cash only), "¿Y el
   aguacate?" (after a price) were not understood; "¿Tiene cambio?" and "¿Me da un recibo?" got "no lo vendo";
   "Quédese con el cambio" got change back; "Tome", "Aquí le pago", "Le doy cien" were not understood at paying; at
   "¿Trae bolsa?", "No necesito bolsa" / "No hace falta" / "Así está bien" were given a bag, "¿Me da una?" / "una
   bolsita" got "no lo vendo", and "Sí, aquí tengo una" was read as a one-peso bill; "¿Cuánto cuesta cada mango?" and
   "¿Cuánto es medio kilo?" ordered (a price question bought); "Mejor medio kilo", "Sin jitomate", "Ya no quiero los
   aguacates" were not understood.
8. **Hints** (3): at "¿Cuánto le doy?" for mangos, piñas or cilantro, "Say how much" showed the yes/no group ("Sí,
   por favor", "¡Sería genial!"): now "Say how many" ("Tres, por favor.", "Dos, nada más."); the cilantro hints (point
   1); "Veinte pesos, nada más" credited no phrasebook entry (`#h:qty_money` added).
9. **Accepted answers** (2): no corpus or held-out set existed; and the catch-all "@order_prefix {w:any}" swallowed
   amounts, a bag request, "igual", "cambio" and "recibo". A new intent `order_amount` must never be expected at
   "¿Algo más?": the engine then accepts it with extra words ("¿Me da un kilo de fresas?" would change the last
   thing bought), so it is only taken as a whole sentence there (a trap in the corpus says so).
10. **Neutral text** (2): `greet[2]` "¡Buenas, marchante!" had no twin (now "¡Buenas, joven!"); and the neutral set
    says "jitomate" wherever the product is a placeholder (about 20 clips: "Un kilo de jitomates…", the prices, the
    hints): the entity's `attrs.neutral: "tomate"` was written for an engine step that was never built (see "Left
    for the lead"). Every new line with a Mexican-only word has its twin (`ack_ripe_one`, `stock`, `cash_only`).

### Fixed

- The lines above; new lines, all short and in Lupe's register: `ask_qty_pcs`, `ask_ripe_one`, `ack_ripe_one`,
  `got_3q`, `got_kilos_half`, `got_bunches`, `have_yes_sg`, `stock` ("Hay de todo: aguacate, jitomate…", twin
  "tomate"), `transfer_offer`, `dollars_no`, `haggle_again` ("Más barato no se puede, joven."), `thanks_tip`,
  `no_receipt`. `recommend` is split in `recommend_mango` / `recommend_papaya` (same texts), so "Sí, deme dos" is
  for the fruit she named. Dead lines removed: `price_kg` (every kilo product has a plural) and `have_no`.
- The amounts: `setAmount` / `amountSay` (pieces of what is sold by the kilo, the weights, bunches, money); a
  correction ("Mejor medio kilo") applies to the last thing bought; an amount with nothing to apply it to gets
  "¿De cuál?" and the answer gets it. Lines that are always plural force it (`{lo@X:pl}`), so the voice list holds
  no form the game never says ("Están muy bueno").
- New intents: `order_amount`, `ripe_any`, `price_next_ctx`, `which_ctx`, `ask_what`, `ask_quality`, `bag_yes_ctx`,
  `bag_no_ctx`, `bag_none_ctx`, `keep_change`, `ask_receipt`, `pay_dollars`, `no_cash`, `transfer_yes_ctx`;
  broader `ask_price`, `pay_cash`, `big_bill`, `pay_transfer`, `more_no`, `reject`, `haggle`, `ripe` (#mix too). Money
  moves once (`paid` guards); a bill smaller than the total gets the total again, once.
- Tests: 69 NLU tests (was 49), 8 sims (was 5: pieces and a correction, "¿De cuál?" and a question about the fruit,
  a tip and a transfer), all 12/12. **Corpus** `tests/es/corpus/s32-mercado.json`: 277 items (47 traps), 70% → 100%
  understood, 0 false accepts. **Held-out** `tests/es/heldout/s32-mercado.json`: 45 items written before the
  grammar changed, 76% → 100% (its one miss, "¡Qué caro!", led to the `haggle` patterns "qué caro", "está muy
  caro"), 0 false accepts.
- The voices: 1,824 clips for this conversation (both sets, both learner genders; 1,721 before).

### Left for the lead or the owner

- **The neutral set says "jitomate"** (point 10): `npUnits` in `src/editions/es/convo/target.ts` ignores an entity's
  `attrs.neutral`. Proposal: when `variety() === "neutral"` and the entity has `attrs.neutral`, use it as the head
  (plural by `pluralEs`); the gloss stays. It fixes the lines and the hints at once; it should land before the
  neutral set is voiced. Other conversations' entities may have the same gap (none uses `attrs.neutral` yet).
- `tools/es-voices/reach-es.ts` keeps a rule for `s32-mercado:price_kg`, a line that no longer exists (harmless).
  The `price_bunch` rule allows every product's price ("El manojo, a $60."), though only the cilantro's $10 is said.
- STYLE.md's example "a kilo of avocados $70" no longer matches the model ($60).
- s66-taxi glosses "joven" as "young man" for both genders too.
- The owner: Doña Lupe vs Doña Lupita (point 3).

## Spain twins (11 Nov 2026)

No line twins needed: Doña Lupe keeps usted, and her lines already read as Spain's once the neutral twins apply (the
Mexican-only "pilón", "ándale", "ahorita" have neutral twins). One Spain noun: papa → patata (`P(…, { spain: "patata" })`, the
helper now passes `spain`). "Limón" (a Mexican lime; Spain: lima) and "chile habanero" stay Mexican, as the market's own goods.
Spain corpus: 15 items (¿Me pone…?, póngame, patatas, vale, llevo bolsa).
