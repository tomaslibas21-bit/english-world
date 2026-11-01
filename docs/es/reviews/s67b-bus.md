# Review: s67b-bus ("¿Este camión va al centro?"), writer's commit fb7f922f
| | Writer (fb7f922f) | After review |
|---|---|---|
| tsc / vitest | clean / 257 | clean / 257 |
| check-content | 76/76 NLU, 7 sims 12/12, fuzz OK, 0/0 | 97/97 NLU, 8 sims 12/12, fuzz OK, 0/0 |
| corpus | 245/245, 0/49 false accepts | 281/281, 0/51 (38 review probes added) |
| blind set (41, 7 traps, written before reading) | 37/41 = 90.2%, 0 traps | 39/41 = 95.1%, 0 traps |

Blind misses left: "No sé a dónde voy" → `deny` (gives the route's stops, better than dest_unknown); "Tome, doce pesos"
→ `pay_cash` with the price (right). The writer's claims held; the problems were states recorded from questions.
## Fixes (about 124 lines added and 32 changed in the conversation; ~50 of them must-fix)
**meaning-safety (must-fix, ~20 lines)**
- "¿Doce pesos?" / "Doce, ¿verdad?" (cash_ctx) **paid the fare**, at the fare step and at "¿No trae algo más chico?".
  A question now gets "Sí, $12" / "No, son $12" and nothing is paid. The smaller-bill question stays open.
- "No, la siguiente" at "¿Le paro?" got "Sí, aquí es" and **the learner was put off the bus**. A leading no now gets
  "Bueno, me avisa" (was "¿dónde le paro?", which didn't fit "the next one").
- "¿Este no va al centro?" (Doesn't this one go downtown?) was `dest_neg`, answered "Ah, bueno, ¿entonces a dónde va?".
  It is now ask_goes, but only with "este"/"este camión". Bare "No va al centro" stays dest_neg (a likely "No voy", rule 10).
- "Sí" to "¡Iglesia! ¿Bajan?" was ignored (now "Todavía no…"); "¿Es el siete?" got "No, son $12" (now `route_q`).
**understanding (must-fix for the common ones, ~30 pattern lines)**: "¿Aceptan dólares?"/"No tengo pesos" (new
`pay_dollars`: "Perdón, solo pesos" + ATM), "¿Dónde hay un cajero?" (`ask_atm`), "¿Cuánto cuesta (para) ir a la playa?",
"¿Puedo tomar este camión para ir…?", "¿Este camión me sirve para…?", "Un boleto, por favor", "Son doce, ¿no?", "¿Puedo
pagar con cien?", "No, solo traigo ese", "No, es la primera vez que vengo", "Sí, sí sé", "Más o menos" (got "¡Ay, qué
pena!" from the global how-are-you), "¿Puede avisarme?", "¿Es lejos?", "¿Es la próxima?", "¿Me puede bajar aquí?".
**rule 11 (~10 lines)**: "¿Le pago al bajar?" / "¿Dónde pago?" / "¿Tengo que pagar ahora?" got only "Son $12". They now get
"Aquí conmigo, al subir: son $12" (or "Ya pagó"). "No traigo efectivo" got "No, perdón, nomás efectivo". It now gets "Uy,
aquí es solo efectivo" + the ATM. "¿Cuánto cuesta ir a la playa?" now goes through the writer's deferral ("Por ahí
pasamos. Son $12"), not "Sí, sí va".
**spanish / facts (polish, ~8 lines)**: dest_unknown "Mmm, no conozco ese lugar" (said to "¿Va a Tulum?", even about
the terminal she stands at) → "Mmm, no, esta ruta no va para allá" + the route's stops. Route order mercado → centro (the
stop counts 3, 4). "Es $12" → "Serían $12". "Sí, por ahí también pasamos" after a change of mind → "Por ahí también
pasamos". "Sí, en el zócalo" on the way to the museum no longer changes the destination to the centro.
**structure (polish, 6 lines)**: the world hook's `loc` ids restored (plus market, clinic); steps, intents, twists match.
**gloss-english / twins**: new lines glossed by STYLE.md (merge "al subir"); the writer's flags sit on the right units.
Mexican-only words stay few (pásele ×2, nomás, camión), each twinned; the new lines use none.
**tests**: 21 NLU tests (8 traps) and 1 sim (price check, dollars, "No, la siguiente"); 38 corpus probes.
## For the lead / owner
- The writer's NEEDS ("no traigo" in lang.ts `no`) stands. Vague on purpose: $12, every 15 min, ~10 p.m., no change for $200.
- Engine note: `c.hold()` keeps the old step, so the next turn is parsed with that step's expects.
