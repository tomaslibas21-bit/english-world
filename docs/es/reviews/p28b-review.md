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

## Audit (5 Nov 2026)

Fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), BRIEFS.md p28b, this review, the
cross and neutral files (no leads: names, facts, spelling, American English, the offer probe and the seven twins all
fine), the situation file, corpus and held-out, the transcripts (seeds 3 and 7), the scene data, the picture manifest and
six of the pictures. Probed ~150 turns with tools/probe.ts at her three offers (her suggested goal, her agenda idea, the
check-in), at the goals step and for side questions; the same turns in the English file.

**Found 14 by point** (1:0 2:0 3:0 4:0 5:0 6:0 7:12 8:1 9:1 10:0), **fixed 14**.

- **4 (pay and numbers, Mexico):** realistic and the same everywhere: a training budget of $10,000 a person a year (the
  company's own figure, said with `say:`), raises decided next month after the reviews, her answer by Friday, the
  check-in in a month, the website project in January, two interns in March, the course in the spring (a year-end review).
  The pictures carry no numbers (tab: Pablo's photo and star rows only; checkin: a blank calendar grid; summary/goals:
  gray lines), so nothing can disagree; Pablo's look in the tab picture matches the cast.
- **7 (meaning safety: a goal or a commitment only on a clear yes):** at her suggested goal ("Yo te sugeriría las
  presentaciones a clientes"), "Gracias.", "Ok/Vale/Está bien, gracias." and her idea asked back ("¿Presentaciones a
  clientes?", "¿Las presentaciones?", "¿Presentaciones, no?") set the goal; "Puede ser." / "Tal vez." were not understood.
  The same at her agenda idea ("Gracias." → "Perfecto. Listo.") and at the check-in ("Gracias.", "Ok, gracias.", "¿A la
  misma hora?", "¿En un mes?", "¿Cuándo nos vemos?" agreed on the date). Now a clear yes agrees ("Sí", "Ok", "Está
  bien", "Bueno", "Buena idea", "Me parece bien", "Suena bien", "Sí, gracias"); a thanks, a maybe (new `maybe_ctx`) or an
  echo gets her question once more (new lines `goal_offer_q` "Las presentaciones a clientes, sí. ¿Te parece bien como
  meta?", `protect_offer_q` "Tus partes en la agenda, con tu nombre. ¿Te parece?", `checkin_again` "En un mes, a la misma
  hora. ¿Te parece bien?"); the next unclear answer leaves the goal for next time (`goal_later`), has her decide the
  agenda (`protect_decide`, as after "No sé"), or sends an invite (`checkin_other`). A goodbye at the check-in still ends
  it as before (the learner leaves). Declining her goal got "Si necesitas algo, nada más dime" (`support_none`); now
  "Bueno. Piénsalo y lo vemos la próxima vez."
- **7 (wrong meanings):** "¿Qué es UX writing?" / "¿Qué significa liderazgo?" set that goal: now never (new
  `goal_what_ctx`, the global "Mira, te explico" with the meaning shown); "UX writing, ¿no?" (a tag question) was read as
  "UX writing, no" (`goal_not`): now it picks it ("UX writing no" without the question mark stays a no). "¿Cuál es mi
  calificación?" was read as the wrong-tab question and got "¿Algo más?": new `ask_rating` ("¿Qué calificación tengo?",
  "¿Cómo me fue?", "¿Puedo ver mi evaluación?") gets `my_review` "¿Tu evaluación? Muy buena, en serio. Te la mando por
  correo hoy." (at the wrong tab it makes her look again). "¿Qué debería hacer?" / "¿Cómo lo hago?" got the example's
  dates: new `ask_how_fb` and `fb_how` "Habla al principio de la llamada. Aunque sea una idea pequeña, dila."
- **7 (not understood):** money questions at "¿Tienes alguna pregunta para mí?" ("¿De cuánto es el aumento?", "¿Cuánto me
  van a subir?", "¿Me van a ascender?", "¿Hay bono este año?") now get the raises answer; "¿Sobre qué?", "Claro, ¿qué
  pasó?", "¿Hice algo mal?" at her consent question; "Se ve bien." / "¿Quién es?" / "¿Esa soy yo?" at Pablo's review
  (new `tab_look_ctx`); "¿Las juntas con clientes?" / "¿Hablar antes?" (the example).
- **8 (hint):** "Algo que podrías intentar es {X}" with a noun ("…es prioridades más claras", "…es menos correos en la
  noche") is a calque (intentar wants an action; ser should agree with a plural); now "Algo que podrías probar: {X}."
  (also the kind tip's better form and the sims' auto answer); the old form is still understood.
- **9:** "Me gustaría dar mentoría" / "Quiero dar mentoría" (her own words) and "Me interesa {goal}" were not
  understood; "No me interesa {goal}" is `goal_not`.

**Voices:** 5 new spoken lines, all Elena's, all neutral (no twin needed): `goal_offer_q`, `protect_offer_q`,
`checkin_again`, `my_review`, `fb_how`; one hint changed (`rev_try.rev_one_thing`, coach voice); no existing line's words
changed. One speaker (Elena) says every conversation line; no entities with `attrs.plural`; no new values.

**Tests:** NLU 108 → 126; sims 15 → 19 (all 12/12): "audit: no yes in a thanks or an echo", "audit: polite thanks
twice", "audit: side questions", "audit: the wrong tab looks fine". Corpus 260 → 297 understood (+37, 13 with `not`
traps), 0/25 false accepts; held-out 36/37 (unchanged: "Ahorita no, por favor" is read as a bare no, which does the same).

**Left:** "¿Por qué presentaciones?" at her suggestion and "¿Cuánto cuesta el curso?" are not understood (safe);
choosing from her list as a question ("¿Dirigir un proyecto pequeño?") still picks it (the learner's own choice from a
menu, not her single offer said back).
