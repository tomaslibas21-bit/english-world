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

## Audit (5 Nov 2026)

Fresh reviewer (N/AUDIT-BRIEF.md). Read: STYLE.md, AUTHORING-ES.md "Rules from the reviews", the brief, this review,
the cross file (names, facts, spelling, English, neutral, offer probe: all clean; the lead's call: neutral "entrada"),
the neutral side-by-side, the situation file, corpus and held-out; both transcripts (seeds 3 and 7) as a native
speaker; ~120 extra turns with tools/probe.ts (every offer's yes/no, money after paying, cash amounts, groups, the
guard, side questions); the voiced line list for this conversation (lines-es.ts) in both accents; the offer probe in
both texts (0 flags).

**Found 26 (1:0 2:0 3:0 4:3 5:1 6:0 7:21 8:0 9:0 10:1), fixed 23.**

- **4 Facts.** (a) Don Arturo stands by the carved Maya stela and the clay vessels (the 3D room's statue, the
  picture): "no toque las pinturas" / "El flash daña las pinturas" → **las piezas** (as his "Las piezas son muy antiguas
  y delicadas"); deny patterns take la estela, la estatua, la pieza, la vasija. (b) **Voiced totals:** the price domain
  covered four tickets and four guides, but the desk sells up to nine of each: "Somos cinco" + a guide each = $650 was
  not in the list (device voice). The domain now covers nine and nine (40 → 105 values; say_total 120 → 315 clips per
  accent), and ten or more people get a new line instead of a loop (below). (c) Not fixed (graphics): the lines point
  to an elevator ("ahí, a la izquierda"), the café, the restrooms and the paquetería, none of which the 3D room shows.
  Prices and hours match s62, s69 and TOWN.md ($80; $40 students and seniors; free on Sundays for Mexicans and
  residents; Tue–Sun 10–5).
- **5 English.** guide_again2 "So, can I give you an audio guide?" → "So, can I get you an audio guide?".
- **7 Questions and offers** (each played with probe.ts):
  1. **"¿Seguro? Es muy buena…"**: a bare "Sí", "Sí, gracias" ("yes, I'm sure") took the $50 guide. The line now ends
     on a question a yes answers: "Es muy buena para la exposición nueva. **¿Se anima?**" (one line instead of two
     gendered ones); "Sí, seguro" and "Sí, me animo" take it, "No me animo" / "Sí, estoy seguro" don't.
  2. "¿Tienen audioguía?" before the offer added a guide (rule 3): now the price ("Cuesta $50, y la tenemos en cinco
     idiomas") and the offer later ("¿Y la audioguía? ¿La va a querer?"); after the offer it is still a yes.
  3. Cash: "Aquí tiene ochenta pesos" for $80 got "Aquí tiene su cambio" (now "Listo, gracias"); "Aquí tiene
     cincuenta" for $80 paid (now the total again, rule 18).
  4. **After paying**, an extra (a guide, one more ticket) charged the whole order again ($130 for a $50 guide) and
     handed the ticket over again: the extra is now charged alone (due = total − paid) and only it is handed over; a
     cut after paying ("Soy estudiante", "Ya no quiero la audioguía", "Mi hijo tiene ocho años") gets "Ya está
     pagado" and changes nothing (before, it changed the order and asked for the whole total again).
  5. "No, gracias" / "Mejor no" at "¿En qué idioma la quiere?" asked the language again (a loop): the guide is called off.
  6. Sunday: "Somos residentes" freed one ticket and charged the other: the plural frees the order.
  7. "¿Habla inglés?" got "Sí, la tenemos" (the guide): new line "Muy poquito, pero le hablo despacio." (and slower
     speech, as s62); at the language question it is still about the guide.
  8. The guard: "¿Mande?", "¿Qué?", "¿Cómo dice?" ended the twist with "Gracias por su comprensión": he says it again;
     a bare "¡Perdón!" stays the apology.
  9. "¿Cuánto cuesta?" at "¿Se anima?" gave the price and dropped the offer: now the offer is asked again.
  10. "Somos diez" / "Diez adultos" asked "¿Cuántos boletos?" again and again: new line "Lo siento, los grupos de diez
      o más tienen que reservar antes."
  11. "Quiero dos audioguías" at the first question booked two tickets and one guide: want_guide (and lang_q) are now
      expected there.
  12. "Quiero otro de estudiante" (a type with no ticket list) asked "¿Cuántos boletos?": it adds the ticket.
  13–19. Side questions with no answer: "¿Tiene terminal?", "¿Me puede cobrar con tarjeta?", "¿Tiene cambio de
      quinientos?" (yes, then the money), "¿Dónde devuelvo la audioguía?" (new line: "Aquí mismo, en la taquilla, cuando
      termine", the 3D sign says Taquilla · Audioguías), "¿Dónde está la colección permanente?" (the galleries),
      "¿Hasta qué hora se puede entrar?" / "¿A qué hora es la última entrada?", "¿Cuánto es en dólares?", "¿Es accesible
      para silla de ruedas?" / "con carriola" (the elevator), "¿Hay descuento para maestros?", "¿Rentan audioguías?",
      "Tenga, son ochenta", "Otro boleto para mi amigo", "Uno más para mi esposa", "Otra audioguía", "Dos boletos más",
      "Pensándolo bien / Siempre sí quiero la audioguía", "Ay, perdón, no vi que no se podía tocar".
  Left (2): "Soy mexicano" on a Sunday is not understood (a newcomer from an English-speaking country; the global
  "¿Perdón?" answers); "¿Puedo pagar con transferencia?" likewise. Also left: "Ya no la quiero" at the pay step right
  after asking for an extra guide is not understood ("No quiero la audioguía" is).
- **10 Neutral.** The lead's call: the ticket is **entrada** in the neutral text: twins for greet[0–1], come_back,
  ask_qty[0–1], ticket_here, tickets_here, exhibit_included(_full) and six hints (tk_one, tk_two, tk_quisiera,
  tk_me_da, g_no, e_included; the grammar takes them all). The voiced neutral set has no "boleto" and no "paquetería"
  left. The new lines need no twin.
- Also: the unused line exhibit_upstairs is gone (it was voiced, never said).

Tests: NLU 146 → 172; sims 13 → 19 (each 12/12): ¿Tienen audioguía? first + "Sí" at ¿Se anima? + exact cash + where to
return the guide; a guide after paying ($50); too little cash; ten book ahead, five with five guides ($650); Sunday
"Somos residentes"; the guard's "¿Mande?". Corpus 548 → 623 items (+75, 43 with traps; "Sí, seguro" at persuade now a
yes), 539/539, 0/84 false accepts; held-out 42 → 57 (+15, 8 traps), 54/54, 0/3. Voiced clips for s70: 636 → 815 per
accent (the totals up to nine tickets and guides, 3 new lines, the neutral twins).

For the lead: graphics could add an elevator door ("Elevador") on the museum's west side, a "Paquetería" sign by the
entrance and a "Baños" sign at the back (the lines point there).

## Spain twins (11 Nov 2026)

- 29 Spain twins (lines and hints), 15 items in tests/es/spain/s70-museum.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Iván and Don Arturo keep usted.
- Words: le da tiempo a ver for le alcanza para ver, carné (de estudiante) for credencial, jubilados for adultos mayores in the lines and the learner's de jubilado; the senior entity says persona mayor in Spain (two units, like adulto | mayor), datáfono and móvil, Muy bien for Listo, lleva (mochila), ascensor, hacer fotos for tomar fotos, aseos, ya lo he cambiado, me he equivocado, Vale, pago la entrada general.
- Grammar: no_id and no_cash take llevo; enough_time takes ¿me/le da tiempo a verlo todo?. Merges: da tiempo, he cambiado, muy bien, me he equivocado.
- The senior chip still reads adulto mayor (chip text, as in s65b).
