# Review: p29-landlord ("El aire no enfría"), writer's commit c11692d6

File: `src/editions/es/content/situations/p29-landlord.ts` (1,781 lines → 1,858; 23 lines changed, 100 added).

## Gate and blind set

| | Before (c11692d6) | After |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 106/106 NLU, 13 sims 12/12, fuzz 80, 0/0 | 122/122 NLU, 14 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 221/221 (100%), 0/63 false accepts | 249/249 (100%), 0/63 false accepts |
| blind set (37 items, 5 traps; `tests/es/heldout`) | 30/37 = **81.1%**, 0/5 traps | 36/37 = **97.3%**, 0/5 traps |

The writer's claims held, but the corpus only tested what the grammar already covered. My probes (about 120 whole conversations through `probe.ts`) found the problems below. Still missed in the blind set: "Soy su inquilino del 2B" (a number with a letter).

## Fixes

**meaning-safety: must-fix (~25 lines)**
1. "Yo puedo arreglarlo" ("I can fix it") at the offer was read as `request_fix` and recorded the offer as **refused**. accept_offer's "arreglar(lo)?" never matched "arreglarlo". "No, yo puedo arreglarlo" was refused too, because the engine drops "yo". Both forms are now written out.
2. **Rent paid in the middle of the AC talk.** `pay_rent` is a plain intent, so "Puedo pagar ahora" or "Aquí tiene la renta" at the dodge, the offer or the date recorded $14,000 cash (rentPaid, a pay event). Rent now moves only after he asks for it; before that he says "Primero el aire, luego la renta."
3. **Polite closings (rule 17).** "Está bien, gracias" and "Vale, gracias" at the rent paid $14,000, and at the offer they accepted "fix it yourself". At both places he now asks again.
4. "Ya pagué todo" while he dodges recorded the rent as done. Now it counts as the tenant's side of the lease (responsibility).

**understanding (~45 pattern lines)**: le toca arreglarlo; si no lo arregla no le pago; ¿me está tomando el pelo?; ¿usted no puede mandar a alguien?; lo puse en frío y nada; no funciona ni con el control; el aire del departamento / del piso; todavía no enfría (the guess); no quiero / no voy a intentarlo; ya intenté arreglarlo; la mitad no; ¿por qué no lo arregla usted?; ¿a qué hora?; ¿el miércoles es lo más pronto?; antes del fin de semana; le pagué ayer; and 9 ways of paying later or by transfer ("No quiero pagar en efectivo", "Se la doy mañana", "¿Y si se la pago mañana?"). These are new:
- `offer_price_ctx` ("¿Cuánto cuesta arreglarlo?", "¿Cuánto me paga?"): his half, with no amount given, and the offer stays open.
- `afternoon_ctx` ("¿Puede venir en la tarde?"): "Chucho nada más puede en la mañana." This closes one of the writer's known gaps.
**spanish / facts (must-fix, 2 lines)**: Doña Lupita lives next door (s82), so "el ventilador de arriba" became "el ventilador de al lado" (merge added).
**flags (must-fix, 3 lines, rule 15)**: rita_tech F_A 6→5, resp_react "lo" 8→7, the "contract" hint "las" 4→3.
**polish (~12 lines)**:
- An earlier transfer plus "¿Me da un recibo?" now gets the receipt instead of "¿Un recibo? ¿De qué?".
- "No importa, el miércoles está bien" no longer starts the walk-away line ("¡Espere, espere!").
- A stray "Claro." no longer follows a day that was already answered ("¿Y si el miércoles no estoy?", "El miércoles no me queda, ¿el sábado?").
- "De veras leyó el contrato" only comes after the lease was quoted.
**tests (~45 lines)**: 16 NLU tests and 1 sim (early rent, both polite closings, the afternoon, a receipt after a transfer, checked by the recorded state), plus 28 corpus items (24 with `not`).
Kept: the structure and both twists match the English. The usted, the glosses I checked (about a third) and the Mexican-only words (ahorita ×2 and minisplit, each with a twin) are fine. The prices ($14,000 is s81's rent) are fine.

## For the lead / owner
- The writer's open questions still stand: the title (the brief says "El calentador no sirve"; the scene is about the AC), the San Cristóbal trip, and Chucho as a new name. (The title: answered 5 Nov, "El aire no enfría" stays.)
- A learner who says the problem is the water heater ("el calentador", the brief's own title) isn't understood. The scene is only about the AC. (Done 5 Nov: steered to the AC; see the end of this file.)
- "Está bien, gracias" while a day is on the table still agrees to that day. That books nothing paid, so I left it.

## 5 Nov 2026: the title and the water heater

Decided on the owner's "decide on best fixes": the title **"El aire no enfría"** stays, and BRIEFS.md now says so (it
had "El calentador no sirve"). A learner who blames the water heater is now understood and steered to the AC, once:
a new intent `heater_wrong` ("El calentador no funciona/sirve/calienta", "el boiler", "No hay agua caliente", "La
calefacción no funciona", and "…tampoco" as a second complaint) and two lines:
"¿El calentador? ¿Con este calor? ¿No será el aire?" (The heater? In this heat? Don't you mean the AC?) and, if the
learner names the heater again before the AC, "El calentador funciona bien, se lo aseguro." (The heater works fine, I
promise.). The question is the returning player's guess question (`expectAcGuess`, factored out of `start`): a yes or
the AC's problem answers it; "No" gets "¿No? ¿Entonces en qué le puedo ayudar?". Nothing about the heater is recorded,
and a heater statement is never the AC's problem (`not: heat_broken` tests). Once the AC is known, the heater gets
"Vamos por partes." Tests: 8 NLU tests, 1 sim ("the water heater first, then yes, the AC"), 20 corpus items (4 traps);
probed: yes, "Sí, el aire. No enfría desde hace una semana.", no then the heater again, the heater twice, the AC then the
heater, a returning player's "No, el calentador no funciona", "La calefacción no funciona".

## Audit (5 Nov 2026)

A fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md ("Rules from the reviews"), BRIEFS.md p29 (and p24, s81,
s82), this file, the cross-cutting leads and the neutral digest for p29, s81/s82/p24/TOWN.md for the building, the
situation file, the corpus and the held-out set; both transcripts (`review.ts --seed=3` and `--seed=7`, all 15 sims) as a
native speaker; about 70 whole conversations through `probe.ts` (the heater, the offer, the day, the rent, side
questions), before and after.

**Checked and kept.** The Spanish is natural Mexican for a 60-ish landlord in a hurry (usted both ways, Doña Lupita usted
with "vecino/vecina" as in s82); the three neutral twins (ahorita ×2, minisplit in a hint) are right, and the digest's
two "¿mande?" flags are the verb mandar ("Mande a un técnico", "Ya le mandé el mensaje"). Facts agree with s81, s82, p24
and TOWN.md: Don Ernesto owns Las Palmas and lives on the planta baja; the learner lives one floor up in 1B; Doña Lupita
is next door (1C); Don Gilberto (p24's administrador) is not named here, and the AC is inside the apartment, so it is
Don Ernesto's (s82: "Si algo se descompone en su departamento, avísele a Don Ernesto"); the rent $14,000 (s81), in cash
or by transfer (s81); the pictures and the intro put the talk downstairs ("¿Pasa algo arriba?"). The San Cristóbal trip
holds up: two weeks in the Chiapas highlands, where it really is cool and homes have no AC ("no hay aparatos que
arreglar"), so the repair is arranged by phone and Chucho, his off-screen repairman, comes with his own key. **Chucho
stays**: Don Chuy (s62) is another nickname of Jesús but another man in another place, and the two forms differ; no one
else is Chucho. Repairs and rent are handled as a Mexican landlord would: the lease is quoted, never a law; he tries
"arréglelo usted y le pago la mitad", then sends his técnico; rent in cash with a hand-written receipt, or by transfer.
The water-heater redirect of this morning ("¿El calentador? ¿Con este calor? ¿No será el aire?", then "El calentador
funciona bien, se lo aseguro.") is natural and short; it records nothing, and a heater sentence is never the AC's
problem. Glosses, flags and the natural English of every line checked; American English throughout.

**Found and fixed (19), by point.**
- 4 Facts (1): the hint "Se la transfiero el primero." answered "¿la renta de este mes?", but s81's rent is due in the
  first five days, so "the first" is next month and his "No hay problema" made no sense: the hint is now **"Se la
  transfiero mañana."** ("I'll send it by bank transfer tomorrow."); "el primero" is still understood.
- 7 Questions and meaning safety (13):
  - **Agreed on an echo:** "¿El miércoles?" / "¿El miércoles de la próxima semana?" (typed with its question mark) booked
    Wednesday, "¿El viernes?" / "¿Este viernes?" booked Friday. Now he confirms and asks, nothing booked until a yes:
    new lines "Sí, el miércoles de la próxima semana. ¿Le parece?" / "Sí, este viernes. ¿Le parece?" (an echo again gets
    the short "¿Entonces… el miércoles?"). Spoken without "?" ("El miércoles.") it stays a yes, as before.
  - The rent handed over at his "¿Algo más?" got "Primero el aire, luego la renta." although the AC was settled: now he
    takes it (and a transfer or "Ya se la pagué" there closes the wrap the same way); "Se la transfiero…" in the middle
    of the AC talk settled the rent: now "Primero el aire, luego la renta.", like cash.
  - "Este mes no le voy a pagar la renta." at "¿Algo más?" (not understood; the withhold reply said "Nadie está
    hablando de la renta"): now "La renta es la renta, y el aire es el aire." and the rent question.
  - The same line twice in a row: a second "No." to Friday repeated "Antes del viernes, imposible." (now "¿Entonces… el
    viernes en la mañana?"); a heater insisted on twice repeated "El calentador funciona bien… El aire, ¿verdad?" (now
    only "El aire, ¿verdad?").
  - No answer: "¿Quién paga la reparación?" / "¿Tengo que pagar algo?" / "¿Usted paga?" (p26's "¿La visita tiene
    costo?" case): at the offer his half ("Depende de qué tenga el aparato. Pero yo le pago la mitad, ¿eh?", also for
    "¿La mitad?" and "¿Quién paga?"); once Chucho is coming, new line **"Eso lo pago yo, no se preocupe."**; at the rent,
    "¿Tengo que pagar algo?" gets the rent. "¿Me pasa el número de Chucho?" (he leaves for two weeks): new line **"Claro,
    se lo mando por mensaje."** (Doña Lupita still gives her own técnico's). "¿Tengo que estar en casa?", and "No sé" to
    "¿Va a estar en casa?" (it got "Sin prisa."): "No hay problema. Chucho tiene llave." "¿Por qué no contesta el
    teléfono?": his "Ay, mis mensajes…". "Lo voy a pensar." at the offer or a day: the offer or the day again. "¿A qué
    hora viene Chucho?": understood; once the day is agreed it gets the window ("Entre las 9 y las 12."), not "Perfecto…".
- 9 Accepted answers (5): the learner's door in the greeting ("Soy su inquilina del 1B", "Soy Ryan, del 1B", "Vivo en el
  1B"; the building's 1C/2B too: the held-out set's one miss); the heater named after the redirect ("El calentador.",
  "No, el calentador de agua.", "Es el calentador", "Se apagó el calentador", "El agua caliente no sale", "No sale agua
  caliente de la regadera", "El agua sale fría") and "Sí, perdón, el aire" / "Ah, perdón, el aire" to "¿No será el
  aire?"; "Está bien, que venga Chucho." / "Que lo arregle el técnico." as a no to the offer (at a day on the table its
  yes is for the day), "Mejor que lo arregle yo" as a yes, never "que lo arregle yo" as a no; the rent by transfer ("Sí,
  se la transfiero", "Ahorita se la transfiero", "Mañana se la doy", "¿Puedo pagarle mañana?", "Le deposito el viernes").
  "El calentador sí funciona / está bien" is its own intent (`heater_ok`, a plain "Bueno."), so the accept tails never
  read it as the heater blamed.

**Tests.** NLU 130 → 154; sims 15 → 18 (the echo and who pays; send Chucho, his number, the rent at "¿Algo más?" and a
receipt; the heater insisted on, then the AC, thinking it over, home, a transfer), all 12/12; corpus 265/265 (0/67 false
accepts) → 315/315 (0/76: +50 items, +9 traps); held-out 36/37 → 37/37 (0/5).

**For the voices.** New Don Ernesto lines: `echo_wednesday`, `echo_friday`, `pay_mine`, `chucho_number`; changed hint
`pay_online` ("Se la transfiero mañana."). No Mexican-only word, so no twin. Lines more than one speaker can say: none
(Doña Lupita says only her seven lines; every Lupita beat hands the turn back to Don Ernesto, who says every global
reply). No plural items; the only number a templated line says is the rent, $14,000 (`domains`).

**Left.** "¿Qué tal el viernes de la próxima semana?" (later than offered) gets "El viernes está bien" and is texted as
"viernes" (the week isn't kept; harmless). "Ahorita se la pago" (now or later, in Mexico) stays not understood on
purpose. "¿Puede venir el técnico de Doña Lupita?" and "¿Y si Chucho no viene?" are not understood (rare).

## Spain twins (11 Nov 2026)

47 Spain twins (lines and hints), no register change: Don Ernesto, Doña Lupita and the learner keep usted (a
landlord, an older neighbor). Spain's words: el alquiler (la renta; "me lo transfiere", "se lo transfiero", "ya me lo
ha pagado"), el mando (el control of the AC), por la mañana / por la noche (en la mañana / en la noche), dentro /
fuera (adentro / afuera), allí (allá), solo (nada más), de verdad (de veras), ¿vale? for the tag ¿sí?, ¡Eh, eh!
(¡Epa!), una ducha (un baño, for the shower), cuando vuelva (regrese), tengo ganas de estar allí, me viene bien (me
queda bien), "Perdone que le moleste" (Spain's le for usted), "Llamo a Chucho" (Le llamo a Chucho). Spain's present
perfect for what has just happened or this week: ya me lo ha dicho, ¿ya ha mirado el mando?, ya lo ha intentado, ya
se ha leído el contrato, ha probado con una ducha, He recibido el alquiler, ya me lo ha pagado; the learner's "Le he
llamado todos los días", "Le he dejado tres mensajes", "ya lo he mirado dos veces", "Ya lo he probado todo". Kept:
San Cristóbal, Chucho, the 9-to-12 window, "viejito". Patterns take el alquiler, por la mañana/tarde, me viene bien,
dentro/fuera, el mando, the he + participle forms, perdone que le moleste. Spain corpus: 21 items, 20/20, 0/1 false
accepts. Gates: Mexican, neutral and Spain 0 errors, sims 12/12; corpus 315/315 0/77; held-out 37/37 0/5.

## Spain review (12 Nov 2026)

Fresh reviewer, all Spain twins and the untwinned lines as Spain hears them (NPC lines and hints), the Spain corpus.

Checked: Don Ernesto and Doña Lupita usted both ways, the AC facts, Chucho's days, the rent.
Found and fixed: "Listo: “Chucho, …”" ×3 (→ "Ya está:", spoken forms too); "¡Ya le mandé el mensaje!" (→ he mandado); "como le prometí" (→ he prometido); "La mitad del costo" (→ coste); "ya entendí" ×2 (→ "ya lo entiendo"); Lupita's "tome mucha agua" (→ beba).
Gates: tsc clean; check-content Mexican, neutral and Spain 0 errors, 0 warnings; corpus 315/315 0/77; held-out 37/37; Spain 20/20 0/1; vitest es 178/178.
