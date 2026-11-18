// A short conversation off the route (bonus): "Un café para el camino" at Tienda El Faro, the little store inside
// Gasolinera El Faro (18 Nov 2026, the owner: "the cashier is only decoration, so the learner walks in and finds no one
// to talk to"). Paco (npc "tienda"), a young cashier, usted to customers, rings up fresh coffee ("¿Chico o grande?"),
// a bag of ice (the learner takes it from the HIELO freezer by the door), water, a soda, chips, cookies, a chocolate
// bar or gum; "¿Algo más?"; the total; cash (change) or card. Mexican store moments: "¿Gusta redondear?" (the total
// rounded up for a charity, here the town's animal shelter), "no hay sistema" (the card terminal is down: cash only,
// the ATM is by the entrance), and since 2019 no plastic bags in Quintana Roo.
// The gas is not his: it is filled and paid outside at the pumps with Doña Chela (s71b-gas), and he says so to anyone
// who asks for gas or where to pay for it. The restroom is outside behind the store (s71b's "Allá atrás, junto a la
// tienda"); the ATM is in the store (s71b's "Hay uno adentro de la tienda").
// Twists: the coffee just ran out (a fresh pot in a few minutes: wait, or not), the card system is down.
// Prices are whole $5 (coffee $25 / $35, ice $35, a soda $25, water, chips, cookies, chocolate $20, gum $10), so every
// total is a multiple of $5 (`domains.price`: $10–$400) and the round-up goes to the next $10. The change is said aloud
// up to $100 (`domains.amount`); anything else, "Gracias, aquí tiene su cambio.".
// Mexican-only words have neutral twins (ahorita, ¿Gusta…?); Spain's text says fuera, surtidores, datáfono, patatas,
// leche (the creamer), coge, la protectora de animales.
// The place: Paco behind the store's counter (theme.ts roomNpcs), talked to from 0.6 m in front of it.

import type { Ctx, EntityDef, SituationDef, Suggestion, Tip } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";
import { yesAgreeGroups } from "../global";
import { payHint, pick, pickFrom } from "../hint-pick";

// ---------------------------------------------------------------------------
// What the store sells (cents of a peso). Coffee is the only thing with a size.

export const PRODUCTS: EntityDef[] = [
  ent("cafe", "café", "coffee", "m", { pl: "cafés", ltPl: "coffees",
    forms: ["cafes", "cafecito", "cafecitos", "un cafecito", "cafe americano", "americano", "cafe negro", "cafe de grano", "cafe recien hecho", "cafe de olla", "cafe caliente", "tinto", "un tinto"],
    attrs: { sized: true, price: [2500, 3500] } }),
  ent("hielo", "bolsa | de | hielo", "bag | of | ice", "f", { pl: "bolsas | de | hielo", ltPl: "bags | of | ice",
    forms: ["hielo", "hielos", "un hielo", "bolsa de hielo", "bolsas de hielo", "bolsita de hielo", "bolsitas de hielo", "bolsa de hielos"],
    attrs: { price: 3500, nat: "bag of ice", natPl: "bags of ice" } }),
  ent("agua", "botella | de | agua", "bottle | of | water", "f", { pl: "botellas | de | agua", ltPl: "bottles | of | water",
    forms: ["agua", "aguas", "un agua", "agua natural", "agua sin gas", "agua embotellada", "botella de agua", "botellas de agua", "botellita de agua", "botellitas de agua", "agua fria", "un agua fria"],
    attrs: { price: 2000, nat: "bottle of water", natPl: "bottles of water" } }),
  ent("refresco", "refresco", "soda", "m", { pl: "refrescos", ltPl: "sodas",
    forms: ["refrescos", "refresquito", "un refresquito", "soda", "sodas", "una soda", "coca", "una coca", "cocas", "cola", "una cola", "chesco", "un chesco", "refresco frio", "gaseosa", "una gaseosa"],
    attrs: { price: 2500 } }),
  ent("papas", "bolsa | de | papas", "bag | of | chips", "f", { pl: "bolsas | de | papas", ltPl: "bags | of | chips",
    forms: ["papas", "unas papas", "papitas", "unas papitas", "papas fritas", "unas papas fritas", "bolsa de papas", "bolsas de papas", "bolsita de papas", "chips", "patatas", "unas patatas", "patatas fritas", "bolsa de patatas", "botana", "una botana"],
    attrs: { price: 2000, nat: "bag of chips", natPl: "bags of chips", spain: "bolsa | de | patatas", spainPl: "bolsas | de | patatas" } }),
  ent("galletas", "paquete | de | galletas", "pack | of | cookies", "m", { pl: "paquetes | de | galletas", ltPl: "packs | of | cookies",
    forms: ["galletas", "unas galletas", "galletitas", "unas galletitas", "galleta", "una galleta", "paquete de galletas", "paquetes de galletas", "paquetito de galletas"],
    attrs: { price: 2000, nat: "pack of cookies", natPl: "packs of cookies" } }),
  ent("chocolate", "chocolate", "chocolate bar", "m", { pl: "chocolates", ltPl: "chocolate bars",
    forms: ["chocolates", "chocolatito", "un chocolatito", "barra de chocolate", "barrita de chocolate", "tableta de chocolate", "chocolatina", "una chocolatina"],
    attrs: { price: 2000 } }),
  ent("chicles", "paquete | de | chicles", "pack | of | gum", "m", { pl: "paquetes | de | chicles", ltPl: "packs | of | gum",
    forms: ["chicles", "unos chicles", "chicle", "un chicle", "paquete de chicles", "paquetes de chicles", "goma de mascar", "chiclets"],
    attrs: { price: 1000, nat: "pack of gum", natPl: "packs of gum" } }),
];

const SIZES: EntityDef[] = [
  ent("small", "chico", "small", "m", { forms: ["chica", "chicos", "chicas", "chiquito", "chiquitos", "pequeno", "pequena", "pequenos", "el chico", "el pequeno", "el mas chico", "el mas pequeno"], chip: "chico", attrs: { spain: "pequeño" } }),
  ent("large", "grande", "large", "m", { forms: ["grandes", "grandote", "el grande", "el mas grande"], chip: "grande" }),
];

const byId = (id: string) => PRODUCTS.find((e) => e.id === id)!;
const SIZE_IDX: Record<string, number> = { small: 0, large: 1 };

/** The totals said aloud: whole $5 from $10 to $400 (a bigger one: "the total's on the screen"). */
const MAX_TOTAL = 40000;
/** The change said aloud: whole $5 up to $100. */
const MAX_CHANGE = 10000;

// ---------------------------------------------------------------------------
// The things bought

interface Buy { id: string; qty: number; size?: string }
const buys = (c: Ctx) => c.s.buys as Buy[];
const priceOf = (b: Buy) => {
  const p = byId(b.id).attrs!.price as number | number[];
  return (Array.isArray(p) ? p[SIZE_IDX[b.size ?? "large"]] : p) * b.qty;
};
const total = (c: Ctx) => buys(c).reduce((a, b) => a + priceOf(b), 0);
const roundUp = (n: number) => Math.ceil(n / 1000) * 1000;
/** What is to pay now: the total (rounded up if the learner said yes), less what was paid before ("¡Ah! Y un chicle"). */
const due = (c: Ctx) => (c.s.paidSoFar ? total(c) - (c.s.paidSoFar as number) : c.s.round ? roundUp(total(c)) : total(c));
const coffees = (c: Ctx) => buys(c).filter((b) => b.id === "cafe");
const pendingCoffee = (c: Ctx) => coffees(c).find((b) => !b.size);
const toArr = (x: any) => (x == null ? [] : Array.isArray(x) ? x : [x]);

function fromSlot(v: any): Buy | null {
  if (!v?.product) return null;
  const tags: string[] = v.__tags || [];
  const n = typeof v.count === "number" ? v.count : tags.includes("q5") ? 5 : tags.includes("q4") ? 4 : tags.includes("q3") ? 3 : tags.includes("q2") ? 2 : 1;
  const b: Buy = { id: v.product as string, qty: Math.max(1, Math.min(n, 20)) };
  if (b.id === "cafe" && v.size) b.size = v.size as string;
  return b;
}

/** Into the order; the same thing named again takes its new number and size ("Mejor dos cafés"). */
function addBuy(c: Ctx, b: Buy): Buy {
  const prev = buys(c).find((x) => x.id === b.id);
  if (!prev) { buys(c).push(b); return b; }
  prev.qty = b.qty;
  if (b.size) prev.size = b.size;
  return prev;
}

const TIPS: Record<string, Tip> = {
  tu_staff: { key: "tu_staff", lt: "Understood! With a store's cashier, usted is more polite: “¿Me da…?”, “Deme…” (me das / dame is for friends).", better: "¿Me da un café grande?" },
};

const AUTO: Record<string, string> = {
  order: "Un café grande, por favor", size: "Grande", coffee_wait: "Sí, espero", more: "Es todo, gracias", pay: "Con tarjeta", round: "No, gracias",
  after_have: "Sí, deme uno", which: "Del café",
};
const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const tienda: SituationDef = {
  id: "x05-tienda",
  bonus: true,
  song: "",
  songTitle: "",
  title: { en: "Un café para el camino", lt: "A coffee for the road" },
  topic: { en: "En la tienda de la gasolinera", lt: "At the gas station store" },
  chapter: 6,
  order: 9,
  location: "gas-station",
  npc: "tienda",
  goal: "Buy a coffee and something for the road (a snack, a drink or a bag of ice), and pay at the counter.",
  intro: "Inside Gasolinera El Faro there's a little store, Tienda El Faro: fresh coffee, ice, snacks and cold drinks. Paco at the counter rings you up. The gas itself you pay for outside, to the attendant at the pumps.",
  entities: { product: PRODUCTS, size: SIZES },

  grammar: {
    macros: {
      order_prefix: [
        "me da #h:me_da", "deme #h:me_da", "me puede dar #h:me_da", "me podria dar #h:me_da", "me regala", "me vende", "vendame", "me cobra #h:cobra", "cobreme #h:cobra", "me cobras #tip:tu_staff",
        "quiero #h:quiero", "quisiera #h:quisiera", "me gustaria", "voy a querer", "voy a llevar #h:llevo", "me llevo #h:llevo", "llevo #h:llevo", "necesito",
        "me pone", "pongame", "me pones #tip:tu_staff", "ponme #tip:tu_staff", "me das #tip:tu_staff", "dame #tip:tu_staff", "me puedes dar #tip:tu_staff",
        "(tambien | y tambien) (me da | quiero | quisiera | me llevo | deme)", "y (me da | deme)", "(mejor)? (deme | me da)",
      ],
      dine: "(para llevar | para el camino | para llevarmelo | para ir | para el viaje)",
      qty: "(un #q1 | una #q1 | uno #q1 | unos | unas | dos #q2 | tres #q3 | cuatro #q4 | cinco #q5 | otro #q1 | otra #q1)",
    },
    slots: {
      // "un café grande", "dos refrescos", "una bolsa de hielo", "unas papas", "seis botellas de agua", "un grande café"
      item: { pattern: [
        "[@qty] {product} [{size}] [de tamano {size}]",
        "[@qty] {size} {product}",
        "{count:number} {product} [{size}]",
      ] },
      items: { pattern: "{item} [(y | y un | y una | y unos | y unas | y tambien | tambien | con | mas) {item}] [(y | mas | y tambien) {item}]" },
    },
  },

  intents: {
    order: { patterns: ["@order_prefix {items} [@dine]", "[solo | nomas | nada mas] {items} @dine", "[solo | nomas | nada mas] {items} [nada mas | por favor]", "(y | tambien) {items}", "{items} (tambien | ademas)",
      "{items} (esta bien | estaria bien)", "mejor {items}"] },
    // "Deme uno grande" (coffee is the only thing with a size): a coffee of that size
    order_size: { patterns: ["@order_prefix (uno | un | una) {size}", "[y] (uno | un) {size} [por favor]", "@order_prefix {count:number} {size}", "(dos | tres) {size}"] },
    // "¿Chico o grande?" – "Grande." / "El chico." / "Mediano" (there's none)
    size_ctx: { patterns: ["{size} #h:size_pick", "(el | uno) {size} #h:size_el", "{size} (por favor | esta bien | nada mas)", "de tamano {size}", "mejor (el)? {size}", "(lo | la) quiero {size}",
      "(mediano | mediana | el mediano | uno mediano | regular | el normal | normal) #mid"] },
    sizes_q: { patterns: ["(que | cuales) (tamanos | medidas) (hay | tiene | tienen | manejan) #h:q_sizes", "de que (tamanos | tamano) (hay | tiene | es | son)", "(hay | tiene | tienen) (mediano | tamano mediano) #mid",
      "(cuanto | que) (tan)? (grande | chico) es", "(hay | tiene | tienen) (otros | otro | mas) tamanos"] },
    more_no: { patterns: ["(es | eso es | seria | eso seria | ya es) todo [por ahora] #h:more_all", "nada mas #h:more_nothing", "(con eso | ya con eso) [es todo]", "(solo | nomas | nada mas) eso [por favor]",
      "no (necesito | quiero | ocupo) nada mas", "ya (es todo | con eso)", "por ahora es todo", "no gracias es todo", "ya estuvo", "(eso | esto) (nada mas | es todo)", "(nada | nada mas) gracias",
      "(con eso | eso) (es suficiente | basta)"] },
    more_yes: { patterns: ["(si | ah si) (algo mas | otra cosa)", "otra cosa", "algo mas", "(espere | un momento) (tambien | ademas) quiero algo"] },
    // "No quiero el refresco", "Sin papas", "Quíteme el chocolate", "El refresco no"
    reject: { patterns: ["[mejor] no (quiero | voy a llevar | me llevo | voy a querer) [el | la | los | las | un | una | unos | unas] {product}", "no {product}", "[mejor] sin [el | la | los | las] {product} [mejor]",
      "(quite | quiteme | quitele | olvide | cancele) [el | la | los | las] {product}", "[mejor] ya no (quiero | voy a llevar) [el | la | los | las] {product}", "[el | la | los | las] {product} no [gracias]",
      "[mejor] ya no (lo | la | los | las) quiero"] },
    // "Unas papas no, mejor unas galletas", "Mejor un agua en vez del refresco"
    swap: { patterns: ["[no] [@qty] {bad:product} no [sino | mejor] [@qty] {product}", "no [quiero] [@qty] {bad:product} (sino | mejor) [@qty] {product}", "[mejor] [@qty] {product} en vez (de | del) [@qty] {bad:product}",
      "(cambie | cambieme) [el | la | los | las] {bad:product} por [@qty] {product}", "en vez (de | del) [@qty] {bad:product} [@qty] {product}"] },
    // "¿Cuánto cuesta el hielo?" — a question, never an order
    ask_price: { patterns: [
      "cuanto (cuesta | cuestan | vale | valen | es | sale | salen) [el | la | los | las | un | una | unos | unas] {product} #h:q_cuanto", "a como (esta | estan | sale | salen | es) [el | la | los | las] {product}",
      "[y] [el | la | los | las] {product} (cuanto | a como) [cuesta | es]", "(que | cual es el) precio (tiene | tienen | de) [el | la | los | las] {product}", "cuanto (cuesta | es | sale | vale) (el | uno) {size}",
      "cuanto (cuesta | vale) (el | un)? cafe {size}", "cuanto (cuesta | vale)", "a como (esta | sale)", "a cuanto (esta | estan | sale | salen) [el | la | los | las] {product}"] },
    // "Deme dos" (no thing named): the thing just asked about, or the last one bought
    order_count: { patterns: ["@order_prefix (uno | una) #q1", "@order_prefix (dos #q2 | tres #q3 | cuatro #q4 | cinco #q5)", "@order_prefix {count:number}", "@order_prefix (otro | otra) #another",
      "@order_prefix (dos #q2 | tres #q3 | cuatro #q4 | cinco #q5) (bolsas | botellas | paquetes)"] },
    // "¿Tiene hielo?" – "Sí." – "Dos, por favor."
    count_ctx: { patterns: ["(uno | una) #q1 [por favor | nada mas]", "(dos #q2 | tres #q3 | cuatro #q4 | cinco #q5) [por favor | nada mas]"] },
    // "¿Y el agua?" right after a price: that one's price
    price_next_ctx: { patterns: ["y (el | la | los | las) {product}", "y (de | del) {product}", "y (el | la) {product} (cuanto | a como)"] },
    // "¿De cuál?" – "Del hielo."
    which_ctx: { patterns: ["[de | del | el | la | los | las | de la | de los | de las] {product} [por favor]"] },
    ask_have: { patterns: ["(tiene | tienen | hay | venden | vende) {product} #h:q_have", "(tiene | tienen | hay) {product} (frio | fria | frios | frias | caliente)", "(le | les) queda {product}", "(tiene | tienen | hay) {product} [aqui]"] },
    product_unknown: { patterns: ["(tiene | tienen | hay | venden | vende) {w:any}", "(me da | deme | quiero | quisiera | me vende | me cobra | necesito) (un | una | unos | unas) {w:any}"] },
    ask_what: { patterns: ["que (tiene | tienen | hay | vende | venden) [de comer | para comer | de tomar | para tomar]", "que (botanas | cosas | bebidas | refrescos) (tiene | tienen | hay)", "que me recomienda", "(tiene | tienen | hay) algo (de comer | para comer | para el camino)"] },
    // "¿Está recién hecho el café?"
    ask_fresh: { patterns: ["(esta | es) recien hecho [el cafe] #h:q_fresh", "(es | esta) [el] cafe (de hoy | fresco | recien hecho)", "(es | esta) de hoy [el cafe]", "el cafe (esta | es) recien hecho", "(esta | es) (fresco | caliente | de hoy) [el cafe]", "el cafe (esta | es) (fresco | caliente | de hoy)",
      "(cuando | a que hora) (hizo | hicieron | preparo) el cafe", "(hay | tiene | tienen) cafe recien hecho"] },
    ask_sugar: { patterns: ["(tiene | tienen | hay | me da) (azucar | crema | leche | sustituto | endulzante | splenda | popote | popotes | pajita | agitador | servilletas | tapa) [para el cafe]",
      "(donde | en donde) (esta | estan | hay) (el azucar | la crema | la leche | los popotes | las servilletas | las tapas)", "(con | lleva) (azucar | leche | crema)"] },
    restroom: { patterns: [
      "(donde | en donde) (esta | queda | hay) [el | un] (bano | sanitario | servicio | servicios | aseo | lavabo) #h:q_restroom", "(donde | en donde) (estan | quedan) (los | unos) (banos | servicios | aseos | lavabos | sanitarios) #h:q_restroom",
      "(tienen | tiene | hay) (bano | banos | sanitarios | servicio | aseo | aseos) [aqui]", "(puedo | me deja) (usar | pasar a) el (bano | sanitario)", "(necesito | quiero) (ir al bano | usar el bano)", "(el | un) bano",
    ] },
    atm: { patterns: ["(hay | tienen | tiene) [un] cajero [automatico] [aqui | por aqui | cerca] #h:q_atm", "(donde | en donde) (hay | esta | queda) (un | el) cajero", "(donde | en donde) (puedo | se puede) sacar dinero"] },
    // "Voy al cajero": at "solo efectivo" (the twist)
    atm_go: { patterns: ["(voy | ahorita voy | ya voy | voy a ir) al cajero [y (ahorita | ya | ahora) (vuelvo | regreso)] #h:atm_go", "(voy a | deje | dejeme) sacar dinero", "(ahorita | ya | ahora) (vuelvo | regreso)", "(voy | ya voy) por efectivo",
      "saco dinero [del cajero] y (vuelvo | regreso)", "un momento voy al cajero"] },
    ice_where: { patterns: ["(donde | en donde) (esta | hay | tiene | tienen | queda) [el] hielo #h:q_ice", "(donde | en donde) (agarro | tomo | encuentro | busco) el hielo", "(donde | en donde) (esta | estan) (la bolsa | las bolsas) de hielo"] },
    // a bag: none (Quintana Roo bans plastic bags)
    bag: { patterns: ["(me da | me puede dar | deme | me regala | me vende) (una bolsa | una bolsita | bolsa) #h:q_bag", "(tiene | tienen | hay | dan) (bolsa | bolsas | bolsita | bolsitas)", "(una | la) (bolsa | bolsita) [por favor]",
      "(me lo | me la | me los | me las) (pone | puede poner) en una bolsa", "(con | en) (bolsa | una bolsa) [por favor]"] },
    // the gas: outside, with Doña Chela
    gas_q: { patterns: [
      "(aqui | donde | en donde | a quien) (pago | le pago | se paga | se le paga) la gasolina #h:q_gas", "(puedo | se puede) pagar (aqui)? la gasolina [aqui | con usted]", "(le pago | pago | vengo a pagar) [aqui] la gasolina",
      "(quiero | necesito | quisiera | vengo a) (cargar | poner | echar)? (gasolina | combustible) [por favor]", "(me | le) (pone | carga | echa | puede poner) gasolina", "(lleno | el tanque lleno | tanque lleno) [de (magna | premium | diesel)] [por favor]",
      "(llene | llenelo | llenemelo | me lo llena | me lo puede llenar) [el tanque]", "{price} de (magna | premium | diesel | gasolina)", "(magna | premium | diesel) [por favor]", "(la | una)? (bomba | gasolinera) (numero)? {number}",
      "(donde | en donde) (esta | queda) la (despachadora | bomba | gasolina)", "(aqui | adentro) (venden | se paga) la gasolina",
    ] },
    // "¿Pago aquí?": the store's things, yes
    pay_where: { patterns: ["(aqui | donde | en donde | a quien) (pago | le pago | se paga) #h:q_where_pay", "(pago | le pago) (aqui | con usted)", "(es | se paga) aqui"] },
    ask_total: { patterns: ["cuanto (es | seria | le debo | va a ser) [todo] [en total]", "cuanto (es | son) en total", "cuanto le debo", "cuanto (va | van | llevo) [hasta ahorita | hasta ahora]", "cuanto le doy"] },
    pay_card: { patterns: [
      "(acepta | aceptan | toman | aceptas) tarjeta #h:take_cards", "con tarjeta #h:pay_card_short", "tarjeta", "(puedo | se puede) pagar con tarjeta #h:pay_card",
      "(pago | voy a pagar | le pago) con tarjeta", "(pago | voy a pagar | le pago | con) [una] tarjeta de (credito | debito)", "con (tarjeta)? de (credito | debito)", "con (la | mi) tarjeta", "aqui (tiene | esta) mi tarjeta",
      "(puedo | se puede) pagar con (el | mi)? (celular | telefono)", "(pago | le pago) con (el | mi) (celular | telefono)", "con (el | mi) celular", "(visa | mastercard | american express)",
      "(me cobra | cobrese | cobreme) con tarjeta", "(solo | nada mas | nomas | solamente) (tengo | traigo | llevo) tarjeta [de (credito | debito)]", "(acepta | aceptan) (apple pay | google pay)",
    ] },
    no_cash: { patterns: ["no (tengo | traigo | llevo) [suficiente] efectivo", "sin efectivo", "no (tengo | traigo) (cash | dinero en efectivo | pesos)", "no puedo pagar en efectivo"] },
    no_card: { patterns: ["no (tengo | traigo) tarjeta", "no (pago | puedo pagar | quiero pagar) con tarjeta", "sin tarjeta"] },
    pay_cash: { patterns: ["[puedo] pagar en efectivo", "en efectivo #h:pay_cash", "efectivo", "(pago | voy a pagar | le pago) en efectivo", "con efectivo", "(tarjeta | con tarjeta) no [mejor] en efectivo", "(solo | nada mas | nomas | solamente) (tengo | traigo | llevo) efectivo"] },
    here_you_go: { patterns: [
      "aqui tiene #h:here_you_go", "aqui esta", "tenga", "tome", "(aqui tiene | tenga | tome | le doy | aqui le doy) [un billete de] {price}", "aqui (tiene | estan) (los | sus) {price}",
      "(le pago | pago) con (un billete de)? {price}", "(tome | tenga | aqui tiene) son {price}", "(aqui tiene | tenga | le doy | aqui le doy | y) {price} mas", "aqui le pago",
    ] },
    keep_change: { patterns: ["quedese con el cambio", "el cambio es para usted", "no me de [el] cambio", "quedate con el cambio #tip:tu_staff"] },
    // "Ya le pagué": never paid (a past)
    past_paid: { patterns: ["ya (le)? pagué [con tarjeta | en efectivo]", "ya (se lo | se la)? pagué", "pagué (con tarjeta | en efectivo)"] },
    // "¿Gusta redondear?" — "Sí, redondee." / "No, así está bien."
    round_yes_ctx: { patterns: ["[si] (redondee | redondeelo | redondeele | redondeamos | redondeo) [por favor] #h:round_yes", "[si] (claro | con gusto) [redondee]", "[si] para (los | el) (perritos | animales | albergue)", "si (dono | lo dono)"] },
    round_no_ctx: { patterns: ["no (redondee | quiero redondear | redondeo | gracias no redondeo)", "(asi | asi esta | asi dejelo) [esta] bien [gracias] #h:round_no", "hoy no [gracias]", "sin redondear", "no gracias asi esta bien"] },
    round_what: { patterns: ["(para que | para quien) es [el redondeo | eso | el donativo | la donacion]", "que es (el redondeo | redondear)", "(a donde | adonde) va (el dinero | el redondeo)"] },
    // "¿Lo espera unos minutos?" (the coffee): wait or not
    wait_yes_ctx: { patterns: ["[si] (lo | la)? espero [por favor] #h:wait_yes", "[si] (me espero | si espero | claro que espero)", "[si] no hay problema [lo | me]? espero", "(esta bien | claro | ok | bueno) (lo | me)? espero", "[si] (cinco minutos | unos minutos) esta bien",
      "[si] tengo tiempo", "si no tengo prisa"] },
    // "No tengo prisa" / "No, tengo prisa": the comma is lost, so he asks again (rule 10)
    wait_amb_ctx: { patterns: ["no tengo prisa"] },
    wait_no_ctx: { patterns: ["no (puedo esperar | me puedo esperar | tengo tiempo) #h:wait_no", "(tengo | traigo | llevo) prisa", "(mejor | entonces) no [gracias]", "(mejor | entonces) (sin | no) cafe", "no gracias tengo prisa", "no puedo"] },
  },

  lines: {
    greet: [
      t("¡Buenas | tardes! | ¿Qué | le | doy?", "Good | afternoon! | What | (to) you | I-give?", "Good afternoon! What can I get you?"),
      t("¡Buenas! | ¿Qué | va | a | llevar?", "Hi! | What | are you going | to | take?", "Hi! What are you getting?"),
      t("¡{m:Bienvenido|f:Bienvenida}! | ¿Qué | se le ofrece?", "Welcome! | What | can I get you?", "Welcome! What can I get you?",
        { flags: { 2: "se le ofrece: the shop's polite “what can I do for you?”." },
          spain: t("¡{m:Bienvenido|f:Bienvenida}! | ¿Qué | desea?", "Welcome! | What | do you want?", "Welcome! What can I get you?") }),
    ],
    greet_howareyou: [t("¡Buenas | tardes! | ¿Cómo | está?", "Good | afternoon! | How | are you?", "Good afternoon! How are you?")],
    // (after the greeting's own question: never the same question twice in a row)
    ask_order: [
      t("Dígame.", "Tell me.", "Go ahead."),
      t("¿En | qué | le | ayudo?", "In | what | (to) you | I-help?", "How can I help you?"),
    ],
    go_ahead: [t("Claro, | dígame.", "Sure, | tell me.", "Sure, go ahead.")],
    what_else: [t("Claro. | ¿Qué | más | le | doy?", "Sure. | What | else | (to) you | I-give?", "Sure. What else can I get you?")],
    // --- the coffee
    ask_size: [
      t("¿Chico | o | grande?", "Small | or | large?", "Small or large?", { spain: t("¿Pequeño | o | grande?", "Small | or | large?", "Small or large?") }),
      t("¿De | qué | tamaño: | chico | o | grande?", "Of | what | size: | small | or | large?", "What size, small or large?",
        { spain: t("¿De | qué | tamaño: | pequeño | o | grande?", "Of | what | size: | small | or | large?", "What size, small or large?") }),
    ],
    two_sizes: [t("Solo | hay | chico | y | grande.", "Only | there-is | small | and | large.", "There's only small and large.",
      { spain: t("Solo | hay | pequeño | y | grande.", "Only | there-is | small | and | large.", "There's only small and large.") })],
    sizes: [t("Hay | chico, | de | veinticinco | pesos, | y | grande, | de | treinta y cinco.", "There's | small, | of | twenty-five | pesos, | and | large, | of | thirty-five.",
      "There's a small for twenty-five pesos and a large for thirty-five.",
      { spain: t("Hay | pequeño, | de | veinticinco | pesos, | y | grande, | de | treinta y cinco.", "There's | small, | of | twenty-five | pesos, | and | large, | of | thirty-five.",
        "There's a small for twenty-five pesos and a large for thirty-five.") })],
    price_coffee: [t("El | chico | cuesta | veinticinco | pesos, | y | el | grande, | treinta y cinco.", "The | small | costs | twenty-five | pesos, | and | the | large, | thirty-five.",
      "A small is twenty-five pesos, and a large is thirty-five.",
      { spain: t("El | pequeño | cuesta | veinticinco | pesos, | y | el | grande, | treinta y cinco.", "The | small | costs | twenty-five | pesos, | and | the | large, | thirty-five.",
        "A small is twenty-five pesos, and a large is thirty-five.") })],
    coffee_served: [t("Aquí tiene | su | café. | El | azúcar | y | la | crema | están | junto | a | la | cafetera.", "Here's | your | coffee. | The | sugar | and | the | creamer | are | next | to | the | coffee maker.",
      "Here's your coffee. Sugar and creamer are by the coffee maker.",
      { spain: t("Aquí tiene | su | café. | El | azúcar | y | la | leche | están | junto | a | la | cafetera.", "Here's | your | coffee. | The | sugar | and | the | milk | are | next | to | the | coffee maker.",
        "Here's your coffee. Sugar and milk are by the coffee maker.") })],
    coffees_served: [t("Aquí tiene | sus | cafés. | El | azúcar | y | la | crema | están | junto | a | la | cafetera.", "Here's | your | coffees. | The | sugar | and | the | creamer | are | next | to | the | coffee maker.",
      "Here are your coffees. Sugar and creamer are by the coffee maker.",
      { spain: t("Aquí tiene | sus | cafés. | El | azúcar | y | la | leche | están | junto | a | la | cafetera.", "Here's | your | coffees. | The | sugar | and | the | milk | are | next | to | the | coffee maker.",
        "Here are your coffees. Sugar and milk are by the coffee maker.") })],
    sugar: [t("El | azúcar | y | la | crema | están | junto | a | la | cafetera.", "The | sugar | and | the | creamer | are | next | to | the | coffee maker.", "Sugar and creamer are by the coffee maker.",
      { spain: t("El | azúcar | y | la | leche | están | junto | a | la | cafetera.", "The | sugar | and | the | milk | are | next | to | the | coffee maker.", "Sugar and milk are by the coffee maker.") })],
    fresh_yes: [
      t("Sí, | lo | acabo de | hacer.", "Yes, | it | I-have-just | made.", "Yes, I just made it.", { flags: { 1: "lo: “it” (el café), an object pronoun." } }),
      t("Sí, | está | recién | hecho.", "Yes, | it's | freshly | made.", "Yes, it's fresh."),
    ],
    fresh_out: [t("Se acabó, | pero | ahorita | hago | más.", "It-ran-out, | but | right now | I-make | more.", "It just ran out, but I'm making more right now.",
      { flags: { 2: "Mexican: ahorita = right now, in a moment." },
        neutral: t("Se acabó, | pero | ya | hago | más.", "It-ran-out, | but | now | I-make | more.", "It just ran out, but I'm making more right now."),
        spain: t("Se ha acabado, | pero | ahora mismo | hago | más.", "It-has-run-out, | but | right now | I-make | more.", "It just ran out, but I'm making more right now.", { flags: {} }) })],
    // the twist: the pot is empty
    coffee_out: [t("Uy, | se acabó | el | café. | Ahorita | hago | más; | ¿lo | espera | unos | minutos?", "Oh, | it-ran-out | the | coffee. | Right now | I-make | more; | it | will you wait (for) | a few | minutes?",
      "Oh, the coffee just ran out. I'm making a fresh pot; can you wait a few minutes?",
      { flags: { 4: "Mexican: ahorita = right now, in a moment.", 7: "lo: “it” (the coffee), an object pronoun." },
        neutral: t("Uy, | se acabó | el | café. | Ya | hago | más; | ¿lo | espera | unos | minutos?", "Oh, | it-ran-out | the | coffee. | Now | I-make | more; | it | will you wait (for) | a few | minutes?",
          "Oh, the coffee just ran out. I'm making a fresh pot; can you wait a few minutes?", { flags: { 7: "lo: “it” (the coffee), an object pronoun." } }),
        spain: t("Uy, | se ha acabado | el | café. | Ahora mismo | hago | más; | ¿lo | espera | unos | minutos?", "Oh, | it-has-run-out | the | coffee. | Right now | I-make | more; | it | will you wait (for) | a few | minutes?",
          "Oh, the coffee just ran out. I'm making a fresh pot; can you wait a few minutes?", { flags: { 7: "lo: “it” (the coffee), an object pronoun." } }) })],
    wait_again: [t("¿Entonces, | lo | espera?", "So, | it | will you wait (for)?", "So, will you wait for it?")],
    wait_ok: [t("Gracias. | Ya | casi | sale... | ¡Listo, | recién | hecho!", "Thanks. | Already | almost | it-comes-out... | Ready, | freshly | made!", "Thanks. It's almost ready… There we go, fresh out of the pot!",
      { spain: t("Gracias. | Ya | casi | sale... | ¡Ya está, | recién | hecho!", "Thanks. | Already | almost | it-comes-out... | Done, | freshly | made!", "Thanks. It's almost ready… There we go, fresh out of the pot!") })],
    something_else: [t("Está bien. | ¿Le | doy | otra | cosa?", "It's fine. | (To) you | I-give | other | thing?", "No problem. Can I get you something else?")],
    // --- the ice
    ice_self: [t("La | bolsa | de | hielo | la | toma | usted | del | congelador, | junto | a | la | puerta.", "The | bag | of | ice | it | take | you | from the | freezer, | next | to | the | door.",
      "Grab the bag of ice yourself from the freezer by the door.", { flags: { 4: "la repeats “the bag”: Spanish often does this when the object comes first." },
        spain: t("La | bolsa | de | hielo | la | coge | usted | del | congelador, | junto | a | la | puerta.", "The | bag | of | ice | it | take | you | from the | freezer, | next | to | the | door.",
          "Grab the bag of ice yourself from the freezer by the door.", { flags: { 4: "la repeats “the bag”: Spanish often does this when the object comes first." } }) })],
    ice_self_pl: [t("Las | bolsas | de | hielo | las | toma | usted | del | congelador, | junto | a | la | puerta.", "The | bags | of | ice | them | take | you | from the | freezer, | next | to | the | door.",
      "Grab the bags of ice yourself from the freezer by the door.", { flags: { 4: "las repeats “the bags”: Spanish often does this when the object comes first." },
        spain: t("Las | bolsas | de | hielo | las | coge | usted | del | congelador, | junto | a | la | puerta.", "The | bags | of | ice | them | take | you | from the | freezer, | next | to | the | door.",
          "Grab the bags of ice yourself from the freezer by the door.", { flags: { 4: "las repeats “the bags”: Spanish often does this when the object comes first." } }) })],
    ice_where: [t("En | el | congelador, | junto | a | la | puerta.", "In | the | freezer, | next | to | the | door.", "In the freezer by the door.")],
    // --- more
    ask_more: [
      t("¿Algo | más?", "Something | more?", "Anything else?"),
      t("¿Qué | más | le | doy?", "What | else | (to) you | I-give?", "What else can I get you?"),
      t("¿Va | a | llevar | algo | más?", "Are you going | to | take | something | more?", "Anything else for you?"),
    ],
    ask_more_short: [t("¿Algo | más?", "Something | more?", "Anything else?")],
    ack: [t("Muy | bien.", "Very | good.", "Okay."), t("Claro.", "Sure.", "Sure.")],
    removed: [t("Muy | bien, | {lo@X} | quito.", "Very | good, | it | I-remove.", "Okay, I'll take it off.", { flags: { 2: "lo / la: “it” (a pronoun here, not the article)." } })],
    removed_pl: [t("Muy | bien, | {lo@X:pl} | quito.", "Very | good, | them | I-remove.", "Okay, I'll take them off.", { flags: { 2: "los / las: “them” (a pronoun here, not the article)." } })],
    swap_ok: [t("Muy | bien: | {X.np}, | entonces.", "Very | good: | {X.np}, | then.", "Okay, {X.np} then.")],
    have_yes: [t("Sí, | claro.", "Yes, | sure.", "Yes, of course."), t("¡Claro! | Sí | hay.", "Sure! | Yes | there-is.", "Sure, we've got some.")],
    stock: [t("Hay | café | recién | hecho, | refrescos, | agua, | papas, | galletas | y | hielo.", "There's | coffee | freshly | made, | sodas, | water, | chips, | cookies | and | ice.",
      "We've got fresh coffee, sodas, water, chips, cookies and ice.", { flags: { 6: "papas: in a store, a bag of potato chips." },
        spain: t("Hay | café | recién | hecho, | refrescos, | agua, | patatas, | galletas | y | hielo.", "There's | coffee | freshly | made, | sodas, | water, | chips, | cookies | and | ice.",
          "We've got fresh coffee, sodas, water, chips, cookies and ice.", { flags: { 6: "patatas: in a shop, a bag of potato chips." } }) })],
    price_one: [t("{X.np} | cuesta | {$price}.", "{X.np} | costs | {$price}.", "{X.np} is {$price}.")],
    which_one: [t("¿De | cuál?", "Of | which one?", "Which one?")],
    unknown: [t("Eso | no lo tenemos, | perdón.", "That | we don't have it, | sorry.", "Sorry, we don't have that.")],
    // --- side questions
    restroom: [t("Está | afuera, | aquí | atrás | de | la | tienda.", "It's | outside, | here | behind | of | the | store.", "It's outside, right behind the store.",
      { spain: t("Está | fuera, | aquí | detrás | de | la | tienda.", "It's | outside, | here | behind | of | the | store.", "It's outside, right behind the store.") })],
    atm: [t("Sí, | ahí | está, | mire: | junto | a | la | entrada.", "Yes, | there | it-is, | look: | next | to | the | entrance.", "Yes, it's right there, see? By the entrance.")],
    atm_there: [t("Ahí | está | el | cajero, | junto | a | la | entrada.", "There | is | the | ATM, | next | to | the | entrance.", "The ATM's right there by the entrance.")],
    atm_offer: [t("Si | quiere, | vaya | al | cajero; | aquí | {m:lo|f:la} | espero.", "If | you-want, | go | to the | ATM; | here | (for) you | I-wait.", "If you like, go to the ATM; I'll wait for you here.",
      { flags: { 6: "lo / la: “you” (usted), by the learner's gender." } })],
    atm_wait: [t("Sí, | aquí | {m:lo|f:la} | espero.", "Yes, | here | (for) you | I-wait.", "Sure, I'll wait for you here.", { flags: { 2: "lo / la: “you” (usted), by the learner's gender." } })],
    no_bags: [t("Perdón, | ya | no damos | bolsas | de | plástico: | aquí | en | Quintana Roo | están | prohibidas.", "Sorry, | anymore | we-don't-give | bags | of | plastic: | here | in | Quintana Roo | they-are | banned.",
      "Sorry, we don't give out plastic bags anymore: they're banned here in Quintana Roo.")],
    // the gas is filled and paid outside, with Doña Chela (s71b)
    gas_outside: [
      t("La | gasolina | es | afuera, | en | las | bombas: | ahí | Doña Chela | se la | pone | y | ahí mismo | le | cobra.", "The | gas | is | outside, | at | the | pumps: | there | Doña Chela | it for you | puts | and | right there | (to) you | she-charges.",
        "Gas is outside at the pumps: Doña Chela fills you up and takes the payment right there.",
        { flags: { 9: "se la: “it for you” (la gasolina); le becomes se before la." },
          spain: t("La | gasolina | es | fuera, | en | los | surtidores: | ahí | Doña Chela | se la | pone | y | ahí mismo | le | cobra.", "The | gas | is | outside, | at | the | pumps: | there | Doña Chela | it for you | puts | and | right there | (to) you | she-charges.",
            "Gas is outside at the pumps: Doña Chela fills you up and takes the payment right there.", { flags: { 9: "se la: “it for you” (la gasolina); le becomes se before la." } }) }),
      t("Eso | es | con | Doña Chela, | afuera, | en | las | bombas: | ella | le | pone | la | gasolina | y | le | cobra.", "That | is | with | Doña Chela, | outside, | at | the | pumps: | she | (for) you | puts | the | gas | and | (to) you | she-charges.",
        "That's Doña Chela, outside at the pumps: she fills you up and you pay her there.",
        { spain: t("Eso | es | con | Doña Chela, | fuera, | en | los | surtidores: | ella | le | pone | la | gasolina | y | le | cobra.", "That | is | with | Doña Chela, | outside, | at | the | pumps: | she | (for) you | puts | the | gas | and | (to) you | she-charges.",
          "That's Doña Chela, outside at the pumps: she fills you up and you pay her there.") }),
    ],
    pay_here: [t("Sí, | aquí | conmigo.", "Yes, | here | with me.", "Yes, right here with me.")],
    // --- the total, the round-up, paying
    say_total: [
      t("Son | {$price}.", "That's | {$price}.", "That's {$price}."),
      t("Serían | {$price}.", "That would be | {$price}.", "That'll be {$price}."),
    ],
    total_screen: [t("Aquí | en | la | pantalla | le | sale | el | total.", "Here | on | the | screen | (to) you | it-comes-out | the | total.", "The total's right here on the screen.")],
    round_ask: [t("¿Gusta | redondear | a | {$price}? | Es | para | el | albergue | de | animales.", "Would you like | to round up | to | {$price}? | It's | for | the | shelter | of | animals.",
      "Would you like to round up to {$price}? It goes to the animal shelter.",
      { flags: { 0: "Mexican: ¿Gusta…? = would you like…? (very polite). Elsewhere: ¿Quiere…?", 1: "Mexican stores often offer to round your total up; the extra goes to a charity. A no is perfectly fine." },
        neutral: t("¿Quiere | redondear | a | {$price}? | Es | para | el | albergue | de | animales.", "Do you want | to round up | to | {$price}? | It's | for | the | shelter | of | animals.",
          "Would you like to round up to {$price}? It goes to the animal shelter.", { flags: { 1: "Many stores offer to round your total up; the extra goes to a charity. A no is perfectly fine." } }),
        spain: t("¿Quiere | redondear | a | {$price}? | Es | para | la | protectora | de | animales.", "Do you want | to round up | to | {$price}? | It's | for | the | shelter | of | animals.",
          "Would you like to round up to {$price}? It goes to the animal shelter.", { flags: { 1: "Some shops offer to round your total up; the extra goes to a charity. A no is perfectly fine." } }) })],
    round_again: [t("¿Entonces, | redondeamos?", "So, | do we round up?", "So, shall we round it up?")],
    round_what: [t("Es | un | donativo | para | el | albergue | de | animales | del | pueblo.", "It's | a | donation | for | the | shelter | of | animals | of the | town.", "It's a donation for the town's animal shelter.",
      { spain: t("Es | un | donativo | para | la | protectora | de | animales | del | pueblo.", "It's | a | donation | for | the | shelter | of | animals | of the | town.", "It's a donation for the town's animal shelter.") })],
    round_yes: [t("¡Muchas | gracias! | Entonces | son | {$price}.", "Many | thanks! | Then | that's | {$price}.", "Thank you so much! That's {$price}, then.")],
    round_no: [t("Está bien, | no se preocupe.", "That's fine, | don't worry.", "That's fine, no worries.")],
    ask_pay: [
      t("¿Efectivo | o | tarjeta?", "Cash | or | card?", "Cash or card?"),
      t("¿Cómo | va | a | pagar?", "How | you-go | to | pay?", "How would you like to pay?"),
    ],
    card_yes: [t("Sí, | claro, | con | tarjeta | sí.", "Yes, | sure, | with | card | yes.", "Yes, sure, card's fine.")],
    cash_yes: [t("Sí, | claro.", "Yes, | sure.", "Sure.")],
    card_ok: [t("Acerque | su | tarjeta... | Listo, | ya | pasó.", "Bring close | your | card... | Done, | already | it-went-through.", "Tap your card… Done, it went through.",
      { spain: t("Acerque | su | tarjeta... | Ya está, | ya | ha pasado.", "Bring close | your | card... | Done, | already | it's-gone-through.", "Tap your card… Done, it went through.") })],
    // the twist: the card terminal can't connect
    no_system: [t("Ay, | perdón: | ahorita | no hay | sistema, | solo | efectivo. | Ahí | está | el | cajero, | junto | a | la | entrada.",
      "Oh, | sorry: | right now | there's no | system, | only | cash. | There | is | the | ATM, | next | to | the | entrance.",
      "Oh, sorry: the card system's down right now, cash only. The ATM's right there by the entrance.",
      { flags: { 2: "Mexican: ahorita = right now.", 4: "No hay sistema: the card terminal can't connect, a common sign in Mexican stores." },
        neutral: t("Ay, | perdón: | ahora | no hay | sistema, | solo | efectivo. | Ahí | está | el | cajero, | junto | a | la | entrada.",
          "Oh, | sorry: | now | there's no | system, | only | cash. | There | is | the | ATM, | next | to | the | entrance.",
          "Oh, sorry: the card system's down right now, cash only. The ATM's right there by the entrance.", { flags: { 4: "No hay sistema: the card terminal can't connect." } }),
        spain: t("Ay, | perdón: | ahora mismo | no funciona | el | datáfono, | solo | efectivo. | Ahí | está | el | cajero, | junto | a | la | entrada.",
          "Oh, | sorry: | right now | doesn't work | the | card machine, | only | cash. | There | is | the | ATM, | next | to | the | entrance.",
          "Oh, sorry: the card system's down right now, cash only. The ATM's right there by the entrance.", { flags: { 5: "el datáfono: the card machine." } }) })],
    no_system_again: [t("Perdón, | sigue | sin | sistema: | solo | efectivo.", "Sorry, | it-stays | without | system: | only | cash.", "Sorry, the system's still down: cash only.",
      { spain: t("Perdón, | el | datáfono | sigue | sin | funcionar: | solo | efectivo.", "Sorry, | the | card machine | it-stays | without | working: | only | cash.", "Sorry, the system's still down: cash only.") })],
    not_yet: [t("Me | paga | al | final, | no se preocupe.", "(To) me | you-pay | at the | end, | don't worry.", "You can pay me at the end, don't worry.")],
    not_paid: [t("Mmm, | todavía | no, | ¿eh? | Son | {$price}.", "Hmm, | still | not, | eh? | That's | {$price}.", "Hmm, not yet, I'm afraid. That's {$price}.")],
    short: [t("Perdón, | no alcanza: | son | {$price}.", "Sorry, | it's not enough: | it's | {$price}.", "Sorry, that's not enough: it's {$price}.",
      { flags: { 1: "alcanzar = to be enough (literally “to reach”)." },
        spain: t("Perdón, | no llega: | son | {$price}.", "Sorry, | it's not enough: | it's | {$price}.", "Sorry, that's not enough: it's {$price}.", { flags: { 1: "no llega: it isn't enough (llegar = to reach)." } }) })],
    short_again: [t("Todavía | no alcanza.", "Still | it's not enough.", "That's still not enough.", { spain: t("Todavía | no llega.", "Still | it's not enough.", "That's still not enough.") })],
    change_is: [t("Aquí tiene | su | cambio: | {$amount}.", "Here's | your | change: | {$amount}.", "Here's your change: {$amount}.")],
    change_back: [t("Gracias, | aquí tiene | su | cambio.", "Thanks, | here's | your | change.", "Thanks, here's your change.")],
    exact: [t("¡Exacto! | Gracias.", "Exact! | Thanks.", "Exactly right! Thank you.")],
    cash_thanks: [t("Gracias.", "Thanks.", "Thank you."), t("Muchas | gracias.", "Many | thanks.", "Thank you very much.")],
    tip_thanks: [t("¡Ay, | gracias, | muy | amable!", "Oh, | thanks, | very | kind!", "Oh, thank you, that's very kind!")],
    extra_due: [t("Claro. | Son | {$price} | más.", "Sure. | That's | {$price} | more.", "Sure. That's {$price} more.")],
    bye: [
      t("¡Que | le | vaya | bien!", "(I hope) | (for) you | it-goes | well!", "Take care!"),
      t("¡Buen | viaje!", "Good | trip!", "Have a good trip!"),
    ],
    bye_nothing: [t("Está bien. | ¡Que | le | vaya | bien!", "It's fine. | (I hope) | (for) you | it-goes | well!", "No problem. Take care!")],
  },

  domains: {
    // the totals (whole $5 from $10 to $400; rounded up, whole $10) and the prices of single things
    price: () => {
      const s = new Set<number>();
      for (let p = 1000; p <= MAX_TOTAL; p += 500) s.add(p);
      for (const e of PRODUCTS) { const p = e.attrs!.price as number | number[]; for (const v of Array.isArray(p) ? p : [p]) s.add(v); }
      return [...s].sort((a, b) => a - b);
    },
    // the change said aloud
    amount: () => { const s: number[] = []; for (let p = 500; p <= MAX_CHANGE; p += 500) s.push(p); return s; },
  },

  hints: {
    order: {
      lt: "Ask for something", slot: "product", examples: ["cafe", "hielo", "agua", "papas"],
      items: [
        { id: "me_da", s: t("¿Me | da | {X.np}, | por favor?", "(To) me | you-give | {X.np}, | please?", "Can I have {X.np}, please?") },
        { id: "coffee", s: t("Un | café | grande, | por favor.", "A | coffee | large, | please.", "A large coffee, please."), only: (e) => e.id === "cafe", note: "Coffee comes small or large: chico o grande." },
        { id: "llevo", s: t("Me llevo | {X.np}.", "I'll take | {X.np}.", "I'll take {X.np}.") },
        { id: "quiero", s: t("Quiero | {X.np}.", "I want | {X.np}.", "I'd like {X.np}.") },
        { id: "quisiera", s: t("Quisiera | {X.np}, | por favor.", "I'd like | {X.np}, | please.", "I'd like {X.np}, please.") },
        { id: "cobra", s: t("¿Me | cobra | {X.np}, | por favor?", "(To) me | you-charge | {X.np}, | please?", "Could you ring up {X.np} for me, please?"),
          note: "At a store counter: “¿Me cobra…?” = ring this up for me." },
      ],
    },
    ask_price: {
      lt: "Ask the price", slot: "product", examples: ["hielo", "cafe", "refresco"],
      items: [
        { id: "q_cuanto", s: t("¿Cuánto | cuesta | {X.np}?", "How much | costs | {X.np}?", "How much is {X.np}?") },
        { id: "q_have", s: t("¿Tiene | {X.pl}?", "Do you have | {X.pl}?", "Do you have {X.pl}?") },
      ],
    },
    size: {
      lt: "Say the size", slot: "size", examples: ["small", "large"],
      items: [
        { id: "size_pick", s: t("{X}, | por favor.", "{X}, | please.", "{X}, please.") },
        { id: "size_el", s: t("El | {X}.", "The | {X}.", "The {X} one.") },
      ],
    },
    wait: {
      lt: "Say whether you'll wait",
      items: [
        { id: "wait_yes", s: t("Sí, | lo | espero.", "Yes, | it | I-wait (for).", "Sure, I'll wait."), note: "lo: “it” (the coffee)." },
        { id: "wait_no", s: t("No | puedo | esperar, | gracias.", "Not | I-can | wait, | thanks.", "I can't wait, thanks.") },
      ],
    },
    more: {
      lt: "Say that's all",
      items: [
        { id: "more_all", s: t("Es | todo, | gracias.", "It's | all, | thanks.", "That's all, thanks.", { spain: t("Eso | es | todo, | gracias.", "That | is | all, | thanks.", "That's all, thanks.") }) },
        { id: "more_nothing", s: t("Nada más, | gracias.", "That's all, | thanks.", "Nothing else, thanks.") },
      ],
    },
    ask: {
      lt: "Ask something (restroom, gas, ATM)",
      items: [
        { id: "q_restroom", s: t("¿Dónde | está | el | baño?", "Where | is | the | restroom?", "Where's the restroom?", { spain: t("¿Dónde | están | los | aseos?", "Where | are | the | restrooms?", "Where's the restroom?") }) },
        { id: "q_gas", s: t("¿Aquí | pago | la | gasolina?", "Here | I-pay | the | gas?", "Do I pay for gas here?"), note: "In Mexico the attendant at the pump fills the tank and takes the payment." },
        { id: "q_atm", s: t("¿Hay | un | cajero | aquí?", "Is there | an | ATM | here?", "Is there an ATM here?") },
        { id: "q_fresh", s: t("¿Está | recién | hecho | el | café?", "Is it | freshly | made | the | coffee?", "Is the coffee fresh?") },
        { id: "q_ice", s: t("¿Dónde | está | el | hielo?", "Where | is | the | ice?", "Where's the ice?") },
        { id: "q_bag", s: t("¿Me | da | una | bolsa?", "(To) me | you-give | a | bag?", "Could I have a bag?") },
        { id: "q_sizes", s: t("¿Qué | tamaños | hay?", "What | sizes | are there?", "What sizes are there?") },
        { id: "q_where_pay", s: t("¿Aquí | le | pago?", "Here | (to) you | I-pay?", "Do I pay you here?") },
      ],
    },
    round: {
      lt: "Round up, or not",
      items: [
        { id: "round_yes", s: t("Sí, | redondee, | por favor.", "Yes, | round up, | please.", "Sure, round it up."), note: "The extra pesos go to a charity; a no is just as fine." },
        { id: "round_no", s: t("No, | así | está | bien, | gracias.", "No, | like this | it's | fine, | thanks.", "No, that's fine as it is, thanks.") },
      ],
    },
    pay: {
      lt: "Pay",
      items: [
        { id: "take_cards", s: t("¿Aceptan | tarjeta?", "Do you accept | card?", "Do you take cards?") },
        { id: "pay_card_short", s: t("Con | tarjeta, | por favor.", "With | card, | please.", "Card, please.") },
        { id: "pay_cash", s: t("En efectivo.", "In cash.", "Cash.") },
        { id: "here_you_go", s: t("Aquí tiene.", "Here you go.", "Here you go.") },
        { id: "pay_card", s: t("¿Puedo | pagar | con | tarjeta?", "Can I | pay | with | card?", "Can I pay by card?") },
      ],
    },
    atm: {
      lt: "Go to the ATM",
      items: [
        { id: "atm_go", s: t("Voy | al | cajero | y | ahorita | vuelvo.", "I-go | to the | ATM | and | right now | I-come-back.", "I'll go to the ATM and be right back.",
          { flags: { 4: "Mexican: ahorita = right now, in a moment." },
            neutral: t("Voy | al | cajero | y | ya | vuelvo.", "I-go | to the | ATM | and | soon | I-come-back.", "I'll go to the ATM and be right back."),
            spain: t("Voy | al | cajero | y | ahora | vuelvo.", "I-go | to the | ATM | and | now | I-come-back.", "I'll go to the ATM and be right back.", { flags: {} }) }) },
      ],
    },
  },

  tips: TIPS,

  merges: {
    "se le ofrece": { reason: "lexical_expression", split: "se → itself + le → to you + ofrece → it offers; the service formula = what can I get you.", minimal: "Three words." },
    "acabo de": { reason: "lexical_expression", split: "acabo → I finish + de → of; acabar de + infinitive = to have just (done).", minimal: "Two words." },
    "treinta y cinco": { reason: "lexical_expression", split: "treinta → thirty + y → and + cinco → five: one number, thirty-five.", minimal: "One number." },
    "doña chela": { reason: "lexical_expression", split: "Doña → Mrs. (a title) + Chela: one name.", minimal: "Title and name." },
    "quintana roo": { reason: "lexical_expression", split: "Quintana + Roo: the name of one Mexican state.", minimal: "One place name." },
    "ahí mismo": { reason: "lexical_expression", split: "ahí → there + mismo → same; together = right there.", minimal: "Two words." },
    "se acabó": { reason: "grammatical_fusion", split: "se → itself + acabó → it finished; acabarse = to run out (of a thing).", minimal: "Two words." },
    "se ha acabado": { reason: "grammatical_fusion", split: "se → itself + ha acabado → has finished: Spain's perfect of acabarse, to run out.", minimal: "Three words." },
    "ha pasado": { reason: "grammatical_fusion", split: "ha → have/has + pasado (participle): haber + participle, Spain's present perfect for what has just happened.", minimal: "Auxiliary and participle." },
  },

  mission: [
    { lt: "Ask for something for the road", done: (c) => buys(c).length > 0 || !!c.s.paid },
    { lt: "Say the coffee size", optional: true, when: (c) => coffees(c).length > 0, done: (c) => coffees(c).length > 0 && !pendingCoffee(c) },
    { lt: "Tell him that's all", done: (c) => !!c.s.moreDone },
    { lt: "Pay at the counter", done: (c) => !!c.s.paid },
  ],

  // -------------------------------------------------------------------------

  steps: [
    { id: "order", done: (c) => buys(c).length > 0 || !!c.s.nothing,
      ask: (c) => c.say("ask_order"),
      expects: ["order", "order_size", "order_count", "ask_price", "ask_have", "ask_what", "gas_q", "ask_fresh", "product_unknown", "sizes_q"],
      suggest: [{ lt: "Ask for something", hint: "order", options: "product" }, { lt: "Ask something", hint: "ask" }],
      help: (c) => { c.say("stock"); },
      yes: (c) => { c.say("go_ahead"); c.hold(); } },
    // the twist: no coffee for a few minutes
    { id: "coffee_wait", when: (c) => !!c.s.coffeeOut && coffees(c).length > 0 && c.s.waited === undefined, done: (c) => c.s.waited !== undefined,
      ask: (c) => {
        if (c.s.waitAsked) { c.say("wait_again"); return; }
        c.s.waitAsked = true; c.twist("coffee_out"); c.say("coffee_out");
      },
      expects: ["wait_yes_ctx", "wait_no_ctx", "wait_amb_ctx", "reject"],
      suggest: [{ lt: "Say whether you'll wait", hint: "wait" }],
      yes: (c) => coffeeWait(c), no: (c) => coffeeSkip(c) },
    { id: "size", when: (c) => !!pendingCoffee(c) && c.s.waited !== false, done: () => false,
      ask: (c) => c.say("ask_size"),
      expects: ["size_ctx", "order", "order_size", "sizes_q", "ask_price"],
      suggest: [{ lt: "Say the size", hint: "size", options: "size" }] },
    { id: "more", when: (c) => buys(c).length > 0 && !pendingCoffee(c), done: (c) => !!c.s.moreDone,
      ask: (c) => { c.s.moreAsks = (c.s.moreAsks ?? 0) + 1; c.say(c.s.moreAsks > 1 ? "ask_more_short" : "ask_more"); },
      expects: ["more_no", "order", "order_size", "order_count", "more_yes", "ask_price", "ask_have", "reject", "swap", "ask_total"],
      suggest: [{ lt: "Say that's all", hint: "more" }, { lt: "Buy something else", hint: "order", options: "product" }, { lt: "Ask something", hint: "ask" }],
      yes: (c) => { c.say("what_else"); c.hold(); },
      no: (c) => { c.s.moreDone = true; } },
    { id: "pay", when: (c) => !!c.s.moreDone && buys(c).length > 0, done: (c) => !!c.s.paid,
      ask: (c) => {
        if (!c.s.totalSaid) {
          c.s.totalSaid = true;
          sayDue(c);
          // the card was named already ("Con tarjeta" at "¿Algo más?"): paid here, so his goodbye comes now
          if (c.s.method === "card") { payCard(c); if (c.s.paid) { c.s.byeSaid = true; c.say("bye"); expectClosing(c); } return; }
          if (c.s.askRound && c.s.round === undefined && total(c) % 1000 !== 0 && roundUp(total(c)) <= MAX_TOTAL && !c.s.paidSoFar) askRound(c);
          return;
        }
        if (c.s.cashOnly || c.s.method === "cash") return; // she waits for the money
        c.say("ask_pay");
      },
      expects: ["pay_card", "pay_cash", "here_you_go", "no_cash", "no_card", "keep_change", "ask_total", "atm_go", "atm", "past_paid"],
      suggest: (c: Ctx): Suggestion[] => c.s.cashOnly
        ? [{ lt: "Pay in cash (or go to the ATM)", hint: c.s.atmGone ? "pay_here" : "cash_only" }]
        : [{ lt: "Pay (cash or card)", hint: payHint(c) }] },
  ],

  init: (c) => {
    c.s.buys = [];
    c.s.askRound = c.chance(0.5);
    c.s.coffeeOut = c.chance(0.25);
    c.s.noSystem = c.visits >= 1 && c.chance(0.4);
  },

  start: (c) => {
    if (c.chance(0.25)) { c.say("greet_howareyou"); expectHowAreYou(c); return; }
    c.say("greet");
    c.hold();
  },

  handlers: {
    order(c, slots) {
      const list = toArr(slots.items?.item).map(fromSlot).filter(Boolean) as Buy[];
      if (!list.length) return;
      addAll(c, list);
    },
    order_size(c, slots) {
      const n = typeof slots.count === "number" ? Math.max(1, Math.min(slots.count, 20)) : /\b(dos)\b/.test(c.heard) ? 2 : /\b(tres)\b/.test(c.heard) ? 3 : 1;
      addAll(c, [{ id: "cafe", qty: n, size: slots.size as string }]);
    },
    size_ctx(c, slots, seg) {
      if (seg.tags.includes("mid")) { c.say("two_sizes"); c.hold(); return; }
      const b = pendingCoffee(c) ?? coffees(c).at(-1);
      if (!b) { addAll(c, [{ id: "cafe", qty: 1, size: slots.size as string }]); return; }
      b.size = slots.size as string;
      maybeServe(c);
    },
    sizes_q(c, _slots, seg) { c.say(seg.tags.includes("mid") ? "two_sizes" : "sizes"); },
    more_no(c) {
      if (!buys(c).length) { c.s.nothing = true; c.s.moreDone = true; return; }
      c.s.moreDone = true;
    },
    more_yes(c) { c.say("what_else"); c.hold(); },
    reject(c, slots) {
      const id = (slots.product as string | undefined) ?? buys(c).at(-1)?.id;
      const i = id ? buys(c).findIndex((b) => b.id === id) : -1;
      if (i < 0) { c.say("ack"); return; }
      const [b] = buys(c).splice(i, 1);
      if (b.id === "cafe" && c.s.waited === undefined) c.s.waited = false;
      c.say(b.qty > 1 ? "removed_pl" : "removed", { X: b.qty > 1 ? { id: b.id, qty: 2 } : b.id });
      reopen(c);
    },
    swap(c, slots) {
      const bad = slots.bad as string | undefined, id = slots.product as string | undefined;
      if (!id) return;
      const i = bad ? buys(c).findIndex((b) => b.id === bad) : -1;
      if (i >= 0) buys(c).splice(i, 1);
      c.say("swap_ok", { X: id });
      addAll(c, [{ id, qty: 1 }], true);
    },
    ask_price(c, slots) {
      const id = (slots.product as string | undefined) ?? (slots.size ? "cafe" : notBought(c, c.s.lastAsked));
      if (!id) {
        if (buys(c).length) { sayDue(c); if (c.s.moreDone) c.s.totalSaid = true; return; }
        c.say("which_one"); expectWhich(c); return;
      }
      sayPrice(c, id);
    },
    order_count(c, slots, seg) { countFor(c, slots, seg); },
    count_ctx(c, slots, seg) { countFor(c, slots, seg); },
    which_ctx(c, slots) { sayPrice(c, slots.product as string); },
    price_next_ctx(c, slots) { sayPrice(c, slots.product as string); },
    ask_have(c, slots) {
      const id = slots.product as string;
      if (id === "cafe" && c.s.coffeeOut && c.s.waited === undefined) { c.say("fresh_out"); return; }
      c.say("have_yes");
      if (!buys(c).some((b) => b.id === id)) interested(c, id);
    },
    // (a catch-all: never a way to pay, never at the till)
    product_unknown(c) {
      if (c.step === "pay" || /tarjeta|efectivo|cambio|dinero|pag/.test(c.heard)) { if (!c.s.paid && c.s.totalSaid) c.say("ask_pay"); else c.say("ack"); return; }
      c.say("unknown");
    },
    ask_what(c) { c.say("stock"); },
    ask_fresh(c) { c.say(c.s.coffeeOut && c.s.waited !== true ? "fresh_out" : "fresh_yes"); },
    ask_sugar(c) { c.say("sugar"); },
    restroom(c) { c.say("restroom"); },
    atm(c) { c.say(c.s.cashOnly ? "atm_there" : "atm"); },
    atm_go(c) {
      if (c.s.paid) { c.say("ack"); return; }
      c.s.atmGone = true; c.say("atm_wait"); c.hold();
    },
    ice_where(c) { c.say("ice_where"); },
    bag(c) { c.say("no_bags"); },
    gas_q(c) { c.say("gas_outside"); },
    pay_where(c) { c.say("pay_here"); },
    ask_total(c) {
      if (!buys(c).length) { c.say("ask_order"); c.hold(); return; }
      sayDue(c);
      if (c.s.moreDone) { c.s.totalSaid = true; c.hold(); }
    },
    pay_card(c) { choosePay(c, "card"); },
    no_cash(c) {
      if (c.s.cashOnly) { c.say("atm_offer"); c.hold(); return; }
      choosePay(c, "card");
    },
    no_card(c) { choosePay(c, "cash"); },
    pay_cash(c) { choosePay(c, "cash"); },
    here_you_go(c, slots) {
      if (c.s.paid) { c.say("ack"); return; }
      if (!c.s.totalSaid) { c.say("not_yet"); return; }
      payCash(c, slots.price as number | undefined);
    },
    keep_change(c) {
      if (c.s.paid) { c.say("tip_thanks"); return; }
      if (!c.s.totalSaid) { if (!buys(c).length) { c.say("ack"); return; } c.s.totalSaid = true; c.s.moreDone = true; sayDue(c); }
      payCash(c, undefined, true);
    },
    past_paid(c) {
      if (c.s.paid) { c.say("ack"); return; }
      if (!c.s.totalSaid || !buys(c).length) { c.say("not_yet"); return; }
      c.say("not_paid", { price: due(c) }); c.hold();
    },
    round_yes_ctx(c) { roundYes(c); },
    round_no_ctx(c) { roundNo(c); },
    round_what(c) { c.say("round_what"); if (c.s.round === undefined && c.s.totalSaid && !c.s.paid) askRoundAgain(c); },
    wait_yes_ctx(c) { if (c.s.waited === undefined && coffees(c).length) coffeeWait(c); else c.say("ack"); },
    wait_amb_ctx(c) { if (c.s.waited === undefined && coffees(c).length) { c.say("wait_again"); c.hold(); } else c.say("ack"); },
    wait_no_ctx(c) { if (c.s.waited === undefined && coffees(c).length) coffeeSkip(c); else c.say("ack"); },
    // "¡Gracias!" after paying: his goodbye follows
    g_thanks(c) {
      c.say("g_welcome");
      if (c.s.__finished) c.hold();
    },
  },

  finish: (c) => {
    if (c.s.nothing && !c.s.paid) {
      c.say("bye_nothing");
      c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
        on: { g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); }, g_bye: (cc) => { cc.say("g_bye"); cc.end(); } },
        yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
      return;
    }
    c.complete();
    if (!c.s.byeSaid) c.say("bye");
    expectClosing(c);
  },

  tests: [
    // asking for things: every hint pattern, numbers and sizes
    { say: "¿Me da un café grande, por favor?", intent: "order", slots: { items: { item: { product: "cafe", size: "large" } } } },
    { say: "Un café grande, por favor", intent: "order", slots: { items: { item: { product: "cafe", size: "large" } } } },
    { say: "Me llevo una bolsa de hielo", intent: "order", slots: { items: { item: { product: "hielo" } } }, not: ["bag"] },
    { say: "Quiero un refresco", intent: "order", slots: { items: { item: { product: "refresco" } } } },
    { say: "Quisiera una botella de agua, por favor", intent: "order", slots: { items: { item: { product: "agua" } } } },
    { say: "¿Me cobra unas papas, por favor?", intent: "order", slots: { items: { item: { product: "papas" } } } },
    { say: "Dos refrescos y unas galletas", intent: "order" },
    { say: "Un chocolate y unos chicles", intent: "order" },
    { say: "Deme seis botellas de agua", intent: "order", slots: { items: { item: { product: "agua", count: 6 } } } },
    { say: "Café", intent: "order", step: "order" },
    { say: "Y también un agua", intent: "order", step: "more" },
    { say: "Deme uno grande", intent: "order_size", slots: { size: "large" } },
    { say: "Deme dos", intent: "order_count", step: "more" },
    // the size
    { say: "Grande", intent: "size_ctx", step: "size", slots: { size: "large" } },
    { say: "El chico", intent: "size_ctx", step: "size", slots: { size: "small" } },
    { say: "Chico, por favor", intent: "size_ctx", step: "size", slots: { size: "small" } },
    { say: "Mediano", intent: "size_ctx", step: "size" },
    { say: "¿Qué tamaños hay?", intent: "sizes_q" },
    // that's all
    { say: "Es todo, gracias", intent: "more_no", step: "more" },
    { say: "Nada más, gracias", intent: "more_no", step: "more" },
    { say: "No necesito nada más", intent: "more_no", step: "more", not: ["order"] },
    // questions
    { say: "¿Cuánto cuesta una bolsa de hielo?", intent: "ask_price", slots: { product: "hielo" }, not: ["order"] },
    { say: "¿Tiene refrescos?", intent: "ask_have", slots: { product: "refresco" } },
    { say: "¿Está recién hecho el café?", intent: "ask_fresh" },
    { say: "¿Dónde está el baño?", intent: "restroom" },
    { say: "¿Hay un cajero aquí?", intent: "atm" },
    { say: "¿Dónde está el hielo?", intent: "ice_where", not: ["order"] },
    { say: "¿Me da una bolsa?", intent: "bag", not: ["order"] },
    { say: "¿Qué tiene?", intent: "ask_what" },
    { say: "¿Tiene azúcar?", intent: "ask_sugar" },
    { say: "¿Aquí le pago?", intent: "pay_where" },
    // the gas is outside: understood, never an order
    { say: "¿Aquí pago la gasolina?", intent: "gas_q", not: ["pay_where"] },
    { say: "¿Dónde le pago la gasolina?", intent: "gas_q", not: ["pay_where"] },
    { say: "Lleno, por favor", intent: "gas_q" },
    { say: "Quiero gasolina", intent: "gas_q", not: ["product_unknown", "order"] },
    { say: "Quinientos de magna", intent: "gas_q" },
    // paying
    { say: "¿Aceptan tarjeta?", intent: "pay_card", step: "pay" },
    { say: "Con tarjeta, por favor", intent: "pay_card", step: "pay" },
    { say: "¿Puedo pagar con tarjeta?", intent: "pay_card", step: "pay" },
    { say: "En efectivo", intent: "pay_cash", step: "pay" },
    { say: "Aquí tiene cien", intent: "here_you_go", step: "pay", slots: { price: 10000 } },
    { say: "Tenga", intent: "here_you_go", step: "pay" },
    { say: "¿Para qué es el redondeo?", intent: "round_what" },
    { say: "Voy al cajero y ahorita vuelvo", intent: "atm_go", step: "pay" },
    // the coffee ran out
    { say: "Sí, lo espero", intent: "wait_yes_ctx", step: "coffee_wait" },
    { say: "No puedo esperar, gracias", intent: "wait_no_ctx", step: "coffee_wait", not: ["wait_yes_ctx"] },
    { say: "Tengo prisa", intent: "wait_no_ctx", step: "coffee_wait" },
    // tú to staff, no accents, neutral words
    { say: "Dame un café chico", intent: "order", slots: { items: { item: { product: "cafe", size: "small" } } } },
    { say: "¿Me cobras unas papas?", intent: "order" },
    { say: "cuanto cuesta el cafe", intent: "ask_price" },
    { say: "Una gaseosa", intent: "order", slots: { items: { item: { product: "refresco" } } } },
    { say: "Unas papitas", intent: "order", slots: { items: { item: { product: "papas" } } } },
    // learners' Spain forms are correct answers too: ponme, patatas, vosotros, vale, los aseos
    { say: "Ponme un café pequeño", intent: "order", slots: { items: { item: { product: "cafe", size: "small" } } } },
    { say: "Una bolsa de patatas", intent: "order", slots: { items: { item: { product: "papas" } } } },
    { say: "¿Tenéis hielo?", intent: "ask_have", slots: { product: "hielo" } },
    { say: "Vale, eso es todo", intent: "more_no", step: "more" },
    { say: "¿Dónde están los aseos?", intent: "restroom" },
    // never flip the meaning
    { say: "No quiero el refresco", intent: "reject", slots: { product: "refresco" }, not: ["order"] },
    { say: "Sin papas", intent: "reject", slots: { product: "papas" }, not: ["order"] },
    { say: "El chocolate no, gracias", intent: "reject", step: "more", not: ["order"] },
    { say: "Unas papas no, mejor unas galletas", intent: "swap", slots: { bad: "papas", product: "galletas" } },
    { say: "No traigo efectivo", intent: "no_cash", step: "pay", not: ["pay_cash"] },
    { say: "Con tarjeta no, en efectivo", intent: "pay_cash", step: "pay", not: ["pay_card"] },
    { say: "No tengo tarjeta", intent: "no_card", step: "pay", not: ["pay_card"] },
    { say: "Ya le pagué", intent: "past_paid", step: "pay", not: ["here_you_go"] },
    { say: "¿Cuánto cuesta el chocolate?", intent: "ask_price", not: ["order"] },
    // not understood
    { say: "Mi perro come llantas azules", intent: "none" },
    { say: "Mi hermana vive en Toronto", intent: "none" },
    { say: "banana ventana nube", intent: "none" },
  ],

  sims: [
    { name: "coffee and chips, card", turns: ["¡Buenas tardes!", "Un café grande y unas papas, por favor", "Es todo, gracias", "Con tarjeta", "¡Gracias, adiós!"],
      auto: omit(AUTO, ["order", "more", "pay"]), expect: { complete: true, state: { paid: true, method: "card", served: true } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = false; s.askRound = false; } },
    { name: "questions, the gas, a change of mind, cash with change",
      turns: ["¿Aquí pago la gasolina?", "¿Dónde está el baño?", "Quiero un refresco y una bolsa de hielo", "¿Está recién hecho el café?", "Y un café chico", "Mejor no quiero el refresco", "Es todo",
        "En efectivo", "Aquí tiene cien", "¡Gracias!"],
      auto: omit(AUTO, ["order", "more", "pay"]), expect: { complete: true, state: { paid: true, method: "cash", buys: { 0: { id: "hielo", qty: 1 }, 1: { id: "cafe", size: "small" } } } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = false; s.askRound = false; } },
    { name: "the coffee ran out (twist): a fresh pot", turns: ["Un café grande, por favor", "Sí, lo espero", "Y unos chicles", "Es todo", "Tarjeta", "¡Adiós!"],
      auto: omit(AUTO, ["order", "coffee_wait", "more", "pay"]), expect: { complete: true, state: { waited: true, served: true, paid: true } },
      setup: (s) => { s.coffeeOut = true; s.noSystem = false; s.askRound = false; } },
    { name: "the coffee ran out (twist): no time", turns: ["Un café chico y una botella de agua", "No puedo esperar, gracias", "Es todo", "Aquí tiene", "¡Gracias!"],
      auto: omit(AUTO, ["order", "coffee_wait", "more", "pay"]), expect: { complete: true, state: { waited: false, paid: true, method: "cash", buys: { 0: { id: "agua" } } } },
      setup: (s) => { s.coffeeOut = true; s.noSystem = false; s.askRound = false; } },
    { name: "no system (twist): the ATM, then cash", turns: ["Dos refrescos y unas galletas", "Es todo", "Con tarjeta", "Voy al cajero y ahorita vuelvo", "Aquí tiene", "¡Gracias!"],
      auto: omit(AUTO, ["order", "more", "pay"]), expect: { complete: true, state: { cashOnly: true, paid: true, method: "cash" } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = true; s.askRound = false; } },
    { name: "round up: yes, cash", turns: ["Un café grande y unas papas", "Es todo", "Sí, redondee, por favor", "Aquí tiene cien", "¡Gracias!"],
      auto: omit(AUTO, ["order", "more", "round", "pay"]), expect: { complete: true, state: { round: true, paid: true, method: "cash" } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = false; s.askRound = true; } },
    { name: "round up: what for, then no; card", turns: ["Una bolsa de hielo y unas papas", "Es todo", "¿Para qué es?", "No, gracias", "Con tarjeta", "¡Gracias!"],
      auto: omit(AUTO, ["order", "more", "round", "pay"]), expect: { complete: true, state: { round: false, paid: true, method: "card" } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = false; s.askRound = true; } },
    { name: "short answers", turns: ["Café", "Grande", "No", "Tarjeta", "Gracias"],
      auto: omit(AUTO, ["order", "size", "more", "pay"]), expect: { complete: true, state: { paid: true, buys: { 0: { id: "cafe", size: "large" } } } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = false; s.askRound = false; } },
    { name: "the price first, then two; Spain forms", turns: ["¿Cuánto cuesta una bolsa de hielo?", "Vale, deme dos", "Y una bolsa de patatas", "Vale, eso es todo", "Con tarjeta", "¡Gracias!"],
      auto: omit(AUTO, ["order", "after_have", "more", "pay"]), expect: { complete: true, state: { paid: true, buys: { 0: { id: "hielo", qty: 2 }, 1: { id: "papas", qty: 1 } } } },
      setup: (s) => { s.coffeeOut = false; s.noSystem = false; s.askRound = false; } },
  ],
};

// ---------------------------------------------------------------------------

/** Into the order: each thing; the coffee is served once its size is known (and the pot isn't empty), the ice is taken
 *  from the freezer. A thing added after "Es todo" opens the order again; one added after paying is paid on its own. */
function addAll(c: Ctx, list: Buy[], quiet = false) {
  const hadIce = buys(c).some((b) => b.id === "hielo");
  for (const b0 of list) addBuy(c, b0);
  const ice = buys(c).find((b) => b.id === "hielo");
  if (ice && !hadIce && !quiet) c.say(ice.qty > 1 ? "ice_self_pl" : "ice_self");
  maybeServe(c);
  reopen(c);
}

/** After a change to the order: "¿Algo más?" again (or, paid already, the new things' price). */
function reopen(c: Ctx) {
  if (c.s.paid) {
    const extra = total(c) - (c.s.paidSoFar ?? 0);
    if (extra > 0) {
      c.s.paid = false; c.s.totalSaid = true; c.say("extra_due", { price: extra });
      const hint = c.s.method === "card" ? "pay_ans" : c.s.method === "cash" ? "pay_here" : "pay";
      c.expect({ id: "extra", optional: true, expects: ["here_you_go", "pay_card", "pay_cash", "no_cash"], hints: [hint], suggest: [{ lt: "Pay (cash or card)", hint }] });
      c.hold();
    }
    return;
  }
  if (c.s.moreDone && !c.s.totalSaid) c.s.moreDone = false;
  if (c.s.totalSaid && buys(c).length) { c.s.totalSaid = false; c.s.moreDone = false; c.s.round = undefined; }
}

function maybeServe(c: Ctx) {
  const cs = coffees(c);
  if (!cs.length || cs.some((b) => !b.size) || c.s.served) return;
  if (c.s.coffeeOut && c.s.waited !== true) return;
  c.s.served = true;
  c.event("give", { item: "coffee" });
  c.say(cs.reduce((a, b) => a + b.qty, 0) > 1 ? "coffees_served" : "coffee_served");
}

function coffeeWait(c: Ctx) {
  c.s.waited = true;
  c.say("wait_ok");
  maybeServe(c);
}

function coffeeSkip(c: Ctx) {
  c.s.waited = false;
  c.s.buys = buys(c).filter((b) => b.id !== "cafe");
  if (buys(c).length) { c.say("ack"); return; }
  // nothing left: "¿Le doy otra cosa?" — something else, or no thanks (he says goodbye; nothing to pay)
  c.say("something_else");
  c.expect({ id: "else", optional: true, expects: ["order", "order_size", "order_count", "ask_have", "ask_price", "more_no"], hints: ["order", "no_thanks"],
    suggest: [{ lt: "Ask for something", hint: "order", options: "product" }, { lt: "Say no, thanks", hint: "no_thanks" }],
    yes: (cc) => { cc.say("go_ahead"); cc.hold(); },
    no: (cc) => { cc.s.nothing = true; cc.s.moreDone = true; } });
  c.hold();
}

/** A product id that isn't in the order yet. */
const notBought = (c: Ctx, id: unknown) => (typeof id === "string" && !buys(c).some((b) => b.id === id) ? id : undefined);

/** "Deme dos": for the thing just asked about, else the last one bought; with none, "¿De cuál?". */
function countFor(c: Ctx, slots: any, seg: { tags: string[] }) {
  const t = seg.tags;
  const n = typeof slots.count === "number" ? slots.count : t.includes("q5") ? 5 : t.includes("q4") ? 4 : t.includes("q3") ? 3 : t.includes("q2") ? 2 : 1;
  const id = notBought(c, c.s.lastAsked) ?? buys(c).at(-1)?.id;
  if (!id) { c.say("which_one"); expectWhich(c); return; }
  // "Deme otro": one more of it
  const had = buys(c).find((b) => b.id === id);
  const qty = t.includes("another") && had ? had.qty + 1 : n;
  addAll(c, [{ id, qty: Math.max(1, Math.min(qty, 20)), size: had?.size }]);
}

function sayPrice(c: Ctx, id: string) {
  if (id === "cafe") c.say("price_coffee");
  else c.say("price_one", { X: id, price: byId(id).attrs!.price as number });
  if (!buys(c).some((b) => b.id === id)) interested(c, id);
}

function sayDue(c: Ctx) {
  const d = due(c);
  if (d > MAX_TOTAL) c.say("total_screen");
  else c.say("say_total", { price: d });
}

/** "¿Tiene hielo?" – "Sí, claro." – "Deme dos": the number is for that one; a bare yes takes one. */
function interested(c: Ctx, id: string) {
  c.s.lastAsked = id;
  c.expect({ id: "after_have", optional: true, expects: ["order", "order_size", "order_count", "count_ctx", "price_next_ctx", "ask_price"], hints: ["take_it", "order"],
    suggest: [{ lt: "Say whether you want it", hint: "take_it" }, { lt: "Ask for something", hint: "order", options: "product" }],
    yes: (cc) => addAll(cc, [{ id, qty: 1 }]),
    no: (cc) => { cc.say("ack"); } });
}

/** "¿Cuánto cuesta?" with nothing named and nothing bought: "¿De cuál?" */
function expectWhich(c: Ctx) {
  c.expect({ id: "which", optional: true, expects: ["which_ctx", "ask_price", "order"], hints: ["ask_price"], suggest: [{ lt: "Say which one", hint: "ask_price", options: "product" }] });
}

/** "¿Gusta redondear a $60?" (a total ending in 5): yes, no, or "¿Para qué es?"; paying straight away is a no. */
function askRound(c: Ctx) {
  c.say("round_ask", { price: roundUp(total(c)) });
  c.expect({ id: "round", optional: true, expects: ["round_yes_ctx", "round_no_ctx", "round_what"], hints: ["round"],
    suggest: [{ lt: "Round up, or not", hint: "round" }],
    yes: (cc) => roundYes(cc), no: (cc) => roundNo(cc),
    on: {
      round_yes_ctx: (cc) => { roundYes(cc); return true; },
      round_no_ctx: (cc) => { roundNo(cc); return true; },
      round_what: (cc) => { cc.say("round_what"); askRoundAgain(cc); return true; },
    },
    ask: (cc) => cc.say("round_again") });
}

function askRoundAgain(c: Ctx) {
  c.expect({ id: "round", optional: true, expects: ["round_yes_ctx", "round_no_ctx"], hints: ["round"],
    suggest: [{ lt: "Round up, or not", hint: "round" }],
    yes: (cc) => roundYes(cc), no: (cc) => roundNo(cc),
    on: { round_yes_ctx: (cc) => { roundYes(cc); return true; }, round_no_ctx: (cc) => { roundNo(cc); return true; } } });
  c.hold();
}

function roundYes(c: Ctx) {
  if (c.s.paid || c.s.round !== undefined) return;
  c.s.round = true;
  c.say("round_yes", { price: due(c) });
  if (c.s.method === "card") { payCard(c); return; }
  c.hold();
}

function roundNo(c: Ctx) {
  if (c.s.paid || c.s.round !== undefined) return;
  c.s.round = false;
  c.say("round_no");
  if (c.s.method === "card") { payCard(c); return; }
  c.hold();
}

function choosePay(c: Ctx, method: "card" | "cash") {
  if (c.s.paid) return;
  if (c.s.round === undefined && c.s.totalSaid) c.s.round = false;
  if (method === "card" && c.s.cashOnly) { c.say("no_system_again"); c.hold(); return; }
  c.s.method = method;
  if (!c.s.totalSaid) {
    // "Con tarjeta" at "¿Algo más?": that's all, and the way to pay (the total comes next)
    const ready = buys(c).length > 0 && !pendingCoffee(c) && !(c.s.coffeeOut && coffees(c).length > 0 && c.s.waited === undefined);
    if (ready) { c.s.moreDone = true; return; }
    c.say(method === "card" ? "card_yes" : "cash_yes"); return; // the total comes when the order is done
  }
  if (method === "card") payCard(c);
  else { c.say("ack"); c.hold(); }
}

function payCard(c: Ctx) {
  if (c.s.paid) return;
  // the twist: the terminal is down (once); cash only from then on
  if (c.s.noSystem && !c.s.cashOnly) {
    c.s.cashOnly = true; c.s.method = undefined;
    c.twist("no_system"); c.say("no_system"); c.hold(); return;
  }
  c.s.method = "card";
  c.say("card_ok");
  paid(c, "card");
}

function payCash(c: Ctx, given?: number, keepChange = false) {
  if (c.s.paid) return;
  if (c.s.round === undefined) c.s.round = false;
  const d = due(c);
  if (given && c.s.given) given += c.s.given as number;
  // a bill that doesn't cover it: never paid; the total again
  if (given && given < d) {
    if (c.s.given) c.say("short_again"); else c.say("short", { price: d });
    c.s.given = given; c.s.method = "cash"; c.hold(); return;
  }
  c.s.method = "cash";
  if (keepChange) c.say("tip_thanks");
  else if (given && given > d) c.say(given - d <= MAX_CHANGE && (given - d) % 500 === 0 ? "change_is" : "change_back", { amount: given - d });
  else if (given === d) c.say("exact");
  else c.say(d % 5000 === 0 ? "cash_thanks" : "change_back");
  paid(c, "cash");
}

/** Thanks and goodbye (after his own goodbye, or after an extra paid once the goodbye was said). */
function expectClosing(c: Ctx) {
  c.expect({ id: "closing", optional: true, hints: ["g_social"], suggest: [{ lt: "Say thank you and goodbye", hint: "g_social" }],
    on: { g_thanks: (cc) => { cc.say("g_welcome"); cc.end(); }, g_bye: (cc) => { cc.say("g_bye"); cc.end(); } },
    yes: (cc) => { cc.end(); }, no: (cc) => { cc.end(); } });
}

function paid(c: Ctx, method: "card" | "cash") {
  const amount = due(c);
  c.s.paid = true; c.s.moreDone = true; c.s.given = undefined;
  c.s.paidSoFar = total(c);
  c.event("pay", { method, amount });
  c.complete();
  // an extra paid after the goodbye: back to the goodbye's card
  if (c.s.__finished) expectClosing(c);
}

// The replies follow what was just said (owner, 17 Nov 2026): each card shows only the answers that fit this question.
tienda.hints.pay_ans = pick(tienda.hints.pay, ["pay_card_short", "pay_cash", "here_you_go"]);
tienda.hints.pay_here = pick(tienda.hints.pay, ["here_you_go", "pay_cash"]);
tienda.hints.no_thanks = pick(yesAgreeGroups().g_no, ["yn_no_thanks"]);
tienda.hints.take_it = pickFrom("Say whether you want it", [yesAgreeGroups().g_yes, ["yn_yes_please"]], [yesAgreeGroups().g_no, ["yn_no_thanks"]]);
tienda.hints.cash_only = pickFrom("Pay in cash (or go to the ATM)", [tienda.hints.pay, ["here_you_go"]], [tienda.hints.atm, ["atm_go"]]);

export default tienda;
