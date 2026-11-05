# Review: s62-visitor-center ("¿Me lo puede repetir?", Don Chuy), writer's commit df2af01b

**Gate.** Before: tsc clean; check-content 89/89 NLU, 10 sims 12/12, fuzz 80 OK, 0/0; corpus 137/137, 0/26 false accepts.
After: tsc clean; check-content **105/105 NLU, 12 sims 12/12**, fuzz 80 OK, 0 errors 0 warnings; corpus (163 + 97 review
probes) **223/228 = 97.8%, 0/32 false accepts**. All of the writer's gate claims held.

**Blind set** (`tests/es/heldout/s62-visitor-center.json`, 43 sentences, 7 traps, written before reading the draft):
before **40/43 = 93.0%**, 0 traps accepted, but 1 misread was a meaning flip. After: **43/43 = 100%**, 0 traps (not blind for me any more).
A second probe of 108 sentences, written after reading the draft: 78/92 at first, **103/108 (95%)** at the end, 0 false accepts.

## Fixes (25 lines changed, 68 added in the conversation file)
- **meaning-safety, must-fix (5 lines).**
  1. In the left-or-right quiz, "No a la derecha, a la izquierda" was read as *right*: the first `dir_ans_ctx` won, and the
     wrong answer was corrected. A new pattern takes the second direction.
  2. "Derecho, ¿no?" at the quiz was read as `confirm` (straight is part of the route), so Don Chuy said "¡Exacto!" without
     hearing left or right. That bypassed the writer's own derecho ≠ derecha guard. `straight_ans_ctx` now takes `[@ctail]`.
  3. "Sí, ya lo conozco" / "No, ya sé dónde está" to "¿Le digo cómo llegar?" gave the café route (or read "no sé"). These are now `decline_ctx`.
- **understanding, must-fix for the common ones (~16 pattern lines).** "¿Puede repetirlo?", "¿Lo puede repetir (más
  despacio)?", "¿Me lo escribe?", "Hable más despacio" (the lesson's own skill!). These are local `repeat_it` / `write_it` / `say_again_slowly`.
  Overriding `g_repeat` locally changed its ranking ("Perdón, no entendí" became a repeat), so I used separate intents.
  Also: "No, gracias, ya tengo uno en el celular"; "Acabo de llegar, es mi primera vez" ("primer vez" was in the pattern);
  "Hacia / Para la izquierda"; "A la derecha, creo"; "Quisiera saber cómo llegar…"; "¿Me lo puede marcar en el mapa?";
  "Estoy buscando un restaurante"; "Mejor al museo"; "A ningún lado"; "Prefiero el té"; "deletrear el nombre de la calle".
- **spanish / answers (polish, ~12 lines).** After a slow repeat he asked "¿Me explico?" for the third time in a row. A slow
  replay now asks "¿Así mejor? / ¿Ahora sí?". "¿Dónde compro boletos para el camión?" was answered with where the
  colectivo stops. It now gets `ticket_none` (no tickets here; you pay on board in cash; it has a neutral twin). "El domingo cerramos" →
  "Los domingos cerramos".
- **gloss-english (polish, 2 lines).** "¿Me entendió?" glossed `Me |` → `(Me) |`; "On | Sunday" → "On | Sundays".
- **numbers / twins / facts: no fixes.** No prices; hours and trip times invented for a fictional town; Xcacel and Chemuyil
  vague and right. Mexican-only words (pásele, tianguis, banqueta, camión) all have neutral twins, about 1 line in 12.
- **structure: no fixes.** Same steps, route engine and twists as the English one; dropping the bus-pass sale fits Mexico.
- **tests (~33 lines).** 16 NLU tests (5 meaning-safety) and 2 sims: the quiz with derecho + a correction, and "ya lo conozco".

## For the lead
- **NEEDS (shared global.ts):** `g_repeat` lacks "repetirlo / lo puede repetir", `g_write` lacks "¿Me lo escribe?", and
  `g_slower` lacks the imperative "hable más despacio". Every conversation will miss them; this one has local stand-ins.
- **Can't be solved without punctuation:** "No, es todo" (that's all) and "No es todo" (that's not all) are the same
  input. The common reading (that's all) wins. "No, no es todo, tengo otra pregunta" still gives both intents.
- "¿Es a la derecha?" stays not understood on purpose: "turn right" or "on the right"? A guess could correct a true statement.
- "Disculpe, no le escuché" → louder is fine (he apologizes and repeats). "Hablo como perico": natural, I believe; a native check is welcome.

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), the brief,
the review above, the cross-cutting leads (AUDIT/cross, AUDIT/neutral), the situation file, the corpus and the held-out
set, the transcripts at seeds 3 and 7 (all 12 sims, then the new one), and ~60 probe turns (`tools/probe.ts`) for the
questions a visitor at a tourist office asks. Every direction checked against docs/es/TOWN.md ("Town facts"),
locations.ts and the conversations that name the same places: the café, Correos, the mercado and the terminal (right,
two blocks to the bank on the corner of Juárez and Ceiba, left into calle Ceiba), the pharmacy and the estética (right,
one block; s75's consultorio next door), the hotel (next door), La Cocina de Lucía across from Hilos (left, one block,
red awning; s69 "a una cuadra, la del toldo rojo", s73), the zócalo, the museum and the police (left, two blocks; s70,
s91a/b), the beach, El Muelle and the lighthouse (calle Itzamná), p25's "la esquina de Juárez y Ceiba": all agree.

**Found 21, fixed 20** (by point: 1:1 2:0 3:0 4:5 5:2 6:0 7:13 8:0 9:0 10:0).

- **1 Natural Spanish.** After a side question at the café offer Don Chuy said the whole tip again, twice in a row
  ("Ah, ¿y ya conoce La Ceiba? ¡El mejor café del pueblo! ¿Le digo cómo llegar?"). Now a short reminder, `cafe_again`
  "Y La Ceiba, ¿le digo cómo llegar?", and the café is offered at most twice (as the map is); a learner who asks
  "¿Dónde puedo tomar un buen café?" still gets the tip itself, and after the café's way was given, the way again
  (it got "Bueno, ¿a dónde va?").
- **4 Facts.** `bank_hours` now has s78's Saturdays ("…de lunes a viernes, y los sábados hasta las dos"); `trip_cenote`
  says twenty minutes, as s69 and TOWN.md (Cenote Ka'an), and so does its written note; `ticket_none` said the camión
  and the colectivo are paid "al subir", but s69 pays the colectivo when you get off: now "se paga al chofer" (s67b's bus
  driver takes it on boarding), Mexican text and twin; the food tip's "la taquería de la esquina" is now "la taquería
  junto al mercado", s69's (and it can be found, below). **Not fixed here** (another conversation's and TOWN.md's):
  s69's Doña Carmen, on her bench in the zócalo, puts Café La Ceiba "aquí en la plaza" and calle Ceiba "a dos cuadras de
  aquí", and TOWN.md has calle Ceiba along the zócalo's west side; with s62's map (the zócalo two blocks left of the
  visitor center, calle Ceiba two blocks right) they can't both hold.
- **5 English.** "shall I give / shall I tell" in three glosses → "should I" (American English); `praise`'s gloss
  "everyone just say" → "says".
- **7 Questions without a right answer** (all found with probes):
  - Prices said "¡Sí, es gratis!" for things that cost: "¿Es gratis el museo?", "¿Cuánto cuesta la entrada al museo?",
    "¿Cuánto cuesta el cenote?", "¿Es gratis Xcacel?" and a bare "¿Cuánto cuesta la entrada?" after the museum's way
    (the bare question fell to the map). New `place_price` and three lines: `museum_price` "La entrada general cuesta
    $80. Los domingos es gratis para mexicanos y residentes." (s70's facts), `trip_price` "Se cobra la entrada; depende
    del lugar. Lleve efectivo." (s69's), `free_place` "¡No se paga nada! Es gratis." (the beach, the zócalo, the
    tianguis). A bare "¿Es gratis? / ¿Cuánto cuesta?" is about what Don Chuy just talked about (the museum, a trip, the
    beach, the music, the map; after another place's way, "Fíjese en el letrero de la puerta"). Where the map's
    "¿Es gratis?" is expected, "¿Es gratis la playa?" parses as "¿Es gratis?" + "¿La playa?": the handlers find the
    named place in what was heard, answer its price once and give no unasked route.
  - "¿Cuánto cuesta el mapa?", "¿Cuesta algo?" got "¡Sí, es gratis!" (a yes to how much): `map_free_cost`
    "¡Nada, es gratis!" (#cost on those patterns).
  - "¿Dónde está la taquería?" right after his own tip got "ese lugar no lo conozco": the taquería is a destination
    now (the mercado's way, next to it): `r_taqueria`, `r_taqueria_slow`, `yes_next_market`, its checks and note.
  - "¿A qué hora abre?" / "¿Está abierto hoy?" after the café's or the museum's way gave the office's hours: the
    singular now means the place just talked about (#it; the plural "¿A qué hora abren?" stays the office).
    "¿A qué hora abre el cenote?" got "Fíjese en el letrero de la puerta": `trip_hours` (s69's "Abren temprano, como a
    las ocho…"); the beach: `beach_hours` "¡La playa no cierra!".
  - "¿A qué hora pasa el colectivo?" got the city buses' timetable, "¿Cada cuánto pasa?" nothing: `colectivo_when`
    "Pasan muy seguido por la avenida. No tienen horario." (s69: "cada rato").
  - "¿Dónde tomo un taxi?" (his own `far_15` suggests one) was not understood: `taxi` "En la avenida pasan muchos
    taxis. Nada más levante la mano."
  - "¿Dónde es la música?" not understood: the way to the zócalo. "¿Dónde está el kiosco?" got "no lo conozco": the
    kiosco is a form of the zócalo.
  - "¿El café La Ceiba tiene wifi?" got the office's password, colibri (the café's is s72's ceiba2026): `wifi_there`
    "Sí, pero la contraseña se la dan allá." (the café, the hotel, the restaurants).
  - `welcome_new[1]` asked "¿Es su primera vez aquí?" right after "Es mi primera vez" or "Me acabo de mudar", and
    nothing took the answer: now "¡Bienvenido al pueblo! ¡Va a ver qué bonito es!".
  - Breadth: changing money ("¿Dónde puedo cambiar dólares?", "¿Hay una casa de cambio?") → the bank; "¿Qué colectivo
    tomo para Tulum?"; "¿Hay baños públicos?"; "¿Cuándo cierran ustedes?".
- **10 Neutral text.** The 13 twins say the same thing without a Mexican-only word; the lead "boleto" in `ticket_none`'s
  twin is a word STYLE.md counts as shared. The new lines have no Mexican-only word.
- **2, 3, 6, 8.** Usted throughout, in the hints too; only Don Chuy and Lucía (La Cocina de Lucía) are named (Don Chuy
  vs p29's Chucho, both Jesús, is p29's); spelling and ¿¡ clean; every hint accepted and in usted.

**Spoken lines:** 13 new (`map_free_cost`, `cafe_again`, `r_taqueria`, `r_taqueria_slow`, `yes_next_market`,
`trip_hours`, `beach_hours`, `museum_price`, `trip_price`, `free_place`, `colectivo_when`, `taxi`, `wifi_there`) and 5
changed (`welcome_new[1]`, `trip_cenote`, `bank_hours`, `ticket_none` and its twin, `food`); 4 glosses (not voiced).

**Tests.** Corpus +48 (40 understood + 8 traps: "No necesito un taxi", "No quiero cambiar dinero", "No voy a la
taquería", "No quiero pagar la entrada", "Ya pagué el colectivo"…): 225/228 → **265/268**, false accepts 0/32 →
**0/40**. Held-out 43/43 (unchanged, no new items: not blind any more). NLU tests 105 → 123; a 13th sim (a price, the
hours of the place just talked about, the taquería, the colectivo), 12/12 seeds; the other sims' transcripts are
unchanged at seeds 3 and 7. Still not understood, as before: "¿Es a la derecha?" (on purpose), "No busco un mapa, busco
el banco", "No sé, ¿es gratis?".

**For the lead / the owner.**
- TOWN.md (shared): add the taquería next to the mercado (s62, s69), the museum's admission ($80; students and
  seniors $40; free on Sundays for Mexicans and residents: s70, s62), colectivos without a timetable, paid to the driver
  (s62, s69), cenotes and ruins opening around eight (s62, s69).
- s69 (its reviewer) or TOWN.md: the café "aquí en la plaza" / calle Ceiba "a dos cuadras" from the zócalo vs s62's map
  (above). Smallest change: s69 says the café and calle Ceiba are "cerca de aquí".
- The 3D town doesn't follow any of Don Chuy's ways (as in Maple Harbor, whose Chuck said "the world builder may want
  to match it"): from the visitor center's door Café La Ceiba is right across avenida Juárez, the bank and calle Ceiba
  are to the left, the zócalo is past calle Ceiba. A learner who walks his directions won't find the café.
- s68 (its reviewer): "El Muelle… Está a dos cuadras" from the hotel next door; by s62 it's two blocks to the zócalo,
  then down calle Itzamná to the sea (about ten minutes).
- Left as the engine's graceful "no le entendí" / "ese lugar no lo conozco": safety at night, a doctor or hospital,
  the airport, the church, tours, museum tickets sold here.
