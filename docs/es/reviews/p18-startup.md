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
- Overtime stays vague ("como dice la ley", no rate), which I think is right. "¿Quién la regó?" is still not understood: the pattern is there but doesn't match (maybe the engine reads "regó" as a slip). There is no test for it. (Audit 5 Nov: both done. The
  pay is now stated, double as the law says, and the pattern needed the accent on "regó"; see the end of this file.)

## 5 Nov 2026: the developer is Lalo

The open call above was decided on the owner's "decide on best fixes": the developer **Memo is now Lalo** everywhere in
p18, so Memo is only s86's exchange student. Changed: Toño's five lines that name him (crash_fix, crash_ben,
crash_skip, owner_code, who_lalo), their glosses and natural English (none has a neutral twin, and none needs one), the
hint "Hay que llamar a Lalo." (`ask_lalo`), the patterns (`ppl`, `asklalo`, `pl_hort`, the `person` slot, `PERSON`,
`delegLine`), one NLU test plus a new one ("¿Quién es Lalo?"), and the corpus (3 items renamed, 5 added). Before the
rename no Lalo (or Eduardo) existed anywhere in the edition's content, briefs, tests or docs. **Rodrigo stays**: Don
Rigo, the taxi driver (`vinnie`), is never called Rodrigo (npcs.ts, s66, VOICES.md, the picture manifests).

## Audit (5 Nov 2026)

A fresh reviewer (AUDIT-BRIEF.md). Read: STYLE.md, AUTHORING-ES.md, the brief, this file, the cross and neutral audit
files for p18, the situation file, the corpus and the held-out set; the transcripts on seeds 3 and 7; 25 probed
scenarios (tools/probe.ts); every changed line and hint rendered in both texts.

**Found, by point** (23; 22 fixed here, 1 for a shared file):

1. **Natural Spanish (4).** "Semana grande" for "big week" is an English calque Mexicans don't use that way →
   "semana intensa" (pile_intro[1], mid_1). mid_why repeated mid_1's phrase and listed "la fiesta", which Toño had
   just moved to next week → "Los inversionistas, la presentación, el lanzamiento… ¡todo es esta semana!". mid_yes
   "Y sí, son pagadas" had no subject → "Y sí, las horas extra se pagan" (and "Otherwise" in the English). "No sé" at
   the midnight request got "¿Pagadas? Eh… sí." (an answer to a question nobody asked) → a new line, mid_help:
   "Bueno, te propongo algo: hasta las nueve, con horas extra pagadas. ¿Trato hecho?".
2. **tú/usted (0).** Toño is informal; the hints say tú to him; usted to him is understood.
3. **Names (0).** The Lalo rename is complete and natural (five lines, the hint, the patterns, `PERSON`, `delegLine`,
   the corpus; Memo is left only in the header's note). Raquel, Beto, Rodrigo, Lalo and Wifi are unique ("Wifi"
   elsewhere is the network); Rodrigo vs. Don Rigo stays as the lead decided.
4. **Facts (3).** Overtime: "como dice la ley" gave no rate → "Se pagan dobles, como dice la ley" (Ley Federal del
   Trabajo, art. 67; the 40-hour reform, DOF 1 May 2026, keeps double pay while its caps change in stages, so no cap
   is said). "Paramos a las nueve" is three hours after the six o'clock end, inside the daily cap before and after the
   reform. "Puedo quedarme hasta las seis" got "Horas extra pagadas" although six is the normal end ("Vete a tu casa a
   las seis") → it is now that answer (mid_cant). A deadline question about the party, the photo, the bug reports
   or the emails got the deck's deadline ("El viernes a las doce…") → each gets its own line (wa_party "¿La fiesta?
   La próxima semana…", wa_photo, wa_bugs, wa_emails; the budget, payroll and code send you to Raquel or Lalo).
   Brotecito at the malecón's end (TOWN.md) fits "a warehouse on the waterfront"; no directions are given.
5. **Glosses and English (3).** prio_ok_then / prio_wait said "the reports of bugs" (a plural binding with no
   `natPl`) → `natPl` on both always-plural items ("the bug reports", "the customer emails"). "Shall-we-do" /
   "shall-we-meet" glosses → "Should-we-…" (American). who_ask's flag said le doubles a person "after the verb" →
   "le doubles “a quién”".
6. **Spelling (1).** The pattern "quien (la rego | …)" had the past without its accent, so "¿Quién la regó?" never
   matched (the open note above) → "la regó".
7. **Questions (7).** Must-fix: "¿Hasta la medianoche?", "¿Hasta las doce?" and "¿Me quedo hasta la medianoche?"
   (Toño's demand asked back) recorded a promise to stay ("¡Eres un crack!…"), and at the nine o'clock deal booked it
   ("Trato hecho"). Now midnight asked back, or said next to a refusal ("Hasta la medianoche, no puedo"), is never a
   yes: Toño gives his reason once and asks again. "La verdad, estoy agotado" at "¿Es demasiado?" left the question
   open (asked again after the answer), and "Más o menos" got the global "¡Ay, lo siento!" → both say it's too much
   and close it. Not understood before: "¿Cuánto me pagan?", "¿Se pagan dobles?", "¿Me vas a pagar las horas
   extra?"; "Puedo hasta las siete", "¿Puedo irme a las ocho?", "A las siete me voy"; "¿Es obligatorio?", "¿Tengo
   que quedarme?" (his reason, then his question); "¿Cuándo vienen los inversionistas?"; the neutral idioms asked
   back ("¿Poner de nuestra parte?", "¿A la carrera?", "¿Dale con todo?", "¿El ritmo?").
8. **Hints (1, left).** The two always-plural items come out singular in the hints: see "Left".
9. **Accepted answers (0 found).** 0 false accepts before and after. Corpus +32 (14 with `not` lists, 2 of them pure
   traps), NLU +16, sims +4.
10. **Neutral (4).** Four hints had a Mexican-only idiom and no twin: "le estoy agarrando la onda", "al aventón"
    (twice) and "¿Cómo que “jalar parejo”?", which the neutral Toño never says → twins "le estoy agarrando el ritmo",
    "a la carrera", "¿Cómo que “poner de su parte”?". The 17 line twins are right. mean_chamba explains "chamba" only
    when the learner asks about the word, which is right in both texts (no twin). mean_parejo[1]'s rope picture still
    explains "poner de su parte" (left as it is).

**Left for the lead (shared files).** `src/convo/suggest.ts` `composeFull` binds the hint's X as a bare id (qty 1),
so "los reportes de errores" / "los correos de clientes" (attrs.plural) show and will be voiced singular in the
hints: "Estoy hasta el cuello con el reporte de errores" (the overload group's first example), "¿Alguien más puede
hacer el reporte de errores?", "¿Quién se encarga del correo de clientes?". Bind `{ id, qty: 2 }` for attrs.plural
there, as proposed for tools/es-voices/lines-es.ts. The entity types allow `def` "el"/"la" only, so this file can't
make the items plural by themselves. Not understood, left to the engine's fallback: "¿Qué pasó?" after the crash
and "¿En serio?" at the midnight request.

**For the voices.** One speaker (Toño). Changed: pile_intro[1], mid_1, mid_why, mid_paid, mid_yes; new: mid_help;
neutral only: the four hint twins. None of the changed lines has a Mexican-only word, so none needs a line twin.

**Gates (worktree, niced).** tsc clean; check-content ✓ 0 errors 0 warnings, NLU 116/116 (was 100), 21 sims 12/12
(was 17), fuzz 80; corpus 233/233, 0/32 false accepts (was 203/203, 0/30); held-out 39/40, 0/1 (unchanged); vitest
es 113/113.
