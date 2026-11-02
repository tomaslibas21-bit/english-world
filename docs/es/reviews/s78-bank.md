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
