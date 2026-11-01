# Puerto Colibrí — style sheet

The Spanish edition of the game: Spanish for adults whose own language is English. This sheet is the owner's
decisions and the rules every conversation follows. The models that show all of it in code:
`src/editions/es/content/situations/s72-cafe.ts` (café), `s32-mercado.ts` (market stall, numbers),
`s66-taxi.ts` (taxi, agreed fares, places).

## The owner's decisions (1 Nov 2026)

- **The town:** Puerto Colibrí ("Hummingbird Harbor"), a small town on Mexico's Caribbean coast. Tulum's beach,
  cenotes and palapas, and an everyday Mexican center: a zócalo with a kiosco and a church, a mercado, painted houses,
  a malecón with boats. Not Cancún: no big resorts, no spring-break English.
- **The Spanish:** Mexican by default. A Settings switch gives neutral Latin American Spanish instead.
  - The game always **accepts both** (every pattern has the Mexican and the neutral word).
  - A line with a **Mexican-only word** gets a **neutral twin** (`neutral:` on the line, same meaning; it is shown
    and voiced when the learner chooses neutral Spanish). The twin changes only what it must.
  - Keep Mexican-only words to a **modest share**: about one line in eight or fewer. Flavor, not a dialect course.
  - Mexican-only words in use so far: ahorita, nomás, pizarrón, ticket (receipt), pilón, jitomate, prender (turn
    on), pásele, ándale/ándele, sitio (taxi stand), camión (bus), ¿mande?, chamba, padre (cool), güey (never in
    NPC lines). Their twins: en un momento / enseguida, solo, pizarra, recibo, de regalo, tomate, encender,
    adelante, muy bien / bueno, parada de taxis, autobús, ¿perdón? / ¿cómo?, trabajo, genial, —.
  - Words Mexico shares with most of Latin America are not "Mexican-only": celular, carro is Mexican (auto/coche are
    neutral — twin it), plátano, papa, jugo, departamento (twin: apartamento), manejar, estacionamiento,
    computadora, boleto (twin: pasaje where it matters), recámara (twin: dormitorio/habitación).
- **People:** a new Mexican cast with local names and looks (`src/editions/es/content/npcs.ts`). The owner makes new
  pictures with ChatGPT later; until then conversations show the 3D view. The 315 Maple Harbor pictures don't carry
  over.
- **The player:** a newcomer. About half the situations suit a long-stay visitor and half someone who moved there;
  most suit both. A few are for movers: the apartment, the bank account, the job, the neighbors, the landlord.
- **English:** all help, hints, glosses, notes and tips are in **American English** (owner's rule for all course
  content).

## Usted and tú

- **NPCs address the learner with usted** by default: staff, officials, older people, strangers. An NPC marked
  `informal: true` in `npcs.ts` uses tú: friends, colleagues at the learner's level, the date, party guests of the
  learner's age. Mexico is more formal with strangers than Spain: a waiter, a vendor, a driver say usted.
- Write a line for **its NPC's register** directly ("¿Qué le sirvo?"). Only lines shared by NPCs of both registers
  (global.ts) use the switch `{u:usted form|t:tú form}`, inside one unit: `¿{u:Puede|t:Puedes} | repetir?`.
- **Hints** show what the learner says to this NPC: usted to staff, tú to friends. In a situation with one NPC write
  the right form; shared hint groups use `{u:|t:}`.
- **The grammar accepts both.** A learner who says tú to staff is understood; tag those patterns `#tip:tu_staff`
  (a short English tip: "With staff, usted is more polite…"). Never block a conversation over the register.
- Usted forms to know: puede, tiene, quiere, me da, deme, dígame, pase, siéntese, perdone/disculpe, su (your).
  Tú forms: puedes, tienes, quieres, me das, dame, dime, pasa, siéntate, perdona/disculpa, tu.
- Plural "you" is always **ustedes** (Latin America; never vosotros).

## The learner's gender

The learner chooses a gender in the profile. Spanish shows it in what NPCs say about them ("¿Está listo?" /
"¿Está lista?", "Bienvenido/Bienvenida", "verlo/verla") and in what the learner says ("Estoy cansado/cansada").
Write `{m:listo|f:lista}`; the speaker's own gender is `{sm:…|sf:…}`. Both forms are recorded.

## Interlinear glosses (Spanish → English)

Every line and hint is `t(spanish units, english glosses, natural english)`, units separated by ` | `, one to one.
The rules are the English edition's (AUTHORING.md §3) turned around. In short:

| Code | What | Write |
|---|---|---|
| S-WORD | One Spanish word per unit, glossed with as many English words as it needs | `quiero` → `I want`, `tiene` → `do you have` (in a question) |
| S-ART | An article gets its own unit and its English article | `el | café` → `the | coffee`; `un | latte` → `a | latte`; `unos` → `some`. Where English has none (`la | leche` = milk in general, `el | lunes` = on Monday) gloss what English says (`on`) or `—` with a flag |
| S-CLITIC | An object pronoun before the verb: its own unit | `le | sirvo` → `(to) you | I-serve`; `lo | quiere` → `it | you-want` |
| S-NEG | `no` + verb (+ a pronoun between): one unit with English's own negation | `no tengo` → `I don't have`; `no lo tenemos` → `we don't have it` (rule in merges.ts) |
| S-LEX | Fixed expressions: one unit | `por favor` → `please`, `para llevar` → `to go`, `de nada`, `lo siento`, `a la orden`, `¿qué tal?`, `buen provecho` |
| S-SE | `me gusta`, `me llamo`, `se llama`, `se puede`, `me lo`, `se lo`: one unit | `me llamo` → `my name is`; `se lo` → `it to you` |
| S-TIME | Clock and date phrases in one unit where the words lie | `y media` → `thirty`, `cuarto para` → `a quarter to`, `de la tarde` → `p.m.` |
| S-NAME | Names of two words: one unit | `Estados Unidos` → `the United States`, `Apple Pay` |

- **The gloss line reads as English in the Spanish word order** (it's interlinear; the natural English is the third
  argument). Mark the verb's person where English needs a subject: `I-serve`, `you-want`, `we-have` (hyphenated)
  — or a plain English phrase when one exists (`quiero` → `I want`).
- **Flags** (`{ flags: { unitIndex: "why" } }`) explain the surprising bits in one short English sentence: a Mexican
  word ("Mexican: ahorita = right now"), usted vs tú, lo/la for the learner's gender, a diminutive.
- **Every multiword unit is registered**: in `src/editions/es/content/merges.ts` (shared ones) or the situation's
  `merges` field. `tools/check-content.ts` lists the unregistered ones.
- **Punctuation**: Spanish units keep ¿ ¡ at the start and ? ! at the end; the gloss mirrors the end mark.

## Writing natural English help

- Hint group labels (`lt` of a hint group, a suggestion's `lt`, mission items): short English imperatives —
  "Order a drink", "Ask the price", "Say that's all".
- The natural English (third argument of `t()`) is what an American would say in that moment, not a translation of
  the words: "¿Qué le sirvo?" → "What can I get you?".
- Notes on hints: one short sentence, practical ("Very common in Mexico: “¿Me da…?”").
- The situation's `goal` and `intro`: plain English, second person, two or three sentences. Mention prices are in
  pesos where it matters.

## Numbers, money, time

- **Pesos.** Prices are in cents of a peso (`8550` = $85.50). Mexico writes `$85` and `$1,250.50` (the dollar sign
  means pesos). Use `{$price}` (or another money value name: total, amount, fare, rent, deposit) in lines: it shows
  "$85.50", glosses "85.50 pesos" and is said "ochenta y cinco pesos con cincuenta centavos". Round prices to 5
  pesos where real ones are (a coffee $45, a taxi $120, a kilo of avocados $70).
- Typical prices (2026, a beach town): coffee $35–60, pan dulce $20–30, a market kilo of fruit $25–80, a taxi in
  town $100–150 (to the airport $350), a meal $150–350, a hotel night $1,800–3,500, rent $12,000–20,000 a month.
- **Time.** `{$time}` carries its article: "las 8:30" (spoken "las ocho y media"), "la 1:00" ("la una"). Write
  "a {$time}", "desde {$time}", "son {$time}" in lines. Mexicans say the 12-hour clock: "las ocho de la noche".
- The understanding side reads Spanish numbers, "cuarto para las ocho", "ochenta y cinco cincuenta", "15 mil",
  "veinte pesos de limón", "medio kilo", phone numbers in pairs ("noventa y ocho, cuarenta y cinco"): the built-in
  slots in `src/editions/es/convo/slots.ts` (`{number}`, `{price}`, `{time}`, `{day}`, `{date}`, `{year}`,
  `{letters}`, `{name}`, `{digits}`).

## Glossary (the words the conversations share)

| English | Spanish (Mexico) | Neutral twin, if any |
|---|---|---|
| receipt | el ticket / el recibo | el recibo |
| tax invoice | la factura | — |
| cash / card | efectivo / tarjeta | — |
| change (money) | el cambio | — |
| tip | la propina | — |
| check (restaurant) | la cuenta | — |
| bus | el camión (city bus), el autobús (long distance) | el autobús |
| bus station | la terminal (de autobuses), la central | — |
| taxi stand | el sitio (de taxis) | la parada de taxis |
| car | el carro | el auto / el coche |
| apartment | el departamento | el apartamento |
| bedroom | la recámara | la habitación |
| cell phone | el celular | — |
| to drive | manejar | — |
| parking | el estacionamiento | — |
| sidewalk | la banqueta | la acera |
| right now / in a moment | ahorita | ahora / en un momento |
| okay (agreeing) | sale, va, ándale | está bien, de acuerdo |
| pardon? | ¿mande? | ¿perdón?, ¿cómo? |
| cool | padre, chido | genial |
| job, work | la chamba (colloquial), el trabajo | el trabajo |
| straw | el popote | la pajilla / el sorbete |
| tomato | el jitomate | el tomate |
| pool | la alberca | la piscina |
| juice | el jugo | — |
| restroom | el baño | — |

## Names and places

- The cast (`src/editions/es/content/npcs.ts`): the ids are the town's role slots, shared with Maple Harbor; each has a
  Mexican name, a Spanish role and its English gloss. Use the names in the table there; a new character needs the
  owner's OK. Titles as Mexicans use them: Don/Doña + first name for older people, Licenciado/Licenciada,
  Ingeniero, Doctor/Doctora, Oficial. "Joven" for a younger stranger, "marchante/marchanta" at the market.
- Places (`src/editions/es/content/locations.ts`): Café La Ceiba, Mercado Municipal, Zócalo · Tianguis, Hotel Mar
  Azul, Restaurante El Muelle, Línea Clara (the office), Brotecito (the startup), Departamentos Las Palmas… The
  location ids are Maple Harbor's.
- Brands: invent them (NetWave stays as a made-up phone company; Harbor Home → "Hogar Puerto"). Never a real Mexican
  company (no OXXO, ADO, Telcel, BBVA, Bimbo): use "la tiendita", "la terminal", "la compañía de teléfono".
- Real places nearby are fine as places (Cancún airport is "el aeropuerto"; mention Tulum or Playa del Carmen only
  as places people go).
- The learner is from an English-speaking country (the United States, Canada, the UK, Ireland, Australia, New
  Zealand). Small talk may ask; never assume which.
