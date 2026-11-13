# Review: s78-bank (Banco del Puerto, Ricardo), writer's commit 33ebc967

## Gate and blind set
| | Before (writer) | After (review) |
|---|---|---|
| tsc / check-content | clean; 116/116 NLU, 13 sims 12/12, fuzz OK, 0/0 | clean; 133/133 NLU, 16 sims 12/12, fuzz OK, 0/0 |
| corpus | 377/377 (100%), 0/27 false accepts | 395/395 (100%), 0/28 (19 review traps added, 2 items re-scored) |
| blind set (42, 7 traps) | 40/42 (95.2%), 0 traps accepted | 41/42 (97.6%), 0 traps accepted |
The one blind miss left is "Las dos" → `both_ctx` (the writer's own intent for it; correct behavior, not a bug).
## Fixes (file: 179 lines added, 43 changed or removed)
**meaning-safety, must-fix (~45 lines)**
- An amount said before the rate was changed at once: "Tengo doscientos dólares", "¿Puedo cambiar mil…?" and the what-if
  "¿Y si cambio quinientos dólares?" at the first question handed over pesos. Now the rate is said, the amount quoted, "¿Se los cambio?".
- "Quiero cambiar diez mil dólares": the number slot stops at 9,999, so it was read as 10 + 1,000; $172 changed and
  "¿Cuántos dólares…?" said twice. Big amounts are now read from the words and refused over a US$4,000-a-month limit (said once).
- "Ahorro no, débito" / "Débito no, ahorro" (comma lost) recorded the first word. Now `#amb`: a typed comma decides, otherwise "¿cuál de las dos?".
- "No, pero quiero abrir una" at "¿Tiene cuenta?" read "una" as a 1-peso deposit and lost the request; now open_account.
- "¿Cuánto cuesta?" at the savings offer quoted the checking fee ($150) for a free account; at the app and cash offer it got
  "No hay problema"; at the deposit the monthly fee. Each now answers its own question (no fee, no charge, the $500 minimum).
- "Está bien, gracias" at the cash and savings offers was a yes; now "¿Eso es un sí o un no?" (rule 17).
- "No quiero sacar dinero" at the cash offer was re-asked; "No quiero cambiar nada" at the quote was not understood: both are a no now.
- "No, mejor mil / dos mil / doscientos" at a confirm question: the new amount is taken and the old question is not asked again.
- "Tengo efectivo" at the deposit set cash=false and said "No hay problema"; it now only answers the cash offer.
- "Cien dólares" at the deposit asked "¿Tiene cuenta con nosotros?" mid-opening; now "Su cuenta es en pesos".
**understanding (~35 lines):** "¿Puedo cambiar mil dólares?", "No quiero cuenta de ahorro, solo de débito", "No mil, quinientos",
"No, tampoco" (lease), "El recibo de luz no está a mi nombre", "No sé, tal vez" (PIN), "Todavía no he terminado" (form),
"No quiero depositar nada", "No, gracias, ya la tengo" (app), "No, mejor no" at the cash amount (was a loop), "solo cambiar dólares".
**structure / flow, polish (~25 lines):** dollars asked for during the opening (or refused as a non-customer) are changed once the account is open ("en cuanto quede abierta su cuenta se los cambio"); a newcomer isn't asked "¿Tiene cuenta?"; no "¿En billetes de quinientos?" under $1,000.
**gloss-english, polish (6 lines):** "an balance", "an transfer" ×2, "a account", "How much does it take" (tr_long), "either" (tampoco).
**spanish, twins, numbers:** no must-fix in the writer's lines (pluma, NIP ×3, ahorita twinned; all usted; the rate said "diecisiete con veinte"); 7 new lines.
**tests (~70 lines):** 17 NLU tests (traps and the misses above), 2 writer tests re-targeted ("No he firmado", "No quiero depositar
nada" now have their own intents), 3 sims (quoted exchange + correction; comma-lost type + form wait + deposit correction; dollars
after opening). Corpus: 2 trap items re-scored (open-offer "solo quería cambiar dólares", savings "solo la de débito") because the
handlers record a no; both probed.

## For the lead / owner
- **Fact to check:** the US$4,000-a-month cash limit for account holders is the Mexican rule as I know it; drop to a vague
  "hay un límite mensual" if unsure. Other figures as the writer listed (all made up for the fictional bank).
- Cash at the counter has no upper limit or balance check (as in English). The writer's NEEDS (global yes list) stands.

## Lead's check (2 Nov 2026)
Checked: amounts typed and said (commas, "15 mil", pesos vs dollars, the limit, quotes), every money step played whole with
probe.ts (opening deposit, cash at the counter, exchange: a plain no, a correction, a what-if, a price question, a polite
closing, a past), the reviewer's open points, every flag's unit. 30 new edge and trap sentences: 18/18, 0/12 traps.
**Fixed, must-fix**
- An opening deposit said early opened the account at once, with no ID, proof, CURP or form: "Quiero abrir una cuenta de
  débito con mil pesos", "Quiero depositar mil pesos" at the ID, "Con el mínimo" at the proof. Now "El depósito lo hacemos al
  final." (new line) and the deposit step asks it in its turn.
- "Quiero cambiar 15 mil dólares" (typed) changed US$1,000 in the same turn as its quote; "Quiero cambiar 1,000 dólares",
  "1,000" and "¿Cuántos pesos son 2,000 dólares?" were refused as over the limit. Typed digits are now read by their value.
- "Quiero cambiar dos mil pesos" at "¿Cuántos dólares…?" changed US$2,000 ($34,400). A peso amount is no dollar amount:
  "Entonces, ¿cuántos dólares?" (new line, also the dollars step's re-ask, so its question is never said twice in a row).
- "No quiero cambiar nada" at the dollars step and "No quiero sacar nada" at the cash amount were asked again: now a no.
- After "¿Tiene cuenta con nosotros?" → "No" → the opening, "Quiero cambiar dólares" changed the amount from the start with
  no new yes: only an amount said in the turn counts now.
- "Con quinientos alcanza" said (no "?") deposited at once: its #q now asks "¿Lo deposito, entonces?" as the typed one does.
- "Está bien" to "llene esta solicitud y firme" signed the form: now the step's "Tómese su tiempo…" ("¿Así está bien?",
  "Ya está", "Listo" still hand it in).
**Polish:** the US$4,000 counts the dollars changed earlier in the visit (3,000 then 2,000 is refused; once reached, no new
"¿Cuántos dólares…?"); "Todos los que traigo" (a hint) got "No hay problema" and the question again, now changed; understood
now: "Quiero sacar dos mil pesos" / "¿Puedo sacar…?" (paid after the ID), "Quiero cambiar otros doscientos dólares", "No traigo
efectivo" at the deposit; "No, pero quiero abrir una" at "¿Tiene cuenta?" keeps the dollars for after the opening; two flags
on the wrong unit (ask_type 10 → 9, type_which 4 → 5); 6 NLU tests, 3 sims.
**Open points:** US$4,000 a month is the SHCP rule of 2010 for individual account holders as I know it (non-customers
US$300 a day, 1,500 a month): kept. The writer's NEEDS (global yes list) and the counter cash with no balance check stand.
Still not understood, nothing moves: "No quiero cambiar mil, solo quinientos", "1.000" (Spain's thousands point).
**Gate after:** tsc clean; 139/139 NLU, 19 sims 12/12, fuzz OK, 0/0; corpus 395/395, 0/28; blind 41/42, 0 traps; vitest 287/287.

## Audit (5 Nov 2026)

Fresh reviewer (N/AUDIT-BRIEF.md): both texts read in full (review.ts seeds 3 and 7, before and after), the cross and
neutral leads checked, ~60 probe.ts scenarios (offers and their refusals, closings, side questions, every money step with
a question, a past, a what-if, a polite closing), es-offer-probe in both texts (0 flags), the voiced value lists
(reach-es.ts). Bank facts checked against the other audits: Saturdays until two (s62 ✓), the dollar at $17.20 here and
$17 at Doña Chela's (s71b ✓), money only on a clear yes, the documents as Mexican banks ask in Nov 2026 (BBVA and
Banamex: "pasaporte y forma migratoria", proof of address ≤ 3 months, the CURP, which residents have; checked online).

**Found 38 (1:3 2:0 3:0 4:5 5:7 6:0 7:16 8:2 9:2 10:3), fixed 38.**

**4 · facts (must-fix)**
- Opening an account took the passport *or* the residence card ("Voy a necesitar su pasaporte o su tarjeta de
  residente…", "¿Me permite una identificación? Su pasaporte está bien.", open_need). Mexican banks ask a foreigner for
  both. Now `ask_id`, `ask_id_proof` and `open_need` ask for both (open_need also names the CURP); one shown, the id step
  asks for the other ("¿Y su tarjeta de residente?" / "¿Y su pasaporte?"); "Aquí tiene", "Sí, aquí están" hand both
  over; without one ("No, no la traigo", "Solo traigo mi pasaporte", "No tengo pasaporte, pero…", "Todavía no tengo mi
  tarjeta de residente", "Soy turista") no account today: need_docs_open + come_back_docs, the visit ends (as the
  no-ID path did); "¿Y si no tengo tarjeta de residente?" gets the rule and the question stays. A license at the
  opening: license_no_open, then the question again. The card and the cash still take one ID. The checklist's "Show
  your ID" ticks on both documents when opening. The id scene picture (a passport) and the CURP one (Ricardo holding
  the residence card, pointing at the code) fit the new order.
- ssn_none_ok[1] "No pasa nada; la puede agregar después" said the CURP could wait; removed ("la buscamos en el
  sistema con sus datos" stays).
- A first-visit learner whose card the ATM kept was offered cash "aquí en ventanilla" with no account here: the card
  is the bank's own (found by the ID and the digits), so its owner is a customer now; a newcomer who said they have no
  account hears card_other_bank (another bank's card: it isn't given back, call that bank), and no cash is offered
  without an account (cash_offer needs a customer).
- A tourist at the exchange ("No, soy turista", "Estoy de vacaciones") was read as the CURP's ssn_none ("Muy bien.")
  and the question stayed; now a no with no account offered (an account takes a residence card): tourist_ctx.

**7 · questions and offers (must-fix, wrong meanings and loops)**
- "¿Por qué?", "¿Para qué?" and "¿Qué es eso?" anywhere got the CURP explained (ask_ssn_what's "que es eso",
  "para que [es] [eso]" with por/para and es tolerated). ask_ssn_what keeps only the CURP; what_ctx answers by step
  (the CURP, the comprobante, the lease after "¿Tiene contrato de renta?" (new lease_explain), the account types,
  the NIP); "¿Por qué?" at "¿Tiene cuenta con nosotros?" gets why_customer (or the transfer's reason) and the
  question again; the rule is said once.
- "¿Es gratis?" at the app, the savings offer, the cash and the exchange got the account's monthly fees: now the app is
  free (app_info), the savings account has no fee, the cash has no charge, the exchange has no fee, a transfer $750.
- "¿Cuánto puedo sacar?" got "No tiene ningún costo" (cost_q + withdraw): cash_max_q → cash_limit "Lo que tenga en su
  cuenta."; "¿Cuánto puedo cambiar?" / "¿Cuál es el máximo?" (not understood) → ex_max ("A nuestros clientes les
  cambiamos hasta 4,000 dólares al mes en efectivo.", the same limit as ex_limit), at the quote the quote again.
- Loops: "Eso es todo", "Nada, gracias", "No, gracias" at "¿En qué le puedo ayudar?" (after a question or a declined
  offer) asked the same question forever: the help step's no now says goodbye. "Gracias, es todo" / "Muchas gracias,
  eso es todo" were read as thanks and "¿Algo más?" came again: more_no patterns. "Es todo" at "¿Se los cambio?",
  "¿Se lo doy?" and "¿Cuántos dólares?" now close (nothing changed or paid). "Quiero abrir una cuenta" said again at the
  type question asked it twice in a row ("Entonces, ¿de débito o de ahorro?" + "¿Cuál le gustaría?").
- Not understood before, answered now: "¿Cuánto me dan por cien?" (no "dólares") at the dollars step (a quote),
  "¿Qué necesito para mandar dinero a Estados Unidos?" (the transfer's needs, then the account question), "¿Puedo abrir
  una cuenta en dólares?" (usd_account_no: individuals' accounts are in pesos outside the northern border zone),
  "La primera / La segunda" at "¿de débito o de ahorro?", "¿Qué es el NIP?" (nip_explain), a bare "No sé" at "¿Puso mal
  el NIP?" (it got "Tómese su tiempo" and the turn was held; a local g_dontknow answers it and moves on), "Quiero
  comprar dólares" (the selling rate; selling isn't modeled, see below).

**9 · meaning safety:** a typed "¿Cien?" at "¿Cuántos dólares…?" changed the money and "¿Mil?" at "¿Cuánto quiere
retirar?" paid it out; a "?" now quotes or asks back, as the deposit already did (said, without "?", it stays an answer).
Held-out: "Las dos, por favor" now accepts both_ctx (the step's own intent for it).

**1 · Spanish:** with "Las dos" the deposit and the opening spoke of one account ("Para abrirla…", "Su cuenta nueva está
abierta"): min_deposit_both, ask_deposit_both, opened_both. fee_waive ("Y si recibe aquí su sueldo, tampoco paga
comisión") was voiced but never said: now the end of the fee answer.

**5 · English (not voiced):** "Shall I…?" → "Should I…?" / "Do you want help with the app?" in deposit_enough,
exchange_quote, exchange_quote_rate, cash_confirm, ask_bills, offer_app_again; the hint note "the cash machine" → "the ATM".
**8 · hints:** "Estoy esperando mi tarjeta de residente" at the CURP contradicted the card just shown → ssn_dunno "No sé
cuál es."; the opening's id step suggests a new "docs" group ("Aquí están mi pasaporte y mi tarjeta de residente.",
"Aquí tiene.", "Aquí está mi pasaporte."). **10 · neutral:** twins for the hints form_pen (bolígrafo) and card_pin ×2 (PIN).

**Voices (for the lead):** 16 new spoken lines (ask_res_card, ask_passport_too, need_docs_open, come_back_docs,
license_no_open, min_deposit_both, ask_deposit_both[0] ([1] is ask_deposit[1]'s text), opened_both, why_customer,
cant_change, ex_max, usd_account_no, cash_limit, nip_explain, lease_explain, card_other_bank), 4 changed (ask_id ×2,
ask_id_proof, open_need), 1 removed (ssn_none_ok[1]); hints: docs_both new, ssn_dunno replaces ssn_waiting, 3 neutral
hint twins. No Mexican-only word in the new lines. Values: every {$price} line has its one fixed value; the exchange
lines keep the whole 200-value list ($10–$2,000 × 17.20), which covers every amount they can say (inAmountDomain).

**Tests:** NLU 139 → 159; sims 19 → 26 (7 opening sims re-scripted with the residence card; 7 new: only the passport,
both accounts + both documents + "¿Qué es eso?", a tourist at the exchange, "¿Cien?" quoted + "Es todo", a first-visit
card + "¿Cuánto puedo sacar?", a newcomer's foreign card, goodbye after a declined offer); corpus 395/395 (0/28) →
451/451 (0/30), +58 items (+22 with not-lists); held-out 41/42 → 42/42.

**Proposals (shared files) and owner questions**
- s62 sends anyone who wants to change money (euros too) to the bank, which changes only US dollars and only for its
  customers (a tourist can't open an account): s62's answer could say so, or TOWN.md could get a casa de cambio.
- TOWN.md "Facts": the bank's opening documents (passport + residence card, proof of address ≤ 3 months, the CURP).
- Global (as s68 proposed): a bare "Gracias" at an open offer gets "¡De nada!" and the offer stays (the welcome,
  savings, app and cash offers here).
- Owner: selling dollars (the board's $18.10) isn't part of this visit; "Quiero comprar dólares" gets the rates only.
  A small sale flow with generic lines (no amount list) is possible. And: no account without the residence card (as
  the big banks do); or should the fictional bank open a basic account with the passport alone?

## Spain twins (11 Nov 2026)

15 twins + Spain nouns for the license (carné de conducir, m) and the lease (contrato de alquiler). Ricardo keeps usted (no
register change). Also: "¿En qué puedo ayudarle?" for "¿Qué se le ofrece?", "Me alegro de verlo", "Por supuesto" for "Con gusto",
"Vuelva", "con eso basta", móvil, "aquí fuera", the hint "Ya está, ya he firmado". Left Mexican: CLABE, CURP, RFC, NIP (the bank's
own Mexican terms, taught by the conversation). Spain corpus: 12 items (carné de conducir, contrato de alquiler, boli, euro).

## Spain review (12 Nov 2026)

Fresh reviewer, against docs/es/STYLE.md "Spain Spanish": every line's Spain reading (twin, else neutral), the hints and
example answers, tú/usted and vosotros by the Spain rule, meaning and English against the Mexican line, Mexican-only
things kept, and the Spain corpus.

Found and fixed: comprobante de domicilio → justificante de domicilio (entity forms too); ¿Trae…? → ¿Tiene…?; llenar → rellenar; depositar / depósito → ingresar / ingreso (grammar takes it); ¡Listo! / ¡Ya quedó! → ¡Hecho! / Ya está; saldo promedio → medio; pagar servicios → recibos; falla → fallo; anda lento → va lento; costo → coste; ¿Puso mal el PIN? → ¿Ha puesto…?; hints in the perfect (se ha tragado, se ha quedado, se ha comido, he puesto mal el PIN), llevo, más pequeños. Kept: cuenta de débito (the entity's gloss has three units; cuenta corriente would need its own), recibo de luz, CURP/CLABE (Mexican).

English of every twin checked against its Mexican line (restored where a twin had rephrased it). Spain corpus items
added for the new forms. Gates: Mexican, neutral and Spain checks 0 errors; coverage 0 false accepts.


## Lead's wording call (13 Nov 2026)

Neutral and Spain: cuenta de débito → cuenta corriente (ask_type ×2, ask_type_again[0], explain_types, recommend_both,
type_which, ack_not_type, and the entity: attrs.neutral "cuenta | corriente" with its own gloss, `neutralLt` "account |
checking", which the composer now reads: src/editions/es/convo/target.ts `neutralNoun`). México keeps cuenta de débito; the
debit card stays tarjeta de débito everywhere. "Corriente" / "cuenta corriente" understood in every set; "Una cuenta
corriente (de débito) y una de ahorro" at the type question is now both (it recorded savings). NLU tests +7, Spain corpus +2.
