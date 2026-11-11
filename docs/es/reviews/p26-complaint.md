# Review: p26-complaint ("Quiero poner una queja"), writer commit 06c0f855

## Gate and blind set

| Check | Before (writer) | After (review) |
|---|---|---|
| `tsc --noEmit` | clean | clean |
| `check-content --verbose` | 93/93 NLU, 16 sims 12/12, fuzz 80, 0/0 | 110/110 NLU, 17 sims 12/12, fuzz 80, 0/0 |
| corpus (`coverage.ts`) | 292/292 (100%), 0/45 false accepts | 318/318 (100%), 0/47 (26 review items added) |
| blind set (40 items, 3 "any" traps + 9 `not:` traps) | 36/40 = **90%**, 0 false accepts | 38/40 = **95%**, 0 false accepts |

Blind misses before: "Si no lo resuelven voy a ir a la Profeco", "¿Me lo da por escrito?". The 2 left get another intent with the same outcome. Not blind after; the fixes are general constructions.

## Fixes (src file: 115 lines added, 30 removed)

**meaning-safety: must-fix (~25 lines)**
1. **"No un sofá nuevo, un reembolso" booked a new sofa.** It was read as ask_replacement + ask_refund + no, and the first piece won. There are now whole patterns, both ways, for "No X, Y", "X no, Y", "no X sino Y" and "No con un cupón, con mi dinero" (rules 10 and 18).
2. **"No para el viernes, para el jueves" recorded Friday.** "No, el jueves no, mejor el lunes" was not understood. These are now correction patterns with `{wrong:day}`, so the second day is the one recorded.
3. **A bare "Nada" / "No, nada" / "Igual" in the plain `fridge_broke` intent.** At "¿Le puedo ayudar en algo más?" these got "Lo sé, y eso no debió pasar" and were not taken as a no. They now live in `still_ctx`, which only the "¿bien armado?" steps expect (rule 2). "[no] nada [más]" is a thats_all.
4. **"¿Puedo pedir otro día?" accepted Brenda's Wednesday visit** (`accept_offer` had "puedo (pedir | tomar) otro día"). That pattern is removed.

**understanding: must-fix for the common ones (~45 lines)**
- Profeco threats ("Si no lo resuelven voy a ir a la Profeco"); "¿Me lo da por escrito?"; "Sí, estoy de acuerdo" (her question is "¿Está usted de acuerdo?"); "No, no estoy de acuerdo" = new `disagree_ctx` (Brenda asks for a day); a bare "Hasta el viernes" (with the by_until tip); "Prefiero el dinero", "¿Nada más un cupón?", "Ya me agendaron una visita y nadie vino", "¿Y si el martes tampoco viene nadie?", and "El martes no, mejor páseme con su gerente" / "Martes no, quiero hablar con el gerente" as whole patterns.
- The order number said whole ("cincuenta y ocho mil doscientos trece") came out as two pieces, "50" and "8213", and got "no me aparece ese número". It is now `@order_whole`.
- A read-back without the letters ("Cuatro cuatro siete dos") is now understood (`readback_ctx`, only right after the folio).
- "¿Pueden venir el sábado?" at the Wednesday visit was not understood. It is now `other_day_ctx`: a new line, "Lo siento, el técnico solo puede el miércoles, entre {$win}.", then "¿Qué le parece?". If the learner asks again, Brenda takes it as a no to Wednesday, so the line is not said twice. Nothing is booked.

**gloss-english (polish, 3 lines):** three flags were one unit off (rule 15). In the two `further` hints the flag was on "Profeco." and belongs on "la". In need_by the flags sat on "el / viernes" and belong on "para / el".

**tests:** 17 NLU tests (corrections, traps) and 1 sim with the order number whole, another day, two corrections, a disagreement and a wrong read-back. The writer's corpus got 26 items, and its 2 items for the new intents were updated.

## Checked and kept
Probed (probe.ts): Tuesday "Así está bien" = no, "Está bien, gracias" asks first, what-if/price never book; coupon "¿Cuánto vale…?"/"¿Y si acepto…?" give facts, "Ok, gracias" asks again, a past tense books nothing; deadline and folio correct. Spanish, usted, 2 twinned Mexican words, glosses (a third read) and structure: fine.

## For the lead / owner
- **NEEDS (shared):** `{number}` in `src/editions/es/convo/slots.ts` reads "cincuenta y ocho mil doscientos trece" as 58 (it doesn't take a compound before "mil"). This is worked around locally.
- **NEEDS (audio):** the new line `brenda_only_wed` needs audio.
- **Left:** "¿La visita tiene costo?" asked of Jorge gets no answer (no line); "¿Y si pido un reembolso?" isn't understood (safe). (The visit's cost: done 5 Nov; see below.)

## 5 Nov 2026: the visit's cost

Decided on the owner's "decide on best fixes": "¿La visita tiene costo?" now gets an answer in the agent's register,
"No tiene ningún costo: la visita está cubierta por la garantía." (There's no charge: the visit is covered under the
warranty.), with no "No," first, so that "¿Es gratis?" never gets a no. Then the offer that was open comes back: Jorge's
"Entonces, ¿le agendo la visita para el próximo martes?" (or "¿Le gustaría hablar con mi gerente?"); Brenda's "¿Qué le
parece?". At Brenda's Wednesday visit the answer is her existing visit_info line ("…sin costo para usted"), as before;
at her coupon she says the new line in her voice (it used to give the coupon's facts, a wrong answer). Nothing is
booked or accepted by a cost question: "Si es gratis, está bien", "Sí, si es gratis" and "Vale, ¿y tiene algún costo?"
get the answer and the question again (probed). New: `visit_cost` (the visit or the technician named, any step) and
`cost_ctx` (bare "¿Tiene algún costo?", "¿Es gratis?", "¿Cuánto cuesta?", "¿Me van a cobrar?", only while Jorge's
visit is on the table: the history step and his booking question; never at Brenda's offer, where a coupon may be on the
table). offer_q lost its one cost pattern to `visit_cost`. Lines: kyle_visit_free, brenda_visit_free (the same words).
Tests: 14 NLU tests, 2 sims, 33 corpus items (10 traps: a refusal is never a yes).

## Audit (5 Nov 2026)

Fresh reviewer (AUDIT-BRIEF.md), both texts. Read: STYLE.md, AUTHORING-ES.md, BRIEFS.md p26, this review, the cross and
neutral leads (AUDIT/cross, AUDIT/neutral: only the "shall I" lead was real), the whole situation file, the corpus and
the held-out set, transcripts at seeds 3 and 7 (every sim), and ~60 probed turns (probe.ts) at every question.
Checked and kept: the Spanish (natural Mexican call-center and manager register, usted both ways, hints in usted), the
names (Jorge and Brenda, no clash in the edition), the facts (Profeco is the real federal consumer agency and "presentar
una queja ante la Profeco" is how it's said; a warranty visit at no cost, a refund or a new sofa for a defective one
and a pickup at no cost are what Mexican consumer law and stores do; the $12,999 sofa, the $500 coupon, the 10 to 14
business days as Hogar Puerto's own), spelling and ¿¡, the glosses and the flags' units.

**Found 28, fixed 27** (by point: 1:1 2:0 3:0 4:0 5:5 6:0 7:16 8:0 9:1 10:5).

1. Natural Spanish: with a remedy asked of Jorge, Brenda said "Entiendo que no ha sido una buena experiencia. Lo
   entiendo. Pero antes de eso…". brenda_before is now "Sé lo que pide. Pero antes de eso…" (I know what you're asking
   for. But before we go there…).
5. English: "shall I" in kyle_book_q's gloss and in brenda_check_coupon and brenda_check_visit (gloss and natural
   English) → "should I"; kyle_ask_name[1] "And whose name is the order under?" (no "y" in the Spanish) → "What name is
   the order under?"; the two "Una disculpa" lines got the Mexican-word flag.
7. Questions and offers (the visit's cost from this morning is now complete):
   - **"Sí, acepto." / "Acepto." to "¿Le gustaría hablar con mi gerente?" booked next Tuesday and ended the call.** Now
     a yes to the manager; only "Acepto el martes / la visita / la cita" takes the visit there.
   - **"Muchas gracias" / "Muchísimas gracias" at the deadline (and confirm) step meant "too long"** ("(es) mucho" with
     "es" dropped and "muchas" a slip of "mucho"): Brenda asked "¿Qué día tenía en mente?". "Mucho" / "muchísimo" now
     need "tiempo" or a "no" ("No, es mucho"); "No, muchas gracias" stays a no.
   - The visit's cost: bare "¿Tiene algún costo?", "¿Me van a cobrar?", "¿Es gratis?" at Brenda's Wednesday visit were
     not understood (and "El miércoles está bien. ¿Tiene algún costo?" failed whole). `cost_ctx` is now expected at her
     offer, her confirm question, after the remedy (deadline, confirm), after an offer was taken and at the closing:
     at the Wednesday visit, its facts ("…sin costo para usted"); at the coupon, "¿Cuánto es?" its value; the warranty
     visit when named or just taken; else the new "No tiene ningún costo para usted." (the coupon, the new sofa, its
     delivery, the pickup: "¿Me cobran el envío?", "¿La entrega tiene algún costo?", "¿Tengo que pagar algo?").
   - Asked again, the cost got the same line again (rule 8): now "Como le comentaba, no tiene ningún costo." (Jorge,
     Brenda); "¿Seguro que no me cobran nada?" is understood.
   - The cost asked at "¿Puede esperar en la línea?" or "¿Ya revisó que esté bien armado?" was swallowed: Jorge answers
     it, then transfers / goes on.
   - "¿A qué hora viene el técnico?" to Jorge was taken as a no ("Sinceramente, yo tengo las manos atadas…"): he now
     says "El técnico pasaría el próximo martes, entre las 8 y las 12." and asks whether to book it; before he has the
     file, "Claro. Pero primero necesito algunos datos."; "¿A qué hora sería la visita?" and the like understood.
   - "¿Cuándo vence el cupón?" was not understood (and "el cupón vence" got the coupon's value): "Tiene vigencia de
     seis meses." (Hogar Puerto's own rule, like its 10 to 14 days).
   - "¿Cuánto tarda el reembolso?" at Brenda's offer got "¿Qué solución está buscando?": she now says the usual time
     (nothing granted) and, if the refund follows, doesn't say it again ("¿Le parece bien ese plazo?"); to Jorge, only
     his manager can approve it.
   - "¿Por qué no vino nadie (el lunes)?" was not understood: it is the no-show complaint.
   - "Gracias por la oferta, pero…" was not understood (the global thanks has no "por la oferta"): local
     `thanks_offer` (with "pero no" a refusal, with "sí" asked again, alone asked again).
   - A bare "Gracias." to "¿Qué le parece?" dropped the offer: now "Entonces, ¿le mando el cupón?" once (rule 17).
   - "Entonces, ¿le agendo la visita del miércoles?" came back after "No, gracias. Quiero hablar con su gerente." had
     turned it down: a refusal by another intent closes it.
   - "Lo más pronto que tengo es el próximo martes." came again in every round of no-manager / no-Tuesday: said once.
   - "El miércoles está bien. ¿Tiene algún costo?": "¿Le puedo ayudar en algo más?" came before the answer and the
     window was said twice: now the booking, "No tiene ningún costo: la visita está cubierta por la garantía.", then
     the question.
9. Sims: brenda_deadline_tomorrow, brenda_delivery_tomorrow, brenda_refund_tomorrow and brenda_rude2 were said in no
   sim and no random run (brenda_rude2, the last line, can't be placed by its neighbours, so the line list would voice
   it for Jorge too); kyle_manager_first/_file and others only in random runs. Three new sims make each speaker say
   their own side lines (and the new ones). No situation line is said by both speakers (K()/B() set the speaker);
   the global lines (g_welcome, g_yes_what, g_hello, g_take_time, the not-understood lines) are said by both.
10. Neutral text: "Una disculpa" is Mexican usage (the lead's decision): kyle_sorry[1], brenda_appreciate_reply and the
   two "le ofrezco una disculpa" lines (kyle_apologize[0], brenda_hi2[1], whose flag already called it Mexican) get
   neutral twins with "le pido disculpas" (flag: pedir disculpas). Left: "folio" (below).

Tests: NLU 124 → 140, sims 19 → 22 (all 12/12), corpus 341 → 390 understood (+53 items, 4 new traps: 0/61 false
accepts), held-out 38/40 (0/3) unchanged (its two misses get another intent with the same outcome, as before).

**For the voices:** new lines kyle_cost_again, kyle_tuesday_time (Jorge, W_MON only), brenda_cost_again,
brenda_no_cost, brenda_coupon_valid (Brenda); changed brenda_before; neutral text changed in kyle_sorry[1],
kyle_apologize[0], brenda_hi2[1], brenda_appreciate_reply. brenda_delivery_day ({X} + {$win}) needs es-voices-list's
BINDINGS rule (all days but tomorrow, W_MON): the current list only has the days heard in runs. The current list also
voices every value line with the whole domain (both windows, both prices: "un cupón de doce mil novecientos noventa y
nueve pesos"); every value said is in it.

**For the lead (shared files):** global.ts g_thanks could take "gracias por (la oferta | su oferta | el
ofrecimiento)" (p26 has it locally); "folio" for a case number is Mexican (and Chilean) usage, untwinned here and in
s91b: STYLE.md's list with "número de referencia / de reporte" as the twin, if the owner wants it; lines-es.ts voices
every global line for harbor_bot (the recorded message), which never says one.

## Spain twins (11 Nov 2026)

26 Spain twins (lines and hints), no register change: Jorge, Brenda and the learner keep usted (customer service).
Spain's call-center Spanish: "le atiende Jorge" (habla Jorge), "soy Brenda", "le paso con mi gerente" (lo comunico),
programar (agendar) the visit, número de referencia (folio), apuntar (anotar), atención al cliente, "Es válido
durante seis meses" (tiene vigencia), montado (armado), comprobar (revisar), "que tenga un buen/excelente día"
(Spain says the article), solo (nada más), oír (escuchar). Spain's present perfect for what has just happened: ¿Qué
ha pasado?, ¿ya ha comprobado…?, ¿ha probado a apretar…?, Jorge ya me ha explicado. Kept: Profeco (Mexico's consumer
office; the sofa and the shop are in Puerto Colibrí), the dates, pesos. The learner's angry plural "Sois unos
inútiles" is read too (Spain says vosotros to a company's staff when it's rude; ustedes stays in the hints). Patterns
take ha llegado / no ha venido, lo he comprobado, bien montado, sois, prográmelo, como muy tarde, boli / cojo /
apuntar / apuntado. Spain corpus: 21 items, 20/20, 0/1 false accepts. Gates: Mexican, neutral and Spain 0 errors,
sims 12/12; corpus 390/390 0/61; held-out 38/40 0/3 (unchanged).
