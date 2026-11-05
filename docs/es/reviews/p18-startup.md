# Review: p18-startup ("Hasta el cuello"), writer's commit 560a0112

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 83/83 NLU, 14 sims 12/12, fuzz 80, 0/0 | 99/99 NLU, 17 sims 12/12, fuzz 80, 0/0 |
| corpus `coverage.ts` | 192/192, 0/29 traps | 199/199, 0/29 traps (7 review items added) |
| blind set (40, written before reading) | 34/40 = **85%**, 0 traps accepted | 39/40 = **97.5%**, 0 traps accepted |

The one blind miss left, "Vale, hasta mañana a las ocho", is read as a goodbye plus the hour. It closes the day (item 4, closeHow "bye") but records no meeting time. That's harmless, so I left it.

## Fixes (git numstat: 31 lines of the conversation removed or changed, 98 added; 27 of the added lines are tests)

**meaning-safety (must-fix, ~14 lines)**
1. "No hay problema, me quedo hasta tarde" at the midnight demand **recorded a refusal** ("Vete a casa"). The stay_yes handler took any "no" as a negation. Now "no hay problema" and "no te preocupes" don't count as one.
2. "Me quedo hasta las doce" **recorded stayUntil = noon** ("¿Hasta las 12:00? Me parece justo…"). `midHour()` now reads "las doce" as midnight wherever the overtime is negotiated (the step, the deal, the what-if and mid_when).
3. "A las ocho no puedo, ¿a las diez?" **booked eight**: it split into "A las ocho" plus cant_time. A whole pattern now books ten (rule 10).
4. "No, es demasiado" at "¿Es demasiado?" was read as "No es demasiado": "¡Eres un crack!" and pileSkip, so the overload was lost. "No es demasiado/tanto/mucho", "No es fácil" and "No puedo hacer todo eso" are now `#amb` (but not "No, no es demasiado"), and Toño asks once more (and never says "¡Eso!" first). The writer had done this only for "No puedo con todo".
5. "No la fiesta, la presentación primero" recorded the party first and Toño pushed back for the deck. Now "No X, Y" and "X no, primero Y" take Y.
6. Rule 11: "Sí" / "Sí, todo está en chino" to "Al principio todo está en chino, ¿no?" got "¡Me encanta! Eres un crack." Now it gets the hard-week answer ("Es normal… ¡Échale ganas!"), and so do "un poco" and "la verdad, sí".

**understanding (must-fix for the common ones, ~16 pattern lines)**: "Ya tengo un montón de trabajo con {task}", "No es fácil", "Puedo hacer la presentación, pero no lo demás", "No quiero hacer la fiesta", "…la semana que viene", "¿Quién hizo las cosas al aventón?", "Hoy no me puedo quedar tarde", "Claro, me quedo, no hay problema", "Prefiero irme a las ocho", "Bueno, pero solo si me pagan" (Toño offers the paid deal and asks), "No, no puedo hasta las nueve" at the deal (Toño asks "¿A qué hora te funciona?" instead of sending the learner home), "¿Podemos a las seis?", "Ya estuvo por hoy, ¿no?".

**spanish, gloss-english, numbers, twins, structure**: no changes. I checked about a third of the glosses and every flag index, and all were right. The twins are on their lines, and the steps, intents and both twists match the English.

**tests**: 16 NLU tests (the traps above), 3 sims (the lost commas plus the moved check-in; "no hay problema" plus "las doce"; "no puedo hasta las nueve"), 7 corpus items. I read the transcripts on seeds 3 and 8.

## For the lead / the owner
- **Memo** is also the name of another person in s86-old-friend. If each name should belong to one person, rename the developer here. That's the owner's call, along with the writer's four names. (Done 5 Nov: the developer is Lalo; see the end of this file.)
- Overtime stays vague ("como dice la ley", no rate), which I think is right. "¿Quién la regó?" is still not understood: the pattern is there but doesn't match (maybe the engine reads "regó" as a slip). There is no test for it.

## 5 Nov 2026: the developer is Lalo

The open call above was decided on the owner's "decide on best fixes": the developer **Memo is now Lalo** everywhere in
p18, so Memo is only s86's exchange student. Changed: Toño's five lines that name him (crash_fix, crash_ben,
crash_skip, owner_code, who_lalo), their glosses and natural English (none has a neutral twin, and none needs one), the
hint "Hay que llamar a Lalo." (`ask_lalo`), the patterns (`ppl`, `asklalo`, `pl_hort`, the `person` slot, `PERSON`,
`delegLine`), one NLU test plus a new one ("¿Quién es Lalo?"), and the corpus (3 items renamed, 5 added). Before the
rename no Lalo (or Eduardo) existed anywhere in the edition's content, briefs, tests or docs. **Rodrigo stays**: Don
Rigo, the taxi driver (`vinnie`), is never called Rodrigo (npcs.ts, s66, VOICES.md, the picture manifests).
