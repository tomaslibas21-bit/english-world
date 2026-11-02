// Song 82 "Sorry About the Noise" → Puerto Colibrí: "Perdón por el ruido"
// Doña Lupita, the older neighbor at Departamentos Las Palmas (usted both ways; she calls the learner vecino /
// vecina). First visit: the learner has just moved in next door and meets her in the hallway: introductions, where
// the learner is from, how the move is going, then how things work here: the garbage truck that rings a bell
// ("¿A qué hora pasa la basura?"), bottles and cans in a separate bag, the gas truck with its little tune, drinking
// water in garrafones (not from the tap), the lavadero on the roof, the mail that hardly comes, Don Ernesto the
// landlord. Then a favor (water the plants, take in a package, lend a ladder or some sugar) or an apology for the
// party noise. She may invite the learner over on Sunday for a cafecito (at five: two o'clock is lunch in Mexico).
// Returning players already know her: "¡Hola, vecino!" Twists (as in the English): she complains about the music
// first; the delivery guy left a package for the learner with her.
// Facts kept vague where unsure: the truck days are this building's (made up); the gas truck "sells you gas"
// (tank or cylinder left open). Mexican-only words have a neutral twin (nomás, ahorita, ándele).
//
// The learner's gender: {m:…|f:…}; Doña Lupita's: {sm:…|sf:…} (she is female).
//
// NEEDS: src/editions/es/content/npcs.ts: Doña Lupita ("rita") inherits `informal: true` from Maple Harbor's Rita,
//   so shared lines with {u:…|t:…} come out in tú ("¡Que tengas buen día!", "No te entendí") and the global
//   g_clarify hints show tú. The brief says usted (she is older): her CAST entry needs `{ informal: false }`.
//   Until then this file answers the common global intents itself with usted lines (H: g_bye, g_howareyou,
//   g_sorry, g_wait, g_dontknow, g_learning, g_slower, g_meaning); the engine's own "didn't understand" line can't
//   be covered here.
// NEEDS: global.ts g_bye: "que le vaya bien", "que esté bien" (covered here by bye_wish).

import type { Ctx, EntityDef, Handler, SituationDef } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Flags used more than once

const LOLA = "lo / la: “you” (usted), for a man / a woman.";
const EL_DAY = "el + a day: “on” (the article stands for “on”).";
const ART_TIME = "The article before a clock time has no English word.";
const A_PERS = "a marks the person you ask; English needs no word for it.";
const DONA = "Doña: a respectful title for an older woman, used with her first name.";
const LE_MUSIC = "le stands for the music: bajarle (a la música) = turn it down.";
const CAFECITO = "cafecito: café + -ito, a friendly “cup of coffee”.";
const TIENDITA = "tiendita: a small corner store.";

// ---------------------------------------------------------------------------
// Entities

/** Things the learner may want to borrow. has: Doña Lupita has it; mass: "un poco de azúcar". */
const THINGS: EntityDef[] = [
  ent("escalera", "escalera", "ladder", "f", { forms: ["escalerita", "escalera de mano", "escaleras"], attrs: { has: true } }),
  ent("taladro", "taladro", "drill", "m", { forms: ["taladros", "taladro electrico"], attrs: { has: false } }),
  ent("martillo", "martillo", "hammer", "m", { forms: ["martillos"], attrs: { has: true } }),
  ent("desarmador", "desarmador", "screwdriver", "m", { pl: "desarmadores", forms: ["destornillador", "destornilladores", "desarmadores"], attrs: { has: true } }),
  ent("aspiradora", "aspiradora", "vacuum", "f", { forms: ["aspiradoras"], attrs: { has: true } }),
  ent("destapador", "destapador", "bottle opener", "m", { pl: "destapadores", forms: ["abrebotellas", "abridor", "sacacorchos", "destapacorchos"], attrs: { has: true } }),
  ent("paraguas", "paraguas", "umbrella", "m", { pl: "paraguas", forms: ["sombrilla", "paragua"], attrs: { has: true } }),
  ent("linterna", "linterna", "flashlight", "f", { forms: ["lampara de mano", "lamparita"], attrs: { has: true } }),
  ent("azucar", "azúcar", "sugar", "m", { art: "", forms: ["azucar", "tantita azucar"], attrs: { has: true, mass: true } }),
  ent("leche", "leche", "milk", "f", { art: "", forms: ["tantita leche"], attrs: { has: true, mass: true } }),
  ent("sal", "sal", "salt", "f", { art: "", forms: ["tantita sal"], attrs: { has: true, mass: true } }),
  ent("huevos", "huevos", "eggs", "m", { art: "", forms: ["huevo", "un par de huevos", "dos huevos", "huevitos"], attrs: { has: true, mass: true } }),
];

const COUNTRIES: EntityDef[] = [
  ent("usa", "Estados Unidos", "the United States", "m", { forms: ["los estados unidos", "usa", "eu", "e u", "america", "nueva york", "california", "texas", "chicago", "florida"] }),
  ent("canada", "Canadá", "Canada", "m", { forms: ["canada", "toronto", "vancouver", "montreal", "quebec"] }),
  ent("uk", "Inglaterra", "England", "f", { forms: ["inglaterra", "el reino unido", "reino unido", "londres", "escocia", "gales"] }),
  ent("ireland", "Irlanda", "Ireland", "f", { forms: ["irlanda", "dublin"] }),
  ent("australia", "Australia", "Australia", "f", { forms: ["australia", "sidney", "sydney", "melbourne"] }),
  ent("nz", "Nueva Zelanda", "New Zealand", "f", { forms: ["nueva zelanda", "nueva zelandia"] }),
];

// ---------------------------------------------------------------------------
// State helpers

const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const heard = (c: Ctx) => fold(c.heard);

const conv = (c: Ctx) => (c as ConvCtx).conv;
const known = (c: Ctx) => !!c.s.known;
/** A later visit without a twist: she just says hello. */
const knownPlain = (c: Ctx) => known(c) && !c.s.complaint && !c.s.pkgTwist;

// One reaction per learner turn: "No fui yo. No estaba en casa." gives two segments but one reply.
// The dialogue creates a fresh context object for every learner turn.
const SAID = new WeakMap<Ctx, Set<string>>();
function once(c: Ctx, key: string): boolean {
  let set = SAID.get(c);
  if (!set) { set = new Set(); SAID.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}
/** Say a reaction line at most once per learner turn. */
const react = (c: Ctx, line: string, vars?: Record<string, any>) => { if (once(c, line)) c.say(line, vars); };
/** "El domingo no puedo, ¿qué tal el sábado?": the refusal comes with another day, so it's no refusal. */
const PROPOSES_DAY = /\b(que tal|y si|mejor|podemos|podriamos|puede ser|podria ser|le parece)\b.*\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana|semana)\b/;
/** "la próxima semana", "el viernes", "por dos semanas" say when; "mientras no estoy" does not. */
const SAYS_WHEN = /\b(semana|semanas|lunes|martes|miercoles|jueves|viernes|sabado|domingo|manana|dias|mes)\b/;
const thingById = (id: string) => THINGS.find((e) => e.id === id)!;

/** The learner asked a favor, apologized for the noise or asked her to be quieter.
 *  Together with the introduction (or on a later visit) this reaches the goal. */
function goal(c: Ctx, kind: string) {
  if (!c.s.goal) c.s.goal = kind;
  c.s.chatted = true;
  maybeComplete(c);
}
/** She complained about the learner's music and the learner hasn't answered it yet. */
const complaintOpen = (c: Ctx) => !!c.s.complaint && !c.s.complaintDone && c.s.goal !== "apology";
function maybeComplete(c: Ctx) {
  // she complained about the music: that needs an answer first (a favor alone doesn't settle it)
  if (complaintOpen(c)) return;
  if (c.s.goal && (known(c) || (c.s.introduced && c.s.trashTold))) c.complete();
}

const AUTO: Record<string, string> = {
  intro: "Hola, soy Ryan. Me acabo de mudar aquí al lado.", name: "Me llamo Ryan.", from_q: "Soy de Canadá.", like_q: "¡Me encanta!",
  trash_q: "¿Dónde se tira la basura?", needs: "¿Me podría regar las plantas la próxima semana?", away_when: "El próximo viernes.",
  coffee: "¡Me encantaría!", coffee_time: "Sí, a las cinco está bien.", coffee_sunday: "El domingo me queda bien.",
  complaint: "¡Ay, perdón! No vuelve a pasar.", howareyou: "Bien, gracias, ¿y usted?", pkg: "¡Muchas gracias!",
};
/** Sims of the first meeting: she doesn't know the learner yet (no later-visit twist). */
const FIRST_VISIT = (s: Record<string, any>) => { s.known = false; s.complaint = false; s.pkgTwist = false; };

// ---------------------------------------------------------------------------
// Handler helpers

function introduce(c: Ctx, named: boolean) {
  if (known(c)) { if (!c.s.knownSaid) { c.s.knownSaid = true; c.say("known_already"); } return; }
  if (c.s.introduced) {
    if (named && !c.s.named) { c.s.named = true; c.say("nice_meet_short"); }
    return;
  }
  c.s.introduced = true;
  maybeComplete(c);
  if (named) { c.s.named = true; c.say("rita_nice"); c.say("rita_welcome"); return; }
  c.say("rita_welcome"); c.say("rita_whats_name");
  c.expect({ id: "name", optional: true, expects: ["im_name_ctx", "my_name", "bare_name_ctx"], hints: ["name"],
    suggest: [{ lt: "Say your name", hint: "name" }],
    on: {
      im_name_ctx: (cc) => { cc.s.named = true; cc.say("nice_meet_short"); },
      my_name: (cc) => { cc.s.named = true; cc.say("nice_meet_short"); },
      bare_name_ctx: (cc) => { cc.s.named = true; cc.say("nice_meet_short"); },
    } });
}

const FAR = new Set(["uk", "ireland", "australia", "nz"]);
function fromReact(c: Ctx, country: string | undefined, tags: string[]) {
  c.s.fromAsked = true;
  if (c.s.fromSaid) return;
  c.s.fromSaid = true;
  const id = country ?? ["usa", "canada", "uk", "ireland", "australia", "nz"].find((x) => tags.includes(x));
  c.say(id === "usa" ? "from_usa" : id === "canada" ? "from_canada" : id && FAR.has(id) ? "from_far" : "from_other");
}

function trashTold(c: Ctx) { c.s.trashTold = true; maybeComplete(c); }
function building(c: Ctx, topic?: string) { c.s.qCount = (c.s.qCount ?? 0) + 1; c.s.lastQ = topic; }

/** Her complaint about the music: asked again once if the learner talks about something else, then dropped. */
function expectComplaint(c: Ctx, optional: boolean) {
  c.expect({ id: "complaint", optional, expects: ["noise_sorry", "noise_promise", "didnt_know", "noise_deny", "noise_reason", "g_sorry"], hints: ["noise"],
    suggest: [{ lt: "Apologize and promise to keep it down", hint: "noise" }],
    on: {
      noise_sorry: (cc) => { acceptApology(cc); }, noise_promise: (cc) => { acceptApology(cc); }, didnt_know: (cc) => { acceptApology(cc); },
      g_sorry: (cc) => { acceptApology(cc); }, noise_reason: (cc) => { acceptApology(cc); },
      noise_deny: (cc) => { cc.s.complaintDone = true; react(cc, "deny_react"); maybeComplete(cc); },
      // "Sí, perdón" / "Ay, perdón": sorry, not "pardon?" (a bare "¿Perdón?" still gets the complaint again)
      g_repeat: (cc) => {
        if (!/\b(si|ay|ah|uy|oh|ups|lo siento|perdoneme|disculpeme|una disculpa)\b/.test(heard(cc))) return false;
        acceptApology(cc); return true;
      },
      // "¿Qué música?": hers was the learner's music, not the gas truck's tune
      ask_gas: (cc) => { react(cc, "complain_which"); expectComplaint(cc, true); },
    },
    yes: (cc) => { acceptApology(cc); }, no: (cc) => { cc.say("oh_okay"); },
    ask: optional ? undefined : (cc) => { cc.say("complain_again"); expectComplaint(cc, true); } });
}

function acceptApology(c: Ctx) {
  c.s.complaintDone = true;
  if (c.s.goal === "apology") return;
  goal(c, "apology");
  react(c, "noise_thanks");
}

function askCoffeeTime(c: Ctx) {
  if (c.s.coffeeTimeAsked) return;
  c.s.coffeeTimeAsked = true;
  c.say("coffee_time");
  c.expect({ id: "coffee_time", optional: true, expects: ["coffee_time_ctx", "coffee_day", "coffee_time_no"], hints: ["coffee_time"],
    suggest: [{ lt: "Agree to the time or suggest another", hint: "coffee_time" }],
    on: {
      // coffeeAt records the agreed hour (her five, or the learner's own time); coffeeOff, no coffee
      coffee_time_ctx: (cc, sl) => { cc.s.coffeeAt = sl.time?.h ?? "other"; if (!isFive(sl.time)) cc.say("coffee_other_day"); cc.say("coffee_confirm"); },
      coffee_day: (cc) => { cc.s.coffeeAt = "other"; cc.say("coffee_other_day"); cc.say("coffee_confirm"); },
      coffee_time_no: (cc) => { cc.s.coffeeOff = true; cc.say("coffee_whenever"); },
    },
    yes: (cc) => { cc.s.coffeeAt = 5; cc.say("coffee_confirm"); }, no: (cc) => { cc.s.coffeeOff = true; cc.say("coffee_whenever"); } });
}

/** "El sábado me queda bien" to her Sunday: another day, said before the time (never a silent Sunday). */
const otherDay = (sl: Record<string, any>) => !!sl.day && sl.day !== "sunday";

/** "No, gracias" / "Sí, gracias" / "Está bien, gracias" to her invitation: the thanks never swallows the answer.
 *  "Está bien" could be a yes or a polite no, so she asks again. */
function coffeeThanks(c: Ctx, onYes: (c: Ctx) => void, onNo: (c: Ctx) => void): boolean {
  const h = heard(c);
  if (/\b(adios|hasta luego|nos vemos|bye|chao|cuidese)\b/.test(h)) return false;
  if (/^\s*no\b/.test(h)) { onNo(c); return true; }
  if (/^\s*(si|claro|con gusto|me encantaria|encantad[oa])\b/.test(h)) { onYes(c); return true; }
  if (/^\s*(esta bien|bueno|ok|okay|vale|ah)\b/.test(h)) { c.say("coffee_reask"); c.hold(); return true; }
  return false;
}

/** She suggested five o'clock: "A las cinco está bien" agrees, another time is a new suggestion. */
function isFive(time: any) {
  return !!time && (time.m ?? 0) === 0 && (time.h === 5 || time.h === 17);
}

// ---------------------------------------------------------------------------
// Handlers

const H: Record<string, Handler> = {
  // --- introductions ---
  moved_in(c) { introduce(c, false); },
  intro_yes_ctx(c) { introduce(c, false); },
  my_name(c) { introduce(c, true); },
  im_name_ctx(c) { introduce(c, true); },
  bare_name_ctx(c) { introduce(c, true); },
  vocative(c) {
    if (/^\s*(hola|buenas|buenos dias|buenas tardes|buenas noches)\b/.test(heard(c)) && !c.s.__greetedBack) { c.s.__greetedBack = true; c.say("g_hello"); }
  },

  // --- small talk ---
  from_ans(c, slots, seg) { fromReact(c, slots.country, seg.tags); },
  from_ans_ctx(c, slots, seg) { fromReact(c, slots.country, seg.tags); },
  from_other_ctx(c) { fromReact(c, undefined, []); },
  like_ans_ctx(c) { react(c, "like_react"); },
  like_hard_ctx(c) { react(c, "like_hard"); },
  boxes(c) { react(c, "boxes_react"); },

  // --- the building ---
  ask_trash(c) { building(c, "trash"); c.say("trash"); c.say("trash_day"); trashTold(c); },
  ask_recycling(c) { building(c, "trash"); c.say("recycling"); if (!c.s.trashTold) c.say("fyi_trash"); trashTold(c); },
  ask_trash_day(c, slots, seg) {
    // "¿Cuándo pasa el camión del gas?" is the gas truck
    if (/\bgas\b/.test(heard(c))) { H.ask_gas(c, slots, seg); return; }
    building(c, "trash"); c.say("trash_day"); trashTold(c);
  },
  ask_boxes(c) { building(c, "trash"); c.say("boxes"); if (!c.s.trashTold) c.say("fyi_trash"); trashTold(c); },
  ask_gas(c, _slots, seg) {
    building(c, "gas");
    // "¿Qué era esa música anoche?": the party upstairs, not the gas truck's morning tune
    if (seg.tags.includes("what") && /\b(anoche|ayer|fiesta|noche)\b/.test(heard(c))) { c.say("others_noise"); return; }
    if (seg.tags.includes("what")) { c.say("gas_what"); c.say("gas_buy"); } else c.say("gas");
  },
  ask_water(c) { building(c); c.say("water"); },
  ask_laundry(c) { building(c); c.say("laundry"); if (c.chance(0.6)) c.say("laundry2"); },
  ask_mail(c, _slots, seg) { building(c); if (!seg.tags.includes("pkg")) c.say("mail"); c.say("packages_door"); },
  ask_parking(c) { building(c); c.say("parking"); },
  ask_internet(c) { building(c); c.say("internet"); },
  ask_quiet(c, _slots, seg) { building(c); c.say(seg.tags.includes("others") ? "others_noise" : "quiet"); },
  ask_landlord(c) { building(c); c.say("landlord"); },
  ask_store(c) { building(c); c.say("store"); },
  ask_unknown(c) { c.say("unknown_q"); },
  no_more(c) {
    if (c.s.howOpen) {
      c.s.howOpen = false;
      c.say(/\b(y usted|y tu|y a usted|usted como esta|y a ti)\b/.test(heard(c)) ? "g_asked_back" : "g_glad");
      return;
    }
    if (!known(c) && !c.s.trashTold) { c.say("fyi_trash"); c.s.trashTold = true; c.s.needsNo = 1; return; }
    c.s.needsNo = (c.s.needsNo ?? 0) + 1;
  },

  // --- favors ---
  ask_favor(c) { c.say("favor_what"); c.hold(); },
  water_plants(c) {
    goal(c, "plants");
    if (SAYS_WHEN.test(heard(c))) {
      c.say("plants_key"); if (c.chance(0.5)) react(c, "trip");
      return;
    }
    c.say("plants_when");
    c.expect({ id: "away_when", optional: true, expects: ["away_when_ctx"], hints: ["away"],
      suggest: [{ lt: "Say when you're leaving", hint: "away" }],
      on: { away_when_ctx: (cc) => { cc.s.keySaid = true; cc.say("plants_key"); if (cc.chance(0.5)) cc.say("trip"); } } });
  },
  take_package(c) { goal(c, "package"); c.say("package_ok"); },
  borrow(c, slots) {
    goal(c, "borrow");
    const e = thingById(slots.thing);
    if (e.attrs?.has) {
      c.say("borrow_yes"); c.say("here_you_go"); c.event("give", { item: e.id });
      if (!e.attrs?.mass && c.chance(0.5)) c.say("return_it", { X: e.id });
    } else c.say("borrow_no", { X: e.id });
  },
  borrow_unknown(c) { goal(c, "borrow"); c.say("borrow_unknown"); },
  have_thing(c) { react(c, "ack"); },
  away_when_ctx(c) {
    if (c.s.goal === "plants" && !c.s.keySaid) { c.s.keySaid = true; c.say("plants_key"); return; }
    c.say("ack");
  },

  // --- noise ---
  noise_sorry(c) { goal(c, "apology"); react(c, "noise_ok"); },
  noise_reason(c, _slots, seg) { react(c, seg.tags.includes("move") ? "noise_move_react" : "noise_reason_react"); },
  noise_promise(c) { goal(c, "apology"); if (!SAID.get(c)?.has("noise_ok")) react(c, "noise_thanks"); },
  didnt_know(c) { react(c, "ack"); },
  noise_ask(c) {
    // she complained about the learner's music: "¿Le podría bajar a la música?" back is a mix-up. She clears it
    // up and asks again (the English edition's fix of 27 Sep: she apologized as if the music had been hers).
    if (complaintOpen(c)) { react(c, "complain_yours"); expectComplaint(c, true); return; }
    goal(c, "complain"); c.say("noise_sorry_rita"); if (c.chance(0.5)) c.say("noise_didnt_realize"); c.say("noise_turn_down");
  },
  noise_deny(c) { react(c, "ack"); },

  // --- coffee ---
  coffee_yes(c) {
    if (c.s.coffeePending) { askCoffeeTime(c); return; }
    // no invitation open: "No tengo nada" is "nothing to ask", "¿A qué hora?" asks about the trucks
    const h = heard(c);
    if (/\bno tengo nada\b/.test(h)) { H.no_more(c, {}, { intent: "no_more", slots: {}, tags: [] } as any); return; }
    if (/\ba que hora\b/.test(h)) { react(c, c.s.lastQ === "trash" || c.s.lastQ === "gas" ? "morning" : "ack"); return; }
    react(c, "like_react");
  },
  coffee_no(c) { if (c.s.coffeeDone && PROPOSES_DAY.test(heard(c))) { react(c, "coffee_other_day"); return; } react(c, c.s.coffeeDone ? "coffee_decline_ok" : "ack"); },
  coffee_day(c) { react(c, "coffee_other_day"); },
  coffee_time_ctx(c, slots) { if (!isFive(slots.time)) c.say("coffee_other_day"); else c.say("coffee_confirm"); },
  coffee_time_no(c) { c.say(c.s.coffeeTimeAsked ? "coffee_whenever" : "ack"); },
  going_away(c) { react(c, "trip"); },
  invite_coffee(c) {
    c.s.coffeeDone = true;
    c.say("coffee_learner_react");
    c.expect({ id: "coffee_sunday", optional: true, expects: ["coffee_day", "coffee_no", "coffee_yes", "coffee_time_ctx"], hints: ["sunday"],
      suggest: [{ lt: "Agree on a day", hint: "sunday" }],
      on: {
        coffee_day: (cc) => { react(cc, "coffee_other_day"); },
        coffee_no: (cc) => { react(cc, PROPOSES_DAY.test(heard(cc)) ? "coffee_other_day" : "coffee_whenever"); },
        coffee_yes: (cc, sl) => { cc.say(otherDay(sl) ? "coffee_other_day" : "coffee_confirm"); },
        // "A las cinco": a time on Sunday afternoon is a yes
        coffee_time_ctx: (cc) => { cc.say("coffee_confirm"); },
        g_thanks: (cc) => coffeeThanks(cc, (c2) => c2.say("coffee_confirm"), (c2) => c2.say("coffee_whenever")),
      },
      yes: (cc) => { cc.say("coffee_confirm"); }, no: (cc) => { cc.say("coffee_whenever"); } });
  },

  // --- thanks and goodbye ---
  nice_meet(c) { c.say("you_too"); },
  // "Gracias, ¡qué amable!": one reply, the warm one
  g_thanks(c) { react(c, /amable|un amor|un angel|lo maximo/.test(heard(c)) ? "kind_react" : "g_welcome"); },
  thanks_kind(c) { react(c, /esperando|llego|salvo/.test(heard(c)) ? "star_react" : "kind_react"); },
  see_around(c) { c.say("see_around"); c.end(); },

  // --- global intents, answered with usted (see NEEDS at the top) ---
  g_bye(c) { c.say("bye_usted"); c.end(); c.hold(); },
  bye_wish(c) { c.say("bye_usted"); c.end(); c.hold(); },
  g_howareyou(c) { c.say("howareyou_reply"); expectHowAreYou(c); },
  g_sorry(c) { c.say("no_worries"); },
  g_wait(c) { c.say("take_time"); c.hold(); },
  g_dontknow(c) {
    const st = conv(c).currentStep();
    if (st?.help) { st.help(c); c.hold(); } else { c.say("take_time"); c.hold(); }
  },
  g_learning(c) { c.say("learning"); conv(c).markSlow(); },
  g_slower(c) { c.say("slow_intro"); conv(c).markSlow(); conv(c).replayLast(true); c.hold(); },
  g_meaning(c) { c.say("meaning_intro"); conv(c).showMeaning(); c.hold(); },
};

// ---------------------------------------------------------------------------

export const neighbor: SituationDef = {
  id: "s82-neighbor",
  song: 82,
  songTitle: "Sorry About the Noise",
  title: { en: "Perdón por el ruido", lt: "Sorry About the Noise" },
  topic: { en: "Los vecinos", lt: "Meeting the neighbors" },
  chapter: 3,
  order: 2,
  location: "apartments",
  npc: "rita",
  goal: "Meet your neighbor and ask her a favor (or apologize for the noise).",
  intro: "Departamentos Las Palmas, second floor. You've just moved in, and Doña Lupita lives right next door. She has lived here for years and knows how everything works: the garbage truck's bell, the gas truck's tune, and who to call when something breaks.",
  entities: { thing: THINGS, country: COUNTRIES },

  grammar: {
    macros: {
      apt: "(departamento | apartamento | depa | piso | casa | edificio | cuarto)",
      al_lado: "(al lado | aqui al lado | de al lado | enfrente | aqui enfrente | arriba | abajo | junto a usted)",
      vecino: "(vecino | vecina | vecinos | vecinas)",
      nuevo: "(nuevo | nueva | nuevos | nuevas)",
      when_past: "(ayer | anteayer | hoy | la semana pasada | esta semana | el fin de semana | hace (unos | dos | tres | cuatro | pocos | un par de) dias | el {day} [pasado])",
      away: [
        "(la | esta) (proxima | otra) semana", "el (proximo | otro) (mes | fin de semana)", "(este | el) fin de semana", "manana", "pasado manana",
        "[el] [proximo] {day} [que viene]", "del {day} al {day}", "(por | durante) (una | dos | tres | un par de) semanas", "(por | durante) (unos | dos | tres | cinco | diez | {number}) dias",
        "(mientras | cuando) (no estoy | no este | estoy fuera | este fuera | estoy de viaje | este de viaje | estoy de vacaciones | este de vacaciones | me voy | salgo de viaje)",
      ],
      pkg: "(paquete | paquetes | envio | pedido | un pedido)",
      trash: "(basura | bolsa de basura | bolsas de basura | bolsas)",
      music: "(la musica | su musica | la tele | el radio | la television | el volumen | tu musica #tip:tu_older)",
      could: "(podria | puede | pudiera | podrias #tip:tu_older | puedes #tip:tu_older)",
      lend: "(presta | prestaria | prestas #tip:tu_older | deja | dejas #tip:tu_older | podria prestar | puede prestar | podrias prestar #tip:tu_older)",
      away_pre: [
        "(me voy | salgo | voy a salir | viajo | voy a viajar | nos vamos | salimos) (de viaje | de vacaciones | a {country} | fuera) [@away] [@away]",
        "(voy a estar | vamos a estar) (fuera | de viaje | de vacaciones) [@away] [@away]", "(no voy a estar | no vamos a estar) (aqui | en casa) [@away] [@away]",
      ],
      no_core: "(no puedo [ir] | no voy a poder | (estoy | voy a estar) (ocupado | ocupada | ocupados) | (tengo | ya tengo) (planes | un compromiso | otro compromiso) | (trabajo | voy a trabajar) | (me voy | voy a salir | voy a estar fuera) [de viaje]) [el domingo | ese dia | este domingo | este fin de semana]",
      other_day: "((el)? {day} | la (proxima | otra) semana | el (otro | proximo) fin de semana | otro dia de la semana)",
    },
    slots: {},
  },

  intents: {
    // --- introductions -------------------------------------------------------------
    moved_in: { patterns: [
      "(me mudé | nos mudamos | me cambié | nos cambiamos) [aqui] [@al_lado | a este edificio | al edificio | al @apt [@al_lado | de al lado]] [@when_past] #h:moved_in",
      "(me | nos) (acabo | acabamos) de (mudar | cambiar) [aqui] [@al_lado | al edificio | al @apt [de al lado]]",
      "(acabo | acabamos) de (mudarme | mudarnos | llegar | cambiarme) [aqui] [@al_lado | al edificio | al @apt [de al lado]]",
      "(soy | somos) (el | la | los | las) @nuevo @vecino [@al_lado | del @apt de al lado] #h:new_neighbor", "(soy | somos) (su | sus) [@nuevo] @vecino [@al_lado | del @apt de al lado]",
      "(soy | somos) @nuevo (aqui | en el edificio | en el pueblo)", "(soy | somos) @nuevo @vecino",
      "(vivo | vivimos) (@al_lado | aqui | en el @apt de al lado | en el @apt (de enfrente | de arriba | de abajo)) [ahora | desde (ayer | el {day} | la semana pasada)]",
      "(llegué | llegamos) [aqui | al edificio] @when_past", "(estoy | estamos) (viviendo | recien llegado | recien llegada) (aqui | @al_lado)",
      "(es | hoy es) mi (primera semana | primer dia | primera noche) [aqui | en el edificio]", "(renté | rentamos) el @apt de al lado",
      "[si] (soy | somos) (el | la | los | las) de al lado",
    ] },
    my_name: { patterns: ["me llamo {name} [y usted | y usted como se llama] #h:my_name", "mi nombre es {name} [y usted | y el suyo]", "[si] (soy yo | ese soy yo | esa soy yo) me llamo {name}"] },
    // "¿Usted debe ser el nuevo vecino?" – "Sí, soy yo."
    intro_yes_ctx: { patterns: ["[si] (soy yo | somos nosotros | ese soy yo | esa soy yo | asi es | el mismo | la misma | yo mero)"] },
    im_name_ctx: { patterns: ["[yo] soy {name} [y usted] #h:im_name", "soy {name} [(su | el | la) [@nuevo] @vecino] [@al_lado | de al lado]", "(digame | me dicen | me puede decir) {name}", "[si] soy yo soy {name}"] },
    bare_name_ctx: { patterns: ["{name}"] },
    vocative: { patterns: ["(dona lupita | lupita | dona lupe)"] },

    // --- small talk --------------------------------------------------------------------
    from_ans: { patterns: [
      "(soy | somos) [originalmente] de {country} [de {c2:country}] #h:from_country", "(vengo | venimos) de {country} [de {c2:country}] #h:come_from",
      "(naci | nacimos) en {country} [pero (vivo | vivia | vivimos) en {c2:country}]", "(soy | somos | vengo) de un (pueblo | pueblito | lugar | ciudad) [pequeno | chico | grande] (en | cerca de) {country}",
      "(soy | somos) (estadounidense | estadounidenses | americano | americana | americanos | gringo | gringa) #usa", "(soy | somos) (canadiense | canadienses) #canada",
      "(soy | somos) (ingles | inglesa | ingleses | britanico | britanica | escoces | escocesa) #uk", "(soy | somos) (irlandes | irlandesa) #ireland", "(soy | somos) (australiano | australiana) #australia",
      "(soy | somos) (neozelandes | neozelandesa) #nz", "no (soy | vengo) de {bad:country} (soy | sino | vengo) de {country}",
    ] },
    from_ans_ctx: { patterns: ["[de] {country}", "de {country} de {c2:country}"] },
    from_other_ctx: { patterns: ["(soy | vengo) de {w:any}"] },
    like_ans_ctx: { patterns: [
      "[si] (me encanta | me gusta | me esta gustando | me fascina) [mucho] [el pueblo | puerto colibri | el @apt | aqui | vivir aqui] #h:love_it", "me gusta mucho el pueblo #h:like_town",
      "(hasta ahora | por ahora | hasta el momento) [todo] (bien | muy bien | perfecto) #h:so_far",
      "(todo | todo bien | muy bien | super bien | excelente | perfecto | de maravilla) [hasta ahora | por ahora]",
      "[muy] (bonito | lindo | tranquilo | precioso | agradable) [muy (bonito | lindo | tranquilo | precioso)]",
      "(es | esta) (muy)? (bonito | bonita | lindo | linda | tranquilo | tranquila | precioso | preciosa | agradable) [el pueblo | el @apt | aqui]",
      "(el pueblo | el @apt | la playa | la gente | el lugar | todo) (es | esta) (muy)? (bonito | bonita | lindo | linda | tranquilo | tranquila | precioso | preciosa | agradable | amable | buena | bien)",
      "(estoy | estamos) (muy)? (contento | contenta | contentos | feliz | felices | a gusto) [aqui]",
      "(me encanta | me gusta | me gusta mucho | me encantan | me gustan) (la playa | el mar | el clima | la comida | la gente | el calor | las playas | los tacos)", "que (bonito | lindo | tranquilo) (es)? [el pueblo | aqui]",
    ] },
    // "Hace mucho calor", "No me gusta mucho": a friendly "¡Ya se va a acostumbrar!"
    like_hard_ctx: { patterns: [
      "no me (gusta | encanta) (mucho | tanto)? [el calor | el pueblo] [es (muy)? (diferente | raro | dificil)]", "(hace | hay) (mucho | demasiado) calor",
      "(es | esta) (un poco | muy)? (dificil | raro | diferente | complicado)", "(extrano | echo de menos) (mi casa | mi pais | a mi familia)",
      "todavia me (estoy acostumbrando | acostumbro)", "(mas o menos | regular)",
    ] },
    boxes: { patterns: [
      "(bien | muy bien | todo bien) pero (todavia | aun) tengo (muchas | un monton de) cajas [por desempacar] #h:boxes",
      "(todavia | aun) tengo (muchas | un monton de) cajas [por desempacar]", "(hay | tengo) cajas por todos lados",
      "(todavia | aun) no (desempaco | he desempacado | termino de desempacar | acabo de desempacar)", "(estoy | sigo) desempacando",
      "[bien pero] (estoy | ando) (muy)? (cansado | cansada | agotado | agotada)", "(es | fue) mucho trabajo", "(todo | todavia) (es | esta) un (caos | desorden)",
      "(la mudanza | mudarse) es (pesada | cansada | dificil | horrible)",
    ] },

    // --- questions about the building ---------------------------------------------------
    ask_trash: { patterns: [
      "donde (se tira | tiro | pongo | dejo | saco | se deja | se pone | se saca | puedo tirar | puedo dejar | debo dejar | hay que dejar | va) [la | mi] @trash #h:q_trash",
      "(que hago | que hacemos | que se hace) con (la | mi) basura", "donde (esta | estan | hay) (el bote | los botes | el contenedor | los contenedores | el cubo | los cubos) [de (la)? basura]",
      "como (funciona | es) (lo de)? la basura [aqui]", "y la basura", "(no se | quisiera saber) donde (se tira | tiro | pongo | dejo) la basura",
      "(hay | tienen) (un)? (bote | contenedor | cubo) de basura",
    ] },
    ask_trash_day: { patterns: [
      "a que hora pasa (la basura | el camion | el camion de la basura | el basurero) #h:q_trash_day",
      "(que dias | cuando | que dia | cada cuando) pasa (la basura | el camion | el camion de la basura | el basurero)",
      "cuando (recogen | se llevan | pasan por) la basura", "(que dias | cuando | a que hora) (saco | se saca | hay que sacar) la basura",
      "cuando es el dia de [la] basura", "(pasa | hay) (camion de la basura | camion de basura | basurero) [todos los dias]",
    ] },
    ask_recycling: { patterns: [
      "donde (pongo | dejo | tiro | se ponen | van | se tiran) (las botellas | las latas | el plastico | el vidrio | el papel) [de plastico] [y (las botellas | las latas | el plastico | el vidrio | el papel)] #h:q_recycling",
      "(hay | se hace) reciclaje [aqui]", "(como | donde) se recicla [aqui]", "(hay que | se tiene que | tengo que) separar la basura", "(se separa | separan) la basura [aqui]",
      "y [el] reciclaje", "(se | hay que) (separa | separar) (lo organico | la basura organica)", "(reciclan | reciclamos) [aqui]", "se recicla [aqui]",
    ] },
    ask_boxes: { patterns: ["(que hago con | donde pongo | donde dejo | donde tiro) (las cajas | el carton | mis cajas | las cajas de la mudanza | las cajas vacias)"] },
    ask_gas: { patterns: [
      "(como | donde) (compro | consigo | pido | se compra | se pide | puedo comprar) [el] gas #h:q_gas", "(se me acabó | se acabó | ya no hay | ya no tengo) [el] gas",
      "(que es | que era) (esa | la) (musica | musiquita | cancion) [de la manana | de las mananas | que pasa] #what", "que es (ese ruido | esa musica | esa cancion | esa musiquita) #what",
      "(cuando | a que hora | que dias | cada cuando) pasa (el gas | el camion del gas | el camion de gas | el gasero)",
      "(de donde | como) (viene | llega) el gas", "(pasa | hay) (un)? camion (del | de) gas", "como funciona (el gas | lo del gas)", "(tiene | hay) gas (el @apt | el edificio)",
    ] },
    ask_water: { patterns: [
      "(se puede | puedo | es seguro) (tomar | beber) [el] agua (de la llave | del grifo | de la canilla) #h:q_water", "(el agua de la llave | el agua del grifo) se puede (tomar | beber)",
      "(donde | como) (compro | consigo | se compra | pido) (agua | garrafones | un garrafon | agua para tomar | agua potable)", "(es | esta) (buena | potable | segura) el agua [de la llave]",
      "el agua [de la llave] (es | esta) (potable | buena | segura)", "(se toma | se bebe) el agua de la llave",
    ] },
    ask_laundry: { patterns: [
      "donde (puedo lavar | se lava | lavo | se puede lavar) (la | mi)? ropa #h:q_laundry", "(hay | tienen) (lavadora | lavadero | lavanderia | cuarto de lavado | secadora) [en el edificio | aqui | cerca | por aqui]",
      "donde (esta | hay) (la lavadora | el lavadero | una lavanderia | la lavanderia)", "donde lava usted [su ropa]",
    ] },
    ask_mail: { patterns: [
      "donde (dejan | ponen | entregan) (los | mis)? (paquetes | pedidos) #pkg #h:q_mail", "(llega | funciona) [el] correo [aqui]", "(donde | como) (recibo | me llega) (el correo | mi correo | las cartas)",
      "(donde | como) (recibo | me llegan) (los paquetes | mis paquetes) #pkg", "(hay | donde estan) (buzones | buzon | el buzon)", "donde (esta | queda) mi buzon",
    ] },
    ask_parking: { patterns: [
      "donde (puedo | se puede) (estacionar | estacionarme | dejar el carro | parquear) [el carro | mi carro]", "donde (estaciono | aparco) [el carro | mi carro]", "(hay | tienen) estacionamiento [aqui | en el edificio]",
      "donde (estaciona | deja) usted [su carro]", "(hay | tienen) (lugar | lugares) para (estacionar | el carro)",
    ] },
    ask_internet: { patterns: [
      "(que | cual) internet (tiene | usa | me recomienda) [usted]", "(que | cual) (compania | empresa) de internet (tiene | usa | es buena | me recomienda)",
      "(es | esta) (bueno | rapido) el internet [aqui]", "el internet (es | esta) (bueno | rapido) [aqui]", "(funciona bien | sirve) el internet [aqui]",
      "(como | que tal) (es | esta | funciona) el internet [aqui]", "(tiene | hay) (internet | wifi | wi fi) [aqui]",
    ] },
    ask_quiet: { patterns: [
      "(es | esta) (tranquilo | ruidoso) [el edificio | aqui] [en la noche]", "(es | sera) un edificio tranquilo", "(como | que tal) son los vecinos",
      "(los vecinos | la gente) (son | es) (amables | tranquilos | ruidosos | buena onda)", "(hay | se oye) mucho ruido [aqui] [en la noche]",
      "(las paredes son | son las paredes) (delgadas | muy delgadas)", "se oye todo",
      "(los de arriba | los vecinos | alguien | los de al lado) (hacen | hicieron | hace | hizo) mucho ruido [anoche | en la noche] #others", "anoche (hicieron | hubo) mucho ruido #others",
    ] },
    ask_landlord: { patterns: [
      "(como | que tal) es (don ernesto | el dueno | el casero | el senor ernesto | el arrendador)", "(don ernesto | el dueno | el casero) (es | parece) (buena persona | amable | bueno | buena gente)",
      "(conoce | conoces #tip:tu_older) (a)? (don ernesto | el dueno | el casero)", "quien es el dueno [del edificio]",
    ] },
    ask_store: { patterns: [
      "hay (una)? (tienda | tiendita | supermercado | super | mercado) (cerca | por aqui | aqui cerca | cerca de aqui) #h:q_store",
      "donde (esta | queda | hay) (la | una | el | un)? (tienda | tiendita | super | supermercado | mercado) [mas cercana | mas cercano | cerca]",
      "donde (puedo | se puede) (comprar | hacer) (comida | el super | las compras | el mandado)", "donde compro (comida | el mandado | las cosas)", "donde (hago | se hace) (el super | el mandado | las compras)",
    ] },
    ask_unknown: { patterns: ["(hay | sabe donde hay | donde esta | donde hay | donde queda) [un | una | el | la] {w:any}"] },
    no_more: { patterns: [
      "no (quiero | necesito) pedirle nada",
      "(es | eso es | seria | eso seria) todo [por ahora | por el momento]", "[no] nada [mas] [por ahora]", "[no] (estoy bien | todo bien) [por ahora]",
      "[no] no necesito nada [por ahora | por el momento]", "[no] no tengo (mas | otras) preguntas", "[no] (solo | nada mas | nomas) (queria | vine a) (saludar | presentarme | conocerla) [y presentarme]",
      "[no] por ahora (es todo | nada)", "[no] (ya | con eso) estoy", "[no] ya no necesito nada",
    ] },

    // --- favors ----------------------------------------------------------------------------
    ask_favor: { patterns: [
      "(le | te #tip:tu_older) (puedo | podria) pedir un favor #h:ask_favor", "(me)? @could hacer un favor", "(tengo | le tengo) un favor [que pedirle]",
      "(necesito | ocupo) un favor", "(me)? @could ayudar [con algo]", "necesito su ayuda", "(le | te) (puedo | podria) (preguntar | pedir) algo", "(tengo | le tengo) una (pregunta | duda)",
    ] },
    water_plants: { patterns: [
      "(me)? @could regar (mis | las) (plantas | flores | matas | macetas) [@away] [@away] #h:water_plants",
      "(me)? @could (cuidar | echarle un ojo a | vigilar | darle una vuelta a) (mi | el) @apt [@away] [@away]",
      "(me)? @could (darle de comer a | alimentar a | cuidar a) (mi gato | mi perro | mis peces | mi gata) [@away] [@away]",
      "(le)? @could (dar de comer a | darle de comer a | alimentar a) (mi gato | mi perro | mis peces | mi gata) [@away] [@away]",
      "(me)? @could (recoger | revisar) (mi correo | mis cartas) [@away] [@away]",
      "@away_pre [me] @could regar (mis | las) (plantas | flores) [@away]", "(me)? (riega | regaria | riegas #tip:tu_older) (mis | las) (plantas | flores | matas) [@away] [@away]", "le molestaria regar (mis | las) plantas [@away] [@away]",
      "(quiero | quisiera | queria) pedirle que (riegue | cuide) (mis | las) (plantas | flores) [@away] [@away]",
    ] },
    take_package: { patterns: [
      "(me)? @could (recibir | recoger | guardar | agarrar) (un | mi | el) @pkg [@away | el {day} | manana] #h:package",
      "me (recibe | guarda) (un | mi | el) @pkg [@away | el {day} | manana] [por favor]",
      "(espero | estoy esperando) (un | una)? @pkg [@away | el {day} | manana] [(me lo | lo) @could (recibir | guardar)]",
      "si (llega | viene) (un | mi) @pkg [@away | el {day} | manana] [(me lo | lo) @could (recibir | guardar)]",
    ] },
    borrow: { patterns: [
      "(me)? @lend [su | una | un | la | el | tu | un poco de | tantito | tantita | algo de] {thing} #h:borrow",
      // corrections: "No, la escalera no, el martillo", "No quiero la escalera, mejor el martillo"
      "no (quiero | necesito)? [la | el | una | un | su] {bad:thing} (sino | mejor)? [la | el | una | un | su] {thing}", "[la | el | su] {bad:thing} no (sino | mejor) [la | el | una | un | su] {thing}",
      "(me)? @lend [su | una | un | la | el | tu] {thing} (hasta (manana | la noche | el {day}) | un rato | una hora | un ratito | el fin de semana | unos minutos)",
      "(tiene | tendra | tienes #tip:tu_older) (un | una | unos | unas | algo de | un poco de)? {thing} [que me (preste | pueda prestar)] #h:have_one",
      "(necesito | ocupo) (un | una | un poco de)? {thing} #blunt", "(necesito | ocupo) (un | una | un poco de)? {thing} (me)? @lend (la | el | uno | una | la suya | el suyo)",
      "(puedo | podria) usar su {thing}", "(me)? (podria | puede | podrias #tip:tu_older) (dar | regalar) (un poco de | tantito | tantita | algo de) {thing} #h:borrow_some",
      "(me)? (regala | da) (un poco de | tantito | tantita) {thing}", "(le puedo | podria) pedir (prestado | prestada) (su | una | un | la | el) {thing}",
    ] },
    borrow_unknown: { patterns: ["(me)? @lend [su | una | un] {w:any}", "(tiene | tendra) (un | una) {w:any} que me (preste | pueda prestar)"] },
    away_when_ctx: { patterns: [
      "[el] {day} #h:on_saturday", "este fin de semana #h:this_weekend", "@away", "(me voy | salgo | nos vamos | salimos | viajo | viajamos) [de viaje] [@away] #h:away_when",
      "(en | dentro de) (dos | tres | unos | cuatro | cinco | {number}) (dias | semanas)", "dentro de una semana", "el (proximo | otro) {day}",
    ] },

    // --- noise -----------------------------------------------------------------------------
    noise_sorry: { patterns: [
      "(perdon | perdone | perdoneme | disculpe | disculpeme | disculpa #tip:tu_older | lo siento | una disculpa | mil disculpas) (por)? (el ruido | la musica | lo de anoche | la fiesta | el escandalo) [de anoche | de ayer | de la otra noche] #h:sorry_noise",
      "(perdon | perdone | disculpe | lo siento) (si | porque) (hicimos | hice) (mucho | tanto) ruido [anoche | ayer]",
      "(perdon | perdone | disculpe | lo siento) [mucho] [si | porque] (la musica | el ruido | mi musica) (estaba | estuvo) (muy | tan | demasiado) fuerte [anoche]",
      "(perdon | perdone | disculpe | lo siento) [mucho] [si] (le | la) (molesto | molestamos | molestó) [la musica | el ruido] [anoche]",
      "espero (que)? no (haber hecho | hayamos hecho | haya sido) (mucho | tanto) ruido [anoche]",
      "(estuvo | estaba) (muy | demasiado) fuerte (la musica | el ruido) [anoche]", "(estuvo | estaba) (muy | demasiado) fuerte [anoche]",
      "(le pido | le pedimos) (una)? disculpa [por el ruido | por lo de anoche]",
    ] },
    noise_reason: { patterns: [
      "(hicimos | tuvimos | hice | tuve) (una)? (fiesta | fiestecita | reunion | reunioncita | carne asada | cena) [anoche | ayer] [con (unos | mis | algunos) amigos] #party #h:little_party",
      "(vinieron | estuvieron) (unos | mis | algunos) amigos [anoche | a la casa | a mi casa] #party", "(fue | era) mi cumpleanos [ayer] #party #h:my_birthday",
      "(estabamos | estaba) (celebrando | festejando) [mi cumpleanos | algo] #party", "(estabamos | estaba) (moviendo | acomodando) (muebles | cajas | cosas) [anoche] #move",
      "(era | fue) (la tele | la television | una pelicula | el partido | el futbol) #party",
    ] },
    noise_promise: { patterns: [
      "no (vuelve | va) a (pasar | volver a pasar) #h:wont_happen", "ya no va a pasar",
      "(vamos a | voy a) (hacer menos ruido | tener mas cuidado | bajarle | bajar la musica | ser mas (silenciosos | silenciosas | silencioso | silenciosa)) [la proxima vez | desde ahora] #h:quieter",
      "[ahorita | ya | ahora] le bajo [a la musica]", "le bajo (a la musica | al volumen) [ahorita | ahora mismo]", "(voy a | vamos a) usar audifonos",
      "no (vuelvo | volvemos) a (hacer ruido | poner la musica tan fuerte)", "(tendre | tendremos) mas cuidado", "(voy a | vamos a) (bajar | bajarle) (el volumen | a la musica) [en la noche]",
    ] },
    didnt_know: { patterns: ["no (sabia | me di cuenta | pense) [que] [(se oia | se escuchaba) (tanto | todo) | (estaba | era) tan fuerte | las paredes eran tan delgadas]"] },
    noise_ask: { patterns: [
      "(le | me)? @could (bajar | bajarle) [un poco | un poquito] [a] @music [un poco | un poquito] [en la noche] #h:turn_down",
      "(le)? @could bajar (el volumen | a la musica | a la tele)", "su (musica | tele | television | radio) (esta | estaba | es) (muy | demasiado | bien) fuerte [en la noche | anoche]",
      "@could hacer menos ruido [en la noche]", "@could poner la musica mas baja",
    ] },
    noise_deny: { patterns: [
      "(no fui yo | no fuimos nosotros | no era yo | no era mi musica | no era la mia | no fue mi musica | no era nuestra musica | no fue la mia) [yo no estaba en casa | no estabamos en casa | (fueron | eran) los de arriba]",
      "[no fui yo] (fueron | eran) los (de arriba | vecinos de arriba | de abajo)",
      "(yo)? (no estaba | no estabamos | no estuve | no estuvimos) (en casa | aqui | ahi) [anoche]", "(yo)? (estaba | estuve) (dormido | dormida | trabajando | fuera | de viaje | en el trabajo) [anoche]",
      "(no hice | no hicimos | no tuve | no tuvimos) (ninguna | una)? (fiesta | ruido | reunion)", "no (puse | pusimos) musica",
      "no (estaba | estuvo) (tan | muy)? (fuerte | alta)", "la musica no (estaba | estuvo) (tan | muy)? (fuerte | alta)", "(seguro | creo que) (fueron | eran) los de arriba", "anoche [yo] (no estaba | no estuve | no estabamos) [en casa | aqui]",
    ] },

    // --- coffee ---------------------------------------------------------------------------
    coffee_yes: { patterns: [
      "[si] (me encantaria | con mucho gusto | con gusto | encantado | encantada) #h:love_to", "[si] (que buena idea | suena bien | suena muy bien | que padre | que rico) #h:sounds_great",
      "[claro | si] a que hora #h:what_time", "[si] (me gustaria | me gustaria mucho)", "[el] {day} (me queda bien | esta bien | puedo | perfecto) #h:sunday_ok",
      "[si] (estoy libre | no tengo planes | no tengo nada) [el {day}]", "[si] no estoy (ocupado | ocupada) [el {day}]", "[si] (llevo | puedo llevar | traigo) algo",
      "(gracias | muchas gracias) (por la invitacion | por invitarme)", "[si] me (encanta | gusta) el cafe", "[si] (ahi estare | ahi nos vemos | cuente conmigo | claro que si)", "[el] domingo [si] (claro | con gusto | perfecto | por supuesto)", "si [el] {day} [en la (tarde | manana)]",
      "[si] (prefiero | mejor) (un)? (te | tecito)", "(no tomo | no me gusta el) cafe pero (un te | te | un tecito) (si)?",
    ] },
    coffee_no: { patterns: [
      "[el] domingo [creo que] no puedo #h:busy_sunday", "[lo siento | perdon] [creo que] @no_core", "(otro dia | otra vez | otra ocasion | en otra ocasion) [tal vez | quiza | mejor] #h:another_time",
      "(tal vez | quiza | mejor) (otro dia | otra vez | otra ocasion)", "(este | el) domingo no", "(gracias | muchas gracias | me encantaria | me gustaria) pero @no_core",
      "[el] {day} no (puedo | me queda | me queda bien)", "(el domingo | ese dia | este domingo) @no_core", "no me queda (bien)? [el domingo | ese dia]",
    ] },
    coffee_day: { patterns: [
      "(que tal | y si | mejor | podria ser | puede ser) @other_day [a {time}] [mejor | en vez] [le parece] #h:how_saturday", "@other_day mejor",
      "[el] {no_day:day} no [mejor | pero] @other_day", "no puedo [el] {no_day:day} pero [el] {day} si [puedo]", "(podemos | podriamos) (vernos)? @other_day", "@other_day (seria mejor | me queda mejor)",
      "[gracias pero] [lo siento] @no_core [pero] (que tal | y si | mejor | podria ser | podemos) @other_day [mejor] [le parece]",
      "[el] {no_day:day} no (puedo | me queda) [pero] (que tal | y si | mejor | podria ser) @other_day",
    ] },
    coffee_time_ctx: { patterns: [
      "[si] [a] {time} (esta bien | me queda bien | perfecto | esta perfecto) #h:five_fine", "[si] a {time}", "(que tal | y si | mejor | podria ser | podemos) [a] {time} #h:how_six",
      "un (poco | poquito) mas (tarde | temprano) [si se puede] #h:later", "(mas tarde | mas temprano) (es | seria | me queda) mejor", "mejor (mas tarde | mas temprano)", "(nos vemos | ahi estoy | ahi estare | ahi nos vemos) [a] {time}",
      "[si] [a] {time} (nos vemos | ahi nos vemos | ahi estoy | ahi estare)", "[a] {bad:time} no [mejor | pero] [a] {time}",
      "[a] {bad:time} no (puedo | me queda | me queda bien) [pero] [mejor | que tal | y | puede ser] [a] {time}",
    ] },
    invite_coffee: { patterns: [
      "(quiere | le gustaria | quieres #tip:tu_older | te gustaria #tip:tu_older) (venir | pasar) (a tomar | por) un (cafe | cafecito) [a mi casa | a mi @apt] [algun dia | el {day} | un dia de estos] #h:invite_coffee",
      "(la)? invito a (tomar)? un (cafe | cafecito) [a mi casa] [algun dia | el {day}]", "venga a tomar un (cafe | cafecito) [a mi casa] [algun dia]",
      "(tomamos | tomemos) un (cafe | cafecito) [algun dia | juntas | juntos]",
    ] },

    // --- thanks and goodbye ----------------------------------------------------------------
    nice_meet: { patterns: [
      "(mucho gusto | encantado | encantada | un placer | fue un placer | fue un gusto | el gusto es mio) [en conocerla | conocerla | de conocerla] #h:nice_meet",
      "(me dio | que) gusto conocerla",
    ] },
    thanks_kind: { patterns: [
      "(es usted | usted es | eres #tip:tu_older) (un amor | un angel | lo maximo | la mejor | una santa) #h:star", "me (salvó | salvo) [la vida]",
      "(lo | la) estaba esperando", "por fin llegó [mi paquete]",
    ] },
    see_around: { patterns: ["nos vemos (pronto | luego | al rato | entonces | el {day}) #h:see_you", "hasta (el {day} | entonces)"] },
    // "Tengo un taladro": the learner's own thing, never a request to borrow it
    have_thing: { patterns: ["(ya)? (tengo | tenemos) (un | una | mi | unos | unas)? {thing}", "(ya)? (tengo | tenemos) (mi | mis) propio {thing}", "(yo)? (riego | cuido) (mis | las) plantas [yo]"] },
    // "Que le vaya bien": a goodbye wish (not in the shared g_bye yet)
    bye_wish: { patterns: ["que le vaya (muy)? bien", "que (este | pase) (bien | buen dia | buena tarde | buenas noches)"] },
    // "A las cinco no puedo." (to "¿Le parece a las cinco?")
    coffee_time_no: { patterns: ["[a] ({time} | esa hora) no (puedo | me queda | me queda bien)", "no (puedo | me queda) [a] {time}", "[no] [a] ({time} | esa hora) no"] },
    // "Me voy de viaje la próxima semana." (before asking for the favor)
    going_away: { patterns: ["@away_pre"] },
  },

  lines: {
    // --- introductions -------------------------------------------------------------
    greet_new: [
      t("¡Ay, | hola! | Usted | debe | ser | {m:el|f:la} | {m:nuevo|f:nueva} | {m:vecino|f:vecina}.", "Oh, | hi! | You | must | be | the | new | neighbor.",
        "Oh, hi! You must be the new neighbor."),
      t("¡Buenas tardes! | ¿Ya | se mudó | aquí | al lado?", "Good afternoon! | Already | you-moved | here | next door?", "Good afternoon! Did you just move in next door?",
        { flags: { 1: "ya in a question: “already”, “just”." } }),
    ],
    intro_again: [
      t("Perdón, | ¿usted | es | {m:nuevo|f:nueva} | en | el | edificio?", "Sorry, | you | are | new | in | the | building?", "Sorry, are you new in the building?"),
    ],
    not_neighbor: [t("¡Ay, | perdón! | Me confundí.", "Oh, | sorry! | My mistake.", "Oh, sorry! My mistake.")],
    rita_nice: [
      t("¡Mucho gusto! | Yo | soy | Guadalupe, | pero | todos | me | dicen | Doña | Lupita.", "Nice to meet you! | I | am | Guadalupe, | but | everyone | me | they-call | Doña | Lupita.",
        "Nice to meet you! I'm Guadalupe, but everyone calls me Doña Lupita.", { flags: { 8: DONA } }),
      t("¡Mucho gusto! | Yo | soy | Doña | Lupita, | para servirle.", "Nice to meet you! | I | am | Doña | Lupita, | at your service.",
        "Nice to meet you! I'm Doña Lupita, at your service.", { flags: { 3: DONA } }),
    ],
    rita_welcome: [t("¡Bienvenid{m:o|f:a} | al | edificio!", "Welcome | to the | building!", "Welcome to the building!")],
    rita_whats_name: [
      t("Yo | soy | Doña | Lupita, | la | de | al lado. | ¿Y | usted, | cómo | se llama?", "I | am | Doña | Lupita, | the one | from | next door. | And | you, | how | are-you-called?",
        "I'm Doña Lupita, from next door. And what's your name?", { flags: { 2: DONA, 4: "la de al lado: “the one (the woman) from next door”." } }),
    ],
    nice_meet_short: [t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!")],
    known_already: [
      t("¡Ya | lo | sé! | Ya | nos conocemos, | ¿se acuerda?", "Already | it | I-know! | Already | we've met, | remember?", "I know! We've already met, remember?",
        { flags: { 0: "Ya lo sé: “I know” (ya adds “of course”)." } }),
    ],

    // --- small talk ------------------------------------------------------------------
    ask_from: [t("Y | usted, | ¿de | dónde | es?", "And | you, | from | where | are-you?", "So where are you from?")],
    from_usa: [
      t("¡Ah, | de | Estados Unidos! | Mi | hijo | trabaja | allá, | en | Texas.", "Oh, | from | the United States! | My | son | works | there, | in | Texas.",
        "Oh, from the States! My son works up there, in Texas."),
    ],
    from_canada: [t("¡De | Canadá! | ¡Aquí | no va | a | pasar frío!", "From | Canada! | Here | you're not going | to | be cold!", "From Canada! Well, you won't be cold here!")],
    from_far: [t("¡Uy, | de | tan | lejos! | Bienvenid{m:o|f:a} | a | Puerto | Colibrí.", "Wow, | from | so | far! | Welcome | to | Puerto | Colibrí.", "Wow, all that way! Welcome to Puerto Colibrí.")],
    from_other: [t("¡Qué | bien! | Pues, | bienvenid{m:o|f:a} | a | Puerto | Colibrí.", "How | nice! | Well, | welcome | to | Puerto | Colibrí.", "How nice! Well, welcome to Puerto Colibrí.")],
    ask_like: [
      t("¿Y | qué tal | el | pueblo? | ¿Le gusta?", "And | how's | the | town? | Do you like it?", "So how do you like the town?"),
      t("¿Y | qué | le parece | Puerto | Colibrí?", "And | what | do you think of | Puerto | Colibrí?", "And what do you think of Puerto Colibrí?"),
    ],
    like_react: [
      t("¡Qué | bueno!", "How | good!", "Glad to hear it!"),
      t("¡Me alegro | mucho!", "I'm glad | a lot!", "I'm so glad!"),
    ],
    like_hard: [
      t("¡Ya | se va | a | acostumbrar!", "Soon | you're going | to | get used to it!", "You'll get used to it, you'll see!",
        { flags: { 0: "ya with a future: “soon”, “you'll see”." } }),
    ],
    boxes_react: [
      t("¡Ay, | las | mudanzas | son | lo | peor!", "Oh, | — | moves | are | the | worst!", "Oh, moving is the worst!",
        { flags: { 1: "las mudanzas: moving in general; English uses no article." } }),
    ],

    // --- what can I do for you ---------------------------------------------------------
    needs_first_new: [
      t("Y | dígame, | ¿necesita | algo? | ¿Tiene | alguna | pregunta?", "And | tell me, | you-need | something? | You-have | any | question?", "So tell me, do you need anything? Any questions?"),
      t("¿Necesita | algo, | {m:vecino|f:vecina}? | Pregúnteme | con confianza.", "You-need | something, | neighbor? | Ask me | freely.", "Do you need anything, neighbor? Don't be shy, just ask."),
    ],
    needs_first_known: [
      t("¿Y | qué | {m:lo|f:la} | trae | por | aquí?", "And | what | you | brings | around | here?", "So, what brings you by?", { flags: { 2: LOLA } }),
      t("Dígame, | {m:vecino|f:vecina}, | ¿qué | se le ofrece?", "Tell me, | neighbor, | what | can I do for you?", "Tell me, neighbor, what can I do for you?"),
    ],
    needs_more: [
      t("¿Algo | más?", "Something | more?", "Anything else?"),
      t("¿Qué | más | quiere | saber?", "What | more | you-want | to know?", "What else would you like to know?"),
      t("¿Alguna | otra | pregunta?", "Any | other | question?", "Any other questions?"),
    ],
    needs_nudge: [
      t("Bueno, | si | algún día | necesita | algo, | nomás | toque | mi | puerta.", "Well, | if | someday | you-need | something, | just | knock (on) | my | door.",
        "Well, if you ever need anything, just knock on my door.",
        { flags: { 5: "Mexican: nomás = just, only." },
          neutral: t("Bueno, | si | algún día | necesita | algo, | solo | toque | mi | puerta.", "Well, | if | someday | you-need | something, | just | knock (on) | my | door.",
            "Well, if you ever need anything, just knock on my door.") }),
    ],
    needs_nudge2: [
      t("Le | puedo | regar | las | plantas | o | recibirle | sus | paquetes.", "(For) you | I-can | water | the | plants | or | take in for you | your | packages.",
        "I can water your plants or take in your packages for you.", { flags: { 3: "las plantas: Spanish says “the” where English says “your”." } }),
    ],
    favor_what: [t("¡Claro! | ¿Qué | necesita?", "Sure! | What | you-need?", "Of course! What do you need?")],

    // --- the building ----------------------------------------------------------------------
    trash: [
      t("La | basura | se saca | cuando | pasa | el | camión. | Va | tocando | una | campana.", "The | trash | is taken out | when | comes by | the | truck. | It-goes | ringing | a | bell.",
        "You take the trash out when the truck comes by. It rings a bell as it goes."),
    ],
    trash_day: [
      t("Pasa | lunes, | miércoles | y | viernes, | como | a | las | siete | de la mañana.", "It-comes-by | Monday, | Wednesday | and | Friday, | around | at | — | seven | a.m.",
        "It comes Monday, Wednesday and Friday, around seven in the morning.", { flags: { 7: ART_TIME } }),
      t("El | camión | pasa | lunes, | miércoles | y | viernes, | temprano, | como | a | las | siete.", "The | truck | comes-by | Monday, | Wednesday | and | Friday, | early, | around | at | — | seven.",
        "The truck comes Monday, Wednesday and Friday, early, around seven.", { flags: { 10: ART_TIME } }),
    ],
    recycling: [
      t("Las | botellas | y | las | latas, | en | otra | bolsa, | aparte. | Los | señores | de | la | basura | las | separan.",
        "The | bottles | and | the | cans, | in | another | bag, | separately. | The | men | of | the | trash | them | they-sort.",
        "Bottles and cans go in a separate bag. The garbage men sort them.", { flags: { 14: "las here is a pronoun: them (the bottles and cans)." } }),
    ],
    boxes: [
      t("Y | las | cajas | de | la | mudanza, | déjelas | dobladas | junto | a | la | basura.", "And | the | boxes | of | the | move, | leave-them | folded | next | to | the | trash.",
        "And the moving boxes, leave them folded flat next to the trash."),
    ],
    fyi_trash: [
      t("¡Ah, | y | la | basura | pasa | lunes, | miércoles | y | viernes! | Cuando | oiga | la | campana, | saque | sus | bolsas.",
        "Oh, | and | the | trash | comes-by | Monday, | Wednesday | and | Friday! | When | you-hear | the | bell, | take out | your | bags.",
        "Oh, and the garbage truck comes Monday, Wednesday and Friday! When you hear the bell, take your bags out.",
        { flags: { 3: "la basura pasa: “the trash (truck) comes by”." } }),
    ],
    gas: [
      t("El | camión | del | gas | pasa | todas | las | mañanas | con | su | musiquita. | Usted | lo | para | y | le | venden | el | gas.",
        "The | truck | of the | gas | comes-by | all | the | mornings | with | its | little tune. | You | it | stop | and | (to) you | they-sell | the | gas.",
        "The gas truck comes by every morning playing its little tune. You flag it down and they sell you the gas.",
        { flags: { 10: "musiquita: música + -ita, the gas trucks' little jingle." } }),
    ],
    gas_what: [
      t("¡Es | el | camión | del | gas! | Pasa | todas | las | mañanas.", "It's | the | truck | of the | gas! | It-comes-by | all | the | mornings.", "That's the gas truck! It comes by every morning."),
    ],
    morning: [t("En | la | mañana, | temprano.", "In | the | morning, | early.", "In the morning, early.")],
    gas_buy: [t("Si | necesita | gas, | nada más | lo | para.", "If | you-need | gas, | just | it | stop.", "If you need gas, just flag it down.")],
    water: [
      t("El | agua | de | la | llave | no se toma. | Compre | garrafones | en | la | tiendita | de | la | esquina.",
        "The | water | from | the | tap | isn't for drinking. | Buy | water jugs | at | the | little store | on | the | corner.",
        "Don't drink the tap water. Buy the big water jugs at the corner store.",
        { flags: { 7: "garrafón: a 20-liter jug of drinking water.", 10: TIENDITA } }),
    ],
    laundry: [
      t("Hay | lavadero | en | la | azotea. | Y | si no, | la | lavandería | de | la | esquina | lava | por | kilo.",
        "There's | a washing sink | on | the | roof. | And | if not, | the | laundry | on | the | corner | washes | by the | kilo.",
        "There's a washing sink up on the roof. Otherwise, the laundry on the corner washes by the kilo.",
        { flags: { 1: "lavadero: a concrete sink with a washboard, common on Mexican rooftops." } }),
    ],
    laundry2: [
      t("Usted | la | deja | en | la | mañana | y | en | la | tarde | ya | está | lista.", "You | it | leave | in | the | morning | and | in | the | afternoon | already | it-is | ready.",
        "You drop it off in the morning, and it's ready in the afternoon.", { flags: { 1: "la = la ropa, your laundry." } }),
    ],
    mail: [
      t("¿El | correo? | Casi | no llega | nada, | la verdad. | Los | paquetes | sí.", "The | mail? | Almost | doesn't arrive | anything, | honestly. | The | packages | yes.",
        "The mail? Hardly anything ever comes, honestly. Packages do, though."),
    ],
    packages_door: [
      t("El | repartidor | toca | el | timbre. | Si | usted | no está, | me | los | deja | a | mí.", "The | delivery guy | rings | the | doorbell. | If | you | aren't in, | (to) me | them | he-leaves | to | me.",
        "The delivery guy rings the bell. If you're out, he leaves them with me.", { flags: { 8: "me … a mí: Spanish says “me” twice for emphasis.", 9: "los here is a pronoun: them (the packages)." } }),
    ],
    parking: [
      t("Hay | estacionamiento | atrás, | pero | son | pocos | lugares. | Si no, | en | la | calle.", "There's | parking | behind, | but | they-are | few | spaces. | If not, | on | the | street.",
        "There's parking out back, but not many spaces. Otherwise, on the street."),
    ],
    internet: [
      t("Yo | tengo | NetWave. | Funciona | bien, | pero | cuando | llueve | fuerte | se va.", "I | have | NetWave. | It-works | well, | but | when | it-rains | hard | it cuts out.",
        "I have NetWave. It works fine, but when it rains hard it cuts out."),
    ],
    quiet: [
      t("Es | tranquilo. | Nada más | los | gallos | del | vecino | en | la | mañana. | Eso sí, | las | paredes | son | delgadas.",
        "It's | quiet. | Only | the | roosters | of the | neighbor | in | the | morning. | Mind you, | the | walls | are | thin.",
        "It's quiet. Just the neighbor's roosters in the morning. Mind you, the walls are thin."),
    ],
    others_noise: [
      t("¡Ay, | sí! | Son | los | de | arriba. | Hacen | fiesta | cada | fin de semana.", "Oh, | yes! | It's | the ones | from | upstairs. | They-have | a party | every | weekend.",
        "Oh, yes! That's the people upstairs. They throw a party every weekend."),
    ],
    landlord: [
      t("¿Don | Ernesto? | Es | buena | persona, | pero | hay que | insistirle | un | poquito.", "Don | Ernesto? | He's | good | person, | but | you have to | keep after him | a | little bit.",
        "Don Ernesto? He's a good man, but you have to keep after him a bit.", { flags: { 0: "Don: a respectful title for an older man, used with his first name." } }),
    ],
    store: [
      t("Hay | una | tiendita | en | la | esquina, | y | el | mercado | no está | lejos.", "There's | a | little store | on | the | corner, | and | the | market | isn't | far.",
        "There's a little store on the corner, and the market isn't far.", { flags: { 2: TIENDITA } }),
    ],
    unknown_q: [t("Mmm, | no sé. | Pregúntele | a | Don | Ernesto.", "Hmm, | I don't know. | Ask | — | Don | Ernesto.", "Hmm, I'm not sure. Ask Don Ernesto.", { flags: { 3: A_PERS } })],
    knock: [t("Ya | sabe | dónde | estoy, | ¿eh?", "Already | you-know | where | I-am, | eh?", "You know where to find me!")],

    // --- favors ------------------------------------------------------------------------
    plants_when: [t("¡Claro! | ¿Cuándo | se va?", "Sure! | When | are you leaving?", "Of course! When are you leaving?")],
    plants_key: [
      t("¡Con gusto! | Nada más | déjeme | una | llave.", "Happily! | Just | leave me | a | key.", "Happy to! Just leave me a key."),
      t("¡Claro que sí! | Déjeme | la | llave | y | yo | me encargo.", "Of course! | Leave me | the | key | and | I | I'll take care of it.", "Of course! Leave me the key and I'll take care of it."),
    ],
    trip: [t("¡Buen viaje!", "Have a good trip!", "Have a great trip!")],
    package_ok: [
      t("¡Claro! | Yo | casi | siempre | estoy | en | casa.", "Sure! | I | almost | always | am | at | home.", "Of course! I'm almost always home."),
      t("Sí, | con gusto. | Yo | se lo | guardo.", "Yes, | gladly. | I | it for you | I'll-keep.", "Yes, happy to. I'll keep it for you."),
    ],
    borrow_yes: [
      t("¡Claro! | Espéreme | un | momento.", "Sure! | Wait for me | a | moment.", "Sure! Just a moment."),
      t("¡Sí, | cómo no!", "Yes, | of course!", "Yes, of course!"),
    ],
    here_you_go: [t("¡Aquí tiene!", "Here you go!", "Here you go!")],
    return_it: [
      t("Nada más | me | {lo@X} | regresa | cuando | termine.", "Just | (to) me | it | you-return | when | you-finish.", "Just bring it back when you're done.",
        { flags: { 2: "lo / la agrees with the thing: el martillo → lo, la escalera → la." } }),
    ],
    borrow_no: [
      t("Ay, | fíjese | que | no tengo | {X}. | Pregúntele | a | Don | Ernesto.", "Oh, | you-see | that | I don't have | {X}. | Ask | — | Don | Ernesto.",
        "Oh, I'm afraid I don't have {X.np}. Ask Don Ernesto.", { flags: { 1: "fíjese que: a soft way to break bad news (“I'm afraid…”).", 6: A_PERS } }),
    ],
    borrow_unknown: [t("Mmm, | creo | que | no tengo, | perdón.", "Hmm, | I-think | that | I don't have (one), | sorry.", "Hmm, I don't think I have one, sorry.")],

    // --- noise -------------------------------------------------------------------------
    noise_ok: [
      t("¡Ay, | no se preocupe! | Ni | lo | oí.", "Oh, | don't worry! | Not even | it | I-heard.", "Oh, don't worry! I didn't even hear it.",
        { flags: { 2: "ni: “not even”; it carries the negation." } }),
      t("¡No pasa nada! | Aquí | todos | hacemos | ruido | a veces.", "No worries! | Here | all | we-make | noise | sometimes.", "No worries! We all make a little noise sometimes."),
      t("Está bien, | {m:vecino|f:vecina}. | Pasa | a veces.", "That's okay, | neighbor. | It-happens | sometimes.", "That's okay, neighbor. It happens."),
    ],
    noise_reason_react: [t("¡Ah, | qué | bien! | Hay que | celebrar.", "Oh, | how | nice! | You have to | celebrate.", "Oh, how nice! You've got to celebrate.")],
    noise_move_react: [t("¡Ah, | la | mudanza, | claro!", "Oh, | the | move, | of course!", "Oh, the move, of course!")],
    noise_thanks: [
      t("Gracias, | se lo | agradezco | mucho.", "Thanks, | it to you | I-appreciate | a lot.", "Thank you, I really appreciate it."),
      t("¡Muchas | gracias, | {m:vecino|f:vecina}!", "Many | thanks, | neighbor!", "Thank you so much, neighbor!"),
    ],
    noise_sorry_rita: [t("¡Ay, | perdóneme!", "Oh, | forgive me!", "Oh, I'm so sorry!")],
    noise_didnt_realize: [
      t("Es que | a | mi | esposo | le gusta | la | música | fuerte.", "It's that | — | my | husband | likes | the | music | loud.", "My husband likes his music loud, you see.",
        { flags: { 1: "a marks who likes it (a mi esposo le gusta); English needs no word." } }),
    ],
    noise_turn_down: [
      t("Ahorita | le | bajo.", "Right now | (to) it | I-turn-down.", "I'll turn it down right now.",
        { flags: { 0: "Mexican: ahorita = right now (or in a little while).", 1: LE_MUSIC },
          neutral: t("Ya | le | bajo.", "Right away | (to) it | I-turn-down.", "I'll turn it down right away.", { flags: { 1: LE_MUSIC } }) }),
    ],
    complain1: [
      t("Oiga, | {m:vecino|f:vecina}, | disculpe | que | {m:lo|f:la} | moleste.", "Listen, | neighbor, | excuse (me) | that | you | I-bother.", "Excuse me, neighbor, sorry to bother you.",
        { flags: { 4: LOLA } }),
    ],
    complain2: [t("Anoche | la | música | estaba | muy | fuerte.", "Last night | the | music | was | very | loud.", "The music was really loud last night.")],
    complain3: [
      t("¿Le | podría | bajar | un | poquito | en | la | noche?", "(To) it | could-you | turn down | a | little bit | in | the | night?", "Could you turn it down a little at night?",
        { flags: { 0: LE_MUSIC } }),
    ],
    complain4: [t("Es que | las | paredes | son | muy | delgadas.", "It's that | the | walls | are | very | thin.", "The walls are really thin, you see.")],
    // the learner asked her to turn her music down, but she meant the learner's music
    complain_yours: [t("¡Ay, | no! | Le | hablo | de | su | música, | la | de | anoche.", "Oh, | no! | (To) you | I-speak | about | your | music, | the one | from | last night.", "Oh, no! I mean your music last night!")],
    complain_which: [t("Su | música, | la | de | anoche.", "Your | music, | the one | from | last night.", "Your music, last night!")],
    complain_again: [
      t("Y | lo | de | la | música, | ¿eh? | Un | poquito | más | bajo | en | la | noche.", "And | the thing | about | the | music, | okay? | A | little bit | more | low | at | — | night.",
        "And about the music, okay? Just a little quieter at night.", { flags: { 11: "en la noche: at night; the article has no English word." } }),
    ],
    deny_react: [
      t("¿Ah, | no? | ¡Perdone! | Entonces | fueron | los | de | arriba.", "Oh, | no? | Forgive me! | Then | it-was | the ones | from | upstairs.",
        "Oh, it wasn't you? I'm sorry! Then it was the people upstairs."),
    ],
    oh_okay: [t("Ah… | bueno.", "Oh… | okay.", "Oh… okay then.")],

    // --- returning players -------------------------------------------------------------
    greet_known: [
      t("¡Hola, | {m:vecino|f:vecina}! | ¿Cómo | le | va?", "Hi, | neighbor! | How | (for) you | it-goes?", "Hi, neighbor! How's it going?"),
      t("¡Ay, | {m:vecino|f:vecina}, | qué | gusto! | ¿Cómo | está?", "Oh, | neighbor, | what | a pleasure! | How | are-you?", "Oh, neighbor, how nice to see you! How are you?"),
    ],
    hi_known: [t("¡Hola, | {m:vecino|f:vecina}!", "Hi, | neighbor!", "Hi, neighbor!")],
    package_twist: [
      t("Ah, | por cierto: | le | tengo | un | paquete. | El | repartidor | me lo | dejó.", "Oh, | by the way: | (for) you | I-have | a | package. | The | delivery guy | it with me | left.",
        "Oh, by the way, I have a package for you. The delivery guy left it with me."),
    ],

    // --- coffee ------------------------------------------------------------------------
    coffee_invite: [
      t("Oiga, | ¿por qué | no pasa | el | domingo | a | tomar | un | cafecito?", "Say, | why | don't you come by | on | Sunday | to | have | a | little coffee?",
        "Say, why don't you come by on Sunday for a cup of coffee?", { flags: { 3: EL_DAY, 8: CAFECITO } }),
      t("¿Le gustaría | venir | a | tomar | un | cafecito | el | domingo?", "Would you like | to come | to | have | a | little coffee | on | Sunday?",
        "Would you like to come over for coffee on Sunday?", { flags: { 5: CAFECITO, 6: EL_DAY } }),
    ],
    coffee_time: [
      t("¡Qué | bueno! | ¿Le parece | a | las | cinco?", "How | nice! | Does it suit you | at | — | five?", "Great! Is five o'clock okay?", { flags: { 4: ART_TIME } }),
    ],
    coffee_confirm: [
      t("¡Perfecto! | Ahí | nos vemos.", "Perfect! | There | see you.", "Perfect! See you then."),
      t("¡Ándele! | Yo | compro | pan dulce.", "All right! | I | buy | sweet bread.", "Wonderful! I'll pick up some pan dulce.",
        { flags: { 0: "Mexican: ándele = all right, great.", 3: "pan dulce: Mexican sweet bread, the classic with coffee." },
          neutral: t("¡Muy | bien! | Yo | compro | pan dulce.", "Very | good! | I | buy | sweet bread.", "Wonderful! I'll pick up some pan dulce.",
            { flags: { 4: "pan dulce: Mexican sweet bread, the classic with coffee." } }) }),
    ],
    coffee_reask: [t("Entonces, | ¿un | cafecito | el | domingo?", "So, | a | little coffee | on | Sunday?", "So, coffee on Sunday?", { flags: { 3: EL_DAY } })],
    coffee_other_day: [t("¡Claro, | así | también | me queda | bien!", "Sure, | that way | also | suits me | well!", "Sure, that works for me too!")],
    coffee_decline_ok: [t("¡No se preocupe! | Será | otro | día.", "Don't worry! | It'll-be | another | day.", "Don't worry! Another time, then.")],
    coffee_whenever: [t("Está bien. | Cuando | tenga | tiempo, | me | avisa.", "That's fine. | When | you-have | time, | (to) me | you-let-know.", "That's fine. Just let me know when you have time.")],
    coffee_learner_react: [
      t("¡Ay, | qué | amable! | ¿Le parece | el | domingo | en | la | tarde?", "Oh, | how | kind! | Does it suit you | — | Sunday | in | the | afternoon?",
        "Oh, how kind! How about Sunday afternoon?", { flags: { 4: EL_DAY } }),
    ],

    // --- thanks and goodbye -------------------------------------------------------------
    kind_react: [
      t("¡Para | eso | estamos | los | vecinos!", "For | that | we-are | — | neighbors!", "That's what neighbors are for!",
        { flags: { 3: "estamos los vecinos: “we neighbors are”; the article has no English word." } }),
    ],
    star_react: [t("¡Ay, | no es | nada!", "Oh, | it's not | anything!", "Oh, it's nothing!")],
    bye_new: [
      t("¡Fue | un | gusto | conocerl{m:o|f:a}!", "It-was | a | pleasure | to meet you!", "It was so nice to meet you!",
        { flags: { 3: "conocerlo / conocerla: “to meet you”, for a man / a woman." } }),
    ],
    you_too: [t("¡Igualmente!", "Likewise!", "You too!")],
    see_around: [t("¡Nos vemos, | {m:vecino|f:vecina}!", "See you, | neighbor!", "See you around, neighbor!")],
    ack: [t("Ah, | bueno.", "Oh, | okay.", "Oh, okay."), t("Está bien.", "Okay.", "Okay.")],
    bye_known: [
      t("Bueno, | aquí | estoy | para | lo que | se le ofrezca.", "Well, | here | I-am | for | whatever | you-may-need.", "Well, I'm right here if you need anything."),
    ],

    // --- the global intents in usted (see NEEDS at the top) ---
    bye_usted: [
      t("¡Adiós! | ¡Que | le | vaya | bien!", "Bye! | (I hope) | for you | it-goes | well!", "Bye! Take care!"),
      t("¡Cuídese | mucho!", "Take care | a lot!", "Take good care!"),
    ],
    howareyou_reply: [
      t("Bien, | gracias. | ¿Y | usted?", "Good, | thanks. | And | you?", "Good, thanks. And you?"),
      t("Aquí, | con | mis | plantas. | ¿Y | usted, | cómo | está?", "Here, | with | my | plants. | And | you, | how | are-you?", "Oh, busy with my plants. And how are you?"),
    ],
    no_worries: [t("¡No se preocupe!", "Don't worry!", "Don't worry!"), t("¡No pasa nada!", "No worries!", "No worries!")],
    take_time: [t("Claro, | tómese | su | tiempo.", "Sure, | take | your | time.", "Sure, take your time."), t("Sin prisa.", "No rush.", "No rush.")],
    learning: [
      t("¡No se preocupe! | Habla | muy | bien. | Le | hablo | más despacio.", "Don't worry! | You-speak | very | well. | (To) you | I'll-speak | more slowly.",
        "Don't worry, you speak very well! I'll speak more slowly."),
    ],
    slow_intro: [t("Claro, | le | hablo | más despacio.", "Sure, | (to) you | I'll-speak | more slowly.", "Sure, I'll speak more slowly.")],
    meaning_intro: [t("Mire, | le | explico.", "Look, | (to) you | I'll-explain.", "Here, let me explain.")],
  },

  hints: {
    intro: {
      lt: "Introduce yourself to your neighbor",
      items: [
        { id: "im_name", s: t("¡Hola! | Soy | {$name}.", "Hi! | I'm | {$name}.", "Hi! I'm {$name}.") },
        { id: "moved_in", s: t("Me mudé | aquí | al lado | la semana pasada.", "I moved in | here | next door | last week.", "I moved in next door last week.") },
        { id: "new_neighbor", s: t("Soy | {m:el|f:la} | {m:nuevo|f:nueva} | {m:vecino|f:vecina}.", "I'm | the | new | neighbor.", "I'm the new neighbor.") },
        { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
        { id: "nice_meet", s: t("¡Mucho gusto!", "Nice to meet you!", "Nice to meet you!") },
      ],
    },
    name: {
      lt: "Say your name",
      items: [
        { id: "my_name", s: t("Me llamo | {$name}.", "My name is | {$name}.", "My name is {$name}.") },
        { id: "im_name", s: t("Soy | {$name}.", "I'm | {$name}.", "I'm {$name}.") },
      ],
    },
    from: {
      lt: "Say where you're from", slot: "country", examples: ["usa", "canada", "uk"],
      items: [
        { id: "from_country", s: t("Soy | de | {X}.", "I'm | from | {X}.", "I'm from {X}.") },
        { id: "come_from", s: t("Vengo | de | {X}.", "I-come | from | {X}.", "I'm from {X}.") },
      ],
    },
    like: {
      lt: "Say how you like it here",
      items: [
        { id: "love_it", s: t("¡Me encanta!", "I love it!", "I love it!") },
        { id: "like_town", s: t("Me gusta | mucho | el | pueblo.", "I like | a lot | the | town.", "I really like the town.") },
        { id: "so_far", s: t("Hasta ahora, | todo | bien.", "So far, | all | good.", "So far, so good.") },
        { id: "boxes", s: t("Bien, | pero | todavía | tengo | muchas | cajas.", "Good, | but | still | I-have | many | boxes.", "Good, but I've still got lots of boxes.") },
      ],
    },
    building: {
      lt: "Ask how things work here",
      items: [
        { id: "q_trash", s: t("¿Dónde | se tira | la | basura?", "Where | does one throw | the | trash?", "Where does the trash go?") },
        { id: "q_trash_day", s: t("¿A | qué | hora | pasa | la | basura?", "At | what | time | comes-by | the | trash?", "What time does the garbage truck come?"),
          note: "In Mexico the garbage truck “passes”: you take your bags out when you hear it." },
        { id: "q_recycling", s: t("¿Dónde | pongo | las | botellas?", "Where | I-put | the | bottles?", "Where do I put the bottles?") },
        { id: "q_gas", s: t("¿Cómo | compro | gas?", "How | I-buy | gas?", "How do I buy gas?"), note: "Mexican homes cook with gas that a truck delivers." },
        { id: "q_water", s: t("¿Se puede | tomar | el | agua | de | la | llave?", "Can you | drink | the | water | from | the | tap?", "Can you drink the tap water?") },
        { id: "q_laundry", s: t("¿Dónde | puedo | lavar | la | ropa?", "Where | I-can | wash | the | clothes?", "Where can I do laundry?") },
        { id: "q_mail", s: t("¿Dónde | dejan | los | paquetes?", "Where | they-leave | the | packages?", "Where do they leave packages?") },
        { id: "q_store", s: t("¿Hay | una | tienda | cerca?", "Is there | a | store | nearby?", "Is there a store nearby?") },
      ],
    },
    favor: {
      lt: "Ask a favor",
      items: [
        { id: "water_plants", s: t("¿Me | podría | regar | las | plantas | la | próxima | semana?", "(For) me | could-you | water | the | plants | — | next | week?",
          "Could you water my plants next week?", { flags: { 5: "la próxima semana: next week; the article has no English word." } }) },
        { id: "package", s: t("¿Me | podría | recibir | un | paquete | el | lunes?", "(For) me | could-you | take in | a | package | on | Monday?",
          "Could you take in a package for me on Monday?", { flags: { 5: EL_DAY } }) },
        { id: "ask_favor", s: t("¿Le | puedo | pedir | un | favor?", "(Of) you | I-can | ask | a | favor?", "Can I ask you a favor?") },
      ],
    },
    away: {
      lt: "Say when you're leaving",
      items: [
        { id: "away_when", s: t("Me voy | el | próximo | viernes.", "I'm leaving | — | next | Friday.", "I'm leaving next Friday.", { flags: { 1: "el próximo viernes: next Friday; the article has no English word." } }) },
        { id: "on_saturday", s: t("El | sábado.", "On | Saturday.", "On Saturday.", { flags: { 0: EL_DAY } }) },
        { id: "this_weekend", s: t("Este | fin de semana.", "This | weekend.", "This weekend.") },
      ],
    },
    borrow: {
      lt: "Borrow something", slot: "thing", examples: ["escalera", "taladro", "aspiradora", "azucar"],
      items: [
        { id: "borrow", s: t("¿Me | presta | {X.the}?", "(To) me | you-lend | {X.the}?", "Could I borrow your {X}?"), only: (e) => !e.attrs?.mass,
          note: "Mexicans say “¿Me presta…?” (will you lend me…?) to borrow something." },
        { id: "borrow_some", s: t("¿Me | podría | dar | un | poco | de | {X}?", "(To) me | could-you | give | a | little | of | {X}?", "Could you spare a little {X}?"),
          only: (e) => !!e.attrs?.mass },
        { id: "have_one", s: t("¿Tiene | {X.np}?", "Do you have | {X.np}?", "Do you have {X.np}?"), only: (e) => !e.attrs?.mass },
      ],
    },
    noise: {
      lt: "Apologize for the noise, or ask for quiet",
      items: [
        { id: "sorry_noise", s: t("Perdón | por | el | ruido | de | anoche.", "Sorry | for | the | noise | of | last night.", "Sorry about the noise last night.") },
        { id: "wont_happen", s: t("No vuelve a pasar.", "It won't happen again.", "It won't happen again.") },
        { id: "quieter", s: t("Vamos | a | hacer | menos | ruido.", "We're going | to | make | less | noise.", "We'll keep it down.") },
        { id: "little_party", s: t("Hicimos | una | reunión | con | unos | amigos.", "We-had | a | get-together | with | some | friends.", "We had a few friends over.") },
        { id: "my_birthday", s: t("Fue | mi | cumpleaños.", "It-was | my | birthday.", "It was my birthday.") },
        { id: "turn_down", s: t("¿Le | podría | bajar | un | poquito | a | la | música?", "(To) it | could-you | turn down | a | little bit | — | the | music?",
          "Could you turn the music down a little?", { flags: { 0: "le … a la música: Spanish names the music twice (bajarle a la música).", 5: "a has no English word here." } }) },
      ],
    },
    coffee: {
      lt: "Answer the invitation, or invite her",
      items: [
        { id: "love_to", s: t("¡Me encantaría!", "I'd love to!", "I'd love to!") },
        { id: "busy_sunday", s: t("Lo siento, | el | domingo | no puedo.", "Sorry, | — | Sunday | I can't.", "Sorry, I can't on Sunday.", { flags: { 1: EL_DAY } }) },
        { id: "what_time", s: t("¡Claro! | ¿A | qué | hora?", "Sure! | At | what | time?", "Sure! What time?") },
        { id: "sounds_great", s: t("¡Qué | buena | idea!", "What | a good | idea!", "What a nice idea!") },
        { id: "another_time", s: t("¿Otro | día, | tal vez?", "Another | day, | maybe?", "Maybe another day?") },
        { id: "invite_coffee", s: t("¿Quiere | venir | a | tomar | un | café | a | mi | casa | algún día?", "You-want | to come | to | have | a | coffee | at | my | house | someday?",
          "Would you like to come over for coffee sometime?") },
      ],
    },
    coffee_time: {
      lt: "Agree on a time",
      items: [
        { id: "five_fine", s: t("Sí, | a | las | cinco | está bien.", "Yes, | at | — | five | is fine.", "Yes, five is fine.", { flags: { 2: ART_TIME } }) },
        { id: "how_six", s: t("¿Qué tal | a | las | seis?", "How about | at | — | six?", "How about six?", { flags: { 2: ART_TIME } }) },
        { id: "later", s: t("Un | poco | más | tarde, | si | se puede.", "A | little | more | late, | if | it's possible.", "A little later, if that's okay.") },
      ],
    },
    sunday: {
      lt: "Agree on a day",
      items: [
        { id: "sunday_ok", s: t("El | domingo | me queda | bien.", "— | Sunday | suits me | well.", "Sunday works for me!", { flags: { 0: "El domingo: Sunday, a day ahead; English needs no article." } }) },
        { id: "how_saturday", s: t("¿Qué tal | el | sábado?", "How about | — | Saturday?", "How about Saturday?", { flags: { 1: EL_DAY } }) },
      ],
    },
    thanks: {
      lt: "Thank your neighbor",
      items: [
        { id: "s_thanks", s: t("¡Muchas | gracias!", "Many | thanks!", "Thank you so much!") },
        { id: "so_kind", s: t("¡Qué | amable!", "How | kind!", "That's so kind of you!") },
        { id: "star", s: t("¡Es | usted | un | amor!", "Are | you | a | love!", "You're a sweetheart!", { flags: { 3: "un amor: “a sweetheart”, warm praise." } }) },
      ],
    },
    bye: {
      lt: "Thank her and say goodbye",
      items: [
        { id: "nice_meet", s: t("¡Fue | un | placer!", "It-was | a | pleasure!", "It was a pleasure!") },
        { id: "see_you", s: t("¡Nos vemos | pronto!", "See you | soon!", "See you soon!") },
        { id: "so_kind", s: t("¡Qué | amable!", "How | kind!", "That's so kind of you!") },
      ],
    },
  },

  tips: {
    tu_older: { key: "tu_older", lt: "Understood! With an older neighbor like Doña Lupita, usted is more polite: “¿Me presta su escalera?”, “¿Me podría ayudar?” (tú is for friends).", better: "¿Me presta su escalera?" },
  },

  merges: {
    "al lado": { reason: "lexical_expression", split: "al → to the + lado → side is false; = next door.", minimal: "Two words." },
    "me confundí": { reason: "lexical_expression", split: "me → myself + confundí → I confused; = my mistake / I got mixed up.", minimal: "Two words." },
    "para servirle": { reason: "lexical_expression", split: "para → for + servirle → serving you; the courtesy formula = at your service.", minimal: "Two words." },
    "nos conocemos": { reason: "grammatical_fusion", split: "nos → each other + conocemos → we know; reciprocal = we've met.", minimal: "Two words." },
    "pasar frío": { reason: "lexical_expression", split: "pasar → pass + frío → cold is false; = be cold.", minimal: "Two words." },
    "algún día": { reason: "lexical_expression", split: "algún → some + día → day; = someday, ever.", minimal: "Two words." },
    "con confianza": { reason: "lexical_expression", split: "con → with + confianza → trust; = feel free, don't be shy.", minimal: "Two words." },
    "se le ofrece": { reason: "grammatical_fusion", split: "se → itself + le → to you + ofrece → offers; the service question = what can I do for you.", minimal: "Three words." },
    "si no": { reason: "lexical_expression", split: "si → if + no → not; = otherwise.", minimal: "Two words." },
    "la verdad": { reason: "lexical_expression", split: "la → the + verdad → truth; the discourse marker = honestly.", minimal: "Two words." },
    "eso sí": { reason: "lexical_expression", split: "eso → that + sí → yes is false; the concession = mind you.", minimal: "Two words." },
    "hay que": { reason: "grammatical_fusion", split: "hay → there is + que → that is false; impersonal obligation = you have to.", minimal: "Two words." },
    "me encargo": { reason: "grammatical_fusion", split: "me → myself + encargo → I order is false; encargarse = take care of it.", minimal: "Two words." },
    "buen viaje": { reason: "lexical_expression", split: "buen → good + viaje → trip; the wish = have a good trip.", minimal: "Two words." },
    "es que": { reason: "lexical_expression", split: "es → it is + que → that; the explaining opener = you see, the thing is.", minimal: "Two words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain is false; = by the way.", minimal: "Two words." },
    "me encantaría": { reason: "grammatical_fusion", split: "me → to me + encantaría → would delight; = I'd love to.", minimal: "Two words." },
    "me mudé": { reason: "grammatical_fusion", split: "me → myself + mudé → I moved; mudarse = move (house), here “moved in”.", minimal: "Two words." },
    "la semana pasada": { reason: "lexical_expression", split: "la → the + semana → week + pasada → past; = last week.", minimal: "Three words." },
    "hasta ahora": { reason: "lexical_expression", split: "hasta → until + ahora → now; = so far.", minimal: "Two words." },
    "me voy": { reason: "grammatical_fusion", split: "me → myself + voy → I go; irse = leave.", minimal: "Two words." },
    "fin de semana": { reason: "lexical_expression", split: "fin → end + de → of + semana → week; = weekend.", minimal: "Three words." },
    "se le ofrezca": { reason: "grammatical_fusion", split: "se → itself + le → to you + ofrezca → may offer; = (whatever) you may need.", minimal: "Three words." },
    "no vuelve a pasar": { reason: "lexical_expression", split: "no → not + vuelve → returns + a → to + pasar → happen; volver a + verb = again: it won't happen again.", minimal: "Four words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Introduce yourself to Doña Lupita", optional: true, when: (c) => !known(c), done: (c) => !!c.s.introduced },
    { lt: "Ask how the trash works", optional: true, when: (c) => !known(c), done: (c) => !!c.s.trashTold },
    { lt: "Say how you're doing", optional: true, when: (c) => knownPlain(c), done: (c) => knownPlain(c) && !!c.s.chatted },
    { lt: "Thank her for the package", optional: true, when: (c) => !!c.s.pkgTwist, done: (c) => !!c.s.pkgTwist && (!!c.s.pkgThanked || !!c.s.chatted) },
    { lt: "Answer her complaint about the music", optional: true, when: (c) => !!c.s.complaint, done: (c) => !!c.s.complaintDone || c.s.goal === "apology" },
    { lt: "Ask a favor, or apologize for the noise", done: (c) => !!c.s.goal },
  ],

  steps: [
    { id: "intro", when: (c) => !known(c), done: (c) => !!c.s.introduced,
      ask: (c) => { if (!c.s.greeted0) { c.s.greeted0 = true; c.say("greet_new"); } else c.say("intro_again"); },
      expects: ["moved_in", "im_name_ctx", "my_name", "intro_yes_ctx"],
      suggest: [{ lt: "Introduce yourself: your name, and that you just moved in", hint: "intro" }],
      yes: (c) => introduce(c, false),
      no: (c) => { c.say("not_neighbor"); c.hold(); } },
    { id: "from_q", when: (c) => !known(c) && !!c.s.introduced && c.s.askFrom, done: (c) => !!c.s.fromAsked,
      ask: (c) => {
        c.s.fromAsked = true;
        c.say("ask_from");
        c.expect({ id: "from_q", optional: true, expects: ["from_ans", "from_ans_ctx", "from_other_ctx"], hints: ["from"],
          suggest: [{ lt: "Say where you're from", hint: "from", options: "country" }],
          on: {
            from_ans: (cc, sl, sg) => { H.from_ans(cc, sl, sg); },
            from_ans_ctx: (cc, sl, sg) => { H.from_ans_ctx(cc, sl, sg); },
            from_other_ctx: (cc, sl, sg) => { H.from_other_ctx(cc, sl, sg); },
          } });
      },
      expects: ["from_ans", "from_ans_ctx", "from_other_ctx"] },
    { id: "like_q", when: (c) => !known(c) && !!c.s.introduced && c.s.askLike, done: (c) => !!c.s.likeAsked,
      ask: (c) => {
        c.s.likeAsked = true;
        c.say("ask_like");
        c.expect({ id: "like_q", optional: true, expects: ["like_ans_ctx", "like_hard_ctx", "boxes"], hints: ["like"],
          suggest: [{ lt: "Say how you like it here", hint: "like" }],
          on: { like_ans_ctx: (cc) => { react(cc, "like_react"); }, like_hard_ctx: (cc) => { react(cc, "like_hard"); }, boxes: (cc) => { react(cc, "boxes_react"); },
            g_dontknow: (cc) => { react(cc, "like_hard"); } },
          yes: (cc) => { cc.say("like_react"); }, no: (cc) => { cc.say("like_hard"); } });
      },
      expects: ["like_ans_ctx", "like_hard_ctx", "boxes"] },
    { id: "trash_q", when: (c) => !known(c) && !!c.s.introduced, done: (c) => !!c.s.trashTold || !!c.s.goal,
      ask: (c) => { c.s.chatted = true; c.say(c.s.trashAsked ? "needs_more" : "needs_first_new"); c.s.trashAsked = true; },
      expects: ["ask_trash", "ask_recycling", "ask_trash_day", "ask_boxes", "ask_gas", "ask_water", "ask_laundry", "ask_mail", "ask_parking", "ask_internet", "ask_quiet",
        "ask_landlord", "ask_store", "no_more", "ask_favor", "water_plants", "take_package", "borrow", "have_thing", "noise_sorry", "noise_ask", "noise_reason", "from_ans"],
      suggest: [
        { lt: "Ask how the trash works", hint: "building" },
        { lt: "Ask a favor", hint: "favor" },
      ],
      yes: (c) => { c.say("favor_what"); c.hold(); },
      no: (c) => { c.say("fyi_trash"); c.s.trashTold = true; c.s.needsNo = 1; } },
    { id: "needs", done: (c) => !!c.s.goal || (c.s.needsNo ?? 0) >= 2,
      ask: (c) => {
        c.s.chatted = true;
        c.s.howOpen = false;
        if (c.s.needsNo === 1 && !c.s.nudged) { c.s.nudged = true; c.say("needs_nudge"); c.say("needs_nudge2"); return; }
        if (known(c) && !c.s.needsAsked) { c.s.needsAsked = true; c.say("needs_first_known"); return; }
        c.s.needsAsked = true;
        c.say("needs_more");
      },
      expects: ["ask_favor", "water_plants", "take_package", "borrow", "have_thing", "noise_sorry", "noise_ask", "noise_reason", "ask_trash", "ask_recycling",
        "ask_trash_day", "ask_boxes", "ask_gas", "ask_water", "ask_laundry", "ask_mail", "ask_parking", "ask_internet", "ask_quiet", "ask_landlord", "ask_store", "no_more",
        "invite_coffee", "from_ans"],
      suggest: [
        { lt: "Ask a favor: water your plants, take in a package", hint: "favor" },
        { lt: "Borrow something", hint: "borrow", options: "thing" },
        { lt: "Ask how things work here", hint: "building" },
        { lt: "Apologize for the noise, or ask for quiet", hint: "noise" },
      ],
      yes: (c) => { c.say("favor_what"); c.hold(); },
      no: (c) => { c.s.needsNo = (c.s.needsNo ?? 0) + 1; } },
    { id: "coffee", when: (c) => !!c.s.coffeeInvite && (!!c.s.goal || (c.s.needsNo ?? 0) >= 2), done: (c) => !!c.s.coffeeDone,
      ask: (c) => {
        c.s.coffeeDone = true;
        c.s.coffeePending = true;
        c.say("coffee_invite");
        c.expect({ id: "coffee", expects: ["coffee_yes", "coffee_no", "coffee_day"], hints: ["coffee"],
          suggest: [{ lt: "Accept, or politely say no", hint: "coffee" }],
          on: {
            coffee_yes: (cc, sl) => { if (otherDay(sl)) react(cc, "coffee_other_day"); askCoffeeTime(cc); },
            coffee_no: (cc) => { if (PROPOSES_DAY.test(heard(cc))) react(cc, "coffee_other_day"); else { cc.s.coffeeOff = true; react(cc, "coffee_decline_ok"); } },
            // (no "¡Ahí nos vemos!" twice after another day)
            coffee_day: (cc) => { react(cc, "coffee_other_day"); },
            // "Gracias, ¡adiós!": thank first, then say goodbye (a plain "¡Gracias!" is left to the normal handler).
            g_thanks: (cc) => {
              if (coffeeThanks(cc, askCoffeeTime, (c2) => { c2.s.coffeeOff = true; c2.say("coffee_decline_ok"); })) return true;
              if (!/\b(adios|hasta luego|nos vemos|bye|chao|cuidese)\b/.test(heard(cc))) return false;
              cc.say("g_welcome"); return true;
            },
            g_bye: (cc) => {
              if (!known(cc) && !cc.s.trashTold) { cc.say("fyi_trash"); cc.s.trashTold = true; }
              maybeComplete(cc); cc.say("see_around"); cc.end();
            },
          },
          yes: (cc) => { askCoffeeTime(cc); }, no: (cc) => { cc.s.coffeeOff = true; cc.say("coffee_decline_ok"); },
          ask: (cc) => cc.say("coffee_reask") });
      },
      expects: ["coffee_yes", "coffee_no", "coffee_day"] },
  ],

  init: (c) => {
    c.s.known = c.visits >= 1;
    c.s.askFrom = c.chance(0.45);
    c.s.askLike = c.chance(0.35);
    c.s.coffeeInvite = c.chance(c.s.known ? 0.3 : 0.6);
    c.s.complaint = c.s.known && c.chance(0.45);
    c.s.pkgTwist = c.s.known && !c.s.complaint && c.chance(0.4);
    c.s.qCount = 0;
  },

  start: (c) => {
    if (!known(c)) return; // the "intro" step greets
    if (c.s.complaint) {
      c.twist("complaint");
      c.say("complain1"); c.say("complain2"); c.say("complain3");
      if (c.chance(0.5)) c.say("complain4");
      expectComplaint(c, false);
      return;
    }
    if (c.s.pkgTwist) {
      c.twist("package");
      c.say("hi_known"); c.say("package_twist");
      c.event("give", { item: "package" });
      c.expect({ id: "pkg", optional: true, expects: ["g_thanks", "thanks_kind"], hints: ["thanks"],
        suggest: [{ lt: "Thank your neighbor", hint: "thanks" }],
        on: {
          g_thanks: (cc) => { cc.s.pkgThanked = true; if (once(cc, "pkg_thanks")) cc.say(/amable|un amor/.test(heard(cc)) ? "kind_react" : "star_react"); },
          thanks_kind: (cc) => { cc.s.pkgThanked = true; if (once(cc, "pkg_thanks")) cc.say(/esperando|llego|salvo/.test(heard(cc)) ? "star_react" : "kind_react"); },
        } });
      return;
    }
    c.say("greet_known");
    c.s.howOpen = true; // "Bien, gracias" now answers "¿Cómo le va?", not "¿Algo más?"
    expectHowAreYou(c);
  },

  handlers: H,

  finish: (c) => {
    if (!known(c) && !c.s.trashTold) { c.say("fyi_trash"); c.s.trashTold = true; }
    maybeComplete(c);
    if (!known(c)) {
      c.say("knock");
      c.say("bye_new");
    } else c.say("bye_known");
    c.expect({ id: "closing", hints: ["bye"], suggest: [{ lt: "Thank her and say goodbye", hint: "bye" }],
      on: {
        nice_meet: (cc) => { cc.say("you_too"); cc.end(); },
        see_around: (cc) => { cc.say("see_around"); cc.end(); },
        thanks_kind: (cc, sl, sg) => { H.thanks_kind(cc, sl, sg); cc.end(); },
        g_thanks: (cc, sl, sg) => { H.g_thanks(cc, sl, sg); cc.end(); },
        g_bye: (cc) => { cc.say("see_around"); cc.end(); },
        bye_wish: (cc) => { cc.say("see_around"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // introductions
    { say: "Hola, soy Ryan. Me acabo de mudar aquí al lado.", intent: "im_name_ctx", step: "intro" },
    { say: "Me mudé aquí al lado la semana pasada.", intent: "moved_in" },
    { say: "Soy la nueva vecina", intent: "moved_in" },
    { say: "Soy su nuevo vecino", intent: "moved_in" },
    { say: "Me llamo Ryan", intent: "my_name" },
    { say: "Ryan", intent: "none" },
    { say: "Es mi primera semana aqui", intent: "moved_in" },
    { say: "Me mudé al piso de al lado", intent: "moved_in" },
    // small talk
    { say: "Soy de Canadá", intent: "from_ans", slots: { country: "canada" } },
    { say: "Soy estadounidense", intent: "from_ans" },
    { say: "Irlanda", intent: "from_ans_ctx", step: "from_q", slots: { country: "ireland" } },
    { say: "Irlanda", intent: "none" },
    { say: "Hasta ahora, todo bien", intent: "like_ans_ctx", step: "like_q" },
    { say: "Bien, pero todavía tengo muchas cajas", intent: "boxes", step: "like_q" },
    { say: "Hace mucho calor", intent: "like_hard_ctx", step: "like_q" },
    // the building
    { say: "¿Dónde se tira la basura?", intent: "ask_trash" },
    { say: "¿Y la basura?", intent: "ask_trash" },
    { say: "¿A qué hora pasa la basura?", intent: "ask_trash_day" },
    { say: "¿Cuándo es el día de la basura?", intent: "ask_trash_day" },
    { say: "¿Hay que separar la basura?", intent: "ask_recycling" },
    { say: "¿Dónde pongo las botellas?", intent: "ask_recycling" },
    { say: "¿Cómo compro gas?", intent: "ask_gas" },
    { say: "¿Qué es esa música en la mañana?", intent: "ask_gas" },
    { say: "¿Se puede tomar el agua de la llave?", intent: "ask_water" },
    { say: "¿Dónde puedo lavar la ropa?", intent: "ask_laundry" },
    { say: "¿Dónde dejan los paquetes?", intent: "ask_mail" },
    { say: "¿Hay una tienda cerca?", intent: "ask_store" },
    { say: "¿Cómo es Don Ernesto?", intent: "ask_landlord" },
    { say: "No, es todo, gracias", intent: "no_more", step: "needs" },
    // favors
    { say: "¿Le puedo pedir un favor?", intent: "ask_favor" },
    { say: "¿Me podría regar las plantas la próxima semana?", intent: "water_plants" },
    { say: "¿Podrías regar mis plantas mientras no estoy?", intent: "water_plants" },
    { say: "¿Me podría recibir un paquete el lunes?", intent: "take_package" },
    { say: "Estoy esperando un paquete mañana, ¿me lo puede recibir?", intent: "take_package" },
    { say: "¿Me presta su escalera?", intent: "borrow", slots: { thing: "escalera" } },
    { say: "¿Tiene un taladro?", intent: "borrow", slots: { thing: "taladro" } },
    { say: "¿Me podría dar un poco de azúcar?", intent: "borrow", slots: { thing: "azucar" } },
    { say: "¿Tiene un destornillador?", intent: "borrow", slots: { thing: "desarmador" } },
    { say: "El viernes", intent: "none" },
    // noise
    { say: "Perdón por el ruido de anoche", intent: "noise_sorry" },
    { say: "Hicimos una reunión con unos amigos", intent: "noise_reason" },
    { say: "Fue mi cumpleaños", intent: "noise_reason" },
    { say: "No vuelve a pasar", intent: "noise_promise" },
    { say: "Vamos a hacer menos ruido", intent: "noise_promise" },
    { say: "¿Le podría bajar un poquito a la música?", intent: "noise_ask" },
    // coffee
    { say: "¡Me encantaría!", intent: "coffee_yes", step: "coffee" },
    { say: "¡Claro! ¿A qué hora?", intent: "coffee_yes", step: "coffee" },
    { say: "Gracias por la invitación", intent: "coffee_yes", step: "coffee" },
    { say: "¿Quiere venir a tomar un café a mi casa algún día?", intent: "invite_coffee" },
    { say: "¡Fue un placer!", intent: "nice_meet" },
    { say: "Nos vemos pronto", intent: "see_around" },
    { say: "¡Es usted un amor!", intent: "thanks_kind" },
    // tú to an older neighbor: understood, with the tip
    { say: "¿Me prestas tu martillo?", intent: "borrow", slots: { thing: "martillo" } },
    // Spain forms are right answers too: dejar (lend), coche/aparcar, grifo, vale
    { say: "¿Me deja su aspiradora?", intent: "borrow", slots: { thing: "aspiradora" } },
    { say: "¿Dónde aparco el coche?", intent: "ask_parking" },
    { say: "¿Se puede beber el agua del grifo?", intent: "ask_water" },
    { say: "Vale, me encantaría", intent: "coffee_yes", step: "coffee" },
    // meaning must not flip
    { say: "El domingo no puedo", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    { say: "Me encantaría, pero tengo planes el domingo", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    { say: "No estoy ocupada el domingo", intent: "coffee_yes", step: "coffee", not: ["coffee_no"] },
    // a refusal that proposes another day is one answer: another day
    { say: "El domingo no puedo, ¿qué tal el sábado?", intent: "coffee_day", step: "coffee", slots: { day: "saturday" }, not: ["coffee_no"] },
    { say: "Estoy ocupado, ¿mejor la próxima semana?", intent: "coffee_day", step: "coffee", not: ["coffee_no"] },
    { say: "A las cinco no puedo", intent: "coffee_time_no", not: ["coffee_time_ctx"] },
    { say: "No fui yo", intent: "noise_deny", not: ["noise_sorry"] },
    { say: "No hice ninguna fiesta", intent: "noise_deny", not: ["noise_reason"] },
    { say: "No estuvo tan fuerte", intent: "noise_deny", not: ["noise_sorry"] },
    { say: "La música no estaba fuerte", intent: "noise_deny", not: ["noise_ask", "noise_sorry"] },
    { say: "No necesito la escalera", intent: "none" },
    { say: "No tengo plantas", intent: "none" },
    { say: "No espero ningún paquete", intent: "none" },
    { say: "No me gusta mucho, es muy diferente", intent: "like_hard_ctx", step: "like_q", not: ["like_ans_ctx"] },
    { say: "Ya tengo escalera", intent: "have_thing", not: ["borrow"] },
    { say: "Tengo un taladro", intent: "have_thing", step: "needs", not: ["borrow"] },
    { say: "Yo riego mis plantas", intent: "have_thing", not: ["water_plants"] },
    { say: "No, el domingo no", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    { say: "No quiero la escalera, mejor el martillo", intent: "borrow", slots: { thing: "martillo", bad: "escalera" } },
    // more ways to say it
    { say: "¿Me presta un poco de azúcar?", intent: "borrow", slots: { thing: "azucar" } },
    { say: "Los de arriba hacen mucho ruido", intent: "ask_quiet" },
    { say: "Sí, soy yo", intent: "intro_yes_ctx", step: "intro" },
    { say: "Que le vaya bien", intent: "bye_wish" },
    { say: "¿Le molestaría regar mis plantas?", intent: "water_plants" },
    { say: "Ya no necesito nada", intent: "no_more", step: "needs" },
    // the reviewer's traps (2 Nov 2026)
    { say: "Perdón, la música estaba muy fuerte anoche", intent: "noise_sorry", not: ["noise_ask"] },
    { say: "No fue mi música, fueron los de arriba", intent: "noise_deny", not: ["noise_sorry", "noise_reason"] },
    { say: "Ah, perdón, ¿le molestó?", intent: "noise_sorry" },
    { say: "¿Cuándo pasa el camión del gas?", intent: "ask_gas", not: ["ask_trash_day"] },
    { say: "¿A qué hora pasa el gas?", intent: "ask_gas" },
    { say: "¿Me recibe un paquete el lunes?", intent: "take_package" },
    { say: "Recibo un paquete mañana", intent: "none", not: ["take_package"] },
    { say: "La escalera, no el martillo", intent: "none" },
    { say: "Voy a estar fuera unos días, ¿podría regar mis plantas?", intent: "water_plants" },
    { say: "Vivo en el departamento de enfrente", intent: "moved_in" },
    { say: "No quiero pedirle nada", intent: "no_more", step: "needs", not: ["ask_favor"] },
    { say: "El sábado me queda bien", intent: "coffee_yes", step: "coffee", slots: { day: "saturday" } },
    { say: "¿Qué tal el sábado a las seis?", intent: "coffee_day", step: "coffee", slots: { day: "saturday" } },
    { say: "No puedo el domingo pero el sábado sí", intent: "coffee_day", step: "coffee", not: ["coffee_no"] },
    { say: "¿El domingo? Creo que no puedo", intent: "coffee_no", step: "coffee", not: ["coffee_yes"] },
    // not understood
    { say: "Mi carro es azul", intent: "none" },
    { say: "El perro come plátanos", intent: "none" },
    { say: "escalera banana domingo", intent: "none" },
  ],

  // A first meeting (she doesn't know the learner yet) unless the sim says otherwise. Her coffee invitation is
  // pinned on where the script answers it, off where it doesn't. She closes right after granting a favor, so the
  // learner's thanks and goodbye are one closing turn.
  sims: [
    { name: "first meeting, plants", turns: ["¡Hola! Soy Ryan. Me acabo de mudar aquí al lado.", "¿Dónde se tira la basura?", "¿Me podría regar las plantas la próxima semana?",
      "¡Me encantaría!", "Sí, a las cinco está bien.", "¡Fue un placer conocerla!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; } },
    { name: "apology for the noise", turns: ["Hola, soy su nuevo vecino.", "Perdón por el ruido de anoche. Hicimos una reunión con unos amigos.",
      "Gracias, ¡qué amable!", "Lo siento, el domingo no puedo.", "¡Adiós!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; } },
    { name: "questions, then borrow a ladder", turns: ["¡Hola! Acabo de llegar al edificio.", "Ryan.", "¿Dónde puedo lavar la ropa?", "¿A qué hora pasa la basura?",
      "¿Me presta su escalera?", "¡Muchas gracias! ¡Nos vemos!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = false; } },
    // A later visit: she knows the learner, no complaint or package twist, no coffee invitation.
    { name: "asking her to be quieter", turns: ["¡Hola, Doña Lupita!", "¿Le podría bajar un poquito a la música?", "Gracias, ¡adiós!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.known = true; s.complaint = false; s.pkgTwist = false; s.coffeeInvite = false; } },
    { name: "plants while away, then when", turns: ["Hola, soy su nuevo vecino.", "¿Me podría regar las plantas mientras estoy de vacaciones?", "El sábado.",
      "Gracias, es usted un amor. ¡Nos vemos!"], expect: { complete: true, state: { keySaid: true } }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = false; } },
    // short answers, with the gas truck and her optional questions pinned on
    { name: "short answers, the gas truck", turns: ["Hola. Soy el nuevo vecino.", "Ryan.", "De Canadá.", "Muy bonito.", "¿Cómo compro gas?", "¿Me presta un martillo?",
      "Sí.", "A las seis.", "Adiós."], expect: { complete: true, state: { goal: "borrow", coffeeTimeAsked: true } }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.askFrom = true; s.askLike = true; s.coffeeInvite = true; } },
    // questions and a change of mind: the learner invites her, she says Sunday, the learner prefers Saturday
    { name: "water, an invitation, another day, no drill", turns: ["Hola, me llamo Ryan. Soy el nuevo vecino.", "¿Se puede tomar el agua de la llave?", "¿Hay que separar la basura?",
      "¿Quiere venir a tomar un café a mi casa algún día?", "Mejor el sábado, ¿le parece?", "¿Me presta su taladro?", "Bueno, gracias. ¡Hasta luego!"],
      expect: { complete: true, state: { goal: "borrow", coffeeDone: true } }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = false; } },
    // her time doesn't suit: no coffee, nothing promised
    { name: "a package, coffee yes, five o'clock no", turns: ["Hola, soy Ryan, su vecino de al lado.", "¿Me podría recibir un paquete el lunes?", "¡Claro! ¿A qué hora?",
      "A las cinco no puedo.", "¡Gracias por todo! ¡Hasta luego!"], expect: { complete: true, state: { goal: "package" } }, auto: AUTO,
      setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; } },
    // "No, gracias" is a no (never "¡Con gusto!" and the invitation again); a refused time with a new one is the new one
    { name: "coffee: no, thanks", turns: ["Hola, soy Ryan, su nuevo vecino.", "¿Dónde se tira la basura?", "¿Me presta su escalera?", "No, gracias.", "¡Adiós!"],
      expect: { complete: true, state: { goal: "borrow", coffeeOff: true } }, auto: AUTO, setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; s.askFrom = false; s.askLike = false; } },
    { name: "coffee: five no, six yes", turns: ["Hola, soy Ryan, su nuevo vecino.", "¿Me recibe un paquete el lunes?", "¡Me encantaría!", "A las cinco no puedo, ¿a las seis?",
      "¡Gracias, adiós!"], expect: { complete: true, state: { goal: "package", coffeeAt: 6 } }, auto: AUTO, setup: (s) => { FIRST_VISIT(s); s.coffeeInvite = true; s.askFrom = false; s.askLike = false; } },
    // The twist: "Sí, perdón" is an apology (not "pardon?"), "¿Qué música?" gets "Su música, la de anoche."
    { name: "complaint (twist): which music, then sorry", turns: ["¿Qué música?", "Sí, perdón.", "Gracias, adiós."],
      expect: { complete: true, state: { goal: "apology", complaintDone: true } }, auto: AUTO,
      setup: (s) => { s.known = true; s.complaint = true; s.pkgTwist = false; s.coffeeInvite = false; } },
    // The twist on every seed: she complains about the music. A favor first doesn't finish the task; she asks
    // again, and the apology settles it.
    { name: "complaint (twist): a favor first, then sorry", turns: ["¿Me presta su escalera?", "¡Ay, perdón! No vuelve a pasar.", "Gracias, ¡adiós!"],
      expect: { complete: true }, auto: AUTO, setup: (s) => { s.known = true; s.complaint = true; s.pkgTwist = false; s.coffeeInvite = false; } },
    // The twist on every seed, and the learner mixes up whose music it was: "¡Ay, no! Le hablo de su música."
    { name: "complaint (twist): whose music?", turns: ["¿Le podría bajar un poquito a la música?", "¡Ay, perdón! No vuelve a pasar.", "Gracias, ¡adiós!"],
      expect: { complete: true, state: { goal: "apology", complaintDone: true } }, auto: AUTO,
      setup: (s) => { s.known = true; s.complaint = true; s.pkgTwist = false; s.coffeeInvite = false; } },
    // The twist on every seed: it wasn't the learner's music.
    { name: "complaint (twist): it wasn't me", turns: ["No fui yo, yo no estaba en casa anoche.", "¿Me puede recibir un paquete mañana?", "Gracias, adiós."],
      expect: { complete: true, state: { complaintDone: true, goal: "package" } }, auto: AUTO,
      setup: (s) => { s.known = true; s.complaint = true; s.pkgTwist = false; s.coffeeInvite = false; } },
    // The twist on every seed: the delivery guy left a package with her. Thanks, then a favor.
    { name: "package (twist): thanks, then a favor", turns: ["¡Muchas gracias! Lo estaba esperando.", "¿Me podría regar las plantas la próxima semana?", "Gracias, ¡adiós!"],
      expect: { complete: true, state: { pkgThanked: true, goal: "plants" } }, auto: AUTO,
      setup: (s) => { s.known = true; s.complaint = false; s.pkgTwist = true; s.coffeeInvite = false; } },
  ],
};

export default neighbor;
