# Review: s70-museum (writer's commit 5a821473)

## Gate and blind set
| | Writer | After review |
|---|---|---|
| tsc / vitest | clean / 257 | clean / 257 |
| check-content | 127/127 NLU, 11 sims 12/12, fuzz 80, 0/0 | 146/146 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 447/447, 0/81 traps | 467/467 (548 items), 0/81 traps |
| blind set (39 items, written before reading the draft) | 37/39 (94.9%), 0/3 traps | 39/39 (100%, not blind any more), 0/3 traps |

A strong draft: the writer's own rule-10 handling ("¿Entrada general o de estudiante?"), pending-aware price and
"incluida" answers and the Sunday twist all held. The must-fixes came from playing whole conversations.

## Fixes (src file: 50 lines changed or removed, 145 added; ~60 must-fix, ~25 polish, ~60 tests)
- **meaning-safety, must-fix (8):**
  1. "¿Es gratis?" at paying on a Sunday got "Viene incluida en su boleto. Está arriba…" (the exhibition). Bare "es gratis" / "se paga aparte" before paying now answer about admission (the Sunday rule, the total or the prices).
  2. "¿Dónde está la salida?" was read as the new exhibition ("sala" sound-matched "salida"). "sala" left the exhibition words; new `ask_exit` (and "la sala" → where to start).
  3. A bare "No importa" lived in `adult_ok` (rule 2): at "cerramos en 45 minutos" it booked a general ticket. Now `never_mind_ctx`, expected only at the ID-price and closing questions.
  4. "Tengo credencial pero no la traigo" parsed as have_id + no_id ("Gracias, está bien" then "sin credencial"). One `no_id` pattern now.
  5. "No soy estudiante" at "¿Hay algún estudiante…?" for a group was read as all adults; it speaks for one person, so Iván asks for the breakdown (rule 10).
  6. `more_no` ("No traigo nada", "Nada") before paying set the questions step done; it now acts only after paying.
  7. Rule 3: a guide ordered before the offer ("Dos boletos y una audioguía") was added with no price; Iván now says "La audioguía cuesta $50" once.
  8. "¿Puedo pagar en efectivo?" after the total gave change before any money; now "Sí, claro" and waits for "Aquí tiene".
- **understanding (~25 patterns):** "No soy estudiante, (quiero) un boleto general", "Sí, uno" (→ breakdown; at "¿Entrada general?" a yes), "No, solo yo soy estudiante", "uno para mi hijo de diez años", "Mejor regreso mañana" (before buying: opening hours, and 45 minutes still enough), "No tengo tarjeta" (`no_card_ctx`: at paying, cash; at the residence card, no card), "No, prefiero efectivo", "No tengo efectivo, pago con tarjeta", "¿Se puede tocar?" (`ask_touch`), "¿Está incluida la exposición/la audioguía?", "¿Dónde compro postales?".
- **spanish / rule 11 (polish, ~14 lines):** "Sí, le alcanza…", "Sí, viene incluida…", the full exhibition answer when it was never named, "No, la audioguía cuesta $50 aparte", "¿Es gratis hoy?" → "Hoy no. …", res_weekday said "Entre semana" (wrong on Saturdays) → "Hoy todos pagan lo mismo…", "sin credencial vigente" (covers an expired ID), "¿En qué idioma las quieren?" for two guides; repeated re-asks now alternate (pay_how / total, two guide reminders).
- **gloss-english (polish, 1):** greeting "Welcome to the Costa Maya Museum!". A third of the glosses read: no errors; flags checked against units.
- **numbers, twins:** prices and totals right in every sim (40+50, 2×80+50…); paquetería twins correct (5 lines). No changes.
- **structure:** id, 8 steps, all English intents and both twists kept; the Sunday twist and the writer's new intents kept.
- **tests:** NLU 127 → 146 (21 added incl. the blind traps, 1 expectation corrected: "No tengo tarjeta" at paying is now understood as cash); 2 sims (Sunday "¿Es gratis?" + cash question + exit; closing soon with "No importa", come back tomorrow, no card); corpus +20 items.

## For the lead / owner
- `// NEEDS:` engine: after a negative piece, "quiero / quisiera / pago / prefiero" don't start a new piece, so "No tengo efectivo, quiero pagar con tarjeta" fails everywhere; the common forms are patterns here.
- Facts: s70 follows s62 (ten to five, closed Mondays); the writer says s69's open_museo says nine to five (s69 is not on this branch): one must change. Prices ($80 / $40 / $50 guide, kids under 12 free, 60+), free Sundays for Mexicans and residents (INAH-style) and the Saturday-noon tour are plausible, not researched.
- Kept from the English design: "No" at "sin credencial… ¿Está bien?" gets "Así son las reglas" and the ticket stays general.
