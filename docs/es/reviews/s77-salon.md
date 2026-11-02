# Review: s77-salon ("Nada más las puntas"), writer's commit 6bce00b7

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc` / vitest | clean / 288/288 | clean / 288/288 |
| `check-content --verbose` | 93/93 NLU, 11 sims 12/12, fuzz 80, 0/0 | 107/107 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 235/235, 0/12 false accepts | 241/241 (100%), 0/12 (7 items added, 1 corrected) |
| blind set (40 items, written before reading) | 32/36 (89%), 0/6 traps | 36/36, 0/6 (not blind any more) |

The writer's claims held, but whole-conversation probes (rule 22) found 8 meaning-safety bugs, 3 of them with money.
Conversation file: 29 lines changed or removed, 90 added (~45 must-fix, ~15 polish, ~30 sims and tests).
## meaning-safety (must-fix, ~30 lines)
1. **"Tengo cita" = no appointment**: `appt_none` had `[no] (no)? tengo cita (no)?` (all optional), so it started the walk-in
   flow and its wait twist. Now `[no] no tengo cita no`.
2. **"No tengo cita a las tres"** found the 3:00 booking. `#notat`: at three (or no hour) = no appointment; another hour stays
   "No, tengo cita a las cuatro".
3. **Lost comma at the result** (rule 10): "No, está demasiado corto", "No, me cortó demasiado" were `love_it`, so the twist
   gave "Gracias por ser tan comprensivo" and no discount. New `short_amb_ctx` (#amb) at the result, `more_q`, `fix_q`: Paty
   asks "¿le gusta así, o le cambio algo?". New sim "lost comma" records the discount.
4. **"No, está muy caliente" = water fine** (`no (esta)? (muy|tan)? (caliente|fria)` in `water_ok`): removed; the hot reading
   only adjusts the water and asks again.
5. **"No con tarjeta, en efectivo" paid by card** (rule 18): whole patterns in `pay_cash`, `pay_card`, `pay_phone`.
6. **"No traigo efectivo" charged the card** at once (a later "Con transferencia" was recorded as card). Now it offers card
   or transfer and charges nothing (`no_cash_line`).
7. **"Al natural" added the $50 blow-dry** (`#natural` set `blowdry`); Paty's own "Muy bien, al natural" is the no-dry line.
8. "¿Puedo dejar propina?" before the result got "¡Qué detalle!": now "la puede dejar cuando pague". "Así está bien" at
   "¿En seis semanas, a la misma hora?" was a silent no: now asked again (`book_amb`, rule 17; new sim).
## understanding (must-fix for the blind fails, ~10 lines)
"Quiero un cambio, algo mucho más corto", "Que no quede muy corto", "No más corto", "Me lo dejó demasiado corto",
"Ahorita no, yo le llamo"; polish: "Café no, agua", "Capas no".
## numbers (must-fix, 3 lines): "Una pulgada y media" got "¿2 pulgadas? Son como 4 centímetros"; new line `inch_15`.
## spanish, rule 11 (~14 lines)
Must-fix: "¿Y usted?" got the weekend answer whatever Paty asked; now per topic (`jessie_from`, `jessie_vacation`,
`jessie_pets`). Polish: "No" to "¿De dónde es?" got "¿A descansar?"; "Todavía no" (travel) now "¡todavía hay tiempo!"; a
bare "No soy de aquí" no longer gets "Yo nunca he ido"; "¿Cuánto cuesta el lavado?" gets the extras' price only.
## gloss-english, twins, facts, structure: no change (a third of the glosses read; 7 twins flagged right; TOWN.md agrees)
## For the owner (the writer's open questions, unchanged); nothing for the lead
Prices (cut $200, bangs $60, wash/blow-dry $50, $50 off), "Mucha gente deja un diez por ciento", the terminal's tip
question, the vague factura answer.
