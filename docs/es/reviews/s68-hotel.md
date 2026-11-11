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

## 8. Facts (as of November 2026)

The owner's answers (1 Nov 2026): use real numbers; the "Ya volví" jump is fine with a "(Más tarde…)" line; the keys
stay "llave"; the tax as the sources say. Checked on 1 Nov 2026. The taxes and fees come from official texts only;
the hotel's own prices are typical, rounded figures for a mid-range hotel in the Tulum area in November 2026.

### Taxes and fees (official sources; taught in the lines)

| Figure | In the conversation | Source |
|---|---|---|
| **State lodging tax: 5%** of the room charge (6% only for homes rented through digital platforms) | `lodging_tax` (once, before signing): "El impuesto de hospedaje, del 5%, no está incluido"; `tax_info` (when asked): "Es un impuesto del estado: el 5% de la tarifa" | *Ley del Impuesto al Hospedaje del Estado de Quintana Roo*, art. 8 (art. reformed POE 23-12-2022; consolidated text "última reforma publicada en el Periódico Oficial del Estado el 16 de diciembre de 2025"), Government of Quintana Roo, https://agqroo.qroo.gob.mx/wp-content/uploads/2026/01/1767992043_2_641.pdf (posted Jan 2026; read through the Wayback Machine copy of 4 Feb 2026, as the state server refused connections) |
| The tax is charged **expressly and separately** to the guest | "se suma a su cuenta, por separado" | same law, art. 11 |
| **Tulum's derecho de saneamiento ambiental:** per room per night, 30% of a UMA for one guest, then 20% for the second, 15% for the third, 10% from the fourth (50% / 65% / 75% in total); children under 12 don't count; collected by the hotel at check-in, or at checkout if paid afterwards | `eco_fee` (when asked about the tax, once): "el municipio cobra un derecho ambiental: unos $35 por noche por la primera persona, y menos por cada persona más" | *Ley de Hacienda del Municipio de Tulum del Estado de Quintana Roo*, arts. 139–143 (consolidated text, last reform POE 09-12-2024), Congreso del Estado de Quintana Roo, https://documentos.congresoqroo.gob.mx/leyes/L276-XVIII-20241209-L1820241209048-Ley-de-Hacienda-del-Mpio-de-Tulum.pdf |
| **UMA 2026: $117.31 a day** (valid from 1 Feb 2026), so the fee is $35.19 a night for one guest and $58.66 for two | "unos $35" (rounded) | INEGI, "Unidad de Medida y Actualización (UMA) 2026", press release 1/26 (8 Jan 2026; DOF 9 Jan 2026), https://www.inegi.org.mx/contenidos/saladeprensa/boletines/2026/uma/uma2026.docx |
| The fee still exists in 2026: Tulum's 2026 revenue law budgets $95,610,643 for it | (background) | *Ley de Ingresos del Municipio de Tulum para el Ejercicio Fiscal 2026* (POE 10-12-2025, decreto 162), https://documentos.congresoqroo.gob.mx/leyes/L341-XVIII-20251210-L1820251210162-Ley-de-Ingresos-de-Tulum-2026-5-enero.pdf |

Caveats: the Congress read an initiative to reform Tulum's Ley de Hacienda on 24 Nov 2025 (session 27); I found no
published reform of arts. 139–143, and the press (Tulum Times, 3 Aug 2026: "36 pesos per room per night for a single
guest") agrees with the official $35. That is why the line says "unos $35" and "menos por cada persona más", not
exact cents. IVA (16%) is federal and usually inside a Mexican hotel's quoted rate; the lines still don't mention it.

### Hotel Mar Azul's prices (typical figures; not regulated, so no official source exists)

| Figure (pesos) | Before | Now | Basis |
|---|---|---|---|
| Double room, a night | $2,400 | **$2,200** | Holiday Inn Tulum, from MXN 1,219 (reference date 15 Nov 2026) to MXN 2,074 (27 Oct 2026), as Bestday's Tulum listing showed in search results on 1 Nov 2026 (the page itself refuses scripted reads): https://www.bestday.com.mx/hoteles/hl/256147/i1/hoteles-en-tulum; Mimosa Tulum US$116 for 8 Nov 2026 and Hotel Posada 06 MXN 903–1,482: Despegar, https://www.despegar.com.ar/alojamientos/alojamientos-en-tulum/256147, and Kayak, https://www.kayak.com.mx/Tulum-Hoteles-Hotel-Posada-06-Tulum.329274.ksp. A town hotel with breakfast near the beach sits at the upper end. |
| Two-bed room | $2,800 | **$2,500** | same sources, a bigger room |
| Smaller single room | $1,800 | **$1,700** | same sources, the lower end |
| Ocean view, extra a night | +$400 | **+$1,300** (≈ $3,500 a night) | Beach-zone rooms with a sea view cost far more (Cabañas Tulum around US$300–370 a night: Kayak, https://www.kayak.co.uk/Tulum-Hotels-Cabanas-Tulum.471849.ksp, June 2026); +$1,300 keeps a small town hotel's sea-view room within STYLE.md's $1,800–3,500. |
| Late checkout until 2 p.m. | $500 | **$700** (noon still free, "when available") | Alea Tulum: late checkout USD 50, subject to availability (Sembo, https://ph.sembo.com/d/hotel-996828_alea_tulum_tulum); BT Live Tulum: a late-checkout fee, then 50% of a night after 1 p.m. (Cloudbeds, https://hotels.cloudbeds.com/reservation/MLJjrp); Hotel Cabañas Tulum: on request, subject to availability (https://www.hotelcabanastulum.com/booking/frequently-asked-questions/). Listings as search results showed them on 1 Nov 2026. |
| Deposit: a card hold, or cash (debit: charged and refunded) | $2,000 a stay | **$2,000 a stay** (kept) | Eterna Tulum: MXN 2,000 per accommodation per stay (HalalBooking, https://halalbooking.com/en/eterna-tulum/p/477099); Tuki Hotel: MXN 2,000 per stay (ReservationDesk, https://www.reservationdesk.com/hotel/6949742/tuki-hotel); Holiday Inn Tulum: card, debit or cash deposit for incidentals (Hotels.com, https://nz.hotels.com/ho3450218976). Listings as search results showed them on 1 Nov 2026. |
| Parking, a night | $150 | **$150** (kept) | Many Tulum hotels list free parking; paid lots in town 20–40 pesos an hour and 150–250 for a day near the ruins (Tulum Times, "Parking in Tulum: The Complete Guide", https://tulumtimes.com/tulum-parking); Motto by Hilton Tulum: self-parking US$15 a day (https://www.hilton.com/en/hotels/czmtuua-motto-tulum/hotel-info). |

The learner's patterns follow the new fee ("Setecientos pesos está bien", "Sí, pago los setecientos", "No quiero pagar
setecientos pesos") and the new questions ("¿De cuánto es el impuesto?", "¿Qué es el derecho de saneamiento
ambiental?", "¿Hay otros cargos?"); the tests, a new sim (late checkout at two, then the tax) and the corpus
(136 → 144 items, 140/144 understood, 0/30 traps) cover them.

### The twist and the keys

- **"(Más tarde…)":** the line that greets the returning learner (`room_ready`) now starts with the unit "(Más
  tarde…)" / "(Later…)", flagged as not spoken; its `say:` leaves it out, so the voice says only "¡Gracias por
  esperar! Su habitación ya está lista."
- **Keys:** "la llave" throughout, as before; "tarjeta" stays only for the broken key card in the problem visit.

## Audit (5 Nov 2026)

A fresh reviewer's pass over both texts (the Mexican default and the neutral one), by the audit brief: STYLE.md,
AUTHORING-ES.md's rules, the brief, this review, the cross-cutting leads (with their "Town directions (5 Nov)") and
the neutral digest; the file, the corpus and the held-out set; the seed-3 and seed-7 transcripts read in full; then
68 short conversations (some 300 turns) played with `tools/probe.ts` at every step and offer (a bare yes and no, polite closings, price
questions, refusals with a reason, side questions), and the offer probe in both texts.

### Found, by point (18)

1. **Natural Spanish (2).** "Sí." opened the cash-deposit reply even after "No tengo tarjeta de crédito" (the cash
   sim's own path): now "Claro.", which answers the question and the statement alike. "Sí, tenemos estacionamiento."
   answered "¿Cuánto cuesta el estacionamiento?" and "¿El estacionamiento es gratis?" ("Sí… cuesta $150"): a price
   question now gets "El estacionamiento cuesta $150 por noche."
2. **tú/usted (0).** Usted in every line, hint and example; tú accepted with the tip.
3. **Names (0).** Fernanda only, no clash in the edition.
4. **Facts and the town (1).** The 3D lobby has its elevators (two doors and the "Elevadores" sign) on the east wall:
   the learner's right at the desk (interiors.ts `hotel`; the learner stands at (0, -3.2) facing the counter). Both
   lines said left: now "Los elevadores están a su derecha." / "Está ahí, a su derecha." El Muelle "a dos cuadras"
   stays (TOWN.md ✓). The prices, the 5% state tax and Tulum's fee are as set with the owner (§8); every amount the
   lines can say is in `domains.price` (checked with `tools/es-voices/reach-es.ts`).
5. **Glosses and English (1).** `ac_sorry`'s personal-a flag pointed at "mantenimiento" (unit 6), not at "a" (unit 5).
6. **Spelling, accents, ¿¡ (0).**
7. **Questions and offers (11).**
   - A bare yes to the late-checkout **choice** ("Puede salir al mediodía sin costo, o a las dos por $700.") booked the
     paid 2 p.m.: "Sí", "Sí, gracias", "Está bien, gracias", "Vale". Now "Entonces, ¿al mediodía o a las dos?"; a
     second bare yes keeps the free noon. (A yes to "Hoy podemos darle hasta las dos por $700. ¿Le parece bien?" still
     books two: that one is a yes/no question.)
   - Rule 17: "Está bien, gracias" (ok / vale / bueno + gracias) booked the ocean view (+$1,300 a night) and took the
     walk-in's room. Now "Entonces, ¿sí la quiere?" once; a yes takes it, a no declines it.
   - "¿Cuánto cuesta?" at the three priced offers wasn't understood. A new `price_q_ctx`, expected only there: "Son
     $2,200 por noche, más el impuesto." (the room on offer) / "Son $1,300 más por noche." / "Hasta las dos son $700; al
     mediodía, sin costo." "¿Cuánto es hasta las dos?" asks; it never books (trap).
   - "No, gracias, es muy caro" and "Es muy caro" at the ocean-view offer weren't understood: now a no.
   - "No" / "No, no tengo" to "¿Tiene reservación?" got "¿En qué le puedo ayudar?": now the walk-in ("Déjeme revisar…");
     after the other two greetings a bare "No" still gets "¿En qué le puedo ayudar?".
   - "Sí, por favor" to "¿Para qué hora lo necesita?" got "se lo pido para esa hora" with no hour: now "¿Para qué
     hora?"; a second yes means now.
   - "¿Le sirve mi pasaporte?" got "… Se lo devuelvo enseguida." and then "¿Me permite una identificación con foto?":
     the passport now counts as shown.
   - "Sí, pero quería dos camas" at the confirmation gave two beds, then asked again "…una habitación con cama
     matrimonial por tres noches. ¿Es correcto?" (and any side question there repeated the long line): the step's
     re-ask is now "Entonces, ¿son tres noches?".
   - A walk-in who took the ocean view heard "Listo, ya hice el cambio." and then the double room offered again: the
     view room is now their room ("Perfecto, vamos a hacer su registro.").
   - A guest with a reservation asking "¿Tienen habitaciones disponibles?" became a walk-in (offered a $2,200 room);
     a walk-in asking for a room twice heard "Déjeme revisar…" twice. Now she only says there are rooms, once.
   - Not understood, now answered: "Una habitación, por favor" (a walk-in's first words; `walkin_ctx`, at the
     greeting only), "Tres" / "Necesito dos llaves" (keys), "¿A qué hora puedo regresar?" / "¿Cuánto tiempo tengo que
     esperar?" / "Espero aquí" / "Voy a dar una vuelta" while the room isn't ready, "¿Aceptan dólares?" (as s71b's
     gas station: "Sí, pero al tipo de cambio del hotel. Le conviene más en pesos."), "¿Dónde está la playa?" (the 3D
     town's way, TOWN.md "From the hotel's door": left out of the door, left again at the corner up calle Flamboyán
     to the sea, 72 m: "La playa está a dos minutos. Saliendo, a la izquierda, y en la esquina, otra vez a la
     izquierda, hasta el mar."), "¿Cuál es la red del wifi?", "¿Hay servicio a la habitación?", "¿Puedo fumar?",
     "¿Dónde está el restaurante?", "¿Cuánto es el estacionamiento?".
8. **Hints and help (0).**
9. **Accepted answers (2).** Two corpus items wanted out-of-date intents ("¿Aquí?" at the signing is `sign_here_ctx`;
   "Una habitación, por favor").
10. **Neutral text (1).** "¿Gusta…?" is flagged Mexican in `room_not_ready` and `bags_offer` but had no twin; as in
    s74 and s87, the neutral text now says "¿Quiere…?" (two neutral clips).

### Changed

- **Spoken lines** (the voice freeze): 3 changed (`elevators`, `elevator`, `cash_deposit`), 2 neutral twins added
  (`room_not_ready`, `bags_offer`), 10 new (`late_which`, `late_price`, `view_price`, `price_night`, `confirm_room`,
  `taxi_what_time`, `found_again`, `parking_cost`, `beach`, `dollars`); no Mexican-only word in them. Their values
  are $700, $1,300, $1,700 / $2,200 / $2,500 and $150, all in `domains.price`.
- **Code:** `lateChoicePending(which)`, `lateTwoPending`, `viewPending(confirming)`, `taxiPending`, the greeting's `no`,
  `walk_offer`'s yes and price question, `found`'s re-ask, `id_q`, `walkin`'s guard, `ask_parking`'s `#cost`. Ids,
  steps and moments unchanged.
- **Grammar:** `walkin_ctx`, `price_q_ctx`, `return_time_ctx`, `ask_dollars`, `ask_beach`; more patterns for the keys,
  the Wi-Fi's network, parking, the view, smoking, the restaurant, room service and the wait.
- **Tests:** NLU 179 → 205; sims 13 → 19 (each 12/12 seeds); corpus +40 items (21 with a meaning-flip `not`), 2
  corrected: 140/144 → 178/180 understood, false accepts 0/30 → 0/34; held-out 35/36, 0/4 (unchanged).

### Left for the lead or the owner

- A bare "Gracias" at an open offer (the view, the late checkout) is the global thanks: "¡No hay de qué!" and the
  offer again. In Mexico a bare "Gracias" to an offer is often a polite no; that would be a global.ts change.
- "No, gracias" to "¿Prefiere un ventilador por ahora, o cambiar de habitación?" moves the guest (the either/or's no
  is the second option). Kept: nothing is paid, and it is the English edition's shape.
- Rooms 412 ("cuarto piso") and 518 ("quinto piso") stay; the 3D building is 17 m high.

## Spain twins (11 Nov 2026)

- 47 Spain twins (lines and hints), 18 items in tests/es/spain/s68-hotel.json.
- Register: no change. The brief's usted holds in Spain too (STYLE.md: officials, the airline, the hotel, older people, anyone senior); nobody here is `informalSpain`, so no line or hint moved between tú and usted. Fernanda keeps usted.
- Words: reserva, cama de matrimonio, habitación individual, ¿Me deja…? for ¿Me presta/permite…?, documento de identidad, coste, la cuarta/quinta/segunda/tercera planta for el … piso (say too), ascensor(es), aparcamiento, Por supuesto / ¡De nada! for Con gusto, a dos calles, Vuelva a las tres, ¡Qué bien!, the perfect (ya lo he anotado, ya he encontrado, ya lo he corregido, ya he hecho el cambio; the learner's He reservado, Ya he vuelto), Ya está.
- Grammar: nights_fix takes he reservado; sign_ok_ctx takes ya he firmado; return_ready_ctx takes ya he vuelto. Merges: the perfects, de matrimonio, documento de identidad.
- Kept: impuesto de hospedaje (the state's tax).
