# Review: s86-old-friend ("¡Cuánto tiempo!", Paola), writer's commit 071b7284

## Gate and blind set
| Check | Before (writer) | After (review) |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 74/74 NLU, 9 sims 12/12, fuzz 80, 0/0 | 89/89 NLU, 10 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage) | 206/206 (100%), 0/22 false accepts | 218/218 (100%), 0/24 false accepts |
| blind set (39 + 1 trap, written first) | 36/39 (92.3%), 0/1; 1 of 6 `not:` traps accepted ("¿Memo? ¿Quién es?" → mike_yes) | 39/39 (100%), 0/1, 0 traps |
| vitest | 288/288 | 288/288 |

## Fixes (src file: 30 lines changed or removed, 66 added (36 net); must-fix ~40 lines, polish ~12, tests ~25)
- **meaning-safety (must-fix, 6):** "No es mala idea" was a *decline* (coffee and the dinner): the pattern `no es (buena | mala)? idea`; now "no es buena idea" only, "no es mala idea" is agree. "¿Memo? ¿Quién es?" was a *yes* (`memo [si] [claro]`): now needs sí/claro, and mike_who_ctx takes "Memo, ¿quién es?". "Me voy a casar" no longer gets "¡Yo también! …¡me casé!" (her "me too" now needs a real wedding said).
- **understanding (must-fix, ~14 pattern lines):** "No muy bien, la verdad. Mi mamá estuvo enferma.", "Sigamos en contacto", "Sí, pero no tengo mucho tiempo" (a yes), "Me gustaría, pero el viernes trabajo" (a no), "No, no me he casado" / "Nunca me casé" / "Estoy buscando trabajo" (news_not; the last gets "¡ya vendrán tiempos mejores!"), "Ya no estoy casada, me divorcié", "Me voy a casar el próximo año", "No tengo celular mexicano todavía".
- **replies (rule 8/11, must-fix, ~10):** "No tengo WhatsApp" and a bare "Sí, claro" at the number step each got the number question **twice in a row** (no hold); now "¡Perfecto! ¿Cuál es?" once. "No, gracias" to the number got the question again unanswered; now one "¿Seguro? ¡Así no nos perdemos otra vez!". "Sí, claro, ¿a qué hora?" at the dinner idea answered "¡Perfecto! Yo le pregunto." and dropped the question; now "Como a las ocho. Yo le pregunto a Memo." "No sé" to "¿Te acuerdas de Memo?" got the same question again; now the hint.
- **facts (must-fix, 3):** Memo's "restaurante de mariscos en el malecón, cerca del muelle" clashed with El Muelle, the town's seafood restaurant at the pier (s62/s69 read "el restaurante de mariscos" as El Muelle). Now an unnamed "restaurante en el malecón" (rule 14: vague).
- **spanish (polish, 2):** two questions in a row both opened "Y cuéntame, …" → "Oye, ¿y qué has hecho todo este tiempo?"; "No el viernes, el sábado" got "le pregunto a Memo qué día puede" → "si puede ese día".
- **gloss-english (polish, 2):** ans_photo "Look, here!" → "Look, here it is!"; i_will gloss "From you, I will!" → "From you!".
- **numbers / twins / usted:** fine. Phone number read in groups and pairs, 984 area code; twins (cuates, va, ahorita, padre, no inventes) 6 of ~100 lines; usted to Paola understood with a tip.
- **structure:** steps, intents and the three twists match the English; the added intents are all `_ctx` or narrow.
- **tests:** 15 NLU tests (the blind traps and probe finds), 1 sim (Memo who → dinner time → "Sí, claro" → number), 12 corpus items; blind set added.

## Probes played (rule 22)
Coffee: no / no gracias / ya tomé café / mañana / no es mala idea / está bien gracias / price question / where. Dinner: maybe, Friday no,
work, what-if, price, past, closing, yes + question. Number: refusal, not now, past, no WhatsApp, pairs, bare yes, no phone. All record the
right state now; unanswerable ones ("¿Y si no puedo?", "¿Es caro?", "Ya te lo di") are not understood (safe).

## For the lead
- NEEDS (header): `PART_VERBS` in lang.ts lacks "trabajo/vivo/soy", so "No me casé. Trabajo en un hotel." isn't understood.
- "Está bien, gracias" to her coffee or dinner idea reads as yes; nothing is paid, so I left it (rule 17 is about money).
- Owner: Paola's own story (married two years ago to Daniel, twins Mateo and Sofía, about one) is invented; Memo is a new person.

## Audit (5 Nov 2026)

Fresh reviewer (AUDIT-BRIEF.md), both texts. Read: STYLE.md, AUTHORING-ES.md, the brief, the review above, the cross
and neutral files (with the cross file's "Town directions (5 Nov)"), TOWN.md "Getting around", the transcripts of
seeds 3 and 7, and about 120 probe turns (`tools/probe.ts`: every question and offer with yes, no, "No, gracias",
"Está bien, gracias", maybe, asked back, side questions and goodbyes; past-tense news; the ways to swap numbers).
Names checked across src/editions/es/content, BRIEFS.md and tests/es: Memo is only this exchange student (p18's
developer is Lalo since db00d9c3).

**Found 32, fixed 31** (1:4 2:0 3:2 4:3 5:1 6:0 7:18 8:1 9:3 10:0).

1. Natural Spanish. "¡Ja, pero si vamos juntos por el café!" was said to women too: `{m:juntos|f:juntas}`. The
   twins' line opened "¡Gracias!" when the learner had said nothing kind (their own news, "Bien, gracias" after her
   "¡Me casé!"): "Y… ¡tenemos cuates!" unless the learner just congratulated her. "¡Ay, mándales saludos de mi
   parte!" was followed at the goodbye by "¡Saludos a tu familia! ¡Adiós!": no second greetings. "¡Uy! ¡Cuántas
   noticias!" came right before "¡Ay, lo siento mucho!": not before bad news.
2. tú/usted: tú both ways, hints too; usted understood with the tip. Nothing found.
3. Names. The twin girl was Sofía, the name of Línea Clara's team lead (`kate`, s34, s89): now **Regina** (no other
   Regina in the edition). Daniel (her husband) vs Daniela (the gate agent, s64c): another person and gender, left.
4. Facts. La Ceiba was "aquí en la plaza" in three lines; the 3D town has it on avenida Juárez, a block and a half
   west of the zócalo: "La Ceiba está aquí cerquita, en la avenida Juárez" (ask_coffee), "Vamos a La Ceiba, aquí en la
   avenida Juárez" (lets_sit, alt_ok), as s69 says it. Memo's restaurant stays an unbuilt place on the malecón (TOWN.md
   lists it), now named: La Palapa, Mexican food (El Muelle is the seafood place), about $200 a person.
5. English. mike_dinner_again "So, Friday at Memo's?" for "¿el viernes con Memo?" → "So, Friday with Memo?".
7. Questions and offers (each probed before and after):
   - The number, refused: "No, gracias" → "¿Seguro?" → a bare "Sí" (yes, I'm sure) got "¡Perfecto! ¿Cuál es?": the
     refusal taken as a yes. A second no got "Entonces, ¿cuál es tu número?", a goodbye "¡Espérate…! ¿Cuál es tu
     número?" (three asks after two noes); in the rush twist a "No, gracias" was ignored; after "Perdón, me tengo que
     ir" → "¿Cuál es tu número?" a "No, gracias" got "¡Gracias! Y… ¡tenemos cuates!"; "No quiero darte mi número",
     "Prefiero no dar mi número", "No me gusta dar mi número" weren't understood. Now an explicit refusal
     (`refuse_number`) is accepted at once; a bare no gets one "¿Seguro? ¡Así no nos perdemos otra vez!", and then any
     yes or no keeps the refusal (`number_sure`; only a number or a hand-over swaps). New `number_fine`: "¡Está bien,
     no pasa nada! Seguro nos volvemos a ver por aquí." She never asks again, no "¡Me escribes, eh!" without numbers,
     and the goal stays open (no swap, no completion; three sims).
   - Coffee and dinner, refused: "No tengo ganas", "No me late", "No se me antoja", "No creo que pueda", "No, no puedo,
     perdón", "Ya tengo planes", "Lo veo difícil", "Paso" weren't understood → decline. "Está bien, gracias" to her
     coffee or dinner idea was a yes (in Mexico often a polite no): asked once more ("Entonces, ¿un cafecito?",
     "Entonces, ¿el viernes con Memo?"), and a second one is a no. A coffee agreed, then "Ay, perdón, se me olvidó que
     tengo una cita" (or "me tengo que ir" at the goodbye): no coffee, and no "¡Ja, pero si vamos juntos!" joke. "El
     viernes no puedo." … "¿Y el sábado?" wasn't understood: the dinner on another day.
   - Her side: "¿En qué trabajas?" / "¿A qué te dedicas?" got her wedding news or "¡Ja, esas son mis grandes
     noticias!", "¿Dónde trabajas?" nothing, "¿Dónde vives?" after her news the same "grandes noticias", "¡Paola! ¿Qué
     haces aquí?" no answer: new `ans_job` ("Soy maestra de inglés en una escuela de aquí. ¡Gracias al intercambio!")
     and `ans_live` ("¡Vivo aquí, en Puerto Colibrí!").
   - Memo's restaurant: "¿Cómo se llama el restaurante?", "¿Qué tipo de comida tiene?", "¿Es caro?" at her dinner idea
     weren't understood: new `ans_restaurant` ("Se llama La Palapa: comida mexicana, ¡riquísima!") and `ans_price`
     ("Como doscientos pesos por persona. ¡Nada caro!"), then her question again. "¿A qué hora?" / "¿Dónde está?" now
     settle it (they had "Entonces, ¿el viernes con Memo?" and then "Yo le pregunto" twice).
   - The swap: "¿Cuál es el tuyo?" was read as Memo's news + "lo de siempre", "¿Y el tuyo?" as "and you?" (`yours_ctx`
     now); "Te paso el mío: 984…", "El mío es…", "Dame el tuyo y te marco / te hago una llamada perdida", "¿Tienes dónde
     apuntar?" (`note_ctx`), "Bueno, sí, te lo doy", a +1 number weren't understood; "Mi número es 984…" before she
     asked (at her news, at her dinner idea) wasn't understood (`my_number`); "Va, ahí nos vemos" handed her a phone (a
     dropped "está" made "ahí" a hand-over): `bye_ctx` and a guard. "¿Dónde está La Ceiba?" / "¿Ahorita?" at her coffee
     question: a yes and the way.
8. Hints. The goodbye hint "¡Saludos a Memo!" showed in runs where Memo never came up (about a third): "¡Saludos a tu
   familia!".
9. Accepted answers. "¿Qué has hecho todo este tiempo?" invites the past, and most past-tense news weren't understood
   ("Terminé la universidad y viajé por Asia", "Me fui a vivir a Canadá y luego regresé", "Viví en España un año",
   "Estuve viviendo en Londres cinco años", "Conseguí trabajo en un banco", "Me cambié de trabajo / de casa", "Compré
   una casa y abrí un negocio", "Nació mi hija", "Me gradué", "He viajado muchísimo", "Hace tres años me mudé a
   México"): 25 patterns; a degree, a business, a house or a new job get "¡Felicidades!", the rest "¡Ah, qué
   interesante!" (news kind `other`). A move elsewhere is never "¿Ahora vives aquí?", and the move detection no longer
   takes "Me vine de vacaciones" or "Me cambié de trabajo" for a move here. Negated pasts stay no news ("No terminé la
   carrera", "Nunca viví en España").
10. Neutral: the six twins are right; the new lines have no Mexican-only word.

Tests: NLU tests 89 → 124, sims 10 → 17 (12/12 each), corpus 242 → 311 items (+69; 30 more with `not`), held-out +12
written blind before the fixes (10 of the 12 not understood or misread before).

Gates (after merging origin/spanish-edition at fac2d205): tsc clean; check-content 124/124, 17 sims 12/12, fuzz 80,
0 errors 0 warnings; corpus 282/282 understood (was 218/218), false accepts 0/29; held-out 51/51 (was 41/51 with the
blind items), 0/1; vitest (es) 113/113.

Voices (before the freeze), all Paola's (one speaker; no values, no plural items): changed ask_coffee[1], lets_sit,
alt_ok, ans_names ("Mateo y Regina."), bye_coffee_joke (+ the "juntas" form); new ans_job, ans_live, ans_restaurant,
ans_price, number_fine; bye_take_care repeats bye_lucy's third goodbye word for word (no new clip); the hint by_say_hi
"¡Saludos a tu familia!". No neutral twin changed or added.

For the lead (shared files): TOWN.md "Named in the conversations, not built": Memo's restaurant on the malecón is La
Palapa (Mexican food, about $200 a person); BRIEFS.md s86: the twins Mateo and Regina, Paola teaches English at a school
in town. For the owner: Paola's job and the restaurant's name are invented, as her story was.

## Spain twins (11 Nov 2026)

- 38 Spain twins (lines and hints), 20 items in tests/es/spain/s86-old-friend.json (all understood, 0 false accepts).
- Register: no change. Paola says tú both ways in every variety; one person, so no vosotros.
- Words: ¡Espera! (for ¡Espérate!), del instituto (for de la escuela), profesora en un colegio, estás genial (for te ves
  súper bien), maja / majo, ¡Qué bien! Me alegro (for ¡Qué bueno! Me da gusto), has elegido el mejor sitio, volví (for
  regresé), ¿sabes qué? (for ¿qué crees?), unos doscientos pesos, dales recuerdos, padre / padres, mi marido, café (for
  cafecito), sobre las ocho, ¡Vale!, pequeño / solo (for chiquito / nada más), vamos a tomar un zumo / un café (for vamos
  por un jugo / un café), móvil, ¡Ya está! (for ¡Listo!), ¡Qué alegría verte!, me alegro mucho por ti.
- Spain's present perfect for what just happened: ya he hablado mucho de mí, se me ha hecho tarde, te he guardado mi
  número, me ha encantado verte, qué bien que nos hayamos encontrado, the learner's ¡Me he casado!. Paola's "me casé"
  stays: she places it last spring.
- Grammar: me he mudado / me he casado, mellizos and ¡Qué ilusión!, tu marido, allí nos vemos, no llevo el móvil, me
  ha encantado verte / qué alegría verte, recuerdos a… Merges for the new units.

## Spain review (12 Nov 2026)

- Checked (fresh reviewer): every twin against its Mexican line (meaning, facts, prices, names), Peninsular wording, the perfect for today's events, tú/usted and vosotros by STYLE.md, glosses, spelling and ¿¡, the Spain transcripts (`--variety=spain --verbose`, untwinned lines read through their neutral fallback) and tests/es/spain.
- Found: nothing to change (instituto, colegio, zumo, móvil, me ha encantado verte, la primavera pasada with the preterite, maj{o|a}).
- Fixed: nothing.
