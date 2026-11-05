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

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), after the cross-cutting audit (N/AUDIT/cross/s67b-bus.md: no name
clash, no spelling or ¿¡ issue, no British English, the twins consistent, nothing from the offer probe) and against
docs/es/TOWN.md "Getting around (from the 3D town)" (the helper's section, es-town-directions 5bfd2d46). Read: the
transcripts of all sims at seeds 3 and 7, both texts (a neutral run diffs only at the five twins); ~70 probe turns
(tools/probe.ts) over side questions, refusals, the twists and the closing.

| | Before the audit | After |
|---|---|---|
| check-content | 97 NLU, 8 sims 12/12, 0/0 | 112 NLU, 10 sims 12/12, fuzz OK, 0/0 |
| corpus | 281/281, 0/51 false accepts | 330/330, 0/55 (+53 items, 12 with traps) |
| held-out | 39/41 (the two misses were right answers) | 41/41 (their expectations widened, see below) |

**Found 26, fixed 26, by point:**

- **4. Facts and the 3D town (6).** Route 7 didn't fit the town: the clínica "6 stops, 15 minutes" is a minute's walk
  from the terminal on calle Hidalgo; the mercado came before the zócalo; rides up to 20 minutes in a town whose far
  end is ten on foot; and "¡Iglesia! ¿Bajan?" ("yours is the next one") was called before any stop, though the church
  stands at the zócalo (it was the centro-goer's own stop, and after the mercado). Now, following TOWN.md (the city bus
  goes along avenida Juárez): terminal → **clínica** (2 stops, ~2 min) → **iglesia** at the zócalo's east end (3) →
  **zócalo** at calle Ceiba, the museum's door across the street (4, ~5 min) → **Hotel Mar Azul**'s door (5) → the
  **mercado**'s door on avenida del Puerto (6, ~10) → **El Muelle** (7) → the **beach**'s quiet east end by the
  lighthouse (8, ~15, the last stop). "¡Iglesia! ¿Bajan?" (the mid picture's church) is called only on the way to the
  zócalo. The recital says "la clínica, el centro, el mercado y el malecón, y termina en la playa". The airport: "mejor
  tome un taxi" (s62, TOWN.md; the terminal's board has no airport bus: it said "salen autobuses de la terminal"). The
  intro: route 7 waits at its bay inside the terminal (the 3D scene), not "at the curb"; and no change for "a 200 or a
  500", as the code does.
- **5. English (1).** "Shall I stop (here)?" → "Want me to stop (here)?" (American English; text only).
- **7. Questions and answers (18).** "¿Va a Playa del Carmen?" was the beach ("Por ahí también pasamos"): Tulum,
  Playa del Carmen, Cancún and Mérida (the terminal's board) now get "Esta ruta solo va por el pueblo. Para allá hay
  autobuses aquí en la terminal: el boleto se compra en la taquilla." "¿A dónde va este camión?", "¿Por dónde pasa?",
  "¿Cuál es la ruta?", "¿Hasta dónde llega?" weren't understood: the route's stops. The church, the bank, Correos and
  "el restaurante El Muelle" got "no, esta ruta no va para allá" (El Muelle "no" and "yes" in one turn): the church is a
  destination (its own stop), the bank and Correos are the zócalo's, El Muelle the malecón's; a place she can't place
  now gets "Mire, esta ruta pasa por…" instead of a false no. "¿Está ocupado este asiento?" → "Sí, donde guste" (now
  "No, está libre"); "¿Dónde me siento?" → "Donde guste"; "¿Dónde está el timbre?" / "¿Cómo pido la parada?" got
  "Sí, toque el timbre…" (now the where, "junto a la puerta de atrás", and the how); "¿Qué ruta es esta?" → "Sí, es la
  ruta 7" (now "Es la ruta 7"); "¿Es el siete?" at the fare step → "No, son $12" (read as a price; route_q is expected
  there now). "¿Y mi cambio?" in the 500 twist wasn't understood ("Sí, en cuanto junte cambio se lo doy"; after it,
  "Ya está: no le debo nada"). "¿Ya mero llegamos?" now is "¿Ya casi…?". At the beach, the end of the line, she asked
  "¿Le paro?" and took "No, la siguiente" ("Bueno, me avisa"): now "Es la última parada: la playa." and "No hay
  siguiente: aquí termina la ruta." "¿Dónde me bajo?" at the goodbye was read as "Sí, ya sé…" and **ended the
  conversation silently** (the closing no longer maps affirm/deny; on the ride it gets the stop; after arriving "Ahora
  sí, ya llegamos" instead of "Yo le aviso"). Out of service: "¿Por qué?" → "Ya terminó mi turno"; "¿Cuándo viene el
  12?" got "Pasa cada quince minutos" though it's right behind her ("Ya viene, en un minuto llega"); "¿Qué ruta es?"
  repeated "Perdón, voy fuera de servicio" ("Es la 7, pero voy fuera de servicio"). "¿Hay descuento para estudiantes?"
  wasn't understood: "Solo para estudiantes de aquí, con credencial. Si no, son $12" (vague on purpose, rule 14; never
  a payment).
- **9. Accepted answers (1).** The held-out set's "No sé a dónde voy" (deny: the route, then "¿A dónde va?") and "Tome,
  doce pesos" (pay_cash with the price) were right answers that the blind set's expectations left out (the earlier
  review said so); widened. Corpus: the two out-of-town items now expect ask_goes with the town.
- 1, 2, 3, 6, 8, 10: nothing wrong. Every line usted; no Mexican-only word in the new lines (no twin needed); the
  neutral run differs only at the five twins. Hints with a place are limited to the town's places (`only`), and the
  chips keep the nine places they had, so no "¿Me avisa cuando lleguemos a Tulum?" is ever shown or voiced.

**Voiced values:** stops 2–8 and minutes 2, 5, 10, 15 are all in `num` ([2…8, 10, 15]); the new discount line's fare is
fixed ($12); every change amount stays in `amount`.

**New lines (voiced after the audit):** route_is, discount_no, goes_out, where_out, oos_out, oos_route, oos_why,
oos_coming, change_soon, change_none, end_of_line, button_how, button_where, sit_where, sit_free; changed:
dest_unknown, dest_help (the stops in the 3D order), where_airport (taxi). Sims: two new (the beach's end of the
line; the route, Playa del Carmen, the church), and the change-of-mind and price-check sims now go to the centro and
the mercado (the church stop only before the zócalo; the beach has no next stop).

**For the lead / owner:**
- TOWN.md "Town facts": "City bus route 7: centro (zócalo), mercado, clínica, malecón / muelle, Hotel Mar Azul, the
  beach" → the order above (terminal, clínica, iglesia, zócalo, Hotel Mar Azul, mercado, El Muelle, the beach's east end
  by the lighthouse; $12; every 15 minutes; the last bus around 10 p.m.). Shared file: not edited here.
- "¡Bajan!" and "¿Le paro?" stay in the neutral text: the brief's own teaching point, Mexican custom in a Mexican town.
- The ATM "en la terminal, ahí adentro" isn't built (the town's ATM is at the bank's door); it's the "named, not
  built" kind.
