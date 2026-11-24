import { ent, t } from "../dsl";
import { SURF_LINES } from "../surf-lines";
import type { Ctx, SituationDef, Suggestion } from "../types";

export const SURF_RATE: Readonly<Record<string, number>> = {
  board: 2000, paddle: 2500, kayak: 2500, kayak2: 3500, snorkel: 1500,
};
export const SURF_HOURS = [1, 2, 3] as const;
export const SURF_LESSON = 6000;
export const SURF_DEPOSIT = 5000;
export const SURF_LATE = 1000;

const KAYAK = "baidarė/baidarės/baidarei/baidarę/baidare/baidarėje";
const GEAR = [
  ent("board", "surfboard", "banglentė/banglentės/banglentei/banglentę/banglente/banglentėje", "f",
    { forms: ["board", "surf board", "surfboards"] }),
  ent("paddle", "paddleboard", "irklentė/irklentės/irklentei/irklentę/irklente/irklentėje", "f",
    { forms: ["paddle", "paddle board", "sup", "paddleboards"] }),
  ent("kayak", "single | kayak", `vienvietė/vienvietės/vienvietei/vienvietę/vienviete/vienvietėje | ${KAYAK}`, "f",
    { forms: ["kayak", "single", "one person kayak"] }),
  ent("kayak2", "double | kayak", `dvivietė/dvivietės/dvivietei/dvivietę/dviviete/dvivietėje | ${KAYAK}`, "f",
    { forms: ["double", "tandem", "tandem kayak", "two person kayak", "kayak for two"] }),
  ent("snorkel", "snorkel | kit", "paviršinio nardymo | rinkinys/rinkinio/rinkiniui/rinkinį/rinkiniu/rinkinyje", "m",
    { forms: ["snorkel", "snorkeling gear", "snorkel gear", "snorkeling kit"] }),
];
const DOCS = [
  ent("id", "ID", "asmens dokumentas/asmens dokumento/asmens dokumentui/asmens dokumentą/asmens dokumentu/asmens dokumente", "m",
    { art: "an", forms: ["identification", "id card"] }),
  ent("passport", "passport", "pasas/paso/pasui/pasą/pasu/pase", "m"),
  ent("license", "driver's | license", "vairuotojo | pažymėjimas/pažymėjimo/pažymėjimui/pažymėjimą/pažymėjimu/pažymėjime", "m",
    { forms: ["license", "drivers license", "driving license"] }),
];

const GEAR_IDS = GEAR.map((gear) => gear.id);
const subtotals = (hours: number) => [...new Set(Object.values(SURF_RATE).map((rate) => rate * hours))];
const rentalTotals = () => [...new Set(SURF_HOURS.flatMap((hours) => subtotals(hours)))];
const checkoutTotals = () => [...new Set([...rentalTotals(), ...rentalTotals().map((total) => total + SURF_DEPOSIT), SURF_LESSON])];

const intents: SituationDef["intents"] = {
  want_rent: { patterns: [
    "@want to rent {gear} #h:r_want", "can i rent {gear} #h:r_me", "i will take {gear} #h:r_take",
    "[@det] {gear} #h:r_please", "[@det] {gear} for {n:number} (hour | hours) #h:r_hours",
    "(@want to | can i) rent {gear} for {n:number} (hour | hours)",
    "(@want to | can i) rent (something | gear | equipment)", "(@want | can i get) {gear}", "i am here to rent",
  ] },
  gear_no: { patterns: ["(not | no) {gear}", "i do not want {gear}", "i do not want to rent {gear}"] },
  want_lesson: { patterns: [
    "(@want | can i book | can i take) @lesson #h:l_want", "@lesson",
    "i want to learn to surf #h:l_learn", "(do you | do you also) (teach | give | offer) [surf] (lessons | classes)",
  ] },
  lesson_no: { patterns: ["i do not want @lesson", "no (lesson | lessons)", "i will skip @lesson"] },
  surf_yes: { patterns: [
    "i already surf #h:s_yes", "i surf [often | a lot | every week]", "i surf all the time",
    "i have been surfing for (years | {n:number} years)", "i have surfed for years",
    "i am (an experienced surfer | an advanced surfer | a regular surfer)",
  ] },
  surf_some: { patterns: [
    "i have surfed a couple of times #h:l_some", "i surfed a couple of times #h:l_some",
    "i have surfed (a few times | a little | (once | twice) | before)", "i surfed (a few times | once | twice)",
    "i have tried (surfing | it) [before]", "i surf (sometimes | a little)", "i am a beginner",
  ] },
  surf_none: { patterns: [
    "(it | this) is my first time #h:l_first", "i have never surfed [before]", "i have not surfed [before]",
    "i do not surf", "i have never tried surfing", "i am new to surfing",
  ] },
  surf_none_ctx: { patterns: ["[no] never #h:ex_never", "not yet", "first time"] },
  just_looking: { patterns: ["[i am] just (looking | browsing)", "just checking the prices", "nothing yet"] },
  hours: { patterns: ["[for] {n:number} (hour | hours) #h:h_n", "just one hour #h:h_one"] },
  hours_ctx: { patterns: ["[for] {n:number}"] },
  hours_half_ctx: { patterns: [
    "[for] half [an] hour", "[for] (an | {n:number}) [hour | hours] and a half [hour | hours]",
    "[for] {n:number} (minutes | minute)", "[for] ninety minutes",
  ] },
  hours_long_ctx: { patterns: ["[for] all day", "[for] the whole day", "[for] the rest of the day"] },
  id_give: { patterns: ["@hand [my | an | the] {doc} #h:dp_id", "i will leave [my | an | the] {doc}", "(my | an) {doc}"] },
  dep_give: { patterns: [
    "i will leave the deposit #h:dp_dep", "i will (leave | pay | give you) (a | the) deposit",
    "(i can | let me) leave (a | the) deposit", "the deposit", "i will leave {price:price} [as a deposit]",
  ] },
  no_id: { patterns: [
    "i do not have [my | any | an] {doc} [on me] #h:dp_noid", "i (forgot | left) [my | the] {doc} [at the hotel | at home]",
    "no {doc}",
  ] },
  no_id_ctx: { patterns: ["i do not have it", "i left it at the hotel", "i forgot it", "i do not have it i left it at the hotel"] },
  no_dep: { patterns: ["no deposit", "i (can not | will not) pay [the | a] deposit", "i do not want to leave [a | the] deposit"] },
  ask_deposit: { patterns: ["how much is [the | a] deposit", "do i need (an id | a deposit)", "is there a deposit", "can i leave an id instead"] },
  dep_back_q: { patterns: ["do i get it back #h:dp_back", "do i get (my | the) (deposit | id | passport) back", "is (it | the deposit) refundable"] },
  two_people: { patterns: ["[it is] for two [people]", "there are two of us", "(@want | i want to rent) (a kayak | something) for two [people]"] },
  ask_two: { patterns: ["do you have (a kayak | something) for two [people]", "how much is a kayak for two"] },
  pay_cash: { patterns: [
    "(cash | in cash) #h:p_cash", "i will pay (cash | in cash)", "actually cash #h:pc_cash",
  ] },
  pay_card: { patterns: [
    "(by | with [a | my]) card #h:p_card", "i will pay (by | with [a | my]) card [then] #h:pc_then",
    "(great | perfect) by card [then] #h:pc_ok", "by card then #h:pc_ok",
    "@hand my card #h:pc_here", "i will use my card",
  ] },
  ask_card: { patterns: [
    "do you take cards #h:p_askcard #tip:surf_card", "do you accept (cards | credit cards)",
    "(can | could) i pay (by card | with [a | my] card)", "can i use my card", "is card okay",
  ] },
  hand_over: { patterns: ["@hand #h:p_here", "@hand [the] (cash | money)", "@hand {price:price}", "{price:price} in cash"] },
  no_cash: { patterns: ["i do not have [any] cash", "i have no cash", "no cash", "i only have (a card | my card)"] },
  ask_atm: { patterns: ["where is (an | the) atm #h:p_atm", "is there an atm [nearby]", "where can i get cash"] },
  atm_go: { patterns: ["i will go to the atm", "i will get [some] cash", "i will be right back"] },
  back_ctx: { patterns: ["i am back", "i got [the | some] cash", "i am back with cash"] },
  ask_price: { patterns: [
    "how much is it per hour #h:q_price", "how much [is it | does it cost | do i owe | is the total]",
    "how much (is | for) {gear} [per hour]", "how much does {gear} cost", "(what is | tell me) the price [of {gear}]",
  ] },
  ask_lesson_price: { patterns: ["how much (is | for) @lesson", "how much does @lesson cost", "what is the price of @lesson"] },
  ask_included: { patterns: ["what is included #h:q_incl", "what is included (with | in) ({gear} | @lesson)", "what (comes with | do i get with) ({gear} | @lesson)"] },
  ask_vest: { patterns: ["do i have to wear a life jacket #h:q_vest", "do i need a life jacket", "is a life jacket included"] },
  ask_hours: { patterns: ["what time do you close #h:q_hours", "when do you (open | close)", "what time do you open", "what are your hours", "when is the last rental"] },
  ask_current: { patterns: ["is there a current #h:q_current", "is it safe [here]", "is it dangerous here", "how strong is the current"] },
  ask_reef: { patterns: ["where are the rocks #h:q_reef", "where is the (pier | lighthouse | reef)", "what should i look out for"] },
  ask_late: { patterns: ["what if i come back late #h:q_late", "what if i am late", "is there a late fee"] },
  ask_waves: { patterns: ["how are the waves #h:q_waves", "how are the waves today", "what is the water like today", "how big are the waves"] },
  ask_big: { patterns: ["are there big waves [here | today]", "are the waves big [today]", "where are the big waves"] },
  ask_hard: { patterns: ["is it hard #h:lq_hard", "is (surfing | the lesson) (hard | difficult)"] },
  ask_deep: { patterns: ["is it deep #h:lq_deep", "how deep is the water", "is the water deep"] },
  ask_fall: { patterns: ["what if i fall #h:lq_fall", "what do i do if i fall", "what happens if i fall"] },
  ask_sharks: { patterns: ["are there sharks #h:lq_sharks", "are there any sharks", "what about sharks"] },
  swim: { patterns: ["i am not a very good swimmer #h:lq_swim", "i can not swim [well]", "i am not a good swimmer"] },
  ask_from: { patterns: ["where are you from", "where did you learn [to surf]", "did you grow up here"] },
  ask_name: { patterns: ["what is your name", "who are you"] },
  lesson_yes_ctx: { patterns: ["i will take it", "i will take the lesson", "i would like to book it", "i am in"] },
  brief_ok_ctx: { patterns: ["[yes] i am with you #h:lq_ok", "[yes] got it #h:fl_clear", "all clear", "i follow", "i understand", "i am ready"] },
  no_more_ctx: { patterns: ["[no] none #h:rd_none", "no [more] questions", "no i am ready", "let us go in the water #h:rd_go"] },
  one_q_ctx: { patterns: ["[yes] [i have] (one | a) question", "i have another question"] },
  pe_when: { patterns: ["when is the best time to go #h:pe_when", "when do you go [there | to pine point]", "when should i go [to pine point]"] },
  pe_where: { patterns: ["which beach do you recommend #h:pe_where", "where are the smaller waves [at pine point]", "where do you surf at pine point"] },
  pe_stay: { patterns: ["where should i stay #h:pe_stay", "where do you stay [there | at pine point]", "are there cabins [there]"] },
  pe_how: { patterns: ["how do i get there #h:pe_how", "how do i get to pine point", "how do you get (there | to pine point)"] },
  pe_safe: { patterns: ["is it dangerous there #h:pe_safe", "is it dangerous", "is it safe (there | at pine point)", "is pine point safe"] },
  been_yes_ctx: { patterns: ["[yes] i have been [there | to pine point]", "i have been there before"] },
  been_no_ctx: { patterns: ["[no] i have never been [there | to pine point]", "[no] i have not been [there | to pine point]", "never been"] },
  invite_yes_ctx: { patterns: ["(yes | sure) let us go #h:iv_yes", "let us go #h:iv_yes", "sure #h:iv_sure", "[yes] let us try [a wave]", "i would love to"] },
  invite_no_ctx: { patterns: ["maybe another day #h:iv_no", "not today", "not now", "maybe later", "another day", "tomorrow", "no thanks", "i do not want to surf"] },
};

const PAY = ["pay_cash", "pay_card", "ask_card", "hand_over", "no_cash", "ask_atm", "atm_go", "back_ctx", "ask_price"];
const LESSON_QUESTIONS = ["ask_hard", "ask_deep", "ask_fall", "ask_sharks", "swim"];
const PINE_QUESTIONS = ["pe_when", "pe_where", "pe_stay", "pe_how", "pe_safe"];
const GO = { lt: "Sutikite arba atidėkite kitai dienai", hint: "go" };
const ASK = { lt: "Paklauskite apie kainas ar jūrą", hint: "ask" };
const RENT = { lt: "Pasirinkite įrangą", hint: "rent", options: GEAR_IDS };
const LESSON_Q = { lt: "Paklauskite apie pamoką", hint: "lessonq" };
const SECURITY = { lt: "Palikite asmens dokumentą arba užstatą", hint: "deposit" };
const FOLLOW = { lt: "Pasakykite, ar aišku", hint: "follow" };
const SOCIAL = { lt: "Padėkokite arba atsisveikinkite", hint: "g_social" };

const surf: SituationDef = {
  id: "x04-surf",
  title: { en: "Want to Try a Wave?", lt: "Norite pagauti bangą?" },
  topic: { en: "Gear Rental and Surf Lessons", lt: "Įrangos nuoma ir banglenčių pamokos" },
  goal: "Išsinuomokite įrangą arba susitarkite dėl banglenčių pamokos. Paklauskite kainos, tada atsakykite į Maren kvietimą pagauti bangą.",
  intro: "Vakariniame paplūdimyje stovi nedidelė kedro medienos pašiūrė „Harbor Surf“. Čia užaugusi Maren Pike nuomoja įrangą ir moko čiuožti banglente. Lentoje – maždaug dviejų pėdų bangos, silpnas vėjas ir atoslūgis. Kainos nurodytos doleriais.",
  song: "", songTitle: "", chapter: 9, order: 11,
  bonus: true, optionalVoice: true, mode: "talk", location: "harbor-surf", npc: "maren",
  entities: { gear: GEAR, doc: DOCS },
  grammar: { macros: {
    want: "(i want | i would like | i need)",
    lesson: "([a | the] [surf | surfing] (lesson | class))",
    hand: "(here you go | here you are | here it is | here is | this is)",
  } },
  intents,
  domains: {
    price: () => [...new Set([...Object.values(SURF_RATE), SURF_LESSON, SURF_LATE])],
    amount: () => [SURF_RATE.paddle],
    fare: () => [SURF_RATE.snorkel],
    deposit: () => [SURF_DEPOSIT],
    total: checkoutTotals,
  },
  lines: {
    ...SURF_LINES,
    greet: [
      t("Hi! | Welcome | to | Harbor Surf. | What | brings | you | in?", "Sveiki! | Sveiki atvykę | į | „Harbor Surf“. | Kas | atvedė | Jus | čia?", "Sveiki atvykę į „Harbor Surf“! Kuo galiu padėti?"),
      t("Hi! | Here | to | rent | or | take | a | lesson?", "Sveiki! | Čia | — | išsinuomoti | ar | lankyti | — | pamoką?", "Sveiki! Norite ką nors išsinuomoti ar pasimokyti čiuožti banglente?"),
    ],
    what_again: [t("Would you | like | gear | or | a | lesson?", "Ar Jūs | norėtumėte | įrangos | ar | — | pamokos?", "Norėtumėte įrangos ar pamokos?")],
    what_short: [t("Take your time.", "Neskubėkite.", "Neskubėkite.")],
    what_rent: [t("Would you | like | to | rent | something?", "Ar Jūs | norėtumėte | — | išsinuomoti | ką nors?", "Gal norėtumėte ką nors išsinuomoti?")],
    looking_ok: [t("Sure. | The | prices | are | on | the | chalkboard.", "Žinoma. | — | kainos | yra | ant | — | lentos.", "Žinoma. Kainas rasite ant lentos.")],
    gear_ask: [t("We | have | surfboards, | paddleboards, | kayaks, | and | snorkel | gear.", "Mes | turime | banglenčių, | irklenčių, | baidarių | ir | paviršinio nardymo | įrangos.", "Turime banglenčių, irklenčių, baidarių ir paviršinio nardymo įrangos.")],
    gear_which: [t("Which | one | would you | like?", "Kurios | — | Jūs | norėtumėte?", "Ką norėtumėte išsinuomoti?")],
    price_hour: [t("{X.the} | costs | {$price} | per | hour.", "{X.the:nom} | kainuoja | {$price} | už | valandą.", "{X:nom} kainuoja {$price} už valandą.")],
    price_list: [t("A | surfboard | is | {$price} | per | hour. | A | paddleboard | or | a | single | kayak | is | {$amount}. | A | snorkel | kit | is | {$fare}.", "— | banglentė | kainuoja | {$price} | už | valandą. | — | irklentė | arba | — | vienvietė | baidarė | kainuoja | {$amount}. | — | paviršinio nardymo | rinkinys | kainuoja | {$fare}.", "Banglentė kainuoja {$price} už valandą. Irklentė arba vienvietė baidarė – {$amount}. Paviršinio nardymo rinkinys – {$fare}.")],
    two_double: [t("For | two, | the | double | kayak | is | {$price} | per | hour.", "Dviem | žmonėms, | — | dvivietė | baidarė | kainuoja | {$price} | už | valandą.", "Dvivietė baidarė kainuoja {$price} už valandą.")],
    hours_ask: [
      t("For | how | many | hours?", "— | kiek | — | valandų?", "Kelioms valandoms?"),
      t("How long | do you | need | it?", "Kiek laiko | Jums | reikia | jos?", "Kuriam laikui norite išsinuomoti?"),
    ],
    hours_reask: [t("One | hour, | two, | or | three?", "Vienai | valandai, | dviem | ar | trims?", "Vienai, dviem ar trims valandoms?")],
    hours_whole: [t("We | rent | by | the | full | hour.", "Mes | nuomojame | po | — | visą | valandą.", "Nuomojame tik pilnomis valandomis.")],
    hours_max: [t("Three | hours | at | most.", "Trys | valandos | — | daugiausia.", "Ilgiausiai – trims valandoms.")],
    hours_help: [t("You | can | start | with | one | hour.", "Jūs | galite | pradėti | nuo | vienos | valandos.", "Galite pradėti nuo vienos valandos.")],
    deposit_ask: [t("Please | leave | an | ID | or | a | {$deposit} | deposit.", "Prašau | palikite | — | dokumentą | arba | — | {$deposit} | užstatą.", "Prašau palikti asmens dokumentą arba {$deposit} užstatą.")],
    deposit_id_only: [t("Can you | leave | an | ID? | I'll | give | it | back.", "Ar galite | palikti | — | dokumentą? | Aš | atiduosiu | jį | atgal.", "Ar galite palikti asmens dokumentą? Kai grįšite, jį atgausite.")],
    deposit_one: [t("I | need | an | ID | or | a | deposit.", "Man | reikia | — | dokumento | arba | — | užstato.", "Reikės asmens dokumento arba užstato.")],
    deposit_which: [t("Which | works | for | you?", "Kuris | tinka | — | Jums?", "Kuris variantas Jums tinka?")],
    no_id_deposit: [t("You | can | leave | {$deposit} | instead. | You'll | get | it | back.", "Jūs | galite | palikti | {$deposit} | vietoj dokumento. | Jūs | gausite | juos | atgal.", "Galite palikti {$deposit} užstatą. Kai grąžinsite įrangą, jį atgausite.")],
    id_instead: [t("You | can | leave | an | ID | instead.", "Jūs | galite | palikti | — | dokumentą | vietoj užstato.", "Vietoj užstato galite palikti asmens dokumentą.")],
    id_ok: [t("Thanks. | I'll | return | it | when | you | come | back.", "Ačiū. | Aš | grąžinsiu | jį | kai | Jūs | ateisite | atgal.", "Ačiū. Kai sugrįšite, dokumentą atgausite.")],
    deposit_ok: [t("Okay. | I'll | add | the | deposit.", "Gerai. | Aš | pridėsiu | — | užstatą.", "Gerai. Užstatą pridėsiu prie nuomos kainos.")],
    deposit_info: [t("An | ID | or | {$deposit}. | You | get | either | back.", "— | dokumentas | arba | {$deposit}. | Jūs | gausite | bet kurį | atgal.", "Palikite asmens dokumentą arba {$deposit}. Grąžinus įrangą, užstatas ar dokumentas grįš Jums.")],
    dep_back: [t("Yes, | when | you | bring | the | gear | back.", "Taip, | kai | Jūs | atnešite | — | įrangą | atgal.", "Taip, atgausite, kai grąžinsite įrangą.")],
    no_deal: [t("We | need | an | ID | or | a | deposit | to | rent | gear.", "Mums | reikia | — | dokumento | arba | — | užstato | kad | išnuomotume | įrangą.", "Įrangai išsinuomoti reikia asmens dokumento arba užstato.")],
    total_one: [t("For | one | hour, | that's | {$total}.", "Už | vieną | valandą | išeina | {$total}.", "Už vieną valandą – {$total}.")],
    total_two: [t("For | two | hours, | that's | {$total}.", "Už | dvi | valandas | išeina | {$total}.", "Už dvi valandas – {$total}.")],
    total_three: [t("For | three | hours, | that's | {$total}.", "Už | tris | valandas | išeina | {$total}.", "Už tris valandas – {$total}.")],
    total_dep: [t("With | the | deposit, | it's | {$total} | total.", "Su | — | užstatu | yra | {$total} | iš viso.", "Su užstatu iš viso – {$total}.")],
    total_lesson: [t("The | lesson | costs | {$total}.", "— | pamoka | kainuoja | {$total}.", "Pamoka kainuoja {$total}.")],
    pay_how: [
      t("Cash | or | card?", "Grynaisiais | ar | kortele?", "Grynaisiais ar kortele?"),
      t("How | would you | like | to | pay?", "Kaip | Jūs | norėtumėte | — | mokėti?", "Kaip norėtumėte mokėti?"),
    ],
    pay_again: [t("Your | total | is | {$total}.", "Jūsų | bendra suma | yra | {$total}.", "Iš viso – {$total}.")],
    pay_confirm: [t("Ready | to | pay?", "{m:Pasiruošęs|f:Pasiruošusi} | — | mokėti?", "Ar jau norite sumokėti?")],
    card_yes: [t("Yes, | we | take | cards.", "Taip, | mes | priimame | korteles.", "Taip, galite mokėti kortele.")],
    no_signal: [t("The | card | reader | has no | signal. | Cash | only | today.", "— | kortelių | skaitytuvas | neturi | ryšio. | Grynieji | tik | šiandien.", "Kortelių skaitytuvas negaudo ryšio. Šiandien galima mokėti tik grynaisiais.")],
    no_signal_again: [t("Just | cash | today.", "Tik | grynaisiais | šiandien.", "Šiandien – tik grynaisiais.")],
    atm: [t("The | ATM | is | beside | Harbor Bank | on | Main Street.", "— | bankomatas | yra | šalia | „Harbor Bank“ | — | Main gatvėje.", "Bankomatas yra prie „Harbor Bank“, Main gatvėje.")],
    wait_here: [t("I'll | be | here.", "Aš | būsiu | čia.", "Palauksiu čia.")],
    welcome_back: [t("Welcome | back!", "Sveiki | sugrįžę!", "Sveiki sugrįžę!")],
    card_ok: [t("It | went through.", "Tai | pavyko.", "Mokėjimas pavyko.")],
    cash_ok: [t("Thanks!", "Ačiū!", "Ačiū!")],
    change: [t("Thanks. | Here's | your | change.", "Ačiū. | Štai | Jūsų | grąža.", "Ačiū. Štai Jūsų grąža.")],
    short: [t("The | total | is | {$total}. | I | need | a | little | more.", "— | visa suma | yra | {$total}. | Man | reikia | — | truputį | daugiau.", "Iš viso – {$total}. Dar šiek tiek trūksta.")],
    pay_first: [t("Let | me | give | you | the | total | first.", "Leiskite | man | pasakyti | Jums | — | visą sumą | pirma.", "Pirma pasakysiu visą sumą.")],
    paid_already: [t("You've | already | paid.", "Jūs | jau | sumokėjote.", "Jūs jau sumokėjote.")],
    hand_board: [t("Here's | your | board | and | leash.", "Štai | Jūsų | lenta | ir | saitas.", "Štai Jūsų banglentė su saitu.")],
    hand_paddle: [t("Here's | {X.the}, | a | paddle, | and | a | life jacket.", "Štai | {X.the:nom}, | — | irklas | ir | — | gelbėjimosi liemenė.", "Štai {X:nom}, irklas ir gelbėjimosi liemenė.")],
    hand_kayak2: [t("Here's | your | kayak, | two | paddles, | and | two | life jackets.", "Štai | jūsų | baidarė, | du | irklai | ir | dvi | gelbėjimosi liemenės.", "Štai jūsų baidarė, du irklai ir dvi gelbėjimosi liemenės.")],
    hand_snorkel: [t("Here's | your | mask, | snorkel, | and | fins.", "Štai | Jūsų | kaukė, | kvėpavimo vamzdelis | ir | plaukmenys.", "Štai Jūsų kaukė, kvėpavimo vamzdelis ir plaukmenys.")],
    safety_word: [
      t("Have fun! | Stay | inside | the | buoys.", "Smagiai praleiskite laiką! | Likite | tarp | — | plūdurų.", "Smagaus laiko! Laikykitės plūdurais pažymėtoje zonoje."),
      t("Enjoy | the | water! | Stay | in | the | marked | area.", "Smagiai praleiskite laiką | — | vandenyje! | Likite | — | — | pažymėtoje | zonoje.", "Smagaus laiko vandenyje! Likite pažymėtoje zonoje."),
    ],
    inc_board: [t("The | board | comes with | a | leash.", "— | lenta | duodama su | — | saitu.", "Prie banglentės duodame saitą.")],
    inc_paddle: [t("You | get | paddles | and | life jackets.", "Jūs | gausite | irklus | ir | gelbėjimosi liemenes.", "Irklai ir gelbėjimosi liemenės įskaičiuoti į kainą.")],
    inc_snorkel: [t("You | get | a | mask, | snorkel, | and | fins.", "Jūs | gausite | — | kaukę, | kvėpavimo vamzdelį | ir | plaukmenis.", "Gausite kaukę, kvėpavimo vamzdelį ir plaukmenis.")],
    inc_lesson: [t("A | soft | board | and | rash guard | come with | the | lesson.", "— | minkšta | lenta | ir | marškinėliai banglentėms | įskaičiuoti į | — | pamoką.", "Į pamokos kainą įskaičiuoti marškinėliai ir minkšta banglentė.", { flags: { 4: "A rash guard is a close-fitting shirt worn in the water." } })],
    inc_general: [t("Life jackets | are | available. | Paddles | come with | kayaks | and | paddleboards.", "Gelbėjimosi liemenės | yra | parūpintos. | Irklai | duodami su | baidarėmis | ir | irklentėmis.", "Turime gelbėjimosi liemenių. Prie baidarės ar irklentės duodame irklą.")],
    vest: [t("Yes, | wear | one | on | a | kayak | or | paddleboard.", "Taip, | vilkėkite | ją | — | — | baidarėje | ar | ant irklentės.", "Taip, baidarėje ir ant irklentės reikia vilkėti gelbėjimosi liemenę. Ją duosime.")],
    open_hours: [t("We | open | at | eight | AM | and | close | at | six | PM. | Last | rental | is | at | five.", "Mes | atidarome | — | aštuntą | ryto | ir | uždarome | — | šeštą | vakaro. | Paskutinė | nuoma | yra | — | penktą.", "Dirbame nuo aštuonių ryto iki šešių vakaro. Paskutinė nuoma – penktą vakaro.")],
    current: [t("The | current | is | light | today.", "— | srovė | yra | silpna | šiandien.", "Šiandien srovė silpna.")],
    safe_here: [t("Stay | inside | the | marked | area.", "Likite | viduje | — | pažymėtos | zonos.", "Neišplaukite iš pažymėtos zonos.")],
    reef: [t("See | the | pier? | The | rocks | are | by | the | lighthouse.", "Matote | — | prieplauką? | — | uolos | yra | prie | — | švyturio.", "Matote prieplauką? Uolos – prie švyturio.")],
    late: [t("Ten | minutes | is | fine. | After | that, | it's | {$price} | for | the | extra | half | hour.", "Dešimt | minučių | yra | gerai. | Po | to | kainuos | {$price} | už | — | papildomą | pusę | valandos.", "Galite vėluoti dešimt minučių. Vėliau už papildomą pusvalandį mokėsite {$price}.")],
    waves_today: [t("Waves | are | about | two | feet. | Light | wind, | low | tide.", "Bangos | yra | maždaug | dviejų | pėdų. | Silpnas | vėjas, | atoslūgis | —.", "Bangos maždaug dviejų pėdų. Vėjas silpnas, dabar atoslūgis.")],
    swim: [t("Tell | me | before | we | go | in. | Let's stay | near | shore.", "Pasakykite | man | prieš | mums | einant | į vandenį. | Likime | prie | kranto.", "Pasakykite man prieš lipdami į vandenį. Laikykimės prie kranto.")],
    nayeli_from: [t("I | grew up | in | Maple Harbor.", "Aš | užaugau | — | Maple Harbore.", "Užaugau Maple Harbore.")],
    nayeli_name: [t("I'm | Maren | Pike. | I | teach | surfing | here.", "Aš esu | Maren | Pike. | Aš | mokau | čiuožti banglente | čia.", "Aš – Maren Pike. Čia mokau čiuožti banglente.")],
    ok: [
      t("Okay!", "Gerai!", "Gerai!"),
      t("All right.", "Gerai.", "Gerai."),
    ],
    ack: [
      t("Great!", "Puiku!", "Puiku!"),
      t("Got it.", "Supratau.", "Supratau."),
    ],
    no_problem: [t("No problem.", "Nieko tokio.", "Nieko tokio.")],
    exp_ask: [t("Have you | ever | surfed?", "Ar Jūs | kada nors | čiuožėte banglente?", "Ar kada nors čiuožėte banglente?")],
    exp_none: [t("We | can | start | with | small | waves.", "Mes | galime | pradėti | nuo | mažų | bangų.", "Galime pradėti nuo mažų bangų.")],
    exp_some: [t("Great! | We | can | go over | the | basics.", "Puiku! | Mes | galime | pakartoti | — | pagrindus.", "Puiku! Galime pakartoti pagrindus.")],
    lesson_info: [t("A | one-hour | beginner | lesson | is | {$price}. | Soft | board | and | surf | shirt | included.", "— | vienos valandos | pradedančiųjų | pamoka | kainuoja | {$price}. | Minkšta | lenta | ir | banglenčių | marškinėliai | įskaičiuoti.", "Vienos valandos pamoka pradedantiesiems kainuoja {$price}. Minkšta banglentė ir marškinėliai įskaičiuoti.")],
    lesson_price_again: [t("It's | {$price} | for | an | hour, | gear | included.", "Kaina | {$price} | už | — | valandą, | įranga | įskaičiuota.", "Valanda su įranga kainuoja {$price}.")],
    dep_confirm: [t("Will you | leave | the | deposit?", "Ar Jūs | paliksite | — | užstatą?", "Ar paliksite užstatą?")],
    lesson_q: [t("Want | to | book | it?", "Norite | — | užsisakyti | ją?", "Norite užsisakyti pamoką?")],
    lesson_yes: [t("Great! | We | can | start | soon.", "Puiku! | Mes | galime | pradėti | netrukus.", "Puiku, netrukus galėsime pradėti.")],
    lesson_declined: [
      t("No problem.", "Jokių bėdų.", "Jokių bėdų."),
      t("Of course.", "Žinoma.", "Žinoma."),
    ],
    lesson_board_too: [t("The | lesson | already | includes | a | board.", "— | į pamoką | jau | įeina | — | lenta.", "Banglentė jau įskaičiuota į pamokos kainą.")],
    lesson_paid: [t("Put on | the | surf | shirt. | Let's go | to | the | sand.", "Apsivilkite | — | banglenčių | marškinėlius. | Eikime | ant | — | smėlio.", "Apsivilkite banglenčių marškinėlius ir eikime ant smėlio.")],
    board_1: [t("Nose | in | front, | tail | in | back, | fins | underneath.", "Priekis | — | priekyje, | galas | — | gale, | pelekai | apačioje.", "Čia lentos priekis, čia galas. Apačioje – pelekai.")],
    board_2: [t("The | leash | goes | on | your | back | ankle.", "— | saitas | segamas | ant | Jūsų | galinės | čiurnos.", "Saitą užsekite aplink tos kojos čiurną, kuri bus lentos gale.")],
    board_q: [t("With | me | so far?", "Su | manimi | kol kas?", "Ar kol kas aišku?")],
    paddle_1: [t("Lie | on | the | board. | Chest | up, | long | strokes.", "Atsigulkite | ant | — | lentos. | Krūtinė | aukštyn, | ilgi | mostai.", "Atsigulkite ant lentos. Kilstelėkite krūtinę, irkluokite ilgais mostais.")],
    stand_1: [t("Put | your | hands | by | your | chest. | Stand up | sideways.", "Padėkite | savo | rankas | prie | savo | krūtinės. | Atsistokite | šonu.", "Padėkite rankas abipus krūtinės ir atsistokite šonu.")],
    stand_2: [t("Bend | your | knees | and | look | ahead.", "Sulenkite | savo | kelius | ir | žiūrėkite | pirmyn.", "Sulenkite kelius ir žiūrėkite į priekį.")],
    moves_q: [t("Is | that | clear?", "Ar | tai | aišku?", "Ar aišku?")],
    safety_1: [t("Fall | away | from | the | board. | Cover | your | head.", "Kriskite | toliau | nuo | — | lentos. | Pridenkite | savo | galvą.", "Kriskite į šoną nuo lentos ir rankomis pridenkite galvą.")],
    safety_2: [t("Give | other | surfers | room.", "Duokite | kitiems | banglentininkams | erdvės.", "Palikite kitiems banglentininkams vietos.")],
    safety_q: [t("Any | questions?", "Kokių nors | klausimų?", "Ar turite klausimų?")],
    safety_more: [
      t("Anything | else?", "Kas nors | dar?", "Gal dar ko norite paklausti?"),
      t("Any | other | questions?", "Kokių nors | kitų | klausimų?", "Ar turite dar klausimų?"),
    ],
    tell_me: [t("Go ahead.", "Klauskite.", "Klauskite.")],
    simple_again: [t("The | nose | is | the | front | of | the | board.", "— | nosis | yra | — | priekis | — | — | lentos.", "Lentos nosis – jos priekinė dalis.")],
    hard: [t("We | start | on | the | sand. | One | move | at | a | time.", "Mes | pradedame | ant | — | smėlio. | Vienas | judesys | — | — | vienu metu.", "Pradėsime ant smėlio. Mokysimės po vieną judesį.")],
    deep: [t("For | the | first | lesson, | we | stay | near | shore.", "Per | — | pirmą | pamoką | mes | laikomės | prie | kranto.", "Per pirmą pamoką liksime prie kranto.")],
    fall: [t("Falls | happen. | When | you | come | up, | cover | your | head.", "Kritimų | pasitaiko. | Kai | Jūs | iškilsite | į paviršių, | pridenkite | savo | galvą.", "Kartais nukrisite. Iškildami į paviršių, prisidenkite galvą.")],
    sharks: [t("I | watch | the | water | and | check | local | warnings.", "Aš | stebiu | — | vandenį | ir | tikrinu | vietinius | įspėjimus.", "Stebiu vandenį ir seku vietos įspėjimus.")],
    adv_honest: [t("Our | bay | gets | small | waves.", "Mūsų | įlankoje | būna | mažų | bangų.", "Mūsų įlankoje bangos nedidelės.")],
    adv_pacific: [t("I | learned | here. | I | ride | bigger | waves | at | Pine Point.", "Aš | išmokau | čia. | Aš | čiuožiu | didesnėmis | bangomis | — | Pine Pointe.", "Išmokau čia. Didesnes bangas gaudau Pine Pointe.")],
    small_here: [t("The | waves | here | are | about | two | feet | today.", "— | bangos | čia | yra | maždaug | dviejų | pėdų | šiandien.", "Šiandien čia bangos maždaug dviejų pėdų.")],
    adv_no_lesson: [t("Let's skip | the | beginner | lesson.", "Praleiskime | — | pradedančiųjų | pamoką.", "Pradedančiųjų pamoką galime praleisti.")],
    pe_been_q: [t("Have you | been | to | Pine Point?", "Ar Jūs | buvote | — | Pine Pointe?", "Ar teko lankytis Pine Pointe?")],
    pe_been_yes: [t("Then | you | know | that | open | beach.", "Vadinasi, | Jūs | pažįstate | tą | atvirą | paplūdimį.", "Tada pažįstate tą atvirą paplūdimį.")],
    pe_been_no: [t("I | go | there | when | the | waves | are | bigger.", "Aš | važiuoju | ten | kai | — | bangos | yra | didesnės.", "Ten važiuoju, kai bangos didesnės.")],
    pe_when: [t("I | usually | go | in | late | summer.", "Aš | paprastai | važiuoju | — | vėlyvą | vasarą.", "Paprastai ten važiuoju vasaros pabaigoje.")],
    pe_where: [t("I | find | smaller | waves | at | the | south | end.", "Aš | randu | mažesnių | bangų | — | — | pietiniame | gale.", "Mažesnių bangų randu pietiniame paplūdimio gale.")],
    pe_stay: [t("I | stay | in | a | cabin | near | the | beach.", "Aš | apsistoju | — | — | namelyje | prie | — | paplūdimio.", "Apsistoju namelyje prie paplūdimio.")],
    pe_how: [t("I | drive | along | the | coast | road.", "Aš | važiuoju | — | — | pakrantės | keliu.", "Važiuoju pakrantės keliu.")],
    pe_safe: [t("The | coast | is | open | there. | I | teach | first | lessons | in | this | sheltered | bay.", "— | pakrantė | yra | atvira | ten. | Aš | vedu | pirmas | pamokas | — | šioje | apsaugotoje | įlankoje.", "Ten pakrantė atvira. Pirmas pamokas vedu čia, nuo didelių bangų apsaugotoje įlankoje.")],
    invite: [t("Want | to | try | a | wave?", "Norite | — | pabandyti | — | bangą?", "Norite pabandyti pagauti bangą?")],
    invite_again: [t("Ready | to | try | a | wave?", "{m:Pasiruošęs|f:Pasiruošusi} | — | pabandyti | — | bangą?", "Gal jau norite pabandyti pagauti bangą?")],
    invite_rent: [t("Before | you | go, | want | to | try | a | wave? | It's | free.", "Prieš | Jums | išeinant | norite | — | pabandyti | — | bangą? | Tai | nemokama.", "Prieš išeidami gal norite pagauti vieną bangą? Už ją mokėti nereikės.")],
    go_lend: [t("Let's go! | I'll | lend | you | a | soft | board.", "Eime! | Aš | paskolinsiu | Jums | — | minkštą | lentą.", "Eime! Paskolinsiu Jums minkštą lentą.")],
    boards_anytime: [t("The | boards | are | by | the | water. | Come back | anytime.", "— | lentos | yra | prie | — | vandens. | Sugrįžkite | bet kada.", "Lentos prie vandens. Sugrįžkite, kada norėsite.")],
    invite_adv: [t("Want | to | catch | a | wave | here? | This | one's | on me.", "Norite | — | pagauti | — | bangą | čia? | Šita | banga | mano sąskaita.", "Norite pagauti bangą čia? Už šitą mokėti nereikės.")],
    go: [t("Grab | your | board. | Let's go!", "Imkite | savo | lentą. | Eime!", "Imkite lentą. Eime!")],
    another_day: [t("Sure, | another | day.", "Žinoma, | kitą | dieną.", "Žinoma, gal kitą dieną.")],
    bye: [
      t("See you | in | the | water!", "Pasimatysime | — | — | vandenyje!", "Pasimatysime vandenyje!"),
      t("Take care!", "Iki pasimatymo!", "Iki pasimatymo!"),
    ],
  },
  hints: {
    rent: { lt: "Ką nors išsinuomoti", slot: "gear", examples: ["board", "paddle", "kayak", "kayak2", "snorkel"], items: [
      { id: "r_want", s: t("I'd like | to | rent | {X.np}.", "Norėčiau | — | išsinuomoti | {X.np:acc}.", "Norėčiau išsinuomoti {X:acc}.") },
      { id: "r_me", s: t("Can I | rent | {X.np}?", "Ar galiu | išsinuomoti | {X.np:acc}?", "Ar galiu išsinuomoti {X:acc}?") },
      { id: "r_take", s: t("I'll take | {X.np}.", "Imsiu | {X.np:acc}.", "Imsiu {X:acc}.") },
      { id: "r_please", s: t("{X.np}, | please.", "{X.np:acc}, | prašau.", "Prašyčiau {X:gen}.") },
      { id: "r_hours", s: t("{X.np} | for | two | hours, | please.", "{X.np:acc} | — | dviem | valandoms, | prašau.", "Prašyčiau {X:gen} dviem valandoms.") },
    ] },
    lesson: { lt: "Pasiteirauti dėl pamokos", items: [
      { id: "l_want", s: t("I'd like | a | surf | lesson.", "Norėčiau | — | banglenčių | pamokos.", "Norėčiau banglenčių pamokos.") },
      { id: "l_learn", s: t("I | want | to | learn | to | surf.", "Aš | noriu | — | išmokti | — | čiuožti banglente.", "Noriu išmokti čiuožti banglente.") },
      { id: "s_yes", s: t("I | already | surf.", "Aš | jau | čiuožiu banglente.", "Jau čiuožiu banglente.") },
    ] },
    exp: { lt: "Papasakoti, ar čiuožėte banglente", items: [
      { id: "l_first", s: t("It's | my | first | time.", "Tai | mano | pirmas | kartas.", "Man tai pirmas kartas.") },
      { id: "ex_never", s: t("No, | never.", "Ne, | niekada.", "Ne, niekada.") },
      { id: "l_some", s: t("I've | surfed | a couple of | times.", "Aš | čiuožiau banglente | porą | kartų.", "Porą kartų čiuožiau banglente.") },
    ] },
    ask: { lt: "Paklausti apie kainas ir jūrą", items: [
      { id: "q_price", s: t("How much | is | it | per | hour?", "Kiek | kainuoja | tai | už | valandą?", "Kiek kainuoja valanda?") },
      { id: "q_incl", s: t("What's | included?", "Kas | įskaičiuota?", "Kas įskaičiuota?") },
      { id: "q_vest", s: t("Do I | have to | wear | a | life jacket?", "Ar | turiu | vilkėti | — | gelbėjimosi liemenę?", "Ar reikia vilkėti gelbėjimosi liemenę?") },
      { id: "q_hours", s: t("What | time | do you | close?", "Kuriuo | laiku | Jūs | užsidarote?", "Kada uždarote?") },
      { id: "q_current", s: t("Is there | a | current?", "Ar yra | — | srovė?", "Ar čia yra srovė?") },
      { id: "q_reef", s: t("Where | are | the | rocks?", "Kur | yra | — | uolos?", "Kur uolos?") },
      { id: "q_late", s: t("What | if | I | come back | late?", "Kas | jei | aš | grįšiu | vėlai?", "O jei vėluosiu grąžinti įrangą?") },
      { id: "q_waves", s: t("How | are | the | waves?", "Kokios | yra | — | bangos?", "Kokios šiandien bangos?") },
    ] },
    hours: { lt: "Pasakyti, kuriam laikui nuomojatės", items: [
      { id: "h_n", s: t("For | two | hours.", "— | dviem | valandoms.", "Dviem valandoms.") },
      { id: "h_one", s: t("Just | one | hour.", "Tik | vienai | valandai.", "Tik vienai valandai.") },
    ] },
    deposit: { lt: "Sutarti dėl dokumento ar užstato", items: [
      { id: "dp_id", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
      { id: "dp_dep", s: t("I'll | leave | the | deposit.", "Aš | paliksiu | — | užstatą.", "Paliksiu užstatą.") },
      { id: "dp_noid", s: t("I | don't have | my | ID.", "Aš | neturiu | savo | dokumento.", "Neturiu su savimi asmens dokumento.") },
      { id: "dp_back", s: t("Do I | get | it | back?", "Ar | gausiu | jį | atgal?", "Ar jį atgausiu?") },
    ] },
    pay: { lt: "Paklausti, kaip mokėti, arba sumokėti", items: [
      { id: "p_cash", s: t("Cash, | please.", "Grynaisiais, | prašau.", "Mokėsiu grynaisiais.") },
      { id: "p_card", s: t("By | card.", "— | kortele.", "Kortele.") },
      { id: "p_askcard", s: t("Do you | take | cards?", "Ar Jūs | priimate | korteles?", "Ar galima mokėti kortele?") },
      { id: "p_here", s: t("Here you go.", "Prašom.", "Prašom.") },
      { id: "p_atm", s: t("Where's | an | ATM?", "Kur yra | — | bankomatas?", "Kur rasti bankomatą?") },
    ] },
    paycard: { lt: "Pasiūlyti mokėjimo būdą", items: [
      { id: "pc_ok", s: t("Great, | by | card | then.", "Puiku, | — | kortele | tada.", "Puiku, tada mokėsiu kortele.") },
      { id: "pc_then", s: t("I'll | pay | by | card, | then.", "Aš | mokėsiu | — | kortele | tada.", "Tada mokėsiu kortele.") },
      { id: "pc_here", s: t("Here's | my | card.", "Štai | mano | kortelė.", "Štai mano kortelė.") },
      { id: "pc_cash", s: t("Actually, | cash.", "Vis dėlto | grynaisiais.", "Vis dėlto mokėsiu grynaisiais.") },
    ] },
    lessonq: { lt: "Paklausti apie pamoką", items: [
      { id: "lq_hard", s: t("Is | it | hard?", "Ar | tai | sunku?", "Ar sunku?") },
      { id: "lq_deep", s: t("Is | it | deep?", "Ar | ten | gilu?", "Ar ten gilu?") },
      { id: "lq_fall", s: t("What | if | I | fall?", "Kas | jei | aš | nukrisiu?", "O jeigu nukrisiu?") },
      { id: "lq_sharks", s: t("Are there | sharks?", "Ar yra | ryklių?", "Ar čia būna ryklių?") },
      { id: "lq_swim", s: t("I'm | not | a | very | good | swimmer.", "Aš | ne | — | itin | {m:geras|f:gera} | {m:plaukikas|f:plaukikė}.", "Ne itin gerai plaukiu.") },
    ] },
    follow: { lt: "Pasakyti, kad supratote", items: [
      { id: "lq_ok", s: t("Yes, | I'm | with | you.", "Taip, | aš | su | Jumis.", "Taip, suprantu.") },
      { id: "fl_clear", s: t("Yes, | got it.", "Taip, | supratau.", "Taip, supratau.") },
    ] },
    ready: { lt: "Pasakyti, ar dar turite klausimų", items: [
      { id: "rd_none", s: t("No, | none.", "Ne, | jokių.", "Ne, neturiu klausimų.") },
      { id: "rd_go", s: t("Let's go | in | the | water!", "Eikime | į | — | vandenį!", "Eikime į vandenį!") },
    ] },
    pe: { lt: "Paklausti apie Pine Point", items: [
      { id: "pe_when", s: t("When's | the | best | time | to | go?", "Kada yra | — | geriausias | laikas | — | važiuoti?", "Kada geriausia važiuoti?") },
      { id: "pe_where", s: t("Which | beach | do you | recommend?", "Kurį | paplūdimį | Jūs | rekomenduojate?", "Kurį paplūdimį rekomenduojate?") },
      { id: "pe_stay", s: t("Where | should I | stay?", "Kur | man | apsistoti?", "Kur galėčiau apsistoti?") },
      { id: "pe_how", s: t("How | do I | get | there?", "Kaip | man | nuvažiuoti | ten?", "Kaip ten nuvažiuoti?") },
      { id: "pe_safe", s: t("Is | it | dangerous | there?", "Ar | — | pavojinga | ten?", "Ar ten pavojinga?") },
    ] },
    go: { lt: "Sutikti arba atidėti kitai dienai", items: [
      { id: "iv_yes", s: t("Yes, | let's go!", "Taip, | eime!", "Taip, eime!") },
      { id: "iv_sure", s: t("Sure.", "Žinoma.", "Žinoma.") },
      { id: "iv_no", s: t("Maybe | another | day.", "Gal | kitą | dieną.", "Gal kitą dieną.") },
    ] },
  },
  merges: {
    "a couple of": { reason: "lexical_expression", split: "The quantifier means porą.", minimal: "The article belongs to the quantifier." },
    "all right": { reason: "lexical_expression", split: "A two-word acknowledgment.", minimal: "Gerai translates the whole expression." },
    "are there": { reason: "grammatical_fusion", split: "Ar yra asks about existence.", minimal: "There is a dummy subject here." },
    "are you": { reason: "grammatical_fusion", split: "Ar and the polite subject or experiencer render the question.", minimal: "The English copula is not a separate word in the Lithuanian question." },
    "can i": { reason: "grammatical_fusion", split: "Ar galiu includes the first person in the verb.", minimal: "Lithuanian does not need a separate subject." },
    "can you": { reason: "grammatical_fusion", split: "Ar galite includes the polite subject.", minimal: "Lithuanian does not need a separate subject." },
    "come back": { reason: "lexical_expression", split: "The particle makes this a verb of return.", minimal: "Sugrįžti translates the verb and particle together." },
    "come with": { reason: "lexical_expression", split: "The gear is included in the price.", minimal: "With does not mark accompaniment here." },
    "comes with": { reason: "lexical_expression", split: "Says that an accessory is supplied with the board.", minimal: "Both words express the inclusion." },
    "didn't bend": { reason: "grammatical_fusion", split: "The tense, person, and negation are carried by nesulenkiau or nesulenkėte.", minimal: "The Lithuanian verb covers the auxiliary and main verb." },
    "didn't paddle": { reason: "grammatical_fusion", split: "The tense, person, and negation are carried by neirklavau or neirklavote.", minimal: "The Lithuanian verb covers the auxiliary and main verb." },
    "do i": { reason: "grammatical_fusion", split: "The actor is implicit in the Lithuanian verb or expressed by man.", minimal: "Do adds no separate action." },
    "do you": { reason: "grammatical_fusion", split: "The polite subject takes the place of the English subject and auxiliary.", minimal: "Do adds no separate action." },
    "don't have": { reason: "grammatical_fusion", split: "Neturiu carries the negation and possession.", minimal: "The Lithuanian negation is part of the verb." },
    "don't look": { reason: "grammatical_fusion", split: "Nežiūrėkite combines the negation and polite command.", minimal: "The negation attaches to the Lithuanian verb." },
    "go ahead": { reason: "lexical_expression", split: "An invitation to ask the question.", minimal: "Neither word describes motion here." },
    "go over": { reason: "lexical_expression", split: "The phrase means review.", minimal: "Pakartoti is a single verb." },
    "got away": { reason: "lexical_expression", split: "The wave escaped before it could be ridden.", minimal: "The particle changes the verb's sense." },
    "got it": { reason: "lexical_expression", split: "Acknowledges understanding.", minimal: "Supratau has no separate object." },
    "grew up": { reason: "lexical_expression", split: "Means becoming an adult.", minimal: "Užaugau conveys the verb and particle together." },
    "harbor bank": { reason: "lexical_expression", split: "The registered bank name.", minimal: "Both words identify the bank." },
    "harbor surf": { reason: "lexical_expression", split: "The school's name.", minimal: "Both words identify the school." },
    "has no": { reason: "grammatical_fusion", split: "Neturi carries possession and negation.", minimal: "Lithuanian expresses both in one verb." },
    "have fun": { reason: "lexical_expression", split: "A conventional wish for the outing.", minimal: "The verb and object form the wish together." },
    "have to": { reason: "grammatical_fusion", split: "Turiu expresses obligation here.", minimal: "To is part of the modal phrase." },
    "have you": { reason: "grammatical_fusion", split: "The Lithuanian verb carries tense, while the gloss retains the polite subject.", minimal: "Have is the English perfect auxiliary." },
    "here you go": { reason: "lexical_expression", split: "A phrase used when handing something over.", minimal: "Prašom translates the complete formula." },
    "how about": { reason: "lexical_expression", split: "Introduces another candidate wave.", minimal: "About is not a topic preposition here." },
    "how long": { reason: "lexical_expression", split: "Asks for the duration.", minimal: "Kiek laiko expresses a single question." },
    "how much": { reason: "lexical_expression", split: "Asks for the amount.", minimal: "Kiek renders both words." },
    "i'd like": { reason: "grammatical_fusion", split: "Norėčiau expresses the desire, person and conditional.", minimal: "The Lithuanian conditional combines them." },
    "i'll take": { reason: "grammatical_fusion", split: "Imsiu conveys the first-person future.", minimal: "The actor and tense are part of the verb." },
    "is there": { reason: "grammatical_fusion", split: "Ar yra asks about existence.", minimal: "There is a dummy subject here." },
    "let's go": { reason: "grammatical_fusion", split: "Eikime includes the invitation to move together.", minimal: "Lithuanian uses a single verb." },
    "let's skip": { reason: "grammatical_fusion", split: "Praleiskime includes the invitation to skip a step together.", minimal: "Lithuanian uses a single verb." },
    "let's stay": { reason: "grammatical_fusion", split: "Likime includes the invitation to stay together.", minimal: "Lithuanian uses a single verb." },
    "let's wait": { reason: "grammatical_fusion", split: "Palaukime includes the invitation to wait together.", minimal: "Lithuanian uses a single verb." },
    "life jacket": { reason: "lexical_expression", split: "The name of the flotation vest.", minimal: "The two words name one safety item." },
    "life jackets": { reason: "lexical_expression", split: "The plural name of the flotation vests.", minimal: "The two words name one type of safety item." },
    "main street": { reason: "lexical_expression", split: "The street's name.", minimal: "Both words identify the street." },
    "maple harbor": { reason: "lexical_expression", split: "The town's name.", minimal: "Both words identify the town." },
    "no problem": { reason: "lexical_expression", split: "A formula for accepting or reassuring.", minimal: "The pair functions as one social expression." },
    "of course": { reason: "lexical_expression", split: "The formula means žinoma.", minimal: "Course has no independent referent." },
    "on me": { reason: "lexical_expression", split: "Means the coach covers the cost.", minimal: "The preposition is part of the offer." },
    "pine point": { reason: "lexical_expression", split: "The beach's name.", minimal: "Both words identify the beach." },
    "put on": { reason: "lexical_expression", split: "The particle makes this a verb of dressing.", minimal: "Apsivilkite translates the verb and particle together." },
    "rash guard": { reason: "lexical_expression", split: "Names a shirt made for use in the water.", minimal: "Both words identify the garment." },
    "see you": { reason: "lexical_expression", split: "The farewell anticipates meeting again.", minimal: "Pasimatysime is reciprocal." },
    "should i": { reason: "grammatical_fusion", split: "The Lithuanian dative marks who would do the action.", minimal: "The English modal and subject work together here." },
    "so far": { reason: "lexical_expression", split: "Means up to this moment.", minimal: "Far does not describe distance here." },
    "stand up": { reason: "lexical_expression", split: "The particle marks rising to one's feet.", minimal: "Stotis expresses the full movement." },
    "take care": { reason: "lexical_expression", split: "A conventional farewell.", minimal: "Care does not name a task here." },
    "that's it": { reason: "lexical_expression", split: "Confirms a move is right.", minimal: "The demonstrative and pronoun function as one formula." },
    "well done": { reason: "lexical_expression", split: "Puikiai praises a completed action.", minimal: "The phrase is a single act of praise." },
    "went through": { reason: "lexical_expression", split: "Means the payment succeeded.", minimal: "The particle changes the meaning of went." },
    "will you": { reason: "grammatical_fusion", split: "Ar Jūs introduces a question whose future tense is on the main verb.", minimal: "The auxiliary and subject work together." },
    "would you": { reason: "grammatical_fusion", split: "The Lithuanian verb carries the conditional, with Ar Jūs or Jūs in the gloss.", minimal: "The modal has no separate verb meaning here." },
  },
  mission: [
    { step: "what", lt: "Pasakykite, ko ieškote" },
    { lt: "Pasirinkite įrangą arba pamoką", done: (c) => !!(c.s.gear || c.s.wantLesson || c.s.lessonNo || c.s.advanced),
      when: (c) => !c.s.noDeal, optional: true },
    { lt: "Sumokėkite už nuomą arba pamoką", done: (c) => (!c.s.wantRent || c.s.rentPaid) && (!c.s.lessonOk || c.s.lessonPaid),
      when: (c) => !!(c.s.wantRent || c.s.lessonOk), optional: true },
    { step: "invite", lt: "Atsakykite į kvietimą pagauti bangą", optional: true },
  ],
  steps: [
    {
      id: "what",
      done: (c) => !!(c.s.wantRent || c.s.wantLesson || c.s.lessonNo || c.s.advanced || c.s.noDeal),
      ask(c) {
        c.say(!c.s.opened ? "greet" : c.s.prompted ? "what_short" : "what_again");
        if (c.s.opened) c.s.prompted = true;
        c.s.opened = true;
      },
      expects: ["want_rent", "want_lesson", "surf_yes", "surf_none", "surf_some", "just_looking", "ask_price", "ask_lesson_price", "ask_waves", "ask_big", "two_people"],
      suggest: [RENT, { lt: "Pasiteiraukite dėl pamokos", hint: "lesson" }, ASK],
      yes(c) { c.say("what_again"); c.hold(); },
      no(c) { c.say("looking_ok"); c.hold(); },
      help: priceList,
    },
    {
      id: "gear",
      when: (c) => !!c.s.wantRent, done: (c) => !!c.s.gear,
      ask(c) { c.say(c.s.gearAsked ? "gear_which" : "gear_ask"); c.s.gearAsked = true; },
      expects: ["want_rent", "ask_price", "ask_included", "two_people", "gear_no", "want_lesson"],
      suggest: [RENT, ASK, { lt: "Pasiteiraukite dėl pamokos", hint: "lesson" }],
      yes(c) { c.say("gear_which"); c.hold(); },
      no(c) { c.say("gear_which"); c.hold(); },
      help: priceList,
    },
    {
      id: "hours",
      when: (c) => !!(c.s.wantRent && c.s.gear), done: (c) => !!c.s.hours,
      ask(c) { c.say(c.s.hoursAsked ? "hours_reask" : "hours_ask"); c.s.hoursAsked = true; },
      expects: ["hours", "hours_ctx", "hours_half_ctx", "hours_long_ctx", "want_rent", "ask_price", "ask_late", "ask_hours"],
      suggest: [{ lt: "Pasakykite, kelioms valandoms", hint: "hours" }],
      yes: reaskHours, no: reaskHours,
      help(c) { c.say("hours_help"); },
    },
    {
      id: "deposit",
      when: (c) => !!(c.s.wantRent && c.s.gear && c.s.hours), done: (c) => !!c.s.depositDone,
      ask(c) {
        c.say(c.s.depAsked ? "deposit_which" : c.s.idFirst ? "deposit_id_only" : "deposit_ask", { deposit: SURF_DEPOSIT });
        c.s.depAsked = true;
      },
      expects: ["id_give", "dep_give", "no_id", "no_id_ctx", "no_dep", "ask_deposit", "dep_back_q", "hand_over"],
      suggest: [SECURITY],
      yes(c) { c.say(c.s.idFirst ? "id_instead" : "deposit_which"); c.hold(); },
      no(c) { if (c.s.idFirst && !c.s.noId) noId(c); else refuseSecurity(c); },
    },
    {
      id: "rent_pay",
      when: (c) => !!(c.s.wantRent && c.s.depositDone), done: (c) => !!c.s.rentPaid,
      ask: (c) => askPay(c, "rent"),
      expects: [...PAY, "id_give", "dep_give"],
      suggest: paySuggest, yes: payYes, no: payAgain,
    },
    {
      id: "experience",
      when: (c) => !!c.s.wantLesson, done: (c) => !!c.s.exp,
      ask(c) { c.say("exp_ask"); },
      expects: ["surf_none", "surf_none_ctx", "surf_some", "surf_yes", "lesson_no"],
      suggest: [{ lt: "Pasakykite, ar jau bandėte čiuožti banglente", hint: "exp" }],
      yes: (c) => experience(c, "some"), no: (c) => experience(c, "none"),
    },
    {
      id: "lesson_offer",
      when: (c) => !!(c.s.wantLesson && c.s.exp && !c.s.advanced), done: (c) => !!c.s.lessonOk,
      ask(c) { if (!c.s.lessonPriceSaid) lessonPrice(c); c.say("lesson_q"); },
      expects: ["lesson_yes_ctx", "invite_yes_ctx", "want_lesson", "lesson_no", "invite_no_ctx", "ask_lesson_price", "ask_included", ...LESSON_QUESTIONS],
      suggest: [GO, LESSON_Q], yes: takeLesson, no: declineLesson,
    },
    {
      id: "lesson_pay",
      when: (c) => !!c.s.lessonOk, done: (c) => !!c.s.lessonPaid,
      ask: (c) => askPay(c, "lesson"),
      expects: [...PAY, "ask_lesson_price"],
      suggest: paySuggest, yes: payYes, no: payAgain,
    },
    {
      id: "board",
      when: (c) => !!c.s.lessonPaid, done: (c) => !!c.s.boardDone,
      ask(c) {
        if (!c.s.boardSaid) { c.say("board_1"); c.say("board_2"); c.s.boardSaid = true; }
        c.say("board_q");
      },
      expects: ["brief_ok_ctx", "ask_included", ...LESSON_QUESTIONS],
      suggest: [FOLLOW, LESSON_Q],
      yes: briefOk, no(c) { c.say("simple_again"); c.say("board_q"); c.hold(); },
      help(c) { c.say("simple_again"); },
    },
    {
      id: "moves",
      when: (c) => !!c.s.boardDone, done: (c) => !!c.s.movesDone,
      ask(c) {
        if (!c.s.movesSaid) { c.say("paddle_1"); c.say("stand_1"); c.say("stand_2"); c.s.movesSaid = true; }
        c.say("moves_q");
      },
      expects: ["brief_ok_ctx", ...LESSON_QUESTIONS],
      suggest: [FOLLOW, LESSON_Q],
      yes: briefOk, no(c) { c.say("stand_2"); c.say("moves_q"); c.hold(); },
      help(c) { c.say("paddle_1"); c.say("stand_2"); },
    },
    {
      id: "safety",
      when: (c) => !!c.s.movesDone, done: (c) => !!c.s.safetyDone,
      ask(c) {
        if (!c.s.safetySaid) {
          c.s.safetySaid = true;
          c.say("safety_1"); c.say("safety_2"); c.say("safety_q");
        } else c.say("safety_more");
      },
      expects: ["no_more_ctx", "one_q_ctx", "ask_current", "ask_waves", ...LESSON_QUESTIONS],
      suggest: [{ lt: "Pasakykite, ar dar turite klausimų", hint: "ready" }, LESSON_Q],
      yes: oneQuestion, no: safetyDone,
    },
    {
      id: "pe_been",
      when: (c) => !!c.s.advanced, done: (c) => !!c.s.peTalked,
      ask(c) { c.say("pe_been_q"); },
      expects: ["been_yes_ctx", "been_no_ctx", ...PINE_QUESTIONS],
      suggest: [{ lt: "Pasakykite, ar ten lankėtės", hint: "g_yesno" }, { lt: "Paklauskite apie Pine Point", hint: "pe" }],
      yes: (c) => been(c, true), no: (c) => been(c, false),
    },
    {
      id: "invite",
      when: (c) => !!(c.s.safetyDone || (c.s.advanced && c.s.peTalked) || renterInvite(c)),
      done: (c) => c.s.invited !== undefined,
      ask(c) {
        c.say(c.s.inviteAsked ? "invite_again" : c.s.advanced ? "invite_adv" : renterInvite(c) ? "invite_rent" : "invite");
        c.s.inviteAsked = true;
      },
      expects: ["invite_yes_ctx", "invite_no_ctx", "want_lesson", ...PINE_QUESTIONS],
      suggest: [GO],
      yes: goSurf, no: notToday,
    },
    {
      id: "closing",
      when: (c) => !!(c.s.rentPaid || c.s.lessonNo || c.s.safetyDone || c.s.advanced || c.s.noDeal),
      done: (c) => !!c.s.closed || !!c.s.surfing,
      ask: closeOffer,
      expects: ["g_thanks", "g_bye", "want_lesson", "want_rent", "two_people", "hand_over"],
      suggest: [SOCIAL],
      yes(c) {
        if (c.s.lessonNo && !c.s.rentPaid && !c.s.noDeal) { c.s.wantRent = true; return; }
        sayGoodbye(c);
      },
      no: sayGoodbye,
    },
  ],
  init(c) {
    c.s.noSignal = c.visits > 0 && c.chance(0.35);
    c.s.idFirst = c.visits > 0 && c.chance(0.4);
  },
  start(c) { c.ask("what"); },
  handlers: {
    want_rent(c, slots) {
      if (c.s.rentPaid) { c.say("paid_already"); return; }
      if (slots.gear === "board" && c.s.lessonOk && !c.s.lessonNo) { c.say("lesson_board_too"); c.hold(); return; }
      c.s.wantRent = true;
      c.s.noDeal = false;
      if (slots.gear) chooseGear(c, slots.gear);
      if (slots.n !== undefined) setHours(c, slots.n);
    },
    gear_no(c, slots) {
      if (c.s.rentPaid) { c.say("paid_already"); return; }
      if (c.s.gear === slots.gear) {
        delete c.s.gear;
        delete c.s.hours;
        c.s.rentTotalSaid = false;
      }
      c.say("ok");
    },
    want_lesson(c) {
      if (c.s.advanced) { c.say("adv_no_lesson"); return; }
      if (c.s.lessonPaid) { c.say("paid_already"); return; }
      if (c.step === "lesson_offer" && !/\b(do you|can you)\b/i.test(c.heard)) { takeLesson(c); return; }
      c.s.wantLesson = true;
      c.s.lessonNo = false;
      if (c.step === "closing" || c.step === "invite") {
        delete c.s.invited;
        c.s.inviteAsked = false;
      }
      if (c.s.gear === "board" && !c.s.rentPaid) c.say("lesson_board_too");
    },
    lesson_no: declineLesson,
    surf_yes: (c) => experience(c, "surfer"),
    surf_some: (c) => experience(c, "some"),
    surf_none: (c) => experience(c, "none"),
    surf_none_ctx: (c) => experience(c, "none"),
    just_looking(c) { c.say("looking_ok"); c.hold(); },
    hours: (c, slots) => setHours(c, slots.n),
    hours_ctx: (c, slots) => setHours(c, slots.n),
    hours_half_ctx: (c) => setHours(c, 0.5),
    hours_long_ctx: (c) => setHours(c, 4),
    id_give: (c, slots) => takeSecurity(c, slots.doc),
    dep_give: (c) => takeSecurity(c),
    no_id: noId,
    no_id_ctx: noId,
    no_dep(c) {
      if (c.step !== "deposit") return;
      c.s.noDep = true;
      if (c.s.noId) refuseSecurity(c);
      else { c.say("id_instead"); c.hold(); }
    },
    ask_deposit(c) { c.say("deposit_info", { deposit: SURF_DEPOSIT }); },
    dep_back_q(c) { c.say("dep_back"); },
    two_people(c) {
      if (c.s.rentPaid) { c.say("paid_already"); return; }
      c.s.wantRent = true;
      c.s.noDeal = false;
      chooseGear(c, "kayak2", "two_double");
    },
    ask_two(c) { c.say("two_double", { price: SURF_RATE.kayak2 }); },
    pay_cash(c) { if (/^(?:in )?cash\s*\?$/i.test(c.heard.trim())) payAgain(c); else pay(c, "cash"); },
    pay_card(c) { if (/^(?:by|with)\b[^.?!]*\?$/i.test(c.heard.trim())) askCard(c); else pay(c, "card"); },
    ask_card: askCard,
    hand_over(c, slots) {
      if (c.step === "deposit" && slots.price === undefined && !/\b(cash|money)\b/i.test(c.heard)) {
        takeSecurity(c, "id");
        return;
      }
      pay(c, "cash", slots.price);
    },
    no_cash(c) {
      if (c.s.noSignal) { c.twist("no_signal"); atm(c); c.say("wait_here"); }
      else if (payable(c)) { c.say("card_yes"); c.s.cardOk = true; }
      else atm(c);
      c.hold();
    },
    ask_atm: atm,
    atm_go(c) { c.s.atmAsked = true; c.say("wait_here"); c.hold(); },
    back_ctx(c) {
      if (c.s.atmAsked && payable(c)) { c.say("welcome_back"); c.s.back = true; }
      else c.say("ack");
    },
    ask_price(c, slots) {
      const gear = slots.gear;
      if (gear) { quoteGear(c, gear); return; }
      if (!/\bper hour\b/i.test(c.heard)) {
        const order = payable(c);
        if (order) { c.say("pay_again", { total: order === "rent" ? rentTotal(c) : SURF_LESSON }); c.hold(); return; }
      }
      if (c.s.wantLesson && !c.s.wantRent) lessonPrice(c);
      else if (c.s.gear) quoteGear(c, c.s.gear);
      else priceList(c);
    },
    ask_lesson_price: lessonPrice,
    ask_included(c, slots) {
      const lesson = /\b(lesson|class)\b/i.test(c.heard) ||
        (c.s.wantLesson && (!c.s.gear || c.s.rentPaid) && !slots.gear);
      const gear = slots.gear ?? c.s.gear;
      c.say(lesson ? "inc_lesson" : gear === "board" ? "inc_board" : gear === "snorkel" ? "inc_snorkel" : gear ? "inc_paddle" : "inc_general");
    },
    ask_vest: (c) => c.say("vest"),
    ask_hours: (c) => c.say("open_hours"),
    ask_current(c) {
      c.say(/\b(safe|dangerous)\b/i.test(c.heard) ? "safe_here" : "current");
    },
    ask_reef: (c) => c.say("reef"),
    ask_late: (c) => c.say("late", { price: SURF_LATE }),
    ask_waves: (c) => c.say("waves_today"),
    ask_big(c) {
      if (!c.s.advanced) c.say("small_here");
      if (!c.s.pineSaid) { c.say("adv_pacific"); c.s.pineSaid = true; }
    },
    ask_hard: (c) => c.say("hard"),
    ask_deep: (c) => c.say("deep"),
    ask_fall: (c) => c.say("fall"),
    ask_sharks: (c) => c.say("sharks"),
    swim: (c) => c.say("swim"),
    ask_from: (c) => c.say("nayeli_from"),
    ask_name: (c) => c.say("nayeli_name"),
    lesson_yes_ctx: (c) => { if (c.step === "lesson_offer") takeLesson(c); },
    brief_ok_ctx: briefOk,
    no_more_ctx: safetyDone,
    one_q_ctx: oneQuestion,
    pe_when: (c) => pineAnswer(c, "pe_when"),
    pe_where: (c) => pineAnswer(c, "pe_where"),
    pe_stay: (c) => pineAnswer(c, "pe_stay"),
    pe_how: (c) => pineAnswer(c, "pe_how"),
    pe_safe: (c) => pineAnswer(c, "pe_safe"),
    been_yes_ctx: (c) => been(c, true),
    been_no_ctx: (c) => been(c, false),
    invite_yes_ctx(c) {
      if (c.step === "invite") goSurf(c);
      else if (c.step === "lesson_offer") takeLesson(c);
    },
    invite_no_ctx(c) {
      if (c.step === "invite") notToday(c);
      else if (c.step === "lesson_offer" || c.step === "experience") declineLesson(c);
    },
    g_thanks(c) {
      if (c.step === "closing") { c.say("g_welcome"); close(c); }
      else { c.say("g_welcome"); c.hold(); }
    },
    g_bye: sayGoodbye,
  },
  finish: sayGoodbye,
  tests: [
    { say: "I'd like to rent a surfboard.", intent: "want_rent", slots: { gear: "board" }, step: "what" },
    { say: "Can I rent a snorkel kit?", intent: "want_rent", slots: { gear: "snorkel" }, step: "gear" },
    { say: "A surfboard, please.", intent: "want_rent", slots: { gear: "board" }, step: "gear" },
    { say: "I don't want a surfboard.", intent: "gear_no", slots: { gear: "board" }, step: "gear" },
    { say: "How much is a paddleboard?", intent: "ask_price", slots: { gear: "paddle" }, step: "what" },
    { say: "Do you have a kayak for two?", intent: "ask_two", step: "gear" },
    { say: "It's for two people.", intent: "two_people", step: "gear" },
    { say: "Two.", intent: "hours_ctx", slots: { n: 2 }, step: "hours" },
    { say: "Half an hour.", intent: "hours_half_ctx", step: "hours" },
    { say: "All day.", intent: "hours_long_ctx", step: "hours" },
    { say: "I've never surfed.", intent: "surf_none", step: "experience" },
    { say: "I don't surf.", intent: "surf_none", step: "experience" },
    { say: "I've surfed a couple of times.", intent: "surf_some", step: "experience" },
    { say: "I surf sometimes.", intent: "surf_some", step: "experience" },
    { say: "I surf.", intent: "surf_yes", step: "experience" },
    { say: "Never.", intent: "surf_none_ctx", step: "experience" },
    { say: "I don't have my ID.", intent: "no_id", slots: { doc: "id" }, step: "deposit" },
    { say: "I left it at the hotel.", intent: "no_id_ctx", step: "deposit" },
    { say: "No deposit.", intent: "no_dep", step: "deposit" },
    { say: "Can I leave an ID instead?", intent: "ask_deposit", step: "deposit" },
    { say: "Do you take cards?", intent: "ask_card", step: "rent_pay" },
    { say: "By card.", intent: "pay_card", step: "rent_pay" },
    { say: "I don't have cash.", intent: "no_cash", step: "rent_pay" },
    { say: "Here is fifty dollars.", intent: "hand_over", slots: { price: 5000 }, step: "rent_pay" },
    { say: "I don't want a lesson.", intent: "lesson_no", step: "lesson_offer" },
    { say: "What if I fall?", intent: "ask_fall", step: "board" },
    { say: "Is it dangerous there?", intent: "pe_safe", step: "pe_been" },
    { say: "Yes, let's go!", intent: "invite_yes_ctx", step: "invite" },
    { say: "Not today.", intent: "invite_no_ctx", step: "invite" },
    { say: "Let's go!", intent: "none", step: "deposit" },
  ],
  sims: [
    {
      name: "surfboard for two hours, passport, cash",
      turns: ["Hi! I want to rent a surfboard.", "For two hours.", "Here's my passport.", "In cash.", "Yes, let's go!"],
      expect: { state: { gear: "board", hours: 2, rentPaid: true, doc: "passport", invited: true, surfing: true, level: "beginner" } },
    },
    {
      name: "lesson questions and a first wave",
      setup: (s) => { s.noSignal = false; },
      turns: ["Hi! How much is a surf lesson?", "I'd like a lesson.", "No, I've never surfed.", "Is it hard?", "Yes, I'm in.", "By card.", "What if I fall?", "Yes, I'm with you.", "Is it deep?", "All clear.", "Are there sharks?", "No, none.", "Yes, let's go!"],
      expect: { state: { lessonPaid: true, invited: true, surfing: true, exp: "none", level: "beginner" } },
    },
    {
      name: "regular surfer, Pine Point questions, and a wave",
      turns: ["Hi! I've been surfing for years. Are there big waves?", "No, I've never been there.", "When's the best time to go?", "Which beach do you recommend?", "How do I get there?", "Is it dangerous there?", "Sure, let's go!"],
      expect: { state: { advanced: true, surfer: true, invited: true, surfing: true, level: "advanced" } },
    },
    {
      name: "kayak and cash after the reader loses signal",
      setup: (s) => { s.noSignal = true; s.idFirst = false; },
      turns: ["I'd like to rent a kayak.", "What's included?", "One hour.", "Here's my driver's license.", "By card.", "I don't have cash.", "I'm back. Here you go.", "Not today, thanks.", "Thanks."],
      expect: { state: { gear: "kayak", rentPaid: true, paidWith: "cash", invited: false, surfing: false, back: true } },
    },
    {
      name: "snorkel kit with a deposit in place of ID",
      setup: (s) => { s.idFirst = true; },
      turns: ["Can I rent a snorkel kit?", "Where are the rocks?", "Two hours.", "I don't have it. I left it at the hotel.", "Yes, that's fine.", "Here you go.", "Maybe another day.", "Goodbye."],
      expect: { state: { gear: "snorkel", deposit: true, rentPaid: true, noId: true, invited: false, surfing: false } },
    },
    {
      name: "short answers for a lesson, wave another day",
      turns: ["A lesson.", "Never.", "Yes.", "Cash.", "Yes.", "Yes.", "No.", "Tomorrow."],
      expect: { state: { lessonPaid: true, invited: false, surfing: false } },
    },
    {
      name: "questions first, paddleboard and a refresher in one visit",
      setup: (s) => { s.noSignal = false; },
      turns: ["What time do you close?", "I'm just looking.", "How much is a paddleboard?", "I'll take a paddleboard.", "Do I have to wear a life jacket?", "What if I come back late?", "One hour.", "I'll leave the deposit.", "Do you take cards?", "Great, by card then.", "Do you also teach lessons?", "I've surfed a couple of times.", "Yes, I'll take it.", "Here you go.", "I'm with you.", "Yes.", "No, I'm ready.", "Not today, thanks.", "Thanks."],
      expect: { state: { gear: "paddle", rentPaid: true, lessonPaid: true, exp: "some", deposit: true, invited: false, surfing: false } },
    },
    {
      name: "lesson first, then a two-person rental with change",
      setup: (s) => { s.noSignal = false; },
      turns: ["I want a surf lesson.", "This is my first time.", "Yes.", "Cash.", "Yes.", "Yes.", "No.", "Not today.", "There are two of us.", "Half an hour.", "Four hours.", "One hour.", "I'll leave the deposit.", "Here's my passport.", "Here is twenty dollars.", "Here is fifty dollars.", "Here is fifty dollars.", "Thanks."],
      expect: { state: { gear: "kayak2", rentPaid: true, lessonPaid: true, deposit: false, doc: "passport", rentChange: 1500, invited: false, surfing: false } },
    },
    {
      name: "refuses ID and deposit, leaves without paying",
      turns: ["I'd like to rent a kayak.", "One hour.", "I don't have my ID.", "Do I get it back?", "No deposit.", "Goodbye."],
      expect: { complete: false, state: { noDeal: true, noId: true, noDep: true, surfing: false } },
    },
    {
      name: "declines the lesson and keeps the boards available",
      turns: ["A lesson.", "No, never.", "Not today, thanks."],
      expect: { state: { lessonNo: true, surfing: false } },
    },
  ],
  tips: {
    surf_card: { key: "surf_card", lt: "Jei norite mokėti kortele, pasakykite, kaip mokėsite.", better: "By card, please." },
  },
};

type Order = "rent" | "lesson";
type Method = "cash" | "card";

function priceList(c: Ctx) {
  c.say("price_list", { price: SURF_RATE.board, amount: SURF_RATE.paddle, fare: SURF_RATE.snorkel });
  c.say("two_double", { price: SURF_RATE.kayak2 });
}

function quoteGear(c: Ctx, gear: string, line = "price_hour") {
  c.say(line, { X: gear, price: SURF_RATE[gear] });
  (c.s.quoted ??= {})[gear] = true;
}

function chooseGear(c: Ctx, gear: string, line?: string) {
  if (c.s.gear !== gear) c.s.rentTotalSaid = false;
  c.s.gear = gear;
  if (!c.s.quoted?.[gear]) quoteGear(c, gear, line);
}

function reaskHours(c: Ctx) {
  c.say("hours_reask");
  c.hold();
}

function setHours(c: Ctx, count: number) {
  if (c.s.rentPaid) { c.say("paid_already"); return; }
  if (!c.s.gear) { c.say("gear_which"); c.hold(); return; }
  if (!Number.isInteger(count) || count < 1 || count > 3) {
    c.say(count > 3 ? "hours_max" : "hours_whole");
    reaskHours(c);
    return;
  }
  if (count !== c.s.hours) c.s.rentTotalSaid = false;
  c.s.hours = count;
}

function takeSecurity(c: Ctx, doc?: string) {
  if (!c.s.wantRent || !c.s.hours || c.s.rentPaid || (c.step !== "deposit" && c.step !== "rent_pay")) {
    c.say("ack");
    return;
  }
  const deposit = !doc;
  if (c.s.depositDone && (c.s.doc === doc && c.s.deposit === deposit)) { c.say("ack"); return; }
  c.s.depositDone = true;
  c.s.deposit = deposit;
  c.s.doc = doc;
  c.s.rentTotalSaid = false;
  c.say(doc ? "id_ok" : "deposit_ok");
}

function noId(c: Ctx) {
  if (c.step !== "deposit") { c.say("ack"); return; }
  c.s.noId = true;
  c.twist("no_id");
  if (c.s.noDep) { refuseSecurity(c); return; }
  c.say("no_id_deposit", { deposit: SURF_DEPOSIT });
  c.say("dep_confirm");
  c.expect({
    id: "deposit_offer",
    expects: ["dep_give", "no_dep", "id_give", "ask_deposit", "dep_back_q", "hand_over"],
    suggest: [{ lt: "Sutikite arba atsisakykite", hint: "g_yesno" }, SECURITY],
    yes: (ctx) => takeSecurity(ctx),
    no: (ctx) => { ctx.s.noDep = true; refuseSecurity(ctx); },
    on: {
      dep_give: (ctx) => takeSecurity(ctx),
      no_dep: (ctx) => { ctx.s.noDep = true; refuseSecurity(ctx); },
      id_give: (ctx, slots) => takeSecurity(ctx, slots.doc),
      hand_over: (ctx, slots) => {
        if (slots.price !== undefined || /\b(cash|money)\b/i.test(ctx.heard)) return false;
        takeSecurity(ctx, "id");
      },
    },
    ask: (ctx) => ctx.say("dep_confirm"),
  });
}

function refuseSecurity(c: Ctx) {
  if (!c.s.oneAsked && !(c.s.noId && c.s.noDep)) {
    c.s.oneAsked = true;
    c.say("deposit_one");
    c.hold();
    return;
  }
  c.s.noDeal = true;
  c.s.surfing = false;
  c.s.wantRent = false;
  delete c.s.gear;
  delete c.s.hours;
  c.s.depositDone = false;
  c.s.rentTotalSaid = false;
  c.say("no_deal");
}

const rentSubtotal = (c: Ctx) => SURF_RATE[c.s.gear] * c.s.hours;
const rentTotal = (c: Ctx) => rentSubtotal(c) + (c.s.deposit ? SURF_DEPOSIT : 0);
const renterInvite = (c: Ctx) => c.s.rentPaid && !c.s.wantLesson && !c.s.advanced && !c.s.lessonNo;
const payable = (c: Ctx): Order | undefined =>
  c.step === "rent_pay" && c.s.rentTotalSaid && !c.s.rentPaid ? "rent"
    : c.step === "lesson_pay" && c.s.lessonTotalSaid && !c.s.lessonPaid ? "lesson" : undefined;

function askPay(c: Ctx, order: Order) {
  if (order === "rent" && !c.s.rentTotalSaid) {
    c.s.rentTotalSaid = true;
    const line = c.s.hours === 1 ? "total_one" : c.s.hours === 2 ? "total_two" : "total_three";
    c.say(line, { total: rentSubtotal(c) });
    if (c.s.deposit) c.say("total_dep", { total: rentTotal(c) });
  } else if (order === "lesson" && !c.s.lessonTotalSaid) {
    c.s.lessonTotalSaid = true;
    c.say("total_lesson", { total: SURF_LESSON });
  }
  if (!c.s.cardOk) c.say(c.s.method ? "pay_confirm" : "pay_how");
}

function paySuggest(c: Ctx): Suggestion[] {
  return c.s.cardOk ? [{ lt: "Pasirinkite kortelę arba grynuosius", hint: "paycard" }] : [{ lt: "Pasirinkite, kaip mokėsite", hint: "pay" }];
}

function payAgain(c: Ctx) {
  c.say("pay_how");
  c.hold();
}

function askCard(c: Ctx) {
  if (c.s.noSignal) { signalTwist(c); return; }
  c.say("card_yes");
  if (payable(c)) { c.s.cardOk = true; delete c.s.method; }
}

function payYes(c: Ctx) {
  if (c.s.method && payable(c)) pay(c, c.s.method);
  else payAgain(c);
}

function pay(c: Ctx, method: Method, amount?: number) {
  const order = payable(c);
  if (!order) {
    if (c.s.rentPaid || c.s.lessonPaid) c.say("paid_already");
    else {
      if (amount === undefined && (c.s.wantRent || c.s.wantLesson) && c.step !== "deposit") c.s.method = method;
      c.say("pay_first");
    }
    return;
  }
  if (method === "card" && c.s.noSignal) { signalTwist(c); return; }
  const total = order === "rent" ? rentTotal(c) : SURF_LESSON;
  if (amount !== undefined && amount < total) { c.say("short", { total }); c.hold(); return; }
  const changeDue = amount === undefined ? 0 : amount - total;
  c.s[order === "rent" ? "rentPaid" : "lessonPaid"] = true;
  c.s[order === "rent" ? "rentChange" : "lessonChange"] = changeDue;
  c.s.paidWith = method;
  delete c.s.method;
  c.s.cardOk = false;
  c.event("pay", { method, amount: total });
  c.say(method === "card" ? "card_ok" : changeDue ? "change" : "cash_ok");
  if (order === "lesson") c.say("lesson_paid");
  else handOver(c);
}

function handOver(c: Ctx) {
  const gear = c.s.gear;
  const line = gear === "board" ? "hand_board" : gear === "snorkel" ? "hand_snorkel" : gear === "kayak2" ? "hand_kayak2" : "hand_paddle";
  c.say(line, { X: gear });
  c.say("safety_word");
  c.event("give", { item: gear });
}

function signalTwist(c: Ctx) {
  c.twist("no_signal");
  delete c.s.method;
  c.s.cardOk = false;
  c.say(c.s.signalSaid ? "no_signal_again" : "no_signal");
  c.s.signalSaid = true;
  c.hold();
}

function atm(c: Ctx) {
  c.say("atm");
  c.s.atmAsked = true;
}

function lessonPrice(c: Ctx) {
  c.say(c.s.lessonPriceSaid ? "lesson_price_again" : "lesson_info", { price: SURF_LESSON });
  c.s.lessonPriceSaid = true;
}

function takeLesson(c: Ctx) {
  if (c.s.lessonOk || c.s.advanced) return;
  if (!c.s.lessonPriceSaid) { lessonPrice(c); c.say("lesson_q"); c.hold(); return; }
  c.s.lessonOk = true;
  c.say("lesson_yes");
}

function declineLesson(c: Ctx) {
  if (c.s.lessonPaid) { c.say("paid_already"); return; }
  c.s.wantLesson = false;
  c.s.lessonOk = false;
  c.s.lessonNo = true;
  c.s.surfing = false;
  c.say("lesson_declined");
  c.say("boards_anytime");
}

function experience(c: Ctx, exp: "surfer" | "none" | "some") {
  if (c.s.exp === exp || (c.s.exp && exp !== "surfer")) { c.say("ack"); return; }
  c.s.exp = exp;
  if (exp === "surfer") {
    c.s.advanced = true;
    c.s.surfer = true;
    if (!c.s.lessonOk) c.s.wantLesson = false;
    c.say("adv_honest");
    if (!c.s.pineSaid) { c.say("adv_pacific"); c.s.pineSaid = true; }
    if (c.step === "experience" || c.step === "lesson_offer") c.say("adv_no_lesson");
  } else {
    if (!c.s.wantRent) c.s.wantLesson = true;
    c.say(exp === "none" ? "exp_none" : "exp_some");
  }
}

function briefOk(c: Ctx) {
  if (c.step === "board") c.s.boardDone = true;
  if (c.step === "moves") c.s.movesDone = true;
}

function safetyDone(c: Ctx) {
  if (c.step === "safety") c.s.safetyDone = true;
}

function oneQuestion(c: Ctx) {
  c.say("tell_me");
  c.hold();
}

function been(c: Ctx, yes: boolean) {
  if (c.step !== "pe_been") return;
  c.s.peTalked = true;
  c.say(yes ? "pe_been_yes" : "pe_been_no");
}

function pineAnswer(c: Ctx, line: string) {
  c.say(line);
  if (c.step === "pe_been") c.s.peTalked = true;
  if (c.step === "invite") c.hold();
}

function goSurf(c: Ctx) {
  if (c.s.invited !== undefined) return;
  c.s.invited = true;
  c.s.surfing = true;
  c.s.level = c.s.surfer ? "advanced" : "beginner";
  c.say(renterInvite(c) && c.s.gear !== "board" ? "go_lend" : "go");
  c.event("surf", { level: c.s.level });
  close(c);
}

function notToday(c: Ctx) {
  if (c.s.invited !== undefined) return;
  c.s.invited = false;
  c.s.surfing = false;
  c.say(renterInvite(c) ? "no_problem" : "another_day");
  c.say("boards_anytime");
}

function closeOffer(c: Ctx) {
  if (!c.s.noDeal) c.complete();
  if (c.s.closingSaid) return;
  c.s.closingSaid = true;
  if (c.s.lessonNo && !c.s.rentPaid) c.say("what_rent");
  else if (c.s.invited === undefined && !c.s.noDeal) c.say("bye");
}

function close(c: Ctx) {
  if (c.s.surfing || c.s.rentPaid || c.s.lessonNo || c.s.safetyDone || (c.s.advanced && c.s.invited === false)) c.complete();
  c.s.closed = true;
  c.end();
  c.hold();
}

function sayGoodbye(c: Ctx) {
  c.say("bye");
  close(c);
}

export default surf;
