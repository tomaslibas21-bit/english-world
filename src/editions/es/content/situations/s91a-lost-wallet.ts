// NEEDS: g_dontknow has no "No me acuerdo" / "No recuerdo" (local intent dont_remember covers it here).
// Song 91 "Can You Help Me, Please?" (part 1) → Puerto Colibrí: "¿Me puede ayudar?"
// Saturday morning, the tianguis on the zócalo. The learner reaches for the wallet (or phone, bag, backpack) and it
// isn't there. Doña Mari at the flower stall helps (usted; she calls the learner mijo / mija): what happened,
// "¿Ya revisó bien sus bolsas?" (Mexican: bolsas = pockets), when and where they last had it, advice for the place
// (go back and ask; the colectivo drivers at their stop; the taxi stand), what it looks like (she'll keep an eye
// out), and the Policía Municipal, "ahí enfrente, junto al museo" (s62's town map: the police is next to the
// museum, across from the zócalo). The learner may ask: is it far, how do I get there, show me on the map, should I
// call 911 (Mexico's emergency number is 911: only for emergencies), should I block my cards, what if it isn't there.
// Twist (visits ≥ 1, as in the English): a boy found it by the kiosco (the bandstand): is it yours, is everything in
// it. Mrs. Lee's fountain is the kiosco here; the English's 911 and "lost and found" become 911 and the Policía
// Municipal (Mexico has no lost-and-found culture to point to; the police make a report).
// Research (2 Nov 2026), kept vague where unsure: 911 has been Mexico's national emergency number since 2017; a lost
// wallet is reported to the police (or the Ministerio Público for a formal record: s91b); "me bolsearon" (I was
// pickpocketed) is Mexican slang and is understood. No fees, report names or deadlines are taught here.
// Mexican-only words in Doña Mari's lines, each with a neutral twin: ahorita, bolsas (pockets), sitio, nomás, ándele,
// prender. Colors agree with the item through the composer (una cartera negra, un celular negro).
//
// Commas are lost (rule 10): "No, perdí mi cartera" (the answer to "¿Está bien?") reads like "No perdí mi cartera", so a
// single "no" there gets "Perdón, ¿sí perdió su cartera?"; "En el banco no, en el café" gets "¿En el banco o en el café?".
// Added to the English intents: when_ctx (a bare time), dont_remember, describe_fix, *_ctx forms of the short answers,
// lost_really, where_found, police_open, police_english (vague answers).
//
// Doña Mari "marks it on your map": c.event("mark-location", { to: "police" }) (handled by the world).

import type { Ctx, EntityDef, HintItem, Pending, SituationDef } from "@/content/types";
import { ent, t } from "@/content/dsl";
import { expectHowAreYou } from "@/content/global";

// ---------------------------------------------------------------------------
// Entities

export const ITEMS: EntityDef[] = [
  ent("wallet", "cartera", "wallet", "f", { pl: "carteras", ltPl: "wallets", chip: "cartera",
    forms: ["carteras", "billetera", "billeteras", "cartera de piel", "monedero", "tarjetero", "carterita"] }),
  ent("phone", "celular", "phone", "m", { pl: "celulares", ltPl: "phones", chip: "celular",
    forms: ["cel", "celulares", "telefono", "telefono celular", "iphone", "smartphone", "telefonito", "celu"] }),
  ent("bag", "bolsa", "purse", "f", { pl: "bolsas", ltPl: "purses", chip: "bolsa",
    forms: ["bolso", "bolsa de mano", "bolsita", "mi bolsa de mano"] }),
  ent("backpack", "mochila", "backpack", "f", { pl: "mochilas", ltPl: "backpacks", chip: "mochila", forms: ["mochilita", "morral"] }),
];

/** Places where the learner last had it. kind: shop (someone to ask), near (a spot: look around it), area (an outdoor
 *  area), here (the tianguis itself), bus (the colectivo), taxi. */
type Kind = "shop" | "near" | "area" | "here" | "bus" | "taxi";
const P = (id: string, es: string, en: string, g: "m" | "f", kind: Kind, forms: string[] = [], extra: Record<string, unknown> = {}) =>
  ent(id, es, en, g, { forms, attrs: { kind, ...extra } });
export const PLACES: EntityDef[] = [
  P("cafe", "café", "café", "m", "shop", ["cafe la ceiba", "el cafe la ceiba", "la ceiba", "la cafeteria", "cafeteria", "el cafecito"]),
  P("bakery", "panadería", "bakery", "f", "shop", ["la panaderia", "el puesto de pan", "donde venden pan"]),
  P("fruit_stand", "puesto | de | fruta", "stall | of | fruit", "m", "shop",
    ["puesto de frutas", "el puesto de la fruta", "la fruteria", "fruteria", "el puesto de mangos", "el de la fruta", "la senora de la fruta", "el senor de la fruta"],
    { nat: "fruit stand" }),
  P("market", "tianguis", "street market", "m", "here", ["el tianguis", "los puestos", "la plaza", "el zocalo", "aqui en la plaza", "el mercadito", "aqui en el tianguis", "aqui en el zocalo"]),
  P("mercado", "mercado", "market", "m", "shop", ["el mercado", "mercado municipal", "el mercado municipal"]),
  P("bank", "banco", "bank", "m", "shop", ["el banco", "banco del puerto", "el banco del puerto"]),
  P("atm", "cajero", "ATM", "m", "near", ["cajero automatico", "el cajero automatico", "el cajero del banco"]),
  P("pharmacy", "farmacia", "pharmacy", "f", "shop", ["la farmacia", "farmacia del puerto"]),
  P("post_office", "oficina | de | correos", "office | of | mail", "f", "shop", ["correos", "el correo", "la oficina de correos"], { nat: "post office" }),
  P("supermarket", "tiendita", "corner store", "f", "shop",
    ["tienda", "la tienda", "la tienda de la esquina", "el super", "super", "el supermercado", "supermercado", "la tienda de abarrotes", "abarrotes"]),
  P("museum", "museo", "museum", "m", "shop", ["el museo", "museo de la costa maya"]),
  P("restaurant", "restaurante", "restaurant", "m", "shop",
    ["la fonda", "fonda", "la taqueria", "taqueria", "el puesto de tacos", "la cocina economica", "el muelle", "la trattoria", "la marisqueria"]),
  P("church", "iglesia", "church", "f", "shop", ["la iglesia", "misa"]),
  P("hotel", "hotel", "hotel", "m", "shop", ["el hotel", "hotel mar azul", "el mar azul", "mi cuarto", "la habitacion"]),
  P("beach", "playa", "beach", "f", "area", ["la playa"]),
  P("malecon", "malecón", "boardwalk", "m", "area", ["el malecon"]),
  P("bench", "banca", "bench", "f", "near", ["la banca", "una banca", "la banca de la plaza", "una banquita"]),
  P("kiosco", "kiosco", "bandstand", "m", "near", ["el kiosco", "quiosco"]),
  P("station", "terminal", "bus station", "f", "shop", ["la terminal", "terminal de autobuses", "la central", "la estacion de autobuses"]),
  P("bus", "colectivo", "colectivo", "m", "bus", ["la combi", "combi", "camion", "el camion", "autobus", "el autobus", "la van", "una van"]),
  P("taxi", "taxi", "taxi", "m", "taxi", ["un taxi"]),
];

/** Colors in the masculine (the composer makes them agree: una cartera negra, un celular negro); feminine forms
 *  are accepted. */
const col = (id: string, es: string, en: string, forms: string[] = []) =>
  ent(id, es, en, "m", { chip: es, forms: [...(es.endsWith("o") ? [es.slice(0, -1) + "a"] : []), ...forms] });
export const COLORS: EntityDef[] = [
  col("brown", "café", "brown", ["marron", "cafe oscuro", "cafe claro", "color cafe", "cafecita", "cafecito"]),
  col("black", "negro", "black", ["negrita", "negrito"]),
  col("red", "rojo", "red", ["guinda", "vino", "color vino", "tinto", "rojita"]),
  col("blue", "azul", "blue", ["azul claro", "celeste", "azulito", "azulita"]),
  col("navy", "azul marino", "navy blue", ["azul oscuro", "marino"]),
  col("green", "verde", "green", ["verde oscuro", "verde claro"]),
  col("gray", "gris", "gray", ["gris oscuro", "gris claro"]),
  col("silver", "plateado", "silver", ["plata", "color plata"]),
  col("white", "blanco", "white"),
  col("pink", "rosa", "pink", ["rosado", "rosada", "rosita", "fucsia"]),
  col("yellow", "amarillo", "yellow"),
  col("purple", "morado", "purple", ["violeta", "lila"]),
  col("beige", "beige", "beige", ["beis", "crema"]),
];
export const MATERIALS: EntityDef[] = [
  ent("leather", "de piel", "leather", "m", { chip: "de piel", forms: ["piel", "de cuero", "cuero", "de piel genuina"] }),
  ent("fabric", "de tela", "fabric", "m", { chip: "de tela", forms: ["tela", "de lona", "lona", "de nylon", "nylon"] }),
  ent("plastic", "de plástico", "plastic", "m", { chip: "de plástico", forms: ["plastico"] }),
];
export const SIZES: EntityDef[] = [
  ent("small", "chico", "small", "m", { chip: "chica", forms: ["chica", "chiquita", "chiquito", "pequena", "pequeno", "pequenita", "pequenito", "delgada", "delgadita", "delgado", "chiquitita"] }),
  ent("big", "grande", "big", "m", { chip: "grande", forms: ["grandota", "grandote", "muy grande", "gruesa", "grueso"] }),
];

const ALL = [...ITEMS, ...PLACES, ...COLORS, ...MATERIALS, ...SIZES];
const byId = (id: string) => ALL.find((e) => e.id === id)!;

// ---------------------------------------------------------------------------
// Helpers

const MIJA = "mijo / mija: “dear” (from mi hijo / mi hija), warm, from an older person.";

const item = (c: Ctx) => (c.s.item as string) || "wallet";
/** The lost thing as a noun phrase, with the color and material the learner gave ("una cartera café de piel"). */
const itemNp = (c: Ctx) => ({ id: item(c), mods: (c.s.color || c.s.material ? [c.s.color, c.s.material] : [c.s.size]).filter(Boolean) as string[] });

/** The current learner turn (the engine builds a fresh ctx object for every input). */
const TURN = new WeakMap<object, Record<string, any>>();
const turn = (c: Ctx) => { let x = TURN.get(c); if (!x) { x = {}; TURN.set(c, x); } return x; };
/** The wallet is back (the boy found it, or the learner found it themselves). */
const gotBack = (c: Ctx) => c.s.found === "mine" || c.s.found === "self";

const norm = (x: string) => x.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function mark(c: Ctx) {
  return !c.s.byeSaid;
}

function describeFrom(c: Ctx, slots: any) {
  const parts = ([] as any[]).concat(slots.dp ?? []);
  // "Es rosa con funda azul": the case's color describes the phone only when no other color is given
  const caseOnly = parts.every((p) => !p?.color || (p.__tags || []).includes("case"));
  for (const p of parts) {
    if (p?.color && (caseOnly || !(p.__tags || []).includes("case"))) c.s.color = p.color;
    if (p?.material) c.s.material = p.material;
    if (p?.size) c.s.size = p.size;
  }
  if (slots.color) c.s.color = slots.color;
  if (slots.item) c.s.item = slots.item;
}

function bye(c: Ctx, thanked = false) {
  if (!c.s.byeSaid) { c.s.byeSaid = true; c.say(thanked ? "closing_welcome" : "closing_bye"); }
  c.hold();
  c.end();
}

function lastSeenHelp(c: Ctx) {
  if (!c.s.thinkSaid) { c.s.thinkSaid = true; c.say("think_help"); return; }
  c.s.lastSeen = true; c.s.placeSkipped = true; askNext(c);
}

/** Ask the next applicable step now (after a "no sé" at a step that only informs). */
function askNext(c: Ctx) {
  for (const st of lostWallet.steps) {
    if (st.when && !st.when(c)) continue;
    if (st.done(c)) continue;
    c.ask(st.id);
    return;
  }
}

// Hint items shared by several groups (the guide shows a group's first items as model answers).
const H_HELP: HintItem = { id: "help_me", s: t("Disculpe, | ¿me | puede | ayudar?", "Excuse me, | (to) me | can you | help?", "Excuse me, can you help me?") };
const H_LOST: HintItem = { id: "lost_item", s: t("Perdí | mi | {X}.", "I lost | my | {X}.", "I lost my {X}.") };
const H_SE_ME: HintItem = { id: "lost_item", s: t("Se me perdió | {X.the}.", "I lost | {X.the}.", "I've lost my {X}."),
  note: "Se me perdió…: “it got lost on me”, the commonest way to say it in Mexico." };
const H_CANT_FIND: HintItem = { id: "cant_find", s: t("No encuentro | mi | {X}.", "I can't find | my | {X}.", "I can't find my {X}.") };
export const H_AT_PLACE: HintItem = { id: "ls_place", s: t("En | {X.the}.", "At | {X.the}.", "At {X.the}.") };
export const H_WAS_AT: HintItem = { id: "ls_place", s: t("Estaba | en | {X.the}.", "I was | at | {X.the}.", "I was at {X.the}.") };
export const H_NEAR: HintItem = { id: "ls_place", only: (e) => e.attrs?.kind === "near",
  s: t("Junto | a | {X.the}.", "Next | to | {X.the}.", "Next to {X.the}.") };
export const H_TOOK: HintItem = { id: "ls_place", only: (e) => e.attrs?.kind === "bus" || e.attrs?.kind === "taxi",
  s: t("Tomé | {X.np}.", "I took | {X.np}.", "I took {X.np}.") };

const AUTO: Record<string, string> = {
  problem: "Perdí mi cartera.",
  what_happened: "Perdí mi cartera.",
  flowers_q: "Perdí mi cartera.",
  pockets: "Sí, ya revisé.",
  last_seen: "En el café, cuando pagué mi café.",
  where_then: "En el café.",
  describe: "Es café, de piel.",
  police: "No, ¿dónde está?",
  found: "¡Sí, es mía!",
  all_there: "Sí, está todo.",
  closing: "¡Muchas gracias! Adiós.",
};

const omit = (o: Record<string, string>, keys: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !keys.includes(k)));

// ---------------------------------------------------------------------------

export const lostWallet: SituationDef = {
  id: "s91a-lost-wallet",
  song: 91,
  songTitle: "Can You Help Me, Please?",
  title: { en: "¿Me puede ayudar?", lt: "Can you help me?" },
  topic: { en: "Cartera perdida", lt: "Lost wallet" },
  chapter: 7,
  order: 1,
  location: "town-square",
  npc: "mrs_lee",
  goal: "Ask for help: you've lost your wallet. Say where you last had it, describe it, and find out where the police are.",
  intro: "Saturday morning, the tianguis on the zócalo. You go to pay for some mangoes, reach into your pocket, and your wallet isn't there! Doña Mari, at the flower stall, looks kind. Ask her for help.",
  entities: { item: ITEMS, place: PLACES, color: COLORS, material: MATERIALS, size: SIZES },

  grammar: {
    macros: {
      // "cuando pagué los mangos", "cuando saqué dinero"
      when_paid: "cuando (pagué | estaba pagando | compré | estaba comprando | fui a comprar | saqué | pagaba | compraba) [algo | dinero | efectivo | un | una | unos | unas | mi | el | la | los | las] [{w:any}]",
      ago: "hace ((una | media) hora | un rato | un ratito | rato | ratito | poco | unos minutos | {number} (minutos | horas | minuto) | como (una | media) hora | como {number} minutos | un buen rato | una hora mas o menos | mas o menos una hora)",
      when_time: "(@ago | esta manana | hoy en la manana | en la manana | hoy temprano | temprano | hace rato | (a | como a | a eso de) {time} | en el desayuno | antes de (comer | desayunar) | ayer)",
      at_place: "(en | por | cerca de | cerca del | junto a | junto al | al lado de | al lado del | afuera de | afuera del | enfrente de | enfrente del | dentro de) [el | la | los | las | un | una | mi] {place}",
      in_place: "(en | a | al | a la) [el | la | un | una | mi] {place}",
      had_it: "(la | lo) (tenia | tuve | traia | usé | saqué | vi | tenia todavia | traia todavia)",
      left_it: "(la | lo) (dejé | perdi | olvidé | puse | tiré | perdí)",
      my_item: "[mi | la | el | una | un | mis] {item}",
      pockets: "(mis | las | todas mis | todas las) (bolsas | bolsillos | bolsas del pantalon)",
      // the answer to "¿Está bien?" before the problem: "No, no estoy bien. Perdí mi cartera."
      not_ok: "[no] (no estoy bien | no muy bien | no mucho | no tanto | la verdad no | mas o menos | no realmente) [la verdad] [es que]",
    },
    slots: {
      seen: { pattern: [
        "[@had_it] [en la mano | en mi bolsa | en la bolsa | en mi bolsillo | en la mesa] @at_place [@when_time] [@when_paid] #h:ls_place",
        "fue @at_place [@when_time] [@when_paid]",
        "(pagué | compré | pagaba) [algo] (con tarjeta | en efectivo | con efectivo | con la tarjeta) @at_place [@when_time]",
        "[@had_it] [como | mas o menos] @when_time [@at_place] [@when_paid] [@at_place] #h:ls_time",
        "@when_paid [@at_place] [@when_time] #h:ls_paid",
        "(creo que | a lo mejor | tal vez | quizas | seguro | seguramente) [@left_it] [aqui | por aqui | ahi] @at_place",
        "@left_it [aqui | por aqui | ahi] @at_place [@when_time]",
        "(pagué | compré) [algo | un | una | unos | unas | mi | el | la | los | las] {w:any} @at_place [@when_time]",
        "(estuve | estaba | fui | pasé) @in_place [@when_time]",
        "(saqué | retiré) (dinero | efectivo | lana | dinero en efectivo) (del | de el | en el | de | en) [la | el] {place} [@when_time]",
        "[@left_it] en (mi casa | casa | la casa) [@when_time] #home", "(creo que | a lo mejor | tal vez | quizas | seguro) @left_it en (mi casa | casa | la casa) #home", "@when_time en (mi casa | casa | la casa) #home",
        "@at_place [@when_time] (compré | pagué | estaba comprando) [algo | un | una | unos | unas] {w:any}",
        "cuando (estaba | estuve | fui) @in_place",
        "estaba (comprando [{w:any}] | comiendo | sentado | sentada | caminando | esperando | tomando un cafe | desayunando | paseando | platicando | viendo las flores) @at_place [@when_time]",
        "(me senté | estuve sentado | estuve sentada) @at_place",
        "(subí | me subí | tomé | agarré) [el | la | un | una] {place} [@when_time]",
        "(vengo | vine | venia) (de | del | de la) {place}",
      ] },
      dp: { pattern: [
        "[y] [es | era] [de color | color] {color} [(y | con) {color2:color}]",
        "[y] (tiene | trae | con) (mis tarjetas | mi licencia | mi identificacion | mi credencial | dinero | mis documentos | como {number} pesos | {number} pesos | tarjetas) [y (mis tarjetas | mi licencia | mi identificacion | mi credencial | dinero | mis documentos | como {number} pesos | {number} pesos | tarjetas)] [adentro] #feature",
        "[y] [es] (de hombre | de mujer | de dama | de caballero) #feature",
        "[y] [es | era] [hecha | hecho] {material}",
        "[y] [es | era] [muy | bastante | medio | algo] {size}",
        "[y] (tiene | trae | con) (una foto | fotos | una foto de mis hijos | una foto de mi familia | una foto de mi perro | una foto de mis nietos) #feature",
        "[y] (tiene | trae | con) (mi nombre | un cierre | un logo | un broche | un llavero | una correa | una calcomania | calcomanias | stickers) #feature",
        "[y] (tiene | trae | con) [una | la | su] funda [de color] {color} [{material}] #case",
        "[y] (tiene | trae | con) [una | la | su] funda {material} [{color}] #case",
        "[y] [es | era] (vieja | viejo | nueva | nuevo | normal | sencilla | sencillo | barata | barato | bonita | bonito | comun | de marca | gastada | gastado) #feature",
      ] },
    },
  },

  intents: {
    help_req: { patterns: [
      "(me puede | me podria | puede | podria) ayudar #h:help_me", "(puede | podria) ayudarme", "ayudeme",
      "(me puedes | me podrias | puedes | podrias) ayudar #tip:tu_staff", "(puedes | podrias) ayudarme #tip:tu_staff", "ayudame #tip:tu_staff",
      "(necesito | ocupo) [su | tu | un poco de] ayuda", "necesito que me ayude", "(me ayuda | me ayudas)",
      "tengo un (problema | problemita) [muy grande | grande | serio]", "tengo una pregunta", "no se que hacer",
      "(le puedo | puedo) (preguntar | pedir) algo", "(puedo | podria) preguntarle algo", "(ayuda | auxilio)",
      "[no] no estoy bien [la verdad] [tengo un problema]", "[no] la verdad no [tengo un problema]",
      "[si] (estoy | estoy un poco | estoy muy) (preocupado | preocupada | nervioso | nerviosa)",
      "[si] (las flores | sus flores) (estan | son) (muy | ) (bonitas | lindas) pero tengo un (problema | problemita)",
    ] },
    lost: { patterns: [
      "[creo que] (perdi | perdí) @my_item #h:lost_item",
      "@not_ok [creo que] (perdi | se me perdio | he perdido | no encuentro) @my_item",
      "(dios mio | ay dios mio | ay dios | no puede ser | que horror | ay no) [creo que] (perdi | se me perdio | he perdido | no encuentro | me robaron) @my_item", "@not_ok [creo que] me (robaron | bolsearon) @my_item #stolen", "[creo que] he perdido @my_item", "[creo que] se me (perdio | perdió) @my_item #h:lost_item",
      "[creo que] (perdi | se me perdio) @my_item y (mis | las) llaves #keys", "[creo que] (perdi | se me perdieron) (mis | las) llaves y @my_item #keys",
      "no (encuentro | puedo encontrar | hallo) @my_item [por ningun lado | en ningun lado | en ninguna parte | por ninguna parte] #h:cant_find",
      "(mi | la) {item} (desaparecio | ya no esta | no esta | no aparece | se perdio | esta perdida | esta perdido) [por ningun lado]",
      "(mi | la) {item} no esta (en mi bolsa | en mi bolsillo | en mis bolsas | en mis bolsillos | aqui | en mi mochila | en mi pantalon | donde siempre)",
      "no se que hacer [perdi | se me perdio] [@my_item]",
      "(ya | ) no (tengo | traigo) @my_item", "me falta @my_item",
      "[creo que] me (robaron | volaron | quitaron | bolsearon) @my_item #stolen #h:stolen",
      "[creo que] me (robaron | bolsearon | asaltaron) #stolen",
      "[creo que] alguien (se llevó | se robó | me robó | me quitó | robó | tomó) @my_item #stolen",
      "@my_item (fue robada | fue robado | me la robaron | me lo robaron) #stolen",
      "[creo que] se me cayó @my_item [en algun lado | por aqui | en algun lugar]",
      "(estoy buscando | busco | ando buscando) @my_item",
      "[usted] (no ha visto | ha visto | vio | no vio | no habra visto) [usted] (una | un | mi) {item} [{color}] [{material}] [por aqui]",
      "no se donde (esta | quedó | dejé) @my_item", "no (encontré | he encontrado | puedo hallar) @my_item",
      "no me (robaron | la robaron | lo robaron) [nada] (la | lo) perdi", "no (la | lo) perdi me (la | lo) robaron #stolen",
      "(dejé | olvidé) @my_item en (algun lado | algun lugar | alguna parte)",
      "(perdi | se me perdio) (todo mi dinero | mi dinero | mis tarjetas | mis documentos)",
    ] },
    not_lost: { patterns: [
      // "No, perdí mi cartera" (the answer to "¿Está bien?") reads the same as "No perdí mi cartera": she asks (#amb)
      "no (perdi | he perdido) @my_item #amb", "no (perdi | he perdido) nada",
      "@my_item no (se perdio | esta perdida | esta perdido)",
      "[ah | ay | espere | ay espere | ah mire | mire] [ya] (la | lo) encontré [aqui esta] [estaba (en mi | en la) (bolsa | mochila | bolsillo | chamarra | pantalon)]", "[ya] encontré @my_item", "@my_item (ya esta aqui | esta aqui | ya aparecio | aparecio) [en mi (bolsa | mochila | bolsillo | chamarra | pantalon)]", "[ah] (ya | aqui | aca) (esta | estaba) [@my_item] (en mi bolsa | en mi mochila | en mi bolsillo | en mi chamarra | en mi pantalon)",
      "no me (robaron | quitaron) nada",
    ] },
    last_seen: { patterns: [
      "{seen}",
      "no (me acuerdo | recuerdo) [bien] [pero] [creo que | tal vez | a lo mejor | quizas] {seen}",
      "no (lo se | se bien | se exactamente) [pero] (creo que | tal vez | a lo mejor | quizas) {seen}",
      "no estoy (seguro | segura) [pero] (creo que | tal vez | a lo mejor | quizas) {seen}",
      "la ultima vez [(que la tuve | que lo tuve | que la vi | que lo vi | que la usé | que lo usé)] fue {seen}",
      "(la | lo) (tuve | vi | usé) por ultima vez {seen}",
      "todavia (la | lo) (tenia | traia) {seen}",
      // corrections: "No estaba en la playa, estaba en el café" / "En el café, no en la playa": the place said as a yes
      "no (estaba | estuve | fue | fui) (en | a | al | por) [el | la] {wrong:place} [sino] {seen}",
      "no (en | a | al | por) [el | la] {wrong:place} [sino] {seen}",
      // "En el café, no en la playa" and "En la playa no, en el café" read the same without commas: she asks which (#amb)
      "{seen} no (en | a | al) [el | la] {wrong:place} #amb",
    ] },
    // a bare time ("Hace una hora", "Esta mañana") answers "¿Cuándo fue la última vez…?" only
    when_ctx: { patterns: ["[fue] [como | mas o menos] @when_time [mas o menos]", "creo que @when_time"] },
    // "No en el banco": not there (a comma-less "No, en el banco" is unlikely after "¿Dónde…?"): "¿Entonces dónde?"
    place_not_ctx: { patterns: ["no (en | a | al | por) [el | la] {place}", "(en | a | al | por) [el | la] {place} no", "no (fue | estaba | estuve) (en | a | al | por) [el | la] {place}"] },
    place_ctx: { patterns: ["[en | el | la | por | junto a | junto al | cerca de | cerca del | al lado del] {place}", "(en | el | la) {place} creo", "creo que (en | el | la) {place}"] },
    dont_remember: { patterns: ["no (me acuerdo | recuerdo | lo recuerdo | la recuerdo) [bien | donde | cuando | la verdad]", "ya no me acuerdo", "no tengo idea donde"] },
    describe: { patterns: [
      "(es | era) [una | un] [{item}] {dp} [[y] {dp}] [[y] {dp}] [[y] {dp}] #h:describe",
      "(mi | la | el) {item} (es | era) {dp} [[y] {dp}] [[y] {dp}]",
      "(es | era) [una | un] {item} (normal | comun | cualquiera | sencilla | sencillo) [{dp}] [{dp}]",
      "(tiene | trae | lleva) (una foto | fotos | mi nombre | un llavero | un logo) [de mis hijos | de mi familia | de mi perro | de mis nietos] [adentro]",
      "(tiene | trae) (una | la | su) funda [de color] {color} [{material}]",
      "[no] (no tiene nada (especial | en particular) | nada especial | nada en particular) #feature",
      "(tiene | trae) (mis tarjetas | mi licencia | mi identificacion | dinero | mis documentos | tarjetas) [y (mis tarjetas | mi licencia | mi identificacion | dinero | mis documentos | tarjetas)] [adentro]",
    ] },
    // a bare noun phrase or adjective list ("Negra.", "Una cartera roja.") describes it only at the description question
    describe_ctx: { patterns: ["[una | un | mi] [{item}] {dp} [[y] {dp}] [[y] {dp}]"] },
    // "No es negra, es café": the second color is the answer
    describe_fix: { patterns: ["[no] no (es | era) {wrong:color} [es | sino | era] {color}", "no {wrong:color} [sino] {color}", "[no] {wrong:color} no [es] {color}"] },
    police_where: { patterns: [
      "donde (esta | queda | hay) la (policia | estacion de policia | comandancia | policia municipal | delegacion | comisaria) [mas cercana] #h:q_police",
      "(bueno | entonces | ok) [ahorita | ahora] (voy | voy a ir) a la policia", "[entonces] (tengo que | debo | hay que) ir a la policia",
      "(hay | sabe si hay) (una | alguna) (policia | estacion de policia | comisaria | patrulla) (por aqui | cerca | aqui cerca)",
      "como (llego | se llega) a la (policia | estacion de policia)",
      "(me puede | podria | puede | me podria) decir donde (esta | queda) la (policia | estacion de policia)",
      "[no] no (se | conozco) donde (esta | queda) la (policia | estacion de policia)", "[no] no conozco la policia",
      "donde (esta | queda | hay) (la oficina de objetos perdidos | objetos perdidos)", "hay (una oficina de objetos perdidos | objetos perdidos)",
      "(donde | a donde) (puedo | tengo que | debo) (reportarlo | reportarla | ir a reportarlo | ir a reportarla | hacer un reporte | levantar un reporte | levantar una denuncia | poner una denuncia | denunciarlo)",
    ] },
    // a bare "¿Dónde está?" / "No soy de aquí" answers "¿Sabe dónde está (la policía)?" only
    police_where_ctx: { patterns: [
      "[no] donde (esta | queda) [eso] #h:no_where", "[no] no se [donde (esta | queda)]", "[no] (no | ) (soy | somos) de aqui", "[no] (soy | estoy) (nuevo | nueva) aqui", "[no] soy turista", "mas o menos", "[no] no muy bien",
      "[no] ni idea [donde (esta | queda)]",
    ] },
    police_known: { patterns: [
      "[si] [ya] se donde (esta | queda) la (policia | estacion de policia)",
      "[si] la policia (esta | queda) (junto al | al lado del | enfrente del | cerca del | junto a la | cerca de la) {place}",
    ] },
    // "Sí, ya sé", "Sí, está junto al museo, ¿verdad?" answer "¿Sabe dónde está?" only
    police_known_ctx: { patterns: [
      "[si] [ya] se (donde esta | donde queda | cual es) #h:i_know", "[si] (la | lo) conozco", "[si] ya se", "[si] si se", "[si] [ya] (la | lo) vi [cuando llegué | hace rato]",
      "[si] (esta | queda | es la que esta) (junto al | al lado del | enfrente del | cerca del | junto a la | cerca de la) {place} [verdad | no]",
    ] },
    map: { patterns: [
      "(me (la | lo) puede | me puede | puede | podria | me podria | me (la | lo) podria) (ensenar | mostrar | marcar | senalar) [en (el | mi | su) (mapa | celular)] #h:q_map",
      "(me (la | lo) puedes | me puedes | puedes | me (la | lo) podrias | podrias) (ensenar | mostrar | marcar) [en (el | mi | tu) (mapa | celular)] #tip:tu_staff",
      "(me la | me lo) (marca | ensena | muestra) en (el | mi) mapa", "(tiene | trae) (un | su) mapa",
      "(me puede | puede) (ensenar | mostrar | decir) (el camino | donde esta | por donde es)",
      "(ensenemela | marquemela | ensenemelo) [en el mapa]",
    ] },
    far: { patterns: [
      "(esta | queda) (lejos | muy lejos) [de aqui] #h:q_far", "(esta | queda) (cerca | muy cerca) [de aqui]",
      "(esta | queda) a (cuanto | cuantos minutos)", "cuanto (tiempo | se hace) [caminando | a pie]", "se puede ir (caminando | a pie)",
      "(es | esta) (lejos | cerca) la policia",
    ] },
    how_get: { patterns: [
      "como llego [alla | ahi] #h:q_get_there", "como (se llega | voy) [alla | ahi]", "por donde (es | queda | me voy)",
      "(para | hacia) donde [es | queda]", "(es | esta) por (esta | esa) calle", "(es | esta | queda) por aqui", "(a la | hacia la) (derecha | izquierda) o (a la | hacia la) (derecha | izquierda)", "que direccion [es]", "(tengo que | hay que) cruzar la calle",
    ] },
    call911: { patterns: [
      "(llamo | debo llamar | tengo que llamar | hay que llamar | le llamo | marco | le marco | le hablo | hablo) al (911 | nueve once | nueve uno uno) #h:q_911",
      "(llamo | debo llamar | tengo que llamar | hay que llamar | marco) a la policia",
      "(llamo | debo llamar | tengo que llamar | marco) al (112 | 999 | uno uno dos | nueve nueve nueve) #tip:mx_911",
      "(debo | tengo que | hay que) (llamar | hablar) a (emergencias | la patrulla)",
      "(llamo | llamamos) a (emergencias | una patrulla)",
    ] },
    emergency_number: { patterns: [
      "cual es el numero de (emergencia | emergencias) [aqui | en mexico] #h:q_number",
      "(que | a que) numero (llamo | marco | hablo) [en una emergencia | si hay una emergencia]",
      "[aqui | en mexico] es el (911 | nueve once) [aqui | en mexico]",
      "[aqui | en mexico] es el (112 | 999 | uno uno dos) [aqui | en mexico] #tip:mx_911",
      "cual es el (numero | telefono) de la policia",
    ] },
    cancel_cards: { patterns: [
      "(debo | tengo que | hay que) (cancelar | bloquear | reportar | congelar) (mis | las) tarjetas #h:q_cards",
      "(cancelo | bloqueo | reporto) (mis | las) tarjetas", "(debo | tengo que) (llamar | hablarle) a mi banco", "(llamo | le hablo | le llamo) a mi banco",
      "y mis tarjetas", "que hago con (mis | las) tarjetas",
    ] },
    what_do: { patterns: [
      "que (hago | puedo hacer | debo hacer | me recomienda | me aconseja) [ahora]", "y ahora que [hago]",
      "(y si | que pasa si) no (esta | esta ahi | la encuentro | lo encuentro | aparece | la tienen | lo tienen)",
      "(y si | que pasa si) nadie (la | lo) (encontró | encuentra | tiene | entrega)",
    ] },
    will_go_back: { patterns: [
      "[si | bueno | ok] (voy a | ahorita voy a | ahora voy a) (regresar | ir | preguntar | buscar | volver) [alla | ahi | a preguntar | a buscar | (a | al | a la) {place} [a (preguntar | buscar)]] [y (pregunto | busco)]",
      "(buena | muy buena) idea", "[si] (ahorita | ya) voy", "[si] voy para (alla | ahi)", "[si | bueno] (regreso | vuelvo) [alla | ahi | a preguntar | (a | al | a la) {place} [a preguntar]]", "[si] voy a ver",
    ] },
    where_found: { patterns: ["donde (la | lo) (encontró | encontraron | halló) [el nino]", "donde estaba (mi | la | el) {item}"] },
    police_open: { patterns: ["(esta | estara) abierta [ahorita | hoy | ahora | todo el dia | los sabados | en sabado | el sabado | hoy sabado]", "a que hora (abre | abren | cierra | cierran)", "(abren | trabajan) (hoy | los sabados | en sabado)"] },
    police_english: { patterns: ["(hablan | habla | alguien habla) ingles [en la policia | ahi | alla]", "hay alguien que hable ingles"] },
    hope_so: { patterns: ["eso espero", "ojala [que si | que (la | lo) encuentre | sea asi]", "espero que si", "dios quiera"] },
    checked: { patterns: [
      "[si] ya (revisé | busqué | me fijé) [en] [@pockets] #h:checked",
      "[si] (revisé | busqué | me fijé en) @pockets", "[si] [ya] (busqué | revisé) por todos lados #h:checked2",
      "[si] (dos veces | tres veces | varias veces | mil veces)", "[si] (ya) (revisé | busqué) [y] no (esta | la encuentro | lo encuentro)",
      "[si] [ya] (busqué | revisé) en todas partes",
    ] },
    // "No, no está." / "No está en mis bolsas" answers "¿Ya revisó sus bolsas?" only
    checked_ctx: { patterns: ["[no] no esta", "[no] no esta en @pockets", "[no] no esta en (mi bolsa | mi mochila | mi chamarra | mi pantalon)",
      "[si] en todas [@pockets | partes]", "[no] (ahorita | ahora | deje | dejeme) (reviso | veo | busco | me fijo)"] },
    // "No revisé", "Todavía no busqué": a no to "¿Ya revisó bien sus bolsas?"
    not_checked_ctx: { patterns: ["[no] (no | todavia no | aun no) (revisé | he revisado | busqué | he buscado | me fijé | me he fijado) [bien] [en @pockets]"] },
    its_mine: { patterns: [
      "[si] [claro | claro que si] (es | esa es | esta es | ese es | este es) (mia | mio) #h:its_mine", "[si] es (la mia | el mio)",
    ] },
    // "Sí, esa es", "Es mi cartera", "¡Gracias a Dios!": a yes only at "¿Es suya?" (elsewhere "mi cartera…" or "¡Dios mío!" mean other things)
    its_mine_ctx: { patterns: [
      "[si] (es | esa es | esta es | ese es | este es) mi {item}", "[si] (es esa | esa es | es esta | esta es | es ese | ese es | es este | este es)",
      "(gracias a dios | dios mio | que bueno | que alegria | ay que bueno) [si] [es (mia | mio | mi {item})]", "[si] (la mia | el mio)",
    ] },
    // "No sé si es mía", "Se parece a la mía": she asks to look again
    unsure_mine_ctx: { patterns: [
      "no se si es (mia | mio | la mia | el mio | esa | esta | ese | este)", "[no] no estoy (seguro | segura) [si es (mia | mio)]", "(parece | se parece a) (la mia | el mio)",
      "es parecida [pero no se]", "es parecido [pero no se]", "(tal vez | a lo mejor | puede ser | quizas)", "[a ver] (dejeme | deje | puedo | me deja | me la deja | me lo deja) (ver | verla | verlo)",
    ] },
    // "Sí, el dinero": what is missing, only after "¿Sí le falta algo?"
    missing_what_ctx: { patterns: ["[si] [falta | me falta | faltan | me faltan] (el | mi | mis | la | las) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana)"] },
    // "No sé si falta algo": she asks to check
    unsure_all_ctx: { patterns: ["no se si falta (algo | nada)", "no se [todavia] [si] (esta todo | todo esta | falta algo)", "no se [todavia] [tengo que] (revisar | ver)", "(dejeme | deje) (revisar | ver)"] },
    not_mine: { patterns: [
      "[no] no es (mia | mio) #h:not_mine", "[no] (esa | esta) no es (mia | mio | mi {item} | la mia | el mio)", "[no] no es (esa | la mia | el mio | mi {item})",
      "[no] mi {item} es (mas chica | mas chico | mas grande | diferente | de otro color | {color} | {material})",
      "[no] (la mia | el mio) es (diferente | {color} | {material} | mas chica | mas chico | mas grande | de otro color)",
    ] },
    // "Esa no es" / "No es esa": at "¿Es suya?" only
    not_mine_ctx: { patterns: ["[no] (esa | esta | ese | este) no es", "[no] no es (esa | esta | ese | este)"] },
    all_there: { patterns: [
      "[si] (esta todo | todo esta) [aqui | completo | ahi | adentro | bien] #h:all_there",
      "[si] (todo completo | esta completa | esta completo | todo bien | esta perfecto)",
      "[si] [no] no falta nada", "[si] no me falta nada",
      "[si] (mi dinero | mis tarjetas | mi identificacion | mi licencia | mi credencial | mi pasaporte | el dinero | las tarjetas) [y (mi dinero | mis tarjetas | mi identificacion | mi licencia | mi credencial | el dinero | las tarjetas)] (esta | estan) (todavia | aqui | adentro | completo | completas | ahi)",
      "[si] (mi dinero | mis tarjetas | el dinero | las tarjetas) [y (mi dinero | mis tarjetas | el dinero | las tarjetas)] (si esta | si estan | ahi estan | ahi esta | aqui estan | aqui esta)",
      "[si] (si prende | prende | funciona | si funciona | sirve | si sirve) [bien]", "[si] no le pasó nada",
    ] },
    some_missing: { patterns: [
      "(falta | me falta | faltan | me faltan) (el | mi | mis | la | las | ) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana) #h:some_missing",
      // "No, falta el dinero" and "No falta el dinero" read the same without the comma: she asks (#amb)
      "no (falta | me falta | faltan | me faltan) (el | mi | mis | la | las | ) (dinero | efectivo | tarjetas | tarjeta | identificacion | licencia | credencial | lana) #amb",
      "[no] (mis | las) tarjetas (si | si estan | estan) [pero] (el | mi) (dinero | efectivo) no", "[no] (el | mi) (dinero | efectivo) (si | si esta | esta) [pero] (mis | las) tarjetas no",
      "[no] (el | mi) (dinero | efectivo) no esta", "[no] no esta (el | mi) (dinero | efectivo)",
      "[no] (se llevaron | sacaron | me sacaron | me quitaron) (el | mi | todo el) (dinero | efectivo)",
      "(mis | las) tarjetas (estan | si estan) pero (el | mi) (dinero | efectivo) no", "[no] esta vacia",
      "[no] no (esta todo | todo esta) [completo]", "[no] (falta | me falta) algo", "[no] no (esta | estan) (el dinero | mi dinero | mis tarjetas | las tarjetas | mi identificacion | mi licencia)",
      "[no] no (prende | funciona | sirve) [#broken]", "[no] (la pantalla | el celular) esta (rota | roto) #broken",
    ] },
    thanks_kind: { patterns: [
      "(usted | ) es (muy | super | tan) (amable | linda | buena | buena gente) [usted] #h:kind", "que (linda | buena gente) [es usted]",
      "(gracias | muchas gracias) (otra vez | de nuevo)", "no se como agradecerle", "es usted un angel", "dios se lo pague",
      "(fue | ha sido) de mucha ayuda", "me (ha ayudado | ayudó) (muchisimo | un monton)",
      "[muchas | mil] gracias (nino | mijo | joven | chamaco | amiguito) #boy", "(dale | dele) las gracias al nino #boy",
    ] },
    flowers: { patterns: [
      "(me da | quiero | quisiera | me vende | me puede dar | deme | me llevo | ponme | me pone) (unas | un ramo de | una docena de | unos | un ramito de) (flores | rosas | girasoles | tulipanes | margaritas | claveles | nardos | gerberas | alcatraces) #buy",
      "(cuanto | cuantos) (cuestan | cuesta | valen | vale | es) [por] (las | los | el | la | un | una) (flores | rosas | girasoles | ramo | docena | ramito) [de (rosas | flores | girasoles)] #price",
      "a como (estan | da | son) (las | los) (rosas | flores | girasoles) #price",
      "que (flores | rosas) tan (bonitas | lindas | hermosas) #nice", "(sus | las) (flores | rosas) (estan | son) (muy | tan | bien) (bonitas | lindas | hermosas) #nice",
      "que (bonitas | lindas | hermosas) (flores | rosas) #nice", "(estan | son) (muy | bien | tan | ) (bonitas | lindas | hermosas) (sus | las | estas) (flores | rosas) #nice",
    ] },
  },

  lines: {
    greet: [
      t("¡Buenos días! | ¿En | qué | le | ayudo?", "Good morning! | In | what | (to) you | I-help?", "Good morning! How can I help you?"),
      t("¡Buenos días! | ¡Mire | qué | rosas | tan | bonitas!", "Good morning! | Look | what | roses | so | pretty!", "Good morning! Look at these lovely roses!"),
    ],
    greet_worried: [
      t("¡Buenos días, | {m:mijo|f:mija}! | ¿Está | bien? | Se ve | {m:preocupado|f:preocupada}.", "Good morning, | dear! | Are you | okay? | You look | worried.",
        "Good morning, dear! Are you okay? You look worried.", { flags: { 1: MIJA } }),
    ],
    ask_problem: [
      t("¿Qué | le | pasó, | {m:mijo|f:mija}?", "What | (to) you | happened, | dear?", "What happened, dear?", { flags: { 3: MIJA } }),
      t("¿Qué | pasó?", "What | happened?", "What happened?"),
    ],
    help_ok: [
      t("Claro, | {m:mijo|f:mija}. | ¿Qué | le | pasó?", "Sure, | dear. | What | (to) you | happened?", "Of course, dear. What happened?", { flags: { 1: MIJA } }),
      t("¡Claro! | Dígame.", "Sure! | Tell me.", "Of course! Tell me."),
    ],
    lost_react: [
      t("¡Ay, | no! | Cálmese.", "Oh, | no! | Calm down.", "Oh no! Stay calm."),
      t("¡Ay, | Dios! | No se preocupe.", "Oh, | God! | Don't worry.", "Oh dear! Don't worry."),
      t("¡Ay, | no! | No se preocupe, | ahorita | vemos | qué | hacemos.", "Oh, | no! | Don't worry, | right now | we-see | what | we-do.", "Oh no! Don't worry, we'll figure out what to do.",
        { flags: { 3: "Mexican: ahorita = right now, in a moment." },
          neutral: t("¡Ay, | no! | No se preocupe, | ahora | vemos | qué | hacemos.", "Oh, | no! | Don't worry, | now | we-see | what | we-do.", "Oh no! Don't worry, we'll figure out what to do.") }),
    ],
    stolen_react: [
      t("¡Ay, | no! | ¿Está | {m:seguro|f:segura}? | A lo mejor | nada más | se le cayó.", "Oh, | no! | Are you | sure? | Maybe | just | you dropped it.",
        "Oh no! Are you sure? Maybe you just dropped it.", { flags: { 6: "se le cayó: it fell from you (se + le: to you), the usual way to say you dropped something." } }),
    ],
    keys_too: [t("¿Y | las | llaves | también?", "And | the | keys | too?", "Your keys too?")],
    ask_pockets: [
      t("¿Ya | revisó | bien | sus | bolsas?", "Already | did you check | well | your | pockets?", "Did you check your pockets properly?",
        { flags: { 4: "Mexican: bolsas = pockets (and bags); elsewhere bolsillos." },
          neutral: t("¿Ya | revisó | bien | sus | bolsillos?", "Already | did you check | well | your | pockets?", "Did you check your pockets properly?") }),
    ],
    checked_ok: [t("Ah, | bueno.", "Oh, | okay.", "Oh, okay."), t("Está bien.", "That's fine.", "All right.")],
    check_again: [t("Revise | otra vez, | por si acaso.", "Check | again, | just in case.", "Check again, just in case.")],
    ask_last: [
      t("¿Cuándo | fue | la | última | vez | que | {lo@X} | tuvo?", "When | was | the | last | time | that | it | you-had?", "When did you last have it?"),
      t("¿Dónde | {lo@X} | vio | por última vez?", "Where | it | did you see | for the last time?", "Where did you last see it?"),
      t("A ver, | vamos | a | pensar. | ¿Dónde | {lo@X} | tenía | por última vez?", "Let's see, | we're going | to | think. | Where | it | did you have | for the last time?",
        "Okay, let's think. Where did you last have it?"),
    ],
    where_was_that: [t("¿Ah, | sí? | ¿Dónde | fue | eso?", "Oh, | yes? | Where | was | that?", "Oh? Where was that?")],
    which_place: [t("Perdón, | ¿en | {X.the} | o | en | {Y.the}?", "Sorry, | at | {X.the} | or | at | {Y.the}?", "Sorry, at {X.the} or at {Y.the}?")],
    where_then_ask: [t("¿Entonces | dónde?", "Then | where?", "Where, then?")],
    ask_where_then: [t("¿Y | dónde | estaba | usted | en | ese | momento?", "And | where | were | you | at | that | moment?", "And where were you at the time?")],
    think_help: [
      t("Piense | un | momento. | ¿Compró | algo | hoy | en | la | mañana?", "Think | a | moment. | Did you buy | something | today | in | the | morning?",
        "Think for a moment. Did you buy anything this morning?"),
    ],
    go_back_shop: [t("Entonces | regrese | a | {X.the} | y | pregunte.", "Then | go back | to | {X.the} | and | ask.", "Then go back to {X.the} and ask.")],
    go_back_near: [t("Entonces | regrese | a | {X.the} | y | busque | bien.", "Then | go back | to | {X.the} | and | look | carefully.", "Then go back to {X.the} and take a good look.")],
    go_back_area: [t("Entonces | regrese | a | {X.the} | y | busque | por | ahí.", "Then | go back | to | {X.the} | and | look | around | there.", "Then go back to {X.the} and look around.")],
    look_here: [t("Entonces | dé | una | vuelta | por | los | puestos | y | pregunte.", "Then | take | a | walk | around | the | stalls | and | ask.", "Then walk around the stalls and ask.")],
    retrace: [t("Bueno, | piense | por | dónde | anduvo | hoy | y | regrese | a | preguntar.", "Well, | think | through | where | you-went around | today | and | go back | to | ask.",
      "Well, think about where you've been today, and go back and ask.", { flags: { 4: "andar: to go around, to be (somewhere) for a while." } })],
    left_home: [t("¡A lo mejor | {lo@X} | dejó | en | su | casa!", "Maybe | it | you-left | at | your | house!", "Maybe you left it at home!")],
    maybe_found: [
      t("A lo mejor | alguien | {lo@X} | encontró.", "Maybe | someone | it | found.", "Maybe someone found it."),
      t("A lo mejor | sigue | en | el | mismo | lugar.", "Maybe | it's still | in | the | same | place.", "Maybe it's still in the same place."),
    ],
    call_bus: [
      t("Entonces | vaya | a | la | parada | de | los | colectivos | y | pregúnteles | a | los | choferes.", "Then | go | to | the | stop | of | the | colectivos | and | ask (them) | — | the | drivers.",
        "Then go to the colectivo stop and ask the drivers.", { flags: { 7: "colectivo: the shared van that runs along the coast.", 10: "a: the personal a before people; English has no word here." } }),
    ],
    bus_keep: [t("A veces | guardan | las | cosas | que | encuentran.", "Sometimes | they-keep | the | things | that | they-find.", "Sometimes they keep things people leave behind.")],
    call_taxi: [
      t("Entonces | vaya | al | sitio | de | taxis | y | pregunte.", "Then | go | to the | stand | of | taxis | and | ask.", "Then go to the taxi stand and ask.",
        { flags: { 3: "Mexican: sitio (de taxis) = taxi stand; elsewhere parada de taxis." },
          neutral: t("Entonces | vaya | a | la | parada | de | taxis | y | pregunte.", "Then | go | to | the | stand | of | taxis | and | ask.", "Then go to the taxi stand and ask.") }),
    ],
    taxi_know: [t("Los | choferes | se conocen | todos.", "The | drivers | know each other | all.", "The drivers all know each other.")],
    ask_describe: [
      t("¿Cómo | es? | Yo | estoy | pendiente, | por si | alguien | {lo@X} | trae.", "How | is it? | I | am | on the lookout, | in case | someone | it | brings.",
        "What does it look like? I'll keep an eye out, in case someone brings it here."),
      t("¿Y | cómo | es | su | {X}?", "And | how | is | your | {X}?", "And what does your {X} look like?"),
    ],
    describe_echo: [
      t("Muy | bien: | {X.np}. | Si | {lo@X} | veo, | le | aviso.", "Very | good: | {X.np}. | If | it | I-see, | (to) you | I-let-know.", "Okay: {X.np}. If I see it, I'll let you know."),
      t("Entonces, | {X.np}. | Aquí | estoy | pendiente.", "So, | {X.np}. | Here | I-am | on the lookout.", "So, {X.np}. I'll keep an eye out."),
    ],
    fix_echo: [t("Ah, | perdón: | {X.np}.", "Oh, | sorry: | {X.np}.", "Oh, sorry: {X.np}.")],
    describe_noted: [t("Muy | bien. | Si | {lo@X} | veo, | le | aviso.", "Very | good. | If | it | I-see, | (to) you | I-let-know.", "Okay. If I see it, I'll let you know.")],
    describe_again: [t("Y | su | {X}, | ¿cómo | es?", "And | your | {X}, | how | is it?", "And your {X}, what does it look like?")],
    no_worry: [t("No se preocupe.", "Don't worry.", "Don't worry.")],
    found_reask: [t("Entonces, | ¿es | {suyo@X}?", "So, | is it | yours?", "So, is it yours?")],
    police_suggest: [t("Y | si | no aparece, | vaya | a | la | Policía Municipal.", "And | if | it doesn't turn up, | go | to | the | town police.", "And if it doesn't turn up, go to the town police.")],
    ask_know_police: [t("¿Sabe | dónde | está?", "Do you know | where | it is?", "Do you know where it is?")],
    police_again2: [t("¿Sabe | cómo | llegar | a | la | policía?", "Do you know | how | to get | to | the | police?", "Do you know how to get to the police station?")],
    police_again: [t("Y | la | policía, | ¿sabe | dónde | está?", "And | the | police, | do you know | where | it is?", "And the police station, do you know where it is?")],
    look_there: [t("Mire, | {m:mijo|f:mija}:", "Look, | dear:", "Look, dear:", { flags: { 1: MIJA } })],
    directions: [t("Está | ahí | enfrente, | junto al | museo.", "It's | there | across the street, | next to the | museum.", "It's right over there, across the street, next to the museum.")],
    directions2: [
      t("¿Ve | el | museo? | La | policía | está | al lado.", "Do you see | the | museum? | The | police | is | next to it.", "See the museum? The police station is right next to it."),
      t("Nada más | cruce | la | calle | y | ahí | está.", "Just | cross | the | street | and | there | it is.", "Just cross the street and it's right there."),
    ],
    map_show: [t("Claro, | mire. | Aquí está, | en | mi | celular.", "Sure, | look. | Here it is, | on | my | phone.", "Sure, look. Here it is, on my phone.")],
    map_mark: [t("Se la | marco | en | su | mapa.", "It for you | I-mark | on | your | map.", "I'll mark it on your map for you.", { flags: { 0: "se la: it (la policía) for you." } })],
    far: [
      t("Está | aquí | nomás, | cruzando | la | calle. | Un | minuto | a pie.", "It's | here | just, | crossing | the | street. | One | minute | on foot.",
        "It's right here, just across the street. One minute on foot.",
        { flags: { 2: "Mexican: nomás = just; elsewhere nada más." },
          neutral: t("Está | aquí | mismo, | cruzando | la | calle. | Un | minuto | a pie.", "It's | here | right, | crossing | the | street. | One | minute | on foot.",
            "It's right here, just across the street. One minute on foot.") }),
    ],
    police_open: [t("Siempre | hay | alguien, | {m:mijo|f:mija}.", "Always | there is | someone, | dear.", "There's always someone there, dear.", { flags: { 3: MIJA } })],
    police_english: [t("Ay, | no sé. | Pero | usted | habla | muy | bien | español.", "Oh, | I don't know. | But | you | speak | very | well | Spanish.", "Oh, I don't know. But you speak Spanish very well!")],
    police_correct: [t("No, | está | junto al | museo, | aquí | enfrente.", "No, | it's | next to the | museum, | here | across the street.",
      "No, it's next to the museum, right across the street.")],
    police_known_ok: [t("Ah, | muy | bien.", "Oh, | very | good.", "Oh, good.")],
    no911: [t("No, | el | 911 | es | solo | para | emergencias.", "No, | the | 911 | is | only | for | emergencies.", "No, 911 is only for emergencies.",
      { say: "No, el nueve once es solo para emergencias.", flags: { 1: "el (número): Spanish puts an article before the number." } })],
    no911b: [t("Un | accidente, | un | incendio... | algo | así.", "An | accident, | a | fire... | something | like that.", "An accident, a fire, something like that.")],
    no911c: [t("Por | algo | perdido, | mejor | vaya | directo | a | la | policía.", "For | something | lost, | better | go | straight | to | the | police.",
      "For something you've lost, you're better off going straight to the police.")],
    number911: [t("Es | el | 911. | Pero | nada más | para | emergencias.", "It's | the | 911. | But | only | for | emergencies.", "It's 911. But only for emergencies.",
      { say: "Es el nueve once. Pero nada más para emergencias.", flags: { 1: "el (número): Spanish puts an article before the number." } })],
    cards: [t("Yo | de una vez | llamaría | a | su | banco | para | bloquear | las | tarjetas.", "I | right away | would call | — | your | bank | to | block | the | cards.",
      "I'd call your bank right away and have them block your cards.", { flags: { 3: "llamar a: to call (someone or a place); the a has no English word." } })],
    what_do: [t("Primero | regrese | y | pregunte. | Si | no aparece, | vaya | a | la | policía.", "First | go back | and | ask. | If | it doesn't turn up, | go | to | the | police.",
      "First go back and ask. If it doesn't turn up, go to the police.")],
    ok: [
      t("Ándele.", "Okay.", "Okay.", { flags: { 0: "Mexican: ándele = okay, go ahead." }, neutral: t("Muy | bien.", "Very | good.", "Okay.") }),
      t("Está bien.", "That's fine.", "All right."),
      t("Muy | bien.", "Very | good.", "Okay."),
    ],
    found: [t("¡Ay, | espérese! | Este | niño | encontró | {X.np} | junto al | kiosco.", "Oh, | wait! | This | boy | found | {X.np} | next to the | bandstand.",
      "Oh, wait! This boy found {X.np} by the bandstand.")],
    where_found: [t("Junto al | kiosco, | ahí | {tirado@X} | en | el | suelo.", "Next to the | bandstand, | there | lying | on | the | ground.", "By the bandstand, lying on the ground.",
      { flags: { 1: "kiosco: the bandstand in the middle of the zócalo." } })],
    look_closer: [t("Fíjese | bien. | ¿Es | {suyo@X}?", "Look | carefully. | Is it | yours?", "Take a good look. Is it yours?")],
    check_calm: [t("Revise | con | calma, | {m:mijo|f:mija}.", "Check | with | calm, | dear.", "Take your time and check, dear.", { flags: { 3: MIJA } })],
    found_ask: [t("¿Es | {suyo@X}?", "Is it | yours?", "Is it yours?")],
    found_yes: [t("¡Ay, | qué bueno! | ¿Está | todo | adentro?", "Oh, | how good! | Is | everything | inside?", "Oh, wonderful! Is everything still in it?")],
    found_yes_phone: [
      t("¡Ay, | qué bueno! | ¿Y | sí | prende?", "Oh, | how good! | And | really | does it turn on?", "Oh, wonderful! Does it still turn on?",
        { flags: { 3: "sí: stressed, “does it really…”.", 4: "Mexican: prender = to turn on; elsewhere encender." },
          neutral: t("¡Ay, | qué bueno! | ¿Y | sí | enciende?", "Oh, | how good! | And | really | does it turn on?", "Oh, wonderful! Does it still turn on?", { flags: { 3: "sí: stressed, “does it really…”." } }) }),
    ],
    all_there_again: [t("Entonces, | ¿está | todo?", "So, | is | everything (there)?", "So, is everything there?")],
    glad: [t("¡Ay, | qué | gusto!", "Oh, | what | joy!", "Oh, I'm so glad!"), t("¡Qué | alegría!", "What | joy!", "I'm so happy for you!")],
    boy_thanks: [t("¡Agradézcale | a | él, | no | a | mí!", "Thank | — | him, | not | — | me!", "Thank him, not me!",
      { flags: { 1: "a él: the personal a; agradézcale already says “thank him”, a él stresses it.", 4: "a mí: the same personal a." } })],
    not_yours: [t("Ay, | qué | lástima.", "Oh, | what | a pity.", "Oh, too bad.")],
    missing_some: [t("Ay, | no. | Entonces | de todos modos | vaya | a | la | policía.", "Oh, | no. | Then | anyway | go | to | the | police.", "Oh no. Then you should still go to the police.")],
    phone_broken: [t("Ay, | qué | mala | suerte. | Pero | por lo menos | ya | {lo@X} | tiene.", "Oh, | what | bad | luck. | But | at least | now | it | you-have.", "Oh, what bad luck. But at least you've got it back.")],
    missing_really: [t("Perdón, | ¿sí | le | falta | algo?", "Sorry, | really | (to) you | is missing | something?", "Sorry, so is something missing?",
      { flags: { 1: "sí (stressed): “so … really?”, checking a yes." } })],
    lost_really: [t("Perdón, | ¿sí | perdió | su | {X}?", "Sorry, | really | did you lose | your | {X}?", "Sorry, so you did lose your {X}?",
      { flags: { 1: "sí (stressed): “so you did…”, checking a yes." } })],
    not_lost_resp: [t("¡Ah, | qué bueno! | Entonces, | ¿en | qué | le | ayudo?", "Oh, | how good! | Then, | in | what | (to) you | I-help?", "Oh, good! So how can I help you?")],
    flowers_sure: [t("¡Claro que sí!", "Of course!", "Of course!")],
    flowers_thanks: [t("¡Gracias! | Están | recién | cortadas.", "Thanks! | They're | freshly | cut.", "Thank you! They're freshly cut.")],
    flowers_price: [
      t("El | ramo | está | en | {$price}.", "The | bunch | is | at | {$price}.", "A bunch is {$price}.", { flags: { 3: "estar en + a price: the usual way to give a market price." } }),
    ],
    but_worried: [t("Pero | se ve | {m:preocupado|f:preocupada}, | {m:mijo|f:mija}. | ¿Le | pasó | algo?", "But | you look | worried, | dear. | (To) you | happened | something?",
      "But you look worried, dear. Did something happen?", { flags: { 3: MIJA } })],
    really_ok: [t("¿Seguro? | Parece | que | busca | algo.", "Sure? | It seems | that | you're looking for | something.", "Are you sure? It looks like you're looking for something.")],
    good_luck: [
      t("¡Suerte! | Ojalá | {lo@X} | encuentre.", "Good luck! | Hopefully | it | you-find.", "Good luck! I hope you find it."),
      t("¡Mucha | suerte, | {m:mijo|f:mija}!", "Much | luck, | dear!", "Good luck, dear!", { flags: { 2: MIJA } }),
    ],
    kind_resp: [t("Ay, | no es | nada.", "Oh, | it isn't | anything.", "Oh, it's nothing."), t("Para | eso | estamos.", "For | that | we-are.", "That's what we're here for.")],
    closing_welcome: [t("De nada, | {m:mijo|f:mija}. | ¡Que | le | vaya | bien!", "You're welcome, | dear. | May | (to) you | it-go | well!", "You're welcome, dear. Take care!", { flags: { 1: MIJA } })],
    closing_bye: [t("¡Adiós, | {m:mijo|f:mija}! | ¡Que | le | vaya | bien!", "Bye, | dear! | May | (to) you | it-go | well!", "Bye, dear! Take care!", { flags: { 1: MIJA } })],
    enjoy_day: [t("¡Cuídese | mucho! | Y | que | disfrute | el | resto | del | día.", "Take care | a lot! | And | may | you-enjoy | the | rest | of the | day.", "Take care! And enjoy the rest of your day.")],
  },

  hints: {
    problem: {
      lt: "Ask for help and say what happened", slot: "item", examples: ["wallet"],
      items: [H_HELP, H_LOST, H_SE_ME, H_CANT_FIND,
        { id: "stolen", s: t("Creo | que | me | robaron | {X.the}.", "I think | that | (from) me | they-stole | {X.the}.", "I think someone stole my {X}."),
          note: "Spanish uses a “they” with no subject: me robaron = someone stole (from me)." },
      ],
    },
    lost: {
      lt: "Say what you lost", slot: "item", examples: ["wallet"],
      items: [H_LOST, H_SE_ME, H_CANT_FIND],
    },
    pockets: {
      lt: "Say whether you checked your pockets",
      items: [
        { id: "checked", s: t("Sí, | ya | revisé.", "Yes, | already | I-checked.", "Yes, I checked.") },
        { id: "checked2", s: t("Sí, | ya | busqué | por todos lados.", "Yes, | already | I-looked | everywhere.", "Yes, I've looked everywhere.") },
      ],
    },
    last_seen: {
      lt: "Say where and when you last had it", slot: "place", examples: ["cafe", "bakery", "fruit_stand"],
      items: [
        H_AT_PLACE,
        { id: "ls_paid", s: t("Cuando | pagué | mi | café.", "When | I-paid (for) | my | coffee.", "When I paid for my coffee.") },
        { id: "ls_time", s: t("Hace | como | una | hora.", "Ago | about | an | hour.", "About an hour ago.", { flags: { 0: "hace + a time = … ago; it comes first in Spanish." } }) },
        { id: "ls_time", s: t("Hoy | en | la | mañana, | en | {X.the}.", "Today | in | the | morning, | at | {X.the}.", "This morning, at {X.the}.") },
        H_WAS_AT, H_NEAR, H_TOOK,
      ],
    },
    where_then: {
      lt: "Say where you were", slot: "place", examples: ["cafe", "bakery", "fruit_stand"],
      items: [H_AT_PLACE, H_WAS_AT, H_NEAR, H_TOOK],
    },
    describe: {
      lt: "Describe it",
      items: [
        { id: "describe", s: t("Es | una | cartera | negra | de piel.", "It's | a | wallet | black | leather.", "It's a black leather wallet."),
          note: "Colors agree: una cartera negra, un celular negro." },
        { id: "describe", s: t("Es | café | y | chiquita.", "It's | brown | and | small.", "It's brown and small.", { flags: { 3: "chiquita: little (chica + -ita, a friendly diminutive)." } }) },
        { id: "describe", s: t("Es | negra | y | tiene | una | foto | de | mis | hijos.", "It's | black | and | it-has | a | photo | of | my | children.", "It's black, and there's a photo of my kids in it.") },
        { id: "describe", s: t("Es | un | celular | negro | con | funda | azul.", "It's | a | phone | black | with | case | blue.", "It's a black phone with a blue case.") },
      ],
    },
    police_know: {
      lt: "Say whether you know where it is",
      items: [
        { id: "no_where", s: t("No, | ¿dónde | está?", "No, | where | is it?", "No, where is it?") },
        { id: "q_map", s: t("No. | ¿Me | la | puede | enseñar | en | el | mapa?", "No. | (To) me | it | can you | show | on | the | map?", "No. Could you show me on the map?",
          { flags: { 2: "la: it, la policía." } }) },
        { id: "i_know", s: t("Sí, | ya | sé | dónde | está.", "Yes, | already | I-know | where | it is.", "Yes, I know where it is.") },
      ],
    },
    police: {
      lt: "Ask where the police are and how to get there",
      items: [
        { id: "q_police", s: t("¿Dónde | está | la | policía?", "Where | is | the | police?", "Where's the police station?") },
        { id: "q_map", s: t("¿Me | la | puede | enseñar | en | el | mapa?", "(To) me | it | can you | show | on | the | map?", "Could you show me on the map?", { flags: { 1: "la: it, la policía." } }) },
        { id: "q_get_there", s: t("¿Cómo | llego?", "How | do I get there?", "How do I get there?") },
        { id: "q_far", s: t("¿Está | lejos?", "Is it | far?", "Is it far?") },
      ],
    },
    emergency: {
      lt: "Ask about the emergency number and your cards",
      items: [
        { id: "q_911", s: t("¿Llamo | al | 911?", "Do I call | the | 911?", "Should I call 911?", { say: "¿Llamo al nueve once?", flags: { 1: "al (a + el): Spanish puts an article before the number." } }) },
        { id: "q_number", s: t("¿Cuál | es | el | número | de | emergencias?", "Which | is | the | number | of | emergencies?", "What's the emergency number?") },
        { id: "q_cards", s: t("¿Tengo | que | bloquear | mis | tarjetas?", "Do I have | to | block | my | cards?", "Should I block my cards?") },
      ],
    },
    thanks: {
      lt: "Thank her and say goodbye",
      items: [
        { id: "s_thanks_help", s: t("¡Gracias | por | su | ayuda!", "Thanks | for | your | help!", "Thanks for your help!") },
        { id: "kind", s: t("Muchas | gracias. | Es | usted | muy | amable.", "Many | thanks. | Are | you | very | kind.", "Thank you so much. You're very kind.",
          { flags: { 2: "Es usted: the verb before usted sounds warm and polite; usted es also works." } }) },
        { id: "s_bye2", s: t("¡Adiós!", "Goodbye!", "Goodbye!") },
      ],
    },
    found: {
      lt: "Say whether it's yours",
      items: [
        { id: "its_mine", s: t("¡Sí, | es | mía!", "Yes, | it's | mine!", "Yes, that's mine!"), note: "mía for la cartera, la bolsa, la mochila; mío for el celular." },
        { id: "not_mine", s: t("No, | no es | mía.", "No, | it isn't | mine.", "No, that's not mine.") },
      ],
    },
    all_there: {
      lt: "Say whether everything's there",
      items: [
        { id: "all_there", s: t("Sí, | está | todo.", "Yes, | is | everything.", "Yes, everything's there.") },
        { id: "all_there", s: t("Sí, | no falta | nada.", "Yes, | isn't missing | anything.", "Yes, nothing's missing.") },
        { id: "some_missing", s: t("Falta | el | dinero.", "Is missing | the | money.", "The money's gone.") },
      ],
    },
  },

  tips: {
    tu_staff: { key: "tu_staff", lt: "Understood! With an older stranger, usted is more polite: ¿Me puede ayudar? (puedes is for friends).", better: "¿Me puede ayudar?" },
    mx_911: { key: "mx_911", lt: "Understood! In Mexico the emergency number is 911 (said “nueve once”).", better: "¿Llamo al 911?" },
  },

  merges: {
    "se me perdió": { reason: "grammatical_fusion", split: "se → itself + me → to me + perdió → it lost misreads the construction: “it got lost on me” = I lost.", minimal: "Three words; the object stays outside." },
    "se le cayó": { reason: "grammatical_fusion", split: "se → itself + le → to you + cayó → it fell: the accidental se = you dropped it.", minimal: "Three words." },
    "a lo mejor": { reason: "lexical_expression", split: "a → to + lo → the + mejor → best misreads the adverb: maybe.", minimal: "Three words." },
    "por si acaso": { reason: "lexical_expression", split: "por → for + si → if + acaso → perhaps is the fixed phrase just in case.", minimal: "Three words." },
    "por si": { reason: "lexical_expression", split: "por → for + si → if is the conjunction in case.", minimal: "Two words." },
    "por última vez": { reason: "lexical_expression", split: "por → for + última → last + vez → time: the adverb for the last time.", minimal: "Three words." },
    "por todos lados": { reason: "lexical_expression", split: "por → through + todos → all + lados → sides is the adverb everywhere.", minimal: "Three words." },
    "policía municipal": { reason: "lexical_expression", split: "policía → police + municipal → municipal names one institution: the town police.", minimal: "The two-word name." },
    "junto al": { reason: "grammatical_fusion", split: "junto → together + al → to the: junto a is the preposition next to, fused with el.", minimal: "Two words; the noun stays outside." },
    "al lado": { reason: "lexical_expression", split: "al → to the + lado → side is the adverb next to it.", minimal: "Two words." },
    "a pie": { reason: "lexical_expression", split: "a → to + pie → foot is the adverb on foot.", minimal: "Two words." },
    "de piel": { reason: "lexical_expression", split: "de → of + piel → skin describes the material: leather.", minimal: "Two words." },
    "de una vez": { reason: "lexical_expression", split: "de → of + una → one + vez → time is the adverb right away.", minimal: "Three words." },
    "de todos modos": { reason: "lexical_expression", split: "de → of + todos → all + modos → ways is the adverb anyway.", minimal: "Three words." },
    "por lo menos": { reason: "lexical_expression", split: "por → for + lo → the + menos → least is the adverb at least.", minimal: "Three words." },
    "qué bueno": { reason: "lexical_expression", split: "qué → what + bueno → good is the exclamation how wonderful.", minimal: "Two words." },
    "se conocen": { reason: "grammatical_fusion", split: "se → each other + conocen → they know: the reciprocal se is part of the English verb phrase (know each other).", minimal: "Two words." },
    "se la": { reason: "grammatical_fusion", split: "se → to you + la → it: two object pronouns before the verb are glossed together.", minimal: "Two words." },
  },

  // -------------------------------------------------------------------------

  mission: [
    { lt: "Say you've lost your wallet", step: "problem" },
    { lt: "Say where you last had it", done: (c) => !!(c.s.place || c.s.placeSkipped) },
    { lt: "Describe it", optional: true,
      when: (c) => !!c.s.askDescribe && !c.s.found && !c.s.policeInfo,
      done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped) },
    { lt: "Say whether it's yours", optional: true, when: (c) => !!c.s.foundAsked, done: (c) => !!c.s.foundAsked && !!c.s.found },
    { lt: "Check that everything's there", optional: true, when: (c) => c.s.found === "mine", done: (c) => !!c.s.checkedInside },
    { lt: "Ask where the police are", optional: true, when: (c) => !gotBack(c), done: (c) => !!(c.s.policeInfo || c.s.policeKnown) },
  ],

  steps: [
    { id: "problem", done: (c) => !!c.s.lost,
      ask: (c) => c.say("ask_problem"),
      expects: ["help_req", "lost", "not_lost"],
      suggest: [{ lt: "Ask for help and say what you lost", hint: "problem", options: "item" }] },
    { id: "last_seen", when: (c) => !!c.s.lost && !c.s.found, done: (c) => !!c.s.lastSeen,
      ask: (c) => c.say("ask_last", { X: item(c) }),
      expects: ["last_seen", "when_ctx", "place_ctx", "place_not_ctx", "dont_remember"],
      suggest: [{ lt: "Say where and when you last had it", hint: "last_seen", options: "place" }],
      yes: (c) => { c.say("where_was_that"); c.hold(); },
      no: (c) => { lastSeenHelp(c); c.hold(); },
      // "No sé" / "No me acuerdo": a hint the first time; the second time she goes on without a place
      help: (c) => { lastSeenHelp(c); } },
    { id: "where_then", when: (c) => !!c.s.lastSeen && !c.s.place && !c.s.found, done: (c) => !!c.s.place || !!c.s.placeSkipped,
      ask: (c) => c.say("ask_where_then"),
      expects: ["last_seen", "place_ctx", "place_not_ctx", "dont_remember"],
      suggest: [{ lt: "Say where you were", hint: "where_then", options: "place" }],
      // "No sé" / "No me acuerdo": she goes on with what she can advise
      help: (c) => { c.s.placeSkipped = true; askNext(c); } },
    { id: "advice", when: (c) => !!c.s.lastSeen && !c.s.found, done: (c) => !!c.s.advised,
      ask: (c) => {
        c.s.advised = true;
        const p = c.s.place ? byId(c.s.place) : null;
        if (c.s.home && !p) c.say("left_home", { X: item(c) }); // (the police line follows: no "si no aparece" twice)
        else if (!p) c.say("retrace");
        else {
          const kind = p.attrs?.kind;
          if (kind === "bus") { c.say("call_bus"); c.say("bus_keep"); }
          else if (kind === "taxi") { c.say("call_taxi"); c.say("taxi_know"); }
          else if (kind === "here") { c.say("look_here"); c.say("maybe_found", { X: item(c) }); }
          else if (kind === "near") { c.say("go_back_near", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
          else if (kind === "area") { c.say("go_back_area", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
          else { c.say("go_back_shop", { X: p.id }); c.say("maybe_found", { X: item(c) }); }
        }
        // (on a found-it visit the boy turns up right after the description)
        if (c.s.askDescribe && !c.s.color && !c.s.material && !c.s.size) c.ask("describe");
        else if (c.s.foundTwist) c.ask("found");
        // nothing else to ask: on to the police, without a silent turn
        else if (!gotBack(c)) c.ask("police");
      },
      suggest: [{ lt: "Ask where the police are", hint: "police" }, { lt: "Ask about 911 or your cards", hint: "emergency" }] },
    { id: "found", when: (c) => !!c.s.foundTwist && !!c.s.advised, done: (c) => !!c.s.found,
      ask: (c) => {
        if (c.s.foundAsked) { c.say("found_reask", { X: item(c) }); return; }
        c.s.foundAsked = true;
        c.twist("found_it");
        c.say("found", { X: itemNp(c) }); c.say("found_ask", { X: item(c) });
      },
      expects: ["its_mine", "its_mine_ctx", "not_mine", "not_mine_ctx", "unsure_mine_ctx"],
      suggest: [{ lt: "Say whether it's yours", hint: "found" }],
      yes: (c) => { lostWallet.handlers.its_mine(c, {}, { intent: "its_mine", slots: {}, tags: [] } as any); },
      no: (c) => { lostWallet.handlers.not_mine(c, {}, { intent: "not_mine", slots: {}, tags: [] } as any); } },
    { id: "all_there", when: (c) => c.s.found === "mine", done: (c) => !!c.s.checkedInside,
      ask: (c) => { c.say(c.s.thereAsked ? "all_there_again" : item(c) === "phone" ? "found_yes_phone" : "found_yes"); c.s.thereAsked = true; },
      expects: ["all_there", "some_missing", "unsure_all_ctx"],
      suggest: [{ lt: "Say whether everything's there", hint: "all_there" }],
      yes: (c) => { c.s.checkedInside = true; c.say("glad"); c.complete(); },
      no: (c) => { lostWallet.handlers.some_missing(c, {}, { intent: "some_missing", slots: {}, tags: [] } as any); } },
    { id: "describe", when: (c) => !!c.s.askDescribe && !!c.s.lost && !c.s.found && !c.s.policeInfo, done: (c) => !!(c.s.color || c.s.material || c.s.size || c.s.describeSkipped),
      // asked again after a side question: a short reminder
      ask: (c) => { c.say(c.s.describeAsked ? "describe_again" : "ask_describe", { X: item(c) }); c.s.describeAsked = true; },
      expects: ["describe", "describe_ctx", "describe_fix", "dont_remember"],
      suggest: [{ lt: "Describe it: color, size, material", hint: "describe" }],
      help: (c) => { c.s.describeSkipped = true; c.say("no_worry"); askNext(c); } },
    { id: "police", when: (c) => !!c.s.lost && !!c.s.advised && !gotBack(c), done: (c) => !!(c.s.policeInfo || c.s.policeKnown),
      ask: (c) => {
        // asked a fourth time (the learner keeps talking about something else): she just shows the way
        if ((c.s.policeAsked ?? 0) >= 3) { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] } as any); return; }
        if (!c.s.policeSuggested) { c.s.policeSuggested = true; c.say("police_suggest"); }
        c.say(["ask_know_police", "police_again", "police_again2"][c.s.policeAsked ?? 0]);
        c.s.policeAsked = (c.s.policeAsked ?? 0) + 1;
      },
      expects: ["police_where", "police_where_ctx", "police_known", "police_known_ctx", "map"],
      suggest: [{ lt: "Say whether you know where it is", hint: "police_know" }, { lt: "Ask the way", hint: "police" }],
      yes: (c) => { c.s.policeKnown = true; c.say("police_known_ok"); },
      no: (c) => { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] } as any); },
      // "No sé" = no, tell me the way
      help: (c) => { lostWallet.handlers.police_where(c, {}, { intent: "police_where", slots: {}, tags: [] } as any); } },
  ],

  init: (c) => {
    c.s.askPockets = c.chance(0.35);
    c.s.askDescribe = c.chance(0.75);
    c.s.foundTwist = c.visits >= 1 && c.chance(0.45);
    c.s.worried = c.chance(0.4);
  },

  start: (c) => {
    c.say(c.s.worried ? "greet_worried" : "greet");
    c.hold();
    // "¿Está bien? Se ve preocupado.": "Sí, estoy bien" gets "¿Seguro?…", "No" gets "¿Qué le pasó?"
    if (c.s.worried) c.expect({
      id: "worried_q", optional: true, expects: ["lost", "help_req", "not_lost"], hints: ["problem"],
      suggest: [{ lt: "Ask for help and say what you lost", hint: "problem", options: "item" }],
      yes: (cc) => { cc.say("really_ok"); cc.hold(); },
      no: (cc) => { cc.say("ask_problem"); cc.hold(); },
      on: {
        lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
        help_req: (cc, sl, sg) => lostWallet.handlers.help_req(cc, sl, sg),
        not_lost: (cc, sl, sg) => lostWallet.handlers.not_lost(cc, sl, sg),
      },
    });
  },

  handlers: {
    help_req(c) {
      if (!mark(c)) return;
      if (c.s.lost) { c.say("ok"); return; }
      c.say("help_ok");
      c.expect({
        // optional: "La tenía en el café…" (last seen) also tells the problem; the step takes over
        id: "what_happened", optional: true, expects: ["lost", "not_lost"], hints: ["problem"],
        suggest: [{ lt: "Say what you lost", hint: "lost", options: "item" }],
        on: {
          lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
          not_lost: (cc, sl, sg) => lostWallet.handlers.not_lost(cc, sl, sg),
        },
      });
    },
    lost(c, slots, seg) {
      if (!mark(c)) return;
      const first = !c.s.lost;
      c.s.lost = true;
      if (slots.item) c.s.item = slots.item;
      if (!first) { if (!turn(c).lostSaid) c.say("ok"); return; }
      turn(c).lostSaid = true;
      if (seg.tags.includes("stolen")) { c.s.stolen = true; c.say("stolen_react"); }
      else c.say("lost_react");
      if (seg.tags.includes("keys")) { c.s.keys = true; c.say("keys_too"); }
      if (c.s.askPockets) { c.say("ask_pockets"); c.expect(pocketsPending()); }
    },
    not_lost(c, slots, seg) {
      if (!mark(c)) return;
      // one "no" before "perdí mi cartera" may be "No, perdí mi cartera": ask; "No, no perdí…" is a clear no
      const noes = (c.heard.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/\bno\b/g) || []).length;
      if (seg?.tags?.includes("amb") && !c.s.lost && noes < 2) {
        if (slots.item) c.s.item = slots.item;
        c.say("lost_really", { X: item(c) });
        c.expect({
          id: "lost_really", expects: ["lost", "not_lost"], hints: ["g_yesno"],
          suggest: [{ lt: "Say yes or no", hint: "g_yesno" }],
          yes: (cc) => lostWallet.handlers.lost(cc, {}, { intent: "lost", slots: {}, tags: [] } as any),
          no: (cc) => { cc.say("not_lost_resp"); cc.hold(); },
          on: {
            lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
            // said again with one "no" ("No, perdí mi cartera"): it was lost
            not_lost: (cc, sl, sg) => {
              if (sg.tags.includes("amb")) { lostWallet.handlers.lost(cc, sl, { ...sg, tags: [] }); return; }
              cc.say("not_lost_resp"); cc.hold();
            },
          },
        });
        return;
      }
      if (c.s.lost) { c.say("glad"); if (!c.s.found) c.s.found = "self"; return; }
      c.say("not_lost_resp"); c.hold();
    },
    last_seen(c, slots, seg) {
      if (!mark(c)) return;
      const seen = slots.seen || {};
      if (seg?.tags?.includes("amb") && seen.place && slots.wrong) { c.say("which_place", { X: seen.place, Y: slots.wrong }); c.hold(); return; }
      c.s.lastSeen = true;
      if (seen.place) c.s.place = seen.place;
      if ((seen.__tags || []).includes("home")) c.s.home = true;
      if (!c.s.lost) c.s.lost = true;
      if (!seen.place && (c.s.lastSeenOnce || c.s.home)) c.s.placeSkipped = true;
      c.s.lastSeenOnce = true;
    },
    place_not_ctx(c) { if (!mark(c)) return; c.say("where_then_ask"); c.hold(); },
    when_ctx(c) {
      if (!mark(c)) return;
      c.s.lastSeen = true;
      if (c.s.lastSeenOnce) c.s.placeSkipped = true;
      c.s.lastSeenOnce = true;
    },
    place_ctx(c, slots) {
      if (!mark(c)) return;
      c.s.lastSeen = true;
      c.s.lastSeenOnce = true;
      if (slots.place) c.s.place = slots.place;
    },
    dont_remember(c) {
      if (!mark(c)) return;
      const st = lostWallet.steps.find((x) => x.id === c.step);
      if (st?.help && !(st.done(c))) { st.help(c); c.hold(); return; }
      c.say("no_worry");
    },
    describe(c, slots) {
      if (!mark(c)) return;
      if (c.s.found === "mine" || c.s.found === "partial") { c.say("ok"); return; }
      describeFrom(c, slots);
      const T = turn(c);
      if (T.echoed) return; // one echo per utterance
      T.echoed = true;
      if (!c.s.color && !c.s.material && !c.s.size) {
        // "Tiene una foto de mis hijos", "Es una cartera normal": noted, without an echo
        c.s.describeSkipped = true; c.say("describe_noted", { X: item(c) }); return;
      }
      c.say("describe_echo", { X: itemNp(c) });
    },
    describe_ctx(c, slots, seg) { lostWallet.handlers.describe(c, slots, seg); },
    describe_fix(c, slots, seg) {
      if (!mark(c)) return;
      if (slots.wrong && c.s.color === slots.wrong) c.s.color = undefined;
      if (slots.color) c.s.color = slots.color;
      turn(c).echoed = true;
      c.say("fix_echo", { X: itemNp(c) });
    },
    police_where(c) {
      if (!mark(c)) return;
      c.s.policeInfo = true; c.s.policeSuggested = true;
      if ((c.s.policeAsked ?? 0) >= 3 && c.step === "police") c.say("look_there");
      c.say("directions"); c.say("directions2");
    },
    police_where_ctx(c, slots, seg) { lostWallet.handlers.police_where(c, slots, seg); },
    police_known(c, slots) {
      if (!mark(c)) return;
      // "Está junto al banco, ¿verdad?": it's next to the museum
      if (slots?.place && slots.place !== "museum") { c.s.policeInfo = true; c.say("police_correct"); return; }
      c.s.policeKnown = true; c.say("police_known_ok");
    },
    police_known_ctx(c, slots, seg) { lostWallet.handlers.police_known(c, slots, seg); },
    map(c) {
      if (!mark(c)) return;
      c.s.policeInfo = true; c.s.policeSuggested = true;
      c.say("map_show"); c.say("map_mark");
      c.event("mark-location", { to: "police" });
    },
    far(c) { if (!mark(c)) return; c.s.policeInfo = true; c.s.policeSuggested = true; c.say("far"); },
    how_get(c) { if (!mark(c)) return; c.s.policeInfo = true; c.s.policeSuggested = true; c.say("directions2"); },
    call911(c) {
      if (!mark(c)) return;
      c.say("no911"); c.say("no911b"); c.say("no911c");
      c.s.policeSuggested = true;
    },
    where_found(c) {
      if (!mark(c)) return;
      if (c.s.foundAsked && c.s.foundTwist) c.say("where_found", { X: item(c) }); else c.say("ok");
    },
    police_open(c) { if (!mark(c)) return; c.say("police_open"); },
    police_english(c) { if (!mark(c)) return; c.say("police_english"); },
    emergency_number(c) { if (!mark(c)) return; c.say("number911"); },
    cancel_cards(c) { if (!mark(c)) return; c.say("cards"); },
    what_do(c) { if (!mark(c)) return; c.say("what_do"); c.s.policeSuggested = true; },
    checked(c) { if (!mark(c)) return; c.s.pocketsDone = true; c.say("checked_ok"); },
    checked_ctx(c) { if (!mark(c)) return; c.s.pocketsDone = true; c.say("checked_ok"); },
    not_checked_ctx(c) { if (!mark(c)) return; c.say("check_again"); },
    will_go_back(c) { if (!mark(c)) return; c.say("ok"); },
    hope_so(c) { if (!mark(c)) return; c.say("ok"); },
    some_missing(c, _slots, seg) {
      if (!mark(c)) return;
      if (c.s.found !== "mine") { c.say("ok"); return; }
      if (seg?.tags?.includes("amb")) {
        // "No, no falta el dinero": nothing is missing; one "no" may be "No, falta el dinero": she asks
        if ((norm(c.heard).match(/\bno\b/g) || []).length >= 2) { lostWallet.handlers.all_there(c, {}, seg); return; }
        c.say("missing_really");
        c.expect({
          id: "missing_really", expects: ["all_there", "some_missing", "missing_what_ctx"], hints: ["all_there"],
          suggest: [{ lt: "Say whether something's missing", hint: "all_there" }],
          yes: (cc) => lostWallet.handlers.some_missing(cc, {}, { intent: "some_missing", slots: {}, tags: [] } as any),
          no: (cc) => lostWallet.handlers.all_there(cc, {}, { intent: "all_there", slots: {}, tags: [] } as any),
          on: {
            all_there: (cc, sl, sg) => lostWallet.handlers.all_there(cc, sl, sg),
            missing_what_ctx: (cc) => lostWallet.handlers.some_missing(cc, {}, { intent: "some_missing", slots: {}, tags: [] } as any),
            // after "¿Sí le falta algo?" a single leading "no" answers it: "No, está todo", "No falta el dinero" = nothing is missing
            some_missing: (cc, sl, sg) => {
              const noes = (norm(cc.heard).match(/\bno\b/g) || []).length;
              if (noes === 1 && /^\W*no\b/.test(norm(cc.heard))) { lostWallet.handlers.all_there(cc, sl, sg); return; }
              lostWallet.handlers.some_missing(cc, sl, { ...sg, tags: [] });
            },
          },
        });
        return;
      }
      c.s.checkedInside = true;
      // the phone: "No, no prende" / "La pantalla está rota" (no police for that)
      if (item(c) === "phone" || seg?.tags?.includes("broken")) { c.say("phone_broken", { X: item(c) }); c.complete(); return; }
      c.s.found = "partial"; c.s.policeSuggested = true; c.say("missing_some");
    },
    its_mine(c) {
      if (!mark(c)) return;
      if (!c.s.foundTwist || !c.s.advised) { c.say("ok"); return; }
      c.s.found = "mine";
    },
    not_mine(c, slots) {
      if (!mark(c)) return;
      if (!c.s.foundTwist || !c.s.foundAsked) { c.say("ok"); return; }
      // "La mía es negra" without a "no": it may be a yes (this one is black too); she asks to look again
      if ((slots?.color || slots?.material) && !/\bno\b/.test(norm(c.heard))) { c.say("look_closer", { X: item(c) }); c.hold(); return; }
      c.s.found = "no"; c.s.foundTwist = false;
      c.say("not_yours");
    },
    its_mine_ctx(c, slots, seg) { lostWallet.handlers.its_mine(c, slots, seg); },
    unsure_mine_ctx(c) { if (!mark(c)) return; c.say("look_closer", { X: item(c) }); c.hold(); },
    // only expected in the "¿Sí le falta algo?" pending, which handles it there
    missing_what_ctx(c) { if (!mark(c)) return; lostWallet.handlers.some_missing(c, {}, { intent: "some_missing", slots: {}, tags: [] } as any); },
    unsure_all_ctx(c) { if (!mark(c)) return; c.say("check_calm"); c.hold(); },
    not_mine_ctx(c, slots, seg) { lostWallet.handlers.not_mine(c, slots, seg); },
    all_there(c) {
      if (!mark(c)) return;
      if (c.s.found !== "mine") { c.say("ok"); return; }
      c.s.checkedInside = true; c.say("glad"); c.complete();
    },
    thanks_kind(c, slots, seg) {
      if (!mark(c)) return;
      // "¡Gracias, niño!" when the boy holds it out: it's theirs
      if (seg?.tags?.includes("boy") && c.s.foundTwist && c.s.foundAsked && !c.s.found) { c.s.found = "mine"; c.s.boyThanked = true; return; }
      if (c.s.found === "mine" && !c.s.boyThanked) { c.s.boyThanked = true; c.say("boy_thanks"); return; }
      c.say("kind_resp");
    },
    flowers(c, _slots, seg) {
      if (!mark(c)) return;
      if (c.s.lost) { c.say("ok"); return; }
      if (seg.tags.includes("price")) c.say("flowers_price", { price: 15000 });
      else if (seg.tags.includes("nice")) c.say("flowers_thanks");
      else { c.say("flowers_sure"); c.say("flowers_price", { price: 15000 }); }
      c.say("but_worried");
      c.expect({
        id: "flowers_q", expects: ["lost", "help_req"], hints: ["problem"],
        suggest: [{ lt: "Say what happened", hint: "lost", options: "item" }],
        yes: (cc) => { cc.say("ask_problem"); cc.hold(); },
        no: (cc) => { cc.say("really_ok"); cc.hold(); },
        on: {
          lost: (cc, sl, sg) => lostWallet.handlers.lost(cc, sl, sg),
          help_req: (cc, sl, sg) => lostWallet.handlers.help_req(cc, sl, sg),
        },
      });
    },
    g_bye(c) { bye(c); },
  },

  finish: (c) => {
    if (c.s.found === "mine" && c.s.checkedInside) { c.complete(); c.say("enjoy_day"); }
    else if (c.s.found === "self") { if (c.s.place || c.s.placeSkipped) c.complete(); c.say("enjoy_day"); }
    else { if (c.s.lost) c.complete(); c.say("good_luck", { X: item(c) }); }
    const closing: Pending = {
      id: "closing", hints: ["thanks"], suggest: [{ lt: "Thank her and say goodbye", hint: "thanks" }],
      on: {
        g_thanks: (cc) => bye(cc, true),
        thanks_kind: (cc) => bye(cc, true),
        hope_so: (cc) => bye(cc, true),
        g_bye: (cc) => bye(cc),
        g_ok: (cc) => bye(cc),
        // "¿Cómo está?" at the very end: answer it, then back to the goodbye
        g_howareyou: (cc) => { cc.say("g_howareyou_reply"); expectHowAreYou(cc, (x) => x.expect(closing)); },
      },
      yes: (cc) => bye(cc),
      no: (cc) => bye(cc),
    };
    c.expect(closing);
  },

  tests: [
    // Every hint construction
    { say: "Disculpe, ¿me puede ayudar?", intent: "help_req" },
    { say: "Perdí mi cartera.", intent: "lost", slots: { item: "wallet" } },
    { say: "Se me perdió la cartera.", intent: "lost" },
    { say: "No encuentro mi cartera.", intent: "lost" },
    { say: "Creo que me robaron la cartera.", intent: "lost" },
    { say: "Sí, ya revisé.", intent: "checked" },
    { say: "Sí, ya busqué por todos lados.", intent: "checked" },
    { say: "En el café.", intent: "last_seen", step: "last_seen", slots: { seen: { place: "cafe" } } },
    { say: "El puesto de fruta", intent: "place_ctx", step: "where_then", slots: { place: "fruit_stand" } },
    { say: "Cuando pagué mi café.", intent: "last_seen" },
    { say: "Hace como una hora.", intent: "when_ctx", step: "last_seen" },
    { say: "Hoy en la mañana, en la panadería.", intent: "last_seen", slots: { seen: { place: "bakery" } } },
    { say: "Estaba en el banco.", intent: "last_seen", slots: { seen: { place: "bank" } } },
    { say: "Junto a la banca.", intent: "last_seen", slots: { seen: { place: "bench" } } },
    { say: "Tomé un taxi.", intent: "last_seen", slots: { seen: { place: "taxi" } } },
    { say: "Es una cartera negra de piel.", intent: "describe" },
    { say: "Es café y chiquita.", intent: "describe" },
    { say: "Es negra y tiene una foto de mis hijos.", intent: "describe" },
    { say: "Es un celular negro con funda azul.", intent: "describe", step: "describe" },
    { say: "No, ¿dónde está?", intent: "police_where_ctx", step: "police" },
    { say: "¿Dónde está la policía?", intent: "police_where" },
    { say: "¿Me la puede enseñar en el mapa?", intent: "map" },
    { say: "Sí, ya sé dónde está.", intent: "police_known_ctx", step: "police" },
    { say: "¿Cómo llego?", intent: "how_get" },
    { say: "¿Está lejos?", intent: "far" },
    { say: "¿Llamo al 911?", intent: "call911" },
    { say: "¿Cuál es el número de emergencias?", intent: "emergency_number" },
    { say: "¿Tengo que bloquear mis tarjetas?", intent: "cancel_cards" },
    { say: "Es usted muy amable.", intent: "thanks_kind" },
    { say: "¡Sí, es mía!", intent: "its_mine", step: "found" },
    { say: "No, no es mía.", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "Sí, está todo.", intent: "all_there", step: "all_there" },
    { say: "Sí, no falta nada.", intent: "all_there", step: "all_there", not: ["some_missing"] },
    { say: "Falta el dinero.", intent: "some_missing", step: "all_there", not: ["all_there"] },
    // Natural alternatives, short answers, accentless typing, tú to staff
    { say: "se me perdio mi cartera", intent: "lost" },
    { say: "Me robaron mi celular", intent: "lost", slots: { item: "phone" } },
    { say: "¿No ha visto una cartera negra?", intent: "lost" },
    { say: "Perdí mi cartera y mis llaves", intent: "lost" },
    { say: "Me bolsearon", intent: "lost" },
    { say: "¿Me puedes ayudar?", intent: "help_req" },
    { say: "Saqué dinero del cajero", intent: "last_seen", slots: { seen: { place: "atm" } } },
    { say: "No me acuerdo, tal vez en el tianguis", intent: "last_seen", slots: { seen: { place: "market" } } },
    { say: "Me subí a un colectivo", intent: "last_seen", slots: { seen: { place: "bus" } } },
    { say: "Creo que la dejé en el taxi", intent: "last_seen", slots: { seen: { place: "taxi" } } },
    { say: "Cuando estaba comprando mangos en el tianguis", intent: "last_seen", slots: { seen: { place: "market" } } },
    { say: "No me acuerdo", intent: "dont_remember", step: "where_then" },
    { say: "Negra", intent: "describe_ctx", step: "describe" },
    { say: "Es de piel, café, y tiene una foto de mis hijos", intent: "describe" },
    { say: "No, no soy de aquí", intent: "police_where_ctx", step: "police" },
    { say: "Sí, está junto al museo, ¿verdad?", intent: "police_known_ctx", step: "police" },
    { say: "Sí, en el café", intent: "last_seen", step: "last_seen", not: ["police_known", "police_known_ctx"] },
    { say: "¿Me lo puedes marcar en el mapa?", intent: "map" },
    { say: "¿Y si no está ahí?", intent: "what_do" },
    { say: "Voy a regresar a preguntar", intent: "will_go_back" },
    { say: "Ojalá", intent: "hope_so" },
    { say: "¡Ay, gracias a Dios! Sí, es mía", intent: "its_mine_ctx", step: "found" },
    { say: "No sé si es mía", intent: "unsure_mine_ctx", step: "found", not: ["its_mine", "its_mine_ctx"] },
    { say: "Mi cartera está aquí", intent: "not_lost", not: ["lost", "its_mine", "its_mine_ctx"] },
    { say: "¡Dios mío! Perdí mi cartera", intent: "lost", not: ["its_mine", "its_mine_ctx"] },
    { say: "No la perdí, me la robaron", intent: "lost", not: ["not_lost"] },
    { say: "Sí, mi dinero y mis tarjetas están aquí", intent: "all_there", step: "all_there" },
    { say: "Dios se lo pague", intent: "thanks_kind" },
    { say: "¿Cuánto cuestan las rosas?", intent: "flowers" },
    // Spain forms are correct answers
    { say: "He perdido mi móvil", intent: "lost", slots: { item: "phone" } },
    { say: "Perdí mi bolso", intent: "lost", slots: { item: "bag" } },
    { say: "¿Me podéis ayudar?", intent: "help_req" },
    { say: "Vale, está todo", intent: "all_there", step: "all_there" },
    { say: "Es marrón", intent: "describe", slots: { dp: { color: "brown" } } },
    // Meaning safety: no meaning may flip
    { say: "No perdí mi cartera", intent: "not_lost", not: ["lost"] },
    { say: "Mi cartera no se perdió", intent: "not_lost", not: ["lost"] },
    { say: "No la dejé en el taxi", intent: "none", step: "last_seen" },
    { say: "No fue en el café", intent: "place_not_ctx", step: "last_seen", not: ["last_seen", "place_ctx"] },
    { say: "No estuve en el banco", intent: "place_not_ctx", step: "where_then", not: ["last_seen", "place_ctx"] },
    { say: "No es negra, es café", intent: "describe_fix", step: "describe", slots: { color: "brown" }, not: ["describe_ctx"] },
    { say: "No es negra", intent: "none", step: "describe" },
    { say: "No es mía", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "No, la mía es café", intent: "not_mine", step: "found", not: ["its_mine"] },
    { say: "Mis tarjetas están, pero el dinero no", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "No falta nada", intent: "all_there", step: "all_there", not: ["some_missing"] },
    { say: "No voy a llamar al 911", intent: "none", step: "police" },
    { say: "No necesito el mapa", intent: "none", step: "police" },
    { say: "No sé dónde está", intent: "police_where_ctx", step: "police", not: ["police_known", "police_known_ctx"] },
    { say: "No sé dónde está", intent: "none", step: "problem" },
    { say: "No revisé", intent: "none", step: "pockets" },
    { say: "No quiero flores", intent: "none" },
    { say: "¿Dónde está la comisaría?", intent: "police_where" },
    { say: "Más o menos", intent: "police_where_ctx", step: "police", not: ["g_howareyou_bad"] },
    { say: "¿Está abierta ahorita?", intent: "police_open" },
    { say: "¿Hablan inglés en la policía?", intent: "police_english" },
    { say: "Gracias, niño", intent: "thanks_kind", step: "found" },
    { say: "¿Dónde la encontró?", intent: "where_found", step: "found" },
    { say: "No, esa no es", intent: "not_mine_ctx", step: "found", not: ["its_mine"] },
    { say: "No estaba en la playa, estaba en el café", intent: "last_seen", step: "where_then", slots: { seen: { place: "cafe" } } },
    { say: "No en el banco, en el café", intent: "last_seen", step: "last_seen", slots: { seen: { place: "cafe" } } },
    { say: "No en el banco", intent: "place_not_ctx", step: "last_seen", not: ["place_ctx", "last_seen"] },
    { say: "No, no está todo", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "No prende", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "No sé dónde está", intent: "none", step: "found" },
    { say: "Sí, en el café", intent: "last_seen", step: "where_then", not: ["police_known", "police_known_ctx", "its_mine"] },
    { say: "No, no estoy bien. Perdí mi cartera.", intent: "lost", not: ["not_lost"] },
    { say: "La verdad no, me robaron la cartera", intent: "lost", not: ["not_lost"] },
    { say: "No, se me perdió la cartera", intent: "lost", not: ["not_lost"] },
    // Review (2 Nov 2026): flips and gaps found by the blind set and the probes
    { say: "No sé, ¿está todo?", intent: "unsure_all_ctx", step: "all_there", not: ["some_missing", "all_there"] },
    { say: "Las tarjetas sí, pero el dinero no", intent: "some_missing", step: "all_there", not: ["all_there"] },
    { say: "Sí, el dinero", intent: "none", step: "all_there" },
    { say: "A lo mejor la dejé en mi casa", intent: "last_seen", step: "last_seen" },
    { say: "Bueno, voy a regresar al café a preguntar", intent: "will_go_back", slots: { place: "cafe" } },
    { say: "¿Puedo verla?", intent: "unsure_mine_ctx", step: "found", not: ["its_mine", "its_mine_ctx"] },
    { say: "¿Usted la encontró?", intent: "none", step: "found" },
    { say: "¿La encontró el niño?", intent: "none", step: "found" },
    { say: "No la encontré", intent: "none", step: "last_seen" },
    { say: "Ay, espere, ya la encontré, estaba en mi mochila", intent: "not_lost", step: "pockets", not: ["lost"] },
    { say: "¿Está abierta los sábados?", intent: "police_open" },
    { say: "Es una emergencia", intent: "none" },
    { say: "¿Qué hago con mis tarjetas?", intent: "cancel_cards" },
    { say: "La policía está junto al banco, ¿verdad?", intent: "police_known", step: "police", slots: { place: "bank" } },
    { say: "No quiero llamar a la policía", intent: "none", step: "police" },
    { say: "No, esa no es mía", intent: "not_mine", step: "found", not: ["its_mine", "its_mine_ctx"] },
    { say: "No falta nada", intent: "all_there", step: "all_there", not: ["some_missing"] },
    // Not understood
    { say: "Mi perro come tacos en la luna", intent: "none" },
    { say: "Quiero comprar una pizza grande", intent: "none" },
    { say: "Azul", intent: "none" },
    { say: "Mañana voy a la playa con mis amigos", intent: "none" },
  ],

  sims: [
    { name: "happy path", turns: ["Disculpe, ¿me puede ayudar?", "Perdí mi cartera.", "En el café, cuando pagué mi café.", "Es café, de piel.", "¿Dónde está la policía?", "¡Muchas gracias!"],
      expect: { complete: true, state: { place: "cafe", color: "brown" } }, auto: AUTO, setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = true; } },
    // short answers: a bare time, then the place; the questions about 911 and the map
    { name: "short answers, questions", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Hola. No encuentro mi cartera.", "Hace una hora.", "En la panadería.", "¿Llamo al 911?", "¿Me la puede enseñar en el mapa?", "Gracias, adiós."],
      expect: { complete: true, state: { place: "bakery", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "where_then", "police"]) },
    { name: "stolen, colectivo, cards", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Creo que me robaron la cartera.", "Me subí a un colectivo.", "¿Tengo que bloquear mis tarjetas?", "No, ¿dónde está?", "¿Está lejos?", "Gracias, es usted muy amable."],
      expect: { complete: true, state: { stolen: true, place: "bus" } }, auto: AUTO },
    // questions and a change of mind: the color is corrected, she is asked what to do
    { name: "questions and a change of mind", setup: (s) => { s.foundTwist = false; s.askDescribe = true; s.askPockets = true; },
      turns: ["¡Qué flores tan bonitas!", "Sí, perdí mi celular.", "Sí, ya busqué por todos lados.", "Creo que lo dejé en el taxi.", "Es negro.", "No es negro, es azul.", "¿Qué hago ahora?", "Sí, ya sé dónde está.", "Eso espero, gracias."],
      expect: { complete: true, state: { item: "phone", color: "blue", place: "taxi", policeKnown: true } }, auto: omit(AUTO, ["flowers_q", "pockets", "last_seen", "describe", "police", "closing"]) },
    // the twist on every seed: a boy found it by the kiosco
    { name: "twist: a boy found it", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = true; },
      turns: ["Perdí mi cartera.", "Junto al kiosco, creo.", "Es negra, de piel.", "¡Sí, es mía!", "Sí, está todo.", "¡Muchas gracias!"],
      expect: { complete: true, state: { found: "mine", checkedInside: true, color: "black" } }, auto: omit(AUTO, ["last_seen", "describe", "found", "all_there", "closing"]) },
    // the twist, but the money is gone: still to the police
    { name: "twist: it's mine, but the money is gone", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Se me perdió la cartera.", "En el banco.", "Sí, es mía.", "Mis tarjetas están, pero el dinero no.", "Gracias por su ayuda."],
      expect: { complete: true, state: { found: "partial", checkedInside: true } }, auto: omit(AUTO, ["last_seen", "found", "all_there", "closing"]) },
    // the twist, not mine: the police step comes back
    { name: "twist: not mine", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["No encuentro mi mochila.", "En la playa.", "No, no es mía.", "¿Dónde está la policía?", "Adiós."],
      expect: { complete: true, state: { found: "no", item: "backpack", policeInfo: true } }, auto: omit(AUTO, ["last_seen", "found", "police", "closing"]) },
    // the pockets: not checked yet, then checked
    { name: "pockets: check again", setup: (s) => { s.foundTwist = false; s.askPockets = true; s.askDescribe = false; },
      turns: ["Se me perdió la cartera.", "No, todavía no revisé.", "Ya revisé, no está.", "En la farmacia.", "¿Dónde está la policía?", "Gracias."],
      expect: { complete: true, state: { pocketsDone: true, place: "pharmacy" } }, auto: omit(AUTO, ["pockets", "last_seen", "police", "closing"]) },
    // "¿Está bien?": "No, perdí mi cartera" reads like "No perdí mi cartera" (no commas): she checks, a yes goes on
    { name: "worried: no, I lost it", setup: (s) => { s.worried = true; s.foundTwist = false; s.askDescribe = false; s.askPockets = false; },
      turns: ["No, perdí mi cartera.", "Sí.", "En el café.", "¿Dónde está la policía?", "Gracias."],
      expect: { complete: true, state: { lost: true, place: "cafe" } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    { name: "worried: fine, then the problem", setup: (s) => { s.worried = true; s.foundTwist = false; s.askDescribe = false; s.askPockets = false; },
      turns: ["Sí, estoy bien, gracias.", "Bueno, la verdad no. Se me perdió el celular.", "Hace una hora, en el banco.", "No, ¿dónde está?", "Adiós."],
      expect: { complete: true, state: { item: "phone", place: "bank" } }, auto: omit(AUTO, ["last_seen", "police", "closing"]) },
    // "No me acuerdo" twice: no place, she still advises
    { name: "don't remember", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Necesito ayuda.", "Perdí mi cartera.", "Hace como media hora.", "No me acuerdo.", "Bueno, voy a regresar a preguntar.", "No sé.", "Gracias."],
      expect: { complete: true, state: { placeSkipped: true, policeInfo: true } }, auto: omit(AUTO, ["last_seen", "where_then", "police", "closing"]) },
    // "No falta el dinero" (comma lost): she asks; "No, está todo" then means nothing is missing
    { name: "twist: comma-less no, nothing missing", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "En el banco.", "Sí, es mía.", "No falta el dinero.", "No, está todo.", "Gracias."],
      expect: { complete: true, state: { found: "mine", checkedInside: true } }, auto: omit(AUTO, ["last_seen", "found", "all_there", "closing"]) },
    // "La mía es negra" without a "no" may be a yes: she asks to look again; the police place corrected
    { name: "twist: a color, then a yes; the police next to the bank?", setup: (s) => { s.askPockets = false; s.foundTwist = true; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "No sé.", "No me acuerdo.", "La mía es negra.", "Sí, es mía.", "Sí, el dinero y las tarjetas están aquí.", "Gracias."],
      expect: { complete: true, state: { found: "mine", placeSkipped: true } }, auto: omit(AUTO, ["last_seen", "where_then", "found", "all_there", "closing"]) },
    { name: "don't know twice, police next to the bank?", setup: (s) => { s.askPockets = false; s.foundTwist = false; s.askDescribe = false; },
      turns: ["Perdí mi cartera.", "No sé.", "No me acuerdo.", "La policía está junto al banco, ¿verdad?", "Gracias."],
      expect: { complete: true, state: { placeSkipped: true, policeInfo: true } }, auto: omit(AUTO, ["last_seen", "where_then", "police", "closing"]) },
  ],
};

/** "¿Ya revisó bien sus bolsas?" A no gets "Revise otra vez" and waits once more ("Ya revisé, no está"); a second no
 *  moves on. */
function pocketsPending(again = false): Pending {
  const done = (cc: Ctx) => { cc.s.pocketsDone = true; cc.say("checked_ok"); };
  const notYet = (cc: Ctx) => {
    if (again) { cc.say("ok"); return; }
    cc.say("check_again"); cc.expect(pocketsPending(true));
  };
  return {
    id: "pockets", optional: true, expects: ["checked", "checked_ctx", "not_checked_ctx"], hints: ["pockets"],
    suggest: [{ lt: "Say whether you checked your pockets", hint: "pockets" }],
    yes: done, no: notYet,
    on: { checked: done, checked_ctx: done, not_checked_ctx: notYet },
  };
}

export default lostWallet;
