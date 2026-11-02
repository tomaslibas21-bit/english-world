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
