// Song 91 "Can You Help Me, Please?" (part 2): reporting a lost or stolen wallet at the
// police station. Officer Reyes takes the report: what happened, where and when, what it
// looks like, what was in it, name (spelled), phone number, signature, case number.
// Twists (some visits): someone turns in a wallet while you are there; "Do you have any ID?"
//
// Officer Reyes is formal (jūs). Entity lists for the wallet, places and colors are shared
// with s91a-lost-wallet.

import type { Ctx, EntityDef, Pending, SituationDef } from "../types";
import { ent, t } from "../dsl";
import { expectHowAreYou } from "../global";
import { ITEMS, PLACES, COLORS, MATERIALS, SIZES, H_AT_PLACE, H_WAS_AT, H_NEAR, H_ON_BUS, H_IN_TAXI } from "./s91a-lost-wallet";

// ---------------------------------------------------------------------------
// What was in the wallet

const K = "kortelė/kortelės/kortelei/kortelę/kortele/kortelėje";
const KPL = "kortelės/kortelių/kortelėms/korteles/kortelėmis/kortelėse";
const PAZ = "pažymėjimas/pažymėjimo/pažymėjimui/pažymėjimą/pažymėjimu/pažymėjime";
const CONTENTS: EntityDef[] = [
  ent("cards", "cards", KPL, "f", { art: "", forms: ["my cards", "bank cards", "all my cards", "some cards", "my bank cards"], chip: "kortelės", attrs: { cards: true } }),
  ent("credit_card", "credit | card", `kredito | ${K}`, "f", { pl: "credit | cards", ltPl: `kredito | ${KPL}`, forms: ["credit cards", "visa", "visa card", "mastercard", "amex"], chip: "kredito kortelė", attrs: { cards: true } }),
  ent("debit_card", "debit | card", `debeto | ${K}`, "f", { pl: "debit | cards", ltPl: `debeto | ${KPL}`, forms: ["debit cards", "bank card", "atm card"], chip: "debeto kortelė", attrs: { cards: true } }),
  ent("license", "driver's | license", `vairuotojo | ${PAZ}`, "m", { forms: ["drivers license", "driver license", "driving license", "driving licence", "drivers licence", "license", "licence", "my license"], chip: "vairuotojo pažymėjimas", attrs: { id: true } }),
  ent("id_card", "ID | card", `asmens tapatybės | ${K}`, "f", { forms: ["id", "i d", "id card", "identity card", "national id", "lithuanian id", "my id", "documents", "my documents", "papers", "id documents", "social security card", "green card", "residence card"], chip: "asmens tapatybės kortelė", attrs: { id: true } }),
  ent("passport", "passport", "pasas/paso/pasui/pasą/pasu/pase", "m", { forms: ["my passport", "lithuanian passport"], chip: "pasas", attrs: { id: true, passport: true } }),
  ent("cash", "cash", "grynieji/grynųjų/gryniesiems/gryniuosius/grynaisiais/grynuosiuose", "m", { art: "", forms: ["money", "some cash", "some money", "dollars", "a little cash"], chip: "grynieji", attrs: { cash: true } }),
  ent("photos", "photos", "nuotraukos/nuotraukų/nuotraukoms/nuotraukas/nuotraukomis/nuotraukose", "f", { art: "", forms: ["photo", "pictures", "a photo", "a picture", "family photos", "photo of my kids", "photo of my children", "photo of my family", "photos of my kids", "photos of my children", "photos of my family", "picture of my kids", "picture of my children", "picture of my family"], chip: "nuotraukos" }),
  ent("keys", "keys", "raktai/raktų/raktams/raktus/raktais/raktuose", "m", { art: "", forms: ["my keys", "house keys", "car keys", "a key", "key"], chip: "raktai" }),
  ent("insurance_card", "insurance | card", `draudimo | ${K}`, "f", { forms: ["health insurance card", "insurance"], chip: "draudimo kortelė" }),
  ent("library_card", "library | card", `bibliotekos | ${K}`, "f", { chip: "bibliotekos kortelė" }),
  ent("bus_pass", "bus | pass", "autobuso | bilietas/bilieto/bilietui/bilietą/bilietu/biliete", "m", { forms: ["transit pass", "metro card", "monthly pass", "bus ticket"], chip: "kelionės bilietas" }),
  ent("gift_card", "gift | card", `dovanų | ${K}`, "f", { forms: ["gift cards"], chip: "dovanų kortelė" }),
  ent("receipts", "receipts", "čekiai/čekių/čekiams/čekius/čekiais/čekiuose", "m", { art: "", forms: ["receipt", "some receipts"], chip: "čekiai" }),
  ent("student_id", "student | ID", `studento | ${PAZ}`, "m", { forms: ["student card", "student id card"], chip: "studento pažymėjimas", attrs: { id: true } }),
];

const ALL = [...ITEMS, ...PLACES, ...COLORS, ...MATERIALS, ...SIZES, ...CONTENTS];
/** Contents named without "a" that take a plural verb ("My keys were in it"); cash is a mass noun. */
const PLURAL = ["cards", "photos", "keys", "receipts", "cash"];
const byId = (id: string) => ALL.find((e) => e.id === id)!;

// ---------------------------------------------------------------------------
// Helpers

const F_IS_Q = "“Is” in a yes/no question = the particle ar; Lithuanian needs no copula here.";
const F_DO_Q = "Question “Do” = the particle ar.";

const item = (c: Ctx) => (c.s.item as string) || "wallet";
const itemNp = (c: Ctx, color?: string) => ({ id: item(c), mods: [c.s.size, color ?? c.s.color, c.s.material].filter(Boolean) as string[] });
/** Queue a reaction; the next step (or finish) says it once. Later segments of the same
 *  utterance overwrite earlier ones in the same group, so the echo has the full answer. */
function react(c: Ctx, group: string, line: string, vars: Record<string, any> = {}) {
  c.s.react = c.s.react || {};
  c.s.react[group] = { line, vars };
}
function flush(c: Ctx) {
  const r = c.s.react as Record<string, { line: string; vars: any }> | null;
  if (!r) return;
  c.s.react = null;
  for (const { line, vars } of Object.values(r)) c.say(line, vars);
}
/** The current learner turn: the engine builds a fresh ctx object for every input, so the same
 *  sentence said on two different turns gets two different keys (c.heard alone would not). */
const turnIds = new WeakMap<object, number>();
let turnSeq = 0;
const turn = (c: Ctx) => { let t = turnIds.get(c); if (t === undefined) { t = ++turnSeq; turnIds.set(c, t); } return `${t}:${c.heard}`; };
const once = (c: Ctx, key: string) => { const t = turn(c); if (c.s["__once_" + key] === t) return false; c.s["__once_" + key] = t; return true; };

function bye(c: Ctx, thanked = false) {
  if (!c.s.byeSaid) { c.s.byeSaid = true; c.say(thanked ? "closing_welcome" : gotIt(c) ? "closing_care" : "closing"); }
  c.hold();
  c.end();
}
const live = (c: Ctx) => !c.s.byeSaid;

function describeFrom(c: Ctx, slots: any) {
  for (const p of ([] as any[]).concat(slots.dp ?? [])) {
    if (p?.color) c.s.color = p.color;
    if (p?.material) c.s.material = p.material;
    if (p?.size) c.s.size = p.size;
  }
  if (slots.item) c.s.item = slots.item;
}

function setWhen(c: Ctx, w: any) { if (w) c.s.time = true; }
function setPlace(c: Ctx, p: any) { if (p) c.s.place = p; }

function addContents(c: Ctx, slots: any) {
  const list: string[] = c.s.contents || [];
  for (const ci of ([] as any[]).concat(slots.ci ?? [])) {
    if (!ci) continue;
    if (ci.content && !list.includes(ci.content)) list.push(ci.content);
    if ((ci.__tags || []).includes("cash") && !list.includes("cash")) list.push("cash");
    if (typeof ci.price === "number") c.s.cashAmount = ci.price;
  }
  c.s.contents = list;
  if (list.includes("cash") && c.s.cashAmount === undefined && c.s.noCashAmount === undefined) c.s.needCash = true;
}
const has = (c: Ctx, pred: (e: EntityDef) => boolean) => ((c.s.contents || []) as string[]).some((id) => pred(byId(id)));

/** Collect a name said in one or several segments of the same utterance ("Tomas Mikalauskas"). */
function addName(c: Ctx, name: string | undefined) {
  if (!name) return;
  c.s.nameWords = [...(c.s.nameWords || []), ...name.split(" ")];
  c.s.name = true;
  if ((c.s.nameWords as string[]).length >= 2) c.s.lastName = true;
}

/** Mission predicates (they mirror the steps' when/done, so a finished report ticks them all). */
const toldWhat = (c: Ctx) => !!c.s.item && c.s.kind !== "unsure" && (!!c.s.happened || !(c.s.askHappened && c.s.kind !== "lost"));
const cardsQ = (c: Ctx) => !!c.s.askBank && has(c, (e) => !!e.attrs?.cards) && !c.s.found;
const spellQ = (c: Ctx) => !!c.s.askSpell && c.s.found !== "mine";
const gotIt = (c: Ctx) => c.s.found === "mine" || c.s.found === "partial";

const AUTO: Record<string, string> = {
  report: "I'd like to report a stolen wallet.",
  what_item: "My wallet.",
  stolen_q: "I'm not sure.",
  happened: "When I wanted to pay, it was gone.",
  where: "At the farmers' market.",
  when: "Around eleven.",
  cash_amount: "About forty dollars.",
  bank: "Yes, I already called them.",
  found: "Yes, that's mine!",
  id_q: "No, it was in my wallet.",
  name: "Tomas Mikalauskas.",
  last_name: "Mikalauskas.",
  spell: "M-I-K-A-L-A-U-S-K-A-S.",
  phone: "It's 555-0142.",
  sign: "Sure.",
  check_all: "Yes, everything's here.",
  anything_else: "No, that's all. Thank you.",
  closing: "Thank you. Bye!",
};

// ---------------------------------------------------------------------------

export const police: SituationDef = {
  id: "s91b-police",
  song: 91,
  songTitle: "Can You Help Me, Please?",
  title: { en: "I'd Like to Report a Theft", lt: "Noriu pranešti apie vagystę" },
  topic: { en: "At the police station", lt: "Policijos nuovadoje" },
  chapter: 7,
  order: 2,
  location: "police",
  npc: "reyes",
  goal: "Pranešk policijai apie pamestą piniginę.",
  intro: "Policijos nuovada prie aikštės. Budintis pareigūnas Reyesas priima pranešimus. Papasakok, kas nutiko tavo piniginei, kur ir kada tai buvo, kaip ji atrodo ir kas joje buvo.",
  entities: { item: ITEMS, place: PLACES, color: COLORS, material: MATERIALS, size: SIZES, content: CONTENTS },

  grammar: {
    macros: {
      at_place: "(at | in | on | near | by | next to | outside) [the | a | that] {place}",
      gone: "[then | and then | but | and later | later | suddenly | and suddenly | and] [when i (wanted | tried | went) to pay | when i (reached | looked) for it] (it was gone | it was not there | it was missing | i could not find it | i did not have it | [my | the] {item} (was | is) (gone | missing | not there) | it [just] disappeared | i could not find my {item})",
      unsure_w: "(i am not sure | not sure | i do not know [exactly] | i think | probably) [maybe | somewhere]",
      report_pre: "(i would like to | i want to | i need to | i am here to | i have come to | i came to | i would like to make a) report",
    },
    slots: {
      whenp: { pattern: [
        "[at | around | about | at about | at around | maybe | probably] {time} [this morning | today]",
        "[about | around | maybe] ((an | one) hour | half an hour | a few minutes | {number} (minutes | hours | minute | hour) | a couple of hours | two hours) ago",
        "[earlier] this (morning | afternoon)",
        "(just now | a little while ago | earlier [today] | today | not long ago)", "between {time} and {time}",
        "yesterday [morning | afternoon | evening]",
        "around (noon | lunchtime | lunch)",
      ] },
      dp: { pattern: [
        "[and] [it is | it was | it is a | it was a | a | an | kind of | sort of | really | very | quite | pretty] {color} [color | colored]",
        "[and] [it is | it was | it is a | it was a | a | an | made of] {material}",
        "[and] [it is | it was | it is a | it was a | a | an | quite | pretty | very | really] {size}",
        "[and] (it has | with) (a | my) (zipper | zip | button | logo | strap | name inside | initials on it) #feature",
        "[and] (in | with) a {color} (case | cover) #feature", "[and] [it is | it was | a | an] (old | new | normal | ordinary | simple | cheap | expensive) #feature",
      ] },
      ci: { pattern: [
        "[my | a | an | some | two | three | all my | a few | a couple of | the | also | and] {content}",
        "[and] [about | around | maybe | like | roughly | almost | just | only] {price} [in cash | cash] #cash",
        "[and] (some | a little | a bit of | a lot of) (cash | money) #cash",
        "(not much | not a lot) [maybe | just | only | about] [{price}] #cash",
        "[and] (less than | more than | almost | over | under) {price} #cash", "[and] (just | only)? a few dollars #cash",
      ] },
    },
  },

  intents: {
    report: { patterns: [
      "@report_pre (a | my) (stolen | lost | missing) {item} #h:report_item",
      "@report_pre (a | the) theft #theft #h:report_theft",
      "@report_pre that my {item} (was | has been) stolen #stolen",
      "@report_pre (a | my) {item} (stolen | lost | missing)",
      "(someone | somebody) (stole | took | has stolen | has taken) my {item} #stolen #h:someone_stole",
      "my {item} (was | has been | got) stolen #stolen #h:was_stolen",
      "i (have | ) lost my {item} #lost #h:lost_item",
      "i (can not | can't) find my {item} #unsure",
      "my {item} is (gone | missing) #unsure",
      "i think (someone | somebody) (stole | took) my {item} #stolen",
      "i think my {item} (was | has been) stolen #stolen",
      "i want to report a (stolen | lost | missing) {item} #blunt",
      "@report_pre (a | my) (stolen | lost | missing) (purse) #tip:us_wallet",
      "i [have] lost my {item} [and i (want | would like | need) to report it] #lost", "i (need | want | would like) to (make | file) a [police] report #theft", "i (want | need | would like) [to] make [a] [police] report #theft", "my {item} [was | is] stolen #stolen", "(someone | somebody) steal my {item} #stolen",
      "[i think] i (was | got | have been) (robbed | pickpocketed) #theft", "(someone | somebody) (pickpocketed | robbed) me #theft",
      "(a man | a woman | a guy | a thief | a kid | two men | some guy | some man) (stole | took | grabbed) my {item} [from my (bag | pocket | backpack)] #stolen",
      "@report_pre (a | the) (crime | robbery) #theft", "(can | could | may) i report (a | my) (stolen | lost | missing) {item} [here]",
      "(someone | somebody) (took | stole) my {item} from my (bag | pocket | backpack | jacket | purse) #stolen", "my {item} was stolen @at_place #stolen",
      "i am here because (my {item} (was | has been) stolen | (someone | somebody) stole my {item}) #stolen", "i am here because i (lost | have lost) my {item} #lost",
    ] },
    // "I have a problem" / "I need help": the officer asks what happened (the report step)
    problem: { patterns: ["i have a (problem | big problem | small problem)", "i need (help | your help | some help)", "(can | could) you help me"] },
    no_cash: { patterns: [
      "[there was] no (cash | money) [in it | inside] [(just | only) {ci} [[and] {ci}]]", "i (did not | didn't) have (any)? (cash | money) [in it]", "(there was | i had) no (cash | money) [in it]",
    ] },
    what_item_ctx: { patterns: ["[my | a | the] {item}", "(it was | they took | someone took) my {item}", "[my | a | the] [{color}] {item} with (all my | my | some) (cards | money | documents | cash | things)", "(a | my) {color} {item}"] },
    happened: { patterns: [
      "i was (at | in) [the] {place} [and] [@gone] #h:h_was_at",
      "i was (buying | shopping for | paying for | looking at | getting) (some | a | an | my) {w:any} [@at_place] [and] [@gone]",
      "(someone | somebody | a man | a woman | a guy | a young man | two men | a kid) (bumped into | pushed | touched) me [@at_place] [and] [@gone] #h:h_bumped",
      "(someone | somebody | a man | a woman | a guy | a young man | two men | a kid) (bumped into | pushed | touched) me [and] (took | take | stole | steal | grabbed) my {item} [@at_place]",
      "it was in my (pocket | back pocket | bag | jacket | jacket pocket | backpack | purse) [and] [@gone] #h:h_pocket",
      "i (put | left) it (on | in) (the | a | my) {w:any} [and] [@gone]",
      "@gone #h:h_gone",
      "i (turned around | looked away) [and] [@gone]",
      "i do not know what happened [@gone]",
      "i think i (dropped | lost) it [@at_place]",
      "i (put | had | kept) (it | my {item}) in my (pocket | back pocket | bag | jacket | backpack | purse) [and] [@gone]",
      "i was (buying | shopping for | paying for | looking at | getting) {w:any} [@at_place] [and] [@gone]", "@gone",
      "it was in my (pocket | back pocket | bag | jacket | backpack | purse) [and] (the (bag | zipper | pocket) was open | @gone)",
      "i was in (the | a) (crowd | line | queue) [@at_place]", "[i think] (someone | somebody) (opened | unzipped | cut) my (bag | backpack | purse)",
      "i was (at | in) [the] {place} [and] i (put | left) (it | my {item}) on the (counter | table | bench) [@gone]",
      "i was on the (bus | train | subway) [and] [it was (very | really)? crowded] [@gone]",
      "(two men | a man | a woman | some people | someone | somebody | a guy) (was | were) (very | really)? close to me",
      "i was (taking photos | talking on the phone | looking at the flowers | shopping | paying) [@at_place] [and] [(someone | somebody) (took | stole) it [from my (pocket | bag)]]",
      "i do not know [what happened] [it [just] disappeared]",
    ] },
    where_when: { patterns: [
      "[it (happened | was) | i was | i had it] @at_place [[at | around] {whenp}] #h:where",
      "[it (happened | was) | i was | i had it] {whenp} [@at_place] #h:when",
      "[the] {place} [[at | around] {whenp}]",
      "[@unsure_w] [it (happened | was) | i was] @at_place [[at | around] {whenp}]", "[@unsure_w] somewhere (in | at | near) [the] {place}",
      "[it (happened | was) | i was] @at_place (on | in) (main street | the main street | this street | harbor street | the corner | the square | town square) [[at | around] {whenp}]",
    ] },
    describe: { patterns: [
      "[it is | it was | it is a | it was a | a | an | my {item} is] {dp} [{dp}] [{dp}] [{dp}] [{item} | one] [{dp}] #h:describe",
      "it is (just | ) (a | an) (normal | ordinary | regular) {item}",
    ] },
    contents: { patterns: [
      "[there (was | were) | i had | it had | inside there (was | were) | just | only] {ci} [[and] {ci}] [[and] {ci}] [[and] {ci}] [[and] {ci}] [that is (all | it) | and that is (all | it)] #h:contents",
      "{ci} [[and] {ci}] [[and] {ci}] (was | were) (in it | inside | in there) #h:contents",
      "(my | the) (whole | ) life [basically]",
      "nothing (important | much) [really] [just {ci}] #nothing",
      "(i do not know [exactly] | i am not sure) [maybe | about | around] {ci}", "i had {ci} [[and] {ci}] in it",
    ] },
    stolen_yes: { patterns: ["i think (someone | somebody) (took | stole) it", "(someone | somebody) (took | stole) it", "it was stolen", "[yes] (definitely | probably) stolen"] },
    stolen_no: { patterns: ["i think i [just] (lost | dropped) it", "i (probably | maybe) (lost | dropped) it", "[no] i (just | ) lost it", "it was not stolen"] },
    name_ctx: { patterns: ["{name}", "my name is {name} #h:name_mine", "(it is | i am) {name}", "(my | the) last name is {name}", "(my | the) first name is {name}", "[my | the] surname is {name} #tip:us_surname"] },
    spell_ctx: { patterns: ["{letters}", "(it is | that is | it is spelled | that is spelled) {letters} #h:spell_it"] },
    phone_ctx: { patterns: ["{digits}", "(it is | my number is | my phone number is | my cell is | my cell phone number is) {digits} #h:phone_its", "my mobile number is {digits} #tip:us_mobile", "you can (call | reach | text) me (at | on) {digits}", "(the number is | the best number is) {digits}"] },
    no_phone: { patterns: ["i (do not | ) have (a | an) (american | us | local) (number | phone number)", "i do not have a (phone | number | phone number) [here]", "my phone was (in my wallet | stolen too)"] },
    cancel_cards: { patterns: [
      "should i (cancel | block | freeze) my (cards | bank cards | credit cards | card | credit card) #h:q_cancel",
      "should i call my bank",
      "what about my (cards | credit cards | bank cards)",
      "i (already | ) (called | blocked | cancelled | canceled) my (cards | bank) [already] #done_cards",
      "should i (cancel | block | freeze) (them | it) [now]",
    ] },
    what_now: { patterns: [
      "what (should | do) i do now #h:q_what_now", "what happens now", "what is next", "what do i do next",
      "what happens (next | after this | after that | then)", "[so | and] what now", "what (should | can) i do (next | now)",
      "what (is | are) the next (step | steps)", "what (do | should) i (need to | have to) do [now | next]",
      "what (will | are) you (do | going to do) now", "what (will | is going to) happen now",
      "is there anything [else] i (should | can | need to) do [now]",
    ] },
    how_long: { patterns: ["how long (does it | will it) (take | usually take) #h:q_how_long", "when will i hear from you", "when will you (know | call me)"] },
    chances: { patterns: ["do you think you (will | can) find it", "will you find it", "is there a chance [someone will find it]", "do people (usually | ever | often) bring (them | wallets) (back | in)"] },
    copy: { patterns: ["(can | could | may) i (get | have) a copy [of the report] #h:q_copy", "do i get a copy"] },
    pen: { patterns: ["(do | can) you have a pen", "(can | could) i (borrow | have) a pen", "i need a pen"] },
    signed: { patterns: ["here you (go | are)", "there you go", "here it is", "[all] done", "i (signed | have signed) it", "okay i signed [it]", "(finished | all finished | i am finished | i am done)"] },
    // a bare "Where?" when asked to sign
    sign_where_ctx: { patterns: ["where [exactly]"] },
    sign_where: { patterns: ["where do i sign", "where should i sign", "(here | right here)", "[just] (here | right here) at the bottom", "at the bottom"] },
    fill_form: { patterns: [
      "do i (need | have) to fill out a form", "(is there | do you have) a form",
      "do i (need | have) to fill in a form #tip:us_fill_out",
    ] },
    its_mine: { patterns: ["[yes] (that is | it is) mine #h:its_mine", "[yes] that is my {item}", "[yes] that is it", "[oh] thank (god | goodness) [that is mine | that is it]"] },
    not_mine: { patterns: ["[no] (that is | it is) not mine #h:not_mine", "[no] that is not my {item}", "[no] mine is {dp}", "no my {item} is {dp}", "[no] my {item} is (bigger | smaller | different | older | newer)"] },
    all_there: { patterns: ["[yes] everything is (here | there | still here | inside | in it) #h:all_there", "nothing is missing", "[yes] it is all (here | there)", "[yes] [all] my {content} [and my {content}] (is | are) [all | still] (here | there | inside)"] },
    missing_some: { patterns: ["[no] the (cash | money) is (gone | missing)", "[no] (my | the) {content} (is | are) (gone | missing | not there | not here)", "[my {content} (is | are) here] [but] the (cash | money) is (gone | missing | not there)"] },
    bank_called: { patterns: ["[yes] i (did | have) [already]", "[yes] i (already | ) (called | blocked | cancelled | canceled) (them | my cards | my bank | it | the bank) [already]", "[yes] i called them [this morning | already]", "[yes] my cards (are | were) [already] (blocked | cancelled | canceled | frozen)", "[yes] i blocked (them | my cards) (in | with) the app", "[yes] i (call | called) [them | my bank] already"] },
    bank_not_yet: { patterns: [
      "[no] not yet", "[no] i (have not | did not) [called them | called my bank] [yet]", "[no] i have not had time [yet]",
      "[no | not yet] i will call (them | my bank | the bank) [right]? (after this | after | later | today | now | soon)", "[no] should i", "[no] i (did not | didn't) have (time | a chance)", "[no] i forgot", "[no] [not yet] i (will)? call (them | my bank | the bank)? (later | after | tomorrow | today | soon)",
    ] },
    no_id: { patterns: ["[no] it was in my {item}", "[no] (my | the) id was in (my | the) {item}", "[no] everything was in my {item}", "[no] [sorry] i (do not | don't) have (any)? (id | documents | identification) [with me]"] },
    have_id: { patterns: ["[yes] i have my passport", "[yes] i have (my | a) (passport | id card) [with me]", "[yes] here is my (passport | id)", "[yes] here is my (id card | driver s license | drivers license | license)", "[yes] (my | a) (passport | driver s license | drivers license | id | id card)"] },
    thanks_officer: { patterns: ["thank you [so much | very much] officer #h:thanks_officer", "thanks officer", "you have been (very | really | so) helpful"] },
    thats_all: { patterns: ["[no] that is (all | it) [thank you | thanks]", "[no] nothing else [thank you | thanks]", "[no] i am (good | fine) [thanks]", "[no] [i think] that is (all | it | everything) [thank you | thanks]", "no [it] is all [thank you | thanks]"] },
  },

  lines: {
    greet: [
      t("Good | afternoon. | How | can | I | help | you?", "Laba | diena. | Kaip | galiu | aš | padėti | jums?", "Laba diena. Kuo galiu padėti?"),
      t("Hi there. | What | can | I | do | for you?", "Sveiki. | Ką | galiu | aš | padaryti | jums?", "Sveiki. Kuo galiu padėti?"),
      t("Next, | please. | How | can | I | help?", "Kitas, | prašom. | Kaip | galiu | aš | padėti?", "Kitas, prašom. Kuo galiu padėti?"),
    ],
    ask_help: [
      t("How | can | I | help | you?", "Kaip | galiu | aš | padėti | jums?", "Kuo galiu padėti?"),
    ],
    sorry_hear: [
      t("I'm | sorry | to hear | that.", "Man | gaila | girdėti | tai.", "Gaila tai girdėti."),
      t("Okay, | I'm | sorry | about | that.", "Gerai, | man | gaila | dėl | to.", "Gerai, gaila dėl to."),
    ],
    ask_what_stolen: [
      t("What | was | stolen?", "Kas | buvo | pavogta?", "Kas buvo pavogta?"),
    ],
    ask_stolen_q: [
      t("Do | you | think | someone | took | it?", "Ar | jūs | manote, kad | kas nors | paėmė | {jis@X:acc}?", "Ar manote, kad kas nors {jis@X:acc} paėmė?", { flags: { 0: F_DO_Q } }),
    ],
    ask_happened: [
      t("Can | you | tell | me | what | happened?", "Ar galite | jūs | papasakoti | man, | kas | atsitiko?", "Ar galite papasakoti, kas atsitiko?"),
      t("Okay. | What | happened?", "Gerai. | Kas | atsitiko?", "Gerai. Kas atsitiko?"),
    ],
    ack: [
      t("I | see.", "Aš | suprantu.", "Suprantu."),
      t("Okay.", "Gerai.", "Gerai."),
      t("Got it.", "Supratau.", "Supratau."),
    ],
    ask_where: [
      t("Where | did | it | happen?", "Kur | — | tai | atsitiko?", "Kur tai atsitiko?", { flags: { 1: "Wh-question “did”: no Lithuanian word; the past tense sits on atsitiko." } }),
      t("Where | were | you | when | it | happened?", "Kur | buvote | jūs, | kai | tai | atsitiko?", "Kur buvote, kai tai atsitiko?"),
    ],
    ask_when: [
      t("And | what | time | was | that?", "O | kelintą | valandą | buvo | tai?", "O kelintą valandą tai buvo?"),
      t("When | was | this?", "Kada | buvo | tai?", "Kada tai buvo?"),
    ],
    ask_describe: [
      t("Can | you | describe | {X.the}?", "Ar galite | jūs | apibūdinti | {X.the:acc}?", "Ar galite apibūdinti {X.the:acc}?"),
      t("What | does | it | look | like?", "Kaip | — | {jis@X:nom} | atrodo | —?", "Kaip {jis@X:nom} atrodo?",
        { flags: { 1: "Question “does”: no Lithuanian word; the tense sits on atrodo.", 4: "“like” (look like): kaip … atrodo already says it." } }),
    ],
    describe_echo: [
      t("Okay, | {X.np}.", "Gerai, | {X.np:nom}.", "Gerai, {X.np:nom}."),
      t("Got it: | {X.np}.", "Supratau: | {X.np:nom}.", "Supratau: {X.np:nom}."),
    ],
    ask_contents: [
      t("What | was | in | it?", "Kas | buvo | — | {jis@X:loc}?", "Kas {jis@X:loc} buvo?", { flags: { 2: "“in”: the locative ending of the pronoun carries it." } }),
      t("And | what | was | inside?", "O | kas | buvo | viduje?", "O kas buvo viduje?"),
    ],
    ask_cash: [
      t("How much | cash, | roughly?", "Kiek | grynųjų, | apytiksliai?", "Kiek maždaug grynųjų?"),
    ],
    cash_echo: [
      t("About | {$price} | in cash. | Okay.", "Maždaug | {$price} | grynaisiais. | Gerai.", "Maždaug {$price} grynaisiais. Gerai."),
    ],
    contents_ok: [
      t("Okay, | I | wrote | that | down.", "Gerai, | aš | užsirašiau | tai | —.", "Gerai, užsirašiau.", { flags: { 4: "“down”: the prefix už- of užsirašiau carries it (linked to “wrote”)." } }),
      t("Okay, | got it.", "Gerai, | supratau.", "Gerai, supratau."),
    ],
    passport_embassy: [
      t("Your | passport | too? | Then | you | should | also | contact | your | embassy.", "Jūsų | pasas | taip pat? | Tada | jums | reikėtų | taip pat | susisiekti su | savo | ambasada.", "Ir pasas? Tada reikėtų susisiekti ir su savo ambasada.",
        { flags: { 4: "“you should”: the dative jums with the conditional reikėtų carries “should”." } }),
    ],
    ask_bank: [
      t("Have | you | called | your | bank | yet?", "Ar | jūs | paskambinote į | savo | banką | jau?", "Ar jau paskambinote į banką?",
        { flags: { 0: "Perfect “Have” in a yes/no question = the particle ar; the past tense sits on paskambinote." } }),
    ],
    bank_good: [
      t("Good.", "Puiku.", "Puiku."),
    ],
    block_cards: [
      t("You | should | call | them | right away | and | block | your | cards.", "Jums | reikėtų | paskambinti | jiems | iš karto | ir | užblokuoti | savo | korteles.", "Reikėtų iš karto paskambinti į banką ir užblokuoti korteles.",
        { flags: { 0: "“You should”: the dative jums with the conditional reikėtų carries it." } }),
    ],
    ask_id: [
      t("Do | you | have | any | ID | with | you?", "Ar | jūs | turite | kokį nors | asmens dokumentą | su | savimi?", "Ar turite su savimi kokį nors asmens dokumentą?", { flags: { 0: F_DO_Q } }),
    ],
    id_of_course: [
      t("Right, | of course. | That's | okay.", "Tiesa, | žinoma. | Tai yra | gerai.", "Tiesa, žinoma. Nieko tokio."),
    ],
    id_thanks: [
      t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
    ],
    details: [
      t("Okay, | I'll need | some | details | for the report.", "Gerai, | man reikės | — | duomenų | pranešimui.", "Gerai, pranešimui man reikės kelių duomenų.",
        { flags: { 2: "Partitive “some”: the genitive duomenų carries it." } }),
    ],
    ask_name: [
      t("Can | I | get | your | name?", "Ar galiu | aš | gauti | jūsų | vardą?", "Koks jūsų vardas ir pavardė?"),
      t("What's | your | full | name?", "Koks yra | jūsų | pilnas | vardas?", "Koks jūsų vardas ir pavardė?"),
    ],
    ask_last_name: [
      t("And | your | last name?", "O | jūsų | pavardė?", "O pavardė?"),
    ],
    ask_spell: [
      t("Could | you | spell | your | last name | for me?", "Ar galėtumėte | jūs | pasakyti paraidžiui | savo | pavardę | man?", "Ar galėtumėte man pasakyti pavardę paraidžiui?"),
      t("How | do | you | spell | your | last name?", "Kaip | — | jūs | rašote | savo | pavardę?", "Kaip rašoma jūsų pavardė?", { flags: { 1: "Question “do”: no Lithuanian word; the tense sits on rašote." } }),
    ],
    spell_ok: [
      t("Thank | you.", "Dėkoju | jums.", "Ačiū."),
      t("Got it, | thanks.", "Supratau, | ačiū.", "Supratau, ačiū."),
    ],
    spell_again: [
      t("Sorry, | letter | by | letter, | please.", "Atsiprašau, | raidė | po | raidės, | prašom.", "Atsiprašau, paraidžiui, prašom."),
    ],
    ask_phone: [
      t("And | a | phone | number | where | we | can | reach | you?", "Ir | — | telefono | numeris, | kuriuo | mes | galime | susisiekti su | jumis?", "Ir telefono numeris, kuriuo galėtume su jumis susisiekti?"),
      t("What's | the | best | number | to reach | you?", "Koks yra | — | geriausias | numeris | susisiekti su | jumis?", "Kokiu numeriu geriausia su jumis susisiekti?"),
    ],
    phone_ok: [
      t("Thanks.", "Ačiū.", "Ačiū."),
    ],
    no_phone_ok: [
      t("That's | okay. | You | can | call | us, | then.", "Tai yra | gerai. | Jūs | galite | paskambinti | mums, | tada.", "Nieko tokio. Tada jūs galite mums paskambinti."),
    ],
    sign: [
      t("Please | check | the | report | and | sign | here.", "Prašom | patikrinti | — | pranešimą | ir | pasirašyti | čia.", "Prašom patikrinti pranešimą ir pasirašyti čia."),
      t("Please | fill out | this | form | and | sign | at the bottom.", "Prašom | užpildyti | šią | formą | ir | pasirašyti | apačioje.", "Prašom užpildyti šią formą ir pasirašyti apačioje."),
    ],
    sign_ok: [
      t("Great, | thank | you.", "Puiku, | dėkoju | jums.", "Puiku, ačiū."),
      t("Thanks.", "Ačiū.", "Ačiū."),
    ],
    sign_where: [
      t("Right | here, | at the bottom.", "Tiesiai | čia, | apačioje.", "Štai čia, apačioje."),
    ],
    pen: [
      t("Sure, | here's | a | pen.", "Žinoma, | štai | — | rašiklis.", "Žinoma, štai rašiklis."),
    ],
    form_yes: [
      t("Yes, | but | don't worry, | I'll help | you.", "Taip, | bet | nesijaudinkite, | padėsiu | jums.", "Taip, bet nesijaudinkite, aš jums padėsiu."),
    ],
    case_number: [
      t("Here's | your | case | number: | 4471.", "Štai | jūsų | bylos | numeris: | 4471.", "Štai jūsų bylos numeris: 4471.", { say: "Here's your case number: four, four, seven, one.", write: "Case number: 4471 · Maple Harbor Police" }),
    ],
    will_call: [
      t("We'll call | you | if | someone | finds | it.", "Paskambinsime | jums, | jei | kas nors | ras | {jis@X:acc}.", "Paskambinsime, jei kas nors {jis@X:acc} ras."),
      t("If | it | turns up, | we'll call | you.", "Jei | {jis@X:nom} | atsiras, | paskambinsime | jums.", "Jei {jis@X:nom} atsiras, jums paskambinsime."),
    ],
    cards_yes: [
      t("Yes, | call | your | bank | right away | and | cancel | them.", "Taip, | paskambinkite į | savo | banką | iš karto | ir | užblokuokite | jas.", "Taip, iš karto paskambinkite į banką ir užblokuokite jas."),
    ],
    cards_done: [
      t("Good. | That's | the | most | important | thing.", "Puiku. | Tai yra | — | pats | svarbiausias | dalykas.", "Puiku. Tai svarbiausia."),
    ],
    what_now: [
      t("Call | your | bank, | and | we'll call | you | if | it | turns up.", "Paskambinkite | savo | bankui, | o | mes paskambinsime | jums, | jei | {jis@X:nom} | atsiras.", "Paskambinkite į banką, o mes paskambinsime jums, jei {jis@X:nom} atsiras."),
    ],
    how_long: [
      t("It's | hard | to say. | Sometimes | it | takes | a | few | days.", "Yra | sunku | pasakyti. | Kartais | tai | užtrunka | — | kelias | dienas.", "Sunku pasakyti. Kartais tai užtrunka kelias dienas."),
    ],
    chances: [
      t("I | hope | so. | Wallets | often | turn up.", "Aš | tikiuosi | —. | Piniginės | dažnai | atsiranda.", "Tikiuosi. Piniginės dažnai atsiranda.", { flags: { 2: "“so”: no Lithuanian word; tikiuosi alone says “I hope so”." } }),
    ],
    copy: [
      t("Of course. | Here's | a | copy | for you.", "Žinoma. | Štai | — | kopija | jums.", "Žinoma. Štai jums kopija."),
    ],
    found: [
      t("Oh, | wait | a | second. | Someone | just | brought in | {X.np}.", "O, | palaukite | — | sekundę. | Kažkas | ką tik | atnešė | {X.np:acc}.", "O, palaukite. Kažkas ką tik atnešė {X.np:acc}."),
    ],
    found_ask: [
      t("Is | this | yours?", "Ar | tai | jūsų?", "Ar tai jūsų?", { flags: { 0: F_IS_Q } }),
    ],
    found_reask: [
      t("So, | is | this | yours?", "Tai | ar | tai | jūsų?", "Tai ar tai jūsų?", { flags: { 1: F_IS_Q } }),
    ],
    found_sure: [
      t("Are | you | sure? | You | said | it | was | {X.np}.", "Ar | jūs | {m:tikras|f:tikra}? | Jūs | sakėte, kad | tai | buvo | {X.np:nom}.", "Ar tikrai? Sakėte, kad tai buvo {X.np:nom}.", { flags: { 0: "“Are” in a yes/no question = the particle ar." } }),
    ],
    found_verify: [
      t("Great! | Can | you | tell | me | your | name? | I'll check | the | ID | inside.", "Puiku! | Ar galite | jūs | pasakyti | man | savo | vardą? | Patikrinsiu | — | dokumentą | viduje.", "Puiku! Ar galite pasakyti savo vardą? Patikrinsiu dokumentą viduje."),
    ],
    found_match: [
      t("Perfect, | that | matches. | Here you go. | Please | check | that | everything's | there.", "Puiku, | tai | sutampa. | Prašom. | Prašom | patikrinti, | ar | viskas yra | vietoje.", "Puiku, sutampa. Prašom. Patikrinkite, ar viskas vietoje."),
    ],
    lucky: [
      t("You're lucky!", "Jums pasisekė!", "Jums pasisekė!"),
    ],
    not_yours: [
      t("Okay, | then | let's continue | with the report.", "Gerai, | tada | tęskime | pranešimą.", "Gerai, tada tęskime pranešimą."),
    ],
    missing_some: [
      t("I'm | sorry. | Then | let's file | a | report | anyway.", "Man | gaila. | Tada | surašykime | — | pranešimą | vis tiek.", "Gaila. Tada vis tiek surašykime pranešimą."),
    ],
    anything_else: [
      t("Anything | else | I | can | do | for you?", "Ką nors | dar | aš | galiu | padaryti | jums?", "Ar dar kuo nors galiu padėti?"),
    ],
    closing: [
      t("Good luck. | I | hope | we | find | it.", "Sėkmės. | Aš | tikiuosi, kad | mes | rasime | {jis@X:acc}.", "Sėkmės. Tikiuosi, kad {jis@X:acc} rasime."),
    ],
    closing_welcome: [
      t("You're welcome. | Take care.", "Prašom. | Laikykitės.", "Prašom. Laikykitės."),
    ],
    closing_care: [
      t("Take care.", "Laikykitės.", "Laikykitės."),
    ],
    welcome: [
      t("You're welcome.", "Prašom.", "Prašom."),
    ],
  },

  domains: {
    price: () => { const s: number[] = []; for (let d = 1; d <= 500; d++) s.push(d * 100); return s; },
  },

  hints: {
    report: {
      lt: "Pranešti, kas nutiko", slot: "item", examples: ["wallet"],
      items: [
        { id: "report_item", s: t("I'd like | to report | a | stolen | {X}.", "Norėčiau | pranešti apie | — | {pavogtas@X:acc} | {X:acc}.", "Norėčiau pranešti apie {pavogtas@X:acc} {X:acc}.") },
        { id: "report_theft", s: t("I'd like | to report | a | theft.", "Norėčiau | pranešti apie | — | vagystę.", "Norėčiau pranešti apie vagystę.") },
        { id: "someone_stole", s: t("Someone | stole | my | {X}.", "Kažkas | pavogė | mano | {X:acc}.", "Kažkas pavogė mano {X:acc}.") },
        { id: "was_stolen", s: t("My | {X} | was stolen.", "Mano | {X:nom} | buvo {pavogtas@X:nom}.", "Mano {X:nom} buvo {pavogtas@X:nom}.") },
        { id: "lost_item", s: t("I've lost | my | {X}.", "Pamečiau | savo | {X:acc}.", "Pamečiau {X:acc}.") },
      ],
    },
    what: {
      lt: "Pasakyti, kas pavogta", slot: "item", examples: ["wallet"],
      items: [
        { id: "what_mine", s: t("My | {X}.", "Mano | {X:nom}.", "Mano {X:nom}.") },
        { id: "someone_stole", s: t("Someone | stole | my | {X}.", "Kažkas | pavogė | mano | {X:acc}.", "Kažkas pavogė mano {X:acc}.") },
      ],
    },
    stolen: {
      lt: "Atsakyti, ar ją kas nors paėmė",
      items: [
        { id: "stolen_yes", s: t("Yes, | I | think | someone | took | it.", "Taip, | aš | manau, | kas nors | paėmė | ją.", "Taip, manau, kad kažkas ją paėmė.") },
        { id: "stolen_no", s: t("No, | I | think | I | just | dropped | it.", "Ne, | aš | manau, | aš | tiesiog | pamečiau | ją.", "Ne, manau, kad tiesiog ją pamečiau.") },
        { id: "not_sure", s: t("I'm | not | sure.", "Aš | nesu | {m:tikras|f:tikra}.", "Nesu {m:tikras|f:tikra}.", { flags: { 1: "“not” + the copula of “I'm”: Lithuanian negates the verb itself (nesu)." } }) },
      ],
    },
    happened: {
      lt: "Papasakoti, kas atsitiko",
      items: [
        { id: "h_was_at", s: t("I | was | at | the | farmers' | market.", "Aš | buvau | — | — | ūkininkų | turguje.", "Buvau ūkininkų turguje.", { flags: { 2: "“at”: the locative turguje carries it; ūkininkų stands between." } }) },
        { id: "h_gone", s: t("When | I | wanted | to pay, | it | was | gone.", "Kai | aš | norėjau | sumokėti, | jos | nebuvo | —.", "Kai norėjau sumokėti, jos nebebuvo.", { flags: { 6: "“gone”: carried by the negated verb nebuvo (there was no …); the subject goes into the genitive jos." } }) },
        { id: "h_bumped", s: t("Someone | bumped into | me.", "Kažkas | atsitrenkė į | mane.", "Kažkas į mane atsitrenkė.") },
        { id: "h_pocket", s: t("It | was | in | my | back | pocket.", "Ji | buvo | — | mano | galinėje | kišenėje.", "Ji buvo mano galinėje kišenėje.", { flags: { 2: "“in”: the locative kišenėje carries it; the possessive and adjective stand between." } }) },
      ],
    },
    where: {
      lt: "Pasakyti, kur tai buvo", slot: "place", examples: ["market", "cafe", "fruit_stand"],
      items: [H_AT_PLACE, H_WAS_AT, H_NEAR, H_ON_BUS, H_IN_TAXI].map((h) => ({ ...h, id: "where" })),
    },
    when: {
      lt: "Pasakyti, kada tai buvo",
      items: [
        { id: "when", s: t("Around | 11.", "Apie | 11.", "Apie vienuoliktą.", { say: "Around eleven." }) },
        { id: "when", s: t("About | an | hour | ago.", "Maždaug | — | valandą | prieš.", "Maždaug prieš valandą.", { flags: { 3: "“ago” = prieš; Lithuanian puts it before the noun (prieš valandą)." } }) },
        { id: "when", s: t("This | morning.", "Šį | rytą.", "Šį rytą.") },
        { id: "where", s: t("At | the | market, | around | 11.", "— | — | Turguje, | apie | 11.", "Turguje, apie vienuoliktą.", { say: "At the market, around eleven.", flags: { 0: "“At”: the locative turguje carries it." } }) },
      ],
    },
    describe: {
      lt: "Apibūdinti piniginę",
      items: [
        { id: "describe", s: t("It's | small | and | brown.", "Ji yra | maža | ir | ruda.", "Ji maža ir ruda.") },
        { id: "describe", s: t("It's | a | black | leather | wallet.", "Tai yra | — | juoda | odinė | piniginė.", "Tai juoda odinė piniginė.") },
        { id: "describe", s: t("It's | brown, | leather, | and | small.", "Ji yra | ruda, | odinė | ir | maža.", "Ji ruda, odinė ir maža.") },
      ],
    },
    contents: {
      lt: "Pasakyti, kas buvo piniginėje", slot: "content", examples: ["license", "credit_card", "cash"],
      items: [
        { id: "contents", s: t("My | cards | and | some | cash.", "Mano | kortelės | ir | — | grynųjų.", "Mano kortelės ir šiek tiek grynųjų.", { flags: { 3: "Partitive “some”: the genitive grynųjų carries it." } }), only: (e) => e.id === "cards" || e.id === "cash" },
        { id: "contents", s: t("My | {X} | was | in | it.", "Mano | {X:nom} | buvo | — | joje.", "Joje buvo mano {X:nom}.", { flags: { 3: "“in it” = joje: the locative pronoun carries “in”." } }), only: (e) => !PLURAL.includes(e.id) },
        { id: "contents", s: t("Just | some | cash.", "Tik | — | grynųjų.", "Tik šiek tiek grynųjų.", { flags: { 1: "Partitive “some”: the genitive grynųjų carries it." } }), only: (e) => e.id === "cash" },
        { id: "contents", s: t("My | {X} | were | in | it.", "Mano | {X:nom} | buvo | — | joje.", "Joje buvo mano {X:nom}.", { flags: { 3: "“in it” = joje: the locative pronoun carries “in”." } }), only: (e) => PLURAL.includes(e.id) && e.id !== "cash" },
        { id: "contents", s: t("My | cards, | my | driver's | license, | and | about | $40 | in cash.", "Mano | kortelės, | mano | vairuotojo | pažymėjimas | ir | maždaug | 40 $ | grynaisiais.", "Mano kortelės, vairuotojo pažymėjimas ir maždaug 40 $ grynaisiais.", { say: "My cards, my driver's license, and about forty dollars in cash." }), only: (e) => ["cards", "license", "cash"].includes(e.id) },
      ],
    },
    cash: {
      lt: "Pasakyti, kiek buvo grynųjų",
      items: [
        { id: "contents", s: t("About | $40.", "Maždaug | 40 $.", "Maždaug 40 $.", { say: "About forty dollars." }) },
        { id: "contents", s: t("Around | $20.", "Apie | 20 $.", "Apie 20 $.", { say: "Around twenty dollars." }) },
        { id: "contents", s: t("Maybe | $10.", "Gal | 10 $.", "Gal 10 $.", { say: "Maybe ten dollars." }) },
      ],
    },
    bank: {
      lt: "Atsakyti, ar jau skambinai į banką",
      items: [
        { id: "bank_called", s: t("Yes, | I | already | called | them.", "Taip, | aš | jau | paskambinau | jiems.", "Taip, jau jiems paskambinau.") },
        { id: "bank_not_yet", s: t("No, | not yet.", "Ne, | dar ne.", "Ne, dar ne.") },
        { id: "q_cancel", s: t("Should | I | cancel | my | cards?", "Ar | man | užblokuoti | savo | korteles?", "Ar man užblokuoti korteles?", { flags: { 0: "“Should” in a yes/no question = the particle ar; the dative man with the infinitive carries “should I”." } }) },
      ],
    },
    id: {
      lt: "Atsakyti, ar turi dokumentą",
      items: [
        { id: "no_id", s: t("No, | it | was | in | my | wallet.", "Ne, | jis | buvo | — | mano | piniginėje.", "Ne, jis buvo piniginėje.", { flags: { 1: "“it” = the document (dokumentas), so the pronoun is masculine: jis.", 3: "“in”: the locative piniginėje carries it; the possessive stands between." } }) },
        { id: "have_id", s: t("Yes, | I | have | my | passport.", "Taip, | aš | turiu | savo | pasą.", "Taip, turiu pasą.") },
      ],
    },
    name: {
      lt: "Pasakyti vardą ir pavardę",
      items: [
        { id: "name_mine", s: t("{$name} | {$surname}.", "{$name} | {$surname}.", "{$name} {$surname}.") },
        { id: "name_mine", s: t("My | name | is | {$name} | {$surname}.", "Mano | vardas | yra | {$name} | {$surname}.", "Mano vardas ir pavardė – {$name} {$surname}.") },
        { id: "name_mine", s: t("My | name | is | {$name}.", "Mano | vardas | yra | {$name}.", "Mano vardas – {$name}.") },
      ],
    },
    last_name: {
      lt: "Pasakyti pavardę",
      items: [
        { id: "name_mine", s: t("{$surname}.", "{$surname}.", "{$surname}.") },
        { id: "name_mine", s: t("It's | {$surname}.", "Tai | {$surname}.", "{$surname}.") },
        { id: "name_mine", s: t("My | last name | is | {$surname}.", "Mano | pavardė | yra | {$surname}.", "Mano pavardė – {$surname}.") },
      ],
    },
    spell: {
      lt: "Pasakyti pavardę paraidžiui",
      items: [
        { id: "spell_it", s: t("{$letters}.", "{$letters}.", "{$letters}.") },
        { id: "spell_it", s: t("It's | {$letters}.", "Tai | {$letters}.", "{$letters}.", { say: "It's {$letters}." }) },
      ],
    },
    phone: {
      lt: "Pasakyti telefono numerį",
      items: [
        { id: "phone_its", s: t("My | number | is | 555-0142.", "Mano | numeris | yra | 555-0142.", "Mano numeris – 555-0142.", { say: "My number is five five five, oh one four two." }) },
        { id: "phone_its", s: t("It's | 555-0142.", "Tai | 555-0142.", "555-0142.", { say: "It's five five five, oh one four two." }) },
      ],
    },
    sign: {
      lt: "Pasirašyti arba paklausti, kur pasirašyti",
      items: [
        { id: "sign_where", s: t("Sure. | Where | do | I | sign?", "Žinoma. | Kur | — | man | pasirašyti?", "Žinoma. Kur pasirašyti?", { flags: { 2: "Question “do”: no Lithuanian word; the dative man with the infinitive carries it." } }) },
        { id: "pen", s: t("Okay. | Do | you | have | a | pen?", "Gerai. | Ar | jūs | turite | — | rašiklį?", "Gerai. Ar turite rašiklį?", { flags: { 1: F_DO_Q } }) },
        { id: "signed", s: t("Here you go.", "Prašom.", "Prašom.") },
      ],
    },
    questions: {
      lt: "Paklausti, ką daryti toliau",
      items: [
        { id: "q_cancel", s: t("Should | I | cancel | my | cards?", "Ar | man | užblokuoti | savo | korteles?", "Ar man užblokuoti korteles?", { flags: { 0: "“Should” in a yes/no question = the particle ar; the dative man with the infinitive carries “should I”." } }) },
        { id: "q_what_now", s: t("What | should | I | do | now?", "Ką | reikėtų | man | daryti | dabar?", "Ką man dabar daryti?") },
        { id: "q_how_long", s: t("How | long | does | it | take?", "Kaip | ilgai | — | tai | užtrunka?", "Kiek tai užtrunka?", { flags: { 2: "Question “does”: no Lithuanian word; the tense sits on užtrunka." } }) },
        { id: "q_copy", s: t("Could | I | get | a | copy | of the report?", "Ar galėčiau | aš | gauti | — | kopiją | pranešimo?", "Ar galėčiau gauti pranešimo kopiją?") },
      ],
    },
    found: {
      lt: "Atsakyti, ar tai tavo piniginė",
      items: [
        { id: "its_mine", s: t("Yes, | that's | mine!", "Taip, | tai yra | mano!", "Taip, tai mano!") },
        { id: "not_mine", s: t("No, | that's | not | mine.", "Ne, | tai | nėra | mano.", "Ne, tai ne mano.", { flags: { 1: "“'s” (is) takes the negation in Lithuanian: nėra stands under “not”." } }) },
        { id: "not_mine", s: t("No, | mine | is | brown.", "Ne, | mano | yra | ruda.", "Ne, mano ruda.") },
      ],
    },
    all_there: {
      lt: "Pasakyti, ar viskas vietoje",
      items: [
        { id: "all_there", s: t("Yes, | everything's | here.", "Taip, | viskas yra | čia.", "Taip, viskas vietoje.") },
        { id: "missing_some", s: t("No, | the | cash | is gone.", "Ne, | — | grynųjų | nebėra.", "Ne, grynųjų nebėra.", { flags: { 2: "After the negated nebėra (is gone), the subject goes into the genitive: grynųjų." } }) },
      ],
    },
    thanks: {
      lt: "Padėkoti ir atsisveikinti",
      items: [
        { id: "thats_all", s: t("No, | that's | all. | Thank | you.", "Ne, | tai yra | viskas. | Dėkoju | jums.", "Ne, tai viskas. Ačiū.") },
        { id: "thanks_officer", s: t("Thank | you, | officer.", "Dėkoju | jums, | pareigūne.", "Ačiū, pareigūne.") },
        { id: "thats_all", s: t("No, | thanks. | Bye!", "Ne, | ačiū. | Viso gero!", "Ne, ačiū. Viso gero!") },
      ],
    },
  },

  tips: {
    us_wallet: { key: "us_wallet", lt: "Suprasta! Amerikoje „purse“ – tai rankinė. Piniginė – „wallet“.", better: "I'd like to report a stolen wallet." },
    us_license: { key: "us_license", lt: "Suprasta! Amerikoje sakoma „driver's license“.", better: "My driver's license was in it." },
    us_fill_out: { key: "us_fill_out", lt: "Suprasta! Amerikoje formą dažniau „fill out“.", better: "Do I need to fill out a form?" },
    us_surname: { key: "us_surname", lt: "Suprasta! Amerikoje dažniau sakoma „last name“.", better: "My last name is …" },
    us_mobile: { key: "us_mobile", lt: "Suprasta! Amerikoje sakoma „cell phone“ arba tiesiog „phone“.", better: "My cell phone number is …" },
  },

  merges: {
    "let's continue": { reason: "grammatical_fusion", split: "Let's → leiskime + continue → tęsti is a calque; the first person plural imperative tęskime carries “let's”.", minimal: "Two words." },
    "let's file": { reason: "grammatical_fusion", split: "Let's → leiskime + file → surašyti is a calque; the first person plural imperative surašykime carries “let's”.", minimal: "Two words." },
    "you're lucky": { reason: "lexical_expression", split: "You're → jūs esate + lucky → laimingas gives “you are happy”; = jums pasisekė (C-LEX).", minimal: "Two words." },
    "i've lost": { reason: "grammatical_fusion", split: "I've → aš turiu + lost → pamestas is false; the perfect auxiliary has no Lithuanian word: pamečiau.", minimal: "Object stays outside." },
    "to report": { reason: "grammatical_fusion", split: "Infinitive “to” → į would be false; the infinitive ending carries it (C-INF); report → pranešti apie takes apie.", minimal: "Two words." },
    "last name": { reason: "lexical_expression", split: "last → paskutinis + name → vardas is a calque; = pavardė.", minimal: "Two words." },
    "fill out": { reason: "lexical_expression", split: "out → lauk is mechanical; fill out a form = užpildyti (C-PHR).", minimal: "Two words." },
    "at the bottom": { reason: "grammatical_fusion", split: "The locative apačioje carries “at the” (C-CASE).", minimal: "No adjective inside." },
    "for the report": { reason: "grammatical_fusion", split: "The dative pranešimui carries “for the” (C-CASE).", minimal: "No adjective inside." },
    "i'll need": { reason: "grammatical_fusion", split: "I'll → aš + need → reikia: Lithuanian says man reikės (dative + future), so the pronoun and “'ll” fuse.", minimal: "Object stays outside." },
    "turns up": { reason: "lexical_expression", split: "turns → sukasi + up → aukštyn is false; something lost “turns up” = atsiranda (C-PHR).", minimal: "Two words." },
    "turn up": { reason: "lexical_expression", split: "turn → sukti + up → aukštyn is false; = atsirasti (C-PHR).", minimal: "Two words." },
    "brought in": { reason: "lexical_expression", split: "in → į is carried by the prefix at- of atnešė (C-PHR).", minimal: "Two words." },
    "bumped into": { reason: "lexical_expression", split: "bumped → trenkėsi + into → į: the Lithuanian verb takes į, so both words = atsitrenkė į (C-PHR).", minimal: "Two words." },
    "was stolen": { reason: "grammatical_fusion", split: "Passive: was → buvo + stolen → pavogta; kept as one unit because the participle agrees with the subject.", minimal: "Two words." },
    "right away": { reason: "lexical_expression", split: "right → dešinė + away → toli is false; = iš karto.", minimal: "Two words." },
    "good luck": { reason: "lexical_expression", split: "good → geras + luck → sėkmė as a noun phrase is not the wish; = sėkmės!", minimal: "Two words." },
    "of the report": { reason: "grammatical_fusion", split: "The genitive pranešimo carries “of the” (C-CASE).", minimal: "No adjective inside." },
    "not yet": { reason: "lexical_expression", split: "not → ne + yet → dar gives “ne dar”; the reply = dar ne (the order carries the meaning).", minimal: "Two words." },
    "is gone": { reason: "lexical_expression", split: "is → yra + gone → nuėjęs is false; something “is gone” = nebėra (with a genitive subject).", minimal: "Two words." },
    "we'll call": { reason: "grammatical_fusion", split: "“'ll” (will): the future ending of paskambinsime carries it (C-FUT).", minimal: "Object stays outside." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Papasakok, kas nutiko piniginei", done: toldWhat },
    { lt: "Pasakyk, kur ir kada tai buvo", done: (c) => !!(c.s.place || c.s.placeSkipped) && !!(c.s.time || c.s.timeSkipped) },
    { lt: "Apibūdink piniginę", done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped) },
    { lt: "Pasakyk, kas joje buvo", optional: true, when: (c) => item(c) !== "phone",
      done: (c) => !!(c.s.contents || c.s.contentsSkipped) && (!c.s.needCash || c.s.cashAmount !== undefined || !!c.s.noCashAmount) && (!cardsQ(c) || !!c.s.bankDone) },
    { lt: "Pasakyk, ar tai tavo", optional: true, when: (c) => !!c.s.foundAsked, done: (c) => !!c.s.foundAsked && !!c.s.found },
    { lt: "Pasakyk vardą ir pavardę", done: (c) => !!c.s.lastName && (!spellQ(c) || !!c.s.spelled) },
    { lt: "Pasakyk telefono numerį", optional: true, when: (c) => c.s.found !== "mine", done: (c) => !!c.s.phone },
  ],

  steps: [
    { id: "report", done: (c) => !!(c.s.item || c.s.theft),
      ask: (c) => c.say("ask_help"),
      expects: ["report"],
      suggest: [{ lt: "Pranešti apie pavogtą ar pamestą piniginę", hint: "report", options: "item" }] },
    { id: "what_item", when: (c) => !!c.s.theft && !c.s.item, done: (c) => !!c.s.item,
      ask: (c) => c.say("ask_what_stolen"),
      expects: ["what_item_ctx", "report"],
      suggest: [{ lt: "Pasakyti, kas pavogta", hint: "what", options: "item" }] },
    { id: "stolen_q", when: (c) => !!c.s.item && c.s.kind === "unsure", done: (c) => c.s.kind !== "unsure",
      ask: (c) => c.say("ask_stolen_q", { X: item(c) }),
      expects: ["stolen_yes", "stolen_no"],
      suggest: [{ lt: "Atsakyti, ar ją kas nors paėmė", hint: "stolen" }],
      yes: (c) => { c.s.kind = "stolen"; c.say("ack"); },
      no: (c) => { c.s.kind = "lost"; c.say("ack"); },
      help: (c) => { c.s.kind = "maybe"; c.say("ack"); } },
    { id: "happened", when: (c) => !!c.s.item && !!c.s.askHappened && c.s.kind !== "lost", done: (c) => !!c.s.happened,
      ask: (c) => c.say("ask_happened"),
      expects: ["happened", "where_when"],
      suggest: [{ lt: "Papasakoti, kas atsitiko", hint: "happened" }],
      help: (c) => { c.s.happened = true; c.say("ack"); } },
    { id: "where", when: (c) => !!c.s.item, done: (c) => !!c.s.place || !!c.s.placeSkipped,
      ask: (c) => c.say("ask_where"),
      expects: ["where_when", "happened"],
      suggest: [{ lt: "Pasakyti, kur tai buvo", hint: "where", options: "place" }],
      help: (c) => { c.s.placeSkipped = true; c.say("ack"); } },
    { id: "when", when: (c) => !!c.s.item, done: (c) => !!c.s.time || !!c.s.timeSkipped,
      ask: (c) => c.say("ask_when"),
      expects: ["where_when"],
      suggest: [{ lt: "Pasakyti, kada tai buvo", hint: "when" }],
      help: (c) => { c.s.timeSkipped = true; c.say("ack"); } },
    { id: "describe", when: (c) => !!c.s.item, done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      ask: (c) => c.say("ask_describe", { X: item(c) }),
      expects: ["describe"],
      suggest: [{ lt: "Apibūdinti, kaip ji atrodo", hint: "describe" }],
      help: (c) => { c.s.describeSkipped = true; c.say("ack"); } },
    { id: "contents", when: (c) => !!c.s.item && item(c) !== "phone", done: (c) => !!c.s.contents || !!c.s.contentsSkipped,
      ask: (c) => c.say("ask_contents", { X: item(c) }),
      expects: ["contents", "no_cash"],
      suggest: [{ lt: "Pasakyti, kas buvo viduje", hint: "contents", options: "content" }],
      help: (c) => { c.s.contentsSkipped = true; c.say("ack"); } },
    { id: "cash_amount", when: (c) => !!c.s.needCash, done: (c) => c.s.cashAmount !== undefined || !!c.s.noCashAmount,
      ask: (c) => c.say("ask_cash"),
      expects: ["contents", "no_cash"],
      suggest: [{ lt: "Pasakyti, kiek buvo grynųjų", hint: "cash" }],
      help: (c) => { c.s.noCashAmount = true; c.say("ack"); } },
    { id: "bank", when: cardsQ, done: (c) => !!c.s.bankDone,
      ask: (c) => c.say("ask_bank"),
      expects: ["cancel_cards", "bank_called", "bank_not_yet"],
      suggest: [{ lt: "Atsakyti, ar jau skambinai į banką", hint: "bank" }],
      yes: (c) => { c.s.bankDone = true; c.say("bank_good"); },
      no: (c) => { c.s.bankDone = true; c.say("block_cards"); } },
    { id: "found", when: (c) => !!c.s.foundTwist && (!!c.s.contents || !!c.s.contentsSkipped || item(c) === "phone") && !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      done: (c) => !!c.s.found,
      ask: (c) => {
        if (c.s.foundAsked) { c.say("found_reask"); return; }
        c.s.foundAsked = true;
        c.twist("turned_in");
        c.say("found", { X: itemNp(c, c.s.foundColor) }); c.say("found_ask");
      },
      expects: ["its_mine", "not_mine"],
      suggest: [{ lt: "Atsakyti, ar tai tavo", hint: "found" }],
      yes: (c) => police.handlers.its_mine(c, {}, { intent: "its_mine", slots: {}, tags: [] }),
      no: (c) => police.handlers.not_mine(c, {}, { intent: "not_mine", slots: {}, tags: [] }) },
    { id: "id_q", when: (c) => !!c.s.askId && !c.s.found && !!c.s.contents, done: (c) => !!c.s.idDone,
      ask: (c) => c.say("ask_id"),
      expects: ["no_id", "have_id"],
      suggest: [{ lt: "Atsakyti, ar turi dokumentą", hint: "id" }],
      yes: (c) => { c.s.idDone = true; c.say("id_thanks"); },
      no: (c) => { c.s.idDone = true; c.say("id_of_course"); } },
    { id: "name", when: (c) => !!c.s.item && (c.s.found === "mine" || !c.s.foundTwist || c.s.found === "no"), done: (c) => !!c.s.name,
      ask: (c) => {
        if (c.s.found === "mine") { c.say("found_verify"); return; }
        if (!c.s.detailsSaid) { c.s.detailsSaid = true; c.say("details"); }
        c.say("ask_name");
      },
      expects: ["name_ctx"],
      suggest: [{ lt: "Pasakyti vardą ir pavardę", hint: "name" }] },
    { id: "last_name", when: (c) => !!c.s.name && !c.s.lastName, done: (c) => !!c.s.lastName,
      ask: (c) => c.say("ask_last_name"),
      expects: ["name_ctx", "spell_ctx"],
      suggest: [{ lt: "Pasakyti pavardę", hint: "last_name" }] },
    { id: "spell", when: (c) => !!c.s.lastName && spellQ(c), done: (c) => !!c.s.spelled,
      ask: (c) => c.say(c.s.spellAsked ? "spell_again" : "ask_spell"),
      expects: ["spell_ctx"],
      suggest: [{ lt: "Pasakyti pavardę paraidžiui", hint: "spell" }] },
    { id: "check_all", when: (c) => c.s.found === "mine" && !!c.s.name, done: (c) => !!c.s.checkedInside,
      ask: (c) => c.say("found_match"),
      expects: ["all_there", "missing_some"],
      suggest: [{ lt: "Patikrinti ir pasakyti, ar viskas vietoje", hint: "all_there" }],
      yes: (c) => { c.s.checkedInside = true; c.say("lucky"); c.complete(); },
      no: (c) => { c.s.checkedInside = true; c.s.found = "partial"; c.say("missing_some"); } },
    { id: "phone", when: (c) => !!c.s.lastName && c.s.found !== "mine", done: (c) => !!c.s.phone,
      ask: (c) => c.say("ask_phone"),
      expects: ["phone_ctx", "no_phone"],
      suggest: [{ lt: "Pasakyti telefono numerį", hint: "phone" }] },
    { id: "sign", when: (c) => !!c.s.phone && !!c.s.askSign && c.s.found !== "mine", done: (c) => !!c.s.signed,
      ask: (c) => c.say("sign"),
      expects: ["sign_where", "pen", "signed", "sign_where_ctx"],
      suggest: [{ lt: "Pasirašyti arba paklausti, kur pasirašyti", hint: "sign" }],
      yes: (c) => { c.s.signed = true; c.say("sign_ok"); },
      no: (c) => { c.s.signed = true; c.say("sign_ok"); } },
  ],

  init: (c) => {
    c.s.askHappened = c.chance(0.55);
    c.s.askSpell = c.chance(0.75);
    c.s.askSign = c.chance(0.5);
    c.s.askBank = c.chance(0.55);
    c.s.askId = c.chance(0.25);
    c.s.foundTwist = c.visits >= 1 && c.chance(0.4);
    const others = ["black", "red", "blue"];
    c.s.foundDifferent = c.chance(0.3) ? c.pick(others) : null;
  },

  start: (c) => {
    c.say("greet");
    c.hold();
  },

  handlers: {
    report(c, slots, seg) {
      if (!live(c)) return;
      const first = !c.s.item && !c.s.theft;
      if (slots.item) c.s.item = slots.item;
      if (seg.tags.includes("theft")) c.s.theft = true;
      c.s.kind = seg.tags.includes("stolen") || seg.tags.includes("theft") || /\bstolen\b/i.test(c.heard) ? "stolen"
        : seg.tags.includes("unsure") ? "unsure" : "lost";
      if (first && once(c, "report")) c.say("sorry_hear");
    },
    what_item_ctx(c, slots) {
      if (!live(c)) return;
      if (slots.item) c.s.item = slots.item;
      if (!c.s.kind) c.s.kind = "stolen";
    },
    happened(c, slots) {
      if (!live(c)) return;
      c.s.happened = true;
      if (slots.place) setPlace(c, slots.place);
      if (/bumped|pushed|touched/i.test(c.heard)) c.s.kind = "stolen";
      if (once(c, "happened")) c.say("ack");
    },
    where_when(c, slots) {
      if (!live(c)) return;
      if (c.step === "happened") c.s.happened = true;
      if (slots.place) setPlace(c, slots.place);
      setWhen(c, slots.whenp);
    },
    describe(c, slots) {
      if (!live(c)) return;
      describeFrom(c, slots);
      if (!c.s.color && !c.s.material && !c.s.size) { c.s.describeSkipped = true; react(c, "describe", "ack"); return; }
      react(c, "describe", "describe_echo", { X: itemNp(c) });
      if (c.s.foundDifferent === c.s.color) c.s.foundDifferent = null;
      // a turned-in wallet of another color only makes sense when the learner named a color
      c.s.foundColor = c.s.color ? c.s.foundDifferent ?? c.s.color : null;
    },
    contents(c, slots, seg) {
      if (!live(c)) return;
      addContents(c, slots);
      if (seg.tags.includes("nothing") && !(c.s.contents || []).length) c.s.contentsSkipped = true;
      if (/driving licen[cs]e/i.test(c.heard)) c.tip(police.tips!.us_license);
      if (typeof c.s.cashAmount === "number" && c.step === "cash_amount") react(c, "contents", "cash_echo", { price: c.s.cashAmount });
      else react(c, "contents", "contents_ok");
      if (has(c, (e) => !!e.attrs?.passport) && !c.s.embassySaid) { c.s.embassySaid = true; react(c, "passport", "passport_embassy"); }
    },
    stolen_yes(c) { if (!live(c)) return; c.s.kind = "stolen"; c.say("ack"); },
    stolen_no(c) { if (!live(c)) return; c.s.kind = "lost"; c.say("ack"); },
    name_ctx(c, slots) {
      if (!live(c)) return;
      addName(c, slots.name);
      if (/\bsurname\b/i.test(c.heard)) c.tip(police.tips!.us_surname);
    },
    spell_ctx(c, slots) {
      if (!live(c)) return;
      if (c.step === "last_name") { c.s.lastName = true; }
      c.s.spelled = true;
      if (once(c, "spell")) c.say("spell_ok");
      void slots;
    },
    phone_ctx(c) {
      if (!live(c)) return;
      c.s.phone = true;
      if (/\bmobile\b/i.test(c.heard)) c.tip(police.tips!.us_mobile);
      if (once(c, "phone")) c.say("phone_ok");
    },
    no_phone(c) { if (!live(c)) return; c.s.phone = true; c.say("no_phone_ok"); },
    cancel_cards(c, _slots, seg) {
      if (!live(c)) return;
      c.s.bankDone = true;
      c.say(seg.tags.includes("done_cards") ? "cards_done" : "cards_yes");
    },
    // "Call your bank…" only for cards nobody has talked about (the officer's own bank question comes later)
    what_now(c) { if (!live(c)) return; c.say(has(c, (e) => !!e.attrs?.cards) && !c.s.bankDone && !cardsQ(c) ? "what_now" : "will_call", { X: item(c) }); },
    how_long(c) { if (!live(c)) return; c.say("how_long"); },
    chances(c) { if (!live(c)) return; c.say("chances"); },
    copy(c) { if (!live(c)) return; c.say("copy"); },
    signed(c) { if (!live(c)) return; c.s.signed = true; c.say("sign_ok"); },
    pen(c) { if (!live(c)) return; c.s.signed = true; c.say("pen"); },
    sign_where(c) { if (!live(c)) return; c.s.signed = true; c.say("sign_where"); },
    sign_where_ctx(c) { if (!live(c)) return; c.s.signed = true; c.say("sign_where"); },
    fill_form(c) { if (!live(c)) return; c.say("form_yes"); },
    its_mine(c) {
      if (!live(c)) return;
      if (!c.s.foundAsked) { c.say("ack"); return; }
      if (c.s.color && c.s.foundColor && c.s.foundColor !== c.s.color && !c.s.sureAsked) {
        c.s.sureAsked = true;
        c.say("found_sure", { X: itemNp(c) });
        return;
      }
      c.s.found = "mine";
      if (c.s.name) c.s.nameVerified = true;
    },
    not_mine(c, slots) {
      if (!live(c)) return;
      if (!c.s.foundAsked) { describeFrom(c, slots); c.say("ack"); return; }
      c.s.found = "no";
      c.say("not_yours");
    },
    all_there(c) {
      if (!live(c)) return;
      if (c.s.found !== "mine" || !c.s.lastName) { c.say("ack"); return; }
      c.s.checkedInside = true; c.say("lucky"); c.complete();
    },
    missing_some(c) {
      if (!live(c)) return;
      if (c.s.found !== "mine" || !c.s.lastName) { c.say("ack"); return; }
      c.s.checkedInside = true; c.s.found = "partial"; c.say("missing_some");
    },
    bank_called(c) { if (!live(c)) return; c.s.bankDone = true; c.say("bank_good"); },
    bank_not_yet(c) { if (!live(c)) return; c.s.bankDone = true; c.say("block_cards"); },
    no_id(c) { if (!live(c)) return; c.s.idDone = true; c.say("id_of_course"); },
    have_id(c) { if (!live(c)) return; c.s.idDone = true; c.say("id_thanks"); },
    thanks_officer(c) { if (!live(c)) return; c.say("welcome"); },
    thats_all(c) { if (!live(c)) return; c.say("ack"); },
    problem() { /* "I have a problem": the report step asks what happened */ },
    no_cash(c, slots) {
      if (!live(c)) return;
      c.s.noCashAmount = true; c.s.needCash = false;
      addContents(c, slots);
      c.s.contents = ((c.s.contents || []) as string[]).filter((x) => x !== "cash");
      if (!c.s.contents.length) c.s.contentsSkipped = true;
      react(c, "contents", "contents_ok");
    },
    g_bye(c) { bye(c); },
  },

  finish: (c) => {
    flush(c);
    if (c.s.found === "mine") {
      c.complete();
    } else {
      c.say("case_number");
      c.say("will_call", { X: item(c) });
      c.complete();
    }
    c.say("anything_else");
    // after a side question the officer asks again; after "yes" the guide offers questions first
    const anythingElse: Pending = {
      id: "anything_else", hints: ["thanks", "questions"], expects: ["thats_all"],
      suggest: [{ lt: "Padėkoti ir atsisveikinti", hint: "thanks" }, { lt: "Paklausti dar ko nors", hint: "questions" }],
      ask: (cc) => { cc.say("anything_else"); cc.expect(anythingElse); },
      on: {
        thats_all: (cc) => bye(cc, /\bthank/i.test(cc.heard)),
        g_thanks: (cc) => bye(cc, true),
        thanks_officer: (cc) => bye(cc, true),
        g_bye: (cc) => bye(cc),
        // "How are you?" at the very end: answer it, then back to "Anything else?"
        g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(anythingElse)); },
      },
      no: (cc) => bye(cc, /\bthank/i.test(cc.heard)),
      yes: (cc) => { cc.say("ask_help"); cc.expect(askAway); },
    };
    const askAway: Pending = { ...anythingElse, id: "ask_away",
      suggest: [{ lt: "Paklausti, ką nori sužinoti", hint: "questions" }, { lt: "Padėkoti ir atsisveikinti", hint: "thanks" }] };
    c.expect(anythingElse);
  },

  tests: [
    { say: "I'd like to report a stolen wallet.", intent: "report", slots: { item: "wallet" } },
    { say: "Good afternoon. I'd like to report a theft.", intent: "report" },
    { say: "Someone stole my wallet.", intent: "report" },
    { say: "My wallet was stolen at the market.", intent: "report" },
    { say: "I lost my wallet.", intent: "report" },
    { say: "I want to report a lost wallet.", intent: "report" },
    { say: "My wallet", intent: "what_item_ctx", step: "what_item" },
    { say: "When I wanted to pay, it was gone.", intent: "happened", step: "happened" },
    { say: "Someone bumped into me.", intent: "happened" },
    { say: "At the farmers' market.", intent: "where_when", step: "where" },
    { say: "At the market, around eleven.", intent: "where_when", slots: { place: "market" } },
    { say: "Around 11.", intent: "where_when", step: "when" },
    { say: "About an hour ago.", intent: "where_when", step: "when" },
    { say: "It's brown, leather, and small.", intent: "describe", step: "describe" },
    { say: "My cards, my driver's license, and about $40 in cash.", intent: "contents", step: "contents" },
    { say: "My driving licence and some money.", intent: "contents", step: "contents" },
    { say: "My credit card was in it.", intent: "contents", step: "contents" },
    { say: "My keys and my passport were in it.", intent: "contents" },
    { say: "About forty dollars.", intent: "contents", step: "cash_amount" },
    { say: "Tomas Mikalauskas", intent: "name_ctx", step: "name" },
    { say: "M-I-K-A-L-A-U-S-K-A-S", intent: "spell_ctx", step: "spell" },
    { say: "It's 555-0142.", intent: "phone_ctx", step: "phone" },
    { say: "Should I cancel my cards?", intent: "cancel_cards" },
    { say: "What should I do now?", intent: "what_now" },
    { say: "What happens next?", intent: "what_now" },
    { say: "So what now?", intent: "what_now" },
    { say: "What are the next steps?", intent: "what_now" },
    { say: "Is there anything else I should do?", intent: "what_now" },
    { say: "What happened?", intent: "none" },
    { say: "How long does it take?", intent: "how_long" },
    { say: "Could I get a copy of the report?", intent: "copy" },
    { say: "Where do I sign?", intent: "sign_where" },
    { say: "Do I need to fill in a form?", intent: "fill_form" },
    { say: "Yes, that's mine!", intent: "its_mine" },
    { say: "No, that's not mine.", intent: "not_mine", not: ["its_mine"] },
    { say: "No, mine is brown.", intent: "not_mine", not: ["its_mine"] },
    { say: "No, it was in my wallet.", intent: "no_id" },
    { say: "I think someone took it.", intent: "stolen_yes", step: "stolen_q" },
    { say: "I think I just dropped it.", intent: "stolen_no", step: "stolen_q", not: ["stolen_yes"] },
    { say: "Nothing is missing.", intent: "all_there" },
    { say: "No, that's all, thank you.", intent: "thats_all" },
    { say: "Tomas", intent: "none" },
    { say: "strawberry tractor moonlight", intent: "none" },
    // more ways to say it (dev corpus: tests/corpus/s91b-police.json)
    { say: "I think I was robbed", intent: "report" },
    { say: "Somebody pickpocketed me", intent: "report" },
    { say: "A man stole my wallet", intent: "report", slots: { item: "wallet" } },
    { say: "Can I report a lost wallet here?", intent: "report" },
    { say: "My wallet with all my cards", intent: "what_item_ctx", step: "what_item" },
    { say: "I put my wallet in my back pocket, and later it wasn't there", intent: "happened", step: "happened" },
    { say: "I was on the bus, it was very crowded", intent: "happened" },
    { say: "Somewhere in Town Square", intent: "where_when", step: "where", slots: { place: "market" } },
    { say: "Not long ago", intent: "where_when", step: "when" },
    { say: "It's a black iPhone in a blue case", intent: "describe", step: "describe" },
    { say: "A photo of my children", intent: "contents", step: "contents" },
    { say: "Less than twenty", intent: "contents", step: "cash_amount" },
    { say: "Not yet, I'll call them after this", intent: "bank_not_yet", step: "bank" },
    { say: "Yes, my cards are blocked", intent: "bank_called", step: "bank" },
    { say: "Yes, here is my driver's license", intent: "have_id", step: "id_q" },
    { say: "You can call me at 555-0142", intent: "phone_ctx", step: "phone" },
    { say: "Just here at the bottom?", intent: "sign_where" },
    { say: "Where?", intent: "sign_where_ctx", step: "sign" },
    { say: "Where?", intent: "none" },
    { say: "No, I think that's everything", intent: "thats_all" },
    { say: "No cash", intent: "no_cash", step: "contents", not: ["contents"] },
    { say: "There was no money in it", intent: "no_cash", not: ["contents"] },
    { say: "No, sorry, I don't have any ID", intent: "no_id", step: "id_q", not: ["have_id"] },
    { say: "My driver's license is not here", intent: "missing_some", step: "check_all", not: ["all_there"] },
  ],

  sims: [
    { name: "full report", turns: ["Good afternoon. I'd like to report a stolen wallet.", "At the farmers' market, around eleven.", "It's brown, leather, and small.", "My cards, my driver's license, and about $40 in cash.", "Tomas Mikalauskas.", "M-I-K-A-L-A-U-S-K-A-S.", "It's 555-0142.", "No, that's all. Thank you, officer."], expect: { complete: true }, auto: AUTO },
    { name: "theft, step by step", turns: ["I'd like to report a theft.", "My wallet.", "Someone bumped into me.", "At the market.", "About an hour ago.", "Black and small.", "Some cash and my ID card.", "About twenty dollars.", "My name is Tomas.", "Mikalauskas.", "It's 555-0199.", "Thanks, bye!"], expect: { complete: true }, auto: AUTO },
    { name: "lost, questions", turns: ["I lost my wallet.", "I think I dropped it at the café.", "This morning.", "Should I cancel my cards?", "It's a small red wallet.", "Just my cards.", "Tomas Mikalauskas.", "M I K A L A U S K A S", "555 0142", "How long does it take?", "Could I get a copy of the report?", "No, that's all, thanks."], expect: { complete: true }, auto: AUTO },
  ],
};

// Every step first says the reaction queued by the handlers of the learner's last answer.
police.steps = police.steps.map((st) => ({ ...st, ask: (c: Ctx) => { flush(c); st.ask(c); } }));

export default police;
