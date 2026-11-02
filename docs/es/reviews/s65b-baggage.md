# Review: s65b-baggage ("Mi maleta no llegó"), writer's commit c752f133

I reviewed `src/editions/es/content/situations/s65b-baggage.ts` (1,364 lines). I changed 22 of its lines and added 56; 24 of the added lines are tests and a sim. No shared file was touched.

| Check | Before (c752f133) | After |
|---|---|---|
| tsc / vitest | clean / 257/257 | clean / 257/257 |
| check-content --verbose | 104/104 NLU, 8 sims 12/12, fuzz 80, 0/0 | 121/121 NLU, 9 sims 12/12, fuzz 80, 0/0 |
| corpus (`tests/es/corpus`) | 168/168, 0/15 false accepts | 184/184 (with 26 review items), 0/25 false accepts |
| blind set (`tests/es/heldout`, 40 items, written first) | 37/40 = 92.5%, 0 traps accepted | 37/40, 0 traps accepted |

All 40 blind sentences were understood. The 3 "misses" got the writer's `_ctx` intents (`tag_lost_ctx`, `describe_ctx`), which run the same handlers as the intent I expected. I left the blind set unchanged. The writer's claims all held. Most bugs came from a second probe of about 65 sentences, written after I had read the file.

## Fixes
**meaning-safety: must-fix (about 14 lines)**
- `pickup` matched a bare "no hace falta". So "No, no hace falta" in answer to the kit offer switched the delivery to a pickup ("puede recogerla aquí"). It now needs "no hace falta que me la lleven / llevarla"; the bare phrase is now in `kit_no_ctx`.
- "No, al hotel no" and "No al hotel, prefiero recogerla" were read as a delivery somewhere else. In the second case Itzel promised delivery while the bag was set to a pickup. A delivery elsewhere now needs "sí / pero" or "a otra dirección"; "no al hotel + recogerla" is a pickup.
- `q_meantime` held "no tengo nada": at the contents or phone question, that offered the kit. It now needs "…para esta noche / que ponerme".
- `kit_no_ctx` "[no] tengo mis cosas": "No tengo mis cosas" declined the kit. That reading now needs a place ("…en mi mochila").
- `marks_none` "no tiene nada" was a plain intent; with tengo≈tiene, "No tengo nada" at the tag question became "no marks". The bare form is now in `marks_bare_ctx`.
- `hand_over` held bare "aquí / tome / tenga / lo tengo". These are now `hand_over_ctx`, used at the tag question only.
**understanding (about 8 lines):** "No fue directo, hice escala en X"; "No es grande, es chica"; "No estoy en un hotel, estoy con unos amigos"; "No tengo celular"; "No sé, creo que Samsonite"; "¿Aquí se reportan las maletas perdidas?"; "Mi maleta sí llegó, pero mi mochila no".
**spanish / replies (must-fix, 3 lines)**
- `ans_free` said "Sí, la entrega no tiene costo", which also answered "¿Tengo que pagar algo?" and "¿Cuánto cuesta?". It is now "La entrega es gratis, no tiene ningún costo."
- The kit was offered twice: after a yes or no at the kit question, "¿Qué hago mientras tanto?" offered it again. `kitGiven` is now set there (new sim).
- `phone_none_call_us` said "llamar con su número de reporte" right before Itzel gave the number ("número de reporte" twice). It is now "el teléfono viene en el reporte".
**gloss / flags (polish, 2 lines):** the `ask_tag` flag on "pase de abordar" was on unit 12, which doesn't exist (the unit is 11), so the Mexican-word flag never showed. The phone hint's `say` had an "el" that its text doesn't show.
**facts (polish, 1 line):** "le reembolsamos lo que gaste" was an open promise. It is now "le reembolsamos los gastos básicos".
**tests (+24 lines):** 17 NLU tests, mostly traps with `not`, and the sim "kit declined, then what to do in the meantime".

Kept as written: usted throughout; the twins (pase de abordar, listón, playera); the flight code PC; the twist city rule; echo_navy; the transcripts (seeds 3, 5 and 8, twist sims included) read naturally, with no line repeated in a row.

## For the lead
- The engine can't tell "No fue un vuelo directo" (not direct) from the hint "No, fue un vuelo directo", because punctuation is stripped. The same goes for "No volé directo", "No es una maleta normal", "No lo perdí" and "No estoy bien". I kept the "No," reading, which is the likelier one at those questions. Fixing it would need comma awareness in the NLU (a shared file).
- A bare "Aquí" at the delivery question still reaches `hand_over` in coverage (it gets a "Gracias."). That is harmless, but it is not understood as "pick it up here".

## Revision (2 Nov 2026): customs at the end

The owner moved customs out of the passport conversation (s65a) to the end of this one. After Itzel's goodbye
(now a step, `bye`, with the pending `itzel_bye`), the learner walks out with the backpack past **Agente Medina**
(`aduana`, usted, the Spanish-only character on Officer Diaz's base in npcs.ts). The lost-bag part is unchanged,
except that the task now completes at Medina's "Puede pasar", not at the report number, and Itzel's desk topics
asked at customs get "Eso lo ve en el mostrador de equipaje" (and customs questions at the desk get "Eso lo ve en
la aduana, a la salida"; a form question at the desk is Itzel's report).

What happens: "¿Trae algo que declarar?" (sometimes with "¿Fruta, carne, algún alimento?", sometimes a separate food
question); nothing to declare passes; declared fresh fruit or vegetables, meat or a ham/cheese sandwich "no pueden
entrar al país" and stay there; other food is "declared and checked" (no rule is taught for it); gifts get "¿Más de
500 dólares?" (within the allowance, or the self-declaration lane where duties are paid); cash only over 10,000
dollars (the money declaration). Learner questions: a form (none needed here), the red/green button (not used
here any more), the allowance, cash, why fruit can't come in. Twist (visits ≥ 1, `setup` in two sims): the sniffer
dog sits by the backpack ("se sentó junto a su mochila" / "marcó su mochila"): owning up, "Sí" + what, or "Aquí está"
hands over the snack (an apple or a ham sandwich from the plane); "No" gets the backpack checked, the snack found
and "La próxima vez, declare la comida".

### Sources (read 2 Nov 2026)
- ANAM, "Nuevo Modelo de Atención a Pasajeros Internacionales en Aeropuertos",
  https://www.anam.gob.mx/nuevo-modelo-de-atencion-a-pasajeros-internacionales-en-aeropuertos/ — a "Nada que
  declarar" lane and an "Auto declaración" lane; Cancún T4 since 1 Nov 2017, T3 since 27 Oct 2020, T2 since 25 May
  2024, Tulum since 28 Mar 2024.
- ANAM, Boletín 10/2024 (10 Jun 2024), https://www.anam.gob.mx/boletin-10-2024/ — RGCE 3.2.6: with only luggage and
  the allowance, the "nada que declarar" lane, no D2 form and no "mecanismo de selección automatizado" (the
  semáforo); extra goods: the "Auto declaración" lane, describe them and pay; cash over 10,000 USD on form D4;
  customs may still check baggage. (Boletín 11/2024 says the same for Tulum.)
- ANAM, "Equipaje y franquicia", https://www.anam.gob.mx/equipaje-y-franquicia/ — 500 USD of goods besides personal
  luggage (laptops, phones, medicines are luggage).
- ANAM, "Declaración de dinero", https://www.anam.gob.mx/declaracion-de-dinero/ — over 10,000 USD must be declared.
- ANAM, "Declaración de mercancía", https://www.anam.gob.mx/declaracion-de-mercancia/ — the generic page still
  describes the paper form and the semáforo (airports without the new model); not used for Cancún.
- SENASICA, "Productos prohibidos" (27 Apr 2026), https://www.gob.mx/senasica/documentos/productos-prohibidos —
  fresh fruit and vegetables, fresh meat, sandwiches/tortas with meat and dairy without sealed packaging, fresh
  cheeses.
- SENASICA, "No traigas productos derivados de cerdo del extranjero" (1 Dec 2025),
  https://www.gob.mx/senasica/acciones-y-programas/no-traigas-productos-derivados-de-cerdo-del-extranjero-341116 —
  "sándwich con jamón" among the pork products tourists may not bring.
- SENASICA press release (23 Dec 2019), https://www.gob.mx/senasica/prensa/incrementa-agricultura-presencia-de-binomios-caninos-para-prevenir-entrada-de-enfermedades-que-afectan-a-cerdos-y-platano-230599
  — nine canine teams in Cancún; the dogs "marcaron" bags.
- SENASICA profile of the dog Rosseta (gob.mx PDF), https://www.gob.mx/cms/uploads/attachment/file/785208/Rosseta_ENG.pdf
  — trained on citrus, mango, apple, pork and beef, the commonest products travelers bring.
- SENASICA comic "Falco" (gob.mx PDF), https://www.gob.mx/cms/uploads/attachment/file/457517/QR-historieta_FALCO.pdf
  — the airport dog sits when it finds food in a suitcase or hand bag.
- SENASICA, "Inspección turística" (28 Jul 2026), https://www.gob.mx/senasica/acciones-y-programas/informacion-para-viajeros-193524 — general.
- ASUR, Cancún airport pages, https://www.asur.com.mx/es/aeropuertos/cancun — no customs procedure there; nothing taught from them.

Kept vague (no source confirms): fines, what happens to the confiscated food (Sader says it is incinerated; not
said), whether packaged sweets or aged cheese pass (Medina only "checks" them), how duties are computed ("se lo
calculan en el carril"), what the cash form looks like.

### Numbers
| Check | Before | After |
|---|---|---|
| check-content --verbose | 121/121 NLU, 9 sims 12/12, 0/0 | 156/156 NLU (35 new, 14 meaning-safety), 17 sims 12/12 (8 new), fuzz 80, 0/0 |
| corpus | 184/184 (old part) | 231/231 (59 new items, 17 traps), 0/37 false accepts |
| blind set (old, 40) | 37/40, 0 traps | 37/40, 0 traps (the same three `_ctx` readings) |
| vitest | — | 288/288 |

Played with `tools/probe.ts` (19 scenarios): a plain no, a bare yes then nothing, "Está bien, gracias" (asked
again, never a yes), "No traigo fruta, traigo chocolates" (chocolates only), "Traigo chocolates, pero no fruta",
"¿Puedo traer una manzana?" (a question, nothing declared), "Me comí la manzana", a vague "comida" then what, gifts
with a what-if, a price question and a number over/under, "Me costaron trescientos dólares", the dog with yes, "Aquí
está", a correction ("No es una manzana, es un plátano"), "No" + "¿Por qué?" + "Perdón, no me acordaba", and desk
questions asked at customs.

### For the lead
- NEEDS (slots.ts): `{number}` reads "diez mil" as 10 + "mil"; a local `amount` slot reads it whole here.
- NEEDS (lang.ts, optional): "traigo", "llevo", "traje" in PART_VERBS, so "No traigo fruta, | traigo chocolates"
  splits like "tengo"; a whole pattern in `declare_items` covers it meanwhile.
- TOWN.md already names the arrivals hall's customs with Agente Medina and the dog; the airport restyle's
  "Aduana with the red-green traffic light" (TOWN.md task 6) no longer matches Cancún: lanes "Nada que declarar" /
  "Auto declaración" instead.
