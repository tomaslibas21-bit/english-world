# Review: s71b-gas ("Lleno, por favor", Doña Chela at the pump), writer's commit 081453e4

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc` / `check-content --verbose` | clean; 83/83 NLU, 8 sims 12/12, fuzz 80, 0/0 | clean; 95/95 NLU, 11 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 171/171 = 100%, 0/28 false accepts | 182/182 = 100%, 0/28 false accepts |
| blind set (41 items, written first) | 39/41 = **95%**, 0/2 traps | 39/41 = 95%, 0/2 traps (not tuned) |

Blind misses: "Ponme 20 litros" (liters), and "No lo llene, solo doscientos", which was read correctly as `amount_change_ctx`. Understanding
was strong. The bugs were in the handlers, and I found them by playing whole conversations.

## Fixes (file +126 / -30: ~70 must-fix, ~25 polish, ~30 tests)

**meaning-safety / binding (must-fix)**
1. "Aquí tiene quinientos" for an $861.50 tank recorded `paid` ("Gracias"). Now: "Perdón, son $861.50; faltan $361.50.", then she waits.
2. "Sí, pero no el aceite" checked the oil. It's now `check_no #but`, which does the rest of her offer. "El aceite no, las llantas sí" is now understood.
3. "¿Está cerca?" got "No, a dos cuadras" (rule 11). The far lines now have no sí/no: "A dos cuadras nada más", "Está cerquita".
4. "Oiga, ¿todo bien? ¿Algún problema?" + "No" could mean either; it's now one question ("¿todo bien?").
5. "Sí" to "¿Se le ofrece algo más?" in the trouble step jump-started the car. Yes takes her offer only right after she makes it.
6. "Mi carro hace un ruido raro" got "¿No arranca? Ha de ser la batería". It's now `#other`: she sends the learner to the mechanic.
   "Se me murió la batería" gets the cables offer. "Tengo un problema con mi carro" is only `trouble_vague`.
7. "Mil doscientos de magna" charged $1,200. The pump stops at full, so she charges the full tank ("¡Listo, ya quedó lleno!").

**understanding (polish):** "Medio tanque" (new `half_tank`, "unos cuatrocientos pesos"), "No quiero lleno, quiero trescientos", "No lleno, quinientos", "No, no hace falta revisar nada", "Pago con tarjeta de débito". "¿Cuál es la diferencia / la más barata / la verde?" now get answers to those questions (`grade_diff`, `grade_colors`).

**spanish / flow:** must-fix: debit said "Marque su NIP" before "Acerque su tarjeta… Listo, ya pasó"; it's now one line, card
then NIP. Must-fix: "Pago con tarjeta de débito" said "Listo, ya pasó" twice. Must-fix: in the zeros twist, "Gracias" made her repeat "Le pongo sus
$500"; a re-ask now means she sees the pump herself. Polish: "Sí, allá atrás" / "Sí, hay uno adentro" answered "¿Dónde…?",
so the sí is gone. The bye "¡Que le vaya bien!" came right before the global one, so I removed it. For a flat tire she says "¡Suerte con la llanta!".

**gloss-english, numbers, twins, facts:** I read every line and gloss and checked the flag indexes, the new ones too (the new carro line
has its twin). The Mexican-only share stays about 1 in 8. Town facts stay vague, and the prices are worded as approximate.

**tests:** 12 NLU tests (5 meaning-safety), 3 sims (a short bill; more than a tank + "sí, pero no el aceite" + debit in one go; trouble
with "No", a question, "Sí" and the tow truck), 11 corpus items (5 traps).

## For the lead / owner
Liters ("Veinte litros de magna") aren't understood: that needs a per-liter price and liter counts in lines. The writer's two `// NEEDS:`
stand. The zeros mission is ticked even when she catches it herself, because the gate needs the checklist closed.

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), against N/AUDIT-BRIEF.md's ten points; the cross and neutral leads
(AUDIT/cross, AUDIT/neutral), TOWN.md "Getting around" (on origin since 5 Nov) and its "Named in the conversations, not
built" note for s71b; transcripts at seeds 3 and 7, ~60 probe conversations (tools/probe.ts) and the voice value lists
(tools/es-voices/values-es.ts over 300 random conversations + every sim: each value a line was said with is in its list).

| Check | Before | After |
|---|---|---|
| `check-content --verbose` | 95/95 NLU, 11 sims 12/12, fuzz 80, 0/0 | 108/108 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 182/182, 0/28 false accepts | 211/211, 0/31 false accepts (+29 items, +3 traps) |
| held-out | 39/41, 0/2 | 41/41, 0/2 (two expectations corrected, below) |

**Found 37, fixed 36, by point:**

1. Natural Spanish: 0. The lines read as a Mexican attendant's ("Sí aceptamos" is the emphatic yes, "¿Algo más en que
   le pueda ayudar?" a relative "que").
2. tú/usted: 0 (usted throughout, hints too). 3. Names: 0 (Doña Chela only; no clash).
4. Facts, 6: (a) the way to the highway turned right (into the airport, the avenue's end) at a traffic light the town
   doesn't have: now left out of the station and left again on calle Itzamná, which leaves town inland; (b) the mechanic
   "a dos cuadras, sobre esta misma calle" and (c) the vulcanizadora "a la vuelta, a la derecha" (the station is avenida
   Juárez's last building; TOWN.md puts both off the map): now "sobre la calle Itzamná, ya saliendo del pueblo", with
   "¿Está lejos?" answered "Está cerquita; en un minuto llega" (the tire shop, by car) and "A unos cinco minutos, nada
   más" (the mechanic); (d) the change she says aloud wasn't in its voiced list ($13.60 from $800, $38.50 from $900:
   only $1,000/$2,000 bills were): change now has its own list (`amount`: any $5 up to $1,000 from an amount, bills in
   $50s from a full tank) and any other change is "Gracias, aquí tiene su cambio"; (e) "Perdón, son {$total}; faltan
   {$price}" had no list for {$total}, so most of its clips would have been the device voice: now "Perdón, no alcanza."
   + "Son {$price}." (then "Todavía no alcanza."); (f) left: an amount asked in odd pesos ($322) isn't voiced (whole $5
   from $20 to $1,500 are, the s31/s32 standard). Prices checked: magna ~$24, premium ~$26, diésel ~$27 a liter, a fill
   of $786.40–$937.80 = 33–39 liters, "un tanque lleno, unos mil" = ~42 liters: realistic for the Riviera Maya, Nov 2026.
5. Glosses and English, 7: six British "Shall I…?" (ask_check[0], ask_glass, extras_again, glass_again, ask_amount[1],
   too_much) → "Should I…?" / "Want me to…?"; the hint gloss "check me" → "check (for) me".
6. Spelling, ¿¡: 0.
7. Questions and offers, 19: "Sí, de magna" to "¿Se lo lleno?" lost the yes (she asked how much; new `fill_yes_ctx`);
   after "¿Cuál me recomienda?" an "Ok" got "¿Cuál, magna o premium?" (a yes now takes her advice); "No sé" at the fuel
   got "Tómese su tiempo" (now her advice, the grade step's `help`); liters ("Veinte litros de magna") weren't understood
   (now "¿En litros? Mejor dígame en pesos: ¿cuánto le pongo?"); gallons ("Diez galones") the same (now "Aquí vendemos por
   litro" + the price); "¿A cómo está la premium?" got magna's price, the diésel none (new lines: premium ~$26, diésel
   ~$27); "En dólares", "Con dólares", "Le pago en dólares" not understood; **"Aquí tiene cincuenta dólares" was read as 50
   pesos ("faltan $736.40")**; "¿A cómo toma el dólar?" no answer (now $17, under the bank's $17.20 in s78; asked again,
   she takes dollars, the change in pesos, a short amount noticed); **"¿Cuánto cuesta?" at her jump-start offer gave the
   fuel total** (now "No cuesta nada, no se preocupe"; the tow truck and the mechanic: "Eso depende; ellos le dicen
   cuánto"); "¿Cuánto cobra la grúa?", "¿Cuánto me van a cobrar?" not understood; her offer (cables, air) was dropped after
   a side question (now once more: "¿Entonces, le pasamos corriente?" / "¿Entonces, le pongo aire?"); **cash after "faltan"
   wasn't added** ("Aquí tiene setecientos" + "Aquí tiene cien más" → "faltan $686.40"; now it adds up); "Sí, y el
   parabrisas también" did only the windshield (now her offer and that); "Sí, con factura" not understood, "Sin factura"
   unhandled; a ticket or factura asked before fueling was handed over before paying (now "Claro"/the factura line, and
   the ticket comes with the payment); a tip handed after paying was thanked twice; "¿Dónde está la tienda?" not
   understood (now "Allá atrás, mire", as the restroom line has it).
8. Hints and help, 2: the debit note said "NIP (PIN)" in both texts (now "your PIN (in Mexico, the NIP)"); the
   keep-the-change hint had no note, and following it with a $1,000 bill for $786.40 tips $213.60 (now "When the change is
   a few pesos: it's the tip"). Tip customs checked: $10–20 to the attendant, more for the windshield or the tires.
9. Accepted answers, 2: held-out "Ponme 20 litros" is now understood (liters); "No lo llene, solo doscientos pesos" was
   already read right as a correction (`amount_change_ctx`), which its list lacked. Corpus +29 items, +3 traps (dollars
   aren't pesos, the tow truck's price isn't a call, "Sin factura", "No tengo dólares", "No, y el parabrisas tampoco").
10. Neutral, 1: pin[0] "marque su NIP" had no twin (s78 twins NIP → PIN): now "marque su PIN". The other 13 twins check out.

**Voices** (for the lead's line list): 11 new lines (liters, short_again, dollars_ok, dollar_rate, store,
gas_price_premium, gas_price_diesel, jump_again, air_again, free_help, cost_depends); 8 changed (short, directions,
far_shop, far_mech, flat_reply + its twin, other_reply, mechanic, tire_shop); pin's new neutral twin; change_is says the
same with its own 260-value list; zeros_q_fix is now said with $150 only (its call is literal), not the whole list. The
conversation's value clips go down (~1,620 → ~1,240 a set).

**For the lead:** TOWN.md "Named in the conversations, not built" can now say: s71b's mechanic and vulcanizadora are on
calle Itzamná where it leaves town (south of calle Uxmal), and the way to the highway is left out of the station, left on
Itzamná; "Facts" can add premium ~$26, diésel ~$27 and dollars at $17 at the gas station. Odd-peso amounts (4f) stay in
the device voice unless the owner wants every whole peso voiced (~1,500 values × 4 lines).
