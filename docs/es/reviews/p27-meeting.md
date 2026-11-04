# Review: p27-meeting ("Con todo respeto"), writer's commit db2852b5
## Gate and blind set
| Check | Writer (db2852b5) | After review |
|---|---|---|
| tsc / vitest | clean / 288/288 | clean / 288/288 |
| check-content --verbose | 108/108 NLU, 21 sims 12/12, fuzz 80, 0/0 | 124/124 NLU, 24 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage.ts) | 182/182, 0/42 false accepts | 194/194, 0/42 false accepts (12 review items added) |
| blind set (40 items, 7 traps, written before reading) | **31/35 = 88.6%**, 0/5 false accepts | 34/35 = 97.1%, 0/5 (not blind any more) |

Writer's claims held. Blind misses: "no sé, creo que…", "no hayamos hecho… pruebas", "sigo preocupado", "me tengo que ir, tengo otra junta".
## Fixes (77 lines added, 16 changed in the conversation)
**meaning-safety, must-fix (~17 lines), all found with probe.ts, rule 22:**
1. "Dos semanas no me funcionan / no me parece bien" at "¿Trato hecho?" parsed as counter_offer[w2] + disagreement, and the
   two-week counter **closed the deal**. A whole pattern now reads it as "more time" (her final three weeks); "Un mes / Tres semanas
   no me sirven" is a disagreement (at the final offer Gerardo decides). Sim "the weeks refused; no coffee".
2. "No, gracias" to the coffee **accepted it** ("Perfecto. Pero todavía no estamos de acuerdo con la tipografía."); the same
   g_thanks route made it a yes to "¿El lunes…?" and a "let her in" at the twist. Thanks with a no are now a no (twist: finish).
3. "Me parece bien, pero tres semanas" closed the deal on the first piece; the counter-offer in the turn now answers.
4. "No hay un punto medio" (a statement) was the a_mid proposal ("Ganaste la mitad"); "no hay" left the pattern, and the
   engine's no-lead reading is caught in onOffer unless asked. Sim "no middle ground, then one" (fails on the writer's file).
5. "Ahorita no" at the coffee/Monday now declines instead of a bare goodbye.

**understanding (~22 lines):** subjunctive "no hayamos probado/hecho pruebas"; "sigo preocupado / sigo con dudas" after
granting her point; "Estoy en contra" (tip soften); "No me parece tan buena idea", "No es buena idea lanzarla el viernes";
"No me parece justo / No es un buen trato", "No tiene sentido", "No tienes razón" (tip), "No acepto el trato", "No me rindo",
"No he cambiado de opinión", "No lancemos el viernes" (all disagreement, never give_in/accept); "No del todo / En parte" at
"¿O sea que estás de acuerdo conmigo?"; "No tengo (ningún) problema con el plan" (agree); "¿Y si Gerardo decide?";
"Perdón, me tengo que ir, tengo otra junta" (walk_away); "Ahorita no", "Espera, no he terminado" at the twist;
"Así está bien" to "¿Trato hecho?" (no money: accepts; the engine read it as a no, "¡Ay, ya te estoy dando la mitad!").

**spanish (1, must-fix):** too_blunt's `better` said "no estoy segura" to every learner (tips can't switch gender) → "Con todo respeto, no creo que sea la mejor opción."
**gloss-english (2, polish):** "entra" → comes-in (el sesenta por ciento); g_decide3 natural English "a good compromise".
**numbers, twins, facts, structure:** nothing to fix. $60,000/month is said once (made up, harmless); 3 Mexican-only lines
with twins; steps, intents, twist and endings match the English original. Transcripts seeds 3 and 8: no line twice in a row.
**tests:** 17 NLU traps, 3 sims (weeks refused + no coffee; no-thanks twist + yes-with-counter + así está bien; no middle
ground), 12 corpus items, the writer's "No es un buen acuerdo" test now expects disagree_polite.
## For the lead
- NEEDS (lang.ts/global): "No sé, <reason>" ("Mmm, no sé, creo que es muy pronto") is not understood. Adding "no se" to the
  file's opener macro made "No es muy pronto" / "No tiene errores" concerns (droppable "se" leaves "no"), so it was reverted.
  A global "no sé," lead (kept only when "sé" is said) would fix it. Writer's two NEEDS (newPart "tal", g_dontknow) stand.
