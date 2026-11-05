# s66-taxi · "¿Cuánto me cobra?": reviews

One of the three models (with s72-cafe and s32-mercado), written before the batches; no review, corpus or held-out set
until this audit.

## Audit (5 Nov 2026)

A fresh reviewer read both texts (Mexican and neutral) line by line with their glosses, both learner genders, the
transcripts of every sim on seeds 3 and 7, probed about 200 learner turns with `tools/probe.ts`, listed every clip the
voices would record (`tools/es-voices/lines-es.ts`, both sets), and checked the leads in N/AUDIT/cross/s66-taxi.md and
N/AUDIT/neutral/s66-taxi.md and the town in docs/es/TOWN.md "Getting around (from the 3D town)". Before changing the
grammar, a held-out set of 66 learner sentences was written blind (`tests/es/heldout/s66-taxi.json`).

### Found, by point

1. **Natural Spanish** (3): "Está cerca, ahorita llegamos" ("we'll be there in a minute") said at the stand before the
   ride and after "Ya llegamos"; "Perfecto, aquí le paro" right after "Un poco más adelante" or "En la esquina"; the
   hint "¿Me lo deja en cien?" asks for the fare itself at every $100 destination.
2. **tú/usted**: nothing; Don Rigo says usted throughout, the hints too (tú accepted with the tu_staff tip).
3. **Names**: nothing (Don Rigo vs p18's Rodrigo: kept by the lead). Every place name matches locations.ts.
4. **Facts** (4): the sitio stands at the east end of avenida Juárez next to the airport (TOWN.md "Getting around":
   the terminal's door is about 12 m from Don Rigo), yet the airport was a $350 ride; "Son como diez minutos" for any
   ride across a town whose far ends are ten minutes on foot; "Mmm, no conozco ese lugar" from the driver who "knows
   every corner of town" for the post office, the police, the visitor center, Las Palmas, Línea Clara, the gym, the
   church, Lucía's, El Muelle, the boutique, the salon, the gas station, Brotecito; the intro put the sitio on "the
   main street" only.
5. **Glosses and English** (8): "joven" glossed "young man" for a woman too (s32's lead); "Oh, go on then" (British);
   "shall I…" in `which_place`, `arrived[0]`, `arrived[1]`, `ask_ac` (cross file); "Where exactly…" (`which_place`
   says no "exactly"); `unknown_place` split "no | conozco" against S-NEG; `far[1]`'s flag pointed at "llegamos", not
   "ahorita", and glossed ahorita "right now" against its own flag; the hint "¿Cuánto | se | hace?" split "se hace".
6. **Spelling, accents, ¿¡**: nothing.
7. **Questions and offers without an answer** (47): "¿Está libre?" was read as the bus terminal (`la estación`
   fuzzy) and "¿Por qué tan caro?" as the terminal too; "A la estación de policía" went to the bus terminal; "Al
   restaurante El Muelle" said "no conozco" and recorded the beach; "Al aeropuerto, tengo prisa" and "A la clínica, es
   urgente" got "no conozco ese lugar" (the catch-all ate the place); "Hace frío" and "Aquí a la derecha" got "no
   conozco ese lugar"; "Al hotel" (the town's only hotel), "Mejor al aeropuerto", "No, mejor al museo", "Más adelante",
   "Frente al banco", "Aquí mero", "No, es mucho", "¿No me lo deja más barato?", "¿Cien pesos?", "¿Cuánto me dijo?",
   "¿Cuánto le debo?", "Le doy doscientos", "¿Tiene cambio de quinientos?", "¿Acepta dólares?", "No tengo efectivo",
   "¿Puedo pagar con transferencia?", "¿Le pago ahora?", "¿Me ayuda con la maleta?", "Necesito un taxi", "¿Me lleva?",
   "¿Es tarifa fija?", "Soy de Chicago", "Soy inglés", "De Canadá, ¿y usted?", "¿Usted es de aquí?", "No, vivo aquí",
   "Me acabo de mudar", "Mejor abro la ventana", "¿Puede apagar el aire?", "¿Qué me recomienda?" were not understood or
   got a wrong answer; Tulum, Cancún, Playa del Carmen, the cenote and the ruins got "no conozco ese lugar"; a second
   request for less after a discount got "Es tarifa fija"; asking for more than the fare ("¿Me lo deja en ciento
   veinte?" at $100) got "se lo dejo en $120"; "Así está bien" at "¿Le parece bien?" ended the conversation ("Como
   guste"); "Aquí tiene, quédese con el cambio" gave change and then thanked for the tip; "¿Cuánto se hace al
   aeropuerto?" (read as two pieces) agreed a fare that was never said; "Tenga, cincuenta" for a $100 ride gave change;
   "¿Me da un recibo?" before the ride handed over a receipt; "¿Está lejos?" with no place answered ten minutes.
8. **Hints** (4): `f_haggle` "¿Me lo deja en cien?" (the fare itself at $100); `talk.c_ac` "prender" and `talk.e_long`
   "se hace" without neutral twins; no hint for "¿Tiene cambio?".
9. **Accepted answers** (2): no corpus or held-out set; the held-out set, written before the grammar changed: 24/55
   understood (44%) and 4/11 traps accepted.
10. **Neutral text** (1): `far[1]`'s twin "Está cerca, ya llegamos" reads "we've arrived" (now "ya casi llegamos");
    the hints' twins are under point 8. No new line has a Mexican-only word.

### Fixed

- **The airport is next door** (the dialogue follows the 3D town): "¿Me lleva al aeropuerto?" → "El aeropuerto está
  aquí al lado, joven." (no ride, no fare, not a chip); the intro says the sitio is at the east end of the main street,
  by the airport. The sims that bargained at $350 now bargain at the hotel's $120 and the clinic's $120.
- **Places**: the rest of the town a rider would ask for is a destination too (12 more, not shown as chips: Correos,
  Policía, the visitor center, Cocina de Lucía, El Muelle, Las Palmas, Línea Clara, the gym, the church, Boutique
  Hilos, the salon, the gas station, Brotecito); "Al hotel / a mi hotel" is Hotel Mar Azul; a place said with words no
  pattern covers is found in the sentence. Out of town (`FAR`): the cities get "Hasta allá no voy, joven. ¿Lo llevo a
  la terminal?" (yes → the terminal's fare), the cenote and the beaches up the highway "Mejor tome un colectivo", the
  ruins "A las ruinas se llega caminando por la playa" (s69). "Son como cinco minutos" (the town's scale).
- **The fare**: never agreed before it's said; a change of place says the new fare at once (also after asking for
  less) and starts a new ride; asking for less a second time → "Más barato no se puede, joven"; asking for the fare
  itself or more is an agreement; prices in steps of 5 pesos and at most 20 below the fare, every one in the voiced
  list ($80–$120); "¿Es tarifa fija? / ¿Usa taxímetro?" → "Es tarifa fija" (and it stays fixed); "Así está bien",
  "Cien está bien" agree; "No está bien" is asking for less; a bare price names one; "¿Cuánto me dijo?" / during the
  ride → "Son $X."; at the end → "Serían $X."
- **Paying**: "¿Le pago ahora?" / money before the ride → "Me paga al llegar."; too little → the fare again; "Aquí
  tiene, quédese con el cambio" is one tip; dollars → "Dólares no, joven. Solo pesos."; no cash → "Aquí cerca hay un
  cajero; lo espero." (the bank's ATM); "¿Tiene cambio?" → "Sí, traigo cambio."; a receipt asked early comes with the
  change; paying at "¿Dónde lo dejo?" stops there.
- **Small talk**: nationalities, cities ("Soy de Chicago"), "¿y usted?" (→ "Yo soy de aquí, de toda la vida." and
  the first-time question), "vivo aquí" (no "¡Disfrute Puerto Colibrí!" at the end), "me acabo de mudar"; "¿Está
  libre?", the bag, a hurry, "¿Qué me recomienda?" / "No sé" (→ the center and the beach), the AC off and the window
  instead; "No" at "¿Le paro aquí?" → "¿Dónde lo dejo, entonces?"
- The glosses and English above (point 5); the neutral twins (point 10). New lines, all in Don Rigo's register: 
  `fare_again`, `haggle_again`, `far_no`, `far_bus`, `far_colectivo`, `ruins_walk`, `airport_here`, `rigo_from`,
  `first_q`, `where_stop`, `pay_later`, `dollars_no` (s32's text), `no_cash`, `change_yes`, `bag_ok`, `hurry_ok`,
  `recommend`; `far[1]` is now `far_ride` and `bye[1]` `bye_enjoy` (same texts, said where they fit).
- Tests: 89 NLU tests (was 49), 6 sims (was 3), all 12/12. **Corpus** `tests/es/corpus/s66-taxi.json`: 310 items
  (43 traps or must-not-understand), 267/267 understood, 0 false accepts. **Held-out**: 55/55, 0/11 false accepts
  (two labels renamed to the intents' final names; one sentence fixed by the grammar).
- The voices: 760 clips for this conversation in both sets (554 before), every place's fare in both variants checked.

### Left for the lead or the owner

- STYLE.md ("a taxi in town $100–150 (to the airport $350)") and TOWN.md "Prices the conversations share" ("to the
  airport $350 (s66)") still name the airport fare; s66 now says the airport is next to the sitio. TOWN.md "Getting
  around" asked this reviewer about it.
- `tools/es-voices/lines-es.ts` enumerates no line with both an item and a value (`fare_is`: "¿Al centro? Son $100."):
  only random conversations and sims reach them. Every s66 combination was reached this time (checked), but a rule
  there would make it certain.
- The composer's natural English gives every `{X.the}` "the", also for an entity whose `def` is "" (no article); s66
  works around it (Cocina de Lucía, "la oficina de Línea Clara").
- A piece of a sentence can't start with "es" ("Al centro, es urgente" isn't read as two pieces); s66 finds the place
  in the sentence instead.
- N/AUDIT pictures: the manifest's note says the sitio is "by the zócalo"; it is at the east end of avenida Juárez.
