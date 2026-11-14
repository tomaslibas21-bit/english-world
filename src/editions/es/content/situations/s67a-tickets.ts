// NEEDS: None. Every merge, entity and pending question is local.
// Song 67 "Single or Return?" → Puerto Colibrí: "¿Sencillo o redondo?"
// Don Raúl at the ticket window of the Terminal de Autobuses (usted). Long-distance buses, as at Mexico's coach
// terminals: where to, one-way (sencillo) or round-trip (redondo), the return day, how many, which departure ("¿Para
// qué hora?"), a seat on the seat map ("¿Ventanilla o pasillo?"), an ID for the name on the ticket, the price, cash
// or card; then the departure time and the gate (andén). Discounts: seniors with an INAPAM card pay half all year;
// students and teachers only in the SEP's school vacations, so not in this (November) town (audit 5 Nov 2026).
// Twist (visits ≥ 1): the bus the learner picks is sold out; the next one is at 5:15 p.m. ("a las cinco y cuarto").
//
// Changes from the English edition (the brief): a bus, not a train; the class step (coach / business) is gone, since a
// Mexican coach is one class per departure, and the brief's seat choice takes its place (step `seat`); new steps
// `time` (which departure) and `name` (ID for the ticket); the delay twist became the brief's sold-out twist (step
// `soldout`). Track → andén. "Is this seat taken?" at the end gets Don Raúl's joke: seats are numbered on the bus.
//
// Research (Nov 2026, Mexico's coach lines on the Riviera Maya): tickets are sold "sencillo" or "redondo", for a given
// departure, with a numbered seat picked on a seat map and the passenger's name printed on the ticket; luggage goes
// under the bus with a claim tag, 25 kg free; seniors with an INAPAM card get half off all year (a few seats a bus);
// students (half) and teachers (a quarter) only in school vacations (summer 2026: 16 July–30 August). Fares and times
// below are this town's (round, plausible 2026 figures, not a timetable; ADO's Tulum–Cancún is ~$300–350, Tulum–Mérida
// ~$500–750 and ~4 h 20):
// Tulum $70 (30 min), Playa del Carmen $180 (1 h 30), Cancún $380 (2 h 30), Mérida $720 (5 h).

import type { Ctx, EntityDef, Handler, Pending, Segment, SituationDef, Tip } from "@/content/types";
import type { SlotFn } from "@/convo/grammar";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";
import { numberSlot } from "@/convo/slots";

/** A number of 10 or more really said as a number (an age: "tengo 67 años"). */
const bigNumber: SlotFn = (toks, pos, prefix) => numberSlot(toks, pos, prefix).filter((r) => !r.cost && typeof r.value === "number" && r.value >= 10);

// ---------------------------------------------------------------------------
// Destinations and the timetable

type Clock = { h: number; m: number };
interface Dest { fare: number; time: Clock; anden: number; dur: number; durLine: string; stops: string }

export const DESTS: EntityDef[] = [
  ent("tulum", "Tulum", "Tulum", "m", { art: "", forms: ["tulum", "tulun"], attrs: { fare: 7000, time: { h: 10, m: 15 }, anden: 2, dur: 30, durLine: "dur_tulum", stops: "" } }),
  ent("playa", "Playa del Carmen", "Playa del Carmen", "f", { art: "", forms: ["playa del carmen", "playa", "playa carmen", "playa de carmen"],
    attrs: { fare: 18000, time: { h: 10, m: 40 }, anden: 3, dur: 90, durLine: "dur_playa", stops: "stops_tulum" } }),
  ent("cancun", "Cancún", "Cancún", "m", { art: "", forms: ["cancun", "cancun centro", "el centro de cancun", "cancoon"],
    attrs: { fare: 38000, time: { h: 11, m: 5 }, anden: 1, dur: 150, durLine: "dur_cancun", stops: "stops_playa" } }),
  ent("merida", "Mérida", "Mérida", "f", { art: "", forms: ["merida", "merida yucatan"],
    attrs: { fare: 72000, time: { h: 11, m: 30 }, anden: 4, dur: 300, durLine: "dur_merida", stops: "stops_valladolid" } }),
];

/** Return days, only for echoing them ("regreso el domingo"). The grammar uses the built-in {day}. */
const WEEKDAYS: EntityDef[] = [
  ent("monday", "lunes", "Monday", "m"), ent("tuesday", "martes", "Tuesday", "m"), ent("wednesday", "miércoles", "Wednesday", "m"),
  ent("thursday", "jueves", "Thursday", "m"), ent("friday", "viernes", "Friday", "m"), ent("saturday", "sábado", "Saturday", "m"),
  ent("sunday", "domingo", "Sunday", "m"),
  ent("today", "hoy", "today", "m", { art: "" }), ent("tomorrow", "mañana", "tomorrow", "f", { art: "" }),
];
const WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const dest = (id: string) => DESTS.find((e) => e.id === id)!.attrs as Dest;
const LATE: Clock = { h: 17, m: 15 }; // the afternoon bus, on every route
const addMin = (t: Clock, min: number): Clock => ({ h: t.h + Math.floor((t.m + min) / 60), m: (t.m + min) % 60 });

/** A clock time as Don Raúl says it, with its article and the part of the day: "las 5:15 de la tarde". */
const HOURS = ["doce", "una", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve", "diez", "once"];
const MINS: Record<number, string> = { 5: "y cinco", 10: "y diez", 15: "y cuarto", 30: "y media", 35: "treinta y cinco", 40: "cuarenta" };
function clock(t: Clock): { en: string; lt: string; say: string } {
  const h12 = t.h % 12, hh = h12 === 0 ? 12 : h12, art = h12 === 1 ? "la" : "las";
  const part = t.h < 12 ? "de la mañana" : t.h < 19 ? "de la tarde" : "de la noche";
  const mm = String(t.m).padStart(2, "0");
  let say: string;
  if (t.m === 0) say = `${art} ${HOURS[h12]}`;
  else if (t.m === 45) { const n = (h12 + 1) % 12; say = `cuarto para ${n === 1 ? "la" : "las"} ${HOURS[n]}`; }
  else say = `${art} ${HOURS[h12]} ${MINS[t.m] ?? String(t.m)}`;
  return { en: `${art} ${hh}:${mm} ${part}`, lt: `${hh}:${mm} ${t.h < 12 ? "AM" : "PM"}`, say: `${say} ${part}` };
}

// ---------------------------------------------------------------------------
// State helpers

/** The morning bus is full (twist: `full` holds that bus's destination) and the learner travels there today. */
const fullNow = (c: Ctx) => !!c.s.full && c.s.full === c.s.dest && (!c.s.travel || c.s.travel === "today");
const TODAY = ["today", "tonight", "this_afternoon", "this_morning"];
const isToday = (day: string) => TODAY.includes(day);
const depTime = (c: Ctx): Clock | undefined => (c.s.dest ? (c.s.dep === "late" ? LATE : dest(c.s.dest).time) : undefined);
const count = (c: Ctx) => (c.s.count as number | undefined) ?? 1;

/** A senior with the INAPAM card pays half of their own ticket. */
function price(destId: string, trip: string, disc: string | undefined, n: number): number {
  const one = dest(destId).fare * (trip === "round" ? 2 : 1);
  return one * n - (disc ? Math.round(one / 2) : 0);
}
const total = (c: Ctx) => price(c.s.dest, c.s.trip ?? "oneway", c.s.disc, count(c));

function countOf(tags: string[], num?: number): number | undefined {
  if (typeof num === "number" && num >= 1 && num <= 9) return num;
  for (const [tag, n] of [["n1", 1], ["n2", 2], ["n3", 3], ["n4", 4]] as const) if (tags.includes(tag)) return n;
  return undefined;
}
function tripOf(tags: string[]): "oneway" | "round" | undefined {
  if (tags.includes("round")) return "round";
  if (tags.includes("oneway")) return "oneway";
  return undefined;
}
/** Collect all tags of a segment, including the ones inside slot values. */
function allTags(slots: any, seg: { tags: string[] }): string[] {
  const out = [...seg.tags];
  const walk = (v: any) => { if (v && typeof v === "object") { if (Array.isArray(v.__tags)) out.push(...v.__tags); for (const [k, x] of Object.entries(v)) if (k !== "__tags") walk(x); } };
  walk(slots);
  return out;
}
/** Which departure a said clock time means ("las cinco" = the 5:15; "las once" = Mérida's 11:30), if any. */
function depOf(c: Ctx, tm: { h: number; m: number; ampm?: string } | undefined): "first" | "late" | undefined {
  if (!tm || !c.s.dest) return undefined;
  const near = (a: Clock) => {
    if (tm.ampm === "am" && a.h >= 12) return false;
    if (tm.ampm === "pm" && a.h < 12) return false;
    const x = (tm.h % 12) * 60 + tm.m, y = (a.h % 12) * 60 + a.m;
    return Math.abs(x - y) <= 30;
  };
  if (near(dest(c.s.dest).time)) return "first";
  if (near(LATE)) return "late";
  return undefined;
}
/** The departure an answer about another day names: "en la tarde" / "a las cinco" = the 5:15, "en la mañana" / "el
 *  primero" = the first bus, a clock time near neither = undefined, nothing said = `dflt`. */
function wantedDep(c: Ctx, slots: any, seg: { tags: string[] }, dflt: "first" | "late"): "first" | "late" | undefined {
  const tags = allTags(slots, seg);
  if (tags.includes("late") || tags.includes("afternoon") || tags.includes("evening")) return "late";
  if (tags.includes("first") || tags.includes("morning")) return "first";
  if (slots.time) return depOf(c, slots.time);
  return dflt;
}

const TIPS: Record<string, Tip> = {
  tu_staff: { key: "tu_staff", lt: "Understood! With staff, usted is more polite: me da, puede (me das and puedes are for friends).", better: "¿Me da un boleto a Tulum?" },
  ventanilla: { key: "ventanilla", lt: "Understood! On a bus or a plane, the window seat is la ventanilla.", better: "Ventanilla, por favor." },
  anden: { key: "anden", lt: "Understood! At a Mexican bus station the buses leave from an andén (gate).", better: "¿De qué andén sale?" },
};

// Automatic answers the simulation uses when Don Raúl asks an optional question.
const AUTO: Record<string, string> = {
  dest: "Un boleto a Tulum, por favor.", count: "Solo uno.", trip: "Redondo, por favor.", ret: "El domingo.",
  travel_day: "Sí, hoy.", time: "El próximo, por favor.", sold_out: "Sí, está bien.", seat: "Ventanilla, por favor.",
  name: "Aquí tiene mi pasaporte.", discount: "No, ninguna.", student_id: "Aquí tiene.", pay: "Con tarjeta.",
  ticket: "Gracias.", info: "No, es todo, gracias.", other_name: "Ana Miller.",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));
const FIXED = { askCount: false, askDay: false, askDiscount: false, askSeat: true, soldTwist: false, hay: false };

// ---------------------------------------------------------------------------

export const tickets: SituationDef = {
  id: "s67a-tickets",
  song: 67,
  songTitle: "Single or Return?",
  title: { en: "¿Sencillo o redondo?", lt: "One-way or round-trip?" },
  topic: { en: "Un boleto de autobús", lt: "Buying a bus ticket" },
  chapter: 6,
  order: 1,
  location: "station",
  npc: "walter",
  goal: "Buy a long-distance bus ticket, choose your departure and your seat, and find out when your bus leaves and from which gate.",
  intro: "You're at the ticket window of Puerto Colibrí's bus station. Don Raúl sells tickets to Tulum, Playa del Carmen, Cancún, and Mérida. A one-way ticket is \"sencillo\", a round-trip one \"redondo\", and buses leave from an \"andén\" (gate). Prices are in Mexican pesos.",
  entities: { dest: DESTS, weekday: WEEKDAYS },

  grammar: {
    macros: {
      buy_pre: "(quiero | quisiera | queremos | quisieramos | necesito | necesitamos | me da | deme | me vende | me gustaria | voy a querer | me pone | ponme | me puede dar | me podria dar | me das #tip:tu_staff | dame #tip:tu_staff | me vendes #tip:tu_staff | me puedes dar #tip:tu_staff)",
      tk: "(boleto | boletos | billete | billetes | pasaje | pasajes)",
      cnt: "(un #n1 | uno #n1 | dos #n2 | tres #n3 | cuatro #n4)",
      trip: "(sencillo #oneway | sencillos #oneway | de ida #oneway | solo de ida #oneway | solo ida #oneway | nomas de ida #oneway | nomas ida #oneway | viaje sencillo #oneway | redondo #round | redondos #round | viaje redondo #round | de ida y vuelta #round | ida y vuelta #round | de ida y regreso #round | ida y regreso #round)",
      bus: "(autobus | camion | bus | autocar)",
      to: "(a | para | hacia | hasta)",
      // "para el de las diez y cuarto", "para el próximo"
      dep: "((para | en) el [@bus] de {time} | (para | a) {time} | (para | en) el (proximo | siguiente | primero) [@bus] #first)",
      pref: "(quiero | prefiero | quisiera | deme | me da | mejor | voy a querer | dame #tip:tu_staff | me das #tip:tu_staff)",
      kin: "(esposa | esposo | pareja | amigo | amiga | hijo | hija | mama | papa | novia | novio | hermano | hermana | mujer | marido)",
    },
    slots: { bignum: { fn: bigNumber } },
  },

  intents: {
    buy: { patterns: [
      "@cnt @tk [@trip] @to {dest} [@trip] [[para] {day}] [@dep] #h:b_one",
      "(quisiera | me gustaria) [@cnt] @tk [@trip] @to {dest} [@trip] [[para] {day}] [@dep] #h:b_quisiera",
      "(me da | deme | me vende | me puede dar | me podria dar) [@cnt] @tk [@trip] @to {dest} [@trip] [[para] {day}] [@dep] #h:b_me_da",
      "@cnt @tk redondo @to {dest} [[para] {day}] [@dep] #round #h:b_round",
      "[un | uno] @trip @to {dest} [[para] {day}] [@dep] #h:b_oneway",
      "@cnt @tk @to {dest} #h:b_two",
      "(voy | vamos | viajo | viajamos) @to {dest} [[para] {day}] #h:b_going",
      "(tiene | tienen | hay | quedan | tienes #tip:tu_staff) [@cnt] @tk @to {dest} [[para] {day}] #h:b_tiene",
      "@buy_pre [@cnt] @tk [@trip] @to {dest} [@trip] [[para] {day}] [@dep]",
      "@buy_pre [@cnt] @tk [@trip] @dep @to {dest} [@trip]",
      "[@cnt] @tk [@trip] @dep @to {dest} [@trip]",
      "@buy_pre [@cnt] [@trip] @to {dest} [@trip] [[para] {day}]",
      "(necesito | quiero | queremos | necesitamos | tengo que) (ir | viajar) @to {dest} [[para] {day}] [@dep]",
      "@buy_pre [@cnt] @tk @to {dest} para (dos personas #n2 | tres personas #n3 | cuatro personas #n4 | una persona #n1)",
      "[@cnt] @tk @to {dest} para (dos personas #n2 | tres personas #n3 | cuatro personas #n4 | una persona #n1)",
      "@to {dest} (dos #n2 | tres #n3 | cuatro #n4) (boletos | personas)",
    ] },
    // (a ticket word stays: "quiero ir a comer" is not a destination)
    buy_unknown: { patterns: ["[@buy_pre] [@cnt] @tk [@trip] (a | para) {w:any}", "(hay | tiene | tienen) (salidas | autobuses | camiones) (a | para) {w:any}"] },
    dest_ctx: { patterns: ["[a | para] {dest} [@trip]", "{dest} [@trip] [nada mas]"] },
    // "no a Cancún" is also "No, a Cancún" (commas are lost): #bare, read as a correction when Cancún is a new place
    not_dest: { patterns: ["no (voy | vamos) (a | para) {dest}", "no (quiero | queremos) (ir | viajar) (a | para) {dest}", "no (quiero | necesito) (un | el | ningun) @tk (a | para) {dest}", "no [a | para] {dest} #bare"] },
    trip_ans: { patterns: [
      "[un | uno] @trip #h:t_short",
      "(quiero | lo quiero | quisiera | que sea | va a ser | deme | me da) [un | uno] @trip",
      // "Quiero un boleto redondo", "Dos boletos sencillos" (read as a place "redondo" before the audit)
      "[@buy_pre] [@cnt | el] @tk @trip",
      "(solo | nomas | nada mas | solamente) (ida | de ida | para ir) #oneway #h:t_ida",
      "[@trip] (regreso | vuelvo | regresamos | volvemos | voy a regresar) {day} #round #h:ret_coming",
      "@trip [y] (regreso | vuelvo | regresamos | volvemos) {day} #round",
      "(no voy a | no vamos a | no pienso) (regresar | volver) #oneway",
      "(me quedo | nos quedamos) (alla | ahi) [@trip] #oneway", "@trip (me quedo | nos quedamos) alla #oneway",
      "(no (sencillo | de ida | solo de ida | solo ida)) [sino] (redondo | de ida y vuelta | ida y vuelta) #round",
      "(no (redondo | de ida y vuelta | ida y vuelta)) [sino] (sencillo | de ida | solo de ida | solo ida) #oneway",
      // commas are lost: "sencillo no, redondo" / "sencillo, no redondo" read the same (rule 10): ask again
      "(sencillo | de ida | redondo | de ida y vuelta) no (sencillo | de ida | redondo | de ida y vuelta) #amb",
      "no (sencillo | de ida | redondo | de ida y vuelta) #amb",
    ] },
    count_ctx: { patterns: [
      "(solo | nada mas | nomas | solamente) (uno | un boleto | yo) #n1 #h:c_one",
      "somos {number} #h:c_two", "no somos {number}", "{number} [boletos | pasajeros | personas | adultos]", "(una persona | un adulto | un pasajero) #n1",
      "(para | solo para) mi #n1", "(viajo | voy) (solo | sola) #n1", "si [voy | viajo] (solo | sola) #n1",
      "[para] (mi | yo) y mi @kin #n2", "[no] (voy | viajo | vamos) con mi @kin #n2",
      "no (viajo | voy) (solo | sola) #more", "(uno | un boleto) para mi y (otro | uno) para mi @kin #n2",
    ] },
    ret_ctx: { patterns: [
      "{day} [(en | por) la (manana | tarde | noche)] [(a | como a) {time}] #h:r_day",
      "(regreso | vuelvo | regresamos | volvemos | voy a regresar | regresaria) {day} [(en | por) la (manana | tarde | noche)] [(a | como a) {time}] #h:r_coming",
      "[el] {date}", "(regreso | vuelvo | regresamos) [el] {date}",
      "[regreso | vuelvo] el mismo dia #sameday", "[regreso | vuelvo] al dia siguiente #nextday",
      "[regreso | vuelvo] (en | dentro de) (una semana | dos dias | tres dias | unos dias | {number} dias | quince dias | un mes | dos semanas) #later",
      // "se" is a droppable word: inside ( | ) it could go, and a bare "No" or the "no" of "No, el domingo" meant "I don't
      // know" (a one-way ticket). Written plainly, the last word of a pattern always stays.
      "(todavia | aun) no [se | lo se] [cuando (regreso | vuelvo | regresamos | volvemos | voy a regresar)] #open #h:r_not_sure", "no se todavia #open", "no estoy (seguro | segura) [todavia] #open",
      "no se [cuando (regreso | vuelvo | regresamos | volvemos | voy a regresar)] #open", "no lo se [cuando (regreso | vuelvo | regresamos | volvemos | voy a regresar)] #open",
      "{day} mismo", "(ese | el) mismo dia #sameday",
      "(lo dejo | dejelo | dejarlo) abierto #open", "no tengo fecha [de regreso] #open",
      "no {wrong:day} [sino] {day}", "{day} no {wrong:day} #amb", "{day} no #amb",
    ] },
    travel_ctx: { patterns: [
      "[para] {day} #h:tr_day", "[para] {day} mismo", "(viajo | voy | salgo | me voy | nos vamos | viajamos) {day}",
      "(mejor | prefiero) [para] {day}", "no [para] {wrong:day} [sino] [para] {day}", "{wrong:day} no [sino] [para] {day} #amb",
    ] },
    time_ctx: { patterns: [
      "[@pref] [el] [@bus] de {time} #h:tm_at", "[@pref] (a | para) {time} #h:tm_at", "{time}", "{day} [a | el de] {time}",
      "[@pref] [para] {day} (en | por) la (tarde #late | manana #first)", // "Hoy en la tarde": one answer, not a day and a time
      "[@pref] el (proximo | siguiente | primero | que sigue | mas temprano | de la manana) [@bus] #first #h:tm_next",
      "[@pref] el (primer | proximo | siguiente) @bus #first",
      "[@pref] el (de la tarde | ultimo | mas tarde | otro | segundo) #late #h:tm_late",
      "[@pref] (en | por) la manana #first", "[@pref] (en | por) la tarde #late",
      "el primero que (salga | sale | haya) #first", "lo (antes | mas pronto) posible #first", "(ahorita | ahora | ya) [mismo] #first", "el que sale (ahorita | ahora | primero | mas pronto) #first",
      "no el (de la manana | proximo | primero) [sino] el (de la tarde | otro | ultimo) #late",
      "no el (de la tarde | ultimo) [sino] el (de la manana | proximo | primero) #first",
      "el (de la manana | proximo | primero) no (mejor | sino) el (de la tarde | otro | ultimo) #late",
      "el (de la tarde | ultimo) no (mejor | sino) el (de la manana | proximo | primero) #first",
      // commas are lost: "el de la mañana no, el de la tarde" / "el de la mañana, no el de la tarde" (rule 10): ask again
      "el (de la manana | proximo | primero | de la tarde | ultimo) no el (de la manana | proximo | primero | de la tarde | ultimo) #amb",
      "no (a | el de) {wrong:time} [sino] [a | el de] {time}",
    ] },
    // "¿Hay uno más tarde?" at the departure question: both departures again
    // (and "¿A qué hora sale el último / el primero?": a question, never "el último" chosen; #sched)
    ask_other_ctx: { patterns: ["(hay | tiene | tienen) (uno | otro | algo | alguno) (mas tarde #later | despues #later | en la tarde #later | en la noche #later | mas temprano #earlier | antes #earlier)", "(que | cuales) otros horarios (hay | tiene | tienen)",
      "(a que hora | cuando) (sale | es | pasa) el (ultimo | primer | primero) [@bus] #sched", "(cual | cuando) es el (ultimo | primer | primero) [@bus] #sched"] },
    // the sold-out bus: take the 5:15 ("Ni modo, deme ese"), or ask for an earlier one
    accept_ctx: { patterns: [
      // (#late: at tomorrow's offer, "deme el de la tarde" is tomorrow's 5:15; at the sold-out question every one is the 5:15)
      "[ni modo] [esta bien | de acuerdo | ok | va | sale] (deme | me da | dame | denos) (ese | ese entonces | el otro #late | el de la tarde #late) #h:so_ok",
      "ni modo [deme | me da] [el] [@bus] de {time}", "ni modo [deme | me da] el (de la tarde #late | otro #late)",
      "ni modo", "(ese | el de la tarde #late | el otro #late) esta bien", "[esta bien | ni modo] me espero", "[si] (lo | me lo) llevo", "(acepto | lo tomo)",
    ] },
    // "No, esa hora no me sirve" at the sold-out question: a no to the 5:15
    late_no_ctx: { patterns: [
      "[no] (esa hora | ese | ese no | el de la tarde | a esa hora) no me (sirve | conviene | queda)", "[no] no me (sirve | conviene | queda) [esa hora | ese | a esa hora | tan tarde]",
      "[no] (es | esta | sale) (muy | demasiado) tarde [para mi | para nosotros]", "[no] (no puedo | no podemos) (a esa hora | tan tarde | en la tarde | a las cinco)",
    ] },
    // "Mañana no puedo" at tomorrow's offer: a no
    tomorrow_no_ctx: { patterns: ["[no] manana no [puedo | podemos | me sirve | me conviene]", "[no] (no puedo | no podemos) manana", "[no] tiene que ser hoy", "[no] (necesito | tengo que) (ir | viajar | llegar) hoy"] },
    ask_earlier_ctx: { patterns: [
      "(no hay | hay) (otro | alguno | uno | otro autobus | algo) (antes | mas temprano) #h:so_earlier",
      "no (hay | tiene | tienen) (nada | algo | ninguno) (antes | mas temprano)",
      "(tiene | tienen) (algo | otro | uno) (antes | mas temprano)", "(y | no hay) (otro | uno) mas temprano",
    ] },
    seat_ans: { patterns: [
      "[@pref] [en] [la] ventanilla #window #h:s_window", "[@pref] [en] [la] ventana #window #tip:ventanilla",
      "[@pref] [en] [el] pasillo #aisle #h:s_aisle", "[@pref] (del lado de | junto a) la (ventanilla | ventana) #window", "[@pref] del lado del pasillo #aisle",
      "(me da igual | me es igual | da igual | cualquiera | el que sea | donde sea | no importa | lo que sea | el que tenga | cualquier lugar | cualquier asiento) #any #h:s_any",
      "[@pref] juntos #together #h:s_together", "(queremos | quisieramos | podemos) (sentarnos | ir | estar) juntos #together",
      "[@pref] (adelante | hasta adelante | al frente | cerca del chofer | cerca del conductor) [si se puede] #front",
      "[@pref] (atras | hasta atras | al fondo) [si se puede] #back",
      "no [la] (ventanilla | ventana) [sino] [el] pasillo #aisle", "no [el] pasillo [sino] [la] (ventanilla | ventana) #window",
      "[la] (ventanilla | ventana) no (mejor | sino) [el] pasillo #aisle", "[el] pasillo no (mejor | sino) [la] (ventanilla | ventana) #window",
      "[@pref] cerca de la (ventanilla | ventana) #window",
    ] },
    seat_not_ctx: { patterns: ["no (quiero | me gusta) [la] (ventanilla | ventana) #aisle", "no (quiero | me gusta) [el] pasillo #window",
      "[la] (ventanilla | ventana) no #aisle", "[el] pasillo no #window"] },
    name_ctx: { patterns: ["[a nombre de | me llamo | mi nombre es | soy | es] {name} #h:id_name", "a nombre de {name} {name2:name}"] },
    show_id: { patterns: [
      "(aqui (tiene | esta) | tome | tenga | le doy | le presto) (mi | el) (pasaporte #passport | identificacion #doc | ine #doc | credencial de elector #doc | licencia #doc | licencia de manejo #doc) #h:id_here",
      "(aqui (tiene | esta) | tome | tenga | le doy) mi credencial (de estudiante #student | del inapam #senior) #h:here_id",
      "(aqui (tiene | esta) | tome | tenga | le doy) mi credencial #card", "(aqui (tiene | esta) | tome | tenga | le doy) mi carne [de estudiante] #card",
      // "Tengo mi licencia": a statement, but at the ID check it offers the ID (a slip once read it as "Tenga…")
      "(tengo | traigo) (mi | el) (pasaporte #passport | identificacion #doc | ine #doc | credencial de elector #doc | licencia #doc | licencia de manejo #doc)",
    ] },
    here_you_go_ctx: { patterns: ["(aqui tiene | aqui esta | tome | tenga | aqui lo tiene | aqui la tiene | aqui le doy) #h:here_you_go", "aqui tienes #tip:tu_staff"] },
    id_q: { patterns: ["(le sirve | sirve | esta bien | puedo usar) [mi | el] pasaporte #h:id_ok", "(necesita | quiere | ocupa) [ver] mi (pasaporte | identificacion)",
      "(necesita | hace falta) (identificacion | una identificacion | mi pasaporte)", "solo tengo [mi] pasaporte", "para que (necesita | quiere) mi (pasaporte | identificacion)"] },
    no_id: { patterns: [
      "no (traigo | tengo | llevo) [mi | una | la | el] (pasaporte | identificacion | documentacion | credencial | carne | ine) [conmigo | aqui] #h:id_none",
      "no (la | lo) (traigo | tengo | llevo) [conmigo | aqui]", "(lo | la) (dejé | olvidé) en (el hotel | la casa | casa)",
      "se me olvidó [mi | el | la] (pasaporte | identificacion | credencial)", "(lo | la) (tengo | traigo) en (el hotel | la casa | casa)", "(se quedó | esta) en (el hotel | la casa | casa)", "(dejé | olvidé) mi (pasaporte | identificacion | credencial) en (el hotel | la casa | casa)",
    ] },
    discount_ask: { patterns: [
      "(hay | tienen | tiene | hacen | dan | manejan) descuento [para | de] (estudiantes #student | estudiante #student) #h:q_student",
      // teachers: in Mexico only in school vacations, and less than half (rule 14: vague, never the student half)
      "(hay | tienen | tiene | hacen | dan | manejan) descuento [para | de] (maestros | maestro | maestras | profesores | docentes) #teacher",
      "(hay | tienen | tiene | hacen | dan | manejan) descuento [para | de] (adultos mayores #senior | la tercera edad #senior | personas mayores #senior | jubilados #senior | inapam #senior) #h:q_senior",
      "(hay | tienen | tiene | hacen | dan | manejan) descuento [para | de] (ninos #child | menores #child)",
      "cuanto (cuesta | es | sale | pagan) (para | los) (ninos | menores) #child", "(los ninos | un nino | una nina) (pagan | paga) [boleto | completo | boleto completo] #child",
      "(hay | tienen | hacen | dan) (algun | un) descuento", "(hay | tienen | manejan) descuentos",
      "(los estudiantes #student | los adultos mayores #senior | los ninos #child) (tienen | pagan) (descuento | menos)",
      "(puedo | podemos) tener (un | algun) descuento", "aceptan (la credencial de estudiante #student | la credencial del inapam #senior | inapam #senior)",
    ] },
    discount_claim: { patterns: [
      "soy estudiante #student #h:im_student", "(somos | los dos somos) estudiantes #student",
      "(soy | somos) (maestro | maestra | maestros | maestras | profesor | profesora | profesores | docente) #teacher",
      "tengo [la] credencial del inapam #senior #h:im_senior", "tengo [mi] credencial de estudiante #student",
      "soy (jubilado | jubilada | adulto mayor | adulta mayor | pensionado | pensionada) #senior",
      "(somos | los dos somos) (jubilados | jubiladas | adultos mayores | pensionados) #senior",
      "tengo {age:bignum} anos",
    ] },
    // "¿Tiene credencial de estudiante o del INAPAM?" "Sí, de estudiante."
    disc_kind_ctx: { patterns: ["[si] [la] (de estudiante #student | del inapam #senior | de adulto mayor #senior)"] },
    no_discount_ctx: { patterns: [
      "[no] (ninguna | ninguno | nada de eso) #h:no_discount", "[no] ninguna de las dos", "no soy (estudiante | jubilado | jubilada | adulto mayor | adulta mayor | maestro | maestra)",
      "no tengo (credencial | ninguna credencial | ninguna | descuento)", "(no soy | tampoco soy) ni estudiante ni (jubilado | jubilada | adulto mayor | adulta mayor)",
      "(soy | somos) (adulto | adulta | adultos) [normal | normales]", "no (somos | soy) (estudiantes | jubilados)",
    ] },
    pay_card: { patterns: [
      "(con | en) tarjeta [de credito | de debito] #h:pay_card_short", "tarjeta [de credito | de debito]",
      "(puedo | se puede | podemos) pagar con tarjeta [de credito | de debito] #h:pay_card",
      "(aceptan | toman | reciben) (tarjeta | tarjetas | visa | mastercard | american express | tarjeta de credito | tarjeta de debito)",
      "(pago | voy a pagar | le pago | quiero pagar | prefiero pagar) con tarjeta [de credito | de debito]",
      "no (traigo | tengo | cargo) efectivo [pago con tarjeta]", "(puedo pagar | pago | se puede pagar | quiero pagar) con (el celular | mi celular | apple pay | google pay) #phone",
      "(con | desde) (el celular | mi celular | apple pay | google pay) #phone",
      "mejor (con | en) tarjeta [de credito | de debito]", "(se puede | puedo) con tarjeta",
      // "No en efectivo, con tarjeta": the second is the answer; "Efectivo no, con tarjeta" with mejor/sino
      "no (en | con) efectivo [sino] (con | en) tarjeta", "[en] efectivo no (mejor | sino) (con | en) tarjeta",
      // commas are lost: "Con tarjeta no, en efectivo" / "Con tarjeta, no en efectivo" (rule 10): ask again
      "(con | en) tarjeta no [en | con] efectivo #amb", "[en] efectivo no (con | en) tarjeta #amb",
    ] },
    pay_cash: { patterns: [
      "[en] efectivo #h:pay_cash", "(pago | le pago | voy a pagar | quiero pagar | prefiero pagar) en efectivo",
      "(puedo | se puede) pagar en efectivo", "no (traigo | tengo) tarjeta [pago en efectivo]", "(aceptan | toman) efectivo",
      "mejor [en] efectivo", "no (con | en) tarjeta [sino] [en | con] efectivo", "(con | en) tarjeta no (mejor | sino) [en] efectivo",
    ] },
    ask_dollars: { patterns: ["(aceptan | toman | reciben) (dolares | dolares americanos)", "(puedo | se puede) pagar (en | con) dolares", "(tiene | hay) cambio de dolares",
      "(pago | le pago | quiero pagar | voy a pagar | prefiero pagar) (en | con) dolares", "(solo | nada mas | nomas) (tengo | traigo) dolares"] },
    ask_next: { patterns: [
      "(a que hora | cuando) sale [el | mi | nuestro] [@bus] #h:q_time",
      "(a que hora | cuando) sale el (proximo | siguiente) [@bus] [@to {dest}] #h:q_next",
      "(a que hora | cuando) sale [el] @bus @to {dest}",
      "(a que hora | cuando) (es | sale) mi (salida | autobus | camion)",
      "(hay | sale) [algun] @bus @to {dest} [hoy | manana]",
      "(a que hora | cuando) (hay | tienen) (@bus | autobuses | salidas | salida) @to {dest}",
      "(cuales | que) (horarios | salidas) (tiene | hay | tienen) [@to {dest}]",
      "(a que hora | cuando) (sale | es | pasa) el (ultimo | primer | primero) [@bus] [@to {dest}] #sched", "(cual | cuando) es el (ultimo | primer | primero) [@bus] [@to {dest}] #sched",
    ] },
    ask_track: { patterns: [
      "(de | en | por) (que | cual) anden (sale | es | se sube | me subo | lo tomo) #h:q_track", "(de | en) (que | cual) anden",
      "(que | cual) anden [es]", "(cual | que) es (mi | el) anden",
      "(de | en) que (sala | puerta) sale", "(donde | por donde) (tomo | abordo | agarro) (el autobus | el camion | mi autobus)",
      "(donde | por donde) me subo [al autobus | al camion]", "(donde | por donde) (se toma | se aborda | sale) [el @bus]",
      "(de | en) (que | cual) plataforma [sale] #tip:anden", "(donde | por donde) (esta | queda) [el | mi] anden",
    ] },
    ask_change: { patterns: [
      "es directo #direct #h:q_direct", "(el autobus | el camion) es directo #direct", "es (un autobus | un viaje) directo #direct",
      "(tengo | hay | tenemos) que (cambiar | transbordar | cambiarme) [de @bus] #change #h:q_change",
      "(hay | tiene) (transbordo | conexion) #change", "(hace | tiene) (paradas | escalas) #stops", "(se para | para) en (el camino | algun lado) #stops",
    ] },
    ask_duration: { patterns: [
      "cuanto (tiempo | tiempo se) (tarda | dura | hace | hago) [el viaje | el @bus] [@to {dest}] #h:q_long",
      "cuanto (tarda | dura | se hace | se tarda | hace) [el viaje | el @bus] [@to {dest}]",
      "cuantas horas (son | es | hay | hace) [de viaje] [@to {dest}]",
      "(a que hora | cuando) llega [el @bus] [a {dest}] #arrive #h:q_arrive", "a que hora (llegamos | llego) [a {dest}] #arrive",
      "(esta | queda) lejos [{dest}]",
    ] },
    ask_price: { patterns: [
      "cuanto (cuesta | es | sale | vale | cobra) [el | un] [boleto | pasaje | billete] [@trip] [@to {dest}] #h:q_price",
      "(cual | que) es el precio [del boleto] [@to {dest}]", "(a como | cuanto) (esta | sale) el (boleto | pasaje) [@to {dest}]",
      "cuanto (cuesta | es) (el | un) (sencillo | redondo) [@to {dest}]", "cuanto (cuesta | sale | es) (ir | viajar) @to {dest}", "(y | cuanto) el (redondo | sencillo)",
      "cuanto (le debo | le doy | le pago | seria | va a ser | es en total | seria en total | sale en total | es todo | seria todo)",
    ] },
    ask_diff: { patterns: ["cual es la diferencia [de precio]", "cuanto mas (cuesta | es) el redondo"] },
    ask_dests: { patterns: ["(a donde | adonde | para donde) (van | salen | hay) [los] [autobuses | camiones | salidas]", "(que | cuales) (destinos | rutas | lugares) (tienen | hay | manejan)",
      "(a donde | adonde | para donde) (tienen | tiene) [salidas | autobuses | camiones | viajes]",
      "a donde (puedo | se puede) ir [desde aqui]", "(a que | que) (ciudades | lugares) (van | hay)"] },
    ask_ontime: { patterns: ["(sale | va | viene | llega) (a tiempo | puntual) #h:q_ontime", "(hay | tiene) (retraso | retrasos | demora)", "(viene | va | esta) (retrasado | atrasado | tarde)"] },
    ask_wait: { patterns: ["donde (puedo | debo | tengo que) esperar #h:q_wait", "(donde esta | hay) [una | la] sala de espera", "(donde | por donde) (espero | me espero)"] },
    ask_coffee: { patterns: ["(donde | hay donde) (puedo | se puede) comprar (algo de comer | comida | agua | un cafe | algo)", "(hay | donde hay) (una tienda | una tiendita | un cafe | una cafeteria | comida | algo de comer)",
      "donde (compro | consigo) (agua | comida | un cafe | algo de comer)"] },
    ask_food: { patterns: ["(venden | dan | hay) (comida | algo de comer | botanas | bebidas) (en el autobus | a bordo)", "(puedo | se puede) comer en el autobus"] },
    ask_wifi: { patterns: ["(el @bus | el autobus) (tiene | trae) (wifi | internet | aire acondicionado | aire | bano)", "(tiene | trae | hay) (wifi | internet | aire acondicionado | aire | bano) (el @bus | en el @bus | a bordo)",
      "(hay | tiene) wifi"] },
    ask_restroom: { patterns: ["(donde | por donde) (esta | estan | queda | quedan) (el bano | los banos | el sanitario | los sanitarios | el aseo | los aseos | el servicio) #h:q_restroom",
      "(hay | tienen) (bano | banos | sanitarios) [aqui]"] },
    ask_schedule: { patterns: ["(me da | tiene | hay) (los horarios | un horario | el horario)", "(cuales | que) son los horarios"] },
    ask_luggage: { patterns: [
      "(puedo | podemos) llevar (mi maleta | maletas | mi mochila | equipaje | mi equipaje | mis maletas) #h:q_luggage",
      "(donde | como) (documento | dejo | pongo | va) (mi maleta | mis maletas | el equipaje | mi equipaje)", "que hago con (mi maleta | mis maletas | el equipaje)",
      "cuantas maletas (puedo | podemos | se pueden) (llevar | documentar | subir) #limit", "(hay que | tengo que) documentar (la maleta | el equipaje | mi maleta)",
      "cuanto equipaje (puedo | podemos | se puede) llevar #limit", "cuantos kilos (puedo | podemos | se pueden) llevar #limit",
      "(hay | tienen | cual es el) (limite | un limite) de (equipaje | peso | kilos | maletas) #limit",
    ] },
    ask_early: { patterns: [
      "(con cuanto tiempo | cuanto tiempo) (antes | de anticipacion) (tengo que | debo | hay que) (llegar | estar aqui | estar) #h:q_early",
      "a que hora (tengo que | debo | hay que) (llegar | estar aqui | presentarme)", "(cuando | a que hora) (abordo | se aborda | empiezan a abordar)",
    ] },
    ask_seat: { patterns: ["(los asientos | los lugares) (son | estan) numerados #numbered", "el asiento (viene | esta) en el boleto #numbered", "(tengo | hay) asiento asignado #numbered",
      "(me puedo | puedo) sentar (donde sea | donde quiera | en cualquier lugar) #anywhere"] },
    seat_taken: { patterns: ["(esta) (ocupado | libre | desocupado) (este | ese) (asiento | lugar | sitio) #h:seat_taken", "(este | ese) (asiento | lugar | sitio) (esta) (ocupado | libre | desocupado) #h:seat_free",
      "(hay | esta) alguien (aqui | sentado aqui)"] },
    question_ctx: { patterns: ["[si] (una pregunta | tengo una pregunta | una duda | tengo una duda | una cosa mas | otra cosa | otra pregunta)"] },
    more_no: { patterns: ["(eso | esto) (es | seria | fue) todo [por ahora]", "(es | seria) todo [por ahora]", "(nada | ninguna) mas", "(ya | asi) estoy bien", "no necesito nada mas", "ya con eso", "con eso (es | esta) bien"] },
    ok_thanks: { patterns: ["[ok | esta bien | que bueno | bueno] gracias por (avisarme | avisar | decirme | la informacion)", "(que mala suerte | que lastima)"] },
    // the learner repeats the time / gate back ("Andén dos, a las diez y cuarto")
    echo_info: { patterns: ["[entonces] anden {number} [a {time}]", "[entonces] a {time} [del | en el | por el] anden {number}", "entonces (a | el de) {time}"] },
    change_trip: { patterns: [
      "(mejor | siempre no mejor | siempre no) [un | uno | el] @trip", "@trip mejor", "(prefiero | quiero) mejor [un | el] @trip",
      "(me lo puede | lo puede | puede | me lo podria) cambiar a @trip", "cambielo a @trip", "(lo puedo | puedo) cambiar a @trip",
    ] },
    change_dest: { patterns: [
      "(mejor | siempre no mejor | siempre no) (a | para) {dest}", "(me lo puede | lo puede | puede | me lo podria) cambiar (a | para) {dest}", "cambielo (a | para) {dest}",
      // commas are lost: "A Mérida no, a Cancún" / "A Mérida, no a Cancún" read the same (rule 10): ask again
      "no (a | para) {wrong:dest} [sino] (a | para) {dest}", "(a | para) {dest} no (a | para) {wrong:dest} #amb",
      "no (voy | vamos | viajo) (a | para) {wrong:dest} [sino] [que] [voy | vamos | viajo] (a | para) {dest}",
      "(lo puedo | puedo) cambiar (a | para) {dest}",
    ] },
    change_count: { patterns: [
      "(mejor | siempre no) [solo | nada mas | nomas] (uno | un boleto) #n1", "(solo | nada mas | nomas) (necesito | quiero) (uno | un boleto) #n1",
      "(mejor | siempre no) [nada mas | solo] {number} boletos", "no (son | somos) {wrong:number} [sino] [son | somos] {number}",
      "(son | somos) {number} no {wrong:number}", "(me lo puede | lo puede | puede) cambiar a {number} boletos",
      "(quiero | necesito) {number} boletos (en vez de | no) {wrong:number}",
      "(somos | vamos a ser | seriamos) {number} [personas | pasajeros]",
    ] },
  },

  lines: {
    greet: [
      t("¡Buenos días! | ¿A | dónde | va?", "Good morning! | To | where | are you going?", "Good morning! Where are you headed?"),
      t("¡Pásele! | ¿Para | dónde | va?", "Come on up! | For | where | are you going?", "Next, please! Where are you headed?",
        { flags: { 0: "Mexican: ¡pásele! = come on in / step up, a friendly invitation." },
          neutral: t("¡Adelante! | ¿Para | dónde | va?", "Go ahead! | For | where | are you going?", "Next, please! Where are you headed?") }),
      t("Buenos días. | ¿En | qué | le | puedo | servir?", "Good morning. | In | what | (to) you | can I | serve?", "Good morning. How can I help you?"),
    ],
    greet_hay: [t("¡Buenos días! | ¿Cómo | está?", "Good morning! | How | are you?", "Good morning! How are you?")],
    ask_dest: [
      t("¿A | dónde | va?", "To | where | are you going?", "Where are you headed?"),
      t("¿Para | dónde | quiere | su | boleto?", "For | where | do you want | your | ticket?", "Where would you like your ticket to?", { spain: t("¿Para | dónde | quiere | su | billete?", "For | where | do you want | your | ticket?", "Where would you like your ticket to?") }),
    ],
    dest_list: [t("Tenemos | salidas | a | Tulum, | Playa del Carmen, | Cancún | y | Mérida.", "We have | departures | to | Tulum, | Playa del Carmen, | Cancún | and | Mérida.", "We have buses to Tulum, Playa del Carmen, Cancún, and Mérida.")],
    ask_playa: [t("¿A | Playa del Carmen?", "To | Playa del Carmen?", "To Playa del Carmen?")],
    which_dest: [t("Perdón, | ¿a | dónde | va | entonces?", "Sorry, | to | where | are you going | then?", "Sorry, where are you headed, then?")],
    dest_changed: [t("Claro, | a | {X}.", "Sure, | to | {X}.", "Sure, to {X}.")],
    dest_unknown: [t("Lo siento, | de | aquí | no hay | salidas | para | allá.", "I'm sorry, | from | here | there are no | departures | for | there.", "Sorry, we don't have buses there from here.")],
    ask_count: [t("¿Viaja | {m:solo|f:sola}?", "Are you traveling | alone?", "Just you?", { flags: { 1: "solo / sola: alone, agreeing with you, the traveler." } })],
    ask_how_many: [t("¿Cuántos | boletos?", "How many | tickets?", "How many tickets?", { spain: t("¿Cuántos | billetes?", "How many | tickets?", "How many tickets?") }), t("¿Cuántos | pasajeros | son?", "How many | passengers | are there?", "How many passengers?")],
    count_one: [t("Muy | bien, | un | boleto.", "Very | good, | one | ticket.", "Okay, one ticket.", { spain: t("Muy | bien, | un | billete.", "Very | good, | one | ticket.", "Okay, one ticket.") })],
    ask_trip: [
      t("¿Sencillo | o | redondo?", "One-way | or | round-trip?", "One-way or round-trip?", { spain: t("¿Solo ida | o | ida y vuelta?", "One-way | or | round-trip?", "One-way or round-trip?") }),
      t("Muy | bien. | ¿Sencillo | o | redondo?", "Very | good. | One-way | or | round-trip?", "Okay. One-way or round-trip?", { spain: t("Muy | bien. | ¿Solo ida | o | ida y vuelta?", "Very | good. | One-way | or | round-trip?", "Okay. One-way or round-trip?") }),
      t("¿Viaje | sencillo | o | redondo?", "Trip | one-way | or | round-trip?", "One-way or round-trip?", { spain: t("¿Solo ida | o | ida y vuelta?", "One-way | or | round-trip?", "One-way or round-trip?") }),
    ],
    which_trip: [t("Perdón, | ¿sencillo | o | redondo?", "Sorry, | one-way | or | round-trip?", "Sorry, was that one-way or round-trip?", { spain: t("Perdón, | ¿solo ida | o | ida y vuelta?", "Sorry, | one-way | or | round-trip?", "Sorry, was that one-way or round-trip?") })],
    ask_return: [
      t("¿Y | cuándo | regresa?", "And | when | do you come back?", "And when are you coming back?", { spain: t("¿Y | cuándo | vuelve?", "And | when | do you come back?", "And when are you coming back?") }),
      t("¿Para | qué | día | es | el | regreso?", "For | what | day | is | the | return?", "What day is your return?", { spain: t("¿Para | qué | día | es | la | vuelta?", "For | what | day | is | the | return?", "What day is your return?") }),
    ],
    which_day: [t("Perdón, | ¿qué | día | entonces?", "Sorry, | what | day | then?", "Sorry, which day, then?")],
    ret_ok_on: [t("Muy | bien, | con | regreso | el | {X}.", "Very | good, | with | return | on | {X}.", "Okay, coming back on {X}.", { flags: { 4: "el before a weekday = on." }, spain: t("Muy | bien, | con | vuelta | el | {X}.", "Very | good, | with | return | on | {X}.", "Okay, coming back on {X}.", {flags: {4: "el before a weekday = on."}}) })],
    ret_ok_rel: [t("Muy | bien, | con | regreso | {X}.", "Very | good, | with | return | {X}.", "Okay, coming back {X}.", { spain: t("Muy | bien, | con | vuelta | {X}.", "Very | good, | with | return | {X}.", "Okay, coming back {X}.") })],
    ret_ok_date: [t("Muy | bien, | ya | lo | anoté.", "Very | good, | already | it | I-wrote-down.", "Okay, I've got that down.", { spain: t("Muy | bien, | ya | lo | he anotado.", "Very | good, | already | it | I've-written-down.", "Okay, I've got that down.") })],
    ret_open: [t("Entonces | mejor | le | vendo | solo | la | ida, | y | el | regreso | lo | compra | allá | cuando | sepa.",
      "Then | better | (to) you | I-sell | only | the | way there, | and | the | return | it | you-buy | there | when | you-know.",
      "Then I'd better sell you a one-way ticket, and you can buy your return there once you know.", { spain: t("Entonces | mejor | le | vendo | solo | la | ida, | y | la | vuelta | la | compra | allí | cuando | sepa.", "Then | better | (to) you | I-sell | only | the | way there, | and | the | return | it | you-buy | there | when | you-know.", "Then I'd better sell you a one-way ticket, and you can buy your return there once you know.", {flags: {10: "la = it (la vuelta): the object pronoun, not an article."}}) })],
    ask_travel_day: [t("¿Viaja | hoy?", "Are you traveling | today?", "Are you traveling today?")],
    ask_when_travel: [t("¿Para | qué | día?", "For | what | day?", "For what day?")],
    ask_time: [
      t("¿Para | qué | hora? | Hay | uno | a | {$at} | y | otro | a | {$late}.", "For | what | time? | There's | one | at | {$at} | and | another | at | {$late}.",
        "What time? There's one at {$at} and another at {$late}."),
      t("Hay | salida | a | {$at} | y | a | {$late}. | ¿Cuál | le | doy?", "There's | a departure | at | {$at} | and | at | {$late}. | Which one | (to) you | do I give?",
        "There's a bus at {$at} and one at {$late}. Which one would you like?"),
    ],
    deps_info: [t("Hay | uno | a | {$at} | y | otro | a | {$late}.", "There's | one | at | {$at} | and | another | at | {$late}.", "There's one at {$at} and another at {$late}.")],
    time_again: [t("¿Y | para | qué | hora: | a | {$at} | o | a | {$late}?", "And | for | what | time: | at | {$at} | or | at | {$late}?", "And which bus: {$at} or {$late}?"),
      t("¿Cuál | le | doy: | el | de | {$at} | o | el | de | {$late}?", "Which one | (to) you | do I give: | the one | at | {$at} | or | the one | at | {$late}?", "Which one would you like: the {$at} or the {$late}?")],
    travel_tomorrow: [t("Muy | bien, | para | mañana.", "Very | good, | for | tomorrow.", "Okay, for tomorrow.")],
    other_name: [t("¿Y | el | nombre | de | la | otra | persona?", "And | the | name | of | the | other | person?", "And the other person's name?")],
    other_names: [t("¿Y | los | nombres | de | los | demás?", "And | the | names | of | the | others?", "And the others' names?")],
    seat_any: [t("Entonces | le | doy | el | 15, | en | ventanilla.", "Then | (to) you | I-give | — | 15, | at | the window.", "Then I'll give you seat 15, by the window.", { flags: { 3: "el stands for el asiento before its number; English says seat." }, say: "Entonces le doy el quince, en ventanilla." })],
    no_such_time: [t("A | esa | hora | no hay | salida. | Hay | a | {$at} | y | a | {$late}.", "At | that | time | there isn't | a departure. | There's one | at | {$at} | and | at | {$late}.",
      "There's no bus at that time. There's one at {$at} and one at {$late}.")],
    time_ok: [t("Muy | bien, | el | de | {$at}.", "Very | good, | the one | at | {$at}.", "Okay, the {$at} bus.")],
    sold_out: [t("¡Híjole! | El | de | {$at} | ya | está | lleno. | El | siguiente | sale | a | {$late}. | ¿Se lo | doy?",
      "Oh, man! | The one | at | {$at} | already | is | full. | The | next one | leaves | at | {$late}. | It to you | should I give?",
      "Oh no! The {$at} bus is already full. The next one leaves at {$late}. Should I give you that one?",
      { flags: { 0: "Mexican: ¡híjole! = oh no / oh man, for surprise or bad news." },
        neutral: t("¡Ay, | lo siento! | El | de | {$at} | ya | está | lleno. | El | siguiente | sale | a | {$late}. | ¿Se lo | doy?",
          "Oh, | I'm sorry! | The one | at | {$at} | already | is | full. | The | next one | leaves | at | {$late}. | It to you | should I give?",
          "Oh, I'm sorry! The {$at} bus is already full. The next one leaves at {$late}. Should I give you that one?") })],
    later_one: [t("Sí, | el | de | {$late}.", "Yes, | the one | at | {$late}.", "Yes, the {$late} one.")],
    next_at: [t("El | siguiente | sale | a | {$late}.", "The | next one | leaves | at | {$late}.", "The next one leaves at {$late}.")],
    first_one: [t("No, | el | primero | es | el | de | {$at}.", "No, | the | first one | is | the one | at | {$at}.", "No, the first one is the {$at} bus.")],
    sold_remind: [t("¿Entonces | le | doy | el | de | {$late}?", "So | (to) you | should I give | the one | at | {$late}?", "So, should I give you the {$late} bus?")],
    still_full: [t("El | de | {$at} | ya | no tiene | lugares, | lo siento.", "The one | at | {$at} | already | doesn't have | seats, | I'm sorry.", "The {$at} bus has no seats left, I'm sorry.", { spain: t("El | de | {$at} | ya | no tiene | plazas, | lo siento.", "The one | at | {$at} | already | doesn't have | seats, | I'm sorry.", "The {$at} bus has no seats left, I'm sorry.") })],
    only_late: [t("No, | antes | no hay | otro. | El | que | sigue | es | el | de | {$late}.", "No, | before | there isn't | another. | The one | that | follows | is | the one | at | {$late}.",
      "No, there's nothing earlier. The next one is the {$late} bus.")],
    today_only: [t("Hoy | solo | queda | el | de | {$late}. | ¿Se lo | doy?", "Today | only | there's left | the one | at | {$late}. | It to you | should I give?",
      "Today there's only the {$late} bus left. Should I give you that one?")],
    tomorrow_offer: [t("Hoy | ya | no hay | otro. | Mañana | sale | uno | a | {$at}. | ¿Se lo | doy | para | mañana?",
      "Today | anymore | there isn't | another. | Tomorrow | leaves | one | at | {$at}. | It to you | should I give | for | tomorrow?",
      "There's nothing else today. Tomorrow there's one at {$at}. Should I give you that one?")],
    tomorrow_ok: [t("Listo, | para | mañana | a | {$at}.", "Done, | for | tomorrow | at | {$at}.", "All set, tomorrow at {$at}.", { spain: t("Perfecto, | para | mañana | a | {$at}.", "Perfect, | for | tomorrow | at | {$at}.", "All set, tomorrow at {$at}.") })],
    walk_off: [t("Está bien. | Aquí | estamos | cuando | guste.", "That's fine. | Here | we are | whenever | you like.", "That's fine. We're here whenever you need us.")],
    ask_seat: [
      t("¿Ventanilla | o | pasillo?", "Window | or | aisle?", "Window or aisle?"),
      t("Aquí | están | los | lugares | libres. | ¿Ventanilla | o | pasillo?", "Here | are | the | seats | free. | Window | or | aisle?", "Here are the open seats. Window or aisle?", { spain: t("Aquí | están | los | asientos | libres. | ¿Ventanilla | o | pasillo?", "Here | are | the | seats | free. | Window | or | aisle?", "Here are the open seats. Window or aisle?") }),
    ],
    seat_window: [t("Le | doy | el | 15, | en | ventanilla.", "(To) you | I-give | — | 15, | at | the window.", "I'll give you seat 15, by the window.",
      { flags: { 2: "el stands for el asiento before its number; English says seat." }, say: "Le doy el quince, en ventanilla." })],
    seat_aisle: [t("Le | doy | el | 16, | en | pasillo.", "(To) you | I-give | — | 16, | on | the aisle.", "I'll give you seat 16, on the aisle.",
      { flags: { 2: "el stands for el asiento before its number; English says seat." }, say: "Le doy el dieciséis, en pasillo." })],
    seat_front: [t("Le | doy | el | 3, | adelante.", "(To) you | I-give | — | 3, | in front.", "I'll give you seat 3, near the front.",
      { flags: { 2: "el stands for el asiento before its number; English says seat." }, say: "Le doy el tres, adelante.", spain: t("Le | doy | el | 3, | delante.", "(To) you | I-give | — | 3, | in front.", "I'll give you seat 3, near the front.", {flags: {2: "el stands for el asiento before its number; English says seat."},say: "Le doy el tres, delante."}) })],
    seat_back: [t("Le | doy | el | 31, | atrás.", "(To) you | I-give | — | 31, | at the back.", "I'll give you seat 31, at the back.",
      { flags: { 2: "el stands for el asiento before its number; English says seat." }, say: "Le doy el treinta y uno, atrás." })],
    seat_pair: [t("Les | doy | ventanilla | y | pasillo, | juntos.", "(To) you all | I-give | window | and | aisle, | together.", "I'll give you a window and an aisle seat, together.")],
    seat_together: [t("Listo, | van | juntos.", "Done, | you-go | together.", "All set, you'll be sitting together.", { spain: t("Perfecto, | van | juntos.", "Perfect, | you-go | together.", "All set, you'll be sitting together.") })],
    ask_id: [t("¿Me | permite | una | identificación? | El | boleto | va | a nombre de | quien | viaja.",
      "(To) me | you-allow | an | ID? | The | ticket | goes | in the name of | whoever | travels.", "May I see an ID? The ticket goes in the traveler's name.", { spain: t("¿Me | deja | su | documentación? | El | billete | va | a nombre de | quien | viaja.", "(To) me | you-let-have | your | ID? | The | ticket | goes | in the name of | whoever | travels.", "May I see an ID? The ticket goes in the traveler's name.") })],
    ask_id_many: [t("¿Me | permite | una | identificación? | Los | boletos | van | a nombre de | los | pasajeros.",
      "(To) me | you-allow | an | ID? | The | tickets | go | in the name of | the | passengers.", "May I see an ID? The tickets go in the passengers' names.", { spain: t("¿Me | deja | su | documentación? | Los | billetes | van | a nombre de | los | pasajeros.", "(To) me | you-let-have | your | ID? | The | tickets | go | in the name of | the | passengers.", "May I see an ID? The tickets go in the passengers' names.") })],
    ask_full_name: [t("No se preocupe. | Nada más | dígame | su | nombre | completo.", "Don't worry. | Just | tell me | your | name | full.", "Don't worry. Just tell me your full name.", { spain: t("No se preocupe. | Solo | dígame | su | nombre | completo.", "Don't worry. | Just | tell me | your | name | full.", "Don't worry. Just tell me your full name.") })],
    name_remind: [t("Con | su | nombre | completo | basta.", "With | your | name | full | it's enough.", "Your full name is enough.")],
    passport_back: [t("Gracias. | Aquí | tiene | su | pasaporte.", "Thanks. | Here | you have | your | passport.", "Thanks. Here's your passport back.")],
    id_back: [t("Gracias. | Aquí | se la | devuelvo.", "Thanks. | Here | it to you | I-return.", "Thanks. Here it is back.", { flags: { 2: "se la: it (la identificación) to you." } })],
    name_ok: [t("Gracias, | ya | lo | anoté.", "Thanks, | already | it | I-wrote-down.", "Thanks, I've got it.", { spain: t("Gracias, | ya | lo | he anotado.", "Thanks, | already | it | I've-written-down.", "Thanks, I've got it.") })],
    id_fine: [t("Sí, | con | el | pasaporte | está bien.", "Yes, | with | the | passport | it's fine.", "Yes, your passport is fine.")],
    // Nov 2026 (rule 14): seniors with the INAPAM card pay half all year; students (half) and teachers (a quarter) only in
    // the SEP's school vacations, so not now
    ask_discount: [t("¿Tiene | credencial | del | INAPAM?", "Do you have | a card | of the | INAPAM?",
      "Do you have an INAPAM senior card?", { flags: { 3: "INAPAM: Mexico's national institute for older adults; its card gives seniors discounts." } })],
    discount_info: [t("Sí. | Con | credencial | del | INAPAM, | los | adultos mayores | pagan | la mitad.", "Yes. | With | a card | of the | INAPAM, | the | seniors | pay | half.",
      "Yes. Seniors with an INAPAM card pay half.", { flags: { 4: "INAPAM: Mexico's national institute for older adults; its card gives seniors discounts." } })],
    child_disc: [t("Los | niños | también | tienen | descuento, | según | la | edad.", "The | children | also | have | a discount, | depending on | the | age.", "Kids get a discount too, depending on their age.")],
    student_disc: [t("Los | estudiantes | solo | tienen | descuento | en | vacaciones.", "The | students | only | have | a discount | in | vacations.", "Students only get a discount during school vacations.")],
    teacher_disc: [t("Los | maestros | solo | tienen | descuento | en | vacaciones.", "The | teachers | only | have | a discount | in | vacations.", "Teachers only get a discount during school vacations.", { spain: t("Los | profesores | solo | tienen | descuento | en | vacaciones.", "The | teachers | only | have | a discount | in | vacations.", "Teachers only get a discount during school vacations.") })],
    // said again (rule 8): a short reminder, not the same line
    vac_remind: [t("Lo siento, | solo | en | vacaciones.", "I'm sorry, | only | in | vacations.", "Sorry, only during school vacations.")],
    ask_card_id: [t("¿Me | permite | su | credencial?", "(To) me | you-allow | your | card?", "May I see your card?", { spain: t("¿Me | deja | su | credencial?", "(To) me | you-let-have | your | card?", "May I see your card?") })],
    discount_ok: [t("Gracias. | Le | hago | el | descuento | de | la mitad.", "Thanks. | (For) you | I-do | the | discount | of | half.", "Thanks. You get the half-price discount.")],
    no_card_disc: [t("Sin | la | credencial | no le puedo | hacer | el | descuento, | lo siento.", "Without | the | card | I can't for you | do | the | discount, | I'm sorry.",
      "I'm sorry, I can't give you the discount without the card.")],
    say_total: [
      t("Son | {$price}.", "That's | {$price}.", "That's {$price}."),
      t("Le | cobro | {$price}.", "(To) you | I-charge | {$price}.", "That'll be {$price}."),
    ],
    // the answer to "¿Cuánto es?" (the same words as say_total's first line, so the same recording)
    total_is: [t("Son | {$price}.", "That's | {$price}.", "That's {$price}.")],
    ask_pay: [t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?"), t("¿Cómo | va | a | pagar?", "How | are you going | to | pay?", "How would you like to pay?")],
    which_pay: [t("Perdón, | ¿efectivo | o | tarjeta?", "Sorry, | cash | or | card?", "Sorry, cash or card?")],
    card_ok: [t("Claro. | Acerque | o | inserte | su | tarjeta, | por favor.", "Sure. | Bring close | or | insert | your | card, | please.", "Sure. Tap or insert your card, please.")],
    // "¿Puedo pagar con el celular?": the phone, not a card to insert
    phone_ok: [t("Claro, | acerque | su | celular | a | la | terminal.", "Sure, | bring close | your | cell phone | to | the | card machine.", "Sure, just hold your phone to the card machine.", { spain: t("Claro, | acerque | su | móvil | al | datáfono.", "Sure, | bring close | your | phone | to the | card machine.", "Sure, just hold your phone to the card machine.") })],
    card_later: [t("Claro, | aceptamos | tarjeta.", "Sure, | we accept | card.", "Sure, we take cards.")],
    cash_ok: [t("Gracias. | Aquí | está | su | cambio.", "Thanks. | Here | is | your | change.", "Thanks. Here's your change.")],
    cash_later: [t("Claro, | en efectivo | también.", "Sure, | in cash | also.", "Sure, cash is fine too.")],
    paid_thanks: [t("Gracias.", "Thanks.", "Thank you.")],
    dollars: [t("Aquí | solo | aceptamos | pesos. | Hay | un | cajero | a | la | entrada.", "Here | only | we accept | pesos. | There's | an | ATM | at | the | entrance.",
      "We only take pesos here. There's an ATM by the entrance.")],
    ticket_one: [t("Aquí | tiene | su | boleto.", "Here | you have | your | ticket.", "Here's your ticket.", { spain: t("Aquí | tiene | su | billete.", "Here | you have | your | ticket.", "Here's your ticket.") }), t("Listo, | aquí | tiene | su | boleto.", "Done, | here | you have | your | ticket.", "All set, here's your ticket.", { spain: t("Perfecto, | aquí | tiene | su | billete.", "Perfect, | here | you have | your | ticket.", "All set, here's your ticket.") })],
    ticket_many: [t("Aquí | tiene | sus | boletos.", "Here | you have | your | tickets.", "Here are your tickets.", { spain: t("Aquí | tiene | sus | billetes.", "Here | you have | your | tickets.", "Here are your tickets.") })],
    bus_info: [
      t("Su | autobús | sale | a | {$at}, | del | andén | {$num}.", "Your | bus | leaves | at | {$at}, | from the | gate | {$num}.", "Your bus leaves at {$at}, from gate {$num}."),
      t("Sale | a | {$at}, | andén | {$num}.", "It leaves | at | {$at}, | gate | {$num}.", "It leaves at {$at}, from gate {$num}."),
    ],
    leaves_at: [t("Sale | a | {$at}.", "It leaves | at | {$at}.", "It leaves at {$at}."), t("Su | autobús | sale | a | {$at}.", "Your | bus | leaves | at | {$at}.", "Your bus leaves at {$at}.")],
    other_leaves: [t("Para | allá | hay | uno | a | {$at}.", "For | there | there's | one | at | {$at}.", "There's one going there at {$at}.")],
    track_is: [
      t("Sale | del | andén | {$num}.", "It leaves | from the | gate | {$num}.", "It leaves from gate {$num}."),
      t("Andén | {$num}. | Fíjese | en | la | pantalla.", "Gate | {$num}. | Keep an eye | on | the | screen.", "Gate {$num}. Keep an eye on the screen."),
    ],
    which_dest_first: [t("Claro. | ¿A | dónde | va?", "Sure. | To | where | are you going?", "Sure. Where are you headed?")],
    direct_yes: [t("Sí, | es | directo.", "Yes, | it's | direct.", "Yes, it's direct.")],
    direct_stops: [t("Sí, | no tiene | que | cambiar | de | autobús.", "Yes, | you don't have | to | change | — | bus.", "Yes, you don't have to change buses.",
      { flags: { 4: "cambiar de autobús: change buses; de marks what is changed." } })],
    no_change: [t("No, | es | directo; | no tiene | que | cambiar.", "No, | it's | direct; | you don't have | to | change.", "No, it's direct; you don't have to change.")],
    no_stops: [t("No, | va | directo.", "No, | it-goes | direct.", "No, it goes straight there.")],
    stops_tulum: [t("Nada más | hace | parada | en | Tulum.", "Only | it-makes | a stop | in | Tulum.", "It just stops in Tulum.", { spain: t("Solo | hace | parada | en | Tulum.", "Only | it-makes | a stop | in | Tulum.", "It just stops in Tulum.") })],
    stops_playa: [t("Nada más | hace | parada | en | Tulum | y | en | Playa del Carmen.", "Only | it-makes | a stop | in | Tulum | and | in | Playa del Carmen.", "It just stops in Tulum and Playa del Carmen.", { spain: t("Solo | hace | parada | en | Tulum | y | en | Playa del Carmen.", "Only | it-makes | a stop | in | Tulum | and | in | Playa del Carmen.", "It just stops in Tulum and Playa del Carmen.") })],
    stops_valladolid: [t("Nada más | hace | parada | en | Tulum | y | en | Valladolid.", "Only | it-makes | a stop | in | Tulum | and | in | Valladolid.", "It just stops in Tulum and Valladolid.", { spain: t("Solo | hace | parada | en | Tulum | y | en | Valladolid.", "Only | it-makes | a stop | in | Tulum | and | in | Valladolid.", "It just stops in Tulum and Valladolid.") })],
    dur_tulum: [t("Como | media hora.", "About | half an hour.", "About half an hour.")],
    dur_playa: [t("Como | una | hora | y | media.", "About | an | hour | and | a half.", "About an hour and a half.")],
    dur_cancun: [t("Como | dos | horas | y | media.", "About | two | hours | and | a half.", "About two and a half hours.")],
    dur_merida: [t("Como | cinco | horas.", "About | five | hours.", "About five hours.")],
    arrives: [t("Llega | como | a | {$at}.", "It arrives | around | at | {$at}.", "It gets in around {$at}.")],
    price_one: [t("El | sencillo | cuesta | {$price}.", "The | one-way | costs | {$price}.", "One-way is {$price}.", { spain: t("La | ida | cuesta | {$price}.", "The | one-way | costs | {$price}.", "One-way is {$price}.") })],
    price_round: [t("Y | el | redondo, | {$price}.", "And | the | round-trip, | {$price}.", "And round-trip is {$price}.", { spain: t("Y | la | ida y vuelta, | {$price}.", "And | the | round-trip, | {$price}.", "And round-trip is {$price}.") })],
    ontime: [t("Hasta | ahorita | va | a tiempo.", "Until | right now | it's going | on time.", "So far it's on time.",
      { flags: { 1: "Mexican: ahorita = right now." }, neutral: t("Hasta | ahora | va | a tiempo.", "Until | now | it's going | on time.", "So far it's on time.") })],
    waiting: [t("La | sala de espera | está | ahí | enfrente.", "The | waiting room | is | there | in front.", "The waiting room is right over there.")],
    shop: [t("Hay | una | tiendita | junto | a | la | entrada.", "There's | a | little store | next | to | the | entrance.", "There's a little shop by the entrance.",
      { flags: { 2: "tiendita: a small corner store; the -ita ending makes it little and friendly." }, spain: t("Hay | una | tienda | junto | a | la | entrada.", "There's | a | store | next | to | the | entrance.", "There's a little shop by the entrance.") })],
    no_food: [t("En | el | autobús | no venden | nada. | Mejor | compre | algo | aquí | antes | de | subir.", "On | the | bus | they don't sell | anything. | Better | buy | something | here | before | — | getting on.",
      "They don't sell anything on the bus. Better buy something here before you get on.", { flags: { 10: "de links antes to the infinitive; English before needs no extra word." } })],
    bus_extras: [t("Tiene | aire acondicionado | y | baño. | El | wifi | a veces | funciona | y | a veces | no.", "It has | air conditioning | and | a restroom. | The | Wi-Fi | sometimes | works | and | sometimes | not.",
      "It has AC and a restroom. The Wi-Fi works sometimes, and sometimes it doesn't.")],
    schedule: [t("Los | horarios | están | en | la | pantalla, | ahí | arriba.", "The | schedules | are | on | the | screen, | there | above.", "The schedules are on the screen up there.")],
    restroom: [t("Los | baños | están | al fondo, | a la derecha.", "The | restrooms | are | at the back, | on the right.", "The restrooms are at the back, on the right.", { spain: t("Los | aseos | están | al fondo, | a la derecha.", "The | restrooms | are | at the back, | on the right.", "The restrooms are at the back, on the right.") })],
    luggage: [t("Claro. | Su | maleta | va | abajo | del | autobús, | y | le | dan | un | comprobante | para | recogerla.",
      "Sure. | Your | suitcase | goes | under | the | bus, | and | (to) you | they-give | a | claim tag | to | pick it up.",
      "Sure. Your suitcase goes under the bus, and they give you a claim tag to pick it up.", { flags: { 5: "del = de + el; abajo de means under." }, spain: t("Claro. | Su | maleta | va | en el maletero | del | autobús, | y | le | dan | un | comprobante | para | recogerla.", "Sure. | Your | suitcase | goes | in the luggage hold | of the | bus, | and | (to) you | they-give | a | claim tag | to | pick it up.", "Sure. Your suitcase goes under the bus, and they give you a claim tag to pick it up.", {flags: {5: "del = de + el; abajo de means under."}}) })],
    // "¿Cuántas maletas puedo llevar?": the coach lines' free allowance, 25 kilos a passenger (rule 11: not "Claro…")
    luggage_limit: [t("Puede | llevar | hasta | 25 | kilos | sin costo.", "You can | take | up to | 25 | kilos | free of charge.", "You can bring up to 25 kilos free.",
      { say: "Puede llevar hasta veinticinco kilos sin costo.", spain: t("Puede | llevar | hasta | 25 | kilos | sin coste.", "You can | take | up to | 25 | kilos | free of charge.", "You can bring up to 25 kilos free.", {say: "Puede llevar hasta veinticinco kilos sin coste."}) })],
    early: [t("Llegue | unos | veinte | minutos | antes, | por favor.", "Arrive | some | twenty | minutes | before, | please.", "Please get here about twenty minutes early.",
      { flags: { 1: "unos before a number means about." } })],
    early_ans: [t("Con | unos | veinte | minutos | antes | está bien.", "With | some | twenty | minutes | before | it's fine.", "About twenty minutes early is fine.",
      { flags: { 1: "unos before a number means about." } })],
    seat_numbered: [t("Sí, | su | asiento | viene | en | el | boleto.", "Yes, | your | seat | comes | on | the | ticket.", "Yes, your seat number is on the ticket.", { spain: t("Sí, | su | asiento | viene | en | el | billete.", "Yes, | your | seat | comes | on | the | ticket.", "Yes, your seat number is on the ticket.") })],
    seat_assigned: [t("No, | cada | pasajero | tiene | su | asiento; | viene | en | el | boleto.", "No, | each | passenger | has | their | seat; | it comes | on | the | ticket.",
      "No, every passenger has an assigned seat; it's on the ticket.", { spain: t("No, | cada | pasajero | tiene | su | asiento; | viene | en | el | billete.", "No, | each | passenger | has | their | seat; | it comes | on | the | ticket.", "No, every passenger has an assigned seat; it's on the ticket.") })],
    seat_joke: [t("¡Ja! | Aquí | no hay | asientos. | Pero | en | el | autobús, | cada uno | tiene | su | número.", "Ha! | Here | there are no | seats. | But | on | the | bus, | each one | has | its | number.",
      "Ha! There are no seats here. But on the bus, every seat has its own number.")],
    anything_else: [t("¿Algo | más?", "Anything | else?", "Anything else?"), t("¿Le | ayudo | con | algo | más?", "(To) you | I-help | with | something | else?", "Can I help you with anything else?")],
    tell_me: [t("Dígame.", "Tell me.", "Go ahead.")],
    just_so: [t("Muy | bien. | Nada más | para | que | sepa:", "Very | good. | Just | so | that | you-know:", "Okay. Just so you know:", { spain: t("Muy | bien. | Solo | para | que | lo | sepa:", "Very | good. | Just | so | that | it | you-know:", "Okay. Just so you know:") })],
    have_trip: [
      t("¡Buen | viaje!", "Good | trip!", "Have a good trip!"),
      t("¡Que | le | vaya | bien!", "May | (for) you | it-go | well!", "Take care!"),
      t("¡Buen | viaje! | Que | le | vaya | bien.", "Good | trip! | May | (for) you | it-go | well.", "Have a good trip! Take care."),
    ],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Perfecto.", "Perfect.", "Perfect."), t("Claro.", "Sure.", "Sure.")],
    changed: [t("Claro, | sin problema.", "Sure, | no problem.", "Sure, no problem.")],
    change_that: [t("Claro, | se lo | cambio.", "Sure, | it for you | I'll-change.", "Sure, I'll change that for you.")],
  },

  domains: {
    price: () => {
      const s = new Set<number>();
      // up to nine tickets: countOf reads "Somos cinco" … "nueve"
      for (const d of DESTS) for (const trip of ["oneway", "round"]) for (const disc of [undefined, "senior"]) for (let n = 1; n <= 9; n++) s.add(price(d.id, trip, disc, n));
      return [...s].sort((a, b) => a - b);
    },
    at: () => {
      const out: { en: string; lt: string; say: string }[] = [];
      const seen = new Set<string>();
      const add = (t0: Clock) => { const k = `${t0.h}:${t0.m}`; if (!seen.has(k)) { seen.add(k); out.push(clock(t0)); } };
      for (const d of DESTS) { const a = d.attrs as Dest; add(a.time); add(addMin(a.time, a.dur)); add(addMin(LATE, a.dur)); }
      add(LATE);
      return out;
    },
    late: () => [clock(LATE)],
    num: () => [1, 2, 3, 4],
  },

  hints: {
    buy: {
      lt: "Buy a ticket", slot: "dest", examples: ["tulum", "cancun", "playa", "merida"],
      items: [
        { id: "b_one", s: t("Un | boleto | a | {X}, | por favor.", "A | ticket | to | {X}, | please.", "A ticket to {X}, please.", { spain: t("Un | billete | a | {X}, | por favor.", "A | ticket | to | {X}, | please.", "A ticket to {X}, please.") }) },
        { id: "b_quisiera", s: t("Quisiera | un | boleto | para | {X}.", "I'd like | a | ticket | for | {X}.", "I'd like a ticket to {X}.", { spain: t("Quisiera | un | billete | para | {X}.", "I'd like | a | ticket | for | {X}.", "I'd like a ticket to {X}.") }), register: "polite" },
        { id: "b_me_da", s: t("¿Me | da | un | boleto | a | {X}?", "(To) me | you-give | a | ticket | to | {X}?", "Could I have a ticket to {X}?", { spain: t("¿Me | da | un | billete | a | {X}?", "(To) me | you-give | a | ticket | to | {X}?", "Could I have a ticket to {X}?") }), note: "Very common in Mexico: “¿Me da…?”", noteSpain: "¿Me da…?: the usual way to ask at a counter, with usted to the clerk." },
        { id: "b_round", s: t("Un | boleto | redondo | a | {X}, | por favor.", "A | ticket | round-trip | to | {X}, | please.", "A round-trip ticket to {X}, please.", { spain: t("Un | billete | de ida y vuelta | a | {X}, | por favor.", "A | ticket | round-trip | to | {X}, | please.", "A round-trip ticket to {X}, please.") }) },
        { id: "b_oneway", s: t("Sencillo | a | {X}, | por favor.", "One-way | to | {X}, | please.", "One-way to {X}, please.", { spain: t("Solo ida | a | {X}, | por favor.", "One-way | to | {X}, | please.", "One-way to {X}, please.") }) },
        { id: "b_two", s: t("Dos | boletos | a | {X}, | por favor.", "Two | tickets | to | {X}, | please.", "Two tickets to {X}, please.", { spain: t("Dos | billetes | a | {X}, | por favor.", "Two | tickets | to | {X}, | please.", "Two tickets to {X}, please.") }) },
        { id: "b_going", s: t("Voy | a | {X}.", "I'm going | to | {X}.", "I'm going to {X}.") },
        { id: "b_tiene", s: t("¿Tiene | boletos | para | {X}?", "Do you have | tickets | for | {X}?", "Do you have tickets to {X}?", { spain: t("¿Tiene | billetes | para | {X}?", "Do you have | tickets | for | {X}?", "Do you have tickets to {X}?") }) },
      ],
    },
    trip: {
      lt: "Say one-way or round-trip",
      items: [
        { id: "t_short", s: t("Redondo, | por favor.", "Round-trip, | please.", "Round-trip, please.", { spain: t("Ida y vuelta, | por favor.", "Round-trip, | please.", "Round-trip, please.") }), note: "Redondo = round-trip; sencillo = one-way." },
        { id: "t_short", s: t("Sencillo, | por favor.", "One-way, | please.", "One-way, please.", { spain: t("Solo ida, | por favor.", "One-way, | please.", "One-way, please.") }) },
        { id: "t_ida", s: t("Solo | de | ida.", "Only | — | going.", "Just one-way.", { flags: { 1: "de ida: the way there; de has no English word here." } }) },
        { id: "ret_coming", s: t("Regreso | el | domingo.", "I come back | on | Sunday.", "I'm coming back on Sunday.", { flags: { 1: "el before a weekday = on." }, spain: t("Vuelvo | el | domingo.", "I come back | on | Sunday.", "I'm coming back on Sunday.", {flags: {1: "el before a weekday = on."}}) }) },
      ],
    },
    ret: {
      lt: "Say when you're coming back",
      items: [
        { id: "r_day", s: t("El | domingo.", "On | Sunday.", "On Sunday.", { flags: { 0: "el before a weekday = on." } }) },
        { id: "r_coming", s: t("Regreso | el | viernes.", "I come back | on | Friday.", "I'm coming back on Friday.", { flags: { 1: "el before a weekday = on." }, spain: t("Vuelvo | el | viernes.", "I come back | on | Friday.", "I'm coming back on Friday.", {flags: {1: "el before a weekday = on."}}) }) },
        { id: "r_day", s: t("Mañana | en la tarde.", "Tomorrow | in the afternoon.", "Tomorrow afternoon.", { spain: t("Mañana | por la tarde.", "Tomorrow | in the afternoon.", "Tomorrow afternoon.") }) },
        { id: "r_not_sure", s: t("Todavía | no sé.", "Still | I don't know.", "I don't know yet.") },
      ],
    },
    count: {
      lt: "Say how many tickets",
      items: [
        { id: "c_one", s: t("Solo | uno, | por favor.", "Just | one, | please.", "Just one, please.") },
        { id: "c_two", s: t("Somos | dos.", "We are | two.", "There are two of us.") },
      ],
    },
    travel: {
      lt: "Say what day you're traveling",
      items: [
        { id: "tr_day", s: t("Sí, | hoy.", "Yes, | today.", "Yes, today.") },
        { id: "tr_day", s: t("No, | para | mañana.", "No, | for | tomorrow.", "No, tomorrow.") },
      ],
    },
    time: {
      lt: "Choose a departure",
      items: [
        { id: "tm_next", s: t("El | próximo, | por favor.", "The | next one, | please.", "The next one, please.") },
        { id: "tm_late", s: t("El | de | la | tarde.", "The one | of | the | afternoon.", "The afternoon one.") },
        { id: "tm_at", s: t("A | las | cinco | y cuarto.", "At | — | five | fifteen.", "At 5:15.", { flags: { 1: "Spanish uses an article before clock times; English has no separate word." } }) },
      ],
    },
    sold_out: {
      lt: "Take the later bus, or ask about another",
      items: [
        { id: "so_ok", s: t("Está bien, | deme | ese.", "That's fine, | give me | that one.", "Okay, I'll take that one.", { spain: t("Vale, | deme | ese.", "Okay, | give me | that one.", "Okay, I'll take that one.") }) },
        { id: "so_earlier", s: t("¿No hay | otro | antes?", "Isn't there | another | before?", "Isn't there an earlier one?") },
        { id: "tr_day", s: t("Mejor | mañana.", "Better | tomorrow.", "Tomorrow, then.") },
      ],
    },
    seat: {
      lt: "Choose a seat",
      items: [
        { id: "s_window", s: t("Ventanilla, | por favor.", "Window, | please.", "A window seat, please.") },
        { id: "s_aisle", s: t("Pasillo, | por favor.", "Aisle, | please.", "An aisle seat, please.") },
        { id: "s_any", s: t("Me da | igual.", "It's (to me) | the same.", "I don't mind.", { flags: { 0: "me da igual: it makes no difference to me." } }) },
        { id: "s_together", s: t("Juntos, | por favor.", "Together, | please.", "Together, please.") },
      ],
    },
    idcard: {
      lt: "Show your ID or give your name",
      items: [
        { id: "id_here", s: t("Aquí | tiene | mi | pasaporte.", "Here | you have | my | passport.", "Here's my passport.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "id_name", s: t("A nombre de | {$surname}.", "In the name of | {$surname}.", "Under {$surname}.") },
        { id: "id_ok", s: t("¿Le | sirve | mi | pasaporte?", "(To) you | does it work | my | passport?", "Is my passport okay?") },
        { id: "id_none", s: t("No traigo | identificación.", "I don't have on me | ID.", "I don't have my ID with me.", { spain: t("No llevo | documentación.", "I don't have on me | ID.", "I don't have my ID with me.") }) },
      ],
    },
    discount: {
      lt: "Ask about discounts",
      items: [
        { id: "q_student", s: t("¿Hay | descuento | para | estudiantes?", "Is there | a discount | for | students?", "Is there a student discount?") },
        { id: "q_senior", s: t("¿Tienen | descuento | para | adultos mayores?", "Do you have | a discount | for | seniors?", "Do you have a senior discount?") },
      ],
    },
    discount_ans: {
      lt: "Say whether you have a discount card",
      items: [
        { id: "im_senior", s: t("Tengo | credencial | del | INAPAM.", "I have | a card | of the | INAPAM.", "I have an INAPAM card.", { flags: { 3: "INAPAM: Mexico's national institute for older adults; its card gives seniors discounts." } }), note: "INAPAM: the Mexican senior card (60 and over)." },
        { id: "no_discount", s: t("No, | no tengo.", "No, | I don't have one.", "No, I don't.") },
        { id: "im_student", s: t("Soy | estudiante.", "I'm | a student.", "I'm a student."), note: "Students and teachers get bus discounts only during school vacations." },
      ],
    },
    show_card: {
      lt: "Show your card",
      items: [
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "here_id", s: t("Aquí | está | mi | credencial | del | INAPAM.", "Here | is | my | card | of the | INAPAM.", "Here's my INAPAM card.", { flags: { 5: "INAPAM: Mexico's national institute for older adults; its card gives seniors discounts." } }) },
        { id: "id_none", s: t("No la traigo.", "I don't have it on me.", "I don't have it with me.", { spain: t("No la llevo.", "I don't have it on me.", "I don't have it with me.") }) },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "By card, please.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("En efectivo.", "In cash.", "Cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      ],
    },
    next_bus: {
      lt: "Ask when the next bus leaves", slot: "dest", examples: ["tulum", "cancun", "playa", "merida"],
      items: [
        { id: "q_next", s: t("¿A | qué | hora | sale | el | próximo | autobús | a | {X}?", "At | what | time | leaves | the | next | bus | to | {X}?", "What time is the next bus to {X}?") },
      ],
    },
    info: {
      lt: "Ask about your bus",
      items: [
        { id: "q_time", s: t("¿A | qué | hora | sale?", "At | what | time | does it leave?", "What time does it leave?") },
        { id: "q_track", s: t("¿De | qué | andén | sale?", "From | what | gate | does it leave?", "Which gate does it leave from?") },
        { id: "q_direct", s: t("¿Es | directo?", "Is it | direct?", "Is it direct?") },
        { id: "q_change", s: t("¿Tengo | que | cambiar | de | autobús?", "Do I have | to | change | — | bus?", "Do I have to change buses?", { flags: { 3: "cambiar de autobús: change buses; de marks what is changed." } }) },
        { id: "q_long", s: t("¿Cuánto | tiempo | tarda?", "How much | time | does it take?", "How long does it take?") },
        { id: "q_arrive", s: t("¿A | qué | hora | llega?", "At | what | time | does it arrive?", "What time does it get in?") },
        { id: "q_luggage", s: t("¿Puedo | llevar | mi | maleta?", "Can I | take | my | suitcase?", "Can I bring my suitcase?") },
        { id: "q_early", s: t("¿Con | cuánto | tiempo | antes | tengo | que | llegar?", "With | how much | time | before | I have | to | arrive?", "How early should I get here?") },
        { id: "q_ontime", s: t("¿Sale | a tiempo?", "Does it leave | on time?", "Is it leaving on time?") },
        { id: "q_wait", s: t("¿Dónde | puedo | esperar?", "Where | can I | wait?", "Where can I wait?") },
        { id: "q_price", s: t("¿Cuánto | cuesta | el | boleto?", "How much | costs | the | ticket?", "How much is the ticket?", { spain: t("¿Cuánto | cuesta | el | billete?", "How much | costs | the | ticket?", "How much is the ticket?") }) },
      ],
    },
    on_bus: {
      lt: "Ask if a seat on the bus is free",
      items: [
        { id: "seat_taken", s: t("¿Está | ocupado | este | asiento?", "Is | taken | this | seat?", "Is this seat taken?") },
        { id: "seat_free", s: t("¿Este | lugar | está | libre?", "This | seat | is | free?", "Is this seat free?", { spain: t("¿Este | sitio | está | libre?", "This | seat | is | free?", "Is this seat free?") }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    // Spain's twins (11 Nov 2026)
    "solo ida": { reason: "lexical_expression", split: "solo → only + ida → going: = a one-way ticket (Spain).", minimal: "Two words." },
    "ida y vuelta": { reason: "lexical_expression", split: "ida → going + y → and + vuelta → return: = a round trip.", minimal: "Three words." },
    "he anotado": { reason: "grammatical_fusion", split: "he → have/has + anotado (participle): haber + participle, Spain's present perfect for what has just happened; English says it as one verb phrase.", minimal: "Auxiliary and participle." },
    "en el maletero": { reason: "lexical_expression", split: "en → in + el → the + maletero → trunk: the bus's luggage hold.", minimal: "Three words." },
    "sin coste": { reason: "lexical_expression", split: "sin → without + coste → cost: = free of charge (Spain's coste).", minimal: "Two words." },
    "de ida y vuelta": { reason: "lexical_expression", split: "de → of + ida y vuelta → going and return: = round-trip.", minimal: "Four words." },
    "por la tarde": { reason: "lexical_expression", split: "por → by + la → the + tarde → afternoon: English says in the afternoon (Spain's por la tarde).", minimal: "Three words." },
    "playa del carmen": { reason: "lexical_expression", split: "playa → beach + del → of the + carmen would translate a city's name.", minimal: "The three-word name only." },
    "adultos mayores": { reason: "lexical_expression", split: "adultos → adults + mayores → older is a calque; the usual word for older people = seniors.", minimal: "Two words." },
    "la mitad": { reason: "lexical_expression", split: "la → the + mitad → half would add an article English doesn't use (pay half).", minimal: "Two words." },
    "media hora": { reason: "lexical_expression", split: "media → half + hora → hour: English says half an hour, with its own article.", minimal: "Two words." },
    "sala de espera": { reason: "lexical_expression", split: "sala → room + de → of + espera → waiting misreads the compound noun: waiting room.", minimal: "Three words, one noun." },
    "aire acondicionado": { reason: "lexical_expression", split: "aire → air + acondicionado → conditioned misreads the compound noun: air conditioning.", minimal: "Two words, one noun." },
    "a tiempo": { reason: "lexical_expression", split: "a → to + tiempo → time misreads the adverb: on time.", minimal: "Two words." },
    "en la tarde": { reason: "lexical_expression", split: "en → in + la → the + tarde → afternoon: one English phrase, in the afternoon.", minimal: "Three words." },
    "sin costo": { reason: "lexical_expression", split: "sin → without + costo → cost reads word by word; English says free (of charge).", minimal: "Two words." },
    "me da": { reason: "grammatical_fusion", split: "me → to me + da → it gives: the fixed phrase me da igual = it makes no difference to me.", minimal: "Clitic and verb only; igual stays separate." },
  },

  mission: [
    { step: "dest", lt: "Say where you're going" },
    { step: "trip", lt: "Choose one-way or round-trip" },
    { step: "ret", lt: "Say when you're coming back", optional: true },
    { step: "time", lt: "Choose a departure" },
    { step: "seat", lt: "Choose a seat", optional: true },
    { step: "pay", lt: "Pay for your ticket" },
    { lt: "Find out when your bus leaves", done: (c) => !!c.s.knowTime },
    { lt: "Find out which gate it leaves from", done: (c) => !!c.s.knowTrack },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "student_id", when: (c) => !!c.s.discPending && c.s.disc === undefined, done: (c) => c.s.disc !== undefined,
      ask: (c) => c.say("ask_card_id"),
      expects: ["show_id", "here_you_go_ctx", "no_id"],
      suggest: [{ lt: "Show your card", hint: "show_card" }],
      yes: (c) => { applyDiscount(c); },
      no: (c) => { noCard(c); } },
    { id: "discount", when: (c) => (!!c.s.trip || !!c.s.discAsked) && c.s.askDiscount && c.s.disc === undefined && !c.s.discPending && !c.s.paid, done: (c) => c.s.disc !== undefined,
      ask: (c) => c.say("ask_discount"), expects: ["discount_claim", "disc_kind_ctx", "no_discount_ctx"],
      suggest: [{ lt: "Say whether you have an INAPAM senior card", hint: "discount_ans" }],
      yes: (c) => { c.say("ask_card_id"); c.hold(); c.s.discPending = c.s.discPending ?? "senior"; },
      no: (c) => { c.s.disc = ""; } },
    { id: "dest", done: (c) => !!c.s.dest,
      ask: (c) => {
        if (!c.s.greeted) {
          c.s.greeted = true;
          if (c.s.hay) { c.say("greet_hay"); expectHowAreYou(c); return; }
          c.say("greet");
          return;
        }
        c.say("ask_dest");
      },
      expects: ["buy", "dest_ctx", "ask_next", "ask_price"],
      suggest: [
        { lt: "Ask for a ticket to where you're going", hint: "buy", options: "dest" },
        { lt: "Ask when the next bus leaves", hint: "next_bus" },
      ],
      help: (c) => { c.say("dest_list"); } },
    { id: "count", when: (c) => !!c.s.dest && c.s.askCount && c.s.count === undefined, done: (c) => c.s.count !== undefined,
      ask: (c) => { if (c.s.countOpen) c.say("ask_how_many"); else c.say("ask_count"); },
      expects: ["count_ctx"],
      suggest: [{ lt: "Say how many tickets", hint: "count" }],
      yes: (c) => { c.s.count = 1; },
      no: (c) => { c.s.countOpen = true; } },
    { id: "trip", when: (c) => !!c.s.dest, done: (c) => !!c.s.trip,
      ask: (c) => c.say("ask_trip"), expects: ["trip_ans", "buy"],
      suggest: [{ lt: "Say one-way or round-trip", hint: "trip" }] },
    { id: "ret", when: (c) => c.s.trip === "round", done: (c) => c.s.ret !== undefined,
      ask: (c) => c.say("ask_return"), expects: ["ret_ctx"],
      suggest: [{ lt: "Say when you're coming back", hint: "ret" }],
      help: (c) => { tickets.handlers.ret_ctx(c, {}, { intent: "ret_ctx", slots: {}, tags: ["open"] }); } },
    { id: "travel_day", when: (c) => !!c.s.trip && c.s.askDay && c.s.travel === undefined, done: (c) => c.s.travel !== undefined,
      ask: (c) => c.say(c.s.travelOpen ? "ask_when_travel" : "ask_travel_day"), expects: ["travel_ctx"],
      suggest: [{ lt: "Say what day you're traveling", hint: "travel" }],
      yes: (c) => { c.s.travel = "today"; },
      no: (c) => { c.s.travelOpen = true; } },
    { id: "time", when: (c) => !!c.s.trip, done: (c) => !!c.s.dep,
      ask: (c) => askTime(c),
      expects: ["time_ctx", "travel_ctx", "ask_other_ctx"],
      // a no to tomorrow's two buses (asked after "¿Hay uno más tarde?" at tomorrow's offer): walks off, as at the offer
      no: (c) => { if (c.s.tomorrowOffered && c.s.travel === "tomorrow") { c.say("walk_off"); c.end(); } },
      suggest: [{ lt: "Choose a departure", hint: "time" }] },
    { id: "soldout", when: (c) => c.s.dep === "first" && (!c.s.travel || c.s.travel === "today") && c.s.soldTwist && !c.s.soldTold && !c.s.paid, done: (c) => !!c.s.soldTold,
      ask: (c) => {
        c.twist("sold_out");
        c.s.soldTold = true; c.s.full = c.s.dest; c.s.dep = undefined; // full: this destination's morning bus, today
        c.say("sold_out", { at: clock(dest(c.s.dest).time), late: clock(LATE) });
        c.expect(soldPending());
      } },
    { id: "seat", when: (c) => !!c.s.dep && c.s.askSeat, done: (c) => !!c.s.seat,
      ask: (c) => c.say("ask_seat"), expects: ["seat_ans", "seat_not_ctx"],
      suggest: [{ lt: "Choose a seat", hint: "seat" }] },
    { id: "name", when: (c) => !!c.s.dep, done: (c) => !!c.s.named,
      ask: (c) => c.say(count(c) > 1 ? "ask_id_many" : "ask_id"),
      expects: ["show_id", "here_you_go_ctx", "name_ctx", "id_q", "no_id"],
      suggest: [{ lt: "Show your ID or give your name", hint: "idcard" }],
      yes: (c) => { idDone(c, "paid_thanks"); },
      no: (c) => { tickets.handlers.no_id(c, {}, { intent: "no_id", slots: {}, tags: [] }); } },
    { id: "pay", when: (c) => !!c.s.trip && !!c.s.dep, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.totalSaid) {
          c.s.totalSaid = true;
          c.say("say_total", { price: total(c) });
          if (c.s.payWith) { finishPay(c, c.s.payWith); return; }
          if (c.chance(0.5)) c.say("ask_pay");
          return;
        }
        c.say("ask_pay");
      },
      expects: ["pay_card", "pay_cash", "here_you_go_ctx", "discount_ask", "ask_dollars"],
      suggest: [{ lt: "Pay by card or in cash", hint: "pay" }, { lt: "Ask about discounts", hint: "discount" }] },
    { id: "ticket", when: (c) => !!c.s.paid, done: (c) => !!c.s.ticketGiven,
      ask: (c) => {
        c.s.ticketGiven = true;
        c.say(count(c) > 1 ? "ticket_many" : "ticket_one");
        if (c.s.volunteer || c.s.retell) tellInfo(c);
      },
      // "No, eso es todo" to "Aquí tiene su boleto": Don Raúl still says when and where (not "¿Algo más?")
      expects: ["more_no"],
      no: (c) => { if (!c.s.knowTime || !c.s.knowTrack) { c.say("just_so"); tellInfo(c); } },
      suggest: [
        { lt: "Say thank you", hint: "g_social" },
        { lt: "Ask when and from which gate your bus leaves", hint: "info" },
      ] },
    { id: "info", when: (c) => !!c.s.ticketGiven && (!c.s.knowTime || !c.s.knowTrack), done: () => false,
      ask: (c) => c.say("anything_else"),
      expects: ["ask_next", "ask_track", "ask_change", "ask_duration", "more_no", "ask_ontime", "ask_luggage", "ask_early", "question_ctx"],
      suggest: [
        { lt: "Ask when and from which gate your bus leaves", hint: "info" },
        { lt: "Say that's all", hint: "g_yesno" },
      ],
      yes: (c) => { c.say("tell_me"); c.hold(); },
      no: (c) => { c.say("just_so"); tellInfo(c); } },
  ],

  init: (c) => {
    c.s.hay = c.chance(0.25);
    c.s.askCount = c.chance(0.4);
    c.s.askDay = c.chance(0.3);
    c.s.askSeat = c.chance(0.85);
    c.s.askDiscount = c.chance(0.3);
    c.s.volunteer = c.chance(0.4);
    c.s.soldTwist = c.visits >= 1 && c.chance(0.4);
  },

  start: () => { /* the first step greets */ },

  handlers: {
    buy(c, slots, seg) {
      const tags = allTags(slots, seg);
      // a new destination, number or trip after the total was said: Don Raúl says the new total
      const order = () => `${c.s.dest}|${count(c)}|${c.s.trip}`;
      const before = order();
      if (slots.dest === "playa" && !c.s.paid && beachOnly(c.heard)) { askPlaya(c); return; }
      if (slots.dest && !c.s.paid) setDest(c, slots.dest);
      const n = countOf(tags);
      if (n && !c.s.paid) c.s.count = n;
      const trip = tripOf(tags);
      if (trip && !c.s.paid) c.s.trip = trip;
      if (slots.day && !c.s.paid) setTravel(c, slots.day);
      if (!c.s.paid && c.s.dest) {
        if (tags.includes("first")) c.s.dep = "first";
        else if (slots.time) { const d = depOf(c, slots.time); if (d) c.s.dep = d; }
      }
      if (c.s.totalSaid && !c.s.paid && order() !== before) c.s.totalSaid = false;
    },
    buy_unknown(c) { c.say("dest_unknown"); c.say("dest_list"); },
    dest_ctx(c, slots, seg) {
      if (c.s.paid) return;
      if (slots.dest === "playa" && beachOnly(c.heard)) { askPlaya(c); return; }
      setDest(c, slots.dest);
      const trip = tripOf(allTags(slots, seg));
      if (trip) c.s.trip = trip;
    },
    not_dest(c, slots, seg) {
      const d = Array.isArray(slots.dest) ? slots.dest[0] : slots.dest;
      // "No, a Cancún" on a ticket for Mérida (commas are lost): the second is the answer (rule 10), said back
      if (d && c.s.dest !== d && allTags(slots, seg).includes("bare")) { changeDest(c, d); return; }
      if (!d || c.s.dest !== d) { if (c.s.dest) c.say("ack"); return; }
      if (c.s.paid) reRing(c);
      c.s.dest = undefined; c.s.trip = undefined; c.s.ret = undefined; c.s.dep = undefined; c.s.totalSaid = false;
      c.ask("dest"); // the dest step's question, so a bare "A Cancún" answers it
    },
    trip_ans(c, slots, seg) {
      if (c.s.paid) return;
      const tags = allTags(slots, seg);
      if (tags.includes("amb")) { c.say("which_trip"); c.hold(); return; }
      const trip = tripOf(tags);
      if (trip && c.s.totalSaid && trip !== c.s.trip) { c.s.totalSaid = false; c.say("changed"); } // the pay step says the new total
      if (trip) c.s.trip = trip;
      if (trip === "oneway") c.s.ret = undefined;
      // "Dos boletos sencillos": the number counts too ("un boleto redondo" is the kind of ticket, not a change to one)
      const n = countOf(tags);
      if (n && (c.s.count === undefined || (n >= 2 && n !== count(c)))) { if (c.s.totalSaid && n !== count(c)) c.s.totalSaid = false; c.s.count = n; }
      if (slots.day && c.s.trip === "round") setReturn(c, slots.day);
    },
    count_ctx(c, slots, seg) {
      const tags = allTags(slots, seg);
      if (tags.includes("more")) { c.s.countOpen = true; c.say("ask_how_many"); c.hold(); return; }
      const n = countOf(tags, slots.number);
      if (n) c.s.count = n;
    },
    change_count(c, slots, seg) {
      const n = countOf(allTags(slots, seg), slots.number);
      if (!n) return;
      if (c.s.paid) {
        if (n === count(c)) { c.say(n === 1 ? "count_one" : "ack"); return; }
        c.s.count = n; reRing(c); return;
      }
      if (n !== count(c)) c.s.totalSaid = false; // the pay step says the new total
      c.s.count = n;
      c.say(n === 1 ? "count_one" : "changed");
    },
    ret_ctx(c, slots, seg) {
      if (c.s.ret !== undefined) return;
      const tags = allTags(slots, seg);
      if (tags.includes("amb")) { c.say("which_day"); c.hold(); return; }
      if (tags.includes("open")) {
        // no return date: sell the way there only (the return is bought there)
        c.s.ret = "open"; c.s.trip = "oneway";
        if (c.s.totalSaid && !c.s.paid) c.s.totalSaid = false;
        c.say("ret_open"); return;
      }
      if (tags.includes("sameday")) { setReturn(c, "today"); return; }
      if (tags.includes("nextday")) { setReturn(c, "tomorrow"); return; }
      if (slots.day) { setReturn(c, slots.day); return; }
      c.s.ret = slots.date ?? "later"; c.say("ret_ok_date");
    },
    travel_ctx(c, slots, seg) {
      const tags = allTags(slots, seg);
      if (tags.includes("amb")) { c.s.travelOpen = true; c.say("ask_when_travel"); c.hold(); return; }
      // "Mañana en la tarde": the day and the departure at once
      const part = tags.includes("morning") ? "first" : tags.includes("afternoon") || tags.includes("evening") ? "late" : undefined;
      if (part && c.s.dest && !c.s.paid) { tickets.handlers.time_ctx(c, slots, { ...seg, tags: [...seg.tags, part] }); return; }
      setTravel(c, slots.day ?? "today");
      c.say(c.s.travel === "tomorrow" ? "travel_tomorrow" : "ack");
    },
    time_ctx(c, slots, seg) {
      if (c.s.paid || !c.s.dest) return;
      const tags = allTags(slots, seg);
      if (slots.day) setTravel(c, slots.day);
      if (tags.includes("amb")) { askTime(c); c.hold(); return; }
      let dep: "first" | "late" | undefined = tags.includes("late") ? "late" : tags.includes("first") ? "first" : undefined;
      if (!dep && slots.time) dep = depOf(c, slots.time);
      if (!dep) { c.say("no_such_time", { at: clock(dest(c.s.dest).time), late: clock(LATE) }); c.hold(); return; }
      if (dep === "first" && fullNow(c)) { c.say("still_full", { at: clock(dest(c.s.dest).time) }); askTime(c); return; }
      if (c.s.totalSaid && dep !== c.s.dep) c.s.totalSaid = false;
      c.s.dep = dep;
      // (no "Muy bien, el de…" when the sold-out step follows: today's first bus, the twist not told yet)
      const soldNext = dep === "first" && c.s.soldTwist && !c.s.soldTold && (!c.s.travel || c.s.travel === "today");
      // (after the sold-out offers, tomorrow's bus is said with "mañana")
      if (!soldNext) c.say(c.s.tomorrowOffered && c.s.travel === "tomorrow" ? "tomorrow_ok" : "time_ok", { at: clock(depTime(c)!) });
    },
    // outside the sold-out question, these mean nothing yet
    accept_ctx(c) { c.say("ack"); },
    late_no_ctx(c) { c.say("ack"); },
    tomorrow_no_ctx(c) { c.say("ack"); },
    ask_earlier_ctx(c) { if (c.s.dest) askTime(c); },
    ask_other_ctx(c, slots, seg) {
      if (!c.s.dest) return;
      const tags = allTags(slots, seg);
      if (fullNow(c) || !(tags.includes("later") || tags.includes("earlier"))) { askTime(c); c.hold(); return; }
      if (tags.includes("later")) c.say("later_one", { late: clock(LATE) }); else c.say("first_one", { at: clock(dest(c.s.dest).time) });
      c.hold();
    },
    seat_ans(c, slots, seg) {
      const tags = allTags(slots, seg);
      const kind = ["window", "aisle", "front", "back", "together"].find((k) => tags.includes(k)) ?? "any";
      c.s.seat = kind;
      if (kind === "front") { c.say("seat_front"); return; }
      if (kind === "back") { c.say("seat_back"); return; }
      if (count(c) > 1) { c.say(kind === "together" ? "seat_together" : "seat_pair"); return; }
      c.say(kind === "aisle" ? "seat_aisle" : kind === "any" ? "seat_any" : "seat_window");
    },
    seat_not_ctx(c, slots, seg) { tickets.handlers.seat_ans(c, slots, seg); },
    name_ctx(c) { if (c.s.named) return; idDone(c, "name_ok"); },
    show_id(c, slots, seg) {
      const tags = allTags(slots, seg);
      // an INAPAM card is for the discount; a passport or other ID is for the name on the ticket. A student card gives
      // no discount now (only in school vacations), but at the ID check it is an ID like any other
      if ((tags.includes("student") || /\bestudiante/.test(fold(c.heard))) && !(c.step === "name" && !c.s.named)) { vacationsOnly(c, "student"); return; }
      if (tags.includes("student") || tags.includes("senior") || tags.includes("card")) {
        if (c.s.discPending && c.s.disc === undefined) { applyDiscount(c); return; }
        if (!c.s.named && c.step === "name") { idDone(c, "id_back"); return; }
        c.say("ack"); return;
      }
      if (c.s.discPending && c.s.disc === undefined && c.step === "student_id") { noCard(c); }
      if (!c.s.named) { idDone(c, tags.includes("passport") ? "passport_back" : "id_back"); return; }
      c.say("ack");
    },
    here_you_go_ctx(c) {
      if (c.s.discPending && c.s.disc === undefined) { applyDiscount(c); return; }
      if (c.step === "name" && !c.s.named) { idDone(c, "id_back"); return; }
      if (c.s.totalSaid && !c.s.paid) { finishPay(c, "any"); return; }
      c.say("ack");
    },
    id_q(c) { c.say("id_fine"); },
    no_id(c) {
      if (c.s.discPending && c.s.disc === undefined) { noCard(c); return; }
      if (!c.s.named && c.s.dep) {
        c.say(c.s.fullAsked ? "name_remind" : "ask_full_name"); // said again: a short reminder, not the same line (rule 8)
        c.s.fullAsked = true;
        c.expect({ id: "full_name", expects: ["name_ctx"], hints: ["idcard"], suggest: [{ lt: "Say your full name", hint: "idcard" }],
          on: { name_ctx: (cc) => { idDone(cc, "name_ok"); } },
          ask: (cc) => cc.say("ask_full_name") });
        return;
      }
      c.say("ack");
    },
    discount_ask(c, slots, seg) {
      const tags = allTags(slots, seg);
      if (tags.includes("child")) { c.say("child_disc"); return; }
      // students and teachers: only in school vacations, so no card question follows
      if (tags.includes("teacher") || tags.includes("student")) { vacationsOnly(c, tags.includes("teacher") ? "teacher" : "student", false); return; }
      c.say("discount_info");
      if (c.s.disc === undefined && !c.s.paid && !c.s.discPending) { c.s.askDiscount = true; c.s.discAsked = true; }
    },
    discount_claim(c, slots, seg) {
      const tags = allTags(slots, seg);
      // a student or a teacher: a discount only in school vacations (not now); at the card question that is a no
      if (tags.includes("teacher") || tags.includes("student")) { vacationsOnly(c, tags.includes("teacher") ? "teacher" : "student"); return; }
      if (c.s.disc !== undefined || c.s.paid) return;
      // "Tengo 67 años": seniors (60 and over, INAPAM) get it with the card; a younger adult simply doesn't
      if (typeof slots.age === "number" && !tags.includes("senior") && !tags.includes("student")) {
        if (slots.age >= 60) c.s.discPending = "senior"; else if (c.step === "discount") c.s.disc = "";
        return;
      }
      c.s.discPending = "senior"; // (students and teachers returned above)
    },
    disc_kind_ctx(c, slots, seg) { tickets.handlers.discount_claim(c, slots, seg); },
    no_discount_ctx(c) { if (c.s.disc === undefined) { c.s.disc = ""; c.s.discPending = undefined; } },
    // "Con tarjeta no, en efectivo" (#amb, commas lost): cash or card? asked again, nothing charged
    pay_card(c, slots, seg) {
      const tags = allTags(slots, seg);
      if (tags.includes("amb")) { c.say("which_pay"); c.hold(); return; }
      c.s.byPhone = tags.includes("phone"); // "con el celular": "acerque su celular", not "inserte su tarjeta"
      pay(c, "card");
    },
    pay_cash(c, slots, seg) { if (allTags(slots, seg).includes("amb")) { c.say("which_pay"); c.hold(); return; } pay(c, "cash"); },
    ask_dollars(c) { c.say("dollars"); },
    ask_next(c, slots, seg) {
      const said = slots.dest ?? destFromText(c.heard);
      if (said && !c.s.dest) setDest(c, said);
      const d = said ?? c.s.dest;
      if (!d) { destFirst(c); return; }
      // "¿A qué hora sale el último / el primero?": both departures (the 5:15 is every route's last), not "your bus"
      if (allTags(slots, seg).includes("sched")) {
        if (d === c.s.dest && fullNow(c)) { if (!c.s.tomorrowOffered) { c.say("next_at", { late: clock(LATE) }); c.hold(); } return; } // (the 5:15 is the last too)
        if (d === c.s.dest && !c.s.dep && c.step === "time") { askTime(c); c.hold(); return; }
        c.say("deps_info", { at: clock(dest(d).time), late: clock(LATE) });
        if (d === c.s.dest && !c.s.dep) c.s.timeAsked = true;
        return;
      }
      if (d !== c.s.dest) { c.say("other_leaves", { at: clock(dest(d).time) }); return; }
      if (!c.s.dep && c.step !== "time") {
        // asked before "¿Para qué hora?": the two departures as information; the current step asks its own question.
        // At the sold-out question, the next bus's time (not "Sí, el de…"), the question kept open; at tomorrow's
        // offer, the offer again (it says tomorrow's time)
        if (fullNow(c)) { if (!c.s.tomorrowOffered) { c.say("next_at", { late: clock(LATE) }); c.hold(); } }
        else { c.say("deps_info", { at: clock(dest(d).time), late: clock(LATE) }); c.s.timeAsked = true; }
        return;
      }
      if (!c.s.dep) { askTime(c); c.hold(); return; }
      c.say("leaves_at", { at: clock(depTime(c)!) });
      c.s.knowTime = true;
      checkDone(c);
    },
    ask_track(c) {
      if (!c.s.dest && destFromText(c.heard)) setDest(c, destFromText(c.heard)!);
      if (!c.s.dest) { destFirst(c); return; }
      c.say("track_is", { num: dest(c.s.dest).anden });
      c.s.knowTrack = true;
      checkDone(c);
    },
    ask_change(c, slots, seg) {
      if (!c.s.dest && destFromText(c.heard)) setDest(c, destFromText(c.heard)!);
      if (!c.s.dest) { destFirst(c); return; }
      const tags = allTags(slots, seg), stops = dest(c.s.dest).stops;
      // "¿Es directo?" → "Sí…"; "¿Tengo que cambiar?" → "No…"; "¿Hace paradas?" → the stops (rule 11)
      if (tags.includes("stops")) { if (stops) c.say(stops); else c.say("no_stops"); return; }
      // a bus with stops on the way: "directo" here means no change of bus, said that way (not "Sí, es directo" + stops)
      c.say(tags.includes("change") ? "no_change" : stops ? "direct_stops" : "direct_yes");
      if (stops) c.say(stops);
    },
    ask_duration(c, slots, seg) {
      const said = slots.dest ?? destFromText(c.heard);
      if (said && !c.s.dest) setDest(c, said);
      const d = said ?? c.s.dest;
      if (!d) { destFirst(c); return; }
      if (allTags(slots, seg).includes("arrive")) {
        const from = d === c.s.dest && c.s.dep ? depTime(c)! : dest(d).time;
        c.say("arrives", { at: clock(addMin(from, dest(d).dur)) });
        return;
      }
      c.say(dest(d).durLine);
    },
    ask_price(c, slots, seg) {
      // "¿Cuánto es?" once the total was said: this order's total (two tickets, a discount), not the fares (rule 11)
      if (c.s.totalSaid && c.s.dest && !(slots.dest ?? destFromText(c.heard)) && !tripOf(allTags(slots, seg))) { c.say("total_is", { price: total(c) }); return; }
      sayFares(c, slots);
    },
    ask_diff(c, slots) { sayFares(c, slots); },
    ask_dests(c) { c.say("dest_list"); },
    ask_ontime(c) { c.say("ontime"); },
    ask_wait(c) { c.say("waiting"); },
    ask_coffee(c) { c.say("shop"); },
    ask_food(c) { c.say("no_food"); },
    ask_wifi(c) { c.say("bus_extras"); },
    ask_restroom(c) { c.say("restroom"); },
    ask_schedule(c) { c.say("schedule"); },
    ask_luggage(c, slots, seg) { c.say(allTags(slots, seg).includes("limit") ? "luggage_limit" : "luggage"); },
    ask_early(c) { c.s.earlySaid = true; c.say("early_ans"); },
    ask_seat(c, slots, seg) { c.say(allTags(slots, seg).includes("anywhere") ? "seat_assigned" : "seat_numbered"); },
    seat_taken(c) { c.say("seat_joke"); },
    more_no(c) {
      if (c.s.ticketGiven && (!c.s.knowTime || !c.s.knowTrack)) { c.say("just_so"); tellInfo(c); }
    },
    ok_thanks() { /* acknowledged; Don Raúl moves on */ },
    question_ctx(c) { c.say("tell_me"); c.hold(); },
    echo_info(c, slots) {
      if (!c.s.dest || !c.s.dep) { c.say("ack"); return; }
      const d = dest(c.s.dest);
      let said = false;
      if (typeof slots.number === "number") {
        if (slots.number === d.anden) c.s.knowTrack = true; else { c.say("track_is", { num: d.anden }); said = true; }
      }
      if (slots.time) {
        if (depOf(c, slots.time) === c.s.dep) c.s.knowTime = true; else { c.say("leaves_at", { at: clock(depTime(c)!) }); said = true; }
      }
      if (!said) c.say("ack");
      checkDone(c);
    },
    change_trip(c, slots, seg) {
      const trip = tripOf(allTags(slots, seg));
      if (c.s.paid) {
        if (!trip || trip === c.s.trip) { c.say("ack"); return; }
        c.s.trip = trip; if (trip === "oneway") c.s.ret = undefined; reRing(c); return;
      }
      if (trip && trip !== c.s.trip) { c.s.trip = trip; if (trip === "oneway") c.s.ret = undefined; c.s.totalSaid = false; c.say("changed"); }
    },
    change_dest(c, slots, seg) {
      const d = Array.isArray(slots.dest) ? slots.dest[slots.dest.length - 1] : slots.dest;
      if (!d) return;
      if (allTags(slots, seg).includes("amb")) { askWhichDest(c); return; }
      changeDest(c, d);
    },
  },

  finish: (c) => {
    c.complete();
    c.event("give", { item: "bus-ticket", dest: c.s.dest, trip: c.s.trip });
    c.remember({ lastDest: c.s.dest });
    if (!c.s.earlySaid) { c.s.earlySaid = true; c.say("early"); }
    c.say("have_trip");
    c.expect(closingPending());
  },

  tests: [
    // every hint construction
    { say: "Un boleto a Tulum, por favor.", intent: "buy", slots: { dest: "tulum" } },
    { say: "Quisiera un boleto para Cancún.", intent: "buy", slots: { dest: "cancun" } },
    { say: "¿Me da un boleto a Mérida?", intent: "buy", slots: { dest: "merida" } },
    { say: "Un boleto redondo a Playa del Carmen, por favor.", intent: "buy", slots: { dest: "playa" } },
    { say: "Sencillo a Tulum, por favor.", intent: "buy", slots: { dest: "tulum" } },
    { say: "Dos boletos a Cancún, por favor.", intent: "buy", slots: { dest: "cancun" } },
    { say: "Voy a Mérida.", intent: "buy", slots: { dest: "merida" } },
    { say: "¿Tiene boletos para Tulum?", intent: "buy", slots: { dest: "tulum" } },
    { say: "Redondo, por favor.", intent: "trip_ans", step: "trip" },
    { say: "Sencillo, por favor.", intent: "trip_ans", step: "trip" },
    { say: "Solo de ida.", intent: "trip_ans", step: "trip" },
    { say: "Regreso el domingo.", intent: "trip_ans", step: "trip", slots: { day: "sunday" } },
    { say: "El domingo.", intent: "ret_ctx", step: "ret", slots: { day: "sunday" } },
    { say: "Regreso el viernes.", intent: "ret_ctx", step: "ret", slots: { day: "friday" } },
    { say: "Mañana en la tarde.", intent: "ret_ctx", step: "ret" },
    { say: "Solo uno, por favor.", intent: "count_ctx", step: "count" },
    { say: "Somos dos.", intent: "count_ctx", step: "count", slots: { number: 2 } },
    { say: "No, para mañana.", intent: "travel_ctx", step: "travel_day" },
    { say: "El próximo, por favor.", intent: "time_ctx", step: "time" },
    { say: "El de la tarde.", intent: "time_ctx", step: "time" },
    { say: "A las cinco y cuarto.", intent: "time_ctx", step: "time", slots: { time: { h: 5, m: 15 } } },
    { say: "Ventanilla, por favor.", intent: "seat_ans", step: "seat" },
    { say: "Pasillo, por favor.", intent: "seat_ans", step: "seat" },
    { say: "Me da igual.", intent: "seat_ans", step: "seat" },
    { say: "Juntos, por favor.", intent: "seat_ans", step: "seat" },
    { say: "Aquí tiene mi pasaporte.", intent: "show_id", step: "name" },
    { say: "Aquí tiene.", intent: "here_you_go_ctx", step: "name" },
    { say: "A nombre de Miller.", intent: "name_ctx", step: "name" },
    { say: "¿Le sirve mi pasaporte?", intent: "id_q", step: "name" },
    { say: "No traigo identificación.", intent: "no_id", step: "name" },
    { say: "¿Hay descuento para estudiantes?", intent: "discount_ask" },
    { say: "¿Tienen descuento para adultos mayores?", intent: "discount_ask" },
    { say: "Soy estudiante.", intent: "discount_claim" },
    { say: "Tengo credencial del INAPAM.", intent: "discount_claim" },
    { say: "No, ninguna.", intent: "no_discount_ctx", step: "discount", not: ["discount_claim"] },
    { say: "Aquí está mi credencial de estudiante.", intent: "show_id", step: "student_id" },
    { say: "No la traigo.", intent: "no_id", step: "student_id" },
    { say: "Con tarjeta, por favor.", intent: "pay_card", step: "pay" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card", step: "pay" },
    { say: "En efectivo.", intent: "pay_cash", step: "pay" },
    { say: "¿A qué hora sale el próximo autobús a Cancún?", intent: "ask_next", slots: { dest: "cancun" } },
    { say: "¿A qué hora sale?", intent: "ask_next" },
    { say: "¿De qué andén sale?", intent: "ask_track" },
    { say: "¿Es directo?", intent: "ask_change" },
    { say: "¿Tengo que cambiar de autobús?", intent: "ask_change" },
    { say: "¿Cuánto tiempo tarda?", intent: "ask_duration" },
    { say: "¿A qué hora llega?", intent: "ask_duration" },
    { say: "¿Puedo llevar mi maleta?", intent: "ask_luggage" },
    { say: "¿Con cuánto tiempo antes tengo que llegar?", intent: "ask_early" },
    { say: "¿Sale a tiempo?", intent: "ask_ontime" },
    { say: "¿Dónde puedo esperar?", intent: "ask_wait" },
    { say: "¿Cuánto cuesta el boleto?", intent: "ask_price" },
    { say: "¿Está ocupado este asiento?", intent: "seat_taken" },
    { say: "¿Este lugar está libre?", intent: "seat_taken" },
    // natural alternatives, short answers, tú to staff, no accents
    { say: "Buenos días, ¿me vende un boleto a Cancún?", intent: "buy", slots: { dest: "cancun" } },
    { say: "Necesito ir a Playa del Carmen", intent: "buy", slots: { dest: "playa" } },
    { say: "Quiero un boleto para el de las diez y cuarto a Tulum", intent: "buy", slots: { dest: "tulum" } },
    { say: "Dos boletos de ida y vuelta a Cancún", intent: "buy", slots: { dest: "cancun" } },
    { say: "Me das un boleto a Merida", intent: "buy", slots: { dest: "merida" } },
    { say: "Cancun", intent: "dest_ctx", step: "dest", slots: { dest: "cancun" } },
    { say: "Cancun", intent: "none" },
    { say: "Un boleto a Oaxaca, por favor", intent: "buy_unknown" },
    { say: "Viaje redondo", intent: "trip_ans", step: "trip" },
    { say: "Nomás ida", intent: "trip_ans", step: "trip" },
    { say: "No voy a regresar", intent: "trip_ans", step: "trip", not: ["buy"] },
    { say: "Todavía no sé", intent: "ret_ctx", step: "ret" },
    { say: "Para mí y mi esposa", intent: "count_ctx", step: "count" },
    { say: "El que sigue, por favor", intent: "time_ctx", step: "time" },
    { say: "Lo antes posible", intent: "time_ctx", step: "time" },
    { say: "Prefiero ventana", intent: "seat_ans", step: "seat" },
    { say: "Me llamo Ryan Miller", intent: "name_ctx", step: "name" },
    { say: "Lo dejé en el hotel", intent: "no_id", step: "name" },
    { say: "Soy jubilada", intent: "discount_claim" },
    { say: "Tengo 67 años", intent: "discount_claim", slots: { age: 67 } },
    { say: "¿Aceptan tarjeta?", intent: "pay_card", step: "pay" },
    { say: "¿Aceptan dólares?", intent: "ask_dollars", step: "pay", not: ["pay_cash"] },
    { say: "¿Cuánto se hace a Mérida?", intent: "ask_duration" },
    { say: "¿En qué andén?", intent: "ask_track" },
    { say: "¿De qué plataforma sale?", intent: "ask_track" },
    { say: "¿El autobús tiene wifi?", intent: "ask_wifi" },
    { say: "¿Dónde está el baño?", intent: "ask_restroom" },
    { say: "Andén dos, a las diez y cuarto", intent: "echo_info", step: "info" },
    { say: "Mejor redondo", intent: "change_trip", step: "pay" },
    { say: "Siempre no, nada más un boleto", intent: "change_count", step: "pay" },
    { say: "Mejor a Playa del Carmen", intent: "change_dest", step: "pay", slots: { dest: "playa" } },
    // Spain forms are correct answers, with no tip
    { say: "¿Tenéis billetes para Cancún?", intent: "buy", slots: { dest: "cancun" } },
    { say: "Ponme un billete de ida y vuelta a Tulum", intent: "buy", slots: { dest: "tulum" } },
    { say: "Vale, un billete para Mérida", intent: "buy", slots: { dest: "merida" } },
    { say: "¿Dónde están los aseos?", intent: "ask_restroom" },
    // meaning must not flip
    { say: "No quiero ir a Cancún", intent: "not_dest", step: "dest", not: ["buy", "dest_ctx"] },
    { say: "No voy a Tulum", intent: "not_dest", not: ["buy"] },
    { say: "No sencillo, redondo", intent: "trip_ans", step: "trip" },
    { say: "No el sábado, el domingo", intent: "ret_ctx", step: "ret", slots: { day: "sunday" } },
    { say: "No el de la mañana, el de la tarde", intent: "time_ctx", step: "time" },
    { say: "No ventanilla, pasillo", intent: "seat_ans", step: "seat" },
    { say: "No quiero pasillo", intent: "seat_not_ctx", step: "seat", not: ["seat_ans"] },
    { say: "No traigo efectivo", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "No tengo tarjeta", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No soy estudiante", intent: "no_discount_ctx", step: "discount", not: ["discount_claim"] },
    { say: "No son dos, son tres", intent: "change_count", step: "pay", slots: { number: 3 } },
    { say: "No tengo que cambiar de autobús", intent: "none", step: "info" },
    { say: "No necesito un boleto", intent: "none", step: "dest" },
    { say: "No quiero pagar con tarjeta", intent: "none", step: "pay" },
    // review: corrections, short answers and traps a blind set found
    { say: "No voy a Cancún, voy a Mérida", intent: "change_dest", step: "trip", slots: { dest: "merida" }, not: ["not_dest"] },
    { say: "Ventanilla no, mejor pasillo", intent: "seat_ans", step: "seat" },
    { say: "Pasillo no", intent: "seat_not_ctx", step: "seat", not: ["seat_ans"] },
    { say: "Cerca de la ventana", intent: "seat_ans", step: "seat" },
    { say: "Todavía no sé cuándo regreso", intent: "ret_ctx", step: "ret" },
    { say: "No sé", intent: "ret_ctx", step: "ret" },
    { say: "Hoy mismo", intent: "travel_ctx", step: "travel_day" },
    { say: "Sí, solo", intent: "count_ctx", step: "count" },
    { say: "Somos dos", intent: "change_count", step: "trip", slots: { number: 2 } },
    { say: "El primero que salga", intent: "time_ctx", step: "time" },
    { say: "El de la mañana no, el de la tarde", intent: "time_ctx", step: "time" },
    { say: "Lo tengo en el hotel", intent: "no_id", step: "name", not: ["show_id", "here_you_go_ctx"] },
    { say: "¿Hay descuento para niños?", intent: "discount_ask" },
    { say: "Sí, una pregunta", intent: "question_ctx", step: "info" },
    { say: "Soy de Canadá", intent: "none", step: "name" },
    { say: "Ya no soy estudiante", intent: "none", step: "discount" },
    { say: "No tengo tarjeta ni efectivo", intent: "none", step: "pay" },
    // lead's check: corrections whose "no" flipped a payment or a return day, totals, discounts
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No en efectivo, con tarjeta", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    { say: "Mejor en efectivo", intent: "pay_cash", step: "pay" },
    { say: "Quiero pagar con dólares", intent: "ask_dollars", step: "pay", not: ["pay_cash", "pay_card"] },
    { say: "¿Cuánto le debo?", intent: "ask_price", step: "pay" },
    { say: "No a Mérida, a Cancún", intent: "change_dest", step: "pay", slots: { dest: "cancun" } },
    { say: "No", intent: "yn:no", step: "ret", not: ["ret_ctx"] },
    { say: "No, el domingo", intent: "ret_ctx", step: "ret", slots: { day: "sunday" } },
    { say: "Todavía no", intent: "ret_ctx", step: "ret" },
    { say: "Hoy en la tarde", intent: "time_ctx", step: "time", slots: { day: "today" } },
    { say: "Sí, de estudiante", intent: "disc_kind_ctx", step: "discount" },
    { say: "No, ninguna de las dos", intent: "no_discount_ctx", step: "discount", not: ["discount_claim"] },
    { say: "Somos cinco", intent: "count_ctx", step: "count", slots: { number: 5 } },
    { say: "¿Hay descuento para maestros?", intent: "discount_ask", not: ["discount_claim"] },
    { say: "Sí, soy maestra", intent: "discount_claim", step: "discount", not: ["disc_kind_ctx"] },
    // audit 5 Nov 2026: a full-sentence trip answer, schedule questions that booked a bus, side questions
    { say: "Quiero un boleto redondo", intent: "trip_ans", step: "trip", not: ["buy_unknown"] },
    { say: "Dos boletos sencillos", intent: "trip_ans", step: "trip", not: ["buy_unknown"] },
    { say: "Quiero un boleto redondo a Cancún", intent: "buy", step: "dest", slots: { dest: "cancun" } },
    { say: "¿A qué hora sale el último?", intent: "ask_other_ctx", step: "time", not: ["time_ctx"] },
    { say: "¿A qué hora sale el último autobús a Cancún?", intent: "ask_next", slots: { dest: "cancun" } },
    { say: "¿A dónde tienen salidas?", intent: "ask_dests" },
    { say: "¿Cuántas maletas puedo llevar?", intent: "ask_luggage" },
    { say: "¿Dónde está el andén?", intent: "ask_track" },
    { say: "¿Cuánto cuesta para niños?", intent: "discount_ask" },
    { say: "¿Puedo pagar con el celular?", intent: "pay_card", step: "pay", not: ["pay_cash"] },
    // not understood
    { say: "Mi perro come boletos azules", intent: "none" },
    { say: "autobús plátano ventanilla", intent: "none" },
    { say: "Ayer fui a la playa con mi hermana", intent: "none" },
    { say: "Miller", intent: "none" },
  ],

  sims: [
    { name: "happy path: Tulum round-trip, asks time and gate",
      turns: ["Buenos días, un boleto a Tulum, por favor.", "Redondo, por favor.", "El domingo.", "El de las diez y cuarto.", "Ventanilla, por favor.",
        "Aquí tiene mi pasaporte.", "¿Puedo pagar con tarjeta?", "¿A qué hora sale?", "¿De qué andén sale?", "¡Gracias!"],
      auto: omit(AUTO, ["dest", "trip", "ret", "time", "seat", "name", "pay", "info"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { dest: "tulum", trip: "round", ret: "sunday", dep: "first", seat: "window", named: true, paid: true } } },
    { name: "questions first, two to Mérida, change of mind to round-trip",
      turns: ["¿Cuánto cuesta un boleto a Mérida?", "¿Es directo?", "¿Cuánto tiempo tarda?", "Dos boletos sencillos a Mérida, por favor.", "Mejor redondo.",
        "El viernes.", "El de la tarde.", "Juntos, por favor.", "Aquí tiene mi pasaporte.", "Ana Miller.", "En efectivo.", "¿Puedo llevar mi maleta?", "No, es todo, gracias.", "¿Está ocupado este asiento?"],
      auto: omit(AUTO, ["dest", "trip", "ret", "time", "seat", "name", "pay", "info"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { dest: "merida", count: 2, trip: "round", ret: "friday", dep: "late", seat: "together" } } },
    { name: "sold out (twist forced): takes the 5:15",
      turns: ["Un boleto sencillo a Cancún.", "El próximo, por favor.", "¿No hay otro antes?", "Ni modo, el de las cinco y cuarto.", "Pasillo.", "Aquí tiene mi pasaporte.",
        "Con tarjeta.", "¿De qué andén sale?", "¿A qué hora llega?", "¿A qué hora sale?", "Gracias, adiós."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay", "info"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: false }); },
      expect: { complete: true, state: { dest: "cancun", dep: "late", soldTold: true, seat: "aisle" } } },
    { name: "sold out (twist forced): no, tomorrow instead",
      turns: ["Quiero un boleto a Mérida para el de las once y media.", "Sencillo.", "No, gracias.", "Sí, por favor.", "Me da igual.", "Aquí tiene.", "En efectivo.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "sold_out", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "merida", travel: "tomorrow", dep: "first" } } },
    { name: "short answers at every question",
      turns: ["A Tulum.", "Sencillo.", "El próximo.", "Ventanilla.", "Aquí tiene.", "Tarjeta.", "Gracias."],
      auto: {}, setup: (s) => { Object.assign(s, FIXED, { volunteer: true }); },
      expect: { complete: true, state: { dest: "tulum", trip: "oneway", dep: "first", seat: "window", named: true, paid: true } } },
    // audit 5 Nov: in November students pay the full fare (their half is for school vacations only)
    { name: "a student asks: only in school vacations, the full fare to Playa del Carmen",
      turns: ["Hola. ¿Hay descuento para estudiantes?", "Soy estudiante.", "Un boleto a Playa del Carmen.", "Sencillo.",
        "El de la tarde.", "Pasillo.", "Me llamo Ryan Miller.", "¿Cuánto es?", "Con tarjeta.", "¿Sale a tiempo?", "¿A qué hora sale?", "¿En qué andén?", "Gracias, adiós."],
      auto: omit(AUTO, ["dest", "trip", "time", "seat", "name", "pay", "info"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { disc: undefined, discPending: undefined, dest: "playa", dep: "late", paid: true } } },
    { name: "fewer tickets after paying (rung up again), no ID on hand",
      turns: ["Dos boletos sencillos a Tulum, por favor.", "El próximo.", "Ventanilla.", "No traigo mi pasaporte.", "Ryan Miller.", "Ana Miller.", "Con tarjeta.",
        "Siempre no, nada más un boleto.", "En efectivo.", "¿A qué hora sale?", "¿De qué andén sale?", "Gracias, adiós."],
      auto: omit(AUTO, ["dest", "trip", "time", "seat", "name", "pay", "ticket", "info"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { count: 1, paid: true } } },
    { name: "how many and which day (both asked)",
      turns: ["Buenos días. A Cancún, por favor.", "No, somos dos.", "Redondo.", "El domingo.", "No, mañana.", "¿Hay uno más tarde?", "El de la tarde.", "Juntos, por favor.",
        "Aquí tiene mi pasaporte.", "Con tarjeta.", "Gracias."],
      auto: omit(AUTO, ["dest", "count", "trip", "ret", "travel_day", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { askCount: true, askDay: true, volunteer: true }); },
      expect: { complete: true, state: { count: 2, travel: "tomorrow", dep: "late", seat: "together" } } },
    { name: "senior card asked for, cash",
      turns: ["Un boleto a Tulum.", "Sencillo.", "Tengo credencial del INAPAM.", "Aquí tiene.", "El próximo.", "Ventanilla.", "Aquí tiene mi pasaporte.", "En efectivo.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "discount", "student_id", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { askDiscount: true, volunteer: true }); },
      expect: { complete: true, state: { disc: "senior", dep: "first", paid: true } } },
    { name: "Spain forms, the return left open",
      turns: ["Ponme un billete de ida y vuelta para Cancún.", "Todavía no sé.", "Vale, el de la tarde.", "Ventanilla.", "Aquí tiene mi pasaporte.", "Con tarjeta.",
        "¿Dónde están los aseos?", "Vale, gracias."],
      auto: omit(AUTO, ["dest", "trip", "ret", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: true }); },
      expect: { complete: true, state: { dest: "cancun", trip: "oneway", ret: "open", dep: "late" } } },
    { name: "sold out (twist forced): no to the 5:15, no to tomorrow (walks off, no ticket)",
      turns: ["Un boleto a Cancún.", "Sencillo.", "El próximo.", "No, esa hora no me sirve.", "Mañana no puedo."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: false }); },
      expect: { complete: false, state: { dest: "cancun", full: "cancun", tomorrowOffered: true } } },
    { name: "sold out (twist forced): no, then \"hoy\" at tomorrow's offer: the 5:15",
      turns: ["Un boleto a Tulum.", "Sencillo.", "El próximo.", "No.", "Hoy.", "Sí, está bien.", "Pasillo.", "Aquí tiene mi pasaporte.", "En efectivo.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "tulum", dep: "late", paid: true } } },
    { name: "travels on Friday: no sold-out twist for today's bus",
      turns: ["Un boleto a Mérida.", "Sencillo.", "No, el viernes.", "El primero.", "Ventanilla.", "Aquí tiene mi pasaporte.", "Con tarjeta.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "travel_day", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { askDay: true, soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "merida", travel: "friday", dep: "first", paid: true } } },
    { name: "the beach is not Playa del Carmen; a question first; corrections",
      turns: ["Quiero ir a la playa.", "No, a Tulum.", "¿A qué hora sale el próximo autobús?", "Sencillo.", "No voy a Tulum, voy a Mérida.", "El de la tarde.",
        "Pasillo no.", "No.", "Lo tengo en el hotel.", "Ryan Miller.", "Con tarjeta.", "No, eso es todo."],
      auto: omit(AUTO, ["dest", "trip", "time", "seat", "name", "pay", "ticket", "info"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { dest: "merida", trip: "oneway", dep: "late", seat: "window", named: true, paid: true } } },
    // lead's check
    { name: "sold out (twist forced): no, then tomorrow at five: tomorrow's 5:15, not today's",
      turns: ["Un boleto a Cancún.", "Sencillo.", "El próximo.", "No.", "Sí, mañana a las cinco.", "Ventanilla.", "Aquí tiene mi pasaporte.", "Con tarjeta.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "cancun", travel: "tomorrow", dep: "late", paid: true } } },
    { name: "sold out (twist forced): Friday at five (Friday's 5:15), then another place",
      turns: ["Un boleto a Cancún.", "Sencillo.", "El próximo.", "El viernes a las cinco.", "Mejor a Tulum.", "Ventanilla.", "Aquí tiene mi pasaporte.", "En efectivo.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "tulum", travel: "friday", dep: "late", full: "cancun", paid: true } } },
    { name: "sold out (twist forced): another place at once, its first bus",
      turns: ["Un boleto a Cancún.", "Sencillo.", "El próximo.", "Mejor a Tulum.", "El primero.", "Pasillo.", "Aquí tiene mi pasaporte.", "Con tarjeta.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "tulum", dep: "first", full: "cancun", paid: true } } },
    { name: "corrections said back or asked again (place, return day, payment); the total asked",
      turns: ["Un boleto redondo a Mérida.", "No, a Cancún.", "El lunes no.", "El domingo.", "El de la tarde.", "Ventanilla.", "Aquí tiene mi pasaporte.", "¿Cuánto es?",
        "A Cancún no, a Tulum.", "A Tulum.", "Tarjeta no, efectivo.", "En efectivo.", "No, es todo, gracias."],
      auto: omit(AUTO, ["dest", "trip", "ret", "time", "seat", "name", "pay", "ticket", "info"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { dest: "tulum", trip: "round", ret: "sunday", dep: "late", payWith: "cash", paid: true } } },
    { name: "after the goodbye, \"A Mérida no, a Cancún\": asked which, rung up again",
      turns: ["Un boleto a Mérida.", "Sencillo.", "El primero.", "Ventanilla.", "Aquí tiene mi pasaporte.", "Con tarjeta.", "No, eso es todo.", "A Mérida no, a Cancún.", "A Cancún.",
        "Con tarjeta.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { dest: "cancun", trip: "oneway", dep: "first", paid: true } } },
    { name: "a student at the INAPAM question: no discount, the full fare; pays by phone",
      turns: ["Un boleto a Cancún.", "Sencillo.", "Soy estudiante.", "¿A qué hora sale el último?", "El primero.", "Ventanilla.", "Aquí tiene mi pasaporte.", "¿Puedo pagar con el celular?",
        "¿Cuántas maletas puedo llevar?", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "discount", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { askDiscount: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "cancun", disc: "", dep: "first", byPhone: true, paid: true } } },
    { name: "full sentences: a round-trip ticket said whole; the place given with the no; where the gate is",
      turns: ["Quiero ir a la playa.", "No, a Mérida.", "Quiero dos boletos redondos.", "Regreso el domingo.", "El de la mañana.", "Juntos, por favor.", "Aquí tiene mi pasaporte.",
        "Ana Miller.", "Con tarjeta.", "¿Dónde está el andén?", "¿A qué hora sale?", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "ret", "time", "seat", "name", "pay", "info", "other_name"]), setup: (s) => { Object.assign(s, FIXED, { volunteer: false }); },
      expect: { complete: true, state: { dest: "merida", count: 2, trip: "round", ret: "sunday", dep: "first", seat: "together", paid: true } } },
    { name: "sold out (twist forced): questions at both offers book nothing; tomorrow's 5:15 chosen",
      turns: ["Un boleto a Cancún.", "Sencillo.", "El próximo.", "¿Hay uno más tarde?", "No, gracias.", "¿Hay uno más tarde?", "El de la tarde.", "Pasillo.",
        "Aquí tiene mi pasaporte.", "En efectivo.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "time", "sold_out", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { soldTwist: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "cancun", travel: "tomorrow", dep: "late", tomorrowOffered: true, paid: true } } },
    { name: "a teacher at the card question: no student half",
      turns: ["Un boleto a Tulum.", "Sencillo.", "Soy maestra.", "El primero.", "Ventanilla.", "Aquí tiene mi pasaporte.", "¿Cuánto es?", "En efectivo.", "Gracias."],
      auto: omit(AUTO, ["dest", "trip", "discount", "time", "seat", "name", "pay", "ticket"]), setup: (s) => { Object.assign(s, FIXED, { askDiscount: true, volunteer: true }); },
      expect: { complete: true, state: { dest: "tulum", disc: "", paid: true } } },
  ],
};

// ---------------------------------------------------------------------------

/** Sold out (twist): yes = the 5:15; no = tomorrow's first bus, or nothing. */
function soldPending(): Pending {
  const again = (cc: Ctx) => cc.expect(soldPending());
  const full = (cc: Ctx) => { cc.say("still_full", { at: clock(dest(cc.s.dest).time) }); cc.say("sold_remind", { late: clock(LATE) }); again(cc); };
  return {
    id: "sold_out", expects: ["accept_ctx", "time_ctx", "ask_earlier_ctx", "ask_other_ctx", "travel_ctx", "ok_thanks", "late_no_ctx"], hints: ["sold_out"],
    suggest: [{ lt: "Take the 5:15 bus, or ask about another", hint: "sold_out" }],
    on: {
      accept_ctx: (cc, sl) => { if (sl.time && depOf(cc, sl.time) === "first") { full(cc); return; } lateToday(cc); },
      time_ctx: (cc, sl, sg) => {
        // "El viernes a las cinco", "Mañana en la tarde": that day's bus at the time said
        if (sl.day && !isToday(sl.day)) { otherDay(cc, sl.day, wantedDep(cc, sl, sg, "first"), again); return; }
        if (wantedDep(cc, sl, sg, "first") === "late") { lateToday(cc); return; }
        full(cc);
      },
      ask_earlier_ctx: (cc) => { cc.say("only_late", { late: clock(LATE) }); again(cc); },
      // "¿Hay uno más tarde?", "¿A qué hora sale el último?": today the 5:15 is the only one left (a question, no booking)
      ask_other_ctx: (cc, sl, sg) => { cc.say(allTags(sl, sg).includes("earlier") ? "only_late" : "today_only", { late: clock(LATE) }); again(cc); },
      travel_ctx: (cc, sl, sg) => { otherDay(cc, sl.day, wantedDep(cc, sl, sg, "first"), again); },
      ok_thanks: (cc) => { cc.say("sold_remind", { late: clock(LATE) }); again(cc); },
      late_no_ctx: (cc) => { declineLate(cc); },
      ...NEW_DEST,
    },
    yes: lateToday,
    no: (cc) => { declineLate(cc); },
    ask: (cc) => cc.say("sold_remind", { late: clock(LATE) }),
  };
  /** No to the 5:15: tomorrow's first bus, or nothing. */
  function declineLate(cc: Ctx) {
    const walkOff = (cc2: Ctx) => { cc2.say("walk_off"); cc2.end(); };
    if (cc.s.tomorrowOffered) { walkOff(cc); return; } // offered and declined once already (rule 13)
    cc.s.tomorrowOffered = true;
    cc.say("tomorrow_offer", { at: clock(dest(cc.s.dest).time) });
    // the offer is tomorrow's: "Sí" is the first bus; "el de la tarde", "a las cinco" is tomorrow's 5:15, said with
    // "mañana" ("Listo, para mañana a las 5:15"); today's 5:15, already declined, only with "Hoy"
    const tomorrowAt = (cc2: Ctx, sl: any, sg: Segment) => {
      const day = sl.day ?? "tomorrow", dep = wantedDep(cc2, sl, sg, "first");
      if (isToday(day) && dep === "late") { lateToday(cc2); return; }
      otherDay(cc2, day, dep, again);
    };
    // "¿Hay uno más tarde?", "¿A qué hora sale el último?": a question, never a booking (it was read as "la una" +
    // "más tarde" and booked tomorrow's 5:15): tomorrow's two buses, and which one; "¿Más temprano?": the first is that one
    const askOther = (cc2: Ctx, sl: any, sg: Segment) => {
      if (allTags(sl, sg).includes("earlier")) { cc2.say("first_one", { at: clock(dest(cc2.s.dest).time) }); cc2.expect(offer); return; }
      otherDay(cc2, "tomorrow", undefined, again);
    };
    const offer: Pending = {
      id: "sold_out_tomorrow", expects: ["travel_ctx", "accept_ctx", "time_ctx", "tomorrow_no_ctx", "late_no_ctx", "ask_other_ctx"], hints: ["g_yesno"], suggest: [{ lt: "Take tomorrow's bus or not", hint: "g_yesno" }],
      on: { tomorrow_no_ctx: walkOff, late_no_ctx: walkOff,
        // "Hoy" here is not a yes to tomorrow: today only the 5:15 is left
        travel_ctx: tomorrowAt, accept_ctx: tomorrowAt, time_ctx: tomorrowAt, ask_other_ctx: askOther,
        ...NEW_DEST },
      yes: (cc2) => { otherDay(cc2, "tomorrow", "first", again); },
      no: walkOff,
      ask: (cc2) => cc2.say("tomorrow_offer", { at: clock(dest(cc2.s.dest).time) }),
    };
    cc.expect(offer);
  }
}
/** Today's 5:15, the bus after the full one. */
function lateToday(cc: Ctx) { cc.s.dep = "late"; cc.s.totalSaid = false; cc.say("time_ok", { at: clock(LATE) }); }
/** Another day than the sold-out one: its bus at the time said (the morning one by default), said back with the day for
 *  tomorrow. "Hoy" leaves only the 5:15: asked again. A clock time with no bus that day: the time step asks again. */
function otherDay(cc: Ctx, day: string | undefined, dep: "first" | "late" | undefined, again: (cc: Ctx) => void) {
  if (!day || isToday(day)) { cc.say("today_only", { late: clock(LATE) }); again(cc); return; }
  setTravel(cc, day);
  if (!dep) { cc.s.dep = undefined; cc.ask("time"); return; }
  cc.s.dep = dep;
  cc.say(day === "tomorrow" ? "tomorrow_ok" : "time_ok", { at: clock(dep === "late" ? LATE : dest(cc.s.dest).time) });
}
/** At the sold-out questions, another destination ("Mejor a Tulum", "No voy a Cancún", "Un boleto a Mérida") closes the
 *  question: the full bus is that destination's, so the time step asks again for the new one. */
const NEW_DEST: Record<string, Handler> = {
  buy: (cc, sl, sg) => tickets.handlers.buy(cc, sl, sg),
  change_dest: (cc, sl, sg) => tickets.handlers.change_dest(cc, sl, sg),
  not_dest: (cc, sl, sg) => tickets.handlers.not_dest(cc, sl, sg),
};

/** The ID or the name for the ticket; with more passengers, Don Raúl asks for the other names too. */
function idDone(c: Ctx, line: string) {
  c.s.named = true;
  c.say(line);
  if (count(c) < 2 || c.s.othersNamed) return;
  c.s.othersNamed = true;
  const done = (cc: Ctx, l: string) => { cc.say(l); };
  c.say(count(c) > 2 ? "other_names" : "other_name");
  c.expect({
    id: "other_name", expects: ["name_ctx", "show_id", "here_you_go_ctx"], hints: ["idcard"], suggest: [{ lt: "Give the other passengers' names", hint: "idcard" }],
    on: { name_ctx: (cc) => done(cc, "name_ok"), show_id: (cc) => done(cc, "id_back"), here_you_go_ctx: (cc) => done(cc, "id_back") },
    ask: (cc) => cc.say(count(cc) > 2 ? "other_names" : "other_name"),
  });
}

/** "¿Para qué hora?" with both departures; once the morning bus is full, only the 5:15 is offered. */
function askTime(c: Ctx) {
  if (fullNow(c)) { c.say("sold_remind", { late: clock(LATE) }); c.expect(soldPending()); return; }
  c.say(c.s.timeAsked ? "time_again" : "ask_time", { at: clock(dest(c.s.dest).time), late: clock(LATE) });
  c.s.timeAsked = true;
}

/** A destination named anywhere in the utterance (the NLU may put "a Cancún" in its own segment). */
function destFromText(heard: string): string | undefined {
  const h = " " + heard.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ") + " ";
  for (const e of DESTS) for (const f of [e.en.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""), ...(e.forms || [])]) if (f !== "playa" && h.includes(" " + f + " ")) return e.id;
  return undefined;
}

/** "a la playa" (the beach) said without "del Carmen": Don Raúl checks which one is meant. */
function beachOnly(heard: string): boolean {
  const h = " " + heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ") + " ";
  return / la playa /.test(h) && !/ playa (del? )?carmen /.test(h);
}
function askPlaya(c: Ctx) {
  c.say("ask_playa");
  c.expect({ id: "playa_q", expects: ["dest_ctx", "buy"], hints: ["buy"], suggest: [{ lt: "Say yes, or say where you're going", hint: "buy", options: "dest" }],
    // a bare "No": the list of places; "No, a Tulum" already says where (its dest_ctx sets it), so no list
    yes: (cc) => { setDest(cc, "playa"); cc.say("ack"); }, no: (cc) => { if (!destFromText(cc.heard)) cc.say("dest_list"); },
    ask: (cc) => cc.say("ask_playa") });
}

function setDest(c: Ctx, id: string) {
  if (!id) return;
  // the time or gate already told is now another bus's: the new ticket comes with the new ones (`retell`)
  if (c.s.dest && c.s.dest !== id) { if (c.s.knowTime || c.s.knowTrack) c.s.retell = true; c.s.knowTime = false; c.s.knowTrack = false; }
  c.s.dest = id;
}

/** A change of destination, said back ("Claro, a Cancún.") so a misheard one shows; after paying, rung up again. */
function changeDest(c: Ctx, d: string) {
  if (c.s.paid) {
    if (d === c.s.dest) { c.say("ack"); return; }
    setDest(c, d); reRing(c, "dest_changed", { X: d }); return;
  }
  if (d !== c.s.dest) { setDest(c, d); c.s.totalSaid = false; } // the pay step says the new total
  c.say("dest_changed", { X: d });
}

/** "A Mérida no, a Cancún" (commas lost, rule 10): Don Raúl asks which, and a bare "A Cancún" answers. After the goodbye,
 *  a ticket still paid for (the same place, or "No") gets the goodbye's question back. */
function askWhichDest(c: Ctx) {
  c.s.askingDest = true;
  c.say("which_dest");
  const then = (cc: Ctx, run: () => void) => {
    cc.s.askingDest = false;
    run();
    if (cc.s.paid && cc.s.__finished && !cc.s.askingDest) cc.expect(closingPending());
  };
  c.expect({ id: "which_dest", expects: ["dest_ctx"], hints: ["buy"], suggest: [{ lt: "Say where you're going", hint: "buy", options: "dest" }],
    on: { dest_ctx: (cc, sl) => then(cc, () => changeDest(cc, sl.dest)), buy: (cc, sl, sg) => then(cc, () => tickets.handlers.buy(cc, sl, sg)),
      change_dest: (cc, sl, sg) => then(cc, () => tickets.handlers.change_dest(cc, sl, sg)) },
    no: (cc) => then(cc, () => cc.say("ack")), // "No": the ticket stays as it is
    ask: (cc) => cc.say("which_dest") });
}

/** After the goodbye: thanks or bye ends the visit; "Siempre no, nada más uno" after the ticket is rung up again
 *  (reRing); otherwise the goodbye stays open. */
function closingPending(): Pending {
  const change = (id: string): Handler => (cc, sl, sg) => {
    tickets.handlers[id](cc, sl, sg);
    if (cc.s.paid && !cc.s.askingDest) cc.expect(closingPending()); // (not over "¿a dónde va entonces?")
  };
  return {
    id: "closing", hints: ["g_social", "on_bus"],
    suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }, { lt: "Ask if a seat on the bus is free", hint: "on_bus" }],
    on: {
      g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
      g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
      seat_taken: (cc) => { cc.say("seat_joke"); cc.end(); },
      change_count: change("change_count"), change_trip: change("change_trip"), change_dest: change("change_dest"), not_dest: change("not_dest"),
    },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); },
  };
}

/** The one-way and round-trip fares to the place asked about (or the ticket's). */
function sayFares(c: Ctx, slots: any) {
  const said = slots.dest ?? destFromText(c.heard);
  const d = said ?? c.s.dest;
  if (!d) { destFirst(c); return; }
  if (said && !c.s.dest) setDest(c, said);
  c.say("price_one", { price: dest(d).fare });
  c.say("price_round", { price: dest(d).fare * 2 });
}

function setTravel(c: Ctx, day: string) {
  c.s.travel = day === "today" || day === "tonight" || day === "this_afternoon" || day === "this_morning" ? "today" : day;
}

function setReturn(c: Ctx, day: string) {
  c.s.ret = day;
  if (WEEK.includes(day)) c.say("ret_ok_on", { X: day });
  else if (day === "today" || day === "tomorrow") c.say("ret_ok_rel", { X: day });
  else c.say("ret_ok_date");
}

function applyDiscount(c: Ctx) {
  c.s.disc = c.s.discPending as string; c.s.discPending = undefined; c.s.totalSaid = false;
  c.say("discount_ok");
}
function noCard(c: Ctx) { c.s.disc = ""; c.s.discPending = undefined; c.say("no_card_disc"); }
/** Students and teachers: a discount only in school vacations (not now), said once a turn; at the card questions
 *  (`answers`) it is a no, so the full fare is charged. */
function vacationsOnly(c: Ctx, who: "student" | "teacher", answers = true) {
  const turn = ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
  if (c.s.__vacSaid !== turn) { c.s.__vacSaid = turn; c.say(c.s.vacTold === who ? "vac_remind" : who === "teacher" ? "teacher_disc" : "student_disc"); c.s.vacTold = who; }
  if (answers && c.s.disc === undefined && (c.s.discPending || c.step === "discount" || c.step === "student_id")) { c.s.disc = ""; c.s.discPending = undefined; }
}
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function pay(c: Ctx, method: "card" | "cash") {
  if (c.s.paid) return;
  if (!c.s.trip || !c.s.dep) { c.s.payWith = method; c.say(method === "card" ? "card_later" : "cash_later"); return; }
  if (!c.s.totalSaid) { c.s.payWith = method; return; } // the pay step says the total first
  finishPay(c, method);
}

function finishPay(c: Ctx, method: "card" | "cash" | "any") {
  c.s.paid = true;
  checkDone(c);
  c.s.payWith = method;
  c.say(method === "card" ? (c.s.byPhone ? "phone_ok" : "card_ok") : method === "cash" ? "cash_ok" : "paid_thanks");
  c.event("pay", { method, amount: total(c) });
}

/** "¿A dónde va?" before a question about the bus, said once per turn. */
function destFirst(c: Ctx) {
  const turn = ((c as any).conv?.history?.length ?? 0) + "|" + c.heard;
  if (c.s.__destFirst !== turn) { c.s.__destFirst = turn; c.say("which_dest_first"); }
  c.hold();
}

/** A change after paying: Don Raúl changes the order and rings it up again (the first payment is refunded). */
function reRing(c: Ctx, line = "change_that", vars?: Record<string, any>) {
  c.s.paid = false; c.s.totalSaid = false; c.s.ticketGiven = false; c.s.payWith = undefined;
  c.s.__finished = false;
  c.say(line, vars);
}

/** The goal: a ticket, and the learner knows when and from which gate the bus leaves. */
function checkDone(c: Ctx) {
  if (c.s.paid && c.s.knowTime && c.s.knowTrack) c.complete();
}

function tellInfo(c: Ctx) {
  c.say("bus_info", { at: clock(depTime(c)!), num: dest(c.s.dest).anden });
  c.s.knowTime = true;
  c.s.knowTrack = true;
  c.s.retell = false;
  checkDone(c);
}

export default tickets;
