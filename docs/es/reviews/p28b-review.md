# Review: p28b-review ("Lo que salió muy bien"), writer's commit 6560d907

## Gate, before and after
| Check | Writer | After review |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 93/93 NLU, 14 sims 12/12, fuzz 80, 0/0 | 108/108 NLU, 15 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage) | 250/250, 0/23 false accepts | 260/260, 0/25 false accepts |
| vitest | 288/288 | 288/288 |
| **blind set** (37 items, 7 traps, written before reading the draft) | **29/37 = 78.4%**, 0/7 traps | 36/37 = 97.3%, 0/7 traps |

The one blind "miss" left, "Ahorita no, por favor" at the consent step, is read as a bare no. That does the same thing as no_feedback (consentNo).
The after-score isn't blind, but the fixes are general constructions, not the exact sentences. The draft was careful: its Spanish and logic were sound, and its traps held. Its gaps were natural phrasings and a few replies to combined answers.

## Fixes (about 75 lines added, 23 changed in the conversation)
**meaning-safety (must-fix, ~8 lines)**
- Check-in: "No, en un mes está bien" was read as declining and got "Te mando una invitación y tú escoges la hora". The leading "no" (saidNo) beat checkin_yes_ctx. Now checkin_yes_ctx always agrees.
- Feedback: "No tienes razón" (bare, in rude_push) is also "No, tienes razón" once the comma is gone (rule 10). That learner got the "Eso no es verdad" tip. The bare pattern is now `#amb`, and Elena asks "Perdón, ¿estás de acuerdo o no?" (new line fb_which). "No tienes nada de razón" stays rude.
- A salary question asked early ("¿Podemos hablar de mi sueldo primero?") got "Claro, hablemos." and then "Lo vemos al final, ¿sí?" at once. Early questions now get "Buena pregunta" / "Es una pregunta justa".
- Budget: "¿De cuánto es el presupuesto?" got "¡Sí! $10,000…" (rule 11). Now "cuánto/quién" questions get the amount line, and yes/no questions get "¡Sí!…" at any step. Before, "¿Hay presupuesto?" after the goal got "Y una buena noticia: …".

**understanding (must-fix for the common ones, ~22 pattern lines)**
- "Gracias, es muy útil" (eso had been required), "Tengo curiosidad", "Tranquilo, me siento listo", "Planeamos todo con mucho tiempo", "No, gracias a ti".
- Also "No me molesta, dime", "¿Por qué dices eso?", "No creo que sea justo" (pushback), "No voy a trabajar en eso" (defensive_fb; it was none) and "Me parece bien, en un mes".
- Rev twist: "Lo que funciona muy bien es que siempre nos escuchas", "No eres una mala jefa" (praise, never rev_rude), "No siempre nos dices las prioridades" (tip).
- "No quiero hablar del sueldo, gracias" now means no more questions (no_more). "No muy bien, la verdad" now gets feel_bad.
- New `more_q_ctx`, expected only at ask_me and "¿Algo más?": "Sí, tengo una pregunta más" was not understood. It now gets "Claro, dime." exactly once (the yes and the intent share one once-key).

**structure / replies (must-fix, ~2 lines)**
- "No quiero tomar un curso de liderazgo, mejor análisis de datos" set the right goal, but Elena first said "De acuerdo, eso no. ¿Y qué sí te gustaría?" and listed her ideas. goal_not now stays quiet when a correction ("mejor / sino / prefiero / más bien") follows in the same turn.

**tests**: 15 new NLU tests; 1 writer test corrected ("No voy a trabajar en eso": none → defensive_fb). There is 1 new sim, "review: corrections in one breath", which covers the #amb ask, the goal correction, one more question and "No, en un mes está bien". 10 corpus items were added.

**spanish / gloss-english / numbers / twins / facts**: no changes needed. I read seeds 3 and 8 and every twist sim: no line is said twice in a row, and the Mexican office register is natural (junta↔reunión twin, ahorita twin). Spoken "$10,000" uses `say:`, and flags point at the right units. Pablo matches s34.

## For the lead / owner
- NEEDS (shared global.ts): g_howareyou_bad doesn't take "…, la verdad" (carried here by feel_nervous #bad). The writer's notes on g_welcome, g_thanks and g_howareyou still stand.
- The $10,000-a-year training budget is the made-up company's own figure (plausible, not sourced). Fine as fiction.
- Left as is: "Vale" / "Ok" at "¿Algo más?" opens a question ("Claro, dime."), which repeats the offer (rule 17). "Ya tomé un curso…", "¿Y si tomo…?" and "¿Cuánto cuesta un curso?" at the goals step aren't understood, which is safe.
