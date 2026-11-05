# Review: s83-invite-call ("¿Estás libre el viernes?", Andrea), writer commit faf6064c
## Gate, before and after
| Check | Writer (faf6064c) | After review |
|---|---|---|
| tsc / vitest | clean / 288 | clean / 288 |
| check-content | 116/116 NLU, 17 sims 12/12, fuzz 80, 0/0 | 126/126 NLU, 21 sims 12/12, fuzz 80, 0/0 |
| corpus | 175/176 (99.4%), 0/28 traps | 187/188 (99.5%), 0/31 traps (15 items added) |
| blind set (39, written first) | **35/39 (89.7%)**, 0/3 traps | 38/39 (97.4%), 0/3 traps (not blind any more) |

Blind misses before: "Me sobra una entrada…", "Si quieres paso por ti a tu casa", "Mejor enfrente del mercado", "Un poco más
temprano, ¿no?" (still missed: the tag "¿no?" can't be told from "más temprano no").
## Fixes (src file: 27 lines changed, 110 added; about 45 must-fix, 15 polish, 50 tests/sims)
**meaning-safety (must-fix, ~25 lines)**
- "No me acuerdo" at "¿Cuánto te debo?" was `band_forgot`: "¡Ja, un grupo misterioso!" with no band asked. Now only at the band
  step; at the price question it is "Bueno, luego me dices cuánto fue" (payDone), at the start step "no sé a qué hora".
- Carne asada: "¿A qué hora es?" recorded a yes ("¡Qué padre! Luego te paso la dirección"), so a later "No sé si puedo" was too
  late (rule 17). A time question now gets "Como a las dos de la tarde." and "Entonces, ¿vienes a la carne asada?";
  "¿A qué hora llego?" / "Sí, ¿a qué hora?" still accept.
- meet_change: "¿Dónde queda la taquería?" was read as yes + ask_where: she took the taquería, then suggested the kiosco and an "Ok"
  booked the kiosco. New `where_is_ctx` (at her two suggestions): "Luego te mando la ubicación" / "En medio del zócalo", and the
  suggestion stays open.
- "No, en el café" at "¿Dónde nos vemos?" (nothing suggested) got "¿entonces dónde?", dropping the café. The comma is lost
  (rule 10), so she now asks "¿Entonces en el café?" (pending `confirm_place`).
**understanding (must-fix for the common ones, ~12 lines)**: refusing her time ("A las ocho no puedo", "No puedo a las ocho", "No, a
  las ocho no": `time_shift_ctx #refuse`, also at the time_change twist, where it keeps the learner's time; `time_shift_ctx` also at
  meet_time so "Más tarde" after a refusal works); "No me gusta el kiosco"; "me sobra(n) … para el viernes"; singular "entrada";
  "Si quieres paso por ti a tu casa"; mercado as a place; "¡Qué padre! Sí voy"; "Así está bien, gracias" at her time (was a no).
**facts (must-fix, 4 lines)**: s69's taquería next to the mercado sells cochinita that "se acaba antes del mediodía"; meeting there
  at 8 p.m. for dinner contradicted it. Now "la taquería de la esquina" (vague), crowded kiosco "los viernes" (s69's free music).
**numbers (polish, 3 lines)**: "Abren las puertas a las ocho" made her suggest 7:00; doors now count half an hour (7:30).
**spanish / gloss-english (polish, 4 lines)**: bbq reminder "¿Y el domingo?" → "Entonces, ¿vienes a la carne asada?" (it follows
  her own time answer); "Ooh, fun!" twice in a row → "Cool! Count me in!"; gloss "I | treat!" → "I | treat (you)!".
**structure (polish)**: "¿Paso por ti?" after the summary hung up; now she answers. Steps/intents/twists match the English.
**tests**: 10 NLU tests (refusals, flips "No quiero ir contigo"), 4 sims (price "No me acuerdo" + time refusal, comma-lost café,
  where's the taquería, bbq time question → maybe); 15 corpus items; blind set tests/es/heldout/s83-invite-call.json.
Kept: twins (all Mexican-only lines twinned, ~1 in 10), tú, flags, the summary line, no line twice in a row (seeds 3, 7, twists).
## For the lead
- The negative-question invitation ("¿No quieres venir conmigo?") stays out: I tried "no quieres (venir|ir) conmigo" and the
  engine's slip forgiveness read "No quiero ir contigo" as an invitation. An engine rule keeping quiero/quieres apart would allow it.
- The writer's unsure facts (concert at nine, doors at eight, carne asada around two, $350 hint, "¡Bye!") look fine to me.

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral). Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), the brief,
the review above, AUDIT/cross and AUDIT/neutral for s83, TOWN.md ("Getting around", "Named in the conversations"), the
transcripts (seeds 3 and 7, every sim), and ~250 probe conversations (tools/probe.ts) at every question Andrea asks:
each yes/no with "No", "No puedo", "Mejor otro día", "Mejor no", "Bueno, ok", side questions and corrections.

### Found, by point (32; all fixed)

1. **Natural Spanish, the flow (4).** After "¡Ay, no! El sábado no puedo. ¿Y otro día?" an off-topic turn or "¡Va, nos
   vemos!" got "¿Qué día es?" (she knows the day): now "¿Otro día, tal vez?" (the bad-line route keeps "¿Qué día es?").
   Saturday said again repeated the same line twice in a row: now it alternates with "¿El sábado? Perdón, no puedo, ya
   tengo planes. ¿Otro día, tal vez?". "No" to "¿Me estás invitando?" got "¡Ah! Bueno, no pasa nada." and at once
   "Entonces... ¿es una invitación?": now she waits. A bare yes before any concert got "¿qué me cuentas?" twice.
2. **tú/usted (0).** Andrea is tú throughout (informal in npcs.ts), every hint is tú, the global lines take the tú form.
3. **Names (0).** Andrea only; her sister, mom and boss are unnamed. No clash (cross file).
4. **Facts, times, voiced values (4).** The lead's decision: "la taquería de la esquina" → "la taquería del mercado"
   (TOWN.md: beside the mercado's door on avenida del Puerto; s62, s69); the entity keeps "de la esquina" as a form.
   Time-change twist: a kept time before she gets off work ("No, a las siete") got "salgo corriendo del trabajo" and a
   plan at 7:00 she can't make: new line keep_time_early "Bueno, entonces pido permiso para salir temprano." (7:30 and
   7:45 keep "salgo corriendo"). Tickets the learner got free ("Me regalaron dos boletos", "boletos gratis") still got
   "¿cuánto te debo del boleto?": now not asked. **The summary** "Entonces quedamos: {$day}, a {$time}, en {P.the}."
   has a value and an entity, which tools/es-voices/lines-es.ts never expands: only the ~9 combinations random runs
   reach were in the voice list (of 8 days × 28 times × 7 places = 1,568 an accent), so most real plans would have
   played in the device voice. Now two lines: summary "Entonces quedamos: {$day}, a {$time}." (224 an accent, every
   one voiced; summary_notime "Entonces quedamos: {$day}." 8) and summary_place "¡Te veo en {P.the}!" (7).
5. **Glosses and English (1).** ask_start[1] "So what time is it?" reads as the time now: "And what time is it at?".
6. **Spelling, accents, ¿¡ (0).**
7. **Questions and answers (15).** Meaning flips: "No, en el malecón" to "¿Entonces en el café?" booked the café (now
   the malecón, rule 10); "No me gusta el malecón" at her kiosco suggestion booked the malecón (now "¿entonces
   dónde?"); "¿Y en otro lado?" got "Mmm, ¿dónde queda eso?"; at "¿Y otro día?" a bare yes ("Bueno, ok") accepted the
   invitation with no day (now "¿Qué día es?") and "No" got "no pasa nada" + "¿Qué día es?"; "Es muy tarde"/"Más tarde"
   at her "¿y si mejor a las ocho?" got "Entonces, ¿a las ocho?" and the summary in the same turn with the old time
   (now: earlier keeps the learner's time, later offers 8:30). Not understood, now answered: "Porque tengo dos
   boletos…" to her "¿Por qué?" (it got "Perdón, ¿iglesia?", a sound-alike of "parroquia"), "Para invitarte a un
   concierto"; her own words echoed, "Va, en la taquería del mercado" (would read as the mercado + an unknown place);
   at the carne asada "Mejor otro día", "Otro día", "No puedo, perdón", "Gracias, pero mejor otro día"; refusals of her
   time ("A esa hora no puedo", "No me queda", "No llego", "No me da tiempo", "Mejor otra hora"); "No te preocupes, a
   las ocho está bien"; places ("Mejor en otro lugar", "Prefiero otro lugar", "No me gusta", "Ahí no", "¿Dónde
   está?", "¿Cuál?"); money ("Nada", "Luego te digo", "Después vemos", "Fueron setecientos por los dos"); the sister
   ("Prefiero que no", "Mejor la próxima", "Otro día", "No, mejor solo tú y yo", "Solo tengo dos", "Sí, pero ella paga
   su boleto"). "¿Dónde queda la taquería?" / "¿Cuál taquería?" got "Luego te mando la ubicación": now the town's
   answer, new line where_taqueria "Junto al mercado, en la avenida del Puerto."
8. **Hints (1).** pay_price "Son {$price}." showed "Son …." in the game (the UI fills no value) and was never voiced:
   now "Son $350." (say: "Son trescientos cincuenta pesos.").
9. **Accepted answers (2).** "Tengo dos boletos gratis…" was not understood; the neutral words ("otra entrada", "dos
   entradas", "la parrillada") were missing from the sister and carne asada patterns.
10. **Neutral text (5).** The lead's decision, "entrada" for the ticket: ask_pay ("¿cuánto te debo de la entrada?") and
    the hints inv_tickets (2), sis_sorry, sis_ticket ("Compro otra entrada"); the inv_tickets note says both. The
    carne asada as the party → "parrillada" in bbq_invite and bbq_again (as p30 and s33). Hints: ag_va "¡Va!" →
    "¡De acuerdo!"; sis_merrier "¡Entre más, mejor!" (Mexican, by its own note) → "¡Mientras más, mejor!".

### Spoken lines for the voices (Andrea only; one speaker, no plural items)

Changed: meet_change[0] ("…¿Mejor en la taquería del mercado?…"), summary[0], summary_notime[0]. New: where_taqueria,
keep_time_early, summary_place; neutral twins for ask_pay[0], bbq_invite[0], bbq_again[0]. Hints (coach voice):
pay_price (now voiced), neutral twins for inv_tickets ×2, sis_sorry, sis_ticket, sis_merrier, ag_va.

### Tests

Gates after merging spanish-edition (d5d27137): tsc clean; check-content ✓ 0 errors, 0 warnings, NLU tests 126 → 149,
sims 21 → 30 (9 audit sims), all 12/12 seeds, fuzz 80 with no crash; corpus 219 → 278 items: 243/244 understood (the one
miss is the negative-question invitation the first review left out), false accepts 0/34 (traps 31 → 34, plus "not"
guards on the new positives); held-out 42 → 56 (+14 written before testing): 50/53 (was 38/39), 0/3 false accepts; the
new items 12/14, not understood (safe): "Mejor en algún otro lugar", "A esa hora todavía no llego"; vitest es green.

### For the lead

- TOWN.md "Facts the conversations share": the taquería del mercado has tacos in the evening too (s83: dinner before
  the concert); its cochinita runs out by noon (s69).
- tools/es-voices/lines-es.ts: a line with a value and an entity is voiced only with what random runs say (FOLLOWUPS
  s66: place × value); s83 no longer has one, but the rule matters for every conversation.
- lang.ts (edition-wide): "porque" as a leading word of an answer ("Porque tengo dos boletos…" was heard as
  "¿iglesia?" through the sound-alike repair); s83 handles it in its patterns.
