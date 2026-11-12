# Review: s79-post ("¿Dónde está mi paquete?"), writer commit 6f994999
## Gate and blind set, before and after
| Check | Writer | After review |
|---|---|---|
| tsc | clean | clean |
| check-content --verbose | 111/111 NLU, 11 sims 12/12, fuzz 80, 0/0 | 128/128 NLU, 12 sims 12/12, fuzz 80, 0/0 |
| corpus (coverage) | 210/210, 0/22 false accepts | 226/226, 0/24 false accepts (14 + 4 new items, 3 renamed) |
| blind set (39 + 1 "any", 9 traps) | 30/39 = 76.9%, 0 traps accepted | 36/39 = 92.3%, 0 traps accepted |
Blind misses left are right readings under other names (tequila refused as alcohol, "Claro, ¿aquí?" signs, cash then).
## Fixes (src: 149 lines added, 41 changed or removed; ~110 must-fix, ~15 polish, ~25 tests)
**meaning-safety (must-fix, ~45 lines)**
- A question about a service chose it: "¿El express tiene rastreo?" booked express; "¿El normal llega antes de Navidad?"
  at the value step switched to standard; "¿Es muy caro el express?" booked express. Questions naming a service are
  now one piece (ask_time/tracking/insured/price/cheaper), and a bare service name never chooses when the turn asks.
- "El más barato" / "El económico" booked economy in the same breath as its price, no tracking and 1-month delay
  (rule 3). Now Gloria quotes it and asks "¿Le parece bien el económico?"; questions in between answer for economy.
- Economy (no tracking) still got a número de guía on the receipt; "¿Lo puedo rastrear?" after it said "on the receipt".
- "No quiero el express" after choosing it said "No hay problema" and kept express: it now goes back to standard.
- "No es caro" anywhere recorded a $500 customs value and skipped "¿Cuánto vale?"; it was also one slip from "No el caro"
  (service_not), which set the service at the contents question. Both now live only at their own question.
- "Necesito dos" / "Me da dos" with no noun at the payment added 2 stamps: a bare count is a stamps_ctx now (rule 2).
- "No tengo efectivo" charged the card at once: now "con tarjeta entonces", paid on the hand-over (rule 17).
- A service named before weighing ("El normal" while the perfume question was open) was chosen with no price said.
- Pickup: "No traigo el aviso, pero tengo el número de guía" + a later "Ok, gracias" recorded the notice as handed over.
**understanding (must-fix, ~25 lines):** one intent twice in a turn isn't read, so "No es regalo, son cosas mías",
"Sí, es frágil, son unas tazas…" got whole patterns; "No vengo a recoger nada, quiero enviar esto", "A Texas, en
Estados Unidos", "¿Qué cosas no se pueden mandar?", "No lleva perfume ni nada así", "Perfume no", "Nada de perfume".
**replies (must-fix, ~20 lines):** "¿Cuánto es?" at the payment said the total twice in a row; "¿Está asegurado?" for
economy got "No hay problema" (now "El económico no lleva seguro"); "Es un poco caro" at the insurance offer quoted
economy (now a no to full insurance); a "No" to the perfume rule re-asked the contents question (the question stays
open); "Ya está" at the return address thanked and asked again; "¿Pongo mi dirección de Canadá?" got a definition
(now "Puede ser la de aquí o la de su país"); "No, gracias" after "¿Sería todo?" asked "¿qué más necesita?"; after
"No tengo el número", Gloria repeated the whole guía question (now "Entonces, ¿a nombre de quién viene?").
**polish (~8):** "solo hasta 2 kilos" said once; a 2nd "¿normal o express?" variant. **gloss (2):** "an | shipment";
the fragile_ok flag pointed at "pongo", not "le".
**numbers, twins, facts, structure:** OK (prices plausible, timbres/nomás/ahorita twinned, Correos across from Café La
Ceiba as in s62, English steps/intents/twists kept). **tests:** 17 NLU traps, 1 sim (economy quoted), 1 sim turn.
## For the lead
- Engine: one intent twice in a turn is rejected (strayRepeat); "X, Y" answers need whole patterns. Comma gaps kept:
  "No, es para mi mamá" at "¿Es regalo?" = gift; "Perfume no, lo saco" = "no lo saco" (nothing recorded).

## Audit (5 Nov 2026)

Fresh reviewer, both texts (Mexican and neutral), against N/AUDIT-BRIEF.md: the brief, STYLE/AUTHORING, the cross and
neutral files (leads: no name clash, Correos' facts as TOWN.md had them, the offer probe's "Peligroso."), the
transcripts (seeds 3 and 7), 7 probe sets (~60 scripted conversations: offers, price questions, what-ifs, polite
closings, pasts, pickups, stamps), the voiced value lists (`reach-es.ts`) and Correos de México's 2026 tariffs.

**Found 25, fixed 24** (by point: 1:2 2:0 3:0 4:4 5:0 6:0 7:13 8:0 9:6 10:0).

**4. Facts (realism, Nov 2026)**, from Correos de México's "Tarifa Postal 2026" (correosdemexico.gob.mx,
DATOSABIERTOS/Tarifas/Individuales 8, 9 and 10; the site refuses foreign connections, so read through search-engine
extracts) and the news of 25 Mar 2026 (Mexico News Daily, Riviera Maya News, UnoTV, La Razón, Eje Central):
- A postcard or letter abroad (up to 20 g) costs $11.50 to North America, $13.50 to Europe and South America, $15 to
  the rest of the world (the same since 2016–2018). **The stamp was $22**: now **$15**, the rest-of-world rate, enough
  for any country (stamps_price, stamp_cost and their neutral twins).
- International parcels (encomiendas), first zone: $320 up to 0.5 kg, $384 up to 1 kg, $512 up to 2 kg, $640 up to
  3 kg. The 800 g box's $380 matched; **the 2.4 kg box's $520 was below even the cheapest zone: now $640**. EMS
  (express, "Mexpost") is priced in dollars by zone, at ~$18.50 a dollar (A North America, B Europe/South America, C the rest): about $510 /
  $630 / $930 up to 1 kg and $630 / $910 / $1,260 up to 3 kg; the flat $690 / $890 stays (zone B's level). Times
  (standard two to three weeks, express about a week, economy over a month) are plausible; US deliveries "may take
  longer" since March 2026.
- **Correos is on avenida Juárez, next to the bank, across from the zócalo's kiosco** (TOWN.md, the 3D town): the intro
  said "on Calle Ceiba, across from Café La Ceiba". No spoken line places it.
- Not fixed, for the owner (rule 14, a rule that changes fast): since 25 Mar 2026 a parcel to the **US** needs the
  sender's official ID, email and phone of both parties, each item's country of manufacture, a declared value of
  $150–$14,500 (US$800), no herbal products or medicines, and Correos collects a **10% US charge on the declared
  value**. Gloria's US totals leave it out; modeling it would make the total depend on any declared value (not
  voiceable) unless values snap to a grid. Letters and postcards to the US are exempt (resumed Sept 2025).

**9. Money moved without a clear yes (rule 17), all fixed and trapped:** "Mejor sí", "Sí, por si acaso" and "con
seguro" were a plain intent, so at "¿Es regalo?" or "¿Va a querer timbres también?" they added $50 of insurance (now
`insurance_ctx`, at the offer only); "¿Cuánto sería con seguro?" added it (split into a price question + "con seguro";
the handler now ignores a "cuánto" turn); "Está bien, gracias" at the insurance offer added it (now "Entonces, ¿sí lo
asegura o no?", new line); "¿Cuánto cuestan cinco timbres?" bought five stamps (one whole price question now, and
stamps_qty ignores a "cuánto" turn); the full insurance was added to an economy packet ("El económico no lleva seguro"
now, and choosing economy drops it); and an insurance asked for with only stamps bought was charged (total counts it
only with a package).

**7. Questions and answers:** "Peligroso." / "Sí, algo peligroso." (her own option) → "¿Qué trae?"; a price before
the box is weighed ("¿Cuánto cuesta?" at the country or contents question quoted both services; "¿Hay algo más
barato?" quoted economy, or "solo hasta 2 kilos" for a box she hadn't seen) → "Depende del peso y del destino." (new)
and the question again ("¿A qué país va?", new, short); "¿Va a pagar en efectivo o con tarjeta?" after the learner
had said cash; "Gracias, es todo." was a bare thanks and "¿Algo más?" came again (as s76); stamps bought after the
package was paid were never charged nor handed over ("Ya está pagado"): now a second small payment; not understood
before, answered now: "¿Cuánto cuesta cada uno?", "¿Puedo asegurarlo?", "¿Qué cubre el seguro básico?" (new line),
"¿Cuánto cobran por el seguro?", "¿Y si lo mando express / en el económico?", "¿Cuánto sería con el express?" (quotes,
never chooses), "¿Y si pago con tarjeta?" (a question: "Sí, aceptamos tarjeta", paid on the hand-over), "No tengo el
número de guía", "¿Dónde dejo las postales?" / "¿Dónde está el buzón?" (new line; the room and the street both have
a buzón), and at a pickup without ID "¿Sirve una foto del pasaporte?" (new line) and "Bueno, regreso mañana" ("Claro,
aquí se lo guardamos.", new; the visit ends politely, not completed).

**1. Spanish:** "y peligroso es, por ejemplo, baterías" (es + a plural) → "y peligroso, por ejemplo, las baterías";
the stamp lines came twice in a row ("Cuestan $22 cada uno. ¿Cuántos quiere?" again after "¿Cuánto cuestan?" or "Para
unas postales a Inglaterra"): now the price once, then "¿Cuántos quiere?" (new, neutral twin "¿Cuántas quiere?").

**Checked, fine:** usted throughout (hints too); Gloria only, no clash; glosses and American English; ¿¡ and accents;
the neutral twins (timbres → estampillas with "cada una / ¿Cuántas?", nomás, ahorita); flags on their units; the
customs twist and the pickup lines; hours (Mon–Fri 8–4, Sat 9–1) and the 3D buzón. Left as is: "¿A dónde lo va a
mandar?" after "una caja" (lo = el paquete); a bare "Bueno." at the insurance question is an acknowledgement (no yes:
it moves money); the held-out's 3 "misses" are right readings under other names.

**Voices:** 8 new spoken lines (price_depends, dest_again, ask_insurance_confirm, insurance_cover, stamps_how_many +
its neutral twin, mailbox, id_original, keep_here); 3 changed (hazard_explain; stamps_price and stamp_cost with their
twins: $15). Value lists: the prices' $520 → $640; **say_total 534 → 296 values** (with $15 stamps most sums
coincide); every total the math can produce is in the list (checked: package + insurance + 0–50 stamps, and later
stamps alone).

**Tests:** NLU 128 → 144 (16 new, 10 of them with a `not:`); sims 12 → 16, all 12/12 (the insurance's price question and
polite closing, prices before the weight + a stamps price question, stamps after paying, a pickup without ID);
corpus 226 → 263 understood, traps 24 → 27, 0 false accepts; held-out 36/39, 0/1 (unchanged); offer probe: only the
expected "Perecedero." (the rule's "perdón") left, both texts.

**For the lead:** (1) global: "Gracias, es todo." is read as a bare thanks wherever a conversation has no "gracias es
todo" pattern (s76 and s79 add it locally); (2) a shared `politeClosing` helper (p25, p29, s79 each have one);
(3) TOWN.md "Prices the conversations share": a stamp for a postcard abroad $15 (s79); CROSS.md's "stamps $22" is
stale. **For the owner:** model the 2026 US parcel rules (ID, contacts, 10% charge) or keep the US simple; one flat
price for every country (EMS to Australia and New Zealand is 35–40% above the flat express price) or prices by zone (more clips).

## Spain twins (11 Nov 2026)

12 twins. Gloria keeps usted (no register change). Spain: "número de seguimiento" for "número de guía" (5 lines and the hint),
datáfono, devolver, "¿En qué puedo ayudarle?" for "¿Qué se le ofrece?", "Muy bien / Claro / sin problema" for "Con gusto", "Solo
uno" (hint). Spain corpus: 13 items (sellos, número de seguimiento, mi madre).

## Spain review (12 Nov 2026)

Fresh reviewer, against docs/es/STYLE.md "Spain Spanish": every line's Spain reading (twin, else neutral), the hints and
example answers, tú/usted and vosotros by the Spain rule, meaning and English against the Mexican line, Mexican-only
things kept, and the Spain corpus.

Found and fixed: timbres/estampillas → sellos (masculine like the Mexican lines; say texts too); ¿Trae…? (the parcel) → ¿Lleva…?, adentro → dentro; llenar → rellenar; un aproximado → una cifra aproximada; rastreo → seguimiento; ¡El que sigue! → ¡El siguiente!; Listo → Hecho / Ya está; ¿Me presta una identificación? → ¿Me enseña un documento de identidad?; the writer's twin “que le dejaron” → han dejado; hints in the perfect (he perdido, he firmado, me han dejado).

English of every twin checked against its Mexican line (restored where a twin had rephrased it). Spain corpus items
added for the new forms. Gates: Mexican, neutral and Spain checks 0 errors; coverage 0 false accepts.

