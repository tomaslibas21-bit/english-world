// NEEDS: the shared g_repeat / g_write / g_slower (global.ts) miss "¿Puede repetirlo?", "¿Lo puede repetir?",
//   "¿Me lo escribe?" and the imperative "Hable más despacio"; local stand-ins here: repeat_it, write_it, say_again_slowly.
// Places, streets, words, merges and every reaction to a clarification request are local.
// Song 62 "Could You Say That Again?" → Puerto Colibrí: "¿Me lo puede repetir?" — the clarification lesson.
// Información Turística, volunteer Don Chuy (usted): friendly, helpful and a very fast talker (NPC speed 1.18).
// The learner gets a town map and the way to Café La Ceiba (or anywhere else in town) and practises
// clarification: ¿Mande?, más despacio, más fuerte, ¿cómo se escribe?, ¿me lo escribe?, ¿qué significa…?,
// partial questions ("¿Doy vuelta dónde?", "¿Cuántas cuadras?") and checking ("Entonces salgo a la derecha y en
// el banco doy vuelta a la izquierda, ¿verdad?"). Don Chuy checks every check against the real route.
// He also recommends what's outside town (brief): a cenote, the ruins of Tulum, the beaches of Xcacel and
// Chemuyil (Maya names: x and ch to spell, "¿Cómo se escribe?"), and the Saturday tianguis in the zócalo.
//
// Keeps the base situation's steps (need, confirm, map, cafe, more), intents and twists (the tricky word,
// the Friday-music tip, the lost wallet). Changed for Mexico: no bus pass is sold here (tourist offices don't
// sell transit passes; the colectivo, the shared van, is paid to the driver in cash), so the pass purchase and
// its pay_card / pay_cash / here_you_go intents are gone; ask_buspass answers how the colectivo works.
// Research (1 Nov 2026): Xcacel is a protected sea-turtle nesting beach (roughly May–October) with a small cenote,
// Chemuyil a small town with a quiet beach where turtles are seen; colectivos run along Highway 307 and drop you on
// the highway (https://www.lonelyplanet.com/points-of-interest/xcacel/1561634,
// https://www.playadelcarmen.com/blog/xcacel-beach). No fares or opening hours of real places are taught.
//
// Town geography Don Chuy uses (the same layout as Maple Harbor's, for the world builder):
//   Out of the door onto avenida Juárez.
//   RIGHT: Hotel Mar Azul next door · 1 block: Farmacia del Puerto and Estética Tijeras (right side)
//     · 2 blocks: Banco del Puerto on the corner of Juárez and Ceiba (right). LEFT at the bank = calle Ceiba:
//     Café La Ceiba (right, small, yellow door) across from Correos (left); the Mercado Municipal (left, past
//     Correos, ~10 min) with the taquería next to it (s69's "la taquería junto al mercado"); the Terminal de
//     Autobuses at the end (~15 min).
//   LEFT: 1 block: La Cocina de Lucía (left, red awning; the Yucatecan restaurant of s73) across from Boutique Hilos (right)
//     · 2 blocks: the zócalo (right; kiosco, tianguis on Saturdays), Museo de la Costa Maya (left, across from the
//     zócalo), Policía Municipal (left, next to the museum).
//     RIGHT at the zócalo = calle Itzamná down to the sea: the beach (at the end), Restaurante El Muelle, and along
//     the malecón the lighthouse (~30 min).
// Facts shared with other conversations (audit, 5 Nov 2026): the bank is open Saturdays until two (s78); the cenote is
// twenty minutes by colectivo (s69, TOWN.md); the colectivo is paid to the driver (s69: when you get off; the city bus
// when you get on, s67b); the museum's general admission is $80, free on Sundays for Mexicans and residents (s70).
//
// World events: "give" { item: "map" | "bus-schedule" }, "mark-map" { to: locationId }.

import type { Ctx, EntityDef, Handler, HintItem, Pending, SituationDef, Suggestion } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Places (walkable in town, or a trip by colectivo), directions, streets, spellable names, tricky words

const PL = (id: string, es: string, en: string, g: "m" | "f", chip: string, forms: string[], attrs: Record<string, unknown> = {}) =>
  ent(id, es, en, g, { chip, forms, attrs });

const PLACES: EntityDef[] = [
  PL("sunny_cup", "café | La Ceiba", "café | La Ceiba", "m", "Café La Ceiba",
    ["cafe la ceiba", "el cafe la ceiba", "la ceiba", "la seiba", "el cafe", "cafe", "un cafe", "la cafeteria", "una cafeteria", "cafeteria", "el cafecito", "un cafecito", "cafe ceiba"], { nat: "Café La Ceiba" }),
  PL("post_office", "oficina | de | correos", "office | of | mail", "f", "Correos",
    ["correos", "la oficina de correos", "oficina de correos", "el correo", "la oficina de correo", "correo", "una oficina de correos", "el correos"], { nat: "post office" }),
  PL("market", "mercado", "market", "m", "el mercado",
    ["el mercado", "mercado municipal", "el mercado municipal", "un mercado"]),
  // the taco place Don Chuy recommends ("Para tacos, la taquería junto al mercado"; s69's too)
  PL("taqueria", "taquería", "taco place", "f", "la taquería",
    ["la taqueria", "una taqueria", "taqueria", "la taqueria del mercado", "la taqueria junto al mercado", "las taquerias", "unas taquerias", "taquerias", "el puesto de tacos", "un puesto de tacos"], { nat: "the taco place" }),
  PL("bank", "banco", "bank", "m", "el banco",
    ["el banco", "un banco", "banco del puerto", "el banco del puerto", "un cajero", "el cajero", "cajero", "un cajero automatico", "el cajero automatico", "cajero automatico"]),
  PL("pharmacy", "farmacia", "pharmacy", "f", "la farmacia",
    ["la farmacia", "una farmacia", "farmacia del puerto", "la farmacia del puerto"]),
  PL("salon", "estética | Tijeras", "salon | Tijeras", "f", "la estética",
    ["estetica tijeras", "la estetica tijeras", "la estetica", "una estetica", "estetica", "la peluqueria", "una peluqueria", "peluqueria", "la barberia", "una barberia", "el salon de belleza", "un salon de belleza"], { nat: "Tijeras hair salon" }),
  PL("hotel", "hotel | Mar Azul", "hotel | Mar Azul", "m", "el hotel Mar Azul",
    ["hotel mar azul", "el hotel mar azul", "el hotel", "un hotel", "mar azul", "el mar azul"], { nat: "Hotel Mar Azul" }),
  PL("trattoria", "Cocina de Lucía", "Cocina de Lucía", "f", "La Cocina de Lucía",
    ["la cocina de lucia", "cocina de lucia", "el restaurante de lucia", "restaurante de lucia", "el restaurante mexicano", "un restaurante mexicano", "restaurante mexicano", "el restaurante yucateco", "un restaurante yucateco", "restaurante yucateco", "la cocina de lucia restaurante"], { nat: "La Cocina de Lucía" }),
  PL("threads", "boutique | Hilos", "boutique | Hilos", "f", "la boutique Hilos",
    ["boutique hilos", "la boutique hilos", "la boutique", "hilos", "una tienda de ropa", "la tienda de ropa", "tienda de ropa"], { nat: "Hilos boutique" }),
  PL("square", "zócalo", "main square", "m", "el zócalo",
    ["el zocalo", "zocalo", "la plaza", "la plaza principal", "plaza principal", "la plaza mayor", "el socalo",
      // the bandstand in its middle ("busque el kiosco del zócalo"): "¿Dónde está el kiosco?" → the way to the zócalo
      "el kiosco", "el quiosco", "el kiosco del zocalo", "el kiosko"]),
  PL("tianguis", "tianguis", "street market", "m", "el tianguis",
    ["el tianguis", "tianguis", "un tianguis", "el mercado de los sabados", "mercado de los sabados", "el mercadito", "el mercado sobre ruedas", "el tiangui"]),
  PL("museum", "museo", "museum", "m", "el museo",
    ["el museo", "un museo", "museo de la costa maya", "el museo de la costa maya"]),
  PL("police", "policía", "police", "f", "la policía",
    ["la policia", "policia municipal", "la policia municipal", "la estacion de policia", "estacion de policia", "la comisaria", "una comisaria"], { nat: "police station" }),
  PL("station", "terminal", "bus station", "f", "la terminal",
    ["la terminal", "terminal de autobuses", "la terminal de autobuses", "la terminal de camiones", "la central", "la central de autobuses", "la estacion de autobuses", "estacion de autobuses", "la estacion", "la estacion de autobus"]),
  PL("beach", "playa", "beach", "f", "la playa",
    ["la playa", "una playa", "el malecon", "malecon", "el mar"]),
  PL("pier", "restaurante | El Muelle", "restaurant | El Muelle", "m", "El Muelle",
    ["el muelle", "muelle", "restaurante el muelle", "el restaurante el muelle", "una marisqueria", "la marisqueria", "un restaurante de mariscos"], { nat: "El Muelle restaurant" }),
  PL("lighthouse", "faro", "lighthouse", "m", "el faro",
    ["el faro", "un faro", "el faro viejo"]),
  // trips: no walking route; Don Chuy tells how to get there (colectivo) instead
  PL("cenote", "cenote", "cenote", "m", "un cenote",
    ["el cenote", "un cenote", "los cenotes", "cenotes", "senote", "el senote"], { trip: true }),
  PL("ruins", "zona | arqueológica", "site | archaeological", "f", "las ruinas",
    ["las ruinas", "ruinas", "las ruinas de tulum", "ruinas de tulum", "tulum", "las piramides", "la zona arqueologica", "zona arqueologica", "unas ruinas"], { trip: true, nat: "the ruins" }),
  PL("xcacel", "playa | de | Xcacel", "beach | of | Xcacel", "f", "Xcacel",
    ["xcacel", "playa xcacel", "la playa de xcacel", "playa de xcacel", "xcacelito", "shcacel", "shkakel", "skakel", "ixcacel"], { trip: true, nat: "Xcacel beach" }),
  PL("chemuyil", "playa | de | Chemuyil", "beach | of | Chemuyil", "f", "Chemuyil",
    ["chemuyil", "playa chemuyil", "la playa de chemuyil", "playa de chemuyil", "chemullil", "chemuil", "chemuyl"], { trip: true, nat: "Chemuyil beach" }),
];

const DIRS: EntityDef[] = [
  ent("left", "izquierda", "left", "f", { chip: "a la izquierda", forms: ["la izquierda", "a la izquierda", "isquierda", "la isquierda"] }),
  ent("right", "derecha", "right", "f", { chip: "a la derecha", forms: ["la derecha", "a la derecha"] }),
];

const STREETS: EntityDef[] = [
  ent("juarez", "Juárez", "Juárez", "f", { forms: ["juarez", "benito juarez", "juares"] }),
  ent("ceiba", "Ceiba", "Ceiba", "f", { forms: ["ceiba", "seiba"] }),
  ent("itzamna", "Itzamná", "Itzamná", "f", { forms: ["itzamna", "itsamna", "isamna"] }),
];

/** Names a learner may ask him to spell ("¿Cómo se escribe Xcacel?"). attrs.w = the written form. */
const SPOTS: EntityDef[] = [
  ent("sp_xcacel", "Xcacel", "Xcacel", "f", { forms: ["xcacel", "shcacel", "shkakel", "skakel", "la playa de xcacel"], attrs: { w: "Xcacel" } }),
  ent("sp_chemuyil", "Chemuyil", "Chemuyil", "m", { forms: ["chemuyil", "chemullil", "chemuil"], attrs: { w: "Chemuyil" } }),
  ent("sp_juarez", "Juárez", "Juárez", "f", { forms: ["juarez", "la avenida juarez", "avenida juarez"], attrs: { w: "Juárez" } }),
  ent("sp_itzamna", "Itzamná", "Itzamná", "f", { forms: ["itzamna", "la calle itzamna", "calle itzamna", "itsamna"], attrs: { w: "Itzamná" } }),
  ent("sp_ceiba", "Ceiba", "Ceiba", "f", { forms: ["ceiba", "la calle ceiba", "calle ceiba", "la ceiba"], attrs: { w: "Ceiba" } }),
  ent("sp_tulum", "Tulum", "Tulum", "m", { forms: ["tulum"], attrs: { w: "Tulum" } }),
];

/** Words Don Chuy uses that a learner may not know ("¿Qué significa…?"). */
const WORDS: EntityDef[] = [
  ent("cuadra", "cuadra", "“cuadra”", "f", { forms: ["cuadras", "la cuadra"], attrs: { noun: true } }),
  ent("derechito", "derechito", "“derechito”", "m", { forms: ["derechito", "todo derechito", "derecho"] }),
  ent("esquina", "esquina", "“esquina”", "f", { forms: ["esquinas", "la esquina"], attrs: { noun: true } }),
  ent("banqueta", "banqueta", "“banqueta”", "f", { forms: ["banquetas", "la banqueta", "vanqueta"], attrs: { noun: true } }),
  ent("kiosco", "kiosco", "“kiosco”", "m", { forms: ["quiosco", "el kiosco", "el quiosco", "kiosko"], attrs: { noun: true } }),
  ent("malecon", "malecón", "“malecón”", "m", { forms: ["malecon", "el malecon"], attrs: { noun: true } }),
  ent("toldo", "toldo", "“toldo”", "m", { forms: ["el toldo", "toldos"], attrs: { noun: true } }),
  ent("cenote", "cenote", "“cenote”", "m", { forms: ["cenotes", "el cenote", "senote"], attrs: { noun: true } }),
  ent("tianguis", "tianguis", "“tianguis”", "m", { forms: ["el tianguis", "tiangui"], attrs: { noun: true } }),
  ent("colectivo", "colectivo", "“colectivo”", "m", { forms: ["colectivos", "el colectivo"], attrs: { noun: true } }),
  ent("perico", "perico", "“perico”", "m", { forms: ["pericos", "un perico", "como perico"], attrs: { noun: true } }),
  ent("cant_miss", "no tiene pierde", "“no tiene pierde”", "m", { forms: ["no tiene pierde", "tiene pierde"] }),
];

// ---------------------------------------------------------------------------
// Routes: every fact Don Chuy states, so that the learner's checks can be verified.

type Dir = "left" | "right";
interface Route {
  out: Dir;
  blocks: 0 | 1 | 2;
  turn?: { dir: Dir; at: "bank" | "square" };
  side?: Dir;
  ref?: { rel: "across" | "next"; to: string };
  mins: 1 | 2 | 5 | 10 | 15 | 30;
  street: "juarez" | "ceiba" | "itzamna";
  size?: "big" | "little";
  /** Location id for the world (mark-map). */
  loc?: string;
}

const ROUTES: Record<string, Route> = {
  sunny_cup: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, side: "right", ref: { rel: "across", to: "post_office" }, mins: 5, street: "ceiba", size: "little", loc: "sunny-cup" },
  post_office: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, side: "left", ref: { rel: "across", to: "sunny_cup" }, mins: 5, street: "ceiba", loc: "post-office" },
  market: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, side: "left", mins: 10, street: "ceiba", size: "big", loc: "market" },
  taqueria: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, side: "left", ref: { rel: "next", to: "market" }, mins: 10, street: "ceiba", loc: "market" },
  bank: { out: "right", blocks: 2, side: "right", mins: 5, street: "juarez", size: "big", loc: "bank" },
  pharmacy: { out: "right", blocks: 1, side: "right", ref: { rel: "next", to: "salon" }, mins: 2, street: "juarez", loc: "pharmacy" },
  salon: { out: "right", blocks: 1, side: "right", ref: { rel: "next", to: "pharmacy" }, mins: 2, street: "juarez", loc: "salon" },
  hotel: { out: "right", blocks: 0, side: "right", mins: 1, street: "juarez", size: "big", loc: "hotel" },
  station: { out: "right", blocks: 2, turn: { dir: "left", at: "bank" }, mins: 15, street: "ceiba", loc: "station" },
  trattoria: { out: "left", blocks: 1, side: "left", ref: { rel: "across", to: "threads" }, mins: 2, street: "juarez", loc: "trattoria" },
  threads: { out: "left", blocks: 1, side: "right", ref: { rel: "across", to: "trattoria" }, mins: 2, street: "juarez", loc: "threads" },
  square: { out: "left", blocks: 2, side: "right", mins: 5, street: "juarez", size: "big", loc: "town-square" },
  tianguis: { out: "left", blocks: 2, side: "right", mins: 5, street: "juarez", loc: "town-square" },
  museum: { out: "left", blocks: 2, side: "left", ref: { rel: "across", to: "square" }, mins: 5, street: "juarez", size: "big", loc: "museum" },
  police: { out: "left", blocks: 2, side: "left", ref: { rel: "next", to: "museum" }, mins: 5, street: "juarez", loc: "police" },
  beach: { out: "left", blocks: 2, turn: { dir: "right", at: "square" }, mins: 10, street: "itzamna" },
  pier: { out: "left", blocks: 2, turn: { dir: "right", at: "square" }, mins: 10, street: "itzamna", loc: "the-pier" },
  lighthouse: { out: "left", blocks: 2, turn: { dir: "right", at: "square" }, mins: 30, street: "itzamna" },
};
const TRIPS = new Set(["cenote", "ruins", "xcacel", "chemuyil"]);
/** Places with their own Wi-Fi ("¿El café tiene wifi?"): yes, but the password is theirs. */
const WIFI_THERE = new Set(["sunny_cup", "hotel", "trattoria", "pier"]);
/** Places that cost nothing ("¿Es gratis la playa?"). The museum and the trips charge admission. */
const FREE = new Set(["beach", "square", "tianguis"]);

/** Which turn a landmark or a street stands for. */
const LANDMARK_AT: Record<string, "bank" | "square"> = { bank: "bank", square: "square", tianguis: "square" };
const STREET_AT: Record<string, "door" | "bank" | "square"> = { juarez: "door", ceiba: "bank", itzamna: "square" };
/** The most likely unknown word in each line (for "¿Qué significa eso?"). */
const LINE_WORD: Record<string, string> = {
  r_sunny_cup: "derechito", r_bank: "derechito", r_square: "kiosco", r_museum: "derechito", r_trattoria: "toldo", r_lighthouse: "malecon",
  r_tianguis: "tianguis", tw_banqueta: "banqueta", tw_kiosco: "kiosco", slow_intro: "perico", recommend: "cenote", trip_cenote: "colectivo",
  trip_ruins: "colectivo", trip_xcacel: "colectivo", events_market: "tianguis", side_end: "cant_miss", size_big_yes: "cant_miss", at_square: "kiosco",
  r_bank_slow: "esquina", at_bank: "esquina", colectivo: "colectivo",
};
/** Lines that are reactions, not content: never replayed as "the last thing Don Chuy said". */
const META = new Set(["slow_intro", "repeat_fast_again", "learning", "dont_understand", "louder", "say_again_slow", "ack_great", "praise"]);

const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const conv = (c: Ctx) => (c as ConvCtx).conv;
const opp = (d: Dir): Dir => (d === "left" ? "right" : "left");
const fold = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

interface Piece { kind: string; dir?: Dir; lm?: string; street?: string; blocks?: number; ref?: string; subj?: string; neg?: boolean }
const KINDS = ["out", "bare", "at", "onto", "straight", "side", "across", "next", "near", "nextdoor", "little", "big"];
const DIRECTIONAL = new Set(["out", "bare", "at", "onto", "straight", "side", "across", "next", "near", "nextdoor"]);

function readPieces(slots: any): Piece[] {
  const fdir = slots.route?.fdir ?? slots.fdir;
  const first: Piece[] = fdir ? [{ kind: "bare", dir: fdir }] : [];
  return first.concat(toArr(slots.route?.piece).map((p: any) => {
    const tags: string[] = p.__tags || [];
    let blocks: number | undefined;
    if (typeof p.n === "number") blocks = p.n;
    else if (tags.includes("b1")) blocks = 1;
    else if (tags.includes("b2")) blocks = 2;
    else if (tags.includes("b3")) blocks = 3;
    const dir: Dir | undefined = p.dir ?? (tags.includes("sr") ? "right" : tags.includes("sl") ? "left" : undefined);
    return { kind: KINDS.find((k) => tags.includes(k)) ?? "bare", dir, lm: p.lm, street: p.street, blocks, ref: p.ref, subj: p.subj, neg: tags.includes("neg") };
  }));
}

/** null = everything the learner said matches the route; otherwise the id of Don Chuy's correction line. */
function checkRoute(r: Route, ps: Piece[]): string | null {
  const turns: { dir: Dir; at: "door" | "bank" | "square" }[] = [{ dir: r.out, at: "door" }];
  if (r.turn) turns.push({ dir: r.turn.dir, at: r.turn.at });
  const wrongTurn = (x: { at: string }) => (x.at === "door" ? `fix_out_${r.out}` : `fix_turn_${x.at}`);
  let next = 0;
  for (const p of ps) {
    switch (p.kind) {
      case "out":
        if (p.dir !== r.out) return `fix_out_${r.out}`;
        next = 1;
        break;
      case "at":
      case "onto": {
        const at = p.kind === "onto" ? STREET_AT[p.street!] : LANDMARK_AT[p.lm!];
        const tn = turns.find((x) => x.at === at);
        if (!tn) return r.turn ? `fix_at_${r.turn.at}` : "fix_noturn";
        if (tn.dir !== p.dir) return wrongTurn(tn);
        next = turns.indexOf(tn) + 1;
        break;
      }
      case "bare": {
        const tn = turns[next];
        if (!tn) return "fix_noturn";
        if (tn.dir !== p.dir) return wrongTurn(tn);
        next++;
        break;
      }
      case "straight":
        if (p.blocks != null && p.blocks !== r.blocks) return `fix_blocks_${r.blocks}`;
        break;
      case "side": {
        if (!r.side || !p.dir) break;
        const d = p.neg ? opp(p.dir) : p.dir;
        if (d !== r.side) return `fix_side_${r.side}`;
        break;
      }
      case "across":
      case "next":
        if (!r.ref || r.ref.rel !== p.kind || r.ref.to !== p.ref) return "fix_generic";
        break;
      case "near":
        if (!r.ref || r.ref.to !== p.ref) return "fix_generic";
        break;
      case "nextdoor":
        if (r.blocks !== 0) return `fix_blocks_${r.blocks}`;
        break;
      case "little":
      case "big":
        if (r.size && r.size !== p.kind) return r.size === "little" ? "size_little_no" : "size_big_no";
        break;
    }
  }
  return null;
}

// Automatic answers for the simulations (keyed by step or pending id).
const AUTO: Record<string, string> = {
  greet_map: "Sí, por favor", need: "¿Me da un mapa, por favor?", map: "Sí, por favor", cafe: "¿Cómo llego al Café La Ceiba?", cafe_offer: "Sí, por favor",
  quiz: "A la derecha", recheck: "Ya entendí", more: "No, eso es todo, gracias", police_ok: "Sí, todo bien", which_place: "Al Café La Ceiba",
};
/** For a sim whose first turn also answers Don Chuy's opening "¿Le doy un mapa?" (seeds that open with it). */
const AUTO_OWN_OPENING: Record<string, string> = Object.fromEntries(Object.entries(AUTO).filter(([k]) => k !== "greet_map"));

/** A route is (still) part of this conversation — unless the learner turned down the café and asked for nothing else. */
const routeGoal = (c: Ctx) => !!c.s.dest || !c.s.cafeNo;

// ---------------------------------------------------------------------------
// State helpers

const clar = (c: Ctx) => { c.s.clar = (c.s.clar || 0) + 1; };

function giveMap(c: Ctx) {
  if (c.s.map) return false;
  c.s.map = true;
  c.event("give", { item: "map" });
  return true;
}

/** A place outside town: how to get there (no route to check). */
function tripInfo(c: Ctx, id: string) {
  if (!onceThisTurn(c, "trip")) return;
  c.s.trips = (c.s.trips || 0) + 1;
  c.say(`trip_${id}`);
}

/** Don Chuy gives the route (fast, or the clear version once he has promised to slow down). */
function giveRoute(c: Ctx, id: string) {
  if (TRIPS.has(id)) { tripInfo(c, id); return; }
  if (!onceThisTurn(c, "route")) return;
  clearConfirmPending(c); // a new destination: the old "¿Me entendió?" no longer applies
  c.s.dest = id;
  if (!c.s.asked.includes(id)) c.s.asked.push(id);
  c.s.confirmAsks = 0;
  c.say(conv(c).slow ? `r_${id}_slow` : `r_${id}`);
  const r = ROUTES[id];
  if (c.s.wantTwist && !c.s.twistWord) {
    const w = r.out === "right" ? "banqueta" : "kiosco";
    c.s.twistWord = w;
    c.say(`tw_${w}`);
    c.twist("tricky_word");
  }
  if (id === "police") {
    c.say("police_ok");
    c.expect({ id: "police_ok", optional: true, hints: ["g_yesno"], expects: ["lost_item"], suggest: [{ lt: "Say whether everything's okay", hint: "g_yesno" }],
      yes: (cc) => { cc.say("police_good"); }, no: (cc) => { cc.say("police_bad"); },
      on: { lost_item: (cc) => { cc.say("lost_item"); } } });
  }
}

function currentRoute(c: Ctx): Route | null {
  return c.s.dest ? ROUTES[c.s.dest] : null;
}

// --- checking the route: "¿Me entendió?" is a pending question whose suggestions and model answers
// belong to the current destination (chk_<dest>), so the guide never shows a wrong example.
const CONFIRM_EXPECTS = ["understood", "did_i", "lost", "ask_side", "ask_which_way", "ask_turn_where", "ask_blocks"];
const isConfirmPending = (id: string) => id.startsWith("confirm_") || id === "quiz" || id === "recheck";
function clearConfirmPending(c: Ctx) {
  const p = conv(c).pending;
  if (p && isConfirmPending(p.id)) conv(c).pending = null;
}
/** After the fast version the learner's next move is "say it again, more slowly"; after the slow one, checking the route. */
function checkSuggest(c: Ctx): Suggestion[] {
  const check = { lt: "Check that you understood the way", hint: `chk_${c.s.dest}` };
  const slower = { lt: "Ask him to say it again more slowly", hint: "slower" };
  return [
    ...(conv(c).slow ? [check, slower] : [slower, check]),
    { lt: "Ask what a word means", hint: "words", options: "word" },
    { lt: "More ways to check", hint: "clarify_more" },
  ];
}
/** "¿Me entendió?" / "¿Sí?" after a route (the pending id names the destination: confirm_sunny_cup …). */
function askConfirm(c: Ctx) {
  const n = c.s.confirmAsks = (c.s.confirmAsks || 0) + 1;
  c.say(c.s.justSlowed ? "confirm_after_slow" : n === 1 ? "confirm_ask" : "confirm_again");
  c.s.justSlowed = false;
  const pend: Pending = {
    id: `confirm_${c.s.dest}`, expects: CONFIRM_EXPECTS,
    get suggest() { return checkSuggest(c); },
    yes: (cc) => { quiz(cc); },
    no: (cc) => { sayAgainSlow(cc); cc.say("confirm_after_slow"); cc.s.justSlowed = false; cc.expect(pend); },
    ask: (cc) => { cc.say("confirm_again"); },
  };
  c.expect(pend);
}

/** "¿A dónde va?" — through the café step while the café is still to come. */
function askWhere(c: Ctx) {
  if (!c.s.asked.includes("sunny_cup") && !c.s.cafeNo) { c.ask("cafe"); return; }
  c.say("ask_where");
  c.hold();
}
/** Don Chuy recommends Café La Ceiba and offers the way there (the lesson's goal). */
function offerCafe(c: Ctx, afterRoute: boolean, askedForCoffee = false) {
  if (c.s.asked.includes("sunny_cup")) { c.say("ask_where"); c.hold(); return; }
  c.s.cafeOffers = (c.s.cafeOffers || 0) + 1;
  // offered again after a side question: a short reminder, not the whole tip twice in a row
  // (but "¿Dónde puedo tomar un buen café?" always gets the tip itself)
  if (c.s.cafeOffers > 1 && !askedForCoffee) c.say("cafe_again");
  else { c.say(afterRoute ? "offer_cafe" : "suggest_cafe"); c.say("offer_directions"); }
  c.expect({ id: "cafe_offer", optional: true, expects: ["ask_where", "accept_ctx", "decline_ctx", "no_coffee"],
    suggest: [
      { lt: "Say yes to the directions", hint: "yes_please" },
      { lt: "Ask the way to another place", hint: "where", options: "place" },
    ],
    yes: (cc) => { giveRoute(cc, "sunny_cup"); },
    no: (cc) => { declineCafe(cc); },
    ask: (cc) => cc.say("offer_directions") });
}
/** Don Chuy has just offered the way to the café ("¿Le digo cómo llegar?"). */
const cafeOffered = (c: Ctx) => conv(c).lastLines.some((l) => l.lineId === "offer_directions" || l.lineId === "cafe_again");
/** "No, gracias" / "No tomo café" to the café tip (once per utterance). */
function declineCafe(c: Ctx) {
  if (!onceThisTurn(c, "cafe_no")) return;
  c.s.cafeNo = true;
  c.say("oh_okay");
}

/** A question about "it" before any destination: ask where the learner wants to go. */
function needPlace(c: Ctx) {
  c.say("which_place");
  c.expect({ id: "which_place", optional: true, hints: ["where"],
    suggest: [{ lt: "Say where you want to go", hint: "where", options: ["sunny_cup", "museum", "beach", "pharmacy", "bank", "lighthouse"] }] });
}

/** "¡Claro! Se lo repito con calma y despacito." + the clear route. */
function sayAgainSlow(c: Ctx) {
  c.say("say_again_slow");
  conv(c).markSlow();
  c.s.slowed = true;
  c.say(`r_${c.s.dest}_slow`);
  c.s.justSlowed = true;
}

/** "Ah, ya entendí" after a correction. */
function confirmAck(c: Ctx) {
  if (!firstVerdict(c)) return;
  c.s.conf[c.s.dest] = true;
  c.s.confirmed = true;
  c.say("ack_great");
}

/** True the first time `key` happens in this utterance (an utterance may be parsed as several segments). */
function onceThisTurn(c: Ctx, key: string): boolean {
  const turn = conv(c).history.length;
  if (c.s.onceTurn !== turn) { c.s.onceTurn = turn; c.s.onceKeys = []; }
  if (c.s.onceKeys.includes(key)) return false;
  c.s.onceKeys.push(key);
  return true;
}

/** Don Chuy gives at most one verdict per utterance (an utterance may be parsed as several segments). */
function firstVerdict(c: Ctx): boolean {
  const turn = conv(c).history.length;
  if (c.s.verdictTurn === turn) return false;
  c.s.verdictTurn = turn;
  return true;
}
const mentionsRoute = (c: Ctx) => /\b(izquierda|derecha|derecho|derechito|recto|cuadras?|enfrente|junto|esquina|al lado|doy vuelta|volteo)\b/.test(fold(c.heard));

function confirmOk(c: Ctx) {
  if (!firstVerdict(c)) return;
  c.s.conf[c.s.dest] = true;
  c.s.confirmed = true;
  c.say("confirm_ok");
}

/** The learner has checked a detail of the route by asking about it (side, turn, blocks …). */
function checkedByQuestion(c: Ctx) {
  if (c.s.dest) { c.s.conf[c.s.dest] = true; c.s.confirmed = true; clearConfirmPending(c); }
}

function sayFix(c: Ctx, fix: string) {
  if (!firstVerdict(c)) return;
  c.s.fixes = (c.s.fixes || 0) + 1;
  c.say(fix);
  if (fix === "fix_generic") { conv(c).markSlow(); c.say(`r_${c.s.dest}_slow`); }
  c.say("recheck");
  const pend: Pending = {
    id: "recheck", expects: ["understood", "g_ok", "dir_ans_ctx"],
    suggest: [{ lt: "Say you've got it now", hint: "gotit" }, { lt: "Check the way again", hint: `chk_${c.s.dest}` }],
    yes: (cc) => { confirmAck(cc); },
    no: (cc) => { cc.say("say_again_slow"); conv(cc).markSlow(); cc.say(`r_${cc.s.dest}_slow`); cc.say("recheck"); cc.expect(pend); },
    on: {
      understood: (cc) => { confirmAck(cc); },
      g_ok: (cc) => { confirmAck(cc); },
      dir_ans_ctx: (cc, sl) => { quizAnswer(cc, sl.dir); }, // "¡A la izquierda!" — echoing the corrected direction
    },
    ask: (cc) => cc.say("recheck"),
  };
  c.expect(pend);
}

/** "Sí, ya entendí" before the goal is reached: Don Chuy makes it a friendly quiz. */
function quiz(c: Ctx) {
  const r = currentRoute(c);
  if (!r || mentionsRoute(c)) return; // "Sí: en el banco a la izquierda": the check itself answers
  if (!firstVerdict(c)) return;
  if (c.s.confirmed) { c.s.conf[c.s.dest] = true; c.say("ack_great"); return; }
  const onTurn = !!r.turn && c.chance(0.5);
  c.s.quiz = onTurn ? "turn" : "out";
  const q = onTurn ? (r.turn!.at === "bank" ? "quiz_bank" : "quiz_square") : "quiz_out";
  c.say(q);
  const pend: Pending = {
    id: "quiz", expects: ["dir_ans_ctx", "straight_ans_ctx"],
    suggest: [{ lt: "Answer: left or right", hint: q }],
    on: {
      dir_ans_ctx: (cc, sl) => { quizAnswer(cc, sl.dir); },
      straight_ans_ctx: (cc) => { cc.say("straight_not"); cc.expect(pend); },
    },
    yes: (cc) => { cc.say("quiz_again"); cc.expect(pend); },
    no: (cc) => { cc.say("quiz_again"); cc.expect(pend); },
    ask: (cc) => cc.say("quiz_again"),
  };
  c.expect(pend);
}

function quizAnswer(c: Ctx, dir: Dir) {
  const r = currentRoute(c);
  if (!r || !dir) return;
  const right = c.s.quiz === "turn" && r.turn ? r.turn.dir : r.out;
  if (dir === right) { confirmOk(c); return; }
  sayFix(c, c.s.quiz === "turn" && r.turn ? `fix_turn_${r.turn.at}` : `fix_out_${r.out}`);
}

/** Don Chuy repeats his last content line(s), optionally in the clear, slow version. */
function replayContent(c: Ctx, slow: boolean) {
  const cv = conv(c);
  const content = cv.lastLines.filter((l) => !META.has(l.lineId) && !l.lineId.startsWith("g_"));
  // (nothing but a reaction or a shared line to repeat: the reaction alone answers)
  const src = content.length ? content : cv.lastLines.filter((l) => !l.lineId.startsWith("g_") && !META.has(l.lineId));
  if (slow) { cv.markSlow(); c.s.slowed = true; }
  for (const l of src) {
    const alt = slow && /^r_[a-z_]+$/.test(l.lineId) && !l.lineId.endsWith("_slow") ? `${l.lineId}_slow` : null;
    if (alt && ROUTE_LINE_IDS.has(alt)) c.say(alt, l.vars);
    // after the slow version he asks "¿Ahora sí?", not "¿Me explico?" for the third time
    else if (slow && (l.lineId === "confirm_ask" || l.lineId === "confirm_again")) c.say("confirm_after_slow");
    else cv.pushLine(l.lineId, l.variant, l.vars, slow);
  }
}

function lastContentKey(c: Ctx): string {
  const l = conv(c).lastLines.find((x) => !META.has(x.lineId) && !x.lineId.startsWith("g_"));
  return l ? l.lineId.replace(/_slow$/, "") : "";
}

function wordFromText(w: string | undefined): string | undefined {
  if (!w) return undefined;
  const k = fold(w).replace(/[^a-z ]/g, "").replace(/^(el|la|un|una|los|las) /, "").trim();
  return WORDS.find((e) => fold(e.en) === k || (e.forms || []).includes(k))?.id;
}

function explain(c: Ctx, id: string) {
  clar(c);
  c.say(`w_${id}`);
  c.hold();
}

function answerSize(c: Ctx, r: Route, big: boolean | null) {
  if (!r.size) { c.say("size_only"); return; }
  if (big === null) { c.say(r.size === "big" ? "size_big_yes" : "size_little_yes"); return; }
  if (r.size === "big") c.say(big ? "size_big_yes" : "size_big_no");
  else c.say(big ? "size_little_no" : "size_little_yes");
}

const saidYes = (c: Ctx) => /^\s*(si|claro|ok|vale|sale|va|bueno|andale|orale|por favor|con gusto)\b/.test(fold(c.heard));
const saidNo = (c: Ctx) => /^\s*(no\s*[,.!]|no gracias|no muchas gracias|no$)/.test(fold(c.heard));
/** The place a question is about: a walkable place, or a trip (answered with how to get there). */
const placeOf = (slots: any): string | undefined => {
  const p = slots.place as string | undefined;
  return p && (ROUTES[p] || TRIPS.has(p)) ? p : undefined;
};

/** What a bare "¿Es gratis?" / "¿Cuánto cuesta?" is about: what Don Chuy has just talked about. */
function priceTopic(c: Ctx): "museum" | "trip" | "free" | "events" | "map" | "other" | null {
  for (const l of [...conv(c).lastLines].reverse()) {
    const id = l.lineId;
    if (/^(r_museum|museum_)/.test(id)) return "museum";
    if (/^(trip_|recommend$)/.test(id)) return "trip";
    if (/^(r_beach|r_square|r_tianguis|market_hours|free_place)/.test(id)) return "free";
    if (/^(events_|event_|tw_trova)/.test(id)) return "events";
    if (/^(offer_map|greet_map|map_)/.test(id)) return "map";
    if (/^r_/.test(id)) return "other";
  }
  return null;
}
/** The price of a place: the museum's admission (s70), a trip's fee, a free place, or "ask there". */
function sayPrice(c: Ctx, topic: string | null | undefined) {
  if (topic === "museum") c.say("museum_price", { price: 8000 });
  else if (topic === "trip") c.say("trip_price");
  else if (topic === "free") c.say("free_place");
  else c.say("hours_unknown");
}
const priceKind = (p: string) => (p === "museum" ? "museum" : TRIPS.has(p) ? "trip" : FREE.has(p) ? "free" : "other");
/** The place named in a price question, however it was cut up ("¿Es gratis | el museo?" can parse as the map's
 *  "¿Es gratis?" + "¿El museo?" where the map's question is expected). Not when the map is named. */
function pricedPlace(c: Ctx): string | undefined {
  const h = ` ${fold(c.heard).replace(/[^a-z ]/g, " ").replace(/\s+/g, " ")} `;
  if (/ mapas? /.test(h)) return undefined;
  let best: { id: string; n: number } | undefined; // the longest name wins: "la playa de xcacel" over "la playa"
  for (const e of PLACES) for (const f of [fold(e.en.replace(/ \| /g, " ")), ...(e.forms || [])]) {
    if (f.length > 3 && h.includes(` ${f} `) && (!best || f.length > best.n)) best = { id: e.id, n: f.length };
  }
  return best?.id;
}
/** A price answered once per utterance; the place's route is then not given unasked (dest_short). */
function answerPrice(c: Ctx, kind: string | null) {
  if (!onceThisTurn(c, "price")) return;
  c.s.priceTurn = conv(c).history.length;
  sayPrice(c, kind);
}
const pricedThisTurn = (c: Ctx) => c.s.priceTurn === conv(c).history.length;

const HOURS_LINE: Record<string, string> = { museum: "museum_hours", tianguis: "market_hours", square: "market_hours", market: "mercado_hours", sunny_cup: "cafe_hours", bank: "bank_hours", beach: "beach_hours" };
const LINE_PLACE: Record<string, string> = { museum_price: "museum", museum_hours: "museum", bank_hours: "bank", cafe_hours: "sunny_cup", mercado_hours: "market", market_hours: "tianguis", beach_hours: "beach" };
/** The place "it" stands for in "¿A qué hora abre?": the place Don Chuy just talked about (a route, a trip, its
 *  price or hours), else the current destination. */
function placeInTalk(c: Ctx): string | undefined {
  for (const l of [...conv(c).lastLines].reverse()) {
    const id = l.lineId.replace(/_slow$/, "");
    const m = /^(?:r|trip)_([a-z_]+)$/.exec(id);
    if (m && (ROUTES[m[1]] || TRIPS.has(m[1]))) return m[1];
    if (LINE_PLACE[id]) return LINE_PLACE[id];
  }
  return c.s.dest;
}

// ---------------------------------------------------------------------------

const ROUTE_IDS = Object.keys(ROUTES);
const ROUTE_LINE_IDS = new Set(ROUTE_IDS.flatMap((id) => [`r_${id}`, `r_${id}_slow`]));

const H: Record<string, Handler> = {
  // --- map -----------------------------------------------------------------
  ask_map(c) {
    if (!onceThisTurn(c, "map")) return;
    if (!giveMap(c)) { c.say("map_here"); return; }
    c.say("map_give");
  },
  // "¿El mapa es gratis?" → "¡Sí, es gratis!"; "¿Cuánto cuesta el mapa?" → "¡Nada, es gratis!" (never "Sí" to "how much")
  map_free(c, _slots, seg) {
    const pp = pricedPlace(c);
    if (pp) { answerPrice(c, priceKind(pp)); return; } // "¿Es gratis la playa?" cut as "¿Es gratis?" + "¿La playa?"
    c.say(seg.tags.includes("cost") ? "map_free_cost" : "map_free");
    if (giveMap(c)) c.say("map_give");
  },
  map_here(c) {
    if (giveMap(c)) c.say("map_give");
    else c.say("map_here");
  },
  map_no(c, _slots, seg) {
    if (seg.tags.includes("have")) { c.s.map = true; c.say("ack_great"); return; }
    c.s.mapNo = true;
    c.say("map_ok_no");
  },

  // --- destinations --------------------------------------------------------
  ask_where(c, slots, seg) {
    const p = placeOf(slots) ?? (seg.tags.includes("atm") ? "bank" : undefined);
    if (!p) { c.say("unknown_place"); return; }
    giveRoute(c, p);
  },
  dest_short(c, slots) {
    if (pricedThisTurn(c)) return; // "¿Es gratis | el museo?": the price was the question, not the way
    const p = placeOf(slots);
    if (!p) { c.say("unknown_place"); return; }
    const r = currentRoute(c);
    // "¿El banco?" while talking about the café route = checking a landmark, not a new destination
    if (r && p !== c.s.dest && ((LANDMARK_AT[p] !== undefined && LANDMARK_AT[p] === r.turn?.at) || r.ref?.to === p)) {
      clar(c);
      if (LANDMARK_AT[p] !== undefined && LANDMARK_AT[p] === r.turn?.at) c.say(`turn_${r.turn!.at}`);
      else c.say(`yes_${r.ref!.rel}_${p}`);
      return;
    }
    giveRoute(c, p);
  },
  ask_where_unknown(c) {
    c.say("unknown_place");
    if (!c.s.dest) askWhere(c);
  },
  dest_neg(c) {
    c.say("oh_okay");
    if (!c.s.dest || c.s.conf[c.s.dest]) askWhere(c);
  },
  dest_correction(c, slots) {
    const list = toArr(slots.place) as string[];
    // "no al museo, a la playa" / "no al museo sino a la playa" → the second; "a la playa, no al museo" → the first
    const txt = fold(c.heard).replace(/^\s*(no|perdon|disculpe)[,.!\s]+(?=no\b)/, "").replace(/^\s*(no|perdon|disculpe)\s*[,.!]\s*/, "");
    const good = list.length > 1 && /^no\b/.test(txt) ? list[1] : list[0];
    if (!good || !(ROUTES[good] || TRIPS.has(good))) { c.say("unknown_place"); return; }
    c.say("oh_okay");
    giveRoute(c, good);
  },
  repeat_route(c) {
    if (!c.s.dest) { needPlace(c); return; }
    clar(c);
    c.say(`r_${c.s.dest}_slow`);
  },

  // --- checking understanding ----------------------------------------------
  confirm(c, slots) {
    // A full check also answers an open "¿Me entendió?", quiz or "¿Sí?" question.
    clearConfirmPending(c);
    const ps = readPieces(slots);
    const subj = ps.find((p) => p.subj && ROUTES[p.subj])?.subj;
    const dest = subj ?? c.s.dest;
    if (!dest) { needPlace(c); return; }
    if (dest !== c.s.dest) { c.s.dest = dest; if (!c.s.asked.includes(dest)) c.s.asked.push(dest); }
    const r = ROUTES[dest];
    const fix = checkRoute(r, ps);
    if (fix) { sayFix(c, fix); return; }
    if (ps.some((p) => DIRECTIONAL.has(p.kind))) { confirmOk(c); return; }
    // only "¿El chiquito?" / "¿El grande?"
    const size = ps.find((p) => p.kind === "big" || p.kind === "little");
    answerSize(c, r, size ? size.kind === "big" : null);
  },
  ask_side(c, slots) {
    const p = placeOf(slots);
    if (p && TRIPS.has(p)) { tripInfo(c, p); return; }
    const r = p ? ROUTES[p] : currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    c.say(r.side ? `side_${r.side}` : "side_end");
    if (!p || p === c.s.dest) checkedByQuestion(c);
  },
  ask_which_way(c, slots, seg) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    const at = slots.lm ? LANDMARK_AT[slots.lm] : undefined;
    if (seg.tags.includes("door")) c.say(`out_${r.out}`);
    else if (slots.lm) {
      if (r.turn && at === r.turn.at) c.say(`turn_${r.turn.at}`);
      else c.say(r.turn ? `fix_at_${r.turn.at}` : "straight_only");
    } else {
      c.say(`out_${r.out}`);
      if (r.turn) c.say(`then_${r.turn.at}`);
    }
    checkedByQuestion(c);
  },
  ask_turn_where(c) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    if (r.turn) c.say(`at_${r.turn.at}`);
    else { c.say(`out_${r.out}`); c.say("straight_only"); }
    checkedByQuestion(c);
  },
  ask_blocks(c) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    c.say(`blocks_${r.blocks}`);
    checkedByQuestion(c);
  },
  ask_street(c, slots) {
    const p = placeOf(slots);
    if (p && TRIPS.has(p)) { tripInfo(c, p); return; }
    const id = p ?? c.s.dest;
    if (!id) { needPlace(c); return; }
    clar(c);
    c.say(`street_${ROUTES[id].street}`);
    if (id === c.s.dest) checkedByQuestion(c);
  },
  ask_far(c, slots) {
    const p = placeOf(slots);
    if (p && TRIPS.has(p)) { tripInfo(c, p); return; }
    if (p) {
      c.say(`far_${ROUTES[p].mins}`);
      if (p !== c.s.dest) giveRoute(c, p);
      return;
    }
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    c.say(`far_${r.mins}`);
  },
  ask_which_one(c, _slots, seg) {
    const r = currentRoute(c);
    if (!r) { needPlace(c); return; }
    clar(c);
    answerSize(c, r, seg.tags.includes("big") ? true : seg.tags.includes("little") ? false : null);
  },
  show_map(c, slots) {
    const p = placeOf(slots);
    if (p && TRIPS.has(p)) { tripInfo(c, p); return; }
    const id = p ?? c.s.dest;
    if (!id) { needPlace(c); return; }
    if (giveMap(c)) c.say("map_give");
    if (id !== c.s.dest) { c.s.dest = id; if (!c.s.asked.includes(id)) c.s.asked.push(id); }
    c.say("show_map");
    if (ROUTES[id].loc) c.event("mark-map", { to: ROUTES[id].loc });
  },
  did_i(c) {
    if (!c.s.dest) { needPlace(c); return; }
    quiz(c);
  },
  understood(c) {
    if (c.step === "confirm" && c.s.dest && !c.s.conf[c.s.dest]) quiz(c);
    else if (c.step === "more") c.s.moreDone = true;
    else c.say("ack_great");
  },
  lost(c) {
    clar(c);
    if (!c.s.dest) { c.say("dont_understand"); replayContent(c, true); c.hold(); return; }
    sayAgainSlow(c);
  },
  dir_ans_ctx(c, slots) { quizAnswer(c, slots.dir); },
  straight_ans_ctx(c) { c.say("straight_not"); },
  need_help(c) {
    // (a question in the same breath gets its own answer; with nothing more, Don Chuy starts with the map)
    if (!c.s.map && !c.s.mapNo && !c.s.dest) c.say("need_help");
    else if (!c.s.dest) askWhere(c);
  },
  lost_item(c) {
    c.say("lost_item");
    if (c.s.dest !== "police") giveRoute(c, "police");
  },

  // --- clarification (global skills with Don Chuy's reactions) -------------
  g_repeat(c, slots) {
    clar(c);
    const key = lastContentKey(c);
    c.s.repeats = c.s.repeatKey === key ? (c.s.repeats || 0) + 1 : 1;
    c.s.repeatKey = key;
    if (c.s.repeats >= 2 && !conv(c).slow) {
      c.say("repeat_fast_again");
      replayContent(c, true);
      c.hold();
      return;
    }
    // a fast talker repeats it just as fast the first time
    conv(c).replayLast(false);
    c.hold();
    void slots;
  },
  g_slower(c) {
    clar(c);
    c.say("slow_intro");
    replayContent(c, true);
    c.hold();
  },
  say_again_slowly(c, slots, seg) { H.g_slower(c, slots, seg); },
  repeat_it(c, slots, seg) { H.g_repeat(c, slots, seg); },
  write_it(c, slots, seg) { H.g_write(c, slots, seg); },
  didnt_understand(c, slots, seg) { H.g_dont_understand(c, slots, seg); },
  g_dont_understand(c) {
    clar(c);
    c.say("dont_understand");
    replayContent(c, true);
    conv(c).showMeaning();
    c.hold();
  },
  g_learning(c) {
    clar(c);
    c.say("learning");
    replayContent(c, true);
    c.hold();
  },
  louder(c) {
    clar(c);
    c.say("louder");
    replayContent(c, false);
    c.hold();
  },
  g_spell(c, slots) { clar(c); GLOBAL_HANDLERS.g_spell(c as ConvCtx, slots); },
  g_write(c, slots) {
    clar(c);
    const cv = conv(c);
    const hasNote = cv.lastLines.some((l) => { const src = (cv.sit.lines[l.lineId] ?? [])[l.variant]; return !!(src?.write || src?.spell); });
    if (!hasNote && c.s.dest) {
      c.say("g_write");
      cv.addNote({ en: cv.sit.lines[`r_${c.s.dest}`][0].write! });
      c.hold();
      return;
    }
    GLOBAL_HANDLERS.g_write(c as ConvCtx, slots);
  },
  spell_q(c, slots, seg) {
    clar(c);
    let w: string | null = null;
    const spot = slots.sp ? SPOTS.find((e) => e.id === slots.sp) : undefined;
    if (spot) w = spot.attrs!.w as string;
    else if (seg.tags.includes("password")) w = "colibri";
    else if (seg.tags.includes("street")) {
      const r = currentRoute(c);
      w = r ? { juarez: "Juárez", ceiba: "Ceiba", itzamna: "Itzamná" }[r.street] : null;
    }
    if (w) c.say("g_spell", { letters: w });
    else c.say("g_which_word");
    c.hold();
  },
  g_meaning(c, slots) {
    const id = wordFromText(slots.w) ?? (slots.w ? undefined : [...conv(c).lastLines].reverse().map((l) => LINE_WORD[l.lineId]).find(Boolean));
    if (id) { explain(c, id); return; }
    clar(c);
    GLOBAL_HANDLERS.g_meaning(c as ConvCtx, slots);
  },
  word_q(c, slots) { explain(c, slots.word); },
  thanks_patience(c) { c.say("thanks_patience"); c.s.patience = true; if (c.step === "more") c.s.moreDone = true; },

  // --- small answers -------------------------------------------------------
  g_ok(c) {
    if (c.step === "confirm" && c.s.dest && !c.s.conf[c.s.dest]) quiz(c);
    else if (c.step === "more") c.s.moreDone = true; // "Perfecto, gracias" = that's all
  },
  g_thanks(c, slots) {
    if (c.step === "confirm" && c.s.dest && !c.s.conf[c.s.dest]) {
      c.say("g_welcome");
      if (c.s.confirmed) c.s.conf[c.s.dest] = true; // the goal is already reached: no quiz this time
      else quiz(c);
      return;
    }
    if (c.step === "more") { c.s.moreDone = true; c.say("g_welcome"); return; }
    if (c.step === "map" && !c.s.map && !c.s.mapNo) { giveMap(c); c.say("map_give"); return; }
    GLOBAL_HANDLERS.g_thanks(c as ConvCtx, slots);
  },
  just_looking(c) { offerCafe(c, false); },
  // "Me lo llevo" / "Dígame" / "Tiene razón": yes to the open offer (the pending questions catch it first)
  accept_ctx(c) {
    if (cafeOffered(c)) { if (!c.s.asked.includes("sunny_cup") && !c.s.cafeNo) giveRoute(c, "sunny_cup"); return; }
    if (c.step === "map" || !c.s.map) { if (giveMap(c)) c.say("map_give"); return; }
    c.say("ack_great");
  },
  // "No lo necesito" / "Tal vez más tarde": no to the open offer
  decline_ctx(c) {
    if (cafeOffered(c)) { if (!c.s.asked.includes("sunny_cup")) declineCafe(c); return; }
    if (c.step === "map" && !c.s.map) { c.s.mapNo = true; c.say("map_ok_no"); return; }
    c.say("no_problem");
  },
  no_coffee(c) {
    if (!c.s.asked.includes("sunny_cup")) declineCafe(c);
    else c.say("oh_okay");
  },
  thanks_help(c, slots, seg) { H.g_thanks(c, slots, seg); },
  more_no(c) { c.s.moreDone = true; },
  // "¡Adiós!" once the visit's goal is reached completes it (finish says goodbye).
  g_bye(c, slots) {
    const p = conv(c).pending;
    const rest = conv(c).nextStep(c as ConvCtx);
    if ((!p && (!rest || rest.id === "more")) || (c.s.confirmed && (!p || isConfirmPending(p.id) || p.id === "cafe_offer"))) {
      clearConfirmPending(c);
      if (p?.id === "cafe_offer") conv(c).pending = null;
      if (!c.s.asked.includes("sunny_cup")) c.s.cafeNo = true;
      c.s.moreDone = true; c.s.byeNow = true; return;
    }
    GLOBAL_HANDLERS.g_bye(c as ConvCtx, slots);
  },
  just_arrived(c) { c.say("welcome_new"); },
  ask_language(c) { c.say("speak_lang"); conv(c).markSlow(); },
  is_visitor_center(c) { c.say("yes_vc"); },
  // "¿Dónde puedo tomar un buen café?": La Ceiba (its way again once given)
  ask_coffee(c) {
    if (c.s.asked.includes("sunny_cup")) { giveRoute(c, "sunny_cup"); return; }
    offerCafe(c, false, true);
  },
  more_yes(c) { c.say("g_yes_what"); c.hold(); },

  // --- information ---------------------------------------------------------
  ask_hours(c) { c.say("hours"); },
  // "¿A qué hora abre el museo?", or "¿A qué hora abre?" (#it) about the place just talked about
  ask_place_hours(c, slots, seg) {
    const p = (slots.place as string | undefined) ?? (seg.tags.includes("it") ? placeInTalk(c) : undefined);
    if (!p) { c.say("hours"); return; }
    c.say(TRIPS.has(p) ? "trip_hours" : HOURS_LINE[p] ?? "hours_unknown");
  },
  // "¿Cuánto cuesta la entrada al museo?" / "¿Es gratis la playa?" / "¿Se paga en el cenote?"
  place_price(c, slots) { answerPrice(c, priceKind(slots.place as string)); },
  ask_downtown(c) { c.say("downtown"); },
  ask_events(c) {
    c.s.events = true;
    c.say("events_music");
    c.say("events_market");
  },
  // A bare "¿Es gratis?" / "¿Cuánto cuesta?": what Don Chuy just talked about (the museum, a trip, the beach, the
  // music, the map); with nothing just said, the music once events were mentioned, else the map.
  event_free(c, _slots, seg) {
    const pp = pricedPlace(c);
    if (pp) { answerPrice(c, priceKind(pp)); return; } // "¿Es gratis el museo?" cut in two
    const topic = priceTopic(c) ?? (c.s.events ? "events" : "map");
    if (topic === "events") { c.say("event_free"); return; }
    if (topic === "map") {
      c.say(seg.tags.includes("cost") ? "map_free_cost" : "map_free");
      if (giveMap(c)) c.say("map_give");
      return;
    }
    answerPrice(c, topic);
  },
  event_time(c) { if (c.s.events) c.say("event_time"); else { c.say("events_music"); c.s.events = true; } },
  ask_buspass(c, _slots, seg) {
    c.say(seg.tags.includes("when") ? "colectivo_when" : seg.tags.includes("ticket") ? "ticket_none" : seg.tags.includes("price") ? "colectivo_price" : "colectivo");
  },
  // "¿Dónde tomo un taxi?" (far_15 suggests one): hail one on the avenue
  ask_taxi(c) { c.say("taxi"); },
  // "¿Dónde es la música?": in the zócalo (events_music said so): the way there
  where_music(c) { giveRoute(c, "square"); },
  ask_busstop(c, _slots, seg) { c.say(seg.tags.includes("which") ? "bus_which" : "busstop"); },
  ask_schedule(c) { c.say("bus_schedule"); c.event("give", { item: "bus-schedule" }); },
  // "¿El café tiene wifi?": yes, but its password is theirs (s72: ceiba2026), not the office's colibri
  ask_wifi(c) {
    const p = pricedPlace(c);
    c.say(p && WIFI_THERE.has(p) ? "wifi_there" : "wifi");
  },
  ask_restroom(c) { c.say("restroom"); },
  ask_brochure(c) { c.say("brochure"); },
  ask_recommend(c) { c.say("recommend"); },
  ask_food(c) { c.say("food"); },
  ask_map_lang(c) { c.say("map_lang"); if (giveMap(c)) c.say("map_give"); },
};

/** Situation handlers: any real request ends the opening question, and "Sí, por favor, y…"
 *  (or "No, gracias, pero…") answers the map offer as well. */
const CLARIFY = new Set(["g_repeat", "repeat_it", "write_it", "g_slower", "say_again_slowly", "g_dont_understand", "didnt_understand", "g_learning", "louder", "g_spell", "g_write", "spell_q", "g_meaning", "word_q", "g_ok", "g_thanks", "thanks_help"]);
function wrap(hs: Record<string, Handler>): Record<string, Handler> {
  const out: Record<string, Handler> = {};
  for (const [id, h] of Object.entries(hs)) {
    out[id] = (c, slots, seg) => {
      // An utterance can be parsed as several segments of the same intent ("Perdón, ¿mande?"): react once.
      if (!onceThisTurn(c, "h:" + id)) return;
      if (!CLARIFY.has(id)) c.s.need = true;
      if (c.step === "map" && !c.s.map && !c.s.mapNo && !id.startsWith("map") && id !== "ask_map") {
        if (saidYes(c) && giveMap(c)) c.say("map_give");
        else if (saidNo(c)) c.s.mapNo = true;
      }
      h(c, slots, seg);
    };
  }
  return out;
}

// Model answers for checking the route: each destination gets its own (a full check, a short check, a
// question), so the examples shown are always true for the route Don Chuy just gave.
const CHK: Record<string, HintItem> = {
  full_bank: { id: "k_so_i", s: t("Entonces | salgo | a la derecha, | camino | dos | cuadras | y | en | el | banco | doy vuelta | a la izquierda, | ¿verdad?", "So | I go out | to the right, | I walk | two | blocks | and | at | the | bank | I turn | to the left, | right?", "So I go right out the door, walk two blocks, and turn left at the bank, right?"),
    note: "Repeat the way in your own words to check it. Don Chuy will correct you if something's off." },
  full_left2: { id: "k_so_i", s: t("Entonces | salgo | a la izquierda | y | sigo | derecho | dos | cuadras, | ¿verdad?", "So | I go out | to the left | and | I keep going | straight | two | blocks, | right?", "So I go left out the door and straight for two blocks, right?") },
  full_right2: { id: "k_so_i", s: t("Entonces | salgo | a la derecha | y | sigo | derecho | dos | cuadras, | ¿verdad?", "So | I go out | to the right | and | I keep going | straight | two | blocks, | right?", "So I go right out the door and straight for two blocks, right?") },
  full_right1: { id: "k_so_i", s: t("Entonces | salgo | a la derecha | y | camino | una | cuadra, | ¿verdad?", "So | I go out | to the right | and | I walk | one | block, | right?", "So I go right out the door and walk one block, right?") },
  full_left1: { id: "k_so_i", s: t("Entonces | salgo | a la izquierda | y | camino | una | cuadra, | ¿verdad?", "So | I go out | to the left | and | I walk | one | block, | right?", "So I go left out the door and walk one block, right?") },
  full_square: { id: "k_so_i", s: t("Entonces | salgo | a la izquierda | hasta | el | zócalo | y | ahí | doy vuelta | a la derecha, | ¿verdad?", "So | I go out | to the left | to | the | main square | and | there | I turn | to the right, | right?", "So I go left to the main square and turn right there, right?") },
  full_next: { id: "k_so_i", s: t("Entonces | está | aquí | al lado, | ¿verdad?", "So | it's | here | next door, | right?", "So it's right next door?") },
  left_bank: { id: "k_turn_at", s: t("¿En | el | banco, | a la izquierda?", "At | the | bank, | to the left?", "Left at the bank?") },
  right_square: { id: "k_turn_at", s: t("¿En | el | zócalo, | a la derecha?", "At | the | main square, | to the right?", "Right at the main square?") },
  right_door: { id: "k_door", s: t("¿Al | salir, | a la derecha?", "Upon | leaving, | to the right?", "Right out the door?") },
  left_door: { id: "k_door", s: t("¿Al | salir, | a la izquierda?", "Upon | leaving, | to the left?", "Left out the door?") },
  two_blocks: { id: "k_two_blocks", s: t("¿Dos | cuadras?", "Two | blocks?", "Two blocks?") },
  side: { id: "k_side", s: t("¿Está | a la derecha | o | a la izquierda?", "Is it | on the right | or | on the left?", "Is it on the right or on the left?") },
  far: { id: "k_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
};
const CHECK_FOR: Record<string, string[]> = {
  sunny_cup: ["full_bank", "left_bank", "side"], post_office: ["full_bank", "left_bank", "side"], station: ["full_bank", "left_bank", "far"],
  market: ["full_bank", "left_bank", "side"], taqueria: ["full_bank", "left_bank", "side"], bank: ["full_right2", "two_blocks", "side"], pharmacy: ["full_right1", "right_door", "side"],
  salon: ["full_right1", "right_door", "side"], hotel: ["full_next", "right_door", "side"], trattoria: ["full_left1", "left_door", "side"],
  threads: ["full_left1", "left_door", "side"], museum: ["full_left2", "left_door", "side"], police: ["full_left2", "left_door", "side"],
  square: ["full_left2", "two_blocks", "side"], tianguis: ["full_left2", "two_blocks", "side"], beach: ["full_square", "right_square", "far"],
  pier: ["full_square", "right_square", "far"], lighthouse: ["full_square", "right_square", "far"],
};
const QUIZ_ITEMS = (id: string, where: string, whereEn: string, natWhere: string): HintItem[] => [
  { id, s: t(`${where} | a la izquierda.`, `${whereEn} | to the left.`, `Left ${natWhere}.`) },
  { id, s: t(`${where} | a la derecha.`, `${whereEn} | to the right.`, `Right ${natWhere}.`) },
];
const GOTIT: HintItem[] = [
  { id: "g_gotit", s: t("¡Ya | entendí, | gracias!", "Now | I understood, | thanks!", "Got it, thanks!") },
  { id: "g_understand", s: t("Ah, | ahora | sí | entiendo.", "Oh, | now | for sure | I understand.", "Oh, now I understand.") },
  { id: "g_isee", s: t("Ya | me ubiqué. | ¡Gracias!", "Now | I've got my bearings. | Thanks!", "Okay, I know where it is now. Thanks!"),
    note: "“Ubicarse” = to know where you are, or where something is. Very common in Mexico." },
];

const WHERE_BASE: HintItem[] = [
  { id: "q_how_get", s: t("¿Cómo | llego | a | {X.the}?", "How | do I get | to | {X.the}?", "How do I get to {X.the}?") },
  { id: "q_where", s: t("¿Dónde | está | {X.the}?", "Where | is | {X.the}?", "Where's {X.the}?") },
  { id: "q_tell_me", s: t("¿Me | puede | decir | cómo | llegar | a | {X.the}?", "(To) me | can you | tell | how | to get | to | {X.the}?", "Could you tell me how to get to {X.the}?"), register: "polite" },
  { id: "q_looking", s: t("Busco | {X.the}.", "I'm looking for | {X.the}.", "I'm looking for {X.the}.") },
  { id: "q_which_way", s: t("¿Por | dónde | queda | {X.the}?", "Along | where | is | {X.the}?", "Which way is {X.the}?") },
  { id: "q_far", s: t("¿Está | lejos | {X.the}?", "Is | far | {X.the}?", "Is {X.the} far from here?") },
  { id: "q_want_go", s: t("Quisiera | ir | a | {X.the}.", "I'd like | to go | to | {X.the}.", "I'd like to go to {X.the}.") },
  { id: "q_show", s: t("¿Me | puede | mostrar | {X.the} | en | el | mapa?", "(To) me | can you | show | {X.the} | on | the | map?", "Could you show me {X.the} on the map?") },
  { id: "q_short", s: t("A | {X.the}, | por favor.", "To | {X.the}, | please.", "To {X.the}, please."), note: "A short answer when Don Chuy asks “¿A dónde va?”" },
];

// ---------------------------------------------------------------------------
// Route lines: the fast one (Don Chuy's style) and the clear one (after "más despacio, por favor")

const W_CAFE = "Café La Ceiba: saliendo, a la derecha → 2 cuadras hasta el banco → en el banco, a la izquierda (calle Ceiba) → a mano derecha, enfrente de Correos";
const W = {
  post_office: "Correos: saliendo, a la derecha → 2 cuadras hasta el banco → en el banco, a la izquierda (calle Ceiba) → a mano izquierda, enfrente del café La Ceiba",
  market: "Mercado: saliendo, a la derecha → 2 cuadras hasta el banco → en el banco, a la izquierda (calle Ceiba) → a mano izquierda, después de Correos",
  taqueria: "Taquería: saliendo, a la derecha → 2 cuadras hasta el banco → en el banco, a la izquierda (calle Ceiba) → a mano izquierda, junto al mercado",
  bank: "Banco: saliendo, a la derecha → 2 cuadras → en la esquina de Juárez y Ceiba",
  pharmacy: "Farmacia: saliendo, a la derecha → 1 cuadra → a mano derecha, junto a la estética",
  salon: "Estética Tijeras: saliendo, a la derecha → 1 cuadra → a mano derecha, junto a la farmacia",
  hotel: "Hotel Mar Azul: aquí al lado, a la derecha",
  station: "Terminal: saliendo, a la derecha → 2 cuadras hasta el banco → en el banco, a la izquierda (calle Ceiba) → al final de la calle",
  trattoria: "La Cocina de Lucía: saliendo, a la izquierda → 1 cuadra → a mano izquierda (toldo rojo), enfrente de la boutique Hilos",
  threads: "Boutique Hilos: saliendo, a la izquierda → 1 cuadra → a mano derecha, enfrente de La Cocina de Lucía",
  square: "Zócalo: saliendo, a la izquierda → 2 cuadras → a mano derecha (el kiosco)",
  tianguis: "Tianguis (sábados): saliendo, a la izquierda → 2 cuadras → en el zócalo, a mano derecha",
  museum: "Museo: saliendo, a la izquierda → 2 cuadras → a mano izquierda, enfrente del zócalo",
  police: "Policía: saliendo, a la izquierda → 2 cuadras → a mano izquierda, junto al museo",
  beach: "Playa: saliendo, a la izquierda → 2 cuadras hasta el zócalo → en el zócalo, a la derecha (calle Itzamná) → al final, el mar",
  pier: "El Muelle: saliendo, a la izquierda → 2 cuadras hasta el zócalo → en el zócalo, a la derecha (calle Itzamná) → junto al mar",
  lighthouse: "Faro: saliendo, a la izquierda → hasta el zócalo → a la derecha hasta el mar → todo el malecón (30 minutos)",
};

export const visitorCenter: SituationDef = {
  id: "s62-visitor-center",
  song: 62,
  songTitle: "Could You Say That Again?",
  title: { en: "¿Me lo puede repetir?", lt: "Could you say that again?" },
  topic: { en: "Cuando no entiende", lt: "When you don't understand" },
  chapter: 2,
  order: 1,
  location: "visitor-center",
  npc: "chuck",
  goal: "Get a town map and find out how to get to Café La Ceiba. Don Chuy talks very fast, so ask him to repeat, slow down, or spell things.",
  intro: "You're at the tourist information office in Puerto Colibrí: racks of brochures, a big town map on the wall. Don Chuy, the volunteer, is super friendly but talks a mile a minute. Stop him whenever you need to: asking is completely normal.",
  entities: { place: PLACES, dir: DIRS, street: STREETS, word: WORDS, spot: SPOTS },

  grammar: {
    macros: {
      map_word: "(un mapa | el mapa | mapas | un mapita | un plano | el plano | los mapas) [turistico | gratis] [(del | de la) (pueblo | ciudad | centro | zona) | de puerto colibri | de aqui]",
      turnv: "(doy vuelta | dar vuelta | doy la vuelta | volteo | voltear | giro | girar | doblo | doblar | tuerzo | voy | me voy | camino | agarro | da vuelta | voltea | gira | dobla | tengo que dar vuelta | tengo que voltear | tengo que girar | hay que dar vuelta | hay que voltear | debo dar vuelta | debo girar)",
      straightv: "(sigo | voy | camino | continuo | sigo caminando | me sigo | avanzo | ando)",
      blocks: "({n:number} (cuadras | calles | manzanas) | (una | 1) (cuadra | calle | manzana) #b1 | un par de (cuadras | calles) #b2 | unas (cuantas | pocas) cuadras #b3)",
      ctail: "(verdad | cierto | correcto | es correcto | asi es | no | si | entendi bien | lo entendi bien | ok | no es asi)",
      join: "(y | luego | y luego | despues | y despues | entonces | y entonces | ahi | y ahi)",
      pre: "(luego | y luego | despues | y despues | ahi | y ahi | entonces | y)",
      subj: "(esta | queda | y esta | y queda | {subj:place} (esta | queda))",
      here_: "(por aqui | cerca | aqui cerca | en el pueblo | en el centro | cerca de aqui)",
      twk: "(esta semana | este fin de semana | el fin de semana | hoy | esta noche | manana | en el pueblo | ahorita | en la noche | estos dias)",
      at_: "(en | al llegar a | al llegar al | cuando llego a | cuando llego al | llegando a | llegando al)",
    },
    slots: {
      piece: { pattern: [
        "(al salir | saliendo | saliendo de aqui | cuando salgo | afuera | en la puerta) [@turnv] [a] [la] {dir} #out",
        "@turnv [a] [la] {dir} (al salir | saliendo | cuando salgo | saliendo de aqui) #out",
        "salgo [y] [@turnv] [a] [la] {dir} #out",
        "(voy | camino | sigo) [a] [la] {dir} hasta {lm:place} #out",
        "(primero | luego | despues | y luego) [@turnv] [a] [la] {dir} #bare",
        "@turnv [a] [la] {dir} #bare",
        "[@pre] @at_ {lm:place} [@turnv] [a] [la] {dir} #at",
        "[@pre] [@turnv] [a] [la] {dir} @at_ {lm:place} #at",
        "[@pre] [@turnv] [a] [la] {dir} en la esquina #bare",
        "[@pre] [@turnv] [a] [la] {dir} (en | por | hacia) [la] (calle | avenida) {street} #onto",
        "@straightv (derecho | derechito | recto | todo derecho | todo recto) [@blocks] [hasta {lm:place}] #straight",
        "@straightv @blocks [derecho | derechito | recto] [hasta {lm:place}] #straight",
        "(derecho | derechito | todo derecho | recto) [@blocks] [hasta {lm:place}] #straight",
        "@blocks [derecho | derechito | recto] [hasta {lm:place}] #straight",
        "(esta | queda | son) a @blocks [de aqui] #straight",
        "@subj [a] [la] {dir} #side",
        "@subj a mano {dir} #side", "a mano {dir} #side",
        "@subj del lado (derecho #sr | izquierdo #sl) #side",
        "[{subj:place}] no (esta | queda) [a] [la | mano] {dir} #side #neg",
        "[@subj] (enfrente | frente | delante) (de | del | a | al) {ref:place} #across",
        "[@subj] (junto | al lado | a un lado | pegado | pegadito) (a | al | de | del) {ref:place} #next",
        "[@subj] cerca (de | del) {ref:place} #near",
        "[@subj] [aqui] (al lado | junto | a un lado | pegadito) #nextdoor",
        "[@subj | es] (el | la) [lugar | local | edificio | casita] (chiquito | chiquita | pequeno | pequena | chico | chica) [amarillo | de la puerta amarilla] #little",
        "[@subj | es] el de la puerta amarilla #little", "[@subj | es] (el | la) (chiquito | chiquita | pequeno | pequena | chico | chica) con la puerta amarilla #little",
        "[@subj | es] (el | la) [edificio] grande [blanco] #big",
        "[es] el edificio (grande | blanco) #big",
      ] },
      route: { pattern: [
        "{piece} [[@join] {piece}] [[@join] {piece}] [[@join] {piece}] [[@join] {piece}]",
        "{fdir:dir} [@join] {piece} [[@join] {piece}] [[@join] {piece}] [[@join] {piece}]",
      ] },
    },
  },

  intents: {
    // map
    ask_map: { patterns: [
      "(me da | me puede dar | me podria dar) @map_word #h:map_could", "(tiene | tienen) @map_word #h:map_do_you", "(tienes | me das | me puedes dar) @map_word #tip:tu_staff",
      "(puedo | podria) (tener | llevarme | agarrar | tomar) @map_word #h:map_can", "(quisiera | me gustaria) @map_word #h:map_id_like",
      "me regala @map_word", "(necesito | ocupo) @map_word", "quiero @map_word #blunt", "@map_word", "(busco | estoy buscando) @map_word",
      "(donde | en donde) (consigo | encuentro | hay) @map_word", "(hay | habra) @map_word", "deme @map_word", "dame @map_word #tip:tu_staff",
      "(me | nos) (da | regala) uno", "me llevo (uno | un mapa)",
    ] },
    map_free: { patterns: [
      "(es | el mapa es | son) gratis [el mapa] #h:map_free", "el mapa (es | esta) gratis", "cuanto (cuesta | vale | es) (el mapa | un mapa) #cost", "(hay que | tengo que) pagar (el mapa | por el mapa) #cost",
      "(cuesta | se paga) [algo] el mapa #cost", "(cobran | se cobra) el mapa #cost", "los mapas son gratis", "el mapa (tiene costo | cuesta algo) #cost",
    ] },
    map_here: { patterns: ["(donde | en donde) (estamos | estoy) [en el mapa] #h:map_here", "@could_you (mostrar | ensenar) donde estamos", "donde esta (esta oficina | la oficina [de turismo]) en el mapa"] },
    map_no: { patterns: [
      "no (necesito | quiero | ocupo | busco) [un | el] mapa", "sin mapa", "ya tengo (un mapa #have | uno #have | el mapa #have)", "tengo (un mapa #have | uno #have) [ya]",
      "[ya] (tengo | traigo) (el mapa | un mapa | mapas | google maps | uno) en (mi | el) celular #have", "(uso | voy a usar) (google maps | mi celular | el celular | el gps) #have",
    ] },
    // destinations
    ask_where: { patterns: [
      "como (llego | puedo llegar | se llega | le hago para llegar) (a | al) {place} [desde aqui] #h:q_how_get", "como (voy | puedo ir | se va) (a | al) {place} [desde aqui]",
      "(donde | en donde) (esta | queda) {place} #h:q_where", "(donde | en donde) (hay | encuentro | puedo encontrar) {place}", "(donde | adonde) es {place}",
      "(me puede | podria | me podria | sabe) decir (como llegar | como llego | como se llega) (a | al) {place} #h:q_tell_me", "(me puede | podria | me podria) decir donde (esta | queda) {place}",
      "(sabe | sabes) donde (esta | queda) {place}", "me puedes decir como llegar (a | al) {place} #tip:tu_staff",
      "(busco | ando buscando) {place} #h:q_looking", "estoy buscando {place}",
      "por donde (esta | queda | se va a | se va al | voy a | voy al) {place} #h:q_which_way", "(cual es | que) (el)? camino (para | a | al) {place}",
      "(quisiera | quiero | me gustaria | necesito | tengo que) (ir | llegar) (a | al) {place} #h:q_want_go", "(quisiera | quiero | me gustaria) (ver | visitar | conocer) {place}",
      "(hay | habra) {place} [@here_]", "(voy | vamos) (a | al) {place}", "para ir (a | al) {place}", "(a | al) {place} como (llego | voy | se llega)",
      "(me | nos) (indica | puede indicar | podria indicar) (como llegar | el camino) (a | al) {place}", "el camino (a | al | para) {place}", "direccion (de | del) {place}",
      "(cual es | que es) la mejor manera de llegar (a | al) {place}", "(quisiera | quiero | me gustaria) saber (como llegar | como llego | como se llega | donde (esta | queda)) (a | al) {place}", "(digame | expliqueme | me dice | me explica) como (llegar | llego | se llega) (a | al) {place}",
      "(quiero | quisiera | me gustaria) (nadar | ir a nadar | bucear) (en | a) {place}", "(donde | en donde) (puedo | se puede) sacar dinero #atm", "necesito (sacar dinero | un cajero) #atm",
      // changing money: at the bank (s78 changes dollars)
      "(donde | en donde) (puedo | se puede) cambiar (dinero | dolares | euros) #atm", "(necesito | quiero | quisiera) cambiar (dinero | dolares | euros) #atm",
      "(puedo | se puede) cambiar (dinero | dolares | euros) [aqui] #atm", "[donde | en donde] hay (una)? casa de cambio [por aqui] #atm",
    ] },
    just_arrived: { patterns: [
      "(acabo de llegar | llegué (hoy | ayer | anoche | esta manana)) [al pueblo | a puerto colibri] [y] [es mi (primer dia | primera vez) [aqui | en el pueblo]]", "(soy | somos) (nuevo | nueva | nuevos) [aqui | en el pueblo]",
      "es mi (primer dia | primera vez) [aqui | en puerto colibri | en el pueblo]", "es la primera vez que (vengo | estoy aqui)", "(estoy | estamos) de (vacaciones | visita | paseo)", "(soy | somos) (turista | turistas)",
      "(me acabo de mudar | me acabo de cambiar | me mudé) [aqui | al pueblo | a puerto colibri] [hace poco]", "(ahora | ya) vivo aqui", "(vivo | voy a vivir) aqui [ahora]",
    ] },
    ask_language: { patterns: ["(habla | hablas) (ingles | aleman | frances | lituano | otro idioma | otros idiomas)", "(se habla | hablan) ingles [aqui]", "habla usted ingles"] },
    is_visitor_center: { patterns: ["(esta | aqui) es (la oficina de turismo | informacion turistica | el modulo de informacion | turismo)", "(esto | aqui) es (informacion turistica | la oficina de informacion)", "aqui (dan | tienen) informacion [turistica | para turistas]"] },
    ask_coffee: { patterns: [
      "(donde | en donde) (puedo tomar | hay | venden | se toma) [un] (buen cafe | cafe bueno | cafecito)", "(hay | conoce) (un | algun) (buen cafe | lugar para tomar cafe) [@here_]",
      "(quiero | quisiera | necesito) (un cafe | tomar un cafe | un cafecito | tomar cafe)", "me (gusta | encanta) [mucho] el cafe", "donde (hay | esta) (una cafeteria | un cafe) [@here_]",
      "donde (puedo | se puede) tomar cafe",
    ] },
    // "No tomo café": an indirect no to Don Chuy's café tip
    no_coffee: { patterns: ["no (tomo | bebo) cafe", "no me gusta el cafe", "no quiero (cafe | un cafe)", "nunca tomo cafe", "no soy de cafe", "no tomo", "prefiero (el | un) te"] },
    ask_where_unknown: { patterns: ["como llego (a | al) {w:any}", "(donde | en donde) (esta | queda) {w:any}", "busco {w:any}"] },
    // A bare place ("Al museo.") is accepted anywhere but never listed in `expects` (see the English edition).
    dest_short: { patterns: ["[mejor] [a | al | hacia | para] {place} #h:q_short"] },
    dest_neg: { patterns: ["no (quiero | necesito | voy a) ir (a | al) {place}", "no (a | al) {place}", "no (busco | voy a | voy al) {place}", "{place} no me interesa", "no me interesa {place}"] },
    dest_correction: { patterns: ["no (a | al) {place} [sino | mejor] (a | al) {place}", "no dije {place} [dije] {place}", "(dije | quise decir | me referia a | me referia al) {place}", "(a | al) {place} no (a | al) {place}", "no {place} sino {place}"] },
    repeat_route: { patterns: ["como llego (ahi | alla) [otra vez]", "(cual | como) era el camino", "@could_you (repetir | decir) (el camino | las indicaciones | como llegar) [otra vez | de nuevo]", "me (repite | dice) (el camino | las indicaciones | como llegar) [otra vez]", "por donde era", "como era [el camino]"] },
    ask_downtown: { patterns: ["(donde | en donde) (esta | queda) el centro [del pueblo] #h:q_downtown", "como (llego | voy) al centro", "por donde (esta | queda) el centro"] },
    // checking understanding
    confirm: { patterns: [
      "(entonces | o sea | osea | ok entonces | ah entonces | y entonces | bueno entonces) {route} [@ctail] #h:k_so_i",
      "(dejeme ver | para confirmar | nada mas para confirmar | solo para confirmar | a ver si entendi | dejeme repetir) [entonces] {route} [@ctail] #h:k_so_i",
      "{route} [@ctail]",
      "{fdir:dir} @ctail",
    ] },
    ask_side: { patterns: [
      "(esta | queda) a la (derecha | izquierda) o a la (izquierda | derecha) #h:k_side", "{place} (esta | queda) a la (derecha | izquierda) o a la (izquierda | derecha)",
      "(de | en) que lado (esta | queda) [de la calle]", "(de | en) que lado", "(a la derecha | derecha) o (a la izquierda | izquierda)", "(a la izquierda | izquierda) o (a la derecha | derecha)",
      "(esta | queda) a mano (derecha | izquierda) o (izquierda | derecha)", "(de | en) que lado de la calle",
    ] },
    ask_which_way: { patterns: [
      "para (donde | que lado) (doy vuelta | volteo | voy | salgo | camino) (al salir | saliendo | cuando salgo) #door", "(al salir | saliendo) (para donde | para que lado | hacia donde) [doy vuelta | voy] #door",
      "(doy vuelta | volteo | voy | salgo) a la (derecha | izquierda) o a la (izquierda | derecha) (al salir | saliendo) #door", "(al salir | saliendo) a la (derecha | izquierda) o a la (izquierda | derecha) #door", "a la (derecha | izquierda) o a la (izquierda | derecha) (al salir | saliendo) #door",
      "para (donde | que lado) (doy vuelta | volteo | voy) @at_ {lm:place}", "@at_ {lm:place} (para donde | para que lado | hacia donde) [doy vuelta | volteo]",
      "(doy vuelta | volteo) a la (derecha | izquierda) o a la (izquierda | derecha) @at_ {lm:place}",
      "para (donde | que lado) (doy vuelta | volteo | voy) [primero | luego | despues]", "hacia donde (voy | doy vuelta) [primero | luego]",
    ] },
    ask_turn_where: { patterns: [
      "(doy vuelta | volteo | giro) donde #h:k_turn_where", "(donde | en donde) (doy vuelta | volteo | giro | doblo) [a la (derecha | izquierda)]", "a la (izquierda | derecha) (donde | en donde)",
      "en (que | cual) (calle | esquina) (doy vuelta | volteo | giro) [a la (derecha | izquierda)]", "(donde | en donde) (es | era | esta) la vuelta", "en que (calle | esquina)",
      "(donde | en donde) (tengo que | hay que | debo) (dar vuelta | voltear | girar | doblar) [a la (derecha | izquierda)]",
    ] },
    ask_blocks: { patterns: [
      "cuantas (cuadras | calles | manzanas) [son | es | hay | camino | tengo que caminar] [de aqui] #h:k_blocks", "a cuantas (cuadras | calles | manzanas) (esta | queda)",
      "(es | son) (una | dos | tres) (cuadras | cuadra) o (dos | tres | cuatro)", "(una | dos | tres) (cuadras | cuadra) o (dos | tres | cuatro) [cuadras]", "[son | es] (una | dos | tres) o (dos | tres | cuatro) (cuadras | calles | manzanas)",
    ] },
    ask_street: { patterns: ["en (que | cual) (calle | avenida) (esta | queda)", "(como | cual) (se llama | es) (la calle | la avenida)", "que calle es", "cual es el nombre de la calle", "en (que | cual) calle (esta | queda) {place}", "(que | cual) calle"] },
    ask_far: { patterns: [
      "(esta | queda) lejos [de aqui] #h:k_far", "(esta | queda) (muy | demasiado) lejos", "que tan (lejos | cerca) (esta | queda)", "(esta | queda) cerca [de aqui]", "(se puede | puedo) ir (caminando | a pie)",
      "cuanto (tiempo)? (se hace | se tarda | me tardo | hago | se hacen) [caminando | a pie]", "cuantos minutos [son | caminando | a pie]", "cuanto tiempo [es | son | se hace] [caminando | a pie]", "es (lejos | cerca)", "[entonces] no (esta | queda) (lejos | muy lejos)",
      "{place} (esta | queda) lejos [de aqui] #h:q_far", "(esta | queda) lejos {place}", "que tan lejos (esta | queda) {place}", "(puedo | se puede) ir (caminando | a pie) (a | al) {place}", "cuanto (se tarda | se hace) (a | al | hasta) {place}",
    ] },
    ask_which_one: { patterns: [
      "(se refiere | te refieres) (al | a la) (grande #big | chiquito #little | chiquita #little | pequeno #little | pequena #little) #h:k_big_one", "(habla | me habla) del (grande #big | chiquito #little | pequeno #little)",
      "cual (de los dos)? [es]", "(el | la) grande o (el | la) (chiquito | chiquita | pequeno | pequena | chico | chica)", "(es | se refiere a) el grande o el (chiquito | pequeno)",
    ] },
    show_map: { patterns: [
      "(me lo | me la | lo | la) (marca | muestra | ensena | senala) en el mapa #h:k_show_map", "(me puede | puede | me podria | podria) (marcar | mostrar | ensenar | senalar) [lo | la] en el mapa", "(me lo | me la | lo | la) (puede | podria) (marcar | mostrar | ensenar | senalar) en el mapa",
      "(marquemelo | muestremelo | ensenemelo) en el mapa", "me puedes (marcar | mostrar | ensenar) [lo] en el mapa #tip:tu_staff", "(donde | en donde) (esta | queda) en el mapa",
      "(me puede | puede | me podria) (mostrar | ensenar | marcar) {place} en el mapa #h:q_show", "(donde | en donde) (esta | queda) {place} en el mapa", "me (marca | senala) el camino en el mapa",
    ] },
    did_i: { patterns: ["(entendi | lo entendi | le entendi) bien #h:k_did_i", "(es | esta) correcto", "lo dije bien", "voy bien", "asi es correcto", "(es | esta) bien asi"] },
    understood: { patterns: [
      "creo que (si | ya) [entendi]", "(ya | ok ya | si ya | ah ya) entendi [todo]", "ya (entiendo | le entendi | le entiendo | quedó claro | me quedó claro)", "(esta | quedó) (claro | clarisimo) [ahora]",
      "ahora (si)? (entiendo | entendi | me quedó claro)", "todo claro", "clarisimo", "ya me ubiqué", "me ubiqué", "(si | ok | ah | ah ok | ah ya) entendi", "ya (se | me se) (el camino | como llegar)", "(lo | la) voy a encontrar",
      "entendi todo", "ya (capté | caché)", "(perfecto | ok) entendi",
    ] },
    lost: { patterns: [
      "(me perdi | estoy perdido | estoy perdida | me revolvi | me confundi)", "estoy (un poco | medio | muy | algo) (confundido | confundida | perdido | perdida | revuelto | revuelta)", "estoy (confundido | confundida)",
      "no (entendi | capté | escuché) (todo | la ultima parte | el final | lo ultimo | la primera parte | las indicaciones | lo de la vuelta)", "no (me quedó | quedó) claro",
      "(fue | es) (mucha informacion | demasiada informacion | mucho)", "[no] no (esta | quedó | me quedó | queda) (claro | muy claro)", "no no (entendi | entiendo) [nada | bien | todo]", "(mas o menos | no del todo | no todo | casi | un poco | la mitad | solo la mitad | solo una parte)",
    ] },
    // "No capté": Don Chuy reacts as to "No entiendo"
    didnt_understand: { patterns: ["[perdon] no (capté | caché) [bien | eso | lo que dijo]"] },
    // "¿Me puede ayudar?" on its own (Don Chuy starts with the map)
    need_help: { patterns: ["(me puede | puede | me podria | podria) ayudar", "necesito (ayuda | su ayuda)", "me puedes ayudar #tip:tu_staff"] },
    lost_item: { patterns: ["(perdi | se me perdio | se me perdieron) (mi | mis) (cartera | pasaporte | celular | bolsa | mochila | llaves | billetera)", "(me robaron | alguien me robó) (mi | la | el) (cartera | pasaporte | celular | bolsa | mochila | billetera)", "no encuentro (mi | mis) (cartera | pasaporte | celular | bolsa | mochila | llaves | billetera)"] },
    // "¿Derecho?" at "¿A la derecha o a la izquierda?": derecho is straight ahead, not right (a common slip)
    straight_ans_ctx: { patterns: ["(derecho | todo derecho | derechito | recto | todo recto) [@ctail]", "(sigo | voy) (derecho | recto | derechito) [@ctail]"] },
    dir_ans_ctx: { patterns: ["[a] [la] {dir} [primero]", "(doy vuelta | volteo | voy | giro | doblo) [a] [la] {dir} [ahi]", "[a] [la] {dir} no [a] [la] {other:dir}", "(perdon | me equivoqué) [a] [la] {dir}", "creo que [a] [la] {dir}", "a mano {dir}",
      // "No a la derecha, a la izquierda": the second direction is the answer
      "[no] no [a] [la] {other:dir} [sino] [a] [la] {dir}", "(hacia | para) [la] {dir}", "(doy vuelta | volteo | voy | giro | doblo) (hacia | para) [la] {dir}", "[a] [la] {dir} creo"] },
    // clarification extras (the rest are global skills). repeat_it / write_it: the lesson's common forms the
    // shared g_repeat / g_write lack ("¿Puede repetirlo?", "¿Me lo escribe?"); they run the same reactions.
    repeat_it: { patterns: ["[perdon] @could_you (repetirlo | repetirmelo) [otra vez | por favor]", "[perdon] lo (puede | podria) repetir [otra vez | por favor]", "(repitalo | repitamelo) [por favor]"] },
    write_it: { patterns: ["[perdon] me lo escribe [por favor] [en el mapa | en un papel]", "[perdon] lo (escribe | puede escribir | podria escribir) [por favor] [en el mapa | en un papel]"] },
    say_again_slowly: { patterns: [
      "[perdon] me lo (repite | puede repetir | podria repetir | repites) (mas despacio | mas lento | despacito | despacio) #h:c_again_slowly",
      "[perdon] @could_you (repetir | repetirlo | decirlo | decir) [lo | eso] [otra vez | de nuevo] (mas despacio | mas lento | despacito | despacio)",
      "(repita | repitalo | repitamelo | repitelo) [otra vez] (mas despacio | mas lento | despacito | despacio)", "[perdon] (lo | me lo) (puede | podria) repetir [otra vez] (mas despacio | mas lento | despacito | despacio)", "[perdon] @could_you (repetirlo | repetirmelo) [otra vez] (mas despacio | mas lento | despacito | despacio)",
      "(otra vez | de nuevo | una vez mas) [pero] (mas despacio | mas despacito | despacito | mas lento | despacio)", "(mas despacio | mas despacito | despacito) (otra vez | de nuevo)",
      "(mas despacito | despacito)", "@could_you hablar (mas despacito | despacito | mas lentito)", "[perdon | lo siento] (hable | hableme) (mas despacio | mas lento | despacio | mas despacito) [por favor]",
    ] },
    louder: { patterns: [
      "@could_you hablar (mas fuerte | mas alto | un poco mas fuerte) #h:x_speak_up", "(mas fuerte | mas alto | un poco mas fuerte)", "no (le | te)? (oigo | escucho) [bien | nada]",
      "hay (mucho ruido | mucho escandalo)", "@could_you decirlo mas fuerte", "(hable | habla) mas fuerte",
    ] },
    spell_q: { patterns: [
      "como se escribe (la calle #street | el nombre de la calle #street | la avenida #street | el nombre de la avenida #street)", "como se escribe (la contrasena #password | la clave #password)",
      "como se escribe {sp:spot}", "@could_you deletrear (la calle #street | el nombre de la calle #street | la contrasena #password | {sp:spot})", "{sp:spot} como se escribe",
    ] },
    word_q: { patterns: [
      "que (es | son) [un | una | el | la | los | las] {word} #h:x_whats_a", "que (significa | quiere decir) [la palabra] {word} #h:x_word", "[un | una | el | la] {word} que (es | significa | quiere decir)",
      "no (se | conozco) [que es] [la palabra] {word}", "que es eso de {word}", "que significa eso de {word}", "no entiendo (la palabra | que es) {word}",
    ] },
    thanks_patience: { patterns: ["gracias por (su | tu) paciencia #h:t_patience", "(perdon | disculpe) por (tantas preguntas | preguntar tanto | la lata)", "gracias por tenerme paciencia", "disculpe (tantas preguntas | la lata)"] },
    thanks_help: { patterns: ["(usted es | es usted) muy amable", "(eso | esto) (fue | me fue | es) muy util", "(fue | ha sido) de mucha ayuda", "me sirvio mucho"] },
    just_looking: { patterns: [
      "(solo | nomas | nada mas) (estoy | ando) (viendo | paseando | conociendo | mirando) [el pueblo]", "(estoy | ando) (paseando | conociendo el pueblo)",
      "(solo | nomas) (vine a | quiero) (ver | pasear | conocer el pueblo)", "no se a donde ir", "no tengo (planes | plan) [todavia]", "(a ningun lado | a ninguna parte) [en (especial | particular)]",
      "nada en (especial | particular) [nomas conociendo el pueblo]", "no se (todavia | bien) a donde ir",
    ] },
    more_no: { patterns: [
      "(eso es | es) todo [por ahora | por hoy] #h:d_all", "nada mas [por ahora] #h:d_nothing", "(asi | ya) estoy bien #h:d_set", "no (necesito | ocupo) nada mas", "no tengo (mas | otras) preguntas",
      "ya con eso", "(eso | esto) seria todo", "seria todo", "con eso (es suficiente | tengo)", "ya tengo todo [lo que necesito]", "es todo por (hoy | ahora)",
    ] },
    more_yes: { patterns: ["(una cosa mas | otra cosa | otra pregunta | una pregunta mas)", "tengo (una pregunta | otra pregunta)", "(puedo | le puedo) (hacer | preguntar) (otra cosa | algo mas | una pregunta | otra pregunta)", "si tengo otra pregunta", "[no] (todavia | aun) no (es todo | termino)"] },
    // information
    ask_hours: { patterns: ["a que hora (cierran | abren) [ustedes] [hoy] #h:i_hours", "(cual es | que) (su | el) horario", "que horario tienen", "hasta que hora (estan abiertos | abren | atienden)", "(abren | estan abiertos) (el | los)? {day}", "cuando (cierran | abren) [ustedes]", "a que hora cierra (la oficina | esta oficina)"] },
    ask_place_hours: { patterns: ["a que hora (abre | cierra) {place}", "(esta | estara) abierto {place} [hoy | ahorita | el {day}]", "(que | cual es el) horario (tiene | de) {place}", "cuando (abre | cierra | se pone | es) {place}", "{place} (abre | esta abierto) (hoy | el {day} | los {day})", "que dia (es | se pone) {place}",
      // "¿A qué hora abre?" (it, not "abren" = you all): the place just talked about; with none, the office
      "a que hora (abre | cierra) [hoy | manana] #it", "(esta | estara) abierto [hoy | ahorita | manana | el {day} | los {day}] #it", "hasta que hora (abre | esta abierto) #it", "cuando (abre | cierra) #it", "(abre | cierra) (hoy | manana | el {day} | los {day}) #it"] },
    place_price: { patterns: [
      "cuanto (cuesta | vale | sale | cobran | es) (la entrada | entrar) (a | al | en | en el | de | del) {place}", "cuanto (cuesta | vale | sale | cobran) (en | en el)? {place}",
      "(es gratis | se paga | hay que pagar | cobran | se cobra) (la entrada)? (a | al | en | en el | de | del)? {place}", "(es gratis | se paga | cobran) (para)? entrar (a | al) {place}",
      "(hay que | tengo que | se tiene que) pagar (para entrar)? (a | al | en | en el) {place}", "{place} (es gratis | esta gratis | se paga | cuesta [algo] | tiene costo | cobra [la]? entrada)",
      "(la entrada | entrar) (a | al | de | del) {place} (es gratis | cuesta [algo] | se paga | tiene costo)", "(tiene | hay) (costo | que pagar) (la entrada)? (a | al | en | en el | de | del) {place}",
    ] },
    ask_events: { patterns: [
      "que hay (que hacer | de interesante) [@twk] #h:i_events", "(hay | tienen) (algun | algunos)? (evento | eventos | concierto | conciertos | fiesta | fiestas | musica | musica en vivo) [@twk]", "que (eventos | actividades) hay [@twk]",
      "que se puede hacer (@twk | aqui | en la noche)", "que hay (hoy | esta semana | este fin de semana | esta noche) [en el pueblo]", "(hay | que hay) algo (divertido | interesante) [@twk]", "que pasa (este fin de semana | esta semana)", "que hay para hacer @twk", "(hay | habra) musica [en vivo] @twk",
    ] },
    // (#cost: a how-much or must-I-pay question, answered without "Sí")
    event_free: { patterns: ["es gratis", "(cuesta | se paga) [algo] #cost", "cuanto cuesta [la entrada] #cost", "hay que pagar [entrada] #cost", "necesito (boleto | boletos) #cost", "es gratis la musica",
      "tiene (costo | algun costo) #cost", "cuanto (es | sale | cobran) [la entrada] #cost"] },
    event_time: { patterns: ["a que hora (es | empieza)", "cuando (es | empieza)", "a que hora empieza (la musica | el concierto)"] },
    ask_buspass: { patterns: [
      "(donde | en donde) (tomo | agarro | paso | se toma | subo) (el | un) colectivo #h:i_buspass", "(hay | pasa) (un)? colectivo [(a | al) {place}]", "como funciona el colectivo", "(donde | en donde) (esta | queda | pasa) (la parada del colectivo | el colectivo)",
      "cuanto (cuesta | sale | cobra) el colectivo #price", "(donde | en donde) (compro | venden | consigo) (boletos | el boleto | un boleto) [para el (camion | autobus | colectivo)] #ticket",
      "(venden | tienen) boletos [de camion | de autobus | para el (camion | autobus | colectivo)] #ticket", "cuanto (cuesta | sale) el (boleto | pasaje) #price", "(el colectivo | el pasaje) es caro #price", "es caro el colectivo #price",
      "(que | cual) colectivo (tomo | agarro | me lleva | va | me deja | sirve) (a | al | para) {place}",
      // colectivos have no timetable (s69: "pasan por la avenida cada rato")
      "a que hora (pasa | sale | pasan | salen) (el | un | los)? (colectivo | colectivos) #when", "cada cuanto (pasa | pasan | sale | salen) (el | los)? (colectivo | colectivos) #when",
      "(pasa | pasan) (seguido | muy seguido) (el | los)? (colectivo | colectivos) #when", "(el | los) (colectivo | colectivos) (pasa | pasan) (seguido | muy seguido | cada cuanto) #when",
      "(hay | tiene | tienen) [un] horario (del | de los | para el | para los) (colectivo | colectivos) #when", "(que | cual es el) horario (del | de los) (colectivo | colectivos) #when",
    ] },
    ask_busstop: { patterns: ["(donde | en donde) (esta | queda) la parada [del camion | del autobus | de autobus | de camiones]", "(donde | por donde) pasa el (camion | autobus)", "(donde | en donde) (tomo | agarro) el (camion | autobus)",
      "(que | cual) (camion | autobus) (va | me lleva) (a | al) {place} #which", "hay (camion | autobus) (a | al | para) {place} #which"] },
    ask_schedule: { patterns: ["(tiene | tienen | me da) [un] horario de (los)? (camiones | autobuses)", "a que hora pasa el (camion | autobus)", "(tienes | me das) [un] horario de (los)? (camiones | autobuses) #tip:tu_staff"] },
    ask_taxi: { patterns: [
      "(donde | en donde) (tomo | agarro | consigo | encuentro | hay | puedo tomar | puedo agarrar | se toma) (un | el)? taxi", "(donde | en donde) (esta | queda | hay) (el | un)? (sitio | sitio de taxis | parada de taxis)",
      "(hay | pasan) taxis [por aqui | aqui | en la avenida]", "necesito un taxi", "(me puede | puede | me podria | podria) (llamar | pedir) un taxi", "(quiero | quisiera) (tomar | agarrar) un taxi", "como (consigo | pido | tomo) un taxi",
    ] },
    where_music: { patterns: ["(donde | en donde) (es | va a ser | sera | hay | tocan | ponen) (la musica | el concierto | la musica en vivo | los conciertos)"] },
    ask_wifi: { patterns: ["(tienen | hay | tiene) (wifi | internet) [aqui | gratis] #h:i_wifi", "cual es la (contrasena | clave) del (wifi | internet)", "me (da | pasa) la (contrasena | clave) [del wifi]", "(puedo | me puedo) conectar al (wifi | internet)", "el wifi es gratis", "la (contrasena | clave) del wifi"] },
    ask_restroom: { patterns: ["(donde | en donde) (esta | queda) el bano #h:i_restroom", "(hay | tienen | tiene) (bano | banos) [publico | publicos]", "(puedo | me deja) (usar | pasar a) el bano", "(donde | en donde) (estan | quedan) los banos", "(donde | en donde) (esta | estan) (el servicio | los servicios | el aseo | los aseos | el sanitario | los sanitarios)"] },
    ask_brochure: { patterns: [
      "(tiene | tienen | hay) (folletos | informacion | algun folleto | un folleto) [del pueblo | de la zona | de {place} | sobre (el pueblo | la zona)]", "(me da | quisiera | necesito) (informacion | un folleto | folletos) [del pueblo | de la zona | de {place}]",
      "(busco | estoy buscando) (informacion | folletos)",
    ] },
    ask_recommend: { patterns: [
      "que me recomienda [ver | visitar | hacer | conocer] #h:i_recommend", "que (hay | puedo | se puede) (ver | visitar | hacer | conocer) (aqui | en el pueblo | por aqui | cerca | en la zona)", "que (lugares | cosas) (hay | me recomienda) [para (visitar | ver | conocer)]",
      "(tiene | tienes) (alguna | una) recomendacion", "que vale la pena (ver | visitar | conocer) [por aqui | en la zona]", "que es lo mas (bonito | interesante) [del pueblo | de aqui]", "(a donde | adonde) (puedo | deberia | me recomienda) ir",
      "que (sugiere | me sugiere)", "(me puede | puede | podria | me podria) recomendar (algo | un lugar | una playa | un cenote | algun lugar | algo para ver)", "(que | cual) (playa | cenote) me recomienda", "que lugares bonitos hay", "que hay para (ver | hacer) [aqui | por aqui]",
    ] },
    ask_food: { patterns: [
      "(donde | en donde) (puedo | se puede) comer [algo | bien] #h:i_food", "(donde | en donde) (puedo | se puede) (cenar | desayunar | almorzar | comer)", "(hay | conoce | me recomienda) (un | algun) [buen] (restaurante | lugar para comer) [@here_]", "(donde | en donde) (como | ceno | desayuno)",
      "tengo hambre", "(quiero | quisiera) comer [algo]", "(donde | en donde) (hay | venden) (tacos | comida)", "donde come la gente de aqui", "(me puede | puede) recomendar un restaurante", "(busco | estoy buscando | ando buscando) (un | algun) [buen] (restaurante | lugar para comer)",
    ] },
    ask_map_lang: { patterns: ["(tiene | tienen | hay) (el mapa | mapas | un mapa) en (ingles | frances | aleman | otro idioma | otros idiomas)", "el mapa (esta | viene) en ingles"] },
    // Saying yes or no to Don Chuy's offers in other words (a map, the way to the café)
    accept_ctx: { patterns: [
      "(me lo | lo) llevo", "(si)? me llevo uno", "(digame | expliqueme | dime #tip:tu_staff) [como llegar | el camino]", "(me gustaria | quisiera) saber (como llegar | el camino)",
      "(seria | me seria) (muy util | de mucha ayuda | genial)", "se lo agradeceria", "(tiene | tienes) razon", "me encanta el cafe",
    ] },
    decline_ctx: { patterns: [
      "no (lo | la)? (necesito | ocupo) [ahorita | ahora | por ahora | hoy]", "sin el estoy bien", "(tal vez | quizas | a lo mejor) (despues | mas tarde | otro dia | luego)", "(despues | mas tarde) (tal vez | quizas)",
      "(me voy | voy) caminando", "prefiero caminar", "ya no necesito (las indicaciones | el camino)",
      // "¿Ya conoce La Ceiba? ¿Le digo cómo llegar?" — "Sí, ya lo conozco" = no directions needed
      "[si | no] ya (lo | la) conozco", "[no] ya (se | conozco) (donde esta | donde queda | como llegar | el camino)",
    ] },
  },

  lines: {
    // --- greetings and openers ----------------------------------------------
    greet: [
      t("¡Hola, | hola! | ¡{m:Bienvenido|f:Bienvenida} | a | Puerto Colibrí! | ¿En | qué | le | puedo | ayudar?", "Hi, | hi! | Welcome | to | Puerto Colibrí! | In | what | (to) you | can I | help?", "Hi there! Welcome to Puerto Colibrí! How can I help you?"),
      t("¡Buenas! | ¡Pásele, | pásele! | ¿Qué | se le ofrece?", "Hi! | Come in, | come in! | What | can I do for you?", "Hi! Come on in! What can I do for you?",
        { flags: { 1: "Mexican: pásele = come in (a warm welcome to a shop or office)." }, neutral: t("¡Buenas! | ¡Adelante, | adelante! | ¿Qué | se le ofrece?", "Hi! | Come in, | come in! | What | can I do for you?", "Hi! Come on in! What can I do for you?") }),
      t("¡Hola! | ¿Qué | anda | buscando | hoy?", "Hi! | What | are you | looking for | today?", "Hi! What are you looking for today?",
        { flags: { 2: "andar + -ando: “to be (doing)”, very common in Mexico." } }),
    ],
    greet_map: [
      t("¡Hola! | Usted | tiene | cara | de | necesitar | un | mapa. | ¿Le | doy | uno?", "Hi! | You | have | the look | of | needing | a | map. | (To) you | should I give | one?", "Hi! You look like you need a map. Want one?"),
    ],
    greet_back: [
      t("¡Hola | otra vez! | Hoy | sí | le | hablo | despacito, | se lo | prometo.", "Hi | again! | Today | for sure | (to) you | I'll speak | nice and slow, | it to you | I-promise.", "Hi again! I'll talk slowly this time, I promise!",
        { flags: { 6: "despacito: “nice and slow” (a friendly diminutive of despacio)." } }),
    ],
    ask_need: [
      t("Bueno, | ¿en | qué | le | puedo | ayudar?", "So, | in | what | (to) you | can I | help?", "So, how can I help you?"),
      t("¿Qué | se le ofrece | hoy?", "What | can I do for you | today?", "What can I do for you today?"),
    ],
    need_help: [t("¡Claro! | Casi | todos | empiezan | con | un | mapa.", "Sure! | Almost | everybody | starts | with | a | map.", "Sure! Most people start with a map!")],

    // --- the map ------------------------------------------------------------
    offer_map: [
      t("¿Quiere | un | mapa | del | pueblo? | ¡Son | gratis!", "Do you want | a | map | of the | town? | They're | free!", "Would you like a map of the town? They're free!"),
      t("¿Le | doy | un | mapa? | Es | gratis.", "(To) you | should I give | a | map? | It's | free.", "Want a map? It's free."),
    ],
    map_give: [
      t("¡Con gusto! | Aquí | tiene | el | mapa. | Nosotros | estamos | aquí, | en | la | estrella | roja.", "Gladly! | Here | you have | the | map. | We | are | here, | at | the | star | red.", "Sure thing! Here's a map. We're right here, at the red star."),
      t("¡Aquí tiene! | Estamos | aquí, | en | la | avenida | Juárez.", "Here you go! | We are | here, | on | the | avenue | Juárez.", "Here you go! This is us, right here on Avenida Juárez.", { spell: "Juárez" }),
      t("¡Claro! | Aquí | tiene | un | mapa. | La | estrella | roja | somos | nosotros.", "Sure! | Here | you have | a | map. | The | star | red | is | us.", "You bet! Here's a map of the town. The red star is us."),
    ],
    map_here: [t("Estamos | aquí, | ¿ve | la | estrella | roja?", "We are | here, | do you see | the | star | red?", "We're right here, see the red star?")],
    map_free: [t("¡Sí, | es | gratis!", "Yes, | it's | free!", "Yep, totally free!")],
    map_free_cost: [t("¡Nada, | es | gratis!", "Nothing, | it's | free!", "Nothing, it's free!")],
    map_ok_no: [t("¡No hay problema! | Aquí | están | por si | cambia de opinión.", "No problem! | Here | they are | in case | you change your mind.", "No problem! They're right here if you change your mind.")],
    map_anyway: [t("Ah, | y | llévese | un | mapa | de todos modos. | ¡Es | gratis!", "Oh, | and | take | a | map | anyway. | It's | free!", "Oh, and take a map anyway. It's free!")],

    // --- where to? ----------------------------------------------------------
    ask_where: [
      t("Bueno, | ¿a | dónde | va?", "So, | to | where | are you going?", "So, where are you headed?"),
      t("¿Y | a | dónde | quiere | ir?", "And | to | where | do you want | to go?", "And where would you like to go?"),
      t("¿Busca | algún | lugar | en especial?", "Are you looking for | some | place | in particular?", "Anywhere in particular you want to go?"),
    ],
    suggest_cafe: [t("Pues | si | le gusta | el | café, | La Ceiba | tiene | el | mejor | café | del | pueblo.", "Well | if | you like | the | coffee, | La Ceiba | has | the | best | coffee | in the | town.", "Well, if you like coffee, La Ceiba has the best coffee in town.")],
    offer_directions: [t("¿Le | digo | cómo | llegar?", "(To) you | should I tell | how | to get there?", "Should I tell you how to get there?")],
    cafe_again: [t("Y | La Ceiba, | ¿le | digo | cómo | llegar?", "And | La Ceiba, | (to) you | should I tell | how | to get there?", "And La Ceiba? Should I tell you how to get there?")],
    oh_okay: [t("¡Ah, | bueno!", "Oh, | okay!", "Oh, okay!")],
    offer_cafe: [t("Ah, | ¿y | ya | conoce | La Ceiba? | ¡El | mejor | café | del | pueblo!", "Oh, | and | already | do you know | La Ceiba? | The | best | coffee | in the | town!", "Oh, and have you been to La Ceiba yet? Best coffee in town!")],
    welcome_new: [
      t("¡Ah, | {m:bienvenido|f:bienvenida}! | Le | va | a | encantar | el | pueblo.", "Oh, | welcome! | (To) you | it's going | to | delight | the | town.", "Oh, welcome! You're going to love it here."),
      // (no "¿Es su primera vez aquí?": it answers "Es mi primera vez" or "Me acabo de mudar", and nothing took its answer)
      t("¡{m:Bienvenido|f:Bienvenida} | al | pueblo! | ¡Va | a | ver | qué | bonito | es!", "Welcome | to the | town! | You're going | to | see | how | pretty | it is!", "Welcome to town! You'll see how pretty it is!"),
    ],
    speak_lang: [t("¡Uy, | inglés | muy | poquito! | Pero | le | hablo | despacio, | se lo | prometo.", "Oh, | English | very | little! | But | (to) you | I'll speak | slowly, | it to you | I-promise.", "Oh, just a tiny bit of English! But I'll speak slowly, I promise.")],
    yes_vc: [t("¡Sí, | aquí | es! | ¿En | qué | le | puedo | ayudar?", "Yes, | here | it is! | In | what | (to) you | can I | help?", "Yes, it is! How can I help?")],
    which_place: [t("Perdón, | ¿a | dónde | quiere | ir?", "Sorry, | to | where | do you want | to go?", "Sorry, where do you want to go?")],
    unknown_place: [t("Mmm, | perdón, | ese | lugar | no lo conozco.", "Hmm, | sorry, | that | place | I don't know it.", "Hmm, sorry, I don't know that place.")],

    // --- routes: fast (Don Chuy's style) and clear (after "más despacio") --------
    r_sunny_cup: [
      t("¿La Ceiba? | ¡Fácil! | Saliendo, | a la derecha, | se va | derechito | dos | cuadras | hasta | el | banco, | ahí | da vuelta | a la izquierda | y | lo | ve | a mano derecha.",
        "La Ceiba? | Easy! | Going out, | to the right, | you go | straight ahead | two | blocks | to | the | bank, | there | you turn | to the left | and | it | you-see | on the right-hand side.",
        "La Ceiba? Easy! Go right out the door, straight two blocks to the bank, hang a left there, and it's on your right.",
        { flags: { 5: "derechito: “straight ahead”, a friendly diminutive of derecho.", 15: "lo: it (el café)." }, spell: "Ceiba", write: W_CAFE }),
      t("¡Buena | elección! | A la derecha | al | salir, | dos | cuadras | hasta | el | banco, | luego | a la izquierda. | Está | a la derecha, | enfrente de | Correos.",
        "Good | choice! | To the right | upon | leaving, | two | blocks | to | the | bank, | then | to the left. | It's | on the right, | across from | the post office.",
        "Great choice! Right out the door, two blocks to the bank, then left. It's on the right, across from the post office.",
        { spell: "Ceiba", write: W_CAFE }),
    ],
    r_sunny_cup_slow: [
      t("Bueno. | Al | salir, | dé vuelta | a la derecha. | Siga | derecho | dos | cuadras, | hasta | el | banco. | En | el | banco, | dé vuelta | a la izquierda, | en | la | calle | Ceiba. | El | café | está | a la derecha, | enfrente de | Correos.",
        "Okay. | Upon | leaving, | turn | to the right. | Keep going | straight | two | blocks, | to | the | bank. | At | the | bank, | turn | to the left, | onto | the | street | Ceiba. | The | café | is | on the right, | across from | the post office.",
        "Okay. Turn right out the door. Go straight two blocks, to the bank. At the bank, turn left, onto Calle Ceiba. The café is on the right, across from the post office.",
        { spell: "Ceiba", write: W_CAFE }),
    ],
    r_post_office: [t("¿Correos? | Saliendo, | a la derecha, | dos | cuadras | hasta | el | banco, | da vuelta | a la izquierda | y | está | a mano izquierda.",
      "The post office? | Going out, | to the right, | two | blocks | to | the | bank, | you turn | to the left | and | it's | on the left-hand side.",
      "The post office? Right out the door, two blocks to the bank, turn left, and it's on your left.", { write: W.post_office })],
    r_post_office_slow: [t("Bueno. | Al | salir, | a la derecha. | Siga | derecho | dos | cuadras, | hasta | el | banco. | Ahí, | a la izquierda. | Correos | está | a la izquierda, | enfrente del | café | La Ceiba.",
      "Okay. | Upon | leaving, | to the right. | Keep going | straight | two | blocks, | to | the | bank. | There, | to the left. | The post office | is | on the left, | across from the | café | La Ceiba.",
      "Okay. Right out the door. Go straight two blocks, to the bank. Turn left there. The post office is on the left, across from Café La Ceiba.", { spell: "Ceiba", write: W.post_office })],
    r_market: [t("¿El | mercado? | A la derecha, | hasta | el | banco, | ahí | a la izquierda | y | lo | ve | a mano izquierda, | pasando | Correos.",
      "The | market? | To the right, | to | the | bank, | there | to the left | and | it | you-see | on the left-hand side, | past | the post office.",
      "The market? Right to the bank, left there, and you'll see it on your left, past the post office.", { write: W.market })],
    r_market_slow: [t("Bueno. | Al | salir, | a la derecha, | dos | cuadras, | hasta | el | banco. | En | el | banco, | a la izquierda. | El | mercado | está | a la izquierda, | después de | Correos.",
      "Okay. | Upon | leaving, | to the right, | two | blocks, | to | the | bank. | At | the | bank, | to the left. | The | market | is | on the left, | after | the post office.",
      "Okay. Right out the door, two blocks, to the bank. At the bank, turn left. The market is on the left, past the post office.", { spell: "Ceiba", write: W.market })],
    r_taqueria: [t("¿La | taquería? | Está | junto al | mercado. | Saliendo, | a la derecha, | hasta | el | banco, | ahí | a la izquierda, | pasando | Correos.",
      "The | taco place? | It's | next to the | market. | Going out, | to the right, | to | the | bank, | there | to the left, | past | the post office.",
      "The taco place? It's next to the market. Right out the door to the bank, left there, past the post office.", { write: W.taqueria })],
    r_taqueria_slow: [t("Bueno. | Al | salir, | a la derecha, | dos | cuadras, | hasta | el | banco. | En | el | banco, | a la izquierda. | La | taquería | está | a la izquierda, | junto al | mercado.",
      "Okay. | Upon | leaving, | to the right, | two | blocks, | to | the | bank. | At | the | bank, | to the left. | The | taco place | is | on the left, | next to the | market.",
      "Okay. Right out the door, two blocks, to the bank. At the bank, turn left. The taco place is on the left, next to the market.", { spell: "Ceiba", write: W.taqueria })],
    r_bank: [t("¿El | banco? | ¡Fácil! | Saliendo, | a la derecha | y | derechito | dos | cuadras. | Es | el | edificio | grande | de | la | esquina.",
      "The | bank? | Easy! | Going out, | to the right | and | straight ahead | two | blocks. | It's | the | building | big | on | the | corner.",
      "The bank? Easy! Right out the door and straight two blocks. It's the big building on the corner.", { write: W.bank })],
    r_bank_slow: [t("Bueno. | Al | salir, | a la derecha. | Siga | derecho | dos | cuadras. | El | banco | está | a la derecha, | en | la | esquina.",
      "Okay. | Upon | leaving, | to the right. | Keep going | straight | two | blocks. | The | bank | is | on the right, | on | the | corner.",
      "Okay. Right out the door. Go straight two blocks. The bank is on the right, on the corner.", { write: W.bank })],
    r_pharmacy: [t("¿La | farmacia? | Saliendo, | a la derecha, | a | una | cuadra, | junto a | la | estética.",
      "The | pharmacy? | Going out, | to the right, | at | one | block, | next to | the | hair salon.",
      "The pharmacy? Right out the door, one block down, next to the hair salon.", { write: W.pharmacy })],
    r_pharmacy_slow: [t("Bueno. | Al | salir, | a la derecha. | Camine | una | cuadra. | La | farmacia | está | a la derecha, | junto a | la | estética.",
      "Okay. | Upon | leaving, | to the right. | Walk | one | block. | The | pharmacy | is | on the right, | next to | the | hair salon.",
      "Okay. Right out the door. Walk one block. The pharmacy is on the right, next to the hair salon.", { write: W.pharmacy })],
    r_salon: [t("¿La | estética? | Saliendo, | a la derecha, | a | una | cuadra, | junto a | la | farmacia.",
      "The | hair salon? | Going out, | to the right, | at | one | block, | next to | the | pharmacy.",
      "The hair salon? Right out the door, one block down, next to the pharmacy.", { flags: { 1: "estética: in Mexico, a hair salon." }, write: W.salon })],
    r_salon_slow: [t("Bueno. | Al | salir, | a la derecha. | Camine | una | cuadra. | La | estética | Tijeras | está | a la derecha, | junto a | la | farmacia.",
      "Okay. | Upon | leaving, | to the right. | Walk | one | block. | The | salon | Tijeras | is | on the right, | next to | the | pharmacy.",
      "Okay. Right out the door. Walk one block. Tijeras salon is on the right, next to the pharmacy.", { spell: "Tijeras", write: W.salon })],
    r_hotel: [t("¿El | Mar Azul? | ¡Está | aquí | al lado! | Saliendo, | a la derecha, | el | edificio | grande.",
      "The | Mar Azul? | It's | here | next door! | Going out, | to the right, | the | building | big.",
      "The Mar Azul? It's right next door! Right out the door, the big building.", { write: W.hotel })],
    r_hotel_slow: [t("Bueno. | El | hotel | está | aquí | al lado, | a la derecha | al | salir.",
      "Okay. | The | hotel | is | here | next door, | to the right | upon | leaving.",
      "Okay. The hotel is right next door, on the right as you go out.", { write: W.hotel })],
    r_station: [t("¿La | terminal? | Saliendo, | a la derecha, | dos | cuadras | hasta | el | banco, | da vuelta | a la izquierda | y | sigue | derecho | por | la | calle | Ceiba.",
      "The | bus station? | Going out, | to the right, | two | blocks | to | the | bank, | you turn | to the left | and | you keep going | straight | along | the | street | Ceiba.",
      "The bus station? Right out the door, two blocks to the bank, turn left, and keep going straight down Calle Ceiba.", { spell: "Ceiba", write: W.station })],
    r_station_slow: [t("Bueno. | Al | salir, | a la derecha. | Siga | derecho | dos | cuadras, | hasta | el | banco. | Ahí, | a la izquierda, | en | la | calle | Ceiba. | La | terminal | está | al | final | de | la | calle.",
      "Okay. | Upon | leaving, | to the right. | Keep going | straight | two | blocks, | to | the | bank. | There, | to the left, | onto | the | street | Ceiba. | The | bus station | is | at the | end | of | the | street.",
      "Okay. Right out the door. Go straight two blocks, to the bank. Turn left there, onto Calle Ceiba. The bus station is at the end of the street.", { spell: "Ceiba", write: W.station })],
    r_trattoria: [t("¿La Cocina de Lucía? | Saliendo, | a la izquierda, | una | cuadra, | la | del | toldo | rojo, | a mano izquierda.",
      "La Cocina de Lucía? | Going out, | to the left, | one | block, | the one | with the | awning | red, | on the left-hand side.",
      "La Cocina de Lucía? Left out the door, one block, the one with the red awning, on your left.", { write: W.trattoria })],
    r_trattoria_slow: [t("Bueno. | Al | salir, | a la izquierda. | Camine | una | cuadra. | La Cocina de Lucía | está | a la izquierda, | enfrente de | la | boutique | Hilos.",
      "Okay. | Upon | leaving, | to the left. | Walk | one | block. | La Cocina de Lucía | is | on the left, | across from | the | boutique | Hilos.",
      "Okay. Left out the door. Walk one block. La Cocina de Lucía is on the left, across from the Hilos boutique.", { write: W.trattoria })],
    r_threads: [t("¿La | boutique | Hilos? | Saliendo, | a la izquierda, | una | cuadra, | a mano derecha, | enfrente de | La Cocina de Lucía.",
      "The | boutique | Hilos? | Going out, | to the left, | one | block, | on the right-hand side, | across from | La Cocina de Lucía.",
      "The Hilos boutique? Left out the door, one block, on your right, across from La Cocina de Lucía.", { write: W.threads })],
    r_threads_slow: [t("Bueno. | Al | salir, | a la izquierda. | Camine | una | cuadra. | La | boutique | está | a la derecha, | enfrente de | La Cocina de Lucía.",
      "Okay. | Upon | leaving, | to the left. | Walk | one | block. | The | boutique | is | on the right, | across from | La Cocina de Lucía.",
      "Okay. Left out the door. Walk one block. The boutique is on the right, across from La Cocina de Lucía.", { write: W.threads })],
    r_square: [t("¿El | zócalo? | ¡Fácil! | Saliendo, | a la izquierda, | derechito | dos | cuadras. | Es | la | plaza | grande | con | el | kiosco.",
      "The | main square? | Easy! | Going out, | to the left, | straight ahead | two | blocks. | It's | the | square | big | with | the | bandstand.",
      "The main square? Easy! Left out the door, straight two blocks. It's the big square with the bandstand.",
      { flags: { 1: "zócalo: in Mexico, a town's main square." }, write: W.square })],
    r_square_slow: [t("Bueno. | Al | salir, | a la izquierda. | Siga | derecho | dos | cuadras. | El | zócalo | está | a la derecha.",
      "Okay. | Upon | leaving, | to the left. | Keep going | straight | two | blocks. | The | main square | is | on the right.",
      "Okay. Left out the door. Go straight two blocks. The main square is on the right.", { write: W.square })],
    r_tianguis: [t("¿El | tianguis? | Es | en | el | zócalo, | los | sábados. | Saliendo, | a la izquierda, | dos | cuadras.",
      "The | street market? | It's | in | the | main square, | on | Saturdays. | Going out, | to the left, | two | blocks.",
      "The street market? It's in the main square, on Saturdays. Left out the door, two blocks.",
      { flags: { 1: "Mexican: tianguis = an open-air street market held on a set day.", 6: "los before a weekday = on (every) …" }, write: W.tianguis,
        neutral: t("¿El | mercado | de | los | sábados? | Es | en | el | zócalo. | Saliendo, | a la izquierda, | dos | cuadras.", "The | market | of | the | Saturdays? | It's | in | the | main square. | Going out, | to the left, | two | blocks.", "The Saturday market? It's in the main square. Left out the door, two blocks.") })],
    r_tianguis_slow: [t("Bueno. | Al | salir, | a la izquierda. | Siga | derecho | dos | cuadras. | El | tianguis | se pone | en | el | zócalo, | a la derecha.",
      "Okay. | Upon | leaving, | to the left. | Keep going | straight | two | blocks. | The | street market | is set up | in | the | main square, | on the right.",
      "Okay. Left out the door. Go straight two blocks. The street market is set up in the main square, on the right.",
      { flags: { 9: "Mexican: tianguis = an open-air street market held on a set day." }, write: W.tianguis,
        neutral: t("Bueno. | Al | salir, | a la izquierda. | Siga | derecho | dos | cuadras. | El | mercado | se pone | en | el | zócalo, | a la derecha.", "Okay. | Upon | leaving, | to the left. | Keep going | straight | two | blocks. | The | market | is set up | in | the | main square, | on the right.", "Okay. Left out the door. Go straight two blocks. The market is set up in the main square, on the right.") })],
    r_museum: [t("¿El | museo? | ¡Claro! | Saliendo, | a la izquierda | y | derechito | dos | cuadras. | Es | el | edificio | grande | y | blanco, | a mano izquierda.",
      "The | museum? | Sure! | Going out, | to the left | and | straight ahead | two | blocks. | It's | the | building | big | and | white, | on the left-hand side.",
      "The museum? Sure! Left out the door and straight two blocks. It's the big white building on your left.", { write: W.museum })],
    r_museum_slow: [t("Bueno. | Al | salir, | a la izquierda. | Siga | derecho | dos | cuadras, | hasta | el | zócalo. | El | museo | está | a la izquierda, | enfrente del | zócalo.",
      "Okay. | Upon | leaving, | to the left. | Keep going | straight | two | blocks, | to | the | main square. | The | museum | is | on the left, | across from the | main square.",
      "Okay. Left out the door. Go straight two blocks, to the main square. The museum is on the left, across from the square.", { write: W.museum })],
    r_police: [t("¿La | policía? | Saliendo, | a la izquierda, | dos | cuadras, | junto al | museo.",
      "The | police? | Going out, | to the left, | two | blocks, | next to the | museum.",
      "The police station? Left out the door, two blocks, next to the museum.", { write: W.police })],
    r_police_slow: [t("Bueno. | Al | salir, | a la izquierda. | Siga | derecho | dos | cuadras. | La | policía | está | a la izquierda, | junto al | museo.",
      "Okay. | Upon | leaving, | to the left. | Keep going | straight | two | blocks. | The | police station | is | on the left, | next to the | museum.",
      "Okay. Left out the door. Go straight two blocks. The police station is on the left, next to the museum.", { write: W.police })],
    r_beach: [t("¿La | playa? | ¡Fácil! | Saliendo, | a la izquierda, | hasta | el | zócalo, | ahí | da vuelta | a la derecha | y | bajando | la | calle | llega | al | mar.",
      "The | beach? | Easy! | Going out, | to the left, | to | the | main square, | there | you turn | to the right | and | going down | the | street | you-reach | the | sea.",
      "The beach? Easy! Left out the door to the main square, turn right there, and just follow the street down to the sea.", { write: W.beach })],
    r_beach_slow: [t("Bueno. | Al | salir, | a la izquierda. | Siga | derecho | dos | cuadras, | hasta | el | zócalo. | En | el | zócalo, | dé vuelta | a la derecha, | en | la | calle | Itzamná. | La | playa | está | al | final.",
      "Okay. | Upon | leaving, | to the left. | Keep going | straight | two | blocks, | to | the | main square. | At | the | main square, | turn | to the right, | onto | the | street | Itzamná. | The | beach | is | at the | end.",
      "Okay. Left out the door. Go straight two blocks, to the main square. At the square, turn right, onto Calle Itzamná. The beach is at the end.", { spell: "Itzamná", write: W.beach })],
    r_pier: [t("¿El Muelle? | Saliendo, | a la izquierda | hasta | el | zócalo, | ahí | a la derecha | y | lo | ve | junto al | mar.",
      "El Muelle? | Going out, | to the left | to | the | main square, | there | to the right | and | it | you-see | next to the | sea.",
      "El Muelle? Left out the door to the main square, right there, and you'll see it by the sea.", { write: W.pier })],
    r_pier_slow: [t("Bueno. | Al | salir, | a la izquierda, | dos | cuadras, | hasta | el | zócalo. | Ahí, | a la derecha, | en | la | calle | Itzamná. | El | restaurante | está | junto al | mar.",
      "Okay. | Upon | leaving, | to the left, | two | blocks, | to | the | main square. | There, | to the right, | onto | the | street | Itzamná. | The | restaurant | is | next to the | sea.",
      "Okay. Left out the door, two blocks, to the main square. Turn right there, onto Calle Itzamná. The restaurant is by the sea.", { spell: "Itzamná", write: W.pier })],
    r_lighthouse: [t("¿El | faro? | Uy, | está | lejos. | A la izquierda | hasta | el | zócalo, | a la derecha | hasta | el | mar | y | luego | todo | el | malecón.",
      "The | lighthouse? | Oh, | it's | far. | To the left | to | the | main square, | to the right | to | the | sea | and | then | all | the | seafront.",
      "The lighthouse? Oh, that's far. Left to the main square, right down to the sea, and then all the way along the seafront.", { write: W.lighthouse })],
    r_lighthouse_slow: [t("Bueno. | Al | salir, | a la izquierda, | hasta | el | zócalo. | Ahí, | a la derecha, | hasta | el | mar. | Luego | camine | por | el | malecón | hasta | el | final.",
      "Okay. | Upon | leaving, | to the left, | to | the | main square. | There, | to the right, | to | the | sea. | Then | walk | along | the | seafront | to | the | end.",
      "Okay. Left out the door, to the main square. Turn right there, down to the sea. Then walk along the seafront to the very end.", { write: W.lighthouse })],

    // --- places outside town: by colectivo -----------------------------------
    // twenty minutes, as in s69 and TOWN.md (Cenote Ka'an)
    trip_cenote: [t("¿El | cenote? | Está | a | veinte | minutos | en | colectivo. | El | colectivo | pasa | aquí | enfrente, | en | la | avenida.",
      "The | cenote? | It's | at | twenty | minutes | by | shared van. | The | shared van | passes | here | in front, | on | the | avenue.",
      "The cenote? It's twenty minutes away by colectivo. The colectivo stops right out front, on the avenue.",
      { flags: { 7: "colectivo: a shared van that runs along the coast; you pay the driver." }, write: "Cenote: en colectivo, 20 minutos · se toma en la avenida Juárez" })],
    trip_ruins: [t("¿Las | ruinas | de | Tulum? | Están | a | media hora | en | colectivo. | ¡Vaya | temprano, | que | hace | mucho | calor!",
      "The | ruins | of | Tulum? | They're | at | half an hour | by | shared van. | Go | early, | because | it-makes | a lot of | heat!",
      "The ruins at Tulum? They're half an hour away by colectivo. Go early, it gets really hot!", { spell: "Tulum", write: "Ruinas de Tulum: en colectivo, media hora · ¡temprano!" })],
    trip_xcacel: [t("¿Xcacel? | Es | una | playa | muy | bonita, | sin | hoteles. | Ahí | llegan | las | tortugas | en | el | verano. | Se va | en | colectivo.",
      "Xcacel? | It's | a | beach | very | pretty, | without | hotels. | There | arrive | the | turtles | in | the | summer. | You go | by | shared van.",
      "Xcacel? It's a beautiful beach with no hotels. The turtles come there in the summer. You get there by colectivo.",
      { flags: { 0: "Maya name: x sounds like English sh (shka-SEL)." }, spell: "Xcacel", write: "Xcacel (playa de las tortugas): en colectivo" })],
    trip_chemuyil: [t("¿Chemuyil? | Es | un | pueblito | con | una | playa | tranquila. | Pídale | al | chofer | del | colectivo | que | {m:lo|f:la} | baje | ahí.",
      "Chemuyil? | It's | a | little town | with | a | beach | quiet. | Ask | the | driver | of the | shared van | that | you | he-lets-off | there.",
      "Chemuyil? It's a little town with a quiet beach. Ask the colectivo driver to drop you off there.",
      { flags: { 14: "lo / la: “you” (usted), lo for a man and la for a woman." }, spell: "Chemuyil", write: "Chemuyil: en colectivo · pídale al chofer que lo baje ahí" })],

    // --- partial answers --------------------------------------------------------
    out_right: [t("A la derecha | al | salir.", "To the right | upon | leaving.", "Right out the door.")],
    out_left: [t("A la izquierda | al | salir.", "To the left | upon | leaving.", "Left out the door.")],
    then_bank: [t("Luego, | en | el | banco, | a la izquierda.", "Then, | at | the | bank, | to the left.", "Then left at the bank.")],
    then_square: [t("Luego, | en | el | zócalo, | a la derecha.", "Then, | at | the | main square, | to the right.", "Then right at the main square.")],
    turn_bank: [t("En | el | banco, | a la izquierda.", "At | the | bank, | to the left.", "Left at the bank.")],
    turn_square: [t("En | el | zócalo, | a la derecha.", "At | the | main square, | to the right.", "Right at the main square.")],
    at_bank: [t("En | el | banco. | Es | el | edificio | grande | de | la | esquina.", "At | the | bank. | It's | the | building | big | on | the | corner.", "At the bank. The big building on the corner.")],
    at_square: [t("En | el | zócalo, | la | plaza | grande | con | el | kiosco.", "At | the | main square, | the | square | big | with | the | bandstand.", "At the main square, the big square with the bandstand.")],
    yes_across_post_office: [t("Sí, | justo | enfrente de | Correos.", "Yes, | right | across from | the post office.", "Yes, right across from the post office.")],
    yes_across_sunny_cup: [t("Sí, | justo | enfrente del | café.", "Yes, | right | across from the | café.", "Yes, right across from the café.")],
    yes_across_threads: [t("Sí, | justo | enfrente de | la | boutique.", "Yes, | right | across from | the | boutique.", "Yes, right across from the boutique.")],
    yes_across_trattoria: [t("Sí, | justo | enfrente de | La Cocina de Lucía.", "Yes, | right | across from | La Cocina de Lucía.", "Yes, right across from La Cocina de Lucía.")],
    yes_across_square: [t("Sí, | justo | enfrente del | zócalo.", "Yes, | right | across from the | main square.", "Yes, right across from the main square.")],
    yes_next_salon: [t("Sí, | justo | junto a | la | estética.", "Yes, | right | next to | the | hair salon.", "Yes, right next to the hair salon.")],
    yes_next_pharmacy: [t("Sí, | justo | junto a | la | farmacia.", "Yes, | right | next to | the | pharmacy.", "Yes, right next to the pharmacy.")],
    yes_next_museum: [t("Sí, | justo | junto al | museo.", "Yes, | right | next to the | museum.", "Yes, right next to the museum.")],
    yes_next_market: [t("Sí, | justo | junto al | mercado.", "Yes, | right | next to the | market.", "Yes, right next to the market.")],
    straight_only: [t("No hay que | dar vuelta. | ¡Solo | siga | derecho!", "You don't need to | turn. | Just | keep going | straight!", "No more turns. Just go straight!")],
    side_right: [t("A la derecha.", "On the right.", "On the right.")],
    side_left: [t("A la izquierda.", "On the left.", "On the left.")],
    side_end: [t("Está | al | final | de | la | calle. | ¡No tiene pierde!", "It's | at the | end | of | the | street. | You can't miss it!", "It's right at the end of the street. You can't miss it!")],
    blocks_0: [t("¡Está | aquí | al lado!", "It's | here | next door!", "It's right next door!")],
    blocks_1: [t("Nada más | una | cuadra.", "Just | one | block.", "Just one block.")],
    blocks_2: [t("Dos | cuadras.", "Two | blocks.", "Two blocks.")],
    street_juarez: [t("Está | en | la | avenida | Juárez.", "It's | on | the | avenue | Juárez.", "It's on Avenida Juárez.", { spell: "Juárez" })],
    street_ceiba: [t("Está | en | la | calle | Ceiba.", "It's | on | the | street | Ceiba.", "It's on Calle Ceiba.", { spell: "Ceiba" })],
    street_itzamna: [t("Está | en | la | calle | Itzamná.", "It's | on | the | street | Itzamná.", "It's on Calle Itzamná.", { flags: { 4: "A Maya name (the Maya sky god): i-te-zeta-a-eme-ene-a." }, spell: "Itzamná" })],
    far_1: [t("¡Está | cerquita! | A | un | minuto.", "It's | really close! | At | one | minute.", "It's super close. Just a minute away.")],
    far_2: [t("¡Para nada! | Son | como | dos | minutos | caminando.", "Not at all! | It's | about | two | minutes | walking.", "Not at all! It's about two minutes on foot.")],
    far_5: [t("No, | son | unos | cinco | minutos | a pie.", "No, | it's | some | five | minutes | on foot.", "No, it's about five minutes on foot.")],
    far_10: [t("No | mucho. | Unos | diez | minutos | caminando.", "Not | much. | Some | ten | minutes | walking.", "Not really. About ten minutes on foot.")],
    far_15: [t("Un | poco. | Unos | quince | minutos | a pie. | También | puede | tomar | un | taxi.", "A | little. | Some | fifteen | minutes | on foot. | Also | you can | take | a | taxi.", "A little. About fifteen minutes on foot. You can take a taxi, too.")],
    far_30: [t("Sí, | está | lejos: | como | media hora | caminando. | ¡Pero | es | un | paseo | precioso!", "Yes, | it's | far: | about | half an hour | walking. | But | it's | a | walk | beautiful!", "Yes, it's pretty far, about half an hour on foot. But it's a beautiful walk!")],
    size_little_yes: [t("Sí, | el | chiquito, | el | de | la | puerta | amarilla.", "Yes, | the | little one, | the one | with | the | door | yellow.", "Yes, the little one with the yellow door.")],
    size_little_no: [t("No, | el | chiquito, | ¡a la derecha!", "No, | the | little one, | on the right!", "No, the little one, on the right!")],
    size_big_yes: [t("Sí, | el | grande. | ¡No tiene pierde!", "Yes, | the | big one. | You can't miss it!", "Yes, the big one. You can't miss it!")],
    size_big_no: [t("No, | ¡el | grande! | Es | enorme.", "No, | the | big one! | It's | huge.", "No, the big one! It's huge.")],
    size_only: [t("No se preocupe, | ¡nada más | hay | uno!", "Don't worry, | only | there is | one!", "Don't worry, there's only one!")],
    show_map: [t("¡Claro! | Se lo | marco | en | su | mapa. | Aquí | estamos | nosotros, | y | aquí | está.", "Sure! | It for you | I'll mark | on | your | map. | Here | are | we, | and | here | it is.", "Sure! I'll mark it on your map. Here we are, and here it is.")],

    // --- checking understanding ---------------------------------------------
    confirm_ask: [
      t("¿Me | entendió?", "(Me) | did you understand?", "Did you get all that?"),
      t("¿Me explico?", "Am I making sense?", "Does that make sense?"),
      t("¿Todo | claro?", "All | clear?", "All clear?"),
    ],
    confirm_again: [
      t("¿Sí?", "Yes?", "Okay?"),
      t("¿Todo | bien?", "All | good?", "All good?"),
      t("¿Le | quedó | claro?", "(To) you | it-was-left | clear?", "Is that clear?"),
    ],
    confirm_after_slow: [
      t("¿Ahora | sí?", "Now | yes?", "Got it now?"),
      t("¿Así | mejor?", "Like this | better?", "Better?"),
    ],
    confirm_ok: [
      t("¡Exacto! | ¡Ya | lo | tiene!", "Exactly! | Now | it | you-have!", "Exactly! You got it!"),
      t("¡Así es! | Perfecto.", "That's right! | Perfect.", "That's exactly right!"),
      t("¡Lo | entendió! | ¿Ve? | Facilito.", "It | you-understood! | See? | Super easy.", "You got it! See? Easy."),
    ],
    ack_great: [t("¡Muy | bien!", "Very | good!", "Great!"), t("¡Perfecto!", "Perfect!", "Perfect!"), t("¡Excelente!", "Excellent!", "Awesome!")],
    quiz_out: [t("¡Muy | bien! | A ver, | una | pregunta: | al | salir, | ¿a la derecha | o | a la izquierda?", "Very | good! | Let's see, | a | question: | upon | leaving, | to the right | or | to the left?", "Great! Quick quiz: left or right out the door?")],
    quiz_bank: [t("¡Muy | bien! | A ver, | una | pregunta: | en | el | banco, | ¿para | dónde | da vuelta?", "Very | good! | Let's see, | a | question: | at | the | bank, | toward | where | do you turn?", "Great! Quick quiz: which way do you turn at the bank?")],
    quiz_square: [t("¡Muy | bien! | A ver, | una | pregunta: | en | el | zócalo, | ¿para | dónde | da vuelta?", "Very | good! | Let's see, | a | question: | at | the | main square, | toward | where | do you turn?", "Great! Quick quiz: which way do you turn at the main square?")],
    straight_not: [t("Derecho | es | sin | dar vuelta. | ¿A la derecha | o | a la izquierda?", "Straight | is | without | turning. | To the right | or | to the left?", "Derecho means straight ahead. Left or right?",
      { flags: { 0: "derecho = straight ahead; derecha = right. Easy to mix up!" } })],
    quiz_again: [t("¿A la derecha | o | a la izquierda?", "To the right | or | to the left?", "Left or right?")],
    fix_out_right: [t("¡Casi! | A la derecha | al | salir, | no | a la izquierda.", "Almost! | To the right | upon | leaving, | not | to the left.", "Almost! Right out the door, not left.")],
    fix_out_left: [t("¡Casi! | A la izquierda | al | salir, | no | a la derecha.", "Almost! | To the left | upon | leaving, | not | to the right.", "Almost! Left out the door, not right.")],
    fix_turn_bank: [t("¡Casi! | En | el | banco | a la izquierda, | no | a la derecha.", "Almost! | At | the | bank | to the left, | not | to the right.", "Close! Left at the bank, not right.")],
    fix_turn_square: [t("¡Casi! | En | el | zócalo | a la derecha, | no | a la izquierda.", "Almost! | At | the | main square | to the right, | not | to the left.", "Close! Right at the main square, not left.")],
    fix_at_bank: [t("No | exactamente. | Da vuelta | en | el | banco.", "Not | exactly. | You turn | at | the | bank.", "Not quite. You turn at the bank.")],
    fix_at_square: [t("No | exactamente. | Da vuelta | en | el | zócalo.", "Not | exactly. | You turn | at | the | main square.", "Not quite. You turn at the main square.")],
    fix_noturn: [t("En realidad | ahí | no hay que | dar vuelta. | ¡Siga | derecho!", "Actually | there | you don't need to | turn. | Keep going | straight!", "Actually, there are no turns there. Just go straight!")],
    fix_blocks_0: [t("En realidad | está | aquí | al lado.", "Actually | it's | here | next door.", "Actually, it's right next door!")],
    fix_blocks_1: [t("No | exactamente. | Nada más | una | cuadra.", "Not | exactly. | Just | one | block.", "Not quite. Just one block.")],
    fix_blocks_2: [t("No | exactamente. | Son | dos | cuadras.", "Not | exactly. | It's | two | blocks.", "Not quite. Two blocks.")],
    fix_side_right: [t("¡Casi! | Está | a la derecha, | no | a la izquierda.", "Almost! | It's | on the right, | not | on the left.", "Almost! It's on the right, not the left.")],
    fix_side_left: [t("¡Casi! | Está | a la izquierda, | no | a la derecha.", "Almost! | It's | on the left, | not | on the right.", "Almost! It's on the left, not the right.")],
    fix_generic: [t("Mmm, | no | exactamente. | Se lo | repito | despacio.", "Hmm, | not | exactly. | It to you | I'll repeat | slowly.", "Hmm, not exactly. Let me say it again, slowly.")],
    recheck: [
      t("¿Ahora | sí | quedó claro?", "Now | for sure | is it clear?", "Okay? Got it now?"),
      t("¿Sí?", "Yes?", "Okay?"),
    ],

    // --- Don Chuy's reactions to clarification requests ------------------------
    slow_intro: [
      t("¡Ay, | perdón! | Todos | me | dicen | que | hablo | muy | rápido.", "Oh, | sorry! | Everybody | (to) me | tells | that | I-speak | very | fast.", "Oh, sorry! Everybody tells me I talk too fast."),
      t("¡Uy! | Perdón, | voy | más despacio.", "Oops! | Sorry, | I'll go | more slowly.", "Oops! Sorry, I'll slow down."),
      t("¡Perdón! | Mi | esposa | dice | que | hablo | como | perico.", "Sorry! | My | wife | says | that | I-speak | like | a parrot.", "Sorry! My wife says I talk like a parrot!",
        { flags: { 7: "hablar como perico: to talk nonstop (perico = parakeet, parrot)." } }),
    ],
    repeat_fast_again: [t("Ay, | ¿otra vez | hablé | muy | rápido? | ¡Perdón! | Ahora | sí, | despacito.", "Oh, | again | did I speak | very | fast? | Sorry! | Now | for real, | nice and slow.", "Oh, am I talking too fast again? Sorry! Let me slow down.")],
    learning: [t("¡Pero | habla | muy | bien! | Le | hablo | más despacio, | se lo | prometo.", "But | you-speak | very | well! | (To) you | I'll speak | more slowly, | it to you | I-promise.", "Oh, your Spanish is great! I'll slow down, I promise.")],
    dont_understand: [t("¡Perdón! | Se lo | digo | otra vez, | despacio.", "Sorry! | It to you | I'll say | again, | slowly.", "Sorry! Let me try that again, slowly.")],
    say_again_slow: [t("¡Claro! | Se lo | repito | con calma | y | despacito.", "Sure! | It to you | I'll repeat | calmly | and | nice and slow.", "No problem! Let me say it again, nice and slow.")],
    louder: [t("¡Ay, | perdón! | ¿Así | está | mejor?", "Oh, | sorry! | Like this | is it | better?", "Oh, sorry! Is this better?")],
    thanks_patience: [t("¡No, | al contrario! | Ya | sé | que | hablo | rapidísimo.", "No, | on the contrary! | Already | I-know | that | I-speak | super fast.", "Oh, no problem! I know I talk way too fast!")],

    // --- words (¿Qué significa…?) ---------------------------------------------
    w_cuadra: [t("Una | cuadra | es | de | una | esquina | a | la | otra.", "A | block | is | from | one | corner | to | the | other.", "A block is from one corner to the next.")],
    w_derechito: [t("Derechito | quiere decir | derecho, | sin | dar vuelta.", "Derechito | means | straight, | without | turning.", "Derechito means straight ahead, no turns.")],
    w_esquina: [t("La | esquina | es | donde | se juntan | dos | calles.", "The | corner | is | where | come together | two | streets.", "The corner is where two streets meet.")],
    w_banqueta: [t("La | banqueta | es | por | donde | camina | la | gente, | junto a | la | calle.", "The | sidewalk | is | along | where | walks | the | people, | next to | the | street.", "The banqueta is where people walk, next to the street: the sidewalk.",
      { flags: { 1: "Mexican: banqueta = sidewalk (acera elsewhere)." }, neutral: t("La | acera | es | por | donde | camina | la | gente, | junto a | la | calle.", "The | sidewalk | is | along | where | walks | the | people, | next to | the | street.", "The acera is where people walk, next to the street: the sidewalk.") })],
    w_kiosco: [t("El | kiosco | es | el | techito | redondo | en | medio | del | zócalo, | para | la | música.", "The | bandstand | is | the | little roof | round | in | the middle | of the | main square, | for | the | music.", "The kiosco is the little round roof in the middle of the main square, for music: the bandstand.")],
    w_malecon: [t("El | malecón | es | el | paseo | junto al | mar.", "The | seafront | is | the | walkway | next to the | sea.", "The malecón is the promenade along the sea.")],
    w_toldo: [t("Un | toldo | es | como | un | techito | sobre | la | puerta.", "An | awning | is | like | a | little roof | over | the | door.", "A toldo is like a little roof over the door: an awning.")],
    w_cenote: [t("Un | cenote | es | un | pozo | natural | de | agua | dulce. | ¡Se puede | nadar!", "A | cenote | is | a | well | natural | of | water | fresh. | You can | swim!", "A cenote is a natural pool of fresh water. You can swim in it!")],
    w_tianguis: [t("Un | tianguis | es | un | mercado | en | la | calle, | un | día | a la semana.", "A | tianguis | is | a | market | in | the | street, | one | day | a week.", "A tianguis is a street market, one day a week.",
      { flags: { 1: "Mexican word (from Nahuatl): an open-air street market." }, neutral: t("Es | un | mercado | en | la | calle, | un | día | a la semana.", "It's | a | market | in | the | street, | one | day | a week.", "It's a street market, one day a week.") })],
    w_colectivo: [t("Un | colectivo | es | una | camioneta | para | varias | personas. | Es | barato | y | pasa | seguido.", "A | colectivo | is | a | van | for | several | people. | It's | cheap | and | it-comes | often.", "A colectivo is a shared van. It's cheap and comes by often.")],
    w_perico: [t("Un | perico | es | un | pájaro | que | habla | y | habla | sin parar. | ¡Como | yo!", "A | parrot | is | a | bird | that | talks | and | talks | nonstop. | Like | me!", "A perico is a parrot: it talks and talks nonstop. Like me!")],
    w_cant_miss: [t("Quiere decir | que | es | muy | fácil | de | encontrar.", "It means | that | it's | very | easy | to | find.", "It means it's very easy to find!")],

    // --- twists ---------------------------------------------------------------
    tw_banqueta: [t("Ah, | y | váyase | por | la | banqueta | de | la | sombra, | ¡que | el | sol | pega | duro!", "Oh, | and | go | along | the | sidewalk | of | the | shade, | because | the | sun | hits | hard!", "Oh, and walk on the shady side of the street. The sun's brutal!",
      { flags: { 5: "Mexican: banqueta = sidewalk (acera elsewhere)." }, neutral: t("Ah, | y | váyase | por | la | acera | de | la | sombra, | ¡que | el | sol | pega | duro!", "Oh, | and | go | along | the | sidewalk | of | the | shade, | because | the | sun | hits | hard!", "Oh, and walk on the shady side of the street. The sun's brutal!") })],
    tw_kiosco: [t("Ah, | y | si | se pierde, | busque | el | kiosco | del | zócalo.", "Oh, | and | if | you get lost, | look for | the | bandstand | of the | main square.", "Oh, and if you get lost, look for the bandstand in the main square.")],
    tw_trova: [t("Ah, | y | no se pierda | la | música | en | el | zócalo | el | viernes | en la noche. | ¡Es | gratis!", "Oh, | and | don't miss | the | music | in | the | main square | on | Friday | at night. | It's | free!", "Oh, and don't miss the free music in the main square on Friday night!", { flags: { 8: "el before a weekday = on." } })],
    police_ok: [t("¿Está | todo | bien?", "Is | everything | okay?", "Is everything okay?")],
    police_good: [t("¡Ah, | qué | bueno!", "Oh, | how | good!", "Oh, good!")],
    lost_item: [t("¡Ay, | qué | mala | suerte! | En | la | policía | le | pueden | ayudar.", "Oh, | what | bad | luck! | At | the | police station | (to) you | they-can | help.", "Oh no, I'm sorry! They can help you at the police station.")],
    police_bad: [t("¡Ay, | no! | Bueno, | ahí | son | muy | amables.", "Oh, | no! | Well, | there | they-are | very | kind.", "Oh no! Well, they're really nice there.")],

    // --- information ----------------------------------------------------------
    hours: [t("Abrimos | de | nueve | a | cinco, | de | lunes | a | sábado. | Los | domingos | cerramos.", "We're open | from | nine | to | five, | from | Monday | to | Saturday. | On | Sundays | we close.", "We're open nine to five, Monday through Saturday. Closed on Sundays.",
      { flags: { 9: "los before a weekday = on (every) …" } })],
    museum_hours: [t("El | museo | abre | de | diez | a | cinco. | Los | lunes | cierra.", "The | museum | opens | from | ten | to | five. | On | Mondays | it closes.", "The museum is open ten to five. It's closed on Mondays.", { flags: { 7: "los before a weekday = on (every) …" } })],
    market_hours: [t("El | tianguis | se pone | los | sábados, | de | siete | a | dos.", "The | street market | is set up | on | Saturdays, | from | seven | to | two.", "The street market is on Saturdays, from seven to two.",
      { flags: { 1: "Mexican: tianguis = an open-air street market held on a set day.", 3: "los before a weekday = on (every) …" }, neutral: t("El | mercado | se pone | los | sábados, | de | siete | a | dos.", "The | market | is set up | on | Saturdays, | from | seven | to | two.", "The market is on Saturdays, from seven to two.") })],
    mercado_hours: [t("El | mercado | abre | todos | los | días, | de | seis | a | tres.", "The | market | opens | all | the | days, | from | six | to | three.", "The market is open every day, from six to three.")],
    cafe_hours: [t("La Ceiba | abre | a | las | siete | y | cierra | a | las | nueve | de la noche.", "La Ceiba | opens | at | — | seven | and | closes | at | — | nine | p.m.", "La Ceiba opens at seven and closes at nine p.m.",
      { flags: { 3: "Spanish uses an article before clock times; English has no separate word.", 8: "Spanish uses an article before clock times; English has no separate word." } })],
    // Saturdays as in s78 (the bank itself)
    bank_hours: [t("El | banco | abre | de | nueve | a | cuatro, | de | lunes | a | viernes, | y | los | sábados | hasta | las | dos.",
      "The | bank | opens | from | nine | to | four, | from | Monday | to | Friday, | and | on | Saturdays | until | — | two.",
      "The bank is open nine to four, Monday through Friday, and until two on Saturdays.",
      { flags: { 12: "los before a weekday = on (every) …", 15: "Spanish uses an article before clock times; English has no separate word." } })],
    trip_hours: [t("Abren | temprano, | como | a | las | ocho, | y | cierran | en | la | tarde.", "They-open | early, | about | at | — | eight, | and | they-close | in | the | afternoon.",
      "They open early, around eight, and close in the afternoon.", { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } })],
    beach_hours: [t("¡La | playa | no cierra!", "The | beach | doesn't close!", "The beach never closes!")],
    // prices: the museum's from s70; the cenotes, the ruins and the beaches out of town charge admission (s69)
    museum_price: [t("La | entrada | general | cuesta | {$price}. | Los | domingos | es | gratis | para | mexicanos | y | residentes.",
      "The | admission | general | costs | {$price}. | On | Sundays | it's | free | for | Mexicans | and | residents.",
      "General admission is {$price}. On Sundays it's free for Mexicans and residents.", { flags: { 5: "los before a weekday = on (every) …" } })],
    trip_price: [t("Se cobra | la | entrada; | depende | del | lugar. | Lleve | efectivo.", "They charge | the | admission; | it-depends | on the | place. | Bring | cash.",
      "There's an entrance fee; it depends on the place. Bring cash.")],
    free_place: [t("¡No se paga | nada! | Es | gratis.", "You don't pay | anything! | It's | free.", "You don't pay a thing! It's free.")],
    hours_unknown: [t("Mmm, | no sé. | Fíjese | en | el | letrero | de | la | puerta.", "Hmm, | I don't know. | Look | at | the | sign | on | the | door.", "Hmm, I don't know. Check the sign on the door!")],
    downtown: [t("¡Ya | está | en | el | centro! | El | zócalo | está | a | dos | cuadras.", "Already | you're | in | the | center! | The | main square | is | at | two | blocks.", "You're already downtown! The main square is two blocks away.")],
    events_music: [t("¿Esta | semana? | El | viernes | hay | música | en vivo | en | el | zócalo, | a | las | ocho | de la noche. | ¡Gratis!", "This | week? | On | Friday | there is | music | live | in | the | main square, | at | — | eight | p.m. | Free!", "This week? There's free live music in the main square on Friday, at eight p.m.!",
      { flags: { 2: "el before a weekday = on.", 11: "Spanish uses an article before clock times; English has no separate word." } })],
    events_market: [t("Y | el | sábado | en | la | mañana | se pone | el | tianguis.", "And | on | Saturday | in | the | morning | is set up | the | street market.", "And the street market is on Saturday morning.",
      { flags: { 1: "el before a weekday = on.", 8: "Mexican: tianguis = an open-air street market held on a set day." }, neutral: t("Y | el | sábado | en | la | mañana | se pone | el | mercado.", "And | on | Saturday | in | the | morning | is set up | the | market.", "And the market is on Saturday morning.") })],
    event_free: [t("¡Totalmente | gratis! | Llegue | temprano | para | encontrar | lugar.", "Totally | free! | Arrive | early | to | find | a spot.", "Totally free! Get there early to find a spot.")],
    event_time: [t("La | música | empieza | a | las | ocho.", "The | music | starts | at | — | eight.", "The music starts at eight.", { flags: { 4: "Spanish uses an article before clock times; English has no separate word." } })],
    colectivo: [t("Los | colectivos | pasan | aquí | enfrente, | en | la | avenida. | Para | subir, | levante | la | mano.", "The | shared vans | pass | here | in front, | on | the | avenue. | To | get on, | raise | your | hand.", "The colectivos stop right out front, on the avenue. Just wave one down.", { flags: { 11: "Spanish says la mano (the hand) for a body part; English says your hand." } })],
    // "¿Dónde compro boletos?": no tickets in advance; the camión and the colectivo are paid to the driver (the bus
    // when you get on, s67b; the colectivo when you get off, s69)
    ticket_none: [t("Aquí | no vendemos | boletos. | En | el | camión | o | en | el | colectivo | se paga | al | chofer, | en efectivo.",
      "Here | we don't sell | tickets. | On | the | bus | or | on | the | shared van | you pay | the | driver, | in cash.",
      "We don't sell tickets here. On the bus or the colectivo, you pay the driver in cash.",
      { flags: { 5: "Mexican: camión = city bus (autobús elsewhere)." },
        neutral: t("Aquí | no vendemos | boletos. | En | el | autobús | o | en | el | colectivo | se paga | al | chofer, | en efectivo.",
          "Here | we don't sell | tickets. | On | the | bus | or | on | the | shared van | you pay | the | driver, | in cash.",
          "We don't sell tickets here. On the bus or the colectivo, you pay the driver in cash.") })],
    colectivo_when: [t("Pasan | muy | seguido | por | la | avenida. | No tienen | horario.", "They-pass | very | often | along | the | avenue. | They don't have | a schedule.",
      "They come by all the time on the avenue. There's no schedule.")],
    taxi: [t("En | la | avenida | pasan | muchos | taxis. | Nada más | levante | la | mano.", "On | the | avenue | pass | many | taxis. | Just | raise | your | hand.",
      "Lots of taxis go by on the avenue. Just wave one down.", { flags: { 8: "Spanish says la mano (the hand) for a body part; English says your hand." } })],
    colectivo_price: [t("Es | barato. | Se paga | al | chofer, | en efectivo.", "It's | cheap. | You pay | the | driver, | in cash.", "It's cheap. You pay the driver, in cash.")],
    busstop: [t("La | parada | del | camión | está | aquí | enfrente.", "The | stop | of the | bus | is | here | in front.", "The bus stop is right out front.",
      { flags: { 3: "Mexican: camión = city bus (autobús elsewhere)." }, neutral: t("La | parada | del | autobús | está | aquí | enfrente.", "The | stop | of the | bus | is | here | in front.", "The bus stop is right out front.") })],
    bus_which: [t("Tome | cualquier | camión | de | la | avenida | y | pregúntele | al | chofer.", "Take | any | bus | from | the | avenue | and | ask | the | driver.", "Take any bus on the avenue and ask the driver.",
      { flags: { 2: "Mexican: camión = city bus (autobús elsewhere)." }, neutral: t("Tome | cualquier | autobús | de | la | avenida | y | pregúntele | al | chofer.", "Take | any | bus | from | the | avenue | and | ask | the | driver.", "Take any bus on the avenue and ask the driver.") })],
    bus_schedule: [t("¡Claro! | Aquí | tiene | los | horarios | de | los | camiones.", "Sure! | Here | you have | the | schedules | of | the | buses.", "Sure! Here's a bus schedule.",
      { flags: { 7: "Mexican: camión = city bus (autobús elsewhere)." }, neutral: t("¡Claro! | Aquí | tiene | los | horarios | de | los | autobuses.", "Sure! | Here | you have | the | schedules | of | the | buses.", "Sure! Here's a bus schedule.") })],
    wifi_there: [t("Sí, | pero | la | contraseña | se la | dan | allá.", "Yes, | but | the | password | it to you | they-give | there.", "Yes, but they'll give you the password there.")],
    wifi: [
      t("¡Claro! | La | contraseña | es | colibri, | todo | en | minúsculas, | sin | acento.", "Sure! | The | password | is | colibri, | all | in | lowercase, | without | accent.", "Sure! The password is colibri, all lowercase, no accent.",
        { spell: "colibri", write: "Wifi · contraseña: colibri" }),
      t("Sí, | es | gratis. | La | contraseña | es | colibri.", "Yes, | it's | free. | The | password | is | colibri.", "Yep, it's free. The password is colibri.", { spell: "colibri", write: "Wifi · contraseña: colibri" }),
    ],
    restroom: [t("Al fondo | del | pasillo, | a la izquierda.", "At the back | of the | hallway, | on the left.", "Down the hall, on the left.")],
    brochure: [t("¡Claro! | Tome | los | que | quiera; | están | junto a | la | puerta.", "Sure! | Take | the ones | that | you-want; | they're | next to | the | door.", "Sure, help yourself! They're on the rack by the door.")],
    recommend: [
      t("¡Uy, | hay | mucho! | Tiene | que | ir | a | un | cenote, | y | a | la | playa | de | Xcacel.", "Oh, | there's | a lot! | You have | to | go | to | a | cenote, | and | to | the | beach | of | Xcacel.", "Oh, there's lots! You have to go to a cenote, and to Xcacel beach.",
        { flags: { 14: "Maya name: x sounds like English sh (shka-SEL)." }, spell: "Xcacel", write: "Cenote · playa de Xcacel" }),
      t("Las | ruinas | de | Tulum | son | preciosas, | y | el | sábado | hay | tianguis | en | el | zócalo.", "The | ruins | of | Tulum | are | beautiful, | and | on | Saturday | there is | a street market | in | the | main square.", "The ruins at Tulum are beautiful, and on Saturday there's a street market in the main square.",
        { flags: { 7: "el before a weekday = on.", 10: "Mexican: tianguis = an open-air street market held on a set day." }, spell: "Tulum",
          neutral: t("Las | ruinas | de | Tulum | son | preciosas, | y | el | sábado | hay | mercado | en | el | zócalo.", "The | ruins | of | Tulum | are | beautiful, | and | on | Saturday | there is | a market | in | the | main square.", "The ruins at Tulum are beautiful, and on Saturday there's a market in the main square.") }),
      t("Si | le gusta | el | mar, | vaya | a | Chemuyil: | es | tranquilo | y | hay | tortugas.", "If | you like | the | sea, | go | to | Chemuyil: | it's | quiet | and | there are | turtles.", "If you like the sea, go to Chemuyil. It's quiet, and there are turtles.",
        { flags: { 6: "Maya name: ch as in English “church” (che-mu-YEEL)." }, spell: "Chemuyil", write: "Chemuyil: playa tranquila, tortugas" }),
    ],
    // the taquería by the mercado (s69's too), so "¿Dónde está la taquería?" has a way there
    food: [t("Para | tacos, | la | taquería | junto al | mercado. | Y | El Muelle | tiene | pescado | muy | rico.", "For | tacos, | the | taco place | next to the | market. | And | El Muelle | has | fish | very | tasty.", "For tacos, the taco place next to the market. And El Muelle has really good fish.")],
    map_lang: [t("Los | mapas | están | en | español | y | en | inglés, | nada más.", "The | maps | are | in | Spanish | and | in | English, | only.", "Sorry, we only have them in Spanish and English.")],
    no_problem: [t("¡No hay problema!", "No problem!", "No problem!")],

    // --- the end ----------------------------------------------------------------
    ask_more: [
      t("¿Algo | más?", "Anything | else?", "Anything else?"),
      t("¿Le | ayudo | en | algo | más?", "(To) you | I-help | in | anything | else?", "Can I help you with anything else?"),
    ],
    praise: [
      t("Y | gracias | por | pararme | cuando | hablo | rápido. | ¡Casi | todos | solo | dicen | que | sí | con | la | cabeza!", "And | thanks | for | stopping me | when | I-speak | fast. | Almost | everyone | just | says | — | yes | with | the | head!", "And hey, thanks for stopping me when I talk too fast. Most people just nod and smile!",
        { flags: { 11: "que introduces what is said; English needs no word here." } }),
      t("Por cierto, | ¡muy | bien | que | pregunte! | Así | se aprende.", "By the way, | very | good | that | you-ask! | That's how | you learn.", "Good job asking, by the way. That's the best way to learn!"),
    ],
    closing: [
      t("¡Disfrute | Puerto Colibrí!", "Enjoy | Puerto Colibrí!", "Enjoy Puerto Colibrí!"),
      t("¡Que | se divierta!", "(I hope) | you have fun!", "Have fun exploring!"),
      t("¡Aquí | estamos | para | lo que | necesite!", "Here | we are | for | whatever | you-need!", "Come back anytime!"),
    ],
  },
  domains: { letters: () => ["Xcacel", "Chemuyil", "Juárez", "Ceiba", "Itzamná", "Tulum", "colibri", "Tijeras"] },

  hints: {
    map: {
      lt: "Ask for a town map",
      items: [
        { id: "map_could", s: t("¿Me | da | un | mapa, | por favor?", "(To) me | you-give | a | map, | please?", "Could I have a map, please?"), register: "polite", note: "Very common in Mexico: “¿Me da…?”" },
        { id: "map_do_you", s: t("¿Tiene | un | mapa | del | pueblo?", "Do you have | a | map | of the | town?", "Do you have a map of the town?") },
        { id: "map_can", s: t("¿Puedo | llevarme | un | mapa?", "Can I | take | a | map?", "Can I take a map?") },
        { id: "map_id_like", s: t("Quisiera | un | mapa, | por favor.", "I'd like | a | map, | please.", "I'd like a map, please.") },
        { id: "map_free", s: t("¿El | mapa | es | gratis?", "The | map | is | free?", "Is the map free?") },
        { id: "map_here", s: t("¿Dónde | estamos | en | el | mapa?", "Where | are we | on | the | map?", "Where are we on the map?") },
      ],
    },
    where: {
      lt: "Ask how to get somewhere", slot: "place", examples: ["museum", "beach", "pharmacy", "sunny_cup"],
      items: WHERE_BASE,
    },
    cafe: {
      lt: "Ask the way to the café", slot: "place", examples: ["sunny_cup"],
      items: WHERE_BASE.slice(0, 3).map((it) => ({ ...it, only: (e: EntityDef) => e.id === "sunny_cup" })),
    },
    slower: {
      lt: "Ask him to say it again more slowly",
      items: [
        { id: "c_again_slowly", s: t("Perdón, | ¿me | lo | repite | más despacio?", "Sorry, | (to) me | it | you-repeat | more slowly?", "Sorry, could you say that again more slowly?") },
        { id: "c_slower", s: t("¿Puede | hablar | más despacio, | por favor?", "Can you | speak | more slowly, | please?", "Could you speak more slowly, please?") },
        { id: "c_learning", s: t("Perdón, | estoy | aprendiendo | español.", "Sorry, | I'm | learning | Spanish.", "Sorry, I'm still learning Spanish.") },
        { id: "c_say_again", s: t("Perdón, | ¿puede | repetir?", "Sorry, | can you | repeat?", "Sorry, could you say that again?"), note: "The first time, Don Chuy repeats it just as fast! In Mexico you'll also hear “¿Mande?” for “Pardon?”." },
      ],
    },
    yes_please: {
      lt: "Say yes",
      items: [
        { id: "yn_yes_please", s: t("Sí, | por favor.", "Yes, | please.", "Yes, please!") },
        { id: "yn_sure", s: t("¡Claro, | gracias!", "Sure, | thanks!", "Sure, thanks!") },
        { id: "yn_great", s: t("¡Sería | genial, | gracias!", "It would be | great, | thanks!", "That would be great, thanks.") },
      ],
    },
    check: {
      lt: "Check that you understood the way",
      items: [CHK.side, CHK.two_blocks, CHK.far,
        { id: "k_big_one", s: t("¿Se refiere | al | grande?", "Do you mean | the | big one?", "Do you mean the big one?"), note: "A line from the song." },
        { id: "k_turn_where", s: t("Perdón, | ¿doy vuelta | dónde?", "Sorry, | I turn | where?", "Sorry, turn where?"), note: "Ask only about the part you didn't catch." },
        { id: "k_blocks", s: t("¿Cuántas | cuadras?", "How many | blocks?", "How many blocks?") },
        { id: "k_did_i", s: t("¿Entendí | bien?", "Did I understand | right?", "Did I get that right?") },
        { id: "k_show_map", s: t("¿Me | lo | marca | en | el | mapa?", "(For) me | it | you-mark | on | the | map?", "Could you show me on the map?") },
      ],
    },
    ...Object.fromEntries(Object.entries(CHECK_FOR).map(([id, keys]) => [`chk_${id}`, {
      lt: "Check that you understood the way", items: [...keys.map((k) => CHK[k]), CHK.far, CHK.side].filter((x, i, a) => a.indexOf(x) === i),
    }])),
    quiz_out: { lt: "Answer: left or right", items: QUIZ_ITEMS("a_door", "Al | salir,", "Upon | leaving,", "out the door") },
    quiz_bank: { lt: "Answer: left or right", items: QUIZ_ITEMS("a_turn", "En | el | banco,", "At | the | bank,", "at the bank") },
    quiz_square: { lt: "Answer: left or right", items: QUIZ_ITEMS("a_turn", "En | el | zócalo,", "At | the | main square,", "at the main square") },
    gotit: { lt: "Say you've got it now", items: GOTIT },
    clarify_more: {
      lt: "More ways to check",
      items: [
        { id: "x_speak_up", s: t("¿Puede | hablar | más | fuerte?", "Can you | speak | more | loudly?", "Could you speak up, please?") },
        { id: "x_spell_street", s: t("¿Cómo | se escribe | la | calle?", "How | is it spelled | the | street?", "How do you spell the street?") },
        { id: "x_spell_place", s: t("¿Cómo | se escribe | Xcacel?", "How | is it spelled | Xcacel?", "How do you spell Xcacel?") },
        { id: "t_patience", s: t("¡Gracias | por | su | paciencia!", "Thanks | for | your | patience!", "Thanks for your patience!") },
      ],
    },
    words: {
      lt: "Ask what a word means", slot: "word", examples: ["cuadra", "derechito", "banqueta"],
      items: [
        { id: "x_word", s: t("¿Qué | significa | {X}?", "What | means | {X}?", "What does {X} mean?") },
        { id: "x_whats_a", s: t("¿Qué | es | {X.np}?", "What | is | {X.np}?", "What's {X.np}?"), only: (e) => !!e.attrs?.noun },
      ],
    },
    info: {
      lt: "Ask about the town and the office",
      items: [
        { id: "i_hours", s: t("¿A | qué | hora | cierran?", "At | what | time | do you close?", "What time do you close?") },
        { id: "i_events", s: t("¿Qué | hay | que | hacer | esta | semana?", "What | is there | to | do | this | week?", "What's going on this week?") },
        { id: "i_recommend", s: t("¿Qué | me | recomienda | visitar?", "What | (to) me | you-recommend | to visit?", "What do you recommend seeing?") },
        { id: "i_buspass", s: t("¿Dónde | tomo | el | colectivo?", "Where | do I take | the | shared van?", "Where do I catch the colectivo?"), note: "A colectivo is the shared van that runs along the coast. You pay the driver." },
        { id: "i_wifi", s: t("¿Tienen | wifi?", "Do you have | Wi-Fi?", "Do you have Wi-Fi?") },
        { id: "i_restroom", s: t("¿Dónde | está | el | baño?", "Where | is | the | restroom?", "Where's the restroom?") },
        { id: "i_food", s: t("¿Dónde | puedo | comer | algo?", "Where | can I | eat | something?", "Where can I get something to eat?") },
        { id: "q_downtown", s: t("¿Dónde | está | el | centro?", "Where | is | the | center?", "Where's downtown?") },
      ],
    },
    done: {
      lt: "Say that's all",
      items: [
        { id: "d_all", s: t("Eso | es | todo, | gracias.", "That | is | all, | thanks.", "That's all, thanks.") },
        { id: "d_set", s: t("Así | estoy | bien, | gracias.", "Like this | I'm | fine, | thanks.", "I'm all set, thanks."), note: "A polite way to say you don't need anything else." },
        { id: "d_nothing", s: t("Nada más, | gracias.", "Nothing else, | thanks.", "Nothing else, thanks.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With staff, usted is more polite: ¿Me puede…? or ¿Tiene…? (puedes and tienes are for friends).", better: "¿Me puede decir cómo llegar?" },
  },

  merges: {
    "puerto colibrí": { reason: "lexical_expression", split: "A proper name; puerto → harbor + colibrí → hummingbird would translate the town's name.", minimal: "Two-word name." },
    "la ceiba": { reason: "lexical_expression", split: "A café name; la → the + ceiba → ceiba tree would translate the name.", minimal: "Two-word name." },
    "café la ceiba": { reason: "lexical_expression", split: "The café's full name; splitting it translates part of a proper name.", minimal: "The three-word name." },
    "mar azul": { reason: "lexical_expression", split: "mar → sea + azul → blue would translate part of the hotel's proper name.", minimal: "Only the two-word name; hotel stays separate." },
    "el muelle": { reason: "lexical_expression", split: "el → the + muelle → pier would translate the restaurant's proper name.", minimal: "Only the two-word name." },
    "la cocina de lucía": { reason: "lexical_expression", split: "la → the + cocina → kitchen + de → of + Lucía would translate the restaurant's proper name.", minimal: "The four-word name." },
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → offers is false; the service formula = what can I do for you.", minimal: "Three words, one formula." },
    "dé vuelta": { reason: "lexical_expression", split: "dé → give + vuelta → turn (noun) is false; dar vuelta = to turn.", minimal: "Verb and noun only." },
    "da vuelta": { reason: "lexical_expression", split: "da → you give + vuelta → turn (noun) is false; dar vuelta = to turn.", minimal: "Verb and noun only." },
    "doy vuelta": { reason: "lexical_expression", split: "doy → I give + vuelta → turn (noun) is false; dar vuelta = to turn.", minimal: "Verb and noun only." },
    "dar vuelta": { reason: "lexical_expression", split: "dar → give + vuelta → turn (noun) is false; dar vuelta = to turn.", minimal: "Verb and noun only." },
    "a mano derecha": { reason: "lexical_expression", split: "a → to + mano → hand + derecha → right is a calque; = on the right-hand side.", minimal: "Three words, one direction." },
    "a mano izquierda": { reason: "lexical_expression", split: "a → to + mano → hand + izquierda → left is a calque; = on the left-hand side.", minimal: "Three words, one direction." },
    "enfrente de": { reason: "lexical_expression", split: "enfrente → in front + de → of misreads the preposition: across from.", minimal: "Two words." },
    "enfrente del": { reason: "lexical_expression", split: "enfrente de + el: across from the; the article is fused into del.", minimal: "Two words (de + el = del)." },
    "junto a": { reason: "lexical_expression", split: "junto → together + a → to is false; = next to.", minimal: "Two words." },
    "junto al": { reason: "lexical_expression", split: "junto a + el: next to the; the article is fused into al.", minimal: "Two words (a + el = al)." },
    "al lado": { reason: "lexical_expression", split: "al → to the + lado → side is false here; aquí al lado = next door.", minimal: "Two words." },
    "después de": { reason: "lexical_expression", split: "después → afterwards + de → of misreads the preposition: after (past).", minimal: "Two words." },
    "no hay que": { reason: "grammatical_fusion", split: "no → not + hay → there is + que → that is false; impersonal obligation, negated = you don't need to.", minimal: "Three words." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if is false; = in case.", minimal: "Two words." },
    "cambia de opinión": { reason: "lexical_expression", split: "cambia → you change + de → of + opinión → opinion is a calque; = you change your mind.", minimal: "Verb, preposition and noun form the idiom." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways is false; = anyway.", minimal: "Three words." },
    "en especial": { reason: "lexical_expression", split: "en → in + especial → special is false; = in particular.", minimal: "Two words." },
    "le gusta": { reason: "grammatical_fusion", split: "le → to you + gusta → pleases: Spanish says the thing pleases you; = you like.", minimal: "Clitic and verb." },
    "¿me explico?": { reason: "lexical_expression", split: "me → myself + explico → I explain is false; the check = am I making sense?", minimal: "Two words, one question." },
    "me explico": { reason: "lexical_expression", split: "me → myself + explico → I explain is false; the check = am I making sense?", minimal: "Two words, one question." },
    "no tiene pierde": { reason: "lexical_expression", split: "no → not + tiene → it has + pierde → loses is false; = you can't miss it.", minimal: "Three words, one idiom." },
    "para nada": { reason: "lexical_expression", split: "para → for + nada → nothing is false; = not at all.", minimal: "Two words." },
    "a pie": { reason: "lexical_expression", split: "a → to + pie → foot is false; = on foot.", minimal: "Two words." },
    "media hora": { reason: "lexical_expression", split: "media → half + hora → hour: English says half an hour (an added article).", minimal: "Two words." },
    "en realidad": { reason: "lexical_expression", split: "en → in + realidad → reality is false; = actually.", minimal: "Two words." },
    "quedó claro": { reason: "lexical_expression", split: "quedó → it remained + claro → clear is a calque; = is it clear.", minimal: "Two words." },
    "con calma": { reason: "lexical_expression", split: "con → with + calma → calm is false; = calmly.", minimal: "Two words." },
    "al contrario": { reason: "lexical_expression", split: "al → to the + contrario → contrary is false; = on the contrary.", minimal: "Two words." },
    "quiere decir": { reason: "lexical_expression", split: "quiere → it wants + decir → to say is false; = it means.", minimal: "Two words." },
    "se juntan": { reason: "grammatical_fusion", split: "se → themselves + juntan → join is false; = come together, meet.", minimal: "Pronoun and verb." },
    "a la semana": { reason: "lexical_expression", split: "a → to + la → the + semana → week is false; = a week (per week).", minimal: "Three words." },
    "sin parar": { reason: "lexical_expression", split: "sin → without + parar → to stop: English says nonstop.", minimal: "Two words." },
    "no se pierda": { reason: "grammatical_fusion", split: "no + se + pierda (lose yourself) is false; perderse algo = to miss something.", minimal: "Three words." },
    "en la noche": { reason: "lexical_expression", split: "en → in + la → the + noche → night: English says at night.", minimal: "Three words." },
    "en vivo": { reason: "lexical_expression", split: "en → in + vivo → alive is false; = live (music).", minimal: "Two words." },
    "al fondo": { reason: "lexical_expression", split: "al → to the + fondo → bottom is false; = at the back.", minimal: "Two words." },
    "así es": { reason: "lexical_expression", split: "así → like this + es → it is is a calque; the agreement = that's right.", minimal: "Two words." },
    "por cierto": { reason: "lexical_expression", split: "por → for + cierto → certain is false; = by the way.", minimal: "Two words." },
    "se aprende": { reason: "grammatical_fusion", split: "se → itself + aprende → learns: impersonal se = you learn (people learn).", minimal: "Pronoun and verb." },
    "se divierta": { reason: "grammatical_fusion", split: "se → yourself + divierta → amuse is false; divertirse = to have fun.", minimal: "Pronoun and verb." },
    "me ubiqué": { reason: "grammatical_fusion", split: "me → myself + ubiqué → I located is a calque; ubicarse = to get one's bearings.", minimal: "Pronoun and verb." },
  },

  // The plan: map → the way to the café → "más despacio" → check the route.
  // Declining the map or the café hides that line; the slow repeat is hidden if the route was clear anyway.
  mission: [
    { lt: "Ask for a map", optional: true, when: (c) => !c.s.mapNo, done: (c) => !!c.s.map },
    { lt: "Ask the way to Café La Ceiba", optional: true, when: (c) => !c.s.cafeNo, done: (c) => c.s.asked.includes("sunny_cup") },
    { lt: "Ask him to say it again more slowly", optional: true, when: (c) => routeGoal(c) && (!c.s.confirmed || !!c.s.slowed), done: (c) => !!c.s.slowed },
    // (a route already checked still counts when the learner leaves during the check of a newer one)
    { lt: "Check the way", optional: true, when: routeGoal, done: (c) => (!!c.s.dest && !!c.s.conf[c.s.dest]) || (!!c.s.byeNow && !!c.s.confirmed) },
  ],
  steps: [
    { id: "need", when: (c) => !c.s.map && !c.s.dest && !c.s.need, done: (c) => !!c.s.need,
      ask: (c) => c.say("ask_need"),
      expects: ["ask_map", "ask_where", "map_free"],
      suggest: [
        { lt: "Ask for a town map", hint: "map" },
        { lt: "Ask the way to the café", hint: "cafe" },
        { lt: "Ask about the town", hint: "info" },
        { lt: "Ask him to say it again more slowly", hint: "slower" },
      ],
      help: (c) => { c.say("need_help"); c.s.need = true; } },
    { id: "confirm", when: (c) => !!c.s.dest && !c.s.byeNow, done: (c) => !!c.s.conf[c.s.dest],
      ask: (c) => { askConfirm(c); },
      // Not "confirm" or the global clarification intents: the expected-intent bonus is per segment.
      expects: CONFIRM_EXPECTS,
      suggest: [
        { lt: "Check that you understood the way", hint: "check" },
        { lt: "Ask him to say it again more slowly", hint: "slower" },
        { lt: "Ask what a word means", hint: "words", options: "word" },
        { lt: "More ways to check", hint: "clarify_more" },
      ],
      yes: (c) => { quiz(c); },
      no: (c) => { sayAgainSlow(c); },
      help: (c) => { sayAgainSlow(c); } },
    // (offered at most twice: a learner busy with other questions isn't asked after every answer)
    { id: "map", when: (c) => !c.s.map && !c.s.mapNo && !c.s.byeNow && (c.s.mapAsks || 0) < 2, done: (c) => !!c.s.map || !!c.s.mapNo,
      ask: (c) => { c.s.mapAsks = (c.s.mapAsks || 0) + 1; c.say("offer_map"); },
      expects: ["ask_map", "map_no", "map_free", "accept_ctx", "decline_ctx"],
      suggest: [{ lt: "Say yes and take a map", hint: "yes_please" }, { lt: "Answer yes or no", hint: "g_yesno" }],
      yes: (c) => { giveMap(c); c.say("map_give"); },
      no: (c) => { c.s.mapNo = true; c.say("map_ok_no"); } },
    // The café is the lesson's goal: asked for directly ("¿A dónde va?"), or offered after another route.
    // (the café is offered at most twice: a learner busy with other questions isn't asked after every answer)
    { id: "cafe", when: (c) => !c.s.asked.includes("sunny_cup") && !c.s.cafeNo && (!c.s.dest || !!c.s.conf[c.s.dest]) && (c.s.cafeOffers || 0) < 2,
      done: (c) => c.s.asked.includes("sunny_cup") || !!c.s.cafeNo,
      ask: (c) => { if (c.s.dest) offerCafe(c, true); else c.say("ask_where"); },
      expects: ["ask_where", "just_looking"],
      suggest: [
        { lt: "Ask the way to the café", hint: "cafe" },
        { lt: "Ask the way to another place", hint: "where", options: ["museum", "beach", "pharmacy", "bank", "trattoria", "square", "lighthouse", "station", "pier"] },
        { lt: "Ask him to say it again more slowly", hint: "slower" },
      ],
      no: (c) => { offerCafe(c, false); },
      help: (c) => { offerCafe(c, false); } },
    { id: "more", when: (c) => c.s.askMore, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"),
      expects: ["more_no", "more_yes", "ask_where", "ask_hours", "ask_events", "ask_buspass", "ask_wifi", "ask_restroom", "ask_recommend", "thanks_patience"],
      suggest: [
        { lt: "Say that's all", hint: "done" },
        { lt: "Ask something else", hint: "info" },
        { lt: "Ask the way to another place", hint: "where", options: "place" },
      ],
      yes: (c) => { c.say("g_yes_what"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.asked = [];
    c.s.conf = {};
    c.s.clar = 0;
    c.s.askMore = c.chance(0.65);
    c.s.wantTwist = c.visits >= 1 && c.chance(0.6);
    c.s.musicTip = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    if (c.memory.clarified && c.chance(0.7)) {
      c.say("greet_back");
      return; // the "need" step asks "Bueno, ¿en qué le puedo ayudar?"
    }
    if (c.chance(0.25)) {
      c.say("greet_map");
      c.expect({ id: "greet_map", optional: true, hints: ["g_yesno", "map"], expects: ["ask_map", "ask_where", "map_no"],
        suggest: [{ lt: "Say yes and take a map", hint: "yes_please" }, { lt: "Answer yes or no", hint: "g_yesno" }],
        yes: (cc) => { cc.s.need = true; giveMap(cc); cc.say("map_give"); },
        no: (cc) => { cc.s.need = true; cc.s.mapNo = true; cc.say("oh_okay"); cc.say("ask_need"); cc.hold(); },
        on: {
          ask_map: (cc) => { cc.s.need = true; giveMap(cc); cc.say("map_give"); },
          accept_ctx: (cc) => { cc.s.need = true; if (giveMap(cc)) cc.say("map_give"); },
          decline_ctx: (cc) => { cc.s.need = true; cc.s.mapNo = true; cc.say("oh_okay"); cc.say("ask_need"); cc.hold(); },
        } });
      return;
    }
    c.say("greet");
    c.hold(); // the greeting already asks "¿En qué le puedo ayudar?" (the "need" step)
  },

  handlers: wrap(H),

  finish: (c) => {
    if (!c.s.map) { c.say("map_anyway"); giveMap(c); }
    if (c.s.clar > 0 && !c.s.patience) c.say("praise");
    if (c.s.musicTip && !c.s.events) { c.say("tw_trova"); c.s.events = true; }
    c.complete();
    c.remember({ clarified: c.s.clar > 0 || !!c.memory.clarified });
    if (c.s.byeNow) { c.say("g_bye"); c.end(); return; } // the learner already said goodbye
    c.say("closing");
    c.expect({ id: "closing", hints: ["g_social", "clarify_more"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        g_bye: (cc) => { cc.say("g_bye"); cc.end(); },
        thanks_patience: (cc) => { cc.say("thanks_patience"); cc.end(); },
        thanks_help: (cc) => { cc.say("g_welcome"); cc.end(); },
        more_no: (cc) => { cc.say("g_bye"); cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // Every hint construction
    { say: "¿Me da un mapa, por favor?", intent: "ask_map" },
    { say: "¿Tiene un mapa del pueblo?", intent: "ask_map" },
    { say: "¿Puedo llevarme un mapa?", intent: "ask_map" },
    { say: "Quisiera un mapa, por favor", intent: "ask_map" },
    { say: "¿El mapa es gratis?", intent: "map_free" },
    { say: "¿Dónde estamos en el mapa?", intent: "map_here" },
    { say: "¿Cómo llego al museo?", intent: "ask_where", slots: { place: "museum" } },
    { say: "¿Dónde está la farmacia?", intent: "ask_where", slots: { place: "pharmacy" } },
    { say: "¿Me puede decir cómo llegar al Café La Ceiba?", intent: "ask_where", slots: { place: "sunny_cup" } },
    { say: "Busco la playa", intent: "ask_where", slots: { place: "beach" } },
    { say: "¿Por dónde queda el banco?", intent: "ask_where", slots: { place: "bank" } },
    { say: "¿Está lejos el faro?", intent: "ask_far", slots: { place: "lighthouse" } },
    { say: "Quisiera ir a la playa", intent: "ask_where", slots: { place: "beach" } },
    { say: "¿Me puede mostrar el museo en el mapa?", intent: "show_map", slots: { place: "museum" } },
    { say: "Al museo, por favor", intent: "dest_short", slots: { place: "museum" } },
    { say: "Perdón, ¿me lo repite más despacio?", intent: "say_again_slowly" },
    { say: "¿Puede hablar más despacio, por favor?", intent: "g_slower" },
    { say: "Perdón, ¿puede repetir?", intent: "g_repeat" },
    { say: "¿Mande?", intent: "g_repeat" },
    { say: "Entonces salgo a la derecha, camino dos cuadras y en el banco doy vuelta a la izquierda, ¿verdad?", intent: "confirm" },
    { say: "Entonces salgo a la izquierda y sigo derecho dos cuadras, ¿verdad?", intent: "confirm" },
    { say: "¿En el banco, a la izquierda?", intent: "confirm" },
    { say: "¿Al salir, a la derecha?", intent: "confirm" },
    { say: "¿Está a la derecha o a la izquierda?", intent: "ask_side" },
    { say: "¿Se refiere al grande?", intent: "ask_which_one" },
    { say: "Perdón, ¿doy vuelta dónde?", intent: "ask_turn_where" },
    { say: "¿Cuántas cuadras?", intent: "ask_blocks" },
    { say: "¿Entendí bien?", intent: "did_i" },
    { say: "¿Me lo marca en el mapa?", intent: "show_map" },
    { say: "Al salir, a la izquierda", intent: "confirm", step: "confirm", not: ["understood"] },
    { say: "¡Ya entendí, gracias!", intent: "understood" },
    { say: "Ya me ubiqué. ¡Gracias!", intent: "understood" },
    { say: "¿Puede hablar más fuerte?", intent: "louder" },
    { say: "¿Cómo se escribe la calle?", intent: "spell_q" },
    { say: "¿Cómo se escribe Xcacel?", intent: "spell_q", slots: { sp: "sp_xcacel" } },
    { say: "¡Gracias por su paciencia!", intent: "thanks_patience" },
    { say: "¿Qué significa derechito?", intent: "word_q", slots: { word: "derechito" } },
    { say: "¿Qué es una banqueta?", intent: "word_q", slots: { word: "banqueta" } },
    { say: "¿A qué hora cierran?", intent: "ask_hours" },
    { say: "¿Qué hay que hacer esta semana?", intent: "ask_events" },
    { say: "¿Qué me recomienda visitar?", intent: "ask_recommend" },
    { say: "¿Dónde tomo el colectivo?", intent: "ask_buspass" },
    { say: "¿Dónde compro boletos para el camión?", intent: "ask_buspass" },
    { say: "¿Tienen wifi?", intent: "ask_wifi" },
    { say: "¿Dónde está el baño?", intent: "ask_restroom" },
    { say: "¿Dónde puedo comer algo?", intent: "ask_food" },
    { say: "¿Dónde está el centro?", intent: "ask_downtown" },
    { say: "Eso es todo, gracias", intent: "more_no", step: "more" },
    { say: "Así estoy bien, gracias", intent: "more_no", step: "more" },
    { say: "Nada más, gracias", intent: "more_no", step: "more" },
    // Natural alternatives, trips, short answers, tú to staff, slips
    { say: "¿Me regala un mapa?", intent: "ask_map" },
    { say: "¿Tienes mapas?", intent: "ask_map" },
    { say: "Disculpe, ¿dónde queda la terminal de autobuses?", intent: "ask_where", slots: { place: "station" } },
    { say: "como llego al zocalo", intent: "ask_where", slots: { place: "square" } },
    { say: "Quiero ir al cenote", intent: "ask_where", slots: { place: "cenote" } },
    { say: "¿Cómo llego a Chemuyil?", intent: "ask_where", slots: { place: "chemuyil" } },
    { say: "¿Dónde es el tianguis?", intent: "ask_where", slots: { place: "tianguis" } },
    { say: "O sea, a la derecha y luego a la izquierda en el banco, ¿verdad?", intent: "confirm" },
    { say: "¿Está enfrente de Correos?", intent: "confirm" },
    { say: "¿Y está a mano derecha?", intent: "confirm" },
    { say: "Me perdí", intent: "lost" },
    { say: "Más o menos", intent: "lost", step: "confirm" },
    { say: "¿Se puede ir caminando?", intent: "ask_far" },
    { say: "A la izquierda", intent: "confirm", step: "confirm" },
    { say: "Solo estoy paseando", intent: "just_looking" },
    { say: "Acabo de llegar", intent: "just_arrived" },
    { say: "Perdí mi cartera", intent: "lost_item" },
    { say: "¿Qué es un cenote?", intent: "word_q", slots: { word: "cenote" } },
    { say: "No tomo café", intent: "no_coffee" },
    // Spain forms are correct, with no dialect correction.
    { say: "¿Tenéis mapas del pueblo?", intent: "ask_map" },
    { say: "¿Dónde cojo el autobús?", intent: "ask_busstop" },
    { say: "¿Cuántas manzanas son?", intent: "ask_blocks" },
    { say: "¿Dónde están los aseos?", intent: "ask_restroom" },
    { say: "Vale, gracias", intent: "yn:yes", step: "map" },
    // Meaning safety: no route, map or offer may be invented
    { say: "No quiero el mapa", intent: "map_no", not: ["ask_map", "accept_ctx"] },
    { say: "No necesito un mapa", intent: "map_no", not: ["ask_map"] },
    { say: "No quiero ir al museo", intent: "dest_neg", not: ["ask_where", "dest_short"] },
    { say: "No al museo, a la playa", intent: "dest_correction", not: ["dest_short", "ask_where"] },
    { say: "No me gusta el café", intent: "no_coffee", not: ["ask_coffee", "accept_ctx"] },
    { say: "Sigo derecho dos cuadras", intent: "confirm", not: ["dir_ans_ctx"] },
    { say: "No entendí la última parte", intent: "lost", not: ["understood"] },
    { say: "No me quedó claro", intent: "lost", not: ["understood"] },
    { say: "No necesito el wifi", intent: "none" },
    { say: "No perdí nada", intent: "none" },
    { say: "No busco el banco", intent: "dest_neg", not: ["ask_where"] },
    { say: "No hablo inglés", intent: "none" },
    { say: "No tengo más preguntas", intent: "more_no", not: ["more_yes"], step: "more" },
    // Nothing that isn't about the visit
    { say: "Mi perro toca la guitarra", intent: "none" },
    { say: "plátano bicicleta azul mapa", intent: "none" },
    { say: "Ayer compré una camisa verde", intent: "none" },
    // Review: natural forms learners use, and meaning safety
    { say: "No, gracias, ya tengo uno en el celular", intent: "map_no", not: ["ask_map", "accept_ctx"] },
    { say: "No busco el mapa", intent: "map_no", not: ["ask_map"] },
    { say: "Acabo de llegar, es mi primera vez aquí", intent: "just_arrived" },
    { say: "¿Puede repetirlo?", intent: "repeat_it" },
    { say: "Perdón, ¿lo podría repetir?", intent: "repeat_it" },
    { say: "¿Me lo escribe, por favor?", intent: "write_it" },
    { say: "Lo siento, hable más despacio", intent: "say_again_slowly" },
    { say: "¿Lo puede repetir más despacio?", intent: "say_again_slowly" },
    { say: "¿Me lo puede marcar en el mapa?", intent: "show_map" },
    { say: "Quisiera saber cómo llegar a la playa", intent: "ask_where", slots: { place: "beach" } },
    { say: "Estoy buscando un restaurante", intent: "ask_food" },
    { say: "Mejor al museo", intent: "dest_short", slots: { place: "museum" } },
    { say: "¿Me puede deletrear el nombre de la calle?", intent: "spell_q" },
    { say: "No, es todo, gracias", intent: "more_no", step: "more", not: ["more_yes"] },
    { say: "No, todavía no es todo", intent: "more_yes", step: "more", not: ["more_no"] },
    // Audit (5 Nov 2026): prices (never "¡Sí, es gratis!" for the museum or a trip), the hours of the place just
    // talked about, the taquería of the food tip, the colectivo's frequency, taxis, changing money, the kiosco
    { say: "¿Cuánto cuesta la entrada al museo?", intent: "place_price", slots: { place: "museum" }, not: ["map_free", "event_free"] },
    { say: "¿El museo es gratis?", intent: "place_price", slots: { place: "museum" }, not: ["map_free"] },
    { say: "¿Hay que pagar para entrar a las ruinas?", intent: "place_price", slots: { place: "ruins" } },
    { say: "¿Cuánto cuesta el cenote?", intent: "place_price", slots: { place: "cenote" }, not: ["event_free"] },
    { say: "¿Se paga en la playa?", intent: "place_price", slots: { place: "beach" } },
    { say: "¿Cuánto cuesta el mapa?", intent: "map_free", not: ["place_price"] },
    { say: "¿Tiene costo?", intent: "event_free" },
    { say: "¿Dónde está la taquería?", intent: "ask_where", slots: { place: "taqueria" } },
    { say: "¿A qué hora pasa el colectivo?", intent: "ask_buspass", not: ["ask_schedule"] },
    { say: "¿Cada cuánto pasan los colectivos?", intent: "ask_buspass" },
    { say: "¿A qué hora pasa el camión?", intent: "ask_schedule", not: ["ask_buspass"] },
    { say: "¿Dónde tomo un taxi?", intent: "ask_taxi" },
    { say: "¿Dónde es la música?", intent: "where_music" },
    { say: "¿Dónde puedo cambiar dólares?", intent: "ask_where" },
    { say: "¿A qué hora abre?", intent: "ask_place_hours", not: ["ask_hours"] },
    { say: "¿A qué hora abren?", intent: "ask_hours", not: ["ask_place_hours"] },
    { say: "¿El banco abre los sábados?", intent: "ask_place_hours", slots: { place: "bank" } },
    { say: "¿Dónde está el kiosco?", intent: "ask_where", slots: { place: "square" } },
  ],
  sims: [
    { name: "map first, café, repeat twice, then check", turns: ["¡Hola! ¿Me da un mapa, por favor?", "¿Cómo llego al Café La Ceiba?", "Perdón, ¿puede repetir?", "Perdón, ¿puede repetir?", "Entonces salgo a la derecha, camino dos cuadras y en el banco doy vuelta a la izquierda, ¿verdad?", "No, eso es todo. ¡Gracias!"], expect: { complete: true }, auto: AUTO },
    { name: "museum first with questions and a quiz, then the café", turns: ["Disculpe, ¿dónde está el museo?", "¿Está lejos?", "¿Se refiere al grande?", "Sí, creo que sí", "A la izquierda", "Sí, por favor", "¡Claro, gracias!", "¿Puede hablar más despacio, por favor?", "¿En el banco, a la izquierda?", "¡Gracias por su paciencia!"], expect: { complete: true }, auto: AUTO },
    { name: "wrong check gets corrected, a word, write it down, no café", turns: ["¡Hola!", "Busco la oficina de correos", "¿Qué significa banqueta?", "¿Me lo puede escribir?", "Entonces, ¿en el banco doy vuelta a la derecha?", "Ya entendí", "Sí, por favor", "No, gracias", "Eso es todo, gracias"], expect: { complete: true }, auto: AUTO },
    { name: "side questions and still learning", turns: ["¿Cuál es la contraseña del wifi?", "¿Cómo se escribe?", "Estoy aprendiendo español", "¿Dónde tomo el colectivo?", "A la playa, por favor", "¿Cuántas cuadras?", "¡Claro, gracias!", "Sí, por favor", "Entonces salgo a la derecha, camino dos cuadras y en el banco doy vuelta a la izquierda, ¿verdad?", "¡Adiós!"], expect: { complete: true }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
    { name: "just looking: the café offer, say it again slowly", turns: ["¡Hola! Solo estoy paseando.", "¡Claro, gracias!", "Perdón, ¿me lo repite más despacio?", "¿En el banco, a la izquierda?", "Sí, por favor", "Eso es todo, gracias"], expect: { complete: true }, auto: AUTO_OWN_OPENING },
    { name: "a second route, then bye before checking it", turns: ["¡Hola! ¿Me da un mapa, por favor?", "¿Cómo llego al Café La Ceiba?", "Entonces a la derecha y luego a la izquierda en el banco, ¿verdad?", "¿Cómo llego al museo?", "¡Adiós!"], expect: { complete: true, state: { byeNow: true } }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
    { name: "museum checked, bye at the café offer", turns: ["¡Hola! ¿Me da un mapa, por favor?", "¿Cómo llego al museo?", "Entonces salgo a la izquierda y está a la izquierda, ¿verdad?", "¡Adiós!"], expect: { complete: true, state: { cafeNo: true, byeNow: true } }, auto: AUTO },
    { name: "tricky word on the way to the bank (twist forced)", turns: ["¿Me da un mapa?", "¿Dónde está el banco?", "¿Qué significa banqueta?", "¿Al salir, a la derecha?", "No, gracias", "Eso es todo"], expect: { complete: true, state: { twistWord: "banqueta", cafeNo: true } }, auto: AUTO,
      setup: (s) => { s.wantTwist = true; } },
    { name: "recommendations outside town, spelling, then the café", turns: ["¿Qué me recomienda visitar?", "¿Cómo se escribe Xcacel?", "¿Qué es un cenote?", "¿Cómo llego a Chemuyil?", "¿Mande?", "Más despacio, por favor", "¿Cómo llego al Café La Ceiba?", "¿Dónde doy vuelta?", "Ya entendí, gracias", "Eso es todo"], expect: { complete: true, state: { trips: 1 } }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
    { name: "short answers", turns: ["Un mapa, por favor", "Al museo", "Sí", "A la izquierda", "No, gracias", "No"], expect: { complete: true, state: { cafeNo: true } }, auto: {},
      setup: (s) => { s.askMore = true; } },
    // Review: "derecho" (straight) is never "derecha", and in "No a la derecha, a la izquierda" the second one counts
    { name: "quiz: derecho, then a correction", turns: ["¿Me da un mapa?", "Al museo", "Sí", "Derecho, ¿no?", "No a la derecha, a la izquierda", "No, gracias", "No, es todo"], expect: { complete: true, state: { cafeNo: true, fixes: undefined, conf: { museum: true } } }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
    { name: "café offer: I already know it", turns: ["¿Me da un mapa?", "¿Dónde está el banco?", "¿Al salir, a la derecha?", "Sí, ya lo conozco", "Eso es todo"], expect: { complete: true, state: { cafeNo: true } }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
    // Audit: a price and the hours of the place just talked about, the taquería of the food tip, the colectivo
    { name: "museum price and hours, the taquería, the colectivo", turns: ["¿Me da un mapa?", "¿Es gratis el museo?", "¿A qué hora abre?", "¿Dónde puedo comer algo?", "¿Dónde está la taquería?", "¿Está junto al mercado?", "¿A qué hora pasa el colectivo?", "No, gracias", "Eso es todo, gracias"],
      expect: { complete: true, state: { cafeNo: true, conf: { taqueria: true } } }, auto: AUTO,
      setup: (s) => { s.askMore = true; } },
  ],
};

export default visitorCenter;
