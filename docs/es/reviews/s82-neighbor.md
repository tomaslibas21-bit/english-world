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

## Audit (5 Nov 2026)

Fresh reviewer (AUDIT-BRIEF.md), both texts. Read: STYLE.md, AUTHORING-ES.md, the brief, the review above, the cross and
neutral files, s81 and p29 (the building), TOWN.md (Las Palmas, the 3D doors), the transcripts of seeds 3 and 7, and
about 90 probe turns (`tools/probe.ts`: every NPC question, offer and twist with yes, no, maybe, asked back, side
questions and goodbyes). Kept consistent with s81 and p29: the learner's apartment one floor up (the intro's American
"second floor" = primer piso), door 1B, hers 1C next door (the 3D signs); Don Ernesto the owner, on the planta baja;
Don Gilberto the building's administrador (the lead's call, p24); the gas from the roof tank, by the liter (s81); the
trash days only here (Mon/Wed/Fri ~7, with a bell).

**Found 21, fixed 21** (1:3 2:0 3:0 4:2 5:0 6:0 7:14 8:1 9:0 10:1).

1. Natural Spanish. "¿Quién es el dueño?" got the echo "¿Don Ernesto? …" as if the learner had named him: new
   `landlord_who` ("Don Ernesto, el de la planta baja. …"), also for "¿Dónde vive Don Ernesto?" and "¿El dueño vive
   aquí?". On a later visit "Hola, Doña Lupita. Bien, ¿y usted?" got "Bien, gracias." and then "¡Hola!" (she had
   greeted first): no hello back on a later visit. "¿Dónde la dejo?" after "¿Qué días pasa?" said the days twice in a
   row: once now.
4. Facts. The intro promises "who to call when something breaks", and nothing answered it: new `ask_repairs` →
   `repairs` (the apartment: Don Ernesto, the owner; the building: Don Gilberto, the administrador; neutral twin with
   apartamento), also for "¿Quién es el administrador?" (it got "no sé, pregúntele a Don Ernesto") and a thing that
   broke ("El aire no enfría", "Se descompuso mi regadera, ¿a quién le hablo?"). Apartment numbers: "Soy del 1B" /
   "Vivo en el 1B" weren't understood (the door says "SE RENTA · DEPTO. 1B"); her door is now said when asked
   (`her_apt`: "Aquí al lado, en el 1C.", spoken "uno ce").
7. Questions left without an answer (each probed before and after):
   - asked back: "Soy de Canadá, ¿y usted?" lost Canada to from_other ("¡Qué bien!") and got no answer; "Me encanta.
     ¿Y a usted?" wasn't understood at all → `ask_back_ctx` at her two small-talk questions (`her_from`, `her_like`);
     "¿Usted es de aquí?" / "¿Hace cuánto vive aquí?" → `ask_her` (`her_from`, `her_years`);
   - "¿Dónde vive usted?", "¿Cuál es su departamento?", "¿En su casa?" (to her Sunday invitation, then the invitation
     again) → `ask_where_live`; "¿Usted vive aquí al lado?" had been read as the learner's own "vivo aquí al lado";
   - prices: "¿Cuánto cuesta un garrafón / el gas?", "¿Y cuánto cuesta?", "¿Es caro?" → `ask_price` (the noun said or
     the last topic): garrafón "como cincuenta pesos", laundry "como treinta pesos el kilo", gas "depende de cuántos
     litros", anything else → `unknown_q`; "¿A qué hora pasa?" right after the gas truck → `gas_days`;
   - the complaint: "Ok, perdón" was read as "pardon?" (all four complaint lines again); "Claro, no se preocupe" / "No
     hay problema" as a no ("Ah… bueno.", the complaint left open, no completion) → `complaint_ok_ctx`; "¿Mi música?"
     → `which_music_ctx`; "¿A qué hora?" got "Ah, bueno." and dropped the complaint → `complain_when` ("Como a la
     medianoche.");
   - the package: "¿Qué paquete? Yo no pedí nada.", "¿Para mí?", "¿Cuándo llegó?" → `pkg_what` / `pkg_when`, the thanks
     still to come (a trailing "¡Gracias!", dropped by the tolerance, counts);
   - coffee: "Sí, ¿llevo algo?" was ignored → `coffee_bring` once the time is agreed ("No traiga nada, nada más venga");
     "Tal vez" / "No sé si pueda" → `coffee_whenever`, nothing booked; "¿Puede ser más tarde?" → a later time;
   - plants: "No sé todavía" to "¿Cuándo se va?" got "Sin prisa." and the key was never arranged → the key line;
     "¿Dónde le dejo la llave?" → `key_where`;
   - a goodbye before her closing (right after "¿Cuándo se va?" or "¿Le parece a las cinco?") ended the conversation
     incomplete with the favor done: the goodbye now gives the trash news first, as `finish` does, and completes;
   - a later visit: a late "Bien, gracias" got no reply and "¿Qué más quiere saber?" with nothing asked → "¡Me alegro!"
     and "¿qué se le ofrece?" again;
   - "¿Me cuida a mi perro el fin de semana?", "¿Y un martillo?" after a borrow, "Sí, las plantas" to her offer;
   - places: "¿Dónde está la playa?", "¿Hay una farmacia cerca?", "¿Cómo llego al centro?", "¿Dónde tomo el colectivo?"
     got "Mmm, no sé. Pregúntele a Don Ernesto." from a woman born here → `ask_place` with s81's facts (landed today,
     from the 3D town): the beach two blocks down Flamboyán, a pharmacy a block up on Juárez, the centro five minutes
     (Flamboyán to Juárez, then right), the colectivos on Juárez and the bus stop by the gym (camión twinned autobús).
8. Hints: the coach would say "¿Me podría dar un poco de huevos?" (borrow_some over every mass thing): eggs are
   `count` now with their own item, "¿Me podría dar dos huevos?" (`borrow_two`, accepted).
10. Neutral: `desarmador` (Mexican) gets `attrs.neutral: "destornillador"` for the coming target.ts fix (the borrow hints
   and the sound check say it); the new `repairs` line has its apartamento twin; nothing else new is Mexican-only
   ("garrafón", "camión" = truck, as the cross audit judged).

Checked, nothing to change: usted everywhere (lines, hints, the tú tip); names (Doña Lupita/Guadalupe; s32's Doña Lupe
becomes Licha, the lead's call); every gloss, flag index and natural English line (American); spelling and ¿¡ in both
texts; the three neutral twins; the gas (s81's roof tank refilled by the pipa, s82's truck you flag down: both real,
the new price line says liters); laundry (s81's machine on the azotea, s82's lavadero there: both can be); "quiet,
mostly retirees" (s81, the landlord selling) vs. the parties upstairs (s82): kept, a natural irony.

New spoken lines (19; no existing line's text changed): `landlord_who`, `repairs` (+ neutral twin), `her_from`,
`her_years`, `her_like`, `her_apt` (say: "uno ce"), `gas_days`, `price_water`, `price_gas`, `price_laundry`,
`key_where`, `complain_when`, `pkg_what`, `pkg_when`, `coffee_bring`, `place_beach`, `place_pharmacy`,
`place_centro`, `place_bus` (+ neutral twin); one new hint (`borrow_two`). Phases unchanged:
the step asks at trash_q and needs say what they said (a later visit with nothing asked now repeats
`needs_first_known` instead of `needs_more`, same phase). One speaker, no plural items.

Tests: 16 NLU tests, 8 sims (asked back + about her + who fixes what; a later visit's late how-are-you, no date yet,
the key; "Claro, no se preocupe"; which/when/"Ok, perdón"; which package/when/thanks; "¿llevo algo?"; "Tal vez";
"Sí, las plantas"); corpus +72 / traps +11.

For the lead: Don Gilberto is now named as the building's administrador here (npcs.ts `mr_grant` still says "Tu
casero"; p24 says apartment 3B, the 3D door is 1B: p24's reviewer). Not handled (rare, engine-wide): "¡Ah, ya sé!
¡Muchas gracias!" (a bare "ya sé" isn't understood, so the whole turn fails); "¿De verdad? ¡Gracias!" likewise.
For the owner (invented, kept modest): Doña Lupita is from Puerto Colibrí and has lived in the building for over
twenty years; a garrafón about $50 and the laundry about $30 a kilo (Riviera Maya, Nov 2026).

## Spain twins (11 Nov 2026)

22 twins. Doña Lupita keeps usted (older neighbor; no register change). Spain: "por la mañana / tarde / noche" (8 lines),
"esta mañana", "¿Ya se ha mudado…?", "aparcamiento… pocas plazas", "a dos calles, todo recto", "se estropea en su piso",
"¡Encantada!" / "claro" for "con gusto", "solo" for "nada más", "me lo devuelve", "¡qué alegría!", "¡Qué bien!". "El camión" of
the trash and the gas stays (a truck in Spain too). Spain corpus: 13 items (grifo, aparcar el coche, ¿Le apetece…?, la semana que viene).

## Spain review (12 Nov 2026)

Fresh reviewer, against docs/es/STYLE.md "Spain Spanish": every line's Spain reading (twin, else neutral), the hints and
example answers, tú/usted and vosotros by the Spain rule, meaning and English against the Mexican line, Mexican-only
things kept, and the Spain corpus.

Found and fixed: Doña Lupita: me he confundido; ¿qué se le ofrece? / lo que se le ofrezca → ¿qué necesita? / lo que necesite; toque mi puerta → llame a mi puerta; el agua de la llave no se toma → del grifo no se bebe (and the hint); paredes delgadas → finas (also the writer's twin); ¡cómo no! → ¡claro que sí!; fíjese que → pues; ni lo he oído; le bajo → la bajo (and the writer's “¿Le podría bajar…?” → ¿La podría bajar…?); han sido los de arriba; me lo ha dejado; ahí nos vemos → entonces nos vemos; me viene bien; ha sido un placer; hints: una reunión → una cena, No volverá a pasar.

English of every twin checked against its Mexican line (restored where a twin had rephrased it). Spain corpus items
added for the new forms. Gates: Mexican, neutral and Spain checks 0 errors; coverage 0 false accepts.

