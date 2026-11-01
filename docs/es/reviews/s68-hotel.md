# Review: s68-hotel (the Spanish trial, by the executor "Sol 6.1"), PR #1 at cb53204b

Reviewed file: `src/editions/es/content/situations/s68-hotel.ts` (966 lines). Written by the lead's fresh helper; the fixes
are commit dbb6332b on the pull request (merged as 17500468), with the blind set `tests/es/heldout/s68-hotel.json`
and the corpus `tests/es/corpus/s68-hotel.json`.
No shared Spanish file, English file, tool or doc was touched, so there are no engine gaps to report.

## 1. The gate, before and after

| Check | Before (PR head) | After (my fixes) |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content s68 --verbose` | 131/131 NLU, 11 sims 12/12, fuzz 80 OK, 0 errors 0 warnings | 169/169 NLU, 12 sims 12/12, fuzz 80 OK, 0 errors 0 warnings |
| `vitest run` | 16 files, 257/257 | 16 files, 257/257 |
| English `check-content` | 0 errors, 0 warnings | 0 errors, 0 warnings |
| Models s72 / s32 / s66 | 0/0 each | 0/0 each |

**Every claim in the PR held:** 131/131 NLU tests, 11 sims 12/12, 80 random-order runs, 0/0, vitest 257/257, only
the two allowed files changed, and the English check was clean. The gate passing did not mean the conversation was
safe, though. Two of its NLU tests only passed because of the meaning-safety bug in §3a, and the tests
covered the hints but not much natural phrasing.

## 2. Blind score (40 sentences written before I read the file)

| | Understood | Traps accepted |
|---|---|---|
| Before | 30/36 = **83.3%** (6 not understood, 0 misunderstood) | **0/4**. The 4 corrections with a forbidden reading were safe but not understood. |
| After | 35/36 = **97.2%** (1 not understood: "El aire funciona bien, pero la tele no") | **0/4**. All the corrections are now understood correctly. |

The after-score isn't blind for me: I wrote the set and saw what failed. My fixes cover general constructions
(corrections, "me gustaría hacer…", "¿No tiene algo más…?"), not those exact sentences. A fairer
measure is a second probe of 133 sentences that I wrote after reading the file (now `tests/es/corpus/s68-hotel.json`). It mixes
natural phrasing with 23 flip traps. Before: **79/133 (59%), 5 traps accepted (taxi orders, a booked noon checkout)**.
After: **128/133 (96%), 0/29 traps accepted**.

## 3. Changes by category

About 160 lines changed or added: 94 of the 966 original lines changed or removed (~10% of the file), plus 70 net
new lines. That is roughly **80 lines of must-fixes, 25 of polish and 55 of tests** (the tests mostly lock in the
must-fixes).

### a. meaning-safety: must-fix (~22 lines)
1. **Phantom taxi.** The `anything` step ("¿Algo más?") listed `taxi_time_ctx` in its `expects`. The executor
   added it only so that 5 NLU tests could use `step: "anything"`. As a result, a bare time at "¿Algo más?" ordered
   a taxi nobody asked for: "A las dos", "Al mediodía", "Ahorita", "Mañana a las ocho", even "Por ahora es todo".
   Worse, at the late-checkout choice "A las dos, por favor" and "A las doce" were read as taxi times, so the
   checkout choice was lost. I removed it from the `expects` and removed the 5 tests. The taxi answers are now
   covered by sims (3 turns, 1 new sim), plus 2 safety tests.
2. **Booked checkout from a complaint.** `late_noon` (not a `_ctx` intent) held "no quiero pagar [más | extra |
   quinientos pesos]". So "No quiero pagar más" at the deposit step answered "Perfecto, su salida queda al
   mediodía". It is now `too_expensive_ctx`, which is used only where a price is on the table. `late_noon` now
   needs noon to be said ("…, mejor al mediodía").
3. **Paid option without a price.** `late_two` held "[sí] está bien", a generic yes inside a paid intent, so I
   removed it. A bare "A las dos" outside the offer now gets the $500 price quoted first (`lateQuoted`), and is
   never booked unasked.
4. **Regex on the article.** `ask_late` read the whole utterance with `/\b(una|1)\b/`, so "Quisiera una salida
   tardía" became 1 p.m. and skipped the free-noon option. It now matches "a la una / las dos / las doce" only.
5. **Problem-visit actions during check-in.** `p_fine` ("todo bien", "no hay ningún problema") and `ch_move`
   ("otra habitación") ran their problem-visit effects during check-in ("¡Qué bueno!…", moved to 518). They now
   check the mode. At check-in, "otra habitación" offers a cheaper room (walk-in) or the ocean-view room.

### b. understanding-gap: must-fix for the common ones (~45 pattern lines)
The executor wrote 3–5 patterns per intent where the English edition has 6–10. Fixes across 35 intents, plus a
new `sign_here_ctx`:
- word order: "¿Está incluido el desayuno?"
- everyday verbs: no sirve / no prende / no enfría, and the Mexican "clima" for the AC
- short answers at a step: "¿Aquí?", "Ya está", "Tome", "Aquí está mi pasaporte", "El ventilador", "Otra habitación"
- corrections: "No son tres, son cuatro", "Mejor al mediodía", "A las doce", "No me interesa"
- money: "Es un poco caro", "Prefiero pagar en efectivo", "¿Me van a cobrar algo?"
- closings: "Eso sería todo", "Por ahora es todo"
- the twist: "Ya estoy de vuelta", "Vuelvo más tarde"
- other requests: "¿Tienen late check-out?", "Busco una habitación para dos personas", restaurant, room number, pillow

### c. spanish (~14 lines)
- **Must-fix:** "Claro, se **lo** llevamos" for almohada/cobija/manta → "se **la**".
- **Must-fix:** the room-not-ready twist said "Gracias. Aquí le esperamos a las tres." three times in a row in the
  executor's own seed-3 transcript, and the "Gracias" thanked for nothing. Now Fernanda asks "¿Gusta dejar sus
  maletas aquí mientras tanto?" (yes or no). "Regreso a las tres" gets "Perfecto, aquí {lo|la} esperamos a las
  tres", and any later re-ask gets a short reminder ("Su habitación va a estar lista a las tres").
- **Polish:**
  - "ya corregí las noches" → "ya lo corregí"
  - "por toda la estancia" → "durante su estancia"
  - "¿A qué hora es la salida?" was answered "Perfecto, su salida queda al mediodía" → "Su salida es al mediodía / a
    las dos de la tarde"
  - the taxi "Ahorita, por favor" was answered "se lo pido para esa hora" → "se lo pido enseguida"
  - key cards "tarjeta(s)" → "llave(s)": right after taking the credit card, "Aquí tiene su tarjeta" sounded like
    returning it

### d. facts and numbers (~4 lines, polish)
- **Lodging tax said up to three times per check-in.** Each of these mentioned it: the walk-in offer or the prepaid
  line, then "El IVA ya está incluido. El impuesto de hospedaje se suma…" before signing, then the question. It is
  now said once. IVA is gone from the volunteered line, and the question has its own answer (a state tax on hotel
  stays, not in the rate, added separately). Still no rate is stated.
- **Debit card deposit.** The line now also says the deposit is refunded at checkout.
- **Prices kept** (all within STYLE.md's ranges): $1,800/$2,400/$2,800 a night, +$400 for the view, $500 for a 2 p.m.
  checkout, $150 parking, $2,000 deposit.

### e. gloss-english (~3 lines, polish)
- The hint "¿Puedo tener una habitación con vista al mar?" (a calque of "Can I have") → "¿Tiene una habitación con
  vista al mar?"
- The spelling note said the letters "spell Miller", but every learner's surname differs. It now lists the
  Spanish letter names.
- New lines are glossed by STYLE.md, and 2 merges are registered (mientras tanto, por separado).
- I read all 124 NPC line variants and their glosses: no must-fix gloss errors in the executor's lines.

### f. tests (~55 lines)
- NLU tests: 131 → 169. I removed 5 (see §3a.1) and changed 2. I added 43: 35 natural alternatives and 8
  meaning-safety tests.
- Sims: 11 → 12. The new one offers a late checkout and orders a taxi right now. Two sims gained taxi times, and the
  twist sim now answers the bags question.

### g. structure and code: no fixes needed
- **Structure:** same id, all 14 steps in order, all 57 English intents, both English twists, and the brief's
  room-not-ready twist (keys only after "ya volví").
- **Added intents:** the executor's `price_ok_ctx`, `return_ready_ctx`, `wait_room_ctx`, `ask_tax` and
  `decline_deposit`, plus my `sign_here_ctx`.
- **Code:** types clean, only `c.chance`, no learner name in NPC lines, only the two allowed files, `index.ts`
  regenerated correctly.

## 4. What the executor did well
- **Shape kept faithfully.** It kept the English shape and adapted it sensibly. A card can't stand in for the
  passport or the reverse ("document"/"card" tags). The deposit can be cash or debit, with a re-ask. The twist
  never releases keys early.
- **Natural Mexican service register:** "¿Me presta su pasaporte?", "¿En qué le puedo ayudar?", "Con gusto",
  "Ahorita le mandamos un ventilador", "¿Viene a registrarse?". Usted throughout, Bienvenido/a by gender.
- **Twins:** few and correct (alberca, regadera, ahorita: 3 of 124 NPC line variants).
- **Facts handled with care:** a hold is not a charge, banks take days to release it, a cash deposit is possible,
  and no invented tax rate. Prices are plausible and consistent.
- **Glosses:** careful, by STYLE.md (flagged articles before times and room numbers, merges with reasons).
- **Tests:** many `none` and `not` tests, Spain forms (tenéis, vale, aparcar el coche), tú to staff, gender slips.
- **Honest PR:** every number checked out.

## 5. Lessons for the next prompts and briefs
1. **`_ctx` intents and tests.** Say it in the prompt: never add a `_ctx` intent to a step's `expects` just so an NLU
   test can use `step:`. NLU `step` tests work only for steps. Answers to a pending question are tested in sims.
   (This was the biggest bug.)
2. **Phrases that mean something elsewhere.** A non-`_ctx` intent must never hold a phrase that means something else
   at another step: a bare yes ("está bien"), a refusal ("no quiero pagar más"), a bare time. Those belong in the
   step's or pending's yes/no or in a `_ctx` intent. Add: "never book a paid option before its price has been said."
3. **Regexes on `c.heard`.** They must allow for Spanish articles and pronouns that look like numbers (una, los dos).
4. **Breadth of the grammar.** For every likely intent, write the 5–8 commonest ways to say it, including:
   - Mexican verbs (no sirve, no prende, clima)
   - VS word order ("¿Está incluido el desayuno?")
   - one-word answers at the step ("¿Aquí?", "Ya está", "Tome")

   Also: before writing the grammar, write a self-held-out list of 100+ learner sentences in
   `tests/es/heldout/<id>.json`, run `tools/coverage.ts` at the end, and aim for ≥ 90% with 0 false accepts. Hint
   coverage passed 131/131, but a broad probe showed 59%.
5. **Reading transcripts.** Read the twist sims and two seeds, not only seed 3. Flag any line said twice in a row,
   and any reply that doesn't answer the question. Give each re-ask of a pending question its own short line.
6. **Information said once.** Check se lo / se la against the noun, and don't volunteer the same information twice
   (the tax).
7. **Brief for s68,** if it's reused: "mention the lodging tax once; the key card is la llave (or la tarjeta) — don't
   let it clash with the credit card."

## 6. For the owner
- **Facts I couldn't verify, so the lines stay vague:**
  - the Quintana Roo lodging-tax rate (never stated)
  - whether hotels there also collect a municipal environmental fee per night (not in the conversation)
  - whether IVA is usually quoted inside the rate (removed from the volunteered line)
- **Mar Azul's fictional fixtures,** for your OK: $1,800–2,800 a night, +$400 ocean view, $500 for a 2 p.m.
  checkout (noon is free), $150 parking, $2,000 deposit (a hold on a credit card, charged and refunded on debit),
  breakfast 7–10:30 on the terrace, checkout 11, check-in 3 p.m.
- **Twist:** the engine can't skip time, so after "Regreso a las tres" the learner says "Ya volví" straight away. Is
  that acceptable?
- **Key cards** are now "llave(s)". "Tarjeta" stays for the broken key card. Both are common in Mexico. Tell me if
  you prefer "tarjeta" throughout.
- **Verdict on the trial:** a solid base that kept the English shape. Spanish and glosses are close to the models'
  standard. The weak spots were meaning safety (one serious bug from bending the grammar to the tests) and grammar
  breadth. Both are cheap for Claude to fix per conversation, and better prompt rules (§5.1, 5.2, 5.4) should prevent most
  of it.

## 7. The lead's check of the review

- One more fix: the reviewer's patterns "cambiar(me)?" don't match the single word "cambiarme" ("¿Puedo cambiarme de
  habitación?" wasn't understood). Now "(cambiar | cambiarme)", with two tests.
- Final numbers: 171/171 understanding tests, 12 sims on 12/12 seeds, 0 errors and 0 warnings; the blind set 35/36
  (97%), the corpus 132/136 (97%), no trap accepted (0/33).
- Share changed: 94 of the executor's 966 lines changed or removed (10%), 166 lines added (the patterns and tests);
  about half of the work was must-fix (meaning safety, understanding), the rest tests and polish.
- Cost: ~5 M input-equivalent tokens (the helper 3.9 M, the lead about 1.2 M).
