# Two for the Seven O’Clock Show

A pair of friends has made it to the museum just in time for the evening short. At the ticket window the learner asks for two seats together, decides whether to get popcorn, and pays. The exchange practices buying tickets in a single sentence as well as answering one question at a time.

## Where to go

| Edition | Walk to the counter | After payment |
| --- | --- | --- |
| Maple Harbor | From Main Street, enter the Maple Harbor Museum of Art at (−26, −19). Ben serves the ticket desk at room (−7, 3.5). Approach from (−7, 4.6). | Take the open route past the statue to the three seats facing the west side of the partition. The film is **Lunch on the Fly**. |
| Puerto Colibrí | From avenida Juárez, enter the Museo de la Costa Maya at the same door. Iván works the taquilla in the shared `ben` role. | Iván hands over the tickets. This draft ends at the counter in both helper-language editions. |

The first program consists of the owner’s original, wordless harbor cartoon. MH already offers it from the seat. When the conversation is approved, its completed end card can use the existing `modeOffer("x09-box-office")` and `modeFromConversation("cinema")` path. The short shares a single player across these entries. Starting it leaves the lesson stamp and payment in the conversation.

## Routes and prices

These prices belong to the fictional museum. A regular ticket costs $8 in MH or MX$60 in PC. Showing a student ID reduces **one** of the two tickets by $2 or MX$15. One small popcorn adds $3 or MX$30. A learner who leaves the ID at home can still finish.

| Route | Learner choices, in order | Seller’s total (MH / PC) |
| --- | --- | --- |
| Full order | Two for seven → back → two regular → tickets only → cash | $16 / MX$120 |
| Short order | Two tickets → seven → middle → student → show ID → small popcorn → card | $17 / MX$135 |
| Recovery | Two for seven → middle → student → forgot ID → small popcorn → card | $19 / MX$150 |
| Discount only | Two for seven → back → student → show ID → tickets only → cash | $14 / MX$105 |

Both seating choices keep the pair together. Hint groups offer a short spoken answer at each fork. The single-sentence order satisfies both the count and show steps. “Do you have a student discount?” opens an ID check. At this cinema the seller can take the popcorn order at the ticket window.

## Situation data

Each edition block supplies the `lines`, `hints`, `intents` and metadata used by the shared `SituationDef` below. The MH model is `src/content/situations/s67a-tickets.ts`. The PC model on `plans8/pc` is `src/editions/es/content/situations/s67a-tickets.ts`. As in those files, every `t` carries aligned target and helper units followed by a natural translation. The Mexican overlay uses **boleto**, **función**, **palomitas chicas** and **credencial**. The learner’s questions use usted forms with Iván.

### Maple Harbor • English with Lithuanian help

```ts
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

const title = { en: "Two for the Seven O’Clock Show", lt: "Du bilietai į septintos valandos seansą" };
const topic = { en: "At the box office", lt: "Prie kino kasos" };
const goal = "Nusipirk du bilietus į septintos valandos seansą ir pasirink vietas greta.";
const intro = "Su draugu atėjai į muziejaus kino salę. Šio vakaro filmukas prasideda septintą.";
const label = {
  order: "Paprašyk dviejų bilietų",
  show: "Pasirink septintos valandos seansą",
  seat: "Pasirink dvi vietas greta",
  fare: "Pasirink bilietų kainą",
  id: "Atsakyk, ar turi studento pažymėjimą",
  snack: "Užsisakyk spragėsių arba jų atsisakyk",
  pay: "Susimokėk už bilietus",
};

const lines = {
  hello: [t("Hi! | What | can | I | get | you?", "Sveiki! | Ką | galiu | aš | pasiūlyti | Jums?", "Sveiki! Ką galėčiau Jums pasiūlyti?")],
  ask_show: [t("Which | show | would | you | like?", "Kurio | seanso | — | Jūs | norėtumėte?", "Į kurį seansą norėtumėte eiti?")],
  ask_seat: [t("In | the | middle | or | in | the | back?", "— | — | Viduryje | ar | — | — | gale?", "Viduryje ar gale?")],
  ask_fare: [t("Two | regular | tickets?", "Du | įprasti | bilietai?", "Du bilietai už visą kainą?")],
  ask_id: [t("Sure. | Do | you | have | your | student | ID?", "Žinoma. | Ar | Jūs | turite | savo | studento | pažymėjimą?", "Žinoma. Ar turite studento pažymėjimą?")],
  no_id: [t("That's | okay. | Two | regular | tickets, | then.", "Tai | nieko. | Du | įprasti | bilietai | tuomet.", "Nieko tokio. Tuomet abu bilietai už visą kainą.")],
  ask_snack: [t("Would | you | like | some | popcorn?", "— | Jūs | norėtumėte | šiek tiek | spragėsių?", "Gal norėtumėte spragėsių?")],
  total_regular: [t("That'll be | sixteen | dollars.", "Bus | šešiolika | dolerių.", "Iš viso šešiolika dolerių.")],
  total_regular_snack: [t("That'll be | nineteen | dollars.", "Bus | devyniolika | dolerių.", "Iš viso devyniolika dolerių.")],
  total_student: [t("That'll be | fourteen | dollars.", "Bus | keturiolika | dolerių.", "Iš viso keturiolika dolerių.")],
  total_student_snack: [t("That'll be | seventeen | dollars.", "Bus | septyniolika | dolerių.", "Iš viso septyniolika dolerių.")],
  tickets: [t("Here | are | your | tickets. | Enjoy | the | show!", "Štai | — | Jūsų | bilietai. | Mėgaukitės | — | seansu!", "Štai Jūsų bilietai. Smagaus seanso!")],
};

const hints = {
  order: { lt: label.order, items: [
    { id: "pair_show", s: t("Two | tickets | for | the | seven | o'clock | show, | please.", "Du | bilietus | į | — | septintos | valandos | seansą, | prašau.", "Du bilietus į septintos valandos seansą, prašau.") },
    { id: "pair", s: t("Two | tickets, | please.", "Du | bilietus, | prašau.", "Du bilietus, prašau.") },
  ] },
  show: { lt: label.show, items: [
    { id: "seven", s: t("The | seven | o'clock | show, | please.", "— | Septintos | valandos | seansą, | prašau.", "Į septintos valandos seansą, prašau.") },
  ] },
  seat: { lt: label.seat, items: [
    { id: "middle", s: t("Could | we | sit | together | in | the | middle?", "Ar galėtume | mes | sėdėti | kartu | — | — | viduryje?", "Ar galėtume sėdėti kartu viduryje?") },
    { id: "back", s: t("Two | seats | together | in | the | back, | please.", "Dvi | vietas | greta | — | — | gale, | prašau.", "Dvi vietas greta salės gale, prašau.") },
  ] },
  fare: { lt: label.fare, items: [
    { id: "regular", s: t("Yes, | two | regular | tickets.", "Taip, | du | įprasti | bilietai.", "Taip, abu bilietai už visą kainą.") },
    { id: "student", s: t("Do | you | have | a | student | discount?", "Ar | Jūs | taikote | — | studentų | nuolaidą?", "Ar taikote nuolaidą studentams?") },
  ] },
  id: { lt: label.id, items: [
    { id: "proof", s: t("Here's | my | student | ID.", "Štai | mano | studento | pažymėjimas.", "Štai mano studento pažymėjimas.") },
    { id: "forgot", s: t("I | left | it | at home.", "Aš | palikau | jį | namie.", "Palikau jį namie.") },
  ] },
  snack: { lt: label.snack, items: [
    { id: "popcorn", s: t("One | small | popcorn, | please.", "Vieną | mažą | spragėsių porciją, | prašau.", "Vieną mažą porciją spragėsių, prašau.") },
    { id: "plain", s: t("Just | the | tickets, | thanks.", "Tik | — | bilietus, | ačiū.", "Tik bilietus, ačiū.") },
  ] },
  pay: { lt: label.pay, items: [
    { id: "card", s: t("I'll | pay | by | card.", "Aš | sumokėsiu | — | kortele.", "Mokėsiu kortele.") },
    { id: "cash", s: t("Cash, | please.", "Grynaisiais, | prašau.", "Grynaisiais, prašau.") },
  ] },
};

const intents = {
  pair_show: { patterns: ["[can i get] two tickets for the seven [o'clock] show [please] #h:pair_show"] },
  pair: { patterns: ["[can i get] two tickets [please] #h:pair"] },
  seven: { patterns: ["[the] seven [o'clock] [show] [please] #h:seven"] },
  middle: { patterns: ["([could we sit together] in the middle | middle seats) [please] #h:middle"] },
  back: { patterns: ["[two seats together] in the back [please] #h:back"] },
  regular: { patterns: ["[yes] two regular tickets #h:regular"] },
  student: { patterns: ["(do you have a student discount | is there a student discount) #h:student"] },
  proof: { patterns: ["(here's my student id | here is my student id | here it is) #h:proof"] },
  forgot: { patterns: ["(i left it at home | i forgot it) #h:forgot"] },
  popcorn: { patterns: ["[one] small popcorn [please] #h:popcorn"] },
  plain: { patterns: ["just the tickets [thanks] #h:plain"] },
  card: { patterns: ["(i will pay by card | card [please]) #h:card"] },
  cash: { patterns: ["cash [please] #h:cash"] },
};
```

### Puerto Colibrí • Mexican Spanish with English help

```ts
import type { Ctx, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";

const title = { en: "Dos para la función de las siete", lt: "Two for the Seven O’Clock Show" };
const topic = { en: "En la taquilla del cine", lt: "At the box office" };
const goal = "Buy two tickets for the seven o’clock show and choose seats together.";
const intro = "You and a friend are at the museum theater. Tonight’s short starts at seven.";
const label = {
  order: "Ask for two tickets",
  show: "Choose the seven o’clock show",
  seat: "Choose seats together",
  fare: "Choose a fare",
  id: "Answer about your student ID",
  snack: "Order popcorn or skip it",
  pay: "Pay for your tickets",
};

const lines = {
  hello: [t("¡Buenas tardes! | ¿Qué | le | doy?", "Good afternoon! | What | for you | shall I get?", "Good afternoon! What can I get you?")],
  ask_show: [t("¿Para | cuál | función?", "For | which | show?", "Which show would you like?")],
  ask_seat: [t("¿En | medio | o | hasta | atrás?", "In | the middle | or | all the way | in back?", "In the middle or in the back?")],
  ask_fare: [t("¿Los | dos | a | precio | normal?", "The | two | at | price | regular?", "Both at the regular price?")],
  ask_id: [t("Claro. | ¿Trae | su | credencial | de | estudiante?", "Of course. | Do you have with you | your | ID | of | student?", "Sure. Do you have your student ID?")],
  no_id: [t("Está | bien. | Entonces | serían | dos | boletos | a | precio | normal.", "That's | fine. | Then | that would be | two | tickets | at | price | regular.", "That's okay. Two regular tickets, then.")],
  ask_snack: [t("¿Le | pongo | unas | palomitas?", "For you | shall I add | some | popcorn?", "Would you like some popcorn?")],
  total_regular: [t("Son | ciento veinte | pesos.", "That comes to | one hundred twenty | pesos.", "That comes to one hundred twenty pesos.")],
  total_regular_snack: [t("Son | ciento cincuenta | pesos.", "That comes to | one hundred fifty | pesos.", "That comes to one hundred fifty pesos.")],
  total_student: [t("Son | ciento cinco | pesos.", "That comes to | one hundred five | pesos.", "That comes to one hundred five pesos.")],
  total_student_snack: [t("Son | ciento treinta y cinco | pesos.", "That comes to | one hundred thirty-five | pesos.", "That comes to one hundred thirty-five pesos.")],
  tickets: [t("Aquí | tiene | sus | boletos. | ¡Que | disfrute | la | función!", "Here | you have | your | tickets. | May | you enjoy | the | show!", "Here are your tickets. Enjoy the show!")],
};

const hints = {
  order: { lt: label.order, items: [
    { id: "pair_show", s: t("¿Me | da | dos | boletos | para | la | función | de | las siete?", "To me | would you give | two | tickets | for | the | show | at | seven?", "Could I get two tickets for the seven o'clock show?") },
    { id: "pair", s: t("Dos | boletos, | por favor.", "Two | tickets, | please.", "Two tickets, please.") },
  ] },
  show: { lt: label.show, items: [
    { id: "seven", s: t("Para | la | de | las siete, | por favor.", "For | the one | at | seven, | please.", "The seven o'clock show, please.") },
  ] },
  seat: { lt: label.seat, items: [
    { id: "middle", s: t("¿Nos | puede | dar | dos | asientos | juntos | en | medio?", "Us | could you | give | two | seats | together | in | the middle?", "Could you give us two seats together in the middle?") },
    { id: "back", s: t("Dos | asientos | juntos | atrás, | por favor.", "Two | seats | together | in back, | please.", "Two seats together in the back, please.") },
  ] },
  fare: { lt: label.fare, items: [
    { id: "regular", s: t("Sí, | los | dos | a | precio | normal.", "Yes, | the | two | at | price | regular.", "Yes, both at the regular price.") },
    { id: "student", s: t("¿Tiene | descuento | para | estudiantes?", "Do you have | a discount | for | students?", "Do you have a student discount?") },
  ] },
  id: { lt: label.id, items: [
    { id: "proof", s: t("Aquí | tiene | mi | credencial.", "Here | you have | my | ID.", "Here's my student ID.") },
    { id: "forgot", s: t("La | dejé | en | casa.", "It | I left | at | home.", "I left it at home.") },
  ] },
  snack: { lt: label.snack, items: [
    { id: "popcorn", s: t("Unas | palomitas | chicas, | por favor.", "Some | popcorn | small, | please.", "One small popcorn, please.") },
    { id: "plain", s: t("Nada más | los | boletos, | gracias.", "Just | the | tickets, | thanks.", "Just the tickets, thanks.") },
  ] },
  pay: { lt: label.pay, items: [
    { id: "card", s: t("Pago | con | tarjeta.", "I'll pay | with | a card.", "I'll pay by card.") },
    { id: "cash", s: t("En | efectivo, | por favor.", "In | cash, | please.", "Cash, please.") },
  ] },
};

const intents = {
  pair_show: { patterns: ["[me da] dos boletos para la función de las siete [por favor] #h:pair_show"] },
  pair: { patterns: ["[me da] dos boletos [por favor] #h:pair"] },
  seven: { patterns: ["[para] [la de] las siete [por favor] #h:seven"] },
  middle: { patterns: ["([nos puede dar dos asientos juntos] en medio | en el centro) [por favor] #h:middle"] },
  back: { patterns: ["[dos asientos juntos] atrás [por favor] #h:back"] },
  regular: { patterns: ["[sí] los dos a precio normal #h:regular"] },
  student: { patterns: ["(tiene descuento para estudiantes | hay descuento de estudiante) #h:student"] },
  proof: { patterns: ["(aquí tiene mi credencial | aquí está mi credencial | aquí tiene) #h:proof"] },
  forgot: { patterns: ["(la dejé en casa | se me olvidó) #h:forgot"] },
  popcorn: { patterns: ["[unas] palomitas chicas [por favor] #h:popcorn"] },
  plain: { patterns: ["nada más los boletos [gracias] #h:plain"] },
  card: { patterns: ["[pago] con tarjeta #h:card"] },
  cash: { patterns: ["en efectivo [por favor] #h:cash"] },
};
```

### Shared conversation and route simulations

```ts
const ask = (key: keyof typeof lines) => (c: Ctx) => c.say(key);
const guide = (hint: keyof typeof hints) => [{ lt: label[hint], hint }];
const totalKey = (c: Ctx) =>
  c.s.discount ? (c.s.popcorn ? "total_student_snack" : "total_student")
               : (c.s.popcorn ? "total_regular_snack" : "total_regular");
const example = (id: string) => Object.values(hints).flatMap(g => g.items)
  .find(item => item.id === id)!.s.en.split(" | ").join(" ");

export const boxOffice: SituationDef = {
  id: "x09-box-office", bonus: true, optionalVoice: true, song: "", songTitle: "",
  chapter: 9, order: 16, location: "museum", npc: "ben", mode: "talk",
  title, topic, goal, intro, lines, hints, intents,
  mission: [
    { step: "show", lt: label.show }, { step: "seat", lt: label.seat },
    { step: "snack", lt: label.snack }, { step: "pay", lt: label.pay },
  ],
  start() {},
  steps: [
    { id: "order", done: c => c.s.count === 2, ask: ask("hello"),
      expects: ["pair_show", "pair"], suggest: guide("order") },
    { id: "show", done: c => !!c.s.seven, ask: ask("ask_show"),
      expects: ["seven", "pair_show"], suggest: guide("show") },
    { id: "seat", done: c => !!c.s.seat, ask: ask("ask_seat"),
      expects: ["middle", "back"], suggest: guide("seat") },
    { id: "fare", done: c => !!c.s.fare, ask: ask("ask_fare"),
      expects: ["regular", "student"], suggest: guide("fare"), yes: c => { c.s.fare = "regular"; } },
    { id: "id", when: c => c.s.fare === "student", done: c => c.s.discount !== undefined,
      ask: ask("ask_id"), expects: ["proof", "forgot"], suggest: guide("id"),
      no: c => { c.s.discount = false; c.say("no_id"); } },
    { id: "snack", done: c => c.s.popcorn !== undefined, ask: ask("ask_snack"),
      expects: ["popcorn", "plain"], suggest: guide("snack"),
      yes: c => { c.s.popcorn = true; }, no: c => { c.s.popcorn = false; } },
    { id: "pay", done: c => !!c.s.method, ask: c => c.say(totalKey(c)),
      expects: ["card", "cash"], suggest: guide("pay") },
  ],
  handlers: {
    pair_show(c) { c.s.count = 2; c.s.seven = true; }, pair(c) { c.s.count = 2; },
    seven(c) { c.s.seven = true; },
    middle(c) { c.s.seat = "middle"; }, back(c) { c.s.seat = "back"; },
    regular(c) { c.s.fare = "regular"; c.s.discount = false; },
    student(c) { c.s.fare = "student"; c.s.discount = undefined; },
    proof(c) { if (c.step === "id") c.s.discount = true; },
    forgot(c) { if (c.step === "id") { c.s.discount = false; c.say("no_id"); } },
    popcorn(c) { c.s.popcorn = true; }, plain(c) { c.s.popcorn = false; },
    card(c) { if (c.step === "pay") c.s.method = "card"; },
    cash(c) { if (c.step === "pay") c.s.method = "cash"; },
  },
  finish(c) { c.say("tickets"); c.complete(); c.end(); },
  sims: [
    { name: "regular pair in the back", turns: ["pair_show", "back", "regular", "plain", "cash"].map(example),
      expect: { complete: true, state: { seat: "back", method: "cash", popcorn: false } } },
    { name: "student with ID and popcorn", turns: ["pair", "seven", "middle", "student", "proof", "popcorn", "card"].map(example),
      expect: { complete: true, state: { seat: "middle", discount: true, popcorn: true } } },
    { name: "forgotten ID", turns: ["pair_show", "middle", "student", "forgot", "popcorn", "card"].map(example),
      expect: { complete: true, state: { discount: false, popcorn: true } } },
    { name: "student skips the snack", turns: ["pair_show", "back", "student", "proof", "plain", "cash"].map(example),
      expect: { complete: true, state: { discount: true, popcorn: false } } },
  ],
};
```

### Puerto Colibrí • Lithuanian helper table

The SM table uses the same Spanish audio and the same composite keys as `src/editions/es-lt/tables/s67a-tickets.json`.

```json
{
  "sent": {
    "¡Buenas tardes! | ¿Qué | le | doy?␟Good afternoon! | What | for you | shall I get?␟Good afternoon! What can I get you?": {
      "gloss": "Laba diena! | Ką | Jums | paduoti?",
      "nat": "Laba diena! Ką Jums paduoti?"
    },
    "¿Para | cuál | función?␟For | which | show?␟Which show would you like?": {
      "gloss": "Į | kurį | seansą?",
      "nat": "Į kurį seansą?"
    },
    "¿En | medio | o | hasta | atrás?␟In | the middle | or | all the way | in back?␟In the middle or in the back?": {
      "gloss": "— | Viduryje | ar | pačiame | gale?",
      "nat": "Viduryje ar gale?"
    },
    "¿Los | dos | a | precio | normal?␟The | two | at | price | regular?␟Both at the regular price?": {
      "gloss": "— | Abu | už | kainą | įprastą?",
      "nat": "Abu už įprastą kainą?"
    },
    "Claro. | ¿Trae | su | credencial | de | estudiante?␟Of course. | Do you have with you | your | ID | of | student?␟Sure. Do you have your student ID?": {
      "gloss": "Žinoma. | Ar turite | savo | pažymėjimą | — | studento?",
      "nat": "Žinoma. Ar turite studento pažymėjimą?"
    },
    "Está | bien. | Entonces | serían | dos | boletos | a | precio | normal.␟That's | fine. | Then | that would be | two | tickets | at | price | regular.␟That's okay. Two regular tickets, then.": {
      "gloss": "Viskas | gerai. | Tuomet | būtų | du | bilietai | už | kainą | įprastą.",
      "nat": "Nieko tokio. Tuomet abu bilietai už visą kainą."
    },
    "¿Le | pongo | unas | palomitas?␟For you | shall I add | some | popcorn?␟Would you like some popcorn?": {
      "gloss": "Jums | įdėti | šiek tiek | spragėsių?",
      "nat": "Gal norėtumėte spragėsių?"
    },
    "Son | ciento veinte | pesos.␟That comes to | one hundred twenty | pesos.␟That comes to one hundred twenty pesos.": {
      "gloss": "Iš viso | šimtas dvidešimt | pesų.",
      "nat": "Iš viso šimtas dvidešimt pesų."
    },
    "Son | ciento cincuenta | pesos.␟That comes to | one hundred fifty | pesos.␟That comes to one hundred fifty pesos.": {
      "gloss": "Iš viso | šimtas penkiasdešimt | pesų.",
      "nat": "Iš viso šimtas penkiasdešimt pesų."
    },
    "Son | ciento cinco | pesos.␟That comes to | one hundred five | pesos.␟That comes to one hundred five pesos.": {
      "gloss": "Iš viso | šimtas penki | pesai.",
      "nat": "Iš viso šimtas penki pesai."
    },
    "Son | ciento treinta y cinco | pesos.␟That comes to | one hundred thirty-five | pesos.␟That comes to one hundred thirty-five pesos.": {
      "gloss": "Iš viso | šimtas trisdešimt penki | pesai.",
      "nat": "Iš viso šimtas trisdešimt penki pesai."
    },
    "Aquí | tiene | sus | boletos. | ¡Que | disfrute | la | función!␟Here | you have | your | tickets. | May | you enjoy | the | show!␟Here are your tickets. Enjoy the show!": {
      "gloss": "Štai | prašom | Jūsų | bilietai. | Lai | Jus džiugina | — | seansas!",
      "nat": "Štai Jūsų bilietai. Smagaus seanso!"
    },
    "¿Me | da | dos | boletos | para | la | función | de | las siete?␟To me | would you give | two | tickets | for | the | show | at | seven?␟Could I get two tickets for the seven o'clock show?": {
      "gloss": "Man | duotumėte | du | bilietus | į | — | seansą | — | septintą?",
      "nat": "Ar duotumėte man du bilietus į septintos valandos seansą?"
    },
    "Dos | boletos, | por favor.␟Two | tickets, | please.␟Two tickets, please.": {
      "gloss": "Du | bilietus, | prašau.",
      "nat": "Du bilietus, prašau."
    },
    "Para | la | de | las siete, | por favor.␟For | the one | at | seven, | please.␟The seven o'clock show, please.": {
      "gloss": "Į | tą | — | septintos valandos, | prašau.",
      "nat": "Į septintos valandos seansą, prašau."
    },
    "¿Nos | puede | dar | dos | asientos | juntos | en | medio?␟Us | could you | give | two | seats | together | in | the middle?␟Could you give us two seats together in the middle?": {
      "gloss": "Mums | galėtumėte | duoti | dvi | vietas | greta | — | viduryje?",
      "nat": "Ar galėtumėte mums duoti dvi vietas greta salės viduryje?"
    },
    "Dos | asientos | juntos | atrás, | por favor.␟Two | seats | together | in back, | please.␟Two seats together in the back, please.": {
      "gloss": "Dvi | vietas | greta | gale, | prašau.",
      "nat": "Dvi vietas greta salės gale, prašau."
    },
    "Sí, | los | dos | a | precio | normal.␟Yes, | the | two | at | price | regular.␟Yes, both at the regular price.": {
      "gloss": "Taip, | — | abu | už | kainą | įprastą.",
      "nat": "Taip, abu bilietai už visą kainą."
    },
    "¿Tiene | descuento | para | estudiantes?␟Do you have | a discount | for | students?␟Do you have a student discount?": {
      "gloss": "Ar taikote | nuolaidą | — | studentams?",
      "nat": "Ar taikote nuolaidą studentams?"
    },
    "Aquí | tiene | mi | credencial.␟Here | you have | my | ID.␟Here's my student ID.": {
      "gloss": "Štai | prašom | mano | pažymėjimas.",
      "nat": "Štai mano pažymėjimas."
    },
    "La | dejé | en | casa.␟It | I left | at | home.␟I left it at home.": {
      "gloss": "Jį | palikau | — | namie.",
      "nat": "Palikau jį namie."
    },
    "Unas | palomitas | chicas, | por favor.␟Some | popcorn | small, | please.␟One small popcorn, please.": {
      "gloss": "Porciją | spragėsių | mažą, | prašau.",
      "nat": "Vieną mažą porciją spragėsių, prašau."
    },
    "Nada más | los | boletos, | gracias.␟Just | the | tickets, | thanks.␟Just the tickets, thanks.": {
      "gloss": "Tik | — | bilietus, | ačiū.",
      "nat": "Tik bilietus, ačiū."
    },
    "Pago | con | tarjeta.␟I'll pay | with | a card.␟I'll pay by card.": {
      "gloss": "Mokėsiu | — | kortele.",
      "nat": "Mokėsiu kortele."
    },
    "En | efectivo, | por favor.␟In | cash, | please.␟Cash, please.": {
      "gloss": "— | Grynaisiais, | prašau.",
      "nat": "Grynaisiais, prašau."
    }
  },
  "entity": {},
  "text": {
    "Two for the Seven O’Clock Show": "Du bilietai į septintos valandos seansą",
    "At the box office": "Prie kino kasos",
    "Buy two tickets for the seven o’clock show and choose seats together.": "Nusipirk du bilietus į septintos valandos seansą ir pasirink vietas greta.",
    "You and a friend are at the museum theater. Tonight’s short starts at seven.": "Su draugu atėjai į muziejaus kino salę. Šio vakaro filmukas prasideda septintą.",
    "Ask for two tickets": "Paprašyk dviejų bilietų",
    "Choose the seven o’clock show": "Pasirink septintos valandos seansą",
    "Choose seats together": "Pasirink dvi vietas greta",
    "Choose a fare": "Pasirink bilietų kainą",
    "Answer about your student ID": "Atsakyk, ar turi studento pažymėjimą",
    "Order popcorn or skip it": "Užsisakyk spragėsių arba jų atsisakyk",
    "Pay for your tickets": "Susimokėk už bilietus"
  }
}
```

## Recording list

The list covers every distinct seller line and every voiced learner hint, including all four fixed totals. A helper translation, button or title card has no voice take. Speed is 1.00 for Ben, Iván and the example voices. A single Spanish take serves both helper languages.

### Maple Harbor

| Line / hint ID | Spoken text | Recording disposition |
| --- | --- | --- |
| `hello` | Hi! What can I get you? | TODO Ben |
| `ask_show` | Which show would you like? | TODO Ben |
| `ask_seat` | In the middle or in the back? | TODO Ben |
| `ask_fare` | Two regular tickets? | TODO Ben |
| `ask_id` | Sure. Do you have your student ID? | TODO Ben |
| `no_id` | That's okay. Two regular tickets, then. | TODO Ben |
| `ask_snack` | Would you like some popcorn? | TODO Ben |
| `total_regular` | That'll be sixteen dollars. | TODO Ben |
| `total_regular_snack` | That'll be nineteen dollars. | TODO Ben |
| `total_student` | That'll be fourteen dollars. | TODO Ben |
| `total_student_snack` | That'll be seventeen dollars. | TODO Ben |
| `tickets` | Here are your tickets. Enjoy the show! | TODO Ben |
| `pair_show` | Two tickets for the seven o'clock show, please. | TODO female coach, male coach |
| `pair` | Two tickets, please. | reuse female coach `09a116b64e42`, male coach `3feac8ab7319` |
| `seven` | The seven o'clock show, please. | TODO female coach, male coach |
| `middle` | Could we sit together in the middle? | TODO female coach, male coach |
| `back` | Two seats together in the back, please. | TODO female coach, male coach |
| `regular` | Yes, two regular tickets. | TODO female coach, male coach |
| `student` | Do you have a student discount? | TODO female coach, male coach |
| `proof` | Here's my student ID. | reuse female coach `4c421a2d7112`, male coach `a767a22a2381` |
| `forgot` | I left it at home. | TODO female coach, male coach |
| `popcorn` | One small popcorn, please. | TODO female coach, male coach |
| `plain` | Just the tickets, thanks. | TODO female coach, male coach |
| `card` | I'll pay by card. | TODO female coach, male coach |
| `cash` | Cash, please. | reuse female coach `270c0ce41aba`, male coach `db97713be992` |

### Puerto Colibrí

| Line / hint ID | Spoken text | Recording disposition |
| --- | --- | --- |
| `hello` | ¡Buenas tardes! ¿Qué le doy? | TODO Iván |
| `ask_show` | ¿Para cuál función? | TODO Iván |
| `ask_seat` | ¿En medio o hasta atrás? | TODO Iván |
| `ask_fare` | ¿Los dos a precio normal? | TODO Iván |
| `ask_id` | Claro. ¿Trae su credencial de estudiante? | TODO Iván |
| `no_id` | Está bien. Entonces serían dos boletos a precio normal. | TODO Iván |
| `ask_snack` | ¿Le pongo unas palomitas? | TODO Iván |
| `total_regular` | Son ciento veinte pesos. | TODO Iván |
| `total_regular_snack` | Son ciento cincuenta pesos. | TODO Iván |
| `total_student` | Son ciento cinco pesos. | TODO Iván |
| `total_student_snack` | Son ciento treinta y cinco pesos. | TODO Iván |
| `tickets` | Aquí tiene sus boletos. ¡Que disfrute la función! | TODO Iván |
| `pair_show` | ¿Me da dos boletos para la función de las siete? | TODO female coach, male coach |
| `pair` | Dos boletos, por favor. | reuse female coach `c630bd05851a`, male coach `10bbef5a4575` |
| `seven` | Para la de las siete, por favor. | TODO female coach, male coach |
| `middle` | ¿Nos puede dar dos asientos juntos en medio? | TODO female coach, male coach |
| `back` | Dos asientos juntos atrás, por favor. | TODO female coach, male coach |
| `regular` | Sí, los dos a precio normal. | TODO female coach, male coach |
| `student` | ¿Tiene descuento para estudiantes? | TODO female coach, male coach |
| `proof` | Aquí tiene mi credencial. | TODO female coach, male coach |
| `forgot` | La dejé en casa. | TODO female coach, male coach |
| `popcorn` | Unas palomitas chicas, por favor. | TODO female coach, male coach |
| `plain` | Nada más los boletos, gracias. | TODO female coach, male coach |
| `card` | Pago con tarjeta. | reuse female coach `e923d03606c0`, male coach `51475a910982` |
| `cash` | En efectivo, por favor. | reuse female coach `e922701791b9`, male coach `209b3298187e` |

Checked with `src/audio-key.ts` against MH `public/audio-v2/manifest.json` and `plans8/pc:public/audio-es/manifest.json`. Missing takes stay text-only pending editorial review.
