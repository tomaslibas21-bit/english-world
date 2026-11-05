// NEEDS: None. Vocabulary, merges and the "not a name" guard are local.
// Song 79 "Where's My Parcel?" → Puerto Colibrí: "¿Dónde está mi paquete?".
// Correos on avenida Juárez, next to the bank, across from the zócalo's kiosco (the 3D town, TOWN.md "Getting around";
// audit 5 Nov 2026: it was "calle Ceiba, across from Café La Ceiba"). Gloria at the counter (usted). The learner sends a
// box of gifts home (the country is the learner's: Estados Unidos, Canadá, Inglaterra, Irlanda, Australia, Nueva
// Zelanda…): the "¿Trae algo líquido, frágil, perecedero o peligroso?" question, the weight in kilos (the learner may
// ask for pounds), standard or express (and the cheaper "económico" for small packets up to 2 kilos, with no
// tracking), the customs declaration (contents, value in pesos, "¿Es regalo?"), a fuller insurance, stamps (timbres,
// M → estampillas) for postcards, paying (cash or card; no phone payments here), the receipt and the número de guía.
// Twists (as in English): picking up a package with the "aviso" and an ID (visits ≥ 1), a missing remitente
// (visits ≥ 1), perfume (or tequila, batteries, fresh food) that can't be mailed abroad (learner-driven). The brief's
// twist: the learner has no aviso and asks where a package is; it is still "en la aduana" (visits ≥ 1, pickup visits).
// Research (Nov 2026), kept vague where unsure: Mexican post offices leave an aviso when nobody is home and hand the
// parcel over against an official photo ID; international parcels carry a customs declaration (contents, value,
// gift); parcels from abroad clear customs first and import taxes, when due, are paid at pickup; perfume, alcohol,
// loose batteries and perishable food can't be mailed abroad; the small-packet service goes up to 2 kilos. Prices,
// stamp price, insurance fee and opening hours are this town's (invented, plausible); no real company names are used.
// Audit (5 Nov 2026), Correos de México's "Tarifa Postal 2026" (correosdemexico.gob.mx, DATOSABIERTOS/Tarifas): a
// postcard or letter abroad (up to 20 g) is $11.50 to North America, $13.50 to Europe and South America, $15 to the rest
// of the world, so one $15 stamp a postcard (it was $22); an international parcel (first zone) $384 up to 1 kg and $640
// up to 3 kg, so the 2.4 kg box goes standard for $640 (it was $520); EMS (express) is priced in dollars by zone, from
// about $510 (1 kg, North America) to $1,260 (3 kg, Oceania): one flat express price per box stays. One price for every
// country is this town's simplification. Left out on purpose (owner/lead question): since 25 Mar 2026 a parcel to the
// US needs the sender's ID, both parties' email and phone, each item's country of manufacture, a declared value of
// $150–$14,500, and pays a 10% US charge on that value (sources in docs/es/reviews/s79-post.md).

import type { Ctx, EntityDef, Pending, Segment, SituationDef, StepDef, Suggestion } from "@/content/types";
import type { ConvCtx } from "@/convo/dialogue";
import { ent, t } from "@/content/dsl";
import { GLOBAL_HANDLERS } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

const DESTS: EntityDef[] = [
  ent("usa", "Estados Unidos", "the United States", "m", { chip: "Estados Unidos",
    forms: ["los estados unidos", "eeuu", "ee uu", "usa", "e u", "eu", "estados unidos de america", "texas", "california", "florida", "nueva york", "chicago", "los angeles", "houston", "miami"] }),
  ent("canada", "Canadá", "Canada", "m", { chip: "Canadá", forms: ["canada", "toronto", "montreal", "vancouver", "ontario", "quebec"] }),
  ent("uk", "Inglaterra", "England", "f", { chip: "Inglaterra", forms: ["el reino unido", "reino unido", "gran bretana", "londres", "manchester"] }),
  ent("ireland", "Irlanda", "Ireland", "f", { chip: "Irlanda", forms: ["dublin"] }),
  ent("australia", "Australia", "Australia", "f", { chip: "Australia", forms: ["sidney", "sydney", "melbourne"] }),
  ent("new_zealand", "Nueva Zelanda", "New Zealand", "f", { chip: "Nueva Zelanda", forms: ["nueva zelandia", "auckland"] }),
  ent("germany", "Alemania", "Germany", "f"),
  ent("spain", "España", "Spain", "f", { forms: ["espana"] }),
  ent("france", "Francia", "France", "f"),
];

// Things people send home (contents and customs). Mass and plural nouns take no article.
const THINGS: EntityDef[] = [
  ent("scarf", "rebozo", "shawl", "m", { pl: "rebozos", chip: "rebozo", forms: ["rebozos", "chal", "un chal", "bufanda", "una bufanda", "panuelo", "un panuelo", "rebocito"] }),
  ent("chocolate", "chocolate", "chocolate", "m", { art: "", chip: "chocolate", forms: ["chocolates", "chocolate de mesa", "chocolate mexicano", "tabletas de chocolate", "chocolate oaxaqueno"] }),
  ent("coffee", "café", "coffee", "m", { art: "", chip: "café", forms: ["cafe de chiapas", "cafe de veracruz", "cafe en grano", "cafe molido", "un paquete de cafe", "una bolsa de cafe"] }),
  ent("clothes", "ropa", "clothes", "f", { art: "", chip: "ropa", forms: ["playeras", "una playera", "camisetas", "una camiseta", "camisas", "una camisa", "un vestido", "vestidos", "un sueter", "calcetines",
    "zapatos", "unos zapatos", "pantalones", "una blusa", "blusas", "huaraches", "unos huaraches", "un sombrero", "una guayabera", "guayaberas", "mi ropa", "ropa de bebe"] }),
  ent("books", "libros", "books", "m", { art: "", chip: "libros", forms: ["un libro", "libro", "unos libros", "revistas"] }),
  ent("toys", "juguetes", "toys", "m", { art: "", chip: "juguetes", forms: ["un juguete", "juguete", "unos juguetes", "un peluche"] }),
  ent("candy", "dulces", "candy", "m", { art: "", chip: "dulces", forms: ["dulces tipicos", "dulces mexicanos", "galletas", "unas galletas", "botanas", "cacahuates", "dulces de tamarindo", "comida seca", "chiles secos"] }),
  ent("photos", "fotos", "photos", "f", { art: "", chip: "fotos", forms: ["unas fotos", "fotografias", "fotos impresas", "un album", "un album de fotos"] }),
  ent("souvenirs", "recuerdos", "souvenirs", "m", { art: "", chip: "recuerdos", forms: ["souvenirs", "artesanias", "una artesania", "artesania", "un recuerdito", "recuerditos", "regalos", "unos regalos", "un regalo",
    "regalitos", "alebrijes", "un alebrije", "una figurita de madera", "postales"] }),
  ent("stuff", "cosas", "things", "f", { art: "", chip: "cosas", forms: ["unas cosas", "cosas personales", "mis cosas", "cositas", "unas cositas", "cosas de la casa"] }),
  ent("hammock", "hamaca", "hammock", "f", { pl: "hamacas", chip: "hamaca", forms: ["hamacas", "una hamaca yucateca"] }),
];

const SERVICES: EntityDef[] = [
  ent("priority", "normal", "standard", "m", { art: "", chip: "normal", forms: ["el normal", "servicio normal", "el servicio normal", "regular", "el regular", "estandar", "el estandar", "certificado", "el certificado", "normal normal"] }),
  ent("express", "express", "express", "m", { art: "", chip: "express", forms: ["el express", "expres", "el expres", "exprés", "servicio express", "el servicio express", "mexpost", "urgente", "el urgente"] }),
  ent("first", "económico", "economy", "m", { art: "", chip: "económico", forms: ["el economico", "economico", "ordinario", "el ordinario", "correo ordinario", "el servicio economico", "el barato"] }),
];

// ---------------------------------------------------------------------------
// Package profiles (weight lines + prices in centavos), chosen in init. The heavier box can't go "económico" (2 kg max).

const PROFILES = [
  { weight: "weight_a", kilos: "kilos_a", priority: 64000, express: 89000, first: 0 },
  { weight: "weight_b", kilos: "kilos_b", priority: 38000, express: 69000, first: 26000 },
];
const INSURANCE = 5000;
const STAMP = 1500;
const TRACKING_WRITE = "Número de guía: CP482915736MX";

const prof = (c: Ctx) => PROFILES[c.s.profile ?? 0];
const priceOf = (c: Ctx, svc: string) => (prof(c) as any)[svc] as number;
// the insurance counts only with a package being sent (audit: "Quiero asegurarlo", then only stamps, charged $50)
const total = (c: Ctx) =>
  (c.s.sending && c.s.service ? priceOf(c, c.s.service) : 0) + (c.s.sending && c.s.insurance === true ? INSURANCE : 0) + (c.s.stampQty ? c.s.stampQty * STAMP : 0);

const sending = (c: Ctx) => !!c.s.sending && !c.s.sent;
const customsDone = (c: Ctx) => c.s.value !== undefined && (!c.s.askGift || c.s.gift !== undefined) && !!c.s.customsSigned;
const readyToPay = (c: Ctx) =>
  !c.s.paid && ((sending(c) && !!c.s.service && customsDone(c) && c.s.insurance !== "ask" && c.s.stamps !== "ask") || (!c.s.sending && !!c.s.stampQty));
/** Stamps asked for after the package was paid: a second, small payment (audit: they were never charged nor given). */
const unpaidStamps = (c: Ctx) => !!c.s.paid && !!c.s.stampQty && !c.s.stampsPaid && c.s.stamps !== "ask";
/** What is owed now: everything, or only the later stamps. */
const due = (c: Ctx) => (unpaidStamps(c) ? c.s.stampQty * STAMP : total(c));
/** The checklist follows the pickup story (twist visits, or whenever the learner asks) unless they are sending a package. */
const pickupPath = (c: Ctx) => (c.s.donePath ? c.s.donePath === "pickup" : (!!c.s.pickupTwist || !!c.s.pickup) && !c.s.sending);
const sendPath = (c: Ctx) => !pickupPath(c);

/** True the first time `key` is used in this learner turn (one answer may arrive as several segments). */
const turnKeys = new WeakMap<object, Set<string>>();
function firstInTurn(c: Ctx, key: string): boolean {
  let set = turnKeys.get(c);
  if (!set) { set = new Set(); turnKeys.set(c, set); }
  if (set.has(key)) return false;
  set.add(key);
  return true;
}

const walkSlots = (v: any, key: string): any => {
  if (!v || typeof v !== "object") return undefined;
  if (Array.isArray(v)) { for (const x of v) { const r = walkSlots(x, key); if (r !== undefined) return r; } return undefined; }
  if (Array.isArray(v[key]) && v[key].length && typeof v[key][0] !== "object") return v[key][0];
  if (v[key] !== undefined && typeof v[key] !== "object") return v[key];
  for (const [k, x] of Object.entries(v)) if (k !== "__tags") { const r = walkSlots(x, key); if (r !== undefined) return r; }
  return undefined;
};
const allTags = (v: any, seg?: Segment): string[] => {
  const out: string[] = [...(seg?.tags || [])];
  const walk = (o: any) => { if (!o || typeof o !== "object") return; if (Array.isArray(o)) { o.forEach(walk); return; } out.push(...(o.__tags || [])); for (const [k, x] of Object.entries(o)) if (k !== "__tags") walk(x); };
  walk(v);
  return out;
};

/** One-word replies that the {name} slot would swallow ("¿Mande?" read as a name): what they really are. */
const NOT_A_NAME: Record<string, string> = {
  perdon: "g_repeat", mande: "g_repeat", como: "g_repeat", que: "g_repeat", disculpe: "g_repeat",
  momento: "g_wait", espere: "g_wait", permitame: "g_wait",
  adios: "g_bye", gracias: "g_thanks", hola: "g_hello",
  entiendo: "ok", entendido: "ok", perfecto: "ok",
  si: "ok", claro: "ok", bueno: "ok", ok: "ok", vale: "ok", sale: "ok", va: "ok", listo: "ok", no: "no",
};
function notAName(c: Ctx, word: string): boolean {
  const g = NOT_A_NAME[word.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")];
  if (!g) return false;
  if (g !== "ok" && g !== "no") ((post.handlers as any)[g] ?? GLOBAL_HANDLERS[g])?.(c as ConvCtx, {});
  return true;
}

const heard = (c: Ctx) => (c.heard || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
/** "Está bien, gracias." / "Ok, gracias.": a polite closing that could be a yes or a no thanks (rule 17). */
const politeClosing = (c: Ctx) => /^\W*(esta bien|vale|ok|okay|bueno|perfecto|de acuerdo|muy bien)\W+(muchas )?gracias\W*$/.test(heard(c));

function bump(c: Ctx, key: string): number {
  c.s.asked = c.s.asked || {};
  const n = c.s.asked[key] ?? 0;
  c.s.asked[key] = n + 1;
  return n;
}

function startSending(c: Ctx, dest?: string) {
  c.s.task = c.s.task || "send";
  c.s.moreDone = false;
  c.s.sending = true;
  if (dest && !c.s.dest) c.s.dest = dest;
}

function weigh(c: Ctx) {
  if (c.s.weighed || !c.s.sending || !c.s.dest || c.s.contents === undefined) return;
  c.s.weighed = true;
  c.say("weigh");
  c.say(prof(c).weight);
}

function setService(c: Ctx, svc: string) {
  if (svc === "first" && !prof(c).first) { tooHeavy(c); return; }
  const had = c.s.service;
  c.s.service = svc;
  if (had !== svc) c.say("ack", { X: svc });
  // economy carries no insurance: a full insurance asked for earlier is dropped, and said (audit)
  if (svc === "first" && c.s.insurance === true) { c.s.insurance = false; c.say("insured_first"); }
}

/** "El económico es solo hasta 2 kilos": once; after that only "el normal es lo más barato". */
function tooHeavy(c: Ctx) {
  if (!c.s.toldHeavy) { c.s.toldHeavy = true; c.say("too_heavy_first"); }
  c.say("no_cheaper");
}

function finishSending(c: Ctx) {
  c.s.sent = true;
  c.s.served = true;
  c.say("receipt");
  // economy has no tracking (opt_first): no número de guía for it
  if (c.s.service !== "first") c.say("tracking_number");
  if (c.s.trackTip && c.s.service !== "first") c.say("track_online");
  c.event("give", c.s.service !== "first" ? { item: "receipt", text: TRACKING_WRITE } : { item: "receipt" });
  c.s.donePath = c.s.donePath || "send";
  c.complete();
}

// Answers the simulations give when Gloria asks an optional question.
const POST_AUTO: Record<string, string> = {
  gift: "Sí, es un regalo.", insurance: "No, gracias.", stamps_offer: "No, gracias.", stamps_qty: "Cinco, por favor.",
  return_addr: "¡Ay, perdón! Claro.", perfume: "Está bien, lo saco.", pick_notice: "Sí, aquí está.", pick_name: "Ryan Miller",
  pick_sign: "Claro.", pick_id: "Aquí está mi pasaporte.", customs: "Gracias.",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------
// Suggestions

const S_SEND: Suggestion = { lt: "Say you'd like to send a package home", hint: "send", options: "dest" };
const S_PICKUP: Suggestion = { lt: "Pick up a package, or ask where yours is", hint: "pickup" };
const S_STAMPS: Suggestion = { lt: "Buy stamps for postcards", hint: "stamps" };
const S_ASK: Suggestion = { lt: "Ask about the price, the time or tracking", hint: "ask" };

const MAIN = ["send_package", "pickup", "buy_stamps"];

function helpStep(id: string, withPickup: boolean): StepDef {
  return {
    id,
    when: (c) => !!c.s.pickupTwist === withPickup,
    done: (c) => !!c.s.task,
    ask: (c) => {
      const n = bump(c, "help");
      if (n === 0) { c.say("next"); return; }
      c.say("ask_help");
    },
    expects: MAIN,
    suggest: withPickup ? [S_PICKUP, S_SEND, S_STAMPS] : [S_SEND, S_STAMPS, S_ASK],
    help: (c) => { c.say("ask_help"); },
  };
}

// ---------------------------------------------------------------------------

export const post: SituationDef = {
  id: "s79-post",
  song: 79,
  songTitle: "Where's My Parcel?",
  title: { en: "¿Dónde está mi paquete?", lt: "Where's My Package?" },
  topic: { en: "En el correo", lt: "At the post office" },
  chapter: 3,
  order: 4,
  location: "post-office",
  npc: "gloria",
  goal: "Send a package home and get its tracking number.",
  intro: "The post office on Avenida Juárez, next to the bank and across from the zócalo. You're in line with a box of gifts for your family back home: a rebozo (a Mexican shawl), Mexican chocolate, and coffee. Gloria is at the counter. Prices are in pesos.",
  entities: { dest: DESTS, thing: THINGS, service: SERVICES },

  grammar: {
    macros: {
      pkg: "(este paquete | esta caja | un paquete | una caja | mi paquete | estas cajas | dos cajas | un regalo | unos regalos | esto | este | algo | este paquetito | un paquetito | esta cajita | una cajita | este sobre | un sobre | la caja | el paquete)",
      sendv: "(mandar | enviar)",
      fam: "(mi mama | mi mamá | mi madre | mi familia | mis papas | mis padres | mi hermana | mi hermano | mi hijo | mi hija | mis hijos | un amigo | una amiga | mi amigo | mi amiga | mis sobrinos | mi abuela | mi novia | mi novio | mi esposa | mi esposo)",
      to_dest: "((a | para) {dest} | (a | para) @fam en {dest} #h:dest_mom | (a | para) mi (casa | pais) en {dest})",
      svcnp: "([el] {service} | el (mas barato | mas economico) #cheap | el (mas rapido | rapido) #fast | el primero #first | el segundo #second | el tercero #third | el de (una semana) #fast | el de (dos a tres semanas | tres semanas) #std)",
      qty: "(un | una | unos | unas | dos | tres | algo de | un poco de | una caja de | una bolsa de | un paquete de | una tableta de | unas tabletas de | un kilo de | medio kilo de)",
      frag: "((una | un | unas | unos | dos | tres) [pequena | pequeno | pequenas | pequenos] (taza | tazas | plato | platos | jarrito | jarritos | jarron | florero | vaso | vasos | figura | figuras | figurita | adorno | adornos | espejo | marco) [de (barro | talavera | ceramica | vidrio | cristal | porcelana)] | (talavera | ceramica | barro | vidrio | cristal | porcelana) | algo de (vidrio | cristal | barro | ceramica))",
      fresh: "(queso | carne | fruta | fruta fresca | pescado | pastel | un pastel | comida casera | comida fresca | tamales | unos tamales | mangos | aguacates | carnes frias | jamon)",
      booze: "([una | dos] [botella | botellas | botellita] [de] (tequila | mezcal | vino | licor | rompope | ron | cerveza | xtabentun))",
      liquids: "([un | una] [frasco | botella | botellita | bote] [de] (vainilla | miel | cajeta | salsa | salsa picante | jarabe | aceite | crema))",
      thingp: "([@qty] [nuevo | nueva | nuevos | nuevas | pequeno | pequena | bonito | bonita | bonitos | bonitas | tipico | tipica | tipicos | tipicas] {thing} | [un | una botella de | unos] (perfume | perfumes) #perfume | @booze #alcohol | [unas | unos | dos] (baterias | pilas | bateria | pila) #hazard | @frag #fragile | @liquids #liquid)",
      things: "(@thingp [[y] @thingp] [y @thingp] [y @thingp])",
      danger: "(liquido | liquidos | fragil | peligroso | peligrosos | perecedero | perecederos | inflamable | de eso | asi | por el estilo | raro)",
      nodanger: "(perfume | perfumes | baterias | pilas | liquidos | vidrio | comida | alcohol | nada fragil | nada liquido | nada peligroso)",
    },
    slots: {},
  },

  intents: {
    // --- what the learner came for
    send_package: { patterns: [
      "(quisiera | queria | me gustaria) @sendv @pkg [por correo] [@to_dest] #h:send_like", "(puedo | podria | se puede) @sendv @pkg [por correo] [@to_dest] #h:send_could",
      "(necesito | tengo que) @sendv @pkg [por correo] [@to_dest] #h:send_need", "(quiero | vengo a | vine a) @sendv @pkg [por correo] [@to_dest] #h:send_want",
      "(tambien | y tambien | ademas) (quisiera | quiero | necesito | me gustaria) @sendv @pkg [por correo] [@to_dest]",
      "(quisiera | quiero | necesito | puedo | podria) (mandarlo | enviarlo | mandarla | enviarla | mandar | enviar) @to_dest",
      "(tengo | traigo) (un paquete | una caja | esto | este paquete | esta caja | un regalo) (para | a) {dest} #h:send_have",
      "@pkg (va | es) (a | para) {dest} #h:send_going", "@pkg (va | es) (a | para) @fam en {dest}",
      "cuanto (cuesta | sale | cobran | me cobra | es | costaria) @sendv @pkg [por correo] [@to_dest] #h:send_howmuch",
      "(puedo | se puede | podria) @sendv @pkg al extranjero #h:send_overseas", "(quisiera | quiero | necesito) @sendv @pkg al extranjero",
      "(un | una) (paquete | caja) (a | para) {dest}", "(un | una) (paquete | caja) @to_dest",
      "(me ayuda | me puede ayudar | puede ayudarme | me puedes ayudar #tip:tu_staff) a @sendv @pkg [por correo] [@to_dest]",
      "(quisiera | quiero | necesito) hacer un envio [internacional] [@to_dest]", "(es | seria) un envio [internacional] @to_dest",
      "como (mando | envio | puedo mandar | puedo enviar) @pkg [@to_dest]",
      "no (vengo | vine) a recoger [nada] [sino que] (quiero | quisiera | necesito | vengo a | vine a) @sendv @pkg [por correo] [@to_dest]",
      "[aqui] se (mandan | envian | pueden mandar | pueden enviar) paquetes [al extranjero | internacionales | @to_dest]", "(aqui | donde) (puedo | se puede) (mandar | enviar) (un paquete | paquetes) [al extranjero | @to_dest]",
    ] },
    dest_ans: { patterns: [
      "@to_dest #h:dest_to", "{dest}", "(va | es) @to_dest", "(lo | la) (mando | envio) @to_dest", "es para @fam en {dest}", "@fam en {dest}", "(a | para) {dest} en {country:dest}",
      // corrections: the second country is the answer
      "no (a | para) {wrong:dest} [sino] @to_dest", "no es (a | para) {wrong:dest} es @to_dest", "(a | para) {wrong:dest} no @to_dest",
    ] },
    pickup: { patterns: [
      "(vengo a | quisiera | quiero | necesito | vine a) recoger (un | mi | el) paquete #h:pick_like",
      "(me dejaron | tengo | traigo) (un | este | el) aviso [de (un paquete | entrega)] #h:pick_notice",
      "no estaba [en casa | en mi casa] [y] (me dejaron un aviso | no me lo entregaron | me dejaron este aviso) #h:pick_missed",
      "donde esta mi paquete #h:pick_where", "(quiero | quisiera) saber donde esta mi paquete",
      "(vengo | vine) por (un | mi | el) paquete", "(puedo | podria | se puede) recoger (mi | un) paquete", "busco (mi | un) paquete",
      "estoy esperando un paquete [de {dest}]", "(no me ha llegado | no ha llegado | no me llega | nunca llegó) (un | mi) paquete",
      "(me mandaron | me enviaron) un paquete [de {dest}] [y no (ha llegado | llega | me llega | me ha llegado)]",
      "(me dejaron | dejaron) un aviso (en mi puerta | en la puerta | en mi casa)", "el cartero (vino | paso) [pero] no estaba [en casa]",
      "(tengo | traigo) (un | el) aviso (para recoger | de) (un | mi) paquete", "(paquete | paqueteria) para recoger",
      "no estaba [en casa | en mi casa] [cuando (vino | paso) el cartero]", "(me lo | me la) (mandaron | enviaron) (de | desde) {dest} [pero | y] [(no ha llegado | no llega | todavia no llega | nunca llegó | no me ha llegado)]",
      "no (vengo | vine) a (mandar | enviar) [nada] (vengo | vine) a recoger (un | mi | el) paquete",
    ] },
    buy_stamps: { patterns: [
      "(me da | me puede dar | me vende | me puede vender | quisiera | quiero | necesito | me gustaria comprar | quisiera comprar) [unos | unas] (timbres | estampillas | sellos) [para [mandar | enviar] (postales | unas postales | una postal | cartas | una carta | unas cartas)] [(a | para) {dest}] #h:stamps_could",
      "(venden | tiene | tienen | hay) (timbres | estampillas | sellos)", "(quiero | quisiera | necesito) (mandar | enviar) (postales | una postal | unas postales | unas tarjetas postales | una carta) [(a | para) {dest}] #h:stamps_need",
      "[y] (tambien | ademas) (timbres | estampillas) [para (postales | cartas)]", "(timbres | estampillas) [para (postales | cartas)]",
      "[si] para (postales | unas postales | una postal | cartas) [(a | para) {dest}]",
      "(cuanto | cuantos) (timbres | estampillas) (necesito | lleva) [para (una postal | postales)]",
    ] },

    // --- sending
    contents_ok: { patterns: [
      "[no] (solo | nada mas | nomas | puro | pura | puros | puras) @things [para @fam] #h:contents_just",
      "[no] (es | son | trae | traigo | hay | lleva | contiene) (solo | nada mas | nomas | puro | pura) @things",
      "[no] nada de eso #h:contents_none", "[no] (nada | ninguna cosa) (de eso | asi | por el estilo | raro | especial)",
      "@things [para @fam] #h:items_list", "(es | son | trae | hay | lleva | contiene | traigo) @things [para @fam] [adentro]",
      "[no] no (trae | traigo | tiene | hay | lleva | llevo | contiene) nada @danger [(ni | o | y) @danger] [(ni | o | y) @danger]",
      "[no] nada @danger [(ni | o | y) @danger] [(ni | o | y) @danger]",
      "[no] no (trae | traigo | tiene | hay | lleva) @nodanger [ni @nodanger] [ni @nodanger] [ni nada (asi | de eso | por el estilo | parecido)]",
      "[no] no es (fragil | peligroso | liquido)", "[no] (nada de | sin) @nodanger [ni @nodanger]", "(perfume | perfumes | baterias | pilas | liquidos | alcohol) no", "[no] (el perfume | la botella | las baterias | las pilas | la comida) (lo | la | las) (dejé | saqué | quité) [en casa | en el hotel]", "[no] (todo | todo esta) (bien | normal | seguro)", "[no] (puras | solo) cosas secas", "[no] (es | son) (pura | solo) ropa",
    ] },
    // "No, nada." / "No, no trae nada.": only at the contents question
    contents_none_ctx: { patterns: ["[no] nada", "[no] no (trae | tiene | hay | lleva | traigo | llevo) nada", "[no] ninguna cosa"] },
    // "Peligroso.", "Sí, algo peligroso.": her own option back (audit: the offer probe); she asks what it is
    contents_danger_ctx: { patterns: ["[si] [es | algo | trae algo | hay algo | lleva algo | un poco] (peligroso | peligrosa | inflamable)", "[si] (es | son) (cosas | algo) (peligrosas | peligroso)"] },
    contents_fragile: { patterns: [
      "[si] es fragil #h:contents_fragile", "[si] es fragil (son | es | trae | hay | lleva) @frag", "[si] (trae | hay | lleva | traigo | tiene | son) @frag [adentro]", "[si] @frag [para @fam]",
      "(es | esta) (un poco | algo | muy) fragil", "[si] (algo | un poco) fragil [adentro]", "[si] (trae | hay | lleva) algo fragil [adentro]",
      "(con cuidado | cuidado | tenga cuidado) es fragil", "[si] (son | es) cosas fragiles", "[si] son fragiles", "@frag (son | es) (fragil | fragiles)",
    ] },
    contents_perishable: { patterns: [
      "[si] (es | algo | trae algo | hay algo) perecedero", "[si] (trae | hay | traigo | lleva) [un poco de | unos | unas] @fresh [adentro]",
      "[si] [un poco de | unos | unas] @fresh [para @fam]", "(puedo | se puede | podria) (mandar | enviar) @fresh",
    ] },
    contents_perfume: { patterns: [
      "[si] (trae | hay | lleva | traigo) [un | una botella de | unos | dos] (perfume | perfumes) [para @fam] [adentro]",
      "[si] (un | una botella de) perfume", "perfume", "(puedo | se puede | podria) (mandar | enviar) [un | el] perfume",
      "[si] (trae | hay | lleva | traigo) @booze #alcohol [para @fam]", "[si] @booze #alcohol", "(puedo | se puede) (mandar | enviar) @booze #alcohol",
    ] },
    contents_liquid: { patterns: [
      "[si] (trae | hay | traigo | lleva) @liquids [adentro]", "[si] @liquids [para @fam]", "[si] (trae | hay | lleva) algo liquido [adentro]",
      "[si] (es | algo) liquido [adentro]", "(puedo | se puede) (mandar | enviar) (vainilla | miel | cajeta | salsa | liquidos)",
    ] },
    contents_hazard: { patterns: [
      "[si] (trae | hay | traigo | lleva) [unas | unos | dos] (baterias | pilas | una bateria | una pila | un cargador portatil | una bateria externa)",
      "[si] (unas | dos) (baterias | pilas)", "(puedo | se puede) (mandar | enviar) (baterias | pilas)",
    ] },
    take_out: { patterns: [
      "[ah] [bueno | esta bien | ok | ni modo] (lo | la | los | las) saco #h:take_out", "[ah] [bueno | esta bien | ok | ni modo] (lo | la | los | las) (quito | dejo | dejo aqui | dejo en casa | dejo en el hotel)",
      "[bueno | esta bien | ok | ni modo] (sin | entonces sin) (perfume | baterias | pilas | tequila | la botella | eso) [entonces]",
      "[bueno | esta bien | ok] (lo | la | los | las) (voy a sacar | saco ahorita | saco ahora)", "(ahorita | ahora) (lo | la | los | las) saco",
      "[ah] no sabia [bueno | esta bien | ok | ni modo] (lo | la | los | las) (saco | quito)",
    ] },
    // "No lo saco", "No los quiero sacar": the learner won't take it out
    keep_it_ctx: { patterns: ["no (lo | la | los | las) (saco | quito)", "no (lo | la | los | las) (quiero | voy a | puedo) (sacar | quitar)", "no quiero sacar(lo | la | los | las)?", "prefiero no sacar(lo | la | los | las)?"] },
    what_hazard: { patterns: ["que (significa | quiere decir | es) (perecedero | peligroso | perecederos) [y (perecedero | peligroso)]", "(perecedero | peligroso) que (significa | es)",
      "que (cosas)? no (se pueden | se puede | puedo) (mandar | enviar) [al extranjero]", "que (cosas | articulos) (estan prohibidos | no estan permitidos)", "que es lo que no se puede (mandar | enviar)"] },
    service_ans: { patterns: [
      "[el] {service} [por favor] #bare #h:svc_please", "(me llevo | quiero | quisiera | prefiero | deme | me da | voy a querer | mejor | me quedo con | escojo | elijo) @svcnp #h:svc_take",
      "@svcnp (esta bien | me parece bien | por favor | estaria bien)", "[el] (mas barato | mas economico) #cheap #h:svc_cheaper",
      "[el] (mas rapido) #fast #h:svc_faster", "creo que @svcnp", "@svcnp creo",
      "(quiero | prefiero) (lo mas barato | la opcion mas barata) #cheap", "(quiero | prefiero) (lo mas rapido | la opcion mas rapida) #fast",
      "[@svcnp] [porque] (no tengo prisa | no hay prisa | no tengo apuro | no es urgente) #cheap", "[@svcnp] [porque] (es urgente | lo necesito rapido | es para un cumpleanos | tengo prisa) #fast",
      "no [el] {wrong:service} (sino | mejor) @svcnp", "{wrong:service} no mejor @svcnp",
      "(quiero | prefiero) (el | uno) (que tenga | con) (rastreo | numero de guia) #std",
    ] },
    service_not: { patterns: ["[no] no (quiero | necesito) [el] {service}", "{service} no", "[no] el {service} no"] },
    // "No el caro": only at the choice of service ("No es caro" is one slip away)
    not_dear_ctx: { patterns: ["[no] no el (caro | mas caro) [el otro]", "el caro no [el otro]"] },
    ask_cheaper: { patterns: [
      "(hay | tiene | tienen) (algo | uno | alguno | otro | alguna opcion) mas barat(o | a) #h:q_cheaper", "no (hay | tiene | tienen) (algo | uno | otro | alguna opcion) mas (barato | barata | economico)",
      "cual es (el | la opcion) mas (barato | barata | economico | economica)", "(esta | es) (muy | un poco | algo | bastante) caro", "(es | esta) [muy | un poco | algo | bastante | tan] caro el {service}", "[el] {service} (es | esta) [muy | un poco | algo | bastante | tan] caro", "que tal (algo | uno) mas barato", "hay (una | otra) opcion mas (barata | economica)",
    ] },
    ask_faster: { patterns: ["cual es (el | la opcion) mas rapid(o | a)", "(hay | tiene | tienen) (algo | uno | otro) mas rapido", "cual llega mas rapido", "cual (es | sale) mas rapido"] },
    ask_options: { patterns: ["que opciones (hay | tiene | tienen)", "cuales son las opciones", "cual es la diferencia", "como lo puedo mandar", "que me recomienda", "que servicios (hay | tiene | tienen)"] },
    ask_price: { patterns: [
      "cuanto (cuesta | es | sale | seria | me cobra | va a costar | cobran) #h:q_price", "cuanto (cuesta | es | sale) el {service}", "cual es el precio", "que precio tiene",
      "cuanto (cuesta | es | sale) el seguro #ins", "cuanto (cuesta | cuestan | vale | valen | sale | salen) (un timbre | los timbres | una estampilla | las estampillas | mandar una postal) [(a | para) {dest}] #stamp",
      "cuanto es en total", "cuanto (seria | es) todo", "[y] [el] {service} cuanto (cuesta | es | sale)",
      // audit: whole questions, so that a price question never adds the insurance, stamps or a service (rule 17)
      "cuanto (seria | es | sale | queda | costaria | cobran | cuesta) [todo] con [el] seguro [completo] #ins", "cuanto (cobran | cuesta | es | sale) (por | de) [el] seguro [completo] #ins",
      "(y si | que pasa si) (lo | la) aseguro #ins",
      "cuanto (cuesta | cuestan | vale | valen | sale | salen | seria | serian | son) {number} (timbres | estampillas | sellos) #stamp", "cuanto (cuesta | vale | sale) cada (uno | una | timbre | estampilla) #stamp",
      "cuanto (seria | es | sale | costaria | cuesta) (con | por) [el] {service}", "(y si | que pasa si) (lo | la) (mando | envio) [por | en | con] [el] {service}",
    ] },
    ask_time: { patterns: [
      "cuanto (tarda | tiempo tarda | se tarda | tardaria | va a tardar | tiempo se tarda | tiempo) [en llegar] [el {service}] #h:q_long", "(cuando | en cuanto tiempo) (llega | llegaria | va a llegar)",
      "cuantos dias (tarda | son | se tarda)", "[el {service}] (llega | llegaria | va a llegar) antes (de navidad | de la proxima semana | del {day})", "que tan rapido (es | llega) [el {service}]",
      "[y] [el] {service} (cuanto | cuanto tiempo | en cuanto tiempo) (tarda | se tarda | llega) [en llegar]", "(cuando | en cuanto tiempo) (llega | llegaria) el {service}",
    ] },
    ask_tracking: { patterns: [
      "(lo | la) (puedo | podre) rastrear #h:q_track", "(puedo | se puede) rastrear(lo | la)? [en linea | por internet]", "(tiene | trae | lleva | incluye) (rastreo | numero de guia | guia | seguimiento)",
      "(como | donde) (lo | la) rastreo", "donde (esta | viene) el numero de guia", "(me da | me dan) (un | el) numero de guia", "hay (rastreo | seguimiento)",
      "[y] [el] {service} (tiene | trae | incluye | lleva) (rastreo | numero de guia | guia | seguimiento)", "[y] el {service} se puede rastrear", "(tiene | trae | incluye | lleva) (rastreo | numero de guia | seguimiento) el {service}",
    ] },
    ask_insured: { patterns: ["(esta | va) asegurado #h:q_insured", "(tiene | incluye | lleva | trae) seguro [el {service}]", "hay seguro", "y si se pierde", "que pasa si se pierde",
      "[y] [el] {service} [no] (tiene | incluye | lleva | trae) seguro",
      "(puedo | se puede | podria) asegurar(lo | la)? #can", "que cubre el seguro [basico | completo] #cover", "(cuanto | hasta cuanto | que tanto) cubre [el seguro] [basico] #cover"] },
    ask_kilos: { patterns: ["cuanto es en libras #h:q_kilos", "(y | eso) en libras", "cuantas libras (son | es | pesa)", "cuanto pesa", "cuanto pesa en libras"] },
    ask_customs: { patterns: ["(necesito | tengo que | hay que) llenar (algo | una forma | un formulario | la declaracion | un formato)", "que es (la | una) declaracion [de aduana]", "para que es (eso | esto | la declaracion)", "por que (necesita | necesito) (eso | la declaracion)"] },
    what_write: { patterns: ["que (pongo | escribo) [aqui | ahi]", "que (le | tengo que | debo) (poner | escribir)", "que necesita saber"] },
    value_ans: { patterns: [
      "[son | es | vale | valen | todo vale] (como | unos | mas o menos | aproximadamente | menos de | alrededor de | casi) {price} [pesos | en total] #h:value_about",
      "(vale | valen | cuesta | todo vale | el valor es | en total son | en total) {price} [pesos | en total] #h:value_is",
      "{price} [pesos] (en total | todo)", "(como | unos) {price} dolares #usd", "[vale] (como | unos) {price} [pesos] creo",
    ] },
    value_ctx: { patterns: ["{price}", "{price} pesos", "[no] no (vale | es) (mucho | tanto | caro) #low"] },
    gift_yes: { patterns: [
      "[si] es (un | una) regalo [para @fam] #h:gift_yes", "[si] (son | es) regalos [para @fam]", "[si] es para @fam", "[si] es un regalo de (cumpleanos | navidad | aniversario)",
      "[si] regalo [para @fam]", "[si] son (unos regalos | regalitos)", "[si] es regalo",
    ] },
    gift_no: { patterns: ["[no] no es [un] regalo #h:gift_no", "[no] no (es | son) [un] (regalo | regalos) [(son | es)] (mis cosas | cosas mias | mi ropa | para mi | mio | mias | mios)", "[no] no son regalos", "[no] (son | es) (mis cosas | cosas mias | mi ropa | para mi | mio | mias)"] },
    return_ok: { patterns: [
      "[ah] (claro | por supuesto | si) (ahorita lo pongo | lo pongo | se lo pongo | lo escribo | ahorita lo escribo | ahora lo pongo)", "(ahorita | ahora) (lo | se lo) (pongo | escribo)",
      "(donde | en donde) lo (pongo | escribo)", "[ay] se me olvidó [ponerlo]", "[perdon] (lo olvidé | se me pasó)",
    ] },
    return_ctx: { patterns: ["[ay | ah] (perdon | disculpe | una disculpa) [claro | si | por supuesto | ahorita] #h:return_ok", "[ay | ah] (claro | si) (perdon | disculpe)"] },
    what_return: { patterns: [
      "que es (el | un) remitente #h:what_return", "que (significa | quiere decir) remitente", "(mi | cual) direccion", "(cual | que) direccion (pongo | escribo)",
      "(pongo | escribo) (mi | la) direccion (de aqui | de mexico | de puerto colibri | de aca) #here", "(la | mi) direccion (de aqui | de mexico | de puerto colibri) #here",
      "(pongo | escribo) (mi | la) direccion de (mi pais | estados unidos | canada | mi casa) #home", "no tengo (direccion | casa) (aqui | en mexico) #home",
    ] },
    insurance_yes: { patterns: [
      "[si] (quiero | quisiera) (asegurarlo | el seguro | seguro adicional | el seguro completo | el seguro adicional) #h:ins_yes", "[si] (asegurelo | aseguremelo | agreguele el seguro)",
      "[si] mejor (asegurarlo | con seguro)",
    ] },
    // audit: "Mejor sí", "Por si acaso", "Con seguro" mean the insurance only at its offer (at "¿Es regalo?" or the stamps
    // they added $50: rule 2)
    insurance_ctx: { patterns: ["mejor si", "[si] por si acaso", "[si] con [el] seguro [completo]"] },
    insurance_no: { patterns: [
      "[no] no (necesito | quiero) [el] seguro [adicional | completo] #h:ins_no", "[no] sin seguro [adicional]", "[no] con el [seguro] basico (esta bien | es suficiente | basta)",
      "[no] el (seguro | seguro basico) (esta bien | es suficiente | basta)", "[no] no vale tanto",
    ] },
    stamps_qty: { patterns: [
      "{number} (timbres | estampillas | sellos)", "(quiero | quisiera | necesito | me da | deme | me puede dar) {number} (timbres | estampillas | sellos)", "dame {number} (timbres | estampillas | sellos) #tip:tu_staff",
      "(solo | nada mas | nomas) (uno | una) [timbre | estampilla] #h:stamps_one", "(son | es) para {number} postales",
    ] },
    stamps_ctx: { patterns: ["{number} #h:stamps_qty", "(solo | nada mas | nomas) {number}", "(quiero | quisiera | necesito | me da | deme | me puede dar) {number}", "dame {number} #tip:tu_staff"] },
    // "No necesito", "Ninguno": a no to the offer that is open (insurance, stamps)
    no_need_ctx: { patterns: ["[no] no (lo | la | los | las)? (necesito | quiero) [nada] [gracias]", "[no] (ninguno | ninguna | ya no | mejor ninguno)"] },
    no_stamps: { patterns: ["[no] no (necesito | quiero) (timbres | estampillas | sellos) [hoy | por ahora | gracias]", "[no] (timbres | estampillas) no", "[no] sin timbres"] },

    // --- paying
    pay_card: { patterns: [
      "(en)? efectivo no [sino] (con)? tarjeta", "no (en)? efectivo [sino] (con)? tarjeta",
      "(puedo | se puede) pagar con tarjeta [de credito | de debito] #h:pay_card", "con tarjeta [de credito | de debito] #h:pay_card_short", "tarjeta", "(aceptan | acepta | toman | reciben) tarjeta [de credito | de debito]",
      "(aceptan | acepta) (visa | mastercard | american express | amex)", "(voy a | quiero | prefiero) pagar con tarjeta", "(le pago | pago) con tarjeta", "con (visa | mastercard | debito | credito)",
      // a what-if is a question: "Sí, aceptamos tarjeta.", paid on the hand-over (rule 17)
      "(y si | que tal si) (pago | le pago) con tarjeta #q",
    ] },
    no_cash: { patterns: ["no (tengo | traigo) [suficiente] (efectivo | cash | dinero en efectivo)", "no (puedo | quiero) pagar en efectivo"] },
    no_card_ctx: { patterns: ["no (tengo | traigo) (tarjeta | la tarjeta) [aqui | conmigo]", "no (tengo | traigo) (tarjeta | la tarjeta) [aqui | conmigo] [pago | le pago] en efectivo", "no (quiero | puedo) pagar con tarjeta"] },
    pay_cash: { patterns: [
      "(con)? tarjeta no [sino] (en | con)? efectivo", "no (con)? tarjeta [sino] (en | con)? efectivo", "(puedo | se puede) pagar en efectivo #q",
      "(pago | le pago | voy a pagar | prefiero pagar) en efectivo #h:pay_cash", "(en | con) efectivo", "efectivo", "(aceptan | acepta) efectivo #q",
      "(y si | que tal si) (pago | le pago) en efectivo #q",
    ] },
    ask_dollars: { patterns: ["(aceptan | acepta | toman | reciben) (dolares | dolares americanos)", "(puedo | se puede) pagar (en | con) dolares", "(solo)? (tengo | traigo) dolares"] },
    pay_phone: { patterns: ["(puedo | se puede) pagar con (el celular | mi celular | el telefono | apple pay | google pay)", "(aceptan | acepta) (apple pay | google pay | pago con celular)", "(con | por) (apple pay | google pay | el celular)", "apple pay", "google pay"] },
    here_you_go: { patterns: [
      "aqui (tiene | esta) #h:here_you_go", "tenga", "tome", "aqui (tiene | esta) (el | mi) (aviso | dinero | efectivo | tarjeta)", "aqui (lo | la) tiene #h:notice_here",
      "(lo | la) tengo en (mi | el) (celular | telefono) [le tomé (foto | una foto)]", "[si] aqui (lo | la) traigo", "aqui tienes #tip:tu_staff", "toma #tip:tu_staff", "ahi (va | le va)",
      "aqui (tiene | esta) {price} [pesos]", "(le doy | ahi le va | ahi va) {price} [pesos]", "(tengo | traigo) (una foto | foto) [del aviso] en (mi | el) (celular | telefono)",
    ] },

    // --- pickup
    show_doc: { patterns: [
      "aqui (esta | tiene) mi (pasaporte | identificacion | licencia | licencia de manejo | tarjeta de residente | credencial | credencial de residente | ine) #h:id_here",
      "(este es | traigo | tengo) mi (pasaporte | identificacion | licencia | licencia de manejo | tarjeta de residente | credencial de residente)",
      "(sirve | esta bien | puede ser) (mi | el | la) (pasaporte | licencia | licencia de manejo | tarjeta de residente | credencial)",
      "[le doy | le muestro] mi (pasaporte | licencia de manejo | tarjeta de residente)",
    ] },
    doc_ctx: { patterns: ["[si | claro] [mi | el | la] (pasaporte | identificacion | licencia | licencia de manejo | tarjeta de residente | credencial | credencial de residente)"] },
    // "No traigo mi pasaporte": only at the ID question
    no_id_ctx: { patterns: ["no (traigo | tengo | traje) (identificacion | mi pasaporte | el pasaporte | ninguna identificacion | mi identificacion | mi licencia) [aqui | conmigo]", "[no] (lo | la) (dejé | olvidé) en (el hotel | casa | mi casa)"] },
    // after "sin identificación no puedo entregárselo" (audit): a photo of it, or coming back later
    id_photo_ctx: { patterns: ["(sirve | vale | acepta | aceptan | puedo mostrarle | le puedo mostrar | le enseno) [una] foto (del | de mi) (pasaporte | identificacion | ine | licencia)",
      "(tengo | traigo) [una] foto (del | de mi) (pasaporte | identificacion) [en (mi | el) (celular | telefono)]", "(y | sirve) [una] foto"] },
    come_back_ctx: { patterns: ["[bueno | ok | entonces | ni modo] (regreso | vuelvo | vengo) (manana | mas tarde | luego | despues | otro dia | al rato | en un rato) [con (mi pasaporte | mi identificacion)]",
      "[bueno | ok | entonces | ni modo] (regreso | vuelvo | vengo) con (mi pasaporte | mi identificacion)", "[bueno | ok | entonces | ni modo] (voy por | voy a traer | voy a buscar) (mi pasaporte | mi identificacion)"] },
    // "No tengo el número de guía": a no to "¿Tiene el número de guía?" (it went unanswered)
    no_guia_ctx: { patterns: ["[no] no (tengo | traigo | se) (el | ningun | mi) (numero | numero de guia | guia | numero de rastreo)", "[no] no tengo (numero | numero de guia | guia)"] },
    no_notice: { patterns: [
      "[no] (lo | se me) (perdí | perdió) [el aviso] #h:notice_lost", "[no] lo tiré", "[no] (lo dejé | se me olvidó) [el aviso] [en (casa | el hotel | mi casa)]",
      "[no] no (lo | la) (traigo | tengo | traje) [aqui | conmigo]", "[no] no (tengo | traigo | traje) (el | ningun | un) aviso", "[no] no me dejaron [ningun | el | un] aviso #h:notice_none", "[no] no (lo | la) encuentro",
      "nunca me dejaron [ningun] aviso",
    ] },
    name_ctx: { patterns: ["[esta | viene | es] a nombre de {name} #h:name_its", "{name}", "(me llamo | soy | mi nombre es) {name}", "(esta | viene) a mi nombre #mine", "(es | viene) para {name}"] },
    signed: { patterns: ["(ya firmé | ya esta firmado | listo ya firmé) #h:sign_done", "(listo | ya esta)", "(donde | en donde) (firmo | le firmo)"] },
    sign_ctx: { patterns: ["(claro | si claro | con gusto | por supuesto) #h:sign_ok", "(ya | listo | ya quedó | ahi esta)"] },
    tracking_ctx: { patterns: [
      "[es | el numero es | el numero de guia es | la guia es] {digits}", "es el {digits}", "(el numero | el numero de guia) es el {digits}", "[si] (tengo | traigo) el numero de guia #have #h:guia_have",
      "(lo | la) tengo en (mi | el) (celular | telefono | correo)", "aqui esta el numero de guia",
    ] },
    // the package at customs (twist): "¿Tengo que pagar algo?", "¿Qué hago?", "¿Cuándo lo liberan?"
    customs_q_ctx: { patterns: [
      "(tengo que | hay que | debo) pagar (algo | impuestos) #tax #h:q_cus_pay", "(voy a | hay que) pagar impuestos #tax", "(cuanto | cuanto voy a) pagar de impuestos #tax",
      "que (hago | tengo que hacer | puedo hacer | debo hacer) [ahora] #what #h:q_cus_what", "y ahora que #what",
      "(cuando | para cuando) (lo liberan | sale | sale de la aduana | me llega | llega aqui) #time", "por que (esta | lo tienen) en la aduana #why",
      "me (avisan | van a avisar | llaman) #notice",
    ] },

    // --- general
    more_no: { patterns: [
      "(eso | es) (es | seria) todo [por hoy] #h:more_all", "(seria | es) todo [por hoy]", "[no] eso es todo #h:more_its", "por ahora es todo",
      "creo que es todo", "[no] ya (es todo | estoy | quedé)", "nada mas [por hoy]",
      // "Gracias, es todo." was read as a bare thanks and "¿Algo más?" came again (audit; as s76)
      "[muchas | mil] gracias (es | eso es | eso seria | seria) todo",
    ] },
    need_tape: { patterns: ["(me presta | me da | tiene | tienen | me regala) [un poco de] (cinta | diurex | cinta adhesiva | masking)", "(venden | tienen) cajas #box", "(puedo | podria) comprar una caja #box"] },
    ask_open: { patterns: ["a que hora (cierran | abren)", "(que | cual es el) horario [tienen]", "(abren | trabajan) (los sabados | los domingos | el sabado | el domingo)", "hasta que hora (abren | estan abiertos)"] },
    // audit: where the postcards go after the stamps
    ask_mailbox: { patterns: ["donde (esta | hay) [el | un] buzon", "(tienen | hay) [un] buzon", "donde (dejo | echo | pongo | meto | deposito) (las | mis | la | mi | estas | esta) (postales | postal | cartas | carta)",
      "las (dejo | puedo dejar) (aqui | con usted)", "se las (dejo | doy) [aqui | a usted]"] },
  },

  lines: {
    next: [
      t("¡Siguiente, | por favor!", "Next, | please!", "Next, please!"),
      t("¡El | que | sigue, | por favor!", "The | one who | follows, | please!", "Next in line, please!"),
      t("¡Buenos días! | Pase, | por favor.", "Good morning! | Come forward, | please.", "Good morning! Come on up."),
    ],
    ask_help: [
      t("¿En | qué | le | puedo | ayudar?", "In | what | (to) you | can I | help?", "How can I help you?"),
      t("¿Qué | se le ofrece?", "What | do you need?", "What can I do for you?", { flags: { 1: "se le ofrece: the counter's polite formula, literally is offered to you." } }),
    ],
    ask_dest: [
      t("Claro. | ¿A | dónde | lo | va | a | mandar?", "Sure. | To | where | it | are you going | to | send?", "Sure. Where are you sending it?", { flags: { 3: "lo: it, the package (el paquete)." } }),
      t("Con gusto. | ¿A | qué | país | va?", "Gladly. | To | what | country | is it going?", "Sure. What country is it going to?"),
    ],
    // the question again, after a side question (audit: "Depende del peso y del destino. Con gusto. ¿A qué país va?")
    dest_again: [t("¿A | qué | país | va?", "To | what | country | is it going?", "What country is it going to?")],
    // a price asked before she has the weight and the country (audit: she quoted, and said "too heavy", unweighed)
    price_depends: [t("Depende | del | peso | y | del | destino.", "It depends | on the | weight | and | on the | destination.", "It depends on the weight and where it's going.")],
    dest_ok: [
      t("Claro, | es | un | envío | internacional.", "Sure, | it's | a | shipment | international.", "Sure, so it's an international shipment."),
      t("Claro, | con gusto.", "Sure, | gladly.", "Sure, happy to help."),
    ],
    dest_set: [t("Muy | bien, | a | {X}.", "Very | good, | to | {X}.", "Okay, to {X}.")],
    ask_contents: [
      t("¿Trae | algo | líquido, | frágil, | perecedero | o | peligroso?", "Does it carry | something | liquid, | fragile, | perishable | or | dangerous?", "Is there anything liquid, fragile, perishable, or hazardous in it?"),
      t("¿Lleva | algo | frágil | o | líquido | adentro?", "Does it carry | something | fragile | or | liquid | inside?", "Anything fragile or liquid in there?"),
      t("¿No trae | perfume, | baterías | o | algo | frágil?", "Doesn't it have | perfume, | batteries | or | something | fragile?", "No perfume, batteries, or anything fragile?"),
    ],
    hazmat_what: [t("¿Qué | trae?", "What | does it have?", "What's in it?")],
    hazard_explain: [
      t("Perecedero | es | comida | que | se echa a perder, | y | peligroso, | por ejemplo, | las | baterías.", "Perishable | is | food | that | goes bad, | and | dangerous, | for example, | — | batteries.",
        "Perishable means food that can go bad, and hazardous means things like batteries.", { flags: { 8: "las: Spanish uses the article for things in general." } }),
    ],
    contents_ok: [t("Muy | bien.", "Very | good.", "Okay, great."), t("Perfecto.", "Perfect.", "Perfect.")],
    fragile_ok: [t("Muy | bien, | le | pongo | una | etiqueta | de | “Frágil”.", "Very | good, | (on) it | I-put | a | label | of | “Fragile”.", "Okay, I'll put a “Fragile” sticker on it.",
      { flags: { 2: "le: on it, the box." } })],
    liquid_ok: [t("Está bien, | siempre y cuando | vaya | bien | cerrado.", "That's fine, | as long as | it goes | well | sealed.", "That's fine, as long as it's sealed well.")],
    perfume_no: [t("Ay, | perdón, | los | perfumes | no se pueden | mandar | al extranjero | por | correo.", "Oh, | sorry, | — | perfumes | can't be | sent | abroad | by | mail.", "Oh, sorry, perfume can't be mailed abroad.",
      { flags: { 2: "los: Spanish uses the article for things in general." } })],
    alcohol_no: [t("Ay, | perdón, | las | bebidas | alcohólicas | no se pueden | mandar | por | correo.", "Oh, | sorry, | — | drinks | alcoholic | can't be | sent | by | mail.", "Oh, sorry, alcohol can't be sent by mail.",
      { flags: { 2: "las: Spanish uses the article for things in general." } })],
    perfume_out: [t("Tiene | que | sacarlo.", "You have | to | take it out.", "You'll need to take it out.", { flags: { 2: "sacarlo: lo is the perfume (el perfume)." } })],
    alcohol_out: [t("Tiene | que | sacarla.", "You have | to | take it out.", "You'll need to take it out.", { flags: { 2: "sacarla: la is the bottle (la botella)." } })],
    battery_out: [t("Tiene | que | sacarlas.", "You have | to | take them out.", "You'll need to take them out.", { flags: { 2: "sacarlas: las is the batteries (las baterías)." } })],
    perishable_out: [t("Tiene | que | sacarla.", "You have | to | take it out.", "You'll need to take it out.", { flags: { 2: "sacarla: la is the food (la comida)." } })],
    perfume_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thanks a lot.")],
    perfume_keep: [t("Si | no | lo | saca, | no | lo | puedo | mandar.", "If | not | it | you-take-out, | not | it | I-can | send.", "If you don't take it out, I can't send it.")],
    perfume_rule: [t("Lo siento, | son | las | reglas.", "I'm sorry, | they are | the | rules.", "I'm sorry, those are the rules.")],
    perishable_no: [t("Ay, | perdón, | no podemos | mandar | comida | perecedera | al extranjero.", "Oh, | sorry, | we can't | send | food | perishable | abroad.", "Oh, sorry, we can't send perishable food abroad.")],
    battery_no: [t("Las | baterías | sueltas | no se pueden | mandar | al extranjero, | lo siento.", "— | batteries | loose | can't be | sent | abroad, | I'm sorry.", "Loose batteries can't be sent abroad, I'm afraid.",
      { flags: { 0: "Las: Spanish uses the article for things in general." } })],
    weigh: [
      t("Déjeme | pesarlo.", "Let me | weigh it.", "Let me weigh it."),
      t("A ver, | póngalo | en | la | báscula.", "Let's see, | put it | on | the | scale.", "Okay, let's put it on the scale."),
    ],
    weight_a: [t("Pesa | 2.4 | kilos.", "It weighs | 2.4 | kilos.", "It weighs 2.4 kilos.", { say: "Pesa dos kilos cuatrocientos." })],
    weight_b: [t("Pesa | 800 | gramos.", "It weighs | 800 | grams.", "It weighs 800 grams.", { say: "Pesa ochocientos gramos." })],
    kilos_a: [t("Son | como | cinco | libras.", "That's | about | five | pounds.", "That's about five pounds.")],
    kilos_b: [t("Son | casi | dos | libras.", "That's | almost | two | pounds.", "That's almost two pounds.")],
    ask_service: [
      t("¿Cómo | lo | quiere | mandar?", "How | it | do you want | to send?", "How would you like to send it?"),
      t("Tiene | dos | opciones.", "You have | two | options.", "You have two options."),
    ],
    first_q: [t("¿Le | parece | bien | el | económico?", "(To) you | does it seem | good | the | economy (one)?", "Is economy okay with you?")],
    ask_service_which: [t("Entonces, | ¿cuál | prefiere?", "So, | which | do you prefer?", "So, which one would you like?")],
    ask_service_again: [t("Entonces, | ¿normal | o | express?", "So, | standard | or | express?", "So, standard or express?"),
      t("¿Cuál | prefiere, | el | normal | o | el | express?", "Which | do you prefer, | the | standard (one) | or | the | express (one)?", "Which would you like, standard or express?")],
    opt_priority: [t("El | normal | tarda | de | dos | a | tres | semanas | y | cuesta | {$price}.", "The | standard (one) | takes | from | two | to | three | weeks | and | costs | {$price}.",
      "Standard takes two to three weeks and costs {$price}.")],
    opt_express: [t("El | express | tarda | más o menos | una | semana | y | cuesta | {$price}.", "The | express (one) | takes | more or less | one | week | and | costs | {$price}.",
      "Express takes about a week and costs {$price}.")],
    opt_first: [t("El | económico | es | más | barato, | {$price}, | pero | no tiene | rastreo | y | puede | tardar | más | de | un | mes.",
      "The | economy (one) | is | more | cheap, | {$price}, | but | it doesn't have | tracking | and | it can | take | more | than | one | month.",
      "Economy is cheaper, {$price}, but it has no tracking and can take over a month.")],
    too_heavy_first: [t("El | económico | es | solo | hasta | 2 | kilos.", "The | economy (one) | is | only | up to | 2 | kilos.", "Economy only goes up to 2 kilos.",
      { say: "El económico es solo hasta dos kilos." })],
    no_cheaper: [t("Para | esta | caja, | el | normal | es | lo | más | barato.", "For | this | box, | the | standard (one) | is | the | most | cheap.", "For this box, standard is the cheapest option.")],
    fastest: [t("El | express | es | el | más | rápido: | más o menos | una | semana.", "The | express (one) | is | the | most | fast: | more or less | one | week.", "Express is the fastest: about a week.")],
    svc_later: [t("Claro, | en | un | momento | vemos | eso.", "Sure, | in | a | moment | we-see | that.", "Sure, we'll get to that in a moment.")],
    svc_then: [t("Muy | bien, | entonces | el | {X}.", "Very | good, | then | the | {X}.", "Okay, {X} then.")],
    ack: [t("Buena | elección.", "Good | choice.", "Good choice."), t("De acuerdo.", "Agreed.", "All right."), t("Muy | bien, | el | {X}.", "Very | good, | the | {X}.", "Okay, {X} it is.")],
    value_ok: [t("Muy | bien, | lo | anoto.", "Very | good, | it | I-write-down.", "Okay, I'll put that down."), t("Anotado.", "Noted.", "Got it.")],
    customs_intro: [
      t("Como | va | al extranjero, | hay que | llenar | la | declaración | de | aduana.", "Since | it's going | abroad, | we need to | fill out | the | declaration | of | customs.",
        "Since it's going abroad, we need to fill out a customs form."),
      t("Va | fuera | del | país, | así que | necesito | llenar | la | declaración | de | aduana.", "It's going | outside | of the | country, | so | I need | to fill out | the | declaration | of | customs.",
        "It's going out of the country, so I need to fill out a customs form."),
    ],
    customs_explain: [t("Es | para | la | aduana: | dice | qué | trae | y | cuánto | vale.", "It's | for | the | customs: | it says | what | it carries | and | how much | it's worth.",
      "It's for customs: it says what's inside and what it's worth.")],
    ask_what_inside: [
      t("¿Qué | trae | la | caja?", "What | does it carry | the | box?", "What's in the box?"),
      t("A ver, | ¿qué | contiene?", "Let's see, | what | does it contain?", "So, what's inside?"),
    ],
    ask_value: [
      t("¿Y | cuánto | vale | todo, | más o menos?", "And | how much | is worth | everything, | more or less?", "And roughly how much is it all worth?"),
      t("¿Y | el | valor | total?", "And | the | value | total?", "And the total value?"),
    ],
    value_help: [t("Con | un | aproximado | está bien.", "With | an | estimate | it's fine.", "A rough estimate is fine.")],
    write_help: [t("Nomás | ponga | las | cosas | y | cuánto | valen, | en | pesos.", "Just | put | the | things | and | how much | they're worth, | in | pesos.",
      "Just list the items and what they're worth, in pesos.",
      { flags: { 0: "Mexican: nomás = just, only." },
        neutral: t("Solo | ponga | las | cosas | y | cuánto | valen, | en | pesos.", "Just | put | the | things | and | how much | they're worth, | in | pesos.", "Just list the items and what they're worth, in pesos.") })],
    ask_gift: [t("¿Es | regalo?", "Is it | a gift?", "Is it a gift?")],
    gift_mark: [t("Muy | bien, | lo | marco | como | regalo.", "Very | good, | it | I-mark | as | gift.", "Okay, I'll mark it as a gift.")],
    gift_fix: [t("Ah, | perdón, | entonces | no | lo | marco | como | regalo.", "Oh, | sorry, | then | not | it | I-mark | as | gift.", "Oh, sorry, then I won't mark it as a gift.")],
    gift_not: [t("Está bien, | no hay problema.", "That's fine, | no problem.", "Okay, no problem.")],
    sign_customs: [
      t("Fírmeme | aquí, | por favor.", "Sign for me | here, | please.", "Just sign here, please.", { flags: { 0: "Fírmeme: firme (sign) + me (for me), a friendly way to ask." } }),
      t("¿Me | firma | aquí, | por favor?", "(For) me | you-sign | here, | please?", "Could you sign here, please?"),
    ],
    signed_thanks: [t("Gracias.", "Thank you.", "Thank you."), t("Perfecto, | gracias.", "Perfect, | thanks.", "Perfect, thanks.")],
    return_missing: [
      t("Ay, | no tiene | remitente.", "Oh, | it doesn't have | sender.", "Oh, there's no return address on it.", { flags: { 2: "remitente: the sender's name and address on a package." } }),
      t("Ay, | le | falta | el | remitente.", "Oh, | (to) it | is missing | the | sender.", "Oh, it's missing the return address.", { flags: { 4: "remitente: the sender's name and address on a package." } }),
    ],
    return_ask: [t("¿Me | lo | pone | aquí, | por favor?", "(For) me | it | you-put | here, | please?", "Could you write it here, please?", { flags: { 1: "lo: it, el remitente." } })],
    return_explain: [t("Es | su | nombre | y | su | dirección, | por si | lo | tienen | que | regresar.", "It's | your | name | and | your | address, | in case | it | they have | to | return.",
      "It's your name and address, in case it has to be sent back.")],
    return_here: [t("Sí, | la | de | aquí, | de | Puerto Colibrí.", "Yes, | the (one) | of | here, | of | Puerto Colibrí.", "Yes, your address here in Puerto Colibrí.")],
    return_either: [t("Puede | ser | la | de | aquí | o | la | de | su | país.", "It can | be | the (one) | of | here | or | the (one) | of | your | country.", "It can be your address here or back home.")],
    return_thanks: [t("¡Gracias! | Así | está | perfecto.", "Thanks! | Like this | it's | perfect.", "Thanks! That's perfect.")],
    ask_insurance: [t("Ya | incluye | un | seguro | básico. | ¿Quiere | asegurarlo | por | el | valor | completo? | Son | $50 | más.",
      "Already | it includes | a | insurance | basic. | Do you want | to insure it | for | the | value | full? | It's | 50 pesos | more.",
      "It already includes basic insurance. Would you like to insure it for the full value? It's 50 pesos more.",
      { say: "Ya incluye un seguro básico. ¿Quiere asegurarlo por el valor completo? Son cincuenta pesos más." })],
    ask_insurance_again: [t("¿Lo | asegura, | entonces?", "It | do you insure, | then?", "So, would you like the full insurance?")],
    // after "Está bien, gracias" (a yes or a no thanks): a plain yes-or-no question (audit, rule 17)
    ask_insurance_confirm: [t("Entonces, | ¿sí | lo | asegura | o | no?", "So, | yes | it | you-insure | or | not?", "So, do you want the full insurance or not?")],
    insured_first: [t("El | económico | no | lleva | seguro.", "The | economy (one) | not | carries | insurance.", "Economy doesn't come with insurance.")],
    insured_info: [t("Ya | incluye | un | seguro | básico.", "Already | it includes | a | insurance | basic.", "It already includes basic insurance.")],
    insurance_price: [t("El | seguro | completo | son | $50 | más.", "The | insurance | full | is | 50 pesos | more.", "Full insurance is 50 pesos more.", { say: "El seguro completo son cincuenta pesos más." })],
    insurance_cover: [t("El | básico | cubre | solo | una | parte; | el | completo | cubre | todo | el | valor.", "The | basic (one) | covers | only | a | part; | the | full (one) | covers | all | the | value.",
      "The basic one only covers part of it; the full one covers the whole value.")],
    insurance_added: [t("Muy | bien, | son | $50 | más.", "Very | good, | it's | 50 pesos | more.", "Okay, that's 50 pesos more.", { say: "Muy bien, son cincuenta pesos más." })],
    no_problem: [t("No hay problema.", "No problem.", "No problem.")],
    offer_stamps: [t("¿Va | a | querer | timbres | también?", "Are you going | to | want | stamps | too?", "Will you need any stamps too?",
      { flags: { 3: "Mexican: timbre = postage stamp; elsewhere estampilla." },
        neutral: t("¿Va | a | querer | estampillas | también?", "Are you going | to | want | stamps | too?", "Will you need any stamps too?") })],
    stamps_info: [t("Para | una | postal | al extranjero | es | un | timbre | por | postal.", "For | a | postcard | abroad | it's | one | stamp | per | postcard.", "For a postcard abroad, it's one stamp per card.",
      { flags: { 6: "Mexican: timbre = postage stamp; elsewhere estampilla." },
        neutral: t("Para | una | postal | al extranjero | es | una | estampilla | por | postal.", "For | a | postcard | abroad | it's | one | stamp | per | postcard.", "For a postcard abroad, it's one stamp per card.") })],
    // $15: Correos de México's 2026 rate for a postcard to the rest of the world, enough for any country (audit: was $22)
    stamps_price: [t("Cuestan | $15 | cada uno. | ¿Cuántos | quiere?", "They cost | 15 pesos | each. | How many | do you want?", "They're 15 pesos each. How many would you like?",
      { say: "Cuestan quince pesos cada uno. ¿Cuántos quiere?",
        neutral: t("Cuestan | $15 | cada una. | ¿Cuántas | quiere?", "They cost | 15 pesos | each. | How many | do you want?", "They're 15 pesos each. How many would you like?",
          { say: "Cuestan quince pesos cada una. ¿Cuántas quiere?" }) })],
    // the quantity question again, short (audit: the price was said twice in a row)
    stamps_how_many: [t("¿Cuántos | quiere?", "How many | do you want?", "How many would you like?",
      { neutral: t("¿Cuántas | quiere?", "How many | do you want?", "How many would you like?") })],
    stamp_cost: [t("Cada | timbre | cuesta | $15.", "Each | stamp | costs | 15 pesos.", "Each stamp is 15 pesos.",
      { say: "Cada timbre cuesta quince pesos.", flags: { 1: "Mexican: timbre = postage stamp; elsewhere estampilla." },
        neutral: t("Cada | estampilla | cuesta | $15.", "Each | stamp | costs | 15 pesos.", "Each stamp is 15 pesos.", { say: "Cada estampilla cuesta quince pesos." }) })],
    mailbox: [t("Me | las | puede | dar, | o | echarlas | ahí | en | el | buzón.", "(To) me | them | you-can | give, | or | drop-them | there | in | the | mailbox.",
      "You can give them to me, or drop them in the mailbox over there.", { flags: { 1: "las: them, the postcards (las postales)." } })],
    stamps_ok: [t("Claro, | aquí tiene.", "Sure, | here you go.", "Sure, here you go.")],
    stamps_sure: [t("Claro.", "Sure.", "Sure."), t("Muy | bien.", "Very | good.", "Okay.")],
    stamps_here: [t("Y | aquí | están | sus | timbres.", "And | here | are | your | stamps.", "And here are your stamps.",
      { flags: { 4: "Mexican: timbre = postage stamp; elsewhere estampilla." },
        neutral: t("Y | aquí | están | sus | estampillas.", "And | here | are | your | stamps.", "And here are your stamps.") })],
    ask_more: [t("¿Algo | más?", "Something | else?", "Anything else?"), t("¿Sería todo?", "Would that be all?", "Will that be everything?")],
    ask_more_yes: [t("Claro, | ¿qué | más | necesita?", "Sure, | what | else | do you need?", "Sure, what else can I do for you?")],
    say_total: [t("Son | {$total}.", "It's | {$total}.", "That's {$total}."), t("Serían | {$total}.", "It would be | {$total}.", "That'll be {$total}.")],
    ask_pay: [t("¿Va | a | pagar | en efectivo | o | con | tarjeta?", "Are you going | to | pay | in cash | or | with | card?", "Will that be cash or card?")],
    card_tap: [
      t("Muy | bien, | aquí | está | la | terminal.", "Very | good, | here | is | the | card reader.", "Okay, here's the card reader."),
      t("Acerque | o | inserte | su | tarjeta, | por favor.", "Bring near | or | insert | your | card, | please.", "Tap or insert your card, please."),
    ],
    card_later: [t("Sí, | aceptamos | tarjeta.", "Yes, | we-accept | card.", "Yes, we take cards.")],
    cash_yes: [t("Sí, | claro.", "Yes, | of course.", "Yes, of course.")],
    card_then: [t("No hay problema, | con | tarjeta | entonces.", "No problem, | with | card | then.", "No problem, card then.")],
    cash_then: [t("No hay problema, | en efectivo | entonces.", "No problem, | in cash | then.", "No problem, cash then.")],
    no_dollars: [t("Lo siento, | solo | aceptamos | pesos. | También | puede | pagar | con | tarjeta.", "I'm sorry, | only | we-accept | pesos. | Also | you-can | pay | with | card.", "Sorry, we only take pesos. You can also pay by card.")],
    no_phone_pay: [t("Lo siento, | aquí | solo | aceptamos | efectivo | o | tarjeta.", "I'm sorry, | here | only | we-accept | cash | or | card.", "Sorry, we only take cash or card here.")],
    cash_change: [t("Y | aquí | está | su | cambio.", "And | here | is | your | change.", "And here's your change.")],
    pay_later: [t("Claro, | ahorita | le | cobro.", "Sure, | in a moment | (from) you | I-charge.", "Sure, I'll ring you up in a moment.",
      { flags: { 1: "Mexican: ahorita = in a moment, soon." },
        neutral: t("Claro, | en | un | momento | le | cobro.", "Sure, | in | a | moment | (from) you | I-charge.", "Sure, I'll ring you up in a moment.") })],
    already_paid: [t("Ya | está | pagado, | gracias.", "Already | it is | paid, | thanks.", "It's already paid, thanks.")],
    receipt: [
      t("Aquí tiene | su | comprobante.", "Here you have | your | receipt.", "Here's your receipt."),
      t("¡Listo! | Aquí | está | su | recibo.", "Done! | Here | is | your | receipt.", "All set! Here's your receipt."),
    ],
    tracking_number: [t("Su | número | de | guía | es | CP482915736MX.", "Your | number | of | waybill | is | CP482915736MX.", "Your tracking number is CP482915736MX.",
      { say: "Su número de guía es ce, pe, cuatro ocho dos, nueve uno cinco, siete tres seis, eme, equis.", write: TRACKING_WRITE,
        spell: "ce, pe, cuatro, ocho, dos, nueve, uno, cinco, siete, tres, seis, eme, equis", flags: { 3: "guía: in Mexico the tracking number is el número de guía." } })],
    track_online: [t("Lo | puede | rastrear | en | la | página | del | correo.", "It | you-can | track | on | the | page | of the | post office.", "You can track it on the post office's website.")],
    tracking_yes: [t("Sí, | tiene | número | de | guía | para | rastrearlo.", "Yes, | it has | number | of | waybill | to | track it.", "Yes, it comes with a tracking number.")],
    tracking_no_first: [t("El | económico | no tiene | rastreo.", "The | economy (one) | doesn't have | tracking.", "Economy doesn't come with tracking.")],
    tracking_on_receipt: [t("Viene | en | su | comprobante, | arriba.", "It comes | on | your | receipt, | at the top.", "It's on your receipt, at the top.")],
    time_priority: [t("El | normal | tarda | de | dos | a | tres | semanas.", "The | standard (one) | takes | from | two | to | three | weeks.", "Standard takes two to three weeks.")],
    time_express: [t("El | express | tarda | más o menos | una | semana.", "The | express (one) | takes | more or less | one | week.", "Express takes about a week.")],
    time_first: [t("El | económico | puede | tardar | más | de | un | mes.", "The | economy (one) | can | take | more | than | one | month.", "Economy can take over a month.")],
    tape: [t("Claro, | ahí | en | la | mesa | hay | cinta.", "Sure, | there | on | the | table | there is | tape.", "Sure, there's tape over there on the table.")],
    boxes: [t("Sí, | tenemos | cajas | de | varios | tamaños, | ahí | en | el | estante.", "Yes, | we-have | boxes | of | several | sizes, | there | on | the | shelf.", "Yes, we have boxes in a few sizes, over there on the shelf.")],
    hours: [t("Abrimos | de | lunes | a | viernes, | de | ocho | a | cuatro, | y | los | sábados | de | nueve | a | una.",
      "We-open | from | Monday | to | Friday, | from | eight | to | four, | and | on | Saturdays | from | nine | to | one.", "We're open Monday to Friday, eight to four, and Saturdays nine to one.",
      { flags: { 10: "los sábados: the article with a weekday means every (on Saturdays)." } })],

    // pickup (twist)
    pickup_notice_q: [
      t("Claro. | ¿Trae | el | aviso?", "Sure. | Do you have | the | notice?", "Sure. Do you have the notice?"),
      t("Con gusto. | ¿Me | da | el | aviso | que | le | dejaron?", "Gladly. | (To) me | you-give | the | notice | that | (for) you | they-left?", "Of course. May I have the notice they left you?"),
    ],
    notice_thanks: [t("Gracias, | a ver.", "Thanks, | let's see.", "Thanks, let me see.")],
    ask_pickup_name: [t("No se preocupe. | ¿Tiene | el | número | de | guía? | Si | no, | ¿a | nombre | de | quién | viene?",
      "Don't worry. | Do you have | the | number | of | waybill? | If | not, | under | name | of | whom | does it come?",
      "Don't worry. Do you have the tracking number? If not, whose name is it under?")],
    ask_name_only: [t("Entonces, | ¿a | nombre | de | quién | viene?", "Then, | under | name | of | whom | does it come?", "Okay, so whose name is it under?")],
    ask_guia: [t("¿Me | lo | dicta, | por favor?", "(To) me | it | you-read-out, | please?", "Could you read it to me, please?", { flags: { 2: "dictar: to read something out for someone to write down." } })],
    name_thanks: [t("Gracias. | Déjeme | revisar.", "Thanks. | Let me | check.", "Thanks. Let me check.")],
    ask_pickup_id: [
      t("¿Me | presta | una | identificación?", "(To) me | you-lend | an | ID?", "May I see some ID?", { flags: { 1: "presta: lend; in Mexico staff ask to “borrow” your ID." } }),
      t("También | necesito | una | identificación | con | foto.", "Also | I need | an | ID | with | photo.", "I'll also need a photo ID."),
    ],
    go_get: [t("Gracias. | Un | momento, | se lo | traigo.", "Thanks. | One | moment, | it to you | I-bring.", "Thanks. One moment, I'll go get it.")],
    here_package: [t("¡Aquí está! | ¿Me | firma | aquí, | por favor?", "Here it is! | (For) me | you-sign | here, | please?", "Here it is! Could you sign here, please?")],
    found_here: [t("Sí, | aquí | lo | tenemos.", "Yes, | here | it | we-have.", "Yes, we have it here.")],
    sign_where: [t("Aquí, | abajo, | donde | dice | “Firma”.", "Here, | at the bottom, | where | it says | “Signature”.", "Right here, at the bottom, where it says “Signature.”")],
    ask_pickup_sign: [t("¿Me | firma | aquí, | por favor?", "(For) me | you-sign | here, | please?", "Could you sign here, please?")],
    pickup_done: [
      t("Listo. | ¡Aquí tiene | su | paquete!", "Done. | Here you have | your | package!", "All set. Here's your package!"),
      t("Gracias. | ¡Que | lo | disfrute!", "Thanks. | (I hope) | it | you-enjoy!", "Thank you. Enjoy!"),
    ],
    need_id_pickup: [t("Lo siento, | sin | identificación | no puedo | entregárselo.", "I'm sorry, | without | ID | I can't | hand it over to you.", "I'm sorry, I can't give it to you without an ID.")],
    id_which: [t("Sirve | su | pasaporte | o | su | tarjeta | de | residente.", "It works | your | passport | or | your | card | of | resident.", "Your passport or your residence card will do.")],
    id_original: [t("Lo siento, | tiene | que | ser | la | identificación | original.", "I'm sorry, | it has | to | be | the | ID | original.", "I'm sorry, it has to be the actual ID.")],
    keep_here: [t("Claro, | aquí | se lo | guardamos.", "Sure, | here | it for you | we-keep.", "Sure, we'll hold it for you here.", { flags: { 2: "se lo: it (el paquete) for you." } })],
    customs_here: [t("Mmm, | su | paquete | todavía | está | en | la | aduana.", "Hmm, | your | package | still | is | in | the | customs.", "Hmm, your package is still at customs.")],
    customs_notice: [t("Cuando | la | aduana | lo | libere, | nos | llega | aquí | y | le | dejamos | un | aviso.",
      "When | the | customs | it | releases, | (to) us | it arrives | here | and | (for) you | we-leave | a | notice.", "Once customs releases it, it comes here and we'll leave you a notice.")],
    customs_track: [t("Mientras, | puede | ver | dónde | va | con | el | número | de | guía.", "Meanwhile, | you can | see | where | it goes | with | the | number | of | waybill.",
      "In the meantime, you can follow it with the tracking number.")],
    customs_time: [t("Puede | tardar | unos | días | o | unas | semanas; | depende | de | la | aduana.", "It can | take | some | days | or | some | weeks; | it depends | on | the | customs.",
      "It can take a few days or a few weeks; it depends on customs.")],
    customs_tax: [t("A veces | hay que | pagar | impuestos. | Si | es | así, | se los | cobramos | aquí | cuando | llegue.",
      "Sometimes | one has to | pay | taxes. | If | it is | so, | them from you | we-charge | here | when | it arrives.", "Sometimes there are import taxes. If so, we collect them here when it arrives.")],
    customs_why: [t("Todo | lo que | viene | del | extranjero | pasa | por | la | aduana.", "Everything | that | comes | from | abroad | goes | through | the | customs.", "Everything from abroad goes through customs.")],
    customs_what: [t("Nada, | nomás | espere | el | aviso.", "Nothing, | just | wait for | the | notice.", "Nothing, just wait for the notice.",
      { flags: { 1: "Mexican: nomás = just, only." }, neutral: t("Nada, | solo | espere | el | aviso.", "Nothing, | just | wait for | the | notice.", "Nothing, just wait for the notice.") })],
    customs_notify: [t("Sí, | le | dejamos | el | aviso | en | su | casa.", "Yes, | (for) you | we-leave | the | notice | at | your | house.", "Yes, we'll leave the notice at your place.")],

    bye: [
      t("¡Que | tenga | buen | día!", "(I hope) | you have | good | day!", "Have a nice day!"),
      t("Gracias, | ¡que | le | vaya | bien!", "Thanks, | (I hope) | (for) you | it-goes | well!", "Thanks, take care!"),
    ],
  },

  domains: {
    price: () => [...new Set(PROFILES.flatMap((p) => [p.priority, p.express, p.first]).filter((x) => x > 0))],
    total: () => {
      const s = new Set<number>();
      for (const p of PROFILES) for (const svc of [p.priority, p.express, p.first, 0]) for (const ins of [0, INSURANCE]) for (let n = 0; n <= 50; n++) s.add(svc + ins + n * STAMP);
      return [...s].filter((x) => x > 0);
    },
  },

  hints: {
    send: {
      lt: "Say you'd like to send a package", slot: "dest", examples: ["usa", "canada", "uk", "ireland", "australia"],
      items: [
        { id: "send_like", s: t("Quisiera | mandar | este | paquete | a | {X}.", "I'd like | to send | this | package | to | {X}.", "I'd like to send this package to {X}.") },
        { id: "send_could", s: t("¿Puedo | mandar | esto | a | {X}?", "Can I | send | this | to | {X}?", "Can I mail this to {X}?") },
        { id: "send_need", s: t("Necesito | enviar | esta | caja | a | {X}.", "I need | to send | this | box | to | {X}.", "I need to send this box to {X}.") },
        { id: "send_going", s: t("Esto | va | para | {X}.", "This | is going | for | {X}.", "This is going to {X}.") },
        { id: "send_want", s: t("Quiero | mandar | esto | a | {X}.", "I want | to send | this | to | {X}.", "I want to send this to {X}."), note: "Quiero is fine at a counter; quisiera sounds a little softer." },
        { id: "send_have", s: t("Tengo | un | paquete | para | {X}.", "I have | a | package | for | {X}.", "I have a package for {X}.") },
        { id: "send_howmuch", s: t("¿Cuánto | cuesta | mandar | esto | a | {X}?", "How much | does it cost | to send | this | to | {X}?", "How much is it to send this to {X}?") },
        { id: "send_overseas", s: t("¿Puedo | mandar | esto | al extranjero?", "Can I | send | this | abroad?", "Can I mail this overseas?") },
      ],
    },
    dest: {
      lt: "Say where it's going", slot: "dest", examples: ["usa", "canada", "uk", "ireland", "australia"],
      items: [
        { id: "dest_to", s: t("A | {X}.", "To | {X}.", "To {X}.") },
        { id: "dest_mom", s: t("Para | mi | familia | en | {X}.", "For | my | family | in | {X}.", "To my family in {X}.") },
      ],
    },
    contents: {
      lt: "Say what's inside", slot: "thing", examples: ["scarf", "chocolate", "coffee", "clothes"],
      items: [
        { id: "contents_just", s: t("No, | solo | {X.np}.", "No, | only | {X.np}.", "No, just {X.np}.") },
        { id: "contents_none", s: t("No, | nada | de | eso.", "No, | nothing | of | that.", "No, nothing like that.") },
        { id: "contents_fragile", s: t("Sí, | es | frágil.", "Yes, | it's | fragile.", "Yes, it's fragile.") },
        { id: "take_out", s: t("Ah, | bueno. | Lo | saco.", "Oh, | okay. | It | I-take-out.", "Oh, okay. I'll take it out.") },
      ],
    },
    service: {
      lt: "Choose how to send it", slot: "service", examples: ["priority", "express"],
      items: [
        { id: "svc_please", s: t("El | {X}, | por favor.", "The | {X}, | please.", "The {X} one, please.") },
        { id: "svc_take", s: t("Me llevo | el | {X}.", "I'll take | the | {X}.", "I'll take the {X} one.") },
        { id: "svc_cheaper", s: t("El | más | barato, | por favor.", "The | most | cheap, | please.", "The cheapest one, please.") },
        { id: "svc_faster", s: t("El | más | rápido, | por favor.", "The | most | fast, | please.", "The fastest one, please.") },
        { id: "q_cheaper", s: t("¿Hay | algo | más | barato?", "Is there | something | more | cheap?", "Is there anything cheaper?") },
      ],
    },
    ask: {
      lt: "Ask about the price, the time or tracking",
      items: [
        { id: "q_price", s: t("¿Cuánto | cuesta?", "How much | does it cost?", "How much is it?") },
        { id: "q_long", s: t("¿Cuánto | tarda?", "How long | does it take?", "How long does it take?") },
        { id: "q_track", s: t("¿Lo | puedo | rastrear?", "It | can I | track?", "Can I track it?") },
        { id: "q_insured", s: t("¿Está | asegurado?", "Is it | insured?", "Is it insured?") },
        { id: "q_kilos", s: t("¿Cuánto | es | en | libras?", "How much | is it | in | pounds?", "How much is that in pounds?") },
      ],
    },
    customs: {
      lt: "Answer the customs questions",
      items: [
        { id: "value_about", s: t("Como | $800.", "About | 800 pesos.", "About 800 pesos.", { say: "Como ochocientos pesos." }) },
        { id: "value_is", s: t("Vale | unos | $1,000.", "It's worth | about | 1,000 pesos.", "It's worth about 1,000 pesos.", { say: "Vale unos mil pesos.", flags: { 1: "unos before a number: about, roughly." } }) },
      ],
    },
    insurance: {
      lt: "Answer about extra insurance",
      items: [
        { id: "ins_no", s: t("No, | gracias, | no hace falta.", "No, | thanks, | it's not necessary.", "No, thanks, that's okay.") },
        { id: "ins_yes", s: t("Sí, | quiero | asegurarlo.", "Yes, | I want | to insure it.", "Yes, I'd like to insure it.") },
        { id: "q_insured", s: t("¿Está | asegurado?", "Is it | insured?", "Is it insured?") },
      ],
    },
    stamps: {
      lt: "Buy stamps",
      items: [
        { id: "stamps_could", s: t("¿Me | da | timbres | para | postales?", "(To) me | you-give | stamps | for | postcards?", "Could I get some stamps for postcards?",
          { flags: { 2: "Mexican: timbre = postage stamp; elsewhere estampilla." },
            neutral: t("¿Me | da | estampillas | para | postales?", "(To) me | you-give | stamps | for | postcards?", "Could I get some stamps for postcards?") }) },
        { id: "stamps_need", s: t("Quiero | mandar | unas | postales.", "I want | to send | some | postcards.", "I'd like to send some postcards.") },
        { id: "stamps_qty", s: t("Cinco, | por favor.", "Five, | please.", "Five, please.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
        { id: "pay_cash", s: t("Pago | en efectivo.", "I-pay | in cash.", "I'll pay cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
      ],
    },
    pickup: {
      lt: "Pick up a package",
      items: [
        { id: "pick_like", s: t("Vengo | a | recoger | un | paquete.", "I come | to | pick up | a | package.", "I'm here to pick up a package.") },
        { id: "pick_missed", s: t("No estaba | en | casa | y | me | dejaron | un | aviso.", "I wasn't | at | home | and | (for) me | they-left | a | notice.", "I wasn't home, and they left me a notice.") },
        { id: "pick_notice", s: t("Tengo | este | aviso.", "I have | this | notice.", "I have this notice.") },
        { id: "pick_where", s: t("¿Dónde | está | mi | paquete?", "Where | is | my | package?", "Where's my package?") },
        { id: "notice_here", s: t("Aquí | lo | tiene.", "Here | it | you-have.", "Here it is.", { flags: { 1: "lo: it, el aviso." } }) },
        { id: "id_here", s: t("Aquí | está | mi | pasaporte.", "Here | is | my | passport.", "Here's my passport.") },
      ],
    },
    notice: {
      lt: "Show the notice (or say you don't have it)",
      items: [
        { id: "notice_here", s: t("Aquí | lo | tiene.", "Here | it | you-have.", "Here it is.", { flags: { 1: "lo: it, el aviso." } }) },
        { id: "notice_lost", s: t("No, | lo | perdí.", "No, | it | I-lost.", "No, I lost it.", { flags: { 1: "lo: it, el aviso." } }) },
        { id: "notice_none", s: t("No me dejaron | ningún | aviso.", "They didn't leave me | any | notice.", "They didn't leave me a notice.") },
      ],
    },
    pname: {
      lt: "Give the tracking number or your name",
      items: [
        { id: "guia_have", s: t("Tengo | el | número | de | guía.", "I have | the | number | of | waybill.", "I have the tracking number.") },
        { id: "name_its", s: t("Está | a nombre de | {$name} | {$surname}.", "It's | under the name of | {$name} | {$surname}.", "It's under {$name} {$surname}.") },
      ],
    },
    pid: {
      lt: "Show your ID",
      items: [
        { id: "id_here", s: t("Aquí | está | mi | pasaporte.", "Here | is | my | passport.", "Here's my passport.") },
        { id: "here_you_go", s: t("Claro, | aquí tiene.", "Sure, | here you go.", "Sure, here you go.") },
      ],
    },
    aduana: {
      lt: "Ask what happens now",
      items: [
        { id: "q_cus_pay", s: t("¿Tengo | que | pagar | algo?", "Do I have | to | pay | something?", "Do I have to pay anything?") },
        { id: "q_cus_what", s: t("¿Qué | hago?", "What | do I do?", "What should I do?") },
        { id: "q_long", s: t("¿Cuánto | tarda?", "How long | does it take?", "How long does it take?") },
      ],
    },
    items: {
      lt: "List what's in the box",
      items: [
        { id: "items_list", s: t("Un | rebozo, | chocolate | y | café.", "A | shawl, | chocolate | and | coffee.", "A rebozo, some chocolate, and coffee.", { flags: { 1: "rebozo: a traditional Mexican shawl." } }) },
        { id: "contents_just", s: t("Solo | ropa.", "Only | clothes.", "Just clothes.") },
      ],
    },
    remove: {
      lt: "Agree to take out what can't be sent",
      items: [{ id: "take_out", s: t("Ah, | bueno. | Lo | saco.", "Oh, | okay. | It | I-take-out.", "Oh, okay. I'll take it out.") }],
    },
    return: {
      lt: "Add your return address",
      items: [
        { id: "return_ok", s: t("¡Ay, | perdón! | Claro.", "Oh, | sorry! | Sure.", "Oh, sorry! Sure.") },
        { id: "what_return", s: t("¿Qué | es | el | remitente?", "What | is | the | sender?", "What's a return address?") },
      ],
    },
    gift: {
      lt: "Say whether it's a gift",
      items: [
        { id: "gift_yes", s: t("Sí, | es | un | regalo | para | mi | familia.", "Yes, | it's | a | gift | for | my | family.", "Yes, it's a gift for my family.") },
        { id: "gift_no", s: t("No, | no es | regalo.", "No, | it's not | a gift.", "No, it's not a gift.") },
      ],
    },
    sign: {
      lt: "Sign",
      items: [
        { id: "sign_ok", s: t("Claro.", "Sure.", "Sure.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "sign_done", s: t("Ya | firmé.", "Already | I-signed.", "Okay, I signed it.") },
      ],
    },
    stamps_n: {
      lt: "Say how many stamps you need",
      items: [
        { id: "stamps_qty", s: t("Cinco, | por favor.", "Five, | please.", "Five, please.") },
        { id: "stamps_one", s: t("Nada más | uno.", "Just | one.", "Just one.") },
      ],
    },
    more: {
      lt: "Say that's all",
      items: [
        { id: "more_all", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thank you.") },
        { id: "more_its", s: t("No, | eso | es | todo, | gracias.", "No, | that | is | all, | thanks.", "No, that's it, thanks.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With staff at a counter, usted is more polite: “¿Me puede ayudar?”, “Aquí tiene” (tú is for friends).", better: "¿Me puede ayudar?" },
  },

  merges: {
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → offers misreads the service formula: what can I do for you.", minimal: "Three words; qué stays separate." },
    "al extranjero": { reason: "lexical_expression", split: "al → to the + extranjero → foreigner misreads the adverb: abroad.", minimal: "Two words." },
    "se echa a perder": { reason: "lexical_expression", split: "se → itself + echa → throws + a → to + perder → lose is one verb: goes bad.", minimal: "Four words, one verb." },
    "por ejemplo": { reason: "lexical_expression", split: "por → by + ejemplo → example is the fixed adverb: for example.", minimal: "Two words." },
    "siempre y cuando": { reason: "lexical_expression", split: "siempre → always + y → and + cuando → when is one conjunction: as long as.", minimal: "Three words." },
    "más o menos": { reason: "lexical_expression", split: "más → more + o → or + menos → less is the fixed adverb roughly.", minimal: "Three words." },
    "así que": { reason: "lexical_expression", split: "así → like this + que → that misreads the connector: so.", minimal: "Two words." },
    "hay que": { reason: "lexical_expression", split: "hay → there is + que → that misreads the impersonal obligation: one has to / we need to.", minimal: "Two words; the verb stays separate." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if is one conjunction: in case.", minimal: "Two words." },
    "puerto colibrí": { reason: "lexical_expression", split: "puerto → port + colibrí → hummingbird would translate the town's name.", minimal: "The two-word name." },
    "no hace falta": { reason: "grammatical_fusion", split: "no → not + hace → makes + falta → lack is one negated expression: it's not necessary.", minimal: "Three words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say you're picking up a package", done: (c) => pickupPath(c) && !!c.s.pickup, when: pickupPath, optional: true },
    { lt: "Show the notice (or give the tracking number) and your ID", done: (c) => pickupPath(c) && !!c.s.pickId, when: (c) => pickupPath(c) && !c.s.customs, optional: true },
    { lt: "Sign and take your package", done: (c) => pickupPath(c) && !!c.s.pickedUp, when: (c) => pickupPath(c) && !c.s.customs, optional: true },
    { lt: "Find out where your package is", done: (c) => !!c.s.customs, when: (c) => pickupPath(c) && !!c.s.customs, optional: true },
    { lt: "Say where you're sending it", done: (c) => sendPath(c) && !!c.s.dest, when: sendPath, optional: true },
    { lt: "Say what's inside", done: (c) => sendPath(c) && c.s.contents !== undefined, when: sendPath, optional: true },
    { lt: "Take out what can't be sent", done: (c) => sendPath(c) && c.s.perfume === "out", when: (c) => sendPath(c) && !!c.s.perfume, optional: true },
    { lt: "Add your return address", done: (c) => sendPath(c) && !!c.s.returnDone,
      when: (c) => sendPath(c) && !!c.s.returnTwist && !!c.s.sending && !!c.s.weighed, optional: true },
    { lt: "Choose how to send it", done: (c) => sendPath(c) && !!c.s.service, when: sendPath, optional: true },
    { lt: "Fill out the customs form", done: (c) => sendPath(c) && customsDone(c), when: sendPath, optional: true },
    { lt: "Pay and get your tracking number", done: (c) => sendPath(c) && !!c.s.sent, when: sendPath, optional: true },
  ],

  steps: [
    helpStep("help", false),
    helpStep("help_pickup", true),
    // pickup (twist)
    { id: "pick_notice", when: (c) => !!c.s.pickup && c.s.notice === undefined, done: (c) => c.s.notice !== undefined,
      ask: (c) => c.say("pickup_notice_q"), expects: ["here_you_go", "no_notice", "tracking_ctx"],
      suggest: [{ lt: "Show the notice (or say you don't have it)", hint: "notice" }],
      yes: (c) => { if (c.s.notice !== undefined) return; c.s.notice = true; c.say("notice_thanks"); },
      no: (c) => { c.s.notice = false; } },
    { id: "pick_name", when: (c) => !!c.s.pickup && c.s.notice === false && !c.s.pickName, done: (c) => !!c.s.pickName,
      ask: (c) => c.say(c.s.noGuia ? "ask_name_only" : "ask_pickup_name"), expects: ["name_ctx", "tracking_ctx", "no_guia_ctx"],
      suggest: [{ lt: "Give the tracking number or your full name", hint: "pname" }],
      yes: (c) => { c.say("ask_guia"); c.expect(guiaPending()); },
      no: (c) => { c.s.noGuia = true; } },
    { id: "pick_id", when: (c) => !!c.s.pickup && !c.s.customs && c.s.notice !== undefined && (c.s.notice || !!c.s.pickName) && !c.s.pickId && !c.s.pickLater,
      done: (c) => !!c.s.pickId || !!c.s.pickLater,
      ask: (c) => c.say("ask_pickup_id"), expects: ["show_doc", "here_you_go", "doc_ctx", "no_id_ctx", "id_photo_ctx", "come_back_ctx"],
      suggest: [{ lt: "Show your ID", hint: "pid" }],
      yes: (c) => { gotPickupId(c); },
      no: (c) => { noId(c); } },
    { id: "pick_sign", when: (c) => !!c.s.pickup && !!c.s.pickId && !c.s.pickedUp, done: (c) => !!c.s.pickedUp,
      ask: (c) => { if (c.s.askedSign && bump(c, "pick_sign") === 0) return; c.say("ask_pickup_sign"); }, expects: ["signed", "here_you_go", "sign_ctx"],
      suggest: [{ lt: "Sign", hint: "sign" }],
      yes: (c) => { pickedUp(c); } },
    // sending
    { id: "dest", when: sending, done: (c) => !!c.s.dest,
      ask: (c) => c.say(bump(c, "dest") === 0 ? "ask_dest" : "dest_again"), expects: ["dest_ans"],
      suggest: [{ lt: "Say where it's going", hint: "dest", options: "dest" }] },
    { id: "hazmat", when: (c) => sending(c) && !!c.s.dest, done: (c) => c.s.contents !== undefined,
      ask: (c) => c.say("ask_contents"),
      expects: ["contents_ok", "contents_none_ctx", "contents_fragile", "contents_perfume", "contents_liquid", "contents_hazard", "contents_perishable", "what_hazard", "contents_danger_ctx"],
      suggest: [{ lt: "Say what's inside (nothing liquid, fragile or dangerous?)", hint: "contents", options: "thing" }],
      // "¿Trae algo…?" / "¿No trae…?": a bare yes means "something", so Gloria asks what
      yes: (c) => { c.say("hazmat_what"); c.hold(); },
      no: (c) => { c.s.contents = "ok"; c.say("contents_ok"); weigh(c); },
      help: (c) => { c.say("hazard_explain"); } },
    { id: "return_addr", when: (c) => sending(c) && !!c.s.weighed && !!c.s.returnTwist, done: (c) => !!c.s.returnDone,
      ask: (c) => { if (bump(c, "return_addr") === 0) { c.say("return_missing"); c.twist("return_address"); } c.say("return_ask"); },
      expects: ["return_ok", "return_ctx", "what_return"],
      suggest: [{ lt: "Apologize and add your address", hint: "return" }],
      yes: (c) => { c.s.returnDone = true; c.say("return_thanks"); },
      no: (c) => { c.say("return_explain"); } },
    { id: "service", when: (c) => sending(c) && !!c.s.weighed, done: (c) => !!c.s.service,
      ask: (c) => {
        if (bump(c, "service") === 0) {
          c.say("ask_service");
          c.say("opt_priority", { price: priceOf(c, "priority") });
          c.say("opt_express", { price: priceOf(c, "express") });
        } else c.say(c.s.toldFirst ? "ask_service_which" : "ask_service_again");
      },
      expects: ["service_ans", "ask_cheaper", "ask_faster", "service_not", "not_dear_ctx", "ask_price", "ask_time", "ask_tracking", "ask_insured"],
      suggest: [{ lt: "Choose how to send it", hint: "service", options: "service" }, { lt: "Ask if there's anything cheaper", hint: "service" }],
      help: (c) => { c.say("opt_priority", { price: priceOf(c, "priority") }); c.say("opt_express", { price: priceOf(c, "express") }); } },
    { id: "contents_list", when: (c) => sending(c) && !!c.s.service && !c.s.items, done: (c) => !!c.s.items,
      ask: (c) => { if (!c.s.customsIntro) { c.s.customsIntro = true; c.say("customs_intro"); } c.say("ask_what_inside"); },
      expects: ["contents_ok"],
      suggest: [{ lt: "List what's in the box", hint: "items" }] },
    { id: "value", when: (c) => sending(c) && !!c.s.service && !!c.s.items, done: (c) => c.s.value !== undefined,
      ask: (c) => { if (!c.s.customsIntro) { c.s.customsIntro = true; c.say("customs_intro"); } c.say("ask_value"); },
      expects: ["value_ans", "value_ctx"],
      suggest: [{ lt: "Give a rough value in pesos", hint: "customs" }],
      help: (c) => { c.say("value_help"); } },
    { id: "gift", when: (c) => sending(c) && c.s.value !== undefined && !!c.s.askGift, done: (c) => c.s.gift !== undefined,
      ask: (c) => c.say("ask_gift"), expects: ["gift_yes", "gift_no"],
      suggest: [{ lt: "Say whether it's a gift", hint: "gift" }],
      yes: (c) => { c.s.gift = true; c.say("gift_mark"); },
      no: (c) => { c.s.gift = false; c.say("gift_not"); } },
    { id: "sign_customs", when: (c) => sending(c) && c.s.value !== undefined && (!c.s.askGift || c.s.gift !== undefined), done: (c) => !!c.s.customsSigned,
      ask: (c) => c.say("sign_customs"), expects: ["signed", "here_you_go", "sign_ctx"],
      suggest: [{ lt: "Sign the customs form", hint: "sign" }],
      yes: (c) => { c.s.customsSigned = true; c.event("sign"); c.say("signed_thanks"); } },
    { id: "insurance", when: (c) => sending(c) && customsDone(c) && !!c.s.askInsurance && c.s.service !== "first", done: (c) => c.s.insurance !== undefined && c.s.insurance !== "ask",
      ask: (c) => c.say(bump(c, "insurance") === 0 ? "ask_insurance" : "ask_insurance_again"), expects: ["insurance_yes", "insurance_no", "no_need_ctx", "insurance_ctx"],
      suggest: [{ lt: "Answer about extra insurance", hint: "insurance" }],
      // "Está bien, gracias" could be a yes or a no thanks: the question again, nothing added (rule 17; audit)
      yes: (c) => { if (politeClosing(c)) { bump(c, "insurance"); c.say("ask_insurance_confirm"); c.hold(); return; } c.s.insurance = true; c.say("insurance_added"); },
      no: (c) => { c.s.insurance = false; c.say("no_problem"); } },
    { id: "stamps_offer", when: (c) => sending(c) && customsDone(c) && !!c.s.offerStamps && c.s.stamps === undefined, done: (c) => c.s.stamps !== undefined,
      ask: (c) => c.say("offer_stamps"), expects: ["buy_stamps", "stamps_qty", "stamps_ctx", "no_stamps", "no_need_ctx"],
      suggest: [{ lt: "Say whether you need stamps", hint: "g_yesno" }, { lt: "Buy stamps for postcards", hint: "stamps" }],
      yes: (c) => { c.s.stamps = "ask"; c.say("stamps_info"); c.say("stamps_price"); bump(c, "stamps_qty"); c.hold(); },
      no: (c) => { c.s.stamps = false; } },
    { id: "stamps_qty", when: (c) => c.s.stamps === "ask", done: (c) => c.s.stamps !== "ask",
      ask: (c) => c.say(bump(c, "stamps_qty") === 0 ? "stamps_price" : "stamps_how_many"), expects: ["stamps_qty", "stamps_ctx", "no_stamps", "no_need_ctx"],
      suggest: [{ lt: "Say how many stamps you need", hint: "stamps_n" }],
      no: (c) => { c.s.stamps = false; c.say("no_problem"); } },
    { id: "pay", when: (c) => readyToPay(c) || unpaidStamps(c), done: (c) => !!c.s.paid && !unpaidStamps(c),
      ask: (c) => {
        // "¿Va a pagar en efectivo o con tarjeta?" only if the learner hasn't said how yet (audit)
        if (bump(c, "pay") === 0) { c.s.totalSaid = true; c.say("say_total", { total: due(c) }); if (c.s.askPay && !c.s.payMethod) c.say("ask_pay"); }
        else c.say("say_total", { total: due(c) });
      },
      expects: ["pay_card", "pay_cash", "pay_phone", "here_you_go", "no_cash", "no_card_ctx", "ask_dollars"],
      suggest: [{ lt: "Pay by card or in cash", hint: "pay" }] },
    // anything else
    { id: "more", when: (c) => !!c.s.task, done: (c) => !!c.s.moreDone,
      ask: (c) => c.say("ask_more"), expects: ["more_no", "buy_stamps", "customs_q_ctx"],
      suggest: [{ lt: "Say that's all", hint: "more" }, S_STAMPS],
      // "¿Sería todo?" (ask_more variant 1) turns a bare yes/no around
      yes: (c) => { if (askedEverything(c)) { c.s.moreDone = true; return; } c.say("ask_more_yes"); c.hold(); },
      no: (c) => { if (askedEverything(c) && !/\bgracias\b/.test(c.heard.toLowerCase())) { c.say("ask_more_yes"); c.hold(); return; } c.s.moreDone = true; } },
  ],

  init: (c) => {
    c.s.profile = c.chance(0.5) ? 0 : 1;
    c.s.pickupTwist = c.visits >= 1 && c.chance(0.5);
    c.s.customsTwist = c.visits >= 1 && c.chance(0.45);
    c.s.returnTwist = c.visits >= 1 && c.chance(0.35);
    c.s.askGift = c.chance(0.6);
    c.s.askInsurance = c.chance(0.5);
    c.s.offerStamps = c.chance(0.4);
    c.s.askPay = c.chance(0.5);
    c.s.trackTip = c.chance(0.6);
  },

  start: (c) => {
    c.ask(c.s.pickupTwist ? "help_pickup" : "help");
  },

  handlers: {
    send_package(c, slots) {
      const dest = walkSlots(slots, "dest");
      const had = c.s.sending;
      startSending(c, dest);
      if (dest && !had) c.say("dest_ok");
    },
    dest_ans(c, slots) {
      if (!c.s.sending) startSending(c);
      const dest = slots.dest ?? walkSlots(slots, "dest");
      if (!dest || (c.s.dest && c.s.dest === dest)) return;
      c.s.dest = dest;
      c.say("dest_set", { X: dest });
      weigh(c);
    },
    pickup(c) {
      c.s.task = c.s.task || "pickup";
      c.s.moreDone = false;
      if (c.s.pickup) return;
      c.s.pickup = true;
      c.twist("pickup");
      // "Tengo este aviso" / "Me dejaron este aviso" hands it over; "Me dejaron un aviso en la puerta" is only a mention
      if (/\b(este|el) aviso\b/.test(c.heard.toLowerCase()) && !/\bno\b/.test(c.heard.toLowerCase()) && c.s.notice === undefined) { c.s.notice = true; c.say("notice_thanks"); }
    },
    buy_stamps(c) {
      c.s.task = c.s.task || "stamps";
      c.s.moreDone = false;
      if (c.s.stampQty) { c.say("stamps_ok"); return; }
      // the quantity question is already open: just that question again, short (audit: both lines came twice in a row)
      if (c.s.stamps === "ask" && (c.s.asked?.stamps_qty ?? 0) > 0) { c.say("stamps_how_many"); c.hold(); return; }
      c.s.stamps = "ask";
      c.say("stamps_info");
    },

    // --- sending
    contents_ok(c, slots, seg) {
      if (!c.s.sending) startSending(c);
      const tags = allTags(slots, seg);
      if (tags.includes("perfume") || tags.includes("alcohol")) { post.handlers.contents_perfume(c, slots, { ...seg, tags }); return; }
      if (tags.includes("hazard")) { post.handlers.contents_hazard(c, slots, seg); return; }
      const listed = walkSlots(slots, "thing") !== undefined || tags.includes("fragile") || tags.includes("liquid");
      if (listed) c.s.items = true;
      if (c.s.contents === undefined) {
        firstInTurn(c, "contents");
        c.s.contents = tags.includes("fragile") ? "fragile" : "ok";
        if (tags.includes("fragile")) { c.s.fragile = true; c.say("fragile_ok"); }
        else if (tags.includes("liquid")) c.say("liquid_ok");
        else c.say("contents_ok");
        weigh(c);
        return;
      }
      if (c.step === "contents_list" && firstInTurn(c, "contents")) c.say("contents_ok");
    },
    contents_fragile(c) {
      if (!c.s.sending) startSending(c);
      if (c.s.fragile) return;
      c.s.fragile = true;
      // "Unas tazas de Talavera" also lists what's inside (no "¿Qué trae la caja?" later)
      if (/(taza|plato|jarr|florero|vaso|figur|adorno|espejo|marco|talavera|ceramica|barro|vidrio|cristal|porcelana)/.test(c.heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) c.s.items = true;
      if (c.s.contents === undefined) c.s.contents = "fragile";
      c.say("fragile_ok");
      weigh(c);
    },
    contents_perfume(c, _slots, seg) {
      if (!c.s.sending) startSending(c);
      const alcohol = seg.tags.includes("alcohol");
      // already told and still waiting for "Lo saco": no second announcement
      if (c.s.perfume === "asked") { c.expect(removePending("Agree to take it out", alcohol ? "alcohol_out" : "perfume_out")); return; }
      c.s.perfume = c.s.perfume || "asked";
      c.twist("perfume");
      c.say(alcohol ? "alcohol_no" : "perfume_no");
      c.say(alcohol ? "alcohol_out" : "perfume_out");
      c.expect(removePending("Agree to take it out", alcohol ? "alcohol_out" : "perfume_out"));
    },
    contents_liquid(c) {
      if (!c.s.sending) startSending(c);
      c.say("liquid_ok");
      if (c.s.contents === undefined) { c.s.contents = "ok"; weigh(c); }
    },
    contents_hazard(c) {
      if (!c.s.sending) startSending(c);
      c.s.perfume = c.s.perfume || "asked";
      c.say("battery_no");
      c.say("battery_out");
      c.expect(removePending("Agree to take the batteries out", "battery_out"));
    },
    contents_perishable(c) {
      if (!c.s.sending) startSending(c);
      c.s.perfume = c.s.perfume || "asked"; // (the same "take out what can't be sent" as perfume and batteries)
      c.say("perishable_no");
      c.say("perishable_out");
      c.expect(removePending("Agree to take the food out", "perishable_out"));
    },
    contents_none_ctx(c, slots, seg) { post.handlers.contents_ok(c, slots, seg); },
    // "Peligroso." / "Sí, algo peligroso.": what is it? (an item named in the same turn answers it)
    contents_danger_ctx(c) {
      if (c.s.contents !== undefined || c.s.perfume || /(pila|bateri|perfum|tequila|mezcal|vino|licor|ron\b|cerveza)/.test(heard(c))) return;
      c.say("hazmat_what");
      c.hold();
    },
    no_need_ctx(c) {
      const st = post.steps.find((x) => x.id === c.step);
      if (st?.no && !st.done(c)) st.no(c); else c.say("no_problem");
    },
    ask_dollars(c) { c.say("no_dollars"); },
    keep_it_ctx(c) { c.say("perfume_keep"); },
    take_out(c) { if (c.s.perfume === "asked") { perfumeOut(c); return; } c.say("contents_ok"); },
    what_hazard(c) { c.say("hazard_explain"); },
    service_ans(c, slots, seg) {
      let svc = slots.service as string | undefined;
      const tags = allTags(slots, seg);
      // "¿El express tiene rastreo?" read as "El express" + a question: the question is answered, nothing chosen
      if (tags.includes("bare") && /\b(tiene|trae|incluye|lleva|tarda|cuesta|cuanto|sale|rastre\w*|seguro|llega|caro|barato|que tal)\b/.test(c.heard.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""))) return;
      if (!svc && tags.includes("cheap")) svc = prof(c).first ? "first" : "priority";
      if (!svc && tags.includes("fast")) svc = "express";
      if (!svc && tags.includes("std")) svc = "priority";
      if (!svc && tags.includes("first")) svc = "priority";
      if (!svc && tags.includes("second")) svc = "express";
      if (!svc && tags.includes("third")) svc = prof(c).first && c.s.toldFirst ? "first" : undefined;
      if (!svc) return;
      if (!c.s.sending) startSending(c);
      // the prices come with the weight: nothing is chosen before them
      if (!c.s.weighed && !c.s.service) { c.say("svc_later"); return; }
      // economy hasn't been offered yet: quote it (price, no tracking, a month) and ask before choosing it
      if (svc === "first" && !c.s.toldFirst && prof(c).first && !c.s.service) {
        c.s.toldFirst = true;
        c.say("opt_first", { price: priceOf(c, "first") });
        c.say("first_q");
        c.expect(firstPending());
        return;
      }
      setService(c, svc);
    },
    service_not(c, slots) {
      const other = slots.service === "express" ? "priority" : slots.service === "priority" ? "express" : undefined;
      if (other && c.step === "service") { c.s.service = other; c.say("svc_then", { X: other }); }
      // "No quiero el express" after choosing it (and before paying): back to the other one, whose price was said
      else if (slots.service && slots.service === c.s.service && !c.s.paid) {
        const back = slots.service === "priority" ? "express" : "priority";
        c.s.service = back;
        c.say("svc_then", { X: back });
      }
      else c.say("no_problem");
    },
    not_dear_ctx(c) { setService(c, "priority"); },
    ask_cheaper(c) {
      // "Es un poco caro" at the insurance offer: no full insurance
      if (c.step === "insurance" && c.s.insurance === undefined) { c.s.insurance = false; c.say("no_problem"); return; }
      // the box isn't weighed yet: no economy price, no "too heavy" (audit)
      if (!c.s.weighed) { c.say("price_depends"); return; }
      if (prof(c).first) { c.s.toldFirst = true; c.say("opt_first", { price: priceOf(c, "first") }); }
      else tooHeavy(c);
    },
    ask_faster(c) { c.say("fastest"); },
    ask_options(c) {
      if (!c.s.weighed) { c.say("price_depends"); return; }
      c.say("opt_priority", { price: priceOf(c, "priority") });
      c.say("opt_express", { price: priceOf(c, "express") });
    },
    ask_price(c, slots, seg) {
      const h = c.heard.toLowerCase();
      if (c.s.customs && !c.s.sending) { c.say("customs_tax"); return; }
      // "¿Cuánto es?" at an open offer gets that offer's price (never a yes)
      if (seg.tags.includes("ins") || (c.step === "insurance" && !slots.service)) { c.say(c.s.service === "first" ? "insured_first" : "insurance_price"); return; }
      if (seg.tags.includes("stamp") || ((c.step === "stamps_offer" || c.step === "stamps_qty") && !slots.service)) {
        c.say("stamp_cost");
        // "¿Cuántos quiere?" is still open: no second price line right after (audit)
        if (c.step === "stamps_qty") c.hold();
        return;
      }
      const svc = slots.service ?? (/expres|express/.test(h) ? "express" : /normal/.test(h) ? "priority" : /economico|económico/.test(h) ? "first" : undefined);
      // no price before the weight and the country (audit: she quoted for a box she hadn't weighed)
      if (svc && !c.s.weighed) { c.say("price_depends"); return; }
      if (svc === "first") { if (prof(c).first) c.say("opt_first", { price: priceOf(c, "first") }); else c.say("too_heavy_first"); return; }
      if (svc === "express") { c.say("opt_express", { price: priceOf(c, "express") }); return; }
      if (svc === "priority") { c.say("opt_priority", { price: priceOf(c, "priority") }); return; }
      // at the payment the total was just said: say it once, and don't ask again right after
      if (c.s.paid && !unpaidStamps(c)) { c.say("already_paid"); return; }
      if (due(c) > 0) { c.say("say_total", { total: due(c) }); if (c.step === "pay") c.hold(); return; }
      if (!c.s.weighed) {
        // "¿Cuánto cuesta?" first thing: the sending starts, and the country comes next ("¿A qué país va?")
        if (!c.s.sending && !c.s.task) { startSending(c); bump(c, "dest"); }
        c.say("price_depends");
        return;
      }
      c.say("opt_priority", { price: priceOf(c, "priority") }); c.say("opt_express", { price: priceOf(c, "express") });
    },
    ask_time(c, slots) {
      if (c.s.customs && !c.s.sending) { c.say("customs_time"); return; }
      const svc = slots.service ?? c.s.service;
      if (svc === "express") c.say("time_express");
      else if (svc === "first") c.say("time_first");
      else if (svc === "priority") c.say("time_priority");
      else { c.say("time_priority"); c.say("time_express"); }
    },
    ask_tracking(c) {
      if (c.s.customs && !c.s.sending) { c.say("customs_track"); return; }
      if (c.s.sent) { c.say(c.s.service === "first" ? "tracking_no_first" : "tracking_on_receipt"); return; }
      c.say(c.s.service === "first" ? "tracking_no_first" : "tracking_yes");
    },
    ask_insured(c, slots, seg) {
      if ((slots.service ?? c.s.service) === "first") { c.say("insured_first"); return; }
      // "¿Qué cubre el seguro básico?", "¿Puedo asegurarlo?" (audit: not understood)
      if (seg.tags.includes("cover")) { c.say("insurance_cover"); return; }
      c.say("insured_info");
      if (seg.tags.includes("can") && c.s.insurance !== true) c.say("insurance_price");
    },
    ask_kilos(c) { if (c.s.weighed) c.say(prof(c).kilos); else if (c.s.sending && c.s.dest && c.s.contents !== undefined) weigh(c); else c.say(c.s.sending ? "ask_contents" : "ask_dest"); },
    ask_customs(c) { c.say("customs_explain"); },
    what_write(c) { c.say("write_help"); },
    value_ans(c, slots) {
      if (c.s.value !== undefined && c.step !== "value") { c.say("contents_ok"); return; }
      const p = walkSlots(slots, "price");
      // "No vale mucho" without a number: Gloria asks for a rough figure (only at "¿Cuánto vale?")
      if (typeof p !== "number") { if (c.step === "value") c.say("value_help"); return; }
      c.s.value = typeof p === "number" ? p : 50000;
      if (!c.s.items) c.s.items = true;
      c.say("value_ok");
    },
    value_ctx(c, slots) { post.handlers.value_ans(c, slots, { intent: "value_ans", slots, tags: [] }); },
    gift_yes(c) {
      if (c.s.gift === true) return;
      c.s.gift = true;
      if (c.s.askGift && c.s.value !== undefined) c.say("gift_mark");
    },
    gift_no(c) {
      const was = c.s.gift;
      c.s.gift = false;
      if (c.step === "gift") c.say("gift_not");
      else if (was === true) c.say("gift_fix");
    },
    return_ok(c) {
      if (/\bdonde\b/.test(c.heard.toLowerCase())) { c.say("return_ask"); c.hold(); return; }
      if (c.step === "return_addr" || (c.s.returnTwist && c.s.weighed && !c.s.returnDone)) { c.s.returnDone = true; c.say("return_thanks"); }
    },
    return_ctx(c) { post.handlers.return_ok(c, {}, { intent: "return_ok", slots: {}, tags: [] }); },
    what_return(c, _slots, seg) { c.say(seg.tags.includes("here") ? "return_here" : seg.tags.includes("home") ? "return_either" : "return_explain"); },
    insurance_yes(c) {
      if (c.s.insurance === true) return;
      // "¿Cuánto sería con seguro?" splits into a price question and "con seguro": the question answers, nothing added
      if (/\bcuanto\b|\bque pasa si\b/.test(heard(c))) return;
      // economy carries no insurance (audit: it added $50 to an economy packet)
      if (c.s.service === "first") { c.say("insured_first"); return; }
      c.s.insurance = true;
      c.say("insurance_added");
    },
    insurance_ctx(c, slots, seg) { post.handlers.insurance_yes(c, slots, seg); },
    insurance_no(c) { c.s.insurance = false; c.say("no_problem"); },
    stamps_qty(c, slots) {
      // a price question ("¿Cuánto cuesta cada uno?" read with a "uno") never buys stamps (rule 17; audit)
      if (/\bcuanto\b/.test(heard(c))) return;
      let n = walkSlots(slots, "number") as number | undefined;
      if (!n && /\b(uno|una)\b/.test(c.heard.toLowerCase())) n = 1;
      if (!n || n > 50) { c.say(bump(c, "stamps_qty") === 0 ? "stamps_price" : "stamps_how_many"); c.hold(); return; }
      c.s.stampQty = n;
      c.s.stamps = true;
      if (!c.s.task) c.s.task = "stamps";
      c.say("stamps_sure");
    },
    stamps_ctx(c, slots, seg) { post.handlers.stamps_qty(c, slots, seg); },
    no_stamps(c) { if (c.s.stampQty) { c.say("no_problem"); return; } const asked = c.s.stamps === "ask"; c.s.stamps = false; if (asked) c.say("no_problem"); },

    // --- paying
    pay_card(c, _slots, seg) {
      // "¿Y si pago con tarjeta?": a question; the card is taken when it's handed over (rule 17; audit)
      if (seg.tags.includes("q")) {
        if (c.s.paid && !unpaidStamps(c)) { c.say("already_paid"); return; }
        c.s.payMethod = "card";
        c.s.cardLaterSaid = true;
        c.say("card_later");
        if ((readyToPay(c) || unpaidStamps(c)) && c.step === "pay") c.hold();
        return;
      }
      pay(c, "card");
    },
    // "No tengo efectivo": the card, then; the money moves when the card is handed over
    no_cash(c) {
      if (c.s.paid && !unpaidStamps(c)) { c.say("already_paid"); return; }
      c.s.payMethod = "card";
      c.say("card_then");
      if ((readyToPay(c) || unpaidStamps(c)) && c.step === "pay") c.hold();
    },
    pay_cash(c, _slots, seg) {
      // "¿Puedo pagar en efectivo?" is a question: the money comes with "Aquí tiene"
      if (seg.tags.includes("q") && (readyToPay(c) || unpaidStamps(c)) && c.step === "pay") { c.s.payMethod = "cash"; c.say("cash_yes"); c.hold(); return; }
      pay(c, "cash");
    },
    no_card_ctx(c) {
      if (c.s.paid && !unpaidStamps(c)) { c.say("already_paid"); return; }
      c.s.payMethod = "cash";
      c.say("cash_then");
      if ((readyToPay(c) || unpaidStamps(c)) && c.step === "pay") c.hold();
    },
    pay_phone(c) { c.say("no_phone_pay"); },
    here_you_go(c) {
      switch (c.step) {
        case "pick_notice": c.s.notice = true; c.say("notice_thanks"); return;
        case "pick_name": c.s.pickName = "tracking"; c.say("name_thanks"); afterLookup(c); return;
        case "pick_id": gotPickupId(c); return;
        case "pick_sign": pickedUp(c); return;
        case "sign_customs": c.s.customsSigned = true; c.event("sign"); c.say("signed_thanks"); return;
        case "return_addr": c.s.returnDone = true; c.say("return_thanks"); return;
        case "pay": pay(c, c.s.payMethod || "cash"); return;
        default: c.say("signed_thanks");
      }
    },

    // --- pickup
    doc_ctx(c, slots, seg) { post.handlers.show_doc(c, slots, seg); },
    show_doc(c) {
      if (c.s.pickup && !c.s.pickId && !c.s.customs) { gotPickupId(c); return; }
      c.say("signed_thanks");
    },
    no_id_ctx(c) { noId(c); },
    id_photo_ctx(c) { if (c.s.pickId) return; c.say("id_original"); c.hold(); },
    // "Bueno, regreso mañana con mi pasaporte": the package waits for them; goodbye (audit: not understood)
    come_back_ctx(c) {
      if (c.s.pickId) return;
      c.s.pickLater = true;
      c.s.moreDone = true;
      c.say("keep_here");
    },
    no_guia_ctx(c) { c.s.noGuia = true; },
    no_notice(c) {
      if (c.step === "pick_id") { noId(c); return; }
      if (c.s.notice === undefined) c.s.notice = false;
    },
    name_ctx(c, slots, seg) {
      // the name is already known ("Ok, entiendo" after the customs news): just acknowledge
      if (c.s.pickName) { c.say("contents_ok"); if (c.s.customs) c.expect(customsPending()); return; }
      if (seg.tags.includes("mine")) { if (!c.s.pickName) { c.s.pickName = "mine"; c.say("name_thanks"); afterLookup(c); } return; }
      const part = String(slots.name || "").trim();
      if (part && !/\s/.test(part) && notAName(c, part)) return;
      if (!c.s.pickName && c.s.pickup) { c.s.pickName = part || "?"; c.say("name_thanks"); afterLookup(c); }
    },
    tracking_ctx(c, _slots, seg) {
      if (c.step === "pick_notice" && c.s.notice === undefined) { c.s.notice = false; }
      if (seg.tags.includes("have") && !c.s.pickName) { c.say("ask_guia"); c.expect(guiaPending()); return; }
      if (!c.s.pickName) { c.s.pickName = "tracking"; c.say("name_thanks"); afterLookup(c); }
    },
    sign_ctx(c) { post.handlers.signed(c, {}, { intent: "signed", slots: {}, tags: [] }); },
    signed(c) {
      if (/\bdonde\b/.test(c.heard.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""))) { c.say("sign_where"); c.hold(); return; }
      if (c.step === "pick_sign") { pickedUp(c); return; }
      if (c.step === "sign_customs") { c.s.customsSigned = true; c.event("sign"); c.say("signed_thanks"); return; }
      if (c.step === "return_addr") { c.s.returnDone = true; c.say("return_thanks"); return; }
      c.say("signed_thanks");
    },
    customs_q_ctx(c, _slots, seg) {
      if (!c.s.customs) { c.say("ask_more_yes"); c.hold(); return; }
      customsAnswer(c, seg.tags);
    },

    // --- general
    more_no(c) {
      const st = post.steps.find((x) => x.id === c.step);
      if (st && st.id !== "more" && st.no && !st.done(c)) { st.no(c); return; }
      c.s.moreDone = true;
    },
    need_tape(c, _slots, seg) { c.say(seg.tags.includes("box") ? "boxes" : "tape"); },
    ask_open(c) { c.say("hours"); },
    ask_mailbox(c) { c.say("mailbox"); },
  },

  finish: (c) => {
    if (c.s.sent || c.s.pickedUp || c.s.customs) c.complete();
    c.say("bye");
    c.expect({ id: "closing", hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
      on: {
        g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); },
        // Gloria has just said goodbye: a bare "Adiós" needs no second one
        g_bye: (cc) => { cc.end(); },
      },
      yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
  },

  tests: [
    // every hint
    { say: "Quisiera mandar este paquete a Estados Unidos.", intent: "send_package", slots: { dest: "usa" } },
    { say: "¿Puedo mandar esto a Canadá?", intent: "send_package", slots: { dest: "canada" } },
    { say: "Necesito enviar esta caja a Inglaterra.", intent: "send_package", slots: { dest: "uk" } },
    { say: "Esto va para Irlanda.", intent: "send_package" },
    { say: "Quiero mandar esto a Australia.", intent: "send_package" },
    { say: "Tengo un paquete para Nueva Zelanda.", intent: "send_package", slots: { dest: "new_zealand" } },
    { say: "¿Cuánto cuesta mandar esto a Estados Unidos?", intent: "send_package", step: "help" },
    { say: "¿Puedo mandar esto al extranjero?", intent: "send_package" },
    { say: "A Canadá.", intent: "dest_ans", step: "dest", slots: { dest: "canada" } },
    { say: "Para mi familia en Australia.", intent: "dest_ans", step: "dest" },
    { say: "No, solo un rebozo.", intent: "contents_ok", step: "hazmat" },
    { say: "No, nada de eso.", intent: "contents_ok", step: "hazmat" },
    { say: "Sí, es frágil.", intent: "contents_fragile", step: "hazmat" },
    { say: "El normal, por favor.", intent: "service_ans", step: "service", slots: { service: "priority" } },
    { say: "Me llevo el express.", intent: "service_ans", step: "service", slots: { service: "express" } },
    { say: "El más barato, por favor.", intent: "service_ans", step: "service" },
    { say: "El más rápido, por favor.", intent: "service_ans", step: "service" },
    { say: "¿Hay algo más barato?", intent: "ask_cheaper", step: "service" },
    { say: "¿Cuánto cuesta?", intent: "ask_price" },
    { say: "¿Cuánto tarda?", intent: "ask_time" },
    { say: "¿Lo puedo rastrear?", intent: "ask_tracking" },
    { say: "¿Está asegurado?", intent: "ask_insured" },
    { say: "¿Cuánto es en libras?", intent: "ask_kilos" },
    { say: "Como 800 pesos.", intent: "value_ans", step: "value", slots: { price: 80000 } },
    { say: "Vale unos mil pesos.", intent: "value_ans", step: "value", slots: { price: 100000 } },
    { say: "No, gracias, no hace falta.", intent: "yn:no", step: "insurance", not: ["insurance_yes"] },
    { say: "Sí, quiero asegurarlo.", intent: "insurance_yes", step: "insurance" },
    { say: "¿Me da timbres para postales?", intent: "buy_stamps" },
    { say: "¿Me da estampillas para postales?", intent: "buy_stamps" },
    { say: "Quiero mandar unas postales.", intent: "buy_stamps" },
    { say: "Cinco, por favor.", intent: "stamps_ctx", step: "stamps_qty", slots: { number: 5 } },
    { say: "Nada más uno.", intent: "stamps_ctx", step: "stamps_qty", slots: { number: 1 } },
    { say: "Con tarjeta, por favor.", intent: "pay_card", step: "pay" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card", step: "pay" },
    { say: "Pago en efectivo.", intent: "pay_cash", step: "pay" },
    { say: "Aquí tiene.", intent: "here_you_go", step: "pay" },
    { say: "Vengo a recoger un paquete.", intent: "pickup" },
    { say: "No estaba en casa y me dejaron un aviso.", intent: "pickup" },
    { say: "Tengo este aviso.", intent: "pickup" },
    { say: "¿Dónde está mi paquete?", intent: "pickup" },
    { say: "Aquí lo tiene.", intent: "here_you_go", step: "pick_notice" },
    { say: "No, lo perdí.", intent: "no_notice", step: "pick_notice" },
    { say: "No me dejaron ningún aviso.", intent: "no_notice", step: "pick_notice" },
    { say: "Tengo el número de guía.", intent: "tracking_ctx", step: "pick_name" },
    { say: "Está a nombre de Ryan Miller.", intent: "name_ctx", step: "pick_name" },
    { say: "Aquí está mi pasaporte.", intent: "show_doc", step: "pick_id" },
    { say: "Un rebozo, chocolate y café.", intent: "contents_ok", step: "contents_list" },
    { say: "Solo ropa.", intent: "contents_ok", step: "contents_list" },
    { say: "Ah, bueno. Lo saco.", intent: "take_out", step: "perfume" },
    { say: "¡Ay, perdón! Claro.", intent: "return_ctx", step: "return_addr" },
    { say: "¿Qué es el remitente?", intent: "what_return", step: "return_addr" },
    { say: "Sí, es un regalo para mi familia.", intent: "gift_yes", step: "gift" },
    { say: "No, no es regalo.", intent: "gift_no", step: "gift", not: ["gift_yes"] },
    { say: "Ya firmé.", intent: "signed", step: "sign_customs" },
    { say: "Es todo, gracias.", intent: "more_no", step: "more" },
    { say: "No, eso es todo, gracias.", intent: "more_no", step: "more" },
    // natural alternatives, short answers, accents left out, tú to staff
    { say: "quisiera enviar esta cajita a los estados unidos", intent: "send_package", slots: { dest: "usa" } },
    { say: "¿Me puedes ayudar a mandar este paquete?", intent: "send_package" },
    { say: "Trae una taza de barro", intent: "contents_fragile", step: "hazmat" },
    { say: "Trae una botella de tequila", intent: "contents_perfume", step: "hazmat" },
    { say: "Trae una botella de vainilla", intent: "contents_liquid", step: "hazmat" },
    { say: "Sí, unas pilas", intent: "contents_hazard", step: "hazmat" },
    { say: "Sí, un poco de queso", intent: "contents_perishable", step: "hazmat" },
    { say: "¿Qué significa perecedero?", intent: "what_hazard", step: "hazmat" },
    { say: "Mejor el express", intent: "service_ans", step: "service", slots: { service: "express" } },
    { say: "El normal, no tengo prisa", intent: "service_ans", step: "service", slots: { service: "priority" } },
    { say: "¿No hay algo más barato?", intent: "ask_cheaper", step: "service" },
    { say: "Mil doscientos", intent: "value_ctx", step: "value", slots: { price: 120000 } },
    { say: "¿Pongo mi dirección de aquí?", intent: "what_return", step: "return_addr" },
    { say: "¿Me presta cinta?", intent: "need_tape" },
    { say: "¿A qué hora cierran?", intent: "ask_open" },
    { say: "Ryan Miller", intent: "name_ctx", step: "pick_name" },
    { say: "El número de guía es 4829157361", intent: "tracking_ctx", step: "pick_name" },
    { say: "Mi pasaporte", intent: "show_doc", step: "pick_id" },
    { say: "¿Puedo pagar con el celular?", intent: "pay_phone", step: "pay" },
    { say: "No tengo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "toma", intent: "here_you_go", step: "pay" },
    // Spain forms are correct answers
    { say: "¿Podéis enviar este paquete a Nueva Zelanda?", intent: "send_package" },
    { say: "¿Me vende sellos?", intent: "buy_stamps" },
    { say: "Vale, lo saco", intent: "take_out", step: "perfume" },
    { say: "Vale, es todo", intent: "more_no", step: "more" },
    // meaning safety
    { say: "No vengo a mandar nada, vengo a recoger un paquete", intent: "pickup", not: ["send_package"] },
    { say: "No quiero mandar esto a Estados Unidos", intent: "none", not: ["send_package"] },
    { say: "No a Canadá, a Estados Unidos", intent: "dest_ans", step: "dest", slots: { dest: "usa" } },
    { say: "No hay nada frágil", intent: "contents_ok", step: "hazmat", not: ["contents_fragile"] },
    { say: "No trae perfume", intent: "contents_ok", step: "hazmat", not: ["contents_perfume"] },
    { say: "No tiene baterías", intent: "contents_ok", step: "hazmat", not: ["contents_hazard"] },
    { say: "No quiero el express", intent: "service_not", step: "service", not: ["service_ans"] },
    { say: "¿Cuánto cuesta el express?", intent: "ask_price", step: "service", not: ["service_ans"] },
    { say: "No es un regalo", intent: "gift_no", step: "gift", not: ["gift_yes"] },
    { say: "No quiero el seguro", intent: "insurance_no", step: "insurance", not: ["insurance_yes"] },
    { say: "¿Cuánto cuesta el seguro?", intent: "ask_price", step: "insurance", not: ["insurance_yes"] },
    { say: "No necesito timbres, gracias", intent: "no_stamps", step: "stamps_offer", not: ["buy_stamps", "stamps_qty"] },
    { say: "No con tarjeta, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No tengo el aviso", intent: "no_notice", step: "pick_notice", not: ["here_you_go"] },
    { say: "No traigo mi pasaporte", intent: "no_id_ctx", step: "pick_id", not: ["show_doc", "doc_ctx"] },
    { say: "¿Mande?", intent: "g_repeat", step: "pick_name", not: ["name_ctx"] },
    { say: "No lo saco", intent: "none", not: ["take_out"] },
    { say: "Aquí tiene quinientos", intent: "here_you_go", step: "pay", not: ["stamps_qty", "stamps_ctx"] },
    { say: "Cosas para mis hijos", intent: "contents_ok", step: "hazmat", not: ["contents_fragile"] },
    { say: "No son frágiles", intent: "contents_ok", step: "hazmat", not: ["contents_fragile"] },
    { say: "No necesito", intent: "no_need_ctx", step: "stamps_offer", not: ["buy_stamps"] },
    { say: "¿Cuánto es?", intent: "ask_price", step: "insurance", not: ["insurance_yes"] },
    { say: "No, nada", intent: "contents_none_ctx", step: "hazmat" },
    { say: "¿Aceptan dólares?", intent: "ask_dollars", step: "pay" },
    { say: "Es el 4829157361", intent: "tracking_ctx", step: "pick_name" },
    { say: "No sabía, bueno, lo saco", intent: "take_out", step: "perfume" },
    { say: "Quisiera mandar esto por correo a Canadá", intent: "send_package", slots: { dest: "canada" } },
    // review traps: a question about a service never chooses it; bare numbers and "no es caro" only where asked
    { say: "¿El express tiene rastreo?", intent: "ask_tracking", step: "service", not: ["service_ans"] },
    { say: "¿Y el express cuánto tarda?", intent: "ask_time", step: "value", not: ["service_ans"] },
    { say: "¿El normal llega antes de Navidad?", intent: "ask_time", step: "value", not: ["service_ans"] },
    { say: "¿Es muy caro el express?", intent: "ask_cheaper", step: "service", not: ["service_ans"] },
    { say: "¿El express no tiene seguro?", intent: "ask_insured", step: "service", not: ["service_ans", "service_not"] },
    { say: "Necesito dos", intent: "none", step: "pay", not: ["stamps_qty", "stamps_ctx"] },
    { say: "No es caro", intent: "none", step: "hazmat", not: ["value_ans", "value_ctx"] },
    { say: "No es regalo, son cosas mías", intent: "gift_no", step: "gift", not: ["gift_yes"] },
    { say: "Sí, es frágil, son unas tazas de cerámica", intent: "contents_fragile", step: "hazmat" },
    { say: "No lleva perfume ni nada así", intent: "contents_ok", step: "hazmat", not: ["contents_perfume"] },
    { say: "¿Qué cosas no se pueden mandar?", intent: "what_hazard", step: "hazmat" },
    { say: "No vengo a recoger nada, quiero enviar esto", intent: "send_package", not: ["pickup"] },
    { say: "A Texas, en Estados Unidos", intent: "dest_ans", step: "dest", slots: { dest: "usa" } },
    { say: "No el caro, el otro", intent: "not_dear_ctx", step: "service", not: ["service_ans"] },
    { say: "¿Pongo mi dirección de Canadá?", intent: "what_return", step: "return_addr" },
    { say: "Perfume no", intent: "contents_ok", step: "hazmat", not: ["contents_perfume"] },
    { say: "Nada de perfume ni pilas", intent: "contents_ok", step: "hazmat", not: ["contents_perfume", "contents_hazard"] },
    // audit (5 Nov 2026): her own option back; price questions and what-ifs never add; side questions answered
    { say: "Peligroso.", intent: "contents_danger_ctx", step: "hazmat" },
    { say: "Sí, algo peligroso", intent: "contents_danger_ctx", step: "hazmat" },
    { say: "No, nada peligroso", intent: "contents_ok", step: "hazmat", not: ["contents_danger_ctx"] },
    { say: "¿Y si lo aseguro?", intent: "ask_price", step: "insurance", not: ["insurance_yes"] },
    { say: "¿Cuánto cobran por el seguro?", intent: "ask_price", step: "insurance", not: ["insurance_yes"] },
    { say: "¿Qué cubre el seguro básico?", intent: "ask_insured", step: "insurance", not: ["insurance_yes"] },
    { say: "¿Puedo asegurarlo?", intent: "ask_insured", step: "service", not: ["insurance_yes"] },
    { say: "Mejor sí", intent: "insurance_ctx", step: "insurance" },
    { say: "¿Cuánto cuestan cinco timbres?", intent: "ask_price", step: "stamps_offer", not: ["stamps_qty", "stamps_ctx"] },
    { say: "¿Y si lo mando express?", intent: "ask_price", step: "service", not: ["service_ans"] },
    { say: "¿Y si pago con tarjeta?", intent: "pay_card", step: "pay" },
    { say: "Gracias, es todo", intent: "more_no", step: "more" },
    { say: "No tengo el número de guía", intent: "no_guia_ctx", step: "pick_name", not: ["tracking_ctx"] },
    { say: "¿Sirve una foto del pasaporte?", intent: "id_photo_ctx", step: "pick_id", not: ["show_doc", "doc_ctx", "here_you_go"] },
    { say: "Bueno, regreso mañana con mi pasaporte", intent: "come_back_ctx", step: "pick_id", not: ["show_doc", "doc_ctx"] },
    { say: "¿Dónde dejo las postales?", intent: "ask_mailbox", step: "more" },
    // not understood
    { say: "Mi gato toca la guitarra", intent: "none" },
    { say: "Quiero un café con leche", intent: "none" },
    { say: "¿Dónde está la playa?", intent: "none" },
  ],

  sims: [
    // "¿Es regalo?" on every seed, answered in words; the bare "Claro." signs the customs form.
    { name: "send a gift home, happy path",
      turns: ["¡Buenos días! Quisiera mandar este paquete a Estados Unidos.", "No, solo un rebozo, chocolate y café.", "El normal, por favor.", "Como ochocientos pesos.", "Sí, es un regalo para mi mamá.", "Claro.", "Con tarjeta, por favor.", "Es todo, gracias."],
      expect: { complete: true, state: { dest: "usa", service: "priority", gift: true, sent: true } }, auto: POST_AUTO, setup: (s) => { s.askGift = true; s.pickupTwist = false; } },
    { name: "questions, a cheaper option, a change of mind",
      turns: ["Hola, ¿puedo mandar esto a mi familia en Canadá?", "¿Qué significa perecedero?", "No, nada de eso.", "¿Cuánto es en libras?", "¿Hay algo más barato?", "¿Cuánto tarda?", "Bueno, mejor el express.", "Un rebozo y chocolate.", "Unos mil pesos.", "Listo.", "¿Puedo pagar en efectivo?", "Aquí tiene.", "¿Lo puedo rastrear?", "No, es todo, gracias."],
      expect: { complete: true, state: { dest: "canada", service: "express", payMethod: "cash" } }, auto: POST_AUTO, setup: (s) => { s.pickupTwist = false; } },
    // the perfume has to come out (learner-driven twist); no gift question: the bare "Claro." signs the customs form
    { name: "perfume has to come out",
      turns: ["Buenas tardes, necesito enviar esta caja a Inglaterra.", "Trae un perfume.", "Ah, bueno. Lo saco.", "El express, por favor.", "Solo ropa y libros.", "Unos mil quinientos pesos.", "Claro.", "Pago con tarjeta.", "Nada más, gracias."],
      expect: { complete: true, state: { perfume: "out", dest: "uk", service: "express" } }, auto: POST_AUTO, setup: (s) => { s.askGift = false; s.pickupTwist = false; } },
    { name: "tequila can't be mailed",
      turns: ["Hola, quiero mandar esta caja a Irlanda.", "Sí, una botella de tequila para mi hermano.", "Ni modo, la saco.", "El normal.", "Dulces y una hamaca.", "Como seiscientos pesos.", "Ya firmé.", "Tarjeta.", "Sería todo."],
      expect: { complete: true, state: { perfume: "out", dest: "ireland" } }, auto: POST_AUTO, setup: (s) => { s.askGift = false; s.pickupTwist = false; } },
    { name: "picking up a package (twist), then sending one",
      turns: ["Hola, tengo este aviso. Vengo a recoger un paquete.", "Aquí está mi pasaporte.", "Claro.", "También quisiera mandar esta caja a Estados Unidos.", "No, solo un rebozo.", "El express, por favor.", "Como quinientos pesos.", "Listo.", "Con tarjeta.", "Es todo, gracias."],
      expect: { complete: true, state: { pickedUp: true, sent: true } }, auto: POST_AUTO, setup: (s) => { s.pickupTwist = true; s.customsTwist = false; } },
    { name: "no notice, just the name",
      turns: ["¿Dónde está mi paquete? No estaba en casa.", "No, lo perdí.", "Ryan Miller", "Aquí está mi pasaporte.", "Claro.", "No, eso es todo, gracias."],
      expect: { complete: true, state: { pickedUp: true, notice: false } }, auto: POST_AUTO, setup: (s) => { s.pickupTwist = true; s.customsTwist = false; } },
    // the brief's twist on every seed: no notice; the package is still at customs
    { name: "twist: the package is at customs",
      turns: ["Buenos días. ¿Dónde está mi paquete? Me lo mandaron de Estados Unidos.", "No, no me dejaron ningún aviso.", "Tengo el número de guía.", "Es el 4829157361.", "¿Tengo que pagar algo?", "¿Cuánto tarda?", "Muchas gracias.", "No, es todo."],
      expect: { complete: true, state: { customs: true, pickId: undefined } }, auto: POST_AUTO, setup: (s) => { s.pickupTwist = true; s.customsTwist = true; } },
    // a forced missing return address, stamps too, a question about it
    { name: "return address and stamps",
      turns: ["Hola. Quisiera mandar esto a Australia.", "No, solo ropa.", "¿Qué es el remitente?", "¡Ay, perdón! Ahorita lo pongo.", "El normal, por favor.", "Como seiscientos pesos.", "Claro.", "¿Me da también timbres para postales?", "Cinco, por favor.", "Con tarjeta.", "Es todo, gracias."],
      expect: { complete: true, state: { returnDone: true, stampQty: 5, sent: true } }, auto: POST_AUTO,
      setup: (s) => { s.askGift = false; s.pickupTwist = false; s.returnTwist = true; s.offerStamps = false; } },
    // the learner's short answers
    { name: "short answers",
      turns: ["Un paquete para Estados Unidos.", "No.", "Normal.", "Ropa.", "Quinientos.", "Sí.", "Ya.", "Tarjeta.", "Es todo."],
      expect: { complete: true, state: { service: "priority", gift: true, contents: "ok" } }, auto: omit(POST_AUTO, ["gift"]),
      setup: (s) => { s.pickupTwist = false; s.returnTwist = false; s.askGift = true; s.askInsurance = false; s.offerStamps = false; } },
    // insurance asked on every seed: a price question first, then a no; no cash, so the card (paid when handed over); phone payment refused
    { name: "insurance question, no cash",
      turns: ["Buenas. Necesito enviar esta caja a Canadá.", "No trae nada peligroso.", "El express.", "Unos juguetes y dulces para mis sobrinos.", "Como novecientos pesos.", "Ya firmé.", "¿Cuánto cuesta el seguro?", "No, con el seguro básico está bien.", "¿Puedo pagar con el celular?", "No tengo efectivo.", "Aquí tiene mi tarjeta.", "Gracias, es todo."],
      expect: { complete: true, state: { insurance: false, payMethod: "card", service: "express" } }, auto: POST_AUTO,
      setup: (s) => { s.pickupTwist = false; s.returnTwist = false; s.askGift = false; s.askInsurance = true; s.offerStamps = false; } },
    // the light box: "el más barato" quotes economy and asks; a question about it, then yes; "¿Está asegurado?" answered for economy
    { name: "economy quoted before it's chosen",
      turns: ["Quisiera mandar este paquete a Irlanda.", "No, nada de eso.", "El más barato, por favor.", "¿Lo puedo rastrear?", "Sí, está bien.", "Unos dulces y fotos.", "Como trescientos pesos.", "Claro.", "¿Está asegurado?", "Aquí tiene.", "Es todo, gracias."],
      expect: { complete: true, state: { service: "first", toldFirst: true, sent: true } }, auto: POST_AUTO,
      setup: (s) => { s.profile = 1; s.pickupTwist = false; s.returnTwist = false; s.askGift = false; s.askInsurance = false; s.offerStamps = false; } },
    // audit (5 Nov 2026): at the insurance offer a price question and "Está bien, gracias" add nothing (rule 17)
    { name: "insurance: a price question and a polite closing add nothing",
      turns: ["Quisiera mandar este paquete a Canadá.", "No, nada de eso.", "El normal, por favor.", "Ropa.", "Como mil pesos.", "Claro.", "¿Cuánto sería con seguro?", "Está bien, gracias.", "No, gracias.", "Con tarjeta.", "Gracias, es todo."],
      expect: { complete: true, state: { insurance: false, service: "priority", sent: true } }, auto: POST_AUTO,
      setup: (s) => { s.pickupTwist = false; s.returnTwist = false; s.askGift = false; s.askInsurance = true; s.offerStamps = false; } },
    // audit: no price before the weight and the country; a price question about stamps buys none
    { name: "prices wait for the weight; a stamp price question buys nothing",
      turns: ["¿Cuánto cuesta?", "A Estados Unidos.", "¿Hay algo más barato?", "No, nada de eso.", "El normal, por favor.", "Un rebozo y café.", "Como ochocientos pesos.", "Claro.", "¿Cuánto cuestan cinco timbres?", "No, gracias.", "Pago en efectivo.", "Es todo, gracias."],
      expect: { complete: true, state: { dest: "usa", service: "priority", stamps: false, stampQty: undefined, sent: true } }, auto: POST_AUTO,
      setup: (s) => { s.pickupTwist = false; s.returnTwist = false; s.askGift = false; s.askInsurance = false; s.offerStamps = true; } },
    // audit: stamps asked for after the package is paid are charged on their own, then handed over
    { name: "stamps after paying for the package",
      turns: ["Quisiera mandar este paquete a Canadá.", "No, nada de eso.", "El normal, por favor.", "Ropa.", "Como mil pesos.", "Claro.", "Con tarjeta.", "Sí, también quiero timbres para postales.", "Tres.", "Con tarjeta.", "Es todo, gracias."],
      expect: { complete: true, state: { sent: true, stampQty: 3, stampsPaid: true } }, auto: POST_AUTO,
      setup: (s) => { s.pickupTwist = false; s.returnTwist = false; s.askGift = false; s.askInsurance = false; s.offerStamps = false; } },
    // audit: no ID at the pickup, a photo of it isn't enough, they'll come back tomorrow (the package waits)
    { name: "pickup without ID: back tomorrow",
      turns: ["Hola, tengo este aviso.", "No traigo mi pasaporte.", "¿Sirve una foto del pasaporte?", "Bueno, regreso mañana con mi pasaporte."],
      expect: { complete: false, state: { pickLater: true, pickId: undefined, pickedUp: undefined } }, auto: POST_AUTO,
      setup: (s) => { s.pickupTwist = true; s.customsTwist = false; } },
    // stamps offered on every seed, and taken; a correction of the country
    { name: "stamps offered, country corrected",
      turns: ["Quiero mandar una caja.", "No a Canadá, a Estados Unidos.", "Unas tazas de Talavera.", "El normal, por favor.", "Como mil pesos.", "Sí, es un regalo.", "Claro.", "Sí, para unas postales.", "Tres.", "Con tarjeta.", "Es todo, gracias."],
      expect: { complete: true, state: { dest: "usa", fragile: true, stampQty: 3 } }, auto: POST_AUTO,
      setup: (s) => { s.pickupTwist = false; s.returnTwist = false; s.askGift = true; s.askInsurance = false; s.offerStamps = true; } },
  ],
};

/** Gloria's last question was "¿Sería todo?" (a yes means "that's all"). */
function askedEverything(c: Ctx): boolean {
  return ((c as ConvCtx).conv?.lastLines ?? []).some((l) => l.lineId === "ask_more" && l.variant === 1);
}

/** "Tiene que sacarlo": wait for the learner to agree to take out what can't be sent. */
function removePending(lt: string, again: string): Pending {
  return {
    id: "perfume", expects: ["take_out", "keep_it_ctx"], hints: ["remove", "g_yesno"],
    suggest: [{ lt, hint: "remove" }],
    yes: (cc) => { perfumeOut(cc); },
    // a no keeps the question open: it can't go with it inside
    no: (cc) => { cc.say(bump(cc, "keep") === 0 ? "perfume_keep" : "perfume_rule"); cc.expect(removePending(lt, again)); },
    on: { take_out: (cc) => { perfumeOut(cc); }, g_ok: (cc) => { perfumeOut(cc); }, g_sorry: (cc) => { perfumeOut(cc); },
      keep_it_ctx: (cc) => { cc.say("perfume_keep"); cc.expect(removePending(lt, again)); } },
    ask: (cc) => cc.say(again),
  };
}

/** "¿Le parece bien el económico?": economy is chosen only on a yes (or by naming it again). */
function firstPending(): Pending {
  // questions while it's open are about economy
  const about = (line: string) => (cc: Ctx) => { cc.say(line, { price: priceOf(cc, "first") }); cc.expect(firstPending()); };
  return {
    id: "first_offer", expects: ["service_ans", "service_not", "ask_time", "ask_tracking", "ask_insured", "ask_price"],
    hints: ["service", "g_yesno"], suggest: [{ lt: "Say whether economy is okay", hint: "g_yesno" }, { lt: "Choose how to send it", hint: "service", options: "service" }],
    yes: (cc) => { setService(cc, "first"); },
    no: () => { /* the service step asks "Entonces, ¿cuál prefiere?" */ },
    on: {
      service_ans: (cc, sl, sg) => { post.handlers.service_ans(cc as ConvCtx, sl, sg); },
      service_not: (cc, sl, sg) => { post.handlers.service_not(cc as ConvCtx, sl, sg); },
      ask_tracking: about("tracking_no_first"), ask_time: about("time_first"), ask_insured: about("insured_first"), ask_price: about("opt_first"),
    },
    ask: (cc) => cc.say("first_q"),
  };
}

/** "¿Me lo dicta?": the tracking number (or, without it, the name). */
function guiaPending(): Pending {
  return {
    id: "guia", optional: true, expects: ["tracking_ctx", "name_ctx", "no_notice", "no_guia_ctx"], hints: ["pname"],
    suggest: [{ lt: "Read out the tracking number (or give your name)", hint: "pname" }],
    on: {
      no_notice: (cc) => { cc.s.noGuia = true; },
      no_guia_ctx: (cc) => { cc.s.noGuia = true; },
      tracking_ctx: (cc, sl, sg) => { post.handlers.tracking_ctx(cc as ConvCtx, sl, sg); },
      name_ctx: (cc, sl, sg) => { post.handlers.name_ctx(cc as ConvCtx, sl, sg); },
    },
    no: (cc) => { cc.s.noGuia = true; },
  };
}

function perfumeOut(c: Ctx) {
  if (c.s.perfume === "out") return;
  c.s.perfume = "out";
  c.say("perfume_thanks");
  if (c.s.contents === undefined) { c.s.contents = "ok"; weigh(c); }
}

/** After the tracking number or the name: the package is here (ID next), or still at customs (twist). */
function afterLookup(c: Ctx) {
  if (c.s.customs) return;
  if (!c.s.customsTwist) { c.say("found_here"); return; }
  c.s.customs = true;
  c.twist("customs");
  c.say("customs_here");
  c.say("customs_notice");
  c.say("customs_track");
  c.s.donePath = c.s.donePath || "pickup";
  c.complete();
  c.expect(customsPending());
}

function customsPending(): Pending {
  return {
    id: "customs", optional: true, expects: ["customs_q_ctx", "ask_time", "ask_price", "ask_tracking"], hints: ["aduana", "g_social"],
    suggest: [{ lt: "Ask what happens now", hint: "aduana" }, { lt: "Say thank you", hint: "g_social" }],
    on: {
      customs_q_ctx: (cc, _sl, sg) => { customsAnswer(cc, sg.tags); cc.expect(customsPending()); },
      ask_time: (cc) => { cc.say("customs_time"); cc.expect(customsPending()); },
      ask_price: (cc) => { cc.say("customs_tax"); cc.expect(customsPending()); },
      ask_tracking: (cc) => { cc.say("customs_track"); cc.expect(customsPending()); },
      // thanks after the news closes the visit: Gloria says goodbye (finish)
      g_thanks: (cc) => { cc.s.moreDone = true; },
      more_no: (cc) => { cc.s.moreDone = true; },
    },
  };
}

function customsAnswer(c: Ctx, tags: string[]) {
  if (tags.includes("tax")) c.say("customs_tax");
  else if (tags.includes("time")) c.say("customs_time");
  else if (tags.includes("why")) c.say("customs_why");
  else if (tags.includes("notice")) c.say("customs_notify");
  else c.say("customs_what");
}

function gotPickupId(c: Ctx) {
  if (c.s.pickId) return;
  c.s.pickId = true;
  c.say("go_get");
  c.say("here_package");
  c.s.askedSign = true;
}

function noId(c: Ctx) {
  if (c.s.pickId) return;
  c.say("need_id_pickup");
  c.say("id_which");
  c.hold();
}

function pickedUp(c: Ctx) {
  if (c.s.pickedUp) return;
  c.s.pickedUp = true;
  c.event("sign");
  c.s.served = true;
  c.say("pickup_done");
  c.event("give", { item: "package" });
  c.s.donePath = c.s.donePath || "pickup";
  c.complete();
}

function pay(c: Ctx, method: string) {
  const later = unpaidStamps(c);
  if (c.s.paid && !later) { c.say("already_paid"); return; }
  if (!(readyToPay(c) || later) || c.step !== "pay") {
    c.s.payMethod = method;
    c.say(method === "card" && !c.s.cardLaterSaid ? "card_later" : "pay_later");
    if (method === "card") c.s.cardLaterSaid = true;
    return;
  }
  const amount = due(c);
  c.s.paid = true;
  if (c.s.stampQty) c.s.stampsPaid = true;
  c.s.payMethod = method;
  if (method === "card") c.say("card_tap");
  else c.say("cash_change");
  c.event("pay", { method, amount });
  if (later) { c.say("stamps_here"); return; }
  if (c.s.sending && !c.s.sent) { finishSending(c); if (c.s.stampQty) c.say("stamps_here"); }
  else { c.say("stamps_here"); c.s.served = true; }
}

export default post;
