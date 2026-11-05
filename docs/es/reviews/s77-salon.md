# Review: s77-salon ("Nada más las puntas"), writer's commit 6bce00b7

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc` / vitest | clean / 288/288 | clean / 288/288 |
| `check-content --verbose` | 93/93 NLU, 11 sims 12/12, fuzz 80, 0/0 | 107/107 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus | 235/235, 0/12 false accepts | 241/241 (100%), 0/12 (7 items added, 1 corrected) |
| blind set (40 items, written before reading) | 32/36 (89%), 0/6 traps | 36/36, 0/6 (not blind any more) |

The writer's claims held, but whole-conversation probes (rule 22) found 8 meaning-safety bugs, 3 of them with money.
Conversation file: 29 lines changed or removed, 90 added (~45 must-fix, ~15 polish, ~30 sims and tests).
## meaning-safety (must-fix, ~30 lines)
1. **"Tengo cita" = no appointment**: `appt_none` had `[no] (no)? tengo cita (no)?` (all optional), so it started the walk-in
   flow and its wait twist. Now `[no] no tengo cita no`.
2. **"No tengo cita a las tres"** found the 3:00 booking. `#notat`: at three (or no hour) = no appointment; another hour stays
   "No, tengo cita a las cuatro".
3. **Lost comma at the result** (rule 10): "No, está demasiado corto", "No, me cortó demasiado" were `love_it`, so the twist
   gave "Gracias por ser tan comprensivo" and no discount. New `short_amb_ctx` (#amb) at the result, `more_q`, `fix_q`: Paty
   asks "¿le gusta así, o le cambio algo?". New sim "lost comma" records the discount.
4. **"No, está muy caliente" = water fine** (`no (esta)? (muy|tan)? (caliente|fria)` in `water_ok`): removed; the hot reading
   only adjusts the water and asks again.
5. **"No con tarjeta, en efectivo" paid by card** (rule 18): whole patterns in `pay_cash`, `pay_card`, `pay_phone`.
6. **"No traigo efectivo" charged the card** at once (a later "Con transferencia" was recorded as card). Now it offers card
   or transfer and charges nothing (`no_cash_line`).
7. **"Al natural" added the $50 blow-dry** (`#natural` set `blowdry`); Paty's own "Muy bien, al natural" is the no-dry line.
8. "¿Puedo dejar propina?" before the result got "¡Qué detalle!": now "la puede dejar cuando pague". "Así está bien" at
   "¿En seis semanas, a la misma hora?" was a silent no: now asked again (`book_amb`, rule 17; new sim).
## understanding (must-fix for the blind fails, ~10 lines)
"Quiero un cambio, algo mucho más corto", "Que no quede muy corto", "No más corto", "Me lo dejó demasiado corto",
"Ahorita no, yo le llamo"; polish: "Café no, agua", "Capas no".
## numbers (must-fix, 3 lines): "Una pulgada y media" got "¿2 pulgadas? Son como 4 centímetros"; new line `inch_15`.
## spanish, rule 11 (~14 lines)
Must-fix: "¿Y usted?" got the weekend answer whatever Paty asked; now per topic (`jessie_from`, `jessie_vacation`,
`jessie_pets`). Polish: "No" to "¿De dónde es?" got "¿A descansar?"; "Todavía no" (travel) now "¡todavía hay tiempo!"; a
bare "No soy de aquí" no longer gets "Yo nunca he ido"; "¿Cuánto cuesta el lavado?" gets the extras' price only.
## gloss-english, twins, facts, structure: no change (a third of the glosses read; 7 twins flagged right; TOWN.md agrees)
## For the owner (the writer's open questions, unchanged); nothing for the lead
Prices (cut $200, bangs $60, wash/blow-dry $50, $50 off), "Mucha gente deja un diez por ciento", the terminal's tip
question, the vague factura answer.

## Audit (5 Nov 2026)

A fresh reviewer's pass over both texts (the Mexican default and the neutral one), by the audit brief: STYLE.md,
AUTHORING-ES.md's rules, the brief, this review, the cross-cutting leads and the neutral digest, TOWN.md ("Getting
around"); the file, the corpus and the held-out set; the seed-3 and seed-7 transcripts read in full; then about 100 short
conversations (some 400 turns) played with `tools/probe.ts` at every step and offer (a bare yes and no, polite closings,
price questions, refusals, side questions, a female learner), a fresh blind set of 68 sentences, and the offer probe in
both texts (3 offers, nothing flagged before or after).

### Found, by point (52)

1. **Natural Spanish (2).** "¿Yo? Ojalá ir a Bacalar…" (ojalá with a bare infinitive): now "¿Yo? Me encantaría ir a
   Bacalar, pero no sé cuándo." A cut "hasta los hombros" was asked "¿Con máquina o con tijera?": a shoulder-length cut
   is a scissors cut, so no clippers question there.
2. **tú/usted (0).** Usted in every line, hint and example; tú accepted with the tip.
3. **Names (0).** Paty and Canela only, no clash in the edition.
4. **Facts and the town (1).** The intro (and the file's header) put the salon "next to the pharmacy": in the 3D town
   (TOWN.md) Estética Tijeras is on the corner of avenida Juárez and calle Ceiba (Boutique Hilos beside it, the bank
   across Ceiba, the pharmacy a block west at Flamboyán); fixed. The new ATM answer follows it ("En el banco, aquí
   cruzando la calle."); "pesos only" as at Café La Ceiba. Prices unchanged (the owner's open question below).
5. **Glosses and English (1).** The name hint glossed "Me | llamo" as "Myself | I-call"; one unit "My name is", as
   STYLE.md (S-SE) and every other conversation (the spoken text is unchanged).
6. **Spelling, accents, ¿¡ (0).**
7. **Questions and offers (46).**
   - **"Está bien, gracias" was the water everywhere** (`water_ok` had "el agua" optional): "¡Qué bueno!" and the
     question again at the wash, the blow-dry, the booking and the twist; at the card reader the tip question vanished;
     "Mucho mejor, gracias" at "¿Y ahora, qué tal?" looped. Only "el agua está…" is the water now anywhere; the bare forms
     are `water_ok_ctx` at "¿Cómo está el agua?" (1).
   - **Rule 17 at the paid extras (4):** "Está bien, gracias" / "Vale, gracias" at the $50 wash, the $50 blow-dry and
     the card reader's tip: "Perdón, ¿entonces sí?" once (`askedAgain`); a no declines, a yes (or the same again) takes it.
     The same at the free drink offer, where it was a yes ("¡Claro, ahorita se lo traigo!") but is as often "I'm fine".
   - **The price of what is on offer (4):** "¿Cuánto cuesta?" at the wash or the blow-dry led with the haircut's $200
     (now the extras only); at "¿Le despunto también el fleco?" it gave the haircut's price (the bangs come with the cut:
     "Va incluido en el corte."); "¿Cuánto cuesta cortar el fleco?" said $200 (now $60); at the drink offer, "¡Es
     cortesía de la casa!". "¿Tiene costo extra?", "¿Está incluido?", "¿Es aparte?", "¿Es gratis?" weren't understood:
     `extra_q` (1).
   - **The twist (9):** a bare "Sí" (yes, you cut too much) got "¡Le queda muy bien!" at full price: now the apology and
     the $50 off. "No, está bien" got "¿Qué quiere que le cambie?": now accepted with the discount (and at the plain
     result, its comma lost, Paty asks which, rule 10); a bare "No" is asked which. "Sí, un poco" was a new length ("Muy
     bien, nada más un poquito."); "Sí, está más corto" cut more off ("¡Claro! Un poquito más."); "¡Ay, no!", "¿En
     serio?" got the cat's "¿Verdad que sí?": all three now the apology and the discount. "No importa", "Un poco, pero
     está bien" weren't understood (now polite, with the discount); "¿Cuánto más?" gets "Como un centímetro más.
     ¡Perdóneme!"; accepting at "¿Qué quiere que le cambie?" ("No, así está bien", "No", "Nada") dropped the discount.
   - **Names (1):** "¿Cómo se llama usted?" got the cat's name and Paty's weekend; "¿Usted es Paty?" wasn't understood:
     "Soy Paty, ¡mucho gusto!" (a bare "¿Cómo se llama?" is the cat's name once she has come up).
   - **Side questions not understood (8):** "¿Cuánto tarda?" ("Como media hora.", "¡Ya casi termino!" during the cut),
     "¿Cuánto tiempo tengo que esperar?" (the walk-in: "Como quince minutos, nada más."), "¿Aceptan dólares?" ("Perdón,
     nada más pesos. Pero aceptamos tarjeta o transferencia."), "¿Hay un cajero cerca?", "¿Tiene terminal?" (card),
     "¿Tiene cambio de quinientos?" ("Sí, sí tengo."), "¿La propina está incluida?" and "¿Cuánto se deja?" at the
     card reader (the tip line).
   - **Answers not understood (15):** "No tengo capas", "No tengo fleco", "¿Tiene té?", "Un café americano", halves
     ("Dos centímetros y medio" → "Muy bien, dos centímetros y medio.", "Un centímetro y medio", "Medio centímetro"),
     "A Mérida en diciembre", "¿Usted es de aquí?" / "¿Y usted tiene mascotas?" (Paty's own answer per topic), "Me da
     igual" (clippers or scissors), "Como usted quiera" (straight or waves), "El próximo mes" / "Sí, pero más temprano" /
     "¿Puede ser en la mañana?" (booked), "Nada, así está bien", "Es a nombre de Ryan", "Quiero un corte y que me lave el
     pelo", "Máquina del dos a los lados y tijera arriba", "No tengo efectivo, ¿acepta tarjeta?".
   - **Meaning flips (3):** "Treinta centímetros" / "Diez pulgadas" were echoed as "¿20 centímetros?" / "¿8 pulgadas?":
     now "¿Tanto? ¡Va a ser un cambio grande!". "No, el fleco déjelo como está" trimmed the bangs, kept the layers and
     answered "how are you": now `no_bangs`. "¿Qué significa máquina / lacio / despuntar?" recorded the word as the
     answer: the question stays open while the global meaning help explains.
   - Polish: "¿Puedo dejar la propina en efectivo?" after the card got two thank-yous; one now.
8. **Hints and help (0).**
9. **Accepted answers (0 found).** Corpus 241 → 317 understood (+76, from the probes and the blind set), traps 12 → 16
   (0 false accepts); two water items now want the context intent. Held-out unchanged, 36/36, 0/6.
10. **Neutral text (2).** The hint "¿Me puede cortar el fleco?" had no twin (the cross-cutting lead): "¿Me puede cortar
    el flequillo?". The tú tip's example (shown in both texts) said "fleco": now "¿Me puede cortar el pelo?".

### Fixed (52), the gates

Spoken lines for the voices (both sets, none with a Mexican-only word): **new** `yes_check`, `bangs_included`,
`drink_free`, `paty_name`, `wait_mins`, `cut_time`, `almost_done`, `change_yes`, `dollars_no`, `atm_line`, `len_cm15`,
`len_cm_half` ({$num} 2–8), `cm_huge`, `short_more` (20 clips an accent); **changed** `jessie_vacation`; the hint
`service.bangs_trim` gets its neutral clip. 5 new sims (polite closings at the paid extras; the twist's bare yes; "No,
está bien" with "¿Cuánto más?"; side questions; halves and an earlier booking), 18 sims 12/12; NLU 127/127; the original
13 sims' transcripts unchanged.

### For the lead (shared files)

- global.ts `g_meaning`: "¿Qué significa máquina?" parses as g_meaning + the word's own intent, so the word is recorded
  as an answer edition-wide (guarded here in the clippers, style, trim and bangs answers).
- global.ts / lang.ts: "¿De verdad? ¿Cómo?" reads "¿Cómo?" as "¿Cómo está?" (está dropped by the tolerance); and
  `expectHowAreYou` has no `no`, so a bare "No" to "¿Cómo está?" goes to the step's no (here: no appointment).
- s68's proposal holds here too: a bare "Gracias" at "¿Le agendo su próxima cita?" gets "¡Con gusto!" and the question
  isn't asked again once the conversation is complete.
- s62's "junto a la farmacia / junto a la estética" (r_salon, r_pharmacy) disagree with the town; the s62 directions
  rewrite (d280cb66, "en la esquina de Ceiba") agrees with this intro.

### For the owner

Unchanged from the review: the prices (cut $200, bangs $60, wash and blow-dry $50 each, $50 off for the twist), "Mucha
gente deja un diez por ciento", the card reader's tip question, the factura by message. New, by the audit: the salon
takes pesos only (as Café La Ceiba) and a cut takes "como media hora".
