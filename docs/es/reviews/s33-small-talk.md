# Review: s33-small-talk ("¡Qué calor!", Don Pancho), writer's commit d844a4b2

**Gate before → after:** tsc clean → clean; check-content 114/114 NLU, 9 sims 12/12, fuzz 80, 0/0 → 131/131 NLU, 10 sims
12/12, fuzz 80, 0 errors 0 warnings; corpus 288/288, 0/24 false accepts → 315/315, 0/25; vitest 288/288 → 288/288.
**Blind set** (`tests/es/heldout/s33-small-talk.json`, 42 items, 9 traps + 1 must-not-understand, written before
reading the draft): before 39/42 = 92.9%, 0 traps accepted (missed: "La verdad no me gusta tanto calor", "No muy bien,
estuve enfermo", "Otra vez se retrasó el camión"); after 42/42, 0 traps (no longer blind for me).
Good draft (usted, glosses, flags right). No money step: the probes played the umbrella, the weekend and the side
questions. 91 lines added, 27 changed: ~45 must-fix, ~10 polish, ~35 tests.

## Fixes
- **meaning-safety / rule 11 (must-fix, ~25 lines)**
  - On a norte morning, "¿Cuándo es la temporada de lluvias?" got what a norte is. The rainy-season line had no "when".
    Now `#when` → "Más o menos de mayo a octubre…", `#always` ("¿Siempre hace tanto calor?") → "Casi todo el año, sí…"
    (on a norte morning, the norte line), and the rest → the rainy-season line.
  - "¿Dónde vive?" got "¡Toda la vida! Más de setenta años". "¿Dónde está su lancha?" and "¿De qué color la va a
    pintar?" got "Es chiquita, de madera". Now 3 new answers (`frank_house`, `story_boat_where`, `story_color`).
  - "No me gusta el calor" at "¿Le gusta Puerto Colibrí?" got "Uno siempre extraña su tierra"; now a heat reply.
  - "No muy bien, estuve enfermo" gets the sick reply (in either piece). "¿Y usted? ¿Tiene planes?" came twice in a
    row after two side questions (rule 8): once now, then the reminders.
- **facts (must-fix, 2 lines):** his boat was "La Lupita, como mi esposa", but Doña Lupita is the s82 neighbor (and Doña
  Lupe has the mercado stall), so learners would take her for his wife: now "La Rosita". Polish: hurricanes "Casi nunca
  pasa nada" → "No todos los años llega uno".
- **spanish / usted (must-fix until the NEEDS lands, 3 lines):** g_soundcheck, g_meaning, g_write spoke tú: now usted.
- **understanding (must-fix, ~15 pattern lines):** "La verdad no me gusta tanto calor", "No está nada bonito", "Hoy no
  traje / Olvidé / Yo tampoco traje paraguas", "No, vivo aquí desde hace tiempo", "No muy bien", negated plans ("No fui
  a la playa", "No voy a ir al cenote", "No puedo ir a la playa, tengo que trabajar": all were not understood), "¿Usted
  qué va a hacer?", "¿Dónde vive usted?", "Otra vez se retrasó el camión".
- **gloss-english (polish, 3 lines):** "Not even a tiddler" (British) → "a little one"; "I've got a big one" → "a big
  umbrella"; wi_not_bad "the truth" → "honestly".
- **numbers, twins, structure:** no changes (°C/°F right; twins camión, chamba, ándele ~10/180; steps, twists as English).
- **tests (~35 lines):** 17 NLU tests (12 meaning-safety), 1 sim (side questions), 28 corpus items.

## For the lead / owner
- Writer's NEEDS stand: npcs.ts `frank` needs `{ informal: false }` (until then g_clarify's hints show tú: Conversation.tsx
  renders GLOBAL g_clarify with the NPC's register, so the situation can't override it); g_bye "que pase buen fin de semana".
- Engine limit (safe, never misread): a second verb after a negated clause is not understood ("No fui a la playa, fui
  al cenote", "No fui a la playa, llovió todo el fin de semana", "No vivo aquí, estoy de vacaciones").
- Owner: invented facts about Don Pancho: retired fisherman (40 years), blue house on the corner, 70+ years in town, a
  daughter and two grandkids (grandson 10), a wooden boat La Rosita painted blue; rainy season "más o menos de mayo a octubre".
