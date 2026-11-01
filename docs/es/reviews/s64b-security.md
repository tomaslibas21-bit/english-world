# Review: s64b-security (Oficial Torres, airport security), writer's commit 9cc3cb31

| Check | Before (writer) | After (review) |
|---|---|---|
| tsc / check-content | clean; 74/74 NLU, 9 sims 12/12, fuzz 80, 0/0 | clean; 95/95 NLU, 13 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage.ts) | 218/218, 0/52 false accepts | 233/233 (15 probe items added), 0/52 |
| blind set (38 items, 10 traps, written first) | 36/38 = 94.7%: 1 not understood, **1 flip** ("No la tire, por favor, me la tomo" → throw + drink: the bottle was thrown away) | 38/38, 0 traps |

About 50 of the 996 lines changed and 85 were added: ~45 must-fix, ~40 polish, ~50 tests and sims.

## meaning-safety (must-fix, ~30 lines)
1. **"No la/lo + verb" is read as "No," + the verb.** "la"/"lo" are `correctionStarters` (for "No, la grande"), so "No la tire, me la tomo", "No la tiro, me la tomo" and "No la vacío, tírela" ran the refused choice first and recorded it (toss_ok / empty_ok). Fixed here: whole-sentence patterns for refusal-plus-choice, and a `negated()` guard in the bottle handlers and the bottle_keep pending, so a refused choice never acts. **Engine gap, NEEDS at the top of the file:** any conversation with "No lo/la + verb" has this flip.
2. **"No traigo cinturón pero sí reloj"** at "¿Trae cinturón o reloj?" ran both pieces: shoes off *and* "Eso también". A "nothing" piece next to "pero sí …" now declines (`butYes`), so only the item acts (pockets, check_pockets, belt_watch).
3. **bottle_keep: a bare "No"** after "Agua no; la botella sí, vacía" threw the bottle away. It now gives the options again. Its first fix exposed a second bug: a held turn left the step on bag_q, and the next "Sí, es mía" restarted the whole bag check. `affirm` now skips a step that is already done, and the pending re-expects itself.
4. **"¿Los zapatos también?" during the shoes twist** got "Aquí no hace falta quitarse los zapatos" right after "Quíteselos". It now gets "Sí, los zapatos también, por favor."
5. "No, mejor me la tomo" / "No, mejor la vacío" were refusals (bottle_neg); "mejor" makes them the choice now. "No, la vacío" (no comma) stays a safe refusal (rule 10).

## rule 11 / facts (must-fix, ~8 lines)
- "¿Puedo dejarme el cinturón?" → "El cinturón, sí." (it sounded like yes). It now says "Quíteselo y póngalo con lo demás".
- "¿Mi licencia sirve?" → "Sí, está bien". A foreign driver's license isn't flight ID, so it now says "Su pasaporte, por favor".
- "¿Hay algún problema?" at "¿Esta maleta es suya?" → "No, ningún problema" (he was about to search it); it now says "Solo necesito revisarla un momento."
- "¿Con lentes?" at the camera got "Sí, un momentito" (= take them off); the pattern is now "sin lentes" only.
- Gate directions made vague ("por allá, pasando las tiendas") until s64c-gate fixes the layout (rule 14).

## understanding (polish, ~20 pattern lines)
"¿Qué tengo que sacar?" (new `ask_what_out`), "¿Saco el celular?", "¿El celular va en la charola?", "¿Tengo que sacar el bloqueador?", "¿Hay bolsas?", "Un momento, lo estoy buscando", "Ya casi", "¿Tengo que quitármelos?", "No, la mía es la negra", "No, la negra no es mía", "¿Por dónde está la sala 12?", "Se me olvidó sacar las llaves", "No, la laptop no la traigo", "Tírela, no hay problema", "Ah, sí, es agua", "Ok, otra vez" (was global repeat), "No me la tomo, tírela". An item named at the walk step gets "Deje eso en la charola" instead of "Bien."

## spanish / twins (polish, ~8 lines)
- Pockets: one word for one thing (rule 9). He said "las bolsas" once and "los bolsillos" three times, and "bolsa" is already the clear liquids bag and the learner's bag. All his lines now say bolsillos; "bolsas" is still understood. That leaves one Mexican-only line fewer.
- "Los zapatos puede dejárselos puestos" → "Puede dejarse los zapatos puestos" (the same for the glasses). "Cada envase, de 100…" → "En envases de 100 mililitros o menos."
- New lines: shoes_yes, bag_just_check, item_tray (with its charola twin), tablet_no_stay, what_out. The flags were checked against their units.

## tests
21 NLU tests (the blind traps plus the probe flips) and 4 sims that check the recorded state: watch-but-no-belt, the shoes question during the twist, drink-not-throw (`bottleChoice: "drink_ok"`) and the bare no followed by "No la tire, la vacío" (`empty_ok`). bottleDone now records `bottleChoice`.

## For the lead / owner
- The engine gap in meaning-safety 1 (lang.ts `correctionStarters` with a clitic + verb) should be fixed globally.
- The writer's open questions on facts still stand (whether shoes come off, free bags, laptops out where CT scanners are in use). The lines stay general.
