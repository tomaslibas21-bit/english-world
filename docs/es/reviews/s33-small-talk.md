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

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral). **Checked:** every line, twin and hint against STYLE.md, the brief,
TOWN.md and the cast; the transcripts (`review.ts` seeds 3 and 7, both texts; all 12 sims × 12 seeds in check-content);
about 60 probe turns (`tools/probe.ts`) and a 39-sentence blind set of what learners say at each step; AUDIT/cross and
AUDIT/neutral. **Gates:** tsc clean; check-content 131 → 148/148 NLU, 10 → 12 sims 12/12, fuzz 80, 0 errors 0 warnings;
corpus 315/315, 0/25 → 353/353, 0/36 (+49 items, 32 of them with `not:` meaning checks); held-out 42/42, 0/1; vitest es
107/107. Checked again with es-audit-shared's `frank { informal: false }` applied: transcripts identical, gates green.

**Found by point** (22): 1: 0 · 2: 1 · 3: 0 · 4: 3 · 5: 1 · 6: 0 · 7: 15 · 8: 0 · 9: 0 · 10: 2. **Fixed:** 20.

1. Natural Spanish: nothing wrong. Left as taste: `week_q_mon` "¿Y viene una semana pesada?" (fine; "¿Viene pesada la
   semana?" would be a little more idiomatic); "¡Ni me diga!" right after his own Fahrenheit conversion (reads fine).
2. tú/usted: his lines and every hint are usted; the g_clarify hints showed tú for him because `frank` still inherited
   Maple Harbor's `informal: true`. Fixed on es-audit-shared (64e68230); the NEEDS comment now says so.
3. Names: Don Pancho, La Rosita (his wife Rosa), the unnamed daughter and grandson: no clash in the edition.
4. Facts: **fixed** `frank_where` "Voy al centro, a la ferretería": the stop is on calle Hidalgo, a block from the
   zócalo (TOWN.md), so the centro is where he stands → "Nada más voy a la ferretería. ¡Necesito pintura para mi
   lancha!" (as the English original; "¿Va al centro?" still gets it). **Fixed** the intro "the bus stop on calle
   Ceiba" → "the Calle Ceiba bus stop" (its sign; it stands on calle Hidalgo). **Left for the pictures track** (the
   scene data, after the picture audit's remap ba91c40a): `react` is the pending after each of his three stories, so its
   picture (`plans`, painting) also shows on Mondays while he tells about fishing; `wkf_what` (Friday, "¿Qué va a
   hacer?") and `weekend_past` (Monday, his question) show him fishing. Suggested: both → `react` (his listening pose);
   for the fishing picture with the fishing story, the Monday story's pending would need an id of its own
   (`react_weekend`, a one-line change here plus the corpus ctx), done together with the scene line.
5. English: **fixed** `sure_is` "It sure is!" (also said to "Parece que va a llover, ¿verdad?") → "I'll say!",
   "Absolutely!". Glosses all right; American English throughout.
6. Spelling, accents, ¿¡: nothing (script over every unit, twin and hint).
7. Answers (each probed before and after):
   - A "no" that **agrees** got a disagreeing reply: "No hace calor hoy" on a norte morning → "¿No? ¡Usted aguanta más
     que yo!"; "Sí, no hace tanto calor" on a breezy day → "¿No? Bueno, ¡mejor que la lluvia!"; "No hace frío" on a
     cloudy one → "¡Ojalá tenga razón!". Now `wxNeg` (CONTRA): only denying his own remark disagrees; anything else gets
     his agreeing line ("Yo ya saqué mi suéter").
   - "¿Qué es el sargazo?" got "Depende. Hay temporadas…". New line `frank_sargazo_what`: "Es un alga café que llega
     del mar. Cuando llega mucha, ¡huele feo!".
   - The learner's own work read as his: "Mucho trabajo" (how was your weekend) → "Un poquito, ¡pero me gusta!" (his
     boat); "Tengo / Tuve mucho trabajo" → "¿Yo? ¡Estoy jubilado!" (the engine forgives a verb's person, so they matched
     "¿Tiene mucho trabajo?"); "Voy al centro" (plans) → his own errand. Now the weekend steps take them (work, busy, al
     centro), "¿Es mucho trabajo?" is `story_work_ctx`, expected only right after "voy a pintar mi lancha", and
     `q_week` / `q_where` check `mine()` (a first-person verb) before answering for him.
   - The winter had no answer: "¿Aquí hace frío en invierno?", "¿Cómo es el invierno aquí?", "¿Cuándo hace frío?" →
     new line `frank_winter`: "No hace mucho frío. Nada más cuando entra un norte, refresca unos días." (These need
     "aquí" or a question word: "Soy de Canadá, allá hace mucho frío en invierno" must never be a question to him; a
     bare "¿Hace frío en invierno?" stays not understood.)
   - Not understood before, natural answers: "Parece que sí" / "Eso parece" (to "Parece que va a llover"), "Tuve un
     buen fin de semana" (and a bad one), "Sí, voy a hacer algo especial", "Tengo tres hijos" (work or family?), "No,
     esta semana estoy de vacaciones", "Nada, me quedé en casa porque llovió", "¡Buen viaje!" (his bus).
   - "No, vivo aquí desde el año pasado" was welcomed as new ("¡Ah, pues bienvenido…!"): now not new. A known neighbor
     who says "vivo aquí" is no longer welcomed to town again (`newAnswer`).
   - Left (not understood, safe): "¿Cuándo hace más calor?", "¿Todavía pesca?", "¿Y su esposa?", "¿Hace frío en
     invierno?" without "aquí", "¿Qué es un aguacero?" ("¿Qué significa aguacero?" works: global g_meaning).
8. Hints: right, usted, accepted (check-content); their neutral twins under 10.
9. Corpus +38 understood, +11 traps (negated work, plans and good weekends, home winters vs. the winter question, "No
   es mucho trabajo"); 2 new sims (a no that agrees + the winter + the sargassum + the boat; a weekend of work, asked
   back); 17 NLU tests.
10. Neutral: the 10 twins are right. **Added** twins as the edition does elsewhere: platicar → conversar (s35 twins it)
    in `more_time`, `frank_bus_here`'s twin and the hints `by_better`, `by_nice`; carne asada → parrillada (p30 twins
    it) in the hints `wp_did`, `wf_did`; each Mexican word flagged.

**Voiced lines changed:** `frank_where` (new text), `frank_sargazo_what` and `frank_winter` (new); neutral text only:
`more_time`, `frank_bus_here`, and the four hints above. Ids, phases and moments unchanged (the pending `react` keeps
its id).

**For the lead:** the scene phases above (pictures track); STYLE.md's Mexican-only list could add
platicar (conversar) and carne asada as the party (parrillada), so the cross-cutting digest catches them; global
g_meaning could take "¿Qué es (un/el) X?" (now only "¿Qué significa X?").

## Spain twins (11 Nov 2026)

18 twins. Don Pancho keeps usted (an older neighbor; no register change). Spain's words: jersey (suéter), móvil, autobús,
charlar ("¡Ha sido un placer charlar con usted!" for "¡Qué gusto platicar con usted!", also the learner's by_better hint; its pattern
now takes charlar / conversar / hablar), "Solo…" for "Nada más…", "¡Qué bien!" / "¡Menos mal que lleva paraguas!" for "¡Qué
bueno…!", "por la tarde" for "en la tarde", "aquí" for "acá", "¡Qué maravilla! El agua del cenote está muy fresquita" for "¡Qué rico!…
es bien fresquita", and the perfect "he sacado el jersey" / "haya venido". Spain corpus: 16 items.

## Spain review (12 Nov 2026)

Fresh reviewer, against docs/es/STYLE.md "Spain Spanish": every line's Spain reading (twin, else neutral), the hints and
example answers, tú/usted and vosotros by the Spain rule, meaning and English against the Mexican line, Mexican-only
things kept, and the Spain corpus.

Found and fixed: Don Pancho's own g_* lines had no twin: no le he entendido, me he equivocado, ¿ha dicho…?; ¡Buen día! → ¡Buenos días! / ¡Muy buenas!; perfect for today and just now (ha amanecido, ha entrado un norte, ha empezado a llover, ha venido preparado, su autobús ha llegado / todavía no ha llegado, ¿cómo le ha ido el fin de semana?, se lo he dicho); extrañar → echar de menos (grammar takes it); alga café → marrón, huele fatal; traigo paraguas → llevo; hay sitio; la familia es lo primero; rápido se quita → se quita enseguida.

English of every twin checked against its Mexican line (restored where a twin had rephrased it). Spain corpus items
added for the new forms. Gates: Mexican, neutral and Spain checks 0 errors; coverage 0 false accepts.

