// NEEDS: None. All vocabulary, merges, the room-return pending question and its grammar are local.
// Song 68 "Late Check-Out" → Hotel Mar Azul, Puerto Colibrí. Fernanda at reception (usted).
// Keeps the base situation's agenda, intent IDs, walk-in choices, upgrade and problem-visit twists.
// The brief adds room_not_ready: no key is issued until the learner returns at three.
// Research (1 Nov 2026; these are interaction references, not Mar Azul's fictional prices/policies):
// https://www.hotelcabanastulum.com/booking/frequently-asked-questions/ (ID, hold, early luggage, late checkout)
// https://www.koretulum.com/faqs (cash/card guarantee, photo ID)
// https://congresoqroo.gob.mx/leyes/187/ (lodging tax; no statutory rate is taught here)
// Mar Azul: breakfast 7–10:30, checkout 11; noon free or 2 p.m. for 500 pesos when available.
// Room rates include VAT; lodging tax is added and itemized on the bill. Deposit: 2,000 pesos per stay.

import type { Ctx, Pending, Segment, SituationDef } from "@/content/types";
import { t } from "@/content/dsl";
import type { ConvCtx } from "@/convo/dialogue";

const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
function once(c: Ctx, key: string, line: string, vars?: Record<string, any>) { const T = turn(c); if (T["said_" + key]) return; T["said_" + key] = true; c.say(line, vars); }
function ack(c: Ctx, p = 0.5, line = "ack") { const T = turn(c); if (T.acked) return; T.acked = true; if (c.chance(p)) c.say(line); }
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};
const tagVal = (tags: string[], prefix: string) => tags.find((x) => x.startsWith(prefix))?.slice(prefix.length);

function nightsFrom(slots: any, seg?: Segment): number | undefined {
  const n = slots?.nights;
  if (!n) return undefined;
  const tags = allTags(n, seg);
  const fixed = tagVal(tags, "n:");
  if (fixed) return Number(fixed);
  if (typeof n.number === "number") return n.number;
  return undefined;
}

function askNext(c: Ctx) {
  for (const st of hotel.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return true;
  }
  return false;
}

/** Walk-in: the room on offer ("double" by default, "two" double beds, or the "cheap" smaller one). */
const OFFER_LINE: Record<string, string> = { two: "walkin_twobeds", cheap: "walkin_cheaper" };
const OFFER_ROOM: Record<string, string> = { two: "207", cheap: "305" };
function takeRoom(c: Ctx) { c.s.roomChosen = true; if (OFFER_ROOM[c.s.offer]) c.s.room = OFFER_ROOM[c.s.offer]; }
/** "That's too expensive." / "Anything cheaper?" / "No, thanks.": a smaller room; after that, it's the cheapest. */
function offerCheaper(c: Ctx) {
  if (c.s.offer === "cheap") { c.say("walkin_cheapest"); c.hold(); return; }
  c.s.offer = "cheap"; c.s.taxSaid = true; c.say("walkin_cheaper", { price: 180000 }); c.hold();
}

/** Choosing between noon (free) and 2 p.m. (500 pesos). */
function lateChoicePending(): Pending {
  const noon = (cc: Ctx) => { cc.s.late = "noon"; once(cc, "late", "late_noon_ok"); };
  const two = (cc: Ctx) => { cc.s.late = "two"; once(cc, "late", "late_two_ok"); };
  return {
    id: "late", expects: ["late_noon", "late_two", "too_expensive_ctx", "cheaper_ctx"], hints: ["late_choice"],
    suggest: [{ lt: "Choose noon (free) or 2 p.m. (500 pesos)", hint: "late_choice" }],
    on: { late_noon: noon, late_two: two, too_expensive_ctx: noon, cheaper_ctx: noon },
    yes: two, no: noon,
    ask: (cc) => { cc.s.lateQuoted = true; cc.say("late_offer", { price: 50000 }); },
  };
}

/** Offering an ocean-view room for 400 pesos more per night. */
function viewPending(): Pending {
  return {
    id: "view", hints: ["g_yesno"], suggest: [{ lt: "Accept or decline the room with a view", hint: "g_yesno" }],
    yes: (cc) => { cc.s.room = "518"; cc.s.view = true; cc.say("view_ok"); if (cc.s.roomSaid) cc.say("room_518"); },
    no: (cc) => { cc.say("no_problem"); },
    ask: (cc) => cc.say("view_offer", { price: 40000 }),
  };
}

/** "Anything else?" after a question: now the simplest reply is "No, that's all, thanks." */
function anyElsePending(): Pending {
  return {
    id: "anything", optional: true, hints: ["done", "ask", "late"],
    suggest: [
      { lt: "Say that’s all", hint: "done" },
      { lt: "Ask another question", hint: "ask" },
      { lt: "Ask for a late checkout", hint: "late" },
    ],
  };
}

/** Problem visit: a fan or a different room. */
function fanOrRoomPending(): Pending {
  const fan = (cc: Ctx) => { cc.s.fixed = "fan"; once(cc, "fix", "fan_ok"); cc.say("fix_tomorrow"); };
  const move = (cc: Ctx) => { cc.s.fixed = "move"; cc.s.room = "518"; once(cc, "fix", "move_ok"); cc.say("new_key"); cc.event("give", { item: "key card" }); };
  return {
    id: "fan_or_room", expects: ["ch_fan", "ch_move"], hints: ["choice"],
    suggest: [{ lt: "Choose a fan or another room", hint: "choice" }],
    on: { ch_fan: fan, ch_move: move },
    yes: fan, no: move,
    ask: (cc) => cc.say("fan_or_room"),
  };
}

function quietPending(): Pending {
  return {
    id: "quiet", hints: ["g_yesno", "choice"], suggest: [{ lt: "Choose whether to move or stay", hint: "g_yesno" }],
    on: { ch_move: (cc) => { cc.s.fixed = "move"; cc.s.room = "518"; cc.say("move_ok"); cc.say("new_key"); } },
    yes: (cc) => { cc.s.fixed = "move"; cc.s.room = "518"; cc.say("move_ok"); cc.say("new_key"); cc.event("give", { item: "key card" }); },
    no: (cc) => { cc.s.fixed = "stay"; cc.say("earplugs"); },
    ask: (cc) => cc.say("quiet_offer"),
  };
}

/** Room not ready (twist): first the bags question, then "regreso a las tres" / "ya volví". Agreeing to wait never releases the keys. */
function seeYouLater(c: Ctx) { c.say(c.s.toldLater ? "return_reminder" : "see_you_later"); c.s.toldLater = true; c.expect(roomReturnPending()); }
function roomReturnPending(): Pending {
  return {
    id: "room_return", expects: ["return_ready_ctx", "wait_room_ctx"], hints: ["room_return", "ask"],
    suggest: [{ lt: "Return at three and ask if the room is ready", hint: "room_return" }, { lt: "Ask to leave your luggage", hint: "ask" }],
    on: { return_ready_ctx: (cc) => { cc.s.returned = true; cc.say("room_ready"); }, wait_room_ctx: (cc) => { seeYouLater(cc); } },
    yes: (cc) => { if (!cc.s.bagsAsked) { cc.s.bagsAsked = true; cc.s.bagsKept = true; cc.say("luggage_ok"); cc.expect(roomReturnPending()); return; } seeYouLater(cc); },
    no: (cc) => { if (!cc.s.bagsAsked) { cc.s.bagsAsked = true; cc.say("no_problem"); cc.expect(roomReturnPending()); return; } seeYouLater(cc); },
    ask: (cc) => cc.say(cc.s.bagsAsked ? "return_reminder" : "bags_offer"),
  };
}

const HT_AUTO: Record<string, string> = {
  arrive: "Tengo una reservación", name: "Miller", spell: "eme i ele ele e erre", found: "Sí, correcto",
  nights: "Tres noches", walk_nights: "Dos noches", walk_offer: "Me quedo con esa habitación",
  id: "Aquí tiene mi pasaporte", card: "Aquí tiene mi tarjeta", sign: "Listo", keys: "Una",
  anything: "Eso es todo", late: "Hasta el mediodía", view: "Sí, por favor", taxi_time: "Al mediodía",
  p_report: "El aire acondicionado no funciona", fan_or_room: "Un ventilador está bien", quiet: "Sí, por favor",
  room_return: "Ya volví, ¿está lista mi habitación?",
};
const omit = (keys: string[]) => Object.fromEntries(Object.entries(HT_AUTO).filter(([k]) => !keys.includes(k)));

export const hotel: SituationDef = {
  id: "s68-hotel", song: 68, songTitle: "Late Check-Out",
  title: { en: "¿Puedo salir más tarde?", lt: "Can I check out later?" },
  topic: { en: "En el hotel", lt: "At the hotel" },
  chapter: 1, order: 4, location: "hotel", npc: "olivia",
  goal: "Check in, confirm your reservation, and arrange a deposit. Find out about breakfast, Wi-Fi, and a late checkout.",
  intro: "You're at the reception desk of Hotel Mar Azul, near the beach in Puerto Colibrí. Fernanda can help with your reservation or offer a room if you haven't booked. All prices and deposits are in Mexican pesos.",

  grammar: {
    macros: {
      res: "(una reservacion | una reserva | un cuarto reservado | una habitacion reservada)",
      room: "(habitacion | cuarto)",
      checkout: "(salida | check out | checkout)",
      wifi: "(wifi | wi fi | internet)",
      ac: "(aire acondicionado | aire | clima | acondicionador de aire)",
      request: "(quisiera | me gustaria | necesito | quiero)",
      staff: "(puede | podria | me puede | me podria | puedes #tip:tu_staff | me puedes #tip:tu_staff)",
    },
    slots: {
      nights: { pattern: ["una noche #n:1", "{number} noches", "[solo] esta noche #n:1", "el fin de semana #n:2", "una semana #n:7", "un par de noches #n:2"] },
    },
  },
  intents: {
    checkin: { patterns: [
      "(tengo | tenemos | hice | hicimos) @res [a nombre de {name}] [por {nights}] #h:ci_res",
      "tengo @res a nombre de {name} #h:ci_under", "tengo @res por {nights} #h:ci_nights",
      "quisiera (registrarme | hacer el check in) #h:ci_like", "me gustaria registrarme #h:ci_gustaria", "(me gustaria | necesito) hacer (el check in | el registro)",
      "vengo a (registrarme | hacer el check in) #h:ci_vengo", "(quiero | queremos) (registrarme | registrarnos | hacer el check in) #h:ci_quiero",
      "(reserve | reservamos) (un cuarto | una habitacion) [por {nights}] #h:ci_booked",
      "[la] (reservacion | reserva) esta a nombre de {name} #h:ci_named",
      "tengo (un cuarto | una habitacion) (reservado | reservada) #h:ci_room",
      "(reserve | hice la reservacion) (por internet | en su pagina | con una agencia)",
      "mi (esposo | esposa | pareja | empresa) hizo la reservacion", "[me llamo {name}] tengo @res #h:ci_res",
    ] },
    walkin: { patterns: [
      "(tiene | tienen | hay) (habitaciones | cuartos) (disponibles | libres) [para {nights}] #h:ci_walkin",
      "no tengo [una] (reservacion | reserva) #h:wk_none", "necesito (una habitacion | un cuarto) [por {nights}] #h:wk_need",
      "(tiene | tienen | hay) (una habitacion | un cuarto) [disponible | libre] [para (hoy | esta noche)]",
      "@request (una habitacion | un cuarto) [por {nights}]", "tienes habitaciones disponibles #tip:tu_staff",
      "[quisiera | necesito | busco] (una habitacion | un cuarto) para (una persona | dos personas | {number} personas)", "no reserve", "busco (una habitacion | un cuarto)",
    ] },
    nights_ctx: { patterns: ["[por | para | solo] {nights} #h:nt_short", "(me quedo | nos quedamos | voy a quedarme) {nights}", "{number}", "[son] {nights}"] },
    name_ctx: { patterns: ["[es | mi apellido es | el apellido es | a nombre de | esta a nombre de] {name} #h:nm_its", "(me llamo | me apellido | mi nombre es | soy) {name}", "{name} {letters}"] },
    letters_ctx: { patterns: ["[se escribe | es] {letters} #h:sp_its", "{name} {letters}", "{letters} {name}"] },
    nights_fix: { patterns: ["[no] (reserve | eran | son | necesito) {nights} [no tres noches] #h:nt_fix", "no tres [noches] sino {nights}", "no (son | eran) tres [noches] [son | sino] ({nights} | {number})", "(son | eran) {nights} no tres [noches]"] },
    hand_over: { patterns: [
      "aqui tiene #h:idc_here", "aqui esta", "tenga", "tome", "aqui lo tiene",
      "aqui tiene mi (pasaporte | identificacion) #document #h:idc_passport", "(aqui esta | tome | tenga) (mi | el) (pasaporte | identificacion) #document", "(le doy | le entrego) mi pasaporte #document",
      "aqui tiene mi tarjeta [de credito | de debito] #card #h:idc_card", "(aqui esta | tome | tenga) mi tarjeta [de credito | de debito] #card", "(le doy | le entrego) mi tarjeta #card",
      "aqui tiene (mi pasaporte | mi identificacion) y mi tarjeta [de credito] #both",
      "aqui (tiene | esta) el deposito en efectivo #cash", "dejo el deposito en efectivo #cash",
      "puedo mostrarle mi pasaporte #document",
    ] },
    id_q: { patterns: ["(le sirve | sirve | esta bien) (mi | el) pasaporte #h:idc_ok", "puedo usar mi pasaporte", "(necesita | quiere | ocupa) [ver] mi pasaporte", "solo tengo mi pasaporte"] },
    incidentals_q: { patterns: ["para que es el deposito #h:idc_what", "para que (es | sirve | necesita | necesitan) (la tarjeta | mi tarjeta | el deposito | la garantia)", "que son los (extras | gastos adicionales)", "por que (necesita | necesitan) (mi tarjeta | una tarjeta | un deposito)", "cuanto es el deposito", "cuanto (retienen | bloquean | van a retener)", "(me van a | van a) cobrar [algo] [en la tarjeta]", "que es (la preautorizacion | el deposito | el voucher | la garantia)"] },
    cash_q: { patterns: ["puedo pagar en efectivo #h:idc_cash", "(puedo | se puede) dejar (el deposito | la garantia) en efectivo", "(puedo | se puede) dejar efectivo", "prefiero (pagar | dejar el deposito) en efectivo", "no (tengo | traigo) tarjeta [de credito]", "(aceptan | toman) efectivo"] },
    debit_q: { patterns: ["aceptan tarjeta de debito #h:idc_debit", "puedo usar (mi | una) tarjeta de debito", "solo tengo [tarjeta de] debito"] },
    sign_where: { patterns: ["donde firmo #h:sg_where", "(donde | en donde) (tengo que | debo | hay que) firmar", "en donde firmo", "firmo aqui", "(aqui | aca) (debo | tengo que) firmar"] },
    sign_ok_ctx: { patterns: ["(listo | ya firme | de acuerdo | ya esta | firmado) #h:sg_sure", "(listo | ya esta) ya firme", "ya (lo | la) firme", "ahi esta"] },
    // "¿Aquí?" / "¿Dónde?" while she points at the form (only at the signing step)
    sign_here_ctx: { patterns: ["(aqui | aca) [abajo]", "donde [exactamente]", "en donde"] },
    keys_ctx: { patterns: ["[solo | solamente | nomas] (una | una tarjeta | una llave) [sola] #h:k_one", "(dos | dos tarjetas | dos llaves) #h:k_two", "{number} (tarjetas | llaves)", "una para mi y otra para mi (esposa | esposo | pareja | amigo | amiga) #h:k_two", "con una (esta bien | es suficiente | basta)", "no necesito dos [tarjetas | llaves] [con | solo] una [esta bien | es suficiente]"] },
    ask_breakfast: { patterns: ["el desayuno esta incluido #h:q_breakfast", "esta incluido el desayuno", "incluye [el] desayuno", "(el precio | la tarifa | la habitacion | el cuarto) incluye [el] desayuno", "(viene | va) con desayuno", "el desayuno (viene | va) incluido", "(tienen | hay) desayuno", "el desayuno es gratis"] },
    ask_breakfast_time: { patterns: ["a que hora es el desayuno #h:q_breakfast_time", "(a que hora | donde) (sirven | dan | es) el desayuno", "hasta que hora (hay | sirven | dan | es) [el] desayuno", "(cual es el | que) horario (del | de) desayuno", "de que hora a que hora es el desayuno"] },
    ask_wifi: { patterns: ["cual es la (contrasena | clave) del @wifi #h:q_wifi", "(tienen | hay) @wifi [gratis]", "el @wifi es gratis", "@staff dar la clave del @wifi", "(cual es | me da) la (clave | contrasena) [del @wifi]", "como me conecto al @wifi"] },
    ask_checkout: { patterns: ["a que hora (es la @checkout | debo salir | tengo que salir | tengo que dejar la habitacion) #h:q_checkout", "cual es la hora de @checkout", "a que hora (tengo que | hay que | debo) (dejar | entregar) (la habitacion | el cuarto)", "hasta que hora (puedo quedarme | me puedo quedar)"] },
    ask_late: { patterns: [
      "puedo (dejar la habitacion | salir | hacer el check out) mas tarde #h:q_late",
      "puedo quedarme hasta {time} #h:q_until", "puedo (salir | dejar la habitacion | entregar la habitacion | hacer el check out) a {time}",
      "puedo quedarme (mas tiempo | un poco mas | mas tarde)", "(se puede | es posible) (salir | quedarse | quedarme) mas tarde",
      "@request (una salida tardia | un late check out | un late checkout | salir mas tarde)", "es posible (salir mas tarde | un late check out)",
      "(tienen | hay | ofrecen) (late check out | late checkout | salida tardia)",
    ] },
    // "No quiero pagar…" alone is too_expensive_ctx (only where a price is on the table); here noon is said outright
    late_noon: { patterns: ["[hasta el | hasta | al | a] mediodia [esta bien] #h:lt_noon", "(hasta | a) las doce [esta bien] #h:lt_noon", "(mejor | prefiero) ([hasta el | al | el] mediodia | [hasta | a] las doce)",
      "(no quiero pagar [eso | tanto | mas | extra | quinientos pesos] | es mucho | es muy caro) [mejor] (al mediodia | a las doce | hasta el mediodia | hasta las doce)",
      "(a | hasta) las dos no [mejor] (al mediodia | a las doce | hasta el mediodia | hasta las doce)"] },
    late_two: { patterns: ["[hasta | a] las dos [de la tarde] #h:lt_two", "quinientos pesos esta bien #h:lt_fine", "[si] pago los quinientos [pesos]", "[si] (a | hasta) las dos esta bien"] },
    take_it: { patterns: ["me quedo con esa habitacion #h:wk_take", "(la tomo | me la quedo | quiero esa habitacion | me quedo con (ella | esa | ese cuarto))", "[si] acepto la habitacion", "[si] me interesa", "(esta bien | perfecto | de acuerdo | muy bien) me la quedo"] },
    ask_included: { patterns: ["que (incluye | esta incluido) [en el precio] #h:q_included", "que incluye el precio #h:q_included", "que incluye la tarifa"] },
    ask_luggage: { patterns: ["puedo dejar (mis maletas | mi equipaje) aqui [despues de (salir | la @checkout)] #h:q_luggage", "[me | nos] (guardan | guarda | pueden guardar | puede guardar) (las maletas | mis maletas | el equipaje | mi equipaje)", "(guardeme | guardenme) (las maletas | mis maletas | el equipaje)", "tienen resguardo de equipaje"] },
    ask_taxi: { patterns: ["@staff (llamar | pedir) [me] un taxi #h:q_taxi", "me llama un taxi", "necesito un taxi", "me puedes pedir un taxi #tip:tu_staff"] },
    taxi_time_ctx: { patterns: ["[a] {time} #h:tt_at", "manana [a {time}] #h:tt_tomorrow", "[manana] al mediodia #h:tt_noon", "ahorita #now #h:tt_now", "ahora #now #h:tt_now", "en este momento #now", "en {number} minutos", "manana (temprano | en la manana | por la manana)", "(ahora | ahorita) mismo #now", "lo (antes | mas pronto) posible #now", "en (media hora | una hora)"] },
    ask_towels: { patterns: ["@staff (traer | mandar | dar) [me] (mas | unas) toallas #h:q_towels", "(me da | me trae) (mas | unas | otras) toallas", "quisiera toallas extra"] },
    ask_pillow: { patterns: ["@staff (traer | mandar | dar) [me] (otra almohada | una cobija | una manta | otra cobija)", "(me da | me trae) (otra almohada | una cobija | una manta | otra cobija)", "necesito (otra almohada | una cobija | una manta)"] },
    ask_elevator: { patterns: ["donde esta el (elevador | ascensor) #h:q_elevator", "hay (elevador | ascensor)"] },
    ask_gym: { patterns: ["(hay | tienen) gimnasio", "donde esta el gimnasio"] },
    ask_pool: { patterns: ["(hay | tienen | donde esta) [la | una] (alberca | piscina)"] },
    ask_parking: { patterns: ["tienen estacionamiento #h:q_parking", "(hay | cuanto cuesta) el estacionamiento", "donde puedo (estacionar | aparcar) [el carro]", "el estacionamiento es gratis"] },
    ask_view: { patterns: ["puedo tener una habitacion con vista al mar", "(tiene | tienen | hay) (una habitacion | habitacion | un cuarto) con vista al mar #h:q_view", "quisiera una habitacion con vista al mar"] },
    ask_quiet: { patterns: ["quisiera una habitacion tranquila", "la habitacion es tranquila", "tienen un cuarto silencioso"] },
    ask_twobeds: { patterns: ["(quisiera | necesito | necesitamos) (dos camas | una habitacion doble | un cuarto con dos camas)", "(tienen | hay) una habitacion con dos camas"] },
    ask_nonsmoking: { patterns: ["la habitacion es para no fumadores", "puedo fumar en la habitacion", "quiero un cuarto para no fumadores"] },
    ask_restaurant: { patterns: ["me recomienda (un | algun) restaurante [cerca]", "que restaurante me recomienda", "(hay | conoce) (un | algun) [buen] restaurante (cerca | por aqui)", "donde puedo (cenar | comer) [cerca | por aqui]", "hay restaurante [en el hotel]"] },
    ask_roomservice: { patterns: ["tienen servicio (a la habitacion | al cuarto)", "hay servicio a cuartos"] },
    ask_wakeup: { patterns: ["@staff despertarme [a {time}]", "quisiera una llamada para despertarme [a {time}]"] },
    ask_room: { patterns: ["cual es (mi | el) numero de (habitacion | cuarto)", "cual es el numero de mi (habitacion | cuarto)", "en que piso (esta | queda) mi (habitacion | cuarto)", "en que piso (estoy | esta)", "que (habitacion | cuarto) me toca", "cual es mi (habitacion | cuarto)"] },
    ask_checkin_time: { patterns: ["a que hora (es el check in | puedo entrar | puedo registrarme)", "puedo entrar ahora", "mi habitacion [ya] esta lista"] },
    done: { patterns: ["[no] (eso es todo | es todo) #h:dn_all", "no necesito nada mas #h:dn_good", "no tengo (mas | otras) preguntas", "[no] nada mas", "ya con eso", "(eso | esto) seria todo", "seria todo", "por ahora (es todo | nada mas)", "(es | eso es) todo por ahora", "(asi | ya) estoy bien"] },
    pr_ac: { patterns: ["[el | mi] @ac [de mi habitacion | del cuarto] (no funciona | no sirve | no enfria | no prende | esta descompuesto) #h:pr_ac", "no (funciona | sirve | enfria | prende) [el] @ac", "hace mucho calor en (mi | la) (habitacion | cuarto)", "(mi | la) (habitacion | cuarto) esta muy caliente"] },
    pr_hotwater: { patterns: ["no hay agua caliente [en mi habitacion | en la (regadera | ducha)] #h:pr_hotwater", "no (tengo | sale) agua caliente", "la (regadera | ducha) no (funciona | sirve | calienta)", "el agua (sale | esta) (fria | helada)"] },
    pr_key: { patterns: ["(mi | la) (tarjeta | llave) no (funciona | abre | sirve) [la puerta] #h:pr_key", "no puedo (abrir | entrar a) (mi | la) (habitacion | cuarto | puerta)", "no puedo abrir la puerta [de mi (habitacion | cuarto)]"] },
    pr_noisy: { patterns: ["mi habitacion es muy ruidosa #h:pr_noisy", "(mi | la) (habitacion | cuarto) es (muy | demasiado) ruidosa", "hay mucho ruido [en (mi | la) (habitacion | cuarto) | afuera | en la noche]", "no puedo dormir por el ruido", "(los vecinos | la musica | la calle) (hacen | hace) mucho ruido"] },
    pr_wifi: { patterns: ["[el] @wifi no (funciona | sirve | conecta) [en mi habitacion] #h:pr_wifi", "no (puedo conectarme | me puedo conectar) al @wifi", "no (hay | tengo) @wifi en mi (habitacion | cuarto)", "no (hay | tengo) internet"] },
    pr_tv: { patterns: ["la (tele | television) no (funciona | prende | enciende | sirve)", "no (funciona | prende | sirve) la (tele | television)", "la (tele | television) esta descompuesta"] },
    pr_towels: { patterns: ["necesito [unas | mas] toallas #h:pr_towels", "no hay toallas [en mi habitacion]"] },
    too_expensive_ctx: { patterns: ["(esta | es) (demasiado | muy) caro #h:wk_expensive", "(esta | es) (un poco | algo | bastante) caro", "es (mucho | demasiado) [dinero] [para mi]", "no puedo pagar tanto", "no quiero pagar (tanto | mas | extra | quinientos pesos | eso)", "se sale de mi presupuesto", "no me alcanza"] },
    price_ok_ctx: { patterns: ["no (esta | es) (demasiado | muy) caro"] },
    cheaper_ctx: { patterns: ["(tiene | tienen | hay) algo mas barato #h:wk_cheaper", "(tiene | tienen | hay) (una | una habitacion | un cuarto | otra) mas (barata | economica)", "no (tiene | tienen | hay) algo mas (barato | economico)", "algo mas economico"] },
    walk_leave_ctx: { patterns: ["lo voy a pensar #h:wk_think", "voy a buscar otro hotel", "regreso mas tarde", "no me interesa", "(dejeme | deje) pensarlo"] },
    pr_vague_ctx: { patterns: ["tengo un problema con mi habitacion", "hay un problema con mi cuarto"] },
    room_no: { patterns: ["[estoy en] la habitacion {number}", "mi habitacion es la {number}", "estoy en el cuarto {number}"] },
    p_fine: { patterns: ["todo esta muy bien #h:pf_fine", "todo (esta)? (bien | perfecto | excelente | muy bien)", "(la habitacion | el cuarto) esta (muy bien | perfecta | bien)", "no hay (ningun)? problema con (mi | la) (habitacion | cuarto)", "no hay ningun problema", "mi tarjeta funciona bien"] },
    ch_fan: { patterns: ["un ventilador esta bien #h:ch_fan", "(el | un) ventilador [esta bien | por ahora | para esta noche]", "(prefiero | quiero | quisiera) (el | un) ventilador [por ahora]", "con (un | el) ventilador (basta | esta bien | es suficiente)", "no (quiero | necesito) (cambiar | cambiarme) de (habitacion | cuarto) (un | el) ventilador (esta bien | basta)"] },
    ch_move: { patterns: ["quisiera cambiar de habitacion #h:ch_move", "(puedo | me puede | podria) (cambiar | cambiarme) de (habitacion | cuarto)", "(prefiero | quiero | quisiera) (otra habitacion | otro cuarto | cambiar de habitacion | cambiar de cuarto)", "otra habitacion [diferente]", "otro cuarto", "cambieme de (habitacion | cuarto)", "no quiero (un | el) ventilador [prefiero (otra habitacion | otro cuarto)]"] },
    return_ready_ctx: { patterns: ["[ya volvi] esta lista mi habitacion #h:rr_ready", "ya (volvi | regrese) #h:rr_back", "ya esta lista mi (habitacion | cuarto)", "ya estoy (aqui | de vuelta | de regreso)", "son las tres ya esta lista mi habitacion"] },
    wait_room_ctx: { patterns: ["(regreso | vuelvo | regresare | volvere) a las tres #h:rr_later", "[esta bien | de acuerdo] (regreso | vuelvo) (mas tarde | luego | al rato)"] },
    ask_tax: { patterns: ["que es el impuesto de hospedaje #h:q_tax", "(cuanto | cual) es el impuesto [de hospedaje]", "el impuesto (esta | va) incluido", "hay que pagar impuestos", "que impuestos (hay | cobran)"] },
    decline_deposit: { patterns: ["no quiero (dejar el deposito | dar mi tarjeta)", "no voy a dejar un deposito"] },
  },

  lines: {
    greet: [
      t("¡Buenas tardes! | ¡{m:Bienvenido|f:Bienvenida} | al | Hotel | Mar Azul! | ¿Tiene | reservación?", "Good afternoon! | Welcome | to the | Hotel | Blue Sea! | Do you have | a reservation?", "Good afternoon! Welcome to Hotel Mar Azul! Do you have a reservation?"),
      t("¡Hola! | ¿En | qué | le | puedo | ayudar?", "Hi! | In | what | (to) you | can I | help?", "Hi! How can I help you?"),
      t("¡Buenas tardes! | ¿Viene | a | registrarse?", "Good afternoon! | Are you here | to | check in?", "Good afternoon! Are you checking in?"),
    ],
    ask_help: [t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "How can I help you?")],
    ack: [t("Perfecto.", "Perfect.", "Perfect."), t("Muy | bien.", "Very | good.", "Okay."), t("Claro.", "Sure.", "Sure.")],
    no_problem: [t("Sin problema.", "No problem.", "No problem.")],
    thank_you: [t("Gracias.", "Thank you.", "Thank you."), t("Muy | bien, | gracias.", "Very | good, | thanks.", "Great, thank you.")],
    ask_name: [
      t("¿A nombre de | quién | está | la | reservación?", "Under the name of | whom | is | the | reservation?", "What name is the reservation under?"),
      t("¿Me | da | su | apellido, | por favor?", "(To) me | you-give | your | last name, | please?", "Could I have your last name, please?", { flags: { 2: "su: your, addressing the guest with usted." } }),
    ],
    ask_name_walkin: [t("¿Me | da | su | apellido | para | el | registro?", "(To) me | you-give | your | last name | for | the | registration?", "Could I have your last name for the registration?")],
    ask_spell: [t("¿Me | puede | deletrear | su | apellido?", "(To) me | can you | spell | your | last name?", "Could you spell your last name?"), t("¿Cómo | se escribe | su | apellido?", "How | is spelled | your | last name?", "How do you spell your last name?")],
    spelled_ok: [t("Gracias, | ya | lo | anoté.", "Thanks, | already | it | I-wrote-down.", "Thanks, I have it."), t("Perfecto, | gracias.", "Perfect, | thanks.", "Great, thank you.")],
    found_full: [t("Aquí | está | su | reservación: | una | habitación | con | cama | matrimonial | por | tres | noches. | ¿Es | correcto?", "Here | is | your | reservation: | a | room | with | bed | double | for | three | nights. | Is that | correct?", "Here's your reservation: a room with a double bed for three nights. Is that right?")],
    found_short: [t("Ya | encontré | su | reservación. | Tiene | una | habitación | con | cama | matrimonial.", "Already | I-found | your | reservation. | You have | a | room | with | bed | double.", "I found your reservation. You have a room with a double bed.")],
    ask_nights: [t("¿Cuántas | noches?", "How many | nights?", "How many nights?")],
    nights_fixed: [t("Claro, | ya | lo | corregí.", "Sure, | already | it | I-corrected.", "Sure, I've fixed that.")],
    walkin_check: [t("Déjeme | revisar. | Sí, | tenemos | habitaciones | disponibles.", "Let me | check. | Yes, | we have | rooms | available.", "Let me check. Yes, we have rooms available.")],
    walkin_nights: [t("¿Por | cuántas | noches | se queda?", "For | how many | nights | are you staying?", "How many nights are you staying?")],
    walkin_offer: [t("La | habitación | con | cama | matrimonial | cuesta | {$price} | por | noche, | más | el | impuesto | de | hospedaje. | ¿Le interesa?", "The | room | with | bed | double | costs | {$price} | per | night, | plus | the | tax | on | lodging. | Are you interested?", "A room with a double bed is {$price} a night, plus lodging tax. Would you like it?")],
    walkin_twobeds: [t("También | tenemos | una | habitación | doble, | con | dos | camas, | por | {$price} | la | noche, | más | el | impuesto | de | hospedaje.", "Also | we have | a | room | double, | with | two | beds, | for | {$price} | the | night, | plus | the | tax | on | lodging.", "We also have a room with two beds for {$price} a night, plus lodging tax.")],
    walkin_sorry: [t("Claro, | piénselo | con | calma. | Aquí | estamos | si | se decide.", "Sure, | think it over | with | calm. | Here | we are | if | you decide.", "Of course, take your time. We'll be here if you decide to stay.")],
    walkin_great: [t("Perfecto, | vamos | a | hacer | su | registro.", "Perfect, | we're going | to | do | your | registration.", "Great, let's get you checked in."), t("Muy | bien.", "Very | good.", "Great.")],
    walkin_cheaper: [t("Tengo | una | habitación | sencilla, | más | pequeña, | por | {$price} | la | noche, | más | el | impuesto | de | hospedaje.", "I have | a | room | single, | more | small, | for | {$price} | the | night, | plus | the | tax | on | lodging.", "I have a smaller single room for {$price} a night, plus lodging tax.")],
    walkin_cheapest: [t("Esa | es | nuestra | habitación | más | económica.", "That | is | our | room | most | affordable.", "That's our least expensive room.")],
    ask_id: [t("¿Me | presta | su | pasaporte, | por favor?", "(To) me | you-lend | your | passport, | please?", "May I see your passport, please?", { flags: { 1: "¿Me presta…?: a polite request to see it briefly; the hotel returns it." } }), t("¿Me | permite | una | identificación | con | foto?", "(To) me | you-allow | an | identification | with | photo?", "Could I see a photo ID?")],
    passport_fine: [t("Sí, | su | pasaporte | está bien. | Se lo | devuelvo | enseguida.", "Yes, | your | passport | is fine. | It to you | I'll-return | right away.", "Yes, your passport is fine. I'll give it right back.")],
    ask_cash_deposit: [t("¿Me | entrega | el | depósito | de | {$price}, | por favor?", "(To) me | you-hand-over | the | deposit | of | {$price}, | please?", "Could you hand me the deposit of {$price}, please?")],
    ask_debit: [t("¿Me | permite | su | tarjeta | de | débito?", "(To) me | you-allow | your | card | of | debit?", "May I have your debit card?")],
    ask_card: [t("Necesitamos | una | tarjeta | de | crédito | o | un | depósito | en efectivo | como | garantía.", "We need | a | card | of | credit | or | a | deposit | in cash | as | security.", "We need a credit card or cash deposit as security."), t("¿Me | permite | su | tarjeta | para | la | garantía?", "(To) me | you-allow | your | card | for | the | security?", "May I have your card for the security deposit?")],
    incidentals: [t("Es | una | garantía | para | consumos | o | daños. | Hacemos | una | preautorización, | no | un | cobro.", "It's | a | security deposit | for | purchases | or | damage. | We make | a | preauthorization, | not | a | charge.", "It covers incidental purchases or damage. We place a hold; it isn't a charge.")],
    hold: [t("Retenemos | {$price} | en | su | tarjeta | durante | su | estancia.", "We hold | {$price} | on | your | card | during | your | stay.", "We place a hold of {$price} on your card for your stay.")],
    hold_back: [t("Al | salir, | cancelamos | la | retención | si | no hay | cargos. | Su | banco | puede | tardar | unos | días | en | liberarla.", "Upon | leaving, | we cancel | the | hold | if | there are no | charges. | Your | bank | may | take | some | days | to | release it.", "We release the hold at checkout if there are no charges. Your bank may take a few days to make the funds available.")],
    prepaid: [t("Su | tarifa | de | habitación | ya | está | pagada; | falta | el | impuesto | de | hospedaje.", "Your | rate | for | room | already | is | paid; | remains | the | tax | on | lodging.", "Your room rate is prepaid; the lodging tax is still due.")],
    cash_deposit: [t("Sí. | Puede | dejar | un | depósito | de | {$price} | en efectivo. | Se lo | devolvemos | al | salir | si | no hay | cargos.", "Yes. | You can | leave | a | deposit | of | {$price} | in cash. | It to you | we-return | upon | leaving | if | there are no | charges.", "Yes, you can leave a cash deposit of {$price}. We'll return it at checkout if there are no charges.")],
    debit_ok: [t("Sí. | Con | débito, | el | depósito | se cobra | y | se lo | devolvemos | al | salir.", "Yes. | With | debit, | the | deposit | is charged | and | it to you | we-return | upon | leaving.", "Yes. With a debit card, we charge the deposit and refund it when you check out.")],
    deposit_required: [t("Entiendo. | Para | entregar | la | habitación | necesitamos | una | garantía: | tarjeta | o | depósito | en efectivo.", "I understand. | To | hand over | the | room | we need | a | security deposit: | card | or | deposit | in cash.", "I understand. We need a card or cash deposit before we can give you the room.")],
    lodging_tax: [t("El | impuesto | de | hospedaje | no está | incluido; | se suma | a | su | cuenta.", "The | tax | on | lodging | isn't | included; | it's added | to | your | bill.", "The lodging tax isn't included; it's added to your bill.")],
    tax_info: [t("Es | un | impuesto | del | estado | sobre | el | hospedaje. | No está | incluido | en | la | tarifa; | se suma | a | su | cuenta, | por separado.", "It's | a | tax | of the | state | on | the | lodging. | It isn't | included | in | the | rate; | it's added | to | your | bill, | separately.", "It's a state tax on hotel stays. It isn't included in the rate; it's added to your bill separately.")],
    ask_sign: [t("Firme | aquí | en | la | hoja | de | registro, | por favor.", "Sign | here | on | the | sheet | of | registration, | please.", "Please sign the registration form here."), t("¿Puede | firmar | aquí, | por favor?", "Can you | sign | here, | please?", "Could you sign here, please?")],
    sign_where: [t("Aquí, | abajo, | donde | dice | firma.", "Here, | at the bottom, | where | it says | signature.", "Here at the bottom, where it says signature.")],
    ask_keys: [t("¿Cuántas | llaves | necesita? | ¿Una | o | dos?", "How many | keys | do you need? | One | or | two?", "How many keys would you like? One or two?")],
    upgrade: [t("Tenemos | una | habitación | con | vista | al | mar | para | usted, | sin | costo | adicional.", "We have | a | room | with | view | of the | sea | for | you, | without | cost | additional.", "We've upgraded you to an ocean-view room at no extra charge.")],
    room_412: [t("Su | habitación | es | la | 412, | en | el | cuarto | piso.", "Your | room | is | — | 412, | on | the | fourth | floor.", "You're in room 412, on the fourth floor.", { flags: { 3: "la stands for la habitación before its number; English says room plus the number." }, say: "Su habitación es la cuatrocientos doce, en el cuarto piso." })],
    room_518: [t("Su | habitación | es | la | 518, | en | el | quinto | piso.", "Your | room | is | — | 518, | on | the | fifth | floor.", "You're in room 518, on the fifth floor.", { flags: { 3: "la stands for la habitación before its number; English says room plus the number." }, say: "Su habitación es la quinientos dieciocho, en el quinto piso." })],
    room_207: [t("Su | habitación | es | la | 207, | en | el | segundo | piso.", "Your | room | is | — | 207, | on | the | second | floor.", "You're in room 207, on the second floor.", { flags: { 3: "la stands for la habitación before its number; English says room plus the number." }, say: "Su habitación es la doscientos siete, en el segundo piso." })],
    room_305: [t("Su | habitación | es | la | 305, | en | el | tercer | piso.", "Your | room | is | — | 305, | on | the | third | floor.", "You're in room 305, on the third floor.", { flags: { 3: "la stands for la habitación before its number; English says room plus the number." }, say: "Su habitación es la trescientos cinco, en el tercer piso." })],
    keys_here: [t("Aquí | tiene | sus | llaves.", "Here | you have | your | keys.", "Here are your keys."), t("Aquí | tiene | su | llave.", "Here | you have | your | key.", "Here's your key.")],
    elevators: [t("El | elevador | está | a la izquierda.", "The | elevator | is | on the left.", "The elevator is on your left.")],
    breakfast_incl: [t("Sí, | el | desayuno | está | incluido.", "Yes, | the | breakfast | is | included.", "Yes, breakfast is included.")],
    breakfast_time: [t("Servimos | el | desayuno | de | 7 | a | 10:30, | en | la | terraza.", "We serve | the | breakfast | from | 7 | to | 10:30, | on | the | terrace.", "Breakfast is from 7 to 10:30 a.m. on the terrace.", { say: "Servimos el desayuno de siete a diez y media, en la terraza." })],
    breakfast_volunteer: [t("El | desayuno | está | incluido, | de | 7 | a | 10:30 | en | la | terraza.", "The | breakfast | is | included, | from | 7 | to | 10:30 | on | the | terrace.", "Breakfast is included, from 7 to 10:30 a.m. on the terrace.", { say: "El desayuno está incluido, de siete a diez y media en la terraza." })],
    also_breakfast: [t("Y | recuerde: | el | desayuno | está | incluido, | de | 7 | a | 10:30.", "And | remember: | the | breakfast | is | included, | from | 7 | to | 10:30.", "And remember, breakfast is included, from 7 to 10:30 a.m.", { say: "Y recuerde: el desayuno está incluido, de siete a diez y media." })],
    wifi: [t("El | wifi | es | gratis. | La | red | es | MarAzul | y | la | contraseña | es | brisamar, | todo | en | minúsculas.", "The | Wi-Fi | is | free. | The | network | is | MarAzul | and | the | password | is | brisamar, | all | in | lowercase.", "Wi-Fi is free. The network is MarAzul and the password is brisamar, all lowercase.", { spell: "brisamar", write: "Wi-Fi: MarAzul · contraseña: brisamar" })],
    included: [t("Incluye | desayuno | y | wifi. | El | estacionamiento | cuesta | {$price} | por | noche.", "It includes | breakfast | and | Wi-Fi. | The | parking | costs | {$price} | per | night.", "Breakfast and Wi-Fi are included. Parking is {$price} a night.")],
    checkout_time: [t("La | salida | es | a | {$time}.", "The | checkout | is | at | {$time}.", "Checkout is at {$time}.")],
    checkout_noon: [t("Su | salida | es | al | mediodía.", "Your | checkout | is | at | noon.", "Your checkout is at noon.")],
    checkout_two: [t("Su | salida | es | a | las | dos | de la tarde.", "Your | checkout | is | at | — | two | p.m.", "Your checkout is at 2 p.m.", { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } })],
    late_free: [t("Sí, | puede | quedarse | hasta | el | mediodía | sin | costo.", "Yes, | you can | stay | until | — | noon | without | charge.", "Yes, you can stay until noon at no extra charge.", { flags: { 4: "Spanish uses el before mediodía here; English says noon without an article." } })],
    late_offer: [t("Hoy | sí | hay | disponibilidad. | Puede | salir | al | mediodía | sin | costo, | o | a | las | dos | por | {$price}.", "Today | yes | there is | availability. | You can | leave | at | noon | without | charge, | or | at | — | two | for | {$price}.", "We have availability today. You can check out at noon for free or at 2 p.m. for {$price}.", { flags: { 12: "Spanish uses an article before clock times; English has no separate word." } })],
    late_two_q: [t("Hoy | podemos | darle | hasta | las | dos | por | {$price}. | ¿Le parece | bien?", "Today | we can | give you | until | — | two | for | {$price}. | Does that seem to you | fine?", "We can offer you until 2 p.m. today for {$price}. Is that okay?", { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } })],
    late_limit: [t("Lo siento, | lo | más | tarde | que | podemos | ofrecerle | es | a | las | dos.", "I'm sorry, | the | most | late | that | we can | offer you | is | at | — | two.", "I'm sorry, the latest we can offer is 2 p.m.", { flags: { 9: "Spanish uses an article before clock times; English has no separate word.",  1: "lo makes más tarde a noun phrase: the latest time." } })],
    late_noon_free: [t("Entonces, | al | mediodía, | sin | costo.", "Then, | at | noon, | without | charge.", "Then noon, at no extra charge.")],
    late_noon_ok: [t("Perfecto, | su | salida | queda | al | mediodía.", "Perfect, | your | checkout | is set | at | noon.", "Great, your checkout is set for noon.")],
    late_two_ok: [t("Listo, | su | salida | queda | a | las | dos | de la tarde.", "Done, | your | checkout | is set | at | — | two | p.m.", "All set, your checkout is at 2 p.m.", { flags: { 5: "Spanish uses an article before clock times; English has no separate word." } })],
    luggage_ok: [t("Con gusto. | Guardamos | sus | maletas | aquí | en | recepción.", "Gladly. | We'll keep | your | bags | here | at | reception.", "Of course. We can keep your bags here at the front desk.")],
    taxi_when: [t("Claro. | ¿Para | qué | hora | lo | necesita?", "Sure. | For | what | time | it | do you need?", "Of course. What time do you need it?")],
    taxi_now: [t("Claro, | se lo | pido | enseguida.", "Sure, | it for you | I'll-order | right away.", "Sure, I'll call one for you right away.")],
    taxi_ok: [t("Muy | bien, | se lo | pido | para | esa | hora.", "Very | good, | it for you | I'll-order | for | that | time.", "Great, I'll arrange it for that time.")],
    towels_ok: [t("Claro, | le | llevamos | toallas | a | su | habitación.", "Sure, | (to) you | we'll-bring | towels | to | your | room.", "Of course, we'll bring towels to your room.")],
    pillow_ok: [t("Claro, | se la | llevamos | a | su | habitación.", "Sure, | it for you | we'll-bring | to | your | room.", "Of course, we'll bring it to your room.")],
    elevator: [t("Está | ahí, | a la izquierda.", "It's | there, | on the left.", "It's over there on the left.")],
    gym: [t("Tenemos | un | gimnasio | pequeño | en | el | segundo | piso.", "We have | a | gym | small | on | the | second | floor.", "We have a small gym on the second floor.")],
    pool: [t("La | alberca | está | en | el | patio.", "The | pool | is | in | the | courtyard.", "The pool is in the courtyard.", { flags: { 1: "Mexican: alberca means swimming pool; piscina is more widely used." }, neutral: t("La | piscina | está | en | el | patio.", "The | pool | is | in | the | courtyard.", "The pool is in the courtyard.") })],
    parking: [t("Sí, | tenemos | estacionamiento. | Cuesta | {$price} | por | noche.", "Yes, | we have | parking. | It costs | {$price} | per | night.", "Yes, we have parking. It's {$price} a night.")],
    view_offer: [t("Tengo | una | habitación | con | vista | al | mar | por | {$price} | más | por | noche. | ¿La | quiere?", "I have | a | room | with | view | of the | sea | for | {$price} | more | per | night. | It | do you want?", "I have an ocean-view room for an extra {$price} a night. Would you like it?", { flags: { 12: "la: it, referring to la habitación." } })],
    view_ok: [t("Listo, | ya | hice | el | cambio.", "Done, | already | I-made | the | change.", "All set, I've changed your room.")],
    quiet_ok: [t("Claro, | le | asigno | una | habitación | tranquila | en | el | quinto | piso.", "Sure, | (to) you | I'll-assign | a | room | quiet | on | the | fifth | floor.", "Of course, I'll put you in a quiet room on the fifth floor.")],
    twobeds_ok: [t("Claro, | le | doy | una | habitación | doble, | con | dos | camas.", "Sure, | (to) you | I'll-give | a | room | double, | with | two | beds.", "Of course, I'll give you a room with two beds.")],
    nonsmoking: [t("Todas | nuestras | habitaciones | son | para | no fumadores.", "All | our | rooms | are | for | nonsmokers.", "All our rooms are nonsmoking.")],
    restaurant: [t("Le | recomiendo | el | Restaurante | El Muelle. | Está | a | dos | cuadras.", "(To) you | I-recommend | the | Restaurant | The Pier. | It's | at | two | blocks.", "I recommend Restaurante El Muelle. It's two blocks away.", { write: "Restaurante El Muelle · a dos cuadras", spell: "El Muelle" })],
    roomservice: [t("Sí, | hasta | las | diez | de la noche. | El | menú | está | en | su | habitación.", "Yes, | until | — | ten | p.m. | The | menu | is | in | your | room.", "Yes, until 10 p.m. The menu is in your room.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } })],
    wakeup: [t("Claro, | dejamos | programada | su | llamada.", "Sure, | we'll-leave | scheduled | your | call.", "Of course, we'll schedule your wake-up call.")],
    room_is: [t("Al | terminar | el | registro | le | doy | su | número | de | habitación.", "Upon | finishing | the | registration | (to) you | I'll-give | your | number | of | room.", "I'll give you your room number when we've finished checking you in.")],
    checkin_now: [t("El | registro | es | a partir de | las | tres, | pero | su | habitación | ya | está | lista.", "The | check-in | is | from | — | three, | but | your | room | already | is | ready.", "Check-in starts at 3 p.m., but your room is ready now.", { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } })],
    room_not_ready: [t("Lo siento, | su | habitación | todavía | no está | lista. | Regrese | a | las | tres, | por favor. | ¿Gusta | dejar | sus | maletas | aquí | mientras tanto?", "I'm sorry, | your | room | still | isn't | ready. | Come back | at | — | three, | please. | Would you like | to leave | your | bags | here | in the meantime?", "I'm sorry, your room isn't ready yet. Please come back at 3 p.m. Would you like to leave your bags here in the meantime?", { flags: { 8: "Spanish uses an article before clock times; English has no separate word.", 11: "Mexican and very polite: “¿Gusta…?” = would you like…?" } })],
    bags_offer: [t("¿Gusta | dejar | sus | maletas | aquí | mientras tanto?", "Would you like | to leave | your | bags | here | in the meantime?", "Would you like to leave your bags here in the meantime?", { flags: { 0: "Mexican and very polite: “¿Gusta…?” = would you like…?" } })],
    see_you_later: [t("Perfecto, | aquí | {m:lo|f:la} | esperamos | a | las | tres.", "Great, | here | you | we'll-wait-for | at | — | three.", "Great, we'll see you here at 3 p.m.", { flags: { 2: "lo / la: “you” (usted), lo for a man and la for a woman.", 5: "Spanish uses an article before clock times; English has no separate word." } })],
    return_reminder: [t("Su | habitación | va | a | estar | lista | a | las | tres.", "Your | room | is going | to | be | ready | at | — | three.", "Your room will be ready at 3 p.m.", { flags: { 7: "Spanish uses an article before clock times; English has no separate word." } })],
    room_ready: [t("¡Gracias | por | esperar! | Su | habitación | ya | está | lista.", "Thank you | for | waiting! | Your | room | now | is | ready.", "Thanks for waiting! Your room is ready now.")],
    ask_any: [t("¿Tiene | alguna | pregunta?", "Do you have | any | question?", "Do you have any questions?"), t("¿En | algo | más | le | puedo | ayudar?", "In | anything | else | (to) you | can I | help?", "Is there anything else I can help you with?")],
    ask_any_else: [t("¿Algo | más?", "Anything | else?", "Anything else?"), t("¿Tiene | otra | pregunta?", "Do you have | another | question?", "Do you have another question?")],
    enjoy: [t("¡Que | disfrute | su | estancia!", "May | you enjoy | your | stay!", "Enjoy your stay!"), t("¡Que | tenga | una | bonita | estancia!", "May | you have | a | lovely | stay!", "Have a lovely stay!")],
    you_welcome: [t("¡Con gusto! | ¡Que | disfrute | su | estancia!", "My pleasure! | May | you enjoy | your | stay!", "You're welcome! Enjoy your stay!")],
    p_greet: [t("¡Hola | de nuevo! | ¿Todo | bien | con | su | habitación?", "Hi | again! | Everything | okay | with | your | room?", "Hi again! Is everything okay with your room?"), t("¡Buenas! | ¿Cómo | va | todo | con | su | habitación?", "Hi! | How | is going | everything | with | your | room?", "Hi! How's everything with your room?")],
    p_what: [t("¿Qué | problema | tiene | con | la | habitación?", "What | problem | do you have | with | the | room?", "What's the problem with your room?")],
    room_noted: [t("Muy | bien, | gracias.", "Very | good, | thanks.", "Okay, thank you.")],
    ac_sorry: [t("Lo siento | mucho. | Voy | a | avisar | a | mantenimiento.", "I'm sorry | very much. | I'm going | to | notify | — | maintenance.", "I'm very sorry. I'll let maintenance know.", { flags: { 6: "Personal a: Spanish marks the people being notified; English needs no preposition." } })],
    fan_or_room: [t("¿Prefiere | un | ventilador | por | ahora, | o | cambiar | de | habitación?", "Do you prefer | a | fan | for | now, | or | change | of | room?", "Would you prefer a fan for now, or a different room?")],
    fan_ok: [t("Ahorita | le | mandamos | un | ventilador.", "In a moment | (to) you | we'll-send | a | fan.", "We'll send you a fan right away.", { flags: { 0: "Mexican: ahorita means in a moment here." }, neutral: t("Enseguida | le | mandamos | un | ventilador.", "Right away | (to) you | we'll-send | a | fan.", "We'll send you a fan right away.") })],
    fix_tomorrow: [t("Mantenimiento | revisa | el | aire | mañana | temprano.", "Maintenance | will-check | the | AC | tomorrow | early.", "Maintenance will check the AC first thing tomorrow.")],
    move_ok: [t("Claro, | le | cambio | a | la | habitación | 518.", "Sure, | (for) you | I'll-change | to | the | room | 518.", "Of course, I'll move you to room 518.", { say: "Claro, le cambio a la habitación quinientos dieciocho." })],
    new_key: [t("Aquí | tiene | su | nueva | llave.", "Here | you have | your | new | key.", "Here's your new key.")],
    hotwater: [t("Lo siento. | Mantenimiento | va | a | revisar | la | regadera | enseguida.", "I'm sorry. | Maintenance | is going | to | check | the | shower | right away.", "I'm sorry. Maintenance will check the shower right away.", { flags: { 6: "Mexican: regadera is a shower; ducha is more widely used." }, neutral: t("Lo siento. | Mantenimiento | va | a | revisar | la | ducha | enseguida.", "I'm sorry. | Maintenance | is going | to | check | the | shower | right away.", "I'm sorry. Maintenance will check the shower right away.") })],
    key_fix: [t("Permítame | su | tarjeta. | Se la | activo | de nuevo. | Ahora | debe | funcionar.", "Let me have | your | key card. | It for you | I'll-activate | again. | Now | it should | work.", "Let me have your key card. I'll reactivate it. It should work now.")],
    quiet_offer: [t("Lo siento. | ¿Prefiere | una | habitación | más | tranquila?", "I'm sorry. | Do you prefer | a | room | more | quiet?", "I'm sorry. Would you prefer a quieter room?")],
    earplugs: [t("Entiendo. | Le | puedo | dar | unos | tapones | para | los | oídos.", "I understand. | (To) you | I can | give | some | plugs | for | the | ears.", "I understand. I can give you some earplugs.")],
    wifi_fix: [t("Intente | conectarse | de nuevo. | La | contraseña | es | brisamar.", "Try | to connect | again. | The | password | is | brisamar.", "Try reconnecting. The password is brisamar.", { spell: "brisamar", write: "Wi-Fi: MarAzul · contraseña: brisamar" })],
    tv_fix: [t("Le | mando | a | alguien | para | revisar | la | televisión.", "(To) you | I'll-send | — | someone | to | check | the | TV.", "I'll send someone to check the TV.", { flags: { 2: "Personal a marks the person being sent; English needs no separate word." } })],
    glad: [t("¡Qué | bueno! | Si | necesita | algo, | avísenos.", "How | good! | If | you need | anything, | let us know.", "Glad to hear it! Let us know if you need anything.")],
    sorry_trouble: [t("De nuevo, | disculpe | las | molestias.", "Again, | forgive | the | inconvenience.", "Again, I'm sorry for the inconvenience.")],
  },
  domains: { price: () => [15000, 40000, 50000, 180000, 200000, 240000, 280000], time: () => [{ h: 11, m: 0 }] },

  hints: {
    checkin: { lt: "Check in with a reservation", items: [
      { id: "ci_res", s: t("Tengo | una | reservación.", "I have | a | reservation.", "I have a reservation.") },
      { id: "ci_like", s: t("Quisiera | registrarme, | por favor.", "I'd like | to check in, | please.", "I'd like to check in, please."), register: "polite" },
      { id: "ci_under", s: t("Tengo | una | reservación | a nombre de | {$surname}.", "I have | a | reservation | under the name of | {$surname}.", "I have a reservation under {$surname}.") },
      { id: "ci_nights", s: t("Tengo | una | reservación | por | tres | noches.", "I have | a | reservation | for | three | nights.", "I have a reservation for three nights.") },
      { id: "ci_gustaria", s: t("Me gustaría | registrarme.", "I'd like | to check in.", "I'd like to check in."), register: "polite" },
      { id: "ci_vengo", s: t("Vengo | a | registrarme.", "I'm here | to | check in.", "I'm here to check in.") },
      { id: "ci_quiero", s: t("Quiero | hacer | el | check-in, | por favor.", "I want | to do | the | check-in, | please.", "I'd like to check in, please.") },
      { id: "ci_booked", s: t("Reservé | una | habitación.", "I booked | a | room.", "I booked a room.") },
      { id: "ci_named", s: t("La | reserva | está | a nombre de | {$surname}.", "The | reservation | is | under the name of | {$surname}.", "The reservation is under {$surname}.") },
      { id: "ci_room", s: t("Tengo | una | habitación | reservada.", "I have | a | room | reserved.", "I have a room booked.") },
    ] },
    name: { lt: "Give your last name", items: [
      { id: "nm_its", s: t("Mi | apellido | es | {$surname}.", "My | last name | is | {$surname}.", "My last name is {$surname}.") },
      { id: "nm_its", s: t("A nombre de | {$surname}.", "Under the name of | {$surname}.", "It's under {$surname}.") },
    ] },
    spell: { lt: "Spell your last name", items: [
      { id: "sp_its", s: t("Se escribe | {$letters}.", "It's spelled | {$letters}.", "It's spelled {$letters}."), note: "Say the letters by their Spanish names: a, be, ce, de, e, efe, ge, hache, i, jota, ka, ele, eme…" },
    ] },
    confirm: { lt: "Confirm or correct the nights", items: [
      { id: "nt_short", s: t("Tres | noches.", "Three | nights.", "Three nights.") },
      { id: "nt_fix", s: t("No, | reservé | cuatro | noches.", "No, | I booked | four | nights.", "No, I booked four nights.") },
    ] },
    walkin: { lt: "Ask for a room without a reservation", items: [
      { id: "ci_walkin", s: t("¿Tienen | habitaciones | disponibles?", "Do you have | rooms | available?", "Do you have any rooms available?") },
      { id: "wk_none", s: t("No tengo | reservación.", "I don't have | a reservation.", "I don't have a reservation.") },
      { id: "wk_need", s: t("Necesito | una | habitación | por | dos | noches.", "I need | a | room | for | two | nights.", "I need a room for two nights.") },
    ] },
    walk_price: { lt: "Accept or ask for a cheaper room", items: [
      { id: "wk_expensive", s: t("Está | demasiado | caro.", "It's | too | expensive.", "That's too expensive.") },
      { id: "wk_cheaper", s: t("¿Tiene | algo | más | barato?", "Do you have | anything | more | cheap?", "Do you have anything cheaper?") },
      { id: "wk_think", s: t("Lo | voy | a | pensar.", "It | I'm going | to | think over.", "I'll think about it.") },
      { id: "wk_take", s: t("Me quedo | con | esa | habitación.", "I'll stay | with | that | room.", "I'll take that room.") },
    ] },
    nights: { lt: "Say how many nights", items: [
      { id: "nt_short", s: t("Tres | noches.", "Three | nights.", "Three nights.") },
      { id: "nt_short", s: t("Solo | esta | noche.", "Only | this | night.", "Just tonight.") },
    ] },
    idcard: { lt: "Show your ID", items: [
      { id: "idc_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "idc_passport", s: t("Aquí | tiene | mi | pasaporte.", "Here | you have | my | passport.", "Here's my passport.") },
      { id: "idc_ok", s: t("¿Le sirve | mi | pasaporte?", "Does it work for you | my | passport?", "Is my passport okay?") },
    ] },
    card: { lt: "Hand over your card", items: [
      { id: "idc_here", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      { id: "idc_card", s: t("Aquí | tiene | mi | tarjeta.", "Here | you have | my | card.", "Here's my card.") },
      { id: "idc_what", s: t("¿Para | qué | es | el | depósito?", "For | what | is | the | deposit?", "What's the deposit for?") },
    ] },
    card_q: { lt: "Ask about the deposit", items: [
      { id: "idc_what", s: t("¿Para | qué | es | el | depósito?", "For | what | is | the | deposit?", "What's the deposit for?") },
      { id: "idc_cash", s: t("¿Puedo | pagar | en efectivo?", "Can I | pay | in cash?", "Can I pay in cash?") },
      { id: "idc_debit", s: t("¿Aceptan | tarjeta | de | débito?", "Do you accept | card | of | debit?", "Do you take debit cards?") },
    ] },
    sign: { lt: "Sign the registration form", items: [
      { id: "sg_sure", s: t("Listo.", "Done.", "Done.") },
      { id: "sg_where", s: t("¿Dónde | firmo?", "Where | do I sign?", "Where do I sign?") },
    ] },
    keys: { lt: "Say how many key cards", items: [
      { id: "k_one", s: t("Solo | una, | por favor.", "Just | one, | please.", "Just one, please.") },
      { id: "k_two", s: t("Dos, | por favor.", "Two, | please.", "Two, please.") },
    ] },
    ask: { lt: "Ask about the hotel", items: [
      { id: "q_breakfast", s: t("¿El | desayuno | está | incluido?", "The | breakfast | is | included?", "Is breakfast included?") },
      { id: "q_included", s: t("¿Qué | incluye | el | precio?", "What | includes | the | price?", "What's included in the price?") },
      { id: "q_wifi", s: t("¿Cuál | es | la | contraseña | del | wifi?", "What | is | the | password | of the | Wi-Fi?", "What's the Wi-Fi password?") },
      { id: "q_checkout", s: t("¿A | qué | hora | es | la | salida?", "At | what | time | is | the | checkout?", "What time is checkout?") },
      { id: "q_breakfast_time", s: t("¿A | qué | hora | es | el | desayuno?", "At | what | time | is | the | breakfast?", "What time is breakfast?") },
      { id: "q_luggage", s: t("¿Puedo | dejar | mis | maletas | aquí | después | de | salir?", "Can I | leave | my | bags | here | after | — | leaving?", "Can I leave my bags here after checkout?", { flags: { 6: "de links después to the infinitive; English after already carries this link." } }) },
      { id: "q_taxi", s: t("¿Me | puede | pedir | un | taxi?", "(For) me | can you | order | a | taxi?", "Could you call me a taxi?") },
      { id: "q_towels", s: t("¿Me | puede | traer | más | toallas?", "(To) me | can you | bring | more | towels?", "Could you bring me some more towels?") },
      { id: "q_elevator", s: t("¿Dónde | está | el | elevador?", "Where | is | the | elevator?", "Where's the elevator?") },
      { id: "q_view", s: t("¿Tiene | una | habitación | con | vista | al | mar?", "Do you have | a | room | with | view | of the | sea?", "Do you have a room with an ocean view?") },
      { id: "q_parking", s: t("¿Tienen | estacionamiento?", "Do you have | parking?", "Do you have parking?") },
      { id: "q_tax", s: t("¿Qué | es | el | impuesto | de | hospedaje?", "What | is | the | tax | on | lodging?", "What's the lodging tax?") },
    ] },
    late: { lt: "Ask for a late checkout", items: [
      { id: "q_late", s: t("¿Puedo | dejar | la | habitación | más | tarde?", "Can I | leave | the | room | more | late?", "Could I check out later?") },
      { id: "q_until", s: t("¿Puedo | quedarme | hasta | las | dos?", "Can I | stay | until | — | two?", "Could I stay until 2 p.m.?", { flags: { 3: "Spanish uses an article before clock times; English has no separate word." } }) },
    ] },
    late_choice: { lt: "Choose noon or 2 p.m.", items: [
      { id: "lt_noon", s: t("Hasta | el | mediodía | está bien.", "Until | — | noon | is fine.", "Noon is fine.", { flags: { 1: "Spanish uses el before mediodía here; English says noon without an article." } }) },
      { id: "lt_two", s: t("Hasta | las | dos, | por favor.", "Until | — | two, | please.", "Until 2 p.m., please.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) },
    ] },
    late_two: { lt: "Accept or choose noon", items: [
      { id: "lt_fine", s: t("Quinientos | pesos | está bien.", "Five hundred | pesos | is fine.", "Five hundred pesos is fine.") },
      { id: "lt_noon", s: t("Hasta | el | mediodía, | gracias.", "Until | — | noon, | thanks.", "Noon, thanks.", { flags: { 1: "Spanish uses el before mediodía here; English says noon without an article." } }) },
    ] },
    taxi_time: { lt: "Say when you need the taxi", items: [
      { id: "tt_at", s: t("A | las | siete, | por favor.", "At | — | seven, | please.", "At 7 a.m., please.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) },
      { id: "tt_tomorrow", s: t("Mañana | a | las | ocho.", "Tomorrow | at | — | eight.", "Tomorrow at 8 a.m.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } }) },
      { id: "tt_noon", s: t("Al | mediodía.", "At | noon.", "At noon.") },
      { id: "tt_now", s: t("Ahorita, | por favor.", "Right now, | please.", "Right now, please.", { flags: { 0: "Mexican: ahorita means right now here." }, neutral: t("Ahora, | por favor.", "Now, | please.", "Right now, please.") }) },
    ] },
    done: { lt: "Say that's all", items: [
      { id: "dn_all", s: t("Eso | es | todo, | gracias.", "That | is | all, | thanks.", "That's all, thanks.") },
      { id: "dn_good", s: t("No necesito | nada | más.", "I don't need | anything | else.", "I don't need anything else.") },
    ] },
    problem: { lt: "Report a problem in your room", items: [
      { id: "pr_ac", s: t("El | aire | acondicionado | no funciona.", "The | air | conditioning | doesn't work.", "The AC isn't working.") },
      { id: "pr_hotwater", s: t("No hay | agua | caliente.", "There is no | water | hot.", "There's no hot water.") },
      { id: "pr_key", s: t("Mi | tarjeta | no funciona.", "My | key card | doesn't work.", "My key card doesn't work.") },
      { id: "pr_noisy", s: t("Mi | habitación | es | muy | ruidosa.", "My | room | is | very | noisy.", "My room is very noisy.") },
      { id: "pr_wifi", s: t("El | wifi | no funciona.", "The | Wi-Fi | doesn't work.", "The Wi-Fi isn't working.") },
      { id: "pr_towels", s: t("Necesito | unas | toallas.", "I need | some | towels.", "I need some towels.") },
      { id: "pf_fine", s: t("Todo | está | muy | bien.", "Everything | is | very | good.", "Everything is great.") },
    ] },
    choice: { lt: "Choose a fan or another room", items: [
      { id: "ch_fan", s: t("Un | ventilador | está bien.", "A | fan | is fine.", "A fan is fine.") },
      { id: "ch_move", s: t("Quisiera | cambiar | de | habitación.", "I'd like | to change | — | room.", "I'd like to change rooms.", { flags: { 2: "cambiar de habitación means change rooms; de links the thing being changed." } }) },
    ] },
    room_return: { lt: "Return for your room", items: [
      { id: "rr_ready", s: t("Ya | volví. | ¿Está | lista | mi | habitación?", "Already | I-came-back. | Is | ready | my | room?", "I'm back. Is my room ready?") },
      { id: "rr_later", s: t("Regreso | a | las | tres.", "I'll return | at | — | three.", "I'll be back at 3 p.m.", { flags: { 2: "Spanish uses an article before clock times; English has no separate word." } }) },
      { id: "rr_back", s: t("Ya | regresé.", "Already | I-returned.", "I'm back.") },
    ] },
  },
  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With hotel staff, usted is more polite: puede or tiene (puedes and tienes are for friends).", better: "¿Me puede pedir un taxi?" },
  },
  merges: {
    "a partir de": { reason: "lexical_expression", split: "a → to + partir → depart + de → from misreads the starting-time expression: from.", minimal: "The three-word preposition only; the time stays separate." },
    "mar azul": { reason: "lexical_expression", split: "mar → sea + azul → blue would translate part of the hotel's proper name instead of identifying it.", minimal: "Only the two-word name; Hotel stays separate." },
    "el muelle": { reason: "lexical_expression", split: "el → the + muelle → pier would translate the restaurant's proper name.", minimal: "Only the two-word name; Restaurante stays separate." },
    "no fumadores": { reason: "bound_morphology", split: "no → not + fumadores → smokers becomes the English derived noun nonsmokers.", minimal: "The negative prefix and its noun only." },
    "me quedo": { reason: "grammatical_fusion", split: "me → myself + quedo → I remain gives a false reflexive reading; quedarse = stay.", minimal: "Only the pronoun and verb; con and the room stay separate." },
    "se decide": { reason: "grammatical_fusion", split: "se → itself + decide → you decide would add a false reflexive object; decidirse = make up your mind.", minimal: "Only the two-word pronominal verb." },
    "mientras tanto": { reason: "lexical_expression", split: "mientras → while + tanto → so much misreads the adverb: in the meantime.", minimal: "Two words." },
    "por separado": { reason: "lexical_expression", split: "por → by + separado → separated misreads the adverb: separately.", minimal: "Two words." },
    "le sirve": { reason: "grammatical_fusion", split: "le → to you + sirve → serves suggests service; the suitability question means does it work for you.", minimal: "Clitic and verb only; the passport stays separate." },
  },

  // The learner's plan (check-in, or the problem visit): items of the other mode stay hidden.
  mission: [
    { lt: "Say you have a reservation", optional: true, when: (c) => c.s.mode === "checkin" && c.s.kind !== "walkin", done: (c) => c.s.mode === "checkin" && c.s.kind === "res" },
    { lt: "Choose a room", optional: true, when: (c) => c.s.mode === "checkin" && c.s.kind === "walkin", done: (c) => c.s.mode === "checkin" && c.s.kind === "walkin" && !!c.s.nights && !!c.s.roomChosen },
    { lt: "Give your last name", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.name },
    { lt: "Spell your last name", optional: true, when: (c) => c.s.mode === "checkin" && !!c.s.askSpell, done: (c) => c.s.mode === "checkin" && !!c.s.askSpell && !!c.s.spelled },
    { lt: "Confirm your reservation", optional: true, when: (c) => c.s.mode === "checkin" && c.s.kind !== "walkin", done: (c) => c.s.mode === "checkin" && c.s.kind === "res" && !!c.s.confirmed },
    { lt: "Show your ID and arrange the deposit", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.idShown && !!c.s.cardGiven },
    { lt: "Sign the registration form", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.signed },
    { lt: "Find out what’s included", optional: true, when: (c) => c.s.mode === "checkin", done: (c) => c.s.mode === "checkin" && !!c.s.breakfastSaid },
    { step: "p_report", lt: "Report the problem", optional: true },
    { lt: "Agree on a solution", optional: true, when: (c) => c.s.mode === "problem",
      done: (c) => c.s.mode === "problem" && !!c.s.reported && (!["ac", "noise"].includes(c.s.reported) || !!c.s.fixed) },
  ],

  steps: [
    { id: "arrive", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.kind,
      ask: (c) => c.say(c.s.greeted ? "ask_help" : "greet"),
      expects: ["checkin", "walkin"],
      suggest: [{ lt: "Say you have a reservation", hint: "checkin" }, { lt: "Ask for a room", hint: "walkin" }],
      yes: (c) => { c.s.kind = "res"; } },
    { id: "walk_nights", when: (c) => c.s.mode === "checkin" && c.s.kind === "walkin", done: (c) => !!c.s.nights,
      ask: (c) => c.say(c.s.walkChecked ? "ask_nights" : "walkin_nights"),
      expects: ["nights_ctx"],
      suggest: [{ lt: "Say how many nights", hint: "nights" }] },
    { id: "walk_offer", when: (c) => c.s.mode === "checkin" && c.s.kind === "walkin", done: (c) => !!c.s.roomChosen,
      ask: (c) => { c.s.taxSaid = true; c.say(OFFER_LINE[c.s.offer] ?? "walkin_offer", { price: c.s.offer === "two" ? 280000 : c.s.offer === "cheap" ? 180000 : 240000 }); },
      expects: ["take_it", "ask_twobeds", "ask_breakfast", "ask_included", "too_expensive_ctx", "cheaper_ctx", "walk_leave_ctx", "price_ok_ctx"],
      suggest: [{ lt: "Accept or ask about another room", hint: "g_yesno" }, { lt: "Say it’s too expensive", hint: "walk_price" }, { lt: "Ask what’s included", hint: "ask" }],
      yes: (c) => { takeRoom(c); c.say("walkin_great"); },
      // "No, thanks": first a cheaper room, then a polite goodbye
      no: (c) => {
        if (c.s.offer !== "cheap") { offerCheaper(c); return; }
        c.say("walkin_sorry"); c.end();
      } },
    { id: "name", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.name,
      ask: (c) => c.say(c.s.kind === "walkin" ? "ask_name_walkin" : "ask_name"),
      expects: ["name_ctx"],
      suggest: [{ lt: "Give your last name", hint: "name" }] },
    { id: "spell", when: (c) => c.s.mode === "checkin" && c.s.askSpell, done: (c) => !!c.s.spelled,
      ask: (c) => c.say("ask_spell"),
      expects: ["letters_ctx"],
      suggest: [{ lt: "Spell your last name", hint: "spell" }] },
    { id: "found", when: (c) => c.s.mode === "checkin" && c.s.kind === "res", done: (c) => !!c.s.confirmed,
      ask: (c) => {
        if (c.s.nights) { c.s.confirmed = true; c.say("found_short"); askNext(c); return; }
        c.say("found_full");
      },
      expects: ["nights_fix", "nights_ctx"],
      suggest: [{ lt: "Confirm or correct the number of nights", hint: "confirm" }, { lt: "Say how many nights", hint: "nights" }],
      yes: (c) => { c.s.confirmed = true; c.s.nights = 3; ack(c, 0.8, "ack"); },
      no: (c) => { c.say("ask_nights"); c.expect({ id: "nights", expects: ["nights_ctx", "nights_fix"], hints: ["nights"], suggest: [{ lt: "Say how many nights", hint: "nights" }],
        on: { nights_ctx: (cc, sl, sg) => { hotel.handlers.nights_ctx(cc, sl, sg); }, nights_fix: (cc, sl, sg) => { hotel.handlers.nights_fix(cc, sl, sg); } },
        ask: (cc) => cc.say("ask_nights") }); } },
    { id: "id", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.idShown,
      ask: (c) => c.say("ask_id"),
      expects: ["hand_over", "id_q"],
      suggest: [{ lt: "Show your passport", hint: "idcard" }],
      yes: (c) => { c.s.idShown = true; ack(c, 1, "thank_you"); } },
    { id: "card", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.cardGiven,
      ask: (c) => { if (c.s.kind === "res" && !c.s.prepaidSaid && c.chance(0.3)) { c.s.prepaidSaid = true; c.s.taxSaid = true; c.say("prepaid"); } if (c.s.depositPreference === "cash") c.say("ask_cash_deposit", { price: 200000 }); else c.say(c.s.depositPreference === "debit" ? "ask_debit" : "ask_card"); },
      expects: ["hand_over", "incidentals_q", "cash_q", "debit_q", "decline_deposit"],
      suggest: [{ lt: "Hand over your card or deposit", hint: "card" }, { lt: "Ask about the deposit", hint: "card_q" }],
      yes: (c) => { c.s.cardGiven = true; ack(c, 1, "thank_you"); } },
    { id: "sign", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.signed,
      ask: (c) => { if (!c.s.taxSaid) { c.s.taxSaid = true; c.say("lodging_tax"); } c.say("ask_sign"); },
      expects: ["sign_where", "sign_ok_ctx", "sign_here_ctx"],
      suggest: [{ lt: "Sign the registration form", hint: "sign" }],
      yes: (c) => { c.s.signed = true; ack(c, 1, "thank_you"); } },
    { id: "keys", when: (c) => c.s.mode === "checkin" && c.s.askKeys, done: (c) => !!c.s.keys,
      ask: (c) => c.say("ask_keys"),
      expects: ["keys_ctx"],
      suggest: [{ lt: "Say how many key cards", hint: "keys" }] },
    { id: "room", when: (c) => c.s.mode === "checkin", done: (c) => !!c.s.roomSaid,
      ask: (c) => {
        if (c.s.roomNotReady && !c.s.returned) {
          c.twist("room_not_ready"); c.s.waitingForRoom = true;
          c.say("room_not_ready"); c.expect(roomReturnPending()); return;
        }
        c.s.roomSaid = true;
        if (c.s.upgradeTwist && c.s.room === "412") { c.twist("upgrade"); c.s.room = "518"; c.say("upgrade"); }
        c.say("room_" + c.s.room);
        // as many key cards as the learner asked for ("Just one, please." → "Here's your key card.")
        if (c.s.keys) (c as ConvCtx).conv.pushLine("keys_here", c.s.keys > 1 ? 0 : 1, {}); else c.say("keys_here");
        c.event("give", { item: "key card", room: c.s.room });
        if (c.chance(0.5)) c.say("elevators");
        if (c.s.volunteerBreakfast) { c.s.breakfastSaid = true; c.say("breakfast_volunteer"); }
        if (c.s.volunteerCheckout) { hotel.handlers.ask_checkout(c, {}, { intent: "ask_checkout", slots: {}, tags: [] }); }
        askNext(c);
      }, expects: ["return_ready_ctx", "wait_room_ctx"] },
    { id: "p_report", when: (c) => c.s.mode === "problem", done: (c) => !!c.s.reported,
      ask: (c) => c.say(c.s.pGreeted ? "p_what" : "p_greet"),
      expects: ["pr_ac", "pr_hotwater", "pr_key", "pr_noisy", "pr_wifi", "pr_tv", "pr_towels", "p_fine", "room_no", "pr_vague_ctx"],
      suggest: [{ lt: "Report the problem in your room", hint: "problem" }],
      yes: (c) => { c.s.reported = "fine"; c.say("glad"); },
      no: (c) => { c.say("p_what"); c.hold(); } },
    // The fix for the AC or the noise (usually already offered by the report handler; asked again if still open)
    { id: "p_fix", when: (c) => c.s.mode === "problem" && (c.s.reported === "ac" || c.s.reported === "noise"), done: (c) => !!c.s.fixed,
      ask: (c) => {
        if (c.s.reported === "ac") { c.say("fan_or_room"); c.expect(fanOrRoomPending()); }
        else { c.say("quiet_offer"); c.expect(quietPending()); }
      },
      expects: ["ch_fan", "ch_move"],
      suggest: [{ lt: "Choose a fan or another room", hint: "choice" }] },
    { id: "anything", done: (c) => !!c.s.noMore,
      ask: (c) => {
        if (c.s.anyAsked) { c.say("ask_any_else"); c.expect(anyElsePending()); return; }
        c.say("ask_any"); c.s.anyAsked = true;
      },
      expects: ["done", "ask_breakfast", "ask_breakfast_time", "ask_wifi", "ask_checkout", "ask_late", "ask_included", "ask_luggage", "ask_taxi", "ask_towels", "ask_view", "ask_parking", "ask_elevator"],
      suggest: [
        { lt: "Ask what’s included, about breakfast, or about Wi-Fi", hint: "ask" },
        { lt: "Ask for a late checkout", hint: "late" },
        { lt: "Say that’s all", hint: "done" },
      ],
      yes: (c) => { c.say("ask_help"); c.hold(); },
      no: (c) => { c.s.noMore = true; } },
  ],

  init: (c) => {
    c.s.mode = c.visits >= 1 && c.chance(0.35) ? "problem" : "checkin";
    c.s.room = "412";
    c.s.roomNotReady = c.visits >= 1 && c.chance(0.25);
    c.s.askSpell = c.chance(0.85);
    c.s.askKeys = c.chance(0.5);
    c.s.volunteerBreakfast = c.chance(0.4);
    c.s.volunteerCheckout = c.chance(0.4);
    c.s.upgradeTwist = c.visits >= 1 && c.chance(0.25);
  },

  start: (c) => {
    c.s.greeted = true;
    if (c.s.mode === "problem") { c.s.pGreeted = true; c.twist("problem_visit"); c.say("p_greet"); c.hold(); return; }
    c.say("greet");
    c.hold();
  },

  handlers: {
    checkin(c, slots, seg) {
      c.s.kind = c.s.kind ?? "res";
      if (slots.name) { c.s.name = slots.name; }
      const n = nightsFrom(slots, seg);
      if (n) c.s.nights = n;
    },
    walkin(c, slots, seg) {
      c.s.kind = "walkin";
      const n = nightsFrom(slots, seg);
      if (n) c.s.nights = n;
      c.s.walkChecked = true;
      once(c, "walk", "walkin_check");
    },
    nights_ctx(c, slots, seg) {
      const n = nightsFrom(slots, seg) ?? (typeof slots.number === "number" ? slots.number : undefined);
      if (!n) return;
      const changed = c.s.confirmed === undefined && c.s.kind === "res" && n !== 3;
      c.s.nights = n;
      if (c.s.kind === "res") { c.s.confirmed = true; once(c, "nights", changed ? "nights_fixed" : "ack"); }
      else ack(c, 0.6);
    },
    nights_fix(c, slots, seg) {
      const n = nightsFrom(slots, seg) ?? (typeof slots.number === "number" ? slots.number : undefined);
      if (n) { c.s.nights = n; c.s.confirmed = true; once(c, "nights", "nights_fixed"); }
    },
    name_ctx(c, slots, seg) {
      // "Miller" typed as one word is read by {letters} as a "joined" spelling: it is a name, not a spelling.
      const joined = seg.tags.includes("joined");
      const name = slots.name ?? (slots.letters ? String(slots.letters) : undefined);
      if (!name || /^(de|a|en|por|para)$/i.test(name)) return;
      c.s.name = c.s.name ?? name;
      if (slots.letters && !joined && (slots.name || String(slots.letters).length >= 3)) { c.s.spelled = true; once(c, "sp", "spelled_ok"); }
    },
    letters_ctx(c) {
      // A long spelling may reach us in several segments: they all mean "spelled".
      c.s.name = c.s.name ?? "guest";
      c.s.spelled = true;
      once(c, "sp", "spelled_ok");
    },
    hand_over(c, _slots, seg) {
      if (seg.tags.includes("both")) { c.s.idShown = true; c.s.cardGiven = true; once(c, "ho", "thank_you"); return; }
      // A passport cannot satisfy the deposit, nor can a card satisfy photo ID.
      if (seg.tags.includes("document")) { c.s.idShown = true; once(c, "ho", "thank_you"); return; }
      if (seg.tags.includes("card") || seg.tags.includes("cash")) {
        c.s.cardGiven = true; c.s.depositMethod = seg.tags.includes("cash") ? "cash" : "card";
        once(c, "ho", "thank_you"); return;
      }
      if (c.step === "card" || (c.s.idShown && !c.s.cardGiven)) { c.s.cardGiven = true; once(c, "ho", "thank_you"); return; }
      if (!c.s.idShown) { c.s.idShown = true; once(c, "ho", "thank_you"); return; }
      once(c, "ho", "thank_you");
    },
    id_q(c) { c.say("passport_fine"); },
    incidentals_q(c) { c.say("incidentals"); c.say("hold", { price: 200000 }); c.say("hold_back"); },
    cash_q(c) { c.s.depositPreference = "cash"; c.say("cash_deposit", { price: 200000 }); },
    debit_q(c) { c.s.depositPreference = "debit"; c.say("debit_ok"); },
    sign_here_ctx(c, slots, seg) { hotel.handlers.sign_where(c, slots, seg); },
    sign_ok_ctx(c) { if (!c.s.signed) { c.s.signed = true; ack(c, 1, "thank_you"); } },
    sign_where(c) {
      // She shows the line, the learner signs.
      c.say("sign_where");
      c.s.signed = true;
      c.say("thank_you");
    },
    keys_ctx(c, slots, seg) {
      c.s.keys = seg.tags.includes("h:k_two") ? 2 : typeof slots.number === "number" ? slots.number : 1;
      ack(c, 0.7, "ack");
    },
    ask_breakfast(c) { c.s.breakfastSaid = true; c.say("breakfast_incl"); c.say("breakfast_time"); },
    ask_breakfast_time(c) { c.s.breakfastSaid = true; c.say("breakfast_time"); },
    ask_wifi(c) { c.s.wifiSaid = true; c.say("wifi"); },
    ask_checkout(c) { c.s.checkoutSaid = true; c.say(c.s.late === "noon" ? "checkout_noon" : c.s.late === "two" ? "checkout_two" : "checkout_time", { time: { h: 11, m: 0 } }); },
    ask_late(c, slots) {
      // "Could I have a late check-out? Until two?" may arrive as two segments: read the time from the whole utterance.
      const T = turn(c);
      T.lateHandled = true;
      const tm = slots.time as { h: number; m: number } | undefined;
      let h = tm?.h;
      if (h === undefined) {
        const said = c.heard.toLowerCase();
        // "una" is also the article ("una salida tardía"): only "a la una" is a time
        if (/\b(mediod[ií]a|las doce|las 12)\b/.test(said)) h = 12;
        else if (/\b(la una|la 1)\b/.test(said)) h = 13;
        else if (/\b(las dos|las 2)\b/.test(said)) h = 14;
        else if (/\b(las tres|las cuatro|las [34])\b/.test(said)) h = 15;
      }
      if (h !== undefined && h < 7) h += 12;
      c.s.lateQuoted = true;
      if (h === undefined) { c.say("late_offer", { price: 50000 }); c.expect(lateChoicePending()); return; }
      if (h <= 12) { c.s.late = "noon"; c.say("late_free"); return; }
      if (h > 14 || (h === 14 && (tm?.m ?? 0) > 0)) c.say("late_limit");
      c.say("late_two_q", { price: 50000 });
      c.expect({
        id: "late", expects: ["late_noon", "late_two", "too_expensive_ctx", "cheaper_ctx"], hints: ["late_two"], suggest: [{ lt: "Accept (500 pesos) or choose noon", hint: "late_two" }],
        on: { late_noon: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_ok"); }, late_two: (cc) => { cc.s.late = "two"; once(cc, "late", "late_two_ok"); },
          too_expensive_ctx: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_free"); }, cheaper_ctx: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_free"); } },
        yes: (cc) => { cc.s.late = "two"; once(cc, "late", "late_two_ok"); },
        no: (cc) => { cc.s.late = "noon"; once(cc, "late", "late_noon_free"); },
        ask: (cc) => cc.say("late_two_q", { price: 50000 }),
      });
    },
    late_noon(c) { if (turn(c).lateHandled) return; c.s.late = "noon"; once(c, "late", "late_noon_ok"); },
    late_two(c, _slots, seg) {
      if (turn(c).lateHandled) return;
      // "A las dos" before any price was said: quote it first (never book the paid checkout unasked)
      if (!c.s.lateQuoted) { hotel.handlers.ask_late(c, { time: { h: 2, m: 0 } }, seg); return; }
      c.s.late = "two"; once(c, "late", "late_two_ok");
    },
    take_it(c) { if (c.step === "walk_offer" || (c.s.kind === "walkin" && !c.s.roomChosen)) { takeRoom(c); once(c, "take", "walkin_great"); } else ack(c, 1); },
    ask_included(c) { c.s.breakfastSaid = true; c.s.wifiSaid = true; c.say("included", { price: 15000 }); },
    ask_luggage(c) { if (c.s.waitingForRoom) { c.s.bagsAsked = true; c.s.bagsKept = true; } c.say("luggage_ok"); },
    ask_taxi(c) {
      c.say("taxi_when");
      c.expect({ id: "taxi_time", expects: ["taxi_time_ctx"], hints: ["taxi_time"], suggest: [{ lt: "Say what time you need the taxi", hint: "taxi_time" }],
        on: { taxi_time_ctx: (cc, sl, sg) => { hotel.handlers.taxi_time_ctx(cc, sl, sg); } },
        yes: (cc) => { cc.s.taxi = true; cc.say("taxi_ok"); }, no: (cc) => { cc.say("no_problem"); },
        ask: (cc) => cc.say("taxi_when") });
    },
    taxi_time_ctx(c, _slots, seg) { c.s.taxi = true; once(c, "taxi", seg.tags.includes("now") ? "taxi_now" : "taxi_ok"); },
    ask_towels(c) { c.say("towels_ok"); },
    ask_pillow(c) { c.say("pillow_ok"); },
    ask_elevator(c) { c.say("elevator"); },
    ask_gym(c) { c.say("gym"); },
    ask_pool(c) { c.say("pool"); },
    ask_parking(c) { c.say("parking", { price: 15000 }); },
    ask_view(c) { if (c.s.room === "518") { c.say("room_518"); return; } c.say("view_offer", { price: 40000 }); c.expect(viewPending()); },
    ask_quiet(c) { c.s.room = "518"; c.say("quiet_ok"); if (c.s.roomSaid) c.say("room_518"); },
    ask_twobeds(c) {
      if (c.step === "walk_offer") { c.s.offer = "two"; c.s.taxSaid = true; c.say("walkin_twobeds", { price: 280000 }); c.hold(); return; }
      c.s.room = "207"; c.say("twobeds_ok"); if (c.s.roomSaid) c.say("room_207");
    },
    ask_nonsmoking(c) { c.say("nonsmoking"); },
    ask_restaurant(c) { c.say("restaurant"); },
    ask_roomservice(c) { c.say("roomservice"); },
    ask_wakeup(c) { c.say("wakeup"); },
    ask_room(c) { c.say(c.s.roomSaid ? "room_" + c.s.room : "room_is"); },
    ask_checkin_time(c) { c.say(c.s.roomNotReady && !c.s.returned ? "return_reminder" : "checkin_now"); },
    return_ready_ctx(c) { if (c.s.waitingForRoom) { c.s.returned = true; c.say("room_ready"); } },
    wait_room_ctx(c) { if (c.s.waitingForRoom) { seeYouLater(c); return; } c.say("ack"); },
    ask_tax(c) { c.s.taxSaid = true; c.say("tax_info"); },
    decline_deposit(c) { c.say("deposit_required"); c.hold(); },
    done(c) { c.s.noMore = true; },
    pr_ac(c) { c.s.reported = "ac"; c.s.anyAsked = true; once(c, "pr", "ac_sorry"); c.say("fan_or_room"); c.expect(fanOrRoomPending()); },
    pr_hotwater(c) { c.s.reported = "water"; c.s.anyAsked = true; once(c, "pr", "hotwater"); },
    pr_key(c) { c.s.reported = "key"; c.s.anyAsked = true; once(c, "pr", "key_fix"); },
    pr_noisy(c) { c.s.reported = "noise"; c.s.anyAsked = true; c.say("quiet_offer"); c.expect(quietPending()); },
    pr_wifi(c) { c.s.reported = "wifi"; c.s.anyAsked = true; once(c, "pr", "wifi_fix"); },
    pr_tv(c) { c.s.reported = "tv"; c.s.anyAsked = true; once(c, "pr", "tv_fix"); },
    pr_towels(c) { if (c.s.mode === "problem") c.s.reported = c.s.reported ?? "towels"; c.say("towels_ok"); },
    pr_vague_ctx(c) { c.say("p_what"); c.hold(); },
    too_expensive_ctx(c) {
      if (c.step === "walk_offer" && !c.s.roomChosen) { offerCheaper(c); return; }
      c.s.late = "noon"; once(c, "late", "late_noon_free");
    },
    price_ok_ctx(c) { c.say("no_problem"); c.hold(); },
    cheaper_ctx(c, slots, seg) { hotel.handlers.too_expensive_ctx(c, slots, seg); },
    walk_leave_ctx(c) { c.say("walkin_sorry"); c.end(); },
    room_no(c) { c.s.roomNo = true; once(c, "rn", "room_noted"); },
    p_fine(c) { if (c.s.mode !== "problem") { ack(c, 1); return; } c.s.reported = "fine"; c.say("glad"); },
    ch_fan(c) { if (c.s.reported === "ac" && !c.s.fixed) { c.s.fixed = "fan"; c.say("fan_ok"); } else c.say("no_problem"); },
    ch_move(c, slots, seg) {
      // At check-in, "otra habitación" is a wish for a different room: a cheaper one on offer, otherwise the ocean view
      if (c.s.mode !== "problem") { if (c.step === "walk_offer" && !c.s.roomChosen) { offerCheaper(c); return; } hotel.handlers.ask_view(c, slots, seg); return; }
      c.s.fixed = "move"; c.s.room = "518"; c.say("move_ok"); c.say("new_key");
    },
  },

  finish: (c) => {
    c.complete();
    if (c.s.mode === "checkin") {
      if (!c.s.breakfastSaid) { c.s.breakfastSaid = true; c.say("also_breakfast"); }
      c.say("enjoy");
      c.remember({ room: c.s.room });
    } else if (c.s.reported && c.s.reported !== "fine") c.say("sorry_trouble");
    c.expect({
      id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { once(cc, "close", cc.s.mode === "checkin" ? "you_welcome" : "g_welcome"); cc.end(); },
        g_bye: (cc) => { once(cc, "close", "enjoy"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
    });
  },

  tests: [
    // Every hint construction (including the neutral twin), not just keywords.
    { say: "Tengo una reservación", intent: "checkin" },
    { say: "Quisiera registrarme, por favor", intent: "checkin" },
    { say: "Tengo una reservación a nombre de Miller", intent: "checkin", slots: { name: "Miller" } },
    { say: "Tengo una reservación por tres noches", intent: "checkin", slots: { nights: { number: 3 } } },
    { say: "Me gustaría registrarme", intent: "checkin" },
    { say: "Vengo a registrarme", intent: "checkin" },
    { say: "Quiero hacer el check-in, por favor", intent: "checkin" },
    { say: "Reservé una habitación", intent: "checkin" },
    { say: "La reserva está a nombre de Miller", intent: "checkin", slots: { name: "Miller" } },
    { say: "Tengo una habitación reservada", intent: "checkin" },
    { say: "Mi apellido es Miller", intent: "name_ctx", step: "name", slots: { name: "Miller" } },
    { say: "A nombre de Miller", intent: "name_ctx", step: "name", slots: { name: "Miller" } },
    { say: "Se escribe eme i ele ele e erre", intent: "letters_ctx", step: "spell" },
    { say: "Tres noches", intent: "nights_ctx", step: "found", slots: { nights: { number: 3 } } },
    { say: "No, reservé cuatro noches", intent: "nights_fix", step: "found", slots: { nights: { number: 4 } } },
    { say: "¿Tienen habitaciones disponibles?", intent: "walkin" },
    { say: "No tengo reservación", intent: "walkin", not: ["checkin"] },
    { say: "Necesito una habitación por dos noches", intent: "walkin", slots: { nights: { number: 2 } } },
    { say: "Está demasiado caro", intent: "too_expensive_ctx", step: "walk_offer" },
    { say: "¿Tiene algo más barato?", intent: "cheaper_ctx", step: "walk_offer" },
    { say: "Lo voy a pensar", intent: "walk_leave_ctx", step: "walk_offer" },
    { say: "Me quedo con esa habitación", intent: "take_it", step: "walk_offer" },
    { say: "Solo esta noche", intent: "nights_ctx", step: "walk_nights" },
    { say: "Aquí tiene", intent: "hand_over", step: "id" },
    { say: "Aquí tiene mi pasaporte", intent: "hand_over", step: "id" },
    { say: "¿Le sirve mi pasaporte?", intent: "id_q" },
    { say: "Aquí tiene mi tarjeta", intent: "hand_over", step: "card" },
    { say: "¿Para qué es el depósito?", intent: "incidentals_q", step: "card" },
    { say: "¿Puedo pagar en efectivo?", intent: "cash_q", step: "card" },
    { say: "¿Aceptan tarjeta de débito?", intent: "debit_q", step: "card" },
    { say: "Listo", intent: "sign_ok_ctx", step: "sign" },
    { say: "¿Dónde firmo?", intent: "sign_where", step: "sign" },
    { say: "Solo una, por favor", intent: "keys_ctx", step: "keys" },
    { say: "Dos, por favor", intent: "keys_ctx", step: "keys" },
    { say: "¿El desayuno está incluido?", intent: "ask_breakfast" },
    { say: "¿Qué incluye el precio?", intent: "ask_included" },
    { say: "¿Cuál es la contraseña del wifi?", intent: "ask_wifi" },
    { say: "¿A qué hora es la salida?", intent: "ask_checkout" },
    { say: "¿A qué hora es el desayuno?", intent: "ask_breakfast_time" },
    { say: "¿Puedo dejar mis maletas aquí después de salir?", intent: "ask_luggage" },
    { say: "¿Me puede pedir un taxi?", intent: "ask_taxi" },
    { say: "¿Me puede traer más toallas?", intent: "ask_towels" },
    { say: "¿Dónde está el elevador?", intent: "ask_elevator" },
    { say: "¿Tiene una habitación con vista al mar?", intent: "ask_view" },
    { say: "¿Puedo tener una habitación con vista al mar?", intent: "ask_view" },
    { say: "¿Tienen estacionamiento?", intent: "ask_parking" },
    { say: "¿Qué es el impuesto de hospedaje?", intent: "ask_tax" },
    { say: "¿Puedo dejar la habitación más tarde?", intent: "ask_late" },
    { say: "¿Puedo quedarme hasta las dos?", intent: "ask_late", slots: { time: { h: 2, m: 0 } } },
    { say: "Hasta el mediodía está bien", intent: "late_noon" },
    { say: "Hasta las dos, por favor", intent: "late_two" },
    { say: "Quinientos pesos está bien", intent: "late_two" },
    { say: "Sí, está bien", intent: "yn:yes" },
    { say: "Hasta el mediodía, gracias", intent: "late_noon" },
    { say: "Eso es todo, gracias", intent: "done", step: "anything" },
    { say: "No necesito nada más", intent: "done", step: "anything" },
    { say: "El aire acondicionado no funciona", intent: "pr_ac" },
    { say: "No hay agua caliente", intent: "pr_hotwater" },
    { say: "Mi tarjeta no funciona", intent: "pr_key" },
    { say: "Mi habitación es muy ruidosa", intent: "pr_noisy" },
    { say: "El wifi no funciona", intent: "pr_wifi" },
    { say: "Necesito unas toallas", intent: "pr_towels" },
    { say: "Todo está muy bien", intent: "p_fine" },
    { say: "Un ventilador está bien", intent: "ch_fan" },
    { say: "Quisiera cambiar de habitación", intent: "ch_move" },
    { say: "Ya volví, ¿está lista mi habitación?", intent: "return_ready_ctx", step: "room" },
    { say: "Ya regresé", intent: "return_ready_ctx", step: "room" },
    { say: "De acuerdo, regreso a las tres", intent: "wait_room_ctx", step: "room", not: ["return_ready_ctx"] },
    // Natural alternatives, short answers in context, tú, agreement slips, accentless typing.
    { say: "Hola Fernanda, reservé por internet", intent: "checkin" },
    { say: "Tenemos una reserva", intent: "checkin" },
    { say: "Quisiera un cuarto por una semana", intent: "walkin" },
    { say: "Miller", intent: "name_ctx", step: "name" },
    { say: "eme i ele ele e erre", intent: "letters_ctx", step: "spell" },
    { say: "Dos noches", intent: "nights_ctx", step: "walk_nights" },
    { say: "Una", intent: "keys_ctx", step: "keys" },
    { say: "¿Me puedes pedir un taxi?", intent: "ask_taxi" },
    { say: "¿Tienes habitaciones disponibles?", intent: "walkin" },
    { say: "Quisiera un habitación por dos noches", intent: "walkin" },
    { say: "El desayuno está incluida", intent: "ask_breakfast" },
    { say: "cual es la contrasena del wifi", intent: "ask_wifi" },
    { say: "no hay agua caliente en la regadera", intent: "pr_hotwater" },
    { say: "La ducha no funciona", intent: "pr_hotwater" },
    { say: "No hay agua caliente en la ducha", intent: "pr_hotwater" },
    { say: "¿Tienen alberca?", intent: "ask_pool" },
    { say: "¿Hay piscina?", intent: "ask_pool" },
    { say: "¿Dónde está el ascensor?", intent: "ask_elevator" },
    { say: "¿Me guardan las maletas?", intent: "ask_luggage" },
    { say: "Aquí tiene mi pasaporte y mi tarjeta de crédito", intent: "hand_over" },
    { say: "Aquí tiene el depósito en efectivo", intent: "hand_over", step: "card" },
    { say: "Mi tarjeta no abre la puerta", intent: "pr_key" },
    { say: "Hay mucho ruido en mi cuarto", intent: "pr_noisy" },
    { say: "La televisión no funciona", intent: "pr_tv" },
    { say: "Estoy en la habitación cuatrocientos doce", intent: "room_no", slots: { number: 412 } },
    { say: "Tengo un problema con mi habitación", intent: "pr_vague_ctx", step: "p_report" },
    { say: "¿Puedo hacer el check-out más tarde?", intent: "ask_late" },
    { say: "¿Puedo quedarme hasta las tres de la tarde?", intent: "ask_late", slots: { time: { h: 3, m: 0, ampm: "pm" } } },
    // More natural alternatives (review, 1 Nov 2026)
    { say: "Necesito hacer el check-in", intent: "checkin" },
    { say: "Busco una habitación para dos personas", intent: "walkin" },
    { say: "Sí, me interesa", intent: "take_it", step: "walk_offer" },
    { say: "Es un poco caro", intent: "too_expensive_ctx", step: "walk_offer" },
    { say: "¿No tiene algo más económico?", intent: "cheaper_ctx", step: "walk_offer" },
    { say: "Tome", intent: "hand_over", step: "id" },
    { say: "Aquí está mi pasaporte", intent: "hand_over", step: "id" },
    { say: "¿Me van a cobrar algo?", intent: "incidentals_q", step: "card" },
    { say: "Prefiero pagar en efectivo", intent: "cash_q", step: "card" },
    { say: "¿Dónde tengo que firmar?", intent: "sign_where", step: "sign" },
    { say: "¿Aquí?", intent: "sign_here_ctx", step: "sign" },
    { say: "Ya está", intent: "sign_ok_ctx", step: "sign" },
    { say: "No necesito dos, solo una", intent: "keys_ctx", step: "keys", not: ["nights_fix"] },
    { say: "¿Está incluido el desayuno?", intent: "ask_breakfast" },
    { say: "¿Hasta qué hora sirven el desayuno?", intent: "ask_breakfast_time" },
    { say: "¿Cuál es el número de mi habitación?", intent: "ask_room" },
    { say: "¿Hay un restaurante cerca?", intent: "ask_restaurant" },
    { say: "¿Me da otra almohada?", intent: "ask_pillow" },
    { say: "¿Tienen late check-out?", intent: "ask_late" },
    { say: "Eso sería todo", intent: "done", step: "anything" },
    { say: "Mejor al mediodía", intent: "late_noon" },
    { say: "Sí, pago los quinientos", intent: "late_two" },
    { say: "El aire no enfría", intent: "pr_ac" },
    { say: "No sirve el clima", intent: "pr_ac" },
    { say: "La llave no funciona", intent: "pr_key" },
    { say: "No hay internet", intent: "pr_wifi" },
    { say: "La tele no prende", intent: "pr_tv" },
    { say: "Los vecinos hacen mucho ruido", intent: "pr_noisy" },
    { say: "Todo bien, gracias", intent: "p_fine", step: "p_report" },
    { say: "El ventilador", intent: "ch_fan" },
    { say: "Otra habitación, por favor", intent: "ch_move" },
    { say: "Cámbieme de cuarto, por favor", intent: "ch_move" },
    { say: "¿Puedo cambiarme de habitación?", intent: "ch_move" },
    { say: "No quiero cambiarme de cuarto, el ventilador está bien", intent: "ch_fan", not: ["ch_move"] },
    { say: "Vuelvo más tarde", intent: "wait_room_ctx", step: "room" },
    { say: "Ya estoy de vuelta", intent: "return_ready_ctx", step: "room" },
    // Spain forms are correct, with no dialect correction.
    { say: "¿Tenéis habitaciones disponibles?", intent: "walkin" },
    { say: "Vale, me quedo con esa habitación", intent: "take_it", step: "walk_offer" },
    { say: "¿Dónde puedo aparcar el coche?", intent: "ask_parking" },
    // Meaning safety: no deposit, reservation, charge or fault may be invented.
    { say: "No tengo una reserva", intent: "walkin", not: ["checkin"] },
    { say: "No quiero dar mi tarjeta", intent: "decline_deposit", not: ["hand_over"] },
    { say: "No voy a dejar un depósito", intent: "decline_deposit", not: ["hand_over"] },
    { say: "No quiero pagar quinientos pesos, mejor al mediodía", intent: "late_noon", not: ["late_two"] },
    { say: "No quiero pagar más", intent: "too_expensive_ctx", step: "walk_offer", not: ["late_noon", "late_two", "take_it"] },
    { say: "No quiero pagar más", intent: "none", step: "card" },
    { say: "A las dos", intent: "late_two", step: "anything", not: ["taxi_time_ctx"] },
    { say: "Por ahora es todo", intent: "done", step: "anything", not: ["taxi_time_ctx"] },
    { say: "No son tres, son cuatro", intent: "nights_fix", step: "found", slots: { number: 4 }, not: ["yn:yes"] },
    { say: "No me interesa", intent: "walk_leave_ctx", step: "walk_offer", not: ["take_it"] },
    { say: "No tengo efectivo", intent: "none", step: "card" },
    { say: "No quiero cambiar de habitación", intent: "none", step: "p_report" },
    { say: "No quiero un ventilador", intent: "ch_move", not: ["ch_fan"] },
    { say: "No tengo tarjeta de crédito", intent: "cash_q", not: ["hand_over"] },
    { say: "No necesito nada más", intent: "done", not: ["ask_towels", "ask_pillow"], step: "anything" },
    { say: "El aire acondicionado funciona bien", intent: "none" },
    { say: "El wifi no está descompuesto", intent: "none" },
    { say: "No quiero cambiar de habitación", intent: "none" },
    { say: "No está demasiado caro", intent: "price_ok_ctx", not: ["too_expensive_ctx", "cheaper_ctx", "take_it"], step: "walk_offer" },
    { say: "No tengo un problema con mi habitación", intent: "none", step: "p_report" },
    { say: "No tengo mi pasaporte", intent: "none" },
    { say: "No tengo mi tarjeta", intent: "none" },
    { say: "No necesito toallas", intent: "none" },
    { say: "No quiero una habitación con vista al mar", intent: "none" },
    { say: "No puedo pagar en efectivo", intent: "none" },
    { say: "No quiero salir más tarde", intent: "none" },
    { say: "Mi tarjeta funciona bien", intent: "p_fine", not: ["hand_over", "keys_ctx", "pr_key"], step: "keys" },
    { say: "No hay ningún problema con mi habitación", intent: "p_fine", step: "p_report", not: ["pr_ac", "pr_hotwater", "pr_key", "pr_noisy", "pr_wifi", "pr_tv", "pr_towels"] },
    { say: "El agua no sale fría", intent: "none" },
    { say: "No quiero registrarme", intent: "none" },
    { say: "El desayuno no está incluido", intent: "none" },
    { say: "No quiero una habitación con dos camas", intent: "none" },
    // No free-text/name catch-all outside the question that requests it.
    { say: "Miller", intent: "none" },
    { say: "Mi perro toca la guitarra", intent: "none" },
    { say: "habitación plátano bicicleta azul", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
  ],
  sims: [
    { name: "happy path: reservation, spelling, breakfast and Wi-Fi", turns: ["Tengo una reservación", "Miller", "eme i ele ele e erre", "Sí, correcto", "Aquí tiene mi pasaporte", "Aquí tiene mi tarjeta", "Listo", "¿El desayuno está incluido?", "¿Cuál es la contraseña del wifi?", "Eso es todo", "¡Gracias!"],
      auto: HT_AUTO, setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = false; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { room: "412", nights: 3, idShown: true, cardGiven: true, signed: true, wifiSaid: true } } },
    { name: "questions, four nights and a change of checkout time", turns: ["Tengo una reservación a nombre de Miller", "eme i ele ele e erre", "No, reservé cuatro noches", "Aquí tiene mi pasaporte", "¿Para qué es el depósito?", "¿Aceptan tarjeta de débito?", "Aquí tiene mi tarjeta", "¿Dónde firmo?", "¿Puedo quedarme hasta las dos?", "Hasta las dos, por favor", "Hasta el mediodía está bien", "¿A qué hora es la salida?", "¿Puedo dejar mis maletas aquí después de salir?", "¿Me puede pedir un taxi para mañana?", "Mañana a las ocho", "Eso es todo", "Gracias"],
      auto: omit(["name", "spell", "found", "id", "card", "sign", "late", "anything", "taxi_time"]), setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = false; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { nights: 4, late: "noon" } } },
    { name: "walk-in, two nights, taxi and lodging tax", turns: ["¿Tienen habitaciones disponibles?", "Dos noches", "Me quedo con esa habitación", "Miller", "eme i ele ele e erre", "Aquí tiene mi pasaporte", "Aquí tiene mi tarjeta", "Listo", "¿Qué incluye el precio?", "¿Qué es el impuesto de hospedaje?", "¿Me puede pedir un taxi?", "Mañana al mediodía", "Eso es todo", "Gracias"],
      auto: omit(["walk_nights", "walk_offer", "name", "spell", "id", "card", "sign", "anything", "taxi_time"]), setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = false; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { kind: "walkin", nights: 2, roomChosen: true, taxi: true } } },
    { name: "walk-in: too expensive, choose the smaller room", turns: ["¿Tienen habitaciones disponibles?", "Dos noches", "Está demasiado caro", "Me quedo con esa habitación", "No necesito nada más", "Gracias"],
      auto: omit(["walk_nights", "walk_offer", "anything"]), setup: (s) => { s.mode = "checkin"; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { offer: "cheap", room: "305" } } },
    { name: "short answers at every check-in question", turns: ["Tengo una reserva", "Miller", "eme i ele ele e erre", "Sí", "Aquí tiene", "Aquí tiene", "Listo", "Una", "Eso es todo", "Gracias"],
      auto: {}, setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = true; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { keys: 1, signed: true } } },
    { name: "free ocean-view upgrade (twist forced)", turns: ["Tengo una reservación por tres noches", "Miller", "eme i ele ele e erre", "Aquí tiene mi pasaporte", "Aquí tiene mi tarjeta", "Listo", "Una", "¿En qué piso está mi habitación?", "Eso es todo", "Gracias"],
      auto: omit(["anything"]), setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = true; s.upgradeTwist = true; s.roomNotReady = false; }, expect: { complete: true, state: { room: "518", roomSaid: true } } },
    { name: "problem visit: AC broken, choose another room (twist forced)", turns: ["El aire acondicionado de mi habitación no funciona", "Quisiera cambiar de habitación", "No necesito nada más", "Gracias"],
      auto: omit(["p_report", "fan_or_room", "anything"]), setup: (s) => { s.mode = "problem"; }, expect: { complete: true, state: { reported: "ac", fixed: "move", room: "518" } } },
    { name: "problem visit: short fan choice (twist forced)", turns: ["El aire no funciona", "Un ventilador", "Eso es todo", "Gracias"],
      auto: omit(["p_report", "fan_or_room", "anything"]), setup: (s) => { s.mode = "problem"; }, expect: { complete: true, state: { reported: "ac", fixed: "fan" } } },
    { name: "room not ready, store bags and return at three (twist forced)", turns: ["Tengo una reservación por tres noches", "Miller", "eme i ele ele e erre", "Aquí tiene mi pasaporte", "Aquí tiene mi tarjeta", "Listo", "Una", "Sí, por favor", "Regreso a las tres", "Ya volví, ¿está lista mi habitación?", "Eso es todo", "Gracias"],
      auto: omit(["room_return", "anything"]), setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = true; s.roomNotReady = true; s.upgradeTwist = false; }, expect: { complete: true, state: { returned: true, roomSaid: true } } },
    { name: "cash deposit instead of a credit card", turns: ["Tengo una reservación por dos noches", "Miller", "eme i ele ele e erre", "Aquí tiene mi pasaporte", "No tengo tarjeta de crédito", "Aquí tiene el depósito en efectivo", "Listo", "¿Me puede pedir un taxi?", "A las siete, por favor", "Eso es todo", "Gracias"],
      auto: omit(["card", "anything", "taxi_time"]), setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = false; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { idShown: true, cardGiven: true, depositMethod: "cash" } } },
    { name: "late checkout offered, a taxi right now", turns: ["Tengo una reservación por tres noches", "Miller", "eme i ele ele e erre", "Aquí tiene mi pasaporte", "Aquí tiene mi tarjeta", "Listo", "Quisiera una salida tardía", "Al mediodía, gracias", "¿A qué hora es la salida?", "¿Me puede pedir un taxi?", "Ahorita, por favor", "Eso es todo", "Gracias"],
      auto: omit(["name", "spell", "id", "card", "sign", "late", "taxi_time", "anything"]), setup: (s) => { s.mode = "checkin"; s.askSpell = true; s.askKeys = false; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { late: "noon", taxi: true } } },
    { name: "card and passport handed over out of order", turns: ["Tengo una reservación por dos noches", "Aquí tiene mi tarjeta", "Aquí tiene mi pasaporte", "Eso es todo", "Gracias"],
      auto: HT_AUTO, setup: (s) => { s.mode = "checkin"; s.roomNotReady = false; s.upgradeTwist = false; }, expect: { complete: true, state: { idShown: true, cardGiven: true } } },
  ],
};

export default hotel;
