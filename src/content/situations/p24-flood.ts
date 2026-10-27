// Advanced song P24 "Kind Regards, I'm Drowning" (B2–C1): two phone calls on a flooded morning, the same facts in
// two registers. Saturday, half past eight in the morning (brunch at nine): the learner's washing machine "kinda
// exploded" at about seven, there's a river on the kitchen tile and the cat is on the fridge, giving everyone the
// evil eye.
//   Call 1, Lizzie (the friend from s83, casual): she picks up on her way to brunch. The learner cancels brunch and
//   explains, asks for a mop, towels or coffee ("Lots of coffee") or says no thanks, and says goodbye the way
//   friends do ("Love you, thanks!" / "See you in a bit!").
//   Call 2, Mr. Grant (the landlord, formal on paper): "Calling Mr. Grant…". The learner says who is calling
//   (apartment 3B), what happened, since when and what was done (the water off, towels), answers his questions
//   (anybody hurt? has it reached Mr. Okoye downstairs?), asks for a plumber today ("I would be grateful if a
//   plumber could be sent today"), politely insists when he offers tomorrow ("I'm afraid it can't wait until
//   tomorrow"), agrees a time for Joe the plumber (eleven or one; "Is that a confirmed time or an estimate?",
//   from ADV-024) and thanks him formally ("Thank you for your prompt assistance"). The joke of the song: Mr.
//   Grant writes like a lawyer but talks like a teenager on the phone ("Oh no!! So sorry!! Gonna be there in
//   ten!").
// Register: both registers are always understood. A wrong one still works, with a tip once per call: too stiff
// with Lizzie (#formal: "I regret to inform you…" makes her laugh: "Who are you, my bank?"), too casual with the
// landlord (#casual: "My washer kinda exploded, fix it!"). The tags are read in `handle` below (c.tip; the
// dialogue shows each tip key once).
// Twists (one per visit; 50 % on the first visit, 85 % later, an unseen one preferred):
//   "voicemail" (the song: "he never picks up"): Mr. Grant's voicemail. The learner leaves a message (who, what,
//     a request, a closing; the recording answers nothing), then he calls back, casually ("'I regret to inform
//     you'? Ha! That's my line! Oh no! So sorry! Gonna be there in ten!" when the message asked for a plumber
//     today), and asks for what the message left out.
//   "door": Lizzie is already at the door with a mop and coffee before the landlord call ("You texted me 'HELP'
//     and nine water emojis"). The learner thanks her casually and still calls Mr. Grant; at the end she shouts
//     "Kind regards, Mr. Grant!" and he laughs.
// Endings: done (c.complete) once mission items 2–5 are ticked. A plumber accepted for tomorrow (after his "You
// sure?") ends the call not done; hanging up on him twice before a plumber is agreed ends it not done.
//
// Address: Lizzie and the learner say tu (NPCS.lizzie is informal); Mr. Grant and the learner say jūs both ways
// (NPCS.mr_grant is not informal). Lines and hints are written with the right form explicitly (lower-case jūs).
// {m:…|f:…} is the player's gender (the addressee in NPC lines, the speaker in hints); {sm:…|sf:…} the NPC's.
//
// Course report: done when items 2, 3, 4 and 5 of the mission are ticked; item 1 (cancel brunch and say why) is a
// bonus that leaves the list after Lizzie's call if it wasn't done.
//
// ART: pictures for src/ui/scene-data/p24-flood.json (the phone call; a split screen: the caller's portrait next to
// the learner's flooded kitchen). The kitchen: a front-loading washing machine with its door hanging open, water
// on the white tile (socks floating), a gray cat on top of the fridge with the evil eye, a phone on the counter.
// Lizzie as in s83 (her call screen); Mr. Grant as in npcs.ts: about 60, dark skin, bald, a neat gray beard, a
// red plaid flannel shirt, reading glasses pushed up on his head, a pickup truck full of tools behind him.
//   "flood"    start, l_news, l_okay: the kitchen alone, the phone ringing out on the counter, water everywhere.
//   "lizzie"   l_brunch, l_need, l_come, l_bye: Lizzie on the call screen, on a sunny sidewalk outside a brunch
//              place, laughing with a hand over her mouth (her "Who are you, my bank?").
//   "calling"  the "Calling Mr. Grant…" moment and the voicemail twist (vm_msg): the phone on the counter
//              showing "Mr. Grant" and a green call button, the learner's wet feet.
//   "grant"    g_who, g_what, g_since, g_hurt, g_down, g_water, valve, g_request: Mr. Grant on the call screen in
//              his truck's cab, glasses on his head, eyebrows up.
//   "plumber"  g_offer, sure_tomorrow, g_time, g_close, closing; the voicemail callback: Mr. Grant grinning,
//              phone to his ear, starting the truck; a toolbox on the passenger seat.
//   "done"     the door twist (l_door) and the last goodbye of a call that ends done: Lizzie at the open apartment door with a mop in one hand
//              and two big coffees in the other; the cat still on the fridge.
//
// NEEDS: (1) the game ignores the events "call" ({ npc: "mr_grant", lt }: the line rings and the portrait switches
// to Mr. Grant; this file switches speakers the way p26's transfer does), "voicemail" ({ recording }: a red
// "● Įrašoma" dot while the learner leaves the message; the recording itself never answers), "beep",
// "hang-up", "incoming-call" ({ npc }: Mr. Grant calling back) and "knock" (Lizzie at the door); sounds for them
// would help. (2) "outro" ({ outcome, lt }) carries a Lithuanian end-card line for each ending (as in p26).
// (3) The engine takes at most 3 intents per turn (nlu.ts: intent + 2 more). A voicemail said in one breath has 4–6
// pieces (who, what, the request, "Kind regards"), so this file reads it with `vm_unknown` (a catch-all built from
// the pieces below). A higher cap (or one that lifts in the voicemail) would let the ordinary intents do it.
// (4) During the voicemail the engine's "Sorry, I didn't catch that." (g_not_understood after two misses) is said in
// Mr. Grant's voice, as if the recording answered. A way for a situation to keep it silent (a "recording" phase,
// or a hook like `notUnderstood(c)`) would fix it; vm_unknown makes it rare.

import type { Ctx, EntityDef, Pending, Segment, SituationDef, Tip } from "../types";
import type { ConvCtx } from "../../convo/dialogue";
import { ent, t } from "../dsl";
import { GLOBAL_HANDLERS } from "../global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_DO_Q = "Question “Do” = the particle ar.";
const F_DID_Q = "Question “Did” = the particle ar; the past tense of the verb carries it.";
const F_WH_DO = "Question “do” has no Lithuanian word; the tense sits on the verb.";
const F_WH_DID = "Question “did” has no Lithuanian word; the past tense of the verb carries it.";
const F_DAT_REIKIA = "“you” = the dative: reikia takes it.";
const F_ITS = "“it's” = tai: Lithuanian needs no copula here.";
const F_YOURE = "“you're”: Lithuanian needs no copula here (jūs teisus).";
const F_EXIST = "Existential “There's” = yra.";
const F_WOULD = "“would” has no separate word: the conditional of the next verb carries it.";
const F_HAS_PAST = "“has”: the past tense of the next verb carries it.";
const F_VE = "“'ve” (have): the past tense of the verb carries it.";
const F_TEN = "“ten” = ten minutes: Lithuanian says the noun.";
const F_AT_CLOCK = "Clock “at”: the accusative of the hour carries it.";
const F_CONCORD = "Negative concord: niekas takes ne- on the verb.";

// ---------------------------------------------------------------------------
// Things Lizzie can bring (a mop, towels, coffee, a bucket; a boat is the song's joke)

const STUFF: EntityDef[] = [
  ent("mop", "mop", "mopas/mopo/mopui/mopą/mopu/mope", "m", { chip: "mopas (grindų šluostė)", forms: ["mops", "swiffer", "floor mop", "wet mop"] }),
  ent("towels", "towels", "rankšluosčiai/rankšluosčių/rankšluosčiams/rankšluosčius/rankšluosčiais/rankšluosčiuose", "m",
    { art: "some", chip: "rankšluosčiai", forms: ["towel", "old towels", "paper towels", "beach towels", "rags"] }),
  ent("coffee", "coffee", "kava/kavos/kavai/kavą/kava/kavoje", "f", { art: "some", chip: "kava", forms: ["coffees", "a coffee", "iced coffee", "latte", "lattes", "cup of coffee", "big coffee"] }),
  ent("bucket", "bucket", "kibiras/kibiro/kibirui/kibirą/kibiru/kibire", "m", { chip: "kibiras", forms: ["buckets", "pail"] }),
  ent("boat", "boat", "valtis/valties/valčiai/valtį/valtimi/valtyje", "f", { forms: ["canoe", "kayak", "life jacket", "lifeboat", "raft"] }),
];
const CHIPS = ["mop", "towels", "coffee", "bucket"];

// ---------------------------------------------------------------------------
// Tips

const TIPS: Record<string, Tip> = {
  too_stiff: { key: "too_stiff", lt: "Suprasta! Bet draugei tai skamba kaip banko laiškas – Lizzie juokiasi. Su draugais kalbama paprastai ir trumpai.", better: "Hey, can't make brunch, so sorry! My washer kinda exploded." },
  too_casual: { key: "too_casual", lt: "Suprasta! Bet nuomotojui tai skamba per laisvai (kaip žinutė draugei). Su nuomotoju – mandagiau ir išsamiau.", better: "I regret to inform you that the washing machine has broken. I would be grateful if a plumber could be sent today." },
  close_water: { key: "close_water", lt: "Suprasta! „Užsukti vandenį“ angliškai – „turn off the water“ (arba „shut off“). „Close the water“ taip nesakoma.", better: "I've turned off the water." },
  master: { key: "master", lt: "Suprasta! „Meistras“ angliškai nėra „master“. Santechnikas – „plumber“, meistras apskritai – „repairman“ arba „handyman“.", better: "Could you send a plumber today, please?" },
  downstairs: { key: "downstairs", lt: "Suprasta! „Kaimynas iš apačios“ angliškai – „the neighbor downstairs“ arba „the apartment downstairs“.", better: "It's reaching the apartment downstairs." },
  uk_flat: { key: "uk_flat", lt: "Suprasta! „Flat“ – britiškas žodis. Amerikoje sakoma „apartment“.", better: "This is apartment 3B." },
  uk_ring: { key: "uk_ring", lt: "Suprasta! „Ring me back“ – britiškai. Amerikoje sakoma „call me back“.", better: "Please call me back." },
  uk_tap: { key: "uk_tap", lt: "Suprasta! Amerikoje čiaupas – „faucet“, o skalbimo mašinos vandenį užsuka ventilis („valve“).", better: "I've turned off the water valve." },
  rude: { key: "rude", lt: "Suprasta! Bet įsakmiai nuomotojui skamba šiurkščiai. Tvirtai, bet mandagiai:", better: "I'm afraid it can't wait until tomorrow." },
  love_landlord: { key: "love_landlord", lt: "Suprasta! „Love you“ – tik draugams ir šeimai. Nuomotojui užtenka mandagaus ačiū.", better: "Thank you for your prompt assistance." },
};

/** Lithuanian end-card lines (the "outro" event; see NEEDS). */
const OUTRO: Record<string, string> = {
  done: "Po dešimties minučių ponas Grantas jau stovi tarpduryje su įrankių dėže, o Džo atvyksta… beveik laiku. Katė lieka ant šaldytuvo.",
  tomorrow: "Santechnikas atvyks tik rytoj… o vanduo vis dar sunkiasi pas poną Okoye. Pabandyk dar kartą: mandagiai, bet tvirtai paprašyk, kad santechnikas atvyktų šiandien.",
  walked: "Ragelis padėtas, o vanduo vis dar ant grindų. Pabandyk dar kartą: paaiškink, kas nutiko, ir paprašyk santechniko šiandien.",
};

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

const L = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("lizzie"); c.say(line, vars); };
const G = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("mr_grant"); c.say(line, vars); };

/** Per-turn scratch (the dialogue makes a fresh context object for every learner turn). */
const turnData = new WeakMap<object, Record<string, any>>();
function turn(c: Ctx): Record<string, any> {
  let d = turnData.get(c);
  if (!d) { d = {}; turnData.set(c, d); }
  return d;
}
/** True the first time a key is used this turn: one reaction per turn, however many pieces the sentence has. */
function once(c: Ctx, key: string): boolean {
  const d = turn(c);
  if (d[key]) return false;
  d[key] = true;
  return true;
}
const bump = (c: Ctx, id: string): number => { c.s.asks ||= {}; c.s.asks[id] = (c.s.asks[id] ?? 0) + 1; return c.s.asks[id]; };

const inLizzie = (c: Ctx) => c.s.phase === "lizzie";
const inGrant = (c: Ctx) => c.s.phase === "grant";
const inVm = (c: Ctx) => c.s.phase === "vm";
const toArr = (x: any): any[] => (x == null ? [] : Array.isArray(x) ? x : [x]);
/** A thanks inside another answer ("No, thank you.", "Nothing else, thanks.", "Thanks, bye!"). */
const heardThanks = (c: Ctx) => /\b(thank|thanks|appreciate)\b/i.test(c.heard);

/** The twist this visit showed is remembered (a replay prefers the other one), whatever the ending. */
function rememberTwist(c: Ctx) {
  if (!c.s.twistSeen || !c.s.twist) return;
  c.s.twistSaved = c.s.twist; // (for the sims)
  c.remember({ twists: [...new Set([...(c.memory.twists ?? []), c.s.twist])] });
}

/** Mr. Grant knows who, what and that a plumber is wanted (said live or in the message). */
const grantKnows = (c: Ctx) => !!c.s.who && !!c.s.gFlood;
/** Mission item 3: the learner explained it (not just "Yes" to his guess "Is it that washing machine again?" after
 *  the third try, which sets `guessed`; any later explanation clears it). */
const explainedToGrant = (c: Ctx) => grantKnows(c) && !c.s.guessed;
/** A one-off question was asked (the learner's reply settles it, whatever it is). */
const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) >= 1;
const hurtOk = (c: Ctx) => !!c.s.hurtDone || asked(c, "g_hurt");
const downOk = (c: Ctx) => !!c.s.downDone || asked(c, "g_down");
const waterOk = (c: Ctx) => !!c.s.waterDone || asked(c, "g_water");
const sinceOk = (c: Ctx) => !c.s.askSince || !!c.s.sinceDone || asked(c, "g_since");
const detailsDone = (c: Ctx) => hurtOk(c) && downOk(c) && waterOk(c) && sinceOk(c);
const goalMet = (c: Ctx) => !!c.s.helpAnswered && explainedToGrant(c) && !!c.s.today && !!c.s.timeSet && !!c.s.thanked;

// ---------------------------------------------------------------------------
// Register: a wrong register still works, with a tip (once per call: each call has its own tip key)

function register(c: Ctx, seg: Segment) {
  if (inLizzie(c) && seg.tags.includes("formal")) {
    c.tip(TIPS.too_stiff);
    if (!c.s.laughed && once(c, "laugh")) { c.s.laughed = true; L(c, "l_laugh_formal"); }
  }
  if ((inGrant(c) || inVm(c)) && seg.tags.includes("casual")) { c.tip(TIPS.too_casual); c.s.casualG = (c.s.casualG ?? 0) + 1; }
  if ((inGrant(c) || inVm(c)) && seg.tags.includes("regret")) c.s.regretSaid = true;
}

// ---------------------------------------------------------------------------
// Lizzie's call

function explain(c: Ctx) {
  if (c.s.explained) { if (once(c, "l_ack")) L(c, "l_ack"); return; }
  c.s.explained = true;
  // her reaction follows what she heard: "Exploded?!", "Like, actual water?" or just "That machine hates you."
  const h = c.heard.toLowerCase();
  if (once(c, "l_ack")) L(c, /explod|burst/.test(h) ? "l_react_exploded" : /water|river|lake|flood|swim|float|wet/.test(h) ? "l_react_water" : "l_react_flood");
  if (c.s.cancelled && once(c, "l_brunch")) L(c, "l_brunch_ok");
}

function cancelBrunch(c: Ctx) {
  const first = !c.s.cancelled;
  c.s.cancelled = true;
  if (!first) return;
  if (c.s.explained) { if (once(c, "l_brunch")) L(c, "l_brunch_ok"); return; }
  // "Can't make brunch" alone: the step asks what happened ("Wait, what? What happened?")
}

/** "Can you bring a mop? And coffee?": Lizzie takes the order (a change of mind adds to it). */
function askHelp(c: Ctx, slots: any, seg: Segment) {
  const items = toArr(slots?.stuff).filter((x) => typeof x === "string");
  const list: string[] = c.s.items ?? [];
  let boat = false;
  for (const id of items) { if (id === "boat") boat = true; else if (!list.includes(id)) list.push(id); }
  if (boat && !list.length) list.push("mop");
  c.s.items = list;
  c.s.helpAnswered = true;
  c.s.declined = false;
  c.s.comeDone = true;
  if (seg.tags.includes("come")) c.s.coming = true;
  if (!once(c, "l_items")) return;
  if (boat) L(c, "l_boat");
  if (c.s.twist === "door" && !c.s.doorDone) return; // she's already outside: the door step comes next
  sayItems(c);
}

function sayItems(c: Ctx) {
  const list: string[] = c.s.items ?? [];
  const things = list.filter((x) => x !== "coffee");
  if (things.length === 1) L(c, "l_bring1", { X: things[0] });
  else if (things.length >= 2) L(c, "l_bring2", { X: things[0], Y: things[1] });
  if (list.includes("coffee")) L(c, things.length ? "l_and_coffee" : "l_coffee_only");
  // "Actually, could you come over?" to her "I can come over after brunch" takes up her offer
  if (!list.length) L(c, c.step === "l_come" ? "l_coming_yes" : "l_coming");
  else if (!c.s.onWay) { c.s.onWay = true; c.s.coming = true; c.s.comeDone = true; L(c, "l_on_way"); }
}

/** "No, I'm good, thanks": the first time it declines her help (she asks "You sure?"), the second time it
 *  declines her coming over. */
function needNothing(c: Ctx) {
  if (c.s.helpAnswered && (c.s.declined || c.step === "l_come")) {
    c.s.comeDone = true;
    if (once(c, "l_come")) L(c, "l_not_coming");
    return;
  }
  c.s.helpAnswered = true;
  if (!c.s.items?.length) c.s.declined = true;
}

/** "Yes, I'm sure." / "Sure." / "I'm sure." to her "You sure? I can come over after brunch.": she stays at brunch.
 *  Only a request ("Actually, could you come over?") brings her. */
function sureNotComing(c: Ctx) {
  c.s.comeDone = true;
  c.s.coming = false;
  if (once(c, "l_come")) L(c, "l_not_coming");
}

function notItem(c: Ctx, slots: any) {
  const drop = toArr(slots?.stuff);
  c.s.items = (c.s.items ?? []).filter((x: string) => !drop.includes(x));
  if (!c.s.items.length && once(c, "l_items")) { L(c, "l_no_problem"); }
}

/** Lizzie hangs up (or the learner does): the landlord call begins. */
function byeLizzie(c: Ctx, kind: "love" | "bye" | "thanks") {
  if (c.s.byeL || !inLizzie(c)) return;
  c.s.byeL = true;
  if (once(c, "l_bye")) L(c, kind === "love" ? "l_love_too" : "l_bye_after");
  callGrant(c);
}

/** "Calling Mr. Grant…": he picks up, or the voicemail twist. */
function callGrant(c: Ctx) {
  c.s.lizzieOver = true;
  turn(c).switched = true; // the rest of this turn ("Thanks, bye!") was said to Lizzie
  c.event("call", { npc: "mr_grant", lt: "Skambinama ponui Grantui…" });
  if (c.s.twist === "voicemail") {
    c.s.phase = "vm";
    c.twist("voicemail");
    c.s.twistSeen = true;
    c.ask("vm_msg"); // the greeting and the beep
    return;
  }
  c.s.phase = "grant";
  c.ask("g_who"); // "Yello! Grant here. Who's this?"
}

// ---------------------------------------------------------------------------
// The voicemail: the recording answers nothing; the message ends with a closing (or after the request, with
// any goodbye), then Mr. Grant calls back.

function vmSilent(c: Ctx) { if (once(c, "vm")) c.event("voicemail", { recording: true }); }

function vmEnd(c: Ctx) {
  if (c.s.vmEnded) return;
  c.s.vmEnded = true;
  c.event("beep");
  c.event("hang-up");
  c.event("incoming-call", { npc: "mr_grant" });
  c.s.phase = "grant";
  c.s.calledBack = true;
  turn(c).switched = true;
  G(c, "gr_callback");
  if (c.s.regretSaid) G(c, "gr_callback_formal");
  else if (c.s.casualG) G(c, "gr_callback_casual");
  if (c.s.gFlood) G(c, "gr_so_sorry");
  // the song: a message that asked for a plumber today gets "Gonna be there in ten!" at once
  if (c.s.gFlood && c.s.who && c.s.askedToday) {
    c.s.today = true;
    G(c, "gr_ten_b");
    G(c, "gr_joe");
  }
  if (!c.s.who) { c.ask("g_who"); return; } // "Who's this, by the way?"
  // the next question comes from the steps (what happened, his questions, the plumber)
}

/** A message said in one breath (`vm_unknown`: four or more pieces, see NEEDS 3). Each piece is tagged (#vm_who,
 *  #vm_flood …): the recording keeps all of it; said live to Mr. Grant, each piece gets its usual reaction. */
function vmMessage(c: Ctx, seg: Segment) {
  const has = (t: string) => seg.tags.includes(t);
  if (inLizzie(c)) { if (has("vm_flood")) explain(c); else if (once(c, "l_ack")) L(c, "l_ack"); return; }
  // said live, only the news gets a reaction (no "Got it." for what he already knows)
  if (has("vm_who")) identified(c);
  if (has("vm_flood")) { if (c.s.guessed) c.s.guessed = false; if (!c.s.gFlood || inVm(c)) grantFlood(c); }
  if (has("vm_when")) c.s.sinceDone = true;
  if (has("vm_hurt") && !c.s.hurtDone) nobodyHurt(c);
  if (has("vm_down") && !c.s.downDone) downstairs(c, true);
  if (has("vm_water") && !c.s.waterOff) waterOff(c);
  if (has("vm_req") && !c.s.today && !c.s.tomorrow) askPlumber(c, seg);
  if (inVm(c)) {
    // the recording answers nothing; "Please call me back" or a goodbye ends the message, and so does a sign-off
    // ("Kind regards", "Thank you") once the request is in
    if (has("vm_end") || (has("vm_sign") && c.s.requested)) { c.s.vmClose = true; vmEnd(c); } else vmSilent(c);
    return;
  }
  // a sign-off at the end of a long report: the thanks counts; he answers it once the plumber is settled
  if (has("vm_sign")) { if (c.s.today || c.s.tomorrow) thankGrant(c, "formal"); else c.s.thanked = true; }
}

// ---------------------------------------------------------------------------
// Mr. Grant's call

function identified(c: Ctx) {
  if (c.s.who) return;
  c.s.who = true;
  if (inVm(c)) return;
  if (once(c, "g_hi")) G(c, "gr_hi_tenant");
}

function grantFlood(c: Ctx) {
  if (inVm(c)) { c.s.gFlood = true; return; }
  const first = !c.s.gFlood;
  c.s.gFlood = true;
  if (!once(c, "g_flood")) return;
  if (!first) { G(c, "gr_ok"); return; }
  if (c.s.regretSaid && !c.s.regretJoke) { c.s.regretJoke = true; G(c, "gr_regret"); }
  G(c, "gr_flood_react");
}

function nobodyHurt(c: Ctx) {
  c.s.hurtDone = true;
  if (inVm(c)) return;
  if (once(c, "g_ack")) G(c, "gr_relief");
}

/** "Yes" to "Is anybody hurt?": "What? Are you okay?", and he waits for the answer before his next question. */
function hurtYes(c: Ctx) {
  c.s.hurtDone = true;
  G(c, "gr_hurt_yes");
  c.expect({
    id: "hurt_yes", optional: true, expects: ["nobody_hurt", "freaking_out"], hints: ["details"],
    suggest: [{ lt: "Atsakyti, ar tau viskas gerai", hint: "details" }],
    on: {
      nobody_hurt: (cc) => { G(cc, "gr_careful"); },
      freaking_out: (cc) => { G(cc, "gr_breathe"); },
    },
    yes: (cc) => { G(cc, "gr_careful"); },
    no: (cc) => { G(cc, "gr_breathe"); },
  });
}

function downstairs(c: Ctx, yes: boolean) {
  c.s.downDone = true;
  c.s.downstairs = yes;
  if (inVm(c)) return;
  if (!once(c, "g_down")) return;
  G(c, yes ? "gr_down_yes" : "gr_down_no");
}

function waterOff(c: Ctx) {
  c.s.waterDone = true;
  c.s.waterOff = true;
  if (inVm(c)) return;
  if (once(c, "g_ack")) G(c, "gr_water_good");
}

function waterNotOff(c: Ctx) {
  c.s.waterDone = true;
  if (inVm(c)) return;
  if (!once(c, "g_valve")) return;
  G(c, "gr_valve");
  c.expect({
    id: "valve", optional: true, expects: ["water_off", "water_not_off"], hints: ["details"],
    suggest: [{ lt: "Pasakyti, kad vanduo jau užsuktas", hint: "details" }],
    on: {
      water_off: (cc) => { cc.s.waterOff = true; G(cc, "gr_perfect"); },
      water_not_off: (cc) => { G(cc, "gr_valve_later"); },
    },
    yes: (cc) => { cc.s.waterOff = true; G(cc, "gr_perfect"); },
    no: (cc) => { G(cc, "gr_valve_later"); },
  });
}

/** The request for a plumber (today, tomorrow or just "someone"). */
function askPlumber(c: Ctx, seg: Segment) {
  c.s.requested = true;
  const tomorrow = seg.tags.includes("tomorrow");
  if (seg.tags.includes("today") || seg.tags.includes("insist")) c.s.askedToday = true;
  if (inVm(c)) { if (tomorrow) c.s.askedTomorrow = true; return; }
  if (c.s.today || c.s.tomorrow) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  if (tomorrow) { if (once(c, "g_offer")) askSureTomorrow(c); return; }
  // asking for today again after his "Could it wait till tomorrow?" is insisting
  if (c.s.offered && seg.tags.includes("today") && grantKnows(c)) { insist(c); return; }
  // the plumber's day is the next step's business (his tomorrow offer, or "Gonna be there in ten")
  if (once(c, "g_ack") && !grantKnows(c)) G(c, "gr_ok");
}

/** "I'm afraid it can't wait until tomorrow": he gives in at once. */
function insist(c: Ctx) {
  c.s.insisted = true;
  c.s.askedToday = true;
  c.s.requested = true;
  if (inVm(c)) return;
  if (c.s.today) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  if (!grantKnows(c)) return; // he still needs to know who and what: the steps ask
  todayNow(c);
}

function todayNow(c: Ctx) {
  if (c.s.today || !once(c, "g_today")) return;
  c.s.today = true;
  c.s.tomorrow = false;
  c.s.sureQ = false;
  G(c, "gr_ten_a");
  G(c, "gr_ten_b");
  G(c, "gr_joe");
}

/** "I don't know." to "Could it wait till tomorrow morning?": he doesn't risk it. The time question follows at
 *  once (no hold). */
function dontKnowToday(c: Ctx) {
  if (c.s.today || !once(c, "g_today")) return;
  c.s.today = true;
  c.s.tomorrow = false;
  c.s.sureQ = false;
  G(c, "gr_no_risk");
  G(c, "gr_ten_b");
  G(c, "gr_joe");
}

function acceptTomorrow(c: Ctx) {
  if (inVm(c)) return;
  if (c.s.today) { if (once(c, "g_ack")) G(c, "gr_already_today"); return; }
  if (!c.s.offered && !c.s.sureQ) { c.s.requested = true; askSureTomorrow(c); return; }
  if (!c.s.sureQ) { askSureTomorrow(c); return; }
  tomorrowFinal(c);
}

/** "Are you sure? That sounds like a lot of water." (his own second thoughts: one more chance) */
function askSureTomorrow(c: Ctx) {
  c.s.sureQ = true;
  G(c, c.s.downstairs ? "gr_sure_down" : "gr_sure");
  c.expect({
    id: "sure_tomorrow", expects: ["insist_today", "insist_ctx", "wait_no_ctx", "wait_yes_ctx", "sure_ctx", "accept_tomorrow", "ask_plumber", "downstairs_yes"],
    hints: ["insist"],
    suggest: [{ lt: "Vis dėlto paprašyti, kad santechnikas atvyktų šiandien", hint: "insist" }, { lt: "Sutikti su rytdiena", hint: "insist" }],
    on: {
      insist_today: (cc) => { todayNow(cc); },
      insist_ctx: (cc) => { todayNow(cc); },
      wait_no_ctx: (cc) => { todayNow(cc); },
      wait_yes_ctx: (cc) => { tomorrowFinal(cc); },
      sure_ctx: (cc) => { tomorrowFinal(cc); },
      downstairs_yes: (cc) => { cc.s.downDone = true; cc.s.downstairs = true; todayNow(cc); },
      accept_tomorrow: (cc) => { tomorrowFinal(cc); },
      ask_plumber: (cc, _sl, sg) => { if (sg.tags.includes("tomorrow")) tomorrowFinal(cc); else todayNow(cc); },
    },
    yes: (cc) => { tomorrowFinal(cc); },
    no: (cc) => { todayNow(cc); },
    ask: (cc) => G(cc, cc.s.downstairs ? "gr_sure_down" : "gr_sure"),
  });
}

function tomorrowFinal(c: Ctx) {
  if (c.s.tomorrow || c.s.today) return;
  c.s.tomorrow = true;
  c.s.sureQ = false;
  G(c, "gr_tomorrow_final");
}

/** Joe's time: eleven or one. */
function pickTime(c: Ctx, slots: any, seg: Segment) {
  if (inVm(c)) return;
  if (!c.s.today) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  const tm = slots?.time;
  let which: "eleven" | "one" | undefined;
  if (seg.tags.includes("early") || seg.tags.includes("any")) which = "eleven";
  else if (seg.tags.includes("late")) which = "one";
  else if (tm && typeof tm.h === "number") {
    const h = tm.h % 12;
    if (h === 11) which = "eleven";
    else if (h === 1) which = "one";
    // "Eleven thirty?": Joe does eleven or one, not in between
    if (tm.m) which = undefined;
  }
  if (!once(c, "g_time")) return;
  if (!which) { G(c, "gr_time_only"); c.hold(); return; }
  if (c.s.timeSet === which) { G(c, "gr_ok"); return; }
  c.s.timeSet = which;
  G(c, which === "eleven" ? "gr_time_11" : "gr_time_1");
}

function askConfirmed(c: Ctx) {
  if (inVm(c)) return;
  c.s.confirmAsked = true;
  if (!once(c, "g_info")) return;
  if (!c.s.today) { G(c, "gr_first_today"); return; }
  G(c, "gr_estimate");
  G(c, "gr_text_you");
}

/** Thanks to Mr. Grant (formal or not). */
function thankGrant(c: Ctx, kind: "formal" | "plain" | "love" | "apology" | "regards") {
  if (inVm(c)) { c.s.vmThanks = true; if (c.s.requested) vmEnd(c); else vmSilent(c); return; }
  c.s.thanked = true;
  if (!once(c, "g_thanks")) return;
  if (kind === "love") { G(c, "gr_love_you"); return; }
  if (kind === "apology") { G(c, "gr_inconvenience"); return; }
  if (kind === "regards") { G(c, "gr_regards"); return; }
  if (kind === "formal" && !c.s.promptJoke && /\bprompt\b/i.test(c.heard)) { c.s.promptJoke = true; G(c, "gr_prompt"); return; }
  G(c, "gr_welcome");
}

/** The end of a successful call (or the tomorrow ending). */
function wrapUp(c: Ctx) {
  if (c.s.over) return;
  c.s.over = true;
  if (c.s.twist === "door") { L(c, "l_shout"); G(c, "gr_laugh"); }
  if (c.s.tomorrow && !c.s.today) {
    G(c, "gr_bye_tomorrow");
    c.s.outcome = "tomorrow";
    c.event("outro", { outcome: "tomorrow", lt: OUTRO.tomorrow });
  } else {
    G(c, "gr_bye");
    if (goalMet(c)) {
      c.complete();
      c.s.outcome = "done";
      c.event("outro", { outcome: "done", lt: OUTRO.done });
    } else c.s.outcome = "partial";
  }
  rememberTwist(c);
  c.end();
  c.hold();
}

/** "Bye" to Mr. Grant before a plumber is agreed: once he asks to stay; the second time the call ends. */
function grantBye(c: Ctx) {
  if (c.s.over) return;
  if (c.s.today || c.s.tomorrow) {
    if (heardThanks(c)) c.s.thanked = true;
    wrapUp(c);
    return;
  }
  if (!c.s.byeTried) { c.s.byeTried = true; G(c, "gr_wait_stay"); c.hold(); return; }
  c.s.over = true;
  G(c, "gr_bye_walk");
  c.s.outcome = "walked";
  c.event("outro", { outcome: "walked", lt: OUTRO.walked });
  rememberTwist(c);
  c.end();
  c.hold();
}

// ---------------------------------------------------------------------------
// One handler per intent: the register tip first, then the phase decides

type H = (c: Ctx, slots: any, seg: Segment) => void;

const LIZZIE: Record<string, H> = {
  cancel_brunch: (c) => { cancelBrunch(c); },
  flood: (c, _sl, sg) => { if (sg.tags.includes("cancel")) cancelBrunch(c); explain(c); },
  cat_fridge: (c) => { if (once(c, "l_cat")) L(c, "l_cat"); },
  nobody_hurt: (c) => { c.s.okayDone = true; if (once(c, "l_ack")) L(c, "l_glad_ok"); },
  freaking_out: (c) => { c.s.okayDone = true; if (once(c, "l_ack")) L(c, "l_breathe"); },
  ask_help: (c, sl, sg) => { askHelp(c, sl, sg); },
  item_ctx: (c, sl, sg) => { askHelp(c, sl, sg); },
  need_nothing: (c) => { needNothing(c); },
  not_item: (c, sl) => { notItem(c, sl); },
  come_no: (c) => { c.s.comeDone = true; c.s.coming = false; if (!c.s.helpAnswered) needNothing(c); else if (once(c, "l_come")) L(c, "l_not_coming"); },
  warm: (c) => { lizzieWarm(c, "love"); },
  see_you: (c) => { lizzieWarm(c, "bye"); },
  // the formal ones (with the tip): "Thank you for your prompt assistance" / "Kind regards" / "I apologize…"
  formal_thanks: (c) => { lizzieWarm(c, "bye"); },
  kind_regards: (c) => { lizzieWarm(c, "bye"); },
  apologize: (c) => { cancelBrunch(c); },
  unsure_ctx: (c) => { if (once(c, "l_ack")) L(c, "l_ack"); },
  // "Hi, it's Tomas." / "It's me!": she knows (her phone shows the name)
  intro: (c) => { if (once(c, "l_know")) L(c, "l_i_know"); },
  its_me: (c) => { if (once(c, "l_know")) L(c, "l_i_know"); },
  sure_ctx: (c) => { if (c.step === "l_come") sureNotComing(c); else if (once(c, "l_ack")) L(c, "l_ack"); },
  door_surprise: (c) => { doorSurprise(c); },
  // "Can you come today?" to Lizzie: she comes over
  ask_plumber: (c, _sl, sg) => { if (/\bcome\b/i.test(c.heard)) askHelp(c, {}, { ...sg, tags: [...sg.tags, "come"] }); else if (once(c, "l_ack")) L(c, "l_ack"); },
  vm_unknown: (c, _sl, sg) => { vmMessage(c, sg); },
};

/** "Love you, thanks!" / "You're the best!": at the door it's the thanks, else (once help is settled) goodbye. */
function lizzieWarm(c: Ctx, kind: "love" | "bye") {
  if (c.s.twist === "door" && c.step === "l_door" && !c.s.doorDone) { doorThanks(c); return; }
  if (c.s.helpAnswered && (c.s.twist !== "door" || c.s.doorDone)) { c.s.comeDone = true; byeLizzie(c, kind); return; }
  if (once(c, "l_ack")) L(c, "l_anytime");
}

/** "What are you doing here?" / "No way!" at the door: "That's what friends are for", then the landlord call. */
function doorSurprise(c: Ctx) {
  if (c.s.twist !== "door" || c.step !== "l_door" || c.s.doorDone) return; // elsewhere it needs no answer
  c.s.doorDone = true;
  c.s.comeDone = true;
  if (once(c, "l_door")) L(c, "l_door_friends");
  c.s.byeL = true;
  callGrant(c);
}

function doorThanks(c: Ctx) {
  if (c.s.doorDone) return;
  c.s.doorDone = true;
  c.s.comeDone = true;
  if (once(c, "l_door")) L(c, "l_door_go");
  c.s.byeL = true;
  callGrant(c);
}

const GRANT: Record<string, H> = {
  intro: (c) => { identified(c); },
  intro_ctx: (c) => { identified(c); },
  // in the voicemail a name counts only when it's the player's own (or comes with the apartment): "Please ring
  // me back" is no name
  vm_who_ctx: (c, sl, sg) => { if (sg.tags.includes("known_name") || sl?.aptn != null || /\b(3 ?b|three b)\b/i.test(c.heard)) identified(c); },
  its_me_ctx: (c) => { if (c.s.who || inVm(c)) return; if (once(c, "g_me")) G(c, "gr_its_me"); },
  its_me: (c) => { if (c.s.who || inVm(c)) return; if (once(c, "g_me")) G(c, "gr_its_me"); },
  flood: (c) => { c.s.guessed = false; grantFlood(c); },
  when_happened: (c) => { c.s.sinceDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_ok"); },
  when_ctx: (c) => { c.s.sinceDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_ok"); },
  water_off: (c) => { waterOff(c); },
  water_not_off: (c) => { waterNotOff(c); },
  nobody_hurt: (c) => { nobodyHurt(c); },
  freaking_out: (c) => { c.s.hurtDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_breathe"); },
  // after his "Could it wait till tomorrow?", the water downstairs is the reason it can't
  downstairs_yes: (c) => { downstairs(c, true); if (c.s.offered && !c.s.today && !c.s.tomorrow && grantKnows(c)) insist(c); },
  downstairs_no: (c) => { downstairs(c, false); },
  // "Yes, it has." / "I'm afraid so." / "No, it hasn't." to "Has it reached the apartment downstairs?"
  down_yes_ctx: (c) => { downstairs(c, true); if (c.s.offered && !c.s.today && !c.s.tomorrow && grantKnows(c)) insist(c); },
  down_no_ctx: (c) => { downstairs(c, false); },
  ask_plumber: (c, _sl, sg) => { askPlumber(c, sg); },
  today_ctx: (c, _sl, sg) => { askPlumber(c, { ...sg, tags: [...sg.tags, "today"] }); },
  insist_today: (c) => { insist(c); },
  insist_ctx: (c) => { insist(c); },
  accept_tomorrow: (c) => { acceptTomorrow(c); },
  // "No, it can't." / "Yes, it can." to "Could it wait till tomorrow morning?"
  wait_no_ctx: (c) => { insist(c); },
  wait_yes_ctx: (c) => { acceptTomorrow(c); },
  // "A plumber." to "So what do you need from me?"
  plumber_ctx: (c, _sl, sg) => { askPlumber(c, sg); },
  // "I'm sure." to "Are you sure?" (a tomorrow plumber)
  sure_ctx: (c) => { if (inVm(c)) return; if (c.s.sureQ && !c.s.today && !c.s.tomorrow) { tomorrowFinal(c); return; } if (once(c, "g_ack")) G(c, "gr_ok"); },
  vm_unknown: (c, _sl, sg) => { vmMessage(c, sg); },
  pick_time: (c, sl, sg) => { pickTime(c, sl, sg); },
  time_ctx: (c, sl, sg) => { pickTime(c, sl, sg); },
  ask_confirmed: (c) => { askConfirmed(c); },
  ask_eta: (c) => { if (inVm(c)) return; if (once(c, "g_info")) G(c, c.s.today ? "gr_eta" : "gr_first_today"); },
  ask_damage: (c) => { if (inVm(c)) return; c.s.damageAsked = true; if (once(c, "g_info")) G(c, "gr_damage"); },
  formal_thanks: (c) => { thankGrant(c, "formal"); },
  apologize: (c) => { thankGrant(c, "apology"); },
  kind_regards: (c) => { thankGrant(c, "regards"); },
  vm_close: (c) => { if (inVm(c)) { c.s.vmClose = true; vmEnd(c); return; } if (once(c, "g_ack")) G(c, "gr_ok"); },
  warm: (c) => { c.tip(TIPS.love_landlord); thankGrant(c, "love"); },
  see_you: (c) => { if (inVm(c)) { vmEnd(c); return; } grantBye(c); },
  demand_rude: (c) => { c.tip(TIPS.rude); if (inVm(c)) { c.s.requested = true; return; } c.s.requested = true; if (once(c, "g_ack")) G(c, "gr_rude"); },
  thats_all: (c) => { if (inVm(c)) { vmEnd(c); return; } c.s.closeNo = true; if (heardThanks(c)) c.s.thanked = true; },
  // "I'm not sure." to "Has it reached the apartment downstairs?" / "When did that start?"
  unsure_ctx: (c) => {
    if (inVm(c)) return;
    if (c.step === "g_down") { c.s.downDone = true; if (once(c, "g_down")) G(c, "gr_down_unknown"); return; }
    if (c.step === "g_since") c.s.sinceDone = true;
    if (once(c, "g_ack")) G(c, "gr_ok");
  },
};

const ALL_INTENTS = [
  "cancel_brunch", "flood", "cat_fridge", "nobody_hurt", "freaking_out", "ask_help", "item_ctx", "need_nothing", "not_item", "come_no",
  "warm", "see_you", "intro", "intro_ctx", "its_me", "when_happened", "when_ctx", "water_off", "water_not_off", "downstairs_yes",
  "downstairs_no", "ask_plumber", "today_ctx", "insist_today", "accept_tomorrow", "pick_time", "time_ctx", "ask_confirmed", "ask_eta",
  "ask_damage", "formal_thanks", "apologize", "kind_regards", "vm_close", "demand_rude", "thats_all", "unsure_ctx",
  "vm_who_ctx", "its_me_ctx", "sure_ctx", "door_surprise", "insist_ctx", "down_yes_ctx", "down_no_ctx", "wait_yes_ctx", "wait_no_ctx",
  "plumber_ctx", "vm_unknown",
];

function handle(intent: string): H {
  return (c, slots, seg) => {
    if (c.s.over || turn(c).switched) return;
    register(c, seg);
    if (inLizzie(c)) {
      const h = LIZZIE[intent];
      if (h) h(c, slots, seg);
      else if (once(c, "l_ack")) L(c, "l_ack");
      return;
    }
    const h = GRANT[intent];
    if (h) h(c, slots, seg);
    else if (!inVm(c) && once(c, "g_ack")) G(c, "gr_ok");
    if (inVm(c)) vmSilent(c);
  };
}

// Automatic answers the simulations give at moments that come on some seeds only.
const AUTO: Record<string, string> = {
  l_okay: "I'm fine, just wet.", l_brunch: "Yeah, sorry, I can't make it.", l_come: "No, really, I'm good. Enjoy brunch!",
  l_door: "You're a lifesaver!", l_bye: "Love you, thanks!",
  g_who: "This is Tomas Mikalauskas from apartment 3B.", g_since: "It happened this morning, at about seven.",
  g_hurt: "No, nobody's hurt.", g_down: "Yes, I'm afraid it's reaching the apartment downstairs.", g_water: "Yes, I've turned off the water.",
  valve: "Okay, it's off now.", g_request: "I would be grateful if a plumber could be sent today.",
  g_offer: "I'm afraid it can't wait until tomorrow.", sure_tomorrow: "Actually, it really needs to be today.",
  g_time: "Eleven would be perfect.", g_close: "Thank you for your prompt assistance.",
  hurt_yes: "Yes, I'm fine, just wet.",
  vm_msg: "Good morning, Mr. Grant. This is Tomas Mikalauskas from apartment 3B. I would be grateful if a plumber could be sent today. Kind regards.",
  closing: "Thank you for your prompt assistance.",
};

// ---------------------------------------------------------------------------

export const flood: SituationDef = {
  id: "p24-flood",
  song: "P24",
  songTitle: "Kind Regards, I'm Drowning",
  title: { en: "Kind Regards, I'm Drowning", lt: "Pagarbiai, skęstu" },
  topic: { en: "Two calls: casual and formal", lt: "Du skambučiai: draugei ir nuomotojui" },
  chapter: 9,
  order: 2,
  location: "phone",
  npc: "lizzie",
  npcs: ["mr_grant"],
  mode: "phone",
  goal: "Paskambink draugei ir nuomotojui: draugei papasakok laisvai, nuomotojui – mandagiai ir oficialiai, ir susitark, kad šiandien atvyktų santechnikas.",
  intro: "Šeštadienis, pusė devynių ryto, o tavo kojos šlapios: skalbimo mašina „kaip ir sprogo“, virtuvėje teka upė, o katė iš šaldytuvo viršaus žiūri piktai. Pirmiausia paskambink draugei Lizzie (su ja šiandien turėjai eiti į brunčą), paskui – nuomotojui ponui Grantui. Tie patys faktai, du skirtingi tonai.",
  entities: { stuff: STUFF },

  grammar: {
    macros: {
      washer: "(washer | washing machine | washer machine | laundry machine | machine)",
      place: "(kitchen | apartment | floor | place | hallway | bathroom | laundry room)",
      // the things for Lizzie (one to three, as one list: {stuff} becomes an array)
      thing: "[a | an | some | the | your | a big | an extra | lots of | a lot of | more | a few | old | two | three] {stuff}",
      things: "@thing [and @thing] [and @thing]",
      // the flood, said casually or neutrally
      fl: [
        "my @washer [kind of | basically | literally | just] exploded #h:washer_exploded #casual",
        "(my | the) @washer (broke | broke down | died | is broken | stopped working | is leaking | leaked | flooded [the | my] [@place | everything] | exploded | burst | is flooding [the | my] [@place | everything] | went crazy) [again] [this morning]",
        "there is (water | a river | a lake | a flood) (everywhere | on the (floor | tile | tiles) | in (the | my) @place | all over the (floor | kitchen | place)) #h:water_everywhere",
        "there is (water | a river) on the floor #h:river",
        "(my | the) @place is (flooded | under water | wet | all wet | a lake | a swimming pool | a river)",
        "my (socks | shoes | feet) are (wet | floating | swimming | soaked)",
        "(i | we) have a (flood | leak) [in (my | the) @place] [at home]",
        "it is a (flood | disaster | catastrophe)",
        "(my | the) @washer (is not | does not | will not) (working | work | stop [leaking]) [anymore] [properly]",
      ],
      cant_brunch: "(i can not make [it to] brunch #h:cant_make | i can not (come | go | make it) [to brunch] | i (will not | can not) be able to (come | make it) [to brunch] | i (have to | need to) (cancel | skip) [our] brunch | brunch is off) [today]",
      what_formal: [
        "(the | my) @washer (has (broken | failed | broken down | leaked | flooded (the | my) @place) | broke | broke down | failed | is leaking | leaked | flooded (the | my) @place) [again] [this morning]",
        "(the | my) @place (is | has been) (flooded | under water)",
        "there (is | has been) a (leak | flood) [in (my | the) @place]",
      ],
      // "today" for the plumber (#today); a few of them are formal
      today: [
        "(today | this morning | this afternoon | right away | as soon as possible | asap | now | right now | immediately | quickly | as soon as you can) #today",
        "(at your earliest convenience | without delay | at the earliest opportunity) #today #formal",
      ],
      aptno: "(3b | 3 b | three b | {aptn:number} (a | b | c | d) | {aptn:number})",
      apt: "[apartment | unit | apt | number | flat #tip:uk_flat] @aptno",
      down: "(the apartment (downstairs | below [me | mine | us]) | downstairs | mister okoye's [apartment | place] | okoye's [apartment | place] | the neighbor's apartment | the neighbors | my neighbor downstairs | the (neighbor | gentleman | man | guy) downstairs)",
      plumber: "(a plumber | the plumber | your plumber | someone | somebody | a repairman | a repair man | a handyman | a technician | a (master | specialist) #tip:master)",

      // --- the pieces of a report to Mr. Grant: the intents below use them, and so does a voicemail said in one
      // breath (vm_unknown: four or more pieces; the engine takes at most three intents per turn, see NEEDS 3)
      who: [
        "this is {name} [calling] (from | in) @apt #h:this_is_apt",
        "(my name is | it is | i am) {name} (from | in) @apt",
        "(this is | it is) your tenant (from | in) @apt",
        "i am (your tenant | the tenant) (from | in) @apt #h:tenant_in",
        "i am calling from @apt #h:calling_from",
        "my name is {name} [and i am your tenant] [(from | in) @apt]",
        "(it is | this is) @apt",
        "i (live | am) in @apt",
      ],
      report: [
        "@fl",
        "i regret to inform you that @what_formal #h:regret #formal #regret",
        "i regret to inform you of a (leak | flood) [in (my | the) @place] #formal #regret",
        "i am (writing | calling) to inform you (that @what_formal | of a (leak | flood)) #formal #regret",
        "i am calling to report a (leak | flood | problem with the @washer) #h:report_leak",
        "i am calling (about | regarding) (the | my) (@washer | leak | flood) [again]",
        "i am afraid [that] @what_formal #h:afraid_flooded",
        "i would like to report a (leak | flood)",
        "@what_formal",
        "the @washer [that | which] you [kindly] (fixed | repaired) [last (week | month)] (has failed | failed | broke | has broken | is leaking) [again] #formal",
        "(i | we) have a problem with (the | my) @washer",
        "there is a problem with (the | my) @washer",
        "(the | my) @washer has a problem",
      ],
      when: [
        "it (happened | started | began) (this morning | an hour ago | about an hour ago | half an hour ago | just now | a few minutes ago | {number} minutes ago) [this morning] #h:this_morning",
        // "It happened this morning, at about seven." (the hint)
        "it (happened | started | began) [this morning] (at | around | at about | about) {time} [this morning] #h:this_morning",
        "since (this morning | {time} [this morning] | about {time})",
        "about (an hour | half an hour | {number} minutes) ago",
        "(this morning | an hour ago | about an hour ago | half an hour ago | just now | a few minutes ago) [(at | around | at about | about) {time}]",
      ],
      water: [
        "i [have | already | have already] (turned | shut | switched) off the (water | main | valve | water valve | main valve | water supply | faucet) [and put down [some] towels] #h:water_off",
        "i [have | already | have already] (turned | shut | switched) the (water | valve | faucet) off",
        "i [have | already | have already] (closed | shut) the (valve | water valve | main valve | main)",
        "i [have | already | have already] (turned | shut) off the (tap | taps) #tip:uk_tap",
        "the water is (off | turned off | shut off) [now]",
        "i [have] (put | put down | laid down | used) [some | all my | a few | all the] towels [on the floor] [and turned off the water] #h:towels",
      ],
      downy: [
        "[as | because | since] [i am afraid] (it is | the water is) (reaching | leaking into | dripping into | going into | getting into | coming through to) @down #h:downstairs",
        "[i am afraid] (it | the water) (has reached | reached | is going | went | is dripping) [to | into] @down",
        "[as | because] the (neighbor | gentleman | man | guy) downstairs would like it fixed [without delay]",
      ],
      nohurt: ["(nobody | no one) (is | was | got) (hurt | injured) #h:nobody_hurt", "(everyone | everybody) is (fine | okay | safe | all right)"],
      req: [
        "i would be grateful if @plumber could (be sent | come | come over) [@today] #h:grateful_today #formal",
        "(could | can | would) you [please] (send | get | call) [me] @plumber [over] [@today] #h:could_send",
        "(could | can) @plumber (come | come over | come and fix it | come and look at it | take a look) [@today] #h:earliest",
        "is there any way @plumber could come [@today] #h:any_way",
        "is it possible (to get | for) @plumber [to come] [@today]",
        "i need (@plumber | it fixed | this fixed) [@today]",
        "(we | i) need @plumber to (fix | look at) it [@today]",
        "(please)? send @plumber [@today]",
        "i would like @plumber to come [@today]",
        "i would like it (fixed | repaired) [@today]",
        "(could | can) you (fix | repair) it [@today]",
        "i would appreciate it if @plumber could come [@today]",
      ],
      callback: [
        "please call me back [at your earliest convenience | as soon as possible | when you get this] #h:vm_call_back",
        "(could | can) you (please)? call me back [when you get this]",
        "call me back [please]",
        "ring me back [when you get this | as soon as possible] #tip:uk_ring",
        "i look forward to (hearing from you | your call | your reply | your swift reply) #h:look_forward #formal",
      ],
      signoff: [
        "(kind | best | warm | warmest) regards #h:kind_regards #formal",
        "yours (sincerely | faithfully) #formal",
        "(thank you | thanks) [very much | so much | in advance] for your prompt (assistance | help | response) #h:prompt #formal",
        "(thank you | thanks) [very much | so much | in advance] [for your (help | understanding)]",
        "i apologize for (any | the) inconvenience [this may cause] #h:apologize #formal",
      ],
      vm_piece: [
        "@who #vm_who", "this is {name} [your tenant] #vm_who",
        "@report #vm_flood", "@when #vm_when", "@water #vm_water", "@downy #vm_down", "@nohurt #vm_hurt",
        "@req #vm_req", "[i am afraid] it (can not | really can not) wait [(until | till) tomorrow] #vm_req #today",
        "it (really)? (needs | has) to be today #vm_req #today",
        "@callback #vm_end", "(bye | goodbye | bye bye) #vm_end", "@signoff #vm_sign",
      ],
      vm_and: "(and | so | also | and also | and then)",
    },
    slots: {},
  },

  intents: {
    // --- Lizzie: brunch, the flood, the cat ------------------------------------------------
    cancel_brunch: { patterns: [
      "[girl | babe] [i] can not make [it to] brunch [today] [so sorry | sorry] #h:cant_make #casual",
      "[girl] i can not (come | go | make it) [to brunch] [today] [so sorry | sorry]",
      "(yeah | yes | no) sorry i can not (come | go | make it) [to brunch] [today]",
      "i (have to | need to | got to | am going to have to) (cancel | skip | miss) [our] brunch [today]",
      "i (have to | need to) cancel [our plans | today | on you]",
      "i (will not | can not) (be able to come | make it) [to brunch] [today]",
      "(no | there is no) brunch for me [today]",
      "brunch is (off | cancelled | canceled) [for me] [today]",
      "(can | could) i take a rain check [on brunch] #h:rain_check",
      "rain check [on brunch]",
      "(it is | it is going to | going to) be a while #h:gonna_while #casual",
      "i am going to be (late | a while | really late | super late)",
      "(let us | can we) do (brunch | it) (another time | next week | next weekend | some other time | later)",
      "sorry about brunch",
      "[dear] i regret to inform you that i (will be | am) unable to (attend | make it to | come to) [the] brunch [today] #formal #regret",
      "i (will be | am) unable to (attend | come to | make it to) [the] brunch [today] #formal",
      "i must (cancel | decline) [our] brunch #formal",
    ] },
    flood: { patterns: [
      "@report",
      // "I can't make brunch, sorry. My washer exploded." (one piece: after a negation the engine starts no new one with "my")
      "@cant_brunch [so sorry | sorry | i am so sorry] [because | since] @fl #cancel",
      "@fl [so] (no brunch [for me] [today] | i can not (make | come to) brunch) #cancel",
      "it is (in the hallway | heading for the door | everywhere) [now]",
      "i am [literally] (swimming | standing in water) [on the floor | in my kitchen | here]",
      "(water | the water) is (everywhere | coming out | coming from the @washer | leaking | running | spreading)",
    ] },
    cat_fridge: { patterns: [
      "the cat is on (the | top of the) fridge [giving me the evil eye] #h:cat_fridge",
      "(the | my) cat (jumped on | is sitting on | is hiding on | climbed) (the | top of the) fridge",
      "(the | my) cat is (fine | okay | safe | angry | upset | furious | offended | not happy)",
      "the cat is giving me the evil eye",
    ] },
    nobody_hurt: { patterns: [
      "[no] @nohurt",
      "[no] (nobody | no one) [at all]",
      "[no] i am not (hurt | injured)",
      "[yes] i am (fine | okay | all right | good) [just (wet | a bit wet | a little wet) | thanks]",
      "[no] just my (socks | pride | shoes | feet) #h:just_socks",
      "only my (socks | shoes) are (hurt | wet | ruined)",
      "only the cat is (upset | offended | angry | mad)",
      "i am (okay | fine) but (wet | my feet are wet | my socks are wet)",
      // "I'm wet." to "Are you okay?" (never a name: "Ha, I know! I saw your name.")
      "i am [just | only] [a bit | a little | all | completely] (wet | soaked | soaking wet)",
      "(we are | i am) (all)? (safe | fine) [thank you]",
    ] },
    freaking_out: { patterns: [
      "i am (freaking out | panicking | going crazy | losing my mind) #h:freaking",
      "i am [literally] (drowning | going to drown) [in here]",
      "help i am (going to drown | drowning)",
      "kind regards i am drowning #formal",
      "i am not (okay | fine | really okay | good)",
      "i am [so | really | a bit | a little | totally] (stressed | stressed out | upset | a mess | in shock | worried)",
    ] },
    // --- Lizzie: what to bring -------------------------------------------------------------
    ask_help: { patterns: [
      "(can | could) you bring [me] @things [on the way | with you | over] #h:bring_x",
      "(can | could) you (grab | get | pick up) [me] @things [on the way | on your way] #h:grab_x",
      "i (need | could use | would love | would kill for) @things",
      "@things would be (amazing | great | awesome | perfect | a lifesaver | nice)",
      "[and] lots of {stuff} #h:lots_coffee",
      "(do | would) you have (a | an extra | any | a spare) {stuff} [i could borrow]",
      "(bring | send) @things [send a boat] #h:send_boat",
      "(can | could) you come over [and help] [with (a | the) {stuff}] #h:come_over #come",
      "[please] come over [and help] #come",
      "i (need | could use) (help | a hand | some help) #come",
      "(can | could) you help me [out] #come",
      "i would be grateful if you could bring @things #formal",
      "i would be grateful if you could (come over | assist me) #formal #come",
    ] },
    // a bare item, only as an answer to "Do you need anything?"
    item_ctx: { patterns: ["[and] @things [and] [please]"] },
    need_nothing: { patterns: [
      "[no] i am (good | fine | okay | all right) [thanks | really]  #h:no_im_good",
      "[no] i do not need anything [thanks | really | right now]",
      "[no] (nothing | nothing really | nothing for now) [thanks]",
      "[no] you do not (have to | need to) (come | bring anything | come over | do anything)",
      "do not worry about (it | me) [enjoy [your] brunch] #h:dont_worry",
      "enjoy [your] brunch",
      "[no] i (have | have got | got) (it | this) [under control]",
      "thank you but that will not be necessary #formal",
    ] },
    not_item: { patterns: [
      "[no] i do not need (a | any | the | more) {stuff}",
      "[no] no {stuff} [please | thanks]",
      "not (a | the) {stuff}",
      "forget the {stuff}",
      "i (have | already have) (a | my own) {stuff}",
      // "I bought a mop." (never "Did you say boat?")
      "i [already] (bought | got) (a | some | my own | a new) {stuff} [already]",
    ] },
    come_no: { patterns: [
      "[no] (please)? do not come [over] [enjoy [your] brunch]",
      "[no] stay at brunch",
      "[no] you do not have to come [over]",
    ] },
    // warm thanks and goodbyes (Lizzie: at the door they thank her, at the end they say goodbye)
    warm: { patterns: [
      "love you [thanks | bye] #h:love_you #casual",
      "(thanks | thank you) love you #casual",
      "i love you #casual",
      "you are the best #h:youre_best #casual",
      "you are (amazing | a star | an angel | a lifesaver | my hero) #h:lifesaver #casual",
      "i owe you one #h:owe_you #casual",
      "i owe you (big time | a brunch | a coffee) #casual",
      "thanks (xo | a million | a bunch) #casual",
      "(oh my god | oh my gosh) [thank you] #casual",
      "you did not have to [do that] #h:didnt_have #casual",
      "come in [come in] #h:come_in",
      "get in here #casual",
    ] },
    // surprise at the door (she answers "That's what friends are for")
    door_surprise: { patterns: [
      "[oh my god | oh my gosh] what are you doing here",
      "no way #casual",
      "(are you serious | seriously) [what are you doing here]",
      "how did you (know | get here [so fast])",
    ] },
    // "I'm sure." to "You sure?" (Lizzie) / "Are you sure?" (Mr. Grant)
    sure_ctx: { patterns: ["[yes] i am [totally | really | absolutely | one hundred percent] sure", "[yes] i am positive", "(totally | absolutely | positive | one hundred percent) [sure]"] },
    see_you: { patterns: [
      "see you in a bit #h:see_bit #casual",
      "see you in (a few | twenty | twenty minutes | a minute)",
      "talk to you later #h:talk_later",
      "talk later #casual",
      "later #casual",
    ] },

    // --- Mr. Grant: who, what, when, what was done ------------------------------------------
    // a bare name ("This is Tomas.", "I'm Tomas.") only answers "Who's this?": elsewhere {name} would swallow
    // "I'm wet", "This is urgent" or "ring me back"
    intro: { patterns: ["@who", "i am your tenant"] },
    intro_ctx: { patterns: ["{name}", "it is {name}", "{name} (here | speaking)", "@apt", "(this is | i am) {name} [your tenant]", "it is me {name} [from @apt]"] },
    // the voicemail: "This is Tomas." (the handler takes only the player's own name: "Please ring me back" is none)
    vm_who_ctx: { patterns: ["(this is | it is) {name} [your tenant] [calling]", "it is me {name} [from @apt]"] },
    its_me: { patterns: ["(it is | this is) me [your tenant] #casual", "guess who #casual"] },
    its_me_ctx: { patterns: ["me #casual"] },
    when_happened: { patterns: [
      "@when",
      "(it has been | for) (about | almost)? (an hour | half an hour | {number} minutes)",
      "i woke up and (the kitchen was flooded | there was water everywhere)",
    ] },
    when_ctx: { patterns: ["[at | around | at about | about] {time} [this morning]"] },
    water_off: { patterns: [
      "@water",
      "i [have] (unplugged | turned off) the @washer",
      "i [have] closed the (water | water pipe) #tip:close_water",
      "(it is | the water is) [already] off [now]",
      "[yes] i did",
      "[okay] it is off [now]",
    ] },
    water_not_off: { patterns: [
      "i do not know (where the valve is | how to turn (it | the water) off | where to turn it off) #h:dont_know_valve",
      "i [still] (can not | could not) (turn | shut) (it | the water) off",
      "i (can not | could not) find the (valve | main | water valve)",
      "the water is still (running | coming | on)",
      "i (have not | did not) (turned | turn) (it | the water) off [yet]",
      "i (have not | did not) (turned | turn) off the water [yet]",
    ] },
    downstairs_yes: { patterns: [
      "[yes] @downy",
      "[yes] mister okoye (knocked | called | came up | is upset | is not happy)",
      "[yes] (his | the) ceiling [downstairs] is (wet | dripping | leaking)",
      "[yes] it is dripping downstairs",
      "[yes] (the | my) (neighbor | neighbors) (from below | under me | below me) [is | are] [upset | complaining] #tip:downstairs",
      "[yes] the (neighbor | gentleman | man | guy | lady | woman) downstairs (is upset | is not happy | is angry | knocked | called | came up | is complaining | has water [in his apartment])",
    ] },
    downstairs_no: { patterns: [
      "[no] (it | the water) (has not | did not) (reached | reach | gone | go) [to] @down [yet]",
      "[no] not downstairs [yet]",
      "[no] (just | only) (my | the) kitchen",
      "[no] it is (only | just) in (my | the) @place",
    ] },
    // short answers to "Has it reached the apartment downstairs?"
    down_yes_ctx: { patterns: ["[yes] it has [reached it]", "[yes] i am afraid (so | it has | it is)", "[yes] it is [leaking | dripping]", "[yes] it did"] },
    down_no_ctx: { patterns: ["[no] it has not [reached it] [yet]", "[no] it is not [yet]", "[no] it did not", "(i hope | hopefully) not"] },

    // --- Mr. Grant: the plumber -----------------------------------------------------------------
    ask_plumber: { patterns: [
      "@req",
      // "Can you come today?" (to Lizzie: she comes over)
      "(could | can | would) you (come | come by | come and (fix | look at) it | come and take a look) [@today]",
      "(could | can | would) you send @plumber tomorrow #tomorrow",
      "(could | can) @plumber come tomorrow [morning] #tomorrow",
    ] },
    today_ctx: { patterns: ["[a plumber] @today [please | if possible]"] },
    // "A plumber." to "So what do you need from me?"
    plumber_ctx: { patterns: ["@plumber [@today]", "(a plumber | someone | somebody) to (fix | look at) it [@today]"] },
    insist_today: { patterns: [
      "[i am afraid] it (can not | really can not) wait [until tomorrow | till tomorrow] #h:cant_wait",
      "[i am afraid] (that | this) (can not | will not) wait [until tomorrow | till tomorrow]",
      "(tomorrow | tomorrow morning | that | it) is (too late | way too late | much too late) [i am afraid]",
      "(tomorrow | that) (is not | will not be) (good | okay | fine | possible | an option)",
      "(tomorrow | that) (does not | will not) work [for me]",
      "it (really)? (needs | has) to be today #h:really_today",
      "(it | this | that) is (urgent | an emergency | really urgent | quite urgent | very urgent)",
      // "I'm not sure it can wait." (not "I don't know" + "it can wait")
      "i am not sure (it | that | this) (can | could) wait [(until | till) tomorrow]",
      "i do not think (it | that | this) (can | could) wait [(until | till) tomorrow]",
      "(is there any way | is it possible) (it could be | someone could come | he could come | to do it) today",
      "i would (really)? appreciate it if (someone | a plumber | he | joe) could come today #h:appreciate_today",
      "today if (possible | at all possible)",
      "i can not wait (until | till) tomorrow",
      "(we | i) (can not | do not want to) wait (until | till) tomorrow",
      "i need (him | someone | a plumber) today [not tomorrow]",
      "today not tomorrow",
      "(actually)? (today | it) would be (better | much better)",
      "[actually] it really needs to be today",
    ] },
    // "I'm worried." to "Could it wait till tomorrow morning?"
    insist_ctx: { patterns: ["i am [really | very | a bit | a little] (worried | concerned | nervous) [about (it | the ceiling | the damage | mister okoye | the apartment downstairs | the neighbor)]"] },
    // "No, it can't." / "Yes, it can." to "Could it wait till tomorrow morning?"
    wait_no_ctx: { patterns: ["[no] it (can not | really can not)", "[no] i am afraid not"] },
    wait_yes_ctx: { patterns: ["[yes] it can", "[yes] i (guess | suppose) (it can | so)"] },
    accept_tomorrow: { patterns: [
      "(tomorrow | tomorrow morning) (is | would be) (fine | okay | good | great | perfect) #h:tomorrow_fine",
      "(okay | fine | all right) (tomorrow | tomorrow morning) [then | works]",
      "tomorrow (works | is okay) [for me]",
      "it can wait (until | till) tomorrow",
      "[yes] (it | that) can wait",
      "[yes] i can wait (until | till) tomorrow",
      "tomorrow then",
    ] },
    pick_time: { patterns: [
      "{time} (would be | is) (perfect | great | fine | good | best | better) [for me] #h:time_perfect",
      "(could | can) (he | joe | the plumber) come at {time} #h:could_he",
      "{time} works [for me] [better]",
      "let us (say | do | make it) {time}",
      "i [would] prefer [it at] {time}",
      "(the earlier the better | as early as possible | the sooner the better) #early",
      "(any time | anytime) [is fine] [i am home all day | i will be home] #any",
      "i am (home | at home) all day #any",
      "(in the morning | before (noon | lunch)) [please] #early",
      "(in the afternoon | after lunch) [please] #late",
      "(the first one | the earlier one) [please] #early",
      "(the second one | the later one) [please] #late",
    ] },
    time_ctx: { patterns: [
      "[at] {time} [please | o'clock]",
      // "Either is fine." / "I don't mind." (Joe's first slot)
      "(either | either one | either time) [is | would be] [fine | okay | good] [for me | with me] #any",
      "both (are | would be) fine #any",
      "i do not mind [either way | which one] #any",
      "(whichever | whatever) (is easier | is better | works) [for him | for joe] #any",
      "it does not matter #any",
    ] },
    ask_confirmed: { patterns: [
      "is (that | it) a confirmed time or (an estimate | just an estimate) #h:confirmed",
      "is (that | it | eleven | one | that time) (confirmed | definite | for sure | a firm time | an exact time)",
      "(could | can) you confirm the time [please] #h:confirm_time",
      "(could | can) you (let me know | text me | call me | send me a message) when (he is | the plumber is) on (his | the) way #h:let_know",
      "please advise (when | what time) (the plumber | he) will arrive #h:advise #formal",
      "(is that | is it) (an estimate | approximate | roughly)",
      "will he (really)? be (here | there) at {time}",
    ] },
    ask_eta: { patterns: [
      "when (will | can) you (be here | get here | come | arrive)",
      "how long will it take you [to get here]",
      "are you coming [now | right now]",
    ] },
    ask_damage: { patterns: [
      "who (will | is going to) pay for (the damage | the repair | it | the ceiling | the plumber)",
      "will you (cover | pay for) (the damage | the repair | it | the plumber)",
      "do i have to pay [for (the repair | the damage | the plumber)]",
    ] },

    // --- Mr. Grant: thanks, apologies, the voicemail's closing ------------------------------------
    formal_thanks: { patterns: [
      "(thank you | thanks) [very much | so much | again] for your prompt (assistance | help | response | reply) #h:prompt #formal",
      "thank you (so | very)? much for your (help | understanding | quick response)",
      "i (really | truly)? appreciate (it | your help | that | this) #h:appreciate_it",
      "(thanks | thank you) i (really)? appreciate it",
      "i look forward to seeing you #formal",
      "that is (very | really)? (kind | helpful) of you",
      "(thank you | thanks) for (coming | sorting this out | your help | being so quick | everything)",
      "(much | greatly) appreciated",
    ] },
    apologize: { patterns: [
      "i apologize for (any | the) inconvenience [this may cause] #h:apologize #formal",
      "(i am)? sorry for (the trouble | the inconvenience | calling so early | bothering you)",
      "i am (so)? sorry to (bother you | call so early)",
    ] },
    kind_regards: { patterns: ["(kind | best | warm | warmest) regards #h:kind_regards #formal", "yours (sincerely | faithfully) #formal", "sincerely #formal"] },
    vm_close: { patterns: ["@callback"] },
    // a voicemail said in one breath (four pieces or more): see the `vm_piece` macro and NEEDS 3
    vm_unknown: { patterns: ["@vm_piece [@vm_and] @vm_piece [@vm_and] @vm_piece [@vm_and] @vm_piece [[@vm_and] @vm_piece] [[@vm_and] @vm_piece] [[@vm_and] @vm_piece] [[@vm_and] @vm_piece]"] },
    demand_rude: { patterns: [
      "(fix it | get over here | come now | do something) [now | right now] #casual",
      "this is your (problem | job | fault) #casual",
      "you (have to | need to | must) fix it [now | today | right now] #casual",
    ] },
    thats_all: { patterns: ["[no] (that is all | that is it | nothing else | that is everything) [for now] [thanks]"] },
    // "I'm not sure." (only to a question that expects it: the global "I don't know" stays the default)
    unsure_ctx: { patterns: ["i (do not know | am not sure) [exactly | yet | to be honest]", "(not sure | no idea) [yet]", "i have no idea", "i did not (check | look)"] },
  },

  lines: {
    // --- Lizzie ------------------------------------------------------------------------------
    l_hello: [
      t("Hey! | On my way | to brunch. | You?", "Labas! | Pakeliui | į brunčą. | O tu?", "Labas! Jau einu į brunčą. O tu?"),
      t("Hey, | you! | Heading | to brunch | right now. | What's up?", "Labas, | tu! | Einu | į brunčą | šiuo metu. | Kas naujo?", "Labas! Kaip tik einu į brunčą. Kas naujo?"),
    ],
    l_what: [
      t("Wait, | what? | What | happened?", "Palauk, | ką? | Kas | nutiko?", "Palauk, ką? Kas nutiko?"),
      t("Oh | no, | why? | Is | everything | okay?", "O | ne, | kodėl? | Ar | viskas | gerai?", "O ne, kodėl? Ar viskas gerai?",
        { flags: { 3: "“Is” in a yes/no question = the particle ar." } }),
    ],
    l_what_again: [
      t("So | what's | going on?", "Tai | kas | vyksta?", "Tai kas vyksta?", { flags: { 1: "“'s” (is): the progressive auxiliary; vyksta carries it." } }),
    ],
    l_guess: [
      t("Wait. | Is | it | the | washing machine | again?", "Palauk. | Ar | tai | — | skalbimo mašina | vėl?", "Palauk. Vėl skalbimo mašina?",
        { flags: { 1: "“Is” in a yes/no question = the particle ar." } }),
    ],
    l_react_exploded: [
      t("Oh | my | gosh! | Exploded?!", "O | mano | dieve! | Sprogo?!", "O Dieve! Sprogo?!"),
      t("Wait, | exploded?! | Like, | boom?", "Palauk, | sprogo?! | Tipo, | bum?", "Palauk, sprogo?! Kaip – bum?"),
    ],
    l_react_water: [
      t("No way! | Like, | actual | water?", "Negali būti! | Tipo, | tikras | vanduo?", "Negali būti! Tikras vanduo?"),
      t("Oh | no! | How | bad | is | it?", "O | ne! | Kaip | blogai | yra | tai?", "O ne! Kaip blogai?"),
    ],
    l_react_flood: [
      t("What?! | That | machine | hates | you.", "Ką?! | Ta | mašina | nekenčia | tavęs.", "Ką?! Ta mašina tavęs nekenčia."),
      t("Oh | no! | Not | again!", "O | ne! | Tik | ne vėl!", "O ne! Tik ne vėl!"),
    ],
    l_ack: [t("Oh | no.", "O | ne.", "O ne."), t("Ugh, | seriously?", "Ech, | rimtai?", "Ech, rimtai?")],
    l_i_know: [t("Ha, | I | know! | I | saw | your | name.", "Cha, | aš | žinau! | Aš | mačiau | tavo | vardą.", "Cha, žinau! Mačiau tavo vardą.")],
    l_brunch_ok: [
      t("Totally | fine. | Brunch | can | wait.", "Visiškai | gerai. | Brunčas | gali | palaukti.", "Nieko tokio. Brunčas palauks."),
      t("Don't worry | about | it. | I'll eat | your | pancakes.", "Nesijaudink | dėl | to. | Suvalgysiu | tavo | blynelius.", "Nesijaudink. Suvalgysiu tavo blynelius."),
    ],
    l_cat: [
      t("Ha! | Poor | kitty. | Smart | cat, | though.", "Cha! | Vargšė | katytė. | Protinga | katė | vis dėlto.", "Cha! Vargšė katytė. Bet protinga."),
    ],
    l_are_you_ok: [
      t("Are | you | okay?", "Ar | tau | viskas gerai?", "Ar tau viskas gerai?", { flags: { 0: "“Are” in a yes/no question = ar; the dative tau needs no copula." } }),
      t("Wait, | are | you | okay?", "Palauk, | ar | tau | viskas gerai?", "Palauk, ar tau viskas gerai?", { flags: { 1: "“are” in a yes/no question = ar; the dative tau needs no copula." } }),
    ],
    l_glad_ok: [t("Phew. | Okay, | good.", "Fu. | Gerai, | gerai.", "Fu. Na ir gerai.")],
    l_breathe: [t("Breathe. | It's | just | water.", "Kvėpuok. | Tai | tik | vanduo.", "Kvėpuok. Tai tik vanduo.", { flags: { 1: F_ITS } })],
    l_laugh_formal: [
      t("Ha! | Who | are | you, | my | bank?", "Cha! | Kas | esi | tu, | mano | bankas?", "Cha! Tu ką, mano bankas?"),
      t("Ha! | Why | so | formal?", "Cha! | Kodėl | taip | oficialiai?", "Cha! Ko taip oficialiai?"),
    ],
    l_brunch_q: [
      t("So... | no | brunch, | I'm guessing?", "Tai... | jokio | brunčo, | spėju?", "Tai... brunčo nebus, spėju?"),
    ],
    l_need_q: [
      t("Do | you | need | anything? | I | can | grab | stuff | on the way.", "Ar | tau | reikia | ko nors? | Aš | galiu | pagriebti | daiktų | pakeliui.",
        "Ar tau ko nors reikia? Galiu ką nors pagriebti pakeliui.", { flags: { 0: F_DO_Q, 1: F_DAT_REIKIA } }),
      t("What | do | you | need? | Tell | me.", "Ko | — | tau | reikia? | Sakyk | man.", "Ko tau reikia? Sakyk.", { flags: { 1: F_WH_DO, 2: F_DAT_REIKIA } }),
    ],
    l_bring1: [t("Okay! | I'll bring | {X.np}.", "Gerai! | Atnešiu | {X.np:acc}.", "Gerai! Atnešiu {X.np:acc}.")],
    l_bring2: [t("Okay! | I'll bring | {X.np} | and | {Y.np}.", "Gerai! | Atnešiu | {X.np:acc} | ir | {Y.np:acc}.", "Gerai! Atnešiu {X.np:acc} ir {Y.np:acc}.")],
    l_and_coffee: [t("And | coffee. | Lots of | coffee. | Got it.", "Ir | kavos. | Daug | kavos. | Supratau.", "Ir kavos. Daug kavos. Supratau.")],
    l_coffee_only: [t("Coffee. | Lots of | coffee. | Got it.", "Kavos. | Daug | kavos. | Supratau.", "Kavos. Daug kavos. Supratau.")],
    l_boat: [
      t("Ha! | No | boat, | sorry. | But | I | have | a | mop.", "Cha! | Jokios | valties, | atsiprašau. | Bet | aš | turiu | — | mopą.", "Cha! Valties neturiu, atsiprašau. Bet turiu mopą.",
        { flags: { 1: "“No” + a noun = jokios + the genitive." } }),
    ],
    l_coming: [t("Okay, | I'm coming | over | to help.", "Gerai, | ateinu | — | padėti.", "Gerai, ateinu padėti.", { flags: { 2: "“over”: ateinu (to your place) carries it." } })],
    l_on_way: [t("Be there | in | twenty | minutes.", "Būsiu | po | dvidešimties | minučių.", "Būsiu po dvidešimties minučių.")],
    l_no_problem: [t("Okay, | no | problem.", "Gerai, | jokių | problemų.", "Gerai, jokių problemų.")],
    l_sure: [
      t("You | sure? | I | can | come over | after | brunch.", "Tu | {m:tikras|f:tikra}? | Aš | galiu | užsukti | po | brunčo.", "Tikrai? Galiu užsukti po brunčo."),
    ],
    l_coming_yes: [t("Yay! | I'll come | right after | brunch.", "Valio! | Ateisiu | iškart po | brunčo.", "Valio! Ateisiu iškart po brunčo.")],
    l_not_coming: [
      t("Okay, | but | call | me | if | you | need | me.", "Gerai, | bet | paskambink | man | jei | tau | prireiks | manęs.", "Gerai, bet paskambink, jei manęs prireiks."),
    ],
    l_bye_q: [
      t("Okay, | go | call | your | landlord. | Love | you!", "Gerai, | eik | paskambink | savo | nuomotojui. | Myliu | tave!", "Gerai, eik paskambink savo nuomotojui. Myliu tave!"),
      t("Go | call | Mr. Grant. | See you in a bit!", "Eik | paskambink | ponui Grantui. | Iki greito!", "Eik paskambink ponui Grantui. Iki greito!"),
    ],
    l_love_too: [t("Love | you | too! | Bye!", "Myliu | tave | irgi! | Iki!", "Aš tave irgi! Iki!")],
    l_bye_after: [t("Bye! | Good luck!", "Iki! | Sėkmės!", "Iki! Sėkmės!"), t("Later! | Good luck!", "Iki! | Sėkmės!", "Iki! Sėkmės!")],
    l_anytime: [t("Anytime!", "Visada prašom!", "Visada prašom!"), t("Aww. | Of course!", "Oi. | Žinoma!", "Oi, žinoma!")],
    // the door twist
    l_door1: [
      t("Okay, | don't panic, | but... | open | your | door.", "Gerai, | nepanikuok, | bet... | atidaryk | savo | duris.", "Gerai, tik nepanikuok, bet... atidaryk duris."),
    ],
    l_door2: [
      t("Surprise! | You | texted | me | 'HELP' | and | nine | water | emojis.", "Staigmena! | Tu | parašei | man | „HELP“ | ir | devynis | vandens | jaustukus.",
        "Staigmena! Parašei man „HELP“ ir devynis vandens jaustukus."),
    ],
    l_door3: [t("So | I | brought | a | mop | and | coffee.", "Tai | aš | atnešiau | — | mopą | ir | kavos.", "Tai atnešiau mopą ir kavos.")],
    l_door_anyway: [
      t("I | know, | I | know, | you're | fine. | I | brought | a | mop | anyway. | And | coffee.",
        "Aš | žinau, | aš | žinau, | tau | viskas gerai. | Aš | atnešiau | — | mopą | vis tiek. | Ir | kavos.",
        "Žinau, žinau, tau viskas gerai. Vis tiek atnešiau mopą. Ir kavos.", { flags: { 4: "“you're” = tau: with viskas gerai Lithuanian uses the dative and no copula." } }),
    ],
    l_door_go: [
      t("Anytime. | Now | go | call | your | landlord. | I'll start | mopping.", "Visada prašom. | O dabar | eik | paskambink | savo | nuomotojui. | Pradėsiu | plauti grindis.",
        "Visada prašom. O dabar eik paskambink nuomotojui, o aš pradėsiu plauti grindis."),
    ],
    l_door_friends: [
      t("Ha! | That's what friends are for. | Now | go | call | your | landlord. | I'll start | mopping.",
        "Cha! | Tam ir yra draugai. | O dabar | eik | paskambink | savo | nuomotojui. | Pradėsiu | plauti grindis.",
        "Cha! Tam ir yra draugai. O dabar eik paskambink nuomotojui, o aš pradėsiu plauti grindis."),
    ],
    // at the end of Mr. Grant's call (door twist)
    l_shout: [t("Kind regards, | Mr. Grant!", "Pagarbiai, | pone Grantai!", "Pagarbiai, pone Grantai!")],

    // --- Mr. Grant ----------------------------------------------------------------------------
    gr_pickup: [
      t("Yello! | Grant | here. | Who's this?", "Alio! | Grantas | čia. | Kas skambina?", "Alio! Čia Grantas. Kas skambina?"),
      t("Hello-o! | This is | Grant. | Who | am | I | talking to?", "Alio! | Čia | Grantas. | Su kuo | — | aš | kalbu?", "Alio! Čia Grantas. Su kuo kalbu?",
        { flags: { 4: "“am”: the continuous form has no Lithuanian word; kalbu carries it." } }),
    ],
    gr_who_again: [
      t("Sorry, | who's | calling?", "Atsiprašau, | kas | skambina?", "Atsiprašau, kas skambina?", { flags: { 1: "“'s” (is): the progressive auxiliary; skambina carries it." } }),
    ],
    gr_who_btw: [t("Who's | this, | by the way?", "Kas | čia, | beje?", "Beje, kas čia?", { flags: { 0: "“'s” (is): Lithuanian needs no copula here." } })],
    gr_its_me: [
      t("Ha! | 'Me' | who? | I've got | twelve | tenants.", "Cha! | „Aš“ | kas? | Turiu | dvylika | nuomininkų.", "Cha! Kas tas „aš“? Turiu dvylika nuomininkų."),
    ],
    gr_guess_who: [
      t("Oh, | wait, | it's | 3B! | I've got | your | number | saved.", "O, | palaukite, | tai | 3B! | Turiu | jūsų | numerį | išsaugotą.", "O, palaukite – tai 3B! Turiu jūsų numerį išsisaugojęs.",
        { say: "Oh, wait, it's three B! I've got your number saved.", flags: { 2: F_ITS } }),
    ],
    gr_hi_tenant: [
      t("Oh, | hi there!", "O, | sveiki!", "O, sveiki!"),
      t("3B! | Good | morning!", "3B! | Labas | rytas!", "3B! Labas rytas!", { say: "Three B! Good morning!" }),
    ],
    gr_what_q: [
      t("What | can | I | do | for you?", "Ką | galiu | aš | padaryti | jums?", "Kuo galiu padėti?"),
      t("What's | going on?", "Kas | vyksta?", "Kas vyksta?", { flags: { 0: "“'s” (is): the progressive auxiliary; vyksta carries it." } }),
    ],
    gr_what_again: [
      t("So, | what's up?", "Tai | kas nutiko?", "Tai kas nutiko?"),
      t("So | what | can | I | do | for you?", "Tai | ką | galiu | aš | padaryti | jums?", "Tai kuo galiu padėti?"),
    ],
    gr_guess_washer: [t("Is | it | that | washing machine | again?", "Ar | tai | ta | skalbimo mašina | vėl?", "Vėl ta skalbimo mašina?", { flags: { 0: "“Is” in a yes/no question = the particle ar." } })],
    gr_regret: [
      t("'Regret | to inform'? | Uh-oh. | That's | never | good | news.", "„Apgailestauju | pranešti“? | Oi. | Tai | niekada nebūna | geros | žinios.",
        "„Apgailestauju pranešti“? Oi. Tai niekada nebūna gera žinia.", { flags: { 4: "“That's” = tai: the copula moves into nebūna (under “never”)." } }),
    ],
    gr_flood_react: [
      t("Oh | no. | Oh | no, | no, | no.", "O | ne. | O | ne, | ne, | ne.", "O ne. O ne, ne, ne."),
      t("Oh boy. | That | darn | machine!", "Oi oi. | Ta | prakeikta | mašina!", "Oi oi. Ta prakeikta mašina!"),
    ],
    gr_so_sorry: [t("Oh | no! | So | sorry!", "O | ne! | Labai | atsiprašau!", "O ne! Labai atsiprašau!")],
    gr_since_q: [
      t("When | did | that | start?", "Kada | — | tai | prasidėjo?", "Kada tai prasidėjo?", { flags: { 1: F_WH_DID } }),
    ],
    gr_ok: [t("Okay, | okay.", "Gerai, | gerai.", "Gerai, gerai."), t("Got it.", "Supratau.", "Supratau."), t("Uh-huh.", "Aha.", "Aha.")],
    gr_hurt_q: [
      t("Is | anybody | hurt?", "Ar | kas nors | nukentėjo?", "Ar kas nors nukentėjo?", { flags: { 0: "“Is” in a yes/no question = ar; the past nukentėjo carries the state." } }),
      t("You | okay? | Nobody | hurt?", "Jums | viskas gerai? | Niekas | nenukentėjo?", "Ar jums viskas gerai? Niekas nenukentėjo?", { flags: { 3: F_CONCORD } }),
    ],
    gr_relief: [t("Thank | goodness.", "Ačiū | Dievui.", "Ačiū Dievui."), t("Phew. | Good.", "Fu. | Gerai.", "Fu. Gerai.")],
    gr_breathe: [t("Hey, | hey. | Deep | breath. | It's | just | water.", "Ei, | ei. | Giliai | įkvėpkite. | Tai | tik | vanduo.", "Ei, ei. Giliai įkvėpkite. Tai tik vanduo.", { flags: { 4: F_ITS } })],
    gr_hurt_yes: [t("What? | Are | you | okay?", "Ką? | Ar | jums | viskas gerai?", "Ką? Ar jums viskas gerai?", { flags: { 1: "“Are” in a yes/no question = ar; the dative jums needs no copula." } })],
    gr_careful: [t("Okay. | Careful, | that | floor | is | slippery.", "Gerai. | Atsargiai, | tos | grindys | yra | slidžios.", "Gerai. Atsargiai, grindys slidžios.")],
    gr_down_q: [
      t("Has | it | reached | the | apartment | downstairs?", "Ar | vanduo | pasiekė | — | butą | apačioje?", "Ar vanduo jau pasiekė butą apačioje?",
        { flags: { 0: "Perfect “Has” in a question = ar; the past pasiekė carries the tense.", 1: "“it” = vanduo (the water)." } }),
      t("Is | it | leaking | into | Mr. Okoye's | place | downstairs?", "Ar | vanduo | prateka | į | pono Okoye | butą | apačioje?", "Ar vanduo prateka į pono Okoye butą apačioje?",
        { flags: { 0: "“Is” in this progressive yes/no question = ar; prateka carries the tense.", 1: "“it” = vanduo (the water)." } }),
    ],
    gr_down_yes: [t("Oh boy. | Poor | Mr. Okoye.", "Oi oi. | Vargšas | ponas Okoye.", "Oi oi. Vargšas ponas Okoye.")],
    gr_down_no: [t("Phew. | Okay.", "Fu. | Gerai.", "Fu. Gerai."), t("Good. | Not | yet, | anyway.", "Gerai. | Ne | dar, | bent jau.", "Gerai. Bent jau kol kas ne.")],
    gr_down_unknown: [t("Okay. | I'll knock | on | Mr. Okoye's | door | later.", "Gerai. | Pasibelsiu | į | pono Okoye | duris | vėliau.", "Gerai. Vėliau pasibelsiu į pono Okoye duris.")],
    gr_water_q: [
      t("Did | you | turn off | the | water?", "Ar | jūs | užsukote | — | vandenį?", "Ar užsukote vandenį?", { flags: { 0: F_DID_Q } }),
    ],
    gr_water_good: [t("Smart. | Good | thinking.", "Protinga. | Gera | mintis.", "Protinga. Gerai sugalvojote.")],
    gr_valve: [
      t("There's | a | little | valve | behind | the | machine. | Turn | it | to the right.", "Yra | — | mažas | ventilis | už | — | mašinos. | Pasukite | jį | į dešinę.",
        "Už mašinos yra mažas ventilis. Pasukite jį į dešinę.", { flags: { 0: F_EXIST } }),
    ],
    gr_perfect: [t("Perfect.", "Puiku.", "Puiku.")],
    gr_valve_later: [t("No | worries. | I'll do | it | when | I | get there.", "Nieko | tokio. | Padarysiu | tai, | kai | aš | atvyksiu.", "Nieko tokio. Padarysiu tai, kai atvyksiu.")],
    gr_req_q: [
      t("Okay. | So | what | do | you | need | from | me?", "Gerai. | Tai | ko | — | jums | reikia | iš | manęs?", "Gerai. Tai ko jums iš manęs reikia?", { flags: { 3: F_WH_DO, 4: F_DAT_REIKIA } }),
      t("So, | how | can | I | help?", "Tai | kaip | galiu | aš | padėti?", "Tai kuo galiu padėti?"),
    ],
    gr_send_q: [t("Want | me | to send | my | plumber?", "Norite, kad | aš | atsiųsčiau | savo | santechniką?", "Norite, kad atsiųsčiau savo santechniką?")],
    gr_offer_a: [
      t("Today... | hmm. | My | plumber, | Joe, | is | booked solid.", "Šiandien... | hmm. | Mano | santechnikas, | Džo, | yra | visiškai užimtas.",
        "Šiandien... hmm. Mano santechnikas Džo visiškai užimtas."),
    ],
    gr_offer_b: [
      t("Could | it | wait | till | tomorrow | morning?", "Ar galėtų | tai | palaukti | iki | rytojaus | ryto?", "Ar galėtų palaukti iki rytojaus ryto?"),
    ],
    gr_sure: [
      t("Are | you | sure? | That | sounds | like | a lot of | water.", "Ar | jūs | {m:tikras|f:tikra}? | Tai | skamba | kaip | daug | vandens.", "Ar jūs {m:tikras|f:tikra}? Panašu, kad vandens daug.",
        { flags: { 0: "“Are” in a yes/no question = ar; Lithuanian needs no copula here." } }),
    ],
    gr_sure_down: [
      t("Are | you | sure? | Mr. Okoye | won't like | that.", "Ar | jūs | {m:tikras|f:tikra}? | Ponui Okoye | nepatiks | tai.", "Ar jūs {m:tikras|f:tikra}? Ponui Okoye tai nepatiks.",
        { flags: { 0: "“Are” in a yes/no question = ar; Lithuanian needs no copula here." } }),
    ],
    gr_ten_a: [
      t("Oh | no, | you're | right. | So | sorry!", "O | ne, | jūs | {m:teisus|f:teisi}. | Labai | atsiprašau!", "O ne, jūs {m:teisus|f:teisi}. Labai atsiprašau!", { flags: { 2: F_YOURE } }),
      t("Oh | no!! | So | sorry!!", "O | ne!! | Labai | atsiprašau!!", "O ne!! Labai atsiprašau!!"),
    ],
    gr_ten_b: [
      t("Gonna be | there | in ten!", "Būsiu | ten | po dešimties minučių!", "Būsiu ten po dešimties minučių!", { flags: { 2: F_TEN } }),
      t("I'm on my way. | Ten | minutes, | tops.", "Jau važiuoju. | Dešimt | minučių, | daugiausia.", "Jau važiuoju. Daugiausia dešimt minučių."),
    ],
    gr_joe: [
      t("I'll get | Joe | to squeeze | you | in | today, | I | promise.", "Įkalbėsiu | Džo | įsprausti | jus | — | šiandien, | aš | pažadu.", "Įkalbėsiu Džo jus įsprausti šiandien, pažadu.",
        { flags: { 4: "“in”: the particle of “squeeze … in”, carried by įsprausti (under “to squeeze”)." } }),
    ],
    gr_texting: [t("Hang on, | I'm texting | Joe... | Okay!", "Palaukite, | rašau | Džo... | Gerai!", "Palaukite, rašau Džo žinutę... Gerai!")],
    gr_already_today: [t("Nah, | it's | today. | Already | decided.", "Ne, | tai | šiandien. | Jau | nuspręsta.", "Ne, šiandien. Jau nuspręsta.", { flags: { 1: F_ITS } })],
    gr_no_risk: [t("Hmm. | Better safe than sorry.", "Hmm. | Atsargumas nepakenks.", "Hmm. Geriau nerizikuoti.")],
    gr_tomorrow_final: [
      t("Okay! | Joe | will be | there | tomorrow | at nine.", "Gerai! | Džo | bus | ten | rytoj | devintą.", "Gerai! Džo bus pas jus rytoj devintą."),
    ],
    gr_time_q: [
      t("Joe | can | be | there | at | eleven | or | at | one. | What | works | better | for you?",
        "Džo | gali | būti | ten | — | vienuoliktą | arba | — | pirmą. | Kas | tinka | labiau | jums?",
        "Džo gali atvykti vienuoliktą arba pirmą dienos. Kada jums patogiau?", { flags: { 4: F_AT_CLOCK, 7: F_AT_CLOCK } }),
    ],
    gr_time_11: [t("Okay, | eleven. | I'll tell | Joe.", "Gerai, | vienuoliktą. | Pasakysiu | Džo.", "Gerai, vienuoliktą. Pasakysiu Džo.")],
    gr_time_1: [t("Okay, | one | o'clock. | I'll tell | Joe.", "Gerai, | pirmą | valandą. | Pasakysiu | Džo.", "Gerai, pirmą valandą. Pasakysiu Džo.")],
    gr_time_only: [
      t("Joe | can | only | do | eleven | or | one, | I'm afraid.", "Džo | gali | tik | — | vienuoliktą | arba | pirmą, | deja.", "Deja, Džo gali tik vienuoliktą arba pirmą.",
        { flags: { 3: "“do” (a time) = atvykti; the accusative of the hour carries it." } }),
    ],
    gr_first_today: [t("Let's | sort out | the | day | first.", "— | Išsiaiškinkime | — | dieną | pirmiausia.", "Pirmiausia išsiaiškinkime dieną.",
      { flags: { 0: "“Let's”: the first person plural imperative išsiaiškinkime carries it." } })],
    gr_estimate: [
      t("Ha! | Good | question. | With | Joe, | 'eleven' | means | eleven-thirty.", "Cha! | Geras | klausimas. | Pas | Džo, | „vienuolikta“ | reiškia | pusę dvylikos.",
        "Cha! Geras klausimas. Pas Džo „vienuolikta“ reiškia pusę dvylikos."),
    ],
    gr_text_you: [t("I'll text | you | when | he's | on his way.", "Parašysiu | jums, | kai | jis bus | pakeliui.", "Parašysiu jums, kai jis bus pakeliui.",
      { flags: { 3: "“he's” = jis bus: after kai Lithuanian uses the future." } })],
    gr_eta: [t("Ten | minutes, | tops.", "Dešimt | minučių, | daugiausia.", "Daugiausia dešimt minučių.")],
    gr_damage: [
      t("Don't worry | about | that. | It's | my | machine, | so | it's | on me.", "Nesijaudinkite | dėl | to. | Tai | mano | mašina, | tad | tai | mano sąskaita.",
        "Nesijaudinkite dėl to. Tai mano mašina, tad viskas mano sąskaita.", { flags: { 3: F_ITS, 7: F_ITS } }),
    ],
    gr_anything: [t("Alright! | Anything | else?", "Gerai! | Kas nors | dar?", "Gerai! Dar kas nors?")],
    gr_prompt: [
      t("'Prompt | assistance'! | Ha! | You | sound | like | me | in an email.", "„Operatyvią | pagalbą“! | Cha! | Jūs | kalbate | kaip | aš | laiške.",
        "„Operatyvią pagalbą“! Cha! Kalbate kaip aš laiškuose."),
    ],
    gr_inconvenience: [
      t("Inconvenience? | Nah, | it's | my | washer. | My bad!", "Nepatogumų? | Nieko panašaus, | tai | mano | skalbyklė. | Mano kaltė!",
        "Kokių nepatogumų? Tai mano skalbyklė – mano kaltė!", { flags: { 2: F_ITS } }),
    ],
    gr_regards: [t("Ha! | Kind regards | to you | too!", "Cha! | Pagarbiai | jums | taip pat!", "Cha! Ir jums pagarbiai!")],
    gr_welcome: [t("Hey, | no | problem!", "Ei, | jokių | problemų!", "Nėra už ką!"), t("Anytime!", "Visada prašom!", "Visada prašom!")],
    gr_love_you: [t("Uh... | love | you | too?", "Ee... | myliu | jus | irgi?", "Ee... aš jus irgi... myliu?")],
    gr_rude: [t("Whoa, | okay, | okay! | I'm on it.", "Oho, | gerai, | gerai! | Jau tvarkau.", "Oho, gerai, gerai! Jau imuosi.")],
    gr_laugh: [t("Ha! | Who's | that? | Kind regards | to her | too!", "Cha! | Kas | ten? | Pagarbiai | jai | taip pat!", "Cha! Kas ten? Ir jai pagarbiai!", { flags: { 1: "“'s” (is): Lithuanian needs no copula here." } })],
    gr_bye: [
      t("See you | in ten! | Bye now!", "Iki | po dešimties minučių! | Viso gero!", "Pasimatysime po dešimties minučių! Viso gero!", { flags: { 1: F_TEN } }),
      t("Hang in there. | See you | soon!", "Laikykitės. | Iki | greito!", "Laikykitės! Iki greito!"),
    ],
    gr_bye_tomorrow: [t("See you | tomorrow! | Bye now!", "Iki | rytojaus! | Viso gero!", "Iki rytojaus! Viso gero!")],
    gr_wait_stay: [t("Wait, | wait! | What | do | you | need?", "Palaukite, | palaukite! | Ko | — | jums | reikia?", "Palaukite, palaukite! Ko jums reikia?", { flags: { 3: F_WH_DO, 4: F_DAT_REIKIA } })],
    gr_bye_walk: [t("Oh. | Okay. | Bye, | then!", "O. | Gerai. | Iki, | tada!", "O. Na gerai, iki!")],
    gr_see_you: [t("Okay! | See you | in ten!", "Gerai! | Iki | po dešimties minučių!", "Gerai! Pasimatysime po dešimties minučių!", { flags: { 2: F_TEN } })],

    // --- the voicemail and the callback ---------------------------------------------------------------
    vm_greet: [
      t("Hi, | you've | reached | Grant. | I'm | probably | under | somebody's | sink. | Leave | a | message!",
        "Sveiki, | jūs | paskambinote | Grantui. | Aš esu | tikriausiai | po | kažkieno | kriaukle. | Palikite | — | žinutę!",
        "Sveiki, jūs paskambinote Grantui. Tikriausiai dabar esu po kažkieno kriaukle. Palikite žinutę!", { flags: { 1: F_VE } }),
    ],
    gr_callback: [
      t("Hey, | it's | Grant! | Got | your | message.", "Sveiki, | čia | Grantas! | Gavau | jūsų | žinutę.", "Sveiki, čia Grantas! Gavau jūsų žinutę.",
        { flags: { 1: "“it's” on the phone = čia." } }),
    ],
    gr_callback_formal: [
      t("'I | regret | to inform | you'? | Ha! | That's | my | line!", "„Aš | apgailestauju, | {m:turėdamas|f:turėdama} pranešti | jums“? | Cha! | Tai yra | mano | frazė!",
        "„{m:Apgailestaudamas|f:Apgailestaudama} turiu pranešti“? Cha! Tai mano frazė!"),
    ],
    gr_callback_casual: [t("Short | and | sweet, | I | like | it.", "Trumpai | ir | aiškiai, | man | patinka | tai.", "Trumpai ir aiškiai – man patinka.")],
  },

  domains: {},

  hints: {
    // --- Lizzie (casual, tu) ---
    news: {
      lt: "Laisvai atšaukti brunčą ir papasakoti, kas nutiko",
      items: [
        { id: "cant_make", s: t("Hey, | can't make | brunch, | so | sorry!", "Labas, | negalėsiu ateiti į | brunčą, | labai | atsiprašau!", "Labas, negalėsiu ateiti į brunčą, labai atsiprašau!"),
          register: "casual", note: "Draugams žinutėse ir telefonu „I“ dažnai praleidžiamas." },
        { id: "washer_exploded", s: t("My | washer | kinda | exploded.", "Mano | skalbyklė | kaip ir | sprogo.", "Mano skalbyklė kaip ir sprogo."), register: "casual",
          note: "„Kinda“ = „kind of“ – „kaip ir, tarsi“. Laisvoje kalboje." },
        { id: "water_everywhere", s: t("There's | water | everywhere.", "Yra | vandens | visur.", "Visur vanduo.", { flags: { 0: F_EXIST } }), register: "casual" },
        { id: "river", s: t("There's | a | river | on the floor.", "Yra | — | upė | ant grindų.", "Ant grindų – tikra upė.", { flags: { 0: F_EXIST } }), register: "casual" },
        { id: "gonna_while", s: t("Gonna be | a | while.", "Užtruks | — | kurį laiką.", "Tai užtruks."), register: "casual",
          note: "„(It's) gonna be a while“ – „tai užtruks“. Subjektas praleistas, kaip žinutėje." },
        { id: "cat_fridge", s: t("The | cat's | on the fridge.", "— | Katė yra | ant šaldytuvo.", "Katė užsilipo ant šaldytuvo."), register: "casual" },
        { id: "rain_check", s: t("Can | I | take a rain check?", "Ar galiu | aš | atidėti kitam kartui?", "Gal galim atidėti kitam kartui?"), register: "casual",
          note: "„Rain check“ – mandagiai atidėti kvietimą kitam kartui." },
      ],
    },
    okay: {
      lt: "Atsakyti, kaip laikaisi",
      items: [
        { id: "just_socks", s: t("I'm | fine. | Just | my | socks.", "Man | viskas gerai. | Tik | mano | kojinės.", "Man viskas gerai. Nukentėjo tik kojinės.",
          { flags: { 0: "“I'm” = man: with viskas gerai Lithuanian uses the dative and no copula." } }), register: "casual" },
        { id: "freaking", s: t("I'm freaking out | a | little.", "Panikuoju | — | truputį.", "Truputį panikuoju."), register: "casual" },
        { id: "nobody_hurt", s: t("Nobody's | hurt.", "Niekas | nenukentėjo.", "Niekas nenukentėjo.", { flags: { 1: F_CONCORD } }) },
      ],
    },
    need: {
      lt: "Paprašyti pagalbos arba atsisakyti",
      slot: "stuff",
      examples: ["mop", "towels", "coffee", "bucket"],
      items: [
        { id: "bring_x", s: t("Can | you | bring | {X.np}?", "Ar gali | tu | atnešti | {X.np:acc}?", "Gal gali atnešti {X.np:acc}?"), register: "casual",
          only: (e) => e.id !== "boat" },
        { id: "grab_x", s: t("Could | you | grab | {X.np} | on the way?", "Ar galėtum | tu | pagriebti | {X.np:acc} | pakeliui?", "Gal galėtum pakeliui pagriebti {X.np:acc}?"),
          only: (e) => e.id !== "boat" },
        { id: "lots_coffee", s: t("And | coffee? | Lots of | coffee.", "Ir | kavos? | Daug | kavos.", "Ir kavos? Daug kavos."), register: "casual" },
        { id: "come_over", s: t("Could | you | come over?", "Ar galėtum | tu | užsukti?", "Gal galėtum užsukti?") },
        { id: "no_im_good", s: t("No, | I'm | good, | thanks.", "Ne, | man | nieko nereikia, | ačiū.", "Ne, man nieko nereikia, ačiū."), note: "„I'm good“ – mandagus atsisakymas („man nieko nereikia“)." },
        { id: "dont_worry", s: t("Don't worry | about | it. | Enjoy | your | brunch!", "Nesijaudink | dėl | to. | Mėgaukis | savo | brunču!", "Nesijaudink. Mėgaukis brunču!"), register: "casual" },
        { id: "send_boat", s: t("Send | towels. | Send | a | boat!", "Siųsk | rankšluosčius. | Siųsk | — | valtį!", "Siųsk rankšluosčius. Siųsk valtį!"), register: "casual",
          note: "Juokais, kaip dainoje." },
      ],
    },
    bye_l: {
      lt: "Atsisveikinti draugiškai",
      items: [
        { id: "love_you", s: t("Love | you, | thanks!", "Myliu | tave, | ačiū!", "Myliu tave, ačiū!"), register: "casual",
          note: "Amerikoje draugai taip atsisveikina dažnai – be jokios romantikos." },
        { id: "see_bit", s: t("See you in a bit!", "Iki greito!", "Iki greito!"), register: "casual" },
        { id: "youre_best", s: t("You're | the | best!", "Tu esi | — | {sm:geriausias|sf:geriausia}!", "Tu {sm:geriausias|sf:geriausia}!"), register: "casual" },
        { id: "talk_later", s: t("Talk | to you | later!", "Pakalbėsim | su tavim | vėliau!", "Pasikalbėsim vėliau!"), register: "casual" },
        { id: "owe_you", s: t("I owe you one!", "Aš tau {m:skolingas|f:skolinga}!", "Aš tau {m:skolingas|f:skolinga}!"), register: "casual" },
      ],
    },
    door: {
      lt: "Padėkoti draugei laisvai",
      items: [
        { id: "lifesaver", s: t("You're | a | lifesaver!", "Tu esi | — | {sm:gelbėtojas|sf:gelbėtoja}!", "Tu mane išgelbėjai!"), register: "casual" },
        { id: "didnt_have", s: t("You | didn't have | to!", "Tu | neprivalėjai | —!", "Neprivalėjai!", { flags: { 2: "“to” stands for the verb left out (to do it); neprivalėjai carries it." } }), register: "casual" },
        { id: "come_in", s: t("Come in, | come in!", "Užeik, | užeik!", "Užeik, užeik!"), register: "casual" },
        { id: "owe_you", s: t("I owe you one!", "Aš tau {m:skolingas|f:skolinga}!", "Aš tau {m:skolingas|f:skolinga}!"), register: "casual" },
      ],
    },
    // --- Mr. Grant (formal, jūs) ---
    who: {
      lt: "Pasakyti, kas skambina (vardas ir butas)",
      items: [
        { id: "this_is_apt", s: t("Good | morning, | Mr. Grant. | This is | {$name} | {$surname} | from | apartment | 3B.", "Labas | rytas, | pone Grantai. | Čia | {$name} | {$surname} | iš | buto | 3B.",
          "Labas rytas, pone Grantai. Čia {$name} {$surname} iš 3B buto.", { say: "Good morning, Mister Grant. This is {$name} {$surname} from apartment three B." }), register: "polite" },
        { id: "tenant_in", s: t("I'm | your | tenant | in | 3B.", "Aš esu | jūsų | {m:nuomininkas|f:nuomininkė} | iš | 3B.", "Esu jūsų {m:nuomininkas|f:nuomininkė} iš 3B buto.",
          { say: "I'm your tenant in three B.", flags: { 3: "“in” (an apartment) = iš: Lithuanian says where the tenant is from." } }), register: "polite" },
        { id: "calling_from", s: t("I'm calling | from | apartment | 3B.", "Skambinu | iš | buto | 3B.", "Skambinu iš 3B buto.", { say: "I'm calling from apartment three B." }), register: "polite" },
      ],
    },
    report: {
      lt: "Oficialiai paaiškinti, kas nutiko",
      items: [
        { id: "regret", s: t("I | regret | to inform | you | that | the | kitchen | is | flooded.", "Aš | apgailestauju, | {m:turėdamas|f:turėdama} pranešti | jums, | kad | — | virtuvė | yra | užlieta.",
          "{m:Apgailestaudamas|f:Apgailestaudama} turiu jums pranešti, kad virtuvė užlieta."), register: "polite", note: "Labai oficialu – kaip laiške. Dainoje taip rašoma nuomotojui." },
        { id: "report_leak", s: t("I'm calling | to report | a | leak.", "Skambinu | pranešti apie | — | nuotėkį.", "Skambinu pranešti apie vandens nuotėkį."), register: "polite" },
        { id: "afraid_flooded", s: t("I'm afraid | the | washing machine | has | flooded | the | kitchen.", "Deja, | — | skalbimo mašina | — | užliejo | — | virtuvę.",
          "Deja, skalbimo mašina užliejo virtuvę.", { flags: { 3: F_HAS_PAST } }), register: "polite" },
        { id: "this_morning", s: t("It | happened | this morning, | at | about | seven.", "Tai | nutiko | šįryt, | — | apie | septintą.", "Tai nutiko šįryt, apie septintą.",
          { flags: { 3: "Clock “at”: apie + the accusative septintą carries it." } }), register: "polite" },
        { id: "water_off", s: t("I've | turned off | the | water.", "Aš | užsukau | — | vandenį.", "Vandenį jau užsukau.", { flags: { 0: F_VE } }), register: "polite" },
        { id: "towels", s: t("I've | put down | towels.", "Aš | patiesiau | rankšluosčius.", "Patiesiau rankšluosčius.", { flags: { 0: F_VE } }) },
      ],
    },
    details: {
      lt: "Atsakyti į nuomotojo klausimus",
      items: [
        { id: "nobody_hurt", s: t("No, | nobody's | hurt.", "Ne, | niekas | nenukentėjo.", "Ne, niekas nenukentėjo.", { flags: { 2: F_CONCORD } }), register: "polite" },
        { id: "downstairs", s: t("I'm afraid | it's reaching | the | apartment | downstairs.", "Deja, | vanduo jau sunkiasi į | — | butą | apačioje.", "Deja, vanduo jau sunkiasi į butą apačioje."), register: "polite" },
        { id: "water_off", s: t("I've | turned off | the | water.", "Aš | užsukau | — | vandenį.", "Vandenį jau užsukau.", { flags: { 0: F_VE } }), register: "polite" },
        { id: "dont_know_valve", s: t("I'm afraid | I | don't know | where | the | valve | is.", "Deja, | aš | nežinau, | kur | — | ventilis | yra.", "Deja, nežinau, kur yra ventilis.") },
        { id: "this_morning", s: t("It | happened | this morning, | at | about | seven.", "Tai | nutiko | šįryt, | — | apie | septintą.", "Tai nutiko šįryt, apie septintą.",
          { flags: { 3: "Clock “at”: apie + the accusative septintą carries it." } }), register: "polite" },
      ],
    },
    request: {
      lt: "Paprašyti, kad santechnikas atvyktų šiandien",
      items: [
        { id: "grateful_today", s: t("I | would | be | grateful | if | a | plumber | could | be sent | today.", "Aš | — | būčiau | {m:dėkingas|f:dėkinga}, | jei | — | santechnikas | galėtų | būti atsiųstas | šiandien.",
          "Būčiau {m:dėkingas|f:dėkinga}, jei šiandien galėtumėte atsiųsti santechniką.", { flags: { 1: F_WOULD } }), register: "polite", note: "Dainos frazė: labai mandagu ir oficialu." },
        { id: "could_send", s: t("Could | you | send | a | plumber | today, | please?", "Ar galėtumėte | jūs | atsiųsti | — | santechniką | šiandien, | prašau?", "Ar galėtumėte šiandien atsiųsti santechniką?"), register: "polite" },
        { id: "any_way", s: t("Is there any way | someone | could | come | today?", "Ar įmanoma, kad | kas nors | galėtų | atvykti | šiandien?", "Ar įmanoma, kad kas nors atvyktų šiandien?"), register: "polite" },
        { id: "earliest", s: t("Could | someone | come | at your earliest convenience?", "Ar galėtų | kas nors | atvykti | kuo greičiau?", "Ar galėtų kas nors atvykti kuo greičiau?"),
          register: "polite", note: "Labai oficialu, dažniau laiškuose. Pokalbyje paprasčiau: „as soon as possible“." },
      ],
    },
    insist: {
      lt: "Mandagiai, bet tvirtai paprašyti šiandien",
      items: [
        { id: "cant_wait", s: t("I'm afraid | it | can't wait | until | tomorrow.", "Deja, | tai | negali laukti | iki | rytojaus.", "Deja, tai negali laukti iki rytojaus."), register: "polite" },
        { id: "downstairs", s: t("I'm afraid | it's reaching | the | apartment | downstairs.", "Deja, | vanduo jau sunkiasi į | — | butą | apačioje.", "Deja, vanduo jau sunkiasi į butą apačioje."), register: "polite" },
        { id: "really_today", s: t("It | really | needs | to be | today.", "Tai | tikrai | turi | būti | šiandien.", "Tai tikrai turi būti šiandien.") },
        { id: "appreciate_today", s: t("I'd | really | appreciate | it | if | someone | could | come | today.", "Būčiau | labai | {m:dėkingas|f:dėkinga}, | — | jei | kas nors | galėtų | atvykti | šiandien.",
          "Būčiau labai {m:dėkingas|f:dėkinga}, jei kas nors galėtų atvykti šiandien.", { flags: { 0: "“I'd” = būčiau: the conditional carries I + would.", 3: "Dummy “it” has no Lithuanian word." } }), register: "polite" },
        { id: "tomorrow_fine", s: t("Tomorrow | morning | is fine.", "Rytoj | ryte | tinka.", "Rytoj ryte tinka."), note: "Jei sutiksi, santechnikas atvyks tik rytoj." },
      ],
    },
    time: {
      lt: "Susitarti dėl santechniko laiko",
      items: [
        { id: "time_perfect", s: t("Eleven | would | be | perfect.", "Vienuolikta | — | būtų | puiku.", "Vienuolikta būtų puiku.", { flags: { 1: F_WOULD } }), register: "polite" },
        { id: "could_he", s: t("Could | he | come | at eleven?", "Ar galėtų | jis | atvykti | vienuoliktą?", "Ar jis galėtų atvykti vienuoliktą?"), register: "polite" },
        { id: "confirmed", s: t("Is | that | a | confirmed | time | or | an | estimate?", "Ar | tai | — | patvirtintas | laikas | ar | — | apytikris?", "Ar tai patvirtintas laikas, ar tik apytikris?",
          { flags: { 0: "“Is” in a yes/no question = the particle ar.", 7: "“estimate” = apytikris (laikas)." } }), register: "polite", note: "Iš istorijos ADV-024: tikslus laikas ir apytikris – ne tas pats." },
        { id: "let_know", s: t("Could | you | let | me | know | when | he's | on his way?", "Ar galėtumėte | jūs | — | man | pranešti, | kai | jis bus | pakeliui?",
          "Ar galėtumėte man pranešti, kai jis bus pakeliui?", { flags: { 2: "“let … know” = pranešti (under “know”).", 6: "“he's” = jis bus: after kai Lithuanian uses the future." } }), register: "polite" },
        { id: "advise", s: t("Please | advise | when | the | plumber | will arrive.", "Prašau | praneškite, | kada | — | santechnikas | atvyks.", "Prašau pranešti, kada atvyks santechnikas."),
          register: "polite", note: "Labai oficialu – kaip laiške." },
      ],
    },
    thanks_g: {
      lt: "Mandagiai padėkoti ir atsisveikinti",
      items: [
        { id: "prompt", s: t("Thank | you | for | your | prompt | assistance.", "Dėkoju | jums | už | jūsų | operatyvią | pagalbą.", "Dėkoju už operatyvią pagalbą."), register: "polite", note: "Dainos frazė – oficiali padėka." },
        { id: "apologize", s: t("I | apologize | for | any | inconvenience.", "Aš | atsiprašau | už | bet kokius | nepatogumus.", "Atsiprašau už galimus nepatogumus."), register: "polite" },
        { id: "appreciate_it", s: t("Thank | you, | I | really | appreciate | it.", "Dėkoju | jums, | aš | labai | vertinu | tai.", "Labai jums dėkoju."), register: "polite" },
        { id: "kind_regards", s: t("Kind regards!", "Pagarbiai!", "Pagarbiai!"), note: "Laiško pabaiga. Pokalbyje skamba juokingai oficialiai – kaip dainoje." },
      ],
    },
    voicemail: {
      lt: "Palikti oficialią balso žinutę",
      items: [
        { id: "this_is_apt", s: t("Good | morning, | Mr. Grant. | This is | {$name} | {$surname} | from | apartment | 3B.", "Labas | rytas, | pone Grantai. | Čia | {$name} | {$surname} | iš | buto | 3B.",
          "Labas rytas, pone Grantai. Čia {$name} {$surname} iš 3B buto.", { say: "Good morning, Mister Grant. This is {$name} {$surname} from apartment three B." }), register: "polite" },
        { id: "regret", s: t("I | regret | to inform | you | that | the | kitchen | is | flooded.", "Aš | apgailestauju, | {m:turėdamas|f:turėdama} pranešti | jums, | kad | — | virtuvė | yra | užlieta.",
          "{m:Apgailestaudamas|f:Apgailestaudama} turiu jums pranešti, kad virtuvė užlieta."), register: "polite" },
        { id: "grateful_today", s: t("I | would | be | grateful | if | a | plumber | could | be sent | today.", "Aš | — | būčiau | {m:dėkingas|f:dėkinga}, | jei | — | santechnikas | galėtų | būti atsiųstas | šiandien.",
          "Būčiau {m:dėkingas|f:dėkinga}, jei šiandien galėtumėte atsiųsti santechniką.", { flags: { 1: F_WOULD } }), register: "polite" },
        { id: "vm_call_back", s: t("Please | call | me | back | at your earliest convenience.", "Prašau | perskambinkite | man | — | kai tik jums bus patogu.", "Prašau perskambinti, kai tik galėsite.",
          { flags: { 3: "“back”: the prefix per- of perskambinkite carries it." } }), register: "polite" },
        { id: "look_forward", s: t("I | look forward | to | your | call.", "Aš | lauksiu | — | jūsų | skambučio.", "Lauksiu jūsų skambučio.", { flags: { 2: "“to” has no word: lauksiu takes the genitive." } }), register: "polite" },
        { id: "kind_regards", s: t("Kind regards!", "Pagarbiai!", "Pagarbiai!"), note: "Laiško pabaiga – balso žinutėje skamba juokingai oficialiai (kaip dainoje)." },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "on my way": { reason: "lexical_expression", split: "on → ant, my → mano, way → kelias is a false place; = pakeliui.", minimal: "The three words form the expression." },
    "on his way": { reason: "lexical_expression", split: "on → ant, his → jo, way → kelias is a false place; = pakeliui.", minimal: "The three words form the expression." },
    "i'm on my way": { reason: "lexical_expression", split: "I'm → aš esu + on my way → pakeliui loses the motion; on the phone = jau važiuoju.", minimal: "The phrase is one answer." },
    "what's up": { reason: "lexical_expression", split: "What's → kas yra + up → aukštyn is false; the greeting = kas naujo / kas nutiko.", minimal: "Two words." },
    "going on": { reason: "lexical_expression", split: "going → einantis + on → ant is false; what's going on = kas vyksta.", minimal: "Verb and particle." },
    "washing machine": { reason: "lexical_expression", split: "washing → skalbimo + machine → mašina reads well, but the compound names one appliance = skalbimo mašina.", minimal: "One noun." },
    "no way": { reason: "lexical_expression", split: "no → jokio + way → kelio is false; surprise = negali būti.", minimal: "Two words." },
    "lots of": { reason: "lexical_expression", split: "lots → daugybės + of → — is a calque; = daug.", minimal: "Two words." },
    "be there": { reason: "grammatical_fusion", split: "(I'll) be → būsiu + there → ten: on the phone “Be there in…” drops “I'll”; the future būsiu carries it.", minimal: "Two words." },
    "come over": { reason: "lexical_expression", split: "come → ateiti + over → per is false; = užsukti.", minimal: "Verb and particle (C-PHR)." },
    "right after": { reason: "lexical_expression", split: "right → teisingai + after → po is false; = iškart po.", minimal: "Two words." },
    "mr. grant": { reason: "lexical_expression", split: "Mr. → ponas + Grant → Grantas: the title and the name decline together (ponui Grantui).", minimal: "Title and name." },
    "mr. okoye": { reason: "lexical_expression", split: "Mr. → ponas + Okoye: the title and the name stay together (ponui Okoye).", minimal: "Title and name." },
    "mr. okoye's": { reason: "lexical_expression", split: "Mr. → ponas + Okoye's → Okoye: the possessive is the genitive of the title (pono Okoye).", minimal: "Title and name." },
    "see you in a bit": { reason: "lexical_expression", split: "see → matysiu, you → tave, in → po, a → —, bit → truputis is a calque; = iki greito.", minimal: "The farewell formula." },
    "hang on": { reason: "lexical_expression", split: "hang → kabėti + on → ant is false; = palaukite.", minimal: "Verb and particle." },
    "get there": { reason: "lexical_expression", split: "get → gauti + there → ten is false; arriving = atvyksiu.", minimal: "Verb and adverb." },
    "good luck": { reason: "lexical_expression", split: "good → gera + luck → sėkmė; the wish = sėkmės.", minimal: "Two words." },
    "hang in there": { reason: "lexical_expression", split: "hang → kabėti, in → į, there → ten is false; = laikykitės.", minimal: "The idiom." },
    "kind regards": { reason: "lexical_expression", split: "kind → malonūs + regards → linkėjimai is a calque; the letter's sign-off = pagarbiai.", minimal: "Two words." },
    "who's this": { reason: "lexical_expression", split: "Who's → kas yra + this → tai asks about an object; on the phone = kas skambina.", minimal: "The phone question." },
    "this is": { reason: "lexical_expression", split: "this → tai + is → yra describes an object; on the phone “This is Grant” = čia.", minimal: "Two words; the name stays outside." },
    "talking to": { reason: "grammatical_fusion", split: "talking → kalbu + to → su: the stranded preposition is carried by su kuo (under “Who”).", minimal: "Verb and particle." },
    "i've got": { reason: "lexical_expression", split: "I've → aš turiu + got → gavau is false; have got = turėti.", minimal: "Two words." },
    "oh boy": { reason: "lexical_expression", split: "oh → o + boy → berniukas is false; dismay = oi oi / oho.", minimal: "Two words." },
    "turn off": { reason: "lexical_expression", split: "turn → sukti + off → nuo is false; the water = užsukti (C-PHR).", minimal: "Verb and particle." },
    "turned off": { reason: "lexical_expression", split: "turned → sukau + off → nuo is false; the water = užsukau (C-PHR).", minimal: "Verb and particle." },
    "put down": { reason: "lexical_expression", split: "put → dėti + down → žemyn: towels on the floor = patiesti (C-PHR).", minimal: "Verb and particle." },
    "booked solid": { reason: "lexical_expression", split: "booked → užsakytas + solid → kietas is false; = visiškai užimtas.", minimal: "Two words." },
    "a lot of": { reason: "lexical_expression", split: "a → —, lot → daugybė, of → — is a calque; = daug.", minimal: "The three words form the quantifier." },
    "gonna be": { reason: "grammatical_fusion", split: "gonna (going to) → einu + be → būti is false; the future būsiu / užtruks carries both.", minimal: "Two words." },
    "sort out": { reason: "lexical_expression", split: "sort → rūšiuoti + out → lauk is false; = išsiaiškinti.", minimal: "Verb and particle (C-PHR)." },
    "eleven-thirty": { reason: "lexical_expression", split: "eleven → vienuolika + thirty → trisdešimt reads as a sum; the time = pusė dvylikos.", minimal: "One time expression." },
    "my bad": { reason: "lexical_expression", split: "my → mano + bad → blogas is false; the apology = mano kaltė.", minimal: "Two words." },
    "i'm on it": { reason: "lexical_expression", split: "I'm → aš esu + on → ant + it → tai is false; = jau tvarkau.", minimal: "The reply formula." },
    "bye now": { reason: "lexical_expression", split: "bye → iki + now → dabar is false; the friendly farewell = viso gero.", minimal: "Two words." },
    "i'm afraid": { reason: "lexical_expression", split: "I'm → aš esu + afraid → išsigandęs is false; the polite softener = deja.", minimal: "Two words." },
    "take a rain check": { reason: "lexical_expression", split: "take → paimti, a → —, rain → lietus, check → čekis is false; = atidėti kitam kartui.", minimal: "The idiom." },
    "i owe you one": { reason: "lexical_expression", split: "I → aš, owe → skolingas, you → tau, one → vieną: “one” (a favor) has no Lithuanian word; = aš tau skolingas.", minimal: "The idiom." },
    "come in": { reason: "lexical_expression", split: "come → ateik + in → į is false; at the door = užeik.", minimal: "Verb and particle." },
    "i'm freaking out": { reason: "lexical_expression", split: "I'm → aš esu, freaking → ?, out → lauk is false; = panikuoju.", minimal: "The idiom." },
    "is there any way": { reason: "lexical_expression", split: "is → yra, there → —, any → koks nors, way → būdas is a calque; the polite request = ar įmanoma, kad.", minimal: "The four words form the request formula." },
    "at your earliest convenience": { reason: "lexical_expression", split: "at → —, your → jūsų, earliest → anksčiausias, convenience → patogumas is a calque; = kuo greičiau / kai tik jums bus patogu.", minimal: "The formula." },
    "be sent": { reason: "grammatical_fusion", split: "be → būti + sent → siųstas: the passive is one Lithuanian unit (būti atsiųstas).", minimal: "Two words." },
    "look forward": { reason: "lexical_expression", split: "look → žiūrėti + forward → pirmyn is false; = laukti (lauksiu).", minimal: "Verb and particle." },
    "will arrive": { reason: "grammatical_fusion", split: "“will” has no separate word: the future atvyks carries it.", minimal: "Two words." },
    "that's what friends are for": { reason: "lexical_expression", split: "that's → tai yra, what → ką, friends → draugai, are → yra, for → dėl is a calque; = tam ir yra draugai.", minimal: "The saying." },
    "better safe than sorry": { reason: "lexical_expression", split: "better → geriau, safe → saugus, than → negu, sorry → apgailestaujantis is a calque; = atsargumas nepakenks.", minimal: "The saying." },
    "this morning": { reason: "lexical_expression", split: "this → šis + morning → rytas; the time adverb = šįryt.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // a bonus: shown during Lizzie's call (and when done)
    { lt: "Atšauk susitikimą su drauge ir paaiškink kodėl", optional: true, done: (c) => !!c.s.cancelled && !!c.s.explained, when: (c) => !c.s.lizzieOver },
    { lt: "Paprašyk draugės pagalbos arba atsisakyk jos laisvai", done: (c) => !!c.s.helpAnswered },
    { lt: "Oficialiai paaiškink nuomotojui, kas nutiko", done: explainedToGrant },
    { lt: "Paprašyk, kad santechnikas atvyktų šiandien", done: (c) => !!c.s.today },
    { lt: "Susitark dėl laiko ir mandagiai padėkok", done: (c) => !!c.s.timeSet && !!c.s.thanked },
  ],

  steps: [
    // --- Lizzie ---
    { id: "l_news", when: inLizzie, done: (c) => !!c.s.explained,
      ask: (c) => {
        const n = bump(c, "l_news");
        if (n >= 3) { L(c, "l_guess"); return; }
        L(c, c.s.cancelled && n === 1 ? "l_what" : "l_what_again");
      },
      expects: ["cancel_brunch", "flood", "cat_fridge", "freaking_out"],
      suggest: [{ lt: "Atšaukti brunčą ir papasakoti, kas nutiko", hint: "news" }],
      yes: (c) => { if ((c.s.asks?.l_news ?? 0) >= 3) explain(c); },
      no: () => { /* she asks again */ },
      help: (c) => { L(c, "l_guess"); c.s.asks ||= {}; c.s.asks.l_news = 3; } },
    { id: "l_okay", when: (c) => inLizzie(c) && !!c.s.explained && !!c.s.askOkay, done: (c) => !!c.s.okayDone || asked(c, "l_okay"),
      ask: (c) => { bump(c, "l_okay"); L(c, "l_are_you_ok"); },
      expects: ["nobody_hurt", "freaking_out"],
      suggest: [{ lt: "Atsakyti, kaip laikaisi", hint: "okay" }],
      yes: (c) => { c.s.okayDone = true; L(c, "l_glad_ok"); },
      no: (c) => { c.s.okayDone = true; L(c, "l_breathe"); } },
    { id: "l_brunch", when: (c) => inLizzie(c) && !!c.s.explained && !c.s.cancelled, done: (c) => !!c.s.cancelled || asked(c, "l_brunch"),
      ask: (c) => { bump(c, "l_brunch"); L(c, "l_brunch_q"); },
      expects: ["cancel_brunch"],
      suggest: [{ lt: "Pasakyti, kad į brunčą neateisi", hint: "news" }],
      yes: (c) => { c.s.cancelled = true; L(c, "l_brunch_ok"); },
      no: (c) => { c.s.cancelled = true; L(c, "l_brunch_ok"); } },
    { id: "l_need", when: (c) => inLizzie(c) && !!c.s.explained, done: (c) => !!c.s.helpAnswered,
      ask: (c) => { bump(c, "l_need"); L(c, "l_need_q"); },
      expects: ["ask_help", "item_ctx", "need_nothing", "not_item", "come_no"],
      suggest: [{ lt: "Paprašyti atnešti ko nors", hint: "need", options: CHIPS }, { lt: "Atsisakyti pagalbos", hint: "need" }],
      yes: (c) => { L(c, "l_need_q"); c.hold(); },
      no: (c) => { needNothing(c); },
      help: (c) => { c.s.items = ["mop", "coffee"]; c.s.helpAnswered = true; if (c.s.twist !== "door") sayItems(c); } },
    // twist: she's already outside the door
    { id: "l_door", when: (c) => inLizzie(c) && c.s.twist === "door" && !!c.s.helpAnswered, done: (c) => !!c.s.doorDone,
      ask: (c) => {
        const n = bump(c, "l_door");
        if (n === 1) {
          c.twist("door");
          c.s.twistSeen = true;
          L(c, "l_door1");
          c.event("knock");
          L(c, "l_door2");
          L(c, c.s.declined ? "l_door_anyway" : "l_door3");
          c.s.items = ["mop", "coffee"];
          return;
        }
        doorThanks(c);
      },
      expects: ["warm", "door_surprise", "see_you", "formal_thanks", "g_thanks", "g_bye"],
      suggest: [{ lt: "Laisvai padėkoti draugei", hint: "door" }],
      yes: (c) => { doorThanks(c); }, no: (c) => { doorThanks(c); } },
    // after "No, I'm good": "You sure? I can come over after brunch."
    { id: "l_come", when: (c) => inLizzie(c) && !!c.s.helpAnswered && !!c.s.declined && c.s.twist !== "door", done: (c) => !!c.s.comeDone || asked(c, "l_come"),
      ask: (c) => { bump(c, "l_come"); L(c, "l_sure"); },
      expects: ["need_nothing", "come_no", "ask_help", "item_ctx", "sure_ctx"],
      suggest: [{ lt: "Sutikti arba vėl laisvai atsisakyti", hint: "need" }],
      // "Yes, I'm sure." / "Sure." answers her "You sure?": she stays at brunch (so does a "No, no, it's fine")
      yes: (c) => { sureNotComing(c); },
      no: (c) => { sureNotComing(c); } },
    { id: "l_bye", when: (c) => inLizzie(c) && !!c.s.helpAnswered && (c.s.twist === "door" ? !!c.s.doorDone : (!c.s.declined || !!c.s.comeDone || asked(c, "l_come"))),
      done: (c) => !!c.s.byeL,
      ask: (c) => { if (bump(c, "l_bye") > 1) { byeLizzie(c, "bye"); return; } L(c, "l_bye_q"); },
      expects: ["warm", "see_you", "formal_thanks", "kind_regards", "g_bye", "g_thanks"],
      suggest: [{ lt: "Atsisveikinti draugiškai", hint: "bye_l" }],
      yes: (c) => { byeLizzie(c, "bye"); }, no: (c) => { byeLizzie(c, "bye"); } },

    // --- the voicemail (the recording asks nothing: each step is silent) ---
    // one step for the whole message: the suggestions list what it still lacks
    { id: "vm_msg", when: inVm, done: (c) => !!c.s.vmEnded,
      ask: (c) => {
        if (bump(c, "vm_msg") === 1) { G(c, "vm_greet"); c.event("beep"); }
        vmSilent(c);
      },
      expects: ["vm_unknown", "intro", "vm_who_ctx", "flood", "when_happened", "water_off", "downstairs_yes", "nobody_hurt", "ask_plumber", "today_ctx", "insist_today",
        "vm_close", "kind_regards", "formal_thanks", "apologize"],
      suggest: (c) => [
        ...(!c.s.who ? [{ lt: "Pasisveikinti ir pasakyti, kas skambina", hint: "voicemail" }] : []),
        ...(!c.s.gFlood ? [{ lt: "Oficialiai paaiškinti, kas nutiko", hint: "voicemail" }] : []),
        ...(!c.s.requested ? [{ lt: "Paprašyti, kad santechnikas atvyktų šiandien", hint: "voicemail" }] : []),
        { lt: "Užbaigti žinutę (paprašyti perskambinti, pagarbiai)", hint: "voicemail" },
      ],
      yes: (c) => { vmSilent(c); }, no: (c) => { vmSilent(c); } },

    // --- Mr. Grant ---
    { id: "g_who", when: inGrant, done: (c) => !!c.s.who,
      ask: (c) => {
        const n = bump(c, "g_who");
        if (n === 1) { G(c, c.s.calledBack ? "gr_who_btw" : "gr_pickup"); return; }
        if (n >= 3) { c.s.who = true; G(c, "gr_guess_who"); G(c, "gr_what_again"); return; }
        G(c, "gr_who_again");
      },
      expects: ["intro", "intro_ctx", "its_me", "its_me_ctx"],
      suggest: [{ lt: "Pasakyti, kas skambina (vardas ir butas)", hint: "who" }],
      yes: () => { /* he asks again */ }, no: () => { /* the same */ } },
    { id: "g_what", when: (c) => inGrant(c) && !!c.s.who, done: (c) => !!c.s.gFlood,
      ask: (c) => {
        const n = bump(c, "g_what");
        if (n === 1) { G(c, c.s.calledBack ? "gr_what_again" : "gr_what_q"); return; }
        if (n === 2) { G(c, "gr_what_again"); return; }
        if (n >= 4) { c.s.gFlood = true; c.s.guessed = true; G(c, "gr_ok"); return; } // he goes on; mission item 3 stays open
        G(c, "gr_guess_washer");
      },
      expects: ["flood", "when_happened", "water_off", "downstairs_yes", "ask_plumber"],
      suggest: [{ lt: "Oficialiai paaiškinti, kas nutiko", hint: "report" }],
      // "Yes." to his guess: he knows now, but the learner hasn't explained it (mission item 3 stays open)
      yes: (c) => { if ((c.s.asks?.g_what ?? 0) >= 3) { c.s.guessed = true; grantFlood(c); } },
      no: () => { /* he asks again */ },
      help: (c) => { G(c, "gr_guess_washer"); c.s.asks ||= {}; c.s.asks.g_what = 3; } },
    { id: "g_since", when: (c) => inGrant(c) && grantKnows(c) && !!c.s.askSince, done: sinceOk,
      ask: (c) => { bump(c, "g_since"); G(c, "gr_since_q"); },
      expects: ["when_happened", "when_ctx", "unsure_ctx"],
      suggest: [{ lt: "Pasakyti, kada tai prasidėjo", hint: "details" }],
      yes: (c) => { c.s.sinceDone = true; }, no: (c) => { c.s.sinceDone = true; },
      help: (c) => { c.s.sinceDone = true; G(c, "gr_ok"); } },
    { id: "g_hurt", when: (c) => inGrant(c) && grantKnows(c), done: hurtOk,
      ask: (c) => { bump(c, "g_hurt"); G(c, "gr_hurt_q"); },
      expects: ["nobody_hurt", "freaking_out"],
      suggest: [{ lt: "Atsakyti, ar kas nukentėjo", hint: "details" }],
      // "Yes" (somebody hurt?) – he worries and waits for "Yes, I am." / "I'm fine, just wet."
      yes: (c) => { hurtYes(c); },
      no: (c) => { c.s.hurtDone = true; G(c, "gr_relief"); } },
    { id: "g_down", when: (c) => inGrant(c) && grantKnows(c), done: downOk,
      ask: (c) => { bump(c, "g_down"); G(c, "gr_down_q"); },
      expects: ["downstairs_yes", "downstairs_no", "down_yes_ctx", "down_no_ctx", "unsure_ctx"],
      suggest: [{ lt: "Atsakyti, ar vanduo pasiekė butą apačioje", hint: "details" }],
      yes: (c) => { downstairs(c, true); }, no: (c) => { downstairs(c, false); },
      help: (c) => { c.s.downDone = true; G(c, "gr_down_unknown"); } },
    { id: "g_water", when: (c) => inGrant(c) && grantKnows(c), done: waterOk,
      ask: (c) => { bump(c, "g_water"); G(c, "gr_water_q"); },
      expects: ["water_off", "water_not_off"],
      suggest: [{ lt: "Pasakyti, ką jau padarei", hint: "details" }],
      yes: (c) => { waterOff(c); }, no: (c) => { waterNotOff(c); },
      help: (c) => { waterNotOff(c); } },
    { id: "g_request", when: (c) => inGrant(c) && grantKnows(c) && detailsDone(c), done: (c) => !!c.s.requested,
      ask: (c) => {
        const n = bump(c, "g_request");
        if (n >= 3) { G(c, "gr_send_q"); return; }
        G(c, "gr_req_q");
      },
      expects: ["ask_plumber", "plumber_ctx", "today_ctx", "insist_today", "demand_rude"],
      suggest: [{ lt: "Paprašyti, kad santechnikas atvyktų šiandien", hint: "request" }],
      yes: (c) => { if ((c.s.asks?.g_request ?? 0) >= 3) c.s.requested = true; },
      no: () => { /* he asks again */ },
      help: (c) => { G(c, "gr_send_q"); c.s.asks ||= {}; c.s.asks.g_request = 3; } },
    // he offers tomorrow first (unless the learner already insisted on today)
    { id: "g_offer", when: (c) => inGrant(c) && !!c.s.requested && grantKnows(c) && detailsDone(c), done: (c) => !!c.s.today || !!c.s.tomorrow || !!c.s.sureQ,
      ask: (c) => {
        if (c.s.insisted) { todayNow(c); return; }
        const n = bump(c, "g_offer");
        if (n === 1) { c.s.offered = true; G(c, "gr_offer_a"); G(c, "gr_offer_b"); return; }
        // asked twice with no answer: he doesn't risk it (the time question follows)
        if (n >= 3) { dontKnowToday(c); return; }
        G(c, "gr_offer_b");
      },
      expects: ["insist_today", "insist_ctx", "wait_no_ctx", "wait_yes_ctx", "accept_tomorrow", "ask_plumber", "today_ctx", "downstairs_yes"],
      suggest: [{ lt: "Mandagiai, bet tvirtai paprašyti šiandien", hint: "insist" }, { lt: "Sutikti su rytdiena", hint: "insist" }],
      yes: (c) => { acceptTomorrow(c); },
      no: (c) => { todayNow(c); },
      help: (c) => { dontKnowToday(c); } },
    { id: "g_time", when: (c) => inGrant(c) && !!c.s.today, done: (c) => !!c.s.timeSet,
      ask: (c) => {
        const n = bump(c, "g_time");
        if (n >= 4) { c.s.timeSet = "eleven"; G(c, "gr_time_11"); return; }
        if (n === 1) G(c, "gr_texting");
        G(c, "gr_time_q");
      },
      expects: ["pick_time", "time_ctx", "ask_confirmed"],
      suggest: [{ lt: "Pasirinkti laiką (11 ar 13 val.)", hint: "time" }],
      yes: (c) => { G(c, "gr_time_q"); c.hold(); },
      no: (c) => { G(c, "gr_time_only"); c.hold(); },
      help: (c) => { c.s.timeSet = "eleven"; G(c, "gr_time_11"); } },
    { id: "g_close", when: (c) => inGrant(c) && (!!c.s.timeSet || !!c.s.tomorrow), done: (c) => !!c.s.thanked || !!c.s.closeNo || !!c.s.over || asked(c, "g_close"),
      ask: (c) => { bump(c, "g_close"); G(c, "gr_anything"); },
      expects: ["formal_thanks", "apologize", "kind_regards", "ask_confirmed", "ask_eta", "ask_damage", "thats_all", "warm", "g_thanks"],
      suggest: [{ lt: "Mandagiai padėkoti", hint: "thanks_g" }, { lt: "Paklausti, ar laikas tikslus", hint: "time" }],
      yes: (c) => { G(c, "gr_ok"); c.hold(); },
      no: (c) => { c.s.closeNo = true; if (heardThanks(c)) c.s.thanked = true; } },
  ],

  init: (c) => {
    c.s.phase = "lizzie";
    c.s.askOkay = c.chance(0.6);
    c.s.askSince = c.chance(0.6);
    // one twist per visit; a replay prefers the one not seen yet
    const p = c.visits >= 1 ? 0.85 : 0.5;
    let tw: string | null = c.chance(p) ? c.pick(["voicemail", "door"]) : null;
    const seen: string[] = c.memory.twists ?? [];
    if (c.visits >= 1 && tw && seen.includes(tw)) tw = ["voicemail", "door"].find((x) => !seen.includes(x)) ?? tw;
    c.s.twist = tw;
  },

  start: (c) => {
    L(c, "l_hello");
    c.hold();
  },

  handlers: {
    ...Object.fromEntries(ALL_INTENTS.map((id) => [id, handle(id)])),
    // global skills with a meaning here
    g_bye(c, slots) {
      if (c.s.over || turn(c).switched) return;
      if (inVm(c)) { vmEnd(c); return; }
      if (inLizzie(c)) {
        if (c.s.helpAnswered && (c.s.twist !== "door" || c.s.doorDone)) { c.s.comeDone = true; byeLizzie(c, "bye"); return; }
        if (c.s.twist === "door" && c.s.helpAnswered && !c.s.doorDone) { doorThanks(c); return; }
        // before help is settled: "Wait! Do you need anything?"
        if (once(c, "l_ack")) L(c, "l_need_q");
        c.hold();
        void slots;
        return;
      }
      grantBye(c);
    },
    g_thanks(c, slots) {
      if (c.s.over || turn(c).switched) return;
      if (inVm(c)) { thankGrant(c, "plain"); return; }
      if (inLizzie(c)) {
        if (c.s.twist === "door" && c.step === "l_door" && !c.s.doorDone) { doorThanks(c); return; }
        if (c.step === "l_bye") { byeLizzie(c, "thanks"); return; }
        GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
        return;
      }
      if (c.s.today || c.s.tomorrow || c.step === "g_close") { thankGrant(c, "plain"); return; }
      GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
    },
    g_hello(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_hello(c as ConvCtx, slots); },
    g_howareyou(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_howareyou(c as ConvCtx, slots); },
    g_ok(c) { if (inVm(c)) vmSilent(c); },
    // "So sorry!" to Lizzie is about brunch (her answer comes with the rest); to Mr. Grant it's an apology
    g_sorry(c) { if (inVm(c)) { vmSilent(c); return; } if (inGrant(c)) { thankGrant(c, "apology"); return; } turn(c).sorry = true; },
    g_wait(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_wait(c as ConvCtx, slots); },
    g_learning(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_learning(c as ConvCtx, slots); },
    g_repeat(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots); },
    g_slower(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_slower(c as ConvCtx, slots); },
    g_dontknow(c, slots) {
      if (inVm(c)) { vmSilent(c); return; }
      // "I don't know." to "Could it wait till tomorrow morning?": he decides, and the time question follows (no hold)
      if (inGrant(c) && c.step === "g_offer" && !c.s.today && !c.s.tomorrow) { dontKnowToday(c); return; }
      GLOBAL_HANDLERS.g_dontknow(c as ConvCtx, slots);
    },
  },

  finish: (c) => {
    if (c.s.over) return;
    if (!c.s.thanked && !c.s.tomorrow) { G(c, "gr_see_you"); expectClosing(c); return; }
    wrapUp(c);
  },

  tests: [
    // --- Lizzie: brunch and the flood (the song's casual lines first) ---
    { say: "Hey girl, can't make brunch, so sorry!", intent: "cancel_brunch", step: "l_news" },
    { say: "My washer kinda exploded.", intent: "flood", step: "l_news" },
    { say: "There's water everywhere.", intent: "flood", step: "l_news" },
    { say: "There's a river on the floor.", intent: "flood", step: "l_news" },
    { say: "Gonna be a while.", intent: "cancel_brunch", step: "l_news" },
    { say: "I can't make brunch, sorry. My washer exploded.", intent: "flood", step: "l_news" },
    { say: "My socks are floating.", intent: "flood", step: "l_news" },
    { say: "The cat's on the fridge, giving me the evil eye.", intent: "cat_fridge", step: "l_news" },
    { say: "I regret to inform you that I will be unable to attend brunch.", intent: "cancel_brunch", step: "l_news" },
    { say: "Can I take a rain check?", intent: "cancel_brunch", step: "l_brunch" },
    { say: "I can make it to brunch.", intent: "none" },
    { say: "My washing machine works fine.", intent: "none" },
    { say: "I'm fine, just wet.", intent: "nobody_hurt", step: "l_okay" },
    { say: "I'm freaking out.", intent: "freaking_out", step: "l_okay" },
    { say: "I'm not okay.", intent: "freaking_out", step: "l_okay", not: ["nobody_hurt"] },
    // --- Lizzie: what to bring ---
    { say: "Can you bring a mop?", intent: "ask_help", step: "l_need", slots: { stuff: "mop" } },
    { say: "Could you grab some towels on the way?", intent: "ask_help", step: "l_need", slots: { stuff: "towels" } },
    { say: "Lots of coffee.", intent: "ask_help", step: "l_need", slots: { stuff: "coffee" } },
    { say: "Coffee, please.", intent: "item_ctx", step: "l_need" },
    { say: "Coffee, please.", intent: "none" },
    { say: "Could you come over?", intent: "ask_help", step: "l_need" },
    { say: "Send a boat!", intent: "ask_help", step: "l_need", slots: { stuff: "boat" } },
    { say: "No, I'm good, thanks.", intent: "need_nothing", step: "l_need", not: ["ask_help"] },
    { say: "I don't need anything.", intent: "need_nothing", step: "l_need", not: ["ask_help", "item_ctx"] },
    { say: "I don't need a mop.", intent: "not_item", step: "l_need", not: ["ask_help", "item_ctx"] },
    { say: "Don't worry about it. Enjoy your brunch!", intent: "need_nothing", step: "l_need" },
    { say: "No, don't come over.", intent: "come_no", step: "l_come", not: ["ask_help"] },
    { say: "Love you, thanks!", intent: "warm", step: "l_bye" },
    { say: "See you in a bit!", intent: "see_you", step: "l_bye" },
    { say: "You're a lifesaver!", intent: "warm", step: "l_door" },
    { say: "I owe you one.", intent: "warm", step: "l_door" },
    { say: "Kind regards.", intent: "kind_regards", step: "l_bye" },
    // --- Mr. Grant: who and what ---
    { say: "Good morning, Mr. Grant. This is Tomas Mikalauskas from apartment 3B.", intent: "intro", step: "g_who" },
    { say: "I'm your tenant in 3B.", intent: "intro", step: "g_who" },
    { say: "I'm calling from apartment 3B.", intent: "intro", step: "g_who" },
    { say: "I'm calling from flat 3B.", intent: "intro", step: "g_who" },
    { say: "Tomas Mikalauskas.", intent: "intro_ctx", step: "g_who" },
    { say: "Hey, it's me!", intent: "its_me", step: "g_who" },
    { say: "I regret to inform you that the washing machine has flooded the kitchen.", intent: "flood", step: "g_what" },
    { say: "I'm calling to report a leak.", intent: "flood", step: "g_what" },
    { say: "I'm afraid the kitchen is flooded.", intent: "flood", step: "g_what" },
    { say: "The washing machine you kindly fixed has failed again.", intent: "flood", step: "g_what" },
    { say: "It happened this morning, at about seven.", intent: "when_happened", step: "g_since" },
    { say: "About an hour ago.", intent: "when_happened", step: "g_since" },
    { say: "Since seven.", intent: "when_happened", step: "g_since" },
    // --- Mr. Grant: his questions ---
    { say: "No, nobody's hurt.", intent: "nobody_hurt", step: "g_hurt" },
    { say: "Just my socks.", intent: "nobody_hurt", step: "g_hurt" },
    { say: "Yes, I'm afraid it's reaching the apartment downstairs.", intent: "downstairs_yes", step: "g_down" },
    { say: "It's dripping into Mr. Okoye's apartment.", intent: "downstairs_yes", step: "g_down" },
    { say: "The neighbor from below is upset.", intent: "downstairs_yes", step: "g_down" },
    { say: "No, it hasn't reached downstairs.", intent: "downstairs_no", step: "g_down", not: ["downstairs_yes"] },
    { say: "I'm not sure.", intent: "unsure_ctx", step: "g_down" },
    { say: "I've turned off the water.", intent: "water_off", step: "g_water" },
    { say: "I closed the water.", intent: "water_off", step: "g_water" },
    { say: "I don't know where the valve is.", intent: "water_not_off", step: "g_water", not: ["water_off"] },
    { say: "I didn't turn off the water.", intent: "water_not_off", step: "g_water", not: ["water_off"] },
    // --- Mr. Grant: the plumber, today ---
    { say: "I would be grateful if a plumber could be sent today.", intent: "ask_plumber", step: "g_request" },
    { say: "Could you send a plumber today, please?", intent: "ask_plumber", step: "g_request" },
    { say: "Could someone come at your earliest convenience?", intent: "ask_plumber", step: "g_request" },
    { say: "Is there any way someone could come today?", intent: "ask_plumber", step: "g_request" },
    { say: "Could you send a master?", intent: "ask_plumber", step: "g_request" },
    { say: "I'm afraid it can't wait until tomorrow.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "It can't wait.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Tomorrow is too late.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Tomorrow is not okay.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Tomorrow morning is fine.", intent: "accept_tomorrow", step: "g_offer", not: ["insist_today"] },
    { say: "It can wait until tomorrow.", intent: "accept_tomorrow", step: "g_offer", not: ["insist_today"] },
    // --- Mr. Grant: the time, the thanks ---
    { say: "Eleven would be perfect.", intent: "pick_time", step: "g_time", slots: { time: { h: 11 } } },
    { say: "Could he come at one?", intent: "pick_time", step: "g_time", slots: { time: { h: 1 } } },
    { say: "The earlier the better.", intent: "pick_time", step: "g_time" },
    { say: "Eleven.", intent: "time_ctx", step: "g_time" },
    { say: "Is that a confirmed time or an estimate?", intent: "ask_confirmed", step: "g_time" },
    { say: "Could you let me know when he's on his way?", intent: "ask_confirmed", step: "g_close" },
    { say: "Please advise when the plumber will arrive.", intent: "ask_confirmed", step: "g_close" },
    { say: "Thank you for your prompt assistance.", intent: "formal_thanks", step: "g_close" },
    { say: "I apologize for any inconvenience.", intent: "apologize", step: "g_close" },
    { say: "Who's going to pay for the damage?", intent: "ask_damage", step: "g_close" },
    { say: "When will you be here?", intent: "ask_eta", step: "g_close" },
    { say: "Fix it now!", intent: "demand_rude", step: "g_request" },
    { say: "Please call me back at your earliest convenience.", intent: "vm_close", step: "vm_msg" },
    { say: "I look forward to hearing from you.", intent: "vm_close", step: "vm_msg" },
    // --- review fixes (regressions) ---
    // "Yes, I'm sure." / "I'm sure." to her "You sure? I can come over after brunch." keeps her at brunch
    { say: "I'm sure.", intent: "sure_ctx", step: "l_come", not: ["ask_help", "item_ctx"] },
    { say: "Yes, I'm sure.", intent: "sure_ctx", step: "l_come", not: ["ask_help", "item_ctx"] },
    { say: "Nothing else, thank you.", intent: "thats_all", step: "g_close" },
    // a bare {name} only answers "Who's this?"
    { say: "I'm wet.", intent: "nobody_hurt", step: "l_okay", not: ["intro", "intro_ctx"] },
    { say: "I'm stressed.", intent: "freaking_out", step: "l_okay", not: ["intro", "intro_ctx"] },
    { say: "I'm home.", intent: "none" },
    { say: "This is urgent.", intent: "insist_today", step: "g_offer", not: ["intro", "intro_ctx", "accept_tomorrow"] },
    { say: "That's too late.", intent: "insist_today", step: "g_offer", not: ["intro", "intro_ctx", "accept_tomorrow"] },
    { say: "I'm worried.", intent: "insist_ctx", step: "g_offer", not: ["intro", "intro_ctx", "accept_tomorrow"] },
    { say: "Please ring me back.", intent: "vm_close", step: "vm_msg", not: ["vm_who_ctx", "intro_ctx", "its_me", "its_me_ctx"] },
    { say: "This is Tomas.", intent: "intro_ctx", step: "g_who" },
    { say: "This is Tomas.", intent: "vm_who_ctx", step: "vm_msg" },
    { say: "Me!", intent: "its_me_ctx", step: "g_who" },
    // a voicemail said in one breath (more pieces than the engine's three intents)
    { say: "Good morning, Mr. Grant. This is Tomas Mikalauskas from apartment 3B. I regret to inform you that the kitchen is flooded. I would be grateful if a plumber could be sent today. Kind regards.", intent: "vm_unknown", step: "vm_msg" },
    { say: "Hello, Mr. Grant, it's Tomas from 3B. I'm afraid the washing machine has flooded the kitchen. Nobody is hurt, and I've turned off the water. Could you send a plumber today? Please call me back.", intent: "vm_unknown", step: "vm_msg" },
    // the hint example where the hint is shown
    { say: "It happened this morning, at about seven.", intent: "when_happened", step: "g_hurt" },
    { say: "It happened this morning, at about seven.", intent: "when_happened", step: "g_water" },
    // short answers to Mr. Grant
    { say: "No, it hasn't.", intent: "down_no_ctx", step: "g_down", not: ["downstairs_yes", "down_yes_ctx"] },
    { say: "Yes, it has.", intent: "down_yes_ctx", step: "g_down", not: ["downstairs_no", "down_no_ctx"] },
    { say: "I'm afraid so.", intent: "down_yes_ctx", step: "g_down" },
    { say: "No, it can't.", intent: "wait_no_ctx", step: "g_offer", not: ["accept_tomorrow", "wait_yes_ctx"] },
    { say: "Yes, it can.", intent: "wait_yes_ctx", step: "g_offer", not: ["insist_today", "wait_no_ctx"] },
    { say: "Nobody.", intent: "nobody_hurt", step: "g_hurt" },
    { say: "No one.", intent: "nobody_hurt", step: "g_hurt" },
    { say: "I'm not hurt.", intent: "nobody_hurt", step: "g_hurt" },
    { say: "I closed the valve.", intent: "water_off", step: "g_water" },
    { say: "I turned off the tap.", intent: "water_off", step: "g_water" },
    { say: "A plumber.", intent: "plumber_ctx", step: "g_request" },
    { say: "Can you come today?", intent: "ask_plumber", step: "g_request" },
    { say: "I have a problem with the washing machine.", intent: "flood", step: "g_what" },
    { say: "I don't have a problem with the washing machine.", intent: "none" },
    { say: "Either is fine.", intent: "time_ctx", step: "g_time" },
    { say: "I don't mind.", intent: "time_ctx", step: "g_time" },
    { say: "I'd prefer one.", intent: "pick_time", step: "g_time", slots: { time: { h: 1 } } },
    { say: "I'm not sure it can wait.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "I don't think it can wait.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "What are you doing here?", intent: "door_surprise", step: "l_door", not: ["warm"] },
    { say: "I bought a mop.", intent: "not_item", step: "l_need", not: ["ask_help", "item_ctx"] },
    // --- nothing understood ---
    { say: "Purple bananas dance on the roof", intent: "none" },
    { say: "I don't have a washing machine", intent: "none" },
    { say: "My cat is learning French", intent: "none" },
  ],

  // The twist, Lizzie's "Are you okay?" and Mr. Grant's "When did that start?" come on some seeds only: each sim
  // pins them with `setup` where its script depends on them (AUTO answers them otherwise).
  sims: [
    { name: "happy path: casual with Lizzie, formal with Mr. Grant", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = true; },
      turns: ["Hey girl, can't make brunch, so sorry! My washer kinda exploded.", "Can you bring a mop? And coffee? Lots of coffee.", "Love you, thanks!",
        "Good morning, Mr. Grant. This is Tomas Mikalauskas from apartment 3B.", "I regret to inform you that the washing machine has flooded the kitchen.",
        "It happened this morning, at about seven.", "No, nobody's hurt.", "Yes, I'm afraid it's reaching the apartment downstairs.",
        "Yes, I've turned off the water and put down towels.", "I would be grateful if a plumber could be sent today.",
        "I'm afraid it can't wait until tomorrow.", "Eleven would be perfect.", "Thank you for your prompt assistance."],
      expect: { complete: true, state: { cancelled: true, today: true, timeSet: "eleven", thanked: true, regretSaid: true, outcome: "done" } }, auto: AUTO },
    { name: "questions and changes of mind", setup: (s) => { s.twist = null; s.askOkay = true; s.askSince = false; },
      turns: ["Hi, Lizzie!", "There's water everywhere. The cat's on the fridge.", "I'm freaking out a little.", "Can I take a rain check?",
        "No, I'm good, thanks.", "Actually, could you bring some towels?", "See you in a bit!",
        "Hi, it's me!", "I'm your tenant in 3B.", "I'm calling to report a leak. The washing machine broke.", "No, just my socks.", "I'm not sure.",
        "No, I don't know where the valve is.", "Okay, it's off now.", "Could someone come tomorrow?", "Actually, it really needs to be today.",
        "Is that a confirmed time or an estimate?", "One o'clock works for me.", "Who's going to pay for the damage?", "I apologize for any inconvenience."],
      expect: { complete: true, state: { cancelled: true, declined: false, today: true, timeSet: "one", confirmAsked: true, damageAsked: true } }, auto: AUTO },
    { name: "door (twist): Lizzie is already outside", setup: (s) => { s.twist = "door"; s.askOkay = false; s.askSince = false; },
      turns: ["Hey, I can't make brunch. My washing machine broke and there's water everywhere.", "Could you grab a mop on the way?",
        "Oh my gosh, you're a lifesaver!", "This is Tomas from apartment 3B.", "I'm afraid the kitchen is flooded.", "Nobody is hurt.",
        "No, it's only in the kitchen.", "Yes, I did.", "Could you send a plumber today, please?", "Tomorrow morning is fine.",
        "Hmm, actually, today would be better.", "Could he come at eleven?", "No, that's all. Thank you, I really appreciate it."],
      expect: { complete: true, state: { doorDone: true, today: true, timeSet: "eleven", outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist): a formal message, then he calls back", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["Hey, so sorry, I can't make brunch. My washer kinda exploded.", "Can you bring a mop?", "Thanks, bye!",
        "Good morning, Mr. Grant. This is Tomas Mikalauskas from apartment 3B.", "I regret to inform you that the washing machine has flooded the kitchen.",
        "I would be grateful if a plumber could be sent today, as the water is reaching the apartment downstairs.",
        "Please call me back at your earliest convenience. Kind regards.", "No, nobody's hurt.", "Yes, I've turned off the water.",
        "Eleven would be perfect.", "Thank you for your prompt assistance."],
      expect: { complete: true, state: { vmEnded: true, calledBack: true, downstairs: true, today: true, outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist): a short message, the rest on the callback", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["I can't come to brunch, my kitchen is flooded.", "I don't need anything, really.", "No, don't come. Enjoy your brunch!", "Talk to you later!",
        "Hello, Mr. Grant, I'm calling about the washing machine. Please call me back.", "This is Tomas from 3B.", "No, everyone is fine.",
        "No, not yet.", "I've turned off the water.", "Is there any way someone could come today?", "It's urgent.", "The earlier the better.", "Thanks a lot!"],
      expect: { complete: true, state: { vmEnded: true, declined: true, today: true, timeSet: "eleven" } }, auto: AUTO },
    { name: "wrong registers: stiff with Lizzie, too casual with Mr. Grant (tips)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Dear Lizzie, I regret to inform you that I will be unable to attend brunch.", "The washing machine has failed again.",
        "I would be grateful if you could bring a mop.", "Kind regards.",
        "Hey, it's me!", "It's Tomas from 3B. My washer kinda exploded, fix it!", "Nope.", "Yes, it's dripping downstairs.", "Yes.",
        "No, tomorrow is too late.", "Anytime, I'm home all day.", "Love you, thanks!"],
      expect: { complete: true, state: { laughed: true, today: true, thanked: true, timeSet: "eleven" } }, auto: AUTO },
    { name: "tomorrow accepted (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Hi! I can't come to brunch, my kitchen is flooded.", "No, I'm good, thanks.", "No, really, I'm fine. Enjoy your brunch!", "Bye!",
        "Hi, this is Tomas from 3B.", "My washing machine is leaking.", "No.", "No.", "Yes.", "Could you send a plumber?", "Tomorrow is fine.",
        "Yes, tomorrow is fine.", "No, thanks. Bye!"],
      expect: { complete: false, state: { tomorrow: true, outcome: "tomorrow" } }, auto: AUTO },
    { name: "hanging up on Mr. Grant (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["My washing machine exploded, so no brunch today.", "A bucket and some towels, please.", "Bye!", "Hi, it's Tomas from 3B.", "Bye.", "Goodbye."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO },
    // review fixes: short answers everywhere, "Yes, I'm sure", "Yes" to "Is anybody hurt?" (he waits), "No, thank you"
    { name: "short answers: Lizzie stays at brunch, 'No, thank you' thanks", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["I can't make brunch, my kitchen is flooded.", "No, I'm good, thanks.", "Yes, I'm sure.", "Bye!",
        "Hi, this is Tomas from 3B.", "I have a problem with the washing machine.", "Yes.", "Yes, I am.", "No, it hasn't.", "I closed the valve.",
        "A plumber.", "No, it can't.", "Either is fine.", "No, thank you."],
      expect: { complete: true, state: { coming: false, hurtDone: true, downstairs: false, waterOff: true, today: true, timeSet: "eleven", thanked: true, outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist) in one breath; 'Eleven thirty?' is not a slot", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["I can't make brunch, my kitchen is flooded.", "Can you bring a mop?", "Thanks, bye!",
        "Hello, Mr. Grant, it's Tomas from 3B. I'm afraid the washing machine has flooded the kitchen. Nobody is hurt, and I've turned off the water. Could you send a plumber today? Please call me back.",
        "No, not yet.", "Eleven thirty?", "Eleven, then.", "Nothing else, thank you."],
      expect: { complete: true, state: { vmEnded: true, who: true, hurtDone: true, waterOff: true, today: true, timeSet: "eleven", thanked: true, outcome: "done" } }, auto: AUTO },
    { name: "'I don't know' to tomorrow: he doesn't risk it, and asks the time", setup: (s) => { s.twist = null; s.askOkay = true; s.askSince = false; },
      turns: ["My washer kinda exploded.", "I'm wet.", "Can I take a rain check?", "Could you grab some towels?", "Love you, thanks!",
        "This is Tomas from apartment 3B.", "I'm afraid the washing machine is leaking.", "Nobody.", "I'm afraid so.", "I turned off the tap.",
        "Could you send a plumber?", "I don't know.", "I'd prefer one.", "Thank you for your prompt assistance."],
      expect: { complete: true, state: { okayDone: true, downstairs: true, today: true, tomorrow: false, timeSet: "one", outcome: "done" } }, auto: AUTO },
    { name: "door (twist): 'What are you doing here?'", setup: (s) => { s.twist = "door"; s.askOkay = false; s.askSince = false; },
      turns: ["I can't make brunch. My washing machine broke.", "I bought a mop. Could you bring coffee?", "What are you doing here?",
        "Hi, Mr. Grant. This is Tomas from 3B.", "There's water everywhere.", "No one.", "Not yet.", "Yes.", "Can you come today?",
        "This is urgent.", "Eleven.", "Thanks, I really appreciate it."],
      expect: { complete: true, state: { doorDone: true, today: true, timeSet: "eleven", twistSaved: "door", outcome: "done" } }, auto: AUTO },
    { name: "the guess: 'Yes' to 'that washing machine again?' is no explanation (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["I can't make brunch, my kitchen is flooded.", "Can you bring a mop?", "Bye!", "Hi, this is Tomas from 3B.", "I don't know.", "Yes.",
        "No.", "No.", "Yes.", "Could you send a plumber today?", "No.", "Eleven.", "Thank you for your prompt assistance."],
      expect: { complete: false, state: { guessed: true, today: true, timeSet: "eleven", thanked: true, outcome: "partial" } }, auto: AUTO },
    { name: "voicemail (twist), then hanging up: the twist is remembered (not done)", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["My washing machine exploded, so no brunch today.", "A bucket and some towels, please.", "Bye!",
        "Hello, Mr. Grant. Please call me back.", "This is Tomas from 3B.", "Bye.", "Goodbye."],
      expect: { complete: false, state: { vmEnded: true, outcome: "walked", twistSaved: "voicemail" } }, auto: AUTO },
  ],
};

/** After "No, that's all": the last thanks or goodbye. */
function expectClosing(c: Ctx) {
  const p: Pending = {
    id: "closing", expects: ["formal_thanks", "apologize", "kind_regards", "warm", "see_you", "g_thanks", "g_bye"], hints: ["thanks_g"],
    suggest: [{ lt: "Mandagiai padėkoti ir atsisveikinti", hint: "thanks_g" }],
    on: {
      formal_thanks: (cc) => { cc.s.thanked = true; wrapUp(cc); },
      apologize: (cc) => { cc.s.thanked = true; G(cc, "gr_inconvenience"); wrapUp(cc); },
      kind_regards: (cc) => { cc.s.thanked = true; G(cc, "gr_regards"); wrapUp(cc); },
      warm: (cc) => { cc.tip(TIPS.love_landlord); cc.s.thanked = true; G(cc, "gr_love_you"); wrapUp(cc); },
      g_thanks: (cc) => { cc.s.thanked = true; wrapUp(cc); },
      // "No, thank you." / "Thanks, bye!": the thanks counts
      g_bye: (cc) => { if (heardThanks(cc)) cc.s.thanked = true; wrapUp(cc); },
      see_you: (cc) => { if (heardThanks(cc)) cc.s.thanked = true; wrapUp(cc); },
    },
    yes: (cc) => { G(cc, "gr_ok"); expectClosing(cc); },
    no: (cc) => { if (heardThanks(cc)) cc.s.thanked = true; wrapUp(cc); },
  };
  c.expect(p);
}

export default flood;
