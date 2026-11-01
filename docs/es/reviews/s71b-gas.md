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
