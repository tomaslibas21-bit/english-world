// NEEDS: (1) the English edition's NEEDS 1–3 stand (the "call", "voicemail", "beep", "hang-up", "incoming-call",
// "knock" and "outro" events; at most 3 intents per turn, so a voicemail in one breath is read by `vm_unknown`).
// (2) global.ts: "te llamo luego" is a #leaving goodbye; "luego hablamos" / "hablamos al rato" are local here (see_you).
// Song P24 "Kind Regards, I'm Drowning" → Puerto Colibrí: "Saludos cordiales, me estoy ahogando" (B2–C1).
// Two phone calls on a flooded Saturday morning, the same facts in two registers (the brief: the register switch is
// the point). In the night a pipe burst in 2B, the apartment upstairs (the lead's decision, 5 Nov 2026: the learner's
// 1B has neighbors upstairs, s82), and the water came in through the ceiling: a river on the kitchen floor, the
// learner's socks afloat, the cat on top of the fridge.
//   Call 1, Andrea (the friend from s83, tú, casual): she picks up on her way to the Saturday breakfast at nine. The
//   learner cancels and explains ("¡Se me inundó el depa!"), asks for a mop, towels, a bucket, a squeegee or coffee, or
//   says no thanks, and says goodbye the way friends do ("¡Te quiero, gracias!", "¡Nos vemos en un rato!").
//   Call 2, Don Gilberto (the building's administrador, usted both ways): who is calling (apartment 1B), what happened
//   ("Le llamo para informarle que…", "Lamento informarle que…"), since when, his questions (anybody hurt? has it
//   reached the apartment downstairs? did you switch off the power?), a request ("Le agradecería que mandara a alguien
//   hoy"), polite insistence when he offers tomorrow ("Me temo que no puede esperar hasta mañana"), a time for his
//   plumber (eleven or one; "¿Es una hora fija o aproximada?") and a formal thank-you ("Muchas gracias por su pronta
//   atención").
// The building as s81, s82 and p29 have it (the lead's decision, 5 Nov 2026 audit): Departamentos Las Palmas; the
// learner's apartment is 1B, one floor up (the 3D sign "DEPTO. 1B"), 2B above it; Don Ernesto owns the building and
// lives on the planta baja, below the learner, so he is the neighbor downstairs the water may reach; Don Gilberto is the
// administrador. s82's rule: what breaks inside the apartment goes to Don Ernesto, what is the building's (its pipes)
// to Don Gilberto, so the flood is his. Asked about Don Ernesto, he says he'll let him know (ask_owner).
// Meaning safety (the audit): with water on the floor the power comes first, so only a switched-off power answers his
// "¿Ya bajó el switch de la luz?"; towels or bailing (towels_done) and "No hay luz" (no_power) get his instructions,
// and a question left unanswered gets them on his second turn.
// Register: both registers are always understood. A wrong one still works, with a tip once per call: too stiff with
// Andrea (#formal: "Lamento informarte…" or usted makes her laugh: "¿Quién eres, mi banco?"), too casual with Don
// Gilberto (#casual: tú, "güey", "¡Arréglalo ya!"). The tags are read in `handle` below.
// "güey" only on the learner's side (STYLE.md, the brief): understood with Andrea, never in a character's line or a hint.
// Twists (one per visit; 50 % on the first visit, 85 % later, an unseen one preferred), as in the English:
//   "voicemail": Don Gilberto's voicemail; the learner leaves a message (the recording answers nothing), he calls
//     back ("¡Qué mensaje tan formal! ¡Parece carta mía!") and asks for what the message left out.
//   "door": Andrea is already at the door with a mop and coffee ("Me mandaste «AUXILIO» y nueve emojis de agua"); at
//     the end she shouts "¡Saludos cordiales, Don Gilberto!" and he laughs.
// Endings: done once mission items 2–5 are ticked; a plumber accepted for tomorrow ends it not done; hanging up on him
// twice before a plumber is agreed ends it not done.
//
// Changed for Puerto Colibrí (the brief): water through the ceiling instead of the washing machine (first a storm and
// the roof drain; since 5 Nov 2026 a burst pipe in 2B upstairs), so Don Gilberto's safety question is the power ("¿Ya
// bajó el switch de la luz?": with water on the floor, switching off the electricity comes first; the intent ids
// water_off / water_not_off and the step g_water are kept), and the plumber fixes the pipe. His guess "¿Es otra vez la
// tubería del 2B?" is the English "that washing machine again?"; the neighbor downstairs is Don Ernesto (Mr. Okoye's
// part). Breakfast ("el desayuno") instead of brunch. A learner who blames a storm or the roof is still understood.
// Research (Nov 2026), kept vague where unsure: Mexican phone openers "¿Bueno?" (M, twin ¿Hola?), formal Mexican
// phone and letter register ("Le llamo para informarle que…", "Le agradecería que…", "Quedo atento a su llamada",
// "Saludos cordiales", "Atentamente", "Disculpe las molestias"); after a flood Mexican civil-protection advice is to cut
// the electricity first (no figures taught). Who pays for the damage is left vague: Don Gilberto says he'll take care of
// the building's pipes ("eso lo veo yo"), nothing about the tenant's things or insurance.
// Mexican-only words in lines (¿bueno?, ahorita, switch, refri, ¡híjole!, ¡no manches! on the learner's side, depa)
// have neutral twins; "trapeador", "cubeta" and "jalador" are the chips (balde, mapo, fregona, cubo, secador are
// understood). The bucket's neutral noun is "balde" (attrs.neutral, the lead's decision, 5 Nov 2026): Andrea's lines and
// the hints say "un balde" in the neutral text; the chip itself still says "cubeta" (a neutral chip needs the UI).
//
// The learner's gender: {m:…|f:…}; the speaker's: {sm:…|sf:…} (Andrea f, Don Gilberto m).

import type { Ctx, EntityDef, Pending, Segment, SituationDef, Tip } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const F_YOU_LO = "lo / la: you (lo for a man, la for a woman).";
const F_BUENO = "Mexican: ¿Bueno? = hello? when you answer the phone.";
const F_AHORITA = "Mexican: ahorita = right now (or in a little while).";
const F_SWITCH = "Mexican: el switch (de la luz) = the main power switch; elsewhere el interruptor.";
const F_PERSONAL_A = "a: the personal a before a person who is the object; English has no word.";
const F_QUE_SUBJ = "que + subjunctive: Spanish says “I'll ask that he come by”.";
const F_DEPA = "departamento: the usual word for an apartment in Mexico; apartamento is more widely used.";
const F_HABLO = "hablar: also to call on the phone in Mexico (le hablo = I'm calling you).";
const F_LO_CALL = "lo: you (usted, a man), the one you call.";
const F_AL_CALL = "al = a + el: Spanish puts a before the one you call; English just says the.";

// ---------------------------------------------------------------------------
// Things Andrea can bring (a mop, towels, coffee, a bucket, a squeegee; a boat is the song's joke)

const STUFF: EntityDef[] = [
  ent("mop", "trapeador", "mop", "m", { chip: "trapeador", attrs: { spain: "fregona", spainG: "f" }, forms: ["trapeadores", "mapo", "fregona", "fregonas", "mechudo", "trapero"] }),
  ent("towels", "toallas", "towels", "f", { art: "", chip: "toallas", forms: ["toalla", "toallas viejas", "jergas", "jerga", "trapos", "trapo", "toallas de papel"] }),
  ent("coffee", "café", "coffee", "m", { art: "", chip: "café", forms: ["cafes", "un cafe", "cafe grande", "un cafe grande", "cafes grandes", "cafecito", "un cafecito", "cafe americano", "lattes", "un latte"] }),
  ent("bucket", "cubeta", "bucket", "f", { chip: "cubeta", forms: ["cubetas", "balde", "baldes", "cubo", "cubos"],
    attrs: { neutral: "balde", neutralG: "m", neutralPl: "baldes", spain: "cubo", spainG: "m", spainPl: "cubos" } }),
  ent("squeegee", "jalador", "squeegee", "m", { chip: "jalador", attrs: { spain: "rasqueta", spainG: "f", spainPl: "rasquetas" },
    forms: ["jaladores", "jalador de agua", "secador", "secador de piso", "escurridor", "rasqueta", "rasquetas", "rasqueta de suelo", "escoba de goma"] }),
  ent("boat", "lancha", "boat", "f", { forms: ["lanchas", "barco", "bote", "una balsa", "salvavidas", "kayak", "canoa"] }),
];
const CHIPS = ["mop", "towels", "coffee", "bucket", "squeegee"];

// ---------------------------------------------------------------------------
// Tips (English: the learner's language)

const TIPS: Record<string, Tip> = {
  // (the examples have no neutral twin, so they keep to words both Spanishes share)
  too_stiff: { key: "too_stiff", lt: "Understood! But to a friend this sounds like a letter from the bank, and Andrea laughs. With friends: tú, short and casual.", better: "¡Perdón, no llego al desayuno! Se me inundó la cocina." },
  too_casual: { key: "too_casual", lt: "Understood! But to the building manager this sounds too casual, like a text to a friend. Use usted and a more formal tone.", better: "Le llamo para informarle que se inundó la cocina. ¿Podría mandar a alguien hoy?" },
  rude: { key: "rude", lt: "Understood! But orders sound rude to the building manager. Firm but polite:", better: "Me temo que no puede esperar hasta mañana." },
  love_landlord: { key: "love_landlord", lt: "Understood! “Te quiero” is for friends and family. The building manager gets a polite thank-you.", better: "Muchas gracias por su pronta atención." },
};

/** End-card lines (the "outro" event; see NEEDS). */
const OUTRO: Record<string, string> = {
  done: "Ten minutes later Don Gilberto is at your door with a toolbox, and the plumber shows up… almost on time. The cat stays on the fridge.",
  tomorrow: "The plumber comes tomorrow… and the water is still dripping into Don Ernesto's place downstairs. Try again: politely but firmly ask for someone today.",
  walked: "You hung up, and the water is still on the floor. Try again: explain what happened and ask for someone today.",
};

// ---------------------------------------------------------------------------
// Speakers and per-turn helpers

const L = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("lizzie"); c.say(line, vars); };
const G = (c: Ctx, line: string, vars?: Record<string, any>) => { c.speaker("mr_grant"); c.say(line, vars); };

/** What the learner said, lowercase and without accents. */
const heard = (c: Ctx) => c.heard.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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
/** A thanks inside another answer ("No, gracias.", "Nada más, gracias.", "Gracias, adiós."). */
const heardThanks = (c: Ctx) => /\b(gracias|agradezco|agradecid[oa])\b/.test(heard(c));

/** The twist this visit showed is remembered (a replay prefers the other one), whatever the ending. */
function rememberTwist(c: Ctx) {
  if (!c.s.twistSeen || !c.s.twist) return;
  c.s.twistSaved = c.s.twist; // (for the sims)
  c.remember({ twists: [...new Set([...(c.memory.twists ?? []), c.s.twist])] });
}

/** Don Gilberto knows who and what (said live or in the message). */
const grantKnows = (c: Ctx) => !!c.s.who && !!c.s.gFlood;
/** Mission item 3: the learner explained it (not just "Sí" to his guess after the third try). */
const explainedToGrant = (c: Ctx) => grantKnows(c) && !c.s.guessed;
const asked = (c: Ctx, id: string) => (c.s.asks?.[id] ?? 0) >= 1;
const hurtOk = (c: Ctx) => !!c.s.hurtDone || asked(c, "g_hurt");
const downOk = (c: Ctx) => !!c.s.downDone || asked(c, "g_down");
// the power is never left unasked: answered, or his instructions given (g_water's second turn)
const waterOk = (c: Ctx) => !!c.s.waterDone;
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
// Andrea's call

function explain(c: Ctx) {
  if (c.s.explained) { if (once(c, "l_ack")) L(c, "l_ack"); return; }
  c.s.explained = true;
  // her reaction follows what she heard: the ceiling or the pipe, the water, or just the flood
  const h = heard(c);
  if (once(c, "l_ack")) L(c, /techo|gotera|filtr|azotea|coladera|tubo|tuberia|caneria|revent|fuga|arriba/.test(h) ? "l_react_exploded" : /agua|rio|lago|alberca|nadando|flot|mojad|empapad/.test(h) ? "l_react_water" : "l_react_flood");
  if (c.s.cancelled && once(c, "l_brunch")) L(c, "l_brunch_ok");
}

function cancelBrunch(c: Ctx) {
  const first = !c.s.cancelled;
  c.s.cancelled = true;
  if (!first) return;
  if (c.s.explained) { if (once(c, "l_brunch")) L(c, "l_brunch_ok"); return; }
  // "No voy a poder ir" alone: the step asks what happened ("Espera, ¿qué? ¿Qué pasó?")
}

/** "¿Me traes un trapeador? ¿Y café?": Andrea takes the order (a change of mind adds to it). */
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
  // "Mejor sí, ¿puedes venir?" to her "Puedo pasar después de desayunar" takes up her offer
  if (!list.length) L(c, c.step === "l_come" ? "l_coming_yes" : "l_coming");
  else if (!c.s.onWay) { c.s.onWay = true; c.s.coming = true; c.s.comeDone = true; L(c, "l_on_way"); }
}

/** "No, estoy bien, gracias": the first time it declines her help (she asks "¿Segura?"), the second time her coming over. */
function needNothing(c: Ctx) {
  if (c.s.helpAnswered && (c.s.declined || c.step === "l_come")) {
    c.s.comeDone = true;
    if (once(c, "l_come")) L(c, "l_not_coming");
    return;
  }
  c.s.helpAnswered = true;
  if (!c.s.items?.length) c.s.declined = true;
}

/** "Sí, estoy segura." to her "¿Segura? Puedo pasar…": she stays at breakfast. Only a request brings her. */
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

/** Andrea hangs up (or the learner does): the call to Don Gilberto begins. "Te quiero" gets "¡Yo también te quiero!";
 *  "¡Te debo una!" / "¡Eres la mejor!" get "¡Para eso estamos!" and a bye (not "I love you too"). */
function byeLizzie(c: Ctx, kind: "love" | "bye" | "thanks" | "warm") {
  if (c.s.byeL || !inLizzie(c)) return;
  c.s.byeL = true;
  if (once(c, "l_bye")) {
    if (kind === "love") L(c, "l_love_too");
    else { if (kind === "warm") L(c, "l_anytime"); L(c, "l_bye_after"); }
  }
  callGrant(c);
}

/** "Sí, por favor." / "Sí, ven." to her "¿Segura? Puedo pasar después de desayunar." takes up the offer; a bare "Sí" or
 *  "Sí, gracias" answers "¿Segura?" (she stays at breakfast). */
const takesOffer = (c: Ctx) => /\b(por favor|porfa|porfis|bueno|va|sale|orale|andale|ven|vente|pasa|pasate|te espero)\b/.test(heard(c));
const COME_SEG: Segment = { intent: "ask_help", slots: {}, tags: ["come"] };

/** "Llamando a Don Gilberto…": he picks up, or the voicemail twist. */
function callGrant(c: Ctx) {
  c.s.lizzieOver = true;
  turn(c).switched = true; // the rest of this turn ("Gracias, ¡bye!") was said to Andrea
  c.event("call", { npc: "mr_grant", lt: "Calling Don Gilberto…" });
  if (c.s.twist === "voicemail") {
    c.s.phase = "vm";
    c.twist("voicemail");
    c.s.twistSeen = true;
    c.ask("vm_msg"); // the greeting and the beep
    return;
  }
  c.s.phase = "grant";
  c.ask("g_who"); // "¿Bueno? Habla Gilberto. ¿Quién habla?"
}

// ---------------------------------------------------------------------------
// The voicemail: the recording answers nothing; the message ends with a closing (or after the request, with any
// goodbye), then Don Gilberto calls back.

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
  // the song: a message that asked for someone today gets "¡En diez minutos estoy allá!" at once
  if (c.s.gFlood && c.s.who && c.s.askedToday) {
    c.s.today = true;
    G(c, "gr_ten_b");
    G(c, "gr_joe");
  }
  if (!c.s.who) { c.ask("g_who"); return; } // "Por cierto, ¿quién habla?"
}

/** A message said in one breath (`vm_unknown`: four or more pieces). Each piece is tagged (#vm_who, #vm_flood …). */
function vmMessage(c: Ctx, seg: Segment) {
  const has = (tg: string) => seg.tags.includes(tg);
  if (inLizzie(c)) { if (has("vm_flood")) explain(c); else if (once(c, "l_ack")) L(c, "l_ack"); return; }
  if (has("vm_who")) identified(c);
  if (has("vm_flood")) { if (c.s.guessed) c.s.guessed = false; if (!c.s.gFlood || inVm(c)) grantFlood(c); }
  if (has("vm_when")) c.s.sinceDone = true;
  if (has("vm_hurt") && !c.s.hurtDone) nobodyHurt(c);
  if (has("vm_down") && !c.s.downDone) downstairs(c, true);
  if (has("vm_water") && !c.s.waterOff) waterOff(c);
  if (has("vm_towels")) c.s.towels = true; // towels are no answer to the power question (he asks it on the callback)
  if (has("vm_req") && !c.s.today && !c.s.tomorrow) askPlumber(c, seg);
  if (inVm(c)) {
    if (has("vm_end") || (has("vm_sign") && c.s.requested)) { c.s.vmClose = true; vmEnd(c); } else vmSilent(c);
    return;
  }
  if (has("vm_sign")) { if (c.s.today || c.s.tomorrow) thankGrant(c, "formal"); else c.s.thanked = true; }
}

// ---------------------------------------------------------------------------
// Don Gilberto's call

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

/** "Sí" to "¿Alguien se lastimó?": "¿Cómo? ¿Usted está bien?", and he waits for the answer. */
function hurtYes(c: Ctx) {
  c.s.hurtDone = true;
  c.s.hurtAsked2 = true;
  G(c, "gr_hurt_yes");
  c.expect({
    id: "hurt_yes", optional: true, expects: ["nobody_hurt", "freaking_out", "not_ok_ctx", "hurt_ctx"], hints: ["details"],
    suggest: [{ lt: "Say whether you're okay", hint: "details" }],
    on: {
      nobody_hurt: (cc) => { G(cc, "gr_careful"); },
      freaking_out: (cc) => { G(cc, "gr_breathe"); },
      not_ok_ctx: (cc) => { G(cc, "gr_breathe"); },
      hurt_ctx: (cc) => { G(cc, "gr_careful"); },
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
  expectValve(c);
}

/** He waits while the learner goes to the breaker box ("Listo, ya está."). */
function expectValve(c: Ctx) {
  c.expect({
    id: "valve", optional: true, expects: ["water_off", "water_not_off", "valve_done_ctx", "switch_unknown_ctx", "no_power", "towels_done"], hints: ["details"],
    suggest: [{ lt: "Say you've switched off the power", hint: "details" }],
    on: {
      // ("Listo, ya los bajé." is two pieces: one "Perfecto.")
      water_off: (cc) => { cc.s.waterOff = true; if (once(cc, "g_perfect")) G(cc, "gr_perfect"); },
      valve_done_ctx: (cc) => { cc.s.waterOff = true; if (once(cc, "g_perfect")) G(cc, "gr_perfect"); },
      water_not_off: (cc) => { G(cc, "gr_valve_later"); },
      switch_unknown_ctx: (cc) => { G(cc, "gr_valve_later"); },
      // "No hay luz.": switched off all the same, in case it comes back; he still waits
      no_power: (cc) => { cc.s.noPower = true; G(cc, "gr_no_power"); expectValve(cc); },
      // "Ya puse toallas.": good, but he is still waiting for the breakers
      towels_done: (cc) => { cc.s.towels = true; G(cc, "gr_power_first"); expectValve(cc); },
    },
    yes: (cc) => { cc.s.waterOff = true; if (once(cc, "g_perfect")) G(cc, "gr_perfect"); },
    no: (cc) => { G(cc, "gr_valve_later"); },
  });
}

/** "Ya puse toallas en el piso." / "Ya saqué el agua.": not the power. At his power question (or before the power is
 *  known to be off, when it's a plain report) he says the power comes first and where the breakers are. */
function towelsDone(c: Ctx) {
  c.s.towels = true;
  if (inVm(c)) return;
  if (c.s.waterOff) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  // "Sí, y ya puse toallas": the yes answers the power question
  if (c.step === "g_water" && !c.s.waterDone && /^[^a-z]*si\b/.test(heard(c))) { waterOff(c); return; }
  if (c.step === "g_water" && !c.s.waterDone) { if (once(c, "g_towels")) G(c, "gr_power_first"); waterNotOff(c); return; }
  if (once(c, "g_ack")) G(c, "gr_ok");
}

/** "No hay luz." / "Se fue la luz.": switch it off all the same, in case it comes back. */
function noPower(c: Ctx) {
  c.s.noPower = true;
  if (inVm(c)) return;
  if (c.s.waterOff) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  if (c.step === "g_water") { if (once(c, "g_nopower")) G(c, "gr_no_power"); waterNotOff(c); return; }
  if (once(c, "g_ack")) G(c, "gr_ok");
}

/** "¿Qué hago mientras tanto?": the power first (where the breakers are); once it's off, the water and the things. */
function whatToDo(c: Ctx) {
  if (inVm(c)) return;
  if (!c.s.waterOff) { waterNotOff(c); return; }
  if (once(c, "g_info")) G(c, "gr_meanwhile");
}

/** The request for someone (today, tomorrow or just "alguien"). */
function askPlumber(c: Ctx, seg: Segment) {
  c.s.requested = true;
  const tomorrow = seg.tags.includes("tomorrow");
  if (seg.tags.includes("today") || seg.tags.includes("insist")) c.s.askedToday = true;
  if (inVm(c)) { if (tomorrow) c.s.askedTomorrow = true; return; }
  if (c.s.today || c.s.tomorrow) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  if (tomorrow) { if (once(c, "g_offer")) askSureTomorrow(c); return; }
  // asking for today again after his "¿Podría esperar a mañana?" is insisting
  if (c.s.offered && seg.tags.includes("today") && grantKnows(c)) { insist(c); return; }
  if (once(c, "g_ack") && !grantKnows(c)) G(c, "gr_ok");
}

/** "Me temo que no puede esperar hasta mañana": he gives in at once. */
function insist(c: Ctx) {
  c.s.insisted = true;
  c.s.askedToday = true;
  c.s.requested = true;
  if (inVm(c)) return;
  if (c.s.today) { if (once(c, "g_ack")) G(c, "gr_ok"); return; }
  if (!grantKnows(c)) return;
  todayNow(c);
}

function todayNow(c: Ctx) {
  if (c.s.today || !once(c, "g_today")) return;
  // "¡Ay, no, tiene razón!" only takes back his own "¿Podría esperar a mañana?" / "¿Está seguro?"
  const tookBack = !!c.s.offered || !!c.s.sureQ;
  c.s.today = true;
  c.s.tomorrow = false;
  c.s.sureQ = false;
  if (tookBack) G(c, "gr_ten_a");
  G(c, "gr_ten_b");
  G(c, "gr_joe");
}

/** "No sé." to "¿Podría esperar a mañana?": he doesn't risk it; the time question follows at once. */
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

/** "¿Está seguro? Suena a mucha agua." (his own second thoughts: one more chance) */
function askSureTomorrow(c: Ctx) {
  c.s.sureQ = true;
  G(c, c.s.downstairs ? "gr_sure_down" : "gr_sure");
  c.expect({
    id: "sure_tomorrow", expects: ["insist_today", "insist_ctx", "wait_no_ctx", "wait_yes_ctx", "sure_ctx", "accept_tomorrow", "ask_plumber", "downstairs_yes", "flood", "no_rush_ctx", "tomorrow_ctx", "unsure_ctx"],
    hints: ["insist"],
    suggest: [{ lt: "Ask again for someone today", hint: "insist" }, { lt: "Agree to tomorrow", hint: "insist" }],
    on: {
      insist_today: (cc) => { todayNow(cc); },
      insist_ctx: (cc) => { todayNow(cc); },
      wait_no_ctx: (cc) => { todayNow(cc); },
      wait_yes_ctx: (cc) => { tomorrowFinal(cc); },
      sure_ctx: (cc) => { tomorrowFinal(cc); },
      downstairs_yes: (cc) => { cc.s.downDone = true; cc.s.downstairs = true; todayNow(cc); },
      flood: (cc) => { todayNow(cc); },
      accept_tomorrow: (cc) => { tomorrowFinal(cc); },
      no_rush_ctx: (cc, _sl, sg) => { if (sg.tags.includes("amb")) return false; tomorrowFinal(cc); },
      tomorrow_ctx: (cc) => { tomorrowFinal(cc); },
      unsure_ctx: (cc) => { todayNow(cc); },
      // "No sé.": he doesn't risk it (and doesn't ask "¿Está seguro?" again once it's today)
      g_dontknow: (cc) => { dontKnowToday(cc); },
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

/** The plumber's time: eleven or one. */
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
    // "¿A las once y media?": he does eleven or one, nothing in between
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

/** Thanks to Don Gilberto (formal or not). */
function thankGrant(c: Ctx, kind: "formal" | "plain" | "love" | "apology" | "regards") {
  if (inVm(c)) { c.s.vmThanks = true; if (c.s.requested) vmEnd(c); else vmSilent(c); return; }
  c.s.thanked = true;
  if (!once(c, "g_thanks")) return;
  if (kind === "love") { G(c, "gr_love_you"); return; }
  if (kind === "apology") { G(c, "gr_inconvenience"); return; }
  if (kind === "regards") { G(c, "gr_regards"); return; }
  if (kind === "formal" && !c.s.promptJoke && /\bpronta atencion\b/.test(heard(c))) { c.s.promptJoke = true; G(c, "gr_prompt"); return; }
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

/** A goodbye to Don Gilberto before a plumber is agreed: once he asks to stay; the second time the call ends. */
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
  not_ok_ctx: (c) => { c.s.okayDone = true; if (once(c, "l_ack")) L(c, "l_breathe"); },
  freaking_out: (c) => { c.s.okayDone = true; if (once(c, "l_ack")) L(c, "l_breathe"); },
  ask_help: (c, sl, sg) => { askHelp(c, sl, sg); },
  item_ctx: (c, sl, sg) => { askHelp(c, sl, sg); },
  need_nothing: (c) => { needNothing(c); },
  not_item: (c, sl) => { notItem(c, sl); },
  come_no: (c) => { c.s.comeDone = true; c.s.coming = false; if (!c.s.helpAnswered) needNothing(c); else if (once(c, "l_come")) L(c, "l_not_coming"); },
  warm: (c) => { lizzieWarm(c, "love"); },
  see_you: (c) => { lizzieWarm(c, "bye"); },
  formal_thanks: (c) => { lizzieWarm(c, "bye"); },
  kind_regards: (c) => { lizzieWarm(c, "bye"); },
  apologize: (c) => { cancelBrunch(c); },
  sorry_ctx: (c) => { cancelBrunch(c); if (!c.s.brunchOkSaid && once(c, "l_brunch")) { c.s.brunchOkSaid = true; L(c, "l_brunch_ok"); } },
  unsure_ctx: (c) => { if (once(c, "l_ack")) L(c, "l_ack"); },
  // "Hola, soy Ryan." / "¡Soy yo!": she knows (her phone shows the name)
  intro: (c) => { if (once(c, "l_know")) L(c, "l_i_know"); },
  its_me: (c) => { if (once(c, "l_know")) L(c, "l_i_know"); },
  sure_ctx: (c) => { if (c.step === "l_come") sureNotComing(c); else if (once(c, "l_ack")) L(c, "l_ack"); },
  door_surprise: (c) => { doorSurprise(c); },
  // "¿Puedes venir hoy?" to Andrea: she comes over
  ask_plumber: (c, _sl, sg) => { if (/\b(venir|vienes|vengas|pasar|pasas)\b/.test(heard(c))) askHelp(c, {}, { ...sg, tags: [...sg.tags, "come"] }); else if (once(c, "l_ack")) L(c, "l_ack"); },
  // "¿A qué hora llegas?": she's coming (asked before she is, it takes up her offer to come by)
  ask_eta: (c) => {
    if (!c.s.coming) askHelp(c, {}, COME_SEG);
    if (c.s.twist === "door" && !c.s.doorDone) return; // she's already outside: the door step comes next
    if (c.s.coming && once(c, "l_eta")) L(c, "l_on_way");
  },
  // "¿Qué hago?" to Andrea
  ask_what_do: (c) => { if (once(c, "l_ack")) L(c, "l_breathe"); },
  vm_unknown: (c, _sl, sg) => { vmMessage(c, sg); },
};

/** "¡Te quiero, gracias!" / "¡Eres la mejor!": at the door it's the thanks, else (once help is settled) goodbye. */
function lizzieWarm(c: Ctx, kind: "love" | "bye") {
  if (c.s.twist === "door" && c.step === "l_door" && !c.s.doorDone) { doorThanks(c); return; }
  // only "te quiero / te amo" gets "¡Yo también te quiero!" ("¡Te debo una!" gets "¡Para eso estamos!")
  if (c.s.helpAnswered && (c.s.twist !== "door" || c.s.doorDone)) {
    c.s.comeDone = true;
    byeLizzie(c, kind === "love" ? (/\bte (quiero|amo)\b/.test(heard(c)) ? "love" : "warm") : kind);
    return;
  }
  if (once(c, "l_ack")) L(c, "l_anytime");
}

/** "¿Qué haces aquí?" / "¡No manches!" at the door: "¡Para eso están las amigas!", then the call to Don Gilberto. */
function doorSurprise(c: Ctx) {
  if (c.s.twist !== "door" || c.step !== "l_door" || c.s.doorDone) return;
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

/** "¿Entonces hoy o mañana?" (a lost comma); asked again, the shorter "¿le parece bien mañana?" */
function whichDay(c: Ctx) { G(c, c.s.whichDay ? "gr_offer_again" : "gr_which_day"); c.s.whichDay = true; c.hold(); }

/** After his "¿Podría esperar a mañana?", the water downstairs (or still coming in) is the reason it can't. */
function reasonToday(c: Ctx) { if (c.s.offered && !c.s.today && !c.s.tomorrow && grantKnows(c)) insist(c); }

/** "¡Bye!" / "Ok" / "Gracias" read as a bare {name} at "¿Quién habla?" */
const NOT_A_NAME = /^(bye|bai|adios|chao|chau|hola|ok|okey|okay|gracias|bueno|si|no|perdon|oye|vale|nada|alo|diga)$/;
const fakeName = (sl: any) => typeof sl?.name === "string" && NOT_A_NAME.test(sl.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim());

const GRANT: Record<string, H> = {
  intro: (c) => { identified(c); },
  intro_ctx: (c, sl) => {
    if (fakeName(sl)) { if (/^(bye|bai|adios|chao|chau)$/.test(heard(c).replace(/[^a-z]/g, ""))) { if (inVm(c)) vmEnd(c); else grantBye(c); } return; }
    identified(c);
  },
  // in the voicemail a name counts only when it's the player's own (or comes with the apartment)
  vm_who_ctx: (c, sl, sg) => { if (sg.tags.includes("known_name") || sl?.aptn != null || /\b([13] ?b|tres b|uno b)/.test(heard(c))) identified(c); },
  its_me_ctx: (c) => { if (c.s.who || inVm(c)) return; if (once(c, "g_me")) G(c, "gr_its_me"); },
  its_me: (c) => { if (c.s.who || inVm(c)) return; if (once(c, "g_me")) G(c, "gr_its_me"); },
  flood: (c) => {
    if (c.s.gFlood && !inVm(c) && c.s.offered && !c.s.today && !c.s.tomorrow) { reasonToday(c); return; }
    c.s.guessed = false; grantFlood(c);
  },
  when_happened: (c) => { c.s.sinceDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_ok"); },
  when_ctx: (c) => { c.s.sinceDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_ok"); },
  water_off: (c) => { waterOff(c); },
  water_not_off: (c) => { waterNotOff(c); },
  towels_done: (c) => { towelsDone(c); },
  no_power: (c) => { noPower(c); },
  ask_what_do: (c) => { whatToDo(c); },
  // "¿Le aviso a Don Ernesto?": the owner (s81, p29), downstairs; the pipes are the building's, so Don Gilberto tells him
  ask_owner: (c) => { if (!inVm(c) && once(c, "g_info")) G(c, "gr_owner"); },
  // "Ya." / "Listo." to "¿Ya bajó el switch de la luz?" (the step's own short yes)
  valve_done_ctx: (c) => { if (inVm(c)) return; if (c.step === "g_water" && !c.s.waterDone) { waterOff(c); return; } if (once(c, "g_ack")) G(c, "gr_ok"); },
  nobody_hurt: (c) => { nobodyHurt(c); },
  freaking_out: (c) => { c.s.hurtDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_breathe"); },
  downstairs_yes: (c) => { downstairs(c, true); reasonToday(c); },
  downstairs_no: (c) => { downstairs(c, false); },
  down_yes_ctx: (c) => { downstairs(c, true); reasonToday(c); },
  down_no_ctx: (c) => { downstairs(c, false); },
  ask_plumber: (c, _sl, sg) => { askPlumber(c, sg); },
  // "No hace falta que venga hoy" at his tomorrow offer: tomorrow is fine
  no_rush_ctx: (c, _sl, sg) => {
    if (inVm(c)) return;
    if (sg.tags.includes("amb")) { if (!c.s.today && !c.s.tomorrow && once(c, "g_offer_amb")) whichDay(c); return; }
    c.s.requested = true; acceptTomorrow(c);
  },
  // a bare "Mañana." at his offer (or after "¿hoy o mañana?")
  tomorrow_ctx: (c) => { acceptTomorrow(c); },
  today_ctx: (c, _sl, sg) => { askPlumber(c, { ...sg, tags: [...sg.tags, "today"] }); },
  insist_today: (c) => { insist(c); },
  insist_ctx: (c) => { insist(c); },
  accept_tomorrow: (c) => { acceptTomorrow(c); },
  wait_no_ctx: (c) => { insist(c); },
  wait_yes_ctx: (c) => { acceptTomorrow(c); },
  plumber_ctx: (c, _sl, sg) => { askPlumber(c, sg); },
  sure_ctx: (c) => { if (inVm(c)) return; if (c.s.sureQ && !c.s.today && !c.s.tomorrow) { tomorrowFinal(c); return; } if (once(c, "g_ack")) G(c, "gr_ok"); },
  vm_unknown: (c, _sl, sg) => { vmMessage(c, sg); },
  pick_time: (c, sl, sg) => { pickTime(c, sl, sg); },
  // "A las once no puedo": the other time (or the one named after "sino")
  time_not: (c, sl, sg) => {
    if (sg.tags.includes("amb")) { if (!inVm(c) && once(c, "g_time")) { G(c, "gr_which"); c.hold(); } return; }
    const h = sl?.time2?.h ?? (sl?.time?.h % 12 === 11 ? 1 : sl?.time?.h % 12 === 1 ? 11 : undefined);
    pickTime(c, h != null ? { time: { h, m: 0 } } : {}, sg);
  },
  time_ctx: (c, sl, sg) => { pickTime(c, sl, sg); },
  ask_confirmed: (c) => { askConfirmed(c); },
  // "¿A qué hora llega el plomero?" / "¿…exactamente?" at the time question is about the plumber's time
  ask_eta: (c) => { if (inVm(c)) return; if (/plomero|exacta/.test(heard(c)) || (c.step === "g_time" && !c.s.timeSet)) { askConfirmed(c); return; } if (once(c, "g_info")) G(c, c.s.today ? "gr_eta" : "gr_first_today"); },
  // "No estoy bien" / "No, estoy bien" (the comma is lost): he asks "¿Cómo? ¿Usted está bien?" rather than guess
  fine_ctx: (c) => { if (inVm(c)) { nobodyHurt(c); return; } if (c.step === "g_hurt" && !c.s.hurtDone) { hurtYes(c); return; } nobodyHurt(c); },
  // "Me corté el pie": somebody is hurt
  hurt_ctx: (c) => { if (inVm(c)) return; if (!c.s.hurtAsked2) { c.s.hurtAsked2 = true; hurtYes(c); return; } c.s.hurtDone = true; if (once(c, "g_ack")) G(c, "gr_careful"); },
  not_ok_ctx: (c) => { c.s.hurtDone = true; if (!inVm(c) && once(c, "g_ack")) G(c, "gr_breathe"); },
  switch_unknown_ctx: (c) => { waterNotOff(c); },
  ask_damage: (c) => { if (inVm(c)) return; c.s.damageAsked = true; if (once(c, "g_info")) G(c, "gr_damage"); },
  formal_thanks: (c) => { thankGrant(c, "formal"); },
  apologize: (c) => { thankGrant(c, "apology"); },
  kind_regards: (c) => { thankGrant(c, "regards"); },
  vm_close: (c) => { if (inVm(c)) { c.s.vmClose = true; vmEnd(c); return; } if (once(c, "g_ack")) G(c, "gr_ok"); },
  warm: (c) => { c.tip(TIPS.love_landlord); thankGrant(c, "love"); },
  see_you: (c) => { if (inVm(c)) { vmEnd(c); return; } grantBye(c); },
  demand_rude: (c) => { c.tip(TIPS.rude); if (inVm(c)) { c.s.requested = true; return; } c.s.requested = true; if (once(c, "g_ack")) G(c, "gr_rude"); },
  thats_all: (c) => { if (inVm(c)) { vmEnd(c); return; } c.s.closeNo = true; if (heardThanks(c)) c.s.thanked = true; },
  // "No estoy seguro." / "No revisé." to "¿Ya pasó el agua al departamento de abajo?" / "¿Desde cuándo?"
  unsure_ctx: (c) => { unsure(c); },
};

function unsure(c: Ctx) {
  if (inVm(c)) return;
  // "No sé si puede esperar." to "¿Podría esperar a mañana?": he doesn't risk it
  if (c.step === "g_offer" && !c.s.today && !c.s.tomorrow) { dontKnowToday(c); return; }
  if (c.step === "g_down") { c.s.downDone = true; if (once(c, "g_down")) G(c, "gr_down_unknown"); return; }
  if (c.step === "g_since") c.s.sinceDone = true;
  if (once(c, "g_ack")) G(c, "gr_ok");
}

const ALL_INTENTS = [
  "cancel_brunch", "flood", "cat_fridge", "nobody_hurt", "freaking_out", "ask_help", "item_ctx", "need_nothing", "not_item", "come_no",
  "warm", "see_you", "intro", "intro_ctx", "its_me", "when_happened", "when_ctx", "water_off", "water_not_off", "downstairs_yes",
  "downstairs_no", "ask_plumber", "today_ctx", "insist_today", "accept_tomorrow", "pick_time", "time_ctx", "ask_confirmed", "ask_eta",
  "ask_damage", "formal_thanks", "apologize", "kind_regards", "vm_close", "demand_rude", "thats_all", "unsure_ctx",
  "vm_who_ctx", "its_me_ctx", "sure_ctx", "hurt_ctx", "door_surprise", "insist_ctx", "down_yes_ctx", "down_no_ctx", "wait_yes_ctx", "wait_no_ctx",
  "plumber_ctx", "vm_unknown", "valve_done_ctx", "time_not", "fine_ctx", "not_ok_ctx", "switch_unknown_ctx", "no_rush_ctx", "sorry_ctx", "tomorrow_ctx",
  "towels_done", "no_power", "ask_what_do", "ask_owner",
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
  l_okay: "Estoy bien, solo mis calcetines.", l_brunch: "Sí, perdón, no voy a poder ir.", l_come: "No, de verdad, estoy bien. ¡Disfruta el desayuno!",
  l_door: "¡Me salvaste la vida!", l_bye: "¡Te quiero, gracias!",
  g_who: "Buenos días, Don Gilberto. Le habla Ryan Miller, del departamento 1B.", g_since: "Empezó anoche, como a las tres de la mañana.",
  g_hurt: "No, nadie se lastimó.", g_down: "Sí, me temo que ya está pasando al departamento de abajo.", g_water: "Sí, ya bajé el switch de la luz.",
  valve: "Listo, ya lo bajé.", g_request: "Le agradecería mucho que mandara a alguien hoy.",
  g_offer: "Me temo que no puede esperar hasta mañana.", sure_tomorrow: "La verdad, tiene que ser hoy.",
  g_time: "A las once sería perfecto.", g_close: "Muchas gracias por su pronta atención.",
  hurt_yes: "Sí, estoy bien, solo mojado.",
  vm_msg: "Buenos días, Don Gilberto. Le habla Ryan Miller, del departamento 1B. Le agradecería mucho que mandara a alguien hoy. Saludos cordiales.",
  closing: "Muchas gracias por su pronta atención.",
};

// ---------------------------------------------------------------------------

export const flood: SituationDef = {
  id: "p24-flood",
  song: "P24",
  songTitle: "Kind Regards, I'm Drowning",
  title: { en: "Saludos cordiales, me estoy ahogando", lt: "Kind Regards, I'm Drowning" },
  topic: { en: "Dos llamadas: a una amiga y al administrador", lt: "Two calls: casual and formal" },
  chapter: 9,
  order: 2,
  location: "phone",
  npc: "lizzie",
  npcs: ["mr_grant"],
  mode: "phone",
  goal: "Call your friend and the building manager: tell Andrea casually (tú), explain it to Don Gilberto politely and formally (usted), and get someone sent over today.",
  intro: "Saturday, 8:30 in the morning at Departamentos Las Palmas, and your feet are wet: in the night a pipe burst in 2B, the apartment upstairs, and the water came in through your kitchen ceiling. There's a river on the floor, and the cat is glaring at you from the top of the fridge. First call your friend Andrea (you were meeting her for breakfast at nine), then Don Gilberto, the building manager: the building's pipes are his job. Same facts, two tones.",
  entities: { stuff: STUFF },

  grammar: {
    macros: {
      home: "(el depa | mi depa | el departamento | mi departamento | el apartamento | mi apartamento | el piso | mi piso | la casa | mi casa | la cocina | la sala | todo | toda la casa | todo el depa | todo el departamento)",
      by: "(por el techo | por la azotea | por la puerta | por debajo de la puerta | por la ventana | por las ventanas | del techo)",
      // when or why (the night, the pipe upstairs; a learner's storm or rain is still understood)
      storm: "(con la tormenta | por la tormenta | con la lluvia | por la lluvia | anoche | en la noche | durante la noche | en la madrugada | por (un | el) tubo [roto | reventado] [@up] | por una fuga [@up] | por (la | una) tuberia [rota] [@up] | por los de arriba)",
      // upstairs: 2B (the lead's decision, 5 Nov 2026)
      up: "(en el 2b | en el 2 b | en el dos b | en el dos be | del 2b | del 2 b | del dos b | del dos be | arriba | de arriba | en el de arriba | del de arriba | en el departamento de arriba | del departamento de arriba | en el depa de arriba | del depa de arriba | en el apartamento de arriba | del apartamento de arriba | de los de arriba | de los vecinos de arriba | en el piso de arriba | del piso de arriba)",
      pipe: "(un tubo | el tubo | una tuberia | la tuberia | una caneria | la caneria | un cano)",
      // the flood, said casually or neutrally
      fl: [
        "[guey #casual | amiga] (se me inundó | se me ha inundado | se inundó | se ha inundado) @home [@storm] #h:flooded",
        "@home (se inundó | se ha inundado | esta inundado | esta inundada | esta lleno de agua | esta llena de agua | es una alberca | es un lago | es un rio) [@storm]",
        "hay agua (por todos lados | por todas partes | en todo el depa | en todo el departamento | en todo el apartamento | en el piso | en la cocina | en toda la casa | en la sala | en todos lados) [@storm] #h:water_everywhere",
        "(hay | tengo) un (rio | lago | mar | charco enorme) en (la cocina | el piso | mi depa | la sala | mi casa) #h:river",
        "(entró | se metió | se filtró | se ha metido | ha entrado | se esta metiendo | esta entrando) [el | mucha] agua [@by] [@storm]",
        "(hay | tengo) (goteras | una gotera | muchas goteras | filtraciones | una filtracion) [muy grande | enorme | grande | enormes] [en (el techo | la cocina | la sala | toda la sala | todo el depa | todo el departamento | todo el apartamento | la recamara)] [@storm]",
        "(se me metió | se metió | se me ha metido) [el | mucha] agua (al depa | a mi depa | al departamento | a mi departamento | al apartamento | a mi apartamento | a la casa | a mi casa | a la cocina) [@by] [@storm]",
        "(se tapó | esta tapada | se ha tapado) la coladera [de la azotea] [y (entró | se metió | se filtró) [el] agua [@by]]",
        // the pipe that burst upstairs
        "(se reventó | reventó | se rompió | se tronó | tronó | ha reventado | se ha roto | ha estallado) @pipe [@up] [y (entró | se metió | se filtró | esta entrando | esta cayendo | cae) [el | mucha] agua [@by]] #h:pipe",
        "@up se (reventó | rompió | tronó) @pipe [y (entró | se metió | se filtró | esta entrando | esta cayendo | cae) [el | mucha] agua [@by]]",
        "(hay | tienen) una fuga [de agua] @up", "(los de arriba | los del 2b | los del dos be | el 2b | el dos be) (tienen | tuvieron) una fuga [de agua] [y [me] (esta cayendo | cae | esta entrando | entra) [el | mucha] agua [del techo | por el techo]]",
        // his or her guess confirmed: "Sí, otra vez la tubería del 2B" / "Sí, otra vez los de arriba"
        "[si] [es] otra vez (la tuberia | el tubo | la fuga | los de arriba | el 2b | el dos be) [@up]",
        "(el agua | la fuga) (viene | sale | esta saliendo | esta cayendo) @up",
        "[me] (cae | esta cayendo | sale | esta saliendo) agua del techo",
        "la (tormenta | lluvia) (me inundó | inundó) @home",
        "(estoy | ando) nadando en (mi depa | la cocina | mi cocina | mi casa | mi departamento | la sala | mi sala)",
        "mis (calcetines | zapatos | pies | calcetas) (estan | andan) (mojados | mojadas | flotando | empapados | empapadas | nadando)",
        "(el techo | la azotea) (gotea | esta goteando | sigue goteando | tiene goteras | se esta filtrando)",
        "(sigue | esta) (entrando | cayendo | goteando) agua",
        "hay (mucha agua | agua | un chorro de agua) en (mi casa | la casa | el depa | mi depa | mi departamento | el departamento | mi apartamento | el apartamento | la cocina | mi cocina | la sala)",
        "(tengo | hay) agua hasta (los tobillos | las rodillas | la puerta)",
        "@storm (entró | se metió | se filtró) [mucha | el] agua [@by]",
        "llovió (mucho | muchisimo) (y | asi que) (se inundó | se me inundó) @home",
        "(tengo | tenemos) una inundacion [en (la casa | el depa | mi depa | el departamento | el apartamento)]",
        "(es | fue) un desastre",
      ],
      cant_brunch: "(no voy a poder (ir | llegar) | no puedo (ir | llegar) | no llego | no voy a llegar | no voy a ir | no voy) [al desayuno] [hoy]",
      what_formal: [
        "(el departamento | el apartamento | la cocina | mi departamento | mi apartamento | la sala | el piso) (se inundó | se ha inundado | esta inundado | esta inundada | sufrió una inundacion) [@storm]",
        "(se inundó | se ha inundado) (el departamento | el apartamento | la cocina | mi departamento | mi apartamento | la sala | el piso) [@storm]",
        "(entró | se filtró | ha entrado | se ha filtrado) [el] agua (@by | en el departamento | en el apartamento | en la cocina) [@storm]",
        "hay (una filtracion | filtraciones | una inundacion | goteras) en (el departamento | el apartamento | la cocina | el techo | la sala) [@storm]",
        "la coladera de la azotea se tapó [y entró agua [@by]]",
        "(se reventó | se rompió) @pipe [@up]", "@up se (reventó | rompió) @pipe", "hay una fuga [de agua] @up",
        "(entró | esta entrando | esta cayendo) agua @up",
        "@storm (se inundó | entró agua en) (el departamento | el apartamento | la cocina)",
      ],
      // "today" for the plumber (#today); a few of them are formal
      today: [
        "(hoy | hoy mismo | hoy en la manana | ahorita | ahora | ahora mismo | lo antes posible | lo mas pronto posible | cuanto antes | de inmediato | rapido | en cuanto pueda) #today",
        "(a la brevedad | a la mayor brevedad [posible] | con urgencia) #today #formal",
      ],
      // 1B is the learner's (s81, s82, p29); any number is taken
      aptno: "(1b | 1 b | uno b | uno be | 3b | 3 b | tres b | tres be | {aptn:number} (a | b | c | d | be) | {aptn:number})",
      apt: "[departamento | depa | apartamento | piso | numero | interior] @aptno",
      down: "(al departamento de abajo | al apartamento de abajo | al depa de abajo | al de abajo | abajo | con la vecina [de abajo] | con el vecino [de abajo] | con los vecinos [de abajo] | con los de abajo | a la vecina [de abajo] | al vecino [de abajo] | al piso de abajo | con don ernesto | a don ernesto | al departamento de don ernesto | al depa de don ernesto | al apartamento de don ernesto | a la casa de don ernesto)",
      plumber: "(un plomero | el plomero | su plomero | alguien | a alguien | un tecnico | alguien de mantenimiento | un albanil | un fontanero | una persona | a su plomero | a un plomero)",
      sorry: "(perdon | lo siento | sorry | una disculpa | perdoname)",

      // --- the pieces of a report to Don Gilberto: the intents below use them, and so does a voicemail said in one
      // breath (vm_unknown: four or more pieces; the engine takes at most three intents per turn, see NEEDS 1)
      who: [
        "(le habla | habla | soy | es) {name} [su (inquilino | inquilina)] (del | de el) @apt #h:this_is_apt",
        "(mi nombre es | me llamo) {name} [y] [vivo] (en el | del) @apt",
        "soy (su | el | la) (inquilino | inquilina) [del | de el] @apt #h:tenant_in",
        "(le habla | habla) su (inquilino | inquilina) [del | de el] @apt",
        "(le hablo | le llamo | lo llamo | le marco | llamo) (del | desde el) @apt #h:calling_from",
        "(mi nombre es | me llamo) {name} [y] soy su (inquilino | inquilina) [del @apt]",
        "[soy yo] (soy | es) (el | la) del @apt",
        "soy yo (el | la) del @apt",
        "vivo en el @apt",
        "(es | habla) el @apt",
      ],
      report: [
        "@fl",
        "lamento informarle [de] que @what_formal #h:regret #formal #regret",
        "(le llamo | le hablo | lo llamo | le marco) para (informarle | avisarle | comunicarle | notificarle) [de] que @what_formal #h:inform #formal #regret",
        "(le llamo | le hablo | lo llamo) para (reportar | avisarle de) (una filtracion | una inundacion | una fuga | un problema | goteras) [en el departamento | en el apartamento | en el techo] #h:report_leak",
        "(le llamo | le hablo | lo llamo) (por | por lo de) (la tormenta | la inundacion | el agua | el techo | las goteras | la fuga [@up] | el tubo [@up] | la tuberia [@up])",
        "me temo que @what_formal #h:afraid_flooded",
        "(le llamo | le hablo | lo llamo | le marco) porque (@what_formal | @fl | (tengo | tenemos | hay) un problema con (el techo | el agua | la azotea | la coladera | las goteras | la tuberia | un tubo | los de arriba))",
        "(quisiera | quiero) reportar (una filtracion | una inundacion | una fuga | goteras)",
        "@what_formal",
        "(tengo | tenemos) un problema con (el techo | el agua | la azotea | la coladera | las goteras | la tuberia | un tubo | los de arriba)",
        "hay un problema con (el techo | el agua | la azotea | la coladera | la tuberia)",
      ],
      when: [
        "(pasó | empezó | comenzó | fue) (anoche | en la noche | esta manana | hoy en la manana | hace una hora | hace un rato | con la tormenta | durante la noche | en la madrugada) [en la madrugada] #h:last_night",
        "(pasó | empezó | comenzó | fue) [anoche | esta manana | en la madrugada] (a | como a | a eso de | alrededor de) {time} [de la manana | de la noche | de la madrugada]",
        "desde (anoche | esta manana | la madrugada | la noche | la tormenta | {time} [de la manana | de la madrugada] | como a {time})",
        "(anoche | esta manana | en la madrugada) (a | como a | a eso de) {time} [de la manana | de la noche | de la madrugada]",
        "hace (una hora | media hora | un rato | unas horas | {number} horas | como una hora | un par de horas | como dos horas)",
        "[no se] me desperté y (habia agua por todos lados | la cocina estaba inundada | todo estaba mojado | ya estaba todo inundado | ya estaba todo mojado | ya habia agua)",
      ],
      // the power switched off (the answer to "¿Ya bajó el switch de la luz?")
      water: [
        "[ya] (bajé | corté | apagué | he bajado | he cortado) (el switch | el interruptor | los breakers | el breaker | la pastilla | las pastillas | la luz | la corriente | la electricidad | los interruptores) [de la luz] [y (puse | tendí) [unas] toallas [en el piso]] #h:power_off",
        "ya (desconecté | apagué) todo",
        "(la luz | la corriente | el switch) ya esta (cortada | apagada | abajo | apagado)",
        "ya (puse | tendí | he puesto) (toallas | unas toallas | todas mis toallas | trapos) [en el piso] y (bajé | corté) (el switch | la luz | el interruptor)",
      ],
      // towels and bailing: no answer to the power question (the audit: they used to switch the power "off")
      towels: [
        "ya (puse | tendí | he puesto) (toallas | unas toallas | todas mis toallas | trapos) [en el piso] #h:towels",
        "ya (saqué | estoy sacando | he sacado) [el] agua [con (una cubeta | el trapeador | un jalador | una cubeta)]",
        "(estoy | ando) (sacando el agua | secando | trapeando)",
      ],
      // the power is out (the water, or the night): he still wants it switched off, in case it comes back
      nopower: [
        "no (hay | tengo | tenemos) (luz | corriente | electricidad)",
        "se (fue | cortó | quitó) (la luz | la corriente | la electricidad) [con la tormenta | anoche | desde anoche]",
        "(estoy | estamos) sin (luz | corriente | electricidad) [desde anoche]",
        "la tormenta (tumbó | cortó | se llevó) (la luz | la corriente)",
        "(con la tormenta | desde anoche) no hay (luz | corriente)",
      ],
      downy: [
        "[me temo que] [el agua] [ya] (esta pasando | pasó | se esta filtrando | se filtró | esta goteando | le esta goteando | le gotea | ha pasado | llegó) @down #h:downstairs",
        "[ya] le (gotea | esta goteando | cae agua) (a la vecina | al vecino | a los de abajo) [de abajo]",
      "a (la vecina | el vecino | los vecinos | los de abajo) [de abajo] (le | les) (esta goteando | gotea | cae agua | esta cayendo agua | esta pasando el agua)",
        "(la vecina | el vecino) [de abajo] (ya subió | subió | vino | me tocó | me tocó la puerta | esta molesta | se esta quejando | ya se quejó | tiene agua [en su departamento] | me habló)",
        // Don Ernesto lives downstairs (s82; the lead's decision, 5 Nov 2026)
        "don ernesto (ya subió | subió | vino | me tocó | me tocó la puerta | esta molesto | se esta quejando | ya se quejó | tiene agua [en su departamento | en su casa] | me habló)",
        "[ya] le (gotea | esta goteando | cae agua | esta cayendo agua) a don ernesto", "a don ernesto (le | ya le) (esta goteando | gotea | cae agua | esta cayendo agua | esta pasando el agua)",
        "[ya] (esta goteando | gotea | hay agua | cae agua | esta cayendo agua) en (el departamento de don ernesto | el depa de don ernesto | el apartamento de don ernesto | la casa de don ernesto)",
        "(el techo | el plafon) de don ernesto (esta mojado | gotea | esta goteando)",
        "[ya] (esta goteando | gotea | hay agua | cae agua | esta cayendo agua) en (el depa de abajo | el departamento de abajo | el apartamento de abajo | el de abajo | casa de la vecina | el departamento de la vecina | el apartamento de la vecina)",
        "(el techo | el plafon) de (la vecina | abajo | el departamento de abajo | el apartamento de abajo | los de abajo) (esta mojado | gotea | esta goteando)",
      ],
      nohurt: ["(nadie | ninguno) (se lastimó | salió lastimado | se ha lastimado | esta lastimado | se ha hecho daño | se hizo daño | esta herido) #h:nobody_hurt", "(todos | todos estamos | estamos todos) bien"],
      req: [
        "(le agradecería | le agradeceria mucho | le agradecería muchísimo) que (mandara | enviara | pudiera mandar) @plumber [@today] #h:grateful_today #formal",
        "(le agradecería | le agradeceria mucho) si (pudiera | puede | podria) (mandar | enviar) @plumber [@today] #formal",
        "(podria | puede | pudiera | me podria | me puede) (mandar | enviar | mandarme | enviarme) @plumber [@today] #h:could_send",
        "(puedes | podrias | me puedes | me podrias) (mandar | mandarme | enviar | enviarme) @plumber [@today] #casual",
        "(podria | puede) (venir | pasar) @plumber [@today] #h:someone_today",
        "(habria | hay) (manera | forma | alguna manera | alguna forma | posibilidad | alguna posibilidad) de que (venga | viniera | pase | pasara) @plumber [@today] #h:any_way",
        "(necesito | ocupo | necesitamos) @plumber [@today]",
        "(necesito | necesitamos) que (venga | vengan | venga a verlo) @plumber [@today]",
        "(necesito | necesitamos) que @plumber (venga | pase) [@today]",
        "que (venga | pase) @plumber [@today]",
        "(mande | manden | mandeme | envie) @plumber [@today]",
        "(quisiera | me gustaria) que (viniera | venga | pasara) @plumber [@today]",
        "(lo | la) (puede | podria) (arreglar | revisar | ver | destapar) [@today]",
      ],
      callback: [
        "(le agradecería que | por favor) me (devuelva | regrese) la llamada [cuando pueda | en cuanto pueda | a la brevedad | cuando escuche esto] #h:vm_call_back",
        "(me puede | me podria | podria | puede) (llamar | marcar | regresar la llamada | devolver la llamada) [cuando pueda | en cuanto pueda | cuando escuche esto]",
        "(llameme | marqueme | regreseme la llamada | devuelvame la llamada) [cuando pueda | en cuanto pueda | cuando escuche esto | por favor]",
        "(llamame | marcame | regresame la llamada) [cuando puedas] #casual",
        "quedo (atento | atenta) a su (llamada | respuesta) #h:look_forward #formal",
        "espero su (llamada | respuesta)",
      ],
      signoff: [
        "(saludos cordiales | atentamente | un cordial saludo | reciba un cordial saludo | saludos) #h:kind_regards #formal",
        "[muchas] gracias por su (pronta atencion | pronta respuesta | atencion | ayuda | comprension) #h:prompt #formal",
        "disculpe (las | la) (molestias | molestia) #h:apologize #formal",
        "(gracias | muchas gracias) [de antemano]",
      ],
      vm_piece: [
        "@who #vm_who", "(habla | le habla | soy) {name} [su (inquilino | inquilina)] #vm_who",
        "@report #vm_flood", "@when #vm_when", "@water #vm_water", "@towels #vm_towels", "@downy #vm_down", "@nohurt #vm_hurt",
        "@req #vm_req", "[me temo que] (no puede | esto no puede | no puede de verdad) esperar [hasta manana | a manana] #vm_req #today",
        "(tiene que | necesita) ser (hoy | hoy mismo) #vm_req #today",
        "@callback #vm_end", "(adios | hasta luego | bye) #vm_end", "@signoff #vm_sign",
      ],
      vm_and: "(y | asi que | ademas | y ademas | tambien | y tambien)",
      thing: "[un | una | unas | unos | mucho | mucha | muchas | muchos | otro | otra | algo de | tu | tus | el | la | las | los | dos | tres | un poco de] {stuff}",
      things: "@thing [y @thing] [y @thing]",
    },
    slots: {},
  },

  intents: {
    // --- Andrea: breakfast, the flood, the cat ------------------------------------------------
    cancel_brunch: { patterns: [
      "[oye | amiga | guey #casual] @cant_brunch [@sorry] #h:cant_make",
      "[si] [@sorry] (no voy a poder | no puedo | no voy a ir) [ir | llegar] [hoy] [@sorry]",
      "(tengo que | voy a tener que | necesito) (cancelar | cancelarte | saltarme | faltar a) [el desayuno] [hoy]",
      "hoy no (puedo | voy a poder) [ir] [al desayuno] [@sorry]",
      "(podemos | mejor) desayunar (otro dia | la otra semana | manana | luego)",
      "(se cancela | cancela) [el desayuno] [para mi]",
      "(no hay | sin) desayuno para mi [hoy]",
      "[mejor] (lo dejamos | lo hacemos | lo pasamos | dejemoslo | lo cambiamos) para (otro dia | la otra semana | el otro fin | el proximo fin de semana | luego | despues | otra ocasion | otra vez) #h:rain_check",
      "(podemos | puedo) (dejarlo | cambiarlo | posponerlo) para otro dia",
      "(perdon | sorry | lo siento) por el desayuno",
      "voy a llegar (tarde | super tarde | muy tarde | tardisimo)",
      "(esto | la cosa) va para largo #h:gonna_while",
      "[querida andrea] lamento (informarte | informarle) [de] que no (podré | voy a poder) (asistir | ir) [al desayuno] #formal #regret",
      "(lamentablemente | desafortunadamente) no (podré | voy a poder) (asistir | ir) [al desayuno] #formal",
      "(debo | me veo obligado a | me veo obligada a) cancelar (el desayuno | nuestro desayuno) #formal",
      "no (podré | voy a poder) asistir [al desayuno] #formal",
    ] },
    flood: { patterns: [
      "@report",
      // "No puedo ir al desayuno, se me inundó el depa." (one piece: after a negation the engine starts no new one)
      "@cant_brunch [@sorry] [es que | porque | ya que] @fl #cancel",
      "@fl [asi que | entonces] (no voy a poder ir | no puedo ir | no llego | no voy a llegar) [al desayuno] #cancel",
      "(el agua | ya) (llegó | va) (a la sala | hasta la puerta | al pasillo | a la recamara)",
      "(estoy | ando) (parado | parada) en el agua",
      "(el agua | agua) (por todos lados | esta saliendo | sigue entrando | no para de entrar | no deja de entrar)",
      "sigue lloviendo [y (sigue entrando agua | entra mas agua)]",
    ] },
    cat_fridge: { patterns: [
      "[y] el gato (esta | se subió | se trepó) (arriba del | encima del | sobre el | encima de la | sobre la | arriba de la) (refri | refrigerador | frigorifico | nevera) [mirandome feo | viendome feo] #h:cat_fridge",
      "(el | mi) gato esta (bien | enojado | ofendido | furioso | molesto | asustado | indignado)",
      "el gato me (esta viendo | ve | mira) feo",
    ] },
    nobody_hurt: { patterns: [
      "[no] @nohurt",
      "[no] (nadie | ninguno) [de verdad]",
      "[no] no me (lastimé | pasó nada | he hecho daño | ha pasado nada)",
      "[si] (estoy bien | todo bien) [solo | nada mas | nomas] [(mojado | mojada | empapado | empapada | un poco mojado | un poco mojada)] [gracias] #h:just_wet",
      "[si] (estoy bien | todo bien) (solo | nomas | nada mas) mis (calcetines | zapatos | pies | calcetas)",
      "[no] (solo | nomas | nada mas) mis (calcetines | zapatos | pies | calcetas)",
      "[si] [estoy bien] (solo | nomas | nada mas) (mojado | mojada | empapado | empapada | con los pies mojados) [gracias]",
      "[si] estoy bien (solo | nomas | nada mas) tengo (los pies | los calcetines | los zapatos) (mojados | empapados)",
      "(solo | nomas) el gato esta (ofendido | enojado | molesto)",
      "estoy [toda | todo | bien | un poco | completamente] (mojado | mojada | empapado | empapada)",
      "(estamos | estoy) (bien | a salvo) [gracias]",
      "(nadie | nadie se lastimó | todos estamos bien) gracias a dios",
      "(estoy bien | yo estoy bien) pero (el depa | mi depa | la casa | mi casa | el departamento | mi departamento | la cocina) no",
    ] },
    // "No, estoy bien" with its comma lost, to "¿Alguien se lastimó?": the likelier reading (rule 10)
    fine_ctx: { patterns: ["no estoy bien [gracias]", "no todo bien"] },
    // "Me corté el pie." to "¿Alguien se lastimó?": somebody is hurt (only there)
    hurt_ctx: { patterns: [
      "[si] [yo] (me lastimé | me corté | me caí | me resbalé | me pegué | me golpeé | me doblé el tobillo) [un poco | tantito] [(el pie | la mano | un dedo | la rodilla | la cabeza | el brazo)] [pero (estoy bien | no es nada)]",
      "[si] (tengo | me hice) una (cortada | herida) [en (el pie | la mano | un dedo)] [pero (estoy bien | no es nada)]",
    ] },
    // "No estoy bien" to "¿Estás bien?" / "¿Usted está bien?": not okay
    not_ok_ctx: { patterns: ["[no] no estoy (bien | nada bien | muy bien)", "[no] la verdad no"] },
    freaking_out: { patterns: [
      "estoy (en panico | entrando en panico | histerico | histerica | volviendome loco | volviendome loca) #h:freaking",
      "[auxilio] (me estoy ahogando | me voy a ahogar) [aqui]",
      "saludos cordiales me estoy ahogando #formal",
      "estoy [muy | super | bien | un poco | algo] (estresado | estresada | nervioso | nerviosa | preocupado | preocupada | asustado | asustada | desesperado | desesperada) [y no se que hacer]",
      "ya no (puedo | aguanto) mas",
      "[estoy (nervioso | nerviosa | preocupado | preocupada | asustado | asustada)] [y] no se que hacer",
    ] },
    // --- Andrea: what to bring -------------------------------------------------------------
    ask_help: { patterns: [
      "(puedes | podrias | me puedes | me podrias) (traer | traerme | llevar | llevarme) @things [de camino | cuando vengas] #h:bring_x",
      "(puedes | podrias) (pasar por | comprar | comprarme | conseguir | conseguirme) @things [de camino] #h:grab_x",
      "(me traes | me llevas | traeme | traes) @things [de camino]",
      "(quiero | quisiera | me gustaria) @things [por favor | si puedes]",
      "(necesito | ocupo | me urge | me hace falta | me hacen falta) @things",
      "@things (seria | serian) (genial | perfecto | lo maximo | de gran ayuda)",
      "[y] (mucho | muchisimo) {stuff} #h:lots_coffee",
      "(tienes | tendras) (un | una | unas | unos) {stuff} [que me prestes | de sobra | extra]",
      "(me ayudas | me puedes ayudar | me ayudarias) [a limpiar | a secar | a sacar el agua | a trapear] #come",
      "[si] (ven | vente | pasa | pasate) (despues del desayuno | despues de desayunar | cuando termines | al rato | luego | despues) #come",
      "si pasate [por aqui] #come",
      // "Una cubeta no, un trapeador": the second item is the answer
      "[un | una | unas | el | la] {drop:stuff} no [sino] @things",
      // "No tengo trapeador": so please bring one
      "no tengo (un | una | unas | unos | mi)? {stuff} [aqui | en casa]",
      "(manda | mandame | trae | traeme) @things [(manda | mandame) (una lancha | un barco)] #h:send_boat",
      // "No necesito toallas, solo un trapeador" (one piece: the refused item is left out)
      "no (necesito | ocupo | quiero) {drop:stuff} (solo | nada mas | nomas | sino) @things",
      "(puedes | podrias) (venir | venirte | pasar) [a ayudarme] [con {stuff}] #h:come_over #come",
      "(ven | vente) [a ayudarme] #come",
      "necesito (ayuda | una mano) #come",
      "(me puedes | me podrias) (ayudar | echar la mano | echar una mano) #come",
      "(le | te) agradecería (que me trajera | que me trajeras | si me trajeras | si pudieras traer | si pudiera traer) @things #formal",
      "(podria | puede) (traerme | traer | llevarme) @things #formal",
      "(le | te) agradecería que (viniera | vinieras) [a ayudarme] #formal #come",
    ] },
    // a bare item, only as an answer to "¿Necesitas algo?"
    item_ctx: { patterns: ["[y] @things"] },
    need_nothing: { patterns: [
      "[no] (estoy bien | todo bien | ando bien) [gracias | de verdad | en serio] #h:no_im_good",
      "[no] [ya] no necesito nada [gracias | de verdad | por ahora]",
      "[no] no me (traigas | lleves) nada [estoy bien] [gracias | de verdad]",
      "[no] (nada | nada de verdad | nada por ahora | de verdad nada) [gracias]",
      "[no] no (tienes que | hace falta que) (venir | traer nada | hacer nada | traerme nada)", "[no] [de verdad] no hace falta [de verdad | gracias]",
      "no te preocupes [disfruta (el desayuno | tu desayuno)] #h:dont_worry",
      "disfruta (el desayuno | tu desayuno)",
      "[no] (ya | yo) lo tengo (controlado | bajo control)",
      "yo puedo (sola | solo)",
      "gracias pero no (sera | es) necesario #formal",
    ] },
    not_item: { patterns: [
      "[no] no (necesito | ocupo | quiero) (un | una | el | la | mas | ningun | ninguna | unas | unos)? {stuff}",
      "no (un | una | el | la) {stuff}",
      "olvida (el | la | las | los) {stuff}",
      "ya tengo (un | una | mi | mis)? {stuff}",
      "ya (compré | tengo) (un | una | unas)? {stuff}",
      "sin {stuff}",
    ] },
    come_no: { patterns: [
      "[no] no (vengas | te vengas | te molestes) [disfruta (el desayuno | tu desayuno)]",
      "[no] quedate (en el desayuno | desayunando)",
      "[no] no (tienes que | hace falta que) venir",
      "[no] no hace falta que (vengas | te molestes) [de veras | de verdad | en serio]",
    ] },
    // warm thanks and goodbyes (Andrea: at the door they thank her, at the end they say goodbye)
    warm: { patterns: [
      "te quiero [gracias | bye] #h:love_you #casual",
      "(gracias | mil gracias) te quiero #casual",
      "te (quiero mucho | amo) #casual",
      "eres (la mejor | lo maximo | un sol | un angel | un amor) #h:youre_best #casual",
      "me (salvaste | salvas | has salvado) [la vida] #h:lifesaver #casual",
      "te debo una #h:owe_you #casual",
      "te debo (un desayuno | un cafe | una grande)",
      "(gracias | mil gracias) amiga #casual",
      "no (tenias | tienes) que (hacerlo | molestarte) #h:didnt_have #casual",
      "no (tenias | tienes) que (traer nada | traerme nada | venir | traer todo eso) #casual",
      "(pasa | pasale) [pasa | pasale] #h:come_in",
    ] },
    // surprise at the door (she answers "¡Para eso están las amigas!")
    door_surprise: { patterns: [
      "que haces aqui",
      "no manches #casual",
      "(en serio | neta) [que haces aqui]",
      "como (supiste | llegaste [tan rapido])",
      "no lo puedo creer",
      "no puede ser [que haces aqui]",
    ] },
    // "Sí, estoy segura." to "¿Segura?" (Andrea) / "¿Está seguro?" (Don Gilberto)
    sure_ctx: { patterns: ["[si] (estoy | estoy muy | estoy totalmente | estoy completamente) (seguro | segura)", "[si] (seguro | segura | segurisimo | segurisima)", "[si] de verdad"] },
    see_you: { patterns: [
      "nos vemos (en un rato | al rato | luego | ahorita | ahi) #h:see_bit #casual",
      "(luego hablamos | hablamos luego | hablamos al rato | al rato hablamos) #h:talk_later",
      "(al rato | luego) nos vemos #casual",
    ] },

    // --- Don Gilberto: who, what, when, what was done ------------------------------------------
    // a bare name ("Soy Ryan.") only answers "¿Quién habla?": elsewhere {name} would swallow other words
    intro: { patterns: ["@who", "soy (su | el | la) (inquilino | inquilina)"] },
    intro_ctx: { patterns: ["{name}", "(mi nombre es | me llamo) {name}", "(soy | habla | le habla | es) {name}", "{name} (al habla | aqui)", "@apt", "soy {name} su (inquilino | inquilina)", "soy yo {name} [del @apt]", "(el | la) del @aptno"] },
    // the voicemail: "Habla Ryan." (the handler takes only the player's own name)
    vm_who_ctx: { patterns: ["(habla | le habla | soy) {name} [su (inquilino | inquilina)]", "soy yo {name} [del @apt]"] },
    its_me: { patterns: ["soy yo [su (inquilino | inquilina)] #casual", "(adivine | adivina) quien (soy | habla) #casual"] },
    its_me_ctx: { patterns: ["(yo | yo mero) #casual"] },
    when_happened: { patterns: [
      "@when",
      "(desde hace | ya lleva | lleva) (una hora | media hora | {number} horas | un rato | unas horas)",
      "(no se | no estoy seguro | no estoy segura) [pero] [creo que] @when",
    ] },
    when_ctx: { patterns: ["[no se] [creo que] [a | como a | a eso de | alrededor de] {time} [de la manana | de la noche | de la madrugada]", "[no se] [creo que] (anoche | en la noche | en la madrugada | esta manana | durante la tormenta | con la tormenta | desde anoche)"] },
    water_off: { patterns: [
      "@water",
      "[si] ya (lo hice | lo bajé | la bajé | la corté | los bajé | lo apagué)",
      "si ya",
    ] },
    // "Ya puse toallas en el piso." (not the power: see towelsDone)
    towels_done: { patterns: ["@towels"] },
    // "No hay luz." / "Se fue la luz con la tormenta."
    no_power: { patterns: ["@nopower"] },
    // "¿Qué hago mientras tanto?"
    ask_what_do: { patterns: [
      "(que | que mas) (hago | puedo hacer | debo hacer | tengo que hacer | hacemos | hago yo) [mientras | mientras tanto | por mientras | mientras llega | mientras llegan | mientras viene | ahorita | ahora | con el agua]",
      "(mientras | mientras tanto | por mientras) (que hago | que puedo hacer | que debo hacer)",
      "que me recomienda (hacer | que haga) [mientras | mientras tanto]",
    ] },
    // "¿Le aviso a Don Ernesto?" (the owner: s81, s82, p29)
    ask_owner: { patterns: [
      "[y] (le aviso | le hablo | le llamo | le marco | aviso | llamo | le digo) (a don ernesto | al dueno | al casero)",
      "(tengo que | debo | hay que | necesito) (avisarle | hablarle | llamarle | decirle | avisar | llamar) (a don ernesto | al dueno | al casero)",
      "(usted le avisa | le avisa usted | usted le dice | le dice usted | usted le habla | le habla usted) (a don ernesto | al dueno | al casero)",
      "(quiere que | debo) (le avise | le hable | le llame | llame) (a don ernesto | al dueno | al casero)",
      "(ya sabe | sabe) (don ernesto | el dueno | el casero)",
      "(don ernesto | el dueno | el casero) (ya sabe | sabe)",
      "(y | que hay de | que pasa con) (don ernesto | el dueno | el casero)",
    ] },
    // "Listo, ya está." while he waits at the breaker box (only there)
    valve_done_ctx: { patterns: ["(listo | ya | ya esta | listo ya esta | ya quedó)"] },
    water_not_off: { patterns: [
      "no se donde (esta | estan) (el switch | el interruptor | los breakers | el cuadro electrico | el cuadro de la luz | el cuadro | los plomos | el diferencial | la caja | la pastilla | las pastillas | los interruptores) #h:dont_know_switch",
      "no (pude | puedo) (bajar | cortar | apagar) (el switch | la luz | el interruptor | los breakers | la corriente)",
      "no (encuentro | encontré | he encontrado) (el switch | el interruptor | los breakers | la caja | la pastilla | las pastillas)",
      "(todavia | aun) hay (luz | corriente)",
      "no (he bajado | bajé | corté | he cortado | apagué) (el switch | la luz | el interruptor | los breakers | la corriente) [todavia]",
      "no se (como | como se) (baja | corta | apaga) (la luz | el switch | la corriente)",
      "(todavia | aun) no (lo bajo | lo he bajado | la corto | la he cortado | lo encuentro | los encuentro | lo hago)",
    ] },
    downstairs_yes: { patterns: [
      "[si] [creo que si | me temo que si | parece que si] @downy",
      "[si] (gotea | esta goteando | cae agua) abajo",
    ] },
    downstairs_no: { patterns: [
      "[no] (el agua | todavia) no (ha pasado | pasó | llegó | ha llegado) [todavia] [abajo | al de abajo | al departamento de abajo | al apartamento de abajo | con la vecina | con don ernesto | al departamento de don ernesto] [todavia]",
      "(con don ernesto | a don ernesto) (todavia no | no) [ha pasado | le gotea | le ha pasado nada | hay agua]", "[no] don ernesto no tiene agua [todavia]",
      "abajo (esta todo bien | todo bien | no hay agua | esta seco | no pasa nada)",
      "[no] abajo no",
      "[no] (solo | nomas | nada mas) (en | es) (mi depa | la cocina | mi departamento | mi apartamento | mi cocina | la sala)",
      "[no] es (solo | nomas) (mi | la) (cocina | departamento | apartamento | sala)",
    ] },
    // short answers to "¿Ya pasó el agua al departamento de abajo?"
    down_yes_ctx: { patterns: ["[si] (ya pasó | ya llegó | me temo que si | parece que si)", "[si] ya esta goteando"] },
    down_no_ctx: { patterns: ["[no] (todavia no | aun no | creo que no | espero que no | parece que no | ojala que no)", "[no] no ha pasado [todavia]"] },

    // --- Don Gilberto: the plumber -----------------------------------------------------------------
    ask_plumber: { patterns: [
      "@req",
      // "¿Puede venir hoy?" (to Andrea: she comes over)
      "(podria | puede | puedes) (venir | pasar) [a (verlo | revisarlo | arreglarlo | ayudarme)] [@today]",
      "(podria | puede) (mandar | enviar) @plumber manana [en la manana | temprano] #tomorrow",
      "(podria | puede) (venir | pasar) @plumber manana [en la manana | temprano] #tomorrow",
    ] },
    today_ctx: { patterns: ["[un plomero] @today [si se puede | de ser posible | si es posible]"] },
    // "Un plomero." to "¿Y qué necesita de mí?"
    plumber_ctx: { patterns: ["@plumber [@today]", "(un plomero | alguien) (que lo arregle | que lo revise | para arreglarlo | que destape la coladera) [@today]"] },
    insist_today: { patterns: [
      "[me temo que] [no] (no puede | esto no puede | eso no puede) esperar [hasta manana | a manana] #h:cant_wait",
      // (the learner's "no puedo" was read as "no puede" until the persons of poder were told apart: lang.ts)
      "[me temo que] [no] (no puedo | ya no puedo | no podemos) esperar [hasta manana | a manana]",
      "[no] manana (es | seria) (muy tarde | demasiado tarde) [me temo]",
      "manana no (me sirve | puedo | es posible | funciona | se puede)",
      "[no] manana no [me temo]",
      // "Mañana no, tiene que ser hoy" in one piece (else "no tiene que ser hoy" would be read on its own)
      "manana no [me temo] [porque] (tiene que | necesita | debe) ser (hoy | hoy mismo)",
      "(tiene que | tendria que | necesita | debe) ser (hoy | hoy mismo) #h:really_today",
      "[ya le dije que | le repito que | de verdad] (es | esto es) (urgente | una emergencia | muy urgente | bastante urgente)",
      "no creo que (pueda | se pueda) esperar [hasta manana | a manana]",
      "no estoy (seguro | segura) de que pueda esperar [hasta manana | a manana]",
      "(hay | habria) (manera | forma | posibilidad) de que (sea | venga | venga alguien) hoy",
      "le agradecería [mucho] que (fuera | viniera | viniera alguien) hoy #h:appreciate_today #formal",
      "hoy si es posible",
      "no (puedo | podemos) esperar (hasta | a) manana",
      "(seria | es) mejor hoy",
      "la verdad (tiene que | necesita) ser hoy",
      "[tiene razon | bueno | no] mejor (hoy | que sea hoy | que venga hoy) [no manana]",
      "(podria | puede) ser hoy",
      "(prefiero | preferiria) (hoy | que sea hoy | que venga hoy)",
    ] },
    // "No hace falta que venga hoy" / "No urge": at the plumber questions only, it can wait
    no_rush_ctx: { patterns: [
      "[no] no (hace falta | es necesario | urge | tiene que ser) que (venga | vengan | mande | manden | sea | venga alguien | venga el plomero | mande a alguien) [hoy | ahorita | ahora | hoy mismo]",
      "[no] no (urge | es tan urgente | corre prisa)",
      // "No es urgente" / "No, es urgente", "Hoy no, mañana" / "Hoy, no mañana": the comma is lost (rule 10), so he asks
      // (a bare "Hoy no" is not today: he still checks "¿Está seguro?")
      "no es urgente #amb",
      "(hoy no manana | manana no hoy) #amb",
      "[no] hoy no [puede ser | se puede]",
      "no (esta bien | me parece bien | me queda bien) manana #amb",
      // "No tiene que ser hoy" / "No, tiene que ser hoy"; "¿No puede ser hoy?" / "No puede ser hoy": he asks
      "no (tiene que | necesita | debe | puede | podria) ser (hoy | hoy mismo) #amb",
      "[no] no tiene que ser hoy",
    ] },
    tomorrow_ctx: { patterns: ["[para] manana [en la manana | temprano] [entonces]"] },
    // "Sí, perdón." / "No, lo siento." to "Entonces... no vienes al desayuno, ¿verdad?" (both: not coming)
    sorry_ctx: { patterns: ["(si | no) @sorry [amiga]", "(lo siento | sorry | una disculpa | perdoname) [amiga]"] },
    // "Estoy preocupado." to "¿Podría esperar a mañana?"
    insist_ctx: { patterns: [
      "estoy [muy | un poco | bastante] (preocupado | preocupada | nervioso | nerviosa) [por (el techo | la vecina | los danos | el agua | la luz)]",
      // "¿Y si llueve otra vez?": a worry, not a booking
      "(y si | que pasa si) (llueve [otra vez] | vuelve a llover | sigue lloviendo | entra mas agua | pasa al de abajo | se cae el techo)",
    ] },
    // "No, no puede." / "Sí, sí puede." to "¿Podría esperar a mañana?"
    wait_no_ctx: { patterns: ["[no] no (puede | creo)", "[no] me temo que no"] },
    wait_yes_ctx: { patterns: ["[si] (si puede | puede esperar | supongo que si)"] },
    accept_tomorrow: { patterns: [
      "manana [en la manana | por la manana | temprano] (esta bien | me viene bien | me parece bien | me queda bien | perfecto | sin problema | me sirve | me funciona) #h:tomorrow_fine",
      "(esta bien | bueno | ok | okey | vale) [entonces] manana",
      "(vale | ok | okey | bueno) manana (me sirve | esta bien | me queda bien)",
      "puede esperar (hasta | a) manana",
      "[si] (eso | esto) puede esperar",
      "[si] puedo esperar (hasta | a) manana",
      "(entonces | pues) manana",
      "que sea manana",
      "[no | bueno] (mejor | prefiero | preferiria) [que sea] manana [en la manana | por la manana]",
      "manana (mejor | si) [hoy no]",
    ] },
    pick_time: { patterns: [
      "[a] {time} (seria | es | esta) (perfecto | ideal | bien | mejor) [para mi] #h:time_perfect",
      "(puede | podria) (venir | pasar) a {time} #h:could_he",
      "[a] {time} me (queda | sirve | funciona | conviene) [mejor]",
      "(digamos | mejor) [a] {time}",
      "prefiero [que sea] [a] {time}",
      "(entre mas temprano mejor | lo mas temprano posible | mientras mas temprano mejor) #early",
      "(a cualquier hora | cuando sea | cuando pueda) [estoy todo el dia en casa] #any",
      "estoy en casa todo el dia #any",
      "(en la manana | antes de mediodia | antes de comer) #early",
      "(en la tarde | despues de comer) #late",
      "(la primera | la de las once | la mas temprana) [opcion] #early",
      "(la segunda | la de la una | la mas tarde) [opcion] #late",
    ] },
    // "A las once no puedo": not that time (the other one, or the one named after it)
    time_not: { patterns: [
      "[a] {time} no (puedo | me queda | me queda bien | me sirve | me funciona | estoy | me viene bien | me viene)",
      "no (puedo | me queda | me sirve | me viene bien) [a] {time}",
      "no [a] {time} [sino | mejor] [a] {time2:time}",
      "[a] {time} no [sino | mejor] [a] {time2:time}",
      // "No a las once" (with or without its lost comma: "No, a las once"): asked again
      "no [a] {time} #amb",
    ] },
    time_ctx: { patterns: [
      "[a] {time} [en punto]",
      "(cualquiera | cualquiera de las dos | cualquier hora | ambas | ambas opciones) [esta bien | me sirve | me queda bien] #any",
      "me da (igual | lo mismo) #any",
      "(lo que sea | la que sea) mas (facil | comodo) para el #any",
      "(no importa | da lo mismo) #any",
    ] },
    ask_confirmed: { patterns: [
      "(es | esa es) [una] hora (fija | exacta | confirmada | segura) o (aproximada | mas o menos) #h:confirmed",
      "esa hora es (segura | confirmada | exacta | fija)", "(es | esta) confirmada [la hora]",
      "(me | nos)? (puede | podria) confirmar la hora #h:confirm_time",
      "(me puede | me podria) (avisar | mandar un mensaje | llamar) cuando (venga | vaya | este) (en camino | de camino) #h:let_know",
      "le agradecería que me (avisara | informara) a que hora (llega | llegaria | va a llegar) [el plomero] #h:advise #formal",
      "(es | sera) (aproximado | aproximada)",
      "de verdad (llega | va a llegar) a {time}",
    ] },
    ask_eta: { patterns: [
      "(cuando | a que hora) (llega | viene | va a llegar | estaria aqui) [usted | el plomero | el] [exactamente]",
      "cuanto (tarda | se tarda | va a tardar) [en llegar]",
      "(ya viene | viene para aca | ya va para alla)",
    ] },
    ask_damage: { patterns: [
      "quien (va a pagar | paga) (los danos | la reparacion | el techo | el plomero | eso)",
      "usted (va a pagar | cubre | paga) (los danos | la reparacion | el plomero)",
      "(tengo que | me toca) pagar [algo | la reparacion | los danos | el plomero]",
      "no tengo que pagar nada [verdad]",
      "cuanto (me va a costar | va a costar | cuesta | me cobra | me va a cobrar | cobra el plomero)",
    ] },

    // --- Don Gilberto: thanks, apologies, the voicemail's closing ------------------------------------
    formal_thanks: { patterns: [
      "[muchas | muchisimas] gracias [de nuevo] por su pronta (atencion | ayuda | respuesta) #h:prompt #formal",
      "le agradezco [mucho | muchisimo | de verdad] su (ayuda | atencion | pronta atencion | pronta ayuda | pronta respuesta | comprension) #h:appreciate_it",
      "le agradezco (muchisimo | infinitamente)",
      "quedo muy (agradecido | agradecida)",
      "es usted muy amable",
      "(muchas | mil) gracias por (su ayuda | su comprension | venir | resolverlo tan rapido)",
    ] },
    apologize: { patterns: [
      "disculpe (las | la) (molestias | molestia) #h:apologize #formal",
      "(perdon | disculpe | una disculpa) por (llamar tan temprano | molestarlo | las molestias | molestar | hablarle tan temprano)",
      "(siento | lamento) (molestarlo | llamar tan temprano | las molestias)",
    ] },
    kind_regards: { patterns: ["(saludos cordiales | atentamente | un cordial saludo | reciba un cordial saludo) #h:kind_regards #formal", "(saludos cordiales | atentamente | un cordial saludo) {name} #formal"] },
    vm_close: { patterns: ["@callback"] },
    // a voicemail said in one breath (four pieces or more): see the `vm_piece` macro and NEEDS 1
    vm_unknown: { patterns: ["@vm_piece [@vm_and] @vm_piece [@vm_and] @vm_piece [@vm_and] @vm_piece [[@vm_and] @vm_piece] [[@vm_and] @vm_piece] [[@vm_and] @vm_piece] [[@vm_and] @vm_piece]"] },
    demand_rude: { patterns: [
      "(arreglelo | arreglalo | venga | ven | haga algo | haz algo) (ya | ahorita | ahora | ahora mismo) #casual",
      "(arreglelo | arreglalo) #casual",
      "(es su | es tu) (problema | trabajo | culpa) #casual",
      "(tiene | tienes) que (arreglarlo | venir) (ya | ahora | ahorita | hoy) #casual",
    ] },
    thats_all: { patterns: ["[no] (eso es todo | es todo | seria todo | eso seria todo | nada mas | ya es todo | por ahora es todo) [gracias]"] },
    // "No estoy seguro." / "No revisé." (only to a question that expects it: the global "No sé" stays the default)
    unsure_ctx: { patterns: ["no (se | estoy seguro | estoy segura) si (puede | pueda | podria) esperar [hasta manana | a manana]",
      "no (se | estoy seguro | estoy segura) si (pasó | llegó | ha pasado | ha llegado | le gotea | esta pasando | se filtró) [el agua] [abajo | al de abajo | al departamento de abajo | al apartamento de abajo | con la vecina | a la vecina | con don ernesto | a don ernesto]",
      "no se (desde cuando | cuando empezó | a que hora empezó | exactamente)", "[no se] no (revisé | he revisado | me fijé | he visto | lo he mirado | he mirado | lo he comprobado | he comprobado | he bajado a mirar | sé todavia | he bajado a ver | he hablado con (la vecina | el vecino | los de abajo | don ernesto))", "no estoy (seguro | segura) [la verdad]"] },
    // "No sé dónde está." at the power question (only there: elsewhere it is about something else)
    switch_unknown_ctx: { patterns: ["[no] no se (donde esta | donde estan | donde queda | como se hace | como)", "[no] donde (esta | estan | queda) (el switch | el interruptor | los breakers | la caja | la pastilla | las pastillas | los interruptores)",
      // "¿Cuál switch?" / "¿Qué es el switch?" / "¿Dónde está?" at his power question
      "(cual | que) (switch | interruptor)", "(que | cual) es (el | un) (switch | interruptor)", "donde (esta | estan | queda)"] },
  },

  lines: {
    // --- Andrea ------------------------------------------------------------------------------
    l_hello: [
      t("¡Hola! | Ya | voy | en camino | al | desayuno. | ¿Y | tú?", "Hi! | Already | I'm-going | on the way | to the | breakfast. | And | you?", "Hey! I'm on my way to breakfast. You?"),
      t("¡Hola! | Justo | voy | saliendo | para | el | desayuno. | ¿Qué onda?", "Hi! | Just | I'm-going | leaving | for | the | breakfast. | What's up?",
        "Hey! I'm just heading out to breakfast. What's up?",
        { flags: { 7: "Mexican: ¿Qué onda? = what's up?" },
          neutral: t("¡Hola! | Justo | voy | saliendo | para | el | desayuno. | ¿Qué tal?", "Hi! | Just | I'm-going | leaving | for | the | breakfast. | How's it going?", "Hey! I'm just heading out to breakfast. What's up?"), spain: t("¡Hola! | Justo | estoy | saliendo | para | el | desayuno. | ¿Qué tal?", "Hi! | Just | I'm | leaving | for | the | breakfast. | How's it going?", "Hey! I'm just heading out to breakfast. What's up?") }),
    ],
    l_what: [
      t("Espera, | ¿qué? | ¿Qué | pasó?", "Wait, | what? | What | happened?", "Wait, what? What happened?", { spain: t("Espera, | ¿qué? | ¿Qué | ha pasado?", "Wait, | what? | What | has happened?", "Wait, what? What happened?") }),
      t("¡Ay, | no! | ¿Por qué? | ¿Todo | bien?", "Oh, | no! | Why? | Everything | okay?", "Oh no, why? Is everything okay?"),
    ],
    l_what_again: [t("¿Entonces | qué | pasa?", "So | what | is happening?", "So what's going on?")],
    // (the English "Is it the washing machine again?")
    l_guess: [
      t("A ver... | ¿Otra vez | los | de arriba?", "Let's see... | Again | the ones | upstairs?", "Wait. The people upstairs again?"),
    ],
    // her reaction to the ceiling or the pipe / the water / just the flood
    l_react_exploded: [
      t("¡No puede ser! | ¿Por | el | techo?", "It can't be! | Through | the | ceiling?", "No way! Through the ceiling?!",
        { flags: { 3: "el techo: the ceiling (and the roof): Spanish has one word for both." } }),
      t("Espera, | ¿goteras? | ¿Como | regadera?", "Wait, | leaks? | Like | a shower?", "Wait, leaks?! Like, a shower?",
        { flags: { 3: "Mexican: la regadera = the shower; elsewhere la ducha." },
          neutral: t("Espera, | ¿goteras? | ¿Como | ducha?", "Wait, | leaks? | Like | a shower?", "Wait, leaks?! Like, a shower?") }),
    ],
    l_react_water: [
      t("¡No puede ser! | ¿Agua | de | verdad?", "It can't be! | Water | for | real?", "No way! Like, actual water?"),
      // (an exclamation: her next lines don't wait for an answer, so no "¿Qué tan grave está?")
      t("¡Ay, | no! | ¡Qué | horror!", "Oh, | no! | What | a horror!", "Oh no! How awful!"),
    ],
    l_react_flood: [
      t("¡¿Qué?! | ¡Qué | mala | suerte!", "What?! | What | bad | luck!", "What?! What bad luck!"),
      t("¡Ay, | no! | ¡Pobre | de | ti!", "Oh, | no! | Poor | — | you!", "Oh no! You poor thing!", { flags: { 3: "pobre de ti: de has no English word here." } }),
    ],
    l_ack: [t("¡Ay, | no!", "Oh, | no!", "Oh no."), t("Uf, | ¿en serio?", "Ugh, | seriously?", "Ugh, seriously?")],
    l_i_know: [t("¡Jaja, | ya sé! | Vi | tu | nombre.", "Haha, | I know! | I-saw | your | name.", "Ha, I know! I saw your name.", { spain: t("¡Jaja, | ya lo sé! | He visto | tu | nombre.", "Haha, | I know! | I've seen | your | name.", "Ha, I know! I saw your name.") })],
    l_brunch_ok: [
      t("No pasa nada. | El | desayuno | puede | esperar.", "No problem. | The | breakfast | can | wait.", "Totally fine. Breakfast can wait."),
      t("No te preocupes. | Me como | tus | chilaquiles.", "Don't worry. | I'll eat | your | chilaquiles.", "Don't worry. I'll eat your chilaquiles.",
        { flags: { 3: "chilaquiles: fried tortilla chips in salsa, a classic Mexican breakfast." } }),
    ],
    l_cat: [t("¡Jaja! | Pobre | gatito. | Pero | qué | listo.", "Haha! | Poor | kitty. | But | how | smart.", "Ha! Poor kitty. Smart cat, though.")],
    l_are_you_ok: [
      t("¿Y | tú | estás | bien?", "And | you | are | okay?", "Are you okay?"),
      t("Espera, | ¿estás | bien?", "Wait, | are you | okay?", "Wait, are you okay?"),
    ],
    l_glad_ok: [t("Uf. | Bueno, | qué | bien.", "Phew. | Well, | how | good.", "Phew. Okay, good.", { spain: t("Uf. | Vale, | menos mal.", "Phew. | Okay, | thank goodness.", "Phew. Okay, good.") })],
    l_breathe: [t("Respira. | Es | solo | agua.", "Breathe. | It's | only | water.", "Breathe. It's just water.")],
    l_laugh_formal: [
      t("¡Jaja! | ¿Quién | eres, | mi | banco?", "Haha! | Who | are you, | my | bank?", "Ha! Who are you, my bank?"),
      t("¡Jaja! | ¿Por qué | tan | formal?", "Haha! | Why | so | formal?", "Ha! Why so formal?"),
    ],
    l_brunch_q: [t("Entonces... | no vienes | al | desayuno, | ¿verdad?", "So... | you're not coming | to the | breakfast, | right?", "So... no breakfast for you, I'm guessing?")],
    l_need_q: [
      t("¿Necesitas | algo? | Te | puedo | llevar | cosas | de camino.", "Do you need | something? | (To) you | I can | bring | things | on the way.",
        "Do you need anything? I can grab stuff on the way."),
      t("¿Qué | necesitas? | Dime.", "What | do you need? | Tell me.", "What do you need? Tell me."),
    ],
    l_bring1: [t("¡Perfecto! | Te | llevo | {X.np}.", "Perfect! | (To) you | I'll-bring | {X.np}.", "Okay! I'll bring {X.np}.")],
    l_bring2: [t("¡Perfecto! | Te | llevo | {X.np} | y | {Y.np}.", "Perfect! | (To) you | I'll-bring | {X.np} | and | {Y.np}.", "Okay! I'll bring {X.np} and {Y.np}.")],
    l_and_coffee: [t("Y | café. | Mucho | café. | Entendido.", "And | coffee. | A lot of | coffee. | Understood.", "And coffee. Lots of coffee. Got it.")],
    l_coffee_only: [t("Café. | Mucho | café. | Entendido.", "Coffee. | A lot of | coffee. | Understood.", "Coffee. Lots of coffee. Got it.")],
    l_boat: [
      t("¡Jaja! | Lancha | no tengo, | perdón. | Pero | trapeador | sí.", "Haha! | Boat | I don't have, | sorry. | But | mop | yes.", "Ha! No boat, sorry. But I do have a mop.", { spain: t("¡Jaja! | Lancha | no tengo, | lo siento. | Pero | fregona | sí.", "Haha! | Boat | I don't have, | sorry. | But | mop | yes.", "Ha! No boat, sorry. But I do have a mop.") }),
    ],
    l_coming: [t("Bueno, | voy | a | ayudarte.", "Okay, | I'm-going | to | help you.", "Okay, I'm coming over to help.", { spain: t("Vale, | voy | a | ayudarte.", "Okay, | I'm-going | to | help you.", "Okay, I'm coming over to help.") })],
    l_on_way: [t("Llego | en | veinte | minutos.", "I-arrive | in | twenty | minutes.", "Be there in twenty minutes.")],
    l_no_problem: [t("Ah, | no hay problema.", "Oh, | no problem.", "Oh, okay, no problem.")],
    l_sure: [
      t("¿{m:Seguro|f:Segura}? | Puedo | pasar | después de | desayunar.", "Sure? | I-can | come by | after | having breakfast.", "You sure? I can come over after breakfast."),
    ],
    l_coming_yes: [t("¡Claro! | Paso | en cuanto | termine | de | desayunar.", "Sure! | I'll-come-by | as soon as | I-finish | — | having breakfast.", "Sure! I'll come over right after breakfast.",
      { flags: { 4: "terminar de + verb: to finish doing it; de has no English word here." } })],
    l_not_coming: [t("Está bien, | pero | si | me | necesitas, | me | llamas.", "Okay, | but | if | me | you-need, | me | you-call.", "Okay, but call me if you need me.", { spain: t("Vale, | pero | si | me | necesitas, | me | llamas.", "Okay, | but | if | me | you-need, | me | you-call.", "Okay, but call me if you need me.") })],
    l_bye_q: [
      t("Ahora sí, | llámale | al | administrador. | ¡Te quiero!", "Now, | call | the | building manager. | Love you!", "Okay, go call the building manager. Love you!",
        { flags: { 2: F_AL_CALL, 3: "el administrador: the building manager (Don Gilberto); the owner is Don Ernesto." }, spain: t("Ahora sí, | llama | al | administrador. | ¡Te quiero!", "Now, | call | the | building manager. | Love you!", "Okay, go call the building manager. Love you!", { flags: { 2: F_AL_CALL, 3: "el administrador: the building manager (Don Gilberto); the owner is Don Ernesto." } }) }),
      t("Ve | a | llamarle | a | Don Gilberto. | ¡Nos vemos | en un rato!", "Go | to | call | — | Don Gilberto. | See you | in a bit!", "Go call Don Gilberto. See you in a bit!",
        { flags: { 3: "a: Spanish puts a before the one you call; English has no word here." }, spain: t("Venga, | llama | a | Don Gilberto. | ¡Nos vemos | en un rato!", "Come on, | call | — | Don Gilberto. | See you | in a bit!", "Go call Don Gilberto. See you in a bit!", { flags: { 2: "a: Spanish puts a before the one you call; English has no word here." } }) }),
    ],
    l_love_too: [t("¡Yo | también | te quiero! | ¡Bye!", "I | too | love you! | Bye!", "Love you too! Bye!", { spain: t("¡Yo | también | te quiero! | ¡Chao!", "I | too | love you! | Bye!", "Love you too! Bye!") })],
    l_bye_after: [t("¡Bye! | ¡Suerte!", "Bye! | Good luck!", "Bye! Good luck!", { spain: t("¡Chao! | ¡Suerte!", "Bye! | Good luck!", "Bye! Good luck!") }), t("¡Nos vemos! | ¡Suerte!", "See you! | Good luck!", "Later! Good luck!")],
    l_anytime: [t("¡Para | eso | estamos!", "For | that | we-are!", "Anytime!"), t("¡Ay! | ¡Claro!", "Aww! | Of course!", "Aww. Of course!")],
    // the door twist
    l_door1: [t("Bueno, | no te asustes, | pero... | abre | la | puerta.", "Okay, | don't be scared, | but... | open | the | door.", "Okay, don't panic, but... open your door.")],
    l_door2: [
      t("¡Sorpresa! | Me | mandaste | «AUXILIO» | y | nueve | emojis | de | agua.", "Surprise! | (To) me | you-sent | “HELP” | and | nine | emojis | of | water.",
        "Surprise! You texted me “HELP” and nine water emojis.", { spain: t("¡Sorpresa! | Me | has mandado | «SOCORRO» | y | nueve | emojis | de | agua.", "Surprise! | (To) me | you've sent | “HELP” | and | nine | emojis | of | water.", "Surprise! You texted me “HELP” and nine water emojis.") }),
    ],
    l_door3: [t("Así que | te | traje | un | trapeador | y | café.", "So | (for) you | I-brought | a | mop | and | coffee.", "So I brought a mop and coffee.", { spain: t("Así que | te | he traído | una | fregona | y | café.", "So | (for) you | I've brought | a | mop | and | coffee.", "So I brought a mop and coffee.") })],
    l_door_anyway: [
      t("Ya sé, | ya sé, | estás | bien. | Igual | te | traje | un | trapeador. | Y | café.", "I know, | I know, | you're | fine. | Anyway | (for) you | I-brought | a | mop. | And | coffee.",
        "I know, I know, you're fine. I brought a mop anyway. And coffee.", { spain: t("Ya lo sé, | ya lo sé, | estás | bien. | Aun así | te | he traído | una | fregona. | Y | café.", "I know, | I know, | you're | fine. | Even so | (for) you | I've brought | a | mop. | And | coffee.", "I know, I know, you're fine. I brought a mop anyway. And coffee.") }),
    ],
    l_door_go: [
      t("¡Para | eso | estamos! | Ahora | llámale | al | administrador. | Yo | empiezo | a | trapear.", "For | that | we-are! | Now | call | the | building manager. | I | start | — | mopping.",
        "Anytime. Now go call the building manager. I'll start mopping.", { flags: { 5: F_AL_CALL, 9: "empezar a + verb: a has no English word here." }, spain: t("¡Para | eso | estamos! | Ahora | llama | al | administrador. | Yo | empiezo | a | fregar.", "For | that | we-are! | Now | call | the | building manager. | I | start | — | mopping.", "Anytime. Now go call the building manager. I'll start mopping.", { flags: { 5: F_AL_CALL, 9: "empezar a + verb: a has no English word here." } }) }),
    ],
    l_door_friends: [
      t("¡Jaja! | ¡Para eso están las amigas! | Ahora | llámale | al | administrador. | Yo | empiezo | a | trapear.",
        "Haha! | That's what friends are for! | Now | call | the | building manager. | I | start | — | mopping.",
        "Ha! That's what friends are for. Now go call the building manager. I'll start mopping.", { flags: { 4: F_AL_CALL, 8: "empezar a + verb: a has no English word here." }, spain: t("¡Jaja! | ¡Para eso están las amigas! | Ahora | llama | al | administrador. | Yo | empiezo | a | fregar.", "Haha! | That's what friends are for! | Now | call | the | building manager. | I | start | — | mopping.", "Ha! That's what friends are for. Now go call the building manager. I'll start mopping.", { flags: { 4: F_AL_CALL, 8: "empezar a + verb: a has no English word here." } }) }),
    ],
    // at the end of Don Gilberto's call (door twist)
    l_shout: [t("¡Saludos cordiales, | Don Gilberto!", "Kind regards, | Don Gilberto!", "Kind regards, Don Gilberto!")],

    // --- Don Gilberto ----------------------------------------------------------------------------
    gr_pickup: [
      t("¿Bueno? | Habla | Gilberto. | ¿Quién | habla?", "Hello? | Speaking | Gilberto. | Who | is speaking?", "Hello? Gilberto speaking. Who's this?",
        { flags: { 0: F_BUENO }, neutral: t("¿Hola? | Habla | Gilberto. | ¿Quién | habla?", "Hello? | Speaking | Gilberto. | Who | is speaking?", "Hello? Gilberto speaking. Who's this?"), spain: t("¿Dígame? | Soy | Gilberto. | ¿Quién | es?", "Hello? | I'm | Gilberto. | Who | is it?", "Hello? Gilberto speaking. Who's this?", { flags: { 0: "Spain: ¿dígame? is how people answer the phone." } }) }),
      t("Buenos días, | habla | Gilberto, | a sus órdenes. | ¿Con | quién | hablo?", "Good morning, | speaking | Gilberto, | at your service. | With | whom | am I speaking?",
        "Good morning, Gilberto speaking. Who am I talking to?", { spain: t("Buenos días, | soy | Gilberto, | dígame. | ¿Con | quién | hablo?", "Good morning, | I'm | Gilberto, | tell me. | With | whom | am I speaking?", "Good morning, Gilberto speaking. Who am I talking to?") }),
    ],
    gr_who_again: [t("Perdón, | ¿quién | habla?", "Sorry, | who | is speaking?", "Sorry, who's calling?", { spain: t("Perdone, | ¿quién | es?", "Sorry, | who | is it?", "Sorry, who's calling?") })],
    gr_who_btw: [t("Por cierto, | ¿quién | habla?", "By the way, | who | is speaking?", "Who's this, by the way?", { spain: t("Por cierto, | ¿quién | es?", "By the way, | who | is it?", "Who's this, by the way?") })],
    // he is the building's administrador, not the landlord (the lead's decision, 5 Nov: Don Ernesto owns it)
    gr_its_me: [
      t("Jaja, | ¿pero | quién | es | «yo»? | Administro | doce | departamentos.", "Haha, | but | who | is | “me”? | I-manage | twelve | apartments.", "Ha! “Me” who? I manage twelve apartments.",
        { flags: { 7: F_DEPA },
          neutral: t("Jaja, | ¿pero | quién | es | «yo»? | Administro | doce | apartamentos.", "Haha, | but | who | is | “me”? | I-manage | twelve | apartments.", "Ha! “Me” who? I manage twelve apartments."), spain: t("Jaja, | ¿pero | quién | es | «yo»? | Administro | doce | pisos.", "Haha, | but | who | is | “me”? | I-manage | twelve | apartments.", "Ha! “Me” who? I manage twelve apartments.") }),
    ],
    gr_guess_who: [
      t("¡Ah, | espere, | es | el | 1B! | Tengo | su | número | guardado.", "Oh, | wait, | it's | — | 1B! | I-have | your | number | saved.", "Oh, wait, it's 1B! I've got your number saved.",
        { say: "¡Ah, espere, es el uno be! Tengo su número guardado.", flags: { 3: "el: Spanish puts an article before an apartment number; English has no word here." } }),
    ],
    gr_hi_tenant: [
      t("¡Ah, | buenos días!", "Oh, | good morning!", "Oh, good morning!"),
      t("¡El | 1B! | ¡Buenos días!", "The | 1B! | Good morning!", "1B! Good morning!", { say: "¡El uno be! ¡Buenos días!" }),
    ],
    gr_what_q: [
      t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "What can I do for you?"),
      t("¿Qué | pasó?", "What | happened?", "What's going on?", { spain: t("¿Qué | ha pasado?", "What | has happened?", "What's going on?") }),
    ],
    gr_what_again: [
      t("Dígame, | ¿qué | pasó?", "Tell me, | what | happened?", "So, what's up?", { spain: t("Dígame, | ¿qué | ha pasado?", "Tell me, | what | has happened?", "So, what's up?") }),
      t("Entonces, | ¿en | qué | le | ayudo?", "So, | in | what | (to) you | I-help?", "So what can I do for you?"),
    ],
    // (the English "Is it that washing machine again?")
    gr_guess_washer: [t("¿Es | otra vez | la | tubería | del | 2B?", "Is it | again | the | plumbing | of the | 2B?", "Is it the plumbing in 2B again?",
      { say: "¿Es otra vez la tubería del dos be?" })],
    gr_regret: [
      t("¿«Informarle»? | Uy. | Eso | nunca | es | buena | noticia.", "“Inform you”? | Uh-oh. | That | never | is | good | news.", "“Inform me”? Uh-oh. That's never good news."),
    ],
    gr_flood_react: [
      t("¡Ay, | no! | No, | no, | no.", "Oh, | no! | No, | no, | no.", "Oh no. Oh no, no, no."),
      t("¡Híjole! | ¡Otra vez | esa | tubería!", "Oh boy! | Again | that | plumbing!", "Oh boy. That plumbing again!",
        { flags: { 0: "Mexican: ¡híjole! = oh boy, oh no." }, neutral: t("¡Caramba! | ¡Otra vez | esa | tubería!", "Oh boy! | Again | that | plumbing!", "Oh boy. That plumbing again!") }),
    ],
    gr_so_sorry: [t("¡Ay, | no! | ¡Lo siento | mucho!", "Oh, | no! | I'm sorry | a lot!", "Oh no! I'm so sorry!")],
    gr_since_q: [t("¿Desde | cuándo | entra | el | agua?", "Since | when | is it-coming-in | the | water?", "When did it start?")],
    gr_ok: [t("Ajá, | ajá.", "Uh-huh, | uh-huh.", "Uh-huh."), t("Entendido.", "Understood.", "Got it."), t("Ya veo.", "I see.", "I see.")],
    gr_hurt_q: [
      t("¿Alguien | se lastimó?", "Someone | got hurt?", "Is anybody hurt?", { spain: t("¿Alguien | se ha hecho daño?", "Someone | has got hurt?", "Is anybody hurt?") }),
      t("¿Alguien | salió | lastimado?", "Someone | came out | hurt?", "Did anybody get hurt?", { spain: t("¿Hay | algún | herido?", "Is there | any | injured person?", "Did anybody get hurt?") }),
    ],
    gr_relief: [t("Gracias | a | Dios.", "Thanks | to | God.", "Thank goodness."), t("Uf. | Qué | bueno.", "Phew. | How | good.", "Phew. Good.", { spain: t("Uf. | Menos mal.", "Phew. | Thank goodness.", "Phew. Good.") })],
    gr_breathe: [
      t("A ver, | {m:tranquilo|f:tranquila}. | Respire | hondo. | Es | solo | agua.", "Okay, | calm. | Breathe | deep. | It's | only | water.", "Hey, hey. Deep breath. It's just water."),
    ],
    gr_hurt_yes: [t("¿Cómo? | ¿Usted | está | bien?", "What? | You | are | okay?", "What? Are you okay?")],
    gr_careful: [t("Bueno. | Con cuidado, | el | piso | está | resbaloso.", "Okay. | Carefully, | the | floor | is | slippery.", "Okay. Careful, the floor's slippery.", { spain: t("Bueno. | Con cuidado, | el | suelo | resbala.", "Okay. | Carefully, | the | floor | is slippery.", "Okay. Careful, the floor's slippery.") })],
    gr_down_q: [
      t("¿Ya | pasó | el | agua | al | departamento | de abajo?", "Already | did it get | the | water | to the | apartment | downstairs?", "Has the water reached the apartment downstairs?",
        { flags: { 5: F_DEPA },
          neutral: t("¿Ya | pasó | el | agua | al | apartamento | de abajo?", "Already | did it get | the | water | to the | apartment | downstairs?", "Has the water reached the apartment downstairs?"), spain: t("¿Ya | ha pasado | el | agua | al | piso | de abajo?", "Already | has it got | the | water | to the | apartment | downstairs?", "Has the water reached the apartment downstairs?") }),
      // Don Ernesto lives downstairs (the English "Is it leaking into Mr. Okoye's place downstairs?")
      t("¿Se está | filtrando | al | departamento | de | Don Ernesto?", "Is it | leaking | into the | apartment | of | Don Ernesto?", "Is it leaking into Don Ernesto's place?",
        { flags: { 3: F_DEPA, 5: "Don Ernesto: the owner of the building, who lives downstairs." },
          neutral: t("¿Se está | filtrando | al | apartamento | de | Don Ernesto?", "Is it | leaking | into the | apartment | of | Don Ernesto?", "Is it leaking into Don Ernesto's place?",
            { flags: { 5: "Don Ernesto: the owner of the building, who lives downstairs." } }), spain: t("¿Se está | filtrando | al | piso | de | Don Ernesto?", "Is it | leaking | into the | apartment | of | Don Ernesto?", "Is it leaking into Don Ernesto's place?", { flags: { 5: "Don Ernesto: the owner of the building, who lives downstairs." } }) }),
    ],
    gr_down_yes: [t("¡Ay, | no! | Pobre | Don Ernesto.", "Oh, | no! | Poor | Don Ernesto.", "Oh no. Poor Don Ernesto.")],
    gr_down_no: [t("Uf. | Bueno.", "Phew. | Okay.", "Phew. Okay."), t("Qué | bueno. | Por ahora, | al menos.", "How | good. | For now, | at least.", "Good. Not yet, anyway.", { spain: t("Menos mal. | Por ahora, | al menos.", "Thank goodness. | For now, | at least.", "Good. Not yet, anyway.") })],
    gr_down_unknown: [
      t("Bueno. | Después | le | toco | la | puerta | a | Don Ernesto.", "Okay. | Later | (to) him | I'll-knock-on | the | door | — | Don Ernesto.",
        "Okay. I'll knock on Don Ernesto's door later.", { flags: { 6: F_PERSONAL_A }, spain: t("Vale. | Luego | llamo | a | la | puerta | de | Don Ernesto.", "Okay. | Later | I'll-knock | at | the | door | of | Don Ernesto.", "Okay. I'll knock on Don Ernesto's door later.") }),
    ],
    gr_water_q: [
      t("¿Ya | bajó | el | switch | de | la | luz?", "Already | did you turn off | the | switch | of | the | power?", "Have you switched off the power?",
        { flags: { 3: F_SWITCH },
          neutral: t("¿Ya | bajó | el | interruptor | de | la | luz?", "Already | did you turn off | the | switch | of | the | power?", "Have you switched off the power?"), spain: t("¿Ya | ha bajado | el | interruptor | de | la | luz?", "Already | have you turned off | the | switch | of | the | power?", "Have you switched off the power?") }),
    ],
    gr_water_good: [
      t("Muy | bien. | Con | agua | en | el | piso, | es | lo | primero.", "Very | good. | With | water | on | the | floor, | it's | the | first (thing).", "Good. With water on the floor, that comes first.", { spain: t("Muy | bien. | Con | agua | en | el | suelo, | es | lo | primero.", "Very | good. | With | water | on | the | floor, | it's | the | first (thing).", "Good. With water on the floor, that comes first.") }),
    ],
    gr_valve: [
      t("Junto a | la | puerta | de | la | cocina | está | la | caja | de | los | interruptores. | Bájelos | todos. | Con | las | manos | secas, | ¿eh?",
        "Next to | the | door | of | the | kitchen | is | the | box | of | the | switches. | Turn them off | all. | With | the | hands | dry, | okay?",
        "The breaker box is next to the kitchen door. Flip them all off. With dry hands, okay?", { spain: t("Junto a | la | puerta | de | la | cocina | está | el | cuadro | eléctrico. | Baje | todos | los | interruptores. | Con | las | manos | secas, | ¿eh?", "Next to | the | door | of | the | kitchen | is | the | panel | electrical. | Turn off | all | the | switches. | With | the | hands | dry, | okay?", "The breaker box is next to the kitchen door. Flip them all off. With dry hands, okay?") }),
    ],
    gr_perfect: [t("Perfecto.", "Perfect.", "Perfect.")],
    gr_valve_later: [t("No se preocupe. | Yo | lo | hago | cuando | llegue.", "Don't worry. | I | it | I'll-do | when | I-arrive.", "No worries. I'll do it when I get there.")],
    // towels or bailing (or another answer) at his power question: okay, but the power comes first (gr_valve follows)
    gr_power_first: [t("Bien. | Pero | primero, | la | luz.", "Good. | But | first, | the | power.", "Okay, but the power comes first.")],
    // "No hay luz.": switched off all the same (gr_valve follows at his question)
    gr_no_power: [
      t("Igual, | por si | regresa | la | luz.", "Even so, | in case | comes back | the | power.", "Still, in case the power comes back.",
        { flags: { 0: "igual: here, all the same (do it anyway)." }, spain: t("Aun así, | por si | vuelve | la | luz.", "Even so, | in case | comes back | the | power.", "Still, in case the power comes back.") }),
    ],
    // "¿Qué hago mientras tanto?" once the power is off
    gr_meanwhile: [
      t("Mientras tanto, | saque | el | agua | que | pueda | y | levante | sus | cosas | del | piso.",
        "Meanwhile, | take out | the | water | that | you-can | and | lift | your | things | off the | floor.",
        "In the meantime, get out what water you can and get your things off the floor.",
        { flags: { 5: "pueda: the subjunctive (whatever water you can)." }, spain: t("Mientras tanto, | saque | el | agua | que | pueda | y | levante | sus | cosas | del | suelo.", "Meanwhile, | take out | the | water | that | you-can | and | lift | your | things | off the | floor.", "In the meantime, get out what water you can and get your things off the floor.", { flags: { 5: "pueda: the subjunctive (whatever water you can)." } }) }),
    ],
    // "¿Le aviso a Don Ernesto?": the owner (s81, s82, p29), downstairs; the pipes are the building's
    gr_owner: [
      t("Yo | le | aviso | a | Don Ernesto. | Usted | no se preocupe.", "I | (to) him | I'll-let-know | — | Don Ernesto. | You | don't worry.",
        "I'll let Don Ernesto know. Don't you worry.", { flags: { 3: F_PERSONAL_A, 4: "Don Ernesto: the owner of the building (Don Gilberto manages it)." } }),
    ],
    gr_req_q: [
      t("Bueno. | ¿Y | qué | necesita | de | mí?", "Okay. | And | what | do you need | from | me?", "Okay. So what do you need from me?"),
      t("Entonces, | ¿cómo | le | ayudo?", "So, | how | (to) you | I-help?", "So, how can I help?"),
    ],
    gr_send_q: [t("¿Quiere | que | le | mande | a | mi | plomero?", "Do you want | that | (to) you | I-send | — | my | plumber?", "Want me to send my plumber?",
      { flags: { 4: F_PERSONAL_A }, spain: t("¿Quiere | que | le | mande | a | mi | fontanero?", "Do you want | that | (to) you | I-send | — | my | plumber?", "Want me to send my plumber?", { flags: { 4: F_PERSONAL_A } }) })],
    gr_offer_a: [
      t("Hoy... | mmm. | Mi | plomero | tiene | la | agenda | llena.", "Today... | hmm. | My | plumber | has | the | schedule | full.",
        "Today... hmm. My plumber is booked solid.", { spain: t("Hoy... | mmm. | Mi | fontanero | tiene | la | agenda | llena.", "Today... | hmm. | My | plumber | has | the | schedule | full.", "Today... hmm. My plumber is booked solid.") }),
    ],
    gr_offer_b: [t("¿Podría | esperar | a | mañana | en la mañana?", "Could it | wait | until | tomorrow | in the morning?", "Could it wait till tomorrow morning?", { spain: t("¿Podría | esperar | a | mañana | por la mañana?", "Could it | wait | until | tomorrow | in the morning?", "Could it wait till tomorrow morning?") })],
    gr_offer_again: [t("Entonces, | ¿le parece | bien | mañana | en la mañana?", "So, | does it seem to you | good | tomorrow | in the morning?", "So, is tomorrow morning okay with you?", { spain: t("Entonces, | ¿le parece | bien | mañana | por la mañana?", "So, | does it seem to you | good | tomorrow | in the morning?", "So, is tomorrow morning okay with you?") })],
    gr_sure: [
      t("¿Está | {m:seguro|f:segura}? | Suena | a | mucha | agua.", "Are you | sure? | It sounds | like | a lot of | water.", "Are you sure? That sounds like a lot of water."),
    ],
    gr_sure_down: [
      t("¿Está | {m:seguro|f:segura}? | A | Don Ernesto | no le va a gustar.", "Are you | sure? | — | Don Ernesto | won't like it.", "Are you sure? Don Ernesto won't like that.",
        { flags: { 2: "a: the one who (dis)likes it is marked with a; English has no word here." } }),
    ],
    gr_ten_a: [
      t("¡Ay, | no, | tiene razón! | ¡Qué | pena | con | usted!", "Oh, | no, | you're right! | What | embarrassment | with | you!", "Oh no, you're right! I'm so sorry!",
        { flags: { 4: "In Mexico ¡qué pena! = I'm so sorry (and embarrassed)." }, spain: t("¡Ay, | no, | tiene razón! | ¡Lo siento | muchísimo!", "Oh, | no, | you're right! | I'm sorry | very much!", "Oh no, you're right! I'm so sorry!") }),
      t("¡Ay, | no! | ¡Perdón, | perdón!", "Oh, | no! | Sorry, | sorry!", "Oh no! So sorry!"),
    ],
    gr_ten_b: [
      t("¡En | diez | minutos | estoy | allá!", "In | ten | minutes | I-am | there!", "I'll be there in ten!", { spain: t("¡En | diez | minutos | estoy | allí!", "In | ten | minutes | I-am | there!", "I'll be there in ten!") }),
      t("Ya | voy | para | allá. | Diez | minutos, | máximo.", "Already | I'm-going | to | there. | Ten | minutes, | at most.", "I'm on my way. Ten minutes, tops."),
    ],
    gr_joe: [
      t("Y | le | pido | a | mi | plomero | que | pase | hoy, | se lo | prometo.", "And | (him) | I'll-ask | — | my | plumber | that | he-come-by | today, | it to you | I-promise.",
        "And I'll get my plumber to squeeze you in today, I promise.", { flags: { 3: F_PERSONAL_A, 7: F_QUE_SUBJ }, spain: t("Y | le | pido | a | mi | fontanero | que | pase | hoy, | se lo | prometo.", "And | (him) | I'll-ask | — | my | plumber | that | he-come-by | today, | it to you | I-promise.", "And I'll get my plumber to squeeze you in today, I promise.", { flags: { 3: F_PERSONAL_A, 7: F_QUE_SUBJ } }) }),
    ],
    gr_texting: [t("Permítame, | le | escribo | al | plomero... | ¡Listo!", "Allow me, | (to) him | I-write | to the | plumber... | Done!", "Hang on, I'm texting the plumber... Okay!", { spain: t("Un momento, | le | escribo | al | fontanero... | ¡Ya está!", "One moment, | (to) him | I-write | to the | plumber... | Done!", "Hang on, I'm texting the plumber... Okay!") })],
    gr_already_today: [t("No, | no, | es | hoy. | Ya | quedamos.", "No, | no, | it's | today. | Already | we-agreed.", "No, no, it's today. That's settled.")],
    gr_no_risk: [t("Mmm. | Mejor | no arriesgarnos.", "Hmm. | Better | not to take the risk.", "Hmm. Better safe than sorry.")],
    gr_tomorrow_final: [
      t("¡Bueno! | Mi | plomero | pasa | mañana | a las nueve.", "Okay! | My | plumber | comes by | tomorrow | at nine.", "Okay! My plumber will be there tomorrow at nine.",
        { say: "¡Bueno! Mi plomero pasa mañana a las nueve.", spain: t("¡Bueno! | Mi | fontanero | pasa | mañana | a las nueve.", "Okay! | My | plumber | comes by | tomorrow | at nine.", "Okay! My plumber will be there tomorrow at nine.", { say: "¡Bueno! Mi fontanero pasa mañana a las nueve." }) }),
    ],
    gr_time_q: [
      t("Puede | ir | a las once | o | a la una. | ¿Qué | le queda | mejor?", "He-can | go | at eleven | or | at one. | What | suits you | better?",
        "He can come at eleven or at one. Which works better for you?", { spain: t("Puede | ir | a las once | o | a la una. | ¿Qué | le viene | mejor?", "He-can | go | at eleven | or | at one. | What | suits you | better?", "He can come at eleven or at one. Which works better for you?") }),
    ],
    gr_time_11: [t("Bueno, | a las once. | Ya | le | aviso.", "Okay, | at eleven. | Now | (to) him | I'll-let-know.", "Okay, eleven. I'll let him know.")],
    gr_time_1: [t("Bueno, | a la una. | Ya | le | aviso.", "Okay, | at one. | Now | (to) him | I'll-let-know.", "Okay, one o'clock. I'll let him know.")],
    // "No a las once": with the comma lost it could be either (rule 10)
    gr_which: [t("Perdón, | ¿entonces | a las once | o | a la una?", "Sorry, | so | at eleven | or | at one?", "Sorry, so eleven or one?")],
    // "No es urgente" (or "No, es urgente"?): the comma is lost (rule 10)
    gr_which_day: [t("Perdón, | ¿entonces | hoy | o | mañana?", "Sorry, | so | today | or | tomorrow?", "Sorry, so today or tomorrow?")],
    gr_time_only: [
      t("Me temo | que | solo | puede | a las once | o | a la una.", "I'm afraid | that | only | he-can | at eleven | or | at one.", "I'm afraid he can only do eleven or one."),
    ],
    gr_first_today: [t("Primero | veamos | el | día.", "First | let's see | the | day.", "Let's sort out the day first.")],
    gr_estimate: [
      t("¡Jaja! | Buena | pregunta. | Con | él, | «a las once» | quiere decir | once y media.", "Haha! | Good | question. | With | him, | “at eleven” | means | eleven-thirty.",
        "Ha! Good question. With him, “eleven” means eleven-thirty."),
    ],
    gr_text_you: [
      t("Le | mando | un | mensaje | cuando | vaya | en camino.", "(To) you | I'll-send | a | message | when | he-is | on the way.", "I'll text you when he's on his way.",
        { flags: { 5: "vaya: the subjunctive after cuando for something still to come." }, spain: t("Le | mando | un | mensaje | cuando | esté | de camino.", "(To) you | I'll-send | a | message | when | he-is | on the way.", "I'll text you when he's on his way.", { flags: { 5: "esté: the subjunctive after cuando for something still to come." } }) }),
    ],
    gr_eta: [t("Diez | minutos, | máximo.", "Ten | minutes, | at most.", "Ten minutes, tops.")],
    gr_damage: [
      t("No se preocupe | por | eso. | Es | la | tubería | del | edificio: | eso | lo | veo | yo.", "Don't worry | about | that. | It's | the | plumbing | of the | building: | that | it | I'll-see-to | me.",
        "Don't worry about that. It's the building's plumbing, so I'll take care of it.", { flags: { 9: "eso lo…: Spanish repeats the object (eso … lo); English says it once." } }),
    ],
    gr_anything: [t("¡Muy | bien! | ¿Algo | más?", "Very | good! | Something | else?", "Alright! Anything else?")],
    gr_prompt: [
      t("¿«Pronta | atención»? | ¡Jaja! | Habla | como | yo | en | mis | cartas.", "“Prompt | attention”? | Haha! | You-talk | like | me | in | my | letters.",
        "“Prompt attention”! Ha! You sound like me in my letters."),
    ],
    gr_inconvenience: [t("¿Molestias? | ¡Para nada! | Es | mi | trabajo.", "Inconvenience? | Not at all! | It's | my | job.", "Inconvenience? Not at all! It's my job.")],
    gr_regards: [t("¡Jaja! | ¡Saludos cordiales | para | usted | también!", "Haha! | Kind regards | for | you | too!", "Ha! Kind regards to you too!")],
    gr_welcome: [t("¡No hay de qué!", "Don't mention it!", "No problem!"), t("¡Para | eso | estamos!", "For | that | we-are!", "That's what I'm here for!")],
    gr_love_you: [t("Eh... | ¿yo | también | {m:lo|f:la} | quiero?", "Uh... | I | too | you | love?", "Uh... love you too?", { flags: { 3: F_YOU_LO } })],
    gr_rude: [t("¡Epa, | epa! | Ya | voy, | ya | voy.", "Whoa, | whoa! | Already | I'm-going, | already | I'm-going.", "Whoa, okay, okay! I'm on it.", { spain: t("¡Eh, | eh! | Ya | voy, | ya | voy.", "Whoa, | whoa! | Already | I'm-going, | already | I'm-going.", "Whoa, okay, okay! I'm on it.") })],
    gr_laugh: [t("¡Jaja! | ¿Quién | es? | ¡Saludos cordiales | para | ella | también!", "Haha! | Who | is it? | Kind regards | for | her | too!", "Ha! Who's that? Kind regards to her too!")],
    gr_bye: [
      t("¡Nos vemos | en | diez | minutos!", "See you | in | ten | minutes!", "See you in ten! Bye now!"),
      t("Ánimo. | ¡Ahorita | nos vemos!", "Courage. | Right away | we'll-see-each-other!", "Hang in there. See you soon!",
        { flags: { 1: F_AHORITA }, neutral: t("Ánimo. | ¡Nos vemos | en un rato!", "Courage. | See you | in a bit!", "Hang in there. See you soon!") }),
    ],
    gr_bye_tomorrow: [t("¡Hasta | mañana! | ¡Que | le | vaya | bien!", "Until | tomorrow! | (I hope) | (to) you | it-goes | well!", "See you tomorrow! Take care!")],
    gr_wait_stay: [t("¡Espere, | espere! | ¿Qué | necesita?", "Wait, | wait! | What | do you need?", "Wait, wait! What do you need?")],
    gr_bye_walk: [t("Ah. | Bueno. | Entonces, | hasta luego.", "Oh. | Okay. | Then, | goodbye.", "Oh. Okay. Bye, then!")],
    // (before the last thanks; gr_bye's "¡Nos vemos en diez minutos!" comes after it, so not that again)
    gr_see_you: [t("¡Bueno! | Voy | para | allá.", "Okay! | I'm-going | to | there.", "Okay! I'm heading over.")],

    // --- the voicemail and the callback ---------------------------------------------------------------
    vm_greet: [
      t("Hola, | habla | Gilberto. | Ahorita | no puedo | contestar; | seguro | estoy | debajo de | algún | fregadero. | Deje | su | mensaje.",
        "Hi, | speaking | Gilberto. | Right now | I can't | answer; | surely | I-am | under | some | sink. | Leave | your | message.",
        "Hi, this is Gilberto. I can't answer right now; I'm probably under somebody's sink. Leave a message!",
        { flags: { 3: F_AHORITA },
          neutral: t("Hola, | habla | Gilberto. | En este momento | no puedo | contestar; | seguro | estoy | debajo de | algún | fregadero. | Deje | su | mensaje.",
            "Hi, | speaking | Gilberto. | At the moment | I can't | answer; | surely | I-am | under | some | sink. | Leave | your | message.",
            "Hi, this is Gilberto. I can't answer right now; I'm probably under somebody's sink. Leave a message!"), spain: t("Hola, | soy | Gilberto. | Ahora mismo | no puedo | contestar; | seguro que | estoy | debajo de | algún | fregadero. | Deje | su | mensaje.", "Hi, | I'm | Gilberto. | Right now | I can't | answer; | surely | I-am | under | some | sink. | Leave | your | message.", "Hi, this is Gilberto. I can't answer right now; I'm probably under somebody's sink. Leave a message!") }),
    ],
    gr_callback: [
      t("Buenos días, | habla | Gilberto. | Ya | escuché | su | mensaje.", "Good morning, | speaking | Gilberto. | Already | I-heard | your | message.", "Good morning, this is Gilberto! I got your message.", { spain: t("Buenos días, | soy | Gilberto. | Ya | he escuchado | su | mensaje.", "Good morning, | I'm | Gilberto. | Already | I've-heard | your | message.", "Good morning, this is Gilberto! I got your message.") }),
    ],
    gr_callback_formal: [
      t("¡Qué | mensaje | tan | formal! | ¡Parece | carta | mía!", "What | message | so | formal! | It-looks-like | letter | of mine!", "What a formal message! Sounds like one of my letters!"),
    ],
    gr_callback_casual: [t("Corto | y | al grano: | así | me gusta.", "Short | and | to the point: | that's how | I like it.", "Short and sweet, I like it.")],
  },

  domains: {},

  hints: {
    // --- Andrea (casual, tú) ---
    news: {
      lt: "Cancel breakfast casually and say what happened",
      items: [
        { id: "cant_make", s: t("¡Perdón, | no llego | al | desayuno!", "Sorry, | I won't make it | to the | breakfast!", "Sorry, can't make breakfast!"), register: "casual",
          note: "No llego (I won't make it): short and casual, the way friends say it." },
        { id: "flooded", s: t("¡Se me inundó | el | depa!", "Flooded on me | the | apartment!", "My apartment flooded!", { flags: { 0: "se me + verb: it happened to me, not on purpose.", 2: "Mexican, casual: el depa = el departamento (apartment)." },
          neutral: t("¡Se me inundó | el | apartamento!", "Flooded on me | the | apartment!", "My apartment flooded!"), spain: t("¡Se me ha inundado | el | piso!", "Has flooded on me | the | apartment!", "My apartment flooded!", { flags: { 0: "se me + verb: it happened to me, not on purpose." } }) }), register: "casual",
          note: "Among close friends Mexicans may add güey (dude). Use it only with people who use it with you." },
        { id: "water_everywhere", s: t("Hay | agua | por todos lados.", "There is | water | everywhere.", "There's water everywhere."), register: "casual" },
        { id: "river", s: t("Hay | un | río | en | la | cocina.", "There is | a | river | in | the | kitchen.", "There's a river in the kitchen."), register: "casual" },
        { id: "pipe", s: t("Se reventó | un | tubo | en | el | 2B.", "Burst | a | pipe | in | the | 2B.", "A pipe burst in 2B.",
          { say: "Se reventó un tubo en el dos be.", flags: { 0: "se reventó: it burst (by itself); reventar = to burst.", 4: "el: Spanish puts an article before an apartment number; English has no word here." }, spain: t("Ha reventado | una | tubería | en | el | 2B.", "Has burst | a | pipe | in | the | 2B.", "A pipe burst in 2B.", { say: "Ha reventado una tubería en el dos be.", flags: { 0: "ha reventado: it has burst; Spain's present perfect for what has just happened.", 4: "el: Spanish puts an article before an apartment number; English has no word here." } }) }),
          note: "2B is the apartment upstairs." },
        { id: "gonna_while", s: t("Esto | va para largo.", "This | is going to take a while.", "This is gonna be a while."), register: "casual" },
        { id: "cat_fridge", s: t("El | gato | está | arriba | del | refri.", "The | cat | is | on top | of the | fridge.", "The cat's on top of the fridge.",
          { flags: { 5: "Mexican, casual: el refri = el refrigerador." }, neutral: t("El | gato | está | encima | del | refrigerador.", "The | cat | is | on top | of the | fridge.", "The cat's on top of the fridge."), spain: t("El | gato | está | encima | de | la | nevera.", "The | cat | is | on top | of | the | fridge.", "The cat's on top of the fridge.") }), register: "casual" },
        { id: "rain_check", s: t("¿Lo | dejamos | para | otro | día?", "It | do we leave | for | another | day?", "Rain check?"), register: "casual" },
      ],
    },
    okay: {
      lt: "Say how you're doing",
      items: [
        { id: "just_wet", s: t("Estoy | bien, | solo | {m:mojado|f:mojada}.", "I-am | fine, | just | wet.", "I'm fine, just wet."), register: "casual" },
        { id: "freaking", s: t("Estoy | en | pánico.", "I-am | in | panic.", "I'm freaking out.") },
        { id: "nobody_hurt", s: t("Nadie | se lastimó.", "Nobody | got hurt.", "Nobody's hurt.", { spain: t("Nadie | se ha hecho daño.", "Nobody | has got hurt.", "Nobody's hurt.") }) },
      ],
    },
    need: {
      lt: "Ask for help, or say no thanks",
      slot: "stuff",
      examples: ["mop", "towels", "coffee", "bucket", "squeegee"],
      items: [
        { id: "bring_x", s: t("¿Me | puedes | traer | {X.np}?", "(For) me | can you | bring | {X.np}?", "Can you bring {X.np}?"), register: "casual",
          only: (e) => e.id !== "boat" },
        { id: "grab_x", s: t("¿Puedes | pasar | por | {X.np} | de camino?", "Can you | stop | for | {X.np} | on the way?", "Could you grab {X.np} on the way?"),
          only: (e) => e.id !== "boat" },
        { id: "lots_coffee", s: t("¿Y | café? | Mucho | café.", "And | coffee? | A lot of | coffee.", "And coffee? Lots of coffee."), register: "casual" },
        { id: "come_over", s: t("¿Puedes | venir?", "Can you | come?", "Could you come over?") },
        { id: "no_im_good", s: t("No, | estoy | bien, | gracias.", "No, | I-am | fine, | thanks.", "No, I'm good, thanks."), note: "Estoy bien: a polite no thanks, I don't need anything." },
        { id: "dont_worry", s: t("No te preocupes. | ¡Disfruta | el | desayuno!", "Don't worry. | Enjoy | the | breakfast!", "Don't worry about it. Enjoy your breakfast!"), register: "casual" },
        { id: "send_boat", s: t("Manda | toallas. | ¡Manda | una | lancha!", "Send | towels. | Send | a | boat!", "Send towels. Send a boat!"), register: "casual",
          note: "As a joke, like the song." },
      ],
    },
    bye_l: {
      lt: "Say goodbye like friends do",
      items: [
        { id: "love_you", s: t("¡Te quiero, | gracias!", "Love you, | thanks!", "Love you, thanks!"), register: "casual",
          note: "Friends say te quiero (love you) all the time; nothing romantic about it." },
        { id: "see_bit", s: t("¡Nos vemos | en un rato!", "See you | in a bit!", "See you in a bit!"), register: "casual" },
        { id: "youre_best", s: t("¡Eres | la | mejor!", "You-are | the | best!", "You're the best!"), register: "casual" },
        { id: "talk_later", s: t("¡Luego | hablamos!", "Later | we-talk!", "Talk to you later!"), register: "casual" },
        { id: "owe_you", s: t("¡Te | debo | una!", "(To) you | I-owe | one!", "I owe you one!", { flags: { 2: "una: one (favor); English says one too." } }), register: "casual" },
      ],
    },
    door: {
      lt: "Thank your friend casually",
      items: [
        { id: "lifesaver", s: t("¡Me | salvaste | la | vida!", "Me | you-saved | the | life!", "You're a lifesaver!", { flags: { 3: "la vida: Spanish says the life; English says my life." }, spain: t("¡Me | has salvado | la | vida!", "Me | you've-saved | the | life!", "You're a lifesaver!", { flags: { 3: "la vida: Spanish says the life; English says my life." } }) }), register: "casual" },
        { id: "didnt_have", s: t("¡No tenías | que | hacerlo!", "You didn't have | to | do it!", "You didn't have to!", { flags: { 1: "tener que: to have to; que has no word of its own." } }), register: "casual" },
        { id: "come_in", s: t("¡Pasa, | pasa!", "Come in, | come in!", "Come in, come in!"), register: "casual" },
        { id: "owe_you", s: t("¡Te | debo | una!", "(To) you | I-owe | one!", "I owe you one!", { flags: { 2: "una: one (favor); English says one too." } }), register: "casual" },
      ],
    },
    // --- Don Gilberto (formal, usted) ---
    who: {
      lt: "Say who's calling (name and apartment)",
      items: [
        { id: "this_is_apt", s: t("Buenos días, | Don Gilberto. | Le habla | {$name} | {$surname}, | del | departamento | 1B.", "Good morning, | Don Gilberto. | This is | {$name} | {$surname}, | from the | apartment | 1B.",
          "Good morning, Don Gilberto. This is {$name} {$surname} from apartment 1B.", { say: "Buenos días, Don Gilberto. Le habla {$name} {$surname}, del departamento uno be.",
            flags: { 2: "Le habla…: the polite way to say who is calling (literally, speaks to you).", 6: F_DEPA },
            neutral: t("Buenos días, | Don Gilberto. | Le habla | {$name} | {$surname}, | del | apartamento | 1B.", "Good morning, | Don Gilberto. | This is | {$name} | {$surname}, | from the | apartment | 1B.",
              "Good morning, Don Gilberto. This is {$name} {$surname} from apartment 1B.", { say: "Buenos días, Don Gilberto. Le habla {$name} {$surname}, del apartamento uno be.",
                flags: { 2: "Le habla…: the polite way to say who is calling (literally, speaks to you)." } }), spain: t("Buenos días, | Don Gilberto. | Le habla | {$name} | {$surname}, | del | 1B.", "Good morning, | Don Gilberto. | This is | {$name} | {$surname}, | from | 1B.", "Good morning, Don Gilberto. This is {$name} {$surname} from apartment 1B.", { say: "Buenos días, Don Gilberto. Le habla {$name} {$surname}, del uno be.", flags: { 2: "Le habla…: the polite way to say who is calling (literally, speaks to you)." } }) }), register: "polite" },
        // he manages the building for its owner (Don Ernesto), so the learner is "el inquilino del 1B", not "su inquilino"
        { id: "tenant_in", s: t("Soy | {m:el|f:la} | {m:inquilino|f:inquilina} | del | 1B.", "I-am | the | tenant | from the | 1B.", "I'm the tenant in 1B.", { say: "Soy {m:el|f:la} {m:inquilino|f:inquilina} del uno be." }), register: "polite" },
        { id: "calling_from", s: t("Le | hablo | del | departamento | 1B.", "(To) you | I'm-calling | from the | apartment | 1B.", "I'm calling from apartment 1B.",
          { say: "Le hablo del departamento uno be.", flags: { 1: F_HABLO, 3: F_DEPA },
            neutral: t("Lo | llamo | del | apartamento | 1B.", "You | I'm-calling | from the | apartment | 1B.", "I'm calling from apartment 1B.",
              { say: "Lo llamo del apartamento uno be.", flags: { 0: F_LO_CALL } }), spain: t("Le | llamo | del | 1B.", "You | I'm-calling | from | 1B.", "I'm calling from apartment 1B.", { say: "Le llamo del uno be.", flags: { 0: "le: you (usted), the one you call; Spain says le here." } }) }), register: "polite" },
      ],
    },
    report: {
      lt: "Explain formally what happened",
      items: [
        { id: "regret", s: t("Lamento | informarle | que | se inundó | el | departamento.", "I-regret | to inform you | that | got flooded | the | apartment.",
          "I regret to inform you that the apartment has flooded.", { flags: { 5: F_DEPA },
            neutral: t("Lamento | informarle | que | se inundó | el | apartamento.", "I-regret | to inform you | that | got flooded | the | apartment.",
              "I regret to inform you that the apartment has flooded."), spain: t("Lamento | informarle | de que | se ha inundado | el | piso.", "I-regret | to inform you | that | has flooded | the | apartment.", "I regret to inform you that the apartment has flooded.") }), register: "polite", note: "Very formal, like a letter: the song's style." },
        { id: "inform", s: t("Le | llamo | para | informarle | que | entró | agua | por | el | techo.", "(To) you | I-call | to | inform you | that | came in | water | through | the | ceiling.",
          "I'm calling to let you know that water came in through the ceiling.", { flags: { 9: "el techo: the ceiling (and the roof): Spanish has one word for both." },
            spain: t("Le | llamo | para | informarle | de que | ha entrado | agua | por | el | techo.", "(To) you | I-call | to | inform you | that | has come in | water | through | the | ceiling.",
              "I'm calling to let you know that water came in through the ceiling.", { flags: { 9: "el techo: the ceiling (and the roof): Spanish has one word for both." } }) }), register: "polite" },
        { id: "report_leak", s: t("Le | hablo | para | reportar | una | filtración.", "(To) you | I'm-calling | to | report | a | leak.", "I'm calling to report a leak.",
          { flags: { 1: F_HABLO, 5: "una filtración: water seeping in through a ceiling or wall." },
            neutral: t("Lo | llamo | para | reportar | una | filtración.", "You | I'm-calling | to | report | a | leak.", "I'm calling to report a leak.",
              { flags: { 0: F_LO_CALL, 5: "una filtración: water seeping in through a ceiling or wall." } }), spain: t("Le | llamo | para | avisar de | una | filtración.", "You | I'm-calling | to | report | a | leak.", "I'm calling to report a leak.", { flags: { 0: "le: you (usted), the one you call; Spain says le here.", 5: "una filtración: water seeping in through a ceiling or wall." } }) }), register: "polite" },
        { id: "afraid_flooded", s: t("Me temo | que | la | cocina | está | inundada.", "I'm afraid | that | the | kitchen | is | flooded.", "I'm afraid the kitchen is flooded."), register: "polite" },
        { id: "last_night", s: t("Empezó | anoche, | en | la | madrugada.", "It-started | last night, | in | the | early morning.", "It started last night, in the early hours.",
          { flags: { 4: "la madrugada: the small hours, after midnight." }, spain: t("Empezó | anoche, | de | madrugada.", "It-started | last night, | in | the early hours.", "It started last night, in the early hours.", { flags: { 3: "de madrugada: in the small hours, after midnight." } }) }), register: "polite" },
        { id: "power_off", s: t("Ya | bajé | el | switch | de | la | luz.", "Already | I-turned-off | the | switch | of | the | power.", "I've switched off the power.",
          { flags: { 3: F_SWITCH }, neutral: t("Ya | bajé | el | interruptor | de | la | luz.", "Already | I-turned-off | the | switch | of | the | power.", "I've switched off the power."), spain: t("Ya | he bajado | el | interruptor | de | la | luz.", "Already | I've-turned-off | the | switch | of | the | power.", "I've switched off the power.") }), register: "polite" },
        { id: "towels", s: t("Ya | puse | toallas | en | el | piso.", "Already | I-put | towels | on | the | floor.", "I've put towels down on the floor.", { spain: t("Ya | he puesto | toallas | en | el | suelo.", "Already | I've-put | towels | on | the | floor.", "I've put towels down on the floor.") }) },
      ],
    },
    details: {
      lt: "Answer Don Gilberto's questions",
      items: [
        { id: "nobody_hurt", s: t("No, | nadie | se lastimó.", "No, | nobody | got hurt.", "No, nobody's hurt.", { spain: t("No, | nadie | se ha hecho daño.", "No, | nobody | has got hurt.", "No, nobody's hurt.") }), register: "polite" },
        { id: "downstairs", s: t("Me temo | que | ya | está pasando | al | departamento | de abajo.", "I'm afraid | that | already | it's going through | to the | apartment | downstairs.",
          "I'm afraid it's reaching the apartment downstairs.", { flags: { 5: F_DEPA },
            neutral: t("Me temo | que | ya | está pasando | al | apartamento | de abajo.", "I'm afraid | that | already | it's going through | to the | apartment | downstairs.",
              "I'm afraid it's reaching the apartment downstairs."), spain: t("Me temo | que | ya | está pasando | al | piso | de abajo.", "I'm afraid | that | already | it's going through | to the | apartment | downstairs.", "I'm afraid it's reaching the apartment downstairs.") }), register: "polite" },
        { id: "power_off", s: t("Ya | bajé | el | switch | de | la | luz.", "Already | I-turned-off | the | switch | of | the | power.", "I've switched off the power.",
          { flags: { 3: F_SWITCH }, neutral: t("Ya | bajé | el | interruptor | de | la | luz.", "Already | I-turned-off | the | switch | of | the | power.", "I've switched off the power."), spain: t("Ya | he bajado | el | interruptor | de | la | luz.", "Already | I've-turned-off | the | switch | of | the | power.", "I've switched off the power.") }), register: "polite" },
        { id: "dont_know_switch", s: t("No sé | dónde | está | el | switch.", "I don't know | where | is | the | switch.", "I don't know where the breaker is.",
          { flags: { 4: F_SWITCH }, neutral: t("No sé | dónde | está | el | interruptor.", "I don't know | where | is | the | switch.", "I don't know where the breaker is.") }) },
        { id: "last_night", s: t("Empezó | anoche, | en | la | madrugada.", "It-started | last night, | in | the | early morning.", "It started last night, in the early hours.",
          { flags: { 4: "la madrugada: the small hours, after midnight." }, spain: t("Empezó | anoche, | de | madrugada.", "It-started | last night, | in | the early hours.", "It started last night, in the early hours.", { flags: { 3: "de madrugada: in the small hours, after midnight." } }) }), register: "polite" },
      ],
    },
    request: {
      lt: "Ask for someone to come today",
      items: [
        { id: "grateful_today", s: t("Le | agradecería | mucho | que | mandara | a | alguien | hoy.", "(To) you | I'd-be-grateful | very much | that | you-sent | — | someone | today.",
          "I'd be very grateful if you could send someone today.", { flags: { 1: "agradecería: the conditional, I would be grateful.", 4: "mandara: the past subjunctive after le agradecería que.", 5: F_PERSONAL_A } }),
          register: "polite", note: "The song's phrase: very polite and formal." },
        { id: "could_send", s: t("¿Podría | mandar | un | plomero | hoy?", "Could you | send | a | plumber | today?", "Could you send a plumber today?", { spain: t("¿Podría | mandar | un | fontanero | hoy?", "Could you | send | a | plumber | today?", "Could you send a plumber today?") }), register: "polite" },
        { id: "someone_today", s: t("¿Podría | venir | alguien | hoy?", "Could | come | someone | today?", "Could someone come today?"), register: "polite" },
        { id: "any_way", s: t("¿Habría | manera | de | que | viniera | alguien | hoy?", "Would there be | a way | of | that | came | someone | today?", "Is there any way someone could come today?",
          { flags: { 4: "viniera: the past subjunctive, as after habría manera de que." } }), register: "polite" },
      ],
    },
    insist: {
      lt: "Ask for today, politely but firmly",
      items: [
        { id: "cant_wait", s: t("Me temo | que | no puede | esperar | hasta | mañana.", "I'm afraid | that | it can't | wait | until | tomorrow.", "I'm afraid it can't wait until tomorrow."), register: "polite" },
        { id: "downstairs", s: t("Me temo | que | ya | está pasando | al | departamento | de abajo.", "I'm afraid | that | already | it's going through | to the | apartment | downstairs.",
          "I'm afraid it's reaching the apartment downstairs.", { flags: { 5: F_DEPA },
            neutral: t("Me temo | que | ya | está pasando | al | apartamento | de abajo.", "I'm afraid | that | already | it's going through | to the | apartment | downstairs.",
              "I'm afraid it's reaching the apartment downstairs."), spain: t("Me temo | que | ya | está pasando | al | piso | de abajo.", "I'm afraid | that | already | it's going through | to the | apartment | downstairs.", "I'm afraid it's reaching the apartment downstairs.") }), register: "polite" },
        { id: "really_today", s: t("Tiene | que | ser | hoy.", "It-has | to | be | today.", "It really needs to be today.") },
        { id: "appreciate_today", s: t("Le | agradecería | que | viniera | alguien | hoy.", "(To) you | I'd-be-grateful | that | came | someone | today.", "I'd really appreciate it if someone could come today.",
          { flags: { 3: "viniera: the past subjunctive after le agradecería que." } }), register: "polite" },
        { id: "tomorrow_fine", s: t("Mañana | en la mañana | está | bien.", "Tomorrow | in the morning | is | fine.", "Tomorrow morning is fine.", { spain: t("Mañana | por la mañana | está | bien.", "Tomorrow | in the morning | is | fine.", "Tomorrow morning is fine.") }), note: "If you agree, the plumber only comes tomorrow." },
      ],
    },
    time: {
      lt: "Agree on the plumber's time",
      items: [
        { id: "time_perfect", s: t("A las once | sería | perfecto.", "At eleven | would be | perfect.", "Eleven would be perfect."), register: "polite" },
        { id: "could_he", s: t("¿Puede | venir | a la una?", "Can he | come | at one?", "Could he come at one?"), register: "polite" },
        { id: "confirmed", s: t("¿Es | una | hora | fija | o | aproximada?", "Is it | a | time | fixed | or | approximate?", "Is that a confirmed time or an estimate?"), register: "polite" },
        { id: "let_know", s: t("¿Me | puede | avisar | cuando | vaya | en camino?", "(To) me | can you | let know | when | he-is | on the way?", "Could you let me know when he's on his way?",
          { flags: { 4: "vaya: the subjunctive after cuando for something still to come." }, spain: t("¿Me | puede | avisar | cuando | esté | de camino?", "(To) me | can you | let know | when | he-is | on the way?", "Could you let me know when he's on his way?") }), register: "polite" },
        { id: "advise", s: t("Le | agradecería | que | me | avisara | a | qué | hora | llega.", "(To) you | I'd-be-grateful | that | me | you-let-know | at | what | time | he-arrives.",
          "Please let me know what time he'll arrive.", { flags: { 4: "avisara: the past subjunctive after le agradecería que." } }), register: "polite", note: "Very formal, like a letter." },
      ],
    },
    thanks_g: {
      lt: "Thank him politely and say goodbye",
      items: [
        { id: "prompt", s: t("Muchas | gracias | por | su | pronta | atención.", "Many | thanks | for | your | prompt | attention.", "Thank you for your prompt assistance."), register: "polite", note: "The song's phrase: a formal thank-you." },
        { id: "apologize", s: t("Disculpe | las | molestias.", "Excuse | the | inconvenience.", "I apologize for any inconvenience."), register: "polite" },
        { id: "appreciate_it", s: t("Le | agradezco | mucho | su | ayuda.", "(To) you | I-thank | a lot | your | help.", "Thank you, I really appreciate your help."), register: "polite" },
        { id: "kind_regards", s: t("Saludos cordiales.", "Kind regards.", "Kind regards."), note: "How letters end. On the phone it sounds funnily formal, like the song." },
      ],
    },
    voicemail: {
      lt: "Leave a formal voicemail",
      items: [
        { id: "this_is_apt", s: t("Buenos días, | Don Gilberto. | Le habla | {$name} | {$surname}, | del | departamento | 1B.", "Good morning, | Don Gilberto. | This is | {$name} | {$surname}, | from the | apartment | 1B.",
          "Good morning, Don Gilberto. This is {$name} {$surname} from apartment 1B.", { say: "Buenos días, Don Gilberto. Le habla {$name} {$surname}, del departamento uno be.", flags: { 6: F_DEPA },
            neutral: t("Buenos días, | Don Gilberto. | Le habla | {$name} | {$surname}, | del | apartamento | 1B.", "Good morning, | Don Gilberto. | This is | {$name} | {$surname}, | from the | apartment | 1B.",
              "Good morning, Don Gilberto. This is {$name} {$surname} from apartment 1B.", { say: "Buenos días, Don Gilberto. Le habla {$name} {$surname}, del apartamento uno be." }), spain: t("Buenos días, | Don Gilberto. | Le habla | {$name} | {$surname}, | del | 1B.", "Good morning, | Don Gilberto. | This is | {$name} | {$surname}, | from | 1B.", "Good morning, Don Gilberto. This is {$name} {$surname} from apartment 1B.", { say: "Buenos días, Don Gilberto. Le habla {$name} {$surname}, del uno be.", flags: { 2: "Le habla…: the polite way to say who is calling (literally, speaks to you)." } }) }), register: "polite" },
        { id: "regret", s: t("Lamento | informarle | que | se inundó | el | departamento.", "I-regret | to inform you | that | got flooded | the | apartment.",
          "I regret to inform you that the apartment has flooded.", { flags: { 5: F_DEPA },
            neutral: t("Lamento | informarle | que | se inundó | el | apartamento.", "I-regret | to inform you | that | got flooded | the | apartment.",
              "I regret to inform you that the apartment has flooded."), spain: t("Lamento | informarle | de que | se ha inundado | el | piso.", "I-regret | to inform you | that | has flooded | the | apartment.", "I regret to inform you that the apartment has flooded.") }), register: "polite" },
        { id: "grateful_today", s: t("Le | agradecería | mucho | que | mandara | a | alguien | hoy.", "(To) you | I'd-be-grateful | very much | that | you-sent | — | someone | today.",
          "I'd be very grateful if you could send someone today.", { flags: { 5: F_PERSONAL_A } }), register: "polite" },
        { id: "vm_call_back", s: t("Por favor, | devuélvame | la | llamada | en cuanto | pueda.", "Please, | return to me | the | call | as soon as | you-can.", "Please call me back as soon as you can."), register: "polite" },
        { id: "look_forward", s: t("Quedo | {m:atento|f:atenta} | a | su | llamada.", "I-remain | attentive | to | your | call.", "I look forward to your call."), register: "polite",
          note: "A formal sign-off from letters and emails." },
        { id: "kind_regards", s: t("Saludos cordiales.", "Kind regards.", "Kind regards."), note: "How letters end: funnily formal in a voicemail, like the song." },
      ],
    },
  },

  tips: TIPS,

  merges: {
    // Spain's twins (12 Nov 2026)
    "ha pasado": { reason: "grammatical_fusion", split: "ha → has + pasado (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "ya lo sé": { reason: "lexical_expression", split: "ya → already + lo → it + sé → I know; = I know (I'm aware).", minimal: "Three words." },
    "he visto": { reason: "grammatical_fusion", split: "he → have + visto (participle): Spain's present perfect for what has just happened; one English verb phrase.", minimal: "Auxiliary and participle." },
    "menos mal": { reason: "lexical_expression", split: "menos → less + mal → bad is false; = thank goodness (Spain).", minimal: "Two words." },
    "has mandado": { reason: "grammatical_fusion", split: "has → you have + mandado (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "he traído": { reason: "grammatical_fusion", split: "he → I have + traído (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "aun así": { reason: "lexical_expression", split: "aun → even + así → so; = even so, anyway.", minimal: "Two words." },
    "se ha hecho daño": { reason: "lexical_expression", split: "se → oneself + ha hecho → has done + daño → harm; hacerse daño = to get hurt (Spain).", minimal: "The verb phrase." },
    "ha bajado": { reason: "grammatical_fusion", split: "ha → have (usted) + bajado (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "por la mañana": { reason: "lexical_expression", split: "por → through + la → the + mañana → morning; = in the morning (Spain says por).", minimal: "Three words." },
    "un momento": { reason: "lexical_expression", split: "un → a + momento → moment; = one moment (hang on).", minimal: "Two words." },
    "le viene": { reason: "grammatical_fusion", split: "le → to you (usted) + viene → comes: ¿qué le viene mejor? = what suits you better (Spain).", minimal: "Pronoun and verb." },
    "ahora mismo": { reason: "lexical_expression", split: "ahora → now + mismo → same is literal; = right now.", minimal: "Two words." },
    "seguro que": { reason: "lexical_expression", split: "seguro → sure + que → that; = surely, I bet.", minimal: "Two words." },
    "he escuchado": { reason: "grammatical_fusion", split: "he → I have + escuchado (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "se me ha inundado": { reason: "grammatical_fusion", split: "se → itself + me → on me + ha inundado → has flooded: it happened to me, not on purpose, in Spain's present perfect.", minimal: "Pronouns, auxiliary and participle." },
    "se ha atascado": { reason: "grammatical_fusion", split: "se → itself + ha atascado → has clogged: atascarse = to get clogged (Spain), in the present perfect.", minimal: "Pronoun, auxiliary and participle." },
    "has salvado": { reason: "grammatical_fusion", split: "has → you have + salvado (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "de que": { reason: "grammatical_fusion", split: "de → of + que → that: informar de que = to inform (someone) that; English needs only that.", minimal: "Two words." },
    "se ha inundado": { reason: "grammatical_fusion", split: "se → itself + ha inundado → has flooded: inundarse in Spain's present perfect.", minimal: "Pronoun, auxiliary and participle." },
    "avisar de": { reason: "grammatical_fusion", split: "avisar → to notify + de → of; avisar de algo = to report something.", minimal: "Verb and its preposition." },
    "he bajado": { reason: "grammatical_fusion", split: "he → I have + bajado (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "he puesto": { reason: "grammatical_fusion", split: "he → I have + puesto (participle): Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
    "en camino": { reason: "lexical_expression", split: "en → in + camino → road is false; = on the way.", minimal: "Two words." },
    "de camino": { reason: "lexical_expression", split: "de → of + camino → road is false; = on the way.", minimal: "Two words." },
    "no puede ser": { reason: "lexical_expression", split: "no → not + puede → can + ser → be: the exclamation = no way!", minimal: "Three words." },
    "en serio": { reason: "lexical_expression", split: "en → in + serio → serious is false; = seriously.", minimal: "Two words." },
    "ya sé": { reason: "lexical_expression", split: "ya → already + sé → I know: the reply = I know.", minimal: "Two words." },
    "me como": { reason: "grammatical_fusion", split: "me → myself + como → I eat: the pronoun makes it eat (it all) up; = I'll eat.", minimal: "Two words." },
    "no te preocupes": { reason: "grammatical_fusion", split: "no → not + te → yourself + preocupes → worry: = don't worry.", minimal: "The negative command." },
    "no se preocupe": { reason: "grammatical_fusion", split: "no → not + se → yourself + preocupe → worry: = don't worry (usted).", minimal: "The negative command." },
    "no hay problema": { reason: "lexical_expression", split: "no → not + hay → there is + problema → problem: = no problem.", minimal: "Three words." },
    "después de": { reason: "lexical_expression", split: "después → after + de → of: de has no English word before a verb; = after.", minimal: "Two words." },
    "en cuanto": { reason: "lexical_expression", split: "en → in + cuanto → how much is false; = as soon as.", minimal: "Two words." },
    "te quiero": { reason: "lexical_expression", split: "te → you + quiero → I want is false here; = love you.", minimal: "Two words." },
    "don gilberto": { reason: "lexical_expression", split: "Don → (title) + Gilberto: the title of respect and the name stay together.", minimal: "Title and name." },
    "en un rato": { reason: "lexical_expression", split: "en → in + un → a + rato → while: = in a bit.", minimal: "Three words." },
    "no te asustes": { reason: "grammatical_fusion", split: "no → not + te → yourself + asustes → scare: = don't be scared (don't panic).", minimal: "The negative command." },
    "ahora sí": { reason: "lexical_expression", split: "ahora → now + sí → yes: = now (then), okay now.", minimal: "Two words." },
    "así que": { reason: "lexical_expression", split: "así → like this + que → that is false; = so.", minimal: "Two words." },
    "para eso están las amigas": { reason: "lexical_expression", split: "para → for + eso → that + están → are + las → the + amigas → friends is a calque; = that's what friends are for.", minimal: "The saying." },
    "saludos cordiales": { reason: "lexical_expression", split: "saludos → greetings + cordiales → cordial: the letter's sign-off = kind regards.", minimal: "Two words." },
    "a sus órdenes": { reason: "lexical_expression", split: "a → to + sus → your + órdenes → orders is false; = at your service.", minimal: "Three words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain is false; = by the way.", minimal: "Two words." },
    "se lastimó": { reason: "grammatical_fusion", split: "se → himself + lastimó → hurt: the reflexive = got hurt.", minimal: "Two words." },
    "a ver": { reason: "lexical_expression", split: "a → to + ver → see: the filler = let's see / okay.", minimal: "Two words." },
    "con cuidado": { reason: "lexical_expression", split: "con → with + cuidado → care: = carefully.", minimal: "Two words." },
    "de abajo": { reason: "lexical_expression", split: "de → of + abajo → below: after a noun = downstairs.", minimal: "Two words." },
    "de arriba": { reason: "lexical_expression", split: "de → of + arriba → above: after a noun or los = upstairs.", minimal: "Two words." },
    "se reventó": { reason: "grammatical_fusion", split: "se → itself + reventó → burst: the reflexive = it burst (by itself).", minimal: "Two words." },
    "se está": { reason: "grammatical_fusion", split: "se → itself + está → is: with the gerund, the reflexive progressive = it is (leaking).", minimal: "Two words." },
    "por ahora": { reason: "lexical_expression", split: "por → for + ahora → now: = for now.", minimal: "Two words." },
    "al menos": { reason: "lexical_expression", split: "al → to the + menos → less is false; = at least.", minimal: "Two words." },
    "junto a": { reason: "lexical_expression", split: "junto → together + a → to is false; = next to.", minimal: "Two words." },
    "en la mañana": { reason: "lexical_expression", split: "en → in + la → the + mañana → morning: Mexico's way to say in the morning.", minimal: "Three words." },
    "no le va a gustar": { reason: "grammatical_fusion", split: "no → not + le → to her + va a → is going to + gustar → please: = she won't like it.", minimal: "Negation, pronoun and the future." },
    "tiene razón": { reason: "lexical_expression", split: "tiene → you have + razón → reason is false; = you're right.", minimal: "Two words." },
    "se lo": { reason: "grammatical_fusion", split: "se → to you + lo → it: two object pronouns glossed together.", minimal: "Two words." },
    "ya quedamos": { reason: "lexical_expression", split: "ya → already + quedamos → we stayed is false; = it's settled.", minimal: "Two words." },
    "no arriesgarnos": { reason: "grammatical_fusion", split: "no → not + arriesgarnos → to risk ourselves: = not to take the risk.", minimal: "Two words." },
    "a las nueve": { reason: "lexical_expression", split: "a → at + las → the + nueve → nine: the clock time = at nine.", minimal: "S-TIME." },
    "a las once": { reason: "lexical_expression", split: "a → at + las → the + once → eleven: the clock time = at eleven.", minimal: "S-TIME." },
    "a la una": { reason: "lexical_expression", split: "a → at + la → the + una → one: the clock time = at one.", minimal: "S-TIME." },
    "«a las once»": { reason: "lexical_expression", split: "a → at + las → the + once → eleven: the quoted clock time = “at eleven”.", minimal: "S-TIME." },
    "me temo": { reason: "lexical_expression", split: "me → myself + temo → I fear: the polite softener = I'm afraid.", minimal: "Two words." },
    "quiere decir": { reason: "lexical_expression", split: "quiere → wants + decir → to say is false; = means.", minimal: "Two words." },
    "once y media": { reason: "lexical_expression", split: "once → eleven + y → and + media → half: the clock time = eleven-thirty.", minimal: "S-TIME." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing is false; = not at all.", minimal: "Two words." },
    "no hay de qué": { reason: "lexical_expression", split: "no → not + hay → there is + de → of + qué → what: = don't mention it.", minimal: "The reply formula." },
    "hasta luego": { reason: "lexical_expression", split: "hasta → until + luego → later: = goodbye.", minimal: "Two words." },
    "no puedo": { reason: "grammatical_fusion", split: "no → not + puedo → I can: = I can't.", minimal: "S-NEG." },
    "en este momento": { reason: "lexical_expression", split: "en → in + este → this + momento → moment: = at the moment.", minimal: "Three words." },
    "debajo de": { reason: "lexical_expression", split: "debajo → below + de → of: = under.", minimal: "Two words." },
    "al grano": { reason: "lexical_expression", split: "al → to the + grano → grain is false; = to the point.", minimal: "Two words." },
    "me gusta": { reason: "grammatical_fusion", split: "me → to me + gusta → pleases: = I like it.", minimal: "S-CLITIC." },
    "por todos lados": { reason: "lexical_expression", split: "por → through + todos → all + lados → sides: = everywhere.", minimal: "Three words." },
    "se inundó": { reason: "grammatical_fusion", split: "se → itself + inundó → flooded: the reflexive = got flooded.", minimal: "Two words." },
    "se me inundó": { reason: "grammatical_fusion", split: "se → itself + me → on me + inundó → flooded: it flooded on me = my … got flooded.", minimal: "The pronouns and the verb." },
    "se tapó": { reason: "grammatical_fusion", split: "se → itself + tapó → covered: = got clogged.", minimal: "Two words." },
    "va para largo": { reason: "lexical_expression", split: "va → goes + para → for + largo → long: = it's going to take a while.", minimal: "Three words." },
    "no llego": { reason: "grammatical_fusion", split: "no → not + llego → I arrive: = I won't make it.", minimal: "S-NEG." },
    "le habla": { reason: "lexical_expression", split: "le → to you + habla → speaks: the polite phone formula = this is (name).", minimal: "Two words; the name stays outside." },
    "está pasando": { reason: "grammatical_fusion", split: "está → is + pasando → passing: the progressive = it's going through.", minimal: "Two words." },
    "no tenías": { reason: "grammatical_fusion", split: "no → not + tenías → you had: = you didn't have.", minimal: "S-NEG." },
    "le queda": { reason: "grammatical_fusion", split: "le → to you + queda → stays: = it suits you.", minimal: "S-CLITIC." },
    "por favor": { reason: "lexical_expression", split: "por → for + favor → favor: = please.", minimal: "Two words." },
    "don ernesto": { reason: "lexical_expression", split: "Don → (title) + Ernesto: the title of respect and the name stay together.", minimal: "Title and name." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if is false; = in case.", minimal: "Two words." },
    "mientras tanto": { reason: "lexical_expression", split: "mientras → while + tanto → so much is false; = meanwhile.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    // a bonus: shown during Andrea's call (and when done)
    { lt: "Cancel breakfast with your friend and say why", optional: true, done: (c) => !!c.s.cancelled && !!c.s.explained, when: (c) => !c.s.lizzieOver },
    { lt: "Ask your friend for help, or say no thanks, casually", done: (c) => !!c.s.helpAnswered },
    { lt: "Explain to the building manager, formally, what happened", done: explainedToGrant },
    { lt: "Ask for someone to come today", done: (c) => !!c.s.today },
    { lt: "Agree on a time and thank him politely", done: (c) => !!c.s.timeSet && !!c.s.thanked },
  ],

  steps: [
    // --- Andrea ---
    { id: "l_news", when: inLizzie, done: (c) => !!c.s.explained,
      ask: (c) => {
        const n = bump(c, "l_news");
        if (n >= 3) { L(c, "l_guess"); return; }
        L(c, c.s.cancelled && n === 1 ? "l_what" : "l_what_again");
      },
      expects: ["cancel_brunch", "flood", "cat_fridge", "freaking_out"],
      suggest: [{ lt: "Cancel breakfast and say what happened", hint: "news" }],
      yes: (c) => { if ((c.s.asks?.l_news ?? 0) >= 3) explain(c); },
      no: () => { /* she asks again */ },
      help: (c) => { L(c, "l_guess"); c.s.asks ||= {}; c.s.asks.l_news = 3; } },
    { id: "l_okay", when: (c) => inLizzie(c) && !!c.s.explained && !!c.s.askOkay, done: (c) => !!c.s.okayDone || asked(c, "l_okay"),
      ask: (c) => { bump(c, "l_okay"); L(c, "l_are_you_ok"); },
      expects: ["nobody_hurt", "freaking_out", "not_ok_ctx"],
      suggest: [{ lt: "Say how you're doing", hint: "okay" }],
      yes: (c) => { c.s.okayDone = true; L(c, "l_glad_ok"); },
      no: (c) => { c.s.okayDone = true; L(c, "l_breathe"); } },
    { id: "l_brunch", when: (c) => inLizzie(c) && !!c.s.explained && !c.s.cancelled, done: (c) => !!c.s.cancelled || asked(c, "l_brunch"),
      ask: (c) => { bump(c, "l_brunch"); L(c, "l_brunch_q"); },
      expects: ["cancel_brunch", "sorry_ctx"],
      suggest: [{ lt: "Say you can't make breakfast", hint: "news" }],
      yes: (c) => { c.s.cancelled = true; L(c, "l_brunch_ok"); },
      no: (c) => { c.s.cancelled = true; L(c, "l_brunch_ok"); } },
    { id: "l_need", when: (c) => inLizzie(c) && !!c.s.explained, done: (c) => !!c.s.helpAnswered,
      ask: (c) => { bump(c, "l_need"); L(c, "l_need_q"); },
      expects: ["ask_help", "item_ctx", "need_nothing", "not_item", "come_no"],
      suggest: [{ lt: "Ask her to bring something", hint: "need", options: CHIPS }, { lt: "Say you don't need anything", hint: "need" }],
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
      suggest: [{ lt: "Thank your friend casually", hint: "door" }],
      yes: (c) => { doorThanks(c); }, no: (c) => { doorThanks(c); } },
    // after "No, estoy bien": "¿Segura? Puedo pasar después de desayunar."
    { id: "l_come", when: (c) => inLizzie(c) && !!c.s.helpAnswered && !!c.s.declined && c.s.twist !== "door", done: (c) => !!c.s.comeDone || asked(c, "l_come"),
      ask: (c) => { bump(c, "l_come"); L(c, "l_sure"); },
      expects: ["need_nothing", "come_no", "ask_help", "item_ctx", "sure_ctx"],
      suggest: [{ lt: "Say yes, or say no thanks again", hint: "need" }],
      // "Sí, por favor." / "Bueno, sí." takes up her offer; a bare "Sí" answers "¿Segura?" (she stays at breakfast)
      yes: (c) => { if (takesOffer(c)) askHelp(c, {}, COME_SEG); else sureNotComing(c); },
      no: (c) => { sureNotComing(c); } },
    { id: "l_bye", when: (c) => inLizzie(c) && !!c.s.helpAnswered && (c.s.twist === "door" ? !!c.s.doorDone : (!c.s.declined || !!c.s.comeDone || asked(c, "l_come"))),
      done: (c) => !!c.s.byeL,
      ask: (c) => { if (bump(c, "l_bye") > 1) { byeLizzie(c, "bye"); return; } L(c, "l_bye_q"); },
      expects: ["warm", "see_you", "formal_thanks", "kind_regards", "g_bye", "g_thanks"],
      suggest: [{ lt: "Say goodbye like friends do", hint: "bye_l" }],
      yes: (c) => { byeLizzie(c, "bye"); }, no: (c) => { byeLizzie(c, "bye"); } },

    // --- the voicemail (the recording asks nothing: the step is silent) ---
    { id: "vm_msg", silent: true, when: inVm, done: (c) => !!c.s.vmEnded,
      ask: (c) => {
        if (bump(c, "vm_msg") === 1) { G(c, "vm_greet"); c.event("beep"); }
        vmSilent(c);
      },
      expects: ["vm_unknown", "intro", "vm_who_ctx", "flood", "when_happened", "water_off", "downstairs_yes", "nobody_hurt", "ask_plumber", "today_ctx", "insist_today",
        "vm_close", "kind_regards", "formal_thanks", "apologize"],
      suggest: (c) => [
        ...(!c.s.who ? [{ lt: "Say hello and who's calling", hint: "voicemail" }] : []),
        ...(!c.s.gFlood ? [{ lt: "Explain formally what happened", hint: "voicemail" }] : []),
        ...(!c.s.requested ? [{ lt: "Ask for someone to come today", hint: "voicemail" }] : []),
        { lt: "End the message (ask him to call back, kind regards)", hint: "voicemail" },
      ],
      yes: (c) => { vmSilent(c); }, no: (c) => { vmSilent(c); } },

    // --- Don Gilberto ---
    { id: "g_who", when: inGrant, done: (c) => !!c.s.who,
      ask: (c) => {
        const n = bump(c, "g_who");
        if (n === 1) { G(c, c.s.calledBack ? "gr_who_btw" : "gr_pickup"); return; }
        if (n >= 3) { c.s.who = true; G(c, "gr_guess_who"); G(c, "gr_what_again"); return; }
        G(c, "gr_who_again");
      },
      expects: ["intro", "intro_ctx", "its_me", "its_me_ctx"],
      suggest: [{ lt: "Say who's calling (name and apartment)", hint: "who" }],
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
      suggest: [{ lt: "Explain formally what happened", hint: "report" }],
      // "Sí." to his guess: he knows now, but the learner hasn't explained it (mission item 3 stays open)
      yes: (c) => { if ((c.s.asks?.g_what ?? 0) >= 3) { c.s.guessed = true; grantFlood(c); } },
      no: () => { /* he asks again */ },
      help: (c) => { G(c, "gr_guess_washer"); c.s.asks ||= {}; c.s.asks.g_what = 3; } },
    { id: "g_since", when: (c) => inGrant(c) && grantKnows(c) && !!c.s.askSince, done: sinceOk,
      ask: (c) => { bump(c, "g_since"); G(c, "gr_since_q"); },
      expects: ["when_happened", "when_ctx", "unsure_ctx"],
      suggest: [{ lt: "Say when it started", hint: "details" }],
      yes: (c) => { c.s.sinceDone = true; }, no: (c) => { c.s.sinceDone = true; },
      help: (c) => { c.s.sinceDone = true; G(c, "gr_ok"); } },
    { id: "g_hurt", when: (c) => inGrant(c) && grantKnows(c), done: hurtOk,
      ask: (c) => { bump(c, "g_hurt"); G(c, "gr_hurt_q"); },
      expects: ["nobody_hurt", "freaking_out", "fine_ctx", "hurt_ctx"],
      suggest: [{ lt: "Say whether anybody got hurt", hint: "details" }],
      // "Sí" (somebody hurt?): he worries and waits for "Sí, estoy bien."
      yes: (c) => { hurtYes(c); },
      no: (c) => { c.s.hurtDone = true; G(c, "gr_relief"); } },
    { id: "g_down", when: (c) => inGrant(c) && grantKnows(c), done: downOk,
      ask: (c) => { bump(c, "g_down"); G(c, "gr_down_q"); },
      expects: ["downstairs_yes", "downstairs_no", "down_yes_ctx", "down_no_ctx", "unsure_ctx"],
      suggest: [{ lt: "Say whether it has reached the apartment downstairs", hint: "details" }],
      yes: (c) => { downstairs(c, true); }, no: (c) => { downstairs(c, false); },
      help: (c) => { c.s.downDone = true; G(c, "gr_down_unknown"); } },
    { id: "g_water", when: (c) => inGrant(c) && grantKnows(c), done: waterOk,
      // asked and left unanswered (another answer came): he doesn't ask twice, he says where the breakers are
      ask: (c) => { if (bump(c, "g_water") >= 2) { if (once(c, "g_towels")) G(c, "gr_power_first"); waterNotOff(c); return; } G(c, "gr_water_q"); },
      expects: ["water_off", "water_not_off", "switch_unknown_ctx", "valve_done_ctx", "no_power", "towels_done", "ask_what_do"],
      suggest: [{ lt: "Say what you've already done", hint: "details" }],
      yes: (c) => { waterOff(c); }, no: (c) => { waterNotOff(c); },
      help: (c) => { waterNotOff(c); } },
    { id: "g_request", when: (c) => inGrant(c) && grantKnows(c) && detailsDone(c), done: (c) => !!c.s.requested,
      ask: (c) => {
        const n = bump(c, "g_request");
        if (n >= 3) { G(c, "gr_send_q"); return; }
        G(c, "gr_req_q");
      },
      expects: ["ask_plumber", "plumber_ctx", "today_ctx", "insist_today", "demand_rude", "no_rush_ctx"],
      suggest: [{ lt: "Ask for someone to come today", hint: "request" }],
      yes: (c) => { if ((c.s.asks?.g_request ?? 0) >= 3) c.s.requested = true; },
      // "No, gracias." to "¿Quiere que le mande a mi plomero?": "Entonces, ¿cómo le ayudo?" (not the same question again)
      no: (c) => { if ((c.s.asks?.g_request ?? 0) >= 3) c.s.asks.g_request = 1; },
      help: (c) => { G(c, "gr_send_q"); c.s.asks ||= {}; c.s.asks.g_request = 3; } },
    // he offers tomorrow first (unless the learner already insisted on today)
    { id: "g_offer", when: (c) => inGrant(c) && !!c.s.requested && grantKnows(c) && detailsDone(c), done: (c) => !!c.s.today || !!c.s.tomorrow || !!c.s.sureQ,
      ask: (c) => {
        if (c.s.insisted) { todayNow(c); return; }
        const n = bump(c, "g_offer");
        if (n === 1) { c.s.offered = true; G(c, "gr_offer_a"); G(c, "gr_offer_b"); return; }
        if (n >= 3) { dontKnowToday(c); return; }
        G(c, "gr_offer_again");
      },
      expects: ["insist_today", "insist_ctx", "wait_no_ctx", "wait_yes_ctx", "accept_tomorrow", "ask_plumber", "today_ctx", "downstairs_yes", "flood", "no_rush_ctx", "tomorrow_ctx", "unsure_ctx"],
      suggest: [{ lt: "Ask for today, politely but firmly", hint: "insist" }, { lt: "Agree to tomorrow", hint: "insist" }],
      yes: (c) => { acceptTomorrow(c); },
      // "Así está bien" could be "it's fine (tomorrow)" or "no, leave it": he asks again (rule 17)
      no: (c) => { if (/\basi esta bien\b/.test(heard(c)) && once(c, "g_offer_amb")) { whichDay(c); return; } todayNow(c); },
      help: (c) => { dontKnowToday(c); } },
    { id: "g_time", when: (c) => inGrant(c) && !!c.s.today, done: (c) => !!c.s.timeSet,
      ask: (c) => {
        const n = bump(c, "g_time");
        if (n >= 4) { c.s.timeSet = "eleven"; G(c, "gr_time_11"); return; }
        if (n === 1) G(c, "gr_texting");
        G(c, "gr_time_q");
      },
      expects: ["pick_time", "time_ctx", "time_not", "ask_confirmed"],
      suggest: [{ lt: "Choose a time (11:00 or 1:00)", hint: "time" }],
      yes: (c) => { G(c, "gr_time_q"); c.hold(); },
      no: (c) => { G(c, "gr_time_only"); c.hold(); },
      help: (c) => { c.s.timeSet = "eleven"; G(c, "gr_time_11"); } },
    { id: "g_close", when: (c) => inGrant(c) && (!!c.s.timeSet || !!c.s.tomorrow), done: (c) => !!c.s.thanked || !!c.s.closeNo || !!c.s.over || asked(c, "g_close"),
      ask: (c) => { bump(c, "g_close"); G(c, "gr_anything"); },
      expects: ["formal_thanks", "apologize", "kind_regards", "ask_confirmed", "ask_eta", "ask_damage", "thats_all", "warm", "g_thanks"],
      suggest: [{ lt: "Thank him politely", hint: "thanks_g" }, { lt: "Ask whether the time is exact", hint: "time" }],
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
        // before help is settled: "¿Necesitas algo?"
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
    // "Bueno." / "Va." to "¿Podría esperar a mañana?" is an okay: he checks ("¿Está seguro?") before it counts
    g_ok(c) { if (inVm(c)) { vmSilent(c); return; } if (inGrant(c) && c.step === "g_offer" && !c.s.today && !c.s.tomorrow) acceptTomorrow(c); },
    // "¡Perdón!" to Andrea is about breakfast (her answer comes with the rest); to Don Gilberto it's an apology
    g_sorry(c) { if (inVm(c)) { vmSilent(c); return; } if (inGrant(c)) { thankGrant(c, "apology"); return; } turn(c).sorry = true; },
    g_wait(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_wait(c as ConvCtx, slots); },
    g_learning(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_learning(c as ConvCtx, slots); },
    g_repeat(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_repeat(c as ConvCtx, slots); },
    g_slower(c, slots) { if (inVm(c)) { vmSilent(c); return; } GLOBAL_HANDLERS.g_slower(c as ConvCtx, slots); },
    g_dontknow(c, slots) {
      if (inVm(c)) { vmSilent(c); return; }
      // "No sé." to "¿Podría esperar a mañana?": he decides, and the time question follows (no hold)
      if (inGrant(c) && c.step === "g_offer" && !c.s.today && !c.s.tomorrow) { dontKnowToday(c); return; }
      // "No sé." to "¿Ya pasó el agua abajo?" / "¿Desde cuándo?": that's an answer
      if (inGrant(c) && (c.step === "g_down" || c.step === "g_since")) { unsure(c); return; }
      GLOBAL_HANDLERS.g_dontknow(c as ConvCtx, slots);
    },
  },

  finish: (c) => {
    if (c.s.over) return;
    if (!c.s.thanked && !c.s.tomorrow) { G(c, "gr_see_you"); expectClosing(c); return; }
    wrapUp(c);
  },

  tests: [
    // --- Andrea: every hint construction ---
    { say: "¡Perdón, no llego al desayuno!", intent: "cancel_brunch", step: "l_news" },
    { say: "¡Se me inundó el depa!", intent: "flood", step: "l_news" },
    { say: "¡Se me inundó el apartamento!", intent: "flood", step: "l_news" },
    { say: "Hay agua por todos lados.", intent: "flood", step: "l_news" },
    { say: "Hay un río en la cocina.", intent: "flood", step: "l_news" },
    { say: "Se tapó la coladera de la azotea.", intent: "flood", step: "l_news" },
    // the follow-up pass (5 Nov 2026): a burst pipe in 2B upstairs; Don Ernesto downstairs
    { say: "Se reventó un tubo en el 2B.", intent: "flood", step: "l_news" },
    { say: "Los de arriba tienen una fuga.", intent: "flood", step: "l_news" },
    { say: "Lamento informarle que se reventó un tubo en el departamento de arriba.", intent: "flood", step: "g_what" },
    { say: "Le llamo porque hay una fuga en el 2B.", intent: "flood", step: "g_what" },
    { say: "Sí, ya le está goteando a Don Ernesto.", intent: "downstairs_yes", step: "g_down", not: ["downstairs_no"] },
    { say: "No, con Don Ernesto todavía no.", intent: "downstairs_no", step: "g_down", not: ["downstairs_yes"] },
    { say: "Esto va para largo.", intent: "cancel_brunch", step: "l_news" },
    { say: "El gato está arriba del refri.", intent: "cat_fridge", step: "l_news" },
    { say: "El gato está encima del refrigerador.", intent: "cat_fridge", step: "l_news" },
    { say: "¿Lo dejamos para otro día?", intent: "cancel_brunch", step: "l_news" },
    { say: "Estoy bien, solo mojada.", intent: "nobody_hurt", step: "l_okay" },
    { say: "Estoy en pánico.", intent: "freaking_out", step: "l_okay" },
    { say: "Nadie se lastimó.", intent: "nobody_hurt", step: "l_okay" },
    { say: "¿Me puedes traer un trapeador?", intent: "ask_help", step: "l_need", slots: { stuff: "mop" } },
    { say: "¿Puedes pasar por una cubeta de camino?", intent: "ask_help", step: "l_need", slots: { stuff: "bucket" } },
    { say: "¿Y café? Mucho café.", intent: "item_ctx", step: "l_need" },
    { say: "¿Puedes venir?", intent: "ask_help", step: "l_need" },
    { say: "No, estoy bien, gracias.", intent: "need_nothing", step: "l_need" },
    { say: "No te preocupes. ¡Disfruta el desayuno!", intent: "need_nothing", step: "l_need" },
    { say: "Manda toallas. ¡Manda una lancha!", intent: "ask_help", step: "l_need" },
    { say: "¡Te quiero, gracias!", intent: "warm", step: "l_bye" },
    { say: "¡Nos vemos en un rato!", intent: "see_you", step: "l_bye" },
    { say: "¡Eres la mejor!", intent: "warm", step: "l_bye" },
    { say: "¡Luego hablamos!", intent: "see_you", step: "l_bye" },
    { say: "¡Te debo una!", intent: "warm", step: "l_bye" },
    { say: "¡Me salvaste la vida!", intent: "warm", step: "l_door" },
    { say: "¡No tenías que hacerlo!", intent: "warm", step: "l_door" },
    { say: "¡Pasa, pasa!", intent: "warm", step: "l_door" },
    // --- Don Gilberto: every hint construction ---
    { say: "Buenos días, Don Gilberto. Le habla Ryan Miller, del departamento 1B.", intent: "intro", step: "g_who" },
    { say: "Soy el inquilino del 1B.", intent: "intro", step: "g_who" },
    { say: "Le hablo del departamento 1B.", intent: "intro", step: "g_who" },
    { say: "Lamento informarle que se inundó el departamento.", intent: "flood", step: "g_what" },
    { say: "Le llamo para informarle que entró agua por el techo.", intent: "flood", step: "g_what" },
    { say: "Le hablo para reportar una filtración.", intent: "flood", step: "g_what" },
    { say: "Me temo que la cocina está inundada.", intent: "flood", step: "g_what" },
    { say: "Empezó anoche, con la tormenta.", intent: "when_happened", step: "g_since" },
    { say: "Ya bajé el switch de la luz.", intent: "water_off", step: "g_water" },
    { say: "Ya bajé el interruptor de la luz.", intent: "water_off", step: "g_water" },
    { say: "Ya puse toallas en el piso.", intent: "towels_done", step: "g_water", not: ["water_off"] },
    { say: "No, nadie se lastimó.", intent: "nobody_hurt", step: "g_hurt" },
    { say: "Me temo que ya está pasando al departamento de abajo.", intent: "downstairs_yes", step: "g_down" },
    { say: "No sé dónde está el switch.", intent: "water_not_off", step: "g_water", not: ["water_off"] },
    { say: "Le agradecería mucho que mandara a alguien hoy.", intent: "ask_plumber", step: "g_request" },
    { say: "¿Podría mandar un plomero hoy?", intent: "ask_plumber", step: "g_request" },
    { say: "¿Podría venir alguien hoy?", intent: "ask_plumber", step: "g_request" },
    { say: "¿Habría manera de que viniera alguien hoy?", intent: "ask_plumber", step: "g_request" },
    { say: "Me temo que no puede esperar hasta mañana.", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Tiene que ser hoy.", intent: "insist_today", step: "g_offer" },
    { say: "Le agradecería que viniera alguien hoy.", intent: "insist_today", step: "g_offer" },
    { say: "Mañana en la mañana está bien.", intent: "accept_tomorrow", step: "g_offer" },
    { say: "A las once sería perfecto.", intent: "pick_time", step: "g_time", slots: { time: { h: 11 } } },
    { say: "¿Puede venir a la una?", intent: "pick_time", step: "g_time", slots: { time: { h: 1 } } },
    { say: "¿Es una hora fija o aproximada?", intent: "ask_confirmed", step: "g_time" },
    { say: "¿Me puede avisar cuando vaya en camino?", intent: "ask_confirmed", step: "g_time" },
    { say: "Le agradecería que me avisara a qué hora llega.", intent: "ask_confirmed", step: "g_time" },
    { say: "Muchas gracias por su pronta atención.", intent: "formal_thanks", step: "g_close" },
    { say: "Disculpe las molestias.", intent: "apologize", step: "g_close" },
    { say: "Le agradezco mucho su ayuda.", intent: "formal_thanks", step: "g_close" },
    { say: "Saludos cordiales.", intent: "kind_regards", step: "g_close" },
    { say: "Por favor, devuélvame la llamada en cuanto pueda.", intent: "vm_close", step: "vm_msg" },
    { say: "Quedo atento a su llamada.", intent: "vm_close", step: "vm_msg" },
    // --- natural alternatives, short answers, accentless typing, register slips ---
    { say: "Guey, se me inundo el depa", intent: "flood", step: "l_news" },
    { say: "No puedo ir al desayuno, se me inundó el depa", intent: "flood", step: "l_news" },
    { say: "Lamento informarte que no podré asistir al desayuno", intent: "cancel_brunch", step: "l_news" },
    { say: "Toallas y café", intent: "item_ctx", step: "l_need" },
    { say: "Ocupo un jalador", intent: "ask_help", step: "l_need", slots: { stuff: "squeegee" } },
    { say: "¿Podría traerme unas toallas?", intent: "ask_help", step: "l_need" },
    { say: "Habla Ryan", intent: "intro_ctx", step: "g_who" },
    { say: "Soy yo", intent: "its_me", step: "g_who" },
    { say: "Hace una hora", intent: "when_happened", step: "g_since" },
    { say: "En la madrugada", intent: "when_ctx", step: "g_since" },
    { say: "Ya corté la luz", intent: "water_off", step: "g_water" },
    { say: "Un plomero", intent: "plumber_ctx", step: "g_request" },
    { say: "Hoy mismo, si se puede", intent: "today_ctx", step: "g_request" },
    { say: "¿Puedes mandar a alguien hoy?", intent: "ask_plumber", step: "g_request" },
    { say: "¡Arréglelo ya!", intent: "demand_rude", step: "g_request" },
    { say: "Mañana es muy tarde", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Es urgente", intent: "insist_today", step: "g_offer" },
    { say: "Sigue entrando agua", intent: "flood", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Me da igual", intent: "time_ctx", step: "g_time" },
    { say: "Entre más temprano, mejor", intent: "pick_time", step: "g_time" },
    { say: "¿Quién va a pagar los daños?", intent: "ask_damage", step: "g_close" },
    { say: "No, eso es todo, gracias", intent: "thats_all", step: "g_close" },
    { say: "Perdón por llamar tan temprano", intent: "apologize", step: "g_close" },
    { say: "Te quiero, gracias", intent: "warm", step: "g_close" },
    // --- Spain forms are correct answers ---
    { say: "Se me ha inundado el piso", intent: "flood", step: "l_news" },
    { say: "¿Me traes una fregona?", intent: "ask_help", step: "l_need", slots: { stuff: "mop" } },
    { say: "¿Podría mandar un fontanero hoy?", intent: "ask_plumber", step: "g_request" },
    { say: "Vale, mañana me sirve", intent: "accept_tomorrow", step: "g_offer" },
    // --- meaning safety: no meaning may flip ---
    { say: "No necesito un trapeador", intent: "not_item", step: "l_need", not: ["ask_help", "item_ctx"] },
    { say: "Ya tengo un trapeador", intent: "not_item", step: "l_need", not: ["ask_help", "item_ctx"] },
    { say: "No vengas, disfruta tu desayuno", intent: "come_no", step: "l_need", not: ["ask_help"] },
    { say: "No estoy bien", intent: "not_ok_ctx", step: "l_okay", not: ["nobody_hurt"] },
    { say: "No, estoy bien", intent: "fine_ctx", step: "g_hurt", not: ["freaking_out", "not_ok_ctx"] },
    { say: "No, no sé dónde está", intent: "switch_unknown_ctx", step: "g_water", not: ["water_off"] },
    { say: "No, todavía no ha pasado abajo", intent: "downstairs_no", step: "g_down", not: ["downstairs_yes", "down_yes_ctx"] },
    { say: "No, solo en mi cocina", intent: "downstairs_no", step: "g_down", not: ["downstairs_yes"] },
    { say: "No he bajado el switch", intent: "water_not_off", step: "g_water", not: ["water_off"] },
    { say: "Todavía hay luz", intent: "water_not_off", step: "g_water", not: ["water_off"] },
    { say: "No puede esperar", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow", "wait_yes_ctx"] },
    { say: "No creo que pueda esperar a mañana", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Mañana no me sirve", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow"] },
    { say: "Mi depa no se inundó", intent: "none", step: "l_news", not: ["flood"] },
    { say: "No es urgente", intent: "no_rush_ctx", step: "g_offer", not: ["insist_today", "accept_tomorrow"] },
    { say: "No hace falta que venga hoy", intent: "no_rush_ctx", step: "g_offer", not: ["today_ctx", "insist_today"] },
    { say: "Mañana", intent: "tomorrow_ctx", step: "g_offer", not: ["today_ctx", "insist_today"] },
    { say: "Sí, perdón", intent: "sorry_ctx", step: "l_brunch", not: ["g_repeat"] },
    { say: "No necesito un plomero", intent: "none", step: "g_request", not: ["ask_plumber", "plumber_ctx"] },
    { say: "A las once no puedo", intent: "time_not", step: "g_time", not: ["pick_time", "time_ctx"] },
    { say: "No a las once, a la una", intent: "time_not", step: "g_time", not: ["pick_time", "time_ctx"] },
    { say: "No me devuelva la llamada", intent: "none", step: "vm_msg", not: ["vm_close"] },
    // --- review traps (4 Nov 2026) ---
    { say: "No tiene que ser hoy", intent: "no_rush_ctx", step: "g_offer", not: ["insist_today", "today_ctx"] },
    { say: "No necesita ser hoy", intent: "no_rush_ctx", step: "g_offer", not: ["insist_today"] },
    { say: "No puede ser hoy", intent: "no_rush_ctx", step: "g_offer", not: ["insist_today"] },
    { say: "¿Podría ser hoy?", intent: "insist_today", step: "g_offer", not: ["accept_tomorrow", "no_rush_ctx"] },
    { say: "Mejor mañana", intent: "accept_tomorrow", step: "g_offer", not: ["insist_today"] },
    { say: "Las dos", intent: "time_ctx", step: "g_time", slots: { time: { h: 2 } } },
    { say: "Cualquiera de las dos", intent: "time_ctx", step: "g_time" },
    { say: "Sí, me corté el pie", intent: "hurt_ctx", step: "g_hurt", not: ["nobody_hurt", "fine_ctx"] },
    { say: "Ya", intent: "valve_done_ctx", step: "g_water", not: ["water_not_off", "switch_unknown_ctx"] },
    { say: "Sí, la vecina ya se quejó", intent: "downstairs_yes", step: "g_down", not: ["downstairs_no"] },
    { say: "Quiero café", intent: "ask_help", step: "l_need", slots: { stuff: "coffee" }, not: ["warm"] },
    { say: "No me traigas nada, estoy bien", intent: "need_nothing", step: "l_need", not: ["ask_help", "item_ctx"] },
    { say: "Sí, nomás mojada", intent: "nobody_hurt", step: "l_okay" },
    { say: "Buenos días, Don Gilberto, le habla su inquilina del 1B", intent: "intro", step: "g_who" },
    { say: "¿Es una hora segura o más o menos?", intent: "ask_confirmed", step: "g_time" },
    // --- the audit (5 Nov 2026): the building, the power first, the side questions ---
    { say: "Habla Ryan, del 1B", intent: "intro", step: "g_who" },
    { say: "Soy la inquilina del 1B", intent: "intro", step: "g_who" },
    { say: "Le habla Ryan Miller, del departamento uno be", intent: "intro", step: "g_who" },
    { say: "Habla Ryan, del 3B", intent: "intro", step: "g_who" },
    { say: "Lo llamo del apartamento 1B", intent: "intro", step: "g_who" },
    { say: "Lo llamo para reportar una filtración", intent: "flood", step: "g_what" },
    { say: "Ya saqué el agua con una cubeta", intent: "towels_done", step: "g_water", not: ["water_off"] },
    { say: "Sí, ya bajé el switch y puse toallas en el piso", intent: "water_off", step: "g_water", not: ["towels_done"] },
    { say: "No hay luz", intent: "no_power", step: "g_water", not: ["water_off"] },
    { say: "Se fue la luz con la tormenta", intent: "no_power", step: "g_water", not: ["water_off"] },
    { say: "Todavía hay luz", intent: "water_not_off", step: "g_water", not: ["water_off", "no_power"] },
    { say: "¿Cuál switch?", intent: "switch_unknown_ctx", step: "g_water", not: ["water_off"] },
    { say: "¿Qué hago mientras tanto?", intent: "ask_what_do", step: "g_time" },
    { say: "¿Le aviso a Don Ernesto?", intent: "ask_owner", step: "g_close" },
    { say: "¿Don Ernesto ya sabe?", intent: "ask_owner", step: "g_close" },
    { say: "¿A qué hora llegas?", intent: "ask_eta", step: "l_bye" },
    { say: "Sí, pásate después", intent: "ask_help", step: "l_come", not: ["sure_ctx", "need_nothing"] },
    // --- not understood ---
    { say: "Me gusta mucho bailar salsa", intent: "none", step: "l_news" },
    { say: "El perro de mi abuela canta rancheras", intent: "none", step: "g_close" },
    { say: "Quiero comprar un boleto de avión", intent: "none", step: "g_offer" },
  ],

  sims: [
    { name: "happy path: casual with Andrea, formal with Don Gilberto", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = true; },
      turns: ["¡Perdón, no llego al desayuno! ¡Se me inundó el depa!", "¿Me puedes traer un trapeador? ¿Y café? Mucho café.", "¡Te quiero, gracias!",
        "Buenos días, Don Gilberto. Le habla Ryan Miller, del departamento 1B.", "Lamento informarle que se inundó el departamento.",
        "Empezó anoche, con la tormenta.", "No, nadie se lastimó.", "Sí, me temo que ya está pasando al departamento de abajo.",
        "Sí, ya bajé el switch de la luz y puse toallas en el piso.", "Le agradecería mucho que mandara a alguien hoy.",
        "Me temo que no puede esperar hasta mañana.", "A las once sería perfecto.", "Muchas gracias por su pronta atención."],
      expect: { complete: true, state: { cancelled: true, today: true, timeSet: "eleven", thanked: true, regretSaid: true, outcome: "done" } }, auto: AUTO },
    { name: "questions and changes of mind", setup: (s) => { s.twist = null; s.askOkay = true; s.askSince = false; },
      turns: ["¡Hola, Andrea!", "Hay agua por todos lados. El gato está arriba del refri.", "Estoy en pánico.", "¿Lo dejamos para otro día?",
        "No, estoy bien, gracias.", "Bueno, ¿me podrías traer unas toallas?", "¡Nos vemos en un rato!",
        "¡Soy yo!", "Soy el inquilino del 1B.", "Le hablo para reportar una filtración. Entró agua por el techo.", "No, solo mis calcetines.", "No estoy seguro.",
        "No sé dónde está el switch.", "Listo, ya está.", "¿Podría venir alguien mañana?", "La verdad, tiene que ser hoy.",
        "¿Es una hora fija o aproximada?", "A la una me queda mejor.", "¿Quién va a pagar los daños?", "Disculpe las molestias."],
      expect: { complete: true, state: { cancelled: true, declined: false, today: true, timeSet: "one", confirmAsked: true, damageAsked: true } }, auto: AUTO },
    { name: "door (twist): Andrea is already outside", setup: (s) => { s.twist = "door"; s.askOkay = false; s.askSince = false; },
      turns: ["Oye, no voy a poder ir al desayuno. Entró agua por el techo y hay agua por todos lados.", "¿Puedes pasar por un trapeador de camino?",
        "¡Me salvaste la vida!", "Habla Ryan, del departamento 1B.", "Me temo que la cocina está inundada.", "Nadie se lastimó.",
        "No, solo en mi cocina.", "Sí, ya lo hice.", "¿Podría mandar un plomero hoy?", "Mañana en la mañana está bien.",
        "Mmm, mejor hoy, no mañana.", "¿Puede venir a las once?", "No, eso es todo. Le agradezco mucho su ayuda."],
      expect: { complete: true, state: { doorDone: true, today: true, timeSet: "eleven", outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist): a formal message, then he calls back", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["Oye, perdón, no llego al desayuno. Se me inundó el depa.", "¿Me puedes traer una cubeta?", "Gracias, ¡bye!",
        "Buenos días, Don Gilberto. Le habla Ryan Miller, del departamento 1B.", "Lamento informarle que se inundó el departamento.",
        "Le agradecería mucho que mandara a alguien hoy.", "Me temo que ya está pasando al departamento de abajo.",
        "Por favor, devuélvame la llamada en cuanto pueda. Saludos cordiales.", "No, nadie se lastimó.", "Sí, ya bajé el switch de la luz.",
        "A las once sería perfecto.", "Muchas gracias por su pronta atención."],
      expect: { complete: true, state: { vmEnded: true, calledBack: true, downstairs: true, today: true, outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist): a short message, the rest on the callback", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["No puedo ir al desayuno, se me inundó la cocina.", "No necesito nada, de verdad.", "No, no vengas. ¡Disfruta tu desayuno!", "¡Luego hablamos!",
        "Buenos días, Don Gilberto, le llamo por la fuga del 2B. Por favor, devuélvame la llamada.", "Habla Ryan, del 1B.", "No, todos estamos bien.",
        "No, todavía no.", "Ya corté la luz.", "¿Habría manera de que viniera alguien hoy?", "Es urgente.", "Entre más temprano, mejor.", "¡Muchas gracias!"],
      expect: { complete: true, state: { vmEnded: true, declined: true, today: true, timeSet: "eleven" } }, auto: AUTO },
    { name: "wrong registers: stiff with Andrea, too casual with Don Gilberto (tips)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Querida Andrea, lamento informarte que no podré asistir al desayuno.", "La cocina se inundó por un tubo del 2B.",
        "Le agradecería que me trajera un trapeador.", "Saludos cordiales.",
        "¡Soy yo!", "Soy Ryan, del 1B. Güey, se me inundó el depa, ¡arréglalo ya!", "Nop.", "Sí, gotea abajo.", "Sí.",
        "No, mañana es muy tarde.", "A cualquier hora, estoy todo el día en casa.", "¡Te quiero, gracias!"],
      expect: { complete: true, state: { laughed: true, today: true, thanked: true, timeSet: "eleven" } }, auto: AUTO },
    { name: "tomorrow accepted (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["¡Hola! No puedo ir al desayuno, se me inundó la cocina.", "No, estoy bien, gracias.", "No, de verdad, estoy bien. ¡Disfruta el desayuno!", "¡Adiós!",
        "Hola, habla Ryan, del 1B.", "Hay goteras en la cocina.", "No.", "No.", "Sí.", "¿Podría mandar un plomero?", "Mañana está bien.",
        "Sí, mañana está bien.", "No, gracias. ¡Adiós!"],
      expect: { complete: false, state: { tomorrow: true, outcome: "tomorrow" } }, auto: AUTO },
    { name: "lost commas: 'Sí, perdón', 'No es urgente' (he asks again), 'A las once no puedo'", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Se me inundó el depa.", "Sí, perdón.", "Toallas y café.", "¡Nos vemos en un rato!",
        "Le habla Ryan Miller, del departamento 1B.", "Me temo que la cocina está inundada.", "No, estoy bien.", "Sí, estoy bien.", "Me temo que sí.", "Sí, ya.",
        "¿Podría mandar un plomero hoy?", "No es urgente.", "Hoy, por favor.", "A las once no puedo.", "Muchas gracias por su pronta atención."],
      expect: { complete: true, state: { cancelled: true, downstairs: true, today: true, timeSet: "one", outcome: "done" } }, auto: AUTO },
    { name: "it can wait: 'No hace falta que venga hoy', then 'Sí, puede esperar' (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = true; },
      turns: ["No llego al desayuno, hay un río en la cocina.", "No tengo trapeador.", "¡Te debo una!",
        "Soy su inquilina del 1B.", "Hay goteras en la cocina.", "No sé desde cuándo.", "Nadie.", "No sé si pasó abajo.", "Todavía no lo bajo.", "Ya los bajé.",
        "Un plomero.", "No hace falta que venga hoy.", "Sí, puede esperar.", "No, gracias, eso es todo."],
      expect: { complete: false, state: { tomorrow: true, outcome: "tomorrow" } }, auto: AUTO },
    { name: "hanging up on Don Gilberto (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Se me inundó el depa, así que no llego al desayuno.", "Una cubeta y unas toallas, por favor.", "¡Bye!", "Hola, habla Ryan, del 1B.", "Adiós.", "Hasta luego."],
      expect: { complete: false, state: { outcome: "walked" } }, auto: AUTO },
    { name: "short answers: Andrea stays at breakfast, 'No, gracias' thanks", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["No llego al desayuno, se me inundó la cocina.", "No, estoy bien, gracias.", "Sí, estoy segura.", "¡Bye!",
        "Hola, habla Ryan, del 1B.", "Tengo un problema con el techo.", "Sí.", "Sí, estoy bien, solo mojado.", "Todavía no.", "Ya bajé el interruptor.",
        "Un plomero.", "No, no puede.", "Me da igual.", "No, gracias."],
      expect: { complete: true, state: { coming: false, hurtDone: true, downstairs: false, waterOff: true, today: true, timeSet: "eleven", thanked: true, outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist) in one breath; 'a las once y media' is not a slot", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["No llego al desayuno, se me inundó la cocina.", "¿Me puedes traer un trapeador?", "Gracias, ¡bye!",
        "Buenos días, Don Gilberto, habla Ryan, del 1B. Me temo que la cocina está inundada. Nadie se lastimó y ya bajé el switch de la luz. ¿Podría mandar un plomero hoy? Por favor, devuélvame la llamada.",
        "No, todavía no.", "¿A las once y media?", "A las once, entonces.", "Nada más, gracias."],
      expect: { complete: true, state: { vmEnded: true, who: true, hurtDone: true, waterOff: true, today: true, timeSet: "eleven", thanked: true, outcome: "done" } }, auto: AUTO },
    { name: "'No sé' to tomorrow: he doesn't risk it, and asks the time", setup: (s) => { s.twist = null; s.askOkay = true; s.askSince = false; },
      turns: ["¡Se me inundó el depa!", "Estoy toda empapada.", "¿Lo dejamos para otro día?", "¿Puedes pasar por unas toallas?", "¡Te quiero, gracias!",
        "Le habla Ryan, del departamento 1B.", "Me temo que entró agua por el techo.", "Nadie.", "Me temo que sí.", "Ya puse toallas en el piso.",
        "Listo, ya bajé el switch.", "¿Podría mandar un plomero?", "No sé.", "Prefiero a la una.", "Muchas gracias por su pronta atención."],
      expect: { complete: true, state: { okayDone: true, downstairs: true, towels: true, waterOff: true, today: true, tomorrow: false, timeSet: "one", outcome: "done" } }, auto: AUTO },
    { name: "door (twist): '¿Qué haces aquí?'", setup: (s) => { s.twist = "door"; s.askOkay = false; s.askSince = false; },
      turns: ["No llego al desayuno. Se me inundó la cocina.", "Ya tengo un trapeador. ¿Me traes café?", "¿Qué haces aquí?",
        "Buenos días, Don Gilberto. Habla Ryan, del 1B.", "Hay agua por todos lados.", "Nadie.", "Todavía no.", "Sí.", "¿Puede venir hoy?",
        "Es urgente.", "A las once.", "Gracias, se lo agradezco."],
      expect: { complete: true, state: { doorDone: true, today: true, timeSet: "eleven", twistSaved: "door", outcome: "done" } }, auto: AUTO },
    { name: "the guess: 'Sí' to '¿Es otra vez la tubería del 2B?' is no explanation (not done)", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["No llego al desayuno, se me inundó la cocina.", "¿Me puedes traer un trapeador?", "¡Bye!", "Hola, habla Ryan, del 1B.", "No sé.", "Sí.",
        "No.", "No.", "Sí.", "¿Podría mandar un plomero hoy?", "No.", "A las once.", "Muchas gracias por su pronta atención."],
      expect: { complete: false, state: { guessed: true, today: true, timeSet: "eleven", thanked: true, outcome: "partial" } }, auto: AUTO },
    { name: "review: 'No tiene que ser hoy' (asked again), 'Mañana está bien' is checked, 'Las dos' is no choice", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Se me inundó el depa, no llego al desayuno.", "Quiero café.", "¡Bye!", "Le habla Ryan, del 1B.", "Se inundó la cocina.",
        "Sí, me corté el pie.", "Sí, estoy bien.", "Sí, Don Ernesto ya se quejó.", "Ya.", "¿Podría mandar un plomero?", "No tiene que ser hoy.",
        "Mañana está bien.", "No, mejor hoy.", "Las dos.", "A la una.", "Le agradezco mucho su pronta ayuda."],
      expect: { complete: true, state: { downstairs: true, waterOff: true, today: true, timeSet: "one", thanked: true, outcome: "done" } }, auto: AUTO },
    { name: "voicemail (twist), then hanging up: the twist is remembered (not done)", setup: (s) => { s.twist = "voicemail"; s.askOkay = false; s.askSince = false; },
      turns: ["Se me inundó el depa, así que no llego al desayuno.", "Una cubeta y unas toallas, por favor.", "¡Bye!",
        "Buenos días, Don Gilberto. Por favor, devuélvame la llamada.", "Habla Ryan, del 1B.", "Adiós.", "Hasta luego."],
      expect: { complete: false, state: { vmEnded: true, outcome: "walked", twistSaved: "voicemail" } }, auto: AUTO },
    // --- the follow-up pass (5 Nov 2026): the pipe in 2B upstairs, Don Ernesto downstairs ---
    { name: "follow-up: the pipe in 2B, the formal call, Don Ernesto downstairs", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = true; },
      turns: ["¡Perdón, no llego al desayuno! Se reventó un tubo en el 2B y me está cayendo agua del techo.", "¿Me puedes traer un trapeador y café?", "¡Te quiero, gracias!",
        "Buenos días, Don Gilberto. Le habla Ryan Miller, del departamento 1B.", "Le llamo para informarle que se reventó un tubo en el departamento de arriba.",
        "Empezó anoche, en la madrugada.", "No, nadie se lastimó.", "Me temo que sí: Don Ernesto ya se quejó.", "Sí, ya bajé el switch de la luz.",
        "¿Podría mandar un plomero hoy?", "Me temo que no puede esperar hasta mañana.", "A las once sería perfecto.", "¿Quién va a pagar los daños?", "Muchas gracias por su pronta atención."],
      expect: { complete: true, state: { explained: true, downstairs: true, waterOff: true, today: true, timeSet: "eleven", damageAsked: true, thanked: true, outcome: "done" } }, auto: AUTO },
    // --- the audit (5 Nov 2026) ---
    { name: "audit: 'Sí, por favor' brings Andrea; towels and 'No hay luz' are no switched-off power; Don Ernesto", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Se me inundó el depa, no llego al desayuno.", "No, estoy bien, gracias.", "Sí, por favor.", "¿A qué hora llegas?",
        "Buenos días, Don Gilberto. Habla Ryan, del 1B.", "Se inundó la cocina. Ya puse toallas en el piso.", "No, nadie se lastimó.", "Todavía no.",
        "Ya puse toallas en el piso.", "No hay luz.", "Listo, ya los bajé.", "¿Podría mandar a alguien hoy?", "Me temo que no puede esperar hasta mañana.",
        "¿Qué hago mientras tanto?", "A la una.", "¿Le aviso a Don Ernesto?", "Muchas gracias por su pronta atención."],
      expect: { complete: true, state: { coming: true, towels: true, noPower: true, waterOff: true, today: true, timeSet: "one", thanked: true, outcome: "done" } }, auto: AUTO },
    { name: "audit: the power question left unanswered gets his instructions; '¡Te debo una!'", setup: (s) => { s.twist = null; s.askOkay = false; s.askSince = false; },
      turns: ["Se me inundó el depa, así que no llego al desayuno.", "Quiero café.", "¡Te debo una!", "Le habla Ryan Miller, del departamento 1B.",
        "Se inundó la cocina.", "Nadie.", "No sé si pasó abajo.", "¿Podría mandar a alguien hoy?", "Listo.", "Tiene que ser hoy.", "A las once.", "Gracias."],
      expect: { complete: true, state: { waterOff: true, today: true, timeSet: "eleven", thanked: true, outcome: "done" } }, auto: AUTO },
  ],
};

/** After "No, eso es todo": the last thanks or goodbye. */
function expectClosing(c: Ctx) {
  const p: Pending = {
    id: "closing", expects: ["formal_thanks", "apologize", "kind_regards", "warm", "see_you", "g_thanks", "g_bye"], hints: ["thanks_g"],
    suggest: [{ lt: "Thank him politely and say goodbye", hint: "thanks_g" }],
    on: {
      formal_thanks: (cc) => { cc.s.thanked = true; wrapUp(cc); },
      apologize: (cc) => { cc.s.thanked = true; G(cc, "gr_inconvenience"); wrapUp(cc); },
      kind_regards: (cc) => { cc.s.thanked = true; G(cc, "gr_regards"); wrapUp(cc); },
      warm: (cc) => { cc.tip(TIPS.love_landlord); cc.s.thanked = true; G(cc, "gr_love_you"); wrapUp(cc); },
      g_thanks: (cc) => { cc.s.thanked = true; wrapUp(cc); },
      // "No, gracias." / "Gracias, ¡adiós!": the thanks counts
      g_bye: (cc) => { if (heardThanks(cc)) cc.s.thanked = true; wrapUp(cc); },
      see_you: (cc) => { if (heardThanks(cc)) cc.s.thanked = true; wrapUp(cc); },
    },
    yes: (cc) => { G(cc, "gr_ok"); expectClosing(cc); },
    no: (cc) => { if (heardThanks(cc)) cc.s.thanked = true; wrapUp(cc); },
  };
  c.expect(p);
}

export default flood;
