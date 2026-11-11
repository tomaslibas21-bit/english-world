# Review: s65a-passport ("¿Negocios o placer?"), writer's commit 2c3173b0

| Check | Writer | After review |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 118/118 NLU, 13 sims 12/12, fuzz 80, 0/0 | 133/133 NLU, 18 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus (coverage) | 138/138, 0/16 false accepts | 158/158 (20 items added), 0/16 false accepts |
| blind set (42 items, written before reading) | 35/39 = 89.7%, 0/3 traps | 38/39 = 97.4%, 0/3 traps |

The one blind miss left: "Todavía no sé" at the length question goes to the global "no sé", which gives the length help ("¿Una semana? ¿Dos semanas?"). That is fine. The writer's claims held, but its tests missed six meaning flips that the folded text makes.

## Fixes (85 lines added, 17 changed, in a file of 1449)
- **meaning-safety (must-fix, ~25 lines)**
  - "Vacaciones, no negocios" was read as *business*. The comma is lost, so the writer's "X no, Y" pattern also matches "X, no Y". The same was true of the length ("Dos semanas, no un mes" → 30 days). Both are now tagged `#amb`, and the officer asks again ("Perdón, ¿cuál de los dos?" / "¿Cuántos días, entonces?"). The forms with "sino" and with a leading "no" stay read.
  - At "¿Y trae tarjeta?", "No tengo tarjeta" matched `[no] tengo tarjeta` and was recorded as *has a card*. A handler check now makes it the plain no.
  - At "¿Tiene visa de residente?", "Aquí está mi pasaporte" granted the resident visa. The officer now asks "¿Y su visa de residente?". "Todavía no la tengo" was read as a missing return ticket (return_no); it is now a no.
  - At "¿Ya había venido a México?", "No, es mi primera vez" was recorded as *been before*. It folds like "No es mi primera vez", so the reading now depends on which question was asked.
  - "Una visita de trabajo" was read as vacation; it is now business.
  - At the stamp twist, a figure no bigger than hers is now a yes. A sentence with "no" ("Quince días no son suficientes") is never a yes.
- **understanding (must-fix, ~15 lines)**
  - "Vine a vivir", "Vengo a jubilarme", "Una conferencia de medicina", "¿Con qué mano?", "Prefiero treinta días"
  - "boleto de ida y vuelta", "Es de ida nomás", "…, pero lo voy a comprar" (now said once)
  - "Sí, es la primera", "No lo encuentro"
  - "Tres semanas y media" (was length + a job), "Del cinco al veinte de junio"
- **spanish (polish, 2 lines)**: "¡Qué bueno que regresa!" → "¡Qué bueno que regresó!"; the visa re-ask is now a short line, not the same question twice in a row
- **gloss-english (polish, 1 line)**: "saliendo de aquí" was glossed "going out from"; it is now "as you leave", with a flag
- **numbers, twins, facts, structure:** no changes
  - Days come from the steps 7/10/15…180, spoken by the engine. "180" has its say: text.
  - One twin (departamento), all usted, gender forms fine.
  - Steps, intents and both twists match the English file, except the customs part, which was dropped on purpose (below).
- **tests:** 15 NLU tests and 5 sims (the visa, the comma folds, no card, "No, es mi primera vez", thanks at the stamp and then "Está bien, pero…"); 20 corpus items.

## Left as is (folds with a likely reading)
"No, vengo con mi esposa" (alone_with), "No pago con tarjeta" (cash_no) and "No vengo como turista" at the visa step (have_esta) each have a rarer opposite reading ("I'm not coming with…"). The engine can't tell them apart without the comma. None of them books anything.

## For the lead / the owner
- NEEDS (engine): the comma before "no" is lost, so "X, no Y" = "X no, Y" in every conversation with corrections. A lang.ts or normalize.ts marker for "no" after a comma would make `#amb` unnecessary.
- Owner: the customs declaration and the beagle twist were dropped (INM doesn't ask about food). The writer's facts are still unverified and stay vague: the 30-day deadline to exchange the visa for the card, fingerprints at a small airport, the money question, stamped days rounded to 7/10/15/…, and "no form to fill out".
- Glosses checked: about 40 of the ~110 line variants and hints. No gloss errors besides the one above.

## Lead's check (2 Nov 2026)

Looked at the risky parts only: the figures (days, dates, the stamp), the visa, and negations. 30 new edge and trap sentences (outside the repo), before the fixes: 9/22 understood, 5/8 traps accepted; after: 21/21, 0/9. Each flip below was confirmed before the fix (a played conversation, or the parse and its handler) and played as a whole conversation after it.

| Check | After review | After the lead's check |
|---|---|---|
| check-content --verbose | 133/133 NLU, 18 sims 12/12 | 152/152 NLU, 28 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus | 158/158, 0/16 | 158/158, 0/16 |
| blind set (heldout) | 38/39, 0/3 | 38/39, 0/3 (the same "Todavía no sé") |
| tsc, vitest | clean | clean, 257/257 |

**The stamp (binding; must-fix)**
- "¿Me puede dar quince días más?" and "¿Me da una semana más?" were read as a figure smaller than hers, so she stamped the short stay and closed. A figure followed by "más" is now added to her days (two months asked, 30 given, "quince días más" → 45; "más o menos" is not "más").
- "No, necesito más días" folds like "No necesito más días" and was accepted as her days. Now tagged `#amb`: a typed "No," reads it as the request; otherwise she asks "Entonces, ¿le pongo 15 días?" once, and the same sentence after that question is the no.
- At her ticket question, "No necesito más días" (or "Con quince días está bien") left the question open, so a later "Sí" showed a ticket and granted the days. The question now takes her days and closes; "Treinta días está bien" asks for the ticket again.
- "Aquí está mi pasaporte" at "¿Me muestra su boleto de regreso?" (the stamp and the return question) counted as the ticket. Now "Ya lo tengo, gracias." and the question again.
- "No, no lo tengo en el celular" at her ticket question granted the days, and "No, no lo compré" at "¿Trae su boleto de regreso?" was a yes: the engine reads "No, no …" as the answer "No, no" plus "lo tengo / lo compré" when no pattern spells out the negative sentence. New `return_no_ctx` (the negative pronoun forms, only where a ticket is asked for); the same forms for the address (`address_dunno_ctx`) and the passport (find_it).

**The visa (must-fix)**
- A boarding pass or a ticket handed over at "¿Tiene visa de residente?" granted the resident visa; "Tengo la residencia en trámite" (still in process) did too. Now "¿Y su visa de residente?" and a no (new "en trámite" patterns, and a guard in have_visa).
- "Sí, está en mi pasaporte" is now a yes, "No, solo mi pasaporte" a no (it was "¿Y su visa?", and "solo" was recorded as traveling alone).
- "No, vengo de vacaciones" / "No, soy turista" there (folded like "No vengo de vacaciones") made her repeat the visa question; now it's the visa's no and the tourist's purpose ("Sin visa de residente, no puede trabajar ni vivir aquí." → how many days).

**Meaning (should-fix)**
- Traveling alone: her re-ask after a clarification was "¿Viene con alguien?", the opposite yes/no of "¿Viaja solo?", so "Sí" was recorded as alone. Now "¿Viene solo, sin familia ni amigos?" (new line, glossed and flagged; it needs recording). A bare "Solo" is read only at that question (`alone_yes_ctx`), and "¿Qué significa solo?" no longer records an answer.
- "No (lo) tengo aquí" / "No me acuerdo" anywhere were the address ("¿La puede buscar en su celular?", then `address: "none"`): the pronoun-only forms are now `address_dunno_ctx` / `address_phone_ctx`.
- "No, primera vez" / "No, la primera" to "¿Ya había venido?" were recorded as been before.
- After "No vengo de vacaciones" she could ask "¿Viene por negocios o de vacaciones?" again: now "Entonces, ¿cuál es el motivo de su viaje?".
- At the passport step, "Aquí está mi boleto" was taken as the passport: now "No, solo su pasaporte.".

**Figures (understanding)**
- "Un mes o dos semanas" came as two figures and the last won (15 days for a month's stay): with "o" the longer counts.
- New: "Entre dos y tres semanas", "Dos semanas o tres", "Hasta el veinte", "Del cinco de junio al veinte de julio", "Un mes, mejor dos semanas" (the second counts; "X no, Y" stays `#amb`), "No sé, unas dos semanas", "Más de un mes" (vague: she asks), "Es de ida", "Sí, una vez", "Quince está bien".
- Spoken figures checked: every stamp value 7…180 is said right ("cuarenta y cinco", "ciento veinte", "ciento ochenta"); the two lines with the digits 180 have their say.

**Tests:** 19 NLU tests (133 → 152), 10 sims (18 → 28), all 12/12.

**Left as is:** "No traigo tarjeta" at the money question is recorded as a card (only state, nothing said wrong); "No, está bien" at the stamp is read as a no and she asks for the ticket (folds with "No está bien"; the safe side); "¿No me puede dar más días?" is not understood (the corpus keeps it from more_days).

**NEEDS (engine):** besides the comma before "no": `noLead` "no no" swallows the verb's own "no" ("No, no lo compré" → "lo compré"). Every conversation with pronoun-only positive patterns ("lo tengo…", "lo compré") has this hole until the engine keeps the second "no" with its verb.

## Audit (5 Nov 2026)

A fresh reviewer, both texts (Mexican and neutral), as AUDIT-BRIEF.md asks: the brief, STYLE.md and AUTHORING-ES.md, the
reviews above, AUDIT/cross and AUDIT/neutral, seeds 3 and 7 read in full, and about 250 probe turns (`tools/probe.ts`)
at every question: the opener, the visa, the stamp twist, the money, the return ticket, the closing and side questions.

| Check | Before | After |
|---|---|---|
| check-content --verbose | 152/152 NLU, 28 sims 12/12, fuzz 80, 0/0 | 191/191 NLU, 36 sims 12/12, fuzz 80, 0 errors 0 warnings |
| corpus (coverage) | 158/158, 0/16 false accepts | 218/218, 0/18 (62 items added, 26 of them traps) |
| held-out | 38/39, 0/3 | 38/39, 0/3 (the same "Todavía no sé") |
| voiced values | `{$num}` only from DAY_STEPS (7…180), all 11 on the line list | the same: the new paths say only `grantOf()` or her shorter figure; `values-es.ts`: every value said is kept |

### Found and fixed, by point

1. **Natural Spanish:** every line of Oficial Ramírez reads as a Mexican migration officer (usted, brisk, polite). Nothing changed.
2. **tú/usted:** usted both ways, tú accepted with the tip. Nothing changed.
3. **Names:** only Oficial Ramírez; no clash in the edition.
4. **Facts (1):** the address hint "Calle Ceiba, número quince" became **"Calle Flamboyán, número veintitrés"**: s65b, minutes later
   on the same arrival day, gives "Calle Flamboyán número 23, entre Hidalgo y Juárez" as where the bag goes (TOWN.md), and
   calle Ceiba is the zócalo's shop street. "Calle Ceiba número quince" is still understood. Checked and kept: 180 days at
   most, the stamp with days instead of the paper FMM, 30 days to exchange the resident visa for the card at an INM office
   (the real rule: 30 días naturales), no visa for the learner's countries, customs after the baggage (s65b, TOWN.md).
5. **English (1):** days_remind "So, shall I put down {$num} days?" → "So, should I put down {$num} days?" (English only).
6. **Spelling, accents, ¿¡:** nothing found.
7. **Questions and offers (10):**
   - **Meaning flip:** "Así está bien", "Está bien así", "Déjelo así", "No, gracias, está bien así" to "Le voy a dar 15 días"
     were the engine's built-in no: she asked for the return ticket, and a following "Sí, aquí está" granted days nobody
     had asked for. They now accept her days (also at "¿Me lo muestra?").
   - **Meaning flip:** "Las dos" at the money question (and "Ambas" at "¿crédito o débito?") matched the purpose pattern
     "los dos" and rewrote the trip's purpose to business, with the money question left open. A bare "los dos / ambos" is
     now `both_ctx`, only where an either-or is asked: the purpose (business), the money (cash and cards), the card (a card).
   - **Meaning flip:** a lone "Trabajo." or "Turismo." at a later question ("¿A qué se dedica?") rewrote the purpose
     (vacation ↔ business). A bare purpose word (`#bare`) now changes a purpose already given only at the purpose questions;
     elsewhere she asks the open question again ("¿Cuál es su trabajo?"). Job fields ("En ventas", "Turismo", "En un
     banco") are the job now.
   - "¿Cuántos días me dio?" after the stamp got the 180-day rule; now her figure ("Le doy 15 días.", the twist's result,
     "…hasta su regreso"; a resident hears the 30 days for the card; at the stamp "Le voy a dar 15 días.").
   - "Todavía no lo compro", "Es de ida", "No sé cuándo regreso" got "¿Lo puede buscar en su correo?" (nothing to look up):
     now only "Bueno. Recuerde que tiene que salir a tiempo." "No tengo boleto" and "No lo tengo" still get the email question.
   - "No" to "Entonces, ¿viene como turista?" got the same line again; now "Entonces, ¿cuál es el motivo de su viaje?".
   - "¿Necesito visa?" at "¿Tiene visa de residente?" got the same question again; now the rule "Sin visa de residente, no
     puede trabajar ni vivir aquí." (once: the no that follows doesn't repeat it).
   - "¿Por qué?" to her questions was not understood: at the stamp it asks for the ticket (like "¿Por qué solo quince?"), at
     a ticket question "Necesitamos ver que va a salir del país.", at the visa the rule, elsewhere the new line **"Es solo
     una pregunta de rutina."** (the question stays open).
   - "¿Y si me quedo más tiempo?" at the stamp: a what-if, never a request: "Bueno. Recuerde que tiene que salir a tiempo."
   - "¿Dónde está la aduana?", "¿Tengo que declarar algo?" (customs moved to s65b): the new line **"La aduana está después
     del equipaje."**
   - The opener: "Bien, gracias. Fue un vuelo muy largo." was not understood, and after "Bien, gracias, pero fue un vuelo
     muy largo" "¡Ay, lo siento!" came after "Su pasaporte, por favor". The passport is now asked after the whole answer
     (once, also after "Bien, pero un poco cansada", which asked it twice); "Muy largo." is understood.
8. **Hints:** all accepted by the grammar (the address hint: point 4; the boarding-pass hint: point 10).
9. **Accepted answers (9 gaps):** a bare figure at "¿Cuántos días?" ("Quince." → 15 days; "dos", "tres" get "¿Una semana?
   ¿Dos semanas? ¿Un mes?"; over 180 the maximum; at the stamp her own figure is asked back, a smaller one accepts, a bigger
   one asks for more); "Hasta diciembre"; "En Tulum", "Aquí en Puerto Colibrí" (→ "¿En un hotel? ¿Con familiares?"); the
   address with "entre Hidalgo y Juárez" (s65b's own wording), "Es en el centro" and "…no sé el número" (→ look it up);
   money: "Tarjeta de crédito", "Débito", "Sí, de débito", "Efectivo", "Tarjetas", "No traigo efectivo" (→ the card
   question); the visa: "Tengo visa de turista", "…solo de turista", "Sí, pero está en trámite", "Sí tengo, pero no la
   traigo", "La dejé en casa", "Mi visa está vencida" (all no resident visa), "Sí, residente temporal" (yes); "No, es la
   segunda", "Sí, el año pasado"; "Vengo a casarme", "un retiro de yoga", "Vacaciones y un poco de trabajo"; "Tengo boleto
   de ida nada más" was a yes piece plus a no (now one no). Safe before and after: a US visa, "residente de Estados
   Unidos", a green card, "Tengo visa americana" are never a resident visa.
10. **Neutral (1):** the hint "¿Necesita mi pase de abordar?" now has its twin "¿Necesita mi tarjeta de embarque?" and the
    Mexican-word flag, as the 18 others in s64a–c and s65b. "Boleto de regreso" stays untwinned (as in the whole edition);
    "Renté" in the apartment twin stays (rentar is untwinned in s71a and s81).

**Spoken lines changed (for the voice list):** new ans_customs and routine_q; the hint a_its changed; the hint pp_boarding
got a neutral twin. English only: days_remind. No other spoken text changed.

**Tests:** 39 NLU tests (152 → 191), 8 sims (28 → 36; "a month or two weeks…" now says "No, no lo tengo" before "No, no lo
compré", since "No lo compré" no longer leads to the email question), 62 corpus items (26 traps); the held-out item "Un
poco de los dos" accepts the renamed intent (purpose or both_ctx).

### For the lead / the owner

- global.ts `expectHowAreYou`: "Bien, pero un poco cansada" gets both "¡Qué bueno!" and "¡Ay, lo siento!" (one reply per
  piece). One reply per turn, the bad one winning, would fix it in every conversation (here the passport is asked once now).
- Owner (design): at the stamp a figure above the trip ("¿Me puede dar ciento ochenta días?" after "Un mes") is granted
  once the ticket is shown; a real officer gives the days up to the return date. Unchanged: it is the learner's own
  request, nothing misread.
- Engine NEEDS as above (the comma before "no"; "No, no …").

## Spain twins (11 Nov 2026)

- 35 Spain twins (lines and hints), 23 items in tests/es/spain/s65a-passport.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Oficial Ramírez keeps usted.
- Words: visado for visa, billete de vuelta for boleto de regreso, móvil, gafas (quíteselas), rellenar for llenar, aseos, fuera, lleva for trae, ¿Me deja su pasaporte?, ¡Qué bien que haya vuelto!, the learner's perfect (He venido a vivir aquí, ya he venido antes, todavía no lo he comprado, He alquilado un piso), ¿Qué dedo?, Ya está. The relatives mamá, papá, papás have Spain nouns (madre, padre, padres: attrs.spain).
- Grammar: q_form takes rellenar; the rented-flat pattern takes he alquilado and piso; return_yes takes lo llevo en el móvil. Merges: haya vuelto, he venido, he alquilado, no lo he comprado.
- Kept: tarjeta de residente, oficina de migración (Mexico's own paperwork).

## Spain review (12 Nov 2026)

Fresh reviewer (Madrid ear). Checked every Spain twin against the Mexican line and STYLE.md "Spain Spanish": register, vosotros/os agreement, the perfect, Spain's words, glosses, Mexican-only names, spelling, and the Spain corpus.

- Read every twin: usted kept throughout, Spain's words right (billete, tarjeta de embarque, móvil, gafas, portátil, aseos, maleta, facturar, coger, aparcamiento, coche, jersey), the perfect for what just happened, "Ya está" for "Listo", Mexican-only names kept. Meaning, glosses and spelling: no problems found. No changes.
