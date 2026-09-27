// Song 78 "The Machine Ate My Card" → American: "The ATM Ate My Card".
// Harbor Bank, personal banker Aaron. Opening a first US bank account as a newcomer
// (ID, proof of address, no Social Security number yet, opening deposit, debit card by mail),
// plus useful questions: fees, sending money to Lithuania (international wire, IBAN/SWIFT),
// exchanging euros. Twist (visits ≥ 1): the ATM outside kept the learner's card.
//
// Engine notes for this file:
// - "How are you?" is handled inside the first step (no pending), so a learner who skips it
//   and states their business is never stuck.
// - Service questions (fees, transfer, exchange) can come at any time; Aaron answers and
//   returns to the open question.

import type { Ctx, EntityDef, SituationDef, StepDef, Suggestion } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";

// ---------------------------------------------------------------------------
// Entities

const SASKAITA = "sąskaita/sąskaitos/sąskaitai/sąskaitą/sąskaita/sąskaitoje";

const ACCTS: EntityDef[] = [
  ent("checking", "checking | account", `einamoji/einamosios/einamajai/einamąją/einamąja/einamojoje | ${SASKAITA}`, "f",
    { pl: "checking | accounts", chip: "einamoji sąskaita", forms: ["checking", "checking account", "checkings account", "checking accounts", "check in account", "normal account", "regular account", "basic account", "everyday account", "normal one", "regular one"] }),
  ent("savings", "savings | account", `taupomoji/taupomosios/taupomajai/taupomąją/taupomąja/taupomojoje | ${SASKAITA}`, "f",
    { pl: "savings | accounts", chip: "taupomoji sąskaita", forms: ["savings", "savings account", "saving account", "saving", "savings accounts"] }),
];

const DOCS: EntityDef[] = [
  ent("passport", "passport", "pasas/paso/pasui/pasą/pasu/pase", "m", { chip: "pasas", forms: ["passport", "lithuanian passport", "passports", "pass port"] }),
  ent("license", "driver's | license", "vairuotojo | pažymėjimas/pažymėjimo/pažymėjimui/pažymėjimą/pažymėjimu/pažymėjime", "m",
    { chip: "vairuotojo pažymėjimas", forms: ["drivers license", "driver license", "driving license", "driving licence", "drivers licence", "license", "licence",
      "lithuanian driving license", "lithuanian drivers license", "lithuanian driver license", "international driving license", "international drivers license", "european driving license"] }),
  ent("id_card", "ID | card", "asmens tapatybės | kortelė/kortelės/kortelei/kortelę/kortele/kortelėje", "f",
    { chip: "asmens tapatybės kortelė", forms: ["id card", "id", "identity card", "national id", "national id card", "photo id", "lithuanian id", "identification", "id cards", "lithuanian id card", "european id card", "personal id"] }),
  ent("visa", "visa", "viza/vizos/vizai/vizą/viza/vizoje", "f", { chip: "viza", forms: ["visa", "work visa", "student visa"] }),
];

const PROOFS: EntityDef[] = [
  ent("lease", "lease", "nuomos sutartis/nuomos sutarties/nuomos sutarčiai/nuomos sutartį/nuomos sutartimi/nuomos sutartyje", "f",
    { chip: "nuomos sutartis", forms: ["lease", "lease agreement", "rental agreement", "rental contract", "rent contract", "apartment lease", "rent agreement"] }),
  ent("utility_bill", "utility | bill", `komunalinių paslaugų | ${SASKAITA}`, "f",
    { chip: "komunalinių paslaugų sąskaita", forms: ["utility bill", "utilities bill", "electric bill", "electricity bill", "gas bill", "water bill", "power bill", "internet bill", "phone bill", "light bill", "bill"] }),
  ent("statement", "bank | statement", "banko | išrašas/išrašo/išrašui/išrašą/išrašu/išraše", "m",
    { chip: "banko išrašas", forms: ["bank statement", "statement"] }),
];

/** Lexicon for a slot from entity forms, plus extra (tagged) forms such as British variants. */
function lexOf(list: EntityDef[], extra: { id: string; forms: string[]; tags?: string[] }[] = []) {
  const base = list.map((e) => ({ id: e.id, forms: [e.en.split(" | ").join(" "), ...(e.pl ? [e.pl.split(" | ").join(" ")] : []), ...(e.forms || [])] }));
  return { lexicon: [...base, ...extra] };
}

// ---------------------------------------------------------------------------
// State helpers

const opening = (c: Ctx) => !!c.s.opening && !c.s.opened;
const inCard = (c: Ctx) => !!c.s.card;
const needsId = (c: Ctx) => (opening(c) || inCard(c) || c.s.cash === "id") && !c.s.id;
const customer = (c: Ctx) => !!c.s.customer || !!c.s.opened;
/** The checklist follows the ATM-card story (twist visits, or whenever the learner reports it) unless they came to
 *  open an account. Frozen once one of the two errands is finished, so a second errand afterwards is a bonus. */
const cardPath = (c: Ctx) => (c.s.donePath ? c.s.donePath === "card" : (!!c.s.cardTwist || !!c.s.card) && !c.s.opening);
const openPath = (c: Ctx) => !cardPath(c);
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);

/** Count how often a step was asked, to vary first asks and re-asks. */
function bump(c: Ctx, key: string): number {
  c.s.asked = c.s.asked || {};
  const n = c.s.asked[key] ?? 0;
  c.s.asked[key] = n + 1;
  return n;
}

function startOpening(c: Ctx, type?: string) {
  c.s.task = c.s.task || "open";
  c.s.moreDone = false;
  if (!c.s.opening) { c.s.opening = true; c.s.topic = "open"; }
  if (type && !c.s.type) c.s.type = type;
}

function setType(c: Ctx, type: string) {
  const had = c.s.type;
  c.s.type = type;
  if (!had || had !== type) c.say(type === "both" ? "ack_both" : "ack_type");
}

function afterId(c: Ctx) {
  if (inCard(c) && !c.s.blocked) {
    c.s.blocked = true;
    c.say("card_blocked");
    c.say("new_card_info");
    c.s.donePath = c.s.donePath || "card";
    c.complete();
    c.twist("atm_card");
    return;
  }
  c.say("id_thanks");
}

function openAccount(c: Ctx) {
  c.s.opened = true;
  c.s.customer = true;
  c.say("opened");
  c.say("card_info");
  if (c.s.extraInfo === "pin") c.say("pin_info");
  else if (c.s.extraInfo === "routing") c.say("routing");
  c.s.donePath = c.s.donePath || "open";
  c.complete();
  c.s.served = true;
}

/** "No, that's all" / "No, I'm good" said to a yes/no step question means "no". */
function answerNo(c: Ctx): boolean {
  const st = bank.steps.find((x) => x.id === c.step);
  if (st && st.id !== "more" && st.no && !st.done(c)) { st.no(c); return true; }
  return false;
}

// Euro → dollar at the day's rate (1.15) minus the $5 fee, in cents.
const EUR_RATE = 115;
const exchanged = (eur: number) => eur * EUR_RATE - 500;

// Automatic answers the simulations use for optional questions.
const BANK_AUTO: Record<string, string> = {
  slow: "Sure, no problem.", savings: "No, thanks.", app: "Yes, please.", acct_q: "No, not yet.", open_offer: "Yes, please.",
  pin_q: "Yes, I think so.", cash_offer: "Yes, please.", cash_amount: "Two hundred dollars, please.", bills: "Twenties are fine.",
  euros: "Two hundred euros, please.", lease_q: "Yes, I have a lease.", other_id: "Yes, I have my driver's license.",
};

// ---------------------------------------------------------------------------
// Suggestions

const S_OPEN: Suggestion = { lt: "Pasakyti, kad nori atsidaryti sąskaitą", hint: "open", options: "acct" };
const S_TRANSFER: Suggestion = { lt: "Paklausti, kaip pervesti pinigų į Lietuvą", hint: "transfer" };
const S_EXCHANGE: Suggestion = { lt: "Išsikeisti eurų į dolerius", hint: "exchange" };
const S_CARD: Suggestion = { lt: "Pranešti, kad bankomatas lauke pasiliko tavo kortelę", hint: "card" };
const S_ASK: Suggestion = { lt: "Paklausti apie mokesčius, kortelę ar programėlę", hint: "ask_acct" };

const MAIN_EXPECTS = ["open_account", "card_kept", "exchange_req", "transfer_q", "withdraw", "new_in_town"];

function helpStep(id: string, withCard: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.cardTwist === withCard,
    done: (c) => !!c.s.task,
    ask: (c) => {
      const n = bump(c, "help");
      if (n === 0) {
        if (c.s.hay === "pending") {
          // optional pending: if the learner goes straight to business, it is simply dropped
          c.s.hay = "asked"; c.say("greet_hay");
          expectHowAreYou(c, (cc) => { cc.s.hay = "done"; });
          return;
        }
        c.say(c.visits >= 1 && c.chance(0.5) ? "greet_back" : "greet");
        return;
      }
      c.say("ask_help");
    },
    expects: MAIN_EXPECTS,
    suggest: withCard ? [S_CARD, S_OPEN, S_TRANSFER, S_EXCHANGE] : [S_OPEN, S_TRANSFER, S_EXCHANGE],
    yes: (c) => { if (c.s.hay === "asked") { c.s.hay = "done"; c.say("g_glad"); } },
    no: (c) => { if (c.s.hay === "asked") { c.s.hay = "done"; c.say("g_sorry_to_hear"); } },
    help: (c) => { c.say("services"); },
  };
}

// ---------------------------------------------------------------------------

export const bank: SituationDef = {
  id: "s78-bank",
  song: 78,
  songTitle: "The Machine Ate My Card",
  title: { en: "The ATM Ate My Card", lt: "Bankomatas prarijo mano kortelę" },
  topic: { en: "At the bank", lt: "Banke" },
  chapter: 3,
  order: 3,
  location: "bank",
  npc: "aaron",
  goal: "Atsidaryk banko sąskaitą (ir sužinok, kaip pervesti pinigus į Lietuvą).",
  intro: "„Harbor Bank“ – nedidelis bankas Main Street gatvėje. Prie stalo klientų laukia banko darbuotojas Aaron. Tau reikia sąskaitos atlyginimui ir nuomai – o gal norėsi pasiųsti pinigų ir namo, į Lietuvą.",
  entities: { acct: ACCTS, doc: DOCS, proof: PROOFS },

  grammar: {
    macros: {
      acct_np: "(one | [a | an] [new] [bank] account | [a | an] [new] {acct} | a bank account here) [today | here | please | for my (salary | paycheck | job | work | rent) | in this bank | with you | in your bank | at your bank | at this bank | at harbor bank]",
      both: "(both | both of them | both please | one of each | checking and savings | a checking and a savings account | checking and savings accounts)",
      money_to: "(to lithuania | home | back home | abroad | to europe | overseas | to another country | to my (family | mom | mother | parents | dad | father | wife | husband | son | daughter | sister | brother) [in lithuania])",
      send: "(send | transfer | wire)",
      euros: "(euros | euro | some euros | my euros | money | some money | cash)",
      atm: "[the | your | an | this | that] (atm | cash machine #tip:uk_cash | cashpoint #tip:uk_cash | bank machine | machine | money machine) [outside | out front | outside the bank]",
      took: "(kept | took | ate | swallowed | has | grabbed | did not give me back | did not return | would not give back | would not give me back | will not give back)",
    },
    slots: {
      acct: lexOf(ACCTS, [{ id: "checking", forms: ["current account", "current accounts"], tags: ["tip:uk_current"] }]),
      proof: lexOf(PROOFS, [{ id: "lease", forms: ["tenancy agreement", "tenancy contract"], tags: ["tip:uk_tenancy"] }]),
    },
  },

  intents: {
    // --- main requests
    open_account: { patterns: [
      "i would like to open @acct_np [today] #h:open_like", "i would like @acct_np [today]",
      "(i would also like to | i also need to | i also want to | can i also | could i also | and i would like to) open @acct_np",
      "(could | can | may) i open @acct_np [here | today] #h:open_could", "(can | could) i open @acct_np here #h:open_can",
      "i need (to open @acct_np | @acct_np) #h:open_need", "i want to open @acct_np #h:open_want",
      "how (do | can) i open @acct_np #h:open_how", "i am here to open @acct_np #h:open_here",
      "i am looking to open @acct_np #h:open_looking", "(i was hoping | i wanted | i came | i have come | i am hoping) to open @acct_np",
      "(can | could) you (open | help me open) @acct_np [for me]", "[i would like to] open @acct_np",
      "i am interested in opening @acct_np", "i am here about opening @acct_np", "(i would like | i want | i need) to become a customer",
      "i (want | need | would like to have | would like to get) @acct_np", "is it possible to open @acct_np", "i would like to (have | get) @acct_np",
      "(can | could) i get @acct_np", "i would like to open (a checking and a savings account | checking and savings accounts | both) #both",
      "(i would like | i want | i need) to become a (customer | client) [of your bank | here | at your bank | of this bank]", "(i would like | i want | i need) to (make | create | start | set up) @acct_np",
      "(i need | i want | i would like) a debit card", "what do i need to open @acct_np #needq", "but (i want | i would like | i need) to open @acct_np",
      "my (employer | boss | company | job) needs my (bank account | account number | bank details)",
    ] },
    new_in_town: { patterns: [
      "i (just | recently) moved here [from lithuania]", "i am new (here | in town | in the us | in america | to the us | to america | in this country)",
      "i (just | recently) arrived [in the us | in america | here] [from lithuania]", "i just moved to maple harbor", "i live here now",
    ] },
    card_kept: { patterns: [
      "@atm @took my [debit | bank] card #h:card_kept", "the machine ate my card #h:card_ate",
      "my [debit | bank] card got stuck in @atm #h:card_stuck", "my [debit | bank] card is stuck in @atm",
      "my card was (swallowed | eaten | kept | taken) by @atm", "i lost my card in @atm", "@atm did not (give | return) [me] my card [back]",
      "@atm kept it", "@atm @took it",
      "(it is | this is) about my card", "i have a problem with my card", "i have a problem with the @atm [outside]",
      "my card (got stuck | is stuck) [in the machine]",
      "i put my card in @atm and it (did not come out | never came out | kept it | did not give it back)", "(it | the card | my card) (did not | never) (come | came) (out | back)",
      "@atm (does not | will not) give (me)? [back] my card [back]",
    ] },
    // "I have a problem." / "Can you help me?" before saying what it is
    help_me: { patterns: ["i have a (problem | little problem | small problem)", "(can | could) you help me [please]", "i need [some | your] help [please]"] },
    exchange_req: { patterns: [
      "i would like to (change | exchange) @euros [(into | to | for) dollars] #h:ex_like", "(i would also like to | i also need to | can i also | could i also) (change | exchange) @euros [(into | to | for) dollars]",
      "(can | could | may) i (change | exchange) @euros [(into | to | for) dollars] [here] #h:ex_could",
      "do you (exchange | change) (euros | money | currency | foreign currency)", "i need to (change | exchange) @euros [(into | to | for) dollars]",
      "i want to (change | exchange) @euros [(into | to | for) dollars]", "i need [some] dollars", "(i have | i brought) [some] euros",
      "(can | could) you (change | exchange) [my | some | these] euros [(into | to | for) dollars]", "(change | exchange) euros [(to | into) dollars] [please]",
      "(can | could) you (change | exchange) (them | it | these) [(into | to | for) dollars]", "(i would like | i want | i need) to (get | buy) [some] dollars (for | with) my euros",
      "i would like to buy [some] dollars", "currency exchange",
    ] },
    transfer_q: { patterns: [
      "how (can | do) i @send [some] money @money_to #h:tr_how", "i would like to @send [some] money @money_to #h:tr_like",
      "(i want | i need | i have) to @send money @money_to", "(can | could) i @send money @money_to [from here]",
      "how (can | do) i @send money", "i would like to (make | send) [an] international (transfer | wire | wire transfer | payment)",
      "(can | could) i (make | send) [an] international (transfer | wire | wire transfer | payment)",
      "(how much | what) does it cost to @send money @money_to", "(how much | what) is (the | a) (transfer | wire | wire transfer) fee",
      "(do | can) you (send | transfer) money @money_to", "i want to @send money to lithuania",
      "(how | can i) (pay | help) my family in lithuania", "(i need | i want | i would like) to (pay | support | help) my family in lithuania",
    ] },
    withdraw: { patterns: [
      "i (would like | want | need) to (withdraw | take out | get) [some] (cash | money) [here] #h:cash_take",
      "(can | could) i (withdraw | take out | get) [some] (cash | money) [here | at the counter] #h:cash_take",
      "i need (some | a little) cash", "(can | could) you give me [some] cash", "i need cash [today | now]",
      "(i want | i would like | i need) to (take | get) [some] money (from | out of) my account", "(can | could) i (take | get) [some] money (from | out of) my account",
    ] },

    // --- account opening
    acct_type_ans: { patterns: [
      "[a | an | the | just a | just an] {acct} [please] #h:type_short", "[a | the] {acct} one [please]", "(i would like | i will take | i will have | i will go with | let us (do | go with) | can i (get | have) | could i (get | have) | i want | i think i will take) [a | an] {acct} #h:type_like",
      "@both #both #h:type_both", "i would like both #both", "(i will take | i will have | let us do | can i have | i want) both #both",
      "{acct} (is fine | sounds good | is good | works | for me)", "(i think | probably | maybe) [a | an] {acct}", "[a | an] {acct} i think",
      "{acct} i guess", "just [the] {acct} [for now]",
      // why they need it: "For everyday spending", "I need it for my salary", "To save money"
      "[i need it] for [my] (everyday | daily) (spending | use | expenses | payments | shopping | things) #chk", "[i need it] for my (salary | paycheck | rent | bills | rent and bills | job | work) #chk",
      "[i want] to save money #sav", "[i need it] for saving [money] #sav", "(i want | i need) to save [some] money #sav",
      "the one for my (salary | paycheck | bills | rent | everyday spending) #chk", "the one for saving [money] #sav", "{acct} is (better | best | good) [for me]",
    ] },
    acct_type_not: { patterns: [
      "[no] not [a | the] {acct}", "i do not (want | need) [a | an | the] {acct} [right now | for now]", "no {acct} [for now | thanks]",
    ] },
    ask_difference: { patterns: [
      "what is the difference #h:q_difference", "what is the difference between (them | the two | checking and savings | a checking and a savings account)",
      "(which one | which | what) do you recommend #h:q_recommend", "which (one | is better | is best) [for me]", "(which | what) (one | account) should i (get | open | choose)",
      "what is a {acct}", "(i do not know | i am not sure) (which | what) (one | account) [i need]", "what (types | kinds) of accounts do you have",
      "what is better [for me]", "(i do not know | i am not sure) [what | which (one | account)] [is better]",
    ] },
    show_doc: { patterns: [
      "here is my {doc} #h:id_here", "here (you go | you are) [this is | here is] my {doc}", "[this is] my {doc}", "[i have] my {doc} [right] here",
      "i have [a | an | my] {doc}", "i (only | just) have [a | an | my] {doc} #h:id_only", "i have only [a | an | my] {doc}", "(is | will) [a | an | my] {doc} (okay | fine | enough | work) #h:id_ok",
      "(does | would) [a | an | my] {doc} work", "can i use (a | an | my) {doc}", "i also have (a | an | my) {doc} #h:id_license",
      "i have (a | an | my) {doc} and (a | an | my) {doc}", "i brought my {doc}",
    ] },
    // "Passport." as the answer to "Can I see your ID?"
    doc_ctx: { patterns: ["[yes | sure] [a | my | the] {doc} [please | here | is okay]"] },
    no_doc: { patterns: [
      "i do not have [a | an | my | any] ({doc} | id | photo id | identification) [with me] [today]",
      "i (forgot | left) my {doc} [at home]", "i do not have it with me",
    ] },
    give_proof: { patterns: [
      "i have a letter from my (landlord | employer | bank | university)",
      "here is my {proof} #h:proof_lease", "[this is] my {proof}", "i have (a | an | my) {proof} #h:proof_bill", "(is | will) [a | an | my] {proof} (okay | fine | enough | work) #h:proof_ok",
      "(does | would) [a | an | my] {proof} work", "can i use (a | an | my) {proof}", "i brought my {proof}", "[i have] my {proof} on my phone", "my {proof} is on my phone", "i have (the | my) {proof} on my phone",
      "i have (a | an | my) {proof} and (a | an | my) {proof}",
    ] },
    proof_ctx: { patterns: ["[yes | sure] [a | my | the] {proof} [please | here]"] },
    no_proof: { patterns: [
      "i do not have [a | an | any] ({proof} | proof [of address] | bills) [yet] #h:proof_none", "i just moved here #h:proof_moved",
      "i (just | only) moved in [last week | yesterday | a few days ago]", "i do not have anything [with my address] [yet]",
      "i have not got [a | any] {proof} yet", "i am still waiting for [a | my] {proof}",
      "i live with (a friend | friends | my family | my cousin | my sister | my brother | my parents | a roommate) [and] [i do not have a lease] #nolease", "i (just | only) moved [here | in]",
      "my {proof} is (at home | in my apartment | not with me)", "i (forgot | left) my {proof} at home",
    ] },
    ssn_none: { patterns: [
      "[no] i do not have (one | a social security number | an ssn | it | a number | that) [yet] #h:ssn_notyet",
      "[no] i am [still] waiting for (it | one | my number | my social security number) #h:ssn_waiting", "[no] i am (from lithuania | not from here | not american)", "i have not (got | gotten | received) (it | one) yet",
      "i (applied | have applied) [for (it | one)]", "i am not (a | an) (us citizen | american | citizen)", "i am (a foreigner | not from here | a visitor)",
      "no i do not have one", "i do not have one",
      "i (applied | have applied) [for (it | one)] (last week | yesterday | a few days ago | already | last month)", "i (only)? have a (lithuanian | european | foreign) (tax number | personal code | personal number | id number)",
      "[no] (only | just) a (lithuanian | european) (personal code | tax number | personal number)", "i have a tax number from lithuania",
    ] },
    ssn_yes: { patterns: ["[yes] i have (one | it | a social security number)", "yes i have got one", "yes i do have one"] },
    ask_ssn_what: { patterns: ["what is (a | the) social security number #h:ssn_what", "what is (that | an ssn | a social security number for)", "what is it for", "i do not know what (that | it) is"] },
    ssn_problem: { patterns: ["is (that | it) a problem #h:ssn_problem", "is that okay", "can i still open (it | an account | one)", "do i need (one | it)"] },
    ask_pen: { patterns: ["(can | could | may) i (borrow | have | use) a pen #h:form_pen", "do you have a pen", "i need a pen", "(can | could | may) i (use | have | borrow) a pencil", "do you have a pencil"] },
    where_sign: { patterns: ["where (do | should | can) i sign #h:form_where", "where do i put my signature", "where [is it] (here | there)", "sign where", "[here | there] at the bottom"] },
    what_write: { patterns: [
      "what (do | should) i (write | put) (here | there | in this box | on the form) #h:form_what", "what (do | should) i write",
      "do i (need to | have to) fill out (everything | all of this | the whole form)", "(should | do) i [need to | have to] fill in (this | the form | it | everything | the whole form | all of this | all of it) #tip:uk_fill_in",
      "i do not understand (this | this part | this question | this word | this line)", "(should | do) i write my (lithuanian | home | old | new | us | american) address",
    ] },
    signed: { patterns: [
      "(done | i am done | finished | i am finished | all done | i signed [it] | i have signed [it] | okay i signed [it]) #h:form_done",
      "(it is | that is) done", "(there | here) you go [it is done | i signed it]",
      "i (filled | have filled) (it | the form) (out | in)", "is (this | that | it) (correct | right | okay | good)",
    ] },
    here_you_go: { patterns: ["here you (go | are) #h:form_here", "there you go", "here it is", "here they are"] },
    deposit_ans: { patterns: [
      "[i would like to | i will | i want to | i am going to | can i | let me | i can | i would like to start with] (deposit | put in) {price} [in cash | today | now | to start] #h:dep_like",
      "i will start with {price}", "{price} in cash #h:dep_cash", "(let us | let us do | how about) {price}",
      "is {price} (enough | okay | fine)", "i have {price} [with me | in cash | here]", "(let us say | say) {price}", "[i want to | i would like to | i will | let me] (put | deposit) {price} (on | in | into) (the | my) account",
      "[i will | i would like to | i want to] (deposit | put in) [about] (a | one | two | three | five) thousand [dollars]",
    ] },
    minimum: { patterns: ["(just | only) the minimum #h:dep_min", "the minimum [please | is fine]", "[i will | i would like to] (deposit | put in) the minimum", "(just | only) {price} for now"] },
    ask_minimum: { patterns: ["how much is the minimum [deposit] #h:dep_q", "what is the minimum [deposit | to open]", "how much do i (need | have) to (deposit | put in)", "is there a minimum [deposit]", "how much do i need"] },
    amount_ctx: { patterns: [
      "{price} [in cash | cash] #h:cash_short", "(i would like | i need | i will take | can i (get | have) | could i (get | have) | maybe | about | around | let me get) {price}",
      "(just | only) {price}", "(i would like to | i want to | i need to | can i | could i) (withdraw | take out | get) {price} #h:cash_amount",
      "{price} is (enough | fine | okay)",
    ] },
    // "No, I have cash." to "Do you need any cash in the meantime?"
    no_cash_needed: { patterns: ["[no] i (have | still have) (cash | some cash | enough cash | enough money)", "[no] i do not need (cash | any cash | money | any money) [thanks | right now | today]"] },
    // "No, I'll do it later." to "Would you like to set up our mobile app?"
    app_later: { patterns: ["[no] i will (do it | set it up | download it | install it) (later | at home | myself)", "[no] i will do that later"] },

    // --- account questions
    fee_q: { patterns: [
      "is there a (monthly | maintenance | account | monthly maintenance) fee #h:q_fee", "(how much | what) does (it | the account) cost [per month | a month | every month]",
      "is (it | the account) free", "are there any fees", "do i (have to | need to) pay (anything | a fee | every month | monthly)", "what are the fees",
      "is there a fee (for | on) (it | checking | the checking account | the account | savings | that | this account)",
    ] },
    minbal_q: { patterns: ["is there a minimum balance", "what is the minimum balance", "how much (do i need | do i have) to keep in the account"] },
    interest_q: { patterns: ["what is the interest rate #h:q_interest", "(how much | what) interest (do i get | does it pay | is it)", "does it (pay | earn) interest", "is there interest"] },
    card_when_q: { patterns: [
      "when (will | do) i get (my | the) [debit | new] card #h:q_card_when", "when (does | will) (the | my) [debit | new] card (come | arrive)",
      "how long (does | will) the card take", "(will | does) the card come by (mail | post #tip:uk_post)", "do i get a (card | debit card)",
    ] },
    card_abroad_q: { patterns: [
      "can i use (the | my | this | a) [debit] card (in lithuania | in europe | abroad | in other countries | when i travel) #h:q_abroad",
      "does (the | my) card work (in lithuania | in europe | abroad)", "can i pay with (it | the card) (in lithuania | abroad)",
    ] },
    app_q: { patterns: [
      "do you have (an | a mobile | a banking) (app | application) #h:q_app", "is there (an | a mobile) app",
      "can i (check my balance | pay bills | pay my bills | do it | do everything) (online | in the app | on my phone | on the app)", "do you have online banking",
      "how (do | can) i check my balance", "how does (it | the app) work",
    ] },
    atm_q: { patterns: [
      "where is the (nearest | closest) @atm #h:q_atm", "is there (an | a) @atm (near here | nearby | here | close by)", "where (is | can i find) (an | the) @atm",
      "(is | are) the @atm (free | atms free)", "do i pay (a fee | anything) at the @atm",
      "(can | could) i (get | take out) (cash | money) (from | at) [the] (atms | atm) (for free | without a fee)",
    ] },
    cost_q: { patterns: ["how much (is it | does it cost | is that | is the fee | does that cost) #h:tr_cost", "what is the fee", "is there a fee #h:ex_fee", "is it expensive", "how much do you charge"] },
    how_long_q: { patterns: ["how long (does it | will it | does that | does the transfer | does a transfer | does it usually) take #h:tr_long", "how long does (a | the) (transfer | wire | wire transfer) (to lithuania | home) take", "when will (it | the money) (arrive | get there)", "how fast is it", "is it fast"] },
    need_q: { patterns: ["what do i need [for (that | it | a transfer | the transfer)] #h:tr_need", "what do i need (to send money | for sending money | to make a transfer | to send a wire)", "what (information | details | documents) do (i | you) need", "what do you need from me"] },
    swift_q: { patterns: ["what is (a | the) (swift | swift code | bic | bic code) #h:tr_swift", "what is (an | the) iban", "where (do | can) i (get | find) the (swift code | iban)"] },
    app_transfer_q: { patterns: ["can i do (it | that | this) (in the app | online | on my phone | from my phone | on the app) #h:tr_app", "can i (send | transfer) (it | money) (online | in the app | from my phone)"] },
    rate_q: { patterns: ["what is the (exchange rate | rate) [today | for euros] #h:ex_rate", "how much is (that | it) in dollars", "how many dollars (for | is) (one euro | a euro)", "what is the euro rate", "what is the rate for euros"] },
    euro_amount: { patterns: ["{number} euros [please] #h:ex_amount", "(i would like to | i want to | can i | could i) (change | exchange) {number} euros", "(all of it | all of them | everything | all my euros) #h:ex_all",
      "i have {number} euros", "(change | exchange) {number} euros"] },
    euro_ctx: { patterns: ["{number}", "(just | only | about) {number}"] },

    // --- the card (twist)
    wrong_pin: { patterns: [
      "[yes] i (entered | typed | put in | used) the wrong pin [three times | 3 times | twice | too many times] #h:card_pin", "[yes] i (think | guess) i (entered | typed) the wrong pin",
      "[yes] i forgot my pin", "[yes] i could not remember my pin", "[yes] wrong pin",
      "[yes] (three times | twice | a few times | too many times)", "i (typed | entered | put) it (wrong | in wrong)", "[yes] i (think i)? made a mistake [with the pin]",
    ] },
    pin_yes_ctx: { patterns: ["[yes] (probably | maybe | i think so | i guess so | i think i did | i think yes)"] },
    machine_error: { patterns: [
      "[no] i do not think so #h:pin_no", "[no] the pin was (right | correct)", "[no] it (just | simply) kept (it | my card)", "[no] the machine (is broken | did not work | had an error | made an error)",
      "[no] it said (error | there was an error)", "[no] i do not know what happened",
    ] },
    block_req: { patterns: ["(can | could) you (block | cancel | freeze) (it | my card | the card) [please] #h:card_block", "please (block | cancel) (it | my card)", "i (want | need) to (block | cancel) my card"] },
    new_card_q: { patterns: ["(can | could) i (get | have) a new (card | one) #h:card_new", "will i get a new (card | one)", "(do | will) you send [me] a new (card | one)"] },
    old_card_q: { patterns: ["can i (get | have) my (old | own) card back", "(can | could) you (get | give) [me] my card back", "can i (get | have) it back", "can you open the machine"] },
    account_safe_q: { patterns: ["is my (money | account) safe", "can i still use my account", "is my money okay", "can someone use my card"] },
    bills_ans: { patterns: [
      "(twenties | in twenties | twenty dollar bills | twenty dollars bills) (are fine | is fine | are good | please | are okay) #h:cash_twenties", "(twenties | in twenties)",
      "(some | a few) (smaller | small) bills [please] #h:cash_small", "(fifties | hundreds | tens) [please | are fine]", "(any | whatever) is fine", "it does not matter",
      "(can | could) i (have | get) [some] (tens | twenties | fifties | fives | hundreds | small bills | smaller bills)", "does not matter",
      "(tens | twenties | fives | fifties) and (tens | twenties | fives | fifties)",
    ] },

    // --- general
    more_no: { patterns: [
      "(that is | that will be) (all | it | everything) [for today] #h:more_all", "that is everything #h:more_everything", "nothing else", "[no] that is it",
      "[no] i am (good | fine | all set | okay)", "i think that is (all | it | everything)", "no more questions", "that is all i need",
      "[no thanks] you (were | have been) (very | really | so)? helpful",
    ] },
    have_question: { patterns: ["[actually] i have a [quick] question #h:more_question", "(can | could | may) i ask [you] (a question | something)", "one more (question | thing)"] },
    no_problem: { patterns: ["[sure | of course] no problem #h:np_sure", "[no problem] take your time #h:np_time", "(no worries | that is fine | that is okay | no rush | of course | sure thing)",
      "[it is okay] i am not in a hurry", "(it is | that is) (okay | fine) i can wait", "[sure] i can wait"] },
    not_yet: { patterns: ["not yet", "no not yet", "i do not have one [yet]", "i do not [have an account]"] },

    // How-are-you answers are global intents; the handlers below answer only when Aaron asked.
  },

  lines: {
    greet: [
      t("Hi there! | Welcome | to | Harbor Bank. | How | can | I | help | you | today?",
        "Laba diena! | Sveiki atvykę | į | „Harbor Bank“. | Kuo | galiu | aš | padėti | jums | šiandien?",
        "Laba diena! Sveiki atvykę į „Harbor Bank“. Kuo šiandien galiu jums padėti?"),
      t("Good | morning! | What | can | I | do | for you | today?", "Labas | rytas! | Ką | galiu | aš | padaryti | jums | šiandien?", "Labas rytas! Kuo šiandien galiu jums padėti?"),
      t("Hi! | What | brings | you | in | today?", "Sveiki! | Kas | atvedė | jus | čia | šiandien?", "Sveiki! Kas jus šiandien atvedė?",
        { flags: { 2: "“brings” is present in the English idiom; Lithuanian asks in the past (atvedė)." } }),
    ],
    greet_back: [
      t("Hi, | welcome | back! | How | can | I | help | you | today?", "Sveiki, | sveiki | sugrįžę! | Kuo | galiu | aš | padėti | jums | šiandien?", "Sveiki sugrįžę! Kuo šiandien galiu padėti?"),
      t("Good | to see | you | again! | What | can | I | do | for you?", "Gera | matyti | jus | vėl! | Ką | galiu | aš | padaryti | jums?", "Smagu jus vėl matyti! Kuo galiu padėti?"),
    ],
    greet_hay: [
      t("Hi there! | How | are | you | doing | today?", "Sveiki! | Kaip | — | jums | sekasi | šiandien?", "Sveiki! Kaip jums šiandien sekasi?",
        { flags: { 2: "Progressive “are” has no Lithuanian word; sekasi carries the tense (linked to “doing”)." } }),
      t("Good | morning! | How | are | you | today?", "Labas | rytas! | Kaip | sekasi | jums | šiandien?", "Labas rytas! Kaip šiandien sekasi?"),
    ],
    ask_help: [
      t("So, | how | can | I | help | you | today?", "Tai | kuo | galiu | aš | padėti | jums | šiandien?", "Tai kuo šiandien galiu jums padėti?"),
      t("What | can | I | do | for you | today?", "Ką | galiu | aš | padaryti | jums | šiandien?", "Kuo šiandien galiu padėti?"),
      t("How | can | I | help?", "Kuo | galiu | aš | padėti?", "Kuo galiu padėti?"),
    ],
    services: [
      t("I | can | help | you | open | an | account, | send | money | abroad | or | exchange | currency.",
        "Aš | galiu | padėti | jums | atsidaryti | — | sąskaitą, | nusiųsti | pinigų | į užsienį | ar | išsikeisti | valiutą.",
        "Galiu padėti atsidaryti sąskaitą, nusiųsti pinigų į užsienį ar išsikeisti valiutą."),
    ],
    go_ahead: [
      t("Sure, | go ahead!", "Žinoma, | klauskite!", "Žinoma, klauskite!"),
      t("Of course. | What's | your | question?", "Žinoma. | Koks yra | jūsų | klausimas?", "Žinoma. Koks jūsų klausimas?"),
    ],
    welcome_town: [
      t("Welcome | to | Maple Harbor! | Would | you | like | to open | an | account | with us?",
        "Sveiki atvykę | į | Meipl Harborą! | Ar | jūs | norėtumėte | atsidaryti | — | sąskaitą | pas mus?",
        "Sveiki atvykę į Meipl Harborą! Gal norėtumėte atsidaryti sąskaitą pas mus?",
        { flags: { 3: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
    ],

    // account type
    ask_type: [
      t("Sure! | Would | you | like | a | checking | account | or | a | savings | account?",
        "Žinoma! | Ar | jūs | norėtumėte | — | einamosios | sąskaitos | ar | — | taupomosios | sąskaitos?",
        "Žinoma! Norėtumėte einamosios ar taupomosios sąskaitos?",
        { flags: { 1: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte (linked to “like”)." } }),
      t("Great! | Are | you | looking for | checking | or | savings?", "Puiku! | Ar | jūs | ieškote | einamosios sąskaitos | ar | taupomosios?",
        "Puiku! Jums reikia einamosios ar taupomosios sąskaitos?",
        { flags: { 1: "Progressive “Are” in a question = the particle ar; ieškote carries the tense (linked to “looking for”)." } }),
      t("Of course. | Checking | or | savings?", "Žinoma. | Einamąją | ar | taupomąją?", "Žinoma. Einamąją ar taupomąją?"),
    ],
    ask_type_again: [
      t("So, | checking | or | savings?", "Tai | einamąją | ar | taupomąją?", "Tai einamąją ar taupomąją?"),
      t("Which one | would | you | like?", "Kurią | — | jūs | norėtumėte?", "Kurią norėtumėte?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    explain_types: [
      t("A | checking | account | is | for | everyday | spending, | and | it | comes | with | a | debit | card.",
        "— | Einamoji | sąskaita | yra | skirta | kasdienėms | išlaidoms, | ir | ji | būna | su | — | debeto | kortele.",
        "Einamoji sąskaita skirta kasdienėms išlaidoms, prie jos gaunate debeto kortelę."),
    ],
    explain_savings: [
      t("A | savings | account | earns | interest.", "— | Taupomoji | sąskaita | uždirba | palūkanų.", "Taupomojoje sąskaitoje pinigai uždirba palūkanų."),
    ],
    recommend_both: [
      t("Most | people | start | with | checking. | Many | open | both.", "Dauguma | žmonių | pradeda | nuo | einamosios. | Daug kas | atsidaro | abi.",
        "Dauguma pradeda nuo einamosios sąskaitos. Daug kas atsidaro abi."),
    ],
    ack_type: [
      t("Great | choice.", "Puikus | pasirinkimas.", "Puikus pasirinkimas."),
      t("Perfect.", "Puiku.", "Puiku."),
      t("Sounds | good.", "Skamba | gerai.", "Puiku."),
    ],
    ack_both: [
      t("Great, | we'll open | both.", "Puiku, | atidarysime | abi.", "Puiku, atidarysime abi."),
    ],
    ack_not_type: [
      t("Okay, | just | checking | then.", "Gerai, | tik | einamąją | tada.", "Gerai, tada tik einamąją."),
    ],
    ack_not_type_s: [
      t("Okay, | savings | then.", "Gerai, | taupomąją | tada.", "Gerai, tada taupomąją."),
    ],

    // ID and proof of address
    ask_id: [
      t("Okay. | Can | I | see | your | ID? | A | passport | is fine.", "Gerai. | Ar galiu | aš | pamatyti | jūsų | asmens dokumentą? | — | Pasas | tinka.",
        "Gerai. Ar galiu pamatyti jūsų asmens dokumentą? Tiks ir pasas."),
      t("Could | I | see | your | passport, | please?", "Ar galėčiau | aš | pamatyti | jūsų | pasą, | prašau?", "Ar galėčiau pamatyti jūsų pasą?"),
    ],
    ask_id_proof: [
      t("I'll need | your | ID | and | proof | of address, | like | a | lease | or | a | utility | bill.",
        "Man reikės | jūsų | asmens dokumento | ir | įrodymo | adreso, | pavyzdžiui, | — | nuomos sutarties | ar | — | komunalinių paslaugų | sąskaitos.",
        "Man reikės jūsų asmens dokumento ir adreso įrodymo, pavyzdžiui, nuomos sutarties ar komunalinių paslaugų sąskaitos."),
    ],
    id_thanks: [
      t("Thank | you.", "Dėkoju | jums.", "Ačiū."),
      t("Perfect, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
      t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
    ],
    need_photo_id: [
      t("I'm sorry, | we | need | a | photo ID | to open | an | account. | Do | you | have | a | driver's | license | or | an | ID | card?",
        "Atsiprašau, | mums | reikia | — | dokumento su nuotrauka | atidaryti | — | sąskaitą. | Ar | jūs | turite | — | vairuotojo | pažymėjimą | ar | — | asmens tapatybės | kortelę?",
        "Atsiprašau, sąskaitai atidaryti reikia dokumento su nuotrauka. Ar turite vairuotojo pažymėjimą ar asmens tapatybės kortelę?",
        { flags: { 8: "Question “Do” = the particle ar." } }),
    ],
    come_back_id: [
      t("No | problem. | Just | come | back | with | your | passport | anytime.", "Jokių | problemų. | Tiesiog | ateikite | atgal | su | savo | pasu | bet kada.",
        "Jokių problemų. Tiesiog grįžkite su pasu bet kada."),
    ],
    ask_proof: [
      t("And | do | you | have | proof | of address? | A | lease | or | a | utility | bill | works.",
        "O | ar | jūs | turite | įrodymą | adreso? | — | Nuomos sutartis | ar | — | komunalinių paslaugų | sąskaita | tinka.",
        "O ar turite adreso įrodymą? Tiks nuomos sutartis arba komunalinių paslaugų sąskaita.",
        { flags: { 1: "Question “do” = the particle ar." } }),
      t("I'll | also | need | proof | of address, | like | a | lease.", "Man | taip pat | reikės | įrodymo | adreso, | pavyzdžiui, | — | nuomos sutarties.",
        "Man dar reikės adreso įrodymo, pavyzdžiui, nuomos sutarties.",
        { flags: { 0: "“'ll” (will): the future ending of reikės carries it; I'm → the dative man (linked to “need”)." } }),
    ],
    ask_proof_again: [
      t("And | proof | of address?", "O | įrodymas | adreso?", "O adreso įrodymas?"),
    ],
    proof_ok: [
      t("That | works, | thanks.", "Tai | tinka, | ačiū.", "Tinka, ačiū."),
      t("Perfect.", "Puiku.", "Puiku."),
    ],
    ask_lease: [
      t("No | problem. | Do | you | have | a | lease?", "Jokių | problemų. | Ar | jūs | turite | — | nuomos sutartį?", "Jokių problemų. Ar turite nuomos sutartį?",
        { flags: { 2: "Question “Do” = the particle ar." } }),
    ],
    proof_later: [
      t("That's | okay. | You | can | bring | it | in | later.", "Tai | gerai. | Jūs | galite | atnešti | jį | čia | vėliau.", "Nieko tokio. Galėsite atnešti vėliau."),
    ],

    // Social Security number
    ask_ssn: [
      t("Do | you | have | a | Social | Security | number?", "Ar | jūs | turite | — | socialinio | draudimo | numerį?", "Ar turite socialinio draudimo numerį?",
        { flags: { 0: "Question “Do” = the particle ar." } }),
      t("And | do | you | have | a | Social | Security | number | yet?", "O | ar | jūs | turite | — | socialinio | draudimo | numerį | jau?", "O ar jau turite socialinio draudimo numerį?",
        { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    ssn_none_ok: [
      t("That's | okay. | We | can | open | it | with | your | passport. | You | can | add | the | number | later.",
        "Tai | gerai. | Mes | galime | atidaryti | ją | su | jūsų | pasu. | Jūs | galėsite | pridėti | — | numerį | vėliau.",
        "Nieko tokio. Galime ją atidaryti su jūsų pasu, o numerį pridėsite vėliau."),
      t("No | problem. | You | can | add | it | later.", "Jokių | problemų. | Jūs | galėsite | pridėti | jį | vėliau.", "Jokių problemų, pridėsite jį vėliau."),
    ],
    ssn_yes_type: [
      t("Great. | You | can | type | it | here.", "Puiku. | Jūs | galite | įvesti | jį | čia.", "Puiku. Įveskite jį čia."),
    ],
    ssn_explain: [
      t("It's | a | nine-digit | number | for | work | and | taxes | in America.", "Tai yra | — | devynių skaitmenų | numeris | — | darbui | ir | mokesčiams | Amerikoje.",
        "Tai devynių skaitmenų numeris, reikalingas darbui ir mokesčiams Amerikoje.",
        { flags: { 4: "“for”: the dative darbui carries it." } }),
    ],

    // form
    ask_form: [
      t("Now, | please | fill out | this | form | and | sign | here, | at the bottom.", "Dabar | prašom | užpildyti | šią | formą | ir | pasirašyti | čia, | apačioje.",
        "Dabar prašom užpildyti šią formą ir pasirašyti čia, apačioje."),
      t("Could | you | fill out | this | form? | And | then | sign | right | here.", "Ar galėtumėte | jūs | užpildyti | šią | formą? | Ir | tada | pasirašykite | štai | čia.",
        "Ar galėtumėte užpildyti šią formą? Tada pasirašykite štai čia."),
    ],
    form_wait: [
      t("Take your time. | Just | let me know | when | you're | done.", "Neskubėkite. | Tiesiog | praneškite man, | kai | jūs | baigsite.",
        "Neskubėkite. Pasakykite, kai baigsite.",
        { flags: { 4: "“You're done”: Lithuanian uses the future baigsite; “'re” has no separate word (linked to “done”)." } }),
    ],
    pen: [t("Of course. | Here's | a | pen.", "Žinoma. | Štai | — | rašiklis.", "Žinoma. Štai rašiklis.")],
    where_sign: [
      t("Right | here, | on | the | line | at the bottom.", "Štai | čia, | ant | — | linijos | apačioje.", "Štai čia, ant linijos apačioje."),
    ],
    what_write: [
      t("Just | your | name, | address, | phone | number | and | email.", "Tik | savo | vardą, | adresą, | telefono | numerį | ir | el. paštą.",
        "Tik savo vardą, adresą, telefono numerį ir el. paštą."),
    ],
    form_thanks: [
      t("Perfect, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
      t("Great, | thanks.", "Puiku, | ačiū.", "Puiku, ačiū."),
    ],

    // deposit
    min_deposit: [
      t("You | need | at least | $25 | to open | the | account.", "Jums | reikia | bent | 25 dolerių | atidaryti | — | sąskaitą.",
        "Sąskaitai atidaryti reikia bent 25 dolerių.", { say: "You need at least twenty-five dollars to open the account." }),
    ],
    ask_deposit: [
      t("How much | would | you | like | to deposit | today?", "Kiek | — | jūs | norėtumėte | įnešti | šiandien?", "Kiek norėtumėte šiandien įnešti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
      t("How much | are | you | depositing | today?", "Kiek | — | jūs | įnešate | šiandien?", "Kiek šiandien įnešite?",
        { flags: { 1: "Progressive “are” has no Lithuanian word; įnešate carries the tense (linked to “depositing”)." } }),
    ],
    deposit_min: [
      t("Sorry, | the | minimum | is | $25.", "Atsiprašau, | — | minimumas | yra | 25 doleriai.", "Atsiprašau, minimali suma – 25 doleriai.",
        { say: "Sorry, the minimum is twenty-five dollars." }),
    ],
    min_is: [
      t("The | minimum | is | $25.", "— | Minimumas | yra | 25 doleriai.", "Minimali suma – 25 doleriai.", { say: "The minimum is twenty-five dollars." }),
    ],

    // opened
    opened: [
      t("And | you're | all set! | Your | account | is | open.", "Ir | jums | viskas sutvarkyta! | Jūsų | sąskaita | yra | atidaryta.", "Ir viskas sutvarkyta! Jūsų sąskaita atidaryta."),
      t("All | done! | Your | new | account | is | open.", "Viskas | padaryta! | Jūsų | nauja | sąskaita | yra | atidaryta.", "Viskas! Jūsų nauja sąskaita atidaryta."),
    ],
    card_info: [
      t("You'll get | your | debit | card | by mail | in | 5–7 | business | days.", "Gausite | savo | debeto | kortelę | paštu | per | 5–7 | darbo | dienas.",
        "Debeto kortelę gausite paštu per 5–7 darbo dienas.", { say: "You'll get your debit card by mail in five to seven business days." }),
      t("Your | card | should | arrive | in | 5–7 | business | days.", "Jūsų | kortelė | turėtų | atkeliauti | per | 5–7 | darbo | dienas.",
        "Kortelė turėtų atkeliauti per 5–7 darbo dienas.", { say: "Your card should arrive in five to seven business days." }),
    ],
    pin_info: [
      t("You | can | set | your | PIN | in | our | app.", "Jūs | galite | nustatyti | savo | PIN kodą | — | mūsų | programėlėje.", "PIN kodą galėsite nustatyti mūsų programėlėje.",
        { flags: { 5: "“in”: the locative programėlėje carries it." } }),
      t("The | PIN | comes | separately, | in a letter.", "— | PIN kodas | ateina | atskirai, | laišku.", "PIN kodą gausite atskirai, laišku."),
    ],
    routing: [
      t("Here's | your | account | number | and | our | routing | number | for | your | employer.",
        "Štai | jūsų | sąskaitos | numeris | ir | mūsų | maršruto | numeris | — | jūsų | darbdaviui.",
        "Štai jūsų sąskaitos numeris ir mūsų banko kodas (routing number) – jų reikės jūsų darbdaviui.",
        { flags: { 8: "“for”: the dative darbdaviui carries it." }, write: "Harbor Bank · account no. 4817 2203 · routing no. 021 000 356" }),
    ],
    offer_savings: [
      t("Would | you | like | a | savings | account | too? | There's | no | monthly | fee.",
        "Ar | jūs | norėtumėte | — | taupomosios | sąskaitos | taip pat? | Nėra | jokio | mėnesinio | mokesčio.",
        "Gal norėtumėte ir taupomosios sąskaitos? Mėnesinio mokesčio nėra.",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte.", 8: "Negative concord: nėra is the negated copula; the object takes the genitive." } }),
    ],
    offer_savings_again: [
      t("So, | a | savings | account | too?", "Tai | — | taupomąją | sąskaitą | irgi?", "Tai gal ir taupomąją sąskaitą?"),
    ],
    offer_app_again: [
      t("So, | would | you | like | our | app?", "Tai | ar | jūs | norėtumėte | mūsų | programėlės?", "Tai ar norėtumėte mūsų programėlės?",
        { flags: { 1: "“would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
    ],
    savings_yes: [t("Great, | I'll add | that | too.", "Puiku, | pridėsiu | tai | irgi.", "Puiku, pridėsiu ir ją.")],
    offer_app: [
      t("Would | you | like | to set up | our | mobile | app?", "Ar | jūs | norėtumėte | įsidiegti | mūsų | mobiliąją | programėlę?", "Ar norėtumėte įsidiegti mūsų mobiliąją programėlę?",
        { flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte." } }),
    ],
    app_features: [
      t("You | can | check | your | balance | and | pay | bills | on | your | phone.", "Jūs | galite | tikrinti | savo | likutį | ir | mokėti | sąskaitas | — | savo | telefonu.",
        "Telefonu galėsite tikrinti likutį ir mokėti sąskaitas.", { flags: { 8: "“on”: the instrumental telefonu carries it." } }),
    ],
    app_yes: [
      t("Great! | Just | scan | this | code | with | your | phone.", "Puiku! | Tiesiog | nuskenuokite | šį | kodą | — | savo | telefonu.", "Puiku! Tiesiog nuskenuokite šį kodą telefonu.",
        { flags: { 5: "“with”: the instrumental telefonu carries it." } }),
    ],
    app_no: [t("No | problem. | You | can | download | it | later.", "Jokių | problemų. | Jūs | galėsite | atsisiųsti | ją | vėliau.", "Jokių problemų, atsisiųsite vėliau.")],
    no_problem: [t("No | problem.", "Jokių | problemų.", "Jokių problemų.")],
    anything_else: [
      t("Anything | else | I | can | do | for you?", "Ką nors | dar | aš | galiu | padaryti | jums?", "Ar dar kuo nors galiu padėti?"),
      t("Can | I | help | you | with anything | else?", "Ar galiu | aš | padėti | jums | kuo nors | dar?", "Ar dar kuo nors galiu jums padėti?"),
    ],
    anything_else_yes: [t("Sure, | what | can | I | do | for you?", "Žinoma, | ką | galiu | aš | padaryti | jums?", "Žinoma, kuo galiu padėti?")],
    bye: [
      t("Thank | you | for | choosing | Harbor Bank! | Have | a | great | day.", "Dėkoju | jums, | kad | pasirinkote | „Harbor Bank“! | Linkiu | — | puikios | dienos.",
        "Ačiū, kad pasirinkote „Harbor Bank“! Puikios dienos."),
      t("Thanks | for | coming | in! | Have | a | good | one.", "Ačiū, | kad | užsukote | —! | Linkiu | — | geros | dienos.", "Ačiū, kad užsukote! Geros dienos.",
        { flags: { 3: "“in” (come in): the prefix už- of užsukote carries it.", 7: "Prop-word “one” = the day: dienos." } }),
    ],

    // questions about the account
    fee_info: [
      t("There's | a | $12 | monthly | fee, | but | we | waive | it | if | your | paycheck | goes | into | the | account.",
        "Yra | — | 12 dolerių | mėnesinis | mokestis, | bet | mes | atsisakome | jo, | jei | jūsų | atlyginimas | patenka | į | — | sąskaitą.",
        "Yra 12 dolerių mėnesinis mokestis, bet jo netaikome, jei į sąskaitą gaunate atlyginimą.",
        { say: "There's a twelve-dollar monthly fee, but we waive it if your paycheck goes into the account." }),
    ],
    fee_waive: [
      t("Or | if | you | keep | at least | $1,500 | in the account.", "Arba | jei | jūs | laikote | bent | 1 500 dolerių | sąskaitoje.",
        "Arba jei sąskaitoje laikote bent 1 500 dolerių.", { say: "Or if you keep at least fifteen hundred dollars in the account." }),
    ],
    savings_fee: [
      t("The | savings | account | has | no | monthly | fee.", "— | Taupomoji | sąskaita | neturi | jokio | mėnesinio | mokesčio.", "Taupomajai sąskaitai mėnesinis mokestis netaikomas.",
        { flags: { 3: "Negative concord: neturi is the negated verb; the object takes the genitive." } }),
    ],
    interest_info: [
      t("Right now | it's | 1.5 | percent | a | year.", "Šiuo metu | tai yra | 1,5 | procento | per | metus.", "Šiuo metu – 1,5 procento per metus.",
        { say: "Right now it's one and a half percent a year.", flags: { 4: "Distributive “a” (a year = each year) has a real Lithuanian word here: per." } }),
    ],
    card_abroad: [
      t("Yes, | you | can. | There's | a | 3% | fee | for | purchases | abroad.", "Taip, | jūs | galite. | Yra | — | 3 % | mokestis | už | pirkinius | užsienyje.",
        "Taip, galite. Už pirkinius užsienyje taikomas 3 % mokestis.", { say: "Yes, you can. There's a three percent fee for purchases abroad." }),
    ],
    app_info: [
      t("Yes! | Our | app | is | free. | You | can | check | your | balance | and | pay | bills.", "Taip! | Mūsų | programėlė | yra | nemokama. | Jūs | galite | tikrinti | savo | likutį | ir | mokėti | sąskaitas.",
        "Taip! Mūsų programėlė nemokama. Joje galite tikrinti likutį ir mokėti sąskaitas."),
    ],
    atm_where: [
      t("There's | an | ATM | right | outside, | by | the | front | door.", "Yra | — | bankomatas | čia pat | lauke, | prie | — | pagrindinių | durų.",
        "Bankomatas yra čia pat lauke, prie pagrindinių durų."),
    ],
    atm_free: [
      t("Our | ATMs | are | free | for | our | customers.", "Mūsų | bankomatai | yra | nemokami | — | mūsų | klientams.", "Mūsų bankomatai mūsų klientams nemokami.",
        { flags: { 4: "“for”: the dative klientams carries it." } }),
    ],
    open_need: [
      t("Just | your | ID, | proof | of address | and | at least | $25.", "Tik | jūsų | asmens dokumento, | įrodymo | adreso | ir | bent | 25 dolerių.",
        "Tik asmens dokumento, adreso įrodymo ir bent 25 dolerių.", { say: "Just your ID, proof of address and at least twenty-five dollars." }),
    ],
    open_time: [
      t("It | only | takes | about | 15 | minutes.", "Tai | tik | užtrunka | apie | 15 | minučių.", "Tai užtrunka tik apie 15 minučių.",
        { say: "It only takes about fifteen minutes." }),
    ],

    // transfer
    transfer_how: [
      t("You | can | send | an | international | wire | transfer.", "Jūs | galite | atlikti | — | tarptautinį | banko | pervedimą.", "Galite atlikti tarptautinį banko pervedimą."),
      t("The | best | way | is | an | international | wire | transfer.", "— | Geriausias | būdas | yra | — | tarptautinis | banko | pervedimas.", "Geriausia – tarptautinis banko pervedimas."),
    ],
    transfer_cost: [
      t("It | costs | $40, | and | it | usually | takes | 1–2 | business | days.", "Jis | kainuoja | 40 dolerių, | ir | jis | paprastai | trunka | 1–2 | darbo | dienas.",
        "Jis kainuoja 40 dolerių ir paprastai trunka 1–2 darbo dienas.", { say: "It costs forty dollars, and it usually takes one to two business days." }),
    ],
    transfer_fee: [
      t("It | costs | $40 | per | transfer.", "Jis | kainuoja | 40 dolerių | už | pervedimą.", "Vienas pervedimas kainuoja 40 dolerių.", { say: "It costs forty dollars per transfer." }),
    ],
    transfer_time: [
      t("Usually | 1–2 | business | days.", "Paprastai | 1–2 | darbo | dienas.", "Paprastai 1–2 darbo dienas.", { say: "Usually one to two business days." }),
    ],
    transfer_need: [
      t("You'll need | the | IBAN | and | the | bank's | SWIFT | code.", "Jums reikės | — | IBAN | ir | — | banko | SWIFT | kodo.", "Jums reikės gavėjo IBAN numerio ir banko SWIFT kodo.",
        { write: "International wire: $40 · 1–2 business days · recipient's name, IBAN, SWIFT code" }),
    ],
    swift_explain: [
      t("It's | the | bank's | international | code. | The | bank | in Lithuania | can | give | it | to you.",
        "Tai yra | — | banko | tarptautinis | kodas. | — | Bankas | Lietuvoje | gali | duoti | jį | jums.",
        "Tai tarptautinis banko kodas. Jį jums gali pasakyti bankas Lietuvoje.", { spell: "SWIFT" }),
    ],
    transfer_app: [
      t("Yes, | you | can | also | do | it | in the app.", "Taip, | jūs | galite | taip pat | padaryti | tai | programėlėje.", "Taip, tai galite padaryti ir programėlėje."),
    ],

    // exchange
    ask_customer: [
      t("Do | you | have | an | account | with us?", "Ar | jūs | turite | — | sąskaitą | pas mus?", "Ar turite pas mus sąskaitą?", { flags: { 0: "Question “Do” = the particle ar." } }),
    ],
    ask_customer_again: [
      t("So, | do | you | have | an | account | with us?", "Tai | ar | jūs | turite | — | sąskaitą | pas mus?", "Tai ar turite pas mus sąskaitą?", { flags: { 1: "Question “do” = the particle ar." } }),
    ],
    customers_only: [
      t("I'm sorry, | we | only | exchange | currency | for | our | customers.", "Atsiprašau, | mes | tik | keičiame | valiutą | — | mūsų | klientams.",
        "Atsiprašau, valiutą keičiame tik savo klientams.", { flags: { 5: "“for”: the dative klientams carries it." } }),
    ],
    need_account_wire: [
      t("You'll need | an | account | with us | to send | a | wire.", "Jums reikės | — | sąskaitos | pas mus, | kad išsiųstumėte | — | pervedimą.",
        "Norint atlikti pervedimą, jums reikės sąskaitos mūsų banke."),
    ],
    offer_open: [
      t("Would | you | like | to open | one? | It | only | takes | about | 15 | minutes.", "Ar | jūs | norėtumėte | atsidaryti | ją? | Tai | tik | užtrunka | apie | 15 | minučių.",
        "Gal norėtumėte atsidaryti? Tai užtrunka tik apie 15 minučių.",
        { say: "Would you like to open one? It only takes about fifteen minutes.", flags: { 0: "“Would” in a yes/no question = the particle ar; the conditional sits on norėtumėte.", 4: "Prop-word “one” = the account: ją." } }),
    ],
    customer_yes: [
      t("Great, | then | you | can | do | it | in | our | app | or | here.", "Puiku, | tada | jūs | galite | padaryti | tai | — | mūsų | programėlėje | ar | čia.",
        "Puiku, tada galite tai padaryti mūsų programėlėje arba čia.", { flags: { 6: "“in”: the locative programėlėje carries it." } }),
    ],
    exchange_rate: [
      t("Today, | one | euro | is | $1.15, | and | there's | a | $5 | fee.", "Šiandien | vienas | euras | yra | 1,15 dolerio, | ir | yra | — | 5 dolerių | mokestis.",
        "Šiandien už vieną eurą – 1,15 dolerio, taikomas 5 dolerių mokestis.", { say: "Today, one euro is a dollar fifteen, and there's a five-dollar fee." }),
    ],
    ask_euros: [
      t("How many | euros | would | you | like | to exchange?", "Kiek | eurų | — | jūs | norėtumėte | išsikeisti?", "Kiek eurų norėtumėte išsikeisti?",
        { flags: { 2: "“would”: the conditional ending of norėtumėte carries it (linked to “like”)." } }),
    ],
    exchange_done: [
      t("Here you go: | {$amount}. | Here's | your | receipt.", "Prašom: | {$amount}. | Štai | jūsų | kvitas.", "Prašom, {$amount}. Štai jūsų kvitas."),
    ],
    exchange_done_generic: [
      t("Here you go. | The | rate | and | the | fee | are | on | your | receipt.", "Prašom. | — | Kursas | ir | — | mokestis | yra | — | jūsų | kvite.",
        "Prašom. Kursas ir mokestis nurodyti kvite.", { flags: { 7: "“on”: the locative kvite carries it." } }),
    ],

    // the card (twist)
    card_sorry: [
      t("Oh | no, | I'm sorry | about | that!", "O | ne, | atsiprašau | dėl | to!", "O ne, atsiprašau!"),
      t("Oh | no! | That's | frustrating.", "O | ne! | Tai yra | nemalonu.", "O ne! Tai tikrai nemalonu."),
    ],
    ask_pin: [
      t("Did | you | enter | the | wrong | PIN?", "Ar | jūs | įvedėte | — | neteisingą | PIN kodą?", "Ar įvedėte neteisingą PIN kodą?"),
      t("Did | you | type | the | wrong | PIN | a | few | times?", "Ar | jūs | surinkote | — | neteisingą | PIN kodą | — | kelis | kartus?", "Ar kelis kartus surinkote neteisingą PIN kodą?"),
    ],
    pin_explain: [
      t("That's | probably | why. | After | three | wrong | tries, | the | machine | keeps | the | card.",
        "Tai | tikriausiai | dėl to. | Po | trijų | neteisingų | bandymų | — | bankomatas | pasilieka | — | kortelę.",
        "Tikriausiai dėl to. Po trijų neteisingų bandymų bankomatas pasilieka kortelę.",
        { flags: { 0: "“is” is not repeated in Lithuanian: Tai … dėl to." } }),
    ],
    machine_problem: [
      t("Then | it | might | be | a | problem | with | the | machine.", "Tada | tai | gali | būti | — | problema | su | — | bankomatu.", "Tada gal kas nors negerai su bankomatu."),
    ],
    block_new: [
      t("For | your | security, | I'll cancel | that | card | and | order | you | a | new one.", "Dėl | jūsų | saugumo | užblokuosiu | tą | kortelę | ir | užsakysiu | jums | — | naują.",
        "Jūsų saugumui užblokuosiu tą kortelę ir užsakysiu jums naują."),
    ],
    ask_id_card: [
      t("Can | I | see | your | ID, | please?", "Ar galiu | aš | pamatyti | jūsų | asmens dokumentą, | prašau?", "Ar galiu pamatyti jūsų asmens dokumentą?"),
      t("First, | could | I | see | your | ID?", "Pirmiausia, | ar galėčiau | aš | pamatyti | jūsų | asmens dokumentą?", "Pirmiausia, ar galėčiau pamatyti jūsų asmens dokumentą?"),
    ],
    card_blocked: [
      t("Okay, | the | old | card | is | blocked.", "Gerai, | — | senoji | kortelė | yra | užblokuota.", "Gerai, senoji kortelė užblokuota."),
    ],
    new_card_info: [
      t("Your | new | card | should | arrive | in | 5–7 | business | days.", "Jūsų | nauja | kortelė | turėtų | atkeliauti | per | 5–7 | darbo | dienas.",
        "Nauja kortelė turėtų atkeliauti per 5–7 darbo dienas.", { say: "Your new card should arrive in five to seven business days." }),
    ],
    already_blocked: [t("It's | already | blocked, | don't worry.", "Ji yra | jau | užblokuota, | nesijaudinkite.", "Ji jau užblokuota, nesijaudinkite.")],
    block_first: [t("Of course. | I'll do | that | right away.", "Žinoma. | Padarysiu | tai | iš karto.", "Žinoma. Tuoj pat tai padarysiu.")],
    offer_cash: [
      t("Do | you | need | any | cash | in the meantime?", "Ar | jums | reikia | — | grynųjų | kol kas?", "Ar kol kas jums reikia grynųjų?",
        { flags: { 0: "Question “Do” = the particle ar.", 3: "Partitive: the genitive grynųjų carries “any”." } }),
    ],
    offer_cash_counter: [
      t("I | can | give | you | some | cash | here | at | the | counter.", "Aš | galiu | duoti | jums | — | grynųjų | čia, | prie | — | langelio.",
        "Galiu jums išmokėti grynųjų čia, prie langelio.", { flags: { 4: "Partitive: the genitive grynųjų carries “some”." } }),
    ],
    ask_cash_amount: [
      t("Sure. | How much | would | you | like | to take out?", "Žinoma. | Kiek | — | jūs | norėtumėte | išsiimti?", "Žinoma. Kiek norėtumėte išsiimti?",
        { flags: { 2: "“would”: the conditional ending of norėtumėte carries it." } }),
      t("How much | would | you | like | to take out | today?", "Kiek | — | jūs | norėtumėte | išsiimti | šiandien?", "Kiek šiandien norėtumėte išsiimti?",
        { flags: { 1: "“would”: the conditional ending of norėtumėte carries it." } }),
    ],
    need_account_cash: [
      t("You | need | an | account | with us | to take out | cash | here.", "Jums | reikia | — | sąskaitos | pas mus, | kad išsiimtumėte | grynųjų | čia.",
        "Kad galėtumėte čia išsiimti grynųjų, reikia turėti sąskaitą mūsų banke."),
    ],
    ask_bills: [
      t("Are | twenties | okay?", "Ar | dvidešimtinės | tinka?", "Ar gerai dvidešimtinėmis?", { flags: { 0: "“Are” in a question = the particle ar; the verb tinka takes over the copula (linked to “okay”)." } }),
      t("How | would | you | like | it? | Twenties?", "Kokiomis | — | jūs | norėtumėte | kupiūromis? | Dvidešimtinėmis?", "Kokiomis kupiūromis norėtumėte? Dvidešimtinėmis?",
        { flags: { 0: "“How … like it” (which bills): Kokiomis … kupiūromis.", 1: "“would”: the conditional ending of norėtumėte carries it.", 4: "“it” (the cash) is expressed by kupiūromis (in which bills)." } }),
    ],
    here_cash: [
      t("Here you go.", "Prašom.", "Prašom."),
      t("Here's | your | cash.", "Štai | jūsų | grynieji.", "Štai jūsų grynieji."),
    ],
    old_card_back: [
      t("I'm sorry, | but | for | security | reasons | we | can't return | it.", "Atsiprašau, | bet | — | saugumo | sumetimais | mes | negalime grąžinti | jos.",
        "Atsiprašau, bet saugumo sumetimais negalime jos grąžinti.", { flags: { 2: "“for”: the instrumental sumetimais carries it." } }),
    ],
    account_safe: [
      t("Yes, | your | money | is | safe. | Only | the | card | is | blocked.", "Taip, | jūsų | pinigai | yra | saugūs. | Tik | — | kortelė | yra | užblokuota.",
        "Taip, jūsų pinigai saugūs. Užblokuota tik kortelė."),
    ],
    new_card_yes: [
      t("Yes, | we'll send | you | a | new one | by mail.", "Taip, | atsiųsime | jums | — | naują | paštu.", "Taip, naują atsiųsime paštu."),
    ],

    // slow system (twist)
    slow: [
      t("Sorry, | our | system | is | a little | slow | today. | Could | you | bear with | me | for a moment?",
        "Atsiprašau, | mūsų | sistema | yra | truputį | lėta | šiandien. | Ar galėtumėte | jūs | palaukti | manęs | akimirką?",
        "Atsiprašau, šiandien mūsų sistema kiek lėta. Ar galėtumėte akimirką palaukti?"),
    ],
    slow_thanks: [
      t("Thanks | for | your | patience! | Okay, | it's working | again.", "Ačiū | už | jūsų | kantrybę! | Gerai, | ji veikia | vėl.", "Ačiū už kantrybę! Gerai, vėl veikia."),
    ],
  },

  domains: {
    amount: () => { const s: number[] = []; for (let e = 10; e <= 2000; e += 10) s.push(exchanged(e)); return s; },
  },

  hints: {
    open: {
      lt: "Pasakyti, kad nori atsidaryti sąskaitą", slot: "acct", examples: ["checking", "savings"],
      items: [
        { id: "open_like", s: t("I'd like | to open | {X.np}.", "Norėčiau | atsidaryti | {X.np:acc}.", "Norėčiau atsidaryti {X.np:acc}.") },
        { id: "open_need", s: t("I | need | a | bank | account.", "Man | reikia | — | banko | sąskaitos.", "Man reikia banko sąskaitos.") },
        { id: "open_could", s: t("Could | I | open | {X.np}, | please?", "Ar galėčiau | aš | atsidaryti | {X.np:acc}, | prašau?", "Ar galėčiau atsidaryti {X.np:acc}?"), register: "polite" },
        { id: "open_can", s: t("Can | I | open | {X.np} | here?", "Ar galiu | aš | atsidaryti | {X.np:acc} | čia?", "Ar galiu čia atsidaryti {X.np:acc}?") },
        { id: "open_want", s: t("I | want | to open | an | account.", "Aš | noriu | atsidaryti | — | sąskaitą.", "Noriu atsidaryti sąskaitą."), register: "casual" },
        { id: "open_how", s: t("How | do | I | open | an | account?", "Kaip | — | man | atsidaryti | — | sąskaitą?", "Kaip man atsidaryti sąskaitą?",
          { flags: { 1: "Question “do” has no Lithuanian word; Lithuanian uses the infinitive with the dative man." } }) },
        { id: "open_here", s: t("I'm | here | to open | an | account.", "Aš esu | čia, | kad atsidaryčiau | — | sąskaitą.", "Atėjau atsidaryti sąskaitos.") },
        { id: "open_looking", s: t("I'm looking | to open | {X.np}.", "Planuoju | atsidaryti | {X.np:acc}.", "Norėčiau atsidaryti {X.np:acc}."), register: "casual",
          note: "„I'm looking to …“ – amerikietiška šnekamoji frazė: planuoju, norėčiau." },
      ],
    },
    acct_type: {
      lt: "Pasirinkti sąskaitos rūšį", slot: "acct", examples: ["checking", "savings"],
      items: [
        { id: "type_short", s: t("A | {X}, | please.", "— | {X:acc}, | prašau.", "{X:acc}, prašau.") },
        { id: "type_like", s: t("I'd like | {X.np}.", "Norėčiau | {X.np:gen}.", "Norėčiau {X.np:gen}.") },
        { id: "type_both", s: t("Both, | please.", "Abi, | prašau.", "Abi, prašau.") },
        { id: "q_difference", s: t("What's | the | difference?", "Koks yra | — | skirtumas?", "Koks skirtumas?") },
        { id: "q_recommend", s: t("Which one | do | you | recommend?", "Kurią | — | jūs | rekomenduojate?", "Kurią rekomenduojate?",
          { flags: { 1: "Question “do” has no Lithuanian word (linked to “recommend”)." } }) },
      ],
    },
    id: {
      lt: "Parodyti asmens dokumentą",
      items: [
        { id: "id_here", s: t("Here's | my | passport.", "Štai | mano | pasas.", "Štai mano pasas.") },
        { id: "form_here", s: t("Sure, | here you go.", "Žinoma, | prašom.", "Žinoma, prašom.") },
        { id: "id_ok", s: t("Is | a | passport | okay?", "Ar | — | pasas | tinka?", "Ar tinka pasas?", { flags: { 0: "“Is” in a question = the particle ar; the verb tinka takes over the copula (linked to “okay”)." } }) },
        { id: "id_only", s: t("I | only | have | my | passport.", "Aš | tik | turiu | savo | pasą.", "Turiu tik pasą.") },
        { id: "id_license", s: t("I | also | have | a | driver's | license.", "Aš | taip pat | turiu | — | vairuotojo | pažymėjimą.", "Turiu ir vairuotojo pažymėjimą.") },
      ],
    },
    proof: {
      lt: "Parodyti adreso įrodymą",
      items: [
        { id: "proof_lease", s: t("Here's | my | lease.", "Štai | mano | nuomos sutartis.", "Štai mano nuomos sutartis.") },
        { id: "proof_bill", s: t("I | have | a | utility | bill.", "Aš | turiu | — | komunalinių paslaugų | sąskaitą.", "Turiu komunalinių paslaugų sąskaitą.") },
        { id: "proof_ok", s: t("Is | a | lease | okay?", "Ar | — | nuomos sutartis | tinka?", "Ar tinka nuomos sutartis?", { flags: { 0: "“Is” in a question = the particle ar; the verb tinka takes over the copula (linked to “okay”)." } }) },
        { id: "proof_moved", s: t("I | just | moved | here.", "Aš | ką tik | persikėliau | čia.", "Ką tik čia persikėliau.") },
        { id: "proof_none", s: t("I | don't have | a | bill | yet.", "Aš | neturiu | — | sąskaitos | kol kas.", "Kol kas neturiu jokios sąskaitos už paslaugas.") },
      ],
    },
    ssn: {
      lt: "Atsakyti apie socialinio draudimo numerį",
      items: [
        { id: "ssn_notyet", s: t("No, | I | don't have | one | yet.", "Ne, | aš | neturiu | jo | kol kas.", "Ne, kol kas jo neturiu.") },
        { id: "ssn_waiting", s: t("I'm | still | waiting | for it.", "Aš | vis dar | laukiu | jo.", "Vis dar jo laukiu.",
          { flags: { 0: "Progressive “am” has no separate Lithuanian word; laukiu carries the tense (linked to “waiting”)." } }) },
        { id: "ssn_problem", s: t("Is | that | a | problem?", "Ar | tai | — | problema?", "Ar tai problema?", { flags: { 0: "“Is” in a question = the particle ar; Lithuanian needs no copula here." } }) },
        { id: "ssn_what", s: t("What's | a | Social | Security | number?", "Kas yra | — | socialinio | draudimo | numeris?", "Kas yra socialinio draudimo numeris?") },
      ],
    },
    form: {
      lt: "Užpildyti formą ir pasirašyti",
      items: [
        { id: "form_done", s: t("Okay, | done.", "Gerai, | baigta.", "Gerai, baigiau.") },
        { id: "form_here", s: t("Here you go.", "Prašom.", "Prašom.") },
        { id: "form_where", s: t("Where | do | I | sign?", "Kur | — | man | pasirašyti?", "Kur man pasirašyti?", { flags: { 1: "Question “do” has no Lithuanian word; Lithuanian uses the infinitive with the dative man." } }) },
        { id: "form_pen", s: t("Could | I | borrow | a | pen?", "Ar galėčiau | aš | pasiskolinti | — | rašiklį?", "Ar galėčiau pasiskolinti rašiklį?") },
        { id: "form_what", s: t("What | should | I | write | here?", "Ką | turėčiau | aš | rašyti | čia?", "Ką čia rašyti?") },
      ],
    },
    deposit: {
      lt: "Pasakyti, kiek pinigų įneši",
      items: [
        { id: "dep_like", s: t("I'd like | to deposit | $200.", "Norėčiau | įnešti | 200 dolerių.", "Norėčiau įnešti 200 dolerių.", { say: "I'd like to deposit two hundred dollars." }) },
        { id: "dep_cash", s: t("$100, | in cash.", "100 dolerių, | grynaisiais.", "100 dolerių grynaisiais.", { say: "A hundred dollars, in cash." }) },
        { id: "dep_min", s: t("Just | the | minimum, | please.", "Tik | — | minimumą, | prašau.", "Tik minimalią sumą, prašau.") },
        { id: "dep_q", s: t("How much | is | the | minimum?", "Kokia | yra | — | minimali suma?", "Kokia minimali suma?") },
      ],
    },
    ask_acct: {
      lt: "Paklausti apie mokesčius, kortelę ir programėlę",
      items: [
        { id: "q_fee", s: t("Is | there | a | monthly | fee?", "Ar yra | — | — | mėnesinis | mokestis?", "Ar yra mėnesinis mokestis?", { flags: { 1: "Existential “there” has no Lithuanian word; Ar yra carries “Is there”." } }) },
        { id: "q_card_when", s: t("When | will | I | get | my | card?", "Kada | — | aš | gausiu | savo | kortelę?", "Kada gausiu kortelę?", { flags: { 1: "“will”: the future ending of gausiu carries it (linked to “get”)." } }) },
        { id: "q_abroad", s: t("Can | I | use | the | card | in Lithuania?", "Ar galiu | aš | naudotis | — | kortele | Lietuvoje?", "Ar galiu naudotis kortele Lietuvoje?") },
        { id: "q_app", s: t("Do | you | have | an | app?", "Ar | jūs | turite | — | programėlę?", "Ar turite programėlę?", { flags: { 0: "Question “Do” = the particle ar." } }) },
        { id: "q_atm", s: t("Where's | the | nearest | ATM?", "Kur yra | — | artimiausias | bankomatas?", "Kur artimiausias bankomatas?") },
        { id: "q_interest", s: t("What's | the | interest | rate?", "Kokia yra | — | palūkanų | norma?", "Kokia palūkanų norma?") },
      ],
    },
    transfer: {
      lt: "Paklausti, kaip pervesti pinigų į Lietuvą",
      items: [
        { id: "tr_how", s: t("How | can | I | send | money | to | Lithuania?", "Kaip | galiu | aš | nusiųsti | pinigų | į | Lietuvą?", "Kaip galiu nusiųsti pinigų į Lietuvą?") },
        { id: "tr_like", s: t("I'd like | to send | money | home.", "Norėčiau | nusiųsti | pinigų | namo.", "Norėčiau nusiųsti pinigų namo.") },
        { id: "tr_cost", s: t("How much | does | it | cost?", "Kiek | — | tai | kainuoja?", "Kiek tai kainuoja?", { flags: { 1: "Question “does” has no Lithuanian word (linked to “cost”)." } }) },
        { id: "tr_long", s: t("How | long | does | it | take?", "Kaip | ilgai | — | tai | trunka?", "Kiek laiko tai trunka?", { flags: { 2: "Question “does” has no Lithuanian word (linked to “take”)." } }) },
        { id: "tr_need", s: t("What | do | I | need?", "Ko | — | man | reikia?", "Ko man reikia?", { flags: { 1: "Question “do” has no Lithuanian word; reikia takes the dative man." } }) },
        { id: "tr_swift", s: t("What's | a | SWIFT | code?", "Kas yra | — | SWIFT | kodas?", "Kas yra SWIFT kodas?") },
        { id: "tr_app", s: t("Can | I | do | it | in the app?", "Ar galiu | aš | padaryti | tai | programėlėje?", "Ar galiu tai padaryti programėlėje?") },
      ],
    },
    exchange: {
      lt: "Išsikeisti eurų į dolerius",
      items: [
        { id: "ex_like", s: t("I'd like | to change | some | euros | into | dollars.", "Norėčiau | išsikeisti | — | eurų | į | dolerius.", "Norėčiau išsikeisti eurų į dolerius.",
          { flags: { 2: "Partitive: the genitive eurų carries “some”." } }) },
        { id: "ex_could", s: t("Could | I | exchange | some | euros?", "Ar galėčiau | aš | išsikeisti | — | eurų?", "Ar galėčiau išsikeisti eurų?", { flags: { 3: "Partitive: the genitive eurų carries “some”." } }) },
        { id: "ex_rate", s: t("What's | the | exchange | rate?", "Koks yra | — | valiutos | kursas?", "Koks valiutos kursas?") },
        { id: "ex_fee", s: t("Is | there | a | fee?", "Ar yra | — | — | mokestis?", "Ar yra mokestis?", { flags: { 1: "Existential “there” has no Lithuanian word; Ar yra carries “Is there”." } }) },
      ],
    },
    card: {
      lt: "Pranešti, kad bankomatas pasiliko kortelę",
      items: [
        { id: "card_kept", s: t("The | ATM | outside | kept | my | card.", "— | Bankomatas | lauke | pasiliko | mano | kortelę.", "Bankomatas lauke pasiliko mano kortelę.") },
        { id: "card_stuck", s: t("My | card | got stuck | in the ATM.", "Mano | kortelė | įstrigo | bankomate.", "Mano kortelė įstrigo bankomate.") },
        { id: "card_ate", s: t("The | machine | ate | my | card.", "— | Bankomatas | prarijo | mano | kortelę.", "Bankomatas prarijo mano kortelę."), register: "casual",
          note: "Šnekamoji, šiek tiek juokinga frazė – bet visi supras." },
        { id: "card_pin", s: t("I | entered | the | wrong | PIN.", "Aš | įvedžiau | — | neteisingą | PIN kodą.", "Įvedžiau neteisingą PIN kodą.") },
        { id: "card_block", s: t("Could | you | block | it, | please?", "Ar galėtumėte | jūs | užblokuoti | ją, | prašau?", "Ar galėtumėte ją užblokuoti?") },
        { id: "card_new", s: t("Can | I | get | a | new | card?", "Ar galiu | aš | gauti | — | naują | kortelę?", "Ar galiu gauti naują kortelę?") },
      ],
    },
    cash: {
      lt: "Išsiimti grynųjų prie langelio",
      items: [
        { id: "cash_amount", s: t("I'd like | to take out | $200.", "Norėčiau | išsiimti | 200 dolerių.", "Norėčiau išsiimti 200 dolerių.", { say: "I'd like to take out two hundred dollars." }) },
        { id: "cash_short", s: t("$100, | please.", "100 dolerių, | prašau.", "100 dolerių, prašau.", { say: "A hundred dollars, please." }) },
        { id: "cash_take", s: t("Can | I | take out | some | cash | here?", "Ar galiu | aš | išsiimti | — | grynųjų | čia?", "Ar galiu čia išsiimti grynųjų?", { flags: { 3: "Partitive: the genitive grynųjų carries “some”." } }) },
      ],
    },
    bills: {
      lt: "Pasakyti, kokiomis kupiūromis",
      items: [
        { id: "cash_twenties", s: t("Twenties | are fine.", "Dvidešimtinės | tinka.", "Dvidešimtinėmis gerai."), note: "„Twenties“ – dvidešimties dolerių banknotai." },
        { id: "cash_small", s: t("Some | smaller | bills, | please.", "— | Smulkesnėmis | kupiūromis, | prašau.", "Smulkesnėmis kupiūromis, prašau.",
          { flags: { 0: "Partitive “some”: the instrumental kupiūromis (in which bills) carries it." } }) },
      ],
    },
    euros: {
      lt: "Pasakyti, kiek eurų keisi",
      items: [
        { id: "ex_amount", s: t("200 | euros, | please.", "200 | eurų, | prašau.", "200 eurų, prašau.", { say: "Two hundred euros, please." }) },
        { id: "ex_all", s: t("All | of them, | please.", "Visus, | — | prašau.", "Visus, prašau.", { flags: { 1: "“of them”: Lithuanian says visus (all of them) with no separate word." } }) },
      ],
    },
    pin: {
      lt: "Atsakyti, ar įvedei neteisingą PIN kodą",
      items: [
        { id: "card_pin", s: t("I | entered | the | wrong | PIN.", "Aš | įvedžiau | — | neteisingą | PIN kodą.", "Įvedžiau neteisingą PIN kodą.") },
        { id: "pin_no", s: t("No, | I | don't think | so.", "Ne, | aš | nemanau | —.", "Ne, nemanau.", { flags: { 3: "“so” (think so): Lithuanian nemanau needs no object." } }) },
      ],
    },
    patience: {
      lt: "Pasakyti, kad gali palaukti",
      items: [
        { id: "np_sure", s: t("Sure, | no | problem.", "Žinoma, | jokių | problemų.", "Žinoma, jokių problemų.") },
        { id: "np_time", s: t("No | problem, | take your time.", "Jokių | problemų, | neskubėkite.", "Jokių problemų, neskubėkite.") },
      ],
    },
    more: {
      lt: "Pasakyti, kad daugiau nieko nereikia",
      items: [
        { id: "more_all", s: t("No, | that's | all, | thanks.", "Ne, | tai yra | viskas, | ačiū.", "Ne, tai viskas, ačiū.") },
        { id: "more_everything", s: t("That's | everything | for today.", "Tai yra | viskas | šiandienai.", "Šiandien tai viskas.") },
        { id: "more_question", s: t("Actually, | I | have | a | question.", "Tiesą sakant, | aš | turiu | — | klausimą.", "Tiesą sakant, turiu klausimą.") },
      ],
    },
  },

  tips: {
    uk_cash: { key: "uk_cash", lt: "Suprasta! Amerikoje sakoma „ATM“ (ei-ti-em).", better: "The ATM kept my card." },
    uk_current: { key: "uk_current", lt: "Suprasta! Amerikoje einamoji sąskaita vadinama „checking account“.", better: "I'd like to open a checking account." },
    uk_tenancy: { key: "uk_tenancy", lt: "Suprasta! Amerikoje nuomos sutartis dažniausiai vadinama „lease“.", better: "Here's my lease." },
    uk_fill_in: { key: "uk_fill_in", lt: "Suprasta! Apie formas amerikiečiai dažniau sako „fill out“.", better: "Should I fill out this form?" },
    uk_post: { key: "uk_post", lt: "Suprasta! Amerikoje sakoma „by mail“ (paštu), o ne „by post“.", better: "Will the card come by mail?" },
  },

  merges: {
    "harbor bank": { reason: "lexical_expression", split: "Harbor → uostas + Bank → bankas would translate the bank's proper name.", minimal: "A two-word name." },
    "all set": { reason: "lexical_expression", split: "all → visi + set → nustatyti is false; “be all set” = viskas sutvarkyta.", minimal: "Two words." },
    "looking for": { reason: "lexical_expression", split: "for → už/dėl has no truthful separate gloss; look for = ieškoti (with the genitive).", minimal: "Two words.", },
    "fill out": { reason: "lexical_expression", split: "out → lauk is false; fill out a form = užpildyti.", minimal: "Two words." },
    "to take out": { reason: "grammatical_fusion", split: "to → į is false (infinitive) and out → lauk is false; take out cash = išsiimti.", minimal: "Infinitive marker and particle both belong to the verb." },
    "take out": { reason: "lexical_expression", split: "out → lauk is false; take out cash = išsiimti.", minimal: "Two words." },
    "to set up": { reason: "grammatical_fusion", split: "to → į is false (infinitive) and up → aukštyn is prohibited as mechanical; set up an app = įsidiegti.", minimal: "Infinitive marker and particle both belong to the verb." },
    "got stuck": { reason: "lexical_expression", split: "got → gavo + stuck → įstrigęs is false; get stuck = įstrigti.", minimal: "Two words." },
    "a little": { reason: "lexical_expression", split: "a → — + little → mažas gives “small”; the degree adverb “a little” = truputį.", minimal: "Two words." },
    "in the meantime": { reason: "lexical_expression", split: "in → į + the → — + meantime → tarpas is false; = kol kas.", minimal: "Fixed three-word adverbial." },
    "new one": { reason: "grammatical_fusion", split: "one → vienas would add a false numeral; prop-word “one” is absorbed by the adjective naują.", minimal: "Two words." },
    "bear with": { reason: "lexical_expression", split: "bear → nešti/lokys + with → su is false; “bear with me” = palaukite manęs.", minimal: "Two words; the object stays outside." },
    "at least": { reason: "lexical_expression", split: "at → prie + least → mažiausiai is false; = bent.", minimal: "Two words." },
    "how many": { reason: "lexical_expression", split: "how → kaip + many → daug is false; asking a number = kiek.", minimal: "Two words." },
    "go ahead": { reason: "lexical_expression", split: "go → eikite + ahead → pirmyn is a literal reading; an invitation to speak = klauskite.", minimal: "Two words." },
    "are fine": { reason: "lexical_expression", split: "are → yra + fine → gerai gives “X yra gerai”; accepting an option = tinka.", minimal: "Two words." },
    "all done": { reason: "lexical_expression", split: "all → viskas + done → padaryta could be split, but as one reply unit it means “baigta”.", minimal: "Two words." },
    "maple harbor": { reason: "lexical_expression", split: "Maple → klevas + Harbor → uostas would translate the town's proper name.", minimal: "A two-word name." },
    "right away": { reason: "lexical_expression", split: "right → teisingai/dešinėn + away → toli is false; = iš karto.", minimal: "Two words." },
    "let me know": { reason: "lexical_expression", split: "let → leiskite + me → man + know → žinoti is a calque; “let me know” = praneškite man.", minimal: "Three words; the clause stays outside." },
    "photo id": { reason: "lexical_expression", split: "photo → nuotraukos + ID → dokumento gives “a photo's document”; the compound = dokumentas su nuotrauka.", minimal: "A compound noun." },
    "take your time": { reason: "lexical_expression", split: "take → imkite, your → savo, time → laiką is a calque; = neskubėkite.", minimal: "Fixed phrase." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Pranešk apie prarytą kortelę", done: (c) => cardPath(c) && !!c.s.card, when: cardPath, optional: true },
    { lt: "Pasakyk, kokios sąskaitos nori", done: (c) => openPath(c) && !!c.s.type, when: openPath, optional: true },
    { lt: "Parodyk asmens dokumentą", done: (c) => !!c.s.id },
    { lt: "Parodyk adreso įrodymą", done: (c) => openPath(c) && c.s.proof !== undefined, when: openPath, optional: true },
    { lt: "Atsakyk dėl draudimo numerio", done: (c) => openPath(c) && c.s.ssn !== undefined, when: openPath, optional: true },
    { lt: "Užpildyk ir pasirašyk formą", done: (c) => openPath(c) && !!c.s.signed, when: openPath, optional: true },
    { lt: "Įnešk pinigų į sąskaitą", done: (c) => openPath(c) && c.s.deposit !== undefined, when: openPath, optional: true },
    { lt: "Gauk naują kortelę", done: (c) => cardPath(c) && !!c.s.blocked, when: cardPath, optional: true },
    { lt: "Sužinok apie pervedimą", done: (c) => !!c.s.toldTransfer, when: (c) => !!c.s.toldTransfer, optional: true },
  ],

  steps: [
    helpStep("help", false),
    helpStep("help_card", true),
    // account opening
    { id: "acct_type", when: opening, done: (c) => !!c.s.type,
      ask: (c) => { c.say(bump(c, "acct_type") === 0 ? "ask_type" : "ask_type_again"); },
      expects: ["acct_type_ans", "open_account", "ask_difference", "acct_type_not"],
      suggest: [{ lt: "Pasirinkti sąskaitos rūšį", hint: "acct_type", options: "acct" }, { lt: "Paklausti apie mokesčius", hint: "ask_acct" }],
      help: (c) => { c.say("explain_types"); c.say("explain_savings"); } },
    { id: "id", when: (c) => needsId(c) && opening(c), done: (c) => !!c.s.id,
      ask: (c) => {
        const n = bump(c, "id");
        if (n === 0 && c.s.idProofTogether && c.s.proof === undefined) { c.s.askedProof = true; c.say("ask_id_proof"); }
        else c.say("ask_id");
      },
      expects: ["show_doc", "here_you_go", "no_doc", "give_proof", "doc_ctx"],
      suggest: [{ lt: "Parodyti asmens dokumentą", hint: "id", options: "doc" }, { lt: "Parodyti adreso įrodymą", hint: "proof", options: "proof" }],
      yes: (c) => { c.s.id = "passport"; afterId(c); },
      no: (c) => { bank.handlers.no_doc(c, {}, { intent: "no_doc", slots: {}, tags: [] }); } },
    { id: "proof", when: opening, done: (c) => c.s.proof !== undefined,
      ask: (c) => { c.say(c.s.askedProof ? "ask_proof_again" : "ask_proof"); c.s.askedProof = true; },
      expects: ["give_proof", "no_proof", "here_you_go", "proof_ctx"],
      suggest: [{ lt: "Parodyti adreso įrodymą (arba pasakyti, kad jo dar neturi)", hint: "proof", options: "proof" }],
      yes: (c) => { c.s.proof = "lease"; c.say("proof_ok"); },
      no: (c) => { c.s.proof = "later"; c.say("proof_later"); } },
    { id: "ssn", when: opening, done: (c) => c.s.ssn !== undefined, ask: (c) => c.say("ask_ssn"),
      expects: ["ssn_none", "ssn_yes", "ask_ssn_what", "ssn_problem", "not_yet"],
      suggest: [{ lt: "Atsakyti, ar turi socialinio draudimo numerį", hint: "ssn" }],
      yes: (c) => { c.s.ssn = "yes"; c.say("ssn_yes_type"); },
      no: (c) => { c.s.ssn = "none"; c.say("ssn_none_ok"); },
      help: (c) => { c.say("ssn_explain"); } },
    { id: "slow", when: (c) => opening(c) && !!c.s.slowTwist && c.s.ssn !== undefined, done: (c) => !!c.s.slowDone,
      ask: (c) => { c.say("slow"); c.twist("slow_system"); }, expects: ["no_problem"],
      suggest: [{ lt: "Pasakyti, kad gali palaukti", hint: "patience" }],
      yes: (c) => { c.s.slowDone = true; c.say("slow_thanks"); },
      no: (c) => { c.s.slowDone = true; c.say("slow_thanks"); } },
    { id: "form", when: opening, done: (c) => !!c.s.signed,
      ask: (c) => { c.say(bump(c, "form") === 0 ? "ask_form" : "form_wait"); },
      expects: ["signed", "here_you_go", "where_sign", "ask_pen", "what_write"],
      suggest: [{ lt: "Užpildyti formą, pasirašyti (ar paklausti)", hint: "form" }],
      yes: (c) => { c.s.formOk = true; c.say("form_wait"); c.hold(); } },
    { id: "deposit", when: opening, done: (c) => c.s.deposit !== undefined,
      ask: (c) => { if (bump(c, "deposit") === 0) c.say("min_deposit"); c.say("ask_deposit"); },
      expects: ["deposit_ans", "amount_ctx", "minimum", "ask_minimum"],
      suggest: [{ lt: "Pasakyti, kiek pinigų įneši", hint: "deposit" }],
      help: (c) => { c.say("min_is"); } },
    { id: "savings", when: (c) => !!c.s.opened && !!c.s.offerSavings && c.s.type === "checking", done: (c) => c.s.savings !== undefined,
      ask: (c) => c.say(bump(c, "savings") === 0 ? "offer_savings" : "offer_savings_again"), expects: ["acct_type_not"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
      yes: (c) => { c.s.savings = true; c.s.type = "both"; c.say("savings_yes"); },
      no: (c) => { c.s.savings = false; c.say("no_problem"); } },
    { id: "app", when: (c) => !!c.s.opened && !!c.s.offerApp, done: (c) => c.s.app !== undefined,
      ask: (c) => { c.say(bump(c, "app") === 0 ? "offer_app" : "offer_app_again"); }, expects: ["app_later", "app_q"],
      suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }, { lt: "Paklausti apie programėlę", hint: "ask_acct" }],
      yes: (c) => { c.s.app = true; c.say("app_yes"); c.say("app_features"); },
      no: (c) => { c.s.app = false; c.say("app_no"); } },
    // the card
    { id: "pin_q", when: (c) => inCard(c) && !!c.s.askPin && !c.s.id, done: (c) => c.s.pinCause !== undefined,
      ask: (c) => c.say("ask_pin"), expects: ["wrong_pin", "machine_error", "pin_yes_ctx"],
      suggest: [{ lt: "Atsakyti, ar įvedei neteisingą PIN kodą", hint: "pin" }],
      yes: (c) => { c.s.pinCause = "wrong"; c.say("pin_explain"); },
      no: (c) => { c.s.pinCause = "machine"; c.say("machine_problem"); } },
    { id: "card_id", when: (c) => inCard(c) && !c.s.id, done: (c) => !!c.s.id,
      ask: (c) => { if (bump(c, "card_id") === 0) c.say("block_new"); c.say("ask_id_card"); },
      expects: ["show_doc", "here_you_go", "no_doc", "doc_ctx"],
      suggest: [{ lt: "Parodyti asmens dokumentą", hint: "id", options: "doc" }, { lt: "Paklausti apie naują kortelę", hint: "card" }],
      yes: (c) => { c.s.id = "passport"; afterId(c); } },
    { id: "cash_id", when: (c) => c.s.cash === "id" && !c.s.id, done: (c) => !!c.s.id,
      ask: (c) => c.say("ask_id_card"), expects: ["show_doc", "here_you_go", "no_doc", "doc_ctx"],
      suggest: [{ lt: "Parodyti asmens dokumentą", hint: "id", options: "doc" }],
      yes: (c) => { c.s.id = "passport"; afterId(c); } },
    { id: "cash_offer", when: (c) => !!c.s.blocked && !!c.s.offerCash, done: (c) => c.s.cash !== undefined,
      ask: (c) => { c.say("offer_cash"); if (bump(c, "cash_offer") === 0) c.say("offer_cash_counter"); },
      expects: ["withdraw", "amount_ctx", "no_cash_needed"],
      suggest: [{ lt: "Atsakyti, ar reikia grynųjų", hint: "g_yesno" }, { lt: "Pasakyti sumą", hint: "cash" }],
      yes: (c) => { c.s.cash = "amount"; },
      no: (c) => { c.s.cash = false; c.say("no_problem"); } },
    { id: "cash_amount", when: (c) => (c.s.cash === "amount" || c.s.cash === "id") && !!c.s.id, done: (c) => c.s.cashAmount !== undefined,
      ask: (c) => c.say("ask_cash_amount"), expects: ["amount_ctx", "withdraw"],
      suggest: [{ lt: "Pasakyti, kiek grynųjų nori išsiimti", hint: "cash" }] },
    { id: "bills", when: (c) => c.s.cashAmount !== undefined && !!c.s.askBills, done: (c) => !!c.s.billsDone,
      ask: (c) => c.say("ask_bills"), expects: ["bills_ans"],
      suggest: [{ lt: "Pasakyti, kokiomis kupiūromis", hint: "bills" }],
      yes: (c) => { giveCash(c); },
      no: (c) => { giveCash(c); } },
    // exchange
    { id: "euros", when: (c) => c.s.exchange === "amount", done: (c) => c.s.exchange === "done",
      ask: (c) => c.say("ask_euros"), expects: ["euro_amount", "euro_ctx"],
      suggest: [{ lt: "Pasakyti, kiek eurų keisi", hint: "euros" }],
      no: (c) => { c.s.exchange = "cancelled"; c.say("no_problem"); } },
    // anything else
    { id: "more", when: (c) => !!c.s.task, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("anything_else"),
      expects: ["more_no", "have_question"],
      suggest: [{ lt: "Pasakyti, kad tai viskas", hint: "more" }, S_TRANSFER, S_ASK, S_EXCHANGE],
      yes: (c) => { c.say("anything_else_yes"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.customer = c.visits >= 1;
    c.s.cardTwist = c.visits >= 1 && c.chance(0.5);
    c.s.hay = c.chance(0.3) ? "pending" : undefined;
    c.s.idProofTogether = c.chance(0.4);
    c.s.offerSavings = c.chance(0.4);
    c.s.offerApp = !c.s.offerSavings && c.chance(0.6);
    c.s.extraInfo = c.s.offerSavings || c.s.offerApp ? "none" : c.pick(["pin", "routing", "none"]);
    c.s.slowTwist = c.visits >= 2 && c.chance(0.5);
    c.s.askPin = c.chance(0.7);
    c.s.offerCash = c.chance(0.75);
    c.s.askBills = c.chance(0.6);
  },

  start: (c) => {
    c.ask(c.s.cardTwist ? "help_card" : "help");
  },

  handlers: {
    // --- how are you (answered only right after Aaron asked)
    g_howareyou_answer(c) {
      const back = /\b(you|yourself)\b/i.test(c.heard);
      if (c.s.hay === "asked") { c.s.hay = "done"; c.say(back ? "g_asked_back" : "g_glad"); return; }
      if (back) c.say("g_asked_back");
    },
    g_howareyou_bad(c) { if (c.s.hay === "asked") c.s.hay = "done"; c.say("g_sorry_to_hear"); },
    g_ok(c) { if (c.s.hay === "asked") { c.s.hay = "done"; c.say("g_glad"); } },

    // --- main requests
    open_account(c, slots, seg) {
      const type = seg.tags.includes("both") ? "both" : slots.acct;
      const wasOpening = c.s.opening;
      if (seg.tags.includes("needq")) c.say("open_need"); // "What do I need to open an account?"
      startOpening(c);
      if (type) setType(c, type);
      else if (wasOpening && !c.s.type) c.say("ask_type_again");
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
    },
    new_in_town(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      if (c.s.opening || customer(c)) { if (c.step === "proof") bank.handlers.no_proof(c, {}, { intent: "no_proof", slots: {}, tags: [] }); return; }
      // "I just moved here and I need a bank account": the request itself follows, so Aaron doesn't offer it
      // (welcome_town is itself the offer: "Welcome to Maple Harbor! Would you like to open an account with us?")
      if (/\b(open|account|checking|savings)\b/i.test(c.heard)) return;
      c.say("welcome_town");
      c.expect(openOffer());
    },
    card_kept(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      c.s.task = c.s.task || "card";
      c.s.moreDone = false;
      if (c.s.card) { if (c.s.blocked) c.say("already_blocked"); return; }
      c.s.card = true;
      c.s.topic = "card";
      c.say("card_sorry");
    },
    exchange_req(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      c.s.task = c.s.task || "exchange";
      c.s.topic = "exchange";
      c.s.moreDone = false;
      if (c.s.exchange === "done") { c.say("exchange_rate"); c.s.exchange = "amount"; return; }
      if (!customer(c)) {
        c.say("ask_customer");
        c.expect({
          id: "acct_q", expects: ["not_yet"], hints: ["g_yesno"],
          suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
          yes: (cc) => { cc.s.customer = true; cc.say("exchange_rate"); cc.s.exchange = "amount"; },
          no: (cc) => { cc.say("customers_only"); offerOpen(cc); },
          on: {
            not_yet: (cc) => { cc.say("customers_only"); offerOpen(cc); },
            open_account: (cc, sl, sg) => { bank.handlers.open_account(cc, sl, sg); },
          },
          ask: (cc) => cc.say("ask_customer"),
        });
        return;
      }
      c.say("exchange_rate");
      c.s.exchange = "amount";
    },
    transfer_q(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      const first = !c.s.toldTransfer;
      c.s.toldTransfer = true;
      c.s.topic = "transfer";
      c.s.task = c.s.task || "info";
      c.s.served = true;
      if (first) { c.say("transfer_how"); c.say("transfer_cost"); }
      else c.say("transfer_cost");
      if (!customer(c) && !c.s.opening && !c.s.askedCustomer) {
        c.s.askedCustomer = true;
        c.say("ask_customer");
        c.expect({
          id: "acct_q", expects: ["not_yet"], hints: ["g_yesno"],
          suggest: [{ lt: "Atsakyti: taip arba ne", hint: "g_yesno" }],
          yes: (cc) => { cc.s.customer = true; cc.say("customer_yes"); },
          no: (cc) => { cc.say("need_account_wire"); offerOpen(cc); },
          on: {
            not_yet: (cc) => { cc.say("need_account_wire"); offerOpen(cc); },
            open_account: (cc, sl, sg) => { bank.handlers.open_account(cc, sl, sg); },
          },
          ask: (cc) => { if (bump(cc, "acct_q") === 0) cc.say("ask_customer_again"); },
        });
      }
    },
    withdraw(c) {
      c.s.hay = c.s.hay === "asked" ? "done" : c.s.hay;
      c.s.topic = "cash";
      if (c.step === "cash_offer") { c.s.cash = "amount"; return; }
      if (c.s.cash === "amount" || c.s.cash === "id") return;
      c.s.task = c.s.task || "cash";
      c.s.moreDone = false;
      if (!customer(c)) { c.say("need_account_cash"); offerOpen(c); return; }
      c.s.cash = c.s.id ? "amount" : "id";
    },

    // --- opening
    acct_type_ans(c, slots, seg) {
      if (!c.s.opening) startOpening(c);
      if (c.step === "savings") { c.s.savings = slots.acct === "savings" || seg.tags.includes("both"); if (c.s.savings) { c.s.type = "both"; c.say("savings_yes"); } else c.say("no_problem"); return; }
      setType(c, seg.tags.includes("both") ? "both" : slots.acct ?? (seg.tags.includes("sav") ? "savings" : "checking"));
    },
    acct_type_not(c, slots) {
      if (c.step === "savings") { c.s.savings = false; c.say("no_problem"); return; }
      if (!c.s.opening) startOpening(c);
      const other = slots.acct === "savings" ? "checking" : "savings";
      c.s.type = other;
      c.say(other === "checking" ? "ack_not_type" : "ack_not_type_s");
    },
    ask_difference(c) { c.say("explain_types"); c.say("explain_savings"); if (/recommend|better|best|should/.test(c.heard.toLowerCase())) c.say("recommend_both"); },
    show_doc(c, slots) {
      const docs = toArr(slots.doc);
      if (c.s.id) { c.say("id_thanks"); return; }
      c.s.id = docs[0] || "passport";
      if (c.step === "proof") c.s.askedProof = true;
      afterId(c);
    },
    no_doc(c) {
      if (c.s.id) return;
      c.say("need_photo_id");
      c.expect({
        id: "other_id", expects: ["show_doc", "doc_ctx"], hints: ["g_yesno", "id"],
        suggest: [{ lt: "Atsakyti, ar turi kitą dokumentą su nuotrauka", hint: "g_yesno" }, { lt: "Parodyti kitą dokumentą", hint: "id", options: "doc" }],
        yes: (cc) => { cc.s.id = "license"; afterId(cc); },
        no: (cc) => { cc.say("come_back_id"); cc.end(); },
        on: { show_doc: (cc, sl) => { cc.s.id = toArr(sl.doc)[0] || "license"; afterId(cc); }, doc_ctx: (cc, sl) => { cc.s.id = toArr(sl.doc)[0] || "license"; afterId(cc); } },
        ask: (cc) => cc.say("need_photo_id"),
      });
    },
    doc_ctx(c, slots, seg) { bank.handlers.show_doc(c, slots, seg); },
    proof_ctx(c, slots, seg) { bank.handlers.give_proof(c, slots, seg); },
    help_me(c) { if (/(problem|help)(\s+please)?[\s.!?,]*$/i.test(c.heard.trim())) { c.say("go_ahead"); c.hold(); } },
    no_cash_needed(c) { if (c.s.cash === undefined) c.s.cash = false; c.say("no_problem"); },
    app_later(c) { if (c.s.app === undefined) c.s.app = false; c.say("app_no"); },
    give_proof(c, slots) {
      const p = toArr(slots.proof)[0] || "lease";
      const first = c.s.proof === undefined;
      c.s.proof = p;
      if (first) c.say("proof_ok");
    },
    no_proof(c, slots, seg) {
      if (c.s.proof !== undefined) return;
      // "I don't have a lease" / "I live with a friend": no point asking about a lease
      if (slots?.proof === "lease" || seg?.tags?.includes("nolease")) { c.s.proof = "later"; c.say("proof_later"); return; }
      c.say("ask_lease");
      c.expect({
        id: "lease_q", expects: ["give_proof", "proof_ctx"], hints: ["g_yesno", "proof"],
        suggest: [{ lt: "Atsakyti, ar turi nuomos sutartį", hint: "proof", options: "proof" }],
        yes: (cc) => { cc.s.proof = "lease"; cc.say("proof_ok"); },
        no: (cc) => { cc.s.proof = "later"; cc.say("proof_later"); },
        on: { give_proof: (cc, sl, sg) => { bank.handlers.give_proof(cc, sl, sg); }, proof_ctx: (cc, sl, sg) => { bank.handlers.give_proof(cc, sl, sg); } },
        ask: (cc) => cc.say("ask_lease"),
      });
    },
    ssn_none(c) { if (c.s.ssn !== undefined) return; c.s.ssn = "none"; c.say("ssn_none_ok"); },
    ssn_yes(c) { if (c.s.ssn !== undefined) return; c.s.ssn = "yes"; c.say("ssn_yes_type"); },
    not_yet(c) {
      if (c.step === "ssn") { bank.handlers.ssn_none(c, {}, { intent: "ssn_none", slots: {}, tags: [] }); return; }
      if (c.step === "proof") { bank.handlers.no_proof(c, {}, { intent: "no_proof", slots: {}, tags: [] }); return; }
      c.say("no_problem");
    },
    ask_ssn_what(c) { c.say("ssn_explain"); },
    ssn_problem(c) {
      if (c.step === "ssn" || c.s.ssn === "none") { c.s.ssn = c.s.ssn ?? "none"; c.say("ssn_none_ok"); return; }
      c.say("no_problem");
    },
    ask_pen(c) { c.say("pen"); c.hold(); },
    where_sign(c) { c.say("where_sign"); c.hold(); },
    what_write(c) { c.say("what_write"); c.hold(); },
    signed(c) {
      if (c.step !== "form" && c.s.signed) { c.say("form_thanks"); return; }
      c.s.signed = true; c.event("sign"); c.say("form_thanks");
    },
    here_you_go(c) {
      switch (c.step) {
        case "id": case "card_id": case "cash_id": c.s.id = c.s.id || "passport"; afterId(c); return;
        case "proof": if (c.s.proof === undefined) { c.s.proof = "lease"; c.say("proof_ok"); } return;
        case "form": c.s.signed = true; c.event("sign"); c.say("form_thanks"); return;
        default: c.say("id_thanks");
      }
    },
    deposit_ans(c, slots) {
      // "…put in a thousand": the price slot reads bare amounts only up to 999
      const k = /\b(one|two|three|five)\s+thousand\b/i.exec(c.heard) ?? /\ba\s+thousand\b/i.exec(c.heard);
      const n = k ? ({ a: 1, one: 1, two: 2, three: 3, five: 5 } as Record<string, number>)[(k[1] ?? "a").toLowerCase()] ?? 1 : 0;
      depositAmount(c, slots.price ?? (n ? n * 100000 : undefined));
    },
    minimum(c, slots) { depositAmount(c, slots.price ?? 2500); },
    ask_minimum(c) { c.say("min_is"); },
    amount_ctx(c, slots) {
      if (c.step === "deposit") { depositAmount(c, slots.price); return; }
      if (c.step === "cash_amount" || c.step === "cash_offer") { c.s.cash = "amount"; c.s.cashAmount = slots.price; if (!c.s.askBills) giveCash(c); return; }
    },

    // --- questions
    fee_q(c) {
      c.s.topic = c.s.topic || "account";
      if (c.s.type === "savings") { c.say("savings_fee"); return; }
      c.say("fee_info"); c.say("fee_waive");
    },
    minbal_q(c) { c.say("fee_info"); c.say("fee_waive"); },
    interest_q(c) { c.say("interest_info"); },
    card_when_q(c) { c.say(c.s.card ? "new_card_info" : "card_info"); },
    card_abroad_q(c) { c.say("card_abroad"); },
    app_q(c) { c.say("app_info"); },
    atm_q(c, _s, seg) { if (/free|fee|pay/.test(c.heard.toLowerCase())) c.say("atm_free"); else c.say("atm_where"); void seg; },
    cost_q(c) {
      switch (c.s.topic) {
        case "transfer": c.say("transfer_fee"); return;
        case "exchange": c.say("exchange_rate"); return;
        case "card": c.say("no_problem"); return;
        default: c.say("fee_info"); c.say("fee_waive");
      }
    },
    how_long_q(c) {
      if (c.s.topic === "transfer") { c.say("transfer_time"); return; }
      if (c.s.topic === "card") { c.say("new_card_info"); return; }
      c.say("open_time");
    },
    need_q(c) {
      if (c.s.topic === "transfer") { c.say("transfer_need"); return; }
      c.say("open_need");
    },
    swift_q(c) { c.say("swift_explain"); },
    app_transfer_q(c) { c.say("transfer_app"); },
    rate_q(c) { c.say("exchange_rate"); },
    euro_amount(c, slots) { exchangeEuros(c, slots.number); },
    euro_ctx(c, slots) { exchangeEuros(c, slots.number); },

    // --- the card
    wrong_pin(c) { if (c.s.pinCause === undefined) { c.s.pinCause = "wrong"; c.say("pin_explain"); } else c.say("no_problem"); },
    pin_yes_ctx(c) { bank.handlers.wrong_pin(c, {}, { intent: "wrong_pin", slots: {}, tags: [] }); },
    machine_error(c) { if (c.s.pinCause === undefined) { c.s.pinCause = "machine"; c.say("machine_problem"); } },
    block_req(c) {
      if (c.s.blocked) { c.say("already_blocked"); return; }
      if (!c.s.card) { bank.handlers.card_kept(c, {}, { intent: "card_kept", slots: {}, tags: [] }); return; }
      c.say("block_first");
    },
    new_card_q(c) { c.say(c.s.blocked ? "new_card_info" : "new_card_yes"); },
    old_card_q(c) { c.say("old_card_back"); },
    account_safe_q(c) { c.say("account_safe"); },
    bills_ans(c) { if (c.s.cashAmount === undefined || c.s.billsDone) { c.say("no_problem"); return; } giveCash(c); },

    // --- general
    more_no(c) { if (answerNo(c)) return; c.s.moreDone = true; },
    have_question(c) { c.say("go_ahead"); c.hold(); },
    no_problem(c) { if (c.step === "slow") { c.s.slowDone = true; c.say("slow_thanks"); } },
  },

  finish: (c) => {
    if (c.s.opened || c.s.blocked) c.complete();
    c.say("bye");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    { say: "Hi, I'd like to open a checking account.", intent: "open_account", slots: { acct: "checking" } },
    { say: "Could I open a savings account, please?", intent: "open_account", slots: { acct: "savings" } },
    { say: "I need a bank account.", intent: "open_account" },
    { say: "How do I open an account?", intent: "open_account" },
    { say: "I'm here to open an account.", intent: "open_account" },
    { say: "I'm looking to open a checking account.", intent: "open_account" },
    { say: "I'd like to open a current account.", intent: "open_account", slots: { acct: "checking" } },
    { say: "Checking, please.", intent: "acct_type_ans", step: "acct_type", slots: { acct: "checking" } },
    { say: "Both, please.", intent: "acct_type_ans", step: "acct_type" },
    { say: "I don't need a savings account.", intent: "acct_type_not", step: "acct_type", not: ["acct_type_ans", "open_account"] },
    { say: "What's the difference?", intent: "ask_difference", step: "acct_type" },
    { say: "Here's my passport.", intent: "show_doc", step: "id", slots: { doc: "passport" } },
    { say: "Is a driver's license okay?", intent: "show_doc", step: "id", slots: { doc: "license" } },
    { say: "I don't have my passport with me.", intent: "no_doc", step: "id", not: ["show_doc"] },
    { say: "Here's my lease.", intent: "give_proof", step: "proof", slots: { proof: "lease" } },
    { say: "I have an electric bill.", intent: "give_proof", step: "proof", slots: { proof: "utility_bill" } },
    { say: "Here is my tenancy agreement.", intent: "give_proof", step: "proof", slots: { proof: "lease" } },
    { say: "I don't have a utility bill yet.", intent: "no_proof", step: "proof", not: ["give_proof"] },
    { say: "No, I don't have one yet.", intent: "ssn_none", step: "ssn" },
    { say: "I'm still waiting for it.", intent: "ssn_none", step: "ssn" },
    { say: "What's a Social Security number?", intent: "ask_ssn_what", step: "ssn" },
    { say: "Where do I sign?", intent: "where_sign", step: "form" },
    { say: "Could I borrow a pen?", intent: "ask_pen", step: "form" },
    { say: "Okay, done.", intent: "signed", step: "form" },
    { say: "I'd like to deposit two hundred dollars.", intent: "deposit_ans", step: "deposit", slots: { price: 20000 } },
    { say: "Just the minimum.", intent: "minimum", step: "deposit" },
    { say: "$300", intent: "amount_ctx", step: "deposit", slots: { price: 30000 } },
    { say: "Is there a monthly fee?", intent: "fee_q" },
    { say: "Can I use the card in Lithuania?", intent: "card_abroad_q" },
    { say: "How can I send money to Lithuania?", intent: "transfer_q" },
    { say: "How long does it take?", intent: "how_long_q" },
    { say: "What's a SWIFT code?", intent: "swift_q" },
    { say: "I'd like to change some euros into dollars.", intent: "exchange_req" },
    { say: "What's the exchange rate?", intent: "rate_q" },
    { say: "Two hundred euros, please.", intent: "euro_amount", step: "euros", slots: { number: 200 } },
    { say: "The ATM outside kept my card.", intent: "card_kept" },
    { say: "The machine ate my card!", intent: "card_kept" },
    { say: "The cash machine swallowed my card.", intent: "card_kept" },
    { say: "My card got stuck in the ATM.", intent: "card_kept" },
    { say: "I entered the wrong PIN three times.", intent: "wrong_pin", step: "pin_q" },
    { say: "Yes, I think so.", intent: "pin_yes_ctx", step: "pin_q" },
    { say: "I think so", intent: "yn:yes" },
    { say: "Could you block it, please?", intent: "block_req" },
    { say: "Can I take out some cash here?", intent: "withdraw" },
    { say: "Twenties are fine.", intent: "bills_ans", step: "bills" },
    { say: "No, that's all, thanks.", intent: "more_no", step: "more" },
    { say: "Could you say that again?", intent: "g_repeat" },
    { say: "I just moved here from Lithuania.", intent: "new_in_town" },
    { say: "Yes, I have one.", intent: "ssn_yes", step: "ssn" },
    { say: "What should I write here?", intent: "what_write", step: "form" },
    { say: "How much does it cost?", intent: "cost_q" },
    { say: "What do I need for the transfer?", intent: "need_q" },
    { say: "No, I don't think so.", intent: "machine_error", step: "pin_q" },
    { say: "Can I get my old card back?", intent: "old_card_q" },
    { say: "Not yet.", intent: "not_yet", step: "ssn" },
    { say: "Three hundred", intent: "euro_ctx", step: "euros", slots: { number: 300 } },
    { say: "Where's the nearest ATM?", intent: "atm_q" },
    { say: "Do you have an app?", intent: "app_q" },
    { say: "What's the interest rate?", intent: "interest_q" },
    { say: "Should I fill in the whole form?", intent: "what_write", step: "form" },
    { say: "banana account purple elephant", intent: "none" },
    { say: "I like swimming in the lake", intent: "none" },
    { say: "Mikalauskas", intent: "none" },
    // more constructions and vocabulary (dev corpus tests/corpus/s78-bank.json)
    { say: "I'd like to become a client of your bank", intent: "open_account", step: "help" },
    { say: "I want to create a savings account", intent: "open_account", step: "help", slots: { acct: "savings" } },
    { say: "What do I need to open an account?", intent: "open_account", step: "help" },
    { say: "I need cash", intent: "withdraw", step: "help" },
    { say: "I need it for my salary", intent: "acct_type_ans", step: "acct_type" },
    { say: "To save money", intent: "acct_type_ans", step: "acct_type" },
    { say: "Passport", intent: "doc_ctx", step: "id", slots: { doc: "passport" } },
    { say: "I have a Lithuanian driving license", intent: "show_doc", step: "id", slots: { doc: "license" } },
    { say: "Lease", intent: "proof_ctx", step: "proof", slots: { proof: "lease" } },
    { say: "My lease is at home", intent: "no_proof", step: "proof", not: ["give_proof"] },
    { say: "I applied last week", intent: "ssn_none", step: "ssn" },
    { say: "Only a Lithuanian personal code", intent: "ssn_none", step: "ssn" },
    { say: "Okay, I filled it out", intent: "signed", step: "form" },
    { say: "Let's say 200", intent: "deposit_ans", step: "deposit", slots: { price: 20000 } },
    { say: "I'll put in a thousand", intent: "deposit_ans", step: "deposit" },
    { say: "I put my card in the machine and it didn't come out", intent: "card_kept", step: "help_card" },
    { say: "I typed it wrong", intent: "wrong_pin", step: "pin_q" },
    { say: "Doesn't matter", intent: "bills_ans", step: "bills" },
    { say: "Change 100 euros, please", intent: "euro_amount", step: "euros", slots: { number: 100 } },
    { say: "No, I'll do it later", intent: "app_later", step: "app" },
    { say: "How do I check my balance?", intent: "app_q" },
    // safety
    { say: "No, I have cash", intent: "no_cash_needed", step: "cash_offer", not: ["withdraw"] },
    { say: "I don't want to open an account", intent: "none" },
    { say: "I didn't enter the wrong PIN", intent: "none" },
    { say: "I don't have a lease", intent: "no_proof", step: "proof", not: ["give_proof"] },
  ],

  sims: [
    { name: "no to the optional offers",
      turns: ["Hi! I need a bank account.", "Checking.", "Here you go.", "I have a bank statement.", "Not yet.", "Where do I sign?", "Okay, I signed it.", "Two hundred.", "No, thanks, that's all.", "No, that's everything."],
      expect: { complete: true }, auto: { ...BANK_AUTO, savings: "No, I'm good.", app: "No, that's okay." } },
    { name: "open a checking account, happy path",
      turns: ["Hi, I'd like to open a checking account.", "Here's my passport.", "Here's my lease.", "No, I don't have one yet.", "Okay, done.", "I'd like to deposit two hundred dollars.", "No, that's all, thanks."],
      expect: { complete: true }, auto: BANK_AUTO },
    { name: "questions first, then a savings account",
      turns: ["Hello! How can I send money to Lithuania?", "How long does it take?", "What do I need?", "I'd like to open a savings account.", "Is there a monthly fee?", "Here's my passport.", "I have a utility bill.", "I'm still waiting for it.", "Could I borrow a pen?", "Where do I sign?", "Here you go.", "Just the minimum.", "When will I get my card?", "That's all, thanks."],
      expect: { complete: true }, auto: BANK_AUTO },
    { name: "the ATM kept my card (twist)",
      turns: ["Hi. The ATM outside kept my card.", "Here's my passport.", "Is my money safe?", "No, that's all. Thank you!"],
      expect: { complete: true }, auto: BANK_AUTO },
    // a returning customer's side errands: euros exchanged at once, then cash from the account. The task
    // (open an account, or the ATM card) isn't part of this visit, so it ends not completed.
    { name: "customer: exchange euros, then take out cash",
      turns: ["Hi! Could I exchange some euros?", "Three hundred euros, please.", "Yes, I'd like to take out some cash.", "Here's my passport.", "Two hundred dollars, please.", "Twenties are fine.", "No, that's all, thanks."],
      expect: { complete: false }, auto: BANK_AUTO,
      setup: (s) => { s.customer = true; s.cardTwist = false; s.slowTwist = false; s.offerCash = false; s.askBills = true; } },
    { name: "exchange euros, then open an account",
      turns: ["Could I exchange some euros?", "Checking, please.", "Here's my passport.", "Here's my lease.", "No, not yet.", "Where do I sign?", "Done.", "$100 in cash.", "No, I'm good, thanks."],
      expect: { complete: true }, auto: BANK_AUTO, setup: (s) => { s.customer = false; s.cardTwist = false; s.slowTwist = false; } },
  ],
};

function depositAmount(c: Ctx, cents: number | undefined) {
  if (cents == null) { c.say("min_is"); return; }
  if (c.step !== "deposit" && !opening(c)) { c.say("no_problem"); return; }
  if (cents < 2500) { c.say("deposit_min"); return; }
  c.s.deposit = cents;
  c.event("pay", { method: "cash", amount: cents });
  openAccount(c);
}

function giveCash(c: Ctx) {
  c.s.billsDone = true;
  c.say("here_cash");
  c.event("give", { item: "cash" });
}

function exchangeEuros(c: Ctx, eur: number | undefined) {
  if (c.s.exchange !== "amount" || !eur) { c.say("no_problem"); return; }
  c.s.exchange = "done";
  c.s.served = true;
  const cents = exchanged(eur);
  if (eur % 10 === 0 && eur >= 10 && eur <= 2000 && cents > 0) c.say("exchange_done", { amount: cents });
  else c.say("exchange_done_generic");
  c.event("give", { item: "cash" });
}

function offerOpen(c: Ctx) {
  c.say("offer_open");
  c.expect(openOffer());
}

function openOffer() {
  return {
    id: "open_offer", expects: ["open_account"], hints: ["g_yesno", "open"],
    suggest: [{ lt: "Sutikti atsidaryti sąskaitą", hint: "g_yesno" }, { lt: "Pasakyti, kokios sąskaitos nori", hint: "acct_type", options: "acct" }],
    yes: (cc: Ctx) => { startOpening(cc); },
    no: (cc: Ctx) => { cc.s.declinedOpen = true; cc.say("no_problem"); },
    on: { open_account: (cc: Ctx, sl: any, sg: any) => { bank.handlers.open_account(cc, sl, sg); } },
    ask: (cc: Ctx) => cc.say("offer_open"),
  };
}

export default bank;
