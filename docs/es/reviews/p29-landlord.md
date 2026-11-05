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
