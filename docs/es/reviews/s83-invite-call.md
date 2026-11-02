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
