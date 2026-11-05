# s72-cafe: "¿Para aquí o para llevar?" (Café La Ceiba, Mariana)

One of the three Spanish models (with s32-mercado and s66-taxi), written before the reviews of the batches, so it had
no review, no corpus and no held-out set until this audit.

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral). **Checked:** every line, twin, flag and hint against STYLE.md,
AUTHORING-ES.md ("Rules from the reviews"), TOWN.md ("Getting around (from the 3D town)", 13600daf), the café's menu
board in the Spanish theme, s62/s69/s73's café facts, the cast; the transcripts (`review.ts` seeds 3 and 7, all sims ×
12 seeds); about 120 probe turns (`tools/probe.ts`, the regular's "usual" played with a remembered drink); ~300
learner sentences step by step; two blind held-out batches; the voice line list for s72 (`lines-es.ts`); AUDIT/cross
and AUDIT/neutral; the Spanish offer probe (both texts).

**Gates:** tsc clean; check-content 0 errors, 0 warnings, NLU tests 93 → 111/111, sims 8 → 13, each 12/12 seeds, fuzz
80 with no crash; corpus (new) 315/315, 0/34 false accepts; held-out (new) 86/86, 0/9; offer probe 0 flags (13 offers,
Mexican and neutral); vitest es green.

**Found by point** (34): 1: 3 · 2: 0 · 3: 0 · 4: 5 · 5: 3 · 6: 1 · 7: 20 · 8: 0 · 9: 1 · 10: 1. **Fixed:** 34.

1. Natural Spanish (all lines read natural and Mexican: "¿Qué le sirvo?", "¿Gusta algo de comer?", "¿Se la caliento?",
   "¡Ahorita sale!"):
   - `ask_size` "¿Y de qué tamaño lo quiere?" was said for a horchata and an agua de jamaica (la). Now `ask_size_it`,
     "¿Y de qué tamaño {lo@X} quiere?", said with the drink, only for one drink of its kind.
   - `ask_temp` "¿Lo quiere caliente o frío?" for two lattes (los… fríos): now `ask_temp_it`, only for one drink;
     two get "¿Caliente o frío?".
   - Taking back the only drink gave two acknowledgements ("Muy bien, sin capuchino." + "¡No hay problema! ¿Qué le
     sirvo entonces?"): now only the second.
2. tú/usted: Mariana is usted in every line and global line (`mia` isn't informal), hints usted, tú accepted with the
   `tu_staff` tip. Nothing to change.
3. Names: Mariana (s69 sends the learner to her), no clash.
4. Facts and numbers:
   - **The intro** put the café "on the zócalo, under a big ceiba tree"; the 3D town has it on avenida Juárez, across
     from Información Turística, under a green-and-white awning, and no ceiba tree (TOWN.md "Getting around"). Fixed.
   - `restroom`'s two variants gave two places ("al fondo, a la izquierda" / "Ahí, junto a la ventana"): asked twice,
     the learner heard both. Now "Es la puerta del fondo, a la izquierda."
   - Prices: the board (theme.ts), s69 ("como cuarenta y cinco pesos") and s73 (café $40–55 at a sit-down place)
     agree with the menu (americano $35/40/45, latte $45/50/55, plant milk and iced +$10, extra shot +$15, concha $25,
     torta $65); left as they are. Every price is a multiple of $5, so every total is.
   - **Values the voices couldn't say:** `price_is` "{X.np} cuesta {$price}." had an item and a value, which the line
     list never expands: 3 of its clips were voiced (the rest in the device voice). Now value-only lines: `price_is`
     "Cuesta {$amount}.", `price_qty` "Serían {$amount}." (the same clips as the total), `price_from` "Depende del
     tamaño: desde {$amount}." (a drink asked without a size), with `{$amount}` $20–$300.
   - `usual` said the drink with its size ("¿un latte grande?"), never voiced; now the drink alone (the yes still
     brings the remembered size and milk). `say_total`'s list stopped at $500, but one turn can order $855 (three items
     of three drinks with every extra): now $20–$1,000 (+300 clips an accent).
5. Glosses and English: `ask_food_more` "something | of | eat" → "to | eat"; `ask_temp`'s flag said "la moka → la",
   but this edition's moka is masculine; "¿Sería todo?" was flagged "Mexican" with no twin (it's said all over Latin
   America): the flag now says so. American English throughout.
6. Spelling: `usual` showed "¿Lo de siempre? ¿un latte?" (compose capitalizes a placeholder after "?" only when nothing
   stands before it, and "¿" does): now "¿Lo de siempre, un latte?". Nothing else (script and dictionary, both texts).
7. Questions and offers (each probed before and after):
   - **Price questions ordered things**: "¿Cuánto cuesta un latte?" at the start was read as "cuánto cuesta" + an
     order ("Son $50." for the order so far, and a latte added); "¿Cuánto cuestan dos conchas?" ordered two; "¿Cuánto
     cuesta un latte grande?" at the size question set the size and gave the medium's price; "¿A cómo está el café de
     olla?" ordered one. **"¿Hay donas?"** ordered a doughnut. Now `ask_price` and `ask_have` are expected at every
     ordering step (as in s32), the price lines answer one item, that many, or "desde" for a size not chosen.
   - **"¿Qué es una concha?"** ordered a concha (and a milk). New `what_is` with Mariana's own answers for the Mexican
     things on her menu (`what_concha`, `what_olla`, `what_horchata`, `what_jamaica`, `what_torta`); anything else
     ("¿Qué es un latte?") gets the global meaning ("¡Buena pregunta! Déjeme mostrarle." and the English shown).
   - **"¿Cuánto cuesta la leche de avena?"** at the milk question chose oat milk (and, on an out-of-oat day, ran the
     twist): now `milk_extra` "Esa cuesta diez pesos más." / `milk_free` "Esa no cuesta extra.", nothing chosen.
   - **"Normal"** to "¿Con qué leche?" set the size to medium: now whole milk at the milk question (a size at the size
     question; "El normal" at "¿Qué café?" is an americano).
   - **"¿Tiene terminal?"** got "Perdón, eso no lo tenemos." (they have one): now a card payment ("Claro, con tarjeta
     sí se puede" before the total).
   - **"Servilletas, por favor"** got where the sugar is: napkins, straws, lids and bags are handed over now.
   - **Dollars** and **the hours** had no answer: `dollars` "Perdón, aquí solo aceptamos pesos." (as the museum, the
     bus and the restaurant) and `hours` "Abrimos todos los días, de siete de la mañana a nueve de la noche." (s62).
   - "¿Cuál es la contraseña?" and "¿Me pasa la contraseña…?" weren't understood, and `wifi`'s "¡Sí!" answered a
     wh-question (rule 11): now "¡Claro! La contraseña es ceiba2026."
   - "Quédese con el cambio" before the total marked the order paid: now it pays only once there's a total.
   - **An order after paying was free**: "¡Ah! Y una concha" at the receipt question or the goodbye was added with no
     charge. Now the pay step comes back for what was added ("¡Claro! Son $25."), paid like the rest (`paidSoFar`), and
     the goodbye comes again ("¡Ahorita sale!…"). At the goodbye "¡Qué rico café, gracias!" was read as "qué rico" + an
     order: now a compliment, `glad` "¡Gracias! Lo hacemos con mucho cariño."
   - At the pastry offer, "¿Cuánto cuesta?" gave the whole order's total and dropped the offer, and "¿Y cuánto cuesta
     una?" added a concha: now its price, then the offer again ("Cuesta $25. ¿Le doy una concha?").
   - "Y un pan dulce" / "Quisiera algo dulce" got the whole food list with the ham tortas: now "¿Qué pan le doy? Hay
     conchas, cuernitos y donas."; "¿Tienen té / café / pan dulce?" got only "¡Sí, claro!" (and "De manzanilla" after
     the list wasn't understood): now the kinds, and the pick is the order.
   - Two drinks: "¿Chico, mediano o grande?" twice, never saying which: now `ask_size_of` "¿El latte, de qué tamaño?",
     "¿La horchata, de qué tamaño?".
   - "Un café negro / sin leche" asked "¿Qué café le gustaría?": now an americano. "¿Tienen leche de coco?" got the
     general menu: now the milks. "¿Tienen leche de avena?" on an out-of-oat day: the milk question no longer lists oat.
   - Breadth, not understood before: "¿Me prepara / me hace…?", "¿Podría darme…?" (and for the water, the password,
     the receipt, napkins and sugar, so they never read as an unknown order), "Tome", "Aquí mismo", "Me quedo", "Lo
     quiero para llevar", "Con eso", "Ya es todo", "Por el momento es todo", "El más pequeño", "El de en medio", "La de
     almendra", "El de la casa", Apple Pay and "pago con celular", "¿Venden pan dulce?", "¿El baño?", "Un americano,
     pero sin azúcar".
   - Left (not understood, safe): four or more of a drink ("Cuatro capuchinos": quantities stop at three; a trap
     keeps it from ever ordering one), drinks not on the menu said bare ("Un frappé"), "Lo de siempre" unasked, "No sé,
     el mediano".
8. Hints: right, natural, usted, all accepted; nothing to change.
9. Accepted answers: **no corpus or held-out existed.** New `tests/es/corpus/s72-cafe.json` (349 items: 315 to
   understand, 45 of them with `not:` meaning checks, and 34 traps: prices, "¿Hay…?", "¿Qué es…?", the milk's price,
   "Normal", "Ya pagué", dollars, goodbyes that aren't orders, "Cuatro capuchinos"…) and `tests/es/heldout/s72-cafe.json` (95 items, written
   blind in two batches: the first before any fix, 35/44; the second after the first fixes, 34/42, 0 misunderstood;
   both now 86/86, 0/9). 18 NLU tests and 5 sims (questions at the counter; the milk's price then "normal"; asking
   what they have; a pastry after paying; two drinks).
10. Neutral: the 7 twins are right. **Added** `ask_food_more`'s twin "¿Quiere algo de comer?" (the flag says Mexican;
    s74 and s87 twin "¿Gusta…?"). The new lines need none.

**Voiced lines** (for the voice freeze): changed `wifi[0]`, `restroom[1]`, `usual`, `price_is`; moved with the same text
`ask_size[2]` → `ask_size_it` (now lo/la), `ask_temp[1]` → `ask_temp_it`; new `price_from`, `price_qty` (the total's
clips), `milk_extra`, `milk_free`, `ask_size_of`, `dollars`, `hours`, `glad`, `what_concha`, `what_olla`, `what_horchata`,
`what_jamaica`, `what_torta`; neutral only: `ask_food_more`. Value lists: `{$price}` $20–$1,000, `{$amount}` $20–$300.
Ids, steps and phases unchanged; the new pending `kind_have` keeps the picture it comes from.

**For the lead:** TOWN.md "Hours the conversations share": Café La Ceiba every day, 7 a.m. to 9 p.m. (now said here),
pesos only; s69's "El Café La Ceiba, aquí en la plaza" is off the 3D town (the café faces Información Turística on
Juárez); the 3D café has no restroom door ("al fondo, a la izquierda"); compose.ts could capitalize a placeholder after
a lone "¿" or "¡" mid-line (none left in the edition); reach-es.ts could bound `s72-cafe:price_is` to one item ($95) and
`ask_size_of` to the sized drinks (a few dozen clips).
