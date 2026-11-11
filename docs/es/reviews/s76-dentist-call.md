# Review: s76-dentist-call (writer's commit 3f3e2af6)

| Check | Before | After |
|---|---|---|
| tsc / vitest | clean / 287 | clean / 287 |
| check-content | 110 NLU, 10 sims 12/12, fuzz 80, 0/0 | 124 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus | 219/219 (100%), 0/26 false accepts | 237/237 (100%), 0/26 |
| blind set (42, 11 traps) | 39/42 (92.9%), 0 traps accepted | 42/42 (100%), 0 traps (no longer blind) |

The scores were strong, but probe.ts found 7 meaning-safety bugs in how turns were handled. Changes: +110 / -22 lines.

**meaning-safety, must-fix (~45 lines)**
1. "No el martes, el miércoles" at Tuesday's offer **booked Tuesday**. Fix: "no X, Y" is now a day_req correction, and a turn containing "no" never books through pick_ctx.
2. "El martes, no el miércoles" with Wednesday on offer booked Wednesday (lost comma). Fix: a correction only asks again.
3. "No, todavía no" at "¿Ya había venido antes?" became speak_up. Fix: speak_up needs "se oye / la escucho"; "todavía no" counts as a new patient at that question only.
4. "No es mi primera vez" at "¿Ya había venido antes?" silently recorded a new patient (rule 10). Fix: Lorena asks "Perdón, entonces, ¿es su primera vez con nosotros?".
5. "¿Y pasado mañana?" outside the twist offered tomorrow 9:30. On the move path that was the appointment being moved. Fix: "ese día ya no tengo lugar", then the next opening.
6. After booking, "¿Puedo cambiar la cita…?" or "Sí" to "¿Quiere cambiarla?" got "Su cita ya quedó…". A cancel kept the appointment ("¡Lo esperamos el martes!"). Fix: a change frees the time and offers another (the day asked for first). A cancel clears the appointment and the time question isn't asked again. Arrival and text lines: once per call.
7. "Así está bien" gets the question again (kept), but after that any turn with "así" in it booked. Fix: only "así está bien" again books. Also "No voy a pagar yo, tengo seguro" quoted the self-pay price; it is now insurance_yes.

**understanding (~30 lines)**
- At the time question: "Ese día no", "No, mejor otro día", "No tengo tiempo el martes", "No me queda bien el martes a las diez", "Sí, pero en la tarde", "Prefiero no en la mañana". "El martes no puedo, ¿y el jueves?" got two offers in one turn; it now gets one.
- Cancel and move: "No, nada más cancélela" and "No quiero cancelar, quiero cambiarla".
- Insurance: travel or medical-only insurance counts as paying yourself. New insurance_q "¿Aceptan seguro?" gets a vague "Depende del seguro…".
- Other: "¿Dónde están ubicados?" and "Gracias, es todo" (it only thanked, and the call stayed open).
- A day asked before booking ("¿Tiene algo el lunes en la mañana?") made Lorena re-ask how she could help. It now starts the booking and remembers the part of the day.

**spanish (~10, polish)**: "¡Ay, qué pena!" for a toothache reads as "how embarrassing" in Mexico; a local line replaces it ("¡Ay, lo siento!" / "¡Uy, qué mal!"). "Vamos a buscarle algo pronto" now comes with the soonest opening. "Por ser primera vez" is said only to a known new patient.

**gloss-english, numbers, twins, facts, structure: no fixes.** About a third of the glosses and flag indices checked. Also checked: dates (day first, US tip), phone numbers in pairs, letter names, the 2 twins (¿Bueno?, ahorita), calle Morelos (also in s65b), and the steps, intents and 3+1 twists against the English. **tests (~35)**: 14 NLU traps, 2 sims, 18 corpus items.

**For the lead / owner**: global.ts g_sorry_to_hear "¡Ay, qué pena!" (also used in s65a) → suggest "¡Ay, lo siento!" (`// NEEDS:` in the file). The writer's unsure facts stay as they were: $400 valoración, the hours, 15 minutes' tolerance, and the dentist speaks English. After booking, a bare "Mejor el viernes" still only gets "Su cita ya quedó…" (safe); "¿Puedo cambiarla?" changes it.

## Lead's check (2 Nov 2026)

| Check | Before | After |
|---|---|---|
| check-content | 124 NLU, 12 sims 12/12, 0/0 | 146 NLU, 18 sims 12/12, fuzz 80, 0/0 |
| corpus / heldout | 237/237, 0/26 / 42/42, 0 traps | same |
| lead's set (29: 22 + 7 traps) | 9/22, 0/7 (handler bugs only in probe.ts) | 22/22, 0/7 |
| tsc / vitest | clean / 287 | clean / 287 |

Looked at numbers, letter names, money and the binding steps; played 6 probe files of whole calls (~60 calls).

**must-fix (meaning, booking, money, numbers)**
1. A question booked the time on offer: "¿Tiene algo el martes?", "¿Puedo ir el martes?", "¿Abren el martes?", "¿Tiene algo pasado mañana?" (twist), "¿Tiene algo el lunes?" (week full) all got "le agendo la cita…". Question patterns now carry `#ask`: Lorena offers it again ("Entonces, ¿le aparto…?"); a statement ("Mejor el martes") still books (rule 17).
2. Next week's day booked this week's: "Mejor el martes de la próxima semana", "El próximo martes está bien", "¿Y el martes que viene?" booked this Tuesday at 10. Now next Tuesday at 4:30 is offered (also from the opening, "…para el próximo martes", and when moving); another weekday of next week gets day_full and next Tuesday; "El lunes en la mañana" gets Monday at 10.
3. Twist: "¿Tiene algo la próxima semana en la mañana?" after "Lo único que me queda es pasado mañana" offered this Tuesday at 10; "¿Y el lunes?" got "es lo único que tengo esta semana". A next-week request now turns the only opening down and gets next week's.
4. "No, todavía no" right after "¿Así me escucha mejor?" (asked at "¿Ya había venido antes?") recorded a new patient (from review fix 3). It now answers the hearing question; she speaks up again.
5. Insurance said twice in one breath: "No tengo seguro dental, pero tengo seguro médico" quoted $400, then asked for the insurance details and recorded insured; "No voy a pagar particular, tengo seguro" quoted $400 first; "Sí, tengo seguro, pero voy a pagar yo" asked for insurance details first. One answer each now.
6. A number read in pieces was the phone number: "Mi celular es 984 123" (or "984") got "Muy bien, gracias" and the rest was lost. Under 7 digits Lorena says "Ajá..." (new line phone_more) and joins the next piece; 10+ digits at once is a whole number said again.
7. "Del treinta" was 2030, "dos mil treinta" a birth year. Two-digit years over 25 are 19xx (also in 4/6/28); a year after 2025 is not taken ("¿Y el año?").
8. After "¿Puedo cambiar la cita para el viernes?" the booked time was gone: "No, mejor déjela como estaba" wasn't understood and "Así está bien" twice booked the new offer. The booked time is kept until a new one is agreed; keep_appt and "Así está bien" give it back ("Su cita ya quedó…").
9. "¿Cuánto cobran si cancelo?" gave the exam price with the policy; now only the policy. "¿Aceptan dólares?" got "Aceptamos efectivo, tarjeta y transferencia" (no answer); new line pay_dollars: pesos only in cash, cards and transfers (as s67a).
10. "El martes a las diez no puedo" and "No a las diez, a las once" offered the refused time again before the next one; now one offer. "Hace mucho tiempo" at "¿Ya había venido antes?" recorded pain; now a yes.

**polish**: "¿El martes, no?" typed as a tag asks again; "Tampoco (me queda)", "Ninguno me queda", "Prefiero el jueves", "No puedo en la tarde / en la mañana", "¿Es gratis la valoración?", "Con mi seguro", "Mi seguro no cubre dental", "No estoy asegurado", "Sí, quiero cancelarla".

**Left for the owner**: global.ts g_sorry_to_hear "¡Ay, qué pena!" (s65a) unchanged; the unsure facts ($400 valoración, hours, tolerancia, English-speaking dentist) and the new "solo pesos en efectivo" stay as written; "¿Cuánto cuesta la limpieza?" still gets the exam price and "la doctora le da un presupuesto"; "Sí, pero no el martes" offers Tuesday again (asks) rather than the next time; "i con acento" isn't read when spelling (global letters slot).

## Audit (5 Nov 2026)

Fresh reviewer, both texts. Read: STYLE.md, AUTHORING-ES.md (rules from the reviews), the brief, the two reviews above,
the cross-cutting leads (AUDIT/cross with its offer-probe flags and "Town directions", AUDIT/neutral), the situation
file, the corpus and the held-out set, the transcripts at seeds 3 and 7 (all 18 sims, then the 6 new ones), the voiced
value lists (`tools/es-voices/reach-es.ts s76`) and ~150 probe turns (`tools/probe.ts`) at every step, most of them at
the time question, where a call books. The phone-call specifics: every day and time a line can say comes from `OFFERS`
(or `EXISTING`, the same 9:30), and every line that says one is voiced with the whole 11-value `slot` list (`day` 8,
`at` 1), so nothing falls to the device voice; the spoken forms are the Mexican phone ones ("el miércoles a las cuatro y
cuarto de la tarde", "el jueves a las siete de la noche", "pasado mañana a las nueve de la mañana"; "mañana a las nueve
y media de la mañana" says mañana twice, as Mexicans do, kept); the phone hint is accepted as voiced ("nueve ocho
cuatro, uno veintitrés, cuarenta y cinco, sesenta y siete" → 9841234567) and the spelling hint as written
("Se escribe M-I-L-L-E-R" → miller); "be grande", "ve chica", "doble ve", "i griega", "uve", "ye", "eñe" are all read.

**Found 22, fixed 21** (by point: 1:2 2:0 3:0 4:1 5:1 6:0 7:16 8:2 9:0 10:0).

- **1 Natural Spanish.** `booked[1]` "Perfecto, le agendo la cita mañana a las 9:30…" can be heard as booking it
  tomorrow: now "le agendo la cita **para** {slot}" (all 11 values). "Entonces, ¿le aparto…?" came twice in a row when
  the learner hesitated after a re-ask: the second time the same opening is worded as a plain offer.
- **4 Facts.** The town has no calle Morelos (the lead's decision, TOWN.md "Getting around"): the office is at
  **calle Hidalgo 12**, a block from the zócalo (calle Hidalgo runs a block inland, across avenida Juárez; s33 puts it
  "a block from the zócalo" too): the line, its say, write, spell and gloss; "¿En qué calle están?", "¿Calle Hidalgo
  número doce?", "¿Dónde queda la calle Hidalgo?" get it.
- **5 English.** `offer_again` "shall I hold / shall I put you down" → "should I" (American English).
- **7 Questions and offers without a right answer** (all found with probes):
  - **A question booked** (meaning safety): "¿El martes?", "¿A las diez?", "El martes a las diez, ¿verdad?",
    "¿Pasado mañana?" (twist) and "¿El jueves?" (moving) booked the time on offer. A typed question now gets
    "Entonces, ¿le aparto…?" and only a yes books; a yes in the same turn ("Sí, el martes. ¿Dónde están?") still books,
    and a voiced "El martes" (no question mark) echoing the offer is a yes, as before.
  - **A yes with a change or a price question booked**: "Me queda bien, pero mejor el miércoles", "Sí, me queda bien,
    pero ¿tiene algo más temprano?", "El martes está bien, pero a las once" booked Tuesday and then said "Su cita ya
    quedó…"; "Perfecto, ¿cuánto cuesta?" booked while "Sí, ¿cuánto cuesta?" didn't. Now the other piece answers and
    nothing is booked until a plain yes.
  - **The offer probe's lead**: after "Tengo X o Y" (availability) "El primero", "La segunda", "El del jueves", "El de
    la noche", "El de las siete", "La de la mañana" weren't understood, "El jueves" / "A las siete" only re-offered,
    and a bare "Sí" booked the first. New `choose_ctx` (with `pickChoice`): a pick books that one, a typed question
    offers it again, a turn that fits both ("El jueves" when both are on Thursday) or "Cualquiera" / "Me da igual"
    gets the first one asked, "Ninguno (de los dos)" and "El jueves no puedo" move on (the other one, alone), and a
    bare "Sí" gets the first one asked.
  - **Maybes**: "Puede ser", "Tal vez", "A lo mejor" weren't understood; now Lorena asks again (no booking on a
    maybe); "Déjeme ver mi agenda" / "Lo voy a pensar" get "Tómese su tiempo".
  - **The time asked again**: "¿A qué hora?", "Sí, ¿a qué hora?", "¿Qué día dijo?" get the opening again; "¿A qué hora
    es mi cita?", "¿Me repite el día y la hora?", "¿Para qué día quedó?" get "Su cita ya quedó…".
  - **A calendar date**: "¿Tiene algo para el 12 de noviembre?" wasn't understood. Lorena works by the week's days
    (the game has no calendar): that day is full ("Lo siento, ese día ya no tengo lugar") and the opening again;
    asked at the start ("Quisiera una cita para el 12 de noviembre"), new line `date_full` "Lo siento, para la fecha
    que me pidió ya no tengo lugar" before her first offer. "El martes 11" counts as Tuesday.
  - **No Mexican number**: "No tengo celular mexicano", "Mi número es de Estados Unidos" weren't understood: new
    `phone_any` "No se preocupe, puede ser el de su país"; "Es un número de Estados Unidos: más uno, cinco cinco
    cinco…" takes the number (+1 and all) in one turn.
  - **Moving**: "Sí, para el viernes" at "¿Quiere cambiarla para otro día?" wasn't understood (now Friday is offered
    first); "No, mejor la dejo como está" after Lorena found the appointment re-offered Thursday: now tomorrow's 9:30
    stands ("Su cita ya quedó mañana a las 9:30…").
  - **Other replies**: "Sí, una pregunta" / "Sí, otra cosa" at "¿Se le ofrece algo más?" ("Claro, adelante"); "No
    puedo esperar" at the hold ("Bueno, es rapidito"); "¿Con quién hablo?" (new `her_name` "Con Lorena, para
    servirle"; one greeting doesn't say her name); "No, ninguna otra cosa" / "No, otra cosa no" close the call;
    "Otra cosa: ¿dónde están?" gets the address without "Claro, adelante" first; "Mejor en la noche", "Ok, ¿y en la tarde?", "¿Y en la mañana?",
    "Me queda mejor a las once", "Me queda bien el martes, pero no a las diez"; dates of birth said month first, as in
    English ("Junio cuatro, mil novecientos noventa", with a tip that Spanish says the day first) and "El cuatro de
    junio, noventa"; "Miller, con doble ele"; "¿Me manda la dirección por WhatsApp?" (the address, with its card).
- **8 Hints and help.** The spelling note's alphabet lacked eñe (added). **Not fixed here (shared file):** the learner's
  spelled surname (`{$letters}` in the hint "Se escribe…", said in the device voice) and global g_spell use target.ts
  `LETTER_SAY`, which says V "uve" and Y "ye" (Spain/RAE); Mexicans say "ve chica" (or "ve corta") and "i griega", as
  this hint's note teaches. A surname like Davis or Young is spelled the Spain way. Proposal for the lead.
- **2, 3, 6, 9, 10**: usted throughout (the new lines too); Lorena and la doctora Moreno are unique; spelling and ¿¡
  clean; 0 false accepts before and after; the two twins (¿Bueno?, ahorita) right, and the new lines need none.

**Voices.** Changed spoken lines: `address` (Hidalgo), `booked[1]` (+ para, 11 values). New: `phone_any`, `her_name`,
`date_full` (no values). English only: `offer_again`'s gloss and natural English, the spelling note, the `month_first`
tip.

**Tests.** 146 → 169 NLU tests, 18 → 24 sims (12/12 seeds each), fuzz 80 ✓, 0 errors / 0 warnings; corpus 237/237 →
300/300 (+63), traps 0/26 → 0/30 (+4); held-out 42/42; `tsc` clean, `vitest --project es` 109/109.

**For the lead / the owner.** (1) target.ts `LETTER_SAY`: V "ve chica", Y "i griega" (and perhaps B "be grande"), in
both texts. (2) TOWN.md "Named in the conversations, not built": the dentist is now calle Hidalgo 12, a block from the
zócalo; s65b's header comment still says "entre Juárez y Morelos". (3) Owner, still open from the lead's check:
"¿Cuánto cuesta la limpieza?" gets the exam's $400 and "la doctora le da un presupuesto"; the research says cleanings
run $800–1,500 nearby, if a cleaning price is wanted. (4) Optional reach-es RULE: `availability` is voiced with 11 × 10
pairs, but it only says (offer, late), (late, morning) and (monday_am, monday): ~100 never-played clips an accent.
"¿Qué día es pasado mañana?" can't get a weekday (no calendar): it gets the opening again.

## Spain twins (11 Nov 2026)

11 twins. Lorena keeps usted (no register change). The phone: her "¿Bueno? ¿Ahora sí me escucha?" is "¿Oiga? ¿Me
oye ahora?" in Spain (the hear_me pattern takes "oiga" / "diga" too). Also móvil, aparcar (line and the learner's q_park hint), "a
una calle del zócalo" (the say follows), "Muy bien" / "sin problema" for "Con gusto", "¡Qué bien!", "el jueves por la tarde". Spain
corpus: 14 items (pedir cita, me viene bien, por la mañana, aparcar, ¿Oiga?).
