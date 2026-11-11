# Review: s65b-baggage ("Mi maleta no llegó"), writer's commit c752f133

I reviewed `src/editions/es/content/situations/s65b-baggage.ts` (1,364 lines). I changed 22 of its lines and added 56; 24 of the added lines are tests and a sim. No shared file was touched.

| Check | Before (c752f133) | After |
|---|---|---|
| tsc / vitest | clean / 257/257 | clean / 257/257 |
| check-content --verbose | 104/104 NLU, 8 sims 12/12, fuzz 80, 0/0 | 121/121 NLU, 9 sims 12/12, fuzz 80, 0/0 |
| corpus (`tests/es/corpus`) | 168/168, 0/15 false accepts | 184/184 (with 26 review items), 0/25 false accepts |
| blind set (`tests/es/heldout`, 40 items, written first) | 37/40 = 92.5%, 0 traps accepted | 37/40, 0 traps accepted |

All 40 blind sentences were understood. The 3 "misses" got the writer's `_ctx` intents (`tag_lost_ctx`, `describe_ctx`), which run the same handlers as the intent I expected. I left the blind set unchanged. The writer's claims all held. Most bugs came from a second probe of about 65 sentences, written after I had read the file.

## Fixes
**meaning-safety: must-fix (about 14 lines)**
- `pickup` matched a bare "no hace falta". So "No, no hace falta" in answer to the kit offer switched the delivery to a pickup ("puede recogerla aquí"). It now needs "no hace falta que me la lleven / llevarla"; the bare phrase is now in `kit_no_ctx`.
- "No, al hotel no" and "No al hotel, prefiero recogerla" were read as a delivery somewhere else. In the second case Itzel promised delivery while the bag was set to a pickup. A delivery elsewhere now needs "sí / pero" or "a otra dirección"; "no al hotel + recogerla" is a pickup.
- `q_meantime` held "no tengo nada": at the contents or phone question, that offered the kit. It now needs "…para esta noche / que ponerme".
- `kit_no_ctx` "[no] tengo mis cosas": "No tengo mis cosas" declined the kit. That reading now needs a place ("…en mi mochila").
- `marks_none` "no tiene nada" was a plain intent; with tengo≈tiene, "No tengo nada" at the tag question became "no marks". The bare form is now in `marks_bare_ctx`.
- `hand_over` held bare "aquí / tome / tenga / lo tengo". These are now `hand_over_ctx`, used at the tag question only.
**understanding (about 8 lines):** "No fue directo, hice escala en X"; "No es grande, es chica"; "No estoy en un hotel, estoy con unos amigos"; "No tengo celular"; "No sé, creo que Samsonite"; "¿Aquí se reportan las maletas perdidas?"; "Mi maleta sí llegó, pero mi mochila no".
**spanish / replies (must-fix, 3 lines)**
- `ans_free` said "Sí, la entrega no tiene costo", which also answered "¿Tengo que pagar algo?" and "¿Cuánto cuesta?". It is now "La entrega es gratis, no tiene ningún costo."
- The kit was offered twice: after a yes or no at the kit question, "¿Qué hago mientras tanto?" offered it again. `kitGiven` is now set there (new sim).
- `phone_none_call_us` said "llamar con su número de reporte" right before Itzel gave the number ("número de reporte" twice). It is now "el teléfono viene en el reporte".
**gloss / flags (polish, 2 lines):** the `ask_tag` flag on "pase de abordar" was on unit 12, which doesn't exist (the unit is 11), so the Mexican-word flag never showed. The phone hint's `say` had an "el" that its text doesn't show.
**facts (polish, 1 line):** "le reembolsamos lo que gaste" was an open promise. It is now "le reembolsamos los gastos básicos".
**tests (+24 lines):** 17 NLU tests, mostly traps with `not`, and the sim "kit declined, then what to do in the meantime".

Kept as written: usted throughout; the twins (pase de abordar, listón, playera); the flight code PC; the twist city rule; echo_navy; the transcripts (seeds 3, 5 and 8, twist sims included) read naturally, with no line repeated in a row.

## For the lead
- The engine can't tell "No fue un vuelo directo" (not direct) from the hint "No, fue un vuelo directo", because punctuation is stripped. The same goes for "No volé directo", "No es una maleta normal", "No lo perdí" and "No estoy bien". I kept the "No," reading, which is the likelier one at those questions. Fixing it would need comma awareness in the NLU (a shared file).
- A bare "Aquí" at the delivery question still reaches `hand_over` in coverage (it gets a "Gracias."). That is harmless, but it is not understood as "pick it up here".

## Revision (2 Nov 2026): customs at the end

The owner moved customs out of the passport conversation (s65a) to the end of this one. After Itzel's goodbye
(now a step, `bye`, with the pending `itzel_bye`), the learner walks out with the backpack past **Agente Medina**
(`aduana`, usted, the Spanish-only character on Officer Diaz's base in npcs.ts). The lost-bag part is unchanged,
except that the task now completes at Medina's "Puede pasar", not at the report number, and Itzel's desk topics
asked at customs get "Eso lo ve en el mostrador de equipaje" (and customs questions at the desk get "Eso lo ve en
la aduana, a la salida"; a form question at the desk is Itzel's report).

What happens: "¿Trae algo que declarar?" (sometimes with "¿Fruta, carne, algún alimento?", sometimes a separate food
question); nothing to declare passes; declared fresh fruit or vegetables, meat or a ham/cheese sandwich "no pueden
entrar al país" and stay there; other food is "declared and checked" (no rule is taught for it); gifts get "¿Más de
500 dólares?" (within the allowance, or the self-declaration lane where duties are paid); cash only over 10,000
dollars (the money declaration). Learner questions: a form (none needed here), the red/green button (not used
here any more), the allowance, cash, why fruit can't come in. Twist (visits ≥ 1, `setup` in two sims): the sniffer
dog sits by the backpack ("se sentó junto a su mochila" / "marcó su mochila"): owning up, "Sí" + what, or "Aquí está"
hands over the snack (an apple or a ham sandwich from the plane); "No" gets the backpack checked, the snack found
and "La próxima vez, declare la comida".

### Sources (read 2 Nov 2026)
- ANAM, "Nuevo Modelo de Atención a Pasajeros Internacionales en Aeropuertos",
  https://www.anam.gob.mx/nuevo-modelo-de-atencion-a-pasajeros-internacionales-en-aeropuertos/ — a "Nada que
  declarar" lane and an "Auto declaración" lane; Cancún T4 since 1 Nov 2017, T3 since 27 Oct 2020, T2 since 25 May
  2024, Tulum since 28 Mar 2024.
- ANAM, Boletín 10/2024 (10 Jun 2024), https://www.anam.gob.mx/boletin-10-2024/ — RGCE 3.2.6: with only luggage and
  the allowance, the "nada que declarar" lane, no D2 form and no "mecanismo de selección automatizado" (the
  semáforo); extra goods: the "Auto declaración" lane, describe them and pay; cash over 10,000 USD on form D4;
  customs may still check baggage. (Boletín 11/2024 says the same for Tulum.)
- ANAM, "Equipaje y franquicia", https://www.anam.gob.mx/equipaje-y-franquicia/ — 500 USD of goods besides personal
  luggage (laptops, phones, medicines are luggage).
- ANAM, "Declaración de dinero", https://www.anam.gob.mx/declaracion-de-dinero/ — over 10,000 USD must be declared.
- ANAM, "Declaración de mercancía", https://www.anam.gob.mx/declaracion-de-mercancia/ — the generic page still
  describes the paper form and the semáforo (airports without the new model); not used for Cancún.
- SENASICA, "Productos prohibidos" (27 Apr 2026), https://www.gob.mx/senasica/documentos/productos-prohibidos —
  fresh fruit and vegetables, fresh meat, sandwiches/tortas with meat and dairy without sealed packaging, fresh
  cheeses.
- SENASICA, "No traigas productos derivados de cerdo del extranjero" (1 Dec 2025),
  https://www.gob.mx/senasica/acciones-y-programas/no-traigas-productos-derivados-de-cerdo-del-extranjero-341116 —
  "sándwich con jamón" among the pork products tourists may not bring.
- SENASICA press release (23 Dec 2019), https://www.gob.mx/senasica/prensa/incrementa-agricultura-presencia-de-binomios-caninos-para-prevenir-entrada-de-enfermedades-que-afectan-a-cerdos-y-platano-230599
  — nine canine teams in Cancún; the dogs "marcaron" bags.
- SENASICA profile of the dog Rosseta (gob.mx PDF), https://www.gob.mx/cms/uploads/attachment/file/785208/Rosseta_ENG.pdf
  — trained on citrus, mango, apple, pork and beef, the commonest products travelers bring.
- SENASICA comic "Falco" (gob.mx PDF), https://www.gob.mx/cms/uploads/attachment/file/457517/QR-historieta_FALCO.pdf
  — the airport dog sits when it finds food in a suitcase or hand bag.
- SENASICA, "Inspección turística" (28 Jul 2026), https://www.gob.mx/senasica/acciones-y-programas/informacion-para-viajeros-193524 — general.
- ASUR, Cancún airport pages, https://www.asur.com.mx/es/aeropuertos/cancun — no customs procedure there; nothing taught from them.

Kept vague (no source confirms): fines, what happens to the confiscated food (Sader says it is incinerated; not
said), whether packaged sweets or aged cheese pass (Medina only "checks" them), how duties are computed ("se lo
calculan en el carril"), what the cash form looks like.

### Numbers
| Check | Before | After |
|---|---|---|
| check-content --verbose | 121/121 NLU, 9 sims 12/12, 0/0 | 156/156 NLU (35 new, 14 meaning-safety), 17 sims 12/12 (8 new), fuzz 80, 0/0 |
| corpus | 184/184 (old part) | 231/231 (59 new items, 17 traps), 0/37 false accepts |
| blind set (old, 40) | 37/40, 0 traps | 37/40, 0 traps (the same three `_ctx` readings) |
| vitest | — | 288/288 |

Played with `tools/probe.ts` (19 scenarios): a plain no, a bare yes then nothing, "Está bien, gracias" (asked
again, never a yes), "No traigo fruta, traigo chocolates" (chocolates only), "Traigo chocolates, pero no fruta",
"¿Puedo traer una manzana?" (a question, nothing declared), "Me comí la manzana", a vague "comida" then what, gifts
with a what-if, a price question and a number over/under, "Me costaron trescientos dólares", the dog with yes, "Aquí
está", a correction ("No es una manzana, es un plátano"), "No" + "¿Por qué?" + "Perdón, no me acordaba", and desk
questions asked at customs.

### For the lead
- NEEDS (slots.ts): `{number}` reads "diez mil" as 10 + "mil"; a local `amount` slot reads it whole here.
- NEEDS (lang.ts, optional): "traigo", "llevo", "traje" in PART_VERBS, so "No traigo fruta, | traigo chocolates"
  splits like "tengo"; a whole pattern in `declare_items` covers it meanwhile.
- TOWN.md already names the arrivals hall's customs with Agente Medina and the dog; the airport restyle's
  "Aduana with the red-green traffic light" (TOWN.md task 6) no longer matches Cancún: lanes "Nada que declarar" /
  "Auto declaración" instead.

## Review of the revision (2 Nov 2026), writer's commit 4862d7e5

**Gate after the fixes:** tsc clean; check-content 0 errors, 0 warnings, 18/18 sims 12/12 seeds (one new), fuzz 80 ok;
corpus 242/242 (100%), 0/37 false accepts (11 items added); vitest 288/288.
**Blind set** (tests/es/heldout, 20 customs items written before reading the new code, 5 of them traps):
before: old part 37/40, customs 15/16, 0 traps accepted; after: old part 37/40 (the same three `_ctx` readings,
meaning right), customs 16/16, 0 traps accepted. Total 52/56 → 53/56 (94.6%). 53 probe scenarios played (rule 22).

**Meaning-safety (must-fix, ~20 lines)**
- "Traigo más de diez mil dólares" recorded cash under the line and "no hace falta declararla" (10,000 is not > 10,000):
  "más de" now counts. Euros and pesos near the line got a verdict at a 1:1 or 200,000-peso rate; ANAM's line is
  10,000 dollars "or the equivalent", so near it Medina states the rule (`cash_equiv`), far from it she decides.
- "Está bien" at "¿Más de 500 dólares?" was a yes and sent the learner to pay duties (rule 17): the polite check now
  guards the gift, food and dog questions too.
- "Una manzana y un sándwich" kept the sandwich silently: every banned kind is said and all of it stays (`stays_here_all`).
- "No traigo fruta, solo chocolates": a whole pattern now, so it never rests on two pieces (it read "declare_none{fruit}" first).

**Facts (must-fix, ~10 lines)** — checked against SENASICA "Productos prohibidos" and ANAM Boletín 10/2024:
- SENASICA bars "carne fresca", but cured or dried pork (jamón, chorizo, salami, carne seca) only from countries with
  African swine fever, and fresh cheese only. "La carne no puede entrar" was said for jerky and ham, and cheese got
  "Todo bien". Now: `meat` = fresh meat; ham, cured meat and cheese go to SENASICA's inspectors ("Eso lo revisa
  SENASICA. Pase por aquí"), no verdict. The ham sandwich rule (meat or dairy without sealed packaging) stays.
- After the cash-over line, "¿Algún formulario?" said "no form": now "Solo la declaración de dinero"; `ans_cash` adds "o su equivalente".

**Understanding (must-fix where the NPC's own words fail, ~25 lines)**
- "Algo empacado", offered in Medina's own "¿Fruta, carne, algo empacado?", wasn't understood: new `packaged` (papitas,
  cacahuates, nueces, barras de granola…).
- Not understood before: "No pasan de quinientos", "¿Y si son menos?" (and its reply now answers less, not more:
  rule 11), "No sé si tengo que declarar algo" ("Dígame qué trae y le digo", held), "¿Y si traigo una manzana?"
  (what-if = a question), "Tengo una manzana pero es del avión", "Tenía una manzana pero me la comí", "No sé, creo
  que no" at the dog, "Traigo una manzana, no, perdón, un plátano", "¿Cuándo llega mi maleta?" (q_when with the noun).
- "¿Cuánto dinero puedo traer?" got "Only if you bring more than 10,000" (rule 11): its own reply `ans_cash_amount`.
- Rule 21: "No, solo una pregunta" at Itzel's "¿Algo más?" wasn't understood; and a bare "Sí" there got "¿Qué pasó?".
  Now `one_more_q_ctx` and "Claro, dígame", her part stays open.

**Tests:** 16 NLU tests (8 traps) and one sim (polite answers never pay; gifts under with cash over).
Kept: the structure, the dog twist, the lane and allowance facts (match ANAM), Spanish and glosses (read on seeds 3, 8).

**For the lead:** the rough rates in `declare_cash` (18 pesos, 0.9 euros to the dollar) only decide "clearly under /
clearly over"; between 8,500 and 11,500 dollars' worth Medina states the rule. The writer's NEEDS stand (slots.ts
"diez mil"; PART_VERBS traigo/llevo/traje; TOWN.md task 6 lanes instead of the semáforo).

## Audit (5 Nov 2026)

A fresh reviewer, both texts, the ten points of the audit brief. Read: STYLE.md, AUTHORING-ES.md ("Rules from the
reviews"), the brief, this file, the cross-cutting leads (AUDIT/cross, AUDIT/neutral), the situation file, the corpus and
the blind set; the transcripts at seeds 3 and 7 (all 18 sims) before and after; about 90 probe turns (tools/probe.ts) at
every question, offer and the twists. ANAM's "Equipaje y franquicia" re-read on 5 Nov 2026 for the personal-luggage
answers (below).

**Found 23, fixed 23** (by point: 1:2 2:0 3:0 4:2 5:2 6:0 7:9 8:1 9:7 10:0).

1. **Spanish.** "Depende de cuánto valen" → "valgan" (an unknown value takes the subjunctive; flagged). "Traigo unas
   manzanas" got "Así que esa manzana se queda aquí": a plural said by the learner now gets "Así que eso se queda aquí"
   (the existing `stays_here_all`); the snack the officer finds stays singular.
2. **tú/usted**: usted throughout, the new lines and hints too. Nothing found.
3. **Names**: Itzel and Agente Medina, no one else of either name in the edition. Nothing found.
4. **Facts.** "La carne no puede entrar al país" → "La carne fresca no puede entrar al país": SENASICA (as cited above) bars
   fresh meat, and cured meat already goes to its inspectors here, so the old line contradicted `check_senasica`.
   "Perfecto. Se la llevamos en menos de 24 horas" was a promise for a bag not found yet → "Perfecto. Normalmente se la
   llevamos en menos de 24 horas" (as `ans_when` and the other variant say). Checked and kept: the taxis by the exit
   (s65a says the same), flight PC 482 (the hall's sign), Calle Flamboyán 23 entre Hidalgo y Juárez (TOWN.md), 984 (the
   Riviera Maya's area code), the 500-dollar allowance, the 10,000-dollar cash line, the lanes, no semáforo.
5. **Glosses.** `gift_whatif_less` had "no | paga" (S-NEG: one unit, "you don't pay"). The greeting's flag called "se le
   ofrece" the shopkeeper's formula; Itzel isn't one ("the polite formula of shop and service staff").
6. **Spelling, ¿¡**: nothing found (the cross-check's candidates are correct: "en que" in "¿Algo más en que le pueda
   ayudar?" is a relative).
7. **Questions and offers left open.**
   - Rule 17: "¿Cuánto cuesta?", "¿Tiene costo?", "¿Cuánto me cobran?" at the delivery offer weren't understood; now the
     delivery's price (free) and the offer again. At the kit offer they now get the new "No tiene costo, es de cortesía."
     and, as for any side question there, the short "¿Entonces se lo doy?" (new) instead of the whole offer again.
   - Rule 10: "No, al hotel no" / "No estoy en un hotel" weren't understood (the last review kept them from booking
     anything); now Itzel asks "¿Prefiere recogerla aquí, o se la llevamos a otra dirección?" (new, two variants; a bare
     yes or no gets the other variant; "Llévenla" there means the other address). Its hints: new group `pick_or_addr`.
   - A delivery to "casa de una amiga" or "un Airbnb" never asked for the street: the bag was to be delivered nowhere.
     A vague place (no hotel name, no street) now leaves the hotel step open for a delivery, and Itzel asks "¿A qué
     dirección se la llevamos?"; if the learner said so before the delivery question, it says "a donde se está quedando"
     (new) instead of "a su hotel". "No sé la dirección" / "Todavía no tengo hotel" looped on "Tómese su tiempo": now
     "No se preocupe: le llamamos para pedirle la dirección" (new) for a delivery, "No hay problema" for a pickup.
   - "¿Cuál es su teléfono?" (the desk's number): before the report "En un momento se lo doy", after it "El teléfono viene
     en esta copia del reporte" (new). At customs it goes back to the desk, like her other topics.
   - Customs: "¿Qué tengo que declarar?" wasn't understood: "Comida, mercancía de más de 500 dólares y efectivo de más de
     10,000 dólares" (new; the three rules the conversation teaches). "No sé cuánto valen" at the gifts' question now gets
     her estimate question (`gift_estimate`, the line the offer probe never reached; read: right).
   - The dog twist: declaring something allowed at the dog's question ("Sí, unos chocolates", or "comida" → "Unas
     galletas") ended the twist and the apple or ham sandwich walked through. Now she checks the backpack and finds it
     ("Permítame revisar su mochila…"), as for a "No"; "Gracias por decirme" is said once.
8. **Hints.** `dc_can` rendered "¿Puedo traer manzana?" / "…galleta?" / "…sándwich?" for count nouns (the chips offer
   them): count nouns now in the plural ("¿Puedo traer manzanas?"), mass nouns bare ("¿Puedo traer queso?").
9. **Accepted answers.**
   - "¿Puedo traer mi laptop?" was read as "delivery + contents": at the desk a yes to the delivery ("Perfecto. Se la
     llevamos…"), at customs "Eso lo ve en el mostrador de equipaje" and then waved through as "nothing to declare". The
     engine reads every person of poder alike (lang.ts), so "puedo traer" matched "pueden traer". New `q_personal` (a
     question about a laptop, phone, camera, medicines, clothes, liquor or cigarettes): at customs "Eso es parte de su
     equipaje personal: no hace falta declararlo" (new), at the desk "Eso lo ve en la aduana".
   - Alcohol and tobacco declarations weren't understood ("Traigo una botella de tequila", "Traigo cigarros", and after
     "¿Qué trae?" "Una botella de tequila"): new `personal_ctx` at customs only, the same answer, nothing declared, the dog's
     question still open. Only one to three bottles are read (ANAM: an adult's luggage takes up to 3 liters of liquor and
     6 of wine, 20 packs of cigarettes, 25 cigars); "diez botellas" stays not understood. Vapes are left out on purpose
     (Mexico bans bringing them in): "¿Puedo traer un vapeador?" is a trap. "No traigo alcohol ni tabaco" is now a no.
   - Whole sentences: "Llegué hace una hora en el vuelo de Houston", "Mi vuelo fue el 482 de Houston", "Le doy mi número:
     984…", "¿A qué hora me la traen?", "Mejor a la casa de mi amiga" / "A otra dirección" (at the delivery question and
     the new one only), "Traigo unos regalos, pero valen menos de quinientos dólares" (the value is taken; "Traigo unos
     regalos y más de diez mil dólares" stays gifts + cash, the sim holds it).
   - Rule 9 (say it once): when the learner asked "¿Cuándo…?" first, the yes to the delivery gets "Muy bien" instead of
     the time again.
10. **Neutral text**: the seven twins (pase de abordar → tarjeta de embarque, listón → cinta, playera → camiseta) say the
    same; no new line has a Mexican-only word; nothing untwinned.

**Spoken lines for the voices:** changed `delivery_ok`[0], `not_allowed_meat`, `ans_pay_depends` (`gift_whatif_less`'s
text is unchanged); new `ask_delivery_stay`, `ask_pickup_or_address` (2), `addr_later`, `ans_kit_free`, `kit_again`,
`ans_contact`, `ans_personal`, `ans_what_declare`; hints `dc_can` (count nouns now plural) and the group `pick_or_addr`.
No templated value is new (no price, time or number list grows). Ids, steps and phases are unchanged; the new pending
`pickup_or_address` has no picture of its own, so the scene keeps the current one.

**Tests:** 20 NLU tests (2 old traps now have their intended reading: "No, al hotel no", "No sé el nombre del hotel"),
4 sims (prices at the offers and "not to the hotel"; a friend's house without the address; customs questions and gifts
with their value; tequila, then the dog and the chocolates). Corpus 242/242 → 289/289, false accepts 0/37 → 0/43; blind
set 53/56 → 53/56 (the same three `_ctx` readings, meaning right).

**Kept as written:** "Lamento escuchar eso" (common in Mexican service talk), "Gracias por decirme", "¿Tiene alguna seña
particular?", the twist's "Llega mañana en el primer vuelo", "¿Me la puedo comer aquí?" unanswered (what happens to the
food stays untaught, as the review above decided).

**For the lead:** (shared, lang.ts) every person of poder is one class, so "Yo puedo llevarla" at the delivery offer is
still read as "pueden llevarla" (a delivery yes); only a whole-sentence intent can beat it, as `q_personal` does. The
brief says the conversation teaches "reclamo de equipaje": only the hall's sign says it, no line does.

## Spain twins (11 Nov 2026)

- 70 Spain twins (lines and hints), 23 items in tests/es/spain/s65b-baggage.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Itzel and the customs officer keep usted.
- Words: un parte (the lost-bag report) and número de referencia for reporte, por internet for en línea, the perfect (no ha llegado, ¿Qué ha pasado?, ¿En qué vuelo ha llegado?, ¿Ha hecho escala?, ya la hemos encontrado, se ha quedado en…, el perro se ha sentado / ha marcado, se me ha olvidado), ¿Pequeña, mediana o grande? and ¿Cómo de grande es?, pegatinas, dentro, coste, tienda for tiendita, customs: ¿Tiene algo que declarar? and lleva for trae, rellenar, pulsar for apretar, 10.000 written the Spain way, el asa for la manija, La recojo aquí, Quisiera hacer una reclamación por una maleta perdida. Entities: small → pequeña, brown → marrón, packaged → algo envasado, candy → caramelo(s) (attrs.spain).
- Grammar: problem, via_ctx, tag_lost, q_copy, q_free, q_form and the dog's forgot take the Spain forms; the sandwich takes bocadillo. Merges: the perfects, cómo de, por internet, se me ha olvidado.
- The size/colour chips show the entity's chip text (chica, café), not the Spain noun: Conversation.tsx chipLabel reads e.chip; a proposal (the chip could use neutralNoun). Kept: semáforo, SENASICA, carril de Auto declaración (Mexico's customs).

## Spain review (12 Nov 2026)

Fresh reviewer (Madrid ear). Checked every Spain twin against the Mexican line and STYLE.md "Spain Spanish": register, vosotros/os agreement, the perfect, Spain's words, glosses, Mexican-only names, spelling, and the Spain corpus.

- Read every twin: usted kept throughout, Spain's words right (billete, tarjeta de embarque, móvil, gafas, portátil, aseos, maleta, facturar, coger, aparcamiento, coche, jersey), the perfect for what just happened, "Ya está" for "Listo", Mexican-only names kept. Meaning, glosses and spelling: no problems found. No changes.
