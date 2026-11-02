# Review: s82-neighbor ("Perdón por el ruido", Doña Lupita), writer's commit b050af23

**Gate before → after:** tsc clean → clean; check-content 85/85 NLU, 12 sims 12/12, fuzz 80, 0/0 → 100/100 NLU, 15 sims
12/12, fuzz 80, 0 errors 0 warnings; corpus 249/249, 0/39 false accepts → 260/260, 0/40.
**Blind set** (`tests/es/heldout/s82-neighbor.json`, 40 items, 9 traps, written before reading the draft): before
37/40 = 92.5%, 0 traps accepted (missed: "Vivo en el departamento de enfrente, me mude ayer", "Voy a estar fuera unos
días, ¿podría regar mis plantas?", "¿Me recibe un paquete el lunes?"); after 40/40, 0 traps (not blind for me any more).
Good draft (usted held, glosses and flags right); the probes found the problems. 112 lines added, 29 changed: ~60
must-fix, ~15 polish, ~50 tests.

## Fixes
- **meaning-safety (must-fix, ~25 lines)**
  - "No, gracias" to the coffee invite got "¡Con gusto!" and the invite again (g_thanks swallowed the no). `coffeeThanks`:
    no / yes / "Está bien, gracias" asked again (rule 17); also for the learner's own invitation.
  - "A las cinco no puedo, ¿a las seis?" agreed to five, then "let me know when you have time". Now one new time;
    `coffeeAt` / `coffeeOff` record the outcome, sims check it.
  - "Perdón, la música estaba muy fuerte anoche" (the learner apologizing) was read as noise_ask: Doña Lupita said
    sorry for her own music. noise_sorry takes it now; noise_ask needs "su música".
  - "Sí, perdón" during the complaint was read as "pardon?": she repeated all four complaint lines. Now an apology.
  - "¿Qué música?" (complaint) and "¿Qué era esa música anoche?" got "¡Es el camión del gas!": now "Su música, la de
    anoche." / the people upstairs. "¿Cuándo pasa el camión del gas?" got the garbage days: now the gas answer.
  - "El sábado me queda bien" to her Sunday was silently Sunday: she acknowledges the other day now.
  - coffee_yes is a plain intent: at "¿Algo más?", "No tengo nada" and "¿A qué hora?" got "¡Qué bueno!". It is now
    no_more / a short "En la mañana, temprano." after a truck question.
  - "La escalera no, el martillo" = "La escalera, no el martillo" once the comma is lost (rule 10): the correction
    now needs "mejor" or "sino".
- **understanding (must-fix, ~20 pattern lines):** "¿Me recibe un paquete?", "Voy a estar fuera unos días", "Vivo en
  el departamento de enfrente", "No fue mi música, fueron los de arriba", "¿le molestó?", "¿A qué hora pasa el gas?",
  "¿Qué tal el sábado a las seis?", "No puedo el domingo pero el sábado sí", "Creo que no puedo", "El sábado mejor",
  "A las cinco" to her Sunday, "No quiero pedirle nada"; polish: "No mucho" at "¿Le gusta?" → "¡Ya se va a acostumbrar!".
- **spanish / gloss-english (polish, 2 lines):** new `complain_which`, `morning`; all glosses and flag indexes checked.
- **numbers, twins, facts, structure:** no changes (twins: nomás, ahorita, ándele; steps, intents, both twists as in
  English, plus the brief's ask_gas / ask_water).
- **tests (~50 lines):** 15 NLU tests (traps), 3 sims (no thanks, five-no-six-yes, which music then sorry), 13 corpus items.

## For the lead / owner
- Writer's NEEDS stand: npcs.ts Doña Lupita needs `{ informal: false }` (inherits Rita's tú; the file overrides 8
  global handlers until then); g_bye: "que le vaya bien", "que esté bien".
- Owner: invented town facts (garbage Mon/Wed/Fri ~7 a.m. with a bell, gas truck every morning, Don Ernesto needs
  chasing, parties upstairs). Not understood (rare): "No tomo café", "¿Un paquete? Yo no pedí nada".
